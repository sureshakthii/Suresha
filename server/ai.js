// AI Jothidar: explains deterministic chart/Prasna evidence in warm, clear language.
// Uses Claude when credentials are configured (API key stays server-side); otherwise — or when the model
// fails, times out or its draft fails validation — the caller shows a deterministic / reviewed answer.
//
// Model output is BUFFERED, parsed as the JSON answer contract and validated (server/policy) before
// anything is shown. Unvalidated text is never streamed to the screen or to voice output.
import Anthropic from '@anthropic-ai/sdk';
import { VERDICT_TEXT } from '../shared/prasna.js';
import { SYSTEM_PROMPT, AI_TASKS, ANSWER_CONTRACT, buildContext, ruleBasedReply } from '../shared/narrator.js';
import { ANSWER_SCHEMA, parseModelAnswer, validateAnswer, composeAnswer, modelPayload } from './policy/index.js';

const MODEL = process.env.AI_MODEL || 'claude-opus-5-5';
const EFFORT = process.env.AI_EFFORT || 'low';
const USE_FALLBACKS = process.env.AI_FALLBACKS !== 'off';
const STRUCTURED = process.env.AI_STRUCTURED !== 'off';
export const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS) || 45000;

export const aiEnabled = () => Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

let client;
const getClient = () => (client ||= new Anthropic());

class AiTimeout extends Error {}

/** One bounded model call. Returns the complete text (buffered, never forwarded while streaming). */
async function callModel({ system, messages, timeoutMs = AI_TIMEOUT_MS }) {
  const params = {
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    output_config: { effort: EFFORT, ...(STRUCTURED ? { format: { type: 'json_schema', schema: ANSWER_SCHEMA } } : {}) },
    system,
    messages,
  };
  if (USE_FALLBACKS) {
    params.betas = ['server-side-fallback-2026-07-01'];
    params.fallbacks = 'default';
  }
  const stream = getClient().beta.messages.stream(params);
  let timer;
  const timeout = new Promise((_r, reject) => {
    timer = setTimeout(() => { stream.abort(); reject(new AiTimeout('AI timeout')); }, timeoutMs);
  });
  try {
    const msg = await Promise.race([stream.finalMessage(), timeout]);
    const text = msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
    if (msg.stop_reason === 'refusal' || msg.stop_reason === 'max_tokens' || !text.trim()) throw new Error(`AI stopped: ${msg.stop_reason}`);
    return text;
  } finally {
    clearTimeout(timer);
  }
}

// Test seam: lets tests substitute the model call (never used in production code paths).
let modelCaller = callModel;
export function setModelCallerForTests(fn) { modelCaller = typeof fn === 'function' ? fn : callModel; }

/** Bound any model call with a timeout (callModel also aborts its own stream). */
async function bounded(promise, timeoutMs) {
  let timer;
  try {
    return await Promise.race([promise, new Promise((_r, rej) => { timer = setTimeout(() => rej(new AiTimeout('AI timeout')), timeoutMs); })]);
  } finally { clearTimeout(timer); }
}

/**
 * Generate an evidence-cited answer and validate it.
 * Returns { ok, text, answer, source: 'ai', validation: { status, errors } } or
 *         { ok: false, source: 'rules', validation: { status: 'not_run'|'invalid'|'timeout'|'error', errors } }.
 */
export async function answerWithEvidence({ system, messages, decision, evidence, lang = 'en', privateValues = [], timeoutMs = AI_TIMEOUT_MS }) {
  if (!aiEnabled()) return { ok: false, source: 'rules', validation: { status: 'not_run', errors: ['ai_disabled'] } };
  let raw;
  try {
    raw = await bounded(modelCaller({ system: `${system}\n\n${ANSWER_CONTRACT}`, messages, timeoutMs }), timeoutMs + 1000);
  } catch (err) {
    const status = err instanceof AiTimeout ? 'timeout' : 'error';
    console.error(`[ai] ${status}; using reviewed fallback:`, err.message);
    return { ok: false, source: 'rules', validation: { status, errors: [status] } };
  }
  let parsed;
  try { parsed = parseModelAnswer(raw); } catch {
    return { ok: false, source: 'rules', validation: { status: 'invalid', errors: ['schema:unparseable'] } };
  }
  const v = validateAnswer(parsed, { decision, evidence, privateValues });
  if (!v.ok) {
    console.warn('[ai] draft failed validation:', v.errors.join(', '));
    return { ok: false, source: 'rules', validation: { status: 'invalid', errors: v.errors } };
  }
  return { ok: true, source: 'ai', text: composeAnswer(v.answer, lang), answer: v.answer, validation: { status: 'valid', errors: [] } };
}

const evidenceBlock = (evidence) => `Evidence facts (cite these ids only):\n${JSON.stringify(modelPayload(evidence), null, 1)}`;

/**
 * Prasnam reply. Returns { text, source, validation, answer }.
 * Falls back to the deterministic rule-based narrator (which already puts deadlines first).
 */
export async function generateReply({ ctx, evaluation, lang, decision, evidence, practicalNote = null, onText }) {
  const content = [
    `Question: ${ctx.question}`,
    `Category: ${ctx.category}. Reply language: ${ctx.replyLanguage}. Asked at (local): ${ctx.askedAtLocal}.`,
    practicalNote ? `A practical deadline note is shown to the person ABOVE your answer: "${practicalNote}". Do not repeat it, contradict it or suggest waiting past a real deadline.` : '',
    `Computed verdict: ${ctx.verdict} (score ${ctx.score}).`,
    evidenceBlock(evidence),
  ].filter(Boolean).join('\n\n');
  const r = await answerWithEvidence({ system: SYSTEM_PROMPT, messages: [{ role: 'user', content }], decision, evidence, lang });
  const text = r.ok ? r.text : ruleBasedReply(ctx, evaluation, lang);
  onText?.(text);
  return { text, source: r.source, validation: r.validation, answer: r.answer || null };
}

/**
 * Chat / explanation tasks ('chat' | 'porutham' | 'names'). Evidence (minimised) is attached to the first
 * user turn; `messages` is the conversation ending on a user turn. Returns { text, source, validation, answer }
 * where text is null when the caller must use its approved fallback.
 */
export async function runTask({ task, evidence, messages, lang, decision, onText }) {
  const langLine = `Reply in ${lang === 'ta' ? 'Tamil' : 'English'}. Reading level: ${decision?.readingLevel || 'adult'}.`;
  const dataTurn = `${evidenceBlock(evidence)}\n\n${langLine}`;
  const convo = messages?.length ? messages : [{ role: 'user', content: 'Please explain.' }];
  const [first, ...rest] = convo;
  const r = await answerWithEvidence({
    system: AI_TASKS[task],
    messages: [{ role: 'user', content: `${dataTurn}\n\n${first.content}` }, ...rest],
    decision, evidence, lang,
  });
  if (r.ok) onText?.(r.text);
  return { text: r.ok ? r.text : null, source: r.source, validation: r.validation, answer: r.answer || null };
}

export { VERDICT_TEXT, buildContext, ruleBasedReply };
