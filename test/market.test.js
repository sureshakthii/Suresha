import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

process.env.DB_PATH = ':memory:';
process.env.AUTH_DEV_MODE = '1';
process.env.AUTH_SECRET = 't';
process.env.ADMIN_TOKEN = 'admin-test';
process.env.RATE_LIMITS = 'off'; // validation-heavy suite; the limiter has its own test
process.env.STORE_ALLOW_SAMPLE = '1'; // the shipped catalogue is a sample; real checkout refuses it (see production.test.js)
for (const k of ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'ANNADHANAM_RATE', 'TWILIO_ACCOUNT_SID', 'MSG91_AUTH_KEY', 'SMTP_URL']) delete process.env[k];

let server, base, market, buyer, priestUser;
before(async () => {
  market = await import('../server/market.js');
  market.setMarketFetch(() => { throw new Error('network disabled in tests'); });
  const { createApp } = await import('../server/index.js');
  server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
  buyer = await login('9876500001', 'Lakshmi');
  priestUser = await login('9876500002', 'Ramanathan');
});
after(() => server.close());

const req = (method, path, body, headers = {}) => fetch(base + path, {
  method,
  headers: { 'Content-Type': 'application/json', ...headers },
  body: body === undefined ? undefined : JSON.stringify(body),
});
const as = (cookie) => (cookie ? { Cookie: cookie } : {});
const ADMIN = { 'x-admin-token': 'admin-test' };

async function login(to, name) {
  const r = await (await req('POST', '/api/auth/otp/request', { channel: 'sms', to })).json();
  const res = await req('POST', '/api/auth/otp/verify', { channel: 'sms', to, code: r.devCode, name });
  assert.equal(res.status, 200);
  return res.headers.getSetCookie().find((s) => s.startsWith('kj_session=')).split(';')[0];
}

const future = (days = 10) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
const address = { name: 'Lakshmi', phone: '9876500001', line1: '12, North Mada Street', city: 'Chennai', pincode: '600004', state: 'Tamil Nadu' };


test('products: listing, categories and category filter', async () => {
  const all = await (await req('GET', '/api/store/products')).json();
  assert.equal(all.sample, true);
  assert.equal(all.currency, 'INR');
  assert.ok(all.products.length >= 25);
  assert.ok(all.categories.some((c) => c.id === 'lamps' && c.ta));
  for (const p of all.products) {
    assert.ok(p.id && p.name.en && p.name.ta && p.description.ta && p.unit && p.image);
    assert.ok(Number.isInteger(p.price) && p.price > 0);
    assert.ok(all.categories.some((c) => c.id === p.category), p.category);
  }
  const books = await (await req('GET', '/api/store/products?category=books')).json();
  assert.ok(books.products.length >= 6);
  assert.ok(books.products.every((p) => p.category === 'books'));
  assert.equal((await req('GET', '/api/store/products?category=nope')).status, 400);
});

test('orders require sign-in', async () => {
  const res = await req('POST', '/api/store/orders', { items: [{ id: 'pooja-kumkum-100', qty: 1 }], address });
  assert.equal(res.status, 401);
  assert.equal((await req('GET', '/api/store/orders')).status, 401);
});

test('order: server-side total ignores tampered price; no Razorpay → awaiting_payment_setup', async () => {
  const res = await req('POST', '/api/store/orders', {
    items: [{ id: 'lamp-kuthu-vilakku-12', qty: 2, price: 1 }, { id: 'pooja-kumkum-100', qty: 3, price: 0 }],
    total: 5, address,
  }, as(buyer));
  assert.equal(res.status, 201);
  const { order, payment } = await res.json();
  assert.equal(order.total, 1450 * 2 + 60 * 3);
  assert.equal(order.status, 'awaiting_payment_setup');
  assert.equal(payment, null);
  assert.equal(order.items.find((i) => i.id === 'lamp-kuthu-vilakku-12').price, 1450);

  const list = await (await req('GET', '/api/store/orders', undefined, as(buyer))).json();
  assert.equal(list.orders.length, 1);
  assert.equal(list.orders[0].id, order.id);
  const other = await (await req('GET', '/api/store/orders', undefined, as(priestUser))).json();
  assert.equal(other.orders.length, 0);
});

test('order validation: pincode, qty, unknown product, stock', async () => {
  const bad = async (body) => {
    const res = await req('POST', '/api/store/orders', body, as(buyer));
    assert.equal(res.status, 400, JSON.stringify(body));
    assert.ok((await res.json()).error);
  };
  await bad({ items: [{ id: 'pooja-kumkum-100', qty: 1 }], address: { ...address, pincode: '6000' } });
  await bad({ items: [{ id: 'pooja-kumkum-100', qty: 1 }], address: { ...address, pincode: '060004' } });
  await bad({ items: [{ id: 'pooja-kumkum-100', qty: 0 }], address });
  await bad({ items: [{ id: 'pooja-kumkum-100', qty: 21 }], address });
  await bad({ items: [{ id: 'pooja-kumkum-100', qty: 1.5 }], address });
  await bad({ items: [{ id: 'no-such-thing', qty: 1 }], address });
  await bad({ items: [], address });
  await bad({ items: [{ id: 'grahapravesam-kit', qty: 16 }], address }); // stock 15
  await bad({ items: [{ id: 'pooja-kumkum-100', qty: 1 }], address: { ...address, phone: '123' } });
});

test('Razorpay: mocked gateway → payment object; signature verify success and failure', async () => {
  process.env.RAZORPAY_KEY_ID = 'rzp_test_key';
  process.env.RAZORPAY_KEY_SECRET = 'rzp_secret';
  let call;
  market.setMarketFetch(async (url, opts) => {
    call = { url, opts };
    const body = JSON.parse(opts.body);
    return new Response(JSON.stringify({ id: 'order_RZP123', amount: body.amount, currency: 'INR', receipt: body.receipt }), { status: 200 });
  });
  try {
    const res = await req('POST', '/api/store/orders', { items: [{ id: 'oil-cow-ghee-500', qty: 2 }], address }, as(buyer));
    assert.equal(res.status, 201);
    const { order, payment } = await res.json();
    assert.equal(order.status, 'awaiting_payment');
    assert.deepEqual(payment, { gateway: 'razorpay', keyId: 'rzp_test_key', razorpayOrderId: 'order_RZP123', amount: 84000, currency: 'INR' });
    assert.equal(call.url, 'https://api.razorpay.com/v1/orders');
    assert.equal(call.opts.headers.Authorization, 'Basic ' + Buffer.from('rzp_test_key:rzp_secret').toString('base64'));
    assert.deepEqual(JSON.parse(call.opts.body), { amount: 84000, currency: 'INR', receipt: order.id });

    const verify = (body, cookie = buyer) => req('POST', `/api/store/orders/${order.id}/verify`, body, as(cookie));
    const good = crypto.createHmac('sha256', 'rzp_secret').update('order_RZP123|pay_ABC').digest('hex');
    const wrong = await verify({ razorpay_order_id: 'order_RZP123', razorpay_payment_id: 'pay_ABC', razorpay_signature: 'f'.repeat(64) });
    assert.equal(wrong.status, 400);
    assert.equal((await verify({ razorpay_order_id: 'order_OTHER', razorpay_payment_id: 'pay_ABC', razorpay_signature: good })).status, 400);
    assert.equal((await verify({ razorpay_order_id: 'order_RZP123', razorpay_payment_id: 'pay_ABC', razorpay_signature: good }, priestUser)).status, 404);
    const ok = await verify({ razorpay_order_id: 'order_RZP123', razorpay_payment_id: 'pay_ABC', razorpay_signature: good });
    assert.equal(ok.status, 200);
    const paid = (await ok.json()).order;
    assert.equal(paid.status, 'paid');
    assert.equal(paid.paymentId, 'pay_ABC');

    // Gateway failure → 502, nothing stored
    market.setMarketFetch(async () => new Response('{"error":{}}', { status: 500 }));
    assert.equal((await req('POST', '/api/store/orders', { items: [{ id: 'oil-cow-ghee-500', qty: 1 }], address }, as(buyer))).status, 502);
    const list = await (await req('GET', '/api/store/orders', undefined, as(buyer))).json();
    assert.equal(list.orders.length, 2);
  } finally {
    delete process.env.RAZORPAY_KEY_ID;
    delete process.env.RAZORPAY_KEY_SECRET;
    market.setMarketFetch(() => { throw new Error('network disabled in tests'); });
  }
});

test('services list', async () => {
  const s = await (await req('GET', '/api/services')).json();
  assert.equal(s.length, 17);
  assert.ok(s.find((x) => x.id === 'gomatha_pooja' && x.ta));
});

let priestId;
test('priest register → hidden until admin verifies → public without phone', async () => {
  assert.equal((await req('POST', '/api/priests/register', {})).status, 401);
  const profile = {
    name: 'Ramanathan Sastrigal', phone: '9876500002', city: 'Chennai', languages: ['Tamil', 'Sanskrit'],
    services: ['homam', 'graha_pravesam', 'gomatha_pooja'], experience_years: 22, about: 'Vaideeka purohit, Mylapore.',
  };
  assert.equal((await req('POST', '/api/priests/register', { ...profile, services: ['bogus'] }, as(priestUser))).status, 400);
  assert.equal((await req('POST', '/api/priests/register', { ...profile, experience_years: 200 }, as(priestUser))).status, 400);
  assert.equal((await req('POST', '/api/priests/register', { ...profile, languages: [] }, as(priestUser))).status, 400);
  const res = await req('POST', '/api/priests/register', profile, as(priestUser));
  assert.equal(res.status, 201);
  const { priest } = await res.json();
  assert.equal(priest.status, 'pending');
  priestId = priest.id;

  assert.deepEqual((await (await req('GET', '/api/priests')).json()).priests, []);
  const pending = await (await req('GET', '/api/admin/priests?status=pending', undefined, ADMIN)).json();
  assert.equal(pending.priests.length, 1);
  assert.equal(pending.priests[0].phone, '+919876500002');

  const v = await req('POST', `/api/admin/priests/${priestId}/status`, { status: 'verified' }, ADMIN);
  assert.equal(v.status, 200);
  assert.equal((await req('POST', `/api/admin/priests/${priestId}/status`, { status: 'famous' }, ADMIN)).status, 400);
  assert.equal((await req('POST', '/api/admin/priests/nope/status', { status: 'verified' }, ADMIN)).status, 404);

  const pub = (await (await req('GET', '/api/priests')).json()).priests;
  assert.equal(pub.length, 1);
  assert.deepEqual(Object.keys(pub[0]).sort(), ['about', 'city', 'experience_years', 'id', 'languages', 'name', 'services']);
  assert.ok(!JSON.stringify(pub).includes('9876500002'));
  assert.equal((await (await req('GET', '/api/priests?service=homam&city=chennai')).json()).priests.length, 1);
  assert.equal((await (await req('GET', '/api/priests?service=marriage')).json()).priests.length, 0);
  assert.equal((await (await req('GET', '/api/priests?city=Madurai')).json()).priests.length, 0);
  assert.equal((await req('GET', '/api/priests?service=bogus')).status, 400);

  // Re-submitting updates the same profile and resets to pending
  const again = await req('POST', '/api/priests/register', { ...profile, city: 'Chennai', about: 'Updated' }, as(priestUser));
  assert.equal(again.status, 200);
  assert.equal((await again.json()).priest.id, priestId);
  assert.equal((await (await req('GET', '/api/priests')).json()).priests.length, 0);
  await req('POST', `/api/admin/priests/${priestId}/status`, { status: 'verified' }, ADMIN);
});

let serviceReqId;
test('service + annadhanam + temple requests: create and list', async () => {
  assert.equal((await req('POST', '/api/requests', { type: 'service' })).status, 401);
  const base = { date: future(), city: 'Chennai', contactPhone: '9876500001' };
  const r1 = await req('POST', '/api/requests', { ...base, type: 'service', service: 'gomatha_pooja', time: '07:30', people: 6, notes: 'Near Kapaleeswarar temple' }, as(buyer));
  assert.equal(r1.status, 201);
  const { request } = await r1.json();
  assert.equal(request.status, 'requested');
  assert.equal(request.service, 'gomatha_pooja');
  assert.equal(request.contactPhone, '+919876500001');
  serviceReqId = request.id;

  const r2 = await req('POST', '/api/requests', { ...base, type: 'annadhanam', meals: 108 }, as(buyer));
  assert.equal(r2.status, 201);
  const ann = (await r2.json()).request;
  assert.equal(ann.meals, 108);
  assert.equal(ann.amount, null);

  process.env.ANNADHANAM_RATE = '60';
  try {
    const r3 = await (await req('POST', '/api/requests', { ...base, type: 'annadhanam', meals: 50 }, as(buyer))).json();
    assert.equal(r3.request.amount, 3000);
  } finally { delete process.env.ANNADHANAM_RATE; }

  const r4 = await req('POST', '/api/requests', { ...base, type: 'temple_booking', templeId: 'kapaleeswarar-mylapore', service: 'archanai' }, as(buyer));
  assert.equal(r4.status, 201);

  const bad = async (body) => assert.equal((await req('POST', '/api/requests', { ...base, ...body }, as(buyer))).status, 400, JSON.stringify(body));
  await bad({ type: 'other' });
  await bad({ type: 'service', service: 'bogus' });
  await bad({ type: 'service', service: 'archanai', date: '2026-02-30' });
  await bad({ type: 'service', service: 'archanai', date: '2020-01-01' });
  await bad({ type: 'service', service: 'archanai', time: '25:00' });
  await bad({ type: 'service', service: 'archanai', notes: 'x'.repeat(501) });
  await bad({ type: 'service', service: 'archanai', contactPhone: '12' });
  await bad({ type: 'service', service: 'archanai', priestId: 'nope' });
  await bad({ type: 'annadhanam', meals: 0 });
  await bad({ type: 'annadhanam', meals: 10001 });
  await bad({ type: 'temple_booking' });

  const mine = (await (await req('GET', '/api/requests', undefined, as(buyer))).json()).requests;
  assert.equal(mine.length, 4);
  assert.equal((await (await req('GET', '/api/requests', undefined, as(priestUser))).json()).requests.length, 0);
});

test('admin assigns a request to a priest; the priest sees it', async () => {
  assert.equal((await req('GET', '/api/priests/me/requests', undefined, as(buyer))).status, 404);
  assert.deepEqual((await (await req('GET', '/api/priests/me/requests', undefined, as(priestUser))).json()).requests, []);

  assert.equal((await req('POST', `/api/admin/requests/${serviceReqId}/status`, { status: 'assigned' }, ADMIN)).status, 400);
  const a = await req('POST', `/api/admin/requests/${serviceReqId}/status`, { status: 'assigned', priestId }, ADMIN);
  assert.equal(a.status, 200);
  assert.equal((await a.json()).request.priestId, priestId);

  const seen = (await (await req('GET', '/api/priests/me/requests', undefined, as(priestUser))).json()).requests;
  assert.equal(seen.length, 1);
  assert.equal(seen[0].id, serviceReqId);
  assert.equal(seen[0].status, 'assigned');

  const all = (await (await req('GET', '/api/admin/requests', undefined, ADMIN)).json()).requests;
  assert.equal(all.length, 4);
});

test('admin orders: list and status change', async () => {
  const { orders } = await (await req('GET', '/api/admin/orders', undefined, ADMIN)).json();
  assert.equal(orders.length, 2);
  const res = await req('POST', `/api/admin/orders/${orders[0].id}/status`, { status: 'shipped' }, ADMIN);
  assert.equal(res.status, 200);
  assert.equal((await res.json()).order.status, 'shipped');
  assert.equal((await req('POST', `/api/admin/orders/${orders[0].id}/status`, { status: 'lost' }, ADMIN)).status, 400);
});

test('admin auth: 401 without token, 403 wrong token, 503 when ADMIN_TOKEN unset', async () => {
  for (const path of ['/api/admin/priests', '/api/admin/orders', '/api/admin/requests']) {
    assert.equal((await req('GET', path)).status, 401);
    assert.equal((await req('GET', path, undefined, { 'x-admin-token': 'admin-tesx' })).status, 403);
    assert.equal((await req('GET', path, undefined, { 'x-admin-token': 'a' })).status, 403);
  }
  assert.equal((await req('POST', `/api/admin/priests/${priestId}/status`, { status: 'rejected' }, { 'x-admin-token': 'bad' })).status, 403);
  delete process.env.ADMIN_TOKEN;
  try {
    assert.equal((await req('GET', '/api/admin/orders', undefined, ADMIN)).status, 503);
  } finally { process.env.ADMIN_TOKEN = 'admin-test'; }
});

test('fulfilment tracking: history, priest accepts or declines, customer sees every step', async () => {
  const ok = await req('POST', `/api/priests/me/requests/${serviceReqId}/respond`, { decision: 'accept' }, as(priestUser));
  assert.equal(ok.status, 200);
  assert.equal((await ok.json()).request.status, 'assigned');
  assert.equal((await req('POST', `/api/priests/me/requests/${serviceReqId}/respond`, { decision: 'maybe' }, as(priestUser))).status, 400);
  const dec = await (await req('POST', `/api/priests/me/requests/${serviceReqId}/respond`, { decision: 'decline' }, as(priestUser))).json();
  assert.equal(dec.request.status, 'confirmed');
  assert.equal(dec.request.priestId, null);
  const mine = (await (await req('GET', '/api/requests', undefined, as(buyer))).json()).requests.find((r) => r.id === serviceReqId);
  assert.deepEqual(mine.history.map((h) => h.status), ['requested', 'assigned', 'accepted', 'declined']);
});

test('stock: paid and recently held orders reduce what is left; the last items cannot be sold twice', async () => {
  const before = (await (await req('GET', '/api/store/products')).json()).products.find((p) => p.id === 'lamp-kuthu-vilakku-18').stock;
  const r1 = await req('POST', '/api/store/orders', { items: [{ id: 'lamp-kuthu-vilakku-18', qty: before - 1 }], address }, as(buyer));
  assert.equal(r1.status, 201);
  const left = (await (await req('GET', '/api/store/products')).json()).products.find((p) => p.id === 'lamp-kuthu-vilakku-18').stock;
  assert.equal(left, 1);
  const r2 = await req('POST', '/api/store/orders', { items: [{ id: 'lamp-kuthu-vilakku-18', qty: 2 }], address }, as(buyer));
  assert.equal(r2.status, 400);
  assert.match((await r2.json()).error, /Only 1 left/);
});
