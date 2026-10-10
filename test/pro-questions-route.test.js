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
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'thunai-related-route-'));
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
const { ALL_RELATED, relatedAsk } = await import(pathToFileURL(path.join(root, 'shared/pro-questions.js')).href);

// Topics an answer may come back with, per related question (the answer must be about what the person tapped).
const EXPECT = {
  marriage_periods: ['marriage'], marriage_partner: ['marriage'], marriage_delay: ['marriage'],
  career_fields: ['career', 'job'], career_periods: ['job', 'job_change', 'career'], career_business: ['career', 'business'],
  edu_subjects: ['education'], edu_abroad: ['education', 'travel'], property_periods: ['property'], travel_abroad: ['travel'],
  family_harmony: ['family', 'harmony'], dosham_full: ['dosham'], sani_plan: ['sani'], remedy_plan: ['temple', 'remedy'],
  chart_full: ['chart', 'overview'], chart_year: ['overview', 'chart'], chart_dasa: ['dasa'],
};

test('every related question answers its own topic in Tamil and English — never "cannot answer", never another topic', () => {
  assert.deepEqual(Object.keys(EXPECT).sort(), ALL_RELATED.map((r) => r.id).sort(), 'every related question has an expected topic');
  for (const r of ALL_RELATED) {
    for (const lang of ['ta', 'en']) {
      const a = ask(ADULT, relatedAsk(r.id)[lang], { lang });
      assert.ok(!a.honest && a.intent !== 'honest', `${r.id} ${lang}: honest "cannot answer"`);
      assert.ok(EXPECT[r.id].includes(a.topic), `${r.id} ${lang}: got topic ${a.topic}`);
    }
  }
});

test('a tapped related question is answered fresh: an earlier baby-name turn is not carried over', () => {
  const a = A.askThunai({ text: relatedAsk('chart_year').ta, chart: ADULT.chart, rel: ADULT.rel, facts: ADULT.facts, lang: 'ta', name: 'Karthik', today: TODAY, now: NOW, loc: LOC, profile: ADULT.prof, speaker: ADULT.prof, turns: [], life: { memberId: 'me', relation: 'self', gender: 'male', birthDate: ADULT.m.date } });
  assert.notEqual(a.topic, 'naming');
  assert.doesNotMatch(a.text, /நாமாக்ஷரம்|பெயரின் முதல் எழுத்து/);
});
