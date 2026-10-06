// Shared, pure helpers for the rule registry: sign/house arithmetic, the Vedic aspect table,
// conjunction / mutual aspect / exchange definitions, dignity and combustion.
// Every relation used by a rule is defined here exactly once so the astrologer reviews one table.
import { RASIS, PLANETS } from '../astro.js';

export const T = (en, ta) => ({ en, ta });

export const SEVEN = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
export const GRAHAS = [...SEVEN, 'Rahu', 'Ketu'];
/** The five "tara" grahas (no luminaries, no nodes) — used by the Chandra and Surya yogas. */
export const TARA = ['Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
/** Natural benefics used by the yoga predicates (Moon handled separately where a rule needs it). */
export const NATURAL_BENEFICS = ['Mercury', 'Jupiter', 'Venus'];
export const NATURAL_MALEFICS = ['Sun', 'Mars', 'Saturn', 'Rahu', 'Ketu'];

export const KENDRA = [1, 4, 7, 10];
export const TRIKONA = [1, 5, 9];
export const DUSTHANA = [6, 8, 12];
export const UPACHAYA = [3, 6, 10, 11];

/** Own signs (rasi index 0 = Mesha). */
export const OWN = { Sun: [4], Moon: [3], Mars: [0, 7], Mercury: [2, 5], Jupiter: [8, 11], Venus: [1, 6], Saturn: [9, 10] };
/** Exaltation signs. */
export const EXALT = { Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6 };
/** Debilitation signs (7th from exaltation). */
export const DEBIL = Object.fromEntries(Object.entries(EXALT).map(([k, r]) => [k, (r + 6) % 12]));
/** Natural friendships (naisargika maitri) — used only where a rule explicitly says "friend's sign". */
export const NATURAL_FRIENDS = {
  Sun: ['Moon', 'Mars', 'Jupiter'], Moon: ['Sun', 'Mercury'], Mars: ['Sun', 'Moon', 'Jupiter'], Mercury: ['Sun', 'Venus'],
  Jupiter: ['Sun', 'Moon', 'Mars'], Venus: ['Mercury', 'Saturn'], Saturn: ['Mercury', 'Venus'],
};

/**
 * Vedic graha drishti, counted inclusively in signs from the aspecting planet.
 * Every planet aspects the 7th; Mars also 4th & 8th, Jupiter 5th & 9th, Saturn 3rd & 10th.
 * Rahu/Ketu 5/7/9 follows the table already used by shared/analysis.js (a convention the
 * astrologer must confirm; profiles may switch node aspects off with `nodeAspects: false`).
 */
export const ASPECTS = { Mars: [4, 7, 8], Jupiter: [5, 7, 9], Saturn: [3, 7, 10], Rahu: [5, 7, 9], Ketu: [5, 7, 9] };

/** Modality of a sign: 0 movable (chara), 1 fixed (sthira), 2 dual (ubhaya). */
export const modality = (rasi) => ['movable', 'fixed', 'dual'][rasi % 3];

export const houseFrom = (fromRasi, rasi) => ((rasi - fromRasi + 12) % 12) + 1;
export const rasiOfHouse = (refRasi, h) => (refRasi + h - 1) % 12;
export const lordOfRasi = (r) => RASIS[r].lord;
export const lordOfHouse = (refRasi, h) => RASIS[rasiOfHouse(refRasi, h)].lord;
export const housesRuledBy = (refRasi, planet) => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter((h) => lordOfHouse(refRasi, h) === planet);
export const taName = (k) => PLANETS[k]?.ta || k;
export const rasiName = (r) => T(RASIS[r].en, RASIS[r].ta);
export const ord = (n) => `${n}${n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th'}`;

/** Shortest angular distance between two longitudes, 0..180. */
export const separation = (a, b) => Math.abs(((a - b + 540) % 360) - 180);

/** Longitude of a planet; falls back to the middle of its sign when a fixture gives only a rasi. */
export const lon = (p) => (typeof p.longitude === 'number' ? p.longitude : p.rasi * 30 + 15);

export function dignityOf(k, rasi) {
  if (!(k in EXALT)) return null;
  if (EXALT[k] === rasi) return 'exalted';
  if (DEBIL[k] === rasi) return 'debilitated';
  if (OWN[k].includes(rasi)) return 'own';
  if (NATURAL_FRIENDS[k].includes(lordOfRasi(rasi))) return 'friend';
  return null;
}

/**
 * Build the evaluation context for one chart under one profile. Pure: reads chart.planets
 * (and chart.dasa for periods) only. A chart without a Lagna (unknown birth time) is supported:
 * Lagna-referenced rules then report `unavailable` instead of guessing.
 */
export function makeContext(chart, profile) {
  const P = chart.planets;
  const hasLagna = !!P.Lagna && typeof P.Lagna.rasi === 'number';
  const L = hasLagna ? P.Lagna.rasi : null;
  // Records which reference points a rule actually read, so evaluations can flag unstable inputs.
  const used = new Set();
  const refRasi = (reference) => (used.add(reference), reference === 'lagna' ? L : reference === 'moon' ? P.Moon.rasi : reference === 'sun' ? P.Sun.rasi : null);
  const aspectTable = (k) => (profile.nodeAspects === false && (k === 'Rahu' || k === 'Ketu') ? [7] : ASPECTS[k] || [7]);
  const ctx = {
    chart, P, profile, hasLagna, L, M: P.Moon.rasi, S: P.Sun.rasi, used,
    refRasi,
    /** House of planet k counted from the reference (lagna | moon | sun). null if the reference is unknown. */
    houseOf: (k, reference = 'lagna') => { const r = refRasi(reference); return r == null ? null : houseFrom(r, P[k].rasi); },
    lord: (h, reference = 'lagna') => { const r = refRasi(reference); return r == null ? null : lordOfHouse(r, h); },
    occupants: (h, reference = 'lagna', pool = GRAHAS) => { const r = refRasi(reference); return r == null ? [] : pool.filter((k) => P[k].rasi === rasiOfHouse(r, h)); },
    /** Conjunction = same sidereal sign (rasi). */
    conj: (a, b) => a !== b && P[a].rasi === P[b].rasi,
    /** a casts a full aspect on the sign occupied by b (or on rasi `b` when a number). */
    aspects: (a, b) => { const target = typeof b === 'number' ? b : P[b].rasi; return aspectTable(a).includes(houseFrom(P[a].rasi, target)); },
    mutualAspect: (a, b) => a !== b && ctx.aspects(a, b) && ctx.aspects(b, a),
    /** Parivartana: each planet sits in a sign owned by the other. */
    exchange: (a, b) => a !== b && a in OWN && b in OWN && OWN[b].includes(P[a].rasi) && OWN[a].includes(P[b].rasi),
    dignity: (k) => dignityOf(k, P[k].rasi),
    sep: (a, b) => separation(lon(P[a]), lon(P[b])),
    combust: (k) => {
      const c = profile.combustion || {};
      if (k === 'Sun' || !(k in c)) return { combust: false, sep: null, threshold: null };
      const threshold = P[k].retrograde && c[`${k}Retro`] ? c[`${k}Retro`] : c[k];
      const s = ctx.sep(k, 'Sun');
      return { combust: s < threshold, sep: s, threshold };
    },
    /** Moon's elongation from the Sun (0..360) and whether it is waxing (Shukla paksha). */
    moonPhase: () => { const e = (lon(P.Moon) - lon(P.Sun) + 360) % 360; return { elongation: e, waxing: e < 180 }; },
  };
  return ctx;
}

/** Common, reusable condition modifiers for one planet (dignity, combustion, dusthana). */
export function planetModifiers(ctx, k, { dusthana = true, combust = true } = {}) {
  const out = [];
  const d = ctx.dignity(k);
  if (d === 'exalted') out.push({ factor: `${k}_exalted`, effect: 'supports', text: T(`${k} is exalted`, `${taName(k)} உச்சம்`) });
  if (d === 'own') out.push({ factor: `${k}_own_sign`, effect: 'supports', text: T(`${k} is in its own sign`, `${taName(k)} ஆட்சி`) });
  if (d === 'debilitated') out.push({ factor: `${k}_debilitated`, effect: 'weakens', text: T(`${k} is debilitated`, `${taName(k)} நீசம்`) });
  if (combust) {
    const c = ctx.combust(k);
    if (c.combust) out.push({ factor: `${k}_combust`, effect: 'weakens', text: T(`${k} is combust — ${c.sep.toFixed(1)}° from the Sun (threshold ${c.threshold}°)`, `${taName(k)} அஸ்தங்கம் — சூரியனிடமிருந்து ${c.sep.toFixed(1)}° (வரம்பு ${c.threshold}°)`) });
  }
  if (dusthana && ctx.hasLagna) {
    const h = ctx.houseOf(k, 'lagna');
    if (DUSTHANA.includes(h)) out.push({ factor: `${k}_dusthana`, effect: 'weakens', text: T(`${k} is in the ${ord(h)} house from Lagna`, `${taName(k)} லக்னத்திலிருந்து ${h}-ம் வீட்டில்`) });
  }
  if (ctx.P[k]?.retrograde && !['Sun', 'Moon', 'Rahu', 'Ketu'].includes(k)) out.push({ factor: `${k}_retrograde`, effect: 'note', text: T(`${k} is retrograde`, `${taName(k)} வக்கிரம்`) });
  return out;
}

export const fact = (en, ta, data) => (data ? { en, ta, data } : { en, ta });
