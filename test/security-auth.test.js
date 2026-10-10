// Security review (docs/SECURITY-REVIEW.md): OTP sign-in, sessions, production guards.
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

process.env.DB_PATH = ':memory:';
process.env.AUTH_DEV_MODE = '1';
process.env.AUTH_SECRET = 'security-test-secret';
for (const k of ['NODE_ENV', 'TWILIO_ACCOUNT_SID', 'MSG91_AUTH_KEY', 'SMTP_URL', 'RATE_LIMITS', 'PUBLIC_URL']) delete process.env[k];

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let server, base, getDb;
before(async () => {
  ({ getDb } = await import('../server/db.js'));
  const { createApp } = await import('../server/index.js');
  server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());
beforeEach(() => { try { getDb().exec('DELETE FROM rate_hits; DELETE FROM otps;'); } catch { /* first run */ } });

const req = async (method, p, body, cookie) => {
  const res = await fetch(base + p, { method, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: res.status, body: await res.json().catch(() => ({})), cookies: res.headers.getSetCookie() };
};
const sessionCookie = (r) => r.cookies.find((c) => c.startsWith('kj_session='));
let phoneSeq = 0;
const nextPhone = () => `98765${String(43000 + ++phoneSeq).padStart(5, '0')}`;
async function signIn(to = nextPhone(), cookie) {
  const r = await req('POST', '/api/auth/otp/request', { channel: 'sms', to });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const v = await req('POST', '/api/auth/otp/verify', { channel: 'sms', to, code: r.body.devCode, name: 'Tester' }, cookie);
  assert.equal(v.status, 200, JSON.stringify(v.body));
  const raw = sessionCookie(v);
  return { raw, cookie: raw.split(';')[0], user: v.body.user, to };
}

test('OTP: 6 random digits, stored only as a keyed hash, single use', async () => {
  const to = nextPhone();
  const codes = new Set();
  for (let i = 0; i < 3; i++) {
    const r = await req('POST', '/api/auth/otp/request', { channel: 'sms', to });
    assert.match(r.body.devCode, /^\d{6}$/);
    codes.add(r.body.devCode);
  }
  assert.ok(codes.size >= 2, 'codes are random');
  const row = getDb().prepare('SELECT * FROM otps').get();
  assert.ok(row.code_hash && !row.code_hash.includes([...codes].pop()), 'only an HMAC is stored');
  assert.equal(row.code_hash.length, 64);
  const last = [...codes].pop();
  assert.equal((await req('POST', '/api/auth/otp/verify', { channel: 'sms', to, code: last })).status, 200);
  assert.equal((await req('POST', '/api/auth/otp/verify', { channel: 'sms', to, code: last })).status, 401, 'a used code cannot sign in again');
});

test('OTP: expired codes are refused; 5 wrong tries end a code', async () => {
  const to = nextPhone();
  const r = await req('POST', '/api/auth/otp/request', { channel: 'sms', to });
  getDb().prepare('UPDATE otps SET expires_at = ?').run(Date.now() - 1);
  assert.equal((await req('POST', '/api/auth/otp/verify', { channel: 'sms', to, code: r.body.devCode })).status, 401);
  const r2 = await req('POST', '/api/auth/otp/request', { channel: 'sms', to });
  const wrong = r2.body.devCode === '000000' ? '111111' : '000000';
  for (let i = 0; i < 5; i++) assert.equal((await req('POST', '/api/auth/otp/verify', { channel: 'sms', to, code: wrong })).status, 401);
  assert.equal((await req('POST', '/api/auth/otp/verify', { channel: 'sms', to, code: r2.body.devCode })).status, 429);
});

test('OTP: a number is locked for the day after 20 wrong codes, even across new codes', async () => {
  const to = nextPhone();
  let code;
  for (let round = 0; round < 4; round++) {
    code = (await req('POST', '/api/auth/otp/request', { channel: 'sms', to })).body.devCode;
    const wrong = code === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i++) await req('POST', '/api/auth/otp/verify', { channel: 'sms', to, code: wrong });
  }
  code = (await req('POST', '/api/auth/otp/request', { channel: 'sms', to })).body.devCode;
  const v = await req('POST', '/api/auth/otp/verify', { channel: 'sms', to, code });
  assert.equal(v.status, 429, 'locked even with the right code');
  const keys = getDb().prepare("SELECT key FROM rate_hits WHERE key LIKE 'otpfail-id:%'").all().map((k) => k.key);
  assert.ok(keys.length && keys.every((k) => !k.includes(to.slice(-6))), 'the number itself is not stored in rate_hits');
});

test('OTP: one IP is limited across many numbers (wrong codes per 15 minutes)', async () => {
  for (let i = 0; i < 30; i++) {
    const to = nextPhone();
    await req('POST', '/api/auth/otp/verify', { channel: 'sms', to, code: '123456' }); // no code requested → 401, not counted
  }
  let blocked = false;
  for (let i = 0; i < 8 && !blocked; i++) {
    const to = nextPhone();
    const c = (await req('POST', '/api/auth/otp/request', { channel: 'sms', to })).body.devCode;
    const wrong = c === '000000' ? '111111' : '000000';
    for (let j = 0; j < 5; j++) if ((await req('POST', '/api/auth/otp/verify', { channel: 'sms', to, code: wrong })).status === 429) blocked = true;
  }
  assert.ok(blocked, 'per-IP wrong-code limit applies');
});

test('OTP: per-number send limit; dev log never prints the full number', async () => {
  const to = nextPhone();
  const lines = [];
  const orig = console.log;
  console.log = (...a) => { lines.push(a.join(' ')); };
  try {
    for (let i = 0; i < 5; i++) assert.equal((await req('POST', '/api/auth/otp/request', { channel: 'sms', to })).status, 200);
    assert.equal((await req('POST', '/api/auth/otp/request', { channel: 'sms', to })).status, 429);
  } finally { console.log = orig; }
  assert.ok(lines.length > 0 && lines.every((l) => !l.includes(to.slice(-10))), lines.join('\n'));
});

test('dev mode (code on screen) can never be on in production', async () => {
  process.env.NODE_ENV = 'production';
  try {
    const p = await req('GET', '/api/auth/providers');
    assert.equal(p.body.devMode, false);
    const r = await req('POST', '/api/auth/otp/request', { channel: 'sms', to: nextPhone() });
    assert.equal(r.status, 503, 'no provider → not configured, never a dev code');
    assert.equal(r.body.devCode, undefined);
  } finally { delete process.env.NODE_ENV; }
});

test('production refuses to start without AUTH_SECRET or with AUTH_DEV_MODE=1', () => {
  const run = (env) => spawnSync(process.execPath, ['server/index.js'], { cwd: root, env: { PATH: process.env.PATH, NODE_ENV: 'production', DB_PATH: ':memory:', PORT: '0', ...env }, encoding: 'utf8', timeout: 20000 });
  const noSecret = run({});
  assert.notEqual(noSecret.status, 0);
  assert.match(noSecret.stderr, /AUTH_SECRET must be set/);
  const dev = run({ AUTH_SECRET: 'x'.repeat(40), AUTH_DEV_MODE: '1', PUBLIC_URL: 'https://thunai.example' });
  assert.notEqual(dev.status, 0);
  assert.match(dev.stderr, /AUTH_DEV_MODE=1 is not allowed/);
  const weak = run({ AUTH_SECRET: 'short', PUBLIC_URL: 'https://thunai.example' });
  assert.match(weak.stderr, /at least 32 characters/);
});

test('session cookie: 256-bit random token, HttpOnly, SameSite=Lax, only its hash stored; Secure in production', async () => {
  const s = await signIn();
  assert.match(s.raw, /HttpOnly/);
  assert.match(s.raw, /SameSite=Lax/);
  assert.match(s.raw, /Path=\//);
  assert.match(s.raw, /Max-Age=\d+/);
  assert.doesNotMatch(s.raw, /Secure/, 'plain-HTTP dev server');
  const token = decodeURIComponent(s.cookie.split('=')[1]);
  assert.ok(Buffer.from(token, 'base64url').length >= 32);
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  assert.ok(getDb().prepare('SELECT 1 FROM sessions WHERE token_hash = ?').get(hash));
  assert.equal(getDb().prepare('SELECT COUNT(*) AS n FROM sessions WHERE token_hash = ?').get(token).n, 0, 'raw token never stored');
  const body = (await req('GET', '/api/auth/me', undefined, s.cookie)).body;
  assert.ok(!JSON.stringify(body).includes(token), 'token never echoed in JSON');
  process.env.NODE_ENV = 'production';
  try {
    const out = await req('POST', '/api/auth/logout', {}, s.cookie);
    assert.match(out.cookies.join(';'), /Secure/);
  } finally { delete process.env.NODE_ENV; }
});

test('sessions: expire, rotate on sign-in, end on logout and logout-all', async () => {
  const a = await signIn();
  assert.equal((await req('GET', '/api/auth/me', undefined, a.cookie)).status, 200);
  // Rotation: signing in again while holding a session replaces it.
  const again = await signIn(a.to, a.cookie);
  assert.notEqual(again.cookie, a.cookie);
  assert.equal((await req('GET', '/api/auth/me', undefined, a.cookie)).status, 401, 'old token revoked on sign-in');
  assert.equal((await req('GET', '/api/auth/me', undefined, again.cookie)).status, 200);
  // Expiry
  getDb().prepare('UPDATE sessions SET expires_at = ? WHERE user_id = ?').run(Date.now() - 1, again.user.id);
  assert.equal((await req('GET', '/api/auth/me', undefined, again.cookie)).status, 401);
  // Logout is server-side (a copied cookie stops working)
  const b = await signIn(a.to);
  await req('POST', '/api/auth/logout', {}, b.cookie);
  assert.equal((await req('GET', '/api/auth/me', undefined, b.cookie)).status, 401);
  // Logout everywhere
  const c1 = await signIn(a.to);
  const c2 = await signIn(a.to);
  const out = await req('POST', '/api/auth/logout-all', {}, c1.cookie);
  assert.equal(out.status, 200);
  assert.ok(out.body.sessionsEnded >= 2);
  assert.equal((await req('GET', '/api/auth/me', undefined, c2.cookie)).status, 401);
  assert.equal((await req('POST', '/api/auth/logout-all', {})).status, 401);
});

test('a forged or malformed cookie is not a session', async () => {
  for (const c of ['kj_session=', 'kj_session=abc', `kj_session=${'A'.repeat(43)}`, 'kj_session=%E0%A4%A', "kj_session=' OR 1=1 --"]) {
    assert.equal((await req('GET', '/api/auth/me', undefined, c)).status, 401, c);
  }
});

test('account deletion ends every session and removes the sign-in records', async () => {
  const a = await signIn();
  const a2 = await signIn(a.to);
  await req('PUT', '/api/me/data', { data: { family: [{ id: 'k1', name: 'Kid', date: '2018-01-01' }] } }, a.cookie);
  await req('POST', '/api/auth/otp/request', { channel: 'sms', to: a.to });
  const del = await req('DELETE', '/api/me', undefined, a.cookie);
  assert.equal(del.status, 200);
  assert.equal((await req('GET', '/api/auth/me', undefined, a2.cookie)).status, 401, 'other devices signed out too');
  const d = getDb();
  assert.equal(d.prepare('SELECT COUNT(*) AS n FROM sessions WHERE user_id = ?').get(a.user.id).n, 0);
  assert.equal(d.prepare('SELECT COUNT(*) AS n FROM users WHERE id = ?').get(a.user.id).n, 0);
  assert.equal(d.prepare('SELECT COUNT(*) AS n FROM user_data WHERE user_id = ?').get(a.user.id).n, 0);
  assert.equal(d.prepare('SELECT COUNT(*) AS n FROM otps WHERE identifier = ?').get(a.user.phone).n, 0);
});

test('a sign-up name cannot carry markup to family members', async () => {
  const to = nextPhone();
  const r = await req('POST', '/api/auth/otp/request', { channel: 'sms', to });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const v = await req('POST', '/api/auth/otp/verify', { channel: 'sms', to, code: r.body.devCode, name: '<img src=x onerror=alert(1)>' });
  assert.ok(!/[<>"]/.test(v.body.user.name), v.body.user.name);
});
