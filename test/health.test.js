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

test('health guide: constitution, body areas, period and months', () => {
  for (const chart of [adult, elder, child]) {
    const h = healthGuide(chart, { now });
    const c = h.constitution;
    assert.equal(c.vata + c.pitta + c.kapha, 100);
    assert.ok(['vata', 'pitta', 'kapha'].includes(c.dominant));
    assert.ok(c.name.en && c.name.ta && c.desc.en && c.desc.ta);
    assert.ok(h.bodyAreas.length >= 4 && h.bodyAreas.length <= 6);
    for (const a of h.bodyAreas) {
      assert.ok(['watch', 'care'].includes(a.level));
      assert.ok(a.reasons.length >= 1 && a.reasons.every((r) => r.en && r.ta));
      assert.ok(a.tip.en && a.tip.ta);
    }
    assert.ok(['good', 'steady', 'care'].includes(h.period.level));
    assert.ok(h.period.summary.en && h.period.summary.ta);
    assert.ok(h.period.md && h.period.ad);
    assert.equal(h.months.length, 12);
    assert.equal(h.months[0].month, '2026-10');
    assert.equal(h.months[11].month, '2027-09');
    for (const m of h.months) assert.ok(['good', 'steady', 'care'].includes(m.level) && m.note.en && m.note.ta);
    assert.ok(h.diet.eat.length > 0 && h.diet.avoid.length > 0 && h.diet.habits.length > 0);
    assert.ok(h.diet.fasting.day.en && h.diet.fasting.why.ta);
    assert.ok(h.remedies.planets.length >= 1 && h.remedies.healing.some((x) => /Dhanvantari/.test(x.en)));
    assert.ok(/Tryambakam/.test(h.remedies.mantra.en));
    assert.ok(/not medical advice/.test(h.disclaimer.en) && h.disclaimer.ta);
  }
});

test('health guide: every Tamil string is pure Tamil (no Latin letters)', () => {
  for (const chart of [adult, elder, child]) {
    for (const gender of [undefined, 'male', 'female']) {
      const bad = tamilStrings(healthGuide(chart, { now, gender })).filter(([, v]) => LATIN.test(v));
      assert.deepEqual(bad, []);
    }
  }
});
