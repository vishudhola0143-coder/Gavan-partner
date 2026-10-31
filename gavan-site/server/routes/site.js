// Morning / evening site reports, labour attendance, daily & weekly planning
const express = require('express');
const { all, get, run, insert, update, tx } = require('../db');
const A = require('../auth');
const { h, parse, today, nowIST, locationPath, userName, projectUsersByRole } = require('../util');
const { notify } = require('../notify');

const r = express.Router();

function reportingTargets(projectId, user) {
  const lines = all(`SELECT to_user_id FROM reporting_lines WHERE (project_id IS NULL OR project_id=?) AND
    ((from_user_id=?) OR (from_user_id IS NULL AND (from_role=? OR from_role IS NULL) AND (department IS NULL OR department=?)))`, projectId, user.id, user.role, user.department || '');
  const ids = lines.map(l => l.to_user_id);
  return ids.length ? ids : projectUsersByRole(projectId, ['project_manager', 'site_engineer']);
}

function decorate(rep) {
  rep.data = parse(rep.data, {});
  rep.location = locationPath(rep.location_id);
  rep.submitted_by_name = userName(rep.submitted_by);
  rep.contractor_name = rep.contractor_id ? (get('SELECT name FROM contractors WHERE id=?', rep.contractor_id) || {}).name : null;
  return rep;
}

// apply side effects of an evening report: work item quantities, stock consumption, attendance
function applyEvening(rep, data, sign) {
  for (const w of data.work || []) {
    if (w.work_item_id && Number(w.actual_qty)) run('UPDATE work_items SET done_qty = max(0, coalesce(done_qty,0) + ?) WHERE id=? AND project_id=?', sign * Number(w.actual_qty), w.work_item_id, rep.project_id);
  }
  if (sign > 0) {
    for (const m of data.materials_consumed || []) {
      if (m.name && Number(m.qty)) insert('stock_ledger', { project_id: rep.project_id, material: m.name.trim(), unit: m.unit, kind: 'consumption', qty: -Math.abs(Number(m.qty)), ref: 'report:' + rep.id, note: 'Evening report', user_id: rep.submitted_by, is_sample: rep.is_sample });
    }
    (data.labour || []).forEach((l, i) => {
      if (!l.trade) return;
      insert('attendance', { client_uuid: `rep-${rep.id}-${i}`, project_id: rep.project_id, att_date: rep.report_date, contractor_id: l.contractor_id || rep.contractor_id, trade: l.trade,
        location_id: rep.location_id, planned: Number(l.planned) || 0, skilled: Number(l.skilled) || 0, unskilled: Number(l.unskilled) || 0, hours: Number(l.hours) || 8, overtime: Number(l.overtime) || 0,
        recorded_by: rep.submitted_by, is_sample: rep.is_sample });
    });
  } else {
    run("DELETE FROM stock_ledger WHERE ref=?", 'report:' + rep.id);
    run("DELETE FROM attendance WHERE client_uuid LIKE ?", `rep-${rep.id}-%`);
  }
}

r.get('/reports', A.requireCap('reports.view'), h((req) => {
  const q = req.query;
  const where = [A.scopeSql(req.user, 'r')];
  const p = [];
  if (q.project_id) { where.push('r.project_id=?'); p.push(q.project_id); }
  if (q.kind) { where.push('r.kind=?'); p.push(q.kind); }
  if (q.from) { where.push('r.report_date>=?'); p.push(q.from); }
  if (q.to) { where.push('r.report_date<=?'); p.push(q.to); }
  if (q.contractor_id) { where.push('r.contractor_id=?'); p.push(q.contractor_id); }
  if (q.user_id) { where.push('r.submitted_by=?'); p.push(q.user_id); }
  if (q.location_id) { where.push('r.location_id=?'); p.push(q.location_id); }
  return all(`SELECT r.*, p.name project_name FROM daily_reports r JOIN projects p ON p.id=r.project_id WHERE ${where.join(' AND ')} ORDER BY r.report_date DESC, r.id DESC LIMIT 300`, ...p).map(decorate);
}));
// supervisors may always see their own reports
r.get('/reports/mine', h((req) => all(`SELECT r.*, p.name project_name FROM daily_reports r JOIN projects p ON p.id=r.project_id WHERE submitted_by=? ORDER BY r.id DESC LIMIT 60`, req.user.id).map(decorate)));
r.get('/reports/:id', h((req) => {
  const rep = get('SELECT r.*, p.name project_name FROM daily_reports r JOIN projects p ON p.id=r.project_id WHERE r.id=?', req.params.id) || A.notFound();
  A.assertProject(req.user, rep.project_id);
  if (!A.can(req.user, 'reports.view') && rep.submitted_by !== req.user.id) A.deny();
  decorate(rep);
  rep.edits = all('SELECT e.*, u.name editor FROM report_edits e LEFT JOIN users u ON u.id=e.edited_by WHERE report_id=? ORDER BY e.id DESC', rep.id).map(e => ({ ...e, before_data: parse(e.before_data), after_data: parse(e.after_data) }));
  rep.photos = all("SELECT id,name,captured_at,uploaded_at,gps_lat,gps_lng,gps_accuracy,captured_offline,kind FROM files WHERE entity='daily_report' AND entity_id=?", rep.id);
  if (rep.kind === 'morning') rep.evening = get("SELECT id FROM daily_reports WHERE morning_id=?", rep.id);
  return rep;
}));
// pending morning plans for linking evening reports
r.get('/reports-open-mornings', A.requireCap('reports.submit'), h((req) => {
  const pid = A.assertProject(req.user, req.query.project_id);
  return all(`SELECT r.* FROM daily_reports r WHERE r.project_id=? AND r.kind='morning' AND r.report_date>=date(?, '-2 day')
    AND NOT EXISTS (SELECT 1 FROM daily_reports e WHERE e.morning_id=r.id) ORDER BY r.report_date DESC`, pid, req.query.date || today()).map(decorate);
}));

r.post('/reports', A.requireCap('reports.submit'), h((req) => {
  const b = req.body;
  if (!['morning', 'evening'].includes(b.kind)) A.bad('Report type must be morning or evening');
  const pid = A.assertProject(req.user, b.project_id);
  if (b.client_uuid) { const ex = get('SELECT id FROM daily_reports WHERE client_uuid=?', b.client_uuid); if (ex) return { id: ex.id, duplicate: true }; }
  const date = b.report_date || today();
  const dup = get(`SELECT id FROM daily_reports WHERE project_id=? AND kind=? AND report_date=? AND submitted_by=? AND coalesce(location_id,0)=? AND coalesce(contractor_id,0)=?`,
    pid, b.kind, date, req.user.id, Number(b.location_id) || 0, Number(b.contractor_id) || 0);
  if (dup) throw new A.HttpError(409, `You already submitted a ${b.kind} report for this location/contractor today (#${dup.id}). Open it to edit instead.`);
  const data = b.data || {};
  if (b.kind === 'morning' && !(data.planned_work || []).length) A.bad('Add at least one planned work item');
  if (b.kind === 'evening' && !(data.work || []).length) A.bad('Add at least one work progress line');
  let morning = null;
  if (b.morning_id) { morning = get("SELECT * FROM daily_reports WHERE id=? AND kind='morning' AND project_id=?", b.morning_id, pid) || A.bad('Linked morning report not found'); }
  const id = tx(() => {
    const id = insert('daily_reports', { client_uuid: b.client_uuid, kind: b.kind, project_id: pid, location_id: b.location_id || (morning && morning.location_id), contractor_id: b.contractor_id || (morning && morning.contractor_id),
      report_date: date, report_time: b.report_time || nowIST(), morning_id: morning ? morning.id : null, data: JSON.stringify(data), submitted_by: req.user.id, captured_offline: b.captured_offline ? 1 : 0 });
    if (b.kind === 'evening') applyEvening(get('SELECT * FROM daily_reports WHERE id=?', id), data, 1);
    return id;
  });
  (b.photo_ids || []).forEach(fid => run("UPDATE files SET entity='daily_report', entity_id=? WHERE id=? AND uploaded_by=?", id, fid, req.user.id));
  A.audit(req.user, 'submit', 'daily_report', id, { kind: b.kind });
  const targets = reportingTargets(pid, req.user).filter(x => x !== req.user.id);
  const pname = get('SELECT name FROM projects WHERE id=?', pid).name;
  notify(targets, { type: 'general', title: `${b.kind === 'morning' ? 'Morning' : 'Evening'} report — ${pname}`, body: `${req.user.name} submitted a report`, link: `#/reports/${id}` });
  if (b.kind === 'evening' && (data.work || []).some(w => w.delay_reason)) notify(targets, { type: 'escalation', title: `Delay reported — ${pname}`, body: (data.work.find(w => w.delay_reason) || {}).delay_reason, link: `#/reports/${id}` });
  const short = (data.materials || []).filter(m => Number(m.available) < Number(m.required));
  if (short.length) notify([...targets, ...projectUsersByRole(pid, ['purchase'])], { type: 'material_shortage', title: `Material shortage — ${pname}`, body: short.map(m => `${m.name}: need ${m.required}, have ${m.available || 0}`).join('; '), link: `#/reports/${id}` });
  return { id };
}));

r.put('/reports/:id', A.requireCap('reports.submit'), h((req) => {
  const rep = get('SELECT * FROM daily_reports WHERE id=?', req.params.id) || A.notFound();
  A.assertProject(req.user, rep.project_id);
  if (rep.submitted_by !== req.user.id && !A.can(req.user, 'tasks.review')) A.deny('Only the submitter or a reviewer can correct this report');
  if (Number(req.body.version) !== rep.version) throw new A.HttpError(409, 'This report was changed by someone else since you opened it. Reload to see the latest version, then re-apply your correction.');
  if (!req.body.reason) A.bad('Enter a reason for the correction');
  const data = req.body.data || {};
  tx(() => {
    if (rep.kind === 'evening') applyEvening(rep, parse(rep.data, {}), -1);
    insert('report_edits', { report_id: rep.id, edited_by: req.user.id, before_data: rep.data, after_data: JSON.stringify(data), reason: req.body.reason });
    run('UPDATE daily_reports SET data=?, version=version+1 WHERE id=?', JSON.stringify(data), rep.id);
    if (rep.kind === 'evening') applyEvening(rep, data, 1);
  });
  A.audit(req.user, 'correct', 'daily_report', rep.id, { reason: req.body.reason });
  return { ok: true };
}));

// ---------- labour attendance ----------
r.get('/attendance', A.requireCap('labour.record'), h((req) => {
  const q = req.query;
  const where = [A.scopeSql(req.user, 'a')]; const p = [];
  if (q.project_id) { where.push('a.project_id=?'); p.push(q.project_id); }
  if (q.from) { where.push('a.att_date>=?'); p.push(q.from); }
  if (q.to) { where.push('a.att_date<=?'); p.push(q.to); }
  if (q.contractor_id) { where.push('a.contractor_id=?'); p.push(q.contractor_id); }
  return all(`SELECT a.*, c.name contractor_name, p.name project_name FROM attendance a LEFT JOIN contractors c ON c.id=a.contractor_id JOIN projects p ON p.id=a.project_id WHERE ${where.join(' AND ')} ORDER BY a.att_date DESC, a.id DESC LIMIT 500`, ...p)
    .map(a => ({ ...a, location: locationPath(a.location_id) }));
}));
r.post('/attendance', A.requireCap('labour.record'), h((req) => {
  const rows = Array.isArray(req.body.rows) ? req.body.rows : [req.body];
  const ids = [];
  tx(() => rows.forEach(b => {
    const pid = A.assertProject(req.user, b.project_id);
    if (b.client_uuid) { const ex = get('SELECT id FROM attendance WHERE client_uuid=?', b.client_uuid); if (ex) { ids.push(ex.id); return; } }
    if (!b.trade) A.bad('Trade is required');
    ids.push(insert('attendance', { client_uuid: b.client_uuid, project_id: pid, att_date: b.att_date || today(), contractor_id: b.contractor_id || null, trade: b.trade, location_id: b.location_id || null,
      planned: +b.planned || 0, skilled: +b.skilled || 0, unskilled: +b.unskilled || 0, hours: b.hours === undefined || b.hours === '' ? 8 : +b.hours, overtime: +b.overtime || 0,
      qty_done: b.qty_done === '' ? null : b.qty_done, qty_unit: b.qty_unit, tomorrow_required: b.tomorrow_required === '' ? null : b.tomorrow_required, recorded_by: req.user.id }));
  }));
  A.audit(req.user, 'record', 'attendance', ids[0], { count: ids.length });
  return { ids };
}));
r.delete('/attendance/:id', A.requireCap('labour.record'), h((req) => {
  const a = get('SELECT * FROM attendance WHERE id=?', req.params.id) || A.notFound();
  A.assertProject(req.user, a.project_id);
  if (String(a.client_uuid || '').startsWith('rep-')) A.bad('This entry comes from an evening report — correct the report instead');
  run('DELETE FROM attendance WHERE id=?', a.id);
  A.audit(req.user, 'delete', 'attendance', a.id, a);
  return { ok: true };
}));

// ---------- planning ----------
r.get('/plans', A.requireCap('plans.manage'), h((req) => {
  const q = req.query;
  const where = [A.scopeSql(req.user, 'pl')]; const p = [];
  if (q.project_id) { where.push('pl.project_id=?'); p.push(q.project_id); }
  if (q.period) { where.push('pl.period=?'); p.push(q.period); }
  if (q.from) { where.push('pl.period_start>=?'); p.push(q.from); }
  if (q.to) { where.push('pl.period_start<=?'); p.push(q.to); }
  return all(`SELECT pl.*, u.name responsible_name, c.name contractor_name, p.name project_name FROM plans pl LEFT JOIN users u ON u.id=pl.responsible_id LEFT JOIN contractors c ON c.id=pl.contractor_id JOIN projects p ON p.id=pl.project_id
    WHERE ${where.join(' AND ')} ORDER BY pl.period_start DESC, pl.id LIMIT 500`, ...p).map(x => ({ ...x, location: locationPath(x.location_id) }));
}));
r.post('/plans', A.requireCap('plans.manage'), h((req) => {
  const b = req.body;
  const pid = A.assertProject(req.user, b.project_id);
  if (!b.title) A.bad('Target description is required');
  const id = insert('plans', { project_id: pid, period: b.period === 'daily' ? 'daily' : 'weekly', period_start: b.period_start || today(), title: b.title, location_id: b.location_id || null, contractor_id: b.contractor_id || null,
    target_qty: b.target_qty || null, unit: b.unit, responsible_id: b.responsible_id || null, deadline: b.deadline, created_by: req.user.id });
  if (b.responsible_id) notify(b.responsible_id, { type: 'task_assigned', title: 'New work target assigned', body: b.title, link: '#/plans' });
  return { id };
}));
r.put('/plans/:id', A.requireCap('plans.manage'), h((req) => {
  const pl = get('SELECT * FROM plans WHERE id=?', req.params.id) || A.notFound();
  A.assertProject(req.user, pl.project_id);
  const b = req.body;
  let status = b.status;
  if (b.actual_qty !== undefined && !status && pl.target_qty) {
    const a = Number(b.actual_qty);
    status = a >= pl.target_qty ? 'achieved' : a > 0 ? 'partial' : 'missed';
  }
  if ((status === 'partial' || status === 'missed') && !b.reason && !pl.reason) A.bad('Enter the reason the target was not achieved');
  update('plans', pl.id, { actual_qty: b.actual_qty, status, reason: b.reason, revised_date: b.revised_date, title: b.title, target_qty: b.target_qty, deadline: b.deadline, responsible_id: b.responsible_id });
  A.audit(req.user, 'update', 'plan', pl.id, b);
  if (status === 'missed' || status === 'partial') {
    notify(reportingTargets(pl.project_id, req.user), { type: 'target_missed', title: `Target ${status}: ${pl.title}`, body: b.reason || '', link: '#/plans' });
  }
  return { ok: true };
}));

module.exports = { router: r, reportingTargets };
