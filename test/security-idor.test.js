// Security review (docs/SECURITY-REVIEW.md): every signed-in route checks the session, and one account can never
// read or change another account's data (IDOR) — saved data, export, family groups / invites / shares, bookings,
// orders, subscriptions, referrals, priest profile.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

process.env.DB_PATH = ':memory:';
process.env.AUTH_DEV_MODE = '1';
process.env.AUTH_SECRET = 'idor-test-secret';
process.env.SERVICES_OPEN = '1';
process.env.ADMIN_TOKEN = 'idor-admin-token-0123456789';
process.env.RAZORPAY_KEY_SECRET = 'rzp_idor_secret'; // verify routes reachable; no key id → checkout stays offline
for (const k of ['NODE_ENV', 'BILLING_ENFORCE', 'RAZORPAY_KEY_ID', 'STRIPE_SECRET_KEY', 'ADMIN_TOKENS', 'ANTHROPIC_API_KEY']) delete process.env[k];

let app, server, base, getDb;
before(async () => {
  ({ getDb } = await import('../server/db.js'));
  const { createApp } = await import('../server/index.js');
  app = createApp();
  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

const req = async (method, p, body, cookie, headers = {}) => {
  const res = await fetch(base + p, { method, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: res.status, body: await res.json().catch(() => ({})) };
};
let seq = 0;
function account(name) {
  const id = crypto.randomUUID();
  const token = crypto.randomBytes(32).toString('base64url');
  getDb().prepare('INSERT INTO users (id, name, phone, email, created_at) VALUES (?, ?, ?, ?, ?)').run(id, name, `+9198765${String(10000 + ++seq)}`, `idor${seq}@example.com`, Date.now());
  getDb().prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(crypto.createHash('sha256').update(token).digest('hex'), id, Date.now() + 3600000);
  return { id, name, cookie: `kj_session=${token}` };
}

// ---------------------------------------------------------------- every route needs a session (or is public)

/** Routes that are public on purpose (computations, sign-in, webhooks, public listings, anonymous analytics). */
const PUBLIC = [
  'GET /api/health', 'GET /api/categories', 'GET /api/places', 'POST /api/chart', 'GET /api/panchang', 'POST /api/ask',
  'GET /api/calendar', 'POST /api/porutham', 'POST /api/muhurtham', 'POST /api/ai/:task',
  'GET /api/auth/providers', 'POST /api/auth/otp/request', 'POST /api/auth/otp/verify', 'GET /api/auth/facebook/start',
  'GET /api/auth/facebook/callback', 'POST /api/auth/logout', 'GET /api/weather', 'GET /api/push/key', 'POST /api/push/subscribe',
  'POST /api/push/unsubscribe', 'POST /api/push/test', 'GET /api/store/products', 'GET /api/services', 'GET /api/service-status',
  'GET /api/priests', 'GET /api/billing/plans', 'GET /api/billing/me', 'POST /api/billing/stripe/webhook',
  'POST /api/billing/razorpay/webhook', 'POST /api/events', 'POST /api/feedback', 'GET /api/testimonials', 'GET /api/safety/resources',
];

function routes() {
  const out = [];
  const walk = (stack, prefix) => {
    for (const layer of stack) {
      if (layer.route) {
        for (const m of Object.keys(layer.route.methods)) if (m !== '_all') out.push(`${m.toUpperCase()} ${prefix}${layer.route.path}`);
      } else if (layer.handle?.stack) walk(layer.handle.stack, '/api');
    }
  };
  walk(app.router.stack, '');
  return [...new Set(out.filter((r) => r.includes(' /api/')))];
}

test('route inventory is complete enough to be meaningful', () => {
  const all = routes();
  assert.ok(all.length > 60, `found ${all.length}`);
  for (const r of ['GET /api/me/export', 'DELETE /api/me', 'POST /api/family/shares', 'GET /api/admin/metrics']) assert.ok(all.includes(r), r);
});

test('every non-public /api route refuses a request without a session (admin routes without a token)', async () => {
  const fill = (p) => p.replace(/:(\w+)/g, () => crypto.randomUUID());
  const bad = [];
  for (const r of routes()) {
    if (PUBLIC.includes(r)) continue;
    const [method, p] = r.split(' ');
    const res = await req(method, fill(p), method === 'GET' || method === 'DELETE' ? undefined : {});
    const admin = p.startsWith('/api/admin/');
    if (admin ? res.status !== 401 : res.status !== 401) bad.push(`${r} → ${res.status}`);
  }
  assert.deepEqual(bad, []);
});

test('admin routes: a wrong token is refused and repeated failures lock the IP out', async () => {
  getDb().exec('DELETE FROM rate_hits');
  assert.equal((await req('GET', '/api/admin/metrics', undefined, null, { 'x-admin-token': 'idor-admin-token-0123456789' })).status, 200);
  assert.equal((await req('GET', '/api/admin/metrics', undefined, null, { 'x-admin-token': 'idor-admin-token-012345678X' })).status, 403);
  // A user session is not an admin credential.
  const a = account('NotAdmin');
  assert.equal((await req('GET', '/api/admin/stats', undefined, a.cookie)).status, 401);
  for (let i = 0; i < 10; i++) await req('GET', '/api/admin/metrics', undefined, null, { 'x-admin-token': `wrong-${i}` });
  assert.equal((await req('GET', '/api/admin/metrics', undefined, null, { 'x-admin-token': 'idor-admin-token-0123456789' })).status, 429, 'locked out after 10 failures');
  getDb().exec('DELETE FROM rate_hits');
  const saved = process.env.ADMIN_TOKEN;
  delete process.env.ADMIN_TOKEN;
  try { assert.equal((await req('GET', '/api/admin/metrics', undefined, null, { 'x-admin-token': '' })).status, 503, 'disabled without a token'); }
  finally { process.env.ADMIN_TOKEN = saved; }
});

// ---------------------------------------------------------------- account data

test('saved data and export are per account', async () => {
  const a = account('Anbu');
  const b = account('Bala');
  const secret = { family: [{ id: 'kid', name: 'Kavya', relation: 'daughter', date: '2016-03-03' }] };
  assert.equal((await req('PUT', '/api/me/data', { data: secret }, a.cookie)).status, 200);
  const bData = await req('GET', '/api/me/data', undefined, b.cookie);
  assert.deepEqual(bData.body.data, {});
  const bExport = await req('GET', '/api/me/export', undefined, b.cookie);
  assert.equal(bExport.status, 200);
  assert.ok(!JSON.stringify(bExport.body).includes('Kavya') && !JSON.stringify(bExport.body).includes(a.id));
  assert.equal((await req('DELETE', '/api/me/data', undefined, b.cookie)).status, 200);
  assert.deepEqual((await req('GET', '/api/me/data', undefined, a.cookie)).body.data, secret, "B's delete never touches A");
  // Body cannot name another account.
  await req('PUT', '/api/me/data', { data: { x: 1 }, userId: a.id, user_id: a.id }, b.cookie);
  assert.deepEqual((await req('GET', '/api/me/data', undefined, a.cookie)).body.data, secret);
});

test('bookings, orders, subscriptions and priest profiles cannot be reached across accounts', async () => {
  const a = account('Chitra');
  const b = account('Durai');
  const date = new Date(Date.now() + 20 * 86400000).toISOString().slice(0, 10);
  const rq = await req('POST', '/api/requests', { type: 'package', packageId: 'grahapravesam-complete', people: 5, date, city: 'Madurai', contactPhone: '9876500101', notes: 'private note' }, a.cookie);
  assert.equal(rq.status, 201, JSON.stringify(rq.body));
  assert.equal((await req('POST', `/api/requests/${rq.body.request.id}/cancel`, {}, b.cookie)).status, 404);
  assert.ok(!JSON.stringify((await req('GET', '/api/requests', undefined, b.cookie)).body).includes('private note'));

  await req('GET', '/api/store/orders', undefined, a.cookie); // creates the store tables
  const orderId = crypto.randomUUID();
  getDb().prepare("INSERT INTO store_orders (id, user_id, items, address, total, status, razorpay_order_id, created_at, updated_at) VALUES (?, ?, '[]', '{\"line1\":\"A street\"}', 100, 'paid', 'order_a', ?, ?)").run(orderId, a.id, Date.now(), Date.now());
  assert.ok(!JSON.stringify((await req('GET', '/api/store/orders', undefined, b.cookie)).body).includes(orderId));
  assert.equal((await req('POST', `/api/store/orders/${orderId}/refund-request`, { reason: 'x' }, b.cookie)).status, 404);
  assert.equal((await req('POST', `/api/store/orders/${orderId}/verify`, { razorpay_order_id: 'order_a', razorpay_payment_id: 'p', razorpay_signature: 's' }, b.cookie)).status, 404);

  const co = await req('POST', '/api/billing/checkout', { plan: 'personal_month' }, a.cookie);
  assert.equal(co.status, 200, JSON.stringify(co.body));
  const v = await req('POST', '/api/billing/verify', { subscriptionId: co.body.subscriptionId, razorpay_order_id: 'o', razorpay_payment_id: 'p', razorpay_signature: 's' }, b.cookie);
  assert.equal(v.status, 404);

  const pr = await req('POST', '/api/priests/register', { name: 'Sastri', phone: '9876500111', city: 'Madurai', languages: ['Tamil'], services: [(await req('GET', '/api/services')).body[0].id], experience_years: 10 }, a.cookie);
  assert.equal(pr.status, 201, JSON.stringify(pr.body));
  assert.equal((await req('GET', '/api/priests/me', undefined, b.cookie)).status, 404);
  assert.equal((await req('POST', `/api/priests/me/requests/${rq.body.request.id}/respond`, { decision: 'accept' }, b.cookie)).status, 404);

  const refA = (await req('GET', '/api/referral', undefined, a.cookie)).body.code;
  const refB = (await req('GET', '/api/referral', undefined, b.cookie)).body.code;
  assert.notEqual(refA, refB);
});

// ---------------------------------------------------------------- family sharing

async function familyOf(owner) {
  const g = await req('POST', '/api/family/groups', { name: 'Fam' }, owner.cookie);
  assert.equal(g.status, 201, JSON.stringify(g.body));
  return g.body.group.id;
}
async function invite(groupId, by) {
  const inv = await req('POST', `/api/family/groups/${groupId}/invites`, {}, by.cookie);
  assert.equal(inv.status, 201, JSON.stringify(inv.body));
  return inv.body;
}
const PROFILE = { id: 'amma1', name: 'Amma', relation: 'mother', date: '1960-04-14', time: '06:30:00', place: 'Madurai', lat: 9.92, lon: 78.12, tz: 5.5 };

test('family: an outsider cannot read or change a group, its invites or its shares', async () => {
  const owner = account('Owner');
  const outsider = account('Outsider');
  const gid = await familyOf(owner);
  const inv = await invite(gid, owner);
  const share = await req('POST', '/api/family/shares', { groupId: gid, permission: 'edit', profile: PROFILE }, owner.cookie);
  assert.equal(share.status, 201);
  const sid = share.body.share.id;
  const o = outsider.cookie;
  assert.equal((await req('GET', '/api/family', undefined, o)).body.group, null);
  assert.equal((await req('DELETE', `/api/family/groups/${gid}`, undefined, o)).status, 404);
  assert.equal((await req('POST', `/api/family/groups/${gid}/leave`, {}, o)).status, 404);
  assert.equal((await req('POST', `/api/family/groups/${gid}/invites`, {}, o)).status, 404);
  assert.equal((await req('DELETE', `/api/family/groups/${gid}/members/${owner.id}`, undefined, o)).status, 404);
  assert.equal((await req('DELETE', `/api/family/invites/${inv.id}`, undefined, o)).status, 404);
  assert.equal((await req('POST', '/api/family/shares', { groupId: gid, permission: 'view', profile: PROFILE }, o)).status, 404);
  assert.equal((await req('PATCH', `/api/family/shares/${sid}`, { permission: 'view' }, o)).status, 404);
  assert.equal((await req('PUT', `/api/family/shares/${sid}/profile`, { profile: { ...PROFILE, name: 'Hacked' } }, o)).status, 404);
  assert.equal((await req('DELETE', `/api/family/shares/${sid}`, undefined, o)).status, 404);
  const ov = await req('GET', '/api/family', undefined, owner.cookie);
  assert.equal(ov.body.myShares[0].profile.name, 'Amma');
  assert.equal(ov.body.group.members.length, 1);
});

test('family: members are limited by role and permission; revocation is immediate', async () => {
  const owner = account('Owner2');
  const adult = account('Adult2');
  const gid = await familyOf(owner);
  const inv = await invite(gid, owner);
  assert.equal((await req('POST', '/api/family/invites/accept', { code: inv.code, selfBirthDate: '1985-01-01' }, adult.cookie)).status, 200);
  const view = await req('POST', '/api/family/shares', { groupId: gid, permission: 'view', profile: PROFILE }, owner.cookie);
  const sid = view.body.share.id;
  const a = adult.cookie;
  assert.equal((await req('PATCH', `/api/family/shares/${sid}`, { permission: 'edit' }, a)).status, 403);
  assert.equal((await req('PUT', `/api/family/shares/${sid}/profile`, { profile: { ...PROFILE, name: 'Changed' } }, a)).status, 403, 'view-only');
  assert.equal((await req('DELETE', `/api/family/shares/${sid}`, undefined, a)).status, 403);
  assert.equal((await req('DELETE', `/api/family/groups/${gid}`, undefined, a)).status, 403);
  assert.equal((await req('DELETE', `/api/family/groups/${gid}/members/${owner.id}`, undefined, a)).status, 403);
  assert.equal((await req('DELETE', `/api/family/invites/${(await invite(gid, owner)).id}`, undefined, a)).status, 403);
  // Revoke: gone for the member at once, server copy deleted.
  assert.equal((await req('GET', '/api/family', undefined, a)).body.sharedWithMe.length, 1);
  assert.equal((await req('DELETE', `/api/family/shares/${sid}`, undefined, owner.cookie)).status, 200);
  assert.equal((await req('GET', '/api/family', undefined, a)).body.sharedWithMe.length, 0);
  assert.equal((await req('PUT', `/api/family/shares/${sid}/profile`, { profile: PROFILE }, owner.cookie)).status, 404);
  assert.equal(getDb().prepare('SELECT data FROM profile_shares WHERE id = ?').get(sid).data, null);
  // A removed member loses access to everything at once.
  const again = await req('POST', '/api/family/shares', { groupId: gid, permission: 'edit', profile: PROFILE }, owner.cookie);
  assert.equal((await req('DELETE', `/api/family/groups/${gid}/members/${adult.id}`, undefined, owner.cookie)).status, 200);
  assert.equal((await req('PUT', `/api/family/shares/${again.body.share.id}/profile`, { profile: PROFILE }, a)).status, 404);
  assert.equal((await req('GET', '/api/family', undefined, a)).body.group, null);
});

test('family invites: 60-bit one-time codes, hashed at rest, expire, single use, revocable', async () => {
  const owner = account('Owner3');
  const gid = await familyOf(owner);
  const inv = await invite(gid, owner);
  assert.match(inv.code, /^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
  const raw = inv.code.replace(/-/g, '');
  const dump = JSON.stringify(getDb().prepare('SELECT * FROM family_invites').all());
  assert.ok(!dump.includes(raw), 'only the hash is stored');
  // Single use
  const j1 = account('Joiner1');
  const j2 = account('Joiner2');
  assert.equal((await req('POST', '/api/family/invites/accept', { code: inv.code, selfBirthDate: '1980-01-01' }, j1.cookie)).status, 200);
  assert.equal((await req('POST', '/api/family/invites/accept', { code: inv.code, selfBirthDate: '1980-01-01' }, j2.cookie)).status, 410);
  // Revoked → not valid at once
  const inv2 = await invite(gid, owner);
  assert.equal((await req('DELETE', `/api/family/invites/${inv2.id}`, undefined, owner.cookie)).status, 200);
  assert.equal((await req('POST', '/api/family/invites/accept', { code: inv2.code, selfBirthDate: '1980-01-01' }, j2.cookie)).status, 404);
  // Expired
  const inv3 = await invite(gid, owner);
  getDb().prepare('UPDATE family_invites SET expires_at = ? WHERE id = ?').run(Date.now() - 1, inv3.id);
  assert.equal((await req('POST', '/api/family/invites/accept', { code: inv3.code, selfBirthDate: '1980-01-01' }, j2.cookie)).status, 410);
  // Children cannot join.
  const inv4 = await invite(gid, owner);
  const kid = account('Kid');
  assert.equal((await req('POST', '/api/family/invites/accept', { code: inv4.code, selfBirthDate: '2014-01-01' }, kid.cookie)).status, 403);
});

test('family: a shared profile cannot carry markup, unknown fields or prototype keys to another phone', async () => {
  const owner = account('Owner4');
  const adult = account('Adult4');
  const gid = await familyOf(owner);
  const inv = await invite(gid, owner);
  await req('POST', '/api/family/invites/accept', { code: inv.code, selfBirthDate: '1985-01-01' }, adult.cookie);
  const evil = {
    ...PROFILE, id: 'x1', name: '<img src=x onerror=alert(document.cookie)>', place: '"><script>alert(1)</script>',
    relation: 'mother" onclick="x', zone: 'Asia/Kolkata<script>', time: '06:30<b>', healthNotes: 'BP', chats: ['private'],
    kattam: { star: 3, pada: 2, lagna: 1, planets: { Sun: 4, Evil: '<svg/onload=1>' }, balance: { years: 3, months: 2 }, extra: '<x>' },
  };
  const body = JSON.parse(JSON.stringify(evil).replace('"id":"x1"', '"__proto__":{"admin":true},"id":"x1"'));
  const s = await req('POST', '/api/family/shares', { groupId: gid, permission: 'edit', profile: body }, owner.cookie);
  assert.equal(s.status, 201, JSON.stringify(s.body));
  const got = (await req('GET', '/api/family', undefined, adult.cookie)).body.sharedWithMe[0].profile;
  const txt = JSON.stringify(got);
  assert.ok(!/[<>]/.test(txt), txt);
  assert.ok(!txt.includes('healthNotes') && !txt.includes('private') && !txt.includes('__proto__') && !txt.includes('Evil') && !txt.includes('extra'), txt);
  assert.equal(got.relation, undefined);
  assert.equal(got.zone, undefined);
  assert.equal(got.time, undefined);
  assert.deepEqual(got.kattam, { star: 3, pada: 2, lagna: 1, planets: { Sun: 4 }, balance: { years: 3, months: 2 } });
  // An editor's change is cleaned the same way.
  const put = await req('PUT', `/api/family/shares/${s.body.share.id}/profile`, { profile: { ...PROFILE, name: 'Amma<script>' } }, adult.cookie);
  assert.equal(put.status, 200);
  assert.ok(!/[<>]/.test(put.body.share.profile.name));
  assert.equal(({}).admin, undefined, 'no prototype pollution');
});

test('SQL injection strings are data, not SQL', async () => {
  const a = account("O'Brien");
  const inj = "x' OR '1'='1";
  for (const [m, p, b] of [
    ['DELETE', `/api/family/shares/${encodeURIComponent(inj)}`],
    ['POST', '/api/family/invites/accept', { code: "AAAA'--AAAA" }],
    ['POST', '/api/referral/claim', { code: "' OR 1=1--" }],
    ['POST', '/api/billing/redeem', { code: "'; DROP TABLE users;--" }],
    ['GET', `/api/priests?city=${encodeURIComponent(inj)}`],
  ]) {
    const r = await req(m, p, b, a.cookie);
    assert.ok([400, 404, 409, 200].includes(r.status), `${p} → ${r.status}`);
  }
  assert.ok(getDb().prepare('SELECT COUNT(*) AS n FROM users').get().n > 0, 'users table intact');
});
