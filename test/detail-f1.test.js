// Detail audit (F1): one day verdict, weekday names, one dasa boundary convention, "வரை" after the time, and the
// shared date / time formatter (shared/fmt.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { birthChart, panchang } from '../shared/astro.js';
import * as F from '../shared/fmt.js';
import { dailyReview, dayVerdict, DAY_LABEL } from '../shared/daily.js';
import { dayQuality, morningBrief } from '../shared/daily-brief.js';
import { dailyParigaram } from '../shared/remedies.js';

const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const self = { name: 'Suresh', date: '1984-03-15', time: '06:45:00', lat: 13.0827, lon: 80.2707, tz: 5.5 };
const chart = birthChart(self);
const DUBAI = { lat: 25.2048, lon: 55.2708, tz: 4 };

// ------------------------------------------------------------------ fmt.js
test('fmt: days, months, 12-hour clocks with அதிகாலை, ranges without a repeated day part', () => {
  assert.equal(F.fmtDay('2026-10-07', 'ta'), '7 அக்டோபர் 2026');
  assert.equal(F.fmtDay('2026-10-07', 'en'), '7 Oct 2026');
  assert.equal(F.fmtMonth('2027-12-01', 'ta'), 'டிசம்பர் 2027');
  assert.equal(F.fmtMonth('2027-12-01', 'en'), 'Dec 2027');
  const at = (h, m = 0) => new Date(Date.UTC(2026, 9, 7, h, m));
  assert.equal(F.fmtClock(at(3, 5), 'ta', 0), 'அதிகாலை 3:05');
  assert.equal(F.fmtClock(at(10, 38), 'ta', 0), 'காலை 10:38');
  assert.equal(F.fmtClock(at(22, 0), 'en', 0), '10:00 PM');
  assert.equal(F.fmtClockRange(at(12, 6), at(13, 34), 'ta', 0), 'மதியம் 12:06 – 1:34');
  assert.equal(F.fmtClockRange(at(11, 56), at(13, 26), 'en', 0), '11:56 AM – 1:26 PM');
  assert.equal(F.fmtClockRange(at(6, 13), at(10, 38), 'en', 0), '6:13 – 10:38 AM');
  assert.equal(F.fmtBirth('1984-03-15', '06:45', 'ta'), '15 மார்ச் 1984, காலை 6:45');
  assert.equal(F.fmtBirth('1984-03-15', '18:05', 'en'), '15 Mar 1984, 6:05 PM');
  assert.equal(F.fmtYMD(3.55, 'ta'), '3 வ 6 மா 18 நா');
  assert.equal(F.fmtCountdown(40 * 3600000 + 8 * 60000, 'ta'), '1 நாள் 16 மணி');
  assert.equal(F.fmtCountdown(33 * 60000 + 9000, 'ta'), '00:33:09');
  assert.equal(F.weekdayName(2, 'ta'), 'செவ்வாய்க்கிழமை');
  assert.equal(F.planetAdjTa('Moon', 'சந்திரன்'), 'சந்திர');
  assert.equal(F.planetAdjTa('Mars', 'செவ்வாய்'), 'செவ்வாய்');
});

// ------------------------------------------------------------------ #14 "வரை" after the time
test('#14: Tamil "வரை" always comes after the time or date', () => {
  assert.equal(F.until('காலை 10:38', 'ta'), 'காலை 10:38 வரை');
  assert.equal(F.until('10:38 AM', 'en'), 'till 10:38 AM');
  assert.equal(F.from('ஆகஸ்ட் 2026', 'ta'), 'ஆகஸ்ட் 2026 முதல்');
  const files = ['public/screens-main.js', 'public/screens-guide.js', 'public/screens-roadmap.js', 'public/screens-world.js', 'public/residence-ui.js', 'public/screens-health.js'];
  for (const f of files) assert.doesNotMatch(src(f), /L\('(till|until)', 'வரை'\)\}? \$\{/, `${f}: "வரை" before the time`);
});

// ------------------------------------------------------------------ #1 one verdict
test('#1: one day verdict and one set of labels across Today, family list, Panchangam, Guru vakku and the brief', () => {
  assert.deepEqual(Object.values(DAY_LABEL).map((x) => x.ta), ['சிறப்பான நாள்', 'நல்ல நாள்', 'நிலையான நாள்', 'கவனமான நாள்']);
  assert.deepEqual(Object.values(DAY_LABEL).map((x) => x.en), ['Excellent day', 'Good day', 'Steady day', 'Careful day']);
  for (let d = 0; d < 30; d++) {
    const now = new Date(Date.UTC(2026, 9, 1 + d, 5, 40));
    const snap = panchang(now, DUBAI.lat, DUBAI.lon, DUBAI.tz);
    const v = dayVerdict(chart, snap, now);
    const r = dailyReview(chart, snap, now);
    const q = dayQuality(chart, snap, now);
    assert.equal(r.level, v.level, `review vs verdict day ${d}`);
    assert.equal(r.label.ta, v.label.ta);
    assert.equal(q.level, v.level, `brief vs verdict day ${d}`);
    if (v.chandrashtamam) assert.equal(v.level, 'care');
  }
  const now = new Date('2026-10-07T05:40:00Z');
  const b = morningBrief({ chart, loc: DUBAI, now });
  assert.equal(b.level, dayVerdict(chart, panchang(now, DUBAI.lat, DUBAI.lon, DUBAI.tz), now).level);
  // Screens read the one function, and the old private labels are gone.
  assert.match(src('public/screens-main.js'), /dayVerdict\(chart, snap, now\)/);
  for (const f of ['public/screens-main.js', 'public/screens-guide.js', 'shared/daily.js', 'shared/daily-brief.js']) {
    assert.doesNotMatch(src(f), /சுமாரான நாள்|நிதானமான நாள்|Average day|Main-character day|அமைதியா இருங்க/, f);
  }
});

// ------------------------------------------------------------------ #7 weekday names
test('#7: the daily parigaram names the weekday properly (ஞாயிற்றுக்கிழமை…சனிக்கிழமை), never "சந்திரன் கிழமை"', () => {
  for (let wd = 0; wd < 7; wd++) {
    const r = dailyParigaram({ weekday: wd, chart: null })[0].reason;
    assert.ok(r.ta.includes(F.WEEKDAYS_TA[wd]), r.ta);
    assert.doesNotMatch(r.ta, /(சூரியன்|சந்திரன்|செவ்வாய்|புதன்|குரு|சுக்கிரன்|சனி) கிழமை/, r.ta);
    assert.ok(r.en.includes(F.WEEKDAYS_EN[wd]), r.en);
  }
});

// ------------------------------------------------------------------ #8 dasa boundaries
test('#8: one dasa / bhukti boundary convention — start dates, "till" the day before the next start', () => {
  const tz = 5.5;
  const bh = chart.dasa.periods.flatMap((p) => p.bhuktis);
  for (let i = 0; i + 1 < bh.length; i++) {
    const lastDay = F.dayBefore(bh[i].end, tz);
    const nextStart = F.localYMD(bh[i + 1].start, tz);
    assert.equal(F.localYMD(new Date(Date.parse(`${lastDay}T12:00:00Z`) + 86400000), 0), nextStart, `bhukti ${i}`);
    assert.equal(F.periodLast(bh[i], 'ta', tz), F.fmtDay(lastDay, 'ta'));
  }
  // Chart (screens-main) and Full analysis (screens-world) use the same helpers — no raw UTC ISO dates.
  const main = src('public/screens-main.js'), world = src('public/screens-world.js');
  assert.match(main, /periodStartL\(/); assert.match(main, /periodLastL\(/);
  assert.match(world, /periodRangeL\(/); assert.match(world, /periodYears\(/);
  assert.doesNotMatch(world, /fmtIsoDate\(new Date\(b(h)?\.(start|end)\)\.toISOString/);
});
