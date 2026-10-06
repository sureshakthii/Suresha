// defineRule(): fills the registry defaults for a rule object and freezes it.
// Every field listed in docs/RULE-REGISTRY.md is present on every rule after this call.
import { T } from './core.js';

export const PARASHARI_PROFILES = ['parashari-tamil-default', 'parashari-tamil-review'];
export const UNCITED = 'to be cited by reviewer';

/** Relation definitions used by the rules (one sentence each, shown to the reviewer). */
export const REL = {
  conjunction: { type: 'conjunction', definition: 'Conjunction = both planets in the same sidereal sign (rasi); no degree orb.' },
  aspect: { type: 'aspect', definition: 'Full graha drishti counted inclusively in signs: all planets 7th; Mars 4/8; Jupiter 5/9; Saturn 3/10; Rahu/Ketu 5/9 when the profile enables node aspects.' },
  mutualAspect: { type: 'mutual-aspect', definition: 'Each planet casts a full aspect (table above) on the sign occupied by the other.' },
  exchange: { type: 'exchange', definition: 'Parivartana = each planet occupies a sign owned by the other.' },
  placement: { type: 'placement', definition: 'Whole-sign house counted inclusively from the stated reference (house 1 = the reference sign itself).' },
};

export function defineRule(def) {
  const rule = {
    version: '0.1.0',
    profiles: PARASHARI_PROFILES,
    status: 'proposed',
    reviewer: null,
    reference: 'lagna',
    planets: [],
    houses: [],
    relation: REL.placement,
    exceptions: [],
    strengthModifiers: () => [],
    activation: null,
    fixtures: 'test/rules-yogas.test.js',
    tone: 'good',
    disputed: false,
    profileFlag: null,
    /** 'free-only': the UI may pair the rule only with free practices. 'none': never pair with any remedy. */
    remedyPolicy: 'free-only',
    defaultVariants: null,
    ...def,
    source: { text: UNCITED, edition: UNCITED, passage: UNCITED, ...(def.source || {}) },
  };
  if (!rule.explanation) rule.explanation = T('', '');
  return Object.freeze(rule);
}
