// Thunai screens added with the five-destination navigation (brief §8, §9, §26–§28):
//  • Plan hub (திட்டம்) — every planning tool in one place
//  • Practical safety cards ('safeguards') — the practical stream, never astrology
//  • Marriage matching ('matching') — adult eligibility, consent of both, five cards, Ashtakoota separate
//  • Temple trip planner ('templeplan') — free/local prayer first, then low-cost, trips, packages
import { practicalSafeguards, INDICATORS, SAFEGUARD_SOURCES } from './shared/safeguards.js';
import { MARRIAGE_MODES, createConsentLedger, recordConsent, buildMatchingReport } from './shared/marriage-context.js';
import { planTempleTrip } from './shared/temple-planner.js';
import { TEMPLE_TAGS } from './shared/temples.js';
import { ageOn } from './shared/datetime.js';
import {
  state, $, $$, L, esc, bi, registerScreen, subHeader, chartOf, displayName, toast, store, nakName, rasiName,
  placeName, todayIsoFor, precisionOf, birthArgs, activeMember, planetName,
} from './core.js';
import { birthChart } from './shared/astro.js';
import { icon, iconChip } from './icons.js';
import { placeSearch } from './account.js';
import { fetchWeather } from './screens-world.js';

const txt = (v) => (v == null ? '' : typeof v === 'string' ? v : bi(v));
const tiles = (list) => `<div class="tiles">${list.map(([id, en, tx]) => `<button class="tile" data-go="${id}">${iconChip(id, { size: 22, cls: 'ti-icon' })}<span>${esc(L(en, tx))}</span></button>`).join('')}</div>`;

// ================================================================ PLAN HUB
const PLAN_GROUPS = [
  [['Decide & choose a time', 'முடிவும் நேரமும்'], [
    ['muhurtham', 'Muhurtham finder', 'முகூர்த்தம் தேடல்'], ['ask', 'Prasnam — do or don\'t?', 'பிரசன்னம் — செய்யலாமா?'],
    ['calendar', 'Tamil calendar', 'தமிழ் நாட்காட்டி'], ['panchangam', 'Panchangam', 'பஞ்சாங்கம்'],
    ['vratham', 'Viratha days', 'விரத நாட்கள்'], ['ruthu', 'Ruthu & Manjal Neerattu', 'ருது & மஞ்சள் நீராட்டு'], ['reminders', 'Alarm & reminders', 'அலாரம் & நினைவூட்டல்'],
  ]],
  [['Travel & temples', 'பயணமும் கோவில்களும்'], [
    ['templeplan', 'Temple trip planner', 'கோவில் பயணத் திட்டம்'], ['temples', 'Temples near you', 'அருகிலுள்ள கோவில்கள்'],
    ['weather', 'Weather & travel', 'வானிலை & பயணம்'], ['packages', 'Yatra packages', 'யாத்திரை பேக்கேஜ்கள்'],
  ]],
  [['Practical safety', 'நடைமுறைப் பாதுகாப்பு'], [
    ['safeguards', 'Safety cards — travel, money, relationships', 'பாதுகாப்பு அட்டைகள் — பயணம், பணம், உறவுகள்'],
  ]],
  [['Prayer & practice (optional)', 'வழிபாடு (விருப்பம்)'], [
    ['parigaram', 'Free parigaram', 'இலவச பரிகாரம்'], ['mantras', 'Mantras', 'மந்திரங்கள்'],
  ]],
  [['Services', 'சேவைகள்'], [
    ['seva', 'Temple seva', 'கோவில் சேவைகள்'], ['priests', 'Priests', 'புரோகிதர்கள்'], ['store', 'Pooja store', 'பூஜைக் கடை'],
  ]],
];
function renderPlan(sec) {
  sec.innerHTML = `<h2 class="screen-title">${L('Plan', 'திட்டம்')}</h2>
    <p class="muted small">${L('Plan days, trips and family events. Real deadlines always come first; traditional timings are optional.', 'நாட்கள், பயணங்கள், குடும்ப நிகழ்வுகளைத் திட்டமிடுங்கள். உண்மையான காலக்கெடுவே முதன்மை; மரபு நேரங்கள் விருப்பத்திற்குரியவை.')}</p>
    ${PLAN_GROUPS.map(([[en, tx], list]) => `<div class="section-title">${L(en, tx)}</div>${tiles(list)}`).join('')}`;
}
registerScreen('plan', { render: renderPlan });

// ================================================================ PRACTICAL SAFETY CARDS
const SG_CHECKS = [
  ['relationship_money', 'pressure_to_transfer'], ['relationship_money', 'secrecy_requested'],
  ['relationship_money', 'identity_not_verified'], ['relationship_money', 'asked_for_credentials'],
  ['relationship_money', 'credentials_shared'],
];
const SG_URGENT = { id: 'urgent_medical', en: 'Someone needs urgent medical help or is in immediate danger', ta: 'யாருக்காவது அவசர மருத்துவ உதவி தேவை / உடனடி ஆபத்து' };
const sgUi = { checked: new Set(), weather: null };
const URGENCY = { routine: ['Everyday care', 'அன்றாடக் கவனம்'], elevated: ['Take extra care now', 'இப்போது கூடுதல் கவனம்'], urgent: ['Act now', 'உடனே செயல்படுங்கள்'] };
const SG_ICON = { travel: 'car', relationship_money: 'coins', relationship_boundaries: 'users' };

function renderSafeguards(sec) {
  const indicators = { travel: [], relationship_money: [], relationship_boundaries: [] };
  for (const [sit, id] of SG_CHECKS) if (sgUi.checked.has(id)) indicators[sit].push(id);
  if (sgUi.checked.has(SG_URGENT.id)) for (const k of Object.keys(indicators)) indicators[k].push(SG_URGENT.id);
  const cards = practicalSafeguards({ indicators, weather: sgUi.weather, locale: state.lang });
  const route = cards.find((c) => c.safetyRoute)?.safetyRoute;
  const urgent = cards.some((c) => c.urgencyFromPracticalEvidence === 'urgent');
  const helpSources = route ? route.sourceIds.map((id) => SAFEGUARD_SOURCES[id]).filter(Boolean) : [];
  if (urgent && !route) helpSources.push(...cards.flatMap((c) => c.sources).filter((s) => s.needsVerification && !helpSources.includes(s)));
  sec.innerHTML = `${subHeader(L('Practical safety', 'நடைமுறைப் பாதுகாப்பு'), L('Travel, money and relationships — the same on every day, for everyone, whatever any chart says', 'பயணம், பணம், உறவுகள் — எந்த ஜாதகம் என்ன சொன்னாலும், எல்லோருக்கும், ஒவ்வொரு நாளும் ஒரே மாதிரி'))}
    ${urgent || route ? `<div class="card glass help-route" role="alert"><div class="card-title">${icon('alert', { size: 18 })} ${L('Help first', 'முதலில் உதவி')}</div>
      ${route ? `<p><b>${esc(bi(route.message))}</b></p>` : ''}
      ${helpSources.map((s) => `<p class="small">📞 <a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(bi(s.title))}</a>${s.needsVerification ? ` <span class="chip-review">${L('needs verification', 'சரிபார்க்க வேண்டும்')}</span>` : ''}</p>`).join('')}
      <p class="small">${L('Please verify the local emergency number where you are.', 'நீங்கள் இருக்கும் இடத்தின் அவசர எண்ணைச் சரிபார்க்கவும்.')}</p></div>` : ''}
    <form class="card glass" id="sgForm"><fieldset><legend class="card-title">${L('Anything happening? (optional)', 'ஏதாவது நடக்கிறதா? (விருப்பம்)')}</legend>
      <p class="muted small">${L('Tick only what applies. Nothing here is saved or sent.', 'பொருந்துவதை மட்டும் குறியிடுங்கள். இங்கே எதுவும் சேமிக்கப்படவோ அனுப்பப்படவோ இல்லை.')}</p>
      ${SG_CHECKS.map(([sit, id]) => `<label class="check-row"><input type="checkbox" value="${id}"${sgUi.checked.has(id) ? ' checked' : ''}> ${esc(bi(INDICATORS[sit][id]))}</label>`).join('')}
      <label class="check-row"><input type="checkbox" value="${SG_URGENT.id}"${sgUi.checked.has(SG_URGENT.id) ? ' checked' : ''}> ${esc(L(SG_URGENT.en, SG_URGENT.ta))}</label>
    </fieldset></form>
    <p class="notice small">🔒 ${esc(bi(cards[0].neverAsk[0]))}</p>
    ${cards.map((c) => `<section class="card glass sg-card" aria-labelledby="sg-${c.situationId}">
      <div class="card-title"><span id="sg-${c.situationId}">${icon(SG_ICON[c.situationId] || 'shield', { size: 18 })} ${esc(bi(c.title))}</span><span class="pill">${esc(L(...URGENCY[c.urgencyFromPracticalEvidence]))}</span></div>
      ${c.alert ? `<p class="notice small">${esc(bi(c.alert))}</p>` : ''}
      ${c.weatherStatus ? `<p class="muted small">${esc(bi(c.weatherStatus))}</p>` : ''}
      <ul class="sg-actions">${c.recommendedActions.map((a) => `<li${a.priority === 'now' ? ' class="now"' : ''}>${a.priority === 'now' ? `<b>${L('Now', 'இப்போது')}:</b> ` : ''}${esc(bi(a))}</li>`).join('')}</ul>
      ${c.behaviourNote ? `<p class="small">${esc(bi(c.behaviourNote))}</p>` : ''}
      ${c.noAstrologyConfrontation ? `<p class="small">${esc(bi(c.noAstrologyConfrontation))}</p>` : ''}
      ${(Array.isArray(c.respectfulGuidance) ? c.respectfulGuidance : [c.respectfulGuidance]).filter(Boolean).map((g) => `<p class="small muted">“${esc(bi(g))}”</p>`).join('')}
      <details class="why"><summary>${L('Sources', 'ஆதாரங்கள்')}</summary>
        ${c.sources.map((s) => `<p class="small"><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(bi(s.title))}</a> · ${s.id === 'open_meteo_forecast' && c.sourceCheckedAt ? `${L('checked', 'சரிபார்த்தது')} ${new Date(c.sourceCheckedAt).toLocaleString(state.lang === 'ta' ? 'ta-IN' : 'en-IN')}` : s.verified ? L('named in the product brief; check date not recorded', 'தயாரிப்பு ஆவணத்தில் குறிப்பிடப்பட்டது; சரிபார்த்த தேதி பதிவில் இல்லை') : `<span class="chip-review">${L('needs verification', 'சரிபார்க்க வேண்டும்')}</span>`}</p>`).join('')}
        <p class="muted small">${esc(bi(c.separationNote))}</p></details>
    </section>`).join('')}`;
  $$('#sgForm input', sec).forEach((i) => i.addEventListener('change', () => {
    if (i.checked) sgUi.checked.add(i.value); else sgUi.checked.delete(i.value);
    renderSafeguards(sec);
    $('#sgForm', sec)?.scrollIntoView({ block: 'nearest' });
  }));
  if (!sgUi.weather && state.loc) {
    fetchWeather(state.loc.lat, state.loc.lon).then((w) => {
      sgUi.weather = { ...w, checkedAt: new Date().toISOString() };
      if (state.view === 'safeguards') renderSafeguards(sec);
    }).catch(() => {});
  }
}
registerScreen('safeguards', { render: renderSafeguards, parent: 'plan' });

// ================================================================ MARRIAGE MATCHING (brief §27–§28)
const MODE_IDS = Object.keys(MARRIAGE_MODES);
const mt = {
  step: 1,
  people: [
    { slot: 'a', mode: 'first', historyPrivate: false, src: null, memberId: null, name: '', date: '', time: '', precision: 'exact', place: '', lat: null, lon: null, tz: 5.5 },
    { slot: 'b', mode: 'first', historyPrivate: false, src: null, memberId: null, name: '', date: '', time: '', precision: 'exact', place: '', lat: null, lon: null, tz: 5.5 },
  ],
  consent: { a: false, b: false, share: false, privateOnly: false },
  view: 'short',
  report: null,
};
const pool = () => state.family.filter((m) => m.relation !== 'organization');
const personLabel = (i) => L(i ? 'Person B' : 'Person A', i ? 'நபர் ஆ' : 'நபர் அ');
const nameOf = (p, i) => {
  if (p.src === 'family') { const m = pool().find((x) => x.id === p.memberId); if (m) return displayName(m); }
  return p.name?.trim() || personLabel(i);
};
const stepper = () => `<ol class="stepper" aria-label="${esc(L('Steps', 'படிகள்'))}">${[L('Situation', 'சூழல்'), L('Birth details', 'பிறப்பு விவரம்'), L('Adults & consent', 'வயது & ஒப்புதல்'), L('Report', 'அறிக்கை')].map((t, i) => `<li${mt.step === i + 1 ? ' aria-current="step" class="on"' : mt.step > i + 1 ? ' class="done"' : ''}>${i + 1}. ${t}</li>`).join('')}</ol>`;

function stepModes() {
  return mt.people.map((p, i) => `<fieldset class="card glass"><legend class="card-title">${personLabel(i)}</legend>
    <p class="muted small">${L('Real-life context chosen by each person — never derived from a chart, and it does not change any traditional factor.', 'ஒவ்வொருவரும் தேர்வு செய்யும் வாழ்க்கைச் சூழல் — ஜாதகத்திலிருந்து அல்ல; எந்த மரபுக் காரணியையும் மாற்றாது.')}</p>
    ${MODE_IDS.map((id) => `<label class="check-row"><input type="radio" name="mode-${p.slot}" value="${id}"${p.mode === id ? ' checked' : ''}> ${esc(bi(MARRIAGE_MODES[id]))}</label>`).join('')}
    <label class="check-row"><input type="checkbox" data-hist="${p.slot}"${p.historyPrivate ? ' checked' : ''}> ${L('Keep marriage history private', 'திருமண வரலாற்றைத் தனிப்பட்டதாக வைக்கவும்')}</label></fieldset>`).join('')
    + `<button class="btn-gold" data-next="2">${L('Next', 'அடுத்து')} ›</button>`;
}

function stepPeople() {
  const fam = pool();
  return mt.people.map((p, i) => {
    if (!p.src) p.src = fam.length ? 'family' : 'new';
    if (p.src === 'family' && !fam.some((m) => m.id === p.memberId)) p.memberId = fam[Math.min(i, fam.length - 1)]?.id || null;
    return `<div class="card glass mt-person" data-slot="${p.slot}"><div class="card-title">${personLabel(i)}</div>
      ${fam.length ? `<div class="seg" role="group"><button type="button" data-src="family" class="${p.src === 'family' ? 'sel' : ''}" aria-pressed="${p.src === 'family'}">${L('From family', 'குடும்பத்திலிருந்து')}</button><button type="button" data-src="new" class="${p.src === 'new' ? 'sel' : ''}" aria-pressed="${p.src === 'new'}">${L('Enter details', 'விவரம் உள்ளிடு')}</button></div>` : ''}
      ${p.src === 'family' && fam.length ? `<label>${L('Person', 'நபர்')}<select data-f="memberId">${fam.map((m) => `<option value="${esc(m.id)}"${m.id === p.memberId ? ' selected' : ''}>${esc(displayName(m))}</option>`).join('')}</select></label>`
    : `<label>${L('Name', 'பெயர்')}<input data-f="name" maxlength="60" value="${esc(p.name)}"></label>
        <label>${L('Date of birth', 'பிறந்த தேதி')}<input type="date" data-f="date" value="${esc(p.date)}"></label>
        <label>${L('Birth time', 'பிறந்த நேரம்')}<select data-f="precision">${[['exact', 'Exact', 'சரியானது'], ['approximate', 'Approximate', 'தோராயம்'], ['unknown', 'Unknown', 'தெரியாது']].map(([v, en, tx]) => `<option value="${v}"${p.precision === v ? ' selected' : ''}>${L(en, tx)}</option>`).join('')}</select></label>
        ${p.precision === 'unknown' ? '' : `<label>${L('Time', 'நேரம்')}<input type="time" data-f="time" value="${esc(p.time)}"></label>`}
        <label class="place-wrap">${L('Place of birth', 'பிறந்த இடம்')}<input data-f="place" value="${esc(p.place)}" placeholder="${esc(L('Type a city…', 'நகரம் தட்டச்சு செய்க…'))}"><ul class="suggest" hidden></ul></label>
        ${p.lat != null ? `<p class="muted small">📍 ${esc(placeName(p.place))} · UTC${p.tz >= 0 ? '+' : ''}${p.tz}</p>` : ''}
        <p class="muted small">${L('Used only for this comparison; not added to your family list.', 'இந்த ஒப்பீட்டுக்கு மட்டும்; உங்கள் குடும்பப் பட்டியலில் சேர்க்கப்படாது.')}</p>`}
    </div>`;
  }).join('') + `<p class="muted small">${L('A chart screenshot is not used — Thunai recomputes from the confirmed birth details.', 'ஜாதகத் திரைப்பிடிப்பு பயன்படுத்தப்படாது — உறுதிப்படுத்திய பிறப்பு விவரங்களிலிருந்து மீண்டும் கணிக்கப்படும்.')}</p>
    <div class="btn-row"><button class="chip-btn" data-next="1">‹ ${L('Back', 'பின்')}</button><button class="btn-gold" data-next="3">${L('Next', 'அடுத்து')} ›</button></div><p class="err" id="mtErr" role="alert"></p>`;
}

/** Resolved participant: { id, name, birthDate, chart, certainty } or throws a friendly message. */
function resolvePerson(p, i) {
  if (p.src === 'family') {
    const m = pool().find((x) => x.id === p.memberId);
    if (!m) throw new Error(L('Please choose a family member.', 'குடும்ப உறுப்பினரைத் தேர்வு செய்யவும்.'));
    return { id: p.slot, name: displayName(m), birthDate: m.date, chart: chartOf(m), birthTimeCertainty: precisionOf(m), refDate: todayIsoFor(m) };
  }
  if (!p.date || p.lat == null || (p.precision !== 'unknown' && !p.time)) throw new Error(L(`${personLabel(i)}: please enter the birth date, time (or "Unknown") and pick the place from the list.`, `${personLabel(i)}: பிறந்த தேதி, நேரம் (அல்லது "தெரியாது"), இடம் (பட்டியலிலிருந்து) உள்ளிடவும்.`));
  const rec = { name: p.name || personLabel(i), date: p.date, time: p.precision === 'unknown' ? '' : (p.time.length === 5 ? `${p.time}:00` : p.time), timePrecision: p.precision, lat: p.lat, lon: p.lon, tz: p.tz, place: p.place };
  return { id: p.slot, name: rec.name, birthDate: p.date, chart: birthChart(birthArgs(rec)), birthTimeCertainty: p.precision, refDate: todayIsoFor(null) };
}

function stepConsent() {
  let people;
  try { people = mt.people.map(resolvePerson); } catch (e) { return `<p class="err" role="alert">${esc(e.message)}</p><button class="chip-btn" data-next="2">‹ ${L('Back', 'பின்')}</button>`; }
  const ages = people.map((p) => ageOn(p.birthDate, p.refDate));
  return `<div class="card glass"><div class="card-title">${L('Both people must be adults', 'இருவரும் வயது வந்தவர்களாக இருக்க வேண்டும்')}</div>
      ${people.map((p, i) => `<div class="factor"><span>${esc(nameOf(mt.people[i], i))}</span><b class="zero">${ages[i] == null ? '—' : L(`${ages[i]} yrs`, `${ages[i]} வயது`)}</b></div>`).join('')}
      <p class="muted small">${L('Age is calculated from the birth date (calendar years). 18 is only a baseline — legal marriage eligibility depends on where the marriage happens.', 'வயது பிறந்த தேதியிலிருந்து (நாட்காட்டி ஆண்டுகள்) கணிக்கப்படுகிறது. 18 அடிப்படை வரம்பு மட்டுமே — சட்டத் தகுதி திருமணம் நடக்கும் இடத்தைப் பொறுத்தது.')}</p></div>
    <fieldset class="card glass"><legend class="card-title">${L('Consent', 'ஒப்புதல்')}</legend>
      <p class="muted small">${L('Both adults should agree before their details are compared, saved or shared. An uploaded chart is not consent.', 'விவரங்களை ஒப்பிட, சேமிக்க, பகிர இருவரும் ஒப்புக்கொள்ள வேண்டும். பதிவேற்றிய ஜாதகம் ஒப்புதல் அல்ல.')}</p>
      ${people.map((p, i) => `<label class="check-row"><input type="checkbox" data-consent="${p.id}"${mt.consent[p.id] ? ' checked' : ''}${mt.consent.privateOnly ? ' disabled' : ''}> ${L(`I have permission from ${nameOf(mt.people[i], i)}`, `${nameOf(mt.people[i], i)} அவர்களிடம் அனுமதி பெற்றுள்ளேன்`)}</label>`).join('')}
      <label class="check-row"><input type="checkbox" data-consent="share"${mt.consent.share ? ' checked' : ''}${mt.consent.privateOnly ? ' disabled' : ''}> ${L('Both also agree that the report may be saved, shared and exported', 'அறிக்கையைச் சேமிக்க, பகிர, ஏற்றுமதி செய்யவும் இருவரும் ஒப்புக்கொள்கின்றனர்')}</label>
      <div class="or-line">${L('or', 'அல்லது')}</div>
      <label class="check-row"><input type="checkbox" data-consent="privateOnly"${mt.consent.privateOnly ? ' checked' : ''}> ${L('Private comparison only — not saved, not shared', 'தனிப்பட்ட ஒப்பீடு மட்டும் — சேமிக்கப்படாது, பகிரப்படாது')}</label>
    </fieldset>
    <div class="btn-row"><button class="chip-btn" data-next="2">‹ ${L('Back', 'பின்')}</button><button class="btn-gold" id="mtRun">💞 ${L('See the report', 'அறிக்கையைப் பார்')}</button></div>`;
}

const CARD_ICON = { traditional: 'analysis', expectations: 'chat', money: 'coins', family: 'home_icon', next_steps: 'muhurtham', remarriage: 'sprout' };
const RESULT_MARK = { uttamam: '✓', madhyamam: '◐', poruthamillai: '○' };

function runMatching() {
  const people = mt.people.map(resolvePerson);
  const pairId = `pair-${people.map((p) => p.birthDate).join('-')}`;
  let consent;
  if (mt.consent.privateOnly) consent = { ephemeral: true, requesterId: 'a' };
  else {
    consent = createConsentLedger(pairId);
    const scopes = ['calculate', ...(mt.consent.share ? ['save', 'share', 'export'] : [])];
    for (const p of people) if (mt.consent[p.id]) consent = recordConsent(consent, { participantId: p.id, scopes, method: 'in-app-confirmation' });
  }
  const modes = Object.fromEntries(mt.people.map((p) => [p.slot, { mode: p.mode, historyPrivate: p.historyPrivate }]));
  const report = buildMatchingReport({ bride: people[0], groom: people[1], modes, consent, pairId });
  if (report.status === 'ok' && !mt.consent.privateOnly) {
    // Consent ledger kept on this device only (who agreed to what, when) — no birth data.
    const all = store.get('kj_consents', {});
    all[pairId] = consent;
    store.set('kj_consents', all);
  }
  mt.report = { report, names: mt.people.map((p, i) => nameOf(p, i)), ids: people.map((p) => p.id) };
  mt.step = 4;
}

function factorRow(f, detailed) {
  return `<div class="factor mt-factor"><span><b>${esc(bi(f.name))}</b>${f.expertReview ? ` <span class="chip-review">${L('expert review', 'நிபுணர் மதிப்பாய்வு')}</span>` : ''}
    ${detailed ? `<br><small class="muted">${esc(bi(f.calculationBasis))}</small>${f.calculationDetail ? `<br><small>${esc(bi(f.calculationDetail))}</small>` : ''}${f.birthDataLimitation ? `<br><small class="muted">${esc(bi(f.birthDataLimitation))}</small>` : ''}` : ''}</span>
    <b class="zero"><span aria-hidden="true">${RESULT_MARK[f.result] || ''}</span> ${esc(bi(f.resultLabel))}</b></div>`;
}

function stepReport() {
  const { report: r, names, ids } = mt.report;
  if (r.status !== 'ok') {
    return `<div class="card glass" role="alert"><div class="card-title">${L('We can\'t show a match here', 'இங்கே பொருத்தம் காட்ட இயலாது')}</div><p>${esc(bi(r.message))}</p></div>
      <button class="chip-btn" data-next="${r.reason === 'consent-missing' ? 3 : 2}">‹ ${L('Back', 'பின்')}</button>`;
  }
  const detailed = mt.view === 'detailed';
  const perm = r.exportPermissions;
  const trad = r.cards.find((c) => c.cardId === 'traditional');
  const dr = r.doshaReview;
  const ak = r.ashtakoota;
  return `<div class="seg view-toggle" role="group" aria-label="${esc(L('Report view', 'அறிக்கைப் பார்வை'))}"><button type="button" data-view="short" class="${detailed ? '' : 'sel'}" aria-pressed="${!detailed}">${L('Short summary', 'சுருக்கம்')}</button><button type="button" data-view="detailed" class="${detailed ? 'sel' : ''}" aria-pressed="${detailed}">${L('Detailed expert view', 'விரிவான நிபுணர் பார்வை')}</button></div>
    <div class="card glass"><div class="mini-label">${esc(names[0])} · ${esc(names[1])}</div>
      <p>${esc(bi(r.summary.short))}</p><p><b>${esc(bi(r.summary.recommendation))}</b></p>
      ${r.consentScope.mode === 'ephemeral-private' ? `<p class="muted small">🔒 ${L('Private comparison — not saved or shared.', 'தனிப்பட்ட ஒப்பீடு — சேமிக்கப்படவில்லை, பகிரப்படவில்லை.')}</p>` : ''}</div>
    ${r.cards.map((c) => `<section class="card glass mt-card" aria-labelledby="mtc-${c.cardId}">
      <div class="card-title"><span id="mtc-${c.cardId}">${iconChip(CARD_ICON[c.cardId] || 'info', { size: 20, cls: 'mt-icon' })} ${esc(bi(c.title))}</span>${c.optional ? `<span class="pill">${L('optional', 'விருப்பம்')}</span>` : ''}</div>
      <span class="sr-only">${esc(bi(c.iconLabel))}</span>
      <p class="small">${esc(bi(c.summary))}</p>
      ${c.cardId === 'traditional' ? `${r.traditionalFactorResults.map((f) => factorRow(f, detailed)).join('')}
        <p class="muted small">${L('10 Tamil poruthams, each shown on its own — there is no overall score.', '10 தமிழ்ப் பொருத்தங்கள், ஒவ்வொன்றும் தனியாக — மொத்த மதிப்பெண் இல்லை.')}</p>` : ''}
      ${c.prompts?.length && (c.cardId !== 'traditional' || detailed) ? `<ul class="small">${c.prompts.map((pr) => `<li>${esc(bi(pr))}</li>`).join('')}</ul>` : ''}
      ${c.answersPrivateByDefault ? `<p class="muted small">${L('Each person chooses what to share; answers stay private by default.', 'ஒவ்வொருவரும் எதைப் பகிர வேண்டும் என்பதைத் தேர்வு செய்வர்; பதில்கள் இயல்பாகத் தனிப்பட்டவை.')}</p>` : ''}
    </section>`).join('')}
    ${trad ? '' : ''}
    <section class="card glass" aria-labelledby="mtDosha"><div class="card-title" id="mtDosha">${L('Dosha review (traditional)', 'தோஷ மதிப்பாய்வு (மரபு)')} <span class="chip-review">${L('needs reviewed rules', 'மதிப்பாய்வு விதிகள் தேவை')}</span></div>
      ${dr.samyam.map((n) => `<p class="small">• ${esc(bi(n))}</p>`).join('')}
      ${detailed ? ids.map((id, i) => { const d = dr.perPerson[id]; return d?.available ? `<p class="small"><b>${esc(names[i])}</b>: ${L('Chevvai placement', 'செவ்வாய் நிலை')} ${d.chevvai.placementNoted ? L('noted', 'உண்டு') : L('not noted', 'இல்லை')}${d.chevvai.exceptionsApplied?.length ? ` (${L('exceptions for review', 'மதிப்பாய்வுக்கு விலக்குகள்')}: ${d.chevvai.exceptionsApplied.map((e) => esc(bi(e))).join('; ')})` : ''} · ${L('Rahu–Ketu', 'ராகு–கேது')} ${d.rahuKetu.placementNoted == null ? L('needs exact birth time', 'சரியான பிறந்த நேரம் தேவை') : d.rahuKetu.placementNoted ? L('noted', 'உண்டு') : L('not noted', 'இல்லை')}</p>` : ''; }).join('') : ''}
    </section>
    ${ak ? `<section class="card glass" aria-labelledby="mtAk"><div class="card-title" id="mtAk">${L('Ashtakoota (36 points) — a separate method', 'அஷ்டகூடம் (36 புள்ளிகள்) — தனி முறை')}</div>
      <p class="small">${esc(bi(ak.note))}</p>
      <p><b>${ak.total} / ${ak.max}</b> ${L('points in this method', 'இந்த முறையில் புள்ளிகள்')}</p>
      ${detailed ? ak.rows.map((row) => `<div class="factor"><span>${esc(bi(row))}<br><small class="muted">${esc(bi(row.detail))}</small></span><b class="zero">${row.got} / ${row.max}</b></div>`).join('') : ''}
    </section>` : ''}
    ${detailed ? `<section class="card glass"><div class="card-title">${L('Questions for your astrologer', 'உங்கள் ஜோதிடருக்கான கேள்விகள்')}</div><ul class="small">${r.expertReviewQuestions.map((q) => `<li>${esc(bi(q))}</li>`).join('')}</ul>
      ${r.uncertainty.map((u) => `<p class="muted small">${esc(bi(u))}</p>`).join('')}
      <p class="muted small">${esc(bi(r.legalReviewNote))}</p></section>` : ''}
    <div class="btn-row">
      <button class="chip-btn" id="mtShare"${perm.share ? '' : ' disabled aria-disabled="true"'}>${icon('share', { size: 16 })} ${L('Share', 'பகிர்')}</button>
      <button class="chip-btn" id="mtExport"${perm.export ? '' : ' disabled aria-disabled="true"'}>${icon('download', { size: 16 })} ${L('Export', 'ஏற்றுமதி')}</button>
      <button class="chip-btn" data-next="1">${L('Start again', 'மீண்டும் தொடங்கு')}</button></div>
    ${perm.share && perm.export ? '' : `<p class="muted small">${L('Share and export need both adults\' permission to save and share.', 'பகிர, ஏற்றுமதி செய்ய இருவரின் சேமிப்பு/பகிர்வு அனுமதி தேவை.')}</p>`}`;
}

function reportText() {
  const { report: r, names } = mt.report;
  return [`${names[0]} · ${names[1]}`, bi(r.summary.short), ...r.traditionalFactorResults.map((f) => `${bi(f.name)}: ${bi(f.resultLabel)}`), r.ashtakoota ? `Ashtakoota (separate method): ${r.ashtakoota.total}/${r.ashtakoota.max}` : '', bi(r.summary.recommendation), '— Thunai'].filter(Boolean).join('\n');
}

function renderMatching(sec) {
  const body = mt.step === 1 ? stepModes() : mt.step === 2 ? stepPeople() : mt.step === 3 ? stepConsent() : stepReport();
  sec.innerHTML = `${subHeader(L('Marriage matching', 'திருமணப் பொருத்தம்'), L('For adults, with both people\'s permission. Traditional factors to discuss — never a verdict.', 'வயது வந்தவர்களுக்கு, இருவரின் அனுமதியுடன். பேசுவதற்கான மரபுக் காரணிகள் — தீர்ப்பு அல்ல.'))}
    ${stepper()}${body}
    <p class="muted small center"><button class="link-btn" data-go="porutham">${L('Quick star match', 'விரைவு நட்சத்திரப் பொருத்தம்')}</button></p>`;
  const rerender = () => renderMatching(sec);
  $$('[data-next]', sec).forEach((b) => b.addEventListener('click', () => {
    const to = Number(b.dataset.next);
    if (to === 3 && mt.step === 2) { try { mt.people.forEach(resolvePerson); } catch (e) { $('#mtErr').textContent = e.message; return; } }
    if (to === 1 && mt.step === 4) { mt.report = null; mt.consent = { a: false, b: false, share: false, privateOnly: false }; }
    mt.step = to; rerender(); scrollTo({ top: 0 });
  }));
  for (const p of mt.people) {
    $$(`input[name="mode-${p.slot}"]`, sec).forEach((r) => r.addEventListener('change', () => { p.mode = r.value; }));
  }
  $$('[data-hist]', sec).forEach((c) => c.addEventListener('change', () => { mt.people.find((p) => p.slot === c.dataset.hist).historyPrivate = c.checked; }));
  $$('.mt-person', sec).forEach((blk) => {
    const p = mt.people.find((x) => x.slot === blk.dataset.slot);
    $$('[data-src]', blk).forEach((b) => b.addEventListener('click', () => { p.src = b.dataset.src; rerender(); }));
    $$('[data-f]', blk).forEach((el) => {
      const set = () => { p[el.dataset.f] = el.value; };
      el.addEventListener('input', set);
      el.addEventListener('change', () => { set(); if (el.dataset.f === 'precision') rerender(); });
    });
    const place = $('[data-f="place"]', blk);
    if (place) placeSearch(place, $('.suggest', blk), (pl) => { Object.assign(p, { place: pl.name, lat: pl.lat, lon: pl.lon, tz: pl.tz }); rerender(); });
  });
  $$('[data-consent]', sec).forEach((c) => c.addEventListener('change', () => {
    mt.consent[c.dataset.consent] = c.checked;
    if (c.dataset.consent === 'privateOnly') rerender();
  }));
  $('#mtRun')?.addEventListener('click', () => { try { runMatching(); } catch (e) { toast(e.message); return; } rerender(); scrollTo({ top: 0 }); });
  $$('[data-view]', sec).forEach((b) => b.addEventListener('click', () => { mt.view = b.dataset.view; rerender(); }));
  $('#mtShare')?.addEventListener('click', async () => {
    const text = reportText();
    try { if (navigator.share) { await navigator.share({ text }); return; } } catch { return; }
    try { await navigator.clipboard.writeText(text); toast(L('Copied', 'நகலெடுக்கப்பட்டது')); } catch { /* ignore */ }
  });
  $('#mtExport')?.addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([reportText()], { type: 'text/plain' }));
    a.download = 'thunai-matching.txt';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  });
}
registerScreen('matching', { render: renderMatching, parent: 'family' });

// ================================================================ TEMPLE TRIP PLANNER (brief §9)
const tp = {
  departure: null, dateMode: 'days', days: 2, start: '', end: '', budget: 'low', mode: 'car', members: 2,
  elders: false, young: false, access: new Set(), prefs: new Set(), useDasa: false, plan: null, error: '',
};
const BUDGETS = [['free', 'Free / prayer only', 'இலவசம் / வழிபாடு மட்டும்'], ['low', 'Low', 'குறைவு'], ['medium', 'Medium', 'நடுத்தரம்'], ['high', 'Flexible', 'தாராளம்']];
const MODES = [['car', 'Car', 'கார்'], ['bus', 'Bus', 'பேருந்து'], ['train', 'Train', 'ரயில்'], ['two_wheeler', 'Two-wheeler', 'இருசக்கர வாகனம்'], ['flight', 'Flight', 'விமானம்']];
const ACCESS = [['wheelchair', 'Wheelchair access', 'சக்கர நாற்காலி வசதி'], ['few_steps', 'Fewer steps / short walks', 'குறைந்த படிகள் / குறுகிய நடை'], ['rest_stops', 'Frequent rest stops', 'அடிக்கடி ஓய்வு நிறுத்தம்']];

function practicalHtml(pr) {
  const rows = [['hours', 'Opening hours', 'திறப்பு நேரம்'], ['crowds', 'Festival crowds', 'திருவிழாக் கூட்டம்'], ['route', 'Route', 'பாதை'], ['accommodation', 'Stay', 'தங்குமிடம்'], ['accessibility', 'Accessibility', 'அணுகல் வசதி'], ['weather', 'Weather', 'வானிலை'], ['booking', 'Booking', 'முன்பதிவு']];
  return `<details class="why"><summary>${L('Practical details', 'நடைமுறை விவரங்கள்')}</summary>${rows.map(([k, en, tx]) => {
    const it = pr[k];
    if (!it) return '';
    const src = it.source || {};
    const status = k === 'booking' ? `<span class="chip-review">${L('not booked', 'முன்பதிவு இல்லை')}</span>` : it.status === 'verified' ? `<span class="pill">${L('checked', 'சரிபார்த்தது')} ${esc(String(it.lastVerified || '').slice(0, 10))}</span>` : `<span class="chip-review">${L('needs checking', 'சரிபார்க்க வேண்டும்')}</span>`;
    const link = it.url || src.url;
    return `<div class="small tp-prac"><b>${L(en, tx)}:</b> ${esc(txt(it.value))} ${status}<br><small class="muted">${L('Source', 'ஆதாரம்')}: ${link ? `<a href="${esc(link)}" target="_blank" rel="noopener">${esc(txt(src.title) || link)}</a>` : esc(txt(src.title) || '—')} · ${L('last verified', 'கடைசியாகச் சரிபார்த்தது')}: ${it.lastVerified ? esc(String(it.lastVerified).slice(0, 10)) : L('not yet', 'இன்னும் இல்லை')}</small></div>`;
  }).join('')}</details>`;
}

function optionHtml(o, heading) {
  const t = o.temple;
  return `<div class="card glass tp-opt">${heading ? `<div class="mini-label">${heading}</div>` : ''}
    <div class="card-title"><span>🛕 ${esc(bi(t.name))}</span>${o.sponsored ? `<span class="pill sponsored">${L('Sponsored', 'விளம்பரம்')}</span>` : ''}</div>
    <p class="small">${esc(bi(t.deity))} · ${esc(placeName(t.town))}</p>
    <p class="small">~${o.roadKm} km · ~${o.oneWayHours} ${L('h each way', 'மணி (ஒரு வழி)')} · ${o.fitsYourDays ? L('fits your days', 'உங்கள் நாட்களுக்குள்') : L('may be tight for your days', 'உங்கள் நாட்களுக்கு நெருக்கமாக இருக்கலாம்')} · ${L('cost band', 'செலவு வகை')}: ${esc(o.costBand)} <small class="muted">(${esc(bi(o.costBandNote))})</small></p>
    ${o.preferenceMatch?.length ? `<p class="small">${L('Matches your interests', 'உங்கள் விருப்பத்துடன் பொருந்துகிறது')}: ${o.preferenceMatch.map((g) => esc(bi(TEMPLE_TAGS.find((x) => x.id === g) || { en: g, ta: g }))).join(', ')}</p>` : ''}
    ${o.devotionalAssociation ? `<p class="small">${esc(bi(o.devotionalAssociation))} <span class="chip-review">${L('proposed', 'முன்மொழிவு')}</span></p>` : ''}
    ${practicalHtml(o.practical)}</div>`;
}

function planHtml(p) {
  const sec = {
    freeLocal: () => `<section class="card glass tp-free"><div class="card-title">🪔 ${esc(bi(p.freeLocal.title))}</div><span class="pill">${L('Free', 'இலவசம்')}</span><ul class="small">${p.freeLocal.items.map((i) => `<li>${esc(bi(i))}</li>`).join('')}</ul></section>`,
    nearbyLowCost: () => (p.nearbyLowCost ? optionHtml(p.nearbyLowCost, L('Nearby, low-cost option', 'அருகில், குறைந்த செலவு')) : ''),
    trips: () => (p.trips.length ? `<div class="section-title">${L('Trips that fit your days', 'உங்கள் நாட்களுக்கு ஏற்ற பயணங்கள்')}</div>${p.trips.map((o) => optionHtml(o)).join('')}` : `<p class="muted small">${L('No longer trip fits these days — the nearby option above is a good choice.', 'இந்த நாட்களுக்கு நீண்ட பயணம் பொருந்தவில்லை — மேலே உள்ள அருகிலுள்ள தேர்வு நல்லது.')}</p>`),
    packages: () => (p.packages.length ? `<div class="section-title">${L('Paid packages (optional)', 'கட்டணப் பேக்கேஜ்கள் (விருப்பம்)')}</div>${p.packages.map((k) => `<div class="card glass"><div class="card-title"><span>🧳 ${esc(bi(k.name))}</span>${k.sponsored ? `<span class="pill sponsored">${L('Sponsored', 'விளம்பரம்')}</span>` : ''}</div>
      <p class="small">${k.days} ${L('days', 'நாட்கள்')} · ~${k.roadKm} km · ${esc(bi(k.priceNote))}</p><p class="small"><span class="chip-review">${L('not booked', 'முன்பதிவு இல்லை')}</span></p>
      <button class="chip-btn" data-go="packages" data-param='${JSON.stringify({ id: k.id })}'>${L('Details', 'விவரம்')}</button></div>`).join('')}` : ''),
  };
  return `<div class="card glass"><p class="small"><b>${esc(bi(p.framing))}</b></p>
      ${p.associationStatus ? `<p class="small">${L('Traditional devotional association for', 'மரபு வழிபாட்டுத் தொடர்பு')} ${esc(planetName(p.associationStatus.planet))}: ${esc(bi(p.associationStatus.deity))} <span class="chip-review">${L('proposed — awaiting astrologer review', 'முன்மொழிவு — ஜோதிடர் மதிப்பாய்வுக்கு')}</span></p>` : ''}
      <p class="muted small">${esc(bi(p.practicalDataNote))}</p>
      ${p.accessibilityNote ? `<p class="small">♿ ${esc(bi(p.accessibilityNote))}</p>` : ''}</div>
    ${p.order.map((k) => sec[k]?.() || '').join('')}
    <div class="card glass"><p class="small">🛕 ${esc(bi(p.kulaDeivamNote))}</p><button class="link-btn" data-go="life" data-param='{"q":"kula"}'>${L('Record your Kula Deivam', 'குலதெய்வத்தைப் பதிவு செய்க')} ›</button></div>`;
}

function runPlan() {
  const dep = tp.departure || { city: state.loc?.name, lat: state.loc?.lat, lon: state.loc?.lon };
  const m = activeMember();
  const c = m && m.relation !== 'organization' ? chartOf(m) : null;
  const members = Array.from({ length: Math.max(1, Number(tp.members) || 1) }, (_, i) => (i === 0 && tp.elders ? { age: 72 } : i === 1 && tp.young ? { age: 3 } : {}));
  const input = {
    departure: { city: dep.city || dep.name, lat: Number(dep.lat), lon: Number(dep.lon) },
    ...(tp.dateMode === 'dates' && tp.start && tp.end ? { dates: { start: tp.start, end: tp.end } } : { days: Number(tp.days) || 1 }),
    budget: tp.budget, travelMode: tp.mode, members, accessibilityNeeds: [...tp.access], preferences: { tags: [...tp.prefs] },
    dasaLord: tp.useDasa && c?.dasa?.current ? c.dasa.current.lord : null,
  };
  tp.plan = planTempleTrip(input);
}

function renderTemplePlan(sec) {
  const dep = tp.departure || { name: state.loc?.name };
  const m = activeMember();
  sec.innerHTML = `${subHeader(L('Temple trip planner', 'கோவில் பயணத் திட்டம்'), L('Free and local prayer first — then nearby, longer trips and packages', 'இலவச, அருகிலுள்ள வழிபாடு முதலில் — பிறகு அருகிலுள்ள, நீண்ட பயணங்கள், பேக்கேஜ்கள்'))}
    <form class="card glass" id="tpForm">
      <label class="place-wrap">${L('Starting from', 'புறப்படும் இடம்')}<input id="tpDep" value="${esc(placeName(dep.city || dep.name || ''))}" placeholder="${esc(L('Type a city…', 'நகரம் தட்டச்சு செய்க…'))}"><ul class="suggest" id="tpDepList" hidden></ul></label>
      <div class="seg" role="group" aria-label="${esc(L('Dates or number of days', 'தேதிகள் அல்லது நாட்கள்'))}"><button type="button" data-dm="days" class="${tp.dateMode === 'days' ? 'sel' : ''}" aria-pressed="${tp.dateMode === 'days'}">${L('Number of days', 'நாட்கள்')}</button><button type="button" data-dm="dates" class="${tp.dateMode === 'dates' ? 'sel' : ''}" aria-pressed="${tp.dateMode === 'dates'}">${L('Dates', 'தேதிகள்')}</button></div>
      ${tp.dateMode === 'days' ? `<label>${L('Days available', 'கிடைக்கும் நாட்கள்')}<input type="number" min="1" max="15" name="days" value="${tp.days}"></label>`
    : `<div class="row2"><label>${L('From', 'முதல்')}<input type="date" name="start" value="${esc(tp.start)}"></label><label>${L('To', 'வரை')}<input type="date" name="end" value="${esc(tp.end)}"></label></div>`}
      <div class="row2"><label>${L('Budget', 'செலவு')}<select name="budget">${BUDGETS.map(([id, en, tx]) => `<option value="${id}"${tp.budget === id ? ' selected' : ''}>${L(en, tx)}</option>`).join('')}</select></label>
        <label>${L('Travel by', 'பயண முறை')}<select name="mode">${MODES.map(([id, en, tx]) => `<option value="${id}"${tp.mode === id ? ' selected' : ''}>${L(en, tx)}</option>`).join('')}</select></label></div>
      <label>${L('People travelling', 'பயணிப்போர்')}<input type="number" min="1" max="40" name="members" value="${tp.members}"></label>
      <label class="check-row"><input type="checkbox" name="elders"${tp.elders ? ' checked' : ''}> ${L('Elders (70+) travelling', 'முதியோர் (70+) உடன்')}</label>
      <label class="check-row"><input type="checkbox" name="young"${tp.young ? ' checked' : ''}> ${L('Young children travelling', 'சிறு குழந்தைகள் உடன்')}</label>
      <fieldset><legend class="mini-label">${L('Accessibility needs', 'அணுகல் தேவைகள்')}</legend>${ACCESS.map(([id, en, tx]) => `<label class="check-row"><input type="checkbox" data-acc="${id}"${tp.access.has(id) ? ' checked' : ''}> ${L(en, tx)}</label>`).join('')}</fieldset>
      <fieldset><legend class="mini-label">${L('Interests', 'விருப்பங்கள்')}</legend><div class="member-switch wrap">${TEMPLE_TAGS.filter((t) => t.id !== 'all').map((t) => `<label class="mchip${tp.prefs.has(t.id) ? ' sel' : ''}"><input type="checkbox" data-pref="${t.id}"${tp.prefs.has(t.id) ? ' checked' : ''}> ${esc(bi(t))}</label>`).join('')}</div></fieldset>
      ${m && m.relation !== 'organization' ? `<label class="check-row"><input type="checkbox" name="useDasa"${tp.useDasa ? ' checked' : ''}> ${L(`Include the traditional devotional association for ${displayName(m)}'s current dasa (optional)`, `${displayName(m)} அவர்களின் நடப்புத் தசைக்கான மரபு வழிபாட்டுத் தொடர்பைச் சேர் (விருப்பம்)`)}</label>` : ''}
      <button class="btn-gold">🗺️ ${L('Plan my trip', 'பயணத்தைத் திட்டமிடு')}</button>
      <p class="err" role="alert">${esc(tp.error)}</p>
    </form>
    <div id="tpOut" aria-live="polite">${tp.plan ? planHtml(tp.plan) : ''}</div>`;
  const f = $('#tpForm', sec);
  placeSearch($('#tpDep', sec), $('#tpDepList', sec), (p) => { tp.departure = { city: p.name, name: p.name, lat: p.lat, lon: p.lon }; $('#tpDep', sec).value = placeName(p.name); });
  const read = () => {
    if (f.elements.days) tp.days = f.elements.days.value;
    if (f.elements.start) { tp.start = f.elements.start.value; tp.end = f.elements.end.value; }
    tp.budget = f.elements.budget.value; tp.mode = f.elements.mode.value; tp.members = f.elements.members.value;
    tp.elders = f.elements.elders.checked; tp.young = f.elements.young.checked; tp.useDasa = !!f.elements.useDasa?.checked;
    tp.access = new Set($$('[data-acc]', f).filter((x) => x.checked).map((x) => x.dataset.acc));
    tp.prefs = new Set($$('[data-pref]', f).filter((x) => x.checked).map((x) => x.dataset.pref));
  };
  $$('[data-dm]', sec).forEach((b) => b.addEventListener('click', () => { read(); tp.dateMode = b.dataset.dm; renderTemplePlan(sec); }));
  $$('[data-pref]', f).forEach((x) => x.addEventListener('change', () => x.parentElement.classList.toggle('sel', x.checked)));
  f.addEventListener('submit', (e) => {
    e.preventDefault();
    read();
    tp.error = '';
    try { runPlan(); } catch (err) { tp.error = L('Please pick a starting city from the list.', 'பட்டியலிலிருந்து புறப்படும் நகரத்தைத் தேர்வு செய்யவும்.'); tp.plan = null; console.warn(err); }
    renderTemplePlan(sec);
    $('#tpOut', sec)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}
registerScreen('templeplan', { render: renderTemplePlan, parent: 'plan', needsLoc: true });

export { nakName, rasiName };
