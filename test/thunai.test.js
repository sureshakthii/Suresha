// THUNAI brief: explainable guidance, birth-time certainty, journey planning, brand config.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { birthChart } from '../shared/astro.js';
import { timeReliability, shiftLocal, UNKNOWN_TIME_PLACEHOLDER } from '../shared/birthtime.js';
import { classify, chartFacts, composeAnswer, factsForAI, answerLang } from '../shared/guidance.js';
import { planJourney, parseTripText, estimateCost, REVIEW } from '../shared/journey.js';
import { BRAND } from '../shared/brand.js';
import { ENGINE_VERSION, CONVENTIONS } from '../shared/version.js';

const suresh = { name: 'Suresh', date: '1982-05-10', time: '10:30:00', lat: 9.9252, lon: 78.1198, tz: 5.5 };
const facts = chartFacts(birthChart(suresh), timeReliability(suresh), new Date('2026-10-04T06:00:00Z'));
// App language: Tamil questions are asked in Tamil mode, English questions in English mode (unless a test says otherwise).
const ask = (question, lang = /[\u0B80-\u0BFF]/.test(question) ? 'ta' : 'en', f = facts) => composeAnswer({ question, lang, facts: f, name: 'Suresh' });

test('brand is configurable and complete', () => {
  for (const k of ['name', 'nameTa', 'taglineTa', 'descriptorEn', 'assistantEn', 'personalEn']) assert.ok(BRAND[k], k);
  assert.equal(BRAND.taglineTa, 'உங்கள் வாழ்வின் வழித்துணை.');
  assert.equal(BRAND.descriptorEn, 'Personal Astrology & Spiritual Guidance');
  assert.match(ENGINE_VERSION, /calc \d+\.\d+\.\d+ · rules \d+\.\d+\.\d+/);
  for (const k of ['ayanamsa', 'nodes', 'houses', 'sunrise', 'timezone', 'dasa']) assert.ok(CONVENTIONS[k], k);
});

test('classify: the questions from the screenshots and the brief reach the right topic', () => {
  const cases = [
    ['I sm going to buy the car which color and number can select', 'vehicle'],
    ['I need to buy a new car which registration number can select', 'vehicle'],
    ['எந்த கிரகம் எனக்குப் பலவீனம்? என்ன எளிய பரிகாரம் செய்யலாம்?', 'weak'],
    ['I have four days’ leave next month. Which temples could I visit?', 'temple'],
    ['I feel worried about work. Help me understand my current period.', 'emotional'],
    ['Help our family choose dates for a housewarming.', 'dates'],
    ['Explain my current dasa-bhukti simply.', 'dasa'],
    ['இந்த வருடம் என் தொழில் எப்படி இருக்கும்?', 'career'],
    ['I have pain', 'pain'],
    ['I have pain in my knee, should I see a doctor', 'health'],
    ['when will I die', 'death'],
    ['I want to end my life', 'crisis'],
    ['What is our kula deivam?', 'kuladeivam'],
  ];
  for (const [q, intent] of cases) assert.equal(classify(q).intent, intent, q);
});

test('different questions get different, question-specific answers (no more repeated text)', () => {
  const qs = ['I sm going to buy the car which color and number can select', 'எந்த கிரகம் எனக்குப் பலவீனம்? என்ன எளிய பரிகாரம் செய்யலாம்?', 'Explain my current dasa-bhukti simply.', 'Help our family choose dates for a housewarming.', 'How is my career this year?'];
  const texts = qs.map((q) => ask(q).text);
  assert.equal(new Set(texts).size, texts.length);
  for (let i = 0; i < qs.length; i++) assert.ok(texts[i].includes(qs[i].trim()), 'answer echoes the question');
  assert.match(ask(qs[0]).text, /Colour|colour/);
  assert.match(ask(qs[0]).text, /numerology/);
});

test('answers follow the six-part structure and quote only engine facts', () => {
  const a = ask('How is my career this year?');
  assert.equal(a.lang, 'en');
  assert.deepEqual(a.sections.map((s) => s.key), ['question', 'answer', 'factors', 'interpretation', 'uncertainty', 'practice', 'next', 'prayer']);
  const dasa = facts.dasa;
  assert.ok(a.text.includes(dasa.start) && a.text.includes(dasa.end), 'dasa dates come from the engine');
  const ai = factsForAI(facts);
  assert.ok(ai.currentDasa.includes(dasa.lord));
  assert.ok(ai.housesCountedFrom.startsWith('Lagna'));
});

test('answers follow the language selected in the app, whatever the question language (English, Tamil or Tanglish)', () => {
  assert.equal(answerLang('How is my career?', 'ta'), 'ta');
  assert.equal(answerLang('என் தொழில் எப்படி?', 'en'), 'en');
  const tamilMode = composeAnswer({ question: 'When will I get married?', lang: 'ta', facts });
  assert.equal(tamilMode.sections[0].title, 'உங்கள் கேள்வி');
  assert.match(tamilMode.text, /[\u0B80-\u0BFF]/);
  const tanglish = composeAnswer({ question: 'enakku eppo kalyanam nadakkum', lang: 'ta', facts });
  assert.equal(tanglish.intent, 'marriage_when');
  assert.equal(composeAnswer({ question: 'என் தொழில் எப்படி இருக்கும்?', lang: 'en', facts }).sections[0].title, 'Your question');
});

test('marriage / children: already married or parents get a chart-vs-life check, not a new prediction', () => {
  const single = composeAnswer({ question: 'when will i get marrage', lang: 'en', facts, life: {} });
  assert.equal(single.intent, 'marriage_when');
  assert.match(single.text, /supportive in the coming years/);
  assert.match(single.text, /Already married\?/);
  const married = composeAnswer({ question: 'When will I get married?', lang: 'en', facts, life: { maritalStatus: 'married', marriedYear: 2009 } });
  assert.match(married.text, /already married/);
  assert.ok(!/supportive in the coming years/.test(married.text), 'no new marriage prediction for a married person');
  assert.match(married.text, /The year 2009 (falls within|is not inside)/);
  const parent = composeAnswer({ question: 'kuzhandhai eppo', lang: 'en', facts, life: { maritalStatus: 'married', children: 2, firstChildYear: 2016 } });
  assert.equal(parent.intent, 'child_when');
  assert.match(parent.text, /Your profile shows 2 children/);
  const another = composeAnswer({ question: 'When can we have a second child?', lang: 'en', facts, life: { children: 1 } });
  assert.match(another.text, /coming years/);
});

test('safety: pain is clarified, crisis gets helplines, death is never predicted, health is never diagnosed', () => {
  const pain = ask('I have pain');
  assert.equal(pain.clarify.options.length, 3);
  assert.ok(!pain.sections.some((s) => s.key === 'factors'), 'no chart reading before clarification');
  const crisis = ask('I want to end my life');
  assert.match(crisis.text, /14416/);
  assert.match(crisis.text, /112/);
  assert.ok(!crisis.sections.some((s) => s.key === 'factors'));
  const death = ask('When will I die?');
  assert.match(death.text, /does not predict death/);
  assert.ok(!/\b(19|20)\d{2}\b/.test(death.text), 'no dates in a death answer');
  const health = ask('Will I get diabetes?');
  assert.match(health.text, /not a diagnosis/);
  assert.match(ask('Will I get married next year?').text, /not a guarantee/);
  for (const q of ['Will my visa be approved?', 'Will I win my court case?']) {
    assert.match(ask(q).text, /No horoscope can guarantee/, q);
  }
  assert.match(ask('What is our kula deivam?').text, /cannot be established conclusively/);
});

test('without birth details the engine says so instead of inventing facts', () => {
  const a = composeAnswer({ question: 'How is my career?', lang: 'en', facts: null });
  assert.match(a.text, /No birth details/);
  assert.equal(a.actions[0].go, 'family');
});

test('birth time: exact keeps everything; approximate qualifies; unknown withholds time-sensitive results', () => {
  const exact = timeReliability(suresh);
  assert.ok(exact.lagna && exact.navamsa && exact.dasa && exact.timeShown);
  const approx = timeReliability({ ...suresh, timeCertainty: 'approx', timeWindowMin: 60 });
  assert.equal(approx.certainty, 'approx');
  assert.equal(approx.dasa, false, '±1 h moves dasa dates by more than a month');
  assert.ok(approx.dasaShiftDays > 31);
  const unknown = timeReliability({ ...suresh, time: UNKNOWN_TIME_PLACEHOLDER, timeCertainty: 'unknown' });
  assert.equal(unknown.lagna, false);
  assert.equal(unknown.navamsa, false);
  assert.equal(unknown.timeShown, false);
  assert.ok(unknown.notes.length >= 1);
  // With an unknown time, houses are counted from the Moon and the answer says so.
  const f = chartFacts(birthChart({ ...suresh, time: UNKNOWN_TIME_PLACEHOLDER }), unknown);
  assert.equal(f.reference, 'moon');
  assert.match(composeAnswer({ question: 'How is my career?', lang: 'en', facts: f }).text, /Moon sign/);
});

test('shiftLocal crosses midnight correctly', () => {
  assert.deepEqual(shiftLocal('2026-01-31', '23:30:00', 60), { date: '2026-02-01', time: '00:30:00' });
  assert.deepEqual(shiftLocal('2026-03-01', '00:15:00', -30), { date: '2026-02-28', time: '23:45:00' });
});

test('journey: parse text for confirmation, three options with labelled estimates and sources', () => {
  const p = parseTripText('I have four days leave next month from Madurai, budget 15000 for 3 people');
  assert.deepEqual({ days: p.days, budget: p.budget, travellers: p.travellers, when: p.when, fromText: p.fromText }, { days: 4, budget: 15000, travellers: 3, when: 'next_month', fromText: 'madurai' });
  const plan = planJourney({ start: { lat: 9.9252, lon: 78.1198, name: 'Madurai' }, days: 4, travellers: 3, transport: 'own_car', tier: 'standard', budget: 15000, planets: ['Sun', 'Moon'] });
  assert.deepEqual(plan.options.map((o) => o.key), ['A', 'B', 'C']);
  for (const o of plan.options) {
    assert.ok(o.temples.length >= 1);
    assert.ok(o.cost.total > 0 && o.cost.lines.length >= 3);
    for (const t of o.temples) {
      assert.ok(['unverified', 'missing'].includes(t.hours.status), 'hours are never presented as verified');
      assert.equal(t.accessibility, 'unverified');
      assert.ok(t.association);
    }
    assert.ok(o.itinerary.length >= 1);
  }
  assert.ok(plan.options[1].itinerary.length <= 4);
  assert.equal(plan.options[2].homeWorship, true);
  assert.ok(plan.options[1].why.some((w) => w.kind === 'chart'), 'chart-relevant temples explain why');
  assert.equal(REVIEW.bookingOperational, false);
  assert.equal(REVIEW.hours.verifiedOn, null);
});

test('journey cost estimate is transparent arithmetic', () => {
  const c = estimateCost({ km: 100, days: 1, nights: 0, travellers: 2, transport: 'bus', tier: 'economy', templeCount: 1 });
  // bus 100×1.3×2 = 260, local 400, food 2×350 = 700, offerings 2×50 = 100 → 1460 → rounded to 1500
  assert.equal(c.total, 1500);
  assert.equal(c.lines.length, 4);
});

test('journey: reviewed temple facts show as verified with source and date; old reviews need a re-check', async () => {
  const { VERIFIED, verifiedField } = await import('../shared/temple-verified.js');
  VERIFIED.madurai_meenakshi = { hours: { en: '5:00–12:30, 16:00–21:30', source: 'Temple office phone call', verifiedOn: new Date().toISOString().slice(0, 10), verifiedBy: 'test' } };
  VERIFIED.koodal_azhagar = { hours: { en: '6–12', source: 'Visit', verifiedOn: '2020-01-01', verifiedBy: 'test' } };
  try {
    const plan = planJourney({ start: { lat: 9.9252, lon: 78.1198, name: 'Madurai' }, days: 1, travellers: 1, transport: 'bus' });
    const all = plan.options.flatMap((o) => o.temples);
    const m = all.find((t) => t.id === 'madurai_meenakshi');
    assert.equal(m.hours.status, 'verified');
    assert.equal(m.hours.source, 'Temple office phone call');
    const k = all.find((t) => t.id === 'koodal_azhagar');
    if (k) assert.equal(k.hours.status, 'stale');
    assert.equal(verifiedField('madurai_meenakshi', 'accessibility'), null, 'unreviewed fields stay unverified');
  } finally { delete VERIFIED.madurai_meenakshi; delete VERIFIED.koodal_azhagar; }
});

test('daily review: chandrashtamam, tara and chandra balam, do/don\'t, god of the day and closing prayer', async () => {
  const { dailyReview, closingPrayer, nextChandrashtamam } = await import('../shared/daily.js');
  const { panchang } = await import('../shared/astro.js');
  const chart = birthChart(suresh);
  const now = new Date('2026-10-04T06:00:00Z');
  const r = dailyReview(chart, panchang(now, suresh.lat, suresh.lon, suresh.tz), now);
  assert.ok(r.personal && r.label.ta && r.dos.length && r.donts.length && r.deity.god.ta);
  assert.ok(r.why.length >= 2);
  const pr = closingPrayer(chart, now);
  assert.deepEqual(pr.deities, ['Sun', 'Mercury']);
  assert.match(pr.lines[0].ta, /போற்றி/);
  const ch = nextChandrashtamam(chart.janmaRasi.index, now);
  assert.ok(ch.end > ch.start && (ch.end - ch.start) / 3600000 > 40 && (ch.end - ch.start) / 3600000 < 66);
  // Answers close with the prayer for the person's Dasa and Bhukti deities
  assert.match(ask('How is my career this year?').text, /Sivane Potri/);
});

test('love match: five meters, vibe 0-100, shares no private data', async () => {
  const { loveMatch } = await import('../shared/love.js');
  const a = birthChart(suresh);
  const b = birthChart({ ...suresh, name: 'K', date: '1992-04-11', time: '12:00:00' });
  const r = loveMatch(a, b, { genderA: 'male', genderB: 'female', names: ['S', 'K'] });
  assert.equal(r.meters.length, 5);
  assert.ok(r.vibe >= 0 && r.vibe <= 100 && r.tier.ta);
  for (const m of r.meters) assert.ok(m.score >= 0 && m.score <= 100 && m.why.ta, m.id);
});

test('answers carry one headline percentage whose wording matches the verdict', () => {
  for (const q of ['How is my career this year?', 'Explain my current dasa', 'How is my health?', 'When will I get married?']) {
    const a = ask(q);
    assert.ok(a.meter && a.meter.pct >= 20 && a.meter.pct <= 92, q);
    assert.match(a.text, new RegExp(`${a.meter.pct}%`), q);
  }
  const c = ask('How is my career this year?');
  const ans = c.sections.find((s) => s.key === 'answer').lines[0];
  if (c.meter.pct < 45) assert.match(ans, /patience/); else assert.doesNotMatch(ans, /slow for now/);
});

test('age control: a child is never read for marriage, career or money; elders get life-stage wording', async () => {
  const kid = { ...suresh, name: 'A', date: '2020-03-12', time: '16:50:00' };
  const fk = chartFacts(birthChart(kid), timeReliability(kid));
  for (const q of ['When will I get married?', 'How is my career?', 'kalyanam eppo', 'panam eppo varum']) {
    const a = composeAnswer({ question: q, lang: 'en', facts: fk });
    // shared/age-guard.js: a 6-year-old gets the warm "when you grow up" reply — no meter, no percentage.
    assert.match(a.sections.find((s) => s.key === 'answer').lines[0], /when you grow up/, q);
    assert.equal(a.meter, null, q);
    assert.doesNotMatch(a.text, /\d+\s*%/, q);
  }
  const study = composeAnswer({ question: 'How are my studies?', lang: 'en', facts: fk });
  assert.doesNotMatch(study.text, /when you grow up/);
  const { dailyReview } = await import('../shared/daily.js');
  const { panchang } = await import('../shared/astro.js');
  const now = new Date('2026-10-05T04:00:00Z');
  const r = dailyReview(birthChart(kid), panchang(now, kid.lat, kid.lon, kid.tz), now);
  assert.ok(r.minor && !r.dos.some((d) => /signature|venture/i.test(d.en)));
});

test('daily do\'s and don\'ts change with the day\'s star and weekday', async () => {
  const { dailyReview } = await import('../shared/daily.js');
  const { panchang } = await import('../shared/astro.js');
  const chart = birthChart(suresh);
  const lists = ['2026-10-05', '2026-10-06', '2026-10-07'].map((d) => { const t = new Date(`${d}T04:00:00Z`); return dailyReview(chart, panchang(t, suresh.lat, suresh.lon, suresh.tz), t).dos.map((x) => x.en).join('|'); });
  assert.equal(new Set(lists).size, 3);
});

test('safety & understanding: Tanglish crisis, love, festivals, going abroad', () => {
  for (const q of ['naan saga poren', 'I am going to die', 'sethuruven pola irukku']) assert.equal(classify(q).intent, 'crisis', q);
  assert.equal(classify('I want to fall in love').intent, 'love');
  assert.equal(classify('kadhal vazhkai eppadi').intent, 'love');
  assert.equal(classify('vizhaa natkal').intent, 'festival');
  assert.equal(classify('videsham poga mudiyuma').intent, 'visa');
  const crisis = ask('naan saga poren', 'ta');
  assert.match(crisis.text, /14416/);
  assert.ok(!crisis.sections.some((s) => s.key === 'prayer'));
});

test('faith: name hint, own choice wins, blessing replaces deity prayer', async () => {
  const { guessFaith, faithOf } = await import('../shared/faith.js');
  assert.equal(guessFaith('Mohammed Riyaz'), 'muslim');
  assert.equal(guessFaith('John Peter'), 'christian');
  assert.equal(guessFaith('Suresh Babu'), null);
  assert.equal(faithOf({ name: 'John', faith: 'hindu' }), 'hindu');
  const a = composeAnswer({ question: 'How is my career?', lang: 'en', facts, life: { faith: 'christian' } });
  assert.match(a.sections.find((s) => s.key === 'prayer').lines[0], /God bless/);
});

test('journey: every stop gets arrival / closing times from temple hours', () => {
  const p = planJourney({ start: { name: 'Madurai', lat: 9.9252, lon: 78.1198 }, days: 2, travellers: 2, transport: 'own_car', planets: ['Saturn'] });
  for (const o of p.options) for (const d of o.itinerary) for (const s of d.stops) {
    assert.match(s.arrive, /^\d{1,2}:\d{2}$/);
    assert.ok(s.closes && typeof s.wait === 'number');
  }
});

test('today plan: sacred day linked to the person, horai with time and 9-week repeat, faith and age aware', async () => {
  const { todayPlan } = await import('../shared/today-plan.js');
  const { panchang } = await import('../shared/astro.js');
  const chart = birthChart(suresh);
  const now = new Date('2026-10-06T01:00:00Z');
  const snap = panchang(now, suresh.lat, suresh.lon, suresh.tz);
  const r = todayPlan({ chart, snap, festivals: [{ en: 'Ekadasi', ta: 'ஏகாதசி' }, { en: 'Pradosham', ta: 'பிரதோஷம்' }], level: 'good', now });
  assert.ok(r.energy.ta && r.items.length === 2);
  assert.ok(r.items.some((i) => i.personal));
  assert.ok(r.horai && r.horai.start && /9/.test(r.horai.repeat.en));
  const amav = todayPlan({ chart, snap, festivals: [{ en: 'Amavasai', ta: 'அமாவாசை' }, { en: 'Mahalaya Amavasai', ta: 'மகாளய அமாவாசை' }], now });
  assert.equal(amav.items.length, 1);
  assert.match(amav.items[0].title.en, /Mahalaya/);
  const other = todayPlan({ chart, snap, festivals: [{ en: 'Ekadasi', ta: 'ஏகாதசி' }], now, faith: 'christian' });
  assert.equal(other.items.length, 0);
  const child = todayPlan({ chart, snap, festivals: [{ en: 'Sashti Viratham', ta: 'சஷ்டி விரதம்' }], now, age: 9 });
  assert.match(child.items[0].text.en, /children need not fast/);
});

test('written jathagam: chart rebuilt from the Rasi Kattam, star and dasa balance', async () => {
  const { chartFromKattam, kattamReliability, kattamWarnings, KATTAM_PLANETS } = await import('../shared/kattam.js');
  const real = birthChart(suresh);
  const planets = Object.fromEntries(KATTAM_PLANETS.map((p) => [p, real.planets[p].rasi]));
  const bal = real.dasa.balance.years;
  const k = { star: real.janmaNakshatra.index, pada: real.janmaNakshatra.pada, lagna: real.lagna.rasi, planets, balance: { years: Math.floor(bal), months: Math.round((bal - Math.floor(bal)) * 12) } };
  const c = chartFromKattam({ ...suresh, kattam: k });
  assert.equal(c.janmaNakshatra.index, real.janmaNakshatra.index);
  assert.equal(c.janmaRasi.index, real.janmaRasi.index);
  assert.equal(c.lagna.rasi, real.lagna.rasi);
  assert.equal(c.dasa.current.lord, real.dasa.current.lord);
  assert.ok(Math.abs(new Date(c.dasa.current.end) - new Date(real.dasa.current.end)) < 45 * 86400000);
  const rel = kattamReliability({ kattam: k });
  assert.ok(rel.lagna && !rel.navamsa && rel.dasa);
  assert.equal(kattamWarnings(k).length, 0);
  assert.ok(kattamWarnings({ ...k, planets: { ...planets, Moon: (planets.Moon + 3) % 12 } }).length >= 1);
});
