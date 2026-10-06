// Countries for phone numbers, place names, time zones and currency (pure; browser, server and tests).
// Data: shared/country-data.js (generated from libphonenumber metadata + CLDR Tamil names; see scripts/build-world-data.mjs).
import { COUNTRY_ROWS } from './country-data.js';

const flagOf = (cc) => String.fromCodePoint(...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));

/** [{ cc, en, ta, dial, flag, min, max, np, zones, cur }] — every calling region (ITU / ISO 3166), sorted by English name. */
export const COUNTRIES = COUNTRY_ROWS.split('\n').map((r) => {
  const [cc, en, ta, dial, min, max, np, zones, cur] = r.split('|');
  return { cc, en, ta, dial, flag: flagOf(cc), min: Number(min), max: Number(max), np, zones: zones ? zones.split(' ') : [], cur };
});
const BY_CC = new Map(COUNTRIES.map((c) => [c.cc, c]));
export const countryByCode = (cc) => BY_CC.get(String(cc || '').toUpperCase()) || null;

// Zones shared by several countries: the country most users of that zone live in.
const ZONE_HOME = {
  'Asia/Dubai': 'AE', 'Asia/Riyadh': 'SA', 'Asia/Qatar': 'QA', 'Europe/London': 'GB', 'Asia/Singapore': 'SG', 'Asia/Kuala_Lumpur': 'MY',
  'America/Toronto': 'CA', 'America/New_York': 'US', 'America/Chicago': 'US', 'America/Denver': 'US', 'America/Los_Angeles': 'US',
  'America/Phoenix': 'US', 'America/Edmonton': 'CA', 'America/Vancouver': 'CA', 'Europe/Paris': 'FR', 'Europe/Berlin': 'DE', 'Europe/Zurich': 'CH',
  'Europe/Amsterdam': 'NL', 'Europe/Oslo': 'NO', 'Europe/Stockholm': 'SE', 'Europe/Copenhagen': 'DK', 'Europe/Brussels': 'BE', 'Europe/Rome': 'IT',
  'Asia/Bangkok': 'TH', 'Africa/Johannesburg': 'ZA', 'Indian/Mauritius': 'MU', 'Indian/Reunion': 'RE', 'Pacific/Auckland': 'NZ',
  'America/Port_of_Spain': 'TT', 'Asia/Yangon': 'MM', 'Asia/Kolkata': 'IN', 'Asia/Calcutta': 'IN', 'Asia/Colombo': 'LK', 'Asia/Rangoon': 'MM',
  'Asia/Muscat': 'OM', 'Asia/Kuwait': 'KW', 'Asia/Bahrain': 'BH', 'Australia/Sydney': 'AU', 'Australia/Melbourne': 'AU', 'Australia/Perth': 'AU',
  'Australia/Brisbane': 'AU', 'Australia/Adelaide': 'AU', 'Pacific/Fiji': 'FJ', 'Africa/Nairobi': 'KE', 'Asia/Jakarta': 'ID', 'Asia/Manila': 'PH',
};

/** Country for an IANA zone (e.g. 'Asia/Colombo' → LK), or null. */
export function countryForZone(zone) {
  if (!zone) return null;
  if (ZONE_HOME[zone]) return countryByCode(ZONE_HOME[zone]);
  return COUNTRIES.find((c) => c.zones[0] === zone) || COUNTRIES.find((c) => c.zones.includes(zone)) || null;
}

/**
 * Best guess of the user's country from the device: locale region (e.g. 'ta-LK', 'en-GB') when it agrees with the
 * time zone, else the time zone's country, else the locale region, else India.
 */
export function guessCountry({ zone, lang } = {}) {
  let z = zone, l = lang;
  try { z ??= Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { /* old runtime */ }
  try { l ??= (typeof navigator !== 'undefined' && (navigator.languages?.[0] || navigator.language)) || ''; } catch { l = ''; }
  const region = /[-_]([A-Za-z]{2})\b/.exec(String(l || ''))?.[1]?.toUpperCase();
  const byZone = countryForZone(z);
  const byLang = region ? countryByCode(region) : null;
  if (byLang && z && byLang.zones.includes(z)) return byLang;
  return byZone || byLang || countryByCode('IN');
}

const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Country search by English or Tamil name, ISO code or dialling code ('+94', '94', 'lanka', 'இலங்கை'). */
export function searchCountries(q, list = COUNTRIES) {
  const s = fold(q).trim();
  if (!s) return list;
  const digits = s.replace(/^\+/, '');
  const scored = [];
  for (const c of list) {
    const en = fold(c.en), ta = c.ta;
    let score = 0;
    if (/^\d+$/.test(digits)) score = c.dial === digits ? 3 : c.dial.startsWith(digits) ? 2 : 0;
    else if (c.cc.toLowerCase() === s) score = 3;
    else if (en.startsWith(s) || ta.startsWith(q.trim())) score = 3;
    else if (en.split(/[\s(),-]+/).some((w) => w.startsWith(s)) || ta.includes(q.trim())) score = 2;
    else if (en.includes(s)) score = 1;
    if (score) scored.push([score, c]);
  }
  return scored.sort((a, b) => b[0] - a[0]).map((x) => x[1]);
}

/**
 * National number typed for a country → E.164. Lenient: spaces, dashes and a leading trunk prefix (0) are removed;
 * a number typed with '+' or '00' and a country code is taken as international.
 * Returns { ok, e164, country, error } — error is 'length' or 'empty'.
 */
export function toE164(cc, input) {
  let country = countryByCode(cc) || countryByCode('IN');
  let raw = String(input || '').trim();
  if (!raw) return { ok: false, error: 'empty', country };
  if (/^(\+|00)/.test(raw)) {
    const digits = raw.replace(/^00/, '+').replace(/[^\d]/g, '');
    const found = parseE164(`+${digits}`);
    if (found) return checkLength(found.country, found.national);
    return { ok: false, error: 'length', country };
  }
  let national = raw.replace(/\D/g, '');
  if (country.np && national.startsWith(country.np) && national.length > country.min) national = national.slice(country.np.length);
  // People often paste their number with the country code but without '+' (e.g. 9477… for Sri Lanka).
  if (national.startsWith(country.dial) && national.length - country.dial.length >= country.min && national.length > country.max) national = national.slice(country.dial.length);
  return checkLength(country, national);
}

function checkLength(country, national) {
  const total = country.dial.length + national.length;
  const ok = national.length >= country.min && national.length <= country.max && total >= 8 && total <= 15;
  return ok ? { ok: true, e164: `+${country.dial}${national}`, country, national } : { ok: false, error: 'length', country, national };
}

// Shared calling codes (+1, +7, +44 …): the main country unless the user's choice says otherwise.
const DIAL_HOME = { 1: 'US', 7: 'RU', 44: 'GB', 47: 'NO', 39: 'IT', 61: 'AU', 262: 'RE', 590: 'GP', 599: 'CW', 212: 'MA', 290: 'SH', 358: 'FI' };

/** '+94771234567' → { country: LK, national: '771234567' } (longest matching calling code), or null. */
export function parseE164(e164, preferCc) {
  const s = String(e164 || '').replace(/[^\d+]/g, '');
  if (!/^\+[1-9]\d{4,14}$/.test(s)) return null;
  const digits = s.slice(1);
  for (let n = 3; n >= 1; n--) {
    const dial = digits.slice(0, n);
    const matches = COUNTRIES.filter((c) => c.dial === dial);
    if (!matches.length) continue;
    const country = matches.find((c) => c.cc === preferCc) || countryByCode(DIAL_HOME[dial]) || matches[0];
    return { country, national: digits.slice(n) };
  }
  return null;
}

/** Display a stored E.164 number with a space after the country code: '+94 771234567'. */
export function formatPhone(e164) {
  const p = parseE164(e164);
  return p ? `+${p.country.dial} ${p.national}` : String(e164 || '');
}
