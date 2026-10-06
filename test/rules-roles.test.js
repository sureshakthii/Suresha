// House-lord role fixtures: distinct neutral facts, Badhaka by Lagna modality, 2nd/7th lords,
// the 12-Lagna functional table, and no death / lifespan / penalty wording anywhere.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { houseRoles, FUNCTIONAL_TABLE } from '../shared/rules/roles.js';
import { houseRoles as viaAnalysis } from '../shared/analysis.js';

const D = { Lagna: 0, Sun: 0, Moon: 3, Mars: 6, Mercury: 1, Jupiter: 8, Venus: 11, Saturn: 10, Rahu: 4, Ketu: 10 };
const chart = (spec = {}) => {
  const planets = {};
  for (const k of Object.keys(D)) {
    const v = k in spec ? spec[k] : D[k];
    if (v !== null) planets[k] = { rasi: v, longitude: v * 30 + 15, retrograde: false };
  }
  return { planets };
};
const BANNED = /death|die\b|dying|lifespan|longevity|life expectancy|mortality|penalty|warning|danger|ஆயுள்|மரண|இறப்பு/i;

test('Badhaka: movable 11th, fixed 9th, dual 7th — house, lord, occupants, associations distinct', () => {
  const m = houseRoles(chart({ Lagna: 0, Saturn: 10, Moon: 10 }));
  assert.equal(m.badhaka.lagnaModality, 'movable');
  assert.equal(m.badhaka.house, 11);
  assert.equal(m.badhaka.lord, 'Saturn');
  assert.deepEqual(m.badhaka.occupants.sort(), ['Ketu', 'Moon', 'Saturn']);
  assert.ok(m.badhaka.associatedPlanets.conjunctWithLord.includes('Moon'));
  assert.equal(m.badhaka.status, 'proposed');
  const f = houseRoles(chart({ Lagna: 1 }));
  assert.equal(f.badhaka.house, 9);
  assert.equal(f.badhaka.lord, 'Saturn');
  const d = houseRoles(chart({ Lagna: 2 }));
  assert.equal(d.badhaka.house, 7);
  assert.equal(d.badhaka.lord, 'Jupiter');
  // Boundary: last sign (Meena) is dual → 7th = Kanni, lord Mercury.
  const b = houseRoles(chart({ Lagna: 11 }));
  assert.equal(b.badhaka.house, 7);
  assert.equal(b.badhaka.lord, 'Mercury');
});

test('Maraka: 2nd and 7th lords and occupants as separate facts; no secondary rule', () => {
  const r = houseRoles(chart({ Lagna: 0, Venus: 6, Mars: 1 }));
  assert.equal(r.maraka.second.lord, 'Venus');
  assert.equal(r.maraka.seventh.lord, 'Venus');
  assert.equal(r.maraka.seventh.lordPlacement.house, 7);
  assert.deepEqual(r.maraka.second.occupants, ['Mars', 'Mercury']);
  assert.deepEqual(Object.keys(r.maraka).sort(), ['note', 'ruleId', 'second', 'seventh', 'status']);
  const k = houseRoles(chart({ Lagna: 3 }));
  assert.equal(k.maraka.second.lord, 'Sun');
  assert.equal(k.maraka.seventh.lord, 'Saturn');
});

test('House lords: placement facts for Lagna/5/9/8/12 and all 12 houses', () => {
  const r = houseRoles(chart({ Lagna: 4, Sun: 9 }));
  assert.equal(r.houses.length, 12);
  assert.equal(r.lords.lagna.lord, 'Sun');
  assert.equal(r.lords.lagna.placement.house, 6);
  assert.equal(r.lords.twelfth.lord, 'Moon');
  assert.equal(r.lords.eighth.lord, 'Jupiter');
  assert.equal(r.houses[0].rasi, 4);
  assert.ok(!/foreign|travel|expense/i.test(JSON.stringify(r.lords)));
});

test('Kendradhipathya: reviewed 12-Lagna table, no universal penalty', () => {
  assert.equal(FUNCTIONAL_TABLE.length, 12);
  FUNCTIONAL_TABLE.forEach((row, i) => {
    assert.equal(row.lagna, i);
    assert.ok(!row.benefics.some((k) => row.malefics.includes(k)), `row ${i} overlap`);
    for (const y of row.yogakaraka) assert.ok(row.benefics.includes(y));
  });
  const g = houseRoles(chart({ Lagna: 2 })); // Mithuna: Jupiter rules 7 & 10; Mercury rules 1 & 4
  const jup = g.kendradhipathya.naturalBeneficsRulingKendras.find((x) => x.planet === 'Jupiter');
  assert.deepEqual(jup.kendras, [7, 10]);
  assert.ok(g.kendradhipathya.naturalBeneficsRulingKendras.some((x) => x.planet === 'Mercury'));
  assert.equal(g.kendradhipathya.status, 'proposed');
  assert.ok(!('penalty' in g.kendradhipathya));
  const t = houseRoles(chart({ Lagna: 1 }));
  assert.deepEqual(t.kendradhipathya.functional.yogakaraka, ['Saturn']);
});

test('roles: neutral wording only, no Lagna → unavailable, analysis re-export', () => {
  // Disclaimer notes ("not a warning…") are excluded; every fact must be free of such wording.
  const facts = (o) => JSON.stringify(o, (k, v) => (k === 'note' ? undefined : v));
  for (let L = 0; L < 12; L++) assert.ok(!BANNED.test(facts(houseRoles(chart({ Lagna: L })))), `Lagna ${L}`);
  const none = houseRoles(chart({ Lagna: null }));
  assert.equal(none.available, false);
  assert.ok(none.reason.en);
  assert.deepEqual(viaAnalysis(chart()).badhaka, houseRoles(chart()).badhaka);
});
