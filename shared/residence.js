// Where the person LIVES (residence) and where they are TRAVELLING — separate from every birth place.
//
//  • Birth place (per family member, in the family list) drives only the janma chart, with the historical
//    offset of its IANA zone on the birth date.
//  • Residence ("நீங்கள் இப்போது வசிக்கும் இடம்") drives every daily / "now" feature: Today, sunrise, Rahu Kalam,
//    Gowri, Horai, Prasnam, muhurtham, calendar, reminders, weather …
//  • A temporary travelling location (e.g. visiting India for two weeks) replaces the residence for those daily
//    features until its `until` date (inclusive, in the travel place's own calendar), then the app reverts.
//
// Pure functions (browser, server and tests). The UI keeps state in public/core.js.
import { zoneOffsetHours, offsetLabel, nearestPlace, placeTa, placeText } from './places.js';
import { countryForZone, countryByCode } from './countries.js';
import { isValidZone, localDateIn } from './datetime.js';

const B = (en, ta) => ({ en, ta });

/** Normalise a place pick (search result, GPS, device guess) into a stored location. */
export function locFromPlace(p, extra = {}) {
  if (!p) return null;
  const zone = isValidZone(p.zone) ? p.zone : null;
  const lat = Number(p.lat), lon = Number(p.lon);
  const cc = p.cc || countryOfLoc({ zone, lat, lon }) || null;
  return {
    lat, lon, zone: zone || undefined,
    tz: zone ? zoneOffsetHours(zone) : Number(p.tz ?? 5.5),
    name: p.text || (p.cc && !String(p.name || '').includes(',') ? placeText(p) : p.name) || '',
    cc: cc || undefined,
    ...extra,
  };
}

/** Country code of a stored location: its own `cc`, else the nearest built-in place, else its zone's country. */
export function countryOfLoc(loc) {
  if (!loc) return null;
  if (loc.cc) return String(loc.cc).toUpperCase();
  if (Number.isFinite(Number(loc.lat)) && Number.isFinite(Number(loc.lon)) && (loc.lat || loc.lon)) {
    const near = nearestPlace(Number(loc.lat), Number(loc.lon), { maxKm: 300 });
    if (near?.cc) return near.cc;
  }
  return countryForZone(loc.zone)?.cc || null;
}

/** Is a travelling location over? `until` is inclusive and read in the travel place's own calendar. */
export function travelExpired(travel, now = new Date()) {
  if (!travel) return true;
  if (!travel.until) return false;
  const today = isValidZone(travel.zone) ? localDateIn(travel.zone, now) : new Date(now.getTime() + (Number(travel.tz) || 0) * 3600000).toISOString().slice(0, 10);
  return today > travel.until;
}

/**
 * The location every daily feature uses: the travelling place while it is active, else the residence.
 * Offsets are refreshed from the IANA zone (daylight saving changes after a location was saved).
 */
export function activeLocation(residence, travel, now = new Date()) {
  const pick = travel && !travelExpired(travel, now) ? { ...travel, temp: true } : residence ? { ...residence, temp: false } : null;
  if (pick?.zone && isValidZone(pick.zone)) pick.tz = zoneOffsetHours(pick.zone, now.getTime());
  return pick;
}

// Common short names (standard, daylight) — Intl gives only "GMT+4" for many zones.
const ABBR = {
  'Asia/Kolkata': ['IST'], 'Asia/Calcutta': ['IST'], 'Asia/Dubai': ['GST'], 'Asia/Muscat': ['GST'], 'Asia/Qatar': ['AST'], 'Asia/Riyadh': ['AST'],
  'Asia/Kuwait': ['AST'], 'Asia/Bahrain': ['AST'], 'Asia/Singapore': ['SGT'], 'Asia/Kuala_Lumpur': ['MYT'], 'Asia/Colombo': ['SLST'],
  'Asia/Kathmandu': ['NPT'], 'Asia/Dhaka': ['BST'], 'Asia/Yangon': ['MMT'], 'Asia/Bangkok': ['ICT'], 'Asia/Jakarta': ['WIB'], 'Asia/Tokyo': ['JST'],
  'Asia/Hong_Kong': ['HKT'], 'Europe/London': ['GMT', 'BST'], 'Europe/Dublin': ['GMT', 'IST'], 'Europe/Paris': ['CET', 'CEST'], 'Europe/Berlin': ['CET', 'CEST'],
  'Europe/Amsterdam': ['CET', 'CEST'], 'Europe/Zurich': ['CET', 'CEST'], 'Europe/Oslo': ['CET', 'CEST'], 'Europe/Stockholm': ['CET', 'CEST'],
  'Europe/Copenhagen': ['CET', 'CEST'], 'Europe/Brussels': ['CET', 'CEST'], 'Europe/Rome': ['CET', 'CEST'],
  'America/New_York': ['EST', 'EDT'], 'America/Toronto': ['EST', 'EDT'], 'America/Chicago': ['CST', 'CDT'], 'America/Denver': ['MST', 'MDT'],
  'America/Phoenix': ['MST'], 'America/Los_Angeles': ['PST', 'PDT'], 'America/Vancouver': ['PST', 'PDT'], 'America/Edmonton': ['MST', 'MDT'],
  'Australia/Sydney': ['AEST', 'AEDT'], 'Australia/Melbourne': ['AEST', 'AEDT'], 'Australia/Brisbane': ['AEST'], 'Australia/Perth': ['AWST'],
  'Australia/Adelaide': ['ACST', 'ACDT'], 'Pacific/Auckland': ['NZST', 'NZDT'], 'Pacific/Fiji': ['FJT'], 'Indian/Mauritius': ['MUT'],
  'Africa/Johannesburg': ['SAST'], 'Africa/Nairobi': ['EAT'], 'Indian/Reunion': ['RET'],
};

/** Short zone name at an instant ('GST', 'EDT', 'IST'); '' when not known. */
export function zoneAbbr(zone, at = Date.now()) {
  const a = ABBR[zone];
  if (!a) return '';
  if (a.length === 1) return a[0];
  const jan = zoneOffsetHours(zone, Date.UTC(new Date(at).getUTCFullYear(), 0, 15));
  const jul = zoneOffsetHours(zone, Date.UTC(new Date(at).getUTCFullYear(), 6, 15));
  const std = Math.min(jan, jul);
  return zoneOffsetHours(zone, at) > std ? a[1] : a[0];
}

const cityOf = (name) => String(name || '').split(',')[0].trim();

/**
 * "Dubai time (GST, UTC+4)" / "துபாய் நேரம் (GST, UTC+4)". A location in India reads "India time (IST, UTC+5:30)".
 * Returns { en, ta }.
 */
export function zoneLabel(loc, at = Date.now()) {
  if (!loc) return B('', '');
  const off = loc.zone && isValidZone(loc.zone) ? zoneOffsetHours(loc.zone, at) : Number(loc.tz);
  const abbr = loc.zone ? zoneAbbr(loc.zone, at) : '';
  const tail = `(${[abbr, offsetLabel(off)].filter(Boolean).join(', ')})`;
  const cc = countryOfLoc(loc);
  if (cc === 'IN' || (!loc.zone && Math.abs(off - 5.5) < 0.01 && !loc.name)) return B(`India time ${tail}`, `இந்திய நேரம் ${tail}`);
  const city = cityOf(loc.name) || countryByCode(cc)?.en || '';
  const cityTa = placeTa(city) || city;
  return B(`${city} time ${tail}`, `${cityTa} நேரம் ${tail}`);
}

/** Is this location in India's time (IST)? Used to decide whether to add the small "India time" line. */
export const inIndiaTime = (loc, at = Date.now()) => {
  const off = loc?.zone && isValidZone(loc.zone) ? zoneOffsetHours(loc.zone, at) : Number(loc?.tz ?? 5.5);
  return Math.abs(off - 5.5) < 0.01;
};

/** Hours that zone `to` is ahead of zone `from` at an instant (negative when behind). */
export function zoneDiffHours(from, to, at = Date.now()) {
  const a = typeof from === 'number' ? from : zoneOffsetHours(from, at);
  const b = typeof to === 'number' ? to : zoneOffsetHours(to, at);
  if (a == null || b == null) return null;
  return Math.round((b - a) * 4) / 4;
}

const hText = (h) => { const x = Math.abs(h); return Number.isInteger(x) ? String(x) : String(Math.round(x * 100) / 100); };

/**
 * "India time is 1.5 h ahead of Dubai time" / "துபாய் நேரத்தை விட இந்திய நேரம் 1.5 மணி முன்னால்".
 * fromName / toName are { en, ta } place names. Returns { en, ta, hours }.
 */
export function zoneDiffText(fromName, toName, hours) {
  if (hours == null) return null;
  if (hours === 0) return { ...B(`${toName.en} and ${fromName.en} keep the same time`, `${fromName.ta} நேரமும் ${toName.ta} நேரமும் ஒன்றே`), hours };
  const ahead = hours > 0;
  return {
    ...B(`${toName.en} time is ${hText(hours)} h ${ahead ? 'ahead of' : 'behind'} ${fromName.en} time`,
      `${fromName.ta} நேரத்தை விட ${toName.ta} நேரம் ${hText(hours)} மணி ${ahead ? 'முன்னால்' : 'பின்னால்'}`),
    hours,
  };
}

/** Bilingual name of the place a location is in, for sentences: India → { en: 'India', ta: 'இந்திய' }. */
export function locName(loc) {
  const cc = countryOfLoc(loc);
  if (cc === 'IN') return B('India', 'இந்திய');
  const city = cityOf(loc?.name) || countryByCode(cc)?.en || '';
  return B(city, placeTa(city) || city);
}

/**
 * Should we gently ask "Are you in Dubai now?" — the phone's zone keeps a different clock from the saved residence
 * (and from an active travelling place). Zones with the same offset (Asia/Muscat vs Asia/Dubai) never ask.
 */
export function zoneMismatch(active, deviceZone, at = Date.now()) {
  if (!active || !isValidZone(deviceZone)) return false;
  const dev = zoneOffsetHours(deviceZone, at);
  const cur = active.zone && isValidZone(active.zone) ? zoneOffsetHours(active.zone, at) : Number(active.tz);
  return Number.isFinite(cur) && Math.abs(dev - cur) > 0.01;
}

/** The phone's IANA zone (Asia/Calcutta → Asia/Kolkata), or null. */
export function deviceZone() {
  let z = null;
  try { z = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { /* old runtime */ }
  return { 'Asia/Calcutta': 'Asia/Kolkata', 'Asia/Rangoon': 'Asia/Yangon', 'Asia/Katmandu': 'Asia/Kathmandu' }[z] || z || null;
}

/** 'YYYY-MM-DD' n days after today in a zone (default end date for a temporary location). */
export function isoPlusDays(zone, n, now = new Date()) {
  const base = isValidZone(zone) ? localDateIn(zone, now) : now.toISOString().slice(0, 10);
  const d = new Date(`${base}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
