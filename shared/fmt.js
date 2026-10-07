// One place for how Thunai writes dates, times and ranges, so every screen reads the same.
// Tamil: "7 அக்டோபர் 2026", "காலை 10:38", "காலை 6:13 – 10:38", "காலை 10:38 வரை".
// English: "7 Oct 2026", "10:38 AM", "6:13 – 10:38 AM", "till 10:38 AM".

export const MONTHS_TA = ['ஜனவரி', 'பிப்ரவரி', 'மார்ச்', 'ஏப்ரல்', 'மே', 'ஜூன்', 'ஜூலை', 'ஆகஸ்ட்', 'செப்டம்பர்', 'அக்டோபர்', 'நவம்பர்', 'டிசம்பர்'];
export const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const WEEKDAYS_TA = ['ஞாயிற்றுக்கிழமை', 'திங்கட்கிழமை', 'செவ்வாய்க்கிழமை', 'புதன்கிழமை', 'வியாழக்கிழமை', 'வெள்ளிக்கிழமை', 'சனிக்கிழமை'];
export const WEEKDAYS_TA_SHORT = ['ஞாயிறு', 'திங்கள்', 'செவ்வாய்', 'புதன்', 'வியாழன்', 'வெள்ளி', 'சனி'];
export const WEEKDAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const isTa = (lang) => lang === 'ta';
const local = (d, tz) => (tz == null ? d : new Date(d.getTime() + tz * 3600000));
const parts = (d, tz) => {
  if (typeof d === 'string') { const [y, m, day] = d.slice(0, 10).split('-').map(Number); return { y, m: m - 1, d: day, h: 0, min: 0, wd: new Date(Date.UTC(y, m - 1, day)).getUTCDay() }; }
  const x = local(d, tz);
  const get = tz == null ? (k) => x[`get${k}`]() : (k) => x[`getUTC${k}`]();
  return { y: get('FullYear'), m: get('Month'), d: get('Date'), h: get('Hours'), min: get('Minutes'), wd: get('Day') };
};

/** Day-part word for an hour (0–23): அதிகாலை 0–4, காலை 4–12, மதியம் 12–16, மாலை 16–19, இரவு 19–24. */
export const dayPartTa = (h) => (h < 4 ? 'அதிகாலை' : h < 12 ? 'காலை' : h < 16 ? 'மதியம்' : h < 19 ? 'மாலை' : 'இரவு');

/** "7 அக்டோபர் 2026" / "7 Oct 2026". `d` is a Date (with optional tz offset in hours) or "YYYY-MM-DD". */
export function fmtDay(d, lang = 'ta', tz = null, { weekday = false, year = true } = {}) {
  const p = parts(d, tz);
  const core = isTa(lang) ? `${p.d} ${MONTHS_TA[p.m]}${year ? ` ${p.y}` : ''}` : `${p.d} ${MONTHS_EN[p.m]}${year ? ` ${p.y}` : ''}`;
  if (!weekday) return core;
  return isTa(lang) ? `${core}, ${WEEKDAYS_TA_SHORT[p.wd]}` : `${WEEKDAYS_EN[p.wd].slice(0, 3)}, ${core}`;
}

/** "அக்டோபர் 2026" / "Oct 2026". */
export function fmtMonth(d, lang = 'ta', tz = null) {
  const p = parts(d, tz);
  return isTa(lang) ? `${MONTHS_TA[p.m]} ${p.y}` : `${MONTHS_EN[p.m]} ${p.y}`;
}

/** "காலை 10:38" / "10:38 AM" — always 12-hour. */
export function fmtClock(d, lang = 'ta', tz = null) {
  const p = parts(d, tz);
  const hm = `${((p.h + 11) % 12) + 1}:${String(p.min).padStart(2, '0')}`;
  return isTa(lang) ? `${dayPartTa(p.h)} ${hm}` : `${hm} ${p.h < 12 ? 'AM' : 'PM'}`;
}

/** Time range without repeating the day part: "மதியம் 12:06 – 1:34", "11:56 AM – 1:26 PM". */
export function fmtClockRange(a, b, lang = 'ta', tz = null) {
  const pa = parts(a, tz), pb = parts(b, tz);
  const hm = (p) => `${((p.h + 11) % 12) + 1}:${String(p.min).padStart(2, '0')}`;
  if (isTa(lang)) return dayPartTa(pa.h) === dayPartTa(pb.h) ? `${dayPartTa(pa.h)} ${hm(pa)} – ${hm(pb)}` : `${dayPartTa(pa.h)} ${hm(pa)} – ${dayPartTa(pb.h)} ${hm(pb)}`;
  const ap = (p) => (p.h < 12 ? 'AM' : 'PM');
  return ap(pa) === ap(pb) ? `${hm(pa)} – ${hm(pb)} ${ap(pb)}` : `${hm(pa)} ${ap(pa)} – ${hm(pb)} ${ap(pb)}`;
}

/** Date range: "7 – 12 அக்டோபர் 2026", "28 செப்டம்பர் – 3 அக்டோபர் 2026", "ஜூன் 2027 – டிசம்பர் 2028" (months: true). */
export function fmtDayRange(a, b, lang = 'ta', tz = null, { months = false } = {}) {
  if (months) return `${fmtMonth(a, lang, tz)} – ${fmtMonth(b, lang, tz)}`;
  const pa = parts(a, tz), pb = parts(b, tz);
  const M = isTa(lang) ? MONTHS_TA : MONTHS_EN;
  if (pa.y === pb.y && pa.m === pb.m) return `${pa.d} – ${pb.d} ${M[pb.m]} ${pb.y}`;
  if (pa.y === pb.y) return `${pa.d} ${M[pa.m]} – ${pb.d} ${M[pb.m]} ${pb.y}`;
  return `${fmtDay(a, lang, tz)} – ${fmtDay(b, lang, tz)}`;
}

/** "காலை 10:38 வரை" / "till 10:38 AM". `what` is already-formatted text (a clock, a date or a month). */
export const until = (what, lang = 'ta') => (isTa(lang) ? `${what} வரை` : `till ${what}`);
/** "காலை 10:38 முதல்" / "from 10:38 AM". */
export const from = (what, lang = 'ta') => (isTa(lang) ? `${what} முதல்` : `from ${what}`);

/** Birth date & time the way families write it: "15 மார்ச் 1984, காலை 6:45" / "15 Mar 1984, 6:45 AM". `date` "YYYY-MM-DD", `time` "HH:MM". */
export function fmtBirth(date, time, lang = 'ta') {
  const day = fmtDay(date, lang);
  if (!time) return day;
  const [h, m] = time.split(':').map(Number);
  const hm = `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')}`;
  return `${day}, ${isTa(lang) ? `${dayPartTa(h)} ${hm}` : `${hm} ${h < 12 ? 'AM' : 'PM'}`}`;
}

/** Years as "3 வ 6 மா 16 நா" / "3 y 6 m 16 d" (dasa balance). */
export function fmtYMD(years, lang = 'ta') {
  const y = Math.floor(years);
  const mFloat = (years - y) * 12;
  const m = Math.floor(mFloat);
  const d = Math.round((mFloat - m) * 30.4375);
  return isTa(lang) ? `${y} வ ${m} மா ${d} நா` : `${y} y ${m} m ${d} d`;
}

/** Tamil plural-safe count: "1 நாள்" / "3 நாட்கள்"; "1 day" / "3 days". */
export const count = (n, [taOne, taMany], [enOne, enMany], lang = 'ta') => (isTa(lang) ? `${n} ${n === 1 ? taOne : taMany}` : `${n} ${n === 1 ? enOne : enMany}`);
