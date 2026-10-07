// Privacy: export, clearing saved profiles and account deletion (adapted after the merge to the previous
// app's API: GET /api/me/export returns { account, savedData, ... } and DELETE /api/me deletes the account).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.DB_PATH = ':memory:';
process.env.AUTH_DEV_MODE = '1';
process.env.AUTH_SECRET = 'test-secret';

let server, base;
before(async () => {
  const { createApp } = await import('../server/index.js');
  server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

const req = (method, path, body, cookie) => fetch(base + path, {
  method,
  headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
  body: body === undefined ? undefined : JSON.stringify(body),
});

async function login(to) {
  const r = await (await req('POST', '/api/auth/otp/request', { channel: 'email', to })).json();
  const res = await req('POST', '/api/auth/otp/verify', { channel: 'email', to, code: r.devCode, name: 'Test' });
  return res.headers.getSetCookie().find((s) => s.startsWith('kj_session=')).split(';')[0];
}

test('export returns the saved profiles; requires sign-in', async () => {
  assert.equal((await req('GET', '/api/me/export')).status, 401);
  const cookie = await login('export@example.com');
  await req('PUT', '/api/me/data', { data: { family: [{ name: 'Amma' }] } }, cookie);
  const res = await req('GET', '/api/me/export', undefined, cookie);
  assert.equal(res.status, 200);
  const out = await res.json();
  assert.equal(out.account.email, 'export@example.com');
  assert.deepEqual(out.savedData, { family: [{ name: 'Amma' }] });
});

test('account deletion erases the user and ends the session', async () => {
  const cookie = await login('delete@example.com');
  await req('PUT', '/api/me/data', { data: { family: [{ name: 'Appa' }] } }, cookie);
  assert.equal((await req('DELETE', '/api/me', undefined, cookie)).status, 200);
  assert.equal((await req('GET', '/api/me/data', undefined, cookie)).status, 401);
  // Signing in again creates a fresh account with no old data.
  const again = await login('delete@example.com');
  assert.deepEqual((await (await req('GET', '/api/me/data', undefined, again)).json()).data, {});
});

test('DELETE /me/data clears saved profiles only', async () => {
  const cookie = await login('clear@example.com');
  await req('PUT', '/api/me/data', { data: { family: [1] } }, cookie);
  assert.equal((await req('DELETE', '/api/me/data', undefined, cookie)).status, 200);
  const r = await (await req('GET', '/api/me/data', undefined, cookie)).json();
  assert.deepEqual(r.data, {});
});

// ---- every table that holds account data is exported (secrets redacted) and covered by deletion ----

async function loginSms(to) {
  const r = await (await req('POST', '/api/auth/otp/request', { channel: 'sms', to })).json();
  const res = await req('POST', '/api/auth/otp/verify', { channel: 'sms', to, code: r.devCode, name: 'Priest Test' });
  return res.headers.getSetCookie().find((s) => s.startsWith('kj_session=')).split(';')[0];
}

async function seedEverything() {
  process.env.SERVICES_OPEN = '1';
  process.env.STORE_ALLOW_SAMPLE = '1';
  const { getDb } = await import('../server/db.js');
  const { recordAiCost } = await import('../server/metrics.js');
  const { upsertSubscription } = await import('../server/push.js');
  const phone = '+919876512345';
  const cookie = await loginSms(phone);
  const me = (await (await req('GET', '/api/auth/me', undefined, cookie)).json()).user;
  const d = getDb();
  await req('PUT', '/api/me/data', { data: { family: [{ name: 'Amma' }] } }, cookie);
  await req('GET', '/api/billing/me', undefined, cookie); // creates billing tables
  d.prepare('INSERT INTO ai_usage (usage_key, day, count) VALUES (?, ?, 3)').run(`u:${me.id}`, '2026-10-01');
  recordAiCost({ userId: me.id, task: 'chat', model: 'm', usage: { input_tokens: 10, output_tokens: 20 } });
  upsertSubscription({ endpoint: 'https://push.example.com/send/SECRET-ENDPOINT', keys: { p256dh: 'SECRET-P256', auth: 'SECRET-AUTH' } }, { morning: true }, me.id);
  await req('POST', '/api/events', { deviceId: 'device-privacy-1', events: [{ type: 'feature_use', feature: 'porutham' }] }, cookie);
  await req('POST', '/api/feedback', { deviceId: 'device-privacy-1', type: 'defect', comment: 'Button did nothing', report: { steps: 'tap', build: 'b1', viewport: '360x780', lang: 'ta' } }, cookie);
  await req('GET', '/api/referral', undefined, cookie); // creates my referral code
  d.prepare('INSERT INTO gift_redemptions (code, user_id, redeemed_at) VALUES (?, ?, ?)').run('KJ-TEST-CODE', me.id, Date.now());
  d.prepare('INSERT INTO referral_claims (user_id, referrer_id, code, referrer_days, created_at) VALUES (?, ?, ?, 7, ?)').run('friend-1', me.id, 'ABCDEF', Date.now());
  d.prepare('INSERT INTO otps (identifier, code_hash, expires_at, attempts, sends, window_start) VALUES (?, ?, ?, 0, 1, ?)').run(phone, 'SECRET-HASH', Date.now() + 60000, Date.now());
  const pr = await req('POST', '/api/priests/register', { name: 'Ramanathan', phone, city: 'Chennai', languages: ['Tamil'], services: ['homam'], experience_years: 10 }, cookie);
  assert.equal(pr.status, 201);
  const date = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
  const rq = await req('POST', '/api/requests', { type: 'service', service: 'homam', date, city: 'Chennai', contactPhone: phone, notes: 'Sankalpam names' }, cookie);
  assert.equal(rq.status, 201);
  const order = await req('POST', '/api/store/orders', { items: [{ id: (await (await req('GET', '/api/store/products')).json()).products[0].id, qty: 1 }], address: { name: 'Test', phone, line1: '12 Main Street', city: 'Chennai', pincode: '600004', state: 'Tamil Nadu' } }, cookie);
  assert.equal(order.status, 201);
  return { cookie, me, phone, d, requestId: (await rq.json()).request.id };
}

test('export covers every table with account data and redacts secrets', async () => {
  const { cookie, me } = await seedEverything();
  const out = await (await req('GET', '/api/me/export', undefined, cookie)).json();
  assert.deepEqual(out.aiUsage, [{ day: '2026-10-01', count: 3 }]);
  assert.equal(out.aiCost.length, 1);
  assert.equal(out.giftRedemptions[0].code, 'KJ-TEST-CODE');
  assert.ok(out.referral.code?.code);
  assert.equal(out.referral.referredCount, 1);
  assert.equal(out.priestProfile.name, 'Ramanathan');
  assert.equal(out.serviceRequests.length, 1);
  assert.deepEqual(out.requestHistory.map((h) => h.status), ['requested', 'awaiting_confirmation']);
  assert.equal(out.storeOrders.length, 1);
  assert.equal(out.storeOrders[0].address.city, 'Chennai');
  assert.equal(out.analyticsEvents[0].type, 'feature_use');
  assert.equal(out.feedback[0].type, 'defect');
  assert.equal(out.pushSubscriptions.length, 1);
  assert.equal(out.pushSubscriptions[0].service, 'push.example.com');
  assert.equal(out.pendingSignInCodes.length, 1);
  const raw = JSON.stringify(out);
  for (const secret of ['SECRET-ENDPOINT', 'SECRET-P256', 'SECRET-AUTH', 'SECRET-HASH']) assert.ok(!raw.includes(secret), `export leaks ${secret}`);
  assert.equal(out.account.id, me.id);
});

test('account deletion removes or de-identifies every table that held the account', async () => {
  const { getDb } = await import('../server/db.js');
  const d = getDb();
  const phone = '+919876512345';
  const cookie = await loginSms(phone);
  const me = (await (await req('GET', '/api/auth/me', undefined, cookie)).json()).user;
  const reqIds = d.prepare('SELECT id FROM service_requests WHERE user_id = ?').all(me.id).map((r) => r.id);
  assert.ok(reqIds.length, 'seeded by the previous test');
  assert.equal((await req('DELETE', '/api/me', undefined, cookie)).status, 200);
  const n = (sql, ...a) => d.prepare(sql).get(...a).n;
  assert.equal(n('SELECT COUNT(*) AS n FROM users WHERE id = ?', me.id), 0);
  assert.equal(n('SELECT COUNT(*) AS n FROM ai_usage WHERE usage_key = ?', `u:${me.id}`), 0);
  assert.equal(n('SELECT COUNT(*) AS n FROM ai_cost WHERE user_id = ?', me.id), 0);
  assert.equal(n('SELECT COUNT(*) AS n FROM ai_cost WHERE user_id IS NULL'), 1, 'cost row kept for accounting, without the user');
  assert.equal(n('SELECT COUNT(*) AS n FROM gift_redemptions WHERE user_id = ?', me.id), 0);
  assert.equal(n('SELECT COUNT(*) AS n FROM referral_codes WHERE user_id = ?', me.id), 0);
  assert.equal(n('SELECT COUNT(*) AS n FROM referral_claims WHERE referrer_id = ?', me.id), 0);
  assert.equal(n('SELECT COUNT(*) AS n FROM priests WHERE user_id = ? OR phone = ?', me.id, phone), 0);
  assert.equal(n(`SELECT COUNT(*) AS n FROM request_events WHERE request_id IN (${reqIds.map(() => '?').join(',')})`, ...reqIds), 0);
  assert.equal(n('SELECT COUNT(*) AS n FROM otps WHERE identifier = ?', phone), 0);
  assert.equal(n('SELECT COUNT(*) AS n FROM push_subs WHERE user_id = ?', me.id), 0);
  assert.equal(n('SELECT COUNT(*) AS n FROM events WHERE user_id = ?', me.id), 0);
  assert.equal(n('SELECT COUNT(*) AS n FROM feedback WHERE user_id = ?', me.id), 0);
  const kept = d.prepare('SELECT user_id, contact_phone, notes FROM service_requests WHERE id = ?').get(reqIds[0]);
  assert.deepEqual({ ...kept }, { user_id: 'deleted', contact_phone: '', notes: '' });
  assert.equal(n("SELECT COUNT(*) AS n FROM store_orders WHERE user_id = ? OR address LIKE '%Main Street%'", me.id), 0);
});
