// Yoga rule fixtures: every enabled yoga rule has a positive, a negative and a boundary fixture.
// Charts are synthetic `planets` objects with explicit rasi/longitude; expectations are worked out
// by hand from the plain-language predicate, never by calling the rule to generate them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getRule, evaluateRule, evaluateRules, validateRegistry, listRules, ruleEnabled, resolveProfile, PRIORITY_20, RULES } from '../shared/rules/registry.js';
import { detectYogas, fullAnalysis } from '../shared/analysis.js';

// Default parking: Lagna Mesha, Sun Mesha, Moon Kataka, Mars Thula, Mercury Rishaba, Jupiter Dhanusu,
// Venus Meena, Saturn Kumbha, Rahu Simha, Ketu Kumbha — all at 15° unless a fixture says otherwise.
const D = { Lagna: 0, Sun: 0, Moon: 3, Mars: 6, Mercury: 1, Jupiter: 8, Venus: 11, Saturn: 10, Rahu: 4, Ketu: 10 };
function mk(spec = {}, extra = {}) {
  const planets = {};
  for (const k of Object.keys(D)) {
    const v = k in spec ? spec[k] : D[k];
    if (v === null) continue;
    const o = typeof v === 'number' ? { rasi: v } : Array.isArray(v) ? { rasi: v[0], deg: v[1] } : v;
    planets[k] = { rasi: o.rasi, longitude: o.rasi * 30 + (o.deg ?? 15), retrograde: !!o.retrograde, ...(o.navamsaRasi != null ? { navamsaRasi: o.navamsaRasi } : {}) };
  }
  return { planets, ...extra };
}
const covered = {};
const mark = (id, kind) => { (covered[id] ||= new Set()).add(kind); };
function ev(id, spec, profile) { return evaluateRule(getRule(id), mk(spec), { profile }); }
function pos(id, spec, profile) { const r = ev(id, spec, profile); assert.equal(r.present, true, `${id} positive`); mark(id, 'pos'); return r; }
function neg(id, spec, profile) { const r = ev(id, spec, profile); assert.equal(r.present, false, `${id} negative`); mark(id, 'neg'); return r; }
function edge(id, spec, expected, profile) { const r = ev(id, spec, profile); assert.equal(r.present, expected, `${id} boundary`); mark(id, 'edge'); return r; }

test('registry: governance checks pass and nothing is approved without a reviewer', () => {
  assert.deepEqual(validateRegistry(), []);
  for (const r of RULES) {
    assert.notEqual(r.status, 'approved', `${r.id} must not be approved without master-astrologer sign-off`);
    assert.equal(r.reviewer, null);
    assert.ok(r.predicateText.length > 10);
  }
  assert.equal(PRIORITY_20.length, 20);
  for (const id of PRIORITY_20) assert.equal(getRule(id)?.status, 'proposed', id);
});

test('Gaja Kesari: Jupiter in kendra from Moon; modifiers never erase it', () => {
  pos('yoga.gajakesari', { Moon: 3, Jupiter: 9 });
  neg('yoga.gajakesari', { Moon: 3, Jupiter: 4 });
  const same = edge('yoga.gajakesari', { Moon: 3, Jupiter: 3 }, true);
  assert.ok(same.strength.modifiers.some((m) => m.factor === 'same_sign'));
  const weak = pos('yoga.gajakesari', { Moon: 0, Jupiter: 9, Lagna: 0 }); // Jupiter debilitated in Makara
  assert.ok(weak.strength.modifiers.some((m) => m.factor === 'Jupiter_debilitated' && m.effect === 'weakens'));
  const combust = pos('yoga.gajakesari', { Moon: 3, Jupiter: [9, 10], Sun: [9, 15] });
  assert.ok(combust.strength.modifiers.some((m) => m.factor === 'Jupiter_combust'));
  const dus = pos('yoga.gajakesari', { Lagna: 0, Moon: 2, Jupiter: 11 }); // Jupiter 12th from Lagna, 10th from Moon
  assert.ok(dus.strength.modifiers.some((m) => m.factor === 'Jupiter_dusthana'));
});

test('Budha-Aditya: same sign; combustion threshold and separation are modifiers', () => {
  const r = pos('yoga.budhaditya', { Sun: [0, 10], Mercury: [0, 28] });
  assert.ok(r.strength.modifiers.some((m) => m.factor === 'mercury_outside_orb'));
  neg('yoga.budhaditya', { Sun: [0, 29.9], Mercury: [1, 0.2] }); // 0.3° apart but different signs
  const at14 = edge('yoga.budhaditya', { Sun: [0, 10], Mercury: [0, 24] }, true); // exactly 14°: not combust
  assert.ok(!at14.strength.modifiers.some((m) => m.factor === 'Mercury_combust'));
  const in14 = ev('yoga.budhaditya', { Sun: [0, 10], Mercury: [0, 23.9] });
  assert.equal(in14.present, true);
  assert.ok(in14.strength.modifiers.some((m) => m.factor === 'Mercury_combust' && m.effect === 'weakens'));
  const retro = ev('yoga.budhaditya', { Sun: [0, 10], Mercury: { rasi: 0, deg: 22.5, retrograde: true } }); // 12.5° > 12° retro orb
  assert.ok(!retro.strength.modifiers.some((m) => m.factor === 'Mercury_combust'));
});

test('Chandra-Mangala: conjunction; mutual 7th is a separate flag', () => {
  pos('yoga.chandramangala', { Moon: 3, Mars: 3 });
  neg('yoga.chandramangala', { Moon: 3, Mars: 4 });
  const opp = edge('yoga.chandramangala', { Moon: 3, Mars: 9 }, false);
  assert.equal(opp.variants.mutualSeventh.present, true);
  assert.equal(opp.variants.mutualSeventh.enabled, false);
  assert.equal(ev('yoga.chandramangala', { Moon: 3, Mars: 9 }, { variants: { 'yoga.chandramangala': ['conjunction', 'mutualSeventh'] } }).present, true);
});

test('Pancha Mahapurusha: Lagna reference; Moon reference is a separate, off-by-default flag', () => {
  const T = {
    ruchaka: ['Mars', 0, 3, 9], bhadra: ['Mercury', 2, 11, 5], hamsa: ['Jupiter', 8, 9, 3], malavya: ['Venus', 1, 5, 11], sasa: ['Saturn', 9, 0, 6],
  }; // [planet, own sign, debilitation sign, exaltation sign]
  for (const [y, [k, own, deb, ex]] of Object.entries(T)) {
    const id = `yoga.mahapurusha.${y}`;
    pos(id, { Lagna: own, [k]: own, Sun: (own + 6) % 12 });
    neg(id, { Lagna: deb, [k]: deb });
    edge(id, { Lagna: (ex + 3) % 12, [k]: ex, Sun: (ex + 6) % 12 }, true); // exalted in the 10th
  }
  // Mars own sign in the 8th from Lagna but 4th from the Moon: NOT present (no silent switch to Moon).
  const r = ev('yoga.mahapurusha.ruchaka', { Lagna: 0, Mars: 7, Moon: 4 });
  assert.equal(r.present, false);
  assert.equal(r.variants.moon.present, true);
  assert.equal(r.variants.moon.enabled, false);
  const noLagna = ev('yoga.mahapurusha.ruchaka', { Lagna: null, Mars: 0, Moon: 0 });
  assert.equal(noLagna.unavailable, true);
  assert.equal(noLagna.needs, 'birth-time');
});

test('Yogakaraka: one planet ruling a kendra and a trikona', () => {
  const r = pos('role.yogakaraka', { Lagna: 1 });
  assert.equal(r.legacyId, 'yogakaraka_Saturn');
  neg('role.yogakaraka', { Lagna: 0 });
  assert.equal(edge('role.yogakaraka', { Lagna: 9 }, true).data.planet, 'Venus');
  edge('role.yogakaraka', { Lagna: 2 }, false); // Mithuna: Jupiter rules 7 & 10 (two kendras, no trikona)
});

test('Raja Yoga: conjunction, mutual aspect, exchange and Lagna lord are separate flags', () => {
  // Mesha Lagna: kendra lords Moon(4) Venus(7) Saturn(10); trikona lords Sun(5) Jupiter(9).
  const r = pos('yoga.raja', { Moon: 5, Jupiter: 5 });
  assert.deepEqual(r.enabledPresent, ['conjunction']);
  assert.ok(r.periods.lords.includes('Moon') && r.periods.lords.includes('Jupiter'));
  neg('yoga.raja', {});
  const ex = edge('yoga.raja', { Saturn: 4, Sun: 9 }, false); // Saturn in Simha, Sun in Makara: exchange only
  assert.equal(ex.variants.exchange.present, true);
  assert.equal(ex.variants.conjunction.present, false);
  assert.equal(ev('yoga.raja', { Saturn: 4, Sun: 9 }, { variants: { 'yoga.raja': ['conjunction', 'exchange'] } }).present, true);
  const ll = ev('yoga.raja', { Mars: 8, Jupiter: 8 });
  assert.equal(ll.variants.lagnaLord.present, true);
  assert.equal(ll.present, false);
  // Mutual aspect: Moon in Simha(4) and Jupiter in Kumbha(10) face each other.
  const ma = ev('yoga.raja', { Moon: 4, Jupiter: 10, Rahu: 2, Ketu: 8 });
  assert.equal(ma.variants.mutualAspect.present, true);
});

test('Dhana Yoga: 2/11 lords with 5/9 lords; Lagna-lord flag separate', () => {
  pos('yoga.dhana', { Venus: 0, Sun: 0 });
  neg('yoga.dhana', {});
  const r = edge('yoga.dhana', { Mars: 11, Venus: 11 }, false);
  assert.equal(r.variants.lagnaLord.present, true);
});

test('Viparita split: Harsha / Sarala / Vimala', () => {
  pos('yoga.viparita.harsha', { Mercury: 7 });
  neg('yoga.viparita.harsha', { Mercury: 4 });
  edge('yoga.viparita.harsha', { Mercury: 5 }, true); // 6th lord in its own 6th
  edge('yoga.viparita.harsha', { Mercury: 6 }, false);
  pos('yoga.viparita.sarala', { Mars: 11 });
  neg('yoga.viparita.sarala', { Mars: 0 });
  edge('yoga.viparita.sarala', { Mars: 7 }, true);
  pos('yoga.viparita.vimala', { Jupiter: 5 });
  neg('yoga.viparita.vimala', { Jupiter: 8 });
  edge('yoga.viparita.vimala', { Jupiter: 11 }, true);
  assert.equal(ev('yoga.viparita.vimala', { Lagna: null }).unavailable, true);
});

test('Adhi: benefics in 6/7/8 from Moon; from-Lagna is a separate flag', () => {
  pos('yoga.adhi', { Moon: 0, Mercury: 5, Jupiter: 6, Venus: 7 });
  neg('yoga.adhi', { Moon: 0, Mercury: 1, Jupiter: 8, Venus: 11 });
  const two = edge('yoga.adhi', { Moon: 0, Mercury: 4, Jupiter: 6, Venus: 7 }, true);
  assert.deepEqual(two.enabledPresent, ['partial']);
  assert.equal(ev('yoga.adhi', { Moon: 0, Mercury: 4, Jupiter: 6, Venus: 9 }).present, false);
  const fromLagna = ev('yoga.adhi', { Lagna: 0, Moon: 3, Mercury: 5, Jupiter: 6, Venus: 9 });
  assert.equal(fromLagna.variants.fromLagna.present, true);
  assert.equal(fromLagna.variants.fromLagna.enabled, false);
  assert.equal(fromLagna.present, false);
});

test('Neecha Bhanga: each cancellation condition separate; never labelled Raja Yoga', () => {
  const r = pos('yoga.neechabhanga.sun', { Lagna: 0, Sun: 6, Venus: 3 });
  assert.ok(r.enabledPresent.includes('dispositor_kendra_lagna'));
  assert.ok(!/raja/i.test(r.name.en));
  assert.equal(r.notRajaYoga, true);
  assert.ok(r.strength.modifiers.some((m) => m.factor === 'not_raja_yoga'));
  assert.notEqual(r.strength.label, 'strong');
  neg('yoga.neechabhanga.sun', { Lagna: 0, Moon: 0, Sun: 6, Venus: 1, Mars: 2, Saturn: 4 });
  const asp = edge('yoga.neechabhanga.sun', { Lagna: 1, Moon: 1, Sun: 6, Venus: 0, Mars: 2, Saturn: 5 }, true);
  assert.deepEqual(asp.enabledPresent, ['aspected_by_dispositor']);
  assert.equal(ev('yoga.neechabhanga.sun', { Lagna: 1, Moon: 1, Sun: 6, Venus: 0, Mars: 2, Saturn: 5 }, { variants: { 'yoga.neechabhanga.sun': ['dispositor_kendra_lagna'] } }).present, false);
  // Other planets: debilitated + conjunct dispositor (positive); one sign later (negative); D9 exaltation (boundary).
  const T = { moon: ['Moon', 7, 'Mars', 1], mars: ['Mars', 3, 'Moon', 9], mercury: ['Mercury', 11, 'Jupiter', 5], jupiter: ['Jupiter', 9, 'Saturn', 3], venus: ['Venus', 5, 'Mercury', 11], saturn: ['Saturn', 0, 'Mars', 6] };
  for (const [id, [k, deb, disp, ex]] of Object.entries(T)) {
    const p = pos(`yoga.neechabhanga.${id}`, { [k]: deb, [disp]: deb });
    assert.ok(p.enabledPresent.includes('conjunct_dispositor'));
    neg(`yoga.neechabhanga.${id}`, { [k]: (deb + 1) % 12 });
    const e = ev(`yoga.neechabhanga.${id}`, { [k]: { rasi: deb, navamsaRasi: ex } });
    assert.equal(e.variants.exalted_in_navamsa.present, true);
    mark(`yoga.neechabhanga.${id}`, 'edge');
  }
});

test('Kemadruma: standard predicate with separately listed cancellations', () => {
  const r = pos('yoga.kemadruma', { Moon: 0, Mars: 3, Mercury: 4, Jupiter: 6, Venus: 8, Saturn: 9 });
  assert.equal(r.tone, 'mild');
  const c = r.cancellation.conditions.find((x) => x.id === 'kemadruma.cancel.kendra_from_moon');
  assert.equal(c.satisfied, true); // Mars 4th from Moon
  assert.equal(r.present, true, 'a cancellation does not erase the configuration');
  neg('yoga.kemadruma', { Moon: 0, Mars: 1, Mercury: 4, Jupiter: 6, Venus: 8, Saturn: 9 });
  edge('yoga.kemadruma', { Moon: 0, Sun: 1, Rahu: 11, Ketu: 5, Mars: 3, Mercury: 4, Jupiter: 6, Venus: 8, Saturn: 9 }, true); // Sun/nodes not counted
});

const PARK = { Moon: 0, Mars: 3, Mercury: 4, Jupiter: 6, Venus: 8, Saturn: 9 }; // nothing in 2nd/12th from Moon (Mesha)
test('Sunapha / Anapha / Durudhara (from Moon)', () => {
  pos('yoga.sunapha', { ...PARK, Mars: 1 });
  neg('yoga.sunapha', PARK);
  const both = edge('yoga.sunapha', { ...PARK, Mars: 1, Saturn: 11 }, false);
  assert.equal(both.variants.inclusive.present, true);
  pos('yoga.anapha', { ...PARK, Saturn: 11 });
  neg('yoga.anapha', PARK);
  edge('yoga.anapha', { ...PARK, Mars: 1, Saturn: 11 }, false);
  pos('yoga.durudhara', { ...PARK, Mars: 1, Saturn: 11 });
  neg('yoga.durudhara', { ...PARK, Mars: 1 });
  edge('yoga.durudhara', { ...PARK, Sun: 1, Saturn: 11 }, false); // Sun is not counted
});

const SPARK = { Sun: 0, Moon: 5, Mars: 3, Mercury: 4, Jupiter: 6, Venus: 8, Saturn: 9 }; // nothing in 2nd/12th from Sun
test('Vesi / Vasi / Ubhayachari (from Sun)', () => {
  pos('yoga.vesi', { ...SPARK, Mercury: 1 });
  neg('yoga.vesi', SPARK);
  edge('yoga.vesi', { ...SPARK, Moon: 1 }, false); // Moon is not counted
  pos('yoga.vasi', { ...SPARK, Venus: 11 });
  neg('yoga.vasi', SPARK);
  edge('yoga.vasi', { ...SPARK, Venus: 11, Mars: 1 }, false);
  pos('yoga.ubhayachari', { ...SPARK, Venus: 11, Mars: 1 });
  neg('yoga.ubhayachari', { ...SPARK, Venus: 11 });
  edge('yoga.ubhayachari', { ...SPARK, Rahu: 1, Ketu: 7, Venus: 11 }, false); // nodes not counted
});

test('Parivartana: Maha / Khala / Dainya', () => {
  const m = pos('yoga.parivartana.maha', { Mars: 9, Saturn: 0 });
  assert.deepEqual(m.data.exchanges[0].houses, [1, 10]);
  neg('yoga.parivartana.maha', {});
  edge('yoga.parivartana.maha', { Mars: 7 }, false); // Mars in its other own sign is not an exchange
  pos('yoga.parivartana.khala', { Mercury: 3, Moon: 2 });
  neg('yoga.parivartana.khala', {});
  // Mercury rules 3 AND 6 for Mesha: Mercury in Kataka + Moon in Kanni is a 4th/6th exchange → Dainya, not Khala.
  edge('yoga.parivartana.khala', { Mercury: 3, Moon: 5 }, false);
  assert.equal(ev('yoga.parivartana.dainya', { Mercury: 3, Moon: 5 }).present, true);
  pos('yoga.parivartana.dainya', { Jupiter: 0, Mars: 11 });
  neg('yoga.parivartana.dainya', {});
  edge('yoga.parivartana.dainya', { Jupiter: 0, Mars: 8 }, false); // Mars in Dhanusu: not a sign of Jupiter's that pairs back
});

test('Lakshmi', () => {
  pos('yoga.lakshmi', { Jupiter: 8, Mars: 0, Sun: 4 });
  neg('yoga.lakshmi', { Jupiter: 9, Mars: 0, Sun: 4 });
  edge('yoga.lakshmi', { Jupiter: 8, Mars: 3, Sun: 4 }, false); // Lagna lord Mars debilitated (kendra, but debilitated)
  edge('yoga.lakshmi', { Jupiter: 3, Mars: 0, Sun: 4 }, true); // Jupiter exalted in the 4th
});

test('Saraswati', () => {
  pos('yoga.saraswati', { Jupiter: 8, Venus: 1, Mercury: 3 });
  neg('yoga.saraswati', { Jupiter: 8, Venus: 1, Mercury: 2 });
  edge('yoga.saraswati', { Jupiter: 6, Venus: 1, Mercury: 3 }, false); // Jupiter in Venus's sign (enemy)
  edge('yoga.saraswati', { Jupiter: 4, Venus: 1, Mercury: 3 }, true); // Jupiter in Sun's sign (friend)
});

test('Amala: Lagna and Moon references are separate flags', () => {
  const r = pos('yoga.amala', { Venus: 9 });
  assert.equal(r.variants.lagna.present, true);
  neg('yoga.amala', { Moon: 0, Mercury: 1, Jupiter: 8, Venus: 11 });
  const m = edge('yoga.amala', { Moon: 3, Jupiter: 0, Venus: 11 }, true);
  assert.deepEqual(m.enabledPresent, ['moon']);
  const ex = ev('yoga.amala', { Venus: 9, Saturn: 9 });
  assert.equal(ex.variants.exclusive.present, false);
});

test('Vasumathi', () => {
  pos('yoga.vasumathi', { Mercury: 2, Jupiter: 5, Venus: 9, Moon: 6 });
  neg('yoga.vasumathi', { Mercury: 2, Jupiter: 5, Venus: 0, Moon: 6 });
  edge('yoga.vasumathi', { Mercury: 2, Jupiter: 5, Venus: 1, Moon: 6 }, false); // two of three
});

test('Parvata', () => {
  const quiet = { Sun: 0, Mars: 0, Saturn: 10, Rahu: 4, Ketu: 10 };
  pos('yoga.parvata', { ...quiet, Jupiter: 3 });
  neg('yoga.parvata', { ...quiet, Jupiter: 3, Mars: 7 });
  edge('yoga.parvata', { ...quiet, Jupiter: 3, Moon: 5 }, true); // Moon in the 6th is not a malefic here
});

test('Kahala', () => {
  pos('yoga.kahala', { Moon: 3, Jupiter: 6, Mars: 0, Sun: 4 });
  neg('yoga.kahala', { Moon: 3, Jupiter: 4, Mars: 0, Sun: 4 });
  edge('yoga.kahala', { Moon: 3, Jupiter: 6, Mars: 3, Sun: 4 }, false); // Lagna lord debilitated
});

test('Chamara', () => {
  pos('yoga.chamara', { Mars: 9, Jupiter: 5 });
  neg('yoga.chamara', { Mars: 9, Jupiter: 6 });
  const r = edge('yoga.chamara', { Venus: 6, Mercury: 6 }, false);
  assert.equal(r.variants.twoBenefics.present, true);
});

test('Sankha', () => {
  pos('yoga.sankha', { Sun: 0, Mercury: 3, Mars: 7 });
  neg('yoga.sankha', { Sun: 0, Mercury: 4, Mars: 7 });
  edge('yoga.sankha', { Lagna: 5 }, false); // Kanni: Saturn rules both 5th and 6th
});

test('periods come from chart.dasa and stability flags unstable inputs', () => {
  const dasa = { periods: [{ lord: 'Jupiter', start: new Date(0), end: new Date(1e12) }, { lord: 'Venus', start: new Date(1e12), end: new Date(2e12) }], current: { lord: 'Jupiter' }, currentBhukti: { lord: 'Moon' } };
  const r = evaluateRule(getRule('yoga.gajakesari'), mk({ Moon: 3, Jupiter: 9 }, { dasa }));
  assert.deepEqual(r.periods.dasas.map((d) => d.lord), ['Jupiter']);
  assert.equal(r.periods.current.dasaActivates, true);
  assert.equal(r.periods.current.bhuktiActivates, true);
  assert.equal(r.stability.status, 'exact');
  const stability = { unstable: ['lagna', 'house:Mercury'], windowMinutes: 30 };
  const lag = evaluateRule(getRule('yoga.viparita.harsha'), mk({ Mercury: 7 }, { stability }));
  assert.equal(lag.stability.status, 'unstable');
  assert.ok(lag.stability.unstableInputs.includes('lagna'));
  const moon = evaluateRule(getRule('yoga.sunapha'), mk({ ...PARK, Mars: 1 }, { stability }));
  assert.equal(moon.stability.status, 'stable');
});

test('detectYogas keeps legacy fields and adds structured output', () => {
  const ys = detectYogas(mk({ Moon: 3, Jupiter: 9, Lagna: 0, Sun: 6, Venus: 3 }));
  const gk = ys.find((y) => y.id === 'gajakesari');
  assert.ok(gk.name.en && gk.desc.en && gk.desc.ta && gk.kind === 'good');
  assert.equal(gk.rule, 'yoga.gajakesari');
  assert.equal(gk.status, 'proposed');
  assert.ok(gk.strength && 'variants' in gk && 'periods' in gk);
  const nb = ys.find((y) => y.id === 'neechabhanga_Sun');
  assert.ok(nb && !/raja/i.test(nb.name.en));
  assert.ok(!ys.some((y) => y.rule.startsWith('dosha.')), 'no disputed labels among yogas');
  const noLagna = fullAnalysis(mk({ Lagna: null, Moon: 3, Jupiter: 9 }, { dasa: { periods: [], current: null } }));
  assert.equal(noLagna.bhavas.length, 0);
  assert.ok(noLagna.needsBirthTime.some((x) => x.rule === 'yoga.raja'));
  assert.ok(noLagna.yogas.some((y) => y.id === 'gajakesari'));
  assert.equal(noLagna.roles.available, false);
});

test('coverage: every enabled yoga rule has positive, negative and boundary fixtures', () => {
  const pr = resolveProfile();
  const enabled = listRules().filter((r) => (r.kind === 'yoga' || r.showWithYogas) && ruleEnabled(r, pr)).map((r) => r.id);
  for (const id of enabled) for (const k of ['pos', 'neg', 'edge']) assert.ok(covered[id]?.has(k), `${id} missing ${k} fixture`);
  assert.ok(evaluateRules(mk(), {}).every((r) => !r.disputed));
});
