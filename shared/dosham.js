// Dosham diagnosis & Nivarthi engine (தோஷங்கள் & நிவர்த்தி).
// Reads a natal chart the way a senior Tamil jothidar would: which traditional doshams are present, how strong
// (mild / moderate / strong — counted from house, dignity, aspects and cancellations), what each is traditionally read
// as delaying, whether it is "active now" in the running Dasa / Bhukti and when it eases — and a Nivarthi
// plan (parigara sthalam, day / time, best period, home practice, charity, what NOT to do).
//
// Product rules (docs/AI-SAFETY-POLICY.md §"Dosham & remedy framing"): no fear wording ("தோஷம் சாபம் அல்ல — நிவர்த்தி
// உண்டு"); never a promise (tradition / belief framing); never "you will never…"; no medical claims (child delay
// always adds "consult a fertility specialist together"); no lifespan; children (<18) get only general prayer and
// habits; with an unknown birth time only Moon / planet-based doshams are read and the Lagna-based ones are named
// as needing the time. Every rule here is status 'proposed' (docs/RULE-REGISTRY.md) until an astrologer signs off.
//
// Reuses: rules/core (sign maths, aspects, dignity, combustion orbs from the profile), rules/chevvai (Chevvai and
// Rahu–Ketu exactly as the registry evaluates them, via porutham.doshams), rules/disputed (Kala Sarpa predicate),
// rules/yogas (Kemadruma), analysis.transitStatus (Sani transit), daily.runningDasa (the running periods).
import { RASIS, PLANETS, planetPositions } from './astro.js';
import { makeContext, DUSTHANA, KENDRA, OWN, EXALT, DEBIL, houseFrom, ord, lon } from './rules/core.js';
import { resolveProfile } from './rules/profiles.js';
import { getRule, evaluateRule } from './rules/registry.js';
import { doshams as chevvaiRahuKetu } from './porutham.js';
import { transitStatus } from './analysis.js';
import { runningDasa } from './daily.js';
import { NAVAGRAHA } from './remedies.js';
import { TEMPLES } from './temples.js';
import { CHILD_PRACTICE } from './age-guard.js';
import { AREAS, PLANET_NIVARTHI, DOSHAM_KINDS, AVOID, FRAMING, SEVERITY, DOSHAM_DATA_VERSION } from './dosham-data.js';

export { AREAS, FRAMING, SEVERITY, AVOID, DOSHAM_KINDS, PLANET_NIVARTHI };
export const DOSHAM_ENGINE_VERSION = 'dosham-0.1-proposed';
const T = (en, ta) => ({ en, ta });
const pTa = (k) => PLANETS[k]?.ta || k;
// Tamil case forms: with (உடன்), to (க்கு), and (உம்) — சனியுடன், செவ்வாய்க்கு, புதனும், ராகுவுடன்.
const TA_STEM = { Sun: 'சூரியன', Moon: 'சந்திரன', Mars: 'செவ்வாய', Mercury: 'புதன', Jupiter: 'குருவ', Venus: 'சுக்கிரன', Saturn: 'சனிய', Rahu: 'ராகுவ', Ketu: 'கேதுவ' };
const taWith = (k) => `${TA_STEM[k]}ுடன்`;
const taTo = (k) => (k === 'Mars' ? 'செவ்வாய்க்கு' : k === 'Saturn' ? 'சனிக்கு' : `${TA_STEM[k]}ுக்கு`);
const taAnd = (k) => `${TA_STEM[k]}ும்`;
const rEn = (r) => RASIS[r].en;
const rTa = (r) => RASIS[r].ta;
const uniq = (a) => [...new Set(a)];
const MALEFIC4 = ['Saturn', 'Mars', 'Rahu', 'Ketu'];
const SEV = ['mild', 'moderate', 'strong'];
const sevOf = (pts) => SEV[Math.max(0, Math.min(2, pts - 1))];
const MONTHS_TA = ['ஜனவரி', 'பிப்ரவரி', 'மார்ச்', 'ஏப்ரல்', 'மே', 'ஜூன்', 'ஜூலை', 'ஆகஸ்ட்', 'செப்டம்பர்', 'அக்டோபர்', 'நவம்பர்', 'டிசம்பர்'];
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** "Mar 2027" / "மார்ச் 2027" (UTC + 5:30 so an IST period end lands on its Indian date). */
export const monthYear = (d) => { const x = new Date(new Date(d).getTime() + 5.5 * 3600000); return T(`${MONTHS_EN[x.getUTCMonth()]} ${x.getUTCFullYear()}`, `${MONTHS_TA[x.getUTCMonth()]} ${x.getUTCFullYear()}`); };
/** Planet name before தசை / புக்தி: சூரிய தசை, சந்திர தசை, சுக்கிர புக்தி. */
const dasaTa = (k) => ({ Sun: 'சூரிய', Moon: 'சந்திர', Venus: 'சுக்கிர' }[k] || pTa(k));

/**
 * The rules this engine evaluates (for the registry document, the reviewer and tests). All 'proposed'.
 * needsLagna: the rule is counted from the Lagna (unknown birth time → not read).
 */
export const DOSHAM_RULES = Object.freeze([
  { id: 'dosham.rahuketu', kind: 'rahuketu', needsLagna: true, predicateText: 'Rahu or Ketu in the 1st/7th or 2nd/8th from Lagna (exactly the registry rule dosha.rahuketu, Lagna reference); a node in the 5th is a Putra-dosham factor. Base: moderate. Softened by Jupiter aspecting/joining the node, or the node in Rishabam/Mithunam/Kanni/Kumbam (Rahu) or Vrischikam/Dhanusu (Ketu).' },
  { id: 'dosham.kalasarpa', kind: 'kalasarpa', needsLagna: false, disputed: true, predicateText: 'All seven planets on one side of the Rahu–Ketu axis by longitude (registry predicate dosha.kalasarpa). Rahu→Ketu side: Kala Sarpa; Ketu→Rahu side: Kala Amirtha. Always mild; marked traditional/disputed.' },
  { id: 'dosham.chevvai', kind: 'chevvai', needsLagna: false, predicateText: 'Exactly the registry rule dosha.chevvai (Mars in 2/4/7/8/12 from Lagna and/or Moon, profile references). Severity: one reference mild, both moderate, +1 for Mars in the 7th/8th from Lagna; each registry exception that holds lowers it one step and is listed as a cancellation (exceptions are not auto-applied, so presence matches the registry).' },
  { id: 'dosham.sani', kind: 'sani', needsLagna: true, predicateText: 'Saturn in the 1st, 5th or 7th from Lagna (not already reported as Sani–Sevvai in that house). 7th: moderate; 1st/5th: mild; debilitated +1; own/exalted −1; Jupiter aspect −1.' },
  { id: 'dosham.sanisevvai', kind: 'sanisevvai', needsLagna: false, predicateText: 'Saturn and Mars in the same sign (moderate) or in mutual aspect (mild); +1 when they occupy the Lagna, 5th or 7th; Jupiter aspecting the conjunction −1.' },
  { id: 'dosham.lagnalord', kind: 'lagnalord', needsLagna: true, predicateText: 'Lagna lord in the 6th, 8th or 12th from Lagna: moderate; +1 debilitated, +1 combust (profile orb); −1 own or exalted sign.' },
  { id: 'dosham.combust', kind: 'combust', needsLagna: false, predicateText: 'Combustion (profile orbs: Mercury 14°/12° retro, Venus 10°/8° retro, Jupiter 11°, Mars 17°, Saturn 15°, Moon 12°) of the Lagna lord, 5th lord, 7th lord, Venus or Jupiter (Mercury only when it is one of those lords). Within half the orb: moderate, else mild; Mercury always mild (tradition treats Budha moudyam lightly). Folded into the Lagna-lord item when that lord is also in a dusthana.' },
  { id: 'dosham.putra', kind: 'putra', needsLagna: true, predicateText: 'Factors: Saturn/Mars/Rahu/Ketu in the 5th; 5th lord in 6/8/12; 5th lord joined by Saturn/Mars/Rahu/Ketu; Jupiter debilitated, combust or in 6/8/12; Jupiter with Rahu/Ketu; +1 when the 5th lord is afflicted and the Lagna lord is in a dusthana. Cancellations: Jupiter aspects the 5th or the 5th lord; 5th lord own/exalted; Jupiter or Venus in the 5th. Present when at least one PRIMARY factor (anything but Jupiter\'s house or Jupiter with a node) holds and ≥1 factor remains after cancellations.' },
  { id: 'dosham.kalathra', kind: 'kalathra', needsLagna: true, predicateText: 'Factors: Saturn or the Sun in the 7th; 7th lord in 6/8/12; 7th lord joined by Saturn/Mars/Rahu/Ketu, combust or debilitated; Venus debilitated, combust or with Saturn/Rahu/Ketu; the 7th aspected by both Saturn and Mars. Cancellations: Jupiter aspects the 7th or 7th lord; 7th lord or Venus own/exalted. Present when at least one PRIMARY factor holds (Venus with Saturn/Rahu/Ketu and the double aspect are supporting only) and ≥1 factor remains after cancellations. (Chevvai and Rahu–Ketu in the 7th are reported as their own doshams.)' },
  { id: 'dosham.pitru', kind: 'pitru', needsLagna: false, disputed: true, predicateText: 'Sun in the same sign as Rahu, Ketu or Saturn; or (with Lagna) Rahu/Ketu in the 9th while the 9th lord is in 6/8/12 or joined by Saturn/Mars/Rahu/Ketu. Marked traditional/disputed.' },
  { id: 'dosham.guruchandala', kind: 'guruchandala', needsLagna: false, disputed: true, predicateText: 'Jupiter and Rahu in the same sign. Own/exalted Jupiter −1. Marked traditional/disputed.' },
  { id: 'dosham.shrapit', kind: 'shrapit', needsLagna: false, disputed: true, predicateText: 'Saturn and Rahu in the same sign (registry predicate dosha.shrapit); +1 in the Lagna or 7th. Marked traditional/disputed.' },
  { id: 'dosham.grahana', kind: 'grahana', needsLagna: false, disputed: true, predicateText: 'Sun or Moon in the same sign as Rahu or Ketu (registry predicate dosha.grahana; sign placement only, never an eclipse). The Sun case is folded into Pitru when that is reported. Marked traditional/disputed.' },
  { id: 'dosham.kemadruma', kind: 'kemadruma', needsLagna: false, predicateText: 'Registry rule yoga.kemadruma present and none of its cancellation conditions satisfied. Mild.' },
  { id: 'dosham.naga', kind: 'naga', needsLagna: true, disputed: true, predicateText: 'Rahu or Ketu in the 1st, 2nd, 5th, 7th or 8th from Lagna AND in the same sign as the Moon or Venus. Mild; +1 in the 7th. Marked traditional/disputed.' },
  { id: 'dosham.sanitransit', kind: 'sanitransit', needsLagna: false, current: true, predicateText: 'Transit Saturn 12th/1st/2nd (Ezharai), 8th (Ashtama) or 4th (Ardhashtama) from the natal Moon (analysis.transitStatus). Janma (1st) and Ashtama moderate, others mild. Ends when Saturn leaves the stretch.' },
]);
const RULE_OF = Object.fromEntries(DOSHAM_RULES.map((r) => [r.kind, r]));

// ------------------------------------------------------------------ small chart helpers
function where(ctx, k) {
  const r = ctx.P[k].rasi;
  if (!ctx.hasLagna) return T(`in ${rEn(r)}`, `${rTa(r)} ராசியில்`);
  const h = ctx.houseOf(k, 'lagna');
  return h === 1 ? T(`in the Lagna (${rEn(r)})`, `லக்னத்தில் (${rTa(r)})`) : T(`in the ${ord(h)} house (${rEn(r)})`, `${h}-ம் வீட்டில் (${rTa(r)})`);
}
const jupiterHelps = (ctx, k) => ctx.conj('Jupiter', k) || ctx.aspects('Jupiter', k);
function dignityNote(ctx, k) {
  const d = ctx.dignity(k);
  if (d === 'own') return T(`${k} is in its own sign`, `${pTa(k)} ஆட்சி பெற்றுள்ளது`);
  if (d === 'exalted') return T(`${k} is exalted`, `${pTa(k)} உச்சம் பெற்றுள்ளது`);
  if (d === 'debilitated') return T(`${k} is debilitated`, `${pTa(k)} நீசம்`);
  return null;
}
function combustFact(ctx, k) {
  const c = ctx.combust(k);
  if (!c.combust) return null;
  const retro = ctx.P[k].retrograde && ctx.profile.combustion[`${k}Retro`];
  return {
    ...c,
    text: T(`${k} is ${c.sep.toFixed(1)}° from the Sun — combust (orb used: ${c.threshold}°${retro ? ', retrograde value' : ''})`, `${pTa(k)} சூரியனிடமிருந்து ${c.sep.toFixed(1)}° — அஸ்தங்கம் (பயன்படுத்திய வரம்பு ${c.threshold}°${retro ? ', வக்கிர மதிப்பு' : ''})`),
  };
}
const housesOfLord = (ctx, k) => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter((h) => ctx.lord(h) === k);

function item(kind, { pts, condition, facts = [], cancellations = [], areas, planets, data = {}, nameOverride = null, disputed = null }) {
  const rule = RULE_OF[kind];
  const raw = Math.max(1, pts);
  const net = Math.max(1, raw - cancellations.length);
  const def = DOSHAM_KINDS[kind];
  return {
    id: kind, ruleId: rule.id, status: 'proposed', kind,
    name: nameOverride || def.name, condition, facts, cancellations,
    severity: sevOf(net), points: { raw, net },
    disputed: disputed ?? !!rule.disputed, traditionNote: def.note || null,
    areas: uniq(areas), planets: uniq(planets), needsLagna: rule.needsLagna, current: !!rule.current, data,
  };
}

// ------------------------------------------------------------------ the detectors
function detectRahuKetu(ctx, dRK) {
  if (!ctx.hasLagna) return null;
  const r = ctx.houseOf('Rahu'), k = ctx.houseOf('Ketu');
  const axis = [1, 7].includes(r) ? '1-7' : [2, 8].includes(r) ? '2-8' : null;
  if (!axis || !dRK.present) return null; // agrees with the registry rule dosha.rahuketu (Lagna reference); a node in the 5th is read under Putra dosham
  const node = axis === '5' ? (r === 5 ? 'Rahu' : 'Ketu') : axis === '1-7' ? (r === 1 ? 'Rahu' : 'Ketu') : (r === 2 ? 'Rahu' : 'Ketu');
  const other = node === 'Rahu' ? 'Ketu' : 'Rahu';
  const cond = axis === '5'
    ? T(`${node} in the 5th house (${rEn(ctx.P[node].rasi)}) — the house of children`, `${pTa(node)} 5-ம் வீட்டில் (${rTa(ctx.P[node].rasi)}) — புத்திர ஸ்தானம்`)
    : T(`Rahu ${where(ctx, 'Rahu').en} and Ketu ${where(ctx, 'Ketu').en}`, `ராகு ${where(ctx, 'Rahu').ta}, கேது ${where(ctx, 'Ketu').ta}`);
  const cancellations = [];
  for (const n of axis === '5' ? [node] : ['Rahu', 'Ketu']) if (jupiterHelps(ctx, n)) { cancellations.push(T(`Jupiter ${ctx.conj('Jupiter', n) ? 'joins' : 'aspects'} ${n} — tradition says Guru's grace softens it`, `குரு ${taWith(n)} ${ctx.conj('Jupiter', n) ? 'சேர்ந்துள்ளார்' : 'பார்வை'} — குருவின் அருள் தோஷத்தை மென்மையாக்கும் என்பது மரபு`)); break; }
  if ([1, 2, 5, 10].includes(ctx.P.Rahu.rasi) || [7, 8].includes(ctx.P.Ketu.rasi)) cancellations.push(T('The node sits in a sign some traditions treat as favourable for it (Rahu: Rishabam/Mithunam/Kanni/Kumbam; Ketu: Vrischikam/Dhanusu)', 'சில மரபுகள் சாதகமாகக் கருதும் ராசியில் நிழல் கிரகம் (ராகு: ரிஷபம்/மிதுனம்/கன்னி/கும்பம்; கேது: விருச்சிகம்/தனுசு)'));
  const areas = axis === '1-7' ? ['marriage', 'spouse', 'health'] : axis === '2-8' ? ['family', 'marriage'] : ['children', 'studies'];
  return item('rahuketu', { pts: axis === '5' ? 1 : 2, condition: cond, cancellations, areas, planets: ['Rahu', 'Ketu'], data: { axis, rahuHouse: r, ketuHouse: k, node, other } });
}

function detectKalaSarpa(ctx, chart) {
  const res = evaluateRule(getRule('dosha.kalasarpa'), chart, { profile: 'parashari-tamil-review' });
  if (!res.present) return null;
  const amirtha = res.enabledPresent.includes('ketuToRahu') && !res.enabledPresent.includes('rahuToKetu');
  return item('kalasarpa', {
    pts: 1, nameOverride: amirtha ? DOSHAM_KINDS.kalasarpa.nameAmirtha : DOSHAM_KINDS.kalasarpa.name,
    condition: amirtha ? T('All seven planets lie between Ketu and Rahu (Ketu side)', 'ஏழு கிரகங்களும் கேது–ராகு இடையே (கேது பக்கம்)') : T('All seven planets lie between Rahu and Ketu (Rahu side)', 'ஏழு கிரகங்களும் ராகு–கேது இடையே (ராகு பக்கம்)'),
    areas: ['effort', 'mind'], planets: ['Rahu', 'Ketu'], data: { amirtha },
  });
}

function detectChevvai(ctx, d) {
  const cv = d.chevvai;
  if (!cv.present) return null;
  const refs = cv.countedReferences;
  let pts = refs.length >= 2 ? 2 : 1;
  if (ctx.hasLagna && [7, 8].includes(cv.fromLagna)) pts += 1;
  const parts = [];
  if (refs.includes('lagna')) parts.push(T(`${ord(cv.fromLagna)} from the Lagna`, `லக்னத்திலிருந்து ${cv.fromLagna}-ம் இடம்`));
  if (refs.includes('moon')) parts.push(T(`${ord(cv.fromMoon)} from the Moon`, `சந்திரனிலிருந்து ${cv.fromMoon}-ம் இடம்`));
  return item('chevvai', {
    pts, condition: T(`Mars is ${parts.map((p) => p.en).join(' and ')} (the rule counts the 2nd, 4th, 7th, 8th and 12th)`, `செவ்வாய் ${parts.map((p) => p.ta).join(', ')} (விதி 2, 4, 7, 8, 12-ம் இடங்களை எண்ணும்)`),
    cancellations: cv.exceptions.map((e) => T(`${e.en} — ${e.reason.en}`, `${e.ta} — ${e.reason.ta}`)),
    areas: ['marriage', 'spouse'], planets: ['Mars'], data: { fromLagna: cv.fromLagna, fromMoon: cv.fromMoon, refs, exceptions: cv.exceptions.map((e) => e.id) },
  });
}

function detectSaniSevvai(ctx) {
  const conj = ctx.conj('Saturn', 'Mars');
  const mut = !conj && ctx.mutualAspect('Saturn', 'Mars');
  if (!conj && !mut) return null;
  let pts = conj ? 2 : 1;
  const hs = ctx.hasLagna ? [ctx.houseOf('Saturn'), ctx.houseOf('Mars')] : [];
  if (hs.some((h) => [1, 5, 7].includes(h))) pts += 1;
  const cancellations = [];
  if (jupiterHelps(ctx, 'Saturn') || jupiterHelps(ctx, 'Mars')) cancellations.push(T('Jupiter aspects or joins them — tradition says this softens the combination', 'குருவின் பார்வை / சேர்க்கை உண்டு — இது சேர்க்கையை மென்மையாக்கும் என்பது மரபு'));
  const areas = ['effort', 'career', 'health'];
  if (hs.includes(5) || (ctx.hasLagna && [ctx.lord(5)].some((k) => k === 'Saturn' || k === 'Mars'))) areas.push('children');
  if (hs.includes(7) || (ctx.hasLagna && ['Saturn', 'Mars'].includes(ctx.lord(7)))) areas.push('marriage');
  const lordOf = ctx.hasLagna ? ['Saturn', 'Mars'].map((k) => ({ k, hs: housesOfLord(ctx, k) })) : [];
  const facts = lordOf.map(({ k, hs: h }) => T(`${k} rules house${h.length > 1 ? 's' : ''} ${h.join(' & ')}`, `${pTa(k)} ${h.join(', ')}-ம் வீட்டு அதிபதி`));
  return item('sanisevvai', {
    pts, condition: conj ? T(`Saturn and Mars together ${where(ctx, 'Saturn').en}`, `சனியும் செவ்வாயும் ${where(ctx, 'Saturn').ta} சேர்க்கை`) : T(`Saturn (${rEn(ctx.P.Saturn.rasi)}) and Mars (${rEn(ctx.P.Mars.rasi)}) aspect each other`, `சனி (${rTa(ctx.P.Saturn.rasi)}) – செவ்வாய் (${rTa(ctx.P.Mars.rasi)}) பரஸ்பரப் பார்வை`),
    facts, cancellations, areas, planets: ['Saturn', 'Mars'], data: { conj, houses: hs },
  });
}

function detectSani(ctx, sanisevvai) {
  if (!ctx.hasLagna) return null;
  const h = ctx.houseOf('Saturn');
  if (![1, 5, 7].includes(h)) return null;
  if (sanisevvai?.data.conj) return null; // already read as Sani–Sevvai in that house
  let pts = h === 7 ? 2 : 1;
  const d = ctx.dignity('Saturn');
  const facts = [];
  if (d === 'debilitated') { pts += 1; facts.push(dignityNote(ctx, 'Saturn')); }
  const cancellations = [];
  if (d === 'own' || d === 'exalted') cancellations.push(T(`${dignityNote(ctx, 'Saturn').en} — a dignified Saturn is held to give results through discipline`, `${dignityNote(ctx, 'Saturn').ta} — பலமான சனி ஒழுக்கத்தின் வழி பலன் தரும் என்பது மரபு`));
  if (jupiterHelps(ctx, 'Saturn')) cancellations.push(T('Jupiter aspects or joins Saturn', 'குருவின் பார்வை / சேர்க்கை சனிக்கு உண்டு'));
  const areas = h === 1 ? ['effort', 'health'] : h === 5 ? ['children', 'studies'] : ['marriage', 'spouse'];
  return item('sani', { pts, condition: T(`Saturn ${where(ctx, 'Saturn').en}`, `சனி ${where(ctx, 'Saturn').ta}`), facts, cancellations, areas, planets: ['Saturn'], data: { house: h } });
}

const DUSTHANA_MEAN = {
  6: T('the 6th — competition, debts and health routine need care', '6-ம் வீடு — போட்டி, கடன், ஆரோக்கியப் பழக்கத்தில் கவனம்'),
  8: T('the 8th — results come after delays and persistence; sudden ups and downs', '8-ம் வீடு — தாமதத்துக்கும் விடாமுயற்சிக்கும் பின் பலன்; திடீர் ஏற்ற இறக்கம்'),
  12: T('the 12th — expenses, travel and sleep need care', '12-ம் வீடு — செலவு, பயணம், உறக்கத்தில் கவனம்'),
};

function detectLagnaLord(ctx) {
  if (!ctx.hasLagna) return null;
  const k = ctx.lord(1);
  const h = ctx.houseOf(k);
  if (!DUSTHANA.includes(h)) return null;
  let pts = 2;
  const facts = [DUSTHANA_MEAN[h]];
  const d = ctx.dignity(k);
  const cancellations = [];
  if (d === 'own' || d === 'exalted') cancellations.push(T(`${dignityNote(ctx, k).en} there — tradition softens a dignified lord`, `${dignityNote(ctx, k).ta} — பலம் பெற்ற அதிபதி தோஷத்தைக் குறைக்கும் என்பது மரபு`));
  if (d === 'debilitated') { pts += 1; facts.push(dignityNote(ctx, k)); }
  const c = combustFact(ctx, k);
  const planets = [k];
  if (c) { pts += 1; facts.push(c.text); planets.push('Sun'); }
  if (jupiterHelps(ctx, k) && k !== 'Jupiter') cancellations.push(T(`Jupiter aspects or joins ${k}`, `குருவின் பார்வை / சேர்க்கை ${taTo(k)} உண்டு`));
  return item('lagnalord', {
    pts, condition: T(`The Lagna lord ${k} ${where(ctx, k).en}${c ? ', combust with the Sun' : ''}`, `லக்னாதிபதி ${pTa(k)} ${where(ctx, k).ta}${c ? ', சூரியனுடன் அஸ்தங்கம்' : ''}`),
    facts, cancellations, areas: ['health', 'effort', 'career'], planets, data: { lord: k, house: h, combust: !!c, sep: c?.sep ?? null, orb: c?.threshold ?? null },
  });
}

function detectCombust(ctx, lagnaLordItem) {
  const out = [];
  const lords = ctx.hasLagna ? { [ctx.lord(1)]: [1], [ctx.lord(5)]: [], [ctx.lord(7)]: [] } : {};
  if (ctx.hasLagna) { lords[ctx.lord(5)].push(5); lords[ctx.lord(7)].push(7); }
  const cands = uniq([...Object.keys(lords), 'Venus', 'Jupiter']).filter((k) => k !== 'Sun' && k !== 'Moon');
  for (const k of cands) {
    if (k === 'Mercury' && !lords.Mercury) continue; // Mercury is close to the Sun in many charts: read only as a key lord
    if (lagnaLordItem?.data.lord === k) continue; // folded into the Lagna-lord item
    const c = combustFact(ctx, k);
    if (!c) continue;
    const role = (lords[k] || []).filter(Boolean);
    const areas = [];
    if (role.includes(1)) areas.push('health', 'effort');
    if (role.includes(5) || k === 'Jupiter') areas.push('children');
    if (role.includes(7) || k === 'Venus') areas.push('marriage');
    if (k === 'Jupiter') areas.push('fortune');
    const roleTxt = role.length ? T(` (lord of ${role.map(ord).join(' & ')})`, ` (${role.join(', ')}-ம் அதிபதி)`) : k === 'Venus' ? T(' (kalathra karaka)', ' (களத்திர காரகர்)') : T(' (putra karaka)', ' (புத்திர காரகர்)');
    out.push(item('combust', {
      pts: k === 'Mercury' ? 1 : c.sep < c.threshold / 2 ? 2 : 1,
      nameOverride: T(`${k} combust (moudyam)`, `${pTa(k)} அஸ்தங்கம் (மௌட்யம்)`),
      condition: T(`${k}${roleTxt.en} is combust`, `${pTa(k)}${roleTxt.ta} அஸ்தங்கம்`), facts: [c.text],
      areas: areas.length ? areas : ['effort'], planets: [k, 'Sun'], data: { planet: k, sep: c.sep, orb: c.threshold, role },
    }));
  }
  return out;
}

function afflictedBy(ctx, k) { return MALEFIC4.filter((m) => m !== k && ctx.conj(k, m)); }

function detectPutra(ctx, lagnaLordItem) {
  if (!ctx.hasLagna) return null;
  const l5 = ctx.lord(5);
  const factors = [];
  const in5 = ctx.occupants(5).filter((k) => MALEFIC4.includes(k));
  if (in5.length) factors.push(T(`${in5.join(' & ')} in the 5th house`, `${in5.map(pTa).join(', ')} 5-ம் வீட்டில்`));
  const h5 = ctx.houseOf(l5);
  if (DUSTHANA.includes(h5)) factors.push(T(`5th lord ${l5} in the ${ord(h5)} house`, `5-ம் அதிபதி ${pTa(l5)} ${h5}-ம் வீட்டில்`));
  const aff = afflictedBy(ctx, l5);
  if (aff.length) factors.push(T(`5th lord ${l5} joined by ${aff.join(' & ')}`, `5-ம் அதிபதி ${pTa(l5)} — ${aff.map(pTa).join(', ')} சேர்க்கை`));
  const jd = ctx.dignity('Jupiter'), jc = combustFact(ctx, 'Jupiter'), jh = ctx.houseOf('Jupiter');
  if (jd === 'debilitated') factors.push(T('Jupiter (putra karaka) is debilitated', 'புத்திர காரகர் குரு நீசம்'));
  if (jc) factors.push(T(`Jupiter (putra karaka) is combust — ${jc.sep.toFixed(1)}° from the Sun (orb ${jc.threshold}°)`, `புத்திர காரகர் குரு அஸ்தங்கம் — சூரியனிடமிருந்து ${jc.sep.toFixed(1)}° (வரம்பு ${jc.threshold}°)`));
  if (DUSTHANA.includes(jh)) factors.push(T(`Jupiter (putra karaka) in the ${ord(jh)} house`, `புத்திர காரகர் குரு ${jh}-ம் வீட்டில்`));
  const jn = ['Rahu', 'Ketu'].filter((n) => ctx.conj('Jupiter', n));
  if (jn.length) factors.push(T(`Jupiter with ${jn[0]}`, `குரு ${taWith(jn[0])}`));
  const primary = factors.length - (DUSTHANA.includes(jh) ? 1 : 0) - (jn.length ? 1 : 0);
  if (primary < 1) return null; // Jupiter's house or a node beside it alone is only a supporting factor
  let pts = factors.length;
  if ((aff.length || DUSTHANA.includes(h5)) && lagnaLordItem) { pts += 1; factors.push(T('…together with the Lagna lord in a hidden house', '…அதோடு லக்னாதிபதியும் மறைவு ஸ்தானத்தில்')); }
  const cancellations = [];
  if (ctx.aspects('Jupiter', (ctx.L + 4) % 12) || jupiterHelps(ctx, l5)) cancellations.push(T('Jupiter aspects the 5th house or its lord — the strongest traditional softening', 'குருவின் பார்வை 5-ம் வீட்டுக்கோ அதன் அதிபதிக்கோ உண்டு — மிக முக்கியமான மரபு நிவர்த்தி'));
  const d5 = ctx.dignity(l5);
  if (d5 === 'own' || d5 === 'exalted') cancellations.push(T(`5th lord ${l5} is ${d5 === 'own' ? 'in its own sign' : 'exalted'}`, `5-ம் அதிபதி ${pTa(l5)} ${d5 === 'own' ? 'ஆட்சி' : 'உச்சம்'}`));
  const ben5 = ctx.occupants(5).filter((k) => ['Jupiter', 'Venus'].includes(k));
  if (ben5.length) cancellations.push(T(`${ben5.join(' & ')} in the 5th house`, `${ben5.map(pTa).join(', ')} 5-ம் வீட்டில்`));
  if (pts - cancellations.length < 1) return null;
  return item('putra', {
    pts, condition: T(`The 5th house (children) and its lord ${l5} carry traditional afflictions`, `5-ம் வீடும் (புத்திர ஸ்தானம்) அதன் அதிபதி ${taAnd(l5)} மரபுப்படி பாதிப்புடன்`),
    facts: factors, cancellations, areas: ['children'], planets: uniq([l5, 'Jupiter', ...in5, ...aff]), data: { lord5: l5 },
  });
}

function detectKalathra(ctx) {
  if (!ctx.hasLagna) return null;
  const l7 = ctx.lord(7);
  const r7 = (ctx.L + 6) % 12;
  const factors = [];
  const in7 = ctx.occupants(7).filter((k) => ['Saturn', 'Sun'].includes(k));
  if (in7.length) factors.push(T(`${in7.join(' & ')} in the 7th house`, `${in7.map(pTa).join(', ')} 7-ம் வீட்டில்`));
  const h7 = ctx.houseOf(l7);
  if (DUSTHANA.includes(h7)) factors.push(T(`7th lord ${l7} in the ${ord(h7)} house`, `7-ம் அதிபதி ${pTa(l7)} ${h7}-ம் வீட்டில்`));
  const aff = afflictedBy(ctx, l7);
  if (aff.length) factors.push(T(`7th lord ${l7} joined by ${aff.join(' & ')}`, `7-ம் அதிபதி ${pTa(l7)} — ${aff.map(pTa).join(', ')} சேர்க்கை`));
  const c7 = l7 !== 'Venus' && combustFact(ctx, l7);
  if (c7) factors.push(c7.text);
  if (ctx.dignity(l7) === 'debilitated') factors.push(T(`7th lord ${l7} is debilitated`, `7-ம் அதிபதி ${pTa(l7)} நீசம்`));
  const vd = ctx.dignity('Venus'), vc = combustFact(ctx, 'Venus');
  if (vd === 'debilitated') factors.push(T('Venus (kalathra karaka) is debilitated', 'களத்திர காரகர் சுக்கிரன் நீசம்'));
  if (vc) factors.push(T(`Venus (kalathra karaka) is combust — ${vc.sep.toFixed(1)}° from the Sun (orb ${vc.threshold}°)`, `களத்திர காரகர் சுக்கிரன் அஸ்தங்கம் — சூரியனிடமிருந்து ${vc.sep.toFixed(1)}° (வரம்பு ${vc.threshold}°)`));
  const va = ['Saturn', 'Rahu', 'Ketu'].filter((k) => ctx.conj('Venus', k));
  if (va.length) factors.push(T(`Venus with ${va.join(' & ')}`, `சுக்கிரன் ${va.map(pTa).join(', ')} உடன்`));
  const primary = factors.length - (va.length ? 1 : 0);
  if (ctx.aspects('Saturn', r7) && ctx.aspects('Mars', r7)) factors.push(T('The 7th house is aspected by both Saturn and Mars', '7-ம் வீட்டைச் சனியும் செவ்வாயும் பார்க்கின்றனர்'));
  if (primary < 1) return null; // Venus with a node / Saturn or the double aspect alone is only a supporting factor
  const cancellations = [];
  if (ctx.aspects('Jupiter', r7) || (l7 !== 'Jupiter' && jupiterHelps(ctx, l7)) || ctx.occupants(7).includes('Jupiter')) cancellations.push(T('Jupiter aspects the 7th house or its lord', 'குருவின் பார்வை 7-ம் வீட்டுக்கோ அதன் அதிபதிக்கோ உண்டு'));
  const d7 = ctx.dignity(l7);
  if (d7 === 'own' || d7 === 'exalted') cancellations.push(T(`7th lord ${l7} is ${d7 === 'own' ? 'in its own sign' : 'exalted'}`, `7-ம் அதிபதி ${pTa(l7)} ${d7 === 'own' ? 'ஆட்சி' : 'உச்சம்'}`));
  if (l7 !== 'Venus' && (vd === 'own' || vd === 'exalted')) cancellations.push(T(`Venus is ${vd === 'own' ? 'in its own sign' : 'exalted'}`, `சுக்கிரன் ${vd === 'own' ? 'ஆட்சி' : 'உச்சம்'}`));
  if (factors.length - cancellations.length < 1) return null;
  return item('kalathra', {
    pts: factors.length, condition: T(`The 7th house (marriage) and its lord ${l7} or Venus carry traditional afflictions`, `7-ம் வீடு (களத்திர ஸ்தானம்), அதன் அதிபதி ${pTa(l7)} அல்லது சுக்கிரன் மரபுப்படி பாதிப்புடன்`),
    facts: factors, cancellations, areas: ['marriage', 'spouse'], planets: uniq([l7, 'Venus', ...in7, ...aff, ...va]), data: { lord7: l7 },
  });
}

function detectPitru(ctx) {
  const f = [];
  const sw = ['Rahu', 'Ketu', 'Saturn'].filter((k) => ctx.conj('Sun', k));
  if (sw.length) f.push(T(`Sun with ${sw.join(' & ')}`, `சூரியன் ${sw.map(pTa).join(', ')} உடன்`));
  if (ctx.hasLagna) {
    const in9 = ctx.occupants(9).filter((k) => ['Rahu', 'Ketu'].includes(k));
    const l9 = ctx.lord(9), h9 = ctx.houseOf(l9);
    if (in9.length && (DUSTHANA.includes(h9) || afflictedBy(ctx, l9).length)) f.push(T(`${in9[0]} in the 9th house (father, ancestors) with its lord ${l9} ${DUSTHANA.includes(h9) ? `in the ${ord(h9)}` : 'afflicted'}`, `${pTa(in9[0])} 9-ம் வீட்டில் (தந்தை, முன்னோர்); அதன் அதிபதி ${pTa(l9)} ${DUSTHANA.includes(h9) ? `${h9}-ம் வீட்டில்` : 'பாதிப்புடன்'}`));
  }
  if (!f.length) return null;
  const cancellations = jupiterHelps(ctx, 'Sun') ? [T('Jupiter aspects or joins the Sun', 'குருவின் பார்வை / சேர்க்கை சூரியனுக்கு உண்டு')] : [];
  return item('pitru', { pts: f.length, nameOverride: null, condition: T(`${f.map((x) => x.en).join('; ')}`, `${f.map((x) => x.ta).join('; ')}`), facts: [], cancellations, areas: ['father', 'fortune'], planets: uniq(['Sun', ...sw]), data: { sunWith: sw } });
}

function detectConj(kind, ctx, a, b, areas, extraPts = () => 0, cancel = () => []) {
  if (!ctx.conj(a, b)) return null;
  return item(kind, { pts: 1 + extraPts(), condition: T(`${a} and ${b} in the same sign ${where(ctx, a).en}`, `${pTa(a)}, ${pTa(b)} ஒரே ராசியில் — ${where(ctx, a).ta}`), cancellations: cancel(), areas, planets: [a, b] });
}

function detectGrahana(ctx, pitru) {
  const sunN = pitru ? [] : ['Rahu', 'Ketu'].filter((n) => ctx.conj('Sun', n));
  const moonN = ['Rahu', 'Ketu'].filter((n) => ctx.conj('Moon', n));
  if (!sunN.length && !moonN.length) return null;
  const parts = [...sunN.map((n) => T(`Sun with ${n}`, `சூரியன் ${taWith(n)}`)), ...moonN.map((n) => T(`Moon with ${n}`, `சந்திரன் ${taWith(n)}`))];
  return item('grahana', {
    pts: parts.length, condition: T(`${parts.map((p) => p.en).join('; ')} (a sign placement, not an eclipse)`, `${parts.map((p) => p.ta).join('; ')} (ராசி அமைப்பு மட்டுமே; கிரகணம் அல்ல)`),
    cancellations: jupiterHelps(ctx, moonN.length ? 'Moon' : 'Sun') ? [T('Jupiter aspects or joins the luminary', 'குருவின் பார்வை / சேர்க்கை உண்டு')] : [],
    areas: moonN.length ? ['mind', ...(sunN.length ? ['father'] : [])] : ['father'], planets: uniq([...(sunN.length ? ['Sun'] : []), ...(moonN.length ? ['Moon'] : []), ...sunN, ...moonN]),
  });
}

function detectKemadruma(ctx, chart) {
  const res = evaluateRule(getRule('yoga.kemadruma'), chart, {});
  if (!res.present) return null;
  if ((res.cancellation?.conditions || []).some((c) => c.satisfied)) return null;
  return item('kemadruma', { pts: 1, condition: T('No planet (Mars–Saturn) beside the Moon on either side, and none of the traditional cancellations', 'சந்திரனின் இருபுறமும் கிரகம் இல்லை (செவ்வாய்–சனி); மரபு நிவர்த்தி எதுவும் இல்லை'), areas: ['mind'], planets: ['Moon'] });
}

function detectNaga(ctx) {
  if (!ctx.hasLagna) return null;
  for (const n of ['Rahu', 'Ketu']) {
    const h = ctx.houseOf(n);
    if (![1, 2, 5, 7, 8].includes(h)) continue;
    const w = ['Moon', 'Venus'].filter((k) => ctx.conj(n, k));
    if (!w.length) continue;
    return item('naga', { pts: h === 7 ? 2 : 1, condition: T(`${n} with ${w.join(' & ')} ${where(ctx, n).en}`, `${pTa(n)} ${w.map(pTa).join(', ')} உடன் — ${where(ctx, n).ta}`), areas: h === 5 ? ['children'] : ['marriage', ...(h === 1 ? ['mind'] : [])], planets: [n, ...w], data: { node: n, house: h } });
  }
  return null;
}

/** When transit Saturn leaves the given set of houses from the natal Moon (monthly scan, refined to a day). */
function saniEnd(moonRasi, houses, now) {
  const inSet = (t) => houses.includes(houseFrom(moonRasi, planetPositions(new Date(t)).planets.Saturn.rasi));
  const M = 30 * 86400000;
  let t = now.getTime();
  for (let i = 0; i < 110 && inSet(t + M); i++) t += M;
  for (let i = 0; i < 31 && inSet(t + 86400000); i++) t += 86400000;
  return new Date(t + 86400000);
}

function detectSaniTransit(ctx, chart, now, tr) {
  const st = tr.status.find((s) => ['ezharai', 'ashtama', 'ardhashtama'].includes(s.id));
  if (!st) return null;
  const houses = st.id === 'ezharai' ? [12, 1, 2] : st.id === 'ashtama' ? [8] : [4];
  const ends = saniEnd(ctx.M, houses, now);
  const phase2 = st.id === 'ezharai' && tr.saturnFromMoon === 1;
  return item('sanitransit', {
    pts: st.id === 'ashtama' || phase2 ? 2 : 1,
    nameOverride: T(st.en, st.ta),
    condition: T(`Saturn now transits the ${ord(tr.saturnFromMoon)} from your Moon sign (${rEn(ctx.M)}) — until about ${monthYear(ends).en}`, `சனி இப்போது உங்கள் ராசியிலிருந்து (${rTa(ctx.M)}) ${tr.saturnFromMoon}-ம் இடத்தில் — சுமார் ${monthYear(ends).ta} வரை`),
    areas: ['effort', 'career', 'health'], planets: ['Saturn'], data: { status: st.id, ends },
  });
}

// ------------------------------------------------------------------ timing: active now, eases, next period
function periodsOf(chart, planets, now) {
  const P = chart.dasa?.periods || [];
  const t = now.getTime();
  const out = [];
  for (const md of P) {
    const s = new Date(md.start).getTime(), e = new Date(md.end).getTime();
    if (e <= t || s > t + 25 * 365.25 * 86400000) continue;
    if (planets.includes(md.lord)) out.push({ kind: 'dasa', lord: md.lord, md: md.lord, start: md.start, end: md.end, now: s <= t });
    else for (const b of md.bhuktis || []) {
      const bs = new Date(b.start).getTime(), be = new Date(b.end).getTime();
      if (be <= t || !planets.includes(b.lord)) continue;
      out.push({ kind: 'bhukti', lord: b.lord, md: md.lord, start: b.start, end: b.end, now: bs <= t });
    }
  }
  return out.sort((a, b) => new Date(a.start) - new Date(b.start));
}
const periodName = (p) => (p.kind === 'dasa'
  ? T(`${p.lord} Dasa`, `${dasaTa(p.lord)} தசை`)
  : T(`${p.md} Dasa / ${p.lord} Bhukti`, `${dasaTa(p.md)} தசை / ${dasaTa(p.lord)} புக்தி`));

function timing(it, chart, now, run) {
  if (it.current) {
    return { activeNow: true, by: 'transit', eases: it.data.ends, text: T(`Running now (transit) — eases after about ${monthYear(it.data.ends).en}.`, `இப்போது நடப்பில் (கோசாரம்) — சுமார் ${monthYear(it.data.ends).ta}-க்குப் பின் தணியும்.`) };
  }
  const lords = it.planets;
  const md = run.md, ad = run.ad;
  const byDasa = md && lords.includes(md.lord), byBhukti = ad && lords.includes(ad.lord);
  const ps = periodsOf(chart, lords, now);
  const next = ps.find((p) => !p.now) || null;
  if (byDasa || byBhukti) {
    const cur = byBhukti ? { kind: 'bhukti', lord: ad.lord, md: md.lord, start: ad.start, end: ad.end } : { kind: 'dasa', lord: md.lord, md: md.lord, start: md.start, end: md.end };
    return {
      activeNow: true, by: cur.kind, period: cur, eases: cur.end, next,
      text: T(`Active now — the running ${periodName(cur).en} involves ${cur.lord}; tradition reads it as easing after ${monthYear(new Date(cur.end) - 86400000).en}.`, `இப்போது நடப்பில் — நடப்பு ${periodName(cur).ta} ${pTa(cur.lord)} சம்பந்தப்பட்டது; ${monthYear(new Date(cur.end) - 86400000).ta}-க்குப் பின் தணியும் என்பது மரபு.`),
    };
  }
  return {
    activeNow: false, next,
    text: next ? T(`Not active in the running period; it comes into focus in ${periodName(next).en} (${monthYear(next.start).en} – ${monthYear(new Date(next.end) - 86400000).en}) — begin the parigaram before then.`, `நடப்புக் காலத்தில் இது இயங்கவில்லை; ${periodName(next).ta} (${monthYear(next.start).ta} – ${monthYear(new Date(next.end) - 86400000).ta}) காலத்தில் முன்னுக்கு வரும் — அதற்கு முன்பே பரிகாரத்தைத் தொடங்குங்கள்.`)
      : T('Not active in the running period.', 'நடப்புக் காலத்தில் இது இயங்கவில்லை.'),
  };
}

/** Guru (Jupiter) transit support from the Moon sign: now, or when it next begins (monthly scan, ≤ 4 years). */
function guruSupport(chart, now, tr) {
  const good = [2, 5, 7, 9, 11];
  const M = chart.planets.Moon.rasi;
  if (good.includes(tr.jupiterFromMoon)) return { now: true, until: tr.jupSpan.to, text: T(`Guru balam now: Jupiter transits the ${ord(tr.jupiterFromMoon)} from your Moon until about ${monthYear(tr.jupSpan.to).en} — a supportive window to do the parigaram.`, `இப்போது குரு பலம்: குரு உங்கள் ராசியிலிருந்து ${tr.jupiterFromMoon}-ம் இடத்தில், சுமார் ${monthYear(tr.jupSpan.to).ta} வரை — பரிகாரம் செய்ய ஆதரவான காலம்.`) };
  const M30 = 30 * 86400000;
  for (let i = 1; i <= 48; i++) {
    const d = new Date(now.getTime() + i * M30);
    const h = houseFrom(M, planetPositions(d).planets.Jupiter.rasi);
    if (good.includes(h)) return { now: false, from: d, text: T(`Guru balam returns around ${monthYear(d).en} (Jupiter ${ord(h)} from your Moon) — a supportive time for the main yatra.`, `சுமார் ${monthYear(d).ta} முதல் மீண்டும் குரு பலம் (குரு உங்கள் ராசியிலிருந்து ${h}-ம் இடம்) — முக்கிய யாத்திரைக்கு ஆதரவான காலம்.`) };
  }
  return null;
}

// ------------------------------------------------------------------ diagnosis
const WEIGHT = { strong: 30, moderate: 20, mild: 10 };
const score = (it) => WEIGHT[it.severity] + (it.timing?.activeNow ? 6 : 0) - (it.disputed ? 4 : 0) + Math.min(3, it.areas.length);

/**
 * Diagnose the traditional doshams of a natal chart.
 * opts: { now, profile, minor (boolean, age < 18), age }
 * Returns { version, available, minor, hasLagna, items (most important first), needsTime (names of Lagna-based rules
 *   not read), guru, running: { md, ad }, lagna, moon }.
 */
const MEMO = new Map();
export function diagnoseDoshams(chart, opts = {}) {
  const now = opts.now || new Date();
  const key = chart?.utc && !opts.profile ? `${new Date(chart.utc).getTime()}|${chart.lat}|${chart.lon}|${chart.planets?.Lagna ? 1 : 0}|${new Date(now).toISOString().slice(0, 10)}|${opts.minor ? 1 : 0}|${opts.age ?? ''}` : null;
  if (key && MEMO.has(key)) return MEMO.get(key);
  const out = diagnoseUncached(chart, { ...opts, now });
  if (key) { if (MEMO.size > 24) MEMO.delete(MEMO.keys().next().value); MEMO.set(key, out); }
  return out;
}
function diagnoseUncached(chart, { now = new Date(), profile, minor = false, age = null } = {}) {
  const isMinor = minor || (age != null && Number(age) < 18);
  const base = { version: DOSHAM_ENGINE_VERSION, data: DOSHAM_DATA_VERSION, minor: isMinor, hasLagna: !!chart?.planets?.Lagna, items: [], needsTime: [], guru: null, running: null };
  if (!chart?.planets?.Moon) return { ...base, available: false };
  if (isMinor) return { ...base, available: true, childNote: CHILD_PRACTICE };
  const pr = resolveProfile(profile);
  const ctx = makeContext(chart, pr);
  const tr = transitStatus(chart, now);
  const run = runningDasa(chart, now);
  const dRK = chevvaiRahuKetu(chart.planets, { profile: pr });
  const ll = detectLagnaLord(ctx);
  const ss = detectSaniSevvai(ctx);
  const pitru = detectPitru(ctx);
  const list = [
    detectRahuKetu(ctx, dRK.rahuKetu), detectKalaSarpa(ctx, chart), detectChevvai(ctx, dRK), ss, detectSani(ctx, ss), ll,
    ...detectCombust(ctx, ll), detectPutra(ctx, ll), detectKalathra(ctx), pitru,
    detectConj('guruchandala', ctx, 'Jupiter', 'Rahu', ['studies', 'children', 'fortune'], () => (ctx.dignity('Jupiter') === 'debilitated' ? 1 : 0), () => (['own', 'exalted'].includes(ctx.dignity('Jupiter')) ? [T('Jupiter is dignified (own/exalted sign)', 'குரு ஆட்சி / உச்சம்')] : [])),
    detectConj('shrapit', ctx, 'Saturn', 'Rahu', ['effort', 'career'], () => (ctx.hasLagna && [1, 7].includes(ctx.houseOf('Saturn')) ? 1 : 0)),
    detectGrahana(ctx, pitru), detectKemadruma(ctx, chart), detectNaga(ctx), detectSaniTransit(ctx, chart, now, tr),
  ].filter(Boolean);
  for (const it of list) it.timing = timing(it, chart, now, run);
  list.sort((a, b) => score(b) - score(a));
  const needsTime = base.hasLagna ? [] : DOSHAM_RULES.filter((r) => r.needsLagna).map((r) => DOSHAM_KINDS[r.kind].name);
  return {
    ...base, available: true, items: list, needsTime, guru: guruSupport(chart, now, tr),
    running: { md: run.md?.lord || null, ad: run.ad?.lord || null, mdEnd: run.md?.end || null, adEnd: run.ad?.end || null },
    lagna: base.hasLagna ? chart.planets.Lagna.rasi : null, moon: chart.planets.Moon.rasi,
    lagnaMalefics: base.hasLagna ? ctx.occupants(1).filter((k) => MALEFIC4.includes(k)) : [],
  };
}

/** Doshams that touch a life area (marriage | children | career | …), most important first. */
export function doshamsForArea(diag, area) {
  const A = area === 'job' ? ['career', 'effort'] : area === 'child' ? ['children'] : area === 'marriage' ? ['marriage', 'spouse'] : [area];
  return (diag?.items || []).filter((it) => it.areas.some((a) => A.includes(a)));
}

// ------------------------------------------------------------------ nivarthi plan
const templeById = (id) => TEMPLES.find((t) => t.id === id) || null;
function sthalam(id, why, todo) {
  const t = templeById(id);
  if (!t) return null;
  return { id, name: t.name, town: t.town, deity: t.deity, why, todo };
}

/**
 * The Nivarthi plan for one diagnosed item, the same for every person: sthalams (dosham-specific first, then each
 * planet's Navagraha sthalam), day / time, best period, home hymn & practice, charity, avoid-list.
 */
export function nivarthiPlan(it) {
  const def = DOSHAM_KINDS[it.kind];
  const planets = it.planets.filter((k) => PLANET_NIVARTHI[k]);
  const temples = [];
  const add = (s) => { if (s && !temples.some((x) => x.id === s.id)) temples.push(s); };
  for (const t of def.temples || []) add(sthalam(t.id, t.why, t.todo));
  for (const k of planets) add(sthalam(PLANET_NIVARTHI[k].temple, PLANET_NIVARTHI[k].reason, PLANET_NIVARTHI[k].todo));
  // Marriage-delay doshams also point to the marriage sthalam; child-delay ones to Thirukarugavur.
  if (['chevvai', 'rahuketu'].includes(it.kind) && it.areas.includes('marriage')) { const m = DOSHAM_KINDS.kalathra.temples[0]; add(sthalam(m.id, m.why, m.todo)); }
  if (it.areas.includes('children') && it.kind !== 'putra') { const c = DOSHAM_KINDS.putra.temples[0]; add(sthalam(c.id, c.why, c.todo)); }
  const lead = planets[0];
  const day = it.kind === 'pitru' ? T('Amavasai (new moon) — especially Thai, Aadi and Mahalaya Amavasai', 'அமாவாசை — குறிப்பாக தை, ஆடி, மகாளய அமாவாசை')
    : ['rahuketu', 'kalasarpa', 'naga', 'grahana'].includes(it.kind) ? PLANET_NIVARTHI.Rahu.time
      : it.kind === 'putra' ? T('Thursday (Guru), and Sashti days for Murugan', 'வியாழன் (குரு), முருகனுக்குச் சஷ்டி நாட்கள்')
        : it.kind === 'kalathra' ? T('Friday (Sukran) or Thursday morning', 'வெள்ளி (சுக்கிரன்) அல்லது வியாழன் காலை')
          : lead ? PLANET_NIVARTHI[lead].time : null;
  const home = [];
  if (def.home) home.push({ hymn: def.home.hymn, text: def.home.text });
  for (const k of planets) home.push({ hymn: PLANET_NIVARTHI[k].hymn, text: PLANET_NIVARTHI[k].home, planet: k });
  const charity = uniq(planets.map((k) => k)).map((k) => ({ planet: k, ...NAVAGRAHA[k].charity }));
  const period = it.timing?.activeNow
    ? T(`Now — during ${it.timing.period ? periodName(it.timing.period).en : 'this period'} — is the traditional time to do it; keep the weekly practice going until it eases.`, `இப்போதே — ${it.timing.period ? periodName(it.timing.period).ta : 'இந்தக் காலத்தில்'} — செய்வது மரபு; தணியும் வரை வாராந்திர வழிபாட்டைத் தொடருங்கள்.`)
    : it.timing?.next ? T(`Before ${periodName(it.timing.next).en} begins (${monthYear(it.timing.next.start).en}).`, `${periodName(it.timing.next).ta} தொடங்கும் முன் (${monthYear(it.timing.next.start).ta}).`)
      : T('Any time — a steady weekly practice matters more than one big visit.', 'எப்போது வேண்டுமானாலும் — ஒரு பெரிய பயணத்தைவிட வாராந்திர வழக்கமே முக்கியம்.');
  const doctor = it.areas.includes('children') ? DOSHAM_KINDS.putra.doctor : null;
  return { kind: it.kind, day, period, charity, avoid: AVOID, doctor, framing: [FRAMING.notCurse, FRAMING.belief], sthalams: temples, home, yatra: temples.map((t) => t.id).slice(0, 4) };
}

/** The one dosham-based sthalam to show first (Parigaram screen, Today card), or null. */
export function primarySthalam(diag) {
  const it = (diag?.items || []).find((x) => !x.current) || diag?.items?.[0];
  if (!it) return null;
  const p = nivarthiPlan(it);
  const s = p.sthalams[0];
  return s ? { item: it, sthalam: s, day: p.day, yatra: p.yatra } : null;
}

/** All temple ids across the plan for the top items (for one-tap "plan this parigara yatra"). */
export function yatraIds(diag, { max = 5 } = {}) {
  const ids = [];
  for (const it of (diag?.items || []).filter((x) => x.severity !== 'mild' || !x.disputed)) for (const id of nivarthiPlan(it).yatra) if (!ids.includes(id)) ids.push(id);
  return ids.slice(0, max);
}

// ------------------------------------------------------------------ expert view (நிபுணர் பார்வை)
const nameOf = (it) => it.name;
const joinT = (arr, sepEn = ', ', sepTa = ', ') => T(arr.map((x) => x.en).join(sepEn), arr.map((x) => x.ta).join(sepTa));

/**
 * A senior jothidar's reading of the diagnosis, as paragraphs [{ en, ta }]. opts: { name, focus (area) }.
 * Order: framing → key afflictions in order → how they combine (by life area) → cancellations → timing → remedy
 * summary (planets and sthalams) → belief framing (and the fertility-specialist line when children are involved).
 */
export function expertView(diag, { name = '', focus = null, married = false } = {}) {
  const P = [];
  const who = name ? T(`${name}'s chart`, `${name} — ஜாதகம்`) : T('This chart', 'இந்த ஜாதகம்');
  if (!diag?.available) return { title: T('Expert view', 'நிபுணர் பார்வை'), paras: [T('Birth details are needed for a dosham reading.', 'தோஷம் பார்க்கப் பிறப்பு விவரம் தேவை.')] };
  if (diag.minor) return { title: T('Expert view', 'நிபுணர் பார்வை'), paras: [T('For children, Thunai does not read doshams. A short daily prayer in the family\'s own way, steady study, sleep and kind words are the best support at this age.', 'குழந்தைகளுக்குத் துணை தோஷம் பார்ப்பதில்லை. குடும்ப வழக்கப்படி தினமும் ஒரு சிறு பிரார்த்தனை, சீரான படிப்பு, உறக்கம், இனிய சொல் — இந்த வயதுக்கு இதுவே சிறந்த துணை.'), CHILD_PRACTICE] };
  const items = focus ? doshamsForArea(diag, focus) : diag.items;
  const head = diag.hasLagna
    ? T(`${who.en}: ${rEn(diag.lagna)} Lagna, ${rEn(diag.moon)} Rasi.`, `${who.ta}: ${rTa(diag.lagna)} லக்னம், ${rTa(diag.moon)} ராசி.`)
    : T(`${who.en}: ${rEn(diag.moon)} Rasi (birth time not known — Lagna not used).`, `${who.ta}: ${rTa(diag.moon)} ராசி (பிறந்த நேரம் தெரியாததால் லக்னம் பயன்படுத்தப்படவில்லை).`);
  P.push(T(`${head.en} ${FRAMING.notCurse.en}`, `${head.ta} ${FRAMING.notCurse.ta}`));
  if (!items.length) {
    P.push(focus ? T('No traditional dosham in this chart is linked to this area by the common rules — the timing comes from the running periods and transits.', 'பொதுவிதிப்படி இந்தத் துறையுடன் தொடர்புடைய மரபு தோஷம் இந்த ஜாதகத்தில் இல்லை — காலம் நடப்புத் தசை, கோசாரத்திலிருந்தே பார்க்கப்படுகிறது.')
      : T('By the common traditional rules no notable dosham stands out in this chart.', 'பொது மரபு விதிகளின்படி இந்த ஜாதகத்தில் குறிப்பிடத்தக்க தோஷம் எதுவும் இல்லை.'));
  } else {
    const key = items.filter((x) => x.severity !== 'mild').slice(0, 5);
    const minor = items.filter((x) => x.severity === 'mild');
    if (key.length) {
      P.push(T(`The main points, in order of importance: ${key.map((it, i) => `${i + 1}) ${it.name.en} — ${it.condition.en} [${SEVERITY[it.severity].en.toLowerCase()}]`).join('; ')}.`,
        `முக்கியமானவை, முக்கியத்துவ வரிசையில்: ${key.map((it, i) => `${i + 1}) ${it.name.ta} — ${it.condition.ta} [${SEVERITY[it.severity].ta}]`).join('; ')}.`));
    }
    if (minor.length) P.push(T(`Lighter notes: ${minor.map((it) => it.name.en + (it.disputed ? ' (traditional; some astrologers differ)' : '')).join(', ')}.`, `லேசான குறிப்புகள்: ${minor.map((it) => it.name.ta + (it.disputed ? ' (மரபு வழக்கு; சிலர் ஏற்பதில்லை)' : '')).join(', ')}.`));
    // How they combine
    const lagnaHit = items.some((it) => (it.kind === 'sanisevvai' && it.data.houses?.includes(1)) || (it.kind === 'sani' && it.data.house === 1) || (it.kind === 'rahuketu' && it.data.axis === '1-7'));
    const ll = items.find((it) => it.kind === 'lagnalord');
    const lagnaMal = diag.lagnaMalefics || [];
    if (lagnaHit && ll) {
      P.push(T(`How they combine: the Lagna itself carries ${lagnaMal.length > 1 ? `the malefics ${lagnaMal.join(' and ')}` : `the malefic ${lagnaMal[0] || 'Saturn'}`} and its lord ${ll.data.lord} sits in the ${ord(ll.data.house)}${ll.data.combust ? ', combust with the Sun' : ''}. A senior jothidar reads this as an effort-heavy life — results come, but after delay and persistence — and the areas below feel it most. ${FRAMING.delayNotDenial.en}`,
        `இவை சேரும் விதம்: லக்னத்திலேயே ${lagnaMal.length > 1 ? `பாபக் கிரகங்கள் (${lagnaMal.map(pTa).join(', ')})` : `பாபக் கிரகம் ${pTa(lagnaMal[0] || 'Saturn')}`}; லக்னாதிபதி ${pTa(ll.data.lord)} ${ll.data.house}-ம் வீட்டில்${ll.data.combust ? ', சூரியனுடன் அஸ்தங்கம்' : ''}. இதை முயற்சி மிகுந்த வாழ்க்கை என்று மூத்த ஜோதிடர் படிப்பார் — பலன் உண்டு, ஆனால் தாமதத்துக்கும் விடாமுயற்சிக்கும் பின்; கீழ்க்கண்ட துறைகளில் இது அதிகம் உணரப்படும். ${FRAMING.delayNotDenial.ta}`));
    }
    const byArea = (a) => items.filter((it) => it.areas.includes(a));
    const ch = byArea('children');
    if (ch.length && (ch.some((x) => x.severity !== 'mild') || ch.length >= 2)) {
      P.push(T(`Children: ${ch.map((x) => x.name.en).join(', ')} touch the 5th house / putra karaka. Tradition reads this combination as a delay in progeny — a delay, not a denial. ${DOSHAM_KINDS.putra.doctor.en}`,
        `குழந்தை பாக்கியம்: ${ch.map((x) => x.name.ta).join(', ')} — 5-ம் வீடு / புத்திர காரகரைத் தொடுகின்றன. இந்தச் சேர்க்கையை மரபு புத்திர பாக்கியத் தாமதமாகப் படிக்கும் — தாமதம் மட்டுமே, மறுப்பு அல்ல. ${DOSHAM_KINDS.putra.doctor.ta}`));
    }
    const mr = byArea('marriage');
    if (mr.length && (mr.some((x) => x.severity !== 'mild') || mr.length >= 2)) {
      // Already married: no "marriage after delay" or matching (வரன்) line — only married-life harmony.
      P.push(married
        ? T(`Married life: ${mr.map((x) => x.name.en).join(', ')} touch the 7th house / Venus. Tradition asks for patience, kind words and prayer together — they keep the bond strong.`,
          `மண வாழ்க்கை: ${mr.map((x) => x.name.ta).join(', ')} — 7-ம் வீடு / சுக்கிரனைத் தொடுகின்றன. பொறுமை, இனிய சொல், சேர்ந்து வழிபாடு — இவை உறவை உறுதியாக்கும் என்பது மரபு.`)
        : T(`Marriage: ${mr.map((x) => x.name.en).join(', ')} touch the 7th house / Venus. Tradition reads this as marriage coming after some delay; in matching, a partner with a similar placement balances it (dosha samyam).`,
          `திருமணம்: ${mr.map((x) => x.name.ta).join(', ')} — 7-ம் வீடு / சுக்கிரனைத் தொடுகின்றன. திருமணம் சற்றுத் தாமதித்து அமையும் என்பது மரபு வாசிப்பு; பொருத்தத்தில் இதே அமைப்புள்ள வரன் இதைச் சமன் செய்யும் (தோஷ சாம்யம்).`));
    }
    const ef = byArea('effort').concat(byArea('career')).filter((x, i, a) => a.indexOf(x) === i);
    if (ef.length >= 2 && !(lagnaHit && ll)) P.push(T(`Work and effort: ${ef.map((x) => x.name.en).join(', ')} — tradition reads steady results after sustained effort; shortcuts do not suit this chart.`, `வேலை, முயற்சி: ${ef.map((x) => x.name.ta).join(', ')} — தொடர் முயற்சிக்குப் பின் நிலையான பலன் என்பது மரபு வாசிப்பு; குறுக்கு வழி இந்த ஜாதகத்துக்கு ஏற்றதல்ல.`));
    // Cancellations
    const canc = items.filter((it) => it.cancellations.length);
    if (canc.length) P.push(T(`What softens it: ${canc.map((it) => `${it.name.en} — ${it.cancellations.map((c) => c.en).join('; ')}`).join(' · ')}.`, `தோஷத்தைக் குறைப்பவை: ${canc.map((it) => `${it.name.ta} — ${it.cancellations.map((c) => c.ta).join('; ')}`).join(' · ')}.`));
    // Timing
    const act = items.filter((it) => it.timing?.activeNow);
    const run = diag.running;
    const runTxt = run?.md ? T(`You are in ${run.md} Dasa${run.ad ? ` / ${run.ad} Bhukti` : ''}.`, `நீங்கள் இப்போது ${dasaTa(run.md)} தசை${run.ad ? ` / ${dasaTa(run.ad)} புக்தி` : ''}யில்.`) : T('', '');
    if (act.length) P.push(T(`Timing: ${runTxt.en} Active now: ${act.map((it) => `${it.name.en} (${it.timing.eases ? `eases after ${monthYear(it.timing.eases).en}` : 'running'})`).join('; ')}.`, `காலம்: ${runTxt.ta} இப்போது நடப்பில்: ${act.map((it) => `${it.name.ta} (${it.timing.eases ? `${monthYear(it.timing.eases).ta}-க்குப் பின் தணியும்` : 'நடப்பில்'})`).join('; ')}.`));
    else P.push(T(`Timing: ${runTxt.en} None of these is in focus in the running period — a good time to do the parigaram calmly, before they come into focus.`, `காலம்: ${runTxt.ta} நடப்புக் காலத்தில் இவை எதுவும் முன்னிலையில் இல்லை — அவை முன்னுக்கு வரும் முன், அமைதியாகப் பரிகாரம் செய்ய ஏற்ற நேரம்.`));
    if (diag.guru) P.push(diag.guru.text);
    // Remedy summary
    {
      const main = items.filter((x) => x.severity !== 'mild' || items.length <= 3);
      const planets = uniq(main.flatMap((x) => x.planets)).filter((k) => PLANET_NIVARTHI[k]).slice(0, 6);
      const pl = planets.map((k) => { const t = templeById(PLANET_NIVARTHI[k].temple); return T(`${k} — ${t.name.en}`, `${pTa(k)} — ${t.name.ta}`); });
      const extra = [];
      if (main.some((x) => ['rahuketu', 'kalasarpa', 'grahana'].includes(x.kind))) extra.push(T('for Rahu–Ketu: Sri Kalahasti', 'ராகு–கேதுவுக்கு: ஸ்ரீ காளஹஸ்தி'));
      if (main.some((x) => x.areas.includes('children'))) extra.push(T('for children: Thirukarugavur Garbharakshambigai', 'குழந்தை பாக்கியத்துக்கு: திருக்கருகாவூர் கர்ப்பரக்ஷாம்பிகை'));
      if (main.some((x) => x.areas.includes('marriage'))) extra.push(T('for marriage: Thirumanancheri Kalyanasundareswarar', 'திருமணத்துக்கு: திருமணஞ்சேரி கல்யாணசுந்தரேஸ்வரர்'));
      if (main.some((x) => x.kind === 'pitru')) extra.push(T('for ancestors: Rameswaram / Thilatharpanapuri on Amavasai', 'முன்னோர்களுக்கு: அமாவாசையில் ராமேஸ்வரம் / திலதர்ப்பணபுரி'));
      if (pl.length) P.push(T(`Nivarthi: ${extra.length ? `${joinT(extra, '; ', '; ').en}; and ` : ''}parigaram for ${planets.join(', ')} — ${joinT(pl, '; ', '; ').en}. Begin with the free weekly practice at home (lamp, hymn, charity) and add the temple visits on the planet's day.`,
        `நிவர்த்தி: ${extra.length ? `${joinT(extra, '; ', '; ').ta}; மேலும் ` : ''}${planets.map(pTa).join(', ')} கிரகங்களுக்குப் பரிகாரம் — ${joinT(pl, '; ', '; ').ta}. வீட்டில் இலவச வாராந்திர வழிபாட்டுடன் (தீபம், தோத்திரம், தானம்) தொடங்கி, கிரகத்துக்குரிய நாளில் கோவில் தரிசனம் சேர்த்துக்கொள்ளுங்கள்.`));
    }
  }
  if (diag.needsTime?.length) P.push(T(`With the birth time, Thunai can also read the Lagna-based doshams (${diag.needsTime.slice(0, 4).map((n) => n.en).join(', ')}…).`, `பிறந்த நேரம் தெரிந்தால் லக்ன அடிப்படையிலான தோஷங்களையும் (${diag.needsTime.slice(0, 4).map((n) => n.ta).join(', ')}…) பார்க்கலாம்.`));
  P.push(FRAMING.belief);
  return { title: T('Expert view', 'நிபுணர் பார்வை'), paras: P };
}

/** Every user-facing string the engine can produce for a diagnosis (for the prohibited-word scan in tests). */
export function allText(diag, opts = {}) {
  const out = [expertView(diag, opts)];
  for (const it of diag.items || []) out.push(it, nivarthiPlan(it));
  return out;
}
