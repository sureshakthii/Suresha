// Deleting a person from the family list (shared/family-delete.js, public/account.js family screen).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canDeleteMember, nextActiveId, deleteMember, undoDelete } from '../shared/family-delete.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const fam = () => [
  { id: 'a', name: 'Suresh', relation: 'self' },
  { id: 'b', name: 'Meena', relation: 'spouse' },
  { id: 'c', name: 'Kavin', relation: 'son' },
];

test('the last remaining person cannot be deleted; missing and shared-with-me profiles cannot either', () => {
  assert.deepEqual(canDeleteMember([{ id: 'a' }], 'a'), { ok: false, reason: 'last' });
  assert.equal(canDeleteMember(fam(), 'zz').reason, 'missing');
  assert.equal(canDeleteMember([...fam(), { id: 'shared:x', shared: { permission: 'edit' } }], 'shared:x').reason, 'shared');
  assert.equal(canDeleteMember(fam(), 'b').ok, true);
  assert.equal(canDeleteMember(fam(), 'a').ok, true, 'the self profile can go when someone else remains');
  const r = deleteMember({ family: [{ id: 'a' }], activeId: 'a' }, 'a');
  assert.equal(r.ok, false);
  assert.equal(r.family.length, 1, 'nothing changes when refused');
});

test('deleting a person who is not active keeps the active person', () => {
  const r = deleteMember({ family: fam(), activeId: 'a' }, 'c');
  assert.equal(r.ok, true);
  assert.deepEqual(r.family.map((m) => m.id), ['a', 'b']);
  assert.equal(r.activeId, 'a');
  assert.equal(r.removed.member.name, 'Kavin');
  assert.equal(r.removed.index, 2);
});

test('deleting the active person makes another active: self first, then my own profiles, then anyone', () => {
  assert.equal(deleteMember({ family: fam(), activeId: 'b' }, 'b').activeId, 'a');
  assert.equal(deleteMember({ family: fam(), activeId: 'a' }, 'a').activeId, 'b');
  const withShared = [{ id: 's', shared: { permission: 'view' } }, { id: 'a', relation: 'self' }, { id: 'c', relation: 'son' }];
  assert.equal(nextActiveId(withShared, 'a', 'a'), 'c', 'my own profile before one shared with me');
  assert.equal(nextActiveId([{ id: 's', shared: {} }, { id: 'a' }], 'a', 'a'), 's');
  assert.equal(nextActiveId([{ id: 'a' }], 'a', 'a'), null);
});

test('deleting down to one person, one at a time', () => {
  let d = { family: fam(), activeId: 'c' };
  d = deleteMember(d, 'c');
  assert.equal(d.activeId, 'a');
  d = deleteMember(d, 'a');
  assert.deepEqual(d.family.map((m) => m.id), ['b']);
  assert.equal(d.activeId, 'b');
  const last = deleteMember(d, 'b');
  assert.equal(last.ok, false);
  assert.equal(last.reason, 'last');
});

test("the person's goals go with them and are remembered as deleted (a backup never restores them)", () => {
  const goals = { v: 1, goals: [{ id: 'g1', personId: 'b' }, { id: 'g2', personId: 'a' }, { id: 'g3', personId: 'b' }], deleted: ['old'] };
  const r = deleteMember({ family: fam(), activeId: 'a', goals }, 'b');
  assert.deepEqual(r.goals.goals.map((g) => g.id), ['g2']);
  assert.deepEqual(r.goals.deleted, ['old', 'g1', 'g3']);
  assert.deepEqual(r.removed.goalIds, ['g1', 'g3']);
  assert.equal(goals.goals.length, 3, 'input is not mutated');
  const none = deleteMember({ family: fam(), activeId: 'a', goals }, 'c');
  assert.equal(none.goals, goals, 'untouched when the person had no goals');
  assert.equal(deleteMember({ family: fam(), activeId: 'a', goals: null }, 'c').goals, null);
});

test("saved journeys drop the person's id from 'who is going' but keep the trip record", () => {
  const plans = [{ id: 'p1', travellers: ['Suresh', 'Meena'], form: { who: ['a', 'b'] } }, { id: 'p2', form: { who: ['a'] } }];
  const r = deleteMember({ family: fam(), activeId: 'a', plans }, 'b');
  assert.deepEqual(r.plans[0].form.who, ['a']);
  assert.deepEqual(r.plans[0].travellers, ['Suresh', 'Meena']);
  assert.equal(r.plans[1], plans[1]);
  assert.deepEqual(plans[0].form.who, ['a', 'b'], 'input is not mutated');
});

test('undo restores the snapshot taken before deleting', () => {
  const snap = { family: fam(), activeId: 'b', goals: { v: 1, goals: [{ id: 'g1', personId: 'b' }], deleted: [] }, plans: null };
  const r = deleteMember(snap, 'b');
  assert.equal(r.family.length, 2);
  const back = undoDelete(snap);
  assert.deepEqual(back.family.map((m) => m.id), ['a', 'b', 'c']);
  assert.equal(back.activeId, 'b');
  assert.equal(back.goals.goals.length, 1);
});

test('family screen: a labelled delete button on each own person, confirmation, undo toast, shares stop after undo window', () => {
  const src = fs.readFileSync(path.join(root, 'public/account.js'), 'utf8');
  assert.match(src, /data-del="\$\{esc\(m\.id\)\}" aria-label="\$\{esc\(L\(`Delete \$\{displayName\(m\)\}`, `\$\{displayName\(m\)\} நீக்கு`\)\)\}"/);
  assert.match(src, /m\.shared \? '' : `<button type="button" class="fam-del"/, 'no delete on profiles shared with me');
  assert.match(src, /role="dialog" aria-modal="true" aria-labelledby="famDelT"/);
  assert.match(src, /removed from this phone/);
  assert.match(src, /account backup/);
  assert.match(src, /family links sharing this chart are stopped/);
  assert.match(src, /const UNDO_MS = 8000/);
  assert.match(src, /setTimeout\(finishPendingUndo, UNDO_MS\)/);
  assert.match(src, /if \(state\.user\) syncShares\(\); \/\/ the undo window is over/);
  assert.match(src, /\.fam-del \{[^}]*width: 44px; height: 44px/, 'tap target ≥ 44px');
  assert.doesNotMatch(src, /state\.family\.length > 1 \? `<button type="button" class="link-btn danger/);
  const sw = fs.readFileSync(path.join(root, 'public/sw.js'), 'utf8');
  assert.match(sw, /'\/shared\/family-delete\.js'/, 'precached for offline use');
});
