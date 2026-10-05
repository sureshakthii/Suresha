// Chart from a hand-written Rasi Kattam (எழுதிய ஜாதகம்). Many families have the written 12-box chart, the birth
// star (and often the dasa balance, "தசா இருப்பு") but not the exact birth time. From those we rebuild a chart:
//   • each planet goes in the sign written in the box (the computed degree is kept when it agrees with the box,
//     otherwise the middle of the sign is used);
//   • the Moon comes from the birth star + pada, refined by the dasa balance when given;
//   • the Lagnam comes from the box marked "ல" (if marked);
//   • dasa periods follow from the Moon exactly as in a full chart.
// Degree-level results (Navamsa, divisional charts, Ashtakavarga) are withheld for such charts.
import { birthChart, describeLongitude, buildCharts, vimshottari, NAKSHATRAS, RASIS, DASA_YEARS, PLANETS } from './astro.js';

const NAK_SPAN = 360 / 27, PADA_SPAN = NAK_SPAN / 4;
export const KATTAM_PLANETS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];

/** Moon longitude from star, pada and (optional) dasa balance in years remaining of the star lord's dasa. */
export function moonFromStar(star, pada = 2, balanceYears = null) {
  const start = star * NAK_SPAN;
  if (balanceYears != null && balanceYears >= 0) {
    const lord = NAKSHATRAS[star].lord;
    const total = DASA_YEARS[lord];
    const done = Math.min(0.999, Math.max(0.001, 1 - balanceYears / total));
    return start + done * NAK_SPAN;
  }
  return start + (Math.min(4, Math.max(1, pada)) - 0.5) * PADA_SPAN;
}

/**
 * m: { date, lat, lon, tz, kattam: { star, pada, lagna (0-11|null), planets: { Sun: 0-11, … }, balance: { years, months } | null } }
 */
export function chartFromKattam(m) {
  const k = m.kattam;
  const base = birthChart({ ...m, time: '12:00:00' });
  const balanceYears = k.balance && (k.balance.years != null || k.balance.months != null) ? (Number(k.balance.years) || 0) + (Number(k.balance.months) || 0) / 12 : null;
  const moonLon = moonFromStar(k.star, k.pada, balanceYears);
  const planets = {};
  for (const p of KATTAM_PLANETS) {
    if (p === 'Moon') { planets.Moon = { ...describeLongitude(moonLon), retrograde: false }; continue; }
    const written = k.planets?.[p];
    const calc = base.planets[p];
    if (written == null || calc.rasi === written) planets[p] = calc;
    else planets[p] = { ...describeLongitude(written * 30 + 15), retrograde: calc.retrograde };
  }
  // Rahu and Ketu are always opposite; keep them consistent if only one was written.
  if (k.planets?.Rahu != null && k.planets?.Ketu == null) planets.Ketu = { ...describeLongitude((planets.Rahu.longitude + 180) % 360), retrograde: true };
  if (k.planets?.Ketu != null && k.planets?.Rahu == null) planets.Rahu = { ...describeLongitude((planets.Ketu.longitude + 180) % 360), retrograde: true };
  planets.Lagna = k.lagna != null ? { ...describeLongitude(k.lagna * 30 + 15), retrograde: false } : base.planets.Lagna;
  const moon = planets.Moon;
  return {
    ...base,
    time: null,
    fromKattam: true,
    planets,
    charts: buildCharts(planets),
    lagna: planets.Lagna,
    janmaNakshatra: { index: moon.nakshatra, name: moon.nakshatraName, ta: moon.nakshatraTa, pada: moon.pada, lord: moon.nakshatraLord, endsAt: null, progress: (moon.longitude % NAK_SPAN) / NAK_SPAN },
    janmaRasi: { index: moon.rasi, name: moon.rasiName, ta: moon.rasiTa, endsAt: null },
    dasa: vimshottari(base.utc, moon.longitude),
  };
}

/** What a written-chart profile can be trusted for (same shape as timeReliability). */
export function kattamReliability(m) {
  const k = m.kattam;
  const lagna = k.lagna != null;
  const exactDasa = !!k.balance;
  return {
    certainty: 'kattam', windowMin: 0, lagna, houses: lagna, navamsa: false, vargas: false, rasi: true, nakshatra: true, pada: true,
    dasa: exactDasa, dasaShiftDays: exactDasa ? 0 : 700, timeShown: false,
    notes: [
      { en: 'Chart entered from the written Rasi Kattam: signs, star and dasa follow the written chart.', ta: 'எழுதிய ராசி கட்டத்திலிருந்து உள்ளிடப்பட்ட ஜாதகம்: ராசிகள், நட்சத்திரம், தசை எழுதியபடியே.' },
      exactDasa ? { en: 'Dasa dates use the written dasa balance.', ta: 'தசா தேதிகள் எழுதிய தசா இருப்பின்படி.' }
        : { en: 'Without the written dasa balance, dasa dates can differ by up to 1–2 years — add “தசா இருப்பு” from the jathagam for exact dates.', ta: 'தசா இருப்பு இல்லாததால் தசா தேதிகள் 1–2 ஆண்டுகள் வரை மாறலாம் — துல்லியத்திற்கு ஜாதகத்தில் உள்ள “தசா இருப்பு” சேர்க்கவும்.' },
      lagna ? { en: 'Lagnam taken from the box marked “ல”.', ta: '“ல” குறித்த கட்டத்திலிருந்து லக்னம்.' } : { en: 'No Lagnam marked — house-based readings use the Moon sign.', ta: 'லக்னம் குறிக்கப்படவில்லை — பாவப் பலன்கள் சந்திர ராசியிலிருந்து.' },
      { en: 'Navamsa and divisional charts need exact degrees, so they are not shown.', ta: 'நவாம்சம், வர்க்கச் சக்கரங்களுக்குத் துல்லிய பாகை தேவை; அதனால் காட்டப்படவில்லை.' },
    ],
  };
}

/** Check the written chart: Moon box vs star, Rahu–Ketu opposite. Returns [{en,ta}] warnings. */
export function kattamWarnings(k) {
  const out = [];
  const starRasi = Math.floor(moonFromStar(k.star, k.pada) / 30);
  if (k.planets?.Moon != null && k.planets.Moon !== starRasi) out.push({ en: `The Moon is written in ${RASIS[k.planets.Moon].en}, but ${NAKSHATRAS[k.star].en} pada ${k.pada} is in ${RASIS[starRasi].en}. Please check the star or the box.`, ta: `சந்திரன் ${RASIS[k.planets.Moon].ta}-ல் எழுதப்பட்டுள்ளது; ஆனால் ${NAKSHATRAS[k.star].ta} ${k.pada}-ம் பாதம் ${RASIS[starRasi].ta} ராசி. நட்சத்திரம் / கட்டத்தைச் சரிபாருங்கள்.` });
  if (k.planets?.Rahu != null && k.planets?.Ketu != null && (k.planets.Rahu + 6) % 12 !== k.planets.Ketu) out.push({ en: 'Rahu and Ketu should be in opposite boxes (7 apart).', ta: 'ராகு, கேது எதிரெதிர் கட்டங்களில் (7-ம் இடம்) இருக்க வேண்டும்.' });
  for (const p of ['Mercury', 'Venus']) {
    if (k.planets?.[p] != null && k.planets?.Sun != null) {
      const d = Math.min((k.planets[p] - k.planets.Sun + 12) % 12, (k.planets.Sun - k.planets[p] + 12) % 12);
      if (d > (p === 'Mercury' ? 1 : 2)) out.push({ en: `${p} is never more than ${p === 'Mercury' ? 1 : 2} sign(s) from the Sun — please check its box.`, ta: `${PLANETS[p].ta} சூரியனிலிருந்து ${p === 'Mercury' ? 1 : 2} ராசிக்கு மேல் விலகாது — அதன் கட்டத்தைச் சரிபாருங்கள்.` });
    }
  }
  return out;
}
