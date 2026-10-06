// Tamil daily calendar (Nalla Naal / Panchangam): Tamil month & date, 60-year cycle name,
// Gowri Nalla Neram, festivals and vratham days, Subha Muhurtha days.
import { panchang, sunSidereal, findCrossing, vedicDay, NAKSHATRAS } from './astro.js';

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

// Gowri Panchangam: 8 daytime and 8 night-time slots per weekday.
export const GOWRI = [
  { en: 'Uthi', ta: 'உத்தி', good: true },
  { en: 'Amirdha', ta: 'அமிர்தம்', good: true },
  { en: 'Rogam', ta: 'ரோகம்', good: false },
  { en: 'Laabam', ta: 'லாபம்', good: true },
  { en: 'Dhanam', ta: 'தனம்', good: true },
  { en: 'Sugam', ta: 'சுகம்', good: true },
  { en: 'Soram', ta: 'சோரம்', good: false },
  { en: 'Visham', ta: 'விஷம்', good: false },
];
// Starting slot per weekday (Sun..Sat) for day and night; the order then continues cyclically.
const GOWRI_DAY_START = [0, 1, 2, 3, 4, 5, 6];
const GOWRI_NIGHT_START = [4, 5, 6, 7, 0, 1, 2];

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
  for (let i = 0; i < 8; i++) {
    const g = GOWRI[(GOWRI_DAY_START[weekday] + i) % 8];
    slots.push({ ...g, part: 'day', approximate, start: new Date(day.sunrise.getTime() + i * dayLen), end: new Date(day.sunrise.getTime() + (i + 1) * dayLen) });
  }
  for (let i = 0; i < 8; i++) {
    const g = GOWRI[(GOWRI_NIGHT_START[weekday] + i) % 8];
    slots.push({ ...g, part: 'night', approximate, start: new Date(day.sunset.getTime() + i * nightLen), end: new Date(day.sunset.getTime() + (i + 1) * nightLen) });
  }
  return slots;
}

const MUHURTHA_STARS = new Set([3, 4, 9, 11, 12, 14, 16, 18, 20, 21, 25, 26]); // Rohini, Mrigasirisham, Magam, Uthiram, Hastham, Swathi, Anusham, Moolam, Uthiradam, Thiruvonam, Uthirattathi, Revathi
const BAD_TITHI_IN_PAKSHA = new Set([3, 7, 8, 13]); // Chathurthi, Ashtami, Navami, Chathurdasi

/** Festivals and vratham days observed on a given sunrise Panchangam. */
function festivalsFor(p, td, sunsetTithi, middayTithi) {
  const out = [];
  const add = (en, ta, kind = 'festival') => out.push({ en, ta, kind });
  const t = p.tithi.index;
  const star = p.nakshatra.index;
  const m = td.month;
  if (t === 29) add('Amavasai', 'அமாவாசை', 'vratham');
  if (t === 14) add('Pournami', 'பௌர்ணமி', 'vratham');
  if (t === 10 || t === 25) add('Ekadasi', 'ஏகாதசி', 'vratham');
  if (t === 5) add('Sashti Viratham', 'சஷ்டி விரதம்', 'vratham');
  if (t === 18) add('Sankatahara Chathurthi', 'சங்கடஹர சதுர்த்தி', 'vratham');
  if (t === 28) add('Masa Sivarathri', 'மாத சிவராத்திரி', 'vratham');
  if (sunsetTithi === 12 || sunsetTithi === 27) add('Pradosham', 'பிரதோஷம்', 'vratham');
  if (star === 2) add('Karthigai Viratham', 'கார்த்திகை விரதம்', 'vratham');
  if (star === 21) add('Thiruvonam Viratham', 'திருவோண விரதம்', 'vratham');
  if (td.day === 1) {
    if (m === 0) add('Tamil New Year', 'தமிழ்ப் புத்தாண்டு');
    else if (m === 9) add('Thai Pongal', 'தைப் பொங்கல்');
    else add(`${TAMIL_MONTHS[m].en} Month Begins`, `${TAMIL_MONTHS[m].ta} மாதப் பிறப்பு`);
  }
  if (m === 3 && td.day === 18) add('Aadi Perukku', 'ஆடிப் பெருக்கு');
  if (m === 9 && td.day === 2) add('Mattu Pongal', 'மாட்டுப் பொங்கல்');
  if (m === 0 && t === 14) add('Chithra Pournami', 'சித்ரா பௌர்ணமி');
  if (m === 1 && star === 15) add('Vaikasi Visakam', 'வைகாசி விசாகம்');
  if (m === 3 && star === 10) add('Aadi Pooram', 'ஆடிப் பூரம்');
  if (m === 3 && t === 29) add('Aadi Amavasai', 'ஆடி அமாவாசை');
  if (m === 4 && middayTithi === 3) add('Vinayagar Chathurthi', 'விநாயகர் சதுர்த்தி'); // observed when Chathurthi prevails at midday
  if (m === 4 && t === 22) add('Krishna Jayanthi', 'கிருஷ்ண ஜெயந்தி');
  if (m === 5 && t === 29) add('Mahalaya Amavasai', 'மகாளய அமாவாசை');
  const navaratriSeason = m === 5 || (m === 6 && td.day <= 12);
  if (navaratriSeason && t === 0) add('Navarathri Begins', 'நவராத்திரி ஆரம்பம்');
  if (navaratriSeason && t === 8) add('Saraswathi Pooja', 'சரஸ்வதி பூஜை');
  if (navaratriSeason && t === 9) add('Vijayadasami', 'விஜயதசமி');
  if (m === 6 && t === 5) add('Kanda Sashti Soorasamharam', 'கந்த சஷ்டி சூரசம்ஹாரம்');
  if (m === 6 && t === 28) add('Deepavali', 'தீபாவளி');
  if (m === 7 && star === 2) add('Karthigai Deepam', 'கார்த்திகை தீபம்');
  if (m === 8 && t === 10) add('Vaikunta Ekadasi', 'வைகுண்ட ஏகாதசி');
  if (m === 8 && star === 5) add('Arudra Darisanam', 'ஆருத்ரா தரிசனம்');
  if (m === 9 && star === 7) add('Thai Poosam', 'தைப்பூசம்');
  if (m === 9 && t === 29) add('Thai Amavasai', 'தை அமாவாசை');
  if (m === 10 && star === 9) add('Maasi Magam', 'மாசி மகம்');
  if (m === 10 && t === 28) add('Maha Sivarathri', 'மகா சிவராத்திரி');
  if (m === 11 && star === 11) add('Panguni Uthiram', 'பங்குனி உத்திரம்');
  return out;
}

/** One day of the Tamil calendar (Panchangam at sunrise, plus Gowri, Nalla Neram and festivals). */
export function tamilDay(dateLocalNoon, lat, lon, tz) {
  const day = vedicDay(dateLocalNoon, lat, lon);
  const atSunrise = new Date(day.sunrise.getTime() + 60000);
  const p = panchang(atSunrise, lat, lon, tz);
  // The Tamil date follows the Sun's rasi at sunset (a Sankranti before sunset starts the new month that day).
  const td = tamilDate(new Date(day.sunset.getTime() - 60000), lat, lon, tz);
  const sunsetP = panchang(day.sunset, lat, lon, tz, { withEnds: false });
  const middayP = panchang(new Date((day.sunrise.getTime() + day.sunset.getTime()) / 2), lat, lon, tz, { withEnds: false });
  const gowri = gowriPanchangam(day, p.weekday.index);
  const pakshaTithi = p.tithi.index % 15;
  const muhurthaDay = MUHURTHA_STARS.has(p.nakshatra.index) && !BAD_TITHI_IN_PAKSHA.has(pakshaTithi)
    && p.tithi.index !== 29 && ![2, 6].includes(p.weekday.index) && !BAD_YOGA_IDX.has(p.yoga.index);
  return {
    date: ymd(dateLocalNoon, tz),
    tamil: td,
    weekday: p.weekday,
    sunrise: day.sunrise, sunset: day.sunset,
    tithi: p.tithi, nakshatra: p.nakshatra, yoga: p.yoga, karana: p.karana, karanaTa: p.karanaTa, moonRasi: p.moonRasi,
    rahuKalam: p.rahuKalam, yamagandam: p.yamagandam, guligai: p.guligai,
    gowri,
    nallaNeram: gowri.filter((g) => g.good && g.part === 'day'),
    festivals: festivalsFor(p, td, sunsetP.tithi.index, middayP.tithi.index),
    muhurthaDay,
    paksha: p.tithi.paksha,
    // Chandrashtamam: the birth star group for which the Moon today is in the 8th rasi.
    chandrashtamaRasi: (p.moonRasi.index + 5) % 12,
  };
}

const BAD_YOGA_IDX = new Set([0, 5, 8, 9, 12, 14, 16, 18, 26]);

/** All days of a Gregorian month in the Tamil calendar. */
export function tamilMonth(year, month0, lat, lon, tz) {
  const days = [];
  const count = new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
  for (let d = 1; d <= count; d++) {
    const noon = new Date(Date.UTC(year, month0, d, 12) - tz * 3600000);
    days.push(tamilDay(noon, lat, lon, tz));
  }
  return days;
}

export const starName = (i) => NAKSHATRAS[i];
