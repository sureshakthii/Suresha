// Operations: the SERVICES_OPEN switch, the request lifecycle (awaiting_confirmation / refunded) with status
// pushes, store refunds (customer request → finance refund via Razorpay or manual → refund.processed webhook),
// the Personal plan (old premium_* ids as aliases), product-metrics events and problem reports.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

process.env.DB_PATH = ':memory:';
process.env.AUTH_DEV_MODE = '1';
process.env.AUTH_SECRET = 'ops-test';
process.env.ADMIN_TOKENS = 'meena:finance:finance-token-123456,sam:support:support-token-1234567';
process.env.RAZORPAY_WEBHOOK_SECRET = 'whsec_ops';
for (const k of ['ADMIN_TOKEN', 'SERVICES_OPEN', 'STORE_ALLOW_SAMPLE', 'RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'STRIPE_SECRET_KEY', 'BILLING_ENFORCE', 'ANTHROPIC_API_KEY', 'TWILIO_ACCOUNT_SID', 'MSG91_AUTH_KEY', 'SMTP_URL', 'TRIAL_HOURS']) delete process.env[k];

let server, base, market, push, db, user, other;
const marketCalls = [];
before(async () => {
  market = await import('../server/market.js');
  push = await import('../server/push.js');
  market.setMarketFetch(async (url, opts = {}) => {
    marketCalls.push({ url, opts });
    if (/\/v1\/payments\/.+\/refund$/.test(url)) return new Response(JSON.stringify({ id: 'rfnd_store_1', status: 'pending' }), { status: 200 });
    throw new Error(`unexpected ${url}`);
  });
  const { createApp } = await import('../server/index.js');
  db = (await import('../server/db.js')).getDb;
  server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
  user = await login('9876500071', 'Valli');
  other = await login('9876500072', 'Other');
});
after(() => { push.setPushSender(null); server.close(); });

const req = (method, path, body, headers = {}) => fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...headers }, body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body) });
const as = (c) => (c ? { Cookie: c } : {});
const FIN = { 'x-admin-token': 'finance-token-123456' };
const SUP = { 'x-admin-token': 'support-token-1234567' };
async function login(to, name) {
  const r = await (await req('POST', '/api/auth/otp/request', { channel: 'sms', to })).json();
  const res = await req('POST', '/api/auth/otp/verify', { channel: 'sms', to, code: r.devCode, name });
  return res.headers.getSetCookie().find((s) => s.startsWith('kj_session=')).split(';')[0];
}
const date = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);
const sevaBody = { type: 'service', service: 'gomatha_pooja', date, city: 'Madurai', contactPhone: '9876500071' };
const hook = (event, id) => {
  const raw = JSON.stringify(event);
  const sig = crypto.createHmac('sha256', 'whsec_ops').update(raw).digest('hex');
  return req('POST', '/api/billing/razorpay/webhook', raw, { 'x-razorpay-signature': sig, 'x-razorpay-event-id': id });
};
const userId = async (c) => (await (await req('GET', '/api/auth/me', undefined, as(c))).json()).user.id;

// ---- SERVICES_OPEN ----

test('SERVICES_OPEN off (default): seva / priest / package intake returns 503 with a clear message', async () => {
  const st = await (await req('GET', '/api/service-status')).json();
  assert.equal(st.open, false);
  assert.match(st.message, /Coming soon/);
  for (const body of [sevaBody, { ...sevaBody, type: 'package', packageId: 'navagraha', service: undefined }, { ...sevaBody, type: 'annadhanam', meals: 10 }]) {
    const r = await req('POST', '/api/requests', body, as(user));
    assert.equal(r.status, 503, body.type);
    const j = await r.json();
    assert.equal(j.servicesClosed, true);
    assert.match(j.error, /not accepting/);
  }
  // Priests may still register their interest (verified before they ever appear).
  const pr = await req('POST', '/api/priests/register', { name: 'Ramanathan', phone: '9876500079', city: 'Madurai', languages: ['Tamil'], services: ['gomatha_pooja'], experience_years: 12 }, as(other));
  assert.equal(pr.status, 201);
  assert.equal(db().prepare('SELECT COUNT(*) AS n FROM service_requests').get().n, 0, 'nothing stored');
});

// ---- lifecycle + pushes ----

test('request lifecycle: requested → awaiting_confirmation → confirmed → completed, each change pushed to the customer', async () => {
  process.env.SERVICES_OPEN = '1';
  assert.equal((await (await req('GET', '/api/service-status')).json()).open, true);
  const sent = [];
  push.setPushSender(async (sub, payload) => { sent.push({ endpoint: sub.endpoint, payload }); });
  push.upsertSubscription({ endpoint: 'https://push.example.com/valli', keys: { p256dh: 'k', auth: 'a' } }, { morning: false }, await userId(user));
  const r = await req('POST', '/api/requests', sevaBody, as(user));
  assert.equal(r.status, 201);
  const { request } = await r.json();
  assert.equal(request.status, 'awaiting_confirmation');
  for (const status of ['confirmed', 'completed']) {
    const a = await req('POST', `/api/admin/requests/${request.id}/status`, { status }, SUP);
    assert.equal(a.status, 200);
    assert.equal((await a.json()).request.status, status);
  }
  await new Promise((res) => setTimeout(res, 50));
  assert.deepEqual(sent.map((s) => s.endpoint), ['https://push.example.com/valli', 'https://push.example.com/valli']);
  assert.match(sent[0].payload.title, /confirmed/);
  assert.match(sent[0].payload.body, /உறுதி/);
  assert.equal(sent[0].payload.url, '/#bookings');
  assert.match(sent[1].payload.title, /completed/);
  const mine = (await (await req('GET', '/api/requests', undefined, as(user))).json()).requests.find((x) => x.id === request.id);
  assert.deepEqual(mine.history.map((h) => h.status), ['requested', 'awaiting_confirmation', 'confirmed', 'completed']);
  // Refunded is a terminal admin status (and is pushed too); an unknown status is rejected.
  const r2 = await (await req('POST', '/api/requests', sevaBody, as(user))).json();
  assert.equal((await (await req('POST', `/api/admin/requests/${r2.request.id}/status`, { status: 'refunded' }, SUP)).json()).request.status, 'refunded');
  await new Promise((res) => setTimeout(res, 50));
  assert.match(sent.at(-1).payload.title, /refunded/);
  assert.equal((await req('POST', `/api/admin/requests/${r2.request.id}/status`, { status: 'teleported' }, SUP)).status, 400);
  // A request awaiting confirmation can be cancelled by its customer.
  const r3 = await (await req('POST', '/api/requests', sevaBody, as(user))).json();
  assert.equal((await (await req('POST', `/api/requests/${r3.request.id}/cancel`, {}, as(user))).json()).request.status, 'cancelled');
  push.setPushSender(null);
});

// ---- store refunds ----

function insertOrder(uid, { status = 'paid', paymentId = null, total = 500, ageDays = 1, updatedAgoDays = ageDays } = {}) {
  const id = crypto.randomUUID();
  const t = Date.now();
  db().prepare(`INSERT INTO store_orders (id, user_id, items, address, total, status, razorpay_order_id, razorpay_payment_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, uid, JSON.stringify([{ id: 'lamp', name: { en: 'Lamp', ta: 'விளக்கு' }, qty: 1 }]), '{}', total, status, paymentId && `order_${id}`, paymentId, t - ageDays * 86400000, t - updatedAgoDays * 86400000);
  return id;
}

test('store refund: the customer asks within the window; outside it or for unpaid / other people\'s orders it is refused', async () => {
  const uid = await userId(user);
  const paid = insertOrder(uid, { status: 'shipped', paymentId: 'pay_store_1' });
  assert.equal((await req('POST', `/api/store/orders/${paid}/refund-request`, {}, as(other))).status, 404);
  const r = await req('POST', `/api/store/orders/${paid}/refund-request`, { reason: 'Lamp arrived broken' }, as(user));
  assert.equal(r.status, 201);
  assert.equal((await r.json()).refundRequest.status, 'open');
  assert.equal((await (await req('POST', `/api/store/orders/${paid}/refund-request`, {}, as(user))).json()).already, true);
  const listed = (await (await req('GET', '/api/store/orders', undefined, as(user))).json()).orders.find((o) => o.id === paid);
  assert.equal(listed.refundRequest.status, 'open');
  const late = insertOrder(uid, { status: 'delivered', updatedAgoDays: 9 });
  assert.equal((await req('POST', `/api/store/orders/${late}/refund-request`, {}, as(user))).status, 409);
  const recent = insertOrder(uid, { status: 'delivered', ageDays: 20, updatedAgoDays: 2 });
  assert.equal((await req('POST', `/api/store/orders/${recent}/refund-request`, {}, as(user))).status, 201, 'within 7 days of delivery');
  const unpaid = insertOrder(uid, { status: 'awaiting_payment' });
  assert.equal((await req('POST', `/api/store/orders/${unpaid}/refund-request`, {}, as(user))).status, 409);
  const open = (await (await req('GET', '/api/admin/refund-requests', undefined, SUP)).json()).refundRequests;
  assert.ok(open.some((x) => x.orderId === paid && x.reason === 'Lamp arrived broken'));
});

test('admin store refund: finance role; without a gateway → refund_pending (audited), then confirmed by hand', async () => {
  const uid = await userId(user);
  const id = insertOrder(uid, { status: 'paid' });
  assert.equal((await req('POST', `/api/admin/orders/${id}/refund`, {}, SUP)).status, 403, 'support cannot refund');
  const r = await (await req('POST', `/api/admin/orders/${id}/refund`, {}, FIN)).json();
  assert.equal(r.order.status, 'refund_pending');
  assert.equal(r.manual, true);
  const done = await (await req('POST', `/api/admin/orders/${id}/refund`, { markRefunded: true }, FIN)).json();
  assert.equal(done.order.status, 'refunded');
  assert.equal((await (await req('POST', `/api/admin/orders/${id}/refund`, {}, FIN)).json()).already, true);
  const { auditLog } = await import('../server/admin.js');
  assert.ok(auditLog().some((a) => a.action === 'order.refund' && a.target === id && a.actor === 'meena'));
  const unpaid = insertOrder(uid, { status: 'awaiting_payment' });
  assert.equal((await req('POST', `/api/admin/orders/${unpaid}/refund`, {}, FIN)).status, 409);
});

test('admin store refund through Razorpay, completed by the refund.processed webhook', async () => {
  process.env.RAZORPAY_KEY_ID = 'rzp_test_ops';
  process.env.RAZORPAY_KEY_SECRET = 'rzp_secret_ops';
  try {
    const uid = await userId(user);
    const id = insertOrder(uid, { status: 'paid', paymentId: 'pay_store_9', total: 750 });
    await req('POST', `/api/store/orders/${id}/refund-request`, { reason: 'Changed my mind' }, as(user));
    const r = await (await req('POST', `/api/admin/orders/${id}/refund`, {}, FIN)).json();
    const call = marketCalls.at(-1);
    assert.match(call.url, /\/v1\/payments\/pay_store_9\/refund$/);
    assert.equal(JSON.parse(call.opts.body).amount, 75000);
    assert.equal(r.refundId, 'rfnd_store_1');
    assert.equal(r.order.status, 'refund_pending', 'Razorpay said pending');
    const w = await hook({ event: 'refund.processed', payload: { refund: { entity: { id: 'rfnd_store_1', payment_id: 'pay_store_9', amount: 75000 } } } }, 'evt_refund_store_1');
    assert.equal(w.status, 200);
    const order = (await (await req('GET', '/api/store/orders', undefined, as(user))).json()).orders.find((o) => o.id === id);
    assert.equal(order.status, 'refunded');
    assert.equal(order.refundRequest.status, 'refunded');
    // A duplicate delivery of the same webhook is ignored.
    assert.equal((await (await hook({ event: 'refund.processed', payload: { refund: { entity: { payment_id: 'pay_store_9', amount: 75000 } } } }, 'evt_refund_store_1')).json()).duplicate, true);
  } finally { delete process.env.RAZORPAY_KEY_ID; delete process.env.RAZORPAY_KEY_SECRET; }
});

test('refund.processed webhook revokes a fully refunded subscription (old premium_* row) and ignores partial refunds', async () => {
  const uid = await userId(other);
  const t = Date.now();
  const ins = db().prepare(`INSERT INTO subscriptions (id, user_id, plan, status, currency, amount_minor, gateway, gateway_ref, payment_ref, starts_at, expires_at, created_at)
    VALUES (?, ?, ?, 'active', 'INR', 19900, 'razorpay', ?, ?, ?, ?, ?)`);
  ins.run('sub_old_premium', uid, 'premium_month', 'order_old', 'pay_sub_1', t, t + 30 * 86400000, t);
  let m = await (await req('GET', '/api/billing/me', undefined, as(other))).json();
  assert.equal(m.plan, 'personal_month', 'old premium rows read as the Personal plan');
  assert.equal(m.entitlements.predictions, true);
  await hook({ event: 'refund.processed', payload: { refund: { entity: { payment_id: 'pay_sub_1', amount: 5000 } } } }, 'evt_partial');
  assert.equal((await (await req('GET', '/api/billing/me', undefined, as(other))).json()).plan, 'personal_month', 'partial refund keeps access');
  await hook({ event: 'refund.processed', payload: { refund: { entity: { payment_id: 'pay_sub_1', amount: 19900 } } } }, 'evt_full');
  m = await (await req('GET', '/api/billing/me', undefined, as(other))).json();
  assert.equal(m.plan, 'free');
  assert.equal(db().prepare('SELECT status FROM subscriptions WHERE id = ?').get('sub_old_premium').status, 'refunded');
});

// ---- the Personal plan ----

test('plans: Personal (தனிநபர்) and Family; "coming soon" features are flagged; old ids are aliases', async () => {
  const p = await (await req('GET', '/api/billing/plans')).json();
  const personal = p.plans.find((x) => x.id === 'personal_month');
  assert.equal(personal.name.en, 'Personal — monthly');
  assert.match(personal.name.ta, /தனிநபர்/);
  assert.equal(personal.amount, 199);
  assert.equal(p.plans.find((x) => x.id === 'personal_year').amount, 1999);
  assert.ok(!JSON.stringify(p).match(/premium|பிரீமியம்/i), 'the old name is gone from what users see');
  const soon = personal.features.filter((f) => f.soon).map((f) => f.en);
  assert.deepEqual(soon.sort(), ['Saved goals', 'Weekly planning']);
  const fam = p.plans.find((x) => x.id === 'family_month');
  assert.ok(fam.features.some((f) => /8 family profiles/.test(f.en) && /permission/.test(f.en)));
  assert.equal(fam.amount, 399);
  // Old ids still work for checkout and gift codes; the stored plan is the current id.
  const co = await (await req('POST', '/api/billing/checkout', { plan: 'premium_year' }, as(user))).json();
  assert.equal(db().prepare('SELECT plan FROM subscriptions WHERE id = ?').get(co.subscriptionId).plan, 'personal_year');
  const g = await (await req('POST', '/api/admin/gift-codes', { plan: 'premium_month', hours: 2 }, SUP)).json();
  assert.equal(g.giftCode.plan, 'personal_month');
});

// ---- metrics events and problem reports ----

test('product-metrics events are accepted and summarised for the owner', async () => {
  const events = [
    { type: 'feature_use', feature: 'porutham' }, { type: 'feature_use', feature: 'porutham' }, { type: 'feature_use', feature: 'names' },
    { type: 'task_complete', feature: 'porutham' }, { type: 'task_complete', feature: 'names' },
    { type: 'paywall_view', feature: 'life' }, { type: 'paywall_view', feature: 'life' }, { type: 'plan_click', feature: 'personal_month' },
    { type: 'purchase', feature: 'personal_month' }, { type: 'signup' }, { type: 'login' },
    { type: 'comprehension_feedback', feature: 'prasnam:yes' }, { type: 'comprehension_feedback', feature: 'prasnam:yes' }, { type: 'comprehension_feedback', feature: 'chat:no' },
  ];
  assert.equal((await req('POST', '/api/events', { deviceId: 'device-ops-0001', events })).status, 200);
  assert.equal((await req('POST', '/api/events', { deviceId: 'device-ops-0001', events: [{ type: 'mind_read' }] })).status, 400);
  const o = await (await req('GET', '/api/admin/overview', undefined, SUP)).json();
  const p = o.stats.product;
  assert.deepEqual(p.featureUse, { porutham: 2, names: 1 });
  assert.deepEqual(p.tasksCompleted, { names: 1, porutham: 1 });
  assert.equal(p.paywallViews, 2);
  assert.equal(p.planClicks, 1);
  assert.equal(p.purchases, 1);
  assert.equal(p.paywallToClickRate, 50);
  assert.equal(p.signups, 1);
  assert.equal(p.logins, 1);
  assert.deepEqual(p.comprehension, { yes: 2, no: 1, clearRate: 66.7 });
  assert.equal(o.stats.topFeatures[0].feature, 'porutham');
});

test('problem reports: type defect is stored with its report, kept out of ratings and testimonials', async () => {
  const report = { steps: '1. Open porutham 2. Tap match', expected: 'A result', actual: 'Nothing happened', build: 'build 42 · 2026-10-07', viewport: '360x780', lang: 'ta' };
  const r = await req('POST', '/api/feedback', { deviceId: 'device-ops-0002', type: 'defect', comment: 'Nothing happened', screen: 'porutham', report });
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { ok: true, type: 'defect' });
  assert.equal((await req('POST', '/api/feedback', { deviceId: 'device-ops-0002', type: 'defect', screen: 'porutham' })).status, 400, 'a defect needs a description');
  assert.equal((await req('POST', '/api/feedback', { deviceId: 'device-ops-0002', type: 'defect', comment: 'x', report: { viewport: 'huge' } })).status, 400);
  assert.equal((await req('POST', '/api/feedback', { deviceId: 'device-ops-0002', type: 'spam', comment: 'x' })).status, 400);
  const list = (await (await req('GET', '/api/admin/feedback?type=defect', undefined, SUP)).json()).feedback;
  assert.equal(list.length, 1);
  assert.deepEqual(list[0].report, report);
  assert.equal(list[0].screen, 'porutham');
  const o = await (await req('GET', '/api/admin/overview', undefined, SUP)).json();
  assert.equal(o.problemReports, 1);
  assert.equal(o.latestFeedback.length, 0, 'reports are not ratings');
  assert.equal(o.stats.totals.avgRating, null);
});
