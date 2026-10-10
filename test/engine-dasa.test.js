// Vimshottari: exact partition of Maha → Bhukti → Pratyantara → Sookshma.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { vimshottari, subPeriods, DASA_YEARS, DASA_ORDER, DASA_YEAR_DAYS, birthChart } from '../shared/astro.js';

const YEAR_MS = DASA_YEAR_DAYS * 86400000;

function assertPartition(parent, kids, label) {
  assert.equal(kids.length, 9, label);
  assert.equal(kids[0].start.getTime(), parent.start.getTime(), `${label} first starts at parent start`);
  assert.equal(kids[8].end.getTime(), parent.end.getTime(), `${label} last ends exactly at parent end`);
  for (let i = 1; i < 9; i++) assert.equal(kids[i].start.getTime(), kids[i - 1].end.getTime(), `${label} contiguous`);
  assert.equal(kids[0].lord, parent.lord, `${label} starts with parent lord`);
  const span = parent.end - parent.start;
  let sum = 0;
  for (const k of kids) {
    const len = k.end - k.start;
    sum += len;
    assert.ok(Math.abs(len - span * DASA_YEARS[k.lord] / 120) <= 1, `${label} ${k.lord} proportion`);
  }
  assert.equal(sum, span, `${label} sum`);
}

test('year length is documented as 365.25 days', () => {
  assert.equal(DASA_YEAR_DAYS, 365.25);
});

test('maha periods: contiguous, 120 years total, balance from Moon', () => {
  const birth = new Date('1990-01-01T04:30:00Z');
  const moon = 85; // Punarpoosam (80°–93°20′, Jupiter), part elapsed
  const v = vimshottari(birth, moon, new Date('2026-10-06T00:00:00Z'));
  assert.equal(v.periods[0].lord, 'Jupiter');
  const total = v.periods.at(-1).end - v.periods[0].start;
  assert.ok(Math.abs(total - 120 * YEAR_MS) <= 1);
  for (let i = 1; i < 9; i++) assert.equal(v.periods[i].start.getTime(), v.periods[i - 1].end.getTime());
  // Birth falls inside the first period at the elapsed fraction.
  const first = v.periods[0];
  const elapsed = (birth - first.start) / (first.end - first.start);
  assert.ok(Math.abs(elapsed - ((moon % (360 / 27)) / (360 / 27))) < 1e-9);
  assert.ok(Math.abs(v.balance.years - (first.end - birth) / YEAR_MS) < 1e-6);
  assert.equal(v.yearDays, 365.25);
});

test('bhukti, pratyantara and sookshma exactly partition their parent', () => {
  const v = vimshottari(new Date('1985-03-21T17:40:00Z'), 287.123456, new Date('2030-01-01T00:00:00Z'));
  for (const m of v.periods) {
    assertPartition(m, m.bhuktis, `maha ${m.lord}`);
    for (const b of m.bhuktis) {
      assert.equal(b.level, 'bhukti');
      const p = subPeriods(b);
      assert.equal(p[0].level, 'pratyantara');
      assertPartition(b, p, `bhukti ${m.lord}/${b.lord}`);
    }
  }
  const sk = subPeriods(subPeriods(v.periods[3].bhuktis[4])[2]);
  assert.equal(sk[0].level, 'sookshma');
  assertPartition(subPeriods(v.periods[3].bhuktis[4])[2], sk, 'sookshma');
});

test('current maha/bhukti/pratyantara nest correctly', () => {
  const now = new Date('2026-10-06T00:00:00Z');
  const v = vimshottari(new Date('1990-01-01T04:30:00Z'), 45.7, now);
  assert.ok(v.current && v.currentBhukti && v.currentPratyantara);
  assert.ok(v.currentBhukti.start >= v.current.start && v.currentBhukti.end <= v.current.end);
  assert.ok(v.currentPratyantara.start >= v.currentBhukti.start && v.currentPratyantara.end <= v.currentBhukti.end);
  assert.ok(v.currentPratyantara.start <= now && now < v.currentPratyantara.end);
  assert.ok(DASA_ORDER.includes(v.currentPratyantara.lord));
});

test('birthChart dasa keeps its existing shape', () => {
  const c = birthChart({ name: 'T', date: '1990-01-01', time: '10:00', lat: 13.08, lon: 80.27, tz: 5.5 });
  assert.equal(c.dasa.periods.length, 9);
  assert.equal(c.dasa.periods[0].bhuktis.length, 9);
  assert.equal(c.dasa.periods.reduce((s, d) => s + d.years, 0), 120);
});
