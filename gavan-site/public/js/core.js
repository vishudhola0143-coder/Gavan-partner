/* GAVAN SITE — core: API, state, router, UI helpers, offline queue, live camera */
'use strict';
const G = window.G = { state: { me: null, meta: null, project: localStorage.getItem('gs_project') || '', online: navigator.onLine }, routes: [], cache: {} };

// ---------- escaping template ----------
class Raw { constructor(s) { this.s = s; } toString() { return this.s; } }
const raw = (s) => new Raw(s == null ? '' : String(s));
const esc = (v) => (v instanceof Raw ? v.s : String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
function html(strings, ...vals) {
  let out = '';
  strings.forEach((s, i) => { out += s; if (i < vals.length) { const v = vals[i]; out += Array.isArray(v) ? v.map(x => (x instanceof Raw ? x.s : esc(x))).join('') : esc(v); } });
  return raw(out);
}
Object.assign(G, { raw, esc, html });

// ---------- i18n ----------
const t = G.t = (k) => { const L = G.state.me ? G.state.me.user.lang : (localStorage.getItem('gs_lang') || 'en'); return (window.I18N[L] && window.I18N[L][k]) || window.I18N.en[k] || k; };

// ---------- API ----------
const API = G.api = async function (method, url, body, opts = {}) {
  const headers = { Authorization: 'Bearer ' + (localStorage.getItem('gs_token') || '') };
  let payload;
  if (body instanceof FormData) payload = body; else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  let res;
  try { res = await fetch('/api' + url, { method, headers, body: payload }); }
  catch (e) { const err = new Error(t('offline_msg')); err.network = true; throw err; }
  if (res.status === 401 && !opts.noAuthRedirect) { localStorage.removeItem('gs_token'); G.state.me = null; renderLogin(); throw new Error('Login required'); }
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('json') ? await res.json() : await res.blob();
  if (res.status === 428) { location.hash = '#/profile?force=1'; }
  if (!res.ok) { const err = new Error((data && data.error) || 'Request failed'); err.status = res.status; err.data = data; throw err; }
  return data;
};
G.get = (u) => API('GET', u); G.post = (u, b) => API('POST', u, b); G.put = (u, b) => API('PUT', u, b); G.del = (u) => API('DELETE', u);
G.fileUrl = (id, dl) => `/api/files/${id}/raw?token=${encodeURIComponent(localStorage.getItem('gs_token') || '')}${dl ? '&download=1' : ''}`;
G.qs = (o) => { const p = Object.entries(o).filter(([, v]) => v !== '' && v != null && v !== undefined); return p.length ? '?' + p.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&') : ''; };
G.uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'u' + Date.now() + Math.random().toString(16).slice(2));
G.can = (cap) => !!G.state.me && G.state.me.caps.includes(cap);
G.today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60e3).toISOString().slice(0, 10);
G.fmtDate = (s) => (s ? new Date(s.length <= 10 ? s + 'T00:00' : s.replace(' ', 'T') + (s.includes('T') || s.includes('Z') ? '' : 'Z')).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
G.fmtDT = (s) => (s ? new Date(s.includes('T') ? s : s.replace(' ', 'T') + 'Z').toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');

// ---------- toasts / modal ----------
G.toast = (msg, type = 'ok') => {
  const el = document.createElement('div'); el.className = 'toast ' + type; el.textContent = msg;
  document.getElementById('toasts').appendChild(el); setTimeout(() => el.classList.add('show'), 10);
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, type === 'err' ? 6000 : 3200);
};
G.modal = (title, content, opts = {}) => {
  const wrap = document.getElementById('modal');
  wrap.innerHTML = `<div class="modal-card ${opts.wide ? 'wide' : ''}" role="dialog" aria-modal="true"><div class="modal-head"><h3>${esc(title)}</h3><button class="icon-btn" data-close aria-label="Close">✕</button></div><div class="modal-body"></div></div>`;
  const body = wrap.querySelector('.modal-body');
  if (typeof content === 'string' || content instanceof Raw) body.innerHTML = String(content); else body.appendChild(content);
  wrap.classList.add('open');
  wrap.querySelector('[data-close]').onclick = G.closeModal;
  wrap.onclick = (e) => { if (e.target === wrap && !opts.sticky) G.closeModal(); };
  return body;
};
G.closeModal = () => { const w = document.getElementById('modal'); w.classList.remove('open'); w.innerHTML = ''; if (G._camStream) G.stopCamera(); };
G.confirm = (msg, label = t('confirm')) => new Promise(res => {
  const b = G.modal(t('please_confirm'), html`<p>${msg}</p><div class="actions"><button class="btn ghost" data-n>${t('cancel')}</button><button class="btn primary" data-y>${label}</button></div>`);
  b.querySelector('[data-y]').onclick = () => { G.closeModal(); res(true); };
  b.querySelector('[data-n]').onclick = () => { G.closeModal(); res(false); };
});
G.prompt = (title, label, opts = {}) => new Promise(res => {
  G.form({ title, fields: [{ name: 'v', label, type: opts.type || 'textarea', required: opts.required !== false, value: opts.value }], submitLabel: opts.submitLabel, submit: async (v) => { res(v.v); } , onCancel: () => res(null) });
});

// ---------- loading / empty / error states ----------
G.loading = () => raw(`<div class="state"><div class="spinner"></div><p>${esc(t('loading'))}</p></div>`);
G.empty = (msg, action) => html`<div class="state empty"><div class="state-icon">◇</div><p>${msg || t('nothing_here')}</p>${action || ''}</div>`;
G.errorBox = (e, retry) => html`<div class="state error"><div class="state-icon">!</div><p>${e.message || e}</p>${retry ? raw(`<button class="btn" onclick="G.router()">${esc(t('retry'))}</button>`) : ''}</div>`;

// ---------- status badges ----------
const STATUS_CLS = { open: 'grey', in_progress: 'blue', submitted: 'amber', approved: 'green', rework: 'red', closed: 'dark', requested: 'amber', forwarded: 'blue', uploaded: 'blue', revision_required: 'red', rejected: 'red',
  pending_approval: 'amber', superseded: 'grey', ordered: 'blue', partially_received: 'amber', received: 'green', awaiting_signoff: 'amber', rework_required: 'red', reinspection_due: 'blue', signed_off: 'green',
  pass: 'green', fail: 'red', planned: 'grey', achieved: 'green', partial: 'amber', missed: 'red', in_transit: 'blue', urgent: 'red', high: 'amber', medium: 'grey', low: 'grey', submitted_bill: 'amber', paid: 'green', part_paid: 'amber', active: 'green', archived: 'grey',
  sent: 'green', failed: 'red', not_configured: 'grey', skipped: 'grey', accepted_by_provider: 'blue' };
G.badge = (s) => html`<span class="badge ${STATUS_CLS[s] || 'grey'}">${t('st_' + s) !== 'st_' + s ? t('st_' + s) : String(s || '').replace(/_/g, ' ')}</span>`;
G.sampleTag = (o) => (o && o.is_sample ? html`<span class="badge sample">SAMPLE</span>` : '');

// ---------- project selection ----------
G.projects = () => (G.state.me ? G.state.me.projects.filter(p => p.status !== 'archived') : []);
G.projectName = (id) => (G.state.me.projects.find(p => p.id === Number(id)) || {}).name || '—';
G.setProject = (id) => { G.state.project = id ? String(id) : ''; localStorage.setItem('gs_project', G.state.project); G.cache = {}; renderShell(); G.router(); };
G.projectDetail = async (id) => { if (!G.cache['p' + id]) G.cache['p' + id] = await G.get('/projects/' + id); return G.cache['p' + id]; };

// ---------- generic form builder ----------
/* field types: text, number, date, datetime, time, textarea, select, multiselect, checkbox, rows, photos, files, location, user, contractor, hidden, info */
G.form = function ({ title, fields, submit, submitLabel, wide, onCancel, intro, offline, inline }) {
  const wrap = document.createElement('form'); wrap.className = 'form'; wrap.noValidate = true;
  if (intro) { const p = document.createElement('div'); p.className = 'form-intro'; p.innerHTML = String(intro); wrap.appendChild(p); }
  const state = {};
  for (const f of fields) {
    if (f.when === false) continue;
    const row = document.createElement('div'); row.className = 'field ' + (f.type || 'text') + (f.half ? ' half' : '');
    row.dataset.name = f.name || '';
    const id = 'f_' + (f.name || Math.random().toString(36).slice(2));
    const label = f.label ? `<label for="${id}">${esc(f.label)}${f.required ? ' <span class="req">*</span>' : ''}</label>` : '';
    const v = f.value == null ? '' : f.value;
    switch (f.type) {
      case 'info': row.innerHTML = `<div class="info-box">${String(f.html || esc(f.text))}</div>`; break;
      case 'hidden': row.style.display = 'none'; row.innerHTML = `<input type="hidden" name="${f.name}" value="${esc(v)}">`; break;
      case 'textarea': row.innerHTML = `${label}<textarea id="${id}" name="${f.name}" rows="${f.rows || 3}" placeholder="${esc(f.placeholder || '')}">${esc(v)}</textarea>`; break;
      case 'select': case 'user': case 'contractor': case 'location': {
        const opts = f.options || [];
        row.innerHTML = `${label}<select id="${id}" name="${f.name}">${f.required && !f.allowEmpty ? '<option value="">— ' + esc(t('select')) + ' —</option>' : '<option value="">—</option>'}${opts.map(o => `<option value="${esc(o.value)}" ${String(o.value) === String(v) ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select>`;
        break;
      }
      case 'multiselect': {
        const sel = (v || []).map(String);
        row.innerHTML = `${label}<div class="checks">${(f.options || []).map(o => `<label class="check"><input type="checkbox" name="${f.name}" value="${esc(o.value)}" ${sel.includes(String(o.value)) ? 'checked' : ''}> ${esc(o.label)}</label>`).join('') || '<span class="muted">—</span>'}</div>`;
        break;
      }
      case 'checkbox': row.innerHTML = `<label class="check big"><input type="checkbox" id="${id}" name="${f.name}" ${v ? 'checked' : ''}> ${esc(f.label)}</label>`; break;
      case 'rows': row.innerHTML = label; row.appendChild(G.rowsEditor(f, v || [])); break;
      case 'photos': row.innerHTML = label; state[f.name] = G.photoField(row, f); break;
      case 'files': row.innerHTML = label + `<input type="file" id="${id}" name="${f.name}" ${f.multiple !== false ? 'multiple' : ''} ${f.accept ? `accept="${f.accept}"` : ''}><div class="hint">${esc(f.hint || '')}</div>`; break;
      default: {
        const type = { number: 'number', date: 'date', datetime: 'datetime-local', time: 'time', password: 'password', email: 'email', tel: 'tel' }[f.type] || 'text';
        row.innerHTML = `${label}<input id="${id}" type="${type}" name="${f.name}" value="${esc(v)}" ${f.step ? `step="${f.step}"` : type === 'number' ? 'step="any"' : ''} ${f.min != null ? `min="${f.min}"` : ''} placeholder="${esc(f.placeholder || '')}" ${f.autocomplete ? `autocomplete="${f.autocomplete}"` : ''} ${f.list ? `list="${id}_l"` : ''}>${f.list ? `<datalist id="${id}_l">${f.list.map(x => `<option value="${esc(x)}">`).join('')}</datalist>` : ''}`;
      }
    }
    if (f.hint && f.type !== 'files') row.insertAdjacentHTML('beforeend', `<div class="hint">${esc(f.hint)}</div>`);
    if (f.onChange) row.addEventListener('change', (e) => f.onChange(e.target.value, wrap, e));
    wrap.appendChild(row);
  }
  const err = document.createElement('div'); err.className = 'form-error'; wrap.appendChild(err);
  const act = document.createElement('div'); act.className = 'actions sticky';
  act.innerHTML = `<button type="button" class="btn ghost" data-cancel>${esc(t('cancel'))}</button><button type="submit" class="btn primary big">${esc(submitLabel || t('save'))}</button>`;
  wrap.appendChild(act);
  act.querySelector('[data-cancel]').onclick = () => { if (inline && !inline.closest('#modal')) history.back(); else G.closeModal(); onCancel && onCancel(); };
  wrap.onsubmit = async (e) => {
    e.preventDefault(); err.textContent = '';
    const values = G.formValues(wrap, fields, state);
    const missing = fields.filter(f => f.required && f.when !== false && (values[f.name] === '' || values[f.name] == null || (Array.isArray(values[f.name]) && !values[f.name].length)));
    if (missing.length) { err.textContent = t('required_missing') + ': ' + missing.map(m => m.label).join(', '); wrap.querySelector(`[data-name="${missing[0].name}"]`)?.scrollIntoView({ block: 'center' }); return; }
    const btn = act.querySelector('[type=submit]'); btn.disabled = true; btn.classList.add('busy');
    try { await submit(values, wrap); if (!inline) G.closeModal(); }
    catch (ex) {
      if (ex.network && offline) { await offline(values); if (!inline) G.closeModal(); }
      else { err.textContent = ex.message; G.toast(ex.message, 'err'); }
    } finally { btn.disabled = false; btn.classList.remove('busy'); }
  };
  if (inline) { inline.appendChild(wrap); return wrap; }
  G.modal(title, wrap, { wide, sticky: true });
  return wrap;
};
G.formValues = (wrap, fields, state) => {
  const v = {};
  for (const f of fields) {
    if (!f.name || f.when === false) continue;
    if (f.type === 'checkbox') v[f.name] = wrap.querySelector(`[name="${f.name}"]`).checked;
    else if (f.type === 'multiselect') v[f.name] = [...wrap.querySelectorAll(`[name="${f.name}"]:checked`)].map(x => (isNaN(x.value) ? x.value : Number(x.value)));
    else if (f.type === 'rows') v[f.name] = G.rowsValue(wrap.querySelector(`[data-name="${f.name}"] .rows`));
    else if (f.type === 'photos') v[f.name] = state[f.name].list;
    else if (f.type === 'files') v[f.name] = [...wrap.querySelector(`[name="${f.name}"]`).files];
    else { const el = wrap.querySelector(`[name="${f.name}"]`); v[f.name] = el ? el.value.trim() : ''; }
  }
  return v;
};

// ---------- repeating rows editor ----------
G.rowsEditor = (f, value) => {
  const box = document.createElement('div'); box.className = 'rows';
  const add = (vals = {}) => {
    const r = document.createElement('div'); r.className = 'row-item';
    r.innerHTML = f.columns.map(c => {
      const val = vals[c.name] == null ? (c.value == null ? '' : c.value) : vals[c.name];
      if (c.type === 'select') return `<label class="mini ${c.wide ? 'wide' : ''}"><span>${esc(c.label)}</span><select data-k="${c.name}"><option value=""></option>${c.options.map(o => `<option value="${esc(o.value)}" ${String(o.value) === String(val) ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select></label>`;
      return `<label class="mini ${c.wide ? 'wide' : ''}"><span>${esc(c.label)}</span><input data-k="${c.name}" type="${c.type === 'number' ? 'number' : 'text'}" ${c.type === 'number' ? 'step="any" inputmode="decimal"' : ''} value="${esc(val)}" ${c.list ? `list="dl_${c.name}"` : ''}></label>`;
    }).join('') + `<button type="button" class="icon-btn del" aria-label="Remove">✕</button>`;
    r.querySelector('.del').onclick = () => r.remove();
    if (f.onRowChange) r.addEventListener('change', (e) => f.onRowChange(r, e));
    list.appendChild(r);
  };
  const list = document.createElement('div'); list.className = 'row-list'; box.appendChild(list);
  f.columns.filter(c => c.list).forEach(c => box.insertAdjacentHTML('beforeend', `<datalist id="dl_${c.name}">${c.list.map(x => `<option value="${esc(x)}">`).join('')}</datalist>`));
  const b = document.createElement('button'); b.type = 'button'; b.className = 'btn ghost small'; b.textContent = '+ ' + (f.addLabel || t('add_row')); b.onclick = () => add(); box.appendChild(b);
  (value.length ? value : f.minRows === 0 ? [] : [{}]).forEach(add);
  box._add = add;
  return box;
};
G.rowsValue = (box) => [...box.querySelectorAll('.row-item')].map(r => { const o = {}; r.querySelectorAll('[data-k]').forEach(i => { o[i.dataset.k] = i.value.trim(); }); return o; })
  .filter(o => Object.values(o).some(x => x !== ''));

// ---------- live camera photo capture ----------
G.getGPS = () => new Promise(res => {
  if (!navigator.geolocation) return res(null);
  navigator.geolocation.getCurrentPosition(p => res({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: Math.round(p.coords.accuracy) }), () => res(null), { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 });
});
G.stopCamera = () => { if (G._camStream) { G._camStream.getTracks().forEach(tr => tr.stop()); G._camStream = null; } };
G.photoField = (row, f) => {
  const st = { list: [] };
  const grid = document.createElement('div'); grid.className = 'photo-grid';
  const btns = document.createElement('div'); btns.className = 'photo-btns';
  btns.innerHTML = `<button type="button" class="btn camera">📷 ${esc(t('take_live_photo'))}</button>`;
  const note = document.createElement('div'); note.className = 'hint'; note.textContent = t('live_photo_note');
  row.append(btns, grid, note);
  const redraw = () => {
    grid.innerHTML = st.list.map((p, i) => `<div class="ph"><img src="${p.url}" alt=""><div class="ph-meta">${p.gps ? '📍±' + p.gps.accuracy + 'm' : '⚠ ' + esc(t('no_gps'))}${p.offline ? ' · ⇅ ' + esc(t('offline')) : ''}${p.status === 'uploading' ? ' · …' : p.status === 'uploaded' ? ' · ✓' : p.status === 'queued' ? ' · ' + esc(t('queued')) : ''}</div><button type="button" class="icon-btn del" data-i="${i}">✕</button></div>`).join('');
    grid.querySelectorAll('.del').forEach(b => { b.onclick = () => { st.list.splice(Number(b.dataset.i), 1); redraw(); }; });
  };
  btns.querySelector('.camera').onclick = () => G.openCamera(async (blob, method) => {
    const captured_at = new Date().toISOString();
    const p = { uuid: G.uuid(), blob, url: URL.createObjectURL(blob), captured_at, method, gps: null, offline: !navigator.onLine, status: 'pending' };
    st.list.push(p); redraw();
    p.gps = await G.getGPS(); redraw();
    // upload immediately when online; otherwise keep blob for the offline queue
    if (navigator.onLine) {
      p.status = 'uploading'; redraw();
      try { p.id = await G.uploadPhoto(p, f.meta ? f.meta() : {}); p.status = 'uploaded'; } catch (e) { p.status = e.network ? 'queued' : 'error'; if (!e.network) G.toast(e.message, 'err'); }
      redraw();
    } else { p.status = 'queued'; redraw(); }
  });
  return st;
};
G.uploadPhoto = async (p, meta = {}) => {
  const fd = new FormData();
  fd.append('file', p.blob, `photo-${p.captured_at.replace(/[:.]/g, '-')}.jpg`);
  fd.append('kind', 'live_photo'); fd.append('client_uuid', p.uuid); fd.append('captured_at', p.captured_at);
  fd.append('captured_offline', p.offline ? '1' : '0');
  if (p.gps) { fd.append('gps_lat', p.gps.lat); fd.append('gps_lng', p.gps.lng); fd.append('gps_accuracy', p.gps.accuracy); }
  Object.entries(meta).forEach(([k, v]) => v != null && v !== '' && fd.append(k, v));
  const r = await API('POST', '/files', fd);
  return r.id;
};
G.openCamera = async (onShot) => {
  // Live camera stream (getUserMedia). If unavailable, fall back to the device camera input (capture=environment).
  const overlay = document.createElement('div'); overlay.className = 'camera-overlay';
  overlay.innerHTML = `<video autoplay playsinline muted></video><div class="cam-bar"><button type="button" class="btn ghost" data-x>${esc(t('close'))}</button><button type="button" class="shutter" aria-label="Capture"></button><span class="cam-count"></span></div>`;
  const fallback = () => {
    overlay.remove();
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.capture = 'environment';
    inp.onchange = () => { [...inp.files].forEach(fl => onShot(fl, 'device-camera-input')); };
    inp.click();
  };
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return fallback();
  try { G._camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1920 } }, audio: false }); }
  catch (e) { G.toast(t('camera_denied'), 'err'); return fallback(); }
  document.body.appendChild(overlay);
  const video = overlay.querySelector('video'); video.srcObject = G._camStream;
  let n = 0;
  overlay.querySelector('[data-x]').onclick = () => { G.stopCamera(); overlay.remove(); };
  overlay.querySelector('.shutter').onclick = () => {
    const c = document.createElement('canvas'); const w = video.videoWidth, hh = video.videoHeight;
    const scale = Math.min(1, 1600 / Math.max(w, hh)); c.width = w * scale; c.height = hh * scale;
    const ctx = c.getContext('2d'); ctx.drawImage(video, 0, 0, c.width, c.height);
    ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(0, c.height - 28, c.width, 28); ctx.fillStyle = '#fff'; ctx.font = '16px sans-serif';
    ctx.fillText(`GAVAN SITE · ${new Date().toLocaleString('en-IN')} · ${G.state.me.user.name}`, 8, c.height - 9);
    c.toBlob(b => { onShot(b, 'live-camera'); overlay.querySelector('.cam-count').textContent = ++n + ' ✓'; }, 'image/jpeg', 0.82);
    overlay.classList.add('flash'); setTimeout(() => overlay.classList.remove('flash'), 150);
  };
};
// upload documents from a files input
G.uploadDocs = async (files, meta) => {
  const ids = [];
  for (const fl of files || []) { const fd = new FormData(); fd.append('file', fl); Object.entries(meta).forEach(([k, v]) => v != null && v !== '' && fd.append(k, v)); ids.push((await API('POST', '/files', fd)).id); }
  return ids;
};
// photos: return ids of uploaded, upload pending ones now (throws network error if offline)
G.ensurePhotos = async (list, meta) => {
  const ids = [];
  for (const p of list || []) { if (!p.id) { p.id = await G.uploadPhoto(p, meta); p.status = 'uploaded'; } ids.push(p.id); }
  return ids;
};

// ---------- offline queue (IndexedDB) ----------
const IDB = {
  db: null,
  open() { return this.db ? Promise.resolve(this.db) : new Promise((res, rej) => { const r = indexedDB.open('gavan-site', 1); r.onupgradeneeded = () => r.result.createObjectStore('queue', { keyPath: 'id' }); r.onsuccess = () => { this.db = r.result; res(r.result); }; r.onerror = () => rej(r.error); }); },
  async tx(mode, fn) { const db = await this.open(); return new Promise((res, rej) => { const tr = db.transaction('queue', mode); const st = tr.objectStore('queue'); const out = fn(st); tr.oncomplete = () => res(out && out.result !== undefined ? out.result : out); tr.onerror = () => rej(tr.error); }); },
  put(item) { return this.tx('readwrite', s => s.put(item)); },
  del(id) { return this.tx('readwrite', s => s.delete(id)); },
  all() { return this.open().then(db => new Promise((res, rej) => { const r = db.transaction('queue').objectStore('queue').getAll(); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); })); },
};
G.queue = {
  // item: { id, label, url, method, body (with client_uuid), photos:[{uuid,blob,captured_at,gps,offline}], photoMeta, photoKey, userId }
  async add(item) {
    item.id = item.id || G.uuid(); item.created = new Date().toISOString(); item.status = 'pending'; item.userId = G.state.me.user.id;
    item.photos = (item.photos || []).map(p => ({ uuid: p.uuid, blob: p.blob, captured_at: p.captured_at, gps: p.gps, offline: true, id: p.id }));
    await IDB.put(item); G.toast(t('saved_offline'), 'warn'); G.updateSyncBadge();
  },
  list: () => IDB.all(),
  remove: async (id) => { await IDB.del(id); G.updateSyncBadge(); },
  async sync() {
    if (G._syncing || !navigator.onLine || !G.state.me) return;
    G._syncing = true;
    try {
      const items = (await IDB.all()).filter(i => i.userId === G.state.me.user.id);
      for (const it of items) {
        try {
          const ids = [];
          for (const p of it.photos || []) { if (!p.id) { p.id = await G.uploadPhoto(p, it.photoMeta || {}); await IDB.put(it); } ids.push(p.id); }
          const body = { ...it.body, captured_offline: true };
          if (it.photoKey) body[it.photoKey] = ids;
          await API(it.method || 'POST', it.url, body);
          await IDB.del(it.id); G.toast(t('synced') + ': ' + it.label);
        } catch (e) {
          if (e.network) break; // still offline
          if (e.status === 409 && /already submitted|Duplicate/.test(e.message)) { await IDB.del(it.id); continue; }
          it.status = 'failed'; it.error = e.message; await IDB.put(it);
        }
      }
    } finally { G._syncing = false; G.updateSyncBadge(); }
  },
};
G.updateSyncBadge = async () => {
  const n = G.state.me ? (await IDB.all()).filter(i => i.userId === G.state.me.user.id).length : 0;
  document.querySelectorAll('.sync-count').forEach(el => { el.textContent = n || ''; el.style.display = n ? '' : 'none'; });
  const bar = document.getElementById('netbar');
  if (bar) { bar.className = navigator.onLine ? (n ? 'pending' : 'ok') : 'off'; bar.innerHTML = navigator.onLine ? (n ? `⇅ ${n} ${esc(t('pending_uploads'))} — <a href="#/sync">${esc(t('view'))}</a>` : '') : `● ${esc(t('offline_banner'))}${n ? ` · ${n} ${esc(t('pending_uploads'))}` : ''}`; }
};
window.addEventListener('online', () => { G.state.online = true; G.updateSyncBadge(); G.queue.sync(); });
window.addEventListener('offline', () => { G.state.online = false; G.updateSyncBadge(); });
setInterval(() => G.queue.sync(), 30000);

// ---------- router ----------
G.route = (pattern, fn, opts = {}) => G.routes.push({ re: new RegExp('^' + pattern.replace(/:(\w+)/g, '([^/?]+)') + '(?:\\?.*)?$'), fn, opts });
G.params = () => Object.fromEntries(new URLSearchParams((location.hash.split('?')[1]) || ''));
G.router = async () => {
  if (!G.state.me) return;
  G.closeModal();
  const hash = location.hash.slice(1) || '/';
  const main = document.getElementById('main');
  if (G.state.me.user.must_change_password && !hash.startsWith('/profile')) { location.hash = '#/profile?force=1'; return; }
  for (const r of G.routes) {
    const m = hash.match(r.re);
    if (m) {
      document.querySelectorAll('[data-nav]').forEach(a => a.classList.toggle('active', hash === a.dataset.nav || (a.dataset.nav !== '/' && hash.startsWith(a.dataset.nav))));
      main.innerHTML = String(G.loading()); window.scrollTo(0, 0);
      const token = (G._rt = Symbol());
      try { const out = await r.fn(...m.slice(1).map(decodeURIComponent)); if (token !== G._rt) return; if (out !== undefined) { main.innerHTML = ''; if (out instanceof Node) main.appendChild(out); else main.innerHTML = String(out); } }
      catch (e) { if (token === G._rt) main.innerHTML = String(G.errorBox(e, true)); console.error(e); }
      return;
    }
  }
  main.innerHTML = String(G.empty('Page not found'));
};
window.addEventListener('hashchange', G.router);

// page helper: header + body; returns element for post-render binding
G.page = (title, body, actions = '', sub = '') => html`<div class="page-head"><div><h1>${title}</h1>${sub ? html`<div class="sub">${sub}</div>` : ''}</div><div class="page-actions">${actions}</div></div>${body}`;
G.mount = (content, bind) => { const d = document.createElement('div'); d.className = 'page'; d.innerHTML = String(content); if (bind) setTimeout(() => bind(d), 0); return d; };
G.on = (root, sel, ev, fn) => root.querySelectorAll(sel).forEach(el => el.addEventListener(ev, (e) => fn(e, el)));
G.act = async (fn, okMsg) => { try { const r = await fn(); if (okMsg) G.toast(okMsg); G.cache = {}; G.router(); return r; } catch (e) { G.toast(e.message, 'err'); } };

// option lists
G.userOpts = (filter) => (G.state.meta.users || []).filter(u => !filter || filter(u)).map(u => ({ value: u.id, label: `${u.name} · ${G.state.meta.roles[u.role]}` }));
G.contractorOpts = () => (G.state.meta.contractors || []).map(c => ({ value: c.id, label: `${c.name} (${c.trade || '—'})` }));
G.projectOpts = () => G.projects().map(p => ({ value: p.id, label: p.name + (p.is_sample ? ' [SAMPLE]' : '') }));
G.locationOpts = async (pid) => (pid ? (await G.projectDetail(pid)).locations.map(l => ({ value: l.id, label: l.path })) : []);
G.projectMembers = async (pid) => (pid ? (await G.projectDetail(pid)).members : []);
G.filterBar = (filters, values, onChange) => {
  const d = document.createElement('div'); d.className = 'filters';
  d.innerHTML = filters.map(f => f.type === 'select' ? `<select data-f="${f.name}" aria-label="${esc(f.label)}"><option value="">${esc(f.label)}: ${esc(t('all'))}</option>${f.options.map(o => `<option value="${esc(o.value)}" ${String(values[f.name] || '') === String(o.value) ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select>`
    : f.type === 'date' ? `<label class="fdate"><span>${esc(f.label)}</span><input type="date" data-f="${f.name}" value="${esc(values[f.name] || '')}"></label>`
      : `<input type="search" data-f="${f.name}" placeholder="${esc(f.label)}" value="${esc(values[f.name] || '')}">`).join('');
  d.addEventListener('change', () => { const v = {}; d.querySelectorAll('[data-f]').forEach(i => { v[i.dataset.f] = i.value; }); onChange(v); });
  return d;
};
// keep list filters in the URL so cards can deep-link
G.setQuery = (base, v) => { location.hash = '#' + base + G.qs(v); };
