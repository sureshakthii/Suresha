// One-time packages (Marriage / Journey), plan gates under BILLING_ENFORCE, the family-profile backup limit and the
// optional value summary.
import { test, before, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

process.env.DB_PATH = ':memory:';
process.env.AUTH_DEV_MODE = '1';
process.env.AUTH_SECRET = 't';
process.env.ADMIN_TOKEN = 'admin-test';
process.env.RAZORPAY_KEY_ID = 'rzp_test_key';
process.env.RAZORPAY_KEY_SECRET = 'rzp_secret';
process.env.RAZORPAY_WEBHOOK_SECRET = 'whsec_pkg';
const SCOPED_ENV = ['BILLING_ENFORCE', 'AI_FREE_DAILY', 'PACKAGE_MARRIAGE_ANSWERS'];
for (const k of [...SCOPED_ENV, 'STRIPE_SECRET_KEY', 'ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN', 'AI_REQUIRE_LOGIN', 'TWILIO_ACCOUNT_SID', 'MSG91_AUTH_KEY', 'SMTP_URL', 'TRIAL_HOURS']) delete process.env[k];

const DAY = 86400000;
let server, base, billing, gates, n = 0;
before(async () => {
  billing = await import('../server/billing.js');
  gates = await import('../shared/plan-gates.js');
  billing.setBillingFetch(async (url, opts) => {
    if (String(url).endsWith('/v1/orders')) return new Response(JSON.stringify({ id: `order_${++n}`, amount: JSON.parse(opts.body).amount }), { status: 200 });
    return new Response('{}', { status: 404 });
  });
  const { createApp } = await import('../server/index.js');
  server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => { billing.setBillingClock(null); server.close(); });
afterEach(() => { for (const k of SCOPED_ENV) delete process.env[k]; billing.setBillingClock(null); });

const req = (method, path, body, headers = {}) => fetch(base + path, {
  method, headers: { 'Content-Type': 'application/json', ...headers }, body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
});
const as = (cookie) => ({ Cookie: cookie });
let phone = 9876501100;
async function login(name) {
  const to = String(++phone);
  const r = await (await req('POST', '/api/auth/otp/request', { channel: 'sms', to })).json();
  const res = await req('POST', '/api/auth/otp/verify', { channel: 'sms', to, code: r.devCode, name });
  return res.headers.getSetCookie().find((s) => s.startsWith('kj_session=')).split(';')[0];
}
const me = async (cookie) => (await req('GET', '/api/billing/me', undefined, as(cookie))).json();
const sig = (oid, pid) => crypto.createHmac('sha256', 'rzp_secret').update(`${oid}|${pid}`).digest('hex');
async function buy(cookie, plan, scope) {
  const co = await (await req('POST', '/api/billing/checkout', { plan, currency: 'INR', ...(scope ? { scope } : {}) }, as(cookie))).json();
  const pid = `pay_${co.razorpayOrderId}`;
  const v = await req('POST', '/api/billing/verify', { subscriptionId: co.subscriptionId, razorpay_order_id: co.razorpayOrderId, razorpay_payment_id: pid, razorpay_signature: sig(co.razorpayOrderId, pid) }, as(cookie));
  assert.equal(v.status, 200);
  return { co, pid, sub: (await v.json()).subscription };
}
const PAIR = 'abc123+def456';

test('plans list both one-time packages: kind package, no interval, initial test prices, fixed days', async () => {
  const p = await (await req('GET', '/api/billing/plans')).json();
  const m = p.plans.find((x) => x.id === 'marriage_package');
  const j = p.plans.find((x) => x.id === 'journey_package');
  assert.deepEqual([m.kind, m.interval, m.durationDays, m.scopeKind, m.amount, m.answers], ['package', null, 90, 'pair', 499, 30]);
  assert.deepEqual([j.kind, j.interval, j.durationDays, j.scopeKind, j.amount, j.answers], ['package', null, 60, 'journey', 299, 15]);
  assert.match(m.name.ta, /திருமணத் தொகுப்பு/);
  assert.match(j.name.ta, /யாத்திரைத் தொகுப்பு/);
  assert.ok(m.features.some((f) => /no subscription/i.test(f.en)));
  assert.equal((await (await req('GET', '/api/billing/plans?currency=USD')).json()).plans.find((x) => x.id === 'marriage_package').amount, 9);
  assert.ok(p.terms.packages.en.includes('7 days'));
  // Prices are configurable without code changes.
  const out = execFileSync(process.execPath, ['--no-warnings', '-e', "import('./server/billing.js').then((b) => console.log(b.PLANS.find((x) => x.id === 'marriage_package').price.INR, b.PLANS.find((x) => x.id === 'journey_package').price.USD))"],
    { env: { ...process.env, PRICE_INR_MARRIAGE_PACKAGE: '599', PRICE_USD_JOURNEY_PACKAGE: '7' }, encoding: 'utf8' });
  assert.equal(out.trim(), '599 7');
  // Gift codes, trials and referrals never hand out a package.
  assert.ok(!billing.PAID_PLAN_IDS.includes('marriage_package'));
  assert.throws(() => billing.grantComplimentary('u', 'marriage_package', 'gift', DAY), /Not a paid plan/);
});

test('package checkout needs the scope it is for', async () => {
  const u = await login('Kamala');
  assert.equal((await req('POST', '/api/billing/checkout', { plan: 'marriage_package' }, as(u))).status, 400);
  assert.equal((await req('POST', '/api/billing/checkout', { plan: 'marriage_package', scope: { pairId: 'only-one' } }, as(u))).status, 400);
  assert.equal((await req('POST', '/api/billing/checkout', { plan: 'journey_package', scope: { pairId: PAIR } }, as(u))).status, 400);
  assert.equal((await req('POST', '/api/billing/checkout', { plan: 'journey_package', scope: { journeyId: '<script>' } }, as(u))).status, 400);
  const ok = await (await req('POST', '/api/billing/checkout', { plan: 'journey_package', scope: { journeyId: 'trip_1' } }, as(u))).json();
  assert.deepEqual(ok.scope, { journeyId: 'trip_1' });
  assert.equal(ok.amount, 29900);
});

test('marriage package: scoped entitlements only, 90 days, never a subscription; expiry ends it', async () => {
  const u = await login('Meena');
  const t0 = Date.now();
  const { sub } = await buy(u, 'marriage_package', { pairId: PAIR });
  assert.deepEqual(sub.scope, { pairId: PAIR });
  assert.ok(Math.abs(sub.expiresAt - (t0 + 90 * DAY)) < 60000);
  const m = await me(u);
  assert.equal(m.plan, 'free', 'a package is not a subscription');
  assert.equal(m.locked, false);
  const e = m.entitlements;
  assert.deepEqual(e.matchingPairs, [PAIR]);
  assert.deepEqual(e.journeyIds, []);
  assert.equal(e.predictions, false);
  assert.equal(e.printReports, false);
  assert.equal(e.packages.length, 1);
  assert.equal(e.packages[0].answers, 30);
  // Scope: this couple gets the full report and print; another couple does not.
  assert.ok(gates.gateAllows(e, true, 'matchingReport', { scope: { pairId: PAIR } }));
  assert.ok(gates.gateAllows(e, true, 'printReports', { scope: { pairId: PAIR } }));
  assert.ok(!gates.gateAllows(e, true, 'matchingReport', { scope: { pairId: 'x+y' } }));
  assert.ok(!gates.gateAllows(e, true, 'printReports', {}));
  // Day 91: over, and "your trial has ended" is not shown for a finished package.
  billing.setBillingClock(() => t0 + 91 * DAY);
  const later = await me(u);
  assert.deepEqual(later.entitlements.packages, []);
  assert.deepEqual(later.entitlements.matchingPairs, []);
  assert.equal(later.locked, false);
});

test('journey package: 60 days for one journey; a package bought during a subscription keeps its own term', async () => {
  const u = await login('Sundar');
  const g = await req('POST', '/api/admin/billing/grant', { userId: (await (await req('GET', '/api/auth/me', undefined, as(u))).json()).user.id, plan: 'personal_year', days: 365 }, { 'x-admin-token': 'admin-test' });
  assert.equal(g.status, 201);
  const t0 = Date.now();
  const { sub } = await buy(u, 'journey_package', { journeyId: 'trip_abc' });
  assert.ok(Math.abs(sub.expiresAt - (t0 + 60 * DAY)) < 60000, 'not stacked after the yearly plan');
  const m = await me(u);
  assert.equal(m.plan, 'personal_year');
  assert.deepEqual(m.entitlements.journeyIds, ['trip_abc']);
  assert.equal(m.entitlements.printReports, true);
  assert.equal(m.aiPeriod, 'month', 'the subscription allowance applies');
});

test('refund (webhook) revokes a package like a plan', async () => {
  const u = await login('Revathi');
  const { pid } = await buy(u, 'journey_package', { journeyId: 'trip_r' });
  assert.deepEqual((await me(u)).entitlements.journeyIds, ['trip_r']);
  const raw = JSON.stringify({ event: 'refund.processed', payload: { refund: { entity: { id: 'rfnd_1', payment_id: pid, amount: 29900 } } } });
  const r = await req('POST', '/api/billing/razorpay/webhook', raw, { 'x-razorpay-signature': crypto.createHmac('sha256', 'whsec_pkg').update(raw).digest('hex'), 'x-razorpay-event-id': 'evt_pkg_refund' });
  assert.equal(r.status, 200);
  const m = await me(u);
  assert.deepEqual(m.entitlements.packages, []);
  assert.deepEqual(m.entitlements.journeyIds, []);
});

test('package detailed answers under BILLING_ENFORCE: the pool first, then the free daily allowance', async () => {
  const u = await login('Lalitha');
  await buy(u, 'marriage_package', { pairId: PAIR });
  process.env.BILLING_ENFORCE = '1';
  process.env.AI_FREE_DAILY = '1';
  process.env.PACKAGE_MARRIAGE_ANSWERS = '3';
  const ask = () => req('POST', '/api/ai/chat', { context: { a: 1 }, messages: [{ role: 'user', content: 'Hi' }], fallbackText: 'fallback' }, as(u));
  for (let i = 0; i < 3; i++) assert.equal((await ask()).status, 200, `answer ${i + 1}`);
  // The pool (3) is used up and today's free answer (1) was already counted among them.
  assert.equal((await ask()).status, 402);
  const m = await me(u);
  assert.equal(m.aiPeriod, 'day');
});

test('gating matrix under BILLING_ENFORCE (and everything open without it)', () => {
  const { gateAllows, FREE_LIMITS } = gates;
  const ent = (extra = {}) => ({ predictions: false, familyProfiles: 1, goalsMax: 1, shortlistMax: 10, journeysMax: 1, printReports: false, familyCollab: false, sharedPlanning: false, matchingPairs: [], journeyIds: [], ...extra });
  const free = ent();
  const personal = ent({ predictions: true, goalsMax: null, shortlistMax: null, journeysMax: null, printReports: true });
  const family = ent({ predictions: true, goalsMax: null, shortlistMax: null, journeysMax: null, printReports: true, familyProfiles: 8, familyCollab: true, sharedPlanning: true });
  assert.deepEqual(FREE_LIMITS, { goals: 1, shortlist: 10, journeys: 1 });
  const rows = [
    // feature, opts, free, personal, family
    ['goals', { count: 0 }, true, true, true],
    ['goals', { count: 1 }, false, true, true],
    ['shortlist', { count: 9 }, true, true, true],
    ['shortlist', { count: 10 }, false, true, true],
    ['journeys', { count: 0 }, true, true, true],
    ['journeys', { count: 1 }, false, true, true],
    ['printReports', {}, false, true, true],
    ['predictions', {}, false, true, true],
    ['matchingReport', {}, false, true, true],
    ['familyProfiles', { count: 1 }, false, false, true],
    ['familyProfiles', { count: 7 }, false, false, true],
    ['familyProfiles', { count: 8 }, false, false, false],
    ['familyCollab', {}, false, false, true],
    ['sharedPlanning', {}, false, false, true],
  ];
  for (const [feature, opts, f, p, fam] of rows) {
    assert.equal(gateAllows(free, true, feature, opts), f, `free ${feature} ${JSON.stringify(opts)}`);
    assert.equal(gateAllows(personal, true, feature, opts), p, `personal ${feature}`);
    assert.equal(gateAllows(family, true, feature, opts), fam, `family ${feature}`);
    assert.equal(gateAllows(free, false, feature, opts), true, `not enforced → open: ${feature}`);
  }
  assert.equal(gateAllows(null, true, 'printReports'), true, 'billing not loaded (static build) → open');
  // A journey package lets that journey be saved and printed even past the free limit.
  const jp = ent({ journeyIds: ['t1'] });
  assert.ok(gateAllows(jp, true, 'journeys', { count: 3, scope: { journeyId: 't1' } }));
  assert.ok(!gateAllows(jp, true, 'journeys', { count: 3, scope: { journeyId: 't2' } }));
  assert.ok(gateAllows(jp, true, 'printReports', { scope: { journeyId: 't1' } }));
  // Every gate explains exactly what payment adds, in both languages.
  for (const [k, g] of Object.entries(gates.GATE_ADDS)) assert.ok(g.adds.length && g.adds.every((a) => a.en && /[஀-௿]/.test(a.ta)), k);
  // A couple's id is order-independent and never carries names in clear.
  const a = { member: { id: 'm1', name: 'Priya' } }, b = { id: 'm2', name: 'Arun' };
  assert.equal(gates.pairKey(a, b), gates.pairKey(b, a));
  assert.ok(!/Priya|Arun|m1|m2/.test(gates.pairKey(a, b)));
});

test('free tier keeps baby-name browsing, meanings and star letters; only a shortlist past 10 is gated', async () => {
  const free = (await (await req('GET', '/api/billing/plans')).json()).plans.find((p) => p.id === 'free');
  assert.ok(free.features.some((f) => /Baby names: browsing, meanings and star-letter/.test(f.en) && !f.soon));
  const src = fs.readFileSync(new URL('../public/screens-names.js', import.meta.url), 'utf8');
  const gatesUsed = [...src.matchAll(/(?:gate|isLocked)\(\s*'([^']+)'/g)].map((m) => m[1]);
  assert.deepEqual(gatesUsed, ['shortlist'], 'no other gate on the names screen');
  assert.ok(!src.includes('lockCard('), 'no paywall card on browsing');
  assert.ok(!('names' in gates.GATE_ADDS) && !('babyNames' in gates.GATE_ADDS));
});

test('family-profile limit on the account backup (server-enforced only under BILLING_ENFORCE)', async () => {
  const u = await login('Valli');
  const fam = [{ id: 'p1', name: 'A' }, { id: 'p2', name: 'B' }, { id: 'p3', name: 'C' }];
  const put = async () => (await req('PUT', '/api/me/data', { data: { family: fam, activeId: 'p2', ancestors: [] } }, as(u))).json();
  const get = async () => (await (await req('GET', '/api/me/data', undefined, as(u))).json()).data;
  assert.equal((await put()).familyLimit, undefined);
  assert.equal((await get()).family.length, 3, 'open without BILLING_ENFORCE');
  process.env.BILLING_ENFORCE = '1';
  const r = await put();
  assert.equal(r.ok, true);
  assert.deepEqual(r.familyLimit, { limit: 1, notBackedUp: 2, upgrade: 'family' });
  assert.deepEqual((await get()).family.map((m) => m.id), ['p2'], 'the active profile is the one kept');
  const userId = (await (await req('GET', '/api/auth/me', undefined, as(u))).json()).user.id;
  assert.equal((await req('POST', '/api/admin/billing/grant', { userId, plan: 'family_month', days: 30 }, { 'x-admin-token': 'admin-test' })).status, 201);
  const r2 = await put();
  assert.equal(r2.familyLimit, undefined);
  assert.equal((await get()).family.length, 3, 'Family plan: up to 8');
});

test('value summary: factual counts of completed items only', () => {
  const now = Date.parse('2026-10-07T12:00:00Z');
  const v = gates.valueSummary({
    goals: { goals: [{ status: 'done', steps: [{ done: true }, { done: true }] }, { status: 'active', steps: [{ done: true }, { done: false }] }] },
    taskLog: { porutham: 2, matching_report: 1, weekly_plan: 3, journey: 1, names: 9 },
    week: { savedAt: '2026-10-01' },
    journeys: [{ id: 'a' }, { id: 'b' }],
    nameFavs: ['n1', 'n2', 'n3'],
    reminders: { trips: [{ alarmAt: '2026-10-01T05:30:00Z' }, { alarmAt: '2026-12-01T05:30:00Z' }] },
  }, now);
  assert.deepEqual(v, { goalsCompleted: 1, stepsDone: 3, weeklyPlansSaved: 3, journeysPlanned: 2, matchingReportsPrepared: 3, remindersKept: 1, namesShortlisted: 3 });
  assert.deepEqual(Object.values(gates.valueSummary({}, now)), [0, 0, 0, 0, 0, 0, 0], 'nothing invented on an empty phone');
  const words = JSON.stringify(Object.keys(v)) + fs.readFileSync(new URL('../public/screens-plans.js', import.meta.url), 'utf8').split('"Your Thunai so far"')[1];
  assert.ok(!/saved you|₹\s?\d+ saved|accident|prevent|guarantee/i.test(words), 'no money-saved or accident claims');
});
