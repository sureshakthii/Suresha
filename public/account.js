// Account: login (mobile OTP, email OTP, Facebook), family profiles and settings.
import { searchLocalPlaces } from './shared/places.js';
import { icon, iconChip } from './icons.js';
import {
  state, $, $$, L, ta, esc, bi, api, STATIC, store, go, registerScreen, subHeader, saveFamily, saveSettings, setLoc,
  toast, RELATIONS, chartOf, nakName, rasiName, displayName, copyright,
  placeName, lagnaText, precisionOf, memberAge,
} from './core.js';
import { isValidZone } from './shared/datetime.js';
import { toolTiles } from './screens-main.js';

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
        ${login.channel === 'sms' ? `<div class="phone-in"><span>+91</span><input id="loginTo" type="tel" inputmode="numeric" autocomplete="tel-national" maxlength="15" placeholder="98765 43210" required></div>`
    : '<input id="loginTo" type="email" autocomplete="email" required placeholder="name@example.com">'}</label>
        <button class="btn-gold" id="sendOtp">${L('Send OTP', 'OTP அனுப்பு')}</button>
        <button type="button" class="link-btn center-block" data-step="choose">‹ ${L('Other ways to sign in', 'வேறு வழிகள்')}</button>
        <p class="err" id="loginErr"></p></form>`;
  } else if (login.step === 'otp') {
    body = `<form id="otpForm"><p class="center">${L('Enter the 6-digit code sent to', '6 இலக்க குறியீடு அனுப்பப்பட்டது')} <b>${esc(login.masked || login.to)}</b></p>
        <div class="otp-boxes">${[0, 1, 2, 3, 4, 5].map((i) => `<input class="otp" inputmode="numeric" maxlength="1" aria-label="${esc(L(`Digit ${i + 1}`, `இலக்கம் ${i + 1}`))}" data-i="${i}">`).join('')}</div>
        ${login.devCode ? `<p class="demo-note">🧪 ${STATIC ? L('Demo mode — no SMS is sent.', 'டெமோ — SMS அனுப்பப்படாது.') : L('Test mode — SMS provider not configured.', 'சோதனை முறை — SMS சேவை அமைக்கப்படவில்லை.')} ${L('Your code', 'உங்கள் குறியீடு')}: <b>${esc(login.devCode)}</b></p>` : ''}
        <label>${L('Your name (for new accounts)', 'உங்கள் பெயர் (புதிய கணக்கிற்கு)')}<input id="loginName" maxlength="60" autocomplete="name"></label>
        <button class="btn-gold" id="verifyOtp">${L('Verify & sign in', 'சரிபார்த்து உள்நுழை')}</button>
        <button type="button" class="link-btn center-block" id="resend" disabled>${L('Resend code', 'மீண்டும் அனுப்பு')}</button>
        <p class="err" id="loginErr"></p></form>`;
  }
  sec.innerHTML = `<div class="login-wrap">
      <img src="logo.svg" alt="" width="96" height="96" class="login-logo">
      <h1 class="brand-ta small">துணை</h1>
      ${ta() ? '' : '<p class="brand-en small">Thunai</p>'}
      <p class="muted center">${L('Sign in to keep your family\'s charts safe and available on every phone.', 'உங்கள் குடும்ப ஜாதகங்களைப் பாதுகாப்பாக எல்லா கைப்பேசியிலும் பெற உள்நுழையவும்.')}</p>
      <div class="card glass login-card">${body}</div>
      <button class="link-btn center-block" id="skipLogin">${L('Continue without signing in', 'உள்நுழையாமல் தொடரவும்')} ›</button>
      ${copyright()}
      <p class="muted small center">${L('By continuing you agree to use astrology as guidance, not as a substitute for medical, legal or financial advice.', 'ஜோதிடம் வழிகாட்டுதல் மட்டுமே; மருத்துவ, சட்ட, நிதி ஆலோசனைக்கு மாற்றல்ல என்பதை ஏற்கிறீர்கள்.')}</p>
    </div>`;
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
    const v = $('#loginTo').value.trim();
    login.to = login.channel === 'sms' && /^\d{10}$/.test(v.replace(/\s/g, '')) ? `+91${v.replace(/\s/g, '')}` : v.replace(/\s/g, '');
  }
  const err = $('#loginErr');
  try {
    if (STATIC) {
      if (login.channel === 'sms' && !/^\+?\d{10,15}$/.test(login.to)) throw new Error(L('Please enter a valid 10-digit mobile number', 'சரியான 10 இலக்க மொபைல் எண்ணை உள்ளிடவும்'));
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

export function placeSearch(input, list, onPick) {
  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    const q = input.value.trim();
    if (q.length < 2) { list.hidden = true; return; }
    timer = setTimeout(async () => {
      let places = searchLocalPlaces(q);
      if (!STATIC && places.length < 3) { try { places = await api(`/api/places?q=${encodeURIComponent(q)}`); } catch { /* keep local */ } }
      list.innerHTML = places.map((p, i) => `<li tabindex="0" data-i="${i}">${esc(p.name)} <small>${esc(p.region)} · UTC${p.tz >= 0 ? '+' : ''}${p.tz}</small></li>`).join('');
      list.hidden = !places.length;
      $$('li', list).forEach((li) => {
        const pick = () => { onPick(places[li.dataset.i]); list.hidden = true; };
        li.addEventListener('click', pick);
        li.addEventListener('keydown', (e) => { if (e.key === 'Enter') pick(); });
      });
    }, 200);
  });
}

/** Common IANA zones (brief §2). "Other" lets the family type any valid IANA name. */
export const ZONES = ['Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Asia/Kuala_Lumpur', 'Asia/Colombo', 'Europe/London', 'America/New_York', 'America/Los_Angeles', 'Australia/Sydney'];
/** Best-guess IANA zone for a picked place (the family can change it). */
export function zoneForPlace(p) {
  const r = String(p?.region || '').toLowerCase();
  const tz = Number(p?.tz);
  if (/sri lanka/.test(r)) return 'Asia/Colombo';
  if (/malaysia/.test(r)) return 'Asia/Kuala_Lumpur';
  if (/singapore/.test(r)) return 'Asia/Singapore';
  if (/uae|emirates|dubai/.test(r)) return 'Asia/Dubai';
  if (/united kingdom|england|uk\b/.test(r)) return 'Europe/London';
  if (/australia/.test(r)) return 'Australia/Sydney';
  if (tz === 5.5) return 'Asia/Kolkata';
  if (tz === 4) return 'Asia/Dubai';
  if (tz === 8) return 'Asia/Singapore';
  if (tz === 0 || tz === 1) return 'Europe/London';
  if (tz === -5 || tz === -4) return 'America/New_York';
  if (tz === -8 || tz === -7) return 'America/Los_Angeles';
  if (tz === 10 || tz === 11) return 'Australia/Sydney';
  return '';
}

function memberForm(m, first) {
  const prec = precisionOf(m.date ? m : { time: true, ...m });
  const zone = m.zone || '';
  const zoneIsOther = zone && !ZONES.includes(zone);
  return `<form id="memberForm" autocomplete="off">
    <div class="row2"><label>${L('Name', 'பெயர்')}<input name="name" required maxlength="60" value="${esc(m.name || '')}"></label>
      <label>${L('Name in Tamil (optional)', 'தமிழில் பெயர் (விருப்பம்)')}<input name="nameTa" maxlength="60" lang="ta" placeholder="சுரேஷ்" value="${esc(m.nameTa || '')}"></label></div>
    <p class="muted small">${L('For a company or team, choose "Company / Team" and enter its founding (incorporation) date, time and place.', 'நிறுவனம் / குழுவிற்கு "நிறுவனம் / குழு" தேர்வு செய்து, தொடங்கிய தேதி, நேரம், இடம் உள்ளிடவும்.')}</p>
    <div class="row2">
      <label>${L('Relation', 'உறவு')}<select name="relation">${RELATIONS.map((r) => `<option value="${r.id}"${(m.relation || (first ? 'self' : 'other')) === r.id ? ' selected' : ''}>${esc(bi(r))}</option>`).join('')}</select></label>
      <label>${L('Gender', 'பாலினம்')}<select name="gender">${[['male', 'Male', 'ஆண்'], ['female', 'Female', 'பெண்']].map(([id, en, tx]) => `<option value="${id}"${m.gender === id ? ' selected' : ''}>${L(en, tx)}</option>`).join('')}</select></label>
    </div>
    <label>${L('Date of birth', 'பிறந்த தேதி')}<input name="date" type="date" required value="${esc(m.date || '')}"></label>
    <fieldset class="seg-field"><legend>${L('How sure is the birth time?', 'பிறந்த நேரம் எவ்வளவு உறுதி?')}</legend>
      <div class="seg" role="radiogroup">${[['exact', 'Exact', 'சரியானது'], ['approximate', 'Approximate', 'தோராயம்'], ['unknown', 'Unknown', 'தெரியாது']].map(([id, en, tx]) => `<label class="seg-opt${prec === id ? ' sel' : ''}"><input type="radio" name="timePrecision" value="${id}"${prec === id ? ' checked' : ''}> ${L(en, tx)}</label>`).join('')}</div></fieldset>
    <label id="timeRow"${prec === 'unknown' ? ' hidden' : ''}>${L('Time of birth', 'பிறந்த நேரம்')}<input name="time" type="time" step="1"${prec === 'unknown' ? '' : ' required'} value="${esc(m.time || '')}"></label>
    <p class="muted small" id="precHelp">${prec === 'unknown' ? L('No Lagna or houses will be calculated — only Moon-based details. You can add the time later.', 'லக்னமும் பாவங்களும் கணிக்கப்படாது — சந்திரன் சார்ந்த விவரங்கள் மட்டும். நேரத்தைப் பின்னர் சேர்க்கலாம்.') : prec === 'approximate' ? L('Items that could change within ±30 minutes will be marked "unstable".', '±30 நிமிடத்தில் மாறக்கூடியவை "நிலையற்றது" எனக் குறிக்கப்படும்.') : ''}</p>
    <label class="place-wrap">${L('Place of birth', 'பிறந்த இடம்')}<input name="place" required placeholder="Chennai" value="${esc(m.place || '')}"><ul id="placeList" class="suggest" hidden></ul></label>
    <label>${L('Time zone at birth', 'பிறந்த இடத்தின் நேர மண்டலம்')}<select name="zoneSel">${ZONES.map((z) => `<option value="${z}"${zone === z ? ' selected' : ''}>${z}</option>`).join('')}<option value="other"${zoneIsOther ? ' selected' : ''}>${L('Other…', 'மற்றவை…')}</option><option value=""${!zone ? ' selected' : ''}>${L('Fixed UTC offset (below)', 'நிலையான UTC வேறுபாடு (கீழே)')}</option></select></label>
    <label id="zoneOtherRow"${zoneIsOther ? '' : ' hidden'}>${L('IANA time zone (e.g. Europe/Paris)', 'IANA நேர மண்டலம் (உ.தா. Europe/Paris)')}<input name="zoneOther" value="${esc(zoneIsOther ? zone : '')}" autocapitalize="off" spellcheck="false"></label>
    <div class="row3">
      <label>${L('Latitude', 'அட்சரேகை')}<input name="lat" type="number" step="0.0001" required value="${m.lat ?? ''}"></label>
      <label>${L('Longitude', 'தீர்க்கரேகை')}<input name="lon" type="number" step="0.0001" required value="${m.lon ?? ''}"></label>
      <label>${L('UTC offset', 'UTC வேறுபாடு')}<input name="tz" type="number" step="0.25" required value="${m.tz ?? 5.5}"></label>
    </div>
    <p class="muted small">${L('The time zone handles historical offsets and daylight saving; the UTC offset is used only when no zone is chosen.', 'நேர மண்டலம் பழைய நேர வேறுபாடுகளையும் பகல் சேமிப்பு நேரத்தையும் கணக்கில் கொள்ளும்; மண்டலம் இல்லாதபோது மட்டும் UTC வேறுபாடு பயன்படும்.')}</p>
    <button class="btn-gold" type="submit">✨ ${first ? L('Create my Jathagam', 'என் ஜாதகம் உருவாக்கு') : L('Save', 'சேமி')}</button>
    ${m.id && state.family.length > 1 ? `<button type="button" class="link-btn danger center-block" id="delMember">${L('Delete this person', 'இவரை நீக்கு')}</button>` : ''}
    <p class="err" id="formErr" role="alert"></p></form>`;
}

const FAMILY_TOOLS = [
  ['matching', 'Marriage matching (both adults consent)', 'திருமணப் பொருத்தம் (இருவர் ஒப்புதலுடன்)'],
  ['porutham', 'Quick star match', 'விரைவு நட்சத்திரப் பொருத்தம்'],
  ['gunamilan', '36 Guna Milan (North Indian)', '36 குண மிலன் (வட இந்திய முறை)'],
  ['couple', 'Married life — traditional reading', 'திருமண வாழ்க்கை — மரபுப் பார்வை'],
  ['partners', 'Business partner match', 'வணிகக் கூட்டாளி பொருத்தம்'],
  ['relations', 'Family relations today', 'இன்று குடும்ப உறவு'],
  ['starbday', 'Star birthdays & milestones', 'நட்சத்திரப் பிறந்தநாள் & விழாக்கள்'],
  ['thivasam', 'Thivasam & Tharpanam', 'திவசம் & தர்ப்பணம்'],
  ['names', 'Baby names', 'குழந்தை பெயர்கள்'],
];

function renderFamily(sec, params = {}) {
  if (params.add) editing = { name: params.name || state.user?.name || '' };
  else if (params.edit) editing = { ...state.family.find((m) => m.id === params.edit) };
  const first = params.first || !state.family.length;
  if (editing) {
    sec.innerHTML = `${first ? '' : subHeader(editing.id ? L('Edit details', 'விவரம் திருத்து') : L('Add a family member', 'குடும்ப உறுப்பினர் சேர்'), '', 'family')}
      <div class="card glass hero-card">${first ? `<h2>${L('Your birth details', 'உங்கள் பிறப்பு விவரங்கள்')}</h2><p class="muted">${L('Enter the exact date, time and place of birth. Everything is calculated for this precise moment.', 'சரியான பிறந்த தேதி, நேரம், இடம் உள்ளிடவும். அந்தத் துல்லியமான நொடிக்கே கணிக்கப்படும்.')}</p>` : ''}
      ${memberForm(editing, first)}</div>`;
    const f = $('#memberForm');
    placeSearch(f.elements.place, $('#placeList'), (p) => {
      f.elements.place.value = p.name; f.elements.lat.value = p.lat; f.elements.lon.value = p.lon; f.elements.tz.value = p.tz;
      const z = zoneForPlace(p);
      f.elements.zoneSel.value = z || '';
      $('#zoneOtherRow').hidden = true;
    });
    const syncPrecision = () => {
      const v = f.elements.timePrecision.value;
      $('#timeRow').hidden = v === 'unknown';
      f.elements.time.required = v !== 'unknown';
      $$('.seg-opt', f).forEach((o) => o.classList.toggle('sel', o.querySelector('input').checked));
      $('#precHelp').textContent = v === 'unknown' ? L('No Lagna or houses will be calculated — only Moon-based details. You can add the time later.', 'லக்னமும் பாவங்களும் கணிக்கப்படாது — சந்திரன் சார்ந்த விவரங்கள் மட்டும். நேரத்தைப் பின்னர் சேர்க்கலாம்.') : v === 'approximate' ? L('Items that could change within ±30 minutes will be marked "unstable".', '±30 நிமிடத்தில் மாறக்கூடியவை "நிலையற்றது" எனக் குறிக்கப்படும்.') : '';
    };
    $$('input[name="timePrecision"]', f).forEach((r) => r.addEventListener('change', syncPrecision));
    f.elements.zoneSel.addEventListener('change', () => { $('#zoneOtherRow').hidden = f.elements.zoneSel.value !== 'other'; });
    f.addEventListener('submit', (e) => { e.preventDefault(); saveMember(f); });
    $('#delMember')?.addEventListener('click', () => {
      state.family = state.family.filter((x) => x.id !== editing.id);
      if (state.activeId === editing.id) state.activeId = state.family[0]?.id || null;
      editing = null; saveFamily(); go('family');
    });
    return;
  }
  sec.innerHTML = `<h2 class="screen-title">${L('Family', 'குடும்பம்')}</h2><p class="muted small">${L('Everyone\'s charts in one place. Adding a relative does not share their details with anyone.', 'அனைவரின் ஜாதகமும் ஒரே இடத்தில். உறவினரைச் சேர்ப்பதால் அவர்கள் விவரம் யாருடனும் பகிரப்படாது.')}</p>
    ${state.family.map((m) => { const c = chartOf(m); const age = memberAge(m); const prec = precisionOf(m); return `<div class="card glass fam-card${m.id === state.activeId ? ' active' : ''}">
      <span class="avatar" aria-hidden="true">${esc(([...displayName(m)][0] || '').toUpperCase())}</span>
      <div style="flex:1"><b>${esc(displayName(m))}</b> <span class="pill">${esc(bi(RELATIONS.find((r) => r.id === m.relation) || RELATIONS[6]))}</span>${age != null && m.relation !== 'organization' ? ` <span class="pill">${L(`${age} yrs`, `${age} வயது`)}</span>` : ''}
        <div class="muted small">${esc(m.date)} · ${prec === 'unknown' ? L('time unknown', 'நேரம் தெரியாது') : `${esc(String(m.time || '').slice(0, 5))}${prec === 'approximate' ? ` (${L('approx.', 'தோராயம்')})` : ''}`} · ${esc(placeName(m.place))}${m.zone ? ` · ${esc(m.zone)}` : ''}</div>
        <div class="small">${esc(nakName(c.janmaNakshatra.index))} · ${esc(rasiName(c.janmaRasi.index))} · ${L('Lagnam', 'லக்னம்')} ${esc(lagnaText(c))}</div>
        ${m.kulaDeivam ? `<div class="small muted">🛕 ${L('Kula Deivam', 'குலதெய்வம்')}: ${esc(m.kulaDeivam)}</div>` : ''}</div>
      <div class="fam-actions">${m.id === state.activeId ? `<span class="tag good">${L('Active', 'தேர்வு')}</span>` : `<button class="chip-btn" data-use="${esc(m.id)}">${L('Use', 'தேர்வு')}</button>`}
        <button class="link-btn" data-edit="${esc(m.id)}">${L('Edit', 'திருத்து')}</button></div></div>`; }).join('')}
    <button class="btn-gold" id="addMember">➕ ${L('Add family member', 'குடும்ப உறுப்பினர் சேர்')}</button>
    ${state.user ? '' : `<p class="muted small center">${L('Sign in to back up your family and use it on other phones.', 'குடும்ப விவரங்களைப் பாதுகாக்க, பிற கைப்பேசிகளில் பயன்படுத்த உள்நுழையவும்.')}</p>`}
    <div class="section-title">${L('For the family', 'குடும்பத்திற்கு')}</div>
    ${toolTiles(FAMILY_TOOLS)}`;
  $$('[data-use]', sec).forEach((b) => b.addEventListener('click', () => { state.activeId = b.dataset.use; saveFamily(); renderFamily(sec); }));
  $$('[data-edit]', sec).forEach((b) => b.addEventListener('click', () => go('family', { edit: b.dataset.edit })));
  $('#addMember').addEventListener('click', () => go('family', { add: true }));
}

function saveMember(f) {
  const timePrecision = f.elements.timePrecision.value || 'exact';
  const raw = timePrecision === 'unknown' ? '' : f.elements.time.value;
  const time = raw && raw.length === 5 ? `${raw}:00` : raw;
  const zoneSel = f.elements.zoneSel.value;
  const zone = zoneSel === 'other' ? f.elements.zoneOther.value.trim() : zoneSel;
  if (zone && !isValidZone(zone)) { $('#formErr').textContent = L('That time zone name is not recognised — e.g. Asia/Kolkata or Europe/Paris.', 'அந்த நேர மண்டலப் பெயர் அடையாளம் காணப்படவில்லை — உ.தா. Asia/Kolkata அல்லது Europe/Paris.'); return; }
  if (timePrecision !== 'unknown' && !time) { $('#formErr').textContent = L('Please enter the birth time, or choose "Unknown".', 'பிறந்த நேரத்தை உள்ளிடவும் அல்லது "தெரியாது" தேர்வு செய்யவும்.'); return; }
  const m = {
    ...(editing.id ? state.family.find((x) => x.id === editing.id) : {}),
    id: editing.id || Math.random().toString(36).slice(2, 10),
    name: f.elements.name.value.trim(), nameTa: f.elements.nameTa.value.trim() || undefined, relation: f.elements.relation.value, gender: f.elements.gender.value,
    date: f.elements.date.value, time, timePrecision, zone: zone || undefined, place: f.elements.place.value.trim(),
    lat: Number(f.elements.lat.value), lon: Number(f.elements.lon.value), tz: Number(f.elements.tz.value),
  };
  if (!m.lat && !m.lon) { $('#formErr').textContent = L('Please pick the place from the list, or enter latitude and longitude.', 'பட்டியலிலிருந்து இடத்தைத் தேர்வு செய்யவும் அல்லது அட்சரேகை, தீர்க்கரேகை உள்ளிடவும்.'); return; }
  const i = state.family.findIndex((x) => x.id === m.id);
  if (i >= 0) state.family[i] = m; else state.family.push(m);
  const firstEver = state.family.length === 1;
  if (firstEver || !state.activeId) state.activeId = m.id;
  if (firstEver || !state.loc) setLoc({ lat: m.lat, lon: m.lon, tz: m.tz, name: m.place });
  editing = null;
  saveFamily();
  toast(L('Saved', 'சேமிக்கப்பட்டது'));
  go(firstEver ? 'home' : 'family');
}
registerScreen('family', { render: renderFamily });

// ================================================================ MORE / SETTINGS
function renderMore(sec) {
  const u = state.user;
  sec.innerHTML = `<div class="card glass account-card">
      <span class="avatar big">${esc(u?.name ? [...u.name][0].toUpperCase() : '🙏')}</span>
      <div style="flex:1">${u ? `<b>${esc(displayName(state.family.find((m) => m.relation === 'self')) || u.name || L('Signed in', 'உள்நுழைந்துள்ளீர்கள்'))}</b><div class="muted small">${esc(u.phone || u.email || (u.hasFacebook ? 'Facebook' : ''))}${u.demo ? ' · demo' : ''}</div>`
    : `<b>${L('Not signed in', 'உள்நுழையவில்லை')}</b><div class="muted small">${L('Sign in to back up your family', 'குடும்ப விவரங்களைப் பாதுகாக்க உள்நுழையவும்')}</div>`}</div>
      ${u ? `<button class="chip-btn" id="signOut">${L('Sign out', 'வெளியேறு')}</button>` : `<button class="chip-btn" data-go="login">${L('Sign in', 'உள்நுழை')}</button>`}</div>
    <h2 class="screen-title">${L('Profile & settings', 'சுயவிவரம் & அமைப்புகள்')}</h2>
    <button class="premium-cta" data-go="plans">${iconChip('plans', { size: 20, cls: 'mi-icon' })}${L('Thunai Premium — for your whole family', 'துணை பிரீமியம் — முழு குடும்பத்திற்கும்')} ›</button>
    <div class="menu">
      <button data-go="family">${iconChip('family', { size: 20, cls: 'mi-icon' })}<span>${L('Family members', 'குடும்ப உறுப்பினர்கள்')}</span></button>
      <button data-go="invite">${iconChip('invite', { size: 20, cls: 'mi-icon' })}<span>${L('Invite family & get free days', 'அழைத்து இலவச நாட்கள் பெறுங்கள்')}</span></button>
      <button data-go="feedback">${iconChip('feedback', { size: 20, cls: 'mi-icon' })}<span>${L('Rate & comment', 'மதிப்பீடு & கருத்து')}</span></button>
      <button data-go="legal">${iconChip('legal', { size: 20, cls: 'mi-icon' })}<span>${L('Privacy, terms & refunds', 'தனியுரிமை, விதிமுறைகள், பணத்திருப்பம்')}</span></button>
      <button data-go="about">${iconChip('about', { size: 20, cls: 'mi-icon' })}<span>${L('About Thunai', 'துணை பற்றி')}</span></button>
    </div>
    <button class="link-btn center-block" data-go="admin">${icon('shield-check', { size: 16 })} ${L('Owner dashboard', 'உரிமையாளர் டாஷ்போர்டு')}</button>
    <div class="card glass settings">
      <div class="card-title">${L('Settings', 'அமைப்புகள்')}</div>
      <div class="set-row"><span>${L('Language', 'மொழி')}</span><div class="seg"><button data-lang="ta" class="${ta() ? 'sel' : ''}">தமிழ்</button><button data-lang="en" class="${ta() ? '' : 'sel'}">English</button></div></div>
      <div class="set-row"><span>${L('Appearance', 'தோற்றம்')}</span><div class="seg">${[['light', 'Day', 'பகல்'], ['dark', 'Night', 'இரவு'], ['auto', 'Auto', 'தானியங்கி']].map(([id, en, tx]) => `<button data-theme-set="${id}" class="${(state.settings.theme || 'light') === id ? 'sel' : ''}">${L(en, tx)}</button>`).join('')}</div></div>
      <label class="set-row"><span>${L('Large text (for elders)', 'பெரிய எழுத்து (பெரியோருக்கு)')}</span><input type="checkbox" id="setLarge"${state.settings.large ? ' checked' : ''}></label>
      <label class="set-row"><span>${L('Read answers aloud', 'பதில்களை வாசித்துக்காட்டு')}</span><input type="checkbox" id="setVoice"${state.settings.voice ? ' checked' : ''}></label>
      <div class="set-row col"><span>${L('Location for today\'s timings', 'இன்றைய நேரங்களுக்கான இடம்')}: <b>${esc(placeName(state.loc?.name) || '—')}</b></span>
        <label class="place-wrap"><input id="locSearch" placeholder="${esc(L('Search a city…', 'நகரத்தைத் தேடுக…'))}"><ul id="locList" class="suggest" hidden></ul></label>
        ${STATIC ? '' : `<button class="link-btn" id="geoBtn">📍 ${L('Use my current location', 'என் தற்போதைய இருப்பிடம்')}</button>`}</div>
    </div>`;
  $('#signOut')?.addEventListener('click', signOut);
  $$('[data-lang]', sec).forEach((b) => b.addEventListener('click', () => { state.lang = b.dataset.lang; store.set('kj_lang', state.lang); document.dispatchEvent(new Event('kj:lang')); }));
  $$('[data-theme-set]', sec).forEach((b) => b.addEventListener('click', () => { state.settings.theme = b.dataset.themeSet; saveSettings(); renderMore(sec); }));
  $('#setLarge').addEventListener('change', (e) => { state.settings.large = e.target.checked; saveSettings(); });
  $('#setVoice').addEventListener('change', (e) => { state.settings.voice = e.target.checked; saveSettings(); });
  placeSearch($('#locSearch'), $('#locList'), (p) => { setLoc({ lat: p.lat, lon: p.lon, tz: p.tz, name: p.name }); toast(`📍 ${p.name}`); renderMore(sec); });
  $('#geoBtn')?.addEventListener('click', () => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => { setLoc({ lat: pos.coords.latitude, lon: pos.coords.longitude, tz: -new Date().getTimezoneOffset() / 60, name: L('Current location', 'தற்போதைய இருப்பிடம்') }); renderMore(sec); },
      () => toast(L('Location unavailable', 'இருப்பிடம் கிடைக்கவில்லை')), { timeout: 8000 },
    );
  });
}
registerScreen('more', { render: renderMore });

function renderAbout(sec) {
  const P = [
    ['🧭', 'Honest astrology', 'நேர்மையான ஜோதிடம்', 'No fear, no death predictions, no pressure to buy costly poojas or gems. Astrology shows tendencies and timing; your effort and dharma shape the result.', 'பயமுறுத்தல் இல்லை, மரண கணிப்பு இல்லை, விலையுயர்ந்த பூஜை/ரத்தினம் வாங்க அழுத்தம் இல்லை. ஜோதிடம் போக்கையும் நேரத்தையும் காட்டும்; முயற்சியும் தர்மமும் பலனைத் தீர்மானிக்கும்.'],
    ['🔍', 'See the calculation', 'கணக்கைப் பாருங்கள்', 'Every answer lists the real factors — Horai, Tara Bala, Rahu Kalam, Prasna Lagna — with points. Nothing is hidden.', 'ஒவ்வொரு பதிலிலும் ஓரை, தாரா பலம், ராகு காலம், பிரசன்ன லக்னம் போன்ற உண்மையான காரணிகள் மதிப்புடன் காட்டப்படும்.'],
    ['🔭', 'Documented calculation', 'ஆவணப்படுத்திய கணிப்பு', 'Planet positions from a professional astronomy engine (about ±1 arcminute) with the Lahiri ayanamsa. Every chart report shows its settings.', 'தொழில்முறை வானியல் கணிப்பு (சுமார் ±1 கலை), லாஹிரி அயனாம்சம். ஒவ்வொரு ஜாதக அறிக்கையும் அதன் அமைப்புகளைக் காட்டும்.'],
    ['👨‍👩‍👧', 'Made for families', 'குடும்பத்திற்காக', 'All your family\'s charts together: who should be careful today, muhurthams that suit everyone, star birthdays and ancestors\' thivasam.', 'குடும்பத்தினர் அனைவரின் ஜாதகமும் ஒன்றாக: இன்று யார் கவனமாக இருக்க வேண்டும், அனைவருக்கும் ஏற்ற முகூர்த்தம், நட்சத்திரப் பிறந்தநாள், முன்னோர் திவசம்.'],
    ['💬', 'Ask Thunai — a companion who listens', 'துணையிடம் கேளுங்கள் — கேட்கும் துணை', 'Talk in Tamil or English, by voice or text. Answers use your own chart and today\'s sky as traditional context — and real-life needs come first.', 'தமிழ் அல்லது ஆங்கிலத்தில், குரல் அல்லது எழுத்தில் பேசுங்கள். உங்கள் ஜாதகம், இன்றைய வானம் மரபுப் பின்னணியாக; நிஜ வாழ்க்கைத் தேவைகளே முதன்மை.'],
    ['🪔', 'Free parigaram first', 'இலவச பரிகாரம் முதலில்', 'Prayer, a lamp, charity, feeding animals, respecting elders — remedies anyone can do, every day.', 'வழிபாடு, தீபம், தானம், உயிர்களுக்கு உணவு, பெரியோரை மதித்தல் — யாரும் தினமும் செய்யக்கூடியவை.'],
    ['🔒', 'Private by design', 'தனியுரிமை', 'Birth details stay on your phone unless you sign in to back them up. We never sell your data.', 'உள்நுழைந்து பாதுகாக்கும் வரை பிறப்பு விவரங்கள் உங்கள் கைப்பேசியிலேயே இருக்கும். உங்கள் தரவை விற்பதில்லை.'],
  ];
  sec.innerHTML = `${subHeader(L('About Thunai', 'துணை பற்றி'), L('A Tamil-first companion for traditional astrology, calendars and practical family planning', 'மரபு ஜோதிடம், நாட்காட்டி, நடைமுறைக் குடும்பத் திட்டமிடலுக்கான தமிழ் முதன்மைத் துணை'), 'more')}
    ${P.map(([i, en, tx, den, dta]) => `<div class="card glass about-row"><span class="ti-icon">${i}</span><div><b>${L(en, tx)}</b><p>${L(den, dta)}</p></div></div>`).join('')}
    <div id="aboutTesti"></div>
    <div class="brand-foot"><img src="logo.svg" alt="" width="64" height="64"><div><b>துணை</b><span class="slogan-sm">உங்கள் வாழ்க்கையின் வழிகாட்டி</span>${ta() ? '' : '<span>Thunai</span>'}</div></div>
    ${copyright()}`;
  if (!STATIC) import('./growth.js').then((g) => g.loadTestimonials('#aboutTesti'));
}
registerScreen('about', { render: renderAbout, parent: 'more' });
