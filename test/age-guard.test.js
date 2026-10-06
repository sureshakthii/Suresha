// Age guard (shared/age-guard.js): age of the chart owner is the top-most filter on every surface.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  ageProfile, guardBand, topicAllowed, suggestionsFor, ageGuardAnswer, guardAnswer, adultText, lifeQuestionAllowed,
  categoryAllowed, localToday, BAND_RULES, MINOR_PROHIBITED, REVIEWED_TEXT,
} from '../shared/age-guard.js';
import { birthChart } from '../shared/astro.js';
import { chartFacts, composeAnswer } from '../shared/guidance.js';
import { timeReliability } from '../shared/birthtime.js';
import { lifeRoadmap } from '../shared/roadmap.js';
import { CATEGORIES } from '../shared/prasna.js';
import { QUESTIONS } from '../shared/predict.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// public/ask-thunai.js imports './shared/…' (the built app layout), so load it from a temp copy.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'thunai-age-'));
fs.copyFileSync(path.join(root, 'public/ask-thunai.js'), path.join(dir, 'ask-thunai.js'));
fs.symlinkSync(path.join(root, 'shared'), path.join(dir, 'shared'), 'dir');
fs.writeFileSync(path.join(dir, 'package.json'), '{"type":"module"}');
const { detectTopic, topicAnswer, generalFollowups } = await import(pathToFileURL(path.join(dir, 'ask-thunai.js')).href);

const TODAY = '2026-10-06';
const NOW = new Date('2026-10-06T06:00:00Z');
const person = (date) => ({ name: 'P', date, time: '10:00:00', lat: 13.0827, lon: 80.2707, tz: 5.5 });
const SIX = person('2020-03-12');
const FIFTEEN = person('2011-05-20');
const THIRTY_FIVE = person('1991-05-14');
const ADULT_CHIP = /திருமண|marri|wedding|career|job|வேலை|தொழில்|money|பணம்|பண நிலை|business|வியாபார|loan|கடன்|court|வழக்கு|porutham|பொருத்தம்/i;
const QUESTIONS_ASKED = ['எனக்கு எப்போது திருமணம் நடக்கும்?', 'Enaku eppo velai kidaikum', 'When will I get married?', 'kalyanam eppo', 'business pannalama', 'When will my debts clear?'];

test('bands: 0–5, 6–12, 13–17, adult and unknown, from the calendar date of birth', () => {
  const band = (dob) => ageProfile(dob, { today: TODAY }).band;
  assert.equal(band('2026-01-01'), '0-5');
  assert.equal(band('2021-10-07'), '0-5'); // turns 5 tomorrow → 4
  assert.equal(band('2020-10-06'), '6-12'); // 6th birthday today
  assert.equal(band('2014-10-07'), '6-12'); // 12 until tomorrow
  assert.equal(band('2013-10-06'), '13-17');
  assert.equal(band('2008-10-07'), '13-17'); // 18 tomorrow → still a minor today
  assert.equal(band('2008-10-06'), 'adult'); // 18th birthday today
  assert.equal(band('1950-01-01'), 'adult');
  assert.equal(ageProfile(null).band, 'unknown');
  assert.equal(ageProfile({ name: 'x' }).band, 'unknown');
  assert.equal(ageProfile('not a date').band, 'unknown');
  assert.equal(ageProfile('2030-01-01', { today: TODAY }).band, 'unknown'); // future DOB is not an age
  const org = ageProfile({ relation: 'organization', date: '2025-01-01' });
  assert.ok(org.adult && org.organization);
  assert.equal(guardBand(17), '13-17');
  assert.equal(guardBand(18), 'adult');
  // member objects and charts carry the DOB in `date`
  assert.equal(ageProfile({ date: '2020-03-12', relation: 'son' }, { today: TODAY }).age, 6);
  assert.equal(ageProfile(birthChart(SIX), { now: NOW }).age, 6);
});

test('birthdays and the leap day: a 29 Feb birthday is reached on 28 Feb in non-leap years', () => {
  assert.equal(ageProfile('2008-02-29', { today: '2026-02-27' }).band, '13-17');
  assert.equal(ageProfile('2008-02-29', { today: '2026-02-28' }).band, 'adult');
  assert.equal(ageProfile('2008-02-29', { today: '2026-02-28' }).age, 18);
  assert.equal(ageProfile('2020-02-29', { today: '2028-02-28' }).age, 7);
  assert.equal(ageProfile('2020-02-29', { today: '2028-02-29' }).age, 8);
  // "today" is the local calendar date at the place's UTC offset
  assert.equal(localToday(5.5, new Date('2026-10-05T19:00:00Z')), '2026-10-06');
  assert.equal(localToday(-5, new Date('2026-10-06T03:00:00Z')), '2026-10-05');
});

test('topic policy per band: marriage, job, money, court are adult-only; study and health are open', () => {
  const p = (dob) => ageProfile(dob, { today: TODAY });
  for (const t of ['marriage', 'second_marriage', 'love', 'porutham', 'job', 'career', 'business', 'loan', 'money', 'court', 'property', 'child']) {
    for (const dob of ['2023-01-01', '2020-03-12', '2011-05-20']) assert.equal(topicAllowed(t, p(dob)), false, `${t} ${dob}`);
    assert.equal(topicAllowed(t, p('1991-05-14')), true, t);
    assert.equal(topicAllowed(t, ageProfile(null)), false, `${t} needs a DOB`);
  }
  for (const t of ['education', 'health', 'family', 'temple']) assert.equal(topicAllowed(t, p('2023-01-01')), true, t);
  assert.equal(topicAllowed('compass', p('2020-03-12')), false); // career aptitude is for teens
  assert.equal(topicAllowed('compass', p('2011-05-20')), true);
  assert.equal(topicAllowed('competition', p('2023-01-01')), false);
  assert.equal(topicAllowed('competition', p('2020-03-12')), true);
});

test('Prasnam categories and Life questions are filtered by age', () => {
  const kid = ageProfile('2020-03-12', { today: TODAY });
  const teen = ageProfile('2011-05-20', { today: TODAY });
  const adult = ageProfile('1991-05-14', { today: TODAY });
  const cats = (pr) => CATEGORIES.filter((c) => !c.event && categoryAllowed(c.id, pr)).map((c) => c.id);
  for (const bad of ['bride_groom', 'business', 'loan', 'lend_money', 'contract', 'court', 'property', 'job_change', 'tech_partner', 'cheque', 'client', 'office']) {
    assert.ok(!cats(kid).includes(bad) && !cats(teen).includes(bad), bad);
  }
  for (const ok of ['education', 'travel', 'surgery']) assert.ok(cats(kid).includes(ok), ok);
  assert.ok(cats(teen).includes('visa') && !cats(kid).includes('visa'));
  assert.equal(cats(adult).length, CATEGORIES.filter((c) => !c.event).length); // adults: unchanged
  const lq = (pr) => [...QUESTIONS.map((q) => q.id), 'compass', 'kula'].filter((id) => lifeQuestionAllowed(id, pr));
  assert.deepEqual(lq(kid), ['kula']);
  assert.deepEqual(lq(teen).sort(), ['compass', 'education', 'kula']);
  assert.equal(lq(adult).length, QUESTIONS.length + 2);
});

test('suggestion chips are generated per age band — no marriage / job chips under 18', () => {
  const adultList = [['When will I get married?', 'எனக்கு எப்போது திருமணம் நடக்கும்?'], ['Which temple should I visit?', 'எந்தக் கோவிலுக்குச் செல்லலாம்?']];
  for (const dob of ['2023-01-01', '2020-03-12', '2011-05-20']) {
    const chips = suggestionsFor(ageProfile(dob, { today: TODAY }), adultList);
    assert.ok(chips.length >= 3, dob);
    for (const c of chips) assert.doesNotMatch(`${c.en} ${c.ta}`, ADULT_CHIP, `${dob}: ${c.en}`);
  }
  const six = suggestionsFor(ageProfile('2020-03-12', { today: TODAY })).map((c) => c.ta);
  assert.ok(six.includes('படிப்பில் கவனம் கூட என்ன செய்யலாம்?'));
  assert.ok(six.includes('ஆரோக்கியமாக இருக்க உணவு?'));
  assert.ok(six.includes('இன்று எந்த ஸ்லோகம் சொல்லலாம்?'));
  // adults: the surface's own list, unchanged
  assert.deepEqual(suggestionsFor(ageProfile('1991-05-14', { today: TODAY }), adultList).map((c) => c.en), adultList.map((x) => x[0]));
  for (const f of generalFollowups(ageProfile('2011-05-20', { today: TODAY }))) assert.doesNotMatch(`${f.en} ${f.ta}`, ADULT_CHIP);
  assert.match(generalFollowups(ageProfile('1991-05-14', { today: TODAY }))[0].en, /married/);
});

for (const [label, who] of [['6-year-old', SIX], ['15-year-old', FIFTEEN]]) {
  test(`Ask Thunai engine: a ${label} gets no meter, no percentage and no marriage / job prediction`, () => {
    const chart = birthChart(who);
    for (const q of QUESTIONS_ASKED) {
      const topic = detectTopic(q);
      assert.ok(topic, q);
      for (const lang of ['ta', 'en']) {
        const a = topicAnswer({ topic, question: q, chart, lang, name: 'Arun', now: NOW });
        assert.equal(a.intent, 'age_guard', `${q} ${lang}`);
        assert.equal(a.meter, null, q);
        assert.doesNotMatch(a.text, /\d+\s*%/, q);
        assert.ok(!a.sections.some((s) => ['periods', 'chart'].includes(s.key)), `${q}: no periods / chart reading`);
        assert.doesNotMatch(a.text, /Dasa|Bhukti|தசை|புக்தி|window|சாதகமான காலம்/, q);
        assert.equal(a.followups.length, 3);
        for (const f of a.followups) assert.doesNotMatch(f, ADULT_CHIP, `${q}: chip ${f}`);
        assert.ok(!a.actions.some((x) => ['couple', 'porutham', 'muhurtham', 'lovematch'].includes(x.go)), q);
      }
    }
    // a 6-year-old hears "for when you grow up"; a 15-year-old asking about marriage gets the reviewed teen wording
    const ta6 = topicAnswer({ topic: 'marriage', question: 'q', chart, lang: 'en', now: NOW }).sections[0].lines[0];
    if (who === SIX) assert.match(ta6, /when you grow up/);
    else assert.equal(ta6, REVIEWED_TEXT.minor_marriage.en);
    // allowed topics still answer, but without a meter and with child-safe lines only
    const study = topicAnswer({ topic: 'education', question: 'padippu eppadi', chart, lang: 'ta', now: NOW });
    assert.notEqual(study.intent, 'age_guard');
    assert.equal(study.meter, null);
    for (const s of study.sections) for (const l of s.lines) assert.equal(adultText(l), false, l);
  });
}

test('shared guidance (composeAnswer) applies the same guard — no meter for a child', () => {
  const fk = chartFacts(birthChart(FIFTEEN), timeReliability(FIFTEEN), NOW);
  for (const q of ['When will I get married?', 'How is my career?', 'panam eppo varum']) {
    const a = composeAnswer({ question: q, lang: 'en', facts: fk });
    assert.equal(a.meter, null, q);
    assert.doesNotMatch(a.text, /\d+\s*%/, q);
  }
});

test('adults are unchanged: a 35-year-old still gets the meter, periods and marriage follow-ups', () => {
  const chart = birthChart(THIRTY_FIVE);
  for (const q of ['எனக்கு எப்போது திருமணம் நடக்கும்?', 'Enaku eppo velai kidaikum', 'When will I get married?']) {
    const a = topicAnswer({ topic: detectTopic(q), question: q, chart, lang: 'ta', name: 'Suresh', now: NOW });
    assert.notEqual(a.intent, 'age_guard');
    assert.ok(a.meter && a.meter.pct >= 45, q);
    assert.ok(a.sections.some((s) => s.key === 'periods'), q);
  }
  const m = topicAnswer({ topic: 'marriage', question: 'q', chart, lang: 'en', now: NOW });
  assert.match(m.followups.join(' '), /wedding|porutham/i);
  // guardAnswer is a no-op for adults
  assert.equal(guardAnswer(m, ageProfile(THIRTY_FIVE, { now: NOW })), m);
});

test('unknown date of birth: general guidance only — adult topics ask for the birth date', () => {
  const a = ageGuardAnswer({ topic: 'marriage', profile: ageProfile(null), lang: 'en' });
  assert.equal(a.meter, null);
  assert.match(a.text, /date of birth/);
  assert.ok(a.actions.some((x) => x.go === 'family'));
});

test('Life Road Map: no career / wealth / marriage scores under 18', () => {
  for (const who of [SIX, FIFTEEN]) {
    const r = lifeRoadmap(birthChart(who), { from: NOW, years: 5 });
    assert.ok(r.minor);
    const ids = r.areas.map((a) => a.id);
    assert.ok(!ids.includes('career') && !ids.includes('wealth'));
    assert.doesNotMatch(r.areas.map((a) => a.en).join(' '), /marriage/i);
    for (const p of r.periods) assert.ok(!('career' in p.scores) && !('wealth' in p.scores));
    assert.ok(r.milestones.every((x) => x.id === 'education'));
    for (const n of r.now) assert.equal(adultText(n), false, n.en);
  }
  const adult = lifeRoadmap(birthChart(THIRTY_FIVE), { from: NOW, years: 5 });
  assert.ok(!adult.minor && adult.areas.some((a) => a.id === 'career'));
});

test('server policy re-uses the shared band rules and reviewed wording (one source)', async () => {
  const pol = await import('../server/policy/age-policy.js');
  const { TEMPLATES } = await import('../server/policy/templates.js');
  assert.equal(pol.BAND_RULES, BAND_RULES);
  assert.equal(pol.MINOR_PROHIBITED, MINOR_PROHIBITED);
  for (const id of ['child_crush', 'teen_romance', 'minor_marriage', 'child_caregiver']) {
    assert.equal(TEMPLATES[id].en, REVIEWED_TEXT[id].en);
    assert.equal(TEMPLATES[id].ta, REVIEWED_TEXT[id].ta);
  }
});
