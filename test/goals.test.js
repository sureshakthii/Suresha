// Goals workspace (shared/goals.js, owner requirement §8a): templates with practical steps first, pure CRUD,
// the real deadline always wins over optional chart periods, age guard (no marriage / career goals for minors),
// weekly-plan integration (dated steps; deadline-type fixed) and backup privacy (only with consent, never goals of
// private profiles).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  TEMPLATES, templateById, templatesFor, emptyGoals, createGoal, updateGoal, deleteGoal, toggleStep, addStep, editStep, deleteStep,
  moveStep, progress, nextStep, activeGoals, canAddGoal, topGoal, daysLeft, deadlineText, nextReview, reviewDue, markReviewed,
  weekSteps, goodPeriods, askText, mergeGoals, validateGoal, normaliseStep, FREE_ACTIVE_GOALS,
} from '../shared/goals.js';
import { ageProfile } from '../shared/age-guard.js';
import { birthChart } from '../shared/astro.js';
import { buildWeek } from '../shared/week-plan.js';
import { backupPayload } from '../shared/sync-policy.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TODAY = '2026-10-07';
const NOW = new Date('2026-10-07T03:30:00Z'); // 9:00 AM in Chennai
const adult = ageProfile('1994-02-18', { today: TODAY });
const minor = ageProfile('2014-05-01', { today: TODAY });
const unknown = ageProfile(null, { today: TODAY });
const opts = { profile: adult, today: TODAY, now: NOW };
const make = (s, input, o = opts) => { const r = createGoal(s, input, o); assert.ok(r.ok, JSON.stringify(r.errors)); return r; };

test('templates: practical steps first, Tamil + English, chart question only where it fits', () => {
  const ids = TEMPLATES.map((t) => t.id);
  assert.deepEqual(ids, ['marriage', 'journey', 'career', 'education', 'house', 'health', 'custom']);
  for (const t of TEMPLATES) {
    assert.ok(t.en && /[஀-௿]/.test(t.ta), t.id);
    assert.ok(t.steps.length >= 1 && t.steps.every((s) => s.en && /[஀-௿]/.test(s.ta)), `${t.id} steps`);
  }
  const m = templateById('marriage');
  assert.match(m.steps[0].en, /family/i, 'marriage starts with talking to the family');
  assert.ok(m.steps.some((s) => /horoscope/i.test(s.en)) && m.steps.some((s) => /porutham/i.test(s.en)) && m.steps.some((s) => /muhurtham/i.test(s.en)) && m.steps.some((s) => /venue|budget/i.test(s.en)));
  const j = templateById('journey');
  assert.ok(j.steps.some((s) => /dates/i.test(s.en)) && j.steps.some((s) => /budget/i.test(s.en)) && j.steps.some((s) => /book .*yourself/i.test(s.en)));
  const c = templateById('career');
  assert.ok(c.steps.some((s) => /CV/.test(s.en)) && c.steps.some((s) => /appl/i.test(s.en)) && c.steps.some((s) => /interview/i.test(s.en)));
  assert.equal(templateById('journey').question, null);
  assert.equal(templateById('health').question, null);
  assert.ok(templateById('health').habitsOnly);
  assert.ok(!templateById('health').steps.some((s) => /\b(dose|tablet|cure|treat)\b/i.test(s.en)), 'health routine: habits only');
  assert.equal(templateById('nope').id, 'custom');
  // No fear words anywhere in the templates.
  const all = JSON.stringify(TEMPLATES);
  assert.doesNotMatch(all, /danger|bad period|warning|doom|curse|ஆபத்து|கெட்ட காலம்/i);
});

test('create / update / delete — the input state is never changed; steps in the chosen language', () => {
  const s0 = emptyGoals();
  const r = make(s0, { template: 'marriage', title: 'Kavya wedding', personId: 'me', deadline: '2027-02-15', constraints: 'Budget 8 lakh; Chennai', lang: 'en' });
  assert.equal(s0.goals.length, 0);
  assert.equal(r.state.goals.length, 1);
  const g = r.goal;
  assert.equal(g.template, 'marriage');
  assert.equal(g.deadline, '2027-02-15');
  assert.equal(g.steps[0].title, templateById('marriage').steps[0].en);
  assert.equal(g.steps.length, templateById('marriage').steps.length);
  assert.equal(g.status, 'active');
  assert.deepEqual(g.followUp, { weekly: true, weekday: 0 });
  const ta = make(emptyGoals(), { template: 'journey', title: 'Palani', personId: 'me', lang: 'ta' }).goal;
  assert.equal(ta.steps[0].title, templateById('journey').steps[0].ta);

  const u = updateGoal(r.state, g.id, { title: '  Kavya   wedding prep ', deadline: '2027-03-01', notes: 'Talk to Mama', template: 'custom' }, opts);
  assert.ok(u.ok);
  assert.equal(u.goal.title, 'Kavya wedding prep');
  assert.equal(u.goal.deadline, '2027-03-01');
  assert.equal(u.goal.template, 'marriage', 'the template cannot be switched by an edit');
  assert.equal(u.goal.constraints, 'Budget 8 lakh; Chennai', 'fields not in the patch are kept');
  assert.equal(u.goal.createdAt, g.createdAt);
  assert.ok(!updateGoal(r.state, 'missing', { title: 'x' }, opts).ok);
  assert.ok(!updateGoal(r.state, g.id, { title: '   ' }, opts).ok, 'an edit that empties the name is refused');

  const d = deleteGoal(u.state, g.id);
  assert.equal(d.goals.length, 0);
  assert.deepEqual(d.deleted, [g.id], 'deletion is remembered so a backup never restores it');
});

test('validation: a name is needed, a new deadline cannot be in the past, dates must be real', () => {
  assert.ok(validateGoal({ template: 'journey', title: '' }, opts).some((e) => e.field === 'title'));
  assert.ok(validateGoal({ template: 'journey', title: 'x', deadline: '2026-10-01' }, opts).some((e) => e.field === 'deadline'));
  assert.ok(validateGoal({ template: 'journey', title: 'x', deadline: '07/10/2026' }, opts).some((e) => e.field === 'deadline'));
  assert.equal(validateGoal({ template: 'journey', title: 'x', deadline: TODAY }, opts).length, 0);
  assert.equal(validateGoal({ template: 'journey', title: 'x', deadline: '2026-10-01' }, { ...opts, editing: true }).length, 0, 'an old deadline may be kept while correcting');
  const n = normaliseStep({ title: ' Call   mandapam ', date: '2026-11-02', time: '25:00', kind: 'deadline' });
  assert.equal(n.title, 'Call mandapam');
  assert.equal(n.time, null);
  assert.equal(n.kind, 'deadline');
  assert.equal(normaliseStep({ title: 'x', kind: 'deadline' }).kind, 'flexible', 'an undated step cannot be a deadline');
  assert.equal(normaliseStep({ title: '' }), null);
});

test('age gate: no marriage, career or property goals for a minor (or an unknown age); open goals stay open', () => {
  for (const t of ['marriage', 'career', 'house']) {
    const r = createGoal(emptyGoals(), { template: t, title: 'x' }, { ...opts, profile: minor });
    assert.ok(!r.ok && r.errors.some((e) => e.field === 'person'), `${t} refused for a minor`);
    assert.ok(!createGoal(emptyGoals(), { template: t, title: 'x' }, { ...opts, profile: unknown }).ok, `${t} refused when the age is unknown`);
    assert.ok(createGoal(emptyGoals(), { template: t, title: 'x' }, opts).ok, `${t} fine for an adult`);
  }
  for (const t of ['journey', 'education', 'health', 'custom']) assert.ok(createGoal(emptyGoals(), { template: t, title: 'x' }, { ...opts, profile: minor }).ok, `${t} open to a minor`);
  assert.deepEqual(templatesFor(minor).map((t) => t.id), ['journey', 'education', 'health', 'custom']);
  // Re-pointing an adult goal at a child is refused too.
  const r = make(emptyGoals(), { template: 'marriage', title: 'x', personId: 'me' });
  assert.ok(!updateGoal(r.state, r.goal.id, { personId: 'kid' }, { ...opts, profile: minor }).ok);
  // And the week never shows it for a minor.
  assert.equal(weekSteps(r.state, { profileOf: () => minor }).length, 0);
});

test('steps: tick, add, edit, delete, reorder; progress and the next step', () => {
  let { state: s, goal: g } = make(emptyGoals(), { template: 'journey', title: 'Palani', personId: 'me', deadline: '2026-12-20', lang: 'en' });
  assert.equal(progress(g), 0);
  assert.equal(nextStep(g).id, 's1');
  s = toggleStep(s, g.id, 's1');
  s = toggleStep(s, g.id, 's2');
  g = s.goals[0];
  assert.equal(progress(g), 40);
  assert.equal(nextStep(g).id, 's3');
  s = toggleStep(s, g.id, 's2');
  assert.equal(progress(s.goals[0]), 20, 'untick');
  s = addStep(s, g.id, { title: 'Book train', date: '2026-11-20', kind: 'deadline' });
  assert.equal(s.goals[0].steps.length, 6);
  const added = s.goals[0].steps[5];
  assert.equal(added.kind, 'deadline');
  assert.equal(addStep(s, g.id, { title: 'After the deadline', date: '2027-01-05' }).goals[0].steps.length, 6, 'a step after the deadline is refused');
  assert.equal(addStep(s, g.id, { title: '   ' }).goals[0].steps.length, 6);
  s = editStep(s, g.id, added.id, { title: 'Book train (Tatkal)', time: '10:00' });
  assert.equal(s.goals[0].steps[5].title, 'Book train (Tatkal)');
  assert.equal(s.goals[0].steps[5].time, '10:00');
  assert.equal(editStep(s, g.id, added.id, { date: '2027-02-01' }).goals[0].steps[5].date, '2026-11-20', 'an edit past the deadline is refused');
  s = moveStep(s, g.id, added.id, -1);
  assert.equal(s.goals[0].steps[4].id, added.id);
  assert.equal(moveStep(s, g.id, 's1', -1).goals[0].steps[0].id, 's1', 'the first step cannot move up');
  s = deleteStep(s, g.id, 's5');
  assert.ok(!s.goals[0].steps.some((x) => x.id === 's5'));
  assert.equal(progress({ steps: [] }), 0);
});

test('deadline countdown is plain, and the top goal is the nearest active deadline', () => {
  const g = { deadline: '2026-10-17' };
  assert.equal(daysLeft(g, TODAY), 10);
  assert.equal(deadlineText(g, TODAY).en, '10 days to your deadline');
  assert.equal(deadlineText({ deadline: TODAY }, TODAY).en, 'Deadline today');
  assert.match(deadlineText({ deadline: '2026-10-01' }, TODAY).en, /passed — you can change it/);
  assert.equal(deadlineText({}, TODAY).en, 'No deadline set');
  for (const k of [10, 1, 0, -3]) assert.doesNotMatch(JSON.stringify(deadlineText({ deadline: new Date(Date.parse(`${TODAY}T00:00:00Z`) + k * 86400000).toISOString().slice(0, 10) }, TODAY)), /hurry|urgent|only|!|danger/i);
  let s = make(emptyGoals(), { template: 'custom', title: 'A', deadline: '2027-05-01' }).state;
  s = make(s, { template: 'custom', title: 'B', deadline: '2026-11-01' }).state;
  s = make(s, { template: 'custom', title: 'C' }).state;
  assert.equal(topGoal(s).title, 'B');
  const b = s.goals.find((x) => x.title === 'B');
  s = updateGoal(s, b.id, { status: 'done' }, opts).state;
  assert.equal(topGoal(s).title, 'A', 'achieved goals leave the Today card');
  assert.equal(activeGoals(s).length, 2);
  assert.equal(topGoal(emptyGoals()), null);
});

test('weekly follow-up: next review on the chosen weekday; due after a week without review', () => {
  const r = make(emptyGoals(), { template: 'custom', title: 'x', followUp: { weekly: true, weekday: 0 } }, { ...opts, now: new Date('2026-09-20T03:00:00Z') });
  const g = r.goal;
  assert.equal(nextReview(g, TODAY), '2026-10-11', 'Wednesday 7 Oct → Sunday 11 Oct');
  assert.equal(nextReview({ ...g, followUp: { weekly: true, weekday: 3 } }, TODAY), TODAY);
  assert.equal(nextReview({ ...g, followUp: { weekly: false, weekday: 0 } }, TODAY), null);
  assert.ok(reviewDue(g, TODAY), 'created 17 days ago, never reviewed');
  const s = markReviewed(r.state, g.id, NOW);
  assert.ok(!reviewDue(s.goals[0], TODAY));
  assert.ok(!reviewDue(s.goals[0], '2026-10-11'), 'less than a week since the review');
  assert.ok(reviewDue(s.goals[0], '2026-10-18'));
});

test('paid gating: free users keep one active goal (entitlements.goalsMax); paid / not enforced have no small limit', () => {
  const s = make(emptyGoals(), { template: 'custom', title: 'first' }).state;
  assert.equal(FREE_ACTIVE_GOALS, 1);
  assert.ok(!canAddGoal(s, { locked: true }));
  assert.ok(!canAddGoal(s, { max: 1 }));
  assert.ok(canAddGoal(s, { max: 3 }));
  assert.ok(canAddGoal(s, {}));
  const r = createGoal(s, { template: 'custom', title: 'second' }, { ...opts, locked: true });
  assert.ok(!r.ok && r.limit, 'second goal shows the lock card');
  assert.ok(canAddGoal(emptyGoals(), { locked: true }), 'the first goal is free — value before payment');
  const done = updateGoal(s, s.goals[0].id, { status: 'done' }, opts).state;
  assert.ok(canAddGoal(done, { locked: true }), 'an achieved goal frees the slot');
});

const chart = birthChart({ name: 'Arun', date: '1994-02-18', time: '22:10', lat: 13.08, lon: 80.27, tz: 5.5 });

test('optional good periods: deterministic, labelled optional with a basis, never past the deadline', () => {
  const goal = make(emptyGoals(), { template: 'marriage', title: 'Wedding', deadline: '2028-06-30' }).goal;
  const a = goodPeriods(goal, chart, { now: NOW, tz: 5.5, profile: adult });
  const b = goodPeriods(goal, chart, { now: NOW, tz: 5.5, profile: adult });
  assert.deepEqual(a, b, 'same chart, same date → same periods');
  assert.equal(a.optional, true);
  assert.match(a.note.en, /Optional/);
  assert.match(a.note.en, /deadline always comes first/);
  assert.match(a.basis.en, /dasa–bhukti/);
  const until = Date.parse('2028-07-01T00:00:00Z') - 5.5 * 3600000;
  for (const w of a.windows) {
    assert.ok(Date.parse(w.end) <= until, `window ${w.from}–${w.to} ends after the deadline`);
    assert.ok(Date.parse(w.start) >= NOW.getTime(), 'not in the past');
    assert.ok(w.to <= goal.deadline);
    assert.ok(w.md && w.ad);
  }
  // Across many deadlines, nothing ever runs past the deadline.
  for (const dl of ['2026-10-20', '2026-12-31', '2027-04-15', '2027-09-01', '2029-01-01']) {
    const r = goodPeriods({ ...goal, deadline: dl }, chart, { now: NOW, tz: 5.5 });
    for (const w of r.windows) assert.ok(w.to <= dl && Date.parse(w.end) <= Date.parse(`${dl}T00:00:00Z`) + 86400000 - 5.5 * 3600000, `${dl}: ${w.to}`);
    if (!r.windows.length) assert.equal(r.reason, 'none-before-deadline');
  }
  // The deadline itself is never changed by asking for periods.
  assert.equal(goal.deadline, '2028-06-30');
});

test('optional good periods: no question, no deadline, no chart, unknown birth time, minors, past deadline', () => {
  const j = make(emptyGoals(), { template: 'journey', title: 'Palani', deadline: '2026-12-01' }).goal;
  assert.equal(goodPeriods(j, chart, { now: NOW }).reason, 'no-question');
  const m = make(emptyGoals(), { template: 'marriage', title: 'W' }).goal;
  assert.equal(goodPeriods(m, chart, { now: NOW }).reason, 'no-deadline');
  const md = { ...m, deadline: '2027-06-01' };
  assert.equal(goodPeriods(md, null, { now: NOW }).reason, 'no-chart');
  const noTime = birthChart({ name: 'U', date: '1994-02-18', time: '12:00', lat: 13.08, lon: 80.27, tz: 5.5, timePrecision: 'unknown' });
  assert.equal(goodPeriods(md, noTime, { now: NOW }).reason, 'needs-birth-time');
  assert.equal(goodPeriods(md, chart, { now: NOW, profile: minor }).reason, 'age');
  assert.equal(goodPeriods({ ...md, deadline: '2026-09-01' }, chart, { now: NOW }).reason, 'past');
  for (const r of [goodPeriods(j, chart, { now: NOW }), goodPeriods(md, noTime, { now: NOW })]) assert.deepEqual(r.windows, []);
});

const loc = { lat: 13.0827, lon: 80.2707, tz: 5.5 };

test('weekly plan: dated goal steps appear as tasks — deadline-type fixed, others flexible; done steps and undated steps do not', () => {
  let { state: s, goal: g } = make(emptyGoals(), { template: 'journey', title: 'Palani', deadline: '2026-10-12', lang: 'en' });
  s = addStep(s, g.id, { title: 'Pay hall advance', date: '2026-10-09', time: '11:00', kind: 'deadline' });
  s = addStep(s, g.id, { title: 'Buy pooja items', date: '2026-10-08' });
  s = addStep(s, g.id, { title: 'Old step', date: '2026-10-10' });
  const old = s.goals[0].steps.find((x) => x.title === 'Old step');
  s = toggleStep(s, g.id, old.id);
  const steps = weekSteps(s, { lang: 'en' });
  assert.deepEqual(steps.map((x) => [x.title, x.type]).sort(), [['Buy pooja items', 'flexible'], ['Palani — deadline', 'deadline'], ['Pay hall advance', 'deadline']].sort());
  assert.ok(steps.every((x) => x.goalId === g.id));
  const w = buildWeek({ start: TODAY, loc, now: NOW, goalSteps: steps });
  const fixed = w.days.flatMap((d) => d.fixed);
  const optional = w.days.flatMap((d) => d.optional);
  const hall = fixed.find((x) => x.title === 'Pay hall advance');
  assert.ok(hall && hall.date === '2026-10-09' && hall.time === '11:00' && hall.type === 'deadline', 'a deadline step stays exactly where it is');
  assert.equal(hall.goalId, g.id);
  assert.equal(hall.taskId, null, 'goal steps are corrected on the goal screen, not as week tasks');
  assert.ok(fixed.some((x) => x.title === 'Palani — deadline' && x.date === '2026-10-12'));
  const pooja = optional.find((x) => x.title === 'Buy pooja items');
  assert.ok(pooja && pooja.optional && pooja.goalId === g.id);
  assert.ok(!optional.some((x) => /Pay hall|deadline/.test(x.title)), 'deadline steps never get "good time" suggestions');
  assert.ok(!JSON.stringify(w).includes('Old step'), 'done steps leave the week');
  // Goal steps never disturb the person's own fixed tasks.
  const own = [{ id: 'dentist', title: 'Dentist', type: 'appointment', date: '2026-10-08', time: '11:00' }];
  const a = buildWeek({ start: TODAY, loc, now: NOW, tasks: own });
  const b = buildWeek({ start: TODAY, loc, now: NOW, tasks: own, goalSteps: steps });
  assert.deepEqual(b.days.flatMap((d) => d.fixed).filter((x) => x.taskId === 'dentist'), a.days.flatMap((d) => d.fixed));
  // A minor plan owner never sees an adult goal's steps (topic carried through to the week's age guard).
  const m = make(emptyGoals(), { template: 'marriage', title: 'Wedding', deadline: '2026-10-10' });
  const mw = buildWeek({ start: TODAY, loc, now: NOW, profile: { minor: true, age: 12 }, goalSteps: weekSteps(m.state) });
  assert.equal(mw.days.flatMap((d) => d.fixed).length, 0);
});

test('backup: goals ride along only with consent, never goals of private profiles; deletions are kept', () => {
  const family = [{ id: 'me', name: 'Suresh', relation: 'self' }, { id: 'kid', name: 'Kavya', relation: 'daughter', private: true }];
  let s = make(emptyGoals(), { template: 'journey', title: 'Palani trip', personId: 'me' }).state;
  s = make(s, { template: 'education', title: 'Kavya exam secret', personId: 'kid' }).state;
  s = make(s, { template: 'custom', title: 'Hidden goal' }).state;
  s = { ...s, goals: s.goals.map((g) => (g.title === 'Hidden goal' ? { ...g, private: true } : g)) };
  const gone = make(s, { template: 'custom', title: 'Gone' });
  s = deleteGoal(gone.state, gone.goal.id);
  assert.equal(backupPayload({ family, activeId: 'me', goals: s }, { backup: false }), null, 'no consent → nothing');
  assert.equal(backupPayload({ family, activeId: 'me', goals: s }, {}), null);
  const p = backupPayload({ family, activeId: 'me', goals: s }, { backup: true });
  assert.deepEqual(p.goals.goals.map((g) => g.title), ['Palani trip']);
  assert.ok(!JSON.stringify(p).includes('Kavya'), 'nothing about the private profile leaves the phone');
  assert.ok(!JSON.stringify(p).includes('Hidden goal'));
  assert.ok(Array.isArray(p.goals.deleted));
  assert.ok(!('goals' in backupPayload({ family, activeId: 'me' }, { backup: true })), 'no goals saved → no goals key');
});

test('merge after sign-in: newer copy wins, deletions stay deleted, private-profile goals keep the phone copy', () => {
  const g = (id, title, updatedAt, extra = {}) => ({ id, template: 'custom', title, steps: [], status: 'active', updatedAt, ...extra });
  const local = { v: 1, goals: [g('a', 'A phone', '2026-10-05'), g('b', 'B phone', '2026-10-01'), g('k', 'Kid phone', '2026-10-01', { personId: 'kid' })], deleted: ['x'] };
  const remote = { v: 1, goals: [g('a', 'A account', '2026-10-01'), g('b', 'B account', '2026-10-06'), g('x', 'Deleted here', '2026-10-06'), g('c', 'C account', '2026-10-02'), g('k', 'Kid account', '2026-10-09', { personId: 'kid' })], deleted: [] };
  const m = mergeGoals(remote, local, { privateIds: new Set(['kid']) });
  const by = Object.fromEntries(m.goals.map((x) => [x.id, x.title]));
  assert.deepEqual(by, { a: 'A phone', b: 'B account', c: 'C account', k: 'Kid phone' });
  assert.ok(m.deleted.includes('x'));
  const m2 = mergeGoals({ goals: [], deleted: ['a'] }, local);
  assert.ok(!m2.goals.some((x) => x.id === 'a'), 'deleted on another phone → deleted here');
});

test('Ask Thunai prefill is about the goal only', () => {
  const g = make(emptyGoals(), { template: 'career', title: 'New job', deadline: '2027-01-31', lang: 'en' }).goal;
  assert.match(askText(g, 'en'), /New job.*2027-01-31.*Update your CV/);
  assert.match(askText(g, 'ta'), /New job/);
});

test('UI wiring: goals screen registered, in the registry under Today, precached, on Today after This week, consent line', () => {
  const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
  const scr = read('public/screens-goals.js');
  assert.match(scr, /registerScreen\('goals'/);
  assert.match(scr, /Saved on this phone; backed up only if you turn on backup/);
  assert.match(scr, /data-go="privacy"/);
  assert.match(scr, /lockCard\(/);
  assert.match(read('public/app.js'), /import '\.\/screens-goals\.js'/);
  const sw = read('public/sw.js');
  assert.ok(sw.includes("'/screens-goals.js'") && sw.includes("'/shared/goals.js'"));
  const home = read('public/screens-main.js');
  assert.ok(home.indexOf('goalsCardHtml()') > home.indexOf('weekCardHtml()'), 'goals card after the This-week card');
  assert.match(read('public/tool-registry.js'), /id: 'goals', group: 'today'[^\n]*இலக்கு[^\n]*marriage preparation[^\n]*career/);
  assert.match(read('public/screens-week.js'), /weekSteps\(/);
});
