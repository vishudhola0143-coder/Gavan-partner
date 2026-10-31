// Notifications: in-app always; email / WhatsApp / web-push only through real configured providers.
// Every external attempt is logged in notification_deliveries with its true status.
const { all, get, run, insert, setting } = require('./db');

const DEFAULT_CHANNELS = {
  task_assigned: ['push', 'whatsapp'], task_due: ['push'], task_overdue: ['push', 'whatsapp'], task_review: ['push'],
  task_approved: ['push'], task_rework: ['push', 'whatsapp'], report_missing: ['push', 'whatsapp'],
  drawing: ['push', 'email'], approval: ['push', 'email'], material_shortage: ['push', 'whatsapp'],
  inspection_failed: ['push', 'whatsapp'], meeting: ['push', 'email'], target_missed: ['push', 'email'], escalation: ['push', 'email', 'whatsapp'],
  mention: ['push'], general: ['push'],
};

function integrations() { return setting('integrations', {}); }

function notify(userIds, n) {
  const ids = [...new Set((Array.isArray(userIds) ? userIds : [userIds]).filter(Boolean).map(Number))];
  const created = [];
  for (const uid of ids) {
    const u = get('SELECT id, active FROM users WHERE id=?', uid);
    if (!u || !u.active) continue;
    if (n.dedupe && get('SELECT id FROM notifications WHERE user_id=? AND dedupe_key=?', uid, n.dedupe)) continue;
    const id = insert('notifications', { user_id: uid, type: n.type || 'general', title: n.title, body: n.body || '', link: n.link || '', dedupe_key: n.dedupe || null });
    created.push(id);
  }
  // external delivery is async & never blocks the request
  setImmediate(() => created.forEach(id => deliver(id).catch(e => console.error('deliver', e))));
  return created;
}

async function deliver(notificationId) {
  const n = get('SELECT * FROM notifications WHERE id=?', notificationId);
  if (!n) return;
  const user = get('SELECT * FROM users WHERE id=?', n.user_id);
  const channels = (setting('notification_channels', DEFAULT_CHANNELS)[n.type] || DEFAULT_CHANNELS.general);
  const cfg = integrations();
  const log = (channel, target, status, error) => insert('notification_deliveries', { notification_id: n.id, channel, target, status, error });
  const text = `GAVAN SITE: ${n.title}${n.body ? ' — ' + n.body : ''}`;

  for (const ch of channels) {
    try {
      if (ch === 'email') {
        if (!cfg.smtp || !cfg.smtp.enabled) { log('email', user.email, 'not_configured', 'SMTP not configured'); continue; }
        if (!user.email) { log('email', null, 'skipped', 'User has no email'); continue; }
        const nodemailer = require('nodemailer');
        const t = nodemailer.createTransport({ host: cfg.smtp.host, port: Number(cfg.smtp.port) || 587, secure: !!cfg.smtp.secure, auth: cfg.smtp.user ? { user: cfg.smtp.user, pass: cfg.smtp.pass } : undefined });
        const info = await t.sendMail({ from: cfg.smtp.from, to: user.email, subject: `GAVAN SITE – ${n.title}`, text: `${n.title}\n\n${n.body || ''}` });
        log('email', user.email, 'sent', 'messageId ' + info.messageId);
      } else if (ch === 'whatsapp') {
        const w = cfg.whatsapp;
        if (!w || !w.enabled || !w.token || !w.phone_number_id) { log('whatsapp', user.phone, 'not_configured', 'WhatsApp Cloud API not configured'); continue; }
        if (!user.phone) { log('whatsapp', null, 'skipped', 'User has no phone'); continue; }
        const to = String(user.phone).replace(/\D/g, '').replace(/^(\d{10})$/, '91$1');
        const body = w.template
          ? { messaging_product: 'whatsapp', to, type: 'template', template: { name: w.template, language: { code: w.template_lang || 'en' }, components: [{ type: 'body', parameters: [{ type: 'text', text: text.slice(0, 900) }] }] } }
          : { messaging_product: 'whatsapp', to, type: 'text', text: { body: text } };
        const r = await fetch(`https://graph.facebook.com/v20.0/${w.phone_number_id}/messages`, { method: 'POST', headers: { Authorization: 'Bearer ' + w.token, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const j = await r.json().catch(() => ({}));
        // "accepted" by API is not the same as delivered to handset; record honestly
        if (r.ok) log('whatsapp', to, 'accepted_by_provider', 'message id ' + ((j.messages && j.messages[0] && j.messages[0].id) || '?'));
        else log('whatsapp', to, 'failed', (j.error && j.error.message) || ('HTTP ' + r.status));
      } else if (ch === 'push') {
        const p = cfg.push;
        if (!p || !p.enabled || !p.public_key || !p.private_key) { log('push', null, 'not_configured', 'Web push (VAPID keys) not configured'); continue; }
        const subs = all('SELECT * FROM push_subscriptions WHERE user_id=?', user.id);
        if (!subs.length) { log('push', null, 'skipped', 'User has not enabled push on any device'); continue; }
        const webpush = require('web-push');
        webpush.setVapidDetails(p.subject || 'mailto:admin@gavan.local', p.public_key, p.private_key);
        for (const s of subs) {
          try {
            await webpush.sendNotification(JSON.parse(s.data), JSON.stringify({ title: n.title, body: n.body, link: n.link }));
            log('push', s.endpoint.slice(0, 60), 'sent', null);
          } catch (e) {
            if (e.statusCode === 404 || e.statusCode === 410) run('DELETE FROM push_subscriptions WHERE id=?', s.id);
            log('push', s.endpoint.slice(0, 60), 'failed', e.message);
          }
        }
      }
    } catch (e) { log(ch, null, 'failed', e.message); }
  }
}

module.exports = { notify, deliver, DEFAULT_CHANNELS, integrations };
