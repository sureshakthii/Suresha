// Dosham diagnosis & Nivarthi engine (shared/dosham.js): the owner's two sanity patterns, base rates on random
// charts (no over-reporting), cancellations, Chevvai agreeing with the registry rule, unknown birth time, children,
// the same sthalams for every person (Hindu-only app), temple data, the prohibited-word scan on every string, and Ask Thunai answers that name the doshams.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { birthChart } from '../shared/astro.js';
import { diagnoseDoshams, nivarthiPlan, expertView, primarySthalam, yatraIds, doshamsForArea, allText, DOSHAM_RULES, DOSHAM_KINDS, PLANET_NIVARTHI } from '../shared/dosham.js';
import { doshams } from '../shared/porutham.js';
import { TEMPLES } from '../shared/temples.js';
import { templeInfo } from '../shared/temple-info.js';
import { findProhibited } from '../shared/themes.js';
import { scanProhibited, PROHIBITED_PATTERNS } from '../server/policy/answer-validator.js';
import { birthArgs, timeReliability } from '../shared/birthtime.js';
import { chartFacts } from '../shared/guidance.js';
import { ageProfile } from '../shared/age-guard.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NOW = new Date('2026-10-07T06:00:00Z');
const CHENNAI = { lat: 13.0827, lon: 80.2707, tz: 5.5 };
// Owner pattern 1 (Suresh Babu): Kanni Lagna with Saturn + Mars in the Lagna; Lagna lord Mercury in the 8th (Mesha)
// with the exalted Sun, combust. (The 8th from Kanni is Mesha — the only Lagna where "Budhan in the 8th with Suriyan in
// Mesham" and "Budhan is the Lagna lord" both hold.) Found by scanning 1940–2000: 20 Apr 1982, ~17:00 IST.
const OWNER = { name: 'Suresh Babu', date: '1982-04-20', time: '17:00:00', ...CHENNAI };
// Owner pattern 2 (Sakthi): Rahu in the Lagna (Meena).
const WIFE = { name: 'Sakthi', date: '1986-09-15', time: '19:00:00', ...CHENNAI };
const ownerChart = birthChart(OWNER);
const wifeChart = birthChart(WIFE);
const kinds = (d) => d.items.map((x) => x.kind);
const ADULT_CLASSES = Object.keys(PROHIBITED_PATTERNS).filter((c) => !['sexual_content', 'marriage_scheduling', 'romantic_forecast', 'adult_relationship_coaching'].includes(c));
const flat = (v) => JSON.stringify(v);

test('owner pattern 1: the chart really has the placements (Kanni Lagna, Sani + Sevvai in Lagna, Budhan combust in the 8th)', () => {
  const P = ownerChart.planets;
  assert.equal(P.Lagna.rasi, 5);
  assert.equal(P.Saturn.rasi, 5); assert.equal(P.Mars.rasi, 5);
  assert.equal(P.Sun.rasi, 0); assert.equal(P.Mercury.rasi, 0);
  const sep = Math.abs(((P.Sun.longitude - P.Mercury.longitude + 540) % 360) - 180);
  assert.ok(sep < 14, `Mercury ${sep.toFixed(1)}° from the Sun`);
});

test('owner pattern 1: Sani–Sevvai (strong), Lagna lord combust in the 8th, Putra dosham — with Sani, Sevvai, Suriyan, Budhan and child sthalams', () => {
  const d = diagnoseDoshams(ownerChart, { now: NOW });
  const ss = d.items.find((x) => x.kind === 'sanisevvai');
  assert.ok(ss, kinds(d).join(','));
  assert.equal(ss.severity, 'strong');
  assert.deepEqual(ss.data.houses, [1, 1]);
  const ll = d.items.find((x) => x.kind === 'lagnalord');
  assert.ok(ll && ll.data.lord === 'Mercury' && ll.data.house === 8 && ll.data.combust);
  assert.match(ll.facts.map((f) => f.en).join(' '), /orb used: 14°/);
  assert.ok(ll.planets.includes('Sun'), 'a combust lord brings the Sun into the remedy');
  const pu = d.items.find((x) => x.kind === 'putra');
  assert.ok(pu, 'putra dosham present');
  assert.ok(pu.areas.includes('children'));
  // The most important dosham comes first.
  assert.equal(d.items[0].kind, 'sanisevvai');
  // Temples: Sani (Thirunallar), Sevvai (Vaitheeswaran), Budhan (Thiruvenkadu), Suriyan (Suriyanar), child (Thirukarugavur).
  const temples = new Set(d.items.flatMap((it) => nivarthiPlan(it).sthalams.map((s) => s.id)));
  for (const id of ['thirunallar', 'vaitheeswaran', 'thiruvenkadu', 'suriyanar', 'thirukarugavur']) assert.ok(temples.has(id), id);
  assert.equal(nivarthiPlan(pu).sthalams[0].id, 'thirukarugavur');
  assert.ok(nivarthiPlan(pu).doctor, 'child plan says: consult a fertility specialist together');
  // Timing: the running Mercury Dasa activates the Lagna-lord affliction; Sani–Sevvai comes into focus in Saturn's Bhukti.
  assert.equal(d.running.md, 'Mercury');
  assert.equal(ll.timing.activeNow, true);
  assert.equal(ss.timing.activeNow, false);
  assert.equal(ss.timing.next.lord, 'Saturn');
});

test('owner pattern 1: the Tamil expert view reads it like a senior jothidar, with the product framing', () => {
  const d = diagnoseDoshams(ownerChart, { now: NOW });
  const ev = expertView(d, { name: 'Suresh Babu' });
  const ta = ev.paras.map((p) => p.ta).join('\n');
  assert.match(ta, /தோஷம் சாபம் அல்ல — நிவர்த்தி உண்டு/);
  assert.match(ta, /கன்னி லக்னம்/);
  assert.match(ta, /லக்னாதிபதி புதன் 8-ம் வீட்டில், சூரியனுடன் அஸ்தங்கம்/);
  assert.match(ta, /முயற்சி மிகுந்த வாழ்க்கை/);
  assert.match(ta, /தாமதம் மட்டுமே, மறுப்பு அல்ல/);
  assert.match(ta, /குழந்தைப்பேறு சிறப்பு மருத்துவரையும்/);
  for (const t of ['திருநள்ளாறு', 'வைத்தீஸ்வரன்', 'திருவெண்காடு', 'சூரியனார்', 'திருக்கருகாவூர்']) assert.ok(ta.includes(t), t);
  assert.match(ta, /பரிகாரம் செய்தவர்கள் பலர் நல்ல மாற்றம் கண்டதாக மரபு சொல்கிறது/);
  assert.match(ta, /உத்தரவாதம் அல்ல/);
  assert.doesNotMatch(ta, /ஒருபோதும் (நடக்காது|கிடைக்காது)|குழந்தை பிறக்காது|ஆயுள்/);
  const en = ev.paras.map((p) => p.en).join('\n');
  assert.doesNotMatch(en, /\bnever (marry|have|get)\b|\bwill not\b|lifespan|severe/i);
});

test('owner pattern 2: Rahu in the Lagna → Rahu–Ketu dosham with Sri Kalahasti first', () => {
  assert.equal(wifeChart.planets.Rahu.rasi, wifeChart.planets.Lagna.rasi);
  const d = diagnoseDoshams(wifeChart, { now: NOW });
  const rk = d.items.find((x) => x.kind === 'rahuketu');
  assert.ok(rk);
  assert.equal(rk.data.axis, '1-7');
  assert.ok(rk.areas.includes('marriage'));
  const plan = nivarthiPlan(rk);
  assert.equal(plan.sthalams[0].id, 'kalahasti');
  assert.ok(plan.sthalams.some((s) => s.id === 'thirunageswaram') && plan.sthalams.some((s) => s.id === 'keezhaperumpallam'));
  assert.match(plan.day.en, /Rahu Kalam/);
  assert.equal(primarySthalam(d).sthalam.id, 'kalahasti');
  assert.ok(yatraIds(d).includes('kalahasti'));
  assert.ok(doshamsForArea(d, 'marriage').some((x) => x.kind === 'rahuketu'));
  const ta = expertView(d, { name: 'Sakthi' }).paras.map((p) => p.ta).join('\n');
  assert.match(ta, /ஸ்ரீ காளஹஸ்தி/);
});

function randomCharts(n, seed = 11) {
  let s = seed;
  const rnd = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
  const out = [];
  for (let i = 0; i < n; i++) {
    const y = 1950 + Math.floor(rnd() * 55), m = 1 + Math.floor(rnd() * 12), d = 1 + Math.floor(rnd() * 28), hh = Math.floor(rnd() * 24), mm = Math.floor(rnd() * 60);
    const p = (x) => String(x).padStart(2, '0');
    out.push(birthChart({ name: `r${i}`, date: `${y}-${p(m)}-${p(d)}`, time: `${p(hh)}:${p(mm)}:00`, ...CHENNAI }));
  }
  return out;
}
const RANDOM = randomCharts(30);

test('30 random charts: no over-reporting, Chevvai agrees with the registry rule, every item well formed', () => {
  let items = 0, strong = 0, nonMild = 0;
  for (const c of RANDOM) {
    const d = diagnoseDoshams(c, { now: NOW });
    assert.equal(d.items.some((x) => x.kind === 'chevvai'), doshams(c.planets).chevvai.present, 'Chevvai = registry rule');
    const st = d.items.filter((x) => x.severity === 'strong').length;
    assert.ok(st <= 3, `${st} strong doshams in one chart`);
    items += d.items.length; strong += st; nonMild += d.items.filter((x) => x.severity !== 'mild').length;
    for (const it of d.items) {
      assert.equal(it.status, 'proposed');
      assert.ok(['mild', 'moderate', 'strong'].includes(it.severity));
      assert.ok(it.name.en && it.name.ta && it.condition.en && it.condition.ta && it.areas.length && it.planets.length, it.kind);
      assert.ok(it.timing && it.timing.text.en && it.timing.text.ta, `${it.kind} timing`);
      assert.ok(nivarthiPlan(it).avoid.length >= 3);
    }
  }
  assert.ok(items / RANDOM.length < 6, `average ${items / RANDOM.length} doshams per chart`);
  assert.ok(nonMild / RANDOM.length < 2.5, `average ${nonMild / RANDOM.length} moderate+ per chart`);
  assert.ok(strong / RANDOM.length < 1, `average ${strong / RANDOM.length} strong per chart`);
});

// ---------------------------------------------------------------- synthetic charts: cancellations
const P = (rasi, deg = 15, retro = false) => ({ rasi, longitude: rasi * 30 + deg, retrograde: retro });
function synth(spec) {
  const base = { Lagna: 0, Sun: 3, Moon: 6, Mars: 4, Mercury: 4, Jupiter: 10, Venus: 2, Saturn: 8, Rahu: 9, Ketu: 3 };
  const s = { ...base, ...spec };
  const planets = {};
  for (const [k, v] of Object.entries(s)) if (v != null) planets[k] = typeof v === 'object' ? v : P(v, k === 'Mercury' ? 28 : 15);
  return { planets };
}

test('cancellations soften: dignified Saturn, Jupiter on the nodes, Chevvai exceptions are listed but keep the registry result', () => {
  // Saturn in Makara Lagna (own sign) → Sani dosham with a cancellation → mild.
  const own = diagnoseDoshams(synth({ Lagna: 9, Saturn: 9, Mars: 3, Jupiter: 1 }), { now: NOW });
  const sani = own.items.find((x) => x.kind === 'sani');
  assert.ok(sani && sani.cancellations.length >= 1 && sani.severity === 'mild');
  // Saturn debilitated in Mesha Lagna → stronger than mild.
  const deb = diagnoseDoshams(synth({ Lagna: 0, Saturn: 0, Mars: 3, Jupiter: 1 }), { now: NOW });
  assert.notEqual(deb.items.find((x) => x.kind === 'sani').severity, 'mild');
  // Rahu in the 7th: with Jupiter aspecting Rahu (Jupiter in the 1st aspects the 7th) → softened.
  const plain = diagnoseDoshams(synth({ Lagna: 0, Rahu: 6, Ketu: 0, Jupiter: 3 }), { now: NOW }).items.find((x) => x.kind === 'rahuketu');
  const soft = diagnoseDoshams(synth({ Lagna: 0, Rahu: 6, Ketu: 0, Jupiter: 0 }), { now: NOW }).items.find((x) => x.kind === 'rahuketu');
  assert.equal(plain.cancellations.length, 0);
  assert.ok(soft.cancellations.length >= 1 && soft.points.net < plain.points.net);
  // Mars own sign in the 8th from Lagna: Chevvai stays present (registry) but the exception is listed and softens it.
  const cv = diagnoseDoshams(synth({ Lagna: 5, Mars: 0, Moon: 5 }), { now: NOW }).items.find((x) => x.kind === 'chevvai');
  assert.ok(cv && cv.cancellations.length >= 1 && cv.points.net < cv.points.raw);
  // Putra: Jupiter aspecting the 5th removes a single-factor putra dosham.
  const P5 = { Lagna: 0, Saturn: 4, Mars: 2, Mercury: 2, Sun: 1, Rahu: 8, Ketu: 2 };
  const p1 = diagnoseDoshams(synth({ ...P5, Jupiter: 3 }), { now: NOW }).items.find((x) => x.kind === 'putra');
  const p0 = diagnoseDoshams(synth({ ...P5, Jupiter: 0 }), { now: NOW }).items.find((x) => x.kind === 'putra');
  assert.ok(p1, 'Saturn in the 5th → putra factor');
  assert.equal(p0, undefined, 'Jupiter in the Lagna aspects the 5th → cancelled');
});

test('Kala Sarpa and the other contested labels are marked "traditional; some astrologers differ"', () => {
  const ks = synth({ Lagna: 0, Rahu: P(0, 1), Ketu: P(6, 1), Sun: 1, Moon: 2, Mars: 3, Mercury: P(1, 20), Jupiter: 4, Venus: 2, Saturn: 5 });
  const d = diagnoseDoshams(ks, { now: NOW });
  const it = d.items.find((x) => x.kind === 'kalasarpa');
  assert.ok(it && it.disputed && it.severity === 'mild');
  assert.match(it.traditionNote.en, /some astrologers differ/);
  for (const r of DOSHAM_RULES.filter((x) => ['kalasarpa', 'naga', 'pitru', 'guruchandala', 'shrapit', 'grahana'].includes(x.kind))) assert.equal(r.disputed, true, r.id);
});

test('unknown birth time: only Moon / planet-based doshams, and the Lagna-based ones are named as needing the time', () => {
  const c = birthChart({ ...OWNER, timePrecision: 'unknown' });
  assert.ok(!c.planets.Lagna);
  const d = diagnoseDoshams(c, { now: NOW });
  assert.equal(d.hasLagna, false);
  for (const it of d.items) assert.equal(it.needsLagna, false, it.kind);
  assert.ok(d.needsTime.length >= 5);
  assert.ok(d.items.some((x) => x.kind === 'sanisevvai'), 'Sani + Sevvai sign conjunction needs no Lagna');
  assert.match(expertView(d).paras.map((p) => p.en).join(' '), /birth time/);
});

test('children (<18): no dosham list — only a general prayer-and-habits note', () => {
  const d = diagnoseDoshams(ownerChart, { now: NOW, minor: true, age: 12 });
  assert.equal(d.items.length, 0);
  const t = flat(expertView(d));
  assert.doesNotMatch(t, /marri|திருமண|குழந்தை பாக்கிய|putra|புத்திர/i);
});

test('Hindu-only (owner decision, Oct 2026): every person gets the parigara sthalams — an old stored faith changes nothing', () => {
  const d = diagnoseDoshams(wifeChart, { now: NOW });
  const rk = d.items.find((x) => x.kind === 'rahuketu');
  const plan = nivarthiPlan(rk);
  assert.ok(plan.sthalams.length >= 1 && plan.yatra.length >= 1 && plan.home.length >= 1);
  // A caller still passing an old faith option gets exactly the same plan (the option is ignored).
  assert.deepEqual(nivarthiPlan(rk, { faith: 'christian', traditional: true }), plan);
  for (const k of ['universal', 'blessing', 'traditional', 'faith']) assert.ok(!(k in plan), `no ${k} field`);
  assert.ok(primarySthalam(d, { faith: 'muslim' })?.sthalam);
  assert.deepEqual(primarySthalam(d, { faith: 'muslim' }), primarySthalam(d));
  assert.match(flat(expertView(d, { faith: 'christian' })), /Kalahasti|காளஹஸ்தி/);
  assert.doesNotMatch(flat(expertView(d)), /own faith|நம்பிக்கைப்படி/);
});

test('every temple the engine names exists, with info; the new sthalams have no invented timings', () => {
  const ids = new Set();
  for (const k of Object.values(PLANET_NIVARTHI)) ids.add(k.temple);
  for (const k of Object.values(DOSHAM_KINDS)) for (const t of k.temples || []) ids.add(t.id);
  for (const id of ids) {
    const t = TEMPLES.find((x) => x.id === id);
    assert.ok(t, `temple ${id}`);
    assert.ok(templeInfo(id), `temple info ${id}`);
    assert.ok(Number.isFinite(t.lat) && Number.isFinite(t.lon) && t.name.ta && t.deity.en);
  }
  for (const id of ['thirukarugavur', 'thirupampuram', 'nagercoil_nagaraja', 'thilatharpanapuri', 'thiruvallur_veeraraghava']) {
    assert.ok(ids.has(id), `${id} is used`);
    assert.equal(templeInfo(id).timings.unknown, true, `${id}: timings not on file → "please check"`);
  }
});

test('prohibited-word scan: every string the engine produces, for the owner charts and 30 random charts', () => {
  for (const c of [ownerChart, wifeChart, ...RANDOM]) {
    const d = diagnoseDoshams(c, { now: NOW });
    {
      const all = allText(d, { name: 'X' });
      assert.deepEqual(findProhibited(all), [], `${c.name}`);
      const text = JSON.stringify(all);
      for (const lang of ['en', 'ta']) {
        const strings = [];
        const walk = (v) => { if (typeof v === 'string') strings.push(v); else if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => (k === 'en' || k === 'ta' ? k === lang && walk(x) : walk(x))); };
        walk(all);
        assert.deepEqual(scanProhibited(strings.join('\n'), ADULT_CLASSES), [], `${c.name} ${lang}`);
      }
      assert.doesNotMatch(text, /\bsevere\b|கடுமை|guarantee(d)? (result|cure)|will never/i);
    }
  }
});

test('rule registry document lists every dosham rule as proposed, awaiting astrologer sign-off', () => {
  const doc = fs.readFileSync(path.join(root, 'docs/RULE-REGISTRY.md'), 'utf8');
  for (const r of DOSHAM_RULES) assert.ok(doc.includes(r.id), r.id);
  const policy = fs.readFileSync(path.join(root, 'docs/AI-SAFETY-POLICY.md'), 'utf8');
  assert.match(policy, /Dosham & remedy framing/);
});

// ---------------------------------------------------------------- Ask Thunai
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'thunai-dosham-'));
fs.copyFileSync(path.join(root, 'public/ask-thunai.js'), path.join(dir, 'ask-thunai.js'));
fs.symlinkSync(path.join(root, 'shared'), path.join(dir, 'shared'), 'dir');
fs.writeFileSync(path.join(dir, 'package.json'), '{"type":"module"}');
const ask = await import(pathToFileURL(path.join(dir, 'ask-thunai.js')).href);
function askAs(member, text, lang = 'ta') {
  const m = { id: member.name, relation: 'self', gender: 'female', ...member };
  const chart = birthChart(birthArgs(m)); const rel = timeReliability(m);
  return ask.askThunai({ text, chart, rel, facts: chartFacts(chart, rel, NOW), life: { memberId: m.id, faith: 'hindu', gender: m.gender }, lang, name: m.name, now: NOW, profile: ageProfile(m, { now: NOW }) });
}
const body = (a) => a.sections.flatMap((s) => s.lines).join('\n');

test('Ask: "rahu dosham parigaram kovil" on the Rahu-in-Lagna chart names Sri Kalahasti, the day and the period', () => {
  const a = askAs(WIFE, 'rahu dosham parigaram kovil');
  assert.equal(a.topic, 'dosham');
  assert.match(body(a), /ஸ்ரீ காளஹஸ்தீஸ்வரர்/);
  assert.match(body(a), /ராகு காலம்/);
  assert.match(body(a), /சாபம் அல்ல/);
  assert.ok(a.actions.some((x) => x.go === 'journey' && x.param.temples.includes('kalahasti')));
  assert.equal(a.meter, null);
});

test('Ask: "kulanthai yen late aaguthu" on the owner pattern names the doshams, Thirukarugavur and the doctor', () => {
  const a = askAs({ ...OWNER, gender: 'male' }, 'kulanthai yen late aaguthu');
  assert.equal(a.topic, 'child');
  const ds = a.sections.find((s) => s.key === 'dosham');
  assert.ok(ds, 'dosham section');
  const t = ds.lines.join('\n');
  assert.match(t, /சனி–செவ்வாய்/);
  assert.match(t, /புத்திர/);
  assert.match(t, /திருக்கருகாவூர்/);
  assert.match(t, /மருத்துவ/);
  assert.match(t, /உத்தரவாதம் அல்ல/);
  assert.deepEqual(findProhibited(a), []);
});

test('Ask: "why is my marriage delayed" on the Rahu-in-Lagna chart names Rahu–Ketu dosham with its sthalam', () => {
  const a = askAs(WIFE, 'Why is my marriage delayed?', 'en');
  const ds = a.sections.find((s) => s.key === 'dosham');
  assert.ok(ds);
  assert.match(ds.lines.join(' '), /Rahu–Ketu \(Sarpa\) dosham/);
  assert.match(ds.lines.join(' '), /Kalahasteeswara/);
  assert.ok(a.actions.some((x) => x.go === 'dosham'));
});
