// Weekly plan (shared/week-plan.js): fixed appointments and real deadlines are never moved by astrology; optional
// good times avoid Rahu Kalam / Yamagandam; observances appear only when chosen; family events (star birthday,
// thivasam, birthday, saved reminders) are included; a minor's plan carries no adult items; pure edit helpers.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildWeek, nextItems, weekText, goodWindows, emptyPlan, addTask, editTask, deleteTask, clearWeek, setObservances,
  normaliseTask, isAdultTask, instantAt, OBSERVANCES,
} from '../shared/week-plan.js';
import { tamilDay } from '../shared/tamilcal.js';

const loc = { lat: 13.0827, lon: 80.2707, tz: 5.5 }; // Chennai
const start = '2026-10-07';
const now = new Date('2026-10-07T00:30:00Z'); // 6:00 AM in Chennai
const base = { start, loc, now };
const ms = (x) => new Date(x).getTime();
const overlaps = (a, b) => ms(a.start) < ms(b.end) && ms(b.start) < ms(a.end);
const dayOf = (w, iso) => w.days.find((d) => d.date === iso);

const TASKS = [
  { id: 'dentist', title: 'Dentist', type: 'appointment', date: '2026-10-08', time: '11:00' },
  { id: 'tax', title: 'Tax filing', type: 'deadline', date: '2026-10-09' },
  { id: 'fee', title: 'School fee', type: 'deadline', date: '2026-10-10', time: '10:00' },
  { id: 'pooja', title: 'Buy pooja items', type: 'flexible', date: '2026-10-08' },
  { id: 'call', title: 'Call uncle', type: 'flexible' },
];

test('a week has 7 days, today first, with the four sections', () => {
  const w = buildWeek({ ...base, tasks: TASKS });
  assert.equal(w.days.length, 7);
  assert.equal(w.days[0].date, start);
  assert.ok(w.days[0].isToday);
  assert.equal(w.days[6].date, '2026-10-13');
  for (const d of w.days) for (const k of ['fixed', 'family', 'observances', 'optional']) assert.ok(Array.isArray(d[k]), k);
});

test('fixed appointments and deadlines keep their exact date and time — suggestions never move them', () => {
  const w = buildWeek({ ...base, tasks: TASKS });
  const fixed = w.days.flatMap((d) => d.fixed);
  assert.deepEqual(fixed.map((x) => [x.taskId, x.date, x.time]), [['dentist', '2026-10-08', '11:00'], ['tax', '2026-10-09', null], ['fee', '2026-10-10', '10:00']]);
  assert.equal(ms(fixed[0].at), ms('2026-10-08T05:30:00Z'), 'Dentist stays at 11:00 IST');
  // Deadlines are fixed items, never optional suggestions.
  assert.ok(fixed.filter((x) => x.type === 'deadline').length === 2);
  assert.ok(!w.days.some((d) => d.optional.some((x) => ['tax', 'fee', 'dentist'].includes(x.taskId))), 'no fixed task gets a suggestion');
  // Adding flexible tasks changes nothing about the fixed items.
  const only = buildWeek({ ...base, tasks: TASKS.filter((t) => t.type !== 'flexible') });
  assert.deepEqual(only.days.map((d) => d.fixed), w.days.map((d) => d.fixed));
});

test('a fixed appointment inside Rahu Kalam is still kept at its time (astrology never pushes it)', () => {
  const d0 = buildWeek({ ...base }).days[1];
  const rkHm = new Date(ms(d0.rahuKalam.start) + 10 * 60000 + 5.5 * 3600000).toISOString().slice(11, 16);
  const w = buildWeek({ ...base, tasks: [{ id: 'x', title: 'Bank visit', type: 'deadline', date: d0.date, time: rkHm }] });
  const f = dayOf(w, d0.date).fixed[0];
  assert.equal(f.time, rkHm);
  assert.ok(ms(f.at) >= ms(d0.rahuKalam.start) && ms(f.at) < ms(d0.rahuKalam.end));
});

test('optional good times are only for flexible tasks, labelled optional, and avoid Rahu Kalam, Yamagandam and fixed appointments', () => {
  const w = buildWeek({ ...base, tasks: TASKS });
  const opts = w.days.flatMap((d) => d.optional.map((x) => ({ d, x })));
  assert.deepEqual(opts.map(({ x }) => x.taskId).sort(), ['call', 'pooja']);
  for (const { d, x } of opts) {
    assert.equal(x.optional, true);
    assert.match(x.label.en, /Optional/);
    assert.match(x.label.ta, /விருப்ப/);
    for (const win of x.windows) {
      assert.ok(!overlaps(win, d.rahuKalam), `${d.date}: window overlaps Rahu Kalam`);
      assert.ok(!overlaps(win, d.yamagandam), `${d.date}: window overlaps Yamagandam`);
      for (const f of d.fixed.filter((y) => y.at)) assert.ok(!overlaps(win, { start: f.at, end: ms(f.at) + 3600000 }), 'window clashes with a fixed appointment');
      assert.ok(ms(win.start) >= ms(now), 'no window in the past');
      assert.ok(ms(win.end) - ms(win.start) >= 30 * 60000);
    }
  }
  assert.equal(opts.find(({ x }) => x.taskId === 'pooja').d.date, '2026-10-08', 'a flexible task with a preferred day stays on that day');
  // goodWindows on its own: every window lies inside a Gowri nalla neram slot.
  const td = tamilDay(new Date('2026-10-09T06:30:00Z'), loc.lat, loc.lon, loc.tz);
  const wins = goodWindows(td, { now: new Date('2026-10-08T00:00:00Z') });
  assert.ok(wins.length > 0);
  for (const win of wins) {
    const inGood = (t) => td.nallaNeram.some((g) => t >= ms(g.start) && t <= ms(g.end));
    assert.ok(inGood(ms(win.start)) && inGood(ms(win.end) - 1), 'window lies in nalla neram');
    assert.ok(!overlaps(win, td.rahuKalam) && !overlaps(win, td.yamagandam));
  }
});

test('observances appear only when chosen', () => {
  const none = buildWeek({ ...base });
  assert.equal(none.days.flatMap((d) => d.observances).length, 0, 'nothing chosen → no observances');
  const pr = buildWeek({ ...base, chosenObservances: ['pradosham'] });
  const obs = pr.days.flatMap((d) => d.observances);
  assert.deepEqual(obs.map((x) => [x.date, x.title.en]), [['2026-10-08', 'Pradosham']]);
  assert.ok(dayOf(pr, '2026-10-08').line?.en.includes('Pradosha'), 'one-line guidance for the observance');
  assert.equal(dayOf(pr, '2026-10-10').observances.length, 0, 'Amavasai not chosen → not shown');
  const ama = buildWeek({ ...base, chosenObservances: ['amavasai', 'ekadasi', 'not-a-type'] });
  const names = ama.days.flatMap((d) => d.observances.map((x) => x.title.en));
  assert.ok(names.includes('Amavasai') && names.includes('Mahalaya Amavasai'));
  assert.ok(!names.includes('Pradosham') && !names.includes('Masa Sivarathri'));
  // Ekadasi (22 Oct) is in the following week.
  const later = buildWeek({ ...base, start: '2026-10-19', chosenObservances: ['ekadasi'] });
  assert.deepEqual(later.days.flatMap((d) => d.observances.map((x) => [x.date, x.type])), [['2026-10-22', 'ekadasi']]);
  assert.ok(OBSERVANCES.some((o) => o.id === 'sashti') && OBSERVANCES.some((o) => o.id === 'chathurthi'));
});

test('family events: star birthday (residence), thivasam, birthday and saved reminders', () => {
  const w = buildWeek({
    ...base,
    family: [
      { id: 'amma', name: 'Amma', birthStar: 11, birthTamilMonth: 5 }, // Uthiram in Purattasi → 9 Oct 2026 at Chennai
      { id: 'appa', name: 'Appa', birthStar: 3, birthTamilMonth: 0 }, // Chithirai: not this week
      { id: 'kutty', name: 'Kutty', dob: '2018-10-11' },
      { id: 'co', name: 'Our firm', relation: 'organization', dob: '2010-10-08' },
    ],
    ancestors: [{ id: 'thatha', name: 'Thatha', date: '2025-09-20', time: '15:00', lat: loc.lat, lon: loc.lon, tz: 5.5 }],
    reminders: [{ id: 'r1', title: 'Temple archanai', eventAt: '2026-10-11T03:00:00Z' }, { id: 'r2', title: 'Old', eventAt: '2026-11-30T03:00:00Z' }],
  });
  const fam = w.days.flatMap((d) => d.family.map((x) => [d.date, x.type, x.name || x.title]));
  assert.deepEqual(fam.find((x) => x[1] === 'star-birthday'), ['2026-10-09', 'star-birthday', 'Amma']);
  assert.ok(!fam.some((x) => x[2] === 'Appa'));
  assert.deepEqual(fam.find((x) => x[1] === 'thivasam'), ['2026-10-09', 'thivasam', 'Thatha']);
  assert.deepEqual(fam.find((x) => x[1] === 'birthday'), ['2026-10-11', 'birthday', 'Kutty']);
  assert.equal(dayOf(w, '2026-10-11').family.find((x) => x.type === 'birthday').turns, 8);
  assert.ok(!fam.some((x) => x[2] === 'Our firm'), 'a company is not a family member');
  assert.deepEqual(fam.filter((x) => x[1] === 'reminder').map((x) => [x[0], x[2]]), [['2026-10-11', 'Temple archanai']]);
  assert.equal(dayOf(w, '2026-10-11').family.find((x) => x.type === 'reminder').time, '08:30');
});

test('a reminder set for a week task is not listed twice', () => {
  const w = buildWeek({ ...base, tasks: TASKS, reminders: [{ id: 'r', title: 'Dentist', eventAt: '2026-10-08T05:30:00Z' }] });
  assert.equal(dayOf(w, '2026-10-08').family.length, 0);
  assert.equal(dayOf(w, '2026-10-08').fixed.length, 1);
});

test('a minor’s plan has no adult items and no fasting advice', () => {
  const tasks = [
    { id: 'a', title: 'Marriage talks with the family', type: 'appointment', date: '2026-10-15', time: '17:00' },
    { id: 'b', title: 'Pay the home loan EMI', type: 'deadline', date: '2026-10-16' },
    { id: 'c', title: 'Tuition', type: 'flexible', topic: 'business' },
    { id: 'd', title: 'Science exam', type: 'deadline', date: '2026-10-15', time: '09:30' },
    { id: 'e', title: 'Read a story book', type: 'flexible' },
    { id: 'f', title: 'திருமண நிச்சயம்', type: 'appointment', date: '2026-10-17' },
  ];
  const args = { ...base, start: '2026-10-14', tasks, chosenObservances: ['sashti'],
    ancestors: [{ id: 't', name: 'Thatha', date: '2025-09-20', time: '15:00', lat: loc.lat, lon: loc.lon, tz: 5.5 }],
    reminders: [{ id: 'r', title: 'Engagement function', eventAt: '2026-10-18T05:00:00Z' }] };
  const kid = buildWeek({ ...args, profile: { minor: true, age: 10 } });
  const items = kid.days.flatMap((d) => [...d.fixed, ...d.optional, ...d.family]);
  assert.deepEqual(items.map((x) => x.taskId || x.id).filter(Boolean).sort(), ['d', 'e']);
  assert.equal(kid.hidden, 4);
  const sashti = dayOf(kid, '2026-10-16');
  assert.equal(sashti.observances[0].type, 'sashti');
  assert.doesNotMatch(sashti.line.en, /avoid non-vegetarian|skip rice/i);
  assert.match(sashti.line.en, /need not fast/);
  // The adult sees all of them, with the fasting line.
  const adult = buildWeek({ ...args, profile: { minor: false, age: 40 } });
  assert.equal(adult.hidden, 0);
  assert.equal(adult.days.flatMap((d) => d.fixed).length, 4);
  assert.match(dayOf(adult, '2026-10-16').line.en, /avoid non-vegetarian/);
  assert.ok(isAdultTask({ title: 'Loan papers' }) && isAdultTask({ title: 'x', topic: 'marriage' }) && !isAdultTask({ title: 'Homework' }));
});

test('pure helpers: add, edit, delete, clear the week, observances', () => {
  let p = emptyPlan();
  p = addTask(p, { id: 'a', title: '  Doctor  ', type: 'appointment', date: '2026-10-08', time: '10:30' });
  p = addTask(p, { id: 'b', title: 'Call', type: 'flexible' });
  p = addTask(p, { id: 'n', title: 'Old', type: 'deadline', date: '2026-11-30' });
  p = addTask(p, { title: '', type: 'flexible' }); // ignored
  p = addTask(p, { title: 'No date', type: 'appointment' }); // fixed items need a date → ignored
  assert.deepEqual(p.tasks.map((t) => t.id), ['a', 'b', 'n']);
  assert.equal(p.tasks[0].title, 'Doctor');
  const before = p;
  p = editTask(p, 'a', { time: '16:00', title: 'Doctor (moved by me)' });
  assert.equal(p.tasks[0].time, '16:00');
  assert.equal(before.tasks[0].time, '10:30', 'helpers do not change their input');
  assert.equal(editTask(p, 'a', { type: 'deadline', date: 'bad' }).tasks[0].date, '2026-10-08', 'an invalid correction is refused');
  assert.equal(editTask(p, 'a', { time: '25:00' }).tasks[0].time, null, 'a bad time is dropped');
  p = deleteTask(p, 'b');
  assert.deepEqual(p.tasks.map((t) => t.id), ['a', 'n']);
  p = addTask(p, { id: 'c', title: 'Any day', type: 'flexible' });
  const cleared = clearWeek(p, start);
  assert.deepEqual(cleared.tasks.map((t) => t.id), ['n'], 'clear removes this week’s and undated tasks, keeps later ones');
  p = setObservances(p, ['ekadasi', 'pradosham', 'ekadasi', 'nonsense']);
  assert.deepEqual(p.observances, ['ekadasi', 'pradosham']);
  assert.deepEqual(clearWeek(p, start).observances, ['ekadasi', 'pradosham'], 'chosen observances stay');
  assert.equal(normaliseTask({ title: 'x', type: 'weird' }).type, 'flexible');
  assert.equal(normaliseTask({ title: 'x'.repeat(300), type: 'flexible' }).title.length, 120);
  assert.equal(ms(instantAt('2026-10-08', '10:30', loc)), ms('2026-10-08T05:00:00Z'));
});

test('next items for the Today card and plain-text sharing without others’ data', () => {
  const w = buildWeek({ ...base, tasks: TASKS, chosenObservances: ['pradosham'], family: [{ id: 'amma', name: 'Amma', birthStar: 11, birthTamilMonth: 5 }] });
  const next = nextItems(w, { now, limit: 3 });
  assert.equal(next.length, 3);
  assert.ok(next.every((x, i) => i === 0 || x.date >= next[i - 1].date), 'soonest first');
  const later = nextItems(w, { now: new Date('2026-10-08T06:00:00Z'), limit: 10 });
  assert.ok(!later.some((x) => x.taskId === 'dentist'), 'a passed appointment is not shown as next');
  const text = weekText(w, { lang: 'en' });
  assert.match(text, /Dentist/);
  assert.match(text, /Tax filing \(deadline\)/);
  assert.match(text, /Pradosham/);
  assert.doesNotMatch(text, /Amma/, 'family events are left out unless the person includes them');
  assert.match(weekText(w, { lang: 'en', includeFamily: true }), /Amma/);
  assert.match(weekText(w, { lang: 'ta' }), /இந்த வாரத் திட்டம்/);
});

test('buildWeek needs a residence', () => {
  assert.throws(() => buildWeek({ start }), /loc/);
});
