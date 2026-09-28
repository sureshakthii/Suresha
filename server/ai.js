// AI Jothidar: turns the computed Prasna evaluation into a warm, clear reply.
// Uses Claude when credentials are configured; otherwise falls back to a rule-based narrator
// so the app is fully testable offline.
import Anthropic from '@anthropic-ai/sdk';
import { VERDICT_TEXT } from '../shared/prasna.js';
import { SYSTEM_PROMPT, buildContext, ruleBasedReply } from '../shared/narrator.js';

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
export async function generateReply({ ctx, evaluation, lang, onText, onReset }) {
  if (!aiEnabled()) {
    const text = ruleBasedReply(ctx, evaluation, lang);
    onText?.(text);
    return { text, source: 'rules' };
  }
  const params = {
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    output_config: { effort: EFFORT },
    system: SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: `Here is the computed Prasna data (JSON):\n${JSON.stringify(ctx, null, 2)}\n\nAnswer the person's question now in ${ctx.replyLanguage}.`,
    }],
  };
  if (USE_FALLBACKS) {
    params.betas = ['server-side-fallback-2026-07-01'];
    params.fallbacks = 'default';
  }
  let streamed = '';
  try {
    const stream = getClient().beta.messages.stream(params);
    stream.on('text', (t) => { streamed += t; onText?.(t); });
    const msg = await stream.finalMessage();
    if (msg.stop_reason === 'refusal' || !streamed.trim()) throw new Error(`AI stopped: ${msg.stop_reason}`);
    return { text: streamed, source: 'ai' };
  } catch (err) {
    console.error('[ai] falling back to rule-based reply:', err.message);
    const text = ruleBasedReply(ctx, evaluation, lang);
    if (streamed) onReset?.();
    onText?.(text);
    return { text, source: 'rules' };
  }
}

export { VERDICT_TEXT, buildContext, ruleBasedReply };
