// Production readiness: verified webhooks, duplicate callbacks, failures and refunds, restore,
// closed sample store, customer cancellation, export/deletion, admin roles + audit, rate limits.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

process.env.DB_PATH = ':memory:';
process.env.SERVICES_OPEN = '1'; // request intake is off by default (see the SERVICES_OPEN tests in market.test.js)
process.env.AUTH_DEV_MODE = '1';
process.env.AUTH_SECRET = 't';
process.env.ADMIN_TOKENS = 'meena:finance:finance-token-123456,ravi:viewer:viewer-token-1234567';
process.env.RAZORPAY_KEY_ID = 'rzp_test_x';
process.env.RAZORPAY_KEY_SECRET = 'rzp_secret';
process.env.RAZORPAY_WEBHOOK_SECRET = 'whsec_rzp';
for (const k of ['ADMIN_TOKEN', 'STORE_ALLOW_SAMPLE', 'STRIPE_SECRET_KEY', 'BILLING_ENFORCE', 'ANTHROPIC_API_KEY', 'TWILIO_ACCOUNT_SID', 'MSG91_AUTH_KEY', 'SMTP_URL', 'RATE_LIMITS']) delete process.env[k];

let server, base, billing, kavi;
const calls = [];
before(async () => {
  billing = await import('../server/billing.js');
  billing.setBillingFetch(async (url, opts = {}) => {
    calls.push({ url, opts });
    if (url.endsWith('/v1/orders')) { const b = JSON.parse(opts.body); return new Response(JSON.stringify({ id: `order_${calls.length}`, amount: b.amount }), { status: 200 }); }
    if (/\/v1\/orders\/.+\/payments$/.test(url)) return new Response(JSON.stringify({ items: [{ id: 'pay_restored', status: 'captured' }] }), { status: 200 });
    if (/\/v1\/payments\/.+\/refund$/.test(url)) return new Response(JSON.stringify({ id: 'rfnd_1' }), { status: 200 });
    throw new Error(`unexpected ${url}`);
  });
  const { createApp } = await import('../server/index.js');
  server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
  kavi = await login('9876500031', 'Kavitha');
});
after(() => server.close());

const req = (method, path, body, headers = {}) => fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...headers }, body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body) });
const as = (c) => (c ? { Cookie: c } : {});
async function login(to, name) {
  const r = await (await req('POST', '/api/auth/otp/request', { channel: 'sms', to })).json();
  const res = await req('POST', '/api/auth/otp/verify', { channel: 'sms', to, code: r.devCode, name });
  return res.headers.getSetCookie().find((s) => s.startsWith('kj_session=')).split(';')[0];
}
const me = async (c) => (await req('GET', '/api/billing/me', undefined, as(c))).json();
const hook = (event, id) => {
  const raw = JSON.stringify(event);
  const sig = crypto.createHmac('sha256', 'whsec_rzp').update(raw).digest('hex');
  return req('POST', '/api/billing/razorpay/webhook', raw, { 'x-razorpay-signature': sig, 'x-razorpay-event-id': id });
};

test('plans expose configurable test prices and clear terms', async () => {
  const p = await (await req('GET', '/api/billing/plans')).json();
  assert.equal(p.testPrices, true);
  for (const k of ['renewal', 'cancellation', 'refund']) assert.ok(p.terms[k].en && p.terms[k].ta, k);
  assert.deepEqual(p.plans.filter((x) => x.interval).map((x) => x.amount), [199, 1999, 399, 3999]);
  assert.ok(!JSON.stringify(p.plans).toLowerCase().includes('unlimited jothidar'), 'no unlimited AI promise');
});

test('Razorpay webhook: bad signature rejected; payment.captured activates; duplicate delivery ignored', async () => {
  const co = await (await req('POST', '/api/billing/checkout', { plan: 'premium_month' }, as(kavi))).json();
  assert.equal(co.gateway, 'razorpay');
  assert.equal((await req('POST', '/api/billing/razorpay/webhook', '{}', { 'x-razorpay-signature': 'nope' })).status, 400);
  const ev = { event: 'payment.captured', payload: { payment: { entity: { id: 'pay_1', order_id: co.razorpayOrderId, amount: 19900 } } } };
  assert.equal((await hook(ev, 'evt_1')).status, 200);
  const m1 = await me(kavi);
  assert.equal(m1.plan, 'personal_month');
  const dup = await (await hook(ev, 'evt_1')).json();
  assert.equal(dup.duplicate, true);
  assert.equal((await me(kavi)).expiresAt, m1.expiresAt, 'a duplicate callback does not extend access');
  // The client-side verify arriving after the webhook is harmless too.
});

test('payment.failed marks the pending subscription failed; restore finds a later captured payment', async () => {
  const user = await login('9876500032', 'Selvi');
  const co = await (await req('POST', '/api/billing/checkout', { plan: 'family_month' }, as(user))).json();
  await hook({ event: 'payment.failed', payload: { payment: { entity: { id: 'pay_f', order_id: co.razorpayOrderId } } } }, 'evt_f');
  assert.equal((await me(user)).plan, 'free');
  const r = await (await req('POST', '/api/billing/restore', {}, as(user))).json();
  assert.equal(r.restored, 1);
  assert.equal(r.plan, 'family_month');
  assert.equal((await me(user)).entitlements.familyProfiles, 8);
});

test('admin refund needs the finance role, revokes access and is audited', async () => {
  const user = await login('9876500033', 'Anbu');
  const co = await (await req('POST', '/api/billing/checkout', { plan: 'premium_month' }, as(user))).json();
  await hook({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_r', order_id: co.razorpayOrderId } } } }, 'evt_r');
  assert.equal((await me(user)).plan, 'personal_month');
  assert.equal((await req('POST', '/api/admin/billing/refund', { subscriptionId: co.subscriptionId }, { 'x-admin-token': 'viewer-token-1234567' })).status, 403);
  const r = await req('POST', '/api/admin/billing/refund', { subscriptionId: co.subscriptionId }, { 'x-admin-token': 'finance-token-123456' });
  assert.equal(r.status, 200);
  assert.equal((await r.json()).subscription.status, 'refunded');
  assert.equal((await me(user)).plan, 'free');
  const { auditLog } = await import('../server/admin.js');
  const entry = auditLog().find((a) => a.action === 'billing.refund');
  assert.equal(entry.actor, 'meena');
  assert.equal(entry.role, 'finance');
});

test('the sample store catalogue cannot be bought', async () => {
  const p = await (await req('GET', '/api/store/products')).json();
  assert.equal(p.sample, true);
  assert.equal(p.open, false);
  const r = await req('POST', '/api/store/orders', { items: [{ id: p.products[0].id, qty: 1 }], address: { name: 'K', phone: '9876500031', line1: 'x', city: 'Madurai', pincode: '625001', state: 'TN' } }, as(kavi));
  assert.equal(r.status, 409);
  assert.equal((await r.json()).storeClosed, true);
});

test('customers can cancel their own booking request; others cannot', async () => {
  const date = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);
  const r = await req('POST', '/api/requests', { type: 'service', service: 'gomatha_pooja', date, time: '07:30', people: 2, city: 'Madurai', contactPhone: '9876500031' }, as(kavi));
  const body = await r.json();
  assert.equal(r.status, 201, JSON.stringify(body));
  const other = await login('9876500034', 'Other');
  assert.equal((await req('POST', `/api/requests/${body.request.id}/cancel`, {}, as(other))).status, 404);
  const c = await (await req('POST', `/api/requests/${body.request.id}/cancel`, {}, as(kavi))).json();
  assert.equal(c.request.status, 'cancelled');
  assert.equal((await req('POST', `/api/requests/${body.request.id}/cancel`, {}, as(kavi))).status, 409);
});

test('account export and deletion', async () => {
  const user = await login('9876500035', 'Delete Me');
  await req('PUT', '/api/me/data', { data: { family: [{ id: 'a', name: 'Child', date: '2018-01-01' }] } }, as(user));
  const ex = await (await req('GET', '/api/me/export', undefined, as(user))).json();
  assert.equal(ex.account.name, 'Delete Me');
  assert.equal(ex.savedData.family[0].name, 'Child');
  assert.equal((await req('DELETE', '/api/me', undefined, as(user))).status, 200);
  assert.equal((await req('GET', '/api/me/data', undefined, as(user))).status, 401);
});

test('owner metrics: definitions, text-ready numbers and the stretch-goal note; audit needs owner role', async () => {
  const m = await (await req('GET', '/api/admin/metrics?days=30', undefined, { 'x-admin-token': 'viewer-token-1234567' })).json();
  for (const k of ['activation', 'retention', 'conversion', 'churn', 'ai', 'acquisition', 'money', 'bookings']) assert.ok(m[k], k);
  assert.ok(m.money.revenueInr >= 199, 'captured payments count as revenue');
  assert.ok(m.money.refundCount >= 1);
  assert.equal(m.ai.priced, false, 'AI cost is not guessed without configured prices');
  assert.ok(m.notes.some((n) => /stretch business ambition, not a forecast/.test(n)));
  assert.equal((await req('GET', '/api/admin/audit', undefined, { 'x-admin-token': 'viewer-token-1234567' })).status, 403);
});


test('admin: unknown token 403, lock-out after repeated failures, viewer cannot change state', async () => {
  assert.equal((await req('GET', '/api/admin/billing/subscriptions', undefined, { 'x-admin-token': 'nope' })).status, 403);
  assert.equal((await req('GET', '/api/admin/billing/subscriptions', undefined, { 'x-admin-token': 'finance-token-123456' })).status, 200);
  assert.equal((await req('POST', '/api/admin/gift-codes', { plan: 'premium_month', hours: 24 }, { 'x-admin-token': 'viewer-token-1234567' })).status, 403);
  let last;
  for (let i = 0; i < 12; i++) last = (await req('GET', '/api/admin/stats', undefined, { 'x-admin-token': `bad-${i}` })).status;
  assert.equal(last, 429);
});

test('rate limits protect read endpoints', async () => {
  let status = 200;
  for (let i = 0; i < 130 && status === 200; i++) status = (await req('GET', '/api/places?q=ma&online=0')).status;
  assert.equal(status, 429);
});
