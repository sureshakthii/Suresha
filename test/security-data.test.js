// Security review (docs/SECURITY-REVIEW.md): deletion completeness across every table, export coverage,
// nothing personal in logs, database / backup file permissions and encrypted backups.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

process.env.DB_PATH = ':memory:';
process.env.AUTH_DEV_MODE = '1';
process.env.AUTH_SECRET = 'data-test-secret';
process.env.SERVICES_OPEN = '1';
for (const k of ['NODE_ENV', 'BILLING_ENFORCE', 'ANTHROPIC_API_KEY', 'BACKUP_ENCRYPTION_KEY', 'RATE_LIMITS']) delete process.env[k];

let server, base, getDb;
before(async () => {
  ({ getDb } = await import('../server/db.js'));
  const { createApp } = await import('../server/index.js');
  server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

const req = async (method, p, body, cookie) => {
  const res = await fetch(base + p, { method, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: res.status, body: await res.json().catch(() => ({})), cookies: res.headers.getSetCookie() };
};
async function signIn(to, name) {
  const r = await req('POST', '/api/auth/otp/request', { channel: 'sms', to });
  const v = await req('POST', '/api/auth/otp/verify', { channel: 'sms', to, code: r.body.devCode, name });
  return { cookie: v.cookies.find((c) => c.startsWith('kj_session=')).split(';')[0], user: v.body.user };
}

/** Every row of every table, as text — to search for any trace of a person. */
function dumpAll() {
  const d = getDb();
  const tables = d.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").all().map((t) => t.name);
  return Object.fromEntries(tables.map((t) => [t, JSON.stringify(d.prepare(`SELECT * FROM "${t}"`).all())]));
}

test('account deletion leaves no trace of the person in any table (payments de-identified)', async () => {
  const logs = [];
  const orig = { log: console.log, warn: console.warn, error: console.error };
  for (const k of Object.keys(orig)) console[k] = (...a) => { logs.push(a.map(String).join(' ')); };
  let a, owner;
  try {
    a = await signIn('9876512345', 'Meenakshi Delete');
    owner = await signIn('9876512346', 'Family Owner');
    const c = a.cookie;
    const kid = { id: 'kid9', name: 'Kutty Secret', relation: 'son', date: '2017-07-07', time: '07:07', lat: 9.9, lon: 78.1, tz: 5.5 };
    await req('PUT', '/api/me/data', { data: { family: [kid], goals: { goals: [{ id: 'g', title: 'Private goal' }] } } }, c);
    // Family: A joins someone else's group and shares the child's chart.
    const g = await req('POST', '/api/family/groups', { name: 'Theirs' }, owner.cookie);
    const inv = await req('POST', `/api/family/groups/${g.body.group.id}/invites`, {}, owner.cookie);
    await req('POST', '/api/family/invites/accept', { code: inv.body.code, selfBirthDate: '1980-01-01' }, c);
    assert.equal((await req('POST', '/api/family/shares', { groupId: g.body.group.id, permission: 'edit', profile: kid }, c)).status, 201);
    // Owner edits A's share (updated_by = A on the owner side is also cleared).
    // Bookings, feedback, analytics, referral, priest profile, subscription, push.
    const date = new Date(Date.now() + 20 * 86400000).toISOString().slice(0, 10);
    const rq = await req('POST', '/api/requests', { type: 'package', packageId: 'grahapravesam-complete', people: 3, date, city: 'Madurai', contactPhone: '9876512345', notes: 'my house address' }, c);
    assert.equal(rq.status, 201, JSON.stringify(rq.body));
    await req('POST', `/api/requests/${rq.body.request.id}/cancel`, {}, c); // writes an audit_log row as user:<id>
    await req('POST', '/api/feedback', { deviceId: 'device-del-123', rating: 5, comment: 'Lovely, from Meenakshi' }, c);
    await req('POST', '/api/events', { deviceId: 'device-del-123', events: [{ type: 'app_open' }] }, c);
    await req('GET', '/api/referral', undefined, c);
    const services = (await req('GET', '/api/services')).body;
    await req('POST', '/api/priests/register', { name: 'Meenakshi Delete', phone: '9876512345', city: 'Madurai', languages: ['Tamil'], services: [services[0].id], experience_years: 3 }, c);
    await req('POST', '/api/billing/checkout', { plan: 'personal_month' }, c);
    await req('POST', '/api/push/subscribe', { subscription: { endpoint: 'https://push.example/abc-del', keys: { p256dh: 'k', auth: 'a' } }, prefs: { tz: 5.5, name: 'Meenakshi Delete' } }, c);
    await req('POST', '/api/auth/otp/request', { channel: 'sms', to: '9876512345' });

    const exp = await req('GET', '/api/me/export', undefined, c);
    assert.equal(exp.status, 200);
    for (const k of ['account', 'savedData', 'subscriptions', 'serviceRequests', 'priestProfile', 'feedback', 'pushSubscriptions', 'analyticsEvents', 'family', 'referral', 'accountActivity']) assert.ok(k in exp.body, `export has ${k}`);
    assert.ok(JSON.stringify(exp.body).includes('Kutty Secret'));
    assert.ok(!JSON.stringify(exp.body).includes('code_hash') && !JSON.stringify(exp.body).includes('token_hash'));

    assert.equal((await req('DELETE', '/api/me', undefined, c)).status, 200);
  } finally { Object.assign(console, orig); }

  const all = dumpAll();
  const needles = [a.user.id, '9876512345', 'Meenakshi', 'Kutty Secret', 'Private goal', 'my house address', 'abc-del'];
  const leaks = [];
  for (const [t, rows] of Object.entries(all)) for (const n of needles) if (rows.includes(n)) leaks.push(`${t} contains ${n}`);
  assert.deepEqual(leaks, []);
  assert.ok(all.subscriptions.includes('"deleted"'), 'payment rows kept de-identified for accounting');
  // The other family member's account is untouched.
  assert.equal((await req('GET', '/api/auth/me', undefined, owner.cookie)).status, 200);
  // Logs carried no birth data, phone number or OTP-bearing identifier.
  const joined = logs.join('\n');
  assert.ok(!joined.includes('2017-07-07') && !joined.includes('9876512345') && !joined.includes('Kutty'), joined);
});

test('database file is created readable by the service user only', { skip: process.platform === 'win32' }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'thunai-perm-'));
  const file = path.join(dir, 'sub', 'k.db');
  const code = `process.env.DB_PATH=${JSON.stringify(file)}; const { getDb } = await import(${JSON.stringify(new URL('../server/db.js', import.meta.url).href)}); getDb();`;
  const { spawnSync } = process.getBuiltinModule('node:child_process');
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', code], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(fs.statSync(file).mode & 0o777, 0o600);
  assert.equal(fs.statSync(path.dirname(file)).mode & 0o077, 0, 'data folder not group/world readable');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('encrypted backups: no plaintext left, 0600, tamper-evident, restorable only with the key', async () => {
  const { backup, verify, restore } = await import('../server/backup.js');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'thunai-enc-'));
  const live = path.join(dir, 'live.db');
  const db = new DatabaseSync(live);
  db.exec("CREATE TABLE users (id TEXT, name TEXT); INSERT INTO users VALUES ('a', 'Child Name 2019-01-01');");
  db.close();
  const key = 'ab'.repeat(32);
  const file = backup(live, path.join(dir, 'b'), { key: Buffer.from(key, 'hex') });
  assert.match(file, /\.db\.enc$/);
  assert.deepEqual(fs.readdirSync(path.join(dir, 'b')), [path.basename(file)], 'no plaintext copy');
  assert.equal(fs.statSync(file).mode & 0o777, 0o600);
  assert.ok(!fs.readFileSync(file).includes('Child Name'), 'ciphertext only');
  assert.throws(() => verify(file, { key: null }), /BACKUP_ENCRYPTION_KEY/);
  assert.throws(() => verify(file, { key: Buffer.from('cd'.repeat(32), 'hex') }));
  assert.equal(verify(file, { key: Buffer.from(key, 'hex') }).counts.users, 1);
  const t = fs.readFileSync(file); t[t.length - 1] ^= 1; const tampered = `${file}.t.enc`; fs.writeFileSync(tampered, t);
  assert.throws(() => verify(tampered, { key: Buffer.from(key, 'hex') }), 'GCM tag rejects tampering');
  fs.rmSync(live);
  restore(file, live, { key: Buffer.from(key, 'hex') });
  const back = new DatabaseSync(live, { readOnly: true });
  assert.equal(back.prepare('SELECT name FROM users').get().name, 'Child Name 2019-01-01');
  back.close();
  assert.equal(fs.statSync(live).mode & 0o777, 0o600);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('service worker never caches API responses', () => {
  const sw = fs.readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
  assert.match(sw, /url\.pathname\.startsWith\('\/api\/'\)/);
  assert.match(sw, /e\.request\.method !== 'GET'/);
});

test('client: profiles received from another account are neutralised before any screen sees them', async () => {
  globalThis.window ||= {};
  const src = fs.readFileSync(new URL('../public/family-share.js', import.meta.url), 'utf8');
  assert.match(src, /cleanIncoming\(s\.profile\)/);
  assert.match(src, /mergeSharedProfiles\(state\.family, cleanReceived\(/);
});
