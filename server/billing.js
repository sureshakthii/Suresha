import crypto from 'node:crypto';
import express from 'express';
import { getDb } from './db.js';
import { currentUser } from './auth.js';

// Subscriptions: plans, Razorpay (INR) / Stripe Checkout (USD) payments, entitlements and the free AI quota.

const RAZORPAY = 'https://api.razorpay.com/v1/orders';
const STRIPE = 'https://api.stripe.com/v1/checkout/sessions';
const STRIPE_TOLERANCE = 5 * 60; // seconds
const DAY = 86400000;
const IST = 5.5 * 3600000; // quota days roll over at midnight India time

const f = (en, ta) => ({ en, ta });
const FREE_FEATURES = [
  f('Daily panchangam', 'தினசரி பஞ்சாங்கம்'),
  f('Birth charts (jathagam)', 'ஜாதகக் கட்டங்கள்'),
  f('Tamil calendar', 'தமிழ் நாட்காட்டி'),
  f('Porutham table', 'திருமணப் பொருத்த அட்டவணை'),
  f('5 Jothidar answers per day', 'நாளொன்றுக்கு 5 ஜோதிடர் பதில்கள்'),
];
const PREMIUM_FEATURES = [
  f('Unlimited Jothidar chat', 'வரம்பில்லா ஜோதிடர் உரையாடல்'),
  f('Life-timing predictions', 'வாழ்க்கை நிகழ்வுகளுக்கான கால கணிப்புகள்'),
  f('Full analysis reading', 'முழுமையான ஜாதக ஆய்வுப் பலன்'),
  f('Porutham explanation', 'பொருத்தங்களுக்கு விரிவான விளக்கம்'),
  f('Priority seva booking', 'சேவை முன்பதிவில் முன்னுரிமை'),
];
const FAMILY_FEATURES = [
  f('Everything in Premium', 'பிரீமியத்தின் அனைத்து வசதிகளும்'),
  f('Up to 8 family profiles under one account', 'ஒரே கணக்கில் 8 குடும்ப உறுப்பினர்கள் வரை'),
];

/** Default plans; prices are in rupees / dollars (not minor units). */
export const PLANS = [
  { id: 'free', name: f('Free', 'இலவசம்'), interval: null, price: { INR: 0, USD: 0 }, features: FREE_FEATURES },
  { id: 'premium_month', name: f('Premium — monthly', 'பிரீமியம் — மாதாந்திரம்'), interval: 'month', price: { INR: 199, USD: 4.99 }, features: PREMIUM_FEATURES },
  { id: 'premium_year', name: f('Premium — yearly', 'பிரீமியம் — ஆண்டுக்கு'), interval: 'year', price: { INR: 1999, USD: 49 }, features: PREMIUM_FEATURES },
  { id: 'family_month', name: f('Family — monthly', 'குடும்பம் — மாதாந்திரம்'), interval: 'month', price: { INR: 399, USD: 9.99 }, features: FAMILY_FEATURES },
  { id: 'family_year', name: f('Family — yearly', 'குடும்பம் — ஆண்டுக்கு'), interval: 'year', price: { INR: 3999, USD: 99 }, features: FAMILY_FEATURES },
];
const PLAN = new Map(PLANS.map((p) => [p.id, p]));
const PAID = PLANS.filter((p) => p.interval).map((p) => p.id);
const CURRENCIES = ['INR', 'USD'];

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    plan TEXT NOT NULL,
    status TEXT NOT NULL,
    currency TEXT,
    amount_minor INTEGER,
    gateway TEXT,
    gateway_ref TEXT,
    payment_ref TEXT,
    starts_at INTEGER,
    expires_at INTEGER,
    created_at INTEGER
  );
  CREATE INDEX IF NOT EXISTS subscriptions_user ON subscriptions(user_id);
  CREATE TABLE IF NOT EXISTS ai_usage (
    usage_key TEXT NOT NULL,
    day TEXT NOT NULL,
    count INTEGER NOT NULL,
    PRIMARY KEY (usage_key, day)
  );
`;

const env = (k) => (process.env[k] || '').trim();
let clock = () => Date.now();
const now = () => clock();
/** Test hook: override the clock used for expiry checks (null restores Date.now). */
export function setBillingClock(fn) { clock = fn || (() => Date.now()); }

// Gateway fetch is injectable so tests never hit the network.
let billingFetch = (...a) => fetch(...a);
export function setBillingFetch(fn) { billingFetch = fn || ((...a) => fetch(...a)); }

const ready = new WeakSet();
function db() {
  const d = getDb();
  if (!ready.has(d)) { d.exec(SCHEMA); ready.add(d); }
  return d;
}

class Invalid extends Error {}
const fail = (msg) => { throw new Invalid(msg); };

function safeEqual(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

const minor = (plan, currency) => Math.round(plan.price[currency] * 100);

function addInterval(from, interval) {
  const d = new Date(from);
  if (interval === 'year') d.setUTCFullYear(d.getUTCFullYear() + 1);
  else d.setUTCMonth(d.getUTCMonth() + 1);
  return d.getTime();
}

// ---- subscription state ----

/** The user's current paid subscription (latest expiry), marking lapsed ones expired. */
function activeSub(userId) {
  if (!userId) return null;
  const d = db();
  d.prepare("UPDATE subscriptions SET status = 'expired' WHERE user_id = ? AND status = 'active' AND expires_at <= ?").run(userId, now());
  return d.prepare("SELECT * FROM subscriptions WHERE user_id = ? AND status = 'active' ORDER BY expires_at DESC LIMIT 1").get(userId) || null;
}

/** Activate a pending (or new admin) subscription; extends from the current active expiry if later than now. */
function activate(sub, { paymentRef = null, days = null } = {}) {
  if (sub.status === 'active') return sub;
  const cur = activeSub(sub.user_id);
  const t = now();
  const base = cur && cur.id !== sub.id ? Math.max(t, cur.expires_at) : t;
  const expires = days ? base + days * DAY : addInterval(base, PLAN.get(sub.plan).interval);
  db().prepare("UPDATE subscriptions SET status = 'active', payment_ref = COALESCE(?, payment_ref), starts_at = ?, expires_at = ? WHERE id = ?")
    .run(paymentRef, t, expires, sub.id);
  return db().prepare('SELECT * FROM subscriptions WHERE id = ?').get(sub.id);
}

const subOut = (s, admin = false) => ({
  id: s.id, plan: s.plan, status: s.status, currency: s.currency, amountMinor: s.amount_minor, gateway: s.gateway,
  startsAt: s.starts_at, expiresAt: s.expires_at, createdAt: s.created_at, ...(admin ? { userId: s.user_id, gatewayRef: s.gateway_ref } : {}),
});

/** Feature flags for a user (null → signed-out / free). */
export function entitlementsFor(user) {
  const sub = activeSub(user?.id);
  const paid = !!sub;
  return { unlimitedAi: paid, predictions: paid, familyProfiles: sub?.plan.startsWith('family') ? 8 : 1 };
}

// ---- complimentary access (used by server/growth.js: gift codes, trials, referrals) ----

/**
 * Give a user free access to a paid plan for `ms` milliseconds; returns the user's resulting current subscription.
 * extend=false (gift/trial): never stacks — if a later expiry already exists it is kept and nothing is inserted.
 * extend=true (referral): adds the time on top of the current expiry.
 */
export function grantComplimentary(userId, planId, gateway, ms, { extend = false, ref = null } = {}) {
  const plan = PLAN.get(planId);
  if (!plan?.interval) throw new Error(`Not a paid plan: ${planId}`);
  const cur = activeSub(userId);
  const t = now();
  const base = extend && cur ? Math.max(t, cur.expires_at) : t;
  if (!extend && cur && cur.expires_at >= base + ms) return subOut(cur);
  const id = crypto.randomUUID();
  db().prepare(`INSERT INTO subscriptions (id, user_id, plan, status, currency, amount_minor, gateway, gateway_ref, starts_at, expires_at, created_at)
    VALUES (?, ?, ?, 'active', 'INR', 0, ?, ?, ?, ?, ?)`).run(id, userId, plan.id, gateway, ref, t, base + ms, t);
  return subOut(db().prepare('SELECT * FROM subscriptions WHERE id = ?').get(id));
}

// ---- AI quota ----

export const billingEnforced = () => env('BILLING_ENFORCE') === '1';
const freeDaily = () => { const n = Number(env('AI_FREE_DAILY')); return Number.isInteger(n) && n >= 0 && env('AI_FREE_DAILY') ? n : 5; };
const today = () => new Date(now() + IST).toISOString().slice(0, 10);
const usageKey = (req) => { const u = currentUser(req); return u ? `u:${u.id}` : `ip:${req.ip}`; };
const usedToday = (key) => db().prepare('SELECT count FROM ai_usage WHERE usage_key = ? AND day = ?').get(key, today())?.count || 0;

/** { allowed, used, limit } — limit is null for unlimited plans. */
export function checkAiQuota(req) {
  const used = usedToday(usageKey(req));
  if (entitlementsFor(currentUser(req)).unlimitedAi) return { allowed: true, used, limit: null };
  const limit = freeDaily();
  return { allowed: used < limit, used, limit };
}

/** Count one successful AI call for this person (or IP when signed out). */
export function recordAiUsage(req) {
  db().prepare(`INSERT INTO ai_usage (usage_key, day, count) VALUES (?, ?, 1)
    ON CONFLICT(usage_key, day) DO UPDATE SET count = count + 1`).run(usageKey(req), today());
}

// ---- gateways ----

const razorpayConfigured = () => !!(env('RAZORPAY_KEY_ID') && env('RAZORPAY_KEY_SECRET'));

async function createRazorpayOrder(amountPaise, receipt) {
  const auth = Buffer.from(`${env('RAZORPAY_KEY_ID')}:${env('RAZORPAY_KEY_SECRET')}`).toString('base64');
  const r = await billingFetch(RAZORPAY, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: amountPaise, currency: 'INR', receipt }),
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok || !body.id) throw new Error(`Razorpay ${r.status}: ${JSON.stringify(body).slice(0, 200)}`);
  return body;
}

async function createStripeSession({ subId, plan, amountCents, publicUrl }) {
  const form = new URLSearchParams({
    mode: 'payment',
    'line_items[0][price_data][currency]': 'usd',
    'line_items[0][price_data][unit_amount]': String(amountCents),
    'line_items[0][price_data][product_data][name]': `Kaippesi Jothidar ${plan.name.en}`,
    'line_items[0][quantity]': '1',
    success_url: `${publicUrl}/#billing-success`,
    cancel_url: `${publicUrl}/#billing-cancel`,
    client_reference_id: subId,
    'metadata[subscription_id]': subId,
  });
  const r = await billingFetch(STRIPE, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env('STRIPE_SECRET_KEY')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok || !body.id || !body.url) throw new Error(`Stripe ${r.status}: ${JSON.stringify(body).slice(0, 200)}`);
  return body;
}

/** Stripe-Signature: "t=<unix>,v1=<hex>[,v1=…]"; HMAC-SHA256 of `${t}.${rawBody}`. */
function verifyStripeSignature(header, raw, secret) {
  const parts = String(header || '').split(',').map((p) => p.trim().split('='));
  const t = parts.find(([k]) => k === 't')?.[1];
  const sigs = parts.filter(([k]) => k === 'v1').map(([, v]) => v);
  if (!t || !/^\d+$/.test(t) || !sigs.length) return false;
  if (Math.abs(now() / 1000 - Number(t)) > STRIPE_TOLERANCE) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${t}.`).update(raw).digest('hex');
  return sigs.some((s) => safeEqual(s, expected));
}

// ---- middleware ----

function requireUser(req, res, next) {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: 'Please sign in first' });
  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  const token = env('ADMIN_TOKEN');
  if (!token) return res.status(503).json({ error: 'Admin is not configured (set ADMIN_TOKEN)' });
  const given = req.get('x-admin-token');
  if (!given) return res.status(401).json({ error: 'Admin token required' });
  if (!safeEqual(given, token)) return res.status(403).json({ error: 'Invalid admin token' });
  next();
}

const handle = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (err) {
    if (err instanceof Invalid) return res.status(400).json({ error: err.message });
    next(err);
  }
};

const body = (req) => (req.body && typeof req.body === 'object' && !Array.isArray(req.body) && !Buffer.isBuffer(req.body) ? req.body : {});
const paidPlan = (id) => (PAID.includes(id) ? PLAN.get(id) : fail(`plan must be one of: ${PAID.join(', ')}`));
const currencyOf = (v, dflt) => {
  const c = v === undefined || v === null || v === '' ? dflt : String(v).toUpperCase();
  return CURRENCIES.includes(c) ? c : fail('currency must be INR or USD');
};

// ---- router ----

export function billingRouter() {
  const r = express.Router();

  r.get('/billing/plans', handle((req, res) => {
    const currency = currencyOf(req.query.currency, 'INR');
    res.json({ currency, plans: PLANS.map((p) => ({ ...p, currency, amount: p.price[currency] })) });
  }));

  r.get('/billing/me', (req, res) => {
    const user = currentUser(req);
    // Optional automatic trial (TRIAL_HOURS): granted once, to a signed-in user who never had a subscription.
    const trialHours = Number(env('TRIAL_HOURS'));
    if (user && trialHours > 0 && !db().prepare("SELECT 1 FROM subscriptions WHERE user_id = ? AND status IN ('active', 'expired') LIMIT 1").get(user.id)) {
      grantComplimentary(user.id, 'premium_month', 'trial', Math.min(trialHours, 8760) * 3600000);
    }
    const sub = activeSub(user?.id);
    const quota = checkAiQuota(req);
    // locked: had paid/gift/trial access that has now lapsed (expiry is enforced via activeSub).
    const lapsed = !sub && !!user && !!db().prepare("SELECT 1 FROM subscriptions WHERE user_id = ? AND status = 'expired' LIMIT 1").get(user.id);
    res.json({
      plan: sub ? sub.plan : 'free', status: sub ? sub.status : 'active', expiresAt: sub ? sub.expires_at : null,
      trialEndsAt: sub && ['gift', 'trial'].includes(sub.gateway) ? sub.expires_at : null, locked: lapsed, enforced: billingEnforced(),
      entitlements: entitlementsFor(user), aiUsedToday: quota.used, aiFreeDaily: freeDaily(),
    });
  });

  r.post('/billing/checkout', requireUser, handle(async (req, res) => {
    const b = body(req);
    const plan = paidPlan(b.plan);
    const currency = currencyOf(b.currency, 'INR');
    const amount = minor(plan, currency);
    const id = crypto.randomUUID();
    let out = { subscriptionId: id, gateway: null, status: 'payment_setup_pending' };
    let gateway = null, ref = null;
    try {
      if (currency === 'INR' && razorpayConfigured()) {
        const rz = await createRazorpayOrder(amount, id);
        gateway = 'razorpay'; ref = rz.id;
        out = { subscriptionId: id, gateway, keyId: env('RAZORPAY_KEY_ID'), razorpayOrderId: rz.id, amount, currency };
      } else if (currency === 'USD' && env('STRIPE_SECRET_KEY')) {
        const publicUrl = (env('PUBLIC_URL') || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '');
        const s = await createStripeSession({ subId: id, plan, amountCents: amount, publicUrl });
        gateway = 'stripe'; ref = s.id;
        out = { subscriptionId: id, gateway, url: s.url };
      }
    } catch (err) {
      console.error('Billing checkout failed:', err.message);
      return res.status(502).json({ error: 'Payment gateway is unavailable right now. Please try again.' });
    }
    db().prepare(`INSERT INTO subscriptions (id, user_id, plan, status, currency, amount_minor, gateway, gateway_ref, created_at)
      VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?)`).run(id, req.user.id, plan.id, currency, amount, gateway, ref, now());
    res.json(out);
  }));

  r.post('/billing/verify', requireUser, handle((req, res) => {
    const secret = env('RAZORPAY_KEY_SECRET');
    if (!secret) return res.status(503).json({ error: 'Online payment is not configured' });
    const { subscriptionId, razorpay_order_id: oid, razorpay_payment_id: pid, razorpay_signature: sig } = body(req);
    if (![subscriptionId, oid, pid, sig].every((v) => typeof v === 'string' && v.length > 0 && v.length <= 200)) {
      fail('subscriptionId, razorpay_order_id, razorpay_payment_id and razorpay_signature are required');
    }
    const sub = db().prepare('SELECT * FROM subscriptions WHERE id = ? AND user_id = ?').get(subscriptionId, req.user.id);
    if (!sub) return res.status(404).json({ error: 'Subscription not found' });
    if (sub.gateway !== 'razorpay' || !sub.gateway_ref || !safeEqual(oid, sub.gateway_ref)) fail('Payment does not match this subscription');
    const expected = crypto.createHmac('sha256', secret).update(`${oid}|${pid}`).digest('hex');
    if (!safeEqual(sig, expected)) return res.status(400).json({ error: 'Payment signature verification failed' });
    if (sub.status !== 'pending' && sub.status !== 'active') fail(`Subscription is ${sub.status}`);
    res.json({ subscription: subOut(activate(sub, { paymentRef: pid })) });
  }));

  // Raw body: server/index.js mounts express.raw for this path before express.json.
  r.post('/billing/stripe/webhook', (req, res) => {
    const secret = env('STRIPE_WEBHOOK_SECRET');
    if (!secret) return res.status(503).json({ error: 'Stripe webhook is not configured' });
    const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    if (!verifyStripeSignature(req.get('stripe-signature'), raw, secret)) return res.status(400).json({ error: 'Invalid signature' });
    let event;
    try { event = JSON.parse(raw.toString('utf8')); } catch { return res.status(400).json({ error: 'Invalid payload' }); }
    if (event?.type === 'checkout.session.completed') {
      const session = event.data?.object || {};
      const subId = session.metadata?.subscription_id || session.client_reference_id;
      const sub = subId && db().prepare("SELECT * FROM subscriptions WHERE id = ? AND gateway = 'stripe'").get(String(subId));
      if (sub && (sub.status === 'pending' || sub.status === 'active')) activate(sub, { paymentRef: session.payment_intent || session.id || null });
    }
    res.json({ received: true });
  });

  // Admin
  r.post('/admin/billing/grant', requireAdmin, handle((req, res) => {
    const b = body(req);
    const plan = paidPlan(b.plan);
    if (typeof b.userId !== 'string' || !db().prepare('SELECT id FROM users WHERE id = ?').get(b.userId)) return res.status(404).json({ error: 'User not found' });
    const days = Number(b.days);
    if (!Number.isInteger(days) || days < 1 || days > 3660) fail('days must be a whole number from 1 to 3660');
    const id = crypto.randomUUID();
    db().prepare(`INSERT INTO subscriptions (id, user_id, plan, status, currency, amount_minor, gateway, gateway_ref, created_at)
      VALUES (?, ?, ?, 'pending', 'INR', 0, 'admin', NULL, ?)`).run(id, b.userId, plan.id, now());
    const sub = activate(db().prepare('SELECT * FROM subscriptions WHERE id = ?').get(id), { days });
    res.status(201).json({ subscription: subOut(sub, true) });
  }));

  r.get('/admin/billing/subscriptions', requireAdmin, (_req, res) => {
    const rows = db().prepare('SELECT * FROM subscriptions ORDER BY created_at DESC').all();
    res.json({ subscriptions: rows.map((s) => subOut(s, true)) });
  });

  return r;
}
