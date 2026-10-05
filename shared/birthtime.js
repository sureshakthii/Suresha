// Birth-time certainty: which chart results can be trusted for a given profile.
//
// A profile stores timeCertainty: 'exact' | 'approx' | 'unknown' (missing = 'exact' for older profiles).
//   approx  → timeWindowMin: the ± minutes the person is unsure about (default 60).
//   unknown → the person does not know the time. We NEVER invent one: the stored time is a calculation
//             placeholder (local noon) that is never shown, and every time-sensitive result is withheld.
// The check recomputes the chart at both ends of the uncertainty window and reports what changes.
import { birthChart } from './astro.js';
import { kattamReliability } from './kattam.js';

export const CERTAINTY = ['exact', 'approx', 'unknown'];
export const UNKNOWN_TIME_PLACEHOLDER = '12:00:00';
const NAV_SPAN = 30 / 9;

const pad = (n) => String(n).padStart(2, '0');
/** Shift a local date+time by minutes (handles day roll-over). */
export function shiftLocal(date, time, minutes) {
  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi, s = 0] = time.split(':').map(Number);
  const t = new Date(Date.UTC(y, mo - 1, d, h, mi, s) + minutes * 60000);
  return { date: `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`, time: `${pad(t.getUTCHours())}:${pad(t.getUTCMinutes())}:${pad(t.getUTCSeconds())}` };
}

export const certaintyOf = (m) => (CERTAINTY.includes(m?.timeCertainty) ? m.timeCertainty : 'exact');

/**
 * Returns which results are reliable:
 * { certainty, windowMin, lagna, houses, navamsa, vargas, rasi, nakshatra, pada, dasa, dasaShiftDays, timeShown, notes[] }
 */
export function timeReliability(m) {
  if (m?.kattam) return kattamReliability(m);
  const certainty = certaintyOf(m);
  if (certainty === 'exact') {
    return { certainty, windowMin: 0, lagna: true, houses: true, navamsa: true, vargas: true, rasi: true, nakshatra: true, pada: true, dasa: true, dasaShiftDays: 0, timeShown: true, notes: [] };
  }
  const ends = certainty === 'unknown'
    ? [{ date: m.date, time: '00:00:00' }, { date: m.date, time: '23:59:59' }]
    : [shiftLocal(m.date, m.time, -(m.timeWindowMin || 60)), shiftLocal(m.date, m.time, m.timeWindowMin || 60)];
  const [a, b] = ends.map((e) => birthChart({ ...m, ...e }));
  const same = (f) => f(a) === f(b);
  const lagnaSpan = Math.abs(((b.lagna.longitude - a.lagna.longitude + 540) % 360) - 180);
  const lagna = certainty !== 'unknown' && same((c) => c.lagna.rasi) && lagnaSpan < 30;
  const navamsa = lagna && same((c) => Math.floor(c.lagna.longitude / NAV_SPAN));
  const rasi = same((c) => c.janmaRasi.index);
  const nakshatra = same((c) => c.janmaNakshatra.index);
  const pada = nakshatra && same((c) => c.janmaNakshatra.pada);
  // How far the dasa dates can move across the window (days).
  const dasaShiftDays = nakshatra ? Math.round(Math.abs(b.dasa.periods[0].start - a.dasa.periods[0].start) / 86400000) : null;
  const dasa = nakshatra && dasaShiftDays <= 31;
  const notes = [];
  if (!lagna) notes.push({ en: 'Lagnam, houses and house-based readings need a reliable birth time, so they are not shown.', ta: 'லக்னம், பாவங்கள், பாவ அடிப்படையிலான பலன்களுக்குத் துல்லியமான பிறந்த நேரம் தேவை; எனவே காட்டப்படவில்லை.' });
  if (lagna && !navamsa) notes.push({ en: 'The Navamsa and other divisional charts change within your time window, so they are withheld.', ta: 'உங்கள் நேர இடைவெளிக்குள் நவாம்சம், வர்க்கச் சக்கரங்கள் மாறுகின்றன; எனவே காட்டப்படவில்லை.' });
  if (!rasi) notes.push({ en: 'The Moon changes sign during this window — even the Rasi is uncertain.', ta: 'இந்த நேரத்திற்குள் சந்திரன் ராசி மாறுகிறது — ராசியும் உறுதியில்லை.' });
  else if (!nakshatra) notes.push({ en: 'The birth star changes during this window, so the star and dasa periods are uncertain.', ta: 'இந்த நேரத்திற்குள் நட்சத்திரம் மாறுகிறது; நட்சத்திரமும் தசா காலமும் உறுதியில்லை.' });
  else if (!dasa) notes.push({ en: `Dasa dates may shift by up to about ${dasaShiftDays} days; treat them as approximate.`, ta: `தசா தேதிகள் சுமார் ${dasaShiftDays} நாட்கள் வரை மாறலாம்; தோராயமாகக் கொள்ளவும்.` });
  if (rasi && nakshatra) notes.push({ en: 'Your Rasi and birth star are the same across the whole window, so calendar, star-based and family tools work normally.', ta: 'முழு நேர இடைவெளியிலும் ராசியும் நட்சத்திரமும் ஒன்றே; நாட்காட்டி, நட்சத்திர அடிப்படைக் கருவிகள், குடும்பக் கருவிகள் வழக்கம்போல் இயங்கும்.' });
  return { certainty, windowMin: certainty === 'unknown' ? 720 : m.timeWindowMin || 60, lagna, houses: lagna, navamsa, vargas: navamsa, rasi, nakshatra, pada, dasa, dasaShiftDays, timeShown: certainty !== 'unknown', notes };
}

/** Which features depend on a precise time (for the explanation screen). */
export const TIME_DEPENDENCE = [
  { en: 'Lagnam (ascendant) and the 12 houses', ta: 'லக்னம், 12 பாவங்கள்', need: 'exact', why: { en: 'The ascendant moves about one sign every 2 hours.', ta: 'லக்னம் சுமார் 2 மணி நேரத்திற்கு ஒரு ராசி நகரும்.' } },
  { en: 'Navamsa and divisional charts (D9–D60)', ta: 'நவாம்சம், வர்க்கச் சக்கரங்கள்', need: 'exact', why: { en: 'Navamsa changes about every 13 minutes; D60 every 2 minutes.', ta: 'நவாம்சம் சுமார் 13 நிமிடத்திற்கு ஒருமுறை மாறும்; D60 இரண்டு நிமிடத்திற்கு.' } },
  { en: 'Dasa-bhukti dates', ta: 'தசா-புக்தி தேதிகள்', need: 'approx', why: { en: 'Moving the birth time by 1 hour moves dasa dates by weeks to months.', ta: 'பிறந்த நேரம் 1 மணி நேரம் மாறினால் தசா தேதிகள் வாரங்கள் முதல் மாதங்கள் வரை மாறும்.' } },
  { en: 'Birth star (nakshatra) and Rasi', ta: 'நட்சத்திரம், ராசி', need: 'date', why: { en: 'Usually the same for the whole day, unless the Moon changes star that day.', ta: 'அன்று சந்திரன் நட்சத்திரம் மாறாவிட்டால் பொதுவாக நாள் முழுவதும் ஒன்றே.' } },
  { en: 'Panchangam, calendar, temples, Chandrashtamam, star birthdays', ta: 'பஞ்சாங்கம், நாட்காட்டி, கோவில்கள், சந்திராஷ்டமம், நட்சத்திரப் பிறந்தநாள்', need: 'none', why: { en: 'These use today’s sky or only your birth star.', ta: 'இவை இன்றைய வானம் அல்லது நட்சத்திரத்தை மட்டுமே பயன்படுத்தும்.' } },
];
