// Age bands guide PRESENTATION, never destiny (Brief §18). Bands are interface defaults; the under-18
// boundary is an Indian policy/legal baseline that still requires legal review per launch jurisdiction.

export const AGE_POLICY_VERSION = 'age-policy-1.0.0';

// The band rules live in shared/age-guard.js — the same module the phone uses offline — so both agree.
import { MINOR_PROHIBITED, BAND_RULES } from '../../shared/age-guard.js';

export { MINOR_PROHIBITED, BAND_RULES };

export const bandRules = (band) => BAND_RULES[band] || BAND_RULES.unknown;
export const isMinorBand = (band) => bandRules(band).minor === true;

/** Extra prohibited output classes for a speaker band (unknown age is treated conservatively). */
export function bandProhibited(band) {
  const r = bandRules(band);
  return r.minor === false ? [] : MINOR_PROHIBITED;
}
