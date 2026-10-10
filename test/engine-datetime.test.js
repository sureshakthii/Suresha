// Birth inputs, historical time zones and calendar age.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { zonedToUtc, zoneOffsetMinutes, birthInput, ageOn, ageBand, isValidZone, localDateIn } from '../shared/datetime.js';
import { birthChart } from '../shared/astro.js';

const iso = (r) => r.utc.toISOString();

test('India: modern IST +5:30 and war-time +6:30 (1942–45)', () => {
  assert.equal(iso(zonedToUtc('1990-01-01', '10:00', 'Asia/Kolkata')), '1990-01-01T04:30:00.000Z');
  const war = zonedToUtc('1943-06-01', '10:00', 'Asia/Kolkata');
  assert.equal(war.offsetMinutes, 390);
  assert.equal(iso(war), '1943-06-01T03:30:00.000Z');
});

test('Dubai +4:00, London BST, Sydney AEDT', () => {
  assert.equal(iso(zonedToUtc('1995-05-01', '10:00', 'Asia/Dubai')), '1995-05-01T06:00:00.000Z');
  assert.equal(iso(zonedToUtc('2020-07-01', '12:00', 'Europe/London')), '2020-07-01T11:00:00.000Z');
  assert.equal(iso(zonedToUtc('2020-01-15', '12:00', 'Australia/Sydney')), '2020-01-15T01:00:00.000Z');
});

test('nonexistent local time (spring-forward gap) is flagged and moved forward', () => {
  const r = zonedToUtc('2021-03-14', '02:30', 'America/New_York');
  assert.equal(r.nonexistent, true);
  assert.equal(r.ambiguous, false);
  assert.equal(iso(r), '2021-03-14T07:30:00.000Z'); // = 03:30 EDT
});

test('ambiguous local time (fall-back) is flagged; earlier by default, later on request', () => {
  const r = zonedToUtc('2021-11-07', '01:30', 'America/New_York');
  assert.equal(r.ambiguous, true);
  assert.equal(r.alternatives.length, 2);
  assert.equal(iso(r), '2021-11-07T05:30:00.000Z'); // EDT
  assert.equal(iso(zonedToUtc('2021-11-07', '01:30', 'America/New_York', { disambiguation: 'later' })), '2021-11-07T06:30:00.000Z');
});

test('zone helpers', () => {
  assert.equal(isValidZone('Asia/Kolkata'), true);
  assert.equal(isValidZone('Mars/Olympus'), false);
  assert.throws(() => zonedToUtc('2020-01-01', '10:00', 'Mars/Olympus'));
  assert.equal(zoneOffsetMinutes('Asia/Dubai', new Date('2024-01-01T00:00:00Z')), 240);
  assert.equal(localDateIn('Asia/Kolkata', new Date('2026-10-05T19:00:00Z')), '2026-10-06'); // 00:30 IST
});

test('birthInput records original local time, zone, UTC, place and precision', () => {
  const b = birthInput({ date: '1943-06-01', time: '10:00', zone: 'Asia/Kolkata', lat: 13.08, lon: 80.27, timePrecision: 'approximate' });
  assert.deepEqual(b.local, { date: '1943-06-01', time: '10:00', usedTime: '10:00' });
  assert.equal(b.zone, 'Asia/Kolkata');
  assert.equal(b.tzSource, 'iana');
  assert.equal(b.offsetMinutes, 390);
  assert.equal(b.timePrecision, 'approximate');
  assert.equal(b.lat, 13.08);
  const u = birthInput({ date: '2000-01-01', lat: 1, lon: 2, tz: 5.5 });
  assert.equal(u.timePrecision, 'unknown');
  assert.equal(u.local.usedTime, '12:00');
  assert.equal(u.utc.toISOString(), '2000-01-01T06:30:00.000Z');
  assert.equal(birthInput({ date: '2000-01-01', time: '10:00', tz: 5.5 }).timePrecision, 'exact');
});

test('birthChart: zone wins over numeric tz (1943 war time differs by 1 h)', () => {
  const base = { name: 'W', date: '1943-06-01', time: '10:00', lat: 13.08, lon: 80.27 };
  const z = birthChart({ ...base, zone: 'Asia/Kolkata', tz: 5.5 });
  const t = birthChart({ ...base, tz: 5.5 });
  assert.equal(z.utc.getTime(), t.utc.getTime() - 3600000);
  assert.equal(z.tz, 6.5);
  assert.equal(z.zone, 'Asia/Kolkata');
  // Modern India: zone and tz agree exactly.
  const a = birthChart({ ...base, date: '1990-01-01', zone: 'Asia/Kolkata' });
  const b = birthChart({ ...base, date: '1990-01-01', tz: 5.5 });
  assert.equal(a.lagna.longitude, b.lagna.longitude);
  assert.equal(a.timePrecision, 'exact');
});

test('ageOn: calendar arithmetic around birthdays', () => {
  assert.equal(ageOn('2000-05-10', '2026-05-09'), 25);
  assert.equal(ageOn('2000-05-10', '2026-05-10'), 26);
  assert.equal(ageOn('2000-12-31', '2001-01-01'), 0);
  assert.equal(ageOn('2019-10-06', '2026-10-06'), 7);
  assert.equal(ageOn('2000-01-01', '2000-01-01'), 0);
  assert.equal(ageOn('2000-01-02', '2000-01-01'), null); // reference before birth
  assert.equal(ageOn('2001-02-29', '2026-01-01'), null); // invalid date
  assert.equal(ageOn('bad', '2026-01-01'), null);
});

test('ageOn: leap-day policy — 29 Feb birthday counts on 28 Feb in non-leap years', () => {
  assert.equal(ageOn('2008-02-29', '2026-02-27'), 17);
  assert.equal(ageOn('2008-02-29', '2026-02-28'), 18);
  assert.equal(ageOn('2008-02-29', '2028-02-28'), 19); // leap year: birthday is 29 Feb
  assert.equal(ageOn('2008-02-29', '2028-02-29'), 20);
  assert.equal(ageOn('2000-02-29', '2100-02-28'), 100); // 2100 is not a leap year
});

test('ageBand', () => {
  const cases = [[0, '0-5'], [5, '0-5'], [6, '6-12'], [12, '6-12'], [13, '13-17'], [17, '13-17'], [18, '18-25'],
    [25, '18-25'], [26, '26-59'], [59, '26-59'], [60, '60+'], [104, '60+'], [null, 'unknown'], [-1, 'unknown'], [NaN, 'unknown']];
  for (const [a, b] of cases) assert.equal(ageBand(a), b, String(a));
});
