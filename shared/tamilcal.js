// Tamil daily calendar (Nalla Naal / Panchangam): Tamil month & date, 60-year cycle name,
// Gowri Nalla Neram, festivals and vratham days, Subha Muhurtha days.
import { panchang, sunSidereal, findCrossing, vedicDay, NAKSHATRAS } from './astro.js';
import { occurrencesBetween } from './spiritual-kb.js';
import { isValidZone, zoneOffsetMinutes } from './datetime.js';

export const TAMIL_MONTHS = [
  { en: 'Chithirai', ta: 'சித்திரை' }, { en: 'Vaikasi', ta: 'வைகாசி' }, { en: 'Aani', ta: 'ஆனி' },
  { en: 'Aadi', ta: 'ஆடி' }, { en: 'Aavani', ta: 'ஆவணி' }, { en: 'Purattasi', ta: 'புரட்டாசி' },
  { en: 'Aippasi', ta: 'ஐப்பசி' }, { en: 'Karthigai', ta: 'கார்த்திகை' }, { en: 'Margazhi', ta: 'மார்கழி' },
  { en: 'Thai', ta: 'தை' }, { en: 'Maasi', ta: 'மாசி' }, { en: 'Panguni', ta: 'பங்குனி' },
];

// 60-year cycle; index 0 (Prabhava) began at Mesha Sankranti 1987.
const YEARS_EN = ['Prabhava', 'Vibhava', 'Sukla', 'Pramodhoota', 'Prajorpaththi', 'Aangirasa', 'Srimukha', 'Bhava', 'Yuva', 'Dhaathu',
  'Eesvara', 'Vegudhanya', 'Pramaadhi', 'Vikrama', 'Vishu', 'Chitrabhanu', 'Subhanu', 'Thaarana', 'Paarthiba', 'Viya',
  'Sarvajith', 'Sarvadhari', 'Virodhi', 'Vikruthi', 'Kara', 'Nandhana', 'Vijaya', 'Jaya', 'Manmatha', 'Dhunmugi',
  'Hevilambi', 'Vilambi', 'Vikari', 'Saarvari', 'Plava', 'Subakiruthu', 'Sobakiruthu', 'Krodhi', 'Visuvaavasu', 'Parabhava',
  'Plavanga', 'Keelaka', 'Saumya', 'Sadharana', 'Virodhakiruthu', 'Paridhaabi', 'Pramaadhisa', 'Aanandha', 'Rakshasa', 'Nala',
  'Pingala', 'Kaalayukthi', 'Siddharthi', 'Raudhri', 'Dhunmathi', 'Dhundhubhi', 'Rudhrodhgaari', 'Raktaakshi', 'Krodhana', 'Akshaya'];
const YEARS_TA = ['பிரபவ', 'விபவ', 'சுக்ல', 'பிரமோதூத', 'பிரஜோற்பத்தி', 'ஆங்கீரச', 'ஸ்ரீமுக', 'பவ', 'யுவ', 'தாது',
  'ஈஸ்வர', 'வெகுதானிய', 'பிரமாதி', 'விக்கிரம', 'விஷு', 'சித்திரபானு', 'சுபானு', 'தாரண', 'பார்த்திப', 'விய',
  'சர்வசித்து', 'சர்வதாரி', 'விரோதி', 'விக்ருதி', 'கர', 'நந்தன', 'விஜய', 'ஜய', 'மன்மத', 'துன்முகி',
  'ஹேவிளம்பி', 'விளம்பி', 'விகாரி', 'சார்வரி', 'பிலவ', 'சுபகிருது', 'சோபகிருது', 'குரோதி', 'விசுவாவசு', 'பராபவ',
  'பிலவங்க', 'கீலக', 'சௌமிய', 'சாதாரண', 'விரோதகிருது', 'பரிதாபி', 'பிரமாதீச', 'ஆனந்த', 'ராட்சச', 'நள',
  'பிங்கள', 'காளயுக்தி', 'சித்தார்த்தி', 'ரௌத்திரி', 'துன்மதி', 'துந்துபி', 'ருத்ரோத்காரி', 'ரக்தாட்சி', 'குரோதன', 'அட்சய'];

/** The 60 Tamil year names (index 0 = Prabhava; the cycle began at Mesha Sankranti 1987). */
export const TAMIL_YEARS = YEARS_EN.map((en, i) => ({ index: i, en, ta: YEARS_TA[i] }));

// Gowri Panchangam: 8 daytime and 8 night-time slots per weekday.
export const GOWRI = [
  { en: 'Uthi', ta: 'உத்தி', good: true },
  { en: 'Amirtham', ta: 'அமிர்தம்', good: true },
  { en: 'Rogam', ta: 'ரோகம்', good: false },
  { en: 'Labham', ta: 'லாபம்', good: true },
  { en: 'Dhanam', ta: 'தனம்', good: true },
  { en: 'Sugam', ta: 'சுகம்', good: true },
  { en: 'Soram', ta: 'சோரம்', good: false },
  { en: 'Visham', ta: 'விஷம்', good: false },
];
// The traditional Gowri table (Pambu Panchangam; matches Drik Panchang and Prokerala). Leaving out Visham, the other
// seven always run in one cycle — Uthi, Amirtham, Rogam, Laabam, Dhanam, Sugam, Soram. The day starts one step on per
// weekday (Sun Uthi … Sat Soram), the night starts four steps on from the day, and Visham sits in its own slot:
// by day it is always the Rahu Kalam slot, so a Gowri good time never falls inside Rahu Kalam.
const GOWRI_CYCLE = [0, 1, 2, 3, 4, 5, 6];
const GOWRI_VISHAM_DAY = [8, 2, 7, 5, 6, 4, 3];   // 1-based slot, Sun..Sat (= the Rahu Kalam slot)
const GOWRI_VISHAM_NIGHT = [4, 5, 3, 8, 2, 7, 6]; // 1-based slot, Sun..Sat night
const gowriRow = (start, vishamSlot) => {
  const row = Array.from({ length: 7 }, (_, i) => GOWRI_CYCLE[(start + i) % 7]);
  row.splice(vishamSlot - 1, 0, 7);
  return row;
};
/** GOWRI indexes for the 8 day and 8 night slots of a weekday (0 = Sunday). */
export const gowriOrder = (weekday) => ({ day: gowriRow(weekday, GOWRI_VISHAM_DAY[weekday]), night: gowriRow((weekday + 4) % 7, GOWRI_VISHAM_NIGHT[weekday]) });

const localDate = (d, tz) => new Date(d.getTime() + tz * 3600000);
const ymd = (d, tz) => localDate(d, tz).toISOString().slice(0, 10);
const dayNumber = (d, tz) => Math.floor(localDate(d, tz).getTime() / 86400000);

const sankrantiCache = [];
/** The Sun's entry into `rasi` most recently before `date` (cached — a month of days shares one). */
function sankrantiBefore(date, rasi) {
  const hit = sankrantiCache.find((c) => c.rasi === rasi && c.at <= date && date - c.at < 33 * 86400000);
  if (hit) return hit.at;
  const at = findCrossing(sunSidereal, rasi * 30, new Date(date.getTime() - 33 * 86400000), 34 * 24);
  sankrantiCache.push({ rasi, at });
  if (sankrantiCache.length > 48) sankrantiCache.shift();
  return at;
}

/** Tamil month, date and year for an instant. Month day 1 is the day whose sunset follows the Sankranti. */
export function tamilDate(date, lat, lon, tz) {
  const rasi = Math.floor(sunSidereal(date) / 30);
  const sankranti = sankrantiBefore(date, rasi);
  let day1 = dayNumber(sankranti, tz);
  const sDay = vedicDay(sankranti, lat, lon);
  if (sDay.sunset && sankranti > sDay.sunset && dayNumber(sDay.sunset, tz) === day1) day1 += 1;
  const dayOfMonth = dayNumber(date, tz) - day1 + 1;
  if (dayOfMonth < 1) {
    // Sankranti fell after today's sunset: today is still the last day of the previous month.
    const prev = tamilDate(new Date(date.getTime() - 86400000), lat, lon, tz);
    return { ...prev, day: prev.day + 1 };
  }
  const month = rasi;
  const g = localDate(date, tz);
  let yearStart = g.getUTCFullYear();
  // Early-year Margazhi, Thai, Maasi and Panguni belong to the Tamil year that began last April.
  if (g.getUTCMonth() < 4 && month >= 8) yearStart -= 1;
  const yi = (((yearStart - 1987) % 60) + 60) % 60;
  return {
    month, monthEn: TAMIL_MONTHS[month].en, monthTa: TAMIL_MONTHS[month].ta, day: dayOfMonth,
    year: { index: yi, en: YEARS_EN[yi], ta: YEARS_TA[yi] }, sankranti,
  };
}

/**
 * Gowri Nalla Neram slots for the Vedic day containing `date`: sunrise→sunset in 8 equal slots and
 * sunset→next sunrise in 8. On polar days (vedicDay().polar) sunrise/sunset are approximations, so every
 * slot is marked `approximate: true` for the UI.
 */
export function gowriPanchangam(day, weekday) {
  const slots = [];
  const approximate = !!day.polar;
  const dayLen = (day.sunset - day.sunrise) / 8;
  const nightLen = (day.nextSunrise - day.sunset) / 8;
  const order = gowriOrder(weekday);
  for (let i = 0; i < 8; i++) {
    const g = GOWRI[order.day[i]];
    slots.push({ ...g, part: 'day', approximate, start: new Date(day.sunrise.getTime() + i * dayLen), end: new Date(day.sunrise.getTime() + (i + 1) * dayLen) });
  }
  for (let i = 0; i < 8; i++) {
    const g = GOWRI[order.night[i]];
    slots.push({ ...g, part: 'night', approximate, start: new Date(day.sunset.getTime() + i * nightLen), end: new Date(day.sunset.getTime() + (i + 1) * nightLen) });
  }
  return slots;
}

// Rahu Kalam, Yamagandam and Kuligai are avoided even inside a Gowri good slot (the rule every Tamil panchangam
// follows). A good slot they overlap keeps its name but carries `clash`, and is never offered as nalla neram.
const CLASH = [['rahuKalam', 'rahu', 'Rahu Kalam', 'ராகு காலம்'], ['yamagandam', 'yama', 'Yamagandam', 'எமகண்டம்'], ['guligai', 'kuligai', 'Kuligai', 'குளிகை']];
const MIN_CLASH = 60000;
function markClashes(slots, periods) {
  return slots.map((g) => {
    if (!g.good) return g;
    const hit = CLASH.find(([k]) => periods[k] && Math.min(g.end, periods[k].end) - Math.max(g.start, periods[k].start) > MIN_CLASH);
    return hit ? { ...g, clash: { id: hit[1], en: hit[2], ta: hit[3] } } : g;
  });
}
/** A Gowri slot that is truly nalla neram: good, and not inside Rahu Kalam, Yamagandam or Kuligai. */
export const isNallaNeram = (g) => Boolean(g && g.good && !g.clash);

/**
 * The day's nalla neram windows from `from` on (day and night): clean Gowri good slots, back-to-back slots merged into
 * one window ("Dhanam, Sugam 3:01 – 5:56"). Every screen takes its good times from here, so they always agree.
 * @returns {{ start: Date, end: Date, part: 'day'|'night', names: {en,ta}[] }[]}
 */
export function nallaNeramWindows(td, from = null) {
  const t0 = from ? new Date(from).getTime() : -Infinity;
  const out = [];
  for (const g of (td?.gowri || []).filter(isNallaNeram).sort((a, b) => new Date(a.start) - new Date(b.start))) {
    const s = new Date(g.start).getTime(), e = new Date(g.end).getTime();
    if (e <= t0) continue;
    const last = out[out.length - 1];
    if (last && Math.abs(last.end.getTime() - s) < 1000 && last.part === g.part) { last.end = new Date(e); last.names.push({ en: g.en, ta: g.ta }); continue; }
    out.push({ start: new Date(s), end: new Date(e), part: g.part, names: [{ en: g.en, ta: g.ta }] });
  }
  // Slots and kalams are computed separately, so their edges can differ by a millisecond: snap each window to the
  // neighbouring kalam's edge so a window never touches Rahu Kalam, Yamagandam or Kuligai.
  const kalams = CLASH.map(([k]) => td?.[k]).filter(Boolean).map((k) => [new Date(k.start).getTime(), new Date(k.end).getTime()]);
  for (const w of out) {
    for (const [ks, ke] of kalams) {
      if (ke > w.start.getTime() && ke - w.start.getTime() <= MIN_CLASH) w.start = new Date(ke);
      if (ks < w.end.getTime() && w.end.getTime() - ks <= MIN_CLASH) w.end = new Date(ks);
    }
  }
  return out.filter((w) => w.end > w.start && w.end.getTime() > t0);
}

const MUHURTHA_STARS = new Set([3, 4, 9, 11, 12, 14, 16, 18, 20, 21, 25, 26]); // Rohini, Mrigasirisham, Magam, Uthiram, Hastham, Swathi, Anusham, Moolam, Uthiradam, Thiruvonam, Uthirattathi, Revathi
const BAD_TITHI_IN_PAKSHA = new Set([3, 7, 8, 13]); // Chathurthi, Ashtami, Navami, Chathurdasi

// ---------------------------------------------------------------- festivals and vratham days
// One source of truth: the dates come from the festival engine in spiritual-kb.js (the same occurrence rules the
// Festivals screen and Ask Thunai use — sunrise tithi/star with the Pradosham-at-sunset, Sivaratri / Krishna
// Jayanthi-at-midnight, Vinayagar Chathurthi-at-midday and Sankatahara-at-moonrise exceptions, kshaya tithis kept on
// the day they run, a star occurring twice in a Tamil month taking the full-moon one). This table only chooses which
// KB entries the calendar shows and their short calendar names, in display order.
// (spiritual-kb.js imports this module too; the cycle is safe because neither side uses the other at load time.)
/** Calendar festival / vratham set: { id (KB entry id), en, ta, kind }. 'month-start' is named per month. */
export const CALENDAR_FESTIVALS = [
  { id: 'amavasai', en: 'Amavasai', ta: 'அமாவாசை', kind: 'vratham' },
  { id: 'pournami', en: 'Pournami', ta: 'பௌர்ணமி', kind: 'vratham' },
  { id: 'ekadasi', en: 'Ekadasi', ta: 'ஏகாதசி', kind: 'vratham' },
  { id: 'sashti', en: 'Sashti Viratham', ta: 'சஷ்டி விரதம்', kind: 'vratham' },
  { id: 'sankatahara', en: 'Sankatahara Chathurthi', ta: 'சங்கடஹர சதுர்த்தி', kind: 'vratham' },
  { id: 'masa-sivaratri', en: 'Masa Sivarathri', ta: 'மாத சிவராத்திரி', kind: 'vratham' },
  { id: 'pradosham', en: 'Pradosham', ta: 'பிரதோஷம்', kind: 'vratham' },
  { id: 'karthigai', en: 'Karthigai Viratham', ta: 'கார்த்திகை விரதம்', kind: 'vratham' },
  { id: 'thiruvonam', en: 'Thiruvonam Viratham', ta: 'திருவோண விரதம்', kind: 'vratham' },
  { id: 'tamil-new-year', en: 'Tamil New Year', ta: 'தமிழ்ப் புத்தாண்டு', kind: 'festival' },
  { id: 'thai-pongal', en: 'Thai Pongal', ta: 'தைப் பொங்கல்', kind: 'festival' },
  { id: 'month-start', en: null, ta: null, kind: 'festival' },
  { id: 'aadi-perukku', en: 'Aadi Perukku', ta: 'ஆடிப் பெருக்கு', kind: 'festival' },
  { id: 'mattu-pongal', en: 'Mattu Pongal', ta: 'மாட்டுப் பொங்கல்', kind: 'festival' },
  { id: 'chithra-pournami', en: 'Chithra Pournami', ta: 'சித்ரா பௌர்ணமி', kind: 'festival' },
  { id: 'vaikasi-visakam', en: 'Vaikasi Visakam', ta: 'வைகாசி விசாகம்', kind: 'festival' },
  { id: 'aadi-pooram', en: 'Aadi Pooram', ta: 'ஆடிப் பூரம்', kind: 'festival' },
  { id: 'aadi-amavasai', en: 'Aadi Amavasai', ta: 'ஆடி அமாவாசை', kind: 'festival' },
  { id: 'vinayagar-chathurthi', en: 'Vinayagar Chathurthi', ta: 'விநாயகர் சதுர்த்தி', kind: 'festival' },
  { id: 'krishna-jayanthi', en: 'Krishna Jayanthi', ta: 'கிருஷ்ண ஜெயந்தி', kind: 'festival' },
  { id: 'mahalaya-amavasai', en: 'Mahalaya Amavasai', ta: 'மகாளய அமாவாசை', kind: 'festival' },
  { id: 'navaratri-day-1', en: 'Navarathri Begins', ta: 'நவராத்திரி ஆரம்பம்', kind: 'festival' },
  { id: 'saraswathi-pooja', en: 'Saraswathi Pooja', ta: 'சரஸ்வதி பூஜை', kind: 'festival' },
  { id: 'vijayadasami', en: 'Vijayadasami', ta: 'விஜயதசமி', kind: 'festival' },
  { id: 'soorasamharam', en: 'Kanda Sashti Soorasamharam', ta: 'கந்த சஷ்டி சூரசம்ஹாரம்', kind: 'festival' },
  { id: 'deepavali', en: 'Deepavali', ta: 'தீபாவளி', kind: 'festival' },
  { id: 'karthigai-deepam', en: 'Karthigai Deepam', ta: 'கார்த்திகை தீபம்', kind: 'festival' },
  { id: 'vaikunta-ekadasi', en: 'Vaikunta Ekadasi', ta: 'வைகுண்ட ஏகாதசி', kind: 'festival' },
  { id: 'arudra-darisanam', en: 'Arudra Darisanam', ta: 'ஆருத்ரா தரிசனம்', kind: 'festival' },
  { id: 'thai-poosam', en: 'Thai Poosam', ta: 'தைப்பூசம்', kind: 'festival' },
  { id: 'thai-amavasai', en: 'Thai Amavasai', ta: 'தை அமாவாசை', kind: 'festival' },
  { id: 'masi-magam', en: 'Maasi Magam', ta: 'மாசி மகம்', kind: 'festival' },
  { id: 'maha-sivaratri', en: 'Maha Sivarathri', ta: 'மகா சிவராத்திரி', kind: 'festival' },
  { id: 'panguni-uthiram', en: 'Panguni Uthiram', ta: 'பங்குனி உத்திரம்', kind: 'festival' },
];
const CAL_IDS = new Set(CALENDAR_FESTIVALS.map((f) => f.id));

// KB occurrences of the calendar set, per place and Gregorian month (the KB pads each window by 40 days, so a month
// window gives the same dates as a longer one). A calendar month view or a Today card costs one window; neighbouring
// months share the KB's per-day snapshots.
const festCache = new Map();
function festivalIdsByDate(iso, lat, lon, tz) {
  const ym = iso.slice(0, 7);
  const key = `${lat.toFixed(3)},${lon.toFixed(3)},${tz},${ym}`;
  let byDate = festCache.get(key);
  if (!byDate) {
    const [y, m] = ym.split('-').map(Number);
    const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
    byDate = new Map();
    for (const o of occurrencesBetween(`${ym}-01`, days, { lat, lon }, tz)) {
      if (!CAL_IDS.has(o.id) || o.date.slice(0, 7) !== ym) continue;
      if (!byDate.has(o.date)) byDate.set(o.date, new Set());
      byDate.get(o.date).add(o.id);
    }
    festCache.set(key, byDate);
    if (festCache.size > 60) festCache.delete(festCache.keys().next().value);
  }
  return byDate.get(iso) || null;
}

/** Festivals and vratham days of one civil day (KB rules), in calendar display order. */
function festivalsFor(iso, td, lat, lon, tz) {
  const ids = festivalIdsByDate(iso, lat, lon, tz);
  if (!ids) return [];
  const out = [];
  for (const f of CALENDAR_FESTIVALS) {
    if (!ids.has(f.id)) continue;
    if (f.id === 'month-start') {
      const m = TAMIL_MONTHS[td.month];
      out.push({ id: f.id, en: `${m.en} Month Begins`, ta: `${m.ta} மாதப் பிறப்பு`, kind: f.kind });
    } else out.push({ ...f });
  }
  return out;
}

/** One day of the Tamil calendar (Panchangam at sunrise, plus Gowri, Nalla Neram and festivals). */
export function tamilDay(dateLocalNoon, lat, lon, tz) {
  const day = vedicDay(dateLocalNoon, lat, lon);
  const atSunrise = new Date(day.sunrise.getTime() + 60000);
  const p = panchang(atSunrise, lat, lon, tz);
  // The Tamil date follows the Sun's rasi at sunset (a Sankranti before sunset starts the new month that day).
  const td = tamilDate(new Date(day.sunset.getTime() - 60000), lat, lon, tz);
  const gowri = markClashes(gowriPanchangam(day, p.weekday.index), p);
  const pakshaTithi = p.tithi.index % 15;
  // Aadi, Purattasi and Margazhi carry no wedding muhurtham in Tamil practice (the same months Prasnam avoids for
  // marriage and griha pravesam — shared/prasna.js avoidMonths), so the calendar does not mark them.
  const muhurthaDay = MUHURTHA_STARS.has(p.nakshatra.index) && !BAD_TITHI_IN_PAKSHA.has(pakshaTithi)
    && p.tithi.index !== 29 && ![2, 6].includes(p.weekday.index) && !BAD_YOGA_IDX.has(p.yoga.index)
    && !NO_MUHURTHAM_MONTHS.has(td.month);
  const iso = ymd(dateLocalNoon, tz);
  return {
    date: iso,
    tamil: td,
    weekday: p.weekday,
    sunrise: day.sunrise, sunset: day.sunset,
    tithi: p.tithi, nakshatra: p.nakshatra, yoga: p.yoga, karana: p.karana, karanaTa: p.karanaTa, moonRasi: p.moonRasi,
    rahuKalam: p.rahuKalam, yamagandam: p.yamagandam, guligai: p.guligai,
    gowri,
    nallaNeram: gowri.filter((g) => isNallaNeram(g) && g.part === 'day'),
    festivals: festivalsFor(iso, td, lat, lon, tz),
    muhurthaDay,
    paksha: p.tithi.paksha,
    // Chandrashtamam: the birth star group for which the Moon today is in the 8th rasi.
    chandrashtamaRasi: (p.moonRasi.index + 5) % 12,
  };
}

const BAD_YOGA_IDX = new Set([0, 5, 8, 9, 12, 14, 16, 18, 26]);
/** Tamil months without wedding muhurtham: Aadi (3), Purattasi (5), Margazhi (8). */
export const NO_MUHURTHAM_MONTHS = new Set([3, 5, 8]);

/**
 * UTC offset (hours) in force at a place on a given calendar day: the zone's own offset that day (daylight saving
 * changes during a month or between today and a later date), else the fixed `tz`.
 */
export function offsetOnDay(year, month0, day, tz, zone) {
  if (!zone || !isValidZone(zone)) return tz;
  try { return zoneOffsetMinutes(zone, Date.UTC(year, month0, day, 12) - tz * 3600000) / 60; } catch { return tz; }
}

/** All days of a Gregorian month in the Tamil calendar. With `zone`, each day uses that day's own UTC offset (`day.tz`). */
export function tamilMonth(year, month0, lat, lon, tz, { zone = null } = {}) {
  const days = [];
  const count = new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
  for (let d = 1; d <= count; d++) {
    const dtz = offsetOnDay(year, month0, d, tz, zone);
    const noon = new Date(Date.UTC(year, month0, d, 12) - dtz * 3600000);
    days.push({ ...tamilDay(noon, lat, lon, dtz), tz: dtz });
  }
  return days;
}

export const starName = (i) => NAKSHATRAS[i];
