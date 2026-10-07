// My Spiritual Journey — connects the horoscope, the temple database and trip planning in one flow.
// Asks only for what is missing, confirms voice-transcribed values, and returns three honest options.
import { planJourney, parseTripText, worshipOptions, REVIEW, COST_ASSUMPTIONS, dayInfo, prov, tripEndDate, ACCESS_NEEDS, normaliseNeeds, templeFacts } from './shared/journey.js';
import { fetchWeather, provBadge, offlineBanner } from './screens-world.js';
import { NAVAGRAHA } from './shared/remedies.js';
import { templeLinks, TEMPLES } from './shared/temples.js';
import { templeInfo } from './shared/temple-info.js';
import { searchLocalPlaces, placeText } from './shared/places.js';
import { money, moneyRange, toInr, BUDGET_CURRENCIES, currencyForCountry } from './shared/currency.js';
import { locName, zoneDiffText, countryOfLoc } from './shared/residence.js';
import { countryByCode } from './shared/countries.js';
import { inPlaceTa } from './residence-ui.js';
import {
  state, $, $$, L, esc, bi, store, go, registerScreen, subHeader, toast, activeMember, chartOf, displayName, planetName, fmtIsoDate, placeName,
} from './core.js';
import { reliabilityOf, setupVoiceInput } from './screens-main.js';
import { placeSearch } from './account.js';
import { remindBtn } from './remind.js';
import { templeSearchField, attachTempleSearch } from './temple-search.js';
import { sharePreview } from './screens-hubs.js';
import { chartFacts } from './shared/guidance.js';

const form = {
  startName: '', lat: null, lon: null, date: '', days: null, travellers: null, who: [], transport: 'bus', tier: 'economy',
  budget: '', pace: 'moderate', mobility: 'none', needs: [], prefs: [], useChart: true, confirmed: {}, focus: [], picked: [],
  startCc: null, startZone: null, dest: null, budgetCur: null,
};
// Travel modes, shown as a touch-sized chip picker (✈️ flight included — for families abroad).
const MODES = [['flight', '✈️', 'Flight', 'விமானம்'], ['bus', '🚌', 'Bus', 'பேருந்து'], ['train', '🚆', 'Train', 'ரயில்'], ['own_car', '🚗', 'Own car', 'சொந்த கார்'], ['taxi', '🚕', 'Taxi', 'டாக்ஸி']];
// Countries with several listed temples, where a trip "near home" is the natural default (others default to India).
const LOCAL_PILGRIM = new Set(['IN', 'LK', 'MY', 'SG']);
const abroad = () => !!form.startCc && form.startCc !== 'IN';
/** Destination country for the plan: 'IN' (Tamil Nadu temples, with a flight) or the start's own country. */
const destCc = () => (form.focus.length ? undefined : form.dest === 'home' ? form.startCc : abroad() ? 'IN' : undefined);
let plan = null;

const nextMonthFirst = () => { const d = new Date(); d.setMonth(d.getMonth() + 1, 1); return d.toISOString().slice(0, 10); };
// Estimates are in rupees; the person picks the budget currency (default from where they live: AED in the UAE,
// USD in the USA …) and sees every estimate in it plus ₹ (shared/currency.js — rough guidance rates, labelled ≈).
const cur = () => form.budgetCur || currencyForCountry(countryOfLoc(state.residence) || countryOfLoc(state.loc));
const hrs = (h) => (h < 1 ? `~${Math.max(5, Math.round(h * 60 / 5) * 5)} ${L('min', 'நிமி')}` : `~${(Math.round(h * 2) / 2).toString()} ${L('h', 'மணி')}`);

function savedPlans() { return store.get('kj_plans', []); }
function savePlans(p) { store.set('kj_plans', p); }
const savedOnOf = (x) => (x?.savedAt ? String(x.savedAt).slice(0, 10) : null);
const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

/**
 * Row for the Services hub (screens-hubs.js adds `${savedJourneysHtml()}`): "My saved journeys" with the count;
 * opens the journey screen at the saved list. Empty string when nothing is saved.
 */
export function savedJourneysHtml() {
  const n = savedPlans().length;
  if (!n) return '';
  return `<button class="row-card saved-journeys-row" data-go="journey" data-param='${esc(JSON.stringify({ saved: true }))}'><span class="mi-icon" aria-hidden="true">🗂️</span><span class="row-txt"><span class="row-name">${L('My saved journeys', 'என் பயணத் திட்டங்கள்')}</span><small>${L(`${n} saved on this phone`, `இந்தக் கைப்பேசியில் ${n} திட்டம்`)}</small></span><span class="row-go" aria-hidden="true">›</span></button>`;
}

/** Saved journeys on this phone: saved-on date, open, rename, delete (one at a time). */
function savedListHtml(open) {
  const all = savedPlans();
  if (!all.length) return '';
  return `<details class="card glass saved-journeys" id="savedJourneys"${open ? ' open' : ''}><summary class="card-title">🗂️ ${L('My saved journeys', 'என் பயணத் திட்டங்கள்')} <span class="pill">${all.length}</span></summary>
    <ul class="saved-list">${all.map((x) => `<li class="saved-item" data-id="${esc(x.id)}">
      <div class="saved-main"><b>${esc(x.title)}</b>
        <div class="small muted">${x.dates ? `${esc(x.dates)} · ` : ''}${savedOnOf(x) ? L(`saved on ${fmtIsoDate(savedOnOf(x))}`, `${fmtIsoDate(savedOnOf(x))} அன்று சேமித்தது`) : L('saved earlier', 'முன்பு சேமித்தது')}${(x.travellers || []).length ? ` · ${esc(x.travellers.join(', '))}` : ''}</div></div>
      <div class="btn-row"><button type="button" class="chip-btn" data-open-plan="${esc(x.id)}">📂 ${L('Open', 'திற')}</button><button type="button" class="chip-btn" data-rename-plan="${esc(x.id)}">✏️ ${L('Rename', 'பெயர் மாற்று')}</button><button type="button" class="chip-btn" data-delete-plan="${esc(x.id)}">🗑️ ${L('Delete', 'நீக்கு')}</button></div></li>`).join('')}</ul>
    <p class="small muted">${L('Saved plans stay on this phone. Costs and times in them are as estimated on the saved date.', 'சேமித்த திட்டங்கள் இந்தக் கைப்பேசியில் மட்டும். அவற்றின் செலவு, நேரம் சேமித்த நாளின் மதிப்பீடு.')}</p></details>`;
}
function wireSavedList(sec) {
  $$('[data-open-plan]', sec).forEach((b) => b.addEventListener('click', () => renderJourney(sec, { open: b.dataset.openPlan })));
  $$('[data-rename-plan]', sec).forEach((b) => b.addEventListener('click', () => {
    const all = savedPlans(); const x = all.find((y) => y.id === b.dataset.renamePlan); if (!x) return;
    const name = prompt(L('New name for this journey', 'இந்தப் பயணத்திற்குப் புதிய பெயர்'), x.title);
    if (name == null || !name.trim()) return;
    x.title = name.trim().slice(0, 120); savePlans(all);
    toast(L('Renamed', 'பெயர் மாற்றப்பட்டது')); renderJourney(sec, { saved: true });
  }));
  $$('[data-delete-plan]', sec).forEach((b) => b.addEventListener('click', () => {
    const all = savedPlans(); const x = all.find((y) => y.id === b.dataset.deletePlan); if (!x) return;
    if (!confirm(L(`Delete “${x.title}”? This cannot be undone.`, `“${x.title}” நீக்கவா? மீட்க முடியாது.`))) return;
    savePlans(all.filter((y) => y.id !== x.id));
    if (plan?.savedId === x.id) plan = null;
    toast(L('Deleted', 'நீக்கப்பட்டது')); renderJourney(sec, { saved: true });
  }));
}
/** "First day → last day (N days)" from the form, derived — never typed. */
function endDateText() {
  const end = tripEndDate(form.date, form.days);
  if (!end) return '';
  return `🗓️ ${fmtIsoDate(form.date)} → ${fmtIsoDate(end)} · ${L(`${form.days} day${form.days > 1 ? 's' : ''}`, `${form.days} நாள்`)}`;
}

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
    if (p) {
      plan = { ...p.plan, savedOn: savedOnOf(p) || p.plan.savedOn || todayIso(), savedId: p.id };
      Object.assign(form, p.form);
      form.needs = normaliseNeeds(p.form?.needs, p.form?.mobility);
    }
  }
  if (params.temples?.length) {
    form.focus = [...params.temples]; form.picked = []; plan = null;
    if (params.date) { form.date = params.date; form.confirmed.date = true; }
    if (params.travellers) { form.travellers = params.travellers; form.confirmed.travellers = true; }
    if (params.days) { form.days = params.days; form.confirmed.days = true; }
  }
  if (params.question && !form.confirmed.fromQuestion && !params.temples?.length) applyParsed(parseTripText(params.question), true);
  // Start from where the person is now (residence, or the travelling place while it is active) — never a birth place.
  if (form.lat == null && state.loc) { form.lat = state.loc.lat; form.lon = state.loc.lon; form.startName = state.loc.name; form.startCc = countryOfLoc(state.loc); form.startZone = state.loc.zone || null; }
  if (!form.budgetCur) form.budgetCur = cur();
  if (!form.dest) form.dest = abroad() && !LOCAL_PILGRIM.has(form.startCc) ? 'india' : 'home';
  // Living abroad and going to India: ✈️ is the natural first choice (the person can still pick bus / train / taxi).
  if (!form.confirmed.transport && abroad() && (form.dest === 'india' || form.focus.length)) form.transport = 'flight';
  const fam = state.family.filter((m) => m.relation !== 'organization');
  const m = activeMember();
  sec.innerHTML = `${subHeader(L('My Spiritual Journey', 'என் ஆன்மீகப் பயணம்'), L('Your chart, the temple database and your trip — together', 'உங்கள் ஜாதகம், கோவில் தகவல், உங்கள் பயணம் — ஒன்றாக'))}
    ${offlineBanner()}
    ${savedListHtml(!!params.saved)}
    ${form.focus.length ? `<div class="card glass focus-card"><div class="card-title">🛕 ${form.focus.every((id) => form.picked.includes(id)) ? L('Temples you chose', 'நீங்கள் தேர்ந்தெடுத்த கோவில்கள்') : L('Recommended for you from your chart', 'உங்கள் ஜாதகப்படி உங்களுக்குப் பரிந்துரை')}</div>
      <div class="ts-chips">${form.focus.map((id) => `<span class="ts-chip"><b>${esc(bi(TEMPLES.find((t) => t.id === id)?.name || { en: id, ta: id }))}</b><button type="button" class="ts-x" data-unfocus="${esc(id)}" aria-label="${esc(L('Remove', 'நீக்கு'))}">✕</button></span>`).join('')}</div>
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
        <label class="trip-date ${form.confirmed.date === false ? 'check' : ''}">${L('First day', 'முதல் நாள்')}<input name="date" type="date" value="${esc(form.date)}" required></label>
        <label class="${form.confirmed.days === false ? 'check' : ''}">${abroad() ? L('Days (incl. travel)', 'நாட்கள் (பயணம் உட்பட)') : L('Number of days', 'நாட்கள்')}<select name="days">${['', 1, 2, 3, 4, 5, 6, 7, ...(abroad() || form.transport === 'flight' ? [8, 9, 10, 12, 14] : [])].map((d) => `<option value="${d}"${Number(form.days) === d ? ' selected' : ''}>${d || '—'}</option>`).join('')}</select></label>
      </div>
      <p class="small trip-end" id="tripEnd" aria-live="polite">${endDateText()}</p>
      <div class="row2">
        <label class="${form.confirmed.travellers === false ? 'check' : ''}">${L('Travellers', 'பயணிகள்')}<select name="travellers">${['', 1, 2, 3, 4, 5, 6, 7, 8, 10, 12].map((d) => `<option value="${d}"${Number(form.travellers) === d ? ' selected' : ''}>${d || '—'}</option>`).join('')}</select></label>
        <div class="${form.confirmed.budget === false ? 'check' : ''} budget-field"><label for="tripBudget">${L('Budget (optional)', 'பட்ஜெட் (விருப்பம்)')}</label>
          <div class="budget-in"><select name="budgetCur" aria-label="${esc(L('Budget currency', 'பட்ஜெட் நாணயம்'))}">${BUDGET_CURRENCIES.map((c) => `<option value="${c}"${cur() === c ? ' selected' : ''}>${c === 'INR' ? '₹ INR' : c}</option>`).join('')}</select><input id="tripBudget" name="budget" inputmode="numeric" value="${esc(form.budget)}" placeholder="${cur() === 'INR' ? '15000' : '2000'}"></div></div>
      </div>
      ${abroad() && !form.focus.length ? `<div class="mini-label">${L('Where are the temples?', 'கோவில்கள் எங்கே?')}</div>
      <div class="dest-pick" role="radiogroup" aria-label="${esc(L('Where are the temples?', 'கோவில்கள் எங்கே?'))}">
        <label class="mode-chip wide${form.dest === 'india' ? ' sel' : ''}"><input type="radio" name="dest" value="india"${form.dest === 'india' ? ' checked' : ''}><span class="mi">🇮🇳</span><span>${L('Tamil Nadu / India — with flights', 'தமிழ்நாடு / இந்தியா — விமானத்துடன்')}</span></label>
        <label class="mode-chip wide${form.dest === 'home' ? ' sel' : ''}"><input type="radio" name="dest" value="home"${form.dest === 'home' ? ' checked' : ''}><span class="mi">📍</span><span>${L(`Near me (${countryByCode(form.startCc)?.en || form.startCc})`, `என் அருகில் (${(countryByCode(form.startCc)?.ta || form.startCc).replace(/\s*\([A-Z]+\)$/, '')})`)}</span></label>
      </div>` : ''}
      <div class="mini-label" id="modeLbl">${L('How will you travel?', 'எப்படிப் பயணம்?')}</div>
      <div class="mode-pick" role="radiogroup" aria-labelledby="modeLbl">${MODES.map(([id, ic, en, tx]) => `<label class="mode-chip${form.transport === id ? ' sel' : ''}"><input type="radio" name="transport" value="${id}"${form.transport === id ? ' checked' : ''}><span class="mi" aria-hidden="true">${ic}</span><span>${L(en, tx)}</span></label>`).join('')}</div>
      ${abroad() || form.transport === 'flight' ? `<p class="small muted">✈️ ${L('From abroad the plan adds the flight to the nearest suitable airport and back; the mode you pick is used between temples (a taxi for flight or own car).', 'வெளிநாட்டிலிருந்து: அருகிலுள்ள பொருத்தமான விமான நிலையத்திற்கான விமானமும் திரும்பும் விமானமும் சேர்க்கப்படும்; கோவில்களுக்கு இடையே நீங்கள் தேர்ந்த வழி (விமானம் / சொந்த காருக்கு டாக்ஸி).')}</p>` : ''}
      ${fam.length ? `<div class="mini-label">${L('Who is going? (only names are used)', 'யார் செல்கிறார்கள்? (பெயர் மட்டும்)')}</div><div class="member-switch">${fam.map((x) => `<label class="mchip${form.who.includes(x.id) ? ' sel' : ''}"><input type="checkbox" name="who" value="${esc(x.id)}"${form.who.includes(x.id) ? ' checked' : ''}> ${esc(displayName(x))}</label>`).join('')}</div>` : ''}
      <div class="row2">
        <label>${L('Stay & food', 'தங்குமிடம் & உணவு')}<select name="tier">${[['economy', 'Simple', 'எளியது'], ['standard', 'Standard', 'சாதாரணம்'], ['comfort', 'Comfort', 'வசதி']].map(([id, en, tx]) => `<option value="${id}"${form.tier === id ? ' selected' : ''}>${L(en, tx)}</option>`).join('')}</select></label>
        <label>${L('Pace', 'வேகம்')}<select name="pace">${[['relaxed', 'Relaxed', 'நிதானம்'], ['moderate', 'Moderate', 'மிதமான'], ['packed', 'Packed', 'அதிகம்']].map(([id, en, tx]) => `<option value="${id}"${form.pace === id ? ' selected' : ''}>${L(en, tx)}</option>`).join('')}</select></label>
      </div>
      <fieldset class="needs-pick"><legend class="mini-label">${L('Accessibility needs (optional) — slows the pace and adds notes', 'அணுகல் தேவைகள் (விருப்பம்) — வேகம் குறையும், குறிப்புகள் சேரும்')}</legend>
        <div class="member-switch">${Object.entries(ACCESS_NEEDS).map(([id, n]) => `<label class="mchip${form.needs.includes(id) ? ' sel' : ''}"><input type="checkbox" name="needs" value="${id}"${form.needs.includes(id) ? ' checked' : ''}> ${esc(bi(n))}</label>`).join('')}</div></fieldset>
      ${templeSearchField({ id: 'tripTemple', label: L('Temples to visit (optional) — type to search', 'செல்ல வேண்டிய கோவில்கள் (விருப்பம்) — தட்டச்சு செய்து தேடுங்கள்') })}
      <div class="mini-label">${L('Devotional preference (optional)', 'வழிபாட்டு விருப்பம் (விருப்பம்)')}</div>
      <div class="member-switch">${[['shiva', 'Shiva', 'சிவன்'], ['vishnu', 'Perumal', 'பெருமாள்'], ['amman', 'Amman', 'அம்மன்'], ['murugan', 'Murugan', 'முருகன்'], ['navagraha', 'Navagraha', 'நவகிரகம்'], ['divya_desam', 'Divya Desam', 'திவ்ய தேசம்']].map(([id, en, tx]) => `<label class="mchip${form.prefs.includes(id) ? ' sel' : ''}"><input type="checkbox" name="prefs" value="${id}"${form.prefs.includes(id) ? ' checked' : ''}> ${L(en, tx)}</label>`).join('')}</div>
      ${m ? `<label class="set-row"><span>${L(`Use ${displayName(m)}'s chart (current dasa, planets needing care)`, `${displayName(m)} அவர்களின் ஜாதகத்தைப் பயன்படுத்து (நடப்பு தசை, கவனம் தேவையான கிரகம்)`)}</span><input type="checkbox" name="useChart"${form.useChart ? ' checked' : ''}></label>` : `<p class="small muted">${L('No birth details saved — suggestions use only your preferences and distance.', 'பிறப்பு விவரம் இல்லை — விருப்பம், தூரம் மட்டும் பயன்படும்.')}</p>`}
      <p class="err" id="tripErr" role="alert"></p>
      <button class="btn-gold">🛕 ${L('Show three options', 'மூன்று வழிகளைக் காட்டு')}</button>
    </form>
    <div id="tripResult"></div>`;
  const f = $('#tripForm');
  placeSearch(f.elements.start, $('#tripPlaces'), (p) => {
    const wasAbroad = abroad();
    form.startName = p.text || p.name; form.lat = p.lat; form.lon = p.lon; form.startCc = p.cc; form.startZone = p.zone || null; form.confirmed.start = true;
    if (abroad() !== wasAbroad) { readForm(f); form.dest = abroad() && !LOCAL_PILGRIM.has(form.startCc) ? 'india' : 'home'; renderJourney(sec); return; }
    f.elements.start.value = p.text || p.name; f.elements.start.closest('label').classList.remove('check');
  });
  f.elements.start.addEventListener('input', () => { form.lat = null; });
  f.addEventListener('change', (e) => {
    e.target.closest('label')?.classList.remove('check'); if (e.target.name) form.confirmed[e.target.name] = true;
    if (e.target.name === 'date' || e.target.name === 'days') { form.date = f.elements.date.value; form.days = Number(f.elements.days.value) || null; $('#tripEnd').textContent = endDateText(); }
    if (e.target.type === 'checkbox' && e.target.closest('.mchip')) e.target.closest('.mchip').classList.toggle('sel', e.target.checked);
    // Chip pickers: highlight the chosen chip; flight / currency change the form (more days, budget hint).
    if (e.target.type === 'radio') $$(`input[name="${e.target.name}"]`, f).forEach((r) => r.closest('.mode-chip')?.classList.toggle('sel', r.checked));
    if (e.target.name === 'budgetCur') { form.budgetCur = e.target.value; plan = null; }
    if ((e.target.name === 'transport' && (e.target.value === 'flight') !== (form.transport === 'flight')) || e.target.name === 'dest') { readForm(f); renderJourney(sec); }
  });
  f.addEventListener('submit', (e) => { e.preventDefault(); readForm(f); submit(); });
  $('#clearFocus')?.addEventListener('click', () => { readForm(f); form.focus = []; form.picked = []; plan = null; renderJourney(sec); });
  $$('[data-unfocus]', sec).forEach((b) => b.addEventListener('click', () => { readForm(f); form.focus = form.focus.filter((id) => id !== b.dataset.unfocus); plan = null; renderJourney(sec); }));
  // Temple picker: typed search with live suggestions; each pick is added to the trip (shown in the card above).
  attachTempleSearch($('#tripTemple'), { keepText: false, onPick: (t) => {
    readForm(f);
    if (!form.focus.includes(t.id)) { form.focus = [...form.focus, t.id]; form.picked = [...form.picked, t.id]; }
    plan = null; renderJourney(sec);
    toast(L(`${t.name.en} added to your trip`, `${t.name.ta} பயணத்தில் சேர்க்கப்பட்டது`));
  } });
  setupVoiceInput($('#tripMic'), $('#tripText'));
  wireSavedList(sec);
  if (params.saved) $('#savedJourneys')?.scrollIntoView({ block: 'start' });
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
    if (hit) { form.startName = placeText(hit); form.lat = hit.lat; form.lon = hit.lon; form.startCc = hit.cc; form.confirmed.start = false; }
  }
  if (fromQuestion) form.confirmed.fromQuestion = true;
}

function readForm(f) {
  form.startName = f.elements.start.value.trim();
  form.date = f.elements.date.value;
  form.days = Number(f.elements.days.value) || null;
  form.travellers = Number(f.elements.travellers.value) || null;
  form.budget = f.elements.budget.value.replace(/[^\d]/g, '');
  form.budgetCur = f.elements.budgetCur?.value || form.budgetCur;
  form.transport = f.elements.transport.value || form.transport;
  if (f.elements.dest) form.dest = f.elements.dest.value || form.dest;
  form.tier = f.elements.tier.value;
  form.pace = f.elements.pace.value;
  form.needs = $$('input[name=needs]:checked', f).map((x) => x.value);
  form.mobility = 'none'; // superseded by `needs` (older saved plans are migrated by normaliseNeeds)
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
  plan = planJourney({ start: { lat: form.lat, lon: form.lon, name: form.startName, cc: form.startCc || undefined, zone: form.startZone || undefined }, destCc: destCc(), days: form.days, travellers: form.travellers, transport: form.transport, tier: form.tier, budget: Number(form.budget) ? toInr(Number(form.budget), cur()) : null, pace: form.pace, needs: form.needs, prefs: form.prefs, planets, focus: form.focus, picked: form.picked });
  plan.cur = cur();
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
/** Travel facts for one stop, each with its provenance: times (estimated), hours / phone / access (verified or needs checking), stay. */
function stopFacts(t, s) {
  const f = templeFacts(t.id);
  return `<div class="facts-block"><div class="mini-label">🧭 ${L('Travel facts', 'பயணத் தகவல்')}</div>
    ${timeLine(s)}
    ${s.restMin ? `<div class="small">🪑 ${L(`${s.restMin}-minute rest after this temple`, `இந்தக் கோவிலுக்குப் பின் ${s.restMin} நிமிட ஓய்வு`)}</div>` : ''}
    <div class="small">🕘 ${L('Darshan timings', 'தரிசன நேரம்')}: ${f.hours.value ? `${esc(bi(f.hours.value))}` : '—'} ${pv(f.hours.prov)}</div>
    <div class="small">📞 ${L('Temple phone', 'கோவில் தொலைபேசி')}: ${f.phone.value ? esc(bi(f.phone.value)) : `<a href="${templeLinks(t).contact}" target="_blank" rel="noopener">${L('Google Maps listing', 'Google Maps பட்டியல்')}</a>`} ${pv(f.phone.prov)}</div>
    <div class="small">♿ ${L('Access', 'அணுகல்')}: ${f.accessibility.value ? esc(bi(f.accessibility.value)) : L('steps and queues not verified', 'படிகள், வரிசை சரிபார்க்கப்படவில்லை')} ${pv(f.accessibility.prov)}</div>
    <div class="small">🏨 ${L('Nearby stay', 'அருகில் தங்குமிடம்')}: <a href="${templeLinks(t).hotels}" target="_blank" rel="noopener">${L('Hotels & lodges near the temple', 'கோவில் அருகே விடுதிகள்')}</a> ${pv(prov('check'))}</div></div>`;
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
/** Provenance badge for an estimated item — "Saved (on date)" when the plan was opened from the saved list. */
const est = () => provBadge(prov('estimated'), { savedOn: plan?.savedOn });
const pv = (p) => provBadge(p, { savedOn: plan?.savedOn });

// Days before the first temple day (the outbound flight day(s) for a journey from abroad).
let dayShift = 0;
function dayIso(i, raw = false) {
  if (!plan.date) return null;
  const d = new Date(`${plan.date}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + i + (raw ? 0 : dayShift));
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
    <div class="small"><span class="tag ${crowd[0]}">👥 ${crowd[1]}</span> ${pv(info.prov)}${info.why.length ? ` <span class="muted">${info.why.map((w) => esc(bi(w))).join(' · ')}</span>` : ''}</div>
    ${info.festivals.length ? `<div class="small">🪔 ${L('That day', 'அன்று')}: <b>${info.festivals.map((f) => esc(bi(f))).join(', ')}</b></div>` : ''}
    ${info.holiday ? `<div class="small">🏖️ ${L('Public holiday', 'பொது விடுமுறை')}: ${esc(bi(info.holiday))}</div>` : ''}
    ${info.crowd === 'high' ? `<div class="small trip-warn">${L('Start very early (before 6 AM), keep water and snacks, and expect longer darshan queues.', 'அதிகாலை (காலை 6-க்கு முன்) புறப்படுங்கள்; தண்ணீர், சிற்றுண்டி வைத்திருங்கள்; தரிசன வரிசை நீளமாக இருக்கும்.')}</div>` : ''}
  </div>`;
}
async function fillDayWeather() {
  for (const el of document.querySelectorAll('[data-wx]')) {
    const [lat, lon, iso] = el.dataset.wx.split(',');
    const days = Math.round((new Date(`${iso}T12:00:00+05:30`) - Date.now()) / 86400000);
    const check = provBadge(prov('check'));
    if (navigator.onLine === false) { el.innerHTML = `☁️ ${L('Weather: offline — check the forecast before you travel.', 'வானிலை: இணைப்பு இல்லை — பயணத்திற்கு முன் முன்னறிவிப்பைப் பாருங்கள்.')} ${check}`; continue; }
    if (days > 6) { el.innerHTML = `🗓️ ${L('Weather forecast appears 7 days before the trip — check again then.', 'வானிலை முன்னறிவிப்பு பயணத்திற்கு 7 நாள் முன் தெரியும் — அப்போது மீண்டும் பாருங்கள்.')} ${check}`; continue; }
    try {
      const w = await fetchWeather(Number(lat), Number(lon));
      const day = (w.daily || []).find((x) => x.date === iso);
      // Fetched now → "Live (checked HH:MM)", even inside a saved plan (the weather is never stored with it).
      const live = provBadge(prov('live', { checkedAt: new Date(w.fetchedAt || Date.now()).toISOString() }));
      el.innerHTML = day ? `${day.rainChance >= 60 ? '🌧️' : day.rainChance >= 30 ? '🌦️' : '☀️'} ${esc(bi(day.description))} · ${Math.round(day.minC)}°–${Math.round(day.maxC)}°C · ${L('rain', 'மழை')} ${day.rainChance ?? 0}%${day.rainChance >= 60 ? ` — ${L('carry an umbrella; plan indoor darshan first', 'குடை எடுத்துச் செல்லுங்கள்')}` : ''} ${live}` : `${L('Weather not available for this date.', 'இந்தத் தேதிக்கு வானிலை இல்லை.')} ${check}`;
    } catch { el.innerHTML = `${L('Weather will show when the phone is online.', 'இணைய இணைப்பில் வானிலை தெரியும்.')} ${check}`; }
  }
}

function dayDate(i, raw = false) {
  if (!plan.date) return '';
  return fmtIsoDate(dayIso(i, raw));
}

// ---------------------------------------------------------------- flights (journeys from abroad)
const homeName = () => locName({ name: plan.inputs.start.name, cc: plan.startCc, zone: plan.flight?.fromZone });
const destName = () => locName({ name: plan.flight.airport.city, cc: plan.destCc });
const taIn = (nm) => (nm.ta === 'இந்திய' ? 'இந்தியாவில்' : inPlaceTa(nm.ta));
const taFrom = (nm) => taIn(nm).replace(/ல்$/, 'லிருந்து');
const tzNote = () => { const t = zoneDiffText(homeName(), destName(), plan.flight.diffHours); return t ? bi(t) : ''; };
const flightHrs = (leg) => `≈ ${(Math.round(leg.hours * 2) / 2).toString()} ${L('h', 'மணி')}${leg.direct ? '' : ` ${L('incl. one connection', 'ஒரு இணைப்பு விமானம் உட்பட')}`}`;
const dayWord = (n) => (n === 0 ? L('same day', 'அதே நாள்') : n === 1 ? L('next day', 'அடுத்த நாள்') : L(`${n} days later`, `${n} நாள் கழித்து`));
const flightSearchUrl = (leg) => `https://www.google.com/travel/flights?q=${encodeURIComponent(`flights from ${leg.from.code} to ${leg.to.code}`)}`;
/** One flight day card: route, typical duration (≈), local departure → arrival times with the zone of each. */
function flightCard(leg, dayLabel, back) {
  const from = back ? destName() : homeName(), to = back ? homeName() : destName();
  return `<div class="trip-day flight-day"><div class="mini-label">${dayLabel} · ✈️ ${back ? L('Flight home', 'திரும்பும் விமானம்') : L('Flight', 'விமானம்')}</div>
    <div class="flight-leg"><b>✈️ ${esc(placeName(leg.from.city))} (${leg.from.code}) → ${esc(placeName(leg.to.city))} (${leg.to.code})</b> <span class="small">${flightHrs(leg)}</span> ${est()}
      <div class="small">🛫 ${L(`Leave around ${clock(leg.depLocal)} ${from.en} time`, `${from.ta} நேரம் ${clock(leg.depLocal)} அளவில் புறப்பாடு`)} → 🛬 ${L(`land ≈ ${clock(leg.arrLocal)} ${to.en} time (${dayWord(leg.dayOffset)})`, `${to.ta} நேரம் ≈ ${clock(leg.arrLocal)} தரையிறக்கம் (${dayWord(leg.dayOffset)})`)}</div>
      ${back ? '' : `<div class="small tz-note">🕒 ${esc(tzNote())} — ${L('darshan timings below are in temple-local time.', 'கீழே உள்ள தரிசன நேரங்கள் கோவில் உள்ளூர் நேரத்தில்.')}</div>
      <div class="small">🛏️ ${L('Rest after landing; temple visits start the next morning.', 'தரையிறங்கிய பின் ஓய்வு; மறுநாள் காலை கோவில் தரிசனம் தொடக்கம்.')}</div>`}
      <div class="small muted">${L('Example times for planning — real schedules and seat availability vary. Check with the airline.', 'திட்டமிட உதவும் உதாரண நேரம் — உண்மையான அட்டவணை, இருக்கை கிடைப்பது மாறும். விமான நிறுவனத்திடம் உறுதி செய்யவும்.')}</div>
      <div class="btn-row"><a class="chip-btn" href="${flightSearchUrl(leg)}" target="_blank" rel="noopener">🔎 ${L('Search flights', 'விமானங்களைத் தேடு')}</a></div></div></div>`;
}

function optionHtml(o, idx) {
  const homePlanet = plan.inputs.planets?.[0];
  const fl = o.flight ? plan.flight : null;
  dayShift = fl ? fl.outboundDays : 0;
  const c = plan.cur || cur();
  const totalDays = fl ? fl.outboundDays + o.itinerary.length + 1 : o.itinerary.length;
  return `<article class="card glass trip-opt" aria-labelledby="opt-${o.key}">
    <div class="card-title"><span id="opt-${o.key}">${o.key}. ${esc(bi(o.title))}</span>${o.overBudget ? `<span class="badge unv">${L('Above your budget', 'பட்ஜெட்டை மீறுகிறது')}</span>` : ''}</div>
    <div class="tb-list">
      ${fl ? `<div class="tb-row tb-range"><span class="tb-label">✈️ ${L(`Flights, return · ${plan.inputs.travellers} ${plan.inputs.travellers > 1 ? 'people' : 'person'}`, `விமானம், போய்வர · ${plan.inputs.travellers} பேர்`)}</span><span class="tb-value">${moneyRange(o.flightCost.low, o.flightCost.high, c)}</span><span class="tb-note">${est()} ${L('typical economy range (check airline) — not a quote, nothing booked', 'வழக்கமான எகானமி வரம்பு (விமான நிறுவனத்திடம் உறுதி செய்யவும்) — விலைப்புள்ளி அல்ல, முன்பதிவு இல்லை')}</span></div>` : ''}
      <div class="tb-row"><span class="tb-label">${fl ? L(`Trip in ${destName().en} (road, stay, food)`, `${taIn(destName())} பயணம் (சாலை, தங்குமிடம், உணவு)`) : L('Estimated total', 'மொத்த மதிப்பீடு')} ${est()}</span><span class="tb-value">${o.cost.total ? money(o.cost.total, c) : L('Free', 'இலவசம்')}</span><span class="tb-note">${o.cost.total ? L(`about ${money(o.cost.perPerson, c)} per person · ~${o.totalKm} km by road`, `ஒருவருக்கு சுமார் ${money(o.cost.perPerson, c)} · சாலை வழி ~${o.totalKm} கி.மீ`) : L('Prayer at home or at a temple near you', 'வீட்டில் அல்லது அருகிலுள்ள கோவிலில் வழிபாடு')}</span></div>
      ${fl ? `<div class="tb-row tb-total"><span class="tb-label">${L('Total with flights', 'விமானத்துடன் மொத்தம்')} ${est()}</span><span class="tb-value">${moneyRange(o.totalRange.low, o.totalRange.high, c)}</span><span class="tb-note">${L(`${totalDays} days including travel days`, `பயண நாட்கள் உட்பட ${totalDays} நாள்`)}</span></div>` : ''}
    </div>
    ${o.cost.lines.length ? `<details><summary class="small">${L('How the estimate is calculated', 'மதிப்பீடு கணக்கிடும் முறை')}</summary><ul class="small">${o.cost.lines.map((l) => `<li>${esc(bi(l))} = ${money(l.amount, c)}</li>`).join('')}${fl ? `<li>${L(`Flights: ≈ ${moneyRange(fl.fare.perPersonLow, fl.fare.perPersonHigh, c)} per person, return economy — a typical range for ~${fl.out.km.toLocaleString()} km, not a fare quote`, `விமானம்: ஒருவருக்கு ≈ ${moneyRange(fl.fare.perPersonLow, fl.fare.perPersonHigh, c)}, போய்வர எகானமி — ~${fl.out.km.toLocaleString()} கி.மீக்கு வழக்கமான வரம்பு, கட்டண விலைப்புள்ளி அல்ல`)}</li>` : ''}</ul>
      <p class="small muted">${L('Road distance ≈ straight line × 1.3; prices are typical 2026 figures, not quotes.', 'சாலை தூரம் ≈ நேர்கோடு × 1.3; விலைகள் 2026 வழக்கமான மதிப்புகள், விலைப்புள்ளி அல்ல.')}${c !== 'INR' ? ` ${L('Exchange rate is approximate.', 'நாணய மாற்று விகிதம் தோராயமானது.')}` : ''}</p></details>` : ''}
    <div class="ans-sec"><div class="ans-h">${L('Chosen for you', 'உங்களுக்காகத் தேர்ந்தெடுத்தது')}</div><ul class="small">
      ${o.key === 'A' ? `<li>${L('Closest relevant temples with the least travel and cost.', 'குறைந்த பயணம், செலவில் அருகிலுள்ள பொருத்தமான கோவில்கள்.')}</li>` : ''}
      ${o.key === 'B' ? `<li>${L(`Fits ${plan.inputs.days} day(s) at a ${plan.inputs.pace} pace (max ~${({ relaxed: 3, moderate: 5, packed: 7 })[plan.inputs.pace]} h travel per day).`, `${plan.inputs.days} நாள், ${({ relaxed: 'நிதானமான', moderate: 'மிதமான', packed: 'அதிக' })[plan.inputs.pace]} வேகத்தில் (நாளுக்கு ~${({ relaxed: 3, moderate: 5, packed: 7 })[plan.inputs.pace]} மணி பயணம்).`)}</li>` : ''}
      ${o.key === 'C' ? `<li>${L('Least travel — suitable for elders, a short break or a busy week.', 'மிகக் குறைந்த பயணம் — முதியோர், குறுகிய விடுப்பு, பரபரப்பான வாரத்திற்கு ஏற்றது.')}</li>` : ''}
      ${[...new Map(o.why.map((w) => [`${w.kind}${w.planet || ''}`, w])).values()].map((w) => `<li>${esc(bi(w))}</li>`).join('')}
      ${normaliseNeeds(plan.inputs.needs, plan.inputs.mobility).length ? `<li>${L('Relaxed pace and longer darshan time because of the accessibility needs you ticked.', 'நீங்கள் குறித்த அணுகல் தேவைகளுக்காக நிதான வேகம், கூடுதல் தரிசன நேரம்.')}</li>` : ''}
    </ul></div>
    ${o.itinerary.length || fl ? `<details class="trip-details"${idx === 0 ? ' open' : ''}><summary class="ans-h">🗓️ ${L('Day-by-day itinerary', 'நாள் வாரியான பயணத் திட்டம்')} · ${o.temples.map((t) => esc(bi(t.name))).join(', ')}</summary>
    ${fl ? flightCard(fl.out, `${L('Day', 'நாள்')} 1${fl.outboundDays > 1 ? `–${fl.outboundDays}` : ''}${plan.date ? ` · ${dayDate(0, true)}` : ''}`, false) : ''}
    ${o.itinerary.map((d, di) => `<div class="trip-day"><div class="mini-label">${L('Day', 'நாள்')} ${d.day + dayShift}${plan.date ? ` · ${dayDate(di)}` : ''} · ${L('travel', 'பயணம்')} ${hrs(d.driveHours)} ${est()}</div>
      ${dayBox(d, di)}
      ${d.stops.map((s) => { const t = o.temples.find((x) => x.id === s.temple.id); return `<div class="trip-stop">
        <b>🛕 ${esc(bi(t.name))}</b> <span class="muted small">· ${esc(t.town)} · ${L('from previous stop', 'முந்தைய இடத்திலிருந்து')} ~${Math.round(s.km)} ${L('km', 'கி.மீ')}, ${hrs(s.hours)}</span>
        ${stopFacts(t, s)}
        <div class="trad-block"><div class="mini-label">🪔 ${L('Tradition', 'மரபு')}</div>
          <div class="small">${esc(bi(t.association))}</div>
          ${templeInfo(t.id)?.festival ? `<div class="small">🎉 ${L('Festival', 'திருவிழா')}: ${esc(bi(templeInfo(t.id).festival))}</div>` : ''}</div>
        <div class="btn-row"><a class="chip-btn" href="${templeLinks(t).directions}" target="_blank" rel="noopener">🧭 ${L('Route & directions', 'வழி & பாதை')}</a><a class="chip-btn" href="${templeLinks(t).contact}" target="_blank" rel="noopener">📞 ${L('Phone & today’s timings', 'தொலைபேசி & இன்றைய நேரம்')}</a>${templeLinks(t).official ? `<a class="chip-btn" href="${templeLinks(t).official}" target="_blank" rel="noopener">🌐 ${L('Official website', 'அதிகாரப்பூர்வ தளம்')}</a>` : `<a class="chip-btn" href="${REVIEW.hours.url}" target="_blank" rel="noopener">🏛️ ${L('Official HR&CE site', 'அதிகாரப்பூர்வ HR&CE')}</a>`}${plan.date ? remindBtn({ title: `${bi(t.name)}`, at: `${new Date(new Date(`${plan.date}T06:00:00+05:30`).getTime() + (di + dayShift) * 86400000).toISOString()}`, place: t.town, label: L('Remind', 'நினைவூட்டு') }) : ''}</div>
      </div>`; }).join('')}
      ${d.returnKm ? `<div class="small muted">↩ ${L('Return to', 'திரும்புதல்')} ${fl ? `✈️ ${esc(placeName(fl.airport.city))} (${fl.airport.code})` : esc(placeName(plan.inputs.start.name))}: ~${Math.round(d.returnKm)} ${L('km', 'கி.மீ')}, ${hrs(d.returnHours)}</div>` : ''}
    </div>`).join('')}
    ${fl ? flightCard(fl.back, `${L('Day', 'நாள்')} ${totalDays}${plan.date ? ` · ${dayDate(o.itinerary.length)}` : ''}`, true) : ''}
    </details>` : ''}
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

/** Top of a plan from abroad: the flight, the time difference and how the days add up. */
function flightSummary(p) {
  const f0 = p.flight;
  // Days as planned in the first option (its temples may need fewer days than the leave): flight out + temples + flight back.
  const td = p.options[0]?.flight ? p.options[0].itinerary.length || f0.templeDays : f0.templeDays;
  const spare = Math.max(0, (p.inputs.requestedDays || 0) - (f0.outboundDays + td + 1));
  const f = { ...f0, templeDays: td, totalDays: f0.outboundDays + td + 1 };
  const alt = f.alternatives.filter((a) => a.intl || !f.intl).map((a) => `${placeName(a.city)} (${a.code})`).join(', ');
  return `<div class="note-box flight-note" role="note"><b>✈️ ${L(`From ${homeName().en}: fly to ${f.airport.city} (${f.airport.code})`, `${taFrom(homeName())}: ${placeName(f.airport.city)} (${f.airport.code}) விமான நிலையத்திற்கு விமானம்`)}</b>
    <div class="small">${L(`Nearest suitable airport to your temples · ${flightHrs(f.out)} each way`, `உங்கள் கோவில்களுக்கு அருகிலுள்ள பொருத்தமான விமான நிலையம் · ஒரு வழிக்கு ${flightHrs(f.out)}`)}${alt ? ` · ${L('also possible', 'மாற்று')}: ${esc(alt)}` : ''}</div>
    <div class="small">🕒 ${esc(tzNote())}</div>
    <div class="small">🗓️ ${L(`${f.totalDays} days including travel: ${f.outboundDays} flight day${f.outboundDays > 1 ? 's' : ''} out + ${f.templeDays} temple day${f.templeDays > 1 ? 's' : ''} + 1 flight day back`, `பயண நாட்கள் உட்பட ${f.totalDays} நாள்: போகும் விமானம் ${f.outboundDays} + கோவில் ${f.templeDays} + திரும்பும் விமானம் 1`)}${spare ? ` — ${L(`${spare} spare day(s) for rest, family or more temples`, `ஓய்வு, குடும்பம் அல்லது கூடுதல் கோவிலுக்கு ${spare} நாள் மீதம்`)}` : ''}${f.addedDays ? ` — ${L(`we added ${f.addedDays} day(s) for the flights`, `விமானத்திற்காக ${f.addedDays} நாள் சேர்த்தோம்`)}` : ''}</div>
    <div class="small muted">${L('Flight times and fares are typical estimates (≈) — check with the airline. Nothing is booked.', 'விமான நேரமும் கட்டணமும் வழக்கமான மதிப்பீடுகள் (≈) — விமான நிறுவனத்திடம் உறுதி செய்யவும். எதுவும் முன்பதிவு செய்யப்படவில்லை.')}</div></div>`;
}

function showPlan(p) {
  plan = p;
  const days = p.inputs.days; // the leave the person asked for (from abroad: including the flight days)
  const end = p.date ? tripEndDate(p.date, days) : null;
  const notes = p.accessNotes || normaliseNeeds(p.inputs.needs, p.inputs.mobility).map((n) => ({ need: n, ...ACCESS_NEEDS[n].note }));
  $('#tripResult').innerHTML = `
    ${offlineBanner()}
    ${p.savedOn ? `<div class="note-box saved-banner" role="note">${provBadge(prov('saved', { savedOn: p.savedOn }))} ${L('This plan was saved earlier. Costs, crowds and times are as estimated then — weather is fetched fresh when online.', 'இந்தத் திட்டம் முன்பு சேமிக்கப்பட்டது. செலவு, கூட்டம், நேரம் அப்போதைய மதிப்பீடு — இணைப்பில் வானிலை புதிதாகப் பெறப்படும்.')}</div>` : ''}
    ${end ? `<p class="trip-dates"><b>🗓️ ${fmtIsoDate(p.date)} → ${fmtIsoDate(end)}</b> <span class="muted small">· ${L(`${days} day${days > 1 ? 's' : ''}`, `${days} நாள்`)}</span></p>` : ''}
    ${notes.length ? `<div class="card glass access-notes"><div class="card-title">♿ ${L('For your accessibility needs', 'உங்கள் அணுகல் தேவைகளுக்கு')}</div><ul class="small">${notes.map((n) => `<li><b>${esc(bi(ACCESS_NEEDS[n.need]))}:</b> ${esc(bi(n))}</li>`).join('')}</ul></div>` : ''}
    <div class="note-box" role="note">🙏 ${L('Your journey plan — temples, route, timings, weather and stay for each day. Go with faith and a calm mind.', 'உங்கள் பயணத் திட்டம் — ஒவ்வொரு நாளுக்கும் கோவில், வழி, நேரம், வானிலை, தங்குமிடம். நம்பிக்கையுடனும் அமைதியான மனதுடனும் செல்லுங்கள்.')}${p.chartNote ? `<br>${esc(p.chartNote)}` : ''}</div>
    ${p.flight ? flightSummary(p) : ''}
    ${(p.cur || cur()) !== 'INR' ? `<p class="small muted">💱 ${L(`Estimates in ${p.cur || cur()} with Indian rupees (₹) alongside — approximate exchange rate.`, `மதிப்பீடுகள் ${p.cur || cur()} நாணயத்தில், இந்திய ரூபாயுடன் (₹) — தோராய நாணய மாற்று விகிதம்.`)}</p>` : ''}
    ${p.options.map((o, i) => optionHtml(o, i)).join('')}`;
  $$('[data-save]').forEach((b) => b.addEventListener('click', () => {
    const o = p.options[Number(b.dataset.save)];
    const id = Math.random().toString(36).slice(2, 10);
    const names = state.family.filter((m) => form.who.includes(m.id)).map((m) => displayName(m));
    const all = savedPlans();
    const { savedOn: _s, savedId: _i, ...clean } = p;
    const endIso = p.date ? tripEndDate(p.date, p.inputs.days) : null;
    all.unshift({ id, savedAt: new Date().toISOString(), title: `${o.key}. ${bi(o.title)} — ${p.inputs.start.name}`, dates: p.date ? `${fmtIsoDate(p.date)}${endIso && endIso !== p.date ? ` → ${fmtIsoDate(endIso)}` : ''} · ${p.inputs.days} ${L('days', 'நாள்')}` : '', travellers: names, plan: clean, form: { ...form } });
    savePlans(all.slice(0, 20));
    document.dispatchEvent(new CustomEvent('kj:task', { detail: 'journey' })); // metrics: journey saved (consent-gated, growth.js)
    toast(L('Saved to your plans (on this phone)', 'உங்கள் திட்டங்களில் சேமிக்கப்பட்டது (இந்தக் கைப்பேசியில்)'));
    // Refresh the saved list at the top of the screen.
    const sec = b.closest('section') || document;
    const old = $('#savedJourneys', sec);
    const html = savedListHtml(false);
    if (old) old.outerHTML = html; else $('#tripForm')?.insertAdjacentHTML('beforebegin', html);
    wireSavedList(sec);
  }));
  $$('[data-share]').forEach((b) => b.addEventListener('click', () => {
    const o = p.options[Number(b.dataset.share)];
    const lines = [`🛕 ${bi(o.title)} — ${L('from', 'புறப்பாடு')} ${p.inputs.start.name}${p.date ? ` · ${fmtIsoDate(p.date)}` : ''}`,
      ...o.itinerary.map((d) => `${L('Day', 'நாள்')} ${d.day}: ${d.stops.map((s) => bi(s.temple.name)).join(' → ')}`),
      ...(o.flight ? [`✈️ ${p.flight.out.from.code} → ${p.flight.out.to.code} ${flightHrs(p.flight.out)} · ${tzNote()}`, `${L('Flights', 'விமானம்')}: ${moneyRange(o.flightCost.low, o.flightCost.high, p.cur || cur())} (${L('check airline', 'விமான நிறுவனத்திடம் உறுதி செய்யவும்')})`] : []),
      `${L('Estimated cost', 'மதிப்பீட்டுச் செலவு')}: ${o.flight ? moneyRange(o.totalRange.low, o.totalRange.high, p.cur || cur()) : money(o.cost.total, p.cur || cur())} (${L('estimate', 'மதிப்பீடு')})`,
      L('Darshan timings change on festival days — a quick call to the temple helps.', 'திருவிழா நாட்களில் தரிசன நேரம் மாறலாம் — கோவிலுக்கு ஒருமுறை அழைத்து உறுதி செய்யுங்கள்.')];
    sharePreview(L('Temple journey', 'கோவில் பயணம்'), lines.join('\n'));
  }));
  fillDayWeather();
}

registerScreen('journey', { render: renderJourney, parent: 'services', needsLoc: true });
export { COST_ASSUMPTIONS };
