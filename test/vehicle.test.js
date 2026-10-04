import { test } from 'node:test';
import assert from 'node:assert/strict';
import { birthChart, panchang } from '../shared/astro.js';
import { getCategory } from '../shared/prasna.js';
import { findMuhurtham, eventAllowed } from '../shared/special.js';
import { QUESTIONS, predictEvent } from '../shared/predict.js';

const loc = { lat: 13.08, lon: 80.27, tz: 5.5 };
const from = new Date('2026-10-04T00:00:00Z');
const GOOD_STARS = [0, 3, 4, 6, 7, 11, 12, 13, 14, 16, 20, 21, 22, 23, 25, 26];
const chart = birthChart({ name: 'Ravi', date: '1990-06-15', time: '09:30', lat: 13.08, lon: 80.27, tz: 5.5 });

const checkSlot = (snap) => {
  assert.ok(![2, 6].includes(snap.weekday.index), `weekday ${snap.weekday.en}`);
  const t = snap.tithi.index;
  assert.ok(t !== 29 && ![7, 8, 13].includes(t % 15), `tithi ${snap.tithi.name}`);
  assert.ok(!snap.inRahuKalam && !snap.inYamagandam && !snap.inGuligai);
  assert.ok(GOOD_STARS.includes(snap.nakshatra.index), `star ${snap.nakshatra.name}`);
};

test('vehicle category is an auspicious event with classical rules', () => {
  const c = getCategory('vehicle');
  assert.ok(c && c.event && c.icon === '🚗' && c.ta === 'வாகனம் வாங்க');
  assert.deepEqual(c.badDays, [2, 6]);
  assert.ok(c.goodHora.includes('Venus'));
});

test('eventAllowed(vehicle) rejects Tuesday/Saturday, bad tithis, Rahu Kalam and other stars', () => {
  let allowed = 0;
  for (let h = 0; h < 30 * 24; h += 1) {
    const snap = panchang(new Date(from.getTime() + h * 3600000), loc.lat, loc.lon, loc.tz, { withEnds: false });
    if (!eventAllowed(snap, 'vehicle')) continue;
    allowed++;
    checkSlot(snap);
  }
  assert.ok(allowed > 0);
});

test('findMuhurtham(vehicle) never offers Tuesday/Saturday, Ashtami/Navami/Amavasai or Rahu Kalam', () => {
  const persons = [{ name: 'Ravi', janmaNakshatra: chart.janmaNakshatra.index, janmaRasi: chart.janmaRasi.index }];
  const res = findMuhurtham({ category: 'vehicle', loc, persons, from, days: 60 });
  assert.ok(res.length > 0);
  for (const w of res) {
    assert.ok(![2, 6].includes(w.weekday.index));
    const t = w.tithi.index;
    assert.ok(t !== 29 && ![7, 8].includes(t % 15));
    assert.ok(w.reasons.length > 0 && w.reasons.every((r) => r.en && r.ta));
    // Every 10 minutes across the window is outside Rahu Kalam / Yamagandam / Kuligai, with no Chandrashtamam.
    for (let t2 = w.start.getTime(); t2 < w.end.getTime(); t2 += 10 * 60000) {
      const snap = panchang(new Date(t2), loc.lat, loc.lon, loc.tz, { withEnds: false });
      assert.ok(!snap.inRahuKalam && !snap.inYamagandam && !snap.inGuligai, `inside a bad period at ${new Date(t2).toISOString()}`);
      assert.notEqual(((snap.moonRasi.index - chart.janmaRasi.index + 12) % 12) + 1, 8);
    }
    const peak = panchang(w.start, loc.lat, loc.lon, loc.tz, { withEnds: false });
    checkSlot(peak);
    const tara = ((peak.nakshatra.index - chart.janmaNakshatra.index + 27) % 27) % 9;
    assert.ok(![2, 4, 6].includes(tara), 'no Vipat / Pratyak / Naidhana Tara');
  }
});

test('QUESTIONS has vehicle and predictEvent returns windows', () => {
  const q = QUESTIONS.find((x) => x.id === 'vehicle');
  assert.ok(q);
  assert.deepEqual(q.houses, [4, 11, 2]);
  assert.equal(q.key, 4);
  assert.ok(q.remedy.en && q.remedy.ta);
  const r = predictEvent(chart, 'vehicle', { from });
  assert.ok(['strong', 'good', 'needs effort'].includes(r.promise.level));
  assert.ok(r.windows.length > 0);
  for (const w of r.windows) assert.ok(w.peakFrom <= w.peakTo);
});
