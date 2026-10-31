// GAVAN SITE — database layer (Node built-in SQLite, no native build needed)
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(path.join(DATA_DIR, 'uploads'), { recursive: true });
fs.mkdirSync(path.join(DATA_DIR, 'backups'), { recursive: true });

const db = new DatabaseSync(process.env.DB_FILE || path.join(DATA_DIR, 'gavan.db'));
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE IF NOT EXISTS companies (id INTEGER PRIMARY KEY, name TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, login TEXT UNIQUE NOT NULL, phone TEXT, email TEXT,
  password_hash TEXT NOT NULL, role TEXT NOT NULL, company_id INTEGER REFERENCES companies(id),
  department TEXT, contractor_id INTEGER, active INTEGER DEFAULT 1, must_change_password INTEGER DEFAULT 0,
  lang TEXT DEFAULT 'en', is_sample INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), created_at TEXT DEFAULT CURRENT_TIMESTAMP, expires_at TEXT);
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, code TEXT, type TEXT DEFAULT 'residential', location TEXT,
  company_id INTEGER REFERENCES companies(id), status TEXT DEFAULT 'active', start_date TEXT, end_date TEXT,
  morning_deadline TEXT DEFAULT '10:00', evening_deadline TEXT DEFAULT '19:00',
  is_sample INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS project_members (project_id INTEGER REFERENCES projects(id), user_id INTEGER REFERENCES users(id), PRIMARY KEY(project_id, user_id));
CREATE TABLE IF NOT EXISTS locations (id INTEGER PRIMARY KEY, project_id INTEGER NOT NULL REFERENCES projects(id), parent_id INTEGER REFERENCES locations(id), kind TEXT NOT NULL, name TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS contractors (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, phone TEXT, trade TEXT, company_id INTEGER, notes TEXT,
  active INTEGER DEFAULT 1, is_sample INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS project_contractors (
  id INTEGER PRIMARY KEY, project_id INTEGER REFERENCES projects(id), contractor_id INTEGER REFERENCES contractors(id),
  work_order TEXT, scope TEXT, rate REAL, rate_unit TEXT, start_date TEXT, end_date TEXT, UNIQUE(project_id, contractor_id));
CREATE TABLE IF NOT EXISTS contractor_bills (
  id INTEGER PRIMARY KEY, contractor_id INTEGER REFERENCES contractors(id), project_id INTEGER REFERENCES projects(id),
  bill_no TEXT, amount REAL, bill_date TEXT, status TEXT DEFAULT 'submitted', paid_amount REAL DEFAULT 0, remarks TEXT,
  created_by INTEGER, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS work_items (
  id INTEGER PRIMARY KEY, project_id INTEGER NOT NULL REFERENCES projects(id), location_id INTEGER REFERENCES locations(id),
  name TEXT NOT NULL, unit TEXT, planned_qty REAL DEFAULT 0, weight REAL DEFAULT 1, done_qty REAL DEFAULT 0, contractor_id INTEGER);
CREATE TABLE IF NOT EXISTS daily_reports (
  id INTEGER PRIMARY KEY, client_uuid TEXT UNIQUE, kind TEXT NOT NULL, project_id INTEGER NOT NULL REFERENCES projects(id),
  location_id INTEGER, contractor_id INTEGER, report_date TEXT NOT NULL, report_time TEXT, morning_id INTEGER,
  data TEXT NOT NULL, version INTEGER DEFAULT 1, submitted_by INTEGER, submitted_at TEXT DEFAULT CURRENT_TIMESTAMP,
  captured_offline INTEGER DEFAULT 0, is_sample INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS report_edits (id INTEGER PRIMARY KEY, report_id INTEGER REFERENCES daily_reports(id), edited_by INTEGER, edited_at TEXT DEFAULT CURRENT_TIMESTAMP, before_data TEXT, after_data TEXT, reason TEXT);
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY, client_uuid TEXT UNIQUE, project_id INTEGER NOT NULL REFERENCES projects(id), location_id INTEGER,
  title TEXT NOT NULL, description TEXT, assignee_id INTEGER, contractor_id INTEGER, department TEXT,
  priority TEXT DEFAULT 'medium', start_date TEXT, due_date TEXT, status TEXT DEFAULT 'open',
  reviewer_id INTEGER, checklist TEXT DEFAULT '[]', depends_on TEXT DEFAULT '[]', completion_note TEXT,
  requires_inspection INTEGER DEFAULT 0, inspection_id INTEGER, source TEXT, created_by INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, is_sample INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS task_history (id INTEGER PRIMARY KEY, task_id INTEGER, user_id INTEGER, from_status TEXT, to_status TEXT, note TEXT, at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS comments (id INTEGER PRIMARY KEY, entity TEXT, entity_id INTEGER, user_id INTEGER, body TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS drawings (
  id INTEGER PRIMARY KEY, project_id INTEGER NOT NULL REFERENCES projects(id), location_id INTEGER, category TEXT,
  number TEXT NOT NULL, title TEXT, shared_contractors TEXT DEFAULT '[]', created_at TEXT DEFAULT CURRENT_TIMESTAMP, is_sample INTEGER DEFAULT 0, UNIQUE(project_id, number));
CREATE TABLE IF NOT EXISTS drawing_revisions (
  id INTEGER PRIMARY KEY, drawing_id INTEGER REFERENCES drawings(id), revision TEXT, file_id INTEGER, notes TEXT,
  uploaded_by INTEGER, uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP, status TEXT DEFAULT 'pending_approval',
  reviewed_by INTEGER, reviewed_at TEXT, review_note TEXT, request_id INTEGER);
CREATE TABLE IF NOT EXISTS drawing_requests (
  id INTEGER PRIMARY KEY, client_uuid TEXT UNIQUE, project_id INTEGER NOT NULL REFERENCES projects(id), location_id INTEGER,
  category TEXT, title TEXT, description TEXT, required_by TEXT, priority TEXT DEFAULT 'medium', consultant_id INTEGER,
  requested_by INTEGER, contractor_id INTEGER, status TEXT DEFAULT 'requested', checked_by INTEGER, check_note TEXT,
  drawing_id INTEGER, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, is_sample INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS checklist_templates (id INTEGER PRIMARY KEY, work_type TEXT UNIQUE, items TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS inspections (
  id INTEGER PRIMARY KEY, client_uuid TEXT UNIQUE, project_id INTEGER NOT NULL REFERENCES projects(id), location_id INTEGER,
  contractor_id INTEGER, inspector_id INTEGER, reviewer_id INTEGER, work_type TEXT, responses TEXT DEFAULT '[]',
  measurements TEXT, remarks TEXT, result TEXT, status TEXT DEFAULT 'open', correction_deadline TEXT,
  correction_note TEXT, corrected_at TEXT, reinspection_result TEXT, reinspection_remarks TEXT, reinspected_at TEXT,
  signed_off_by INTEGER, signed_off_at TEXT, task_id INTEGER, created_at TEXT DEFAULT CURRENT_TIMESTAMP, is_sample INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS material_requests (
  id INTEGER PRIMARY KEY, client_uuid TEXT UNIQUE, project_id INTEGER NOT NULL REFERENCES projects(id), material TEXT NOT NULL,
  specification TEXT, qty REAL NOT NULL, unit TEXT, required_by TEXT, current_stock REAL, location_id INTEGER, remarks TEXT,
  status TEXT DEFAULT 'requested', requested_by INTEGER, approved_by INTEGER, approved_at TEXT, decision_note TEXT,
  accounts_reviewed_by INTEGER, accounts_reviewed_at TEXT, accounts_note TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP, is_sample INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS purchase_orders (
  id INTEGER PRIMARY KEY, request_id INTEGER REFERENCES material_requests(id), project_id INTEGER, po_number TEXT, supplier TEXT,
  qty REAL, unit TEXT, rate REAL, expected_date TEXT, created_by INTEGER, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS deliveries (
  id INTEGER PRIMARY KEY, client_uuid TEXT UNIQUE, po_id INTEGER REFERENCES purchase_orders(id), project_id INTEGER,
  challan_no TEXT, invoice_no TEXT, received_qty REAL, accepted_qty REAL, rejected_qty REAL, shortage_qty REAL,
  remarks TEXT, received_by INTEGER, received_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS stock_ledger (
  id INTEGER PRIMARY KEY, project_id INTEGER NOT NULL, material TEXT NOT NULL, unit TEXT, kind TEXT NOT NULL, qty REAL NOT NULL,
  ref TEXT, note TEXT, user_id INTEGER, at TEXT DEFAULT CURRENT_TIMESTAMP, is_sample INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS transfers (
  id INTEGER PRIMARY KEY, from_project INTEGER, to_project INTEGER, material TEXT, unit TEXT, qty REAL, status TEXT DEFAULT 'in_transit',
  sent_by INTEGER, sent_at TEXT DEFAULT CURRENT_TIMESTAMP, received_by INTEGER, received_at TEXT, received_qty REAL, note TEXT);
CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY, client_uuid TEXT UNIQUE, project_id INTEGER NOT NULL, att_date TEXT NOT NULL, contractor_id INTEGER,
  trade TEXT, location_id INTEGER, planned INTEGER DEFAULT 0, skilled INTEGER DEFAULT 0, unskilled INTEGER DEFAULT 0,
  hours REAL DEFAULT 8, overtime REAL DEFAULT 0, qty_done REAL, qty_unit TEXT, tomorrow_required INTEGER,
  recorded_by INTEGER, created_at TEXT DEFAULT CURRENT_TIMESTAMP, is_sample INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS plans (
  id INTEGER PRIMARY KEY, project_id INTEGER NOT NULL, period TEXT DEFAULT 'weekly', period_start TEXT, title TEXT NOT NULL,
  location_id INTEGER, contractor_id INTEGER, target_qty REAL, unit TEXT, actual_qty REAL DEFAULT 0, responsible_id INTEGER,
  deadline TEXT, status TEXT DEFAULT 'planned', reason TEXT, revised_date TEXT, created_by INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP, is_sample INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS folders (id INTEGER PRIMARY KEY, project_id INTEGER NOT NULL, parent_id INTEGER, name TEXT NOT NULL, allowed_roles TEXT DEFAULT '[]');
CREATE TABLE IF NOT EXISTS files (
  id INTEGER PRIMARY KEY, client_uuid TEXT UNIQUE, project_id INTEGER, folder_id INTEGER, name TEXT NOT NULL, mime TEXT, size INTEGER,
  stored_name TEXT NOT NULL, kind TEXT DEFAULT 'document', entity TEXT, entity_id INTEGER, location_id INTEGER,
  captured_at TEXT, gps_lat REAL, gps_lng REAL, gps_accuracy REAL, captured_offline INTEGER DEFAULT 0,
  version_group TEXT, version INTEGER DEFAULT 1, uploaded_by INTEGER, uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS chats (id INTEGER PRIMARY KEY, project_id INTEGER, kind TEXT NOT NULL, name TEXT, task_id INTEGER, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS chat_members (chat_id INTEGER, user_id INTEGER, last_read INTEGER DEFAULT 0, PRIMARY KEY(chat_id, user_id));
CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY, chat_id INTEGER, user_id INTEGER, body TEXT, file_id INTEGER, pinned INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS meetings (
  id INTEGER PRIMARY KEY, project_id INTEGER, title TEXT NOT NULL, starts_at TEXT, location TEXT, video_link TEXT,
  agenda TEXT, minutes TEXT, attendees TEXT DEFAULT '[]', created_by INTEGER, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS notifications (id INTEGER PRIMARY KEY, user_id INTEGER, type TEXT, title TEXT, body TEXT, link TEXT, dedupe_key TEXT, read INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE UNIQUE INDEX IF NOT EXISTS ux_notif_dedupe ON notifications(user_id, dedupe_key);
CREATE TABLE IF NOT EXISTS notification_deliveries (id INTEGER PRIMARY KEY, notification_id INTEGER, channel TEXT, target TEXT, status TEXT, error TEXT, at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS push_subscriptions (id INTEGER PRIMARY KEY, user_id INTEGER, endpoint TEXT UNIQUE, data TEXT);
CREATE TABLE IF NOT EXISTS reporting_lines (id INTEGER PRIMARY KEY, project_id INTEGER, department TEXT, from_role TEXT, from_user_id INTEGER, to_user_id INTEGER NOT NULL, note TEXT);
CREATE TABLE IF NOT EXISTS audit_log (id INTEGER PRIMARY KEY, user_id INTEGER, action TEXT, entity TEXT, entity_id INTEGER, detail TEXT, at TEXT DEFAULT CURRENT_TIMESTAMP);
`;
db.exec(SCHEMA);

// ---------- helpers ----------
const all = (sql, ...p) => db.prepare(sql).all(...p);
const get = (sql, ...p) => db.prepare(sql).get(...p);
const run = (sql, ...p) => db.prepare(sql).run(...p);
function insert(table, obj) {
  const keys = Object.keys(obj).filter(k => obj[k] !== undefined);
  const r = run(`INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`, ...keys.map(k => norm(obj[k])));
  return Number(r.lastInsertRowid);
}
function update(table, id, obj) {
  const keys = Object.keys(obj).filter(k => obj[k] !== undefined);
  if (!keys.length) return;
  run(`UPDATE ${table} SET ${keys.map(k => `${k}=?`).join(',')} WHERE id=?`, ...keys.map(k => norm(obj[k])), id);
}
function norm(v) {
  if (v === undefined) return null;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (v !== null && typeof v === 'object') return JSON.stringify(v);
  if (v === '') return null;
  return v;
}
function tx(fn) {
  db.exec('BEGIN');
  try { const r = fn(); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; }
}
function setting(key, fallback) {
  const r = get('SELECT value FROM settings WHERE key=?', key);
  if (!r) return fallback;
  try { return JSON.parse(r.value); } catch { return r.value; }
}
function setSetting(key, value) {
  run('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', key, JSON.stringify(value));
}

module.exports = { db, all, get, run, insert, update, tx, setting, setSetting, DATA_DIR };
