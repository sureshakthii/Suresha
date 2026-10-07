// Safety policy (Brief §20, §22 steps 3–6): turns the request context + intent into a decision that is
// enforced in code BEFORE any chart work. Client toggles and premium status cannot change it.
//
// Priority: 1 immediate danger / self-harm / abuse / acute medical → safety_support
//           2 adult–minor romantic/sexual facilitation → decline_facilitation (or protective safety route)
//           3 coercion / severe distress → safety_support
//           4 minor speaker / minor subject → child_guidance or teen_guidance
//           5 ambiguity that changes the safe answer → clarify
//           6 privacy intrusion, accusation, death/disease/accident prediction, unsafe permission → reviewed card
//           7 unknown age + romance/sexual → general guidance (no adult-sensitive unlock)
//           8 ordinary questions → adult_guidance (or age-appropriate guidance) with evidence-only astrology
import { AGE_POLICY_VERSION, bandProhibited, bandRules } from './age-policy.js';
import { TEMPLATES } from './templates.js';

export const POLICY_VERSION = 'safety-policy-1.0.0';
export const ROUTES = ['safety_support', 'child_guidance', 'teen_guidance', 'adult_guidance', 'clarify', 'decline_facilitation'];

export const ALWAYS_PROHIBITED = [
  'death_lifespan_prediction', 'disease_prediction', 'accusation', 'adult_minor_facilitation', 'emergency_delay',
  'private_profile_leak', 'paid_remedy_as_protection', 'probability_of_betrayal_or_accident', 'accident_date',
  'guaranteed_outcome', 'dated_event_promise', 'unsafe_permission',
];

export const ANSWER_ELEMENTS = ['question', 'evidence_cited_claims', 'plain_interpretation', 'uncertainty', 'practical_next_steps', 'optional_free_practice', 'optional_human_review'];

// Prasna categories (shared/prasna.js ids) whose timing must never delay real-world obligations (Brief §10).
const DEADLINE_CATEGORY = {
  surgery: 'medical', delivery: 'medical',
  court: 'legal',
  contract: 'contract', tech_partner: 'contract',
  cheque: 'payment', loan: 'payment', lend_money: 'payment',
  medicine_start: 'medical', police_complaint: 'legal', money_transfer: 'payment', loan_sign: 'payment', rent_agreement: 'contract',
};

/** Which deadline-first note applies (or null), from the Prasna category and/or the question's intent. */
export function deadlineCategory(categoryId, flags = {}) {
  if (DEADLINE_CATEGORY[categoryId]) return DEADLINE_CATEGORY[categoryId];
  if (flags.medicalTiming) return 'medical';
  if (flags.legalTiming) return 'legal';
  if (flags.financialTiming) return 'payment';
  return null;
}

const MARRIAGE_CATEGORIES = new Set(['marriage', 'bride_groom']);

/**
 * decide(ctx, intent, { category }) → decision:
 * { route, reasons, allowAstrology, templateId, resourceKinds, requiredElements, prohibitedOutputs,
 *   permittedEvidenceIds, readingLevel, language, retentionClass, deadline, policyVersion, agePolicyVersion }
 */
export function decide(ctx, intent, { category = null } = {}) {
  const f = intent.flags || {};
  const st = intent.sticky || {};
  const sp = ctx.speaker;
  const band = sp.band;
  const minorSpeaker = sp.minor === true;
  const adultSpeaker = sp.minor === false;
  const reasons = [];
  const romanticNow = Boolean(f.romanticOrSexual || (category && MARRIAGE_CATEGORIES.has(category)));
  // Follow-ups ("will my dasa help me with her?") keep the earlier romantic context alive.
  const minorMentioned = ctx.participants.some((p) => p.minor === true && p.group !== 'child');
  // "I like a 15 year old girl", "help me with a 15 year old girl", "get her to love me": attraction toward a
  // mentioned minor is a romantic context even without the words love / marry.
  // A minor named in a romantic role ("my girlfriend is 15") in THIS message is a romantic context by itself;
  // earlier turns only carry over through the sticky flags below (an unrelated follow-up is not declined).
  const curTurn = intent.currentTurn ?? Math.max(-1, ...(intent.ages || []).map((a) => a.turn ?? -1));
  const minorRomanticRole = (intent.ages || []).some((a) => a.who === 'other' && a.age < 18 && a.group === 'romantic' && (a.turn ?? curTurn) === curTurn);
  const romanticAny = romanticNow || minorRomanticRole || Boolean(minorMentioned && (f.attraction || (f.meeting && (f.privateMeeting || f.secrecy))))
    || Boolean((st.romanticOrSexual || st.attraction) && (f.meeting || f.timing || f.firstPersonRomance || f.permissionLanguage || f.attraction || /\b(her|him|she|he|them|அவள்|அவன்|aval|avan)\b/u.test(intent.normalized || '')));
  const sexualAny = Boolean(f.sexual || (st.sexual && romanticAny));
  const chatOthers = ctx.participants.filter((p) => p.role !== 'chart_subject');
  const minorTargets = ctx.participants.filter((p) => p.minor === true && p.group !== 'child' && !(p.role === 'chart_subject' && ['self'].includes(ctx.subject.relation)));
  const minorChildren = ctx.participants.filter((p) => p.minor === true && p.group === 'child');
  const adultActors = chatOthers.filter((p) => p.minor === false && p.group !== 'child');
  if (f.bypass || st.bypass) reasons.push('bypass_attempt_ignored');
  if (f.fictional) reasons.push('fictional_framing_same_rules');
  if (f.translation) reasons.push('translation_same_rules');
  if (f.encodedText) reasons.push('encoded_text_decoded');
  if (f.guardianClaim) reasons.push('guardian_permission_does_not_override');
  if (sp.ageStatus === 'conflicting') reasons.push('age_conflict_conservative');
  if (sp.adultClaimAfterMinor) reasons.push('adult_claim_does_not_erase_minor_status');

  const out = (route, templateId, why, extra = {}) => finalize(ctx, intent, { route, templateId, allowAstrology: false, reasons: [...reasons, ...[].concat(why)], category, ...extra });

  // 1. Immediate safety — no chart, no age check, no login needed.
  if (f.selfHarm) return out('safety_support', 'safety_self_harm', 'self_harm_or_suicidal_ideation');
  if (f.danger) return out('safety_support', 'safety_danger', 'immediate_danger');
  if (f.medicalUrgent) return out('safety_support', 'safety_medical', 'acute_medical');
  if (f.abuse) return out('safety_support', 'safety_abuse', 'abuse_disclosure');

  // 2. Adult–minor romantic/sexual context.
  if (romanticAny || sexualAny) {
    if (minorChildren.length && adultActors.length) return out('safety_support', 'guardian_child_at_risk', 'adult_minor_relationship_reported');
    if (minorSpeaker && adultActors.length) return out('safety_support', 'teen_adult_partner', 'minor_speaker_adult_partner');
    if (minorTargets.length) {
      if (minorSpeaker) return minorRomance(ctx, intent, reasons, 'peer_minor_romance', category, f, sexualAny);
      if (adultActors.length) return out('decline_facilitation', 'decline_minor_facilitation', 'adult_minor_facilitation_third_party');
      const pursuing = f.firstPersonRomance || f.attraction || st.attraction || minorTargets.some((p) => p.group === 'romantic' || p.group === 'spouse') || f.secrecy || st.secrecy || f.privateMeeting;
      // Adult OR unknown-age speaker pursuing a minor → decline (a speaker who is a minor was handled above).
      if (pursuing) return out('decline_facilitation', 'decline_minor_facilitation', adultSpeaker ? 'adult_minor_facilitation' : 'unknown_age_minor_facilitation');
      return out('teen_guidance', f.marriage || (category && MARRIAGE_CATEGORIES.has(category)) ? 'minor_marriage' : 'guardian_minor_romance', 'third_party_minor_romance_question', { audience: 'guardian' });
    }
    if (minorChildren.length || (ctx.subject.minor === true && ctx.subject.relation !== 'self')) {
      return out(ctx.subject.band === '0-5' || ctx.subject.band === '6-12' ? 'child_guidance' : 'teen_guidance',
        f.marriage || (category && MARRIAGE_CATEGORIES.has(category)) ? 'minor_marriage' : 'guardian_minor_romance', 'guardian_question_about_minor_romance', { audience: 'guardian' });
    }
  }

  // 3. Coercion / distress.
  if (f.coercion) return out('safety_support', 'safety_coercion', 'coercion');
  if (f.distress) return out('safety_support', 'support_distress', 'distress');

  // 4. Minor speaker.
  if (minorSpeaker) {
    if (band === '0-5') return out('child_guidance', 'child_caregiver', 'speaker_age_0_5_caregiver_directed');
    const child = band === '6-12';
    if (romanticAny || sexualAny) return minorRomance(ctx, intent, reasons, 'minor_speaker_romance', category, f, sexualAny);
    if (f.sexualHealth) return out(child ? 'child_guidance' : 'teen_guidance', child ? 'child_sensitive' : 'teen_sexual_health', 'minor_sexual_health_question', { resourceKinds: ['child'] });
    if (child && f.childFeelings) return out('child_guidance', 'child_feelings', 'child_feelings_or_bullying');
    const card = prohibitedCard(f, intent);
    if (card) return out(child ? 'child_guidance' : 'teen_guidance', child ? 'child_sensitive' : card.templateId, ['minor_speaker', card.reason]);
    if (f.ambiguous) return out('clarify', 'clarify_funk', 'ambiguous_term');
    return finalize(ctx, intent, { route: child ? 'child_guidance' : 'teen_guidance', templateId: null, allowAstrology: true, reasons: [...reasons, child ? 'minor_speaker_6_12_ordinary' : 'minor_speaker_13_17_ordinary'], category });
  }

  // 5. Ambiguity that changes the safe answer.
  if (f.ambiguous) return out('clarify', 'clarify_funk', 'ambiguous_term');

  // 6. Reviewed safeguard cards.
  const card = prohibitedCard(f, intent);
  if (card) return out('adult_guidance', card.templateId, card.reason);

  // 7. Unknown age + romantic/sexual → general guidance only.
  // A known-adult chart subject (e.g. a parent reading an adult son's life chart) can get ordinary reflection,
  // unless the speaker is asking about their OWN romance/sexual life.
  const adultSubjectReading = ctx.subject.minor === false && ctx.speaker.type !== 'self' && !f.firstPersonRomance && !sexualAny && !f.sexualHealth;
  if (!adultSpeaker && !adultSubjectReading && (romanticAny || sexualAny || f.sexualHealth)) {
    // Event muhurtham by category (a family wedding date) stays available as calendar support.
    if (!f.romanticOrSexual && !f.sexualHealth && category && MARRIAGE_CATEGORIES.has(category)) {
      return finalize(ctx, intent, { route: 'adult_guidance', templateId: null, allowAstrology: true, reasons: [...reasons, 'age_unknown_event_timing_only'], category, extraRequired: ['adult_participants_only'] });
    }
    return out('adult_guidance', sexualAny || f.sexualHealth ? 'unknown_age_sexual' : 'unknown_age_love', 'age_unknown_romance_general_only');
  }

  // Classifier failure on a sensitive topic → reviewed safe handling.
  if (intent.classifier?.model === 'failed' && ['romance', 'sexual', 'sexual_health', 'marriage', 'health'].includes(intent.purpose)) {
    return out('adult_guidance', 'validation_fallback', 'classifier_failed_sensitive_topic');
  }

  // 8. Ordinary.
  const extraRequired = [];
  if (f.paidRemedy) { extraRequired.push('free_remedy_first'); reasons.push('paid_remedy_question'); }
  if (st.selfHarm) { extraRequired.push('safety_checkin'); reasons.push('earlier_distress_in_session'); }
  if (romanticAny && adultSpeaker) reasons.push('adult_consensual_relationship');
  reasons.push(sp.minor === null ? 'age_unknown_general' : 'adult_ordinary');
  return finalize(ctx, intent, { route: 'adult_guidance', templateId: null, allowAstrology: true, reasons, category, extraRequired });
}

function minorRomance(ctx, intent, reasons, why, category, f, sexualAny) {
  const band = ctx.speaker.minor === true ? ctx.speaker.band : 'minor-unknown';
  const child = band === '6-12' || band === '0-5';
  let templateId;
  if (child) templateId = band === '0-5' ? 'child_caregiver' : sexualAny ? 'child_sensitive' : 'child_crush';
  else if (sexualAny || f.sexualHealth) templateId = 'teen_sexual_health';
  else if (f.marriage || (category && MARRIAGE_CATEGORIES.has(category))) templateId = 'minor_marriage';
  else templateId = 'teen_romance';
  return finalize(ctx, intent, { route: child ? 'child_guidance' : 'teen_guidance', templateId, allowAstrology: false, reasons: [...reasons, why], category, resourceKinds: sexualAny ? ['child'] : undefined });
}

function prohibitedCard(f, intent) {
  if (f.privacyIntrusion) return { templateId: 'privacy_boundary', reason: 'privacy_intrusion' };
  if (f.unsafePermission) return { templateId: 'unsafe_permission', reason: 'unsafe_permission_request' };
  if (f.deathPrediction) return { templateId: 'death_decline', reason: 'death_lifespan_request' };
  if (f.accusation) return { templateId: intent.purpose === 'money' || /money|panam|பணம்|steal|loot|திருட/u.test(intent.normalized || '') ? 'money_safeguard' : 'accusation_boundary', reason: 'accusation_request' };
  if (f.accidentPrediction) return { templateId: 'travel_safeguard', reason: 'accident_prediction_request' };
  if (f.diseasePrediction) return { templateId: 'disease_decline', reason: 'disease_or_fertility_prediction_request' };
  if (f.sensitiveProbability) return { templateId: 'probability_decline', reason: 'probability_request' };
  return null;
}

function finalize(ctx, intent, { route, templateId, allowAstrology, reasons, category, resourceKinds, extraRequired = [], audience }) {
  const f = intent.flags || {};
  const band = ctx.speaker.band;
  const rules = bandRules(band);
  const tpl = templateId ? TEMPLATES[templateId] : null;
  const deadline = deadlineCategory(category, f);
  const required = allowAstrology ? [...ANSWER_ELEMENTS] : ['reviewed_template'];
  if (deadline) required.unshift('deadline_first');
  required.push(...extraRequired);
  const prohibited = [...new Set([...ALWAYS_PROHIBITED, ...bandProhibited(route === 'teen_guidance' || route === 'child_guidance' ? 'minor-unknown' : band)])];
  if (deadline) prohibited.push('emergency_delay');
  const kinds = resourceKinds || tpl?.resources || (route === 'safety_support' ? ['emergency'] : []);
  return {
    route,
    reasons: [...new Set(reasons)],
    allowAstrology: Boolean(allowAstrology),
    templateId: templateId || null,
    audience: audience || (ctx.speaker.type === 'guardian' ? 'guardian' : 'speaker'),
    resourceKinds: kinds,
    requiredElements: [...new Set(required)],
    prohibitedOutputs: [...new Set(prohibited)],
    permittedEvidenceIds: [], // filled after the evidence bundle is built (only when allowAstrology)
    readingLevel: route === 'child_guidance' ? (band === '0-5' ? 'caregiver' : 'simple') : route === 'teen_guidance' ? 'teen' : rules.readingLevel,
    language: ctx.language,
    retentionClass: route === 'safety_support' || route === 'decline_facilitation' ? 'safety_minimal' : (ctx.speaker.minor !== false ? 'minor_or_unknown_ephemeral' : 'standard_ephemeral'),
    deadline,
    policyVersion: POLICY_VERSION,
    agePolicyVersion: AGE_POLICY_VERSION,
  };
}
