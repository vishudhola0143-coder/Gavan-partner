/* GAVAN SITE — shell, login, home/dashboard, summary, notifications, profile, sync */
(() => {
'use strict';
const { html, raw, esc, t } = G;

function renderLogin(msg) {
  document.body.classList.add('logged-out');
  document.getElementById('app').innerHTML = String(html`
  <div class="login">
    <div class="login-card">
      <img src="/logo.jpg" alt="GAVAN — The Key of Luxury" class="login-logo" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'text-logo',textContent:'GAVAN'}))">
      <h1>GAVAN SITE</h1><p class="tagline">${t('app_tagline')}</p>
      <form id="loginForm">
        <label>${t('login_id')}<input name="login" autocomplete="username" required autocapitalize="off"></label>
        <label>${t('password')}<input name="password" type="password" autocomplete="current-password" required></label>
        <div class="form-error">${msg || ''}</div>
        <button class="btn primary big full">${t('sign_in')}</button>
      </form>
      <div class="lang-switch">${['en', 'hi', 'gu'].map(l => html`<button data-l="${l}" class="${(localStorage.getItem('gs_lang') || 'en') === l ? 'on' : ''}">${{ en: 'English', hi: 'हिन्दी', gu: 'ગુજરાતી' }[l]}</button>`)}</div>
      <div id="demoNote"></div>
    </div>
  </div>`);
  document.querySelectorAll('.lang-switch button').forEach(b => { b.onclick = () => { localStorage.setItem('gs_lang', b.dataset.l); renderLogin(); }; });
  fetch('/api/public/branding').then(r => r.json()).then(b => {
    if (!b.demo) return;
    const logins = [['director', 'Director (all access)'], ['demo.pm', 'Project Manager'], ['demo.supervisor', 'Site Supervisor'], ['demo.engineer', 'Site Engineer'], ['demo.contractor', 'Contractor'], ['demo.structural', 'Structural Engineer'], ['demo.purchase', 'Purchase'], ['demo.accounts', 'Accounts']];
    const box = document.getElementById('demoNote');
    box.innerHTML = String(html`<div class="info-box warn" style="text-align:left;margin-top:16px"><b>DEMO version</b> — data is temporary and may reset. Password for all: <b>demo1234</b>. Tap a role to login:<div class="checks" style="margin-top:8px">${logins.map(([l, n]) => html`<button type="button" class="btn small ghost" data-demo="${l}">${n}</button>`)}</div></div>`);
    box.querySelectorAll('[data-demo]').forEach(x => { x.onclick = () => { const f = document.getElementById('loginForm'); f.login.value = x.dataset.demo; f.password.value = 'demo1234'; f.requestSubmit(); }; });
  }).catch(() => {});
  document.getElementById('loginForm').onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target; const btn = f.querySelector('button'); btn.disabled = true;
    try {
      const r = await G.api('POST', '/auth/login', { login: f.login.value.trim(), password: f.password.value }, { noAuthRedirect: true });
      localStorage.setItem('gs_token', r.token); await boot();
    } catch (ex) { f.querySelector('.form-error').textContent = ex.message; btn.disabled = false; }
  };
}
window.renderLogin = renderLogin;

async function boot() {
  if (!localStorage.getItem('gs_token')) return renderLogin();
  try {
    const me = await G.get('/me');
    G.state.me = me;
    if (me.user.lang) localStorage.setItem('gs_lang', me.user.lang);
    G.state.meta = me.user.must_change_password ? { users: [], contractors: [], roles: {} } : await G.get('/meta');
    if (G.state.project && !me.projects.find(p => String(p.id) === G.state.project)) G.state.project = '';
    const active = me.projects.filter(p => p.status !== 'archived');
    if (!G.state.project && active.length === 1) G.state.project = String(active[0].id);
    document.body.classList.remove('logged-out');
    renderShell(); G.router(); G.updateSyncBadge(); G.queue.sync(); pollCounts();
  } catch (e) { if (e.network) { document.getElementById('app').innerHTML = String(G.errorBox(e)); setTimeout(boot, 5000); } }
}

function navItems() {
  const c = G.can;
  return [
    { k: 'home', href: '/', icon: '⌂', show: true },
    { k: 'summary', href: '/summary', icon: '▤', show: c('dashboard.view') },
    { k: 'tasks', href: '/tasks', icon: '✓', show: true },
    { k: 'daily_report', href: '/report', icon: '☀', show: c('reports.submit') || c('reports.view') },
    { k: 'drawings', href: '/drawings', icon: '⌗', show: true },
    { k: 'quality', href: '/quality', icon: '◎', show: c('inspections.create') || c('inspections.signoff') || G.state.me.user.role === 'contractor' },
    { k: 'materials', href: '/materials', icon: '▦', show: c('materials.request') || c('purchase.manage') || c('accounts.review') || c('materials.approve') },
    { k: 'labour', href: '/labour', icon: '☺', show: c('labour.record') },
    { k: 'plans', href: '/plans', icon: '◫', show: c('plans.manage') },
    { k: 'contractors', href: '/contractors', icon: '⚒', show: G.state.me.user.role !== 'contractor' },
    { k: 'files', href: '/files', icon: '🗀', show: G.state.me.user.role !== 'contractor' },
    { k: 'chat', href: '/chat', icon: '✉', show: true, badge: 'chat-count' },
    { k: 'meetings', href: '/meetings', icon: '◷', show: true },
    { k: 'reports', href: '/exports', icon: '⇩', show: c('exports') },
    { k: 'projects', href: '/projects', icon: '▣', show: c('projects.manage') },
    { k: 'admin', href: '/admin', icon: '⚙', show: c('users.manage') || c('settings.manage') },
  ].filter(i => i.show);
}

function renderShell() {
  const me = G.state.me;
  const projOpts = G.projects();
  const items = navItems();
  document.getElementById('app').innerHTML = String(html`
  <header class="topbar">
    <a href="#/" class="brand"><img src="${me.branding.logo}" alt="" onerror="this.style.display='none'"><span><b>GAVAN SITE</b><small>${me.branding.company}</small></span></a>
    <select id="projSel" class="proj-sel" aria-label="${t('project')}">
      <option value="">${t('all_projects')}</option>
      ${projOpts.map(p => html`<option value="${p.id}" ${String(p.id) === G.state.project ? 'selected' : ''}>${p.name}${p.is_sample ? ' [SAMPLE]' : ''}</option>`)}
    </select>
    <div class="top-actions">
      <a href="#/sync" class="icon-btn" title="${t('sync')}">⇅<span class="dot sync-count"></span></a>
      <a href="#/notifications" class="icon-btn" title="${t('notifications')}">🔔<span class="dot notif-count"></span></a>
      <a href="#/profile" class="avatar" title="${t('profile')}">${me.user.name.split(' ').map(s => s[0]).slice(0, 2).join('')}</a>
    </div>
  </header>
  <div id="netbar"></div>
  <div class="layout">
    <nav class="sidebar">
      ${items.map(i => html`<a href="#${i.href}" data-nav="${i.href}"><span class="ni">${i.icon}</span>${t(i.k)}${i.badge ? raw(`<span class="dot ${i.badge}"></span>`) : ''}</a>`)}
      <a href="#/profile" data-nav="/profile"><span class="ni">☻</span>${t('profile')}</a>
      <div class="side-foot">${me.user.name}<br><small>${me.roleLabel}</small></div>
    </nav>
    <main id="main" tabindex="-1"></main>
  </div>
  <nav class="bottomnav">
    <a href="#/" data-nav="/"><span>⌂</span>${t('home')}</a>
    <a href="#/tasks" data-nav="/tasks"><span>✓</span>${t('tasks')}</a>
    ${G.can('reports.submit') ? html`<a href="#/report" data-nav="/report" class="primary-tab"><span>☀</span>${t('daily_report')}</a>` : html`<a href="#/chat" data-nav="/chat"><span>✉</span>${t('chat')}</a>`}
    <a href="#/drawings" data-nav="/drawings"><span>⌗</span>${t('drawings')}</a>
    <a href="#/more" data-nav="/more"><span>☰</span>${t('more')}</a>
  </nav>`);
  document.getElementById('projSel').onchange = (e) => G.setProject(e.target.value);
  G.updateSyncBadge();
}
window.renderShell = renderShell;

async function pollCounts() {
  if (!G.state.me || document.hidden) return setTimeout(pollCounts, 30000);
  try {
    const c = await G.get('/notifications/count');
    document.querySelectorAll('.notif-count').forEach(el => { el.textContent = c.unread || ''; el.style.display = c.unread ? '' : 'none'; });
    document.querySelectorAll('.chat-count').forEach(el => { el.textContent = c.chats || ''; el.style.display = c.chats ? '' : 'none'; });
  } catch { /* offline */ }
  setTimeout(pollCounts, 30000);
}

// ---------------- More menu (mobile) ----------------
G.route('/more', () => G.page(t('more'), html`<div class="tiles">${navItems().filter(i => !['home'].includes(i.k)).map(i => html`<a class="tile" href="#${i.href}"><span>${i.icon}</span>${t(i.k)}</a>`)}
  <a class="tile" href="#/notifications"><span>🔔</span>${t('notifications')}</a><a class="tile" href="#/sync"><span>⇅</span>${t('sync')}</a><a class="tile" href="#/profile"><span>☻</span>${t('profile')}</a></div>`));

// ---------------- Home ----------------
G.route('/', async () => {
  const me = G.state.me;
  if (G.can('dashboard.view')) return dashboard();
  if (me.user.role === 'contractor') return contractorHome();
  return fieldHome();
});

async function fieldHome() {
  const me = G.state.me;
  const [tasks, mine] = await Promise.all([G.get('/tasks' + G.qs({ mine: 1, status: 'open,in_progress,rework,submitted', project_id: G.state.project })), G.can('reports.submit') ? G.get('/reports/mine') : []]);
  const todays = mine.filter(r => r.report_date === G.today());
  return G.mount(G.page(html`${t('home')} — ${me.user.name.split(' ')[0]}`, html`
    ${G.can('reports.submit') ? html`<div class="quick">
      <a class="qbtn ${todays.some(r => r.kind === 'morning') ? 'done' : ''}" href="#/report/new/morning"><span>☀</span>${t('new_morning')}${todays.some(r => r.kind === 'morning') ? raw(' ✓') : ''}</a>
      <a class="qbtn ${todays.some(r => r.kind === 'evening') ? 'done' : ''}" href="#/report/new/evening"><span>☾</span>${t('new_evening')}${todays.some(r => r.kind === 'evening') ? raw(' ✓') : ''}</a>
      ${G.can('labour.record') ? html`<a class="qbtn" href="#/labour?new=1"><span>☺</span>${t('record_attendance')}</a>` : ''}
      ${G.can('materials.request') ? html`<a class="qbtn" href="#/materials?new=1"><span>▦</span>${t('material_request')}</a>` : ''}
      ${G.can('drawings.request') ? html`<a class="qbtn" href="#/drawings?new=1"><span>⌗</span>${t('request_drawing')}</a>` : ''}
      ${G.can('inspections.create') ? html`<a class="qbtn" href="#/quality?new=1"><span>◎</span>${t('new_inspection')}</a>` : ''}
    </div>` : ''}
    <h2>${t('my_tasks')}</h2>${taskCards(tasks)}`));
}
async function contractorHome() {
  const [tasks, drawings, reqs, ins] = await Promise.all([G.get('/tasks' + G.qs({ project_id: G.state.project })), G.get('/drawings' + G.qs({ project_id: G.state.project })), G.get('/drawing-requests' + G.qs({ project_id: G.state.project })), G.get('/inspections' + G.qs({ project_id: G.state.project, status: 'rework_required,reinspection_due' }))]);
  return G.mount(G.page(html`${G.state.me.contractor ? G.state.me.contractor.name : t('home')}`, html`
    <div class="quick"><a class="qbtn" href="#/drawings?new=1"><span>⌗</span>${t('request_drawing')}</a></div>
    ${ins.length ? html`<h2>${t('quality_issues')}</h2><div class="cards">${ins.map(i => html`<a class="card link" href="#/quality/${i.id}"><b>${i.work_type}</b> ${G.badge(i.status)}<div class="muted">${i.location} · ${t('due_date')} ${G.fmtDate(i.correction_deadline)}</div></a>`)}</div>` : ''}
    <h2>${t('tasks')}</h2>${taskCards(tasks.filter(x => x.status !== 'closed'))}
    <h2>${t('drawings')}</h2>${drawings.length ? html`<div class="cards">${drawings.map(d => html`<a class="card link" href="#/drawings/${d.id}"><b>${d.number}</b> Rev ${d.current.revision} ${G.badge('approved')}<div class="muted">${d.title || ''}</div></a>`)}</div>` : G.empty()}
    <h2>${t('requests')}</h2>${reqs.length ? html`<div class="cards">${reqs.map(r => html`<a class="card link" href="#/drawings/req/${r.id}"><b>${r.title}</b> ${G.badge(r.status)}<div class="muted">${r.project_name} · ${G.fmtDate(r.required_by)}</div></a>`)}</div>` : G.empty()}`));
}
function taskCards(tasks) {
  if (!tasks.length) return G.empty();
  return html`<div class="cards">${tasks.map(x => html`<a class="card link ${x.overdue ? 'overdue' : ''}" href="#/tasks/${x.id}"><div class="row-between"><b>${x.title}</b>${G.badge(x.status)}</div>
    <div class="muted">${x.project_name}${x.location ? ' · ' + x.location : ''}</div><div class="meta">${G.badge(x.priority)} ${x.due_date ? html`<span class="${x.overdue ? 'red-text' : ''}">${t('due_date')}: ${G.fmtDate(x.due_date)}</span>` : ''} ${x.contractor_name || x.assignee_name || ''}</div></a>`)}</div>`;
}
G.taskCards = taskCards;

async function dashboard() {
  const d = await G.get('/dashboard' + G.qs({ project_id: G.state.project }));
  const c = d.cards; const pa = c.pending_approvals; const totalPa = pa.tasks + pa.drawings + pa.materials + pa.inspections;
  const card = (label, value, href, cls = '', sub = '') => html`<a class="kpi ${cls}" href="${href}"><div class="kv">${value}</div><div class="kl">${label}</div>${sub ? html`<div class="ks">${sub}</div>` : ''}</a>`;
  const proj = G.state.project;
  return G.mount(G.page(t('dashboard'), html`
    <div class="kpis">
      ${card(t('planned_today'), c.planned_today, '#/report?from=' + d.date + '&to=' + d.date, '', `${c.morning_reports} morning reports`)}
      ${card(t('completed_today'), c.completed_today, '#/report?kind=evening&from=' + d.date + '&to=' + d.date, '', `${c.evening_reports} evening reports`)}
      ${card(t('labour_today'), c.labour_present, '#/labour?from=' + d.date + '&to=' + d.date, '', c.labour_planned ? `Planned ${c.labour_planned}` : c.labour_source)}
      ${card(t('overdue_tasks'), c.overdue_tasks, '#/tasks?overdue=1', c.overdue_tasks ? 'alert' : '')}
      ${card(t('pending_approvals'), totalPa, '#/summary', totalPa ? 'warn' : '', `Tasks ${pa.tasks} · Dwg ${pa.drawings} · Mat ${pa.materials} · QC ${pa.inspections}`)}
      ${card(t('material_shortages'), c.material_shortages, '#dash-short', c.material_shortages ? 'alert' : '')}
      ${card(t('pending_drawings'), c.pending_drawing_requests, '#/drawings?tab=requests&status=requested,forwarded,uploaded,revision_required')}
      ${card(t('quality_issues'), c.quality_issues, '#/quality?status=rework_required,reinspection_due', c.quality_issues ? 'warn' : '')}
      ${card(t('delayed'), c.delayed, '#dash-delays', c.delayed ? 'warn' : '')}
      ${card(t('missing_reports'), d.missingReports.length, '#dash-missing', d.missingReports.length ? 'alert' : '')}
    </div>
    <section class="panel"><h2>${t('progress')}</h2>
      <div class="progress-list">${d.projects.map(p => html`<a href="#/projects/${p.id}" class="prog"><div class="row-between"><span>${p.name} ${G.sampleTag(p)}</span><b>${p.progress.percent == null ? '—' : p.progress.percent + '%'}</b></div>
        <div class="bar"><i style="width:${p.progress.percent || 0}%"></i></div><small class="muted">${p.progress.method}</small></a>`)}</div></section>
    <div class="grid2">
      <section class="panel" id="dash-missing"><h2>${t('missing_reports')}</h2>${d.missingReports.length ? html`<table class="tbl"><tr><th>${t('project')}</th><th>Report</th><th>Supervisor</th><th>Deadline</th></tr>${d.missingReports.map(m => html`<tr><td>${m.project_name}</td><td>${m.kind}</td><td>${m.user_name}</td><td>${m.deadline}</td></tr>`)}</table>` : G.empty('All reports submitted so far today.')}</section>
      <section class="panel" id="dash-short"><h2>${t('material_shortages')}</h2>${d.shortages.length ? html`<table class="tbl"><tr><th>Material</th><th>Qty</th><th>Status</th><th>${t('project')}</th></tr>${d.shortages.map(s => html`<tr class="link" data-href="${s.src === 'report' ? '#/reports/' + s.id : '#/materials/req/' + s.id}"><td>${s.material}</td><td>${s.qty} ${s.unit || ''}</td><td>${s.status}${s.required_by ? ' · by ' + G.fmtDate(s.required_by) : ''}</td><td>${s.project_name}</td></tr>`)}</table>` : G.empty()}</section>
      <section class="panel" id="dash-delays"><h2>${t('delayed')}</h2>${d.delays.length + d.missedPlans.length ? html`<table class="tbl"><tr><th>Date</th><th>Activity</th><th>Reason</th><th>${t('project')}</th></tr>
        ${d.delays.map(x => html`<tr class="link" data-href="#/reports/${x.report_id}"><td>${G.fmtDate(x.date)}</td><td>${x.activity}</td><td>${x.reason}</td><td>${x.project_name}</td></tr>`)}
        ${d.missedPlans.map(x => html`<tr class="link" data-href="#/plans"><td>${G.fmtDate(x.date)}</td><td>${x.activity} (target)</td><td>${x.reason || '—'}${x.revised_date ? ' · revised ' + G.fmtDate(x.revised_date) : ''}</td><td>${x.project_name}</td></tr>`)}</table>` : G.empty()}</section>
      <section class="panel"><h2>${t('upcoming')}</h2>${d.upcoming.length ? html`<table class="tbl">${d.upcoming.map(u => html`<tr class="link" data-href="${{ task: '#/tasks/', drawing: '#/drawings/req/', material: '#/materials/req/', meeting: '#/meetings/' }[u.type] + u.id}"><td>${G.fmtDate(u.date)}</td><td><span class="badge grey">${u.type}</span></td><td>${u.title}</td><td>${u.project_name || ''}</td></tr>`)}</table>` : G.empty()}</section>
    </div>
    <section class="panel"><h2>${t('contractor_perf')}</h2>${d.contractors.length ? html`<div class="tbl-wrap"><table class="tbl"><tr><th>Contractor</th><th>Trade</th><th>Tasks done</th><th>Overdue</th><th>Reworks</th><th>QC first-time pass</th><th>Targets achieved</th></tr>
      ${d.contractors.map(x => html`<tr class="link" data-href="#/contractors/${x.id}"><td>${x.name}</td><td>${x.trade}</td><td>${x.tasks_done}/${x.tasks_total}</td><td>${x.tasks_overdue}</td><td>${x.reworks}</td><td>${x.first_time_pass_pct == null ? '—' : x.first_time_pass_pct + '%'}</td><td>${x.targets_achieved_pct == null ? '—' : x.targets_achieved_pct + '%'}</td></tr>`)}</table></div>` : G.empty()}</section>
  `, html`${G.can('exports') ? html`<a class="btn" href="#/exports?type=management_summary${proj ? '&project_id=' + proj : ''}">⇩ ${t('reports')}</a>` : ''}`, html`${proj ? G.projectName(proj) : t('all_projects')} · ${G.fmtDate(d.date)}`), (root) => {
    G.on(root, 'tr.link', 'click', (e, el) => { location.hash = el.dataset.href; });
    G.on(root, 'a.kpi[href^="#dash"]', 'click', (e, el) => { e.preventDefault(); root.querySelector(el.getAttribute('href')).scrollIntoView({ behavior: 'smooth' }); });
  });
}

// ---------------- Consolidated summary (Anushka / directors) ----------------
G.route('/summary', async () => {
  const p = G.params();
  const d = await G.get('/summary' + G.qs({ project_id: G.state.project, date: p.date }));
  return G.mount(G.page(t('summary'), html`
    <div class="filters"><label class="fdate"><span>${t('date')}</span><input type="date" id="sumDate" value="${d.date}"></label></div>
    <section class="panel"><h2>Project status</h2><div class="tbl-wrap"><table class="tbl"><tr><th>${t('project')}</th><th>${t('progress')}</th><th>Morning / Evening reports</th><th>Overdue tasks</th><th>Open quality</th><th>Material pending</th><th>Drawings pending</th></tr>
      ${d.perProject.map(x => html`<tr><td>${x.name}</td><td>${x.progress == null ? '—' : x.progress + '%'}</td><td>${x.reports.morning || 0} / ${x.reports.evening || 0}</td><td>${x.overdue}</td><td>${x.quality_open}</td><td>${x.material_pending}</td><td>${x.drawings_pending}</td></tr>`)}</table></div></section>
    <div class="grid2">
      <section class="panel"><h2>Decisions requiring attention (${d.decisions.length})</h2>${d.decisions.length ? html`<table class="tbl">${d.decisions.map(x => html`<tr class="link" data-href="${x.link}"><td><span class="badge amber">${x.kind}</span></td><td>${x.title}</td><td>${x.project_name}</td></tr>`)}</table>` : G.empty()}</section>
      <section class="panel"><h2>${t('missing_reports')} (${d.missingReports.length})</h2>${d.missingReports.length ? html`<table class="tbl">${d.missingReports.map(m => html`<tr><td>${m.project_name}</td><td>${m.kind}</td><td>${m.user_name}</td></tr>`)}</table>` : G.empty('None')}</section>
      <section class="panel"><h2>Unresolved issues & escalations sent to you</h2>${d.escalations.length ? html`<table class="tbl">${d.escalations.map(x => html`<tr class="link" data-href="${x.link}"><td>${G.fmtDT(x.created_at)}</td><td><b>${x.title}</b><div class="muted">${x.body}</div></td></tr>`)}</table>` : G.empty()}</section>
      <section class="panel"><h2>Reporting structure</h2>${d.reportingLines.length ? html`<table class="tbl">${d.reportingLines.map(l => html`<tr><td>${l.from_name || (l.from_role ? G.state.meta.roles[l.from_role] : '') || (l.department ? l.department + ' dept.' : 'All')}</td><td>→</td><td><b>${l.to_name}</b></td><td class="muted">${l.project_name || 'All projects'}</td></tr>`)}</table>` : G.empty()}
        ${G.can('settings.manage') ? html`<a href="#/admin?tab=reporting" class="btn small ghost">${t('edit')}</a>` : ''}</section>
    </div>`, '', G.state.project ? G.projectName(G.state.project) : t('all_projects')), (root) => {
    G.on(root, 'tr.link', 'click', (e, el) => { location.hash = el.dataset.href; });
    root.querySelector('#sumDate').onchange = (e) => G.setQuery('/summary', { date: e.target.value });
  });
});

// ---------------- Notifications ----------------
G.route('/notifications', async () => {
  const d = await G.get('/notifications');
  return G.mount(G.page(t('notifications'), d.items.length ? html`<div class="notif-list">${d.items.map(n => html`<a class="notif ${n.read ? '' : 'unread'}" href="${n.link || '#/notifications'}" data-id="${n.id}"><b>${n.title}</b><div>${n.body}</div><small>${G.fmtDT(n.created_at)}</small></a>`)}</div>` : G.empty(),
    html`<button class="btn" id="readAll">${t('mark_all_read')}</button>`), (root) => {
    root.querySelector('#readAll').onclick = () => G.act(() => G.post('/notifications/read', {}));
    G.on(root, '.notif', 'click', (e, el) => { G.post('/notifications/read', { id: Number(el.dataset.id) }).catch(() => {}); });
  });
});

// ---------------- Profile ----------------
G.route('/profile', async () => {
  const me = G.state.me; const force = G.params().force;
  return G.mount(G.page(t('profile'), html`
    ${force || me.user.must_change_password ? html`<div class="info-box warn">You are using a temporary password. Please set your own password to continue.</div>` : ''}
    <section class="panel"><h2>${me.user.name}</h2><p>${me.roleLabel}${me.contractor ? ' · ' + me.contractor.name : ''}</p><p class="muted">Login: ${me.user.login}</p>
      <label>${t('language')}<div class="lang-switch">${['en', 'hi', 'gu'].map(l => html`<button data-l="${l}" class="${me.user.lang === l ? 'on' : ''}">${{ en: 'English', hi: 'हिन्दी', gu: 'ગુજરાતી' }[l]}</button>`)}</div></label></section>
    <section class="panel"><h2>${t('change_password')}</h2><form id="pwForm" class="form">
      <div class="field"><label>${t('current_password')}</label><input type="password" name="current" autocomplete="current-password" required></div>
      <div class="field"><label>${t('new_password')}</label><input type="password" name="next" autocomplete="new-password" minlength="8" required></div>
      <div class="form-error"></div><button class="btn primary">${t('save')}</button></form></section>
    <section class="panel"><h2>${t('notifications')}</h2><button class="btn" id="pushBtn">${t('enable_push')}</button><p class="muted" id="pushMsg"></p></section>
    <button class="btn danger" id="logoutBtn">${t('logout')}</button>`), (root) => {
    G.on(root, '.lang-switch button', 'click', async (e, b) => { await G.put('/me', { lang: b.dataset.l }); me.user.lang = b.dataset.l; localStorage.setItem('gs_lang', b.dataset.l); renderShell(); G.router(); });
    root.querySelector('#pwForm').onsubmit = async (e) => {
      e.preventDefault(); const f = e.target;
      try { await G.post('/auth/password', { current: f.current.value, next: f.next.value }); G.toast('Password changed'); me.user.must_change_password = 0; G.state.meta = await G.get('/meta'); location.hash = '#/'; }
      catch (ex) { f.querySelector('.form-error').textContent = ex.message; }
    };
    root.querySelector('#logoutBtn').onclick = async () => { try { await G.post('/auth/logout', {}); } catch { /* ignore */ } localStorage.removeItem('gs_token'); G.state.me = null; renderLogin(); };
    root.querySelector('#pushBtn').onclick = enablePush;
  });
});
async function enablePush() {
  const msg = document.getElementById('pushMsg');
  try {
    const { key } = await G.get('/push/key');
    if (!key) { msg.textContent = 'Push notifications are not configured yet. An admin must enable Web Push in Admin → Integrations.'; return; }
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) { msg.textContent = 'This browser does not support push notifications.'; return; }
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') { msg.textContent = 'Permission was not granted.'; return; }
    const reg = await navigator.serviceWorker.ready;
    const pad = '='.repeat((4 - key.length % 4) % 4); const b = atob((key + pad).replace(/-/g, '+').replace(/_/g, '/'));
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: Uint8Array.from(b, c => c.charCodeAt(0)) });
    await G.post('/push/subscribe', sub.toJSON()); msg.textContent = 'Push enabled on this device.';
  } catch (e) { msg.textContent = 'Could not enable push: ' + e.message; }
}

// ---------------- Offline sync queue ----------------
G.route('/sync', async () => {
  const items = (await G.queue.list()).filter(i => i.userId === G.state.me.user.id);
  return G.mount(G.page(t('sync'), html`
    <p class="muted">${navigator.onLine ? 'Online' : 'Offline'} · Items saved on this device are uploaded automatically when the connection returns. Each item carries a unique ID so the server never creates duplicates.</p>
    ${items.length ? html`<div class="cards">${items.map(i => html`<div class="card"><div class="row-between"><b>${i.label}</b>${G.badge(i.status === 'failed' ? 'failed' : 'in_transit')}</div>
      <div class="muted">Saved ${G.fmtDT(i.created)} · ${(i.photos || []).length} photo(s)</div>${i.error ? html`<div class="red-text">${i.error}</div>` : ''}
      <div class="actions"><button class="btn small" data-retry="${i.id}">${t('retry')}</button><button class="btn small danger ghost" data-del="${i.id}">${t('delete')}</button></div></div>`)}</div>` : G.empty('Nothing waiting to upload.')}`,
  html`<button class="btn primary" id="syncNow">⇅ Sync now</button>`), (root) => {
    root.querySelector('#syncNow').onclick = async () => { await G.queue.sync(); G.router(); };
    G.on(root, '[data-retry]', 'click', async (e, b) => { const all = await G.queue.list(); const it = all.find(x => x.id === b.dataset.retry); it.status = 'pending'; it.error = null; await G.queue.remove(it.id); await G.queue.add(it); await G.queue.sync(); G.router(); });
    G.on(root, '[data-del]', 'click', async (e, b) => { if (await G.confirm('Discard this unsent item? It will be lost.', t('delete'))) { await G.queue.remove(b.dataset.del); G.router(); } });
  });
});

// service worker
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
document.addEventListener('visibilitychange', () => { if (!document.hidden) G.queue.sync(); });
window.G.boot = boot;
boot();
})();
