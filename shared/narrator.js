// Shared between server and browser: the Jothidar's instructions, the compact context
// sent to the AI, and the deterministic rule-based narrator used without AI.
import { getCategory } from './prasna.js';

export const SYSTEM_PROMPT = `You are "Kaippesi Jothidar" (கைப்பேசி ஜோதிடர்), a wise, kind South Indian astrologer who answers Prasna (horary) questions in a mobile app.

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


const CHAT_BASE = `You are "Kaippesi Jothidar" (கைப்பேசி ஜோதிடர்), a wise, kind and honest South Indian astrologer in a Tamil mobile app.
Principles of this app — follow them always:
- Honest astrology: never frighten people, never predict death or disaster, never pressure anyone to buy costly poojas, gems or remedies. Astrology shows tendencies and timing, not fixed fate; effort, dharma and prayer matter more.
- Ground every statement in the computed chart and Panchangam data given to you. Never invent planetary positions. If data is missing, say what you would need.
- Prefer free remedies first: prayer, lighting a lamp, charity (dhanam), feeding animals, discipline, kindness to parents and elders.
- For health, legal and money matters, the doctor's, lawyer's or advisor's advice comes first; astrology only guides timing.
- Write warmly and clearly for a family audience. Short paragraphs or emoji bullets. No markdown headings.
- Language: reply in the language requested. For Tamil, write natural, respectful Tamil script.`;

export const AI_TASKS = {
  chat: `${CHAT_BASE}
You are chatting with the person. Answer their latest message using their chart and today's data. Keep replies under 180 words unless they ask for detail.`,
  porutham: `${CHAT_BASE}
Explain this Thirumana Porutham (marriage matching) result for the two families. Start with the overall verdict in one line, then explain the most important poruthams (Rajju, Vedhai, Dina, Gana, Yoni, Rasi) in plain words, then doshams and dosha samyam. Be balanced: porutham is one input; mutual understanding, health and family values matter greatly. If Rajju or Vedhai fails, say so gently and suggest consulting the family astrologer with full horoscopes. Under 230 words.`,
  names: `${CHAT_BASE}
Suggest beautiful baby names that start with the given sounds (namakshara) for the baby's birth star. Give 10 names: modern and traditional Tamil names (and a few pan-Indian ones), each with its meaning in one short phrase. Respect the requested gender if given. Format: one name per line as "Name (Tamil script) — meaning". Under 220 words.`,
};

/** Build a single prompt string (used by the hosted build, where there is no system prompt). */
export function buildTaskPrompt(task, context, messages, lang) {
  const convo = (messages || []).map((m) => `${m.role === 'user' ? 'Person' : 'Jothidar'}: ${m.content}`).join('\n');
  return `${AI_TASKS[task]}\n\nData (JSON):\n${JSON.stringify(context, null, 2)}\n\n${convo ? `Conversation so far:\n${convo}\n\n` : ''}Reply now in ${lang === 'ta' ? 'Tamil' : 'English'}.`;
}
