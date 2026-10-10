// Yoga rules. Each predicate is pure and documented in plain words in `predicateText` so the
// master astrologer can approve or correct it. Every rule starts as 'proposed': AI may propose
// a rule, it may not certify its classical authenticity.
import {
  T, fact, ord, taName, KENDRA, TRIKONA, DUSTHANA, UPACHAYA, TARA, NATURAL_BENEFICS, NATURAL_MALEFICS,
  OWN, EXALT, DEBIL, lordOfRasi, rasiOfHouse, houseFrom, planetModifiers, modality,
} from './core.js';
import { defineRule, REL } from './define.js';

const V = (present, ...facts) => ({ present: !!present, facts });
const uniq = (a) => [...new Set(a)];
const list = (ks) => ks.join(', ');
const listTa = (ks) => ks.map(taName).join(', ');
const NO_LAGNA = () => ({ unavailable: true, facts: [fact('Birth time / Lagna not available — this rule needs the Lagna.', 'பிறந்த நேரம் / லக்னம் இல்லை — இந்த விதிக்கு லக்னம் தேவை.')] });
const PHALA6 = { text: 'Phaladeepika (Mantreswara)', passage: 'ch. 6 (Yoga adhyaya) — verse to be cited by reviewer' };
const BPHS = { text: 'Brihat Parashara Hora Shastra' };
const BPHS_PHALA = { text: 'Brihat Parashara Hora Shastra; Phaladeepika (Mantreswara)' };

/** Provisional definition of a "strong" lord, used by Lakshmi/Kahala/Sankha. Pending reviewer approval. */
export const STRONG_LORD_TEXT = 'own or exaltation sign, or placed in a kendra/trikona from Lagna; and neither debilitated nor combust';
function lordStrong(ctx, k) {
  const d = ctx.dignity(k);
  const h = ctx.houseOf(k, 'lagna');
  const ok = (d === 'own' || d === 'exalted' || KENDRA.includes(h) || TRIKONA.includes(h)) && d !== 'debilitated' && !ctx.combust(k).combust;
  return { ok, fact: fact(`${k} (${ok ? 'strong' : 'not strong'} by the provisional test: ${STRONG_LORD_TEXT}) — house ${h}${d ? `, ${d}` : ''}`, `${taName(k)} — ${ok ? 'பலம் உண்டு' : 'பலம் போதாது'} (தற்காலிக அளவுகோல்) — ${h}-ம் வீடு`) };
}
const mutualKendra = (ctx, a, b) => KENDRA.includes(houseFrom(ctx.P[a].rasi, ctx.P[b].rasi));

// ───────────────────────── Repaired existing yogas ─────────────────────────

const gajakesari = defineRule({
  id: 'yoga.gajakesari', legacyId: 'gajakesari',
  name: T('Gaja Kesari Yoga', 'கஜகேசரி யோகம்'),
  kind: 'yoga', reference: 'moon', planets: ['Jupiter', 'Moon'], houses: KENDRA, relation: REL.placement,
  source: { ...PHALA6 },
  predicateText: 'Jupiter in the 1st, 4th, 7th or 10th sign counted from the Moon.',
  predicate(ctx) {
    const h = ctx.houseOf('Jupiter', 'moon');
    return {
      variants: { kendraFromMoon: V(KENDRA.includes(h), fact(`Jupiter is in the ${ord(h)} from the Moon`, `குரு சந்திரனிலிருந்து ${h}-ம் இடத்தில்`)) },
      facts: [], involved: ['Jupiter', 'Moon'],
    };
  },
  exceptions: [
    { id: 'gk.bphs_extra_conditions', status: 'proposed', text: T('Some texts additionally require benefic aspect/association and Jupiter free of debilitation or combustion. Recorded here as strength modifiers, not as an exclusion.', 'சில நூல்கள் சுபர் பார்வை, குரு நீசம்/அஸ்தங்கம் இல்லாமை ஆகியவற்றையும் கேட்கின்றன — இங்கு பல மாற்றிகளாக மட்டும் குறிக்கப்பட்டுள்ளது.') },
  ],
  strengthModifiers(ctx) {
    const m = planetModifiers(ctx, 'Jupiter');
    const ph = ctx.moonPhase();
    m.push(ph.waxing
      ? { factor: 'moon_waxing', effect: 'supports', text: T('Moon is waxing (Shukla paksha)', 'வளர்பிறைச் சந்திரன்') }
      : { factor: 'moon_waning', effect: 'note', text: T('Moon is waning (Krishna paksha)', 'தேய்பிறைச் சந்திரன்') });
    if (ctx.houseOf('Jupiter', 'moon') === 1) m.push({ factor: 'same_sign', effect: 'note', text: T('Jupiter and Moon share the same sign', 'குருவும் சந்திரனும் ஒரே ராசியில்') });
    return m;
  },
  explanation: T('Jupiter in a kendra from the Moon: traditionally linked with respect, wisdom and lasting reputation.', 'சந்திரனுக்குக் கேந்திரத்தில் குரு: மதிப்பு, ஞானம், நிலையான புகழ் — பாரம்பரியக் கருத்து.'),
});

const budhaditya = defineRule({
  id: 'yoga.budhaditya', legacyId: 'budhaditya',
  name: T('Budha-Aditya Yoga', 'புத ஆதித்ய யோகம்'),
  kind: 'yoga', reference: 'lagna', planets: ['Sun', 'Mercury'], houses: [], relation: REL.conjunction,
  predicateText: 'Sun and Mercury in the same sign. Combustion and degree separation are reported as modifiers.',
  predicate(ctx) {
    const s = ctx.sep('Mercury', 'Sun');
    return {
      variants: { conjunction: V(ctx.conj('Sun', 'Mercury'), fact(`Sun and Mercury ${ctx.conj('Sun', 'Mercury') ? 'share' : 'do not share'} a sign; separation ${s.toFixed(1)}°`, `சூரியன்-புதன் ${ctx.conj('Sun', 'Mercury') ? 'ஒரே ராசியில்' : 'வெவ்வேறு ராசியில்'}; இடைவெளி ${s.toFixed(1)}°`)) },
      facts: [], involved: ['Sun', 'Mercury'], data: { separation: s },
    };
  },
  exceptions: [
    { id: 'ba.frequency', status: 'proposed', text: T('Very common: Mercury never moves more than about 28° from the Sun. A combust Mercury is reported as a modifier.', 'மிகப் பொதுவானது: புதன் சூரியனிடமிருந்து சுமார் 28°க்கு மேல் விலகுவதில்லை. அஸ்தங்க புதன் ஒரு மாற்றியாகக் குறிக்கப்படுகிறது.') },
  ],
  strengthModifiers(ctx) {
    const m = planetModifiers(ctx, 'Mercury', { dusthana: false });
    const c = ctx.combust('Mercury');
    if (!c.combust) m.push({ factor: 'mercury_outside_orb', effect: 'supports', text: T(`Mercury is ${c.sep.toFixed(1)}° from the Sun — outside the ${c.threshold}° combustion orb`, `புதன் சூரியனிடமிருந்து ${c.sep.toFixed(1)}° — அஸ்தங்க வரம்புக்கு (${c.threshold}°) வெளியே`) });
    return m;
  },
  explanation: T('Sun with Mercury: traditionally linked with sharp intellect, communication and learning.', 'சூரியனுடன் புதன்: கூர்மையான அறிவு, பேச்சுத் திறன், கல்வி — பாரம்பரியக் கருத்து.'),
});

const chandramangala = defineRule({
  id: 'yoga.chandramangala', legacyId: 'chandramangala',
  name: T('Chandra-Mangala Yoga', 'சந்திர மங்கள யோகம்'),
  kind: 'yoga', reference: 'moon', planets: ['Moon', 'Mars'], relation: REL.conjunction,
  defaultVariants: ['conjunction'],
  predicateText: 'Moon and Mars in the same sign. Variant (separate flag, off by default): Moon and Mars in mutual 7th aspect.',
  predicate(ctx) {
    const h = houseFrom(ctx.P.Moon.rasi, ctx.P.Mars.rasi);
    return {
      variants: {
        conjunction: V(h === 1, fact(`Mars is in the ${ord(h)} from the Moon`, `செவ்வாய் சந்திரனிலிருந்து ${h}-ம் இடத்தில்`)),
        mutualSeventh: V(h === 7, fact('Moon and Mars face each other (mutual 7th aspect)', 'சந்திரன்-செவ்வாய் சமசப்தமம் (பரஸ்பர 7-ம் பார்வை)')),
      },
      facts: [], involved: ['Moon', 'Mars'],
    };
  },
  strengthModifiers(ctx) {
    const m = planetModifiers(ctx, 'Mars', { dusthana: false, combust: false });
    if (!ctx.moonPhase().waxing) m.push({ factor: 'moon_waning', effect: 'note', text: T('Moon is waning', 'தேய்பிறைச் சந்திரன்') });
    return m;
  },
  explanation: T('Moon with Mars: traditionally linked with enterprise and earning through effort.', 'சந்திரனுடன் செவ்வாய்: முயற்சியால் சம்பாதிக்கும் திறன் — பாரம்பரியக் கருத்து.'),
});

const MAHAPURUSHA = { Mars: ['Ruchaka', 'ருசக'], Mercury: ['Bhadra', 'பத்ர'], Jupiter: ['Hamsa', 'ஹம்ஸ'], Venus: ['Malavya', 'மாளவ்ய'], Saturn: ['Sasa', 'சச'] };
const mahapurusha = Object.entries(MAHAPURUSHA).map(([k, [en, ta]]) => defineRule({
  id: `yoga.mahapurusha.${en.toLowerCase()}`, legacyId: `mahapurusha_${k}`,
  name: T(`${en} Yoga (Pancha Mahapurusha)`, `${ta} யோகம் (பஞ்ச மகாபுருஷ)`),
  kind: 'yoga', reference: 'lagna', planets: [k], houses: KENDRA, relation: REL.placement,
  source: { text: 'Brihat Parashara Hora Shastra; Phaladeepika (Mantreswara)' },
  defaultVariants: ['lagna'],
  predicateText: `${k} in its own or exaltation sign AND in a kendra (1/4/7/10) from Lagna. Moon-reference is a separate variant flag, off by default (the reference is never silently switched).`,
  predicate(ctx) {
    const d = ctx.dignity(k);
    const dig = d === 'own' || d === 'exalted';
    const hm = ctx.houseOf(k, 'moon');
    const variants = { moon: V(dig && KENDRA.includes(hm), fact(`${k} is ${d || 'not dignified'} and in the ${ord(hm)} from the Moon`, `${taName(k)} சந்திரனிலிருந்து ${hm}-ம் இடத்தில்`)) };
    if (ctx.hasLagna) {
      const hl = ctx.houseOf(k, 'lagna');
      variants.lagna = V(dig && KENDRA.includes(hl), fact(`${k} is ${d || 'not in own/exaltation sign'} and in the ${ord(hl)} from Lagna`, `${taName(k)} ${d === 'own' ? 'ஆட்சி' : d === 'exalted' ? 'உச்சம்' : 'ஆட்சி/உச்சம் இல்லை'}, லக்னத்திலிருந்து ${hl}-ம் வீட்டில்`));
    } else variants.lagna = { present: false, unavailable: true, facts: NO_LAGNA().facts };
    return { variants, facts: [], involved: [k] };
  },
  exceptions: [
    { id: 'pmp.strength_conditions', status: 'proposed', text: T('Texts differ on whether combustion, planetary war or association with the Sun/Moon reduces or removes the yoga. Reported as modifiers.', 'அஸ்தங்கம், கிரக யுத்தம், சூரிய/சந்திர சேர்க்கை யோகத்தைக் குறைக்குமா என்பதில் நூல்கள் வேறுபடுகின்றன — மாற்றிகளாகக் குறிக்கப்படுகின்றன.') },
  ],
  strengthModifiers(ctx) {
    const m = planetModifiers(ctx, k, { dusthana: false });
    for (const n of ['Sun', 'Moon', 'Rahu', 'Ketu']) if (ctx.conj(k, n)) m.push({ factor: `with_${n}`, effect: 'note', text: T(`${k} shares a sign with ${n}`, `${taName(k)} ${taName(n)} உடன் ஒரே ராசியில்`) });
    return m;
  },
  explanation: T(`${k} strong in a kendra: traditionally linked with natural leadership in its areas.`, `${taName(k)} கேந்திரத்தில் பலம்: அதன் துறைகளில் தலைமைப் பண்பு — பாரம்பரியக் கருத்து.`),
}));

const yogakaraka = defineRule({
  id: 'role.yogakaraka', legacyId: (res) => `yogakaraka_${res.data.planet}`, showWithYogas: true,
  name: T('Yogakaraka', 'யோககாரகர்'),
  title: (res) => T(`${res.data.planet} is your Yogakaraka`, `${taName(res.data.planet)} யோககாரகர்`),
  kind: 'role', reference: 'lagna', planets: ['Mars', 'Venus', 'Saturn'], houses: [4, 5, 7, 9, 10], relation: REL.placement,
  predicateText: 'A single planet that rules both a kendra (4/7/10) and a trikona (5/9) counted from Lagna.',
  predicate(ctx) {
    if (!ctx.hasLagna) return NO_LAGNA();
    for (const k of ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn']) {
      const ruled = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter((h) => ctx.lord(h) === k);
      if (ruled.some((h) => [4, 7, 10].includes(h)) && ruled.some((h) => [5, 9].includes(h))) {
        return { present: true, facts: [fact(`${k} rules houses ${ruled.join(' & ')} from Lagna`, `${taName(k)} லக்னத்திலிருந்து ${ruled.join(' & ')}-ம் வீடுகளின் அதிபதி`)], involved: [k], data: { planet: k, ruled } };
      }
    }
    return { present: false, facts: [fact('No single planet rules both a kendra and a trikona for this Lagna', 'இந்த லக்னத்திற்கு ஒரே கிரகம் கேந்திர-திரிகோண அதிபதியாக இல்லை')], involved: [], data: {} };
  },
  strengthModifiers: (ctx, res) => planetModifiers(ctx, res.data.planet),
  explanation: T('This planet rules both a kendra and a trikona for your Lagna; tradition links its periods with growth.', 'உங்கள் லக்னத்திற்கு இந்தக் கிரகம் கேந்திர, திரிகோண அதிபதி; இதன் காலங்கள் வளர்ச்சியுடன் தொடர்புடையவை என்பது பாரம்பரியம்.'),
});

/** Lord-association rules (Raja, Dhana): every relation and Lagna-lord inclusion is a separate flag. */
function lordAssociation({ id, legacyId, name, groupA, groupB, lagnaWith, explanation, predicateText }) {
  return defineRule({
    id, legacyId, name, kind: 'yoga', reference: 'lagna', houses: uniq([...groupA, ...groupB]),
    relation: { type: 'conjunction | mutual-aspect | exchange', definition: `${REL.conjunction.definition} ${REL.mutualAspect.definition} ${REL.exchange.definition}` },
    defaultVariants: ['conjunction'],
    predicateText,
    predicate(ctx) {
      if (!ctx.hasLagna) return NO_LAGNA();
      const A = uniq(groupA.map((h) => ctx.lord(h))), B = uniq(groupB.map((h) => ctx.lord(h)));
      const pairs = [];
      for (const a of A) for (const b of B) if (a !== b && !pairs.some(([x, y]) => (x === b && y === a))) pairs.push([a, b]);
      const by = (fn) => pairs.filter(([a, b]) => fn(a, b));
      const pf = (ps, en, taWord) => ps.map(([a, b]) => fact(`${a} (lord of ${groupLabel(ctx, a, groupA)}) ${en} ${b} (lord of ${groupLabel(ctx, b, groupB)})`, `${taName(a)} ${taWord} ${taName(b)}`));
      const conj = by(ctx.conj), mut = by(ctx.mutualAspect), ex = by(ctx.exchange);
      const ll = ctx.lord(1);
      const others = uniq(lagnaWith.map((h) => ctx.lord(h))).filter((k) => k !== ll);
      const llPairs = others.filter((k) => ctx.conj(ll, k) || ctx.mutualAspect(ll, k) || ctx.exchange(ll, k)).map((k) => [ll, k]);
      const variants = {
        conjunction: V(conj.length, ...pf(conj, 'is conjunct', 'உடன் சேர்க்கை')),
        mutualAspect: V(mut.length, ...pf(mut, 'is in mutual aspect with', 'உடன் பரஸ்பரப் பார்வை')),
        exchange: V(ex.length, ...pf(ex, 'exchanges signs with', 'உடன் பரிவர்த்தனை')),
        lagnaLord: V(llPairs.length, ...llPairs.map(([a, b]) => fact(`Lagna lord ${a} is associated (conjunction, mutual aspect or exchange) with ${b} (lord of ${groupLabel(ctx, b, lagnaWith)})`, `லக்னாதிபதி ${taName(a)} — ${taName(b)} உடன் தொடர்பு`))),
      };
      const pairsBy = { conjunction: conj, mutualAspect: mut, exchange: ex, lagnaLord: llPairs };
      return { variants, facts: [], involved: [], data: { pairs: pairsBy } };
    },
    activation(ctx, res) {
      const out = [];
      for (const v of res.enabledPresent) for (const [a, b] of res.data.pairs[v] || []) out.push(a, b);
      return uniq(out);
    },
    strengthModifiers(ctx, res) {
      const m = [];
      for (const v of res.enabledPresent) for (const [a, b] of res.data.pairs[v] || []) for (const k of [a, b]) for (const x of planetModifiers(ctx, k)) if (!m.some((y) => y.factor === x.factor)) m.push(x);
      return m;
    },
    explanation,
  });
}
function groupLabel(ctx, k, group) {
  return group.filter((h) => ctx.lord(h) === k).map(ord).join('/');
}

const raja = lordAssociation({
  id: 'yoga.raja', legacyId: 'raja',
  name: T('Raja Yoga (kendra–trikona lords)', 'ராஜ யோகம் (கேந்திர–திரிகோண அதிபதிகள்)'),
  groupA: [4, 7, 10], groupB: [5, 9], lagnaWith: [4, 5, 7, 9, 10],
  predicateText: 'A lord of the 4th, 7th or 10th and a different lord of the 5th or 9th (from Lagna) are related. Separate flags: conjunction (default), mutual aspect, exchange, and Lagna-lord inclusion (Lagna lord with any 4/5/7/9/10 lord).',
  explanation: T('A kendra lord is linked with a trikona lord: traditionally associated with status and success after effort.', 'கேந்திர அதிபதியும் திரிகோண அதிபதியும் தொடர்பு: முயற்சிக்குப் பின் அந்தஸ்தும் வெற்றியும் — பாரம்பரியக் கருத்து.'),
});
const dhana = lordAssociation({
  id: 'yoga.dhana', legacyId: 'dhana',
  name: T('Dhana Yoga (wealth lords)', 'தன யோகம்'),
  groupA: [2, 11], groupB: [5, 9], lagnaWith: [2, 11],
  predicateText: 'A lord of the 2nd or 11th and a different lord of the 5th or 9th (from Lagna) are related. Separate flags: conjunction (default), mutual aspect, exchange, and Lagna-lord inclusion (Lagna lord with the 2nd/11th lord).',
  explanation: T('Wealth lords are linked with fortune lords: traditionally associated with steady growth of savings.', 'தன அதிபதிகள் பாக்கிய அதிபதிகளுடன் தொடர்பு: சேமிப்பின் நிலையான வளர்ச்சி — பாரம்பரியக் கருத்து.'),
});

const ADHI_HOUSES = [6, 7, 8];
const adhi = defineRule({
  id: 'yoga.adhi', legacyId: 'adhi',
  name: T('Adhi Yoga', 'அதி யோகம்'),
  kind: 'yoga', reference: 'moon', planets: NATURAL_BENEFICS, houses: ADHI_HOUSES, relation: REL.placement,
  source: { ...BPHS_PHALA },
  defaultVariants: ['full', 'partial'],
  predicateText: 'Natural benefics (Mercury, Jupiter, Venus) in the 6th, 7th or 8th from the Moon. Flags: full = all three; partial = exactly two; fromLagna = two or more in 6/7/8 from Lagna (separate, off by default).',
  predicate(ctx) {
    const inM = NATURAL_BENEFICS.filter((k) => ADHI_HOUSES.includes(ctx.houseOf(k, 'moon')));
    const variants = {
      full: V(inM.length === 3, fact(`Benefics in 6/7/8 from the Moon: ${list(inM) || 'none'}`, `சந்திரனுக்கு 6/7/8-ல் சுபர்: ${listTa(inM) || 'இல்லை'}`)),
      partial: V(inM.length === 2, fact(`${inM.length} of 3 benefics in 6/7/8 from the Moon`, `3-ல் ${inM.length} சுபர் சந்திரனுக்கு 6/7/8-ல்`)),
    };
    if (ctx.hasLagna) {
      const inL = NATURAL_BENEFICS.filter((k) => ADHI_HOUSES.includes(ctx.houseOf(k, 'lagna')));
      variants.fromLagna = V(inL.length >= 2, fact(`Benefics in 6/7/8 from Lagna: ${list(inL) || 'none'}`, `லக்னத்திற்கு 6/7/8-ல் சுபர்: ${listTa(inL) || 'இல்லை'}`));
    }
    return { variants, facts: [], involved: ['Moon', ...inM], data: { fromMoon: inM } };
  },
  exceptions: [
    { id: 'adhi.unafflicted', status: 'proposed', text: T('Some texts require the benefics to be free of malefic association; reported as a modifier, not an exclusion.', 'சில நூல்கள் சுபர்கள் பாபர் சேர்க்கையின்றி இருக்க வேண்டும் என்கின்றன — இங்கு மாற்றியாக மட்டும்.') },
  ],
  strengthModifiers(ctx, res) {
    const m = [];
    for (const k of res.data.fromMoon || []) {
      for (const x of planetModifiers(ctx, k, { dusthana: false })) m.push(x);
      for (const n of NATURAL_MALEFICS) if (ctx.conj(k, n)) m.push({ factor: `${k}_with_${n}`, effect: 'weakens', text: T(`${k} shares a sign with ${n}`, `${taName(k)} ${taName(n)} உடன்`) });
    }
    return m;
  },
  explanation: T('Benefics around the 6th–8th from the Moon: traditionally linked with comfort, good helpers and respect.', 'சந்திரனுக்கு 6–8-ல் சுபர்கள்: சுகம், நல்ல உதவியாளர்கள், மதிப்பு — பாரம்பரியக் கருத்து.'),
});

// Kemadruma and the other Chandra yogas (planets counted: Mars, Mercury, Jupiter, Venus, Saturn).
function flank(ctx, reference) {
  const second = TARA.filter((k) => ctx.houseOf(k, reference) === 2);
  const twelfth = TARA.filter((k) => ctx.houseOf(k, reference) === 12);
  return { second, twelfth };
}
const flankFacts = (f, refEn, refTa) => [
  fact(`2nd from the ${refEn}: ${list(f.second) || 'empty'}`, `${refTa}க்கு 2-ல்: ${listTa(f.second) || 'யாருமில்லை'}`),
  fact(`12th from the ${refEn}: ${list(f.twelfth) || 'empty'}`, `${refTa}க்கு 12-ல்: ${listTa(f.twelfth) || 'யாருமில்லை'}`),
];

const KEMA_CANCEL = [
  { id: 'conjunct_moon', text: T('A planet (Mars–Saturn) in the same sign as the Moon', 'சந்திரனுடன் ஒரு கிரகம் (செவ்வாய்–சனி) சேர்க்கை'), test: (ctx) => TARA.filter((k) => ctx.conj(k, 'Moon')) },
  { id: 'kendra_from_moon', text: T('A planet (Mars–Saturn) in a kendra (4/7/10) from the Moon', 'சந்திரனுக்குக் கேந்திரத்தில் (4/7/10) ஒரு கிரகம்'), test: (ctx) => TARA.filter((k) => [4, 7, 10].includes(ctx.houseOf(k, 'moon'))) },
  { id: 'moon_kendra_from_lagna', text: T('The Moon in a kendra from Lagna', 'லக்னத்திற்கு கேந்திரத்தில் சந்திரன்'), test: (ctx) => (ctx.hasLagna && KENDRA.includes(ctx.houseOf('Moon', 'lagna')) ? ['Moon'] : []) },
  { id: 'jupiter_aspects_moon', text: T('Jupiter aspects the Moon', 'குரு சந்திரனைப் பார்க்கிறார்'), test: (ctx) => (ctx.aspects('Jupiter', 'Moon') ? ['Jupiter'] : []) },
];

const kemadruma = defineRule({
  id: 'yoga.kemadruma', legacyId: 'kemadruma', tone: 'mild',
  name: T('Kemadruma (mild)', 'கேமத்ரும (லேசானது)'),
  kind: 'yoga', reference: 'moon', planets: ['Moon', ...TARA], houses: [2, 12], relation: REL.placement,
  source: { ...BPHS_PHALA },
  predicateText: 'No planet among Mars, Mercury, Jupiter, Venus, Saturn in the 2nd or 12th from the Moon (Sun and nodes not counted). Traditional cancellations are checked and listed separately; the configuration itself is not erased.',
  predicate(ctx) {
    const f = flank(ctx, 'moon');
    const conditions = KEMA_CANCEL.map((c) => { const who = c.test(ctx); return { id: `kemadruma.cancel.${c.id}`, status: 'proposed', satisfied: who.length > 0, planets: who, text: c.text }; });
    return {
      variants: { standard: V(!f.second.length && !f.twelfth.length, ...flankFacts(f, 'Moon', 'சந்திரன்')) },
      facts: [], involved: ['Moon'],
      cancellation: { conditions, anySatisfied: conditions.some((c) => c.satisfied) },
    };
  },
  exceptions: KEMA_CANCEL.map((c) => ({ id: `kemadruma.cancel.${c.id}`, status: 'proposed', text: c.text })),
  strengthModifiers(ctx, res) {
    const m = (res.cancellation?.conditions || []).filter((c) => c.satisfied).map((c) => ({ factor: c.id, effect: 'supports', text: T(`Traditional cancellation: ${c.text.en}`, `பாரம்பரிய நிவர்த்தி: ${c.text.ta}`) }));
    if (ctx.moonPhase().waxing) m.push({ factor: 'moon_waxing', effect: 'supports', text: T('Moon is waxing', 'வளர்பிறைச் சந்திரன்') });
    return m;
  },
  explanation: T('The Moon has no neighbouring planet on either side. Tradition advises good company and a calm routine; prayer to Ambal on Mondays steadies the mind.', 'சந்திரனின் இருபுறமும் கிரகம் இல்லை. நல்ல நட்பு, அமைதியான வாழ்க்கை முறை; திங்கள் அம்பாள் வழிபாடு மனதைப் பலப்படுத்தும்.'),
});

const NB_COND = {
  dispositor_kendra_lagna: T('Lord of the debilitation sign is in a kendra from Lagna', 'நீச வீட்டு அதிபதி லக்னத்திற்கு கேந்திரத்தில்'),
  dispositor_kendra_moon: T('Lord of the debilitation sign is in a kendra from the Moon', 'நீச வீட்டு அதிபதி சந்திரனுக்குக் கேந்திரத்தில்'),
  exalt_lord_kendra_lagna: T('Lord of the planet\'s exaltation sign is in a kendra from Lagna', 'உச்ச வீட்டு அதிபதி லக்னத்திற்கு கேந்திரத்தில்'),
  exalt_lord_kendra_moon: T('Lord of the planet\'s exaltation sign is in a kendra from the Moon', 'உச்ச வீட்டு அதிபதி சந்திரனுக்குக் கேந்திரத்தில்'),
  exalting_planet_kendra: T('The planet exalted in this sign is in a kendra from Lagna or Moon', 'இந்த ராசியில் உச்சம் பெறும் கிரகம் லக்னம்/சந்திரனுக்குக் கேந்திரத்தில்'),
  aspected_by_dispositor: T('The debilitated planet is aspected by the lord of its sign', 'நீச கிரகத்தை அதன் வீட்டு அதிபதி பார்க்கிறார்'),
  conjunct_dispositor: T('The debilitated planet is with the lord of its sign', 'நீச கிரகம் அதன் வீட்டு அதிபதியுடன்'),
  dispositor_exalt_lord_mutual_kendra: T('Lords of the debilitation and exaltation signs are in mutual kendras', 'நீச வீட்டு அதிபதியும் உச்ச வீட்டு அதிபதியும் பரஸ்பர கேந்திரத்தில்'),
  exalted_in_navamsa: T('The planet is exalted in the navamsa (D9)', 'நவாம்சத்தில் உச்சம்'),
};
const neechabhanga = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'].map((k) => defineRule({
  id: `yoga.neechabhanga.${k.toLowerCase()}`, legacyId: `neechabhanga_${k}`,
  name: T(`Neecha Bhanga — ${k} (cancellation of debilitation)`, `நீச பங்கம் — ${taName(k)} (நீச நிவர்த்தி)`),
  kind: 'yoga', reference: 'lagna', planets: [k], houses: KENDRA, relation: REL.placement,
  source: { ...BPHS_PHALA },
  predicateText: `${k} is debilitated (${['Mesham', 'Rishabam', 'Mithunam', 'Kadagam', 'Simmam', 'Kanni', 'Thulam', 'Vrischikam', 'Dhanusu', 'Magaram', 'Kumbam', 'Meenam'][DEBIL[k]]}) AND at least one enabled classical cancellation condition holds. Each condition is a separate flag. This is reported as Neecha Bhanga only — never automatically as a Raja Yoga.`,
  predicate(ctx) {
    const P = ctx.P;
    const deb = P[k].rasi === DEBIL[k];
    const disp = lordOfRasi(DEBIL[k]);
    const exLord = lordOfRasi(EXALT[k]);
    const exalting = Object.keys(EXALT).find((x) => EXALT[x] === DEBIL[k]);
    const inK = (x, ref) => (ref === 'lagna' && !ctx.hasLagna ? false : KENDRA.includes(ctx.houseOf(x, ref)));
    const c = {
      dispositor_kendra_lagna: inK(disp, 'lagna'),
      dispositor_kendra_moon: inK(disp, 'moon'),
      exalt_lord_kendra_lagna: inK(exLord, 'lagna'),
      exalt_lord_kendra_moon: inK(exLord, 'moon'),
      exalting_planet_kendra: !!exalting && (inK(exalting, 'lagna') || inK(exalting, 'moon')),
      aspected_by_dispositor: ctx.aspects(disp, k),
      conjunct_dispositor: ctx.conj(disp, k),
      dispositor_exalt_lord_mutual_kendra: disp !== exLord && mutualKendra(ctx, disp, exLord),
      exalted_in_navamsa: typeof P[k].navamsaRasi === 'number' && P[k].navamsaRasi === EXALT[k],
    };
    const variants = Object.fromEntries(Object.entries(c).map(([id, ok]) => [id, { present: deb && ok, facts: [fact(`${NB_COND[id].en}: ${ok ? 'yes' : 'no'}`, `${NB_COND[id].ta}: ${ok ? 'ஆம்' : 'இல்லை'}`)] }]));
    return {
      variants,
      facts: [fact(`${k} ${deb ? 'is' : 'is not'} in its debilitation sign`, `${taName(k)} ${deb ? 'நீச ராசியில் உள்ளது' : 'நீச ராசியில் இல்லை'}`)],
      involved: uniq([k, disp, exLord]), data: { debilitated: deb, dispositor: disp, exaltationLord: exLord, exaltingPlanet: exalting || null },
      notRajaYoga: true,
    };
  },
  exceptions: Object.entries(NB_COND).map(([id, text]) => ({ id: `neechabhanga.${id}`, status: 'proposed', text })),
  strengthModifiers(ctx, res) {
    const m = [{ factor: 'conditions_met', effect: 'note', text: T(`${res.enabledPresent.length} cancellation condition(s) met: ${res.enabledPresent.map((v) => NB_COND[v].en).join('; ')}`, `${res.enabledPresent.length} நிவர்த்தி நிபந்தனை(கள்): ${res.enabledPresent.map((v) => NB_COND[v].ta).join('; ')}`) }];
    const c = ctx.combust(k);
    if (c.combust) m.push({ factor: `${k}_combust`, effect: 'weakens', text: T(`${k} is also combust`, `${taName(k)} அஸ்தங்கமும் கூட`) });
    m.push({ factor: 'not_raja_yoga', effect: 'note', text: T('A cancellation of debilitation is not by itself a strong Raja Yoga.', 'நீச பங்கம் தானாகவே வலுவான ராஜ யோகம் ஆகாது.') });
    return m;
  },
  explanation: T(`${k} is debilitated, and the listed traditional cancellation conditions are met: what starts hard can turn into steady strength with effort.`, `${taName(k)} நீசம்; பட்டியலிட்ட பாரம்பரிய நிவர்த்தி நிபந்தனைகள் உள்ளன: கடினமாகத் தொடங்குவது முயற்சியால் பலமாக மாறலாம்.`),
}));

// Viparita split into Harsha / Sarala / Vimala.
const VIPARITA = [[6, 'harsha', 'Harsha', 'ஹர்ஷ'], [8, 'sarala', 'Sarala', 'சரள'], [12, 'vimala', 'Vimala', 'விமல']];
const viparita = VIPARITA.map(([h, id, en, ta]) => defineRule({
  id: `yoga.viparita.${id}`, legacyId: id,
  name: T(`${en} Yoga (Viparita Raja Yoga)`, `${ta} யோகம் (விபரீத ராஜ யோகம்)`),
  kind: 'yoga', reference: 'lagna', houses: DUSTHANA, relation: REL.placement,
  source: { ...PHALA6 },
  predicateText: `The lord of the ${ord(h)} house (from Lagna) is placed in the 6th, 8th or 12th house.`,
  predicate(ctx) {
    if (!ctx.hasLagna) return NO_LAGNA();
    const lord = ctx.lord(h);
    const at = ctx.houseOf(lord, 'lagna');
    return { present: DUSTHANA.includes(at), facts: [fact(`${ord(h)} lord ${lord} is in the ${ord(at)} house`, `${h}-ம் அதிபதி ${taName(lord)} ${at}-ம் வீட்டில்`)], involved: [lord], data: { lord, house: at } };
  },
  exceptions: [
    { id: `viparita.${id}.association`, status: 'proposed', text: T('Some authorities require the lord to be free of association with other (non-dusthana) lords. Not applied here.', 'சில நூல்கள் இந்த அதிபதி மற்ற அதிபதிகளுடன் தொடர்பின்றி இருக்க வேண்டும் என்கின்றன — இங்கு பயன்படுத்தப்படவில்லை.') },
  ],
  strengthModifiers(ctx, res) {
    const m = planetModifiers(ctx, res.data.lord, { dusthana: false });
    const ll = ctx.lord(1);
    if (ll !== res.data.lord && ctx.conj(ll, res.data.lord)) m.push({ factor: 'with_lagna_lord', effect: 'note', text: T('Shares a sign with the Lagna lord', 'லக்னாதிபதியுடன் ஒரே ராசியில்') });
    return m;
  },
  explanation: T(`The ${ord(h)} lord sits in a dusthana: tradition says difficulties tend to cancel each other, and one rises after obstacles.`, `${h}-ம் அதிபதி மறைவு ஸ்தானத்தில்: தடைகள் ஒன்றையொன்று நீக்கி, தடைகளுக்குப் பின் உயர்வு என்பது பாரம்பரியம்.`),
}));

// ───────────────────────── First 20 priority yogas (section 5) ─────────────────────────

const chandra = [
  ['sunapha', 'Sunapha', 'சுனபா', (f) => f.second.length && !f.twelfth.length, 'Planet(s) among Mars–Saturn in the 2nd from the Moon and none in the 12th (if both are occupied it is Durudhara). Flag `inclusive`: 2nd occupied regardless of the 12th (off by default).', (f) => f.second.length > 0,
    T('Planets in the 2nd from the Moon: traditionally linked with self-earned wealth and a good name.', 'சந்திரனுக்கு 2-ல் கிரகம்: சுயமாகச் சம்பாதிக்கும் செல்வம், நற்பெயர் — பாரம்பரியக் கருத்து.')],
  ['anapha', 'Anapha', 'அனபா', (f) => f.twelfth.length && !f.second.length, 'Planet(s) among Mars–Saturn in the 12th from the Moon and none in the 2nd. Flag `inclusive`: 12th occupied regardless of the 2nd (off by default).', (f) => f.twelfth.length > 0,
    T('Planets in the 12th from the Moon: traditionally linked with good health, dignity and a contented nature.', 'சந்திரனுக்கு 12-ல் கிரகம்: ஆரோக்கியம், கண்ணியம், திருப்தியான மனம் — பாரம்பரியக் கருத்து.')],
  ['durudhara', 'Durudhara', 'துருதுரா', (f) => f.second.length && f.twelfth.length, 'Planet(s) among Mars–Saturn in BOTH the 2nd and the 12th from the Moon.', null,
    T('Planets on both sides of the Moon: traditionally linked with comforts, generosity and support from others.', 'சந்திரனின் இருபுறமும் கிரகம்: வசதி, தாராள மனம், மற்றவர் ஆதரவு — பாரம்பரியக் கருத்து.')],
].map(([id, en, ta, test, text, inclusive, explanation]) => defineRule({
  id: `yoga.${id}`, legacyId: id, name: T(`${en} Yoga`, `${ta} யோகம்`),
  kind: 'yoga', reference: 'moon', planets: ['Moon', ...TARA], houses: [2, 12], relation: REL.placement,
  source: { ...BPHS_PHALA }, defaultVariants: ['standard'], predicateText: text,
  predicate(ctx) {
    const f = flank(ctx, 'moon');
    const variants = { standard: V(test(f), ...flankFacts(f, 'Moon', 'சந்திரன்')) };
    if (inclusive) variants.inclusive = V(inclusive(f));
    return { variants, facts: [], involved: uniq(['Moon', ...f.second, ...f.twelfth]), data: f };
  },
  strengthModifiers(ctx, res) { return [...res.data.second, ...res.data.twelfth].flatMap((k) => planetModifiers(ctx, k, { dusthana: false })); },
  explanation,
}));

const surya = [
  ['vesi', 'Vesi', 'வேசி', (f) => f.second.length && !f.twelfth.length, 'Planet(s) among Mars–Saturn (not Moon, not nodes) in the 2nd from the Sun and none in the 12th.',
    T('A planet in the 2nd from the Sun: traditionally linked with truthfulness and balanced effort.', 'சூரியனுக்கு 2-ல் கிரகம்: உண்மை, சமநிலையான முயற்சி — பாரம்பரியக் கருத்து.')],
  ['vasi', 'Vasi', 'வாசி', (f) => f.twelfth.length && !f.second.length, 'Planet(s) among Mars–Saturn in the 12th from the Sun and none in the 2nd.',
    T('A planet in the 12th from the Sun: traditionally linked with skill and generosity.', 'சூரியனுக்கு 12-ல் கிரகம்: திறமை, தாராளம் — பாரம்பரியக் கருத்து.')],
  ['ubhayachari', 'Ubhayachari', 'உபயசாரி', (f) => f.second.length && f.twelfth.length, 'Planet(s) among Mars–Saturn in BOTH the 2nd and the 12th from the Sun.',
    T('Planets on both sides of the Sun: traditionally linked with eloquence and a well-supported life.', 'சூரியனின் இருபுறமும் கிரகம்: சொல்வன்மை, ஆதரவான வாழ்க்கை — பாரம்பரியக் கருத்து.')],
].map(([id, en, ta, test, text, explanation]) => defineRule({
  id: `yoga.${id}`, legacyId: id, name: T(`${en} Yoga`, `${ta} யோகம்`),
  kind: 'yoga', reference: 'sun', planets: ['Sun', ...TARA], houses: [2, 12], relation: REL.placement,
  source: { ...BPHS_PHALA }, predicateText: text,
  predicate(ctx) {
    const f = flank(ctx, 'sun');
    return { variants: { standard: V(test(f), ...flankFacts(f, 'Sun', 'சூரியன்')) }, facts: [], involved: uniq(['Sun', ...f.second, ...f.twelfth]), data: f };
  },
  strengthModifiers(ctx, res) { return [...res.data.second, ...res.data.twelfth].flatMap((k) => planetModifiers(ctx, k, { dusthana: false })); },
  explanation,
}));

/** All sign exchanges between house lords (from Lagna). */
export function exchanges(ctx) {
  if (!ctx.hasLagna) return [];
  const out = [];
  for (let h1 = 1; h1 <= 12; h1++) {
    for (let h2 = h1 + 1; h2 <= 12; h2++) {
      const a = ctx.lord(h1), b = ctx.lord(h2);
      if (a === b) continue;
      if (ctx.P[a].rasi === rasiOfHouse(ctx.L, h2) && ctx.P[b].rasi === rasiOfHouse(ctx.L, h1)) {
        const type = [h1, h2].some((h) => DUSTHANA.includes(h)) ? 'dainya' : [h1, h2].includes(3) ? 'khala' : 'maha';
        out.push({ houses: [h1, h2], planets: [a, b], type });
      }
    }
  }
  return out;
}
const parivartana = [
  ['maha', 'Maha', 'மகா', 'An exchange of signs between the lords of two houses, both from {1,2,4,5,7,9,10,11}.',
    T('Two good-house lords exchange signs: traditionally linked with prosperity and support.', 'இரு நல்ல வீட்டு அதிபதிகள் பரிவர்த்தனை: வளம், ஆதரவு — பாரம்பரியக் கருத்து.')],
  ['khala', 'Khala', 'கல', 'An exchange of signs involving the 3rd lord, with no 6th/8th/12th lord involved.',
    T('An exchange involving the 3rd lord: tradition links it with mixed results that steady with courage and effort.', '3-ம் அதிபதி பரிவர்த்தனை: தைரியமும் முயற்சியும் கொண்டு நிலைபெறும் கலவையான பலன் — பாரம்பரியக் கருத்து.')],
  ['dainya', 'Dainya', 'தைன்ய', 'An exchange of signs involving a 6th, 8th or 12th lord.',
    T('An exchange involving a 6th/8th/12th lord: tradition links it with ups and downs before stability — patient, steady work is the way.', '6/8/12 அதிபதி பரிவர்த்தனை: நிலைபெறுவதற்கு முன் ஏற்ற இறக்கம் — பொறுமையான தொடர் உழைப்பே வழி என்பது பாரம்பரியம்.')],
].map(([id, en, ta, text, explanation]) => defineRule({
  id: `yoga.parivartana.${id}`, legacyId: `parivartana_${id}`, tone: id === 'maha' ? 'good' : 'mild',
  name: T(`${en} Parivartana Yoga`, `${ta} பரிவர்த்தனை யோகம்`),
  kind: 'yoga', reference: 'lagna', relation: REL.exchange,
  source: { ...PHALA6 }, predicateText: text,
  predicate(ctx) {
    if (!ctx.hasLagna) return NO_LAGNA();
    const ex = exchanges(ctx).filter((e) => e.type === id);
    return {
      present: ex.length > 0,
      facts: ex.map((e) => fact(`${e.planets[0]} (lord of ${ord(e.houses[0])}) and ${e.planets[1]} (lord of ${ord(e.houses[1])}) exchange signs`, `${taName(e.planets[0])} (${e.houses[0]}-ம் அதிபதி) — ${taName(e.planets[1])} (${e.houses[1]}-ம் அதிபதி) பரிவர்த்தனை`)),
      involved: uniq(ex.flatMap((e) => e.planets)), data: { exchanges: ex },
    };
  },
  strengthModifiers(ctx, res) { return res.data.exchanges.flatMap((e) => e.planets.flatMap((k) => planetModifiers(ctx, k, { dusthana: false }))); },
  explanation,
}));

const lakshmi = defineRule({
  id: 'yoga.lakshmi', legacyId: 'lakshmi',
  name: T('Lakshmi Yoga', 'லட்சுமி யோகம்'),
  kind: 'yoga', reference: 'lagna', houses: [1, 4, 5, 7, 9, 10], relation: REL.placement,
  source: { ...BPHS_PHALA },
  predicateText: `The 9th lord is in its own or exaltation sign AND placed in a kendra or trikona from Lagna, AND the Lagna lord is strong (provisional: ${STRONG_LORD_TEXT}).`,
  predicate(ctx) {
    if (!ctx.hasLagna) return NO_LAGNA();
    const l9 = ctx.lord(9), l1 = ctx.lord(1);
    const h9 = ctx.houseOf(l9, 'lagna'), d9 = ctx.dignity(l9);
    const ok9 = (d9 === 'own' || d9 === 'exalted') && (KENDRA.includes(h9) || TRIKONA.includes(h9));
    const s1 = lordStrong(ctx, l1);
    return { present: ok9 && s1.ok, facts: [fact(`9th lord ${l9}: house ${h9}${d9 ? `, ${d9}` : ''}`, `9-ம் அதிபதி ${taName(l9)}: ${h9}-ம் வீடு`), s1.fact], involved: uniq([l9, l1]) };
  },
  strengthModifiers(ctx, res) { return res.involved.flatMap((k) => planetModifiers(ctx, k)); },
  explanation: T('A dignified 9th lord in a good house with a strong Lagna lord: traditionally linked with fortune and generosity.', 'பலமான 9-ம் அதிபதி நல்ல வீட்டில், லக்னாதிபதியும் பலம்: பாக்கியம், தாராளம் — பாரம்பரியக் கருத்து.'),
});

const SARASWATI_HOUSES = [1, 2, 4, 5, 7, 9, 10];
const saraswati = defineRule({
  id: 'yoga.saraswati', legacyId: 'saraswati',
  name: T('Saraswati Yoga', 'சரஸ்வதி யோகம்'),
  kind: 'yoga', reference: 'lagna', planets: ['Jupiter', 'Venus', 'Mercury'], houses: SARASWATI_HOUSES, relation: REL.placement,
  source: { ...PHALA6 },
  predicateText: 'Jupiter, Venus and Mercury are each in a kendra, a trikona or the 2nd from Lagna, AND Jupiter is in its own, exaltation or a natural friend\'s sign.',
  predicate(ctx) {
    if (!ctx.hasLagna) return NO_LAGNA();
    const placed = ['Jupiter', 'Venus', 'Mercury'].map((k) => [k, ctx.houseOf(k, 'lagna')]);
    const allIn = placed.every(([, h]) => SARASWATI_HOUSES.includes(h));
    const dj = ctx.dignity('Jupiter');
    const jOk = ['own', 'exalted', 'friend'].includes(dj);
    return { present: allIn && jOk, facts: [fact(`Houses — ${placed.map(([k, h]) => `${k} ${h}`).join(', ')}`, `வீடுகள் — ${placed.map(([k, h]) => `${taName(k)} ${h}`).join(', ')}`), fact(`Jupiter's sign: ${dj || 'neutral/enemy'}`, `குருவின் ராசி நிலை: ${dj || 'சமம்/பகை'}`)], involved: ['Jupiter', 'Venus', 'Mercury'] };
  },
  strengthModifiers(ctx) { return ['Jupiter', 'Venus', 'Mercury'].flatMap((k) => planetModifiers(ctx, k, { dusthana: false })); },
  explanation: T('Jupiter, Venus and Mercury well placed: traditionally linked with learning, the arts and eloquence.', 'குரு, சுக்கிரன், புதன் நல்ல இடங்களில்: கல்வி, கலை, சொல்வன்மை — பாரம்பரியக் கருத்து.'),
});

const amala = defineRule({
  id: 'yoga.amala', legacyId: 'amala',
  name: T('Amala Yoga', 'அமல யோகம்'),
  kind: 'yoga', reference: 'lagna', planets: NATURAL_BENEFICS, houses: [10], relation: REL.placement,
  source: { ...PHALA6 }, defaultVariants: ['lagna', 'moon'],
  predicateText: 'A natural benefic (Mercury, Jupiter or Venus) occupies the 10th from Lagna (flag `lagna`) or the 10th from the Moon (flag `moon`). Flag `exclusive` (off by default): the 10th from Lagna holds benefics and no malefic.',
  predicate(ctx) {
    const inM = NATURAL_BENEFICS.filter((k) => ctx.houseOf(k, 'moon') === 10);
    const variants = { moon: V(inM.length, fact(`Benefics in the 10th from the Moon: ${list(inM) || 'none'}`, `சந்திரனுக்கு 10-ல் சுபர்: ${listTa(inM) || 'இல்லை'}`)) };
    let inL = [];
    if (ctx.hasLagna) {
      inL = NATURAL_BENEFICS.filter((k) => ctx.houseOf(k, 'lagna') === 10);
      const mal = NATURAL_MALEFICS.filter((k) => ctx.houseOf(k, 'lagna') === 10);
      variants.lagna = V(inL.length, fact(`Benefics in the 10th from Lagna: ${list(inL) || 'none'}`, `லக்னத்திற்கு 10-ல் சுபர்: ${listTa(inL) || 'இல்லை'}`));
      variants.exclusive = V(inL.length && !mal.length, fact(`Malefics in the 10th from Lagna: ${list(mal) || 'none'}`, `லக்னத்திற்கு 10-ல் பாபர்: ${listTa(mal) || 'இல்லை'}`));
    }
    return { variants, facts: [], involved: uniq([...inL, ...inM]) };
  },
  strengthModifiers(ctx, res) { return res.involved.flatMap((k) => planetModifiers(ctx, k, { dusthana: false })); },
  explanation: T('A benefic in the 10th: traditionally linked with a clean reputation and lasting good deeds.', '10-ல் சுபர்: களங்கமற்ற புகழ், நிலையான நற்செயல் — பாரம்பரியக் கருத்து.'),
});

const vasumathi = defineRule({
  id: 'yoga.vasumathi', legacyId: 'vasumathi',
  name: T('Vasumathi Yoga', 'வசுமதி யோகம்'),
  kind: 'yoga', reference: 'lagna', planets: NATURAL_BENEFICS, houses: UPACHAYA, relation: REL.placement,
  source: { ...PHALA6 }, defaultVariants: ['lagna', 'moon'],
  predicateText: 'All three natural benefics (Mercury, Jupiter, Venus) occupy upachaya houses (3/6/10/11) from Lagna (flag `lagna`) or from the Moon (flag `moon`).',
  predicate(ctx) {
    const inU = (ref) => NATURAL_BENEFICS.filter((k) => UPACHAYA.includes(ctx.houseOf(k, ref)));
    const m = inU('moon');
    const variants = { moon: V(m.length === 3, fact(`Benefics in upachaya from the Moon: ${list(m) || 'none'}`, `சந்திரனுக்கு உபசயத்தில் சுபர்: ${listTa(m) || 'இல்லை'}`)) };
    if (ctx.hasLagna) { const l = inU('lagna'); variants.lagna = V(l.length === 3, fact(`Benefics in upachaya from Lagna: ${list(l) || 'none'}`, `லக்னத்திற்கு உபசயத்தில் சுபர்: ${listTa(l) || 'இல்லை'}`)); }
    return { variants, facts: [], involved: NATURAL_BENEFICS };
  },
  explanation: T('Benefics in houses of growth: traditionally linked with steadily increasing wealth.', 'வளர்ச்சி வீடுகளில் சுபர்கள்: படிப்படியாக உயரும் செல்வம் — பாரம்பரியக் கருத்து.'),
});

const parvata = defineRule({
  id: 'yoga.parvata', legacyId: 'parvata',
  name: T('Parvata Yoga', 'பர்வத யோகம்'),
  kind: 'yoga', reference: 'lagna', houses: [1, 4, 6, 7, 8, 10, 12], relation: REL.placement,
  source: { ...BPHS }, defaultVariants: ['beneficKendra'],
  predicateText: 'Flag `beneficKendra` (default): at least one natural benefic in a kendra from Lagna AND the 6th and 8th are empty or hold no natural malefic. Flag `lordsMutualKendra` (off by default): Lagna lord and 12th lord in mutual kendras.',
  predicate(ctx) {
    if (!ctx.hasLagna) return NO_LAGNA();
    const bk = NATURAL_BENEFICS.filter((k) => KENDRA.includes(ctx.houseOf(k, 'lagna')));
    const mal68 = NATURAL_MALEFICS.filter((k) => [6, 8].includes(ctx.houseOf(k, 'lagna')));
    const l1 = ctx.lord(1), l12 = ctx.lord(12);
    const mk = l1 !== l12 && mutualKendra(ctx, l1, l12);
    return {
      variants: {
        beneficKendra: V(bk.length && !mal68.length, fact(`Benefics in kendras: ${list(bk) || 'none'}`, `கேந்திரத்தில் சுபர்: ${listTa(bk) || 'இல்லை'}`), fact(`Malefics in the 6th/8th: ${list(mal68) || 'none'}`, `6/8-ல் பாபர்: ${listTa(mal68) || 'இல்லை'}`)),
        lordsMutualKendra: V(mk, fact(`Lagna lord ${l1} and 12th lord ${l12} ${mk ? 'are' : 'are not'} in mutual kendras`, `லக்னாதிபதி ${taName(l1)}, 12-ம் அதிபதி ${taName(l12)} — பரஸ்பர கேந்திரம் ${mk ? 'உண்டு' : 'இல்லை'}`)),
      },
      facts: [], involved: uniq([...bk, l1]),
    };
  },
  explanation: T('Benefics hold the angles with the 6th and 8th clear: traditionally linked with stature and a generous nature.', 'கேந்திரங்களில் சுபர், 6/8 தெளிவு: உயர்வு, தாராள மனம் — பாரம்பரியக் கருத்து.'),
});

const kahala = defineRule({
  id: 'yoga.kahala', legacyId: 'kahala',
  name: T('Kahala Yoga', 'காகள யோகம்'),
  kind: 'yoga', reference: 'lagna', houses: [1, 4, 9, 10], relation: REL.placement,
  source: { ...BPHS }, defaultVariants: ['lordsMutualKendra'],
  predicateText: `Flag \`lordsMutualKendra\` (default): 4th and 9th lords (different planets) in mutual kendras AND Lagna lord strong (provisional: ${STRONG_LORD_TEXT}). Flag \`fourthLordDignified\` (off by default): 4th lord in own/exaltation sign and conjunct or aspected by the 10th lord.`,
  predicate(ctx) {
    if (!ctx.hasLagna) return NO_LAGNA();
    const l4 = ctx.lord(4), l9 = ctx.lord(9), l10 = ctx.lord(10), l1 = ctx.lord(1);
    const s1 = lordStrong(ctx, l1);
    const mk = l4 !== l9 && mutualKendra(ctx, l4, l9);
    const d4 = ctx.dignity(l4);
    const alt = (d4 === 'own' || d4 === 'exalted') && l4 !== l10 && (ctx.conj(l4, l10) || ctx.aspects(l10, l4));
    return {
      variants: {
        lordsMutualKendra: V(mk && s1.ok, fact(`4th lord ${l4} and 9th lord ${l9} ${mk ? 'are' : 'are not'} in mutual kendras`, `4-ம் அதிபதி ${taName(l4)}, 9-ம் அதிபதி ${taName(l9)} — பரஸ்பர கேந்திரம் ${mk ? 'உண்டு' : 'இல்லை'}`), s1.fact),
        fourthLordDignified: V(alt, fact(`4th lord ${l4}${d4 ? ` ${d4}` : ''}; 10th lord ${l10} ${alt ? 'joins/aspects it' : 'does not join/aspect it'}`, `4-ம் அதிபதி ${taName(l4)}; 10-ம் அதிபதி ${taName(l10)}`)),
      },
      facts: [], involved: uniq([l4, l9, l1]),
    };
  },
  explanation: T('The 4th and 9th lords support each other: traditionally linked with courage, initiative and leadership.', '4, 9-ம் அதிபதிகள் ஒருவரையொருவர் ஆதரிக்கின்றனர்: தைரியம், முன்முயற்சி, தலைமை — பாரம்பரியக் கருத்து.'),
});

const chamara = defineRule({
  id: 'yoga.chamara', legacyId: 'chamara',
  name: T('Chamara Yoga', 'சாமர யோகம்'),
  kind: 'yoga', reference: 'lagna', houses: [1, 7, 9, 10], relation: REL.aspect,
  source: { ...BPHS }, defaultVariants: ['lagnaLordExalted'],
  predicateText: 'Flag `lagnaLordExalted` (default): Lagna lord exalted, in a kendra from Lagna, and aspected by Jupiter. Flag `twoBenefics` (off by default): two or more natural benefics together in the 1st, 7th, 9th or 10th.',
  predicate(ctx) {
    if (!ctx.hasLagna) return NO_LAGNA();
    const l1 = ctx.lord(1);
    const ex = ctx.dignity(l1) === 'exalted', inK = KENDRA.includes(ctx.houseOf(l1, 'lagna'));
    const jAsp = l1 !== 'Jupiter' && ctx.aspects('Jupiter', l1);
    const groups = [1, 7, 9, 10].map((h) => [h, NATURAL_BENEFICS.filter((k) => ctx.houseOf(k, 'lagna') === h)]).filter(([, ks]) => ks.length >= 2);
    return {
      variants: {
        lagnaLordExalted: V(ex && inK && jAsp, fact(`Lagna lord ${l1}: ${ex ? 'exalted' : 'not exalted'}, house ${ctx.houseOf(l1, 'lagna')}, ${jAsp ? '' : 'not '}aspected by Jupiter`, `லக்னாதிபதி ${taName(l1)}: ${ex ? 'உச்சம்' : 'உச்சம் இல்லை'}, குரு பார்வை ${jAsp ? 'உண்டு' : 'இல்லை'}`)),
        twoBenefics: V(groups.length, ...groups.map(([h, ks]) => fact(`${list(ks)} together in the ${ord(h)}`, `${listTa(ks)} ${h}-ல் சேர்ந்து`))),
      },
      facts: [], involved: uniq([l1, 'Jupiter', ...groups.flatMap(([, ks]) => ks)]),
    };
  },
  explanation: T('A dignified Lagna lord blessed by Jupiter: traditionally linked with honour, learning and eloquence.', 'குருவின் அருள் பெற்ற பலமான லக்னாதிபதி: மரியாதை, கல்வி, சொல்வன்மை — பாரம்பரியக் கருத்து.'),
});

const sankha = defineRule({
  id: 'yoga.sankha', legacyId: 'sankha',
  name: T('Sankha Yoga', 'சங்க யோகம்'),
  kind: 'yoga', reference: 'lagna', houses: [1, 5, 6, 9, 10], relation: REL.placement,
  source: { ...BPHS }, defaultVariants: ['lordsMutualKendra'],
  predicateText: `Flag \`lordsMutualKendra\` (default): 5th and 6th lords (different planets) in mutual kendras AND Lagna lord strong (provisional: ${STRONG_LORD_TEXT}). Flag \`lagnaTenthMovable\` (off by default): Lagna lord and 10th lord together in a movable sign AND 9th lord strong.`,
  predicate(ctx) {
    if (!ctx.hasLagna) return NO_LAGNA();
    const l5 = ctx.lord(5), l6 = ctx.lord(6), l1 = ctx.lord(1), l10 = ctx.lord(10), l9 = ctx.lord(9);
    const s1 = lordStrong(ctx, l1), s9 = lordStrong(ctx, l9);
    const mk = l5 !== l6 && mutualKendra(ctx, l5, l6);
    const together = l1 === l10 || ctx.conj(l1, l10);
    const alt = together && modality(ctx.P[l1].rasi) === 'movable' && s9.ok;
    return {
      variants: {
        lordsMutualKendra: V(mk && s1.ok, fact(`5th lord ${l5} and 6th lord ${l6} ${mk ? 'are' : 'are not'} in mutual kendras`, `5-ம் அதிபதி ${taName(l5)}, 6-ம் அதிபதி ${taName(l6)} — பரஸ்பர கேந்திரம் ${mk ? 'உண்டு' : 'இல்லை'}`), s1.fact),
        lagnaTenthMovable: V(alt, fact(`Lagna lord ${l1} and 10th lord ${l10} ${together ? 'together' : 'apart'}; sign is ${modality(ctx.P[l1].rasi)}`, `லக்னாதிபதி ${taName(l1)}, 10-ம் அதிபதி ${taName(l10)}`), s9.fact),
      },
      facts: [], involved: uniq([l5, l6, l1]),
    };
  },
  explanation: T('The 5th and 6th lords support each other with a strong Lagna lord: traditionally linked with a kind, principled and long-active life.', '5, 6-ம் அதிபதிகள் ஆதரவு, பலமான லக்னாதிபதி: கருணை, நெறி, நீடித்த செயல்பாடு — பாரம்பரியக் கருத்து.'),
});

/** Ordered list of yoga rules (repaired existing first, then the section-5 priority list). */
export const YOGA_RULES = [
  gajakesari, budhaditya, chandramangala, ...mahapurusha, yogakaraka, raja, dhana, ...viparita, adhi,
  ...neechabhanga, kemadruma,
  ...chandra, ...surya, ...parivartana, lakshmi, saraswati, amala, vasumathi, parvata, kahala, chamara, sankha,
];

export const PRIORITY_20 = [
  'yoga.sunapha', 'yoga.anapha', 'yoga.durudhara', 'yoga.vesi', 'yoga.vasi', 'yoga.ubhayachari',
  'yoga.viparita.harsha', 'yoga.viparita.sarala', 'yoga.viparita.vimala',
  'yoga.parivartana.maha', 'yoga.parivartana.khala', 'yoga.parivartana.dainya',
  'yoga.lakshmi', 'yoga.saraswati', 'yoga.amala', 'yoga.vasumathi', 'yoga.parvata', 'yoga.kahala', 'yoga.chamara', 'yoga.sankha',
];
