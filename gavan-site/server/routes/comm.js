// Chat (project groups, direct, task threads), meetings, in-app notifications
const express = require('express');
const { all, get, run, insert, update, setting } = require('../db');
const A = require('../auth');
const { h, parse, userName } = require('../util');
const { notify } = require('../notify');
const { mentionedUsers } = require('./tasks');

const r = express.Router();

function ensureProjectChats(user) {
  for (const pid of A.projectIds(user)) {
    let c = get("SELECT id FROM chats WHERE kind='group' AND project_id=?", pid);
    if (!c) { const p = get('SELECT name FROM projects WHERE id=?', pid); c = { id: insert('chats', { project_id: pid, kind: 'group', name: p.name + ' — Team' }) }; }
    if (!A.isContractor(user)) run('INSERT OR IGNORE INTO chat_members(chat_id,user_id) VALUES(?,?)', c.id, user.id);
  }
}
function canAccessChat(user, chat) {
  if (chat.kind === 'group') return A.projectIds(user).includes(chat.project_id) && !A.isContractor(user);
  return !!get('SELECT 1 FROM chat_members WHERE chat_id=? AND user_id=?', chat.id, user.id);
}

r.get('/chats', h((req) => {
  ensureProjectChats(req.user);
  return all(`SELECT c.*, p.name project_name, cm.last_read,
    (SELECT count(*) FROM messages m WHERE m.chat_id=c.id AND m.id>cm.last_read AND m.user_id<>?) unread,
    (SELECT body FROM messages m WHERE m.chat_id=c.id ORDER BY id DESC LIMIT 1) last_body,
    (SELECT created_at FROM messages m WHERE m.chat_id=c.id ORDER BY id DESC LIMIT 1) last_at,
    (SELECT group_concat(u.name, ', ') FROM chat_members x JOIN users u ON u.id=x.user_id WHERE x.chat_id=c.id AND x.user_id<>?) others
    FROM chats c JOIN chat_members cm ON cm.chat_id=c.id AND cm.user_id=? LEFT JOIN projects p ON p.id=c.project_id
    ORDER BY coalesce(last_at, c.created_at) DESC`, req.user.id, req.user.id, req.user.id).filter(c => canAccessChat(req.user, c));
}));
r.post('/chats/direct', h((req) => {
  const other = get('SELECT id,name FROM users WHERE id=? AND active=1', req.body.user_id) || A.notFound('User not found');
  if (other.id === req.user.id) A.bad('Choose another person');
  const shared = A.projectIds(req.user).some(p => get('SELECT 1 FROM project_members WHERE project_id=? AND user_id=?', p, other.id));
  if (!shared && !A.can(req.user, 'all_projects')) A.deny('You can message people who share a project with you');
  const ex = get(`SELECT c.id FROM chats c WHERE kind='direct' AND EXISTS(SELECT 1 FROM chat_members WHERE chat_id=c.id AND user_id=?) AND EXISTS(SELECT 1 FROM chat_members WHERE chat_id=c.id AND user_id=?)`, req.user.id, other.id);
  if (ex) return { id: ex.id };
  const id = insert('chats', { kind: 'direct', name: null });
  run('INSERT INTO chat_members(chat_id,user_id) VALUES(?,?),(?,?)', id, req.user.id, id, other.id);
  return { id };
}));
r.post('/chats/task/:taskId', h((req) => {
  const t = get(`SELECT * FROM tasks t WHERE id=? AND ${A.scopeSql(req.user, 't')}`, req.params.taskId) || A.notFound();
  let c = get("SELECT id FROM chats WHERE kind='task' AND task_id=?", t.id);
  if (!c) c = { id: insert('chats', { kind: 'task', task_id: t.id, project_id: t.project_id, name: 'Task: ' + t.title }) };
  const members = [t.assignee_id, t.reviewer_id, t.created_by, req.user.id, ...all('SELECT id FROM users WHERE contractor_id=?', t.contractor_id || -1).map(x => x.id)].filter(Boolean);
  members.forEach(u => run('INSERT OR IGNORE INTO chat_members(chat_id,user_id) VALUES(?,?)', c.id, u));
  return { id: c.id };
}));
r.get('/chats/:id/messages', h((req) => {
  const c = get('SELECT * FROM chats WHERE id=?', req.params.id) || A.notFound();
  if (!canAccessChat(req.user, c)) A.deny();
  const after = Number(req.query.after) || 0;
  const msgs = all(`SELECT m.*, u.name user_name, f.name file_name, f.mime file_mime FROM messages m LEFT JOIN users u ON u.id=m.user_id LEFT JOIN files f ON f.id=m.file_id WHERE chat_id=? AND m.id>? ORDER BY m.id DESC LIMIT 200`, c.id, after).reverse();
  if (msgs.length) run('UPDATE chat_members SET last_read=? WHERE chat_id=? AND user_id=?', msgs[msgs.length - 1].id, c.id, req.user.id);
  const pinned = all('SELECT m.*, u.name user_name FROM messages m LEFT JOIN users u ON u.id=m.user_id WHERE chat_id=? AND pinned=1 ORDER BY id DESC', c.id);
  return { chat: { ...c, members: all('SELECT u.id,u.name,u.role FROM chat_members cm JOIN users u ON u.id=cm.user_id WHERE chat_id=?', c.id) }, messages: msgs, pinned };
}));
r.post('/chats/:id/messages', h((req) => {
  const c = get('SELECT * FROM chats WHERE id=?', req.params.id) || A.notFound();
  if (!canAccessChat(req.user, c)) A.deny();
  const { body, file_id } = req.body;
  if (!body && !file_id) A.bad('Message is empty');
  if (file_id) { const f = get('SELECT uploaded_by FROM files WHERE id=?', file_id); if (!f || f.uploaded_by !== req.user.id) A.bad('Invalid attachment'); run("UPDATE files SET entity='chat', entity_id=? WHERE id=?", c.id, file_id); }
  const id = insert('messages', { chat_id: c.id, user_id: req.user.id, body, file_id: file_id || null });
  run('UPDATE chat_members SET last_read=? WHERE chat_id=? AND user_id=?', id, c.id, req.user.id);
  if (body && c.project_id) {
    const m = mentionedUsers(body, c.project_id).filter(x => x !== req.user.id);
    notify(m, { type: 'mention', title: `${req.user.name} mentioned you in ${c.name || 'chat'}`, body: body.slice(0, 140), link: `#/chat/${c.id}` });
  }
  if (c.kind === 'direct') {
    const others = all('SELECT user_id FROM chat_members WHERE chat_id=? AND user_id<>?', c.id, req.user.id).map(x => x.user_id);
    notify(others, { type: 'general', title: 'Message from ' + req.user.name, body: (body || 'Attachment').slice(0, 140), link: `#/chat/${c.id}`, dedupe: `dm-${c.id}-${Math.floor(Date.now() / 600000)}` });
  }
  return { id };
}));
r.post('/messages/:id/pin', h((req) => {
  const m = get('SELECT * FROM messages WHERE id=?', req.params.id) || A.notFound();
  const c = get('SELECT * FROM chats WHERE id=?', m.chat_id);
  if (!canAccessChat(req.user, c)) A.deny();
  if (c.kind === 'group' && !A.can(req.user, 'tasks.review') && !A.can(req.user, 'meetings.manage')) A.deny('Only managers can pin instructions in project groups');
  run('UPDATE messages SET pinned=? WHERE id=?', m.pinned ? 0 : 1, m.id);
  return { ok: true };
}));

// ---------- meetings ----------
r.get('/meetings', h((req) => {
  const ids = A.projectIds(req.user);
  return all(`SELECT m.*, p.name project_name, u.name created_by_name FROM meetings m LEFT JOIN projects p ON p.id=m.project_id LEFT JOIN users u ON u.id=m.created_by
    WHERE (m.project_id IN (${ids.join(',') || 0}) OR m.project_id IS NULL) ${req.query.project_id ? 'AND m.project_id=' + Number(req.query.project_id) : ''} ORDER BY m.starts_at DESC LIMIT 200`)
    .map(m => ({ ...m, attendees: parse(m.attendees, []) }))
    .filter(m => !A.isContractor(req.user) || m.attendees.includes(req.user.id));
}));
r.get('/meetings/:id', h((req) => {
  const m = get('SELECT m.*, p.name project_name FROM meetings m LEFT JOIN projects p ON p.id=m.project_id WHERE m.id=?', req.params.id) || A.notFound();
  if (m.project_id) A.assertProject(req.user, m.project_id);
  m.attendees = parse(m.attendees, []);
  if (A.isContractor(req.user) && !m.attendees.includes(req.user.id)) A.deny();
  m.attendee_names = m.attendees.map(id => ({ id, name: userName(id) }));
  m.actions = all("SELECT t.id, t.title, t.status, t.due_date, u.name assignee_name FROM tasks t LEFT JOIN users u ON u.id=t.assignee_id WHERE source=?", 'meeting:' + m.id);
  m.video_configured = !!(setting('integrations', {}).video || {}).enabled;
  return m;
}));
r.post('/meetings', A.requireCap('meetings.manage'), h((req) => {
  const b = req.body;
  if (!b.title || !b.starts_at) A.bad('Title and date/time are required');
  const pid = b.project_id ? A.assertProject(req.user, b.project_id) : null;
  if (b.video_link && !/^https:\/\//.test(b.video_link)) A.bad('Video link must start with https://');
  const att = [...new Set([...(b.attendees || []).map(Number), req.user.id])];
  const id = insert('meetings', { project_id: pid, title: b.title, starts_at: b.starts_at, location: b.location, video_link: b.video_link, agenda: b.agenda, attendees: JSON.stringify(att), created_by: req.user.id });
  notify(att.filter(x => x !== req.user.id), { type: 'meeting', title: 'Meeting: ' + b.title, body: `${b.starts_at.replace('T', ' ')} · ${b.location || b.video_link || ''}`, link: `#/meetings/${id}` });
  return { id };
}));
r.put('/meetings/:id', A.requireCap('meetings.manage'), h((req) => {
  const m = get('SELECT * FROM meetings WHERE id=?', req.params.id) || A.notFound();
  if (m.project_id) A.assertProject(req.user, m.project_id);
  const b = req.body;
  if (b.video_link && !/^https:\/\//.test(b.video_link)) A.bad('Video link must start with https://');
  update('meetings', m.id, { title: b.title, starts_at: b.starts_at, location: b.location, video_link: b.video_link, agenda: b.agenda, minutes: b.minutes, attendees: b.attendees ? JSON.stringify(b.attendees) : undefined });
  if (b.minutes && b.minutes !== m.minutes) notify(parse(m.attendees, []).filter(x => x !== req.user.id), { type: 'meeting', title: 'Minutes published: ' + m.title, link: `#/meetings/${m.id}` });
  return { ok: true };
}));
r.post('/meetings/:id/actions', A.requireCap('meetings.manage'), h((req) => {
  const m = get('SELECT * FROM meetings WHERE id=?', req.params.id) || A.notFound();
  if (!m.project_id) A.bad('Link the meeting to a project to create action tasks');
  A.assertProject(req.user, m.project_id);
  const b = req.body;
  if (!b.title || !b.assignee_id) A.bad('Action title and responsible person are required');
  const id = insert('tasks', { project_id: m.project_id, title: b.title, description: `Action item from meeting "${m.title}"`, assignee_id: b.assignee_id, due_date: b.due_date, priority: b.priority || 'medium', reviewer_id: req.user.id, created_by: req.user.id, source: 'meeting:' + m.id });
  insert('task_history', { task_id: id, user_id: req.user.id, to_status: 'open', note: 'Created from meeting' });
  notify(b.assignee_id, { type: 'task_assigned', title: 'Meeting action assigned: ' + b.title, body: `Due ${b.due_date || '—'}`, link: `#/tasks/${id}` });
  return { id };
}));

// ---------- notifications ----------
r.get('/notifications', h((req) => ({
  items: all('SELECT * FROM notifications WHERE user_id=? ORDER BY id DESC LIMIT 100', req.user.id),
  unread: get('SELECT count(*) n FROM notifications WHERE user_id=? AND read=0', req.user.id).n,
})));
r.get('/notifications/count', h((req) => ({
  unread: get('SELECT count(*) n FROM notifications WHERE user_id=? AND read=0', req.user.id).n,
  chats: get(`SELECT count(*) n FROM messages m JOIN chat_members cm ON cm.chat_id=m.chat_id AND cm.user_id=? WHERE m.id>cm.last_read AND m.user_id<>?`, req.user.id, req.user.id).n,
})));
r.post('/notifications/read', h((req) => {
  if (req.body.id) run('UPDATE notifications SET read=1 WHERE id=? AND user_id=?', req.body.id, req.user.id);
  else run('UPDATE notifications SET read=1 WHERE user_id=?', req.user.id);
  return { ok: true };
}));

module.exports = { router: r };
