// Written jathagam import: read a birth date the way it was written ("05/06/72", "1985-3-12", "12 Mar 1985") and
// say plainly when it can be read more than one way, so the family confirms it before any chart is calculated.
//   • day ≤ 12 and month ≤ 12 (05/06/1972: 5 June or May 6?) → both readings offered, Indian day-first listed first;
//   • a 2-digit year (72) → 1972 or 2072 (only past dates are kept);
//   • a Tamil year name written in the jathagam (e.g. Paarthiba) that does not match the Gregorian date → flagged.
// Pure functions (no DOM). The Tamil-year check uses shared/tamilcal.js (sunrise-based Tamil calendar).
import { tamilDate, TAMIL_YEARS } from './tamilcal.js';

const T = (en, ta) => ({ en, ta });
const MON = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const pad = (n) => String(n).padStart(2, '0');
const valid = (y, m, d) => {
  if (!(m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 1800)) return false;
  const t = new Date(Date.UTC(2000, m - 1, d)); t.setUTCFullYear(y);
  return t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
};
const iso = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;

export const DATE_FLAGS = {
  dayMonth: (a, b) => T(`“${a}” and “${b}” could each be the day or the month — please choose which date is right.`, `“${a}”, “${b}” — எது நாள், எது மாதம் என்பது இரு விதமாகப் படிக்கலாம் — சரியான தேதியைத் தேர்வு செய்யவும்.`),
  twoDigitYear: (yy) => T(`The year is written with two digits (“${yy}”) — please choose the century.`, `ஆண்டு இரண்டு இலக்கத்தில் (“${yy}”) — எந்த நூற்றாண்டு என்பதைத் தேர்வு செய்யவும்.`),
  unreadable: T('This date could not be read — please type it as day/month/year, e.g. 05/06/1972.', 'இந்தத் தேதியைப் படிக்க முடியவில்லை — நாள்/மாதம்/ஆண்டு என உள்ளிடவும், எ.கா. 05/06/1972.'),
  future: T('This date is in the future.', 'இந்தத் தேதி எதிர்காலத்தில் உள்ளது.'),
};

/**
 * Read a written date. Returns { candidates: [{ iso, reading }], flags: [{ code, en, ta }], ambiguous }.
 * `reading` is 'DMY' | 'MDY' | 'YMD'; candidates are ordered with the Indian day-first reading first.
 */
export function parseWrittenDate(text, { now = new Date() } = {}) {
  const s = String(text || '').trim().toLowerCase();
  const out = { input: text, candidates: [], flags: [], ambiguous: false };
  if (!s) return out;
  const today = now.toISOString().slice(0, 10);
  const add = (y, m, d, reading) => {
    if (!valid(y, m, d)) return;
    const v = iso(y, m, d);
    if (v > today) return;
    if (!out.candidates.some((c) => c.iso === v)) out.candidates.push({ iso: v, reading });
  };
  // Month written as a word: "12 Mar 1985", "March 12, 1985".
  const word = s.match(/([a-z]{3,})/);
  const nums = (s.match(/\d+/g) || []).map((x) => x);
  if (word && MON.includes(word[1].slice(0, 3)) && nums.length === 2) {
    const m = MON.indexOf(word[1].slice(0, 3)) + 1;
    const [d, yRaw] = Number(nums[0]) > 31 || nums[0].length === 4 ? [Number(nums[1]), nums[0]] : [Number(nums[0]), nums[1]];
    const years = yRaw.length === 2 ? [1900 + Number(yRaw), 2000 + Number(yRaw)] : [Number(yRaw)];
    if (yRaw.length === 2) out.flags.push({ code: 'two-digit-year', ...DATE_FLAGS.twoDigitYear(yRaw) });
    for (const y of years) add(y, m, d, 'DMY');
  } else if (nums.length === 3) {
    const [a, b, c] = nums;
    if (a.length === 4) add(Number(a), Number(b), Number(c), 'YMD');
    else {
      const years = c.length === 2 ? [1900 + Number(c), 2000 + Number(c)] : [Number(c)];
      if (c.length === 2) out.flags.push({ code: 'two-digit-year', ...DATE_FLAGS.twoDigitYear(c) });
      const dmy = Number(b) <= 12, mdy = Number(a) <= 12;
      for (const y of years) {
        if (dmy) add(y, Number(b), Number(a), 'DMY');
        if (mdy && a !== b) add(y, Number(a), Number(b), 'MDY');
      }
      if (dmy && mdy && Number(a) !== Number(b) && out.candidates.some((x) => x.reading === 'MDY')) out.flags.push({ code: 'day-month', ...DATE_FLAGS.dayMonth(a, b) });
    }
  }
  if (!out.candidates.length) out.flags.push({ code: 'unreadable', ...DATE_FLAGS.unreadable });
  out.ambiguous = out.candidates.length > 1;
  return out;
}

/** Tamil year name (60-year cycle) of a Gregorian date at local noon in the birth place. */
export function tamilYearOf(isoDate, { lat = 13.08, lon = 80.27, tz = 5.5 } = {}) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const noon = new Date(Date.UTC(y, m - 1, d, 12) - tz * 3600000);
  return tamilDate(noon, lat, lon, tz).year;
}

/**
 * Check a Tamil year written in the jathagam against the Gregorian date.
 * Returns { ok, expected: { index, en, ta }, entered, flag? }.
 */
export function tamilYearCheck(isoDate, yearIndex, place = {}) {
  if (yearIndex == null || yearIndex === '' || !isoDate) return { ok: true, expected: null, entered: null };
  const expected = tamilYearOf(isoDate, place);
  const entered = TAMIL_YEARS[Number(yearIndex)];
  const ok = expected.index === entered.index;
  return {
    ok, expected, entered,
    flag: ok ? null : T(`The jathagam's Tamil year “${entered.en}” does not match ${isoDate}, which falls in “${expected.en}”. Please check the date (or the year) before calculating.`, `ஜாதகத்தில் உள்ள தமிழ் ஆண்டு “${entered.ta}”, ${isoDate} தேதிக்கு உரிய “${expected.ta}” ஆண்டுடன் பொருந்தவில்லை. கணிப்பதற்கு முன் தேதியை (அல்லது ஆண்டை) சரிபார்க்கவும்.`),
  };
}
