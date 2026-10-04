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
const ask = (question, lang = 'ta', f = facts) => composeAnswer({ question, lang, facts: f, name: 'Suresh' });

test('brand is configurable and complete', () => {
  for (const k of ['name', 'nameTa', 'taglineTa', 'descriptorEn', 'assistantEn', 'premiumEn']) assert.ok(BRAND[k], k);
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
  assert.deepEqual(a.sections.map((s) => s.key), ['question', 'factors', 'interpretation', 'uncertainty', 'practice', 'next']);
  const dasa = facts.dasa;
  assert.ok(a.text.includes(dasa.start) && a.text.includes(dasa.end), 'dasa dates come from the engine');
  const ai = factsForAI(facts);
  assert.ok(ai.currentDasa.includes(dasa.lord));
  assert.ok(ai.housesCountedFrom.startsWith('Lagna'));
});

test('answer language follows the question; Tamil questions get Tamil headings', () => {
  assert.equal(answerLang('How is my career?', 'ta'), 'en');
  assert.equal(answerLang('என் தொழில் எப்படி?', 'en'), 'ta');
  assert.equal(ask('என் தொழில் எப்படி இருக்கும்?').sections[0].title, 'உங்கள் கேள்வி');
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
  assert.match(health.text, /do not diagnose/);
  for (const q of ['Will I get married next year?', 'Will my visa be approved?', 'Will I win my court case?']) {
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
