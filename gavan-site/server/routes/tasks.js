// Tasks with review workflow, dependencies, checklist, comments & mentions
const express = require('express');
const { all, get, run, insert, update, tx } = require('../db');
const A = require('../auth');
const { h, parse, today, locationPath, userName, contractorUsers } = require('../util');
const { notify } = require('../notify');

const r = express.Router();
const FLOW = {
  open: ['in_progress'],
  in_progress: ['submitted'],
  submitted: ['approved', 'rework'],
  rework: ['in_progress'],
  approved: ['closed'],
  closed: [],
};

function visibleTaskSql(user) {
  // contractors: own contractor tasks; others: project scope (non-reviewers still see all tasks of their projects)
  let s = A.scopeSql(user, 't');
  if (A.isContractor(user)) s = `(${s} OR t.assignee_id=${user.id})`;
  return s;
}
function loadTask(user, id) {
  const t = get(`SELECT t.* FROM tasks t WHERE t.id=? AND ${visibleTaskSql(user)}`, id);
  if (!t) A.notFound('Task not found or not accessible');
  return t;
}
function decorate(t) {
  return { ...t, checklist: parse(t.checklist, []), depends_on: parse(t.depends_on, []), location: locationPath(t.location_id),
    assignee_name: userName(t.assignee_id), reviewer_name: userName(t.reviewer_id), created_by_name: userName(t.created_by),
    contractor_name: t.contractor_id ? (get('SELECT name FROM contractors WHERE id=?', t.contractor_id) || {}).name : null,
    overdue: t.due_date && t.due_date < today() && !['approved', 'closed'].includes(t.status) };
}
const people = (t) => [t.assignee_id, ...contractorUsers(t.contractor_id)];

r.get('/tasks', h((req) => {
  const q = req.query;
  const where = [visibleTaskSql(req.user)]; const p = [];
  if (q.project_id) { where.push('t.project_id=?'); p.push(q.project_id); }
  if (q.status) { where.push(`t.status IN (${q.status.split(',').map(() => '?').join(',')})`); p.push(...q.status.split(',')); }
  if (q.mine === '1') { where.push('(t.assignee_id=? OR t.reviewer_id=? OR t.created_by=?)'); p.push(req.user.id, req.user.id, req.user.id); }
  if (q.assignee_id) { where.push('t.assignee_id=?'); p.push(q.assignee_id); }
  if (q.contractor_id) { where.push('t.contractor_id=?'); p.push(q.contractor_id); }
  if (q.priority) { where.push('t.priority=?'); p.push(q.priority); }
  if (q.overdue === '1') { where.push("t.due_date < ? AND t.status NOT IN ('approved','closed')"); p.push(today()); }
  if (q.review === '1') { where.push("t.status='submitted' AND t.reviewer_id=?"); p.push(req.user.id); }
  if (q.from) { where.push('coalesce(t.due_date,t.start_date)>=?'); p.push(q.from); }
  if (q.to) { where.push('coalesce(t.start_date,t.due_date)<=?'); p.push(q.to); }
  if (q.search) { where.push('(t.title LIKE ? OR t.description LIKE ?)'); p.push(`%${q.search}%`, `%${q.search}%`); }
  return all(`SELECT t.*, p.name project_name FROM tasks t JOIN projects p ON p.id=t.project_id WHERE ${where.join(' AND ')} ORDER BY
    CASE t.status WHEN 'rework' THEN 0 WHEN 'submitted' THEN 1 WHEN 'in_progress' THEN 2 WHEN 'open' THEN 3 ELSE 4 END, t.due_date IS NULL, t.due_date LIMIT 500`, ...p).map(decorate);
}));

r.get('/tasks/:id', h((req) => {
  const t = decorate(loadTask(req.user, req.params.id));
  t.history = all('SELECT th.*, u.name user_name FROM task_history th LEFT JOIN users u ON u.id=th.user_id WHERE task_id=? ORDER BY th.id', t.id);
  t.comments = all('SELECT c.*, u.name user_name FROM comments c LEFT JOIN users u ON u.id=c.user_id WHERE entity=? AND entity_id=? ORDER BY c.id', 'task', t.id);
  t.files = all("SELECT id,name,mime,kind,captured_at,uploaded_at,gps_lat,gps_lng,gps_accuracy,captured_offline FROM files WHERE entity='task' AND entity_id=?", t.id);
  t.dependencies = t.depends_on.length ? all(`SELECT id,title,status FROM tasks WHERE id IN (${t.depends_on.map(Number).join(',')})`) : [];
  t.inspection = t.inspection_id ? get('SELECT id,status,result,work_type FROM inspections WHERE id=?', t.inspection_id) : null;
  return t;
}));

r.post('/tasks', A.requireCap('tasks.create'), h((req) => {
  const b = req.body;
  const pid = A.assertProject(req.user, b.project_id);
  if (b.client_uuid) { const ex = get('SELECT id FROM tasks WHERE client_uuid=?', b.client_uuid); if (ex) return { id: ex.id, duplicate: true }; }
  if (!b.title) A.bad('Task title is required');
  if (b.start_date && b.due_date && b.due_date < b.start_date) A.bad('Due date cannot be before start date');
  if (!b.assignee_id && !b.contractor_id) A.bad('Assign a responsible person or contractor');
  const checklist = (b.checklist || []).filter(c => c && (c.text || typeof c === 'string')).map(c => (typeof c === 'string' ? { text: c, done: false } : { text: c.text, done: !!c.done }));
  const id = insert('tasks', { client_uuid: b.client_uuid, project_id: pid, location_id: b.location_id || null, title: b.title, description: b.description, assignee_id: b.assignee_id || null,
    contractor_id: b.contractor_id || null, department: b.department, priority: b.priority || 'medium', start_date: b.start_date, due_date: b.due_date,
    reviewer_id: b.reviewer_id || req.user.id, checklist: JSON.stringify(checklist), depends_on: JSON.stringify((b.depends_on || []).map(Number)),
    requires_inspection: b.requires_inspection ? 1 : 0, source: b.source, created_by: req.user.id });
  insert('task_history', { task_id: id, user_id: req.user.id, from_status: null, to_status: 'open', note: 'Created' });
  (b.file_ids || []).forEach(fid => run("UPDATE files SET entity='task', entity_id=? WHERE id=? AND uploaded_by=?", id, fid, req.user.id));
  const t = get('SELECT * FROM tasks WHERE id=?', id);
  notify(people(t).filter(x => x !== req.user.id), { type: 'task_assigned', title: 'Task assigned: ' + b.title, body: `Due ${b.due_date || '—'} · Priority ${t.priority}`, link: `#/tasks/${id}` });
  A.audit(req.user, 'create', 'task', id, { title: b.title });
  return { id };
}));

r.put('/tasks/:id', h((req) => {
  const t = loadTask(req.user, req.params.id);
  const b = req.body;
  const isEditor = t.created_by === req.user.id || A.can(req.user, 'tasks.review');
  const isDoer = t.assignee_id === req.user.id || (A.isContractor(req.user) && t.contractor_id === req.user.contractor_id);
  if (b.checklist && (isEditor || isDoer)) {
    run('UPDATE tasks SET checklist=?, updated_at=CURRENT_TIMESTAMP WHERE id=?', JSON.stringify(b.checklist.map(c => ({ text: c.text, done: !!c.done }))), t.id);
  }
  const editable = ['title', 'description', 'assignee_id', 'contractor_id', 'priority', 'start_date', 'due_date', 'reviewer_id', 'location_id', 'department', 'requires_inspection', 'depends_on'];
  const changes = {};
  editable.forEach(k => { if (b[k] !== undefined) changes[k] = k === 'depends_on' ? JSON.stringify(b[k].map(Number).filter(x => x !== t.id)) : b[k]; });
  if (Object.keys(changes).length) {
    if (!isEditor) A.deny('Only the task creator or a reviewer can edit task details');
    update('tasks', t.id, { ...changes, updated_at: new Date().toISOString() });
    if (changes.assignee_id && Number(changes.assignee_id) !== t.assignee_id) notify(changes.assignee_id, { type: 'task_assigned', title: 'Task assigned: ' + t.title, link: `#/tasks/${t.id}` });
    A.audit(req.user, 'update', 'task', t.id, changes);
  }
  return { ok: true };
}));

r.post('/tasks/:id/status', h((req) => {
  const t = loadTask(req.user, req.params.id);
  const to = req.body.status; const note = req.body.note || '';
  if (!(FLOW[t.status] || []).includes(to)) A.bad(`Cannot move task from ${t.status} to ${to}`);
  const isDoer = t.assignee_id === req.user.id || (A.isContractor(req.user) && t.contractor_id === req.user.contractor_id);
  const isReviewer = t.reviewer_id === req.user.id || (A.can(req.user, 'tasks.review') && !t.reviewer_id);
  const isMgmt = ['director', 'admin'].includes(req.user.role);
  if (to === 'in_progress') {
    if (!isDoer && !isMgmt && t.created_by !== req.user.id) A.deny('Only the assigned person/contractor can start this task');
    const deps = parse(t.depends_on, []);
    if (deps.length) {
      const pending = all(`SELECT title FROM tasks WHERE id IN (${deps.map(Number).join(',')}) AND status NOT IN ('approved','closed')`);
      if (pending.length) A.bad('Blocked by unfinished dependencies: ' + pending.map(p => p.title).join(', '));
    }
  }
  if (to === 'submitted') {
    if (!isDoer && !isMgmt) A.deny('Only the assigned person/contractor can submit this task');
    const cl = parse(t.checklist, []);
    if (cl.some(c => !c.done)) A.bad('Complete all checklist items before submitting');
    const proof = get("SELECT count(*) n FROM files WHERE entity='task' AND entity_id=? AND uploaded_at >= ?", t.id, t.created_at).n;
    if (!proof && !note) A.bad('Attach proof of completion (photo/file) or enter a completion note');
    if (note) run('UPDATE tasks SET completion_note=? WHERE id=?', note, t.id);
  }
  if (to === 'approved' || to === 'rework') {
    if (!isReviewer && !isMgmt) A.deny('Only the assigned reviewer can approve or send back this task');
    if (to === 'rework' && !note) A.bad('Enter what needs to be reworked');
    if (to === 'approved' && t.requires_inspection) {
      const ins = t.inspection_id && get('SELECT status FROM inspections WHERE id=?', t.inspection_id);
      if (!ins || ins.status !== 'signed_off') A.bad('This work requires a quality inspection signed off by the reviewer before approval');
    }
  }
  if (to === 'closed' && !isReviewer && !isMgmt && t.created_by !== req.user.id) A.deny();
  tx(() => {
    run('UPDATE tasks SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?', to, t.id);
    insert('task_history', { task_id: t.id, user_id: req.user.id, from_status: t.status, to_status: to, note });
  });
  A.audit(req.user, 'status:' + to, 'task', t.id, { note });
  const link = `#/tasks/${t.id}`;
  if (to === 'submitted') notify(t.reviewer_id || t.created_by, { type: 'task_review', title: 'Task submitted for review: ' + t.title, body: note, link });
  if (to === 'approved') notify(people(t), { type: 'task_approved', title: 'Task approved: ' + t.title, link });
  if (to === 'rework') notify(people(t), { type: 'task_rework', title: 'Rework required: ' + t.title, body: note, link });
  if (to === 'approved' || to === 'closed') { // unblock dependants
    all(`SELECT * FROM tasks WHERE depends_on LIKE ? AND status='open'`, `%${t.id}%`).filter(d => parse(d.depends_on, []).includes(t.id))
      .forEach(d => notify(people(d), { type: 'general', title: 'Dependency completed: you can start ' + d.title, link: `#/tasks/${d.id}` }));
  }
  return { ok: true };
}));

// ----- comments (shared across entities) with @mentions -----
const ENTITY_TABLE = { task: 'tasks', drawing_request: 'drawing_requests', inspection: 'inspections', material_request: 'material_requests', daily_report: 'daily_reports' };
r.get('/comments', h((req) => {
  const table = ENTITY_TABLE[req.query.entity] || A.bad('Unknown entity');
  const rec = get(`SELECT project_id FROM ${table} WHERE id=?`, req.query.entity_id) || A.notFound();
  A.assertProject(req.user, rec.project_id);
  if (req.query.entity === 'task') loadTask(req.user, req.query.entity_id);
  return all('SELECT c.*, u.name user_name FROM comments c LEFT JOIN users u ON u.id=c.user_id WHERE entity=? AND entity_id=? ORDER BY c.id', req.query.entity, req.query.entity_id);
}));
r.post('/comments', h((req) => {
  const { entity, entity_id, body } = req.body;
  const table = ENTITY_TABLE[entity] || A.bad('Unknown entity');
  if (!body || !body.trim()) A.bad('Comment is empty');
  const rec = get(`SELECT * FROM ${table} WHERE id=?`, entity_id) || A.notFound();
  A.assertProject(req.user, rec.project_id);
  if (entity === 'task') loadTask(req.user, entity_id);
  const id = insert('comments', { entity, entity_id, user_id: req.user.id, body: body.trim() });
  const link = { task: `#/tasks/${entity_id}`, drawing_request: `#/drawings/req/${entity_id}`, inspection: `#/quality/${entity_id}`, material_request: `#/materials/req/${entity_id}`, daily_report: `#/reports/${entity_id}` }[entity];
  const mentioned = mentionedUsers(body, rec.project_id);
  notify(mentioned.filter(x => x !== req.user.id), { type: 'mention', title: `${req.user.name} mentioned you`, body: body.slice(0, 140), link });
  if (entity === 'task') notify([rec.assignee_id, rec.reviewer_id, rec.created_by].filter(x => x && x !== req.user.id && !mentioned.includes(x)), { type: 'general', title: 'New comment on ' + rec.title, body: body.slice(0, 140), link });
  return { id };
}));
function mentionedUsers(body, projectId) {
  const members = all('SELECT u.id, u.name FROM users u JOIN project_members pm ON pm.user_id=u.id WHERE pm.project_id=? AND u.active=1', projectId);
  const lower = body.toLowerCase();
  return members.filter(m => lower.includes('@' + m.name.toLowerCase()) || lower.includes('@' + m.name.split(' ')[0].toLowerCase())).map(m => m.id);
}

module.exports = { router: r, mentionedUsers, decorate };
