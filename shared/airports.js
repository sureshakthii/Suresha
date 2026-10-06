// Airports for journeys from abroad (பயணம் — வெளிநாட்டிலிருந்து). Approximate coordinates; no schedules, no fares.
// `intl`: has regular international flights (so a family abroad can land there directly or with one connection).
// Flight times and fares built from this list are ESTIMATES, always labelled "≈" and "check the airline".
import { distanceKm } from './temples.js';
import { nearestPlace, zoneOffsetHours } from './places.js';

// [code, city, cc, lat, lon, intl]
const ROWS = [
  // South India — arrival airports for temple trips
  ['MAA', 'Chennai', 'IN', 12.994, 80.171, 1], ['IXM', 'Madurai', 'IN', 9.834, 78.093, 1], ['TRZ', 'Tiruchirappalli', 'IN', 10.765, 78.71, 1],
  ['CJB', 'Coimbatore', 'IN', 11.03, 77.043, 1], ['TCR', 'Thoothukudi', 'IN', 8.724, 78.026, 0], ['COK', 'Kochi', 'IN', 10.152, 76.402, 1],
  ['TRV', 'Thiruvananthapuram', 'IN', 8.482, 76.92, 1], ['BLR', 'Bengaluru', 'IN', 13.199, 77.706, 1], ['TIR', 'Tirupati', 'IN', 13.632, 79.543, 0],
  ['PNY', 'Puducherry', 'IN', 11.968, 79.812, 0], ['SXV', 'Salem', 'IN', 11.783, 78.065, 0], ['IXE', 'Mangaluru', 'IN', 12.961, 74.89, 1],
  ['CCJ', 'Kozhikode', 'IN', 11.137, 75.955, 1], ['HYD', 'Hyderabad', 'IN', 17.24, 78.429, 1], ['DEL', 'Delhi', 'IN', 28.556, 77.1, 1],
  ['BOM', 'Mumbai', 'IN', 19.089, 72.868, 1], ['CCU', 'Kolkata', 'IN', 22.654, 88.447, 1], ['AMD', 'Ahmedabad', 'IN', 23.077, 72.635, 1],
  ['PNQ', 'Pune', 'IN', 18.582, 73.92, 1], ['GOI', 'Goa', 'IN', 15.381, 73.831, 1], ['VTZ', 'Visakhapatnam', 'IN', 17.721, 83.224, 0],
  // Sri Lanka, Malaysia, Singapore
  ['CMB', 'Colombo', 'LK', 7.181, 79.884, 1], ['JAF', 'Jaffna', 'LK', 9.792, 80.07, 1], ['KUL', 'Kuala Lumpur', 'MY', 2.745, 101.71, 1],
  ['PEN', 'Penang', 'MY', 5.297, 100.277, 1], ['SIN', 'Singapore', 'SG', 1.364, 103.991, 1],
  // Gulf
  ['DXB', 'Dubai', 'AE', 25.253, 55.366, 1], ['AUH', 'Abu Dhabi', 'AE', 24.433, 54.651, 1], ['SHJ', 'Sharjah', 'AE', 25.329, 55.517, 1],
  ['DOH', 'Doha', 'QA', 25.273, 51.608, 1], ['MCT', 'Muscat', 'OM', 23.593, 58.284, 1], ['SLL', 'Salalah', 'OM', 17.039, 54.091, 1],
  ['BAH', 'Bahrain', 'BH', 26.271, 50.634, 1], ['KWI', 'Kuwait', 'KW', 29.227, 47.969, 1], ['RUH', 'Riyadh', 'SA', 24.958, 46.699, 1],
  ['JED', 'Jeddah', 'SA', 21.68, 39.157, 1], ['DMM', 'Dammam', 'SA', 26.471, 49.798, 1],
  // Europe
  ['LHR', 'London', 'GB', 51.47, -0.454, 1], ['MAN', 'Manchester', 'GB', 53.354, -2.275, 1], ['BHX', 'Birmingham', 'GB', 52.452, -1.743, 1],
  ['DUB', 'Dublin', 'IE', 53.421, -6.27, 1], ['CDG', 'Paris', 'FR', 49.01, 2.548, 1], ['FRA', 'Frankfurt', 'DE', 50.037, 8.562, 1],
  ['MUC', 'Munich', 'DE', 48.354, 11.786, 1], ['AMS', 'Amsterdam', 'NL', 52.31, 4.768, 1], ['BRU', 'Brussels', 'BE', 50.901, 4.484, 1],
  ['ZRH', 'Zurich', 'CH', 47.458, 8.548, 1], ['GVA', 'Geneva', 'CH', 46.238, 6.109, 1], ['FCO', 'Rome', 'IT', 41.8, 12.239, 1],
  ['MXP', 'Milan', 'IT', 45.63, 8.723, 1], ['OSL', 'Oslo', 'NO', 60.194, 11.1, 1], ['ARN', 'Stockholm', 'SE', 59.65, 17.919, 1],
  ['CPH', 'Copenhagen', 'DK', 55.618, 12.656, 1], ['HEL', 'Helsinki', 'FI', 60.317, 24.963, 1], ['VIE', 'Vienna', 'AT', 48.11, 16.57, 1],
  // Americas
  ['JFK', 'New York', 'US', 40.641, -73.778, 1], ['EWR', 'Newark', 'US', 40.69, -74.174, 1], ['IAD', 'Washington', 'US', 38.953, -77.456, 1],
  ['BOS', 'Boston', 'US', 42.366, -71.01, 1], ['ORD', 'Chicago', 'US', 41.974, -87.907, 1], ['DFW', 'Dallas', 'US', 32.899, -97.04, 1],
  ['IAH', 'Houston', 'US', 29.99, -95.337, 1], ['ATL', 'Atlanta', 'US', 33.64, -84.427, 1], ['SFO', 'San Francisco', 'US', 37.621, -122.379, 1],
  ['LAX', 'Los Angeles', 'US', 33.942, -118.408, 1], ['SEA', 'Seattle', 'US', 47.45, -122.309, 1], ['PHX', 'Phoenix', 'US', 33.434, -112.012, 1],
  ['DEN', 'Denver', 'US', 39.856, -104.674, 1], ['CLT', 'Charlotte', 'US', 35.214, -80.947, 1], ['MSP', 'Minneapolis', 'US', 44.885, -93.222, 1],
  ['DTW', 'Detroit', 'US', 42.212, -83.353, 1], ['PHL', 'Philadelphia', 'US', 39.874, -75.243, 1], ['MIA', 'Miami', 'US', 25.795, -80.287, 1],
  ['RDU', 'Raleigh', 'US', 35.878, -78.787, 1], ['AUS', 'Austin', 'US', 30.197, -97.666, 1],
  ['YYZ', 'Toronto', 'CA', 43.678, -79.625, 1], ['YVR', 'Vancouver', 'CA', 49.195, -123.178, 1], ['YUL', 'Montreal', 'CA', 45.47, -73.741, 1],
  ['YYC', 'Calgary', 'CA', 51.131, -114.011, 1], ['YEG', 'Edmonton', 'CA', 53.31, -113.58, 1],
  ['POS', 'Port of Spain', 'TT', 10.595, -61.337, 1], ['GEO', 'Georgetown', 'GY', 6.499, -58.254, 1],
  // Africa, Indian Ocean, Asia-Pacific
  ['JNB', 'Johannesburg', 'ZA', -26.134, 28.242, 1], ['DUR', 'Durban', 'ZA', -29.614, 31.119, 1], ['CPT', 'Cape Town', 'ZA', -33.965, 18.602, 1],
  ['NBO', 'Nairobi', 'KE', -1.319, 36.928, 1], ['MRU', 'Mauritius', 'MU', -20.43, 57.683, 1], ['RUN', 'Réunion', 'RE', -20.887, 55.51, 1],
  ['SEZ', 'Seychelles', 'SC', -4.674, 55.522, 1], ['MLE', 'Malé', 'MV', 4.191, 73.529, 1],
  ['BKK', 'Bangkok', 'TH', 13.69, 100.75, 1], ['RGN', 'Yangon', 'MM', 16.907, 96.133, 1], ['CGK', 'Jakarta', 'ID', -6.126, 106.656, 1],
  ['MNL', 'Manila', 'PH', 14.509, 121.02, 1], ['HKG', 'Hong Kong', 'HK', 22.308, 113.918, 1], ['NRT', 'Tokyo', 'JP', 35.772, 140.393, 1],
  ['ICN', 'Seoul', 'KR', 37.46, 126.44, 1], ['DAC', 'Dhaka', 'BD', 23.843, 90.398, 1], ['KTM', 'Kathmandu', 'NP', 27.697, 85.359, 1],
  ['SYD', 'Sydney', 'AU', -33.94, 151.175, 1], ['MEL', 'Melbourne', 'AU', -37.669, 144.841, 1], ['BNE', 'Brisbane', 'AU', -27.384, 153.117, 1],
  ['PER', 'Perth', 'AU', -31.94, 115.967, 1], ['ADL', 'Adelaide', 'AU', -34.945, 138.531, 1], ['AKL', 'Auckland', 'NZ', -37.008, 174.792, 1],
  ['NAN', 'Nadi', 'FJ', -17.755, 177.443, 1],
];

export const AIRPORTS = ROWS.map(([code, city, cc, lat, lon, intl]) => ({ code, city, cc, lat, lon, intl: !!intl }));
export const airportByCode = (code) => AIRPORTS.find((a) => a.code === code) || null;

/** Nearest airport to a point. Options: cc (same country), intl (international airports only). */
export function nearestAirport(lat, lon, { cc = null, intl = false, exclude = [] } = {}) {
  let best = null, bestKm = Infinity;
  for (const a of AIRPORTS) {
    if ((cc && a.cc !== cc) || (intl && !a.intl) || exclude.includes(a.code)) continue;
    const d = distanceKm(lat, lon, a.lat, a.lon);
    if (d < bestKm) { best = a; bestKm = d; }
  }
  return best ? { ...best, km: bestKm } : null;
}

/** Airports within `km` of a point, nearest first. */
export function airportsNear(lat, lon, { cc = null, intl = false, km = 250 } = {}) {
  return AIRPORTS.filter((a) => (!cc || a.cc === cc) && (!intl || a.intl))
    .map((a) => ({ ...a, km: distanceKm(lat, lon, a.lat, a.lon) })).filter((a) => a.km <= km).sort((a, b) => a.km - b.km);
}

// Gulf / South-East Asian hubs with frequent direct flights to South Indian airports.
const DIRECT_HUBS = new Set(['DXB', 'AUH', 'SHJ', 'DOH', 'MCT', 'BAH', 'KWI', 'RUH', 'JED', 'DMM', 'SIN', 'KUL', 'CMB', 'BKK', 'MLE', 'SLL', 'PEN', 'JAF']);
const MAJOR_IN = new Set(['MAA', 'BLR', 'COK', 'TRV', 'HYD', 'DEL', 'BOM', 'CCU']);

/**
 * Typical flight estimate between two airports: great-circle km, flying hours (≈ km / 780 + 0.6 h taxi and climb),
 * and whether a connection is usual (adds ≈ 3 h). Never a schedule — label every number "≈".
 */
export function flightEstimate(from, to) {
  const km = distanceKm(from.lat, from.lon, to.lat, to.lon);
  const flying = km / 780 + 0.6;
  const domestic = from.cc === to.cc;
  const direct = domestic ? km < 2200 || (MAJOR_IN.has(from.code) && MAJOR_IN.has(to.code))
    : (DIRECT_HUBS.has(from.code) || DIRECT_HUBS.has(to.code)) ? km < 5000 && (MAJOR_IN.has(to.code) || MAJOR_IN.has(from.code) || ['IXM', 'TRZ', 'CJB', 'CCJ', 'IXE', 'JAF', 'CMB', 'SIN', 'KUL', 'PEN'].includes(to.code) || ['IXM', 'TRZ', 'CJB', 'CCJ', 'IXE'].includes(from.code))
      : km < 3000;
  const hours = Math.round((flying + (direct ? 0 : 3)) * 2) / 2;
  return { km: Math.round(km), flyingHours: Math.round(flying * 2) / 2, hours, direct, domestic };
}

/**
 * Approximate RETURN economy fare per person in rupees, as a wide range (2026 guidance). Not a quote:
 * shown only as "≈ … (check airline)". Domestic and international bands differ.
 */
export function fareRangeInr(km, { domestic = false } = {}) {
  const r = (n) => Math.round(n / 1000) * 1000;
  if (domestic) return { low: r(3000 + km * 3), high: r(6000 + km * 8) };
  return { low: r(6000 + km * 6), high: r(12000 + km * 14) };
}

const hm = (min) => { const m = ((Math.round(min) % 1440) + 1440) % 1440; return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`; };
const zoneAt = (lat, lon, cc) => nearestPlace(lat, lon, cc ? { cc } : {})?.zone || null;

/**
 * One flight leg in local clock times: leave at a typical hour (`depLocal`, default 9 AM, or 10 PM for long-haul)
 * and land at departure + flight time + the time-zone difference (dayOffset = calendar days later).
 */
export function flightLeg(from, to, fromZone, toZone, { depLocal = null } = {}) {
  const est = flightEstimate(from, to);
  const diff = fromZone && toZone ? Math.round(((zoneOffsetHours(toZone) ?? 0) - (zoneOffsetHours(fromZone) ?? 0)) * 4) / 4 : 0;
  const dep = depLocal || (est.hours > 8 ? '22:00' : '9:00');
  const [h, m] = dep.split(':').map(Number);
  const depMin = h * 60 + m;
  const arrMin = depMin + est.hours * 60 + diff * 60;
  return {
    from: { code: from.code, city: from.city, cc: from.cc }, to: { code: to.code, city: to.city, cc: to.cc },
    km: est.km, hours: est.hours, flyingHours: est.flyingHours, direct: est.direct, domestic: est.domestic,
    depLocal: hm(depMin), arrLocal: hm(arrMin), dayOffset: Math.floor(arrMin / 1440), fromZone, toZone, diffHours: diff,
  };
}

/**
 * Flights for a trip from `start` ({lat, lon, cc?, zone?}) to temples around `target` ({lat, lon}) in `destCc`:
 * departure airport near home, the nearest suitable arrival airport (international when crossing a border),
 * both legs with local times, and a per-person return fare RANGE in rupees. Null when no flight makes sense.
 */
export function planFlights(start, target, { startCc = start.cc || null, destCc, minKm = 450 } = {}) {
  const intl = !!startCc && startCc !== destCc;
  const arr = nearestAirport(target.lat, target.lon, { cc: destCc, intl }) || nearestAirport(target.lat, target.lon, { cc: destCc });
  const homeCc = startCc && nearestAirport(start.lat, start.lon, { cc: startCc }) ? startCc : null;
  const dep = nearestAirport(start.lat, start.lon, { intl, cc: homeCc }) || nearestAirport(start.lat, start.lon, {});
  if (!arr || !dep || dep.code === arr.code) return null;
  if (!intl && distanceKm(start.lat, start.lon, arr.lat, arr.lon) < minKm) return null;
  const fromZone = start.zone || zoneAt(start.lat, start.lon, startCc);
  const toZone = zoneAt(arr.lat, arr.lon, destCc);
  const out = flightLeg(dep, arr, fromZone, toZone);
  const back = flightLeg(arr, dep, toZone, fromZone, { depLocal: out.hours > 8 ? '23:00' : '10:00' });
  const fare = fareRangeInr(out.km, { domestic: !intl });
  return {
    intl, origin: dep, airport: arr, out, back, diffHours: out.diffHours, fromZone, toZone,
    alternatives: airportsNear(target.lat, target.lon, { cc: destCc, km: 250 }).filter((a) => a.code !== arr.code).slice(0, 3).map((a) => ({ code: a.code, city: a.city, intl: a.intl })),
    farePerPerson: fare,
  };
}
