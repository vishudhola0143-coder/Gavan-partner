// Reminders & escalations. Runs every 5 minutes; dedupe keys prevent repeated alerts.
const { all, get, setting } = require('./db');
const { notify } = require('./notify');
const { today, nowIST, projectUsersByRole } = require('./util');

function escalationTargets(projectId, roles) {
  const lines = all('SELECT to_user_id FROM reporting_lines WHERE project_id IS NULL OR project_id=?', projectId).map(l => l.to_user_id);
  return [...new Set([...projectUsersByRole(projectId, roles), ...lines])];
}

function tick() {
  const esc = setting('escalation', { overdue_hours: 24, report_grace_minutes: 30, escalate_to_roles: ['project_manager', 'director'] });
  const d = today(); const now = nowIST();
  const addMin = (hhmm, m) => { const [h, mi] = hhmm.split(':').map(Number); const t = h * 60 + mi + m; return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; };
  const projects = all("SELECT * FROM projects WHERE status='active'");

  for (const p of projects) {
    // 1. daily report reminders (at deadline) and escalation (after grace)
    const sups = all("SELECT u.id,u.name FROM users u JOIN project_members pm ON pm.user_id=u.id WHERE pm.project_id=? AND u.role='supervisor' AND u.active=1", p.id);
    for (const kind of ['morning', 'evening']) {
      const dl = kind === 'morning' ? p.morning_deadline : p.evening_deadline;
      if (!dl) continue;
      const remindAt = addMin(dl, -30);
      for (const s of sups) {
        const done = get('SELECT id FROM daily_reports WHERE project_id=? AND kind=? AND report_date=? AND submitted_by=?', p.id, kind, d, s.id);
        if (done) continue;
        if (now >= remindAt) notify(s.id, { type: 'report_missing', title: `${kind === 'morning' ? 'Morning' : 'Evening'} report due by ${dl}`, body: p.name, link: `#/report/new/${kind}`, dedupe: `rem-${kind}-${p.id}-${d}` });
        if (now >= addMin(dl, esc.report_grace_minutes || 30)) {
          notify(escalationTargets(p.id, esc.escalate_to_roles || ['project_manager']), { type: 'escalation', title: `Missing ${kind} report: ${s.name}`, body: `${p.name} — deadline ${dl}`, link: '#/summary', dedupe: `esc-${kind}-${p.id}-${s.id}-${d}` });
        }
      }
    }
  }
  // 2. tasks due within 24h / overdue / escalate
  const tomorrow = new Date(Date.now() + 864e5 + 5.5 * 3600e3).toISOString().slice(0, 10);
  for (const t of all("SELECT * FROM tasks WHERE status NOT IN ('approved','closed') AND due_date IS NOT NULL AND due_date<=?", tomorrow)) {
    const who = [t.assignee_id, ...all('SELECT id FROM users WHERE contractor_id=? AND active=1', t.contractor_id || -1).map(x => x.id)];
    if (t.due_date >= d) notify(who, { type: 'task_due', title: `Task due ${t.due_date === d ? 'today' : 'tomorrow'}: ${t.title}`, link: `#/tasks/${t.id}`, dedupe: `due-${t.id}-${t.due_date}` });
    else {
      notify(who, { type: 'task_overdue', title: `Task overdue: ${t.title}`, body: `Was due ${t.due_date}`, link: `#/tasks/${t.id}`, dedupe: `od-${t.id}-${d}` });
      const hoursLate = (Date.parse(d) - Date.parse(t.due_date)) / 3600e3;
      if (hoursLate >= (esc.overdue_hours || 24)) notify([...escalationTargets(t.project_id, esc.escalate_to_roles || []), t.reviewer_id], { type: 'escalation', title: `Escalation — overdue task: ${t.title}`, body: `Due ${t.due_date}`, link: `#/tasks/${t.id}`, dedupe: `odesc-${t.id}-${d}` });
    }
  }
  // 3. inspection correction deadlines passed
  for (const i of all("SELECT * FROM inspections WHERE status='rework_required' AND correction_deadline<?", d)) {
    notify(escalationTargets(i.project_id, ['site_engineer', 'project_manager']), { type: 'escalation', title: `Rework overdue: ${i.work_type}`, body: `Correction deadline ${i.correction_deadline}`, link: `#/quality/${i.id}`, dedupe: `insp-${i.id}-${d}` });
  }
  // 4. weekly / daily targets past deadline without result
  for (const pl of all("SELECT * FROM plans WHERE status='planned' AND deadline<?", d)) {
    notify([pl.responsible_id, pl.created_by], { type: 'target_missed', title: `Target deadline passed — update result: ${pl.title}`, link: '#/plans', dedupe: `plan-${pl.id}` });
  }
  // 5. meetings in the next hour
  const soon = new Date(Date.now() + 5.5 * 3600e3 + 60 * 60e3).toISOString().slice(0, 16);
  const nowIso = new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 16);
  for (const m of all('SELECT * FROM meetings WHERE starts_at > ? AND starts_at <= ?', nowIso, soon)) {
    notify(JSON.parse(m.attendees || '[]'), { type: 'meeting', title: `Meeting soon: ${m.title}`, body: `${m.starts_at.replace('T', ' ')} ${m.location || ''}`, link: `#/meetings/${m.id}`, dedupe: `mt-${m.id}` });
  }
}

function start() {
  const run = () => { try { tick(); } catch (e) { console.error('scheduler', e); } };
  setTimeout(run, 5000);
  return setInterval(run, 5 * 60e3);
}
module.exports = { start, tick };
