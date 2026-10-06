// Shared UI core: state, language, formatting, API/AI plumbing, family profiles and navigation.
import { chartFromKattam } from './shared/kattam.js';
import { birthChart, RASIS, NAKSHATRAS, PLANETS } from './shared/astro.js';
import { buildTaskPrompt } from './shared/narrator.js';
import { placeTa, attachZone, zoneOffsetHours } from './shared/places.js';
import { BRAND } from './shared/brand.js';

export { BRAND };
/** Brand name in the current language. */
export const brand = () => (state.lang === 'ta' ? BRAND.nameTa : BRAND.name);
export const assistantName = () => (state.lang === 'ta' ? BRAND.assistantTa : BRAND.assistantEn);

// Hosted test build (no backend): everything is computed on the device and the
// AI Jothidar answers through the viewer's own Claude account when available.
export const STATIC = Boolean(window.KJ_STATIC);

export const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};

// Migrate the single profile of earlier versions into the family list.
const legacy = store.get('kj_profile', null);
// Old profiles saved only a UTC offset: attach the IANA zone when the place is in the built-in list (historical offsets).
const initialFamily = store.get('kj_family', legacy ? [{ id: 'me', relation: 'self', ...legacy }] : []).map((m) => attachZone(m));
// A saved location with an IANA zone gets today's offset (daylight saving changes since it was saved).
const savedLoc = store.get('kj_loc', null);
if (savedLoc?.zone && zoneOffsetHours(savedLoc.zone) != null) savedLoc.tz = zoneOffsetHours(savedLoc.zone);

export const state = {
  lang: store.get('kj_lang', 'ta'),
  family: initialFamily,
  activeId: store.get('kj_active', initialFamily[0]?.id || null),
  ancestors: store.get('kj_ancestors', []),
  loc: savedLoc,
  settings: { large: false, voice: true, view: 'simple', rate: 0.92, hc: true, theme: 'dark', ...store.get('kj_settings', {}) },
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
export function chartOf(m) {
  if (!m) return null;
  if (!m.zone && !m.kattam) m = attachZone({ ...m });
  const key = `${m.id}|${m.date}|${m.time}|${m.lat}|${m.lon}|${m.tz}|${m.zone || ''}|${m.kattam ? JSON.stringify(m.kattam) : ''}`;
  if (!chartCache.has(key)) chartCache.set(key, m.kattam ? chartFromKattam(m) : birthChart(m));
  return chartCache.get(key);
}
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
export function saveSettings() {
  store.set('kj_settings', state.settings);
  document.body.classList.toggle('large', !!state.settings.large);
  document.body.classList.toggle('hc', !!state.settings.hc);
  document.body.classList.toggle('detailed', state.settings.view === 'detailed');
  applyTheme();
}
/** Simple view (default) hides specialist tools; Detailed shows everything. */
export const detailed = () => state.settings.view === 'detailed';
/** Theme: 'dark' (default on a new install), 'light' or 'auto' (follow the phone). */
export function applyTheme() {
  const pref = state.settings.theme || 'dark';
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

let samplePromise;
const getSample = () => (samplePromise ||= (window.claude?.use ? window.claude.use('sample').catch(() => null) : Promise.resolve(null)));

/**
 * Ask the AI Jothidar for a task ('chat' | 'porutham' | 'names').
 * onText receives the WHOLE text so far. Resolves { text, source: 'ai' | 'rules' }.
 */
export async function aiTask({ task, context, messages = [], fallbackText, onText }) {
  // The person can switch AI off (Privacy & data); then only built-in rules answer and nothing is sent.
  if (store.get('kj_consent', {}).aiChat === false) { onText?.(fallbackText); return { text: fallbackText, source: 'rules' }; }
  if (STATIC) {
    const sample = await getSample();
    if (sample) {
      try {
        const { text } = await sample(buildTaskPrompt(task, context, messages, state.lang), { cache: false, onText: ({ text: tx }) => onText?.(tx) });
        return { text, source: 'ai' };
      } catch { /* declined or unavailable */ }
    }
    onText?.(fallbackText);
    return { text: fallbackText, source: 'rules' };
  }
  let text = '';
  let source = 'rules';
  try {
    await sse(`/api/ai/${task}`, { context, messages, lang: state.lang, fallbackText }, {
      delta: (d) => { text += d.text; onText?.(text); },
      reset: () => { text = ''; onText?.(''); },
      done: (d) => { source = d.source; },
    });
  } catch (e) {
    text = [401, 402, 429].includes(e.status) ? `${e.message}\n\n${fallbackText}` : fallbackText;
    onText?.(text);
  }
  return { text, source };
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
export async function speak(text, { rate = state.settings.rate || 0.92, onEnd } = {}) {
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

/** "Need someone to talk to?" — free, confidential helplines (India), shown on Ask and in Settings. */
export const supportCard = () => `<div class="card glass support-card" role="note">
  <div class="card-title"><span>🤝 ${L('Need someone to talk to?', 'யாரிடமாவது பேச வேண்டுமா?')}</span></div>
  <p class="small">${L('If you feel low, anxious or unsafe, please talk to a person now. A horoscope never decides your life.', 'மனச்சோர்வு, பதற்றம், பாதுகாப்பின்மை உணர்ந்தால் இப்போதே ஒருவரிடம் பேசுங்கள். ஜாதகம் உங்கள் வாழ்க்கையைத் தீர்மானிக்காது.')}</p>
  <div class="support-lines">
    <a class="chip-btn" href="tel:14416">📞 Tele-MANAS 14416 <span class="small">${L('free · 24×7 · Tamil', 'இலவசம் · 24×7 · தமிழ்')}</span></a>
    <a class="chip-btn" href="tel:112">🚨 ${L('Emergency', 'அவசரம்')} 112</a>
  </div></div>`;

/** Copyright footer shown on the main pages. */
/** Copyright footer shown on every main page (Indian practice: rights line, developer credit, Privacy / Terms / Grievance). */
export const DEV_CREDIT = 'AG TECHNOLOGY SOLUTIONS';
export const copyright = () => `<footer class="copy">
  <span class="ft-line">© ${BRAND.year} Thunai (${BRAND.nameTa}). ${L('All rights reserved.', 'அனைத்து உரிமைகளும் பாதுகாக்கப்பட்டவை.')}</span>
  <span class="ft-line ft-dev">${L(`Concept & Developed by ${DEV_CREDIT}`, `கருத்தாக்கம் & உருவாக்கம்: ${DEV_CREDIT}`)}</span>
  <span class="ft-links"><button type="button" data-go="legal" data-param='{"open":"privacy"}'>${L('Privacy Policy', 'தனியுரிமைக் கொள்கை')}</button>·<button type="button" data-go="legal" data-param='{"open":"terms"}'>${L('Terms of Use', 'பயன்பாட்டு விதிமுறைகள்')}</button>·<button type="button" data-go="legal" data-param='{"open":"grievance"}'>${L('Grievance Officer', 'குறைதீர் அலுவலர்')}</button></span>
  <span class="ft-note">${L('Traditional astrology is guidance for your life’s journey; for medical, legal or financial matters, also take qualified advice.', 'பாரம்பரிய ஜோதிடம் உங்கள் வாழ்க்கைப் பயணத்திற்கான வழிகாட்டல்; மருத்துவ, சட்ட, நிதி விஷயங்களில் தகுதியான ஆலோசனையும் பெறுங்கள்.')}</span>
</footer>`;

/** Name to show for a family member: their Tamil name in Tamil mode when given. */
export const displayName = (m) => (m ? (ta() && m.nameTa ? m.nameTa : m.name) : '');

/** Small card shown where a feature needs the installed app (server), e.g. on the hosted test page. */
export const needsServerCard = (what) => `<div class="card glass coming" role="status"><b>⏸️ ${L('Not available yet', 'இப்போது கிடைக்கவில்லை')}</b><p class="small">${what}</p><p class="small muted">${L('This service opens soon in the app. Nothing will be charged.', 'இந்தச் சேவை விரைவில் செயலியில் தொடங்கும். எந்தக் கட்டணமும் வசூலிக்கப்படாது.')}</p></div>`;

/** Star/pada <select> options (pada gives the rasi). */
export function starOptions(selected) {
  return NAKSHATRAS.map((n, i) => `<option value="${i}"${i === selected ? ' selected' : ''}>${esc(ta() ? n.ta : n.en)}</option>`).join('');
}
export const rasiOfStarPada = (star, pada) => Math.floor((star * 4 + (pada - 1)) / 9);

// ---------------------------------------------------------------- navigation
const screens = {};
export const registerScreen = (name, def) => { screens[name] = def; };
export const currentScreen = () => screens[state.view];
// Five destinations: Today · My Chart · Family · Ask · Services. Every other screen belongs to one hub,
// which decides the highlighted tab and where the back button returns.
const TAB_OF = { home: 'home', chart: 'chart', familyhub: 'familyhub', chat: 'chat', services: 'services' };
export const HUB_OF = {
  // Today
  panchangam: 'home', calendar: 'home', live: 'home', vratham: 'home', weather: 'home', reminders: 'home', tools: 'home', plans: 'home',
  // My Chart (and Advanced)
  analysis: 'chart', vargas: 'chart', roadmap: 'chart', life: 'chart', health: 'chart', guide: 'chart', peyarchi: 'chart', numerology: 'chart', parigaram: 'chart', mantras: 'chart', birthtime: 'chart', why: 'chart',
  // Family
  family: 'familyhub', kattam: 'familyhub', relations: 'familyhub', porutham: 'familyhub', couple: 'familyhub', lovematch: 'familyhub', gunamilan: 'familyhub', partners: 'familyhub',
  muhurtham: 'familyhub', thivasam: 'familyhub', starbday: 'familyhub', names: 'familyhub', ruthu: 'familyhub', familyplan: 'familyhub', share: 'familyhub',
  // Ask
  ask: 'chat',
  // Services
  journey: 'services', bookings: 'services', temples: 'services', packages: 'services', seva: 'services', priests: 'services', store: 'services', consult: 'services',
  // Settings (header gear) — no tab highlighted
  more: null, about: 'more', legal: 'more', feedback: 'more', invite: 'more', admin: 'more', privacy: 'more', calc: 'more',
};

// Navigation history: Back (the ‹ button and the phone's back key) returns to the page you came from,
// at the same scroll position, instead of jumping to the home page.
const navStack = [];
export function goBack(fallback = 'home') {
  const last = navStack.pop();
  if (last && screens[last.view]) {
    go(last.view, last.params, { back: true });
    requestAnimationFrame(() => scrollTo({ top: last.y || 0 }));
    return true;
  }
  if (state.view !== fallback) { go(fallback, {}, { back: true }); return true; }
  return false;
}
export function go(view, params = {}, opts = {}) {
  if (!screens[view]) return;
  document.body.classList.remove('hdr-hide');
  if (screens[view].needsMember && !activeMember()) { view = 'family'; params = { add: true, first: true }; }
  const prev = state.view;
  if (!opts.back && prev && prev !== view && screens[prev]) {
    navStack.push({ view: prev, params: state.params || {}, y: window.scrollY });
    if (navStack.length > 40) navStack.shift();
  }
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
  const hub = view in HUB_OF ? HUB_OF[view] : screens[view].parent;
  const tab = screens[view].tab || TAB_OF[view] || (hub ? TAB_OF[hub] : null);
  $$('.tabbar button').forEach((b) => { const on = b.dataset.tab === tab; b.classList.toggle('active', on); if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  $('#app').classList.toggle('no-tabs', !!screens[view].fullscreen);
  document.dispatchEvent(new CustomEvent('kj:screen', { detail: view }));
  if (prev !== view && !opts.back) scrollTo({ top: 0 });
  screens[view].render(sec, params);
  // Screen readers / keyboard: move focus to the new screen's heading when the person navigates.
  if (prev !== view && document.activeElement && document.activeElement !== document.body) {
    const h = sec.querySelector('h1, h2');
    if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  }
}

/** Standard header for sub-screens with a back button. */
// Keep --top-h equal to the real header height so pinned screen titles sit exactly below it.
if (typeof document !== 'undefined' && typeof ResizeObserver !== 'undefined') {
  const fitTop = () => { const t = document.querySelector('.topbar'); if (t) document.documentElement.style.setProperty('--top-h', `${Math.round(t.getBoundingClientRect().height)}px`); };
  const ro = new ResizeObserver(fitTop);
  const hook = () => { const t = document.querySelector('.topbar'); if (t) { ro.observe(t); fitTop(); } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hook); else hook();
}

// Question boxes are textareas so the full hint is always readable; they grow with the text,
// and Enter sends (Shift+Enter adds a new line).
if (typeof document !== 'undefined') {
  // An empty box is sized to its hint text, so the hint is never cut off on narrow phones.
  const grow = (t) => {
    const empty = !t.value; if (empty) t.value = t.placeholder || '';
    t.style.height = 'auto'; t.style.height = `${Math.min(t.scrollHeight + 2, 160)}px`;
    if (empty) t.value = '';
  };
  const growAll = () => document.querySelectorAll('textarea.grow-in').forEach((t) => { if (!t.dataset.grown) { t.dataset.grown = '1'; grow(t); } });
  new MutationObserver(() => requestAnimationFrame(growAll)).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('resize', () => document.querySelectorAll('textarea.grow-in').forEach(grow));
  document.addEventListener('input', (e) => { if (e.target.matches?.('textarea.grow-in')) grow(e.target); });
  document.addEventListener('keydown', (e) => {
    const t = e.target;
    if (!t.matches?.('textarea.grow-in') || e.key !== 'Enter' || e.shiftKey || e.isComposing) return;
    e.preventDefault();
    if (t.dataset.enter) document.getElementById(t.dataset.enter)?.click(); else t.form?.requestSubmit();
  });
}

// Header hides while scrolling down (content is never covered) and returns on scroll up or near the top.
if (typeof window !== 'undefined') {
  let lastY = 0;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (y < 60) document.body.classList.remove('hdr-hide');
    else if (y > lastY + 6) document.body.classList.add('hdr-hide');
    else if (y < lastY - 6) document.body.classList.remove('hdr-hide');
    lastY = y;
  }, { passive: true });
}

/** Print / Save as PDF: the phone app uses Android's Print service (window.print is ignored in WebViews). */
export function printPage(title = document.querySelector('.view:not([hidden]) h2')?.textContent || 'Thunai') {
  // Every printed / PDF report carries the same footer as the app pages.
  const view = document.querySelector('.view:not([hidden])');
  if (view && !view.querySelector('footer.copy')) view.insertAdjacentHTML('beforeend', `<div class="print-foot">${copyright()}</div>`);
  if (window.ThunaiNative?.print) { setTimeout(() => window.ThunaiNative.print(`Thunai - ${title}`.slice(0, 80)), 150); return; }
  window.print();
}

// Phone keyboard: while typing, hide the bottom tab bar (it would sit on top of the text box) and keep the
// focused field in view.
if (typeof document !== 'undefined') {
  const typing = (el) => el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && !['checkbox', 'radio', 'button', 'submit', 'range'].includes(el.type)));
  document.addEventListener('focusin', (e) => {
    if (!typing(e.target)) return;
    document.body.classList.add('kb-open');
    setTimeout(() => e.target.scrollIntoView?.({ block: 'center', behavior: 'smooth' }), 350);
  });
  document.addEventListener('focusout', () => setTimeout(() => { if (!typing(document.activeElement)) document.body.classList.remove('kb-open'); }, 120));
}

export function subHeader(title, sub = '', back = HUB_OF[state.view] || screens[state.view]?.parent || 'home') {
  return `<div class="sub-head"><button class="back-btn" data-back="${back}" aria-label="${L('Back', 'பின்செல்')}">‹</button>
    <div><h2>${title}</h2></div></div>${sub ? `<p class="muted small sub-desc">${sub}</p>` : ''}`;
}
// Phone back key (Capacitor): close an open dialog first, then go to the previous page; exit only from Today.
if (typeof window !== 'undefined') {
  const hookBack = () => {
    const App = window.Capacitor?.Plugins?.App;
    if (!App?.addListener) return;
    App.addListener('backButton', () => {
      const modal = document.querySelector('.modal');
      if (modal) { modal.remove(); return; }
      if (!goBack('home')) App.minimizeApp?.() ?? App.exitApp?.();
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hookBack); else hookBack();
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-back]');
  if (b) goBack(b.dataset.back);
  if (e.target.closest('[data-print]')) { document.querySelectorAll('.view:not([hidden]) details').forEach((d) => { d.open = true; }); printPage(); }
  const g = e.target.closest('[data-go]');
  if (g) go(g.dataset.go, g.dataset.param ? JSON.parse(g.dataset.param) : {});
});
