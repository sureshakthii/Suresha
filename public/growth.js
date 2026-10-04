// Growth: usage analytics (installs, opens, screens), subscription lock state, free-trial codes,
// ratings & comments, referrals, and the owner's admin dashboard.
import { state, $, $$, L, esc, bi, api, STATIC, store, registerScreen, subHeader, go, toast, fmtIsoDate, copyright } from './core.js';

// ---------------------------------------------------------------- analytics
const deviceId = (() => {
  let id = store.get('kj_device', null);
  if (!id) { id = `d_${crypto.getRandomValues(new Uint32Array(3)).join('').slice(0, 24)}`; store.set('kj_device', id); }
  return id;
})();
export function platform() {
  const cap = window.Capacitor?.getPlatform?.();
  if (cap === 'android') return /huawei|harmonyos|honor/i.test(navigator.userAgent) ? 'huawei' : 'android';
  if (cap === 'ios') return 'ios';
  if (matchMedia('(display-mode: standalone)').matches || navigator.standalone) return 'pwa';
  return 'web';
}
const queue = [];
let flushTimer;
// Analytics are opt-in (Settings → Privacy & data). Only event names, screen ids and app version are sent.
const analyticsAllowed = () => Boolean(store.get('kj_consent', {}).analytics);
export function track(type, extra = {}) {
  if (STATIC || !analyticsAllowed()) return;
  queue.push({ type, platform: platform(), appVersion: '4.0.0', ...extra });
  clearTimeout(flushTimer);
  flushTimer = setTimeout(flush, queue.length >= 20 ? 0 : 4000);
}
function flush() {
  if (!queue.length) return;
  const events = queue.splice(0, 50);
  fetch('/api/events', { method: 'POST', keepalive: true, credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deviceId, events }) }).catch(() => {});
}
addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
addEventListener('appinstalled', () => track('install'));
document.addEventListener('kj:screen', (e) => track('screen_view', { screen: e.detail }));

export function startAnalytics() {
  if (STATIC) return;
  if (!store.get('kj_first_open', false)) { store.set('kj_first_open', true); track('first_open'); if (platform() !== 'web') track('install'); }
  track('app_open');
  const opens = store.get('kj_opens', 0) + 1;
  store.set('kj_opens', opens);
  const ref = new URLSearchParams(location.search).get('ref');
  if (ref) { store.set('kj_ref', ref.slice(0, 20)); track('referral_open'); }
}

// ---------------------------------------------------------------- billing / lock state
export async function loadBilling() {
  if (STATIC) { state.billing = null; return; }
  try { state.billing = await api('/api/billing/me'); } catch { state.billing = null; }
  const ref = store.get('kj_ref', null);
  if (ref && state.user) {
    try { await api('/api/referral/claim', { method: 'POST', body: { code: ref } }); toast(L('Invite applied — free premium days added 🎁', 'அழைப்பு ஏற்கப்பட்டது — இலவச பிரீமியம் நாட்கள் 🎁')); state.billing = await api('/api/billing/me'); } catch { /* not eligible */ }
    store.del('kj_ref');
  }
}
/** True when a premium feature should be locked for this user. */
export const isLocked = (feature = 'predictions') => Boolean(state.billing?.enforced && !state.billing?.entitlements?.[feature]);
export function lockCard(what) {
  const trialOver = state.billing?.locked;
  return `<div class="card glass lock-card"><div class="lock-icon">🔒</div><b>${trialOver ? L('Your free trial has ended', 'உங்கள் இலவசச் சோதனைக் காலம் முடிந்தது') : L('A Premium feature', 'பிரீமியம் வசதி')}</b>
    <p class="small">${what}</p><button class="btn-gold" data-go="plans">👑 ${L('See plans', 'திட்டங்களைப் பார்')}</button>
    <button class="link-btn center-block" data-go="plans" data-param='{"redeem":true}'>🎁 ${L('Have a gift / trial code?', 'பரிசு / சோதனைக் குறியீடு உள்ளதா?')}</button></div>`;
}
export function trialBanner() {
  const b = state.billing;
  if (!b?.trialEndsAt) return '';
  const hrs = Math.max(0, Math.round((Date.parse(b.trialEndsAt) - Date.now()) / 3600000));
  return `<div class="card glass trial-banner" data-go="plans">🎁 ${L(`Free premium trial — ${hrs} hours left`, `இலவச பிரீமியம் சோதனை — இன்னும் ${hrs} மணி நேரம்`)} ›</div>`;
}

/** Gift / trial code box (used on the Plans screen). */
export function redeemBox() {
  if (STATIC) return '';
  return `<form class="card glass" id="redeemForm"><div class="card-title">🎁 ${L('Gift or trial code', 'பரிசு / சோதனைக் குறியீடு')}</div>
    <div class="phone-in"><input id="redeemCode" placeholder="KJ-XXXX-XXXX" autocapitalize="characters" maxlength="20" required><button class="btn-gold small-btn">${L('Apply', 'பயன்படுத்து')}</button></div><p class="err" id="redeemErr"></p></form>`;
}
export function wireRedeem(onDone) {
  $('#redeemForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!state.user) { toast(L('Please sign in first', 'முதலில் உள்நுழையவும்')); go('login'); return; }
    try {
      const r = await api('/api/billing/redeem', { method: 'POST', body: { code: $('#redeemCode').value.trim().toUpperCase() } });
      toast(L('Premium unlocked until ', 'பிரீமியம் திறக்கப்பட்டது — ') + new Date(r.expiresAt).toLocaleString(), 5000);
      await loadBilling();
      onDone?.();
    } catch (err) { $('#redeemErr').textContent = err.message; }
  });
}

// ---------------------------------------------------------------- ratings & comments
export function ratePrompt() {
  if (STATIC || store.get('kj_rated', false) || store.get('kj_opens', 0) < 4) return '';
  return `<div class="card glass rate-card" data-go="feedback">⭐ ${L('Enjoying Thunai? Rate us and share your comments', 'துணை பிடித்திருக்கிறதா? மதிப்பிட்டு கருத்து தெரிவியுங்கள்')} ›</div>`;
}
function renderFeedback(sec) {
  let rating = 0;
  sec.innerHTML = `${subHeader(L('Rate & comment', 'மதிப்பீடு & கருத்து'), L('Your words help us serve every Tamil family better', 'உங்கள் கருத்து ஒவ்வொரு தமிழ்க் குடும்பத்திற்கும் சிறந்த சேவைக்கு உதவும்'), 'more')}
    <form class="card glass" id="fbForm"><div class="stars" role="radiogroup" aria-label="${L('Rating', 'மதிப்பீடு')}">${[1, 2, 3, 4, 5].map((n) => `<button type="button" class="star" data-n="${n}" role="radio" aria-checked="false" aria-label="${n}">★</button>`).join('')}</div>
      <label for="fbText">${L('Your comments', 'உங்கள் கருத்துகள்')}</label><textarea id="fbText" rows="4" maxlength="1000" placeholder="${esc(L('What did you like? What should we add?', 'எது பிடித்தது? எதைச் சேர்க்க வேண்டும்?'))}"></textarea>
      <button class="btn-gold">${L('Send', 'அனுப்பு')}</button><p class="err" id="fbErr"></p></form>
    <div id="testimonials"></div>${copyright()}`;
  const paint = () => $$('.star', sec).forEach((b) => { const on = Number(b.dataset.n) <= rating; b.classList.toggle('on', on); b.setAttribute('aria-checked', String(Number(b.dataset.n) === rating)); });
  $$('.star', sec).forEach((b) => b.addEventListener('click', () => { rating = Number(b.dataset.n); paint(); }));
  $('#fbForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!rating) { $('#fbErr').textContent = L('Please choose 1 to 5 stars', '1 முதல் 5 நட்சத்திரம் தேர்வு செய்யவும்'); return; }
    if (STATIC) { toast(L('Thank you! 🙏', 'நன்றி! 🙏')); return; }
    try {
      await api('/api/feedback', { method: 'POST', body: { deviceId, rating, comment: $('#fbText').value.trim() || undefined, screen: 'feedback' } });
      store.set('kj_rated', true);
      $('#fbForm').innerHTML = `<p class="center">🙏 ${L('Thank you for your blessings and feedback!', 'உங்கள் ஆசிக்கும் கருத்துக்கும் நன்றி!')}</p>`;
    } catch (err) { $('#fbErr').textContent = err.message; }
  });
  if (!STATIC) loadTestimonials('#testimonials');
}
export async function loadTestimonials(target) {
  try {
    const items = await api('/api/testimonials');
    const list = Array.isArray(items) ? items : items.testimonials || [];
    if (list.length && $(target)) $(target).innerHTML = `<div class="section-title">💬 ${L('What families say', 'குடும்பங்கள் சொல்வது')}</div>${list.map((t) => `<div class="card glass testi"><div class="stars-sm">${'★'.repeat(t.rating)}${'☆'.repeat(5 - t.rating)}</div><p>${esc(t.comment || '')}</p><div class="muted small">— ${esc(t.name)}</div></div>`).join('')}`;
  } catch { /* none yet */ }
}
registerScreen('feedback', { render: renderFeedback, parent: 'more' });

// ---------------------------------------------------------------- referral
function renderInvite(sec) {
  sec.innerHTML = `${subHeader(L('Invite & get free days', 'அழைத்து இலவச நாட்கள் பெறுங்கள்'), L('Share Thunai with family and friends — you both get free Premium days', 'துணையைக் குடும்பம், நண்பர்களுடன் பகிருங்கள் — இருவருக்கும் இலவச பிரீமியம் நாட்கள்'), 'more')}<div id="invBody"></div>`;
  if (STATIC || !state.user) { $('#invBody').innerHTML = `<div class="card glass cta-card" data-go="login">${L('Sign in to get your invite link', 'அழைப்பு இணைப்பைப் பெற உள்நுழையவும்')} ›</div>`; return; }
  api('/api/referral').then((r) => {
    const text = `${L('I use Thunai for daily panchangam and family horoscopes. Join with my link:', 'தினசரி பஞ்சாங்கம், குடும்ப ஜாதகத்திற்கு நான் துணை பயன்படுத்துகிறேன். என் இணைப்பில் சேருங்கள்:')} ${r.link}`;
    $('#invBody').innerHTML = `<div class="card glass center"><div class="mini-label">${L('Your code', 'உங்கள் குறியீடு')}</div><div class="invite-code">${esc(r.code)}</div>
      <p class="small">${L('Friends joined', 'சேர்ந்தவர்கள்')}: ${r.referred} · ${L('Free days earned', 'பெற்ற இலவச நாட்கள்')}: ${r.rewardDaysEarned}</p>
      <div class="btn-row" style="justify-content:center"><a class="btn-gold small-btn" href="https://wa.me/?text=${encodeURIComponent(text)}" target="_blank" rel="noopener">WhatsApp</a><button class="chip-btn" id="invShare">📤 ${L('Share', 'பகிர்')}</button><button class="chip-btn" id="invCopy">📋 ${L('Copy', 'நகலெடு')}</button></div></div>`;
    $('#invShare').addEventListener('click', () => navigator.share?.({ text }).then(() => track('share', { feature: 'invite' })).catch(() => {}));
    $('#invCopy').addEventListener('click', () => navigator.clipboard?.writeText(text).then(() => toast(L('Copied', 'நகலெடுக்கப்பட்டது'))).catch(() => {}));
  }).catch((e) => { $('#invBody').innerHTML = `<p class="muted">${esc(e.message)}</p>`; });
}
registerScreen('invite', { render: renderInvite, parent: 'more' });

// ---------------------------------------------------------------- admin dashboard (owner)
const adminApi = (path, opts = {}) => fetch(path, { method: opts.method || 'GET', headers: { 'x-admin-token': store.get('kj_admin', ''), ...(opts.body ? { 'Content-Type': 'application/json' } : {}) }, body: opts.body ? JSON.stringify(opts.body) : undefined })
  .then(async (r) => { const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || `Error ${r.status}`); return d; });

function bars(rows, key, label) {
  const max = Math.max(1, ...rows.map((r) => r[key] || 0));
  return `<div class="admin-bars" role="img" aria-label="${esc(label)}">${rows.map((r) => `<div class="ab" title="${esc(r.date)}: ${r[key] || 0}"><i style="height:${((r[key] || 0) / max) * 100}%"></i></div>`).join('')}</div>`;
}

async function renderAdmin(sec) {
  sec.innerHTML = `${subHeader(L('Owner dashboard', 'உரிமையாளர் டாஷ்போர்டு'), L('Downloads, users, revenue, feedback and free-trial codes', 'பதிவிறக்கம், பயனர்கள், வருமானம், கருத்து, சோதனைக் குறியீடுகள்'), 'more')}
    <form class="card glass" id="admLogin"><label>${L('Admin token', 'நிர்வாகக் குறியீடு')}<input type="password" id="admTok" value="${esc(store.get('kj_admin', ''))}" autocomplete="off"></label><button class="btn-gold small-btn">${L('Open', 'திற')}</button></form>
    <div id="admBody"></div>`;
  $('#admLogin').addEventListener('submit', (e) => { e.preventDefault(); store.set('kj_admin', $('#admTok').value.trim()); load(); });
  if (STATIC) { $('#admBody').innerHTML = `<p class="muted">${L('The dashboard works with the app\'s server.', 'டாஷ்போர்டு செயலியின் சேவையகத்துடன் இயங்கும்.')}</p>`; return; }
  async function load() {
    const body = $('#admBody');
    body.innerHTML = '<div class="loader"><i></i><i></i><i></i></div>';
    try {
      const o = await adminApi('/api/admin/overview');
      const t = o.stats.totals;
      const kpi = (v, en, tx) => `<div class="kpi"><b>${esc(String(v ?? 0))}</b><span>${L(en, tx)}</span></div>`;
      const codes = await adminApi('/api/admin/gift-codes').catch(() => ({ codes: [] }));
      const codeList = codes.giftCodes || [];
      body.innerHTML = `<div class="kpis">${kpi(t.devices, 'Devices', 'சாதனங்கள்')}${kpi(t.installs, 'Installs', 'நிறுவல்கள்')}${kpi(t.users, 'Users', 'பயனர்கள்')}${kpi(t.activeToday, 'Active today', 'இன்று செயலில்')}${kpi(t.active7, 'Active 7 days', '7 நாள் செயலில்')}${kpi(t.active30, 'Active 30 days', '30 நாள் செயலில்')}${kpi(t.payingUsers, 'Paying users', 'கட்டணப் பயனர்கள்')}${kpi(`₹${(t.revenueByCurrency?.INR || 0).toLocaleString('en-IN')}`, 'Revenue (INR)', 'வருமானம் (₹)')}${kpi(`$${t.revenueByCurrency?.USD || 0}`, 'Revenue (USD)', 'வருமானம் ($)')}${kpi(t.avgRating ? t.avgRating.toFixed(1) + '★' : '—', 'Avg rating', 'சராசரி மதிப்பீடு')}</div>
        <div class="card glass"><div class="card-title">${L('Daily app opens (30 days)', 'தினசரி திறப்புகள் (30 நாள்)')}</div>${bars(o.stats.daily, 'opens', 'opens')}
          <div class="card-title" style="margin-top:10px">${L('New devices per day', 'தினசரி புதிய சாதனங்கள்')}</div>${bars(o.stats.daily, 'newDevices', 'new devices')}</div>
        <div class="card glass"><div class="card-title">${L('Platforms', 'தளங்கள்')}</div>${Object.entries(o.stats.byPlatform || {}).map(([k, v]) => `<div class="factor"><span>${esc(k)}</span><b class="zero">${v}</b></div>`).join('')}</div>
        <div class="card glass"><div class="card-title">${L('Top screens', 'அதிகம் பார்த்த திரைகள்')}</div>${(o.stats.topScreens || []).map((x) => `<div class="factor"><span>${esc(x.screen)}</span><b class="zero">${x.views}</b></div>`).join('')}</div>
        <div class="card glass"><div class="card-title">${L('To do', 'செய்ய வேண்டியவை')}</div><div class="factor"><span>${L('Priests awaiting verification', 'சரிபார்ப்புக்குக் காத்திருக்கும் புரோகிதர்கள்')}</span><b class="zero">${o.pendingPriests}</b></div><div class="factor"><span>${L('Open seva / package requests', 'திறந்த சேவை / பேக்கேஜ் கோரிக்கைகள்')}</span><b class="zero">${o.openRequests}</b></div><div class="factor"><span>${L('Orders awaiting payment', 'கட்டணத்திற்குக் காத்திருக்கும் ஆர்டர்கள்')}</span><b class="zero">${o.ordersAwaitingPayment}</b></div></div>
        <div class="card glass"><div class="card-title">💬 ${L('Latest feedback', 'சமீபத்திய கருத்துகள்')}</div>${(o.latestFeedback || []).map((f) => `<div class="fb-row"><div><span class="stars-sm">${'★'.repeat(f.rating)}</span> <span class="muted small">${esc(f.status)}</span><p class="small">${esc(f.comment || '')}</p></div>${f.status !== 'approved' ? `<button class="chip-btn" data-approve="${esc(f.id)}">${L('Show publicly', 'பொதுவில் காட்டு')}</button>` : ''}</div>`).join('') || `<p class="muted small">${L('No feedback yet', 'இன்னும் கருத்து இல்லை')}</p>`}</div>
        <form class="card glass" id="giftForm"><div class="card-title">🎁 ${L('Free trial code for relatives', 'உறவினர்களுக்கு இலவசச் சோதனைக் குறியீடு')}</div>
          <div class="row3"><label>${L('Hours', 'மணி நேரம்')}<input type="number" name="hours" value="24" min="1" max="8760"></label><label>${L('People', 'நபர்கள்')}<input type="number" name="maxUses" value="10" min="1" max="1000"></label><label>${L('Plan', 'திட்டம்')}<select name="plan"><option value="family_month">${L('Family', 'குடும்பம்')}</option><option value="premium_month">${L('Premium', 'பிரீமியம்')}</option></select></label></div>
          <label>${L('Note', 'குறிப்பு')}<input name="note" maxlength="80" placeholder="${esc(L('e.g. Relatives — Diwali', 'உ.தா. உறவினர்கள் — தீபாவளி'))}"></label>
          <button class="btn-gold">${L('Create code', 'குறியீடு உருவாக்கு')}</button><div id="giftOut"></div>
          <p class="muted small">${L('Access locks automatically when the hours end.', 'மணி நேரம் முடிந்ததும் தானாகவே பூட்டப்படும்.')}</p></form>
        ${codeList.length ? `<div class="card glass"><div class="card-title">${L('Codes', 'குறியீடுகள்')}</div>${codeList.map((c) => `<div class="factor"><span><b>${esc(c.code)}</b><br><small class="muted">${esc(c.note || '')} · ${c.hours} ${L('hrs', 'மணி')}</small></span><b class="zero">${c.uses}/${c.maxUses}</b></div>`).join('')}</div>` : ''}`;
      $$('[data-approve]', body).forEach((b) => b.addEventListener('click', async () => { await adminApi(`/api/admin/feedback/${b.dataset.approve}`, { method: 'POST', body: { status: 'approved' } }); load(); }));
      $('#giftForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const f = e.target;
        try {
          const r = await adminApi('/api/admin/gift-codes', { method: 'POST', body: { plan: f.elements.plan.value, hours: Number(f.elements.hours.value), maxUses: Number(f.elements.maxUses.value), note: f.elements.note.value.trim() || undefined } });
          const msg = `🎁 ${L('Your free Thunai Premium code', 'உங்கள் இலவச துணை பிரீமியம் குறியீடு')}: ${r.code} — ${location.origin}`;
          $('#giftOut').innerHTML = `<div class="invite-code">${esc(r.code)}</div><a class="btn-gold small-btn" href="https://wa.me/?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">WhatsApp</a>`;
        } catch (err) { $('#giftOut').innerHTML = `<p class="err">${esc(err.message)}</p>`; }
      });
    } catch (e) {
      body.innerHTML = `<p class="err">${esc(e.message)}</p>`;
    }
  }
  if (store.get('kj_admin', '')) load();
}
registerScreen('admin', { render: renderAdmin, parent: 'more' });

export { deviceId, fmtIsoDate, bi };
