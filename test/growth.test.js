import { test, before, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';

process.env.DB_PATH = ':memory:';
process.env.SERVICES_OPEN = '1'; // request intake is off by default (see the SERVICES_OPEN tests in market.test.js)
process.env.AUTH_DEV_MODE = '1';
process.env.AUTH_SECRET = 't';
process.env.ADMIN_TOKEN = 'admin-test';
const GROWTH_ENV = ['TRIAL_HOURS', 'REFERRAL_DAYS', 'PUBLIC_URL', 'BILLING_ENFORCE'];
for (const k of [...GROWTH_ENV, 'RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'STRIPE_SECRET_KEY', 'TWILIO_ACCOUNT_SID', 'MSG91_AUTH_KEY', 'SMTP_URL']) delete process.env[k];

const HOUR = 3600000;
const DAY = 24 * HOUR;
let server, base, growth, anbu, bhavani, chezhian;
before(async () => {
  growth = await import('../server/growth.js');
  const { createApp } = await import('../server/index.js');
  server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
  anbu = await login('9876500101', 'Anbu Selvan');
  bhavani = await login('9876500102', 'Bhavani');
  chezhian = await login('9876500103', 'Chezhian');
});
after(() => server.close());
afterEach(() => {
  for (const k of GROWTH_ENV) delete process.env[k];
  process.env.ADMIN_TOKEN = 'admin-test';
  growth.setGrowthClock(null);
});

const req = (method, path, body, headers = {}) => fetch(base + path, {
  method,
  headers: { 'Content-Type': 'application/json', ...headers },
  body: body === undefined ? undefined : JSON.stringify(body),
});
const as = (cookie) => (cookie ? { Cookie: cookie } : {});
const ADMIN = { 'x-admin-token': 'admin-test' };
const near = (actual, expected, msg) => assert.ok(Math.abs(actual - expected) < 60000, `${msg}: ${actual} vs ${expected}`);

async function login(to, name) {
  const r = await (await req('POST', '/api/auth/otp/request', { channel: 'sms', to })).json();
  const res = await req('POST', '/api/auth/otp/verify', { channel: 'sms', to, code: r.devCode, name });
  assert.equal(res.status, 200);
  return res.headers.getSetCookie().find((s) => s.startsWith('kj_session=')).split(';')[0];
}
const me = async (cookie) => (await req('GET', '/api/billing/me', undefined, as(cookie))).json();
const makeCode = async (b) => {
  const res = await req('POST', '/api/admin/gift-codes', b, ADMIN);
  assert.equal(res.status, 201);
  return (await res.json()).code;
};
const redeem = (cookie, code) => req('POST', '/api/billing/redeem', { code }, as(cookie));

test('gift codes: admin auth, create, redeem → premium with trialEndsAt; 409 / 410 / 404', async () => {
  assert.equal((await req('POST', '/api/admin/gift-codes', { plan: 'premium_month' })).status, 401);
  assert.equal((await req('POST', '/api/admin/gift-codes', { plan: 'premium_month' }, { 'x-admin-token': 'nope' })).status, 403);
  for (const bad of [{ plan: 'free' }, { plan: 'gold' }, { plan: 'premium_month', hours: 0 }, { plan: 'premium_month', hours: 9000 },
    { plan: 'premium_month', maxUses: 1001 }, { plan: 'premium_month', expiresAt: '2001-01-01' }]) {
    assert.equal((await req('POST', '/api/admin/gift-codes', bad, ADMIN)).status, 400, JSON.stringify(bad));
  }
  const code = await makeCode({ plan: 'family_month', hours: 48, note: 'For Amma' });
  assert.match(code, /^KJ-[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/);

  assert.equal((await redeem(undefined, code)).status, 401);
  assert.equal((await redeem(anbu, 'KJ-NOPE-NOPE')).status, 404);
  assert.equal((await me(anbu)).plan, 'free');
  const t0 = Date.now();
  const ok = await redeem(anbu, ` ${code.toLowerCase()} `); // case / whitespace tolerant
  assert.equal(ok.status, 200);
  const out = await ok.json();
  assert.equal(out.subscription.gateway, 'gift');
  assert.equal(out.subscription.plan, 'family_month');
  near(out.expiresAt, t0 + 48 * HOUR, 'gift expiry');
  const m = await me(anbu);
  assert.equal(m.plan, 'family_month');
  assert.equal(m.trialEndsAt, out.expiresAt);
  assert.equal(m.locked, false);
  assert.equal(m.entitlements.familyProfiles, 8);
  assert.equal(m.enforced, false);
  process.env.BILLING_ENFORCE = '1';
  assert.equal((await me(anbu)).enforced, true);
  delete process.env.BILLING_ENFORCE;

  assert.equal((await redeem(anbu, code)).status, 409); // same user twice
  assert.equal((await redeem(bhavani, code)).status, 410); // used up (maxUses 1)

  // A shorter gift never shortens the later expiry
  const short = await makeCode({ plan: 'premium_month', hours: 1 });
  const s = await (await redeem(anbu, short)).json();
  assert.equal(s.expiresAt, out.expiresAt);

  // Expired code → 410
  growth.setGrowthClock(() => Date.now() - 2 * DAY);
  const old = await makeCode({ plan: 'premium_month', expiresAt: new Date(Date.now() - DAY).toISOString() });
  growth.setGrowthClock(null);
  assert.equal((await redeem(bhavani, old)).status, 410);

  const list = (await (await req('GET', '/api/admin/gift-codes', undefined, ADMIN)).json()).giftCodes;
  const row = list.find((g) => g.code === code);
  assert.deepEqual({ uses: row.uses, maxUses: row.maxUses, hours: row.hours, note: row.note }, { uses: 1, maxUses: 1, hours: 48, note: 'For Amma' });
});

test('gift access locks automatically after expiry', async () => {
  const code = await makeCode({ plan: 'premium_month', hours: 2, maxUses: 5 });
  const r = await redeem(bhavani, code);
  assert.equal(r.status, 200);
  assert.equal((await me(bhavani)).plan, 'personal_month');
  growth.setGrowthClock(() => Date.now() + 3 * HOUR);
  const m = await me(bhavani);
  assert.equal(m.plan, 'free');
  assert.equal(m.locked, true);
  assert.equal(m.trialEndsAt, null);
  assert.equal(m.entitlements.unlimitedAi, false);
  growth.setGrowthClock(null);
  assert.equal((await me()).locked, false); // signed out is never "locked"
});

test('TRIAL_HOURS grants a one-time automatic trial on first /billing/me', async () => {
  const dhana = await login('9876500104', 'Dhanalakshmi');
  assert.equal((await me(dhana)).plan, 'free'); // not configured → nothing
  process.env.TRIAL_HOURS = '24';
  const t0 = Date.now();
  const m = await me(dhana);
  assert.equal(m.plan, 'personal_month');
  near(m.trialEndsAt, t0 + 24 * HOUR, 'trial end');
  assert.equal((await me(dhana)).trialEndsAt, m.trialEndsAt); // no second trial
  assert.equal((await me()).plan, 'free'); // signed-out never gets a trial
  growth.setGrowthClock(() => Date.now() + 25 * HOUR);
  const later = await me(dhana);
  assert.equal(later.plan, 'free');
  assert.equal(later.locked, true);
  const subs = (await (await req('GET', '/api/admin/billing/subscriptions', undefined, ADMIN)).json()).subscriptions;
  assert.equal(subs.filter((s) => s.gateway === 'trial').length, 1);
});

test('events: validation', async () => {
  const post = (b) => req('POST', '/api/events', b);
  const ev = [{ type: 'app_open', platform: 'web' }];
  assert.equal((await post({ deviceId: 'short', events: ev })).status, 400);
  assert.equal((await post({ deviceId: 'bad id with spaces', events: ev })).status, 400);
  assert.equal((await post({ deviceId: 'dev-valid-01', events: [] })).status, 400);
  assert.equal((await post({ deviceId: 'dev-valid-01', events: Array(51).fill(ev[0]) })).status, 400);
  assert.equal((await post({ deviceId: 'dev-valid-01', events: [{ type: 'hack' }] })).status, 400);
  assert.equal((await post({ deviceId: 'dev-valid-01', events: [{ type: 'app_open', platform: 'windows' }] })).status, 400);
  assert.equal((await post({ deviceId: 'dev-valid-01', events: [{ type: 'screen_view', screen: 'x'.repeat(61) }] })).status, 400);
  assert.equal((await post({ deviceId: 'dev-valid-01', events: [{ type: 'app_open', appVersion: '1.0; drop' }] })).status, 400);
});

test('events ingest → admin stats by platform, daily and top lists', async () => {
  const post = (deviceId, events, cookie) => req('POST', '/api/events', { deviceId, events }, as(cookie));
  // A device first seen two days ago
  growth.setGrowthClock(() => Date.now() - 2 * DAY);
  assert.equal((await post('device-old-0001', [{ type: 'first_open', platform: 'android' }, { type: 'install', platform: 'android' }])).status, 200);
  growth.setGrowthClock(null);
  const ok = await post('device-and-0002', [
    { type: 'first_open', platform: 'android', appVersion: '1.2.0' }, { type: 'install', platform: 'android' },
    { type: 'screen_view', screen: 'home', platform: 'android' }, { type: 'screen_view', screen: 'porutham', platform: 'android' },
    { type: 'feature', feature: 'ai_chat', platform: 'android' },
  ], anbu);
  assert.equal(ok.status, 200);
  assert.deepEqual(await ok.json(), { ok: true });
  await post('device-ios-0003', [{ type: 'app_open', platform: 'ios' }, { type: 'screen_view', screen: 'home', platform: 'ios' }, { type: 'feature', feature: 'ai_chat' }]);
  await post('device-pwa-0004', [{ type: 'app_open', platform: 'pwa' }, { type: 'install', platform: 'pwa' }, { type: 'screen_view', screen: 'home', platform: 'pwa' }]);
  await post('device-web-0005', [{ type: 'app_open', platform: 'web' }, { type: 'feature', feature: 'muhurtham', platform: 'web' }]);
  await post('device-hua-0006', [{ type: 'app_open', platform: 'huawei' }]);

  assert.equal((await req('GET', '/api/admin/stats')).status, 401);
  assert.equal((await req('GET', '/api/admin/stats?days=0', undefined, ADMIN)).status, 400);
  const s = await (await req('GET', '/api/admin/stats?days=7', undefined, ADMIN)).json();
  assert.equal(s.totals.devices, 6);
  assert.equal(s.totals.installs, 3);
  assert.equal(s.totals.activeToday, 5);
  assert.equal(s.totals.active7, 6);
  assert.equal(s.totals.active30, 6);
  assert.ok(s.totals.users >= 4);
  assert.deepEqual(s.totals.revenueByCurrency, { INR: 0, USD: 0 }); // gift / trial excluded
  assert.equal(s.totals.payingUsers, 0);
  assert.deepEqual(s.byPlatform, { android: 2, ios: 1, huawei: 1, pwa: 1, web: 1 });
  assert.equal(s.daily.length, 7);
  const today = s.daily.at(-1), twoAgo = s.daily.at(-3);
  assert.deepEqual({ opens: today.opens, newDevices: today.newDevices, installs: today.installs }, { opens: 5, newDevices: 5, installs: 2 });
  assert.deepEqual({ opens: twoAgo.opens, newDevices: twoAgo.newDevices, installs: twoAgo.installs }, { opens: 1, newDevices: 1, installs: 1 });
  assert.ok(today.signups >= 4);
  assert.match(today.date, /^\d{4}-\d{2}-\d{2}$/);
  assert.deepEqual(s.topScreens[0], { screen: 'home', views: 3 });
  assert.deepEqual(s.topFeatures, [{ feature: 'ai_chat', uses: 2 }, { feature: 'muhurtham', uses: 1 }]);
});

test('feedback → admin approval → testimonials; avgRating; rate limit', async () => {
  assert.equal((await req('POST', '/api/feedback', { deviceId: 'device-fb-0001', rating: 6 })).status, 400);
  assert.equal((await req('POST', '/api/feedback', { deviceId: 'device-fb-0001', rating: 5, comment: 'x'.repeat(1001) })).status, 400);
  assert.equal((await req('POST', '/api/feedback', { deviceId: 'x', rating: 5 })).status, 400);
  const ok = await req('POST', '/api/feedback', { deviceId: 'device-fb-0001', rating: 5, comment: 'மிகவும் அருமை!', screen: 'home' }, as(anbu));
  assert.equal(ok.status, 200);
  assert.deepEqual(await ok.json(), { ok: true, type: 'feedback' });
  await req('POST', '/api/feedback', { deviceId: 'device-fb-0002', rating: 3, comment: 'Good' });
  await req('POST', '/api/feedback', { deviceId: 'device-fb-0003', rating: 4 });

  assert.deepEqual((await (await req('GET', '/api/testimonials')).json()).testimonials, []);
  assert.equal((await req('GET', '/api/admin/feedback?status=bogus', undefined, ADMIN)).status, 400);
  const fresh = (await (await req('GET', '/api/admin/feedback?status=new', undefined, ADMIN)).json()).feedback;
  assert.equal(fresh.length, 3);
  const mine = fresh.find((f) => f.rating === 5);
  const anon = fresh.find((f) => f.rating === 3);
  assert.equal((await req('POST', '/api/admin/feedback/nope', { status: 'approved' }, ADMIN)).status, 404);
  assert.equal((await req('POST', `/api/admin/feedback/${mine.id}`, { status: 'shown' }, ADMIN)).status, 400);
  const upd = await (await req('POST', `/api/admin/feedback/${mine.id}`, { status: 'approved', reply: 'நன்றி!' }, ADMIN)).json();
  assert.equal(upd.feedback.status, 'approved');
  assert.equal(upd.feedback.reply, 'நன்றி!');
  await req('POST', `/api/admin/feedback/${anon.id}`, { status: 'approved' }, ADMIN);

  const t = (await (await req('GET', '/api/testimonials')).json()).testimonials;
  assert.equal(t.length, 2);
  assert.deepEqual(t.map((x) => x.name).sort(), ['Anbu', 'அன்பர்'].sort());
  assert.deepEqual(Object.keys(t[0]).sort(), ['comment', 'createdAt', 'name', 'rating']);
  assert.equal((await (await req('GET', '/api/admin/feedback?status=approved', undefined, ADMIN)).json()).feedback.length, 2);

  let s = (await (await req('GET', '/api/admin/stats', undefined, ADMIN)).json()).totals;
  assert.equal(s.feedbackCount, 3);
  assert.equal(s.avgRating, 4);

  // 10 per hour per device
  for (let i = 0; i < 9; i++) assert.equal((await req('POST', '/api/feedback', { deviceId: 'device-fb-0003', rating: 4 })).status, 200);
  assert.equal((await req('POST', '/api/feedback', { deviceId: 'device-fb-0003', rating: 4 })).status, 429);
  s = (await (await req('GET', '/api/admin/stats', undefined, ADMIN)).json()).totals;
  assert.equal(s.feedbackCount, 12);
  assert.equal(s.avgRating, 4);
});

test('referrals: both get days; self / duplicate / old account blocked', async () => {
  process.env.REFERRAL_DAYS = '10';
  process.env.PUBLIC_URL = 'https://jothidar.example.com/';
  assert.equal((await req('GET', '/api/referral')).status, 401);
  const info = await (await req('GET', '/api/referral', undefined, as(chezhian))).json();
  assert.match(info.code, /^[A-HJKMNP-Z2-9]{6}$/);
  assert.equal(info.link, `https://jothidar.example.com/?ref=${info.code}`);
  assert.deepEqual({ referred: info.referred, rewardDaysEarned: info.rewardDaysEarned }, { referred: 0, rewardDaysEarned: 0 });
  assert.equal((await (await req('GET', '/api/referral', undefined, as(chezhian))).json()).code, info.code); // stable

  const claim = (cookie, code) => req('POST', '/api/referral/claim', { code }, as(cookie));
  assert.equal((await claim(chezhian, info.code)).status, 400); // self
  assert.equal((await claim(anbu, 'ZZZZZZ')).status, 404);

  const ezhil = await login('9876500105', 'Ezhil');
  const t0 = Date.now();
  const ok = await claim(ezhil, info.code.toLowerCase());
  assert.equal(ok.status, 200);
  const out = await ok.json();
  assert.equal(out.days, 10);
  near(out.expiresAt, t0 + 10 * DAY, 'new user reward');
  assert.equal((await me(ezhil)).plan, 'personal_month');
  const cm = await me(chezhian);
  assert.equal(cm.plan, 'personal_month');
  near(cm.expiresAt, t0 + 10 * DAY, 'referrer reward');
  assert.equal(cm.trialEndsAt, null); // referral is not a gift / trial

  assert.equal((await claim(ezhil, info.code)).status, 409); // duplicate
  const anbuCode = (await (await req('GET', '/api/referral', undefined, as(anbu))).json()).code;
  assert.equal((await claim(ezhil, anbuCode)).status, 409); // one claim per user, any code

  // Account older than 7 days
  const fathima = await login('9876500106', 'Fathima');
  growth.setGrowthClock(() => Date.now() + 8 * DAY);
  assert.equal((await claim(fathima, info.code)).status, 403);
  growth.setGrowthClock(null);

  // A second referral extends the referrer from the current expiry
  const ganesh = await login('9876500107', 'Ganesh');
  assert.equal((await claim(ganesh, info.code)).status, 200);
  near((await me(chezhian)).expiresAt, t0 + 20 * DAY, 'referrer stacked');
  const after = await (await req('GET', '/api/referral', undefined, as(chezhian))).json();
  assert.deepEqual({ referred: after.referred, rewardDaysEarned: after.rewardDaysEarned }, { referred: 2, rewardDaysEarned: 20 });
});

test('market: package requests are accepted', async () => {
  const date = new Date(Date.now() + 20 * DAY).toISOString().slice(0, 10);
  const b = { type: 'package', packageId: 'grahapravesam-complete', people: 25, date, city: 'Madurai', contactPhone: '9876500101', notes: 'East-facing house' };
  assert.equal((await req('POST', '/api/requests', b)).status, 401);
  assert.equal((await req('POST', '/api/requests', { ...b, packageId: undefined }, as(anbu))).status, 400);
  assert.equal((await req('POST', '/api/requests', { ...b, packageId: 'x'.repeat(61) }, as(anbu))).status, 400);
  assert.equal((await req('POST', '/api/requests', { ...b, packageId: 'Bad Id!' }, as(anbu))).status, 400);
  for (const packageId of ['navagraha', 'arupadai', 'pancha_bhoota', 'thirukadaiyur', 'rahu_ketu', 'sani', 'rameswaram']) {
    assert.equal((await req('POST', '/api/requests', { ...b, packageId }, as(anbu))).status, 201, packageId);
  }
  const svc = await req('POST', '/api/requests', { ...b, type: 'service', service: 'kubera_pooja' }, as(anbu));
  assert.equal(svc.status, 201);
  const res = await req('POST', '/api/requests', b, as(anbu));
  assert.equal(res.status, 201);
  const { request } = await res.json();
  assert.equal(request.type, 'package');
  assert.equal(request.packageId, 'grahapravesam-complete');
  assert.equal(request.people, 25);
  assert.equal(request.status, 'awaiting_confirmation');
});

test('admin overview', async () => {
  assert.equal((await req('GET', '/api/admin/overview')).status, 401);
  const o = await (await req('GET', '/api/admin/overview', undefined, ADMIN)).json();
  assert.equal(o.stats.daily.length, 30);
  assert.equal(o.stats.totals.devices, 6);
  assert.ok(o.stats.totals.requests >= 1);
  assert.equal(o.latestFeedback.length, 5);
  assert.equal(o.openRequests, 9);
  assert.equal(o.pendingPriests, 0);
  assert.equal(o.ordersAwaitingPayment, 0);
  delete process.env.ADMIN_TOKEN;
  assert.equal((await req('GET', '/api/admin/overview', undefined, ADMIN)).status, 503);
  assert.equal((await req('GET', '/api/admin/stats', undefined, ADMIN)).status, 503);
});
