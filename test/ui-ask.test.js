// Ask Thunai (offline): the on-device router must answer the question that was actually asked —
// Tamil script, Tanglish and English — and never fall back to generic "today" text for a life topic.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// public/ask-thunai.js imports './shared/…' (the layout of the built app), so load it from a temp copy.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'thunai-ask-'));
fs.copyFileSync(path.join(root, 'public/ask-thunai.js'), path.join(dir, 'ask-thunai.js'));
fs.symlinkSync(path.join(root, 'shared'), path.join(dir, 'shared'), 'dir');
fs.writeFileSync(path.join(dir, 'package.json'), '{"type":"module"}');
const { detectTopic, topicAnswer } = await import(pathToFileURL(path.join(dir, 'ask-thunai.js')).href);
const { birthChart } = await import(pathToFileURL(path.join(root, 'shared/astro.js')).href);

test('topic router understands Tamil, Tanglish and English spellings', () => {
  const cases = {
    'Enaku rendavathu thirumanam siyalama': 'second_marriage',
    'எனக்கு இரண்டாவது திருமணம் நடக்குமா': 'second_marriage',
    'marumanam pannalama': 'second_marriage',
    '2nd marriage possible?': 'second_marriage',
    'kalyanam eppo': 'marriage',
    'Enaku vela eppo kidaikum': 'job',
    'Will I get a promotion this year?': 'career',
    'business pannalama': 'business',
    'கடன் எப்போது தீரும்': 'loan',
    'velinadu poga mudiyuma': 'travel',
    'kozhanthai eppo': 'child',
    'sontha veedu eppo': 'property',
    'udambu epdi irukkum': 'health',
    'court case jeyikkuma': 'court',
    'padippu eppadi': 'education',
  };
  for (const [q, want] of Object.entries(cases)) assert.equal(detectTopic(q), want, q);
});

test('a life-topic answer has a headline, periods, do / avoid, a free parigaram and three follow-ups — no referrals', () => {
  const chart = birthChart({ date: '1982-05-14', time: '06:30:00', lat: 13.0827, lon: 80.2707, tz: 5.5 });
  for (const lang of ['ta', 'en']) {
    const a = topicAnswer({ topic: 'second_marriage', question: 'Enaku rendavathu thirumanam siyalama', chart, lang, name: 'Suresh', life: { gender: 'male' } });
    const keys = a.sections.map((s) => s.key);
    for (const k of ['answer', 'periods', 'dos', 'donts', 'remedy', 'chart']) assert.ok(keys.includes(k), `${lang}: ${k}`);
    assert.equal(a.followups.length, 3);
    assert.doesNotMatch(a.text, /astrologer|ஜோதிடர|not a prediction|expert review|death|lifespan|accident|affair|மரணம்|ஆயுள்/i);
    assert.match(a.sections[0].lines[0], lang === 'ta' ? /மறுமண/ : /second marriage/i);
  }
});
