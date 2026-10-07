// Jathagam health guide (restored Oct 2026 at the owner's request): adults get traditional body areas, period
// outlook, a 12-month map and food tips — always as traditional indications with the doctor line. Minors get only
// general habits; unknown birth time is Moon-based only; other faiths get neutral remedies; no prohibited wording.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { birthChart } from '../shared/astro.js';
import { healthGuide, healthNow, PLANET_SYSTEMS, SIGN_PARTS, BODY_AREAS } from '../shared/health.js';
import { findProhibited, collectStrings } from '../shared/themes.js';
import { scanProhibited } from '../server/policy/answer-validator.js';

const now = new Date('2026-10-07T06:00:00Z');
const place = { lat: 11.0, lon: 76.96, tz: 5.5 };
// Adult woman, Saturn Dasa – Venus Bhukti running on `now` (sanity check of the owner's anecdote, not a tuning target).
const venusAdult = birthChart({ name: 'S', date: '1990-01-10', time: '08:30:00', ...place });
const child = birthChart({ name: 'K', date: '2016-04-12', time: '07:15:00', ...place });
const teen = birthChart({ name: 'T', date: '2009-11-02', time: '18:40:00', ...place });
const noTime = birthChart({ name: 'U', date: '1985-06-21', time: null, timePrecision: 'unknown', ...place });
const approx = birthChart({ name: 'P', date: '1990-01-10', time: '08:30:00', timePrecision: 'approximate', windowMinutes: 90, ...place });
const LATIN = /[A-Za-z]/;
const SECTIONS = ['constitution', 'bodyAreas', 'outlook', 'upcoming', 'months', 'diet', 'routine'];
// The guide's own traditional output (the disclaimer and the vitality line are the refusals and are scanned apart).
const guideText = (h) => SECTIONS.map((k) => h[k]).concat([h.now, h.remedies]);

const FATAL = /cancer|heart attack|stroke|tumou?r|paralys|kidney failure|dementia|\bdeath\b|\bdie\b|lifespan|long life|புற்றுநோய்|மாரடைப்பு|பக்கவாதம்|மரணம்|இறப்பு|ஆயுள்/i;
const CERTAIN = /\byou will (get|have|suffer|develop)\b|(?<!if )\byou have\b|\bdefinitely\b|\bsurely\b|\bcertainly\b|\bguarantee|\bdanger|\bterrible\b|\bfatal\b|நிச்சயம்|உறுதியாக|கண்டிப்பாக|ஆபத்து|கண்டம்|பயம்/i;
const MEDICINE = /\b\d+\s?(mg|ml|tablets?|glasses|cups|grams?|g)\b|\b(tablet|capsule|antibiotic|dose|dosage|prescri)/i;

function adultCharts() {
  const out = [];
  for (let y = 1950; y <= 2004; y += 3) for (const [md, t] of [['01-14', '05:10:00'], ['06-03', '13:45:00'], ['10-22', '21:20:00']]) {
    out.push(birthChart({ name: 'X', date: `${y}-${md}`, time: t, ...place }));
  }
  return out;
}

test('association tables carry their source and cover every planet and sign', () => {
  assert.equal(SIGN_PARTS.length, 12);
  assert.ok(SIGN_PARTS.every((s) => BODY_AREAS[s.area] && /traditional Jyotish association/.test(s.source)));
  assert.equal(SIGN_PARTS[6].area, 'kidneys'); // Thulam (Libra)
  for (const [k, v] of Object.entries(PLANET_SYSTEMS)) {
    assert.ok(v.areas.every((a) => BODY_AREAS[a]), k);
    assert.match(v.source, /traditional Jyotish association/);
  }
  assert.deepEqual(PLANET_SYSTEMS.Venus.areas, ['kidneys', 'reproductive']);
  assert.match(PLANET_SYSTEMS.Venus.en, /urinary/);
  assert.equal(PLANET_SYSTEMS.Moon.areas[0], 'mind');
  assert.equal(PLANET_SYSTEMS.Saturn.areas[0], 'joints');
});

test('adult guide: every section present, dated, and each says traditional indication / not a diagnosis / see a doctor', () => {
  const h = healthGuide(venusAdult, { now, gender: 'female', tz: 5.5 });
  assert.equal(h.minor, false);
  assert.equal(h.title.ta, 'ஜாதக ஆரோக்கிய வழிகாட்டி');
  for (const k of SECTIONS) {
    assert.ok(h[k], k);
    assert.match(h[k].note.en, /not a diagnosis/, k);
    assert.match(h[k].note.en, /doctor/, k);
    assert.match(h[k].note.ta, /நோய் கண்டறிதல் அல்ல/, k);
    assert.match(h[k].note.ta, /மருத்துவ/, k);
  }
  assert.match(h.disclaimer.en, /not a diagnosis/);
  assert.ok(h.constitution.name.en && h.constitution.plain.ta);
  assert.ok(h.bodyAreas.items.length >= 3 && h.bodyAreas.items.every((a) => a.reasons.length && a.tip.ta));
  // Running Dasa + Bhukti with dates, Gochara with end dates, three coming periods with dates.
  const o = h.outlook;
  assert.ok(o.md && o.ad && o.md.start < now && o.ad.end > now);
  assert.match(o.ad.dates.en, /\d{4} – \w+ \d{4}/);
  assert.match(o.ad.dates.ta, /\d{4} – .+ \d{4}/);
  assert.ok(o.gochara.every((g) => g.until instanceof Date && g.until > now && g.untilLabel.ta));
  assert.equal(h.upcoming.items.length, 3);
  assert.ok(h.upcoming.items.every((u, i, a) => u.start > now && (i === 0 || u.start >= a[i - 1].end - 1000) && u.dates.en && u.line.ta));
  assert.equal(h.months.items.length, 12);
  assert.deepEqual(h.months.items.slice(0, 2).map((m) => m.month), ['2026-10', '2026-11']);
  assert.ok(h.months.items.every((m) => BODY_AREAS[m.focus] && m.note.en && m.note.ta && ['care', 'routine'].includes(m.level)));
  // Food: favour and reduce lists, the doctor's-diet and pregnancy lines.
  assert.ok(h.diet.favour.length >= 5 && h.diet.reduce.length >= 3);
  assert.match(h.diet.note.en, /diabetes.*kidney.*heart.*pregnant.*doctor’s diet/);
  assert.match(h.diet.pregnancy.en, /obstetrician/);
  assert.match(h.diet.pregnancy.ta, /மகப்பேறு மருத்துவ/);
  assert.ok(h.routine.daily.length >= 3 && h.routine.yoga.length >= 3);
  assert.ok(h.stage.checklist.length >= 3 && h.stage.checklist.every((c) => c.needsMedicalReview));
});

test('the period wording is the traditional form, never "you will get / you have"', () => {
  const h = healthGuide(venusAdult, { now, tz: 5.5 });
  for (const p of [h.outlook.md, h.outlook.ad, ...h.upcoming.items]) {
    assert.match(p.line.ta, /^தமிழ் மரபில் இந்தக் காலம் .+ பகுதியில் கவனம் தேவை எனக் கூறப்படுகிறது\.$/);
    assert.match(p.line.en, /^In Tamil tradition this period is said to need care for the /);
  }
});

test('Venus period → kidneys / urinary tract named, in the guide and in the one-line "health care now"', () => {
  const h = healthGuide(venusAdult, { now, gender: 'female', tz: 5.5 });
  assert.equal(h.outlook.ad.lord, 'Venus');
  assert.ok(h.outlook.ad.areas.includes('kidneys'));
  assert.match(h.outlook.ad.line.ta, /சிறுநீர/);
  assert.match(h.outlook.ad.line.en, /urinary/);
  assert.ok(h.diet.favour.some((x) => /barley/i.test(x.en)) && h.diet.favour.some((x) => /tender coconut/i.test(x.en)));
  assert.ok(h.diet.reduce.some((x) => /salt/i.test(x.en)));
  const n = healthNow(venusAdult, { age: 36, minor: false }, now, { tz: 5.5 });
  assert.deepEqual(n.areas, ['kidneys']);
  assert.match(n.ta, /சுக்கிர புக்தி/);
  assert.match(n.ta, /தமிழ் மரபில் இந்தக் காலம் சிறுநீரகம், சிறுநீர்ப் பாதை பகுதியில் கவனம் தேவை எனக் கூறப்படுகிறது/);
  assert.match(n.en, /not a diagnosis/);
  assert.equal(n.link, 'health');
  assert.ok(n.until instanceof Date && n.until > now);
  // Every adult chart whose Bhukti lord is Venus names the kidneys / urinary area for that Bhukti.
  let seen = 0;
  for (const c of adultCharts()) {
    const g = healthGuide(c, { now });
    if (g.outlook.ad?.lord === 'Venus') { seen += 1; assert.ok(g.outlook.ad.areas.includes('kidneys')); }
    // A 6th-lord Bhukti whose 6th house is Thulam / Viruchigam names the urinary area too.
    if (g.outlook.ad && !g.needsBirthTime) {
      const six = (c.planets.Lagna.rasi + 5) % 12;
      if ([6, 7].includes(six) && g.outlook.ad.lord === (six === 6 ? 'Venus' : 'Mars')) assert.ok(g.outlook.ad.areas.some((a) => ['kidneys', 'reproductive'].includes(a)));
    }
  }
  assert.ok(seen >= 1);
});

test('minors get only general sleep / play / food habits and growth check-ups — no chart-based body areas', () => {
  for (const c of [child, teen]) {
    const h = healthGuide(c, { now });
    assert.equal(h.minor, true);
    for (const k of [...SECTIONS, 'now']) assert.equal(h[k], null, k);
    assert.ok(h.kidTips.length >= 4 && h.kidTips.every((x) => x.fromAstrology === false));
    assert.match(h.minorNote.en, /no chart-based body readings/);
    assert.ok(h.stage.checklist.length >= 2);
    const all = JSON.stringify({ kid: h.kidTips, stage: h.stage, note: h.minorNote });
    for (const a of Object.values(BODY_AREAS)) assert.ok(!all.includes(a.part.ta + ' பகுதியில்'));
    assert.doesNotMatch(all, /பகுதியில் கவனம் தேவை|said to need care/);
    const n = healthNow(c, null, now);
    assert.deepEqual(n.areas, []);
    assert.equal(n.minor, true);
    assert.match(n.en, /paediatrician/);
  }
  // An explicit age profile wins over the chart (age guard).
  assert.equal(healthGuide(venusAdult, { now, profile: { age: 15, minor: true } }).bodyAreas, null);
});

test('unknown birth time: Moon-based only, no Lagna statements, one note saying Lagna parts need the time', () => {
  const h = healthGuide(noTime, { now });
  assert.equal(h.needsBirthTime, true);
  assert.match(h.birthTimeNote.en, /Lagna-based body areas need the birth time/);
  assert.match(h.birthTimeNote.ta, /பிறந்த நேரம் தேவை/);
  assert.equal(h.constitution.lagnaBased, false);
  assert.match(h.bodyAreas.reference.en, /Moon sign/);
  assert.ok(h.outlook.ad && h.months.items.length === 12);
  const strings = collectStrings({ ...h, birthTimeNote: null, traditionalContext: null });
  const lagna = strings.filter(([, s]) => /lagna|ascendant|லக்ன/i.test(s));
  assert.deepEqual(lagna, []);
  const n = healthNow(noTime, null, now);
  assert.ok(n && n.areas.length === 1 && !/lagna|லக்ன/i.test(n.en + n.ta));
});

test('approximate birth time: Lagna-based items are marked mayChange (stability chip)', () => {
  const h = healthGuide(approx, { now });
  assert.equal(h.lagnaMayChange, true);
  assert.match(h.birthTimeNote.en, /approximate \(±90 min\)/);
  assert.ok(h.bodyAreas.items.some((a) => a.mayChange));
  assert.ok(h.bodyAreas.items.filter((a) => a.mayChange).every((a) => a.reasons.some((r) => r.basis === 'lagna')));
  const exact = healthGuide(venusAdult, { now });
  assert.equal(exact.lagnaMayChange, false);
  assert.ok(exact.bodyAreas.items.every((a) => !a.mayChange));
});

test('faith: Hindu gets deity, temple and mantra; other faiths get neutral prayer, charity and discipline only', () => {
  const hi = healthGuide(venusAdult, { now, faith: 'hindu' });
  assert.ok(hi.remedies.planets.every((p) => p.deity && p.mantra && p.temple));
  assert.ok(hi.remedies.healing.some((x) => /Dhanvantari/.test(x.en)) && hi.remedies.healing.some((x) => /Vaitheeswaran Kovil/.test(x.en)));
  assert.ok(/Tryambakam/.test(hi.remedies.mantra.en) && /த்ர்யம்பகம்/.test(hi.remedies.mantra.ta));
  for (const faith of ['christian', 'muslim', 'none', 'other']) {
    const h = healthGuide(venusAdult, { now, faith });
    assert.equal(h.remedies.mantra, null);
    assert.ok(h.remedies.planets.every((p) => p.deity === null && p.mantra === null && p.temple === null && p.free.en));
    assert.ok(h.remedies.healing.some((x) => /discipline/i.test(x.en)));
    const text = collectStrings({ r: h.remedies, refl: h.reflection, g: guideText(h) }).map(([, x]) => x).join('\n');
    assert.doesNotMatch(text, /Dhanvantari|Kovil|Temple|Om |mantra|Mahalakshmi|Durga|Vinayagar|Shiva|temple|கோவில்|மந்திரம்|ஓம்|தீபம்/, faith);
    // Opt-in shows the Hindu practice marked optional.
    const opt = healthGuide(venusAdult, { now, faith, traditional: true });
    assert.ok(opt.remedies.planets.every((p) => p.traditional?.optional === true));
  }
});

test('no prohibited, fatal, certainty, fear or medicine wording across many adult charts, both languages', () => {
  const charts = [venusAdult, noTime, approx, ...adultCharts()];
  for (const c of charts) {
    for (const faith of ['hindu', 'christian']) {
      const h = healthGuide(c, { now, faith, gender: 'female' });
      assert.deepEqual(findProhibited(h), []);
      const guide = collectStrings(guideText(h)).map(([, s]) => s);
      for (const s of guide) {
        assert.doesNotMatch(s, FATAL, s);
        assert.doesNotMatch(s, CERTAIN, s);
        assert.doesNotMatch(s, MEDICINE, s);
      }
      assert.deepEqual(scanProhibited(collectStrings(h).map(([, s]) => s).join('\n')), []);
      const n = healthNow(c, null, now);
      assert.deepEqual(scanProhibited(`${n.en}\n${n.ta}`), []);
    }
  }
});

test('Tamil and English present everywhere; Tamil strings carry no Latin letters', () => {
  for (const c of [venusAdult, noTime, approx, child]) {
    const h = healthGuide(c, { now, gender: 'female' });
    const pairs = [];
    (function walk(o) {
      if (!o || typeof o !== 'object' || o instanceof Date) return;
      if (typeof o.en === 'string' || typeof o.ta === 'string') pairs.push(o);
      for (const v of Object.values(o)) walk(v);
    }(h));
    assert.ok(pairs.length > 40);
    for (const p of pairs) {
      if (typeof p.en === 'string') assert.ok(p.en && p.ta, JSON.stringify(p).slice(0, 80));
      assert.ok(!LATIN.test(p.ta), p.ta);
    }
  }
});
