/* GAVAN SITE service worker: offline app shell + push notifications.
   API data is never cached here; offline submissions are queued in IndexedDB by the app. */
const CACHE = 'gavan-site-v1';
const SHELL = ['/', '/index.html', '/css/app.css', '/js/i18n.js', '/js/core.js', '/js/views/site.js', '/js/views/work.js', '/js/views/ops.js', '/js/views/admin.js', '/js/app.js', '/logo.jpg', '/icon-192.png', '/favicon.png', '/manifest.json'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.pathname.startsWith('/api/')) return;
  // network-first for the shell so updates arrive; fall back to cache offline
  e.respondWith(fetch(e.request).then(r => { if (r.ok && url.origin === location.origin) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); } return r; })
    .catch(() => caches.match(e.request).then(m => m || caches.match('/index.html'))));
});
self.addEventListener('push', (e) => {
  let d = {}; try { d = e.data.json(); } catch { d = { title: 'GAVAN SITE', body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'GAVAN SITE', { body: d.body || '', icon: '/icon-192.png', badge: '/favicon.png', data: { link: d.link || '#/' } }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: 'window' }).then(ws => { const link = '/' + (e.notification.data.link || '#/'); for (const w of ws) { w.navigate(link); return w.focus(); } return clients.openWindow(link); }));
});
