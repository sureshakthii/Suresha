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

test('marriage report: 25-year timeline from the wedding, children after 9 months', () => {
  const r = marriageReport(bride, groom, { weddingDate: wedding });
  assert.equal(r.porutham.rows.length, 10);
  assert.equal(r.timeline.length, 25);
  assert.equal(r.timeline[0].year, 2026);
  for (const y of r.timeline) assert.ok(['good', 'steady', 'care'].includes(y.level));
  for (const w of r.children) assert.ok(w.from - wedding >= 260 * 86400000);
  assert.ok(['excellent', 'good', 'effort', 'consult'].includes(r.verdict));
  assert.ok(r.total >= 0 && r.total <= 100);
});

test('partnership report: roles, timeline and guidance', () => {
  const r = partnershipReport(bride, groom, { startDate: new Date('2026-11-01T00:00:00Z') });
  assert.equal(r.roles.length, 5);
  for (const x of r.roles) assert.ok(['a', 'b', 'both'].includes(x.best));
  assert.equal(r.timeline.length, 15);
  assert.ok(r.guidance.length >= 4);
  assert.ok(r.overall >= 10 && r.overall <= 98);
});
