// Engine contract: every calculation setting the app uses, in one versioned object.
// Shown in "About calculations", stored next to saved charts, and checked by tests so that a silent
// change (different ayanamsa, node type, horai method or ephemeris version) is caught.
// Full prose version: docs/ENGINE-CONTRACT.md.

export const ENGINE_VERSION = '2.0.1';

export const ENGINE_SETTINGS = Object.freeze({
  engineVersion: ENGINE_VERSION,
  zodiac: 'sidereal',
  ayanamsa: Object.freeze({
    id: 'lahiri-chitrapaksha',
    version: 'lahiri-icrc-1956/iau2006-precession/v1',
    en: 'Lahiri (Chitrapaksha), Indian Calendar Reform Committee definition',
    ta: 'லஹிரி (சித்திரபக்ஷ) அயனாம்சம்',
    // Definition (same constants as Swiss Ephemeris SE_SIDM_LAHIRI):
    // mean ayanamsa 23.245522556° (= 23°15'00.658" minus 16.78" nutation) at JD 2435553.5 TT (1956-03-21 0h TT),
    // advanced by IAU 2006 general precession in longitude p_A (Capitaine et al. 2003).
    epoch: '1956-03-21T00:00:00 TT (JD 2435553.5)',
    valueAtEpochDeg: 23.245522556,
    precessionModel: 'IAU 2006 (Capitaine et al. 2003) general precession in longitude p_A',
    timeScale: 'TT (Terrestrial Time; ΔT from astronomy-engine)',
    nutation: 'true ayanamsa = mean + Δψ (IAU 2000B), because planet longitudes are apparent (true equinox of date)',
  }),
  nodeType: 'mean', // Rahu = mean lunar node (Meeus 47.7); Ketu = Rahu + 180°
  houseSystem: 'whole-sign', // house n = n-th sign from the Lagna sign
  coordinates: Object.freeze({
    centre: 'geocentric',
    positions: 'apparent (light-time + aberration), ecliptic and equinox of date (true obliquity, IAU 2000B nutation)',
    lagna: 'ascendant from GAST, true obliquity and geographic latitude (full formula)',
    speedUnit: 'sidereal degrees per day (central difference ±12 h, unwrapped across 0°/360°)',
  }),
  sunrise: Object.freeze({
    convention: 'upper limb on the horizon with standard refraction (astronomy-engine SearchRiseSet, sea level)',
    dayStartsAt: 'sunrise (Vedic day: sunrise → next sunrise; weekday before sunrise belongs to the previous day)',
  }),
  horai: Object.freeze({
    default: 'tamil-60',
    methods: ['tamil-60', 'planetary-unequal'],
  }),
  dasa: Object.freeze({
    system: 'vimshottari',
    yearDays: 365.25,
    levels: ['maha', 'bhukti', 'pratyantara'],
  }),
  ephemeris: Object.freeze({
    library: 'astronomy-engine',
    version: '2.1.19', // must equal node_modules/astronomy-engine/package.json (checked in test/engine-contract.test.js)
    documentedAccuracy: '±1 arcminute (astronomy-engine documentation; validated against NOVAS/JPL)',
    accuracyArcmin: 1,
  }),
  supportedRange: Object.freeze({ from: '1900-01-01', to: '2100-12-31', note: 'Fixture-tested range; outside it results are computed but not validated.' }),
});

/** Bilingual one-line label for UI footers ("How was this calculated?"). */
export function settingsLabel(s = ENGINE_SETTINGS) {
  return {
    en: `Sidereal · Lahiri (Chitrapaksha) · mean node · whole-sign houses · ${s.ephemeris.library} ${s.ephemeris.version} (±${s.ephemeris.accuracyArcmin}′)`,
    ta: `நிராயன · லஹிரி அயனாம்சம் · சராசரி ராகு · முழு ராசி வீடுகள் · ${s.ephemeris.library} ${s.ephemeris.version} (±${s.ephemeris.accuracyArcmin}′)`,
  };
}
