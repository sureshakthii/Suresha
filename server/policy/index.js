// Policy pipeline entry point (Brief §22 programming sequence):
//   1 resolve account/speaker/subject/participants → 2 detect urgency, abuse, intent, ambiguity →
//   3 apply policy in code BEFORE chart work → 4–6 safety / decline / age-aware templates →
//   7 evidence (caller) → 8–9 validated generation or reviewed fallback (caller) → 10 minimal metrics.
import { classifyConversation, classifyWithModel, ROUTER_VERSION } from './intent-router.js';
import { resolveContext, rememberSignals, recallSignals, CONTEXT_SCHEMA_VERSION } from './identity-context.js';
import { decide, POLICY_VERSION } from './safety-policy.js';
import { AGE_POLICY_VERSION } from './age-policy.js';
import { TEMPLATES, TEMPLATE_VERSION, DEADLINE_NOTES, templateText } from './templates.js';
import { resourcesFor, resourcesText, DIRECTORY_VERSION } from './resource-directory.js';
import { VALIDATOR_VERSION } from './answer-validator.js';
import { EVIDENCE_VERSION } from './evidence-builder.js';
import { recordPolicyEvent } from './audit-events.js';

export const VERSIONS = {
  policy: POLICY_VERSION, agePolicy: AGE_POLICY_VERSION, router: ROUTER_VERSION, context: CONTEXT_SCHEMA_VERSION,
  templates: TEMPLATE_VERSION, resources: DIRECTORY_VERSION, validator: VALIDATOR_VERSION, evidence: EVIDENCE_VERSION,
};

/** Memory key for ephemeral session signals: the account id, else a client session id (never the IP). */
export function memoryKeyFor(user, body) {
  if (user?.id) return `u:${user.id}`;
  const sid = typeof body?.sessionId === 'string' ? body.sessionId.replace(/[^\w-]/g, '').slice(0, 64) : '';
  return sid.length >= 8 ? `s:${sid}` : null;
}

/**
 * Run steps 1–6. `turns` = the person's own messages (oldest → newest; the last is the current question).
 * Returns { intent, ctx, decision }.
 */
export async function evaluatePolicy({ body = {}, user = null, turns = [], lang = 'en', category = null, now = new Date() } = {}) {
  const memoryKey = memoryKeyFor(user, body);
  const intent = process.env.POLICY_MODEL_CLASSIFIER === 'on' ? await classifyWithModel(turns) : classifyConversation(turns);
  const mem = recallSignals(memoryKey);
  if (mem?.selfHarm) intent.sticky.selfHarm = true;
  const ctx = resolveContext({ body, user, intent, turns, lang, now, memoryKey });
  const decision = decide(ctx, intent, { category });
  if (ctx.speaker.minor === true) rememberSignals(memoryKey, { minorSignal: true, minAge: ctx.speaker.age ?? undefined });
  if (intent.flags.selfHarm) rememberSignals(memoryKey, { selfHarm: true });
  return { intent, ctx, decision };
}

/** Reviewed template answer (+ verified-source contacts when the template needs them). */
export function templateAnswer(decision, ctx, lang = 'en') {
  const id = decision.templateId || 'validation_fallback';
  let text = templateText(id, lang);
  const kinds = decision.resourceKinds?.length ? decision.resourceKinds : TEMPLATES[id]?.resources;
  const resources = kinds?.length ? resourcesFor(ctx.jurisdiction, kinds, lang) : null;
  if (resources) text += `\n\n${resourcesText(resources)}`;
  return { text, templateId: id, resources };
}

/** Deadline-first practical note (Brief §10) or null. */
export function deadlineNote(decision, lang = 'en') {
  const n = decision.deadline && DEADLINE_NOTES[decision.deadline];
  return n ? (lang === 'ta' ? n.ta : n.en) : null;
}

/** Flags the client should echo back next turn (they can only make handling MORE protective). */
export function sessionFlagsFor(ctx) {
  return ctx.speaker.minor === true ? { minorSignal: true, ...(Number.isFinite(ctx.speaker.age) ? { minAge: ctx.speaker.age } : {}) } : {};
}

/** The policy block returned to clients. Internal reason ids and risk flags are NOT included. */
export function publicPolicy(decision, ctx, extra = {}) {
  return {
    route: decision.route,
    allowAstrology: decision.allowAstrology,
    readingLevel: decision.readingLevel,
    ageGroup: ctx.speaker.band,
    needsClarification: decision.route === 'clarify',
    deadlineFirst: Boolean(decision.deadline),
    sessionFlags: sessionFlagsFor(ctx),
    policyVersion: decision.policyVersion,
    ...extra,
  };
}

/** Step 10: minimal metrics (no message text, DOB or location). */
export function audit(surface, { decision, ctx, validation = 'not_run', validationErrors = [], source, latencyMs, intent }) {
  return recordPolicyEvent({
    surface, route: decision.route, reasons: decision.reasons, templateId: decision.templateId, allowAstrology: decision.allowAstrology,
    validation, validationErrors: validationErrors.map((e) => e.split(':').slice(0, 2).join(':')), source,
    band: ctx.speaker.band, ageSource: ctx.speaker.ageSource, language: ctx.language, jurisdiction: ctx.jurisdiction?.country,
    deadline: decision.deadline || 'none', retentionClass: decision.retentionClass, versions: VERSIONS, latencyMs,
    classifier: intent?.classifier?.model,
  });
}

export { resourcesFor } from './resource-directory.js';
export { buildEvidence, publicEvidence, modelPayload } from './evidence-builder.js';
export { validateAnswer, parseModelAnswer, composeAnswer, scanProhibited, ANSWER_SCHEMA } from './answer-validator.js';
export { auditSnapshot } from './audit-events.js';
export { TEMPLATES, templateText } from './templates.js';
