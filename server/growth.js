import crypto from 'node:crypto';
import express from 'express';
import { getDb } from './db.js';
import { requireAdmin as adminRole, audit } from './admin.js';
import { currentUser } from './auth.js';
import { PLANS, grantComplimentary, setBillingClock } from './billing.js';

// Growth: gift / trial codes, usage analytics, feedback & testimonials, referrals and the admin overview.

const HOUR = 3600000;
const DAY = 24 * HOUR;
const IST = 5.5 * HOUR; // daily stats roll over at midnight India time
const PAID = PLANS.filter((p) => p.interval).map((p) => p.id);
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no I/L/O/0/1
const EVENT_TYPES = ['first_open', 'app_open', 'install', 'screen_view', 'signup', 'login', 'feature', 'purchase', 'share', 'referral_open'];
const PLATFORMS = ['android', 'ios', 'huawei', 'pwa', 'web'];
const FEEDBACK_STATUSES = ['new', 'approved', 'hidden'];
const COMPLIMENTARY = ['gift', 'trial', 'referral', 'admin'];
const REFERRAL_CAP = 12;
const NEW_ACCOUNT_MS = 7 * DAY;

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS gift_codes (
    code TEXT PRIMARY KEY,
    plan TEXT NOT NULL,
    hours INTEGER NOT NULL,
    max_uses INTEGER NOT NULL,
    uses INTEGER NOT NULL DEFAULT 0,
    note TEXT,
    created_at INTEGER,
    expires_at INTEGER
  );
  CREATE TABLE IF NOT EXISTS gift_redemptions (
    code TEXT NOT NULL,
    user_id TEXT NOT NULL,
    redeemed_at INTEGER,
    PRIMARY KEY (code, user_id)
  );
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT NOT NULL,
    user_id TEXT,
    type TEXT NOT NULL,
    screen TEXT,
    feature TEXT,
    platform TEXT,
    app_version TEXT,
    country TEXT,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS events_created ON events(created_at);
  CREATE INDEX IF NOT EXISTS events_device ON events(device_id);
  CREATE TABLE IF NOT EXISTS feedback (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    device_id TEXT NOT NULL,
    rating INTEGER NOT NULL,
    comment TEXT,
    screen TEXT,
    status TEXT NOT NULL,
    created_at INTEGER,
    reply TEXT
  );
  CREATE INDEX IF NOT EXISTS feedback_device ON feedback(device_id, created_at);
  CREATE TABLE IF NOT EXISTS referral_codes (
    user_id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    created_at INTEGER
  );
  CREATE TABLE IF NOT EXISTS referral_claims (
    user_id TEXT PRIMARY KEY,
    referrer_id TEXT NOT NULL,
    code TEXT NOT NULL,
    referrer_days INTEGER NOT NULL,
    created_at INTEGER
  );
  CREATE INDEX IF NOT EXISTS referral_claims_referrer ON referral_claims(referrer_id);
`;

const env = (k) => (process.env[k] || '').trim();
let clock = () => Date.now();
const now = () => clock();
/** Test hook: override the clock for growth and billing (null restores Date.now). */
export function setGrowthClock(fn) {
  clock = fn || (() => Date.now());
  setBillingClock(fn);
}

const ready = new WeakSet();
function db() {
  const d = getDb();
  if (!ready.has(d)) { d.exec(SCHEMA); ready.add(d); }
  return d;
}

/** Single number from `SELECT … AS n`; 0 when another module's table hasn't been created yet. */
function scalar(sql, ...args) {
  try {
    return db().prepare(sql).get(...args)?.n ?? 0;
  } catch (err) {
    if (/no such table/.test(err.message)) return 0;
    throw err;
  }
}

class Invalid extends Error {}
const fail = (msg) => { throw new Invalid(msg); };

function safeEqual(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

// ---- validators ----

const body = (req) => (req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {});
const blank = (v) => v === undefined || v === null || v === '';

function text(v, field, { max = 100, optional = true } = {}) {
  if (blank(v)) return optional ? null : fail(`${field} is required`);
  if (typeof v !== 'string') fail(`${field} must be text`);
  const s = v.trim();
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(s)) fail(`${field} contains invalid characters`);
  if (s.length > max) fail(`${field} must be at most ${max} characters`);
  return s || null;
}

function int(v, field, min, max, dflt) {
  if (blank(v) && dflt !== undefined) return dflt;
  const n = typeof v === 'string' && /^\d+$/.test(v.trim()) ? Number(v) : v;
  if (!Number.isInteger(n) || n < min || n > max) fail(`${field} must be a whole number from ${min} to ${max}`);
  return n;
}

const label = (v, field) => {
  const s = text(v, field, { max: 60 });
  if (s && !/^[\w./:-]+$/.test(s)) fail(`${field} may use letters, digits and _ - . / : only`);
  return s;
};

function deviceId(v) {
  if (typeof v !== 'string' || !/^[A-Za-z0-9_-]{8,64}$/.test(v)) fail('deviceId must be 8–64 characters [A-Za-z0-9_-]');
  return v;
}

function randomCode(n) {
  let s = '';
  for (let i = 0; i < n; i++) s += CODE_CHARS[crypto.randomInt(CODE_CHARS.length)];
  return s;
}
const cleanCode = (v) => (typeof v === 'string' ? v.trim().toUpperCase().replace(/\s+/g, '') : '');

// ---- middleware ----

function requireUser(req, res, next) {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: 'Please sign in first' });
  req.user = user;
  next();
}

// Named, role-based admin tokens with lock-out (server/admin.js).
const requireAdmin = adminRole('support');

const handle = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (err) {
    if (err instanceof Invalid) return res.status(400).json({ error: err.message });
    next(err);
  }
};

/** In-memory sliding-window limiter keyed by IP (IPs are never written to the database). */
const ipHits = new Map();
function ipLimited(ip, max = 300, windowMs = 10 * 60000) {
  const t = Date.now();
  if (ipHits.size > 10000) for (const [k, v] of ipHits) if (!v.some((x) => t - x < windowMs)) ipHits.delete(k);
  const hits = (ipHits.get(ip) || []).filter((x) => t - x < windowMs);
  hits.push(t);
  ipHits.set(ip, hits);
  return hits.length > max;
}

// ---- shapes ----

const giftOut = (g) => ({
  code: g.code, plan: g.plan, hours: g.hours, maxUses: g.max_uses, uses: g.uses, note: g.note || '',
  createdAt: g.created_at, expiresAt: g.expires_at ?? null,
});

const firstName = (n) => (n || '').trim().split(/\s+/)[0] || 'அன்பர்';

const feedbackOut = (f) => ({
  id: f.id, userId: f.user_id, deviceId: f.device_id, name: f.user_id ? firstName(f.name) : 'அன்பர்', rating: f.rating,
  comment: f.comment || '', screen: f.screen, status: f.status, reply: f.reply, createdAt: f.created_at,
});

// ---- stats ----

const istDate = (t) => new Date(t + IST).toISOString().slice(0, 10);
const istDayStart = (t) => Math.floor((t + IST) / DAY) * DAY - IST;

export function computeStats(days = 30) {
  const d = db();
  const t = now();
  const today = istDayStart(t);
  const from = today - (days - 1) * DAY;
  const paidOnly = `gateway NOT IN (${COMPLIMENTARY.map((g) => `'${g}'`).join(', ')})`;

  const revenueByCurrency = { INR: 0, USD: 0 };
  try {
    const rows = d.prepare(`SELECT currency, SUM(amount_minor) AS n FROM subscriptions
      WHERE status IN ('active', 'expired') AND gateway IS NOT NULL AND gateway NOT IN ('gift', 'trial') GROUP BY currency`).all();
    for (const r of rows) if (r.currency in revenueByCurrency) revenueByCurrency[r.currency] = Math.round(r.n || 0) / 100;
  } catch (err) { if (!/no such table/.test(err.message)) throw err; }

  const fb = d.prepare('SELECT COUNT(*) AS c, AVG(rating) AS avg FROM feedback').get();
  const totals = {
    devices: scalar('SELECT COUNT(DISTINCT device_id) AS n FROM events'),
    installs: scalar("SELECT COUNT(DISTINCT device_id) AS n FROM events WHERE type = 'install'"),
    users: scalar('SELECT COUNT(*) AS n FROM users'),
    activeToday: scalar('SELECT COUNT(DISTINCT device_id) AS n FROM events WHERE created_at >= ?', today),
    active7: scalar('SELECT COUNT(DISTINCT device_id) AS n FROM events WHERE created_at >= ?', t - 7 * DAY),
    active30: scalar('SELECT COUNT(DISTINCT device_id) AS n FROM events WHERE created_at >= ?', t - 30 * DAY),
    payingUsers: scalar(`SELECT COUNT(DISTINCT user_id) AS n FROM subscriptions
      WHERE status = 'active' AND expires_at > ? AND amount_minor > 0 AND gateway IS NOT NULL AND ${paidOnly}`, t),
    revenueByCurrency,
    orders: scalar('SELECT COUNT(*) AS n FROM store_orders'),
    requests: scalar('SELECT COUNT(*) AS n FROM service_requests'),
    feedbackCount: fb.c,
    avgRating: fb.c ? Math.round(fb.avg * 100) / 100 : null,
  };

  const byPlatform = Object.fromEntries(PLATFORMS.map((p) => [p, 0]));
  for (const r of d.prepare('SELECT platform, COUNT(DISTINCT device_id) AS n FROM events WHERE platform IS NOT NULL GROUP BY platform').all()) {
    if (r.platform in byPlatform) byPlatform[r.platform] = r.n;
  }

  const daily = [];
  const byDate = new Map();
  for (let i = 0; i < days; i++) {
    const row = { date: istDate(from + i * DAY), opens: 0, newDevices: 0, installs: 0, signups: 0 };
    daily.push(row);
    byDate.set(row.date, row);
  }
  for (const e of d.prepare("SELECT type, created_at FROM events WHERE created_at >= ? AND type IN ('app_open', 'first_open', 'install')").all(from)) {
    const row = byDate.get(istDate(e.created_at));
    if (!row) continue;
    if (e.type === 'install') row.installs++;
    else row.opens++;
  }
  for (const e of d.prepare('SELECT MIN(created_at) AS first FROM events GROUP BY device_id HAVING first >= ?').all(from)) {
    const row = byDate.get(istDate(e.first));
    if (row) row.newDevices++;
  }
  for (const u of d.prepare('SELECT created_at FROM users WHERE created_at >= ?').all(from)) {
    const row = byDate.get(istDate(u.created_at));
    if (row) row.signups++;
  }

  const topScreens = d.prepare(`SELECT screen, COUNT(*) AS views FROM events WHERE type = 'screen_view' AND screen IS NOT NULL AND created_at >= ?
    GROUP BY screen ORDER BY views DESC, screen LIMIT 10`).all(from).map((r) => ({ screen: r.screen, views: r.views }));
  const topFeatures = d.prepare(`SELECT feature, COUNT(*) AS uses FROM events WHERE type = 'feature' AND feature IS NOT NULL AND created_at >= ?
    GROUP BY feature ORDER BY uses DESC, feature LIMIT 10`).all(from).map((r) => ({ feature: r.feature, uses: r.uses }));

  return { totals, byPlatform, daily, topScreens, topFeatures };
}

// ---- referrals ----

const referralDays = () => {
  const n = Number(env('REFERRAL_DAYS'));
  return Number.isInteger(n) && n > 0 && n <= 365 ? n : 7;
};

function referralCodeFor(userId) {
  const d = db();
  const row = d.prepare('SELECT code FROM referral_codes WHERE user_id = ?').get(userId);
  if (row) return row.code;
  for (;;) {
    const code = randomCode(6);
    const { changes } = d.prepare('INSERT OR IGNORE INTO referral_codes (user_id, code, created_at) VALUES (?, ?, ?)').run(userId, code, now());
    if (changes) return code;
  }
}

// ---- router ----

export function growthRouter() {
  const r = express.Router();

  // Gift / trial codes
  r.post('/admin/gift-codes', requireAdmin, handle((req, res) => {
    const b = body(req);
    if (!PAID.includes(b.plan)) fail(`plan must be one of: ${PAID.join(', ')}`);
    const hours = int(b.hours, 'hours', 1, 8760, 24);
    const maxUses = int(b.maxUses, 'maxUses', 1, 1000, 1);
    const note = text(b.note, 'note', { max: 200 });
    let expiresAt = null;
    if (!blank(b.expiresAt)) {
      expiresAt = typeof b.expiresAt === 'number' ? b.expiresAt : Date.parse(String(b.expiresAt));
      if (!Number.isFinite(expiresAt) || expiresAt <= now()) fail('expiresAt must be a future date');
    }
    const d = db();
    let code;
    do code = `KJ-${randomCode(4)}-${randomCode(4)}`;
    while (d.prepare('SELECT 1 FROM gift_codes WHERE code = ?').get(code));
    d.prepare(`INSERT INTO gift_codes (code, plan, hours, max_uses, uses, note, created_at, expires_at)
      VALUES (?, ?, ?, ?, 0, ?, ?, ?)`).run(code, b.plan, hours, maxUses, note, now(), expiresAt);
    audit(req, 'giftcode.create', code, { plan: b.plan, hours, maxUses });
    res.status(201).json({ code, giftCode: giftOut(d.prepare('SELECT * FROM gift_codes WHERE code = ?').get(code)) });
  }));

  r.get('/admin/gift-codes', requireAdmin, (_req, res) => {
    res.json({ giftCodes: db().prepare('SELECT * FROM gift_codes ORDER BY created_at DESC').all().map(giftOut) });
  });

  r.post('/billing/redeem', requireUser, handle((req, res) => {
    const code = cleanCode(body(req).code);
    if (!code || code.length > 32) fail('code is required');
    const d = db();
    const g = d.prepare('SELECT * FROM gift_codes WHERE code = ?').get(code);
    if (!g) return res.status(404).json({ error: 'Unknown code' });
    if (d.prepare('SELECT 1 FROM gift_redemptions WHERE code = ? AND user_id = ?').get(code, req.user.id)) {
      return res.status(409).json({ error: 'You have already used this code' });
    }
    const t = now();
    if ((g.expires_at && g.expires_at <= t) || g.uses >= g.max_uses) return res.status(410).json({ error: 'This code has expired or been fully used' });
    // Claim a use atomically so parallel redemptions can't exceed max_uses.
    const { changes } = d.prepare('UPDATE gift_codes SET uses = uses + 1 WHERE code = ? AND uses < max_uses').run(code);
    if (!changes) return res.status(410).json({ error: 'This code has expired or been fully used' });
    d.prepare('INSERT INTO gift_redemptions (code, user_id, redeemed_at) VALUES (?, ?, ?)').run(code, req.user.id, t);
    const subscription = grantComplimentary(req.user.id, g.plan, 'gift', g.hours * HOUR, { ref: code });
    res.json({ subscription, expiresAt: subscription.expiresAt });
  }));

  // Usage analytics (anonymous device id; no IPs or personal data stored)
  r.post('/events', handle((req, res) => {
    if (ipLimited(req.ip || 'unknown')) return res.status(429).json({ error: 'Too many events — slow down' });
    const b = body(req);
    const device = deviceId(b.deviceId);
    if (!Array.isArray(b.events) || !b.events.length || b.events.length > 50) fail('events must be a list of 1–50 items');
    const rows = b.events.map((e) => {
      if (!e || typeof e !== 'object' || Array.isArray(e)) fail('Each event must be an object');
      if (!EVENT_TYPES.includes(e.type)) fail(`type must be one of: ${EVENT_TYPES.join(', ')}`);
      if (!blank(e.platform) && !PLATFORMS.includes(e.platform)) fail(`platform must be one of: ${PLATFORMS.join(', ')}`);
      const appVersion = text(e.appVersion, 'appVersion', { max: 20 });
      if (appVersion && !/^[\w.+-]+$/.test(appVersion)) fail('appVersion is invalid');
      return { type: e.type, screen: label(e.screen, 'screen'), feature: label(e.feature, 'feature'), platform: e.platform || null, appVersion };
    });
    const country = /^[A-Z]{2}$/.test(req.get('cf-ipcountry') || '') ? req.get('cf-ipcountry') : null; // CDN geo header only
    const userId = currentUser(req)?.id || null;
    const t = now();
    const ins = db().prepare(`INSERT INTO events (device_id, user_id, type, screen, feature, platform, app_version, country, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const e of rows) ins.run(device, userId, e.type, e.screen, e.feature, e.platform, e.appVersion, country, t);
    res.json({ ok: true });
  }));

  r.get('/admin/stats', requireAdmin, handle((req, res) => {
    res.json(computeStats(int(req.query.days, 'days', 1, 365, 30)));
  }));

  // Feedback, ratings, testimonials
  r.post('/feedback', handle((req, res) => {
    const b = body(req);
    const device = deviceId(b.deviceId);
    const rating = int(b.rating, 'rating', 1, 5);
    const comment = text(b.comment, 'comment', { max: 1000 });
    const screen = label(b.screen, 'screen');
    const t = now();
    if (db().prepare('SELECT COUNT(*) AS n FROM feedback WHERE device_id = ? AND created_at > ?').get(device, t - HOUR).n >= 10) {
      return res.status(429).json({ error: 'Too much feedback from this device — please try later' });
    }
    db().prepare(`INSERT INTO feedback (id, user_id, device_id, rating, comment, screen, status, created_at, reply)
      VALUES (?, ?, ?, ?, ?, ?, 'new', ?, NULL)`).run(crypto.randomUUID(), currentUser(req)?.id || null, device, rating, comment, screen, t);
    res.json({ ok: true });
  }));

  r.get('/testimonials', (_req, res) => {
    const rows = db().prepare(`SELECT f.*, u.name FROM feedback f LEFT JOIN users u ON u.id = f.user_id
      WHERE f.status = 'approved' ORDER BY f.created_at DESC LIMIT 20`).all();
    res.json({ testimonials: rows.map((f) => ({ rating: f.rating, comment: f.comment || '', name: f.user_id ? firstName(f.name) : 'அன்பர்', createdAt: f.created_at })) });
  });

  r.get('/admin/feedback', requireAdmin, handle((req, res) => {
    const { status } = req.query;
    if (status !== undefined && !FEEDBACK_STATUSES.includes(status)) fail(`status must be one of: ${FEEDBACK_STATUSES.join(', ')}`);
    const where = status ? 'WHERE f.status = ?' : '';
    const rows = db().prepare(`SELECT f.*, u.name FROM feedback f LEFT JOIN users u ON u.id = f.user_id ${where} ORDER BY f.created_at DESC`)
      .all(...(status ? [status] : []));
    res.json({ feedback: rows.map(feedbackOut) });
  }));

  r.post('/admin/feedback/:id', requireAdmin, handle((req, res) => {
    const b = body(req);
    if (b.status !== undefined && !FEEDBACK_STATUSES.includes(b.status)) fail(`status must be one of: ${FEEDBACK_STATUSES.join(', ')}`);
    const d = db();
    const row = d.prepare('SELECT * FROM feedback WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Feedback not found' });
    const reply = b.reply === undefined ? row.reply : text(b.reply, 'reply', { max: 1000 });
    d.prepare('UPDATE feedback SET status = ?, reply = ? WHERE id = ?').run(b.status ?? row.status, reply, row.id);
    audit(req, 'feedback.update', String(row.id), { status: b.status ?? row.status });
    res.json({ feedback: feedbackOut(d.prepare('SELECT f.*, u.name FROM feedback f LEFT JOIN users u ON u.id = f.user_id WHERE f.id = ?').get(row.id)) });
  }));

  // Referrals
  r.get('/referral', requireUser, (req, res) => {
    const code = referralCodeFor(req.user.id);
    const base = (env('PUBLIC_URL') || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '');
    const agg = db().prepare('SELECT COUNT(*) AS n, COALESCE(SUM(referrer_days), 0) AS days FROM referral_claims WHERE referrer_id = ?').get(req.user.id);
    res.json({ code, link: `${base}/?ref=${code}`, referred: agg.n, rewardDaysEarned: agg.days });
  });

  r.post('/referral/claim', requireUser, handle((req, res) => {
    const code = cleanCode(body(req).code);
    if (!code || code.length > 16) fail('code is required');
    const d = db();
    const owner = d.prepare('SELECT user_id FROM referral_codes WHERE code = ?').get(code);
    if (!owner) return res.status(404).json({ error: 'Unknown referral code' });
    if (owner.user_id === req.user.id) fail('You cannot use your own referral code');
    if (d.prepare('SELECT 1 FROM referral_claims WHERE user_id = ?').get(req.user.id)) return res.status(409).json({ error: 'You have already used a referral code' });
    const created = d.prepare('SELECT created_at FROM users WHERE id = ?').get(req.user.id)?.created_at || 0;
    const t = now();
    if (t - created > NEW_ACCOUNT_MS) return res.status(403).json({ error: 'Referral codes are for new accounts (first 7 days)' });
    const days = referralDays();
    const rewarded = d.prepare('SELECT COUNT(*) AS n FROM referral_claims WHERE referrer_id = ? AND referrer_days > 0').get(owner.user_id).n;
    const referrerDays = rewarded < REFERRAL_CAP ? days : 0;
    try {
      d.prepare('INSERT INTO referral_claims (user_id, referrer_id, code, referrer_days, created_at) VALUES (?, ?, ?, ?, ?)')
        .run(req.user.id, owner.user_id, code, referrerDays, t);
    } catch {
      return res.status(409).json({ error: 'You have already used a referral code' });
    }
    const subscription = grantComplimentary(req.user.id, 'premium_month', 'referral', days * DAY, { extend: true, ref: code });
    if (referrerDays) grantComplimentary(owner.user_id, 'premium_month', 'referral', referrerDays * DAY, { extend: true, ref: req.user.id });
    res.json({ ok: true, days, subscription, expiresAt: subscription.expiresAt });
  }));

  // Admin overview
  r.get('/admin/overview', requireAdmin, (_req, res) => {
    const latest = db().prepare('SELECT f.*, u.name FROM feedback f LEFT JOIN users u ON u.id = f.user_id ORDER BY f.created_at DESC LIMIT 5').all();
    res.json({
      stats: computeStats(30),
      latestFeedback: latest.map(feedbackOut),
      pendingPriests: scalar("SELECT COUNT(*) AS n FROM priests WHERE status = 'pending'"),
      openRequests: scalar("SELECT COUNT(*) AS n FROM service_requests WHERE status IN ('requested', 'confirmed', 'assigned')"),
      ordersAwaitingPayment: scalar("SELECT COUNT(*) AS n FROM store_orders WHERE status IN ('awaiting_payment', 'awaiting_payment_setup')"),
    });
  });

  return r;
}
