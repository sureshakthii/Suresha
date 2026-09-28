import { test } from 'node:test';
import assert from 'node:assert/strict';
import { birthChart, panchang, lahiriAyanamsa, localToUtc, planetPositions } from '../shared/astro.js';

test('Lahiri ayanamsa at J2000 is ~23°51\'', () => {
  const a = lahiriAyanamsa(new Date('2000-01-01T12:00:00Z'));
  assert.ok(Math.abs(a - 23.853) < 0.01, `got ${a}`);
});

test('local birth time converts to UTC with the tz offset', () => {
  assert.equal(localToUtc('1990-01-01', '10:00', 5.5).toISOString(), '1990-01-01T04:30:00.000Z');
});

test('1 Jan 1990 chart matches known sidereal positions', () => {
  const c = birthChart({ name: 'T', date: '1990-01-01', time: '10:00', lat: 13.0827, lon: 80.2707, tz: 5.5, place: 'Chennai' });
  const p = c.planets;
  assert.equal(p.Sun.rasiName, 'Dhanusu'); // Sun enters Makara ~14 Jan
  assert.equal(p.Saturn.rasiName, 'Dhanusu');
  assert.equal(p.Jupiter.rasiName, 'Mithuna');
  assert.equal(p.Jupiter.retrograde, true);
  assert.equal(p.Mercury.retrograde, true); // Mercury retrograde late Dec 1989 – mid Jan 1990
  assert.equal(p.Rahu.rasiName, 'Makara');
  assert.equal((p.Rahu.rasi + 6) % 12, p.Ketu.rasi);
  assert.equal(c.charts.rasi.flat().length, 10);
  const total = c.dasa.periods.reduce((s, d) => s + d.years, 0);
  assert.equal(total, 120);
});

test('ascendant at sunrise is within a few degrees of the Sun', () => {
  const s = panchang(new Date('2026-01-20T06:00:00Z'), 9.9252, 78.1198, 5.5);
  const { planets } = planetPositions(s.sunrise, 9.9252, 78.1198);
  const d = Math.abs(((planets.Lagna.longitude - planets.Sun.longitude + 540) % 360) - 180);
  assert.ok(d < 3, `diff ${d}`);
});

test('panchang: horai covers the day, periods ordered, end times in future', () => {
  const now = new Date('2026-09-28T06:00:00Z');
  const s = panchang(now, 13.0827, 80.2707, 5.5);
  assert.ok(s.sunrise < now && now < s.nextSunrise);
  assert.ok(s.horai.length >= 23 && s.horai.length <= 25);
  assert.ok(s.currentHora.start <= now && now < s.currentHora.end);
  assert.ok(s.nakshatra.endsAt > now && s.tithi.endsAt > now);
  assert.ok(s.rahuKalam.start > s.sunrise && s.rahuKalam.end < s.sunset);
  assert.equal(s.weekday.en, 'Monday');
  // Monday Rahu Kalam in Chennai is ~7:30–9:00 IST
  const startIst = new Date(s.rahuKalam.start.getTime() + 5.5 * 3600000).getUTCHours();
  assert.equal(startIst, 7);
});

test('Lagna moves ~1° every 4 minutes (live sync)', () => {
  const t = new Date('2026-09-28T06:00:00Z');
  const a = planetPositions(t, 13, 80).planets.Lagna.longitude;
  const b = planetPositions(new Date(t.getTime() + 240000), 13, 80).planets.Lagna.longitude;
  const d = (b - a + 360) % 360;
  assert.ok(d > 0.5 && d < 2, `moved ${d}`);
});
