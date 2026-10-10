import { BRAND } from '../shared/brand.js';
import crypto from 'node:crypto';
import express from 'express';
import nodemailer from 'nodemailer';
import { getDb } from './db.js';
import { familyExport, deleteFamilyData } from './family.js';
import { hit } from './admin.js';
import { cleanDisplayText } from './security.js';

const OTP_TTL = 5 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_FAILS_PER_ID_PER_DAY = 20; // across re-sent codes: caps guessing at ~0.002% a day per account
const OTP_FAILS_PER_IP = 30; // wrong codes per IP per 15 minutes, across all numbers / emails
const SENDS_PER_ID = 5;
const SENDS_PER_IP = 30;
const HOUR = 60 * 60 * 1000;
const SESSION_TTL = 30 * 24 * HOUR;
const SESSION_COOKIE = 'kj_session';
const STATE_COOKIE = 'kj_fb_state';
const DATA_MAX = 200 * 1024;
const FB = 'https://graph.facebook.com/v19.0';

let secret = null;
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

const twilioOk = () => !!(env('TWILIO_ACCOUNT_SID') && env('TWILIO_AUTH_TOKEN') && env('TWILIO_FROM'));
const msg91Ok = () => !!(env('MSG91_AUTH_KEY') && env('MSG91_TEMPLATE_ID'));

/**
 * SMS provider for a number (E.164). MSG91 only delivers to Indian (+91) numbers through a DLT-approved template;
 * Twilio sends worldwide. With both configured: +91 → MSG91 (cheaper, DLT-compliant), every other country → Twilio.
 * With only one configured: Twilio sends everywhere; MSG91 sends to +91 only (others get "not available").
 * Without a number: whether any SMS provider is configured at all.
 */
export function smsProviderFor(to) {
  const india = to == null || String(to).startsWith('+91');
  if (india && msg91Ok()) return 'msg91';
  if (twilioOk()) return 'twilio';
  return null;
}
function smsProvider() {
  if (twilioOk()) return 'twilio';
  if (msg91Ok()) return 'msg91';
  return null;
}
const emailProvider = () => (env('SMTP_URL') && env('MAIL_FROM') ? 'smtp' : null);
const providerFor = (channel) => (channel === 'sms' ? smsProvider() : emailProvider());

/**
 * Dev mode (the code is returned on screen): forced by AUTH_DEV_MODE=1, or automatic when the channel has no
 * provider — and NEVER in production (NODE_ENV=production), whatever AUTH_DEV_MODE says.
 */
function devModeFor(channel) {
  if (isProd()) return false;
  return env('AUTH_DEV_MODE') === '1' || !providerFor(channel);
}

function providers() {
  const pick = (ch) => (devModeFor(ch) ? 'dev' : providerFor(ch));
  return {
    sms: pick('sms'),
    smsWorldwide: devModeFor('sms') || twilioOk(), // false: SMS codes reach Indian (+91) numbers only (MSG91)
    email: pick('email'),
    facebook: facebookConfigured(),
    devMode: devModeFor('sms') || devModeFor('email'),
  };
}

const otpText = (code) => `உங்கள் ${BRAND.nameTa} OTP: ${code} (5 நிமிடங்கள் செல்லும்)\nYour ${BRAND.name} OTP: ${code} (valid for 5 minutes)`;

async function sendSms(to, code) {
  const provider = smsProviderFor(to);
  if (!provider) throw Object.assign(new Error('No SMS provider for this country'), { code: 'NO_SMS_ROUTE' });
  if (provider === 'twilio') {
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
    subject: `${BRAND.nameTa} · ${BRAND.name} OTP: ${code}`,
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
  const secure = isProd() || env('PUBLIC_URL').startsWith('https') || req.secure;
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
  const token = crypto.randomBytes(32).toString('base64url'); // 256 bits; only its SHA-256 is stored
  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now());
  // Rotation: a session token presented with this sign-in (an older or someone else's session) stops working.
  const old = parseCookies(req)[SESSION_COOKIE];
  if (old) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(old));
  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(sha256(token), userId, now() + SESSION_TTL);
  setCookie(req, res, SESSION_COOKIE, token, { maxAge: SESSION_TTL });
}

function createUser(fields) {
  const id = crypto.randomUUID();
  getDb().prepare('INSERT INTO users (id, name, phone, email, facebook_id, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, fields.name || null, fields.phone || null, fields.email || null, fields.facebook_id || null, now());
  return getDb().prepare('SELECT * FROM users WHERE id = ?').get(id);
}

/** Code sends per IP per hour (SQLite rate_hits: survives restarts, shared by every process on the database). */
function ipLimited(ip) {
  const key = `otpsend-ip:${ip}`;
  if (hit(key, HOUR, { peek: true }) >= SENDS_PER_IP) return true;
  hit(key, HOUR);
  return false;
}

function parseTarget(channel, to) {
  if (channel === 'sms') {
    const id = normalizePhone(to);
    return id ? { id } : { error: 'Enter a valid mobile number with its country code, e.g. +94 77 123 4567 or +44 7700 900123 (10-digit Indian numbers work without +91)' };
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
    if (!dev && channel === 'sms' && !smsProviderFor(id)) {
      return res.status(503).json({ error: 'SMS codes cannot be sent to this country yet. Please sign in with email instead.' });
    }

    const db = getDb();
    const t = now();
    // Retention: a pending code row names a phone number / email; drop rows whose code and send window are both over.
    db.prepare('DELETE FROM otps WHERE expires_at < ? AND window_start < ?').run(t - HOUR, t - HOUR);
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
      console.log(`[auth dev] OTP for ${masked}: ${code}`); // dev mode never runs in production
      return res.json({ sent: true, channel, to: masked, devCode: code });
    }
    try {
      await (channel === 'sms' ? sendSms(id, code) : sendEmail(id, code));
    } catch (err) {
      console.error('OTP send failed:', String(err.message || '').split(':')[0]); // provider + status only (bodies can echo the number)
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
    const ipKey = `otpfail-ip:${req.ip || 'unknown'}`;
    const idKey = `otpfail-id:${hmac(id)}`; // the number / email itself is never stored in rate_hits
    if ((process.env.RATE_LIMITS !== 'off' && hit(ipKey, 15 * 60000, { peek: true }) >= OTP_FAILS_PER_IP)
      || hit(idKey, 24 * HOUR, { peek: true }) >= OTP_FAILS_PER_ID_PER_DAY) {
      return res.status(429).json({ error: 'Too many wrong codes. Please try again later.' });
    }
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
      hit(ipKey, 15 * 60000);
      hit(idKey, 24 * HOUR);
      return res.status(401).json({ error: 'Incorrect code' });
    }
    db.prepare('DELETE FROM otps WHERE identifier = ?').run(id);

    const col = channel === 'sms' ? 'phone' : 'email';
    const cleanName = typeof name === 'string' ? cleanDisplayText(name, 80) : ''; // shown to family members
    let user = db.prepare(`SELECT * FROM users WHERE ${col} = ?`).get(id);
    const isNew = !user; // lets the app count sign-up vs log-in (analytics, only with the person's consent)
    if (!user) user = createUser({ [col]: id, name: cleanName });
    else if (cleanName && !user.name) {
      db.prepare('UPDATE users SET name = ? WHERE id = ?').run(cleanName, user.id);
      user.name = cleanName;
    }
    createSession(req, res, user.id);
    res.json({ user: publicUser(user), isNew });
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

  // Sign out everywhere: every session of this account ends (e.g. a lost phone).
  r.post('/auth/logout-all', (req, res) => {
    const user = currentUser(req);
    if (!user) return res.status(401).json({ error: 'Not signed in' });
    const { changes } = getDb().prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);
    setCookie(req, res, SESSION_COOKIE, '', { maxAge: 0 });
    res.json({ ok: true, sessionsEnded: changes });
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

  // Clear saved profiles only (the account stays).
  r.delete('/me/data', (req, res) => {
    const user = currentUser(req);
    if (!user) return res.status(401).json({ error: 'Not signed in' });
    getDb().prepare('DELETE FROM user_data WHERE user_id = ?').run(user.id);
    res.json({ ok: true });
  });

  // Data export: everything stored about this account (everything account deletion removes or de-identifies),
  // as JSON. Secrets are never exported: OTP hashes, session tokens and push-subscription keys are left out.
  r.get('/me/export', (req, res) => {
    const user = currentUser(req);
    if (!user) return res.status(401).json({ error: 'Not signed in' });
    const d = getDb();
    const tryAll = (sql, ...args) => { try { return d.prepare(sql).all(...(args.length ? args : [user.id])); } catch { return []; } };
    const row = d.prepare('SELECT data, updated_at FROM user_data WHERE user_id = ?').get(user.id);
    const account = d.prepare('SELECT id, name, phone, email, created_at FROM users WHERE id = ?').get(user.id);
    const parse = (v) => { try { return v ? JSON.parse(v) : null; } catch { return null; } };
    const priest = tryAll('SELECT id, name, phone, city, languages, services, experience_years, about, status, created_at, updated_at FROM priests WHERE user_id = ?')
      .map((p) => ({ ...p, languages: parse(p.languages), services: parse(p.services) }))[0] || null;
    const endpointHost = (e) => { try { return new URL(e).host; } catch { return null; } };
    res.setHeader('Content-Disposition', 'attachment; filename="thunai-account-export.json"');
    res.json({
      exportedAt: new Date(now()).toISOString(),
      account,
      savedData: row?.data ? parse(row.data) : null,
      savedDataUpdatedAt: row?.updated_at ?? null,
      subscriptions: tryAll('SELECT id, plan, status, currency, amount_minor, gateway, starts_at, expires_at, created_at FROM subscriptions WHERE user_id = ?'),
      aiUsage: tryAll('SELECT day, count FROM ai_usage WHERE usage_key = ? ORDER BY day', `u:${user.id}`),
      aiCost: tryAll('SELECT task, model, input_tokens, output_tokens, at FROM ai_cost WHERE user_id = ? ORDER BY at'),
      giftRedemptions: tryAll('SELECT code, redeemed_at FROM gift_redemptions WHERE user_id = ?'),
      referral: {
        code: tryAll('SELECT code, created_at FROM referral_codes WHERE user_id = ?')[0] || null,
        claimed: tryAll('SELECT code, created_at FROM referral_claims WHERE user_id = ?')[0] || null,
        referredCount: tryAll('SELECT COUNT(*) AS n FROM referral_claims WHERE referrer_id = ?')[0]?.n || 0,
      },
      storeOrders: tryAll('SELECT id, items, address, total, status, created_at, updated_at FROM store_orders WHERE user_id = ?')
        .map((o) => ({ ...o, items: parse(o.items), address: parse(o.address) })),
      refundRequests: tryAll('SELECT id, order_id, reason, status, created_at, resolved_at FROM order_refund_requests WHERE user_id = ?'),
      serviceRequests: tryAll('SELECT * FROM service_requests WHERE user_id = ?'),
      requestHistory: tryAll('SELECT request_id, status, actor, at FROM request_events WHERE request_id IN (SELECT id FROM service_requests WHERE user_id = ?) ORDER BY id'),
      priestProfile: priest,
      feedback: tryAll("SELECT id, type, rating, comment, screen, meta, status, created_at FROM feedback WHERE user_id = ?").map((x) => ({ ...x, meta: parse(x.meta) })),
      pushSubscriptions: tryAll('SELECT id, endpoint, prefs, created_at FROM push_subs WHERE user_id = ?')
        .map((p) => ({ id: p.id, service: endpointHost(p.endpoint), prefs: parse(p.prefs), createdAt: p.created_at })), // keys and the endpoint URL are secrets
      analyticsEvents: tryAll('SELECT type, screen, feature, platform, app_version, created_at FROM events WHERE user_id = ? ORDER BY created_at'),
      family: (() => { try { return familyExport(user.id); } catch { return null; } })(), // memberships, invites, shares (no code hashes)
      accountActivity: tryAll('SELECT at, action, target FROM audit_log WHERE actor = ? ORDER BY id', `user:${user.id}`), // own cancellations / refund requests
      pendingSignInCodes: tryAll('SELECT identifier, expires_at FROM otps WHERE identifier IN (?, ?)', account?.phone || '', account?.email || ''), // code hashes withheld
    });
  });

  // Account deletion: removes profile data, sessions, usage counters, referral and gift records, the priest profile,
  // push subscriptions, analytics events, pending sign-in codes and the account. Payment, order and booking records
  // are de-identified (kept only where tax/accounting law requires), never shown again in the app.
  r.delete('/me', (req, res) => {
    const user = currentUser(req);
    if (!user) return res.status(401).json({ error: 'Not signed in' });
    const d = getDb();
    const run = (sql, ...args) => { try { d.prepare(sql).run(...(args.length ? args : [user.id])); } catch { /* table not present on this instance */ } };
    const account = d.prepare('SELECT phone, email FROM users WHERE id = ?').get(user.id) || {};
    let priestIds = [];
    try { priestIds = d.prepare('SELECT id FROM priests WHERE user_id = ? OR (phone = ? AND ? <> \'\')').all(user.id, account.phone || '', account.phone || '').map((p) => p.id); } catch { /* no market tables */ }
    run('DELETE FROM user_data WHERE user_id = ?');
    deleteFamilyData(user.id); // shares + server copies, invites, memberships; owned groups pass to an adult or go
    run('DELETE FROM sessions WHERE user_id = ?');
    run('DELETE FROM push_subs WHERE user_id = ?');
    run('DELETE FROM feedback WHERE user_id = ?');
    run('DELETE FROM events WHERE user_id = ?');
    run('DELETE FROM ai_usage WHERE usage_key = ?', `u:${user.id}`);
    run('UPDATE ai_cost SET user_id = NULL WHERE user_id = ?');
    run('DELETE FROM gift_redemptions WHERE user_id = ?');
    run('DELETE FROM referral_codes WHERE user_id = ?');
    run('DELETE FROM referral_claims WHERE user_id = ?');
    run("UPDATE referral_claims SET referrer_id = 'deleted' WHERE referrer_id = ?"); // the friend's own claim stays theirs
    if (account.phone || account.email) run('DELETE FROM otps WHERE identifier IN (?, ?)', account.phone || '', account.email || '');
    for (const pid of priestIds) {
      run('UPDATE service_requests SET priest_id = NULL WHERE priest_id = ?', pid);
      run("UPDATE request_events SET actor = 'priest:deleted' WHERE actor = ?", `priest:${pid}`);
      run('DELETE FROM priests WHERE id = ?', pid);
    }
    run('DELETE FROM request_events WHERE request_id IN (SELECT id FROM service_requests WHERE user_id = ?)');
    run("UPDATE order_refund_requests SET reason = '', user_id = 'deleted' WHERE user_id = ?");
    run("UPDATE store_orders SET address = '{}', user_id = 'deleted' WHERE user_id = ?");
    run("UPDATE service_requests SET contact_phone = '', notes = '', user_id = 'deleted' WHERE user_id = ?");
    run("UPDATE subscriptions SET user_id = 'deleted' WHERE user_id = ?");
    run("UPDATE audit_log SET actor = 'user:deleted', ip = NULL WHERE actor = ?", `user:${user.id}`);
    run('DELETE FROM rate_hits WHERE key LIKE ?', `%:${user.id}`); // per-person limiter counters (family, AI) name the account
    run('DELETE FROM users WHERE id = ?');
    setCookie(req, res, SESSION_COOKIE, '', { maxAge: 0 });
    res.json({ ok: true, deleted: true });
  });

  return r;
}
