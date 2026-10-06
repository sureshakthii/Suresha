// Traditional strength index (grahaStrength): naming, combustion table, no double counting.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { grahaStrength, COMBUSTION_ORBS, STRENGTH_INDEX } from '../shared/remedies.js';

const P = (rasi, deg = 10, extra = {}) => ({ rasi, longitude: rasi * 30 + deg, retrograde: false, ...extra });
const base = () => ({
  Sun: P(0), Moon: P(6), Mars: P(9), Mercury: P(2), Jupiter: P(3), Venus: P(11), Saturn: P(6),
  Rahu: P(2), Ketu: P(8), Lagna: P(0),
});

test('every row is named "Traditional strength index" with the not-Shadbala note', () => {
  for (const g of grahaStrength(base())) {
    assert.deepEqual(g.indexName, { en: 'Traditional strength index', ta: 'பாரம்பரிய பல குறியீடு' });
    assert.match(g.note.en, /not Shadbala/);
    assert.match(g.note.en, /not a probability/);
  }
  assert.ok(STRENGTH_INDEX.note.ta);
});

test('combustion table is exported and documented', () => {
  assert.equal(COMBUSTION_ORBS.Mercury.direct, 14);
  assert.equal(COMBUSTION_ORBS.Mercury.retrograde, 12);
  assert.equal(COMBUSTION_ORBS.Venus.retrograde, 8);
  assert.equal(COMBUSTION_ORBS.Moon.scored, false);
});

test('combustion: threshold boundary and retrograde orb', () => {
  const at = (sep, retro) => {
    const p = base();
    p.Sun = P(4, 0); // Simha 0°
    p.Mars = { rasi: 4, longitude: 120 + sep, retrograde: retro };
    return grahaStrength(p).find((g) => g.planet === 'Mars').reasons.some((r) => r.ta === 'அஸ்தங்கம்');
  };
  assert.equal(at(16.9, false), true);
  assert.equal(at(17, false), false);
  const merc = (sep, retro) => {
    const p = base();
    p.Sun = P(4, 0);
    p.Mercury = { rasi: 4, longitude: 120 + sep, retrograde: retro };
    return grahaStrength(p).find((g) => g.planet === 'Mercury').reasons.some((r) => r.ta === 'அஸ்தங்கம்');
  };
  assert.equal(merc(13, false), true);
  assert.equal(merc(13, true), false); // retrograde orb is 12°
});

test('no double counting: dignity once, Moon not combust + weak, nodes one placement rule', () => {
  const p = base();
  p.Mercury = P(5); // Kanni = exaltation AND own sign → only Uchcham
  const merc = grahaStrength(p).find((g) => g.planet === 'Mercury');
  assert.equal(merc.reasons.filter((r) => ['உச்சம்', 'ஆட்சி'].includes(r.ta)).length, 1);
  // Moon conjunct Sun: phase rule only, no combustion penalty on top.
  const q = base();
  q.Moon = P(0, 15);
  const moon = grahaStrength(q).find((g) => g.planet === 'Moon');
  assert.ok(moon.reasons.some((r) => r.ta === 'பலம் குறைந்த சந்திரன்'));
  assert.ok(!moon.reasons.some((r) => r.ta === 'அஸ்தங்கம்'));
  // Rahu in the 1st house: only the node rule (−10), no kendra bonus.
  const r = base();
  r.Rahu = P(0);
  const rahu = grahaStrength(r).find((g) => g.planet === 'Rahu');
  assert.equal(rahu.reasons.length, 1);
  assert.equal(rahu.score, 45);
  // A graha gets at most one house-category reason.
  for (const g of grahaStrength(base())) {
    const house = g.reasons.filter((x) => /house|kendra|trikona/.test(x.en));
    assert.ok(house.length <= 1, g.planet);
  }
});
