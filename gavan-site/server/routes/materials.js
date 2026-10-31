// Material requests → approval → PO → delivery → stock → accounts; transfers; contractors
const express = require('express');
const { all, get, run, insert, update, tx } = require('../db');
const A = require('../auth');
const { h, parse, today, locationPath, userName, projectUsersByRole, contractorUsers } = require('../util');
const { notify } = require('../notify');
const { usersWithCap } = require('./drawings');

const r = express.Router();
const fin = (u) => A.can(u, 'finance.view');

// ---------- stock ----------
function stockSummary(pid) {
  const rows = all(`SELECT material, max(unit) unit,
    sum(CASE WHEN kind='opening' THEN qty ELSE 0 END) opening,
    sum(CASE WHEN kind='receipt' THEN qty ELSE 0 END) receipts,
    -sum(CASE WHEN kind='consumption' THEN qty ELSE 0 END) consumption,
    sum(CASE WHEN kind='transfer_in' THEN qty ELSE 0 END) transfer_in,
    -sum(CASE WHEN kind='transfer_out' THEN qty ELSE 0 END) transfer_out,
    -sum(CASE WHEN kind='wastage' THEN qty ELSE 0 END) wastage,
    sum(CASE WHEN kind='adjustment' THEN qty ELSE 0 END) adjustment,
    sum(qty) closing FROM stock_ledger WHERE project_id=? GROUP BY lower(material) ORDER BY material`, pid);
  return rows;
}
const stockOf = (pid, material) => (get('SELECT sum(qty) s FROM stock_ledger WHERE project_id=? AND lower(material)=lower(?)', pid, material) || {}).s || 0;

r.get('/stock', h((req) => stockSummary(A.assertProject(req.user, req.query.project_id))));
r.get('/stock/ledger', h((req) => {
  const pid = A.assertProject(req.user, req.query.project_id);
  const p = [pid]; let w = '';
  if (req.query.material) { w += ' AND lower(s.material)=lower(?)'; p.push(req.query.material); }
  if (req.query.from) { w += ' AND date(s.at)>=?'; p.push(req.query.from); }
  if (req.query.to) { w += ' AND date(s.at)<=?'; p.push(req.query.to); }
  return all(`SELECT s.*, u.name user_name FROM stock_ledger s LEFT JOIN users u ON u.id=s.user_id WHERE project_id=? ${w} ORDER BY s.id DESC LIMIT 500`, ...p);
}));
r.post('/stock', A.requireCap('stock.manage'), h((req) => {
  const b = req.body;
  const pid = A.assertProject(req.user, b.project_id);
  if (!['opening', 'consumption', 'wastage', 'adjustment'].includes(b.kind)) A.bad('Invalid entry type');
  if (!b.material || !Number(b.qty)) A.bad('Material and quantity are required');
  if (b.kind === 'adjustment' && !b.note) A.bad('Enter reason for stock adjustment');
  let qty = Math.abs(Number(b.qty));
  if (b.kind === 'consumption' || b.kind === 'wastage') {
    if (qty > stockOf(pid, b.material) + 1e-9) A.bad(`Only ${stockOf(pid, b.material)} ${b.unit || ''} of ${b.material} in stock`);
    qty = -qty;
  }
  if (b.kind === 'adjustment') qty = Number(b.qty);
  const id = insert('stock_ledger', { project_id: pid, material: b.material.trim(), unit: b.unit, kind: b.kind, qty, note: b.note, ref: 'manual', user_id: req.user.id });
  A.audit(req.user, 'stock:' + b.kind, 'stock_ledger', id, b);
  return { id };
}));

// ---------- transfers ----------
r.get('/transfers', h((req) => {
  const ids = A.projectIds(req.user); const s = ids.length ? ids.join(',') : '0';
  return all(`SELECT t.*, a.name from_name, b.name to_name, u.name sent_by_name, v.name received_by_name FROM transfers t JOIN projects a ON a.id=t.from_project JOIN projects b ON b.id=t.to_project
    LEFT JOIN users u ON u.id=t.sent_by LEFT JOIN users v ON v.id=t.received_by WHERE t.from_project IN (${s}) OR t.to_project IN (${s}) ORDER BY t.id DESC LIMIT 200`);
}));
r.post('/transfers', A.requireCap('stock.manage'), h((req) => {
  const b = req.body;
  const from = A.assertProject(req.user, b.from_project);
  const to = Number(b.to_project);
  if (!get('SELECT id FROM projects WHERE id=?', to) || to === from) A.bad('Select a different destination project');
  const qty = Math.abs(Number(b.qty));
  if (!b.material || !qty) A.bad('Material and quantity required');
  if (qty > stockOf(from, b.material) + 1e-9) A.bad(`Only ${stockOf(from, b.material)} available at source`);
  const id = tx(() => {
    const id = insert('transfers', { from_project: from, to_project: to, material: b.material.trim(), unit: b.unit, qty, sent_by: req.user.id, note: b.note });
    insert('stock_ledger', { project_id: from, material: b.material.trim(), unit: b.unit, kind: 'transfer_out', qty: -qty, ref: 'transfer:' + id, user_id: req.user.id });
    return id;
  });
  notify(projectUsersByRole(to, ['supervisor', 'site_engineer', 'project_manager']), { type: 'general', title: `Material transfer incoming: ${qty} ${b.unit || ''} ${b.material}`, body: 'Confirm receipt at site', link: '#/materials/transfers' });
  return { id };
}));
r.post('/transfers/:id/receive', A.requireCap('materials.receive'), h((req) => {
  const t = get('SELECT * FROM transfers WHERE id=?', req.params.id) || A.notFound();
  A.assertProject(req.user, t.to_project);
  if (t.status !== 'in_transit') A.bad('Transfer already received');
  const q = Number(req.body.received_qty);
  if (!(q >= 0) || q > t.qty) A.bad('Received quantity must be between 0 and sent quantity');
  tx(() => {
    update('transfers', t.id, { status: 'received', received_by: req.user.id, received_at: new Date().toISOString(), received_qty: q, note: [t.note, req.body.note].filter(Boolean).join(' | ') });
    if (q) insert('stock_ledger', { project_id: t.to_project, material: t.material, unit: t.unit, kind: 'transfer_in', qty: q, ref: 'transfer:' + t.id, user_id: req.user.id });
  });
  notify(t.sent_by, { type: 'general', title: `Transfer received: ${q}/${t.qty} ${t.unit || ''} ${t.material}`, link: '#/materials/transfers' });
  return { ok: true };
}));

// ---------- material requests ----------
function decorateMR(m, user) {
  m.requested_by_name = userName(m.requested_by); m.approved_by_name = userName(m.approved_by);
  m.location = locationPath(m.location_id);
  m.pos = all('SELECT * FROM purchase_orders WHERE request_id=? ORDER BY id', m.id).map(po => {
    po.deliveries = all('SELECT d.*, u.name received_by_name FROM deliveries d LEFT JOIN users u ON u.id=d.received_by WHERE po_id=? ORDER BY id', po.id);
    po.accepted_total = po.deliveries.reduce((s, d) => s + (d.accepted_qty || 0), 0);
    if (!fin(user)) { delete po.rate; po.deliveries.forEach(d => { delete d.invoice_no; }); }
    return po;
  });
  m.ordered_qty = m.pos.reduce((s, p) => s + (p.qty || 0), 0);
  m.received_qty = m.pos.reduce((s, p) => s + p.accepted_total, 0);
  m.overdue = m.required_by && m.required_by < today() && !['received', 'closed', 'rejected'].includes(m.status);
  return m;
}
r.get('/material-requests', h((req) => {
  if (A.isContractor(req.user)) A.deny();
  const q = req.query; const where = [A.scopeSql(req.user, 'm')]; const p = [];
  if (q.project_id) { where.push('m.project_id=?'); p.push(q.project_id); }
  if (q.status) { where.push(`m.status IN (${q.status.split(',').map(() => '?').join(',')})`); p.push(...q.status.split(',')); }
  if (q.from) { where.push('date(m.created_at)>=?'); p.push(q.from); }
  if (q.to) { where.push('date(m.created_at)<=?'); p.push(q.to); }
  return all(`SELECT m.*, p.name project_name FROM material_requests m JOIN projects p ON p.id=m.project_id WHERE ${where.join(' AND ')} ORDER BY m.id DESC LIMIT 300`, ...p).map(m => decorateMR(m, req.user));
}));
r.get('/material-requests/:id', h((req) => {
  if (A.isContractor(req.user)) A.deny();
  const m = get('SELECT m.*, p.name project_name FROM material_requests m JOIN projects p ON p.id=m.project_id WHERE m.id=?', req.params.id) || A.notFound();
  A.assertProject(req.user, m.project_id);
  const out = decorateMR(m, req.user);
  out.files = all("SELECT id,name,mime,kind,entity,entity_id,captured_at,uploaded_at,gps_lat,gps_lng,captured_offline FROM files WHERE (entity='material_request' AND entity_id=?) OR (entity='delivery' AND entity_id IN (SELECT d.id FROM deliveries d JOIN purchase_orders po ON po.id=d.po_id WHERE po.request_id=?))", m.id, m.id)
    .filter(f => f.entity !== 'delivery' || fin(req.user) || A.can(req.user, 'materials.receive'));
  out.stock_now = stockOf(m.project_id, m.material);
  return out;
}));
r.post('/material-requests', A.requireCap('materials.request'), h((req) => {
  const b = req.body;
  const pid = A.assertProject(req.user, b.project_id);
  if (b.client_uuid) { const ex = get('SELECT id FROM material_requests WHERE client_uuid=?', b.client_uuid); if (ex) return { id: ex.id, duplicate: true }; }
  if (!b.material || !(Number(b.qty) > 0)) A.bad('Material and a positive quantity are required');
  const stock = stockOf(pid, b.material);
  const id = insert('material_requests', { client_uuid: b.client_uuid, project_id: pid, material: b.material.trim(), specification: b.specification, qty: Number(b.qty), unit: b.unit, required_by: b.required_by,
    current_stock: b.current_stock !== undefined && b.current_stock !== '' ? Number(b.current_stock) : stock, location_id: b.location_id || null, remarks: b.remarks, requested_by: req.user.id });
  const pname = get('SELECT name FROM projects WHERE id=?', pid).name;
  notify(usersWithCap(pid, 'materials.approve').filter(x => x !== req.user.id && !['purchase'].includes((get('SELECT role FROM users WHERE id=?', x) || {}).role)),
    { type: 'approval', title: `Material request: ${b.qty} ${b.unit || ''} ${b.material}`, body: `${pname} · needed by ${b.required_by || '—'}`, link: `#/materials/req/${id}` });
  A.audit(req.user, 'create', 'material_request', id, b);
  return { id };
}));
r.post('/material-requests/:id/decision', A.requireCap('materials.approve'), h((req) => {
  const m = get('SELECT * FROM material_requests WHERE id=?', req.params.id) || A.notFound();
  A.assertProject(req.user, m.project_id);
  if (m.status !== 'requested') A.bad('Request already decided');
  if (m.requested_by === req.user.id && !['director', 'admin'].includes(req.user.role)) A.deny('You cannot approve your own request');
  const { action, note, qty } = req.body;
  if (action === 'reject' && !note) A.bad('Enter reason for rejection');
  update('material_requests', m.id, { status: action === 'approve' ? 'approved' : 'rejected', approved_by: req.user.id, approved_at: new Date().toISOString(), decision_note: note, qty: action === 'approve' && Number(qty) > 0 ? Number(qty) : undefined });
  notify(m.requested_by, { type: 'approval', title: `Material request ${action === 'approve' ? 'approved' : 'rejected'}: ${m.material}`, body: note, link: `#/materials/req/${m.id}` });
  if (action === 'approve') notify(projectUsersByRole(m.project_id, ['purchase']), { type: 'approval', title: `Approved — raise PO: ${m.qty} ${m.unit || ''} ${m.material}`, link: `#/materials/req/${m.id}` });
  A.audit(req.user, 'decision:' + action, 'material_request', m.id, { note });
  return { ok: true };
}));
r.post('/material-requests/:id/po', A.requireCap('purchase.manage'), h((req) => {
  const m = get('SELECT * FROM material_requests WHERE id=?', req.params.id) || A.notFound();
  A.assertProject(req.user, m.project_id);
  if (!['approved', 'ordered', 'partially_received'].includes(m.status)) A.bad('Request must be approved before ordering');
  const b = req.body;
  if (!b.supplier || !(Number(b.qty) > 0)) A.bad('Supplier and quantity are required');
  const n = get('SELECT count(*) n FROM purchase_orders').n + 1;
  const id = insert('purchase_orders', { request_id: m.id, project_id: m.project_id, po_number: b.po_number || `GAV-PO-${String(n).padStart(4, '0')}`, supplier: b.supplier, qty: Number(b.qty), unit: m.unit, rate: b.rate ? Number(b.rate) : null, expected_date: b.expected_date, created_by: req.user.id });
  if (m.status === 'approved') update('material_requests', m.id, { status: 'ordered' });
  notify([m.requested_by, ...projectUsersByRole(m.project_id, ['supervisor', 'site_engineer'])], { type: 'general', title: `PO raised: ${b.qty} ${m.unit || ''} ${m.material}`, body: `Supplier ${b.supplier} · expected ${b.expected_date || '—'}`, link: `#/materials/req/${m.id}` });
  A.audit(req.user, 'create', 'purchase_order', id, { ...b, rate: undefined });
  return { id };
}));
r.post('/purchase-orders/:id/deliveries', A.requireCap('materials.receive'), h((req) => {
  const po = get('SELECT * FROM purchase_orders WHERE id=?', req.params.id) || A.notFound();
  A.assertProject(req.user, po.project_id);
  const b = req.body;
  if (b.client_uuid) { const ex = get('SELECT id FROM deliveries WHERE client_uuid=?', b.client_uuid); if (ex) return { id: ex.id, duplicate: true }; }
  const received = Number(b.received_qty), accepted = Number(b.accepted_qty), rejected = Number(b.rejected_qty) || 0;
  if (!(received > 0)) A.bad('Enter quantity received');
  if (accepted + rejected > received + 1e-9) A.bad('Accepted + rejected cannot exceed received quantity');
  if (!b.challan_no) A.bad('Delivery challan number is required');
  const m = get('SELECT * FROM material_requests WHERE id=?', po.request_id);
  const prevAccepted = get('SELECT coalesce(sum(accepted_qty),0) s FROM deliveries WHERE po_id=?', po.id).s;
  const shortage = Math.max(0, po.qty - prevAccepted - accepted);
  const id = tx(() => {
    const id = insert('deliveries', { client_uuid: b.client_uuid, po_id: po.id, project_id: po.project_id, challan_no: b.challan_no, invoice_no: b.invoice_no, received_qty: received, accepted_qty: accepted, rejected_qty: rejected, shortage_qty: shortage, remarks: b.remarks, received_by: req.user.id });
    if (accepted > 0) insert('stock_ledger', { project_id: po.project_id, material: m.material, unit: m.unit, kind: 'receipt', qty: accepted, ref: 'delivery:' + id, note: `${po.po_number} / challan ${b.challan_no}`, user_id: req.user.id });
    const totalAccepted = get('SELECT coalesce(sum(d.accepted_qty),0) s FROM deliveries d JOIN purchase_orders p ON p.id=d.po_id WHERE p.request_id=?', m.id).s;
    update('material_requests', m.id, { status: totalAccepted + 1e-9 >= m.qty ? 'received' : 'partially_received' });
    return id;
  });
  (b.file_ids || []).forEach(fid => run("UPDATE files SET entity='delivery', entity_id=? WHERE id=? AND uploaded_by=?", id, fid, req.user.id));
  const st = get('SELECT status FROM material_requests WHERE id=?', m.id).status;
  if (st === 'received') notify(projectUsersByRole(po.project_id, ['accounts']), { type: 'approval', title: `Delivery complete — accounts review: ${m.material}`, body: po.po_number, link: `#/materials/req/${m.id}` });
  if (shortage > 0 || rejected > 0) notify([po.created_by, m.requested_by, ...projectUsersByRole(po.project_id, ['purchase'])], { type: 'material_shortage', title: `Delivery short/rejected: ${m.material}`, body: `${po.po_number}: accepted ${accepted}, rejected ${rejected}, pending ${shortage} ${m.unit || ''}`, link: `#/materials/req/${m.id}` });
  A.audit(req.user, 'receive', 'delivery', id, { accepted, rejected, shortage });
  return { id, shortage };
}));
r.post('/material-requests/:id/accounts-review', A.requireCap('accounts.review'), h((req) => {
  const m = get('SELECT * FROM material_requests WHERE id=?', req.params.id) || A.notFound();
  A.assertProject(req.user, m.project_id);
  if (!['received', 'partially_received'].includes(m.status)) A.bad('Accounts review is done after site receipt');
  update('material_requests', m.id, { status: 'closed', accounts_reviewed_by: req.user.id, accounts_reviewed_at: new Date().toISOString(), accounts_note: req.body.note });
  A.audit(req.user, 'accounts_review', 'material_request', m.id, req.body);
  return { ok: true };
}));

// ---------- contractors ----------
r.get('/contractors', h((req) => {
  if (A.isContractor(req.user)) return all('SELECT id,name,trade,phone FROM contractors WHERE id=?', req.user.contractor_id);
  const ids = A.projectIds(req.user);
  const rows = all(`SELECT c.*, (SELECT group_concat(p.name, ', ') FROM project_contractors pc JOIN projects p ON p.id=pc.project_id WHERE pc.contractor_id=c.id) projects FROM contractors c ORDER BY c.active DESC, c.trade, c.name`);
  return A.can(req.user, 'all_projects') || A.can(req.user, 'contractors.manage') ? rows
    : rows.filter(c => get(`SELECT 1 FROM project_contractors WHERE contractor_id=? AND project_id IN (${ids.join(',') || 0})`, c.id));
}));
r.get('/contractors/:id', h((req) => {
  const id = Number(req.params.id);
  if (A.isContractor(req.user) && req.user.contractor_id !== id) A.deny();
  const c = get('SELECT * FROM contractors WHERE id=?', id) || A.notFound();
  const ids = A.projectIds(req.user); const s = ids.length ? ids.join(',') : '0';
  c.assignments = all(`SELECT pc.*, p.name project_name FROM project_contractors pc JOIN projects p ON p.id=pc.project_id WHERE contractor_id=? AND project_id IN (${s})`, id)
    .map(a => (fin(req.user) ? a : { ...a, rate: undefined }));
  c.labour = all(`SELECT att_date, sum(skilled) skilled, sum(unskilled) unskilled, sum(planned) planned FROM attendance WHERE contractor_id=? AND project_id IN (${s}) GROUP BY att_date ORDER BY att_date DESC LIMIT 30`, id);
  c.work = all(`SELECT w.*, p.name project_name FROM work_items w JOIN projects p ON p.id=w.project_id WHERE contractor_id=? AND project_id IN (${s})`, id);
  c.performance = contractorPerformance(id, s);
  c.quality = all(`SELECT id, work_type, result, status, created_at FROM inspections WHERE contractor_id=? AND project_id IN (${s}) ORDER BY id DESC LIMIT 30`, id);
  c.bills = fin(req.user) ? all(`SELECT b.*, p.name project_name FROM contractor_bills b JOIN projects p ON p.id=b.project_id WHERE contractor_id=? AND project_id IN (${s}) ORDER BY id DESC`, id) : null;
  c.files = all(`SELECT id,name,uploaded_at FROM files WHERE entity='contractor' AND entity_id=?`, id);
  c.users = all('SELECT id,name,login,phone FROM users WHERE contractor_id=?', id);
  return c;
}));
function contractorPerformance(id, scope) {
  const t = get(`SELECT count(*) total, sum(status IN ('approved','closed')) done, sum(due_date < date('now') AND status NOT IN ('approved','closed')) overdue,
    (SELECT count(*) FROM task_history th JOIN tasks x ON x.id=th.task_id WHERE x.contractor_id=? AND th.to_status='rework' AND x.project_id IN (${scope})) reworks
    FROM tasks WHERE contractor_id=? AND project_id IN (${scope})`, id, id);
  const q = get(`SELECT count(*) total, sum(result='pass') passed FROM inspections WHERE contractor_id=? AND project_id IN (${scope})`, id);
  const p = get(`SELECT count(*) total, sum(status='achieved') achieved FROM plans WHERE contractor_id=? AND project_id IN (${scope}) AND status<>'planned'`, id);
  return { tasks_total: t.total, tasks_done: t.done || 0, tasks_overdue: t.overdue || 0, reworks: t.reworks || 0,
    inspections: q.total, first_time_pass_pct: q.total ? Math.round(100 * (q.passed || 0) / q.total) : null,
    targets: p.total, targets_achieved_pct: p.total ? Math.round(100 * (p.achieved || 0) / p.total) : null };
}
r.post('/contractors', A.requireCap('contractors.manage'), h((req) => {
  const b = req.body; if (!b.name || !b.trade) A.bad('Name and trade are required');
  const id = insert('contractors', { name: b.name, phone: b.phone, trade: b.trade, notes: b.notes, company_id: 1 });
  A.audit(req.user, 'create', 'contractor', id, b);
  return { id };
}));
r.put('/contractors/:id', A.requireCap('contractors.manage'), h((req) => {
  const b = req.body;
  update('contractors', req.params.id, { name: b.name, phone: b.phone, trade: b.trade, notes: b.notes, active: b.active });
  A.audit(req.user, 'update', 'contractor', req.params.id, b);
  return { ok: true };
}));
r.post('/contractors/:id/assign', A.requireCap('contractors.manage'), h((req) => {
  const b = req.body;
  const pid = A.assertProject(req.user, b.project_id);
  const data = { work_order: b.work_order, scope: b.scope, start_date: b.start_date, end_date: b.end_date, rate_unit: b.rate_unit };
  if (A.can(req.user, 'finance.view')) data.rate = b.rate === '' ? null : b.rate;
  const ex = get('SELECT id FROM project_contractors WHERE project_id=? AND contractor_id=?', pid, req.params.id);
  if (ex) update('project_contractors', ex.id, data); else insert('project_contractors', { project_id: pid, contractor_id: Number(req.params.id), ...data });
  contractorUsers(Number(req.params.id)).forEach(u => run('INSERT OR IGNORE INTO project_members VALUES(?,?)', pid, u));
  A.audit(req.user, 'assign', 'contractor', req.params.id, { ...data, rate: undefined, project_id: pid });
  return { ok: true };
}));
r.post('/contractors/:id/bills', A.requireCap('finance.manage'), h((req) => {
  const b = req.body;
  const pid = A.assertProject(req.user, b.project_id);
  if (!b.bill_no || !(Number(b.amount) > 0)) A.bad('Bill number and amount are required');
  const id = insert('contractor_bills', { contractor_id: Number(req.params.id), project_id: pid, bill_no: b.bill_no, amount: Number(b.amount), bill_date: b.bill_date || today(), remarks: b.remarks, created_by: req.user.id });
  A.audit(req.user, 'create', 'contractor_bill', id, b);
  return { id };
}));
r.put('/bills/:id', A.requireCap('finance.manage'), h((req) => {
  const bill = get('SELECT * FROM contractor_bills WHERE id=?', req.params.id) || A.notFound();
  A.assertProject(req.user, bill.project_id);
  const paid = req.body.paid_amount !== undefined ? Number(req.body.paid_amount) : bill.paid_amount;
  if (paid > bill.amount) A.bad('Paid amount exceeds bill amount');
  const status = req.body.status || (paid >= bill.amount ? 'paid' : paid > 0 ? 'part_paid' : bill.status);
  update('contractor_bills', bill.id, { paid_amount: paid, status, remarks: req.body.remarks });
  A.audit(req.user, 'update', 'contractor_bill', bill.id, req.body);
  return { ok: true };
}));

module.exports = { router: r, stockSummary, stockOf, contractorPerformance };
