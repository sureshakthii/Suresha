// Deleting a person from the family list (குடும்ப ஜாதகம் → நீக்கு). Pure: takes the saved data, returns the new
// data. The family screen (public/account.js) saves the result, offers Undo for a few seconds, and only then lets
// the share sync stop that person's shared family links (public/family-share.js syncShares revokes shares whose
// profile no longer exists on this phone).
//
// Rules
//  • The last remaining person cannot be deleted — there would be no chart left to show. Edit them, or add
//    someone else first.
//  • A profile someone else shared with me is not mine to delete here (it comes back on the next sync); the owner
//    stops sharing, or I leave the family group.
//  • Deleting the active person makes another person active: my own "self" profile first, then the first of my
//    own profiles, then anyone left.
//  • Data kept for that person on this phone goes with them: their goals (kj_goals, remembered as deleted so an
//    older backup never brings them back) and their id in saved journeys' "who is going" list (the traveller
//    names already written into a saved journey stay as they were — that is a record of the trip).

/** Can this person be deleted? { ok, reason } — reason: 'missing' | 'last' | 'shared'. */
export function canDeleteMember(family = [], id) {
  const list = Array.isArray(family) ? family : [];
  const m = list.find((x) => x && x.id === id);
  if (!m) return { ok: false, reason: 'missing' };
  if (m.shared) return { ok: false, reason: 'shared' };
  if (list.length <= 1) return { ok: false, reason: 'last' };
  return { ok: true, reason: null };
}

/** The person to make active after `removedId` leaves (null when nobody is left). */
export function nextActiveId(family = [], activeId, removedId) {
  const rest = (family || []).filter((x) => x && x.id !== removedId);
  if (activeId && activeId !== removedId && rest.some((x) => x.id === activeId)) return activeId;
  return (rest.find((x) => x.relation === 'self' && !x.shared) || rest.find((x) => !x.shared) || rest[0])?.id || null;
}

/**
 * Delete one person. data: { family, activeId, goals (kj_goals state or null), plans (kj_plans array or null) }.
 * Returns { ok, reason, family, activeId, goals, plans, removed: { member, index, goalIds } }; when !ok the
 * data comes back unchanged.
 */
export function deleteMember(data = {}, id) {
  const family = Array.isArray(data.family) ? data.family : [];
  const check = canDeleteMember(family, id);
  const same = { family, activeId: data.activeId ?? null, goals: data.goals ?? null, plans: data.plans ?? null };
  if (!check.ok) return { ok: false, reason: check.reason, ...same, removed: null };
  const index = family.findIndex((x) => x.id === id);
  const member = family[index];
  const nextFamily = family.filter((x) => x.id !== id);
  const activeId = nextActiveId(family, data.activeId, id);

  let goals = data.goals ?? null;
  let goalIds = [];
  if (goals && Array.isArray(goals.goals)) {
    goalIds = goals.goals.filter((g) => g && g.personId === id).map((g) => g.id);
    if (goalIds.length) {
      const deleted = Array.isArray(goals.deleted) ? goals.deleted : [];
      goals = { ...goals, goals: goals.goals.filter((g) => !goalIds.includes(g.id)), deleted: [...new Set([...deleted, ...goalIds])].slice(-200) };
    }
  }

  let plans = data.plans ?? null;
  if (Array.isArray(plans) && plans.some((p) => Array.isArray(p?.form?.who) && p.form.who.includes(id))) {
    plans = plans.map((p) => (Array.isArray(p?.form?.who) && p.form.who.includes(id) ? { ...p, form: { ...p.form, who: p.form.who.filter((w) => w !== id) } } : p));
  }

  return { ok: true, reason: null, family: nextFamily, activeId, goals, plans, removed: { member, index, goalIds } };
}

/** Put a deleted person back where they were (Undo). Pass the snapshot taken before deleteMember. */
export function undoDelete(snapshot = {}) {
  return {
    family: Array.isArray(snapshot.family) ? snapshot.family.slice() : [],
    activeId: snapshot.activeId ?? null,
    goals: snapshot.goals ?? null,
    plans: snapshot.plans ?? null,
  };
}
