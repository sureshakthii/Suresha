// Account: login (mobile OTP, email OTP, Facebook), family profiles and settings.
import { FAITHS } from './shared/faith.js';
import { searchLocalPlaces, placeLabel, placeText, offsetLabel, fromNominatim, nominatimUrl, zoneOffsetHours, nearestPlace } from './shared/places.js';
import { zonedToUtc, isValidZone } from './shared/datetime.js';
import { guessCountry, formatPhone } from './shared/countries.js';
import { enhancePhone, phoneError, startPhoneInputs } from './phone-input.js';
import { UNKNOWN_TIME_PLACEHOLDER, certaintyOf } from './shared/birthtime.js';
import { icon, iconChip } from './icons.js';
import { locationSettingsHtml, bindLocationSettings } from './residence-ui.js';
import {
  state, $, $$, L, ta, esc, bi, api, STATIC, store, go, registerScreen, subHeader, saveFamily, saveSettings, setLoc,
  toast, RELATIONS, chartOf, nakName, rasiName, displayName, copyright, BRAND, supportCard,
  placeName,
} from './core.js';

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
  } catch { state.user = null; }
}

/** Merge the account's saved family with this device's (account data wins; local-only people are uploaded). */
async function pullAccountData() {
  try {
    const { data } = await api('/api/me/data');
    const remote = Array.isArray(data?.family) ? data.family : [];
    const ids = new Set(remote.map((m) => m.id));
    state.family = [...remote, ...state.family.filter((m) => !ids.has(m.id))];
    if (Array.isArray(data?.ancestors)) state.ancestors = data.ancestors;
    state.activeId = data?.activeId && state.family.some((m) => m.id === data.activeId) ? data.activeId : state.family[0]?.id || null;
    saveFamily();
  } catch { /* offline: keep local */ }
}

export async function signOut() {
  if (STATIC) store.del('kj_demo_user'); else await api('/api/auth/logout', { method: 'POST' }).catch(() => {});
  state.user = null;
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
      <button class="login-btn fb" id="fbBtn"${fbOk ? '' : ' aria-disabled="true"'}><span class="fb-f">f</span> ${L('Continue with Facebook', 'Facebook மூலம் தொடரவும்')}</button>
      ${fbOk ? '' : `<p class="muted small center">${L('Facebook sign-in will be enabled once the app\'s Facebook ID is configured.', 'Facebook App ID அமைக்கப்பட்டதும் Facebook உள்நுழைவு இயங்கும்.')}</p>`}`;
  } else if (login.step === 'enter') {
    body = `<form id="toForm"><label>${login.channel === 'sms' ? L('Mobile number', 'மொபைல் எண்') : L('Email address', 'மின்னஞ்சல் முகவரி')}
        ${login.channel === 'sms' ? `<input id="loginTo" name="loginPhone" type="tel" inputmode="tel" value="${esc(login.channel === 'sms' && /^\+/.test(login.to) ? login.to : '')}" required>`
    : '<input id="loginTo" type="email" autocomplete="email" required placeholder="name@example.com">'}</label>
        <button class="btn-gold" id="sendOtp">${L('Send OTP', 'OTP அனுப்பு')}</button>
        <button type="button" class="link-btn center-block" data-step="choose">‹ ${L('Other ways to sign in', 'வேறு வழிகள்')}</button>
        <p class="err" id="loginErr"></p></form>`;
  } else if (login.step === 'otp') {
    body = `<form id="otpForm"><p class="center">${L('Enter the 6-digit code sent to', '6 இலக்க குறியீடு அனுப்பப்பட்டது')} <b>${esc(login.masked || login.to)}</b></p>
        <div class="otp-boxes">${[0, 1, 2, 3, 4, 5].map((i) => `<input class="otp" inputmode="numeric" maxlength="1" aria-label="Digit ${i + 1}" data-i="${i}">`).join('')}</div>
        ${login.devCode ? `<p class="demo-note">🧪 ${STATIC ? L('Demo mode — no SMS is sent.', 'டெமோ — SMS அனுப்பப்படாது.') : L('Test mode — SMS provider not configured.', 'சோதனை முறை — SMS சேவை அமைக்கப்படவில்லை.')} ${L('Your code', 'உங்கள் குறியீடு')}: <b>${esc(login.devCode)}</b></p>` : ''}
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
  $('#fbBtn')?.addEventListener('click', () => {
    if (!fbOk) { toast(L('Facebook sign-in is not configured yet', 'Facebook உள்நுழைவு இன்னும் அமைக்கப்படவில்லை')); return; }
    location.href = '/api/auth/facebook/start';
  });
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
    } else login.to = $('#loginTo').value.trim().replace(/\s/g, '');
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
      await pullAccountData();
      saveFamily(); // upload anything that was only on this device
    }
    login.step = 'choose';
    toast(`🙏 ${L('Welcome', 'நல்வரவு')}${state.user.name ? `, ${state.user.name}` : ''}!`);
    afterLogin(name);
  } catch (e) {
    err.textContent = e.message;
    $$('.otp').forEach((b) => { b.value = ''; });
    $$('.otp')[0]?.focus();
  }
}

function afterLogin(name) {
  if (!state.family.length) go('family', { add: true, first: true, name });
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
function birthOffset(zone, date, time) {
  if (!isValidZone(zone)) return null;
  try { return date ? zonedToUtc(date, time || '12:00', zone).offsetMinutes / 60 : zoneOffsetHours(zone); } catch { return zoneOffsetHours(zone); }
}

function memberForm(m, first) {
  return `<form id="memberForm" autocomplete="off">
    <div class="row2"><label>${L('Name', 'பெயர்')}<input name="name" required maxlength="60" value="${esc(m.name || '')}"></label>
      <label>${L('Name in Tamil (optional)', 'தமிழில் பெயர் (விருப்பம்)')}<input name="nameTa" maxlength="60" lang="ta" placeholder="சுரேஷ்" value="${esc(m.nameTa || '')}"></label></div>
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
      <label>${L('Latitude', 'அட்சரேகை')}<input name="lat" type="number" step="0.0001" required value="${m.lat ?? ''}"></label>
      <label>${L('Longitude', 'தீர்க்கரேகை')}<input name="lon" type="number" step="0.0001" required value="${m.lon ?? ''}"></label>
      <label>${L('UTC offset', 'நேர மண்டலம்')}<input name="tz" type="number" step="0.25" required value="${m.tz ?? 5.5}"></label>
    </div>
    <p class="small muted zone-note" id="zoneNote"></p>
    <button class="btn-gold" type="submit">✨ ${first ? L('Create my Jathagam', 'என் ஜாதகம் உருவாக்கு') : L('Save', 'சேமி')}</button>
    ${m.id && state.family.length > 1 ? `<button type="button" class="link-btn danger center-block" id="delMember">${L('Delete this person', 'இவரை நீக்கு')}</button>` : ''}
    <p class="err" id="formErr"></p></form>`;
}

function renderFamily(sec, params = {}) {
  if (params.add) editing = { name: params.name || state.user?.name || '' };
  else if (params.edit) editing = { ...state.family.find((m) => m.id === params.edit) };
  const first = params.first || !state.family.length;
  if (editing) {
    sec.innerHTML = `${first ? '' : subHeader(editing.id ? L('Edit details', 'விவரம் திருத்து') : L('Add a family member', 'குடும்ப உறுப்பினர் சேர்'), '', 'family')}
      <div class="card glass hero-card">${first ? `<h2>${L('Your birth details', 'உங்கள் பிறப்பு விவரங்கள்')}</h2><p class="muted">${L('Enter the date and place of birth, and the time if you know it.', 'பிறந்த தேதி, இடம், தெரிந்தால் நேரம் உள்ளிடவும்.')}</p>` : ''}
      ${editing.id ? '' : `<button type="button" class="card glass cta-card kattam-cta" data-go="kattam"><b>📜 ${L('Only have the written jathagam (Rasi Kattam)?', 'எழுதிய ஜாதகம் (ராசி கட்டம்) மட்டும் உள்ளதா?')}</b><span class="small">${L('No birth time needed — fill the 12 boxes and the birth star, with the photo beside you.', 'பிறந்த நேரம் தேவையில்லை — புகைப்படத்தைப் பார்த்து 12 கட்டங்களையும் நட்சத்திரத்தையும் நிரப்புங்கள்.')}</span></button>`}
      ${memberForm(editing, first)}</div>`;
    const f = $('#memberForm');
    // Time zone: picking a place fills its IANA zone; the offset shown is the one in force on the birth date.
    const showZone = () => {
      const z = f.elements.zone.value;
      const off = z ? birthOffset(z, f.elements.date.value, f.elements.time.value) : null;
      if (off != null) f.elements.tz.value = off;
      $('#zoneNote').textContent = z
        ? `🕰 ${L('Time zone', 'நேர மண்டலம்')}: ${z.replace(/_/g, ' ')} · ${offsetLabel(off)} ${L('on the birth date (daylight saving and old rules included)', 'பிறந்த நாளில் (பகல் சேமிப்பு நேரம், பழைய விதிகள் உட்பட)')}`
        : L('Pick the place from the list to fill the time zone automatically.', 'நேர மண்டலம் தானாக நிரம்ப, பட்டியலிலிருந்து இடத்தைத் தேர்வு செய்யவும்.');
    };
    placeSearch(f.elements.place, $('#placeList'), (p) => {
      f.elements.place.value = p.text || p.name; f.elements.lat.value = p.lat; f.elements.lon.value = p.lon;
      f.elements.zone.value = p.zone || ''; if (!p.zone && p.tz != null) f.elements.tz.value = p.tz;
      showZone();
    });
    f.elements.tz.addEventListener('input', (e) => { if (e.isTrusted) { f.elements.zone.value = ''; showZone(); } }); // typed by hand: keep the fixed offset
    for (const k of ['date', 'time']) f.elements[k].addEventListener('change', showZone);
    showZone();
    f.addEventListener('submit', (e) => { e.preventDefault(); saveMember(f); });
    f.addEventListener('change', (e) => {
      if (e.target.name !== 'timeCertainty') return;
      const v = e.target.value;
      f.querySelector('.tw').hidden = v !== 'approx';
      f.elements.time.disabled = v === 'unknown';
      f.elements.time.required = v !== 'unknown';
      if (v === 'unknown') f.elements.time.value = '';
    });
    $('#delMember')?.addEventListener('click', () => {
      state.family = state.family.filter((x) => x.id !== editing.id);
      if (state.activeId === editing.id) state.activeId = state.family[0]?.id || null;
      editing = null; saveFamily(); go('family');
    });
    return;
  }
  sec.innerHTML = `${subHeader(L('Family profiles', 'குடும்ப சுயவிவரங்கள்'), L('Everyone\'s charts in one place', 'அனைவரின் ஜாதகமும் ஒரே இடத்தில்'), 'familyhub')}
    ${state.family.map((m) => { const c = chartOf(m); return `<div class="card glass fam-card${m.id === state.activeId ? ' active' : ''}">
      <span class="avatar">${esc(([...displayName(m)][0] || '').toUpperCase())}</span>
      <div style="flex:1"><b>${esc(displayName(m))}</b> <span class="pill">${esc(bi(RELATIONS.find((r) => r.id === m.relation) || RELATIONS[6]))}</span>
        <div class="muted small">${esc(m.date)} · ${certaintyOf(m) === 'unknown' ? L('time unknown', 'நேரம் தெரியாது') : `${esc(m.time.slice(0, 5))}${certaintyOf(m) === 'approx' ? ` (± ${m.timeWindowMin || 60} ${L('min', 'நிமி')})` : ''}`} · ${esc(placeName(m.place))}</div>
        <div class="small">${esc(nakName(c.janmaNakshatra.index))} · ${esc(rasiName(c.janmaRasi.index))}${certaintyOf(m) === 'exact' ? ` · ${L('Lagnam', 'லக்னம்')} ${esc(rasiName(c.lagna.rasi))}` : ''}</div></div>
      <div class="fam-actions">${m.id === state.activeId ? `<span class="tag good">${L('Active', 'தேர்வு')}</span>` : `<button class="chip-btn" data-use="${esc(m.id)}">${L('Use', 'தேர்வு')}</button>`}
        <button class="link-btn" data-edit="${esc(m.id)}">${L('Edit', 'திருத்து')}</button></div></div>`; }).join('')}
    <button class="btn-gold" id="addMember">➕ ${L('Add family member', 'குடும்ப உறுப்பினர் சேர்')}</button>
    ${state.user ? '' : `<p class="muted small center">${L('Sign in to back up your family and use it on other phones.', 'குடும்ப விவரங்களைப் பாதுகாக்க, பிற கைப்பேசிகளில் பயன்படுத்த உள்நுழையவும்.')}</p>`}`;
  $$('[data-use]', sec).forEach((b) => b.addEventListener('click', () => { state.activeId = b.dataset.use; saveFamily(); renderFamily(sec); }));
  $$('[data-edit]', sec).forEach((b) => b.addEventListener('click', () => { const mm = state.family.find((x) => x.id === b.dataset.edit); go(mm?.kattam ? 'kattam' : 'family', { edit: b.dataset.edit }); }));
  $('#addMember').addEventListener('click', () => go('family', { add: true }));
}

function saveMember(f) {
  const timeCertainty = f.elements.timeCertainty.value || 'exact';
  const raw = f.elements.time.value;
  // Unknown time: a fixed calculation placeholder that is never displayed (see shared/birthtime.js).
  const time = timeCertainty === 'unknown' ? UNKNOWN_TIME_PLACEHOLDER : raw.length === 5 ? `${raw}:00` : raw;
  const m = {
    timeCertainty, timeWindowMin: timeCertainty === 'approx' ? Number(f.elements.timeWindowMin.value) : undefined, private: f.elements.private.checked || undefined,
    maritalStatus: f.elements.maritalStatus.value || undefined,
    faith: f.elements.faith.value && f.elements.faith.value !== 'auto' ? f.elements.faith.value : undefined,
    marriedYear: /^(19|20)\d{2}$/.test(f.elements.marriedYear.value.trim()) ? Number(f.elements.marriedYear.value.trim()) : undefined,
    children: /^\d{1,2}$/.test(f.elements.children.value.trim()) ? Number(f.elements.children.value.trim()) : undefined,
    firstChildYear: /^(19|20)\d{2}$/.test(f.elements.firstChildYear.value.trim()) ? Number(f.elements.firstChildYear.value.trim()) : undefined,
    id: editing.id || Math.random().toString(36).slice(2, 10),
    name: f.elements.name.value.trim(), nameTa: f.elements.nameTa.value.trim() || undefined, relation: f.elements.relation.value, gender: f.elements.gender.value,
    date: f.elements.date.value, time, place: f.elements.place.value.trim(),
    lat: Number(f.elements.lat.value), lon: Number(f.elements.lon.value), tz: Number(f.elements.tz.value),
    zone: isValidZone(f.elements.zone.value) ? f.elements.zone.value : undefined,
  };
  if (m.zone) m.tz = birthOffset(m.zone, m.date, m.time) ?? m.tz;
  if (!m.lat && !m.lon) { $('#formErr').textContent = L('Please pick the place from the list, or enter latitude and longitude.', 'பட்டியலிலிருந்து இடத்தைத் தேர்வு செய்யவும் அல்லது அட்சரேகை, தீர்க்கரேகை உள்ளிடவும்.'); return; }
  const i = state.family.findIndex((x) => x.id === m.id);
  if (i < 0 && m.relation !== 'organization' && state.family.filter((x) => x.relation !== 'organization').length >= 8) { $('#formErr').textContent = L('The Family plan holds up to 8 profiles.', 'குடும்பத் திட்டத்தில் 8 சுயவிவரங்கள் வரை.'); return; }
  if (i >= 0) state.family[i] = m; else state.family.push(m);
  const firstEver = state.family.length === 1;
  if (firstEver || !state.activeId) state.activeId = m.id;
  // The birth place never becomes the residence (born in Madurai, living in Dubai): daily timings keep the
  // place the person lives in (Settings → Location).
  editing = null;
  saveFamily();
  toast(L('Saved', 'சேமிக்கப்பட்டது'));
  go(firstEver ? 'chart' : 'family');
}
registerScreen('family', { render: renderFamily, parent: 'more' });

// ================================================================ MORE / SETTINGS
/** The owner dashboard is shown only to admins: a server-marked admin account, or a phone that has opened it with an admin token. */
export const isAdmin = () => !!(state.user?.admin || state.user?.isAdmin || ['admin', 'owner'].includes(state.user?.role) || store.get('kj_admin', ''));
function renderMore(sec) {
  const u = state.user;
  sec.innerHTML = `${subHeader(L('Settings & account', 'அமைப்புகள் & கணக்கு'), '', 'home')}<div class="card glass account-card">
      <span class="avatar big">${esc(u?.name ? [...u.name][0].toUpperCase() : '🙏')}</span>
      <div style="flex:1">${u ? `<b>${esc(displayName(state.family.find((m) => m.relation === 'self')) || u.name || L('Signed in', 'உள்நுழைந்துள்ளீர்கள்'))}</b><div class="muted small">${esc(u.phone ? formatPhone(u.phone) : u.email || (u.hasFacebook ? 'Facebook' : ''))}${u.demo ? ' · demo' : ''}</div>`
    : `<b>${L('Not signed in', 'உள்நுழையவில்லை')}</b><div class="muted small">${L('Sign in to back up your family', 'குடும்ப விவரங்களைப் பாதுகாக்க உள்நுழையவும்')}</div>`}</div>
      ${u ? `<button class="chip-btn" id="signOut">${L('Sign out', 'வெளியேறு')}</button>` : `<button class="chip-btn" data-go="login">${L('Sign in', 'உள்நுழை')}</button>`}</div>
    <button class="premium-cta" data-go="plans">${iconChip('plans', { size: 20, cls: 'mi-icon' })}${L(`${BRAND.premiumEn} & ${BRAND.familyEn}`, `${BRAND.premiumTa} & ${BRAND.familyTa}`)} ›</button>
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
      <button data-go="privacy">${iconChip('privacy', { size: 20, cls: 'mi-icon' })}<span>${L('Privacy & data — consent, export, delete', 'தனியுரிமை & தரவு — அனுமதி, ஏற்றுமதி, நீக்கம்')}</span></button>
      <button data-go="why">${iconChip('why', { size: 20, cls: 'mi-icon' })}<span>${L('How Thunai reads your chart', 'துணை ஜாதகத்தைப் படிக்கும் முறை')}</span></button>
      <button data-go="calc">${iconChip('calc', { size: 20, cls: 'mi-icon' })}<span>${L('Calculation methods', 'கணிப்பு முறைகள்')}</span></button>
      <button data-go="legal">${iconChip('legal', { size: 20, cls: 'mi-icon' })}<span>${L('Terms, renewals, cancellation & refunds', 'விதிமுறைகள், புதுப்பித்தல், ரத்து, பணத்திருப்பம்')}</span></button>
      <button data-go="feedback">${iconChip('feedback', { size: 20, cls: 'mi-icon' })}<span>${L('Rate & comment', 'மதிப்பீடு & கருத்து')}</span></button>
      <button data-go="invite">${iconChip('invite', { size: 20, cls: 'mi-icon' })}<span>${L('Invite family', 'குடும்பத்தினரை அழை')}</span></button>
      <button data-go="about">${iconChip('about', { size: 20, cls: 'mi-icon' })}<span>${L(`About ${BRAND.name}`, `${BRAND.nameTa} பற்றி`)}</span></button>
    </div>
    ${supportCard()}
    ${isAdmin() ? `<div class="menu list"><button class="row" data-go="admin">${iconChip('admin', { size: 20, cls: 'mi-icon' })}<span class="row-txt"><span class="row-name">${L('Owner dashboard', 'உரிமையாளர் டாஷ்போர்டு')}</span></span></button></div>` : ''}
    ${copyright()}`;
  $('#signOut')?.addEventListener('click', signOut);
  $$('[data-lang]', sec).forEach((b) => b.addEventListener('click', () => { state.lang = b.dataset.lang; store.set('kj_lang', state.lang); document.dispatchEvent(new Event('kj:lang')); }));
  $$('[data-theme-set]', sec).forEach((b) => b.addEventListener('click', () => { state.settings.theme = b.dataset.themeSet; saveSettings(); renderMore(sec); }));
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
    ['🔭', 'Precise to the second', 'நொடி துல்லியம்', 'Planet positions from an astronomy engine with the Lahiri ayanamsa. Astronomical accuracy does not prove predictions — it only makes the inputs right.', 'தொழில்முறை வானியல் கணிப்பு, லாஹிரி அயனாம்சம் — சரியான இடம், நொடிக்கு.'],
    ['👨‍👩‍👧', 'Made for families', 'குடும்பத்திற்காக', 'All your family\'s charts together: who should be careful today, muhurthams that suit everyone, star birthdays and ancestors\' thivasam.', 'குடும்பத்தினர் அனைவரின் ஜாதகமும் ஒன்றாக: இன்று யார் கவனமாக இருக்க வேண்டும், அனைவருக்கும் ஏற்ற முகூர்த்தம், நட்சத்திரப் பிறந்தநாள், முன்னோர் திவசம்.'],
    ['💬', 'A Jothidar who listens', 'கேட்கும் ஜோதிடர்', 'Talk in Tamil or English, by voice or text. Answers come from your own chart and today’s sky.', 'தமிழ் அல்லது ஆங்கிலத்தில், குரல் அல்லது எழுத்தில் பேசுங்கள். உங்கள் ஜாதகம், இன்றைய வானம் அடிப்படையில் பதில் கிடைக்கும்.'],
    ['🪔', 'Free parigaram first', 'இலவச பரிகாரம் முதலில்', 'Prayer, a lamp, charity, feeding animals, respecting elders — remedies anyone can do, every day.', 'வழிபாடு, தீபம், தானம், உயிர்களுக்கு உணவு, பெரியோரை மதித்தல் — யாரும் தினமும் செய்யக்கூடியவை.'],
    ['🔒', 'Private by design', 'தனியுரிமை', 'Birth details stay on your phone unless you sign in to back them up. We never sell your data.', 'உள்நுழைந்து பாதுகாக்கும் வரை பிறப்பு விவரங்கள் உங்கள் கைப்பேசியிலேயே இருக்கும். உங்கள் தரவை விற்பதில்லை.'],
  ];
  sec.innerHTML = `${subHeader(L(`About ${BRAND.name}`, `${BRAND.nameTa} பற்றி`), L(BRAND.descriptorEn, BRAND.taglineTa), 'more')}
    ${P.map(([i, en, tx, den, dta]) => `<div class="card glass about-row"><span class="ti-icon">${i}</span><div><b>${L(en, tx)}</b><p>${L(den, dta)}</p></div></div>`).join('')}
    <div id="aboutTesti"></div>
    <div class="brand-foot"><img src="logo.svg" alt="" width="64" height="64"><div><b>${BRAND.nameTa} · ${BRAND.nameUpper}</b><span class="slogan-sm">${BRAND.taglineTa}</span></div></div>
    <p class="build-no" id="buildNo" title="${esc(L('For support', 'உதவிக்கு'))}">${esc(window.KJ_BUILD || 'dev')}</p>
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
