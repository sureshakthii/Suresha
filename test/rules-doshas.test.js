// Dosha fixtures: Chevvai (each exception separately), Rahu-Ketu, dosha samyam symmetry,
// and the disputed labels (off by default, never paired with remedies, Grahana never an eclipse).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { doshams, doshaSamyam } from '../shared/porutham.js';
import { getRule, evaluateRule, evaluateRules, listRules } from '../shared/rules/registry.js';
import { CHEVVAI_EXCEPTIONS } from '../shared/rules/chevvai.js';

const D = { Lagna: 0, Sun: 0, Moon: 3, Mars: 6, Mercury: 1, Jupiter: 8, Venus: 11, Saturn: 10, Rahu: 4, Ketu: 10 };
function planets(spec = {}) {
  const out = {};
  for (const k of Object.keys(D)) {
    const v = k in spec ? spec[k] : D[k];
    if (v === null) continue;
    const [rasi, deg = 15] = Array.isArray(v) ? v : [v];
    out[k] = { rasi, longitude: rasi * 30 + deg, retrograde: false };
  }
  return out;
}

test('Chevvai: raw presence per reference point, no auto-cancellation', () => {
  const p = doshams(planets({ Lagna: 0, Moon: 0, Mars: 1 }));
  assert.equal(p.chevvai.raw, true);
  assert.equal(p.chevvai.present, true);
  assert.equal(p.chevvai.references.lagna.house, 2);
  assert.equal(p.chevvai.references.moon.house, 2);
  const n = doshams(planets({ Lagna: 0, Moon: 0, Mars: 2 }));
  assert.equal(n.chevvai.raw, false);
  assert.equal(n.chevvai.present, false);
  // Boundary: 12th from Lagna, 1st from Moon → present by the Lagna reference only.
  const b = doshams(planets({ Lagna: 0, Moon: 11, Mars: 11 }));
  assert.equal(b.chevvai.present, true);
  assert.equal(b.chevvai.references.lagna.present, true);
  assert.equal(b.chevvai.references.moon.present, false);
  assert.deepEqual(b.chevvai.countedReferences, ['lagna']);
  // Lagna-only profile ignores the Moon reference.
  const lo = doshams(planets({ Lagna: 0, Moon: 6, Mars: 1 }), { profile: { chevvai: { references: ['lagna'] } } });
  assert.equal(lo.chevvai.present, true);
  const mo = doshams(planets({ Lagna: 0, Moon: 6, Mars: 2 }), { profile: { chevvai: { references: ['lagna'] } } });
  assert.equal(mo.chevvai.present, false); // Mars 8th from Moon, but Moon reference is off
});

test('Chevvai exceptions: each separately identified, listed with reason, applied only by profile', () => {
  const cases = {
    'dosha.chevvai.exc.own_exalted': { Lagna: 2, Moon: 2, Mars: 9 }, // Makara, 8th
    'dosha.chevvai.exc.simha_kumbha': { Lagna: 9, Moon: 9, Mars: 4 }, // Simha, 8th
    'dosha.chevvai.exc.jupiter_conjunct': { Lagna: 0, Moon: 0, Mars: 1, Jupiter: 1 },
    'dosha.chevvai.exc.second_mithuna_kanni': { Lagna: 1, Moon: 1, Mars: 2 },
  };
  for (const [id, spec] of Object.entries(cases)) {
    const d = doshams(planets(spec));
    const e = d.chevvai.exceptions.find((x) => x.id === id);
    assert.ok(e, `${id} listed`);
    assert.equal(e.status, 'proposed');
    assert.ok(e.reason.en && e.reason.ta && e.en && e.ta);
    assert.equal(e.appliesUnderProfile, false);
    assert.equal(d.chevvai.present, true, `${id}: not auto-cancelled`);
    const applied = doshams(planets(spec), { profile: { chevvai: { applyExceptions: [id] } } });
    assert.equal(applied.chevvai.present, false);
    assert.equal(applied.chevvai.raw, true);
    assert.equal(applied.chevvai.cancelledUnderProfile, true);
    // Each exception rule also evaluates on its own (positive / negative).
    assert.equal(evaluateRule(getRule(id), { planets: planets(spec) }).present, true);
  }
  const none = doshams(planets({ Lagna: 0, Moon: 0, Mars: 1, Jupiter: 5 }));
  assert.equal(none.chevvai.exceptions.length, 0);
  for (const e of CHEVVAI_EXCEPTIONS) assert.equal(evaluateRule(e, { planets: planets({ Lagna: 0, Moon: 0, Mars: 1, Jupiter: 5 }) }).present, false, e.id);
  // Boundary: Mars in Mithuna but in the 3rd (not 2nd) from Lagna → the 2nd-house exception does not apply.
  assert.equal(evaluateRule(getRule('dosha.chevvai.exc.second_mithuna_kanni'), { planets: planets({ Lagna: 0, Mars: 2 }) }).present, false);
});

test('Rahu-Ketu dosham: Lagna reference by default; Moon reference separate; null without Lagna', () => {
  assert.equal(doshams(planets({ Lagna: 0, Rahu: 6, Ketu: 0 })).rahuKetu.present, true);
  assert.equal(doshams(planets({ Lagna: 0, Rahu: 2, Ketu: 8 })).rahuKetu.present, false);
  const m = doshams(planets({ Lagna: 0, Moon: 2, Rahu: 2, Ketu: 8 }));
  assert.equal(m.rahuKetu.present, false);
  assert.equal(m.rahuKetu.references.moon.present, true);
  assert.equal(m.rahuKetu.references.moon.counted, false);
  const nl = doshams(planets({ Lagna: null, Rahu: 6, Ketu: 0 }));
  assert.equal(nl.rahuKetu.present, null);
  assert.equal(nl.chevvai.needsBirthTime, true);
  assert.equal(typeof nl.chevvai.present, 'boolean'); // Moon reference still works
});

test('Dosha samyam: like-with-like only and symmetric in pair order', () => {
  const variants = [
    planets({ Lagna: 0, Moon: 0, Mars: 1, Rahu: 6, Ketu: 0 }), // chevvai + rahuKetu
    planets({ Lagna: 0, Moon: 0, Mars: 1, Rahu: 2, Ketu: 8 }), // chevvai only
    planets({ Lagna: 0, Moon: 0, Mars: 2, Rahu: 6, Ketu: 0 }), // rahuKetu only
    planets({ Lagna: 0, Moon: 0, Mars: 2, Rahu: 2, Ketu: 8 }), // none
    planets({ Lagna: null, Moon: 0, Mars: 1, Rahu: 6, Ketu: 0 }), // no Lagna
  ].map((p) => doshams(p));
  const sig = (notes) => notes.map((n) => `${n.key}:${n.status}:${n.ok}`).sort().join('|');
  for (const a of variants) for (const b of variants) assert.equal(sig(doshaSamyam(a, b)), sig(doshaSamyam(b, a)));
  // Chevvai on one side and Rahu-Ketu on the other do NOT balance each other.
  const cross = doshaSamyam(variants[1], variants[2]);
  assert.equal(cross.find((n) => n.key === 'chevvai').ok, false);
  assert.equal(cross.find((n) => n.key === 'rahuKetu').ok, false);
  const both = doshaSamyam(variants[1], variants[1]).find((n) => n.key === 'chevvai');
  assert.equal(both.status, 'both');
  assert.ok(both.comparison.en.includes('only with Chevvai'));
  // One chart without Lagna: compared by Moon reference on both sides.
  const mixed = doshaSamyam(variants[4], variants[0]).find((n) => n.key === 'chevvai');
  assert.ok(mixed.comparison.en.includes('Moon reference only'));
});

const REVIEW = 'parashari-tamil-review';
const dis = (id, spec, profile = REVIEW) => evaluateRule(getRule(id), { planets: planets(spec) }, { profile });
test('Disputed labels: off by default, behind showDisputed, no remedies, Grahana is not an eclipse', () => {
  const ids = ['dosha.kalasarpa', 'dosha.pitru', 'dosha.shrapit', 'dosha.punarphoo', 'dosha.grahana'];
  const spec = { Sun: 4, Moon: 4, Saturn: 4, Rahu: 4, Ketu: 10 };
  assert.ok(!evaluateRules({ planets: planets(spec) }, { includeAbsent: true }).some((r) => ids.includes(r.ruleId)));
  const on = evaluateRules({ planets: planets(spec) }, { profile: { showDisputed: true }, includeAbsent: true }).map((r) => r.ruleId);
  for (const id of ids) {
    assert.ok(on.includes(id), id);
    const r = getRule(id);
    assert.equal(r.status, 'disputed');
    assert.equal(r.remedyPolicy, 'none');
    assert.equal(r.profileFlag, 'showDisputed');
    assert.ok(!/eclipse/i.test(JSON.stringify(r.name) + JSON.stringify(r.explanation) + r.predicateText.replace('no eclipse geometry is computed and none is implied', '')));
  }
  assert.equal(listRules({ status: 'disputed' }).length, 5);
});

test('Kala Sarpa fixtures', () => {
  const inside = { Rahu: [0, 10], Ketu: [6, 10], Sun: 1, Moon: 2, Mars: 3, Mercury: 1, Jupiter: 4, Venus: 5, Saturn: 2 };
  assert.equal(dis('dosha.kalasarpa', inside).present, true);
  assert.equal(dis('dosha.kalasarpa', { ...inside, Saturn: [6, 20] }).present, false);
  assert.equal(dis('dosha.kalasarpa', { ...inside, Saturn: [0, 10] }).present, false); // exactly on Rahu: not inside
});
test('Pitru fixtures', () => {
  assert.equal(dis('dosha.pitru', { Sun: 4, Rahu: 4, Ketu: 10 }).present, true);
  assert.equal(dis('dosha.pitru', { Sun: 5, Rahu: 4, Ketu: 10 }).present, false);
  assert.equal(dis('dosha.pitru', { Sun: 4, Rahu: 10, Ketu: 4 }).present, true); // with Ketu
});
test('Shrapit fixtures', () => {
  assert.equal(dis('dosha.shrapit', { Saturn: 3, Rahu: 3, Ketu: 9 }).present, true);
  assert.equal(dis('dosha.shrapit', { Saturn: 3, Rahu: 4, Ketu: 10 }).present, false);
  assert.equal(dis('dosha.shrapit', { Saturn: 3, Rahu: 9, Ketu: 3 }).present, false); // Saturn with Ketu is not Shrapit
});
test('Punarphoo fixtures', () => {
  assert.equal(dis('dosha.punarphoo', { Saturn: 3, Moon: 3 }).present, true);
  assert.equal(dis('dosha.punarphoo', { Saturn: 3, Moon: 4 }).present, false);
  const opp = dis('dosha.punarphoo', { Saturn: 3, Moon: 9 });
  assert.equal(opp.present, false);
  assert.equal(opp.variants.mutualAspect.present, true);
});
test('Grahana fixtures', () => {
  assert.equal(dis('dosha.grahana', { Moon: 4, Rahu: 4, Ketu: 10 }).present, true);
  assert.equal(dis('dosha.grahana', { Sun: 0, Moon: 5, Rahu: 4, Ketu: 10 }).present, false);
  assert.equal(dis('dosha.grahana', { Sun: [3, 29], Moon: 6, Rahu: [4, 1], Ketu: [10, 1] }).present, false); // 2° apart, different signs
});
