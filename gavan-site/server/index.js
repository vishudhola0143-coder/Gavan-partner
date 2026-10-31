// GAVAN SITE — server entry
const express = require('express');
const path = require('path');
const fs = require('fs');
const { get, DATA_DIR } = require('./db');
const A = require('./auth');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '5mb' }));
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'camera=(self), geolocation=(self), microphone=()');
  next();
});

// public (no auth)
app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));
app.get('/api/public/logo/:id', (req, res) => {
  const f = get("SELECT * FROM files WHERE id=? AND entity='branding'", req.params.id);
  if (!f) return res.status(404).end();
  res.setHeader('Content-Type', f.mime); fs.createReadStream(path.join(DATA_DIR, 'uploads', f.stored_name)).pipe(res);
});
app.get('/api/public/branding', (req, res) => {
  const { setting } = require('./db');
  res.json({ logo: setting('logo_url', '/logo.jpg'), company: setting('company_name', 'GAVAN GROUP'), demo: process.env.DEMO_MODE === '1' });
});

const core = require('./routes/core');
app.use('/api', core.router); // includes /auth/login (public) then auth middleware for the rest of this router
const api = express.Router();
// (auth + temporary-password check already applied by core router middleware for every /api request)
api.use(require('./routes/files').router);
api.use(require('./routes/site').router);
api.use(require('./routes/tasks').router);
api.use(require('./routes/drawings').router);
api.use(require('./routes/materials').router);
api.use(require('./routes/comm').router);
api.use(require('./routes/dashboard').router);
app.use('/api', api);
app.use('/api', (req, res) => res.status(404).json({ error: 'Unknown API endpoint' }));

app.use(express.static(path.join(__dirname, '..', 'public'), { setHeaders: (res, p) => { if (/sw\.js$|index\.html$/.test(p)) res.setHeader('Cache-Control', 'no-cache'); } }));
app.get(/^\/(?!api).*/, (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'index.html')));

function boot() {
  const seed = require('./seed');
  seed.initial();
  if (process.env.LOAD_SAMPLE !== '0' && !get('SELECT id FROM projects WHERE is_sample=1') && !require('./db').setting('sample_purged', false)) seed.seedSample();
  return app;
}

if (require.main === module) {
  boot();
  require('./scheduler').start();
  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => console.log(`GAVAN SITE running on http://localhost:${port}`));
}
module.exports = { app, boot };
