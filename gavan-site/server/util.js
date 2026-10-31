const { get, all } = require('./db');
const { HttpError } = require('./auth');

// wraps a handler so thrown HttpErrors become JSON responses
const h = (fn) => async (req, res) => {
  try {
    const out = await fn(req, res);
    if (out !== undefined && !res.headersSent) res.json(out);
  } catch (e) {
    if (e instanceof HttpError) return res.status(e.status).json({ error: e.message });
    if (String(e.message).includes('UNIQUE constraint failed')) return res.status(409).json({ error: 'Duplicate record: ' + e.message.split(':').pop().trim() });
    console.error(e);
    res.status(500).json({ error: 'Server error: ' + e.message });
  }
};
const today = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10); // IST date
const nowIST = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(11, 16);
const parse = (s, d = null) => { try { return s ? JSON.parse(s) : d; } catch { return d; } };
const userName = (id) => (id ? (get('SELECT name FROM users WHERE id=?', id) || {}).name : null);

function locationPath(id) {
  const parts = [];
  let cur = id ? get('SELECT * FROM locations WHERE id=?', id) : null;
  let guard = 0;
  while (cur && guard++ < 10) { parts.unshift(cur.name); cur = cur.parent_id ? get('SELECT * FROM locations WHERE id=?', cur.parent_id) : null; }
  return parts.join(' › ');
}
// Returns user ids by role on a project (members) + always directors/admins if includeMgmt
function projectUsersByRole(projectId, roles) {
  const ph = roles.map(() => '?').join(',');
  return all(`SELECT u.id FROM users u JOIN project_members pm ON pm.user_id=u.id WHERE pm.project_id=? AND u.active=1 AND u.role IN (${ph})`, projectId, ...roles).map(r => r.id);
}
function contractorUsers(contractorId) {
  return contractorId ? all('SELECT id FROM users WHERE contractor_id=? AND active=1', contractorId).map(r => r.id) : [];
}
module.exports = { h, today, nowIST, parse, userName, locationPath, projectUsersByRole, contractorUsers };
