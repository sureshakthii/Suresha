// Tradition profiles. A profile selects which reviewed rules, variants, reference points and
// thresholds apply. One profile is selected per report (and once per couple) and is shown with it.
// No profile mixes Parashari, KP, regional conventions and numerology into a single verdict.
import { T } from './core.js';

export const DEFAULT_PROFILE_ID = 'parashari-tamil-default';

const BASE = {
  id: DEFAULT_PROFILE_ID,
  baseId: DEFAULT_PROFILE_ID,
  name: T('Parashari — Tamil default', 'பராசரி — தமிழ் இயல்பு முறை'),
  version: '2026.10-draft',
  status: 'proposed',
  /** Disputed / anxiety-provoking labels (Kala Sarpa, Pitru, Shrapit, Punarphoo, Grahana). OFF by default. */
  showDisputed: false,
  /** Rahu/Ketu aspects 5/7/9 as in the existing engine table. */
  nodeAspects: true,
  /** Combustion orbs in degrees (common Surya Siddhanta-style values; `…Retro` used when retrograde). */
  combustion: { Moon: 12, Mars: 17, Mercury: 14, MercuryRetro: 12, Jupiter: 11, Venus: 10, VenusRetro: 8, Saturn: 15 },
  /**
   * Per-rule enabled variants. A rule reports every variant it checked; only enabled variants make
   * the configuration "present". Rules not listed use their own `defaultVariants`.
   */
  variants: {},
  /** Rule ids switched off for this profile. */
  disabledRules: [],
  chevvai: {
    references: ['lagna', 'moon'],
    houses: [2, 4, 7, 8, 12],
    /** Exception rule ids that cancel under this profile. Empty: exceptions are listed, never auto-applied. */
    applyExceptions: [],
  },
  rahuKetu: { references: ['lagna'], houses: [1, 2, 7, 8] },
  badhaka: { scheme: 'movable11-fixed9-dual7' },
};

export const PROFILES = {
  [DEFAULT_PROFILE_ID]: BASE,
  // Same rules with the disputed labels visible — for astrologer review screens only.
  'parashari-tamil-review': {
    ...BASE,
    id: 'parashari-tamil-review',
    baseId: 'parashari-tamil-review',
    name: T('Parashari — Tamil (review mode: disputed labels visible)', 'பராசரி — தமிழ் (ஆய்வு முறை: விவாதத்திற்குரிய பெயர்கள் தெரியும்)'),
    showDisputed: true,
  },
};

const NESTED = ['combustion', 'variants', 'chevvai', 'rahuKetu', 'badhaka'];

/**
 * Resolve a profile from an id, a full profile object, or overrides: { base: id, showDisputed: true, … }.
 * Unknown ids fall back to the default profile.
 */
export function resolveProfile(p) {
  if (!p) return BASE;
  if (typeof p === 'string') return PROFILES[p] || BASE;
  const base = PROFILES[p.base] || PROFILES[p.id] || BASE;
  const out = { ...base, ...p };
  for (const k of NESTED) if (p[k]) out[k] = { ...base[k], ...p[k] };
  out.baseId = base.baseId;
  if (!p.id || !PROFILES[p.id]) out.id = p.id || `${base.id}+custom`;
  delete out.base;
  return out;
}
