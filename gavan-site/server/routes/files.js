// Files, folders, live photo evidence, branding
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { all, get, run, insert, update, setSetting, DATA_DIR } = require('../db');
const A = require('../auth');
const { h, parse } = require('../util');

const r = express.Router();
const UP = path.join(DATA_DIR, 'uploads');
const upload = multer({
  storage: multer.diskStorage({ destination: UP, filename: (req, f, cb) => cb(null, crypto.randomBytes(16).toString('hex') + path.extname(f.originalname).toLowerCase().slice(0, 10)) }),
  limits: { fileSize: 60 * 1024 * 1024 },
});
const BLOCKED = /\.(exe|bat|cmd|sh|js|html?|php|msi|com|scr|svg)$/i;

// ---- visibility rules for a single file ----
function canSeeFile(user, f) {
  if (f.project_id && !A.projectIds(user).includes(f.project_id)) return false;
  if (f.entity === 'branding') return true;
  if (f.folder_id) {
    const fo = get('SELECT allowed_roles FROM folders WHERE id=?', f.folder_id);
    const roles = parse(fo && fo.allowed_roles, []);
    if (roles.length && !roles.includes(user.role) && !A.can(user, 'all_projects')) return false;
  }
  if (!A.isContractor(user)) {
    if (['contractor_bill', 'invoice', 'delivery'].includes(f.entity) && !A.can(user, 'finance.view') && !A.can(user, 'materials.receive')) return false;
    return true;
  }
  // contractor: own uploads, files on own tasks/inspections/requests, approved drawings shared with them
  if (f.uploaded_by === user.id) return true;
  const cid = user.contractor_id;
  if (f.entity === 'task') return !!get('SELECT id FROM tasks WHERE id=? AND contractor_id=?', f.entity_id, cid);
  if (f.entity === 'inspection') return !!get('SELECT id FROM inspections WHERE id=? AND contractor_id=?', f.entity_id, cid);
  if (f.entity === 'drawing_request') return !!get('SELECT id FROM drawing_requests WHERE id=? AND contractor_id=?', f.entity_id, cid);
  if (f.entity === 'drawing_revision') {
    const rev = get('SELECT dr.status, d.* FROM drawing_revisions dr JOIN drawings d ON d.id=dr.drawing_id WHERE dr.id=?', f.entity_id);
    return !!rev && rev.status === 'approved' && contractorCanSeeDrawing(user, rev);
  }
  return false;
}
function contractorCanSeeDrawing(user, d) {
  if (parse(d.shared_contractors, []).includes(user.contractor_id)) return true;
  return !!get('SELECT id FROM drawing_requests WHERE drawing_id=? AND contractor_id=?', d.id, user.contractor_id);
}

function saveFile(req, file, extra) {
  if (BLOCKED.test(file.originalname)) { fs.unlinkSync(file.path); A.bad('This file type is not allowed'); }
  const b = req.body;
  const row = {
    client_uuid: extra.client_uuid || null, project_id: extra.project_id || null, folder_id: extra.folder_id || null,
    name: file.originalname, mime: file.mimetype, size: file.size, stored_name: file.filename,
    kind: extra.kind || 'document', entity: extra.entity || null, entity_id: extra.entity_id || null, location_id: extra.location_id || null,
    uploaded_by: req.user.id, version_group: extra.version_group || crypto.randomBytes(8).toString('hex'), version: extra.version || 1,
  };
  if (row.kind === 'live_photo') {
    row.captured_at = b.captured_at || null;
    row.captured_offline = b.captured_offline === '1' || b.captured_offline === 'true' ? 1 : 0;
    if (b.gps_lat && b.gps_lng) { row.gps_lat = Number(b.gps_lat); row.gps_lng = Number(b.gps_lng); row.gps_accuracy = Number(b.gps_accuracy) || null; }
  }
  return insert('files', row);
}

// Upload: general document or live evidence photo. Idempotent on client_uuid (offline sync).
r.post('/files', A.requireCap('files.upload'), upload.single('file'), h((req) => {
  const b = req.body;
  if (!req.file) A.bad('No file received');
  if (b.client_uuid) {
    const ex = get('SELECT id FROM files WHERE client_uuid=?', b.client_uuid);
    if (ex) { fs.unlinkSync(req.file.path); return { id: ex.id, duplicate: true }; }
  }
  const pid = b.project_id ? A.assertProject(req.user, b.project_id) : null;
  if (!pid && b.entity !== 'chat') A.bad('Project is required');
  let version_group, version;
  if (b.replace_file_id) { // new version of an existing document
    const old = get('SELECT * FROM files WHERE id=?', b.replace_file_id);
    if (old && old.project_id === pid) { version_group = old.version_group; version = (get('SELECT max(version) v FROM files WHERE version_group=?', old.version_group).v || 1) + 1; }
  }
  const id = saveFile(req, req.file, { client_uuid: b.client_uuid, project_id: pid, folder_id: b.folder_id, kind: b.kind === 'live_photo' ? 'live_photo' : 'document',
    entity: b.entity, entity_id: b.entity_id, location_id: b.location_id, version_group, version });
  A.audit(req.user, 'upload', 'file', id, { name: req.file.originalname, kind: b.kind, entity: b.entity });
  return { id };
}));

r.get('/files', h((req) => {
  const q = req.query;
  const pid = A.assertProject(req.user, q.project_id);
  const where = ['f.project_id=?'];
  const params = [pid];
  if (q.entity) { where.push('f.entity=? AND f.entity_id=?'); params.push(q.entity, q.entity_id); }
  else if (q.folder_id) { where.push('f.folder_id=?'); params.push(q.folder_id); }
  if (q.kind) { where.push('f.kind=?'); params.push(q.kind); }
  if (q.search) { where.push('f.name LIKE ?'); params.push('%' + q.search + '%'); }
  if (q.from) { where.push('date(f.uploaded_at)>=?'); params.push(q.from); }
  if (q.to) { where.push('date(f.uploaded_at)<=?'); params.push(q.to); }
  if (!q.all_versions) where.push('f.version = (SELECT max(version) FROM files x WHERE x.version_group=f.version_group)');
  const rows = all(`SELECT f.*, u.name uploader FROM files f LEFT JOIN users u ON u.id=f.uploaded_by WHERE ${where.join(' AND ')} ORDER BY f.id DESC LIMIT 500`, ...params);
  return rows.filter(f => canSeeFile(req.user, f));
}));
r.get('/files/:id/versions', h((req) => {
  const f = get('SELECT * FROM files WHERE id=?', req.params.id) || A.notFound();
  if (!canSeeFile(req.user, f)) A.deny();
  return all('SELECT f.*, u.name uploader FROM files f LEFT JOIN users u ON u.id=f.uploaded_by WHERE version_group=? ORDER BY version DESC', f.version_group);
}));
r.get('/files/:id/raw', (req, res) => {
  const f = get('SELECT * FROM files WHERE id=?', req.params.id);
  if (!f || !canSeeFile(req.user, f)) return res.status(404).json({ error: 'File not found or access denied' });
  const p = path.join(UP, f.stored_name);
  if (!fs.existsSync(p)) return res.status(404).json({ error: 'File missing from storage' });
  res.setHeader('Content-Type', f.mime || 'application/octet-stream');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const inline = /^(image\/(png|jpe?g|gif|webp)|application\/pdf|text\/plain)/.test(f.mime || '') && req.query.download !== '1';
  res.setHeader('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename="${encodeURIComponent(f.name)}"`);
  fs.createReadStream(p).pipe(res);
});
r.put('/files/:id', A.requireCap('files.upload'), h((req) => {
  const f = get('SELECT * FROM files WHERE id=?', req.params.id) || A.notFound();
  if (!canSeeFile(req.user, f)) A.deny();
  if (f.uploaded_by !== req.user.id && !A.can(req.user, 'files.manage')) A.deny();
  update('files', f.id, { folder_id: req.body.folder_id, name: req.body.name });
  return { ok: true };
}));
r.delete('/files/:id', A.requireCap('files.manage'), h((req) => {
  const f = get('SELECT * FROM files WHERE id=?', req.params.id) || A.notFound();
  A.assertProject(req.user, f.project_id);
  if (f.kind === 'live_photo' || f.entity === 'drawing_revision') A.bad('Evidence photos and drawing files are retained for audit and cannot be deleted');
  run('UPDATE files SET folder_id=NULL, entity=?, entity_id=NULL WHERE id=?', 'deleted', f.id);
  A.audit(req.user, 'delete', 'file', f.id, { name: f.name });
  return { ok: true };
}));

// ---- folders ----
r.get('/folders', h((req) => {
  const pid = A.assertProject(req.user, req.query.project_id);
  const rows = all(`SELECT fo.*, (SELECT count(*) FROM files f WHERE f.folder_id=fo.id AND f.entity IS NOT 'deleted') n FROM folders fo WHERE project_id=? ORDER BY parent_id, name`, pid);
  return rows.filter(fo => { const roles = parse(fo.allowed_roles, []); return !roles.length || roles.includes(req.user.role) || A.can(req.user, 'all_projects'); })
    .filter(() => !A.isContractor(req.user) || false); // contractors browse via their tasks/drawings only
}));
r.post('/folders', A.requireCap('files.manage'), h((req) => {
  const pid = A.assertProject(req.user, req.body.project_id);
  if (!req.body.name) A.bad('Folder name required');
  return { id: insert('folders', { project_id: pid, parent_id: req.body.parent_id || null, name: req.body.name, allowed_roles: JSON.stringify(req.body.allowed_roles || []) }) };
}));
r.put('/folders/:id', A.requireCap('files.manage'), h((req) => {
  const fo = get('SELECT * FROM folders WHERE id=?', req.params.id) || A.notFound();
  A.assertProject(req.user, fo.project_id);
  update('folders', fo.id, { name: req.body.name, allowed_roles: req.body.allowed_roles ? JSON.stringify(req.body.allowed_roles) : undefined });
  return { ok: true };
}));
r.delete('/folders/:id', A.requireCap('files.manage'), h((req) => {
  const fo = get('SELECT * FROM folders WHERE id=?', req.params.id) || A.notFound();
  A.assertProject(req.user, fo.project_id);
  if (get("SELECT id FROM files WHERE folder_id=? AND entity IS NOT 'deleted'", fo.id) || get('SELECT id FROM folders WHERE parent_id=?', fo.id)) A.bad('Folder is not empty');
  run('DELETE FROM folders WHERE id=?', fo.id);
  return { ok: true };
}));

// ---- branding ----
r.post('/branding/logo', A.requireCap('settings.manage'), upload.single('file'), h((req) => {
  if (!req.file || !/^image\/(png|jpe?g|webp)$/.test(req.file.mimetype)) A.bad('Upload a PNG, JPG or WEBP logo');
  const id = saveFile(req, req.file, { entity: 'branding' });
  setSetting('logo_url', `/api/public/logo/${id}`);
  return { ok: true };
}));

module.exports = { router: r, canSeeFile, contractorCanSeeDrawing, UP };
