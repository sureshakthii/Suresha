// Versioned astrological rule registry — the single authority for yoga, role and dosha rules.
// Modules (analysis, porutham, lifecheck, AI evidence) consume evaluations from here.
// Each evaluation separates: (1) configuration present + facts, (2) strength & modifiers
// (never erasing a weak configuration), (3) traditionally relevant dasa/bhukti periods.
import { T, makeContext } from './core.js';
import { resolveProfile, PROFILES, DEFAULT_PROFILE_ID } from './profiles.js';
import { YOGA_RULES, PRIORITY_20 } from './yogas.js';
import { DISPUTED_RULES } from './disputed.js';
import { CHEVVAI_RULES } from './chevvai.js';
import { ROLE_RULES } from './roles.js';
import { capDate, clipPeriods } from '../lifespan-cap.js';

export const REGISTRY_VERSION = '0.1.0';
export const STATUSES = ['approved', 'proposed', 'disputed'];
export const KINDS = ['yoga', 'role', 'dosha'];

export const RULES = Object.freeze([...YOGA_RULES, ...ROLE_RULES, ...CHEVVAI_RULES, ...DISPUTED_RULES]);
const BY_ID = new Map(RULES.map((r) => [r.id, r]));

export const getRule = (id) => BY_ID.get(id) || null;
export const listRules = ({ kind, status } = {}) => RULES.filter((r) => (!kind || r.kind === kind) && (!status || r.status === status));
export { PROFILES, DEFAULT_PROFILE_ID, resolveProfile, PRIORITY_20 };

const REQUIRED = ['id', 'name', 'kind', 'profiles', 'source', 'status', 'reference', 'planets', 'houses', 'relation', 'predicate', 'exceptions', 'strengthModifiers', 'explanation', 'version', 'fixtures', 'predicateText'];

/** Governance checks for one rule. Returns a list of problems (empty = valid). */
export function validateRule(r) {
  const errs = [];
  for (const f of REQUIRED) if (r[f] === undefined) errs.push(`${r.id}: missing ${f}`);
  if (!KINDS.includes(r.kind)) errs.push(`${r.id}: bad kind ${r.kind}`);
  if (!STATUSES.includes(r.status)) errs.push(`${r.id}: bad status ${r.status}`);
  if (!r.name?.en || !r.name?.ta) errs.push(`${r.id}: name needs en and ta`);
  if (!['lagna', 'moon', 'sun'].includes(r.reference)) errs.push(`${r.id}: bad reference ${r.reference}`);
  if (!r.source?.text || !r.source?.edition || !r.source?.passage) errs.push(`${r.id}: source needs text, edition, passage`);
  if (r.status === 'approved' && !r.reviewer) errs.push(`${r.id}: an approved rule needs a named reviewer`);
  if (r.disputed && (r.profileFlag !== 'showDisputed' || r.remedyPolicy !== 'none' || r.status !== 'disputed')) errs.push(`${r.id}: disputed rules must sit behind showDisputed with remedyPolicy 'none'`);
  if (/eclipse/i.test(`${r.name?.en} ${r.explanation?.en}`)) errs.push(`${r.id}: must not be described as an eclipse`);
  return errs;
}
export const validateRegistry = () => {
  const errs = RULES.flatMap(validateRule);
  if (BY_ID.size !== RULES.length) errs.push('duplicate rule ids');
  return errs;
};

/** Is the rule switched on for this profile? Disputed labels need profile.showDisputed === true. */
export function ruleEnabled(rule, profile) {
  if ((profile.disabledRules || []).includes(rule.id)) return false;
  if (!rule.profiles.includes(profile.id) && !rule.profiles.includes(profile.baseId)) return false;
  if (rule.profileFlag && profile[rule.profileFlag] !== true) return false;
  return true;
}

/** Dasa / bhukti periods ruled by the activating lords (from chart.dasa — Vimshottari). */
export function relevantPeriods(chart, lords) {
  const note = T('Periods traditionally associated with this configuration.', 'இந்த அமைப்புடன் பாரம்பரியமாகத் தொடர்புடைய காலங்கள்.');
  const d = chart.dasa;
  if (!d || !Array.isArray(d.periods)) return { lords, dasas: [], current: null, note };
  const dasa = d.current?.lord ?? null, bhukti = d.currentBhukti?.lord ?? null;
  return {
    lords,
    // Listing horizon: only periods inside the person's age 0–80 (straddling ones end at it) — shared/lifespan-cap.js.
    dasas: clipPeriods(d.periods.filter((p) => lords.includes(p.lord)).map((p) => ({ lord: p.lord, start: p.start, end: p.end })), capDate(chart)),
    current: { dasa, bhukti, dasaActivates: lords.includes(dasa), bhuktiActivates: lords.includes(bhukti) },
    note,
  };
}

/**
 * Birth-time sensitivity of one evaluation (brief §7), from chart.stability (set by birthChart for
 * approximate / unknown times). 'exact' = recorded time, no sensitivity data; 'stable' = the inputs this
 * rule read do not change across the uncertainty window; 'unstable' = they do (list in unstableInputs).
 */
export function inputStability(ctx, res) {
  const st = ctx.chart.stability;
  if (!st) return { status: 'exact', unstableInputs: [] };
  const unstable = new Set(st.unstable || []);
  const out = [];
  if (ctx.used.has('lagna')) {
    if (unstable.has('lagna')) out.push('lagna');
    for (const k of res.involved) if (unstable.has(`house:${k}`)) out.push(`house:${k}`);
  }
  if ((ctx.used.has('moon') || res.involved.includes('Moon')) && unstable.has('moonRasi')) out.push('moonRasi');
  return { status: out.length ? 'unstable' : 'stable', unstableInputs: [...new Set(out)], windowMinutes: st.windowMinutes };
}

const STRENGTH_NOTE = T('Traditional modifiers only — not a probability, and they never erase the configuration.', 'பாரம்பரிய மாற்றிகள் மட்டும் — நிகழ்தகவு அல்ல; அமைப்பை அழிப்பதில்லை.');
export function summariseStrength(modifiers) {
  const supports = modifiers.filter((m) => m.effect === 'supports').length;
  const weakens = modifiers.filter((m) => m.effect === 'weakens').length;
  const label = !supports && !weakens ? 'plain' : supports && !weakens ? 'supported' : weakens && !supports ? 'modified' : 'mixed';
  return { label, supports, weakens, modifiers, note: STRENGTH_NOTE };
}

/**
 * Evaluate one rule for one chart.
 * @param rule registry rule
 * @param chart birth chart ({ planets, dasa? }) — or a context from makeContext
 * @param opts { profile }
 */
export function evaluateRule(rule, chart, { profile } = {}) {
  const ctx = chart.P ? chart : makeContext(chart, resolveProfile(profile));
  const pr = ctx.profile;
  ctx.used.clear();
  const raw = rule.predicate(ctx) || {};
  let variants = null;
  let enabledPresent = [];
  if (raw.variants) {
    const enabled = (rule.enabledVariants && rule.enabledVariants(pr)) || pr.variants?.[rule.id] || rule.defaultVariants || Object.keys(raw.variants);
    variants = Object.fromEntries(Object.entries(raw.variants).map(([k, v]) => [k, { ...v, present: !!v.present && !v.unavailable, enabled: enabled.includes(k), unavailable: !!v.unavailable, facts: v.facts || [] }]));
    enabledPresent = Object.keys(variants).filter((k) => variants[k].enabled && variants[k].present);
  }
  // All enabled variants need an unavailable input (e.g. Lagna for an unknown birth time) → the rule is unavailable.
  if (variants && !raw.unavailable) {
    const en = Object.values(variants).filter((v) => v.enabled);
    if (en.length && en.every((v) => v.unavailable)) raw.unavailable = true;
  }
  const present = raw.unavailable ? false : (raw.present !== undefined ? !!raw.present : enabledPresent.length > 0);
  const res = {
    ruleId: rule.id, version: rule.version, kind: rule.kind, status: rule.status, disputed: rule.disputed, tone: rule.tone,
    name: rule.name, reference: rule.reference, relation: rule.relation.type, profile: pr.id,
    present, unavailable: !!raw.unavailable,
    facts: raw.facts || [], variants, enabledPresent,
    cancellation: raw.cancellation || null, notRajaYoga: !!raw.notRajaYoga,
    involved: raw.involved || [], data: raw.data || {},
    explanation: rule.explanation, source: rule.source, reviewer: rule.reviewer, remedyPolicy: rule.remedyPolicy,
    strength: null, periods: null,
    needs: raw.unavailable ? 'birth-time' : null,
  };
  res.title = present && rule.title ? rule.title(res) : rule.name;
  res.legacyId = typeof rule.legacyId === 'function' ? (present ? rule.legacyId(res) : null) : rule.legacyId || rule.id;
  if (present) {
    res.strength = summariseStrength(rule.strengthModifiers(ctx, res) || []);
    const lords = (rule.activation ? rule.activation(ctx, res) : res.involved).filter((k) => k !== 'Lagna');
    res.periods = relevantPeriods(ctx.chart, lords);
  }
  res.stability = inputStability(ctx, res);
  return res;
}

/**
 * Evaluate every enabled rule for a chart.
 * @param opts { profile, kinds?: string[], ids?: string[], includeAbsent?: boolean, filter?: (rule)=>boolean }
 */
export function evaluateRules(chart, { profile, kinds, ids, includeAbsent = false, includeUnavailable = false, filter } = {}) {
  const pr = resolveProfile(profile);
  const ctx = makeContext(chart, pr);
  const out = [];
  for (const rule of RULES) {
    if (kinds && !kinds.includes(rule.kind)) continue;
    if (ids && !ids.includes(rule.id)) continue;
    if (filter && !filter(rule)) continue;
    if (rule.role === 'exception' || !ruleEnabled(rule, pr)) continue;
    const r = evaluateRule(rule, ctx);
    if (includeAbsent || r.present || (includeUnavailable && r.unavailable)) out.push(r);
  }
  return out;
}
