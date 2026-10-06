// Age bands guide PRESENTATION, never destiny (Brief §18). Bands are interface defaults; the under-18
// boundary is an Indian policy/legal baseline that still requires legal review per launch jurisdiction.

export const AGE_POLICY_VERSION = 'age-policy-1.0.0';

// Output classes that must never appear for minors (in addition to the always-prohibited list).
export const MINOR_PROHIBITED = ['romantic_forecast', 'sexual_content', 'marriage_scheduling', 'frightening_dosha', 'adult_relationship_coaching'];

export const BAND_RULES = {
  '0-5': { readingLevel: 'caregiver', minor: true, independentChat: false, note: 'Caregiver-directed calendar, stories and observances only.' },
  '6-12': { readingLevel: 'simple', minor: true, independentChat: true, note: 'Friendship, feelings, kindness, study, play, body safety, trusted adults.' },
  '13-17': { readingLevel: 'teen', minor: true, independentChat: true, note: 'Emotions, boundaries, peers, pressure, online safety; non-graphic health info.' },
  'minor-unknown': { readingLevel: 'teen', minor: true, independentChat: true, note: 'Earlier minor signal without an exact age — treated as 13–17.' },
  '18-25': { readingLevel: 'adult', minor: false, independentChat: true, note: 'Adult autonomy; no assumption that everyone marries or has children.' },
  '26-59': { readingLevel: 'adult', minor: false, independentChat: true, note: 'Chosen goals; no gender/caste/religion destiny assignments.' },
  '60+': { readingLevel: 'adult', minor: false, independentChat: true, note: 'Same dignity; do not assume inability, dementia or loneliness.' },
  unknown: { readingLevel: 'general', minor: null, independentChat: true, note: 'General safe guidance; do not unlock adult-sensitive guidance.' },
};

export const bandRules = (band) => BAND_RULES[band] || BAND_RULES.unknown;
export const isMinorBand = (band) => bandRules(band).minor === true;

/** Extra prohibited output classes for a speaker band (unknown age is treated conservatively). */
export function bandProhibited(band) {
  const r = bandRules(band);
  return r.minor === false ? [] : MINOR_PROHIBITED;
}
