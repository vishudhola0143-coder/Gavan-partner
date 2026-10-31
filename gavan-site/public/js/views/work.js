/* Tasks, drawings, quality inspections */
(() => {
'use strict';
const { html, raw, t } = G;
const PRI = ['low', 'medium', 'high', 'urgent'].map(p => ({ value: p, label: p }));
const CATS = ['architectural', 'structural', 'plumbing', 'electrical', 'drainage', 'fire', 'landscape', 'other'];
const commentsBox = (entity, id, comments) => html`<section class="panel"><h3>${t('comments')}</h3><div class="comments">${(comments || []).map(c => html`<div class="cmt"><b>${c.user_name}</b> <small class="muted">${G.fmtDT(c.created_at)}</small><div>${c.body}</div></div>`)}</div>
  <form class="cmt-form" data-entity="${entity}" data-id="${id}"><textarea name="body" rows="2" placeholder="${t('add_comment')}"></textarea><button class="btn small primary">Post</button></form></section>`;
function bindComments(root) {
  G.on(root, '.cmt-form', 'submit', async (e, f) => { e.preventDefault(); if (!f.body.value.trim()) return; G.act(() => G.post('/comments', { entity: f.dataset.entity, entity_id: Number(f.dataset.id), body: f.body.value }), 'Comment added'); });
}
G.commentsBox = commentsBox; G.bindComments = bindComments;
const fileList = (files) => (files && files.length ? html`<ul class="filelist">${files.map(f => html`<li><a href="${G.fileUrl(f.id)}" target="_blank" rel="noopener">${f.kind === 'live_photo' ? '📷' : '📄'} ${f.name}</a> <small class="muted">${G.fmtDT(f.uploaded_at)}</small></li>`)}</ul>` : '');
G.fileList = fileList;

// ================= TASKS =================
G.route('/tasks', async () => {
  const p = G.params(); const view = p.view || localStorage.getItem('gs_taskview') || 'list';
  const q = { project_id: G.state.project, status: p.status, mine: p.mine, overdue: p.overdue, priority: p.priority, contractor_id: p.contractor_id, assignee_id: p.assignee_id, search: p.search, review: p.review };
  const tasks = await G.get('/tasks' + G.qs(q));
  let body;
  if (view === 'kanban') {
    const cols = ['open', 'in_progress', 'submitted', 'rework', 'approved', 'closed'];
    body = html`<div class="kanban">${cols.map(c => html`<div class="kcol"><h4>${G.badge(c)} <small>${tasks.filter(x => x.status === c).length}</small></h4>${tasks.filter(x => x.status === c).map(x => html`<a class="kcard ${x.overdue ? 'overdue' : ''}" href="#/tasks/${x.id}"><b>${x.title}</b><small>${x.project_name}</small><small>${x.assignee_name || x.contractor_name || ''} · ${x.due_date ? G.fmtDate(x.due_date) : ''}</small>${G.badge(x.priority)}</a>`)}</div>`)}</div>`;
  } else if (view === 'calendar') {
    const base = p.month ? new Date(p.month + '-01T00:00') : new Date(); base.setDate(1);
    const first = new Date(base); const startDay = (first.getDay() + 6) % 7; const days = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
    const ym = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const prev = new Date(base); prev.setMonth(prev.getMonth() - 1); const next = new Date(base); next.setMonth(next.getMonth() + 1);
    const cells = []; for (let i = 0; i < startDay; i++) cells.push(null); for (let d = 1; d <= days; d++) cells.push(d);
    body = html`<div class="cal-head"><a class="btn small" href="#/tasks?view=calendar&month=${ym(prev)}">‹</a><b>${base.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</b><a class="btn small" href="#/tasks?view=calendar&month=${ym(next)}">›</a></div>
      <div class="cal">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => html`<div class="cal-dow">${d}</div>`)}${cells.map(d => { if (!d) return html`<div class="cal-cell empty"></div>`; const ds = `${ym(base)}-${String(d).padStart(2, '0')}`; const list = tasks.filter(x => x.due_date === ds);
        return html`<div class="cal-cell ${ds === G.today() ? 'today' : ''}"><span class="dn">${d}</span>${list.map(x => html`<a href="#/tasks/${x.id}" class="cal-task ${x.overdue ? 'overdue' : ''} st-${x.status}">${x.title}</a>`)}</div>`; })}</div>`;
  } else body = G.taskCards(tasks);
  return G.mount(G.page(t('tasks'), html`
    <div class="tabs">${['list', 'kanban', 'calendar'].map(v => html`<a href="#/tasks?view=${v}${p.status ? '&status=' + p.status : ''}" class="${view === v ? 'on' : ''}" data-v="${v}">${t(v)}</a>`)}</div>
    <div id="flt"></div>${body}`, G.can('tasks.create') ? html`<button class="btn primary" id="newTask">+ ${t('new_task')}</button>` : ''), (root) => {
    G.on(root, '[data-v]', 'click', (e, a) => localStorage.setItem('gs_taskview', a.dataset.v));
    root.querySelector('#flt').appendChild(G.filterBar([
      { name: 'search', label: t('search') },
      { name: 'status', label: 'Status', type: 'select', options: ['open', 'in_progress', 'submitted', 'rework', 'approved', 'closed'].map(s => ({ value: s, label: t('st_' + s) })) },
      { name: 'mine', label: 'Show', type: 'select', options: [{ value: '1', label: t('my_tasks') }] },
      { name: 'overdue', label: t('overdue'), type: 'select', options: [{ value: '1', label: t('overdue') }] },
      { name: 'priority', label: t('priority'), type: 'select', options: PRI },
      ...(G.state.me.user.role !== 'contractor' ? [{ name: 'contractor_id', label: t('contractor'), type: 'select', options: G.contractorOpts() }, { name: 'assignee_id', label: t('assignee'), type: 'select', options: G.userOpts() }] : []),
    ], p, (v) => G.setQuery('/tasks', { ...v, view })));
    const nb = root.querySelector('#newTask'); if (nb) nb.onclick = () => taskForm();
    if (p.new) taskForm();
  });
});

async function taskForm(task, extra = {}) {
  const pid = Number((task && task.project_id) || extra.project_id || G.state.project);
  if (!pid) return G.toast(t('select_project'), 'warn');
  const ctx = await G.projectDetail(pid);
  const others = (await G.get('/tasks' + G.qs({ project_id: pid }))).filter(x => !task || x.id !== task.id);
  const members = ctx.members.map(m => ({ value: m.id, label: `${m.name} · ${G.state.meta.roles[m.role]}` }));
  const reviewers = ctx.members.filter(m => !['contractor', 'purchase', 'accounts'].includes(m.role)).map(m => ({ value: m.id, label: `${m.name} · ${G.state.meta.roles[m.role]}` }));
  const v = task || extra;
  const uuid = G.uuid();
  G.form({ title: task ? t('edit') + ': ' + task.title : `${t('new_task')} — ${G.projectName(pid)}`, wide: true, fields: [
    { name: 'title', label: t('title'), required: true, value: v.title },
    { name: 'description', label: t('description'), type: 'textarea', value: v.description },
    { name: 'location_id', label: t('location'), type: 'select', options: ctx.locations.map(l => ({ value: l.id, label: l.path })), value: v.location_id, half: true },
    { name: 'priority', label: t('priority'), type: 'select', options: PRI, value: v.priority || 'medium', half: true },
    { name: 'assignee_id', label: t('assignee'), type: 'select', options: members, value: v.assignee_id, half: true },
    { name: 'contractor_id', label: t('contractor') + ' / department', type: 'select', options: ctx.contractors.map(c => ({ value: c.contractor_id, label: c.name })), value: v.contractor_id, half: true },
    { name: 'department', label: 'Department', value: v.department, half: true, list: ['Site', 'Purchase', 'Accounts', 'Design', 'Quality', 'Safety'] },
    { name: 'reviewer_id', label: t('reviewer'), type: 'select', options: reviewers, value: v.reviewer_id || G.state.me.user.id, half: true },
    { name: 'start_date', label: t('start_date'), type: 'date', value: v.start_date || G.today(), half: true },
    { name: 'due_date', label: t('due_date'), type: 'date', value: v.due_date, half: true },
    { name: 'checklist', label: t('checklist'), type: 'rows', minRows: 0, value: (v.checklist || []).map(c => ({ text: c.text })), columns: [{ name: 'text', label: 'Item', wide: true }] },
    { name: 'depends_on', label: t('depends_on'), type: 'multiselect', options: others.filter(o => !['closed'].includes(o.status)).map(o => ({ value: o.id, label: `${o.title} (${o.status})` })), value: v.depends_on || [] },
    { name: 'requires_inspection', label: 'Requires quality inspection sign-off before approval', type: 'checkbox', value: v.requires_inspection },
    { name: 'files', label: t('attachments'), type: 'files', when: !task },
  ], submit: async (val) => {
    const body = { ...val, project_id: pid, checklist: val.checklist.map(c => ({ text: c.text, done: false })), files: undefined };
    if (task) { delete body.checklist; await G.put('/tasks/' + task.id, body); G.toast('Task updated'); G.cache = {}; return G.router(); }
    body.file_ids = await G.uploadDocs(val.files, { project_id: pid, entity: 'task' });
    const r = await G.post('/tasks', { ...body, client_uuid: uuid, source: extra.source });
    G.toast('Task created'); location.hash = '#/tasks/' + r.id;
  } });
}
G.taskForm = taskForm;

G.route('/tasks/:id', async (id) => {
  const x = await G.get('/tasks/' + id);
  const me = G.state.me.user;
  const isDoer = x.assignee_id === me.id || (me.role === 'contractor' && x.contractor_id === me.contractor_id);
  const isReviewer = x.reviewer_id === me.id || ['director', 'admin'].includes(me.role);
  const btns = [];
  if (['open', 'rework'].includes(x.status) && (isDoer || x.created_by === me.id || ['director', 'admin'].includes(me.role))) btns.push(html`<button class="btn primary" data-to="in_progress">▶ ${t('start')}</button>`);
  if (x.status === 'in_progress' && (isDoer || ['director', 'admin'].includes(me.role))) btns.push(html`<button class="btn primary" data-to="submitted">⇪ ${t('submit_review')}</button>`);
  if (x.status === 'submitted' && isReviewer) btns.push(html`<button class="btn primary" data-to="approved">✓ ${t('approve')}</button><button class="btn danger" data-to="rework">↺ ${t('send_rework')}</button>`);
  if (x.status === 'approved' && (isReviewer || x.created_by === me.id)) btns.push(html`<button class="btn" data-to="closed">${t('close_task')}</button>`);
  const canEdit = x.created_by === me.id || G.can('tasks.review');
  return G.mount(G.page(html`${x.title} ${G.sampleTag(x)}`, html`
    <div class="status-line">${G.badge(x.status)} ${G.badge(x.priority)} ${x.overdue ? html`<span class="badge red">${t('overdue')}</span>` : ''}</div>
    <div class="actions left">${btns}</div>
    <section class="panel"><dl class="dl">
      <dt>${t('project')}</dt><dd>${G.projectName(x.project_id)}</dd><dt>${t('location')}</dt><dd>${x.location || '—'}</dd>
      <dt>${t('assignee')}</dt><dd>${x.assignee_name || '—'}</dd><dt>${t('contractor')}</dt><dd>${x.contractor_name || '—'}${x.department ? ' · ' + x.department : ''}</dd>
      <dt>${t('reviewer')}</dt><dd>${x.reviewer_name || '—'}</dd><dt>${t('start_date')} / ${t('due_date')}</dt><dd>${G.fmtDate(x.start_date)} → ${G.fmtDate(x.due_date)}</dd>
      <dt>Created by</dt><dd>${x.created_by_name} · ${G.fmtDT(x.created_at)}</dd>
      ${x.requires_inspection ? html`<dt>Inspection</dt><dd>${x.inspection ? html`<a href="#/quality/${x.inspection.id}">${x.inspection.work_type} ${G.badge(x.inspection.status)}</a>` : html`<span class="amber-text">Required before approval — not yet raised</span> ${G.can('inspections.create') ? html`<a class="btn small" href="#/quality?new=1&task=${x.id}">Raise inspection</a>` : ''}`}</dd>` : ''}
    </dl>${x.description ? html`<p class="pre">${x.description}</p>` : ''}${x.completion_note ? html`<div class="info-box"><b>Completion note:</b> ${x.completion_note}</div>` : ''}</section>
    ${x.dependencies.length ? html`<section class="panel"><h3>${t('depends_on')}</h3>${x.dependencies.map(d => html`<div><a href="#/tasks/${d.id}">${d.title}</a> ${G.badge(d.status)}</div>`)}</section>` : ''}
    ${x.checklist.length ? html`<section class="panel"><h3>${t('checklist')}</h3><div class="checks">${x.checklist.map((c, i) => html`<label class="check big"><input type="checkbox" data-ci="${i}" ${c.done ? 'checked' : ''} ${isDoer || canEdit ? '' : 'disabled'}> ${c.text}</label>`)}</div></section>` : ''}
    <section class="panel"><h3>Proof of completion & attachments</h3>${G.photoGallery(x.files)}
      ${G.can('files.upload') || isDoer ? html`<div class="actions left"><button class="btn" id="addPhoto">📷 ${t('take_live_photo')}</button><label class="btn ghost">📎 Attach file<input type="file" id="addFile" multiple hidden></label></div>` : ''}</section>
    <section class="panel"><h3>${t('history')}</h3>${x.history.map(h => html`<div class="hist">${G.fmtDT(h.at)} · <b>${h.user_name}</b> ${h.from_status ? html`${G.badge(h.from_status)} → ` : ''}${G.badge(h.to_status)} ${h.note ? html`<div class="muted">${h.note}</div>` : ''}</div>`)}</section>
    ${G.commentsBox('task', x.id, x.comments)}
  `, html`<button class="btn ghost" id="taskChat">✉ Discussion</button>${canEdit ? html`<button class="btn" id="editTask">${t('edit')}</button>` : ''}`), (root) => {
    G.bindComments(root);
    G.on(root, '[data-to]', 'click', async (e, b) => {
      const to = b.dataset.to; let note = '';
      if (to === 'rework') { note = await G.prompt(t('send_rework'), 'What needs to be corrected?'); if (note == null) return; }
      if (to === 'submitted') { note = await G.prompt(t('submit_review'), 'Completion note (required if no photo/file attached)', { required: false }); if (note == null) return; }
      if (to === 'approved') { note = await G.prompt(t('approve'), 'Approval remark (optional)', { required: false }); if (note == null) return; }
      G.act(() => G.post(`/tasks/${x.id}/status`, { status: to, note }), 'Updated');
    });
    G.on(root, '[data-ci]', 'change', async () => {
      const list = x.checklist.map((c, i) => ({ text: c.text, done: root.querySelector(`[data-ci="${i}"]`).checked }));
      try { await G.put('/tasks/' + x.id, { checklist: list }); G.toast('Checklist saved'); } catch (e) { G.toast(e.message, 'err'); }
    });
    const ap = root.querySelector('#addPhoto');
    if (ap) ap.onclick = () => G.openCamera(async (blob) => {
      const ph = { uuid: G.uuid(), blob, captured_at: new Date().toISOString(), offline: !navigator.onLine, gps: await G.getGPS() };
      try { await G.uploadPhoto(ph, { project_id: x.project_id, entity: 'task', entity_id: x.id }); G.toast('Photo uploaded'); G.stopCamera(); document.querySelector('.camera-overlay')?.remove(); G.router(); } catch (e) { G.toast(e.message, 'err'); }
    });
    const af = root.querySelector('#addFile');
    if (af) af.onchange = () => G.act(() => G.uploadDocs([...af.files], { project_id: x.project_id, entity: 'task', entity_id: x.id }), 'Uploaded');
    const ed = root.querySelector('#editTask'); if (ed) ed.onclick = () => taskForm(x);
    root.querySelector('#taskChat').onclick = async () => { try { const c = await G.post('/chats/task/' + x.id, {}); location.hash = '#/chat/' + c.id; } catch (e) { G.toast(e.message, 'err'); } };
  });
});

// ================= DRAWINGS =================
G.route('/drawings', async () => {
  const p = G.params(); const tab = p.tab || (p.new ? 'requests' : 'register');
  const isCon = G.state.me.user.role === 'contractor';
  let body;
  if (tab === 'register') {
    const list = await G.get('/drawings' + G.qs({ project_id: G.state.project, category: p.category, search: p.search }));
    body = list.length ? html`<div class="tbl-wrap"><table class="tbl"><tr><th>Drawing no.</th><th>${t('title')}</th><th>Category</th><th>${t('project')}</th><th>${t('current_rev')}</th><th>Approved</th><th></th></tr>
      ${list.map(d => html`<tr class="link" data-href="#/drawings/${d.id}"><td><b>${d.number}</b></td><td>${d.title || ''}${d.location ? html`<div class="muted">${d.location}</div>` : ''}</td><td>${d.category}</td><td>${d.project_name}</td>
      <td>${d.current ? html`<span class="badge green">Rev ${d.current.revision}</span>` : html`<span class="badge grey">none approved</span>`}</td><td>${d.current ? G.fmtDate(d.current.reviewed_at) : ''}</td><td>${d.pending ? html`<span class="badge amber">${d.pending} pending</span>` : ''}</td></tr>`)}</table></div>` : G.empty('No drawings yet.');
  } else {
    const list = await G.get('/drawing-requests' + G.qs({ project_id: G.state.project, status: p.status, mine: p.mine }));
    body = list.length ? html`<div class="cards">${list.map(r => html`<a class="card link ${r.overdue ? 'overdue' : ''}" href="#/drawings/req/${r.id}"><div class="row-between"><b>${r.title}</b>${G.badge(r.status)}</div>
      <div class="muted">${r.project_name} · ${r.category}${r.location ? ' · ' + r.location : ''}</div><div class="meta">${G.badge(r.priority)} Required by ${G.fmtDate(r.required_by)} · by ${r.requested_by_name}${r.consultant_name ? ' → ' + r.consultant_name : ''}</div></a>`)}</div>` : G.empty('No drawing requests.');
  }
  return G.mount(G.page(t('drawings'), html`
    <div class="tabs"><a href="#/drawings?tab=register" class="${tab === 'register' ? 'on' : ''}">${t('register')}</a><a href="#/drawings?tab=requests" class="${tab === 'requests' ? 'on' : ''}">${t('requests')}</a></div>
    <div id="flt"></div>${body}`, html`${G.can('drawings.request') ? html`<button class="btn primary" id="reqDwg">+ ${t('request_drawing')}</button>` : ''}${G.can('drawings.upload') && !isCon ? html`<button class="btn" id="upDwg">⇪ ${t('upload_drawing')}</button>` : ''}`), (root) => {
    G.on(root, 'tr.link', 'click', (e, el) => { location.hash = el.dataset.href; });
    root.querySelector('#flt').appendChild(tab === 'register'
      ? G.filterBar([{ name: 'search', label: t('search') }, { name: 'category', label: 'Category', type: 'select', options: CATS.map(c => ({ value: c, label: c })) }], p, (v) => G.setQuery('/drawings', { ...v, tab }))
      : G.filterBar([{ name: 'status', label: 'Status', type: 'select', options: ['requested', 'forwarded', 'uploaded', 'revision_required', 'approved', 'rejected'].map(s => ({ value: s, label: s.replace('_', ' ') })) }, { name: 'mine', label: 'Show', type: 'select', options: [{ value: '1', label: 'Mine / assigned to me' }] }], p, (v) => G.setQuery('/drawings', { ...v, tab })));
    const rb = root.querySelector('#reqDwg'); if (rb) rb.onclick = drawingRequestForm;
    const ub = root.querySelector('#upDwg'); if (ub) ub.onclick = () => uploadForm();
    if (p.new && rb) drawingRequestForm();
  });
});
async function drawingRequestForm() {
  const pid = Number(G.state.project); if (!pid) return G.toast(t('select_project'), 'warn');
  const ctx = await G.projectDetail(pid);
  const consultants = ctx.members.filter(m => ['architect', 'structural_engineer', 'pmc'].includes(m.role)).map(m => ({ value: m.id, label: `${m.name} · ${G.state.meta.roles[m.role]}` }));
  const uuid = G.uuid(); const isCon = G.state.me.user.role === 'contractor';
  G.form({ title: `${t('request_drawing')} — ${G.projectName(pid)}`, fields: [
    { name: 'title', label: 'Drawing required (e.g. Slab reinforcement drawing)', required: true },
    { name: 'category', label: 'Category', type: 'select', options: CATS.map(c => ({ value: c, label: c })), required: true, half: true },
    { name: 'priority', label: t('priority'), type: 'select', options: PRI, value: 'medium', half: true },
    { name: 'location_id', label: 'Building / floor / location', type: 'select', options: ctx.locations.map(l => ({ value: l.id, label: l.path })), half: true },
    { name: 'required_by', label: 'Required by', type: 'date', required: true, half: true },
    { name: 'consultant_id', label: 'Suggested consultant', type: 'select', options: consultants, when: !isCon },
    { name: 'contractor_id', label: 'For contractor', type: 'select', options: ctx.contractors.map(c => ({ value: c.contractor_id, label: c.name })), when: !isCon },
    { name: 'description', label: t('description'), type: 'textarea' },
    { name: 'photos', label: 'Site photographs', type: 'photos', meta: () => ({ project_id: pid }) },
    { name: 'files', label: 'Supporting files', type: 'files' },
  ], submit: async (v) => {
    const ids = [...await G.ensurePhotos(v.photos, { project_id: pid }), ...await G.uploadDocs(v.files, { project_id: pid })];
    const r = await G.post('/drawing-requests', { ...v, photos: undefined, files: undefined, project_id: pid, client_uuid: uuid, file_ids: ids });
    G.toast('Drawing request sent'); location.hash = '#/drawings/req/' + r.id;
  } });
}
async function uploadForm(req) {
  const pid = Number(req ? req.project_id : G.state.project); if (!pid) return G.toast(t('select_project'), 'warn');
  const ctx = await G.projectDetail(pid);
  G.form({ title: req ? `Upload drawing for: ${req.title}` : t('upload_drawing'), fields: [
    { name: 'number', label: 'Drawing number', required: true, half: true, placeholder: 'e.g. STR-CH-101', hint: 'Use the same number to upload a new revision of an existing drawing.' },
    { name: 'revision', label: 'Revision', required: true, half: true, placeholder: 'R0 / R1 / A' },
    { name: 'title', label: t('title'), value: req ? req.title : '' },
    { name: 'category', label: 'Category', type: 'select', options: CATS.map(c => ({ value: c, label: c })), value: req ? req.category : '', half: true, when: !req },
    { name: 'location_id', label: t('location'), type: 'select', options: ctx.locations.map(l => ({ value: l.id, label: l.path })), half: true, when: !req },
    { name: 'notes', label: 'Revision notes', type: 'textarea', rows: 2 },
    { name: 'file', label: 'Drawing file (PDF, image, DWG, DXF…)', type: 'files', multiple: false, required: true },
  ], submit: async (v) => {
    if (!v.file.length) throw new Error('Choose the drawing file');
    const fd = new FormData(); fd.append('file', v.file[0]);
    ['number', 'revision', 'title', 'category', 'location_id', 'notes'].forEach(k => v[k] && fd.append(k, v[k]));
    fd.append('project_id', pid); if (req) fd.append('request_id', req.id);
    const r = await G.api('POST', '/drawings/upload', fd);
    G.toast('Uploaded — awaiting approval'); location.hash = '#/drawings/' + r.drawing_id;
  } });
}
const preview = (rev) => {
  const ext = (rev.file_name || '').split('.').pop().toLowerCase();
  if (['pdf'].includes(ext)) return html`<iframe class="preview" src="${G.fileUrl(rev.file_id)}" title="Drawing preview"></iframe>`;
  if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) return html`<img class="preview" src="${G.fileUrl(rev.file_id)}" alt="">`;
  return html`<div class="info-box">Preview is not available for .${ext} files in the browser. Download the file and open it in a CAD viewer (e.g. Autodesk Viewer, DWG FastView, LibreCAD).</div>`;
};
G.route('/drawings/:id', async (id) => {
  const d = await G.get('/drawings/' + id);
  const cur = d.revisions.find(r => r.status === 'approved');
  return G.mount(G.page(html`${d.number} ${G.sampleTag(d)}`, html`
    <p>${d.title || ''} · ${d.category} · ${d.project_name}${d.location ? ' · ' + d.location : ''}</p>
    ${cur ? html`<section class="panel current-rev"><h3>✓ ${t('current_rev')}: Rev ${cur.revision}</h3><p class="muted">Approved by ${cur.reviewer} on ${G.fmtDT(cur.reviewed_at)} · uploaded by ${cur.uploader}</p>
      ${preview(cur)}<div class="actions left"><a class="btn primary" href="${G.fileUrl(cur.file_id, 1)}">⇩ ${t('download')} Rev ${cur.revision}</a><a class="btn" target="_blank" rel="noopener" href="${G.fileUrl(cur.file_id)}">Open</a></div></section>`
    : html`<div class="info-box warn">No approved revision yet — do not use for construction.</div>`}
    <section class="panel"><h3>Revision ${t('history')}</h3><div class="tbl-wrap"><table class="tbl"><tr><th>Rev</th><th>Status</th><th>Uploaded</th><th>Reviewed</th><th>Notes</th><th></th></tr>
      ${d.revisions.map(r => html`<tr class="${r.status === 'superseded' ? 'superseded' : ''}"><td><b>${r.revision}</b></td><td>${G.badge(r.status)}</td><td>${r.uploader}<div class="muted">${G.fmtDT(r.uploaded_at)}</div></td><td>${r.reviewer || '—'}<div class="muted">${r.reviewed_at ? G.fmtDT(r.reviewed_at) : ''}</div>${r.review_note ? html`<div>${r.review_note}</div>` : ''}</td><td>${r.notes || ''}</td>
      <td><a class="btn small ghost" href="${G.fileUrl(r.file_id, 1)}">⇩</a>${r.status === 'pending_approval' && G.can('drawings.approve') ? html`<button class="btn small primary" data-ap="${r.id}">${t('approve')}</button><button class="btn small danger" data-rj="${r.id}">Reject</button>` : ''}</td></tr>`)}</table></div></section>
    ${G.can('drawings.approve') ? html`<section class="panel"><h3>Shared with contractors</h3><p class="muted">Contractors see only approved revisions of drawings shared with them or answering their requests.</p>
      <div class="checks">${G.state.meta.contractors.map(c => html`<label class="check"><input type="checkbox" data-share value="${c.id}" ${d.shared_contractors.includes(c.id) ? 'checked' : ''}> ${c.name}</label>`)}</div><button class="btn small" id="saveShare">${t('save')}</button></section>` : ''}
  `, G.can('drawings.upload') && G.state.me.user.role !== 'contractor' ? html`<button class="btn" id="newRev">⇪ New revision</button>` : ''), (root) => {
    G.on(root, '[data-ap]', 'click', async (e, b) => { const n = await G.prompt('Approve revision', 'Approval note (optional). Older approved revision will be marked superseded.', { required: false }); if (n != null) G.act(() => G.post(`/drawing-revisions/${b.dataset.ap}/review`, { action: 'approve', note: n }), 'Approved & notified'); });
    G.on(root, '[data-rj]', 'click', async (e, b) => { const n = await G.prompt('Reject revision', 'Reason'); if (n) G.act(() => G.post(`/drawing-revisions/${b.dataset.rj}/review`, { action: 'reject', note: n }), 'Rejected'); });
    const nr = root.querySelector('#newRev'); if (nr) nr.onclick = () => { uploadForm({ project_id: d.project_id, title: d.title, category: d.category, id: '' }); setTimeout(() => { const n = document.querySelector('[name=number]'); if (n) n.value = d.number; }, 50); };
    const ss = root.querySelector('#saveShare'); if (ss) ss.onclick = () => G.act(() => G.put(`/drawings/${d.id}/share`, { contractor_ids: [...root.querySelectorAll('[data-share]:checked')].map(i => Number(i.value)) }), 'Sharing updated');
  });
});
G.route('/drawings/req/:id', async (id) => {
  const r = await G.get('/drawing-requests/' + id);
  const comments = await G.get(`/comments?entity=drawing_request&entity_id=${r.id}`).catch(() => []);
  const steps = ['requested', 'forwarded', 'uploaded', 'approved'];
  const idx = r.status === 'revision_required' ? 2 : steps.indexOf(r.status);
  const me = G.state.me.user;
  return G.mount(G.page(html`${r.title} ${G.sampleTag(r)}`, html`
    <div class="steps">${['Requested', 'Checked by site engineer', 'Drawing uploaded', 'Approved & issued'].map((s, i) => html`<div class="step ${i <= idx ? 'done' : ''} ${r.status === 'rejected' && i === 1 ? 'bad' : ''}">${s}</div>`)}</div>
    <div class="status-line">${G.badge(r.status)} ${G.badge(r.priority)} ${r.overdue ? html`<span class="badge red">${t('overdue')}</span>` : ''}</div>
    <section class="panel"><dl class="dl"><dt>${t('project')}</dt><dd>${r.project_name}</dd><dt>${t('location')}</dt><dd>${r.location || '—'}</dd><dt>Category</dt><dd>${r.category}</dd><dt>Required by</dt><dd>${G.fmtDate(r.required_by)}</dd>
      <dt>Requested by</dt><dd>${r.requested_by_name}${r.contractor_name ? ' · ' + r.contractor_name : ''} · ${G.fmtDT(r.created_at)}</dd><dt>Checked by</dt><dd>${r.checked_by_name || '—'}${r.check_note ? ' · ' + r.check_note : ''}</dd><dt>Consultant</dt><dd>${r.consultant_name || '—'}</dd></dl>
      ${r.description ? html`<p class="pre">${r.description}</p>` : ''}${G.photoGallery(r.files)}</section>
    ${r.revisions.length ? html`<section class="panel"><h3>Uploaded drawings</h3>${r.revisions.map(v => html`<div class="hist"><a href="#/drawings/${v.drawing_id}"><b>${v.number}</b> Rev ${v.revision}</a> ${G.badge(v.status)} · ${v.uploader} · ${G.fmtDT(v.uploaded_at)}${v.review_note ? html`<div class="muted">${v.review_note}</div>` : ''}</div>`)}</section>` : ''}
    ${G.commentsBox('drawing_request', r.id, comments)}
  `, html`${G.can('drawings.check') && ['requested', 'revision_required'].includes(r.status) ? html`<button class="btn primary" id="fwd">Check & forward</button><button class="btn danger" id="rej">Reject request</button>` : ''}
    ${G.can('drawings.upload') && ['forwarded', 'revision_required', 'requested'].includes(r.status) && (r.consultant_id === me.id || ['director', 'admin'].includes(me.role) || !r.consultant_id) ? html`<button class="btn primary" id="up">⇪ ${t('upload_drawing')}</button>` : ''}
    ${r.drawing_id && r.status === 'approved' ? html`<a class="btn" href="#/drawings/${r.drawing_id}">Open approved drawing</a>` : ''}`), async (root) => {
    G.bindComments(root);
    const f = root.querySelector('#fwd');
    if (f) f.onclick = async () => { const ctx = await G.projectDetail(r.project_id); G.form({ title: 'Check & forward to consultant', fields: [
      { name: 'consultant_id', label: 'Consultant to upload drawing', type: 'select', required: true, value: r.consultant_id, options: ctx.members.filter(m => ['architect', 'structural_engineer', 'pmc'].includes(m.role)).map(m => ({ value: m.id, label: `${m.name} · ${G.state.meta.roles[m.role]}` })) },
      { name: 'note', label: 'Note', type: 'textarea' }], submit: async (v) => { await G.post(`/drawing-requests/${r.id}/check`, { action: 'forward', ...v }); G.toast('Forwarded'); G.router(); } }); };
    const rj = root.querySelector('#rej'); if (rj) rj.onclick = async () => { const n = await G.prompt('Reject request', 'Reason'); if (n) G.act(() => G.post(`/drawing-requests/${r.id}/check`, { action: 'reject', note: n }), 'Rejected'); };
    const up = root.querySelector('#up'); if (up) up.onclick = () => uploadForm(r);
  });
});

// ================= QUALITY =================
G.route('/quality', async () => {
  const p = G.params();
  const list = await G.get('/inspections' + G.qs({ project_id: G.state.project, status: p.status, contractor_id: p.contractor_id, work_type: p.work_type }));
  const cl = await G.get('/checklists');
  return G.mount(G.page(t('quality'), html`<div id="flt"></div>
    ${list.length ? html`<div class="cards">${list.map(i => html`<a class="card link ${i.overdue ? 'overdue' : ''}" href="#/quality/${i.id}"><div class="row-between"><b>${i.work_type}</b>${G.badge(i.status)}</div>
      <div class="muted">${i.project_name}${i.location ? ' · ' + i.location : ''}${i.contractor_name ? ' · ' + i.contractor_name : ''}</div><div class="meta">${G.badge(i.result)} ${i.inspector_name} · ${G.fmtDate(i.created_at)}${i.correction_deadline && i.status === 'rework_required' ? ' · correct by ' + G.fmtDate(i.correction_deadline) : ''}</div></a>`)}</div>` : G.empty('No inspections.')}`,
  G.can('inspections.create') ? html`<button class="btn primary" id="newIns">+ ${t('new_inspection')}</button>` : ''), (root) => {
    root.querySelector('#flt').appendChild(G.filterBar([{ name: 'status', label: 'Status', type: 'select', options: ['rework_required', 'reinspection_due', 'awaiting_signoff', 'signed_off'].map(s => ({ value: s, label: s.replace(/_/g, ' ') })) },
      { name: 'work_type', label: 'Work', type: 'select', options: Object.keys(cl).map(k => ({ value: k, label: k })) }, { name: 'contractor_id', label: t('contractor'), type: 'select', options: G.contractorOpts() }], p, (v) => G.setQuery('/quality', v)));
    const nb = root.querySelector('#newIns'); if (nb) nb.onclick = () => inspectionForm(cl, p.task);
    if (p.new && nb) inspectionForm(cl, p.task);
  });
});
async function inspectionForm(cl, taskId) {
  const pid = Number(G.state.project); if (!pid) return G.toast(t('select_project'), 'warn');
  const ctx = await G.projectDetail(pid);
  const task = taskId ? await G.get('/tasks/' + taskId).catch(() => null) : null;
  const signers = ctx.members.filter(m => ['director', 'admin', 'project_manager', 'pmc', 'site_engineer', 'structural_engineer'].includes(m.role) && m.id !== G.state.me.user.id);
  const uuid = G.uuid();
  const wrap = document.createElement('div');
  wrap.innerHTML = String(html`<div class="field"><label>Work type <span class="req">*</span></label><select id="wt"><option value="">— ${t('select')} —</option>${Object.keys(cl).map(k => html`<option>${k}</option>`)}</select></div><div id="insForm"></div>`);
  G.modal(t('new_inspection'), wrap, { wide: true, sticky: true });
  wrap.querySelector('#wt').onchange = (e) => {
    const wt = e.target.value; const host = wrap.querySelector('#insForm'); host.innerHTML = '';
    if (!wt) return;
    const items = cl[wt] || [];
    const list = document.createElement('div'); list.className = 'qc-list';
    list.innerHTML = items.map((it, i) => `<div class="qc-item"><div class="qc-q">${G.esc(it)}</div><div class="seg">${['ok', 'not_ok', 'na'].map(r => `<label><input type="radio" name="qc${i}" value="${r}" ${r === 'ok' ? '' : ''}><span>${{ ok: '✓ OK', not_ok: '✕ Not OK', na: 'N/A' }[r]}</span></label>`).join('')}</div><input class="qc-remark" data-i="${i}" placeholder="Remark / measurement"></div>`).join('');
    host.appendChild(list);
    G.form({ inline: host, fields: [
      { name: 'location_id', label: t('location'), type: 'select', options: ctx.locations.map(l => ({ value: l.id, label: l.path })), value: task ? task.location_id : '', half: true },
      { name: 'contractor_id', label: t('contractor'), type: 'select', options: ctx.contractors.map(c => ({ value: c.contractor_id, label: c.name })), value: task ? task.contractor_id : '', half: true },
      { name: 'measurements', label: 'Measurements', type: 'textarea', rows: 2 },
      { name: 'remarks', label: 'Remarks', type: 'textarea', rows: 2 },
      { name: 'result', label: 'Result', type: 'select', required: true, options: [{ value: 'pass', label: 'Pass' }, { value: 'fail', label: 'Fail' }, { value: 'rework', label: 'Rework required' }] },
      { name: 'correction_deadline', label: 'Correction deadline (for Fail / Rework)', type: 'date', half: true },
      { name: 'reviewer_id', label: 'Sign-off reviewer', type: 'select', options: signers.map(m => ({ value: m.id, label: `${m.name} · ${G.state.meta.roles[m.role]}` })), half: true },
      { name: 'photos', label: 'Inspection photographs', type: 'photos', meta: () => ({ project_id: pid }) },
    ], submitLabel: t('submit'), submit: async (v) => {
      const responses = items.map((it, i) => ({ item: it, result: (list.querySelector(`[name=qc${i}]:checked`) || {}).value || '', remark: list.querySelector(`[data-i="${i}"]`).value }));
      if (responses.some(r => !r.result)) throw new Error('Answer every checklist item (OK / Not OK / N/A)');
      const file_ids = await G.ensurePhotos(v.photos, { project_id: pid });
      const r = await G.post('/inspections', { ...v, photos: undefined, work_type: wt, responses, project_id: pid, client_uuid: uuid, task_id: task ? task.id : null, file_ids });
      G.closeModal(); G.toast('Inspection saved'); location.hash = '#/quality/' + r.id;
    } });
  };
}
G.route('/quality/:id', async (id) => {
  const i = await G.get('/inspections/' + id);
  const comments = await G.get(`/comments?entity=inspection&entity_id=${i.id}`).catch(() => []);
  const me = G.state.me.user;
  const canCorrect = i.status === 'rework_required' && (me.role === 'contractor' || G.can('reports.submit') || G.can('tasks.review'));
  return G.mount(G.page(html`${i.work_type} inspection ${G.sampleTag(i)}`, html`
    <div class="status-line">${G.badge(i.status)} Result: ${G.badge(i.result)} ${i.overdue ? html`<span class="badge red">Correction overdue</span>` : ''}</div>
    <section class="panel"><dl class="dl"><dt>${t('project')}</dt><dd>${i.project_name}</dd><dt>${t('location')}</dt><dd>${i.location || '—'}</dd><dt>${t('contractor')}</dt><dd>${i.contractor_name || '—'}</dd>
      <dt>Inspector</dt><dd>${i.inspector_name} · ${G.fmtDT(i.created_at)}</dd><dt>Sign-off reviewer</dt><dd>${i.reviewer_name || 'Any authorised reviewer'}</dd>
      ${i.correction_deadline ? html`<dt>Correction deadline</dt><dd>${G.fmtDate(i.correction_deadline)}</dd>` : ''}${i.task_id ? html`<dt>Task</dt><dd><a href="#/tasks/${i.task_id}">#${i.task_id}</a></dd>` : ''}</dl></section>
    <section class="panel"><h3>${t('checklist')}</h3><table class="tbl">${i.responses.map(r => html`<tr><td>${r.item}</td><td>${r.result === 'ok' ? html`<span class="badge green">OK</span>` : r.result === 'not_ok' ? html`<span class="badge red">Not OK</span>` : html`<span class="badge grey">N/A</span>`}</td><td>${r.remark}</td></tr>`)}</table>
      ${i.measurements ? html`<p><b>Measurements:</b> ${i.measurements}</p>` : ''}${i.remarks ? html`<p><b>Remarks:</b> ${i.remarks}</p>` : ''}</section>
    ${i.correction_note ? html`<section class="panel"><h3>Correction</h3><p>${i.correction_note}</p><small class="muted">${G.fmtDT(i.corrected_at)}</small></section>` : ''}
    ${i.reinspection_result ? html`<section class="panel"><h3>Reinspection</h3>${G.badge(i.reinspection_result)} <p>${i.reinspection_remarks || ''}</p><small class="muted">${G.fmtDT(i.reinspected_at)}</small></section>` : ''}
    ${i.signed_off_by ? html`<section class="panel current-rev"><h3>✓ Signed off</h3><p>${i.signed_off_name} · ${G.fmtDT(i.signed_off_at)}</p></section>` : ''}
    <section class="panel"><h3>Photos</h3>${G.photoGallery(i.files)}</section>
    ${G.commentsBox('inspection', i.id, comments)}`,
  html`${canCorrect ? html`<button class="btn primary" id="corr">${t('mark_corrected')}</button>` : ''}
    ${G.can('inspections.create') && ['reinspection_due', 'rework_required'].includes(i.status) ? html`<button class="btn" id="reins">${t('reinspect')}</button>` : ''}
    ${G.can('inspections.signoff') && i.status === 'awaiting_signoff' ? html`<button class="btn primary" id="sign">✓ ${t('signoff')}</button>` : ''}`), (root) => {
    G.bindComments(root);
    const c = root.querySelector('#corr'); if (c) c.onclick = () => G.form({ title: t('mark_corrected'), fields: [{ name: 'note', label: 'Correction done', type: 'textarea', required: true }, { name: 'photos', label: 'Photos of corrected work', type: 'photos', meta: () => ({ project_id: i.project_id }) }],
      submit: async (v) => { const ids = await G.ensurePhotos(v.photos, { project_id: i.project_id }); await G.post(`/inspections/${i.id}/correct`, { note: v.note, file_ids: ids }); G.toast('Marked corrected'); G.router(); } });
    const r = root.querySelector('#reins'); if (r) r.onclick = () => G.form({ title: t('reinspect'), fields: [{ name: 'result', label: 'Reinspection result', type: 'select', required: true, options: [{ value: 'pass', label: 'Pass' }, { value: 'fail', label: 'Fail' }] }, { name: 'remarks', label: 'Remarks', type: 'textarea' }, { name: 'correction_deadline', label: 'New correction deadline (if fail)', type: 'date' }, { name: 'photos', label: 'Photos', type: 'photos', meta: () => ({ project_id: i.project_id }) }],
      submit: async (v) => { const ids = await G.ensurePhotos(v.photos, { project_id: i.project_id }); await G.post(`/inspections/${i.id}/reinspect`, { ...v, photos: undefined, file_ids: ids }); G.toast('Saved'); G.router(); } });
    const s = root.querySelector('#sign'); if (s) s.onclick = async () => { if (await G.confirm('Sign off this inspection as approved?', t('signoff'))) G.act(() => G.post(`/inspections/${i.id}/signoff`, {}), 'Signed off'); };
  });
});
})();
