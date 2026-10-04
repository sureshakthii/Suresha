import { test } from 'node:test';
import assert from 'node:assert/strict';
import { weatherAdvice } from '../shared/weather.js';

// Chennai-style day (UTC+5:30): hot from 11 AM, rain at 4 PM; rahu kalam 7:30–9:00; nalla neram 9:15–10:15.
const tz = 5.5;
const L = (h, m = 0) => new Date(Date.UTC(2026, 9, 5, h, m) - tz * 3600000);
const hourly = Array.from({ length: 24 }, (_, h) => ({
  time: `2026-10-05T${String(h).padStart(2, '0')}:00`,
  tempC: h >= 11 && h <= 15 ? 37 : h >= 6 && h < 11 ? 30 : 27,
  rainChance: h === 16 ? 70 : 10,
}));
const w = { utcOffsetSec: 19800, current: { tempC: 29, feelsLikeC: 33, humidity: 70, windKph: 10 }, hourly, daily: [] };

test('weather advice: heat and rain warnings with times, best time avoids rahu kalam and prefers nalla neram', () => {
  const a = weatherAdvice(w, { tz, now: L(6), good: [{ start: L(9, 15), end: L(10, 15) }], avoid: [{ start: L(7, 30), end: L(9) }] });
  const heat = a.tips.find((t) => t.kind === 'heat');
  const rain = a.tips.find((t) => t.kind === 'rain');
  assert.ok(heat && heat.at.getTime() === L(11).getTime(), 'heat from 11 AM');
  assert.match(heat.ta, /காலை 11:00/);
  assert.ok(rain && rain.at.getTime() === L(16).getTime(), 'rain at 4 PM');
  assert.ok(a.bestOut, 'a best time is suggested');
  assert.equal(a.bestOut.start.getTime(), L(9).getTime(), 'the 9–10 hour overlaps nalla neram and is outside rahu kalam');
  assert.ok(a.bestOut.nalla);
  for (const t of a.tips) assert.ok(!/[A-Za-z]/.test(t.ta), t.ta);
});

test('weather advice: pleasant day gives a positive tip', () => {
  const calm = { ...w, hourly: hourly.map((h) => ({ ...h, tempC: 28, rainChance: 5 })) };
  const a = weatherAdvice(calm, { tz, now: L(6) });
  assert.equal(a.tips[0].kind, 'good');
});
