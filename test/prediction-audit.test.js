// Prediction audit (docs/PREDICTION-AUDIT.md): every prediction surface run over a matrix of ~80 profiles —
// ages 0–100, male / female, a stored faith of Hindu / Christian / Muslim / Jain / Sikh / other / none (left by older
// versions — ignored since the app is Hindu-only, Oct 2026), exact / approximate / unknown
// birth time, born in India or abroad and living in Chennai / Dubai / London / New York / Singapore, single /
// married / separated-widowed — and checked for the rules the app promises:
//   • age: nothing adult for minors, study tone for teens, no marriage / job push at 60+, milestones at 60/70/80,
//     no lifespan wording, no age-80 horizon cutoff;
//   • Hindu for everyone: every profile, whatever an old stored faith says, gets the same rich Hindu content (deity,
//     mantra, temple, festival practice, closing prayer) — only the age rules change what is shown;
//   • consistency: one running dasa / bhukti and one "supportive or not" verdict on every surface; analysis area
//     levels match the written palan; unknown-time charts are read from the Moon everywhere; residence time zone
//     for daily timings, birth time zone for the chart;
//   • wording: no certainty, fear, verdict, disease / diet / treatment from dasa; Tamil and English both present;
//   • gender: no gendered assumptions in career / money text; bride / groom are மணமகள் / மணமகன்.
// Astronomy is benchmarked separately (docs/ACCURACY-REPORT.md). Astrological predictions themselves cannot be
// verified like astronomy — this audit verifies the calculations feed the rules consistently and safely.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { birthChart, panchang, NAKSHATRAS, RASIS } from '../shared/astro.js';
import { dailyReview, runningDasa, closingPrayer } from '../shared/daily.js';
import { todayPlan } from '../shared/today-plan.js';
import { fullAnalysis, dasaTone } from '../shared/analysis.js';
import { writtenPalan, palanLines, palanFollowups } from '../shared/written-palan.js';
import { lifeRoadmap } from '../shared/roadmap.js';
import { dailyParigaram, remedyFor, NAVAGRAHA } from '../shared/remedies.js';
import { peyarchiPalan, currentPeyarchi, rasiPalanPeriod } from '../shared/peyarchi.js';
import { predictEvent, questionFor, questionFitsAge, habitGuard, QUESTIONS } from '../shared/predict.js';
import { milestones, milestoneNote } from '../shared/special.js';
import { matchPorutham } from '../shared/porutham.js';
import { marriageReport } from '../shared/couple.js';
import { healthGuide } from '../shared/health.js';
import { ageProfile, adultText, topicAllowed, lifeQuestionAllowed, ageGuardAnswer, childGeneralAnswer, isAdult } from '../shared/age-guard.js';
import { locFromPlace } from '../shared/residence.js';
import { REPORT_YEARS } from '../shared/report-horizon.js';
import { collectStrings, findProhibited } from '../shared/themes.js';
import { chartFacts } from '../shared/guidance.js';
import { scanProhibited } from '../server/policy/answer-validator.js';
import { ALWAYS_PROHIBITED } from '../server/policy/safety-policy.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NOW = new Date('2026-10-07T06:00:00Z');
const TODAY = '2026-10-07';
const YEAR = 365.25 * 86400000;
const TA = /[஀-௿]/;

// ------------------------------------------------------------------ the profile matrix
const AGES = [0, 3, 6, 10, 13, 16, 17, 18, 21, 25, 30, 40, 50, 60, 70, 80, 90, 100];
// Values older versions could store on a profile; the app ignores them now (every profile is read the same way).
const OTHER_FAITHS = ['christian', 'muslim', 'jain', 'sikh', 'other', 'none'];
const TIMES = ['exact', 'approx', 'unknown'];
const MARITAL = ['single', 'married', 'other'];
const BIRTH = {
  Chennai: { lat: 13.0827, lon: 80.2707, tz: 5.5 },
  Madurai: { lat: 9.9252, lon: 78.1198, tz: 5.5 },
  London: { lat: 51.5074, lon: -0.1278, zone: 'Europe/London' },
};
const RESIDENCE = {
  Chennai: locFromPlace({ lat: 13.0827, lon: 80.2707, zone: 'Asia/Kolkata' }),
  Dubai: locFromPlace({ lat: 25.2048, lon: 55.2708, zone: 'Asia/Dubai' }),
  London: locFromPlace({ lat: 51.5074, lon: -0.1278, zone: 'Europe/London' }),
  'New York': locFromPlace({ lat: 40.7128, lon: -74.006, zone: 'America/New_York' }),
  Singapore: locFromPlace({ lat: 1.3521, lon: 103.8198, zone: 'Asia/Singapore' }),
};
const RES_NAMES = Object.keys(RESIDENCE);

function makeProfile(i, age, v, extra = {}) {
  const minor = age < 18;
  const a = Math.max(0, AGES.indexOf(age));
  return {
    id: `P${String(i + 1).padStart(2, '0')}`,
    age, date: `${2026 - age}-${age === 0 ? '03' : '05'}-14`,
    gender: i % 2 ? 'female' : 'male',
    faith: v === 0 ? 'hindu' : OTHER_FAITHS[(a + v) % OTHER_FAITHS.length],
    time: TIMES[(a + v) % 3],
    birth: 'Chennai',
    residence: RES_NAMES[i % RES_NAMES.length],
    marital: minor ? 'single' : MARITAL[(a + v) % 3],
    ...extra,
  };
}
const PROFILES = [];
AGES.forEach((age, a) => { for (let v = 0; v < 4; v++) PROFILES.push(makeProfile(a * 4 + v, age, v)); });
// Extra edge profiles: born abroad, widowed elders who chose remarriage, unknown time abroad, a Jain teen, a Sikh elder.
PROFILES.push(
  makeProfile(72, 30, 0, { birth: 'London', residence: 'Chennai', time: 'exact' }),
  makeProfile(73, 40, 1, { birth: 'London', residence: 'London', time: 'approx', faith: 'christian' }),
  makeProfile(74, 62, 0, { marital: 'other', remarriage: true, time: 'exact' }),
  makeProfile(75, 70, 1, { marital: 'other', remarriage: true, faith: 'muslim', time: 'exact' }),
  makeProfile(76, 25, 2, { residence: 'New York', time: 'unknown', faith: 'none' }),
  makeProfile(77, 16, 3, { faith: 'jain', residence: 'Singapore' }),
  makeProfile(78, 80, 2, { faith: 'sikh', birth: 'Madurai', residence: 'Dubai' }),
  makeProfile(79, 59, 0, { birth: 'Madurai', time: 'exact' }),
);

const TIME_OF = { exact: '06:30:00', approx: '14:10:00', unknown: null };
function chartFor(p) {
  const b = BIRTH[p.birth];
  return birthChart({ name: p.id, date: p.date, time: TIME_OF[p.time], lat: b.lat, lon: b.lon, tz: b.tz, zone: b.zone, place: p.birth,
    timePrecision: p.time === 'approx' ? 'approximate' : p.time === 'unknown' ? 'unknown' : 'exact', windowMinutes: p.time === 'approx' ? 60 : undefined });
}

// One residence snapshot per city (daily timings come from where the person LIVES).
const SNAP = Object.fromEntries(RES_NAMES.map((n) => [n, panchang(NOW, RESIDENCE[n].lat, RESIDENCE[n].lon, RESIDENCE[n].tz)]));
const PEY = currentPeyarchi(NOW);
const FESTIVALS = [{ en: 'Sashti', ta: 'சஷ்டி' }, { en: 'Pradosham', ta: 'பிரதோஷம்' }, { en: 'Ekadasi', ta: 'ஏகாதசி' }];

// ------------------------------------------------------------------ run every surface once per profile
const RUNS = PROFILES.map((p) => {
  const c = chartFor(p);
  const prof = ageProfile(p.date, { today: TODAY });
  const snap = SNAP[p.residence];
  const opts = { faith: p.faith };
  const analysis = fullAnalysis(c, NOW, { faith: p.faith, age: prof.age });
  const palan = writtenPalan(c, { now: NOW, profile: prof, analysis, tz: RESIDENCE[p.residence].tz, maritalStatus: p.marital, faith: p.faith, remarriage: !!p.remarriage });
  const daily = dailyReview(c, snap, NOW, opts);
  const today = todayPlan({ chart: c, snap, festivals: FESTIVALS, level: daily.level, now: NOW, faith: p.faith, age: prof.age });
  const roadmap = lifeRoadmap(c, { from: NOW, years: REPORT_YEARS.roadmap, faith: p.faith, maritalStatus: p.marital });
  const parigaram = dailyParigaram({ weekday: snap.weekday.index, chart: c, snapshot: snap, faith: p.faith, profile: prof, now: NOW });
  const peyarchi = ['Jupiter', 'Saturn', 'Rahu', 'Ketu'].map((k) => peyarchiPalan(k, PEY[k].rasi, c.janmaRasi.index, opts));
  const health = healthGuide(c, { now: NOW, gender: p.gender, faith: p.faith });
  const life = prof.adult ? ['career', 'house', 'marriage'].map((id) => predictEvent(c, id, { from: NOW, years: REPORT_YEARS.life, faith: p.faith })) : [];
  const habits = habitGuard(c, opts);
  return { p, c, prof, snap, analysis, palan, daily, today, roadmap, parigaram, peyarchi, health, life, habits };
});

const strs = (v) => collectStrings(v).map(([, s]) => s);
const bothLangs = (x) => x && typeof x.en === 'string' && typeof x.ta === 'string' && x.en.length > 0 && TA.test(x.ta) && !TA.test(x.en);
/** The text a person actually reads on each prediction surface (data-only fields such as colours are left out). */
function readable(r) {
  const d = r.daily;
  return {
    today: [d.why, d.dos, d.donts, d.prayer, d.practice, d.blessing, d.label, r.today],
    analysis: [r.analysis.dasaOutlook && { en: r.analysis.dasaOutlook.en, ta: r.analysis.dasaOutlook.ta }, r.analysis.transit.status.map((s) => [s.en, s.ta, s.adviceEn, s.adviceTa])],
    palan: [palanLines(r.palan), palanFollowups(r.palan, { maritalStatus: r.p.marital })],
    roadmap: [r.roadmap.now, r.roadmap.stage, r.roadmap.nextStage, r.roadmap.areas.map((a) => [a.en, a.ta]), r.roadmap.periods.map((x) => [x.notes, x.remedy.free]), r.roadmap.milestones.map((m) => m.name)],
    parigaram: r.parigaram.map((i) => [i.reason, i.free, i.charity, i.governs, i.deity, i.temple, i.mantra]),
    peyarchi: r.peyarchi.map((x) => [x.text, x.remedy, x.special]),
    life: r.life.map((x) => [x.remedy, x.karakaRemedies.map((k) => [k.free, k.deity, k.mantra]), x.windows.map((w) => w.reasons)]),
    habits: [r.habits.notes, r.habits.support],
  };
}

const HINDU_ONLY = /\b(temples?|kovil|homam|puja|pooja|abhishekam|archana[i]?|mantra|viratham|fasting|fast till|Om [A-Z]\w+|Namah|Namaha|Shiva|Siva|Murugan|Vinayagar|Ganapat\w*|Perumal|Vishnu|Narayana|Durga|Ambal|Parvathi|Lakshmi|Saraswathi|Anjane\w*|Hanuman|Dakshinamurthy|Saneeswar\w*|Sani Bhagavan|Venkat\w*|Dhanvantari|Ayyanar|Mariamman|arghyam|tharpanam|girivalam|bilva|tulasi|arugampul|Kanda Sashti|Sahasranamam|Aditya Hrudayam|Navagraha|sesame-oil lamp|ghee lamp|ellu)\b|கோவில்|ஹோம|பூஜை|அபிஷேக|அர்ச்சனை|மந்திர|விரத|ஓம்|சிவன்|சிவபெருமான்|சிவனுக்|முருக|விநாயக|பெருமாள்|விஷ்ணு|நாராயண|துர்க|அம்பாள்|லட்சுமி|சரஸ்வதி|ஆஞ்சநேய|தட்சிணாமூர்த்தி|சனி பகவான்|சனீஸ்வர|வெங்கட|தர்ப்பண|கிரிவல|வில்வ|துளசி|அருகம்புல்|நல்லெண்ணெய் தீபம்|நெய் தீபம்/i;
const CERTAINTY = /\b(100 ?%|will surely|definitely will|certainly will|without fail|is certain to|guaranteed (?!dates)\w+)|நிச்சயம் (நடக்கும்|கைகூடும்|கிடைக்கும்)|100 ?சதவீத/i;
const FEAR = /\b(curse[sd]?|doom\w*|disaster|terrible|evil eye|bad luck|misfortune|ruin\w*|danger\w*|deadly|fatal)\b|சாபம்|அழிவு|துரதிர்ஷ்ட|கண்டம்|ஆபத்தான காலம்/i;
const LIFESPAN = /\b(lifespan|life span|longevity|short life|long life|untimely|will die|death)\b|ஆயுள்(?! காப்பீடு)|மரணம்|இறப்பு/i;
const DASA_HEALTH = /\b(diet|disease|illness|surgery|medicines?|medication|treatment|cure[sd]?|teeth|kidney|liver|cancer|diabetes|blood pressure|heart attack)\b|நோய்|உணவு முறை|சிகிச்சை|மருந்து|பல் நல/i;
const GENDERED = /\b(he|him|his|she|her|hers|businessman|businesswoman|breadwinner|housewife|homemaker|man of the house)\b/i;
const MARRY_PUSH = /\b(marriage|marry|wedding|bride|groom|alliance|get a job|new job|job change)\b|திருமண|கல்யாண|மணமக|வரன்|வேலை கிடைக்க|வேலை மாற்ற/i;

// ------------------------------------------------------------------ the matrix itself
test('profile matrix: ~80 profiles cover every age, gender, faith, birth-time, residence and marital case', () => {
  assert.ok(PROFILES.length >= 78 && PROFILES.length <= 84, `profiles: ${PROFILES.length}`);
  for (const a of AGES) assert.ok(PROFILES.some((p) => p.age === a), `age ${a}`);
  for (const g of ['male', 'female']) assert.ok(PROFILES.some((p) => p.gender === g));
  for (const f of ['hindu', ...OTHER_FAITHS]) assert.ok(PROFILES.some((p) => p.faith === f), `faith ${f}`);
  for (const t of TIMES) assert.ok(PROFILES.some((p) => p.time === t), `time ${t}`);
  for (const r of RES_NAMES) assert.ok(PROFILES.some((p) => p.residence === r), `residence ${r}`);
  for (const m of MARITAL) assert.ok(PROFILES.some((p) => p.marital === m), `marital ${m}`);
  assert.ok(PROFILES.every((p) => MARITAL.includes(p.marital) && p.faith && TIMES.includes(p.time)), 'every profile fully specified');
  assert.ok(PROFILES.some((p) => p.birth === 'London'), 'born abroad');
  // Every age has a profile with an old non-Hindu stored faith, so "the stored faith is ignored" is checked at every age.
  for (const a of AGES) assert.ok(PROFILES.some((p) => p.age === a && p.faith === 'hindu') && PROFILES.some((p) => p.age === a && p.faith !== 'hindu'), `age ${a} both faiths`);
  for (const r of RUNS) assert.equal(r.prof.age, r.p.age, `${r.p.id} calendar age`);
});

// ------------------------------------------------------------------ AGE
test('age: minors (0–17) never get marriage, job, money, children, property or romantic content on any surface', () => {
  for (const r of RUNS.filter((x) => x.prof.minor)) {
    const R = readable(r);
    for (const [surface, v] of Object.entries(R)) {
      if (surface === 'life' || surface === 'peyarchi') continue; // life questions are blocked for minors; peyarchi is filtered on screen (kidView)
      for (const s of strs(v)) assert.ok(!adultText(s), `${r.p.id} age ${r.p.age} ${surface}: "${s}"`);
    }
    assert.equal(r.palan.mode, 'minor');
    assert.deepEqual(palanFollowups(r.palan), []);
    assert.ok(r.roadmap.minor && r.roadmap.areas.every((a) => ['learning', 'family', 'health'].includes(a.id)), `${r.p.id} child road-map areas`);
    assert.ok(r.roadmap.milestones.every((m) => m.id === 'education'), `${r.p.id} only study milestones`);
    for (const t of ['marriage', 'job', 'money', 'property', 'child', 'love', 'porutham', 'business']) assert.equal(topicAllowed(t, r.prof), false, `${r.p.id} ${t}`);
    for (const id of ['marriage', 'partner', 'job', 'house', 'child', 'business']) assert.equal(lifeQuestionAllowed(id, r.prof), false, `${r.p.id} life question ${id}`);
    assert.equal(isAdult(r.p.date, { today: TODAY }), false, 'never offered for matching');
    // Health guide for a child: general habits only — no organ / body-area or food-restriction reading.
    // (shared/health.js is being rebuilt separately; these are the owner's minor rules for whatever it returns.)
    for (const k of ['bodyAreas', 'diet', 'outlook', 'months', 'upcoming']) assert.ok(r.health[k] == null, `${r.p.id} child health has no ${k}`);
    for (const s of strs([r.health.wellbeing, r.health.kidTips, r.health.minorNote])) {
      assert.doesNotMatch(s, /kidney|liver|urinary|stomach|heart|lungs|reproductive|foods? to avoid|avoid (eating|food)|சிறுநீர|கல்லீரல்|இதய|தவிர்க்க வேண்டிய உணவு/i, `${r.p.id} child health: "${s}"`);
    }
  }
});

test('age: 0–5 is caregiver-directed, 6–12 school, 13–17 study and career-guidance tone', () => {
  for (const r of RUNS.filter((x) => x.prof.minor)) {
    const dos = r.daily.dos.map((x) => x.en).join(' | ');
    if (r.prof.band === '0-5') {
      assert.match(dos, /little one|story|song/i, `${r.p.id} caregiver day`);
      assert.equal(r.roadmap.stage.id, 'early');
    } else {
      assert.match(dos, /lesson|study|learn|maths|writing|teacher|read|friend|hobby|home|play/i, `${r.p.id} study day: ${dos}`);
      assert.equal(r.roadmap.stage.id, r.prof.band === '6-12' ? 'school' : 'teen');
    }
    if (r.prof.band === '13-17') {
      assert.ok(r.roadmap.stage.goals.some((g) => /exam|study/i.test(g.en)), 'teen goals: exams and study choice');
      assert.ok(r.roadmap.stage.goals.some((g) => /interests and strengths/i.test(g.en)), 'teen goals: aptitude, not job timing');
      assert.equal(topicAllowed('compass', r.prof), true, 'career compass (aptitude) is open to teens');
      assert.equal(topicAllowed('job', r.prof), false, 'job timing is not');
    }
  }
});

test('age: 60+ get family / purpose wording — no marriage or job push unless a remarriage context was chosen', () => {
  for (const r of RUNS.filter((x) => x.p.age >= 60)) {
    const choseRemarriage = !!r.p.remarriage;
    const ups = palanFollowups(r.palan, { maritalStatus: r.p.marital });
    const areaTitles = r.palan.sections.find((s) => s.id === 'areas').items.map((i) => i.title.en);
    if (choseRemarriage) {
      assert.ok(areaTitles.includes('Marriage & family life'), `${r.p.id} remarriage context keeps the marriage reading`);
      continue;
    }
    assert.ok(r.palan.senior, `${r.p.id} senior palan`);
    for (const q of ups) assert.doesNotMatch(q.en, MARRY_PUSH, `${r.p.id} follow-up: ${q.en}`);
    assert.ok(areaTitles.includes('Family life') && areaTitles.includes('Work & purpose') && !areaTitles.some((t) => /marriage|career/i.test(t)), `${r.p.id} ${areaTitles}`);
    for (const it of r.palan.sections.find((s) => s.id === 'areas').items) for (const l of it.lines) assert.doesNotMatch(l.en, /marriage efforts|career growth/i, `${r.p.id} ${l.en}`);
    assert.ok(r.roadmap.senior && r.roadmap.areas.every((a) => !/marriage/i.test(a.en)), `${r.p.id} road-map area labels`);
    assert.ok(r.roadmap.milestones.every((m) => m.id === 'house'), `${r.p.id} no marriage / job / child windows`);
    for (const s of strs([r.roadmap.now, r.roadmap.stage])) assert.doesNotMatch(s, MARRY_PUSH, `${r.p.id} road map: ${s}`);
    for (const st of r.analysis.transit.status) assert.doesNotMatch(st.adviceEn, /marriage|children/i, `${r.p.id} transit advice: ${st.adviceEn}`);
    for (const id of ['marriage', 'partner', 'child', 'job']) assert.equal(questionFitsAge(QUESTIONS.find((q) => q.id === id), r.p.age), false, `${r.p.id} ${id} not offered at ${r.p.age}`);
  }
});

test('age: Shashtiabdapoorthi at 60, Bheemaratha Shanti at 70, Sathabhishekam at 80 — on the star day in the birth month', () => {
  const sample = [59, 60, 70, 80].map((a) => RUNS.find((x) => x.p.age === a));
  assert.equal(sample.length, 4);
  for (const r of sample) {
    const by = Number(r.p.date.slice(0, 4));
    const ms = milestones(r.c, RESIDENCE[r.p.residence], NOW);
    const want = { shashti: 60, bheemaratha: 70, sathabhishekam: 80 };
    assert.deepEqual(ms.map((m) => m.id), Object.keys(want));
    for (const m of ms) {
      assert.equal(m.years, want[m.id]);
      assert.ok(m.day, `${r.p.id} ${m.id} has a date`);
      const y = Number(m.day.date.slice(0, 4));
      assert.ok(y === by + m.years || y === by + m.years + 1, `${r.p.id} ${m.id} ${m.day.date} (born ${by})`);
      assert.equal(m.past, m.day.date < TODAY);
    }
    const moon1000 = ms.find((m) => m.id === 'sathabhishekam').thousandthFullMoon;
    const yrs = (moon1000 - r.c.utc) / YEAR;
    assert.ok(yrs > 80.7 && yrs < 81.0, `1000th full moon at ${yrs.toFixed(2)} years`);
    for (const s of strs(ms.map((m) => [m.name, m.basis]))) assert.doesNotMatch(s, LIFESPAN, s);
  }
});

test('age: no lifespan or death prediction at any age, and no age-80 horizon cutoff', () => {
  for (const r of RUNS) {
    for (const [surface, v] of Object.entries(readable(r))) for (const s of strs(v)) assert.doesNotMatch(s, LIFESPAN, `${r.p.id} ${surface}: "${s}"`);
    assert.equal(r.health.vitality.level, 'not-assessed');
    assert.equal(r.health.flags.lifespanInference, false);
    // Horizons come from shared/report-horizon.js and never stop at an age.
    assert.equal(r.roadmap.horizonYears, REPORT_YEARS.roadmap);
    assert.equal(r.roadmap.years.length, REPORT_YEARS.roadmap, `${r.p.id} age ${r.p.age}: every year of the road map is listed`);
    assert.ok(Math.abs((r.roadmap.horizon - NOW) / YEAR - REPORT_YEARS.roadmap) < 0.01);
    assert.equal(r.palan.years, REPORT_YEARS.analysis);
    assert.match(r.palan.horizon.en, new RegExp(`next ${REPORT_YEARS.analysis} years`));
  }
  const oldest = RUNS.filter((r) => r.p.age >= 80);
  assert.ok(oldest.length >= 8);
  for (const r of oldest) assert.ok(r.roadmap.years.at(-1).age >= r.p.age + REPORT_YEARS.roadmap - 1, `${r.p.id}: years past 80+ are read`);
});

// ------------------------------------------------------------------ HINDU FOR EVERYONE (owner decision, Oct 2026)
// "Thunai is a complete Hindu-based astrology app — fully Hindu for everyone." A faith stored by an older version is
// ignored: every profile gets the same Hindu content; only the AGE rules change what a person sees.
test('Hindu-only: a profile stored with another faith gets exactly the content of the same profile with no faith', () => {
  const legacy = RUNS.filter((r) => r.p.faith !== 'hindu');
  assert.ok(legacy.length >= 50);
  for (const r of legacy) {
    const { c, prof, snap, p } = r;
    assert.deepEqual(r.parigaram, dailyParigaram({ weekday: snap.weekday.index, chart: c, snapshot: snap, profile: prof, now: NOW }), `${p.id} parigaram`);
    assert.deepEqual(r.today, todayPlan({ chart: c, snap, festivals: FESTIVALS, level: r.daily.level, now: NOW, age: prof.age }), `${p.id} today plan`);
    assert.deepEqual(r.peyarchi, ['Jupiter', 'Saturn', 'Rahu', 'Ketu'].map((k) => peyarchiPalan(k, PEY[k].rasi, c.janmaRasi.index)), `${p.id} peyarchi`);
    assert.deepEqual(r.daily, dailyReview(c, snap, NOW), `${p.id} daily`);
    if (r.life.length) assert.deepEqual(r.life[0].remedy, predictEvent(c, 'career', { from: NOW, years: REPORT_YEARS.life }).remedy, `${p.id} life remedy`);
  }
});

test('Hindu-only: every profile keeps rich traditional content — deity, mantra, temple, festival practice, ceremony', () => {
  for (const r of RUNS) {
    for (const i of r.parigaram) {
      assert.ok(i.deity?.en && i.mantra?.en && i.temple?.en && i.free?.en, `${r.p.id} full Navagraha entry`);
      assert.ok(!('traditional' in i) && !('faith' in i), `${r.p.id}: no "optional, for information only" fold`);
    }
    assert.ok(r.today.items.some((it) => /Murugan|Kanda Sashti|Shiva|Perumal|Vishnu/.test(it.text.en + it.title.en)), `${r.p.id} festival practice`);
    if (r.daily.dasaDeity) assert.ok(r.daily.prayer?.lines?.length, `${r.p.id} closing prayer`);
    assert.ok(!('blessing' in r.daily) && !('practice' in r.daily), `${r.p.id}: no other-faith blessing`);
    for (const x of r.peyarchi) assert.match(x.remedy.en, HINDU_ONLY, `${r.p.id} traditional peyarchi parigaram`);
    for (const per of r.roadmap.periods) assert.ok(per.remedy.deity?.en, `${r.p.id} road-map period deity`);
    for (const l of r.life) assert.match(l.remedy.en, HINDU_ONLY, `${r.p.id} life-question parigaram`);
    if (r.prof.adult && r.health.reflection) assert.ok(r.health.reflection.mantra && r.health.reflection.practices.every((x) => x.deity?.en), `${r.p.id} health remedies`);
    for (const s of strs(readable(r))) assert.doesNotMatch(s, /own faith|every faith|God bless|Allah|நம்பிக்கைப்படி|எல்லா நம்பிக்கை|கர்த்தர்/i, `${r.p.id}: "${s}"`);
  }
  assert.match(milestoneNote().en, /Thirukadaiyur/);
});

test('Hindu-only: children still get child-appropriate prayers — the age rules are unchanged', () => {
  const kids = RUNS.filter((r) => r.prof.minor);
  assert.ok(kids.length >= 20);
  for (const r of kids) {
    const g = ageGuardAnswer({ topic: 'marriage', profile: r.prof, lang: 'en', faith: r.p.faith });
    assert.deepEqual(g, ageGuardAnswer({ topic: 'marriage', profile: r.prof, lang: 'en' }), `${r.p.id}: the faith option is ignored`);
    if (r.prof.band !== 'unknown') assert.ok(g.sections.some((s) => s.key === 'prayer'), `${r.p.id} child prayer`);
    for (const i of r.parigaram) assert.ok(!adultText(i.free), `${r.p.id}: child-safe practice "${i.free.en}"`);
  }
});

test('fasting is never required — children, elders and anyone unwell are told it is optional', () => {
  for (const r of RUNS) {
    const fastLines = r.today.items.filter((it) => /fast|viratham|food/i.test(it.text.en));
    for (const it of fastLines) {
      if (r.p.age < 14) assert.match(it.text.en, /children need not fast/);
      else if (r.p.age >= 60) assert.match(it.text.en, /fast only if your health allows/);
      else assert.match(it.text.en, /Fasting is optional/);
    }
  }
});

// ------------------------------------------------------------------ CONSISTENCY
test('consistency: one running dasa / bhukti and the same dates on Today, analysis, written palan, road map, health and Ask context', () => {
  for (const r of RUNS) {
    const { md, ad } = runningDasa(r.c, NOW);
    assert.ok(md && ad, `${r.p.id} running periods`);
    assert.equal(r.analysis.dasaOutlook.lord, md.lord, `${r.p.id} analysis`);
    assert.equal(+new Date(r.analysis.dasaOutlook.until), +new Date(md.end));
    assert.equal(r.palan.running.md, md.lord, `${r.p.id} palan`);
    assert.equal(r.palan.running.ad, ad.lord);
    assert.equal(+r.palan.running.adEnd, +new Date(ad.end));
    assert.equal(r.roadmap.current.md, md.lord, `${r.p.id} road map`);
    assert.equal(r.roadmap.current.ad, ad.lord);
    assert.equal(+r.roadmap.current.end, Math.min(+new Date(ad.end), +r.roadmap.horizon));
    assert.equal(r.daily.dasaDeity.planet, md.lord, `${r.p.id} Today`);
    const hp = r.health.period || r.health.reflection?.period;
    if (hp?.md) { assert.equal(hp.md.lord, md.lord, `${r.p.id} health`); assert.equal(hp.ad.lord, ad.lord); }
    if (r.today.horai) assert.ok([md.lord, ad.lord].includes(r.today.horai.planet), `${r.p.id} Today horai planet`);
    const cp = closingPrayer(r.c, NOW);
    assert.deepEqual(cp.deities, [...new Set([md.lord, ad.lord])]);
    // The palan's "now" sentence names the same years as the dasa table.
    const nowLine = r.palan.sections.find((s) => s.id === 'now').lines[0].en;
    assert.match(nowLine, new RegExp(`${md.lord} Maha Dasa \\(${new Date(md.start).getUTCFullYear()}`), `${r.p.id}: ${nowLine}`);
    // Ask Thunai context (shared/guidance.js) reads the same Maha Dasa for the same moment.
    const f = chartFacts(r.c, { lagna: !!r.c.planets.Lagna }, new Date());
    if (f?.dasa) assert.equal(f.dasa.lord, runningDasa(r.c, new Date()).md.lord, `${r.p.id} Ask context dasa`);
  }
});

test('consistency: a Maha Dasa is never "supportive" on one surface and "difficult" on another', () => {
  for (const r of RUNS.filter((x) => x.prof.adult)) {
    const { md } = runningDasa(r.c, NOW);
    const good = dasaTone(r.c, md.lord).good;
    assert.equal(r.analysis.dasaOutlook.tone, good ? 'favourable' : 'growth through effort', `${r.p.id} analysis tone`);
    assert.equal(/A supportive period/.test(r.analysis.dasaOutlook.en), good);
    const nowText = r.palan.sections.find((s) => s.id === 'now').lines.map((l) => l.en).join(' ');
    assert.equal(/is well placed for you — a supportive period/.test(nowText), good, `${r.p.id} palan tone: ${nowText}`);
    assert.equal(/rewards patience and steady effort/.test(nowText), !good);
    for (const per of r.roadmap.periods) {
      const g = dasaTone(r.c, per.md).good;
      if (g) assert.notEqual(per.level, 'care', `${r.p.id} ${per.md}/${per.ad}: supportive dasa shown as "care"`);
      else assert.notEqual(per.level, 'good', `${r.p.id} ${per.md}/${per.ad}: effort dasa shown as "good"`);
    }
  }
});

test('consistency: life-area levels match between the analysis card and the written palan', () => {
  const PROMISE = { strong: /good support here/, steady: /steady foundation here/, 'needs care': /patience and planning/ };
  let checked = 0;
  for (const r of RUNS.filter((x) => x.prof.adult && x.c.planets.Lagna)) {
    const items = r.palan.sections.find((s) => s.id === 'areas').items;
    for (const a of r.analysis.areas) {
      const it = items.find((i) => i.id === a.id);
      if (!it) continue;
      assert.match(it.lines[0].en, PROMISE[a.level], `${r.p.id} ${a.id}: analysis "${a.level}" vs palan "${it.lines[0].en}"`);
      checked++;
    }
  }
  assert.ok(checked > 200, `checked ${checked}`);
});

test('consistency: unknown birth time — Moon-based reading everywhere, same star and rasi on every surface', () => {
  const unknown = RUNS.filter((r) => r.p.time === 'unknown');
  assert.ok(unknown.length >= 20);
  for (const r of unknown) {
    assert.equal(r.c.planets.Lagna, undefined);
    assert.equal(r.analysis.areas.length, 0, 'house-based areas need the birth time');
    assert.equal(r.palan.moonOnly, true);
    assert.equal(r.roadmap.needsBirthTime, true);
    const who = r.palan.sections.find((s) => s.id === 'who').lines.map((l) => l.en).join(' ');
    assert.ok(who.includes(NAKSHATRAS[r.c.janmaNakshatra.index].en) && who.includes(RASIS[r.c.janmaRasi.index].en), `${r.p.id} who: ${who}`);
    assert.match(who, /need the birth time/);
    assert.ok(!/Lagna person/.test(who));
    // Today's tara / chandra balam are counted from the same birth star and rasi.
    assert.match(r.daily.why.map((w) => w.en).join(' '), new RegExp(RASIS[r.c.janmaRasi.index].en + '|Moon in the|tara', 'i'));
    // The same date with a known time gives the same star whenever the stability check says the star is stable.
    if (r.c.stability?.items?.moonNakshatra?.stable) {
      const exact = birthChart({ name: 'x', date: r.p.date, time: '12:00:00', lat: BIRTH[r.p.birth].lat, lon: BIRTH[r.p.birth].lon, tz: BIRTH[r.p.birth].tz, zone: BIRTH[r.p.birth].zone });
      assert.equal(exact.janmaNakshatra.index, r.c.janmaNakshatra.index);
    }
  }
});

test('consistency: residence time zone for daily timings, birth time zone for the chart', () => {
  for (const r of RUNS) {
    const b = BIRTH[r.p.birth];
    // The chart keeps the BIRTH zone no matter where the person lives now.
    if (b.tz != null) assert.equal(r.c.tz, b.tz, `${r.p.id} chart tz`);
    else assert.equal(r.c.zone, b.zone);
    // Rahu Kalam etc. are computed for the RESIDENCE: inside that place's own sunrise–sunset.
    const s = r.snap;
    assert.ok(s.rahuKalam.start >= s.sunrise && s.rahuKalam.end <= s.sunset, `${r.p.id} Rahu Kalam inside the residence day`);
    const localHour = (new Date(s.sunrise).getUTCHours() + RESIDENCE[r.p.residence].tz + 24) % 24;
    assert.ok(localHour >= 4 && localHour <= 9, `${r.p.id} sunrise at ${localHour}h local in ${r.p.residence}`);
  }
  // Same person, different residence → different Rahu Kalam instants; same chart.
  const dubai = SNAP.Dubai.rahuKalam.start, ny = SNAP['New York'].rahuKalam.start;
  assert.notEqual(+dubai, +ny);
});

// ------------------------------------------------------------------ WORDING
test('wording: no certainty, fear, verdict or prohibited claims; no disease / diet / treatment read from a dasa', () => {
  let n = 0;
  for (const r of RUNS) {
    const R = readable(r);
    for (const [surface, v] of Object.entries(R)) {
      for (const s of strs(v)) {
        n++;
        assert.doesNotMatch(s, CERTAINTY, `${r.p.id} ${surface} certainty: "${s}"`);
        assert.doesNotMatch(s, FEAR, `${r.p.id} ${surface} fear: "${s}"`);
        const hits = scanProhibited(s, ALWAYS_PROHIBITED);
        assert.equal(hits.length, 0, `${r.p.id} ${surface} ${JSON.stringify(hits)}: "${s}"`);
        if (surface !== 'today') assert.doesNotMatch(s, DASA_HEALTH, `${r.p.id} ${surface} health from dasa: "${s}"`);
      }
      assert.deepEqual(findProhibited(v), [], `${r.p.id} ${surface}`);
    }
    // Health guide (rebuilt separately): it may name traditional body areas / foods, but never certainty,
    // a diagnosis, a lifespan or a treatment instruction.
    for (const s of strs([r.health.wellbeing, r.health.reflection, r.health.disclaimer])) {
      assert.equal(scanProhibited(s, ['death_lifespan_prediction', 'guaranteed_outcome']).length, 0, `${r.p.id} health: "${s}"`);
      assert.doesNotMatch(s, /\byou will (get|develop|suffer)\b|\b(cancer|tumou?r|heart attack|stroke|kidney failure)\b|\b(take|start|stop) (this )?(medicine|tablet|medication)\b/i, `${r.p.id} health: "${s}"`);
    }
  }
  assert.ok(n > 20000, `strings checked: ${n}`);
  // Peyarchi and rasi palan for every rasi × house: the classical texts after the wording fixes.
  for (let moon = 0; moon < 12; moon++) for (const k of ['Jupiter', 'Saturn', 'Rahu', 'Ketu']) for (let t = 0; t < 12; t++) {
    for (const s of strs(peyarchiPalan(k, t, moon))) {
      assert.doesNotMatch(s, CERTAINTY, s);
      assert.doesNotMatch(s, DASA_HEALTH, s);
      assert.equal(scanProhibited(s, ALWAYS_PROHIBITED).length, 0, s);
    }
  }
  for (const s of strs(rasiPalanPeriod(4, NOW, 'week', { tz: 5.5 }))) { assert.doesNotMatch(s, DASA_HEALTH, s); assert.doesNotMatch(s, CERTAINTY, s); }
});

test('wording: Tamil and English are both present on every surface line', () => {
  const pairs = (v, out = []) => {
    if (!v || typeof v !== 'object' || v instanceof Date) return out;
    if (Array.isArray(v)) { v.forEach((x) => pairs(x, out)); return out; }
    if (typeof v.en === 'string' && typeof v.ta === 'string') out.push(v);
    for (const x of Object.values(v)) pairs(x, out);
    return out;
  };
  for (const r of RUNS) {
    const R = readable(r);
    for (const [surface, v] of Object.entries(R)) {
      for (const x of pairs(v)) {
        assert.ok(x.en.trim().length > 0, `${r.p.id} ${surface} empty English`);
        assert.match(x.ta, TA, `${r.p.id} ${surface} Tamil missing for "${x.en}"`);
      }
    }
    for (const l of palanLines(r.palan)) assert.ok(bothLangs(l), `${r.p.id} palan: ${JSON.stringify(l)}`);
    for (const d of [...r.daily.dos, ...r.daily.donts, ...r.daily.why]) assert.ok(bothLangs(d), `${r.p.id} daily: ${JSON.stringify(d)}`);
    for (const l of r.roadmap.now) assert.ok(bothLangs(l), `${r.p.id} road map: ${JSON.stringify(l)}`);
  }
});

// ------------------------------------------------------------------ GENDER
test('gender: career and money text carries no gendered assumption; the same chart reads the same for a man or a woman', () => {
  for (const r of RUNS.filter((x) => x.prof.adult)) {
    const items = r.palan.sections.find((s) => s.id === 'areas').items.filter((i) => ['career', 'wealth'].includes(i.id));
    for (const s of strs(items)) assert.doesNotMatch(s, GENDERED, `${r.p.id}: ${s}`);
    for (const s of strs([r.roadmap.now, r.roadmap.stage.goals])) assert.doesNotMatch(s, GENDERED, `${r.p.id}: ${s}`);
    for (const l of r.life.filter((x) => ['career', 'house'].includes(x.question.id))) for (const s of strs([l.remedy, l.windows.map((w) => w.reasons), l.promise.notes])) assert.doesNotMatch(s, GENDERED, `${r.p.id}: ${s}`);
  }
  for (const id of ['job', 'career', 'business', 'house', 'job_change']) {
    const q = QUESTIONS.find((x) => x.id === id);
    assert.deepEqual(questionFor(q, 'male').remedy, questionFor(q, 'female').remedy, `${id}: same remedy for every gender`);
    assert.equal(questionFor(q, 'male').en, questionFor(q, 'female').en);
  }
  assert.doesNotMatch(NAVAGRAHA.Jupiter.governs.en, /for women/, 'karaka text is not gendered');
  assert.doesNotMatch(NAVAGRAHA.Saturn.governs.en, /longevity/, 'karaka text has no lifespan word');
});

test('gender: bride / groom are மணமகள் / மணமகன் on porutham and couple screens, and matching is adults-only', () => {
  const srcTools = fs.readFileSync(path.join(root, 'public/screens-tools.js'), 'utf8');
  const srcCouple = fs.readFileSync(path.join(root, 'public/screens-couple.js'), 'utf8');
  for (const src of [srcTools, srcCouple]) {
    assert.match(src, /L\('Bride', 'மணமகள்'\)/);
    assert.match(src, /L\('Groom', 'மணமகன்'\)/);
  }
  const partner = QUESTIONS.find((q) => q.id === 'partner');
  assert.match(questionFor(partner, 'female').ta, /மணமகன்/);
  assert.match(questionFor(partner, 'male').ta, /மணமகள்/);
  const bride = RUNS.find((r) => r.prof.adult && r.p.gender === 'female' && r.c.planets.Lagna).c;
  const groom = RUNS.find((r) => r.prof.adult && r.p.gender === 'male' && r.c.planets.Lagna).c;
  const m = matchPorutham({ star: bride.janmaNakshatra.index, rasi: bride.janmaRasi.index }, { star: groom.janmaNakshatra.index, rasi: groom.janmaRasi.index });
  for (const s of strs(m.rows)) assert.doesNotMatch(s, /\b(girl|boy)\b/i, s);
  assert.equal(m.noVerdict, true);
  const rep = marriageReport(bride, groom, { weddingDate: NOW, names: [{ en: 'Bride', ta: 'மணமகள்' }, { en: 'Groom', ta: 'மணமகன்' }] });
  for (const s of strs(rep)) {
    assert.doesNotMatch(s, CERTAINTY, s);
    assert.equal(scanProhibited(s, ALWAYS_PROHIBITED).length, 0, s);
  }
  assert.deepEqual(findProhibited(rep), []);
  for (const r of RUNS.filter((x) => x.prof.minor)) assert.equal(isAdult(r.p.date, { today: TODAY }), false);
});

// ------------------------------------------------------------------ mantra review, Hindu for everyone (F1–F5, M3–M6, L1, L6, L7)
import { personalGuide, PLANET_DEITY, DEITY_MANTRA } from '../shared/personal.js';
import { PRIMARY, mantraOnly } from '../shared/remedies.js';
import { MANTRAS } from '../shared/mantras.js';

const src = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const fnBody = (code, name) => { const i = code.indexOf(`function ${name}(`); assert.ok(i >= 0, name); return code.slice(i, code.indexOf('\nfunction ', i + 10) > 0 ? code.indexOf('\nfunction ', i + 10) : i + 6000); };

test('F1: Today "God of the day" and the closing prayer are shown for every member (Hindu-only app)', () => {
  const body = fnBody(src('public/screens-main.js'), 'dailyCard');
  assert.doesNotMatch(body, /faithOf|isHinduFaith|universalPractice|faithBlessing|faithWelcome/, 'no per-faith branch on Today');
  assert.match(body, /\$\{god\}/, 'the god-of-the-day card is always drawn');
  const r = RUNS.find((x) => x.p.faith === 'muslim' && x.prof.adult);
  assert.ok(r.daily.prayer?.lines?.length, 'closing prayer for a profile once stored as Muslim');
  assert.equal(r.daily.practice, undefined);
});

test('F2: My Guide, Guru Vakku and Love screen give everyone the Ishta Theivam, Siddhar and mantra playlist', () => {
  const c = RUNS.find((x) => x.p.faith === 'christian' && x.c.planets.Lagna).c;
  const g = personalGuide(c, { date: '1990-01-01', now: NOW, faith: 'christian' });
  assert.deepEqual(g, personalGuide(c, { date: '1990-01-01', now: NOW }), 'an old faith option changes nothing');
  assert.ok(g.playlist.length >= 5, 'mantra playlist for everyone');
  assert.ok(g.ishta.deity && g.siddhar.main);
  for (const k of ['hindu', 'faith', 'practice', 'blessing']) assert.ok(!(k in g), `no ${k} field`);
  const guide = src('public/screens-guide.js');
  assert.doesNotMatch(guide, /faithOf|TRADITIONAL_OPTIONAL|g\.hindu|\(optional\)<\/summary>/, 'nothing folded away as "optional, for information only"');
  assert.match(guide, /\$\{g\.playlist\.length \? `/, 'playlist card only when there is a playlist');
  assert.match(guide, /postpone new starts and chant/);
  const love = src('public/screens-love.js');
  assert.match(love, /const pr = closingPrayer\(r\.charts\[0\]\);/);
  assert.doesNotMatch(love, /faithBlessing|isHinduFaith/);
});

test('F3: children get child-appropriate Hindu prayers whatever an old stored faith says (age rules unchanged)', () => {
  const hinduDeity = { god: { en: 'Lord Vinayagar', ta: 'விநாயகர்' }, mantra: { en: 'Om Gam Ganapataye Namaha', ta: 'ஓம் கம் கணபதயே நமஹ' } };
  for (const r of RUNS.filter((x) => x.prof.minor && x.p.faith !== 'hindu')) {
    const g = childGeneralAnswer({ profile: r.prof, lang: 'ta', faith: r.p.faith, deity: hinduDeity, question: 'இன்று என்ன பிரார்த்தனை?' });
    assert.match(g.text, /கணபதயே/, `${r.p.id}: today's prayer`);
    const a = ageGuardAnswer({ topic: 'job', profile: r.prof, lang: 'ta', faith: r.p.faith });
    assert.deepEqual(a, ageGuardAnswer({ topic: 'job', profile: r.prof, lang: 'ta' }), `${r.p.id}: same child answer`);
  }
  const h = RUNS.find((x) => x.prof.band === '0-5');
  assert.match(ageGuardAnswer({ topic: 'job', profile: h.prof, lang: 'en' }).text, /Ganapataye/);
  const tools = src('public/screens-tools.js');
  assert.match(tools, /childGeneralAnswer\(\{ profile: prof, lang: state\.lang, name: displayName\(m\), deity, question: text \}\)/);
  assert.match(tools, /deity = dailyReview\(chartOf\(m\), state\.snap, new Date\(\)\)\.deity/);
  assert.doesNotMatch(src('public/screens-main.js'), /faithOf\(m\)/);
});

test('F5: Home "Today\'s parigaram" passes age — the full Hindu parigaram for everyone, no work lines for children', () => {
  const body = fnBody(src('public/screens-main.js'), 'parigaramCard');
  assert.match(body, /snapshot: snap, profile: person \? ageOf\(person\) : null/);
  assert.doesNotMatch(body, /faith/);
  // Tuesday (Mars) for a child: the free line stays a prayer, never "work" / money wording.
  const kid = RUNS.find((x) => x.prof.minor);
  for (const wd of [0, 1, 2, 3, 4, 5, 6]) for (const i of dailyParigaram({ weekday: wd, chart: kid.c, profile: kid.prof, now: NOW })) assert.ok(!adultText(i.free), `${wd}: ${i.free.en}`);
});

test('M3–M6: one primary deity and mantra per planet on every surface; the 🔊 button speaks only the mantra', () => {
  for (const k of Object.keys(PRIMARY)) {
    const p = PRIMARY[k];
    assert.equal(mantraOnly(NAVAGRAHA[k].mantra), p.mantra.ta, `${k}: Navagraha parigaram mantra`);
    assert.equal(NAVAGRAHA[k].mantra.en.split(' · ')[0], p.mantra.en, `${k}: English mantra`);
    assert.equal(DEITY_MANTRA[k], p.mantra.ta, `${k}: Today / Ishta mantra`);
    assert.deepEqual(PLANET_DEITY[k], p.deity, `${k}: deity`);
  }
  for (const r of RUNS.slice(0, 6)) {
    const cp = closingPrayer(r.c, NOW);
    cp.deities.forEach((k, i) => assert.ok(cp.lines[i].ta.startsWith(PRIMARY[k].mantra.ta), `${k} closing prayer`));
    for (const it of r.roadmap.periods) assert.equal(mantraOnly(it.remedy.mantra), PRIMARY[it.ad].mantra.ta);
  }
  assert.equal(mantraOnly(NAVAGRAHA.Sun.mantra), 'ஓம் சூர்யாய நமஹ', 'hymn title is not spoken');
  assert.match(src('public/screens-tools.js'), /data-say="\$\{esc\(mantraOnly\(n\.mantra\)\)\}"/);
  assert.equal(PRIMARY.Jupiter.mantra.en, 'Om Guruve Namaha');
  assert.equal(PRIMARY.Venus.mantra.en, 'Om Shri Mahalakshmiyai Namaha');
});

test('M5, M6, L1, L6, L7: one spelling for Guru, Mahalakshmi, Rama nama, Durga and Abhirami Anthadhi', () => {
  const OWNED = ['shared/remedies.js', 'shared/daily.js', 'shared/personal.js', 'shared/mantras.js', 'shared/predict.js', 'shared/prasna.js', 'shared/today-plan.js',
    'shared/analysis.js', 'shared/roadmap.js', 'shared/written-palan.js', 'shared/peyarchi.js', 'shared/special.js', 'shared/age-guard.js', 'shared/couple.js',
    'shared/temple-info.js', 'shared/temples.js', 'public/screens-main.js', 'public/screens-tools.js', 'public/screens-guide.js', 'public/screens-life.js', 'public/screens-love.js'];
  for (const f of OWNED) {
    const s = src(f);
    assert.doesNotMatch(s, /Gurave/, `${f}: Om Guruve Namaha`);
    for (const m of s.match(/Om (Shreem |Sri |Shri )?Mahalaksh\w* Namaha/g) || []) assert.equal(m, 'Om Shri Mahalakshmiyai Namaha', `${f}: ${m}`);
    for (const m of s.match(/ஓம் (ஸ்ரீம் |ஸ்ரீ )?மகால\S* நமஹ/g) || []) assert.equal(m, 'ஓம் ஸ்ரீ மகாலட்சுமியை நமஹ', `${f}: ${m}`);
    assert.doesNotMatch(s, /Sri Rama Jayam|ஸ்ரீ ராம ஜெயம்/, `${f}: Rama nama`);
    for (const m of s.match(/ஸ்ரீ ராம ஜெய[^'"`;,)]*/g) || []) assert.equal(m.trim(), 'ஸ்ரீ ராம ஜெய ராம ஜெய ஜெய ராம', `${f}: ${m}`);
    for (const m of s.match(/Sri Rama Jaya[^'"`;,)]*/g) || []) assert.equal(m.trim(), 'Sri Rama Jaya Rama Jaya Jaya Rama', `${f}: ${m}`);
    assert.doesNotMatch(s, /துர்கை/, `${f}: துர்க்கை`);
    assert.doesNotMatch(s, /Abhirami Anth(?!adhi)|Andhadhi|Anthathi|அபிராமி அந்தாதீ/, `${f}: Abhirami Anthadhi`);
  }
  const mj = MANTRAS.find((m) => m.id === 'mrityunjaya');
  assert.ok(!mj.for.includes('travel'), 'Mrityunjaya is not looped in travel mode');
  assert.doesNotMatch(`${mj.meaning.en} ${mj.meaning.ta}`, /long life|ஆயுள்/);
});
