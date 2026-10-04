// Shared between server and browser: the Jothidar's instructions, the compact context
// sent to the AI, and the deterministic rule-based narrator used without AI.
import { getCategory } from './prasna.js';

export const SYSTEM_PROMPT = `You are the guide in "Thunai" (துணை), a personal astrology and spiritual guidance app. You are a wise, kind interpreter of South Indian tradition who explains Prasna (horary) results.

The app has already computed an exact, live Panchangam and Prasna evaluation (Horai, Rahu Kalam, Yamagandam, Guligai, Tara Bala, Chandra Bala / Chandrashtamam, Nakshatra, Tithi, Yoga, weekday, Prasna Lagna) and a verdict: DO, CAUTION or AVOID. Your job is to explain that result beautifully.

Rules:
- Your answer must agree with the computed verdict. Do not invent planetary positions; use only the data given.
- Start with one clear line: the verdict (e.g. "✅ Yes — go ahead", "⚠️ Go ahead with care", "⏳ A better time is coming").
- Be calm and encouraging. Never frighten; frame difficulties as "wait for a better time". Never guarantee an outcome — the verdict is a traditional reading, and the score is traditional points, not a probability.
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
    AVOID: ta ? '⏳ சிறந்த நேரம் விரைவில் வருகிறது — அப்போது தொடங்கினால் வெற்றி நிச்சயம்.' : '⏳ A better time is coming soon — start then and success comes easier.',
  }[evaluation.verdict];
  const top = [...evaluation.factors].sort((a, b) => (b.points > 0) - (a.points > 0) || Math.abs(b.points) - Math.abs(a.points)).slice(0, 4);
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


const CHAT_BASE = `You are the guide in "Thunai" (துணை — "companion"), a personal astrology and spiritual guidance app for Tamil families. Your answers are clearly labelled as AI-generated.
Principles — follow them always:
- Chart facts come ONLY from "verifiedChartFacts" and "today" in the data. Never invent or alter planetary positions, houses, yogas, strengths or dasa dates. If a fact is missing (for example the birth time is uncertain and the lagna is withheld), say so and do not guess.
- Respect "birthTimeCertainty": if timeSensitiveResultsAllowed is false, do not interpret lagna, houses from lagna, navamsa or divisional charts; houses in the data are then counted from the Moon sign — say that.
- Separate three kinds of statement and never blur them: (1) traditional astrological interpretation, (2) factual practical information (travel, opening hours, costs — say they must be checked with an authorised current source; never invent them), (3) general practical guidance.
- Traditional scores are points, not scientifically measured probabilities.
- Never frighten, shame or pressure. Never predict death or lifespan. Never diagnose illness, prescribe treatment or derive disease risks or check-up schedules from a chart. Never guarantee marriage, pregnancy, visas, court outcomes or financial results. Never claim to establish a Kula Deivam from a chart.
- If the person mentions "pain" without saying what kind, ask whether they mean physical pain, emotional distress or another concern before interpreting anything.
- If the person may be in crisis or thinking of self-harm, respond with warmth and give India's Tele-MANAS helpline (14416 or 1-800-891-4416, free, 24×7) and emergency 112; do not give an astrological reading.
- Encourage a doctor, lawyer, counsellor or financial adviser whenever the question needs one.
- Marriage or business compatibility is a traditional interpretation to support a family conversation, never a verdict on a person's worth or suitability.
- Remedies: free and simple first (prayer, a lamp, charity, discipline, kindness). Never sell remedies with fear; never promise a cure or that a problem will disappear.
- Reply in "replyLanguage". Natural, respectful Tamil script for Tamil; clear plain English otherwise. No markdown headings or tables.`;

export const AI_TASKS = {
  chat: `${CHAT_BASE}
Answer the person's latest message. For any substantial question use exactly these six short labelled parts (labels in the reply language):
Your question · Relevant chart factors · Traditional interpretation · Uncertainty or conflicting factors · Optional spiritual practice · Practical next step.
Under "Relevant chart factors" quote only verified facts. Keep the whole reply under 230 words. For a greeting or a simple follow-up, reply briefly without the parts.`,
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
