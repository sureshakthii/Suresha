// Residence vs birth place, temporary travelling location, and journeys / packages from abroad.
import test from 'node:test';
import assert from 'node:assert/strict';
import { birthChart } from '../shared/astro.js';
import { tamilDay } from '../shared/tamilcal.js';
import { devicePlace, searchLocalPlaces } from '../shared/places.js';
import {
  locFromPlace, activeLocation, travelExpired, zoneLabel, zoneDiffText, locName, zoneMismatch, countryOfLoc, isoPlusDays, inIndiaTime, zoneAbbr,
} from '../shared/residence.js';
import { planJourney, destinationCountry } from '../shared/journey.js';
import { PACKAGES, packageRoute } from '../shared/packages.js';
import { planFlights, nearestAirport, flightEstimate, fareRangeInr } from '../shared/airports.js';
import { moneyRange, toInr, currencyForCountry, BUDGET_CURRENCIES } from '../shared/currency.js';
import { planTempleTrip } from '../shared/temple-planner.js';

const NOON = new Date('2026-10-06T08:00:00Z');
// "HH:MM" wall clock of an instant at a fixed offset.
const wall = (d, tz) => new Date(new Date(d).getTime() + tz * 3600000).toISOString().slice(11, 16);
const mins = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };

const madurai = searchLocalPlaces('Madurai', 1)[0];
const dubai = locFromPlace(devicePlace('Asia/Dubai'));
const suresh = { id: 's', name: 'Suresh', date: '1982-05-10', time: '10:30:00', lat: madurai.lat, lon: madurai.lon, tz: 5.5, zone: 'Asia/Kolkata', place: 'Madurai' };

test('residence: the phone zone suggests the residence (Dubai phone → Dubai), labelled "Dubai time (GST, UTC+4)"', () => {
  assert.equal(dubai.name, 'Dubai, United Arab Emirates');
  assert.equal(dubai.cc, 'AE');
  assert.equal(dubai.zone, 'Asia/Dubai');
  assert.equal(dubai.tz, 4);
  assert.deepEqual(zoneLabel(dubai), { en: 'Dubai time (GST, UTC+4)', ta: 'துபாய் நேரம் (GST, UTC+4)' });
  assert.equal(zoneLabel(locFromPlace(madurai)).ta, 'இந்திய நேரம் (IST, UTC+5:30)');
  assert.equal(inIndiaTime(dubai), false);
  assert.equal(inIndiaTime(locFromPlace(madurai)), true);
  // India / unknown phones still start at Chennai.
  assert.equal(devicePlace('Asia/Kolkata').name, 'Chennai');
  // Daylight saving abbreviations follow the date.
  assert.equal(zoneAbbr('America/New_York', Date.parse('2026-01-15T12:00:00Z')), 'EST');
  assert.equal(zoneAbbr('America/New_York', Date.parse('2026-07-15T12:00:00Z')), 'EDT');
  // Old saved locations without a country get one from their coordinates / zone.
  assert.equal(countryOfLoc({ lat: 25.2, lon: 55.27, zone: 'Asia/Dubai', name: 'Dubai' }), 'AE');
});

test('residence vs birth: a Madurai-born person living in Dubai — chart uses the birth zone, Today uses Dubai', () => {
  const chartBefore = birthChart(suresh);
  // Daily features read the residence (Dubai): sunrise and Rahu Kalam are Dubai's, in Dubai local time.
  const here = activeLocation(dubai, null, NOON);
  assert.equal(here.zone, 'Asia/Dubai');
  const dxb = tamilDay(NOON, here.lat, here.lon, here.tz);
  const mdu = tamilDay(NOON, madurai.lat, madurai.lon, 5.5);
  const dxbRise = mins(wall(dxb.sunrise, 4));
  assert.ok(dxbRise > mins('06:00') && dxbRise < mins('06:30'), `Dubai sunrise ${wall(dxb.sunrise, 4)}`);
  assert.ok(Math.abs(new Date(dxb.sunrise) - new Date(mdu.sunrise)) > 60 * 60000, 'Dubai sunrise is a different instant from Madurai');
  // Tuesday: Rahu Kalam is the 7th eighth of the day — about 3:00–4:30 PM Dubai time.
  const rk = mins(wall(dxb.rahuKalam.start, 4));
  assert.ok(rk > mins('14:45') && rk < mins('15:30'), `Dubai Rahu Kalam ${wall(dxb.rahuKalam.start, 4)}`);
  // The janma chart is untouched by where the person lives.
  const chartAfter = birthChart(suresh);
  assert.equal(chartAfter.lagna.rasi, chartBefore.lagna.rasi);
  assert.equal(chartAfter.janmaNakshatra.index, chartBefore.janmaNakshatra.index);
  // (Had the residence zone leaked into the birth time, the lagna would move: 10:30 in Dubai ≠ 10:30 in Madurai.)
  assert.notEqual(birthChart({ ...suresh, zone: 'Asia/Dubai', tz: 4 }).lagna.longitude, chartBefore.lagna.longitude);
});

test('travelling location: used until its date (inclusive, local), then the residence returns', () => {
  const chennai = { ...locFromPlace(searchLocalPlaces('Chennai', 1)[0]), until: '2026-10-20' };
  assert.equal(travelExpired(chennai, new Date('2026-10-20T17:00:00Z')), false, '10:30 PM IST on the 20th — still travelling');
  assert.equal(travelExpired(chennai, new Date('2026-10-20T19:00:00Z')), true, '00:30 IST on the 21st — over');
  const during = activeLocation(dubai, chennai, new Date('2026-10-10T06:00:00Z'));
  assert.equal(during.temp, true);
  assert.equal(during.zone, 'Asia/Kolkata');
  const after = activeLocation(dubai, chennai, new Date('2026-10-22T06:00:00Z'));
  assert.equal(after.temp, false);
  assert.equal(after.zone, 'Asia/Dubai');
  assert.equal(activeLocation(dubai, null).zone, 'Asia/Dubai');
  assert.equal(isoPlusDays('Asia/Dubai', 14, new Date('2026-10-06T08:00:00Z')), '2026-10-20');
});

test('existing users: a gentle prompt only when the phone keeps a different clock from the saved place', () => {
  const chennai = locFromPlace(searchLocalPlaces('Chennai', 1)[0]);
  assert.equal(zoneMismatch(chennai, 'Asia/Dubai'), true);
  assert.equal(zoneMismatch(chennai, 'Asia/Kolkata'), false);
  assert.equal(zoneMismatch(chennai, 'Asia/Calcutta'), false);
  assert.equal(zoneMismatch(dubai, 'Asia/Muscat'), false, 'same offset — no prompt');
  assert.equal(zoneMismatch(dubai, 'not/a-zone'), false);
});

test('time difference sentence: "துபாய் நேரத்தை விட இந்திய நேரம் 1.5 மணி முன்னால்"', () => {
  const t = zoneDiffText(locName(dubai), locName({ cc: 'IN', name: 'Madurai' }), 1.5);
  assert.equal(t.ta, 'துபாய் நேரத்தை விட இந்திய நேரம் 1.5 மணி முன்னால்');
  assert.equal(t.en, 'India time is 1.5 h ahead of Dubai time');
  const back = zoneDiffText(locName({ cc: 'IN', name: 'Chennai' }), locName({ cc: 'US', name: 'New York City, United States' }), -9.5);
  assert.match(back.en, /New York City time is 9.5 h behind India time/);
});

test('journey Dubai → Palani & Madurai: international flight to IXM, time-difference, days include travel, AED budget', () => {
  const start = { lat: dubai.lat, lon: dubai.lon, name: dubai.name, cc: 'AE', zone: 'Asia/Dubai' };
  const budgetInr = toInr(6000, 'AED');
  const p = planJourney({ start, days: 5, travellers: 2, transport: 'flight', focus: ['palani', 'madurai_meenakshi'], picked: ['palani', 'madurai_meenakshi'], budget: budgetInr });
  assert.ok(p.flight, 'has a flight plan');
  assert.equal(p.flight.intl, true);
  assert.equal(p.flight.origin.code, 'DXB');
  assert.equal(p.flight.airport.code, 'IXM', 'nearest suitable airport to Palani + Madurai');
  assert.equal(p.flight.out.diffHours, 1.5);
  assert.equal(p.flight.out.depLocal, '9:00');
  assert.equal(p.flight.out.arrLocal, '15:00', '9 AM Dubai + ≈4.5 h + 1.5 h → 3 PM India time');
  assert.equal(p.flight.out.dayOffset, 0);
  assert.equal(p.flight.back.diffHours, -1.5);
  assert.ok(p.flight.out.hours >= 3.5 && p.flight.out.hours <= 5, `≈ ${p.flight.out.hours} h`);
  assert.equal(p.flight.totalDays, 5, 'the 5 days include both flight days');
  assert.equal(p.flight.outboundDays + p.flight.templeDays + 1, p.flight.totalDays);
  const a = p.options.find((o) => o.key === 'A');
  assert.ok(a.flight && a.temples.some((t) => t.id === 'palani') && a.temples.some((t) => t.id === 'madurai_meenakshi'));
  assert.ok(a.flightCost.low > 0 && a.flightCost.high > a.flightCost.low, 'fare is a range');
  assert.equal(a.totalRange.low, a.cost.total + a.flightCost.low);
  // Road legs are in India (taxi between temples), never "own car from Dubai".
  assert.equal(p.inputs.roadTransport, 'taxi');
  // Option C needs no flight: a temple near home in the UAE or worship at home.
  const c = p.options.find((o) => o.key === 'C');
  assert.ok(c.homeWorship && !c.flight);
  assert.ok(c.temples.every((t) => t.id.startsWith('ae_')), 'temple near home is in the UAE');
  // Budget in AED with rupees alongside.
  assert.equal(currencyForCountry('AE'), 'AED');
  assert.match(moneyRange(a.flightCost.low, a.flightCost.high, 'AED'), /^≈ AED\s?[\d,]+–[\d,]+ \(₹[\d,]+–[\d,]+\)$/);
  assert.ok(BUDGET_CURRENCIES.includes('AED') && BUDGET_CURRENCIES.includes('USD') && BUDGET_CURRENCIES[0] === 'INR');
});

test('journey from Dubai without chosen temples: India destination → Tamil Nadu temples with a flight', () => {
  const start = { lat: dubai.lat, lon: dubai.lon, name: dubai.name, cc: 'AE', zone: 'Asia/Dubai' };
  const p = planJourney({ start, days: 4, travellers: 2, transport: 'bus', destCc: 'IN', prefs: ['murugan'] });
  assert.ok(p.flight && ['IXM', 'TRZ', 'CJB', 'MAA', 'TCR', 'COK', 'TRV', 'BLR'].includes(p.flight.airport.code));
  for (const o of p.options.filter((x) => x.flight)) assert.ok(o.temples.length && o.temples.every((t) => !t.id.startsWith('ae_')));
  assert.equal(p.inputs.roadTransport, 'bus', 'bus between temples in India');
  // Chosen temples abroad decide the destination even without destCc.
  assert.equal(destinationCountry({ focus: ['palani'] }, 'AE'), 'IN');
  assert.equal(destinationCountry({ focus: [] }, 'LK'), 'LK');
});

test('journey from USA: long-haul with a connection, lands days later in India time', () => {
  const p = planJourney({ start: { lat: 40.71, lon: -74.0, name: 'New York City, United States', cc: 'US', zone: 'America/New_York' }, days: 9, travellers: 3, transport: 'taxi', destCc: 'IN' });
  assert.ok(p.flight);
  assert.equal(p.flight.out.direct, false);
  assert.ok(p.flight.out.dayOffset >= 1, 'arrives on a later calendar day');
  assert.equal(p.flight.outboundDays, 1 + p.flight.out.dayOffset);
  assert.equal(p.flight.totalDays, 9);
});

test('journey from Chennai: no flight leg, even when ✈️ is picked for nearby temples', () => {
  const chennai = { lat: 13.08, lon: 80.27, name: 'Chennai' };
  const p = planJourney({ start: chennai, days: 3, travellers: 2, transport: 'flight', focus: ['kanchi_kamakshi'] });
  assert.equal(p.flight, undefined);
  assert.equal(p.inputs.transport, 'taxi');
  assert.ok(p.options.every((o) => !o.flight && Number.isFinite(o.cost.total)));
  const bus = planJourney({ start: chennai, days: 2, travellers: 2, transport: 'bus' });
  assert.equal(bus.flight, undefined);
  // Delhi → Palani with ✈️: a domestic flight to the nearest airport.
  const delhi = planJourney({ start: { lat: 28.61, lon: 77.21, name: 'Delhi' }, days: 4, travellers: 2, transport: 'flight', focus: ['palani'] });
  assert.ok(delhi.flight && delhi.flight.intl === false && delhi.flight.out.diffHours === 0);
});

test('packages from abroad: flight to the nearest airport, time difference and a fare range; none from Chennai', () => {
  const aru = PACKAGES.find((p) => p.id === 'arupadai');
  const r = packageRoute(aru, { lat: dubai.lat, lon: dubai.lon, cc: 'AE', zone: 'Asia/Dubai' });
  assert.equal(r.flight, true);
  assert.equal(r.flights.origin.code, 'DXB');
  assert.equal(r.flights.airport.code, 'IXM');
  assert.equal(r.flights.diffHours, 1.5);
  assert.ok(r.totalDays >= aru.days + 2, 'flight days added');
  assert.ok(r.km < 2000, 'road part only');
  assert.equal(packageRoute(aru, { lat: 13.08, lon: 80.27 }).flights, null);
  const plan = planTempleTrip({ departure: { lat: dubai.lat, lon: dubai.lon, city: 'Dubai' }, days: 10, travelMode: 'flight', preferences: { tags: ['murugan'] } });
  const pk = plan.packages.find((x) => x.id === 'arupadai');
  if (pk) { assert.ok(pk.flight && pk.flight.booked === false && pk.flight.fareInrPerPersonReturn.low > 0); }
});

test('airports: suitable arrival airports and honest estimates', () => {
  assert.equal(nearestAirport(10.79, 79.14, { cc: 'IN', intl: true }).code, 'TRZ', 'Thanjavur → Tiruchi');
  assert.equal(nearestAirport(8.76, 78.13, { cc: 'IN' }).code, 'TCR', 'Thoothukudi domestic');
  assert.notEqual(nearestAirport(8.76, 78.13, { cc: 'IN', intl: true }).code, 'TCR', 'no international flights at TCR');
  const est = flightEstimate(nearestAirport(25.25, 55.36), nearestAirport(12.99, 80.17));
  assert.ok(est.direct && est.hours >= 3.5 && est.hours <= 5);
  const f = fareRangeInr(3000);
  assert.ok(f.low < f.high);
  assert.equal(planFlights({ lat: 13.08, lon: 80.27, cc: 'IN' }, { lat: 12.83, lon: 79.7 }, { destCc: 'IN' }), null, 'Chennai → Kanchipuram: no flight');
});
