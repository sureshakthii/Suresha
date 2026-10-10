// Life Guide: who-am-I and the Magic Tap — safe wording, child-safe concerns, help first when losing hope,
// no timing for money / health, and a 7-day start with seven different steps.
import test from 'node:test';
import assert from 'node:assert/strict';
import { birthChart } from '../shared/astro.js';
import { whoAmI, lifeGuide, checkFor, CHECK, CONCERN_IDS, KARMA } from '../shared/life-guide.js';
import { scanCertainty } from '../shared/certainty-guard.js';
import { findProhibited } from '../shared/themes.js';

const NOW = new Date('2026-10-10T06:00:00Z');
const CHARTS = [
  birthChart({ date: '1982-05-14', time: '06:30:00', lat: 13.08, lon: 80.27, tz: 5.5 }),
  birthChart({ date: '1995-11-02', time: '21:10:00', lat: 9.93, lon: 78.12, tz: 5.5 }),
  birthChart({ date: '1970-01-26', time: '12:00:00', lat: 25.2, lon: 55.27, tz: 4 }),
];
const ADULT = { minor: false, adult: true }, CHILD = { minor: true, adult: false, age: 12 };

test('who-am-I gives outer, mind, two strengths, two growth areas with a step, and the karma line', () => {
  for (const c of CHARTS) {
    const w = whoAmI(c, { now: NOW });
    assert.ok(w.outer.traits.ta && w.mind.traits.ta && w.present.ta && w.stress.calm.ta);
    assert.equal(w.strengths.length, 2); assert.equal(w.growth.length, 2);
    for (const g of w.growth) assert.ok(g.step.ta && g.remedy);
    assert.equal(w.karma, KARMA);
    assert.equal(whoAmI(c, { now: NOW, lagnaReliable: false }).outer.from, 'moon');
  }
});

test('every concern and answer combination is free of certainty, fear and prohibited wording', () => {
  for (const c of CHARTS) for (const concern of CONCERN_IDS) for (const feel of ['unsure', 'worried', 'restless', 'low']) for (const sleep of ['fine', 'some', 'hopeless']) {
    const g = lifeGuide(c, { concern, since: 'long', feel, sleep, want: 'courage' }, { now: NOW, profile: ADULT, married: true });
    assert.deepEqual(scanCertainty(JSON.stringify(g)), [], `${concern} ${feel} ${sleep}`);
    assert.deepEqual(findProhibited(g), [], `${concern} ${feel} ${sleep}`);
  }
});

test('losing hope shows help lines first and no chart reasons or timing', () => {
  const g = lifeGuide(CHARTS[0], { concern: 'job_change', sleep: 'hopeless', feel: 'low' }, { now: NOW, profile: ADULT });
  assert.match(g.help.ta, /14416/); assert.match(g.help.en, /14416/);
  assert.equal(g.when.periods.length, 0);
  assert.ok(!g.why.some((x) => /மரபுப்படி|By tradition/.test(x.ta + x.en)));
});

test('money and health never get a timing reading; practical steps point to professionals', () => {
  for (const concern of ['money', 'health']) {
    const g = lifeGuide(CHARTS[1], { concern }, { now: NOW, profile: ADULT });
    assert.equal(g.when.periods.length, 0);
    assert.match(JSON.stringify(g.what), concern === 'money' ? /SEBI/ : /doctor/);
  }
});

test('a child never sees adult concerns, and an adult concern falls back to studies', () => {
  const ids = checkFor(CHILD)[0].options.map((o) => o.id);
  for (const adult of ['job_change', 'business', 'money', 'marriage', 'abroad']) assert.ok(!ids.includes(adult));
  assert.ok(ids.includes('studies'));
  assert.equal(lifeGuide(CHARTS[1], { concern: 'marriage' }, { now: NOW, profile: CHILD }).concern, 'studies');
  assert.ok(!checkFor(ADULT, { married: true })[0].options.some((o) => o.id === 'marriage'));
  assert.equal(CHECK.length, 5);
});

test('the 7-day start has seven different steps, the parigaram on its own weekday and a review', () => {
  const g = lifeGuide(CHARTS[0], { concern: 'job_change', feel: 'worried', want: 'plan' }, { now: NOW, profile: ADULT });
  assert.equal(g.week.length, 7);
  assert.equal(new Set(g.week.map((x) => x.en)).size, 7);
  assert.match(g.week[5].ta, /கிழமை அன்று/);
  assert.doesNotMatch(JSON.stringify(g), /ன்க்கிழமை/);
});
