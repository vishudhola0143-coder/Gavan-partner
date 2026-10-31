// Initial live setup + clearly-labelled SAMPLE data (is_sample=1, separate DEMO project, removable from Admin)
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { all, get, run, insert, tx, setting, setSetting, DATA_DIR } = require('./db');
const { hashPassword } = require('./auth');
const { DEFAULT_CHECKLISTS } = require('./routes/drawings');
const { defaultFolders } = require('./routes/core');

const LIVE_PROJECTS = [
  ['Moksh Villa', 'residential', 'MV'], ['Gavan Arena Park', 'commercial', 'GAP'], ['Gavan Homes', 'residential', 'GH'],
  ['Shivaay Industrial Park – Mamakwada', 'industrial', 'SIP-MM'], ['Shivaay Industrial Park – Ahu', 'industrial', 'SIP-AH'],
  ['Shivaay Industrial Park – Anklash', 'industrial', 'SIP-AN'], ['Shivaay Industrial Park – Umarsadi', 'industrial', 'SIP-UM'],
];

function initial() {
  if (get('SELECT id FROM users LIMIT 1')) return null;
  return tx(() => {
    insert('companies', { name: 'GAVAN GROUP' });
    const pw = process.env.ADMIN_PASSWORD || crypto.randomBytes(6).toString('base64url') + '9a';
    const dir = insert('users', { name: 'Gavan Director', login: 'director', role: 'director', company_id: 1, password_hash: hashPassword(pw), must_change_password: process.env.DEMO_MODE === '1' ? 0 : 1 });
    const anPw = crypto.randomBytes(6).toString('base64url') + '7b';
    const anushka = insert('users', { name: 'Anushka', login: 'anushka', role: 'admin', department: 'Coordination', company_id: 1, password_hash: hashPassword(anPw), must_change_password: 1 });
    for (const [name, type, code] of LIVE_PROJECTS) {
      const id = insert('projects', { name, type, code, company_id: 1 });
      defaultFolders(id);
      run('INSERT INTO project_members VALUES(?,?),(?,?)', id, dir, id, anushka);
    }
    for (const [k, items] of Object.entries(DEFAULT_CHECKLISTS)) run('INSERT OR IGNORE INTO checklist_templates(work_type,items) VALUES(?,?)', k, JSON.stringify(items));
    // Initial reporting structure (editable in Admin → Reporting Structure)
    insert('reporting_lines', { department: 'Purchase', to_user_id: anushka, note: 'Purchase team reports consolidated by Anushka' });
    insert('reporting_lines', { department: 'Accounts', to_user_id: anushka, note: 'Accounts team reports consolidated by Anushka' });
    insert('reporting_lines', { from_user_id: anushka, to_user_id: dir, note: 'Anushka consolidates departmental reports for Directors' });
    const creds = `GAVAN SITE initial logins (change on first login)\n\nDirector  login: director  password: ${pw}\nAnushka   login: anushka   password: ${anPw}\n`;
    fs.writeFileSync(path.join(DATA_DIR, 'INITIAL_LOGINS.txt'), creds, { mode: 0o600 });
    console.log('\n' + creds + `(saved to ${path.join(DATA_DIR, 'INITIAL_LOGINS.txt')})\n`);
    return { pw };
  });
}

// ---------------------------------------------------------------- SAMPLE DATA
const D = (off) => new Date(Date.now() + 5.5 * 3600e3 + off * 864e5).toISOString().slice(0, 10);
function seedSample() {
  if (get('SELECT id FROM projects WHERE is_sample=1')) return { ok: true, note: 'Sample data already loaded' };
  return tx(() => {
    const S = { is_sample: 1 };
    const pid = insert('projects', { name: 'DEMO – Sample Villa Project', code: 'DEMO', type: 'residential', location: 'Sample location (not real)', company_id: 1, start_date: D(-60), end_date: D(240), ...S });
    defaultFolders(pid);
    const loc = (name, kind, parent) => insert('locations', { project_id: pid, name, kind, parent_id: parent || null });
    const bA = loc('Block A', 'building'); const gf = loc('Ground Floor', 'floor', bA); const ff = loc('First Floor', 'floor', bA);
    const v1 = loc('Villa A-01', 'unit', gf); const v2 = loc('Villa A-02', 'unit', ff); const club = loc('Clubhouse', 'zone');
    const c = (name, trade, phone) => insert('contractors', { name, trade, phone, company_id: 1, ...S });
    const cRcc = c('Sample RCC Contractors', 'RCC / Civil', '9000000001'); const cMason = c('Sample Masonry Works', 'Masonry', '9000000002');
    const cPlumb = c('Sample Plumbing Co.', 'Plumbing', '9000000003'); const cElec = c('Sample Electricals', 'Electrical', '9000000004');
    [[cRcc, 'WO-DEMO-01', 'RCC frame Block A', 5200, 'cum'], [cMason, 'WO-DEMO-02', 'Blockwork & plaster', 48, 'sqft'], [cPlumb, 'WO-DEMO-03', 'Plumbing & drainage', 0, 'lumpsum'], [cElec, 'WO-DEMO-04', 'Electrical conduiting & wiring', 0, 'lumpsum']]
      .forEach(([cid, wo, scope, rate, unit]) => insert('project_contractors', { project_id: pid, contractor_id: cid, work_order: wo, scope, rate, rate_unit: unit, start_date: D(-50), end_date: D(200) }));
    const pw = hashPassword('demo1234');
    const u = (name, login, role, extra = {}) => { const id = insert('users', { name, login, role, password_hash: pw, company_id: 1, ...S, ...extra }); run('INSERT INTO project_members VALUES(?,?)', pid, id); return id; };
    const pm = u('Demo Project Manager', 'demo.pm', 'project_manager');
    const pmc = u('Demo PMC', 'demo.pmc', 'pmc');
    const se = u('Demo Site Engineer', 'demo.engineer', 'site_engineer');
    const sup = u('Demo Supervisor', 'demo.supervisor', 'supervisor', { phone: '9000000010' });
    const arch = u('Demo Architect', 'demo.architect', 'architect');
    const str = u('Demo Structural Engg', 'demo.structural', 'structural_engineer');
    const con = u('Demo RCC Contractor', 'demo.contractor', 'contractor', { contractor_id: cRcc });
    const pur = u('Demo Purchase', 'demo.purchase', 'purchase', { department: 'Purchase' });
    const acc = u('Demo Accounts', 'demo.accounts', 'accounts', { department: 'Accounts' });
    all("SELECT id FROM users WHERE role IN ('director','admin') AND is_sample=0").forEach(x => run('INSERT OR IGNORE INTO project_members VALUES(?,?)', pid, x.id));
    // work items for progress calculation
    const wi = (name, unit, planned, done, weight, l, cid) => insert('work_items', { project_id: pid, name, unit, planned_qty: planned, done_qty: done, weight, location_id: l, contractor_id: cid });
    const wFooting = wi('Footings & plinth', 'cum', 120, 120, 15, bA, cRcc); const wSlab = wi('Ground floor slab', 'cum', 85, 60, 20, gf, cRcc);
    wi('First floor slab', 'cum', 85, 0, 20, ff, cRcc); const wBlock = wi('Blockwork', 'sqft', 9000, 3100, 15, gf, cMason);
    wi('Plumbing rough-in', 'points', 140, 20, 10, gf, cPlumb); wi('Electrical conduiting', 'points', 260, 40, 10, gf, cElec); wi('Plaster', 'sqft', 18000, 0, 10, gf, cMason);
    // stock
    [['Cement OPC 53', 'bags', 400], ['TMT Steel 12mm', 'MT', 6], ['AAC Blocks 600x200x150', 'nos', 2500], ['River sand', 'brass', 12]].forEach(([m, un, q]) =>
      insert('stock_ledger', { project_id: pid, material: m, unit: un, kind: 'opening', qty: q, ref: 'manual', note: 'Sample opening stock', user_id: pm, ...S }));
    insert('stock_ledger', { project_id: pid, material: 'Cement OPC 53', unit: 'bags', kind: 'consumption', qty: -310, ref: 'manual', note: 'Sample consumption', user_id: sup, ...S });
    // reports: yesterday morning + evening, today morning
    for (const off of [-2, -1]) {
      const m = insert('daily_reports', { kind: 'morning', project_id: pid, location_id: gf, contractor_id: cRcc, report_date: D(off), report_time: '08:45', submitted_by: sup, ...S,
        data: JSON.stringify({ labour: [{ trade: 'Mason', count: 8 }, { trade: 'Helper', count: 14 }, { trade: 'Bar bender', count: 6 }], planned_work: [{ work_item_id: wSlab, description: 'GF slab reinforcement & shuttering', qty: 10, unit: 'cum' }, { work_item_id: wBlock, description: 'Blockwork Villa A-01', qty: 400, unit: 'sqft' }],
          materials: [{ name: 'Cement OPC 53', required: 60, available: 90, unit: 'bags' }, { name: 'TMT Steel 12mm', required: 2, available: 6, unit: 'MT' }], machinery: [{ name: 'Concrete mixer', required: 1, available: 1 }],
          drawings_available: 'yes', expected_completion: '18:00', problems: '' }) });
      insert('daily_reports', { kind: 'evening', project_id: pid, location_id: gf, contractor_id: cRcc, report_date: D(off), report_time: '18:40', morning_id: m, submitted_by: sup, ...S,
        data: JSON.stringify({ work: [{ work_item_id: wSlab, description: 'GF slab reinforcement & shuttering', planned_qty: 10, actual_qty: off === -1 ? 7 : 10, unit: 'cum', pending: off === -1 ? '3 cum' : '', delay_reason: off === -1 ? 'Shuttering material arrived late' : '' }, { work_item_id: wBlock, description: 'Blockwork Villa A-01', planned_qty: 400, actual_qty: 400, unit: 'sqft' }],
          labour: [{ trade: 'Mason', skilled: 8, unskilled: 0, hours: 8 }, { trade: 'Helper', skilled: 0, unskilled: 13, hours: 8 }, { trade: 'Bar bender', skilled: 6, unskilled: 0, hours: 9, overtime: 1 }],
          materials_consumed: [], quality_checks: 'Cover blocks checked', safety: 'Helmets worn; edge protection OK', tomorrow_plan: 'Continue slab shuttering', tomorrow_labour: '28', tomorrow_materials: 'Plywood sheets 20 nos' }) });
      [['Mason', 8, 0, 8], ['Helper', 0, 13, 8], ['Bar bender', 6, 0, 8]].forEach(([trade, sk, un, pl]) => insert('attendance', { project_id: pid, att_date: D(off), contractor_id: cRcc, trade, skilled: sk, unskilled: un, planned: pl || sk + un, hours: 8, location_id: gf, recorded_by: sup, ...S }));
    }
    insert('daily_reports', { kind: 'morning', project_id: pid, location_id: gf, contractor_id: cRcc, report_date: D(0), report_time: '08:50', submitted_by: sup, ...S,
      data: JSON.stringify({ labour: [{ trade: 'Mason', count: 8 }, { trade: 'Helper', count: 12 }], planned_work: [{ work_item_id: wSlab, description: 'GF slab shuttering balance', qty: 3, unit: 'cum' }],
        materials: [{ name: 'Plywood sheets', required: 20, available: 6, unit: 'nos' }], machinery: [], drawings_available: 'partial', expected_completion: '17:30', problems: 'Need slab reinforcement drawing for clubhouse' }) });
    // tasks in each state
    const task = (title, status, extra) => { const id = insert('tasks', { project_id: pid, title, status, priority: 'medium', created_by: pm, reviewer_id: se, start_date: D(-5), ...S, ...extra }); insert('task_history', { task_id: id, user_id: pm, to_status: 'open', note: 'Created (sample)' }); return id; };
    task('Complete GF slab shuttering', 'in_progress', { contractor_id: cRcc, assignee_id: con, location_id: gf, due_date: D(1), priority: 'high', checklist: JSON.stringify([{ text: 'Props checked', done: true }, { text: 'Levels checked', done: false }]), requires_inspection: 1 });
    task('Fix plumbing sleeves before slab cast', 'open', { contractor_id: cPlumb, location_id: gf, due_date: D(-1), priority: 'urgent' });
    task('Blockwork Villa A-01 east wall', 'submitted', { contractor_id: cMason, location_id: v1, due_date: D(0), completion_note: 'Done, ready for check' });
    task('Clean site & stack material', 'rework', { assignee_id: sup, location_id: bA, due_date: D(-2) });
    task('Submit monthly labour reconciliation', 'open', { assignee_id: sup, due_date: D(4), department: 'Site' });
    // plans
    [['Blockwork 2000 sqft GF', 2000, 'sqft', 'partial', 1500, 'Block supply delayed 2 days', cMason], ['GF slab casting', 85, 'cum', 'planned', 0, null, cRcc], ['Plumbing sleeves all GF', 60, 'points', 'achieved', 60, null, cPlumb]]
      .forEach(([title, tq, unit, status, aq, reason, cid], i) => insert('plans', { project_id: pid, period: 'weekly', period_start: D(-7 + (i === 1 ? 7 : 0)), title, target_qty: tq, unit, status, actual_qty: aq, reason, contractor_id: cid, responsible_id: sup, deadline: D(i === 1 ? 6 : -1), created_by: pm, ...S }));
    // drawing request + drawing
    insert('drawing_requests', { project_id: pid, location_id: club, category: 'structural', title: 'Clubhouse slab reinforcement drawing', description: 'Need bar bending details for clubhouse roof slab', required_by: D(3), priority: 'high', requested_by: con, contractor_id: cRcc, status: 'forwarded', consultant_id: str, checked_by: se, ...S });
    insert('drawing_requests', { project_id: pid, location_id: v1, category: 'plumbing', title: 'Villa A-01 toilet plumbing layout', required_by: D(6), priority: 'medium', requested_by: sup, status: 'requested', ...S });
    // inspection
    insert('inspections', { project_id: pid, location_id: gf, contractor_id: cRcc, inspector_id: se, work_type: 'Reinforcement', result: 'rework', status: 'rework_required', correction_deadline: D(1),
      responses: JSON.stringify(DEFAULT_CHECKLISTS.Reinforcement.map((it, i) => ({ item: it, result: i === 2 ? 'not_ok' : 'ok', remark: i === 2 ? 'Cover blocks missing at grid C3–C5' : '' }))), remarks: 'Provide cover blocks before casting', ...S });
    // material request flow
    const mr = insert('material_requests', { project_id: pid, material: 'Plywood sheets', specification: '12mm shuttering ply', qty: 40, unit: 'nos', required_by: D(1), current_stock: 6, requested_by: sup, status: 'approved', approved_by: pm, approved_at: new Date().toISOString(), ...S });
    insert('material_requests', { project_id: pid, material: 'TMT Steel 10mm', specification: 'Fe 550D', qty: 3, unit: 'MT', required_by: D(5), current_stock: 0, requested_by: sup, status: 'requested', ...S });
    void mr; void wFooting;
    // reporting line for demo staff
    insert('reporting_lines', { project_id: pid, from_role: 'supervisor', to_user_id: se, note: 'Sample: supervisors report to site engineer' });
    insert('reporting_lines', { project_id: pid, from_role: 'site_engineer', to_user_id: pm, note: 'Sample: site engineer reports to PM' });
    insert('meetings', { project_id: pid, title: 'Weekly site review (sample)', starts_at: D(2) + 'T11:00', location: 'Site office', agenda: '1. Slab casting plan\n2. Material status\n3. Quality issues', attendees: JSON.stringify([pm, se, sup, con]), created_by: pm });
    return { ok: true, demoPassword: 'demo1234', logins: ['demo.pm', 'demo.pmc', 'demo.engineer', 'demo.supervisor', 'demo.architect', 'demo.structural', 'demo.contractor', 'demo.purchase', 'demo.accounts'] };
  });
}

function purgeSample() {
  tx(() => {
    const pids = all('SELECT id FROM projects WHERE is_sample=1').map(p => p.id);
    const P = `(${pids.join(',') || 0})`;
    const files = all(`SELECT stored_name FROM files WHERE project_id IN ${P}`);
    run(`DELETE FROM drawing_revisions WHERE drawing_id IN (SELECT id FROM drawings WHERE project_id IN ${P})`);
    run(`DELETE FROM deliveries WHERE po_id IN (SELECT id FROM purchase_orders WHERE project_id IN ${P})`);
    run(`DELETE FROM report_edits WHERE report_id IN (SELECT id FROM daily_reports WHERE project_id IN ${P})`);
    run(`DELETE FROM task_history WHERE task_id IN (SELECT id FROM tasks WHERE project_id IN ${P})`);
    run(`DELETE FROM messages WHERE chat_id IN (SELECT id FROM chats WHERE project_id IN ${P})`);
    run(`DELETE FROM chat_members WHERE chat_id IN (SELECT id FROM chats WHERE project_id IN ${P})`);
    for (const t of ['purchase_orders', 'material_requests', 'drawings', 'drawing_requests', 'inspections', 'tasks', 'daily_reports', 'attendance', 'plans', 'stock_ledger', 'work_items', 'files', 'folders', 'chats', 'meetings', 'contractor_bills', 'project_contractors', 'reporting_lines', 'locations', 'project_members'])
      run(`DELETE FROM ${t} WHERE project_id IN ${P}`);
    run(`DELETE FROM transfers WHERE from_project IN ${P} OR to_project IN ${P}`);
    run(`DELETE FROM comments WHERE (entity='task' AND entity_id NOT IN (SELECT id FROM tasks)) OR (entity='inspection' AND entity_id NOT IN (SELECT id FROM inspections))`);
    const su = all('SELECT id FROM users WHERE is_sample=1').map(u => u.id); const U = `(${su.join(',') || 0})`;
    run(`DELETE FROM sessions WHERE user_id IN ${U}`); run(`DELETE FROM notification_deliveries WHERE notification_id IN (SELECT id FROM notifications WHERE user_id IN ${U})`);
    run(`DELETE FROM notifications WHERE user_id IN ${U}`); run(`DELETE FROM push_subscriptions WHERE user_id IN ${U}`); run(`DELETE FROM project_members WHERE user_id IN ${U}`);
    run(`DELETE FROM chat_members WHERE user_id IN ${U}`); run(`DELETE FROM reporting_lines WHERE to_user_id IN ${U} OR from_user_id IN ${U}`);
    run(`UPDATE audit_log SET user_id=NULL WHERE user_id IN ${U}`);
    run(`DELETE FROM users WHERE is_sample=1`);
    run(`DELETE FROM project_contractors WHERE contractor_id IN (SELECT id FROM contractors WHERE is_sample=1)`);
    run(`DELETE FROM contractors WHERE is_sample=1`);
    run(`DELETE FROM projects WHERE is_sample=1`);
    files.forEach(f => { try { fs.unlinkSync(path.join(DATA_DIR, 'uploads', f.stored_name)); } catch { /* already gone */ } });
  });
}

module.exports = { initial, seedSample, purgeSample, LIVE_PROJECTS };
