/* Materials & purchase, stock, transfers, contractors, files, chat, meetings */
(() => {
'use strict';
const { html, raw, t } = G;
const UNITS = ['bags', 'MT', 'kg', 'cum', 'sqft', 'sqm', 'nos', 'brass', 'rmt', 'ltr', 'set'];
const money = (n) => (n == null ? '—' : '₹ ' + Number(n).toLocaleString('en-IN'));

// ================= MATERIALS =================
G.route('/materials', async () => {
  const p = G.params(); const tab = p.tab || 'requests';
  let body = '';
  if (tab === 'requests') {
    const list = await G.get('/material-requests' + G.qs({ project_id: G.state.project, status: p.status }));
    body = list.length ? html`<div class="cards">${list.map(m => html`<a class="card link ${m.overdue ? 'overdue' : ''}" href="#/materials/req/${m.id}"><div class="row-between"><b>${m.qty} ${m.unit || ''} ${m.material}</b>${G.badge(m.status)}</div>
      <div class="muted">${m.project_name}${m.specification ? ' · ' + m.specification : ''}</div><div class="meta">Required by ${G.fmtDate(m.required_by)} · ordered ${m.ordered_qty} · accepted ${m.received_qty} · ${m.requested_by_name}</div></a>`)}</div>` : G.empty('No material requests.');
  } else if (tab === 'stock') {
    if (!G.state.project) body = G.empty(t('select_project') + ' to view stock.');
    else {
      const st = await G.get('/stock?project_id=' + G.state.project);
      body = st.length ? html`<div class="tbl-wrap"><table class="tbl"><tr><th>Material</th><th>Unit</th><th>Opening</th><th>Receipts</th><th>Transfer in</th><th>Consumed</th><th>Transfer out</th><th>Wastage</th><th>Adj.</th><th>Closing</th><th></th></tr>
        ${st.map(s => html`<tr><td><b>${s.material}</b></td><td>${s.unit}</td><td>${s.opening}</td><td>${s.receipts}</td><td>${s.transfer_in}</td><td>${s.consumption}</td><td>${s.transfer_out}</td><td>${s.wastage}</td><td>${s.adjustment}</td><td><b class="${s.closing <= 0 ? 'red-text' : ''}">${Math.round(s.closing * 1000) / 1000}</b></td><td><button class="btn small ghost" data-ledger="${s.material}">Ledger</button></td></tr>`)}</table></div>` : G.empty('No stock records. Add opening stock to begin.');
    }
  } else {
    const list = await G.get('/transfers');
    body = list.length ? html`<div class="tbl-wrap"><table class="tbl"><tr><th>Date</th><th>Material</th><th>Qty</th><th>From</th><th>To</th><th>Status</th><th>Received</th><th></th></tr>
      ${list.map(x => html`<tr><td>${G.fmtDT(x.sent_at)}</td><td>${x.material}</td><td>${x.qty} ${x.unit || ''}</td><td>${x.from_name}<div class="muted">${x.sent_by_name}</div></td><td>${x.to_name}</td><td>${G.badge(x.status)}</td><td>${x.received_qty ?? ''} ${x.received_by_name ? html`<div class="muted">${x.received_by_name}</div>` : ''}</td>
      <td>${x.status === 'in_transit' && G.can('materials.receive') && G.state.me.projects.some(pp => pp.id === x.to_project) ? html`<button class="btn small primary" data-recv="${x.id}" data-qty="${x.qty}">Confirm receipt</button>` : ''}</td></tr>`)}</table></div>` : G.empty('No transfers.');
  }
  return G.mount(G.page(t('materials'), html`
    <div class="tabs">${[['requests', t('requests')], ['stock', t('stock')], ['transfers', t('transfers')]].map(([k, l]) => html`<a href="#/materials?tab=${k}" class="${tab === k ? 'on' : ''}">${l}</a>`)}</div><div id="flt"></div>${body}`,
  html`${tab === 'requests' && G.can('materials.request') ? html`<button class="btn primary" id="newMr">+ ${t('new_request')}</button>` : ''}
    ${tab === 'stock' && G.can('stock.manage') && G.state.project ? html`<button class="btn primary" id="stockEntry">+ Stock entry</button>` : ''}
    ${tab === 'transfers' && G.can('stock.manage') ? html`<button class="btn primary" id="newTr">+ Transfer</button>` : ''}`), (root) => {
    if (tab === 'requests') root.querySelector('#flt').appendChild(G.filterBar([{ name: 'status', label: 'Status', type: 'select', options: ['requested', 'approved', 'ordered', 'partially_received', 'received', 'closed', 'rejected'].map(s => ({ value: s, label: s.replace('_', ' ') })) }], p, (v) => G.setQuery('/materials', { ...v, tab })));
    const nm = root.querySelector('#newMr'); if (nm) nm.onclick = mrForm;
    if (p.new && nm) mrForm();
    const se = root.querySelector('#stockEntry'); if (se) se.onclick = () => G.form({ title: 'Stock entry — ' + G.projectName(G.state.project), fields: [
      { name: 'kind', label: 'Entry type', type: 'select', required: true, options: [{ value: 'opening', label: 'Opening stock' }, { value: 'consumption', label: 'Consumption' }, { value: 'wastage', label: 'Wastage' }, { value: 'adjustment', label: 'Adjustment (+/−, with reason)' }] },
      { name: 'material', label: 'Material', required: true }, { name: 'qty', label: 'Quantity', type: 'number', required: true, half: true }, { name: 'unit', label: 'Unit', list: UNITS, half: true }, { name: 'note', label: 'Note / reason', type: 'textarea', rows: 2 }],
      submit: async (v) => { await G.post('/stock', { ...v, project_id: Number(G.state.project) }); G.toast('Stock updated'); G.router(); } });
    G.on(root, '[data-ledger]', 'click', async (e, b) => {
      const rows = await G.get('/stock/ledger' + G.qs({ project_id: G.state.project, material: b.dataset.ledger }));
      G.modal('Ledger: ' + b.dataset.ledger, html`<table class="tbl"><tr><th>Date</th><th>Type</th><th>Qty</th><th>Ref / note</th><th>By</th></tr>${rows.map(r => html`<tr><td>${G.fmtDT(r.at)}</td><td>${r.kind}</td><td class="${r.qty < 0 ? 'red-text' : ''}">${r.qty}</td><td>${r.ref || ''} ${r.note || ''}</td><td>${r.user_name || ''}</td></tr>`)}</table>`, { wide: true });
    });
    const nt = root.querySelector('#newTr'); if (nt) nt.onclick = () => G.form({ title: 'Project-to-project transfer', fields: [
      { name: 'from_project', label: 'From project', type: 'select', required: true, options: G.projectOpts(), value: G.state.project, half: true },
      { name: 'to_project', label: 'To project', type: 'select', required: true, options: G.projectOpts(), half: true },
      { name: 'material', label: 'Material (as named in stock)', required: true }, { name: 'qty', label: 'Quantity', type: 'number', required: true, half: true }, { name: 'unit', label: 'Unit', list: UNITS, half: true }, { name: 'note', label: 'Vehicle / note' }],
      submit: async (v) => { await G.post('/transfers', v); G.toast('Transfer sent — receiving site must confirm'); G.router(); } });
    G.on(root, '[data-recv]', 'click', async (e, b) => G.form({ title: 'Confirm receipt', fields: [{ name: 'received_qty', label: 'Quantity received', type: 'number', value: b.dataset.qty, required: true }, { name: 'note', label: 'Note (shortage / damage)' }],
      submit: async (v) => { await G.post(`/transfers/${b.dataset.recv}/receive`, v); G.toast('Receipt confirmed'); G.router(); } }));
  });
});
async function mrForm() {
  const pid = Number(G.state.project); if (!pid) return G.toast(t('select_project'), 'warn');
  let stock = []; try { stock = await G.get('/stock?project_id=' + pid); } catch { /* offline */ }
  const uuid = G.uuid();
  G.form({ title: `${t('material_request')} — ${G.projectName(pid)}`, fields: [
    { name: 'material', label: 'Material', required: true, list: stock.map(s => s.material), onChange: (val, form) => { const s = stock.find(x => x.material.toLowerCase() === val.toLowerCase()); if (s) { form.querySelector('[name=current_stock]').value = Math.round(s.closing * 1000) / 1000; form.querySelector('[name=unit]').value = s.unit || ''; } } },
    { name: 'specification', label: 'Specification / grade / size' },
    { name: 'qty', label: 'Required quantity', type: 'number', required: true, half: true }, { name: 'unit', label: 'Unit', list: UNITS, half: true },
    { name: 'required_by', label: 'Required by', type: 'date', required: true, half: true }, { name: 'current_stock', label: 'Current site stock', type: 'number', half: true, hint: 'Auto-filled from stock records; adjust if physical stock differs.' },
    { name: 'remarks', label: 'Remarks', type: 'textarea', rows: 2 },
  ], submit: async (v) => { const r = await G.post('/material-requests', { ...v, project_id: pid, client_uuid: uuid }); G.toast('Request sent for approval'); location.hash = '#/materials/req/' + r.id; },
  offline: async (v) => { await G.queue.add({ label: `Material request · ${v.material}`, url: '/material-requests', body: { ...v, project_id: pid, client_uuid: uuid } }); } });
}
G.route('/materials/req/:id', async (id) => {
  const m = await G.get('/material-requests/' + id);
  const comments = await G.get(`/comments?entity=material_request&entity_id=${m.id}`).catch(() => []);
  const steps = ['requested', 'approved', 'ordered', 'received', 'closed'];
  const idx = m.status === 'partially_received' ? 2.5 : steps.indexOf(m.status);
  const fin = G.can('finance.view');
  return G.mount(G.page(html`${m.qty} ${m.unit || ''} ${m.material} ${G.sampleTag(m)}`, html`
    <div class="steps">${['Site request', 'Approval', 'Purchase order', 'Site receipt', 'Accounts review'].map((s, i) => html`<div class="step ${i <= idx ? 'done' : ''} ${m.status === 'rejected' && i === 1 ? 'bad' : ''}">${s}</div>`)}</div>
    <div class="status-line">${G.badge(m.status)} ${m.overdue ? html`<span class="badge red">Past required date</span>` : ''}</div>
    <section class="panel"><dl class="dl"><dt>${t('project')}</dt><dd>${m.project_name}</dd><dt>Specification</dt><dd>${m.specification || '—'}</dd><dt>Required by</dt><dd>${G.fmtDate(m.required_by)}</dd>
      <dt>Stock when requested</dt><dd>${m.current_stock ?? '—'} ${m.unit || ''} (now ${Math.round(m.stock_now * 1000) / 1000})</dd><dt>Requested by</dt><dd>${m.requested_by_name} · ${G.fmtDT(m.created_at)}</dd>
      <dt>Decision</dt><dd>${m.approved_by_name ? html`${m.approved_by_name} · ${G.fmtDT(m.approved_at)} ${m.decision_note || ''}` : '—'}</dd>
      ${m.accounts_reviewed_at ? html`<dt>Accounts</dt><dd>Reviewed ${G.fmtDT(m.accounts_reviewed_at)} ${m.accounts_note || ''}</dd>` : ''}</dl>${m.remarks ? html`<p>${m.remarks}</p>` : ''}</section>
    ${m.pos.map(po => html`<section class="panel"><h3>${po.po_number} · ${po.supplier}</h3><p>Ordered ${po.qty} ${po.unit || ''}${fin && po.rate ? ' @ ' + money(po.rate) + ' = ' + money(po.rate * po.qty) : ''} · expected ${G.fmtDate(po.expected_date)} · accepted so far <b>${po.accepted_total}</b></p>
      ${po.deliveries.length ? html`<table class="tbl"><tr><th>Date</th><th>Challan</th>${fin ? html`<th>Invoice</th>` : ''}<th>Received</th><th>Accepted</th><th>Rejected</th><th>Pending</th><th>By</th></tr>${po.deliveries.map(d => html`<tr><td>${G.fmtDT(d.received_at)}</td><td>${d.challan_no}</td>${fin ? html`<td>${d.invoice_no || ''}</td>` : ''}<td>${d.received_qty}</td><td>${d.accepted_qty}</td><td class="${d.rejected_qty ? 'red-text' : ''}">${d.rejected_qty}</td><td class="${d.shortage_qty ? 'amber-text' : ''}">${d.shortage_qty}</td><td>${d.received_by_name}</td></tr>`)}</table>` : html`<p class="muted">No deliveries yet.</p>`}
      ${G.can('materials.receive') && po.accepted_total < po.qty && m.status !== 'closed' ? html`<button class="btn primary" data-recv="${po.id}" data-pending="${po.qty - po.accepted_total}">${t('receive')}</button>` : ''}</section>`)}
    <section class="panel"><h3>Delivery photos & documents</h3>${G.photoGallery(m.files)}</section>
    ${G.commentsBox('material_request', m.id, comments)}`,
  html`${G.can('materials.approve') && m.status === 'requested' ? html`<button class="btn primary" id="appr">${t('approve')}</button><button class="btn danger" id="rej">Reject</button>` : ''}
    ${G.can('purchase.manage') && ['approved', 'ordered', 'partially_received'].includes(m.status) ? html`<button class="btn primary" id="po">+ Purchase order</button>` : ''}
    ${G.can('accounts.review') && ['received', 'partially_received'].includes(m.status) ? html`<button class="btn" id="acc">Accounts review & close</button>` : ''}`), (root) => {
    G.bindComments(root);
    const a = root.querySelector('#appr'); if (a) a.onclick = () => G.form({ title: 'Approve request', fields: [{ name: 'qty', label: 'Approved quantity', type: 'number', value: m.qty, required: true }, { name: 'note', label: 'Note' }], submit: async (v) => { await G.post(`/material-requests/${m.id}/decision`, { action: 'approve', ...v }); G.toast('Approved — purchase notified'); G.router(); } });
    const r = root.querySelector('#rej'); if (r) r.onclick = async () => { const n = await G.prompt('Reject request', 'Reason'); if (n) G.act(() => G.post(`/material-requests/${m.id}/decision`, { action: 'reject', note: n }), 'Rejected'); };
    const po = root.querySelector('#po'); if (po) po.onclick = () => G.form({ title: 'Raise purchase order', fields: [
      { name: 'supplier', label: 'Supplier', required: true }, { name: 'qty', label: 'Order quantity', type: 'number', value: Math.max(0, m.qty - m.ordered_qty), required: true, half: true },
      { name: 'rate', label: 'Rate per unit (₹)', type: 'number', half: true, when: G.can('finance.view') }, { name: 'expected_date', label: 'Expected delivery', type: 'date', half: true }, { name: 'po_number', label: 'PO number (auto if blank)', half: true }],
      submit: async (v) => { await G.post(`/material-requests/${m.id}/po`, v); G.toast('PO created — site notified'); G.router(); } });
    G.on(root, '[data-recv]', 'click', (e, b) => { const uuid = G.uuid(); G.form({ title: t('receive'), intro: html`Pending on this PO: <b>${b.dataset.pending} ${m.unit || ''}</b>. Partial deliveries are supported.`, fields: [
      { name: 'challan_no', label: 'Delivery challan no.', required: true, half: true }, { name: 'invoice_no', label: 'Invoice no.', half: true },
      { name: 'received_qty', label: 'Quantity received', type: 'number', required: true, half: true }, { name: 'accepted_qty', label: 'Accepted (verified) qty', type: 'number', required: true, half: true },
      { name: 'rejected_qty', label: 'Rejected qty', type: 'number', value: 0, half: true }, { name: 'remarks', label: 'Remarks (quality, damage)', half: true },
      { name: 'photos', label: 'Delivery photographs', type: 'photos', meta: () => ({ project_id: m.project_id }) }, { name: 'files', label: 'Challan / invoice scan', type: 'files' }],
      submit: async (v) => {
        const ids = [...await G.ensurePhotos(v.photos, { project_id: m.project_id }), ...await G.uploadDocs(v.files, { project_id: m.project_id })];
        const res = await G.post(`/purchase-orders/${b.dataset.recv}/deliveries`, { ...v, photos: undefined, files: undefined, file_ids: ids, client_uuid: uuid });
        G.toast(res.shortage ? `Received — ${res.shortage} ${m.unit || ''} still pending` : 'Received in full — stock updated'); G.router();
      } }); });
    const ac = root.querySelector('#acc'); if (ac) ac.onclick = async () => { const n = await G.prompt('Accounts review', 'Note (invoice matched, payment status…)', { required: false }); if (n != null) G.act(() => G.post(`/material-requests/${m.id}/accounts-review`, { note: n }), 'Closed'); };
  });
});

// ================= CONTRACTORS =================
G.route('/contractors', async () => {
  const list = await G.get('/contractors');
  return G.mount(G.page(t('contractors'), list.length ? html`<div class="cards">${list.map(c => html`<a class="card link" href="#/contractors/${c.id}"><div class="row-between"><b>${c.name}</b>${G.sampleTag(c)}${c.active === 0 ? G.badge('archived') : ''}</div><div class="muted">${c.trade} · ${c.phone || ''}</div><div class="meta">${c.projects || 'Not assigned'}</div></a>`)}</div>` : G.empty(),
    G.can('contractors.manage') ? html`<button class="btn primary" id="newC">+ Contractor</button>` : ''), (root) => {
    const b = root.querySelector('#newC'); if (b) b.onclick = () => contractorForm();
  });
});
function contractorForm(c = {}) {
  G.form({ title: c.id ? t('edit') : 'New contractor', fields: [{ name: 'name', label: 'Name / firm', required: true, value: c.name }, { name: 'trade', label: 'Trade', required: true, value: c.trade, list: ['RCC / Civil', 'Masonry', 'Plaster', 'Plumbing', 'Electrical', 'Waterproofing', 'Flooring', 'Painting', 'Fabrication', 'Carpentry', 'Landscape', 'Excavation'] },
    { name: 'phone', label: 'Phone', type: 'tel', value: c.phone }, { name: 'notes', label: 'Notes', type: 'textarea', value: c.notes }, ...(c.id ? [{ name: 'active', label: 'Active', type: 'checkbox', value: c.active }] : [])],
  submit: async (v) => { if (c.id) await G.put('/contractors/' + c.id, v); else { const r = await G.post('/contractors', v); location.hash = '#/contractors/' + r.id; } G.state.meta = await G.get('/meta'); G.toast('Saved'); G.router(); } });
}
G.route('/contractors/:id', async (id) => {
  const c = await G.get('/contractors/' + id);
  const p = c.performance; const fin = G.can('finance.view');
  return G.mount(G.page(html`${c.name} ${G.sampleTag(c)}`, html`<p>${c.trade} · ${c.phone || '—'}</p>${c.notes ? html`<p class="muted">${c.notes}</p>` : ''}
    <div class="kpis small"><div class="kpi"><div class="kv">${p.tasks_done}/${p.tasks_total}</div><div class="kl">Tasks approved</div></div><div class="kpi ${p.tasks_overdue ? 'alert' : ''}"><div class="kv">${p.tasks_overdue}</div><div class="kl">Overdue</div></div>
      <div class="kpi"><div class="kv">${p.reworks}</div><div class="kl">Reworks</div></div><div class="kpi"><div class="kv">${p.first_time_pass_pct == null ? '—' : p.first_time_pass_pct + '%'}</div><div class="kl">QC first-time pass</div></div><div class="kpi"><div class="kv">${p.targets_achieved_pct == null ? '—' : p.targets_achieved_pct + '%'}</div><div class="kl">Targets achieved</div></div></div>
    <section class="panel"><h3>Assigned projects & work orders</h3>${c.assignments.length ? html`<table class="tbl"><tr><th>${t('project')}</th><th>Work order</th><th>Scope</th>${fin ? html`<th>Rate</th>` : ''}<th>Period</th></tr>${c.assignments.map(a => html`<tr><td>${a.project_name}</td><td>${a.work_order || ''}</td><td>${a.scope || ''}</td>${fin ? html`<td>${a.rate != null ? money(a.rate) + ' / ' + (a.rate_unit || '') : '—'}</td>` : ''}<td>${G.fmtDate(a.start_date)} – ${G.fmtDate(a.end_date)}</td></tr>`)}</table>` : G.empty('Not assigned to any project')}</section>
    <section class="panel"><h3>Completed & approved quantities</h3>${c.work.length ? html`<table class="tbl"><tr><th>Work item</th><th>${t('project')}</th><th>Done / planned</th></tr>${c.work.map(w => html`<tr><td>${w.name}</td><td>${w.project_name}</td><td>${w.done_qty} / ${w.planned_qty} ${w.unit || ''}</td></tr>`)}</table>` : G.empty()}</section>
    <section class="panel"><h3>Labour (last 30 days recorded)</h3>${c.labour.length ? html`<table class="tbl"><tr><th>Date</th><th>Planned</th><th>Skilled</th><th>Unskilled</th></tr>${c.labour.map(l => html`<tr><td>${G.fmtDate(l.att_date)}</td><td>${l.planned}</td><td>${l.skilled}</td><td>${l.unskilled}</td></tr>`)}</table>` : G.empty()}</section>
    <section class="panel"><h3>Quality issues</h3>${c.quality.length ? html`<table class="tbl">${c.quality.map(q => html`<tr class="link" data-href="#/quality/${q.id}"><td>${G.fmtDate(q.created_at)}</td><td>${q.work_type}</td><td>${G.badge(q.result)}</td><td>${G.badge(q.status)}</td></tr>`)}</table>` : G.empty()}</section>
    ${c.bills ? html`<section class="panel"><h3>Bills & payments <span class="badge amber">restricted</span></h3>${c.bills.length ? html`<table class="tbl"><tr><th>Bill</th><th>Date</th><th>${t('project')}</th><th>Amount</th><th>Paid</th><th>Status</th><th></th></tr>${c.bills.map(b => html`<tr><td>${b.bill_no}</td><td>${G.fmtDate(b.bill_date)}</td><td>${b.project_name}</td><td>${money(b.amount)}</td><td>${money(b.paid_amount)}</td><td>${G.badge(b.status)}</td><td>${G.can('finance.manage') ? html`<button class="btn small" data-pay="${b.id}" data-paid="${b.paid_amount}">Update payment</button>` : ''}</td></tr>`)}</table>` : G.empty()}
      ${G.can('finance.manage') ? html`<button class="btn small" id="addBill">+ Bill</button>` : ''}</section>` : ''}
    <section class="panel"><h3>Documents</h3>${G.fileList(c.files)}${c.users.length ? html`<p class="muted">App logins: ${c.users.map(u => u.login).join(', ')}</p>` : html`<p class="muted">No app login linked. Create a Contractor user in Admin → Users.</p>`}</section>`,
  html`${G.can('contractors.manage') ? html`<button class="btn" id="editC">${t('edit')}</button><button class="btn primary" id="assignC">Assign to project</button>` : ''}`), (root) => {
    G.on(root, 'tr.link', 'click', (e, el) => { location.hash = el.dataset.href; });
    const e1 = root.querySelector('#editC'); if (e1) e1.onclick = () => contractorForm(c);
    const as = root.querySelector('#assignC'); if (as) as.onclick = () => G.form({ title: 'Assign / update work order', fields: [
      { name: 'project_id', label: t('project'), type: 'select', required: true, options: G.projectOpts(), value: G.state.project },
      { name: 'work_order', label: 'Work order no.', half: true }, { name: 'scope', label: 'Scope of work', half: true },
      { name: 'rate', label: 'Agreed rate (₹)', type: 'number', half: true, when: G.can('finance.view') }, { name: 'rate_unit', label: 'Measurement unit', half: true, list: ['cum', 'sqft', 'sqm', 'rmt', 'nos', 'lumpsum', 'day'] },
      { name: 'start_date', label: t('start_date'), type: 'date', half: true }, { name: 'end_date', label: 'Completion date', type: 'date', half: true }],
      submit: async (v) => { await G.post(`/contractors/${c.id}/assign`, v); G.cache = {}; G.toast('Assigned'); G.router(); } });
    const ab = root.querySelector('#addBill'); if (ab) ab.onclick = () => G.form({ title: 'Record bill', fields: [{ name: 'project_id', label: t('project'), type: 'select', required: true, options: c.assignments.map(a => ({ value: a.project_id, label: a.project_name })) }, { name: 'bill_no', label: 'Bill no.', required: true, half: true }, { name: 'bill_date', label: 'Bill date', type: 'date', value: G.today(), half: true }, { name: 'amount', label: 'Amount (₹)', type: 'number', required: true }, { name: 'remarks', label: 'Remarks' }],
      submit: async (v) => { await G.post(`/contractors/${c.id}/bills`, v); G.toast('Bill recorded'); G.router(); } });
    G.on(root, '[data-pay]', 'click', (e, b) => G.form({ title: 'Update payment', fields: [{ name: 'paid_amount', label: 'Total paid (₹)', type: 'number', value: b.dataset.paid, required: true }, { name: 'remarks', label: 'Remarks' }], submit: async (v) => { await G.put('/bills/' + b.dataset.pay, v); G.toast('Updated'); G.router(); } }));
  });
});

// ================= FILES =================
G.route('/files', async () => {
  if (!G.state.project) { const n = await G.needProject('/files'); return n; }
  const p = G.params(); const pid = G.state.project;
  const folders = await G.get('/folders?project_id=' + pid);
  const fid = p.folder || ''; const cur = folders.find(f => String(f.id) === fid);
  const files = await G.get('/files' + G.qs({ project_id: pid, folder_id: fid || undefined, search: p.search, kind: p.kind, from: p.from, to: p.to, ...(fid || p.search || p.kind ? {} : { folder_id: -1 }) })).catch(() => []);
  const sub = folders.filter(f => String(f.parent_id || '') === fid);
  const crumbs = []; let c = cur; while (c) { crumbs.unshift(c); c = folders.find(f => f.id === c.parent_id); }
  const ext = (n) => (n.split('.').pop() || '').toLowerCase();
  return G.mount(G.page(t('files'), html`
    <div class="crumbs"><a href="#/files">${G.projectName(pid)}</a>${crumbs.map(x => html` › <a href="#/files?folder=${x.id}">${x.name}</a>`)}</div>
    <div id="flt"></div>
    ${sub.length ? html`<div class="folders">${sub.map(f => html`<a class="folder" href="#/files?folder=${f.id}">🗀 ${f.name} <small>${f.n}</small>${JSON.parse(f.allowed_roles || '[]').length ? html`<span class="badge amber">restricted</span>` : ''}</a>`)}</div>` : ''}
    ${files.length ? html`<div class="tbl-wrap"><table class="tbl"><tr><th>Name</th><th>Type</th><th>Uploaded by</th><th>Date</th><th>Version</th><th></th></tr>${files.map(f => html`<tr><td>${f.kind === 'live_photo' ? '📷' : '📄'} <a href="${G.fileUrl(f.id)}" target="_blank" rel="noopener">${f.name}</a>${f.entity && f.entity !== 'deleted' ? html`<div class="muted">linked: ${f.entity.replace('_', ' ')} #${f.entity_id || ''}</div>` : ''}</td><td>${ext(f.name)}${['dwg', 'dxf'].includes(ext(f.name)) ? html`<div class="muted">open in CAD viewer</div>` : ''}</td><td>${f.uploader}</td><td>${G.fmtDT(f.uploaded_at)}</td>
      <td>v${f.version} ${f.version > 1 ? html`<button class="btn small ghost" data-ver="${f.id}">history</button>` : ''}</td><td><a class="btn small ghost" href="${G.fileUrl(f.id, 1)}">⇩</a>${G.can('files.upload') ? html`<button class="btn small ghost" data-newver="${f.id}">New version</button>` : ''}</td></tr>`)}</table></div>` : G.empty(fid ? 'Folder is empty.' : 'Open a folder or search to see files.')}`,
  html`${G.can('files.upload') && fid ? html`<label class="btn primary">⇪ Upload<input type="file" id="up" multiple hidden></label>` : ''}${G.can('files.manage') ? html`<button class="btn" id="newF">+ Folder</button>${cur ? html`<button class="btn ghost" id="permF">Access</button>` : ''}` : ''}`), (root) => {
    root.querySelector('#flt').appendChild(G.filterBar([{ name: 'search', label: t('search') + ' files' }, { name: 'kind', label: 'Type', type: 'select', options: [{ value: 'document', label: 'Documents' }, { value: 'live_photo', label: 'Live photos' }] }, { name: 'from', label: 'From', type: 'date' }, { name: 'to', label: 'To', type: 'date' }], p, (v) => G.setQuery('/files', { ...v, folder: fid })));
    const up = root.querySelector('#up'); if (up) up.onchange = () => G.act(() => G.uploadDocs([...up.files], { project_id: pid, folder_id: fid }), 'Uploaded');
    const nf = root.querySelector('#newF'); if (nf) nf.onclick = () => G.form({ title: 'New folder', fields: [{ name: 'name', label: 'Folder name', required: true }, { name: 'allowed_roles', label: 'Restrict to roles (leave empty = all project members)', type: 'multiselect', options: Object.entries(G.state.meta.roles).map(([k, v]) => ({ value: k, label: v })) }],
      submit: async (v) => { await G.post('/folders', { ...v, project_id: pid, parent_id: fid || null }); G.toast('Folder created'); G.router(); } });
    const pf = root.querySelector('#permF'); if (pf) pf.onclick = () => G.form({ title: 'Folder access: ' + cur.name, fields: [{ name: 'name', label: 'Name', value: cur.name, required: true }, { name: 'allowed_roles', label: 'Allowed roles (empty = all project members)', type: 'multiselect', value: JSON.parse(cur.allowed_roles || '[]'), options: Object.entries(G.state.meta.roles).map(([k, v]) => ({ value: k, label: v })) }],
      submit: async (v) => { await G.put('/folders/' + cur.id, v); G.toast('Saved'); G.router(); } });
    G.on(root, '[data-ver]', 'click', async (e, b) => { const vs = await G.get(`/files/${b.dataset.ver}/versions`); G.modal('Version history', html`<table class="tbl">${vs.map(v => html`<tr><td>v${v.version}</td><td><a href="${G.fileUrl(v.id)}" target="_blank" rel="noopener">${v.name}</a></td><td>${v.uploader}</td><td>${G.fmtDT(v.uploaded_at)}</td></tr>`)}</table>`); });
    G.on(root, '[data-newver]', 'click', (e, b) => { const i = document.createElement('input'); i.type = 'file'; i.onchange = () => G.act(() => G.uploadDocs([...i.files], { project_id: pid, folder_id: fid, replace_file_id: b.dataset.newver }), 'New version uploaded'); i.click(); });
  });
});

// ================= CHAT =================
G.route('/chat', async () => {
  const chats = await G.get('/chats');
  return G.mount(G.page(t('chat'), chats.length ? html`<div class="chat-list">${chats.map(c => html`<a class="chat-item" href="#/chat/${c.id}"><div class="row-between"><b>${c.kind === 'direct' ? c.others : c.name}</b>${c.unread ? html`<span class="badge red">${c.unread}</span>` : ''}</div><div class="muted">${c.last_body || '—'}</div><small>${c.kind} ${c.last_at ? '· ' + G.fmtDT(c.last_at) : ''}</small></a>`)}</div>` : G.empty(),
    html`<button class="btn primary" id="newDm">+ Direct message</button>`), (root) => {
    root.querySelector('#newDm').onclick = () => G.form({ title: 'Direct message', fields: [{ name: 'user_id', label: 'Person', type: 'select', required: true, options: G.userOpts(u => u.id !== G.state.me.user.id) }], submit: async (v) => { const r = await G.post('/chats/direct', v); location.hash = '#/chat/' + r.id; } });
  });
});
G.route('/chat/:id', async (id) => {
  const d = await G.get(`/chats/${id}/messages`);
  let last = d.messages.length ? d.messages[d.messages.length - 1].id : 0;
  const msg = (m) => html`<div class="msg ${m.user_id === G.state.me.user.id ? 'me' : ''} ${m.pinned ? 'pinned' : ''}" data-id="${m.id}"><b>${m.user_name}</b>${m.body ? html`<div class="pre">${m.body}</div>` : ''}${m.file_id ? html`<a href="${G.fileUrl(m.file_id)}" target="_blank" rel="noopener">${/image/.test(m.file_mime || '') ? html`<img src="${G.fileUrl(m.file_id)}" alt="">` : '📎 ' + m.file_name}</a>` : ''}<small>${G.fmtDT(m.created_at)} <button class="link-btn" data-pin="${m.id}">${m.pinned ? 'unpin' : 'pin'}</button></small></div>`;
  const title = d.chat.kind === 'direct' ? d.chat.members.filter(m => m.id !== G.state.me.user.id).map(m => m.name).join(', ') : d.chat.name;
  const root = G.mount(html`<div class="chat-page"><div class="page-head"><div><a href="#/chat" class="muted">‹ ${t('chat')}</a><h1>${title}</h1><div class="sub">${d.chat.members.length} members · type @name to mention</div></div></div>
    ${d.pinned.length ? html`<div class="pinned-box">📌 ${d.pinned.map(p => html`<div><b>${p.user_name}:</b> ${p.body}</div>`)}</div>` : ''}
    <div class="msgs" id="msgs">${d.messages.map(msg)}</div>
    <form class="composer" id="comp"><label class="icon-btn" title="Attach">📎<input type="file" id="att" hidden></label><textarea name="body" rows="1" placeholder="Message…"></textarea><button class="btn primary">Send</button></form></div>`, (r) => {
    const box = r.querySelector('#msgs'); box.scrollTop = box.scrollHeight;
    const pinBind = () => G.on(r, '[data-pin]:not([data-b])', 'click', (e, b) => { b.dataset.b = 1; G.act(() => G.post(`/messages/${b.dataset.pin}/pin`, {})); });
    pinBind();
    const poll = async () => {
      if (!document.body.contains(box)) return;
      try { const n = await G.get(`/chats/${id}/messages?after=${last}`); if (n.messages.length) { box.insertAdjacentHTML('beforeend', n.messages.map(m => String(msg(m))).join('')); last = n.messages[n.messages.length - 1].id; box.scrollTop = box.scrollHeight; pinBind(); } } catch { /* offline */ }
      setTimeout(poll, 4000);
    };
    setTimeout(poll, 4000);
    const f = r.querySelector('#comp');
    f.onsubmit = async (e) => { e.preventDefault(); const body = f.body.value.trim(); if (!body) return; try { await G.post(`/chats/${id}/messages`, { body }); f.body.value = ''; const n = await G.get(`/chats/${id}/messages?after=${last}`); box.insertAdjacentHTML('beforeend', n.messages.map(m => String(msg(m))).join('')); if (n.messages.length) last = n.messages[n.messages.length - 1].id; box.scrollTop = box.scrollHeight; pinBind(); } catch (ex) { G.toast(ex.message, 'err'); } };
    f.body.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); f.requestSubmit(); } });
    r.querySelector('#att').onchange = async (e) => { try { const [fid] = await G.uploadDocs([...e.target.files], { project_id: d.chat.project_id || '', entity: 'chat' }); await G.post(`/chats/${id}/messages`, { file_id: fid }); G.router(); } catch (ex) { G.toast(ex.message, 'err'); } };
  });
  return root;
});

// ================= MEETINGS =================
G.route('/meetings', async () => {
  const list = await G.get('/meetings' + G.qs({ project_id: G.state.project }));
  const now = new Date().toISOString().slice(0, 16);
  const up = list.filter(m => m.starts_at >= now).reverse(); const past = list.filter(m => m.starts_at < now);
  const card = (m) => html`<a class="card link" href="#/meetings/${m.id}"><b>${m.title}</b><div class="muted">${G.fmtDT(m.starts_at)} · ${m.project_name || 'Company'} · ${m.location || (m.video_link ? 'Video meeting' : '')}</div>${m.minutes ? html`<span class="badge green">minutes</span>` : ''}</a>`;
  return G.mount(G.page(t('meetings'), html`<h2>Upcoming</h2>${up.length ? html`<div class="cards">${up.map(card)}</div>` : G.empty()}<h2>Past</h2>${past.length ? html`<div class="cards">${past.map(card)}</div>` : G.empty()}`,
    G.can('meetings.manage') ? html`<button class="btn primary" id="newM">+ Schedule meeting</button>` : ''), (root) => { const b = root.querySelector('#newM'); if (b) b.onclick = () => meetingForm(); });
});
async function meetingForm(m) {
  const pid = m ? m.project_id : G.state.project;
  const members = pid ? (await G.projectDetail(pid)).members.map(u => ({ value: u.id, label: u.name })) : G.userOpts();
  G.form({ title: m ? t('edit') : 'Schedule meeting', fields: [
    { name: 'title', label: t('title'), required: true, value: m && m.title }, { name: 'project_id', label: t('project'), type: 'select', options: G.projectOpts(), value: pid, when: !m },
    { name: 'starts_at', label: 'Date & time', type: 'datetime', required: true, value: m && m.starts_at, half: true }, { name: 'location', label: 'Location', value: m && m.location, half: true },
    { name: 'video_link', label: 'Video meeting link (https://…)', value: m && m.video_link, hint: 'Paste a Google Meet / Zoom / Teams link. In-app calling needs a provider configured by admin.' },
    { name: 'attendees', label: 'Attendees', type: 'multiselect', options: members, value: m ? m.attendees : [] },
    { name: 'agenda', label: 'Agenda', type: 'textarea', value: m && m.agenda },
  ], submit: async (v) => { if (m) { await G.put('/meetings/' + m.id, v); G.router(); } else { const r = await G.post('/meetings', v); location.hash = '#/meetings/' + r.id; } G.toast('Saved & attendees notified'); } });
}
G.route('/meetings/:id', async (id) => {
  const m = await G.get('/meetings/' + id);
  const canManage = G.can('meetings.manage');
  return G.mount(G.page(m.title, html`
    <section class="panel"><dl class="dl"><dt>When</dt><dd>${G.fmtDT(m.starts_at)}</dd><dt>${t('project')}</dt><dd>${m.project_name || 'Company-wide'}</dd><dt>Location</dt><dd>${m.location || '—'}</dd>
      <dt>Video</dt><dd>${m.video_link ? html`<a href="${m.video_link}" target="_blank" rel="noopener noreferrer" class="btn small primary">Join video meeting</a>` : m.video_configured ? 'Not added' : html`<span class="muted">No link. Integrated calling is not configured (Admin → Integrations).</span>`}</dd>
      <dt>Attendees</dt><dd>${m.attendee_names.map(a => a.name).join(', ')}</dd></dl></section>
    <section class="panel"><h3>Agenda</h3><p class="pre">${m.agenda || '—'}</p></section>
    <section class="panel"><h3>Minutes</h3>${canManage ? html`<textarea id="mins" rows="6">${m.minutes || ''}</textarea><button class="btn small primary" id="saveMins">Save & publish minutes</button>` : html`<p class="pre">${m.minutes || 'Not yet published'}</p>`}</section>
    <section class="panel"><h3>Action items → tasks</h3>${m.actions.length ? html`<table class="tbl">${m.actions.map(a => html`<tr class="link" data-href="#/tasks/${a.id}"><td>${a.title}</td><td>${a.assignee_name || ''}</td><td>${G.fmtDate(a.due_date)}</td><td>${G.badge(a.status)}</td></tr>`)}</table>` : G.empty()}
      ${canManage && m.project_id ? html`<button class="btn small" id="addAct">+ Action item</button>` : ''}</section>`, canManage ? html`<button class="btn" id="editM">${t('edit')}</button>` : ''), (root) => {
    G.on(root, 'tr.link', 'click', (e, el) => { location.hash = el.dataset.href; });
    const s = root.querySelector('#saveMins'); if (s) s.onclick = () => G.act(() => G.put('/meetings/' + m.id, { minutes: root.querySelector('#mins').value }), 'Minutes saved');
    const e = root.querySelector('#editM'); if (e) e.onclick = () => meetingForm(m);
    const a = root.querySelector('#addAct'); if (a) a.onclick = async () => { const mem = (await G.projectDetail(m.project_id)).members; G.form({ title: 'Action item', fields: [{ name: 'title', label: 'Action', required: true }, { name: 'assignee_id', label: 'Responsible', type: 'select', required: true, options: mem.map(u => ({ value: u.id, label: u.name })) }, { name: 'due_date', label: t('due_date'), type: 'date' }, { name: 'priority', label: t('priority'), type: 'select', options: ['low', 'medium', 'high', 'urgent'].map(x => ({ value: x, label: x })), value: 'medium' }],
      submit: async (v) => { await G.post(`/meetings/${m.id}/actions`, v); G.toast('Task created'); G.router(); } }); };
  });
});
})();
