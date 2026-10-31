// Auth, users, projects, structure, settings, admin
const express = require('express');
const fs = require('fs');
const path = require('path');
const { all, get, run, insert, update, tx, setting, setSetting, db, DATA_DIR } = require('../db');
const A = require('../auth');
const { h, parse, locationPath } = require('../util');
const { DEFAULT_CHANNELS, integrations } = require('../notify');

const r = express.Router();
const { can, requireCap, assertProject, projectIds, audit, bad, deny, notFound } = A;

// ---------- auth ----------
const attempts = new Map();
r.post('/auth/login', h((req) => {
  const { login, password } = req.body || {};
  if (!login || !password) bad('Enter login and password');
  const key = String(login).toLowerCase();
  const a = attempts.get(key) || { n: 0, t: 0 };
  if (a.n >= 8 && Date.now() - a.t < 10 * 60e3) throw new A.HttpError(429, 'Too many attempts. Try again in 10 minutes.');
  const u = get('SELECT * FROM users WHERE lower(login)=? OR (phone IS NOT NULL AND phone=?) OR (email IS NOT NULL AND lower(email)=?)', key, login, key);
  if (!u || !A.verifyPassword(password, u.password_hash)) {
    attempts.set(key, { n: a.n + 1, t: Date.now() });
    throw new A.HttpError(401, 'Invalid login or password');
  }
  if (!u.active) throw new A.HttpError(403, 'This account is deactivated');
  attempts.delete(key);
  audit(u, 'login', 'user', u.id);
  return { token: A.createSession(u.id) };
}));

r.use(A.authMiddleware);
r.use((req, res, next) => { // must change temporary password before doing anything else
  if (req.user.must_change_password && !['/me', '/auth/password', '/auth/logout'].includes(req.path)) return res.status(428).json({ error: 'Please change your temporary password first', code: 'CHANGE_PASSWORD' });
  next();
});

r.post('/auth/logout', h((req) => { run('DELETE FROM sessions WHERE token=?', req.token); return { ok: true }; }));
r.post('/auth/password', h((req) => {
  const { current, next } = req.body;
  const u = get('SELECT * FROM users WHERE id=?', req.user.id);
  if (!A.verifyPassword(current || '', u.password_hash)) bad('Current password is incorrect');
  if (!next || next.length < 8) bad('New password must be at least 8 characters');
  run('UPDATE users SET password_hash=?, must_change_password=0 WHERE id=?', A.hashPassword(next), u.id);
  run('DELETE FROM sessions WHERE user_id=? AND token<>?', u.id, req.token);
  audit(req.user, 'password_change', 'user', u.id);
  return { ok: true };
}));

r.get('/me', h((req) => {
  const perms = A.permissions()[req.user.role] || [];
  const ids = projectIds(req.user);
  const projects = all(`SELECT * FROM projects WHERE id IN (${ids.length ? ids.join(',') : 0}) ORDER BY is_sample, status, name`);
  const contractor = req.user.contractor_id ? get('SELECT id,name,trade FROM contractors WHERE id=?', req.user.contractor_id) : null;
  return { user: req.user, roleLabel: A.ROLES[req.user.role], caps: perms, projects, contractor,
    branding: { logo: setting('logo_url', '/logo.jpg'), company: setting('company_name', 'GAVAN GROUP') },
    showSample: setting('show_sample', true) };
}));
r.put('/me', h((req) => {
  const { lang, phone, email } = req.body;
  update('users', req.user.id, { lang: ['en', 'hi', 'gu'].includes(lang) ? lang : undefined, phone, email });
  return { ok: true };
}));

// ---------- meta ----------
r.get('/meta', h((req) => ({
  roles: A.ROLES, caps: A.CAPS,
  users: all(`SELECT id,name,role,department,contractor_id FROM users WHERE active=1 ORDER BY name`),
  contractors: all(`SELECT id,name,trade FROM contractors WHERE active=1 ORDER BY name`),
})));

// ---------- users ----------
r.get('/users', requireCap('users.manage'), h(() => all(`SELECT u.id,u.name,u.login,u.phone,u.email,u.role,u.department,u.contractor_id,u.active,u.is_sample,u.must_change_password,c.name contractor_name,
  (SELECT group_concat(p.name, ', ') FROM project_members pm JOIN projects p ON p.id=pm.project_id WHERE pm.user_id=u.id) projects
  FROM users u LEFT JOIN contractors c ON c.id=u.contractor_id ORDER BY u.active DESC, u.name`)));
r.post('/users', requireCap('users.manage'), h((req) => {
  const b = req.body;
  if (!b.name || !b.login || !b.role) bad('Name, login and role are required');
  if (!A.ROLES[b.role]) bad('Unknown role');
  if (b.role === 'director' && req.user.role !== 'director') deny('Only a director can create director accounts');
  if (b.role === 'contractor' && !b.contractor_id) bad('Link the contractor user to a contractor profile');
  const pw = b.password || Math.random().toString(36).slice(2, 10) + 'G1';
  if (pw.length < 8) bad('Password must be at least 8 characters');
  const id = insert('users', { name: b.name, login: b.login.trim(), phone: b.phone, email: b.email, role: b.role, department: b.department,
    contractor_id: b.contractor_id || null, password_hash: A.hashPassword(pw), must_change_password: 1, company_id: 1 });
  (b.project_ids || []).forEach(pid => run('INSERT OR IGNORE INTO project_members VALUES(?,?)', pid, id));
  audit(req.user, 'create', 'user', id, { login: b.login, role: b.role });
  return { id, temporaryPassword: pw };
}));
r.put('/users/:id', requireCap('users.manage'), h((req) => {
  const u = get('SELECT * FROM users WHERE id=?', req.params.id) || notFound();
  const b = req.body;
  if ((u.role === 'director' || b.role === 'director') && req.user.role !== 'director') deny('Only a director can modify director accounts');
  if (b.active === false && u.id === req.user.id) bad('You cannot deactivate yourself');
  update('users', u.id, { name: b.name, phone: b.phone, email: b.email, role: b.role, department: b.department, contractor_id: b.contractor_id, active: b.active });
  if (b.active === false) run('DELETE FROM sessions WHERE user_id=?', u.id);
  if (b.project_ids) { run('DELETE FROM project_members WHERE user_id=?', u.id); b.project_ids.forEach(pid => run('INSERT OR IGNORE INTO project_members VALUES(?,?)', pid, u.id)); }
  let pw;
  if (b.reset_password) { pw = Math.random().toString(36).slice(2, 10) + 'G1'; run('UPDATE users SET password_hash=?, must_change_password=1 WHERE id=?', A.hashPassword(pw), u.id); run('DELETE FROM sessions WHERE user_id=?', u.id); }
  audit(req.user, b.active === false ? 'deactivate' : 'update', 'user', u.id, { ...b, password: undefined });
  return { ok: true, temporaryPassword: pw };
}));
r.get('/users/:id/projects', requireCap('users.manage'), h((req) => all('SELECT project_id FROM project_members WHERE user_id=?', req.params.id).map(x => x.project_id)));

// ---------- projects ----------
r.get('/projects', h((req) => {
  const ids = projectIds(req.user);
  const showArchived = req.query.archived === '1';
  return all(`SELECT p.*, (SELECT count(*) FROM project_members WHERE project_id=p.id) members FROM projects p
    WHERE id IN (${ids.length ? ids.join(',') : 0}) ${showArchived ? '' : "AND status<>'archived'"} ORDER BY is_sample, name`);
}));
r.post('/projects', requireCap('projects.manage'), h((req) => {
  const b = req.body;
  if (!b.name) bad('Project name is required');
  const id = insert('projects', { name: b.name, code: b.code, type: b.type || 'residential', location: b.location, start_date: b.start_date, end_date: b.end_date, company_id: 1,
    morning_deadline: b.morning_deadline || '10:00', evening_deadline: b.evening_deadline || '19:00' });
  run('INSERT OR IGNORE INTO project_members VALUES(?,?)', id, req.user.id);
  defaultFolders(id);
  audit(req.user, 'create', 'project', id, b);
  return { id };
}));
r.get('/projects/:id', h((req) => {
  const id = assertProject(req.user, req.params.id);
  const p = get('SELECT * FROM projects WHERE id=?', id);
  p.members = all('SELECT u.id,u.name,u.role,u.phone FROM project_members pm JOIN users u ON u.id=pm.user_id WHERE pm.project_id=? ORDER BY u.role,u.name', id);
  p.locations = all('SELECT * FROM locations WHERE project_id=? ORDER BY parent_id, id', id).map(l => ({ ...l, path: locationPath(l.id) }));
  p.contractors = all(`SELECT pc.*, c.name, c.trade, c.phone FROM project_contractors pc JOIN contractors c ON c.id=pc.contractor_id WHERE pc.project_id=?`, id)
    .map(c => (can(req.user, 'finance.view') ? c : { ...c, rate: undefined, rate_unit: undefined }));
  if (A.isContractor(req.user)) p.contractors = p.contractors.filter(c => c.contractor_id === req.user.contractor_id);
  p.workItems = all('SELECT * FROM work_items WHERE project_id=? ORDER BY id', id).map(w => ({ ...w, location: locationPath(w.location_id) }));
  p.progress = projectProgress(id);
  return p;
}));
r.put('/projects/:id', requireCap('projects.manage'), h((req) => {
  const id = assertProject(req.user, req.params.id);
  const b = req.body;
  update('projects', id, { name: b.name, code: b.code, type: b.type, location: b.location, status: b.status, start_date: b.start_date, end_date: b.end_date, morning_deadline: b.morning_deadline, evening_deadline: b.evening_deadline });
  audit(req.user, b.status === 'archived' ? 'archive' : 'update', 'project', id, b);
  return { ok: true };
}));
r.put('/projects/:id/members', requireCap('projects.manage'), h((req) => {
  const id = assertProject(req.user, req.params.id);
  tx(() => { run('DELETE FROM project_members WHERE project_id=?', id); (req.body.user_ids || []).forEach(u => run('INSERT OR IGNORE INTO project_members VALUES(?,?)', id, u)); });
  audit(req.user, 'members', 'project', id, req.body.user_ids);
  return { ok: true };
}));
r.post('/projects/:id/locations', requireCap('projects.manage'), h((req) => {
  const id = assertProject(req.user, req.params.id);
  const { name, kind, parent_id } = req.body;
  if (!name || !kind) bad('Name and type are required');
  if (parent_id && !get('SELECT id FROM locations WHERE id=? AND project_id=?', parent_id, id)) bad('Invalid parent');
  return { id: insert('locations', { project_id: id, name, kind, parent_id: parent_id || null }) };
}));
r.delete('/locations/:id', requireCap('projects.manage'), h((req) => {
  const l = get('SELECT * FROM locations WHERE id=?', req.params.id) || notFound();
  assertProject(req.user, l.project_id);
  if (get('SELECT id FROM locations WHERE parent_id=?', l.id)) bad('Remove sub-locations first');
  run('DELETE FROM locations WHERE id=?', l.id);
  return { ok: true };
}));
r.post('/projects/:id/work-items', requireCap('projects.manage'), h((req) => {
  const id = assertProject(req.user, req.params.id);
  const b = req.body;
  if (!b.name) bad('Work item name required');
  return { id: insert('work_items', { project_id: id, name: b.name, unit: b.unit, planned_qty: Number(b.planned_qty) || 0, weight: Number(b.weight) || 1, location_id: b.location_id || null, contractor_id: b.contractor_id || null, done_qty: Number(b.done_qty) || 0 }) };
}));
r.put('/work-items/:id', requireCap('projects.manage'), h((req) => {
  const w = get('SELECT * FROM work_items WHERE id=?', req.params.id) || notFound();
  assertProject(req.user, w.project_id);
  const b = req.body;
  update('work_items', w.id, { name: b.name, unit: b.unit, planned_qty: b.planned_qty, weight: b.weight, done_qty: b.done_qty });
  audit(req.user, 'update', 'work_item', w.id, b);
  return { ok: true };
}));
r.delete('/work-items/:id', requireCap('projects.manage'), h((req) => {
  const w = get('SELECT * FROM work_items WHERE id=?', req.params.id) || notFound();
  assertProject(req.user, w.project_id);
  run('DELETE FROM work_items WHERE id=?', w.id);
  return { ok: true };
}));

// Progress = Σ(weight × min(done/planned,1)) / Σ weight over the project's work items.
function projectProgress(pid) {
  const items = all('SELECT * FROM work_items WHERE project_id=?', pid);
  const tw = items.reduce((s, i) => s + (i.weight || 0), 0);
  if (!tw) return { percent: null, method: 'No work items defined yet — add work items with planned quantity and weight to calculate progress.', items: 0 };
  const done = items.reduce((s, i) => s + (i.weight || 0) * (i.planned_qty ? Math.min((i.done_qty || 0) / i.planned_qty, 1) : 0), 0);
  return { percent: Math.round((done / tw) * 1000) / 10, items: items.length,
    method: `Weighted quantity method: Σ(weight × completed qty ÷ planned qty) ÷ Σ weight across ${items.length} work items. Completed qty is added automatically from evening site reports linked to work items (and can be corrected by admins).` };
}

function defaultFolders(pid) {
  const names = ['Drawings', 'Contracts & Work Orders', 'Site Photos', 'Quality', 'Purchase & Invoices', 'Meetings', 'General'];
  names.forEach(n => insert('folders', { project_id: pid, name: n, allowed_roles: n === 'Purchase & Invoices' ? JSON.stringify(['director', 'admin', 'purchase', 'accounts', 'project_manager']) : '[]' }));
}

// ---------- settings & admin ----------
r.get('/settings', requireCap('settings.manage'), h(() => {
  const integ = integrations();
  const masked = JSON.parse(JSON.stringify(integ));
  if (masked.smtp && masked.smtp.pass) masked.smtp.pass = '••••••';
  if (masked.whatsapp && masked.whatsapp.token) masked.whatsapp.token = '••••••';
  if (masked.push && masked.push.private_key) masked.push.private_key = '••••••';
  if (masked.video && masked.video.api_key) masked.video.api_key = '••••••';
  return { permissions: A.permissions(), roles: A.ROLES, caps: A.CAPS, integrations: masked,
    channels: setting('notification_channels', DEFAULT_CHANNELS),
    escalation: setting('escalation', { overdue_hours: 24, report_grace_minutes: 30, escalate_to_roles: ['project_manager', 'director'] }),
    company_name: setting('company_name', 'GAVAN GROUP'), show_sample: setting('show_sample', true),
    reportingLines: all(`SELECT rl.*, u.name to_name, f.name from_name, p.name project_name FROM reporting_lines rl LEFT JOIN users u ON u.id=rl.to_user_id LEFT JOIN users f ON f.id=rl.from_user_id LEFT JOIN projects p ON p.id=rl.project_id`),
    checklists: all('SELECT * FROM checklist_templates ORDER BY work_type').map(c => ({ ...c, items: parse(c.items, []) })),
  };
}));
r.put('/settings', requireCap('settings.manage'), h((req) => {
  const b = req.body;
  if (b.permissions) {
    const p = b.permissions;
    p.director = A.DEFAULT_PERMISSIONS.director; // directors always retain full access
    if (!(p.admin || []).includes('settings.manage')) bad('Company Admin must keep settings access');
    setSetting('permissions', p);
  }
  if (b.integrations) {
    const cur = integrations();
    for (const k of Object.keys(b.integrations)) {
      const v = { ...(cur[k] || {}), ...b.integrations[k] };
      for (const s of ['pass', 'token', 'private_key', 'api_key']) if (b.integrations[k][s] === '••••••') v[s] = (cur[k] || {})[s];
      cur[k] = v;
    }
    setSetting('integrations', cur);
  }
  if (b.channels) setSetting('notification_channels', b.channels);
  if (b.escalation) setSetting('escalation', b.escalation);
  if (b.company_name) setSetting('company_name', b.company_name);
  if (b.show_sample !== undefined) setSetting('show_sample', !!b.show_sample);
  audit(req.user, 'update', 'settings', null, Object.keys(b));
  return { ok: true };
}));
r.post('/settings/push-keys', requireCap('settings.manage'), h(() => {
  const keys = require('web-push').generateVAPIDKeys();
  const cur = integrations();
  cur.push = { ...(cur.push || {}), public_key: keys.publicKey, private_key: keys.privateKey, enabled: true };
  setSetting('integrations', cur);
  return { public_key: keys.publicKey };
}));
r.post('/settings/test-notification', requireCap('settings.manage'), h((req) => {
  require('../notify').notify(req.user.id, { type: 'escalation', title: 'Test notification', body: 'Testing configured delivery channels' });
  return { ok: true, note: 'Check Notification Delivery Log for real delivery status of each channel.' };
}));
r.get('/push/key', h(() => { const p = integrations().push; return { key: p && p.enabled ? p.public_key : null }; }));
r.post('/push/subscribe', h((req) => {
  const s = req.body; if (!s || !s.endpoint) bad('Invalid subscription');
  run('INSERT INTO push_subscriptions(user_id,endpoint,data) VALUES(?,?,?) ON CONFLICT(endpoint) DO UPDATE SET user_id=excluded.user_id, data=excluded.data', req.user.id, s.endpoint, JSON.stringify(s));
  return { ok: true };
}));
r.post('/settings/reporting-lines', requireCap('settings.manage'), h((req) => {
  const b = req.body; if (!b.to_user_id) bad('Select who receives the reports');
  return { id: insert('reporting_lines', { project_id: b.project_id || null, department: b.department, from_role: b.from_role, from_user_id: b.from_user_id || null, to_user_id: b.to_user_id, note: b.note }) };
}));
r.delete('/settings/reporting-lines/:id', requireCap('settings.manage'), h((req) => { run('DELETE FROM reporting_lines WHERE id=?', req.params.id); return { ok: true }; }));
r.put('/settings/checklists/:type', requireCap('settings.manage'), h((req) => {
  const items = (req.body.items || []).map(s => String(s).trim()).filter(Boolean);
  if (!items.length) bad('Checklist needs at least one item');
  run('INSERT INTO checklist_templates(work_type,items) VALUES(?,?) ON CONFLICT(work_type) DO UPDATE SET items=excluded.items', req.params.type, JSON.stringify(items));
  return { ok: true };
}));
r.get('/settings/deliveries', requireCap('settings.manage'), h(() => all(`SELECT d.*, n.title, n.type, u.name user_name FROM notification_deliveries d JOIN notifications n ON n.id=d.notification_id LEFT JOIN users u ON u.id=n.user_id ORDER BY d.id DESC LIMIT 300`)));

r.get('/audit', requireCap('audit.view'), h((req) => all(`SELECT a.*, u.name user_name FROM audit_log a LEFT JOIN users u ON u.id=a.user_id
  ${req.query.entity ? 'WHERE a.entity=?' : ''} ORDER BY a.id DESC LIMIT 500`, ...(req.query.entity ? [req.query.entity] : []))));

r.post('/admin/backup', requireCap('settings.manage'), h((req) => {
  const name = `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.db`;
  db.exec(`VACUUM INTO '${path.join(DATA_DIR, 'backups', name).replace(/'/g, "''")}'`);
  audit(req.user, 'backup', 'system', null, name);
  return { name };
}));
r.get('/admin/backups', requireCap('settings.manage'), h(() => fs.readdirSync(path.join(DATA_DIR, 'backups')).filter(f => f.endsWith('.db')).sort().reverse()
  .map(f => ({ name: f, size: fs.statSync(path.join(DATA_DIR, 'backups', f)).size }))));
r.get('/admin/backups/:name', requireCap('settings.manage'), (req, res) => {
  const f = path.basename(req.params.name);
  const p = path.join(DATA_DIR, 'backups', f);
  if (!fs.existsSync(p)) return res.status(404).json({ error: 'Not found' });
  res.download(p);
});
r.get('/admin/export.json', requireCap('settings.manage'), (req, res) => {
  const tables = all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT IN ('sessions','push_subscriptions')").map(t => t.name);
  const out = {};
  tables.forEach(t => { out[t] = all(`SELECT * FROM ${t}`); out[t].forEach(row => { delete row.password_hash; }); });
  audit(req.user, 'export', 'system', null);
  res.setHeader('Content-Disposition', `attachment; filename="gavan-site-export-${new Date().toISOString().slice(0, 10)}.json"`);
  res.json(out);
});
r.post('/admin/purge-sample', requireCap('settings.manage'), h((req) => {
  if (req.user.role !== 'director' && req.user.role !== 'admin') deny();
  const { purgeSample } = require('../seed');
  purgeSample();
  setSetting('sample_purged', true);
  audit(req.user, 'purge_sample', 'system', null);
  return { ok: true };
}));
r.post('/admin/load-sample', requireCap('settings.manage'), h((req) => {
  const { seedSample } = require('../seed');
  const res = seedSample();
  setSetting('sample_purged', false);
  audit(req.user, 'load_sample', 'system', null);
  return res;
}));

module.exports = { router: r, projectProgress, defaultFolders };
