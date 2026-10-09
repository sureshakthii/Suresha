// Detailed Jathagam reading (shared/deep-reading.js): complete, bilingual, about ten sentences per kattam,
// child-safe for minors, Moon-based without a birth time, and free of certainty / fear / guarantee wording.
import test from 'node:test';
import assert from 'node:assert/strict';
import { birthChart } from '../shared/astro.js';
import { deepReading, deepReadingText, STAR_GUNAM } from '../shared/deep-reading.js';
import { scanCertainty } from '../shared/certainty-guard.js';

const TA = /[஀-௿]/;
const chart = (date, time = '06:30') => birthChart({ date, time, lat: 13.08, lon: 80.27, tz: 5.5 });
// Births spread across the year and the day, so many lagnas, rasis and stars are covered.
const CHARTS = [];
for (let m = 1; m <= 12; m++) for (const t of ['01:10', '07:40', '13:20', '19:50']) CHARTS.push(chart(`19${70 + m}-${String(m).padStart(2, '0')}-${String(3 + m * 2).padStart(2, '0')}`, t));

test('all 27 stars have a complete bilingual gunam', () => {
  assert.equal(STAR_GUNAM.length, 27);
  for (const s of STAR_GUNAM) {
    for (const k of ['deity', 'symbol', 'nature', 'strengths', 'growth', 'fields']) assert.ok(s[k].en && TA.test(s[k].ta), `${s.nature.en}: ${k}`);
    assert.ok(['D', 'M', 'R'].includes(s.gana));
  }
});

test('every chart gets nature, star, 12 kattams of about ten sentences, and the nine planets', () => {
  const lagnas = new Set(), stars = new Set();
  for (const c of CHARTS) {
    const r = deepReading(c, {});
    lagnas.add(c.planets.Lagna.rasi); stars.add(c.janmaNakshatra.index);
    assert.deepEqual(r.sections.map((s) => s.id), ['guna', 'star', 'houses', 'planets']);
    const houses = r.sections.find((s) => s.id === 'houses').items;
    assert.equal(houses.length, 12);
    for (const h of houses) assert.ok(h.lines.length >= 9 && h.lines.length <= 13, `house ${h.house}: ${h.lines.length} lines`);
    assert.ok(r.sections.find((s) => s.id === 'star').lines.length >= 9);
    assert.equal(r.sections.find((s) => s.id === 'planets').lines.length, 9);
    for (const lang of ['en', 'ta']) {
      const text = deepReadingText(r, lang);
      assert.doesNotMatch(text, /undefined|NaN|\[object/, lang);
      assert.deepEqual(scanCertainty(text), [], `${lang}: ${JSON.stringify(scanCertainty(text))}`);
    }
    assert.match(deepReadingText(r, 'ta'), TA);
  }
  assert.equal(lagnas.size, 12, 'all 12 lagnas covered');
  assert.ok(stars.size >= 15, `stars covered: ${stars.size}`);
});

test('the same chart always gives the same words', () => {
  const c = CHARTS[5];
  assert.equal(deepReadingText(deepReading(c, {}), 'ta'), deepReadingText(deepReading(c, {}), 'ta'));
});

test('a child gets child-safe themes for partnership, money and work houses', () => {
  const r = deepReading(CHARTS[3], { profile: { adult: false, minor: true, age: 9 } });
  const houses = r.sections.find((s) => s.id === 'houses').items;
  for (const n of [2, 7, 10, 11]) {
    const txt = houses[n - 1].lines.map((l) => l.en).join(' ');
    assert.doesNotMatch(txt, /marriage|spouse|income|invest|savings|career/i, `house ${n}`);
  }
});

test('without a birth time the houses are counted from the Moon sign and the reading says so', () => {
  const c = birthChart({ date: '1990-06-15', lat: 13.08, lon: 80.27, tz: 5.5 });
  const r = deepReading(c, {});
  assert.equal(r.moonOnly, true);
  assert.match(r.sections[0].lines[0].en, /birth time is not certain/);
  assert.equal(r.sections.find((s) => s.id === 'houses').items.length, 12);
});
