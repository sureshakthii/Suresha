// Shared UI core: state, language, formatting, API/AI plumbing, family profiles and navigation.
import { birthChart, RASIS, NAKSHATRAS, PLANETS } from './shared/astro.js';
import { placeTa } from './shared/places.js';
import { ageOn, localDateIn, isValidZone } from './shared/datetime.js';
import { settingsLabel } from './shared/engine-contract.js';
import { resolveProfile } from './shared/rules/profiles.js';

// Thunai (துணை) — shared UI core.
// Hosted test build (no backend): everything is computed on the device and
// "Ask Thunai" answers through the viewer's own Claude account when available.
export const STATIC = Boolean(window.KJ_STATIC);

export const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};

// Migrate the single profile of earlier versions into the family list.
const legacy = store.get('kj_profile', null);
const initialFamily = store.get('kj_family', legacy ? [{ id: 'me', relation: 'self', ...legacy }] : []);

export const state = {
  lang: store.get('kj_lang', 'ta'),
  family: initialFamily,
  activeId: store.get('kj_active', initialFamily[0]?.id || null),
  ancestors: store.get('kj_ancestors', []),
  loc: store.get('kj_loc', null),
  settings: store.get('kj_settings', { large: false, voice: true }),
  user: null,
  providers: null,
  view: 'home',
  snap: null,
  snapAt: 0,
};

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const ta = () => state.lang === 'ta';
/** Inline bilingual text: L('English', 'தமிழ்'). */
export const L = (en, taText) => (ta() ? taText : en);
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const bi = (o) => (o ? (ta() ? o.ta : o.en) : '');

export const GLYPH = { Sun: '☉', Moon: '☽', Mars: '♂', Mercury: '☿', Jupiter: '♃', Venus: '♀', Saturn: '♄', Rahu: '☊', Ketu: '☋', get Lagna() { return ta() ? 'ல' : 'Asc'; } };
// Planet colours are CSS variables so each theme (light / night / cosmic panels) can keep them readable.
export const COLOR = Object.fromEntries(['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu', 'Lagna'].map((k) => [k, `var(--pl-${k})`]));
export const planetName = (k) => (ta() ? PLANETS[k].ta : k);
export const rasiName = (i) => (ta() ? RASIS[i].ta : RASIS[i].en);
export const nakName = (i) => (ta() ? NAKSHATRAS[i].ta : NAKSHATRAS[i].en);
export const placeName = (p) => (ta() ? placeTa(p || '') : p || '');
export const yogaName = (y) => (ta() ? y.ta || y.name : y.name);
export const karanaName = (s) => (ta() ? s.karanaTa || s.karana : s.karana);

// ---------------------------------------------------------------- time
export const localParts = (d, tz) => new Date(new Date(d).getTime() + tz * 3600000);
export function fmtTime(d, tz, sec = false) {
  if (!d) return '—';
  const x = localParts(d, tz);
  const h = x.getUTCHours();
  const m = String(x.getUTCMinutes()).padStart(2, '0');
  const s = String(x.getUTCSeconds()).padStart(2, '0');
  const hm = `${((h + 11) % 12) + 1}:${m}${sec ? `:${s}` : ''}`;
  if (ta()) return `${h >= 4 && h < 12 ? 'காலை' : h >= 12 && h < 16 ? 'மதியம்' : h >= 16 && h < 19 ? 'மாலை' : 'இரவு'} ${hm}`;
  return `${hm} ${h < 12 ? 'AM' : 'PM'}`;
}
export function fmtDate(d, tz) {
  const x = localParts(d, tz);
  return `${String(x.getUTCDate()).padStart(2, '0')}-${String(x.getUTCMonth() + 1).padStart(2, '0')}-${x.getUTCFullYear()}`;
}
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_TA = ['ஜனவரி', 'பிப்ரவரி', 'மார்ச்', 'ஏப்ரல்', 'மே', 'ஜூன்', 'ஜூலை', 'ஆகஸ்ட்', 'செப்டம்பர்', 'அக்டோபர்', 'நவம்பர்', 'டிசம்பர்'];
export const monthName = (m0) => (ta() ? MONTHS_TA[m0] : MONTHS_EN[m0]);
export const fmtIsoDate = (iso) => { const [y, m, d] = iso.split('-').map(Number); return `${d} ${monthName(m - 1)} ${y}`; };
export function countdown(to, now = Date.now()) {
  if (!to) return '—';
  let s = Math.max(0, Math.floor((new Date(to).getTime() - now) / 1000));
  const h = Math.floor(s / 3600); s -= h * 3600;
  const m = Math.floor(s / 60); s -= m * 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ---------------------------------------------------------------- family
export const activeMember = () => state.family.find((m) => m.id === state.activeId) || state.family[0] || null;
const chartCache = new Map();
/** Time precision of a profile: 'exact' | 'approximate' | 'unknown' (old profiles with a time are exact). */
export const precisionOf = (m) => (m?.timePrecision && ['exact', 'approximate', 'unknown'].includes(m.timePrecision) ? m.timePrecision : m?.time ? 'exact' : 'unknown');
/** birthChart() input for a stored profile — IANA zone when recorded, numeric tz for older profiles. */
export function birthArgs(m) {
  const timePrecision = precisionOf(m);
  const zone = m.zone && isValidZone(m.zone) ? m.zone : undefined;
  return { name: m.name, date: m.date, time: timePrecision === 'unknown' ? '' : m.time, lat: Number(m.lat), lon: Number(m.lon), tz: Number(m.tz ?? 5.5), place: m.place, zone, timePrecision };
}
export function chartOf(m) {
  if (!m) return null;
  const key = `${m.id}|${m.date}|${m.time}|${m.lat}|${m.lon}|${m.tz}|${m.zone || ''}|${precisionOf(m)}`;
  if (!chartCache.has(key)) chartCache.set(key, birthChart(birthArgs(m)));
  return chartCache.get(key);
}
/** True when the chart has a Lagna (birth time known or approximate). */
export const hasLagna = (c) => !!c?.planets?.Lagna;
export const needsTimeText = () => L('needs birth time', 'பிறந்த நேரம் தேவை');
/** Lagna sign name, or "needs birth time" when the time is unknown. */
export const lagnaText = (c) => (hasLagna(c) ? rasiName(c.planets.Lagna.rasi) : needsTimeText());
/** Small chip for an item that changes within the birth-time uncertainty window (approximate time). */
export function unstableChip(c, key) {
  if (!c?.stability || c.timePrecision === 'exact' || !c.stability.unstable?.includes(key)) return '';
  return ` <span class="chip-unstable">${L('unstable — depends on exact time', 'நிலையற்றது — சரியான நேரத்தைப் பொறுத்தது')}</span>`;
}
/** One-card note explaining approximate / unknown birth time for a chart. */
export function precisionNote(c) {
  if (!c || c.timePrecision === 'exact' || !c.timePrecision) return '';
  if (c.timePrecision === 'unknown') {
    return `<div class="card glass note-card" role="note"><b>${L('Birth time unknown', 'பிறந்த நேரம் தெரியவில்லை')}</b><p class="small">${L('Lagna and houses are not calculated — they are marked "needs birth time". Moon-based details (star, rasi, dasa) are shown; the dasa start is approximate.', 'லக்னமும் பாவங்களும் கணிக்கப்படவில்லை — "பிறந்த நேரம் தேவை" எனக் குறிக்கப்பட்டுள்ளன. சந்திரன் சார்ந்த விவரங்கள் (நட்சத்திரம், ராசி, தசை) காட்டப்படுகின்றன; தசை தொடக்கம் தோராயமானது.')}</p></div>`;
  }
  const n = (c.stability?.unstable || []).length;
  return `<div class="card glass note-card" role="note"><b>${L('Approximate birth time', 'தோராயமான பிறந்த நேரம்')}</b><p class="small">${L(`Checked ±${c.stability?.windowMinutes || 30} minutes: ${n} item(s) could change. They carry an "unstable" chip.`, `±${c.stability?.windowMinutes || 30} நிமிடம் சரிபார்க்கப்பட்டது: ${n} விவரங்கள் மாறலாம். அவற்றுக்கு "நிலையற்றது" குறி உள்ளது.`)}</p></div>`;
}
/** Chip for rules that are proposed (not yet approved by the reviewing astrologer). */
export const reviewChip = (status = 'proposed') => (status === 'approved' ? '' : ` <span class="chip-review">${L('Proposed rule — awaiting astrologer review', 'முன்மொழியப்பட்ட விதி — ஜோதிடர் மதிப்பாய்வுக்குக் காத்திருக்கிறது')}</span>`);
/** Small line under every chart report: tradition profile name and engine settings. */
export function reportMeta(profile) {
  const pr = profile?.name ? profile : resolveProfile(profile);
  return `<p class="report-meta small">${L('Tradition profile', 'மரபு முறை')}: ${esc(bi(pr.name))} · ${L('Calculation', 'கணிப்பு')}: ${esc(bi(settingsLabel()))}</p>`;
}
/** Today's local calendar date (YYYY-MM-DD) for a profile — its own zone, else the current location offset. */
export function todayIsoFor(m) {
  if (m?.zone && isValidZone(m.zone)) return localDateIn(m.zone);
  const tz = state.loc?.tz ?? 5.5;
  return new Date(Date.now() + tz * 3600000).toISOString().slice(0, 10);
}
/** Completed years for a profile (calendar arithmetic via shared/datetime.js ageOn). */
export const memberAge = (m) => (m?.date ? ageOn(m.date, todayIsoFor(m)) : null);
export const RELATIONS = [
  { id: 'self', en: 'Self', ta: 'நான்' }, { id: 'spouse', en: 'Spouse', ta: 'வாழ்க்கைத் துணை' },
  { id: 'son', en: 'Son', ta: 'மகன்' }, { id: 'daughter', en: 'Daughter', ta: 'மகள்' },
  { id: 'father', en: 'Father', ta: 'தந்தை' }, { id: 'mother', en: 'Mother', ta: 'தாய்' },
  { id: 'other', en: 'Other', ta: 'மற்றவர்' },
  { id: 'organization', en: 'Company / Team', ta: 'நிறுவனம் / குழு' },
];

let syncTimer;
export function saveFamily() {
  store.set('kj_family', state.family);
  store.set('kj_active', state.activeId);
  store.set('kj_ancestors', state.ancestors);
  if (state.user && !STATIC) {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => api('/api/me/data', { method: 'PUT', body: { data: { family: state.family, activeId: state.activeId, ancestors: state.ancestors } } }).catch(() => {}), 600);
  }
}
export function saveSettings() { store.set('kj_settings', state.settings); document.body.classList.toggle('large', !!state.settings.large); applyTheme(); }
/** Theme: 'light' (default, best readability), 'dark' (cosmic night) or 'auto' (follow the phone). */
export function applyTheme() {
  const pref = state.settings.theme || 'light';
  const dark = pref === 'dark' || (pref === 'auto' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0b0620' : '#f6f1e8');
}
applyTheme();
window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);
export function setLoc(loc) { state.loc = loc; store.set('kj_loc', loc); state.snapAt = 0; }

// ---------------------------------------------------------------- network
export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(path, {
    method, credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || `Request failed (${res.status})`), { status: res.status });
  return data;
}

/** POST and read a Server-Sent Events stream: handlers keyed by event name. */
export async function sse(path, body, handlers) {
  const res = await fetch(path, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' }, body: JSON.stringify(body) });
  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => ({}));
    throw Object.assign(new Error(data.error || 'network'), { status: res.status });
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf('\n\n')) >= 0) {
      const chunk = buf.slice(0, i); buf = buf.slice(i + 2);
      const ev = /event: (\w+)/.exec(chunk)?.[1];
      const data = JSON.parse(/data: (.*)/s.exec(chunk)?.[1] || '{}');
      handlers[ev]?.(data);
    }
  }
}

// ---------------------------------------------------------------- Ask Thunai policy context
/** ISO-2 country from coordinates (same coarse boxes the server uses); null when unsure. */
export function countryOf(loc) {
  const lat = Number(loc?.lat), lon = Number(loc?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat >= 22.4 && lat <= 26.5 && lon >= 51.0 && lon <= 56.6) return 'AE';
  if (lat >= 6.5 && lat <= 35.7 && lon >= 68.0 && lon <= 97.5) return 'IN';
  return null;
}
const ss = {
  get(k) { try { return JSON.parse(sessionStorage.getItem(k) || 'null'); } catch { return null; } },
  set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
};
/** Random per-tab session id for signed-out users (never derived from personal data). */
export function sessionId() {
  let id = ss.get('kj_sid');
  if (!id) { id = Array.from(crypto.getRandomValues(new Uint8Array(9)), (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 16); ss.set('kj_sid', id); }
  return id;
}
/** sessionFlags from the previous policy answer are echoed back exactly (per chat channel, this tab only). */
const flagsKey = (channel) => `kj_flags_${channel}`;
export const sessionFlagsFor = (channel) => ss.get(flagsKey(channel)) || {};
export const rememberSessionFlags = (channel, flags) => { if (flags && typeof flags === 'object') ss.set(flagsKey(channel), flags); };

/**
 * Speaker / subject / participants for the server's age-aware policy (brief §17–§18).
 * Speaker is 'self' (with the self profile's birth date) when viewing one's own chart, otherwise 'guardian'.
 */
export function policyContext(member = activeMember(), { channel = 'chat', participants = [] } = {}) {
  const self = state.family.find((m) => m.relation === 'self');
  const viewingSelf = !member || member.relation === 'self';
  const speaker = viewingSelf ? { type: 'self', ...(self?.date ? { dob: self.date } : member?.date ? { dob: member.date } : {}) }
    : { type: 'guardian', ...(self?.date ? { dob: self.date } : {}) };
  const subject = member ? { relation: member.relation || 'other', ...(member.date && member.relation !== 'organization' ? { dob: member.date } : {}) } : { relation: 'self' };
  const out = { speaker, subject, participants, sessionFlags: sessionFlagsFor(channel) };
  if (!state.user) out.sessionId = sessionId();
  const country = countryOf(state.loc);
  if (country) out.country = country;
  return out;
}
/** Birth details the server can recompute (only when the time is known — the server never gets an invented time). */
export function serverBirth(m) {
  if (!m?.date || m.relation === 'organization') return undefined;
  const tp = precisionOf(m);
  const zone = m.zone && isValidZone(m.zone) ? m.zone : undefined;
  // The server honours zone and timePrecision; an unknown time gets no Lagna there either.
  return { name: m.name, date: m.date, time: tp === 'unknown' ? undefined : m.time, lat: m.lat, lon: m.lon, tz: m.tz, zone, timePrecision: tp, place: m.place, relation: m.relation };
}

export const LIMITED_NOTICE = () => L('Ask Thunai could not reach the server, so this is a limited, rule-based answer from the app.', 'துணை சேவையகத்தை அணுக முடியவில்லை; இது செயலியின் வரையறுக்கப்பட்ட விதி அடிப்படையிலான பதில்.');
export const STATIC_NOTICE = () => L('Ask Thunai needs the server for detailed answers — this preview shows rule-based guidance only.', 'விரிவான பதில்களுக்கு துணைக்கு சேவையகம் தேவை — இந்த முன்னோட்டத்தில் விதி அடிப்படையிலான வழிகாட்டல் மட்டும்.');

/**
 * Ask Thunai for a task ('chat' | 'porutham' | 'names'). onText receives the WHOLE text so far.
 * Resolves { text, source: 'ai' | 'rules' | 'policy' | 'offline', meta } where meta carries the server's
 * policy, resources, evidence, notice, nextSteps and uncertainty (render with policyExtrasHtml).
 * The hosted static build never calls a model from the browser.
 */
export async function aiTask({ task, context, messages = [], fallbackText, onText, member = activeMember(), birth, channel = 'chat', participants = [] }) {
  if (STATIC) {
    onText?.(fallbackText);
    return { text: fallbackText, source: 'rules', meta: { notice: STATIC_NOTICE() } };
  }
  let text = '';
  let source = 'rules';
  let meta = {};
  const body = { context, messages, lang: state.lang, fallbackText, ...policyContext(member, { channel, participants }) };
  const b = birth === undefined ? serverBirth(member) : birth;
  if (b) body.birth = b;
  try {
    await sse(`/api/ai/${task}`, body, {
      policy: (d) => { meta = { ...meta, ...d }; rememberSessionFlags(channel, d.policy?.sessionFlags); },
      delta: (d) => { text += d.text; onText?.(text); },
      reset: () => { text = ''; onText?.(''); },
      done: (d) => { source = d.source; },
    });
  } catch (e) {
    if (e.status) { text = `${e.message}\n\n${fallbackText}`; meta = { notice: e.message }; }
    else { text = fallbackText; source = 'offline'; meta = { notice: LIMITED_NOTICE() }; }
    onText?.(text);
  }
  return { text, source, meta };
}

/** Resources (help contacts), notice and "Why this guidance?" evidence from a server answer. Internal labels are never shown. */
export function policyExtrasHtml(meta = {}) {
  const r = meta.resources;
  const contacts = r?.contacts || [];
  const parts = [];
  if (meta.notice) parts.push(`<p class="notice small" role="note">ℹ️ ${esc(typeof meta.notice === 'string' ? meta.notice : bi(meta.notice))}</p>`);
  if (contacts.length || r?.fallback) {
    parts.push(`<div class="help-contacts" role="note"><b>${L('Help contacts', 'உதவி எண்கள்')}</b>${contacts.map((c) => `<div class="small">📞 ${esc(c.name)}: <a href="tel:${esc(String(c.number).replace(/[^\d+]/g, ''))}">${esc(c.number)}</a>${c.needsVerification ? ` <span class="chip-review">${L('needs verification', 'சரிபார்க்க வேண்டும்')}</span>` : ''}${c.source ? ` <small class="muted">· ${esc(c.source)}${c.lastVerified ? ` · ${L('checked', 'சரிபார்த்தது')} ${esc(c.lastVerified)}` : ''}</small>` : ''}</div>`).join('')}
      ${r?.fallback ? `<p class="small">${esc(typeof r.fallback === 'string' ? r.fallback : bi(r.fallback))}</p>` : ''}<p class="muted small">${L('Please verify the local emergency number where you are.', 'நீங்கள் இருக்கும் இடத்தின் அவசர எண்ணைச் சரிபார்க்கவும்.')}</p></div>`);
  }
  if (meta.nextSteps?.length) parts.push(`<div class="small"><b>${L('Next steps', 'அடுத்த படிகள்')}</b><ul>${meta.nextSteps.map((n) => `<li>${esc(typeof n === 'string' ? n : bi(n))}</li>`).join('')}</ul></div>`);
  if (meta.uncertainty) parts.push(`<p class="muted small">${esc(typeof meta.uncertainty === 'string' ? meta.uncertainty : bi(meta.uncertainty))}</p>`);
  if (meta.evidence?.length) parts.push(`<details class="why"><summary>${L('Why this guidance?', 'இந்த வழிகாட்டல் ஏன்?')}</summary>${meta.evidence.map((e) => `<div class="small">• ${esc(typeof e.text === 'string' ? e.text : bi(e.text))}${e.source ? ` <small class="muted">· ${esc(typeof e.source === 'string' ? e.source : bi(e.source))}</small>` : ''}</div>`).join('')}</details>`);
  return parts.join('');
}

// ---------------------------------------------------------------- UI helpers
export function toast(msg, ms = 2600) {
  let el = $('#toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; el.setAttribute('role', 'status'); document.body.append(el); }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), ms);
}

// ---------------------------------------------------------------- voice
let voicesReady;
function loadVoices() {
  if (!('speechSynthesis' in window)) return Promise.resolve([]);
  voicesReady ||= new Promise((res) => {
    const have = speechSynthesis.getVoices();
    if (have.length) { res(have); return; }
    const done = () => res(speechSynthesis.getVoices());
    speechSynthesis.addEventListener('voiceschanged', done, { once: true });
    setTimeout(done, 1500);
  });
  return voicesReady;
}
const isTamil = (text) => /[\u0B80-\u0BFF]/.test(text);

/** Strip emoji/markup and split into sentence-sized chunks (long utterances get cut off on phones). */
function speechChunks(text) {
  const clean = text.replace(/\p{Extended_Pictographic}|\uFE0F|[•▍*#_>]/gu, ' ').replace(/\s+/g, ' ').trim();
  const parts = clean.split(/(?<=[.!?।|\n])\s+/);
  const out = [];
  for (const p of parts) {
    if (p.length <= 180) { if (p) out.push(p); continue; }
    for (let i = 0; i < p.length; i += 180) out.push(p.slice(i, i + 180));
  }
  return out;
}

export const voiceState = { speaking: false, hasTamil: null };

/**
 * Read text aloud with a matching voice. Tamil text is spoken only with a Tamil voice; if the phone has none,
 * we explain how to install one instead of reading Tamil letters with an English voice.
 * Returns a promise that resolves when speaking ends (or false if it could not start).
 */
export async function speak(text, { rate = 0.92, onEnd } = {}) {
  if (!('speechSynthesis' in window) || !state.settings.voice) { toast(L('Read-aloud is switched off or not available on this device', 'வாசித்துக்காட்டும் வசதி இந்தச் சாதனத்தில் இல்லை அல்லது நிறுத்தப்பட்டுள்ளது')); return false; }
  const voices = await loadVoices();
  const tamil = isTamil(text);
  const voice = tamil
    ? voices.find((v) => /^ta(-|_|$)/i.test(v.lang)) || null
    : voices.find((v) => /en[-_]IN/i.test(v.lang)) || voices.find((v) => /^en/i.test(v.lang)) || null;
  voiceState.hasTamil = voices.some((v) => /^ta/i.test(v.lang));
  if (tamil && !voice) {
    toast(L('Install the Tamil voice: Settings → Google Text-to-speech → Install voice data → Tamil', 'தமிழ் குரலை நிறுவவும்: Settings → Google Text-to-speech → Install voice data → Tamil'), 6000);
    return false;
  }
  speechSynthesis.cancel();
  const chunks = speechChunks(text);
  voiceState.speaking = true;
  return new Promise((resolve) => {
    chunks.forEach((c, i) => {
      const u = new SpeechSynthesisUtterance(c);
      u.lang = tamil ? 'ta-IN' : 'en-IN';
      if (voice) u.voice = voice;
      u.rate = rate;
      if (i === chunks.length - 1) u.onend = () => { voiceState.speaking = false; onEnd?.(); resolve(true); };
      u.onerror = () => { voiceState.speaking = false; resolve(false); };
      speechSynthesis.speak(u);
    });
  });
}
export function stopSpeaking() { if ('speechSynthesis' in window) speechSynthesis.cancel(); voiceState.speaking = false; }

/** Tamil-first speech recognition (Chrome / Android / iOS Safari). Resolves the final transcript. */
export function listen({ onPartial } = {}) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return Promise.reject(new Error('unsupported'));
  return new Promise((resolve, reject) => {
    const rec = new SR();
    rec.lang = ta() ? 'ta-IN' : 'en-IN';
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.continuous = false;
    let text = '';
    rec.onresult = (e) => { text = [...e.results].map((x) => x[0].transcript).join(' '); onPartial?.(text); };
    rec.onerror = (e) => reject(new Error(e.error || 'error'));
    rec.onend = () => resolve(text.trim());
    try { rec.start(); } catch (e) { reject(e); }
  });
}
export const micMessage = (code) => ({
  'not-allowed': L('Allow microphone access for this site in your browser settings.', 'உலாவி அமைப்புகளில் இந்தத் தளத்திற்கு மைக்ரோஃபோன் அனுமதி தரவும்.'),
  'service-not-allowed': L('Allow microphone access for this site in your browser settings.', 'உலாவி அமைப்புகளில் இந்தத் தளத்திற்கு மைக்ரோஃபோன் அனுமதி தரவும்.'),
  'no-speech': L('I did not hear anything — please speak after the beep.', 'எதுவும் கேட்கவில்லை — மீண்டும் பேசவும்.'),
  network: L('Voice typing needs an internet connection.', 'குரல் தட்டச்சுக்கு இணைய இணைப்பு தேவை.'),
  unsupported: L('Voice input is not supported in this browser. Please use Chrome.', 'இந்த உலாவியில் குரல் உள்ளீடு இல்லை. Chrome பயன்படுத்தவும்.'),
}[code] || L('Could not use the microphone', 'மைக்ரோஃபோனைப் பயன்படுத்த முடியவில்லை'));

/** Copyright footer shown on the main pages. */
export const copyright = () => `<footer class="copy">© 2026 ${L('Thunai. All rights reserved.', 'துணை. அனைத்து உரிமைகளும் பாதுகாக்கப்பட்டவை.')}</footer>`;
/** App name in the current language. */
export const appName = () => L('Thunai', 'துணை');

/** Name to show for a family member: their Tamil name in Tamil mode when given. */
export const displayName = (m) => (m ? (ta() && m.nameTa ? m.nameTa : m.name) : '');

/** Small card shown where a feature needs the installed app (server), e.g. on the hosted test page. */
export const needsServerCard = (what) => `<div class="card glass coming"><b>📲 ${L('Available in the installed app', 'நிறுவப்பட்ட செயலியில் கிடைக்கும்')}</b><p class="small">${what}</p></div>`;

/** Star/pada <select> options (pada gives the rasi). */
export function starOptions(selected) {
  return NAKSHATRAS.map((n, i) => `<option value="${i}"${i === selected ? ' selected' : ''}>${esc(ta() ? n.ta : n.en)}</option>`).join('');
}
export const rasiOfStarPada = (star, pada) => Math.floor((star * 4 + (pada - 1)) / 9);

// ---------------------------------------------------------------- navigation
const screens = {};
export const registerScreen = (name, def) => { screens[name] = def; };
export const currentScreen = () => screens[state.view];
/** The five destinations (brief §8). Every other screen hangs under one of them through `parent`. */
export const TABS = ['home', 'chart', 'family', 'plan', 'chat'];
/** Tab that owns a screen: its own `tab`, itself when it is a destination, or the nearest parent destination. */
export function tabOf(view) {
  let v = view;
  for (let i = 0; i < 6 && v; i++) {
    if (screens[v]?.tab) return screens[v].tab;
    if (TABS.includes(v)) return v;
    v = screens[v]?.parent;
  }
  return null;
}

export function go(view, params = {}) {
  if (!screens[view]) return;
  if (screens[view].needsMember && !activeMember()) { view = 'family'; params = { add: true, first: true }; }
  const prev = state.view;
  state.view = view;
  state.params = params;
  let sec = $(`#view-${view}`);
  if (!sec) {
    sec = document.createElement('section');
    sec.id = `view-${view}`;
    sec.className = 'view';
    $('#views').append(sec);
  }
  $$('.view').forEach((v) => { v.hidden = v !== sec; });
  const tab = tabOf(view);
  $$('.tabbar button').forEach((b) => {
    const on = b.dataset.tab === tab;
    b.classList.toggle('active', on);
    if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  const sb = $('#settingsBtn');
  if (sb) { if (tab === null && view !== 'login') sb.setAttribute('aria-current', 'page'); else sb.removeAttribute('aria-current'); }
  $('#app').classList.toggle('no-tabs', !!screens[view].fullscreen);
  document.dispatchEvent(new CustomEvent('kj:screen', { detail: view }));
  if (prev !== view) scrollTo({ top: 0 });
  try {
    screens[view].render(sec, params);
  } catch (e) {
    console.error(`Screen "${view}" failed`, e);
    sec.innerHTML = `${subHeader(L('Something went wrong', 'ஏதோ தவறு நடந்தது'))}<div class="card glass"><p>${L('This section could not be shown for this profile. Please check the birth details, or try again.', 'இந்த விவரத்திற்கு இப்பகுதியைக் காட்ட முடியவில்லை. பிறப்பு விவரங்களைச் சரிபார்க்கவும் அல்லது மீண்டும் முயற்சிக்கவும்.')}</p></div>`;
  }
}

/** Standard header for sub-screens with a back button (back defaults to the screen's parent). */
export function subHeader(title, sub = '', back) {
  const to = back || screens[state.view]?.parent || 'home';
  return `<div class="sub-head"><button class="back-btn" data-back="${to}" aria-label="${L('Back', 'பின்செல்')}">‹</button>
    <div><h2>${title}</h2>${sub ? `<p class="muted small">${sub}</p>` : ''}</div></div>`;
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-back]');
  if (b) go(b.dataset.back);
  if (e.target.closest('[data-print]')) { document.querySelectorAll('.view:not([hidden]) details').forEach((d) => { d.open = true; }); window.print(); }
  const g = e.target.closest('[data-go]');
  if (g) go(g.dataset.go, g.dataset.param ? JSON.parse(g.dataset.param) : {});
});

/** Put policyExtrasHtml(meta) right after an answer element (replacing an earlier one). */
export function showExtras(el, meta) {
  if (!el) return;
  let box = el.nextElementSibling;
  if (!box || !box.classList.contains('ai-extras')) { box = document.createElement('div'); box.className = 'ai-extras'; el.after(box); }
  box.innerHTML = policyExtrasHtml(meta);
}
