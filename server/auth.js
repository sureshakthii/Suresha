import crypto from 'node:crypto';
import express from 'express';
import nodemailer from 'nodemailer';
import { getDb } from './db.js';

const OTP_TTL = 5 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const SENDS_PER_ID = 5;
const SENDS_PER_IP = 30;
const HOUR = 60 * 60 * 1000;
const SESSION_TTL = 30 * 24 * HOUR;
const SESSION_COOKIE = 'kj_session';
const STATE_COOKIE = 'kj_fb_state';
const DATA_MAX = 200 * 1024;
const FB = 'https://graph.facebook.com/v19.0';

let secret = null;
const ipHits = new Map(); // ip -> { count, start }
let mailer = null;

const env = (k) => (process.env[k] || '').trim();
const isProd = () => process.env.NODE_ENV === 'production';
const now = () => Date.now();

function resolveSecret() {
  if (env('AUTH_SECRET')) return env('AUTH_SECRET');
  if (isProd()) throw new Error('AUTH_SECRET must be set in production');
  console.warn('⚠️  AUTH_SECRET not set — using a random one; OTPs and sessions reset on restart.');
  return crypto.randomBytes(32).toString('hex');
}

// ---- providers ----

function smsProvider() {
  if (env('TWILIO_ACCOUNT_SID') && env('TWILIO_AUTH_TOKEN') && env('TWILIO_FROM')) return 'twilio';
  if (env('MSG91_AUTH_KEY') && env('MSG91_TEMPLATE_ID')) return 'msg91';
  return null;
}
const emailProvider = () => (env('SMTP_URL') && env('MAIL_FROM') ? 'smtp' : null);
const providerFor = (channel) => (channel === 'sms' ? smsProvider() : emailProvider());

/** Dev mode: forced by AUTH_DEV_MODE=1, or automatic outside production when the channel has no provider. */
function devModeFor(channel) {
  return env('AUTH_DEV_MODE') === '1' || (!isProd() && !providerFor(channel));
}

function providers() {
  const pick = (ch) => (devModeFor(ch) ? 'dev' : providerFor(ch));
  return {
    sms: pick('sms'),
    email: pick('email'),
    facebook: facebookConfigured(),
    devMode: devModeFor('sms') || devModeFor('email'),
  };
}

const otpText = (code) => `உங்கள் துணை (Thunai) OTP: ${code} (5 நிமிடங்கள் செல்லும்)\nYour Thunai OTP: ${code} (valid for 5 minutes)`;

async function sendSms(to, code) {
  if (smsProvider() === 'twilio') {
    const sid = env('TWILIO_ACCOUNT_SID');
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${sid}:${env('TWILIO_AUTH_TOKEN')}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: to, From: env('TWILIO_FROM'), Body: otpText(code) }),
    });
    if (!r.ok) throw new Error(`Twilio ${r.status}: ${(await r.text()).slice(0, 200)}`);
    return;
  }
  const r = await fetch('https://control.msg91.com/api/v5/flow', {
    method: 'POST',
    headers: { authkey: env('MSG91_AUTH_KEY'), 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      template_id: env('MSG91_TEMPLATE_ID'), short_url: '0',
      recipients: [{ mobiles: to.replace(/^\+/, ''), otp: code }],
    }),
  });
  const body = await r.text();
  if (!r.ok || /"type"\s*:\s*"error"/.test(body)) throw new Error(`MSG91 ${r.status}: ${body.slice(0, 200)}`);
}

async function sendEmail(to, code) {
  mailer ||= nodemailer.createTransport(env('SMTP_URL'));
  await mailer.sendMail({
    from: env('MAIL_FROM'), to,
    subject: `துணை Thunai OTP: ${code}`,
    text: otpText(code),
  });
}

// ---- helpers ----

/** Returns E.164 or null. Bare 10-digit Indian mobiles (6–9…) get +91. */
export function normalizePhone(raw) {
  const s = String(raw || '').replace(/[\s\-().]/g, '');
  if (/^0?[6-9]\d{9}$/.test(s)) return '+91' + s.slice(-10);
  if (/^\+[1-9]\d{7,14}$/.test(s)) return s;
  return null;
}

function normalizeEmail(raw) {
  const s = String(raw || '').trim().toLowerCase();
  return s.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s) ? s : null;
}

const maskPhone = (p) => p.slice(0, 3) + '*'.repeat(Math.max(0, p.length - 7)) + p.slice(-4);
function maskEmail(e) {
  const [u, d] = e.split('@');
  return `${u[0]}${'*'.repeat(Math.max(1, u.length - 1))}@${d}`;
}

const hmac = (s) => crypto.createHmac('sha256', secret).update(s).digest('hex');
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

function safeEqual(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function parseCookies(req) {
  const out = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    if (!k || k in out) continue;
    try { out[k] = decodeURIComponent(part.slice(i + 1).trim()); } catch { /* ignore malformed */ }
  }
  return out;
}

function setCookie(req, res, name, value, { maxAge, path = '/' } = {}) {
  const secure = env('PUBLIC_URL').startsWith('https') || req.secure;
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${path}`, 'HttpOnly', 'SameSite=Lax', `Max-Age=${Math.floor(maxAge / 1000)}`];
  if (secure) parts.push('Secure');
  res.append('Set-Cookie', parts.join('; '));
}

const publicUser = (u) => u && ({ id: u.id, name: u.name || null, phone: u.phone || null, email: u.email || null, hasFacebook: !!u.facebook_id });

/** Signed-in user for this request (public shape), or null. */
export function currentUser(req) {
  if (req._kjUser !== undefined) return req._kjUser;
  const token = parseCookies(req)[SESSION_COOKIE];
  let user = null;
  if (token) {
    const row = getDb().prepare(
      'SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?',
    ).get(sha256(token), now());
    user = row ? publicUser(row) : null;
  }
  req._kjUser = user;
  return user;
}

function createSession(req, res, userId) {
  const db = getDb();
  const token = crypto.randomBytes(32).toString('base64url');
  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now());
  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(sha256(token), userId, now() + SESSION_TTL);
  setCookie(req, res, SESSION_COOKIE, token, { maxAge: SESSION_TTL });
}

function createUser(fields) {
  const id = crypto.randomUUID();
  getDb().prepare('INSERT INTO users (id, name, phone, email, facebook_id, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, fields.name || null, fields.phone || null, fields.email || null, fields.facebook_id || null, now());
  return getDb().prepare('SELECT * FROM users WHERE id = ?').get(id);
}

function ipLimited(ip) {
  const t = now();
  if (ipHits.size > 5000) for (const [k, v] of ipHits) if (t - v.start > HOUR) ipHits.delete(k);
  const e = ipHits.get(ip);
  if (!e || t - e.start > HOUR) { ipHits.set(ip, { count: 1, start: t }); return false; }
  if (e.count >= SENDS_PER_IP) return true;
  e.count++;
  return false;
}

function parseTarget(channel, to) {
  if (channel === 'sms') {
    const id = normalizePhone(to);
    return id ? { id } : { error: 'Enter a valid mobile number: 10 digits (India) or +<country code><number>' };
  }
  if (channel === 'email') {
    const id = normalizeEmail(to);
    return id ? { id } : { error: 'Enter a valid email address' };
  }
  return { error: "channel must be 'sms' or 'email'" };
}

function facebookConfigured() {
  return !!(env('FACEBOOK_APP_ID') && env('FACEBOOK_APP_SECRET') && env('PUBLIC_URL'));
}
const fbRedirectUri = () => `${env('PUBLIC_URL').replace(/\/+$/, '')}/api/auth/facebook/callback`;

// ---- router ----

export function authRouter() {
  secret ||= resolveSecret();
  const r = express.Router();

  r.get('/auth/providers', (_req, res) => res.json(providers()));

  r.post('/auth/otp/request', async (req, res) => {
    const { channel, to } = req.body || {};
    const target = parseTarget(channel, to);
    if (target.error) return res.status(400).json({ error: target.error });
    const id = target.id;
    const dev = devModeFor(channel);
    if (!dev && !providerFor(channel)) {
      return res.status(503).json({ error: `${channel === 'sms' ? 'SMS' : 'Email'} login is not configured` });
    }

    const db = getDb();
    const t = now();
    const row = db.prepare('SELECT sends, window_start FROM otps WHERE identifier = ?').get(id);
    const fresh = !row || t - row.window_start > HOUR;
    const sends = fresh ? 0 : row.sends;
    if (sends >= SENDS_PER_ID || ipLimited(req.ip || 'unknown')) {
      return res.status(429).json({ error: 'Too many OTP requests. Please try again later.' });
    }

    const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
    db.prepare(`INSERT INTO otps (identifier, code_hash, expires_at, attempts, sends, window_start)
      VALUES (?, ?, ?, 0, ?, ?)
      ON CONFLICT(identifier) DO UPDATE SET code_hash = excluded.code_hash, expires_at = excluded.expires_at,
        attempts = 0, sends = excluded.sends, window_start = excluded.window_start`)
      .run(id, hmac(`${id}:${code}`), t + OTP_TTL, sends + 1, fresh ? t : row.window_start);

    const masked = channel === 'sms' ? maskPhone(id) : maskEmail(id);
    if (dev) {
      console.log(`[auth dev] OTP for ${id}: ${code}`);
      return res.json({ sent: true, channel, to: masked, devCode: code });
    }
    try {
      await (channel === 'sms' ? sendSms(id, code) : sendEmail(id, code));
    } catch (err) {
      console.error('OTP send failed:', err.message);
      return res.status(502).json({ error: 'Could not send the OTP right now. Please try again.' });
    }
    res.json({ sent: true, channel, to: masked });
  });

  r.post('/auth/otp/verify', (req, res) => {
    const { channel, to, code, name } = req.body || {};
    const target = parseTarget(channel, to);
    if (target.error) return res.status(400).json({ error: target.error });
    const id = target.id;
    const db = getDb();
    const row = db.prepare('SELECT * FROM otps WHERE identifier = ?').get(id);
    if (!row || !row.code_hash || row.expires_at <= now()) {
      return res.status(401).json({ error: 'Code expired or not found. Please request a new OTP.' });
    }
    if (row.attempts >= OTP_MAX_ATTEMPTS) {
      return res.status(429).json({ error: 'Too many wrong attempts. Please request a new OTP.' });
    }
    const clean = String(code ?? '').replace(/\s/g, '');
    if (!/^\d{6}$/.test(clean) || !safeEqual(hmac(`${id}:${clean}`), row.code_hash)) {
      db.prepare('UPDATE otps SET attempts = attempts + 1 WHERE identifier = ?').run(id);
      return res.status(401).json({ error: 'Incorrect code' });
    }
    db.prepare('DELETE FROM otps WHERE identifier = ?').run(id);

    const col = channel === 'sms' ? 'phone' : 'email';
    const cleanName = typeof name === 'string' ? name.trim().slice(0, 80) : '';
    let user = db.prepare(`SELECT * FROM users WHERE ${col} = ?`).get(id);
    if (!user) user = createUser({ [col]: id, name: cleanName });
    else if (cleanName && !user.name) {
      db.prepare('UPDATE users SET name = ? WHERE id = ?').run(cleanName, user.id);
      user.name = cleanName;
    }
    createSession(req, res, user.id);
    res.json({ user: publicUser(user) });
  });

  r.get('/auth/facebook/start', (req, res) => {
    if (!facebookConfigured()) return res.status(501).json({ error: 'Facebook login is not configured' });
    const state = crypto.randomBytes(16).toString('base64url');
    setCookie(req, res, STATE_COOKIE, state, { maxAge: 10 * 60 * 1000, path: '/api/auth/facebook' });
    const q = new URLSearchParams({
      client_id: env('FACEBOOK_APP_ID'), redirect_uri: fbRedirectUri(), state, scope: 'email,public_profile',
    });
    res.redirect(`https://www.facebook.com/v19.0/dialog/oauth?${q}`);
  });

  r.get('/auth/facebook/callback', async (req, res) => {
    const expected = parseCookies(req)[STATE_COOKIE];
    setCookie(req, res, STATE_COOKIE, '', { maxAge: 0, path: '/api/auth/facebook' });
    try {
      if (!facebookConfigured()) throw new Error('not configured');
      const { code, state } = req.query;
      if (!code || !state || !expected || !safeEqual(state, expected)) throw new Error('bad state');
      const tq = new URLSearchParams({
        client_id: env('FACEBOOK_APP_ID'), client_secret: env('FACEBOOK_APP_SECRET'),
        redirect_uri: fbRedirectUri(), code: String(code),
      });
      const tr = await fetch(`${FB}/oauth/access_token?${tq}`);
      const tok = await tr.json();
      if (!tr.ok || !tok.access_token) throw new Error('token exchange failed');
      const mr = await fetch(`https://graph.facebook.com/me?fields=id,name,email&access_token=${encodeURIComponent(tok.access_token)}`);
      const me = await mr.json();
      if (!mr.ok || !me.id) throw new Error('profile fetch failed');

      const db = getDb();
      const email = me.email ? normalizeEmail(me.email) : null;
      let user = db.prepare('SELECT * FROM users WHERE facebook_id = ?').get(String(me.id));
      if (!user && email) {
        user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
        if (user) db.prepare('UPDATE users SET facebook_id = ?, name = COALESCE(name, ?) WHERE id = ?').run(String(me.id), me.name || null, user.id);
      }
      if (!user) user = createUser({ facebook_id: String(me.id), email, name: me.name });
      createSession(req, res, user.id);
      res.redirect('/#welcome');
    } catch (err) {
      console.warn('Facebook login failed:', err.message);
      res.redirect('/#login-failed');
    }
  });

  r.get('/auth/me', (req, res) => {
    const user = currentUser(req);
    if (!user) return res.status(401).json({ error: 'Not signed in' });
    res.json({ user });
  });

  r.post('/auth/logout', (req, res) => {
    const token = parseCookies(req)[SESSION_COOKIE];
    if (token) getDb().prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(token));
    setCookie(req, res, SESSION_COOKIE, '', { maxAge: 0 });
    res.json({ ok: true });
  });

  r.get('/me/data', (req, res) => {
    const user = currentUser(req);
    if (!user) return res.status(401).json({ error: 'Not signed in' });
    const row = getDb().prepare('SELECT data, updated_at FROM user_data WHERE user_id = ?').get(user.id);
    let data = {};
    try { if (row?.data) data = JSON.parse(row.data); } catch { /* corrupt blob → empty */ }
    res.json({ data, updatedAt: row?.updated_at ?? null });
  });

  // Own parser with a larger limit (no-op if the app-level parser already consumed the body).
  r.put('/me/data', express.json({ limit: '256kb' }), (req, res) => {
    const user = currentUser(req);
    if (!user) return res.status(401).json({ error: 'Not signed in' });
    const data = req.body?.data;
    if (!data || typeof data !== 'object' || Array.isArray(data)) return res.status(400).json({ error: 'data must be an object' });
    const json = JSON.stringify(data);
    if (Buffer.byteLength(json) > DATA_MAX) return res.status(413).json({ error: 'data too large (max 200 KB)' });
    const updatedAt = now();
    getDb().prepare(`INSERT INTO user_data (user_id, data, updated_at) VALUES (?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`).run(user.id, json, updatedAt);
    res.json({ ok: true, updatedAt });
  });

  // Privacy (DPDP Act 2023): a signed-in user can download everything held about them and delete the account.
  r.get('/me/export', (req, res) => {
    const user = currentUser(req);
    if (!user) return res.status(401).json({ error: 'Not signed in' });
    const out = { exportedAt: new Date(now()).toISOString(), user: publicUser(user), records: {} };
    const row = getDb().prepare('SELECT data, updated_at FROM user_data WHERE user_id = ?').get(user.id);
    try { out.records.profiles = row?.data ? JSON.parse(row.data) : {}; } catch { out.records.profiles = {}; }
    for (const t of USER_TABLES) {
      const rows = rowsOf(t, user.id);
      if (rows) out.records[t] = rows;
    }
    res.setHeader('Content-Disposition', 'attachment; filename="thunai-my-data.json"');
    res.json(out);
  });

  r.delete('/me/data', (req, res) => {
    const user = currentUser(req);
    if (!user) return res.status(401).json({ error: 'Not signed in' });
    getDb().prepare('DELETE FROM user_data WHERE user_id = ?').run(user.id);
    res.json({ ok: true });
  });

  // Body { confirm: "DELETE" }. Personal data is erased; payment and order rows are kept only as
  // de-identified accounting records (tax law), with the user link replaced by a one-way hash.
  r.post('/me/delete-account', (req, res) => {
    const user = currentUser(req);
    if (!user) return res.status(401).json({ error: 'Not signed in' });
    if (req.body?.confirm !== 'DELETE') return res.status(400).json({ error: 'Send { "confirm": "DELETE" } to delete the account' });
    const d = getDb();
    const tomb = `deleted:${hmac(`tomb:${user.id}`).slice(0, 16)}`;
    d.exec('BEGIN');
    try {
      for (const t of ['user_data', 'sessions', 'push_subs', 'events', 'feedback', 'referral_codes', 'referral_claims', 'gift_redemptions', 'priests']) {
        if (tableExists(t)) d.prepare(`DELETE FROM ${t} WHERE user_id = ?`).run(user.id);
      }
      for (const t of ['subscriptions', 'store_orders', 'service_requests']) {
        if (tableExists(t)) d.prepare(`UPDATE ${t} SET user_id = ? WHERE user_id = ?`).run(tomb, user.id);
      }
      d.prepare('DELETE FROM users WHERE id = ?').run(user.id);
      d.exec('COMMIT');
    } catch (err) {
      d.exec('ROLLBACK');
      throw err;
    }
    setCookie(req, res, SESSION_COOKIE, '', { maxAge: 0 });
    res.json({ ok: true, retained: ['subscriptions', 'store_orders', 'service_requests'].filter(tableExists).map((t) => `${t} (de-identified)`) });
  });

  return r;
}

// Tables (created by other modules on first use) that hold rows linked to a user.
const USER_TABLES = ['subscriptions', 'store_orders', 'service_requests', 'priests', 'feedback', 'referral_codes', 'referral_claims', 'gift_redemptions', 'push_subs'];
const tableExists = (t) => !!getDb().prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(t);
// Push subscriptions carry device keys; export only that a device is registered.
const rowsOf = (t, userId) => (tableExists(t)
  ? getDb().prepare(`SELECT * FROM ${t} WHERE user_id = ?`).all(userId).map((r) => (t === 'push_subs' ? { id: r.id, prefs: r.prefs, created_at: r.created_at } : r))
  : null);
