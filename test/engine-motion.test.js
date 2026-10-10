// Retrograde / speed / stationary and Lagna (ascendant) checks.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as A from 'astronomy-engine';
import {
  planetPositions, longitudeSpeed, motion, angleDiff, STATIONARY_SPEED, tropicalAscendant, siderealAscendant,
  findCrossing, moonSidereal, panchang, norm360,
} from '../shared/astro.js';

test('angleDiff unwraps across 359°/0°', () => {
  assert.equal(angleDiff(359.5, 0.5), 1);
  assert.equal(angleDiff(0.5, 359.5), -1);
  assert.equal(angleDiff(10, 190), 180);
  assert.equal(angleDiff(190, 10), 180);
});

test('Moon crossing 0° sidereal has positive speed ~12–15°/day (not −359°)', () => {
  const t = findCrossing(moonSidereal, 0, new Date('2026-01-01T00:00:00Z'), 31 * 24);
  const s = longitudeSpeed('Moon', t);
  assert.ok(s > 11 && s < 16, `speed ${s}`);
});

test('retrograde planets across the 0° wrap (independent check from raw longitudes)', () => {
  const cases = [
    ['Mars', '2020-10-04T00:00:00Z'], // Mars retrograde at Meena/Mesha junction
    ['Saturn', '2027-10-20T00:00:00Z'], // Saturn retrograde right at 0° sidereal
    ['Mercury', '2024-04-10T00:00:00Z'],
  ];
  for (const [body, iso] of cases) {
    const d = new Date(iso);
    const p = planetPositions(d, null, null).planets[body];
    assert.equal(p.retrograde, true, `${body} ${iso}`);
    assert.ok(p.speed < 0, `${body} speed ${p.speed}`);
    // Independent: raw apparent tropical longitudes 1 day apart, unwrapped by hand.
    const lon = (x) => A.Ecliptic(A.GeoVector(body, A.MakeTime(x), true)).elon;
    let raw = lon(new Date(d.getTime() + 86400000)) - lon(new Date(d.getTime() - 86400000));
    if (raw > 180) raw -= 360;
    if (raw < -180) raw += 360;
    assert.ok(raw < 0);
    assert.ok(Math.abs(raw / 2 - p.speed) < 0.05, `${body} raw ${raw / 2} vs ${p.speed}`);
  }
});

test('direct planet across the wrap is not retrograde', () => {
  // Sun crosses 0° sidereal at Mesha Sankranti (~14 April).
  const t = findCrossing((d) => planetPositions(d, null, null).planets.Sun.longitude, 0, new Date('2026-04-10T00:00:00Z'), 8 * 24);
  const p = planetPositions(t, null, null).planets.Sun;
  assert.equal(p.retrograde, false);
  assert.ok(p.speed > 0.9 && p.speed < 1.1);
});

test('stationary flag near a station (Mercury stationed direct on 2017-05-03)', () => {
  const m = motion('Mercury', new Date('2017-05-03T12:00:00Z'));
  assert.equal(m.stationary, true, `speed ${m.speed}`);
  assert.ok(Math.abs(m.speed) < STATIONARY_SPEED.Mercury);
  const fast = motion('Mercury', new Date('2017-05-25T00:00:00Z'));
  assert.equal(fast.stationary, false);
});

test('every planet exposes a numeric speed; Rahu/Ketu move backwards ~0.053°/day', () => {
  const { planets } = planetPositions(new Date('2026-10-06T00:00:00Z'), 13, 80);
  for (const k of ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu']) {
    assert.equal(typeof planets[k].speed, 'number', k);
    assert.equal(typeof planets[k].stationary, 'boolean', k);
  }
  assert.ok(Math.abs(planets.Rahu.speed + 0.053) < 0.002);
  assert.equal(planets.Rahu.speed, planets.Ketu.speed);
});

// --- Lagna: independent numerical solution of "ecliptic point on the eastern horizon".
function ascendantByHorizonSearch(date, lat, lon) {
  const time = A.MakeTime(date);
  const eps = A.e_tilt(time).tobl * Math.PI / 180;
  const lst = (A.SiderealTime(time) * 15 + lon) * Math.PI / 180;
  const phi = lat * Math.PI / 180;
  const alt = (lamDeg) => {
    const l = lamDeg * Math.PI / 180;
    const ra = Math.atan2(Math.sin(l) * Math.cos(eps), Math.cos(l));
    const dec = Math.asin(Math.sin(eps) * Math.sin(l));
    const H = lst - ra;
    return { h: Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H), east: Math.sin(H) < 0 };
  };
  for (let x = 0; x < 360; x += 0.25) {
    const a = alt(x); const b = alt(x + 0.25);
    // rising point: altitude goes from below to above the horizon as λ decreases → sign change with east side
    if (Math.sign(a.h) !== Math.sign(b.h) && alt(x + 0.125).east) {
      let lo = x; let hi = x + 0.25;
      for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (Math.sign(alt(m).h) === Math.sign(a.h)) lo = m; else hi = m; }
      return norm360((lo + hi) / 2);
    }
  }
  return null;
}

test('Lagna formula matches an independent horizon search (several latitudes, both hemispheres)', () => {
  const places = [
    ['Chennai', 13.0827, 80.2707], ['Madurai', 9.9252, 78.1198], ['Dubai', 25.2048, 55.2708],
    ['London', 51.5074, -0.1278], ['Sydney', -33.8688, 151.2093], ['New York', 40.7128, -74.006], ['Oslo', 59.91, 10.75],
  ];
  for (const [name, lat, lon] of places) {
    for (const iso of ['1975-06-15T03:20:00Z', '1999-12-31T23:59:00Z', '2026-03-20T12:00:00Z', '2041-09-01T18:45:00Z']) {
      const d = new Date(iso);
      const got = tropicalAscendant(d, lat, lon);
      const want = ascendantByHorizonSearch(d, lat, lon);
      assert.ok(got >= 0 && got < 360);
      assert.ok(Math.abs(angleDiff(want, got)) < 0.01, `${name} ${iso}: ${got} vs ${want}`);
    }
  }
});

// Tolerance: the Sun's upper limb at sunrise is ~0.8° below the true horizon point; along the ecliptic this
// is ~1–2° in the tropics and grows at high latitude where the ecliptic rises at a shallow angle.
test('Lagna at sunrise ≈ Sun (several cities)', () => {
  for (const [lat, lon] of [[13.08, 80.27], [25.2, 55.27], [51.5, -0.13], [-33.87, 151.21]]) {
    const s = panchang(new Date('2026-05-01T06:00:00Z'), lat, lon, 0, { withEnds: false });
    const { planets } = planetPositions(s.sunrise, lat, lon);
    assert.ok(Math.abs(angleDiff(planets.Sun.longitude, planets.Lagna.longitude)) < (Math.abs(lat) > 40 ? 5 : 2), `${lat},${lon}`);
  }
});

test('sidereal Lagna is normalised to [0, 360) and flags high latitudes', () => {
  for (let h = 0; h < 48; h++) {
    const d = new Date(Date.UTC(2026, 0, 1, h, 7));
    const l = siderealAscendant(d, 13, 80);
    assert.ok(l >= 0 && l < 360);
  }
  assert.equal(planetPositions(new Date('2026-06-21T00:00:00Z'), 70, 20).planets.Lagna.highLatitude, true);
});
