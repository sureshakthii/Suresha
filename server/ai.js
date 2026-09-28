// AI Jothidar: turns the computed Prasna evaluation into a warm, clear reply.
// Uses Claude when credentials are configured; otherwise falls back to a rule-based narrator
// so the app is fully testable offline.
import Anthropic from '@anthropic-ai/sdk';
import { getCategory, VERDICT_TEXT } from '../shared/prasna.js';

const MODEL = process.env.AI_MODEL || 'claude-opus-5';
const EFFORT = process.env.AI_EFFORT || 'low';
const USE_FALLBACKS = process.env.AI_FALLBACKS !== 'off';

export const aiEnabled = () => Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

let client;
const getClient = () => (client ||= new Anthropic());

const SYSTEM_PROMPT = `You are "Kaippesi Jothidar" (கைப்பேசி ஜோதிடர்), a wise, kind South Indian astrologer who answers Prasna (horary) questions in a mobile app.

The app has already computed an exact, live Panchangam and Prasna evaluation (Horai, Rahu Kalam, Yamagandam, Guligai, Tara Bala, Chandra Bala / Chandrashtamam, Nakshatra, Tithi, Yoga, weekday, Prasna Lagna) and a verdict: DO, CAUTION or AVOID. Your job is to explain that result beautifully.

Rules:
- Your answer must agree with the computed verdict. Do not invent planetary positions; use only the data given.
- Start with one clear line: the verdict (e.g. "✅ Yes — go ahead", "⚠️ Proceed with care", "⛔ Not now").
- Then 3–5 short bullet points giving the key astrological reasons in plain words.
- If the verdict is not DO, name the best upcoming time window from the data (local time) so the person knows when to act.
- Offer one simple traditional remedy (parihara) such as lighting a ghee lamp, a short prayer to the relevant deity, or starting after a Ganesha prayer.
- For hospital/surgery, court/legal and money questions, add one gentle line that the doctor's, lawyer's or advisor's professional advice comes first and astrology only guides timing.
- Keep it under 170 words. Warm, respectful, confident. No markdown headings; plain text with emoji bullets is fine.
- Language: reply in the language requested. For Tamil, write natural Tamil script (you may keep planet and nakshatra names in Tamil).`;

function fmtTime(d, tz) {
  if (!d) return null;
  const t = new Date(new Date(d).getTime() + tz * 3600000);
  const day = t.toISOString().slice(0, 10);
  const hh = t.getUTCHours();
  const mm = String(t.getUTCMinutes()).padStart(2, '0');
  const h12 = ((hh + 11) % 12) + 1;
  return `${day} ${h12}:${mm} ${hh < 12 ? 'AM' : 'PM'}`;
}

/** Compact, model-friendly summary of the evaluation. */
export function buildContext({ evaluation, question, category, lang, profile, loc }) {
  const s = evaluation.snapshot;
  const cat = getCategory(category);
  return {
    categoryId: category,
    question: question || `Is this a good time for: ${cat.en}?`,
    category: cat.en,
    replyLanguage: lang === 'ta' ? 'Tamil' : 'English',
    askedAtLocal: fmtTime(s.at, loc.tz),
    place: loc.name || `${loc.lat.toFixed(2)}, ${loc.lon.toFixed(2)}`,
    person: profile ? {
      name: profile.name,
      janmaNakshatra: profile.janmaNakshatraName,
      janmaRasi: profile.janmaRasiName,
      lagna: profile.lagnaName,
      currentDasa: profile.currentDasa,
    } : null,
    panchangam: {
      weekday: s.weekday.en,
      tithi: `${s.tithi.paksha} ${s.tithi.name}`,
      nakshatra: `${s.nakshatra.name} pada ${s.nakshatra.pada}`,
      moonRasi: s.moonRasi.name,
      yoga: s.yoga.name,
      karana: s.karana,
      currentHorai: `${s.currentHora.lord} (until ${fmtTime(s.currentHora.end, loc.tz)})`,
      prasnaLagna: s.lagna ? `${s.lagna.rasiName} ${s.lagna.dms}` : null,
      rahuKalam: `${fmtTime(s.rahuKalam.start, loc.tz)} – ${fmtTime(s.rahuKalam.end, loc.tz)}`,
      yamagandam: `${fmtTime(s.yamagandam.start, loc.tz)} – ${fmtTime(s.yamagandam.end, loc.tz)}`,
    },
    verdict: evaluation.verdict,
    score: evaluation.score,
    factors: evaluation.factors.map((f) => `${f.label} (${f.points > 0 ? '+' : ''}${f.points})`),
    bestUpcomingWindows: evaluation.bestTimes.map((w) => `${fmtTime(w.start, loc.tz)} – ${fmtTime(w.end, loc.tz)} (score ${w.best}, ${w.hora} Horai)`),
  };
}

/** Deterministic narrator used when no AI credentials are configured or the AI call fails. */
export function ruleBasedReply(ctx, evaluation, lang) {
  const ta = lang === 'ta';
  const head = {
    DO: ta ? '✅ ஆம் — தாராளமாக செய்யலாம்.' : '✅ Yes — this is a favourable time. Go ahead.',
    CAUTION: ta ? '⚠️ கவனத்துடன் செய்யலாம்.' : '⚠️ Mixed signals — proceed with care.',
    AVOID: ta ? '⛔ இப்போது வேண்டாம் — சிறந்த நேரத்திற்கு காத்திருக்கவும்.' : '⛔ Not now — better to wait.',
  }[evaluation.verdict];
  const top = [...evaluation.factors].sort((a, b) => Math.abs(b.points) - Math.abs(a.points)).slice(0, 4);
  const lines = top.map((f) => `${f.points >= 0 ? '🌟' : '🔸'} ${ta ? f.labelTa : f.label}`);
  const out = [head, ...lines];
  if (evaluation.verdict !== 'DO' && ctx.bestUpcomingWindows.length) {
    out.push(ta ? `🕰️ சிறந்த நேரம்: ${ctx.bestUpcomingWindows[0]}` : `🕰️ Best upcoming time: ${ctx.bestUpcomingWindows[0]}`);
  }
  out.push(ta ? '🪔 பரிகாரம்: விநாயகரை வணங்கி, நெய் தீபம் ஏற்றி தொடங்கவும்.' : '🪔 Remedy: offer a short prayer to Lord Ganesha and light a ghee lamp before you begin.');
  if (['surgery', 'court', 'cheque', 'loan'].includes(ctx.categoryId)) {
    out.push(ta ? 'ℹ️ மருத்துவர் / வழக்கறிஞர் / ஆலோசகரின் அறிவுரையே முதன்மை; ஜோதிடம் நேரத்தை மட்டும் வழிகாட்டும்.'
      : 'ℹ️ Your doctor’s / lawyer’s / advisor’s professional advice comes first — astrology only guides the timing.');
  }
  return out.join('\n');
}

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

export { VERDICT_TEXT };
