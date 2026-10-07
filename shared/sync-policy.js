// Account backup policy (pure — no DOM, so tests can check it): what may leave the phone when profiles sync to
// the signed-in account (PUT /api/me/data).
//   • Nothing is uploaded unless the person's "Back up family profiles" consent is on (Privacy & data).
//   • A profile marked private (🔒) never leaves this phone, even with backup on.
//   • Saved goals (shared/goals.js) ride along only with the same consent, and never a goal of a private profile.
//   • The diary (shared/journal.js) needs the backup consent AND its own switch (consent.journal), off by default.

/** Goals that may leave the phone: never a goal of a private profile, never one marked private. */
export function shareableGoals(goals, privateIds = new Set()) {
  return (Array.isArray(goals) ? goals : []).filter((g) => g && !g.private && !(g.personId && privateIds.has(g.personId)));
}

/** True when this profile must stay on the device. */
export const isPrivateProfile = (m) => Boolean(m && m.private);

/**
 * The data to upload, or null when nothing may be uploaded.
 * @param {{family?: object[], activeId?: string|null, ancestors?: object[], goals?: {goals: object[], deleted?: string[]}|null}} local
 * @param {{backup?: boolean, journal?: boolean}} consent
 */
export function backupPayload(local, consent) {
  if (!consent || consent.backup !== true) return null;
  // Profiles other people shared with me belong to their accounts (server/family.js): never backed up as mine.
  const family = (Array.isArray(local?.family) ? local.family : []).filter((m) => m && !isPrivateProfile(m) && !m.shared);
  const activeId = family.some((m) => m.id === local?.activeId) ? local.activeId : family[0]?.id ?? null;
  const out = { family, activeId, ancestors: Array.isArray(local?.ancestors) ? local.ancestors : [] };
  if (local?.goals && Array.isArray(local.goals.goals)) {
    const privateIds = new Set((Array.isArray(local?.family) ? local.family : []).filter(isPrivateProfile).map((m) => m.id));
    out.goals = { v: 1, goals: shareableGoals(local.goals.goals, privateIds), deleted: Array.isArray(local.goals.deleted) ? local.goals.deleted.slice(-200) : [] };
  }
  // Thunai diary (shared/journal.js): private on the phone by default. It rides along only when the backup consent
  // AND the separate diary switch are both on — never an entry of a private profile or one marked private.
  if (consent.journal === true && local?.journal && Array.isArray(local.journal.entries)) {
    const privateIds = new Set((Array.isArray(local?.family) ? local.family : []).filter(isPrivateProfile).map((m) => m.id));
    out.journal = shareableJournal(local.journal, privateIds);
  }
  return out;
}

/** Diary entries that may leave the phone (newest 300, notes capped) — never private ones or a private profile's. */
export function shareableJournal(journal, privateIds = new Set()) {
  const entries = (Array.isArray(journal?.entries) ? journal.entries : [])
    .filter((e) => e && !e.private && !(e.personId && privateIds.has(e.personId)))
    .slice(-300).map((e) => ({ ...e, note: typeof e.note === 'string' ? e.note.slice(0, 600) : '' }));
  return { v: 1, entries, deleted: Array.isArray(journal?.deleted) ? journal.deleted.slice(-200) : [], days: Array.isArray(journal?.days) ? journal.days.slice(-400) : [] };
}

/**
 * Merge the account's saved family with this device's after sign-in. Account copies win for shared profiles;
 * a profile that is private on this phone always keeps the phone's copy (an older server copy, uploaded before
 * it was marked private, must never overwrite it); device-only people are kept.
 */
export function mergeAccountFamily(remote, local) {
  const loc = (Array.isArray(local) ? local : []).filter((m) => m && !m.shared); // shared-with-me copies resync separately
  const privateIds = new Set(loc.filter(isPrivateProfile).map((m) => m.id));
  const fromAccount = (Array.isArray(remote) ? remote : []).filter((m) => m && !privateIds.has(m.id));
  const ids = new Set(fromAccount.map((m) => m.id));
  return [...fromAccount, ...loc.filter((m) => !ids.has(m.id))];
}

// ---------------------------------------------------------------- shared family (server/family.js)
// Sharing a profile with a family group sends ONLY the birth details a chart needs. Never private profiles,
// never chats, health notes, goals, marital or children notes, faith or any other field.

/** Fields copied into a family share — birth data for the chart and the name to show. */
export const SHARE_FIELDS = ['id', 'name', 'nameTa', 'nameDisplay', 'relation', 'gender', 'date', 'time', 'timeCertainty', 'timeWindowMin', 'dstChoice', 'place', 'lat', 'lon', 'tz', 'zone', 'kattam'];
const SHARE_STR_MAX = 120;

/** True when this profile may be offered for sharing (not private, not someone else's shared copy). */
export const canShareProfile = (m) => Boolean(m && !isPrivateProfile(m) && !m.shared && m.id && m.date);

/** The minimised copy sent to the server for a share, or null when the profile may not be shared. */
export function shareableProfile(m) {
  if (!m || typeof m !== 'object' || isPrivateProfile(m)) return null;
  const out = {};
  for (const k of SHARE_FIELDS) {
    const v = m[k];
    if (v === undefined || v === null || v === '') continue;
    if (k === 'nameDisplay') { if (['ta', 'en', 'auto'].includes(v)) out.nameDisplay = v; continue; } // how the owner wants the name shown
    if (k === 'kattam') { if (typeof v === 'object' && !Array.isArray(v)) out.kattam = v; continue; }
    if (typeof v === 'number') { if (Number.isFinite(v)) out[k] = v; continue; }
    if (typeof v === 'string') out[k] = v.slice(0, SHARE_STR_MAX);
  }
  out.id = String(out.id || '').slice(0, 64);
  if (!out.id || !/^\d{4}-\d{2}-\d{2}$/.test(out.date || '') || !out.name) return null;
  return out;
}

/** Local id of a profile someone shared with me (never collides with my own profile ids). */
export const sharedLocalId = (shareId) => `sh_${shareId}`;

/**
 * Put the profiles shared with me into my family list: adds / updates the current ones (marked
 * `shared: { shareId, by, permission }`), and removes any whose share was revoked (or when signed out: pass []).
 * My own profiles are never touched.
 */
export function mergeSharedProfiles(local, received) {
  const own = (Array.isArray(local) ? local : []).filter((m) => m && !m.shared);
  const incoming = (Array.isArray(received) ? received : []).filter((s) => s && s.id && s.profile).map((s) => ({
    ...shareableProfile({ ...s.profile, private: undefined }) || {},
    id: sharedLocalId(s.id),
    shared: { shareId: s.id, by: s.by?.name || null, permission: s.permission === 'edit' ? 'edit' : 'view' },
  })).filter((m) => m.date);
  return [...own, ...incoming];
}
