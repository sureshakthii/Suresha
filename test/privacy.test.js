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
