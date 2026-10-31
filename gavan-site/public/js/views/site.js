/* Daily reports (morning/evening), labour attendance, work planning */
(() => {
'use strict';
const { html, raw, t } = G;
const TRADES = ['Mason', 'Helper', 'Carpenter', 'Bar bender', 'Shuttering', 'Plumber', 'Electrician', 'Painter', 'Tiler', 'Welder', 'Fabricator', 'Waterproofing', 'Operator', 'Unskilled labour'];
const UNITS = ['cum', 'sqm', 'sqft', 'rmt', 'nos', 'MT', 'kg', 'bags', 'brass', 'points', 'ls'];

// pick project first for forms that depend on project structure
async function needProject(base) {
  if (G.state.project) return Number(G.state.project);
  const d = G.mount(G.page(t('select_project'), html`<div class="cards">${G.projects().map(p => html`<a class="card link" href="#" data-p="${p.id}"><b>${p.name}</b> ${G.sampleTag(p)}<div class="muted">${p.type}</div></a>`)}</div>`), (root) => {
    G.on(root, '[data-p]', 'click', (e, el) => { e.preventDefault(); G.state.project = el.dataset.p; localStorage.setItem('gs_project', el.dataset.p); document.getElementById('projSel').value = el.dataset.p; location.hash = '#' + base + '?t=' + Date.now(); });
  });
  return d;
}
G.needProject = needProject;

async function projectCtx(pid) {
  try { return await G.projectDetail(pid); }
  catch (e) { if (!e.network) throw e; const p = G.state.me.projects.find(x => x.id === pid); return { ...p, locations: [], workItems: [], contractors: [], members: [], offlineCtx: true }; }
}

// ---------------- hub ----------------
G.route('/report', async () => {
  const p = G.params();
  const rows = G.can('reports.view') ? await G.get('/reports' + G.qs({ project_id: G.state.project, kind: p.kind, from: p.from, to: p.to, contractor_id: p.contractor_id, user_id: p.user_id })) : await G.get('/reports/mine');
  const page = G.mount(G.page(t('daily_report'), html`
    ${G.can('reports.submit') ? html`<div class="quick"><a class="qbtn" href="#/report/new/morning"><span>☀</span>${t('new_morning')}</a><a class="qbtn" href="#/report/new/evening"><span>☾</span>${t('new_evening')}</a></div>` : ''}
    <div id="flt"></div>
    ${rows.length ? html`<div class="cards">${rows.map(r => html`<a class="card link" href="#/reports/${r.id}"><div class="row-between"><b>${r.kind === 'morning' ? '☀ ' + t('morning_report') : '☾ ' + t('evening_report')}</b>${G.sampleTag(r)}</div>
      <div>${r.project_name}${r.location ? ' · ' + r.location : ''}${r.contractor_name ? ' · ' + r.contractor_name : ''}</div>
      <div class="muted">${G.fmtDate(r.report_date)} ${r.report_time || ''} · ${r.submitted_by_name}${r.captured_offline ? ' · ⇅ offline' : ''}${r.version > 1 ? ' · edited' : ''}</div></a>`)}</div>` : G.empty()}`));
  if (G.can('reports.view')) {
    page.querySelector('#flt').appendChild(G.filterBar([{ name: 'kind', label: 'Type', type: 'select', options: [{ value: 'morning', label: 'Morning' }, { value: 'evening', label: 'Evening' }] },
      { name: 'contractor_id', label: t('contractor'), type: 'select', options: G.contractorOpts() }, { name: 'user_id', label: 'Submitted by', type: 'select', options: G.userOpts(u => u.role === 'supervisor' || u.role === 'site_engineer') },
      { name: 'from', label: 'From', type: 'date' }, { name: 'to', label: 'To', type: 'date' }], p, (v) => G.setQuery('/report', v)));
  }
  return page;
});

// ---------------- morning ----------------
function morningFields(ctx, v = {}) {
  const wi = ctx.workItems.map(w => ({ value: w.id, label: `${w.name}${w.location ? ' — ' + w.location : ''} (${w.unit || ''})` }));
  return [
    { name: 'location_id', label: t('location'), type: 'select', options: ctx.locations.map(l => ({ value: l.id, label: l.path })), value: v.location_id, half: true },
    { name: 'contractor_id', label: t('contractor'), type: 'select', options: ctx.contractors.map(c => ({ value: c.contractor_id, label: `${c.name} (${c.trade || ''})` })), value: v.contractor_id, half: true },
    { name: 'report_date', label: t('date'), type: 'date', value: v.report_date || G.today(), required: true, half: true },
    { name: 'report_time', label: t('time'), type: 'time', value: v.report_time || new Date().toTimeString().slice(0, 5), half: true },
    { name: 'labour', label: t('labour_count'), type: 'rows', value: v.labour, columns: [{ name: 'trade', label: t('trade'), list: TRADES, wide: true }, { name: 'count', label: t('count'), type: 'number' }] },
    { name: 'planned_work', label: t('planned_work'), type: 'rows', required: true, value: v.planned_work, columns: [...(wi.length ? [{ name: 'work_item_id', label: 'Work item', type: 'select', options: wi, wide: true }] : []), { name: 'description', label: t('description'), wide: true }, { name: 'qty', label: t('qty'), type: 'number' }, { name: 'unit', label: t('unit'), list: UNITS }],
      onRowChange: (r, e) => { if (e.target.dataset.k === 'work_item_id') { const w = ctx.workItems.find(x => String(x.id) === e.target.value); if (w) { const d = r.querySelector('[data-k=description]'); if (!d.value) d.value = w.name; r.querySelector('[data-k=unit]').value = w.unit || ''; } } } },
    { name: 'materials', label: t('material_req'), type: 'rows', value: v.materials, columns: [{ name: 'name', label: t('name'), wide: true }, { name: 'required', label: t('required'), type: 'number' }, { name: 'available', label: t('available'), type: 'number' }, { name: 'unit', label: t('unit'), list: UNITS }] },
    { name: 'machinery', label: t('machinery'), type: 'rows', value: v.machinery, minRows: 0, columns: [{ name: 'name', label: t('name'), wide: true }, { name: 'required', label: t('required'), type: 'number' }, { name: 'available', label: t('available'), type: 'number' }] },
    { name: 'drawings_available', label: t('drawing_avail'), type: 'select', options: [{ value: 'yes', label: 'Yes — all required drawings at site' }, { value: 'partial', label: 'Partial' }, { value: 'no', label: 'No' }], value: v.drawings_available, half: true },
    { name: 'expected_completion', label: t('expected_completion'), type: 'time', value: v.expected_completion, half: true },
    { name: 'problems', label: t('problems'), type: 'textarea', value: v.problems },
  ];
}
function eveningFields(ctx, v = {}, morning) {
  const wi = ctx.workItems.map(w => ({ value: w.id, label: `${w.name} (${w.unit || ''})` }));
  const cOpts = ctx.contractors.map(c => ({ value: c.contractor_id, label: c.name }));
  return [
    { name: 'location_id', label: t('location'), type: 'select', options: ctx.locations.map(l => ({ value: l.id, label: l.path })), value: v.location_id ?? (morning && morning.location_id), half: true },
    { name: 'contractor_id', label: t('contractor'), type: 'select', options: cOpts, value: v.contractor_id ?? (morning && morning.contractor_id), half: true },
    { name: 'report_date', label: t('date'), type: 'date', value: v.report_date || (morning && morning.report_date) || G.today(), required: true, half: true },
    { name: 'report_time', label: t('time'), type: 'time', value: v.report_time || new Date().toTimeString().slice(0, 5), half: true },
    { name: 'work', label: t('work_progress'), type: 'rows', required: true, value: v.work || (morning ? (morning.data.planned_work || []).map(w => ({ work_item_id: w.work_item_id, description: w.description, planned_qty: w.qty, unit: w.unit })) : []),
      columns: [...(wi.length ? [{ name: 'work_item_id', label: 'Work item', type: 'select', options: wi, wide: true }] : []), { name: 'description', label: t('description'), wide: true }, { name: 'planned_qty', label: t('planned'), type: 'number' }, { name: 'actual_qty', label: t('actual'), type: 'number' }, { name: 'unit', label: t('unit'), list: UNITS }, { name: 'pending', label: t('pending') }, { name: 'delay_reason', label: t('delay_reason'), wide: true }] },
    { name: 'labour', label: t('labour_att'), type: 'rows', value: v.labour || (morning ? (morning.data.labour || []).map(l => ({ trade: l.trade, planned: l.count, skilled: '', unskilled: '', hours: 8 })) : []),
      columns: [{ name: 'trade', label: t('trade'), list: TRADES, wide: true }, ...(cOpts.length > 1 ? [{ name: 'contractor_id', label: t('contractor'), type: 'select', options: cOpts }] : []), { name: 'planned', label: t('planned'), type: 'number' }, { name: 'skilled', label: t('skilled'), type: 'number' }, { name: 'unskilled', label: t('unskilled'), type: 'number' }, { name: 'hours', label: t('hours'), type: 'number', value: 8 }, { name: 'overtime', label: t('overtime'), type: 'number' }] },
    { name: 'materials_consumed', label: t('material_used'), type: 'rows', minRows: 0, value: v.materials_consumed, hint: 'Consumption is deducted from site stock.', columns: [{ name: 'name', label: t('name'), wide: true }, { name: 'qty', label: t('qty'), type: 'number' }, { name: 'unit', label: t('unit'), list: UNITS }] },
    { name: 'quality_checks', label: t('quality_checks'), type: 'textarea', rows: 2, value: v.quality_checks },
    { name: 'safety', label: t('safety'), type: 'textarea', rows: 2, value: v.safety },
    { name: 'tomorrow_plan', label: t('tomorrow_plan'), type: 'textarea', rows: 2, value: v.tomorrow_plan },
    { name: 'tomorrow_labour', label: t('tomorrow_labour'), value: v.tomorrow_labour, half: true },
    { name: 'tomorrow_materials', label: t('tomorrow_material'), value: v.tomorrow_materials, half: true },
  ];
}
const META_KEYS = ['location_id', 'contractor_id', 'report_date', 'report_time', 'photos', 'reason'];
const toData = (v) => { const d = {}; Object.keys(v).filter(k => !META_KEYS.includes(k)).forEach(k => { d[k] = v[k]; }); return d; };

G.route('/report/new/:kind', async (kind) => {
  if (!['morning', 'evening'].includes(kind)) throw new Error('Unknown report');
  const pid = await needProject('/report/new/' + kind);
  if (pid instanceof Node) return pid;
  const ctx = await projectCtx(pid);
  const p = G.params();
  let morning = null, mornings = [];
  if (kind === 'evening') {
    try { mornings = await G.get('/reports-open-mornings' + G.qs({ project_id: pid })); } catch (e) { if (!e.network) throw e; }
    if (p.morning) morning = mornings.find(m => String(m.id) === p.morning) || null;
    else if (mornings.length === 1) morning = mornings[0];
  }
  const clientUuid = G.uuid();
  const root = G.mount(G.page(kind === 'morning' ? t('morning_report') : t('evening_report'), html`
    ${ctx.offlineCtx ? html`<div class="info-box warn">Offline — project locations/contractors could not be loaded. You can still fill and save the report; it will upload when online.</div>` : ''}
    ${kind === 'evening' && mornings.length ? html`<div class="field"><label>${t('link_morning')}</label><select id="mlink"><option value="">— None (unplanned work) —</option>${mornings.map(m => html`<option value="${m.id}" ${morning && morning.id === m.id ? 'selected' : ''}>${G.fmtDate(m.report_date)} · ${m.location || '—'} · ${m.contractor_name || '—'} · ${(m.data.planned_work || []).length} items</option>`)}</select><div class="hint">Planned work and labour are copied from the morning plan so you only enter actuals.</div></div>` : ''}
    <div id="formHost"></div>`, '', G.projectName(pid)), (r) => {
    const sel = r.querySelector('#mlink');
    if (sel) sel.onchange = () => { location.hash = `#/report/new/evening?morning=${sel.value}&t=${Date.now()}`; };
    const fields = [...(kind === 'morning' ? morningFields(ctx) : eveningFields(ctx, {}, morning)), { name: 'photos', label: t('site_photos'), type: 'photos', meta: () => ({ project_id: pid, entity: 'daily_report' }) }];
    const build = (v) => ({ client_uuid: clientUuid, kind, project_id: pid, location_id: v.location_id, contractor_id: v.contractor_id, report_date: v.report_date, report_time: v.report_time, morning_id: morning ? morning.id : null, data: toData(v) });
    G.form({ inline: r.querySelector('#formHost'), fields, submitLabel: t('submit'),
      submit: async (v) => {
        const photo_ids = await G.ensurePhotos(v.photos, { project_id: pid });
        const res = await G.post('/reports', { ...build(v), photo_ids });
        G.toast(res.duplicate ? 'Already submitted' : 'Report submitted'); G.cache = {}; location.hash = '#/reports/' + res.id;
      },
      offline: async (v) => { await G.queue.add({ label: `${kind} report · ${G.projectName(pid)} · ${v.report_date}`, url: '/reports', body: build(v), photos: v.photos, photoKey: 'photo_ids', photoMeta: { project_id: pid } }); location.hash = '#/sync'; },
    });
  });
  return root;
});

G.route('/reports/:id', async (id) => {
  const r = await G.get('/reports/' + id);
  const d = r.data;
  const rowsTbl = (rows, cols) => (rows && rows.length ? html`<div class="tbl-wrap"><table class="tbl"><tr>${cols.map(c => html`<th>${c[1]}</th>`)}</tr>${rows.map(x => html`<tr>${cols.map(c => html`<td>${c[2] ? c[2](x) : x[c[0]]}</td>`)}</tr>`)}</table></div>` : html`<p class="muted">—</p>`);
  const canEdit = G.can('reports.submit') && (r.submitted_by === G.state.me.user.id || G.can('tasks.review'));
  return G.mount(G.page(html`${r.kind === 'morning' ? '☀ ' + t('morning_report') : '☾ ' + t('evening_report')} ${G.sampleTag(r)}`, html`
    <section class="panel"><dl class="dl">
      <dt>${t('project')}</dt><dd>${r.project_name}</dd><dt>${t('location')}</dt><dd>${r.location || '—'}</dd><dt>${t('contractor')}</dt><dd>${r.contractor_name || '—'}</dd>
      <dt>${t('date')}</dt><dd>${G.fmtDate(r.report_date)} ${r.report_time || ''}</dd><dt>Submitted</dt><dd>${r.submitted_by_name} · server time ${G.fmtDT(r.submitted_at)}${r.captured_offline ? ' · captured offline' : ''}</dd>
      ${r.morning_id ? html`<dt>Morning plan</dt><dd><a href="#/reports/${r.morning_id}">#${r.morning_id}</a></dd>` : ''}${r.evening ? html`<dt>Evening update</dt><dd><a href="#/reports/${r.evening.id}">#${r.evening.id}</a></dd>` : ''}
    </dl></section>
    ${r.kind === 'morning' ? html`
      <section class="panel"><h3>${t('labour_count')}</h3>${rowsTbl(d.labour, [['trade', t('trade')], ['count', t('count')]])}</section>
      <section class="panel"><h3>${t('planned_work')}</h3>${rowsTbl(d.planned_work, [['description', t('description')], ['qty', t('qty')], ['unit', t('unit')]])}</section>
      <section class="panel"><h3>${t('material_req')}</h3>${rowsTbl(d.materials, [['name', t('name')], ['required', t('required')], ['available', t('available'), (x) => html`<span class="${Number(x.available) < Number(x.required) ? 'red-text' : ''}">${x.available}</span>`], ['unit', t('unit')]])}</section>
      <section class="panel"><h3>${t('machinery')}</h3>${rowsTbl(d.machinery, [['name', t('name')], ['required', t('required')], ['available', t('available')]])}</section>
      <section class="panel"><dl class="dl"><dt>${t('drawing_avail')}</dt><dd>${d.drawings_available || '—'}</dd><dt>${t('expected_completion')}</dt><dd>${d.expected_completion || '—'}</dd><dt>${t('problems')}</dt><dd>${d.problems || '—'}</dd></dl></section>`
    : html`
      <section class="panel"><h3>${t('work_progress')}</h3>${rowsTbl(d.work, [['description', t('description')], ['planned_qty', t('planned')], ['actual_qty', t('actual')], ['unit', t('unit')], ['pending', t('pending')], ['delay_reason', t('delay_reason'), (x) => html`<span class="red-text">${x.delay_reason || ''}</span>`]])}</section>
      <section class="panel"><h3>${t('labour_att')}</h3>${rowsTbl(d.labour, [['trade', t('trade')], ['planned', t('planned')], ['skilled', t('skilled')], ['unskilled', t('unskilled')], ['hours', t('hours')], ['overtime', t('overtime')]])}</section>
      <section class="panel"><h3>${t('material_used')}</h3>${rowsTbl(d.materials_consumed, [['name', t('name')], ['qty', t('qty')], ['unit', t('unit')]])}</section>
      <section class="panel"><dl class="dl"><dt>${t('quality_checks')}</dt><dd>${d.quality_checks || '—'}</dd><dt>${t('safety')}</dt><dd>${d.safety || '—'}</dd><dt>${t('tomorrow_plan')}</dt><dd>${d.tomorrow_plan || '—'}</dd><dt>${t('tomorrow_labour')}</dt><dd>${d.tomorrow_labour || '—'}</dd><dt>${t('tomorrow_material')}</dt><dd>${d.tomorrow_materials || '—'}</dd></dl></section>`}
    <section class="panel"><h3>${t('site_photos')}</h3>${G.photoGallery(r.photos)}</section>
    ${r.edits.length ? html`<section class="panel"><h3>Edit history</h3>${r.edits.map(e => html`<div class="hist"><b>${e.editor}</b> · ${G.fmtDT(e.edited_at)}<div>Reason: ${e.reason}</div><details><summary>Changes</summary>${G.diff(e.before_data, e.after_data)}</details></div>`)}</section>` : ''}
  `, html`${r.kind === 'morning' && !r.evening && G.can('reports.submit') ? html`<a class="btn primary" href="#/report/new/evening?morning=${r.id}">☾ ${t('new_evening')}</a>` : ''}${canEdit ? html`<button class="btn" id="editRep">${t('edit')}</button>` : ''}`), (root) => {
    const b = root.querySelector('#editRep');
    if (b) b.onclick = async () => {
      const ctx = await G.projectDetail(r.project_id);
      const fields = [...(r.kind === 'morning' ? morningFields(ctx, { ...d, location_id: r.location_id, contractor_id: r.contractor_id, report_date: r.report_date, report_time: r.report_time }) : eveningFields(ctx, { ...d, location_id: r.location_id, contractor_id: r.contractor_id, report_date: r.report_date, report_time: r.report_time }))
        .filter(f => !['location_id', 'contractor_id', 'report_date', 'report_time'].includes(f.name)), { name: 'reason', label: 'Reason for correction', required: true }];
      G.form({ title: 'Correct report (edit history is kept)', fields, wide: true, submit: async (v) => { await G.put('/reports/' + r.id, { data: toData(v), version: r.version, reason: v.reason }); G.toast('Report corrected'); G.cache = {}; G.router(); } });
    };
  });
});

G.diff = (a, b) => {
  const out = [];
  const keys = [...new Set([...Object.keys(a || {}), ...Object.keys(b || {})])];
  keys.forEach(k => { const x = JSON.stringify((a || {})[k]); const y = JSON.stringify((b || {})[k]); if (x !== y) out.push(html`<div class="diff"><b>${k}</b><div class="old">${x || '—'}</div><div class="new">${y || '—'}</div></div>`); });
  return out.length ? html`${out}` : html`<p class="muted">No data changes</p>`;
};
G.photoGallery = (photos) => (photos && photos.length ? html`<div class="gallery">${photos.map(p => html`<a href="${G.fileUrl(p.id)}" target="_blank" rel="noopener" class="gph">${/image|jpe?g|png|webp/i.test(p.mime || p.name || '') || p.kind === 'live_photo' ? html`<img src="${G.fileUrl(p.id)}" loading="lazy" alt="">` : html`<div class="fileicon">📄</div>`}
  <small>${p.kind === 'live_photo' ? html`<span class="badge green">LIVE</span> ${p.captured_at ? 'Captured ' + G.fmtDT(p.captured_at) : ''} · uploaded ${G.fmtDT(p.uploaded_at)} · ${p.gps_lat ? html`<span>📍 ${Number(p.gps_lat).toFixed(5)}, ${Number(p.gps_lng).toFixed(5)} ±${p.gps_accuracy || '?'}m</span>` : html`<span class="red-text">GPS missing</span>`}${p.captured_offline ? html` · <span class="amber-text">captured offline</span>` : ''}` : html`<span class="badge grey">DOCUMENT</span> ${p.name}`}</small></a>`)}</div>` : html`<p class="muted">No photos</p>`);

// ---------------- labour attendance ----------------
G.route('/labour', async () => {
  const p = G.params();
  const from = p.from || G.today(); const to = p.to || G.today();
  const rows = await G.get('/attendance' + G.qs({ project_id: G.state.project, from, to, contractor_id: p.contractor_id }));
  const tot = rows.reduce((s, r) => ({ skilled: s.skilled + r.skilled, unskilled: s.unskilled + r.unskilled, planned: s.planned + r.planned, ot: s.ot + (r.overtime || 0) }), { skilled: 0, unskilled: 0, planned: 0, ot: 0 });
  const root = G.mount(G.page(t('labour'), html`
    <div id="flt"></div>
    <div class="kpis small"><div class="kpi"><div class="kv">${tot.skilled + tot.unskilled}</div><div class="kl">Present (man-days)</div></div><div class="kpi"><div class="kv">${tot.planned}</div><div class="kl">${t('planned')}</div></div>
      <div class="kpi ${tot.planned && tot.skilled + tot.unskilled < tot.planned ? 'warn' : ''}"><div class="kv">${tot.planned ? Math.round(100 * (tot.skilled + tot.unskilled) / tot.planned) + '%' : '—'}</div><div class="kl">Actual vs planned</div></div><div class="kpi"><div class="kv">${tot.ot}</div><div class="kl">${t('overtime')}</div></div></div>
    ${rows.length ? html`<div class="tbl-wrap"><table class="tbl"><tr><th>${t('date')}</th><th>${t('project')}</th><th>${t('contractor')}</th><th>${t('trade')}</th><th>${t('location')}</th><th>${t('planned')}</th><th>${t('skilled')}</th><th>${t('unskilled')}</th><th>${t('hours')}</th><th>OT</th><th>Qty done</th><th>Tomorrow</th><th></th></tr>
      ${rows.map(r => html`<tr><td>${G.fmtDate(r.att_date)}</td><td>${r.project_name}</td><td>${r.contractor_name || '—'}</td><td>${r.trade}</td><td>${r.location}</td><td>${r.planned}</td><td>${r.skilled}</td><td>${r.unskilled}</td><td>${r.hours}</td><td>${r.overtime}</td><td>${r.qty_done != null ? r.qty_done + ' ' + (r.qty_unit || '') : ''}</td><td>${r.tomorrow_required ?? ''}</td>
      <td>${String(r.client_uuid || '').startsWith('rep-') ? html`<small class="muted">from report</small>` : html`<button class="icon-btn" data-del="${r.id}" title="${t('delete')}">✕</button>`}</td></tr>`)}</table></div>` : G.empty('No attendance recorded for this period.')}`,
  html`<button class="btn primary" id="newAtt">+ ${t('record_attendance')}</button>`, `${G.fmtDate(from)} – ${G.fmtDate(to)}`), (r) => {
    r.querySelector('#flt').appendChild(G.filterBar([{ name: 'contractor_id', label: t('contractor'), type: 'select', options: G.contractorOpts() }, { name: 'from', label: 'From', type: 'date' }, { name: 'to', label: 'To', type: 'date' }], { ...p, from, to }, (v) => G.setQuery('/labour', v)));
    r.querySelector('#newAtt').onclick = () => attendanceForm();
    G.on(r, '[data-del]', 'click', async (e, b) => { if (await G.confirm('Delete this attendance entry?', t('delete'))) G.act(() => G.del('/attendance/' + b.dataset.del), 'Deleted'); });
    if (p.new) attendanceForm();
  });
  return root;
});
async function attendanceForm() {
  if (!G.state.project) return G.toast(t('select_project'), 'warn');
  const pid = Number(G.state.project); const ctx = await projectCtx(pid);
  const cOpts = ctx.contractors.map(c => ({ value: c.contractor_id, label: c.name }));
  const lOpts = ctx.locations.map(l => ({ value: l.id, label: l.path }));
  G.form({ title: `${t('record_attendance')} — ${G.projectName(pid)}`, wide: true, fields: [
    { name: 'att_date', label: t('date'), type: 'date', value: G.today(), required: true, half: true },
    { name: 'location_id', label: t('location'), type: 'select', options: lOpts, half: true },
    { name: 'rows', label: 'Contractor & trade-wise attendance', type: 'rows', required: true, columns: [{ name: 'contractor_id', label: t('contractor'), type: 'select', options: cOpts }, { name: 'trade', label: t('trade'), list: TRADES }, { name: 'planned', label: t('planned'), type: 'number' }, { name: 'skilled', label: t('skilled'), type: 'number' }, { name: 'unskilled', label: t('unskilled'), type: 'number' }, { name: 'hours', label: t('hours'), type: 'number', value: 8 }, { name: 'overtime', label: 'OT', type: 'number' }, { name: 'qty_done', label: 'Qty done', type: 'number' }, { name: 'qty_unit', label: t('unit'), list: UNITS }, { name: 'tomorrow_required', label: 'Tomorrow', type: 'number' }] },
  ], submitLabel: t('save'),
  submit: async (v) => { await G.post('/attendance', { rows: v.rows.map(r => ({ ...r, client_uuid: G.uuid(), project_id: pid, att_date: v.att_date, location_id: v.location_id })) }); G.toast('Attendance saved'); G.router(); },
  offline: async (v) => { await G.queue.add({ label: `Attendance · ${G.projectName(pid)} · ${v.att_date}`, url: '/attendance', body: { rows: v.rows.map(r => ({ ...r, client_uuid: G.uuid(), project_id: pid, att_date: v.att_date, location_id: v.location_id })) } }); } });
}

// ---------------- plans ----------------
G.route('/plans', async () => {
  const p = G.params();
  const rows = await G.get('/plans' + G.qs({ project_id: G.state.project, period: p.period, from: p.from, to: p.to }));
  const groups = {};
  rows.forEach(r => { const k = `${r.period === 'daily' ? 'Day' : 'Week of'} ${G.fmtDate(r.period_start)}`; (groups[k] = groups[k] || []).push(r); });
  return G.mount(G.page(t('plans'), html`<div id="flt"></div>
    ${Object.keys(groups).length ? Object.entries(groups).map(([k, list]) => html`<section class="panel"><h3>${k}</h3><div class="tbl-wrap"><table class="tbl"><tr><th>Target</th><th>${t('project')}</th><th>${t('contractor')}</th><th>Responsible</th><th>Target qty</th><th>${t('actual')}</th><th>Deadline</th><th>Status</th><th>Reason / revised</th><th></th></tr>
      ${list.map(r => html`<tr><td>${r.title}${r.location ? html`<div class="muted">${r.location}</div>` : ''}</td><td>${r.project_name}</td><td>${r.contractor_name || '—'}</td><td>${r.responsible_name || '—'}</td><td>${r.target_qty ?? ''} ${r.unit || ''}</td><td>${r.actual_qty ?? ''}</td><td>${G.fmtDate(r.deadline)}</td><td>${G.badge(r.status)}</td><td>${r.reason || ''}${r.revised_date ? html`<div class="muted">Revised: ${G.fmtDate(r.revised_date)}</div>` : ''}</td>
      <td><button class="btn small" data-upd="${r.id}">${t('update_result')}</button></td></tr>`)}</table></div></section>`) : G.empty('No targets yet.')}`,
  html`<button class="btn primary" id="newPlan">+ ${t('new_target')}</button>`), (root) => {
    root.querySelector('#flt').appendChild(G.filterBar([{ name: 'period', label: 'Period', type: 'select', options: [{ value: 'weekly', label: 'Weekly' }, { value: 'daily', label: 'Daily' }] }, { name: 'from', label: 'From', type: 'date' }, { name: 'to', label: 'To', type: 'date' }], p, (v) => G.setQuery('/plans', v)));
    root.querySelector('#newPlan').onclick = async () => {
      if (!G.state.project) return G.toast(t('select_project'), 'warn');
      const pid = Number(G.state.project); const ctx = await G.projectDetail(pid);
      const monday = (() => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.toISOString().slice(0, 10); })();
      G.form({ title: t('new_target'), fields: [
        { name: 'period', label: 'Period', type: 'select', options: [{ value: 'weekly', label: 'Weekly' }, { value: 'daily', label: 'Daily' }], value: 'weekly', required: true, half: true },
        { name: 'period_start', label: 'Period start', type: 'date', value: monday, required: true, half: true },
        { name: 'title', label: 'Target / activity', required: true },
        { name: 'location_id', label: t('location'), type: 'select', options: ctx.locations.map(l => ({ value: l.id, label: l.path })), half: true },
        { name: 'contractor_id', label: t('contractor'), type: 'select', options: ctx.contractors.map(c => ({ value: c.contractor_id, label: c.name })), half: true },
        { name: 'target_qty', label: 'Target qty', type: 'number', half: true }, { name: 'unit', label: t('unit'), list: UNITS, half: true },
        { name: 'responsible_id', label: 'Responsible person', type: 'select', options: ctx.members.map(m => ({ value: m.id, label: m.name })), half: true },
        { name: 'deadline', label: 'Deadline', type: 'date', half: true },
      ], submit: async (v) => { await G.post('/plans', { ...v, project_id: pid }); G.toast('Target added'); G.router(); } });
    };
    G.on(root, '[data-upd]', 'click', (e, b) => {
      const r = rows.find(x => String(x.id) === b.dataset.upd);
      G.form({ title: `${t('update_result')}: ${r.title}`, intro: html`Target: <b>${r.target_qty ?? '—'} ${r.unit || ''}</b>. Status is calculated automatically from the actual quantity.`, fields: [
        { name: 'actual_qty', label: 'Actual quantity achieved', type: 'number', value: r.actual_qty, required: true },
        { name: 'status', label: 'Status (override)', type: 'select', options: ['achieved', 'partial', 'missed'].map(s => ({ value: s, label: s })), value: '' },
        { name: 'reason', label: 'Reason if not achieved', type: 'textarea', value: r.reason }, { name: 'revised_date', label: 'Revised completion date', type: 'date', value: r.revised_date },
      ], submit: async (v) => { await G.put('/plans/' + r.id, { ...v, status: v.status || undefined }); G.toast('Updated'); G.router(); } });
    });
  });
});
})();
