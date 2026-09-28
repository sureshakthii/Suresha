import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.DB_PATH = ':memory:';
process.env.AUTH_DEV_MODE = '1';
process.env.AUTH_SECRET = 'test-secret';
for (const k of ['FACEBOOK_APP_ID', 'FACEBOOK_APP_SECRET', 'PUBLIC_URL', 'TWILIO_ACCOUNT_SID', 'MSG91_AUTH_KEY', 'SMTP_URL']) delete process.env[k];

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
  redirect: 'manual',
  headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
  body: body === undefined ? undefined : JSON.stringify(body),
});
const post = (path, body, cookie) => req('POST', path, body, cookie);
const sessionCookie = (res) => {
  const c = res.headers.getSetCookie().find((s) => s.startsWith('kj_session='));
  return c && c.split(';')[0];
};

async function login(channel, to, name) {
  const r = await (await post('/api/auth/otp/request', { channel, to })).json();
  const res = await post('/api/auth/otp/verify', { channel, to, code: r.devCode, name });
  assert.equal(res.status, 200);
  return { cookie: sessionCookie(res), user: (await res.json()).user };
}

test('providers endpoint reports dev mode', async () => {
  const p = await (await fetch(`${base}/api/auth/providers`)).json();
  assert.deepEqual(p, { sms: 'dev', email: 'dev', facebook: false, devMode: true });
});

test('invalid phone and email are rejected with 400', async () => {
  for (const to of ['12345', '5123456789', 'abc', '+0123']) {
    const res = await post('/api/auth/otp/request', { channel: 'sms', to });
    assert.equal(res.status, 400, to);
    assert.match((await res.json()).error, /mobile number/);
  }
  assert.equal((await post('/api/auth/otp/request', { channel: 'email', to: 'nope@' })).status, 400);
  assert.equal((await post('/api/auth/otp/request', { channel: 'fax', to: 'x' })).status, 400);
});

test('phone OTP: masked number, wrong code, lockout after 5 attempts', async () => {
  const res = await post('/api/auth/otp/request', { channel: 'sms', to: '98765 43210' });
  assert.equal(res.status, 200);
  const r = await res.json();
  assert.equal(r.sent, true);
  assert.equal(r.channel, 'sms');
  assert.match(r.devCode, /^\d{6}$/);
  assert.equal(r.to, '+91******3210');
  assert.ok(!r.to.includes('98765'));

  const wrong = r.devCode === '000000' ? '111111' : '000000';
  for (let i = 0; i < 5; i++) {
    assert.equal((await post('/api/auth/otp/verify', { channel: 'sms', to: '9876543210', code: wrong })).status, 401);
  }
  // Locked: even the right code is refused until a new OTP is requested
  assert.equal((await post('/api/auth/otp/verify', { channel: 'sms', to: '9876543210', code: r.devCode })).status, 429);
});

let phoneCookie, phoneUser;
test('correct code sets cookie and /api/auth/me returns the user', async () => {
  const r = await (await post('/api/auth/otp/request', { channel: 'sms', to: '+919876543210' })).json();
  const res = await post('/api/auth/otp/verify', { channel: 'sms', to: '9876543210', code: r.devCode, name: 'Suresh' });
  assert.equal(res.status, 200);
  const set = res.headers.getSetCookie().find((s) => s.startsWith('kj_session='));
  assert.match(set, /HttpOnly/);
  assert.match(set, /SameSite=Lax/);
  assert.match(set, /Max-Age=2592000/);
  phoneCookie = set.split(';')[0];
  phoneUser = (await res.json()).user;
  assert.deepEqual(phoneUser, { id: phoneUser.id, name: 'Suresh', phone: '+919876543210', email: null, hasFacebook: false });

  // Code is single-use
  assert.equal((await post('/api/auth/otp/verify', { channel: 'sms', to: '9876543210', code: r.devCode })).status, 401);

  const me = await req('GET', '/api/auth/me', undefined, phoneCookie);
  assert.equal(me.status, 200);
  assert.deepEqual((await me.json()).user, phoneUser);
  assert.equal((await fetch(`${base}/api/auth/me`)).status, 401);

  // Logging in again finds the same user
  const again = await login('sms', '9876543210');
  assert.equal(again.user.id, phoneUser.id);
});

test('PUT/GET /api/me/data roundtrip', async () => {
  assert.equal((await req('GET', '/api/me/data')).status, 401);
  assert.equal((await req('PUT', '/api/me/data', { data: {} })).status, 401);

  const empty = await (await req('GET', '/api/me/data', undefined, phoneCookie)).json();
  assert.deepEqual(empty, { data: {}, updatedAt: null });

  const data = { profiles: [{ name: 'அம்மா', date: '1960-05-01', time: '06:30' }], settings: { lang: 'ta' } };
  const put = await req('PUT', '/api/me/data', { data }, phoneCookie);
  assert.equal(put.status, 200);
  const { ok, updatedAt } = await put.json();
  assert.equal(ok, true);
  const got = await (await req('GET', '/api/me/data', undefined, phoneCookie)).json();
  assert.deepEqual(got, { data, updatedAt });

  assert.equal((await req('PUT', '/api/me/data', { data: [1, 2] }, phoneCookie)).status, 400);
  assert.equal((await req('PUT', '/api/me/data', { data: 'x' }, phoneCookie)).status, 400);
});

test('email OTP creates a different user', async () => {
  const r = await (await post('/api/auth/otp/request', { channel: 'email', to: 'Suresh@Example.com' })).json();
  assert.equal(r.to, 's*****@example.com');
  const { user, cookie } = await login('email', 'suresh@example.com');
  assert.notEqual(user.id, phoneUser.id);
  assert.equal(user.email, 'suresh@example.com');
  assert.equal(user.phone, null);
  // Separate data space
  const d = await (await req('GET', '/api/me/data', undefined, cookie)).json();
  assert.deepEqual(d.data, {});
});

test('logout clears the session', async () => {
  const { cookie } = await login('sms', '+14155550100');
  assert.equal((await req('GET', '/api/auth/me', undefined, cookie)).status, 200);
  const res = await post('/api/auth/logout', {}, cookie);
  assert.deepEqual(await res.json(), { ok: true });
  assert.match(res.headers.getSetCookie().find((s) => s.startsWith('kj_session=')), /Max-Age=0/);
  assert.equal((await req('GET', '/api/auth/me', undefined, cookie)).status, 401);
});

test('rate limit: 6th OTP request for the same number in an hour → 429', async () => {
  for (let i = 0; i < 5; i++) {
    assert.equal((await post('/api/auth/otp/request', { channel: 'sms', to: '9000000001' })).status, 200);
  }
  const res = await post('/api/auth/otp/request', { channel: 'sms', to: '9000000001' });
  assert.equal(res.status, 429);
  assert.ok((await res.json()).error);
});

test('facebook start → 501 when unconfigured; callback without state fails safely', async () => {
  const res = await fetch(`${base}/api/auth/facebook/start`, { redirect: 'manual' });
  assert.equal(res.status, 501);
  assert.ok((await res.json()).error);
  const cb = await fetch(`${base}/api/auth/facebook/callback?code=x&state=y`, { redirect: 'manual' });
  assert.equal(cb.status, 302);
  assert.equal(cb.headers.get('location'), '/#login-failed');
});
