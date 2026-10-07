// Payment currencies: exactly INR (India), AED (United Arab Emirates) and USD (every other country), decided on the
// server from the residence country; Razorpay for INR only, Stripe for AED and USD.
import { test, before, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

process.env.DB_PATH = ':memory:';
process.env.AUTH_DEV_MODE = '1';
process.env.AUTH_SECRET = 't';
process.env.ADMIN_TOKEN = 'admin-test';
process.env.RATE_LIMITS = 'off'; // this file makes ~60 checkouts from one IP
const GATEWAY_ENV = ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'PUBLIC_URL'];
for (const k of [...GATEWAY_ENV, 'BILLING_ENFORCE', 'TRIAL_HOURS', 'ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN', 'TWILIO_ACCOUNT_SID', 'MSG91_AUTH_KEY', 'SMTP_URL']) delete process.env[k];
for (const k of Object.keys(process.env)) if (k.startsWith('PRICE_')) delete process.env[k];

const cur = await import('../shared/currency.js');
const noNetwork = () => { throw new Error('network disabled in tests'); };
let server, base, billing, inUser, aeUser, gbUser;
before(async () => {
  billing = await import('../server/billing.js');
  billing.setBillingFetch(noNetwork);
  const { createApp } = await import('../server/index.js');
  server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
  inUser = await login('9876500101', 'Kumar');
  aeUser = await login('+971501234567', 'Fathima');
  gbUser = await login('+447700900123', 'Ravi');
});
after(() => server.close());
afterEach(() => { for (const k of GATEWAY_ENV) delete process.env[k]; billing.setBillingFetch(noNetwork); });

const req = (method, path, body, headers = {}) => fetch(base + path, {
  method, headers: { 'Content-Type': 'application/json', ...headers }, body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
});
const as = (cookie) => ({ Cookie: cookie });
async function login(to, name) {
  const r = await (await req('POST', '/api/auth/otp/request', { channel: 'sms', to })).json();
  const res = await req('POST', '/api/auth/otp/verify', { channel: 'sms', to, code: r.devCode, name });
  assert.equal(res.status, 200);
  return res.headers.getSetCookie().find((s) => s.startsWith('kj_session=')).split(';')[0];
}
const checkout = (cookie, b) => req('POST', '/api/billing/checkout', b, as(cookie));
const BUYABLE = ['personal_month', 'personal_year', 'family_month', 'family_year', 'marriage_package', 'journey_package'];
const SCOPE = { marriage_package: { pairId: 'aa1+bb2' }, journey_package: { journeyId: 'trip_1' } };
/** Gateways mocked: records every call; Razorpay orders and Stripe sessions / refunds succeed. */
function mockGateways() {
  const calls = [];
  let n = 0;
  billing.setBillingFetch(async (url, opts) => {
    calls.push({ url: String(url), opts });
    if (String(url).includes('razorpay')) return new Response(JSON.stringify({ id: `order_${++n}`, amount: JSON.parse(opts.body).amount }), { status: 200 });
    if (String(url).endsWith('/v1/refunds')) return new Response(JSON.stringify({ id: `re_${++n}`, status: 'succeeded' }), { status: 200 });
    return new Response(JSON.stringify({ id: `cs_${++n}`, url: `https://checkout.stripe.com/c/pay/cs_${n}` }), { status: 200 });
  });
  return calls;
}
const stripeSign = (payload, secret = 'whsec_aed') => { const t = Math.floor(Date.now() / 1000); return `t=${t},v1=${crypto.createHmac('sha256', secret).update(`${t}.${payload}`).digest('hex')}`; };
const stripeHook = (event) => { const raw = JSON.stringify(event); return req('POST', '/api/billing/stripe/webhook', raw, { 'Stripe-Signature': stripeSign(raw) }); };
const me = async (cookie) => (await req('GET', '/api/billing/me', undefined, as(cookie))).json();

test('country → payment currency: IN → INR, AE → AED, everyone else → USD; gateways', () => {
  assert.deepEqual(cur.PAY_CURRENCIES, ['INR', 'AED', 'USD']);
  assert.equal(cur.payCurrencyFor('IN'), 'INR');
  assert.equal(cur.payCurrencyFor('in'), 'INR');
  assert.equal(cur.payCurrencyFor('AE'), 'AED');
  for (const cc of ['US', 'GB', 'SG', 'MY', 'LK', 'CA', 'AU', 'QA', 'SA', 'DE', '', null, undefined]) assert.equal(cur.payCurrencyFor(cc), 'USD', String(cc));
  assert.equal(cur.payGateway('INR'), 'razorpay');
  assert.equal(cur.payGateway('AED'), 'stripe');
  assert.equal(cur.payGateway('USD'), 'stripe');
  // Residence first, then the phone's country, then the device.
  assert.deepEqual(cur.payCountry({ residenceCc: 'AE', phoneCc: 'IN', deviceCc: 'GB' }), { cc: 'AE', source: 'residence' });
  assert.deepEqual(cur.payCountry({ residenceCc: null, phoneCc: 'in', deviceCc: 'GB' }), { cc: 'IN', source: 'phone' });
  assert.deepEqual(cur.payCountry({ residenceCc: 'ZZ', deviceCc: 'GB' }), { cc: 'GB', source: 'device' });
});

test('price display: ₹1,999 · AED 179 · $4.99 / $49 (same text in Tamil and English)', () => {
  assert.equal(cur.formatPrice(1999, 'INR'), '₹1,999');
  assert.equal(cur.formatPrice(199, 'INR'), '₹199');
  assert.equal(cur.formatPrice(179, 'AED'), 'AED 179');
  assert.equal(cur.formatPrice(1250, 'AED'), 'AED 1,250');
  assert.equal(cur.formatPrice(18.5, 'AED'), 'AED 18.50');
  assert.equal(cur.formatPrice(4.99, 'USD'), '$4.99');
  assert.equal(cur.formatPrice(49, 'USD'), '$49');
  assert.equal(cur.formatPrice(19.99, 'USD'), '$19.99');
  assert.equal(cur.toMinor(4.99), 499);
  assert.equal(cur.toMinor(179), 17900);
});

test('price table is complete: every plan and package in INR, AED and USD; nothing else', () => {
  const expected = {
    personal_month: { INR: 199, AED: 18, USD: 4.99 }, personal_year: { INR: 1999, AED: 179, USD: 49 },
    family_month: { INR: 399, AED: 36, USD: 9.99 }, family_year: { INR: 3999, AED: 359, USD: 99 },
    marriage_package: { INR: 499, AED: 33, USD: 9 }, journey_package: { INR: 299, AED: 22, USD: 6 },
  };
  for (const p of billing.PLANS) {
    assert.deepEqual(Object.keys(p.price), ['INR', 'AED', 'USD'], p.id);
    if (p.id === 'free') continue;
    assert.deepEqual(p.price, expected[p.id], p.id);
    for (const c of ['INR', 'AED', 'USD']) assert.ok(Number.isFinite(p.price[c]) && p.price[c] > 0, `${p.id} ${c}`);
    assert.ok(p.price.AED >= 2, 'above Stripe’s AED 2.00 minimum');
  }
  assert.deepEqual(billing.PLANS.filter((p) => p.id !== 'free').map((p) => p.id), BUYABLE);
  // AED prices follow the PRICE_{CUR}_{PLAN} pattern and can be changed without code changes.
  const out = execFileSync(process.execPath, ['--no-warnings', '-e', "import('./server/billing.js').then((b) => console.log(b.PLANS.find((x) => x.id === 'personal_month').price.AED, b.PLANS.find((x) => x.id === 'journey_package').price.AED, b.PLANS.find((x) => x.id === 'personal_year').price.AED))"],
    { env: { ...process.env, PRICE_AED_PERSONAL_MONTH: '19', PRICE_AED_JOURNEY_PACKAGE: '25', PRICE_AED_PREMIUM_YEAR: '189' }, encoding: 'utf8' });
  assert.equal(out.trim(), '19 25 189');
});

test('GET /billing/plans follows the country: IN → ₹, AE → AED, GB → $; a mismatched or fourth currency is refused', async () => {
  const get = async (q) => (await req('GET', `/api/billing/plans${q}`)).json();
  const ae = await get('?country=AE');
  assert.equal(ae.country, 'AE');
  assert.equal(ae.currency, 'AED');
  assert.equal(ae.gateway, 'stripe');
  assert.deepEqual(ae.currencies, ['INR', 'AED', 'USD']);
  assert.equal(ae.plans.find((p) => p.id === 'personal_year').amount, 179);
  assert.equal(ae.plans.find((p) => p.id === 'personal_year').display, 'AED 179');
  assert.equal(ae.plans.find((p) => p.id === 'marriage_package').display, 'AED 33');
  const inr = await get('?country=in');
  assert.equal(inr.currency, 'INR');
  assert.equal(inr.gateway, 'razorpay');
  assert.equal(inr.plans.find((p) => p.id === 'family_year').display, '₹3,999');
  const gb = await get('?country=GB');
  assert.equal(gb.currency, 'USD');
  assert.equal(gb.plans.find((p) => p.id === 'personal_month').display, '$4.99');
  // Signed in with a UAE phone and no country sent → AED.
  assert.equal((await (await req('GET', '/api/billing/plans', undefined, as(aeUser))).json()).currency, 'AED');
  assert.equal((await req('GET', '/api/billing/plans?country=AE&currency=USD')).status, 400);
  assert.equal((await req('GET', '/api/billing/plans?country=XX')).status, 400);
  assert.equal((await req('GET', '/api/billing/plans?currency=GBP')).status, 400);
  assert.equal((await req('GET', '/api/billing/plans?currency=SGD')).status, 400);
});

test('checkout: the server decides the currency from the country and refuses a mismatch; client prices are ignored', async () => {
  const bad = async (b, cookie = inUser) => { const r = await checkout(cookie, b); assert.equal(r.status, 400, JSON.stringify(b)); return (await r.json()).error; };
  assert.match(await bad({ plan: 'personal_month', country: 'AE', currency: 'USD' }), /United Arab Emirates are in AED, not USD/);
  assert.match(await bad({ plan: 'personal_month', country: 'IN', currency: 'AED' }), /in INR, not AED/);
  assert.match(await bad({ plan: 'personal_month', country: 'GB', currency: 'INR' }), /in USD, not INR/);
  await bad({ plan: 'personal_month', country: 'US', currency: 'EUR' });
  await bad({ plan: 'personal_month', country: 'Narnia' });
  await bad({ plan: 'personal_month', country: 'XX' });
  // No country: the account phone's country decides (Indian number → INR only).
  await bad({ plan: 'personal_month', currency: 'USD' });
  await bad({ plan: 'personal_month', currency: 'INR' }, aeUser);

  const ok = await (await checkout(inUser, { plan: 'personal_month', country: 'AE', amount: 1, price: { AED: 1 } })).json();
  assert.equal(ok.status, 'payment_setup_pending');
  assert.equal(ok.currency, 'AED');
  assert.equal(ok.amount, 1800, 'AED 18.00 in fils — never the client-sent price');
  // The person can change residence: a UAE phone living in India pays in rupees.
  const moved = await (await checkout(aeUser, { plan: 'personal_year', country: 'IN', currency: 'INR' })).json();
  assert.deepEqual([moved.currency, moved.amount], ['INR', 199900]);
});

test('Razorpay only for INR; Stripe only for AED and USD (with both gateways configured)', async () => {
  process.env.RAZORPAY_KEY_ID = 'rzp_test_key';
  process.env.RAZORPAY_KEY_SECRET = 'rzp_secret';
  process.env.STRIPE_SECRET_KEY = 'sk_test_aed';
  process.env.PUBLIC_URL = 'https://thunai.example.com';
  const calls = mockGateways();
  for (const [country, gateway, currency] of [['IN', 'razorpay', 'INR'], ['AE', 'stripe', 'AED'], ['GB', 'stripe', 'USD'], ['SG', 'stripe', 'USD'], ['MY', 'stripe', 'USD'], ['LK', 'stripe', 'USD'], ['CA', 'stripe', 'USD'], ['US', 'stripe', 'USD']]) {
    for (const plan of BUYABLE) {
      calls.length = 0;
      const out = await (await checkout(gbUser, { plan, country, ...(SCOPE[plan] ? { scope: SCOPE[plan] } : {}) })).json();
      assert.equal(out.gateway, gateway, `${country} ${plan}`);
      assert.equal(calls.length, 1);
      const want = Math.round(billing.PLANS.find((p) => p.id === plan).price[currency] * 100);
      if (gateway === 'razorpay') {
        assert.ok(calls[0].url.startsWith('https://api.razorpay.com/'));
        assert.deepEqual(JSON.parse(calls[0].opts.body), { amount: want, currency: 'INR', receipt: out.subscriptionId });
        assert.equal(out.currency, 'INR');
      } else {
        assert.equal(calls[0].url, 'https://api.stripe.com/v1/checkout/sessions');
        const form = new URLSearchParams(calls[0].opts.body);
        assert.equal(form.get('line_items[0][price_data][currency]'), currency.toLowerCase());
        assert.equal(form.get('line_items[0][price_data][unit_amount]'), String(want));
        assert.equal(form.get('metadata[currency]'), currency);
        assert.equal(form.get('metadata[country]'), country);
      }
    }
  }
  // Only Razorpay configured: an AED buyer is NOT sent to Razorpay.
  delete process.env.STRIPE_SECRET_KEY;
  calls.length = 0;
  const pending = await (await checkout(aeUser, { plan: 'family_year', country: 'AE' })).json();
  assert.equal(pending.status, 'payment_setup_pending');
  assert.equal(calls.length, 0);
  // Only Stripe configured: an INR buyer is NOT sent to Stripe.
  delete process.env.RAZORPAY_KEY_ID; delete process.env.RAZORPAY_KEY_SECRET;
  process.env.STRIPE_SECRET_KEY = 'sk_test_aed';
  calls.length = 0;
  assert.equal((await (await checkout(inUser, { plan: 'family_year', country: 'IN' })).json()).status, 'payment_setup_pending');
  assert.equal(calls.length, 0);
});

test('Stripe AED: checkout body in fils, webhook activates, wrong amount does not, refund (admin and webhook) revokes', async () => {
  process.env.STRIPE_SECRET_KEY = 'sk_test_aed';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_aed';
  const calls = mockGateways();
  const res = await checkout(aeUser, { plan: 'personal_year', country: 'AE', currency: 'AED' });
  assert.equal(res.status, 200);
  const co = await res.json();
  const form = new URLSearchParams(calls[0].opts.body);
  assert.equal(form.get('line_items[0][price_data][currency]'), 'aed');
  assert.equal(form.get('line_items[0][price_data][unit_amount]'), '17900'); // AED 179.00 = 17,900 fils
  assert.equal(form.get('client_reference_id'), co.subscriptionId);

  const session = (over = {}) => ({ id: `evt_${crypto.randomUUID()}`, type: 'checkout.session.completed', data: { object: { id: 'cs_x', client_reference_id: co.subscriptionId, metadata: { subscription_id: co.subscriptionId }, payment_intent: 'pi_aed_1', currency: 'aed', amount_total: 17900, ...over } } });
  // Charged in another currency or another amount → not activated.
  assert.equal((await stripeHook(session({ currency: 'usd' }))).status, 200);
  assert.equal((await stripeHook(session({ amount_total: 100 }))).status, 200);
  assert.equal((await me(aeUser)).plan, 'free');
  assert.equal((await stripeHook(session())).status, 200);
  const m = await me(aeUser);
  assert.equal(m.plan, 'personal_year');
  assert.deepEqual([m.lastPayment.currency, m.lastPayment.amount, m.lastPayment.display, m.lastPayment.plan], ['AED', 179, 'AED 179', 'personal_year']);
  const sub = (await (await req('GET', '/api/admin/billing/subscriptions', undefined, { 'x-admin-token': 'admin-test' })).json()).subscriptions.find((s) => s.id === co.subscriptionId);
  assert.deepEqual([sub.currency, sub.amountMinor, sub.country, sub.gateway], ['AED', 17900, 'AE', 'stripe']);

  // Admin refund goes to Stripe's refunds API, in fils, against the payment intent.
  calls.length = 0;
  const r = await req('POST', '/api/admin/billing/refund', { subscriptionId: co.subscriptionId }, { 'x-admin-token': 'admin-test' });
  assert.equal(r.status, 200);
  assert.equal((await r.json()).subscription.status, 'refunded');
  assert.equal(calls[0].url, 'https://api.stripe.com/v1/refunds');
  const rf = new URLSearchParams(calls[0].opts.body);
  assert.deepEqual([rf.get('payment_intent'), rf.get('amount')], ['pi_aed_1', '17900']);
  assert.equal((await me(aeUser)).plan, 'free');

  // A refund made in the Stripe dashboard arrives as charge.refunded and revokes the plan.
  const co2 = await (await checkout(aeUser, { plan: 'family_month', country: 'AE' })).json();
  await stripeHook({ id: 'evt_c2', type: 'checkout.session.completed', data: { object: { client_reference_id: co2.subscriptionId, payment_intent: 'pi_aed_2', currency: 'aed', amount_total: 3600 } } });
  assert.equal((await me(aeUser)).plan, 'family_month');
  await stripeHook({ id: 'evt_r2', type: 'charge.refunded', data: { object: { payment_intent: 'pi_aed_2', currency: 'aed', amount_refunded: 1000 } } });
  assert.equal((await me(aeUser)).plan, 'family_month', 'a partial refund keeps the plan');
  await stripeHook({ id: 'evt_r3', type: 'charge.refunded', data: { object: { payment_intent: 'pi_aed_2', currency: 'aed', amount_refunded: 3600 } } });
  assert.equal((await me(aeUser)).plan, 'free');
});

test('Plans screen: country line with a change-country link, server-decided currency, no INR/USD toggle', () => {
  const src = fs.readFileSync('public/screens-plans.js', 'utf8');
  assert.match(src, /Prices in \$\{CUR_LABEL\[currency\]\} for/);
  assert.match(src, /Change country/);
  assert.match(src, /நாட்டை மாற்று/);
  assert.match(src, /residenceStep\(\)/);
  assert.match(src, /api\(`\/api\/billing\/plans\?country=/);
  assert.match(src, /body: \{ plan, country, currency/);
  assert.ok(!/data-cur=/.test(src), 'no manual currency switch');
  assert.ok(!/\$ \$\{L\('Abroad'/.test(src));
});
