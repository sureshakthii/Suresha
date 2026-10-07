// Daily Ithihasa: series format, episode numbering, Tamil length (~15 minutes aloud), daily unlock by the residence
// date (across time zones), resume, streak, premium gating (open unless BILLING_ENFORCE) and prohibited wording.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as ith from '../shared/ithihasa/index.js';
import { gateAllows, GATE_ADDS, PLAN_FEATURE_LINES } from '../shared/plan-gates.js';
import { findProhibited } from '../shared/themes.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'shared/ithihasa');
const present = ith.SERIES_META.filter((m) => fs.existsSync(path.join(dir, m.file)));

test('series registry: Ramayanam and Mahabharatham, files resolved next to the index', () => {
  assert.deepEqual(ith.SERIES_META.map((m) => m.id), ['ramayanam', 'mahabharatham']);
  assert.ok(present.some((m) => m.id === 'ramayanam'), 'ramayanam.js must exist');
  for (const s of ith.SERIES_LIST) assert.equal(typeof s.load, 'function');
});

for (const meta of present) {
  test(`${meta.id}: format, continuous numbering, Tamil length, no prohibited wording`, async () => {
    const mod = await import(pathToFileURL(path.join(dir, meta.file)).href);
    const s = mod.SERIES;
    if (!s?.episodes?.length) return; // a series still being written is skipped
    assert.equal(s.id, meta.id);
    assert.deepEqual(ith.validateSeries(s, { minWords: 1250, maxWords: 1750 }), []);
    s.episodes.forEach((e, i) => assert.equal(e.n, i + 1, `episode numbering at index ${i}`));
    for (const e of s.episodes) {
      const m = ith.minutesOf(e);
      assert.ok(m >= 12 && m <= 18, `${e.id}: ${m} minutes`);
      assert.ok(ith.previewParas(e) >= 1 && ith.previewParas(e) < e.ta.length, `${e.id}: preview must be shorter than the episode`);
      for (const k of ['ta', 'en']) assert.ok(e.summary[k].split(/(?<=[.!?।])\s+/).length <= 4, `${e.id}: summary.${k} should be 2–3 sentences`);
    }
    assert.deepEqual(findProhibited(s), [], 'prohibited wording');
    // Devotional, non-political: no party / election / caste talk in the story text.
    const all = JSON.stringify(s);
    for (const re of [/\b(BJP|DMK|AIADMK|Congress party|election|political part(y|ies)|caste)\b/i, /தேர்தல்|அரசியல்\s*கட்சி|(^|[\s(“'])(சாதி|ஜாதி)(யை|யின்|கள்|ப்|[\s,.]|$)/]) {
      const m = re.exec(all);
      assert.ok(!m, `${meta.id} mentions "${m?.[0]}"`);
    }
    // Loads lazily through the index (and is the same object on a second call — cached).
    const a = await ith.loadSeries(meta.id);
    assert.equal(a, await ith.loadSeries(meta.id));
    assert.equal(a.episodes.length, s.episodes.length);
  });
}

test('ramayanam: 30 episodes across the seven kandams in order, Kamba notes marked', async () => {
  const { SERIES } = await import('../shared/ithihasa/ramayanam.js');
  const parts = SERIES.episodes.map((e) => e.part.en);
  const order = ['Bala', 'Ayodhya', 'Aranya', 'Kishkindha', 'Sundara', 'Yuddha'];
  let last = -1;
  for (const p of parts) { const k = order.findIndex((o) => p.startsWith(o)); assert.ok(k >= last, `kandam order at ${p}`); last = Math.max(last, k); }
  if (SERIES.episodes.length === 30) {
    for (const k of order) assert.ok(parts.some((p) => p.startsWith(k)), `${k} Kandam present`);
    assert.ok(parts.some((p) => /Uttara/.test(p)), 'Uttara Kandam present');
  }
  assert.ok(SERIES.episodes.filter((e) => e.ta.some((p) => p.includes('கம்பர்'))).length >= Math.min(10, SERIES.episodes.length), 'Kamba Ramayanam notes');
});

test('residence date: the same instant is a different day in Chennai, Dubai and New York', () => {
  const t = new Date('2026-10-07T20:00:00Z'); // 01:30 on 8 Oct in Chennai, 00:00 in Dubai, 16:00 on 7 Oct in New York
  assert.equal(ith.todayIn('Asia/Kolkata', t), '2026-10-08');
  assert.equal(ith.todayIn('Asia/Dubai', t), '2026-10-08');
  assert.equal(ith.todayIn('America/New_York', t), '2026-10-07');
  assert.equal(ith.todayIn(5.5, t), '2026-10-08'); // a plain UTC offset works too
  assert.equal(ith.todayIn('Not/AZone', t), '2026-10-07');
});

test('daily unlock: episode 1 open; the next opens the day after the previous is finished; no pile-up after a break', () => {
  let p = ith.newProgress('2026-10-07');
  assert.equal(ith.unlockedUpTo(p, 30, '2026-10-07'), 1);
  assert.deepEqual(ith.episodeFor(p, 30, '2026-10-07'), { n: 1, kind: 'today', para: 0 });
  p = ith.markDone(p, 1, '2026-10-07');
  assert.equal(ith.unlockedUpTo(p, 30, '2026-10-07'), 1, 'same day: episode 2 still waits');
  assert.equal(ith.episodeFor(p, 30, '2026-10-07').kind, 'waiting');
  assert.equal(ith.episodeFor(p, 30, '2026-10-07').nextOn, '2026-10-08');
  assert.equal(ith.unlockedUpTo(p, 30, '2026-10-08'), 2, 'next day: episode 2 opens');
  assert.ok(ith.isUnlocked(p, 30, 1, '2026-10-08'), 'completed episodes stay open');
  assert.ok(!ith.isUnlocked(p, 30, 3, '2026-10-08'));
  // A ten-day break opens only the one next episode.
  assert.equal(ith.unlockedUpTo(p, 30, '2026-10-18'), 2);
  // Across a time-zone move: completed late evening in Chennai, opened in New York "the same evening" (still 7 Oct there).
  const done = ith.markDone(ith.newProgress('2026-10-07'), 1, ith.todayIn('Asia/Kolkata', new Date('2026-10-07T16:00:00Z')));
  assert.equal(ith.unlockedUpTo(done, 30, ith.todayIn('America/New_York', new Date('2026-10-08T02:00:00Z'))), 1);
  assert.equal(ith.unlockedUpTo(done, 30, ith.todayIn('Asia/Kolkata', new Date('2026-10-07T19:00:00Z'))), 2);
  // The end of the series.
  let all = ith.newProgress('2026-01-01');
  for (let n = 1; n <= 3; n++) all = ith.markDone(all, n, ith.addDays('2026-01-01', n - 1));
  assert.equal(ith.episodeFor(all, 3, '2026-02-01').kind, 'finished');
});

test('resume and "continue yesterday’s": the reader returns to the paragraph where they stopped', () => {
  let p = ith.newProgress('2026-10-07');
  p = ith.savePosition(p, 1, 6, '2026-10-07', 1000);
  assert.deepEqual(ith.episodeFor(p, 30, '2026-10-07'), { n: 1, kind: 'resume', para: 6 });
  assert.deepEqual(ith.episodeFor(p, 30, '2026-10-08'), { n: 1, kind: 'continue', para: 6 });
  assert.equal(ith.resumeAt(p, 1, 20), 6);
  assert.equal(ith.resumeAt(p, 1, 4), 3, 'clamped to the paragraphs that exist');
  assert.equal(ith.resumeAt(p, 2, 20), 0, 'another episode starts at the top');
  p = ith.markDone(p, 1, '2026-10-08');
  assert.equal(p.pos, null, 'finishing clears the position');
  assert.equal(p.done[1], '2026-10-08');
  assert.equal(ith.markDone(p, 1, '2026-10-09').done[1], '2026-10-08', 'first completion date is kept');
});

test('streak: consecutive residence days; resets after a missed day', () => {
  let p = ith.newProgress('2026-10-01');
  p = ith.markDone(p, 1, '2026-10-01');
  p = ith.markDone(p, 2, '2026-10-02');
  p = ith.markDone(p, 3, '2026-10-03');
  assert.equal(ith.currentStreak(p, '2026-10-03'), 3);
  assert.equal(ith.currentStreak(p, '2026-10-04'), 3, 'still alive the next day');
  assert.equal(ith.currentStreak(p, '2026-10-05'), 0, 'a missed day ends it');
  p = ith.markDone(p, 4, '2026-10-06');
  assert.equal(ith.currentStreak(p, '2026-10-06'), 1);
  assert.equal(ith.doneCount(p), 4);
});

test('premium gate: open without BILLING_ENFORCE; free = intro + episode 1 + preview; Personal/Family open all', async () => {
  assert.ok(GATE_ADDS.ithihasa && GATE_ADDS.ithihasa.adds.length >= 2);
  assert.ok(PLAN_FEATURE_LINES.free.length && PLAN_FEATURE_LINES.paid.length);
  const free = { predictions: false };
  const personal = { predictions: true };
  assert.equal(gateAllows(free, false, 'ithihasa'), true, 'not enforced → open');
  assert.equal(gateAllows(null, true, 'ithihasa'), true, 'billing not loaded → open');
  assert.equal(gateAllows(free, true, 'ithihasa'), false);
  assert.equal(gateAllows(personal, true, 'ithihasa'), true);
  assert.equal(ith.episodeAccess(1, false), 'full');
  assert.equal(ith.episodeAccess(2, false), 'preview');
  assert.equal(ith.episodeAccess(2, true), 'full');
  const { SERIES } = await import('../shared/ithihasa/ramayanam.js');
  const e1 = SERIES.episodes[0];
  assert.equal(ith.readableParas(e1, false), e1.ta.length);
  const last = SERIES.episodes[SERIES.episodes.length - 1];
  if (last.n > 1) {
    const k = ith.readableParas(last, false);
    const words = ith.wordCount(last.ta.slice(0, k));
    assert.ok(k < last.ta.length && words >= 200 && words <= 400, `preview ≈ 2 minutes (${words} words)`);
    assert.equal(ith.readableParas(last, true), last.ta.length);
  }
});

test('"previously" recap is one line from the previous episode', async () => {
  const { SERIES } = await import('../shared/ithihasa/ramayanam.js');
  assert.equal(ith.previously(SERIES, 1, 'ta'), '');
  if (SERIES.episodes.length > 1) {
    const line = ith.previously(SERIES, 2, 'ta');
    assert.ok(line && SERIES.episodes[0].summary.ta.startsWith(line) && line.length < SERIES.episodes[0].summary.ta.length + 1);
  }
});

test('wiring: screen registered, in the tool registry (worship), precached; series data not precached', () => {
  const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
  assert.match(read('public/screens-ithihasa.js'), /registerScreen\('ithihasa'/);
  assert.match(read('public/app.js'), /import '\.\/screens-ithihasa\.js'/);
  assert.match(read('public/tool-registry.js'), /id: 'ithihasa', group: 'worship'/);
  const sw = read('public/sw.js');
  assert.ok(sw.includes("'/screens-ithihasa.js'") && sw.includes("'/shared/ithihasa/index.js'"));
  assert.ok(!sw.includes("'/shared/ithihasa/ramayanam.js'") && !sw.includes("'/shared/ithihasa/mahabharatham.js'"), 'series files are lazy');
  assert.match(read('public/screens-ithihasa.js'), /ta-IN/);
  assert.match(read('public/screens-ithihasa.js'), /உங்கள் கருவியில் தமிழ்க் குரல் இல்லை/);
});
