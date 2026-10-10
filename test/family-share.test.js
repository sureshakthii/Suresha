// Shared family (§12): permission-based access between separate accounts, private boundaries, revocation,
// export and deletion (server/family.js, shared/sync-policy.js).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { shareableProfile, canShareProfile, mergeSharedProfiles, backupPayload, sharedLocalId } from '../shared/sync-policy.js';

process.env.DB_PATH = ':memory:';
process.env.AUTH_DEV_MODE = '1';
process.env.AUTH_SECRET = 'test-secret';
delete process.env.BILLING_ENFORCE;

let server, base;
before(async () => {
  const { createApp } = await import('../server/index.js');
  server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => { delete process.env.BILLING_ENFORCE; server.close(); });

const req = async (method, path, body, cookie) => {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
};

let seq = 0;
/** A signed-in account (created directly: the OTP flow has its own per-IP send limit and tests). */
async function login(name = 'Person') {
  const crypto = await import('node:crypto');
  const { getDb } = await import('../server/db.js');
  const id = crypto.randomUUID();
  const token = crypto.randomBytes(24).toString('base64url');
  getDb().prepare('INSERT INTO users (id, name, email, created_at) VALUES (?, ?, ?, ?)').run(id, name, `fam${++seq}-${id}@example.com`, Date.now());
  getDb().prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(crypto.createHash('sha256').update(token).digest('hex'), id, Date.now() + 3600000);
  return { cookie: `kj_session=${token}`, id };
}

const AMMA = { id: 'amma1', name: 'Amma', relation: 'mother', gender: 'f', date: '1960-04-14', time: '06:30:00', place: 'Madurai', lat: 9.92, lon: 78.12, tz: 5.5, zone: 'Asia/Kolkata', maritalStatus: 'married', children: 2, faith: 'hindu', healthNotes: 'BP', chats: ['secret chat'] };
const KID = { id: 'kid1', name: 'Kavya', relation: 'daughter', date: '2015-01-01', time: '10:00:00', lat: 13, lon: 80, tz: 5.5, private: true };

/** Owner with a group + an adult who joined through an invite. */
async function family() {
  const owner = await login('Owner');
  const g = await req('POST', '/api/family/groups', { name: 'Our family' }, owner.cookie);
  assert.equal(g.status, 201);
  const inv = await req('POST', `/api/family/groups/${g.body.group.id}/invites`, {}, owner.cookie);
  assert.equal(inv.status, 201);
  const adult = await login('Adult');
  const acc = await req('POST', '/api/family/invites/accept', { code: inv.body.code, selfBirthDate: '1988-02-02' }, adult.cookie);
  assert.equal(acc.status, 200, JSON.stringify(acc.body));
  return { owner, adult, groupId: g.body.group.id };
}

// ---------------------------------------------------------------- pure policy

test('shareableProfile keeps only birth data; private and someone else’s copies cannot be shared', () => {
  const c = shareableProfile(AMMA);
  assert.deepEqual(Object.keys(c).sort(), ['date', 'gender', 'id', 'lat', 'lon', 'name', 'place', 'relation', 'time', 'tz', 'zone']);
  assert.ok(!JSON.stringify(c).includes('secret chat') && !JSON.stringify(c).includes('BP'));
  assert.equal(shareableProfile(KID), null);
  assert.equal(canShareProfile(KID), false);
  assert.equal(canShareProfile(AMMA), true);
  assert.equal(canShareProfile({ ...AMMA, shared: { shareId: 'x' } }), false);
});

test('mergeSharedProfiles adds, updates and removes received profiles; backups never include them', () => {
  const own = [{ id: 'me', name: 'Me', date: '1980-01-01' }];
  const one = mergeSharedProfiles(own, [{ id: 's1', permission: 'view', by: { name: 'Owner' }, profile: shareableProfile(AMMA) }]);
  assert.equal(one.length, 2);
  assert.deepEqual(one[1].shared, { shareId: 's1', by: 'Owner', permission: 'view' });
  assert.equal(one[1].id, sharedLocalId('s1'));
  assert.deepEqual(backupPayload({ family: one, activeId: one[1].id }, { backup: true }).family.map((m) => m.id), ['me']);
  assert.deepEqual(mergeSharedProfiles(one, []).map((m) => m.id), ['me'], 'revoked → removed on next sync');
});

// ---------------------------------------------------------------- invites

test('every family route requires a session', async () => {
  for (const [m, p] of [['GET', '/api/family'], ['POST', '/api/family/groups'], ['POST', '/api/family/invites/accept'], ['POST', '/api/family/shares'], ['DELETE', '/api/family/shares/x']]) {
    assert.equal((await req(m, p, m === 'GET' ? undefined : {})).status, 401, `${m} ${p}`);
  }
});

test('invite: accept once; second use, expired, revoked and wrong codes are refused; codes are stored hashed', async () => {
  const { owner, groupId } = await family();
  const inv = await req('POST', `/api/family/groups/${groupId}/invites`, {}, owner.cookie);
  assert.match(inv.body.code, /^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  assert.ok(inv.body.link.includes('#join='));
  const { getDb } = await import('../server/db.js');
  const raw = JSON.stringify(getDb().prepare('SELECT * FROM family_invites').all());
  assert.ok(!raw.includes(inv.body.code.replace(/-/g, '')), 'code stored only as a hash');
  // Pending invite listed for the owner; can be revoked.
  assert.equal((await req('GET', '/api/family', undefined, owner.cookie)).body.invites.length, 1);

  const a = await login('A');
  assert.equal((await req('POST', '/api/family/invites/accept', { code: inv.body.code.toLowerCase() }, a.cookie)).status, 200, 'case and dashes ignored');
  const b = await login('B');
  assert.equal((await req('POST', '/api/family/invites/accept', { code: inv.body.code }, b.cookie)).status, 410, 'single use');
  assert.equal((await req('POST', '/api/family/invites/accept', { code: 'AAAA-BBBB-CCCC' }, b.cookie)).status, 404);
  assert.equal((await req('POST', '/api/family/invites/accept', { code: '123' }, b.cookie)).status, 400);

  const inv2 = await req('POST', `/api/family/groups/${groupId}/invites`, {}, owner.cookie);
  getDb().prepare('UPDATE family_invites SET expires_at = ? WHERE id = ?').run(Date.now() - 1, inv2.body.id);
  assert.equal((await req('POST', '/api/family/invites/accept', { code: inv2.body.code }, b.cookie)).status, 410, 'expired after 7 days');
  const created = getDb().prepare('SELECT created_at, expires_at FROM family_invites WHERE id = ?').get(inv.body.id);
  assert.equal(created.expires_at - created.created_at, 7 * 86400000);

  const inv3 = await req('POST', `/api/family/groups/${groupId}/invites`, {}, owner.cookie);
  assert.equal((await req('DELETE', `/api/family/invites/${inv3.body.id}`, undefined, b.cookie)).status, 404, 'outsider cannot revoke');
  assert.equal((await req('DELETE', `/api/family/invites/${inv3.body.id}`, undefined, owner.cookie)).status, 200);
  assert.equal((await req('POST', '/api/family/invites/accept', { code: inv3.body.code }, b.cookie)).status, 404, 'revoked');
});

test('minors cannot join as adult members (age from the app or the backed-up self profile)', async () => {
  const { owner, groupId } = await family();
  const kid = await login('Teen');
  const inv = await req('POST', `/api/family/groups/${groupId}/invites`, {}, owner.cookie);
  const r = await req('POST', '/api/family/invites/accept', { code: inv.body.code, selfBirthDate: '2012-06-01' }, kid.cookie);
  assert.equal(r.status, 403);
  assert.equal(r.body.minor, true);
  const kid2 = await login('Teen2');
  await req('PUT', '/api/me/data', { data: { family: [{ id: 'me', relation: 'self', name: 'Teen2', date: '2013-03-03' }] } }, kid2.cookie);
  assert.equal((await req('POST', '/api/family/invites/accept', { code: inv.body.code, selfBirthDate: '1990-01-01' }, kid2.cookie)).status, 403, 'saved self profile wins (a minor stays a minor)');
});

test('a person belongs to one family group at a time', async () => {
  const { adult } = await family();
  assert.equal((await req('POST', '/api/family/groups', {}, adult.cookie)).status, 409);
});

// ---------------------------------------------------------------- shares

test('private profiles cannot be shared; shared copies hold birth data only', async () => {
  const { owner, groupId } = await family();
  assert.equal((await req('POST', '/api/family/shares', { groupId, profile: KID }, owner.cookie)).status, 403);
  const s = await req('POST', '/api/family/shares', { groupId, profile: AMMA, permission: 'view' }, owner.cookie);
  assert.equal(s.status, 201);
  const { getDb } = await import('../server/db.js');
  const data = getDb().prepare('SELECT data FROM profile_shares WHERE id = ?').get(s.body.share.id).data;
  for (const leaked of ['secret chat', 'BP', 'married', 'hindu']) assert.ok(!data.includes(leaked), `share leaks ${leaked}`);
  assert.equal((await req('POST', '/api/family/shares', { groupId, profile: { ...AMMA, shared: { shareId: 'x' } } }, owner.cookie)).status, 403, 'no re-sharing');
});

test('view vs edit: viewers cannot change a shared profile; editors can; only the owner changes permission', async () => {
  const { owner, adult, groupId } = await family();
  const s = (await req('POST', '/api/family/shares', { groupId, profile: AMMA, permission: 'view' }, owner.cookie)).body.share;
  const seen = (await req('GET', '/api/family', undefined, adult.cookie)).body.sharedWithMe;
  assert.equal(seen.length, 1);
  assert.equal(seen[0].profile.name, 'Amma');
  assert.equal(seen[0].by.name, 'Owner');
  assert.equal(seen[0].permission, 'view');
  assert.equal((await req('PUT', `/api/family/shares/${s.id}/profile`, { profile: { ...AMMA, time: '07:00:00' } }, adult.cookie)).status, 403);
  assert.equal((await req('PATCH', `/api/family/shares/${s.id}`, { permission: 'edit' }, adult.cookie)).status, 403);
  assert.equal((await req('DELETE', `/api/family/shares/${s.id}`, undefined, adult.cookie)).status, 403, 'only the sharer revokes');
  assert.equal((await req('PATCH', `/api/family/shares/${s.id}`, { permission: 'edit' }, owner.cookie)).status, 200);
  const ed = await req('PUT', `/api/family/shares/${s.id}/profile`, { profile: { ...AMMA, time: '07:00:00', healthNotes: 'x' } }, adult.cookie);
  assert.equal(ed.status, 200);
  assert.equal(ed.body.share.profile.time, '07:00:00');
  assert.equal(ed.body.share.profile.healthNotes, undefined);
  const mine = (await req('GET', '/api/family', undefined, owner.cookie)).body.myShares[0];
  assert.equal(mine.editedByOther, true, 'owner’s phone learns of the edit');
  assert.equal(mine.profile.time, '07:00:00');
  assert.deepEqual(mine.audience.map((a) => a.name), ['Adult'], 'who can see this profile');
});

test('revoking removes access and deletes the server copy', async () => {
  const { owner, adult, groupId } = await family();
  const s = (await req('POST', '/api/family/shares', { groupId, profile: AMMA }, owner.cookie)).body.share;
  assert.equal((await req('DELETE', `/api/family/shares/${s.id}`, undefined, owner.cookie)).status, 200);
  assert.equal((await req('GET', '/api/family', undefined, adult.cookie)).body.sharedWithMe.length, 0);
  const { getDb } = await import('../server/db.js');
  assert.equal(getDb().prepare('SELECT data FROM profile_shares WHERE id = ?').get(s.id).data, null);
  assert.equal((await req('PUT', `/api/family/shares/${s.id}/profile`, { profile: AMMA }, owner.cookie)).status, 404);
});

test('cross-group isolation: no access to another family’s group, invites or shares (IDOR)', async () => {
  const f1 = await family();
  const f2 = await family();
  const s1 = (await req('POST', '/api/family/shares', { groupId: f1.groupId, profile: AMMA, permission: 'edit' }, f1.owner.cookie)).body.share;
  const inv1 = (await req('POST', `/api/family/groups/${f1.groupId}/invites`, {}, f1.owner.cookie)).body;
  const x = f2.owner.cookie;
  assert.equal((await req('GET', '/api/family', undefined, x)).body.sharedWithMe.length, 0);
  assert.equal((await req('PUT', `/api/family/shares/${s1.id}/profile`, { profile: AMMA }, x)).status, 404);
  assert.equal((await req('PATCH', `/api/family/shares/${s1.id}`, { permission: 'view' }, x)).status, 404);
  assert.equal((await req('DELETE', `/api/family/shares/${s1.id}`, undefined, x)).status, 404);
  assert.equal((await req('POST', '/api/family/shares', { groupId: f1.groupId, profile: AMMA }, x)).status, 404);
  assert.equal((await req('POST', `/api/family/groups/${f1.groupId}/invites`, {}, x)).status, 404);
  assert.equal((await req('DELETE', `/api/family/invites/${inv1.id}`, undefined, x)).status, 404);
  assert.equal((await req('DELETE', `/api/family/groups/${f1.groupId}`, undefined, x)).status, 404);
  assert.equal((await req('DELETE', `/api/family/groups/${f1.groupId}/members/${f1.adult.id}`, undefined, x)).status, 404);
  assert.equal((await req('POST', `/api/family/groups/${f1.groupId}/leave`, {}, x)).status, 404);
});

// ---------------------------------------------------------------- leave / remove / delete

test('leave, remove member and delete group drop the person’s shares', async () => {
  const { owner, adult, groupId } = await family();
  const s = (await req('POST', '/api/family/shares', { groupId, profile: { ...AMMA, id: 'adultMum' } }, adult.cookie)).body.share;
  assert.equal((await req('GET', '/api/family', undefined, owner.cookie)).body.sharedWithMe.length, 1);
  assert.equal((await req('DELETE', `/api/family/groups/${groupId}/members/${owner.id}`, undefined, adult.cookie)).status, 403, 'adults cannot remove');
  assert.equal((await req('DELETE', `/api/family/groups/${groupId}`, undefined, adult.cookie)).status, 403, 'adults cannot delete the group');
  assert.equal((await req('DELETE', `/api/family/groups/${groupId}/members/${adult.id}`, undefined, owner.cookie)).status, 200);
  assert.equal((await req('GET', '/api/family', undefined, owner.cookie)).body.sharedWithMe.length, 0);
  assert.equal((await req('GET', '/api/family', undefined, adult.cookie)).body.group, null);
  const { getDb } = await import('../server/db.js');
  assert.equal(getDb().prepare('SELECT COUNT(*) AS n FROM profile_shares WHERE id = ?').get(s.id).n, 0);

  const f = await family();
  assert.equal((await req('POST', `/api/family/groups/${f.groupId}/leave`, {}, f.adult.cookie)).status, 200);
  assert.equal((await req('GET', '/api/family', undefined, f.owner.cookie)).body.group.members.length, 1);
  await req('POST', '/api/family/shares', { groupId: f.groupId, profile: AMMA }, f.owner.cookie);
  assert.equal((await req('DELETE', `/api/family/groups/${f.groupId}`, undefined, f.owner.cookie)).status, 200);
  for (const t of ['family_groups WHERE id', 'family_members WHERE group_id', 'profile_shares WHERE group_id', 'family_invites WHERE group_id']) {
    assert.equal(getDb().prepare(`SELECT COUNT(*) AS n FROM ${t} = ?`).get(f.groupId).n, 0, t);
  }
});

test('owner leaving passes the group to an adult', async () => {
  const { owner, adult, groupId } = await family();
  const r = await req('POST', `/api/family/groups/${groupId}/leave`, {}, owner.cookie);
  assert.equal(r.body.ownershipTransferred, true);
  const g = (await req('GET', '/api/family', undefined, adult.cookie)).body.group;
  assert.equal(g.role, 'owner');
  assert.equal(g.ownerId, adult.id);
});

// ---------------------------------------------------------------- export & deletion

test('export lists memberships, invites and shares (no code hashes); deletion removes them and the copies', async () => {
  const { owner, adult, groupId } = await family();
  await req('POST', '/api/family/shares', { groupId, profile: AMMA }, owner.cookie);
  await req('POST', '/api/family/shares', { groupId, profile: { ...AMMA, id: 'appa', name: 'Appa' } }, adult.cookie);
  const ex = (await req('GET', '/api/me/export', undefined, owner.cookie)).body.family;
  assert.equal(ex.memberships[0].groupId, groupId);
  assert.equal(ex.memberships[0].isOwner, true);
  assert.equal(ex.invitesCreated.length, 1);
  assert.equal(ex.sharesMade[0].sharedCopy.name, 'Amma');
  assert.equal(ex.sharesReceived.length, 1);
  assert.equal(ex.sharesReceived[0].profileId, 'appa');
  assert.ok(!JSON.stringify(ex).includes('code_hash') && !JSON.stringify(ex.sharesReceived).includes('1960'), 'received shares are metadata only');

  assert.equal((await req('DELETE', '/api/me', undefined, owner.cookie)).status, 200);
  const { getDb } = await import('../server/db.js');
  const n = (sql, ...a) => getDb().prepare(sql).get(...a).n;
  assert.equal(n('SELECT COUNT(*) AS n FROM profile_shares WHERE owner_user_id = ?', owner.id), 0);
  assert.equal(n('SELECT COUNT(*) AS n FROM family_members WHERE user_id = ?', owner.id), 0);
  assert.equal(n('SELECT COUNT(*) AS n FROM family_invites WHERE created_by = ?', owner.id), 0);
  assert.equal(n('SELECT COUNT(*) AS n FROM family_groups WHERE owner_user_id = ?', owner.id), 0);
  const g = (await req('GET', '/api/family', undefined, adult.cookie)).body;
  assert.equal(g.group.ownerId, adult.id, 'the group passes to the remaining adult');
  assert.equal(g.sharedWithMe.length, 0, 'the deleted account’s shares are gone');
});

// ---------------------------------------------------------------- billing

test('BILLING_ENFORCE=1: creating a group needs the Family plan', async () => {
  process.env.BILLING_ENFORCE = '1';
  try {
    const u = await login('NoPlan');
    const r = await req('POST', '/api/family/groups', {}, u.cookie);
    assert.equal(r.status, 402);
    assert.equal(r.body.upgrade, true);
    assert.equal((await req('GET', '/api/family', undefined, u.cookie)).body.canCreate, false);
    const { grantComplimentary } = await import('../server/billing.js');
    grantComplimentary(u.id, 'family_month', 'gift', 86400000);
    assert.equal((await req('POST', '/api/family/groups', {}, u.cookie)).status, 201);
    const p = await login('Personal');
    grantComplimentary(p.id, 'personal_month', 'gift', 86400000);
    assert.equal((await req('POST', '/api/family/groups', {}, p.cookie)).status, 402, 'Personal plan is not enough');
  } finally { delete process.env.BILLING_ENFORCE; }
});

test('invite creation and acceptance are rate limited', async () => {
  const { owner, groupId } = await family();
  let last;
  for (let i = 0; i < 11; i++) last = await req('POST', `/api/family/groups/${groupId}/invites`, {}, owner.cookie);
  assert.equal(last.status, 429);
  const guesser = await login('Guesser');
  for (let i = 0; i < 11; i++) last = await req('POST', '/api/family/invites/accept', { code: `AAAA-BBBB-CC${'CDEFGHJKLMNP'[i]}A` }, guesser.cookie);
  assert.equal(last.status, 429);
});
