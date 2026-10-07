// Account backup policy (pure — no DOM, so tests can check it): what may leave the phone when profiles sync to
// the signed-in account (PUT /api/me/data).
//   • Nothing is uploaded unless the person's "Back up family profiles" consent is on (Privacy & data).
//   • A profile marked private (🔒) never leaves this phone, even with backup on.

/** True when this profile must stay on the device. */
export const isPrivateProfile = (m) => Boolean(m && m.private);

/**
 * The data to upload, or null when nothing may be uploaded.
 * @param {{family?: object[], activeId?: string|null, ancestors?: object[]}} local
 * @param {{backup?: boolean}} consent
 */
export function backupPayload(local, consent) {
  if (!consent || consent.backup !== true) return null;
  const family = (Array.isArray(local?.family) ? local.family : []).filter((m) => m && !isPrivateProfile(m));
  const activeId = family.some((m) => m.id === local?.activeId) ? local.activeId : family[0]?.id ?? null;
  return { family, activeId, ancestors: Array.isArray(local?.ancestors) ? local.ancestors : [] };
}

/**
 * Merge the account's saved family with this device's after sign-in. Account copies win for shared profiles;
 * a profile that is private on this phone always keeps the phone's copy (an older server copy, uploaded before
 * it was marked private, must never overwrite it); device-only people are kept.
 */
export function mergeAccountFamily(remote, local) {
  const loc = Array.isArray(local) ? local : [];
  const privateIds = new Set(loc.filter(isPrivateProfile).map((m) => m.id));
  const fromAccount = (Array.isArray(remote) ? remote : []).filter((m) => m && !privateIds.has(m.id));
  const ids = new Set(fromAccount.map((m) => m.id));
  return [...fromAccount, ...loc.filter((m) => !ids.has(m.id))];
}
