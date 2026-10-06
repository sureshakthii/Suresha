// Star birthday (Natchathira Pirantha Naal) and milestone celebrations, checked against an INDEPENDENT brute-force
// day-by-day scan: for every civil day it takes sunrise/sunset straight from astronomy-engine, the Tamil month from
// the Sun's sidereal sign at that day's sunset (Sankranti before sunset = day 1 of the new month), and the Moon's
// nakshatra at sunrise. The function under test uses Sankranti root-finding and nakshatra passages instead.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as A from 'astronomy-engine';
import { moonSidereal, sunSidereal, birthChart } from '../shared/astro.js';
import {
  natchathiraBirthdays, milestones, tamilMonthSpan, starDayInMonth, birthTamilMonth, STAR_BIRTHDAY_RULE, nthFullMoonAfter,
} from '../shared/special.js';

const NAK = 360 / 27;
const CHENNAI = { lat: 13.0827, lon: 80.2707, tz: 5.5, zone: 'Asia/Kolkata' };
const LONDON = { lat: 51.5074, lon: -0.1278, tz: 0, zone: 'Europe/London' };

/** Brute force: one record per civil day (fixed standard offset `std` — sunrise is never near midnight here). */
function scanDays(loc, std, fromIso, n) {
  const obs = new A.Observer(loc.lat, loc.lon, 0);
  const out = [];
  for (let k = 0; k < n; k++) {
    const iso = new Date(Date.parse(`${fromIso}T00:00:00Z`) + k * 86400000).toISOString().slice(0, 10);
    const midnight = new Date(Date.parse(`${iso}T00:00:00Z`) - std * 3600000);
    const rise = A.SearchRiseSet('Sun', obs, +1, midnight, 1).date;
    const set = A.SearchRiseSet('Sun', obs, -1, rise, 1).date;
    out.push({ iso, rise, set, month: Math.floor(sunSidereal(set) / 30), star: Math.floor(moonSidereal(rise) / NAK) });
  }
  return out;
}

/** Expected star birthday in each month instance, from the brute-force table. */
function expected(days, star, month, twice = 'second') {
  const res = [];
  for (let i = 1; i < days.length - 1; i++) {
    const d = days[i];
    if (d.month !== month) continue;
    const atRise = d.star === star && days[i - 1].star !== star; // first sunrise of this passage
    // A passage that touches no sunrise: star−1 at this sunrise, star+1 at the next one → this day.
    const skipped = d.star === (star + 26) % 27 && days[i + 1].star === (star + 1) % 27;
    if (atRise || skipped) res.push({ iso: d.iso, skipped, i });
  }
  // Group by month instance (gap of > 40 days = next year).
  const groups = [];
  for (const r of res) {
    const g = groups[groups.length - 1];
    if (g && Date.parse(r.iso) - Date.parse(g[g.length - 1].iso) < 40 * 86400000) g.push(r); else groups.push([r]);
  }
  return groups.map((g) => (g.length > 1 && twice === 'second' ? g[g.length - 1] : g[0]));
}

const DAYS_CHN = scanDays(CHENNAI, 5.5, '2025-12-01', 800);

test('star birthday matches an independent day-by-day scan (Chennai, all 27 stars, sample months)', () => {
  let twiceSeen = 0, skippedSeen = 0;
  for (let star = 0; star < 27; star++) {
    const month = (star * 5) % 12; // spread over all twelve months
    const exp = expected(DAYS_CHN, star, month);
    const got = natchathiraBirthdays({ birthStar: star, birthTamilMonth: month, loc: CHENNAI, from: new Date('2026-01-01T00:00:00Z'), count: 2 });
    const expFrom = exp.filter((e) => e.iso >= '2026-01-01').slice(0, 2);
    assert.deepEqual(got.map((g) => g.date), expFrom.map((e) => e.iso), `star ${star} month ${month}`);
    for (const g of got) {
      assert.equal(g.tamil.month, month);
      if (g.chosenBy === 'second') twiceSeen++;
      if (g.basis === 'daytime') skippedSeen++;
    }
  }
  assert.ok(twiceSeen > 0, 'sample includes a month where the star comes twice');
  void skippedSeen;
});

test('twice in the month: default is the second occurrence, option "first" gives the first', () => {
  // Find a month in the scan where some star falls on two sunrises of separate passages.
  let found = null;
  for (let star = 0; star < 27 && !found; star++) {
    for (let month = 0; month < 12 && !found; month++) {
      const days = DAYS_CHN.filter((d, i) => i > 0 && d.month === month && d.star === star && DAYS_CHN[i - 1].star !== star && d.iso >= '2026-01-01' && d.iso < '2027-01-01');
      if (days.length === 2) found = { star, month, days };
    }
  }
  assert.ok(found, 'a double-star month exists in 2026');
  const from = new Date(`${found.days[0].iso}T00:00:00Z`);
  const from0 = new Date(from.getTime() - 5 * 86400000);
  const second = natchathiraBirthdays({ birthStar: found.star, birthTamilMonth: found.month, loc: CHENNAI, from: from0, count: 1 })[0];
  const first = natchathiraBirthdays({ birthStar: found.star, birthTamilMonth: found.month, loc: CHENNAI, from: from0, count: 1, twice: 'first' })[0];
  assert.equal(second.date, found.days[1].iso);
  assert.equal(first.date, found.days[0].iso);
  assert.deepEqual(second.occurrences, [found.days[0].iso, found.days[1].iso]);
  assert.equal(STAR_BIRTHDAY_RULE.twiceDefault, 'second');
});

test('a star that touches no sunrise is still found (day it prevails longest), with a note', () => {
  let hit = null;
  for (let i = 1; i < DAYS_CHN.length - 1 && !hit; i++) {
    const d = DAYS_CHN[i];
    const s = (d.star + 1) % 27;
    if (DAYS_CHN[i + 1].star === (s + 1) % 27 && d.iso >= '2026-01-01') hit = { iso: d.iso, star: s, month: d.month };
  }
  assert.ok(hit, 'a skipped-sunrise star exists in the scan');
  const span = tamilMonthSpan(hit.month, new Date(Date.parse(`${hit.iso}T00:00:00Z`) - 40 * 86400000), CHENNAI);
  const all = [starDayInMonth(hit.star, span, CHENNAI, { twice: 'first' }), starDayInMonth(hit.star, span, CHENNAI)];
  const r = all.find((x) => x.date === hit.iso);
  assert.ok(r, `found ${hit.iso}: ${all.map((x) => x.date)}`);
  assert.equal(r.basis, 'daytime');
  assert.ok(r.note?.en && r.note?.ta);
});

test('the residence decides the date: London uses London sunrise and London Tamil-month days', () => {
  const days = scanDays(LONDON, 0, '2026-01-01', 400);
  for (const [star, month] of [[3, 9], [12, 4], [21, 7], [26, 0]]) {
    const exp = expected(days, star, month).filter((e) => e.iso >= '2026-01-15').slice(0, 1);
    const got = natchathiraBirthdays({ birthStar: star, birthTamilMonth: month, loc: { ...LONDON, zone: undefined }, from: new Date('2026-01-15T00:00:00Z'), count: 1 });
    assert.deepEqual(got.map((g) => g.date), exp.map((e) => e.iso), `London star ${star} month ${month}`);
  }
});

test('Tamil month span: Chithirai 2024 starts 14 Apr (Sankranti after sunset on the 13th), Thai 2024 starts 15 Jan', () => {
  assert.equal(tamilMonthSpan(0, new Date('2024-03-20T00:00:00Z'), CHENNAI).first, '2024-04-14');
  const thai = tamilMonthSpan(9, new Date('2023-12-20T00:00:00Z'), CHENNAI);
  assert.equal(thai.first, '2024-01-15');
  assert.equal(thai.last, '2024-02-12');
});

test('a short sunrise touch (< 1 nazhigai) keeps the sunrise day and names the previous day as the alternative', () => {
  // Search the scan for a day where the star ends within 24 minutes after sunrise.
  let checked = 0;
  for (let star = 0; star < 27; star++) {
    for (let month = 0; month < 12; month++) {
      const span = tamilMonthSpan(month, new Date('2026-01-01T00:00:00Z'), CHENNAI);
      const r = starDayInMonth(star, span, CHENNAI);
      if (r.basis === 'sunrise' && r.minutesAfterSunrise < 24) {
        assert.ok(r.alternative && r.alternative < r.date && r.note.ta);
        checked++;
      } else assert.equal(r.alternative, null);
      if (checked) return;
    }
  }
});

test('Shashtiabdapoorthi is the star birthday in the Tamil birth month when the birth-year name returns', () => {
  for (const [date, time] of [['1966-08-28', '06:10'], ['1950-03-12', '05:40'], ['1971-01-14', '23:30']]) {
    const c = birthChart({ name: 'E', date, time, lat: 10.96, lon: 79.38, tz: 5.5 });
    const b = birthTamilMonth(c);
    const m = milestones(c, CHENNAI, new Date('2000-01-01T00:00:00Z'));
    const sh = m.find((x) => x.id === 'shashti');
    assert.equal(sh.day.tamil.month, b.month);
    assert.equal(sh.day.tamil.year.en, b.year.en, 'same Tamil year name (60-year cycle)');
    const age = (Date.parse(sh.day.date) - c.utc) / (365.2425 * 86400000);
    assert.ok(age > 59.9 && age < 60.1, `age ${age}`);
    const exp = expected(DAYS_FOR(sh.day.date), c.janmaNakshatra.index, b.month);
    assert.ok(exp.some((e) => e.iso === sh.day.date), `brute force agrees for ${date}: ${sh.day.date}`);
    const bh = m.find((x) => x.id === 'bheemaratha');
    const sa = m.find((x) => x.id === 'sathabhishekam');
    assert.ok(Math.abs((Date.parse(bh.day.date) - c.utc) / (365.2425 * 86400000) - 70) < 0.1);
    assert.ok(Math.abs((Date.parse(sa.day.date) - c.utc) / (365.2425 * 86400000) - 80) < 0.1);
    for (const x of m) assert.ok(x.basis.en && x.basis.ta);
  }
});
function DAYS_FOR(iso) {
  const start = new Date(Date.parse(`${iso}T00:00:00Z`) - 45 * 86400000).toISOString().slice(0, 10);
  return scanDays(CHENNAI, 5.5, start, 90);
}

test('1000th full moon: count of full moons after birth is exactly 1000', () => {
  const birth = new Date('1950-03-12T00:10:00Z');
  const fm = nthFullMoonAfter(birth, 1000);
  // Independent count with astronomy-engine's own full-moon search (phase 180°, tropical — the phase is frame-free).
  let n = 0;
  let t = A.MakeTime(birth);
  let last;
  while (n < 1000) { const q = A.SearchMoonPhase(180, t, 40); last = q; n++; t = q.AddDays(1); }
  assert.ok(Math.abs(last.date - fm) < 120000, `${last.date.toISOString()} vs ${fm.toISOString()}`);
});

test('milestones are marked past/upcoming against the residence date; Kanakabhishekam is not offered', () => {
  const c = birthChart({ name: 'E', date: '1950-03-12', time: '05:40', lat: 10.96, lon: 79.38, tz: 5.5 });
  const m = milestones(c, CHENNAI, new Date('2026-10-03T00:00:00Z'));
  assert.deepEqual(m.map((x) => x.id), ['shashti', 'bheemaratha', 'sathabhishekam']);
  assert.equal(m[0].past, true);
  assert.equal(m[2].past, false);
});

test('Thivasam: one date per Tamil month instance, tithi at aparahna, the second when the tithi comes twice', async () => {
  const { thivasamDates } = await import('../shared/special.js');
  const { sunMoonSeparation } = await import('../shared/astro.js');
  for (const death of ['2019-08-12T10:00:00Z', '2010-05-20T03:00:00Z', '2001-12-30T14:00:00Z']) {
    const th = thivasamDates({ death: new Date(death), loc: CHENNAI, from: new Date('2026-01-01T00:00:00Z'), count: 2 });
    assert.equal(th.dates.length, 2);
    const [a, b] = th.dates;
    assert.ok(Date.parse(b.date) - Date.parse(a.date) > 300 * 86400000, 'consecutive results are a year apart');
    // Brute force over that month: days whose aparahna tithi is the ancestor's tithi.
    const days = DAYS_FOR(a.date).filter((d) => d.month === a.tamil.month);
    const ok = days.filter((d) => Math.floor(sunMoonSeparation(new Date(d.rise.getTime() + (d.set - d.rise) * 0.7)) / 12) === th.tithi.index);
    if (!a.note) assert.equal(a.date, ok.filter((d, i) => i === 0 || Date.parse(d.iso) - Date.parse(ok[i - 1].iso) > 86400000).pop().iso, death);
  }
});
