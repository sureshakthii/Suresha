// My Spiritual Journey — connects the horoscope, the temple database and trip planning in one flow.
// Asks only for what is missing, confirms voice-transcribed values, and returns three honest options.
import { planJourney, parseTripText, worshipOptions, REVIEW, COST_ASSUMPTIONS, dayInfo } from './shared/journey.js';
import { fetchWeather } from './screens-world.js';
import { NAVAGRAHA } from './shared/remedies.js';
import { templeLinks, TEMPLES } from './shared/temples.js';
import { templeInfo } from './shared/temple-info.js';
import { searchLocalPlaces } from './shared/places.js';
import {
  state, $, $$, L, esc, bi, store, go, registerScreen, subHeader, toast, activeMember, chartOf, displayName, planetName, fmtIsoDate,
} from './core.js';
import { reliabilityOf, setupVoiceInput } from './screens-main.js';
import { placeSearch } from './account.js';
import { remindBtn } from './remind.js';
import { sharePreview } from './screens-hubs.js';
import { chartFacts } from './shared/guidance.js';

const form = {
  startName: '', lat: null, lon: null, date: '', days: null, travellers: null, who: [], transport: 'bus', tier: 'economy',
  budget: '', pace: 'moderate', mobility: 'none', prefs: [], useChart: true, confirmed: {}, focus: [],
};
let plan = null;

const nextMonthFirst = () => { const d = new Date(); d.setMonth(d.getMonth() + 1, 1); return d.toISOString().slice(0, 10); };
const money = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const hrs = (h) => (h < 1 ? `~${Math.max(5, Math.round(h * 60 / 5) * 5)} ${L('min', 'நிமி')}` : `~${(Math.round(h * 2) / 2).toString()} ${L('h', 'மணி')}`);

function savedPlans() { return store.get('kj_plans', []); }
function savePlans(p) { store.set('kj_plans', p); }

/** Chart planets most relevant for worship: current dasa lord, then the weakest planet (only when reliable). */
function chartPlanets() {
  const m = activeMember();
  if (!m || !form.useChart) return { planets: [], note: null };
  const rel = reliabilityOf(m);
  const f = chartFacts(chartOf(m), rel);
  const planets = [f.dasa?.lord, f.weakest[0]?.planet].filter(Boolean);
  return { planets: [...new Set(planets)], note: f.dasa ? null : L('Birth star uncertain — chart-based suggestions are limited.', 'நட்சத்திரம் உறுதியில்லை — ஜாதக அடிப்படைப் பரிந்துரைகள் வரம்புக்குட்பட்டவை.') };
}

function missing() {
  const out = [];
  if (form.lat == null) out.push('start');
  if (!form.date) out.push('date');
  if (!form.days) out.push('days');
  if (!form.travellers) out.push('travellers');
  return out;
}

function renderJourney(sec, params = {}) {
  if (params.open) {
    const p = savedPlans().find((x) => x.id === params.open);
    if (p) { plan = p.plan; Object.assign(form, p.form); }
  }
  if (params.temples?.length) {
    form.focus = params.temples; plan = null;
    if (params.date) { form.date = params.date; form.confirmed.date = true; }
    if (params.travellers) { form.travellers = params.travellers; form.confirmed.travellers = true; }
    if (params.days) { form.days = params.days; form.confirmed.days = true; }
  }
  if (params.question && !form.confirmed.fromQuestion && !params.temples?.length) applyParsed(parseTripText(params.question), true);
  if (form.lat == null && state.loc) { form.lat = state.loc.lat; form.lon = state.loc.lon; form.startName = state.loc.name; }
  const fam = state.family.filter((m) => m.relation !== 'organization');
  const m = activeMember();
  sec.innerHTML = `${subHeader(L('My Spiritual Journey', 'என் ஆன்மீகப் பயணம்'), L('Your chart, the temple database and your trip — together', 'உங்கள் ஜாதகம், கோவில் தகவல், உங்கள் பயணம் — ஒன்றாக'))}
    ${form.focus.length ? `<div class="card glass focus-card"><div class="card-title">🛕 ${L('Recommended for you from your chart', 'உங்கள் ஜாதகப்படி உங்களுக்குப் பரிந்துரை')}</div>
      <p><b>${form.focus.map((id) => esc(bi(TEMPLES.find((t) => t.id === id)?.name || { en: id, ta: id }))).join(' · ')}</b></p>
      <p class="small">${L('The temple is already chosen — just pick the date and who is going, then tap “Show options”. We add weather, festival crowd and opening times for that day.', 'கோவில் ஏற்கனவே தேர்வு செய்யப்பட்டது — தேதியும் உடன் வருபவர்களையும் மட்டும் தேர்வு செய்து “வழிகளைக் காட்டு” அழுத்துங்கள். அன்றைய வானிலை, விழாக் கூட்டம், நடை நேரம் சேர்த்துத் தருவோம்.')}</p>
      <button type="button" class="link-btn" id="clearFocus">${L('Choose other temples instead', 'வேறு கோவில்களைத் தேர்வு செய்ய')}</button></div>` : ''}
    <div class="card glass">
      <label for="tripText">${L('Describe your trip (optional — type or speak)', 'உங்கள் பயணத்தை விவரிக்கவும் (விருப்பம் — எழுதவும் / பேசவும்)')}</label>
      <div class="chat-form"><button type="button" id="tripMic" class="mic" aria-label="${L('Speak', 'பேசுங்கள்')}">🎙️</button>
        <textarea id="tripText" class="grow-in" rows="2" data-enter="tripParse" placeholder="${esc(L('e.g. 4 days from Madurai, 3 people, ₹15000', 'எ.கா. மதுரையிலிருந்து 4 நாள், 3 பேர், ₹15000'))}"></textarea>
        <button type="button" class="send" id="tripParse" aria-label="${L('Fill the form', 'படிவத்தில் நிரப்பு')}">➤</button></div>
      <p class="small muted">${L('We fill the form below from your words. Please check every highlighted value — especially dates, names and places.', 'உங்கள் சொற்களிலிருந்து கீழே உள்ள படிவம் நிரப்பப்படும். ஒளிரும் ஒவ்வொரு மதிப்பையும் — குறிப்பாக தேதி, பெயர், இடம் — சரிபாருங்கள்.')}</p>
    </div>
    <form id="tripForm" class="card glass" novalidate>
      <label class="place-wrap ${form.confirmed.start === false ? 'check' : ''}">${L('Starting city', 'புறப்படும் ஊர்')}
        <input name="start" value="${esc(form.startName || '')}" autocomplete="off" required><ul id="tripPlaces" class="suggest" hidden></ul></label>
      <div class="row2">
        <label class="${form.confirmed.date === false ? 'check' : ''}">${L('First day', 'முதல் நாள்')}<input name="date" type="date" value="${esc(form.date)}" required></label>
        <label class="${form.confirmed.days === false ? 'check' : ''}">${L('Number of days', 'நாட்கள்')}<select name="days">${['', 1, 2, 3, 4, 5, 6, 7].map((d) => `<option value="${d}"${Number(form.days) === d ? ' selected' : ''}>${d || '—'}</option>`).join('')}</select></label>
      </div>
      <div class="row2">
        <label class="${form.confirmed.travellers === false ? 'check' : ''}">${L('Travellers', 'பயணிகள்')}<select name="travellers">${['', 1, 2, 3, 4, 5, 6, 7, 8, 10, 12].map((d) => `<option value="${d}"${Number(form.travellers) === d ? ' selected' : ''}>${d || '—'}</option>`).join('')}</select></label>
        <label class="${form.confirmed.budget === false ? 'check' : ''}">${L('Budget (₹, optional)', 'பட்ஜெட் (₹, விருப்பம்)')}<input name="budget" inputmode="numeric" value="${esc(form.budget)}" placeholder="15000"></label>
      </div>
      ${fam.length ? `<div class="mini-label">${L('Who is going? (only names are used)', 'யார் செல்கிறார்கள்? (பெயர் மட்டும்)')}</div><div class="member-switch">${fam.map((x) => `<label class="mchip${form.who.includes(x.id) ? ' sel' : ''}"><input type="checkbox" name="who" value="${esc(x.id)}"${form.who.includes(x.id) ? ' checked' : ''}> ${esc(displayName(x))}</label>`).join('')}</div>` : ''}
      <div class="row2">
        <label>${L('Transport', 'போக்குவரத்து')}<select name="transport">${[['bus', 'Bus', 'பேருந்து'], ['train', 'Train', 'ரயில்'], ['own_car', 'Own car', 'சொந்த கார்'], ['taxi', 'Taxi', 'டாக்ஸி']].map(([id, en, tx]) => `<option value="${id}"${form.transport === id ? ' selected' : ''}>${L(en, tx)}</option>`).join('')}</select></label>
        <label>${L('Stay & food', 'தங்குமிடம் & உணவு')}<select name="tier">${[['economy', 'Simple', 'எளியது'], ['standard', 'Standard', 'சாதாரணம்'], ['comfort', 'Comfort', 'வசதி']].map(([id, en, tx]) => `<option value="${id}"${form.tier === id ? ' selected' : ''}>${L(en, tx)}</option>`).join('')}</select></label>
      </div>
      <div class="row2">
        <label>${L('Pace', 'வேகம்')}<select name="pace">${[['relaxed', 'Relaxed', 'நிதானம்'], ['moderate', 'Moderate', 'மிதமான'], ['packed', 'Packed', 'அதிகம்']].map(([id, en, tx]) => `<option value="${id}"${form.pace === id ? ' selected' : ''}>${L(en, tx)}</option>`).join('')}</select></label>
        <label>${L('Mobility needs', 'நடமாட்டத் தேவை')}<select name="mobility">${[['none', 'None', 'இல்லை'], ['limited', 'Limited walking / elders', 'குறைந்த நடை / முதியோர்'], ['wheelchair', 'Wheelchair user', 'சக்கர நாற்காலி']].map(([id, en, tx]) => `<option value="${id}"${form.mobility === id ? ' selected' : ''}>${L(en, tx)}</option>`).join('')}</select></label>
      </div>
      <div class="mini-label">${L('Devotional preference (optional)', 'வழிபாட்டு விருப்பம் (விருப்பம்)')}</div>
      <div class="member-switch">${[['shiva', 'Shiva', 'சிவன்'], ['vishnu', 'Perumal', 'பெருமாள்'], ['amman', 'Amman', 'அம்மன்'], ['murugan', 'Murugan', 'முருகன்'], ['navagraha', 'Navagraha', 'நவகிரகம்'], ['divya_desam', 'Divya Desam', 'திவ்ய தேசம்']].map(([id, en, tx]) => `<label class="mchip${form.prefs.includes(id) ? ' sel' : ''}"><input type="checkbox" name="prefs" value="${id}"${form.prefs.includes(id) ? ' checked' : ''}> ${L(en, tx)}</label>`).join('')}</div>
      ${m ? `<label class="set-row"><span>${L(`Use ${displayName(m)}'s chart (current dasa, planets needing care)`, `${displayName(m)} அவர்களின் ஜாதகத்தைப் பயன்படுத்து (நடப்பு தசை, கவனம் தேவையான கிரகம்)`)}</span><input type="checkbox" name="useChart"${form.useChart ? ' checked' : ''}></label>` : `<p class="small muted">${L('No birth details saved — suggestions use only your preferences and distance.', 'பிறப்பு விவரம் இல்லை — விருப்பம், தூரம் மட்டும் பயன்படும்.')}</p>`}
      <p class="err" id="tripErr" role="alert"></p>
      <button class="btn-gold">🛕 ${L('Show three options', 'மூன்று வழிகளைக் காட்டு')}</button>
    </form>
    <div id="tripResult"></div>`;
  const f = $('#tripForm');
  placeSearch(f.elements.start, $('#tripPlaces'), (p) => { form.startName = p.name; form.lat = p.lat; form.lon = p.lon; f.elements.start.value = p.name; form.confirmed.start = true; f.elements.start.closest('label').classList.remove('check'); });
  f.elements.start.addEventListener('input', () => { form.lat = null; });
  f.addEventListener('change', (e) => { e.target.closest('label')?.classList.remove('check'); if (e.target.name) form.confirmed[e.target.name] = true; });
  f.addEventListener('submit', (e) => { e.preventDefault(); readForm(f); submit(); });
  $('#clearFocus')?.addEventListener('click', () => { form.focus = []; plan = null; renderJourney(sec); });
  setupVoiceInput($('#tripMic'), $('#tripText'));
  $('#tripParse').addEventListener('click', () => { readForm(f); applyParsed(parseTripText($('#tripText').value), false); renderJourney(sec); });
  if (plan) showPlan(plan);
  // From Parigaram: temple, date and travellers are already chosen — show the full plan straight away.
  else if (params.auto && params.temples?.length && !missing().length) { readForm(f); submit(); }
}

/** Put parsed values in the form and mark them "please check". Never trusted silently. */
function applyParsed(p, fromQuestion) {
  if (p.days) { form.days = p.days; form.confirmed.days = false; }
  if (p.travellers) { form.travellers = p.travellers; form.confirmed.travellers = false; }
  if (p.budget) { form.budget = String(p.budget); form.confirmed.budget = false; }
  if (p.when === 'next_month' && !form.date) { form.date = nextMonthFirst(); form.confirmed.date = false; }
  if (p.fromText) {
    const hit = searchLocalPlaces(p.fromText, 1)[0];
    if (hit) { form.startName = hit.name; form.lat = hit.lat; form.lon = hit.lon; form.confirmed.start = false; }
  }
  if (fromQuestion) form.confirmed.fromQuestion = true;
}

function readForm(f) {
  form.startName = f.elements.start.value.trim();
  form.date = f.elements.date.value;
  form.days = Number(f.elements.days.value) || null;
  form.travellers = Number(f.elements.travellers.value) || null;
  form.budget = f.elements.budget.value.replace(/[^\d]/g, '');
  form.transport = f.elements.transport.value;
  form.tier = f.elements.tier.value;
  form.pace = f.elements.pace.value;
  form.mobility = f.elements.mobility.value;
  form.prefs = $$('input[name=prefs]:checked', f).map((x) => x.value);
  form.who = $$('input[name=who]:checked', f).map((x) => x.value);
  form.useChart = f.elements.useChart ? f.elements.useChart.checked : false;
  if (!form.travellers && form.who.length) form.travellers = form.who.length;
}

function submit() {
  const miss = missing();
  const labels = { start: L('starting city (pick from the list)', 'புறப்படும் ஊர் (பட்டியலிலிருந்து தேர்வு)'), date: L('first day', 'முதல் நாள்'), days: L('number of days', 'நாட்கள்'), travellers: L('travellers', 'பயணிகள்') };
  if (miss.length) { $('#tripErr').textContent = `${L('Please add', 'தயவுசெய்து சேர்க்கவும்')}: ${miss.map((k) => labels[k]).join(', ')}`; return; }
  const unchecked = Object.entries(form.confirmed).filter(([k, v]) => v === false && k !== 'fromQuestion').map(([k]) => k);
  if (unchecked.length && !confirm(L('Some values came from your words. Are the highlighted city, dates and numbers correct?', 'சில மதிப்புகள் உங்கள் சொற்களிலிருந்து எடுக்கப்பட்டன. ஒளிரும் ஊர், தேதி, எண்கள் சரியா?'))) return;
  unchecked.forEach((k) => { form.confirmed[k] = true; });
  const { planets, note } = chartPlanets();
  plan = planJourney({ start: { lat: form.lat, lon: form.lon, name: form.startName }, days: form.days, travellers: form.travellers, transport: form.transport, tier: form.tier, budget: Number(form.budget) || null, pace: form.pace, mobility: form.mobility, prefs: form.prefs, planets, focus: form.focus });
  plan.chartNote = note;
  plan.date = form.date;
  showPlan(plan);
  $('#tripResult').scrollIntoView({ behavior: 'smooth' });
}

// 'H:MM' (24 h) → '7:45 AM' / 'காலை 7:45'
const clock = (t) => { if (!t) return ''; const [h, m] = t.split(':').map(Number); const hh = ((h + 11) % 12) + 1; const mm = String(m).padStart(2, '0');
  return L(`${hh}:${mm} ${h < 12 ? 'AM' : 'PM'}`, `${h < 12 ? 'காலை' : h < 16 ? 'மதியம்' : h < 19 ? 'மாலை' : 'இரவு'} ${hh}:${mm}`); };
function timeLine(s) {
  const base = `🕘 ${L('Reach', 'சென்றடைதல்')} ~${clock(s.arrive)} · ${L('darshan till', 'தரிசனம்')} ~${clock(s.leave)} · ${L('temple closes', 'நடை சாத்தல்')} ~${clock(s.closes)}`;
  const warn = s.closedToday ? `<div class="trip-warn">⚠️ ${L('You would reach after the temple closes for the day — start earlier or move this temple to the next morning.', 'கோவில் நடை சாத்திய பின் சென்றடைவீர்கள் — முன்னதாகப் புறப்படுங்கள் அல்லது அடுத்த நாள் காலைக்கு மாற்றுங்கள்.')}</div>`
    : s.wait >= 30 ? `<div class="trip-warn">⏳ ${L(`The temple is closed for the afternoon break — about ${Math.round(s.wait / 60 * 10) / 10} h wait; it reopens around ${clock(s.opens)}. Plan lunch and rest nearby.`, `மதிய இடைவேளையில் நடை சாத்தப்பட்டிருக்கும் — சுமார் ${Math.round(s.wait / 60 * 10) / 10} மணி காத்திருப்பு; ${clock(s.opens)} அளவில் மீண்டும் திறக்கும். அருகில் உணவு, ஓய்வு திட்டமிடுங்கள்.`)}</div>`
      : s.tight ? `<div class="trip-warn">⚠️ ${L(`Tight: reach by ${clock(s.reachBy)} for unhurried darshan before closing.`, `நெருக்கடி: நடை சாத்தும் முன் நிதானமான தரிசனத்திற்கு ${clock(s.reachBy)}-க்குள் சென்றடையுங்கள்.`)}</div>` : '';
  return `<div class="small trip-time">${base} ${est()}</div>${warn}`;
}
// Each traveller: running Dasa / Bhukti lords → the temple tradition links to them and the parigaram to do on this trip.
function travellerAdvice(o) {
  const people = (form.who.length ? state.family.filter((m) => form.who.includes(m.id)) : state.family).filter((m) => m.relation !== 'organization').slice(0, 8);
  if (!people.length) return '';
  const rows = people.map((m) => {
    let c; try { c = chartOf(m); } catch { return ''; }
    const now = new Date();
    const per = (c.dasa?.periods || []).find((p) => new Date(p.start) <= now && now < new Date(p.end));
    const md = per?.lord, ad = per?.bhuktis?.find((b) => new Date(b.start) <= now && now < new Date(b.end))?.lord;
    if (!md) return '';
    const lords = [...new Set([md, ad].filter(Boolean))];
    const onTrip = o.temples.filter((t) => lords.includes(t.planet));
    const n = NAVAGRAHA[md];
    return `<div class="trav-row"><b>👤 ${esc(displayName(m))}</b> <span class="muted small">· ${esc(planetName(md))} ${L('Dasa', 'தசை')}${ad && ad !== md ? ` / ${esc(planetName(ad))} ${L('Bhukti', 'புக்தி')}` : ''}</span>
      <div class="small">🛕 ${onTrip.length ? `${L('On this trip', 'இந்தப் பயணத்தில்')}: <b>${onTrip.map((t) => esc(bi(t.name))).join(', ')}</b>` : `${L('Best temple for this period', 'இந்தக் காலத்திற்கு உகந்த கோவில்')}: <b>${esc(bi(n.temple))}</b>`} — ${esc(bi(n.deity))}</div>
      <div class="small">🪔 ${L('Parigaram during the trip', 'பயணத்தில் செய்ய வேண்டிய பரிகாரம்')}: ${esc(bi(n.free))}</div>
      <div class="small muted">🎁 ${esc(bi(n.charity))}</div></div>`;
  }).filter(Boolean);
  return rows.length ? `<div class="ans-sec trav-sec"><div class="ans-h">👨‍👩‍👧 ${L('For each traveller — by Dasa & Bhukti', 'ஒவ்வொருவருக்கும் — தசா, புக்திப்படி')}</div>${rows.join('')}
    <p class="small muted">${L('Visit the temple in the morning on the planet’s weekday if you can; keep the parigaram simple and sincere.', 'முடிந்தால் அந்தக் கிரகத்தின் கிழமையில் காலையில் தரிசனம்; பரிகாரம் எளிமையாக, மனதார.')}</p></div>` : '';
}
const est = () => `<span class="badge est">${L('Estimate', 'மதிப்பீடு')}</span>`;

function dayIso(i) {
  if (!plan.date) return null;
  const d = new Date(`${plan.date}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + i);
  return d.toISOString().slice(0, 10);
}
// That day at the temple: weather (filled in after render), festivals / holidays and the expected crowd.
function dayBox(d, di) {
  const iso = dayIso(di);
  const t = d.stops[0]?.temple;
  if (!iso || !t) return '';
  const info = dayInfo(iso, t);
  const crowd = { high: ['bad', L('Heavy crowd expected', 'அதிக கூட்டம் எதிர்பார்க்கலாம்')], medium: ['warn', L('Moderate crowd', 'மிதமான கூட்டம்')], low: ['good', L('Usually calm', 'பொதுவாக அமைதி')] }[info.crowd];
  return `<div class="day-box">
    <div class="day-wx small" data-wx="${t.lat},${t.lon},${iso}">☁️ ${L('Checking weather…', 'வானிலை பார்க்கிறது…')}</div>
    <div class="small"><span class="tag ${crowd[0]}">👥 ${crowd[1]}</span>${info.why.length ? ` <span class="muted">${info.why.map((w) => esc(bi(w))).join(' · ')}</span>` : ''}</div>
    ${info.festivals.length ? `<div class="small">🪔 ${L('That day', 'அன்று')}: <b>${info.festivals.map((f) => esc(bi(f))).join(', ')}</b></div>` : ''}
    ${info.holiday ? `<div class="small">🏖️ ${L('Public holiday', 'பொது விடுமுறை')}: ${esc(bi(info.holiday))}</div>` : ''}
    ${info.crowd === 'high' ? `<div class="small trip-warn">${L('Start very early (before 6 AM), keep water and snacks, and expect longer darshan queues.', 'அதிகாலை (காலை 6-க்கு முன்) புறப்படுங்கள்; தண்ணீர், சிற்றுண்டி வைத்திருங்கள்; தரிசன வரிசை நீளமாக இருக்கும்.')}</div>` : ''}
  </div>`;
}
async function fillDayWeather() {
  for (const el of document.querySelectorAll('[data-wx]')) {
    const [lat, lon, iso] = el.dataset.wx.split(',');
    const days = Math.round((new Date(`${iso}T12:00:00+05:30`) - Date.now()) / 86400000);
    if (days > 6) { el.innerHTML = `🗓️ ${L('Weather forecast appears 7 days before the trip — check again then.', 'வானிலை முன்னறிவிப்பு பயணத்திற்கு 7 நாள் முன் தெரியும் — அப்போது மீண்டும் பாருங்கள்.')}`; continue; }
    try {
      const w = await fetchWeather(Number(lat), Number(lon));
      const day = (w.daily || []).find((x) => x.date === iso);
      el.innerHTML = day ? `${day.rainChance >= 60 ? '🌧️' : day.rainChance >= 30 ? '🌦️' : '☀️'} ${esc(bi(day.description))} · ${Math.round(day.minC)}°–${Math.round(day.maxC)}°C · ${L('rain', 'மழை')} ${day.rainChance ?? 0}%${day.rainChance >= 60 ? ` — ${L('carry an umbrella; plan indoor darshan first', 'குடை எடுத்துச் செல்லுங்கள்')}` : ''}` : L('Weather not available for this date.', 'இந்தத் தேதிக்கு வானிலை இல்லை.');
    } catch { el.textContent = L('Weather will show when the phone is online.', 'இணைய இணைப்பில் வானிலை தெரியும்.'); }
  }
}

function dayDate(i) {
  if (!plan.date) return '';
  const d = new Date(`${plan.date}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + i);
  return fmtIsoDate(d.toISOString().slice(0, 10));
}

function optionHtml(o, idx) {
  const homePlanet = plan.inputs.planets?.[0];
  return `<article class="card glass trip-opt" aria-labelledby="opt-${o.key}">
    <div class="card-title"><span id="opt-${o.key}">${o.key}. ${esc(bi(o.title))}</span>${o.overBudget ? `<span class="badge unv">${L('Above your budget', 'பட்ஜெட்டை மீறுகிறது')}</span>` : ''}</div>
    <div class="tb-list">
      <div class="tb-row"><span class="tb-label">${L('Estimated total', 'மொத்த மதிப்பீடு')} ${est()}</span><span class="tb-value">${money(o.cost.total)}</span><span class="tb-note">${L(`about ${money(o.cost.perPerson)} per person · ~${o.totalKm} km by road`, `ஒருவருக்கு சுமார் ${money(o.cost.perPerson)} · சாலை வழி ~${o.totalKm} கி.மீ`)}</span></div>
    </div>
    <details><summary class="small">${L('How the estimate is calculated', 'மதிப்பீடு கணக்கிடும் முறை')}</summary><ul class="small">${o.cost.lines.map((l) => `<li>${esc(bi(l))} = ${money(l.amount)}</li>`).join('')}</ul>
      <p class="small muted">${L('Road distance ≈ straight line × 1.3; prices are typical 2026 figures, not quotes.', 'சாலை தூரம் ≈ நேர்கோடு × 1.3; விலைகள் 2026 வழக்கமான மதிப்புகள், விலைப்புள்ளி அல்ல.')}</p></details>
    <div class="ans-sec"><div class="ans-h">${L('Chosen for you', 'உங்களுக்காகத் தேர்ந்தெடுத்தது')}</div><ul class="small">
      ${o.key === 'A' ? `<li>${L('Closest relevant temples with the least travel and cost.', 'குறைந்த பயணம், செலவில் அருகிலுள்ள பொருத்தமான கோவில்கள்.')}</li>` : ''}
      ${o.key === 'B' ? `<li>${L(`Fits ${plan.inputs.days} day(s) at a ${plan.inputs.pace} pace (max ~${({ relaxed: 3, moderate: 5, packed: 7 })[plan.inputs.pace]} h travel per day).`, `${plan.inputs.days} நாள், ${({ relaxed: 'நிதானமான', moderate: 'மிதமான', packed: 'அதிக' })[plan.inputs.pace]} வேகத்தில் (நாளுக்கு ~${({ relaxed: 3, moderate: 5, packed: 7 })[plan.inputs.pace]} மணி பயணம்).`)}</li>` : ''}
      ${o.key === 'C' ? `<li>${L('Least travel — suitable for elders, a short break or a busy week.', 'மிகக் குறைந்த பயணம் — முதியோர், குறுகிய விடுப்பு, பரபரப்பான வாரத்திற்கு ஏற்றது.')}</li>` : ''}
      ${[...new Map(o.why.map((w) => [`${w.kind}${w.planet || ''}`, w])).values()].map((w) => `<li>${esc(bi(w))}</li>`).join('')}
      ${plan.inputs.mobility !== 'none' ? `<li>${L('Relaxed pace chosen because of mobility needs.', 'நடமாட்டத் தேவைக்காக நிதான வேகம் தேர்ந்தெடுக்கப்பட்டது.')}</li>` : ''}
    </ul></div>
    <details class="trip-details"${idx === 0 ? ' open' : ''}><summary class="ans-h">🗓️ ${L('Day-by-day itinerary', 'நாள் வாரியான பயணத் திட்டம்')} · ${o.temples.map((t) => esc(bi(t.name))).join(', ')}</summary>
    ${o.itinerary.map((d, di) => `<div class="trip-day"><div class="mini-label">${L('Day', 'நாள்')} ${d.day}${plan.date ? ` · ${dayDate(di)}` : ''} · ${L('travel', 'பயணம்')} ${hrs(d.driveHours)} ${est()}</div>
      ${dayBox(d, di)}
      ${d.stops.map((s) => { const t = o.temples.find((x) => x.id === s.temple.id); return `<div class="trip-stop">
        <b>🛕 ${esc(bi(t.name))}</b> <span class="muted small">· ${esc(t.town)} · ${L('from previous stop', 'முந்தைய இடத்திலிருந்து')} ~${Math.round(s.km)} ${L('km', 'கி.மீ')}, ${hrs(s.hours)}</span>
        ${timeLine(s)}
        <div class="small">${L('Tradition', 'மரபு')}: ${esc(bi(t.association))}</div>
        <div class="small">🕘 ${L('Darshan timings', 'தரிசன நேரம்')}: ${esc(templeInfo(t.id) ? bi(templeInfo(t.id).timings) : (t.hours?.text ? bi(t.hours.text) : '—'))}</div>
        <div class="small">📞 ${L('Temple phone', 'கோவில் தொலைபேசி')}: ${esc(t.phone || '—')}</div>
        ${templeInfo(t.id)?.festival ? `<div class="small">🎉 ${L('Festival', 'திருவிழா')}: ${esc(bi(templeInfo(t.id).festival))}</div>` : ''}
        <div class="small">🏨 ${L('Nearby stay', 'அருகில் தங்குமிடம்')}: <a href="${templeLinks(t).hotels}" target="_blank" rel="noopener">${L('Hotels & lodges near the temple', 'கோவில் அருகே விடுதிகள்')}</a></div>
        <div class="btn-row"><a class="chip-btn" href="${templeLinks(t).directions}" target="_blank" rel="noopener">🧭 ${L('Route & directions', 'வழி & பாதை')}</a><a class="chip-btn" href="${templeLinks(t).contact}" target="_blank" rel="noopener">📞 ${L('Phone & today’s timings', 'தொலைபேசி & இன்றைய நேரம்')}</a>${templeLinks(t).official ? `<a class="chip-btn" href="${templeLinks(t).official}" target="_blank" rel="noopener">🌐 ${L('Official website', 'அதிகாரப்பூர்வ தளம்')}</a>` : `<a class="chip-btn" href="${REVIEW.hours.url}" target="_blank" rel="noopener">🏛️ ${L('Official HR&CE site', 'அதிகாரப்பூர்வ HR&CE')}</a>`}${plan.date ? remindBtn({ title: `${bi(t.name)}`, at: `${new Date(new Date(`${plan.date}T06:00:00+05:30`).getTime() + di * 86400000).toISOString()}`, place: t.town, label: L('Remind', 'நினைவூட்டு') }) : ''}</div>
      </div>`; }).join('')}
      ${d.returnKm ? `<div class="small muted">↩ ${L('Return to', 'திரும்புதல்')} ${esc(plan.inputs.start.name)}: ~${Math.round(d.returnKm)} ${L('km', 'கி.மீ')}, ${hrs(d.returnHours)}</div>` : ''}
    </div>`).join('')}
    </details>
    ${o.homeWorship ? `<div class="ans-sec"><div class="ans-h">🪔 ${L('Or worship at home (free)', 'அல்லது வீட்டிலேயே வழிபாடு (இலவசம்)')}</div><p class="small">${homePlanet ? `${esc(planetName(homePlanet))}: ${esc(bi(NAVAGRAHA[homePlanet].free))}` : L('Light a lamp at sunrise or sunset and spend ten quiet minutes in prayer.', 'சூரிய உதயம் / மறைவில் தீபம் ஏற்றி, பத்து நிமிடம் அமைதியாக வழிபடுங்கள்.')}</p></div>` : ''}
    ${travellerAdvice(o)}
    <div class="ans-sec"><div class="ans-h">${L('Optional worship', 'விருப்ப வழிபாடு')}</div><ul class="small">${worshipOptions(o.temples[0]?.planet || homePlanet).map((w) => `<li>${esc(bi(w))}</li>`).join('')}</ul></div>
    <div class="btn-row">
      <button class="chip-btn" data-save="${idx}">💾 ${L('Save', 'சேமி')}</button>
      <button class="chip-btn" data-share="${idx}">📤 ${L('Share', 'பகிர்')}</button>
      ${o.temples[0] ? `<button class="chip-btn" data-go="weather" data-param='${esc(JSON.stringify({ lat: o.temples[0].lat, lon: o.temples[0].lon, name: bi(o.temples[0].name), back: 'journey' }))}'>☁️ ${L('Weather', 'வானிலை')}</button>` : ''}
      <button class="chip-btn" disabled aria-disabled="true" title="${esc(L('No booking partner is operational yet', 'முன்பதிவுக் கூட்டாளர் இன்னும் இல்லை'))}">🎫 ${L('Booking not available yet', 'முன்பதிவு இன்னும் இல்லை')}</button>
    </div>
  </article>`;
}

function showPlan(p) {
  plan = p;
  $('#tripResult').innerHTML = `
    <div class="note-box" role="note">🙏 ${L('Your journey plan — temples, route, timings, weather and stay for each day. Go with faith and a calm mind.', 'உங்கள் பயணத் திட்டம் — ஒவ்வொரு நாளுக்கும் கோவில், வழி, நேரம், வானிலை, தங்குமிடம். நம்பிக்கையுடனும் அமைதியான மனதுடனும் செல்லுங்கள்.')}${p.chartNote ? `<br>${esc(p.chartNote)}` : ''}</div>
    ${p.options.map((o, i) => optionHtml(o, i)).join('')}`;
  $$('[data-save]').forEach((b) => b.addEventListener('click', () => {
    const o = p.options[Number(b.dataset.save)];
    const id = Math.random().toString(36).slice(2, 10);
    const names = state.family.filter((m) => form.who.includes(m.id)).map((m) => displayName(m));
    const all = savedPlans();
    all.unshift({ id, title: `${o.key}. ${bi(o.title)} — ${p.inputs.start.name}`, dates: p.date ? `${fmtIsoDate(p.date)} · ${p.inputs.days} ${L('days', 'நாள்')}` : '', travellers: names, plan: p, form: { ...form } });
    savePlans(all.slice(0, 20));
    toast(L('Saved to your plans (on this phone)', 'உங்கள் திட்டங்களில் சேமிக்கப்பட்டது (இந்தக் கைப்பேசியில்)'));
  }));
  $$('[data-share]').forEach((b) => b.addEventListener('click', () => {
    const o = p.options[Number(b.dataset.share)];
    const lines = [`🛕 ${bi(o.title)} — ${L('from', 'புறப்பாடு')} ${p.inputs.start.name}${p.date ? ` · ${fmtIsoDate(p.date)}` : ''}`,
      ...o.itinerary.map((d) => `${L('Day', 'நாள்')} ${d.day}: ${d.stops.map((s) => bi(s.temple.name)).join(' → ')}`),
      `${L('Estimated cost', 'மதிப்பீட்டுச் செலவு')}: ${money(o.cost.total)} (${L('estimate', 'மதிப்பீடு')})`,
      L('Darshan timings change on festival days — a quick call to the temple helps.', 'திருவிழா நாட்களில் தரிசன நேரம் மாறலாம் — கோவிலுக்கு ஒருமுறை அழைத்து உறுதி செய்யுங்கள்.')];
    sharePreview(L('Temple journey', 'கோவில் பயணம்'), lines.join('\n'));
  }));
  fillDayWeather();
}

registerScreen('journey', { render: renderJourney, parent: 'services', needsLoc: true });
export { COST_ASSUMPTIONS };
