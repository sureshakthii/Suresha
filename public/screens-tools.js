// Feature screens: Tamil calendar, Quick star match, Muhurtham, Ruthu, Parigaram, Names, Thivasam,
// Natchathira birthday, Ask Thunai chat and the shareable daily card.
import { panchang, vedicDay, RASIS, NAKSHATRAS } from './shared/astro.js';
import { CATEGORIES, getCategory } from './shared/prasna.js';
import { tamilMonth, tamilDay, TAMIL_MONTHS } from './shared/tamilcal.js';
import { matchPorutham, doshams, doshaSamyam, VERDICTS } from './shared/porutham.js';
import { grahaStrength, dailyParigaram, NAVAGRAHA } from './shared/remedies.js';
import { nameLetters, thivasamDates, natchathiraBirthdays, muhurthamPlan, ruthuPlan, milestones } from './shared/special.js';
import { remindBtn } from './remind.js';
import { predictEvent } from './shared/predict.js';
import { personalGuide } from './shared/personal.js';
import {
  state, $, $$, L, ta, esc, bi, GLYPH, COLOR, planetName, rasiName, nakName, fmtTime, fmtIsoDate,
  activeMember, chartOf, registerScreen, go, subHeader, aiTask, toast, speak, saveFamily, starOptions, rasiOfStarPada, STATIC,
  listen, micMessage,
  yogaName, karanaName,
  placeName,
  displayName, hasLagna, memberAge, reportMeta, showExtras, policyExtrasHtml,
} from './core.js';
import { dayOutlook, gauge, animateGauges, refreshSnap } from './screens-main.js';

const wait = () => new Promise((r) => setTimeout(r, 40));
const loader = (msg) => `<div class="loader"><i></i><i></i><i></i></div><p class="muted center">${msg}</p>`;
const memberOptions = (sel) => state.family.map((m) => `<option value="${esc(m.id)}"${m.id === sel ? ' selected' : ''}>${esc(displayName(m))}</option>`).join('');
const padaOptions = (sel = 1) => [1, 2, 3, 4].map((p) => `<option value="${p}"${p === sel ? ' selected' : ''}>${L('Pada', 'பாதம்')} ${p}</option>`).join('');

function aiBlock(id) {
  return `<div class="card glass" id="${id}" hidden><div class="card-title"><span>✨ ${L('Thunai explains', 'துணை விளக்கம்')}</span><span><button class="link-btn speak-btn" data-target="${id}-text" aria-label="${esc(L('Read aloud', 'வாசித்துக்காட்டு'))}">🔊</button> <span class="pill" id="${id}-src"></span></span></div><div class="reply" id="${id}-text"></div></div>`;
}
async function runAi(id, task, context, fallbackText, messages) {
  const box = $(`#${id}`);
  box.hidden = false;
  const out = $(`#${id}-text`);
  out.textContent = L('Thinking…', 'யோசிக்கிறேன்…');
  out.classList.add('typing');
  const r = await aiTask({ task, context, messages, fallbackText, channel: id, onText: (tx) => { out.textContent = tx; } });
  showExtras(out, r.meta);
  out.classList.remove('typing');
  $(`#${id}-src`).textContent = r.source === 'ai' ? '✨ ' + L('Detailed', 'விரிவான பதில்') : '📜 ' + L('Quick', 'சுருக்கம்');
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
      <div class="cal-nav"><button class="chip-btn" id="calPrev" aria-label="${esc(L('Previous month', 'முந்தைய மாதம்'))}">‹</button><b>${esc(title)}</b><button class="chip-btn" id="calNext" aria-label="${esc(L('Next month', 'அடுத்த மாதம்'))}">›</button></div>
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
    ${cs ? `<p class="tag neutral block">${L(`Chandrashtamam for ${c.name} (traditional — go gently)`, `${c.name} அவர்களுக்கு சந்திராஷ்டமம் (மரபு — நிதானம்)`)}</p>` : ''}
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
registerScreen('calendar', { render: renderCalendar, parent: 'plan', needsLoc: true });

// ================================================================ PORUTHAM
const porSide = { girl: { mode: 'star', star: 0, pada: 1, memberId: null }, boy: { mode: 'star', star: 0, pada: 1, memberId: null } };

function sideForm(who) {
  const s = porSide[who];
  const hasFamily = state.family.length > 0;
  return `<div class="por-side"><h3>${who === 'girl' ? `👰 ${L('Bride', 'பெண்')}` : `🤵 ${L('Groom', 'மாப்பிள்ளை')}`}</h3>
    <div class="seg">${hasFamily ? `<button class="${s.mode === 'member' ? 'sel' : ''}" data-who="${who}" data-mode="member">${L('From family', 'குடும்பத்திலிருந்து')}</button>` : ''}<button class="${s.mode === 'star' ? 'sel' : ''}" data-who="${who}" data-mode="star">${L('By star', 'நட்சத்திரம் மூலம்')}</button></div>
    ${s.mode === 'member' && hasFamily ? `<label>${L('Person', 'நபர்')}<select data-who="${who}" data-f="memberId">${memberOptions(s.memberId || state.family[0].id)}</select></label>`
    : `<label>${L('Birth star', 'நட்சத்திரம்')}<select data-who="${who}" data-f="star">${starOptions(s.star)}</select></label>
       <label>${L('Pada', 'பாதம்')}<select data-who="${who}" data-f="pada">${padaOptions(s.pada)}</select></label>
       <p class="muted small">${L('Rasi', 'ராசி')}: ${esc(rasiName(rasiOfStarPada(s.star, s.pada)))}</p>`}
  </div>`;
}

function renderPorutham(sec) {
  sec.innerHTML = `${subHeader(L('Quick star match', 'விரைவு நட்சத்திரப் பொருத்தம்'), L('Traditional 10 poruthams by birth star — a quick look only', 'நட்சத்திரப்படி மரபு 10 பொருத்தங்கள் — விரைவுப் பார்வை மட்டும்'))}
    <div class="card glass"><p class="small">${L('A star-only check is a quick traditional look. For a fuller picture — both adults\' consent, birth details, each factor explained and questions for your astrologer — use Marriage matching.', 'நட்சத்திரம் மட்டும் வைத்துப் பார்ப்பது விரைவான மரபுப் பார்வை. முழுமையான பார்வைக்கு — இருவரின் ஒப்புதல், பிறப்பு விவரங்கள், ஒவ்வொரு காரணியின் விளக்கம், ஜோதிடருக்கான கேள்விகள் — திருமணப் பொருத்தத்தைப் பயன்படுத்துங்கள்.')}</p>
    <button class="btn-gold big-cta" data-go="matching">💞 ${L('Marriage matching — step by step', 'திருமணப் பொருத்தம் — படிப்படியாக')}</button></div>
    <div class="card glass"><div class="card-title">${L('Quick check by star', 'நட்சத்திரம் மூலம் விரைவுப் பொருத்தம்')}</div><div class="por-grid">${sideForm('girl')}${sideForm('boy')}</div>
      <button class="btn-gold" id="porBtn">💞 ${L('Check porutham', 'பொருத்தம் பார்க்கவும்')}</button>
      <p class="muted small">${L('Tip: add both people under Family with full birth details to include the Chevvai and Rahu-Ketu dosham check.', 'குறிப்பு: செவ்வாய், ராகு-கேது தோஷ ஆய்வுக்கு இருவரின் முழு பிறப்பு விவரங்களையும் குடும்பத்தில் சேர்க்கவும்.')}</p></div>
    <div id="porResult"></div>${aiBlock('porAi')}`;
  $$('.seg button', sec).forEach((b) => b.addEventListener('click', () => { porSide[b.dataset.who].mode = b.dataset.mode; renderPorutham(sec); }));
  $$('select[data-who]', sec).forEach((s) => s.addEventListener('change', () => {
    const side = porSide[s.dataset.who];
    side[s.dataset.f] = s.dataset.f === 'memberId' ? s.value : Number(s.value);
    if (s.dataset.f !== 'memberId') renderPorutham(sec);
  }));
  $('#porBtn').addEventListener('click', () => computePorutham());
}

function sideData(who) {
  const s = porSide[who];
  if (s.mode === 'member' && state.family.length) {
    const m = state.family.find((x) => x.id === (s.memberId || state.family[0].id));
    const c = chartOf(m);
    return { name: displayName(m), star: c.janmaNakshatra.index, rasi: c.janmaRasi.index, doshams: doshams(c.planets) };
  }
  return { name: who === 'girl' ? L('Bride', 'பெண்') : L('Groom', 'மாப்பிள்ளை'), star: s.star, rasi: rasiOfStarPada(s.star, s.pada) };
}

function computePorutham() {
  const g = sideData('girl'), b = sideData('boy');
  const r = matchPorutham(g, b);
  const samyam = g.doshams && b.doshams ? doshaSamyam(g.doshams, b.doshams) : null;
  const icon = (st) => (st === 'uttamam' ? '✓' : st === 'madhyamam' ? '◐' : '○');
  const verdictClass = r.verdict === 'EXCELLENT' || r.verdict === 'GOOD' ? 'DO' : 'CAUTION';
  $('#porResult').innerHTML = `<div class="card glass verdict-card">
      <div class="muted small">${esc(g.name)} (${esc(nakName(g.star))}) · ${esc(b.name)} (${esc(nakName(b.star))})</div>
      ${gauge(Math.round(r.score * 10), verdictClass).replace(/(\d+)<small>[^<]*<\/small>/, `${r.score}<small>/ 10 ${L('poruthams', 'பொருத்தங்கள்')}</small>`)}
      <div class="verdict-big ${verdictClass}">${esc(bi(VERDICTS[r.verdict]))}</div>
      ${r.criticalFail ? `<p class="tag neutral block">${L('Rajju or Vedhai: astrologer-prioritised traditional factors — not a proven danger. Discuss with your astrologer if this tradition matters to you.', 'ரஜ்ஜு அல்லது வேதை: ஜோதிடர் முன்னுரிமை தரும் மரபுக் காரணிகள் — நிரூபிக்கப்பட்ட ஆபத்து அல்ல. இந்த மரபு முக்கியமென்றால் ஜோதிடருடன் பேசுங்கள்.')}</p>` : ''}
    </div>
    <div class="card glass"><div class="card-title">${L('10 Poruthams', '10 பொருத்தங்கள்')}</div>
      ${r.rows.map((x) => `<div class="factor"><span>${icon(x.status)} ${esc(ta() ? x.ta : x.en)}${x.importance !== 'normal' ? ` <span class="pill">${x.importance === 'critical' ? L('essential', 'அவசியம்') : L('important', 'முக்கியம்')}</span>` : ''}<br><small class="muted">${esc(bi(x.detail))}</small></span><b class="${x.status === 'uttamam' ? 'pos' : 'zero'}">${x.status === 'uttamam' ? L('Agrees', 'உத்தமம்') : x.status === 'madhyamam' ? L('Partly', 'மத்திமம்') : L('Does not agree', 'பொருந்தவில்லை')}</b></div>`).join('')}
    </div>
    ${samyam ? `<div class="card glass"><div class="card-title">${L('Dosha samyam', 'தோஷ சாம்யம்')}</div>${samyam.map((n) => `<div class="factor"><span>${esc(bi(n))}</span><b class="zero">${n.ok ? L('balanced', 'சமம்') : L('discuss', 'பேசுக')}</b></div>`).join('')}</div>` : ''}
    <p class="muted small">${L('Discuss these factors and seek expert review if this tradition matters to you.', 'இந்த மரபு உங்களுக்கு முக்கியமானதென்றால், இந்தக் காரணிகளைப் பற்றிக் கலந்துபேசி நிபுணர் மதிப்பாய்வைப் பெறுங்கள்.')}</p>
    <button class="btn-gold" id="porExplain">✨ ${L('Thunai explains', 'துணை விளக்கம்')}</button>`;
  animateGauges();
  $('#porExplain').addEventListener('click', () => {
    const context = { bride: { name: g.name, star: NAKSHATRAS[g.star].en, rasi: RASIS[g.rasi].en }, groom: { name: b.name, star: NAKSHATRAS[b.star].en, rasi: RASIS[b.rasi].en },
      poruthams: r.rows.map((x) => ({ name: x.en, status: x.status, detail: x.detail.en })), score: `${r.score}/10`, verdict: VERDICTS[r.verdict].en, doshaSamyam: samyam?.map((n) => n.en) };
    const fallback = `${bi(VERDICTS[r.verdict])} — ${r.score}/10.\n${r.rows.filter((x) => x.status !== 'uttamam').map((x) => `• ${ta() ? x.ta : x.en}: ${x.status === 'madhyamam' ? L('medium', 'மத்திமம்') : L('does not match', 'பொருந்தவில்லை')}`).join('\n')}\n${L('Discuss these factors and seek expert review if this tradition matters to you.', 'இந்த மரபு உங்களுக்கு முக்கியமானதென்றால், இந்தக் காரணிகளைப் பற்றிக் கலந்துபேசி நிபுணர் மதிப்பாய்வைப் பெறுங்கள்.')}`;
    runAi('porAi', 'porutham', context, fallback);
  });
}
registerScreen('porutham', { render: renderPorutham, parent: 'family' });

// ================================================================ MUHURTHAM
const MU_CATS = ['marriage', 'graha_pravesam', 'vehicle', 'naming', 'ear_piercing', 'annaprasanam', 'vidyarambam', 'business', 'property', 'gold_vehicle', 'contract', 'travel', 'office', 'surgery', 'manjal_neerattu', 'delivery', 'launch', 'tech_partner', 'bhoomi_pooja', 'visa'];
const muForm = { category: 'marriage', days: 30, persons: null };

function renderMuhurtham(sec) {
  if (!muForm.persons) muForm.persons = activeMember() ? [activeMember().id] : [];
  sec.innerHTML = `${subHeader(L('Muhurtham Finder', 'முகூர்த்தம் தேடல்'), L('Finds good dates and times that suit everyone involved', 'சம்பந்தப்பட்ட அனைவருக்கும் ஏற்ற நல்ல நாள், நேரம்'))}
    <div class="card glass">
      <label>${L('Event', 'நிகழ்வு')}<select id="muCat">${MU_CATS.map((id) => { const c = getCategory(id); return `<option value="${id}"${id === muForm.category ? ' selected' : ''}>${c.icon} ${esc(bi(c))}</option>`; }).join('')}</select></label>
      <label>${L('Search in the next', 'அடுத்த')}<select id="muDays">${[15, 30, 60, 90].map((d) => `<option value="${d}"${d === muForm.days ? ' selected' : ''}>${d} ${L('days', 'நாட்கள்')}</option>`).join('')}</select></label>
      ${state.family.length ? `<div class="mini-label">${L('Check for these family members', 'இவர்களுக்கு ஏற்றதாக')}</div><div class="member-switch">${state.family.map((m) => `<label class="mchip${muForm.persons.includes(m.id) ? ' sel' : ''}"><input type="checkbox" value="${esc(m.id)}"${muForm.persons.includes(m.id) ? ' checked' : ''}> ${esc(displayName(m))}</label>`).join('')}</div>` : ''}
      <p class="muted small">📍 ${esc(placeName(state.loc.name))} · ${L('Rahu Kalam, Yamagandam, Ashtami, Navami, Amavasai and Chandrashtamam are always excluded.', 'ராகு காலம், எமகண்டம், அஷ்டமி, நவமி, அமாவாசை, சந்திராஷ்டமம் எப்போதும் தவிர்க்கப்படும்.')}</p>
      ${muForm.category === 'delivery' ? `<p class="tag warn block">${L('Only for a planned delivery already advised by your doctor — the doctor\'s medical decision always comes first.', 'மருத்துவர் ஏற்கனவே பரிந்துரைத்த திட்டமிட்ட பிரசவத்திற்கு மட்டும் — மருத்துவரின் முடிவே எப்போதும் முதன்மை.')}</p>` : ''}
      ${muForm.category === 'vehicle' ? `<p class="muted small">🚗 ${L('Two-wheeler, auto, car or lorry: only Ashwini, Rohini, Mrigasirisham, Punarpoosam, Poosam, Uthiram, Hastham, Chithirai, Swathi, Anusham, Uthiradam, Thiruvonam, Avittam, Sathayam, Uthirattathi and Revathi stars; no Tuesday / Saturday, Kuligai, Theipirai Prathamai or bad yoga; Venus, Mercury, Moon or Jupiter Horai preferred.', 'இரு சக்கர வாகனம், ஆட்டோ, கார், லாரி: அஸ்வினி, ரோகிணி, மிருகசீரிஷம், புனர்பூசம், பூசம், உத்திரம், அஸ்தம், சித்திரை, சுவாதி, அனுஷம், உத்திராடம், திருவோணம், அவிட்டம், சதயம், உத்திரட்டாதி, ரேவதி நட்சத்திரங்கள் மட்டும்; செவ்வாய், சனிக்கிழமை, குளிகை, தேய்பிறை பிரதமை, தீய யோகம் தவிர்க்கப்படும்; சுக்கிரன், புதன், சந்திரன், குரு ஓரை சிறப்பு.')}</p>` : ''}
      <label>${L('Real deadline, if any (doctor, court, bank, employer, embassy)', 'உண்மையான காலக்கெடு இருந்தால் (மருத்துவர், நீதிமன்றம், வங்கி, நிறுவனம், தூதரகம்)')}<input type="date" id="muDeadline"></label>
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
    const persons = muForm.persons.map((id) => state.family.find((m) => m.id === id)).filter(Boolean).map((m) => { const c = chartOf(m); return { name: m.name, janmaNakshatra: c.janmaNakshatra.index, janmaRasi: c.janmaRasi.index }; });
    const deadline = $('#muDeadline')?.value ? atLocal($('#muDeadline').value, '23:59') : null;
    const plan = muhurthamPlan({ category: muForm.category, loc: state.loc, persons, days: muForm.days, deadline });
    $('#muResult').innerHTML = `${plan.deadlineNote ? `<div class="card glass practical-first"><div class="card-title">✅ ${L('Your real deadline comes first', 'உங்கள் உண்மையான காலக்கெடுவே முதன்மை')}</div><p><b>${esc(bi(plan.deadlineNote))}</b></p></div>` : ''}
      <p class="muted small">${L('These windows are optional traditional suggestions — they never block what you need to do.', 'இவை விருப்ப மரபுப் பரிந்துரைகள் மட்டுமே — தேவையானதைச் செய்வதை ஒருபோதும் தடுக்காது.')}</p><div id="muList"></div>`;
    renderMuResults(plan.windows, '#muList', { showReasons: muForm.category === 'vehicle', empty: plan.emptyMeaning });
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
function renderMuResults(res, target, { showReasons = false, empty = null } = {}) {
  const loc = state.loc;
  $(target).innerHTML = res.length ? res.map((w, i) => `<div class="card glass mu-card">
      <div class="mu-rank">${i + 1}</div>
      <div style="flex:1"><div class="mini-value">${fmtIsoDate(w.date)} · ${esc(bi(w.weekday))}</div>
        <div><b>${fmtTime(w.start, loc.tz)} – ${fmtTime(w.end, loc.tz)}</b> ${remindBtn({ title: `${L('Muhurtham', 'முகூர்த்தம்')} ${fmtTime(w.start, loc.tz)}`, at: w.start, label: L('Remind', 'நினைவூட்டு') })}</div>
        <div class="muted small">${esc(nakName(w.nakshatra.index))} · ${esc(ta() ? w.tithi.ta : w.tithi.name)}${w.lagna ? ` · ${L('Lagna', 'லக்னம்')} ${esc(bi({ en: w.lagna.name.en, ta: w.lagna.name.ta }))}` : ''} · ${esc(planetName(w.hora))} ${L('Horai', 'ஓரை')}</div>
        ${showReasons && w.reasons?.length ? `<div class="small">${w.reasons.slice(0, 4).map((x) => `✓ ${esc(bi(x))}`).join('<br>')}</div>` : ''}
        <details><summary>${L('Why this time?', 'ஏன் இந்த நேரம்?')}</summary>${w.factors.map((f) => `<div class="factor"><span>${esc(ta() ? f.labelTa : f.label)}</span><b class="${f.points > 0 ? 'pos' : 'zero'}">${f.points > 0 ? '+' : ''}${f.points}</b></div>`).join('')}</details>
      </div><div class="mu-score" aria-label="${esc(L('traditional score', 'மரபு மதிப்பு'))}">${w.score}</div></div>`).join('')
    : `<div class="card glass"><p>${esc(bi(empty || { en: 'No traditional window found in this period. Try a longer period, or go ahead when it suits your family.', ta: 'இந்தக் காலத்தில் மரபு நேரம் இல்லை. நீண்ட காலத்தைத் தேர்வு செய்யவும் அல்லது குடும்பத்திற்கு ஏற்ற நேரத்தில் செய்யுங்கள்.' }))}</p></div>`;
}
registerScreen('muhurtham', { render: renderMuhurtham, parent: 'plan', needsLoc: true });

// ================================================================ RUTHU / MANJAL NEERATTU
// Data minimisation (brief §11): the entered date/time is used only for ruthuPlan() and is never stored,
// sent to a server, logged or passed to the AI; no name is kept.
function renderRuthu(sec) {
  const girls = state.family.filter((m) => m.relation !== 'organization');
  sec.innerHTML = `${subHeader(L('Ruthu & Manjal Neerattu', 'ருது & மஞ்சள் நீராட்டு'), L('First-bath time and ceremony dates — family customs differ', 'தண்ணீர் ஊற்றும் நேரமும் விழா நாட்களும் — குடும்ப வழக்கங்கள் மாறுபடும்'))}
    <div class="card glass">
      ${girls.length ? `<label>${L('Girl (optional — only her birth star is used)', 'பெண் (விருப்பம் — நட்சத்திரம் மட்டும் பயன்படும்)')}<select id="ruGirl"><option value="">${L('— choose star instead —', '— நட்சத்திரம் தேர்வு —')}</option>${girls.map((m) => `<option value="${esc(m.id)}">${esc(displayName(m))}</option>`).join('')}</select></label>` : ''}
      <div class="row2" id="ruStarRow"><label>${L('Birth star', 'நட்சத்திரம்')}<select id="ruStar">${starOptions(0)}</select></label><label>${L('Pada', 'பாதம்')}<select id="ruPada">${padaOptions(1)}</select></label></div>
      <label>${L('Date and time', 'தேதி, நேரம்')}<input type="datetime-local" id="ruTime" autocomplete="off"></label>
      <p class="muted small">🔒 ${L('The date and time you enter are used only for this calculation and are not saved.', 'நீங்கள் உள்ளிட்ட தேதியும் நேரமும் இந்தக் கணக்கிற்கு மட்டுமே பயன்படும்; சேமிக்கப்படுவதில்லை.')}</p>
      <button class="btn-gold" id="ruBtn">🌸 ${L('Calculate', 'கணிக்கவும்')}</button>
      <p class="muted small">${L('Use these timings with your elders\' and family priest\'s guidance.', 'பெரியோர், குடும்பப் புரோகிதர் வழிகாட்டுதலுடன் பயன்படுத்தவும்.')}</p>
    </div><div id="ruResult"></div>`;
  $('#ruGirl')?.addEventListener('change', (e) => { $('#ruStarRow').hidden = !!e.target.value; });
  $('#ruBtn').addEventListener('click', async () => {
    const loc = state.loc;
    const [d, tm] = ($('#ruTime').value || '').split('T');
    if (!d || !tm) { toast(L('Please enter the date and time', 'தேதி, நேரத்தை உள்ளிடவும்')); return; }
    const [yy, mm, dd] = d.split('-').map(Number); const [hh, mi] = tm.split(':').map(Number);
    const at = new Date(Date.UTC(yy, mm - 1, dd, hh, mi) - loc.tz * 3600000);
    let person = null;
    const gid = $('#ruGirl')?.value;
    if (gid) { const c = chartOf(state.family.find((m) => m.id === gid)); person = { janmaNakshatra: c.janmaNakshatra.index, janmaRasi: c.janmaRasi.index }; }
    else { const st = Number($('#ruStar').value), p = Number($('#ruPada').value); person = { janmaNakshatra: st, janmaRasi: rasiOfStarPada(st, p) }; }
    $('#ruResult').innerHTML = `<div class="card glass">${loader(L('Calculating…', 'கணிக்கப்படுகிறது…'))}</div>`;
    await wait();
    const plan = ruthuPlan({ at, loc, person });
    $('#ruResult').innerHTML = `<p class="muted small">🔒 ${esc(bi(plan.dataPolicy.note))}</p>
      <div class="section-title">💧 ${L('First bath (Thanneer oothuthal) — suggested times', 'தண்ணீர் ஊற்றுதல் — பரிந்துரை நேரம்')}</div><div id="ruBath"></div>
      <div class="section-title">🌼 ${L('Manjal Neerattu Vizha — suggested dates', 'மஞ்சள் நீராட்டு விழா — பரிந்துரை நாட்கள்')}</div><div id="ruVizha"></div>`;
    renderMuResults(plan.bath, '#ruBath');
    renderMuResults(plan.vizha, '#ruVizha');
  });
}
registerScreen('ruthu', { render: renderRuthu, parent: 'plan', needsLoc: true });

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
    return `<details class="card glass nava"${open ? ' open' : ''}><summary><span class="pg" style="color:${COLOR[k]}">${GLYPH[k]}</span> <b>${esc(planetName(k))}</b> · ${esc(bi(n.deity))}${weak.includes(k) ? ` <span class="tag neutral">${L('lower index for you', 'உங்களுக்குக் குறைந்த குறியீடு')}</span>` : ''}</summary>
      <dl class="kv"><dt>${L('Governs', 'காரகம்')}</dt><dd>${esc(bi(n.governs))}</dd>
      ${n.day != null ? `<dt>${L('Day', 'கிழமை')}</dt><dd>${esc(ta() ? ['ஞாயிறு', 'திங்கள்', 'செவ்வாய்', 'புதன்', 'வியாழன்', 'வெள்ளி', 'சனி'][n.day] : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][n.day])}</dd>` : ''}
      <dt>${L('Colour', 'நிறம்')}</dt><dd>${esc(bi(n.color))}</dd><dt>${L('Grain (dhanyam)', 'தானியம்')}</dt><dd>${esc(bi(n.grain))}</dd>
      <dt>${L('Temple', 'கோவில்')}</dt><dd>${esc(bi(n.temple))}</dd></dl>
      <p>🪔 <b>${L('Free remedy', 'இலவச பரிகாரம்')}:</b> ${esc(bi(n.free))}</p>
      <p>🤲 <b>${L('Charity', 'தானம்')}:</b> ${esc(bi(n.charity))}</p>
      <p class="mantra">📿 ${esc(bi(n.mantra))} <button class="link-btn say" data-say="${esc(n.mantra.ta)}" aria-label="${esc(L('Read aloud', 'வாசித்துக்காட்டு'))}">🔊</button></p>
      <p class="muted small">💎 ${L('Gemstone', 'ரத்தினம்')}: ${esc(bi(n.gem))} — ${L('wear only after a careful personal consultation; it is never required.', 'கவனமான தனிப்பட்ட ஆலோசனைக்குப் பின் மட்டும் அணியவும்; இது கட்டாயமல்ல.')}</p></details>`;
  };
  sec.innerHTML = `${subHeader(L('Parigaram', 'பரிகாரம்'), L('Simple, free remedies first — for peace, health and prosperity', 'எளிய இலவச பரிகாரங்கள் முதலில் — அமைதி, ஆரோக்கியம், செல்வத்திற்கு'))}
    <div class="card glass"><div class="card-title">🌅 ${L('For today', 'இன்றைக்கு')}${m ? ` · ${esc(displayName(m))}` : ''}</div>
      ${items.map((i) => `<div class="pari-row"><span class="pg" style="color:${COLOR[i.planet]}">${GLYPH[i.planet]}</span><div><b>${esc(bi(i.reason))}</b><p>${esc(bi(i.free))}</p><p class="muted small">🛕 ${esc(bi(i.deity))} · ${esc(bi(i.temple))}</p></div></div>`).join('')}
    </div>
    <div class="section-title">${L('Navagraha parigaram', 'நவகிரக பரிகாரம்')}</div>
    ${['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'].map((k) => card(k, weak.includes(k))).join('')}`;
  $$('.say', sec).forEach((b) => b.addEventListener('click', () => speak(b.dataset.say)));
}
registerScreen('parigaram', { render: renderParigaram, parent: 'plan', needsLoc: true });

// ================================================================ BABY NAMES
const nameForm = { star: 0, pada: 1, gender: 'any' };
function renderNames(sec) {
  const nl = nameLetters(nameForm.star, nameForm.pada);
  sec.innerHTML = `${subHeader(L('Baby Names', 'குழந்தை பெயர்கள்'), L('Name letters from the birth star (namakshara)', 'ஜென்ம நட்சத்திரப்படி பெயர் எழுத்துகள்'))}
    <div class="card glass">
      ${state.family.length ? `<label>${L('Baby (from family)', 'குழந்தை (குடும்பத்திலிருந்து)')}<select id="nmMember"><option value="">—</option>${memberOptions(null)}</select></label>` : ''}
      <div class="row2"><label>${L('Birth star', 'நட்சத்திரம்')}<select id="nmStar">${starOptions(nameForm.star)}</select></label><label>${L('Pada', 'பாதம்')}<select id="nmPada">${padaOptions(nameForm.pada)}</select></label></div>
      <div class="seg" id="nmGender">${[['any', 'Any', 'எதுவும்'], ['boy', 'Boy', 'ஆண்'], ['girl', 'Girl', 'பெண்']].map(([id, en, tx]) => `<button data-g="${id}" class="${nameForm.gender === id ? 'sel' : ''}">${L(en, tx)}</button>`).join('')}</div>
      <div class="letters"><div class="letter-big">${esc(nl.primary.ta)}</div><div><div class="mini-label">${L('Best first letter', 'சிறந்த முதல் எழுத்து')}</div>${ta() ? '' : `<div class="mini-value">${esc(nl.primary.en)}</div>`}
        <div class="muted small">${L('All padas', 'அனைத்து பாதங்கள்')}: ${nl.all.map((a) => (ta() ? a.ta : `${a.ta} (${a.en})`)).join(' · ')}</div></div></div>
      <button class="btn-gold" id="nmBtn">✨ ${L('Suggest names', 'பெயர்கள் பரிந்துரை')}</button>
    </div>${aiBlock('nmAi')}`;
  $('#nmMember')?.addEventListener('change', (e) => {
    const m = state.family.find((x) => x.id === e.target.value);
    if (m) { const c = chartOf(m); nameForm.star = c.janmaNakshatra.index; nameForm.pada = c.janmaNakshatra.pada; renderNames(sec); }
  });
  $('#nmStar').addEventListener('change', (e) => { nameForm.star = Number(e.target.value); renderNames(sec); });
  $('#nmPada').addEventListener('change', (e) => { nameForm.pada = Number(e.target.value); renderNames(sec); });
  $$('#nmGender button').forEach((b) => b.addEventListener('click', () => { nameForm.gender = b.dataset.g; renderNames(sec); }));
  $('#nmBtn').addEventListener('click', () => {
    const context = { birthStar: nl.star.en, pada: nameForm.pada, startingSounds: [nl.primary, ...nl.all.filter((a) => a.pada !== nameForm.pada)].map((a) => `${a.en} (${a.ta})`), gender: nameForm.gender };
    runAi('nmAi', 'names', context, `${L('Names starting with', 'இந்த எழுத்தில் தொடங்கும் பெயர்கள்')}: ${nl.primary.ta} (${nl.primary.en}). `);
  });
}
registerScreen('names', { render: renderNames, parent: 'family' });

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
registerScreen('thivasam', { render: renderThivasam, parent: 'family', needsLoc: true });

// ================================================================ NATCHATHIRA BIRTHDAY
function renderStarBday(sec) {
  sec.innerHTML = `${subHeader(L('Star Birthday', 'நட்சத்திரப் பிறந்தநாள்'), L('The traditional birthday — your birth star in your Tamil birth month', 'பாரம்பரியப் பிறந்தநாள் — பிறந்த தமிழ் மாதத்தில் ஜென்ம நட்சத்திரம் வரும் நாள்'))}<div id="sbList">${loader(L('Calculating…', 'கணிக்கப்படுகிறது…'))}</div>`;
  setTimeout(() => {
    if (state.view !== 'starbday') return;
    const todayIso = new Date(Date.now() + state.loc.tz * 3600000).toISOString().slice(0, 10);
    const rows = state.family.map((m) => {
      const c = chartOf(m);
      const month = c.planets.Sun.rasi;
      const next = natchathiraBirthdays({ birthStar: c.janmaNakshatra.index, birthTamilMonth: month, loc: { lat: m.lat, lon: m.lon, tz: m.tz }, count: 1 })[0];
      const daysLeft = next ? Math.round((Date.parse(next.date) - Date.parse(todayIso)) / 86400000) : null;
      return { m, c, month, next, daysLeft };
    }).sort((a, b) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999));
    $('#sbList').innerHTML = rows.map(({ m, c, month, next, daysLeft }) => `<div class="card glass sb-row">
        <span class="avatar">${esc(displayName(m).slice(0, 1).toUpperCase())}</span>
        <div style="flex:1"><b>${esc(displayName(m))}</b><div class="muted small">${esc(nakName(c.janmaNakshatra.index))} · ${esc(bi(TAMIL_MONTHS[month]))}</div>
          ${next ? `<div>🎂 <b>${fmtIsoDate(next.date)}</b> · ${esc(ta() ? `${next.tamil.monthTa} ${next.tamil.day}` : `${next.tamil.monthEn} ${next.tamil.day}`)} ${remindBtn({ title: `${L('Star birthday', 'நட்சத்திரப் பிறந்தநாள்')} · ${displayName(m)}`, at: atLocal(next.date, '06:00') })}</div>` : ''}</div>
        ${daysLeft != null ? `<div class="mu-score">${daysLeft === 0 ? '🎉' : daysLeft}<small>${daysLeft === 0 ? L('today', 'இன்று') : L('days', 'நாள்')}</small></div>` : ''}</div>`).join('')
      || `<div class="card glass cta-card" data-go="family" data-param='{"add":true}'>${L('Add family members to see their star birthdays', 'நட்சத்திரப் பிறந்தநாளைப் பார்க்க குடும்பத்தினரைச் சேர்க்கவும்')} ›</div>`;
    // 60th / 70th / 80th celebrations for elders (shown from age 45).
    const elders = state.family.filter((m) => m.relation !== 'organization').map((m) => ({ m, c: chartOf(m) }))
      .filter(({ m }) => (memberAge(m) ?? 0) >= 45);
    if (elders.length) {
      $('#sbList').insertAdjacentHTML('beforeend', `<div class="section-title">🪔 ${L('60th, 70th & 80th celebrations', 'சஷ்டியப்தபூர்த்தி, பீமரத சாந்தி, சதாபிஷேகம்')}</div>
        ${elders.map(({ m, c }) => milestones(c, { lat: m.lat, lon: m.lon, tz: m.tz }).filter((x) => !x.past).map((x) => `<div class="card glass window first">
          <div class="win-dates">${esc(bi(x.name))} · ${esc(m.nameTa && ta() ? m.nameTa : m.name)}</div>
          ${x.day ? `<div>${remindBtn({ title: `${bi(x.name)} · ${displayName(m)}`, at: atLocal(x.day.date, '06:00') })} 📅 <b>${fmtIsoDate(x.day.date)}</b> · ${esc(ta() ? `${x.day.tamil.monthTa} ${x.day.tamil.day}` : `${x.day.tamil.monthEn} ${x.day.tamil.day}`)} · ${esc(nakName(c.janmaNakshatra.index))}</div>` : ''}
          ${x.thousandthFullMoon ? `<div class="small muted">🌕 ${L('1000th full moon', '1000-வது பௌர்ணமி')}: ${fmtIsoDate(new Date(x.thousandthFullMoon.getTime() + state.loc.tz * 3600000).toISOString().slice(0, 10))}</div>` : ''}
          <p class="small">${L('Traditionally celebrated at Thirukadaiyur Abhirami–Amritaghateswarar temple or at home with homam.', 'பாரம்பரியமாக திருக்கடையூர் அபிராமி–அமிர்தகடேஸ்வரர் கோவிலில் அல்லது வீட்டில் ஹோமத்துடன் கொண்டாடப்படும்.')}</p>
          <div class="btn-row"><button class="chip-btn" data-go="packages" data-param='{"id":"thirukadaiyur"}'>🧳 ${L('Package', 'பேக்கேஜ்')}</button><button class="chip-btn" data-go="seva" data-param='{"service":"homam"}'>🔥 ${L('Book priest', 'புரோகிதர்')}</button></div></div>`).join('')).join('')}`);
    }
  }, 40);
}
registerScreen('starbday', { render: renderStarBday, parent: 'family', needsLoc: true });

// ================================================================ ASK THUNAI (chat)
const chat = { messages: [], memberId: null, busy: false };
const SUGGEST = [
  ['How is my career this year?', 'இந்த வருடம் என் தொழில் எப்படி இருக்கும்?'],
  ['Which planet is weak for me, and what simple parigaram should I do?', 'எந்த கிரகம் எனக்குப் பலவீனம்? என்ன எளிய பரிகாரம் செய்யலாம்?'],
  ['What is a good time today for important work?', 'இன்று முக்கிய வேலைக்கு நல்ல நேரம் எது?'],
  ['Which traditional periods does my chart link with marriage?', 'என் ஜாதகம் திருமணத்துடன் தொடர்புபடுத்தும் மரபுக் காலங்கள் எவை?'],
  ['How can I improve my finances and savings?', 'என் பொருளாதாரம், சேமிப்பு மேம்பட என்ன செய்யலாம்?'],
  ['Explain my current dasa in simple words', 'நடப்பு தசையை எளிமையாக விளக்கவும்'],
];

function chatContext() {
  refreshSnap();
  const s = state.snap;
  const loc = state.loc;
  const m = activeMember();
  const ctx = {
    today: { dateLocal: fmtIsoDate(new Date(Date.now() + loc.tz * 3600000).toISOString().slice(0, 10)), weekday: s.weekday.en, star: s.nakshatra.name, tithi: `${s.tithi.paksha} ${s.tithi.name}`, yoga: s.yoga.name, currentHorai: s.currentHora.lord, rahuKalam: `${fmtTime(s.rahuKalam.start, loc.tz)}-${fmtTime(s.rahuKalam.end, loc.tz)}`, place: loc.name },
  };
  if (m) {
    const c = chartOf(m);
    const o = dayOutlook(c, s);
    const lg = hasLagna(c);
    ctx.person = {
      name: m.name, relation: m.relation, gender: m.gender, birth: `${m.date} ${c.timePrecision === 'unknown' ? '(time unknown)' : m.time} ${m.place}`, birthTimePrecision: c.timePrecision,
      lagna: lg ? `${c.lagna.rasiName} ${c.lagna.dms}` : 'not available (birth time unknown)', rasi: c.janmaRasi.name, star: `${c.janmaNakshatra.name} pada ${c.janmaNakshatra.pada}`,
      unstableItems: c.stability?.unstable || [],
      planets: Object.fromEntries(Object.entries(c.planets).filter(([k]) => k !== 'Lagna').map(([k, p]) => [k, `${p.rasiName} ${p.dms} ${p.nakshatraName}${p.retrograde && !['Rahu', 'Ketu'].includes(k) ? ' (retro)' : ''}${lg ? ` house ${((p.rasi - c.lagna.rasi + 12) % 12) + 1}` : ''}`])),
      dasa: c.dasa.current && `${c.dasa.current.lord} Mahadasa (${fmtIsoDate(c.dasa.current.start.toISOString().slice(0, 10))} – ${fmtIsoDate(c.dasa.current.end.toISOString().slice(0, 10))}), ${c.dasa.currentBhukti?.lord} Bhukti until ${c.dasa.currentBhukti && fmtIsoDate(c.dasa.currentBhukti.end.toISOString().slice(0, 10))}`,
      upcomingDasas: c.dasa.periods.filter((p) => p.start > new Date()).slice(0, 2).map((p) => `${p.lord} from ${p.start.toISOString().slice(0, 10)}`),
      traditionalStrengthIndex: grahaStrength(c.planets).map((g) => `${g.planet}: ${g.score}`),
      doshams: (() => { const d = doshams(c.planets); return { chevvaiRawPresence: d.chevvai.raw, chevvaiExceptionsForReview: d.chevvai.exceptions.map((e) => e.en), rahuKetu: d.rahuKetu.present }; })(),
      today: { taraBala: o.tara[0], chandraBalaHouse: o.pos, chandrashtamam: o.chandrashtama },
    };
  }
  return ctx;
}

function chatFallback() {
  const m = activeMember();
  refreshSnap();
  const items = dailyParigaram({ weekday: state.snap.weekday.index, chart: m && chartOf(m), snapshot: state.snap });
  return `${L('Here is today\'s guidance from your chart:', 'உங்கள் ஜாதகப்படி இன்றைய வழிகாட்டுதல்:')}\n${items.map((i) => `🪔 ${bi(i.reason)} — ${bi(i.free)}`).join('\n')}`;
}

function renderChat(sec) {
  const m = activeMember();
  if (chat.memberId !== (m?.id || null)) { chat.messages = []; chat.memberId = m?.id || null; }
  sec.innerHTML = `<div class="chat-head card glass"><div class="avatar big" aria-hidden="true">🪔</div><div><h2 class="chat-title">${L('Ask Thunai', 'துணையிடம் கேளுங்கள்')}</h2><div class="muted small">${m ? L(`Using ${displayName(m)}'s chart as traditional context`, `${displayName(m)} அவர்களின் ஜாதகத்தை மரபுப் பின்னணியாகக் கொண்டு`) : L('Add your birth details for personal answers', 'தனிப்பட்ட பதில்களுக்கு பிறப்பு விவரம் சேர்க்கவும்')}</div></div></div>
    <div id="chatLog" class="chat-log" role="log" aria-live="polite">${chat.messages.length ? '' : `<div class="bubble ai">🙏 ${L('Vanakkam! Ask about your chart, today\'s timings, family plans or a simple practice. For health, legal or money decisions, a qualified professional comes first. You can type or tap the mic and speak in Tamil.', 'வணக்கம்! உங்கள் ஜாதகம், இன்றைய நேரம், குடும்பத் திட்டங்கள், எளிய வழிபாடு பற்றிக் கேளுங்கள். உடல்நலம், சட்டம், பணம் தொடர்பான முடிவுகளுக்குத் தகுதியான நிபுணரே முதன்மை. தட்டச்சு செய்யலாம் அல்லது மைக்கை அழுத்தி தமிழில் பேசலாம்.')}</div>`}</div>
    <div class="suggest-row" role="group" aria-label="${esc(L('Suggested questions', 'பரிந்துரைக் கேள்விகள்'))}">${SUGGEST.map(([en, tx]) => `<button class="sg">${esc(L(en, tx))}</button>`).join('')}</div>
    <form id="chatForm" class="chat-form"><button type="button" id="micBtn" class="mic" aria-label="${L('Speak', 'பேசுங்கள்')}">🎙️</button>
      <label class="sr-only" for="chatInput">${L('Message', 'செய்தி')}</label><input id="chatInput" autocomplete="off" maxlength="600" placeholder="${esc(L('Ask Thunai…', 'துணையிடம் கேளுங்கள்…'))}">
      <button class="send" aria-label="${L('Send', 'அனுப்பு')}">➤</button></form>`;
  const log = $('#chatLog');
  for (const msg of chat.messages) addBubble(msg.role, msg.content);
  $$('.sg', sec).forEach((b) => b.addEventListener('click', () => send(b.textContent)));
  $('#chatForm').addEventListener('submit', (e) => { e.preventDefault(); send($('#chatInput').value); });
  setupMic();
  log.scrollTop = log.scrollHeight;
  if (state.params?.topic === 'chart' && !chat.messages.length) send(L('Please explain my birth chart in simple words: the main traditional themes and the current dasa.', 'என் ஜாதகத்தை எளிமையாக விளக்கவும்: முக்கிய மரபுக் கருத்துகளும் நடப்பு தசையும்.'));
}

function addBubble(role, text) {
  const b = document.createElement('div');
  b.className = `bubble ${role === 'user' ? 'me' : 'ai'}`;
  b.textContent = text;
  if (role !== 'user') {
    const s = document.createElement('button');
    s.className = 'link-btn say-bubble'; s.textContent = '🔊'; s.setAttribute('aria-label', L('Read aloud', 'வாசித்துக்காட்டு'));
    s.addEventListener('click', () => speak(b.firstChild.textContent));
    b.append(s);
  }
  $('#chatLog').append(b);
  $('#chatLog').scrollTop = $('#chatLog').scrollHeight;
  return b;
}

async function send(text) {
  text = text.trim();
  if (!text || chat.busy) return;
  chat.busy = true;
  $('#chatInput').value = '';
  chat.messages.push({ role: 'user', content: text });
  addBubble('user', text);
  const b = addBubble('assistant', L('Thinking…', 'யோசிக்கிறேன்…'));
  b.classList.add('typing');
  const node = b.firstChild;
  const r = await aiTask({ task: 'chat', context: chatContext(), messages: chat.messages.slice(-12), fallbackText: chatFallback(), channel: 'chat', onText: (tx) => { node.textContent = tx; $('#chatLog').scrollTop = $('#chatLog').scrollHeight; } });
  b.classList.remove('typing');
  const extra = policyExtrasHtml(r.meta);
  if (extra) { const x = document.createElement('div'); x.className = 'ai-extras'; x.innerHTML = extra; b.append(x); }
  chat.messages.push({ role: 'assistant', content: r.text });
  chat.busy = false;
}

function setupMic() {
  const btn = $('#micBtn');
  if (!(window.SpeechRecognition || window.webkitSpeechRecognition)) { btn.hidden = true; return; }
  btn.addEventListener('click', async () => {
    if (btn.classList.contains('on')) return;
    btn.classList.add('on');
    $('#chatInput').placeholder = L('Listening… speak now', 'கேட்கிறேன்… இப்போது பேசுங்கள்');
    try {
      const text = await listen({ onPartial: (tx) => { $('#chatInput').value = tx; } });
      if (text) send(text);
    } catch (e) {
      toast(micMessage(e.message), 5000);
    } finally {
      btn.classList.remove('on');
      $('#chatInput').placeholder = L('Ask Thunai…', 'துணையிடம் கேளுங்கள்…');
    }
  });
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
  x.fillStyle = '#ffdf9e'; x.font = font(800, 64); x.fillText('துணை', W / 2, 150);
  x.fillStyle = '#b7a9d6'; x.font = font(400, 30); x.fillText('Thunai · உங்கள் வாழ்க்கையின் வழிகாட்டி', W / 2, 198);
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
  x.fillText(`📍 ${loc.name || ''} · துணை · Thunai`, W / 2, H - 80);
  const text = `🙏 ${td.tamil.monthTa} ${td.tamil.day} · ${td.weekday.ta}\nநட்சத்திரம்: ${NAKSHATRAS[snap.nakshatra.index].ta} · திதி: ${snap.tithi.ta}\nராகு காலம்: ${fmtTime(td.rahuKalam.start, loc.tz)}–${fmtTime(td.rahuKalam.end, loc.tz)}\n— துணை (Thunai)`;
  const blob = await new Promise((r) => cv.toBlob(r, 'image/png'));
  const file = new File([blob], `thunai-${td.date}.png`, { type: 'image/png' });
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
