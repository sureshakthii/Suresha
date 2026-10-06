// Deterministic invariants over many charts (Brief §12): normalised angles, Ketu opposition,
// legal house indices, chronological event times, dasa partition sums.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { birthChart, panchang, angleDiff, subPeriods } from '../shared/astro.js';
import { vargaRasi, VARGAS } from '../shared/varga.js';

const PLACES = [[13.08, 80.27, 'Asia/Kolkata'], [9.93, 78.12, 'Asia/Kolkata'], [25.2, 55.27, 'Asia/Dubai'],
  [51.5, -0.13, 'Europe/London'], [-33.87, 151.21, 'Australia/Sydney'], [1.35, 103.82, 'Asia/Singapore']];

// Deterministic pseudo-random sample (no Math.random → reproducible).
let seed = 20261006;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const SAMPLES = Array.from({ length: 40 }, (_, i) => {
  const y = 1901 + Math.floor(rnd() * 199);
  const m = 1 + Math.floor(rnd() * 12);
  const d = 1 + Math.floor(rnd() * 28);
  const hh = Math.floor(rnd() * 24);
  const mm = Math.floor(rnd() * 60);
  const [lat, lon, zone] = PLACES[i % PLACES.length];
  return { name: `S${i}`, date: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`, time: `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`, lat, lon, zone };
});
const charts = SAMPLES.map((s) => birthChart(s));

test('all longitudes normalised to [0, 360) and derived indices in range', () => {
  for (const c of charts) {
    for (const [k, p] of Object.entries(c.planets)) {
      assert.ok(p.longitude >= 0 && p.longitude < 360, `${c.name} ${k} ${p.longitude}`);
      assert.ok(Number.isInteger(p.rasi) && p.rasi >= 0 && p.rasi <= 11);
      assert.ok(p.nakshatra >= 0 && p.nakshatra <= 26);
      assert.ok(p.pada >= 1 && p.pada <= 4);
      assert.ok(p.degreeInSign >= 0 && p.degreeInSign < 30);
      for (const v of VARGAS) { const r = vargaRasi(p.longitude, v.n); assert.ok(r >= 0 && r <= 11); }
    }
    assert.ok(c.ayanamsa > 22.4 && c.ayanamsa < 25.3, String(c.ayanamsa));
  }
});

test('Ketu is exactly opposite Rahu', () => {
  for (const c of charts) {
    assert.ok(Math.abs(Math.abs(angleDiff(c.planets.Rahu.longitude, c.planets.Ketu.longitude)) - 180) < 1e-9);
    assert.equal((c.planets.Rahu.rasi + 6) % 12, c.planets.Ketu.rasi);
  }
});

test('house indices are 1..12 and every house map holds each body once', () => {
  for (const c of charts) {
    for (const p of Object.values(c.planets)) {
      const house = ((p.rasi - c.lagna.rasi + 12) % 12) + 1;
      assert.ok(house >= 1 && house <= 12);
    }
    assert.equal(c.charts.rasi.flat().length, Object.keys(c.planets).length);
    assert.equal(c.charts.navamsa.flat().length, Object.keys(c.planets).length);
  }
});

test('event times are chronological', () => {
  for (const s of SAMPLES.slice(0, 12)) {
    const at = new Date(birthChart(s).utc);
    const p = panchang(at, s.lat, s.lon, s.zone);
    assert.ok(p.sunrise <= at && at < p.nextSunrise);
    assert.ok(p.sunrise < p.sunset && p.sunset < p.nextSunrise);
    for (const e of [p.tithi.endsAt, p.nakshatra.endsAt, p.yoga.endsAt, p.karanaEndsAt, p.moonRasi.endsAt]) assert.ok(e > at);
    assert.ok(p.karanaEndsAt <= p.tithi.endsAt);
    for (let i = 1; i < p.horai.length; i++) assert.equal(p.horai[i].start.getTime(), p.horai[i - 1].end.getTime());
    for (const r of [p.rahuKalam, p.yamagandam, p.guligai]) assert.ok(p.sunrise <= r.start && r.start < r.end && r.end <= p.sunset);
  }
});

test('dasa partitions sum exactly at every level', () => {
  for (const c of charts.slice(0, 10)) {
    const ps = c.dasa.periods;
    for (let i = 1; i < ps.length; i++) assert.equal(ps[i].start.getTime(), ps[i - 1].end.getTime());
    for (const m of ps) {
      const b = m.bhuktis;
      assert.equal(b[0].start.getTime(), m.start.getTime());
      assert.equal(b.at(-1).end.getTime(), m.end.getTime());
      assert.equal(b.reduce((s, x) => s + (x.end - x.start), 0), m.end - m.start);
      const pr = subPeriods(b[3]);
      assert.equal(pr.reduce((s, x) => s + (x.end - x.start), 0), b[3].end - b[3].start);
    }
  }
});

test('same input → identical output (pure, cache-independent)', () => {
  const a = JSON.stringify(birthChart(SAMPLES[0]).planets);
  birthChart(SAMPLES[1]);
  assert.equal(JSON.stringify(birthChart(SAMPLES[0]).planets), a);
});
