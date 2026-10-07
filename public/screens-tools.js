// Feature screens: Tamil calendar, Porutham, Muhurtham, Ruthu, Parigaram, Thivasam,
// Natchathira birthday, Jothidar chat and the shareable daily card.
import { faithOf } from './shared/faith.js';
import { panchang, vedicDay, RASIS, NAKSHATRAS } from './shared/astro.js';
import { CATEGORIES, getCategory } from './shared/prasna.js';
import { tamilMonth, tamilDay, TAMIL_MONTHS } from './shared/tamilcal.js';
import { matchPorutham, doshams, doshaSamyam } from './shared/porutham.js';
import { poruthamView, discussionHtml } from './screens-couple.js';
import { grahaStrength, dailyParigaram, NAVAGRAHA } from './shared/remedies.js';
import { thivasamDates, natchathiraBirthdays, findMuhurtham, milestones, birthTamilMonth, STAR_BIRTHDAY_RULE } from './shared/special.js';
import { remindBtn } from './remind.js';
import { predictEvent } from './shared/predict.js';
import { personalGuide } from './shared/personal.js';
import { TEMPLES, distanceKm, templeLinks } from './shared/temples.js';
import { templeInfo } from './shared/temple-info.js';
import { templeSearchField, attachTempleSearch } from './temple-search.js';
import { dayInfo } from './shared/journey.js';
import {
  state, $, $$, L, ta, esc, bi, GLYPH, COLOR, planetName, rasiName, nakName, fmtTime, fmtIsoDate,
  activeMember, chartOf, hasLagna, registerScreen, go, subHeader, aiTask, toast, speak, saveFamily, saveSettings, starOptions, rasiOfStarPada, STATIC,
  listen, micMessage,
  yogaName, karanaName,
  placeName,
  displayName, assistantName, BRAND, supportCard, copyright,
} from './core.js';
import { dayOutlook, gauge, animateGauges, refreshSnap, reliabilityOf, setupVoiceInput } from './screens-main.js';
import { chartFacts, composeAnswer, factsForAI, classify, answerLang } from './shared/guidance.js';
import { detectTopic, detectTopics, topicAnswer, cleanSharedAnswer, generalFollowups, guardAnswer, childGeneralAnswer, validateOffline, LIMITED_LABEL } from './ask-thunai.js';
import { ageProfile, suggestionsFor, isAdult, MATCH_ADULTS_NOTE } from './shared/age-guard.js';
import { dailyReview } from './shared/daily.js';
import { clarityPrompt } from './growth.js';

const wait = () => new Promise((r) => setTimeout(r, 40));
const loader = (msg) => `<div class="loader"><i></i><i></i><i></i></div><p class="muted center">${msg}</p>`;
/** Age profile of a family member (calendar age on today's date at the selected place). */
const ageOf = (m) => ageProfile(m, { tz: state.loc?.tz });
const memberOptions = (sel) => state.family.map((m) => `<option value="${esc(m.id)}"${m.id === sel ? ' selected' : ''}>${esc(displayName(m))}</option>`).join('');
const padaOptions = (sel = 1) => [1, 2, 3, 4].map((p) => `<option value="${p}"${p === sel ? ' selected' : ''}>${L('Pada', 'பாதம்')} ${p}</option>`).join('');

function aiBlock(id) {
  return `<div class="card glass" id="${id}" hidden><div class="card-title"><span>✨ ${L('Thunai explains', 'துணை விளக்கம்')}</span><span><button class="link-btn speak-btn" data-target="${id}-text" aria-label="Read aloud">🔊</button> <span class="pill" id="${id}-src"></span></span></div><div class="reply" id="${id}-text"></div></div>`;
}
async function runAi(id, task, context, fallbackText, messages) {
  const box = $(`#${id}`);
  box.hidden = false;
  const out = $(`#${id}-text`);
  out.textContent = L('Thinking…', 'யோசிக்கிறேன்…');
  out.classList.add('typing');
  const r = await aiTask({ task, context, messages, fallbackText, onText: (tx) => { out.textContent = tx; } });
  out.classList.remove('typing');
  $(`#${id}-src`).textContent = '';
  box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('.speak-btn');
  if (b && !speak($(`#${b.dataset.target}`)?.textContent || '')) toast(L('Read-aloud is not available on this device', 'இந்தச் சாதனத்தில் வாசித்துக்காட்டும் வசதி இல்லை'));
});

// ================================================================ TAMIL CALENDAR
let calYM = null;
let calSel = null;
const calCache = new Map();

async function renderCalendar(sec) {
  const loc = state.loc;
  const now = new Date(Date.now() + loc.tz * 3600000);
  if (!calYM) calYM = [now.getUTCFullYear(), now.getUTCMonth()];
  const [y, mo] = calYM;
  const title = new Date(Date.UTC(y, mo, 1)).toLocaleDateString(ta() ? 'ta-IN' : 'en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  sec.innerHTML = `${subHeader(L('Tamil Calendar', 'தமிழ் நாட்காட்டி'), L('Panchangam, festivals, vratham and muhurtha days', 'பஞ்சாங்கம், பண்டிகை, விரதம், முகூர்த்த நாட்கள்'))}
    <div class="card glass">
      <div class="cal-nav"><button class="chip-btn" id="calPrev" aria-label="Previous month">‹</button><b>${esc(title)}</b><button class="chip-btn" id="calNext" aria-label="Next month">›</button></div>
      <div id="calGrid">${loader(L('Calculating the month…', 'மாதம் கணிக்கப்படுகிறது…'))}</div>
      <div class="cal-legend"><span>🎉 ${L('Festival', 'பண்டிகை')}</span><span>🪔 ${L('Vratham', 'விரதம்')}</span><span>💐 ${L('Muhurtham', 'முகூர்த்தம்')}</span><span>🌑 ${L('Amavasai', 'அமாவாசை')}</span><span>🌕 ${L('Pournami', 'பௌர்ணமி')}</span><span><i class="dot-red"></i> ${L('Chandrashtamam', 'சந்திராஷ்டமம்')}</span></div>
    </div>
    <div id="calDay"></div>`;
  $('#calPrev').addEventListener('click', () => { calYM = mo === 0 ? [y - 1, 11] : [y, mo - 1]; calSel = null; renderCalendar(sec); });
  $('#calNext').addEventListener('click', () => { calYM = mo === 11 ? [y + 1, 0] : [y, mo + 1]; calSel = null; renderCalendar(sec); });
  const key = `${y}-${mo}|${loc.lat}|${loc.lon}|${loc.tz}`;
  if (!calCache.has(key)) { await wait(); calCache.set(key, tamilMonth(y, mo, loc.lat, loc.lon, loc.tz)); }
  if (state.view !== 'calendar') return;
  const days = calCache.get(key);
  const m = activeMember();
  const c = m && chartOf(m);
  const todayIso = new Date(Date.now() + loc.tz * 3600000).toISOString().slice(0, 10);
  const firstDow = new Date(Date.UTC(y, mo, 1)).getUTCDay();
  const dows = ta() ? ['ஞா', 'தி', 'செ', 'பு', 'வி', 'வெ', 'ச'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  let html = `<div class="cal-grid">${dows.map((d) => `<div class="cal-dow">${d}</div>`).join('')}`;
  for (let i = 0; i < firstDow; i++) html += '<div></div>';
  days.forEach((d, i) => {
    const icons = [
      d.tithi.index === 29 ? '🌑' : d.tithi.index === 14 ? '🌕' : '',
      d.festivals.some((f) => f.kind === 'festival') ? '🎉' : d.festivals.length ? '🪔' : '',
      d.muhurthaDay ? '💐' : '',
    ].join('');
    const cs = c && d.chandrashtamaRasi === c.janmaRasi.index;
    html += `<button class="cal-cell${d.date === todayIso ? ' today' : ''}${calSel === i ? ' sel' : ''}${[0].includes(d.weekday.index) ? ' sun' : ''}" data-i="${i}">
      <span class="cd">${i + 1}</span><span class="ctd">${esc(ta() ? d.tamil.monthTa.slice(0, 3) : d.tamil.monthEn.slice(0, 3))} ${d.tamil.day}</span>
      <span class="ci2">${icons}</span>${cs ? '<i class="dot-red"></i>' : ''}</button>`;
  });
  html += '</div>';
  $('#calGrid').innerHTML = html;
  $$('.cal-cell', sec).forEach((b) => b.addEventListener('click', () => { calSel = Number(b.dataset.i); $$('.cal-cell', sec).forEach((x) => x.classList.toggle('sel', x === b)); renderCalDay(days[calSel], c); }));
  const idx = calSel ?? days.findIndex((d) => d.date === todayIso);
  if (idx >= 0) renderCalDay(days[idx], c);
}

function renderCalDay(d, c) {
  const loc = state.loc;
  const cs = c && d.chandrashtamaRasi === c.janmaRasi.index;
  $('#calDay').innerHTML = `<div class="card glass">
    <div class="card-title"><span>${fmtIsoDate(d.date)} · ${esc(bi(d.weekday))}</span><span class="pill">${esc(ta() ? `${d.tamil.monthTa} ${d.tamil.day}` : `${d.tamil.monthEn} ${d.tamil.day}`)}</span></div>
    ${d.festivals.length || d.muhurthaDay ? `<div class="fest-row">${d.festivals.map((f) => `<span class="fest ${f.kind}">${f.kind === 'festival' ? '🎉' : '🪔'} ${esc(bi(f))}</span>`).join('')}${d.muhurthaDay ? `<span class="fest muhurtham">💐 ${L('Subha Muhurtha day', 'சுப முகூர்த்த நாள்')}</span>` : ''}</div>` : ''}
    ${cs ? `<p class="tag bad block">⚠️ ${L(`Chandrashtamam for ${c.name}`, `${c.name} அவர்களுக்கு சந்திராஷ்டமம்`)}</p>` : ''}
    <dl class="kv">
      <dt>${L('Sunrise / Sunset', 'உதயம் / அஸ்தமனம்')}</dt><dd>${fmtTime(d.sunrise, loc.tz)} / ${fmtTime(d.sunset, loc.tz)}</dd>
      <dt>${L('Tithi', 'திதி')}</dt><dd>${esc(ta() ? d.tithi.ta : `${d.paksha} ${d.tithi.name}`)} ${L('till', 'வரை')} ${fmtTime(d.tithi.endsAt, loc.tz)}</dd>
      <dt>${L('Star', 'நட்சத்திரம்')}</dt><dd>${esc(nakName(d.nakshatra.index))} ${L('till', 'வரை')} ${fmtTime(d.nakshatra.endsAt, loc.tz)}</dd>
      <dt>${L('Yoga', 'யோகம்')}</dt><dd>${esc(yogaName(d.yoga))}</dd>
      <dt>${L('Karanam', 'கரணம்')}</dt><dd>${esc(karanaName(d))}</dd>
      <dt>${L('Rahu Kalam', 'ராகு காலம்')}</dt><dd>${fmtTime(d.rahuKalam.start, loc.tz)} – ${fmtTime(d.rahuKalam.end, loc.tz)}</dd>
      <dt>${L('Yamagandam', 'எமகண்டம்')}</dt><dd>${fmtTime(d.yamagandam.start, loc.tz)} – ${fmtTime(d.yamagandam.end, loc.tz)}</dd>
      <dt>${L('Guligai', 'குளிகை')}</dt><dd>${fmtTime(d.guligai.start, loc.tz)} – ${fmtTime(d.guligai.end, loc.tz)}</dd>
      <dt>${L('Chandrashtamam', 'சந்திராஷ்டமம்')}</dt><dd>${esc(rasiName(d.chandrashtamaRasi))} ${L('rasi', 'ராசி')}</dd>
    </dl>
    <div class="card-title" style="margin-top:12px">${L('Nalla Neram (Gowri)', 'நல்ல நேரம் (கௌரி)')}</div>
    <div class="gowri">${d.gowri.filter((g) => g.good).map((g) => `<div class="gw good"><b>${esc(bi(g))}</b><span>${fmtTime(g.start, loc.tz)}–${fmtTime(g.end, loc.tz)}</span></div>`).join('')}</div>
  </div>`;
}
registerScreen('calendar', { render: renderCalendar, parent: 'home', needsLoc: true });

// ================================================================ PORUTHAM
const porSide = { girl: { mode: 'star', star: 0, pada: 1, memberId: null }, boy: { mode: 'star', star: 0, pada: 1, memberId: null } };

/** Default family member for a side: a woman for the bride (மணமகள்), a man for the groom (மணமகன்). */
// Marriage matching is for adults only: family members under 18 (or without a birth date) are never offered.
const matchPool = () => state.family.filter((m) => m.relation !== 'organization' && isAdult(m, { tz: state.loc?.tz }));
const sideDefault = (who) => (matchPool().find((m) => m.gender === (who === 'girl' ? 'female' : 'male')) || matchPool()[0])?.id;
const adultOptions = (sel) => matchPool().map((m) => `<option value="${esc(m.id)}"${m.id === sel ? ' selected' : ''}>${esc(displayName(m))}</option>`).join('');
const adultsNote = () => (matchPool().length < state.family.filter((m) => m.relation !== 'organization').length ? `<p class="small muted age-note">🌱 ${esc(bi(MATCH_ADULTS_NOTE))}</p>` : '');
function sideForm(who) {
  const s = porSide[who];
  const hasFamily = matchPool().length > 0;
  return `<div class="por-side"><h3>${who === 'girl' ? `👰 ${L('Bride', 'மணமகள்')}` : `🤵 ${L('Groom', 'மணமகன்')}`}</h3>
    <div class="seg">${hasFamily ? `<button class="${s.mode === 'member' ? 'sel' : ''}" data-who="${who}" data-mode="member">${L('From family', 'குடும்பத்திலிருந்து')}</button>` : ''}<button class="${s.mode === 'star' ? 'sel' : ''}" data-who="${who}" data-mode="star">${L('By star', 'நட்சத்திரம் மூலம்')}</button></div>
    ${s.mode === 'member' && hasFamily ? `<label>${who === 'girl' ? L('Bride', 'மணமகள்') : L('Groom', 'மணமகன்')}<select data-who="${who}" data-f="memberId">${adultOptions(matchPool().some((x) => x.id === s.memberId) ? s.memberId : sideDefault(who))}</select></label>`
    : `<label>${L('Birth star', 'நட்சத்திரம்')}<select data-who="${who}" data-f="star">${starOptions(s.star)}</select></label>
       <label>${L('Pada', 'பாதம்')}<select data-who="${who}" data-f="pada">${padaOptions(s.pada)}</select></label>
       <p class="muted small">${L('Rasi', 'ராசி')}: ${esc(rasiName(rasiOfStarPada(s.star, s.pada)))}</p>`}
  </div>`;
}

function renderPorutham(sec) {
  sec.innerHTML = `${subHeader(L('Thirumana Porutham', 'திருமணப் பொருத்தம்'), L('Traditional 10 poruthams, doshams and dosha samyam', 'பாரம்பரிய 10 பொருத்தங்கள், தோஷங்கள், தோஷ சாம்யம்'))}
    <div class="card glass"><p class="small">⚠️ ${L('Matching only the 10 poruthams by star is not enough. Before finalising a marriage, look at both full horoscopes (birth date, time and place) — papa samyam, dasa sandhi and the marriage houses.', 'நட்சத்திரம் மூலம் 10 பொருத்தம் மட்டும் பார்ப்பது போதாது. திருமணத்தை உறுதி செய்யும் முன் இருவரின் முழு ஜாதகத்தையும் (பிறந்த தேதி, நேரம், இடம்) பாருங்கள் — பாப சாம்யம், தசா சந்தி, திருமண பாவங்கள்.')}</p>
    <button class="btn-gold big-cta" data-go="couple">💑 ${L('Complete Marriage Porutham — with birth date & place of both', 'முழுமையான திருமணப் பொருத்தம் — இருவரின் பிறந்த தேதி, இடத்துடன்')}</button></div>
    <div class="card glass"><div class="card-title">${L('Quick check by star', 'நட்சத்திரம் மூலம் விரைவுப் பொருத்தம்')}</div>${adultsNote()}<div class="por-grid">${sideForm('girl')}${sideForm('boy')}</div>
      ${starSideUsed() ? `<label class="adult-confirm"><input type="checkbox" id="porAdults"${porSide.adultsOk ? ' checked' : ''}> ${L('I confirm both people are adults (18 or older). Marriage matching is never done for anyone under 18.', 'இருவரும் 18 வயது அல்லது அதற்கு மேற்பட்டவர்கள் என்று உறுதி செய்கிறேன். 18 வயதுக்குக் குறைவானவர்களுக்குத் திருமணப் பொருத்தம் பார்க்கப்படுவதில்லை.')}</label><p class="small adult-confirm-err" id="porAdultsErr" role="alert" hidden>${L('Please confirm that both people are 18 or older to see the porutham.', 'பொருத்தம் பார்க்க, இருவரும் 18 வயது அல்லது அதற்கு மேற்பட்டவர்கள் என்று உறுதி செய்யவும்.')}</p>` : ''}
      <button class="btn-gold" id="porBtn">💞 ${L('Check porutham', 'பொருத்தம் பார்க்கவும்')}</button>
      <p class="muted small">${L('Tip: add both people under Family with full birth details to include the Chevvai and Rahu-Ketu dosham check.', 'குறிப்பு: செவ்வாய், ராகு-கேது தோஷ ஆய்வுக்கு இருவரின் முழு பிறப்பு விவரங்களையும் குடும்பத்தில் சேர்க்கவும்.')}</p></div>
    <div id="porResult"></div>${aiBlock('porAi')}`;
  $$('.seg button', sec).forEach((b) => b.addEventListener('click', () => { porSide[b.dataset.who].mode = b.dataset.mode; renderPorutham(sec); }));
  $$('select[data-who]', sec).forEach((s) => s.addEventListener('change', () => {
    const side = porSide[s.dataset.who];
    side[s.dataset.f] = s.dataset.f === 'memberId' ? s.value : Number(s.value);
    if (s.dataset.f !== 'memberId') renderPorutham(sec);
  }));
  $('#porAdults')?.addEventListener('change', (e) => { porSide.adultsOk = e.target.checked; if (e.target.checked) $('#porAdultsErr').hidden = true; });
  $('#porBtn').addEventListener('click', () => {
    // "By star" has no birth date to check, so the person must confirm both are adults before any result is shown.
    if (starSideUsed() && !porSide.adultsOk) { $('#porResult').innerHTML = ''; $('#porAdultsErr').hidden = false; $('#porAdults')?.focus(); return; }
    computePorutham();
  });
}
/** True when either side is entered by star (no family profile, so no date of birth to check the age). */
const starSideUsed = () => ['girl', 'boy'].some((w) => porSide[w].mode !== 'member' || !matchPool().length);

function sideData(who) {
  const s = porSide[who];
  if (s.mode === 'member' && matchPool().length) {
    const m = matchPool().find((x) => x.id === s.memberId) || matchPool().find((x) => x.id === sideDefault(who));
    const c = chartOf(m);
    return { name: displayName(m), star: c.janmaNakshatra.index, rasi: c.janmaRasi.index, doshams: doshams(c.planets, { stability: c.stability }), lagnaUnknown: !hasLagna(c), chart: c };
  }
  return { name: who === 'girl' ? L('Bride', 'மணமகள்') : L('Groom', 'மணமகன்'), star: s.star, rasi: rasiOfStarPada(s.star, s.pada) };
}

function computePorutham() {
  const g = sideData('girl'), b = sideData('boy');
  const r = matchPorutham(g, b);
  document.dispatchEvent(new CustomEvent('kj:task', { detail: 'porutham' })); // metrics: porutham result shown (consent-gated, growth.js)
  const samyam = g.doshams && b.doshams ? doshaSamyam(g.doshams, b.doshams) : null;
  // No verdict and no combined score: the count of factors that agree, the key factors to discuss, a neutral
  // summary and the detailed view (screens-couple.js poruthamView), then optional talking points.
  $('#porResult').innerHTML = `${poruthamView(r, {
    names: [g.name, b.name], doshas: g.doshams && b.doshams ? [g.doshams, b.doshams] : null, charts: [g.chart, b.chart], lagnaUnknown: [!!g.lagnaUnknown, !!b.lagnaUnknown], samyam,
    starOnly: !(g.doshams && b.doshams),
    header: `<div class="muted small">${esc(g.name)} (${esc(nakName(g.star))}) · ${esc(b.name)} (${esc(nakName(b.star))})</div>`,
  })}
    ${discussionHtml()}
    <button class="btn-gold" id="porExplain">✨ ${L('Thunai explains', 'துணை விளக்கம்')}</button>`;
  $('#porExplain').addEventListener('click', () => {
    const context = { bride: { name: g.name, star: NAKSHATRAS[g.star].en, rasi: RASIS[g.rasi].en }, groom: { name: b.name, star: NAKSHATRAS[b.star].en, rasi: RASIS[b.rasi].en },
      poruthams: r.rows.map((x) => ({ name: x.en, result: x.label.en, detail: x.detail.en })), factorsAgree: `${r.agree} of ${r.rows.length}`, keyFactors: r.keyFactors.map((k) => `${k.en}: ${k.label.en}`), doshaSamyam: samyam?.map((n) => n.en),
      rules: 'No verdict, no score, no advice to marry or not; describe each factor neutrally and suggest talking it through together.' };
    const fallback = `${bi(r.summary)}\n${r.rows.filter((x) => x.status !== 'uttamam').map((x) => `• ${ta() ? x.ta : x.en}: ${bi(x.label)}`).join('\n')}\n${bi(r.note)}`;
    runAi('porAi', 'porutham', context, fallback);
  });
}
registerScreen('porutham', { render: renderPorutham, parent: 'home' });

// ================================================================ MUHURTHAM
const MU_CATS = ['marriage', 'graha_pravesam', 'vehicle', 'naming', 'ear_piercing', 'annaprasanam', 'vidyarambam', 'business', 'property', 'gold_vehicle', 'contract', 'travel', 'office', 'surgery', 'manjal_neerattu', 'delivery', 'launch', 'tech_partner', 'bhoomi_pooja', 'visa'];
const muForm = { category: 'marriage', days: 30, persons: null };
// A wedding muhurtham is never searched for a person under 18 — only adults are offered for that event.
const muPeople = () => (muForm.category === 'marriage' ? matchPool() : state.family);

function renderMuhurtham(sec, params = {}) {
  if (params.category && MU_CATS.includes(params.category)) muForm.category = params.category;
  if (params.allFamily) muForm.persons = state.family.filter((m) => m.relation !== 'organization').map((m) => m.id);
  if (!muForm.persons) muForm.persons = activeMember() ? [activeMember().id] : [];
  sec.innerHTML = `${subHeader(L('Muhurtham Finder', 'முகூர்த்தம் தேடல்'), L('Finds good dates and times that suit everyone involved', 'சம்பந்தப்பட்ட அனைவருக்கும் ஏற்ற நல்ல நாள், நேரம்'))}
    <div class="card glass">
      <label>${L('Event', 'நிகழ்வு')}<select id="muCat">${MU_CATS.map((id) => { const c = getCategory(id); return `<option value="${id}"${id === muForm.category ? ' selected' : ''}>${c.icon} ${esc(bi(c))}</option>`; }).join('')}</select></label>
      <label>${L('Search in the next', 'அடுத்த')}<select id="muDays">${[15, 30, 60, 90].map((d) => `<option value="${d}"${d === muForm.days ? ' selected' : ''}>${d} ${L('days', 'நாட்கள்')}</option>`).join('')}</select></label>
      ${state.family.length ? `<div class="mini-label">${L('Check for these family members', 'இவர்களுக்கு ஏற்றதாக')}</div>${muForm.category === 'marriage' ? adultsNote() : ''}<div class="member-switch">${muPeople().map((m) => `<label class="mchip${muForm.persons.includes(m.id) ? ' sel' : ''}"><input type="checkbox" value="${esc(m.id)}"${muForm.persons.includes(m.id) ? ' checked' : ''}> ${esc(displayName(m))}</label>`).join('')}</div>` : ''}
      <p class="muted small">📍 ${esc(placeName(state.loc.name))} · ${L('Rahu Kalam, Yamagandam, Ashtami, Navami, Amavasai and Chandrashtamam are always excluded.', 'ராகு காலம், எமகண்டம், அஷ்டமி, நவமி, அமாவாசை, சந்திராஷ்டமம் எப்போதும் தவிர்க்கப்படும்.')}</p>
      ${muForm.category === 'delivery' ? `<p class="tag warn block">${L('Only for a planned delivery already advised by your doctor — the doctor\'s medical decision always comes first.', 'மருத்துவர் ஏற்கனவே பரிந்துரைத்த திட்டமிட்ட பிரசவத்திற்கு மட்டும் — மருத்துவரின் முடிவே எப்போதும் முதன்மை.')}</p>` : ''}
      ${muForm.category === 'vehicle' ? `<p class="muted small">🚗 ${L('Two-wheeler, auto, car or lorry: only Ashwini, Rohini, Mrigasirisham, Punarpoosam, Poosam, Uthiram, Hastham, Chithirai, Swathi, Anusham, Uthiradam, Thiruvonam, Avittam, Sathayam, Uthirattathi and Revathi stars; no Tuesday / Saturday, Kuligai, Theipirai Prathamai or bad yoga; Venus, Mercury, Moon or Jupiter Horai preferred.', 'இரு சக்கர வாகனம், ஆட்டோ, கார், லாரி: அஸ்வினி, ரோகிணி, மிருகசீரிஷம், புனர்பூசம், பூசம், உத்திரம், அஸ்தம், சித்திரை, சுவாதி, அனுஷம், உத்திராடம், திருவோணம், அவிட்டம், சதயம், உத்திரட்டாதி, ரேவதி நட்சத்திரங்கள் மட்டும்; செவ்வாய், சனிக்கிழமை, குளிகை, தேய்பிறை பிரதமை, தீய யோகம் தவிர்க்கப்படும்; சுக்கிரன், புதன், சந்திரன், குரு ஓரை சிறப்பு.')}</p>` : ''}
      <button class="btn-gold" id="muBtn">🗓️ ${L('Find muhurtham', 'முகூர்த்தம் தேடு')}</button>
    </div><div id="muVehicle"></div><div id="muResult"></div>`;
  $('#muCat').addEventListener('change', (e) => { muForm.category = e.target.value; renderMuhurtham(sec); });
  $('#muDays').addEventListener('change', (e) => { muForm.days = Number(e.target.value); });
  $$('.member-switch input', sec).forEach((i) => i.addEventListener('change', () => {
    muForm.persons = $$('.member-switch input', sec).filter((x) => x.checked).map((x) => x.value);
    i.parentElement.classList.toggle('sel', i.checked);
    if (muForm.category === 'vehicle') renderVehicleYoga();
  }));
  if (muForm.category === 'vehicle') renderVehicleYoga();
  $('#muBtn').addEventListener('click', async () => {
    $('#muResult').innerHTML = `<div class="card glass">${loader(L('Checking every half hour of every day…', 'ஒவ்வொரு நாளின் ஒவ்வொரு அரை மணி நேரமும் ஆராயப்படுகிறது…'))}</div>`;
    await wait();
    const persons = muForm.persons.map((id) => muPeople().find((m) => m.id === id)).filter(Boolean).map((m) => { const c = chartOf(m); return { name: m.name, janmaNakshatra: c.janmaNakshatra.index, janmaRasi: c.janmaRasi.index }; });
    const res = findMuhurtham({ category: muForm.category, loc: state.loc, persons, days: muForm.days });
    renderMuResults(res, '#muResult', { showReasons: muForm.category === 'vehicle' });
  });
}

// Personal Vahana Yogam card: chart promise + next Dasa window (predictEvent), plus vehicle colour and
// registration-number total from the person's lucky colours and numbers.
function renderVehicleYoga() {
  const box = $('#muVehicle');
  if (!box) return;
  const people = muForm.persons.map((id) => state.family.find((m) => m.id === id)).filter((m) => m && m.relation !== 'organization' && m.date).slice(0, 3);
  if (!people.length) { box.innerHTML = ''; return; }
  box.innerHTML = `<div class="card glass">${loader(L('Reading the Jathagam…', 'ஜாதகம் ஆராயப்படுகிறது…'))}</div>`;
  const tz = state.loc?.tz ?? 5.5;
  const monthYear = (d) => new Date(d.getTime() + tz * 3600000).toLocaleDateString(ta() ? 'ta-IN' : 'en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  const level = (lv) => (lv === 'strong' ? L('Strong', 'வலுவானது') : lv === 'good' ? L('Good', 'நன்று') : L('Comes with effort', 'முயற்சியால் கிடைக்கும்'));
  setTimeout(() => {
    box.innerHTML = people.map((m) => {
      const c = chartOf(m);
      let r, g;
      try { r = predictEvent(c, 'vehicle'); g = personalGuide(c, { date: m.date }); } catch { return ''; }
      const now = Date.now();
      const w = (r.earliest && r.earliest.peakTo > now ? r.earliest : null) || r.windows.find((x) => x.peakTo > now) || null;
      const running = w && w.peakFrom <= now;
      const colors = (g.luckyColors || []).filter(Boolean);
      const lucky = g.numbers?.lucky || [];
      const avoid = g.numbers?.avoid || [];
      return `<div class="card glass">
        <div class="card-title">🚗 ${L('Vehicle yoga as per your Jathagam', 'உங்கள் ஜாதகப்படி வாகன யோகம்')}</div>
        <div class="mini-label">${esc(displayName(m))}</div>
        <span class="tag ${r.promise.level === 'needs effort' ? 'warn' : 'good'}">${L('Promise in chart', 'ஜாதக வாக்குறுதி')}: ${level(r.promise.level)}</span>
        <p class="small">${w
          ? `${running ? L('Vehicle period running now', 'வாகன யோக காலம் இப்போது நடக்கிறது') : L('Next best period', 'அடுத்த சிறந்த காலம்')}: <b>${monthYear(w.peakFrom)} – ${monthYear(w.peakTo)}</b> · ${GLYPH[w.md]} ${esc(planetName(w.md))} ${L('Dasa', 'தசை')}, ${GLYPH[w.ad]} ${esc(planetName(w.ad))} ${L('Bhukti', 'புக்தி')}${w.doubleTransit ? ` · ${L('Guru + Sani support', 'குரு + சனி ஆதரவு')}` : ''}`
          : L('No strong Dasa period soon — choose a good muhurtham below and do the Friday Mahalakshmi lamp.', 'விரைவில் வலுவான தசை காலம் இல்லை — கீழே நல்ல முகூர்த்தம் தேர்ந்து, வெள்ளி மகாலட்சுமி தீபம் ஏற்றவும்.')}</p>
        ${colors.length ? `<div class="small">🎨 ${L('Vehicle colour that suits you', 'உங்களுக்கு ஏற்ற வாகன நிறம்')}: ${colors.map((x) => `<span class="pill"><span style="display:inline-block;width:.8em;height:.8em;border-radius:50%;vertical-align:middle;background:${esc(x.hex)}"></span> ${esc(bi(x))}</span>`).join(' ')}</div>` : ''}
        ${lucky.length ? `<div class="small">🔢 ${L('Registration number total (digit sum) to prefer', 'பதிவு எண் கூட்டுத்தொகை')}: <b>${lucky.join(', ')}</b>${avoid.length ? ` · ${L('avoid', 'தவிர்க்க')}: ${avoid.join(', ')}` : ''}</div>` : ''}
        <p class="small">🪔 ${esc(bi(r.remedy))}</p>
        <button class="chip-btn" data-go="numerology">🔢 ${L('Check a vehicle number in Numerology', 'எண் கணிதத்தில் வாகன எண்ணைச் சரிபார்க்க')}</button>
      </div>`;
    }).join('');
  }, 30);
}

const atLocal = (date, time) => { const [y, mo, d] = date.split('-').map(Number); const [h, mi] = time.split(':').map(Number); return new Date(Date.UTC(y, mo - 1, d, h, mi) - (state.loc?.tz ?? 5.5) * 3600000); };
function renderMuResults(res, target, { showReasons = false } = {}) {
  const loc = state.loc;
  $(target).innerHTML = res.length ? res.map((w, i) => `<div class="card glass mu-card">
      <div class="mu-rank">${i + 1}</div>
      <div style="flex:1"><div class="mini-value">${fmtIsoDate(w.date)} · ${esc(bi(w.weekday))}</div>
        <div><b>${fmtTime(w.start, loc.tz)} – ${fmtTime(w.end, loc.tz)}</b> ${remindBtn({ title: `${L('Muhurtham', 'முகூர்த்தம்')} ${fmtTime(w.start, loc.tz)}`, at: w.start, label: L('Remind', 'நினைவூட்டு') })}</div>
        <div class="muted small">${esc(nakName(w.nakshatra.index))} · ${esc(ta() ? w.tithi.ta : w.tithi.name)}${w.lagna ? ` · ${L('Lagna', 'லக்னம்')} ${esc(bi({ en: w.lagna.name.en, ta: w.lagna.name.ta }))}` : ''} · ${esc(planetName(w.hora))} ${L('Horai', 'ஓரை')}</div>
        ${showReasons && w.reasons?.length ? `<div class="small">${w.reasons.slice(0, 4).map((x) => `✓ ${esc(bi(x))}`).join('<br>')}</div>` : ''}
        <details><summary>${L('Why this time?', 'ஏன் இந்த நேரம்?')}</summary>${w.factors.map((f) => `<div class="factor"><span>${esc(ta() ? f.labelTa : f.label)}</span><b class="${f.points > 0 ? 'pos' : f.points < 0 ? 'neg' : 'zero'}">${f.points > 0 ? '+' : ''}${f.points}</b></div>`).join('')}</details>
      </div><div class="mu-score">${w.score}</div></div>`).join('')
    : `<div class="card glass"><p>${L('No fully auspicious time found in this period. Try a longer period.', 'இந்தக் காலத்தில் முழுமையான சுப நேரம் இல்லை. நீண்ட காலத்தைத் தேர்வு செய்யவும்.')}</p></div>`;
}
registerScreen('muhurtham', { render: renderMuhurtham, parent: 'home', needsLoc: true });

// ================================================================ RUTHU / MANJAL NEERATTU
function renderRuthu(sec) {
  const girls = state.family;
  const localNow = new Date(Date.now() + state.loc.tz * 3600000).toISOString().slice(0, 16);
  sec.innerHTML = `${subHeader(L('Ruthu & Manjal Neerattu', 'ருது & மஞ்சள் நீராட்டு'), L('Note the time she came of age — we find the first-bath time and the ceremony muhurtham', 'பூப்பெய்திய நேரத்தைக் குறிக்கவும் — தண்ணீர் ஊற்றும் நேரமும் விழா முகூர்த்தமும் கணிக்கப்படும்'))}
    <div class="card glass">
      ${girls.length ? `<label>${L('Girl', 'பெண்')}<select id="ruGirl"><option value="">${L('— choose star instead —', '— நட்சத்திரம் தேர்வு —')}</option>${memberOptions(null)}</select></label>` : ''}
      <div class="row2" id="ruStarRow"><label>${L('Birth star', 'நட்சத்திரம்')}<select id="ruStar">${starOptions(0)}</select></label><label>${L('Pada', 'பாதம்')}<select id="ruPada">${padaOptions(1)}</select></label></div>
      <label>${L('Date and time she came of age', 'பூப்பெய்திய தேதி, நேரம்')}<input type="datetime-local" id="ruTime" value="${localNow}"></label>
      <button class="btn-gold" id="ruBtn">🌸 ${L('Calculate', 'கணிக்கவும்')}</button>
      <p class="muted small">${L('Family customs differ. Use these timings with your elders\' and family priest\'s guidance.', 'குடும்ப வழக்கங்கள் மாறுபடும். பெரியோர், குடும்பப் புரோகிதர் வழிகாட்டுதலுடன் பயன்படுத்தவும்.')}</p>
    </div><div id="ruResult"></div>${aiBlock('ruAi')}`;
  $('#ruGirl')?.addEventListener('change', (e) => { $('#ruStarRow').hidden = !!e.target.value; });
  $('#ruBtn').addEventListener('click', async () => {
    const loc = state.loc;
    const [d, tm] = $('#ruTime').value.split('T');
    if (!d || !tm) { toast(L('Please enter the date and time', 'தேதி, நேரத்தை உள்ளிடவும்')); return; }
    const [yy, mm, dd] = d.split('-').map(Number); const [hh, mi] = tm.split(':').map(Number);
    const at = new Date(Date.UTC(yy, mm - 1, dd, hh, mi) - loc.tz * 3600000);
    let person;
    const gid = $('#ruGirl')?.value;
    if (gid) { const c = chartOf(state.family.find((m) => m.id === gid)); person = { name: c.name, janmaNakshatra: c.janmaNakshatra.index, janmaRasi: c.janmaRasi.index }; }
    else { const s = Number($('#ruStar').value), p = Number($('#ruPada').value); person = { name: L('Girl', 'பெண்'), janmaNakshatra: s, janmaRasi: rasiOfStarPada(s, p) }; }
    $('#ruResult').innerHTML = `<div class="card glass">${loader(L('Calculating…', 'கணிக்கப்படுகிறது…'))}</div>`;
    await wait();
    const p = panchang(at, loc.lat, loc.lon, loc.tz, { withEnds: false });
    const bath = findMuhurtham({ category: 'ruthu_bath', loc, persons: [], from: at, days: 3, stepMin: 15, top: 3 });
    const vizha = findMuhurtham({ category: 'manjal_neerattu', loc, persons: [person], from: new Date(at.getTime() + 5 * 86400000), days: 60, top: 5 });
    $('#ruResult').innerHTML = `<div class="card glass"><div class="card-title">${L('At the moment of Ruthu', 'ருது நேரத்தில்')}</div>
        <dl class="kv"><dt>${L('Weekday', 'கிழமை')}</dt><dd>${esc(bi(p.weekday))}</dd><dt>${L('Tithi', 'திதி')}</dt><dd>${esc(ta() ? p.tithi.ta : `${p.tithi.paksha} ${p.tithi.name}`)}</dd>
        <dt>${L('Star', 'நட்சத்திரம்')}</dt><dd>${esc(nakName(p.nakshatra.index))}</dd><dt>${L('Lagna', 'லக்னம்')}</dt><dd>${esc(rasiName(p.lagna.rasi))}</dd>
        <dt>${L('Horai', 'ஓரை')}</dt><dd>${esc(planetName(p.currentHora.lord))}</dd></dl>
        <button class="link-btn" id="ruExplain">✨ ${L('Thunai explains', 'துணை விளக்கம்')}</button></div>
      <div class="section-title">💧 ${L('First bath (Thanneer oothuthal) — best times', 'தண்ணீர் ஊற்றுதல் — சிறந்த நேரம்')}</div><div id="ruBath"></div>
      <div class="section-title">🌼 ${L('Manjal Neerattu Vizha — muhurtham dates', 'மஞ்சள் நீராட்டு விழா — முகூர்த்த நாட்கள்')}</div><div id="ruVizha"></div>`;
    renderMuResults(bath, '#ruBath');
    renderMuResults(vizha, '#ruVizha');
    $('#ruExplain').addEventListener('click', () => {
      const context = { event: 'Ruthu (a girl coming of age)', at: { weekday: p.weekday.en, tithi: `${p.tithi.paksha} ${p.tithi.name}`, star: p.nakshatra.name, lagna: p.lagna.rasiName, horai: p.currentHora.lord },
        firstBathTimes: bath.map((w) => `${w.date} ${fmtTime(w.start, loc.tz)}-${fmtTime(w.end, loc.tz)}`), ceremonyDates: vizha.map((w) => `${w.date} ${fmtTime(w.start, loc.tz)}`) };
      runAi('ruAi', 'chat', context, L('Please see the timings above and consult your family elders.', 'மேலே உள்ள நேரங்களைப் பார்த்து பெரியோரை ஆலோசிக்கவும்.'), [{ role: 'user', content: 'Explain the Ruthu time gently and positively for the family, suggest simple traditional customs and a prayer, and point to the best first-bath time and ceremony dates from the data. Avoid anything that could worry the girl or family.' }]);
    });
  });
}
registerScreen('ruthu', { render: renderRuthu, parent: 'home', needsLoc: true });

// ================================================================ PARIGARAM
function renderParigaram(sec) {
  refreshSnap();
  const snap = state.snap;
  const m = activeMember();
  const c = m && chartOf(m);
  const items = dailyParigaram({ weekday: snap.weekday.index, chart: c, snapshot: snap });
  const weak = c ? grahaStrength(c.planets).filter((g) => g.level === 'weak').map((g) => g.planet) : [];
  const card = (k, open) => {
    const n = NAVAGRAHA[k];
    return `<details class="card glass nava"${open ? ' open' : ''}><summary><span class="pg" style="color:${COLOR[k]}">${GLYPH[k]}</span> <b>${esc(planetName(k))}</b> · ${esc(bi(n.deity))}${weak.includes(k) ? ` <span class="tag bad">${L('weak for you', 'உங்களுக்குப் பலவீனம்')}</span>` : ''}</summary>
      <dl class="kv"><dt>${L('Governs', 'காரகம்')}</dt><dd>${esc(bi(n.governs))}</dd>
      ${n.day != null ? `<dt>${L('Day', 'கிழமை')}</dt><dd>${esc(ta() ? ['ஞாயிறு', 'திங்கள்', 'செவ்வாய்', 'புதன்', 'வியாழன்', 'வெள்ளி', 'சனி'][n.day] : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][n.day])}</dd>` : ''}
      <dt>${L('Colour', 'நிறம்')}</dt><dd>${esc(bi(n.color))}</dd><dt>${L('Grain (dhanyam)', 'தானியம்')}</dt><dd>${esc(bi(n.grain))}</dd>
      <dt>${L('Temple', 'கோவில்')}</dt><dd>${esc(bi(n.temple))}</dd></dl>
      <p>🪔 <b>${L('Free remedy', 'இலவச பரிகாரம்')}:</b> ${esc(bi(n.free))}</p>
      <p>🤲 <b>${L('Charity', 'தானம்')}:</b> ${esc(bi(n.charity))}</p>
      <p class="mantra">📿 ${esc(bi(n.mantra))} <button class="link-btn say" data-say="${esc(n.mantra.ta)}" aria-label="Read aloud">🔊</button></p>
      <p class="muted small">💎 ${L('Gemstone', 'ரத்தினம்')}: ${esc(bi(n.gem))} — ${L('wear only after a careful personal consultation; it is never required.', 'கவனமான தனிப்பட்ட ஆலோசனைக்குப் பின் மட்டும் அணியவும்; இது கட்டாயமல்ல.')}</p></details>`;
  };
  const rec = c ? sthalamPicks(c, weak) : [];
  sec.innerHTML = `${subHeader(L('Parigaram', 'பரிகாரம்'), L('Simple, free remedies first — for peace, health and prosperity', 'எளிய இலவச பரிகாரங்கள் முதலில் — அமைதி, ஆரோக்கியம், செல்வத்திற்கு'))}
    ${rec.length ? sthalamCard(rec, m) : ''}
    <div class="card glass"><div class="card-title">🌅 ${L('For today', 'இன்றைக்கு')}${m ? ` · ${esc(displayName(m))}` : ''}</div>
      ${items.map((i) => `<div class="pari-row"><span class="pg" style="color:${COLOR[i.planet]}">${GLYPH[i.planet]}</span><div><b>${esc(bi(i.reason))}</b><p>${esc(bi(i.free))}</p><p class="muted small">🛕 ${esc(bi(i.deity))} · ${esc(bi(i.temple))}</p></div></div>`).join('')}
    </div>
    <div class="section-title">${L('Navagraha parigaram', 'நவகிரக பரிகாரம்')}</div>
    ${['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'].map((k) => card(k, weak.includes(k))).join('')}`;
  $$('.say', sec).forEach((b) => b.addEventListener('click', () => speak(b.dataset.say)));
  $('#stPlan')?.addEventListener('click', () => {
    const ids = $$('input[name=stTemple]:checked', sec).map((x) => x.value);
    if (!ids.length) { toast(L('Choose at least one temple', 'குறைந்தது ஒரு கோவிலைத் தேர்வு செய்யுங்கள்')); return; }
    go('journey', { temples: ids, date: $('#stDate').value, travellers: Number($('#stTrav').value) || 1, days: Number($('#stDays').value) || 1, auto: true });
  });
  // Sthalam picker: search any temple (Tamil / English / Tanglish) and add it, ticked, to the list above.
  attachTempleSearch($('#stSearch'), { keepText: false, onPick: (t) => {
    const rows = $('.st-rows', sec);
    const have = $(`input[name=stTemple][value="${CSS.escape(t.id)}"]`, sec);
    if (have) { have.checked = true; have.closest('.st-row')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    rows.insertAdjacentHTML('beforeend', stRow({ temple: t, planet: t.planet, why: L('You chose this temple', 'நீங்கள் தேர்ந்தெடுத்த கோவில்') }, true, $('#stDate').value));
    $('#stSearch').value = '';
  } });
}

// Recommended parigara sthalam(s) from the running Dasa / Bhukti lords and the weakest planet.
function sthalamPicks(c, weak) {
  const now = new Date();
  const md = c.dasa?.current?.lord, ad = c.dasa?.currentBhukti?.lord;
  const picks = [];
  const add = (planet, why) => {
    if (!planet || picks.some((p) => p.planet === planet)) return;
    const t = TEMPLES.find((x) => x.planet === planet);
    if (t) picks.push({ planet, why, temple: t });
  };
  add(md, L(`Your running ${planet(md)} Dasa`, `நடப்பு ${planet(md)} தசை`));
  add(ad, L(`Your running ${planet(ad)} Bhukti`, `நடப்பு ${planet(ad)} புக்தி`));
  add(weak[0], L(`${planet(weak[0])} needs support in your chart`, `உங்கள் ஜாதகத்தில் ${planet(weak[0])} பலம் பெற`));
  void now;
  return picks.slice(0, 3);
}
const planet = (k) => (k ? planetName(k) : '');
const DAY_OF = { Sun: 0, Moon: 1, Mars: 2, Mercury: 3, Jupiter: 4, Venus: 5, Saturn: 6, Rahu: 6, Ketu: 2 };
function nextWeekday(wd) {
  const d = new Date(Date.now() + (state.loc?.tz ?? 5.5) * 3600000);
  let add = (wd - d.getUTCDay() + 7) % 7; if (add < 2) add += 7;
  d.setUTCDate(d.getUTCDate() + add);
  return d.toISOString().slice(0, 10);
}
/** One sthalam row (tick to include in the journey). r: { temple, planet, why }. */
function stRow(r, checked, date) {
  const loc = state.loc;
  const t = r.temple; const info = templeInfo(t.id);
  const km = loc ? Math.round(distanceKm(loc.lat, loc.lon, t.lat, t.lon) * 1.3) : null;
  const di = dayInfo(date, t);
  return `<label class="st-row"><input type="checkbox" name="stTemple" value="${esc(t.id)}"${checked ? ' checked' : ''}>
      <span class="st-body"><span class="st-why">${r.planet ? `<span style="color:${COLOR[r.planet]}">${GLYPH[r.planet]}</span>` : '🛕'} ${esc(r.why)}</span>
      <b>${esc(bi(t.name))}</b><span class="small muted">${esc(bi(t.deity))} · ${esc(placeName(t.town))}${km ? ` · ~${km.toLocaleString()} ${L('km', 'கி.மீ')}` : ''}</span>
      <span class="small">🕘 ${L('Darshan', 'தரிசனம்')}: ${esc(info ? bi(info.timings) : '—')}</span>
      <span class="small">📞 ${L('Phone', 'தொலைபேசி')}: — · <a href="${templeLinks(t).contact}" target="_blank" rel="noopener">${L('Maps listing', 'வரைபடப் பட்டியல்')}</a></span>
      ${info?.festival ? `<span class="small">🎉 ${L('Festival', 'திருவிழா')}: ${esc(bi(info.festival))}</span>` : ''}
      <span class="small">👥 ${{ high: L('Heavy crowd on the suggested day', 'பரிந்துரைத்த நாளில் அதிக கூட்டம்'), medium: L('Moderate crowd', 'மிதமான கூட்டம்'), low: L('Usually calm', 'பொதுவாக அமைதி') }[di.crowd]}</span>
      ${r.planet && NAVAGRAHA[r.planet] ? `<span class="small">🪔 ${esc(bi(NAVAGRAHA[r.planet].free))}</span>` : ''}</span></label>`;
}
function sthalamCard(rec, m) {
  const date = nextWeekday(DAY_OF[rec[0].planet] ?? 0);
  return `<section class="card glass sthalam-card" aria-labelledby="stTitle">
    <div class="card-title"><span id="stTitle">🛕 ${L('Your parigara sthalam', 'உங்களுக்கான பரிகார ஸ்தலம்')}${m ? ` · ${esc(displayName(m))}` : ''}</span></div>
    <div class="st-rows">${rec.map((r, i) => stRow(r, i === 0, date)).join('')}</div>
    ${templeSearchField({ id: 'stSearch', label: L('Add another temple — type its name', 'வேறு கோவிலைச் சேர்க்க — பெயரைத் தட்டச்சு செய்யுங்கள்') })}
    <div class="st-form">
      <label>${L('Date', 'தேதி')}<input type="date" id="stDate" value="${date}"></label>
      <label>${L('Travellers', 'பயணிகள்')}<select id="stTrav">${[1, 2, 3, 4, 5, 6, 8, 10].map((n) => `<option${n === Math.max(1, Math.min(10, state.family.filter((x) => x.relation !== 'organization').length || 1)) ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
      <label>${L('Days', 'நாட்கள்')}<select id="stDays">${[1, 2, 3].map((n) => `<option>${n}</option>`).join('')}</select></label>
    </div>
    <button class="btn-gold" id="stPlan" type="button">🧭 ${L('Plan the journey — route, weather, timings, stay', 'பயணத் திட்டம் — வழி, வானிலை, நேரம், தங்குமிடம்')}</button>
  </section>`;
}
registerScreen('parigaram', { render: renderParigaram, parent: 'home', needsLoc: true });

// Baby names: see screens-names.js (offline name-suggestion engine).

// ================================================================ THIVASAM / THARPANAM
function upcomingAmavasai(loc, count = 4) {
  const out = [];
  let d = new Date();
  for (let i = 0; i < 100 && out.length < count; i++, d = new Date(d.getTime() + 86400000)) {
    const day = vedicDay(d, loc.lat, loc.lon);
    const p = panchang(new Date(day.sunrise.getTime() + 60000), loc.lat, loc.lon, loc.tz, { withEnds: false });
    const iso = new Date(day.sunrise.getTime() + loc.tz * 3600000).toISOString().slice(0, 10);
    if (p.tithi.index === 29 && !out.some((x) => x.date === iso)) out.push({ date: iso, weekday: p.weekday });
  }
  return out;
}

function renderThivasam(sec) {
  const loc = state.loc;
  sec.innerHTML = `${subHeader(L('Thivasam & Tharpanam', 'திவசம் & தர்ப்பணம்'), L('Remember our ancestors on the right tithi every year', 'ஒவ்வொரு ஆண்டும் சரியான திதியில் முன்னோர்களை நினைவுகூர'))}
    <div id="ancList">${loader(L('Calculating…', 'கணிக்கப்படுகிறது…'))}</div>
    <div class="card glass"><div class="card-title">➕ ${L('Add an ancestor', 'முன்னோரைச் சேர்க்கவும்')}</div>
      <label>${L('Name', 'பெயர்')}<input id="anName" maxlength="60"></label>
      <div class="row2"><label>${L('Date of passing', 'மறைந்த தேதி')}<input id="anDate" type="date"></label><label>${L('Time (approx.)', 'நேரம் (தோராயமாக)')}<input id="anTime" type="time" value="12:00"></label></div>
      <button class="btn-gold" id="anAdd">🙏 ${L('Save and calculate', 'சேமித்து கணிக்கவும்')}</button>
      <p class="muted small">${L('Uses the Tamil month and the tithi prevailing at the time of passing; the annual day is when that tithi prevails in the afternoon of the same Tamil month.', 'மறைந்த நேரத்தின் தமிழ் மாதம், திதி அடிப்படையில்; அதே தமிழ் மாதத்தில் அந்தத் திதி மதியம் நிலவும் நாள் ஆண்டு திவசம்.')}</p></div>
    <div class="card glass"><div class="card-title">🌑 ${L('Upcoming Amavasai (tharpanam)', 'வரும் அமாவாசை (தர்ப்பணம்)')}</div><div id="amaList">${loader('')}</div></div>`;
  $('#anAdd').addEventListener('click', () => {
    const name = $('#anName').value.trim(), date = $('#anDate').value, time = $('#anTime').value || '12:00';
    if (!name || !date) { toast(L('Please enter the name and date', 'பெயர், தேதியை உள்ளிடவும்')); return; }
    state.ancestors.push({ id: Math.random().toString(36).slice(2, 9), name, date, time, lat: loc.lat, lon: loc.lon, tz: loc.tz });
    saveFamily();
    renderThivasam(sec);
  });
  setTimeout(() => {
    if (state.view !== 'thivasam') return;
    $('#ancList').innerHTML = state.ancestors.map((a) => {
      const [y, mo, d] = a.date.split('-').map(Number); const [h, mi] = a.time.split(':').map(Number);
      const death = new Date(Date.UTC(y, mo - 1, d, h, mi) - a.tz * 3600000);
      const th = thivasamDates({ death, loc: { lat: a.lat, lon: a.lon, tz: a.tz } });
      return `<div class="card glass"><div class="card-title"><span>🙏 ${esc(a.name)}</span><button class="link-btn del-anc" data-id="${esc(a.id)}">${L('Remove', 'நீக்கு')}</button></div>
        <p>${esc(ta() ? `${th.month.ta} மாதம் · ${th.tithi.paksha === 'Shukla' ? 'வளர்பிறை' : 'தேய்பிறை'} ${th.tithi.ta}` : `${th.month.en} month · ${th.tithi.paksha} ${th.tithi.name}`)}</p>
        ${th.dates.map((x) => `<div class="best">📅 <b>${fmtIsoDate(x.date)}</b> · ${esc(bi(x.weekday))} · ${esc(ta() ? `${x.tamil.monthTa} ${x.tamil.day}` : `${x.tamil.monthEn} ${x.tamil.day}`)} ${remindBtn({ title: `${L('Thivasam', 'திவசம்')} · ${a.name || ''}`, at: atLocal(x.date, '06:00') })}</div>`).join('')}</div>`;
    }).join('') || `<p class="muted center">${L('No ancestors added yet.', 'இன்னும் யாரும் சேர்க்கப்படவில்லை.')}</p>`;
    $$('.del-anc').forEach((b) => b.addEventListener('click', () => { state.ancestors = state.ancestors.filter((x) => x.id !== b.dataset.id); saveFamily(); renderThivasam(sec); }));
    $('#amaList').innerHTML = upcomingAmavasai(loc).map((x) => `<div class="factor"><span>🌑 ${fmtIsoDate(x.date)}</span><b class="zero">${esc(bi(x.weekday))}</b></div>`).join('');
  }, 40);
}
registerScreen('thivasam', { render: renderThivasam, parent: 'home', needsLoc: true });

// ================================================================ NATCHATHIRA BIRTHDAY
// Star birthdays and the 60th / 70th / 80th celebrations are calculated for the RESIDENCE (where the family lives
// and celebrates), never the birth place: sunrise and the Tamil month days differ between places.
const homeLoc = () => state.residence || state.loc;
const tamilText = (t) => (ta() ? `${t.monthTa} ${t.day}` : `${t.monthEn} ${t.day}`);
function starNote(x) {
  const lines = [];
  if (x.chosenBy !== 'only') {
    lines.push(L(`The star comes twice this month (${x.occurrences.map(fmtIsoDate).join(', ')}) — the ${x.chosenBy} is taken.`,
      `இம்மாதம் நட்சத்திரம் இரண்டு முறை (${x.occurrences.map(fmtIsoDate).join(', ')}) — ${x.chosenBy === 'second' ? 'இரண்டாவது' : 'முதல்'} நாள் கொள்ளப்பட்டது.`));
  }
  if (x.note) lines.push(bi(x.note));
  return lines.length ? `<p class="small muted sb-note">ℹ️ ${lines.map(esc).join(' ')}</p>` : '';
}
function renderStarBday(sec) {
  const home = homeLoc();
  const twice = state.settings.starTwice === 'first' ? 'first' : 'second';
  sec.innerHTML = `${subHeader(L('Star Birthday', 'நட்சத்திரப் பிறந்தநாள்'), L('The traditional birthday — your birth star in your Tamil birth month', 'பாரம்பரியப் பிறந்தநாள் — பிறந்த தமிழ் மாதத்தில் ஜென்ம நட்சத்திரம் வரும் நாள்'))}
    <div class="card glass"><p class="small">📐 ${esc(bi(STAR_BIRTHDAY_RULE))}</p>
      <p class="small muted">📍 ${esc(placeName(home?.name || ''))}</p>
      <label class="small">${L('If the star comes twice in the month', 'மாதத்தில் நட்சத்திரம் இரண்டு முறை வந்தால்')}
        <select id="sbTwice"><option value="second"${twice === 'second' ? ' selected' : ''}>${L('Second day (common)', 'இரண்டாவது நாள் (வழக்கம்)')}</option><option value="first"${twice === 'first' ? ' selected' : ''}>${L('First day', 'முதல் நாள்')}</option></select></label></div>
    <div id="sbList">${loader(L('Calculating…', 'கணிக்கப்படுகிறது…'))}</div>`;
  $('#sbTwice').addEventListener('change', (e) => { state.settings.starTwice = e.target.value; saveSettings(); renderStarBday(sec); });
  setTimeout(() => {
    if (state.view !== 'starbday') return;
    const loc = { lat: home.lat, lon: home.lon, tz: home.tz, zone: home.zone };
    const todayIso = new Date(Date.now() + loc.tz * 3600000).toISOString().slice(0, 10);
    const people = state.family.filter((m) => m.relation !== 'organization');
    const rows = people.map((m) => {
      const c = chartOf(m);
      const month = birthTamilMonth(c).month;
      const next = natchathiraBirthdays({ birthStar: c.janmaNakshatra.index, birthTamilMonth: month, loc, count: 1, twice })[0];
      const daysLeft = next ? Math.round((Date.parse(next.date) - Date.parse(todayIso)) / 86400000) : null;
      return { m, c, month, next, daysLeft };
    }).sort((a, b) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999));
    $('#sbList').innerHTML = rows.map(({ m, c, month, next, daysLeft }) => `<div class="card glass"><div class="sb-row">
        <span class="avatar">${esc(displayName(m).slice(0, 1).toUpperCase())}</span>
        <div style="flex:1;min-width:0"><b>${esc(displayName(m))}</b><div class="muted small">${esc(nakName(c.janmaNakshatra.index))} · ${esc(bi(TAMIL_MONTHS[month]))}</div>
          ${next ? `<div>🎂 <b>${fmtIsoDate(next.date)}</b> · ${esc(bi(next.weekday))} · ${esc(tamilText(next.tamil))} ${remindBtn({ title: `${L('Star birthday', 'நட்சத்திரப் பிறந்தநாள்')} · ${displayName(m)}`, at: atLocal(next.date, '06:00') })}</div>` : ''}</div>
        ${daysLeft != null ? `<div class="mu-score">${daysLeft === 0 ? '🎉' : daysLeft}<small>${daysLeft === 0 ? L('today', 'இன்று') : L('days', 'நாள்')}</small></div>` : ''}</div>
        ${next ? starNote(next) : ''}</div>`).join('')
      || `<div class="card glass cta-card" data-go="family" data-param='{"add":true}'>${L('Add family members to see their star birthdays', 'நட்சத்திரப் பிறந்தநாளைப் பார்க்க குடும்பத்தினரைச் சேர்க்கவும்')} ›</div>`;
    // 60th / 70th / 80th celebrations for elders (shown from age 45).
    const elders = people.map((m) => ({ m, c: chartOf(m) }))
      .filter(({ c }) => (Date.now() - c.utc) / (365.25 * 86400000) >= 45);
    if (elders.length) {
      $('#sbList').insertAdjacentHTML('beforeend', `<div class="section-title">🪔 ${L('60th, 70th & 80th celebrations', 'சஷ்டியப்தபூர்த்தி, பீமரத சாந்தி, சதாபிஷேகம்')}</div>
        ${elders.map(({ m, c }) => milestones(c, loc, new Date(), { twice }).filter((x) => !x.past && x.day).map((x) => `<div class="card glass window first">
          <div class="win-dates">${esc(bi(x.name))} · ${esc(displayName(m))}</div>
          <div>${remindBtn({ title: `${bi(x.name)} · ${displayName(m)}`, at: atLocal(x.day.date, '06:00') })} 📅 <b>${fmtIsoDate(x.day.date)}</b> · ${esc(bi(x.day.weekday))} · ${esc(tamilText(x.day.tamil))} · ${esc(bi(x.day.tamil.year))} ${L('year', 'ஆண்டு')} · ${esc(nakName(c.janmaNakshatra.index))}</div>
          <p class="small muted">📐 ${esc(bi(x.basis))}</p>
          ${starNote(x.day)}
          ${x.thousandthFullMoon ? `<div class="small muted">🌕 ${L('1000th full moon', '1000-வது பௌர்ணமி')}: ${fmtIsoDate(new Date(x.thousandthFullMoon.getTime() + loc.tz * 3600000).toISOString().slice(0, 10))}</div>` : ''}
          <p class="small">${L('Traditionally celebrated at Thirukadaiyur Abhirami–Amritaghateswarar temple or at home with homam.', 'பாரம்பரியமாக திருக்கடையூர் அபிராமி–அமிர்தகடேஸ்வரர் கோவிலில் அல்லது வீட்டில் ஹோமத்துடன் கொண்டாடப்படும்.')}</p>
          <div class="btn-row"><button class="chip-btn" data-go="packages" data-param='{"id":"thirukadaiyur"}'>🧳 ${L('Package', 'பேக்கேஜ்')}</button><button class="chip-btn" data-go="seva" data-param='{"service":"homam"}'>🔥 ${L('Book priest', 'புரோகிதர்')}</button></div></div>`).join('')).join('')}`);
    }
  }, 40);
}
registerScreen('starbday', { render: renderStarBday, parent: 'home', needsLoc: true });

// ================================================================ ASK (explainable guidance chat)
// Chart facts come only from the calculation engine (shared/guidance.js). With AI configured, the AI
// receives those facts and must not invent others; without AI, the built-in engine answers the actual
// question in the same six-part structure. Every answer is labelled with its source.
const chat = { messages: [], memberId: null, busy: false };
const SUGGEST = [
  ['Which temple should I visit?', 'எந்தக் கோவிலுக்குச் செல்லலாம்?'],
  ['Help me understand my current period', 'என் தற்போதைய காலத்தைப் புரிந்துகொள்ள உதவுங்கள்'],
  ['Help our family choose a good date', 'எங்கள் குடும்பத்திற்கு ஏற்ற நாளைத் தேர்வு செய்ய உதவுங்கள்'],
  ['Explain my current dasa-bhukti simply', 'என் நடப்பு தசா புக்தியை எளிமையாக விளக்குங்கள்'],
  ['When will I get married?', 'எனக்கு எப்போது திருமணம் நடக்கும்?'],
  ['Which planet is weak for me, and what simple practice can I do?', 'எந்த கிரகம் எனக்குப் பலவீனம்? என்ன எளிய வழிபாடு செய்யலாம்?'],
  ['What is a good time today for important work?', 'இன்று முக்கிய வேலைக்கு நல்ல நேரம் எது?'],
];

/** Today's practical timings for the "good time" answers. */
function todayFacts() {
  refreshSnap();
  const s = state.snap, loc = state.loc;
  const td = tamilDay(new Date(), loc.lat, loc.lon, loc.tz);
  const now = Date.now();
  const m = activeMember();
  return {
    rahuKalam: `${fmtTime(td.rahuKalam.start, loc.tz)} – ${fmtTime(td.rahuKalam.end, loc.tz)}`,
    yamagandam: `${fmtTime(td.yamagandam.start, loc.tz)} – ${fmtTime(td.yamagandam.end, loc.tz)}`,
    goodTimes: td.gowri.filter((g) => g.good && new Date(g.end).getTime() > now).slice(0, 3).map((g) => `${fmtTime(g.start, loc.tz)} (${bi(g)})`),
    horai: `${planetName(s.currentHora.lord)}`,
    chandrashtamam: m ? dayOutlook(chartOf(m), s).chandrashtama : false,
  };
}

/**
 * Life details for marriage / children answers: what the person entered, filled in from the family list
 * (a spouse profile means married; son/daughter profiles give the number of children and the first child's year).
 */
function lifeOf(m) {
  if (!m) return {};
  const life = { memberId: m.id, gender: m.gender, faith: faithOf(m), maritalStatus: m.maritalStatus, marriedYear: m.marriedYear, children: m.children, firstChildYear: m.firstChildYear };
  if (m.relation === 'self') {
    if (!life.maritalStatus && state.family.some((x) => x.relation === 'spouse')) life.maritalStatus = 'married';
    const kids = state.family.filter((x) => ['son', 'daughter'].includes(x.relation));
    if (life.children == null && kids.length) life.children = kids.length;
    if (!life.firstChildYear && kids.length) life.firstChildYear = Math.min(...kids.map((k) => Number(String(k.date).slice(0, 4))));
  }
  return life;
}

function memberFacts() {
  const m = activeMember();
  if (!m) return { m: null, facts: null };
  return { m, facts: chartFacts(chartOf(m), reliabilityOf(m)) };
}

function chatContext(question) {
  refreshSnap();
  const s = state.snap, loc = state.loc;
  const { m, facts } = memberFacts();
  const rel = m ? reliabilityOf(m) : null;
  return {
    question,
    detectedTopic: classify(question).intent,
    replyLanguage: answerLang(question, state.lang) === 'ta' ? 'Tamil' : 'English',
    today: { date: fmtIsoDate(new Date(Date.now() + loc.tz * 3600000).toISOString().slice(0, 10)), weekday: s.weekday.en, star: s.nakshatra.name, tithi: `${s.tithi.paksha} ${s.tithi.name}`, place: loc.name, ...todayFacts() },
    person: m ? { name: m.name, relation: m.relation, birth: m.relation === 'organization' ? undefined : { date: m.date }, ageBand: ageOf(m).band, birthTimeCertainty: rel.certainty, timeSensitiveResultsAllowed: rel.lagna, rasi: rel.rasi ? chartOf(m).janmaRasi.name : 'uncertain', star: rel.nakshatra ? chartOf(m).janmaNakshatra.name : 'uncertain' } : null,
    verifiedChartFacts: factsForAI(facts),
    lifeDetails: (() => { const l = lifeOf(m); return m ? { maritalStatus: l.maritalStatus || 'not given', marriedYear: l.marriedYear || null, children: l.children ?? 'not given', firstChildYear: l.firstChildYear || null } : null; })(),
    builtInAnswer: askAnswer(question, m, facts, chatTurns()).text,
  };
}

// The straight answer comes first (highlighted); every planet / dasa / transit reason stays visible
// below it so the user — or an astrologer checking the app — can see exactly why.
function renderAnswerHtml(ans) {
  const secs = ans.sections.filter((sx) => sx.key !== 'question' && sx.lines?.length);
  const top = secs.filter((sx) => sx.key === 'answer');
  const rest = secs.filter((sx) => sx.key !== 'answer' && sx.key !== 'prayer');
  const prayer = secs.filter((sx) => sx.key === 'prayer');
  const sec = (sx) => `<div class="ans-sec ans-${sx.key}"><div class="ans-h">${esc(sx.title)}</div><ul>${sx.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul></div>`;
  const m = ans.meter;
  const meterHtml = m ? `<div class="ans-meter ${m.level}" role="img" aria-label="${esc(`${m.topic} ${m.pct}% ${m.label}`)}"><div class="am-top"><span>${esc(m.topic)}</span><b>${m.pct}%</b></div><div class="am-bar"><i style="width:${m.pct}%"></i></div><div class="am-label">${esc(m.label)}</div></div>` : '';
  return `${meterHtml}${top.map(sec).join('')}${rest.map(sec).join('')}${prayer.map(sec).join('')}`;
}

function renderChat(sec, params = {}) {
  const m = activeMember();
  if (chat.memberId !== (m?.id || null)) { chat.messages = []; chat.memberId = m?.id || null; }
  sec.innerHTML = `<div class="chat-main"><div class="seg ask-switch" role="tablist"><button class="sel" role="tab" aria-selected="true">💬 ${L('Ask Thunai', 'துணையிடம் கேள்')}</button><button role="tab" aria-selected="false" data-go="ask">🔮 ${L('Is now a good time? (Prasnam)', 'இப்போது செய்யலாமா? (பிரசன்னம்)')}</button></div>
    <div class="chat-head card glass"><div class="avatar big">🪔</div><div><b>${esc(assistantName())}</b>
      <div class="muted small">${m ? L(`Using ${displayName(m)}'s chart${m.private ? ' · private profile — this chat stays on this phone' : ''}`, `${displayName(m)} அவர்களின் ஜாதகப்படி${m.private ? ' · தனிப்பட்ட சுயவிவரம் — இந்த உரையாடல் இந்தக் கைப்பேசியிலேயே' : ''}`) : L('Add birth details for personal answers', 'தனிப்பட்ட பதில்களுக்கு பிறப்பு விவரம் சேர்க்கவும்')}</div></div></div>
    <div id="chatLog" class="chat-log" aria-live="polite">${chat.messages.length ? '' : `<div class="bubble ai">🙏 ${L('Vanakkam! Ask anything — in Tamil, English or Tanglish. Answers come in English (change language with the தமிழ் button).', 'வணக்கம்! தமிழ், ஆங்கிலம், தங்கிலீஷ் — எப்படியும் கேளுங்கள். பதில் தமிழில் வரும்.')}</div>`}</div>
    <div class="suggest-row">${suggestionsFor(ageOf(m), SUGGEST).map((x) => `<button class="sg">${esc(bi(x))}</button>`).join('')}</div>
    <form id="chatForm" class="chat-form"><button type="button" id="micBtn" class="mic" aria-label="${L('Speak', 'பேசுங்கள்')}">🎙️</button>
      <label class="sr-only" for="chatInput">${L('Message', 'செய்தி')}</label><textarea id="chatInput" class="grow-in" rows="1" autocomplete="off" maxlength="600" placeholder="${esc(L('Ask Thunai…', 'கேள்வியை இங்கே எழுதுங்கள்…'))}"></textarea>
      <button class="send" aria-label="${L('Send', 'அனுப்பு')}">➤</button></form></div>
    ${supportCard()}
    <p class="small muted center">${L('Voice: your phone converts speech to text (it may use its own online service). The text appears in the box for you to check.', 'குரல்: உங்கள் கைப்பேசி பேச்சை எழுத்தாக மாற்றும் (அதன் இணைய சேவையைப் பயன்படுத்தலாம்). சரிபார்க்க பெட்டியில் உரை தோன்றும்.')}</p>
    ${copyright()}`;
  for (const msg of chat.messages) addBubble(msg.role, msg.content, msg);
  $$('.sg', sec).forEach((b) => b.addEventListener('click', () => send(b.textContent)));
  $('#chatForm').addEventListener('submit', (e) => { e.preventDefault(); send($('#chatInput').value); });
  setupVoiceInput($('#micBtn'), $('#chatInput'));
  const log = $('#chatLog');
  log.scrollTop = log.scrollHeight;
  if (params.q && !chat.messages.some((x) => x.content === params.q)) send(params.q);
  else if (params.topic === 'chart' && !chat.messages.length) send(L('Please read my chart and explain the main strengths, challenges and the current dasa.', 'என் ஜாதகத்தைப் பார்த்து முக்கிய பலம், சவால்கள், நடப்பு தசையை விளக்கவும்.'));
}

function addBubble(role, text, meta = {}) {
  const b = document.createElement('div');
  b.className = `bubble ${role === 'user' ? 'me' : 'ai'}`;
  if (role === 'user') { b.textContent = text; $('#chatLog').append(b); return b; }
  const body = document.createElement('div');
  body.className = 'ans-body';
  if (meta.answer?.sections) body.innerHTML = renderAnswerHtml(meta.answer); else body.textContent = text;
  // Help contacts sent with a server policy reply (safety / decline): tappable, from the verified directory.
  const contacts = (meta.resources?.contacts || []).filter((c) => /^[\d +-]{2,20}$/.test(String(c.number || '')));
  if (contacts.length) {
    const row = document.createElement('div'); row.className = 'btn-row help-contacts';
    contacts.forEach((c) => { const a = document.createElement('a'); a.className = 'chip-btn'; a.href = `tel:${String(c.number).replace(/[^\d+]/g, '')}`; a.textContent = `☎️ ${c.number} · ${c.name}`; row.append(a); });
    body.append(row);
  }
  if (meta.notice) { const n = document.createElement('p'); n.className = 'small muted ans-notice'; n.textContent = meta.notice; body.append(n); }
  const foot = document.createElement('div');
  foot.className = 'ans-foot';
  // Every on-device / rule-based answer carries a visible "limited guidance" badge.
  const badge = meta.source === 'rules' && meta.typing !== true ? `<span class="pill limited-badge">${esc(bi(LIMITED_LABEL))}</span> ` : '';
  foot.innerHTML = `${badge}<button class="link-btn say-bubble" aria-label="${L('Read aloud', 'வாசித்துக்காட்டு')}">🔊</button>`;
  // Read aloud speaks only the validated answer text (never unchecked DOM content).
  foot.querySelector('.say-bubble').addEventListener('click', () => speak(meta.speakText || text));
  b.append(body, foot);
  if (meta.answer?.clarify) {
    const row = document.createElement('div'); row.className = 'btn-row';
    meta.answer.clarify.options.forEach((o) => { const x = document.createElement('button'); x.className = 'chip-btn'; x.textContent = bi(o); x.addEventListener('click', () => send(`${chat.messages.filter((mm) => mm.role === 'user').at(-1)?.content || ''} — ${bi(o)}`)); row.append(x); });
    b.append(row);
  }
  if (meta.answer?.followups?.length) {
    const row = document.createElement('div'); row.className = 'followups';
    row.innerHTML = `<div class="ans-h">${esc(L('Ask next', 'அடுத்துக் கேட்கலாம்'))}</div>`;
    meta.answer.followups.slice(0, 3).forEach((f) => { const x = document.createElement('button'); x.type = 'button'; x.className = 'sg'; x.textContent = f; x.addEventListener('click', () => send(f)); row.append(x); });
    b.append(row);
  }
  if (meta.answer?.actions?.length) {
    const row = document.createElement('div'); row.className = 'btn-row';
    meta.answer.actions.forEach((a) => { const x = document.createElement('button'); x.className = 'chip-btn'; x.textContent = `${a.label} ›`; x.addEventListener('click', () => go(a.go, a.param || {})); row.append(x); });
    b.append(row);
  }
  if (meta.typing !== true) b.insertAdjacentHTML('beforeend', clarityPrompt('chat')); // "Was this clear?" under each answer
  $('#chatLog').append(b);
  $('#chatLog').scrollTop = $('#chatLog').scrollHeight;
  return b;
}

/**
 * On-device answer to the actual question: safety topics go to the shared safety engine; life topics
 * (marriage, second marriage, job, business, money, loan, health, education, child, house, travel, court,
 * family) are routed to a chart-based answer; anything else gets the closest reading plus three follow-ups.
 */
function askAnswer(text, m, facts, turns = []) {
  const life = lifeOf(m);
  const today = todayFacts();
  // AGE FIRST: the selected person's age decides what may be answered (shared/age-guard.js). The person typing is
  // known only when their own profile is open; otherwise the speaker's age is unknown (never assumed adult).
  const prof = m ? ageOf(m) : ageProfile(null);
  const speaker = m?.relation === 'self' ? prof : null;
  const lang = answerLang(text, state.lang);
  const certainty = m ? reliabilityOf(m).certainty : 'none';
  // Every offline answer is checked (shared/themes.js findProhibited) before it is shown or read aloud.
  const done = (a) => validateOffline(a, { lang, inputCertainty: certainty });
  // POLICY FIRST: composeAnswer runs the facilitation / speaker-age check before any topic is read.
  const base = composeAnswer({ question: text, lang: state.lang, facts, name: m ? displayName(m) : '', today, life, turns, speaker });
  if (base.policy) return done(base);
  if (['crisis', 'death', 'pain', 'emotional'].includes(base.intent)) return done(cleanSharedAnswer(base));
  let topic = detectTopic(text);
  // For a child's chart, "child / kids" means the child — read the other topic the question names (studies, health …).
  if (prof.minor && topic === 'child') topic = detectTopics(text).find((t) => t !== 'child') || null;
  if (topic === 'marriage' && life.maritalStatus === 'married') topic = 'harmony';
  if (topic && m) {
    try {
      const a = topicAnswer({ topic, question: text, chart: chartOf(m), rel: reliabilityOf(m), lang: state.lang, name: displayName(m), life, today, turns, speaker });
      if (a) return done(a);
    } catch (e) { console.warn('ask', e); }
  }
  if (prof.minor) {
    // Children: no dasa reading for open questions — a warm, simple answer with today's prayer and good habits.
    let deity = null;
    try { refreshSnap(); deity = dailyReview(chartOf(m), state.snap, new Date()).deity; } catch { /* optional */ }
    const shared = ['general', 'greeting', 'chart', 'dasa', 'weak', 'goodtime', 'dates'].includes(base.intent) ? null : guardAnswer(cleanSharedAnswer(base), prof, state.lang);
    return done(shared?.sections?.some((sx) => sx.key === 'answer') ? shared : childGeneralAnswer({ profile: prof, lang: state.lang, name: displayName(m), deity, question: text }));
  }
  // Unclear question: answer with the closest reading (the running Dasa–Bhukti) and offer three follow-ups.
  if (base.intent === 'general' || base.intent === 'greeting') {
    const near = cleanSharedAnswer(composeAnswer({ question: L('Explain my current dasa-bhukti simply', 'என் நடப்பு தசா புக்தியை எளிமையாக விளக்குங்கள்'), lang: state.lang, facts, name: m ? displayName(m) : '', today, life }));
    near.followups = generalFollowups(prof).map((f) => bi(f));
    return done(near);
  }
  return done(guardAnswer(cleanSharedAnswer(base), prof, state.lang));
}

/** The person's own earlier messages in this chat (oldest first) — follow-ups keep the earlier context. */
const chatTurns = () => chat.messages.filter((x) => x.role === 'user').map((x) => x.content).slice(-12);

async function send(text) {
  text = String(text || '').trim();
  if (!text || chat.busy) return;
  chat.busy = true;
  $('#chatInput').value = ''; $('#chatInput').dispatchEvent(new Event('input', { bubbles: true }));
  chat.messages.push({ role: 'user', content: text });
  const ub = addBubble('user', text);
  requestAnimationFrame(() => ub.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  const { m, facts } = memberFacts();
  const answer = askAnswer(text, m, facts, chatTurns());
  // Safety-critical topics and on-device policy answers (decline / child / teen) are always the reviewed rules,
  // never free AI text. Private profiles never send their questions to the AI service.
  // Age-guarded answers are never handed to free AI text; a minor's chat goes to the AI only through the server,
  // whose policy re-checks the person's age (the phone-only build never calls a model — see core.js aiTask).
  const prof = m ? ageOf(m) : null;
  const rulesOnly = ['crisis', 'death', 'pain', 'age_guard', 'policy'].includes(answer.intent) || Boolean(answer.policy) || answer.validationFallback || Boolean(m?.private) || Boolean(prof?.minor && STATIC);
  let msg = { role: 'assistant', content: answer.text, answer, source: 'rules', speakText: answer.text };
  if (!rulesOnly) {
    const thinking = addBubble('assistant', L('Thinking…', 'யோசிக்கிறேன்…'), { typing: true });
    thinking.classList.add('typing');
    const node = thinking.querySelector('.ans-body');
    const r = await aiTask({ task: 'chat', context: chatContext(text), messages: chat.messages.slice(-12).map(({ role, content }) => ({ role, content })), fallbackText: answer.text, onText: (tx) => { if (tx !== answer.text) node.textContent = tx; } });
    thinking.remove();
    const meta = r.meta || {};
    // The server's answer wins whenever it is a validated AI reply OR a policy reply (safety / decline / clarify /
    // child / teen) — a policy reply is never replaced by the on-device answer.
    if ((r.source === 'ai' || r.source === 'policy') && r.text.trim()) {
      msg = { role: 'assistant', content: r.text, source: r.source, speakText: r.text, resources: meta.resources || null, notice: meta.notice || null, trace: meta.trace || null,
        answer: r.source === 'ai' ? { actions: answer.actions } : null };
    } else if (meta.notice) {
      msg.notice = meta.notice; // the server could not add an AI explanation: say so (no_ai_notice)
    }
  }
  chat.messages.push(msg);
  addBubble('assistant', msg.content, msg);
  chat.busy = false;
}
registerScreen('chat', { render: renderChat, needsLoc: true });

// ================================================================ SHARE TODAY (WhatsApp card)
export async function shareToday(td, snap) {
  const loc = state.loc;
  const W = 1080, H = 1350;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const x = cv.getContext('2d');
  await document.fonts?.ready;
  const g = x.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#2a0f4f'); g.addColorStop(1, '#06031a');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  const sun = x.createRadialGradient(W - 120, 120, 10, W - 120, 120, 260);
  sun.addColorStop(0, 'rgba(255,200,100,.9)'); sun.addColorStop(1, 'rgba(255,120,40,0)');
  x.fillStyle = sun; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 160; i++) { x.fillStyle = `rgba(255,240,220,${Math.random() * 0.7})`; x.beginPath(); x.arc(Math.random() * W, Math.random() * H, Math.random() * 2, 0, 7); x.fill(); }
  x.strokeStyle = '#f5c26b'; x.lineWidth = 4; x.strokeRect(36, 36, W - 72, H - 72);
  x.lineWidth = 1.5; x.strokeRect(52, 52, W - 104, H - 104);
  const font = (w, s) => `${w} ${s}px "Noto Sans Tamil", "Poppins", sans-serif`;
  x.textAlign = 'center';
  x.fillStyle = '#ffdf9e'; x.font = font(800, 58); x.fillText(BRAND.nameTa, W / 2, 150);
  x.fillStyle = '#b7a9d6'; x.font = font(400, 30); x.fillText(`${BRAND.nameUpper} · Daily Panchangam`, W / 2, 198);
  x.fillStyle = '#ffffff'; x.font = font(800, 150); x.fillText(String(td.tamil.day), W / 2, 380);
  x.fillStyle = '#ffdf9e'; x.font = font(800, 64); x.fillText(`${td.tamil.monthTa} · ${td.tamil.monthEn}`, W / 2, 460);
  x.fillStyle = '#e8dcff'; x.font = font(600, 36); x.fillText(`${td.tamil.year.ta} வருடம் · ${td.weekday.ta} · ${td.date.split('-').reverse().join('-')}`, W / 2, 520);
  let y = 590;
  if (td.festivals.length) { x.fillStyle = '#ffb347'; x.font = font(800, 40); x.fillText(td.festivals.map((f) => f.ta).join(' · '), W / 2, y); y += 60; }
  x.textAlign = 'left';
  const rows = [
    ['நட்சத்திரம்', `${NAKSHATRAS[snap.nakshatra.index].ta} (${fmtTime(snap.nakshatra.endsAt, loc.tz)} வரை)`],
    ['திதி', `${snap.tithi.ta} (${fmtTime(snap.tithi.endsAt, loc.tz)} வரை)`],
    ['யோகம்', snap.yoga.ta],
    ['சூரிய உதயம்', `${fmtTime(td.sunrise, loc.tz)}  ·  அஸ்தமனம் ${fmtTime(td.sunset, loc.tz)}`],
    ['ராகு காலம்', `${fmtTime(td.rahuKalam.start, loc.tz)} – ${fmtTime(td.rahuKalam.end, loc.tz)}`],
    ['எமகண்டம்', `${fmtTime(td.yamagandam.start, loc.tz)} – ${fmtTime(td.yamagandam.end, loc.tz)}`],
    ['குளிகை', `${fmtTime(td.guligai.start, loc.tz)} – ${fmtTime(td.guligai.end, loc.tz)}`],
    ['நல்ல நேரம்', td.nallaNeram.slice(0, 3).map((s) => `${fmtTime(s.start, loc.tz)}–${fmtTime(s.end, loc.tz)}`).join(', ')],
    ['சந்திராஷ்டமம்', `${RASIS[td.chandrashtamaRasi].ta} ராசி`],
  ];
  y += 20;
  for (const [k, v] of rows) {
    x.fillStyle = 'rgba(245,194,107,.12)'; x.fillRect(90, y - 44, W - 180, 64);
    x.fillStyle = '#f5c26b'; x.font = font(600, 32); x.fillText(k, 120, y);
    x.fillStyle = '#ffffff'; x.font = font(600, 32);
    x.fillText(v, 420, y, W - 540);
    y += 78;
  }
  x.textAlign = 'center'; x.fillStyle = '#b7a9d6'; x.font = font(400, 26);
  x.fillText(`📍 ${loc.name || ''} · kaippesi jothidar`, W / 2, H - 80);
  const text = `🙏 ${td.tamil.monthTa} ${td.tamil.day} · ${td.weekday.ta}\nநட்சத்திரம்: ${NAKSHATRAS[snap.nakshatra.index].ta} · திதி: ${snap.tithi.ta}\nராகு காலம்: ${fmtTime(td.rahuKalam.start, loc.tz)}–${fmtTime(td.rahuKalam.end, loc.tz)}\n— துணை`;
  const blob = await new Promise((r) => cv.toBlob(r, 'image/png'));
  const file = new File([blob], `kaippesi-${td.date}.png`, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], text }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  const url = cv.toDataURL('image/png');
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `<div class="modal-card"><img src="${url}" alt="${esc(L('Today\'s Panchangam card', 'இன்றைய பஞ்சாங்க அட்டை'))}"><p class="muted small">${L('Long-press the image to save or share it.', 'சேமிக்க அல்லது பகிர படத்தை நீண்ட நேரம் அழுத்தவும்.')}</p>
    <a class="btn-gold" href="https://wa.me/?text=${encodeURIComponent(text)}" target="_blank" rel="noopener">WhatsApp ${L('text', 'உரை')}</a><button class="chip-btn" id="closeModal">${L('Close', 'மூடு')}</button></div>`;
  document.body.append(modal);
  modal.addEventListener('click', (e) => { if (e.target === modal || e.target.id === 'closeModal') modal.remove(); });
}

export { CATEGORIES, tamilDay, go, STATIC };
