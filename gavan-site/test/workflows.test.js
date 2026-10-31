// End-to-end acceptance tests for the 9 required workflows (runs against a real server + temp database)
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const PORT = 3500 + Math.floor(Math.random() * 400);
const BASE = `http://127.0.0.1:${PORT}/api`;
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'gavan-test-'));
let srv;
const tok = {};

async function call(who, method, url, body, raw) {
  const headers = {};
  if (who) headers.Authorization = 'Bearer ' + tok[who];
  let payload = body;
  if (body && !(body instanceof FormData)) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  const r = await fetch(BASE + url, { method, headers, body: payload });
  if (raw) return r;
  const j = await r.json().catch(() => ({}));
  return { status: r.status, body: j };
}
const ok = async (...a) => { const r = await call(...a); assert.ok(r.status < 300, `${a[1]} ${a[2]} -> ${r.status} ${JSON.stringify(r.body)}`); return r.body; };
const JPEG = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64');
async function photo(who, pid, uuid, extra = {}) {
  const fd = new FormData();
  fd.append('file', new Blob([JPEG], { type: 'image/jpeg' }), 'p.jpg');
  fd.append('kind', 'live_photo'); fd.append('project_id', pid); fd.append('client_uuid', uuid); fd.append('captured_at', new Date().toISOString());
  Object.entries(extra).forEach(([k, v]) => fd.append(k, v));
  return ok(who, 'POST', '/files', fd);
}
async function login(name, login, password, newPw) {
  const r = await call(null, 'POST', '/auth/login', { login, password });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  tok[name] = r.body.token;
  if (newPw) {
    const blocked = await call(name, 'GET', '/tasks');
    assert.equal(blocked.status, 428, 'temporary password must be changed first');
    await ok(name, 'POST', '/auth/password', { current: password, next: newPw });
  }
}

before(async () => {
  srv = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], { env: { ...process.env, PORT, DATA_DIR: DATA, ADMIN_PASSWORD: 'Director#2026', LOAD_SAMPLE: '0', NODE_NO_WARNINGS: '1' }, stdio: 'pipe' });
  srv.stderr.on('data', d => process.stderr.write(d));
  for (let i = 0; i < 50; i++) { try { if ((await fetch(BASE + '/health')).ok) break; } catch { /* wait */ } await new Promise(r => setTimeout(r, 200)); }
  await login('dir', 'director', 'Director#2026', 'Director#2026x');
});
after(() => { srv && srv.kill(); fs.rmSync(DATA, { recursive: true, force: true }); });

const S = {};
test('initial live projects exist and no sample data when disabled', async () => {
  const me = await ok('dir', 'GET', '/me');
  const names = me.projects.map(p => p.name);
  for (const n of ['Moksh Villa', 'Gavan Arena Park', 'Gavan Homes', 'Shivaay Industrial Park – Mamakwada', 'Shivaay Industrial Park – Ahu', 'Shivaay Industrial Park – Anklash', 'Shivaay Industrial Park – Umarsadi']) assert.ok(names.includes(n), n);
  assert.ok(!me.projects.some(p => p.is_sample));
});

test('1. admin creates project, structure and assigns users', async () => {
  S.pid = (await ok('dir', 'POST', '/projects', { name: 'Test Tower', type: 'commercial', location: 'Surat' })).id;
  S.other = (await ok('dir', 'GET', '/me')).projects.find(p => p.name === 'Moksh Villa').id;
  const b = (await ok('dir', 'POST', `/projects/${S.pid}/locations`, { kind: 'building', name: 'Tower A' })).id;
  S.floor = (await ok('dir', 'POST', `/projects/${S.pid}/locations`, { kind: 'floor', name: 'Level 1', parent_id: b })).id;
  S.con = (await ok('dir', 'POST', '/contractors', { name: 'RCC Co', trade: 'RCC' })).id;
  await ok('dir', 'POST', `/contractors/${S.con}/assign`, { project_id: S.pid, work_order: 'WO-1', rate: 5000, rate_unit: 'cum' });
  S.wi = (await ok('dir', 'POST', `/projects/${S.pid}/work-items`, { name: 'Slab L1', unit: 'cum', planned_qty: 100, weight: 1, location_id: S.floor })).id;
  const mk = async (key, role, extra = {}) => { const r = await ok('dir', 'POST', '/users', { name: key, login: key, role, project_ids: [S.pid], password: 'Temp#1234', ...extra }); S[key] = r.id; await login(key, key, 'Temp#1234', 'Pass#' + key + '9'); };
  await mk('sup', 'supervisor'); await mk('eng', 'site_engineer'); await mk('pm', 'project_manager'); await mk('str', 'structural_engineer');
  await mk('ctr', 'contractor', { contractor_id: S.con }); await mk('pur', 'purchase', { department: 'Purchase' }); await mk('acc', 'accounts', { department: 'Accounts' });
  const p = await ok('pm', 'GET', '/projects/' + S.pid);
  assert.equal(p.members.length, 8);
});

test('2. supervisor submits morning + evening reports with live photos; evening updates progress, stock & attendance', async () => {
  await ok('dir', 'POST', '/stock', { project_id: S.pid, kind: 'opening', material: 'Cement', unit: 'bags', qty: 100 });
  const ph = await photo('sup', S.pid, 'ph-1', { gps_lat: 21.17, gps_lng: 72.83, gps_accuracy: 12 });
  const m = await ok('sup', 'POST', '/reports', { client_uuid: 'm-1', kind: 'morning', project_id: S.pid, location_id: S.floor, contractor_id: S.con, photo_ids: [ph.id],
    data: { labour: [{ trade: 'Mason', count: 10 }], planned_work: [{ work_item_id: S.wi, description: 'Slab', qty: 20, unit: 'cum' }], materials: [{ name: 'Cement', required: 50, available: 20 }] } });
  const open = await ok('sup', 'GET', '/reports-open-mornings?project_id=' + S.pid);
  assert.equal(open[0].id, m.id);
  const e = await ok('sup', 'POST', '/reports', { client_uuid: 'e-1', kind: 'evening', project_id: S.pid, morning_id: m.id,
    data: { work: [{ work_item_id: S.wi, description: 'Slab', planned_qty: 20, actual_qty: 15, unit: 'cum', delay_reason: 'Rain' }], labour: [{ trade: 'Mason', planned: 10, skilled: 9, unskilled: 0, hours: 8 }], materials_consumed: [{ name: 'Cement', qty: 30, unit: 'bags' }] } });
  const rep = await ok('pm', 'GET', '/reports/' + m.id);
  assert.equal(rep.photos.length, 1); assert.equal(rep.photos[0].gps_accuracy, 12); assert.equal(rep.evening.id, e.id);
  const evening = await ok('pm', 'GET', '/reports/' + e.id);
  assert.equal(evening.location_id, S.floor, 'evening inherits morning location');
  const p = await ok('pm', 'GET', '/projects/' + S.pid);
  assert.equal(p.workItems[0].done_qty, 15); assert.equal(p.progress.percent, 15);
  const st = await ok('pm', 'GET', '/stock?project_id=' + S.pid);
  assert.equal(st[0].closing, 70);
  const att = await ok('sup', 'GET', '/attendance?project_id=' + S.pid);
  assert.equal(att[0].skilled, 9);
  // correction keeps history and re-applies side effects
  await ok('sup', 'PUT', '/reports/' + e.id, { version: 1, reason: 'Typo', data: { ...evening.data, work: [{ ...evening.data.work[0], actual_qty: 18 }] } });
  const stale = await call('sup', 'PUT', '/reports/' + e.id, { version: 1, reason: 'again', data: evening.data });
  assert.equal(stale.status, 409, 'conflicting edit is rejected');
  const after = await ok('pm', 'GET', '/reports/' + e.id);
  assert.equal(after.edits.length, 1); assert.equal(after.version, 2);
  assert.equal((await ok('pm', 'GET', '/projects/' + S.pid)).workItems[0].done_qty, 18);
  assert.equal((await ok('pm', 'GET', '/stock?project_id=' + S.pid))[0].closing, 70, 'consumption not double counted');
  const dash = await ok('dir', 'GET', '/dashboard?project_id=' + S.pid);
  assert.ok(dash.delays.some(d => d.reason === 'Rain'));
  assert.ok(dash.shortages.some(s => s.material === 'Cement'));
});

test('3. manager assigns task → contractor submits → reviewer requests rework → approves', async () => {
  const t = await ok('pm', 'POST', '/tasks', { project_id: S.pid, title: 'Cast column C1', contractor_id: S.con, reviewer_id: S.eng, due_date: '2030-01-01', checklist: ['Rebar checked'] });
  const n = await ok('ctr', 'GET', '/notifications');
  assert.ok(n.items.some(x => x.title.includes('Cast column C1')), 'contractor notified');
  await ok('ctr', 'POST', `/tasks/${t.id}/status`, { status: 'in_progress' });
  const blocked = await call('ctr', 'POST', `/tasks/${t.id}/status`, { status: 'submitted', note: 'done' });
  assert.equal(blocked.status, 400, 'checklist must be completed');
  await ok('ctr', 'PUT', '/tasks/' + t.id, { checklist: [{ text: 'Rebar checked', done: true }] });
  await photo('ctr', S.pid, 'tp-1', { entity: 'task', entity_id: t.id });
  await ok('ctr', 'POST', `/tasks/${t.id}/status`, { status: 'submitted' });
  const notRev = await call('pm', 'POST', `/tasks/${t.id}/status`, { status: 'approved' });
  assert.equal(notRev.status, 403, 'only assigned reviewer approves');
  await ok('eng', 'POST', `/tasks/${t.id}/status`, { status: 'rework', note: 'Honeycombing' });
  await ok('ctr', 'POST', `/tasks/${t.id}/status`, { status: 'in_progress' });
  await ok('ctr', 'POST', `/tasks/${t.id}/status`, { status: 'submitted', note: 'Repaired' });
  await ok('eng', 'POST', `/tasks/${t.id}/status`, { status: 'approved' });
  const d = await ok('ctr', 'GET', '/tasks/' + t.id);
  assert.equal(d.status, 'approved');
  assert.deepEqual(d.history.map(h => h.to_status), ['open', 'in_progress', 'submitted', 'rework', 'in_progress', 'submitted', 'approved']);
});

test('4. contractor requests drawing and receives only the approved revision', async () => {
  const r = await ok('ctr', 'POST', '/drawing-requests', { project_id: S.pid, title: 'Slab reinforcement L1', category: 'structural', required_by: '2030-01-01', location_id: S.floor });
  await ok('eng', 'POST', `/drawing-requests/${r.id}/check`, { action: 'forward', consultant_id: S.str });
  const up = async (rev) => { const fd = new FormData(); fd.append('file', new Blob(['%PDF-1.4 test'], { type: 'application/pdf' }), 'slab.pdf'); fd.append('number', 'STR-101'); fd.append('revision', rev); fd.append('request_id', r.id); return ok('str', 'POST', '/drawings/upload', fd); };
  const u0 = await up('R0');
  assert.equal((await ok('ctr', 'GET', '/drawings?project_id=' + S.pid)).length, 0, 'contractor cannot see unapproved drawing');
  const selfApprove = await call('str', 'POST', `/drawing-revisions/${u0.revision_id}/review`, { action: 'approve' });
  assert.equal(selfApprove.status, 403, 'uploader cannot approve own drawing');
  await ok('pm', 'POST', `/drawing-revisions/${u0.revision_id}/review`, { action: 'approve' });
  let list = await ok('ctr', 'GET', '/drawings?project_id=' + S.pid);
  assert.equal(list[0].current.revision, 'R0');
  assert.ok((await ok('ctr', 'GET', '/notifications')).items.some(x => x.title.includes('STR-101')));
  // R1 via direct upload supersedes R0
  const fd = new FormData(); fd.append('file', new Blob(['%PDF-1.4 r1'], { type: 'application/pdf' }), 'slab-r1.pdf'); fd.append('number', 'STR-101'); fd.append('revision', 'R1'); fd.append('project_id', S.pid);
  const u1 = await ok('str', 'POST', '/drawings/upload', fd);
  await ok('pm', 'POST', `/drawing-revisions/${u1.revision_id}/review`, { action: 'approve' });
  const det = await ok('pm', 'GET', '/drawings/' + u1.drawing_id);
  assert.deepEqual(det.revisions.map(x => [x.revision, x.status]), [['R1', 'approved'], ['R0', 'superseded']]);
  const cdet = await ok('ctr', 'GET', '/drawings/' + u1.drawing_id);
  const file = await call('ctr', 'GET', `/files/${cdet.revisions[0].file_id}/raw`, undefined, true);
  assert.equal(file.status, 200);
});

test('5. material request → approval → PO → partial + final delivery → stock → accounts', async () => {
  const m = await ok('sup', 'POST', '/material-requests', { project_id: S.pid, material: 'Cement', qty: 200, unit: 'bags', required_by: '2030-01-01', client_uuid: 'mr-1' });
  const own = await call('sup', 'POST', `/material-requests/${m.id}/decision`, { action: 'approve' });
  assert.equal(own.status, 403);
  await ok('pm', 'POST', `/material-requests/${m.id}/decision`, { action: 'approve' });
  const po = await ok('pur', 'POST', `/material-requests/${m.id}/po`, { supplier: 'UltraTech Dealer', qty: 200, rate: 380 });
  const d1 = await ok('sup', 'POST', `/purchase-orders/${po.id}/deliveries`, { challan_no: 'C1', received_qty: 120, accepted_qty: 110, rejected_qty: 10 });
  assert.equal(d1.shortage, 90);
  assert.equal((await ok('sup', 'GET', '/material-requests/' + m.id)).status, 'partially_received');
  await ok('sup', 'POST', `/purchase-orders/${po.id}/deliveries`, { challan_no: 'C2', received_qty: 90, accepted_qty: 90 });
  const det = await ok('acc', 'GET', '/material-requests/' + m.id);
  assert.equal(det.status, 'received'); assert.equal(det.pos[0].rate, 380);
  const supView = await ok('sup', 'GET', '/material-requests/' + m.id);
  assert.equal(supView.pos[0].rate, undefined, 'supervisor cannot see PO rate');
  assert.equal((await ok('pm', 'GET', '/stock?project_id=' + S.pid)).find(s => s.material === 'Cement').closing, 270);
  await ok('acc', 'POST', `/material-requests/${m.id}/accounts-review`, { note: 'Invoice matched' });
  assert.equal((await ok('acc', 'GET', '/material-requests/' + m.id)).status, 'closed');
  // project-to-project transfer with receiving confirmation
  const tr = await ok('dir', 'POST', '/transfers', { from_project: S.pid, to_project: S.other, material: 'Cement', unit: 'bags', qty: 20 });
  await ok('dir', 'POST', `/transfers/${tr.id}/receive`, { received_qty: 18 });
  assert.equal((await ok('dir', 'GET', '/stock?project_id=' + S.other)).find(s => s.material === 'Cement').closing, 18);
});

test('6. inspector raises quality issue, correction is verified and signed off; gated task approval', async () => {
  const t = await ok('pm', 'POST', '/tasks', { project_id: S.pid, title: 'Rebar L1 slab', contractor_id: S.con, reviewer_id: S.pm, requires_inspection: true });
  const i = await ok('eng', 'POST', '/inspections', { project_id: S.pid, work_type: 'Reinforcement', contractor_id: S.con, result: 'rework', correction_deadline: '2030-01-01', reviewer_id: S.pm, task_id: t.id, responses: [{ item: 'Cover blocks', result: 'not_ok' }] });
  assert.ok((await ok('ctr', 'GET', '/notifications')).items.some(x => x.type === 'inspection_failed'));
  await ok('ctr', 'POST', `/tasks/${t.id}/status`, { status: 'in_progress' });
  await ok('ctr', 'POST', `/tasks/${t.id}/status`, { status: 'submitted', note: 'done' });
  const gated = await call('pm', 'POST', `/tasks/${t.id}/status`, { status: 'approved' });
  assert.equal(gated.status, 400, 'cannot approve before inspection sign-off');
  await ok('ctr', 'POST', `/inspections/${i.id}/correct`, { note: 'Cover blocks added' });
  await ok('eng', 'POST', `/inspections/${i.id}/reinspect`, { result: 'pass' });
  const wrong = await call('eng', 'POST', `/inspections/${i.id}/signoff`, {});
  assert.equal(wrong.status, 403, 'only assigned reviewer signs off');
  await ok('pm', 'POST', `/inspections/${i.id}/signoff`, {});
  await ok('pm', 'POST', `/tasks/${t.id}/status`, { status: 'approved' });
  assert.equal((await ok('ctr', 'GET', '/inspections/' + i.id)).status, 'signed_off');
});

test('7. management filters records and downloads accurate reports', async () => {
  const lab = await ok('dir', 'GET', `/reports-data/labour?project_id=${S.pid}`);
  assert.equal(lab.rows.length, 1); assert.equal(lab.rows[0].total, 9);
  const q = await ok('dir', 'GET', `/reports-data/quality?project_id=${S.pid}&contractor_id=${S.con}`);
  assert.equal(q.rows.length, 1);
  const pp = await ok('dir', 'GET', `/reports-data/project_progress?project_id=${S.pid}`);
  assert.equal(pp.rows[0].pct, '18%');
  assert.ok(pp.meta.preparedBy.includes('Gavan Director'));
  for (const type of ['daily_progress', 'labour', 'weekly_plan', 'contractor_performance', 'stock', 'pending_purchase', 'drawing_requests', 'quality', 'overdue_tasks', 'project_progress', 'management_summary']) {
    const pdf = await call('dir', 'GET', `/reports-export/${type}.pdf?project_id=${S.pid}`, undefined, true);
    assert.equal(pdf.status, 200, type); assert.equal(pdf.headers.get('content-type'), 'application/pdf');
    assert.equal((await pdf.arrayBuffer()).byteLength > 1000, true);
    const x = await call('dir', 'GET', `/reports-export/${type}.xlsx?project_id=${S.pid}`, undefined, true);
    assert.equal(x.status, 200, type); assert.ok((await x.arrayBuffer()).byteLength > 1000);
  }
  const filtered = await ok('pm', 'GET', `/tasks?project_id=${S.pid}&contractor_id=${S.con}&status=approved`);
  assert.equal(filtered.length, 2);
});

test('8. unauthorised users cannot access restricted project or financial data', async () => {
  assert.equal((await call('sup', 'GET', '/projects/' + S.other)).status, 403, 'not a member');
  assert.equal((await call('sup', 'GET', '/tasks?project_id=' + S.other)).body.length, 0);
  assert.equal((await call('sup', 'GET', '/users')).status, 403);
  assert.equal((await call('sup', 'POST', '/projects', { name: 'x' })).status, 403);
  assert.equal((await call('ctr', 'GET', '/material-requests')).status, 403);
  assert.equal((await call('ctr', 'GET', '/reports')).status, 403);
  assert.equal((await call('sup', 'POST', `/contractors/${S.con}/bills`, { project_id: S.pid, bill_no: 'B1', amount: 10 })).status, 403);
  const c = await ok('sup', 'GET', '/contractors/' + S.con);
  assert.equal(c.bills, null); assert.equal(c.assignments[0].rate, undefined);
  const p = await ok('ctr', 'GET', '/projects/' + S.pid);
  assert.equal(p.contractors[0].rate, undefined);
  assert.equal((await call('ctr', 'GET', '/contractors/999')).status, 403);
  // contractor sees only own contractor's tasks
  await ok('pm', 'POST', '/tasks', { project_id: S.pid, title: 'Someone else', assignee_id: S.sup });
  assert.ok((await ok('ctr', 'GET', '/tasks')).every(x => x.contractor_id === S.con));
  // finance export restricted
  assert.equal((await call('ctr', 'GET', '/reports-export/labour.pdf', undefined, true)).status, 403);
  // deactivated user is locked out
  await ok('dir', 'PUT', '/users/' + S.acc, { active: false });
  assert.equal((await call('acc', 'GET', '/me')).status, 401);
  assert.equal((await call(null, 'GET', '/me')).status, 401);
});

test('9. offline submissions sync without duplicate records', async () => {
  const body = { client_uuid: 'offline-xyz', kind: 'morning', project_id: S.pid, location_id: S.floor, report_date: '2030-02-01', data: { planned_work: [{ description: 'Blockwork', qty: 5 }] }, captured_offline: true };
  const p1 = await photo('sup', S.pid, 'off-ph-1');
  const p2 = await photo('sup', S.pid, 'off-ph-1');
  assert.equal(p1.id, p2.id); assert.equal(p2.duplicate, true);
  const a = await ok('sup', 'POST', '/reports', { ...body, photo_ids: [p1.id] });
  const b = await ok('sup', 'POST', '/reports', { ...body, photo_ids: [p1.id] });
  assert.equal(a.id, b.id); assert.equal(b.duplicate, true);
  const list = await ok('pm', 'GET', `/reports?project_id=${S.pid}&from=2030-02-01&to=2030-02-01`);
  assert.equal(list.length, 1); assert.equal(list[0].captured_offline, 1);
  const att1 = await ok('sup', 'POST', '/attendance', { rows: [{ client_uuid: 'att-off-1', project_id: S.pid, att_date: '2030-02-01', trade: 'Helper', unskilled: 5 }] });
  const att2 = await ok('sup', 'POST', '/attendance', { rows: [{ client_uuid: 'att-off-1', project_id: S.pid, att_date: '2030-02-01', trade: 'Helper', unskilled: 5 }] });
  assert.deepEqual(att1.ids, att2.ids);
});

test('sample data is separate and fully removable', async () => {
  const r = await ok('dir', 'POST', '/admin/load-sample', {});
  assert.ok(r.logins.includes('demo.supervisor'));
  const me = await ok('dir', 'GET', '/me');
  const demo = me.projects.find(p => p.is_sample);
  assert.ok(demo && demo.name.startsWith('DEMO'));
  await login('demo', 'demo.supervisor', 'demo1234');
  assert.equal((await call('demo', 'GET', '/projects/' + S.pid)).status, 403, 'demo users cannot see live projects');
  await ok('dir', 'POST', '/admin/purge-sample', {});
  assert.ok(!(await ok('dir', 'GET', '/me')).projects.some(p => p.is_sample));
  assert.equal((await call(null, 'POST', '/auth/login', { login: 'demo.supervisor', password: 'demo1234' })).status, 401);
  // live data untouched
  assert.equal((await ok('dir', 'GET', '/projects/' + S.pid)).workItems[0].done_qty, 18);
});
