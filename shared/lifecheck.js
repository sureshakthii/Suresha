// Deep marriage checks beyond the 10 poruthams (முழுமையான திருமணப் பொருத்தம்):
// Papa Samyam (compared symmetrically), Dasa Sandhi, Lagna porutham and the marriage-related
// bhavas (2, 5, 7, 8, 11) of each person. Rule-based and explainable.
// No longevity, spouse-longevity (mangalyam), widowhood or remarriage inference is produced here:
// Ayul Balam was retired (brief §4, §27); the 8th house is read only as the traditional marital bond (mangalyam).
import { RASIS, PLANETS } from './astro.js';
import { grahaStrength } from './remedies.js';
import { bhavaAnalysis } from './analysis.js';

const T = (en, ta) => ({ en, ta });
const DAY = 86400000;
const houseOf = (lagnaRasi, rasi) => ((rasi - lagnaRasi + 12) % 12) + 1;
const FRIENDS = {
  Sun: ['Moon', 'Mars', 'Jupiter'], Moon: ['Sun', 'Mercury'], Mars: ['Sun', 'Moon', 'Jupiter'], Mercury: ['Sun', 'Venus'],
  Jupiter: ['Sun', 'Moon', 'Mars'], Venus: ['Mercury', 'Saturn'], Saturn: ['Mercury', 'Venus'],
};
const ENEMIES = {
  Sun: ['Venus', 'Saturn'], Moon: [], Mars: ['Mercury'], Mercury: ['Moon'], Jupiter: ['Mercury', 'Venus'], Venus: ['Sun', 'Moon'], Saturn: ['Sun', 'Moon', 'Mars'],
};
const rel = (a, b) => (a === b || FRIENDS[a].includes(b) ? 1 : ENEMIES[a].includes(b) ? -1 : 0);
const level = (s) => (s >= 62 ? 'strong' : s >= 47 ? 'medium' : 'care');
const bound = (s) => Math.max(15, Math.min(95, Math.round(s)));

/**
 * Ayul Balam — RETIRED from consumer output (brief §4, §27). It estimated long-life strength, which is a
 * mortality inference; rewording it as "take care" does not fix that. Kept as an exported stub so existing
 * callers do not crash: it carries no level, score or text. UI must stop displaying it.
 */
export const AYUL_REMOVED = Object.freeze({
  removed: true,
  level: null, score: null, text: null, reasons: Object.freeze([]),
  reason: T('Longevity estimates are not offered. For health, please consult a qualified doctor and keep regular check-ups.', 'ஆயுள் கணிப்பு வழங்கப்படுவதில்லை. ஆரோக்கியத்திற்கு தகுதியான மருத்துவரை அணுகி, வழக்கமான பரிசோதனை செய்துகொள்ளுங்கள்.'),
});
export function ayulBalam() {
  return AYUL_REMOVED;
}

/** Papa Samyam — malefic weight in houses 1, 2, 4, 7, 8, 12 counted from Lagna, Moon and Venus. */
export function papaPoints(chart, { useLagna = true } = {}) {
  const P = chart.planets;
  const W = { Mars: 1, Saturn: 1, Rahu: 1, Ketu: 1, Sun: 0.5 };
  // Lagna reference only when the birth time is known; Moon and Venus need no birth time.
  const refs = [...(P.Lagna && useLagna ? [['Lagna', P.Lagna.rasi]] : []), ['Moon', P.Moon.rasi], ['Venus', P.Venus.rasi]];
  let total = 0;
  const detail = [];
  for (const [ref, r] of refs) {
    let sub = 0;
    for (const [k, w] of Object.entries(W)) if ([1, 2, 4, 7, 8, 12].includes(houseOf(r, P[k].rasi))) sub += w;
    // Moon and Venus references carry slightly less weight than Lagna.
    const weighted = ref === 'Lagna' ? sub : sub * 0.5;
    total += weighted;
    detail.push({ ref, points: sub });
  }
  return { total: Math.round(total * 10) / 10, detail, lagnaIncluded: !!P.Lagna && useLagna };
}

/** Dasa Sandhi: Maha Dasa changes of both falling close together (or close to the wedding). */
export function dasaSandhi(a, b, weddingDate, years = 20) {
  // Report horizon: `years` after the wedding date. No age cutoff.
  const end = weddingDate.getTime() + years * 365.25 * DAY;
  const changes = (c) => c.dasa.periods.map((p) => p.start.getTime()).filter((t) => t > weddingDate.getTime() - 180 * DAY && t < end);
  const ca = changes(a), cb = changes(b);
  const clashes = [];
  for (const x of ca) for (const y of cb) if (Math.abs(x - y) < 183 * DAY) clashes.push(new Date(Math.min(x, y)));
  const nearWedding = [...ca, ...cb].filter((t) => Math.abs(t - weddingDate.getTime()) < 183 * DAY).map((t) => new Date(t));
  return { clashes, nearWedding, ok: !clashes.length && !nearWedding.length };
}

/** Lagna porutham: relation of lagna lords and distance between the two lagnas (and moons). */
const NEEDS_TIME = T('Needs the birth time (Lagna) of both people.', 'இருவரின் பிறந்த நேரமும் (லக்னம்) தேவை.');

export function lagnaPorutham(a, b) {
  if (!a.planets.Lagna || !b.planets.Lagna) return { score: null, available: false, reasons: [NEEDS_TIME] };
  const la = a.planets.Lagna.rasi, lb = b.planets.Lagna.rasi;
  const reasons = [];
  let s = 55;
  const r1 = rel(RASIS[la].lord, RASIS[lb].lord), r2 = rel(RASIS[lb].lord, RASIS[la].lord);
  s += 8 * (r1 + r2);
  reasons.push(T(`Lagna lords ${RASIS[la].lord} & ${RASIS[lb].lord}: ${r1 + r2 > 0 ? 'friendly' : r1 + r2 < 0 ? 'unfriendly' : 'neutral'}`,
    `லக்னாதிபதிகள் ${PLANETS[RASIS[la].lord].ta} & ${PLANETS[RASIS[lb].lord].ta}: ${r1 + r2 > 0 ? 'நட்பு' : r1 + r2 < 0 ? 'பகை' : 'சமம்'}`));
  const h = houseOf(la, lb);
  if ([1, 5, 7, 9].includes(h)) { s += 10; reasons.push(T('The two lagnas are in harmony (1/5/7/9)', 'இரு லக்னங்களும் இணக்கம் (1/5/7/9)')); }
  if ([6, 8].includes(h) || h === 12 || h === 2) { s -= 8; reasons.push(T(`The lagnas are ${h === 6 || h === 8 ? '6/8 (shashtashtakam)' : '2/12'} apart — patience needed`, `லக்னங்கள் ${h === 6 || h === 8 ? '6/8 (சஷ்டாஷ்டகம்)' : '2/12'} — பொறுமை தேவை`)); }
  // One's Moon in the other's 7th = natural attraction.
  if (houseOf(la, b.planets.Moon.rasi) === 7 || houseOf(lb, a.planets.Moon.rasi) === 7) { s += 8; reasons.push(T('Moon of one falls in the other\'s 7th — natural attraction', 'ஒருவரின் சந்திரன் மற்றவரின் 7-ல் — இயல்பான ஈர்ப்பு')); }
  return { score: bound(s), available: true, reasons };
}

const HOUSE_CHECKS = [
  { house: 7, en: 'Married life (7th house)', ta: 'மண வாழ்க்கை (7-ம் பாவம்)', karaka: 'Venus' },
  { house: 2, en: 'Family & speech (2nd)', ta: 'குடும்பம், வாக்கு (2-ம்)', karaka: 'Jupiter' },
  { house: 5, en: 'Family wishes (5th house, traditional)', ta: 'குடும்ப விருப்பங்கள் (5-ம் பாவம், மரபு)', karaka: 'Jupiter' },
  { house: 8, en: '8th house (traditional long-term bond factor)', ta: '8-ம் பாவம் (மரபு நீண்டகாலப் பிணைப்புக் காரணி)', karaka: 'Saturn' },
  { house: 11, en: 'Income & gains (11th)', ta: 'வருமானம், லாபம் (11-ம்)', karaka: 'Jupiter' },
];

/** Bhava checks for one person: the houses that decide a happy marriage. */
export function marriageHouses(chart) {
  if (!chart.planets.Lagna) return HOUSE_CHECKS.map((c) => ({ house: c.house, name: T(c.en, c.ta), score: null, level: 'unavailable', available: false, notes: [NEEDS_TIME] }));
  const bh = bhavaAnalysis(chart);
  const st = Object.fromEntries(grahaStrength(chart.planets).map((g) => [g.planet, g.score]));
  return HOUSE_CHECKS.map((c) => {
    const b = bh[c.house - 1];
    const score = bound(b.score * 0.75 + st[c.karaka] * 0.25);
    const notes = [...b.notes];
    if (b.occupants.length) notes.push(T(`Planets here: ${b.occupants.join(', ')}`, `இங்கு உள்ள கிரகங்கள்: ${b.occupants.map((k) => PLANETS[k].ta).join(', ')}`));
    notes.push(T(`Karaka ${c.karaka}: traditional strength index ${st[c.karaka]}`, `காரகன் ${PLANETS[c.karaka].ta}: பாரம்பரிய பலக் குறியீடு ${st[c.karaka]}`));
    return { house: c.house, name: T(c.en, c.ta), score, level: level(score), available: true, notes };
  });
}

/** Papa samyam tolerance (points). Proposed; the classical "groom ≥ bride" rule is gendered and is not used. */
export const PAPA_TOLERANCE = 1;

/** Checks that were retired, with the reason — for the UI and the evidence bundle. */
export const RETIRED_CHECKS = [
  { id: 'ayul', reason: T('Longevity estimates are not offered.', 'ஆயுள் கணிப்பு வழங்கப்படுவதில்லை.') },
];

/**
 * All deep checks for a couple. Symmetric in the two charts except for the side labels.
 * Longevity (ayul) is deliberately NOT part of matching: Thunai never assesses lifespan.
 */
export function deepMarriageChecks(bride, groom, weddingDate = new Date()) {
  // Like-with-like: if either birth time is unknown, both sides are counted without the Lagna reference.
  const useLagna = !!bride.planets.Lagna && !!groom.planets.Lagna;
  const papa = { bride: papaPoints(bride, { useLagna }), groom: papaPoints(groom, { useLagna }) };
  const papaDiff = Math.round(Math.abs(papa.groom.total - papa.bride.total) * 10) / 10;
  const papaOk = papaDiff <= PAPA_TOLERANCE;
  const sandhi = dasaSandhi(bride, groom, weddingDate);
  const lagna = lagnaPorutham(bride, groom);
  const houses = { bride: marriageHouses(bride), groom: marriageHouses(groom) };
  const housesOk = houses.bride[0].available && houses.groom[0].available;
  const checks = [
    {
      id: 'papa', name: T('Papa Samyam (balance of malefics)', 'பாப சாம்யம்'),
      ok: papaOk,
      note: papaOk
        ? T(`Balanced — ${papa.bride.total} and ${papa.groom.total} points (compared the same way for both).`, `சமநிலை — ${papa.bride.total}, ${papa.groom.total} புள்ளிகள் (இருவருக்கும் ஒரே முறையில் ஒப்பீடு).`)
        : T(`Malefic weights differ by ${papaDiff} points (${papa.bride.total} and ${papa.groom.total}) — a gentle Navagraha prayer together keeps the balance.`, `பாப அளவுகள் ${papaDiff} புள்ளி வேறுபடுகின்றன (${papa.bride.total}, ${papa.groom.total}) — சேர்ந்து செய்யும் நவகிரக வழிபாடு சமநிலையைத் தரும்.`),
    },
    {
      id: 'sandhi', name: T('Dasa Sandhi (both dasas changing together)', 'தசா சந்தி'),
      ok: sandhi.ok,
      note: sandhi.ok
        ? T('No Maha Dasa clash near the wedding or between the two.', 'திருமண நேரத்திலோ இருவருக்கும் இடையிலோ தசா சந்தி இல்லை.')
        : T(`Dasa change close together in ${[...sandhi.nearWedding, ...sandhi.clashes].map((d) => d.getUTCFullYear()).filter((y, i, a) => a.indexOf(y) === i).join(', ')} — plan big decisions calmly in those years and pray together.`,
          `${[...sandhi.nearWedding, ...sandhi.clashes].map((d) => d.getUTCFullYear()).filter((y, i, a) => a.indexOf(y) === i).join(', ')} ஆண்டுகளில் தசை மாற்றம் அருகருகே — அப்போது பெரிய முடிவுகளை நிதானமாக எடுங்கள், சேர்ந்து வழிபடுங்கள்.`),
    },
    ...(!lagna.available ? [] : [{
      id: 'lagna', name: T('Lagna Porutham', 'லக்னப் பொருத்தம்'),
      ok: lagna.score >= 50,
      note: T(`${lagna.score}/100 — ${lagna.reasons.map((r) => r.en).join('; ')}`, `${lagna.score}/100 — ${lagna.reasons.map((r) => r.ta).join('; ')}`),
    }]),
    ...(!housesOk ? [] : HOUSE_CHECKS.map((c, i) => {
      const b = houses.bride[i], g = houses.groom[i];
      return {
        id: `h${c.house}`, name: T(c.en, c.ta), ok: b.level !== 'care' && g.level !== 'care',
        note: T(`Bride ${b.score}, groom ${g.score}`, `மணமகள் ${b.score}, மணமகன் ${g.score}`),
      };
    })),
  ];
  const passed = checks.filter((c) => c.ok).length;
  // Weighted average over the components that could be computed (Lagna/house parts need birth times).
  const parts = [
    [papaOk ? 80 : 55, 0.2],
    [sandhi.ok ? 80 : 55, 0.15],
    ...(lagna.available ? [[lagna.score, 0.2]] : []),
    ...(housesOk ? [[HOUSE_CHECKS.reduce((s, _, i) => s + (houses.bride[i].score + houses.groom[i].score) / 2, 0) / HOUSE_CHECKS.length, 0.45]] : []),
  ];
  const score = Math.round(parts.reduce((s, [v, w]) => s + v * w, 0) / parts.reduce((s, [, w]) => s + w, 0));
  const needsBirthTime = [...(!lagna.available ? ['lagna'] : []), ...(!housesOk ? HOUSE_CHECKS.map((c) => `h${c.house}`) : [])];
  return { papa, papaOk, papaDiff, sandhi, lagna, houses, checks, passed, score, retired: RETIRED_CHECKS, needsBirthTime };
}
