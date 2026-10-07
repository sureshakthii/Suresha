// Hubs for the five-destination navigation (Family and Services tabs) and the searchable tools launcher.
// The tool list itself lives in tool-registry.js (grouped by intent, searchable in Tamil / English / Tanglish).
import {
  state, $, $$, L, ta, esc, STATIC, api, toast, fmtIsoDate, needsServerCard, go, registerScreen, subHeader, saveFamily, copyright, store,
  activeMember, chartOf, displayName, nameInLang, nakName, rasiName, RELATIONS, bi, BRAND,
} from './core.js';
import { icon, iconChip } from './icons.js';
import { GROUPS, TOOLS, toolById, searchTools } from './tool-registry.js';
import { savedJourneysHtml } from './screens-journey.js';
import { syncShares, sharedHubLine } from './family-share.js';

export { GROUPS, TOOLS, searchTools };

const statusBadge = (t) => (t.status === 'soon' ? `<span class="badge unv">${L('Coming soon', 'விரைவில்')}</span>`
  : t.status === 'server' && STATIC ? `<span class="badge unv">${L('Opening soon', 'விரைவில்')}</span>`
  : t.status === 'sample' ? `<span class="badge est">${L('Sample', 'மாதிரி')}</span>` : '');

/** One list row: icon · name (· group) · chevron. Same row everywhere (tools, hubs, settings). */
export function toolRow(t, { sub = '' } = {}) {
  return `<button class="row" data-go="${t.id}">${iconChip(t.id, { size: 20, cls: 'mi-icon' })}<span class="row-txt"><span class="row-name">${esc(L(t.en, t.ta))}</span>${sub ? `<small>${esc(sub)}</small>` : ''}</span>${statusBadge(t)}<span class="row-go" aria-hidden="true">${icon('chevron-right', { size: 18 })}</span></button>`;
}
const groupOf = (id) => GROUPS.find((g) => g.id === id);
/** A grouped list (one card, divided rows) for one intent group. */
export function groupList(groupId, { title = true, exclude = [] } = {}) {
  const g = groupOf(groupId);
  const items = TOOLS.filter((t) => t.group === groupId && !exclude.includes(t.id));
  return `<section class="tl-group" aria-label="${esc(L(g.en, g.ta))}">${title ? `<h3 class="section-title">${esc(L(g.en, g.ta))}</h3>` : ''}<div class="menu list">${items.map((t) => toolRow(t)).join('')}</div></section>`;
}

/** "What are you looking for?" — a search bar that opens the tools launcher (Today's top, Services tab). */
export function searchPill() {
  return `<button class="search-pill" type="button" data-go="tools" data-param='{"focus":true}'>${icon('search', { size: 20 })}<span>${L('What are you looking for?', 'எதைத் தேடுகிறீர்கள்?')}</span></button>`;
}

// Recently used tools ("சமீபத்தில் பயன்படுத்தியவை") — remembered on this phone only.
const RECENT_KEY = 'kj_recent_tools';
const NOT_RECENT = new Set(['home', 'tools', 'more', 'chart', 'chat']);
export const recentTools = () => (store.get(RECENT_KEY, []) || []).map(toolById).filter(Boolean);
if (typeof document !== 'undefined') {
  document.addEventListener('kj:screen', (e) => {
    const id = e.detail;
    if (!toolById(id) || NOT_RECENT.has(id)) return;
    store.set(RECENT_KEY, [id, ...(store.get(RECENT_KEY, []) || []).filter((x) => x !== id)].slice(0, 8));
  });
}

// ================================================================ ALL TOOLS (searchable launcher)
function renderTools(sec, params = {}) {
  const recent = recentTools();
  sec.innerHTML = `${subHeader(L('All tools', 'அனைத்து கருவிகள்'), '', 'home')}
    <div class="tl-search" role="search">${icon('search', { size: 20 })}
      <label class="sr-only" for="toolSearch">${L('Search tools', 'கருவிகளைத் தேடு')}</label>
      <input id="toolSearch" type="search" enterkeyhint="search" autocomplete="off" spellcheck="false" placeholder="${esc(L('What are you looking for?', 'எதைத் தேடுகிறீர்கள்?'))}" value="${esc(params.q || '')}">
    </div>
    <p class="small muted tl-hint">${L('Try: porutham, rahu kalam, baby names, temple', 'எ.கா.: பொருத்தம், ராகு காலம், குழந்தை பெயர், கோவில்')}</p>
    <div id="tlResults" class="menu list" role="list" aria-live="polite" hidden></div>
    <div id="tlBody">
      ${recent.length ? `<section class="tl-group"><h3 class="section-title">${L('Recently used', 'சமீபத்தில் பயன்படுத்தியவை')}</h3>
        <div class="tl-recent">${recent.slice(0, 6).map((t) => `<button class="tl-chip" data-go="${t.id}">${iconChip(t.id, { size: 22, cls: 'mi-icon' })}<span>${esc(L(t.en, t.ta).split(' — ')[0].split(' (')[0])}</span></button>`).join('')}</div></section>` : ''}
      ${GROUPS.map((g) => groupList(g.id)).join('')}
    </div>
    ${copyright()}`;
  const input = $('#toolSearch', sec);
  const results = $('#tlResults', sec);
  const body = $('#tlBody', sec);
  const run = () => {
    const q = input.value.trim();
    if (!q) { results.hidden = true; body.hidden = false; return; }
    const hits = searchTools(q);
    body.hidden = true; results.hidden = false;
    results.innerHTML = hits.length ? hits.map((t) => toolRow(t, { sub: L(groupOf(t.group).en, groupOf(t.group).ta) })).join('')
      : `<div class="tl-empty"><p>${L('No tool matches that.', 'அந்தப் பெயரில் கருவி இல்லை.')}</p><button class="btn-soft" type="button" data-ask>${icon('chat', { size: 18 })} ${L('Ask Thunai instead', 'துணையிடம் கேளுங்கள்')}</button></div>`;
    $('[data-ask]', results)?.addEventListener('click', () => go('chat', { q }));
  };
  input.addEventListener('input', run);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const first = $('#tlResults .row', sec); if (first && !results.hidden) first.click(); } });
  if (params.q) run();
  if (params.focus) requestAnimationFrame(() => input.focus({ preventScroll: true }));
}
registerScreen('tools', { render: renderTools, parent: 'home' });

// ================================================================ FAMILY HUB
function renderFamilyHub(sec, opts = {}) {
  const fam = state.family;
  const people = fam.filter((m) => m.relation !== 'organization' && !m.shared); // shared with me: not in my 8
  sec.innerHTML = `<div class="sub-head hub-head"><div><h2>${L('Family', 'குடும்பம்')}</h2></div></div>
    <div class="card glass">
      <div class="card-title"><span>${L('Profiles', 'சுயவிவரங்கள்')} (${people.length}/8)</span><button class="link-btn" data-go="family">${L('Manage', 'நிர்வகி')}</button></div>
      ${fam.length ? fam.map((m) => { const c = chartOf(m); return `<button class="fam-row${m.id === state.activeId ? ' active' : ''}" data-id="${esc(m.id)}">
        <span class="avatar">${esc(([...displayName(m)][0] || '').toUpperCase())}</span>
        <span class="fam-name">${esc(displayName(m))}${m.private ? ' 🔒' : ''}<small>${m.shared ? `${L('Shared by', 'பகிர்ந்தவர்')} ${esc(nameInLang(m.shared.by) || L('family', 'குடும்பம்'))}${m.shared.permission === 'edit' ? '' : ` (${L('view only', 'பார்வைக்கு மட்டும்')})`} · ` : `${esc(bi(RELATIONS.find((r) => r.id === m.relation) || RELATIONS[6]))} · `}${esc(nakName(c.janmaNakshatra.index))} · ${esc(rasiName(c.janmaRasi.index))}</small></span>
        ${m.id === state.activeId ? `<span class="tag good">${L('Active', 'தேர்வு')}</span>` : ''}</button>`; }).join('')
    : `<p class="muted">${L('No profiles yet. The calendar works without one; add birth details for personal guidance.', 'இன்னும் சுயவிவரம் இல்லை. நாட்காட்டிக்குத் தேவையில்லை; தனிப்பட்ட வழிகாட்டலுக்குப் பிறப்பு விவரம் சேர்க்கவும்.')}</p>`}
      ${people.length < 8 ? `<button class="btn-gold" data-go="family" data-param='{"add":true}'>${icon('plus', { size: 18 })} ${L('Add a family member', 'குடும்ப உறுப்பினர் சேர்')}</button>` : `<p class="small muted">${L('8 of 8 profiles used.', '8 சுயவிவரங்களும் பயன்பாட்டில்.')}</p>`}
      <p class="small muted">${L(`Up to 8 profiles on the ${BRAND.familyEn} plan · private by default`, `${BRAND.familyTa} திட்டத்தில் 8 பேர் வரை · இயல்பாகத் தனிப்பட்டது`)}</p>
      ${sharedHubLine()}
    </div>
    ${groupList('family', { exclude: ['family'] })}
    ${groupList('subha')}
    <div class="note-box">${L('Matching results are traditional interpretations to support a family conversation. They are never a verdict on anyone’s worth or suitability.', 'பொருத்த முடிவுகள் குடும்ப உரையாடலுக்கு உதவும் பாரம்பரிய விளக்கம் மட்டுமே. யாருடைய மதிப்பையும் தகுதியையும் தீர்மானிப்பவை அல்ல.')}</div>
    ${copyright()}`;
  $$('.fam-row', sec).forEach((r) => r.addEventListener('click', () => { state.activeId = r.dataset.id; saveFamily(); renderFamilyHub(sec, { synced: true }); }));
  // Sync shared-family profiles on open; re-draw once if any arrived or were revoked.
  if (!opts.synced && state.user && !STATIC) {
    const before = JSON.stringify(state.family);
    syncShares().then(() => { if (state.view === 'familyhub' && before !== JSON.stringify(state.family)) renderFamilyHub(sec, { synced: true }); });
  }
}
registerScreen('familyhub', { render: renderFamilyHub });

// ================================================================ SERVICES HUB (+ the way into every tool)
function renderServices(sec) {
  sec.innerHTML = `<div class="sub-head hub-head"><div><h2>${L('Services', 'சேவைகள்')}</h2></div></div>
    ${searchPill()}
    <button class="row-card" data-go="tools">${iconChip('tools', { size: 22, cls: 'mi-icon' })}<span class="row-txt"><span class="row-name">${L('All tools', 'அனைத்து கருவிகள்')}</span><small>${L('Every feature, grouped by what you want to do', 'எல்லா வசதிகளும், தேவை வாரியாக')}</small></span><span class="row-go" aria-hidden="true">${icon('chevron-right', { size: 18 })}</span></button>
    <button class="card glass cta-card journey-cta" data-go="journey"><b>${L('My Spiritual Journey', 'என் ஆன்மீகப் பயணம்')}</b>
      <span class="small muted">${L('Nearby, matching your leave, or close to home — with route, timings, weather and stay.', 'அருகில், உங்கள் விடுப்புக்கு ஏற்ப, அல்லது வீட்டருகே — வழி, நேரம், வானிலை, தங்குமிடத்துடன்.')}</span></button>
    ${savedJourneysHtml()}
    ${groupList('worship', { exclude: ['journey'] })}
    ${groupList('services', { exclude: ['consult'] })}
    <button class="card glass cta-card second-opinion" data-go="consult"><b>${L('Talk to an astrologer', 'ஜோதிடருடன் பேச')} <span class="badge unv">${L('Coming soon', 'விரைவில்')}</span></b>
      <span class="small muted">${L('Not available yet — no practitioners are onboarded, so nothing can be booked or charged.', 'இப்போது கிடைக்கவில்லை — எந்த ஜோதிடரும் இணைக்கப்படவில்லை; எதையும் முன்பதிவு செய்யவோ கட்டணம் செலுத்தவோ இயலாது.')}</span></button>
    <details class="card glass disclose"><summary class="card-title">${L('Our commitments', 'எங்கள் உறுதிமொழி')}</summary>
      <ul class="small">
        <li>${L('Payment never changes which temples we suggest.', 'கட்டணம் எந்தக் கோவிலைப் பரிந்துரைப்போம் என்பதை மாற்றாது.')}</li>
        <li>${L('Any booking commission or partner relationship is shown before you pay.', 'முன்பதிவுக் கமிஷன் அல்லது கூட்டாளர் உறவு கட்டணத்திற்கு முன் காட்டப்படும்.')}</li>
        <li>${L('Bookings are offered only where someone can actually fulfil them.', 'நிறைவேற்றக்கூடிய இடங்களில் மட்டுமே முன்பதிவு வழங்கப்படும்.')}</li>
        <li>${L('No remedy is sold with fear, and none promises a cure or guaranteed result.', 'பயமுறுத்தி எந்தப் பரிகாரமும் விற்கப்படாது; குணமாகும் / உறுதியான பலன் என வாக்களிக்கப்படாது.')}</li>
      </ul></details>
    ${copyright()}`;
}
registerScreen('services', { render: renderServices });

// ================================================================ MY BOOKINGS (fulfilment tracking)
// Lifecycle: requested → awaiting_confirmation → confirmed → (assigned) → completed / cancelled / refunded.
const STEP = {
  requested: ['Requested', 'கோரப்பட்டது'], awaiting_confirmation: ['Awaiting confirmation', 'உறுதிப்படுத்தலுக்குக் காத்திருக்கிறது'],
  confirmed: ['Confirmed', 'உறுதி'], refunded: ['Refunded', 'பணம் திருப்பப்பட்டது'], assigned: ['Priest / partner assigned', 'புரோகிதர் / கூட்டாளர் நியமனம்'],
  accepted: ['Accepted by the priest', 'புரோகிதர் ஏற்றார்'], declined: ['Priest unavailable — being reassigned', 'புரோகிதர் இயலவில்லை — மீண்டும் நியமனம்'],
  completed: ['Completed', 'நிறைவு'], cancelled: ['Cancelled', 'ரத்து'],
};
const stepName = (st) => L(...(STEP[st] || [st, st]));
const CANCELLABLE = ['requested', 'awaiting_confirmation', 'confirmed', 'assigned'];
const stepBadge = (st) => (st === 'completed' ? 'ok' : ['cancelled', 'refunded'].includes(st) ? 'unv' : 'est');
const ORDER_STATUS = {
  awaiting_payment: ['Awaiting payment', 'கட்டணத்திற்குக் காத்திருக்கிறது'], awaiting_payment_setup: ['Payment not set up — not charged', 'கட்டணம் அமைக்கப்படவில்லை — வசூலிக்கப்படவில்லை'],
  payment_failed: ['Payment failed', 'கட்டணம் தோல்வி'], paid: ['Paid', 'செலுத்தப்பட்டது'], shipped: ['Shipped', 'அனுப்பப்பட்டது'], delivered: ['Delivered', 'விநியோகிக்கப்பட்டது'],
  cancelled: ['Cancelled', 'ரத்து'], refund_pending: ['Refund in progress', 'பணத்திருப்பம் நடைபெறுகிறது'], refunded: ['Refunded', 'பணம் திருப்பப்பட்டது'],
};
const orderStatus = (st) => L(...(ORDER_STATUS[st] || [st, st]));

/** Store orders with "Request a refund" while the order is inside the refund window. */
async function storeOrdersHtml() {
  let orders = [];
  try { ({ orders } = await api('/api/store/orders')); } catch { return ''; }
  if (!orders.length) return '';
  return `<div class="section-title">📦 ${L('Store orders', 'கடை ஆர்டர்கள்')}</div>${orders.map((o) => {
    const rq = o.refundRequest;
    const canAsk = o.refundEligible && !(rq && ['open', 'refund_pending'].includes(rq.status));
    return `<article class="card glass"><div class="card-title"><span>₹${Number(o.total).toLocaleString('en-IN')} · ${fmtAt(o.createdAt)}</span><span class="badge ${['refunded', 'cancelled', 'payment_failed'].includes(o.status) ? 'unv' : o.status === 'delivered' ? 'ok' : 'est'}">${esc(orderStatus(o.status))}</span></div>
      <p class="small">${o.items.map((i) => `${esc(bi(i.name))} × ${i.qty}`).join(', ')}</p>
      ${rq ? `<p class="small muted">${L('Refund request', 'பணத்திருப்பக் கோரிக்கை')}: ${esc(rq.status === 'open' ? L('sent — our team will review it', 'அனுப்பப்பட்டது — எங்கள் குழு பரிசீலிக்கும்') : orderStatus(rq.status))}</p>` : ''}
      ${canAsk ? `<button class="chip-btn" data-refund="${esc(o.id)}">↩ ${L('Request a refund', 'பணத்திருப்பம் கோரு')}</button>${o.refundableUntil ? ` <span class="small muted">${L('until', 'வரை')} ${fmtAt(o.refundableUntil)}</span>` : ''}` : ''}
    </article>`;
  }).join('')}`;
}
const fmtAt = (t) => new Date(t).toLocaleString(ta() ? 'ta-IN' : 'en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

async function renderBookings(sec) {
  sec.innerHTML = `${subHeader(L('My bookings', 'என் முன்பதிவுகள்'), L('Every request with its status history', 'ஒவ்வொரு கோரிக்கையும் அதன் நிலை வரலாற்றுடன்'))}<div id="bkBody"></div>`;
  const body = $('#bkBody');
  if (STATIC) { body.innerHTML = needsServerCard(L('Your seva, priest and yatra requests will be tracked here once bookings open.', 'முன்பதிவுகள் தொடங்கியதும் உங்கள் சேவை, புரோகிதர், யாத்திரைக் கோரிக்கைகளின் நிலை இங்கு தெரியும்.')); return; }
  if (!state.user) { body.innerHTML = `<div class="card glass cta-card" data-go="login">${L('Sign in to see your bookings', 'உங்கள் முன்பதிவுகளைப் பார்க்க உள்நுழையவும்')} ›</div>`; return; }
  let requests = [];
  try { ({ requests } = await api('/api/requests')); } catch (e) { body.innerHTML = `<p class="muted">${esc(e.message)}</p>`; return; }
  const orders = await storeOrdersHtml();
  if (!requests.length) { body.innerHTML = `<p class="muted">${L('No bookings yet.', 'இன்னும் முன்பதிவு இல்லை.')}</p><button class="btn-soft" data-go="seva">🛕 ${L('Seva requests', 'சேவைக் கோரிக்கைகள்')}</button>${orders}`; wireRefunds(sec); return; }
  body.innerHTML = requests.map((r) => `<article class="card glass">
      <div class="card-title"><span>${esc(r.service || r.type)} · ${fmtIsoDate(r.date)}</span><span class="badge ${stepBadge(r.status)}">${esc(stepName(r.status))}</span></div>
      <ol class="bk-timeline">${(r.history?.length ? r.history : [{ status: r.status, at: r.updatedAt }]).map((h) => `<li><b>${esc(stepName(h.status))}</b> <span class="muted small">${fmtAt(h.at)}</span></li>`).join('')}</ol>
      ${CANCELLABLE.includes(r.status) ? `<button class="chip-btn" data-cancel="${esc(r.id)}">✕ ${L('Cancel this request', 'இந்தக் கோரிக்கையை ரத்து செய்')}</button>` : ''}
    </article>`).join('') + `<p class="small muted">${L('You get a notification when the status changes (if notifications are switched on).', 'நிலை மாறும்போது அறிவிப்பு வரும் (அறிவிப்புகள் இயக்கத்தில் இருந்தால்).')}</p>${orders}`;
  wireRefunds(sec);
  $$('[data-cancel]', sec).forEach((b) => b.addEventListener('click', async () => {
    if (!confirm(L('Cancel this request?', 'இந்தக் கோரிக்கையை ரத்து செய்யவா?'))) return;
    try { await api(`/api/requests/${b.dataset.cancel}/cancel`, { method: 'POST' }); toast(L('Request cancelled', 'கோரிக்கை ரத்து செய்யப்பட்டது')); renderBookings(sec); } catch (e) { toast(e.message); }
  }));
}
function wireRefunds(sec) {
  $$('[data-refund]', sec).forEach((b) => b.addEventListener('click', async () => {
    const reason = prompt(L('Why do you want a refund? (optional)', 'பணத்திருப்பம் ஏன்? (விருப்பம்)'));
    if (reason === null) return;
    try { await api(`/api/store/orders/${b.dataset.refund}/refund-request`, { method: 'POST', body: { reason: reason.trim().slice(0, 500) || undefined } }); toast(L('Refund request sent — our team will review it', 'பணத்திருப்பக் கோரிக்கை அனுப்பப்பட்டது — எங்கள் குழு பரிசீலிக்கும்')); renderBookings(sec); } catch (e) { toast(e.message); }
  }));
}
registerScreen('bookings', { render: renderBookings, parent: 'services' });

// ================================================================ HUMAN CONSULTATION (prepared, not live)
function renderConsult(sec) {
  sec.innerHTML = `${subHeader(L('Talk to a human astrologer', 'ஜோதிடருடன் நேரில் பேச'), L('Fixed price · fixed duration · written summary', 'நிலையான கட்டணம் · நிலையான நேரம் · எழுத்துச் சுருக்கம்'))}
    <div class="card glass">
      <div class="card-title">${L('How it will work', 'இது எப்படி இயங்கும்')}</div>
      <div class="tb-list">
        ${[['20-minute call', '20 நிமிட அழைப்பு', '₹499'], ['40-minute call + written summary', '40 நிமிட அழைப்பு + எழுத்துச் சுருக்கம்', '₹899']].map(([en, tx, p]) => `<div class="tb-row"><span class="tb-label">${L(en, tx)}</span><span class="tb-value">${p}</span><span class="tb-note">${L('Proposed test price', 'முன்மொழியப்பட்ட சோதனை விலை')}</span></div>`).join('')}
      </div>
      <ul class="small">
        <li>${L('You choose what to share. Your chart summary is shown to you before it is sent.', 'எதைப் பகிர்வது என்பதை நீங்களே தேர்வு செய்யலாம். அனுப்பும் முன் சுருக்கம் உங்களுக்குக் காட்டப்படும்.')}</li>
        <li>${L('Practitioners will be labelled “verified” only after identity and experience checks exist.', 'அடையாளம், அனுபவச் சரிபார்ப்பு நடைமுறை வந்த பிறகே “சரிபார்க்கப்பட்டவர்” எனக் குறிக்கப்படும்.')}</li>
        <li>${L('No medical, legal or financial advice, and no fear-based remedy selling.', 'மருத்துவ, சட்ட, நிதி ஆலோசனை இல்லை; பயமுறுத்திப் பரிகாரம் விற்பனை இல்லை.')}</li>
      </ul>
    </div>
    <div class="card glass coming" role="status"><b>⏸️ ${L('Not available yet', 'இப்போது கிடைக்கவில்லை')}</b>
      <p class="small">${L('No practitioners are onboarded or verified yet, so bookings are closed. Nothing can be charged here.', 'இதுவரை எந்த ஜோதிடரும் இணைக்கப்படவில்லை / சரிபார்க்கப்படவில்லை; எனவே முன்பதிவு மூடப்பட்டுள்ளது. இங்கு எந்தக் கட்டணமும் வசூலிக்கப்படாது.')}</p></div>`;
}
registerScreen('consult', { render: renderConsult, parent: 'services' });

// ================================================================ FAMILY SHARED PLANS
function renderFamilyPlan(sec) {
  const saved = savedJourneysHtml(); // dated list lives on the journey screen (saved-on date, open, rename, delete)
  sec.innerHTML = `${subHeader(L('Shared events & journeys', 'பகிர்ந்த நிகழ்வுகள் & பயணங்கள்'), L('Plan together — share only what is needed', 'சேர்ந்து திட்டமிடுங்கள் — தேவையானதை மட்டும் பகிருங்கள்'))}
    <div class="menu">
      <button data-go="muhurtham" data-param='{"category":"graha_pravesam","allFamily":true}'>${iconChip('muhurtham', { size: 20, cls: 'mi-icon' })}<span>${L('Choose dates for a family event (e.g. housewarming)', 'குடும்ப நிகழ்வுக்கு நாள் தேர்வு (எ.கா. கிரகப்பிரவேசம்)')}</span></button>
      <button data-go="journey">${iconChip('journey', { size: 20, cls: 'mi-icon' })}<span>${L('Plan a family temple journey', 'குடும்பக் கோவில் பயணம் திட்டமிடு')}</span></button>
      <button data-go="reminders">${iconChip('reminders', { size: 20, cls: 'mi-icon' })}<span>${L('Family reminders', 'குடும்ப நினைவூட்டல்கள்')}</span></button>
    </div>
    <div class="section-title">${L('Saved plans', 'சேமித்த திட்டங்கள்')}</div>
    ${saved || `<p class="muted">${L('No saved plans yet.', 'இன்னும் சேமித்த திட்டம் இல்லை.')}</p>`}
    <div class="card glass"><div class="card-title">🔒 ${L('Sharing & privacy', 'பகிர்வு & தனியுரிமை')}</div>
      <ul class="small">
        <li>${L('Each profile can be marked private: its chats and concerns stay on this phone and are never included in shared reports.', 'ஒவ்வொரு சுயவிவரத்தையும் “தனிப்பட்டது” எனக் குறிக்கலாம்: அதன் உரையாடல்களும் கவலைகளும் இந்தக் கைப்பேசியிலேயே இருக்கும்; பகிர்வில் சேராது.')}</li>
        <li>${L('Shared plans include names, dates and places only — never birth times or private questions.', 'பகிர்ந்த திட்டத்தில் பெயர், தேதி, இடம் மட்டுமே — பிறந்த நேரமோ தனிப்பட்ட கேள்விகளோ இல்லை.')}</li>
        <li>${L('Every share shows a preview first.', 'ஒவ்வொரு பகிர்வுக்கும் முதலில் முன்னோட்டம் காட்டப்படும்.')}</li>
        <li>${L('Children’s profiles are never shared outside the family and are not used for analytics.', 'குழந்தைகளின் சுயவிவரங்கள் குடும்பத்திற்கு வெளியே பகிரப்படாது; பகுப்பாய்வுக்குப் பயன்படுத்தப்படாது.')}</li>
      </ul></div>`;
}
registerScreen('familyplan', { render: renderFamilyPlan, parent: 'familyhub' });

/** Share preview: shows exactly what will leave the phone, then shares it. */
export function sharePreview(title, text) {
  const wrap = document.createElement('div');
  wrap.className = 'modal';
  wrap.innerHTML = `<div class="modal-card card glass" role="dialog" aria-modal="true" aria-labelledby="spTitle">
    <div class="card-title"><span id="spTitle">📤 ${L('Preview before sharing', 'பகிரும் முன் முன்னோட்டம்')}</span></div>
    <p class="small muted">${L('Only the text below will be shared. Birth times and private questions are never included.', 'கீழே உள்ள உரை மட்டுமே பகிரப்படும். பிறந்த நேரமும் தனிப்பட்ட கேள்விகளும் சேர்க்கப்படாது.')}</p>
    <pre class="share-pre">${esc(text)}</pre>
    <div class="btn-row"><button class="chip-btn" data-sp="cancel">${L('Cancel', 'ரத்து')}</button><button class="btn-gold" data-sp="ok">${L('Share', 'பகிர்')}</button></div></div>`;
  document.body.append(wrap);
  wrap.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-sp]');
    if (!b && e.target !== wrap) return;
    wrap.remove();
    if (b?.dataset.sp !== 'ok') return;
    if (navigator.share) { try { await navigator.share({ title, text }); return; } catch { /* cancelled */ return; } }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  });
}

export { ta, activeMember };
