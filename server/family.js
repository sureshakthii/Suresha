// Shared family (owner requirement §12): permission-based family access between separate accounts.
//
// A family group has one owner and adult members (max MAX_MEMBERS). An adult joins with a one-time invite code
// (single use, 7 days; only its SHA-256 hash is stored). Each person chooses, per profile, whether the group may
// VIEW or EDIT it; only then does the server keep a copy — and only the birth details a chart needs
// (shared/sync-policy.js shareableProfile). Private profiles are refused. Chats, health notes, goals and other
// notes are never shared. Revoking a share deletes the server copy at once; other members' phones drop it on the
// next sync. Guardian view of a child's chart is a profile share, never a membership: minors cannot join.
//
// Every route needs a session and checks group / profile authorization (no IDOR). Audit events carry ids only.
import crypto from 'node:crypto';
import express from 'express';
import { getDb } from './db.js';
import { currentUser } from './auth.js';
import { rateLimit, audit } from './admin.js';
import { billingEnforced, entitlementsFor } from './billing.js';
import { shareableProfile, isPrivateProfile } from '../shared/sync-policy.js';
import { ageProfile } from '../shared/age-guard.js';
import { cleanDisplayText } from './security.js';

export const INVITE_TTL = 7 * 24 * 60 * 60 * 1000;
export const MAX_MEMBERS = 8;
const MAX_SHARES_PER_USER = 16;
const ROLES = ['owner', 'adult', 'guardian-view'];
const PERMISSIONS = ['view', 'edit'];
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS family_groups (
    id TEXT PRIMARY KEY,
    owner_user_id TEXT NOT NULL,
    name TEXT,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS family_members (
    group_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL,
    joined_at INTEGER NOT NULL,
    PRIMARY KEY (group_id, user_id)
  );
  CREATE INDEX IF NOT EXISTS family_members_user ON family_members(user_id);
  CREATE TABLE IF NOT EXISTS family_invites (
    id TEXT PRIMARY KEY,
    code_hash TEXT NOT NULL UNIQUE,
    group_id TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    max_uses INTEGER NOT NULL DEFAULT 1,
    used INTEGER NOT NULL DEFAULT 0,
    revoked INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS family_invites_group ON family_invites(group_id);
  CREATE TABLE IF NOT EXISTS profile_shares (
    id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL,
    owner_user_id TEXT NOT NULL,
    group_id TEXT NOT NULL,
    permission TEXT NOT NULL,
    data TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    updated_by TEXT,
    revoked_at INTEGER
  );
  CREATE INDEX IF NOT EXISTS profile_shares_group ON profile_shares(group_id);
  CREATE INDEX IF NOT EXISTS profile_shares_owner ON profile_shares(owner_user_id);
`;
const ready = new WeakSet();
function db() {
  const d = getDb();
  if (!ready.has(d)) { d.exec(SCHEMA); ready.add(d); }
  return d;
}

const now = () => Date.now();
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
const newId = () => crypto.randomUUID();
const normCode = (c) => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
function newCode() {
  let s = '';
  for (let i = 0; i < 12; i++) s += CODE_ALPHABET[crypto.randomInt(0, CODE_ALPHABET.length)];
  return s; // 12 × 5 bits = 60 bits; shown as XXXX-XXXX-XXXX
}
const showCode = (c) => c.match(/.{1,4}/g).join('-');
const parse = (v) => { try { return v ? JSON.parse(v) : null; } catch { return null; } };
const fail = (res, status, error, extra = {}) => res.status(status).json({ error, ...extra });

const PLANET_KEYS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
const intIn = (v, min, max) => (Number.isInteger(v) && v >= min && v <= max ? v : null);
/** A written kattam: only the known fields with in-range numbers (nothing else from the sender survives). */
function cleanKattam(k) {
  if (!k || typeof k !== 'object' || Array.isArray(k)) return undefined;
  const planets = {};
  for (const p of PLANET_KEYS) { const v = intIn(k.planets?.[p], 0, 11); if (v !== null) planets[p] = v; }
  const b = k.balance && typeof k.balance === 'object' ? { years: intIn(k.balance.years, 0, 20), months: intIn(k.balance.months, 0, 12) } : null;
  return { star: intIn(k.star, 0, 26), pada: intIn(k.pada, 1, 4) ?? 1, lagna: intIn(k.lagna, 0, 11), planets, balance: b && b.years !== null ? { years: b.years, months: b.months ?? 0 } : null };
}
/**
 * Server-side check of a shared copy before another member's phone receives it: display strings are neutralised
 * (no markup can travel between accounts), format fields must match their formats, numbers must be in range.
 */
export function cleanShareCopy(c) {
  if (!c) return null;
  const out = { id: String(c.id).replace(/[^\w.:-]/g, '').slice(0, 64), date: c.date };
  if (!out.id) return null;
  for (const k of ['name', 'nameTa', 'place']) if (typeof c[k] === 'string' && c[k].trim()) out[k] = cleanDisplayText(c[k], 120);
  if (!out.name) return null;
  for (const k of ['relation', 'gender', 'timeCertainty', 'dstChoice']) if (typeof c[k] === 'string' && /^[a-z][a-z_-]{0,29}$/.test(c[k])) out[k] = c[k];
  if (['ta', 'en', 'auto'].includes(c.nameDisplay)) out.nameDisplay = c.nameDisplay;
  if (typeof c.time === 'string' && /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(c.time)) out.time = c.time;
  if (typeof c.zone === 'string' && /^[A-Za-z_]+(\/[A-Za-z0-9_+-]+){0,2}$/.test(c.zone) && c.zone.length <= 40) out.zone = c.zone;
  const num = (k, min, max) => { if (typeof c[k] === 'number' && Number.isFinite(c[k]) && c[k] >= min && c[k] <= max) out[k] = c[k]; };
  num('lat', -90, 90); num('lon', -180, 180); num('tz', -12, 14); num('timeWindowMin', 0, 720);
  const k = cleanKattam(c.kattam);
  if (k) out.kattam = k;
  return out;
}

/** Family-plan check used when billing is enforced (read-only use of server/billing.js). */
export function hasFamilyEntitlement(user) {
  const ent = entitlementsFor(user) || {};
  if (typeof ent.familyCollab === 'boolean') return ent.familyCollab; // Family plan flag (server/billing.js)
  return ent.family === true || ent.plan === 'family' || Number(ent.familyProfiles) > 1;
}

const membership = (userId) => db().prepare(
  'SELECT m.group_id, m.role, m.joined_at, g.owner_user_id, g.name, g.created_at FROM family_members m JOIN family_groups g ON g.id = m.group_id WHERE m.user_id = ?',
).get(userId);
const memberOf = (groupId, userId) => db().prepare('SELECT role FROM family_members WHERE group_id = ? AND user_id = ?').get(groupId, userId);
const userName = (id) => db().prepare('SELECT name, email, phone FROM users WHERE id = ?').get(id);
/** A display name that never exposes a full phone number or email to other members. */
function displayName(id) {
  const u = userName(id);
  if (!u) return null;
  if (u.name) return u.name;
  if (u.email) return `${u.email[0]}…@${u.email.split('@')[1]}`;
  if (u.phone) return `…${u.phone.slice(-4)}`;
  return null;
}

/** Remove one person's shares in a group (server copies deleted). */
function dropShares(where, ...args) {
  db().prepare(`UPDATE profile_shares SET data = NULL, revoked_at = COALESCE(revoked_at, ?) WHERE ${where}`).run(now(), ...args);
}
function deleteGroup(groupId) {
  const d = db();
  d.prepare('DELETE FROM profile_shares WHERE group_id = ?').run(groupId);
  d.prepare('DELETE FROM family_invites WHERE group_id = ?').run(groupId);
  d.prepare('DELETE FROM family_members WHERE group_id = ?').run(groupId);
  d.prepare('DELETE FROM family_groups WHERE id = ?').run(groupId);
}
/** A member leaves (or is removed): their shares and pending invites in the group go with them. */
function removeMember(groupId, userId) {
  const d = db();
  d.prepare('DELETE FROM profile_shares WHERE group_id = ? AND owner_user_id = ?').run(groupId, userId);
  d.prepare('DELETE FROM family_invites WHERE group_id = ? AND created_by = ?').run(groupId, userId);
  d.prepare('DELETE FROM family_members WHERE group_id = ? AND user_id = ?').run(groupId, userId);
}
/** The owner leaves: ownership passes to the longest-standing adult, or the group is deleted. */
function ownerLeaves(groupId, ownerId) {
  const next = db().prepare("SELECT user_id FROM family_members WHERE group_id = ? AND user_id <> ? AND role = 'adult' ORDER BY joined_at LIMIT 1").get(groupId, ownerId);
  if (!next) { deleteGroup(groupId); return { deleted: true }; }
  removeMember(groupId, ownerId);
  db().prepare('UPDATE family_groups SET owner_user_id = ? WHERE id = ?').run(next.user_id, groupId);
  db().prepare("UPDATE family_members SET role = 'owner' WHERE group_id = ? AND user_id = ?").run(groupId, next.user_id);
  return { transferredTo: next.user_id };
}

/** The joining adult's age: from their own ("self") profile in the account backup, or the date the app sends. */
function joinerAge(userId, sentDate) {
  let self = null;
  try {
    const row = db().prepare('SELECT data FROM user_data WHERE user_id = ?').get(userId);
    self = (parse(row?.data)?.family || []).find((m) => m && m.relation === 'self') || null;
  } catch { /* no backup */ }
  const dates = [self?.date, /^\d{4}-\d{2}-\d{2}$/.test(String(sentDate || '')) ? sentDate : null].filter(Boolean);
  const profiles = dates.map((d) => ageProfile(d));
  return { minor: profiles.some((p) => p.minor), known: profiles.length > 0 };
}

function shareOut(s, me) {
  return {
    id: s.id, profileId: s.profile_id, permission: s.permission, groupId: s.group_id,
    createdAt: s.created_at, updatedAt: s.updated_at, editedByOther: !!s.updated_by && s.updated_by !== me,
  };
}

/** What the signed-in person sees on the Family screen. */
function overview(user) {
  const d = db();
  const m = membership(user.id);
  const entitled = !billingEnforced() || hasFamilyEntitlement(user);
  if (!m) return { group: null, invites: [], myShares: [], sharedWithMe: [], canCreate: entitled, billingEnforced: billingEnforced() };
  const members = d.prepare('SELECT user_id, role, joined_at FROM family_members WHERE group_id = ? ORDER BY joined_at').all(m.group_id)
    .map((x) => ({ userId: x.user_id, name: displayName(x.user_id), role: x.role, joinedAt: x.joined_at, you: x.user_id === user.id }));
  const others = members.filter((x) => !x.you).map((x) => ({ userId: x.userId, name: x.name }));
  const canInvite = m.role === 'owner' || m.role === 'adult';
  const invites = canInvite ? d.prepare('SELECT id, created_by, created_at, expires_at FROM family_invites WHERE group_id = ? AND revoked = 0 AND used < max_uses AND expires_at > ? ORDER BY created_at')
    .all(m.group_id, now()).map((i) => ({ id: i.id, createdAt: i.created_at, expiresAt: i.expires_at, mine: i.created_by === user.id, canRevoke: i.created_by === user.id || m.role === 'owner' })) : [];
  const myShares = d.prepare('SELECT * FROM profile_shares WHERE group_id = ? AND owner_user_id = ? AND revoked_at IS NULL').all(m.group_id, user.id)
    .map((s) => ({ ...shareOut(s, user.id), profile: parse(s.data), audience: others }));
  const sharedWithMe = d.prepare('SELECT * FROM profile_shares WHERE group_id = ? AND owner_user_id <> ? AND revoked_at IS NULL AND data IS NOT NULL').all(m.group_id, user.id)
    .map((s) => ({ ...shareOut(s, user.id), by: { userId: s.owner_user_id, name: displayName(s.owner_user_id) }, profile: parse(s.data) }));
  return {
    group: { id: m.group_id, name: m.name, ownerId: m.owner_user_id, role: m.role, createdAt: m.created_at, members, maxMembers: MAX_MEMBERS },
    invites, myShares, sharedWithMe, canCreate: false, billingEnforced: billingEnforced(),
  };
}

/** Data export (GET /api/me/export): memberships, invites created, shares made and received — metadata only. */
export function familyExport(userId) {
  const d = db();
  return {
    memberships: d.prepare('SELECT m.group_id AS groupId, g.name AS groupName, m.role, m.joined_at AS joinedAt, (g.owner_user_id = m.user_id) AS isOwner FROM family_members m JOIN family_groups g ON g.id = m.group_id WHERE m.user_id = ?')
      .all(userId).map((x) => ({ ...x, isOwner: !!x.isOwner })),
    invitesCreated: d.prepare('SELECT id, group_id AS groupId, created_at AS createdAt, expires_at AS expiresAt, used, max_uses AS maxUses, revoked FROM family_invites WHERE created_by = ?')
      .all(userId).map((x) => ({ ...x, revoked: !!x.revoked })), // code hashes withheld
    sharesMade: d.prepare('SELECT id, profile_id AS profileId, group_id AS groupId, permission, created_at AS createdAt, updated_at AS updatedAt, revoked_at AS revokedAt, data FROM profile_shares WHERE owner_user_id = ?')
      .all(userId).map(({ data, ...x }) => ({ ...x, sharedCopy: parse(data) })), // the person's own data, as the server holds it
    sharesReceived: d.prepare('SELECT s.id, s.profile_id AS profileId, s.group_id AS groupId, s.permission, s.owner_user_id AS ownerUserId, s.created_at AS createdAt FROM profile_shares s JOIN family_members m ON m.group_id = s.group_id AND m.user_id = ? WHERE s.owner_user_id <> ? AND s.revoked_at IS NULL')
      .all(userId, userId),
  };
}

/** Account deletion (DELETE /api/me): shares, server copies, invites, memberships; owned groups pass on or go. */
export function deleteFamilyData(userId) {
  const d = db();
  for (const g of d.prepare('SELECT id FROM family_groups WHERE owner_user_id = ?').all(userId)) ownerLeaves(g.id, userId);
  d.prepare('DELETE FROM profile_shares WHERE owner_user_id = ?').run(userId);
  d.prepare('DELETE FROM family_invites WHERE created_by = ?').run(userId);
  d.prepare('DELETE FROM family_members WHERE user_id = ?').run(userId);
  d.prepare('UPDATE profile_shares SET updated_by = NULL WHERE updated_by = ?').run(userId);
}

export function familyRouter() {
  const r = express.Router();
  const limitsOn = process.env.RATE_LIMITS !== 'off';
  const userKey = (req) => currentUser(req)?.id || req.ip;
  const inviteLimit = rateLimit({ windowMs: 60 * 60000, max: Number(process.env.FAMILY_INVITES_PER_HOUR) || 10, key: userKey, message: 'Too many invites. Please try again later.' });
  const acceptLimit = rateLimit({ windowMs: 15 * 60000, max: Number(process.env.FAMILY_ACCEPTS_PER_15MIN) || 10, key: userKey, message: 'Too many attempts. Please try again later.' });
  const acceptIpLimit = rateLimit({ windowMs: 15 * 60000, max: 30, message: 'Too many attempts. Please try again later.' });
  const pass = (_req, _res, next) => next();

  // Every family route needs a session.
  r.use('/family', (req, res, next) => {
    const user = currentUser(req);
    if (!user) return fail(res, 401, 'Not signed in');
    req.familyUser = user;
    next();
  });

  r.get('/family', (req, res) => res.json(overview(req.familyUser)));

  r.post('/family/groups', (req, res) => {
    const user = req.familyUser;
    if (membership(user.id)) return fail(res, 409, 'You are already in a family group');
    if (billingEnforced() && !hasFamilyEntitlement(user)) return fail(res, 402, 'Family sharing is part of the Family plan', { upgrade: true });
    const name = cleanDisplayText(req.body?.name || '', 60) || null;
    const id = newId();
    const t = now();
    db().prepare('INSERT INTO family_groups (id, owner_user_id, name, created_at) VALUES (?, ?, ?, ?)').run(id, user.id, name, t);
    db().prepare("INSERT INTO family_members (group_id, user_id, role, joined_at) VALUES (?, ?, 'owner', ?)").run(id, user.id, t);
    audit(req, 'family.group.create', id);
    res.status(201).json(overview(user));
  });

  r.delete('/family/groups/:id', (req, res) => {
    const user = req.familyUser;
    const g = db().prepare('SELECT owner_user_id FROM family_groups WHERE id = ?').get(req.params.id);
    if (!g || !memberOf(req.params.id, user.id)) return fail(res, 404, 'Not found');
    if (g.owner_user_id !== user.id) return fail(res, 403, 'Only the family owner can delete the group');
    deleteGroup(req.params.id);
    audit(req, 'family.group.delete', req.params.id);
    res.json({ ok: true, deleted: true });
  });

  r.post('/family/groups/:id/leave', (req, res) => {
    const user = req.familyUser;
    const role = memberOf(req.params.id, user.id)?.role;
    if (!role) return fail(res, 404, 'Not found');
    const out = role === 'owner' ? ownerLeaves(req.params.id, user.id) : (removeMember(req.params.id, user.id), {});
    audit(req, 'family.member.leave', req.params.id);
    res.json({ ok: true, ...(out.deleted ? { groupDeleted: true } : {}), ...(out.transferredTo ? { ownershipTransferred: true } : {}) });
  });

  r.delete('/family/groups/:id/members/:userId', (req, res) => {
    const user = req.familyUser;
    if (memberOf(req.params.id, user.id)?.role !== 'owner') return fail(res, memberOf(req.params.id, user.id) ? 403 : 404, memberOf(req.params.id, user.id) ? 'Only the family owner can remove members' : 'Not found');
    if (req.params.userId === user.id) return fail(res, 400, 'Use leave or delete for yourself');
    if (!memberOf(req.params.id, req.params.userId)) return fail(res, 404, 'Not found');
    removeMember(req.params.id, req.params.userId);
    audit(req, 'family.member.remove', req.params.id);
    res.json({ ok: true });
  });

  r.post('/family/groups/:id/invites', limitsOn ? inviteLimit : pass, (req, res) => {
    const user = req.familyUser;
    const role = memberOf(req.params.id, user.id)?.role;
    if (!role) return fail(res, 404, 'Not found');
    if (role !== 'owner' && role !== 'adult') return fail(res, 403, 'Only adult members can invite');
    const g = db().prepare('SELECT owner_user_id FROM family_groups WHERE id = ?').get(req.params.id);
    if (billingEnforced() && !hasFamilyEntitlement({ id: g.owner_user_id })) return fail(res, 402, 'Family sharing is part of the Family plan', { upgrade: true });
    const count = db().prepare('SELECT COUNT(*) AS n FROM family_members WHERE group_id = ?').get(req.params.id).n;
    if (count >= MAX_MEMBERS) return fail(res, 409, `A family group holds up to ${MAX_MEMBERS} people`);
    const code = newCode();
    const id = newId();
    const t = now();
    db().prepare('INSERT INTO family_invites (id, code_hash, group_id, created_by, created_at, expires_at, max_uses, used, revoked) VALUES (?, ?, ?, ?, ?, ?, 1, 0, 0)')
      .run(id, sha256(code), req.params.id, user.id, t, t + INVITE_TTL);
    audit(req, 'family.invite.create', req.params.id);
    const base = (process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '');
    res.status(201).json({ id, code: showCode(code), link: `${base}/#join=${showCode(code)}`, expiresAt: t + INVITE_TTL });
  });

  r.delete('/family/invites/:id', (req, res) => {
    const user = req.familyUser;
    const inv = db().prepare('SELECT group_id, created_by FROM family_invites WHERE id = ?').get(req.params.id);
    const role = inv && memberOf(inv.group_id, user.id)?.role;
    if (!role) return fail(res, 404, 'Not found');
    if (inv.created_by !== user.id && role !== 'owner') return fail(res, 403, 'Only the person who made the invite or the owner can cancel it');
    db().prepare('UPDATE family_invites SET revoked = 1 WHERE id = ?').run(req.params.id);
    audit(req, 'family.invite.revoke', inv.group_id);
    res.json({ ok: true });
  });

  r.post('/family/invites/accept', limitsOn ? acceptIpLimit : pass, limitsOn ? acceptLimit : pass, (req, res) => {
    const user = req.familyUser;
    const code = normCode(req.body?.code);
    if (code.length !== 12) return fail(res, 400, 'Enter the 12-letter invite code');
    const d = db();
    const inv = d.prepare('SELECT * FROM family_invites WHERE code_hash = ?').get(sha256(code));
    if (!inv || inv.revoked) return fail(res, 404, 'This invite code is not valid');
    if (inv.expires_at <= now()) return fail(res, 410, 'This invite has expired — ask for a new one');
    if (inv.used >= inv.max_uses) return fail(res, 410, 'This invite has already been used');
    if (memberOf(inv.group_id, user.id)) return fail(res, 409, 'You are already in this family');
    if (membership(user.id)) return fail(res, 409, 'You are already in a family group — leave it first');
    const age = joinerAge(user.id, req.body?.selfBirthDate);
    if (age.minor) return fail(res, 403, 'Family membership is for adults. A parent can share a child’s chart instead.', { minor: true });
    if (d.prepare('SELECT COUNT(*) AS n FROM family_members WHERE group_id = ?').get(inv.group_id).n >= MAX_MEMBERS) return fail(res, 409, `A family group holds up to ${MAX_MEMBERS} people`);
    const claimed = d.prepare('UPDATE family_invites SET used = used + 1 WHERE id = ? AND used < max_uses AND revoked = 0').run(inv.id);
    if (!claimed.changes) return fail(res, 410, 'This invite has already been used');
    d.prepare("INSERT INTO family_members (group_id, user_id, role, joined_at) VALUES (?, ?, 'adult', ?)").run(inv.group_id, user.id, now());
    audit(req, 'family.invite.accept', inv.group_id);
    res.json(overview(user));
  });

  // Share one profile with the group (or update the permission / copy of an existing share).
  r.post('/family/shares', (req, res) => {
    const user = req.familyUser;
    const { groupId, permission = 'view', profile } = req.body || {};
    if (!memberOf(String(groupId || ''), user.id)) return fail(res, 404, 'Not found');
    if (!PERMISSIONS.includes(permission)) return fail(res, 400, 'permission must be view or edit');
    if (!profile || typeof profile !== 'object' || Array.isArray(profile)) return fail(res, 400, 'profile is required');
    if (isPrivateProfile(profile)) return fail(res, 403, 'Private profiles stay on your phone and cannot be shared');
    if (profile.shared) return fail(res, 403, 'A profile shared with you cannot be shared again');
    const copy = cleanShareCopy(shareableProfile(profile));
    if (!copy) return fail(res, 400, 'This profile needs a name and birth date to share');
    const json = JSON.stringify(copy);
    if (Buffer.byteLength(json) > 16 * 1024) return fail(res, 413, 'profile too large');
    const d = db();
    const t = now();
    const existing = d.prepare('SELECT id FROM profile_shares WHERE owner_user_id = ? AND group_id = ? AND profile_id = ? AND revoked_at IS NULL').get(user.id, groupId, copy.id);
    if (existing) {
      d.prepare('UPDATE profile_shares SET permission = ?, data = ?, updated_at = ?, updated_by = ? WHERE id = ?').run(permission, json, t, user.id, existing.id);
      audit(req, 'family.share.update', groupId);
      return res.json({ share: shareOut(d.prepare('SELECT * FROM profile_shares WHERE id = ?').get(existing.id), user.id) });
    }
    if (d.prepare('SELECT COUNT(*) AS n FROM profile_shares WHERE owner_user_id = ? AND revoked_at IS NULL').get(user.id).n >= MAX_SHARES_PER_USER) return fail(res, 409, 'Too many shared profiles');
    const id = newId();
    d.prepare('INSERT INTO profile_shares (id, profile_id, owner_user_id, group_id, permission, data, created_at, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, copy.id, user.id, groupId, permission, json, t, t, user.id);
    audit(req, 'family.share.create', groupId, { permission });
    res.status(201).json({ share: shareOut(d.prepare('SELECT * FROM profile_shares WHERE id = ?').get(id), user.id) });
  });

  const activeShare = (id) => db().prepare('SELECT * FROM profile_shares WHERE id = ? AND revoked_at IS NULL').get(id);

  // Change the permission (owner of the profile only).
  r.patch('/family/shares/:id', (req, res) => {
    const user = req.familyUser;
    const s = activeShare(req.params.id);
    if (!s || !memberOf(s.group_id, user.id)) return fail(res, 404, 'Not found');
    if (s.owner_user_id !== user.id) return fail(res, 403, 'Only the person who shared this profile can change who may edit it');
    const permission = req.body?.permission;
    if (!PERMISSIONS.includes(permission)) return fail(res, 400, 'permission must be view or edit');
    db().prepare('UPDATE profile_shares SET permission = ? WHERE id = ?').run(permission, s.id);
    audit(req, 'family.share.permission', s.group_id, { permission });
    res.json({ share: shareOut(activeShare(s.id), user.id) });
  });

  // Update the shared copy: the owner always; other members only with edit permission.
  r.put('/family/shares/:id/profile', (req, res) => {
    const user = req.familyUser;
    const s = activeShare(req.params.id);
    if (!s || !memberOf(s.group_id, user.id)) return fail(res, 404, 'Not found');
    if (s.owner_user_id !== user.id && s.permission !== 'edit') return fail(res, 403, 'This profile was shared view-only');
    const profile = req.body?.profile;
    if (!profile || typeof profile !== 'object' || Array.isArray(profile)) return fail(res, 400, 'profile is required');
    if (s.owner_user_id === user.id && isPrivateProfile(profile)) return fail(res, 403, 'Private profiles cannot be shared — revoke the share instead');
    const copy = cleanShareCopy(shareableProfile({ ...profile, id: s.profile_id, private: undefined, shared: undefined }));
    if (!copy) return fail(res, 400, 'This profile needs a name and birth date');
    const json = JSON.stringify(copy);
    if (Buffer.byteLength(json) > 16 * 1024) return fail(res, 413, 'profile too large');
    db().prepare('UPDATE profile_shares SET data = ?, updated_at = ?, updated_by = ? WHERE id = ?').run(json, now(), user.id, s.id);
    audit(req, 'family.share.edit', s.group_id);
    res.json({ share: { ...shareOut(activeShare(s.id), user.id), profile: copy } });
  });

  // Revoke: the server copy is deleted now; other phones drop it on their next sync.
  r.delete('/family/shares/:id', (req, res) => {
    const user = req.familyUser;
    const s = activeShare(req.params.id);
    if (!s || !memberOf(s.group_id, user.id)) return fail(res, 404, 'Not found');
    if (s.owner_user_id !== user.id) return fail(res, 403, 'Only the person who shared this profile can stop sharing it');
    dropShares('id = ?', s.id);
    audit(req, 'family.share.revoke', s.group_id);
    res.json({ ok: true });
  });

  return r;
}

export { ROLES };
