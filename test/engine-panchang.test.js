// Panchangam event search, Horai methods, weekday-before-sunrise and polar days.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  panchang, findCrossing, findBoundaries, panchangTransitions, sunMoonSeparation, moonSidereal, yogaSum,
  CROSSING_TOLERANCE_MS, vedicDay, horaiTable, HORAI_METHODS, weekdayOf, WEEKDAYS,
} from '../shared/astro.js';
import { gowriPanchangam } from '../shared/tamilcal.js';

const CHENNAI = [13.0827, 80.2707];
const NAK = 360 / 27;
const before = (d) => new Date(d.getTime() - CROSSING_TOLERANCE_MS);

test('end times are true boundaries (value just before < target, at end ≥ target)', () => {
  for (const iso of ['2026-01-14T00:00:00Z', '2026-06-01T09:30:00Z', '2026-10-06T22:00:00Z']) {
    const now = new Date(iso);
    const p = panchang(now, ...CHENNAI, 5.5);
    const checks = [
      ['tithi', sunMoonSeparation, 12, p.tithi.index, p.tithi.endsAt, 30],
      ['karana', sunMoonSeparation, 6, p.karanaIndex, p.karanaEndsAt, 60],
      ['nakshatra', moonSidereal, NAK, p.nakshatra.index, p.nakshatra.endsAt, 27],
      ['yoga', yogaSum, NAK, p.yoga.index, p.yoga.endsAt, 27],
    ];
    for (const [kind, fn, span, idx, end, count] of checks) {
      assert.ok(end > now, `${kind} end after now`);
      assert.equal(Math.floor(fn(before(end)) / span) % count, idx, `${kind} still current 1 s before end`);
      assert.equal(Math.floor(fn(end) / span) % count, (idx + 1) % count, `${kind} next value at end`);
    }
  }
});

test('findCrossing returns null when no crossing in the window and respects the tolerance', () => {
  const now = new Date('2026-03-01T00:00:00Z');
  // The Moon cannot cross the point 180° ahead within 2 hours.
  const target = (moonSidereal(now) + 180) % 360;
  assert.equal(findCrossing(moonSidereal, target, now, 2), null);
  const t = findCrossing(moonSidereal, Math.ceil(moonSidereal(now) / NAK) * NAK % 360, now, 36);
  assert.ok(t instanceof Date);
});

test('multiple transitions in one day are all found, in order, with no gaps', () => {
  const from = new Date('2026-01-01T00:00:00Z');
  const to = new Date('2026-04-01T00:00:00Z');
  const ev = panchangTransitions(from, to);
  for (let i = 1; i < ev.length; i++) assert.ok(ev[i].at >= ev[i - 1].at, 'chronological');
  for (const kind of ['tithi', 'nakshatra', 'yoga', 'karana']) {
    const k = ev.filter((e) => e.kind === kind);
    for (let i = 1; i < k.length; i++) assert.equal(k[i].from, k[i - 1].to, `${kind} chain`);
  }
  // Karanas last ~12 h: every 24 h window holds at least one, usually two.
  const karana = ev.filter((e) => e.kind === 'karana');
  assert.ok(karana.length > 170 && karana.length < 185, `karana count ${karana.length}`);
  // A kshaya (skipped) tithi = two tithi endings between consecutive sunrises; one occurs every month or so.
  let kshaya = 0;
  for (let t = from.getTime(); t < to.getTime(); t += 86400000) {
    const day = vedicDay(new Date(t), ...CHENNAI);
    const ends = findBoundaries(sunMoonSeparation, 12, day.sunrise, day.nextSunrise);
    if (ends.length >= 2) kshaya += 1;
  }
  assert.ok(kshaya >= 1, 'found a day with two tithi transitions');
});

test('findBoundaries catches two changes inside one scan step', () => {
  // A 13-hour step is coarser than a karana (~12 h): the cursor restarts at each boundary.
  const from = new Date('2026-02-01T00:00:00Z');
  const to = new Date('2026-02-05T00:00:00Z');
  const fine = findBoundaries(sunMoonSeparation, 6, from, to, 3600000);
  const coarse = findBoundaries(sunMoonSeparation, 6, from, to, 13 * 3600000);
  assert.ok(coarse.length >= fine.length - 1);
  for (const c of coarse) assert.ok(fine.some((f) => Math.abs(f.at - c.at) <= 2 * CROSSING_TOLERANCE_MS));
});

test('Horai: default Tamil 60-minute method is labelled', () => {
  const p = panchang(new Date('2026-09-28T06:00:00Z'), ...CHENNAI, 5.5);
  assert.equal(p.horaiMethod.id, 'tamil-60');
  assert.ok(p.horaiMethod.en && p.horaiMethod.ta);
  assert.equal(p.horai[0].lord, 'Moon'); // Monday
  for (const h of p.horai.slice(0, -1)) assert.equal(h.end - h.start, 3600000);
});

test('Horai: unequal planetary hours — 12 day + 12 night parts', () => {
  const p = panchang(new Date('2026-06-21T06:00:00Z'), ...CHENNAI, 'Asia/Kolkata', { horaiMethod: 'planetary-unequal' });
  const h = p.horai;
  assert.equal(p.horaiMethod.id, 'planetary-unequal');
  assert.equal(h.length, 24);
  assert.equal(h[0].start.getTime(), p.sunrise.getTime());
  assert.equal(h[11].end.getTime(), p.sunset.getTime());
  assert.equal(h[12].start.getTime(), p.sunset.getTime());
  assert.equal(h[23].end.getTime(), p.nextSunrise.getTime());
  const dayLen = (p.sunset - p.sunrise) / 12;
  const nightLen = (p.nextSunrise - p.sunset) / 12;
  assert.ok(dayLen > nightLen, 'June: longer daytime hours in the north');
  for (let i = 1; i < 24; i++) assert.equal(h[i].start.getTime(), h[i - 1].end.getTime());
  assert.equal(h[0].lord, WEEKDAYS[p.weekday.index].lord);
  assert.equal(h[1].lord, ['Sun', 'Venus', 'Mercury', 'Moon', 'Saturn', 'Jupiter', 'Mars'][(['Sun', 'Venus', 'Mercury', 'Moon', 'Saturn', 'Jupiter', 'Mars'].indexOf(h[0].lord) + 1) % 7]);
  assert.ok(p.currentHora.start <= p.at && p.at < p.currentHora.end);
  assert.ok(HORAI_METHODS['planetary-unequal'].ta);
});

test('weekday before sunrise belongs to the previous day', () => {
  // 00:30 IST on Monday 2026-09-28 is still Sunday's Vedic day; 07:00 IST is Monday.
  const early = panchang(new Date('2026-09-27T19:00:00Z'), ...CHENNAI, 5.5, { withEnds: false });
  const late = panchang(new Date('2026-09-28T01:30:00Z'), ...CHENNAI, 5.5, { withEnds: false });
  assert.equal(early.weekday.en, 'Sunday');
  assert.equal(late.weekday.en, 'Monday');
  assert.equal(early.horai[0].lord, 'Sun');
  // IANA zone gives the same weekday as the fixed offset.
  const day = vedicDay(new Date('2026-09-28T01:30:00Z'), ...CHENNAI);
  assert.equal(weekdayOf(day.sunrise, 'Asia/Kolkata'), weekdayOf(day.sunrise, 5.5));
});

test('high latitude: no throw, clear polar flag, unequal horai falls back with a label', () => {
  for (const iso of ['2026-06-21T10:00:00Z', '2026-12-21T10:00:00Z']) {
    const d = new Date(iso);
    const day = vedicDay(d, 78.22, 15.65); // Longyearbyen
    assert.equal(day.polar, true);
    assert.ok(day.missing.length > 0);
    assert.ok(day.sunrise <= d && d < day.nextSunrise);
    assert.ok(day.sunrise < day.sunset && day.sunset < day.nextSunrise);
    const p = panchang(d, 78.22, 15.65, 1, { horaiMethod: 'planetary-unequal' });
    assert.equal(p.dayFlags.polar, true);
    assert.equal(p.horaiMethod.id, 'tamil-60');
    assert.equal(p.horai[0].fallback, true);
    assert.ok(Number.isFinite(p.rahuKalam.start.getTime()));
    const g = gowriPanchangam(day, 0);
    assert.ok(g.every((s) => s.approximate === true));
  }
  // Normal latitude is not flagged.
  assert.equal(vedicDay(new Date('2026-06-21T10:00:00Z'), ...CHENNAI).polar, false);
});

test('horaiTable default call stays backward-compatible', () => {
  const day = vedicDay(new Date('2026-09-28T06:00:00Z'), ...CHENNAI);
  const rows = horaiTable(day, 1);
  assert.ok(rows.length >= 23 && rows.length <= 25);
  assert.equal(rows[rows.length - 1].end.getTime(), day.nextSunrise.getTime());
});
