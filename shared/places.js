// Worldwide gazetteer so charts work offline and instantly for places anywhere in the world.
// Every place carries its IANA time zone (e.g. Asia/Colombo, America/Toronto), so birth charts use the offset
// that was in force on the birth date (daylight saving, Sri Lanka's +6:30 years, Singapore's +7:30 …) through
// shared/datetime.js — never a guess from the longitude.
// Data: shared/world-places.js (GeoNames, CC BY 4.0, trimmed; see scripts/build-world-data.mjs) + the hand list below.
import { ROWS, ZONES, REGIONS } from './world-places.js';
import { COUNTRIES, countryByCode } from './countries.js';
import { zoneOffsetMinutes, isValidZone } from './datetime.js';

// Hand-entered towns (temple towns and the original list); added when the world list lacks them, else used as aliases.
// [name, region, country, lat, lon]
const LEGACY = [
  ['Chennai', 'Tamil Nadu', 'IN', 13.0827, 80.2707],
  ['Madurai', 'Tamil Nadu', 'IN', 9.9252, 78.1198],
  ['Coimbatore', 'Tamil Nadu', 'IN', 11.0168, 76.9558],
  ['Tiruchirappalli', 'Tamil Nadu', 'IN', 10.7905, 78.7047],
  ['Salem', 'Tamil Nadu', 'IN', 11.6643, 78.146],
  ['Tirunelveli', 'Tamil Nadu', 'IN', 8.7139, 77.7567],
  ['Thanjavur', 'Tamil Nadu', 'IN', 10.787, 79.1378],
  ['Kumbakonam', 'Tamil Nadu', 'IN', 10.9602, 79.3845],
  ['Erode', 'Tamil Nadu', 'IN', 11.341, 77.7172],
  ['Vellore', 'Tamil Nadu', 'IN', 12.9165, 79.1325],
  ['Tiruppur', 'Tamil Nadu', 'IN', 11.1085, 77.3411],
  ['Thoothukudi', 'Tamil Nadu', 'IN', 8.7642, 78.1348],
  ['Nagercoil', 'Tamil Nadu', 'IN', 8.1833, 77.4119],
  ['Kanchipuram', 'Tamil Nadu', 'IN', 12.8342, 79.7036],
  ['Dindigul', 'Tamil Nadu', 'IN', 10.3624, 77.9695],
  ['Karaikudi', 'Tamil Nadu', 'IN', 10.0735, 78.7732],
  ['Pudukkottai', 'Tamil Nadu', 'IN', 10.3797, 78.8205],
  ['Nagapattinam', 'Tamil Nadu', 'IN', 10.7672, 79.8449],
  ['Cuddalore', 'Tamil Nadu', 'IN', 11.748, 79.7714],
  ['Villupuram', 'Tamil Nadu', 'IN', 11.9401, 79.4861],
  ['Tiruvannamalai', 'Tamil Nadu', 'IN', 12.2253, 79.0747],
  ['Rameswaram', 'Tamil Nadu', 'IN', 9.2876, 79.3129],
  ['Ooty', 'Tamil Nadu', 'IN', 11.4102, 76.695],
  ['Hosur', 'Tamil Nadu', 'IN', 12.7409, 77.8253],
  ['Karur', 'Tamil Nadu', 'IN', 10.9601, 78.0766],
  ['Namakkal', 'Tamil Nadu', 'IN', 11.2189, 78.1674],
  ['Sivakasi', 'Tamil Nadu', 'IN', 9.4533, 77.8024],
  ['Puducherry', 'Puducherry', 'IN', 11.9416, 79.8083],
  ['Bengaluru', 'Karnataka', 'IN', 12.9716, 77.5946],
  ['Mysuru', 'Karnataka', 'IN', 12.2958, 76.6394],
  ['Mangaluru', 'Karnataka', 'IN', 12.9141, 74.856],
  ['Hubballi', 'Karnataka', 'IN', 15.3647, 75.124],
  ['Hyderabad', 'Telangana', 'IN', 17.385, 78.4867],
  ['Vijayawada', 'Andhra Pradesh', 'IN', 16.5062, 80.648],
  ['Visakhapatnam', 'Andhra Pradesh', 'IN', 17.6868, 83.2185],
  ['Tirupati', 'Andhra Pradesh', 'IN', 13.6288, 79.4192],
  ['Nellore', 'Andhra Pradesh', 'IN', 14.4426, 79.9865],
  ['Thiruvananthapuram', 'Kerala', 'IN', 8.5241, 76.9366],
  ['Kochi', 'Kerala', 'IN', 9.9312, 76.2673],
  ['Kozhikode', 'Kerala', 'IN', 11.2588, 75.7804],
  ['Thrissur', 'Kerala', 'IN', 10.5276, 76.2144],
  ['Palakkad', 'Kerala', 'IN', 10.7867, 76.6548],
  ['Mumbai', 'Maharashtra', 'IN', 19.076, 72.8777],
  ['Pune', 'Maharashtra', 'IN', 18.5204, 73.8567],
  ['Delhi', 'Delhi', 'IN', 28.6139, 77.209],
  ['Kolkata', 'West Bengal', 'IN', 22.5726, 88.3639],
  ['Ahmedabad', 'Gujarat', 'IN', 23.0225, 72.5714],
  ['Jaipur', 'Rajasthan', 'IN', 26.9124, 75.7873],
  ['Lucknow', 'Uttar Pradesh', 'IN', 26.8467, 80.9462],
  ['Varanasi', 'Uttar Pradesh', 'IN', 25.3176, 82.9739],
  ['Bhubaneswar', 'Odisha', 'IN', 20.2961, 85.8245],
  ['Patna', 'Bihar', 'IN', 25.5941, 85.1376],
  ['Goa (Panaji)', 'Goa', 'IN', 15.4909, 73.8278],
  ['Colombo', '', 'LK', 6.9271, 79.8612],
  ['Jaffna', '', 'LK', 9.6615, 80.0255],
  ['Singapore', '', 'SG', 1.3521, 103.8198],
  ['Kuala Lumpur', '', 'MY', 3.139, 101.6869],
  ['Dubai', '', 'AE', 25.2048, 55.2708],
  ['Abu Dhabi', '', 'AE', 24.4539, 54.3773],
  ['Doha', '', 'QA', 25.2854, 51.531],
  ['Muscat', '', 'OM', 23.588, 58.3829],
  ['Riyadh', '', 'SA', 24.7136, 46.6753],
  ['London', '', 'GB', 51.5074, -0.1278],
  ['New York', '', 'US', 40.7128, -74.006],
  ['San Francisco', '', 'US', 37.7749, -122.4194],
  ['Dallas', '', 'US', 32.7767, -96.797],
  ['Toronto', '', 'CA', 43.6532, -79.3832],
  ['Sydney', '', 'AU', -33.8688, 151.2093],
  ['Melbourne', '', 'AU', -37.8136, 144.9631],
  ['Paris', '', 'FR', 48.8566, 2.3522],
  ['Berlin', '', 'DE', 52.52, 13.405],
  ['Srirangam', 'Tamil Nadu', 'IN', 10.8624, 78.6898], ['Chidambaram', 'Tamil Nadu', 'IN', 11.3993, 79.6936],
  ['Palani', 'Tamil Nadu', 'IN', 10.4500, 77.5200], ['Tiruchendur', 'Tamil Nadu', 'IN', 8.4946, 78.1219],
  ['Swamimalai', 'Tamil Nadu', 'IN', 10.9575, 79.3259], ['Thiruthani', 'Tamil Nadu', 'IN', 13.1757, 79.6155],
  ['Mayiladuthurai', 'Tamil Nadu', 'IN', 11.1018, 79.6521], ['Sirkazhi', 'Tamil Nadu', 'IN', 11.2390, 79.7363],
  ['Thiruvarur', 'Tamil Nadu', 'IN', 10.7726, 79.6368], ['Kanyakumari', 'Tamil Nadu', 'IN', 8.0883, 77.5385],
  ['Srivilliputhur', 'Tamil Nadu', 'IN', 9.5121, 77.6336], ['Theni', 'Tamil Nadu', 'IN', 10.0104, 77.4777],
  ['Tiruvallur', 'Tamil Nadu', 'IN', 13.1231, 79.9120], ['Karaikal', 'Puducherry', 'IN', 10.9254, 79.8380],
  ['Tirumala', 'Andhra Pradesh', 'IN', 13.6833, 79.3474], ['Guruvayur', 'Kerala', 'IN', 10.5946, 76.0369],
];

// Other spellings people type (old names, short forms).
const ALIASES = {
  madras: 'Chennai', bombay: 'Mumbai', calcutta: 'Kolkata', bangalore: 'Bengaluru', mysore: 'Mysuru', mangalore: 'Mangaluru',
  trichy: 'Tiruchirappalli', tiruchi: 'Tiruchirappalli', tuticorin: 'Thoothukudi', pondicherry: 'Puducherry', pondy: 'Puducherry',
  kovai: 'Coimbatore', trivandrum: 'Thiruvananthapuram', cochin: 'Kochi', calicut: 'Kozhikode', tanjore: 'Thanjavur',
  'new york': 'New York City', nyc: 'New York City', penang: 'George Town', kl: 'Kuala Lumpur', melaka: 'Malacca',
  rangoon: 'Yangon', saigon: 'Ho Chi Minh City', peking: 'Beijing', jaffna: 'Jaffna', yarlpanam: 'Jaffna',
  'mount lavinia': 'Dehiwala-Mount Lavinia', kotte: 'Sri Jayewardenepura Kotte', geneva: 'Geneva', munich: 'Munich',
  cologne: 'Köln', 'the hague': 'The Hague', gothenburg: 'Göteborg', reunion: 'Saint-Denis', 'port louis': 'Port Louis',
};

const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[‘’'`ʻ]/g, '').toLowerCase().trim();
const rad = Math.PI / 180;
const kmBetween = (a, b, c, d) => {
  const x = Math.sin((c - a) * rad / 2) ** 2 + Math.cos(a * rad) * Math.cos(c * rad) * Math.sin((d - b) * rad / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(x));
};

/** Every built-in place: { name, region, cc, country, lat, lon, zone, pop } (pop in thousands; 0 when unknown). */
export const PLACES = ROWS.split('\n').map((r) => {
  const [name, ri, cc, lat, lon, zi, pop] = r.split('|');
  return { name, region: REGIONS[Number(ri) - 1] || '', cc, country: countryByCode(cc)?.en || cc, lat: Number(lat), lon: Number(lon), zone: ZONES[Number(zi)], pop: Number(pop) };
});
for (const [name, region, cc, lat, lon] of LEGACY) {
  const twin = PLACES.find((p) => p.cc === cc && (fold(p.name) === fold(name) ? kmBetween(p.lat, p.lon, lat, lon) < 40 : kmBetween(p.lat, p.lon, lat, lon) < 12 && fold(p.name).startsWith(fold(name).slice(0, 4))));
  if (twin) { if (fold(twin.name) !== fold(name)) ALIASES[fold(name)] ||= twin.name; continue; }
  const near = PLACES.filter((p) => p.cc === cc).sort((a, b) => kmBetween(a.lat, a.lon, lat, lon) - kmBetween(b.lat, b.lon, lat, lon))[0];
  PLACES.push({ name, region, cc, country: countryByCode(cc)?.en || cc, lat, lon, zone: near?.zone || countryByCode(cc)?.zones[0], pop: 0 });
}
const FOLDED = PLACES.map((p) => fold(p.name));

/** UTC offset in hours of an IANA zone at an instant (default now), e.g. 'Asia/Colombo' → 5.5. */
export function zoneOffsetHours(zone, at = Date.now()) {
  return isValidZone(zone) ? zoneOffsetMinutes(zone, at) / 60 : null;
}
/** '+5:30' style label for an offset in hours. */
export function offsetLabel(h) {
  if (h == null || !Number.isFinite(Number(h))) return '';
  const m = Math.round(Math.abs(h) * 60);
  return `UTC${h < 0 ? '−' : '+'}${Math.floor(m / 60)}${m % 60 ? `:${String(m % 60).padStart(2, '0')}` : ''}`;
}

/** A search result: the place plus `tz` (today's offset, for older code that wants a number). */
const withTz = (p) => ({ ...p, tz: zoneOffsetHours(p.zone) ?? p.tz ?? null });

const TAMIL = /[஀-௿]/;
let taIndex = null;
function tamilIndex() {
  if (taIndex) return taIndex;
  taIndex = PLACES.map((p) => `${PLACE_TA[p.name] || ''} ${regionTa(p)} ${countryByCode(p.cc)?.ta || ''}`);
  return taIndex;
}

/**
 * Search the built-in places. English (any accents), old names (Madras, Trichy) and Tamil script all work.
 * Ranking: exact name, then name prefix, then word prefix, then region / country match; places in `preferCc`
 * (the user's country) and bigger places first. Returns copies with `tz` (current offset) for older callers.
 */
export function searchLocalPlaces(q, limit = 8, { preferCc = '' } = {}) {
  const raw = String(q || '').trim();
  if (!raw) return PLACES.filter((p) => p.cc === (preferCc || 'IN')).sort((a, b) => b.pop - a.pop).slice(0, limit).map(withTz);
  const scored = [];
  if (TAMIL.test(raw)) {
    const idx = tamilIndex();
    PLACES.forEach((p, i) => {
      const ta = PLACE_TA[p.name] || '';
      let s = 0;
      if (ta && ta === raw) s = 100; else if (ta && ta.startsWith(raw)) s = 80; else if (ta && ta.includes(raw)) s = 50; else if (idx[i].includes(raw)) s = 20;
      if (s) scored.push([s, p]);
    });
  } else {
    // "Jaffna, Sri Lanka" / "London UK" — the first part is the place, the rest narrows the country or region.
    const [head, ...rest] = fold(raw).split(/\s*,\s*/);
    const s0 = fold(ALIASES[head] || head);
    const narrow = rest.join(' ');
    PLACES.forEach((p, i) => {
      const n = FOLDED[i];
      let s = 0;
      if (n === s0) s = 100;
      else if (n.startsWith(s0)) s = 80;
      else if (n.split(/[\s-]+/).some((w) => w.startsWith(s0))) s = 60;
      else if (s0.length >= 3 && n.includes(s0)) s = 40;
      else if (s0.length >= 4 && (fold(p.region).startsWith(s0) || fold(p.country) === s0)) s = 10;
      if (!s) return;
      if (narrow && !`${fold(p.region)} ${fold(p.country)} ${p.cc.toLowerCase()} ${p.cc === 'GB' ? 'uk' : ''} ${p.cc === 'US' ? 'usa' : ''} ${p.cc === 'AE' ? 'uae' : ''}`.includes(narrow)) return;
      scored.push([s, p]);
    });
  }
  const pref = (p) => (p.cc === preferCc ? 2 : 0) + (p.cc === 'IN' ? 1 : 0);
  return scored
    .sort((a, b) => b[0] - a[0] || pref(b[1]) - pref(a[1]) || b[1].pop - a[1].pop)
    .slice(0, limit)
    .map(([, p]) => withTz(p));
}

/** Nearest built-in place to a point (optionally within one country), with its distance in km. */
export function nearestPlace(lat, lon, { cc = null, maxKm = Infinity } = {}) {
  let best = null, bestKm = Infinity;
  for (const p of PLACES) {
    if (cc && p.cc !== cc) continue;
    const d = kmBetween(lat, lon, p.lat, p.lon);
    if (d < bestKm) { best = p; bestKm = d; }
  }
  return best && bestKm <= maxKm ? { ...withTz(best), km: bestKm } : null;
}

/** A sensible first location for a new install: the biggest built-in city in the phone's time zone, else Chennai. */
export function devicePlace(zone) {
  let z = zone;
  try { z ??= Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { /* old runtime */ }
  const alias = { 'Asia/Calcutta': 'Asia/Kolkata', 'Asia/Rangoon': 'Asia/Yangon', 'Asia/Katmandu': 'Asia/Kathmandu' }[z] || z;
  const best = PLACES.filter((p) => p.zone === alias).sort((a, b) => b.pop - a.pop)[0];
  return withTz(best && alias !== 'Asia/Kolkata' ? best : PLACES.find((p) => p.name === 'Chennai'));
}

/**
 * IANA zone for a point found online: single-zone countries use their zone; countries with several zones
 * (US, CA, AU, RU, BR, MX, ID, KZ …) use the nearest built-in place in the same country.
 */
export function zoneFor(cc, lat, lon) {
  const c = countryByCode(cc);
  if (c && c.zones.length === 1) return c.zones[0];
  const near = nearestPlace(lat, lon, { cc: c ? c.cc : null, maxKm: c ? Infinity : 400 });
  return near?.zone || c?.zones[0] || null;
}

/** OpenStreetMap Nominatim result (format=json, addressdetails=1) → a place with an IANA zone. */
export function fromNominatim(d) {
  const lat = Number(d.lat), lon = Number(d.lon);
  const a = d.address || {};
  const cc = String(a.country_code || '').toUpperCase();
  const name = d.name || a.city || a.town || a.village || a.suburb || String(d.display_name || '').split(',')[0];
  const region = a.state || a.province || a.region || a.state_district || a.county || '';
  const zone = zoneFor(cc, lat, lon);
  return { name, region: region === name ? '' : region, cc, country: countryByCode(cc)?.en || a.country || '', lat, lon, zone, tz: zoneOffsetHours(zone), online: true };
}

export const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
/** Nominatim search URL (polite usage: one request at a time, debounced, results cached by the caller). */
export function nominatimUrl(q, { limit = 6, lang = 'en' } = {}) {
  return `${NOMINATIM_URL}?format=json&addressdetails=1&limit=${limit}&accept-language=${encodeURIComponent(lang)}&q=${encodeURIComponent(q)}`;
}

/** Text a person sees and we store for a place: 'Jaffna, Sri Lanka'; Indian places keep the plain town name. */
export function placeText(p) {
  if (!p) return '';
  if (p.cc === 'IN' || !p.cc) return p.name;
  return p.cc === 'SG' && p.name === 'Singapore' ? 'Singapore' : `${p.name}, ${p.country || countryByCode(p.cc)?.en || p.cc}`;
}

/** 'City, Region, Country' in English or Tamil (Tamil where a Tamil name exists). */
export function placeLabel(p, lang = 'en') {
  if (!p) return '';
  const country = countryByCode(p.cc);
  const parts = lang === 'ta'
    ? [PLACE_TA[p.name] || p.name, regionTa(p) || p.region, country?.ta || p.country]
    : [p.name, p.region, country?.en || p.country];
  return [...new Set(parts.filter(Boolean))].join(', ');
}

/** Region (state / province) in Tamil, when known. */
export function regionTa(p) {
  return REGION_TA[`${p.cc}:${p.region}`] || (p.cc === 'IN' || p.cc === 'MY' || p.cc === 'AU' || p.cc === 'CA' || p.cc === 'US' || p.cc === 'GB' ? PLACE_TA[p.region] || '' : '');
}

/**
 * Old profiles saved only a numeric UTC offset. When the saved place matches a built-in place (same name, within
 * 60 km of the saved coordinates) attach its IANA zone, so the chart uses the historical offset. Returns the same
 * object (changed) or the original when nothing matched.
 */
export function attachZone(m) {
  if (!m || m.zone || !m.place || !Number.isFinite(Number(m.lat)) || !Number.isFinite(Number(m.lon)) || m.kattam) return m;
  const head = fold(String(m.place).split(',')[0].replace(/\s*\(.*\)\s*/, ''));
  const name = fold(ALIASES[head] || head);
  const hit = PLACES.find((p, i) => FOLDED[i] === name && kmBetween(p.lat, p.lon, Number(m.lat), Number(m.lon)) < 60);
  if (hit) m.zone = hit.zone;
  return m;
}

// Country names in Tamil for placeTa ('Jaffna, Sri Lanka' → 'யாழ்ப்பாணம், இலங்கை').
const COUNTRY_TA = new Map(COUNTRIES.map((c) => [c.en, c.ta.replace(/\s*\([A-Z]+\)$/, '')]));

const REGION_TA = {
  'LK:Northern': 'வட மாகாணம்', 'LK:Eastern': 'கிழக்கு மாகாணம்', 'LK:Western': 'மேல் மாகாணம்', 'LK:Central': 'மத்திய மாகாணம்',
  'LK:Southern': 'தென் மாகாணம்', 'LK:Uva': 'ஊவா மாகாணம்', 'LK:Sabaragamuwa': 'சப்ரகமுவ மாகாணம்', 'LK:North Western': 'வடமேல் மாகாணம்',
  'LK:North Central': 'வடமத்திய மாகாணம்', 'AE:Dubai': 'துபாய்', 'AE:Abu Dhabi': 'அபுதாபி', 'AE:Sharjah': 'ஷார்ஜா', 'AE:Ajman': 'அஜ்மான்',
  'ZA:KwaZulu-Natal': 'குவாசுலு-நடால்', 'ZA:Gauteng': 'கௌடெங்', 'ZA:Western Cape': 'மேற்குக் கேப்',
};

// Tamil names for display in Tamil mode.
export const PLACE_TA = {
  'Thirumanancheri': 'திருமணஞ்சேரி',
  'Kuthalam': 'குத்தாலம்',
  'Thiruvidaimarudur': 'திருவிடைமருதூர்',
  'Patteeswaram': 'பட்டீஸ்வரம்',
  'Thiruvalangadu': 'திருவாலங்காடு',
  'Tiruvallur': 'திருவள்ளூர்',
  'Thirukollikadu': 'திருக்கொள்ளிக்காடு',
  'Thiruthuraipoondi': 'திருத்துறைப்பூண்டி',
  'Kuchanur': 'குச்சனூர்',
  'Theni': 'தேனி',
  'Srivaikuntam': 'ஸ்ரீவைகுண்டம்',
  'Srinivasa Mangapuram': 'ஸ்ரீனிவாச மங்காபுரம்',
  'Thirumeyachur': 'திருமீயச்சூர்',
  'Peralam': 'பேரளம்',
  'Thirupugalur': 'திருப்புகலூர்',
  'Nannilam': 'நன்னிலம்',
  'Sirkazhi': 'சீர்காழி',
  'Mayiladuthurai': 'மயிலாடுதுறை',
  'Thiruvidanthai': 'திருவிடந்தை',
  'ECR': 'கிழக்குக் கடற்கரைச் சாலை',
  'Pillaiyarpatti': 'பிள்ளையார்பட்டி',
  'Melmaruvathur': 'மேல்மருவத்தூர்',
  'Mangadu': 'மாங்காடு',
  'Thiruverkadu': 'திருவேற்காடு',
  'Thiruvellarai': 'திருவெள்ளறை',
  'Sholingur': 'சோளிங்கர்',
  'Tiruchanur': 'திருச்சானூர்',
  'Chottanikkara': 'சோட்டாணிக்கரை',
  Chennai: 'சென்னை', Madurai: 'மதுரை', Coimbatore: 'கோயம்புத்தூர்', Tiruchirappalli: 'திருச்சிராப்பள்ளி', Salem: 'சேலம்', Tirunelveli: 'திருநெல்வேலி',
  Thanjavur: 'தஞ்சாவூர்', Kumbakonam: 'கும்பகோணம்', Erode: 'ஈரோடு', Vellore: 'வேலூர்', Tiruppur: 'திருப்பூர்', Thoothukudi: 'தூத்துக்குடி',
  Nagercoil: 'நாகர்கோவில்', Kanchipuram: 'காஞ்சிபுரம்', Dindigul: 'திண்டுக்கல்', Karaikudi: 'காரைக்குடி', Pudukkottai: 'புதுக்கோட்டை',
  Nagapattinam: 'நாகப்பட்டினம்', Cuddalore: 'கடலூர்', Villupuram: 'விழுப்புரம்', Tiruvannamalai: 'திருவண்ணாமலை', Rameswaram: 'ராமேஸ்வரம்',
  Ooty: 'ஊட்டி', Hosur: 'ஓசூர்', Karur: 'கரூர்', Namakkal: 'நாமக்கல்', Sivakasi: 'சிவகாசி', Puducherry: 'புதுச்சேரி', Bengaluru: 'பெங்களூரு',
  Mysuru: 'மைசூரு', Mangaluru: 'மங்களூரு', Hubballi: 'ஹுப்பள்ளி', Hyderabad: 'ஹைதராபாத்', Vijayawada: 'விஜயவாடா', Visakhapatnam: 'விசாகப்பட்டினம்',
  Tirupati: 'திருப்பதி', Nellore: 'நெல்லூர்', Thiruvananthapuram: 'திருவனந்தபுரம்', Kochi: 'கொச்சி', Kozhikode: 'கோழிக்கோடு', Thrissur: 'திருச்சூர்',
  Palakkad: 'பாலக்காடு', Mumbai: 'மும்பை', Pune: 'புனே', Delhi: 'டெல்லி', Kolkata: 'கொல்கத்தா', Ahmedabad: 'அகமதாபாத்', Jaipur: 'ஜெய்ப்பூர்',
  Lucknow: 'லக்னோ', Varanasi: 'வாரணாசி', Bhubaneswar: 'புவனேஸ்வர்', Patna: 'பாட்னா', 'Goa (Panaji)': 'கோவா (பனாஜி)', Colombo: 'கொழும்பு',
  Jaffna: 'யாழ்ப்பாணம்', Singapore: 'சிங்கப்பூர்', 'Kuala Lumpur': 'கோலாலம்பூர்', Dubai: 'துபாய்', 'Abu Dhabi': 'அபுதாபி', Doha: 'தோஹா',
  Muscat: 'மஸ்கட்', Riyadh: 'ரியாத்', London: 'லண்டன்', 'New York': 'நியூயார்க்', 'San Francisco': 'சான் பிரான்சிஸ்கோ', Dallas: 'டல்லாஸ்',
  Toronto: 'டொரன்டோ', Sydney: 'சிட்னி', Melbourne: 'மெல்போர்ன்', Paris: 'பாரிஸ்', Berlin: 'பெர்லின்',
  // Temple towns
  Srirangam: 'ஸ்ரீரங்கம்', Chidambaram: 'சிதம்பரம்', Thiruvanaikaval: 'திருவானைக்காவல்', Srikalahasti: 'ஸ்ரீகாளஹஸ்தி', Tiruchendur: 'திருச்செந்தூர்',
  Palani: 'பழனி', Swamimalai: 'சுவாமிமலை', Thiruthani: 'திருத்தணி', 'Alagar Kovil': 'அழகர் கோவில்', Mylapore: 'மயிலாப்பூர்', Triplicane: 'திருவல்லிக்கேணி',
  Vadapalani: 'வடபழனி', Samayapuram: 'சமயபுரம்', Srivilliputhur: 'ஸ்ரீவில்லிபுத்தூர்', Kanyakumari: 'கன்னியாகுமரி', Suchindram: 'சுசீந்திரம்',
  Thiruvarur: 'திருவாரூர்', Thirukadaiyur: 'திருக்கடையூர்', Sankarankovil: 'சங்கரன்கோவில்', Perur: 'பேரூர்', Tirumala: 'திருமலை', Guruvayur: 'குருவாயூர்',
  Sabarimala: 'சபரிமலை', Thiruvaiyaru: 'திருவையாறு', 'Vaitheeswaran Kovil': 'வைத்தீஸ்வரன் கோவில்', Thiruvenkadu: 'திருவெண்காடு', Alangudi: 'ஆலங்குடி',
  Needamangalam: 'நீடாமங்கலம்', Kanjanur: 'கஞ்சனூர்', Thirunallar: 'திருநள்ளாறு', Karaikal: 'காரைக்கால்', Thirunageswaram: 'திருநாகேஸ்வரம்',
  Poompuhar: 'பூம்புகார்', Kerala: 'கேரளா', 'Andhra Pradesh': 'ஆந்திரப் பிரதேசம்', Near: 'அருகில்', near: 'அருகில்', 'Tamil Nadu': 'தமிழ்நாடு',
  Karnataka: 'கர்நாடகா', Telangana: 'தெலங்கானா', Maharashtra: 'மகாராஷ்டிரா', 'Sri Lanka': 'இலங்கை', 'United Kingdom': 'ஐக்கிய இராச்சியம்', USA: 'அமெரிக்கா',
  Canada: 'கனடா', Australia: 'ஆஸ்திரேலியா', Malaysia: 'மலேசியா', UAE: 'ஐக்கிய அரபு அமீரகம்', Qatar: 'கத்தார்', Oman: 'ஓமன்', 'Saudi Arabia': 'சவுதி அரேபியா',
  France: 'பிரான்ஸ்', Germany: 'ஜெர்மனி',
  // Sri Lanka
  Trincomalee: 'திருகோணமலை', Batticaloa: 'மட்டக்களப்பு', Vavuniya: 'வவுனியா', Mannar: 'மன்னார்', Mullaitivu: 'முல்லைத்தீவு',
  Kilinochchi: 'கிளிநொச்சி', 'Point Pedro': 'பருத்தித்துறை', Chavakachcheri: 'சாவகச்சேரி', Valvettithurai: 'வல்வெட்டித்துறை', Nallur: 'நல்லூர்',
  Kayts: 'ஊர்காவற்துறை', Nainativu: 'நயினாதீவு', Kandy: 'கண்டி', 'Nuwara Eliya': 'நுவரெலியா', Hatton: 'ஹட்டன்', Badulla: 'பதுளை',
  Galle: 'காலி', Matara: 'மாத்தறை', Hambantota: 'அம்பாந்தோட்டை', Kataragama: 'கதிர்காமம்', Kurunegala: 'குருநாகல்', Puttalam: 'புத்தளம்',
  Chilaw: 'சிலாபம்', Negombo: 'நீர்கொழும்பு', Anuradhapura: 'அனுராதபுரம்', Polonnaruwa: 'பொலன்னறுவை', Ampara: 'அம்பாறை', Kalmunai: 'கல்முனை',
  Ratnapura: 'இரத்தினபுரி', Kegalle: 'கேகாலை', Matale: 'மாத்தளை', Kalutara: 'களுத்துறை', Gampaha: 'கம்பகா', Monaragala: 'மொனராகலை',
  'Dehiwala-Mount Lavinia': 'தெகிவளை-கல்கிசை', Moratuwa: 'மொறட்டுவை', 'Sri Jayewardenepura Kotte': 'ஸ்ரீ ஜயவர்த்தனபுர கோட்டை',
  // Malaysia & Singapore
  Ipoh: 'ஈப்போ', Klang: 'கிள்ளான்', 'George Town': 'ஜார்ஜ் டவுன்', Seremban: 'சிரம்பான்', 'Johor Bahru': 'ஜொகூர் பாரு', Malacca: 'மலாக்கா',
  'Shah Alam': 'ஷா ஆலம்', 'Petaling Jaya': 'பெட்டாலிங் ஜெயா', 'Sungai Petani': 'சுங்கை பட்டாணி', Taiping: 'தைப்பிங்', 'Teluk Intan': 'தெலுக் இந்தான்',
  Butterworth: 'பட்டர்வொர்த்', Kuantan: 'குவாந்தான்', 'Kota Kinabalu': 'கோத்தா கினபாலு', Kuching: 'கூச்சிங்', 'Alor Setar': 'அலோர் ஸ்டார்',
  Putrajaya: 'புத்ராஜெயா', Kajang: 'காஜாங்', 'Subang Jaya': 'சுபாங் ஜெயா', 'Batu Caves': 'பத்துமலை', Selangor: 'சிலாங்கூர்', Perak: 'பேராக்',
  Penang: 'பினாங்கு', Johor: 'ஜொகூர்', 'Negeri Sembilan': 'நெகிரி செம்பிலான்', Kedah: 'கெடா', Melaka: 'மலாக்கா', Pahang: 'பகாங்', Woodlands: 'உட்லண்ட்ஸ்',
  // Gulf
  Sharjah: 'ஷார்ஜா', Ajman: 'அஜ்மான்', 'Al Ain': 'அல் ஐன்', Salalah: 'சலாலா', Sohar: 'சோஹார்', Jeddah: 'ஜெட்டா', Dammam: 'தம்மாம்',
  'Kuwait City': 'குவைத் நகரம்', Manama: 'மனாமா',
  // United Kingdom & Ireland
  Birmingham: 'பர்மிங்காம்', Manchester: 'மான்செஸ்டர்', Leicester: 'லெஸ்டர்', Leeds: 'லீட்ஸ்', Glasgow: 'கிளாஸ்கோ', Edinburgh: 'எடின்பரோ',
  Croydon: 'குரோய்டன்', Wembley: 'வெம்பிளி', Harrow: 'ஹாரோ', Ealing: 'ஈலிங்', 'East Ham': 'ஈஸ்ட் ஹாம்', Tooting: 'டூட்டிங்', Ilford: 'இல்ஃபோர்ட்',
  Southall: 'சவுத்தால்', Highgate: 'ஹைகேட்', Tividale: 'டிவிடேல்', Coventry: 'கவென்ட்ரி', Bristol: 'பிரிஸ்டல்', Cardiff: 'கார்டிஃப்',
  Sheffield: 'ஷெஃபீல்டு', Liverpool: 'லிவர்பூல்', Nottingham: 'நாட்டிங்காம்', Dublin: 'டப்ளின்', England: 'இங்கிலாந்து', Scotland: 'ஸ்காட்லாந்து', Wales: 'வேல்ஸ்',
  // Canada
  Scarborough: 'ஸ்கார்பரோ', Markham: 'மார்க்கம்', Brampton: 'பிராம்ப்டன்', Mississauga: 'மிசிசாகா', 'Montréal': 'மொன்றியல்', Vancouver: 'வான்கூவர்',
  Ottawa: 'ஒட்டாவா', Calgary: 'கால்கரி', Edmonton: 'எட்மன்டன்', 'Richmond Hill': 'ரிச்மண்ட் ஹில்', Ajax: 'அஜாக்ஸ்', Ontario: 'ஒன்ராறியோ',
  'Québec': 'கியூபெக்', 'British Columbia': 'பிரிட்டிஷ் கொலம்பியா', Alberta: 'ஆல்பர்ட்டா',
  // United States
  'New York City': 'நியூயார்க்', Houston: 'ஹூஸ்டன்', Chicago: 'சிகாகோ', 'Los Angeles': 'லாஸ் ஏஞ்சலஸ்', 'San Jose': 'சான் ஹோசே', Seattle: 'சியாட்டில்',
  Atlanta: 'அட்லாண்டா', Boston: 'பாஸ்டன்', Washington: 'வாஷிங்டன்', Philadelphia: 'பிலடெல்பியா', Pittsburgh: 'பிட்ஸ்பர்க்', Edison: 'எடிசன்',
  'Jersey City': 'ஜெர்சி சிட்டி', Fremont: 'ஃப்ரீமான்ட்', Phoenix: 'ஃபீனிக்ஸ்', Austin: 'ஆஸ்டின்', Charlotte: 'சார்லட்', Detroit: 'டெட்ராய்ட்',
  Minneapolis: 'மினியாபொலிஸ்', Raleigh: 'ராலே', Denver: 'டென்வர்', Miami: 'மயாமி', Flushing: 'ஃபிளஷிங்', Malibu: 'மாலிபு', 'Penn Hills': 'பென் ஹில்ஸ்',
  Texas: 'டெக்சாஸ்', California: 'கலிபோர்னியா', 'New Jersey': 'நியூ ஜெர்சி', Illinois: 'இல்லினாய்ஸ்', Pennsylvania: 'பென்சில்வேனியா',
  Georgia: 'ஜார்ஜியா', Massachusetts: 'மாசசூசெட்ஸ்', Virginia: 'வர்ஜீனியா', Florida: 'புளோரிடா', 'North Carolina': 'வட கரோலினா', Michigan: 'மிச்சிகன்',
  // Australia & New Zealand
  Brisbane: 'பிரிஸ்பேன்', Perth: 'பெர்த்', Adelaide: 'அடிலெய்டு', Canberra: 'கான்பரா', Darwin: 'டார்வின்', Hobart: 'ஹோபார்ட்', 'Gold Coast': 'கோல்ட் கோஸ்ட்',
  Wollongong: 'வொல்லொங்கொங்', Helensburgh: 'ஹெலன்ஸ்பர்க்', 'New South Wales': 'நியூ சவுத் வேல்ஸ்', Victoria: 'விக்டோரியா', Queensland: 'குயின்ஸ்லாந்து',
  'Western Australia': 'மேற்கு ஆஸ்திரேலியா', 'South Australia': 'தெற்கு ஆஸ்திரேலியா', Auckland: 'ஆக்லாந்து', Wellington: 'வெலிங்டன்', Christchurch: 'கிறைஸ்ட்சர்ச்',
  // Africa, Indian Ocean, Pacific, Caribbean
  Durban: 'டர்பன்', Johannesburg: 'ஜோகன்னஸ்பர்க்', 'Cape Town': 'கேப் டவுன்', Pretoria: 'பிரிட்டோரியா', Pietermaritzburg: 'பீட்டர்மாரிட்ஸ்பர்க்',
  'Port Louis': 'போர்ட் லூயிஸ்', Curepipe: 'கியூர்பைப்', 'Saint-Denis': 'செயின்ட்-டெனிஸ்', Suva: 'சுவா', Nadi: 'நாடி', Lautoka: 'லௌடோகா',
  Nairobi: 'நைரோபி', Georgetown: 'ஜார்ஜ்டவுன்', 'Port of Spain': 'போர்ட் ஆஃப் ஸ்பெயின்',
  // Europe
  'Zürich': 'சூரிச்', Geneva: 'ஜெனீவா', Bern: 'பேர்ன்', Basel: 'பாசல்', Amsterdam: 'ஆம்ஸ்டர்டாம்', Rotterdam: 'ரொட்டர்டாம்', Oslo: 'ஒஸ்லோ',
  Bergen: 'பெர்கன்', Copenhagen: 'கோபனேகன்', Stockholm: 'ஸ்டாக்ஹோம்', 'Frankfurt am Main': 'ஃபிராங்க்பர்ட்', Munich: 'மியூனிக்', Hamburg: 'ஹாம்பர்க்',
  Rome: 'ரோம்', Brussels: 'பிரசல்ஸ்', Helsinki: 'ஹெல்சின்கி',
  // Asia
  Yangon: 'யாங்கோன்', Mandalay: 'மண்டலே', Bangkok: 'பாங்காக்', Jakarta: 'ஜகார்த்தா', Medan: 'மேதான்', Tokyo: 'டோக்கியோ', 'Hong Kong': 'ஹாங்காங்',
  Male: 'மாலே', Kathmandu: 'காத்மாண்டு', Dhaka: 'டாக்கா',
};
/** Translate a place / town string word-group by word-group (e.g. "Srirangam, Tiruchirappalli"). */
export function placeTa(text) {
  if (!text) return text;
  if (PLACE_TA[text]) return PLACE_TA[text];
  return text.split(/(,\s*|\s*\(|\)\s*)/).map((part) => PLACE_TA[part.trim()] ?? COUNTRY_TA.get(part.trim()) ?? (/^near\s+/i.test(part) ? `${PLACE_TA[part.replace(/^near\s+/i, '').trim()] || part.replace(/^near\s+/i, '')} அருகில்` : part)).join('').replace(/\(\s*/g, '(');
}

/**
 * A place typed into the birth-place box but not picked from the list: the one built-in place it clearly names
 * (its name, "name, country" text or Tamil name — whole label or its first part), else the only search result.
 * Returns null when it is not clear (no match, or several towns of that name), so the form can ask the person.
 */
export function resolveTypedPlace(q, { preferCc = '' } = {}) {
  const norm = (s) => String(s || '').toLowerCase().normalize('NFC').replace(/[\s,.]+/g, ' ').trim();
  const t = norm(q);
  if (t.length < 2) return null;
  const res = searchLocalPlaces(q, 8, { preferCc });
  const names = (p) => [p.name, placeText(p), placeLabel(p, 'en'), placeLabel(p, 'ta'), PLACE_TA[p.name]].filter(Boolean)
    .flatMap((x) => [x, String(x).split(',')[0]]).map(norm);
  const exact = res.filter((p) => names(p).includes(t));
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) {
    const mine = exact.filter((p) => preferCc && p.cc === preferCc);
    return mine.length === 1 ? mine[0] : null;
  }
  return res.length === 1 ? res[0] : null;
}
