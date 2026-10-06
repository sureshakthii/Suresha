// Detailed Jathaga analysis: 12 bhavas, yogas, transits (Ezharai / Ashtama Sani, Guru Balam),
// dasa outlook and life-area scores. Rule-based and explainable; written to encourage, not frighten.
// Yogas and house-lord roles come from the versioned rule registry in shared/rules/ (the authority);
// this module only formats them. Planet scores are a custom "Traditional strength index", not Shadbala.
import { planetPositions, RASIS, PLANETS } from './astro.js';
import { grahaStrength } from './remedies.js';
import { evaluateRules, resolveProfile } from './rules/registry.js';
import { houseRoles as computeHouseRoles } from './rules/roles.js';
import { capDate, minCap } from './lifespan-cap.js';

const KENDRA = [1, 4, 7, 10];
const TRIKONA = [1, 5, 9];
const DUSTHANA = [6, 8, 12];
const BENEFICS = ['Jupiter', 'Venus', 'Mercury'];
const MALEFICS = ['Saturn', 'Mars', 'Rahu', 'Ketu', 'Sun'];
const OWN = { Sun: [4], Moon: [3], Mars: [0, 7], Mercury: [2, 5], Jupiter: [8, 11], Venus: [1, 6], Saturn: [9, 10] };
// Special aspects (in addition to the 7th) counted as houses from the planet.
const ASPECTS = { Mars: [4, 7, 8], Jupiter: [5, 7, 9], Saturn: [3, 7, 10], Rahu: [5, 7, 9], Ketu: [5, 7, 9] };

export const BHAVAS = [
  { en: 'Self, health, personality', ta: 'சுயம், ஆரோக்கியம், தோற்றம்' },
  { en: 'Wealth, family, speech', ta: 'செல்வம், குடும்பம், வாக்கு' },
  { en: 'Courage, siblings, efforts', ta: 'தைரியம், உடன்பிறப்பு, முயற்சி' },
  { en: 'Mother, home, vehicles, peace of mind', ta: 'தாய், வீடு, வாகனம், மன அமைதி' },
  { en: 'Children, intelligence, past merit', ta: 'குழந்தைகள், அறிவு, பூர்வ புண்ணியம்' },
  { en: 'Health issues, debts, competition', ta: 'நோய், கடன், போட்டி' },
  { en: 'Spouse, partnerships, business', ta: 'வாழ்க்கைத் துணை, கூட்டாளி, வியாபாரம்' },
  { en: 'Transformation, sudden events, research', ta: 'மாற்றம், திடீர் நிகழ்வு, ஆராய்ச்சி' },
  { en: 'Fortune, father, dharma, travel', ta: 'பாக்கியம், தந்தை, தர்மம், யாத்திரை' },
  { en: 'Career, status, karma', ta: 'தொழில், அந்தஸ்து, கர்மம்' },
  { en: 'Gains, income, friends', ta: 'லாபம், வருமானம், நண்பர்கள்' },
  { en: 'Expenses, foreign lands, moksha', ta: 'செலவு, வெளிநாடு, மோட்சம்' },
];

const houseOf = (lagnaRasi, rasi) => ((rasi - lagnaRasi + 12) % 12) + 1;
const lordOfHouse = (lagnaRasi, h) => RASIS[(lagnaRasi + h - 1) % 12].lord;
const housesRuled = (lagnaRasi, planet) => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter((h) => lordOfHouse(lagnaRasi, h) === planet);

/** Planets aspecting a given house (Vedic full aspects). */
function aspectsOn(planets, lagnaRasi, house) {
  const out = [];
  for (const [k, p] of Object.entries(planets)) {
    if (k === 'Lagna') continue;
    const from = houseOf(lagnaRasi, p.rasi);
    const offsets = ASPECTS[k] || [7];
    for (const o of offsets) if (((from - 1 + o - 1) % 12) + 1 === house) out.push(k);
  }
  return out;
}

/** The 12 bhavas with occupants, lord placement, aspects and a strength score. */
export function bhavaAnalysis(chart) {
  const P = chart.planets;
  if (!P.Lagna) return []; // unknown birth time: houses are not calculated (chart.availability.houses === false)
  const L = P.Lagna.rasi;
  const strength = Object.fromEntries(grahaStrength(P).map((g) => [g.planet, g.score]));
  return BHAVAS.map((b, i) => {
    const h = i + 1;
    const rasi = (L + i) % 12;
    const lord = RASIS[rasi].lord;
    const lordHouse = houseOf(L, P[lord].rasi);
    const occupants = Object.keys(P).filter((k) => k !== 'Lagna' && P[k].rasi === rasi);
    const aspects = aspectsOn(P, L, h);
    let score = 50;
    const notes = [];
    if (KENDRA.includes(lordHouse) || TRIKONA.includes(lordHouse)) { score += 12; notes.push({ en: `Lord ${lord} is well placed in house ${lordHouse}`, ta: `அதிபதி ${PLANETS[lord].ta} ${lordHouse}-ல் நல்ல இடத்தில்` }); }
    if (DUSTHANA.includes(lordHouse) && !DUSTHANA.includes(h)) { score -= 10; notes.push({ en: `Lord ${lord} sits in house ${lordHouse}`, ta: `அதிபதி ${PLANETS[lord].ta} ${lordHouse}-ல்` }); }
    score += Math.round((strength[lord] - 55) / 3);
    for (const o of occupants) {
      if (BENEFICS.includes(o) || (o === 'Moon')) score += 6;
      else if (MALEFICS.includes(o) && !([3, 6, 10, 11].includes(h))) score -= 5;
      else if (MALEFICS.includes(o)) score += 4; // malefics do well in upachaya houses
    }
    for (const a of aspects) {
      if (a === 'Jupiter') { score += 7; notes.push({ en: 'Blessed by Jupiter\'s aspect', ta: 'குருவின் பார்வை உண்டு' }); } else if (BENEFICS.includes(a)) score += 3;
      else if (a === 'Saturn' && !([3, 6, 10, 11].includes(h))) score -= 3;
    }
    score = Math.max(15, Math.min(95, score));
    return { house: h, rasi, rasiName: RASIS[rasi], lord, lordHouse, occupants, aspects, score, area: b, notes };
  });
}

/** Visible label for the custom 0–100 planet score (it is not Shadbala and not a probability). */
export const STRENGTH_INDEX_LABEL = { en: 'Traditional strength index', ta: 'பாரம்பரிய பலக் குறியீடு' };

const lcFirst = (x) => (/^[A-Z]/.test(x) && !/^(Moon|Sun|Mars|Mercury|Jupiter|Venus|Saturn|Rahu|Ketu|Lagna|Guru|Sani)\b/.test(x) ? x[0].toLowerCase() + x.slice(1) : x);
/**
 * A crisp, personal reading of a registry explanation ("In your chart, … — this supports …" /
 * "உங்கள் ஜாதகத்தில் … — இது … தரும் அமைப்பு."). The registry text stays the authority; this only rephrases it.
 */
export function personalReading(d) {
  const en0 = String(d?.en || '').trim(), ta0 = String(d?.ta || '').trim();
  let en = en0, ta = ta0;
  const me = en0.match(/^(.*?):\s*traditionally (?:linked|associated) with\s+(.*?)\.?$/i);
  if (me) en = `In your chart, ${lcFirst(me[1])} — this supports ${me[2]}.`;
  else if (en0 && !/^(in )?your\b/i.test(en0)) en = `In your chart, ${lcFirst(en0)}`;
  const mt = ta0.match(/^(.*?):\s*(.*?)\s*—\s*பாரம்பரியக் கருத்து\.?$/);
  if (mt) ta = `உங்கள் ஜாதகத்தில் ${mt[1]} — இது ${mt[2]} தரும் அமைப்பு.`;
  else if (ta0 && !ta0.startsWith('உங்கள்')) ta = `உங்கள் ஜாதகத்தில் ${ta0}`;
  return { en, ta };
}

/** Legacy-compatible view of one registry evaluation (id/name/desc/kind kept for the existing UI). */
function yogaView(r) {
  let desc = r.explanation;
  // Name the planet where the registry text says "this planet" (e.g. the Yogakaraka) — crisper and personal.
  const k = r.data?.planet && PLANETS[r.data.planet] ? r.data.planet : null;
  const named = k ? { en: r.explanation.en.replace(/\bThis planet\b/, k).replace(/\bthis planet\b/, k), ta: r.explanation.ta.replace('இந்தக் கிரகம்', PLANETS[k].ta) } : r.explanation;
  let reading = personalReading(named);
  const sat = r.cancellation?.conditions?.filter((c) => c.satisfied) || [];
  if (sat.length) {
    desc = {
      en: `${desc.en} Traditional cancellation also present: ${sat.map((c) => c.text.en).join('; ')}.`,
      ta: `${desc.ta} பாரம்பரிய நிவர்த்தியும் உண்டு: ${sat.map((c) => c.text.ta).join('; ')}.`,
    };
    reading = { en: `${reading.en} Also present: ${sat.map((c) => c.text.en).join('; ')}.`, ta: `${reading.ta} உடன் உள்ளது: ${sat.map((c) => c.text.ta).join('; ')}.` };
  }
  return {
    id: r.legacyId, name: r.title, desc, reading, kind: r.tone,
    rule: r.ruleId, version: r.version, status: r.status, profile: r.profile, reference: r.reference, stability: r.stability,
    facts: r.facts, variants: r.variants, enabledVariants: r.enabledPresent,
    strength: r.strength, periods: r.periods, cancellation: r.cancellation, source: r.source,
  };
}

/**
 * Yogas from the rule registry (shared/rules). Each entry keeps the legacy { id, name, desc, kind }
 * and adds { rule, status, strength, periods, variants, facts, … }: configuration, modifiers and
 * relevant periods are kept separate. Disputed labels are never included here.
 */
export function detectYogas(chart, { profile } = {}) {
  return evaluateRules(chart, { profile, filter: (r) => r.kind === 'yoga' || r.showWithYogas }).map(yogaView);
}

/** Rules that could not be evaluated because they need the Lagna (birth time unknown). */
export function rulesNeedingBirthTime(chart, { profile } = {}) {
  return evaluateRules(chart, { profile, includeUnavailable: true, filter: (r) => r.kind === 'yoga' || r.showWithYogas })
    .filter((r) => r.unavailable)
    .map((r) => ({ rule: r.ruleId, id: r.legacyId, name: r.name, needs: r.needs }));
}

/** Every registry evaluation (including absent ones when asked) — for the evidence bundle / reviewer view. */
export function ruleEvidence(chart, { profile, includeAbsent = false } = {}) {
  return evaluateRules(chart, { profile, includeAbsent });
}

/** Distinct house-lord role facts (lords, placements, occupants, Badhaka, 2nd/7th lords, functional table). */
export function houseRoles(chart, { profile } = {}) {
  return computeHouseRoles(chart, { profile });
}

/** Sidereal Saturn/Jupiter/Rahu now, relative to the natal Moon; Ezharai / Ashtama Sani and Guru Balam. */
export function transitStatus(chart, now = new Date()) {
  const { planets } = planetPositions(now);
  const M = chart.planets.Moon.rasi;
  const h = (k) => houseOf(M, planets[k].rasi);
  const sat = h('Saturn'), jup = h('Jupiter'), rahu = h('Rahu');
  const satPhase = sat === 12 ? 1 : sat === 1 ? 2 : sat === 2 ? 3 : 0;
  // Find when the current Saturn sign started and ends (scan months).
  const satSpan = signSpan('Saturn', now);
  const jupSpan = signSpan('Jupiter', now);
  const status = [];
  if (satPhase) status.push({ id: 'ezharai', kind: 'care', en: `Ezharai Sani (Sade Sati), phase ${satPhase} of 3`, ta: `ஏழரைச் சனி — ${['', 'விரய', 'ஜென்ம', 'பாத'][satPhase]} சனி`, adviceEn: 'A period of hard work that builds maturity. Avoid shortcuts, keep health routines, and light a sesame-oil lamp on Saturdays.', adviceTa: 'உழைப்பால் முதிர்ச்சி தரும் காலம். குறுக்கு வழிகளைத் தவிர்த்து, ஆரோக்கியம் பேணி, சனிக்கிழமை நல்லெண்ணெய் தீபம் ஏற்றவும்.' });
  else if (sat === 8) status.push({ id: 'ashtama', kind: 'care', en: 'Ashtama Sani (Saturn 8th from Moon)', ta: 'அஷ்டமச் சனி', adviceEn: 'Go slow on big risks and lending; patience and service bring protection.', adviceTa: 'பெரிய அபாயங்கள், கடன் கொடுப்பதில் நிதானம்; பொறுமையும் சேவையும் காக்கும்.' });
  else if (sat === 4) status.push({ id: 'ardhashtama', kind: 'care', en: 'Ardhashtama Sani (Saturn 4th from Moon)', ta: 'அர்த்தாஷ்டமச் சனி', adviceEn: 'Care for home and mother\'s health; avoid property disputes.', adviceTa: 'வீடு, தாயின் ஆரோக்கியத்தில் கவனம்; சொத்து பிரச்சினைகளைத் தவிர்க்கவும்.' });
  else if ([3, 6, 11].includes(sat)) status.push({ id: 'sani_good', kind: 'good', en: `Saturn transits the ${sat}th from your Moon — a rewarding period`, ta: `சனி ${sat}-ல் — பலன் தரும் காலம்`, adviceEn: 'Effort is rewarded; good for steady career growth.', adviceTa: 'உழைப்புக்குப் பலன்; தொழிலில் நிலையான வளர்ச்சி.' });
  const guruBalam = [2, 5, 7, 9, 11].includes(jup);
  status.push(guruBalam
    ? { id: 'guru_balam', kind: 'good', en: `Guru Balam: Jupiter ${jup}th from your Moon`, ta: `குரு பலம் உண்டு (${jup}-ல் குரு)`, adviceEn: 'Favourable for marriage, children, new ventures and learning.', adviceTa: 'திருமணம், குழந்தை, புதிய முயற்சி, கல்விக்கு சாதகம்.' }
    : { id: 'guru_weak', kind: 'mild', en: `Jupiter ${jup}th from your Moon (Guru Balam weak)`, ta: `குரு ${jup}-ல் (குரு பலம் குறைவு)`, adviceEn: 'Pray to Dakshinamurthy on Thursdays; choose muhurthams carefully for big events.', adviceTa: 'வியாழன் தட்சிணாமூர்த்தி வழிபாடு; பெரிய நிகழ்வுகளுக்கு முகூர்த்தத்தை கவனமாகத் தேர்வு செய்யவும்.' });
  if ([1, 7].includes(rahu)) status.push({ id: 'rahu', kind: 'mild', en: `Rahu transits the ${rahu}th from your Moon`, ta: `ராகு ${rahu}-ல் சஞ்சாரம்`, adviceEn: 'Avoid confusion in partnerships; Durga worship on Tuesdays/Fridays helps.', adviceTa: 'கூட்டு முயற்சிகளில் தெளிவு தேவை; செவ்வாய்/வெள்ளி துர்கை வழிபாடு நன்று.' });
  return { saturnFromMoon: sat, jupiterFromMoon: jup, rahuFromMoon: rahu, saturnSign: planets.Saturn.rasi, jupiterSign: planets.Jupiter.rasi, satSpan, jupSpan, status };
}

/** When the planet entered its current sidereal sign, and when it leaves (monthly scan, then refine to a day). */
function signSpan(planet, now) {
  const rasiAt = (d) => planetPositions(d).planets[planet].rasi;
  const cur = rasiAt(now);
  const MONTH = 30 * 86400000;
  let a = now.getTime(), b = now.getTime();
  for (let i = 0; i < 40 && rasiAt(new Date(a - MONTH)) === cur; i++) a -= MONTH;
  for (let i = 0; i < 40 && rasiAt(new Date(b + MONTH)) === cur; i++) b += MONTH;
  const refine = (t, dir) => { let x = t; for (let i = 0; i < 31 && rasiAt(new Date(x + dir * 86400000)) === cur; i++) x += dir * 86400000; return new Date(x); };
  return { from: refine(a, -1), to: refine(b, 1) };
}

const AREAS = [
  { id: 'career', en: 'Career & status', ta: 'தொழில் & அந்தஸ்து', houses: [10, 6, 11], karakas: ['Saturn', 'Sun'] },
  { id: 'wealth', en: 'Wealth & savings', ta: 'செல்வம் & சேமிப்பு', houses: [2, 11, 9], karakas: ['Jupiter', 'Venus'] },
  { id: 'marriage', en: 'Marriage & partnership', ta: 'திருமணம் & கூட்டு', houses: [7, 2, 11], karakas: ['Venus', 'Jupiter'] },
  { id: 'health', en: 'Health & vitality', ta: 'ஆரோக்கியம்', houses: [1, 6, 8], karakas: ['Sun', 'Moon'] },
  { id: 'education', en: 'Education & intellect', ta: 'கல்வி & அறிவு', houses: [4, 5, 9], karakas: ['Mercury', 'Jupiter'] },
  { id: 'children', en: 'Children', ta: 'குழந்தைகள்', houses: [5, 9], karakas: ['Jupiter'] },
  { id: 'property', en: 'Home, land & vehicles', ta: 'வீடு, நிலம், வாகனம்', houses: [4, 11], karakas: ['Mars', 'Venus'] },
  { id: 'spiritual', en: 'Spiritual growth', ta: 'ஆன்மீக வளர்ச்சி', houses: [9, 12, 5], karakas: ['Jupiter', 'Ketu'] },
];

/** Full analysis bundle used by the Jathagam report screen and the Jothidar. */
export function fullAnalysis(chart, now = new Date(), { profile } = {}) {
  const pr = resolveProfile(profile);
  const bhavas = bhavaAnalysis(chart);
  const strength = grahaStrength(chart.planets);
  const sMap = Object.fromEntries(strength.map((g) => [g.planet, g.score]));
  const yogas = detectYogas(chart, { profile: pr });
  const roles = houseRoles(chart, { profile: pr });
  const hasLagna = !!chart.planets.Lagna;
  const transit = transitStatus(chart, now);
  const areas = !hasLagna ? [] : AREAS.map((a) => {
    const hs = a.houses.map((h) => bhavas[h - 1].score);
    const ks = a.karakas.map((k) => sMap[k]);
    let score = Math.round(hs[0] * 0.45 + (hs.slice(1).reduce((x, y) => x + y, 0) / Math.max(1, hs.length - 1)) * 0.25 + (ks.reduce((x, y) => x + y, 0) / ks.length) * 0.3);
    if (a.id === 'marriage' && transit.status.some((s) => s.id === 'guru_balam')) score += 4;
    if (a.id === 'career' && transit.status.some((s) => s.id === 'sani_good')) score += 4;
    score = Math.max(20, Math.min(95, score));
    return { ...a, score, level: score >= 66 ? 'strong' : score >= 48 ? 'steady' : 'needs care' };
  });
  const dasa = chart.dasa.current;
  let dasaOutlook = null;
  if (dasa) {
    const k = dasa.lord;
    const house = hasLagna ? houseOf(chart.planets.Lagna.rasi, chart.planets[k].rasi) : null;
    const ruled = hasLagna && k in OWN ? housesRuled(chart.planets.Lagna.rasi, k) : [];
    const good = sMap[k] >= 55 && !DUSTHANA.includes(house);
    const where = house ? { en: ` sits in house ${house}`, ta: `: ${house}-ம் வீட்டில்` } : { en: ' (house needs birth time)', ta: ': (பாவத்திற்கு பிறந்த நேரம் தேவை)' };
    const until = minCap(dasa.end, capDate(chart));
    const uy = until ? new Date(until).getUTCFullYear() : null;
    dasaOutlook = {
      lord: k, house, ruled, strength: sMap[k], tone: good ? 'favourable' : 'growth through effort', until,
      en: `You are in ${k} Mahadasa${uy ? ` (until ${uy})` : ''}. In your chart ${k}${where.en}${ruled.length ? ` and rules your ${ruled.join(' & ')} house${ruled.length > 1 ? 's' : ''}` : ''}. ${good ? 'A supportive period — use it to build.' : 'Results come through patience and steady effort; its parigaram helps.'}`,
      ta: `நீங்கள் இப்போது ${PLANETS[k].ta} மகா தசையில்${uy ? ` (${uy} வரை)` : ''}. உங்கள் ஜாதகத்தில் ${PLANETS[k].ta}${where.ta}${ruled.length ? `, ${ruled.join(' & ')}-ம் வீடுகளின் அதிபதி` : ''}. ${good ? 'ஆதரவான காலம் — வளர்ச்சிக்குப் பயன்படுத்துங்கள்.' : 'பொறுமையும் தொடர் முயற்சியும் பலன் தரும்; அதன் பரிகாரம் உதவும்.'}`,
    };
  }
  const needsBirthTime = hasLagna ? [] : rulesNeedingBirthTime(chart, { profile: pr });
  return {
    bhavas, strength, strengthLabel: STRENGTH_INDEX_LABEL, yogas, roles, transit, areas, dasaOutlook,
    availability: chart.availability || { lagna: hasLagna, houses: hasLagna, reason: null },
    stability: chart.stability || null, needsBirthTime,
    profile: { id: pr.id, name: pr.name, status: pr.status },
  };
}
