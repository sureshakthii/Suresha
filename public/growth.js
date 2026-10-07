// Growth: usage analytics (installs, opens, screens), subscription lock state, free-trial codes,
// ratings & comments, referrals, and the owner's admin dashboard.
import { state, $, $$, L, esc, bi, api, STATIC, store, registerScreen, subHeader, go, toast, fmtIsoDate, copyright, BRAND, printPage } from './core.js';
import { TOOLS } from './tool-registry.js';
import { GATE_ADDS, gateAllows, pairKey } from './shared/plan-gates.js';

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
// Product metrics (§14, consent-gated like everything above): opening a tool counts as feature_use.
const TOOL_IDS = new Set(TOOLS.map((t) => t.id));
let lastScreen = null; // the screen a problem report is about (never the report screen itself)
document.addEventListener('kj:screen', (e) => {
  track('screen_view', { screen: e.detail });
  if (TOOL_IDS.has(e.detail)) track('feature_use', { feature: e.detail });
  if (!['report', 'feedback'].includes(e.detail)) lastScreen = e.detail;
});

/** Event label safe for the server ([\w./:-], ≤ 60 chars). */
const tag = (v) => String(v || '').replace(/[^\w./:-]/g, '_').slice(0, 60);
/**
 * A finished task (porutham done, journey planned, names shortlisted, prasnam answered, weekly plan saved).
 * Screens may call this directly or dispatch `new CustomEvent('kj:task', { detail: 'porutham' })` on document.
 */
export function taskDone(task) { track('task_complete', { feature: tag(task) }); }
document.addEventListener('kj:task', (e) => { taskDone(e.detail); logTask(e.detail); });

// ---------------------------------------------------------------- value summary log (this phone only)
// Counts of finished tasks for "Your Thunai so far" (Settings). Kept only in this phone's storage, never sent,
// and shown only if the person switches the summary on. Factual counts — no money or risk claims.
const TASK_LOG = 'kj_task_log';
export const taskLog = () => store.get(TASK_LOG, {}) || {};
function logTask(task) {
  const k = tag(task);
  if (!k) return;
  const log = taskLog();
  log[k] = (Number(log[k]) || 0) + 1;
  store.set(TASK_LOG, log);
}

/**
 * "Was this clear?" 👍 / 👎 under an answer: clarityPrompt('prasnam') returns the HTML; the click is recorded as
 * comprehension_feedback ('prasnam:yes' | 'prasnam:no') — only with analytics consent, never the answer text.
 */
export function clarityPrompt(where) {
  return `<div class="clarity" data-clarity="${esc(tag(where))}" role="group" aria-label="${esc(L('Was this clear?', 'இது தெளிவாக இருந்ததா?'))}">
    <span class="small muted">${L('Was this clear?', 'இது தெளிவாக இருந்ததா?')}</span>
    <button type="button" class="chip-btn" data-clear="yes" aria-label="${esc(L('Yes, clear', 'ஆம், தெளிவு'))}">👍</button>
    <button type="button" class="chip-btn" data-clear="no" aria-label="${esc(L('No, not clear', 'இல்லை, தெளிவில்லை'))}">👎</button></div>`;
}
document.addEventListener('click', (e) => {
  const b = e.target.closest?.('[data-clear]');
  const box = b?.closest('[data-clarity]');
  if (!box) return;
  track('comprehension_feedback', { feature: `${box.dataset.clarity}:${b.dataset.clear === 'yes' ? 'yes' : 'no'}` });
  box.innerHTML = `<span class="small muted">🙏 ${L('Thank you', 'நன்றி')}</span>`;
});

// ---------------------------------------------------------------- services switch (SERVICES_OPEN on the server)
let svc = null;
/** Whether seva / priest / package requests are being accepted. Static builds never take requests. */
export async function servicesOpen() {
  if (STATIC) return false;
  if (!svc) { try { svc = await api('/api/service-status'); } catch { return false; } }
  return Boolean(svc.open);
}
export const servicesClosedCard = () => `<div class="card glass coming" role="status"><b>⏸️ ${L('Coming soon — not accepting requests yet', 'விரைவில் — இப்போது கோரிக்கைகள் ஏற்கப்படவில்லை')}</b>
  <p class="small">${L('Priests and partners are still being onboarded, so requests cannot be sent yet. Nothing is booked or charged.', 'புரோகிதர்களும் கூட்டாளிகளும் இன்னும் இணைக்கப்படுகின்றனர்; எனவே இப்போது கோரிக்கை அனுப்ப இயலாது. எதுவும் முன்பதிவோ கட்டணமோ ஆகாது.')}</p></div>`;

/** Business metrics as text with bars (owner dashboard). Definitions come from server/metrics.js. */
function metricsCard(m) {
  const row = (label, rate, detail) => `<div class="tb-row"><span class="tb-label">${label}</span><span class="tb-value">${rate == null ? '—' : `${rate}%`}</span><span class="tb-bar"><i class="${rate == null ? '' : rate >= 40 ? 'good' : rate >= 15 ? 'warn' : 'bad'}" style="width:${Math.min(100, rate || 0)}%"></i></span><span class="tb-note">${detail}</span></div>`;
  const inr = (v) => (v == null ? L('not set', 'அமைக்கப்படவில்லை') : `₹${Number(v).toLocaleString('en-IN')}`);
  return `<div class="card glass"><div class="card-title">📊 ${L(`Business metrics — last ${m.windowDays} days`, `வணிக அளவீடுகள் — கடந்த ${m.windowDays} நாள்`)}</div><div class="tb-list">
    ${row(L('Activation', 'செயல்படுத்தல்'), m.activation.rate, L(`${m.activation.activated} of ${m.activation.newDevices} new devices used a personal feature within 24 h`, `${m.activation.newDevices} புதிய சாதனங்களில் ${m.activation.activated} — 24 மணிக்குள் தனிப்பட்ட வசதி`))}
    ${row(L('Day-7 retention', '7-ம் நாள் தக்கவைப்பு'), m.retention.d7.rate, L(`${m.retention.d7.returned} of ${m.retention.d7.cohort} returned in days 7–13`, `${m.retention.d7.cohort}-ல் ${m.retention.d7.returned} பேர் 7–13 நாளில் திரும்பினர்`))}
    ${row(L('Day-30 retention', '30-ம் நாள் தக்கவைப்பு'), m.retention.d30.rate, L(`${m.retention.d30.returned} of ${m.retention.d30.cohort} returned in days 30–36`, `${m.retention.d30.cohort}-ல் ${m.retention.d30.returned} பேர் 30–36 நாளில் திரும்பினர்`))}
    ${row(L('Paid conversion', 'கட்டண மாற்றம்'), m.conversion.rate, L(`${m.conversion.newPayers} of ${m.conversion.newUsers} new accounts paid`, `${m.conversion.newUsers} புதிய கணக்குகளில் ${m.conversion.newPayers} கட்டணம்`))}
    ${row(L('Subscriber churn', 'சந்தாதாரர் இழப்பு'), m.churn.rate, L(`${m.churn.churned} of ${m.churn.periodsEnded} ended periods not renewed within 7 days`, `${m.churn.periodsEnded}-ல் ${m.churn.churned} — 7 நாளில் புதுப்பிக்கவில்லை`))}
  </div>
  <dl class="kv small">
    <dt>${L('Revenue (payments)', 'வருமானம் (கட்டணங்கள்)')}</dt><dd>${inr(m.money.revenueInr)}</dd>
    <dt>${L('Refunds', 'பணத்திருப்பம்')}</dt><dd>${inr(m.money.refundsInr)} (${m.money.refundCount})</dd>
    <dt>${L('Contribution margin', 'பங்களிப்பு லாபம்')}</dt><dd>${inr(m.money.contributionMarginInr)}</dd>
    <dt>${L('AI cost / per payer', 'AI செலவு / ஒருவருக்கு')}</dt><dd>${m.ai.priced ? `${inr(m.ai.costInr)} / ${inr(m.ai.costPerPayerInr)}` : `${m.ai.calls} ${L('calls', 'அழைப்புகள்')}, ${(m.ai.inputTokens + m.ai.outputTokens).toLocaleString('en-IN')} tokens — ${L('set AI_COST_INR_PER_MTOK_IN/OUT', 'AI_COST_INR_PER_MTOK_IN/OUT அமைக்கவும்')}`}</dd>
    <dt>${L('Acquisition cost / new user', 'கையகச் செலவு / புதியவர்')}</dt><dd>${inr(m.acquisition.costPerNewUserInr)}</dd>
    <dt>${L('Fulfilled bookings', 'நிறைவேற்றிய முன்பதிவுகள்')}</dt><dd>${m.bookings.fulfilled} (${L('open', 'நிலுவை')} ${m.bookings.open}, ${L('cancelled', 'ரத்து')} ${m.bookings.cancelled})</dd>
    <dt>${L('Booking value (gross, not revenue)', 'முன்பதிவு மதிப்பு (மொத்தம், வருமானம் அல்ல)')}</dt><dd>${inr(m.money.bookingValueGrossInr)}</dd>
  </dl>
  <ul class="small muted">${m.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul></div>`;
}

/** Product metrics (§14): tool use, completed tasks, paywall → plan click → purchase, sign-ups, "Was this clear?". */
function productCard(p) {
  if (!p) return '';
  const list = (obj) => Object.entries(obj || {}).map(([k, v]) => `<div class="factor"><span>${esc(k)}</span><b class="zero">${v}</b></div>`).join('') || `<p class="muted small">${L('None yet', 'இன்னும் இல்லை')}</p>`;
  const pc = (v) => (v == null ? '—' : `${v}%`);
  return `<div class="card glass"><div class="card-title">🧭 ${L('Product use (consented analytics, 30 days)', 'பயன்பாடு (அனுமதித்த பகுப்பாய்வு, 30 நாள்)')}</div>
    <dl class="kv small">
      <dt>${L('Paywall views → plan clicks → purchases', 'கட்டணத் திரை → திட்டத் தேர்வு → வாங்குதல்')}</dt><dd>${p.paywallViews} → ${p.planClicks} (${pc(p.paywallToClickRate)}) → ${p.purchases} (${pc(p.clickToPurchaseRate)})</dd>
      <dt>${L('Sign-ups / log-ins', 'பதிவு / உள்நுழைவு')}</dt><dd>${p.signups} / ${p.logins}</dd>
      <dt>${L('“Was this clear?”', '“தெளிவாக இருந்ததா?”')}</dt><dd>👍 ${p.comprehension.yes} · 👎 ${p.comprehension.no} (${pc(p.comprehension.clearRate)})</dd>
    </dl>
    <div class="mini-label">${L('Tasks completed', 'நிறைவு செய்த பணிகள்')}</div>${list(p.tasksCompleted)}
    <div class="mini-label">${L('Tools used', 'பயன்படுத்திய கருவிகள்')}</div>${list(p.featureUse)}</div>`;
}

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
    try { await api('/api/referral/claim', { method: 'POST', body: { code: ref } }); toast(L('Invite applied — free Personal-plan days added 🎁', 'அழைப்பு ஏற்கப்பட்டது — இலவச தனிநபர் திட்ட நாட்கள் 🎁')); state.billing = await api('/api/billing/me'); } catch { /* not eligible */ }
    store.del('kj_ref');
  }
}
/**
 * True when a paid-plan feature should be locked for this user (only when the server enforces billing).
 * opts: { count } items already saved (goals / shortlist / journeys / familyProfiles), { scope: { pairId | journeyId } }
 * for what a one-time package covers. Rules: shared/plan-gates.js.
 */
const lastScope = {}; // the couple / journey a locked task was about, so its lock card can offer that package
export const isLocked = (feature = 'predictions', opts = {}) => {
  lastScope[feature] = opts.scope || null;
  return !gateAllows(state.billing?.entitlements || null, Boolean(state.billing?.enforced), feature, opts);
};
export { pairKey };
/**
 * Lock card shown next to the specific task (never a blanket paywall). `what` says what the task needs;
 * `feature` adds the exact "What this adds" list from shared/plan-gates.js. No countdowns, no fear, no pressure.
 */
export function lockCard(what, feature = 'predictions') {
  const trialOver = state.billing?.locked;
  const g = GATE_ADDS[feature] || GATE_ADDS.predictions;
  track('paywall_view', { feature: tag(`${state.view}:${feature}`) });
  const planName = g.plan === 'family' ? L(`Part of ${BRAND.familyEn}`, `${BRAND.familyTa} திட்ட வசதி`) : L('Part of the Personal plan', 'தனிநபர் திட்ட வசதி');
  return `<div class="card glass lock-card" data-lock="${esc(feature)}"><div class="lock-icon">🔒</div><b>${trialOver ? L('Your free trial has ended', 'உங்கள் இலவசச் சோதனைக் காலம் முடிந்தது') : planName}</b>
    <p class="small">${what}</p>
    <div class="mini-label">${L('What this adds', 'இது சேர்ப்பது')}</div><ul class="small lock-adds" style="text-align:start;display:inline-block;margin:4px auto 8px;padding-inline-start:20px">${g.adds.map((a) => `<li>${esc(bi(a))}</li>`).join('')}</ul>
    <p class="small muted">${L('Everything you already use stays free. Same calculations and privacy on every plan.', 'நீங்கள் பயன்படுத்துவது இலவசமாகவே தொடரும். எல்லாத் திட்டங்களிலும் அதே கணிப்பு, அதே தனியுரிமை.')}</p>
    <button class="btn-gold" data-go="plans">👑 ${L('See plans', 'திட்டங்களைப் பார்')}</button>
    ${pkgBtn(feature)}
    <button class="link-btn center-block" data-go="plans" data-param='{"redeem":true}'>🎁 ${L('Have a gift / trial code?', 'பரிசு / சோதனைக் குறியீடு உள்ளதா?')}</button></div>`;
}
/** "Just this couple / journey" — a one-time package button when the locked task names its scope. */
function pkgBtn(feature) {
  const sc = lastScope[feature] || {};
  if (sc.pairId) return `<button class="chip-btn center-block" data-go="plans" data-param='${esc(JSON.stringify({ pkg: 'marriage_package', pairId: sc.pairId }))}'>💍 ${L('Only for this couple: Marriage package (one-time)', 'இந்த ஜோடிக்கு மட்டும்: திருமணத் தொகுப்பு (ஒருமுறை)')}</button>`;
  if (sc.journeyId) return `<button class="chip-btn center-block" data-go="plans" data-param='${esc(JSON.stringify({ pkg: 'journey_package', journeyId: sc.journeyId }))}'>🛕 ${L('Only for this journey: Journey package (one-time)', 'இந்தப் பயணத்திற்கு மட்டும்: யாத்திரைத் தொகுப்பு (ஒருமுறை)')}</button>`;
  return '';
}
/**
 * One-line gate for a save / print button: `if (!gate('shortlist', { count, near: btn })) return;`.
 * Allowed → true. Locked → shows the lock card right after the task's card (replacing an earlier one) and returns false.
 */
export function gate(feature, { count = 0, scope = {}, near = null, what = '' } = {}) {
  if (!isLocked(feature, { count, scope })) return true;
  const host = near?.closest?.('.card') || near;
  const html = lockCard(what || L('This step needs a paid plan or package. Your result above stays free.', 'இந்தப் படிக்குக் கட்டணத் திட்டம் / தொகுப்பு தேவை. மேலே உள்ள முடிவு இலவசமே.'), feature);
  if (host?.insertAdjacentHTML) {
    const old = host.parentElement?.querySelector(`:scope > .lock-card[data-lock="${feature}"]`);
    old?.remove();
    host.insertAdjacentHTML('afterend', html);
    host.nextElementSibling?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  } else toast(L('This needs a paid plan — see Plans', 'இதற்குக் கட்டணத் திட்டம் தேவை — திட்டங்களைப் பார்க்கவும்'), 4000);
  return false;
}
export function trialBanner() {
  const b = state.billing;
  if (!b?.trialEndsAt) return '';
  const hrs = Math.max(0, Math.round((Date.parse(b.trialEndsAt) - Date.now()) / 3600000));
  return `<div class="card glass trial-banner" data-go="plans">🎁 ${L(`Free trial of the paid plan — ${hrs} hours left`, `கட்டணத் திட்டத்தின் இலவசச் சோதனை — இன்னும் ${hrs} மணி நேரம்`)} ›</div>`;
}

/**
 * Printable reports: `<button data-print-gated='{"journeyId":"…"}'>` (or {"pairId":"…"} for a couple, {} for others).
 * Prints the current screen with every section open; under BILLING_ENFORCE it needs a paid plan or the package
 * that covers that couple / journey, and otherwise shows the lock card next to the button.
 */
document.addEventListener('click', (e) => {
  const b = e.target.closest?.('[data-print-gated]');
  if (!b) return;
  let scope = {};
  try { scope = JSON.parse(b.dataset.printGated || '{}') || {}; } catch { scope = {}; }
  if (!gate('printReports', { scope, near: b })) return;
  const closed = [...document.querySelectorAll('.view:not([hidden]) details')].filter((d) => !d.open);
  closed.forEach((d) => { d.open = true; });
  addEventListener('afterprint', () => closed.forEach((d) => { d.open = false; }), { once: true });
  printPage();
});

/** Gift / trial code box (used on the Plans screen). */
export function redeemBox() {
  if (STATIC) return '';
  return `<form class="card glass" id="redeemForm"><div class="card-title">🎁 ${L('Gift or trial code', 'பரிசு / சோதனைக் குறியீடு')}</div>
    <div class="phone-in"><input id="redeemCode" aria-label="${esc(L('Gift or trial code', 'பரிசு / சோதனைக் குறியீடு'))}" placeholder="KJ-XXXX-XXXX" autocapitalize="characters" maxlength="20" required><button class="btn-gold small-btn">${L('Apply', 'பயன்படுத்து')}</button></div><p class="err" id="redeemErr"></p></form>`;
}
export function wireRedeem(onDone) {
  $('#redeemForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!state.user) { toast(L('Please sign in first', 'முதலில் உள்நுழையவும்')); go('login'); return; }
    try {
      const r = await api('/api/billing/redeem', { method: 'POST', body: { code: $('#redeemCode').value.trim().toUpperCase() } });
      toast(L('Plan unlocked until ', 'திட்டம் திறக்கப்பட்டது — ') + new Date(r.expiresAt).toLocaleString(), 5000);
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
/** Build id shown in reports: the static build's stamp, else the server app. */
const buildId = () => String(window.KJ_BUILD || 'server').slice(0, 80);
/**
 * Static / review builds have no server: feedback cannot be sent. Say so plainly, keep a copy on this phone and
 * give the text with a Copy button and the support address as selectable text.
 */
function offlineSendBox(text, kind) {
  const outbox = store.get('kj_feedback_outbox', []);
  outbox.push({ kind, text, at: new Date().toISOString() });
  store.set('kj_feedback_outbox', outbox.slice(-20));
  return `<div class="card glass" role="status"><b>📋 ${L('Not sent — this version cannot send messages', 'அனுப்பப்படவில்லை — இந்தப் பதிப்பால் செய்தி அனுப்ப இயலாது')}</b>
    <p class="small">${L('A copy is saved on this phone. Please copy the text below and email it to us:', 'ஒரு நகல் இந்தக் கைப்பேசியில் சேமிக்கப்பட்டது. கீழுள்ள உரையை நகலெடுத்து எங்களுக்கு மின்னஞ்சல் செய்யுங்கள்:')}</p>
    <p class="selectable"><b>${esc(BRAND.supportEmail)}</b></p>
    <textarea class="copy-text selectable" rows="6" readonly aria-label="${esc(L('Text to send', 'அனுப்ப வேண்டிய உரை'))}">${esc(text)}</textarea>
    <button type="button" class="btn-gold small-btn" data-copy-feedback>📋 ${L('Copy', 'நகலெடு')}</button></div>`;
}
function wireCopy(root) {
  root.querySelector('[data-copy-feedback]')?.addEventListener('click', () => {
    const t = root.querySelector('.copy-text');
    const done = () => toast(L('Copied — paste it into an email', 'நகலெடுக்கப்பட்டது — மின்னஞ்சலில் ஒட்டுங்கள்'));
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(t.value).then(done).catch(() => { t.select(); });
    else { t.select(); try { document.execCommand('copy'); done(); } catch { /* select only */ } }
  });
}

function renderFeedback(sec) {
  let rating = 0;
  sec.innerHTML = `${subHeader(L('Rate & comment', 'மதிப்பீடு & கருத்து'), L('Your words help us serve every Tamil family better', 'உங்கள் கருத்து ஒவ்வொரு தமிழ்க் குடும்பத்திற்கும் சிறந்த சேவைக்கு உதவும்'), 'more')}
    ${STATIC ? `<div class="note-box small">${L('This version has no server: your comment is not sent. You will get the text to copy and our email address.', 'இந்தப் பதிப்பில் சேவையகம் இல்லை: உங்கள் கருத்து அனுப்பப்படாது. நகலெடுக்க உரையும் எங்கள் மின்னஞ்சல் முகவரியும் தரப்படும்.')}</div>` : ''}
    <form class="card glass" id="fbForm"><div class="stars" role="radiogroup" aria-label="${L('Rating', 'மதிப்பீடு')}">${[1, 2, 3, 4, 5].map((n) => `<button type="button" class="star" data-n="${n}" role="radio" aria-checked="false" aria-label="${n}">★</button>`).join('')}</div>
      <label for="fbText">${L('Your comments', 'உங்கள் கருத்துகள்')}</label><textarea id="fbText" rows="4" maxlength="1000" placeholder="${esc(L('What did you like? What should we add?', 'எது பிடித்தது? எதைச் சேர்க்க வேண்டும்?'))}"></textarea>
      <button class="btn-gold">${STATIC ? L('Prepare to send', 'அனுப்பத் தயார் செய்') : L('Send', 'அனுப்பு')}</button><p class="err" id="fbErr"></p></form>
    <button class="link-btn center-block" data-go="report">⚠️ ${L('Something not working? Report a problem', 'ஏதாவது இயங்கவில்லையா? பிரச்சினையைத் தெரிவியுங்கள்')}</button>
    <div id="testimonials"></div>${copyright()}`;
  const paint = () => $$('.star', sec).forEach((b) => { const on = Number(b.dataset.n) <= rating; b.classList.toggle('on', on); b.setAttribute('aria-checked', String(Number(b.dataset.n) === rating)); });
  $$('.star', sec).forEach((b) => b.addEventListener('click', () => { rating = Number(b.dataset.n); paint(); }));
  $('#fbForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!rating) { $('#fbErr').textContent = L('Please choose 1 to 5 stars', '1 முதல் 5 நட்சத்திரம் தேர்வு செய்யவும்'); return; }
    const comment = $('#fbText').value.trim();
    if (STATIC) {
      $('#fbForm').outerHTML = offlineSendBox(`${BRAND.name} feedback\nRating: ${rating}/5\n${comment ? `Comment: ${comment}\n` : ''}Build: ${buildId()}`, 'feedback');
      wireCopy(sec);
      return;
    }
    try {
      await api('/api/feedback', { method: 'POST', body: { deviceId, rating, comment: comment || undefined, screen: 'feedback' } });
      store.set('kj_rated', true);
      $('#fbForm').innerHTML = `<p class="center">🙏 ${L('Thank you for your blessings and feedback!', 'உங்கள் ஆசிக்கும் கருத்துக்கும் நன்றி!')}</p>`;
    } catch (err) { $('#fbErr').textContent = err.message; }
  });
  if (!STATIC) loadTestimonials('#testimonials');
}

/** Report a problem: what happened, plus build / screen / device size / language attached automatically. */
function renderReport(sec, params = {}) {
  const screen = tag(params.screen || lastScreen || 'unknown');
  const auto = { build: buildId(), screen, viewport: `${Math.round(window.innerWidth || 0)}x${Math.round(window.innerHeight || 0)}`, lang: state.lang === 'en' ? 'en' : 'ta' };
  sec.innerHTML = `${subHeader(L('Report a problem', 'பிரச்சினையைத் தெரிவி'), L('Tell us what went wrong — no personal details needed', 'என்ன தவறாக நடந்தது எனச் சொல்லுங்கள் — தனிப்பட்ட விவரம் தேவையில்லை'), 'more')}
    <form class="card glass" id="rpForm">
      <label>${L('Which screen?', 'எந்தத் திரை?')}<input name="screen" maxlength="60" value="${esc(screen)}"></label>
      <label>${L('What did you do? (steps)', 'நீங்கள் என்ன செய்தீர்கள்? (படிகள்)')}<textarea name="steps" rows="3" maxlength="1000" placeholder="${esc(L('1. Opened Porutham  2. Chose two stars  3. Tapped Match', '1. பொருத்தம் திறந்தேன்  2. இரண்டு நட்சத்திரம் தேர்ந்தேன்  3. பொருத்து அழுத்தினேன்'))}"></textarea></label>
      <label>${L('What did you expect?', 'என்ன எதிர்பார்த்தீர்கள்?')}<textarea name="expected" rows="2" maxlength="500"></textarea></label>
      <label>${L('What happened instead?', 'பதிலாக என்ன நடந்தது?')}<textarea name="actual" rows="2" maxlength="500" required></textarea></label>
      <p class="small muted">${L('Attached automatically', 'தானாக இணைக்கப்படுவது')}: ${L('build', 'பதிப்பு')} ${esc(auto.build)} · ${L('screen', 'திரை')} ${esc(auto.screen)} · ${L('device size', 'திரை அளவு')} ${esc(auto.viewport)} · ${L('language', 'மொழி')} ${auto.lang}. ${L('Please do not type birth details, names or phone numbers.', 'பிறப்பு விவரம், பெயர், தொலைபேசி எண் எழுத வேண்டாம்.')}</p>
      <button class="btn-gold">${STATIC ? L('Prepare to send', 'அனுப்பத் தயார் செய்') : L('Send report', 'அனுப்பு')}</button><p class="err" id="rpErr"></p></form>${copyright()}`;
  $('#rpForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const v = (k) => f.elements[k].value.trim();
    if (!v('actual')) { $('#rpErr').textContent = L('Please say what happened', 'என்ன நடந்தது எனக் குறிப்பிடவும்'); return; }
    const report = { steps: v('steps') || undefined, expected: v('expected') || undefined, actual: v('actual'), build: auto.build, viewport: auto.viewport, lang: auto.lang };
    const where = tag(v('screen') || screen);
    if (STATIC) {
      f.outerHTML = offlineSendBox([`${BRAND.name} problem report`, `Screen: ${where}`, report.steps && `Steps: ${report.steps}`, report.expected && `Expected: ${report.expected}`, `Actual: ${report.actual}`, `Build: ${auto.build} · Device: ${auto.viewport} · Language: ${auto.lang}`].filter(Boolean).join('\n'), 'defect');
      wireCopy(sec);
      return;
    }
    try {
      await api('/api/feedback', { method: 'POST', body: { deviceId, type: 'defect', comment: report.actual, screen: where, report } });
      f.innerHTML = `<p class="center">🙏 ${L('Thank you — the report reached our team.', 'நன்றி — உங்கள் அறிக்கை எங்கள் குழுவுக்குச் சென்றது.')}</p>`;
    } catch (err) { $('#rpErr').textContent = err.message; }
  });
}
registerScreen('report', { render: renderReport, parent: 'more' });

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
  sec.innerHTML = `${subHeader(L('Invite & get free days', 'அழைத்து இலவச நாட்கள் பெறுங்கள்'), L('Share Thunai with family and friends — you both get free Personal-plan days', 'துணையைக் குடும்பம், நண்பர்களுடன் பகிருங்கள் — இருவருக்கும் இலவச தனிநபர் திட்ட நாட்கள்'), 'more')}<div id="invBody"></div>`;
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
      const mx = await adminApi('/api/admin/metrics?days=30').catch(() => null);
      const defects = (await adminApi('/api/admin/feedback?type=defect').catch(() => ({ feedback: [] }))).feedback.slice(0, 10);
      const codeList = codes.giftCodes || [];
      body.innerHTML = `${mx ? metricsCard(mx) : ''}${productCard(o.stats.product)}<div class="kpis">${kpi(t.devices, 'Devices', 'சாதனங்கள்')}${kpi(t.installs, 'Installs', 'நிறுவல்கள்')}${kpi(t.users, 'Users', 'பயனர்கள்')}${kpi(t.activeToday, 'Active today', 'இன்று செயலில்')}${kpi(t.active7, 'Active 7 days', '7 நாள் செயலில்')}${kpi(t.active30, 'Active 30 days', '30 நாள் செயலில்')}${kpi(t.payingUsers, 'Paying users', 'கட்டணப் பயனர்கள்')}${kpi(`₹${(t.revenueByCurrency?.INR || 0).toLocaleString('en-IN')}`, 'Revenue (INR)', 'வருமானம் (₹)')}${kpi(`$${t.revenueByCurrency?.USD || 0}`, 'Revenue (USD)', 'வருமானம் ($)')}${kpi(t.avgRating ? t.avgRating.toFixed(1) + '★' : '—', 'Avg rating', 'சராசரி மதிப்பீடு')}</div>
        <div class="card glass"><div class="card-title">${L('Daily app opens (30 days)', 'தினசரி திறப்புகள் (30 நாள்)')}</div>${bars(o.stats.daily, 'opens', 'opens')}
          <div class="card-title" style="margin-top:10px">${L('New devices per day', 'தினசரி புதிய சாதனங்கள்')}</div>${bars(o.stats.daily, 'newDevices', 'new devices')}</div>
        <div class="card glass"><div class="card-title">${L('Platforms', 'தளங்கள்')}</div>${Object.entries(o.stats.byPlatform || {}).map(([k, v]) => `<div class="factor"><span>${esc(k)}</span><b class="zero">${v}</b></div>`).join('')}</div>
        <div class="card glass"><div class="card-title">${L('Top screens', 'அதிகம் பார்த்த திரைகள்')}</div>${(o.stats.topScreens || []).map((x) => `<div class="factor"><span>${esc(x.screen)}</span><b class="zero">${x.views}</b></div>`).join('')}</div>
        <div class="card glass"><div class="card-title">${L('To do', 'செய்ய வேண்டியவை')}</div><div class="factor"><span>${L('Priests awaiting verification', 'சரிபார்ப்புக்குக் காத்திருக்கும் புரோகிதர்கள்')}</span><b class="zero">${o.pendingPriests}</b></div><div class="factor"><span>${L('Open seva / package requests', 'திறந்த சேவை / பேக்கேஜ் கோரிக்கைகள்')}</span><b class="zero">${o.openRequests}</b></div><div class="factor"><span>${L('Orders awaiting payment', 'கட்டணத்திற்குக் காத்திருக்கும் ஆர்டர்கள்')}</span><b class="zero">${o.ordersAwaitingPayment}</b></div></div>
        <div class="card glass"><div class="card-title">💬 ${L('Latest feedback', 'சமீபத்திய கருத்துகள்')}</div>${(o.latestFeedback || []).map((f) => `<div class="fb-row"><div><span class="stars-sm">${'★'.repeat(f.rating)}</span> <span class="muted small">${esc(f.status)}</span><p class="small">${esc(f.comment || '')}</p></div>${f.status !== 'approved' ? `<button class="chip-btn" data-approve="${esc(f.id)}">${L('Show publicly', 'பொதுவில் காட்டு')}</button>` : ''}</div>`).join('') || `<p class="muted small">${L('No feedback yet', 'இன்னும் கருத்து இல்லை')}</p>`}</div>
        <div class="card glass"><div class="card-title">⚠️ ${L('Problem reports', 'பிரச்சினை அறிக்கைகள்')}</div>${defects.map((f) => `<div class="fb-row"><div><b class="small">${esc(f.screen || '—')}</b> <span class="muted small">${esc(f.report?.build || '')} · ${esc(f.report?.viewport || '')} · ${esc(f.report?.lang || '')}</span><p class="small">${esc(f.comment || '')}</p>${f.report?.steps ? `<p class="small muted">${esc(f.report.steps)}</p>` : ''}</div></div>`).join('') || `<p class="muted small">${L('No reports', 'அறிக்கைகள் இல்லை')}</p>`}</div>
        <form class="card glass" id="giftForm"><div class="card-title">🎁 ${L('Free trial code for relatives', 'உறவினர்களுக்கு இலவசச் சோதனைக் குறியீடு')}</div>
          <div class="row3"><label>${L('Hours', 'மணி நேரம்')}<input type="number" name="hours" value="24" min="1" max="8760"></label><label>${L('People', 'நபர்கள்')}<input type="number" name="maxUses" value="10" min="1" max="1000"></label><label>${L('Plan', 'திட்டம்')}<select name="plan"><option value="family_month">${L('Family', 'குடும்பம்')}</option><option value="personal_month">${L('Personal', 'தனிநபர்')}</option></select></label></div>
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
          const msg = `🎁 ${L('Your free Thunai plan code', 'உங்கள் இலவச துணை திட்டக் குறியீடு')}: ${r.code} — ${location.origin}`;
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
