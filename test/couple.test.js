import { test } from 'node:test';
import assert from 'node:assert/strict';
import { birthChart } from '../shared/astro.js';
import { marriageReport, partnershipReport, manaPorutham } from '../shared/couple.js';

const bride = birthChart({ name: 'Meena', date: '1997-11-05', time: '07:45', lat: 9.92, lon: 78.12, tz: 5.5 });
const groom = birthChart({ name: 'Arun', date: '1994-02-18', time: '22:10', lat: 13.08, lon: 80.27, tz: 5.5 });
const wedding = new Date('2026-11-20T06:00:00Z');

test('mana porutham covers six areas (no health/longevity score) with bounded scores', () => {
  const m = manaPorutham(bride, groom);
  assert.equal(m.areas.length, 6);
  assert.ok(!m.areas.some((a) => a.id === 'health'));
  for (const a of m.areas) assert.ok(a.score >= 10 && a.score <= 98, a.id);
  // Symmetry: swapping the two people gives the same overall picture (within rounding).
  assert.ok(Math.abs(manaPorutham(groom, bride).overall - m.overall) <= 3);
});

test('marriage report: timeline covers the first 25 years of marriage — no verdict, no combined score', () => {
  const r = marriageReport(bride, groom, { weddingDate: wedding });
  assert.equal(r.porutham.rows.length, 10);
  assert.equal(r.timeline.length, 25);
  assert.equal(r.timeline[0].year, 2026);
  for (const y of r.timeline) assert.ok(['good', 'steady', 'care'].includes(y.level));
  // Explicit report horizon (a reading window), never an age-80 / lifespan cap.
  assert.equal(r.reportHorizon.label.en, 'First 25 years of marriage');
  assert.equal(r.reportHorizon.label.ta, 'திருமணத்தின் முதல் 25 ஆண்டுகள்');
  assert.equal(r.horizon.getTime(), wedding.getTime() + 25 * 365.25 * 86400000);
  for (const y of r.timeline) assert.ok(y.to <= r.horizon);
  assert.doesNotMatch(JSON.stringify(r.reportHorizon) + JSON.stringify(r.moments), /age.?80|80th|lifespan|ஆயுள்/i);
  // No marry / reject verdict and no combined /100 score.
  for (const k of ['verdict', 'total', 'verdictNote']) assert.equal(r[k], undefined, k);
  assert.equal(r.noVerdict, true);
  assert.equal(r.noCombinedScore, true);
  assert.doesNotMatch(JSON.stringify(r.deep.checks), /\/100/);
});

test('marriage report: no children / santhana timing, no Mangalyam label, no widowhood wording', () => {
  for (const w of [wedding, new Date('2040-01-01T06:00:00Z')]) {
    const r = marriageReport(bride, groom, { weddingDate: w });
    assert.deepEqual(r.moments.map((m) => m.id), ['home', 'wealth', 'care']);
    for (const k of ['children', 'childFallback', 'childrenNote']) assert.equal(r[k], undefined, k);
    const all = JSON.stringify(r);
    assert.doesNotMatch(all, /Mangalyam|மாங்கல்ய|Santhana|சந்தான|widow|விதவை|infertil|infidel|spouse.?s? death/i);
    const h8 = r.deep.houses.bride.find((h) => h.house === 8);
    assert.equal(h8.name.en, '8th house (traditional long-term bond factor)');
  }
});

test('marriage report: unknown birth time marks lagna-based checks as needing birth time', () => {
  const noTime = birthChart({ name: 'U', date: '1997-11-05', time: '12:00', lat: 9.92, lon: 78.12, tz: 5.5, timePrecision: 'unknown' });
  const r = marriageReport(noTime, groom, { weddingDate: wedding });
  assert.equal(r.needsBirthTime, true);
  assert.deepEqual(r.lagnaUnknown, [true, false]);
  assert.ok(r.birthTimeNote.en && r.birthTimeNote.ta);
  assert.equal(r.doshams.bride.chevvai.needsBirthTime, true);
  assert.ok(r.deep.needsBirthTime.includes('lagna'));
});

test('partnership report: roles, timeline and guidance', () => {
  const r = partnershipReport(bride, groom, { startDate: new Date('2026-11-01T00:00:00Z') });
  assert.equal(r.roles.length, 5);
  for (const x of r.roles) assert.ok(['a', 'b', 'both'].includes(x.best));
  assert.equal(r.timeline.length, 15);
  assert.ok(r.guidance.length >= 4);
  assert.equal(r.overall, undefined);
  assert.equal(r.verdict, undefined);
  assert.ok(r.supportive >= 0 && r.supportive <= r.areas.length);
  assert.match(r.summary.en, new RegExp(`^${r.supportive} of 5 traditional areas look supportive`));
  assert.equal(r.reportHorizon.label.en, 'First 15 years of the partnership');
});

test('porutham discussion topics: four optional groups, no scoring', async () => {
  const { DISCUSSION_TOPICS, DISCUSSION_TITLE, KEY_FACTORS_TITLE, DETAILED_VIEW_TITLE } = await import('../shared/porutham.js');
  assert.deepEqual(DISCUSSION_TOPICS.map((t) => t.id), ['expectations', 'money', 'family', 'timing']);
  for (const t of DISCUSSION_TOPICS) assert.ok(t.prompts.length >= 2 && t.prompts.every((q) => q.en && q.ta) && t.score === undefined);
  assert.equal(DISCUSSION_TITLE.ta, 'பேசிப் பார்க்க வேண்டியவை (விருப்பம்)');
  assert.equal(KEY_FACTORS_TITLE.ta, 'முக்கியக் காரணிகள் — பேசி முடிவு செய்யுங்கள்');
  assert.equal(DETAILED_VIEW_TITLE.ta, 'விரிவான பார்வை');
});

test('chevvai exceptions are listed as conditions with a reason', async () => {
  const { doshams } = await import('../shared/porutham.js');
  // Find a chart with raw Chevvai where an exception applies.
  for (let y = 1980; y < 2000; y++) {
    const c = birthChart({ name: 'X', date: `${y}-05-10`, time: '06:00', lat: 13.08, lon: 80.27, tz: 5.5 });
    const d = doshams(c.planets);
    if (d.chevvai.raw && d.chevvai.exceptions.length) {
      for (const e of d.chevvai.exceptions) assert.ok(e.en && e.ta && e.reason.en && e.reason.ta);
      return;
    }
  }
  assert.fail('no chart with an exception found');
});
