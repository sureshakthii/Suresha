// One source of truth for festival dates: the festivals tamilcal.tamilDay() reports (Panchangam, Today and calendar
// screens) must be exactly the KB festival calendar (spiritual-kb.js: Festivals screen and Ask Thunai) for the
// shared festival set, every day of 2026–2027 in Chennai — plus the cases where the old sunrise-only flags were wrong.
import test from 'node:test';
import assert from 'node:assert/strict';
import { tamilDay, tamilMonth, CALENDAR_FESTIVALS, TAMIL_MONTHS } from '../shared/tamilcal.js';
import { festivalCalendar, getEntry } from '../shared/spiritual-kb.js';

const CHENNAI = { lat: 13.0827, lon: 80.2707 };
const TZ = 5.5;
const DAY = 86400000;
const noonOf = (iso) => new Date(Date.parse(`${iso}T12:00:00Z`) - TZ * 3600000);
const addDays = (iso, n) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);
const dayOf = (iso) => tamilDay(noonOf(iso), CHENNAI.lat, CHENNAI.lon, TZ);
const SHARED = new Set(CALENDAR_FESTIVALS.map((f) => f.id));
const NAME_OF = new Map(CALENDAR_FESTIVALS.map((f) => [f.id, f.en]));

test('every calendar festival id is a KB entry with an occurrence rule', () => {
  for (const f of CALENDAR_FESTIVALS) {
    const e = getEntry(f.id);
    assert.ok(e && e.rule, `${f.id} missing from the KB`);
    assert.ok(['festival', 'vratham'].includes(f.kind));
  }
});

test('tamilDay festivals = KB festival calendar for every day of 2026–2027 (Chennai)', () => {
  const kb = new Map();
  for (const r of festivalCalendar({ from: '2026-01-01', days: 730, loc: CHENNAI, tz: TZ })) {
    if (!SHARED.has(r.id)) continue;
    if (!kb.has(r.date)) kb.set(r.date, new Set());
    kb.get(r.date).add(r.id);
  }
  const mismatches = [];
  let seen = 0;
  for (let iso = '2026-01-01'; iso <= '2027-12-31'; iso = addDays(iso, 1)) {
    const d = dayOf(iso);
    assert.equal(d.date, iso);
    const ids = d.festivals.map((f) => f.id).sort();
    const want = [...(kb.get(iso) || [])].sort();
    seen += ids.length;
    if (ids.join() !== want.join()) mismatches.push(`${iso}: tamilDay [${ids}] vs KB [${want}]`);
    for (const f of d.festivals) {
      // names stay the calendar's short names (other modules match on them)
      if (f.id === 'month-start') assert.equal(f.en, `${TAMIL_MONTHS[d.tamil.month].en} Month Begins`);
      else assert.equal(f.en, NAME_OF.get(f.id));
    }
  }
  assert.deepEqual(mismatches, []);
  assert.ok(seen > 300,`expected a full calendar, saw ${seen} entries`);
});

test('tamilMonth agrees with tamilDay (shared per-month cache)', () => {
  for (const d of tamilMonth(2027, 9, CHENNAI.lat, CHENNAI.lon, TZ)) {
    assert.deepEqual(d.festivals, dayOf(d.date).festivals, d.date);
  }
});

const names = (iso) => dayOf(iso).festivals.map((f) => f.en);

test('Navarathri Begins is shown in 2027 although Prathamai touches no sunrise (kshaya)', () => {
  const days = [];
  for (let iso = '2027-09-15'; iso <= '2027-10-20'; iso = addDays(iso, 1)) if (names(iso).includes('Navarathri Begins')) days.push(iso);
  assert.deepEqual(days, ['2027-10-01']);
  assert.ok(names('2027-10-09').includes('Saraswathi Pooja'));
  assert.ok(names('2027-10-10').includes('Vijayadasami'));
});

test('Sankatahara Chathurthi is on one day only in July 2027 (moonrise rule)', () => {
  const both = ['2027-07-22', '2027-07-23'].filter((iso) => names(iso).includes('Sankatahara Chathurthi'));
  assert.deepEqual(both, ['2027-07-22']);
  // never on two consecutive days in 2026–2027
  let prev = false;
  for (let iso = '2026-01-01'; iso <= '2027-12-31'; iso = addDays(iso, 1)) {
    const has = names(iso).includes('Sankatahara Chathurthi');
    assert.ok(!(has && prev), `Sankatahara on consecutive days ending ${iso}`);
    prev = has;
  }
});

test('Maha Sivarathri 2027 is 6 March (midnight rule), not 7 March', () => {
  assert.ok(names('2027-03-06').includes('Maha Sivarathri'));
  assert.ok(!names('2027-03-07').includes('Maha Sivarathri'));
});
