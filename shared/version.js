// Versions of the calculation engine and the interpretation rules.
// Bump CALC when any astronomical/panchangam convention changes (see docs/CALCULATIONS.md),
// RULES when interpretation text or scoring rules change. Both appear in "Why this result?" and reports.
export const CALC_VERSION = '2.0.0';
export const RULES_VERSION = '1.0.0';
export const ENGINE_VERSION = `calc ${CALC_VERSION} · rules ${RULES_VERSION}`;
export const CONVENTIONS = {
  ephemeris: 'astronomy-engine 2.1.19 (VSOP87/ELP based), geocentric apparent positions',
  ayanamsa: 'Lahiri (Chitrapaksha)',
  nodes: 'Mean lunar node (Rahu); Ketu = Rahu + 180°',
  houses: 'Whole-sign houses from the sidereal Lagna (South Indian rasi chart)',
  lagna: 'Ascendant from local sidereal time and true obliquity at the birth place coordinates',
  sunrise: 'Upper limb of the Sun at the apparent horizon with standard refraction, at the chosen place',
  vedicDay: 'Panchangam day runs sunrise to next sunrise; tithi/nakshatra end times are instants',
  timezone: 'IANA time zone of the birth place (filled automatically from the built-in world list or the online place search) with the offset in force on the birth date — daylight saving and historical changes included (e.g. India +6:30 in 1942–45, Sri Lanka +6:30/+6:00 in 1996–2006, Singapore +7:30 before 1982). Profiles saved earlier with only a fixed UTC offset keep that offset unless their place is found in the world list',
  dasa: 'Vimshottari, 120-year cycle, balance from the Moon’s position in its nakshatra; year = 365.25 days',
  horai: 'Tamil practice: equal 60-minute horai from sunrise, first ruled by the weekday lord',
  rahuKalam: 'Day length (sunrise→sunset) divided into 8 equal parts, weekday sequence',
};
