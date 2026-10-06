// Worldwide use: country-code picker data and E.164 numbers, SMS routing, the offline world gazetteer with IANA
// zones (historical offsets), online-result zones, temples abroad, journeys from other countries and currency.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { COUNTRIES, countryByCode, guessCountry, searchCountries, toE164, parseE164, formatPhone, countryForZone } from '../shared/countries.js';
import { PLACES, searchLocalPlaces, placeLabel, placeText, placeTa, attachZone, fromNominatim, zoneFor, nearestPlace, devicePlace, offsetLabel } from '../shared/places.js';
import { zonedToUtc, isValidZone } from '../shared/datetime.js';
import { birthChart } from '../shared/astro.js';
import { TEMPLES, templesNear, TEMPLE_TAGS } from '../shared/temples.js';
import { templeInfo } from '../shared/temple-info.js';
import { planJourney } from '../shared/journey.js';
import { PACKAGES, packageRoute } from '../shared/packages.js';
import { money, toInr, userCurrency } from '../shared/currency.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIASPORA = ['IN', 'LK', 'SG', 'MY', 'AE', 'QA', 'OM', 'SA', 'KW', 'BH', 'GB', 'US', 'CA', 'AU', 'NZ', 'ZA', 'MU', 'RE', 'FJ', 'FR', 'DE', 'CH', 'NL', 'NO', 'MM', 'SC', 'GY', 'TT'];

// ------------------------------------------------------------------ countries & phone numbers
test('country picker: every calling region, with flag, Tamil name and dialling code', () => {
  assert.ok(COUNTRIES.length >= 240, `only ${COUNTRIES.length} countries`);
  for (const cc of DIASPORA) assert.ok(countryByCode(cc), `${cc} missing`);
  const dial = { IN: '91', LK: '94', MY: '60', SG: '65', AE: '971', QA: '974', OM: '968', SA: '966', KW: '965', BH: '973', GB: '44', US: '1', CA: '1', AU: '61', NZ: '64', ZA: '27', MU: '230', RE: '262', FJ: '679', FR: '33', DE: '49', CH: '41', NL: '31', NO: '47', MM: '95' };
  for (const [cc, d] of Object.entries(dial)) assert.equal(countryByCode(cc).dial, d, cc);
  for (const c of COUNTRIES) {
    assert.match(c.cc, /^[A-Z]{2}$/);
    assert.match(c.dial, /^[1-9]\d{0,2}$/, c.cc);
    assert.ok(c.en && c.ta, c.cc);
    assert.equal([...c.flag].length, 2, c.cc);
    assert.ok(c.min >= 4 && c.max <= 17 && c.min <= c.max, `${c.cc} lengths ${c.min}-${c.max}`);
  }
  assert.equal(countryByCode('LK').ta, 'இலங்கை');
  assert.equal(countryByCode('LK').cur, 'LKR');
  assert.equal(new Set(COUNTRIES.map((c) => c.cc)).size, COUNTRIES.length, 'no duplicates');
});

test('country picker: search by English, Tamil, ISO code or dialling code', () => {
  assert.equal(searchCountries('lanka')[0].cc, 'LK');
  assert.equal(searchCountries('இலங்கை')[0].cc, 'LK');
  assert.equal(searchCountries('+94')[0].cc, 'LK');
  assert.equal(searchCountries('971')[0].cc, 'AE');
  assert.equal(searchCountries('malay')[0].cc, 'MY');
  assert.ok(searchCountries('united').some((c) => c.cc === 'GB') && searchCountries('united').some((c) => c.cc === 'US'));
  assert.equal(searchCountries('reunion')[0].cc, 'RE'); // accents ignored (Réunion)
});

test('country picker: default from the device time zone and locale, else India', () => {
  assert.equal(guessCountry({ zone: 'Asia/Colombo', lang: 'ta' }).cc, 'LK');
  assert.equal(guessCountry({ zone: 'Asia/Kuala_Lumpur', lang: 'en-US' }).cc, 'MY');
  assert.equal(guessCountry({ zone: 'Europe/London', lang: 'en-GB' }).cc, 'GB');
  assert.equal(guessCountry({ zone: 'America/Toronto', lang: 'ta-CA' }).cc, 'CA');
  assert.equal(guessCountry({ zone: 'America/New_York', lang: 'en' }).cc, 'US');
  assert.equal(guessCountry({ zone: 'Asia/Dubai', lang: 'ta' }).cc, 'AE');
  assert.equal(guessCountry({ zone: 'Asia/Muscat', lang: 'en-OM' }).cc, 'OM');
  assert.equal(guessCountry({ zone: 'Asia/Calcutta', lang: '' }).cc, 'IN');
  assert.equal(guessCountry({ zone: 'Not/AZone', lang: '' }).cc, 'IN');
  assert.equal(countryForZone('Australia/Perth').cc, 'AU');
});

test('phone numbers: local input → E.164 per country (trunk 0, spaces, pasted +code)', () => {
  const ok = (cc, input, e164) => { const r = toE164(cc, input); assert.ok(r.ok, `${cc} ${input}`); assert.equal(r.e164, e164); };
  ok('IN', '98765 43210', '+919876543210');
  ok('IN', '098765-43210', '+919876543210');
  ok('LK', '077 123 4567', '+94771234567');
  ok('MY', '012-345 6789', '+60123456789');
  ok('SG', '9123 4567', '+6591234567');
  ok('AE', '050 123 4567', '+971501234567');
  ok('GB', '07700 900123', '+447700900123');
  ok('US', '(212) 555-0123', '+12125550123');
  ok('CA', '416 555 0123', '+14165550123');
  ok('AU', '0412 345 678', '+61412345678');
  ok('ZA', '082 123 4567', '+27821234567');
  ok('MU', '5251 2345', '+23052512345');
  ok('IN', '+94 77 123 4567', '+94771234567'); // typed international: switches country
  ok('IN', '0094771234567', '+94771234567');
  assert.equal(toE164('LK', '12345').ok, false);
  assert.equal(toE164('IN', '98765').error, 'length');
  assert.equal(toE164('GB', '').error, 'empty');
  for (const c of COUNTRIES) {
    const r = toE164(c.cc, '9'.repeat(c.max));
    if (r.ok) assert.match(r.e164, /^\+[1-9]\d{7,14}$/, c.cc); // every accepted number is valid E.164 (8–15 digits)
  }
  assert.equal(parseE164('+94771234567').country.cc, 'LK');
  assert.equal(parseE164('+14165550123', 'CA').country.cc, 'CA');
  assert.equal(parseE164('+12125550123').country.cc, 'US');
  assert.equal(parseE164('+447700900123').national, '7700900123');
  assert.equal(formatPhone('+971501234567'), '+971 501234567');
});

test('server: normalizePhone keeps the Indian shortcut and accepts E.164; SMS route by country', async () => {
  const saved = { ...process.env };
  const { normalizePhone, smsProviderFor } = await import('../server/auth.js');
  assert.equal(normalizePhone('9876543210'), '+919876543210');
  assert.equal(normalizePhone('+94771234567'), '+94771234567');
  assert.equal(normalizePhone('+44 7700 900123'), '+447700900123');
  assert.equal(normalizePhone('12345'), null);
  try {
    Object.assign(process.env, { TWILIO_ACCOUNT_SID: 'AC1', TWILIO_AUTH_TOKEN: 't', TWILIO_FROM: '+15550001111', MSG91_AUTH_KEY: 'k', MSG91_TEMPLATE_ID: 'tpl' });
    assert.equal(smsProviderFor('+919876543210'), 'msg91');
    assert.equal(smsProviderFor('+94771234567'), 'twilio');
    assert.equal(smsProviderFor('+447700900123'), 'twilio');
    delete process.env.MSG91_AUTH_KEY;
    assert.equal(smsProviderFor('+919876543210'), 'twilio');
    Object.assign(process.env, { MSG91_AUTH_KEY: 'k' });
    for (const k of ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_FROM']) delete process.env[k];
    assert.equal(smsProviderFor('+919876543210'), 'msg91');
    assert.equal(smsProviderFor('+94771234567'), null, 'MSG91 is India-only');
  } finally {
    for (const k of ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_FROM', 'MSG91_AUTH_KEY', 'MSG91_TEMPLATE_ID']) { if (k in saved) process.env[k] = saved[k]; else delete process.env[k]; }
  }
});

test('login screen: no hard-coded +91; the country picker sends E.164', () => {
  const src = fs.readFileSync(path.join(root, 'public/account.js'), 'utf8');
  assert.ok(!src.includes('<span>+91</span>'), 'hard-coded +91 prefix is gone');
  assert.match(src, /enhancePhone\(/);
  assert.match(src, /login\.to = r\.e164/);
});

// ------------------------------------------------------------------ gazetteer
test('gazetteer: worldwide, compact, every place with a valid IANA zone', () => {
  const size = fs.statSync(path.join(root, 'shared/world-places.js')).size;
  assert.ok(size < 400 * 1024, `world-places.js is ${size} bytes`);
  assert.ok(PLACES.length >= 1500, `${PLACES.length} places`);
  const countries = new Set(PLACES.map((p) => p.cc));
  assert.ok(countries.size >= 200, `${countries.size} countries`);
  for (const cc of DIASPORA) assert.ok(countries.has(cc), `no places in ${cc}`);
  const zones = new Set(PLACES.map((p) => p.zone));
  for (const z of zones) assert.ok(isValidZone(z), z);
  for (const p of PLACES) assert.ok(Math.abs(p.lat) <= 90 && Math.abs(p.lon) <= 180 && p.name && p.cc, JSON.stringify(p));
  // All 25 Sri Lankan district capitals
  for (const n of ['Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya', 'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kilinochchi', 'Mannar', 'Vavuniya', 'Mullaitivu', 'Batticaloa', 'Ampara', 'Trincomalee', 'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla', 'Monaragala', 'Ratnapura', 'Kegalle']) {
    assert.ok(PLACES.some((p) => p.cc === 'LK' && p.name === n), `Sri Lanka: ${n}`);
  }
});

test('gazetteer search: diaspora cities resolve with the right country and zone', () => {
  const cases = [
    ['Colombo', 'LK', 'Asia/Colombo'], ['Jaffna', 'LK', 'Asia/Colombo'], ['Kuala Lumpur', 'MY', 'Asia/Kuala_Lumpur'], ['Ipoh', 'MY', 'Asia/Kuala_Lumpur'],
    ['Singapore', 'SG', 'Asia/Singapore'], ['Dubai', 'AE', 'Asia/Dubai'], ['London', 'GB', 'Europe/London'], ['Toronto', 'CA', 'America/Toronto'],
    ['Houston', 'US', 'America/Chicago'], ['Sydney', 'AU', 'Australia/Sydney'], ['Durban', 'ZA', 'Africa/Johannesburg'], ['Port Louis', 'MU', 'Indian/Mauritius'],
    ['Perth', 'AU', 'Australia/Perth'], ['Doha', 'QA', 'Asia/Qatar'], ['Chennai', 'IN', 'Asia/Kolkata'], ['Montreal', 'CA', 'America/Toronto'],
    ['zurich', 'CH', 'Europe/Zurich'], ['madras', 'IN', 'Asia/Kolkata'], ['Yangon', 'MM', 'Asia/Yangon'], ['Suva', 'FJ', 'Pacific/Fiji'],
  ];
  for (const [q, cc, zone] of cases) {
    const [p] = searchLocalPlaces(q);
    assert.ok(p, q);
    assert.equal(p.cc, cc, q);
    assert.equal(p.zone, zone, q);
    assert.equal(typeof p.tz, 'number', `${q}: numeric tz for older callers`);
  }
  assert.equal(searchLocalPlaces('London, Canada')[0].cc, 'CA');
  assert.equal(searchLocalPlaces('London', 8, { preferCc: 'CA' })[0].cc, 'CA');
  assert.equal(placeLabel(searchLocalPlaces('Jaffna')[0]), 'Jaffna, Northern, Sri Lanka');
  assert.equal(placeText(searchLocalPlaces('Jaffna')[0]), 'Jaffna, Sri Lanka');
  assert.equal(placeText(searchLocalPlaces('Madurai')[0]), 'Madurai');
});

test('gazetteer search: Tamil script finds places; labels in Tamil', () => {
  assert.equal(searchLocalPlaces('யாழ்ப்பாணம்')[0].name, 'Jaffna');
  assert.equal(searchLocalPlaces('கோலாலம்')[0].name, 'Kuala Lumpur');
  assert.equal(searchLocalPlaces('டொரன்டோ')[0].name, 'Toronto');
  assert.equal(searchLocalPlaces('சென்னை')[0].name, 'Chennai');
  assert.equal(placeLabel(searchLocalPlaces('Ipoh')[0], 'ta'), 'ஈப்போ, பேராக், மலேசியா');
  assert.equal(placeTa('Jaffna, Sri Lanka'), 'யாழ்ப்பாணம், இலங்கை');
  assert.equal(placeTa('Toronto, Canada'), 'டொரன்டோ, கனடா');
});

// ------------------------------------------------------------------ time zones
test('time zones: historical offsets through the IANA zone (DST, Sri Lanka 1996, Singapore 1975)', () => {
  const toronto = zonedToUtc('1985-07-01', '10:00', searchLocalPlaces('Toronto')[0].zone);
  assert.equal(toronto.utc.toISOString(), '1985-07-01T14:00:00.000Z'); // EDT, UTC−4
  assert.equal(zonedToUtc('1985-01-15', '10:00', 'America/Toronto').offsetMinutes, -300); // EST in winter
  assert.equal(zonedToUtc('1996-07-01', '10:00', searchLocalPlaces('Colombo')[0].zone).offsetMinutes, 390); // +6:30
  assert.equal(zonedToUtc('2001-03-01', '10:00', 'Asia/Colombo').offsetMinutes, 360); // +6:00
  assert.equal(zonedToUtc('2010-03-01', '10:00', 'Asia/Colombo').offsetMinutes, 330);
  assert.equal(zonedToUtc('1975-05-01', '10:00', searchLocalPlaces('Singapore')[0].zone).offsetMinutes, 450); // +7:30
  assert.equal(zonedToUtc('1975-05-01', '10:00', searchLocalPlaces('Kuala Lumpur')[0].zone).offsetMinutes, 450);
  assert.equal(zonedToUtc('1990-07-01', '10:00', searchLocalPlaces('London')[0].zone).offsetMinutes, 60); // BST
  assert.equal(offsetLabel(5.5), 'UTC+5:30');
  assert.equal(offsetLabel(-4), 'UTC−4');
});

test('time zones: a chart born in Toronto uses the zone (DST) — lagna differs from the old fixed −5 guess', () => {
  const p = searchLocalPlaces('Toronto')[0];
  const base = { date: '1985-07-01', time: '10:00:00', lat: p.lat, lon: p.lon };
  const zoned = birthChart({ ...base, zone: p.zone });
  assert.equal(zoned.zone, 'America/Toronto');
  assert.equal(zoned.tz, -4);
  const sameAsFixed = birthChart({ ...base, tz: -4 });
  assert.equal(zoned.lagna.rasi, sameAsFixed.lagna.rasi);
  assert.ok(Math.abs(zoned.lagna.longitude - sameAsFixed.lagna.longitude) < 1e-6);
  const jaffna = birthChart({ date: '1996-07-01', time: '10:00:00', lat: 9.66, lon: 80.01, zone: 'Asia/Colombo' });
  assert.equal(jaffna.tz, 6.5);
});

test('old profiles: the zone is attached quietly when the place matches the gazetteer', () => {
  assert.equal(attachZone({ place: 'Jaffna', lat: 9.66, lon: 80.02, tz: 5.5 }).zone, 'Asia/Colombo');
  assert.equal(attachZone({ place: 'Toronto, Canada', lat: 43.65, lon: -79.38, tz: -5 }).zone, 'America/Toronto');
  assert.equal(attachZone({ place: 'Chennai', lat: 13.08, lon: 80.27, tz: 5.5 }).zone, 'Asia/Kolkata');
  assert.equal(attachZone({ place: 'Madras', lat: 13.08, lon: 80.27, tz: 5.5 }).zone, 'Asia/Kolkata');
  assert.equal(attachZone({ place: 'My village', lat: 10, lon: 78, tz: 5.5 }).zone, undefined);
  assert.equal(attachZone({ place: 'London', lat: 13.08, lon: 80.27, tz: 5.5 }).zone, undefined, 'name matches but far away');
  assert.equal(attachZone({ place: 'Chennai', lat: 13.08, lon: 80.27, tz: 5.5, zone: 'Asia/Kolkata' }).zone, 'Asia/Kolkata');
});

test('online results: zone from the country, or the nearest city for multi-zone countries — never lon/15', () => {
  const nom = (cc, lat, lon, name, state) => ({ lat: String(lat), lon: String(lon), name, display_name: `${name}, ${state}`, address: { country_code: cc, state } });
  assert.equal(fromNominatim(nom('lk', 9.38, 80.40, 'Kilinochchi', 'Northern Province')).zone, 'Asia/Colombo');
  assert.equal(fromNominatim(nom('us', 29.56, -95.29, 'Pearland', 'Texas')).zone, 'America/Chicago');
  assert.equal(fromNominatim(nom('us', 37.37, -122.04, 'Sunnyvale', 'California')).zone, 'America/Los_Angeles');
  assert.equal(fromNominatim(nom('au', -31.95, 115.86, 'Perth', 'Western Australia')).zone, 'Australia/Perth');
  assert.equal(fromNominatim(nom('ca', 49.28, -123.12, 'Vancouver', 'British Columbia')).zone, 'America/Vancouver');
  assert.equal(fromNominatim(nom('in', 10.5, 76.2, 'Thrissur', 'Kerala')).zone, 'Asia/Kolkata');
  assert.equal(zoneFor('MU', -20.2, 57.5), 'Indian/Mauritius');
  for (const f of ['server/places.js', 'public/account.js', 'shared/places.js']) {
    assert.doesNotMatch(fs.readFileSync(path.join(root, f), 'utf8'), /lon\s*\/\s*15/, `${f} must not estimate zones from longitude`);
  }
  assert.equal(devicePlace('Asia/Colombo').name, 'Colombo');
  assert.equal(devicePlace('Asia/Kolkata').name, 'Chennai');
});

// ------------------------------------------------------------------ temples abroad
const ABROAD = {
  nallur: 'LK', koneswaram: 'LK', ketheeswaram: 'LK', munneswaram: 'LK', kataragama: 'LK', nainativu: 'LK',
  batu_caves: 'MY', kl_mahamariamman: 'MY', penang_waterfall: 'MY', sg_mariamman: 'SG', sg_srinivasa_perumal: 'SG', sg_thendayuthapani: 'SG',
  grand_bassin: 'MU', uk_balaji_tividale: 'GB', uk_highgate_murugan: 'GB', uk_ealing_kanaga_thurkkai: 'GB', us_pittsburgh_venkateswara: 'US',
  us_flushing_ganesha: 'US', us_malibu_venkateswara: 'US', ca_richmond_hill_ganesha: 'CA', au_helensburgh_venkateswara: 'AU',
  au_sydney_murugan: 'AU', za_durban_ambalavanar: 'ZA', ae_dubai_hindu_temple: 'AE',
};
test('temples abroad: present, in the right country, valid coordinates, no invented phone numbers', () => {
  for (const [id, cc] of Object.entries(ABROAD)) {
    const t = TEMPLES.find((x) => x.id === id);
    assert.ok(t, id);
    assert.equal(t.cc, cc, id);
    assert.ok(t.tags.includes('abroad'), id);
    const near = nearestPlace(t.lat, t.lon);
    assert.equal(near.cc, cc, `${id}: coordinates fall in ${near.cc} (${near.name}, ${Math.round(near.km)} km)`);
    assert.ok(near.km < 60, `${id}: ${Math.round(near.km)} km from the nearest town`);
    assert.ok(t.name.ta && t.deity.ta && t.note.ta, id);
    assert.ok(!('phone' in t), id);
  }
  assert.ok(TEMPLE_TAGS.some((t) => t.id === 'abroad'));
  assert.equal(new Set(TEMPLES.map((t) => t.id)).size, TEMPLES.length, 'unique ids');
  assert.ok(TEMPLES.filter((t) => !t.abroad).every((t) => t.cc === 'IN'));
  const i = templeInfo('nallur');
  assert.match(i.timings.en, /^—/, 'timings not invented');
  assert.match(i.airport.en, /JAF/);
});

test('temples near me and journeys work from any country', () => {
  assert.equal(templesNear(1.29, 103.85)[0].cc, 'SG');
  assert.equal(templesNear(1.29, 103.85)[0].mode, 'road');
  assert.equal(templesNear(51.507, -0.128)[0].cc, 'GB');
  const fromLondon = templesNear(51.507, -0.128);
  assert.equal(fromLondon.find((t) => t.id === 'madurai_meenakshi').mode, 'flight');
  assert.equal(templesNear(13.08, 80.27)[0].cc, 'IN');
  const colombo = planJourney({ start: { lat: 6.93, lon: 79.85, name: 'Colombo' }, days: 3, travellers: 2 });
  assert.equal(colombo.startCc, 'LK');
  for (const o of colombo.options) for (const t of o.temples) assert.equal(TEMPLES.find((x) => x.id === t.id).cc, 'LK', `${o.key}: ${t.id}`);
  const oslo = planJourney({ start: { lat: 59.91, lon: 10.75, name: 'Oslo' }, days: 2, travellers: 1 });
  assert.equal(oslo.flightFirst, true);
  assert.ok(oslo.options.every((o) => o.totalKm < 2000), 'road part only');
  const chennai = planJourney({ start: { lat: 13.08, lon: 80.27, name: 'Chennai' }, days: 2, travellers: 2 });
  assert.ok(chennai.options.every((o) => o.temples.every((t) => TEMPLES.find((x) => x.id === t.id).cc === 'IN')));
});

test('packages: every temple id resolves; far starts become flight + road', () => {
  for (const p of PACKAGES) for (const day of p.stops) for (const id of day) assert.ok(TEMPLES.some((t) => t.id === id), `${p.id}: ${id}`);
  const lanka = PACKAGES.find((p) => p.id === 'lanka_ishwaram');
  assert.ok(lanka);
  const fromLondon = packageRoute(lanka, { lat: 51.5, lon: -0.12 });
  assert.equal(fromLondon.flight, true);
  assert.ok(fromLondon.km < 1500 && fromLondon.flightKm > 8000);
  assert.equal(packageRoute(lanka, { lat: 6.93, lon: 79.85 }).flight, false);
});

// ------------------------------------------------------------------ currency
test('currency: rupee estimates also shown in the local currency (approximate); INR unchanged', () => {
  assert.equal(money(1200, 'INR'), '₹1,200');
  assert.match(money(1200, 'LKR'), /^≈ LKR\s?4,140 \(₹1,200\)$/);
  assert.match(money(5000, 'GBP'), /£44 \(₹5,000\)/);
  assert.equal(toInr(100, 'GBP'), 11400);
  assert.equal(toInr(100, 'INR'), 100);
  assert.equal(userCurrency('LK'), 'LKR');
  assert.equal(userCurrency('IN'), 'INR');
  assert.equal(userCurrency('AQ'), 'INR');
});
