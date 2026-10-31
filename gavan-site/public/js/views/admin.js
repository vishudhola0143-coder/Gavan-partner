/* Projects setup, admin console, reports & downloads */
(() => {
'use strict';
const { html, raw, t } = G;

// ================= PROJECTS =================
G.route('/projects', async () => {
  const p = G.params();
  const list = await G.get('/projects' + G.qs({ archived: p.archived }));
  return G.mount(G.page(t('projects'), html`<div class="tabs"><a href="#/projects" class="${p.archived ? '' : 'on'}">Active</a><a href="#/projects?archived=1" class="${p.archived ? 'on' : ''}">Including archived</a></div>
    <div class="cards">${list.map(x => html`<a class="card link" href="#/projects/${x.id}"><div class="row-between"><b>${x.name}</b>${G.badge(x.status)}</div><div class="muted">${x.type} · ${x.location || '—'} · ${x.members} members</div>${G.sampleTag(x)}</a>`)}</div>`,
  G.can('projects.manage') ? html`<button class="btn primary" id="newP">+ Project</button>` : ''), (root) => { const b = root.querySelector('#newP'); if (b) b.onclick = () => projectForm(); });
});
function projectForm(pr = {}) {
  G.form({ title: pr.id ? t('edit') : 'New project', fields: [
    { name: 'name', label: 'Project name', required: true, value: pr.name }, { name: 'code', label: 'Code', value: pr.code, half: true },
    { name: 'type', label: 'Type', type: 'select', required: true, value: pr.type || 'residential', options: ['residential', 'commercial', 'industrial', 'mixed'].map(x => ({ value: x, label: x })), half: true },
    { name: 'location', label: 'Site location / address', value: pr.location },
    { name: 'start_date', label: t('start_date'), type: 'date', value: pr.start_date, half: true }, { name: 'end_date', label: 'Target completion', type: 'date', value: pr.end_date, half: true },
    { name: 'morning_deadline', label: 'Morning report deadline', type: 'time', value: pr.morning_deadline || '10:00', half: true }, { name: 'evening_deadline', label: 'Evening report deadline', type: 'time', value: pr.evening_deadline || '19:00', half: true },
  ], submit: async (v) => {
    if (pr.id) await G.put('/projects/' + pr.id, v); else { const r = await G.post('/projects', v); location.hash = '#/projects/' + r.id; }
    const me = await G.get('/me'); G.state.me = me; G.cache = {}; renderShell(); G.toast('Saved'); G.router();
  } });
}
G.route('/projects/:id', async (id) => {
  G.cache['p' + id] = null;
  const pr = await G.projectDetail(id);
  const manage = G.can('projects.manage');
  const tree = (parent) => { const kids = pr.locations.filter(l => (l.parent_id || null) === parent); return kids.length ? html`<ul class="tree">${kids.map(l => html`<li><span class="badge grey">${l.kind}</span> ${l.name} ${manage ? html`<button class="link-btn" data-addloc="${l.id}">+ sub</button> <button class="link-btn red-text" data-delloc="${l.id}">remove</button>` : ''}${tree(l.id)}</li>`)}</ul>` : ''; };
  return G.mount(G.page(html`${pr.name} ${G.sampleTag(pr)}`, html`
    <div class="status-line">${G.badge(pr.status)} ${pr.type} · ${pr.location || ''} · ${G.fmtDate(pr.start_date)} – ${G.fmtDate(pr.end_date)} · Reports due ${pr.morning_deadline} / ${pr.evening_deadline}</div>
    <section class="panel"><h3>${t('progress')}: ${pr.progress.percent == null ? '—' : pr.progress.percent + '%'}</h3><div class="bar"><i style="width:${pr.progress.percent || 0}%"></i></div><p class="muted">${pr.progress.method}</p>
      <div class="tbl-wrap"><table class="tbl"><tr><th>Work item</th><th>Location</th><th>Planned</th><th>Done</th><th>%</th><th>Weight</th><th></th></tr>${pr.workItems.map(w => html`<tr><td>${w.name}</td><td>${w.location}</td><td>${w.planned_qty} ${w.unit || ''}</td><td>${w.done_qty}</td><td>${w.planned_qty ? Math.min(100, Math.round(100 * w.done_qty / w.planned_qty)) + '%' : '—'}</td><td>${w.weight}</td><td>${manage ? html`<button class="btn small ghost" data-wi="${w.id}">${t('edit')}</button>` : ''}</td></tr>`)}</table></div>
      ${manage ? html`<button class="btn small" id="addWi">+ Work item</button>` : ''}</section>
    <div class="grid2">
      <section class="panel"><h3>Structure: Building / Zone → Floor → Unit</h3>${tree(null) || G.empty('No locations yet')}${manage ? html`<button class="btn small" data-addloc="">+ Building / zone</button>` : ''}</section>
      <section class="panel"><h3>Team (${pr.members.length})</h3><table class="tbl">${pr.members.map(m => html`<tr><td>${m.name}</td><td>${G.state.meta.roles[m.role]}</td><td>${m.phone || ''}</td></tr>`)}</table>${manage ? html`<button class="btn small" id="editTeam">Manage team</button>` : ''}</section>
    </div>
    <section class="panel"><h3>${t('contractors')}</h3>${pr.contractors.length ? html`<table class="tbl">${pr.contractors.map(c => html`<tr class="link" data-href="#/contractors/${c.contractor_id}"><td>${c.name}</td><td>${c.trade}</td><td>${c.work_order || ''}</td><td>${c.scope || ''}</td></tr>`)}</table>` : G.empty()}</section>`,
  html`${manage ? html`<button class="btn" id="editP">${t('edit')}</button><button class="btn ${pr.status === 'archived' ? 'primary' : 'danger ghost'}" id="arch">${pr.status === 'archived' ? 'Restore' : 'Archive'}</button>` : ''}`), (root) => {
    G.on(root, 'tr.link', 'click', (e, el) => { location.hash = el.dataset.href; });
    if (!manage) return;
    root.querySelector('#editP').onclick = () => projectForm(pr);
    root.querySelector('#arch').onclick = async () => { if (await G.confirm(pr.status === 'archived' ? 'Restore this project?' : 'Archive this project? It will be hidden from daily lists but all records are kept.')) G.act(async () => { await G.put('/projects/' + pr.id, { status: pr.status === 'archived' ? 'active' : 'archived' }); G.state.me = await G.get('/me'); renderShell(); }, 'Saved'); };
    G.on(root, '[data-addloc]', 'click', (e, b) => G.form({ title: 'Add location', fields: [{ name: 'kind', label: 'Type', type: 'select', required: true, options: (b.dataset.addloc ? ['floor', 'unit', 'zone', 'work location'] : ['building', 'zone', 'plot', 'shed']).map(x => ({ value: x, label: x })) }, { name: 'name', label: 'Name', required: true }],
      submit: async (v) => { await G.post(`/projects/${pr.id}/locations`, { ...v, parent_id: b.dataset.addloc || null }); G.toast('Added'); G.router(); } }));
    G.on(root, '[data-delloc]', 'click', async (e, b) => { if (await G.confirm('Remove this location?')) G.act(() => G.del('/locations/' + b.dataset.delloc), 'Removed'); });
    root.querySelector('#editTeam').onclick = () => G.form({ title: 'Project team', fields: [{ name: 'user_ids', label: 'Members', type: 'multiselect', value: pr.members.map(m => m.id), options: G.userOpts() }],
      submit: async (v) => { await G.put(`/projects/${pr.id}/members`, v); G.toast('Team updated'); G.router(); } });
    const wiForm = (w = {}) => G.form({ title: w.id ? 'Edit work item' : 'Add work item', intro: 'Progress % = Σ(weight × done/planned) ÷ Σ weight. Evening reports linked to a work item add to “done” automatically.', fields: [
      { name: 'name', label: 'Work item', required: true, value: w.name }, { name: 'location_id', label: t('location'), type: 'select', options: pr.locations.map(l => ({ value: l.id, label: l.path })), value: w.location_id, when: !w.id },
      { name: 'contractor_id', label: t('contractor'), type: 'select', options: pr.contractors.map(c => ({ value: c.contractor_id, label: c.name })), when: !w.id },
      { name: 'unit', label: t('unit'), value: w.unit, half: true }, { name: 'planned_qty', label: 'Planned qty', type: 'number', required: true, value: w.planned_qty, half: true },
      { name: 'done_qty', label: 'Done qty (correction)', type: 'number', value: w.done_qty || 0, half: true }, { name: 'weight', label: 'Weight', type: 'number', value: w.weight || 1, half: true }],
    submit: async (v) => { if (w.id) await G.put('/work-items/' + w.id, v); else await G.post(`/projects/${pr.id}/work-items`, v); G.toast('Saved'); G.router(); } });
    root.querySelector('#addWi').onclick = () => wiForm();
    G.on(root, '[data-wi]', 'click', (e, b) => wiForm(pr.workItems.find(w => String(w.id) === b.dataset.wi)));
  });
});

// ================= ADMIN =================
G.route('/admin', async () => {
  const p = G.params(); const tab = p.tab || (G.can('users.manage') ? 'users' : 'permissions');
  const tabs = [['users', 'Users'], ['permissions', 'Roles & permissions'], ['reporting', 'Reporting structure'], ['checklists', 'QC checklists'], ['integrations', 'Integrations & notifications'], ['deliveries', 'Delivery log'], ['data', 'Data, backup & sample'], ['audit', 'Audit history']]
    .filter(([k]) => (k === 'users' ? G.can('users.manage') : k === 'audit' ? G.can('audit.view') : G.can('settings.manage')));
  let body = '', bind = () => {};
  const S = G.can('settings.manage') && tab !== 'users' && tab !== 'audit' ? await G.get('/settings') : null;
  if (tab === 'users') {
    const users = await G.get('/users');
    body = html`<div class="tbl-wrap"><table class="tbl"><tr><th>Name</th><th>Login</th><th>Role</th><th>Phone / email</th><th>Projects</th><th>Status</th><th></th></tr>${users.map(u => html`<tr class="${u.active ? '' : 'superseded'}"><td>${u.name} ${G.sampleTag(u)}</td><td>${u.login}</td><td>${G.state.meta.roles[u.role]}${u.contractor_name ? html`<div class="muted">${u.contractor_name}</div>` : ''}${u.department ? html`<div class="muted">${u.department}</div>` : ''}</td><td>${u.phone || ''}<div class="muted">${u.email || ''}</div></td><td><small>${u.projects || '—'}</small></td><td>${u.active ? G.badge('active') : html`<span class="badge red">deactivated</span>`}${u.must_change_password ? html` <span class="badge amber">temp pw</span>` : ''}</td><td><button class="btn small" data-eu="${u.id}">${t('edit')}</button></td></tr>`)}</table></div>`;
    bind = (root) => {
      const uf = async (u) => {
        const pids = u ? await G.get(`/users/${u.id}/projects`) : (G.state.project ? [Number(G.state.project)] : []);
        G.form({ title: u ? 'Edit user' : 'New user', fields: [
          { name: 'name', label: 'Full name', required: true, value: u && u.name }, { name: 'login', label: 'Login ID', required: true, value: u && u.login, when: !u, autocomplete: 'off' },
          { name: 'role', label: 'Role', type: 'select', required: true, value: u && u.role, options: Object.entries(G.state.meta.roles).map(([k, v]) => ({ value: k, label: v })), half: true },
          { name: 'department', label: 'Department', value: u && u.department, half: true, list: ['Site', 'Purchase', 'Accounts', 'Design', 'Coordination', 'Management'] },
          { name: 'contractor_id', label: 'Contractor profile (for contractor logins)', type: 'select', value: u && u.contractor_id, options: G.contractorOpts() },
          { name: 'phone', label: 'Phone (WhatsApp)', type: 'tel', value: u && u.phone, half: true }, { name: 'email', label: 'Email', type: 'email', value: u && u.email, half: true },
          { name: 'project_ids', label: 'Assigned projects', type: 'multiselect', value: pids, options: G.projectOpts() },
          { name: 'password', label: 'Initial password (blank = auto-generate)', type: 'password', when: !u, autocomplete: 'new-password' },
          { name: 'active', label: 'Active (untick to deactivate & sign out)', type: 'checkbox', value: u ? !!u.active : true, when: !!u },
          { name: 'reset_password', label: 'Reset password (generates a temporary one)', type: 'checkbox', when: !!u },
        ], submit: async (v) => {
          const r = u ? await G.put('/users/' + u.id, v) : await G.post('/users', v);
          G.state.meta = await G.get('/meta');
          if (r.temporaryPassword) { G.router(); setTimeout(() => G.modal('Temporary password', html`<p>Share this securely with <b>${v.name}</b>. They must change it on first login.</p><p class="big-code">${r.temporaryPassword}</p>`), 300); }
          else { G.toast('Saved'); G.router(); }
        } });
      };
      root.querySelector('#newU').onclick = () => uf();
      G.on(root, '[data-eu]', 'click', (e, b) => uf(users.find(x => String(x.id) === b.dataset.eu)));
    };
  } else if (tab === 'permissions') {
    const caps = Object.entries(S.caps); const roles = Object.entries(S.roles);
    body = html`<p class="muted">Permissions are enforced on the server. Directors always keep full access.</p><div class="tbl-wrap"><table class="tbl perm"><tr><th>Permission</th>${roles.map(([k, v]) => html`<th class="vert"><span>${v}</span></th>`)}</tr>
      ${caps.map(([c, label]) => html`<tr><td>${label}<div class="muted">${c}</div></td>${roles.map(([r]) => html`<td><input type="checkbox" data-r="${r}" data-c="${c}" ${(S.permissions[r] || []).includes(c) ? 'checked' : ''} ${r === 'director' ? 'disabled' : ''}></td>`)}</tr>`)}</table></div>`;
    bind = (root) => { root.querySelector('#savePerm').onclick = () => { const perms = {}; roles.forEach(([r]) => { perms[r] = [...root.querySelectorAll(`[data-r="${r}"]:checked`)].map(i => i.dataset.c); }); G.act(() => G.put('/settings', { permissions: perms }), 'Permissions saved'); }; };
  } else if (tab === 'reporting') {
    body = html`<p class="muted">Defines who receives each person’s/department’s reports and escalations. Change it any time staff change — no code changes needed.</p>
      <table class="tbl"><tr><th>From</th><th>Reports to</th><th>Project</th><th>Note</th><th></th></tr>${S.reportingLines.map(l => html`<tr><td>${l.from_name || (l.from_role ? S.roles[l.from_role] : '') || (l.department ? l.department + ' department' : 'Everyone')}</td><td><b>${l.to_name}</b></td><td>${l.project_name || 'All projects'}</td><td>${l.note || ''}</td><td><button class="icon-btn" data-dl="${l.id}">✕</button></td></tr>`)}</table>
      <h3>Escalation rules</h3><form id="escF" class="form"><div class="field half"><label>Escalate overdue tasks after (hours)</label><input type="number" name="overdue_hours" value="${S.escalation.overdue_hours}"></div><div class="field half"><label>Missing report grace (minutes after deadline)</label><input type="number" name="report_grace_minutes" value="${S.escalation.report_grace_minutes}"></div>
      <div class="field"><label>Also escalate to these project roles</label><div class="checks">${Object.entries(S.roles).map(([k, v]) => html`<label class="check"><input type="checkbox" name="er" value="${k}" ${S.escalation.escalate_to_roles.includes(k) ? 'checked' : ''}> ${v}</label>`)}</div></div><button class="btn primary">${t('save')}</button></form>`;
    bind = (root) => {
      root.querySelector('#addRl').onclick = () => G.form({ title: 'Add reporting line', fields: [
        { name: 'from_user_id', label: 'From person (optional)', type: 'select', options: G.userOpts() }, { name: 'from_role', label: 'or from role', type: 'select', options: Object.entries(S.roles).map(([k, v]) => ({ value: k, label: v })) },
        { name: 'department', label: 'or department', list: ['Site', 'Purchase', 'Accounts', 'Design', 'Quality'] }, { name: 'to_user_id', label: 'Reports to', type: 'select', required: true, options: G.userOpts() },
        { name: 'project_id', label: 'Project (blank = all)', type: 'select', options: G.projectOpts() }, { name: 'note', label: 'Note' }],
      submit: async (v) => { await G.post('/settings/reporting-lines', v); G.toast('Added'); G.router(); } });
      G.on(root, '[data-dl]', 'click', async (e, b) => { if (await G.confirm('Remove this reporting line?')) G.act(() => G.del('/settings/reporting-lines/' + b.dataset.dl), 'Removed'); });
      root.querySelector('#escF').onsubmit = (e) => { e.preventDefault(); const f = e.target; G.act(() => G.put('/settings', { escalation: { overdue_hours: Number(f.overdue_hours.value), report_grace_minutes: Number(f.report_grace_minutes.value), escalate_to_roles: [...f.querySelectorAll('[name=er]:checked')].map(i => i.value) } }), 'Saved'); };
    };
  } else if (tab === 'checklists') {
    body = html`<div class="cards">${S.checklists.map(c => html`<div class="card"><div class="row-between"><b>${c.work_type}</b><button class="btn small" data-cl="${c.work_type}">${t('edit')}</button></div><ol>${c.items.map(i => html`<li>${i}</li>`)}</ol></div>`)}</div>`;
    bind = (root) => {
      const edit = (wt) => { const c = S.checklists.find(x => x.work_type === wt) || { items: [] }; G.form({ title: 'Checklist: ' + (wt || 'new'), fields: [{ name: 'work_type', label: 'Work type', required: true, value: wt, when: !wt }, { name: 'items', label: 'Items (one per line)', type: 'textarea', rows: 10, required: true, value: c.items.join('\n') }],
        submit: async (v) => { await G.put('/settings/checklists/' + encodeURIComponent(wt || v.work_type), { items: v.items.split('\n') }); G.toast('Saved'); G.router(); } }); };
      G.on(root, '[data-cl]', 'click', (e, b) => edit(b.dataset.cl)); root.querySelector('#newCl').onclick = () => edit('');
    };
  } else if (tab === 'integrations') {
    const I = S.integrations; const st = (x) => (x && x.enabled ? html`<span class="badge green">enabled</span>` : html`<span class="badge grey">not configured</span>`);
    const types = Object.keys(S.channels);
    body = html`<div class="info-box">External messages are sent only through providers you configure here. Every attempt is recorded with its real status in the Delivery log — nothing is shown as sent unless the provider accepted it.</div>
      <div class="grid2">
      <section class="panel"><h3>Email (SMTP) ${st(I.smtp)}</h3><form class="form" data-int="smtp">${['host', 'port', 'user', 'pass', 'from'].map(k => html`<div class="field half"><label>${k}</label><input name="${k}" type="${k === 'pass' ? 'password' : 'text'}" value="${(I.smtp || {})[k] || ''}"></div>`)}<label class="check"><input type="checkbox" name="secure" ${(I.smtp || {}).secure ? 'checked' : ''}> TLS (port 465)</label><label class="check"><input type="checkbox" name="enabled" ${(I.smtp || {}).enabled ? 'checked' : ''}> Enabled</label><button class="btn small primary">${t('save')}</button></form></section>
      <section class="panel"><h3>WhatsApp Cloud API ${st(I.whatsapp)}</h3><p class="muted">Needs a Meta WhatsApp Business account. Business-initiated messages require an approved template with one body variable.</p><form class="form" data-int="whatsapp">${['phone_number_id', 'token', 'template', 'template_lang'].map(k => html`<div class="field half"><label>${k}</label><input name="${k}" type="${k === 'token' ? 'password' : 'text'}" value="${(I.whatsapp || {})[k] || ''}"></div>`)}<label class="check"><input type="checkbox" name="enabled" ${(I.whatsapp || {}).enabled ? 'checked' : ''}> Enabled</label><button class="btn small primary">${t('save')}</button></form></section>
      <section class="panel"><h3>Web push ${st(I.push)}</h3><p class="muted">Browser/phone push via VAPID. Users enable it from My Profile on each device.</p>${I.push && I.push.public_key ? html`<p><small>Public key: ${I.push.public_key.slice(0, 24)}…</small></p>` : ''}<button class="btn small" id="genVapid">${I.push && I.push.public_key ? 'Regenerate keys' : 'Generate keys & enable'}</button></section>
      <section class="panel"><h3>Video calling ${st(I.video)}</h3><p class="muted">Integrated voice/video calling requires a provider account (e.g. Jitsi as a Service, Daily, Zoom SDK). Until configured, meetings use pasted Meet/Zoom/Teams links.</p><form class="form" data-int="video"><div class="field half"><label>provider</label><input name="provider" value="${(I.video || {}).provider || ''}"></div><div class="field half"><label>api_key</label><input name="api_key" type="password" value="${(I.video || {}).api_key || ''}"></div><label class="check"><input type="checkbox" name="enabled" ${(I.video || {}).enabled ? 'checked' : ''}> Enabled</label><button class="btn small primary">${t('save')}</button></form>
        <p class="muted">Note: storing credentials marks the provider as configured; in-app call UI for a specific provider is not built yet (see README limitations).</p></section></div>
      <section class="panel"><h3>Which channels per notification type</h3><div class="tbl-wrap"><table class="tbl"><tr><th>Type</th><th>Push</th><th>Email</th><th>WhatsApp</th></tr>${types.map(ty => html`<tr><td>${ty.replace(/_/g, ' ')}</td>${['push', 'email', 'whatsapp'].map(ch => html`<td><input type="checkbox" data-ty="${ty}" data-ch="${ch}" ${S.channels[ty].includes(ch) ? 'checked' : ''}></td>`)}</tr>`)}</table></div>
      <button class="btn small primary" id="saveCh">${t('save')}</button> <button class="btn small" id="testN">Send test notification to me</button><p class="muted">In-app notifications are always delivered.</p></section>`;
    bind = (root) => {
      G.on(root, '[data-int]', 'submit', (e, f) => { e.preventDefault(); const o = {}; [...f.elements].forEach(el => { if (!el.name) return; o[el.name] = el.type === 'checkbox' ? el.checked : el.value.trim(); }); G.act(() => G.put('/settings', { integrations: { [f.dataset.int]: o } }), 'Saved'); });
      root.querySelector('#genVapid').onclick = () => G.act(() => G.post('/settings/push-keys', {}), 'Push keys generated');
      root.querySelector('#saveCh').onclick = () => { const ch = {}; types.forEach(ty => { ch[ty] = [...root.querySelectorAll(`[data-ty="${ty}"]:checked`)].map(i => i.dataset.ch); }); G.act(() => G.put('/settings', { channels: ch }), 'Saved'); };
      root.querySelector('#testN').onclick = () => G.act(() => G.post('/settings/test-notification', {}), 'Test sent — check Delivery log in a few seconds');
    };
  } else if (tab === 'deliveries') {
    const rows = await G.get('/settings/deliveries');
    body = rows.length ? html`<div class="tbl-wrap"><table class="tbl"><tr><th>Time</th><th>User</th><th>Notification</th><th>Channel</th><th>Target</th><th>Status</th><th>Detail</th></tr>${rows.map(r => html`<tr><td>${G.fmtDT(r.at)}</td><td>${r.user_name}</td><td>${r.title}</td><td>${r.channel}</td><td>${r.target || ''}</td><td>${G.badge(r.status)}</td><td><small>${r.error || ''}</small></td></tr>`)}</table></div>` : G.empty('No external delivery attempts yet.');
  } else if (tab === 'data') {
    const backups = await G.get('/admin/backups');
    body = html`<div class="grid2"><section class="panel"><h3>Backups</h3><p class="muted">Creates a consistent copy of the database. Also back up the data/uploads folder (files) on the server.</p><button class="btn primary" id="bk">Create backup now</button>
      <table class="tbl">${backups.map(b => html`<tr><td>${b.name}</td><td>${Math.round(b.size / 1024)} KB</td><td><a class="btn small ghost" href="/api/admin/backups/${b.name}?token=${encodeURIComponent(localStorage.getItem('gs_token'))}">⇩</a></td></tr>`)}</table></section>
      <section class="panel"><h3>Data export</h3><p class="muted">Full JSON export of all records (passwords excluded).</p><a class="btn" href="/api/admin/export.json?token=${encodeURIComponent(localStorage.getItem('gs_token'))}">⇩ Export all data (JSON)</a></section>
      <section class="panel"><h3>Branding</h3><form class="form" id="brandF"><div class="field"><label>Company name</label><input name="company_name" value="${S.company_name}"></div><button class="btn small primary">${t('save')}</button></form>
        <p>Logo</p><img src="${G.state.me.branding.logo}" style="max-height:60px" alt=""><label class="btn small">Upload new logo<input type="file" id="logoUp" accept="image/png,image/jpeg,image/webp" hidden></label></section>
      <section class="panel"><h3>Sample / demo data</h3><p>Sample records live only in the <b>DEMO – Sample Villa Project</b> with demo users (password <code>demo1234</code>) and are labelled SAMPLE everywhere. Live projects never contain sample data.</p>
        <label class="check big"><input type="checkbox" id="showS" ${S.show_sample ? 'checked' : ''}> Show sample project to users</label>
        <div class="actions left"><button class="btn danger" id="purge">Delete all sample data</button><button class="btn" id="load">Load sample data</button></div></section></div>`;
    bind = (root) => {
      root.querySelector('#bk').onclick = () => G.act(() => G.post('/admin/backup', {}), 'Backup created');
      root.querySelector('#brandF').onsubmit = (e) => { e.preventDefault(); G.act(async () => { await G.put('/settings', { company_name: e.target.company_name.value }); G.state.me = await G.get('/me'); renderShell(); }, 'Saved'); };
      root.querySelector('#logoUp').onchange = (e) => { const fd = new FormData(); fd.append('file', e.target.files[0]); G.act(async () => { await G.api('POST', '/branding/logo', fd); G.state.me = await G.get('/me'); renderShell(); }, 'Logo updated'); };
      root.querySelector('#showS').onchange = (e) => G.act(async () => { await G.put('/settings', { show_sample: e.target.checked }); G.state.me = await G.get('/me'); G.setProject(''); }, 'Saved');
      root.querySelector('#purge').onclick = async () => { if (await G.confirm('Permanently delete the DEMO project, demo users and all sample records? Live project data is not affected.', 'Delete sample data')) G.act(async () => { await G.post('/admin/purge-sample', {}); G.state.me = await G.get('/me'); G.state.meta = await G.get('/meta'); G.setProject(''); }, 'Sample data deleted'); };
      root.querySelector('#load').onclick = () => G.act(async () => { const r = await G.post('/admin/load-sample', {}); G.state.me = await G.get('/me'); G.state.meta = await G.get('/meta'); renderShell(); if (r.logins) setTimeout(() => G.modal('Sample data loaded', html`<p>Demo logins (password <b>${r.demoPassword}</b>):</p><p>${r.logins.join(', ')}</p>`), 300); }, 'Done');
    };
  } else if (tab === 'audit') {
    const rows = await G.get('/audit' + G.qs({ entity: p.entity }));
    body = html`<div class="tbl-wrap"><table class="tbl"><tr><th>Time</th><th>User</th><th>Action</th><th>Record</th><th>Detail</th></tr>${rows.map(r => html`<tr><td>${G.fmtDT(r.at)}</td><td>${r.user_name || '—'}</td><td>${r.action}</td><td>${r.entity} ${r.entity_id || ''}</td><td><small class="clip">${r.detail || ''}</small></td></tr>`)}</table></div>`;
  }
  const actions = { users: html`<button class="btn primary" id="newU">+ User</button>`, permissions: html`<button class="btn primary" id="savePerm">${t('save')}</button>`, reporting: html`<button class="btn primary" id="addRl">+ Reporting line</button>`, checklists: html`<button class="btn primary" id="newCl">+ Checklist</button>` }[tab] || '';
  return G.mount(G.page(t('admin'), html`<div class="tabs scroll">${tabs.map(([k, l]) => html`<a href="#/admin?tab=${k}" class="${tab === k ? 'on' : ''}">${l}</a>`)}</div>${body}`, actions), bind);
});

// ================= REPORTS & DOWNLOADS =================
G.route('/exports', async () => {
  const p = G.params();
  const types = await G.get('/report-types');
  const type = p.type || (types[0] && types[0].key);
  const weekAgo = new Date(Date.now() - 6 * 864e5).toISOString().slice(0, 10);
  const q = { project_id: p.project_id ?? G.state.project, from: p.from || weekAgo, to: p.to || G.today(), contractor_id: p.contractor_id, user_id: p.user_id, location_id: p.location_id, status: p.status };
  let rep = null, err = null;
  if (type && (p.go || p.type)) { try { rep = await G.get(`/reports-data/${type}` + G.qs(q)); } catch (e) { err = e; } }
  const locs = q.project_id ? await G.locationOpts(q.project_id).catch(() => []) : [];
  const dl = (fmt) => `/api/reports-export/${type}.${fmt}${G.qs({ ...q, token: localStorage.getItem('gs_token') })}`;
  return G.mount(G.page(t('reports'), html`
    <form class="form filters-form" id="repF">
      <div class="field"><label>Report</label><select name="type">${types.map(x => html`<option value="${x.key}" ${x.key === type ? 'selected' : ''}>${x.title}</option>`)}</select></div>
      <div class="field half"><label>${t('project')}</label><select name="project_id"><option value="">${t('all_projects')}</option>${G.projectOpts().map(o => html`<option value="${o.value}" ${String(o.value) === String(q.project_id) ? 'selected' : ''}>${o.label}</option>`)}</select></div>
      <div class="field half"><label>${t('contractor')}</label><select name="contractor_id"><option value="">${t('all')}</option>${G.contractorOpts().map(o => html`<option value="${o.value}" ${String(o.value) === String(q.contractor_id) ? 'selected' : ''}>${o.label}</option>`)}</select></div>
      <div class="field half"><label>Person</label><select name="user_id"><option value="">${t('all')}</option>${G.userOpts().map(o => html`<option value="${o.value}" ${String(o.value) === String(q.user_id) ? 'selected' : ''}>${o.label}</option>`)}</select></div>
      <div class="field half"><label>${t('location')}</label><select name="location_id"><option value="">${t('all')}</option>${locs.map(o => html`<option value="${o.value}" ${String(o.value) === String(q.location_id) ? 'selected' : ''}>${o.label}</option>`)}</select></div>
      <div class="field half"><label>Status</label><input name="status" value="${q.status || ''}" placeholder="e.g. rework_required"></div>
      <div class="field half"><label>From</label><input type="date" name="from" value="${q.from}"></div><div class="field half"><label>To</label><input type="date" name="to" value="${q.to}"></div>
      <div class="actions left"><button class="btn primary">${t('preview')}</button>${rep ? html`<a class="btn" href="${dl('pdf')}">⇩ PDF</a><a class="btn" href="${dl('xlsx')}">⇩ Excel</a>` : ''}</div></form>
    ${err ? G.errorBox(err) : ''}
    ${rep ? html`<section class="panel report-preview"><div class="rp-head"><img src="/icon-192.png" alt=""><div><b>${rep.meta.company}</b><h2>${rep.title} ${rep.meta.sample ? html`<span class="badge sample">INCLUDES SAMPLE DATA</span>` : ''}</h2><small>${rep.meta.projects} · ${rep.meta.from || '—'} → ${rep.meta.to || '—'} · Prepared by ${rep.meta.preparedBy} · ${rep.meta.generatedAt}</small></div></div>
      ${rep.summary.length ? html`<div class="chips">${rep.summary.map(([k, v]) => html`<span class="chip">${k}: <b>${v}</b></span>`)}</div>` : ''}
      ${rep.rows.length ? html`<div class="tbl-wrap"><table class="tbl"><tr>${rep.columns.map(c => html`<th>${c.label}</th>`)}</tr>${rep.rows.slice(0, 500).map(r => html`<tr>${rep.columns.map(c => html`<td>${r[c.key] ?? ''}</td>`)}</tr>`)}</table></div>${rep.rows.length > 500 ? html`<p class="muted">Showing 500 of ${rep.rows.length} rows — download for the full report.</p>` : ''}` : G.empty('No records for the selected filters.')}</section>` : ''}`), (root) => {
    root.querySelector('#repF').onsubmit = (e) => { e.preventDefault(); const f = e.target; const v = {}; [...f.elements].forEach(el => { if (el.name) v[el.name] = el.value; }); G.setQuery('/exports', { ...v, go: 1 }); };
    root.querySelector('[name=project_id]').onchange = (e) => { const f = root.querySelector('#repF'); const v = {}; [...f.elements].forEach(el => { if (el.name) v[el.name] = el.value; }); v.location_id = ''; G.setQuery('/exports', v); };
  });
});
})();
