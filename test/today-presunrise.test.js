// "Today" is the calendar day: between local midnight and sunrise the Vedic day is still the previous weekday, but
// every screen that says "today" (Today, Parigaram, brief, Ask …) must show the calendar day's weekday, day lord,
// Rahu Kalam and horai table. Live-moment values (tithi, star, current horai) stay those of the real instant.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { panchang, todaySnapshot, dayAnchor, isPreDawn, calendarDate, calendarWeekday } from '../shared/astro.js';
import { dailyParigaram } from '../shared/remedies.js';
import { dailyReview, DAY_DEITY } from '../shared/daily.js';
import { morningBrief } from '../shared/daily-brief.js';

const CHENNAI = { lat: 13.0827, lon: 80.2707, tz: 5.5 };
const DUBAI = { lat: 25.2048, lon: 55.2708, tz: 4 };
const LONDON = { lat: 51.5074, lon: -0.1278, tz: 1 }; // BST in October 2026 (clocks go back on 25 Oct)
const at = (iso, tz) => new Date(Date.parse(`${iso}Z`) - tz * 3600000);
const localHour = (d, tz) => { const x = new Date(new Date(d).getTime() + tz * 3600000); return x.getUTCHours() + x.getUTCMinutes() / 60; };

for (const [name, loc] of [['Chennai', CHENNAI], ['Dubai', DUBAI]]) {
  test(`${name} 03:30 Thu 8 Oct 2026: today is Thursday (Guru), not the Vedic Wednesday`, () => {
    const now = at('2026-10-08T03:30:00', loc.tz);
    assert.equal(panchang(now, loc.lat, loc.lon, loc.tz).weekday.index, 3, 'the live Vedic day is still Wednesday');
    assert.equal(isPreDawn(now, loc.lat, loc.lon, loc.tz), true);
    assert.equal(calendarDate(now, loc.tz), '2026-10-08');
    assert.equal(calendarWeekday(now, loc.tz), 4);
    const s = todaySnapshot(now, loc);
    assert.equal(s.preDawn, true);
    assert.equal(s.weekday.index, 4);
    assert.equal(s.weekday.lord, 'Jupiter');
    assert.equal(s.vedic.weekday.index, 3, 'the running Vedic day is kept for live views');
    // Thursday's Rahu Kalam is the 6th eighth of daytime: about 13:30–15:00 local.
    assert.ok(localHour(s.rahuKalam.start, loc.tz) > 13 && localHour(s.rahuKalam.start, loc.tz) < 14, `rahu starts ${localHour(s.rahuKalam.start, loc.tz)}`);
    assert.ok(localHour(s.rahuKalam.end, loc.tz) > 14.5 && localHour(s.rahuKalam.end, loc.tz) < 15.5);
    assert.equal(s.inRahuKalam, false);
    // The horai table is Thursday's (starts with Jupiter at sunrise); the current horai is the real one now.
    assert.equal(s.horai[0].lord, 'Jupiter');
    assert.ok(s.horai[0].start > now);
    assert.ok(s.currentHora.start <= now && now < s.currentHora.end, 'current horai is the live one');
    assert.ok(s.sunrise > now && calendarDate(s.sunrise, loc.tz) === '2026-10-08');
    // Live tithi / star: computed at `now` (not at sunrise).
    const live = panchang(now, loc.lat, loc.lon, loc.tz);
    assert.equal(s.tithi.index, live.tithi.index);
    assert.equal(s.nakshatra.index, live.nakshatra.index);
    assert.equal(+s.at, +now);
    // Anchor: one minute after the calendar date's sunrise.
    assert.equal(+dayAnchor(now, loc.lat, loc.lon, loc.tz), +s.sunrise + 60000);
  });

  test(`${name}: parigaram and day review before sunrise name Thursday / Guru`, () => {
    const now = at('2026-10-08T03:30:00', loc.tz);
    const s = todaySnapshot(now, loc);
    const items = dailyParigaram({ weekday: s.weekday.index, snapshot: s, now });
    assert.match(items[0].reason.ta, /வியாழக்கிழமை|வியாழன்/);
    assert.match(items[0].reason.ta, /குரு/);
    assert.doesNotMatch(items[0].reason.ta, /புதன்/);
    assert.match(items[0].reason.en, /Thursday, ruled by Jupiter/);
    const r = dailyReview(null, s, now);
    assert.equal(r.deity.god.en, DAY_DEITY[4].god.en);
  });

  test(`${name} 07:00 Thu: Thursday (after sunrise, no pre-dawn)`, () => {
    const now = at('2026-10-08T07:00:00', loc.tz);
    const s = todaySnapshot(now, loc);
    assert.equal(s.preDawn, false);
    assert.equal(s.weekday.index, 4);
    assert.equal(+dayAnchor(now, loc.lat, loc.lon, loc.tz), +now);
    assert.match(dailyParigaram({ weekday: s.weekday.index }).at(0).reason.ta, /குரு/);
  });

  test(`${name} 23:59 Wed 7 Oct: still Wednesday`, () => {
    const now = at('2026-10-07T23:59:00', loc.tz);
    const s = todaySnapshot(now, loc);
    assert.equal(s.preDawn, false);
    assert.equal(s.weekday.index, 3);
    assert.equal(s.weekday.lord, 'Mercury');
    assert.match(dailyParigaram({ weekday: s.weekday.index }).at(0).reason.ta, /புதன்/);
  });
}

test('London resident at 00:30 local on Thu 8 Oct: Thursday', () => {
  const now = at('2026-10-08T00:30:00', LONDON.tz);
  assert.equal(panchang(now, LONDON.lat, LONDON.lon, LONDON.tz).weekday.index, 3);
  const s = todaySnapshot(now, LONDON);
  assert.equal(s.preDawn, true);
  assert.equal(s.weekday.index, 4);
  assert.equal(s.horai[0].lord, 'Jupiter');
  // With the IANA zone name as tz: same answer.
  assert.equal(todaySnapshot(now, { ...LONDON, tz: 'Europe/London' }).weekday.index, 4);
});

test('morning brief scheduled before sunrise uses the calendar day (Thursday deity)', () => {
  const now = at('2026-10-08T05:00:00', 5.5);
  const b = morningBrief({ loc: CHENNAI, now, faith: 'hindu' });
  const spirit = b.lines.find((l) => l.key === 'spirit').text;
  if (!b.festival) assert.ok(spirit.ta.includes(DAY_DEITY[4].god.ta), spirit.ta);
  assert.equal(b.date, '2026-10-08');
  const q = b.lines.find((l) => l.key === 'quality').text;
  assert.match(q.ta, /வியாழன்/);
});
