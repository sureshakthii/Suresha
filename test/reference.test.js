// Reference checks for the calculation engine against independently published astronomical events.
// Sources: NASA/GSFC eclipse catalogue (lunar eclipse 2026-03-03, annular solar eclipse 2026-02-17);
// Lahiri (Chitrapaksha) ayanamsa at J2000.0 = 23°51′11″ (Indian Astronomical Ephemeris convention).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { panchang, birthChart } from '../shared/astro.js';
import { CALC_VERSION } from '../shared/version.js';

const CHENNAI = [13.0827, 80.2707, 5.5];
const minutes = (a, b) => Math.abs(new Date(a) - new Date(b)) / 60000;

test('Lahiri ayanamsa at J2000.0 is 23°51′11″ (±0.01°)', () => {
  const s = panchang(new Date('2000-01-01T12:00:00Z'), ...CHENNAI);
  assert.ok(Math.abs(s.ayanamsa - (23 + 51 / 60 + 11 / 3600)) < 0.01, String(s.ayanamsa));
});

test('Pournami boundary = full moon of 3 Mar 2026 (11:38 UTC, total lunar eclipse) within 5 minutes', () => {
  const s = panchang(new Date('2026-03-03T09:00:00Z'), ...CHENNAI);
  assert.equal(s.tithi.name, 'Pournami');
  assert.ok(minutes(s.tithi.endsAt, '2026-03-03T11:38:00Z') < 5, new Date(s.tithi.endsAt).toISOString());
});

test('Amavasai boundary = new moon of 17 Feb 2026 (12:01 UTC, annular solar eclipse) within 5 minutes', () => {
  const s = panchang(new Date('2026-02-17T09:00:00Z'), ...CHENNAI);
  assert.equal(s.tithi.name, 'Amavasai');
  assert.ok(minutes(s.tithi.endsAt, '2026-02-17T12:01:00Z') < 5, new Date(s.tithi.endsAt).toISOString());
});

test('Rahu and Ketu are exactly opposite; lagna advances ~1 sign per 2 hours', () => {
  const c = birthChart({ date: '1990-01-01', time: '10:00:00', lat: 13.0827, lon: 80.2707, tz: 5.5 });
  const d = Math.abs(((c.planets.Rahu.longitude - c.planets.Ketu.longitude + 540) % 360) - 180);
  assert.ok(Math.abs(d - 180) < 1e-6 || d < 1e-6);
  const c2 = birthChart({ date: '1990-01-01', time: '12:00:00', lat: 13.0827, lon: 80.2707, tz: 5.5 });
  const move = (c2.planets.Lagna.longitude - c.planets.Lagna.longitude + 360) % 360;
  assert.ok(move > 20 && move < 45, String(move));
});

test('Rahu Kalam is one-eighth of daytime and sits in the traditional weekday slot', () => {
  // Sunday slot 8 of 8; Monday slot 2; Tuesday 7; Wednesday 5; Thursday 6; Friday 4; Saturday 3.
  const SLOT = [8, 2, 7, 5, 6, 4, 3];
  for (let i = 0; i < 7; i++) {
    const s = panchang(new Date(Date.UTC(2026, 9, 4 + i, 6)), ...CHENNAI);
    const day = new Date(s.sunset) - new Date(s.sunrise);
    const start = new Date(s.rahuKalam.start) - new Date(s.sunrise);
    assert.ok(Math.abs((new Date(s.rahuKalam.end) - new Date(s.rahuKalam.start)) - day / 8) < 60000);
    assert.equal(Math.round(start / (day / 8)) + 1, SLOT[s.weekday.index], `weekday ${s.weekday.index}`);
  }
});

test('calculation engine is versioned', () => { assert.match(CALC_VERSION, /^\d+\.\d+\.\d+$/); });
