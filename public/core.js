// Shared UI core: state, language, formatting, API/AI plumbing, family profiles and navigation.
import { birthChart, RASIS, NAKSHATRAS, PLANETS } from './shared/astro.js';
import { buildTaskPrompt } from './shared/narrator.js';
import { placeTa } from './shared/places.js';

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
export const COLOR = { Sun: '#ffb347', Moon: '#e6e9ff', Mars: '#ff7b5c', Mercury: '#7ee2a8', Jupiter: '#ffe066', Venus: '#ff9ed8', Saturn: '#8fb3ff', Rahu: '#c29bff', Ketu: '#d7a57a', Lagna: '#f5c26b' };
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
  const key = `${m.id}|${m.date}|${m.time}|${m.lat}|${m.lon}|${m.tz}`;
  if (!chartCache.has(key)) chartCache.set(key, birthChart(m));
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
export function saveSettings() { store.set('kj_settings', state.settings); document.body.classList.toggle('large', !!state.settings.large); }
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
export const copyright = () => `<footer class="copy">© 2026 ${L('Kaippesi Jothidar. All rights reserved.', 'கைப்பேசி ஜோதிடர். அனைத்து உரிமைகளும் பாதுகாக்கப்பட்டவை.')}</footer>`;

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
const TAB_OF = { home: 'home', chart: 'chart', ask: 'ask', chat: 'chat', more: 'more' };

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
  const tab = screens[view].tab || TAB_OF[view] || (screens[view].parent ? TAB_OF[screens[view].parent] : null);
  $$('.tabbar button').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  $('#app').classList.toggle('no-tabs', !!screens[view].fullscreen);
  document.dispatchEvent(new CustomEvent('kj:screen', { detail: view }));
  if (prev !== view) scrollTo({ top: 0 });
  screens[view].render(sec, params);
}

/** Standard header for sub-screens with a back button. */
export function subHeader(title, sub = '', back = 'home') {
  return `<div class="sub-head"><button class="back-btn" data-back="${back}" aria-label="${L('Back', 'பின்செல்')}">‹</button>
    <div><h2>${title}</h2>${sub ? `<p class="muted small">${sub}</p>` : ''}</div></div>`;
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-back]');
  if (b) go(b.dataset.back);
  const g = e.target.closest('[data-go]');
  if (g) go(g.dataset.go, g.dataset.param ? JSON.parse(g.dataset.param) : {});
});
