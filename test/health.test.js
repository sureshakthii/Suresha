import { test } from 'node:test';
import assert from 'node:assert/strict';
import { birthChart } from '../shared/astro.js';
import { healthGuide } from '../shared/health.js';

const now = new Date('2026-10-04T00:00:00Z');
const adult = birthChart({ name: 'A', date: '1994-02-18', time: '22:10:00', lat: 13.08, lon: 80.27, tz: 5.5 });
const elder = birthChart({ name: 'E', date: '1950-03-12', time: '05:40:00', lat: 9.92, lon: 78.12, tz: 5.5 });
const child = birthChart({ name: 'C', date: '2018-06-01', time: '10:00:00', lat: 13.08, lon: 80.27, tz: 5.5 });
const LATIN = /[A-Za-z]/;

function tamilStrings(o, path = 'h', out = []) {
  if (!o || typeof o !== 'object' || o instanceof Date) return out;
  for (const [k, v] of Object.entries(o)) {
    if (k === 'ta' && typeof v === 'string') out.push([`${path}.ta`, v]);
    else tamilStrings(v, `${path}.${k}`, out);
  }
  return out;
}

test('health guide: life stage follows age', () => {
  const a = healthGuide(adult, { now });
  const e = healthGuide(elder, { now });
  const c = healthGuide(child, { now });
  assert.equal(a.age, 32);
  assert.equal(a.stage.id, 'adult');
  assert.equal(e.age, 76);
  assert.equal(e.stage.id, 'elder');
  assert.equal(c.age, 8);
  assert.equal(c.stage.id, 'child');
  for (const h of [a, e, c]) assert.ok(h.stage.checklist.length >= 3 && h.stage.checklist.every((x) => x.en && x.ta));
  assert.ok(e.stage.checklist.some((x) => /Hearing/.test(x.en)));
  assert.ok(e.stage.checklist.some((x) => /Fall prevention/.test(x.en)));
  assert.ok(!c.stage.checklist.some((x) => /Cholesterol/.test(x.en)));
  // Gender filter: men do not see women-only checks.
  const men = healthGuide(elder, { now, gender: 'male' });
  assert.ok(!men.stage.checklist.some((x) => x.forGender === 'female'));
  assert.ok(healthGuide(elder, { now, gender: 'female' }).stage.checklist.some((x) => /Bone density/.test(x.en)));
  // Gentle yoga for seniors.
  assert.ok(e.yoga.some((y) => /Chair yoga/.test(y.en)));
  assert.ok(e.yoga.length >= 3 && e.yoga.length <= 4);
});

test('health guide: general wellbeing and an optional traditional reflection, clearly separated', () => {
  for (const chart of [adult, elder, child]) {
    const h = healthGuide(chart, { now });
    const w = h.wellbeing;
    assert.equal(w.fromAstrology, false);
    assert.equal(w.needsMedicalReview, true);
    assert.equal(w.label.ta, 'பொது நலம்');
    assert.deepEqual(w.habits.map((x) => x.id), ['sleep', 'water', 'walk', 'checkups', 'doctor']);
    assert.ok(w.habits.every((x) => x.needsMedicalReview === true && x.fromAstrology === false && x.en && x.ta));
    assert.ok(w.yoga.every((x) => x.needsMedicalReview === true));
    const r = h.reflection;
    assert.equal(r.optional, true);
    assert.equal(r.notHealthAdvice, true);
    assert.equal(r.label.ta, 'மரபுச் சிந்தனை (விருப்பம்)');
    assert.match(r.note.en, /not health advice/);
    assert.ok(h.period.md && h.period.ad);
    assert.ok(r.practices.length >= 1 && r.practices.every((x) => x.lamp.en && x.lamp.ta && x.deity && x.mantra && x.why));
    assert.equal(r.practices[0].planet, h.period.md.lord);
    assert.ok(r.healing.some((x) => /Dhanvantari/.test(x.en)));
    assert.ok(/Tryambakam/.test(r.mantra.en));
    assert.ok(/not medical advice/.test(h.disclaimer.en) && /not a diagnosis/.test(h.disclaimer.en) && /நோய் கண்டறிதல் அல்ல/.test(h.disclaimer.ta));
  }
});

// The Jathagam health guide was restored for adults at the owner's request (Oct 2026): body areas, food tips and the
// period outlook are traditional indications for adults only (test/health-guide.test.js). Children still get none,
// and the spiritual reflection (shown on Today and in Ask Thunai) still carries no food, body or injury wording.
test('health guide: children get no food rules, body-part warnings or period verdicts; the reflection stays spiritual', () => {
  const c = healthGuide(child, { now });
  for (const gone of ['diet', 'bodyAreas', 'months', 'constitution', 'outlook', 'upcoming', 'now']) assert.equal(c[gone], null, gone);
  assert.equal(c.minor, true);
  for (const chart of [adult, elder, child]) {
    const h = healthGuide(chart, { now });
    const all = JSON.stringify({ reflection: h.reflection, habits: h.wellbeing.habits });
    assert.doesNotMatch(all, /\b(eat|avoid|injur(y|ies)|fasting|diet)\b/i);
    assert.doesNotMatch(all, /உண்ண|தவிர்க்க|காயம்|விரதம்/);
    for (const g of [...h.reflection.gochara, ...h.reflection.practices.map((x) => x.lamp)]) assert.doesNotMatch(g.en, /joint|chest|heat|food|sleep|BP|blood/i);
  }
  const a = healthGuide(adult, { now });
  assert.equal(a.minor, false);
  assert.ok(a.diet.favour.length && a.bodyAreas.items.length && a.months.items.length === 12 && a.outlook.ad);
  assert.equal(a.flags.lifespanInference, false);
  assert.equal(a.flags.diseaseInference, false);
  assert.equal(a.flags.canDriveTreatment, false);
});

test('health guide: every Tamil string is pure Tamil (no Latin letters)', () => {
  for (const chart of [adult, elder, child]) {
    for (const gender of [undefined, 'male', 'female']) {
      const bad = tamilStrings(healthGuide(chart, { now, gender })).filter(([, v]) => LATIN.test(v));
      assert.deepEqual(bad, []);
    }
  }
});
