// Thunai Engine (துணை தேடல் இயந்திரம்): live web search for "Thunai For You". From what the app worked out on the
// phone (the chart's job fields, a hospital speciality, a legal problem type, a study stream) and the person's
// city, Claude searches the web and returns a short list of real places / openings — each with the page it came from.
//
// Privacy: only the category, the city / country and short keywords are sent — never a name, birth details or a
// chart. Trust: every item must carry a URL from this search's own results (domains are checked); phone numbers
// and addresses are kept only when the model copied them from those pages; anything else is dropped. The model gives
// no medical or legal advice and no predictions — it only finds and lists.
import Anthropic from '@anthropic-ai/sdk';

export const SEARCH_MODEL = process.env.AI_SEARCH_MODEL || process.env.AI_MODEL || 'claude-opus-5-5';
const SEARCH_TIMEOUT_MS = Number(process.env.AI_SEARCH_TIMEOUT_MS) || 90000;
const MAX_ITEMS = 8;

/** Categories the engine searches, and what each search is for (shown to the model). */
export const SEARCH_CATEGORIES = Object.freeze({
  job: 'current job openings (with the employer and the job page) that match the keywords',
  hospital: 'well-reviewed hospitals and specialist clinics (government and private) for the speciality',
  lawyer: 'lawyers or law firms for the legal problem, plus free legal-aid services (Legal Services Authority) in that city',
  college: 'colleges, universities and recognised courses for the study stream, with admission pages',
  matrimony: 'established, verified matrimony services and marriage bureaus (never individual profiles or private people)',
});

const ITEM_SCHEMA_TEXT = `Reply with ONLY a JSON object, no other text:
{"summary": "<2 short sentences in the reply language>",
 "items": [{"name": "<organisation / job title + employer>", "kind": "<government | private | listing | aid>",
   "why": "<one short line in the reply language: why it fits the need>",
   "address": "<only if shown on the source page, else empty>", "phone": "<only if shown on the source page, else empty>",
   "url": "<the exact page URL from your search results>"}]}`;

const SYSTEM = `You are the search assistant of Thunai, a Tamil family astrology and life-guidance app by AG Technology Solutions.
Your only job: search the web and list real, currently available places or openings that meet the person's need, near their city.
Rules:
- Use web search. Every item must come from a page in your search results, and "url" must be that page's exact URL.
- Never invent names, addresses, phone numbers or URLs. Leave address / phone empty unless the source page shows them.
- Prefer official and government sources, and well-known established organisations. Up to ${MAX_ITEMS} items.
- No medical, legal or financial advice and no predictions — only find and describe what you found, neutrally.
- Never list individual private people (for matrimony: services and bureaus only).
- Reply language: Tamil when lang is "ta", otherwise English. Keep names in their original form.
${ITEM_SCHEMA_TEXT}`;

let client;
const getClient = () => (client ||= new Anthropic());
const clip = (s, n) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const hostOf = (u) => { try { const x = new URL(u); return x.protocol === 'https:' || x.protocol === 'http:' ? x.hostname.replace(/^www\./, '').toLowerCase() : null; } catch { return null; } };

/** The request the engine sends (exported for tests). */
export function buildSearchRequest({ category, place, cc, keywords = [], lang = 'en' }) {
  const city = clip(String(place || '').split(',')[0], 60);
  const need = `${SEARCH_CATEGORIES[category]}. Keywords: ${keywords.map((k) => clip(k, 60)).filter(Boolean).slice(0, 6).join(', ') || 'none'}.`;
  return {
    model: SEARCH_MODEL,
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'low' },
    system: SYSTEM,
    tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 5, ...(city ? { user_location: { type: 'approximate', city, ...(cc && /^[A-Z]{2}$/.test(cc) ? { country: cc } : {}) } } : {}) }],
    messages: [{ role: 'user', content: `Need: ${need}\nCity: ${city || 'unknown'}${cc ? ` (country ${cc})` : ''}\nlang: ${lang === 'ta' ? 'ta' : 'en'}` }],
  };
}

/** Domains and URLs that appeared in the search results of a response (the only ones items may cite). */
export function resultSources(content = []) {
  const urls = new Set(), hosts = new Set();
  for (const b of content) {
    if (b?.type === 'web_search_tool_result' && Array.isArray(b.content)) {
      for (const r of b.content) if (r?.type === 'web_search_result' && r.url) { urls.add(r.url); const h = hostOf(r.url); if (h) hosts.add(h); }
    }
    if (b?.type === 'text' && Array.isArray(b.citations)) for (const c of b.citations) if (c?.url) { urls.add(c.url); const h = hostOf(c.url); if (h) hosts.add(h); }
  }
  return { urls, hosts };
}

/** Parse and check the model's JSON: keep items whose URL is from this search's own results. */
export function cleanResults(text, sources) {
  const m = String(text || '').match(/\{[\s\S]*\}/);
  let data = null;
  try { data = m ? JSON.parse(m[0]) : null; } catch { data = null; }
  if (!data || !Array.isArray(data.items)) return { summary: '', items: [], dropped: 0 };
  let dropped = 0;
  const items = [];
  for (const it of data.items) {
    const host = hostOf(it?.url);
    if (!host || !(sources.urls.has(it.url) || sources.hosts.has(host))) { dropped += 1; continue; }
    items.push({
      name: clip(it.name, 120), kind: ['government', 'private', 'listing', 'aid'].includes(it.kind) ? it.kind : 'listing',
      why: clip(it.why, 200), address: clip(it.address, 160), phone: clip(String(it.phone || '').replace(/[^\d+\-\s()]/g, ''), 30),
      url: String(it.url).slice(0, 500), source: host,
    });
    if (items.length >= MAX_ITEMS) break;
  }
  return { summary: clip(data.summary, 400), items, dropped };
}

/** One search: handles pause_turn (server-tool loop) and a timeout. Returns the final message. */
async function callSearch(params, timeoutMs = SEARCH_TIMEOUT_MS) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    let messages = params.messages;
    let content = [];
    for (let turn = 0; turn < 4; turn++) {
      const msg = await getClient().messages.stream({ ...params, messages }, { signal: ac.signal }).finalMessage();
      content = content.concat(msg.content);
      if (msg.stop_reason !== 'pause_turn') return { ...msg, allContent: content };
      messages = [...messages, { role: 'assistant', content: msg.content }]; // continue the paused server-tool turn
    }
    throw new Error('search did not finish');
  } finally { clearTimeout(timer); }
}

let searchCaller = callSearch;
/** Test seam: substitute the model call (never used by production code paths). */
export function setSearchCallerForTests(fn) { searchCaller = typeof fn === 'function' ? fn : callSearch; }

/**
 * Find real resources on the web. Returns { summary, items:[{ name, kind, why, address, phone, url, source }], searched }.
 * Throws on model failure (the caller answers with the app's own links instead).
 */
export async function findResources({ category, place, cc, keywords, lang, onUsage }) {
  if (!Object.hasOwn(SEARCH_CATEGORIES, category)) throw new Error('unknown category');
  const params = buildSearchRequest({ category, place, cc, keywords, lang });
  const msg = await searchCaller(params);
  try { onUsage?.({ ...msg.usage, model: msg.model }); } catch { /* metrics never break a search */ }
  if (msg.stop_reason === 'refusal') throw new Error('search refused');
  const all = msg.allContent || msg.content || [];
  const text = (msg.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
  const res = cleanResults(text, resultSources(all));
  return { ...res, searched: [...resultSources(all).hosts].slice(0, 12) };
}
