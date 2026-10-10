// Answer-validator, evidence-builder and identity-context unit tests (Brief §6, §17, §22).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateAnswer, parseModelAnswer, composeAnswer, scanProhibited } from '../server/policy/answer-validator.js';
import { buildEvidence, evidenceFromClientContext, modelPayload } from '../server/policy/evidence-builder.js';
import { ageOn, ageBand, resolveContext, referenceDate } from '../server/policy/identity-context.js';
import { classifyConversation } from '../server/policy/intent-router.js';
import { ALWAYS_PROHIBITED } from '../server/policy/safety-policy.js';
import { MINOR_PROHIBITED } from '../server/policy/age-policy.js';
import { birthChart } from '../shared/astro.js';
import { answerWithEvidence, setModelCallerForTests } from '../server/ai.js';
import { recordPolicyEvent, auditSnapshot, resetAudit } from '../server/policy/audit-events.js';

const chart = birthChart({ name: 'Secret Name', date: '1990-01-01', time: '10:00:00', lat: 13.0827, lon: 80.2707, tz: 5.5, place: 'Mylapore, Chennai' });
const evidence = buildEvidence({ chart });
const decision = { allowAstrology: true, permittedEvidenceIds: evidence.ids, prohibitedOutputs: ALWAYS_PROHIBITED, deadline: null };
const jup = evidence.facts.find((f) => f.id === 'D1.planet.Jupiter');
const house = Number(/house (\d+)/.exec(jup.text)[1]);
const good = () => ({
  text: 'You asked about your career. Under your selected tradition, this period is associated with learning and preparation.',
  claims: [{ text: `Jupiter is in house ${house} from the Lagna.`, evidenceIds: ['D1.planet.Jupiter'] }],
  uncertainty: 'This is traditional reflection, not certainty; birth-time accuracy matters.',
  nextSteps: ['Complete the course', 'Prepare your applications'],
  optionalPractice: 'Light a lamp on Thursday if you wish.',
  humanReview: false,
});

test('evidence bundle has ids for planets, dasa, panchang-free chart and minimises personal data', () => {
  for (const id of ['D1.lagna', 'D1.janma_nakshatra', 'D1.planet.Sun', 'D1.planet.Saturn', 'DASA.current', 'DASA.bhukti']) assert.ok(evidence.ids.includes(id), id);
  const payload = JSON.stringify(modelPayload(evidence));
  assert.doesNotMatch(payload, /Secret Name|Mylapore|13\.08|80\.27|1990-01-01/);
});

test('client-context evidence drops names, birth data, places and relations', () => {
  const ctx = { today: { star: 'Rohini', place: 'Chennai' }, person: { name: 'Kumar', relation: 'son', birth: '2001-02-03 10:00 Madurai', lagna: 'Mesha 12°', planets: { Sun: 'Makara house 10' } } };
  const { facts, dropped } = evidenceFromClientContext(ctx);
  const all = JSON.stringify(facts);
  assert.doesNotMatch(all, /Kumar|Madurai|2001-02-03|\bson\b|Chennai/);
  assert.ok(facts.some((f) => f.id === 'C.person.planets.Sun'));
  assert.deepEqual(dropped.sort(), ['birth', 'name', 'place', 'relation']);
});

test('a well-formed, cited answer validates and composes', () => {
  const v = validateAnswer(good(), { decision, evidence });
  assert.equal(v.status, 'valid', v.errors.join());
  const text = composeAnswer(v.answer, 'en');
  assert.match(text, /Next steps:\n• Complete the course/);
  assert.match(text, /🪔 Light a lamp/);
});

test('claims must cite permitted evidence that actually supports them', () => {
  const unknown = good(); unknown.claims[0].evidenceIds = ['D1.planet.Pluto'];
  assert.ok(validateAnswer(unknown, { decision, evidence }).errors.includes('claims:0:unknown_evidence'));
  const empty = good(); empty.claims[0].evidenceIds = [];
  assert.ok(validateAnswer(empty, { decision, evidence }).errors.includes('claims:0:no_evidence'));
  const planet = good(); planet.claims[0].text = `Saturn is in house ${house}.`;
  assert.ok(validateAnswer(planet, { decision, evidence }).errors.includes('claims:0:planet_not_in_evidence'));
  const wrongHouse = good(); wrongHouse.claims[0].text = `Jupiter is in house ${(house % 12) + 1}.`;
  assert.ok(validateAnswer(wrongHouse, { decision, evidence }).errors.includes('claims:0:house_not_in_evidence'));
  const uncited = good(); uncited.claims = []; uncited.text = 'Your Saturn dasa brings delays.';
  assert.ok(validateAnswer(uncited, { decision, evidence }).errors.includes('claims:uncited_chart_claim'));
  const noUnc = good(); noUnc.uncertainty = '';
  assert.ok(validateAnswer(noUnc, { decision, evidence }).errors.includes('elements:uncertainty_missing'));
  const notAllowed = validateAnswer(good(), { decision: { ...decision, allowAstrology: false }, evidence });
  assert.ok(notAllowed.errors.includes('claims:astrology_not_allowed'));
  assert.equal(notAllowed.answer, null, 'never hand back the draft');
});

test('schema problems are rejected', () => {
  assert.equal(validateAnswer(null, { decision, evidence }).status, 'invalid');
  assert.ok(validateAnswer({ text: '', claims: [] }, { decision, evidence }).errors.includes('schema:text'));
  assert.ok(validateAnswer({ text: 'x', claims: 'no' }, { decision, evidence }).errors.includes('schema:claims'));
  assert.deepEqual(parseModelAnswer('```json\n{"text":"hi","claims":[]}\n```'), { text: 'hi', claims: [] });
  assert.throws(() => parseModelAnswer('sorry, I cannot'));
});

const BLOCKED = [
  ['death_lifespan_prediction', 'You will die at the age of 72.'],
  ['death_lifespan_prediction', 'Your lifespan is 68 years.'],
  ['death_lifespan_prediction', 'உங்கள் ஆயுள் 72 வயது வரை.'],
  ['death_lifespan_prediction', 'இந்த தசையில் மரணம் ஏற்படும்.'],
  ['death_lifespan_prediction', 'Maraka dasa starts in 2031.'],
  ['disease_prediction', 'You will develop diabetes after 50.'],
  ['disease_prediction', 'உங்களுக்கு சர்க்கரை நோய் வரும்.'],
  ['accusation', 'Your wife will cheat on you during this bhukti.'],
  ['accusation', 'ஒரு பெண் வந்து உங்களை ஏமாற்றுவார்.'],
  ['accusation', 'பெண்களிடம் ஜாக்கிரதை; உங்கள் பணத்தை எடுத்துவிடுவார்கள்.'],
  ['accusation', 'This widow is unlucky for her next husband.'],
  ['accident_date', 'A heavy accident will happen on 12 March.'],
  ['accident_date', 'இந்தக் காலத்தில் பெரிய விபத்து கண்டம்.'],
  ['dated_event_promise', 'You will get a job on 17 November.'],
  ['dated_event_promise', 'Your job will arrive on 17 November.'],
  ['dated_event_promise', 'வேலை 17 நவம்பர் அன்று கிடைக்கும்.'],
  ['guaranteed_outcome', 'Success is guaranteed this month.'],
  ['guaranteed_outcome', 'வெற்றி நிச்சயம்.'],
  ['paid_remedy_as_protection', 'You must buy this gemstone ring to stay safe.'],
  ['paid_remedy_as_protection', 'This homam will protect you from all harm.'],
  ['paid_remedy_as_protection', 'ஹோமம் கட்டாயம் செய்ய வேண்டும்.'],
  ['probability_of_betrayal_or_accident', 'There is a 70% chance of betrayal this year.'],
  ['probability_of_betrayal_or_accident', 'The probability of accident is high.'],
  ['emergency_delay', 'Postpone the surgery until Rahu Kalam ends.'],
  ['emergency_delay', 'Wait for a better time before going to the hospital.'],
  ['emergency_delay', 'அறுவை சிகிச்சையைத் தள்ளி வையுங்கள்.'],
  ['unsafe_permission', 'No need to wear a helmet this week, your dasa protects you.'],
  ['unsafe_permission', 'It is safe to drive after drinking during Guru bhukti.'],
  ['adult_minor_facilitation', 'A good time to meet the 15 year old is Friday evening.'],
  ['private_profile_leak', 'Her chats show that she likes someone.'],
];
for (const [cls, text] of BLOCKED) {
  test(`validator blocks ${cls}: "${text}"`, () => {
    const hits = scanProhibited(text, ALWAYS_PROHIBITED);
    assert.ok(hits.some((h) => h.class === cls), JSON.stringify(hits));
    const a = { ...good(), text: `You asked a question. ${text}` };
    const v = validateAnswer(a, { decision, evidence });
    assert.equal(v.status, 'invalid');
    assert.equal(v.answer, null);
  });
}

const ALLOWED = [
  'This does not guarantee a job.',
  'No chart can say that anyone will die, and I do not predict lifespan.',
  'ஜாதகத்திலிருந்து விபத்து நடக்கும் என்று உறுதியாகக் கூற முடியாது.',
  'Do not delay hospital care for Rahu Kalam.',
  'A horoscope cannot show whether your wife will cheat.',
  'புதிய உறவுகளில் அவசரப்படாமல், நம்பிக்கையை மெதுவாக வளர்த்துக்கொள்ளுங்கள். பணம் அனுப்பும் முன் தகவல்களைச் சரிபார்க்கவும்.',
  'Under your selected tradition, this period is associated with learning and preparation.',
];
for (const text of ALLOWED) {
  test(`validator allows careful wording: "${text.slice(0, 50)}"`, () => {
    assert.deepEqual(scanProhibited(text, ALWAYS_PROHIBITED), []);
  });
}

test('minor-specific classes block romantic forecasts; deadline mode blocks "wait"', () => {
  assert.ok(scanProhibited('Love will come to you soon.', MINOR_PROHIBITED).some((h) => h.class === 'romantic_forecast'));
  assert.ok(scanProhibited('உங்கள் காதல் கைகூடும்.', MINOR_PROHIBITED).some((h) => h.class === 'romantic_forecast'));
  assert.deepEqual(scanProhibited('Love will come to you soon.', ALWAYS_PROHIBITED), []);
  assert.ok(scanProhibited('A better time is coming, so wait.', ALWAYS_PROHIBITED, { deadline: true }).some((h) => h.class === 'emergency_delay'));
  assert.deepEqual(scanProhibited('Keep your appointment; do not wait for a better time.', ALWAYS_PROHIBITED, { deadline: true }), []);
});

test('private values (DOB, birthplace) in a draft are blocked', () => {
  const a = { ...good(), text: 'Born on 1990-01-01 you are a leader.' };
  assert.ok(validateAnswer(a, { decision, evidence, privateValues: ['1990-01-01'] }).errors.includes('prohibited:private_profile_leak'));
});

test('model drafts are validated; failure or timeout returns the fallback signal, never the draft', async () => {
  process.env.ANTHROPIC_API_KEY = 'test-key-not-used';
  try {
    setModelCallerForTests(async () => JSON.stringify(good()));
    const ok = await answerWithEvidence({ system: 's', messages: [{ role: 'user', content: 'q' }], decision, evidence, lang: 'en' });
    assert.equal(ok.source, 'ai');
    assert.equal(ok.validation.status, 'valid');

    setModelCallerForTests(async () => JSON.stringify({ ...good(), text: 'You will die at 70.' }));
    const bad = await answerWithEvidence({ system: 's', messages: [{ role: 'user', content: 'q' }], decision, evidence });
    assert.equal(bad.ok, false);
    assert.equal(bad.text, undefined);
    assert.equal(bad.validation.status, 'invalid');

    setModelCallerForTests(async () => 'plain text, not JSON');
    assert.equal((await answerWithEvidence({ system: 's', messages: [{ role: 'user', content: 'q' }], decision, evidence })).validation.status, 'invalid');

    setModelCallerForTests(() => new Promise(() => {}));
    const slow = await answerWithEvidence({ system: 's', messages: [{ role: 'user', content: 'q' }], decision, evidence, timeoutMs: 30 });
    assert.equal(slow.validation.status, 'timeout');
  } finally {
    setModelCallerForTests(null);
    delete process.env.ANTHROPIC_API_KEY;
  }
});

test('calendar age: birthdays, leap days and the reference zone', () => {
  assert.equal(ageOn('2008-10-06', '2026-10-06'), 18);
  assert.equal(ageOn('2008-10-07', '2026-10-06'), 17);
  assert.equal(ageOn('2008-02-29', '2026-02-28'), 18);
  assert.equal(ageOn('2008-02-29', '2026-02-27'), 17);
  assert.equal(ageOn('2030-01-01', '2026-01-01'), null);
  assert.equal(ageBand(5), '0-5');
  assert.equal(ageBand(12), '6-12');
  assert.equal(ageBand(17), '13-17');
  assert.equal(ageBand(60), '60+');
  // 2026-10-05 20:00 UTC is already 6 October in India (+5:30) but still 5 October in UTC.
  const at = new Date('2026-10-05T20:00:00Z');
  assert.equal(referenceDate({ now: at, zone: 'Asia/Kolkata' }).date, '2026-10-06');
  assert.equal(referenceDate({ now: at, tzHours: 5.5 }).date, '2026-10-06');
  assert.equal(referenceDate({ now: at }).date, '2026-10-05');
  const intent = classifyConversation(['hello']);
  const turning18 = resolveContext({ body: { speaker: { dob: '2008-10-06' }, loc: { tz: 5.5 } }, intent, now: at });
  assert.equal(turning18.speaker.age, 18);
  assert.equal(turning18.speaker.ageSource, 'profile');
});

test('context keeps speaker, chart subject and participants separate', () => {
  const intent = classifyConversation(['my girlfriend is 15']);
  const c = resolveContext({ body: { speaker: { age: 80 }, subject: { relation: 'daughter', dob: '2019-01-01' } }, intent, turns: ['my girlfriend is 15'], now: new Date('2026-10-06T00:00:00Z') });
  assert.equal(c.speaker.age, 80);
  assert.equal(c.subject.age, 7);
  assert.equal(c.speaker.type, 'guardian');
  assert.ok(c.participants.some((p) => p.role === 'girlfriend' && p.age === 15 && p.ageSource === 'chat'));
  assert.ok(c.participants.some((p) => p.role === 'chart_subject' && p.minor));
  assert.equal(c.schemaVersion, 'ctx-1.0.0');
});

test('audit events never store raw text, dates of birth or locations', () => {
  resetAudit();
  recordPolicyEvent({ route: 'adult_guidance', reasons: ['adult_ordinary'], message: 'I was born 1990-01-01 in Chennai', dob: '1990-01-01', loc: { lat: 13 }, versions: { policy: 'x' } });
  const s = JSON.stringify(auditSnapshot());
  assert.doesNotMatch(s, /1990|Chennai|lat/);
  assert.match(s, /adult_guidance/);
});
