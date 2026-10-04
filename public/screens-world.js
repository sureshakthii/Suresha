// Real-world screens: weather, nearby temples, mantras, pooja store, seva bookings (priests, annadhanam,
// gomatha pooja, temple archanai), reminders (morning alarm, parigaram trips), family relations, full analysis.
import { NAKSHATRAS } from './shared/astro.js';
import { TEMPLES, TEMPLE_TAGS, templesNear, templeLinks } from './shared/temples.js';
import { templeInfo } from './shared/temple-info.js';
import { MANTRAS, MANTRA_TAGS } from './shared/mantras.js';
import { NAVAGRAHA, grahaStrength } from './shared/remedies.js';
import { familyRelations } from './shared/relations.js';
import { fullAnalysis, BHAVAS } from './shared/analysis.js';
import { PACKAGES, PACKAGE_INCLUDES, packageRoute } from './shared/packages.js';
import {
  state, $, $$, L, ta, esc, bi, GLYPH, COLOR, planetName, rasiName, nakName, fmtTime, fmtIsoDate, api, store,
  activeMember, chartOf, registerScreen, go, subHeader, aiTask, toast, speak, stopSpeaking, STATIC, needsServerCard, displayName,
  placeName, BRAND
} from './core.js';
import { refreshSnap } from './screens-main.js';
import { fetchForecast, weatherAdvice } from './shared/weather.js';
import { tamilDay } from './shared/tamilcal.js';
import { remindBtn } from './remind.js';
import { upcomingReminders, deleteReminder } from './remind.js';

const loader = (msg = '') => `<div class="loader"><i></i><i></i><i></i></div>${msg ? `<p class="muted center">${msg}</p>` : ''}`;
const todayIso = () => new Date(Date.now() + state.loc.tz * 3600000).toISOString().slice(0, 10);

// ================================================================ WEATHER
const weatherCache = new Map();
export async function fetchWeather(lat, lon) {
  const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  const hit = weatherCache.get(key);
  if (hit && Date.now() - hit.at < 10 * 60000) return hit.data;
  // Server: station observation + forecast. No server (offline phone app / test page): straight from Open-Meteo.
  let data;
  if (STATIC) data = await fetchForecast(lat, lon);
  else { try { data = await api(`/api/weather?lat=${lat}&lon=${lon}`); } catch { data = await fetchForecast(lat, lon); } }
  weatherCache.set(key, { at: Date.now(), data });
  return data;
}
const wIcon = (code) => (code == null ? '🌡️' : code === 0 ? '☀️' : code <= 2 ? '🌤️' : code === 3 ? '☁️' : code <= 48 ? '🌫️' : code <= 57 ? '🌦️' : code <= 67 ? '🌧️' : code <= 77 ? '🌨️' : code <= 82 ? '🌧️' : '⛈️');
const travelTag = (lvl) => (lvl === 'good' ? 'good' : lvl === 'caution' ? 'warn' : 'bad');

/** Compact weather card for the home screen (fills itself asynchronously). */
export function weatherCardHtml() {
  return `<div class="card glass weather-mini" data-go="weather" id="homeWeather">${loader()}</div>`;
}
/** Today's advice from the forecast + panchangam (nalla neram to prefer, rahu kalam / yamagandam to avoid). */
function adviceFor(w, lat, lon, td) {
  const tz = state.loc.tz;
  let day = td;
  if (!day) {
    const [d, mo, y] = new Date(Date.now() + tz * 3600000).toISOString().slice(0, 10).split('-').reverse().map(Number);
    day = tamilDay(new Date(Date.UTC(y, mo - 1, d, 12) - tz * 3600000), lat, lon, tz);
  }
  return weatherAdvice(w, { tz, good: day.gowri.filter((g) => g.good && g.part === 'day'), avoid: [day.rahuKalam, day.yamagandam] });
}
const adviceHtml = (a, { max = 9 } = {}) => `${a.tips.slice(0, max).map((t) => `<div class="wx-tip ${t.kind}">${{ heat: '🔥', rain: '🌧️', humid: '💦', wind: '💨', good: '🌿' }[t.kind]} ${esc(bi(t))}${t.at ? ` ${remindBtn({ title: bi(t), at: new Date(t.at.getTime() - 3600000) })}` : ''}</div>`).join('')}
  ${a.bestOut ? `<div class="wx-tip best">🚶 <b>${esc(bi(a.bestOut))}</b> ${remindBtn({ title: bi(a.bestOut), at: a.bestOut.start })}</div>` : ''}`;

export async function fillHomeWeather(td) {
  const el = $('#homeWeather');
  if (!el) return;
  try {
    const w = await fetchWeather(state.loc.lat, state.loc.lon);
    if (!$('#homeWeather')) return;
    const obs = w.station?.observed;
    const t = Math.round(obs?.tempC ?? w.current.tempC);
    const today = w.daily[0] || {};
    el.innerHTML = `<div class="wx-top"><div class="w-icon">${wIcon(w.current.weatherCode)}</div>
        <div class="wx-temp">${t}°<small>C</small></div>
        <div style="flex:1;min-width:0"><div class="mini-label">${L('Weather now', 'இப்போதைய வானிலை')} · ${esc(placeName(state.loc.name))}</div>
          <div class="wx-desc">${esc(bi(w.current.description))}</div>
          <div class="mini-sub">${L('Feels like', 'உணரும் வெப்பம்')} ${Math.round(w.current.feelsLikeC ?? t)}° · ${today.minC != null ? `${Math.round(today.minC)}°–${Math.round(today.maxC)}°` : ''}</div></div></div>
      <div class="wx-stats">
        <div><span>💧</span><b>${w.current.humidity ?? '—'}%</b><small>${L('Humidity', 'ஈரப்பதம்')}</small></div>
        <div><span>☔</span><b>${today.rainChance ?? 0}%</b><small>${L('Rain today', 'இன்று மழை')}</small></div>
        <div><span>💨</span><b>${Math.round(w.current.windKph ?? 0)}</b><small>${L('Wind km/h', 'காற்று கி.மீ/மணி')}</small></div>
      </div>
      <span class="tag block ${travelTag(w.travel.level)}">${w.travel.level === 'good' ? '🚗' : w.travel.level === 'caution' ? '☂️' : '⛈️'} ${esc(bi(w.travel))}</span>
      <div class="wx-advice">${adviceHtml(adviceFor(w, state.loc.lat, state.loc.lon, td), { max: 2 })}</div>`;
  } catch {
    el.innerHTML = `<div class="wx-top"><div class="w-icon">🌡️</div><div class="mini-sub">${STATIC ? L('Live temperature, humidity and rain appear in the installed app (this preview cannot reach the internet).', 'நேரலை வெப்பநிலை, ஈரப்பதம், மழை நிறுவப்பட்ட செயலியில் தெரியும் (இந்த முன்னோட்டத்தால் இணையத்தை அணுக முடியாது).') : L('Weather is unavailable right now', 'வானிலை தற்போது கிடைக்கவில்லை')}</div></div>`;
  }
}

async function renderWeather(sec, params = {}) {
  const place = params.name || state.loc.name || '';
  const lat = params.lat ?? state.loc.lat, lon = params.lon ?? state.loc.lon;
  sec.innerHTML = `${subHeader(L('Weather & Travel', 'வானிலை & பயணம்'), esc(placeName(place)), params.back || 'home')}<div id="wBody">${loader(L('Contacting the weather station…', 'வானிலை நிலையத்தைத் தொடர்பு கொள்கிறது…'))}</div>`;
  try {
    const w = await fetchWeather(lat, lon);
    const obs = w.station?.observed;
    const maxRain = Math.max(1, ...w.hourly.map((h) => h.rainChance || 0));
    $('#wBody').innerHTML = `
      <div class="card glass travel-banner ${travelTag(w.travel.level)}"><b>${w.travel.level === 'good' ? '🚗' : w.travel.level === 'caution' ? '☂️' : '⛈️'} ${esc(bi(w.travel))}</b>
        ${w.travel.reasons.map((r) => `<p class="small">• ${esc(bi(r))}</p>`).join('')}</div>
      <div class="card glass"><div class="card-title">🧭 ${L('Today\'s weather advice', 'இன்றைய வானிலை ஆலோசனை')}</div>${adviceHtml(adviceFor(w, lat, lon))}</div>
      <div class="card glass w-now"><div class="w-big">${wIcon(w.current.weatherCode)}</div>
        <div><div class="w-temp">${Math.round(w.current.tempC)}°C</div><div>${esc(bi(w.current.description))}</div>
        <div class="muted small">${L('Feels like', 'உணரும் வெப்பம்')} ${Math.round(w.current.feelsLikeC)}°C · 💧 ${w.current.humidity}% · 💨 ${Math.round(w.current.windKph)} km/h</div></div></div>
      ${obs ? `<div class="card glass"><div class="card-title"><span>📡 ${L('Weather station', 'வானிலை நிலையம்')}: ${esc(w.station.name)}</span><span class="pill">${esc(w.station.icao)} · ${Math.round(w.station.distanceKm)} km</span></div>
        <dl class="kv"><dt>${L('Observed', 'பதிவு')}</dt><dd>${fmtTime(obs.time, state.loc.tz)}</dd><dt>${L('Temperature', 'வெப்பநிலை')}</dt><dd>${obs.tempC ?? '—'}°C</dd>
        ${ta() ? '' : `<dt>Conditions</dt><dd>${esc(obs.conditions || '—')}</dd>`}<dt>${L('Wind', 'காற்று')}</dt><dd>${obs.windKph ?? '—'} km/h ${obs.windDir ?? ''}${obs.windDir != null ? '°' : ''}</dd>
        <dt>${L('Visibility', 'தெரிவுநிலை')}</dt><dd>${obs.visibilityKm ?? '—'} km</dd><dt>${L('Pressure', 'அழுத்தம்')}</dt><dd>${obs.pressureHpa ?? '—'} hPa</dd></dl>
        ${ta() ? '' : `<p class="muted small mono">${esc(obs.raw || '')}</p>`}</div>` : ''}
      <div class="card glass"><div class="card-title">🌧️ ${L('Rain chance — next 24 hours', 'மழை வாய்ப்பு — அடுத்த 24 மணி')}</div>
        <div class="rain-bars">${w.hourly.map((h) => `<div class="rb" title="${fmtTime(h.time, state.loc.tz)} · ${h.rainChance}%"><i style="height:${Math.max(3, (h.rainChance / maxRain) * 100)}%"></i><span>${new Date(new Date(h.time).getTime()).getHours()}</span></div>`).join('')}</div></div>
      <div class="card glass"><div class="card-title">📅 ${L('7-day forecast', '7 நாள் முன்னறிவிப்பு')}</div>
        ${w.daily.map((d) => `<div class="factor"><span>${wIcon(d.weatherCode)} ${fmtIsoDate(d.date)} · ${esc(bi(d.description))}</span><b class="zero">${Math.round(d.minC)}°–${Math.round(d.maxC)}° · 💧${d.rainChance ?? 0}%</b></div>`).join('')}</div>
      <p class="muted small center">${L('Sources', 'ஆதாரம்')}: ${esc(w.source.station)} · ${esc(w.source.forecast)}</p>`;
  } catch (e) {
    $('#wBody').innerHTML = `<div class="card glass"><p>${L('Weather is unavailable right now. Please try again in a little while.', 'வானிலை தற்போது கிடைக்கவில்லை. சிறிது நேரம் கழித்து முயற்சிக்கவும்.')}</p>${ta() ? '' : `<p class="muted small">${esc(e.message)}</p>`}</div>`;
  }
}
registerScreen('weather', { render: renderWeather, parent: 'home', needsLoc: true });

// ================================================================ TEMPLE DETAILS (sirappu, power, thala varalaru, how to reach)
/** Expandable details for one temple: highlights, what to pray for, legend and the way by air, rail and road. */
export function templeDetailHtml(t, { open = false } = {}) {
  const i = templeInfo(t.id);
  if (!i) return '';
  const q = encodeURIComponent(`${t.name.en}, ${t.town}`);
  return `<details class="temple-more"${open ? ' open' : ''}><summary>📜 ${L('Sirappu, power & thala varalaru', 'சிறப்பு, சக்தி & தல வரலாறு')}</summary>
    <p class="small">🌟 <b>${L('Sirappu', 'சிறப்பு')}:</b> ${esc(bi(i.sirappu))}</p>
    <p class="small">🙏 <b>${L('Pray here for', 'இங்கு வேண்டுவது')}:</b> ${esc(bi(i.power))}</p>
    <p class="small">📖 <b>${L('Thala varalaru', 'தல வரலாறு')}:</b> ${esc(bi(i.varalaru))}</p>
    ${i.festival ? `<p class="small">🎉 <b>${L('Festival', 'திருவிழா')}:</b> ${esc(bi(i.festival))}</p>` : ''}
    ${i.timings ? `<p class="small">🕰️ <b>${L('Nadai thirappu (approx.)', 'நடை திறப்பு (தோராயம்)')}:</b> ${esc(bi(i.timings))}</p>` : ''}
    <p class="small">✈️ ${esc(bi(i.airport))}</p><p class="small">🚆 ${esc(bi(i.rail))}</p>
    <div class="btn-row">
      <a class="chip-btn" href="https://www.google.com/travel/flights?q=${encodeURIComponent(`flights to ${i.airport.en.split(' (')[0].split(' ~')[0]}`)}" target="_blank" rel="noopener">✈️ ${L('Flights', 'விமானம்')}</a>
      <a class="chip-btn" href="https://www.irctc.co.in/" target="_blank" rel="noopener">🚆 ${L('Train', 'ரயில்')}</a>
      <a class="chip-btn" href="https://www.google.com/maps/search/hotels+near+${q}" target="_blank" rel="noopener">🏨 ${L('Stay', 'தங்குமிடம்')}</a>
      <a class="chip-btn" href="https://www.google.com/maps/dir/?api=1&destination=${t.lat},${t.lon}" target="_blank" rel="noopener">🗺️ ${L('Road', 'சாலை')}</a>
    </div></details>`;
}

// ================================================================ TEMPLES (nearby)
const templeUi = { tag: 'all', query: '' };
function renderTemples(sec) {
  const m = activeMember();
  const weak = m ? grahaStrength(chartOf(m).planets).filter((g) => g.level === 'weak').map((g) => g.planet) : [];
  sec.innerHTML = `${subHeader(L('Temples near you', 'அருகிலுள்ள கோவில்கள்'), `${L('Distances from', 'தூரம்')} 📍 ${esc(placeName(state.loc.name))}`)}
    ${weak.length ? `<div class="card glass"><b>🌟 ${L('Parigara sthalams for', 'பரிகாரத் தலங்கள்')} ${esc(displayName(m))}:</b> ${weak.map((k) => `${GLYPH[k]} ${esc(bi(NAVAGRAHA[k].temple))}`).join(' · ')}</div>` : ''}
    <div class="member-switch">${TEMPLE_TAGS.map((t) => `<button class="mchip${templeUi.tag === t.id ? ' sel' : ''}" data-tag="${t.id}">${esc(bi(t))}</button>`).join('')}</div>
    <label class="sr-only" for="tSearch">${L('Search temples', 'கோவில் தேடல்')}</label>
    <input id="tSearch" placeholder="${esc(L('Search by temple, deity or town…', 'கோவில், தெய்வம், ஊர் மூலம் தேடுக…'))}" value="${esc(templeUi.query)}">
    <div id="tList"></div>
    <div class="card glass coming"><b>🏛️ ${L('Official timings, archanai & donations', 'அதிகாரப்பூர்வ நேரம், அர்ச்சனை, நன்கொடை')}</b>
      <p class="small">${L('Nadai thirappu timings, thala varalaru and e-services for Tamil Nadu temples are published by the Hindu Religious & Charitable Endowments Department.', 'தமிழகக் கோவில்களின் நடை திறப்பு நேரம், தல வரலாறு, இ-சேவைகள் இந்து சமய அறநிலையத் துறையால் வெளியிடப்படுகின்றன.')}</p>
      <a class="link-btn" href="https://hrce.tn.gov.in/" target="_blank" rel="noopener">🔗 hrce.tn.gov.in</a></div>`;
  const draw = () => {
    const list = templesNear(state.loc.lat, state.loc.lon, templeUi);
    $('#tList').innerHTML = list.map((t) => {
      const links = templeLinks(t);
      const hl = t.planet && weak.includes(t.planet);
      return `<div class="card glass temple${hl ? ' hl' : ''}">
        <div class="pg big" style="color:${t.planet ? COLOR[t.planet] : 'var(--gold)'}">${t.planet ? GLYPH[t.planet] : '🛕'}</div>
        <div style="flex:1;min-width:0"><b>${esc(bi(t.name))}</b>
          <p class="muted small">${esc(bi(t.deity))} · ${esc(placeName(t.town))}</p>
          <p class="small dist">📏 ${t.km < 1 ? '<1' : `~${Math.round(t.roadKm)}`} km ${L('by road', 'சாலை வழி')} · 🚗 ~${t.driveHours < 1 ? `${Math.round(t.driveHours * 60)} ${L('min', 'நிமி')}` : `${t.driveHours.toFixed(1)} ${L('hr', 'மணி')}`}</p>
          <p class="small">${esc(bi(t.note))}</p>
          ${templeDetailHtml(t)}
          <div class="btn-row">
            <a class="chip-btn" href="${links.directions}" target="_blank" rel="noopener">🗺️ ${L('Directions', 'வழி')}</a>
            <a class="chip-btn" href="${links.hotels}" target="_blank" rel="noopener">🏨 ${L('Hotels', 'தங்குமிடம்')}</a>
            <button class="chip-btn" data-weather="${t.id}">☁️ ${L('Weather', 'வானிலை')}</button>
            <button class="chip-btn" data-trip="${t.id}">⏰ ${L('Plan visit', 'பயணத் திட்டம்')}</button>
            <button class="chip-btn" data-book="${t.id}">🙏 ${L('Archanai', 'அர்ச்சனை')}</button>
          </div></div></div>`;
    }).join('') || `<p class="muted center">${L('No temples match.', 'பொருந்தும் கோவில் இல்லை.')}</p>`;
    $$('[data-weather]', sec).forEach((b) => b.addEventListener('click', () => { const t = TEMPLES.find((x) => x.id === b.dataset.weather); go('weather', { lat: t.lat, lon: t.lon, name: bi(t.name), back: 'temples' }); }));
    $$('[data-trip]', sec).forEach((b) => b.addEventListener('click', () => { const t = TEMPLES.find((x) => x.id === b.dataset.trip); go('reminders', { tripTitle: bi(t.name), tripPlace: t.town }); }));
    $$('[data-book]', sec).forEach((b) => b.addEventListener('click', () => go('seva', { type: 'temple_booking', templeId: b.dataset.book })));
  };
  $$('[data-tag]', sec).forEach((b) => b.addEventListener('click', () => { templeUi.tag = b.dataset.tag; $$('[data-tag]', sec).forEach((x) => x.classList.toggle('sel', x === b)); draw(); }));
  $('#tSearch').addEventListener('input', (e) => { templeUi.query = e.target.value; draw(); });
  draw();
}
registerScreen('temples', { render: renderTemples, parent: 'home', needsLoc: true });

// ================================================================ MANTRAS
const mantraUi = { tag: 'travel', repeat: 11, playing: null, travelMode: false };
let wakeLock = null;
async function keepAwake(on) {
  try {
    if (on && 'wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen');
    else { await wakeLock?.release(); wakeLock = null; }
  } catch { /* not granted */ }
}

async function playMantra(m, times) {
  mantraUi.playing = m.id;
  drawMantraState();
  for (let i = 0; i < times && mantraUi.playing === m.id; i++) {
    const ok = await speak(m.text, { rate: 0.82 });
    if (!ok) break;
    const c = $(`#mc-${m.id}`);
    if (c) c.textContent = `${i + 1} / ${times}`;
  }
  if (mantraUi.playing === m.id) { mantraUi.playing = null; drawMantraState(); }
}
async function travelPlaylist() {
  mantraUi.travelMode = true;
  keepAwake(true);
  drawMantraState();
  const list = MANTRAS.filter((m) => m.for.includes('travel'));
  for (let round = 0; mantraUi.travelMode; round++) {
    for (const m of list) {
      if (!mantraUi.travelMode) break;
      mantraUi.playing = m.id; drawMantraState();
      const ok = await speak(m.text, { rate: 0.82 });
      if (!ok) { mantraUi.travelMode = false; break; }
    }
  }
  mantraUi.playing = null; keepAwake(false); drawMantraState();
}
function stopAll() { mantraUi.travelMode = false; mantraUi.playing = null; stopSpeaking(); keepAwake(false); drawMantraState(); }
function drawMantraState() {
  $$('.mantra-card').forEach((c) => c.classList.toggle('playing', c.dataset.id === mantraUi.playing));
  const t = $('#travelBtn');
  if (t) t.textContent = mantraUi.travelMode ? `⏹ ${L('Stop travel mantras', 'பயண மந்திரத்தை நிறுத்து')}` : `🚗 ${L('Travel mode — play continuously', 'பயண முறை — தொடர்ந்து ஒலிக்கும்')}`;
}

function renderMantras(sec) {
  sec.innerHTML = `${subHeader(L('Mantras', 'மந்திரங்கள்'), L('Listen while travelling, at home or at the temple', 'பயணத்திலும், வீட்டிலும், கோவிலிலும் கேட்க'))}
    <button class="btn-gold" id="travelBtn"></button>
    <div class="row2" style="margin-top:10px"><label>${L('Repeat', 'முறை')}<select id="mRepeat">${[1, 3, 11, 21, 108].map((n) => `<option value="${n}"${n === mantraUi.repeat ? ' selected' : ''}>${n} ${L('times', 'முறை')}</option>`).join('')}</select></label>
      <div class="muted small" style="align-self:center">${L('Uses your phone\'s Tamil voice. For the best sound install "Tamil" in Google Text-to-speech.', 'உங்கள் கைப்பேசியின் தமிழ் குரலைப் பயன்படுத்துகிறது. சிறந்த ஒலிக்கு Google Text-to-speech-ல் "Tamil" நிறுவவும்.')}</div></div>
    <div class="member-switch">${MANTRA_TAGS.map((t) => `<button class="mchip${mantraUi.tag === t.id ? ' sel' : ''}" data-mtag="${t.id}">${esc(bi(t))}</button>`).join('')}<button class="mchip${mantraUi.tag === 'all' ? ' sel' : ''}" data-mtag="all">${L('All', 'அனைத்தும்')}</button></div>
    ${MANTRAS.filter((m) => mantraUi.tag === 'all' || m.for.includes(mantraUi.tag)).map((m) => `<div class="card glass mantra-card" data-id="${m.id}">
      <div class="card-title"><span>${m.planet ? `<span style="color:${COLOR[m.planet]}">${GLYPH[m.planet]}</span> ` : '🕉️ '}${esc(bi(m.title))}</span><span class="pill" id="mc-${m.id}"></span></div>
      <p class="mantra-text">${esc(m.text)}</p>${ta() ? '' : `<p class="muted small">${esc(m.translit)}</p>`}<p class="small">${esc(bi(m.meaning))}</p>
      <div class="btn-row"><button class="chip-btn" data-play="${m.id}">▶ ${L('Play', 'ஒலி')}</button><button class="chip-btn" data-stop>⏹ ${L('Stop', 'நிறுத்து')}</button>
        <a class="chip-btn" href="https://www.youtube.com/results?search_query=${encodeURIComponent(`${m.translit} chanting`)}" target="_blank" rel="noopener">🎧 ${L('Recordings', 'பதிவுகள்')}</a></div></div>`).join('')}`;
  drawMantraState();
  $('#travelBtn').addEventListener('click', () => (mantraUi.travelMode ? stopAll() : travelPlaylist()));
  $('#mRepeat').addEventListener('change', (e) => { mantraUi.repeat = Number(e.target.value); });
  $$('[data-mtag]', sec).forEach((b) => b.addEventListener('click', () => { mantraUi.tag = b.dataset.mtag; renderMantras(sec); }));
  $$('[data-play]', sec).forEach((b) => b.addEventListener('click', () => { stopAll(); playMantra(MANTRAS.find((m) => m.id === b.dataset.play), mantraUi.repeat); }));
  $$('[data-stop]', sec).forEach((b) => b.addEventListener('click', stopAll));
}
registerScreen('mantras', { render: renderMantras, parent: 'home' });

// ================================================================ POOJA STORE
const cart = store.get('kj_cart', {});
let catalog = null;
async function loadCatalog() {
  if (catalog) return catalog;
  catalog = STATIC ? await (await fetch('products.json')).json().then((c) => ({ ...c, categories: c.categories || [...new Set(c.products.map((p) => p.category))].map((id) => ({ id, en: id, ta: id })) }))
    : await api('/api/store/products');
  return catalog;
}
const saveCart = () => store.set('kj_cart', cart);
const inr = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
const UNIT_TA = [[/\bpieces?\b/g, 'எண்'], [/\bset of (\d+)/g, '$1 கொண்ட தொகுப்பு'], [/\bbox of (\d+)/g, '$1 கொண்ட பெட்டி'], [/\bset\b/g, 'தொகுப்பு'], [/\bpair\b/g, 'ஜோடி'],
  [/\blitres?\b/g, 'லிட்டர்'], [/\bkg\b/g, 'கிலோ'], [/\bml\b/g, 'மி.லி'], [/(\d)\s?g\b/g, '$1 கிராம்'], [/\bpacks\b/g, 'பாக்கெட்'], [/bundle \(~(\d+) sticks\)/g, 'கட்டு (~$1 குச்சிகள்)'],
  [/\bkit\b/g, 'தொகுப்பு'], [/\bbooks?\b/g, 'புத்தகம்'], [/\bbeads?\b/g, 'மணி'], [/\bmala\b/g, 'மாலை']];
const unitName = (u) => (ta() ? UNIT_TA.reduce((s, [re, to]) => s.replace(re, to), u || '') : u || '');

async function renderStore(sec, params = {}) {
  sec.innerHTML = `${subHeader(L('Pooja Store', 'பூஜைப் பொருள் கடை'), L('Lamps, ghee, oils, homam kits, navagraha items and books', 'விளக்கு, நெய், எண்ணெய், ஹோம பொருட்கள், நவகிரகப் பொருட்கள், புத்தகங்கள்'))}<div id="stBody">${loader()}</div>`;
  let c;
  try { c = await loadCatalog(); } catch { $('#stBody').innerHTML = `<p class="muted">${L('The store is unavailable right now.', 'கடை தற்போது கிடைக்கவில்லை.')}</p>`; return; }
  const cat = params.category || 'all';
  const list = c.products.filter((p) => cat === 'all' || p.category === cat);
  const count = Object.values(cart).reduce((a, b) => a + b, 0);
  const total = Object.entries(cart).reduce((a, [id, q]) => a + (c.products.find((p) => p.id === id)?.price || 0) * q, 0);
  const open = c.open === true && !STATIC;
  $('#stBody').innerHTML = `${open ? '' : `<div class="card glass coming" role="status"><b>⏸️ ${L('Store not open yet', 'கடை இன்னும் திறக்கப்படவில்லை')}</b><p class="small">${L('These are SAMPLE items to show how the store will look. They are not for sale and nothing can be ordered or charged.', 'இவை கடை எப்படி இருக்கும் என்று காட்டும் மாதிரிப் பொருட்கள் மட்டுமே. விற்பனைக்கு இல்லை; ஆர்டரோ கட்டணமோ இல்லை.')}</p></div>`}
    <div class="member-switch"><button class="mchip${cat === 'all' ? ' sel' : ''}" data-cat="all">${L('All', 'அனைத்தும்')}</button>${c.categories.map((k) => `<button class="mchip${cat === k.id ? ' sel' : ''}" data-cat="${esc(k.id)}">${esc(bi(k))}</button>`).join('')}</div>
    <div class="products">${list.map((p) => `<div class="card glass product"><div class="p-img">${esc(p.image || '🪔')}</div>
      <b>${esc(bi(p.name))}</b><p class="muted small">${esc(bi(p.description))}</p>
      <div class="p-row"><span class="price">${inr(p.price)}</span><span class="muted small">${esc(unitName(p.unit))}</span></div>
      ${open ? `<div class="qty"><button data-dec="${p.id}" aria-label="Remove one">−</button><span>${cart[p.id] || 0}</span><button data-inc="${p.id}" aria-label="Add one">+</button></div>` : `<span class="badge est">${L('Sample', 'மாதிரி')}</span>`}</div>`).join('')}</div>
    ${count && open ? `<div class="cart-bar"><span>🛒 ${count} · <b>${inr(total)}</b></span><button class="btn-gold small-btn" id="checkout">${L('Checkout', 'வாங்கு')}</button></div>` : ''}
    <div id="checkoutBox"></div>
    <div class="btn-row"><button class="chip-btn" data-go="seva">🛕 ${L('Temple seva', 'கோவில் சேவைகள்')}</button><button class="chip-btn" data-go="priests">🧑‍🦳 ${L('Priests', 'புரோகிதர்கள்')}</button></div>`;
  $$('[data-cat]', sec).forEach((b) => b.addEventListener('click', () => renderStore(sec, { category: b.dataset.cat })));
  $$('[data-inc]', sec).forEach((b) => b.addEventListener('click', () => { cart[b.dataset.inc] = Math.min(20, (cart[b.dataset.inc] || 0) + 1); saveCart(); renderStore(sec, { category: cat }); }));
  $$('[data-dec]', sec).forEach((b) => b.addEventListener('click', () => { const id = b.dataset.dec; if (cart[id]) cart[id] -= 1; if (!cart[id]) delete cart[id]; saveCart(); renderStore(sec, { category: cat }); }));
  $('#checkout')?.addEventListener('click', () => checkoutForm(sec));
}

function checkoutForm(sec) {
  const box = $('#checkoutBox');
  if (STATIC) { box.innerHTML = needsServerCard(L('Secure checkout with UPI, cards and net banking.', 'UPI, கார்டு, நெட் பேங்கிங் மூலம் பாதுகாப்பான கட்டணம்.')); box.scrollIntoView({ behavior: 'smooth' }); return; }
  if (!state.user) { toast(L('Please sign in to place an order', 'ஆர்டர் செய்ய உள்நுழையவும்')); go('login'); return; }
  const a = store.get('kj_address', {});
  box.innerHTML = `<form class="card glass" id="addrForm"><div class="card-title">📦 ${L('Delivery address', 'விநியோக முகவரி')}</div>
    <label>${L('Name', 'பெயர்')}<input name="name" required value="${esc(a.name || state.user.name || '')}"></label>
    <label>${L('Mobile', 'மொபைல்')}<input name="phone" required inputmode="tel" value="${esc(a.phone || state.user.phone || '')}"></label>
    <label>${L('Address', 'முகவரி')}<input name="line1" required value="${esc(a.line1 || '')}"></label>
    <div class="row3"><label>${L('City', 'நகரம்')}<input name="city" required value="${esc(a.city || '')}"></label><label>${L('PIN code', 'அஞ்சல் குறியீடு')}<input name="pincode" required inputmode="numeric" maxlength="6" value="${esc(a.pincode || '')}"></label><label>${L('State', 'மாநிலம்')}<input name="state" required value="${esc(a.state || 'Tamil Nadu')}"></label></div>
    <button class="btn-gold">${L('Place order', 'ஆர்டர் செய்')}</button><p class="err" id="ordErr"></p></form>`;
  box.scrollIntoView({ behavior: 'smooth' });
  $('#addrForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const address = Object.fromEntries(['name', 'phone', 'line1', 'city', 'pincode', 'state'].map((k) => [k, f.elements[k].value.trim()]));
    store.set('kj_address', address);
    try {
      const r = await api('/api/store/orders', { method: 'POST', body: { items: Object.entries(cart).map(([id, qty]) => ({ id, qty })), address } });
      if (r.payment?.gateway === 'razorpay') await payWithRazorpay(r);
      else box.innerHTML = `<div class="card glass"><b>✅ ${L('Order received', 'ஆர்டர் பெறப்பட்டது')} · ${inr(r.order.total)}</b><p class="small">${L('Online payment is being set up; our team will contact you to confirm.', 'ஆன்லைன் கட்டணம் அமைக்கப்படுகிறது; உறுதிப்படுத்த எங்கள் குழு தொடர்பு கொள்ளும்.')}</p></div>`;
      for (const k of Object.keys(cart)) delete cart[k];
      saveCart();
    } catch (err) { $('#ordErr').textContent = err.message; }
  });
}

function loadScript(src) {
  return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.append(s); });
}
async function payWithRazorpay({ order, payment }) {
  await loadScript('https://checkout.razorpay.com/v1/checkout.js');
  return new Promise((resolve) => {
    const rzp = new window.Razorpay({
      key: payment.keyId, amount: payment.amount, currency: payment.currency, order_id: payment.razorpayOrderId,
      name: BRAND.nameTa, description: `Order ${order.id.slice(0, 8)}`,
      theme: { color: '#f5b83d' },
      handler: async (resp) => {
        try { await api(`/api/store/orders/${order.id}/verify`, { method: 'POST', body: resp }); toast(L('Payment successful 🙏', 'கட்டணம் வெற்றி 🙏')); } catch (e) { toast(e.message); }
        resolve();
      },
      modal: { ondismiss: resolve },
    });
    rzp.open();
  });
}
registerScreen('store', { render: renderStore, parent: 'home' });

// ================================================================ SEVA (temple & charity services) and PRIESTS (புரோகிதர்கள்) — separate screens
const SEVA_QUICK = [
  ['temple_booking', '🛕', 'Temple Archanai & Special Darshan', 'கோவில் அர்ச்சனை & சிறப்பு தரிசனம்'],
  ['annadhanam', '🍛', 'Annadhanam', 'அன்னதானம்'],
  ['gomatha_pooja', '🐄', 'Gomatha Pooja', 'கோமாதா பூஜை'],
  ['kubera_pooja', '💰', 'Kubera Lakshmi Pooja', 'குபேர லட்சுமி பூஜை'],
  ['parigaram_pooja', '🪔', 'Parigaram Pooja at temple', 'கோவிலில் பரிகார பூஜை'],
  ['kumbabhishekam', '🏛️', 'Kumbabhishekam Seva', 'கும்பாபிஷேக சேவை'],
];
const PRIEST_QUICK = [
  ['homam', '🔥', 'Homam', 'ஹோமம்'],
  ['ayush_homam', '🌿', 'Ayush Homam', 'ஆயுஷ் ஹோமம்'],
  ['graha_pravesam', '🏠', 'Graha Pravesam', 'கிரகப் பிரவேசம்'],
  ['vasthu_shanti', '📐', 'Vasthu Shanti', 'வாஸ்து சாந்தி'],
  ['navagraha_shanti', '🪐', 'Navagraha Shanti', 'நவகிரக சாந்தி'],
  ['satyanarayana_pooja', '🌼', 'Satyanarayana Pooja', 'சத்யநாராயண பூஜை'],
  ['marriage', '💐', 'Wedding', 'திருமணம்'],
  ['seemantham', '🤰', 'Seemantham', 'சீமந்தம்'],
  ['namakaranam', '👶', 'Naming Ceremony', 'நாமகரணம்'],
  ['sraddham', '🙏', 'Thivasam', 'திவசம்'],
  ['tharpanam', '💧', 'Tharpanam', 'தர்ப்பணம்'],
];

async function renderSeva(sec, params = {}, mode = 'seva') {
  const priests = mode === 'priests';
  const list = priests ? PRIEST_QUICK : SEVA_QUICK;
  const pick = params.type === 'temple_booking' ? 'temple_booking' : params.service || null;
  const rerender = (p) => renderSeva(sec, p, mode);
  sec.innerHTML = `${priests
    ? subHeader(L('Priests', 'புரோகிதர்கள்'), L('Verified Iyers / Vadhyars at your home — homam, graha pravesam, wedding, thivasam and more', 'சரிபார்க்கப்பட்ட ஐயர் / வாத்தியார் உங்கள் இல்லத்திற்கு — ஹோமம், கிரகப் பிரவேசம், திருமணம், திவசம்'))
    : subHeader(L('Seva', 'சேவைகள்'), L('Temple archanai, annadhanam, gomatha and kubera pooja — done for you by trusted partners', 'கோவில் அர்ச்சனை, அன்னதானம், கோமாதா, குபேர பூஜை — நம்பகமான கூட்டாளிகள் மூலம்'))}
    <div class="tiles">${list.map(([id, icon, en, tx]) => `<button class="tile${pick === id ? ' sel-tile' : ''}" data-seva="${id}"><span class="ti-icon">${icon}</span><span>${esc(L(en, tx))}</span></button>`).join('')}</div>
    <div class="btn-row">${priests ? `<button class="chip-btn" data-go="seva">🛕 ${L('Temple seva', 'கோவில் சேவைகள்')}</button>` : `<button class="chip-btn" data-go="priests">🧑‍🦳 ${L('Book a priest', 'புரோகிதர் முன்பதிவு')}</button>`}<button class="chip-btn" data-go="packages">🧳 ${L('Yatra packages', 'யாத்திரை')}</button><button class="chip-btn" data-go="muhurtham">🗓️ ${L('Good date', 'நல்ல நாள்')}</button></div>
    <div id="sevaForm"></div><div id="myReq"></div>
    ${STATIC || !priests ? '' : `<div class="card glass"><div class="card-title">🧑‍🦳 ${L('Are you a priest (Iyer / Vadhyar)?', 'நீங்கள் புரோகிதரா (ஐயர் / வாத்தியார்)?')}</div><p class="small">${L('Register to receive bookings. Profiles are verified before they appear.', 'முன்பதிவுகளைப் பெற பதிவு செய்யுங்கள். சரிபார்த்த பின்பே சுயவிவரம் காட்டப்படும்.')}</p><button class="chip-btn" id="regPriest">${L('Register as a priest', 'புரோகிதராகப் பதிவு')}</button><div id="priestForm"></div></div>`}`;
  $$('[data-seva]', sec).forEach((b) => b.addEventListener('click', () => rerender(b.dataset.seva === 'temple_booking' ? { type: 'temple_booking' } : { service: b.dataset.seva })));
  if (STATIC) { $('#sevaForm').innerHTML = needsServerCard(L('Bookings, priest connect and Annadhanam requests are handled by the app\'s server.', 'முன்பதிவு, புரோகிதர் இணைப்பு, அன்னதானக் கோரிக்கைகள் செயலியின் சேவையகம் மூலம் கையாளப்படும்.')); return; }
  $('#regPriest')?.addEventListener('click', () => priestForm());
  if (pick) sevaRequestForm(pick, params);
  if (state.user) {
    try {
      const { requests } = await api('/api/requests');
      if (requests.length) $('#myReq').innerHTML = `<div class="card glass"><div class="card-title">📋 ${L('My requests', 'என் கோரிக்கைகள்')}</div>${requests.map((r) => `<div class="factor"><span>${esc(r.service || r.type)} · ${fmtIsoDate(r.date)}${r.templeId ? ` · ${esc(bi(TEMPLES.find((t) => t.id === r.templeId)?.name) || '')}` : ''}</span><b class="zero">${esc(r.status)}</b></div>`).join('')}</div>`;
    } catch { /* ignore */ }
  }
}

async function sevaRequestForm(pick, params) {
  const type = pick === 'annadhanam' ? 'annadhanam' : pick === 'temple_booking' ? 'temple_booking' : 'service';
  let priests = [];
  if (type === 'service') { try { priests = (await api(`/api/priests?service=${encodeURIComponent(pick)}`)).priests; } catch { /* none */ } }
  const near = templesNear(state.loc.lat, state.loc.lon);
  $('#sevaForm').innerHTML = `<form class="card glass" id="reqForm">
    <div class="card-title">${type === 'annadhanam' ? `🍛 ${L('Sponsor Annadhanam', 'அன்னதானம் வழங்க')}` : type === 'temple_booking' ? `🛕 ${L('Archanai / special darshan pre-booking', 'அர்ச்சனை / சிறப்பு தரிசன முன்பதிவு')}` : `🔥 ${L('Book a priest', 'புரோகிதர் முன்பதிவு')}`}</div>
    ${type !== 'service' ? `<label>${L('Temple', 'கோவில்')}<select name="templeId">${near.map((t) => `<option value="${t.id}"${t.id === params.templeId ? ' selected' : ''}>${esc(bi(t.name))} (~${Math.round(t.roadKm)} km)</option>`).join('')}</select></label>` : ''}
    ${type === 'service' && priests.length ? `<label>${L('Priest (optional)', 'புரோகிதர் (விருப்பம்)')}<select name="priestId"><option value="">${L('Any available priest', 'கிடைக்கும் எவரும்')}</option>${priests.map((p) => `<option value="${esc(p.id)}">${esc(p.name)} · ${esc(p.city)} · ${p.experience_years} ${L('yrs', 'ஆண்டு')}</option>`).join('')}</select></label>` : ''}
    ${type === 'service' && !priests.length ? `<p class="muted small">${L('Verified priests are being onboarded in your area. Send the request and our team will connect you.', 'உங்கள் பகுதியில் சரிபார்க்கப்பட்ட புரோகிதர்கள் இணைக்கப்படுகின்றனர். கோரிக்கையை அனுப்புங்கள், எங்கள் குழு தொடர்பு கொள்ளும்.')}</p>` : ''}
    <div class="row2"><label>${L('Date', 'தேதி')}<input type="date" name="date" required min="${todayIso()}"></label><label>${L('Time', 'நேரம்')}<input type="time" name="time"></label></div>
    ${type === 'annadhanam' ? `<label>${L('Number of meals', 'உணவு எண்ணிக்கை')}<input type="number" name="meals" min="1" max="10000" value="50" required></label>` : ''}
    <label>${L('City', 'நகரம்')}<input name="city" required value="${esc(placeName(state.loc.name))}"></label>
    <label>${L('Contact mobile', 'தொடர்பு மொபைல்')}<input name="contactPhone" required inputmode="tel" value="${esc(state.user?.phone || '')}"></label>
    <label>${L('Notes', 'குறிப்பு')}<textarea name="notes" maxlength="500" rows="2" placeholder="${esc(L('Names for sankalpam, nakshatram, special requests…', 'சங்கல்பப் பெயர்கள், நட்சத்திரம், சிறப்புக் கோரிக்கைகள்…'))}"></textarea></label>
    <button class="btn-gold">${L('Send request', 'கோரிக்கை அனுப்பு')}</button><p class="err" id="reqErr"></p>
    ${type !== 'service' ? `<p class="muted small">${L('For direct donations and official e-services use the HR&CE portal:', 'நேரடி நன்கொடை, அதிகாரப்பூர்வ இ-சேவைகளுக்கு அறநிலையத் துறை தளம்:')} <a href="https://hrce.tn.gov.in/" target="_blank" rel="noopener">hrce.tn.gov.in</a></p>` : ''}
  </form>`;
  $('#sevaForm').scrollIntoView({ behavior: 'smooth', block: 'start' });
  $('#reqForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!state.user) { toast(L('Please sign in to send a request', 'கோரிக்கை அனுப்ப உள்நுழையவும்')); go('login'); return; }
    const f = e.target;
    const val = (k) => f.elements[k]?.value?.trim() || undefined;
    const body = { type, service: type === 'service' ? pick : undefined, priestId: val('priestId'), templeId: val('templeId'), date: val('date'), time: val('time'), city: val('city'), contactPhone: val('contactPhone'), notes: val('notes'), meals: f.elements.meals ? Number(f.elements.meals.value) : undefined };
    try {
      const { request } = await api('/api/requests', { method: 'POST', body });
      $('#sevaForm').innerHTML = `<div class="card glass"><b>🙏 ${L('Request sent', 'கோரிக்கை அனுப்பப்பட்டது')}</b><p class="small">${L('Our team will confirm shortly.', 'எங்கள் குழு விரைவில் உறுதிப்படுத்தும்.')}${request.amount ? ` ${L('Indicative amount', 'தோராயத் தொகை')}: ${inr(request.amount)}` : ''}</p></div>`;
    } catch (err) { $('#reqErr').textContent = err.message; }
  });
}

async function priestForm() {
  if (!state.user) { toast(L('Please sign in first', 'முதலில் உள்நுழையவும்')); go('login'); return; }
  let services = [];
  try { services = await api('/api/services'); } catch { /* ignore */ }
  $('#priestForm').innerHTML = `<form id="pForm"><label>${L('Name', 'பெயர்')}<input name="name" required></label>
    <div class="row2"><label>${L('Mobile', 'மொபைல்')}<input name="phone" required inputmode="tel"></label><label>${L('City', 'நகரம்')}<input name="city" required></label></div>
    <div class="row2"><label>${L('Languages', 'மொழிகள்')}<input name="languages" value="Tamil, Sanskrit"></label><label>${L('Experience (years)', 'அனுபவம் (ஆண்டு)')}<input type="number" name="exp" min="0" max="80" value="5"></label></div>
    <div class="mini-label">${L('Services', 'சேவைகள்')}</div><div class="member-switch wrap">${services.map((s) => `<label class="mchip"><input type="checkbox" value="${s.id}"> ${esc(bi(s))}</label>`).join('')}</div>
    <label>${L('About you', 'உங்களைப் பற்றி')}<textarea name="about" maxlength="1000" rows="2"></textarea></label>
    <button class="btn-gold">${L('Submit for verification', 'சரிபார்ப்புக்கு அனுப்பு')}</button><p class="err" id="pErr"></p></form>`;
  $('#pForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    try {
      await api('/api/priests/register', { method: 'POST', body: {
        name: f.elements.name.value.trim(), phone: f.elements.phone.value.trim(), city: f.elements.city.value.trim(),
        languages: f.elements.languages.value.split(',').map((x) => x.trim()).filter(Boolean), experience_years: Number(f.elements.exp.value),
        services: $$('#pForm .member-switch input:checked').map((i) => i.value), about: f.elements.about.value.trim(),
      } });
      $('#priestForm').innerHTML = `<p class="tag good block">${L('Submitted — we will verify and activate your profile.', 'சமர்ப்பிக்கப்பட்டது — சரிபார்த்து செயல்படுத்துவோம்.')}</p>`;
    } catch (err) { $('#pErr').textContent = err.message; }
  });
}
registerScreen('seva', { render: (sec, p) => renderSeva(sec, p, 'seva'), parent: 'home', needsLoc: true });
registerScreen('priests', { render: (sec, p) => renderSeva(sec, p, 'priests'), parent: 'home', needsLoc: true });

// ================================================================ REMINDERS (morning alarm + parigaram trips)
const reminders = store.get('kj_reminders', { morningTime: '05:30', trips: [], pushEndpoint: null });
// General reminders are written by remind.js; keep them when this screen saves its own settings and trips.
const saveReminders = () => {
  const cur = store.get('kj_reminders', { trips: [] });
  reminders.trips = [...reminders.trips.filter((t) => t.kind !== 'reminder'), ...(cur.trips || []).filter((t) => t.kind === 'reminder')];
  store.set('kj_reminders', reminders);
};
const reloadReminders = () => { reminders.trips = store.get('kj_reminders', reminders).trips || []; };

function icsFor(events) {
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = (d) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Thunai//TA', 'CALSCALE:GREGORIAN'];
  for (const ev of events) {
    lines.push('BEGIN:VEVENT', `UID:${ev.uid}@kaippesi`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(ev.start)}`, `DTEND:${stamp(new Date(ev.start.getTime() + (ev.minutes || 30) * 60000))}`,
      `SUMMARY:${ev.title.replace(/[,;]/g, ' ')}`, ev.rrule ? `RRULE:${ev.rrule}` : '', ev.location ? `LOCATION:${ev.location.replace(/[,;]/g, ' ')}` : '',
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${ev.title.replace(/[,;]/g, ' ')}`, `TRIGGER:${ev.alarm || '-PT0M'}`, 'END:VALARM', 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.filter(Boolean).join('\r\n');
}
async function saveIcs(filename, text) {
  if (STATIC && window.claude?.use) {
    const dl = await window.claude.use('downloads').catch(() => null);
    if (dl) { try { await dl.save({ filename, data: text }); return; } catch { /* declined */ } }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/calendar' }));
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
const localToUtc = (date, time) => { const [y, m, d] = date.split('-').map(Number); const [h, mi] = time.split(':').map(Number); return new Date(Date.UTC(y, m - 1, d, h, mi) - state.loc.tz * 3600000); };

function urlB64ToUint8(b64) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}
async function syncPush() {
  if (STATIC || !('serviceWorker' in navigator) || !('PushManager' in window)) return false;
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') { toast(L('Please allow notifications for the alarm', 'அலாரத்திற்கு அறிவிப்பு அனுமதி தரவும்')); return false; }
  const reg = await navigator.serviceWorker.ready;
  const { publicKey } = await api('/api/push/key');
  const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8(publicKey) });
  const m = activeMember();
  await api('/api/push/subscribe', { method: 'POST', body: { subscription: sub.toJSON(), prefs: {
    morningTime: reminders.morningTime || null, tz: state.loc.tz, lat: state.loc.lat, lon: state.loc.lon, place: state.loc.name, lang: state.lang, name: m ? displayName(m) : '',
    trips: (reloadReminders(), reminders.trips).filter((t) => t.date >= todayIso()).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).slice(0, 60).map((t) => ({ id: t.id, date: t.date, time: t.time, title: t.title, place: t.place, kind: t.kind || 'trip' })),
  } } });
  reminders.pushEndpoint = sub.endpoint;
  saveReminders();
  return true;
}

function renderReminders(sec, params = {}) {
  reloadReminders();
  const pushOk = !STATIC && 'PushManager' in window;
  sec.innerHTML = `${subHeader(L('Alarm & Reminders', 'அலாரம் & நினைவூட்டல்'), L('Morning panchangam alarm and parigaram trip reminders', 'காலை பஞ்சாங்க அலாரம், பரிகாரப் பயண நினைவூட்டல்'))}
    <div class="card glass"><div class="card-title">🌅 ${L('Morning alarm', 'காலை அலாரம்')}</div>
      <p class="small">${L('Every morning: Tamil date, star, Rahu Kalam and festivals — and your trips for the day.', 'ஒவ்வொரு காலையும்: தமிழ் தேதி, நட்சத்திரம், ராகு காலம், பண்டிகை — அன்றைய பயணங்களுடன்.')}</p>
      <label>${L('Time', 'நேரம்')}<input type="time" id="mTime" value="${esc(reminders.morningTime || '05:30')}"></label>
      <div class="btn-row">${pushOk ? `<button class="btn-gold small-btn" id="pushOn">🔔 ${reminders.pushEndpoint ? L('Update alarm', 'அலாரத்தைப் புதுப்பி') : L('Turn on alarm', 'அலாரம் இயக்கு')}</button>` : ''}
        <button class="chip-btn" id="icsDaily">📅 ${L('Add to phone calendar', 'கைப்பேசி நாட்காட்டியில் சேர்')}</button>
        ${reminders.pushEndpoint && pushOk ? `<button class="chip-btn" id="pushTest">${L('Test', 'சோதனை')}</button>` : ''}</div>
      ${pushOk ? '' : `<p class="muted small">${L('Tip: "Add to phone calendar" sets a daily alarm in your phone\'s own calendar.', 'குறிப்பு: "கைப்பேசி நாட்காட்டியில் சேர்" உங்கள் கைப்பேசியிலேயே தினசரி அலாரம் அமைக்கும்.')}</p>`}
    </div>
    <form class="card glass" id="tripForm"><div class="card-title">🛕 ${L('Plan a parigaram trip', 'பரிகாரப் பயணம் திட்டமிடு')}</div>
      <label>${L('Temple / purpose', 'கோவில் / நோக்கம்')}<input name="title" required value="${esc(params.tripTitle || '')}"></label>
      <div class="row2"><label>${L('Date', 'தேதி')}<input type="date" name="date" required min="${todayIso()}"></label><label>${L('Leave at', 'புறப்படும் நேரம்')}<input type="time" name="time" required value="06:00"></label></div>
      <input type="hidden" name="place" value="${esc(params.tripPlace || '')}">
      <button class="btn-gold">${L('Save trip', 'பயணத்தைச் சேமி')}</button>
      <p class="muted small">${L('Tip: use the Muhurtham finder (Travel) to choose a good day.', 'குறிப்பு: நல்ல நாளைத் தேர்வு செய்ய முகூர்த்தம் தேடலில் "பயணம்" பயன்படுத்தவும்.')}</p></form>
    <div id="remList"></div><div id="tripList"></div>
    <div class="card glass"><p class="small">🔔 ${L('Tip: tap the bell on any Panchangam time, viratha day, muhurtham, star birthday, thivasam, peyarchi or road-map window to set a reminder.', 'குறிப்பு: பஞ்சாங்க நேரம், விரத நாள், முகூர்த்தம், நட்சத்திரப் பிறந்தநாள், திவசம், பெயர்ச்சி, வாழ்க்கை வரைபடம் — எங்கும் மணி அடையாளத்தைத் தொட்டு நினைவூட்டல் அமைக்கலாம்.')}</p></div>`;
  const drawRems = () => {
    const list = upcomingReminders().filter((t) => t.kind === 'reminder');
    $('#remList').innerHTML = list.length ? `<div class="card glass"><div class="card-title">🔔 ${L('My reminders', 'என் நினைவூட்டல்கள்')}<span class="pill">${list.length}</span></div>${list.map((t) => `<div class="factor"><span>${esc(t.title)}<br><small class="muted">${fmtIsoDate(t.date)} · ${fmtTime(t.alarm, state.loc.tz)}</small></span><button class="link-btn" data-rdel="${t.id}" aria-label="${esc(L('Delete', 'நீக்கு'))}">✕</button></div>`).join('')}</div>` : '';
    $$('[data-rdel]', sec).forEach((b) => b.addEventListener('click', () => { deleteReminder(b.dataset.rdel); drawRems(); }));
  };
  drawRems();
  const drawTrips = () => {
    const upcoming = reminders.trips.filter((t) => t.kind !== 'reminder' && t.date >= todayIso()).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    $('#tripList').innerHTML = upcoming.length ? `<div class="card glass"><div class="card-title">🧳 ${L('Upcoming trips', 'வரும் பயணங்கள்')}</div>${upcoming.map((t) => `<div class="factor"><span>🛕 ${esc(t.title)}<br><small class="muted">${fmtIsoDate(t.date)} · ${esc(t.time)}${t.place ? ` · ${esc(placeName(t.place))}` : ''}</small></span>
      <span class="btn-col"><button class="link-btn" data-ics="${t.id}">📅</button><button class="link-btn" data-del="${t.id}">✕</button></span></div>`).join('')}</div>` : '';
    $$('[data-ics]', sec).forEach((b) => b.addEventListener('click', () => { const t = reminders.trips.find((x) => x.id === b.dataset.ics); saveIcs(`trip-${t.date}.ics`, icsFor([{ uid: t.id, title: `🛕 ${t.title}`, start: localToUtc(t.date, t.time), location: t.place, alarm: '-PT60M', minutes: 120 }])); }));
    $$('[data-del]', sec).forEach((b) => b.addEventListener('click', () => { reminders.trips = reminders.trips.filter((x) => x.id !== b.dataset.del); saveReminders(); drawTrips(); if (reminders.pushEndpoint) syncPush().catch(() => {}); }));
  };
  drawTrips();
  $('#mTime').addEventListener('change', (e) => { reminders.morningTime = e.target.value; saveReminders(); });
  $('#pushOn')?.addEventListener('click', async () => { try { if (await syncPush()) { toast(L('Alarm is on 🔔', 'அலாரம் இயக்கப்பட்டது 🔔')); renderReminders(sec); } } catch (e) { toast(e.message); } });
  $('#pushTest')?.addEventListener('click', () => api('/api/push/test', { method: 'POST', body: { endpoint: reminders.pushEndpoint } }).then(() => toast(L('Test sent', 'சோதனை அனுப்பப்பட்டது'))).catch((e) => toast(e.message)));
  $('#icsDaily').addEventListener('click', () => {
    const start = localToUtc(new Date(Date.now() + 86400000 + state.loc.tz * 3600000).toISOString().slice(0, 10), reminders.morningTime || '05:30');
    saveIcs('thunai-morning.ics', icsFor([{ uid: 'morning', title: L('Thunai — check today\'s panchangam', 'துணை — இன்றைய பஞ்சாங்கம் பார்க்கவும்'), start, rrule: 'FREQ=DAILY', minutes: 10 }]));
  });
  $('#tripForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target;
    reminders.trips.push({ id: Math.random().toString(36).slice(2, 10), title: f.elements.title.value.trim(), date: f.elements.date.value, time: f.elements.time.value, place: f.elements.place.value });
    saveReminders();
    toast(L('Trip saved', 'பயணம் சேமிக்கப்பட்டது'));
    if (reminders.pushEndpoint) syncPush().catch(() => {});
    f.reset();
    drawTrips();
  });
}
registerScreen('reminders', { render: renderReminders, parent: 'home', needsLoc: true });

// ================================================================ FAMILY RELATIONS TODAY
export function relationsList(limit) {
  refreshSnap();
  const people = state.family.filter((m) => m.relation !== 'organization');
  if (people.length < 2) return null;
  const charts = Object.fromEntries(people.map((m) => [m.id, { ...chartOf(m), name: displayName(m) }]));
  const all = familyRelations(state.family, charts, state.snap);
  return limit ? all.slice(0, limit) : all;
}
export function relationRow(r, detail = false) {
  const tag = r.level === 'harmony' ? 'good' : r.level === 'careful' ? 'warn' : 'bad';
  const label = r.level === 'harmony' ? L('Harmony', 'இணக்கம்') : r.level === 'careful' ? L('Be gentle', 'மென்மை தேவை') : L('Avoid arguments', 'வாக்குவாதம் தவிர்');
  return `<div class="rel-row"><div style="flex:1"><b>${esc(bi(r.label))}</b><div class="muted small">${esc(displayName(r.a))} ↔ ${esc(displayName(r.b))}</div>
    ${detail ? `<p class="small">${esc(bi(r.advice))}</p><details><summary>${L('Why?', 'ஏன்?')}</summary>${r.reasons.map((x) => `<div class="small">${x.pts > 0 ? '▲' : '▼'} ${esc(L(x.en, x.ta))}</div>`).join('')}</details>` : ''}</div>
    <span class="tag ${tag}">${label}</span></div>`;
}
function renderRelations(sec) {
  const list = relationsList();
  sec.innerHTML = `${subHeader(L('Family relations today', 'இன்று குடும்ப உறவு நிலை'), L('Who should be extra gentle with whom today', 'இன்று யார் யாரிடம் கூடுதல் மென்மையாக இருக்க வேண்டும்'))}
    ${list ? `<div class="card glass">${list.map((r) => relationRow(r, true)).join('')}</div>` : `<div class="card glass cta-card" data-go="family" data-param='{"add":true}'>${L('Add at least two family members (with relation) to see this', 'இதைப் பார்க்க உறவுடன் குறைந்தது இருவரைச் சேர்க்கவும்')} ›</div>`}
    <p class="muted small center">${L('Based on Moon signs, today\'s Moon and Mars, and Tara Bala. A loving word changes everything.', 'சந்திர ராசி, இன்றைய சந்திரன், செவ்வாய், தாரா பலம் அடிப்படையில். அன்பான ஒரு வார்த்தை எல்லாவற்றையும் மாற்றும்.')}</p>`;
}
registerScreen('relations', { render: renderRelations, parent: 'home', needsLoc: true });

// ================================================================ FULL JATHAGA ANALYSIS
function renderAnalysis(sec) {
  const m = activeMember();
  const c = chartOf(m);
  sec.innerHTML = `${subHeader(L('Full Jathaga Analysis', 'முழு ஜாதக ஆய்வு'), esc(displayName(m)), 'chart')}<div id="anBody">${loader(L('Studying every house and planet…', 'ஒவ்வொரு பாவமும் கிரகமும் ஆராயப்படுகிறது…'))}</div>`;
  setTimeout(() => {
    if (state.view !== 'analysis') return;
    const a = fullAnalysis(c);
    const tz = state.loc.tz;
    const bar = (s, cls) => `<span class="gb-bar"><i class="${cls}" style="width:${s}%"></i></span>`;
    const lvl = (s) => (s >= 66 ? 'strong' : s >= 48 ? 'average' : 'weak');
    $('#anBody').innerHTML = `
      <div class="card glass"><div class="card-title">🌟 ${L('Life areas', 'வாழ்க்கைத் துறைகள்')}</div>
        ${a.areas.filter((x) => x.id !== 'health').map((x) => `<div class="gb-row static"><span class="gb-name">${esc(L(x.en, x.ta))}</span>${bar(x.score, lvl(x.score))}<span class="tag ${x.level === 'strong' ? 'good' : x.level === 'steady' ? 'warn' : 'bad'}">${x.level === 'strong' ? L('Strong', 'பலம்') : x.level === 'steady' ? L('Steady', 'நிலையானது') : L('Needs care', 'கவனம் தேவை')}</span></div>`).join('')}</div>
      <div class="card glass"><div class="card-title">✨ ${L('Yogas in your chart', 'உங்கள் ஜாதக யோகங்கள்')}</div>
        ${a.yogas.length ? a.yogas.map((y) => `<div class="pari-row"><span class="pg">${y.kind === 'good' ? '🌟' : '🌙'}</span><div><b>${esc(bi(y.name))}</b><p>${esc(bi(y.desc))}</p></div></div>`).join('') : `<p class="small">${L('Your strength comes from steady planetary balance rather than a single yoga.', 'ஒரு யோகத்தை விட கிரகங்களின் சமநிலையே உங்கள் பலம்.')}</p>`}</div>
      <div class="card glass"><div class="card-title">🪐 ${L('Current transits (Gochara)', 'தற்போதைய கோசாரம்')}</div>
        ${a.transit.status.map((s) => `<div class="pari-row"><span class="pg">${s.kind === 'good' ? '✅' : s.kind === 'care' ? '🪔' : '🌙'}</span><div><b>${esc(L(s.en, s.ta))}</b><p>${esc(L(s.adviceEn, s.adviceTa))}</p></div></div>`).join('')}
        <p class="muted small">♄ ${L('Saturn in', 'சனி')} ${esc(rasiName(a.transit.saturnSign))} ${L('until', 'வரை')} ${fmtIsoDate(new Date(a.transit.satSpan.to.getTime() + tz * 3600000).toISOString().slice(0, 10))} · ♃ ${L('Jupiter in', 'குரு')} ${esc(rasiName(a.transit.jupiterSign))} ${L('until', 'வரை')} ${fmtIsoDate(new Date(a.transit.jupSpan.to.getTime() + tz * 3600000).toISOString().slice(0, 10))}</p></div>
      ${a.dasaOutlook ? `<div class="card glass"><div class="card-title">⏳ ${L('Dasa outlook', 'தசா பலன்')}</div><p>${esc(L(a.dasaOutlook.en, a.dasaOutlook.ta))}</p></div>` : ''}
      <div class="card glass"><div class="card-title">🏛️ ${L('The 12 houses (Bhavas)', '12 பாவங்கள்')}</div>
        ${a.bhavas.map((b) => `<details class="bhava"><summary><span class="bh-n">${b.house}</span> <span class="bh-a">${esc(bi(b.area))}</span>${bar(b.score, lvl(b.score))}</summary>
          <div class="small"><p>${L('Sign', 'ராசி')}: ${esc(rasiName(b.rasi))} · ${L('Lord', 'அதிபதி')}: ${GLYPH[b.lord]} ${esc(planetName(b.lord))} → ${L('house', 'பாவம்')} ${b.lordHouse}</p>
          ${b.occupants.length ? `<p>${L('Planets here', 'இங்குள்ள கிரகங்கள்')}: ${b.occupants.map((o) => `${GLYPH[o]} ${esc(planetName(o))}`).join(', ')}</p>` : ''}
          ${b.aspects.length ? `<p>${L('Aspected by', 'பார்வை')}: ${b.aspects.map((o) => esc(planetName(o))).join(', ')}</p>` : ''}
          ${b.notes.map((n) => `<p>• ${esc(bi(n))}</p>`).join('')}</div></details>`).join('')}</div>
      <button class="btn-gold" id="anRead">📜 ${L('Detailed explanation', 'விரிவான விளக்கம்')}</button>
      <div class="card glass" id="anAi" hidden><div class="card-title"><span>📜 ${L('Your reading', 'உங்கள் பலன்')}</span><button class="link-btn" id="anSpeak" aria-label="Read aloud">🔊</button></div><div class="reply" id="anText"></div></div>`;
    $('#anRead').addEventListener('click', async () => {
      $('#anAi').hidden = false;
      const out = $('#anText');
      out.textContent = L('Preparing your reading…', 'உங்கள் பலன் தயாராகிறது…');
      out.classList.add('typing');
      const context = {
        person: { name: m.name, birth: `${m.date} ${m.time} ${m.place}`, lagna: c.lagna.rasiName, rasi: c.janmaRasi.name, star: `${c.janmaNakshatra.name} pada ${c.janmaNakshatra.pada}` },
        lifeAreas: a.areas.map((x) => `${x.en}: ${x.level} (${x.score})`), yogas: a.yogas.map((y) => y.name.en),
        transits: a.transit.status.map((s) => s.en), dasa: a.dasaOutlook?.en,
        houses: a.bhavas.map((b) => `H${b.house} ${b.rasiName.en}, lord ${b.lord} in H${b.lordHouse}${b.occupants.length ? `, has ${b.occupants.join('/')}` : ''} (${b.score})`),
        planetStrength: a.strength.map((g) => `${g.planet}: ${g.level}`),
      };
      const fallback = [a.dasaOutlook ? L(a.dasaOutlook.en, a.dasaOutlook.ta) : '', ...a.yogas.map((y) => `🌟 ${bi(y.name)} — ${bi(y.desc)}`), ...a.transit.status.map((s) => `🪐 ${L(s.en, s.ta)} — ${L(s.adviceEn, s.adviceTa)}`)].filter(Boolean).join('\n');
      await aiTask({ task: 'chat', context, messages: [{ role: 'user', content: 'Write my complete life reading from this analysis: personality, career, wealth, marriage and family, health, and the coming years by dasa and transits. Be specific to the data, warm and positive, and end with three simple parigarams. About 350 words.' }], fallbackText: fallback, onText: (tx) => { out.textContent = tx; } });
      out.classList.remove('typing');
    });
    $('#anSpeak').addEventListener('click', () => speak($('#anText').textContent));
  }, 40);
}
registerScreen('analysis', { render: renderAnalysis, parent: 'chart', needsMember: true });

// ================================================================ YATRA PACKAGES
function renderPackages(sec, params = {}) {
  const loc = state.loc;
  const open = params.id || null;
  sec.innerHTML = `${subHeader(L('Yatra & Parigaram Packages', 'யாத்திரை & பரிகார பேக்கேஜ்கள்'), L('Temples, priest, pooja items, stay and travel — arranged together', 'கோவில், புரோகிதர், பூஜைப் பொருள், தங்குமிடம், பயணம் — ஒன்றாக ஏற்பாடு'))}
    <div class="card glass"><div class="card-title">✅ ${L('Every package includes', 'ஒவ்வொரு பேக்கேஜிலும்')}</div>${PACKAGE_INCLUDES.map((i) => `<div class="small">• ${esc(bi(i))}</div>`).join('')}
      <p class="muted small">${L('Coming from abroad? We arrange airport pickup and plan around your flight dates.', 'வெளிநாட்டிலிருந்து வருகிறீர்களா? விமான நிலைய வரவேற்பும், உங்கள் விமான தேதிக்கு ஏற்ப திட்டமும் செய்வோம்.')}</p></div>
    ${PACKAGES.map((p) => {
    const r = packageRoute(p, loc);
    const first = r.firstTemple;
    return `<details class="card glass pkg"${open === p.id ? ' open' : ''}><summary><span class="ti-icon">${p.icon}</span><div><b>${esc(bi(p.name))}</b><div class="muted small">${p.days} ${L('days', 'நாட்கள்')} · ~${Math.round(r.km)} km ${L('from', 'தொலைவு')} ${esc(placeName(loc.name))}</div></div></summary>
      <p class="small">🎯 ${esc(bi(p.for))}</p>
      ${r.days.map((d, i) => `<div class="pkg-day"><b>${L('Day', 'நாள்')} ${i + 1}</b> · ${d.map((t) => esc(bi(t.name))).join(' → ')}</div>`).join('')}
      <div class="mini-label">🛕 ${L('Every temple — highlights, legend and how to reach', 'ஒவ்வொரு கோவிலும் — சிறப்பு, தல வரலாறு, செல்லும் வழி')}</div>
      ${r.days.flat().map((t) => `<div class="pkg-temple">${t.planet ? `<span style="color:${COLOR[t.planet]}">${GLYPH[t.planet]}</span> ` : '🛕 '}<b>${esc(bi(t.name))}</b> <span class="muted small">· ${esc(bi(t.deity))} · ${esc(placeName(t.town))}</span>${templeDetailHtml(t)}</div>`).join('')}
      ${(ta() ? p.extra.ta : p.extra.en).map((x) => `<div class="small">✨ ${esc(x)}</div>`).join('')}
      <div class="btn-row">
        <a class="chip-btn" href="${r.mapsUrl}" target="_blank" rel="noopener">🗺️ ${L('Route', 'பாதை')}</a>
        <a class="chip-btn" href="https://www.google.com/travel/flights?q=${encodeURIComponent(`flights to ${first.town}`)}" target="_blank" rel="noopener">✈️ ${L('Flights', 'விமானம்')}</a>
        <a class="chip-btn" href="https://www.irctc.co.in/" target="_blank" rel="noopener">🚆 ${L('Trains', 'ரயில்')}</a>
        <a class="chip-btn" href="https://www.google.com/maps/search/hotels+near+${encodeURIComponent(`${first.name.en}, ${first.town}`)}" target="_blank" rel="noopener">🏨 ${L('Hotels', 'தங்குமிடம்')}</a>
        <button class="chip-btn" data-go="muhurtham">🗓️ ${L('Good dates', 'நல்ல நாள்')}</button>
      </div>
      <button class="btn-gold" data-pkg="${p.id}">🙏 ${L('Request this package', 'இந்தப் பேக்கேஜைக் கோரவும்')}</button>
      <div id="pkgForm-${p.id}"></div></details>`;
  }).join('')}`;
  $$('[data-pkg]', sec).forEach((b) => b.addEventListener('click', () => packageForm(b.dataset.pkg)));
}

function packageForm(id) {
  const box = $(`#pkgForm-${id}`);
  if (STATIC) { box.innerHTML = needsServerCard(L('Package requests go to our operations team for a quote within a day.', 'பேக்கேஜ் கோரிக்கைகள் எங்கள் குழுவுக்குச் சென்று ஒரு நாளில் விலை தெரிவிக்கப்படும்.')); return; }
  if (!state.user) { toast(L('Please sign in to request a package', 'பேக்கேஜ் கோர உள்நுழையவும்')); go('login'); return; }
  box.innerHTML = `<form class="pkg-form"><div class="row2"><label>${L('Start date', 'தொடக்கத் தேதி')}<input type="date" name="date" required min="${todayIso()}"></label><label>${L('People', 'நபர்கள்')}<input type="number" name="people" min="1" max="60" value="4" required></label></div>
    <label>${L('Starting city', 'புறப்படும் நகரம்')}<input name="city" required value="${esc(placeName(state.loc.name))}"></label>
    <label>${L('Contact mobile / WhatsApp', 'தொடர்பு மொபைல் / WhatsApp')}<input name="contactPhone" required inputmode="tel" value="${esc(state.user.phone || '')}"></label>
    <label>${L('Notes (flight dates, elders, special poojas)', 'குறிப்பு (விமான தேதி, முதியோர், சிறப்பு பூஜை)')}<textarea name="notes" maxlength="500" rows="2"></textarea></label>
    <button class="btn-gold">${L('Send request', 'கோரிக்கை அனுப்பு')}</button><p class="err"></p></form>`;
  box.querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    try {
      await api('/api/requests', { method: 'POST', body: { type: 'package', packageId: id, date: f.elements.date.value, people: Number(f.elements.people.value), city: f.elements.city.value.trim(), contactPhone: f.elements.contactPhone.value.trim(), notes: f.elements.notes.value.trim() } });
      box.innerHTML = `<p class="tag good block">🙏 ${L('Request sent — we will call you with the full plan and price.', 'கோரிக்கை அனுப்பப்பட்டது — முழுத் திட்டம், விலையுடன் அழைப்போம்.')}</p>`;
    } catch (err) { f.querySelector('.err').textContent = err.message; }
  });
}
registerScreen('packages', { render: renderPackages, parent: 'home', needsLoc: true });

export { NAKSHATRAS, nakName, BHAVAS };
