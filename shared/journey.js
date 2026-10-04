// My Spiritual Journey — planning engine (runs on the phone; no server needed).
//
// Honesty rules built into the output:
//  • Traditional associations come from the in-app temple list and the Navagraha table. They are labelled
//    with their source and review status. Nothing here has been expert-reviewed yet (REVIEW below).
//  • Opening hours are compiled approximations, labelled UNVERIFIED with a link to the official source.
//  • Distances, travel times and costs are ESTIMATES from straight-line distance and the assumptions
//    in COST_ASSUMPTIONS — always shown next to the numbers.
//  • Accessibility is "not verified" for every temple until a verified source is added.
//  • Ranking uses only distance, preferences and chart associations. No payment or partner affects it.
import { TEMPLES, distanceKm } from './temples.js';
import { templeInfo } from './temple-info.js';
import { NAVAGRAHA } from './remedies.js';
import { verifiedField } from './temple-verified.js';

const B = (en, ta) => ({ en, ta });

/** Data review status — update when a reviewer verifies records (keep the date). */
export const REVIEW = {
  associations: { status: 'compiled', reviewedOn: null, source: B('In-app temple list and Navagraha sthalam tradition (compiled by the Thunai team; expert review pending)', 'செயலியின் கோவில் பட்டியல், நவகிரகத் தல மரபு (துணை குழு தொகுத்தது; நிபுணர் சரிபார்ப்பு நிலுவையில்)') },
  hours: { status: 'unverified', verifiedOn: null, source: B('Approximate timings compiled from common listings — confirm with the temple office or hrce.tn.gov.in before travelling', 'பொதுப் பட்டியல்களிலிருந்து தொகுத்த தோராய நேரம் — பயணத்திற்கு முன் கோவில் அலுவலகம் அல்லது hrce.tn.gov.in-ல் உறுதி செய்யவும்'), url: 'https://hrce.tn.gov.in/' },
  accessibility: { status: 'unverified', source: B('No verified accessibility information yet — please call the temple office', 'சரிபார்க்கப்பட்ட அணுகல் தகவல் இன்னும் இல்லை — கோவில் அலுவலகத்தை அழைக்கவும்') },
  bookingOperational: false,
};

/** Assumptions behind every cost estimate (INR, 2026). Shown to the user with the estimate. */
export const COST_ASSUMPTIONS = {
  roadFactor: 1.3,                                   // road km ≈ straight-line × 1.3
  speedKmh: { own_car: 45, taxi: 45, bus: 35, train: 50 },
  perKm: { own_car: 8, taxi: 14 },                  // per vehicle (fuel / taxi tariff incl. driver)
  perKmPerPerson: { bus: 1.3, train: 1.0 },         // ordinary bus / sleeper-class train
  lastMileTaxiPerDay: { bus: 400, train: 400 },     // autos/taxis between station and temples
  roomPerNight: { economy: 1200, standard: 2500, comfort: 4500 }, // one room ≈ 2–3 people
  foodPerPersonDay: { economy: 350, standard: 650, comfort: 1100 },
  offeringsPerPersonTemple: 50,                     // archanai ticket / small offering; free darshan always possible
};
export const PACE_HOURS = { relaxed: 3, moderate: 5, packed: 7 }; // max driving hours per day
export const TEMPLES_PER_DAY = { relaxed: 2, moderate: 3, packed: 4 };

const roadKm = (a, b) => distanceKm(a.lat, a.lon, b.lat, b.lon) * COST_ASSUMPTIONS.roadFactor;

/** Parse a free-text / voice request for days, budget, travellers and a start city name (to CONFIRM, never to trust). */
export function parseTripText(text) {
  const t = String(text || '').toLowerCase();
  const WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, ஒரு: 1, ஒன்று: 1, இரண்டு: 2, மூன்று: 3, நான்கு: 4, ஐந்து: 5, ஆறு: 6, ஏழு: 7 };
  const num = (s) => (/^\d+$/.test(s) ? Number(s) : WORDS[s]);
  const out = {};
  const d = /(\d+|one|two|three|four|five|six|seven|eight|ஒரு|ஒன்று|இரண்டு|மூன்று|நான்கு|ஐந்து|ஆறு|ஏழு)\s*(?:-|\s)?(?:days?|நாள்|நாட்கள்)/.exec(t);
  if (d) out.days = num(d[1]);
  const b = /(?:₹|rs\.?|inr|budget)\s*([\d,]+)\s*(k|thousand|ஆயிரம்)?|([\d,]+)\s*(k|thousand|ஆயிரம்|rupees|ரூபாய்)/.exec(t);
  if (b) { const n = Number((b[1] || b[3]).replace(/,/g, '')); const k = b[2] || b[4]; out.budget = /k|thousand|ஆயிரம்/.test(k || '') ? n * 1000 : n; }
  const p = /(\d+|two|three|four|five|six)\s*(?:people|persons|of us|members|பேர்)/.exec(t);
  if (p) out.travellers = num(p[1]);
  if (/next month|அடுத்த மாத/.test(t)) out.when = 'next_month';
  if (/next week|அடுத்த வார/.test(t)) out.when = 'next_week';
  const from = /from\s+([a-z\s]{3,30}?)(?:\s+(?:to|for|with|on|next|in)\b|[,.]|$)/.exec(t);
  if (from) out.fromText = from[1].trim();
  return out;
}

/** Relevance of a temple for this person: preference tags and chart associations. Returns { score, reasons[] }. */
function relevance(t, { prefs = [], planets = [] }) {
  let score = 0;
  const reasons = [];
  if (t.planet && planets.includes(t.planet)) {
    score += 3;
    reasons.push({ kind: 'chart', planet: t.planet, ...B(`Traditionally associated with ${t.planet}, which is relevant in your chart (${planets.indexOf(t.planet) === 0 ? 'current dasa lord' : 'needs care'})`, `உங்கள் ஜாதகத்தில் முக்கியமான ${NAVAGRAHA[t.planet] ? t.planet : ''} கிரகத்துடன் பாரம்பரியமாக இணைந்த தலம் (${planets.indexOf(t.planet) === 0 ? 'நடப்பு தசா நாதன்' : 'கவனம் தேவை'})`) });
  }
  const tagHit = prefs.filter((p) => t.tags.includes(p));
  if (tagHit.length) { score += 2; reasons.push({ kind: 'pref', ...B(`Matches your preference (${tagHit.join(', ')})`, `உங்கள் விருப்பத்துடன் பொருந்துகிறது (${tagHit.join(', ')})`) }); }
  if (!prefs.length && !t.planet) score += 0.5;
  return { score, reasons };
}

function hoursOf(t) {
  const v = verifiedField(t.id, 'hours');
  if (v) return { text: { en: v.en, ta: v.ta || v.en }, status: v.stale ? 'stale' : 'verified', verifiedOn: v.verifiedOn, source: v.source };
  const info = templeInfo(t.id);
  return info ? { text: info.timings, status: 'unverified' } : { text: B('Not available — please check with the temple', 'தகவல் இல்லை — கோவிலில் உறுதி செய்யவும்'), status: 'missing' };
}

/** Cost estimate for a plan. Returns { total, lines:[{en,ta,amount}], perPerson }. */
export function estimateCost({ km, days, nights, travellers, transport, tier, templeCount }) {
  const A = COST_ASSUMPTIONS;
  const lines = [];
  const rooms = Math.max(1, Math.ceil(travellers / 3));
  if (transport === 'own_car' || transport === 'taxi') {
    const vehicles = Math.max(1, Math.ceil(travellers / (transport === 'taxi' ? 4 : 5)));
    lines.push({ ...B(`${transport === 'taxi' ? 'Taxi' : 'Fuel (own car)'}: ~${Math.round(km)} km × ₹${A.perKm[transport]}/km${vehicles > 1 ? ` × ${vehicles} vehicles` : ''}`, `${transport === 'taxi' ? 'டாக்ஸி' : 'எரிபொருள் (சொந்த கார்)'}: ~${Math.round(km)} கி.மீ × ₹${A.perKm[transport]}/கி.மீ${vehicles > 1 ? ` × ${vehicles} வாகனம்` : ''}`), amount: km * A.perKm[transport] * vehicles });
  } else {
    lines.push({ ...B(`${transport === 'bus' ? 'Bus' : 'Train'} fares: ~${Math.round(km)} km × ₹${A.perKmPerPerson[transport]}/km × ${travellers}`, `${transport === 'bus' ? 'பேருந்து' : 'ரயில்'} கட்டணம்: ~${Math.round(km)} கி.மீ × ₹${A.perKmPerPerson[transport]}/கி.மீ × ${travellers}`), amount: km * A.perKmPerPerson[transport] * travellers });
    lines.push({ ...B(`Local autos/taxis: ₹${A.lastMileTaxiPerDay[transport]} × ${days} day(s)`, `உள்ளூர் ஆட்டோ/டாக்ஸி: ₹${A.lastMileTaxiPerDay[transport]} × ${days} நாள்`), amount: A.lastMileTaxiPerDay[transport] * days });
  }
  if (nights > 0) lines.push({ ...B(`Stay: ${rooms} room(s) × ${nights} night(s) × ₹${A.roomPerNight[tier]}`, `தங்குமிடம்: ${rooms} அறை × ${nights} இரவு × ₹${A.roomPerNight[tier]}`), amount: rooms * nights * A.roomPerNight[tier] });
  lines.push({ ...B(`Food: ${travellers} × ${days} day(s) × ₹${A.foodPerPersonDay[tier]}`, `உணவு: ${travellers} × ${days} நாள் × ₹${A.foodPerPersonDay[tier]}`), amount: travellers * days * A.foodPerPersonDay[tier] });
  lines.push({ ...B(`Small offerings (optional): ${travellers} × ${templeCount} temple(s) × ₹${A.offeringsPerPersonTemple}`, `சிறு காணிக்கை (விருப்பம்): ${travellers} × ${templeCount} கோவில் × ₹${A.offeringsPerPersonTemple}`), amount: travellers * templeCount * A.offeringsPerPersonTemple });
  const total = Math.round(lines.reduce((a, l) => a + l.amount, 0) / 100) * 100;
  lines.forEach((l) => { l.amount = Math.round(l.amount / 10) * 10; });
  return { total, perPerson: Math.round(total / travellers / 10) * 10, lines };
}

/** Greedy nearest-neighbour route through chosen temples, split into days by pace. */
function buildDays(start, temples, { days, pace, transport }) {
  const maxH = PACE_HOURS[pace] || 5;
  const perDay = TEMPLES_PER_DAY[pace] || 3;
  const speed = COST_ASSUMPTIONS.speedKmh[transport] || 45;
  const left = [...temples];
  const out = [];
  let here = start, totalKm = 0;
  for (let d = 0; d < days && left.length; d++) {
    const stops = [];
    let hours = 0;
    while (left.length && stops.length < perDay) {
      left.sort((a, b) => roadKm(here, a) - roadKm(here, b));
      const next = left[0];
      const km = roadKm(here, next);
      const h = km / speed;
      if (stops.length && hours + h > maxH) break;
      left.shift();
      stops.push({ temple: next, km, hours: h });
      hours += h; totalKm += km; here = next;
    }
    out.push({ day: d + 1, stops, driveHours: hours });
  }
  const back = roadKm(here, start);
  totalKm += back;
  if (out.length) out[out.length - 1].returnKm = back;
  if (out.length) out[out.length - 1].returnHours = back / speed;
  return { days: out, totalKm };
}

/**
 * Plan three alternatives.
 * @param {object} p
 *   start {lat, lon, name}, days (1–10), travellers (≥1), transport ('own_car'|'taxi'|'bus'|'train'),
 *   tier ('economy'|'standard'|'comfort'), budget (₹, optional), pace, prefs (tags), planets (chart planets, most relevant first),
 *   mobility ('none'|'limited'|'wheelchair')
 */
export function planJourney(p) {
  const days = Math.max(1, Math.min(10, Number(p.days) || 2));
  const travellers = Math.max(1, Number(p.travellers) || 1);
  const transport = p.transport || 'bus';
  const tier = p.tier || 'economy';
  const pace = p.mobility && p.mobility !== 'none' ? 'relaxed' : p.pace || 'moderate';
  const ctx = { prefs: p.prefs || [], planets: p.planets || [] };
  const scored = TEMPLES.map((t) => {
    const r = relevance(t, ctx);
    return { t, km: roadKm(p.start, t), ...r };
  });
  const make = (key, title, picked, d, extra = {}) => {
    const route = buildDays(p.start, picked.map((x) => x.t), { days: d, pace, transport });
    const nights = Math.max(0, route.days.length - 1);
    const cost = estimateCost({ km: route.totalKm, days: route.days.length || 1, nights, travellers, transport, tier, templeCount: picked.length });
    const why = [];
    picked.forEach((x) => x.reasons.forEach((r) => why.push({ temple: x.t.name, ...r })));
    return {
      key, title, ...extra,
      temples: picked.map((x) => ({
        id: x.t.id, name: x.t.name, deity: x.t.deity, town: x.t.town, planet: x.t.planet, tags: x.t.tags, note: x.t.note,
        km: x.km, hours: hoursOf(x.t), associationReview: verifiedField(x.t.id, 'association'), accessibilityInfo: verifiedField(x.t.id, 'accessibility'),
        association: verifiedField(x.t.id, 'association') ? { en: verifiedField(x.t.id, 'association').en, ta: verifiedField(x.t.id, 'association').ta || verifiedField(x.t.id, 'association').en } : x.t.planet ? B(`Navagraha sthalam for ${x.t.planet}; deity ${NAVAGRAHA[x.t.planet].deity.en}`, `${x.t.planet} நவகிரகத் தலம்; தெய்வம் ${NAVAGRAHA[x.t.planet].deity.ta}`) : x.t.deity,
        accessibility: verifiedField(x.t.id, 'accessibility') ? (verifiedField(x.t.id, 'accessibility').stale ? 'stale' : 'verified') : 'unverified', lat: x.t.lat, lon: x.t.lon,
      })),
      itinerary: route.days, totalKm: Math.round(route.totalKm), cost,
      overBudget: p.budget ? cost.total > p.budget : false,
      why,
    };
  };
  const rank = (arr) => arr.sort((a, b) => b.score - a.score || a.km - b.km);
  // A. Nearby and economical: within ~150 km road, at most 2 days, cheapest transport.
  const nearPool = rank(scored.filter((x) => x.km <= 150));
  const nearPick = (nearPool.length ? nearPool : rank([...scored].sort((a, b) => a.km - b.km).slice(0, 4))).slice(0, Math.min(4, TEMPLES_PER_DAY[pace] * Math.min(days, 2)));
  const A = make('A', B('Nearby and economical', 'அருகில், சிக்கனமாக'), nearPick, nearPick.length <= TEMPLES_PER_DAY[pace] ? 1 : Math.min(days, 2));
  // B. A journey matching the leave: wider radius by days and pace.
  const radius = Math.min(700, days * (PACE_HOURS[pace] * COST_ASSUMPTIONS.speedKmh[transport]) * 0.6);
  const widePool = rank(scored.filter((x) => x.km <= radius));
  const want = Math.min(widePool.length, days * TEMPLES_PER_DAY[pace]);
  // Prefer the relevant ones, then fill with temples near them (so the route stays compact).
  const core = widePool.filter((x) => x.score > 0).slice(0, Math.max(1, Math.ceil(want / 2)));
  const fill = widePool.filter((x) => !core.includes(x)).sort((a, b) => Math.min(...core.map((c) => roadKm(c.t, a.t))) - Math.min(...core.map((c) => roadKm(c.t, b.t))));
  const Bplan = make('B', B(`A ${days}-day journey matching your leave`, `உங்கள் விடுப்புக்கு ஏற்ற ${days} நாள் பயணம்`), [...core, ...fill].slice(0, want || 1), days);
  // C. Minimal travel: the nearest temple(s) within 30 km (or the single nearest), plus worship at home.
  const local = [...scored].sort((a, b) => a.km - b.km);
  const localPick = local.filter((x) => x.km <= 30).slice(0, 2);
  const C = make('C', B('Minimal travel or worship close to home', 'குறைந்த பயணம் அல்லது வீட்டருகே வழிபாடு'), localPick.length ? localPick : local.slice(0, 1), 1, { homeWorship: true });
  return { options: [A, Bplan, C], inputs: { ...p, days, travellers, transport, tier, pace }, review: REVIEW, assumptions: COST_ASSUMPTIONS };
}

/** Optional worship suggestions — free and simple first. */
export function worshipOptions(planet) {
  const n = planet && NAVAGRAHA[planet];
  return [
    B('Free: darshan, a quiet prayer and walking around the temple (pradakshinam).', 'இலவசம்: தரிசனம், அமைதியான பிரார்த்தனை, பிரதட்சணம்.'),
    B('Simple: light a ghee or sesame-oil lamp; offer flowers.', 'எளியது: நெய் / நல்லெண்ணெய் தீபம்; மலர் சமர்ப்பணம்.'),
    n ? B(`For ${planet}: ${n.free.en}`, `${planet} கிரகத்திற்கு: ${n.free.ta}`) : null,
    B('Optional paid archanai or abhishekam — book only at the temple counter or the official HR&CE site.', 'விருப்பக் கட்டண அர்ச்சனை / அபிஷேகம் — கோவில் கவுண்டரில் அல்லது அதிகாரப்பூர்வ HR&CE தளத்தில் மட்டும்.'),
  ].filter(Boolean);
}
