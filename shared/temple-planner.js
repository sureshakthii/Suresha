// Temple & leave planner (கோவில் பயணத் திட்டம்) — brief §9, the signature feature.
// "I have four days' leave next month. Suggest a temple trip suited to my interests and current dasa."
//
// Rules enforced here:
//  • Free / local prayer and charity come first, then a nearby low-cost option, then ranked trips, then paid packages.
//  • Planet → deity links are "traditional devotional associations" (status 'proposed', awaiting astrologer
//    approval). Never "this temple will solve your problem"; a pilgrimage is never necessary for protection.
//  • Practical data (hours, crowds, route, accommodation, accessibility, weather, booking) always carries its
//    source and a provenance record (`prov`, the shared model in journey.js: live / saved / estimated /
//    verified / check). Nothing is ever shown as booked.
//  • Ranking ignores sponsorship: a `sponsored` flag is reported but never changes the order.
import { TEMPLES, distanceKm, templeLinks } from './temples.js';
import { templeInfo } from './temple-info.js';
import { PACKAGES, packageRoute } from './packages.js';
import { assertNoProhibited } from './themes.js';
import { PLANETS } from './astro.js';
// One provenance model for the whole app (brief §9c): defined in journey.js, reused here — no second copy.
import { prov, templeFacts } from './journey.js';

const T = (en, ta) => ({ en, ta });
const DAY = 86400000;

export const PLANNER_VERSION = 'temple-planner-2026.10-v1';

/** Planet → deity/temple tags. Traditional devotional associations, pending astrologer approval. */
export const DEVOTIONAL_ASSOCIATIONS = {
  status: 'proposed',
  ruleVersion: 'devotional-assoc-0.1-proposed',
  byPlanet: {
    Sun: { tags: ['shiva'], deity: T('Lord Shiva / Surya', 'சிவன் / சூரியன்') },
    Moon: { tags: ['amman'], deity: T('Ambal', 'அம்பாள்') },
    Mars: { tags: ['murugan', 'arupadai'], deity: T('Lord Murugan', 'முருகன்') },
    Mercury: { tags: ['vishnu', 'divya_desam'], deity: T('Lord Perumal', 'பெருமாள்') },
    Jupiter: { tags: ['shiva'], deity: T('Lord Dakshinamurthy', 'தட்சிணாமூர்த்தி') },
    Venus: { tags: ['amman'], deity: T('Goddess Mahalakshmi / Amman', 'மகாலட்சுமி / அம்மன்') },
    Saturn: { tags: ['ayyappa', 'vishnu'], deity: T('Saneeswarar / Sastha', 'சனீஸ்வரர் / சாஸ்தா') },
    Rahu: { tags: ['amman'], deity: T('Goddess Durga', 'துர்க்கை') },
    Ketu: { tags: ['vinayagar'], deity: T('Lord Vinayagar', 'விநாயகர்') },
  },
};

const MODE_KMPH = { car: 45, taxi: 45, bus: 35, train: 50, two_wheeler: 35, flight: 120 };
const NEEDS_CHECKING = 'needs-checking';
/** Legacy status/lastVerified fields derived from the shared provenance record (kept for API stability). */
const legacy = (p) => ({
  prov: p,
  status: p.kind === 'verified' || p.kind === 'live' ? 'verified' : p.kind === 'estimated' ? 'estimated' : NEEDS_CHECKING,
  lastVerified: p.kind === 'verified' ? p.verifiedOn : p.kind === 'live' ? p.checkedAt : null,
});
const HRCE = { id: 'hrce_tn', url: 'https://hrce.tn.gov.in/', title: T('Tamil Nadu HR&CE / temple devasthanam (official)', 'தமிழ்நாடு இந்து சமய அறநிலையத் துறை / தேவஸ்தானம் (அதிகாரப்பூர்வம்)') };

const FRAMING = T(
  'Suggestions show a traditional devotional association only. A temple visit is a personal choice of faith — it is never required for protection and no trip is promised to solve a problem.',
  'பரிந்துரைகள் மரபு வழிபாட்டுத் தொடர்பை மட்டுமே காட்டுகின்றன. கோவில் பயணம் தனிப்பட்ட நம்பிக்கைத் தேர்வு — பாதுகாப்புக்குக் கட்டாயமில்லை; எந்தப் பயணமும் ஒரு பிரச்சினையைத் தீர்க்கும் என்று வாக்களிக்கப்படவில்லை.');

function tripDays({ dates, days }) {
  if (days) return Math.max(1, Math.round(days));
  if (dates?.start && dates?.end) return Math.max(1, Math.round((new Date(dates.end) - new Date(dates.start)) / DAY) + 1);
  return 2;
}

function budgetBand(budget) {
  if (!budget) return 'medium';
  if (typeof budget === 'string') return ['free', 'low', 'medium', 'high'].includes(budget) ? budget : 'medium';
  const amt = Number(budget.amount);
  return !Number.isFinite(amt) ? 'medium' : amt <= 0 ? 'free' : amt < 5000 ? 'low' : amt < 20000 ? 'medium' : 'high';
}

const distanceBand = (roadKm) => (roadKm < 60 ? 'local' : roadKm < 200 ? 'low' : roadKm < 450 ? 'medium' : 'high');
const BAND_ORDER = ['free', 'local', 'low', 'medium', 'high'];

function practical(t, { travelMode, oneWayHours, weather }) {
  const info = templeInfo(t.id);
  const links = templeLinks(t);
  const facts = templeFacts(t.id);
  const item = (value, source, p = prov('check', { source: source.title || source }), extra = {}) => ({ value, source, ...legacy(p), ...extra });
  const hoursSrc = facts.hours.prov.kind === 'verified' ? { id: 'temple_verified', title: facts.hours.prov.source } : { ...HRCE, note: T('Approximate; changes on festival days', 'தோராயமானது; திருவிழா நாட்களில் மாறும்') };
  return {
    hours: item(facts.hours.value || T('Opening hours not on file', 'திறப்பு நேரம் பதிவில் இல்லை'), hoursSrc, facts.hours.prov),
    crowds: item(info?.festival ? T(`Festival periods (expect crowds): ${info.festival.en}`, `திருவிழாக் காலம் (கூட்டம் இருக்கலாம்): ${info.festival.ta}`) : T('Festival calendar not on file', 'திருவிழா அட்டவணை பதிவில் இல்லை'), HRCE, prov('estimated')),
    route: item(T(`About ${Math.round(oneWayHours * 10) / 10} h each way by ${travelMode} (straight-line estimate)`, `ஒரு வழிக்குச் சுமார் ${Math.round(oneWayHours * 10) / 10} மணி நேரம் (தோராயக் கணக்கு)`), { id: 'estimate', title: T('Distance estimate (not live traffic)', 'தூர மதிப்பீடு (நேரலைப் போக்குவரத்து அல்ல)') }, prov('estimated'), { url: links.directions }),
    accommodation: item(T('Search stays near the temple', 'கோவில் அருகே தங்குமிடம் தேடுக'), { id: 'maps_search', title: T('Map search (unverified listings)', 'வரைபடத் தேடல் (சரிபார்க்கப்படாதவை)') }, undefined, { url: links.hotels }),
    accessibility: item(facts.accessibility.value || T('Steps, queues and wheelchair access not verified', 'படிகள், வரிசை, சக்கர நாற்காலி வசதி சரிபார்க்கப்படவில்லை'), HRCE, facts.accessibility.prov),
    weather: weather?.[t.id]?.checkedAt
      ? { value: weather[t.id].summary || null, source: { id: 'open_meteo_forecast', url: 'https://open-meteo.com/' }, ...legacy(prov('live', { checkedAt: new Date(weather[t.id].checkedAt).toISOString() })) }
      : item(T('Check the forecast close to the date', 'பயண நாளுக்கு அருகில் வானிலையைச் சரிபார்க்கவும்'), { id: 'open_meteo_forecast', url: 'https://open-meteo.com/' }),
    booking: { status: 'not-booked', confirmed: false, value: T('Nothing has been booked. Check darshan and stay availability with the official source.', 'எதுவும் முன்பதிவு செய்யப்படவில்லை. தரிசனம், தங்குமிடம் கிடைப்பதை அதிகாரப்பூர்வத் தளத்தில் சரிபார்க்கவும்.'), source: HRCE, lastVerified: null, prov: prov('check') },
  };
}

/**
 * Plan a temple trip.
 * input: {
 *   departure: { city?, lat, lon }, dates?: { start, end } | days?: number,
 *   budget?: 'free'|'low'|'medium'|'high' | { amount, currency }, travelMode?: 'car'|'bus'|'train'|'two_wheeler'|'flight',
 *   members?: [{ age? }] | number, accessibilityNeeds?: string[], preferences?: { tags?: string[], deities?: string[] },
 *   dasaLord?: planet name (optional; used only as a 'proposed' devotional association),
 *   sponsored?: { [templeOrPackageId]: true } (reported only — never changes ranking),
 *   weather?: { [templeId]: { summary, checkedAt } } (verified forecasts, optional), limit?: number
 * }
 */
export function planTempleTrip(input = {}) {
  const { departure, travelMode = 'car', accessibilityNeeds = [], preferences = {}, dasaLord = null, sponsored = {}, weather = null, limit = 5 } = input;
  if (!departure || !Number.isFinite(departure.lat) || !Number.isFinite(departure.lon)) throw new Error('departure { lat, lon } required');
  const days = tripDays(input);
  const band = budgetBand(input.budget);
  const kmph = MODE_KMPH[travelMode] || 45;
  const members = Array.isArray(input.members) ? input.members : Array.from({ length: Number(input.members) || 1 }, () => ({}));
  const needsGentle = accessibilityNeeds.length > 0 || members.some((m) => (m.age ?? 0) >= 70 || (m.age != null && m.age < 5));
  const hoursPerDay = needsGentle ? 6 : 8;
  const prefTags = new Set([...(preferences.tags || []), ...(preferences.deities || [])].map((x) => String(x).toLowerCase()));
  const assoc = dasaLord ? DEVOTIONAL_ASSOCIATIONS.byPlanet[dasaLord] || null : null;

  const candidates = TEMPLES.map((t) => {
    const km = distanceKm(departure.lat, departure.lon, t.lat, t.lon);
    const roadKm = km * 1.3;
    const oneWayHours = roadKm / kmph;
    const fits = 2 * oneWayHours + 3 <= days * hoursPerDay;
    const distBand = distanceBand(roadKm);
    const prefMatch = t.tags.filter((g) => prefTags.has(g));
    const assocMatch = assoc ? (assoc.tags.some((g) => t.tags.includes(g)) || t.planet === dasaLord) : false;
    // Score: practical fit first, then the user's own preferences, then (small) the proposed association.
    let score = 0;
    if (fits) score += 50;
    score -= Math.min(30, oneWayHours * (needsGentle ? 4 : 2.5));
    score += prefMatch.length * 12;
    if (assocMatch) score += 6;
    if (BAND_ORDER.indexOf(distBand) > BAND_ORDER.indexOf(band === 'free' ? 'local' : band) + 1) score -= 25;
    return { t, km, roadKm, oneWayHours, fits, distBand, prefMatch, assocMatch, score };
  });

  const option = (c, kind) => ({
    kind,
    temple: { id: c.t.id, name: c.t.name, deity: c.t.deity, town: c.t.town, tags: c.t.tags },
    km: Math.round(c.km), roadKm: Math.round(c.roadKm), oneWayHours: Math.round(c.oneWayHours * 10) / 10,
    fitsYourDays: c.fits,
    costBand: c.distBand,
    costBandNote: T('Rough distance-based band, not a price.', 'தூர அடிப்படையிலான தோராய வகை, விலை அல்ல.'),
    preferenceMatch: c.prefMatch,
    devotionalAssociation: c.assocMatch ? {
      status: DEVOTIONAL_ASSOCIATIONS.status, ruleVersion: DEVOTIONAL_ASSOCIATIONS.ruleVersion, planet: dasaLord,
      ...T(`Traditional devotional association: ${dasaLord} with ${assoc.deity.en}. Optional.`, `மரபு வழிபாட்டுத் தொடர்பு: ${PLANETS[dasaLord]?.ta || dasaLord} — ${assoc.deity.ta}. விருப்பத்திற்குரியது.`),
    } : null,
    practical: practical(c.t, { travelMode, oneWayHours: c.oneWayHours, weather }),
    sponsored: !!sponsored[c.t.id],
    rankingUsesSponsorship: false,
  });

  // Deterministic, sponsorship-blind ranking.
  const ranked = [...candidates].sort((a, b) => b.score - a.score || a.km - b.km || a.t.id.localeCompare(b.t.id));
  const nearest = [...candidates].sort((a, b) => a.km - b.km || a.t.id.localeCompare(b.t.id))[0];
  const trips = ranked.filter((c) => c.fits && c.t.id !== nearest.t.id).slice(0, limit).map((c) => option(c, 'trip'));

  const freeLocal = {
    kind: 'free_local', cost: 'free',
    title: T('Prayer at home or at your neighbourhood temple', 'வீட்டில் அல்லது அருகிலுள்ள கோவிலில் வழிபாடு'),
    items: [
      T('Light a lamp at home at a quiet time and say a prayer you know.', 'அமைதியான நேரத்தில் வீட்டில் தீபம் ஏற்றி, தெரிந்த ஒரு பிரார்த்தனையைச் சொல்லுங்கள்.'),
      T('Visit your neighbourhood temple — any temple you love is enough.', 'அருகிலுள்ள கோவிலுக்குச் செல்லுங்கள் — நீங்கள் விரும்பும் எந்தக் கோவிலும் போதும்.'),
      T('Share a meal or help someone in need (annadhanam) — free and meaningful.', 'தேவைப்படுபவருக்கு உணவளியுங்கள் அல்லது உதவுங்கள் (அன்னதானம்) — இலவசமானது, அர்த்தமுள்ளது.'),
      ...(assoc ? [T(`If you wish, a simple prayer to ${assoc.deity.en} at home (traditional association, optional).`, `விரும்பினால், வீட்டிலேயே ${assoc.deity.ta} வழிபாடு (மரபுத் தொடர்பு, விருப்பத்திற்குரியது).`)] : []),
    ],
  };

  const relevantPkg = PACKAGES.filter((p) => p.stops.flat().some((id) => trips.some((o) => o.temple.id === id) || TEMPLES.find((t) => t.id === id)?.tags.some((g) => prefTags.has(g))))
    .filter((p) => p.days <= days)
    .sort((a, b) => a.days - b.days || a.id.localeCompare(b.id));
  const packages = relevantPkg.map((p) => {
    const r = packageRoute(p, departure);
    // From abroad: the flight is an estimate only (typical duration, fare range) — never a booking or a quote.
    const flight = r.flights ? { from: r.flights.origin.code, to: r.flights.airport.code, approxHours: r.flights.out.hours, direct: r.flights.out.direct, timeDiffHours: r.flights.diffHours, fareInrPerPersonReturn: r.flights.farePerPerson, note: T('≈ typical flight time and fare range — check with the airline', '≈ வழக்கமான விமான நேரம், கட்டண வரம்பு — விமான நிறுவனத்திடம் உறுதி செய்யவும்'), booked: false } : null;
    return { kind: 'package', id: p.id, name: p.name, days: r.totalDays || p.days, flight, roadKm: Math.round(r.km), paid: true, priceShown: false, priceNote: T('Prices are quoted separately on request.', 'விலை கோரிக்கையின் பேரில் தனியாகத் தெரிவிக்கப்படும்.'), sponsored: !!sponsored[p.id], rankingUsesSponsorship: false, booking: { status: 'not-booked', confirmed: false } };
  });

  const plan = {
    plannerVersion: PLANNER_VERSION,
    request: { departure: { city: departure.city || null, lat: departure.lat, lon: departure.lon }, days, budgetBand: band, travelMode, members: members.length, accessibilityNeeds, preferences: [...prefTags], dasaLord },
    framing: FRAMING,
    // Order matters for the UI: free/local first, then nearby low-cost, then trips, then paid packages.
    freeLocal,
    nearbyLowCost: option(nearest, 'nearby_low_cost'),
    trips,
    packages,
    order: ['freeLocal', 'nearbyLowCost', 'trips', 'packages'],
    associationStatus: assoc ? { status: DEVOTIONAL_ASSOCIATIONS.status, planet: dasaLord, deity: assoc.deity } : null,
    kulaDeivamNote: T('Your family\'s own Kula Deivam is for your family to record and verify — it is never inferred from a chart.', 'உங்கள் குலதெய்வம் உங்கள் குடும்பம் பதிவுசெய்து உறுதிப்படுத்த வேண்டியது — ஜாதகத்திலிருந்து ஊகிக்கப்படுவதில்லை.'),
    accessibilityNote: needsGentle ? T('Gentler pace planned (shorter travel days). Please confirm steps, queues and wheelchair access with the temple before you go.', 'நிதானமான பயணம் திட்டமிடப்பட்டது. படிகள், வரிசை, சக்கர நாற்காலி வசதியைப் புறப்படும் முன் கோவிலிடம் உறுதிப்படுத்துங்கள்.') : null,
    practicalDataNote: T('Opening hours, crowds, routes, stays and weather change often — every item shows its source and needs checking unless marked verified.', 'திறப்பு நேரம், கூட்டம், வழி, தங்குமிடம், வானிலை அடிக்கடி மாறும் — ஒவ்வொன்றும் அதன் ஆதாரத்துடன்; சரிபார்க்கப்பட்டது எனக் குறிக்கப்படாதவற்றைச் சரிபார்க்கவும்.'),
  };
  return assertNoProhibited(plan);
}
