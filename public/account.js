// Account: login (mobile OTP, email OTP, Facebook), family profiles and settings.
import { searchLocalPlaces } from './shared/places.js';
import {
  state, $, $$, L, ta, esc, bi, api, STATIC, store, go, registerScreen, subHeader, saveFamily, saveSettings, setLoc,
  toast, RELATIONS, chartOf, nakName, rasiName, displayName, copyright,
  placeName,
} from './core.js';

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
        <div class="otp-boxes">${[0, 1, 2, 3, 4, 5].map((i) => `<input class="otp" inputmode="numeric" maxlength="1" aria-label="Digit ${i + 1}" data-i="${i}">`).join('')}</div>
        ${login.devCode ? `<p class="demo-note">🧪 ${STATIC ? L('Demo mode — no SMS is sent.', 'டெமோ — SMS அனுப்பப்படாது.') : L('Test mode — SMS provider not configured.', 'சோதனை முறை — SMS சேவை அமைக்கப்படவில்லை.')} ${L('Your code', 'உங்கள் குறியீடு')}: <b>${esc(login.devCode)}</b></p>` : ''}
        <label>${L('Your name (for new accounts)', 'உங்கள் பெயர் (புதிய கணக்கிற்கு)')}<input id="loginName" maxlength="60" autocomplete="name"></label>
        <button class="btn-gold" id="verifyOtp">${L('Verify & sign in', 'சரிபார்த்து உள்நுழை')}</button>
        <button type="button" class="link-btn center-block" id="resend" disabled>${L('Resend code', 'மீண்டும் அனுப்பு')}</button>
        <p class="err" id="loginErr"></p></form>`;
  }
  sec.innerHTML = `<div class="login-wrap">
      <img src="logo.svg" alt="" width="96" height="96" class="login-logo">
      <h1 class="brand-ta small">கைப்பேசி ஜோதிடர்</h1>
      ${ta() ? '' : '<p class="brand-en small">Kaippesi Jothidar</p>'}
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

function placeSearch(input, list, onPick) {
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
      <label>${L('Time of birth', 'பிறந்த நேரம்')}<input name="time" type="time" step="1" required value="${esc(m.time || '')}"></label>
    </div>
    <label class="place-wrap">${L('Place of birth', 'பிறந்த இடம்')}<input name="place" required placeholder="Chennai" value="${esc(m.place || '')}"><ul id="placeList" class="suggest" hidden></ul></label>
    <div class="row3">
      <label>${L('Latitude', 'அட்சரேகை')}<input name="lat" type="number" step="0.0001" required value="${m.lat ?? ''}"></label>
      <label>${L('Longitude', 'தீர்க்கரேகை')}<input name="lon" type="number" step="0.0001" required value="${m.lon ?? ''}"></label>
      <label>${L('UTC offset', 'நேர மண்டலம்')}<input name="tz" type="number" step="0.25" required value="${m.tz ?? 5.5}"></label>
    </div>
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
      <div class="card glass hero-card">${first ? `<h2>${L('Your birth details', 'உங்கள் பிறப்பு விவரங்கள்')}</h2><p class="muted">${L('Enter the exact date, time and place of birth. Everything is calculated for this precise moment.', 'சரியான பிறந்த தேதி, நேரம், இடம் உள்ளிடவும். அந்தத் துல்லியமான நொடிக்கே கணிக்கப்படும்.')}</p>` : ''}
      ${memberForm(editing, first)}</div>`;
    const f = $('#memberForm');
    placeSearch(f.elements.place, $('#placeList'), (p) => { f.elements.place.value = p.name; f.elements.lat.value = p.lat; f.elements.lon.value = p.lon; f.elements.tz.value = p.tz; });
    f.addEventListener('submit', (e) => { e.preventDefault(); saveMember(f); });
    $('#delMember')?.addEventListener('click', () => {
      state.family = state.family.filter((x) => x.id !== editing.id);
      if (state.activeId === editing.id) state.activeId = state.family[0]?.id || null;
      editing = null; saveFamily(); go('family');
    });
    return;
  }
  sec.innerHTML = `${subHeader(L('Family', 'குடும்பம்'), L('Everyone\'s charts in one place', 'அனைவரின் ஜாதகமும் ஒரே இடத்தில்'), 'more')}
    ${state.family.map((m) => { const c = chartOf(m); return `<div class="card glass fam-card${m.id === state.activeId ? ' active' : ''}">
      <span class="avatar">${esc(displayName(m).slice(0, 1).toUpperCase())}</span>
      <div style="flex:1"><b>${esc(displayName(m))}</b> <span class="pill">${esc(bi(RELATIONS.find((r) => r.id === m.relation) || RELATIONS[6]))}</span>
        <div class="muted small">${esc(m.date)} · ${esc(m.time.slice(0, 5))} · ${esc(placeName(m.place))}</div>
        <div class="small">${esc(nakName(c.janmaNakshatra.index))} · ${esc(rasiName(c.janmaRasi.index))} · ${L('Lagnam', 'லக்னம்')} ${esc(rasiName(c.lagna.rasi))}</div></div>
      <div class="fam-actions">${m.id === state.activeId ? `<span class="tag good">${L('Active', 'தேர்வு')}</span>` : `<button class="chip-btn" data-use="${esc(m.id)}">${L('Use', 'தேர்வு')}</button>`}
        <button class="link-btn" data-edit="${esc(m.id)}">${L('Edit', 'திருத்து')}</button></div></div>`; }).join('')}
    <button class="btn-gold" id="addMember">➕ ${L('Add family member', 'குடும்ப உறுப்பினர் சேர்')}</button>
    ${state.user ? '' : `<p class="muted small center">${L('Sign in to back up your family and use it on other phones.', 'குடும்ப விவரங்களைப் பாதுகாக்க, பிற கைப்பேசிகளில் பயன்படுத்த உள்நுழையவும்.')}</p>`}`;
  $$('[data-use]', sec).forEach((b) => b.addEventListener('click', () => { state.activeId = b.dataset.use; saveFamily(); renderFamily(sec); }));
  $$('[data-edit]', sec).forEach((b) => b.addEventListener('click', () => go('family', { edit: b.dataset.edit })));
  $('#addMember').addEventListener('click', () => go('family', { add: true }));
}

function saveMember(f) {
  const time = f.elements.time.value.length === 5 ? `${f.elements.time.value}:00` : f.elements.time.value;
  const m = {
    id: editing.id || Math.random().toString(36).slice(2, 10),
    name: f.elements.name.value.trim(), nameTa: f.elements.nameTa.value.trim() || undefined, relation: f.elements.relation.value, gender: f.elements.gender.value,
    date: f.elements.date.value, time, place: f.elements.place.value.trim(),
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
registerScreen('family', { render: renderFamily, parent: 'more' });

// ================================================================ MORE / SETTINGS
function renderMore(sec) {
  const u = state.user;
  sec.innerHTML = `<div class="card glass account-card">
      <span class="avatar big">${esc((u?.name || '🙏').slice(0, 1).toUpperCase())}</span>
      <div style="flex:1">${u ? `<b>${esc(displayName(state.family.find((m) => m.relation === 'self')) || u.name || L('Signed in', 'உள்நுழைந்துள்ளீர்கள்'))}</b><div class="muted small">${esc(u.phone || u.email || (u.hasFacebook ? 'Facebook' : ''))}${u.demo ? ' · demo' : ''}</div>`
    : `<b>${L('Not signed in', 'உள்நுழையவில்லை')}</b><div class="muted small">${L('Sign in to back up your family', 'குடும்ப விவரங்களைப் பாதுகாக்க உள்நுழையவும்')}</div>`}</div>
      ${u ? `<button class="chip-btn" id="signOut">${L('Sign out', 'வெளியேறு')}</button>` : `<button class="chip-btn" data-go="login">${L('Sign in', 'உள்நுழை')}</button>`}</div>
    <button class="premium-cta" data-go="plans">👑 ${L('Kaippesi Premium — for your whole family', 'கைப்பேசி பிரீமியம் — முழு குடும்பத்திற்கும்')} ›</button>
    <div class="menu">
      <button data-go="life">🔭 ${L('Life questions — when will it happen?', 'வாழ்க்கைக் கேள்விகள் — எப்போது?')}</button>
      <button data-go="family">👨‍👩‍👧 ${L('Family members', 'குடும்ப உறுப்பினர்கள்')}</button>
      <button data-go="calendar">📅 ${L('Tamil calendar', 'தமிழ் நாட்காட்டி')}</button>
      <button data-go="muhurtham">🗓️ ${L('Muhurtham finder', 'முகூர்த்தம் தேடல்')}</button>
      <button data-go="porutham">💞 ${L('Marriage matching', 'திருமணப் பொருத்தம்')}</button>
      <button data-go="parigaram">🪔 ${L('Parigaram', 'பரிகாரம்')}</button>
      <button data-go="temples">🛕 ${L('Navagraha temples', 'நவகிரக கோவில்கள்')}</button>
      <button data-go="packages">🧳 ${L('Yatra packages', 'யாத்திரை பேக்கேஜ்கள்')}</button>
      <button data-go="invite">🎁 ${L('Invite family & get free days', 'அழைத்து இலவச நாட்கள் பெறுங்கள்')}</button>
      <button data-go="feedback">⭐ ${L('Rate & comment', 'மதிப்பீடு & கருத்து')}</button>
      <button data-go="legal">📄 ${L('Privacy, terms & refunds', 'தனியுரிமை, விதிமுறைகள், பணத்திருப்பம்')}</button>
      <button data-go="about">🌿 ${L('Why Kaippesi Jothidar', 'ஏன் கைப்பேசி ஜோதிடர்')}</button>
    </div>
    <button class="link-btn center-block" data-go="admin">🔐 ${L('Owner dashboard', 'உரிமையாளர் டாஷ்போர்டு')}</button>
    <div class="card glass settings">
      <div class="card-title">${L('Settings', 'அமைப்புகள்')}</div>
      <div class="set-row"><span>${L('Language', 'மொழி')}</span><div class="seg"><button data-lang="ta" class="${ta() ? 'sel' : ''}">தமிழ்</button><button data-lang="en" class="${ta() ? '' : 'sel'}">English</button></div></div>
      <label class="set-row"><span>${L('Large text (for elders)', 'பெரிய எழுத்து (பெரியோருக்கு)')}</span><input type="checkbox" id="setLarge"${state.settings.large ? ' checked' : ''}></label>
      <label class="set-row"><span>${L('Read answers aloud', 'பதில்களை வாசித்துக்காட்டு')}</span><input type="checkbox" id="setVoice"${state.settings.voice ? ' checked' : ''}></label>
      <div class="set-row col"><span>${L('Location for today\'s timings', 'இன்றைய நேரங்களுக்கான இடம்')}: <b>${esc(placeName(state.loc?.name) || '—')}</b></span>
        <label class="place-wrap"><input id="locSearch" placeholder="${esc(L('Search a city…', 'நகரத்தைத் தேடுக…'))}"><ul id="locList" class="suggest" hidden></ul></label>
        ${STATIC ? '' : `<button class="link-btn" id="geoBtn">📍 ${L('Use my current location', 'என் தற்போதைய இருப்பிடம்')}</button>`}</div>
    </div>`;
  $('#signOut')?.addEventListener('click', signOut);
  $$('[data-lang]', sec).forEach((b) => b.addEventListener('click', () => { state.lang = b.dataset.lang; store.set('kj_lang', state.lang); document.dispatchEvent(new Event('kj:lang')); }));
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
    ['🔭', 'Precise to the second', 'நொடி துல்லியம்', 'Planet positions from a professional astronomy engine with the Lahiri ayanamsa, for the exact place and second.', 'தொழில்முறை வானியல் கணிப்பு, லாஹிரி அயனாம்சம் — சரியான இடம், நொடிக்கு.'],
    ['👨‍👩‍👧', 'Made for families', 'குடும்பத்திற்காக', 'All your family\'s charts together: who should be careful today, muhurthams that suit everyone, star birthdays and ancestors\' thivasam.', 'குடும்பத்தினர் அனைவரின் ஜாதகமும் ஒன்றாக: இன்று யார் கவனமாக இருக்க வேண்டும், அனைவருக்கும் ஏற்ற முகூர்த்தம், நட்சத்திரப் பிறந்தநாள், முன்னோர் திவசம்.'],
    ['💬', 'A Jothidar who listens', 'கேட்கும் ஜோதிடர்', 'Talk in Tamil or English, by voice or text. Answers come from your own chart and today\'s sky — never generic horoscope text.', 'தமிழ் அல்லது ஆங்கிலத்தில், குரல் அல்லது எழுத்தில் பேசுங்கள். உங்கள் ஜாதகம், இன்றைய வானம் அடிப்படையில் பதில் கிடைக்கும்.'],
    ['🪔', 'Free parigaram first', 'இலவச பரிகாரம் முதலில்', 'Prayer, a lamp, charity, feeding animals, respecting elders — remedies anyone can do, every day.', 'வழிபாடு, தீபம், தானம், உயிர்களுக்கு உணவு, பெரியோரை மதித்தல் — யாரும் தினமும் செய்யக்கூடியவை.'],
    ['🔒', 'Private by design', 'தனியுரிமை', 'Birth details stay on your phone unless you sign in to back them up. We never sell your data.', 'உள்நுழைந்து பாதுகாக்கும் வரை பிறப்பு விவரங்கள் உங்கள் கைப்பேசியிலேயே இருக்கும். உங்கள் தரவை விற்பதில்லை.'],
  ];
  sec.innerHTML = `${subHeader(L('Why Kaippesi Jothidar', 'ஏன் கைப்பேசி ஜோதிடர்'), L('Astrology for peace, health and prosperity — for every family', 'அமைதி, ஆரோக்கியம், செல்வத்திற்கான ஜோதிடம் — ஒவ்வொரு குடும்பத்திற்கும்'), 'more')}
    ${P.map(([i, en, tx, den, dta]) => `<div class="card glass about-row"><span class="ti-icon">${i}</span><div><b>${L(en, tx)}</b><p>${L(den, dta)}</p></div></div>`).join('')}
    <div id="aboutTesti"></div>
    <div class="brand-foot"><img src="logo.svg" alt="" width="64" height="64"><div><b>கைப்பேசி ஜோதிடர்</b>${ta() ? '' : '<span>Kaippesi Jothidar</span>'}</div></div>
    ${copyright()}`;
  if (!STATIC) import('./growth.js').then((g) => g.loadTestimonials('#aboutTesti'));
}
registerScreen('about', { render: renderAbout, parent: 'more' });
