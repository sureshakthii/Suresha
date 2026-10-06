// Ayanamsa fixtures. Tolerances are set BEFORE testing from the engine's accuracy budget:
// astronomy-engine is documented to ±1′, so published almanac values (themselves rounded to 1′)
// must agree within 1′; the definitional epoch and the Swiss Ephemeris table value must agree within a
// few arc-seconds because both use the same constants (residual = precession-model/nutation differences).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as A from 'astronomy-engine';
import { lahiriAyanamsa, lahiriAyanamsaMean, LAHIRI_AT_EPOCH } from '../shared/astro.js';

const ARCMIN = 1 / 60;
const ARCSEC = 1 / 3600;
const dms = (d, m, s = 0) => d + m / 60 + s / 3600;
// UTC instant for a TT Julian date (subtract ΔT so the TT epoch is hit exactly).
const fromJdTT = (jd) => {
  const guess = new Date((jd - 2440587.5) * 86400000);
  const dtDays = A.MakeTime(guess).tt - A.MakeTime(guess).ut;
  return new Date((jd - 2440587.5 - dtDays) * 86400000);
};

test('Lahiri definition: mean value at the ICRC epoch 1956-03-21 0h TT is exact', () => {
  const a = lahiriAyanamsaMean(fromJdTT(2435553.5));
  assert.ok(Math.abs(a - LAHIRI_AT_EPOCH) < 0.01 * ARCSEC, `got ${a}`);
});

test('Lahiri definition: true value at epoch = 23°15′00.658″ (±2″, nutation model difference)', () => {
  const a = lahiriAyanamsa(fromJdTT(2435553.5));
  assert.ok(Math.abs(a - dms(23, 15, 0.658)) < 2 * ARCSEC, `got ${a}`);
});

test('Swiss Ephemeris table: mean Lahiri at J1900 = 22.460148° (±5″)', () => {
  const a = lahiriAyanamsaMean(fromJdTT(2415020.0));
  assert.ok(Math.abs(a - 22.460148) < 5 * ARCSEC, `got ${a}`);
});

test('published almanac values (±1′)', () => {
  const cases = [
    ['2000-01-01T12:00:00Z', dms(23, 51, 11)], // widely published Lahiri for 1 Jan 2000
    ['2024-01-01T00:00:00Z', dms(24, 11)],
    ['2025-01-01T00:00:00Z', dms(24, 12)],
    ['2026-01-01T00:00:00Z', dms(24, 13)],
  ];
  for (const [iso, want] of cases) {
    const got = lahiriAyanamsa(new Date(iso));
    assert.ok(Math.abs(got - want) < ARCMIN, `${iso}: got ${got}, want ${want}`);
  }
});

test('ayanamsa grows ~50.3″/year, monotonic over 1900–2100', () => {
  let prev = -Infinity;
  for (let y = 1900; y <= 2100; y += 5) {
    const a = lahiriAyanamsaMean(new Date(Date.UTC(y, 0, 1)));
    assert.ok(a > prev);
    if (prev > -Infinity) {
      const rate = (a - prev) / 5 * 3600;
      assert.ok(rate > 50.1 && rate < 50.5, `rate ${rate}″/yr at ${y}`);
    }
    prev = a;
  }
});

test('true − mean ayanamsa is the nutation in longitude (|Δψ| < 20″)', () => {
  for (let y = 1900; y <= 2100; y += 7) {
    const d = new Date(Date.UTC(y, 3, 1));
    assert.ok(Math.abs(lahiriAyanamsa(d) - lahiriAyanamsaMean(d)) < 20 * ARCSEC);
  }
});
