// Hubs for the five-destination navigation: Family and Services tabs, plus "All tools".
// Existing feature screens are unchanged; they are just reached from one clear place.
import {
  state, $, $$, L, ta, esc, STATIC, api, toast, fmtIsoDate, needsServerCard, go, registerScreen, subHeader, saveFamily, copyright, detailed, saveSettings,
  activeMember, chartOf, displayName, nakName, rasiName, RELATIONS, bi, BRAND,
} from './core.js';
import { iconChip } from './icons.js';

/**
 * The feature catalogue. level 'simple' = shown in Simple view; 'advanced' = specialist tools.
 * status: 'device' works fully on the phone · 'server' needs the online server · 'sample' uses sample data.
 */
export const FEATURES = [
  // Today
  { id: 'panchangam', hub: 'home', en: 'Panchangam', ta: 'பஞ்சாங்கம்', level: 'simple' },
  { id: 'calendar', hub: 'home', en: 'Tamil calendar', ta: 'தமிழ் நாட்காட்டி', level: 'simple' },
  { id: 'vratham', hub: 'home', en: 'Viratha days', ta: 'விரத நாட்கள்', level: 'simple' },
  { id: 'reminders', hub: 'home', en: 'Alarms & reminders', ta: 'அலாரம் & நினைவூட்டல்', level: 'simple' },
  { id: 'weather', hub: 'home', en: 'Weather & travel', ta: 'வானிலை & பயணம்', level: 'simple' },
  { id: 'live', hub: 'home', en: 'Live sky & Horai', ta: 'நேரலை வானம் & ஓரை', level: 'advanced' },
  // My Chart
  { id: 'chart', hub: 'chart', en: 'My Jathagam', ta: 'என் ஜாதகம்', level: 'simple' },
  { id: 'analysis', hub: 'chart', en: 'Full chart reading', ta: 'முழு ஜாதக ஆய்வு', level: 'simple' },
  { id: 'parigaram', hub: 'chart', en: 'Parigaram (simple practices)', ta: 'பரிகாரம் (எளிய வழிபாடு)', level: 'simple' },
  { id: 'peyarchi', hub: 'chart', en: 'Guru / Sani / Rahu-Ketu transits', ta: 'குரு / சனி / ராகு-கேது பெயர்ச்சி', level: 'simple' },
  { id: 'roadmap', hub: 'chart', en: 'Life periods road map', ta: 'வாழ்க்கைக் கால வரைபடம்', level: 'advanced' },
  { id: 'life', hub: 'chart', en: 'Life questions — traditional timing', ta: 'வாழ்க்கைக் கேள்விகள் — பாரம்பரிய காலம்', level: 'advanced' },
  { id: 'health', hub: 'chart', en: 'Health & Planets — eat / avoid', ta: 'ஆரோக்கியம் & கிரகங்கள் — உணவு வழிகாட்டி', level: 'simple' },
  { id: 'guide', hub: 'chart', en: 'My guide — colour, number, Siddhar', ta: 'என் வழிகாட்டி — நிறம், எண், சித்தர்', level: 'advanced' },
  { id: 'vargas', hub: 'chart', en: 'Divisional charts & Ashtakavarga', ta: 'வர்க்கச் சக்கரங்கள் & அஷ்டகவர்க்கம்', level: 'advanced' },
  { id: 'numerology', hub: 'chart', en: 'Name & number numerology', ta: 'பெயர் & எண் கணிதம்', level: 'advanced' },
  { id: 'mantras', hub: 'chart', en: 'Mantras', ta: 'மந்திரங்கள்', level: 'simple' },
  // Family
  { id: 'family', hub: 'familyhub', en: 'Family profiles', ta: 'குடும்ப சுயவிவரங்கள்', level: 'simple' },
  { id: 'familyplan', hub: 'familyhub', en: 'Shared events & journeys', ta: 'பகிர்ந்த நிகழ்வுகள் & பயணங்கள்', level: 'simple' },
  { id: 'muhurtham', hub: 'familyhub', en: 'Muhurtham — choose dates', ta: 'முகூர்த்தம் — நாள் தேர்வு', level: 'simple' },
  { id: 'relations', hub: 'familyhub', en: 'Family relations today', ta: 'இன்று குடும்ப உறவு', level: 'simple' },
  { id: 'porutham', hub: 'familyhub', en: 'Star match (quick 10)', ta: 'நட்சத்திரப் பொருத்தம் (விரைவு 10)', level: 'simple' },
  { id: 'couple', hub: 'familyhub', en: 'Detailed marriage matching', ta: 'விரிவான திருமணப் பொருத்தம்', level: 'simple' },
  { id: 'starbday', hub: 'familyhub', en: 'Star birthdays & 60th/80th', ta: 'நட்சத்திரப் பிறந்தநாள் & சஷ்டியப்தபூர்த்தி', level: 'simple' },
  { id: 'thivasam', hub: 'familyhub', en: 'Thivasam / tharpanam', ta: 'திவசம் / தர்ப்பணம்', level: 'simple' },
  { id: 'names', hub: 'familyhub', en: 'Baby name letters', ta: 'குழந்தை பெயர் எழுத்துகள்', level: 'simple' },
  { id: 'gunamilan', hub: 'familyhub', en: '36 Guna Milan (North Indian)', ta: '36 குண மிலன் (வட இந்திய முறை)', level: 'advanced' },
  { id: 'partners', hub: 'familyhub', en: 'Business partner match', ta: 'வணிகக் கூட்டாளி பொருத்தம்', level: 'advanced' },
  { id: 'ruthu', hub: 'familyhub', en: 'Ruthu / Manjal Neerattu', ta: 'ருது / மஞ்சள் நீராட்டு', level: 'advanced' },
  // Ask
  { id: 'chat', hub: 'chat', en: 'Ask Thunai', ta: 'துணையிடம் கேளுங்கள்', level: 'simple' },
  { id: 'ask', hub: 'chat', en: 'Is now a good time? (Prasnam)', ta: 'இப்போது செய்யலாமா? (பிரசன்னம்)', level: 'simple' },
  // Services
  { id: 'journey', hub: 'services', en: 'My Spiritual Journey', ta: 'என் ஆன்மீகப் பயணம்', level: 'simple' },
  { id: 'temples', hub: 'services', en: 'Temples & traditions', ta: 'கோவில்கள் & மரபுகள்', level: 'simple' },
  { id: 'packages', hub: 'services', en: 'Yatra packages', ta: 'யாத்திரை பேக்கேஜ்', level: 'simple', status: 'server' },
  { id: 'seva', hub: 'services', en: 'Temple seva requests', ta: 'கோவில் சேவை கோரிக்கை', level: 'simple', status: 'server' },
  { id: 'priests', hub: 'services', en: 'Priest requests', ta: 'புரோகிதர் கோரிக்கை', level: 'simple', status: 'server' },
  { id: 'bookings', hub: 'services', en: 'My bookings — status & cancel', ta: 'என் முன்பதிவுகள் — நிலை & ரத்து', level: 'simple', status: 'server' },
  { id: 'consult', hub: 'services', en: 'Talk to a human astrologer', ta: 'ஜோதிடருடன் நேரில் பேச', level: 'simple', status: 'server' },
  { id: 'store', hub: 'services', en: 'Pooja store', ta: 'பூஜைக் கடை', level: 'advanced', status: 'sample' },
  { id: 'plans', hub: 'services', en: 'Premium & Family plans', ta: 'பிரீமியம் & குடும்பத் திட்டங்கள்', level: 'simple' },
];

const statusBadge = (f) => (f.status === 'server' && STATIC ? `<span class="badge unv">${L('Not available yet', 'இன்னும் இல்லை')}</span>`
  : f.status === 'sample' ? `<span class="badge est">${L('Sample — not for sale', 'மாதிரி — விற்பனைக்கு இல்லை')}</span>` : '');

function featureList(hub, { includeAdvanced = detailed() } = {}) {
  const items = FEATURES.filter((f) => (!hub || f.hub === hub) && (includeAdvanced || f.level === 'simple'));
  return `<div class="menu">${items.map((f) => `<button data-go="${f.id}">${iconChip(f.id, { size: 20, cls: 'mi-icon' })}<span>${esc(L(f.en, f.ta))} ${statusBadge(f)}</span></button>`).join('')}</div>`;
}

/** Simple / Detailed switch used on hubs. */
export function viewToggle() {
  return `<div class="set-row view-toggle"><span>${L('View', 'காட்சி')}</span><div class="seg" role="group" aria-label="${L('Simple or detailed view', 'எளிய / விரிவான காட்சி')}">
    <button data-viewmode="simple" class="${detailed() ? '' : 'sel'}" aria-pressed="${!detailed()}">${L('Simple', 'எளியது')}</button>
    <button data-viewmode="detailed" class="${detailed() ? 'sel' : ''}" aria-pressed="${detailed()}">${L('Detailed', 'விரிவானது')}</button></div></div>`;
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-viewmode]');
  if (!b) return;
  state.settings.view = b.dataset.viewmode;
  saveSettings();
  go(state.view, state.params);
});

// ================================================================ ALL TOOLS
function renderTools(sec) {
  const hubs = [['home', 'Today', 'இன்று'], ['chart', 'My Chart', 'என் ஜாதகம்'], ['familyhub', 'Family', 'குடும்பம்'], ['chat', 'Ask', 'கேளுங்கள்'], ['services', 'Services', 'சேவைகள்']];
  sec.innerHTML = `${subHeader(L('All tools', 'அனைத்து கருவிகள்'), L('Every feature, grouped by where it lives', 'அனைத்து வசதிகளும், பிரிவு வாரியாக'), 'home')}
    ${viewToggle()}
    <label class="sr-only" for="toolSearch">${L('Search tools', 'கருவிகளைத் தேடு')}</label>
    <input id="toolSearch" placeholder="${esc(L('Search: porutham, temple, dasa…', 'தேடு: பொருத்தம், கோவில், தசை…'))}" autocomplete="off">
    <div id="toolGroups">${hubs.map(([h, en, tx]) => `<div class="section-title">${L(en, tx)}</div>${featureList(h)}`).join('')}</div>
    ${detailed() ? '' : `<p class="small muted center">${L('Specialist tools (divisional charts, numerology, Guna Milan…) appear in Detailed view.', 'சிறப்புக் கருவிகள் (வர்க்கச் சக்கரம், எண் கணிதம், குண மிலன்…) விரிவான காட்சியில் தெரியும்.')}</p>`}`;
  $('#toolSearch').addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    $$('#toolGroups .menu button', sec).forEach((b) => { b.hidden = q && !b.textContent.toLowerCase().includes(q); });
  });
}
registerScreen('tools', { render: renderTools, parent: 'home' });

// ================================================================ FAMILY HUB
function renderFamilyHub(sec) {
  const fam = state.family;
  const people = fam.filter((m) => m.relation !== 'organization');
  sec.innerHTML = `<div class="sub-head"><div><h2>${L('Family', 'குடும்பம்')}</h2><p class="muted small">${L(`Up to 8 profiles on the ${BRAND.familyEn} plan · private by default`, `${BRAND.familyTa} திட்டத்தில் 8 பேர் வரை · இயல்பாகத் தனிப்பட்டது`)}</p></div></div>
    <div class="card glass">
      <div class="card-title"><span>👨‍👩‍👧 ${L('Profiles', 'சுயவிவரங்கள்')} (${people.length}/8)</span><button class="link-btn" data-go="family">${L('Manage', 'நிர்வகி')}</button></div>
      ${fam.length ? fam.map((m) => { const c = chartOf(m); return `<button class="fam-row${m.id === state.activeId ? ' active' : ''}" data-id="${esc(m.id)}">
        <span class="avatar">${esc(([...displayName(m)][0] || '').toUpperCase())}</span>
        <span class="fam-name">${esc(displayName(m))}${m.private ? ' 🔒' : ''}<small>${esc(bi(RELATIONS.find((r) => r.id === m.relation) || RELATIONS[6]))} · ${esc(nakName(c.janmaNakshatra.index))} · ${esc(rasiName(c.janmaRasi.index))}</small></span>
        ${m.id === state.activeId ? `<span class="tag good">${L('Active', 'தேர்வு')}</span>` : ''}</button>`; }).join('')
    : `<p class="muted">${L('No profiles yet. The calendar works without one; add birth details for personal guidance.', 'இன்னும் சுயவிவரம் இல்லை. நாட்காட்டிக்குத் தேவையில்லை; தனிப்பட்ட வழிகாட்டலுக்குப் பிறப்பு விவரம் சேர்க்கவும்.')}</p>`}
      ${people.length < 8 ? `<button class="btn-gold" data-go="family" data-param='{"add":true}'>➕ ${L('Add a family member', 'குடும்ப உறுப்பினர் சேர்')}</button>` : `<p class="small muted">${L('8 of 8 profiles used.', '8 சுயவிவரங்களும் பயன்பாட்டில்.')}</p>`}
    </div>
    ${viewToggle()}
    ${featureList('familyhub')}
    <div class="note-box">${L('Matching results are traditional interpretations to support a family conversation. They are never a verdict on anyone’s worth or suitability.', 'பொருத்த முடிவுகள் குடும்ப உரையாடலுக்கு உதவும் பாரம்பரிய விளக்கம் மட்டுமே. யாருடைய மதிப்பையும் தகுதியையும் தீர்மானிப்பவை அல்ல.')}</div>
    ${copyright()}`;
  $$('.fam-row', sec).forEach((r) => r.addEventListener('click', () => { state.activeId = r.dataset.id; saveFamily(); renderFamilyHub(sec); }));
}
registerScreen('familyhub', { render: renderFamilyHub });

// ================================================================ SERVICES HUB
function renderServices(sec) {
  sec.innerHTML = `<div class="sub-head"><div><h2>${L('Services', 'சேவைகள்')}</h2><p class="muted small">${L('Temple journeys, worship and people who can help', 'கோவில் பயணம், வழிபாடு, உதவக்கூடியவர்கள்')}</p></div></div>
    <button class="card glass cta-card journey-cta" data-go="journey"><b>🛕 ${L('My Spiritual Journey', 'என் ஆன்மீகப் பயணம்')}</b>
      <span class="small muted">${L('Three honest options — nearby, matching your leave, or worship close to home — with sources and estimates clearly labelled.', 'மூன்று நேர்மையான வழிகள் — அருகில், உங்கள் விடுப்புக்கு ஏற்ப, அல்லது வீட்டருகே வழிபாடு — ஆதாரமும் மதிப்பீடும் தெளிவாக.')}</span></button>
    ${viewToggle()}
    ${featureList('services')}
    <div class="card glass"><div class="card-title">🤝 ${L('Our commitments', 'எங்கள் உறுதிமொழி')}</div>
      <ul class="small">
        <li>${L('Payment never changes which temples we suggest.', 'கட்டணம் எந்தக் கோவிலைப் பரிந்துரைப்போம் என்பதை மாற்றாது.')}</li>
        <li>${L('Any booking commission or partner relationship is shown before you pay.', 'முன்பதிவுக் கமிஷன் அல்லது கூட்டாளர் உறவு கட்டணத்திற்கு முன் காட்டப்படும்.')}</li>
        <li>${L('Bookings are offered only where someone can actually fulfil them.', 'நிறைவேற்றக்கூடிய இடங்களில் மட்டுமே முன்பதிவு வழங்கப்படும்.')}</li>
        <li>${L('No remedy is sold with fear, and none promises a cure or guaranteed result.', 'பயமுறுத்தி எந்தப் பரிகாரமும் விற்கப்படாது; குணமாகும் / உறுதியான பலன் என வாக்களிக்கப்படாது.')}</li>
      </ul></div>
    ${copyright()}`;
}
registerScreen('services', { render: renderServices });

// ================================================================ MY BOOKINGS (fulfilment tracking)
const STEP = {
  requested: ['Requested', 'கோரப்பட்டது'], confirmed: ['Confirmed', 'உறுதி'], assigned: ['Priest / partner assigned', 'புரோகிதர் / கூட்டாளர் நியமனம்'],
  accepted: ['Accepted by the priest', 'புரோகிதர் ஏற்றார்'], declined: ['Priest unavailable — being reassigned', 'புரோகிதர் இயலவில்லை — மீண்டும் நியமனம்'],
  completed: ['Completed', 'நிறைவு'], cancelled: ['Cancelled', 'ரத்து'],
};
const stepName = (st) => L(...(STEP[st] || [st, st]));
const fmtAt = (t) => new Date(t).toLocaleString(ta() ? 'ta-IN' : 'en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

async function renderBookings(sec) {
  sec.innerHTML = `${subHeader(L('My bookings', 'என் முன்பதிவுகள்'), L('Every request with its status history', 'ஒவ்வொரு கோரிக்கையும் அதன் நிலை வரலாற்றுடன்'))}<div id="bkBody"></div>`;
  const body = $('#bkBody');
  if (STATIC) { body.innerHTML = needsServerCard(L('Seva, priest and yatra requests are tracked by the online server.', 'சேவை, புரோகிதர், யாத்திரைக் கோரிக்கைகள் இணைய சேவையகத்தால் கண்காணிக்கப்படும்.')); return; }
  if (!state.user) { body.innerHTML = `<div class="card glass cta-card" data-go="login">${L('Sign in to see your bookings', 'உங்கள் முன்பதிவுகளைப் பார்க்க உள்நுழையவும்')} ›</div>`; return; }
  let requests = [];
  try { ({ requests } = await api('/api/requests')); } catch (e) { body.innerHTML = `<p class="muted">${esc(e.message)}</p>`; return; }
  if (!requests.length) { body.innerHTML = `<p class="muted">${L('No bookings yet.', 'இன்னும் முன்பதிவு இல்லை.')}</p><button class="btn-soft" data-go="seva">🛕 ${L('Request a seva', 'சேவை கோரு')}</button>`; return; }
  body.innerHTML = requests.map((r) => `<article class="card glass">
      <div class="card-title"><span>${esc(r.service || r.type)} · ${fmtIsoDate(r.date)}</span><span class="badge ${r.status === 'completed' ? 'ok' : r.status === 'cancelled' ? 'unv' : 'est'}">${esc(stepName(r.status))}</span></div>
      <ol class="bk-timeline">${(r.history?.length ? r.history : [{ status: r.status, at: r.updatedAt }]).map((h) => `<li><b>${esc(stepName(h.status))}</b> <span class="muted small">${fmtAt(h.at)}</span></li>`).join('')}</ol>
      ${['requested', 'confirmed', 'assigned'].includes(r.status) ? `<button class="chip-btn" data-cancel="${esc(r.id)}">✕ ${L('Cancel this request', 'இந்தக் கோரிக்கையை ரத்து செய்')}</button>` : ''}
    </article>`).join('') + `<p class="small muted">${L('You get a notification when the status changes (if notifications are switched on).', 'நிலை மாறும்போது அறிவிப்பு வரும் (அறிவிப்புகள் இயக்கத்தில் இருந்தால்).')}</p>`;
  $$('[data-cancel]', sec).forEach((b) => b.addEventListener('click', async () => {
    if (!confirm(L('Cancel this request?', 'இந்தக் கோரிக்கையை ரத்து செய்யவா?'))) return;
    try { await api(`/api/requests/${b.dataset.cancel}/cancel`, { method: 'POST' }); toast(L('Request cancelled', 'கோரிக்கை ரத்து செய்யப்பட்டது')); renderBookings(sec); } catch (e) { toast(e.message); }
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
  const plans = (JSON.parse(localStorage.getItem('kj_plans') || '[]'));
  sec.innerHTML = `${subHeader(L('Shared events & journeys', 'பகிர்ந்த நிகழ்வுகள் & பயணங்கள்'), L('Plan together — share only what is needed', 'சேர்ந்து திட்டமிடுங்கள் — தேவையானதை மட்டும் பகிருங்கள்'))}
    <div class="menu">
      <button data-go="muhurtham" data-param='{"category":"graha_pravesam","allFamily":true}'>${iconChip('muhurtham', { size: 20, cls: 'mi-icon' })}<span>${L('Choose dates for a family event (e.g. housewarming)', 'குடும்ப நிகழ்வுக்கு நாள் தேர்வு (எ.கா. கிரகப்பிரவேசம்)')}</span></button>
      <button data-go="journey">${iconChip('journey', { size: 20, cls: 'mi-icon' })}<span>${L('Plan a family temple journey', 'குடும்பக் கோவில் பயணம் திட்டமிடு')}</span></button>
      <button data-go="reminders">${iconChip('reminders', { size: 20, cls: 'mi-icon' })}<span>${L('Family reminders', 'குடும்ப நினைவூட்டல்கள்')}</span></button>
    </div>
    <div class="section-title">${L('Saved plans', 'சேமித்த திட்டங்கள்')}</div>
    ${plans.length ? plans.map((p) => `<button class="card glass plan-row" data-go="journey" data-param='${esc(JSON.stringify({ open: p.id }))}'><b>${esc(p.title)}</b><span class="muted small">${esc(p.dates || '')} · ${esc((p.travellers || []).join(', '))}</span></button>`).join('')
    : `<p class="muted">${L('No saved plans yet.', 'இன்னும் சேமித்த திட்டம் இல்லை.')}</p>`}
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
