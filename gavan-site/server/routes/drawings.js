// Drawing requests, uploads, revision approval; Quality inspections & rework
const express = require('express');
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { all, get, run, insert, update, tx } = require('../db');
const A = require('../auth');
const { h, parse, today, locationPath, userName, projectUsersByRole, contractorUsers } = require('../util');
const { notify } = require('../notify');
const { UP, contractorCanSeeDrawing } = require('./files');

const r = express.Router();
const upload = multer({ storage: multer.diskStorage({ destination: UP, filename: (q, f, cb) => cb(null, crypto.randomBytes(16).toString('hex') + path.extname(f.originalname).toLowerCase().slice(0, 10)) }), limits: { fileSize: 100 * 1024 * 1024 } });
const CATEGORIES = ['architectural', 'structural', 'plumbing', 'electrical', 'drainage', 'fire', 'landscape', 'other'];

const usersWithCap = (pid, cap) => all('SELECT u.id, u.role FROM users u JOIN project_members pm ON pm.user_id=u.id WHERE pm.project_id=? AND u.active=1', pid)
  .filter(u => A.can(u, cap)).map(u => u.id);

// ---------------- drawing requests ----------------
function reqVisibleSql(user) { return A.scopeSql(user, 'd'); }
function decorateReq(d) {
  return { ...d, location: locationPath(d.location_id), requested_by_name: userName(d.requested_by), consultant_name: userName(d.consultant_id), checked_by_name: userName(d.checked_by),
    contractor_name: d.contractor_id ? (get('SELECT name FROM contractors WHERE id=?', d.contractor_id) || {}).name : null,
    overdue: d.required_by && d.required_by < today() && !['approved', 'rejected'].includes(d.status) };
}
r.get('/drawing-requests', h((req) => {
  const q = req.query; const where = [reqVisibleSql(req.user)]; const p = [];
  if (q.project_id) { where.push('d.project_id=?'); p.push(q.project_id); }
  if (q.status) { where.push(`d.status IN (${q.status.split(',').map(() => '?').join(',')})`); p.push(...q.status.split(',')); }
  if (q.mine === '1') { where.push('(d.consultant_id=? OR d.requested_by=?)'); p.push(req.user.id, req.user.id); }
  return all(`SELECT d.*, p.name project_name FROM drawing_requests d JOIN projects p ON p.id=d.project_id WHERE ${where.join(' AND ')} ORDER BY d.id DESC LIMIT 300`, ...p).map(decorateReq);
}));
r.get('/drawing-requests/:id', h((req) => {
  const d = get(`SELECT d.*, p.name project_name FROM drawing_requests d JOIN projects p ON p.id=d.project_id WHERE d.id=? AND ${reqVisibleSql(req.user)}`, req.params.id) || A.notFound();
  const out = decorateReq(d);
  out.files = all("SELECT id,name,mime,kind,uploaded_at FROM files WHERE entity='drawing_request' AND entity_id=?", d.id);
  out.revisions = all(`SELECT r.*, d.number, u.name uploader FROM drawing_revisions r JOIN drawings d ON d.id=r.drawing_id LEFT JOIN users u ON u.id=r.uploaded_by WHERE r.request_id=? ORDER BY r.id DESC`, d.id);
  return out;
}));
r.post('/drawing-requests', A.requireCap('drawings.request'), h((req) => {
  const b = req.body;
  const pid = A.assertProject(req.user, b.project_id);
  if (b.client_uuid) { const ex = get('SELECT id FROM drawing_requests WHERE client_uuid=?', b.client_uuid); if (ex) return { id: ex.id, duplicate: true }; }
  if (!b.title) A.bad('Describe the drawing required');
  if (!CATEGORIES.includes(b.category)) A.bad('Select a drawing category');
  const contractor_id = A.isContractor(req.user) ? req.user.contractor_id : (b.contractor_id || null);
  const id = insert('drawing_requests', { client_uuid: b.client_uuid, project_id: pid, location_id: b.location_id || null, category: b.category, title: b.title, description: b.description,
    required_by: b.required_by, priority: b.priority || 'medium', consultant_id: b.consultant_id || null, requested_by: req.user.id, contractor_id });
  (b.file_ids || []).forEach(fid => run("UPDATE files SET entity='drawing_request', entity_id=? WHERE id=? AND uploaded_by=?", id, fid, req.user.id));
  notify(usersWithCap(pid, 'drawings.check').filter(x => x !== req.user.id), { type: 'drawing', title: 'Drawing request to check: ' + b.title, body: `Required by ${b.required_by || '—'}`, link: `#/drawings/req/${id}` });
  A.audit(req.user, 'create', 'drawing_request', id, { title: b.title });
  return { id };
}));
// Site engineer checks & forwards to consultant, or rejects
r.post('/drawing-requests/:id/check', A.requireCap('drawings.check'), h((req) => {
  const d = get('SELECT * FROM drawing_requests WHERE id=?', req.params.id) || A.notFound();
  A.assertProject(req.user, d.project_id);
  if (!['requested', 'revision_required'].includes(d.status) && !(d.status === 'forwarded' && req.body.action === 'forward')) A.bad('This request is not waiting for a check');
  const { action, consultant_id, note } = req.body;
  if (action === 'forward') {
    const cid = consultant_id || d.consultant_id;
    if (!cid) A.bad('Select the consultant who will upload the drawing');
    const cu = get('SELECT * FROM users WHERE id=?', cid);
    if (!cu || !A.can(cu, 'drawings.upload')) A.bad('Selected user cannot upload drawings');
    update('drawing_requests', d.id, { status: 'forwarded', consultant_id: cid, checked_by: req.user.id, check_note: note, updated_at: new Date().toISOString() });
    notify(cid, { type: 'drawing', title: 'Drawing required: ' + d.title, body: `Required by ${d.required_by || '—'}. ${note || ''}`, link: `#/drawings/req/${d.id}` });
  } else if (action === 'reject') {
    if (!note) A.bad('Enter the reason for rejecting this request');
    update('drawing_requests', d.id, { status: 'rejected', checked_by: req.user.id, check_note: note, updated_at: new Date().toISOString() });
    notify([d.requested_by, ...contractorUsers(d.contractor_id)], { type: 'drawing', title: 'Drawing request rejected: ' + d.title, body: note, link: `#/drawings/req/${d.id}` });
  } else A.bad('Unknown action');
  A.audit(req.user, 'check:' + action, 'drawing_request', d.id, { note });
  return { ok: true };
}));

// Upload a drawing revision (optionally answering a request)
r.post('/drawings/upload', A.requireCap('drawings.upload'), upload.single('file'), h((req) => {
  const b = req.body;
  if (!req.file) A.bad('Attach the drawing file');
  let request = null;
  if (b.request_id) {
    request = get('SELECT * FROM drawing_requests WHERE id=?', b.request_id) || A.notFound();
    if (!['forwarded', 'revision_required', 'requested'].includes(request.status)) { fs.unlinkSync(req.file.path); A.bad('This request is not open for upload'); }
  }
  const pid = A.assertProject(req.user, request ? request.project_id : b.project_id);
  if (!b.number) { fs.unlinkSync(req.file.path); A.bad('Drawing number is required'); }
  if (!b.revision) { fs.unlinkSync(req.file.path); A.bad('Revision number is required'); }
  const out = tx(() => {
    let dr = get('SELECT * FROM drawings WHERE project_id=? AND number=?', pid, b.number.trim());
    if (!dr) {
      const id = insert('drawings', { project_id: pid, number: b.number.trim(), title: b.title || (request && request.title), category: b.category || (request && request.category) || 'other', location_id: b.location_id || (request && request.location_id) || null });
      dr = get('SELECT * FROM drawings WHERE id=?', id);
    }
    if (get('SELECT id FROM drawing_revisions WHERE drawing_id=? AND revision=?', dr.id, b.revision.trim())) A.bad(`Revision ${b.revision} already exists for ${dr.number}`);
    const fileId = insert('files', { project_id: pid, name: req.file.originalname, mime: req.file.mimetype, size: req.file.size, stored_name: req.file.filename, kind: 'document', entity: 'drawing_revision', uploaded_by: req.user.id, version_group: 'dwg-' + dr.id, folder_id: (get("SELECT id FROM folders WHERE project_id=? AND name='Drawings'", pid) || {}).id });
    const revId = insert('drawing_revisions', { drawing_id: dr.id, revision: b.revision.trim(), file_id: fileId, notes: b.notes, uploaded_by: req.user.id, request_id: request ? request.id : null });
    run('UPDATE files SET entity_id=? WHERE id=?', revId, fileId);
    if (request) update('drawing_requests', request.id, { status: 'uploaded', drawing_id: dr.id, updated_at: new Date().toISOString() });
    return { drawing_id: dr.id, revision_id: revId };
  });
  const approvers = usersWithCap(pid, 'drawings.approve').filter(x => x !== req.user.id);
  notify(approvers, { type: 'approval', title: `Drawing ${b.number} Rev ${b.revision} awaiting approval`, link: `#/drawings/${out.drawing_id}` });
  A.audit(req.user, 'upload', 'drawing_revision', out.revision_id, { number: b.number, revision: b.revision });
  return out;
}));

r.post('/drawing-revisions/:id/review', A.requireCap('drawings.approve'), h((req) => {
  const rev = get('SELECT r.*, d.project_id, d.number, d.id did FROM drawing_revisions r JOIN drawings d ON d.id=r.drawing_id WHERE r.id=?', req.params.id) || A.notFound();
  A.assertProject(req.user, rev.project_id);
  if (rev.status !== 'pending_approval') A.bad('This revision is not pending approval');
  if (rev.uploaded_by === req.user.id && !['director', 'admin'].includes(req.user.role)) A.deny('A different authorised reviewer must approve your upload');
  const { action, note } = req.body;
  const now = new Date().toISOString();
  if (action === 'approve') {
    tx(() => {
      run("UPDATE drawing_revisions SET status='superseded' WHERE drawing_id=? AND status='approved'", rev.drawing_id);
      update('drawing_revisions', rev.id, { status: 'approved', reviewed_by: req.user.id, reviewed_at: now, review_note: note });
      if (rev.request_id) update('drawing_requests', rev.request_id, { status: 'approved', updated_at: now });
    });
    const reqRow = rev.request_id ? get('SELECT * FROM drawing_requests WHERE id=?', rev.request_id) : null;
    const d = get('SELECT * FROM drawings WHERE id=?', rev.drawing_id);
    const recipients = [...projectUsersByRole(rev.project_id, ['supervisor', 'site_engineer']), ...(reqRow ? [reqRow.requested_by, ...contractorUsers(reqRow.contractor_id)] : []),
      ...parse(d.shared_contractors, []).flatMap(contractorUsers), rev.uploaded_by].filter(x => x !== req.user.id);
    notify(recipients, { type: 'drawing', title: `Approved: ${rev.number} Rev ${rev.revision}`, body: 'Use this revision for site work. Older revisions are superseded.', link: `#/drawings/${rev.drawing_id}` });
  } else if (action === 'reject') {
    if (!note) A.bad('Enter the reason for rejection');
    tx(() => {
      update('drawing_revisions', rev.id, { status: 'rejected', reviewed_by: req.user.id, reviewed_at: now, review_note: note });
      if (rev.request_id) update('drawing_requests', rev.request_id, { status: 'revision_required', updated_at: now });
    });
    notify(rev.uploaded_by, { type: 'drawing', title: `Revision rejected: ${rev.number} Rev ${rev.revision}`, body: note, link: `#/drawings/${rev.drawing_id}` });
  } else A.bad('Unknown action');
  A.audit(req.user, 'review:' + action, 'drawing_revision', rev.id, { note });
  return { ok: true };
}));

r.get('/drawings', h((req) => {
  const q = req.query; const where = []; const p = [];
  const ids = A.projectIds(req.user);
  where.push(`d.project_id IN (${ids.length ? ids.join(',') : 0})`);
  if (q.project_id) { where.push('d.project_id=?'); p.push(q.project_id); }
  if (q.category) { where.push('d.category=?'); p.push(q.category); }
  if (q.search) { where.push('(d.number LIKE ? OR d.title LIKE ?)'); p.push(`%${q.search}%`, `%${q.search}%`); }
  let rows = all(`SELECT d.*, p.name project_name FROM drawings d JOIN projects p ON p.id=d.project_id WHERE ${where.join(' AND ')} ORDER BY d.category, d.number`, ...p);
  if (A.isContractor(req.user)) rows = rows.filter(d => contractorCanSeeDrawing(req.user, d));
  return rows.map(d => {
    const cur = get("SELECT r.*, u.name uploader FROM drawing_revisions r LEFT JOIN users u ON u.id=r.uploaded_by WHERE drawing_id=? AND status='approved' ORDER BY id DESC", d.id);
    const pending = A.isContractor(req.user) ? 0 : get("SELECT count(*) n FROM drawing_revisions WHERE drawing_id=? AND status='pending_approval'", d.id).n;
    return { ...d, location: locationPath(d.location_id), current: cur || null, pending, shared_contractors: parse(d.shared_contractors, []) };
  }).filter(d => !A.isContractor(req.user) || d.current);
}));
r.get('/drawings/:id', h((req) => {
  const d = get('SELECT d.*, p.name project_name FROM drawings d JOIN projects p ON p.id=d.project_id WHERE d.id=?', req.params.id) || A.notFound();
  A.assertProject(req.user, d.project_id);
  if (A.isContractor(req.user) && !contractorCanSeeDrawing(req.user, d)) A.notFound();
  let revs = all(`SELECT r.*, u.name uploader, v.name reviewer, f.name file_name, f.mime FROM drawing_revisions r LEFT JOIN users u ON u.id=r.uploaded_by LEFT JOIN users v ON v.id=r.reviewed_by LEFT JOIN files f ON f.id=r.file_id WHERE drawing_id=? ORDER BY r.id DESC`, d.id);
  if (A.isContractor(req.user)) revs = revs.filter(x => x.status === 'approved');
  return { ...d, location: locationPath(d.location_id), shared_contractors: parse(d.shared_contractors, []), revisions: revs };
}));
r.put('/drawings/:id/share', A.requireCap('drawings.approve'), h((req) => {
  const d = get('SELECT * FROM drawings WHERE id=?', req.params.id) || A.notFound();
  A.assertProject(req.user, d.project_id);
  const before = parse(d.shared_contractors, []);
  const ids = (req.body.contractor_ids || []).map(Number);
  run('UPDATE drawings SET shared_contractors=? WHERE id=?', JSON.stringify(ids), d.id);
  notify(ids.filter(i => !before.includes(i)).flatMap(contractorUsers), { type: 'drawing', title: `Drawing shared: ${d.number}`, link: `#/drawings/${d.id}` });
  return { ok: true };
}));

// ---------------- quality inspections ----------------
const DEFAULT_CHECKLISTS = {
  Excavation: ['Levels as per drawing', 'Dimensions checked', 'Soil strata verified', 'Dewatering arranged', 'Shoring / safety barricade'],
  Reinforcement: ['Bar diameter & spacing as per drawing', 'Lap length & location', 'Cover blocks provided', 'Binding & chairs', 'Cleanliness (no rust/oil)', 'Development length at junctions'],
  Shuttering: ['Line, level & plumb', 'Joints sealed', 'Props & bracing adequate', 'Release agent applied', 'Openings / sleeves fixed'],
  'Concrete work': ['Grade & mix verified', 'Slump test', 'Cubes cast', 'Vibration done', 'Curing arranged', 'Surface finish'],
  Masonry: ['Line & plumb', 'Mortar ratio', 'Joints filled & raked', 'Bond pattern', 'Curing'],
  Plaster: ['Surface prepared & wetted', 'Thickness', 'Line & level', 'Corners / edges', 'Curing', 'No cracks / hollowness'],
  Waterproofing: ['Surface preparation', 'Material as specified', 'Coats / thickness', 'Pond test 48h', 'Protection layer'],
  Plumbing: ['Pipe material & size', 'Slopes', 'Pressure test', 'Supports / clamps', 'Sleeves through walls'],
  'Electrical work': ['Conduit routing as per drawing', 'Wire gauge', 'Earthing', 'Insulation test', 'Box levels'],
  Flooring: ['Level & slope', 'Joint width', 'Hollowness check', 'Pattern alignment', 'Cleaning / protection'],
  Painting: ['Surface preparation', 'Primer', 'Number of coats', 'Shade as approved', 'Finish uniformity'],
  'Doors and windows': ['Frame plumb & square', 'Fixing', 'Hardware', 'Operation smooth', 'Sealant / gaps'],
  'Finishing and handover': ['Snag list closed', 'Cleaning', 'Fixtures working', 'Keys & documents', 'Client walkthrough'],
};
function checklists() {
  const rows = all('SELECT * FROM checklist_templates');
  const out = {}; rows.forEach(r2 => { out[r2.work_type] = parse(r2.items, []); });
  return out;
}
function decorateIns(i) {
  return { ...i, responses: parse(i.responses, []), location: locationPath(i.location_id), inspector_name: userName(i.inspector_id), reviewer_name: userName(i.reviewer_id), signed_off_name: userName(i.signed_off_by),
    contractor_name: i.contractor_id ? (get('SELECT name FROM contractors WHERE id=?', i.contractor_id) || {}).name : null,
    overdue: i.correction_deadline && i.correction_deadline < today() && i.status === 'rework_required' };
}
r.get('/checklists', h(() => checklists()));
r.get('/inspections', h((req) => {
  const q = req.query; const where = [A.scopeSql(req.user, 'i')]; const p = [];
  if (q.project_id) { where.push('i.project_id=?'); p.push(q.project_id); }
  if (q.status) { where.push(`i.status IN (${q.status.split(',').map(() => '?').join(',')})`); p.push(...q.status.split(',')); }
  if (q.contractor_id) { where.push('i.contractor_id=?'); p.push(q.contractor_id); }
  if (q.work_type) { where.push('i.work_type=?'); p.push(q.work_type); }
  if (q.from) { where.push('date(i.created_at)>=?'); p.push(q.from); }
  if (q.to) { where.push('date(i.created_at)<=?'); p.push(q.to); }
  return all(`SELECT i.*, p.name project_name FROM inspections i JOIN projects p ON p.id=i.project_id WHERE ${where.join(' AND ')} ORDER BY i.id DESC LIMIT 300`, ...p).map(decorateIns);
}));
r.get('/inspections/:id', h((req) => {
  const i = get(`SELECT i.*, p.name project_name FROM inspections i JOIN projects p ON p.id=i.project_id WHERE i.id=? AND ${A.scopeSql(req.user, 'i')}`, req.params.id) || A.notFound();
  const out = decorateIns(i);
  out.files = all("SELECT id,name,mime,kind,captured_at,uploaded_at,gps_lat,gps_lng,gps_accuracy,captured_offline FROM files WHERE entity='inspection' AND entity_id=?", i.id);
  return out;
}));
r.post('/inspections', A.requireCap('inspections.create'), h((req) => {
  const b = req.body;
  const pid = A.assertProject(req.user, b.project_id);
  if (b.client_uuid) { const ex = get('SELECT id FROM inspections WHERE client_uuid=?', b.client_uuid); if (ex) return { id: ex.id, duplicate: true }; }
  if (!b.work_type) A.bad('Select the work type');
  if (!['pass', 'fail', 'rework'].includes(b.result)) A.bad('Select Pass, Fail or Rework');
  if (b.result !== 'pass' && !b.correction_deadline) A.bad('Set a correction deadline for failed / rework inspections');
  const reviewer = b.reviewer_id || null;
  if (reviewer) { const ru = get('SELECT * FROM users WHERE id=?', reviewer); if (!ru || !A.can(ru, 'inspections.signoff')) A.bad('Selected reviewer cannot sign off inspections'); }
  const status = b.result === 'pass' ? 'awaiting_signoff' : 'rework_required';
  const id = insert('inspections', { client_uuid: b.client_uuid, project_id: pid, location_id: b.location_id || null, contractor_id: b.contractor_id || null, inspector_id: req.user.id, reviewer_id: reviewer,
    work_type: b.work_type, responses: JSON.stringify(b.responses || []), measurements: b.measurements, remarks: b.remarks, result: b.result, status, correction_deadline: b.correction_deadline, task_id: b.task_id || null });
  if (b.task_id) run('UPDATE tasks SET inspection_id=? WHERE id=? AND project_id=?', id, b.task_id, pid);
  (b.file_ids || []).forEach(fid => run("UPDATE files SET entity='inspection', entity_id=? WHERE id=? AND uploaded_by=?", id, fid, req.user.id));
  const link = `#/quality/${id}`;
  if (status === 'rework_required') {
    notify([...contractorUsers(b.contractor_id), ...projectUsersByRole(pid, ['site_engineer', 'supervisor', 'project_manager'])].filter(x => x !== req.user.id),
      { type: 'inspection_failed', title: `Quality ${b.result.toUpperCase()}: ${b.work_type}`, body: `Correct by ${b.correction_deadline}. ${b.remarks || ''}`, link });
  } else notify(reviewer || usersWithCap(pid, 'inspections.signoff').filter(x => x !== req.user.id), { type: 'approval', title: `Inspection sign-off needed: ${b.work_type}`, link });
  A.audit(req.user, 'create', 'inspection', id, { result: b.result });
  return { id };
}));
r.post('/inspections/:id/correct', h((req) => {
  const i = get(`SELECT i.* FROM inspections i WHERE id=? AND ${A.scopeSql(req.user, 'i')}`, req.params.id) || A.notFound();
  if (i.status !== 'rework_required') A.bad('Inspection is not awaiting correction');
  if (!req.body.note) A.bad('Describe the correction done');
  update('inspections', i.id, { status: 'reinspection_due', correction_note: req.body.note, corrected_at: new Date().toISOString() });
  (req.body.file_ids || []).forEach(fid => run("UPDATE files SET entity='inspection', entity_id=? WHERE id=? AND uploaded_by=?", i.id, fid, req.user.id));
  notify(i.inspector_id, { type: 'approval', title: 'Correction done — reinspection required', body: req.body.note, link: `#/quality/${i.id}` });
  A.audit(req.user, 'correct', 'inspection', i.id, req.body);
  return { ok: true };
}));
r.post('/inspections/:id/reinspect', A.requireCap('inspections.create'), h((req) => {
  const i = get('SELECT * FROM inspections WHERE id=?', req.params.id) || A.notFound();
  A.assertProject(req.user, i.project_id);
  if (!['reinspection_due', 'rework_required'].includes(i.status)) A.bad('Inspection is not awaiting reinspection');
  const { result, remarks, correction_deadline } = req.body;
  if (!['pass', 'fail'].includes(result)) A.bad('Select reinspection result');
  const status = result === 'pass' ? 'awaiting_signoff' : 'rework_required';
  if (result === 'fail' && !correction_deadline) A.bad('Set a new correction deadline');
  update('inspections', i.id, { status, reinspection_result: result, reinspection_remarks: remarks, reinspected_at: new Date().toISOString(), correction_deadline: correction_deadline || i.correction_deadline });
  (req.body.file_ids || []).forEach(fid => run("UPDATE files SET entity='inspection', entity_id=? WHERE id=? AND uploaded_by=?", i.id, fid, req.user.id));
  if (result === 'pass') notify(i.reviewer_id || usersWithCap(i.project_id, 'inspections.signoff'), { type: 'approval', title: `Inspection sign-off needed: ${i.work_type}`, link: `#/quality/${i.id}` });
  else notify(contractorUsers(i.contractor_id), { type: 'inspection_failed', title: `Reinspection failed: ${i.work_type}`, body: remarks, link: `#/quality/${i.id}` });
  A.audit(req.user, 'reinspect', 'inspection', i.id, req.body);
  return { ok: true };
}));
r.post('/inspections/:id/signoff', A.requireCap('inspections.signoff'), h((req) => {
  const i = get('SELECT * FROM inspections WHERE id=?', req.params.id) || A.notFound();
  A.assertProject(req.user, i.project_id);
  if (i.status !== 'awaiting_signoff') A.bad('Inspection is not ready for sign-off');
  if (i.reviewer_id && i.reviewer_id !== req.user.id && !['director', 'admin'].includes(req.user.role)) A.deny('Only the assigned reviewer can sign off');
  if (i.inspector_id === req.user.id && !i.reviewer_id && !['director', 'admin'].includes(req.user.role)) A.deny('Sign-off must be by a different reviewer than the inspector');
  update('inspections', i.id, { status: 'signed_off', signed_off_by: req.user.id, signed_off_at: new Date().toISOString() });
  if (i.task_id) { const t = get('SELECT * FROM tasks WHERE id=?', i.task_id); if (t) notify(t.reviewer_id, { type: 'approval', title: 'Inspection signed off — task can be approved', body: t.title, link: `#/tasks/${t.id}` }); }
  notify([i.inspector_id, ...contractorUsers(i.contractor_id)], { type: 'general', title: `Inspection signed off: ${i.work_type}`, link: `#/quality/${i.id}` });
  A.audit(req.user, 'signoff', 'inspection', i.id);
  return { ok: true };
}));

module.exports = { router: r, DEFAULT_CHECKLISTS, CATEGORIES, usersWithCap };
