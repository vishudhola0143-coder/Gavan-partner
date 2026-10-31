// Authentication, roles and permission enforcement (backend source of truth)
const crypto = require('crypto');
const { all, get, run, insert, setting } = require('./db');

const ROLES = {
  director: 'Director / Partner',
  admin: 'Company Admin',
  project_manager: 'Project Manager',
  pmc: 'PMC',
  site_engineer: 'Site Engineer',
  supervisor: 'Site Supervisor',
  architect: 'Architect',
  structural_engineer: 'Structural Engineer',
  contractor: 'Contractor',
  purchase: 'Purchase Team',
  accounts: 'Accounts Team',
};

const CAPS = {
  all_projects: 'See all company projects',
  'projects.manage': 'Create / edit / archive projects, teams & locations',
  'users.manage': 'Manage users & deactivate accounts',
  'settings.manage': 'Integrations, permissions, reporting structure, checklists',
  'dashboard.view': 'Management dashboard',
  'reports.submit': 'Submit morning / evening site reports',
  'reports.view': 'View daily site reports',
  'tasks.create': 'Create & assign tasks',
  'tasks.review': 'Review / approve tasks',
  'drawings.request': 'Raise drawing requests',
  'drawings.check': 'Check drawing requests (site engineer step)',
  'drawings.upload': 'Upload drawings / revisions',
  'drawings.approve': 'Approve drawing revisions',
  'inspections.create': 'Raise quality inspections',
  'inspections.signoff': 'Sign off inspections',
  'contractors.manage': 'Manage contractor profiles & work orders',
  'finance.view': 'View rates, bills, PO values, invoices',
  'finance.manage': 'Record bills & payments',
  'materials.request': 'Raise material requests',
  'materials.approve': 'Approve material requests',
  'purchase.manage': 'Create purchase orders',
  'materials.receive': 'Receive & verify deliveries at site',
  'accounts.review': 'Accounts review of purchases',
  'stock.manage': 'Record stock consumption, wastage, transfers',
  'labour.record': 'Record labour attendance',
  'plans.manage': 'Daily / weekly work planning',
  'files.upload': 'Upload files & photos',
  'files.manage': 'Manage folders & folder access',
  'meetings.manage': 'Schedule meetings & minutes',
  'exports': 'Download PDF / Excel reports',
  'audit.view': 'View audit history',
};

const ALL = Object.keys(CAPS);
const SITE = ['reports.submit', 'reports.view', 'tasks.create', 'drawings.request', 'drawings.check', 'inspections.create',
  'materials.request', 'materials.receive', 'stock.manage', 'labour.record', 'plans.manage', 'files.upload', 'meetings.manage', 'exports'];
const DEFAULT_PERMISSIONS = {
  director: ALL,
  admin: ALL,
  project_manager: [...SITE, 'dashboard.view', 'tasks.review', 'drawings.approve', 'inspections.signoff', 'materials.approve', 'contractors.manage', 'files.manage', 'audit.view'],
  pmc: [...SITE, 'dashboard.view', 'tasks.review', 'drawings.approve', 'inspections.signoff', 'materials.approve'],
  site_engineer: [...SITE, 'tasks.review', 'inspections.signoff'],
  supervisor: ['reports.submit', 'reports.view', 'tasks.create', 'drawings.request', 'inspections.create', 'materials.request', 'materials.receive', 'stock.manage', 'labour.record', 'plans.manage', 'files.upload'],
  architect: ['reports.view', 'tasks.create', 'tasks.review', 'drawings.upload', 'drawings.approve', 'inspections.create', 'files.upload', 'meetings.manage'],
  structural_engineer: ['reports.view', 'tasks.create', 'tasks.review', 'drawings.upload', 'drawings.approve', 'inspections.create', 'inspections.signoff', 'files.upload', 'meetings.manage'],
  contractor: ['drawings.request', 'files.upload'],
  purchase: ['purchase.manage', 'materials.approve', 'files.upload', 'exports', 'finance.view'],
  accounts: ['accounts.review', 'finance.view', 'finance.manage', 'exports', 'files.upload'],
};

function permissions() { return setting('permissions', DEFAULT_PERMISSIONS); }
function can(user, cap) { return !!user && (permissions()[user.role] || []).includes(cap); }

function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  return salt + ':' + crypto.scryptSync(pw, salt, 64).toString('hex');
}
function verifyPassword(pw, stored) {
  const [salt, hash] = String(stored).split(':');
  if (!salt || !hash) return false;
  const h = crypto.scryptSync(pw, salt, 64);
  return crypto.timingSafeEqual(h, Buffer.from(hash, 'hex'));
}
// DEMO_MODE (serverless hosting): stateless signed tokens so any instance accepts the login
const DEMO = process.env.DEMO_MODE === '1';
const SECRET = process.env.SESSION_SECRET || 'gavan-demo-secret';
const sign = (s) => crypto.createHmac('sha256', SECRET).update(s).digest('base64url');
function createSession(userId) {
  if (DEMO) { const body = `${userId}.${Date.now() + 7 * 864e5}`; return `d.${body}.${sign(body)}`; }
  const token = crypto.randomBytes(32).toString('hex');
  const exp = new Date(Date.now() + 30 * 864e5).toISOString();
  run('INSERT INTO sessions(token,user_id,expires_at) VALUES(?,?,?)', token, userId, exp);
  return token;
}

class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const deny = (msg = 'You do not have permission for this action') => { throw new HttpError(403, msg); };
const bad = (msg) => { throw new HttpError(400, msg); };
const notFound = (msg = 'Not found') => { throw new HttpError(404, msg); };

function authMiddleware(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : (req.query.token || '');
  if (!token) return res.status(401).json({ error: 'Login required' });
  let s;
  if (DEMO && token.startsWith('d.')) {
    const [, uid, exp, sig] = token.split('.');
    if (sig !== sign(`${uid}.${exp}`) || Number(exp) < Date.now()) return res.status(401).json({ error: 'Session expired, please login again' });
    s = { user_id: Number(uid) };
  } else {
    s = get('SELECT * FROM sessions WHERE token=?', token);
    if (!s || s.expires_at < new Date().toISOString()) return res.status(401).json({ error: 'Session expired, please login again' });
  }
  const u = get('SELECT * FROM users WHERE id=?', s.user_id);
  if (!u || !u.active) return res.status(401).json({ error: 'Account deactivated' });
  delete u.password_hash;
  req.user = u;
  req.token = token;
  next();
}
const requireCap = (cap) => (req, res, next) => (can(req.user, cap) ? next() : res.status(403).json({ error: 'You do not have permission for this action' }));

// ----- project scoping -----
function projectIds(user) {
  const hideSample = setting('show_sample', true) ? '' : ' AND p.is_sample=0';
  if (can(user, 'all_projects')) return all(`SELECT id FROM projects p WHERE 1=1${hideSample}`).map(r => r.id);
  return all(`SELECT pm.project_id id FROM project_members pm JOIN projects p ON p.id=pm.project_id WHERE pm.user_id=?${hideSample}`, user.id).map(r => r.id);
}
function assertProject(user, projectId) {
  projectId = Number(projectId);
  if (!projectId) bad('Project is required');
  if (!get('SELECT id FROM projects WHERE id=?', projectId)) notFound('Project not found');
  if (!projectIds(user).includes(projectId)) deny('You are not assigned to this project');
  return projectId;
}
// Contractors only see records tied to their own contractor profile
const isContractor = (u) => u.role === 'contractor';
function scopeSql(user, alias = '', contractorCol = 'contractor_id') {
  const p = alias ? alias + '.' : '';
  const ids = projectIds(user);
  let sql = ` ${p}project_id IN (${ids.length ? ids.join(',') : '0'})`;
  if (isContractor(user)) sql += ` AND ${p}${contractorCol} = ${Number(user.contractor_id) || -1}`;
  return sql;
}

function audit(user, action, entity, entityId, detail) {
  insert('audit_log', { user_id: user ? user.id : null, action, entity, entity_id: entityId, detail: detail ? JSON.stringify(detail).slice(0, 4000) : null });
}

module.exports = { ROLES, CAPS, DEFAULT_PERMISSIONS, permissions, can, hashPassword, verifyPassword, createSession,
  authMiddleware, requireCap, projectIds, assertProject, scopeSql, isContractor, audit, HttpError, deny, bad, notFound };
