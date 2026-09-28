// AI Jothidar: turns the computed Prasna evaluation into a warm, clear reply.
// Uses Claude when credentials are configured; otherwise falls back to a rule-based narrator
// so the app is fully testable offline.
import Anthropic from '@anthropic-ai/sdk';
import { VERDICT_TEXT } from '../shared/prasna.js';
import { SYSTEM_PROMPT, AI_TASKS, buildContext, ruleBasedReply } from '../shared/narrator.js';

const MODEL = process.env.AI_MODEL || 'claude-opus-5';
const EFFORT = process.env.AI_EFFORT || 'low';
const USE_FALLBACKS = process.env.AI_FALLBACKS !== 'off';

export const aiEnabled = () => Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

let client;
const getClient = () => (client ||= new Anthropic());

/**
 * Generate the reply. `onText` receives streamed text chunks; `onReset` means discard what was streamed.
 * Returns { text, source } where source is 'ai' or 'rules'.
 */
async function streamClaude({ system, messages, onText }) {
  const params = {
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    output_config: { effort: EFFORT },
    system,
    messages,
  };
  if (USE_FALLBACKS) {
    params.betas = ['server-side-fallback-2026-07-01'];
    params.fallbacks = 'default';
  }
  let streamed = '';
  const stream = getClient().beta.messages.stream(params);
  stream.on('text', (t) => { streamed += t; onText?.(t); });
  const msg = await stream.finalMessage();
  if (msg.stop_reason === 'refusal' || !streamed.trim()) {
    const err = new Error(`AI stopped: ${msg.stop_reason}`);
    err.streamed = streamed;
    throw err;
  }
  return streamed;
}

/** Run a model call and fall back to `fallback()` text when AI is unavailable or fails. */
async function withFallback({ system, messages, onText, onReset, fallback }) {
  if (!aiEnabled()) {
    const text = fallback();
    onText?.(text);
    return { text, source: 'rules' };
  }
  let streamed = '';
  try {
    const text = await streamClaude({ system, messages, onText: (t) => { streamed += t; onText?.(t); } });
    return { text, source: 'ai' };
  } catch (err) {
    console.error('[ai] falling back to rule-based reply:', err.message);
    const text = fallback();
    if (streamed) onReset?.();
    onText?.(text);
    return { text, source: 'rules' };
  }
}

/**
 * Generate the Prasnam reply. `onText` receives streamed text chunks; `onReset` means discard what was streamed.
 * Returns { text, source } where source is 'ai' or 'rules'.
 */
export function generateReply({ ctx, evaluation, lang, onText, onReset }) {
  return withFallback({
    system: SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: `Here is the computed Prasna data (JSON):\n${JSON.stringify(ctx, null, 2)}\n\nAnswer the person's question now in ${ctx.replyLanguage}.`,
    }],
    onText, onReset,
    fallback: () => ruleBasedReply(ctx, evaluation, lang),
  });
}

/**
 * Chat / explanation tasks ('chat' | 'porutham' | 'names'). The data context is attached to the first
 * user turn; `messages` is the conversation (ending on a user turn for chat).
 */
export function runTask({ task, context, messages, lang, fallbackText, onText, onReset }) {
  const langLine = `Reply in ${lang === 'ta' ? 'Tamil' : 'English'}.`;
  const dataTurn = `Data (JSON):\n${JSON.stringify(context, null, 2)}\n\n${langLine}`;
  const convo = messages?.length ? messages : [{ role: 'user', content: 'Please explain.' }];
  const [first, ...rest] = convo;
  return withFallback({
    system: AI_TASKS[task],
    messages: [{ role: 'user', content: `${dataTurn}\n\n${first.content}` }, ...rest],
    onText, onReset,
    fallback: () => fallbackText,
  });
}

export { VERDICT_TEXT, buildContext, ruleBasedReply };
