// Regenerates the offline world data shipped in shared/:
//   shared/world-places.js — compact worldwide gazetteer (name, region, country, lat, lon, IANA zone)
//   shared/countries.js    — every ITU/ISO calling region: dial code, names (English + Tamil), flag,
//                            mobile number lengths, national prefix, IANA zones and currency.
//
// Data sources (none of them are runtime dependencies of the app):
//   • GeoNames cities1000 via the `all-the-cities` npm package — city names, coordinates, population,
//     admin codes. GeoNames data is CC BY 4.0 (https://www.geonames.org/) — credited in Legal / About.
//   • `geo-tz` (timezone-boundary-builder polygons, ODbL) — the IANA zone of every chosen point.
//   • `city-timezones` (Natural Earth populated places) — readable region (state / province) names.
//   • `libphonenumber-js` (Google libphonenumber metadata) — calling codes, mobile lengths, trunk prefix.
//   • `countries-and-timezones`, `countries-list` — zones and currency per country.
//   • Tamil country names: CLDR via Intl.DisplayNames('ta').
//
// Usage (the packages are NOT installed in this repo; install them in any scratch folder first):
//   mkdir /tmp/wd && cd /tmp/wd && npm init -y && npm i geo-tz all-the-cities city-timezones \
//     libphonenumber-js countries-and-timezones countries-list
//   node scripts/build-world-data.mjs /tmp/wd/node_modules
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mods = path.resolve(process.argv[2] || 'node_modules');
const require = createRequire(path.join(mods, 'x.js'));
const cities = require('all-the-cities');
const ctz = require('city-timezones/data/cityMap.json');
const { find: findTz } = await import(pathToFileURL(require.resolve('geo-tz/all')).href);
const phoneMeta = require('libphonenumber-js/metadata.mobile.json');
const phoneMin = require('libphonenumber-js/metadata.min.json');
const ct = require('countries-and-timezones');
const { countries: CL } = require('countries-list');

const valid = (z) => { try { new Intl.DateTimeFormat('en', { timeZone: z }); return true; } catch { return false; } };
const taNames = new Intl.DisplayNames(['ta'], { type: 'region' });
const enNames = new Intl.DisplayNames(['en'], { type: 'region' });
const flag = (cc) => String.fromCodePoint(...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
const rad = Math.PI / 180;
const km = (a, b, c, d) => {
  const x = Math.sin((c - a) * rad / 2) ** 2 + Math.cos(a * rad) * Math.cos(c * rad) * Math.sin((d - b) * rad / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(x));
};

// ------------------------------------------------------------------ countries
const SHORT_EN = { GB: 'United Kingdom', US: 'United States', AE: 'United Arab Emirates', KR: 'South Korea', KP: 'North Korea', RU: 'Russia', IR: 'Iran', SY: 'Syria', VN: 'Vietnam', LA: 'Laos', BO: 'Bolivia', VE: 'Venezuela', TZ: 'Tanzania', MD: 'Moldova', CD: 'DR Congo', CG: 'Congo', FM: 'Micronesia', PS: 'Palestine', TW: 'Taiwan', MK: 'North Macedonia', CZ: 'Czechia' };
// Tamil names the diaspora uses most often (CLDR is used for everything else).
const TA_OVERRIDE = { GB: 'ஐக்கிய இராச்சியம் (UK)', US: 'அமெரிக்கா (USA)', AE: 'ஐக்கிய அரபு அமீரகம் (UAE)', LK: 'இலங்கை', SG: 'சிங்கப்பூர்', MY: 'மலேசியா' };
const regions = Object.keys(phoneMin.countries).filter((cc) => /^[A-Z]{2}$/.test(cc) && cc !== '001');
const countries = regions.map((cc) => {
  const m = phoneMeta.countries[cc] || phoneMin.countries[cc];
  const lens = (m[3] || []).filter(Number.isFinite);
  const zones = (ct.getCountry(cc)?.timezones || []).filter(valid);
  const cur = CL[cc]?.currency?.[0] || '';
  let en = SHORT_EN[cc] || CL[cc]?.name || enNames.of(cc);
  let ta = TA_OVERRIDE[cc] || taNames.of(cc);
  if (ta === cc) ta = en;
  return {
    cc, en, ta, dial: m[0], flag: flag(cc), min: lens.length ? Math.min(...lens) : 6, max: lens.length ? Math.max(...lens) : 12,
    np: typeof m[5] === 'string' ? m[5] : '', zones, cur,
  };
}).sort((a, b) => a.en.localeCompare(b.en));

// ------------------------------------------------------------------ places
// Priority (Tamil diaspora) countries get lower population thresholds.
const MIN_POP = {
  LK: 9000, SG: 0, MY: 25000, MU: 8000, RE: 8000, FJ: 5000, SC: 5000, MV: 0,
  AE: 30000, QA: 20000, OM: 25000, SA: 120000, KW: 40000, BH: 20000,
  GB: 70000, IE: 40000, US: 100000, CA: 50000, AU: 25000, NZ: 30000, ZA: 90000,
  FR: 90000, DE: 120000, CH: 30000, NL: 80000, NO: 30000, DK: 50000, SE: 70000, FI: 60000, IT: 150000, BE: 60000,
  MM: 100000, TH: 200000, ID: 400000, PH: 400000, KE: 150000, GY: 10000, TT: 20000, SR: 10000,
};
const DEFAULT_POP = 300000;
const IN_POP = { 25: 25000, 22: 0, 13: 80000, 19: 100000, 2: 100000, 40: 100000 }; // Tamil Nadu, Puducherry, Kerala, Karnataka, AP, Telangana
const keep = new Map(); // geonames id -> city
const byCountry = new Map();
for (const c of cities) {
  if (/^PPL[HQW]$/.test(c.featureCode) || /\(Kreis|Business District|\(Bezirk|^Stadtbezirk/.test(c.name)) continue;
  if (!byCountry.has(c.country)) byCountry.set(c.country, []);
  byCountry.get(c.country).push(c);
}
for (const [cc, list] of byCountry) {
  list.sort((a, b) => b.population - a.population);
  const min = cc === 'IN' ? null : (MIN_POP[cc] ?? DEFAULT_POP);
  list.forEach((c, i) => {
    const capital = c.featureCode === 'PPLC';
    const seat = c.featureCode === 'PPLA' && c.population >= (MIN_POP[cc] != null ? Math.min(MIN_POP[cc], 50000) : 100000);
    const big = cc === 'IN' ? c.population >= (IN_POP[Number(c.adminCode)] ?? 250000) : c.population >= min;
    if (capital || seat || big || i < 3) keep.set(c.cityId, c);
  });
}

// Region names: GeoNames admin1 code -> the province name most often seen on matching Natural Earth places.
const adminVotes = new Map();
const ctzByCc = new Map();
for (const p of ctz) { if (!ctzByCc.has(p.iso2)) ctzByCc.set(p.iso2, []); ctzByCc.get(p.iso2).push(p); }
for (const c of cities) {
  if (c.population < 20000) continue;
  const near = (ctzByCc.get(c.country) || []).find((p) => (p.city === c.name || p.city_ascii === c.name) && km(p.lat, p.lng, c.loc.coordinates[1], c.loc.coordinates[0]) < 40);
  if (!near || !near.province) continue;
  const k = `${c.country}.${c.adminCode}`;
  if (!adminVotes.has(k)) adminVotes.set(k, new Map());
  const v = adminVotes.get(k);
  v.set(near.province, (v.get(near.province) || 0) + 1);
}
const ADMIN_OVERRIDE = {
  // Sri Lanka provinces (GeoNames admin1)
  'LK.29': 'Central', 'LK.30': 'North Central', 'LK.32': 'North Western', 'LK.33': 'Sabaragamuwa', 'LK.34': 'Southern',
  'LK.35': 'Uva', 'LK.36': 'Western', 'LK.37': 'Eastern', 'LK.38': 'Northern',
  'SG.01': '', 'IN.25': 'Tamil Nadu', 'IN.22': 'Puducherry', 'IN.13': 'Kerala', 'IN.19': 'Karnataka', 'IN.02': 'Andhra Pradesh', 'IN.40': 'Telangana',
  'GB.ENG': 'England', 'GB.SCT': 'Scotland', 'GB.WLS': 'Wales', 'GB.NIR': 'Northern Ireland',
  'AE.01': 'Abu Dhabi', 'AE.02': 'Ajman', 'AE.03': 'Dubai', 'AE.04': 'Fujairah', 'AE.05': 'Ras al-Khaimah', 'AE.06': 'Sharjah', 'AE.07': 'Umm al-Quwain',
  'MY.14': 'Kuala Lumpur', 'MY.12': 'Selangor', 'MY.07': 'Perak', 'MY.09': 'Penang', 'MY.01': 'Johor', 'MY.05': 'Negeri Sembilan', 'MY.04': 'Melaka',
  'MY.02': 'Kedah', 'MY.06': 'Pahang', 'MY.03': 'Kelantan', 'MY.13': 'Terengganu', 'MY.11': 'Sarawak', 'MY.16': 'Sabah', 'MY.08': 'Perlis', 'MY.15': 'Labuan', 'MY.17': 'Putrajaya',
};
const regionOf = (c) => {
  const k = `${c.country}.${c.adminCode}`;
  if (k in ADMIN_OVERRIDE) return ADMIN_OVERRIDE[k];
  const v = adminVotes.get(k);
  if (!v) return c.country === 'US' && /^[A-Z]{2}$/.test(c.adminCode) ? c.adminCode : '';
  return [...v.entries()].sort((a, b) => b[1] - a[1])[0][0];
};

const out = [];
for (const c of keep.values()) {
  const [lon, lat] = c.loc.coordinates;
  const zone = findTz(lat, lon).find(valid);
  if (!zone) continue;
  let region = regionOf(c);
  if (region === c.name) region = '';
  out.push({ name: c.name, region, cc: c.country, lat, lon, zone, pop: c.population });
}

// Hand-checked additions: Sri Lankan district towns and pilgrim towns missing from cities1000.
const EXTRA = [
  ['Mannar', 'Northern', 'LK', 8.9810, 79.9044], ['Mullaitivu', 'Northern', 'LK', 9.2671, 80.8142],
  ['Hambantota', 'Southern', 'LK', 6.1241, 81.1185], ['Chavakachcheri', 'Northern', 'LK', 9.6580, 80.1617],
  ['Valvettithurai', 'Northern', 'LK', 9.8167, 80.1667], ['Nallur', 'Northern', 'LK', 9.6747, 80.0294],
  ['Kataragama', 'Uva', 'LK', 6.4134, 81.3346], ['Chilaw', 'North Western', 'LK', 7.5758, 79.7953],
  ['Hatton', 'Central', 'LK', 6.8916, 80.5955], ['Kayts', 'Northern', 'LK', 9.6930, 79.8590],
  ['Nainativu', 'Northern', 'LK', 9.6167, 79.7740], ['Talawakele', 'Central', 'LK', 6.9372, 80.6581],
  // London boroughs / districts with large Tamil communities, and temple towns abroad
  ['Harrow', 'England', 'GB', 51.5806, -0.3420], ['Ealing', 'England', 'GB', 51.5130, -0.3089], ['East Ham', 'England', 'GB', 51.5323, 0.0554],
  ['Tooting', 'England', 'GB', 51.4275, -0.1680], ['Ilford', 'England', 'GB', 51.5590, 0.0741], ['Southall', 'England', 'GB', 51.5110, -0.3760],
  ['Highgate', 'England', 'GB', 51.5716, -0.1448], ['Tividale', 'England', 'GB', 52.5130, -2.0560],
  ['Flushing', 'New York', 'US', 40.7675, -73.8331], ['Malibu', 'California', 'US', 34.0259, -118.7798], ['Penn Hills', 'Pennsylvania', 'US', 40.5012, -79.8392],
  ['Helensburgh', 'New South Wales', 'AU', -34.1786, 150.9936], ['Batu Caves', 'Selangor', 'MY', 3.2379, 101.6840],
];
for (const [name, region, cc, lat, lon] of EXTRA) {
  if (out.some((p) => p.cc === cc && p.name === name)) continue;
  out.push({ name, region, cc, lat, lon, zone: findTz(lat, lon).find(valid), pop: 0 });
}

// De-duplicate same-name places within 25 km (keep the bigger one).
out.sort((a, b) => b.pop - a.pop);
const final = [];
for (const p of out) if (!final.some((q) => q.cc === p.cc && q.name === p.name && km(p.lat, p.lon, q.lat, q.lon) < 25)) final.push(p);
final.sort((a, b) => (a.cc === b.cc ? b.pop - a.pop : a.cc.localeCompare(b.cc)));

const zones = [...new Set(final.map((p) => p.zone))].sort();
const regionsList = [...new Set(final.map((p) => p.region).filter(Boolean))].sort();
const rows = final.map((p) => [p.name, p.region ? regionsList.indexOf(p.region) + 1 : 0, p.cc, +p.lat.toFixed(4), +p.lon.toFixed(4), zones.indexOf(p.zone), Math.round(p.pop / 1000)].join('|'));

const header = `// GENERATED by scripts/build-world-data.mjs — do not edit by hand.
// Offline world gazetteer: ${final.length} places. Coordinates and names from GeoNames (CC BY 4.0, https://www.geonames.org/),
// IANA time zones from timezone-boundary-builder via geo-tz (ODbL), region names from Natural Earth.
// Row: name|regionIndex (1-based into REGIONS, 0 = none)|ISO country|lat|lon|zoneIndex|population in thousands
`;
fs.writeFileSync(path.join(root, 'shared', 'world-places.js'), `${header}export const ZONES = ${JSON.stringify(zones)};
export const REGIONS = ${JSON.stringify(regionsList)};
export const ROWS = ${JSON.stringify(rows.join('\n'))};
`);

const cHeader = `// GENERATED by scripts/build-world-data.mjs — do not edit by hand.
// Every calling region in Google's libphonenumber metadata (${countries.length}): ISO code, English and Tamil
// (CLDR) names, flag, calling code, mobile national-number lengths [min, max], trunk prefix, IANA zones, currency.
`;
const cRows = countries.map((c) => [c.cc, c.en, c.ta, c.dial, c.min, c.max, c.np, c.zones.join(' '), c.cur].join('|'));
fs.writeFileSync(path.join(root, 'shared', 'country-data.js'), `${cHeader}export const COUNTRY_ROWS = ${JSON.stringify(cRows.join('\n'))};
`);
console.log(`places ${final.length}, zones ${zones.length}, regions ${regionsList.length}, countries ${countries.length}`);
for (const f of ['world-places.js', 'country-data.js']) console.log(f, fs.statSync(path.join(root, 'shared', f)).size, 'bytes');
