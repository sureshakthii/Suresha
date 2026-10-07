// Chevvai (Mars) dosham and Rahu–Ketu dosham as registry rules. Each Chevvai exception is its own
// rule with a status and a reason; exceptions are LISTED, and cancel only when the selected profile
// explicitly applies them (none do by default). Reference points (Lagna / Moon) are separate facts.
import { T, fact, ord, taName } from './core.js';
import { defineRule, REL } from './define.js';

const common = { kind: 'dosha', fixtures: 'test/rules-doshas.test.js', source: { text: 'Tamil regional marriage-matching convention' } };
const REF_LABEL = { lagna: T('Lagna', 'லக்னம்'), moon: T('Moon', 'சந்திரன்'), venus: T('Venus', 'சுக்கிரன்') };

function referenceFacts(ctx, planet, houses, refs) {
  const out = {};
  for (const ref of refs) {
    if (ref === 'lagna' && !ctx.hasLagna) { out.lagna = { present: false, unavailable: true, house: null, facts: [fact('Lagna not available', 'லக்னம் இல்லை')] }; continue; }
    const from = ref === 'venus' ? ctx.P.Venus.rasi : ctx.refRasi(ref);
    const h = ((ctx.P[planet].rasi - from + 12) % 12) + 1;
    out[ref] = { present: houses.includes(h), house: h, facts: [fact(`${planet} is in the ${ord(h)} from the ${REF_LABEL[ref].en}`, `${taName(planet)} ${REF_LABEL[ref].ta}த்திலிருந்து ${h}-ம் இடம்`)] };
  }
  return out;
}

export const CHEVVAI_RULE = defineRule({
  ...common,
  id: 'dosha.chevvai', legacyId: 'chevvai',
  name: T('Chevvai dosham', 'செவ்வாய் தோஷம்'),
  reference: 'lagna', planets: ['Mars'], houses: [2, 4, 7, 8, 12], relation: REL.placement,
  predicateText: 'Mars in the 2nd, 4th, 7th, 8th or 12th counted from each enabled reference (profile default: Lagna and Moon, each a separate flag). Exceptions are separate rules and are not auto-applied.',
  enabledVariants: (profile) => profile.chevvai.references,
  predicate(ctx) {
    const refs = ['lagna', 'moon', 'venus'];
    return { variants: referenceFacts(ctx, 'Mars', ctx.profile.chevvai.houses, refs), facts: [], involved: ['Mars'] };
  },
  explanation: T('Mars in a marriage-sensitive house from the reference point. Common, and compared like-with-like in matching. Not a cause for fear.', 'குறிப்பிட்ட வீடுகளில் செவ்வாய். இது பொதுவானது; பொருத்தத்தில் ஒத்ததோடு ஒப்பிடப்படுகிறது. பயப்பட வேண்டியதில்லை.'),
});

/** Each Chevvai exception: a separately identified, separately approvable rule. */
export const CHEVVAI_EXCEPTIONS = [
  {
    id: 'dosha.chevvai.exc.own_exalted', test: (P) => [0, 7, 9].includes(P.Mars.rasi),
    name: T('Mars in own sign or exalted (Mesham, Vrischikam, Magaram)', 'செவ்வாய் ஆட்சி/உச்சம் பெற்றது'),
    reason: T('A dignified Mars is traditionally held to act constructively.', 'பலமான செவ்வாய் நன்மை செய்யும் என்பது பாரம்பரியக் கருத்து.'),
  },
  {
    id: 'dosha.chevvai.exc.simha_kumbha', test: (P) => [4, 10].includes(P.Mars.rasi),
    name: T('Mars in Simha or Kumbha', 'சிம்மம் / கும்பத்தில் செவ்வாய்'),
    reason: T('A regional convention lists these two signs as exempt; the textual basis needs citation.', 'இவ்விரு ராசிகளும் விலக்கு என்பது பிராந்திய வழக்கம்; நூல் ஆதாரம் தேவை.'),
  },
  {
    id: 'dosha.chevvai.exc.jupiter_conjunct', test: (P) => P.Jupiter.rasi === P.Mars.rasi,
    name: T('Jupiter with Mars', 'குருவுடன் செவ்வாய் சேர்க்கை'),
    reason: T('Jupiter\'s association is traditionally held to soften Mars.', 'குருவின் சேர்க்கை செவ்வாயை மென்மையாக்கும் என்பது பாரம்பரியக் கருத்து.'),
  },
  {
    id: 'dosha.chevvai.exc.second_mithuna_kanni', test: (P) => !!P.Lagna && ((P.Mars.rasi - P.Lagna.rasi + 12) % 12) + 1 === 2 && [2, 5].includes(P.Mars.rasi),
    name: T('Mars in the 2nd (from Lagna) in Mithuna or Kanni', 'மிதுனம்/கன்னியில் 2-ல் செவ்வாய்'),
    reason: T('A house-and-sign specific exemption from the Tamil tradition; applies to the Lagna reference only.', 'லக்ன அடிப்படையிலான வீடு-ராசி சார்ந்த தமிழ் மரபு விலக்கு.'),
  },
].map((e) => Object.freeze({
  ...defineRule({
    ...common, id: e.id, name: e.name, reference: 'lagna', planets: ['Mars'], appliesTo: 'dosha.chevvai', role: 'exception',
    predicateText: e.name.en,
    predicate: (ctx) => ({ present: e.test(ctx.P), facts: [fact(e.name.en, e.name.ta)], involved: ['Mars'] }),
    explanation: e.reason,
  }),
  test: e.test, reason: e.reason,
}));

export const RAHU_KETU_RULE = defineRule({
  ...common,
  id: 'dosha.rahuketu', legacyId: 'rahuKetu',
  name: T('Rahu-Ketu dosham', 'ராகு-கேது தோஷம்'),
  reference: 'lagna', planets: ['Rahu', 'Ketu'], houses: [1, 2, 7, 8], relation: REL.placement,
  predicateText: 'Rahu or Ketu in the 1st, 2nd, 7th or 8th counted from each enabled reference (profile default: Lagna only; Moon is a separate flag).',
  enabledVariants: (profile) => profile.rahuKetu.references,
  predicate(ctx) {
    const houses = ctx.profile.rahuKetu.houses;
    const variants = {};
    for (const ref of ['lagna', 'moon']) {
      const r = referenceFacts(ctx, 'Rahu', houses, [ref])[ref], k = referenceFacts(ctx, 'Ketu', houses, [ref])[ref];
      variants[ref] = r.unavailable ? r : { present: r.present || k.present, rahuHouse: r.house, ketuHouse: k.house, facts: [...r.facts, ...k.facts] };
    }
    return { variants, facts: [], involved: ['Rahu', 'Ketu'] };
  },
  explanation: T('A node in a marriage-sensitive house from the reference point. Compared only with the same dosham in the partner\'s chart.', 'குறிப்பிட்ட வீடுகளில் ராகு/கேது. துணையின் ஜாதகத்தில் உள்ள இதே தோஷத்துடன் மட்டுமே ஒப்பிடப்படும்.'),
});

export const CHEVVAI_RULES = [CHEVVAI_RULE, ...CHEVVAI_EXCEPTIONS, RAHU_KETU_RULE];
