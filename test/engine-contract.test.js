// Engine contract: settings object, ephemeris version pin, accuracy wording, birth-time stability.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ENGINE_SETTINGS, settingsLabel } from '../shared/engine-contract.js';
import { birthChart, chartStability, siderealAscendant, findCrossing } from '../shared/astro.js';
import { zonedToUtc } from '../shared/datetime.js';

test('ENGINE_SETTINGS documents every convention', () => {
  const s = ENGINE_SETTINGS;
  assert.equal(s.zodiac, 'sidereal');
  assert.equal(s.ayanamsa.id, 'lahiri-chitrapaksha');
  assert.ok(s.ayanamsa.version && s.ayanamsa.epoch && s.ayanamsa.timeScale);
  assert.equal(s.nodeType, 'mean');
  assert.equal(s.houseSystem, 'whole-sign');
  assert.equal(s.horai.default, 'tamil-60');
  assert.equal(s.dasa.yearDays, 365.25);
  assert.equal(s.ephemeris.library, 'astronomy-engine');
  assert.match(s.ephemeris.documentedAccuracy, /arcminute/);
  assert.doesNotMatch(JSON.stringify(s), /arc-?second accura/i);
  assert.ok(Object.isFrozen(s));
  assert.ok(settingsLabel().en.includes('Lahiri') && settingsLabel().ta);
});

test('ephemeris version in the contract matches the installed library', () => {
  const pkg = JSON.parse(readFileSync(new URL('../node_modules/astronomy-engine/package.json', import.meta.url)));
  assert.equal(ENGINE_SETTINGS.ephemeris.version, pkg.version);
});

// --- Birth-time uncertainty
const CHENNAI = { lat: 13.0827, lon: 80.2707, zone: 'Asia/Kolkata' };
const istTime = (d) => new Date(d.getTime() + 5.5 * 3600000).toISOString().slice(11, 19);

test('chartStability: Lagna 2 minutes before a sign change is unstable at ±5 min', () => {
  const from = zonedToUtc('1995-08-15', '06:00', 'Asia/Kolkata').utc;
  const now = siderealAscendant(from, CHENNAI.lat, CHENNAI.lon);
  const nextSign = (Math.floor(now / 30) + 1) * 30 % 360;
  const change = findCrossing((d) => siderealAscendant(d, CHENNAI.lat, CHENNAI.lon), nextSign, from, 4, 60000);
  const birth = { name: 'b', date: '1995-08-15', time: istTime(new Date(change.getTime() - 120000)), ...CHENNAI };
  const s = chartStability(birth, 5);
  assert.ok(s.unstable.includes('lagna'));
  assert.ok(s.unstable.includes('navamsaLagna'));
  assert.ok(s.unstable.includes('house:Sun'));
  assert.equal(s.items.find((i) => i.key === 'lagna').values.length, 2);
  // The same birth with a 1-minute window is stable for the rasi Lagna.
  assert.ok(!chartStability(birth, 1).unstable.includes('lagna'));
});

test('chartStability: mid-sign Lagna is stable but D60 Lagna is not at ±10 min', () => {
  const from = zonedToUtc('1995-08-15', '06:00', 'Asia/Kolkata').utc;
  const now = siderealAscendant(from, CHENNAI.lat, CHENNAI.lon);
  const mid = (Math.floor(now / 30) + 1) * 30 % 360 + 15;
  const t = findCrossing((d) => siderealAscendant(d, CHENNAI.lat, CHENNAI.lon), mid, from, 4, 60000);
  const s = chartStability({ name: 'm', date: '1995-08-15', time: istTime(t), ...CHENNAI }, 10);
  assert.equal(s.items.find((i) => i.key === 'lagna').status, 'stable');
  assert.ok(s.unstable.includes('D60Lagna'));
  for (const k of ['house:Sun', 'house:Saturn']) assert.equal(s.items.find((i) => i.key === k).status, 'stable');
});

test('unknown birth time: computed at noon, Lagna/houses unavailable, never invented', () => {
  const c = birthChart({ name: 'u', date: '1990-01-01', ...CHENNAI, timePrecision: 'unknown' });
  assert.equal(c.timePrecision, 'unknown');
  assert.equal(c.lagna, null);
  assert.equal(c.planets.Lagna, undefined);
  assert.equal(c.availability.lagna, false);
  assert.equal(c.availability.houses, false);
  assert.ok(c.availability.reason.ta);
  assert.equal(c.input.local.usedTime, '12:00');
  assert.ok(c.stability.unavailable.includes('lagna'));
  assert.ok(c.stability.unavailable.includes('house:Moon'));
  assert.equal(c.stability.items.find((i) => i.key === 'lagna').values.length, 0);
  assert.equal(c.dasa.approximate, true);
  assert.equal(c.charts.rasi.flat().length, 9);
  // Moon moves ~13° a day, so its nakshatra across the whole day is reported honestly.
  assert.ok(['stable', 'unstable'].includes(c.stability.items.find((i) => i.key === 'moonNakshatra').status));
});

test('approximate birth time attaches a ±30 min stability report; exact does not', () => {
  const a = birthChart({ name: 'a', date: '1990-01-01', time: '10:00', ...CHENNAI, timePrecision: 'approximate' });
  assert.equal(a.stability.windowMinutes, 30);
  assert.ok(a.lagna);
  const e = birthChart({ name: 'e', date: '1990-01-01', time: '10:00', ...CHENNAI });
  assert.equal(e.stability, undefined);
});
