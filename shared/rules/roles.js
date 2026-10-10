// House-lord roles as distinct, neutral facts (brief §4). Nothing here produces a penalty, a
// warning, or any longevity / health / death statement. Interpretation is left to the approved
// tradition and the astrologer; the app shows ownership and placement accurately first.
import { RASIS } from '../astro.js';
import {
  T, fact, ord, taName, SEVEN, GRAHAS, KENDRA, TRIKONA, NATURAL_BENEFICS, modality, rasiOfHouse, houseFrom, makeContext,
} from './core.js';
import { defineRule, REL } from './define.js';
import { resolveProfile } from './profiles.js';

const common = { kind: 'role', fixtures: 'test/rules-roles.test.js', reference: 'lagna', relation: REL.placement };
const NEUTRAL = T('A house-lord fact from your chart — read it together with the whole chart; it is not a warning.', 'உங்கள் ஜாதகத்தின் பாவாதிபதி தகவல் — முழு ஜாதகத்துடன் சேர்த்துப் பாருங்கள்; இது எச்சரிக்கை அல்ல.');

/**
 * Functional benefic / malefic reference table for all 12 Lagnas (Parashari, as commonly summarised
 * from Laghu Parashari). Status 'proposed' — the master astrologer must review every row.
 */
export const FUNCTIONAL_TABLE = [
  { lagna: 0, benefics: ['Sun', 'Mars', 'Jupiter'], malefics: ['Mercury', 'Venus', 'Saturn'], yogakaraka: [] },
  { lagna: 1, benefics: ['Sun', 'Mercury', 'Saturn'], malefics: ['Moon', 'Jupiter', 'Venus'], yogakaraka: ['Saturn'] },
  { lagna: 2, benefics: ['Venus'], malefics: ['Sun', 'Mars', 'Jupiter'], yogakaraka: [] },
  { lagna: 3, benefics: ['Mars', 'Jupiter'], malefics: ['Mercury', 'Venus'], yogakaraka: ['Mars'] },
  { lagna: 4, benefics: ['Sun', 'Mars'], malefics: ['Mercury', 'Venus', 'Saturn'], yogakaraka: ['Mars'] },
  { lagna: 5, benefics: ['Venus'], malefics: ['Moon', 'Mars', 'Jupiter'], yogakaraka: [] },
  { lagna: 6, benefics: ['Mercury', 'Saturn'], malefics: ['Sun', 'Mars', 'Jupiter'], yogakaraka: ['Saturn'] },
  { lagna: 7, benefics: ['Sun', 'Moon', 'Jupiter'], malefics: ['Mercury', 'Venus', 'Saturn'], yogakaraka: [] },
  { lagna: 8, benefics: ['Sun', 'Mars'], malefics: ['Venus'], yogakaraka: [] },
  { lagna: 9, benefics: ['Mercury', 'Venus'], malefics: ['Moon', 'Mars', 'Jupiter'], yogakaraka: ['Venus'] },
  { lagna: 10, benefics: ['Venus', 'Saturn'], malefics: ['Moon', 'Mars', 'Jupiter'], yogakaraka: ['Venus'] },
  { lagna: 11, benefics: ['Moon', 'Mars'], malefics: ['Sun', 'Mercury', 'Venus', 'Saturn'], yogakaraka: [] },
];

export const BADHAKA_HOUSE = { movable: 11, fixed: 9, dual: 7 };

export const ROLE_RULES = [
  defineRule({ ...common, id: 'role.house_lords', name: T('House lords and placements', 'பாவ அதிபதிகளும் இருப்பிடமும்'), houses: [1, 5, 8, 9, 12],
    predicateText: 'For each house: its sign, the sign lord, the house where that lord sits, and the occupants. Lagna/5th/9th/8th/12th lords are shown as placement facts only (no categorical prediction such as "12th lord = foreign travel").',
    predicate: (ctx) => ({ present: ctx.hasLagna, facts: [], involved: [] }), explanation: NEUTRAL }),
  defineRule({ ...common, id: 'role.badhaka', name: T('Badhaka house and lord', 'பாதக ஸ்தானமும் அதிபதியும்'), houses: [7, 9, 11],
    predicateText: 'Badhaka house = 11th for a movable Lagna, 9th for a fixed Lagna, 7th for a dual Lagna. House, lord, occupants and associated planets (conjunct or aspecting the lord) are separate facts. No penalty or warning.',
    predicate: (ctx) => ({ present: ctx.hasLagna, facts: [], involved: [] }), explanation: NEUTRAL }),
  defineRule({ ...common, id: 'role.maraka', name: T('2nd and 7th house lords (Maraka houses in Parashari terms)', '2, 7-ம் அதிபதிகள் (பராசரி மாரக ஸ்தானங்கள்)'), houses: [2, 7],
    predicateText: '2nd lord and 7th lord with their placements, and the occupants of the 2nd and 7th, as separate facts. No secondary rule is applied. Never used for lifespan, health or death statements.',
    predicate: (ctx) => ({ present: ctx.hasLagna, facts: [], involved: [] }), explanation: NEUTRAL }),
  defineRule({ ...common, id: 'role.kendradhipathya', name: T('Functional benefic / malefic profile (Kendradhipathya)', 'செயல்பாட்டு சுப/பாப அட்டவணை (கேந்திராதிபத்யம்)'), houses: KENDRA,
    source: { text: 'Laghu Parashari (Jataka Chandrika) — as commonly summarised' },
    predicateText: 'Looks up the reviewed per-Lagna table of functional benefics, malefics and yogakaraka. Natural benefics ruling kendras are listed as a fact; no universal malefic penalty is applied.',
    predicate: (ctx) => ({ present: ctx.hasLagna, facts: [], involved: [] }), explanation: NEUTRAL }),
];

/**
 * Distinct house-lord role facts for one chart.
 * @returns {{available:boolean, profile:string, houses:Array, lords:Object, badhaka:Object, maraka:Object, kendradhipathya:Object, note:{en,ta}}}
 */
export function houseRoles(chart, { profile } = {}) {
  const pr = resolveProfile(profile);
  const ctx = makeContext(chart, pr);
  if (!ctx.hasLagna) return { available: false, profile: pr.id, reason: T('Birth time / Lagna not available — house roles need the Lagna.', 'பிறந்த நேரம் / லக்னம் இல்லை — பாவ அதிபதி விவரங்களுக்கு லக்னம் தேவை.') };
  const P = ctx.P, L = ctx.L;
  const placement = (k) => ({ planet: k, rasi: P[k].rasi, rasiName: T(RASIS[P[k].rasi].en, RASIS[P[k].rasi].ta), house: houseFrom(L, P[k].rasi), dignity: ctx.dignity(k) });
  const houses = Array.from({ length: 12 }, (_, i) => {
    const h = i + 1, rasi = rasiOfHouse(L, h), lord = RASIS[rasi].lord;
    return { house: h, rasi, rasiName: T(RASIS[rasi].en, RASIS[rasi].ta), lord, lordPlacement: placement(lord), occupants: ctx.occupants(h) };
  });
  const lordFact = (h, en, ta) => {
    const x = houses[h - 1];
    return { house: h, lord: x.lord, placement: x.lordPlacement, text: T(`${en}: ${x.lord} in the ${ord(x.lordPlacement.house)} house (${RASIS[x.lordPlacement.rasi].en})`, `${ta}: ${taName(x.lord)} ${x.lordPlacement.house}-ம் வீட்டில் (${RASIS[x.lordPlacement.rasi].ta})`) };
  };
  const lords = {
    ruleId: 'role.house_lords', status: 'proposed',
    lagna: lordFact(1, 'Lagna lord', 'லக்னாதிபதி'),
    fifth: lordFact(5, '5th lord', '5-ம் அதிபதி'),
    ninth: lordFact(9, '9th lord', '9-ம் அதிபதி'),
    eighth: lordFact(8, '8th lord', '8-ம் அதிபதி'),
    twelfth: lordFact(12, '12th lord', '12-ம் அதிபதி'),
    note: T('Ownership and placement only; interpretation needs the whole chart and the approved tradition.', 'அதிபத்தியம், இருப்பிடம் மட்டும்; பலன் முழு ஜாதகத்தையும் அங்கீகரிக்கப்பட்ட மரபையும் பொறுத்தது.'),
  };

  const mod = modality(L);
  const bh = BADHAKA_HOUSE[mod];
  const bLord = houses[bh - 1].lord;
  const badhaka = {
    ruleId: 'role.badhaka', status: 'proposed', scheme: pr.badhaka.scheme,
    lagnaModality: mod, house: bh, rasi: houses[bh - 1].rasi,
    lord: bLord, lordPlacement: houses[bh - 1].lordPlacement,
    occupants: houses[bh - 1].occupants,
    associatedPlanets: {
      conjunctWithLord: GRAHAS.filter((k) => ctx.conj(k, bLord)),
      aspectingLord: GRAHAS.filter((k) => k !== bLord && ctx.aspects(k, bLord)),
    },
    otherLordships: houses.filter((x) => x.lord === bLord && x.house !== bh).map((x) => x.house),
    facts: [fact(`Lagna is ${mod}; Badhaka house under the Tamil scheme used here is the ${ord(bh)}, ruled by ${bLord}`, `லக்னம் ${{ movable: 'சர', fixed: 'ஸ்திர', dual: 'உபய' }[mod]} ராசி; இங்கு பயன்படும் தமிழ் முறைப்படி பாதக ஸ்தானம் ${bh}, அதிபதி ${taName(bLord)}`)],
    note: NEUTRAL,
  };

  const marakaPart = (h) => ({ house: h, rasi: houses[h - 1].rasi, lord: houses[h - 1].lord, lordPlacement: houses[h - 1].lordPlacement, occupants: houses[h - 1].occupants });
  const maraka = { ruleId: 'role.maraka', status: 'proposed', second: marakaPart(2), seventh: marakaPart(7), note: NEUTRAL };

  const row = FUNCTIONAL_TABLE[L];
  const kendraLords = [...new Set([4, 7, 10].map((h) => houses[h - 1].lord))];
  const kendradhipathya = {
    ruleId: 'role.kendradhipathya', status: 'proposed', lagna: L,
    functional: { benefics: row.benefics, malefics: row.malefics, yogakaraka: row.yogakaraka, neutral: SEVEN.filter((k) => !row.benefics.includes(k) && !row.malefics.includes(k)) },
    naturalBeneficsRulingKendras: kendraLords.filter((k) => NATURAL_BENEFICS.includes(k)).map((k) => ({ planet: k, kendras: [4, 7, 10].filter((h) => houses[h - 1].lord === k), otherLordships: houses.filter((x) => x.lord === k && ![4, 7, 10].includes(x.house)).map((x) => x.house), trikonaToo: houses.some((x) => x.lord === k && TRIKONA.includes(x.house)) })),
    note: T('Reference table for the selected tradition — no universal penalty is applied to natural benefics ruling kendras.', 'தேர்ந்த மரபுக்கான குறிப்பு அட்டவணை — கேந்திர அதிபதியான சுபருக்குப் பொதுவான தண்டனை இல்லை.'),
  };
  return { available: true, profile: pr.id, lagna: L, houses, lords, badhaka, maraka, kendradhipathya, note: NEUTRAL };
}
