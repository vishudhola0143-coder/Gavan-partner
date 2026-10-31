// Management dashboard, consolidated summary, PDF / Excel reports
const express = require('express');
const path = require('path');
const fs = require('fs');
const { all, get, setting } = require('../db');
const A = require('../auth');
const { h, parse, today, nowIST, locationPath } = require('../util');
const { projectProgress } = require('./core');
const { stockSummary, contractorPerformance } = require('./materials');

const r = express.Router();

function scopeIds(req) {
  let ids = A.projectIds(req.user).filter(id => {
    const p = get('SELECT status, is_sample FROM projects WHERE id=?', id);
    return p && p.status !== 'archived';
  });
  if (req.query.project_id) ids = ids.filter(i => String(req.query.project_id).split(',').map(Number).includes(i));
  return ids;
}
const IN = (ids) => `(${ids.length ? ids.join(',') : 0})`;

function missingReports(ids, date) {
  const now = nowIST(); const isToday = date === today();
  const out = [];
  for (const pid of ids) {
    const p = get('SELECT * FROM projects WHERE id=?', pid);
    const supervisors = all("SELECT u.id,u.name FROM users u JOIN project_members pm ON pm.user_id=u.id WHERE pm.project_id=? AND u.role='supervisor' AND u.active=1", pid);
    if (!supervisors.length) continue;
    for (const kind of ['morning', 'evening']) {
      const deadline = kind === 'morning' ? p.morning_deadline : p.evening_deadline;
      if (isToday && now < deadline) continue;
      for (const s of supervisors) {
        if (!get('SELECT id FROM daily_reports WHERE project_id=? AND kind=? AND report_date=? AND submitted_by=?', pid, kind, date, s.id))
          out.push({ project_id: pid, project_name: p.name, kind, user_id: s.id, user_name: s.name, deadline });
      }
    }
  }
  return out;
}

r.get('/dashboard', A.requireCap('dashboard.view'), h((req) => {
  const ids = scopeIds(req); const S = IN(ids); const d = today();
  const in7 = new Date(Date.now() + 7 * 864e5 + 5.5 * 3600e3).toISOString().slice(0, 10);
  const projects = all(`SELECT id,name,type,is_sample FROM projects WHERE id IN ${S} ORDER BY is_sample, name`).map(p => ({ ...p, progress: projectProgress(p.id) }));
  const mornings = all(`SELECT * FROM daily_reports WHERE kind='morning' AND report_date=? AND project_id IN ${S}`, d);
  const evenings = all(`SELECT * FROM daily_reports WHERE kind='evening' AND report_date=? AND project_id IN ${S}`, d);
  const plannedToday = mornings.reduce((s, m) => s + (parse(m.data, {}).planned_work || []).length, 0);
  const completedToday = evenings.reduce((s, e) => s + (parse(e.data, {}).work || []).filter(w => Number(w.actual_qty) >= Number(w.planned_qty || 0) && Number(w.actual_qty) > 0).length, 0);
  const att = get(`SELECT coalesce(sum(skilled+unskilled),0) present, coalesce(sum(planned),0) planned, count(*) n FROM attendance WHERE att_date=? AND project_id IN ${S}`, d);
  const plannedLabour = mornings.reduce((s, m) => s + (parse(m.data, {}).labour || []).reduce((a, l) => a + (Number(l.count) || 0), 0), 0);
  const delays = all(`SELECT r.id, r.report_date, r.project_id, p.name project_name, r.data FROM daily_reports r JOIN projects p ON p.id=r.project_id WHERE r.kind='evening' AND r.report_date>=date(?, '-7 day') AND r.project_id IN ${S} ORDER BY r.report_date DESC`, d)
    .flatMap(r2 => (parse(r2.data, {}).work || []).filter(w => w.delay_reason).map(w => ({ report_id: r2.id, date: r2.report_date, project_name: r2.project_name, activity: w.description, reason: w.delay_reason })));
  const missedPlans = all(`SELECT pl.id, pl.title activity, pl.reason, pl.revised_date, p.name project_name, pl.deadline date FROM plans pl JOIN projects p ON p.id=pl.project_id WHERE pl.status IN ('missed','partial') AND pl.project_id IN ${S} ORDER BY pl.id DESC LIMIT 20`);
  const shortages = [
    ...all(`SELECT m.id, m.material, m.qty, m.unit, m.required_by, m.status, p.name project_name, 'request' src FROM material_requests m JOIN projects p ON p.id=m.project_id WHERE m.status IN ('requested','approved','ordered','partially_received') AND m.required_by<=date(?, '+2 day') AND m.project_id IN ${S}`, d),
    ...all(`SELECT po.request_id id, m.material, d.shortage_qty qty, m.unit, m.required_by, 'short delivery' status, p.name project_name, 'delivery' src FROM deliveries d JOIN purchase_orders po ON po.id=d.po_id JOIN material_requests m ON m.id=po.request_id JOIN projects p ON p.id=po.project_id
      WHERE d.id=(SELECT max(id) FROM deliveries WHERE po_id=po.id) AND d.shortage_qty>0 AND m.status<>'closed' AND po.project_id IN ${S}`),
    ...mornings.flatMap(m => (parse(m.data, {}).materials || []).filter(x => Number(x.available) < Number(x.required)).map(x => ({ id: m.id, material: x.name, qty: Number(x.required) - Number(x.available || 0), unit: x.unit, status: 'site shortage (morning report)', project_name: (get('SELECT name FROM projects WHERE id=?', m.project_id) || {}).name, src: 'report' }))),
  ];
  const contractors = all(`SELECT DISTINCT c.id, c.name, c.trade FROM contractors c JOIN project_contractors pc ON pc.contractor_id=c.id WHERE pc.project_id IN ${S}`)
    .map(c => ({ ...c, ...contractorPerformance(c.id, ids.join(',') || '0') }));
  const upcoming = [
    ...all(`SELECT 'task' type, t.id, t.title, t.due_date date, p.name project_name FROM tasks t JOIN projects p ON p.id=t.project_id WHERE t.due_date BETWEEN ? AND ? AND t.status NOT IN ('approved','closed') AND t.project_id IN ${S}`, d, in7),
    ...all(`SELECT 'drawing' type, d.id, d.title, d.required_by date, p.name project_name FROM drawing_requests d JOIN projects p ON p.id=d.project_id WHERE d.required_by BETWEEN ? AND ? AND d.status NOT IN ('approved','rejected') AND d.project_id IN ${S}`, d, in7),
    ...all(`SELECT 'material' type, m.id, m.material title, m.required_by date, p.name project_name FROM material_requests m JOIN projects p ON p.id=m.project_id WHERE m.required_by BETWEEN ? AND ? AND m.status NOT IN ('received','closed','rejected') AND m.project_id IN ${S}`, d, in7),
    ...all(`SELECT 'meeting' type, m.id, m.title, substr(m.starts_at,1,10) date, p.name project_name FROM meetings m LEFT JOIN projects p ON p.id=m.project_id WHERE substr(m.starts_at,1,10) BETWEEN ? AND ? AND (m.project_id IN ${S})`, d, in7),
  ].sort((a, b) => (a.date < b.date ? -1 : 1));
  const cnt = (sql, ...p) => get(sql, ...p).n;
  return {
    date: d, projects,
    cards: {
      planned_today: plannedToday, completed_today: completedToday, morning_reports: mornings.length, evening_reports: evenings.length,
      labour_present: att.present, labour_planned: att.planned || plannedLabour, labour_source: att.n ? 'attendance' : 'none recorded yet',
      overdue_tasks: cnt(`SELECT count(*) n FROM tasks WHERE due_date<? AND status NOT IN ('approved','closed') AND project_id IN ${S}`, d),
      pending_approvals: {
        tasks: cnt(`SELECT count(*) n FROM tasks WHERE status='submitted' AND project_id IN ${S}`),
        drawings: cnt(`SELECT count(*) n FROM drawing_revisions r JOIN drawings d ON d.id=r.drawing_id WHERE r.status='pending_approval' AND d.project_id IN ${S}`),
        materials: cnt(`SELECT count(*) n FROM material_requests WHERE status='requested' AND project_id IN ${S}`),
        inspections: cnt(`SELECT count(*) n FROM inspections WHERE status='awaiting_signoff' AND project_id IN ${S}`),
      },
      material_shortages: shortages.length,
      pending_drawing_requests: cnt(`SELECT count(*) n FROM drawing_requests WHERE status IN ('requested','forwarded','uploaded','revision_required') AND project_id IN ${S}`),
      quality_issues: cnt(`SELECT count(*) n FROM inspections WHERE status IN ('rework_required','reinspection_due') AND project_id IN ${S}`),
      delayed: delays.length + missedPlans.length,
    },
    shortages, delays, missedPlans, contractors, upcoming: upcoming.slice(0, 30),
    missingReports: missingReports(ids, d),
  };
}));

// Consolidated summary for coordinator (Anushka) and directors
r.get('/summary', A.requireCap('dashboard.view'), h((req) => {
  const ids = scopeIds(req); const S = IN(ids); const d = req.query.date || today();
  const perProject = ids.map(pid => {
    const p = get('SELECT id,name FROM projects WHERE id=?', pid);
    return { ...p, progress: projectProgress(pid).percent,
      reports: get(`SELECT sum(kind='morning') morning, sum(kind='evening') evening FROM daily_reports WHERE project_id=? AND report_date=?`, pid, d),
      overdue: get(`SELECT count(*) n FROM tasks WHERE project_id=? AND due_date<? AND status NOT IN ('approved','closed')`, pid, d).n,
      quality_open: get(`SELECT count(*) n FROM inspections WHERE project_id=? AND status IN ('rework_required','reinspection_due')`, pid).n,
      material_pending: get(`SELECT count(*) n FROM material_requests WHERE project_id=? AND status IN ('requested','approved','ordered','partially_received')`, pid).n,
      drawings_pending: get(`SELECT count(*) n FROM drawing_requests WHERE project_id=? AND status NOT IN ('approved','rejected')`, pid).n };
  });
  const decisions = [
    ...all(`SELECT 'Material approval' kind, m.id, m.material || ' — ' || m.qty || ' ' || coalesce(m.unit,'') title, p.name project_name, '#/materials/req/' || m.id link FROM material_requests m JOIN projects p ON p.id=m.project_id WHERE m.status='requested' AND m.project_id IN ${S}`),
    ...all(`SELECT 'Drawing approval' kind, r.id, d.number || ' Rev ' || r.revision title, p.name project_name, '#/drawings/' || d.id link FROM drawing_revisions r JOIN drawings d ON d.id=r.drawing_id JOIN projects p ON p.id=d.project_id WHERE r.status='pending_approval' AND d.project_id IN ${S}`),
    ...all(`SELECT 'Inspection sign-off' kind, i.id, i.work_type title, p.name project_name, '#/quality/' || i.id link FROM inspections i JOIN projects p ON p.id=i.project_id WHERE i.status='awaiting_signoff' AND i.project_id IN ${S}`),
    ...all(`SELECT 'Task review' kind, t.id, t.title, p.name project_name, '#/tasks/' || t.id link FROM tasks t JOIN projects p ON p.id=t.project_id WHERE t.status='submitted' AND t.project_id IN ${S}`),
  ];
  const escalations = all(`SELECT n.title, n.body, n.created_at, n.link FROM notifications n WHERE n.user_id=? AND n.type IN ('escalation','report_missing','task_overdue','target_missed','inspection_failed','material_shortage') ORDER BY n.id DESC LIMIT 30`, req.user.id);
  const lines = all(`SELECT rl.*, u.name to_name, f.name from_name, p.name project_name FROM reporting_lines rl LEFT JOIN users u ON u.id=rl.to_user_id LEFT JOIN users f ON f.id=rl.from_user_id LEFT JOIN projects p ON p.id=rl.project_id`);
  return { date: d, perProject, missingReports: missingReports(ids, d), decisions, escalations, reportingLines: lines };
}));

// ---------------------------------------------------------------- REPORTS
const REPORTS = {
  daily_progress: { title: 'Daily Site Progress Report', cap: 'reports.view' },
  labour: { title: 'Labour Attendance Report', cap: 'labour.record' },
  weekly_plan: { title: 'Weekly Planned vs Actual Work', cap: 'plans.manage' },
  contractor_performance: { title: 'Contractor Performance Report', cap: 'dashboard.view' },
  stock: { title: 'Material Stock & Consumption Report', cap: 'materials.request' },
  pending_purchase: { title: 'Pending Purchase Requests', cap: 'materials.request', alt: ['purchase.manage', 'accounts.review'] },
  drawing_requests: { title: 'Drawing Requests Report', cap: 'drawings.request', alt: ['drawings.upload', 'drawings.approve'] },
  quality: { title: 'Quality Inspections & Rework Report', cap: 'inspections.create', alt: ['inspections.signoff'] },
  overdue_tasks: { title: 'Overdue Tasks Report', cap: 'tasks.create', alt: ['tasks.review'] },
  project_progress: { title: 'Project Progress Report', cap: 'dashboard.view' },
  management_summary: { title: 'Management Summary', cap: 'dashboard.view' },
};
function buildReport(req, type) {
  const def = REPORTS[type] || A.notFound('Unknown report');
  if (!A.can(req.user, def.cap) && !(def.alt || []).some(c => A.can(req.user, c))) A.deny('You cannot generate this report');
  const q = req.query; const ids = scopeIds(req); const S = IN(ids);
  const from = q.from || new Date(Date.now() - 6 * 864e5).toISOString().slice(0, 10); const to = q.to || today();
  const f = { from, to };
  const extra = (alias, cols) => {
    const w = []; const p = [];
    if (q.contractor_id && cols.includes('contractor')) { w.push(`${alias}.contractor_id=?`); p.push(q.contractor_id); }
    if (q.user_id && cols.includes('user')) { w.push(`${alias}.${cols.includes('assignee') ? 'assignee_id' : 'submitted_by'}=?`); p.push(q.user_id); }
    if (q.location_id && cols.includes('location')) { w.push(`${alias}.location_id=?`); p.push(q.location_id); }
    if (q.status && cols.includes('status')) { w.push(`${alias}.status=?`); p.push(q.status); }
    return { sql: w.length ? ' AND ' + w.join(' AND ') : '', p };
  };
  let columns, rows, summary = [];
  switch (type) {
    case 'daily_progress': {
      const e = extra('r', ['contractor', 'user', 'location']);
      const reps = all(`SELECT r.*, p.name project_name, u.name by_name, c.name contractor_name FROM daily_reports r JOIN projects p ON p.id=r.project_id LEFT JOIN users u ON u.id=r.submitted_by LEFT JOIN contractors c ON c.id=r.contractor_id
        WHERE r.project_id IN ${S} AND r.report_date BETWEEN ? AND ? ${e.sql} ORDER BY r.report_date, p.name, r.kind DESC`, from, to, ...e.p);
      columns = [['report_date', 'Date', 60], ['project_name', 'Project', 80], ['kind', 'Type', 45], ['location', 'Location', 80], ['contractor_name', 'Contractor', 70], ['activity', 'Activity', 120], ['planned', 'Planned', 50], ['actual', 'Actual', 50], ['unit', 'Unit', 35], ['labour', 'Labour', 40], ['notes', 'Delay / Notes', 120], ['by_name', 'By', 60]];
      rows = reps.flatMap(rp => {
        const dd = parse(rp.data, {});
        const lab = (dd.labour || []).reduce((s, l) => s + (Number(l.count) || 0) + (Number(l.skilled) || 0) + (Number(l.unskilled) || 0), 0);
        const lines = rp.kind === 'morning' ? (dd.planned_work || []).map(w => ({ activity: w.description, planned: w.qty, unit: w.unit, notes: dd.problems }))
          : (dd.work || []).map(w => ({ activity: w.description, planned: w.planned_qty, actual: w.actual_qty, unit: w.unit, notes: [w.delay_reason, w.pending].filter(Boolean).join(' | ') }));
        return (lines.length ? lines : [{}]).map((l, i) => ({ report_date: rp.report_date, project_name: rp.project_name, kind: rp.kind, location: locationPath(rp.location_id), contractor_name: rp.contractor_name, by_name: rp.by_name, labour: i === 0 ? lab : '', ...l }));
      });
      summary = [['Reports', reps.length], ['Morning', reps.filter(x => x.kind === 'morning').length], ['Evening', reps.filter(x => x.kind === 'evening').length]];
      break;
    }
    case 'labour': {
      const e = extra('a', ['contractor', 'location']);
      columns = [['att_date', 'Date', 60], ['project_name', 'Project', 90], ['contractor_name', 'Contractor', 90], ['trade', 'Trade', 70], ['location', 'Location', 90], ['planned', 'Planned', 45], ['skilled', 'Skilled', 45], ['unskilled', 'Unskilled', 50], ['total', 'Total', 40], ['hours', 'Hours', 40], ['overtime', 'OT', 35], ['qty_done', 'Qty done', 50]];
      rows = all(`SELECT a.*, p.name project_name, c.name contractor_name FROM attendance a JOIN projects p ON p.id=a.project_id LEFT JOIN contractors c ON c.id=a.contractor_id WHERE a.project_id IN ${S} AND a.att_date BETWEEN ? AND ? ${e.sql} ORDER BY a.att_date, p.name`, from, to, ...e.p)
        .map(a => ({ ...a, location: locationPath(a.location_id), total: a.skilled + a.unskilled, qty_done: a.qty_done != null ? `${a.qty_done} ${a.qty_unit || ''}` : '' }));
      const tot = rows.reduce((s, x) => s + x.total, 0), pl = rows.reduce((s, x) => s + x.planned, 0);
      summary = [['Total man-days', tot], ['Planned', pl], ['Attendance vs plan', pl ? Math.round(100 * tot / pl) + '%' : '—'], ['Overtime hrs', rows.reduce((s, x) => s + (x.overtime || 0), 0)]];
      break;
    }
    case 'weekly_plan': {
      const e = extra('pl', ['contractor', 'location', 'status']);
      columns = [['period_start', 'Period', 60], ['project_name', 'Project', 90], ['title', 'Target', 140], ['contractor_name', 'Contractor', 80], ['responsible_name', 'Responsible', 70], ['target', 'Target qty', 55], ['actual', 'Actual', 50], ['status', 'Status', 55], ['reason', 'Reason', 110], ['revised_date', 'Revised', 55]];
      rows = all(`SELECT pl.*, p.name project_name, u.name responsible_name, c.name contractor_name FROM plans pl JOIN projects p ON p.id=pl.project_id LEFT JOIN users u ON u.id=pl.responsible_id LEFT JOIN contractors c ON c.id=pl.contractor_id
        WHERE pl.project_id IN ${S} AND pl.period_start BETWEEN ? AND ? ${e.sql} ORDER BY pl.period_start, p.name`, from, to, ...e.p).map(x => ({ ...x, target: `${x.target_qty ?? ''} ${x.unit || ''}`, actual: `${x.actual_qty ?? ''} ${x.unit || ''}` }));
      ['achieved', 'partial', 'missed', 'planned'].forEach(s => summary.push([s, rows.filter(x => x.status === s).length]));
      break;
    }
    case 'contractor_performance': {
      columns = [['name', 'Contractor', 110], ['trade', 'Trade', 70], ['tasks_total', 'Tasks', 40], ['tasks_done', 'Done', 40], ['tasks_overdue', 'Overdue', 45], ['reworks', 'Reworks', 45], ['inspections', 'Inspections', 55], ['ftp', 'First-time pass', 65], ['targets', 'Targets', 45], ['tgt', 'Targets achieved', 70], ['mandays', 'Man-days', 50]];
      let cs = all(`SELECT DISTINCT c.* FROM contractors c JOIN project_contractors pc ON pc.contractor_id=c.id WHERE pc.project_id IN ${S}`);
      if (q.contractor_id) cs = cs.filter(c => c.id === Number(q.contractor_id));
      rows = cs.map(c => { const p = contractorPerformance(c.id, ids.join(',') || '0'); return { ...c, ...p, ftp: p.first_time_pass_pct == null ? '—' : p.first_time_pass_pct + '%', tgt: p.targets_achieved_pct == null ? '—' : p.targets_achieved_pct + '%',
        mandays: get(`SELECT coalesce(sum(skilled+unskilled),0) n FROM attendance WHERE contractor_id=? AND project_id IN ${S} AND att_date BETWEEN ? AND ?`, c.id, from, to).n }; });
      break;
    }
    case 'stock': {
      columns = [['project_name', 'Project', 100], ['material', 'Material', 110], ['unit', 'Unit', 40], ['opening', 'Opening', 50], ['receipts', 'Receipts', 50], ['transfer_in', 'Transfer in', 55], ['consumption', 'Consumed', 55], ['transfer_out', 'Transfer out', 60], ['wastage', 'Wastage', 50], ['adjustment', 'Adj.', 40], ['closing', 'Closing', 50]];
      rows = ids.flatMap(pid => { const pn = get('SELECT name FROM projects WHERE id=?', pid).name; return stockSummary(pid).map(s => ({ ...s, project_name: pn })); });
      summary = [['Note', 'Stock is the running balance to date (all dates)']];
      break;
    }
    case 'pending_purchase': {
      columns = [['created', 'Requested', 60], ['project_name', 'Project', 90], ['material', 'Material', 100], ['specification', 'Spec', 80], ['qty', 'Qty', 40], ['unit', 'Unit', 35], ['required_by', 'Required by', 60], ['status', 'Status', 70], ['ordered', 'Ordered', 45], ['received', 'Accepted', 45], ['supplier', 'Supplier', 80], ['requested_by', 'Requested by', 70]];
      rows = all(`SELECT m.*, p.name project_name, u.name requested_by, date(m.created_at) created,
        (SELECT coalesce(sum(qty),0) FROM purchase_orders WHERE request_id=m.id) ordered,
        (SELECT coalesce(sum(d.accepted_qty),0) FROM deliveries d JOIN purchase_orders po ON po.id=d.po_id WHERE po.request_id=m.id) received,
        (SELECT group_concat(supplier, ', ') FROM purchase_orders WHERE request_id=m.id) supplier
        FROM material_requests m JOIN projects p ON p.id=m.project_id LEFT JOIN users u ON u.id=m.requested_by WHERE m.project_id IN ${S} AND m.status NOT IN ('closed','rejected') ORDER BY m.required_by`);
      break;
    }
    case 'drawing_requests': {
      const e = extra('d', ['status', 'location', 'contractor']);
      columns = [['created', 'Raised', 60], ['project_name', 'Project', 90], ['title', 'Drawing required', 130], ['category', 'Category', 65], ['location', 'Location', 90], ['required_by', 'Required by', 60], ['priority', 'Priority', 45], ['status', 'Status', 70], ['consultant', 'Consultant', 80], ['requested', 'Requested by', 75]];
      rows = all(`SELECT d.*, date(d.created_at) created, p.name project_name, u.name consultant, v.name requested FROM drawing_requests d JOIN projects p ON p.id=d.project_id LEFT JOIN users u ON u.id=d.consultant_id LEFT JOIN users v ON v.id=d.requested_by
        WHERE ${A.scopeSql(req.user, 'd')} AND d.project_id IN ${S} AND date(d.created_at) BETWEEN ? AND ? ${e.sql} ORDER BY d.created_at`, from, to, ...e.p).map(x => ({ ...x, location: locationPath(x.location_id) }));
      break;
    }
    case 'quality': {
      const e = extra('i', ['contractor', 'location', 'status']);
      columns = [['created', 'Date', 60], ['project_name', 'Project', 90], ['work_type', 'Work', 80], ['location', 'Location', 90], ['contractor_name', 'Contractor', 80], ['inspector', 'Inspector', 70], ['result', 'Result', 45], ['status', 'Status', 75], ['correction_deadline', 'Correct by', 60], ['reinspection_result', 'Reinspection', 60], ['signed', 'Signed off', 80]];
      rows = all(`SELECT i.*, date(i.created_at) created, p.name project_name, c.name contractor_name, u.name inspector, s.name || ' ' || coalesce(substr(i.signed_off_at,1,10),'') signed FROM inspections i JOIN projects p ON p.id=i.project_id LEFT JOIN contractors c ON c.id=i.contractor_id LEFT JOIN users u ON u.id=i.inspector_id LEFT JOIN users s ON s.id=i.signed_off_by
        WHERE i.project_id IN ${S} AND date(i.created_at) BETWEEN ? AND ? ${e.sql} ORDER BY i.created_at`, from, to, ...e.p).map(x => ({ ...x, location: locationPath(x.location_id) }));
      summary = [['Inspections', rows.length], ['Pass', rows.filter(x => x.result === 'pass').length], ['Fail/Rework', rows.filter(x => x.result !== 'pass').length], ['Open issues', rows.filter(x => ['rework_required', 'reinspection_due'].includes(x.status)).length]];
      break;
    }
    case 'overdue_tasks': {
      const e = extra('t', ['contractor', 'location', 'user', 'assignee']);
      columns = [['due_date', 'Due', 60], ['days', 'Days late', 45], ['project_name', 'Project', 90], ['title', 'Task', 140], ['location', 'Location', 90], ['assignee', 'Responsible', 75], ['contractor_name', 'Contractor', 75], ['priority', 'Priority', 45], ['status', 'Status', 65]];
      rows = all(`SELECT t.*, p.name project_name, u.name assignee, c.name contractor_name, CAST(julianday(?) - julianday(t.due_date) AS INT) days FROM tasks t JOIN projects p ON p.id=t.project_id LEFT JOIN users u ON u.id=t.assignee_id LEFT JOIN contractors c ON c.id=t.contractor_id
        WHERE ${A.scopeSql(req.user, 't')} AND t.project_id IN ${S} AND t.due_date<? AND t.status NOT IN ('approved','closed') ${e.sql} ORDER BY t.due_date`, today(), today(), ...e.p).map(x => ({ ...x, location: locationPath(x.location_id) }));
      f.from = null; f.to = today();
      break;
    }
    case 'project_progress': {
      columns = [['project_name', 'Project', 110], ['work_item', 'Work item', 140], ['location', 'Location', 90], ['unit', 'Unit', 40], ['planned_qty', 'Planned', 55], ['done_qty', 'Done', 55], ['pct', '% done', 45], ['weight', 'Weight', 45]];
      rows = all(`SELECT w.*, w.name work_item, p.name project_name FROM work_items w JOIN projects p ON p.id=w.project_id WHERE w.project_id IN ${S} ORDER BY p.name, w.id`)
        .map(w => ({ ...w, location: locationPath(w.location_id), pct: w.planned_qty ? Math.min(100, Math.round(100 * w.done_qty / w.planned_qty)) + '%' : '—' }));
      summary = ids.map(pid => [get('SELECT name FROM projects WHERE id=?', pid).name, (projectProgress(pid).percent ?? '—') + (projectProgress(pid).percent != null ? '%' : '')]);
      summary.push(['Method', 'Σ(weight × min(done/planned,1)) ÷ Σ weight']);
      f.from = null; f.to = today();
      break;
    }
    case 'management_summary': {
      columns = [['project_name', 'Project', 120], ['progress', 'Progress', 50], ['reports', 'Reports (period)', 60], ['labour', 'Man-days', 50], ['tasks_done', 'Tasks done', 50], ['overdue', 'Overdue tasks', 55], ['quality_open', 'Open quality issues', 70], ['material_pending', 'Material pending', 65], ['drawings_pending', 'Drawings pending', 65], ['missed', 'Targets missed', 60]];
      rows = ids.map(pid => ({
        project_name: get('SELECT name FROM projects WHERE id=?', pid).name,
        progress: projectProgress(pid).percent != null ? projectProgress(pid).percent + '%' : '—',
        reports: get('SELECT count(*) n FROM daily_reports WHERE project_id=? AND report_date BETWEEN ? AND ?', pid, from, to).n,
        labour: get('SELECT coalesce(sum(skilled+unskilled),0) n FROM attendance WHERE project_id=? AND att_date BETWEEN ? AND ?', pid, from, to).n,
        tasks_done: get("SELECT count(DISTINCT task_id) n FROM task_history th JOIN tasks t ON t.id=th.task_id WHERE t.project_id=? AND th.to_status='approved' AND date(th.at) BETWEEN ? AND ?", pid, from, to).n,
        overdue: get("SELECT count(*) n FROM tasks WHERE project_id=? AND due_date<? AND status NOT IN ('approved','closed')", pid, today()).n,
        quality_open: get("SELECT count(*) n FROM inspections WHERE project_id=? AND status IN ('rework_required','reinspection_due')", pid).n,
        material_pending: get("SELECT count(*) n FROM material_requests WHERE project_id=? AND status IN ('requested','approved','ordered','partially_received')", pid).n,
        drawings_pending: get("SELECT count(*) n FROM drawing_requests WHERE project_id=? AND status NOT IN ('approved','rejected')", pid).n,
        missed: get("SELECT count(*) n FROM plans WHERE project_id=? AND status IN ('missed','partial') AND period_start BETWEEN ? AND ?", pid, from, to).n,
      }));
      summary = [['Missing reports today', missingReports(ids, today()).length]];
      break;
    }
  }
  const projNames = ids.length === A.projectIds(req.user).length && !req.query.project_id ? 'All authorised projects' : ids.map(i => get('SELECT name FROM projects WHERE id=?', i).name).join(', ');
  return { type, title: def.title, columns: columns.map(([key, label, w]) => ({ key, label, w })), rows, summary, meta: { projects: projNames || '—', from: f.from, to: f.to, preparedBy: `${req.user.name} (${A.ROLES[req.user.role]})`, generatedAt: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }), company: setting('company_name', 'GAVAN GROUP'),
    sample: ids.some(i => (get('SELECT is_sample FROM projects WHERE id=?', i) || {}).is_sample) } };
}

r.get('/report-types', h((req) => Object.entries(REPORTS).filter(([, d]) => A.can(req.user, d.cap) || (d.alt || []).some(c => A.can(req.user, c))).map(([k, d]) => ({ key: k, title: d.title }))));
r.get('/reports-data/:type', h((req) => buildReport(req, req.params.type)));

r.get('/reports-export/:type.:fmt', h(async (req, res) => {
  if (!A.can(req.user, 'exports')) A.deny('You do not have download permission');
  const rep = buildReport(req, req.params.type);
  A.audit(req.user, 'export:' + req.params.fmt, 'report', null, { type: rep.type, query: req.query });
  const fname = `GAVAN-${rep.type}-${today()}`;
  if (req.params.fmt === 'xlsx') return excel(rep, res, fname);
  if (req.params.fmt === 'pdf') return pdf(rep, res, fname);
  A.bad('Unknown format');
}));

async function excel(rep, res, fname) {
  const ExcelJS = require('exceljs');
  const wb = new ExcelJS.Workbook(); wb.creator = 'GAVAN SITE';
  const ws = wb.addWorksheet(rep.title.slice(0, 30));
  const logo = path.join(__dirname, '..', '..', 'public', 'icon-192.png');
  if (fs.existsSync(logo)) { const id = wb.addImage({ filename: logo, extension: 'png' }); ws.addImage(id, { tl: { col: 0, row: 0 }, ext: { width: 56, height: 56 } }); }
  ws.getCell('B1').value = rep.meta.company; ws.getCell('B1').font = { bold: true, size: 14, color: { argb: 'FF173D32' } };
  ws.getCell('B2').value = rep.title + (rep.meta.sample ? '  [INCLUDES SAMPLE DATA]' : ''); ws.getCell('B2').font = { bold: true, size: 12 };
  ws.getCell('B3').value = `Project(s): ${rep.meta.projects}   Period: ${rep.meta.from || '—'} to ${rep.meta.to || '—'}   Prepared by: ${rep.meta.preparedBy}   Generated: ${rep.meta.generatedAt}`;
  let row = 5;
  if (rep.summary.length) { rep.summary.forEach(([k, v]) => { ws.getCell(row, 1).value = k; ws.getCell(row, 1).font = { bold: true }; ws.getCell(row, 2).value = v; row++; }); row++; }
  const hdr = ws.getRow(row);
  rep.columns.forEach((c, i) => { const cell = hdr.getCell(i + 1); cell.value = c.label; cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF173D32' } }; ws.getColumn(i + 1).width = Math.max(10, Math.round(c.w / 5.5)); });
  rep.rows.forEach(rw => { row++; rep.columns.forEach((c, i) => { const v = rw[c.key]; ws.getCell(row, i + 1).value = v === undefined ? null : v; ws.getCell(row, i + 1).alignment = { wrapText: true, vertical: 'top' }; }); });
  if (!rep.rows.length) ws.getCell(row + 1, 1).value = 'No records for the selected filters.';
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${fname}.xlsx"`);
  await wb.xlsx.write(res); res.end();
}

const FONTS = path.join(__dirname, '..', 'fonts');
function runs(str) { // split text into script runs so Gujarati / Hindi render with a proper font
  const out = []; let cur = null;
  for (const ch of String(str)) {
    const c = ch.codePointAt(0);
    const f = c >= 0x0A80 && c <= 0x0AFF ? 'gu' : c >= 0x0900 && c <= 0x097F ? 'hi' : 'la';
    if (!cur || (cur.f !== f && !(ch === ' '))) { cur = { f, t: '' }; out.push(cur); }
    cur.t += ch;
  }
  return out;
}
function pdf(rep, res, fname) {
  const PDFDocument = require('pdfkit');
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 28, bufferPages: true });
  doc.registerFont('la', path.join(FONTS, 'DejaVuSans.ttf')); doc.registerFont('la-b', path.join(FONTS, 'DejaVuSans-Bold.ttf'));
  doc.registerFont('gu', path.join(FONTS, 'noto-sans-gujarati-gujarati-400-normal.woff')); doc.registerFont('gu-b', path.join(FONTS, 'noto-sans-gujarati-gujarati-700-normal.woff'));
  doc.registerFont('hi', path.join(FONTS, 'noto-sans-devanagari-devanagari-400-normal.woff')); doc.registerFont('hi-b', path.join(FONTS, 'noto-sans-devanagari-devanagari-700-normal.woff'));
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${fname}.pdf"`);
  doc.pipe(res);
  const GREEN = '#173D32', GOLD = '#C9A55C', IVORY = '#F8F7F2';
  const W = doc.page.width - 56;
  const text = (s, x, y, opt = {}, bold = false, size = 8) => {
    const rr = runs(s == null ? '' : s);
    doc.fontSize(size);
    if (rr.length <= 1) { doc.font((rr[0] ? rr[0].f : 'la') + (bold ? '-b' : '')).text(s == null ? '' : String(s), x, y, opt); return; }
    rr.forEach((r2, i) => { doc.font(r2.f + (bold ? '-b' : '')).text(r2.t, i === 0 ? x : undefined, i === 0 ? y : undefined, { ...opt, continued: i < rr.length - 1 }); });
  };
  const heightOf = (s, w, size = 8) => { doc.fontSize(size).font('la'); const rr = runs(s == null ? '' : s); const f = rr.length && rr[0].f !== 'la' ? rr[0].f : 'la'; doc.font(f); return doc.heightOfString(s == null ? '' : String(s), { width: w }) * (rr.length > 1 ? 1.15 : 1); };
  function header() {
    doc.rect(0, 0, doc.page.width, 64).fill(GREEN);
    const logo = path.join(__dirname, '..', '..', 'public', 'icon-192.png');
    if (fs.existsSync(logo)) { doc.save().roundedRect(28, 10, 44, 44, 6).fill('#fff').restore(); doc.image(logo, 30, 12, { width: 40 }); }
    doc.fillColor(GOLD); text(rep.meta.company, 82, 14, {}, true, 13);
    doc.fillColor('#fff'); text(rep.title + (rep.meta.sample ? '   [INCLUDES SAMPLE DATA]' : ''), 82, 34, {}, true, 11);
    doc.fillColor(GREEN);
    text(`Project(s): ${rep.meta.projects}`, 28, 72, { width: W }, false, 8);
    text(`Period: ${rep.meta.from || '—'} to ${rep.meta.to || '—'}     Prepared by: ${rep.meta.preparedBy}     Generated: ${rep.meta.generatedAt}`, 28, doc.y + 2, { width: W }, false, 8);
    doc.moveTo(28, doc.y + 4).lineTo(28 + W, doc.y + 4).strokeColor(GOLD).lineWidth(1).stroke();
    return doc.y + 10;
  }
  let y = header();
  if (rep.summary.length) {
    let x = 28;
    rep.summary.forEach(([k, v]) => {
      const label = `${k}: ${v}`; doc.font('la').fontSize(8); const w = Math.min(doc.widthOfString(label) + 16, W);
      if (x + w > 28 + W) { x = 28; y += 20; }
      doc.roundedRect(x, y, w, 16, 4).fill(IVORY); doc.fillColor(GREEN); text(label, x + 8, y + 4, {}, false, 8); x += w + 6;
    });
    y += 24;
  }
  const total = rep.columns.reduce((s, c) => s + c.w, 0);
  const cols = rep.columns.map(c => ({ ...c, w: (c.w / total) * W }));
  const drawHead = () => { doc.rect(28, y, W, 18).fill(GREEN); let x = 28; cols.forEach(c => { doc.fillColor('#fff'); text(c.label, x + 3, y + 5, { width: c.w - 6, lineBreak: false, ellipsis: true }, true, 7); x += c.w; }); y += 18; };
  drawHead();
  rep.rows.forEach((rw, idx) => {
    const hgt = Math.max(14, ...cols.map(c => heightOf(rw[c.key], c.w - 6, 7) + 6));
    if (y + hgt > doc.page.height - 36) { doc.addPage(); y = header(); drawHead(); }
    if (idx % 2) doc.rect(28, y, W, hgt).fill(IVORY);
    let x = 28; cols.forEach(c => { doc.fillColor('#222'); const v = rw[c.key]; text(v == null ? '' : v, x + 3, y + 3, { width: c.w - 6 }, false, 7); x += c.w; });
    y += hgt;
  });
  if (!rep.rows.length) { doc.fillColor('#666'); text('No records for the selected filters.', 28, y + 10, {}, false, 9); }
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) { doc.switchToPage(i); doc.page.margins.bottom = 0; doc.fillColor('#888'); text(`GAVAN SITE · Build Better. Manage Smarter.   Page ${i + 1} of ${range.count}`, 28, doc.page.height - 22, { width: W, align: 'right', lineBreak: false }, false, 7); }
  doc.end();
}

module.exports = { router: r, missingReports, scopeIds };
