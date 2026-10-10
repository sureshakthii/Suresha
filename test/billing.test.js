import { test, before, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

process.env.DB_PATH = ':memory:';
process.env.AUTH_DEV_MODE = '1';
process.env.AUTH_SECRET = 't';
process.env.ADMIN_TOKEN = 'admin-test';
const GATEWAY_ENV = ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'BILLING_ENFORCE', 'AI_FREE_DAILY', 'PUBLIC_URL'];
for (const k of [...GATEWAY_ENV, 'ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN', 'AI_REQUIRE_LOGIN', 'TWILIO_ACCOUNT_SID', 'MSG91_AUTH_KEY', 'SMTP_URL']) delete process.env[k];

const noNetwork = () => { throw new Error('network disabled in tests'); };
let server, base, billing, alice, bala, chitra, aliceId;
before(async () => {
  billing = await import('../server/billing.js');
  billing.setBillingFetch(noNetwork);
  const { createApp } = await import('../server/index.js');
  server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
  alice = await login('9876500011', 'Alamelu');
  bala = await login('9876500012', 'Balaji');
  chitra = await login('9876500013', 'Chitra');
  aliceId = (await (await req('GET', '/api/auth/me', undefined, as(alice))).json()).user.id;
});
after(() => server.close());
afterEach(() => {
  for (const k of GATEWAY_ENV) delete process.env[k];
  billing.setBillingFetch(noNetwork);
});

const req = (method, path, body, headers = {}) => fetch(base + path, {
  method,
  headers: { 'Content-Type': 'application/json', ...headers },
  body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
});
const as = (cookie) => (cookie ? { Cookie: cookie } : {});
const ADMIN = { 'x-admin-token': 'admin-test' };
const DAY = 86400000;

async function login(to, name) {
  const r = await (await req('POST', '/api/auth/otp/request', { channel: 'sms', to })).json();
  const res = await req('POST', '/api/auth/otp/verify', { channel: 'sms', to, code: r.devCode, name });
  assert.equal(res.status, 200);
  return res.headers.getSetCookie().find((s) => s.startsWith('kj_session=')).split(';')[0];
}
const me = async (cookie) => (await req('GET', '/api/billing/me', undefined, as(cookie))).json();
const near = (actual, expected, msg) => assert.ok(Math.abs(actual - expected) < 60000, `${msg}: ${new Date(actual).toISOString()} vs ${new Date(expected).toISOString()}`);
const plusMonths = (t, n) => { const d = new Date(t); d.setUTCMonth(d.getUTCMonth() + n); return d.getTime(); };
const plusYears = (t, n) => { const d = new Date(t); d.setUTCFullYear(d.getUTCFullYear() + n); return d.getTime(); };

function mockRazorpay(orderId) {
  const calls = [];
  billing.setBillingFetch(async (url, opts) => {
    calls.push({ url, opts });
    const b = JSON.parse(opts.body);
    return new Response(JSON.stringify({ id: orderId, amount: b.amount, currency: 'INR', receipt: b.receipt }), { status: 200 });
  });
  return calls;
}
const rzpSig = (oid, pid, secret = 'rzp_secret') => crypto.createHmac('sha256', secret).update(`${oid}|${pid}`).digest('hex');

async function buyWithRazorpay(cookie, plan, orderId, paymentId) {
  process.env.RAZORPAY_KEY_ID = 'rzp_test_key';
  process.env.RAZORPAY_KEY_SECRET = 'rzp_secret';
  const calls = mockRazorpay(orderId);
  const co = await (await req('POST', '/api/billing/checkout', { plan, currency: 'INR' }, as(cookie))).json();
  const v = await req('POST', '/api/billing/verify', {
    subscriptionId: co.subscriptionId, razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: rzpSig(orderId, paymentId),
  }, as(cookie));
  return { co, calls, v };
}

test('plans in INR (default) and USD', async () => {
  const inr = await (await req('GET', '/api/billing/plans')).json();
  assert.equal(inr.currency, 'INR');
  assert.deepEqual(inr.plans.map((p) => p.id), ['free', 'personal_month', 'personal_year', 'family_month', 'family_year', 'marriage_package', 'journey_package']);
  for (const p of inr.plans) {
    assert.ok(p.name.en && p.name.ta && p.features.length && p.features.every((x) => x.en && x.ta));
    assert.ok(['month', 'year', null].includes(p.interval));
  }
  assert.equal(inr.plans.find((p) => p.id === 'personal_month').amount, 199);
  assert.equal(inr.plans.find((p) => p.id === 'family_year').amount, 3999);
  const usd = await (await req('GET', '/api/billing/plans?currency=USD')).json();
  assert.equal(usd.currency, 'USD');
  assert.equal(usd.plans.find((p) => p.id === 'personal_month').amount, 4.99);
  assert.deepEqual(usd.plans.find((p) => p.id === 'personal_year').price, { INR: 1999, AED: 179, USD: 49 });
  assert.equal((await req('GET', '/api/billing/plans?currency=EUR')).status, 400);
});

test('me when signed out is free', async () => {
  const m = await me();
  assert.equal(m.plan, 'free');
  assert.equal(m.expiresAt, null);
  assert.deepEqual(m.entitlements, {
    unlimitedAi: false, aiMonthly: null, predictions: false, familyProfiles: 1, goalsMax: 1, shortlistMax: 10, journeysMax: 1,
    printReports: false, familyCollab: false, sharedPlanning: false, packages: [], matchingPairs: [], journeyIds: [],
  });
  assert.equal(m.aiFreeDaily, 5);
  assert.equal(m.aiUsedToday, 0);
});

test('checkout requires sign-in and a paid plan; without gateways → payment_setup_pending', async () => {
  assert.equal((await req('POST', '/api/billing/checkout', { plan: 'premium_month' })).status, 401);
  assert.equal((await req('POST', '/api/billing/checkout', { plan: 'free' }, as(bala))).status, 400);
  assert.equal((await req('POST', '/api/billing/checkout', { plan: 'gold' }, as(bala))).status, 400);
  assert.equal((await req('POST', '/api/billing/checkout', { plan: 'premium_month', currency: 'EUR' }, as(bala))).status, 400);
  const res = await req('POST', '/api/billing/checkout', { plan: 'premium_month', currency: 'INR' }, as(bala));
  assert.equal(res.status, 200);
  const out = await res.json();
  assert.ok(out.subscriptionId);
  assert.equal(out.gateway, null);
  assert.equal(out.status, 'payment_setup_pending');
  assert.equal((await me(bala)).plan, 'free');
});

test('Razorpay checkout + verify activates premium for a month; bad signature 400', async () => {
  process.env.RAZORPAY_KEY_ID = 'rzp_test_key';
  process.env.RAZORPAY_KEY_SECRET = 'rzp_secret';
  const calls = mockRazorpay('order_SUB1');
  const res = await req('POST', '/api/billing/checkout', { plan: 'personal_month', currency: 'INR' }, as(alice));
  assert.equal(res.status, 200);
  const co = await res.json();
  assert.deepEqual(co, { subscriptionId: co.subscriptionId, gateway: 'razorpay', keyId: 'rzp_test_key', razorpayOrderId: 'order_SUB1', amount: 19900, currency: 'INR' });
  assert.equal(calls[0].url, 'https://api.razorpay.com/v1/orders');
  assert.equal(calls[0].opts.headers.Authorization, 'Basic ' + Buffer.from('rzp_test_key:rzp_secret').toString('base64'));
  assert.deepEqual(JSON.parse(calls[0].opts.body), { amount: 19900, currency: 'INR', receipt: co.subscriptionId });

  const verify = (b, cookie = alice) => req('POST', '/api/billing/verify', { subscriptionId: co.subscriptionId, razorpay_order_id: 'order_SUB1', razorpay_payment_id: 'pay_1', ...b }, as(cookie));
  const bad = await verify({ razorpay_signature: 'f'.repeat(64) });
  assert.equal(bad.status, 400);
  assert.equal((await verify({ razorpay_signature: rzpSig('order_SUB1', 'pay_1', 'other') })).status, 400);
  assert.equal((await verify({ razorpay_order_id: 'order_X', razorpay_signature: rzpSig('order_X', 'pay_1') })).status, 400);
  assert.equal((await verify({ razorpay_signature: rzpSig('order_SUB1', 'pay_1') }, bala)).status, 404);
  assert.equal((await me(alice)).plan, 'free');

  const t0 = Date.now();
  const ok = await verify({ razorpay_signature: rzpSig('order_SUB1', 'pay_1') });
  assert.equal(ok.status, 200);
  const { subscription } = await ok.json();
  assert.equal(subscription.status, 'active');
  assert.equal(subscription.plan, 'personal_month');
  near(subscription.expiresAt, plusMonths(t0, 1), 'expiry +1 month');
  // Re-verifying is idempotent (no double extension)
  const again = (await (await verify({ razorpay_signature: rzpSig('order_SUB1', 'pay_1') })).json()).subscription;
  assert.equal(again.expiresAt, subscription.expiresAt);

  const m = await me(alice);
  assert.equal(m.plan, 'personal_month');
  assert.equal(m.status, 'active');
  assert.equal(m.expiresAt, subscription.expiresAt);
  assert.deepEqual(m.entitlements, {
    unlimitedAi: false, aiMonthly: 100, predictions: true, familyProfiles: 1, goalsMax: null, shortlistMax: null, journeysMax: null,
    printReports: true, familyCollab: false, sharedPlanning: false, packages: [], matchingPairs: [], journeyIds: [],
  });

  // Gateway failure → 502
  billing.setBillingFetch(async () => new Response('{"error":{}}', { status: 500 }));
  assert.equal((await req('POST', '/api/billing/checkout', { plan: 'premium_month', currency: 'INR' }, as(alice))).status, 502);
});

test('buying again extends from the current active expiry', async () => {
  const before = (await me(alice)).expiresAt;
  assert.ok(before > Date.now());
  const { v } = await buyWithRazorpay(alice, 'premium_year', 'order_SUB2', 'pay_2');
  assert.equal(v.status, 200);
  const { subscription } = await v.json();
  near(subscription.expiresAt, plusYears(before, 1), 'extended by a year from previous expiry');
  const m = await me(alice);
  assert.equal(m.plan, 'personal_year');
  assert.equal(m.expiresAt, subscription.expiresAt);
});

let stripeSubId;
test('Stripe checkout session (USD) is created with the right form fields', async () => {
  process.env.STRIPE_SECRET_KEY = 'sk_test_123';
  process.env.PUBLIC_URL = 'https://jothidar.example.com/';
  let call;
  billing.setBillingFetch(async (url, opts) => {
    call = { url, opts };
    return new Response(JSON.stringify({ id: 'cs_test_1', url: 'https://checkout.stripe.com/c/pay/cs_test_1' }), { status: 200 });
  });
  const res = await req('POST', '/api/billing/checkout', { plan: 'family_month', country: 'US', currency: 'USD' }, as(chitra));
  assert.equal(res.status, 200);
  const out = await res.json();
  assert.deepEqual(out, { subscriptionId: out.subscriptionId, gateway: 'stripe', url: 'https://checkout.stripe.com/c/pay/cs_test_1' });
  assert.equal(call.url, 'https://api.stripe.com/v1/checkout/sessions');
  assert.equal(call.opts.headers.Authorization, 'Bearer sk_test_123');
  assert.equal(call.opts.headers['Content-Type'], 'application/x-www-form-urlencoded');
  const form = new URLSearchParams(call.opts.body);
  assert.equal(form.get('mode'), 'payment');
  assert.equal(form.get('line_items[0][price_data][currency]'), 'usd');
  assert.equal(form.get('line_items[0][price_data][unit_amount]'), '999');
  assert.ok(form.get('line_items[0][price_data][product_data][name]'));
  assert.equal(form.get('line_items[0][quantity]'), '1');
  assert.equal(form.get('success_url'), 'https://jothidar.example.com/#billing-success');
  assert.equal(form.get('cancel_url'), 'https://jothidar.example.com/#billing-cancel');
  assert.equal(form.get('client_reference_id'), out.subscriptionId);
  assert.equal(form.get('metadata[subscription_id]'), out.subscriptionId);
  stripeSubId = out.subscriptionId;
  assert.equal((await me(chitra)).plan, 'free');
});

test('Stripe webhook: invalid signature 400, valid signature activates the subscription', async () => {
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
  const payload = JSON.stringify({ id: 'evt_1', type: 'checkout.session.completed', data: { object: { id: 'cs_test_1', client_reference_id: stripeSubId, metadata: { subscription_id: stripeSubId }, payment_intent: 'pi_1' } } });
  const sign = (t, body = payload, secret = 'whsec_test') => `t=${t},v1=${crypto.createHmac('sha256', secret).update(`${t}.${body}`).digest('hex')}`;
  const hook = (sig, body = payload) => req('POST', '/api/billing/stripe/webhook', body, { 'Stripe-Signature': sig });
  const t = Math.floor(Date.now() / 1000);

  assert.equal((await hook(sign(t, payload, 'whsec_wrong'))).status, 400);
  assert.equal((await hook(sign(t - 600))).status, 400); // outside the 5-minute tolerance
  assert.equal((await hook('garbage')).status, 400);
  assert.equal((await hook(sign(t), payload.replace('pi_1', 'pi_2'))).status, 400); // tampered body
  assert.equal((await me(chitra)).plan, 'free');

  const t0 = Date.now();
  const ok = await hook(sign(t));
  assert.equal(ok.status, 200);
  assert.deepEqual(await ok.json(), { received: true });
  const m = await me(chitra);
  assert.equal(m.plan, 'family_month');
  assert.equal(m.entitlements.familyProfiles, 8);
  near(m.expiresAt, plusMonths(t0, 1), 'stripe expiry +1 month');

  delete process.env.STRIPE_WEBHOOK_SECRET;
  assert.equal((await hook(sign(t))).status, 503);
});

test('admin grant gives complimentary access and lists subscriptions', async () => {
  assert.equal((await req('POST', '/api/admin/billing/grant', { userId: 'x', plan: 'premium_month', days: 30 })).status, 401);
  assert.equal((await req('POST', '/api/admin/billing/grant', { userId: 'x', plan: 'premium_month', days: 30 }, { 'x-admin-token': 'nope' })).status, 403);
  const balaId = (await (await req('GET', '/api/auth/me', undefined, as(bala))).json()).user.id;
  assert.equal((await req('POST', '/api/admin/billing/grant', { userId: 'nobody', plan: 'premium_month', days: 30 }, ADMIN)).status, 404);
  assert.equal((await req('POST', '/api/admin/billing/grant', { userId: balaId, plan: 'free', days: 30 }, ADMIN)).status, 400);
  assert.equal((await req('POST', '/api/admin/billing/grant', { userId: balaId, plan: 'premium_month', days: 0 }, ADMIN)).status, 400);
  const t0 = Date.now();
  const res = await req('POST', '/api/admin/billing/grant', { userId: balaId, plan: 'premium_month', days: 30 }, ADMIN);
  assert.equal(res.status, 201);
  const { subscription } = await res.json();
  assert.equal(subscription.gateway, 'admin');
  assert.equal(subscription.amountMinor, 0);
  near(subscription.expiresAt, t0 + 30 * DAY, 'grant +30 days');
  assert.equal((await me(bala)).plan, 'personal_month');

  const list = (await (await req('GET', '/api/admin/billing/subscriptions', undefined, ADMIN)).json()).subscriptions;
  assert.ok(list.some((s) => s.id === subscription.id && s.userId === balaId));
  assert.ok(list.some((s) => s.userId === aliceId && s.status === 'active'));
  delete process.env.ADMIN_TOKEN;
  try {
    assert.equal((await req('GET', '/api/admin/billing/subscriptions', undefined, ADMIN)).status, 503);
  } finally { process.env.ADMIN_TOKEN = 'admin-test'; }
});

test('AI quota: 402 after the free daily limit when BILLING_ENFORCE=1; premium has a monthly allowance (never unlimited)', async () => {
  const ask = (cookie) => req('POST', '/api/ai/chat', { context: { a: 1 }, messages: [{ role: 'user', content: 'Hi' }], fallbackText: 'fallback' }, as(cookie));
  // Not enforced by default
  for (let i = 0; i < 4; i++) assert.equal((await ask()).status, 200);
  assert.equal((await me()).aiUsedToday, 0);

  process.env.BILLING_ENFORCE = '1';
  process.env.AI_FREE_DAILY = '3';
  const dave = await login('9876500014', 'Devi');
  for (let i = 0; i < 3; i++) {
    const r = await ask(dave);
    assert.equal(r.status, 200);
    assert.equal((await r.json()).reply, 'fallback');
  }
  const m = await me(dave);
  assert.equal(m.aiUsedToday, 3);
  assert.equal(m.aiFreeDaily, 3);
  const blocked = await ask(dave);
  assert.equal(blocked.status, 402);
  assert.deepEqual(await blocked.json(), { error: 'Free daily AI limit reached — built-in guidance keeps working; the Personal plan includes a monthly AI allowance', upgrade: true });
  // Invalid requests are not counted
  assert.equal((await req('POST', '/api/ai/chat', { messages: [{ role: 'assistant', content: 'x' }] })).status, 400);

  // Signed-out quota is per IP and separate from Devi's
  for (let i = 0; i < 3; i++) assert.equal((await ask()).status, 200);
  assert.equal((await ask()).status, 402);

  // Premium (alice) has a defined monthly allowance
  process.env.AI_PREMIUM_MONTHLY = '5';
  try {
    for (let i = 0; i < 5; i++) assert.equal((await ask(alice)).status, 200);
    const ma = await me(alice);
    assert.equal(ma.aiUsedThisMonth, 5);
    assert.equal(ma.aiLimit, 5);
    assert.equal((await ask(alice)).status, 402);
  } finally { delete process.env.AI_PREMIUM_MONTHLY; }
});
