// Ask Thunai — everyday questions found in the final release QA: safety phrasings in Tanglish, the baby's sex,
// small talk, "what is my Rasi / Lagnam", General-mode festival questions, hymns, other-religion questions (Thunai is
// Hindu-only — owner decision, Oct 2026), Sade Sati length.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'thunai-ask-everyday-'));
fs.copyFileSync(path.join(root, 'public/ask-thunai.js'), path.join(dir, 'ask-thunai.js'));
fs.symlinkSync(path.join(root, 'shared'), path.join(dir, 'shared'), 'dir');
fs.writeFileSync(path.join(dir, 'package.json'), '{"type":"module"}');
const A = await import(pathToFileURL(path.join(dir, 'ask-thunai.js')).href);
await A.loadGeneralKB();
const { birthChart } = await import(pathToFileURL(path.join(root, 'shared/astro.js')).href);
const { chartFacts } = await import(pathToFileURL(path.join(root, 'shared/guidance.js')).href);
const { timeReliability } = await import(pathToFileURL(path.join(root, 'shared/birthtime.js')).href);
const { findProhibited } = await import(pathToFileURL(path.join(root, 'shared/themes.js')).href);

const NOW = new Date('2026-10-07T06:00:00Z');
const LOC = { lat: 13.0827, lon: 80.2707, tz: 5.5, name: 'Chennai' };
const TODAY = { rahuKalam: '12:00 PM – 1:30 PM', yamagandam: '7:30 AM – 9:00 AM', goodTimes: ['3:00 PM (Labam)'], horai: 'Sun', chandrashtamam: false };
function person(m) {
  const chart = birthChart({ date: m.date, time: m.time, lat: LOC.lat, lon: LOC.lon, tz: LOC.tz });
  const rel = timeReliability({ ...m, ...LOC });
  return { m, chart, rel, facts: chartFacts(chart, rel, NOW), prof: A.ageProfile(m.date, { now: NOW }) };
}
const ADULT = person({ id: 'me', relation: 'self', name: 'Karthik', gender: 'male', date: '1996-02-11', time: '07:40:00', timeCertainty: 'exact', maritalStatus: 'single' });
const KID = person({ id: 'kid', relation: 'daughter', name: 'Meena', gender: 'female', date: '2018-06-03', time: '11:20:00', timeCertainty: 'exact' });
// A profile saved by an older version with faith 'christian': the stored value is ignored — everyone gets Hindu content.
const XIAN = person({ id: 'john', relation: 'self', name: 'John', gender: 'male', date: '1990-12-02', time: '14:05:00', timeCertainty: 'exact', faith: 'christian' });
const ask = (p, text, { lang = 'en', mode = 'chart' } = {}) => A.askThunai({
  text, chart: p.chart, rel: p.rel, facts: p.facts, lang, name: p.m.name, today: TODAY, now: NOW, loc: LOC, mode, profile: p.prof,
  speaker: p.m.relation === 'self' ? p.prof : null,
  life: { memberId: p.m.id, relation: p.m.relation, gender: p.m.gender, faith: p.m.faith, maritalStatus: p.m.maritalStatus, birthDate: p.m.date },
});

test('crisis and lifespan phrasings in English and Tanglish get help / a decline, never a reading', () => {
  for (const q of ['I feel like ending my life, nothing works', 'naan saga poren', 'thookula thonga poren', 'I wish I was dead']) {
    const a = ask(ADULT, q);
    assert.equal(a.intent, 'crisis', q);
    assert.match(a.text, /14416/, q);
  }
  for (const q of ['naan evlo varusham uyiroda irupen', 'appa eppo iranthu poivaar', 'en appa eppo die aavar']) assert.equal(ask(ADULT, q).intent, 'death', q);
  // A ritual for a parent who has passed away is not a lifespan question.
  assert.notEqual(ask(ADULT, 'en appa iranthu poittar, tharpanam eppo kudukanum').intent, 'death');
  assert.notEqual(ask(ADULT, 'panam eppo sethu vaikalam').intent, 'death');
});

test('the baby’s sex is never predicted, however it is asked', () => {
  for (const q of ['en manaivi vayitril irukkum kuzhandhai aana penna?', 'ponnu ah paiyana nu solunga', 'will I have a son or daughter']) {
    assert.match(ask(ADULT, q).text, /PCPNDT/, q);
  }
});

test('thanks / hello get a short reply, not a chart reading', () => {
  for (const q of ['thx', 'thank you', 'nandri', 'hi', 'vanakkam']) {
    const a = ask(ADULT, q, { lang: 'ta' });
    assert.equal(a.intent, 'smalltalk', q);
    assert.doesNotMatch(a.text, /தசை|dasa/i, q);
  }
});

test('Rasi / star / Lagnam questions answer from the chart; an unknown birth time says why the Lagnam is missing', () => {
  const a = ask(ADULT, 'en lagnam enna', { lang: 'ta' });
  assert.equal(a.intent, 'identity');
  assert.match(a.sections[0].lines[0], /லக்னம்: கும்பம்/);
  const unk = person({ id: 'u', relation: 'self', name: 'Priya', gender: 'female', date: '1993-08-19', time: '12:00:00', timeCertainty: 'unknown' });
  const b = ask(unk, 'why do you not know my lagna');
  assert.equal(b.intent, 'identity');
  assert.match(b.text, /needs the birth time/);
  // No dated windows invented for an unknown time whose Rasi is uncertain.
  assert.match(ask(unk, 'When will I get a job?').text, /cannot give honest dates/);
});

test('today, this month, this year, Guru peyarchi and a named dasa get their own answers', () => {
  assert.equal(ask(ADULT, 'my star palan today').intent, 'today');
  assert.equal(ask(ADULT, 'intha month nalla irukuma', { lang: 'ta' }).intent, 'month');
  assert.equal(ask(ADULT, 'Tell me my future').intent, 'overview');
  assert.equal(ask(ADULT, 'ஏன் எனக்கு எல்லாம் தாமதமா நடக்குது?', { lang: 'ta' }).intent, 'overview');
  assert.equal(ask(ADULT, 'guru peyarchi 2027 enaku nallatha', { lang: 'ta' }).intent, 'guru');
  assert.match(ask(ADULT, 'Is my rahu dasa bad?').text, /not in Rahu Dasa now/);
});

test('Ezharai Sani is one 7½-year span, never a short retrograde dip', () => {
  for (const p of [ADULT, XIAN]) {
    const t = ask(p, 'Am I going through sade sati?').text;
    const m = /Ezharai Sani runs from about (\w+) (\d{4}) to (\w+) (\d{4})/.exec(t);
    assert.ok(m, t);
    assert.ok(Number(m[4]) - Number(m[2]) >= 6, `${m[0]}`);
  }
});

test('General mode: festival questions that name Saturday or a family word are answered, with tappable follow-ups', () => {
  const a = ask(ADULT, 'purattasi sani kizhamai enna seyyanum', { lang: 'ta', mode: 'general' });
  assert.equal(a.intent, 'general_kb');
  assert.ok(a.followups.every((f) => typeof f === 'string' || (f.label && (f.ask || f.go))));
  assert.equal(ask(ADULT, 'Why do we light lamps on Karthigai?', { mode: 'general' }).topic, 'karthigai-deepam');
  assert.match(ask(ADULT, 'kandha sashti kavasam yaar ezhuthinathu', { lang: 'ta', mode: 'general' }).text, /தேவராய சுவாமிகள்/);
  assert.match(ask(ADULT, 'hanuman chalisa pengal padikalama', { lang: 'ta', mode: 'general' }).text, /பெண்களும்/);
  assert.match(ask(ADULT, 'What is the meaning of Om Namah Shivaya?', { mode: 'general' }).text, /five-syllable/);
  assert.match(ask(ADULT, 'rahu kalam today', { mode: 'general' }).text, /12:00 PM – 1:30 PM/);
  assert.equal(ask(ADULT, 'ramayanam story sollunga', { lang: 'ta', mode: 'general' }).actions[0].go, 'ithihasa');
  assert.equal(ask(ADULT, 'enaku kalyanam eppo', { lang: 'ta', mode: 'general' }).intent, 'mode_switch');
});

test('Hindu-only app: a church / mosque question gets an honest "not covered" answer; plain festival dates stay factual', () => {
  for (const q of ['naan church ku pogalaama sunday', 'Can I go to the mosque on Friday?']) {
    const a = ask(XIAN, q);
    assert.equal(a.intent, 'not_covered', q);
    assert.match(a.text, /Hindu astrology app/, q);
    assert.doesNotMatch(a.text, /God bless|Allah|கர்த்தர்|own faith/i, q);
    assert.equal(findProhibited(a.text).length, 0, q);
  }
  // "When is Christmas / Easter?" is general knowledge: the date only, no practice from another religion.
  assert.match(ask(XIAN, 'Christmas 2026 eppo').text, /25 Dec 2026/);
  assert.match(ask(XIAN, 'When is Easter 2027?').text, /28 Mar 2027/);
  // No per-faith festival list any more: the month's festivals come from the Hindu calendar for everyone.
  const f = ask(XIAN, 'Which festival should I celebrate this month?');
  assert.doesNotMatch(f.text, /All Saints|your faith’s calendar|church \/ mosque/);
});

test('a parent asking on a young child’s profile: "en ponnu" is the child herself, and no reply talks down to the parent', () => {
  const a = ask(KID, 'en ponnu padippu eppadi irukum', { lang: 'ta' });
  assert.equal(a.topic, 'education');
  assert.doesNotMatch(a.text, /சொந்த ஜாதகத்திலிருந்தே/);
  assert.doesNotMatch(ask(KID, 'ival ku kalyanam eppo nadakkum', { lang: 'ta' }).text, /பெரியவரான பிறகு கேட்க/);
  assert.doesNotMatch(ask(KID, 'kids ku endha slogam sollanum', { lang: 'ta' }).text, /பெரியவரான பிறகு/);
  assert.match(ask(KID, 'ponnu romba kobama irukaa enna pannradhu', { lang: 'ta' }).text, /கிரகங்களால் அல்ல/);
});

test('divorce, gold, becoming a doctor and retirement are answered as asked', () => {
  assert.match(ask(ADULT, 'Should I get a divorce?').sections[0].lines[0], /serious decision/);
  assert.equal(ask(ADULT, 'When should I buy gold?').intent, 'gold');
  assert.notEqual(ask(ADULT, 'naan doctor aagalama').topic, 'health');
});

const APPA = person({ id: 'appa', relation: 'father', name: 'Raman', gender: 'male', date: '1954-01-22', time: '05:10:00', timeCertainty: 'exact' });

test('pilgrimage timing is answered as timing (days, season, elder care, journey planner), not a temple list', () => {
  const a = ask(APPA, 'appa Kasi yaathirai pogalaama', { lang: 'ta' });
  assert.equal(a.topic, 'travel');
  assert.match(a.text, /அக்டோபர் – மார்ச்/);
  assert.match(a.text, /மருத்துவ/);
  assert.ok(a.actions.some((x) => x.go === 'journey'));
  assert.doesNotMatch(a.text, /Alangudi|ஆலங்குடி/);
  // From one's own profile about a parent: no dates read from the asker's chart.
  const b = ask(ADULT, 'Is it a good time for appa to go on pilgrimage to Kasi?');
  assert.match(b.text, /their own birth star/);
  assert.doesNotMatch(b.text, /good days by the star are/);
});

test('a profile once saved as Christian asking for a parigaram gets the Hindu parigaram like everyone else', () => {
  const a = ask(XIAN, 'pariharam enna seyyanum', { lang: 'ta' });
  const h = ask(person({ ...XIAN.m, faith: undefined }), 'pariharam enna seyyanum', { lang: 'ta' });
  assert.equal(a.text, h.text, 'the stored faith changes nothing');
  assert.doesNotMatch(a.text, /ஜெபி|கர்த்தர்|வேதாகம|உங்கள் சொந்த நம்பிக்கை/);
  assert.match(a.text, /பரிகார|வழிபாடு|தீபம்/);
  assert.equal(findProhibited(a.text).length, 0);
});

test('writing property to a child is a documentation / registration answer, not house-buying', () => {
  for (const [p, q] of [[APPA, 'appa ku property ezhudhi vaikalama'], [ADULT, 'son ku veedu ezhudhi kodukkalama']]) {
    const a = ask(p, q);
    assert.match(a.text, /registered will/, q);
    assert.match(a.text, /all the children/, q);
  }
  assert.notEqual(ask(ADULT, 'Will I win the property case?').topic, 'property');
});

test('a parent asking on a child’s profile is spoken to about "your daughter", not addressed as the child', () => {
  const a = ask(KID, 'kuzhandhai ku adikadi kaichal varudhu', { lang: 'ta' });
  assert.match(a.sections[0].lines.join(' '), /உங்கள் மகள்/);
  assert.doesNotMatch(a.text, /^Meena, உங்கள்/m);
  assert.doesNotMatch(a.text, /உங்கள் ஆரோக்கியத்தை/);
});

test('"is my wife going to leave me" gets a counselling answer, never a prediction', () => {
  const a = ask(ADULT, 'Is my wife going to leave me');
  assert.match(a.sections[0].lines[0], /will not predict/);
  assert.match(a.text, /181/);
});
