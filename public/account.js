// Account: login (mobile OTP, email OTP, Facebook), family profiles and settings.
import { FAITHS } from './shared/faith.js';
import { searchLocalPlaces, placeLabel, placeText, offsetLabel, fromNominatim, nominatimUrl, zoneOffsetHours, nearestPlace, resolveTypedPlace } from './shared/places.js';
import { initialOf } from './shared/relations.js';
import { fmtBirth, fmtDay } from './shared/fmt.js';
import { zonedToUtc, isValidZone } from './shared/datetime.js';
import { guessCountry, formatPhone } from './shared/countries.js';
import { enhancePhone, phoneError, startPhoneInputs } from './phone-input.js';
import { UNKNOWN_TIME_PLACEHOLDER, certaintyOf } from './shared/birthtime.js';
import { icon, iconChip } from './icons.js';
import { locationSettingsHtml, bindLocationSettings } from './residence-ui.js';
import {
  state, $, $$, L, ta, esc, bi, api, STATIC, store, go, registerScreen, subHeader, saveFamily, saveSettings, setLoc,
  toast, RELATIONS, chartOf, nakName, rasiName, displayName, copyright, BRAND, supportCard,
  placeName, mergeAccountFamily, backupConsent, nameInLang,
} from './core.js';
import { toTamil, toLatin, detectScript, nameInScript } from './shared/name-translit.js';
import { track } from './growth.js';
import { syncShares, pendingJoinCode, mountSharedFamily, pushSharedEdit } from './family-share.js';
import { mergeGoals } from './shared/goals.js';
import { isPrivateProfile } from './shared/sync-policy.js';
import { canDeleteMember, deleteMember, undoDelete } from './shared/family-delete.js';

const lg = () => (ta() ? 'ta' : 'en');

startPhoneInputs(); // every mobile-number field in the app gets the country-code picker

// ================================================================ SESSION
export async function loadSession() {
  if (STATIC) {
    state.user = store.get('kj_demo_user', null);
    state.providers = { sms: 'dev', email: 'dev', facebook: false, devMode: true, demo: true };
    return;
  }
  try { state.providers = await api('/api/auth/providers'); } catch { state.providers = null; }
  try {
    const { user } = await api('/api/auth/me');
    state.user = user;
    await pullAccountData();
    await syncShares(); // profiles family members shared with me; revoked ones leave this phone
    if (pendingJoinCode()) go('family'); // opened from an invite link
  } catch { state.user = null; }
}

/** Merge the account's saved family with this device's (account data wins; local-only people are uploaded). */
async function pullAccountData() {
  try {
    const { data } = await api('/api/me/data');
    // Private profiles live only on this phone and win over any older server copy (core.js mergeAccountFamily).
    state.family = mergeAccountFamily(Array.isArray(data?.family) ? data.family : [], state.family);
    if (Array.isArray(data?.ancestors)) state.ancestors = data.ancestors;
    state.activeId = data?.activeId && state.family.some((m) => m.id === data.activeId) ? data.activeId : state.family[0]?.id || null;
    // Backed-up goals come back right after sign-in, so Today's goal card shows them (goals.js mergeGoals rules).
    if (data?.goals) {
      const privateIds = new Set(state.family.filter(isPrivateProfile).map((m) => m.id));
      store.set('kj_goals', mergeGoals(data.goals, store.get('kj_goals', null), { privateIds }));
    }
    saveFamily();
  } catch { /* offline: keep local */ }
}

export async function signOut() {
  if (STATIC) store.del('kj_demo_user'); else await api('/api/auth/logout', { method: 'POST' }).catch(() => {});
  state.user = null;
  syncShares(); // signed out: profiles other accounts shared with me leave this phone
  toast(L('Signed out', 'வெளியேறினீர்கள்'));
  go('login');
}

// ================================================================ LOGIN
const login = { step: 'choose', channel: 'sms', to: '', devCode: null, resendAt: 0 };

function renderLogin(sec) {
  const p = state.providers;
  const fbOk = p?.facebook;
  let body = '';
  if (login.step === 'choose') {
    body = `<button class="login-btn phone" data-ch="sms">📱 ${L('Continue with mobile number', 'மொபைல் எண் மூலம் தொடரவும்')}</button>
      <button class="login-btn email" data-ch="email">✉️ ${L('Continue with email', 'மின்னஞ்சல் மூலம் தொடரவும்')}</button>
      ${fbOk ? `<button class="login-btn fb" id="fbBtn"><span class="fb-f">f</span> ${L('Continue with Facebook', 'Facebook மூலம் தொடரவும்')}</button>` : ''}`;
  } else if (login.step === 'enter') {
    body = `<form id="toForm" novalidate><label>${login.channel === 'sms' ? L('Mobile number', 'மொபைல் எண்') : L('Email address', 'மின்னஞ்சல் முகவரி')}
        ${login.channel === 'sms' ? `<input id="loginTo" name="loginPhone" type="tel" inputmode="tel" value="${esc(login.channel === 'sms' && /^\+/.test(login.to) ? login.to : '')}" required>`
    : '<input id="loginTo" type="email" autocomplete="email" required placeholder="name@example.com">'}</label>
        <button class="btn-gold" id="sendOtp">${L('Send OTP', 'OTP அனுப்பு')}</button>
        <button type="button" class="link-btn center-block" data-step="choose">‹ ${L('Other ways to sign in', 'வேறு வழிகள்')}</button>
        <p class="err" id="loginErr"></p></form>`;
  } else if (login.step === 'otp') {
    body = `<form id="otpForm" novalidate><p class="center">${L('Enter the 6-digit code sent to', '6 இலக்க குறியீடு அனுப்பப்பட்டது')} <b>${esc(login.masked || login.to)}</b></p>
        <div class="otp-boxes">${[0, 1, 2, 3, 4, 5].map((i) => `<input class="otp" inputmode="numeric" maxlength="1" aria-label="${esc(L(`Digit ${i + 1}`, `இலக்கம் ${i + 1}`))}" data-i="${i}">`).join('')}</div>
        ${login.devCode ? `<p class="demo-note">🧪 ${STATIC ? L('Demo mode — no SMS is sent.', 'மாதிரி முறை — SMS அனுப்பப்படாது.') : L('Test mode — SMS provider not configured.', 'சோதனை முறை — SMS சேவை அமைக்கப்படவில்லை.')} ${L('Your code', 'உங்கள் குறியீடு')}: <b>${esc(login.devCode)}</b></p>` : ''}
        <label>${L('Your name (for new accounts)', 'உங்கள் பெயர் (புதிய கணக்கிற்கு)')}<input id="loginName" maxlength="60" autocomplete="name"></label>
        <button class="btn-gold" id="verifyOtp">${L('Verify & sign in', 'சரிபார்த்து உள்நுழை')}</button>
        <button type="button" class="link-btn center-block" id="resend" disabled>${L('Resend code', 'மீண்டும் அனுப்பு')}</button>
        <p class="err" id="loginErr"></p></form>`;
  }
  sec.innerHTML = `<div class="login-wrap">
      <img src="logo.svg" alt="" width="96" height="96" class="login-logo">
      <h1 class="brand-ta small">${BRAND.nameTa}</h1>
      <p class="brand-en small">${BRAND.nameUpper}</p>
      <p class="muted center">${L(BRAND.descriptorEn, BRAND.taglineTa)}</p>
      <p class="muted center">${L('Sign in to keep your family\'s charts safe and available on every phone.', 'உங்கள் குடும்ப ஜாதகங்களைப் பாதுகாப்பாக எல்லா கைப்பேசியிலும் பெற உள்நுழையவும்.')}</p>
      <div class="card glass login-card">${body}</div>
      <button class="link-btn center-block" id="skipLogin">${L('Continue without signing in', 'உள்நுழையாமல் தொடரவும்')} ›</button>
      ${copyright()}
      <p class="muted small center">${L('By continuing you agree to use astrology as guidance, not as a substitute for medical, legal or financial advice.', 'ஜோதிடம் வழிகாட்டுதல் மட்டுமே; மருத்துவ, சட்ட, நிதி ஆலோசனைக்கு மாற்றல்ல என்பதை ஏற்கிறீர்கள்.')}</p>
    </div>`;
  const phoneEl = $('input[name="loginPhone"]', sec);
  if (phoneEl) login.phone = enhancePhone(phoneEl);
  $$('[data-ch]', sec).forEach((b) => b.addEventListener('click', () => { login.channel = b.dataset.ch; login.step = 'enter'; renderLogin(sec); $('#loginTo')?.focus(); }));
  $$('[data-step]', sec).forEach((b) => b.addEventListener('click', () => { login.step = b.dataset.step; renderLogin(sec); }));
  // Facebook appears only when the server has a Facebook app configured (no button, no developer note otherwise).
  $('#fbBtn')?.addEventListener('click', () => { location.href = '/api/auth/facebook/start'; });
  $('#skipLogin').addEventListener('click', () => { store.set('kj_skip_login', true); afterLogin(); });
  $('#toForm')?.addEventListener('submit', (e) => { e.preventDefault(); requestOtp(); });
  $('#otpForm')?.addEventListener('submit', (e) => { e.preventDefault(); verifyOtp(); });
  $('#resend')?.addEventListener('click', () => requestOtp(true));
  if (login.step === 'otp') setupOtpBoxes();
}

function setupOtpBoxes() {
  const boxes = $$('.otp');
  boxes[0]?.focus();
  boxes.forEach((b, i) => {
    b.addEventListener('input', () => {
      b.value = b.value.replace(/\D/g, '').slice(-1);
      if (b.value && i < 5) boxes[i + 1].focus();
      if (boxes.every((x) => x.value)) verifyOtp();
    });
    b.addEventListener('keydown', (e) => { if (e.key === 'Backspace' && !b.value && i > 0) boxes[i - 1].focus(); });
    b.addEventListener('paste', (e) => {
      const digits = (e.clipboardData?.getData('text') || '').replace(/\D/g, '').slice(0, 6);
      if (digits.length) { e.preventDefault(); digits.split('').forEach((d, j) => { if (boxes[j]) boxes[j].value = d; }); if (digits.length === 6) verifyOtp(); }
    });
  });
  const timer = setInterval(() => {
    const btn = $('#resend');
    if (!btn) { clearInterval(timer); return; }
    const left = Math.ceil((login.resendAt - Date.now()) / 1000);
    btn.disabled = left > 0;
    btn.textContent = left > 0 ? `${L('Resend code in', 'மீண்டும் அனுப்ப')} ${left}s` : L('Resend code', 'மீண்டும் அனுப்பு');
    if (left <= 0) clearInterval(timer);
  }, 500);
}

async function requestOtp(resend = false) {
  if (!resend) {
    if (login.channel === 'sms') {
      const r = login.phone.get();
      if (!r.ok) { const e = $('#loginErr'); if (e) e.textContent = phoneError(r.country); return; }
      login.to = r.e164; // E.164, e.g. +94771234567
    } else {
      login.to = $('#loginTo').value.trim().replace(/\s/g, '');
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(login.to)) { const e = $('#loginErr'); if (e) e.textContent = L('Please enter a valid email address', 'சரியான மின்னஞ்சல் முகவரியை உள்ளிடுங்கள்'); $('#loginTo')?.focus(); return; }
    }
  }
  const err = $('#loginErr');
  try {
    if (STATIC) {
      if (login.channel === 'sms' && !/^\+[1-9]\d{7,14}$/.test(login.to)) throw new Error(L('Please enter a valid mobile number', 'சரியான மொபைல் எண்ணை உள்ளிடவும்'));
      if (login.channel === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(login.to)) throw new Error(L('Please enter a valid email address', 'சரியான மின்னஞ்சலை உள்ளிடவும்'));
      login.devCode = String(Math.floor(100000 + Math.random() * 900000));
      login.masked = login.to;
    } else {
      const r = await api('/api/auth/otp/request', { method: 'POST', body: { channel: login.channel, to: login.to } });
      login.devCode = r.devCode || null;
      login.masked = r.to;
    }
    login.resendAt = Date.now() + 30000;
    login.step = 'otp';
    renderLogin($('#view-login'));
  } catch (e) {
    if (err) err.textContent = e.message; else toast(e.message);
  }
}

async function verifyOtp() {
  const code = $$('.otp').map((b) => b.value).join('');
  const err = $('#loginErr');
  if (code.length !== 6) { err.textContent = L('Enter all 6 digits', '6 இலக்கங்களையும் உள்ளிடவும்'); return; }
  const name = $('#loginName')?.value.trim();
  try {
    if (STATIC) {
      if (code !== login.devCode) throw new Error(L('That code is not correct', 'குறியீடு தவறு'));
      state.user = { id: 'demo', name: name || '', [login.channel === 'sms' ? 'phone' : 'email']: login.to, demo: true };
      store.set('kj_demo_user', state.user);
    } else {
      const r = await api('/api/auth/otp/verify', { method: 'POST', body: { channel: login.channel, to: login.to, code, name: name || undefined } });
      state.user = r.user;
      track(r.isNew ? 'signup' : 'login');
      await pullAccountData();
      saveFamily(); // upload anything that was only on this device
    }
    login.step = 'choose';
    toast(`🙏 ${L('Welcome', 'நல்வரவு')}${state.user.name ? `, ${nameInLang(state.user.name)}` : ''}!`);
    afterLogin(name);
  } catch (e) {
    err.textContent = e.message;
    $$('.otp').forEach((b) => { b.value = ''; });
    $$('.otp')[0]?.focus();
  }
}

// The screen (and its params) the person was on when sign-in was asked for — a package request, an order, a
// seva — so that after signing in they return there instead of Today. Kept in sessionStorage too, so a Facebook
// redirect that reloads the page still knows where to return.
const LOGIN_FROM_KEY = 'kj_login_from';
let screenBeforeLogin = null;
export function rememberLoginOrigin(view, params = {}) {
  if (!view || view === 'login') return;
  screenBeforeLogin = { view, params: params || {} };
}
document.addEventListener('kj:screen', (e) => {
  if (e.detail === 'login') {
    if (screenBeforeLogin) try { sessionStorage.setItem(LOGIN_FROM_KEY, JSON.stringify(screenBeforeLogin)); } catch { /* private mode */ }
  } else rememberLoginOrigin(e.detail, state.params);
});
export function loginReturnTarget() {
  let from = screenBeforeLogin;
  if (!from) try { from = JSON.parse(sessionStorage.getItem(LOGIN_FROM_KEY) || 'null'); } catch { from = null; }
  return from && from.view && from.view !== 'login' ? from : null;
}
function afterLogin(name) {
  const from = loginReturnTarget();
  screenBeforeLogin = null;
  try { sessionStorage.removeItem(LOGIN_FROM_KEY); } catch { /* ignore */ }
  if (!state.family.length) go('family', { add: true, first: true, name });
  else if (from) go(from.view, from.params || {});
  else go('home');
}
registerScreen('login', { render: renderLogin, fullscreen: true });

// ================================================================ FAMILY
let editing = null;

// Place search: the built-in world list first (offline, instant), then — when online — OpenStreetMap
// (through our server, or straight from the phone in the offline app). Every result carries an IANA time zone.
const onlineCache = new Map();
let lastOnlineAt = 0;
async function searchOnlinePlaces(q) {
  const key = q.toLowerCase();
  if (onlineCache.has(key)) return onlineCache.get(key);
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return [];
  let out = [];
  try {
    if (!STATIC) out = (await api(`/api/places?q=${encodeURIComponent(q)}`)).filter((p) => p.online);
    else {
      // Nominatim usage policy: at most one request a second, cached, debounced (the browser sends the Referer).
      const wait = lastOnlineAt + 1100 - Date.now();
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      lastOnlineAt = Date.now();
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 5000);
      const res = await fetch(nominatimUrl(q, { limit: 6 }), { signal: ctrl.signal, headers: { Accept: 'application/json' } }).finally(() => clearTimeout(timer));
      if (res.ok) out = (await res.json()).map(fromNominatim).filter((p) => p.zone && Number.isFinite(p.lat));
    }
  } catch { out = []; }
  onlineCache.set(key, out);
  return out;
}

const userCc = () => guessCountry().cc;
/** "Asia/Colombo · UTC+5:30" for a result (offset today; birth charts use the offset on the birth date). */
const zoneText = (p) => (p.zone ? `${p.zone.replace(/_/g, ' ')} · ${offsetLabel(zoneOffsetHours(p.zone))}` : offsetLabel(p.tz));

export function placeSearch(input, list, onPick) {
  let timer, onlineTimer, seq = 0;
  const draw = (places) => {
    list.innerHTML = places.map((p, i) => `<li tabindex="0" data-i="${i}">${p.online ? '🌐 ' : ''}${esc(placeLabel(p, ta() ? 'ta' : 'en'))}<small>${esc(zoneText(p))}</small></li>`).join('');
    list.hidden = !places.length;
    $$('li', list).forEach((li) => {
      const pick = () => { const p = places[li.dataset.i]; onPick({ ...p, text: placeText(p) }); list.hidden = true; };
      li.addEventListener('click', pick);
      li.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); pick(); } });
    });
  };
  input.addEventListener('input', () => {
    clearTimeout(timer); clearTimeout(onlineTimer);
    const q = input.value.trim();
    const my = ++seq;
    if (q.length < 2) { list.hidden = true; return; }
    timer = setTimeout(() => {
      const local = searchLocalPlaces(q, 8, { preferCc: userCc() });
      draw(local);
      if (local.length >= 4 || q.length < 3) return;
      onlineTimer = setTimeout(async () => {
        const online = await searchOnlinePlaces(q);
        if (my !== seq || !online.length) return;
        const seen = new Set(local.map((p) => `${p.cc}|${p.name}`.toLowerCase()));
        draw([...local, ...online.filter((p) => !seen.has(`${p.cc}|${p.name}`.toLowerCase()))].slice(0, 10));
      }, 650);
    }, 150);
  });
}

/** UTC offset (hours) of `zone` at a local birth date/time — the historical one (DST, war time, Sri Lanka 1996…). */
function birthOffset(zone, date, time, disambiguation = 'earlier') {
  if (!isValidZone(zone)) return null;
  try { return date ? zonedToUtc(date, time || '12:00', zone, { disambiguation }).offsetMinutes / 60 : zoneOffsetHours(zone); } catch { return zoneOffsetHours(zone); }
}
/** Daylight-saving check of the entered wall time: { ambiguous, nonexistent, alternatives } or null. */
function dstCheck(zone, date, time) {
  if (!isValidZone(zone) || !date || !time) return null;
  try { const z = zonedToUtc(date, time, zone); return z.ambiguous || z.nonexistent ? z : null; } catch { return null; }
}

// ---------------------------------------------------------------- name in both scripts (shared/name-translit.js)
// One main Name box takes English or Tamil; the other script fills itself as the person types (editable). A
// corrected spelling is kept (nameTaEdited / nameEnEdited) until they tap ↻. "Show this name in" chooses the
// script used everywhere in the app (nameDisplay: 'ta' | 'en' | 'auto' = app language).
const tamilMain = (s) => { const sc = detectScript(s); return sc === 'ta' || (sc === 'mixed' && (s.match(/[\u0B80-\u0BFF]/g) || []).length > (s.match(/[A-Za-z]/g) || []).length); };
function nameFields(m) {
  const main = m.nameScript === 'ta' ? (m.nameTa || m.name || '') : (m.name || '');
  const show = ['ta', 'en', 'auto'].includes(m.nameDisplay) ? m.nameDisplay : 'auto';
  return `<div class="row2 name-row">
      <label>${L('Name (English or Tamil)', 'பெயர் (தமிழ் அல்லது English)')}<input name="name" required maxlength="60" autocomplete="off" autocapitalize="words" value="${esc(main)}"></label>
      <div class="name-alt"><label for="nameAlt" id="nameAltLab">${L('Name in Tamil', 'தமிழில் பெயர்')}</label><input id="nameAlt" name="nameAlt" maxlength="60" lang="ta" autocomplete="off">
        <div class="name-hint"><span id="nameHint" class="small"></span><button type="button" class="link-btn small" id="nameRegen" hidden>↻ ${L('re-generate', 'மீண்டும் உருவாக்கு')}</button></div></div></div>
    <fieldset class="name-show"><legend>${L('Show this name in', 'பெயரை எந்த எழுத்தில் காட்ட')}</legend>
      <div class="seg" role="radiogroup">${[['ta', 'தமிழ்', 'தமிழ்'], ['en', 'English', 'English'], ['auto', 'Follow app language', 'செயலி மொழிப்படி']].map(([id, en, tx]) => `<label class="seg-opt"><input type="radio" name="nameDisplay" value="${id}"${show === id ? ' checked' : ''}> <span lang="${id === 'ta' ? 'ta' : id === 'en' ? 'en' : ''}">${L(en, tx)}</span></label>`).join('')}</div>
      <p class="small muted" id="namePreview"></p></fieldset>`;
}

/** Live other-script name: debounced fill, manual corrections kept, ↻ to regenerate. Returns read() for saving. */
function bindNameFields(f, m) {
  const main = f.elements.name, alt = f.elements.nameAlt;
  const nm = { ta: m.nameTa || '', en: m.nameScript === 'ta' ? (m.name || '') : '', taEdited: !!m.nameTaEdited, enEdited: !!m.nameEnEdited };
  const mode = () => (tamilMain(main.value) ? 'en' : 'ta'); // the script of the second box
  const gen = (md, s) => (md === 'ta' ? toTamil(s) : toLatin(s));
  const hint = () => {
    const md = mode(), edited = md === 'ta' ? nm.taEdited : nm.enEdited;
    $('#nameAltLab', f).textContent = md === 'ta' ? L('Name in Tamil', 'தமிழில் பெயர்') : L('Name in English', 'ஆங்கிலத்தில் பெயர்');
    alt.lang = md;
    $('#nameHint', f).textContent = !main.value.trim() ? L('Fills itself as you type the name', 'பெயரை எழுதும்போது தானாக நிரம்பும்')
      : edited ? `✎ ${L('your spelling — kept', 'உங்கள் எழுத்துக்கூட்டல் — மாறாது')}` : `✓ ${L('auto — you can correct it', 'தானாக — திருத்தலாம்')}`;
    $('#nameHint', f).className = `small ${edited ? 'name-mine' : 'name-auto'}`;
    $('#nameRegen', f).hidden = !edited || !main.value.trim();
    const pick = f.elements.nameDisplay.value || 'auto';
    const r = read();
    const want = pick === 'auto' ? (ta() ? 'ta' : 'en') : pick;
    $('#namePreview', f).textContent = r.name || r.nameTa ? `${L('Shown as', 'காட்டப்படுவது')}: ${nameInScript(r, want)}` : '';
  };
  const fill = () => {
    const s = main.value.trim(), md = mode();
    if (md === 'ta' && !nm.taEdited) nm.ta = gen('ta', s);
    if (md === 'en' && !nm.enEdited) nm.en = gen('en', s);
    alt.value = md === 'ta' ? nm.ta : nm.en;
    hint();
  };
  let timer;
  main.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(fill, 220); });
  alt.addEventListener('input', () => {
    const md = mode(), v = alt.value.trim(), auto = gen(md, main.value.trim());
    nm[md] = alt.value;
    nm[`${md}Edited`] = Boolean(v) && v !== auto; // emptied or same as generated: back to automatic
    hint();
  });
  $('#nameRegen', f).addEventListener('click', () => { nm[`${mode()}Edited`] = false; fill(); alt.focus(); });
  $$('input[name="nameDisplay"]', f).forEach((r) => r.addEventListener('change', hint));
  function read() {
    const s = main.value.trim();
    if (tamilMain(s)) {
      const en = (nm.enEdited && nm.en.trim()) || toLatin(s) || s;
      return { name: en, nameTa: s, nameScript: 'ta', nameEnEdited: nm.enEdited && Boolean(nm.en.trim()), nameTaEdited: false, nameAutoFrom: s };
    }
    const tamil = (nm.taEdited && nm.ta.trim()) || toTamil(s);
    return { name: s, nameTa: tamil || undefined, nameScript: 'en', nameTaEdited: nm.taEdited && Boolean(nm.ta.trim()), nameEnEdited: false, nameAutoFrom: s };
  }
  fill();
  return { read: () => { clearTimeout(timer); fill(); return { ...read(), nameDisplay: f.elements.nameDisplay.value || 'auto' }; } };
}

function memberForm(m, first) {
  return `<form id="memberForm" autocomplete="off" novalidate>
    ${nameFields(m)}
    <p class="muted small">${L('For a company or team, choose "Company / Team" and enter its founding (incorporation) date, time and place.', 'நிறுவனம் / குழுவிற்கு "நிறுவனம் / குழு" தேர்வு செய்து, தொடங்கிய தேதி, நேரம், இடம் உள்ளிடவும்.')}</p>
    <div class="row2">
      <label>${L('Relation', 'உறவு')}<select name="relation">${RELATIONS.map((r) => `<option value="${r.id}"${(m.relation || (first ? 'self' : 'other')) === r.id ? ' selected' : ''}>${esc(bi(r))}</option>`).join('')}</select></label>
      <label>${L('Gender', 'பாலினம்')}<select name="gender">${[['male', 'Male', 'ஆண்'], ['female', 'Female', 'பெண்']].map(([id, en, tx]) => `<option value="${id}"${m.gender === id ? ' selected' : ''}>${L(en, tx)}</option>`).join('')}</select></label>
    </div>
    <div class="row2">
      <label>${L('Date of birth', 'பிறந்த தேதி')}<input name="date" type="date" required value="${esc(m.date || '')}"></label>
      <label>${L('Time of birth', 'பிறந்த நேரம்')}<input name="time" type="time" step="1"${(m.timeCertainty || 'exact') === 'unknown' ? ' disabled' : ' required'} value="${(m.timeCertainty || 'exact') === 'unknown' ? '' : esc(m.time || '')}"></label>
    </div>
    <fieldset class="certainty"><legend>${L('How sure are you of the birth time?', 'பிறந்த நேரம் எவ்வளவு உறுதி?')}</legend>
      <div class="seg" role="radiogroup">${[['exact', 'Exact', 'துல்லியம்'], ['approx', 'Approximate', 'தோராயம்'], ['unknown', 'Unknown', 'தெரியாது']].map(([id, en, tx]) => `<label class="seg-opt"><input type="radio" name="timeCertainty" value="${id}"${(m.timeCertainty || 'exact') === id ? ' checked' : ''}> ${L(en, tx)}</label>`).join('')}</div>
      <label class="tw"${(m.timeCertainty || 'exact') === 'approx' ? '' : ' hidden'}>${L('Unsure by about', 'சுமார் எவ்வளவு மாறலாம்')}<select name="timeWindowMin">${[[15, '± 15 min', '± 15 நிமி'], [30, '± 30 min', '± 30 நிமி'], [60, '± 1 hour', '± 1 மணி'], [120, '± 2 hours', '± 2 மணி'], [240, '± 4 hours', '± 4 மணி']].map(([v, en, tx]) => `<option value="${v}"${Number(m.timeWindowMin || 60) === v ? ' selected' : ''}>${L(en, tx)}</option>`).join('')}</select></label>
      <p class="small muted">${L('If you are not sure, say so — we will not guess a time. Calendar, temple and family tools work without it; time-sensitive results are limited or clearly marked.', 'உறுதியில்லையெனில் அப்படியே குறிப்பிடுங்கள் — நேரத்தை நாங்கள் ஊகிக்க மாட்டோம். நாட்காட்டி, கோவில், குடும்பக் கருவிகள் நேரமின்றி இயங்கும்; நேரம் சார்ந்த பலன்கள் வரம்புடன் / குறிப்புடன் காட்டப்படும்.')} <button type="button" class="link-btn" data-go="birthtime">${L('What depends on it?', 'எது இதைச் சார்ந்தது?')}</button></p>
    </fieldset>
    <label>${L('Faith (optional — only changes greetings and prayer wording)', 'நம்பிக்கை (விருப்பம் — வாழ்த்து, பிரார்த்தனை சொற்கள் மட்டும் மாறும்)')}<select name="faith">${FAITHS.map(([v, en, tx]) => `<option value="${v}"${(m.faith || 'auto') === v ? ' selected' : ''}>${L(en, tx)}</option>`).join('')}</select></label>
    <details class="life-details"${m.maritalStatus || m.children ? ' open' : ''}><summary>${L('Life details (optional — makes marriage and children answers accurate)', 'வாழ்க்கை விவரம் (விருப்பம் — திருமணம், குழந்தை பதில்களைத் துல்லியமாக்கும்)')}</summary>
      <div class="row2">
        <label>${L('Marital status', 'திருமண நிலை')}<select name="maritalStatus">${[['', '—', '—'], ['single', 'Not married', 'திருமணமாகவில்லை'], ['married', 'Married', 'திருமணமானவர்'], ['other', 'Separated / widowed', 'பிரிந்தவர் / துணையை இழந்தவர்']].map(([v, en, tx]) => `<option value="${v}"${(m.maritalStatus || '') === v ? ' selected' : ''}>${L(en, tx)}</option>`).join('')}</select></label>
        <label>${L('Year of marriage', 'திருமண ஆண்டு')}<input name="marriedYear" inputmode="numeric" maxlength="4" placeholder="2012" value="${esc(m.marriedYear || '')}"></label>
      </div>
      <div class="row2">
        <label>${L('Number of children', 'குழந்தைகள் எண்ணிக்கை')}<input name="children" inputmode="numeric" maxlength="2" placeholder="0" value="${esc(m.children ?? '')}"></label>
        <label>${L('First child born in (year)', 'முதல் குழந்தை பிறந்த ஆண்டு')}<input name="firstChildYear" inputmode="numeric" maxlength="4" placeholder="2015" value="${esc(m.firstChildYear || '')}"></label>
      </div>
      <p class="small muted">${L('Used only on this phone, to check your chart against what has already happened instead of predicting it again.', 'இந்தக் கைப்பேசியில் மட்டும் பயன்படும்; நடந்ததை மீண்டும் கணிக்காமல், அதனுடன் ஜாதகத்தைச் சரிபார்க்க.')}</p>
    </details>
    <label class="set-row"><span>🔒 ${L('Keep this profile private (its chats and concerns are never shared)', 'இந்தச் சுயவிவரம் தனிப்பட்டது (உரையாடல், கவலைகள் பகிரப்படாது)')}</span><input type="checkbox" name="private"${m.private ? ' checked' : ''}></label>
    <label class="place-wrap">${L('Place of birth (any town in the world)', 'பிறந்த இடம் (உலகின் எந்த ஊரும்)')}<input name="place" required placeholder="${esc(L('Chennai, Jaffna, Toronto…', 'சென்னை, யாழ்ப்பாணம், டொரன்டோ…'))}" value="${esc(m.place || '')}"><ul id="placeList" class="suggest" hidden></ul></label>
    <input type="hidden" name="zone" value="${esc(m.zone || '')}">
    <div class="row3">
      <label>${L('Latitude', 'அட்சரேகை')}<input name="lat" type="number" step="0.0001" value="${m.lat ?? ''}"></label>
      <label>${L('Longitude', 'தீர்க்கரேகை')}<input name="lon" type="number" step="0.0001" value="${m.lon ?? ''}"></label>
      <label>${L('UTC offset', 'நேர மண்டலம்')}<input name="tz" type="number" step="0.25" value="${m.tz ?? 5.5}"></label>
    </div>
    <p class="small muted zone-note" id="zoneNote"></p>
    <div class="note-box dst-box" id="dstBox" role="note" hidden></div>
    <button class="btn-gold" type="submit">✨ ${first ? L('Create my Jathagam', 'என் ஜாதகம் உருவாக்கு') : L('Save', 'சேமி')}</button>
    ${m.id && !m.shared ? `<button type="button" class="link-btn danger center-block" id="delMember">${L('Delete this person', 'இவரை நீக்கு')}</button>` : ''}
    <p class="err" id="formErr"></p></form>`;
}

function renderFamily(sec, params = {}) {
  if (params.add) editing = { name: params.name || state.user?.name || '' };
  else if (params.edit) editing = { ...state.family.find((m) => m.id === params.edit) };
  if (editing?.shared && editing.shared.permission !== 'edit') editing = null; // shared with me view-only: no editing
  const first = params.first || !state.family.length;
  if (editing) {
    // No one saved yet (first run, or a personal screen opened before anyone was added): a titled "add a person
    // first" page with a way back, never a bare form.
    sec.innerHTML = `${first ? subHeader(L('Add a Person First', 'முதலில் ஒருவரைச் சேருங்கள்'), L('Charts and personal guidance need one person’s birth details. The calendar works without them.', 'ஜாதகமும் தனிப்பட்ட வழிகாட்டலும் ஒருவரின் பிறப்பு விவரங்களுடன் இயங்கும். நாட்காட்டி அவை இல்லாமலும் இயங்கும்.'), 'home') : subHeader(editing.id ? L('Edit Details', 'விவரங்களைத் திருத்துங்கள்') : L('Add a Family Member', 'குடும்ப உறுப்பினரைச் சேருங்கள்'), '', 'family')}
      <div class="card glass hero-card">${first ? `<h2>${L('Your birth details', 'உங்கள் பிறப்பு விவரங்கள்')}</h2><p class="muted">${L('Enter the date and place of birth, and the time if you know it.', 'பிறந்த தேதி, இடம், தெரிந்தால் நேரம் உள்ளிடவும்.')}</p>` : ''}
      ${editing.id ? '' : `<button type="button" class="card glass cta-card kattam-cta" data-go="kattam"><b>📜 ${L('Only have the written jathagam (Rasi Kattam)?', 'எழுதிய ஜாதகம் (ராசி கட்டம்) மட்டும் உள்ளதா?')}</b><span class="small">${L('No birth time needed — fill the 12 boxes and the birth star, with the photo beside you.', 'பிறந்த நேரம் தேவையில்லை — புகைப்படத்தைப் பார்த்து 12 கட்டங்களையும் நட்சத்திரத்தையும் நிரப்புங்கள்.')}</span></button>`}
      ${memberForm(editing, first)}</div>`;
    const f = $('#memberForm');
    // Time zone: picking a place fills its IANA zone; the offset shown is the one in force on the birth date.
    // Daylight saving: a wall time that occurs twice (clocks went back) needs an earlier / later choice; one that
    // never occurred (clocks went forward) must be corrected (shared/datetime.js flags both).
    let dstChoice = editing.dstChoice || 'earlier';
    const showDst = () => {
      const box = $('#dstBox');
      const unknownTime = f.elements.timeCertainty.value === 'unknown';
      const d = unknownTime ? null : dstCheck(f.elements.zone.value, f.elements.date.value, f.elements.time.value);
      f.dataset.dst = d ? (d.ambiguous ? 'ambiguous' : 'nonexistent') : '';
      if (!d) { box.hidden = true; box.innerHTML = ''; return; }
      box.hidden = false;
      if (d.nonexistent) {
        box.className = 'note-box unv dst-box';
        box.innerHTML = `⏰ ${L('This time did not exist on the clock that day — clocks jumped forward (daylight saving). Please check the birth time on the certificate and correct it.', 'அன்று இந்த நேரம் கடிகாரத்தில் இல்லை — கடிகாரம் முன்னோக்கி நகர்த்தப்பட்டது (பகல் சேமிப்பு நேரம்). சான்றிதழில் பிறந்த நேரத்தைச் சரிபார்த்துத் திருத்தவும்.')}`;
        return;
      }
      const [a, b] = d.alternatives;
      const offs = [a, b].map((x) => offsetLabel(zonedToUtc(f.elements.date.value, f.elements.time.value, f.elements.zone.value, { disambiguation: x === a ? 'earlier' : 'later' }).offsetMinutes / 60));
      box.className = 'note-box dst-box';
      box.innerHTML = `⏰ ${L('This time occurs twice during the clock change (daylight saving ended) — was it the earlier or the later one?', 'இந்த நேரம் கடிகார மாற்றத்தின் போது இருமுறை வருகிறது — முதலாவதா, இரண்டாவதா?')}
        <div class="seg" role="radiogroup">${[['earlier', 'Earlier', 'முதலாவது (முந்தையது)', offs[0]], ['later', 'Later', 'இரண்டாவது (பிந்தையது)', offs[1]]].map(([id, en, tx, o]) => `<label class="seg-opt"><input type="radio" name="dstChoice" value="${id}"${dstChoice === id ? ' checked' : ''}> ${L(en, tx)} <span class="muted small">(${esc(o)})</span></label>`).join('')}</div>`;
      $$('input[name="dstChoice"]', box).forEach((r) => r.addEventListener('change', () => { dstChoice = r.value; f.dataset.dstChoice = dstChoice; showZone(); }));
    };
    f.dataset.dstChoice = dstChoice;
    const showZone = () => {
      const z = f.elements.zone.value;
      const off = z ? birthOffset(z, f.elements.date.value, f.elements.time.value, f.dataset.dstChoice || 'earlier') : null;
      if (off != null) f.elements.tz.value = off;
      $('#zoneNote').textContent = z
        ? `🕰 ${L('Time zone', 'நேர மண்டலம்')}: ${z.replace(/_/g, ' ')} · ${offsetLabel(off)} ${L('on the birth date (daylight saving and old rules included)', 'பிறந்த நாளில் (பகல் சேமிப்பு நேரம், பழைய விதிகள் உட்பட)')}`
        : L('Pick the place from the list to fill the time zone automatically.', 'நேர மண்டலம் தானாக நிரம்ப, பட்டியலிலிருந்து இடத்தைத் தேர்வு செய்யவும்.');
      if (!$('#dstBox')?.contains(document.activeElement)) showDst();
    };
    // A place counts as chosen once it is picked from the list (or was saved before); typing over it clears the
    // old coordinates, and Save then picks the one clear match itself or asks (never a browser bubble).
    const usePlace = (p) => {
      f.elements.place.value = p.text || p.name; f.elements.lat.value = p.lat; f.elements.lon.value = p.lon;
      f.elements.zone.value = p.zone || ''; if (!p.zone && p.tz != null) f.elements.tz.value = p.tz;
      f.dataset.placePicked = f.elements.place.value;
      showZone();
    };
    if (editing.place && Number.isFinite(Number(editing.lat)) && editing.lat !== '') f.dataset.placePicked = editing.place;
    placeSearch(f.elements.place, $('#placeList'), usePlace);
    f.elements.place.addEventListener('input', () => {
      if (f.dataset.placePicked && f.elements.place.value.trim() !== f.dataset.placePicked) {
        f.dataset.placePicked = ''; f.elements.lat.value = ''; f.elements.lon.value = ''; f.elements.zone.value = ''; showZone();
      }
    });
    f.elements.tz.addEventListener('input', (e) => { if (e.isTrusted) { f.elements.zone.value = ''; showZone(); } }); // typed by hand: keep the fixed offset
    for (const k of ['date', 'time']) f.elements[k].addEventListener('change', showZone);
    showZone();
    const names = bindNameFields(f, editing);
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const bad = checkMemberForm(f, usePlace);
      if (bad) { showFormErr(f, bad.field, bad.msg); return; }
      saveMember(f, names.read());
    });
    f.addEventListener('input', (e) => { if (e.target.getAttribute('aria-invalid')) { e.target.removeAttribute('aria-invalid'); $('#formErr').textContent = ''; } });
    f.addEventListener('change', (e) => {
      if (e.target.name !== 'timeCertainty') return;
      const v = e.target.value;
      f.querySelector('.tw').hidden = v !== 'approx';
      f.elements.time.disabled = v === 'unknown';
      f.elements.time.required = v !== 'unknown';
      if (v === 'unknown') f.elements.time.value = '';
      showZone();
    });
    $('#delMember')?.addEventListener('click', () => askDelete(editing.id));
    return;
  }
  sec.innerHTML = `${subHeader(L('Family Profiles', 'குடும்ப சுயவிவரங்கள்'), L('Everyone\'s charts in one place', 'அனைவரின் ஜாதகமும் ஒரே இடத்தில்'), 'familyhub')}
    ${state.family.map((m) => { const c = chartOf(m); return `<div class="card glass fam-card${m.id === state.activeId ? ' active' : ''}">
      <span class="avatar">${esc(initialOf(displayName(m)))}</span>
      <div style="flex:1"><b>${esc(displayName(m))}</b> <span class="pill">${esc(bi(RELATIONS.find((r) => r.id === m.relation) || RELATIONS[6]))}</span>
        ${m.shared ? `<div class="small"><span class="tag ${m.shared.permission === 'edit' ? 'good' : 'warn'}">${L('Shared by', 'பகிர்ந்தவர்')} ${esc(nameInLang(m.shared.by) || L('family', 'குடும்பம்'))} · ${m.shared.permission === 'edit' ? L('can edit', 'திருத்தலாம்') : L('view only', 'பார்வைக்கு மட்டும்')}</span></div>` : ''}
        <div class="muted small">${certaintyOf(m) === 'unknown' ? `${esc(fmtBirth(m.date, null, lg()))} · ${L('time unknown', 'நேரம் தெரியாது')}` : `${esc(fmtBirth(m.date, m.time.slice(0, 5), lg()))}${certaintyOf(m) === 'approx' ? ` (± ${m.timeWindowMin || 60} ${L('min', 'நிமி')})` : ''}`} · ${esc(placeName(m.place))}</div>
        <div class="small">${esc(nakName(c.janmaNakshatra.index))} · ${esc(rasiName(c.janmaRasi.index))}${certaintyOf(m) === 'exact' ? ` · ${L('Lagnam', 'லக்னம்')} ${esc(rasiName(c.lagna.rasi))}` : ''}</div></div>
      <div class="fam-actions">${m.id === state.activeId ? `<span class="tag good">${L('Active', 'தேர்வு')}</span>` : `<button class="chip-btn" data-use="${esc(m.id)}">${L('Use', 'தேர்வு')}</button>`}
        <div class="fam-row-btns">${!m.shared || m.shared.permission === 'edit' ? `<button class="link-btn" data-edit="${esc(m.id)}">${L('Edit', 'திருத்து')}</button>` : ''}
        ${m.shared ? '' : `<button type="button" class="fam-del" data-del="${esc(m.id)}" aria-label="${esc(L(`Delete ${displayName(m)}`, `${displayName(m)} நீக்கு`))}" title="${esc(L('Delete', 'நீக்கு'))}">${TRASH}</button>`}</div></div></div>`; }).join('')}
    <button class="btn-gold" id="addMember">➕ ${L('Add family member', 'குடும்ப உறுப்பினர் சேர்')}</button>
    ${state.user ? '' : `<p class="muted small center">${L('Sign in to back up your family and use it on other phones.', 'குடும்ப விவரங்களைப் பாதுகாக்க, பிற கைப்பேசிகளில் பயன்படுத்த உள்நுழையவும்.')}</p>`}`;
  $$('[data-use]', sec).forEach((b) => b.addEventListener('click', () => { state.activeId = b.dataset.use; saveFamily(); renderFamily(sec); }));
  $$('[data-edit]', sec).forEach((b) => b.addEventListener('click', () => { const mm = state.family.find((x) => x.id === b.dataset.edit); go(mm?.kattam ? 'kattam' : 'family', { edit: b.dataset.edit }); }));
  $('#addMember').addEventListener('click', () => go('family', { add: true }));
  famDelCss();
  $$('[data-del]', sec).forEach((b) => b.addEventListener('click', () => askDelete(b.dataset.del, b)));
  // Shared family: syncs on open; the list is re-drawn (keeping this card) when shared profiles arrive or go.
  if (keepShareBox) { sec.append(keepShareBox); keepShareBox = null; return; }
  sec.insertAdjacentHTML('beforeend', '<div id="sharedFamily"></div>');
  const box = $('#sharedFamily', sec);
  mountSharedFamily(box, { onChange: () => { if (state.view === 'family' && !editing && sec.contains(box)) { keepShareBox = box; renderFamily(sec); } } });
}
let keepShareBox = null;

// ---------------------------------------------------------------- delete a person (shared/family-delete.js)
const TRASH = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>';
const UNDO_MS = 8000;
let pendingUndo = null; // { snapshot, timer } while the Undo toast is showing

function famDelCss() {
  if (document.getElementById('famDelCss')) return;
  const st = document.createElement('style');
  st.id = 'famDelCss';
  st.textContent = `
.fam-row-btns { display: flex; align-items: center; gap: 6px; }
.fam-actions .chip-btn, .fam-actions .link-btn { min-height: 44px; }
.fam-del { display: inline-grid; place-items: center; width: 44px; height: 44px; border-radius: 999px; border: 1px solid var(--glass-b); background: transparent; color: var(--muted); cursor: pointer; padding: 0; }
.fam-del:hover, .fam-del:focus-visible { color: #e0565b; border-color: #e0565b; }
@media (max-width: 560px) {
  .fam-card { flex-wrap: wrap; }
  .fam-card > .fam-actions { flex: 1 0 100%; flex-direction: row; justify-content: flex-end; align-items: center; flex-wrap: wrap; gap: 8px; padding-top: 8px; border-top: 1px solid rgba(var(--ink-rgb, 0, 0, 0), .08); }
}
.fam-del-card { text-align: start; }
.fam-del-card h2 { margin: 0; font-size: 18px; }
.fam-del-card ul { margin: 0; padding-inline-start: 20px; display: grid; gap: 6px; }
.fam-del-btns { display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap; margin-top: 4px; }
.fam-del-btns button { min-height: 44px; min-width: 96px; }
.btn-danger { background: #c62f3b; color: #fff; border: 0; border-radius: 999px; padding: 10px 18px; font: inherit; font-weight: 700; cursor: pointer; }
#undoToast { position: fixed; left: 16px; right: 16px; margin: 0 auto; width: fit-content; max-width: 520px; bottom: calc(var(--tab-h, 64px) + 24px + env(safe-area-inset-bottom)); z-index: 55; display: flex; align-items: center; gap: 12px; padding: 6px 6px 6px 18px; border-radius: 999px; background: var(--surface-strong); border: 1px solid var(--gold); color: var(--gold2); font-size: 14px; box-shadow: 0 8px 24px rgba(0, 0, 0, .25); }
#undoToast span { min-width: 0; overflow-wrap: anywhere; }
#undoToast button { min-height: 44px; white-space: nowrap; padding: 0 16px; border-radius: 999px; border: 1px solid var(--gold); background: transparent; color: inherit; font: inherit; font-weight: 700; cursor: pointer; flex: none; }
[data-theme="light"] #undoToast { background: #1d1530; color: #fff; border-color: #1d1530; }
[data-theme="light"] #undoToast button { border-color: rgba(255, 255, 255, .6); }`;
  document.head.append(st);
}

function closeDelModal(box, back) {
  box.remove();
  document.body.classList.remove('modal-open');
  if (back && document.contains(back)) back.focus();
}

/** Ask before deleting: say exactly what is removed. The last person cannot be deleted (edit or add instead). */
function askDelete(id, back = null) {
  famDelCss();
  const m = state.family.find((x) => x.id === id);
  if (!m) return;
  const name = displayName(m);
  const check = canDeleteMember(state.family, id);
  const box = document.createElement('div');
  box.className = 'modal';
  let body;
  if (!check.ok && check.reason === 'last') {
    body = `<h2 id="famDelT">${esc(L(`${name} is the only person here`, `இங்கு ${name} மட்டுமே உள்ளார்`))}</h2>
      <p>${L('There must be at least one person to show a chart. Add another person first, then delete this one — or just edit these details.', 'ஜாதகம் காட்ட குறைந்தது ஒருவர் வேண்டும். முதலில் இன்னொருவரைச் சேர்த்து, பிறகு இவரை நீக்குங்கள் — அல்லது இந்த விவரங்களைத் திருத்துங்கள்.')}</p>
      <div class="fam-del-btns"><button type="button" class="chip-btn" data-x="cancel">${L('Close', 'மூடு')}</button>
        <button type="button" class="chip-btn" data-x="edit">${L('Edit details', 'விவரம் திருத்து')}</button>
        <button type="button" class="btn-gold" data-x="add">➕ ${L('Add a person', 'ஒருவரைச் சேர்')}</button></div>`;
  } else if (!check.ok) {
    return;
  } else {
    const dry = deleteMember({ family: state.family, activeId: state.activeId, goals: store.get('kj_goals', null), plans: store.get('kj_plans', null) }, id);
    const next = state.family.find((x) => x.id === dry.activeId);
    const goalsN = dry.removed.goalIds.length;
    const backedUp = state.user && !STATIC && backupConsent() && !isPrivateProfile(m);
    const lines = [
      L('Their birth details and chart are removed from this phone.', 'இவரின் பிறப்பு விவரங்களும் ஜாதகமும் இந்தக் கைப்பேசியிலிருந்து நீக்கப்படும்.'),
      goalsN ? L(`Their ${goalsN === 1 ? 'goal' : `${goalsN} goals`} on this phone ${goalsN === 1 ? 'is' : 'are'} removed too.`, `இவரின் ${goalsN} இலக்கு${goalsN === 1 ? '' : 'கள்'} நீக்கப்படும்.`) : '',
      backedUp ? L('Also removed from your account backup.', 'உங்கள் கணக்குக் காப்புப்பிரதியிலிருந்தும் நீக்கப்படும்.')
        : state.user && !STATIC && !isPrivateProfile(m) ? L('Backup is off, so an older copy in your account is not changed.', 'காப்புப்பிரதி அணைக்கப்பட்டுள்ளது; கணக்கில் உள்ள பழைய நகல் மாறாது.') : '',
      state.user && !STATIC ? L('Any family links sharing this chart are stopped.', 'இந்த ஜாதகத்தைப் பகிரும் குடும்ப இணைப்புகள் நிறுத்தப்படும்.') : '',
      m.id === state.activeId && next ? L(`${displayName(next)} becomes the selected person.`, `${displayName(next)} தேர்வு செய்யப்படுவார்.`) : '',
    ].filter(Boolean);
    body = `<h2 id="famDelT">${esc(L(`Delete ${name}?`, `${name} — நீக்கவா?`))}</h2>
      <ul>${lines.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      <p class="small muted">${L('You can undo this for a few seconds.', 'சில விநாடிகளுக்குள் இதைத் திரும்பப் பெறலாம்.')}</p>
      <div class="fam-del-btns"><button type="button" class="chip-btn" data-x="cancel">${L('Cancel', 'ரத்து')}</button>
        <button type="button" class="btn-danger" data-x="delete">${L('Delete', 'நீக்கு')}</button></div>`;
  }
  box.innerHTML = `<div class="modal-card fam-del-card" role="dialog" aria-modal="true" aria-labelledby="famDelT">${body}</div>`;
  document.body.append(box);
  document.body.classList.add('modal-open');
  const close = () => closeDelModal(box, back);
  box.addEventListener('click', (e) => { if (e.target === box) close(); });
  box.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } });
  $$('[data-x]', box).forEach((b) => b.addEventListener('click', () => {
    const x = b.dataset.x;
    closeDelModal(box, x === 'cancel' ? back : null);
    if (x === 'delete') doDelete(id);
    else if (x === 'edit') go(m.kattam ? 'kattam' : 'family', { edit: id });
    else if (x === 'add') go('family', { add: true });
  }));
  $('[data-x="cancel"]', box)?.focus();
}

function finishPendingUndo() {
  if (!pendingUndo) return;
  clearTimeout(pendingUndo.timer);
  pendingUndo = null;
  document.getElementById('undoToast')?.remove();
  if (state.user) syncShares(); // the undo window is over: stop shared family links of deleted people
}

function doDelete(id) {
  finishPendingUndo(); // an earlier delete is final once another starts
  const snapshot = { family: state.family.slice(), activeId: state.activeId, goals: store.get('kj_goals', null), plans: store.get('kj_plans', null) };
  const r = deleteMember(snapshot, id);
  if (!r.ok) return;
  state.family = r.family;
  state.activeId = r.activeId;
  if (r.goals !== snapshot.goals) store.set('kj_goals', r.goals);
  if (r.plans !== snapshot.plans) store.set('kj_plans', r.plans);
  editing = null;
  saveFamily();
  go('family');
  showUndo(displayName(r.removed.member), snapshot);
}

function showUndo(name, snapshot) {
  famDelCss();
  document.getElementById('undoToast')?.remove();
  const el = document.createElement('div');
  el.id = 'undoToast';
  el.setAttribute('role', 'status');
  el.innerHTML = `<span>${esc(L(`${name} deleted`, `${name} நீக்கப்பட்டார்`))}</span><button type="button" id="undoDel">${L('Undo', 'திரும்பப் பெறு')}</button>`;
  document.body.append(el);
  pendingUndo = { snapshot, timer: setTimeout(finishPendingUndo, UNDO_MS) };
  $('#undoDel', el).addEventListener('click', () => {
    if (!pendingUndo) return;
    clearTimeout(pendingUndo.timer);
    const back = undoDelete(pendingUndo.snapshot);
    pendingUndo = null;
    el.remove();
    state.family = back.family;
    state.activeId = back.activeId;
    if (back.goals == null) store.del('kj_goals'); else store.set('kj_goals', back.goals);
    if (back.plans == null) store.del('kj_plans'); else store.set('kj_plans', back.plans);
    saveFamily();
    if (state.view === 'family') go('family');
    toast(L(`${name} is back`, `${name} மீண்டும் சேர்க்கப்பட்டார்`));
  });
}

/**
 * The family form's own checks, in the app language (the form is novalidate — no English browser bubbles).
 * A typed birth place that was not picked is matched here: one clear built-in match is used; otherwise the person
 * is asked to pick from the list. Returns { field, msg } for the first problem, or null.
 */
export function checkMemberForm(f, usePlace) {
  const el = f.elements;
  if (!el.name.value.trim()) return { field: 'name', msg: L('Please enter the name.', 'பெயரை உள்ளிடுங்கள்.') };
  if (!el.date.value) return { field: 'date', msg: L('Please enter the date of birth.', 'பிறந்த தேதியை உள்ளிடுங்கள்.') };
  if (el.timeCertainty.value !== 'unknown' && !el.time.value) return { field: 'time', msg: L('Please enter the time of birth — or choose “Unknown”.', 'பிறந்த நேரத்தை உள்ளிடுங்கள் — தெரியாவிட்டால் “தெரியாது” என்பதைத் தேர்ந்தெடுங்கள்.') };
  const typed = el.place.value.trim();
  if (!typed) return { field: 'place', msg: L('Please enter the place of birth.', 'பிறந்த இடத்தை உள்ளிடுங்கள்.') };
  const haveCoords = el.lat.value !== '' && el.lon.value !== '' && !(Number(el.lat.value) === 0 && Number(el.lon.value) === 0);
  if (!haveCoords) {
    const p = resolveTypedPlace(typed, { preferCc: userCc() });
    if (p) usePlace({ ...p, text: placeText(p) });
    else {
      el.place.dispatchEvent(new Event('input', { bubbles: true })); // show the suggestions again
      return { field: 'place', msg: L('Please pick the birth place from the list below the box (or enter latitude and longitude).', 'பிறந்த இடத்தைப் பெட்டியின் கீழுள்ள பட்டியலிலிருந்து தேர்ந்தெடுங்கள் (அல்லது அட்சரேகை, தீர்க்கரேகை உள்ளிடுங்கள்).') };
    }
  }
  const lat = Number(el.lat.value), lon = Number(el.lon.value);
  if (!(Math.abs(lat) <= 90) || !(Math.abs(lon) <= 180)) return { field: 'lat', msg: L('Latitude must be between −90 and 90, longitude between −180 and 180.', 'அட்சரேகை −90 முதல் 90 வரை, தீர்க்கரேகை −180 முதல் 180 வரை இருக்க வேண்டும்.') };
  if (el.tz.value === '' || !(Math.abs(Number(el.tz.value)) <= 14)) return { field: 'tz', msg: L('Please enter the UTC offset (for India 5.5).', 'நேர மண்டலத்தை உள்ளிடுங்கள் (இந்தியாவுக்கு 5.5).') };
  return null;
}
/** Show a form message in #formErr and move focus to the field it is about. */
function showFormErr(f, field, msg) {
  const err = $('#formErr');
  if (err) { err.textContent = msg; err.setAttribute('role', 'alert'); }
  const el = f.elements[field];
  if (el) { el.setAttribute('aria-invalid', 'true'); el.focus(); el.scrollIntoView?.({ block: 'center', behavior: 'smooth' }); }
}

function saveMember(f, names) {
  const timeCertainty = f.elements.timeCertainty.value || 'exact';
  const raw = f.elements.time.value;
  if (timeCertainty !== 'unknown' && f.dataset.dst === 'nonexistent') { $('#formErr').textContent = L('This birth time did not exist on the clock that day (daylight saving). Please correct it.', 'அன்று இந்தப் பிறந்த நேரம் கடிகாரத்தில் இல்லை (பகல் சேமிப்பு நேரம்). திருத்தவும்.'); return; }
  const dstChoice = timeCertainty !== 'unknown' && f.dataset.dst === 'ambiguous' ? (f.dataset.dstChoice || 'earlier') : undefined;
  // Unknown time: a fixed calculation placeholder that is never displayed (see shared/birthtime.js).
  const time = timeCertainty === 'unknown' ? UNKNOWN_TIME_PLACEHOLDER : raw.length === 5 ? `${raw}:00` : raw;
  const m = {
    timeCertainty, timeWindowMin: timeCertainty === 'approx' ? Number(f.elements.timeWindowMin.value) : undefined, dstChoice, private: f.elements.private.checked || undefined,
    maritalStatus: f.elements.maritalStatus.value || undefined,
    faith: f.elements.faith.value && f.elements.faith.value !== 'auto' ? f.elements.faith.value : undefined,
    marriedYear: /^(19|20)\d{2}$/.test(f.elements.marriedYear.value.trim()) ? Number(f.elements.marriedYear.value.trim()) : undefined,
    children: /^\d{1,2}$/.test(f.elements.children.value.trim()) ? Number(f.elements.children.value.trim()) : undefined,
    firstChildYear: /^(19|20)\d{2}$/.test(f.elements.firstChildYear.value.trim()) ? Number(f.elements.firstChildYear.value.trim()) : undefined,
    id: editing.id || Math.random().toString(36).slice(2, 10),
    ...names, relation: f.elements.relation.value, gender: f.elements.gender.value,
    date: f.elements.date.value, time, place: f.elements.place.value.trim(),
    lat: Number(f.elements.lat.value), lon: Number(f.elements.lon.value), tz: Number(f.elements.tz.value),
    zone: isValidZone(f.elements.zone.value) ? f.elements.zone.value : undefined,
    shared: editing.shared || undefined, // a profile someone shared with me (edit permission) stays theirs
  };
  if (m.shared) m.private = undefined; // someone else's profile cannot be made private here
  if (m.zone) m.tz = birthOffset(m.zone, m.date, m.time, dstChoice || 'earlier') ?? m.tz;
  if (!m.lat && !m.lon) { $('#formErr').textContent = L('Please pick the place from the list, or enter latitude and longitude.', 'பட்டியலிலிருந்து இடத்தைத் தேர்வு செய்யவும் அல்லது அட்சரேகை, தீர்க்கரேகை உள்ளிடவும்.'); return; }
  const i = state.family.findIndex((x) => x.id === m.id);
  if (i < 0 && m.relation !== 'organization' && state.family.filter((x) => x.relation !== 'organization' && !x.shared).length >= 8) { $('#formErr').textContent = L('The Family plan holds up to 8 profiles.', 'குடும்பத் திட்டத்தில் 8 சுயவிவரங்கள் வரை.'); return; }
  if (i >= 0) state.family[i] = m; else state.family.push(m);
  const firstEver = state.family.length === 1;
  if (firstEver || !state.activeId) state.activeId = m.id;
  // The birth place never becomes the residence (born in Madurai, living in Dubai): daily timings keep the
  // place the person lives in (Settings → Location).
  editing = null;
  saveFamily();
  if (m.shared) pushSharedEdit(m); else if (state.user) syncShares(); // my shared copies follow my edits
  toast(L('Saved', 'சேமிக்கப்பட்டது'));
  go(firstEver ? 'chart' : 'family');
}
registerScreen('family', { render: renderFamily, parent: 'more' });

// ================================================================ MORE / SETTINGS
/** The owner dashboard is shown only to admins: a server-marked admin account, or a phone that has opened it with an admin token. */
// Never reads an admin token: a server-marked admin account, or this tab's session flag set after the dashboard opened.
const adminSession = () => { try { return sessionStorage.getItem('kj_admin_session') === '1'; } catch { return false; } };
export const isAdmin = () => !!(state.user?.admin || state.user?.isAdmin || ['admin', 'owner'].includes(state.user?.role) || adminSession());
function renderMore(sec) {
  const u = state.user;
  sec.innerHTML = `${subHeader(L('Settings & Account', 'அமைப்புகள் & கணக்கு'), '', 'home')}<div class="card glass account-card">
      <span class="avatar big">${esc(u ? (initialOf(displayName(state.family.find((m) => m.relation === 'self')) || nameInLang(u.name)) || '🙏') : '🙏')}</span>
      <div style="flex:1">${u ? `<b>${esc(displayName(state.family.find((m) => m.relation === 'self')) || nameInLang(u.name) || L('Signed in', 'உள்நுழைந்துள்ளீர்கள்'))}</b><div class="muted small">${esc(u.phone ? formatPhone(u.phone) : u.email || (u.hasFacebook ? 'Facebook' : ''))}${u.demo ? ' · demo' : ''}</div>`
    : `<b>${L('Not signed in', 'உள்நுழையவில்லை')}</b><div class="muted small">${L('Sign in to back up your family', 'குடும்ப விவரங்களைப் பாதுகாக்க உள்நுழையவும்')}</div>`}</div>
      ${u ? `<button class="chip-btn" id="signOut">${L('Sign out', 'வெளியேறு')}</button>` : `<button class="chip-btn" data-go="login">${L('Sign in', 'உள்நுழை')}</button>`}</div>
    <button class="premium-cta" data-go="plans">${iconChip('plans', { size: 20, cls: 'mi-icon' })}${L(`${BRAND.personalEn} & ${BRAND.familyEn}`, `${BRAND.personalTa} & ${BRAND.familyTa}`)} ›</button>
    <div class="card glass settings">
      <div class="card-title">${L('Settings', 'அமைப்புகள்')}</div>
      <div class="set-row"><span>${L('Language', 'மொழி')}</span><div class="seg"><button data-lang="ta" class="${ta() ? 'sel' : ''}">தமிழ்</button><button data-lang="en" class="${ta() ? '' : 'sel'}">English</button></div></div>
      <div class="set-row"><span>${L('Appearance', 'தோற்றம்')}</span><div class="seg">${[['light', 'Day', 'பகல்'], ['dark', 'Night', 'இரவு'], ['auto', 'Auto', 'தானியங்கி']].map(([id, en, tx]) => `<button data-theme-set="${id}" class="${(state.settings.theme || 'dark') === id ? 'sel' : ''}">${L(en, tx)}</button>`).join('')}</div></div>
      <label class="set-row"><span>${L('Large text (for elders)', 'பெரிய எழுத்து (பெரியோருக்கு)')}</span><input type="checkbox" id="setLarge"${state.settings.large ? ' checked' : ''}></label>
      <label class="set-row"><span>${L('High contrast', 'அதிக வேறுபாடு')}</span><input type="checkbox" id="setHc"${state.settings.hc ? ' checked' : ''}></label>
      <label class="set-row"><span>${L('Read answers aloud', 'பதில்களை வாசித்துக்காட்டு')}</span><input type="checkbox" id="setVoice"${state.settings.voice ? ' checked' : ''}></label>
      <label class="set-row"><span>${L('Read-aloud speed', 'வாசிப்பு வேகம்')} <b id="rateVal">${Number(state.settings.rate || 0.92).toFixed(2)}×</b></span><input type="range" id="setRate" min="0.6" max="1.4" step="0.05" value="${state.settings.rate || 0.92}" aria-label="${L('Read-aloud speed', 'வாசிப்பு வேகம்')}"></label>
      ${locationSettingsHtml()}
    </div>
    <div class="menu">
      <button data-go="dailyset">${iconChip('reminders', { size: 20, cls: 'mi-icon' })}<span>${L('Daily brief, reminders & prompts — on / off', 'தினசரி குறிப்பு, நினைவூட்டல்கள் — இயக்கு / நிறுத்து')}</span></button>
      <button data-go="privacy">${iconChip('privacy', { size: 20, cls: 'mi-icon' })}<span>${L('Privacy & data — consent, export, delete', 'தனியுரிமை & தரவு — அனுமதி, ஏற்றுமதி, நீக்கம்')}</span></button>
      <button data-go="why">${iconChip('why', { size: 20, cls: 'mi-icon' })}<span>${L('How Thunai reads your chart', 'துணை ஜாதகத்தைப் படிக்கும் முறை')}</span></button>
      <button data-go="calc">${iconChip('calc', { size: 20, cls: 'mi-icon' })}<span>${L('Calculation methods', 'கணிப்பு முறைகள்')}</span></button>
      <button data-go="value">${iconChip('plans', { size: 20, cls: 'mi-icon' })}<span>${L('Your Thunai so far (optional summary)', 'என் பயன் (விருப்பச் சுருக்கம்)')}</span></button>
      <button data-go="legal">${iconChip('legal', { size: 20, cls: 'mi-icon' })}<span>${L('Terms, renewals, cancellation & refunds', 'விதிமுறைகள், புதுப்பித்தல், ரத்து, பணத்திருப்பம்')}</span></button>
      <button data-go="feedback">${iconChip('feedback', { size: 20, cls: 'mi-icon' })}<span>${L('Rate & comment', 'மதிப்பீடு & கருத்து')}</span></button>
      <button data-go="invite">${iconChip('invite', { size: 20, cls: 'mi-icon' })}<span>${L('Invite family & friends', 'குடும்பம், நண்பர்களை அழையுங்கள்')}</span></button>
      <button data-go="about">${iconChip('about', { size: 20, cls: 'mi-icon' })}<span>${L(`About ${BRAND.name}`, `${BRAND.nameTa} பற்றி`)}</span></button>
    </div>
    ${supportCard()}
    ${isAdmin() ? `<div class="menu list"><button class="row" data-go="admin">${iconChip('admin', { size: 20, cls: 'mi-icon' })}<span class="row-txt"><span class="row-name">${L('Owner dashboard', 'உரிமையாளர் முகப்புப் பலகை')}</span></span></button></div>` : ''}
    ${copyright()}`;
  $('#signOut')?.addEventListener('click', signOut);
  $$('[data-lang]', sec).forEach((b) => b.addEventListener('click', () => { state.lang = b.dataset.lang; store.set('kj_lang', state.lang); document.dispatchEvent(new Event('kj:lang')); }));
  $$('[data-theme-set]', sec).forEach((b) => b.addEventListener('click', () => { state.themeOverride = null; state.settings.theme = b.dataset.themeSet; saveSettings(); renderMore(sec); }));
  $('#setLarge').addEventListener('change', (e) => { state.settings.large = e.target.checked; state.settings.largeChosen = true; saveSettings(); });
  $('#setVoice').addEventListener('change', (e) => { state.settings.voice = e.target.checked; saveSettings(); });
  $('#setHc').addEventListener('change', (e) => { state.settings.hc = e.target.checked; saveSettings(); });
  $('#setRate').addEventListener('input', (e) => { state.settings.rate = Number(e.target.value); $('#rateVal').textContent = `${state.settings.rate.toFixed(2)}×`; saveSettings(); });
  bindLocationSettings(sec, () => renderMore(sec));
}
registerScreen('more', { render: renderMore });

function renderAbout(sec) {
  const P = [
    ['🧭', 'Honest astrology', 'நேர்மையான ஜோதிடம்', 'No fear, no death predictions, no pressure to buy costly poojas or gems. Astrology shows tendencies and timing; your effort and dharma shape the result.', 'பயமுறுத்தல் இல்லை, மரண கணிப்பு இல்லை, விலையுயர்ந்த பூஜை/ரத்தினம் வாங்க அழுத்தம் இல்லை. ஜோதிடம் போக்கையும் நேரத்தையும் காட்டும்; முயற்சியும் தர்மமும் பலனைத் தீர்மானிக்கும்.'],
    ['🔍', 'See the calculation', 'கணக்கைப் பாருங்கள்', 'Every answer lists the chart factors it used, separates traditional interpretation from facts, and says what is uncertain.', 'ஒவ்வொரு பதிலிலும் ஓரை, தாரா பலம், ராகு காலம், பிரசன்ன லக்னம் போன்ற உண்மையான காரணிகள் மதிப்புடன் காட்டப்படும்.'],
    ['🔭', 'Calculated to the second', 'நொடி வரை கணிப்பு', 'Planet positions are calculated to the second by an astronomy engine with the Lahiri ayanamsa; how closely they agree with a professional reference is published in the Accuracy Report. Your result can only be as exact as the birth time you enter — approximate times are marked “may change”. Astronomical accuracy does not prove predictions — it only makes the inputs right.', 'லாஹிரி அயனாம்சத்துடன் வானியல் கணிப்பு இயந்திரம் கிரக நிலைகளை நொடி வரை கணக்கிடுகிறது; தொழில்முறை ஒப்பீட்டுடன் எவ்வளவு ஒத்துப்போகிறது என்பது துல்லிய அறிக்கையில் வெளியிடப்பட்டுள்ளது. நீங்கள் உள்ளிடும் பிறந்த நேரம் அளவுக்கே பலனும் துல்லியமாக இருக்கும் — தோராய நேரங்கள் “மாறக்கூடியது” எனக் குறிக்கப்படும். வானியல் துல்லியம் பலன்களை நிரூபிப்பதில்லை — உள்ளீடுகளைச் சரியாக்குகிறது மட்டுமே.'],
    ['👨‍👩‍👧', 'Made for families', 'குடும்பத்திற்காக', 'All your family\'s charts together: who should be careful today, muhurthams that suit everyone, star birthdays and ancestors\' thivasam.', 'குடும்பத்தினர் அனைவரின் ஜாதகமும் ஒன்றாக: இன்று யார் கவனமாக இருக்க வேண்டும், அனைவருக்கும் ஏற்ற முகூர்த்தம், நட்சத்திரப் பிறந்தநாள், முன்னோர் திவசம்.'],
    ['💬', 'A Jothidar who listens', 'கேட்கும் ஜோதிடர்', 'Talk in Tamil or English, by voice or text. Answers come from your own chart and today’s sky.', 'தமிழ் அல்லது ஆங்கிலத்தில், குரல் அல்லது எழுத்தில் பேசுங்கள். உங்கள் ஜாதகம், இன்றைய வானம் அடிப்படையில் பதில் கிடைக்கும்.'],
    ['🪔', 'Free parigaram first', 'இலவச பரிகாரம் முதலில்', 'Prayer, a lamp, charity, feeding animals, respecting elders — remedies anyone can do, every day.', 'வழிபாடு, தீபம், தானம், உயிர்களுக்கு உணவு, பெரியோரை மதித்தல் — யாரும் தினமும் செய்யக்கூடியவை.'],
    ['🔒', 'Private by design', 'தனியுரிமை', 'Birth details stay on your phone unless you sign in to back them up. We never sell your data.', 'உள்நுழைந்து பாதுகாக்கும் வரை பிறப்பு விவரங்கள் உங்கள் கைப்பேசியிலேயே இருக்கும். உங்கள் தரவை விற்பதில்லை.'],
  ];
  sec.innerHTML = `${subHeader(L(`About ${BRAND.name}`, `${BRAND.nameTa} பற்றி`), L(BRAND.descriptorEn, BRAND.taglineTa), 'more')}
    ${P.map(([i, en, tx, den, dta]) => `<div class="card glass about-row"><span class="ti-icon">${i}</span><div><b>${L(en, tx)}</b><p>${L(den, dta)}</p></div></div>`).join('')}
    <div id="aboutTesti"></div>
    <div class="brand-foot"><img src="logo.svg" alt="" width="64" height="64"><div><b>${BRAND.nameTa} · ${BRAND.nameUpper}</b><span class="slogan-sm">${BRAND.taglineTa}</span></div></div>
    <p class="build-no" id="buildNo" title="${esc(L('For support', 'உதவிக்கு'))}">${esc(String(window.KJ_BUILD || 'dev').replace(/\b(\d{4}-\d\d-\d\d)\b/, (d) => fmtDay(d, state.lang)))}</p>
    ${copyright()}`;
  // Support: the build number is small, here only. Long-press it (or tap 7 times) to open the owner dashboard.
  const bn = $('#buildNo', sec);
  let pressT, taps = 0;
  const openAdmin = () => go('admin');
  bn.addEventListener('pointerdown', () => { pressT = setTimeout(openAdmin, 800); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => bn.addEventListener(ev, () => clearTimeout(pressT)));
  bn.addEventListener('click', () => { if (++taps >= 7) { taps = 0; openAdmin(); } });
  if (!STATIC) import('./growth.js').then((g) => g.loadTestimonials('#aboutTesti'));
}
registerScreen('about', { render: renderAbout, parent: 'more' });
