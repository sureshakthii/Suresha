import { BRAND } from '../shared/brand.js';
import crypto from 'node:crypto';
import express from 'express';
import { getDb } from './db.js';
import { requireAdmin as adminRole, audit } from './admin.js';
import { currentUser } from './auth.js';
import { FREE_LIMITS } from '../shared/plan-gates.js';
import { PAY_CURRENCIES, payCurrencyFor, payGateway, toMinor, formatPrice } from '../shared/currency.js';
import { countryByCode, parseE164 } from '../shared/countries.js';

// Subscriptions: plans, payments, entitlements and the free AI quota.
// Exactly three payment currencies, decided HERE from the buyer's residence country (shared/currency.js):
//   India → INR via Razorpay · United Arab Emirates → AED via Stripe Checkout · every other country → USD via Stripe.
// The client sends only the plan and its residence country; the price always comes from PLANS below.

const RAZORPAY = 'https://api.razorpay.com/v1/orders';
const STRIPE = 'https://api.stripe.com/v1/checkout/sessions';
const STRIPE_REFUNDS = 'https://api.stripe.com/v1/refunds';
const STRIPE_TOLERANCE = 5 * 60; // seconds
const DAY = 86400000;
const IST = 5.5 * 3600000; // quota days roll over at midnight India time

const f = (en, ta) => ({ en, ta });
const price = (cur, key, dflt) => {
  // PRICE_<CUR>_PERSONAL_* is the current name; PRICE_<CUR>_PREMIUM_* (the plan's earlier name) is still honoured.
  const raw = process.env[`PRICE_${cur}_${key}`] ?? (key.startsWith('PERSONAL_') ? process.env[`PRICE_${cur}_${key.replace('PERSONAL_', 'PREMIUM_')}`] : undefined);
  const v = Number(raw);
  return Number.isFinite(v) && v > 0 ? v : dflt;
};
/** { INR, AED, USD } for one plan key — each overridable by PRICE_{CUR}_{KEY}. */
const prices = (key, inr, aed, usd) => ({ INR: price('INR', key, inr), AED: price('AED', key, aed), USD: price('USD', key, usd) });
/**
 * Monthly AI-answer allowance per plan (AI_PERSONAL_MONTHLY — AI_PREMIUM_MONTHLY still read as the old name —
 * and AI_FAMILY_MONTHLY). Never "unlimited" until costs are measured.
 */
export const aiAllowance = (kind) => {
  const v = Number(kind === 'family' ? process.env.AI_FAMILY_MONTHLY : process.env.AI_PERSONAL_MONTHLY || process.env.AI_PREMIUM_MONTHLY);
  return Number.isInteger(v) && v > 0 ? v : kind === 'family' ? 250 : 100;
};
/** Terms shown next to every price (also in public/legal.js). */
export const PLAN_TERMS = {
  renewal: f('One-time payment for the chosen period. It does not renew automatically — you choose whether to buy again.', 'தேர்ந்த காலத்திற்கான ஒருமுறைக் கட்டணம். தானாகப் புதுப்பிக்கப்படாது — மீண்டும் வாங்குவது உங்கள் முடிவு.'),
  cancellation: f('Nothing to cancel: access simply ends on the expiry date. Contact us within 7 days for a refund if the service did not work for you.', 'ரத்து செய்ய வேண்டியதில்லை: காலாவதி நாளில் அணுகல் முடியும். சேவை சரியாக இயங்கவில்லை எனில் 7 நாட்களுக்குள் பணத்திருப்பம் கோரலாம்.'),
  refund: f('Full refund within 7 days of purchase on request; after that, a pro-rata refund for unused months of a yearly plan. Refunds go back to the original payment method in 5–7 working days.', 'வாங்கிய 7 நாட்களுக்குள் கோரினால் முழுப் பணத்திருப்பம்; அதன் பின் ஆண்டுத் திட்டத்தில் பயன்படுத்தாத மாதங்களுக்கு விகிதாசாரப் பணத்திருப்பம். 5–7 வேலை நாட்களில் அசல் கட்டண முறைக்குத் திரும்பும்.'),
  packages: f('One-time packages (Marriage, Journey) cover one couple or one journey for a fixed number of days and then end — nothing renews. Same refund policy: full refund on request within 7 days of purchase.', 'ஒருமுறைத் தொகுப்புகள் (திருமணம், யாத்திரை) ஒரு ஜோடி / ஒரு பயணத்திற்குக் குறிப்பிட்ட நாட்கள் மட்டும்; பிறகு முடியும் — எதுவும் புதுப்பிக்கப்படாது. அதே பணத்திருப்பக் கொள்கை: வாங்கிய 7 நாட்களுக்குள் கோரினால் முழுப் பணத்திருப்பம்.'),
};
const FREE_FEATURES = [
  f('Daily panchangam & 12 rasi palan', 'தினசரி பஞ்சாங்கம் & 12 ராசி பலன்'),
  f('Baby names: browsing, meanings and star-letter suggestions', 'குழந்தைப் பெயர்கள்: தேடல், பொருள், நட்சத்திர எழுத்துப் பரிந்துரைகள்'),
  f('Weekly planning', 'வாராந்திரத் திட்டமிடல்'),
  f('One saved goal, one saved journey and up to 10 shortlisted names', 'ஒரு சேமித்த இலக்கு, ஒரு சேமித்த பயணம், 10 பெயர்கள் வரை பட்டியல்'),
  f('Daily colour, lucky number & Ishta Theivam', 'தினசரி நிறம், அதிர்ஷ்ட எண், இஷ்ட தெய்வம்'),
  f('Birth charts (jathagam)', 'ஜாதகக் கட்டங்கள்'),
  f('Tamil calendar', 'தமிழ் நாட்காட்டி'),
  f('Porutham table (basic matching)', 'திருமணப் பொருத்த அட்டவணை (அடிப்படைப் பொருத்தம்)'),
  f('Built-in explainable guidance, unlimited', 'உள்ளமைந்த விளக்க வழிகாட்டல், வரம்பின்றி'),
  f('A few detailed answers per day', 'நாளொன்றுக்குச் சில விரிவான பதில்கள்'),
];
// `soon: true` marks a feature that is planned but NOT built yet: the Plans screen labels it "Coming soon" and it is
// never part of what a payment buys today. Basic baby-name browsing, meanings and star letters stay free.
const soon = (en, ta) => ({ en, ta, soon: true });
const PERSONAL_FEATURES = [
  f('Detailed reports — life-timing periods, full chart analysis, detailed marriage matching, business partner porutham', 'விரிவான அறிக்கைகள் — வாழ்க்கை நேரக் காலங்கள், முழு ஜாதக ஆய்வு, விரிவான திருமணப் பொருத்தம், வணிகக் கூட்டாளி பொருத்தம்'),
  f('My Guide — gemstones, Siddhar and personal mantra playlist', 'என் வழிகாட்டி — ரத்தினம், சித்தர், தனிப்பட்ட மந்திரப் பட்டியல்'),
  f(`Up to ${aiAllowance('personal')} detailed answers per month (everyday guidance is unlimited)`, `மாதம் ${aiAllowance('personal')} விரிவான பதில்கள் வரை (அன்றாட வழிகாட்டல் வரம்பின்றி)`),
  f('Saved goals — as many as you like (one is free)', 'சேமித்த இலக்குகள் — வரம்பின்றி (ஒன்று இலவசம்)'),
  f('More saved journeys and name shortlists longer than 10', 'கூடுதல் சேமித்த பயணங்கள், 10-க்கு மேற்பட்ட பெயர்ப் பட்டியல்'),
  f('Printable / PDF reports — Dasa road map, matching report, journey plan', 'அச்சிடக்கூடிய / PDF அறிக்கைகள் — தசா வரைபடம், பொருத்த அறிக்கை, பயணத் திட்டம்'),
];
const FAMILY_FEATURES = [
  f('Everything in Personal', 'தனிநபர் திட்டத்தின் அனைத்து வசதிகளும்'),
  f('Up to 8 family profiles, each shared only with permission (private profiles stay private)', '8 குடும்ப உறுப்பினர்கள் வரை — ஒவ்வொருவரின் அனுமதியுடன் மட்டுமே பகிர்வு (தனிப்பட்ட சுயவிவரம் தனிப்பட்டதாகவே)'),
  f('Family collaboration — share goals, plans and events with members who agree', 'குடும்பக் கூட்டுழைப்பு — ஒப்புக்கொள்ளும் உறுப்பினர்களுடன் இலக்குகள், திட்டங்கள், நிகழ்வுகள் பகிர்வு'),
  f('Shared event and journey planning', 'பகிர்ந்த நிகழ்வு, பயணத் திட்டமிடல்'),
  f(`Up to ${aiAllowance('family')} detailed answers per month, shared by the family`, `குடும்பத்திற்குப் பகிர்ந்து மாதம் ${aiAllowance('family')} விரிவான பதில்கள் வரை`),
];

/**
 * One-time packages for occasional users (kind 'package'): no subscription, no automatic renewal, scoped to ONE
 * couple (pairId) or ONE saved journey (journeyId) captured at purchase. Initial test prices, configurable:
 *   PRICE_INR_MARRIAGE_PACKAGE (499) · PRICE_AED_MARRIAGE_PACKAGE (33) · PRICE_USD_MARRIAGE_PACKAGE (9)
 *   PRICE_INR_JOURNEY_PACKAGE (299)  · PRICE_AED_JOURNEY_PACKAGE (22)  · PRICE_USD_JOURNEY_PACKAGE (6)
 * Answer allowances: PACKAGE_MARRIAGE_ANSWERS (30) · PACKAGE_JOURNEY_ANSWERS (15). Costed in docs/COSTING.md.
 */
const count = (k, dflt) => { const v = Number(process.env[k]); return Number.isInteger(v) && v > 0 ? v : dflt; };
export const packageAnswers = (id) => (id === 'marriage_package' ? count('PACKAGE_MARRIAGE_ANSWERS', 30) : count('PACKAGE_JOURNEY_ANSWERS', 15));
const PACKAGES = [
  {
    id: 'marriage_package', kind: 'package', interval: null, durationDays: 90, scopeKind: 'pair', answers: packageAnswers('marriage_package'),
    name: f('Marriage package — one couple, 90 days', 'திருமணத் தொகுப்பு — ஒரு ஜோடி, 90 நாள்'),
    price: prices('MARRIAGE_PACKAGE', 499, 33, 9),
    features: [
      f('One-time payment — no subscription, nothing renews', 'ஒருமுறைக் கட்டணம் — சந்தா இல்லை, எதுவும் தானாகப் புதுப்பிக்கப்படாது'),
      f('90 days of access for ONE couple you choose at purchase', 'வாங்கும்போது நீங்கள் தேர்ந்தெடுக்கும் ஒரு ஜோடிக்கு 90 நாள் அணுகல்'),
      f('The full five-card matching report for that couple', 'அந்த ஜோடிக்கான முழு ஐந்து-அட்டைப் பொருத்த அறிக்கை'),
      f('Printable / exportable matching report', 'அச்சிட / ஏற்றுமதி செய்யக்கூடிய பொருத்த அறிக்கை'),
      f(`${packageAnswers('marriage_package')} detailed answers`, `${packageAnswers('marriage_package')} விரிவான பதில்கள்`),
      soon('Saved muhurtham shortlist for up to 3 events, checked for both (the muhurtham finder itself stays free)', 'இருவருக்கும் சரிபார்த்த 3 நிகழ்வுகள் வரை சேமித்த முகூர்த்தப் பட்டியல் (முகூர்த்தத் தேடல் இலவசமே)'),
    ],
  },
  {
    id: 'journey_package', kind: 'package', interval: null, durationDays: 60, scopeKind: 'journey', answers: packageAnswers('journey_package'),
    name: f('Journey package — one journey, 60 days', 'யாத்திரைத் தொகுப்பு — ஒரு பயணம், 60 நாள்'),
    price: prices('JOURNEY_PACKAGE', 299, 22, 6),
    features: [
      f('One-time payment — no subscription, nothing renews', 'ஒருமுறைக் கட்டணம் — சந்தா இல்லை, எதுவும் தானாகப் புதுப்பிக்கப்படாது'),
      f('60 days for ONE saved journey you choose at purchase', 'வாங்கும்போது தேர்ந்தெடுக்கும் ஒரு சேமித்த பயணத்திற்கு 60 நாள்'),
      f('Saved itinerary with live weather and timing re-checks when you open it', 'திறக்கும்போது நேரலை வானிலை, நேர மறுசரிபார்ப்புடன் சேமித்த பயணத் திட்டம்'),
      f('Printable journey plan', 'அச்சிடக்கூடிய பயணத் திட்டம்'),
      f(`${packageAnswers('journey_package')} detailed answers`, `${packageAnswers('journey_package')} விரிவான பதில்கள்`),
    ],
  },
];
/** Package ids (one-time, scoped). Never accepted by gift codes, trials or referrals. */
export const PACKAGE_IDS = PACKAGES.map((p) => p.id);
const PKG_SQL = PACKAGE_IDS.map((id) => `'${id}'`).join(', ');

/**
 * Plans. Prices are INITIAL TEST PRICES and are configurable without code changes:
 *   PRICE_INR_PERSONAL_MONTH (199) · PRICE_INR_PERSONAL_YEAR (1999) · PRICE_INR_FAMILY_MONTH (399) · PRICE_INR_FAMILY_YEAR (3999)
 *   PRICE_AED_PERSONAL_MONTH (18)   · PRICE_AED_PERSONAL_YEAR (179) · PRICE_AED_FAMILY_MONTH (36)   · PRICE_AED_FAMILY_YEAR (359)
 *   PRICE_USD_PERSONAL_MONTH (4.99) · PRICE_USD_PERSONAL_YEAR (49) · PRICE_USD_FAMILY_MONTH (9.99) · PRICE_USD_FAMILY_YEAR (99)
 * Payments are one-time for the period (no automatic renewal). Prices are in rupees / dirhams / dollars (not minor
 * units); AED prices are set as clean local prices (≈ USD × 3.67), not converted at checkout — docs/COSTING.md.
 * "Personal" was called "Premium" before: the old ids premium_month / premium_year are accepted everywhere as
 * aliases (PLAN_ALIASES), so existing subscription rows, gift codes, webhooks and referral grants keep working.
 */
export const PLANS = [
  { id: 'free', kind: 'free', name: f('Free', 'இலவசம்'), interval: null, price: { INR: 0, AED: 0, USD: 0 }, features: FREE_FEATURES },
  { id: 'personal_month', kind: 'subscription', name: f('Personal — monthly', 'தனிநபர் — மாதாந்திரம்'), interval: 'month', price: prices('PERSONAL_MONTH', 199, 18, 4.99), features: PERSONAL_FEATURES },
  { id: 'personal_year', kind: 'subscription', name: f('Personal — yearly', 'தனிநபர் — ஆண்டுக்கு'), interval: 'year', price: prices('PERSONAL_YEAR', 1999, 179, 49), features: PERSONAL_FEATURES },
  { id: 'family_month', kind: 'subscription', name: f('Family — monthly', 'குடும்பம் — மாதாந்திரம்'), interval: 'month', price: prices('FAMILY_MONTH', 399, 36, 9.99), features: FAMILY_FEATURES },
  { id: 'family_year', kind: 'subscription', name: f('Family — yearly', 'குடும்பம் — ஆண்டுக்கு'), interval: 'year', price: prices('FAMILY_YEAR', 3999, 359, 99), features: FAMILY_FEATURES },
  ...PACKAGES,
];
/** Old plan id → current id. */
export const PLAN_ALIASES = Object.freeze({ premium_month: 'personal_month', premium_year: 'personal_year' });
/** The current id for a plan id (old aliases mapped; anything else returned unchanged). */
export const canonicalPlan = (id) => PLAN_ALIASES[id] || id;
const PLAN = new Map([...PLANS.map((p) => [p.id, p]), ...Object.entries(PLAN_ALIASES).map(([old, cur]) => [old, PLANS.find((p) => p.id === cur)])]);
/** Paid plan ids accepted from callers (current ids first, then the old aliases). */
export const PAID_PLAN_IDS = [...PLANS.filter((p) => p.interval).map((p) => p.id), ...Object.keys(PLAN_ALIASES)];
const PAID = PAID_PLAN_IDS;
/** Everything that can be bought at checkout: subscriptions (and their aliases) plus one-time packages. */
const BUYABLE = [...PAID, ...PACKAGE_IDS];
const CURRENCIES = PAY_CURRENCIES; // INR · AED · USD — nothing else is ever charged

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
    created_at INTEGER,
    scope TEXT
  );
  CREATE INDEX IF NOT EXISTS subscriptions_user ON subscriptions(user_id);
  CREATE TABLE IF NOT EXISTS webhook_events (
    id TEXT PRIMARY KEY,
    gateway TEXT NOT NULL,
    type TEXT,
    received_at INTEGER NOT NULL
  );
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
  if (!ready.has(d)) {
    d.exec(SCHEMA);
    // Older databases: add the package scope column (JSON {pairId} / {journeyId}; NULL for subscriptions).
    const cols = d.prepare('PRAGMA table_info(subscriptions)').all();
    if (!cols.some((c) => c.name === 'scope')) d.exec('ALTER TABLE subscriptions ADD COLUMN scope TEXT');
    // The residence country the price was chosen for (ISO code; NULL for grants and older rows).
    if (!cols.some((c) => c.name === 'country')) d.exec('ALTER TABLE subscriptions ADD COLUMN country TEXT');
    ready.add(d);
  }
  return d;
}

class Invalid extends Error {}
const fail = (msg) => { throw new Invalid(msg); };

function safeEqual(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

const minor = (plan, currency) => toMinor(plan.price[currency]); // paise / fils / cents

function addInterval(from, interval) {
  const d = new Date(from);
  if (interval === 'year') d.setUTCFullYear(d.getUTCFullYear() + 1);
  else d.setUTCMonth(d.getUTCMonth() + 1);
  return d.getTime();
}

// ---- subscription state ----

/** The user's current paid subscription (latest expiry; one-time packages excluded), marking lapsed rows expired. */
function activeSub(userId) {
  if (!userId) return null;
  const d = db();
  d.prepare("UPDATE subscriptions SET status = 'expired' WHERE user_id = ? AND status = 'active' AND expires_at <= ?").run(userId, now());
  return d.prepare(`SELECT * FROM subscriptions WHERE user_id = ? AND status = 'active' AND plan NOT IN (${PKG_SQL}) ORDER BY expires_at DESC LIMIT 1`).get(userId) || null;
}

const parseScope = (s) => { try { const o = JSON.parse(s || 'null'); return o && typeof o === 'object' ? o : {}; } catch { return {}; } };
/** The user's active one-time packages (each scoped to one couple or one journey). */
function activePackages(userId) {
  if (!userId) return [];
  activeSub(userId); // expires lapsed rows
  return db().prepare(`SELECT * FROM subscriptions WHERE user_id = ? AND status = 'active' AND plan IN (${PKG_SQL}) ORDER BY expires_at`).all(userId);
}

/** Activate a pending (or new admin) subscription; extends from the current active expiry if later than now. */
function activate(sub, { paymentRef = null, days = null } = {}) {
  if (sub.status === 'active') return sub;
  const cur = activeSub(sub.user_id);
  const t = now();
  const base = cur && cur.id !== sub.id ? Math.max(t, cur.expires_at) : t;
  const plan = PLAN.get(sub.plan);
  // A package runs its own fixed term from the moment it is paid; it never stacks on a subscription.
  const expires = days ? base + days * DAY : plan.kind === 'package' ? t + plan.durationDays * DAY : addInterval(base, plan.interval);
  db().prepare("UPDATE subscriptions SET status = 'active', payment_ref = COALESCE(?, payment_ref), starts_at = ?, expires_at = ? WHERE id = ?")
    .run(paymentRef, t, expires, sub.id);
  return db().prepare('SELECT * FROM subscriptions WHERE id = ?').get(sub.id);
}

const subOut = (s, admin = false) => ({
  id: s.id, plan: canonicalPlan(s.plan), status: s.status, currency: s.currency, amountMinor: s.amount_minor, gateway: s.gateway,
  startsAt: s.starts_at, expiresAt: s.expires_at, createdAt: s.created_at, ...(s.country ? { country: s.country } : {}), ...(s.scope ? { scope: parseScope(s.scope) } : {}), ...(admin ? { userId: s.user_id, gatewayRef: s.gateway_ref } : {}),
});

/**
 * Feature flags for a user (null → signed-out / free). Gates are applied only under BILLING_ENFORCE=1
 * (shared/plan-gates.js explains each one). null for a *Max means "no limit". Active one-time packages add
 * scoped rights: matchingPairs (couples with the full matching report + print) and journeyIds (journeys that may
 * be saved and printed); they never unlock anything outside their scope.
 */
export function entitlementsFor(user) {
  const sub = activeSub(user?.id);
  const paid = !!sub;
  const family = !!sub?.plan.startsWith('family');
  const pk = activePackages(user?.id).map((p) => ({ id: p.id, plan: p.plan, scope: parseScope(p.scope), startsAt: p.starts_at, expiresAt: p.expires_at, answers: packageAnswers(p.plan) }));
  return {
    unlimitedAi: false, aiMonthly: paid ? aiAllowance(family ? 'family' : 'personal') : null, predictions: paid, familyProfiles: family ? 8 : 1,
    goalsMax: paid ? null : FREE_LIMITS.goals, shortlistMax: paid ? null : FREE_LIMITS.shortlist, journeysMax: paid ? null : FREE_LIMITS.journeys,
    printReports: paid, familyCollab: family, sharedPlanning: family,
    packages: pk,
    matchingPairs: [...new Set(pk.filter((p) => p.plan === 'marriage_package' && p.scope.pairId).map((p) => p.scope.pairId))],
    journeyIds: [...new Set(pk.filter((p) => p.plan === 'journey_package' && p.scope.journeyId).map((p) => p.scope.journeyId))],
  };
}

/**
 * PUT /api/me/data guard (mounted before the auth router): under BILLING_ENFORCE=1 the account backup keeps at most
 * `familyProfiles` profiles (the active one first). Nothing on the phone is touched — extra profiles simply stay
 * device-only — and the response says how many were left out so the app can explain what the Family plan adds.
 */
export function familyProfileGuard(req, res, next) {
  const data = req.body?.data;
  if (!billingEnforced() || !data || !Array.isArray(data.family)) return next();
  const user = currentUser(req);
  if (!user) return next();
  const limit = entitlementsFor(user).familyProfiles;
  if (data.family.length <= limit) return next();
  const ordered = [...data.family.filter((m) => m?.id === data.activeId), ...data.family.filter((m) => m?.id !== data.activeId)];
  const left = ordered.length - limit;
  req.body.data = { ...data, family: ordered.slice(0, limit) };
  const json = res.json.bind(res);
  res.json = (body) => json(body && body.ok ? { ...body, familyLimit: { limit, notBackedUp: left, upgrade: 'family' } } : body);
  next();
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
    VALUES (?, ?, ?, 'active', 'INR', 0, ?, ?, ?, ?, ?)`).run(id, userId, plan.id, gateway, ref, t, base + ms, t); // plan.id is always the current id
  return subOut(db().prepare('SELECT * FROM subscriptions WHERE id = ?').get(id));
}

// ---- AI quota ----

export const billingEnforced = () => env('BILLING_ENFORCE') === '1';
const freeDaily = () => { const n = Number(env('AI_FREE_DAILY')); return Number.isInteger(n) && n >= 0 && env('AI_FREE_DAILY') ? n : 5; };
const today = () => new Date(now() + IST).toISOString().slice(0, 10);
const usageKey = (req) => { const u = currentUser(req); return u ? `u:${u.id}` : `ip:${req.ip}`; };
const usedToday = (key) => db().prepare('SELECT count FROM ai_usage WHERE usage_key = ? AND day = ?').get(key, today())?.count || 0;

const month = () => today().slice(0, 7);
const usedThisMonth = (key) => db().prepare("SELECT COALESCE(SUM(count), 0) AS n FROM ai_usage WHERE usage_key = ? AND day LIKE ?").get(key, `${month()}-%`)?.n || 0;

const dayOf = (t) => new Date(t + IST).toISOString().slice(0, 10);
const usedSince = (key, day) => db().prepare('SELECT COALESCE(SUM(count), 0) AS n FROM ai_usage WHERE usage_key = ? AND day >= ?').get(key, day)?.n || 0;

/**
 * { allowed, used, limit, period } — paid plans have a monthly allowance; free has a daily one. An active package
 * adds its answer pool (counted from the day it started): while the pool lasts period is 'package'; when it is
 * used up the free daily allowance still applies.
 */
export function checkAiQuota(req) {
  const ent = entitlementsFor(currentUser(req));
  if (ent.aiMonthly) { const used = usedThisMonth(usageKey(req)); return { allowed: used < ent.aiMonthly, used, limit: ent.aiMonthly, period: 'month' }; }
  const used = usedToday(usageKey(req));
  const limit = freeDaily();
  if (ent.packages.length) {
    const pool = ent.packages.reduce((s, p) => s + p.answers, 0);
    const since = usedSince(usageKey(req), dayOf(Math.min(...ent.packages.map((p) => p.startsAt))));
    if (since < pool) return { allowed: true, used: since, limit: pool, period: 'package' };
  }
  return { allowed: used < limit, used, limit, period: 'day' };
}

/** Count one successful AI call for this person (or IP when signed out). */
export function recordAiUsage(req) {
  db().prepare(`INSERT INTO ai_usage (usage_key, day, count) VALUES (?, ?, 1)
    ON CONFLICT(usage_key, day) DO UPDATE SET count = count + 1`).run(usageKey(req), today());
}

// ---- gateways ----

const razorpayConfigured = () => !!(env('RAZORPAY_KEY_ID') && env('RAZORPAY_KEY_SECRET'));
const razorpayAuth = () => `Basic ${Buffer.from(`${env('RAZORPAY_KEY_ID')}:${env('RAZORPAY_KEY_SECRET')}`).toString('base64')}`;

/** Returns true the first time an event id is seen (duplicate callbacks and retries are ignored). */
function firstDelivery(gateway, id, type) {
  if (!id) return true; // no id supplied: rely on idempotent state transitions below
  const r = db().prepare('INSERT OR IGNORE INTO webhook_events (id, gateway, type, received_at) VALUES (?, ?, ?, ?)').run(`${gateway}:${id}`, gateway, type || null, now());
  return r.changes === 1;
}

/** Apply a captured payment to a subscription or a store order identified by the Razorpay order id. Idempotent. */
function applyRazorpayPayment(orderId, paymentId) {
  const sub = orderId && db().prepare("SELECT * FROM subscriptions WHERE gateway = 'razorpay' AND gateway_ref = ?").get(orderId);
  if (sub) { if (sub.status === 'pending' || sub.status === 'failed') activate({ ...sub, status: 'pending' }, { paymentRef: paymentId }); return 'subscription'; }
  try {
    const r = db().prepare("UPDATE store_orders SET status = 'paid', razorpay_payment_id = ?, updated_at = ? WHERE razorpay_order_id = ? AND status = 'awaiting_payment'").run(paymentId, now(), orderId);
    if (r.changes) return 'order';
  } catch { /* store tables not created on this instance */ }
  return null;
}

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

/** Stripe Checkout for AED or USD (amount in fils / cents; Stripe takes the lower-case ISO code). */
async function createStripeSession({ subId, plan, currency, amountMinor, publicUrl, country = null }) {
  if (currency !== 'AED' && currency !== 'USD') throw new Error(`Stripe is used only for AED and USD, not ${currency}`);
  const form = new URLSearchParams({
    mode: 'payment',
    'line_items[0][price_data][currency]': currency.toLowerCase(),
    'line_items[0][price_data][unit_amount]': String(amountMinor),
    'line_items[0][price_data][product_data][name]': `${BRAND.name} ${plan.name.en}`,
    'line_items[0][quantity]': '1',
    success_url: `${publicUrl}/#billing-success`,
    cancel_url: `${publicUrl}/#billing-cancel`,
    client_reference_id: subId,
    'metadata[subscription_id]': subId,
    'metadata[currency]': currency,
    ...(country ? { 'metadata[country]': country } : {}),
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

// Named, role-based admin tokens with lock-out (server/admin.js).
const requireAdmin = adminRole('finance');

const handle = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (err) {
    if (err instanceof Invalid) return res.status(400).json({ error: err.message });
    next(err);
  }
};

const body = (req) => (req.body && typeof req.body === 'object' && !Array.isArray(req.body) && !Buffer.isBuffer(req.body) ? req.body : {});
const paidPlan = (id) => (PAID.includes(id) ? PLAN.get(id) : fail(`plan must be one of: ${PAID.join(', ')}`)); // aliases → the current plan
const buyablePlan = (id) => (BUYABLE.includes(id) ? PLAN.get(id) : fail(`plan must be one of: ${BUYABLE.join(', ')}`));
const SCOPE_ID = /^[\w.:+-]{1,130}$/;
/** The scope a package is bought for: {pairId} for the Marriage package, {journeyId} for the Journey package. */
function scopeFor(plan, raw) {
  if (plan.kind !== 'package') return null;
  const s = raw && typeof raw === 'object' ? raw : {};
  const key = plan.scopeKind === 'pair' ? 'pairId' : 'journeyId';
  const v = s[key];
  if (typeof v !== 'string' || !SCOPE_ID.test(v) || (key === 'pairId' && !/^[^+]+\+[^+]+$/.test(v))) {
    fail(key === 'pairId' ? 'Choose the couple this package is for (scope.pairId)' : 'Choose the saved journey this package is for (scope.journeyId)');
  }
  return { [key]: v };
}
const given = (v) => v !== undefined && v !== null && v !== '';
const currencyOf = (v, dflt) => {
  const c = given(v) ? String(v).toUpperCase() : dflt;
  return CURRENCIES.includes(c) ? c : fail(`currency must be one of: ${CURRENCIES.join(', ')}`);
};
/** A two-letter ISO country code that exists in shared/countries.js, upper-cased; 400 otherwise. */
const countryOf = (v) => {
  const c = String(v).trim().toUpperCase();
  return /^[A-Z]{2}$/.test(c) && countryByCode(c) ? c : fail('country must be a two-letter ISO country code (e.g. IN, AE, US)');
};
/** Country of the account's phone number (+91 → IN, +971 → AE), or null. */
const phoneCountry = (user) => parseE164(user?.phone)?.country?.cc || null;

/**
 * The country and currency a payment is priced in, decided on the server. The country is the residence country the
 * app sends (`country`), else the account phone's country, else India. The currency always follows the country
 * (IN → INR, AE → AED, other → USD); a `currency` the client also sends must match it, or the request is refused —
 * to pay in another currency the person changes their residence in the app first.
 */
function pricing({ country, currency }, user = null, dfltCountry = 'IN') {
  const cc = given(country) ? countryOf(country) : phoneCountry(user) || dfltCountry;
  const cur = payCurrencyFor(cc);
  if (given(currency)) {
    const asked = currencyOf(currency);
    if (asked !== cur) fail(`Prices for ${countryByCode(cc)?.en || cc} are in ${cur}, not ${asked}. Change your country of residence to pay in another currency.`);
  }
  return { country: cc, currency: cur };
}

// ---- router ----

export function billingRouter() {
  const r = express.Router();

  // ?country=AE → that country's currency (a ?currency= sent with it must match). ?currency= alone lists one of the
  // three for display. Neither → the signed-in account's phone country, else India.
  r.get('/billing/plans', handle((req, res) => {
    const q = req.query || {};
    const { country, currency } = given(q.country) || !given(q.currency) ? pricing(q, currentUser(req)) : { country: null, currency: currencyOf(q.currency) };
    res.json({ country, currency, gateway: payGateway(currency), currencies: CURRENCIES, testPrices: true, terms: PLAN_TERMS, plans: PLANS.map((p) => ({ ...p, currency, amount: p.price[currency], display: formatPrice(p.price[currency], currency) })) });
  }));

  r.get('/billing/me', (req, res) => {
    const user = currentUser(req);
    // Optional automatic trial (TRIAL_HOURS): granted once, to a signed-in user who never had a subscription.
    const trialHours = Number(env('TRIAL_HOURS'));
    if (user && trialHours > 0 && !db().prepare("SELECT 1 FROM subscriptions WHERE user_id = ? AND status IN ('active', 'expired') LIMIT 1").get(user.id)) {
      grantComplimentary(user.id, 'personal_month', 'trial', Math.min(trialHours, 8760) * 3600000);
    }
    const sub = activeSub(user?.id);
    const quota = checkAiQuota(req);
    // locked: had paid/gift/trial access that has now lapsed (expiry is enforced via activeSub).
    const lapsed = !sub && !!user && !!db().prepare(`SELECT 1 FROM subscriptions WHERE user_id = ? AND status = 'expired' AND plan NOT IN (${PKG_SQL}) LIMIT 1`).get(user.id);
    // Receipt line for the Plans screen: the latest real payment, in the currency it was charged in.
    const last = user && db().prepare("SELECT plan, status, currency, amount_minor, starts_at, created_at FROM subscriptions WHERE user_id = ? AND amount_minor > 0 AND status IN ('active', 'expired', 'refunded') ORDER BY COALESCE(starts_at, created_at) DESC LIMIT 1").get(user.id);
    res.json({
      plan: sub ? canonicalPlan(sub.plan) : 'free', status: sub ? sub.status : 'active', expiresAt: sub ? sub.expires_at : null,
      lastPayment: last ? { plan: canonicalPlan(last.plan), status: last.status, currency: last.currency, amount: last.amount_minor / 100, display: formatPrice(last.amount_minor / 100, last.currency), paidAt: last.starts_at || last.created_at } : null,
      trialEndsAt: sub && ['gift', 'trial'].includes(sub.gateway) ? sub.expires_at : null, locked: lapsed, enforced: billingEnforced(),
      entitlements: entitlementsFor(user), aiUsedToday: quota.period === 'day' ? quota.used : null, aiUsedThisMonth: quota.period === 'month' ? quota.used : null, aiUsedPackage: quota.period === 'package' ? quota.used : null, aiLimit: quota.limit, aiPeriod: quota.period, aiFreeDaily: freeDaily(),
    });
  });

  r.post('/billing/checkout', requireUser, handle(async (req, res) => {
    const b = body(req);
    const plan = buyablePlan(b.plan);
    const scope = scopeFor(plan, b.scope);
    const { country, currency } = pricing(b, req.user); // server-side: country → currency → price; never a client price
    const amount = minor(plan, currency);
    const id = crypto.randomUUID();
    let out = { subscriptionId: id, gateway: null, status: 'payment_setup_pending' };
    let gateway = null, ref = null;
    try {
      // Razorpay takes INR only; Stripe takes AED and USD only.
      if (payGateway(currency) === 'razorpay' && razorpayConfigured()) {
        const rz = await createRazorpayOrder(amount, id);
        gateway = 'razorpay'; ref = rz.id;
        out = { subscriptionId: id, gateway, keyId: env('RAZORPAY_KEY_ID'), razorpayOrderId: rz.id, amount, currency };
      } else if (payGateway(currency) === 'stripe' && env('STRIPE_SECRET_KEY')) {
        const publicUrl = (env('PUBLIC_URL') || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '');
        const s = await createStripeSession({ subId: id, plan, currency, amountMinor: amount, publicUrl, country });
        gateway = 'stripe'; ref = s.id;
        out = { subscriptionId: id, gateway, url: s.url };
      }
    } catch (err) {
      console.error('Billing checkout failed:', err.message);
      return res.status(502).json({ error: 'Payment gateway is unavailable right now. Please try again.' });
    }
    db().prepare(`INSERT INTO subscriptions (id, user_id, plan, status, currency, amount_minor, gateway, gateway_ref, created_at, scope, country)
      VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?)`).run(id, req.user.id, plan.id, currency, amount, gateway, ref, now(), scope ? JSON.stringify(scope) : null, country);
    if (!gateway) out = { ...out, currency, amount };
    res.json(scope ? { ...out, scope } : out);
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
    if (!firstDelivery('stripe', event?.id, event?.type)) return res.json({ received: true, duplicate: true });
    if (event?.type === 'checkout.session.completed') {
      const session = event.data?.object || {};
      const subId = session.metadata?.subscription_id || session.client_reference_id;
      const sub = subId && db().prepare("SELECT * FROM subscriptions WHERE id = ? AND gateway = 'stripe'").get(String(subId));
      // The session must have charged the currency and amount this subscription was priced at (AED fils / USD cents).
      const sameMoney = sub && (!session.currency || String(session.currency).toUpperCase() === sub.currency)
        && (session.amount_total === undefined || session.amount_total === null || Number(session.amount_total) === Number(sub.amount_minor));
      if (sub && !sameMoney) console.error(`Stripe session ${session.id} does not match subscription ${sub.id} (${session.amount_total} ${session.currency})`);
      else if (sub && (sub.status === 'pending' || sub.status === 'active')) activate(sub, { paymentRef: session.payment_intent || session.id || null });
    } else if (event?.type === 'charge.refunded') {
      // Refund made in the Stripe dashboard (or by /admin/billing/refund): a full refund revokes the plan.
      const ch = event.data?.object || {};
      const sub = ch.payment_intent && db().prepare("SELECT * FROM subscriptions WHERE gateway = 'stripe' AND payment_ref = ?").get(String(ch.payment_intent));
      if (sub && sub.status !== 'refunded' && String(ch.currency || '').toUpperCase() === sub.currency && Number(ch.amount_refunded) >= Number(sub.amount_minor)) {
        db().prepare("UPDATE subscriptions SET status = 'refunded', expires_at = ? WHERE id = ?").run(now(), sub.id);
        audit(null, 'billing.refund.webhook', sub.id, { amount: ch.amount_refunded, currency: sub.currency });
      }
    }
    res.json({ received: true });
  });

  // Razorpay webhook (raw body; configure in the Razorpay dashboard with RAZORPAY_WEBHOOK_SECRET).
  // Events: payment.captured / order.paid → activate; payment.failed → mark failed; refund.processed → revoke.
  // This is the source of truth when the phone closes before /billing/verify runs.
  r.post('/billing/razorpay/webhook', (req, res) => {
    const secret = env('RAZORPAY_WEBHOOK_SECRET');
    if (!secret) return res.status(503).json({ error: 'Razorpay webhook is not configured' });
    const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');
    if (!safeEqual(req.get('x-razorpay-signature') || '', expected)) return res.status(400).json({ error: 'Invalid signature' });
    let event;
    try { event = JSON.parse(raw.toString('utf8')); } catch { return res.status(400).json({ error: 'Invalid payload' }); }
    if (!firstDelivery('razorpay', req.get('x-razorpay-event-id'), event?.event)) return res.json({ received: true, duplicate: true });
    const pay = event?.payload?.payment?.entity || {};
    const orderId = pay.order_id || event?.payload?.order?.entity?.id;
    if (event.event === 'payment.captured' || event.event === 'order.paid') applyRazorpayPayment(orderId, pay.id || null);
    else if (event.event === 'payment.failed' && orderId) {
      db().prepare("UPDATE subscriptions SET status = 'failed' WHERE gateway = 'razorpay' AND gateway_ref = ? AND status = 'pending'").run(orderId);
      try { db().prepare("UPDATE store_orders SET status = 'payment_failed', updated_at = ? WHERE razorpay_order_id = ? AND status = 'awaiting_payment'").run(now(), orderId); } catch { /* no store */ }
    } else if (event.event === 'refund.processed' || event.event === 'refund.created') {
      const rf = event?.payload?.refund?.entity || {};
      const sub = rf.payment_id && db().prepare("SELECT * FROM subscriptions WHERE payment_ref = ?").get(rf.payment_id);
      if (sub && sub.status !== 'refunded' && Number(rf.amount) >= Number(sub.amount_minor)) {
        db().prepare("UPDATE subscriptions SET status = 'refunded', expires_at = ? WHERE id = ?").run(now(), sub.id);
        audit(null, 'billing.refund.webhook', sub.id, { amount: rf.amount });
      }
      try {
        if (rf.payment_id) {
          const r = db().prepare("UPDATE store_orders SET status = 'refunded', updated_at = ? WHERE razorpay_payment_id = ? AND status != 'refunded'").run(now(), rf.payment_id);
          if (r.changes) {
            db().prepare("UPDATE order_refund_requests SET status = 'refunded', resolved_at = ? WHERE status IN ('open', 'refund_pending') AND order_id IN (SELECT id FROM store_orders WHERE razorpay_payment_id = ?)").run(now(), rf.payment_id);
            audit(null, 'order.refund.webhook', rf.payment_id, { amount: rf.amount });
          }
        }
      } catch { /* no store tables on this instance */ }
    }
    res.json({ received: true });
  });

  // Restore purchases: re-check pending Razorpay payments with the gateway (e.g. after a crash or a new phone).
  r.post('/billing/restore', requireUser, handle(async (req, res) => {
    let restored = 0;
    if (razorpayConfigured()) {
      const pending = db().prepare("SELECT * FROM subscriptions WHERE user_id = ? AND gateway = 'razorpay' AND status IN ('pending', 'failed') AND created_at > ?").all(req.user.id, now() - 30 * DAY);
      for (const sub of pending) {
        try {
          const r2 = await billingFetch(`https://api.razorpay.com/v1/orders/${encodeURIComponent(sub.gateway_ref)}/payments`, { headers: { Authorization: razorpayAuth() } });
          const items = (await r2.json().catch(() => ({}))).items || [];
          const paid = items.find((x) => x.status === 'captured');
          if (paid) { applyRazorpayPayment(sub.gateway_ref, paid.id); restored += 1; }
        } catch (err) { console.error('restore check failed:', err.message); }
      }
    }
    const sub = activeSub(req.user.id);
    res.json({ restored, plan: sub ? canonicalPlan(sub.plan) : 'free', expiresAt: sub ? sub.expires_at : null });
  }));

  // Admin refund (finance role): refunds through the gateway that took the payment — Razorpay (INR) or Stripe
  // (AED / USD, in the original currency) — revokes access on a full refund and writes an audit record.
  r.post('/admin/billing/refund', requireAdmin, handle(async (req, res) => {
    const b = body(req);
    const sub = typeof b.subscriptionId === 'string' && db().prepare('SELECT * FROM subscriptions WHERE id = ?').get(b.subscriptionId);
    if (!sub) return res.status(404).json({ error: 'Subscription not found' });
    if (sub.status === 'refunded') return res.json({ subscription: subOut(sub, true), already: true });
    const viaStripe = sub.gateway === 'stripe' && !!sub.payment_ref && !!env('STRIPE_SECRET_KEY');
    if (!(sub.gateway === 'razorpay' && sub.payment_ref) && !viaStripe) return res.status(400).json({ error: 'Only captured Razorpay or Stripe payments can be refunded here.' });
    const amount = b.amountMinor === undefined ? sub.amount_minor : Number(b.amountMinor);
    if (!Number.isInteger(amount) || amount < 1 || amount > sub.amount_minor) fail('amountMinor must be between 1 and the amount paid');
    const r2 = viaStripe
      ? await billingFetch(STRIPE_REFUNDS, {
        method: 'POST', headers: { Authorization: `Bearer ${env('STRIPE_SECRET_KEY')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ payment_intent: sub.payment_ref, amount: String(amount), 'metadata[subscription_id]': sub.id }).toString(),
      })
      : await billingFetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(sub.payment_ref)}/refund`, {
        method: 'POST', headers: { Authorization: razorpayAuth(), 'Content-Type': 'application/json' }, body: JSON.stringify({ amount, notes: { subscription: sub.id } }),
      });
    const out = await r2.json().catch(() => ({}));
    if (!r2.ok) return res.status(502).json({ error: `${viaStripe ? 'Stripe' : 'Razorpay'} refund failed (${r2.status})` });
    if (amount >= sub.amount_minor) db().prepare("UPDATE subscriptions SET status = 'refunded', expires_at = ? WHERE id = ?").run(now(), sub.id);
    audit(req, 'billing.refund', sub.id, { amount, currency: sub.currency, gateway: sub.gateway, refundId: out.id || null });
    res.json({ subscription: subOut(db().prepare('SELECT * FROM subscriptions WHERE id = ?').get(sub.id), true), refundId: out.id || null });
  }));

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
    audit(req, 'billing.grant', b.userId, { plan: plan.id, days, subscriptionId: id });
    res.status(201).json({ subscription: subOut(sub, true) });
  }));

  r.get('/admin/billing/subscriptions', requireAdmin, (_req, res) => {
    const rows = db().prepare('SELECT * FROM subscriptions ORDER BY created_at DESC').all();
    res.json({ subscriptions: rows.map((s) => subOut(s, true)) });
  });

  return r;
}
