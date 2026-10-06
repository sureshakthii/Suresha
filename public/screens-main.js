// Main screens: Today (three cards + "More for today"), Live Sky, My Chart (Jathagam) and Prasnam.
import { panchang, planetPositions, buildCharts, RASIS, NAKSHATRAS, PLANETS } from './shared/astro.js';
import { CATEGORIES, evaluatePrasna, verdictTextFor, getCategory, PRACTICAL_QUESTIONS, DEADLINE_FIRST_NOTE } from './shared/prasna.js';
import { buildContext, ruleBasedReply } from './shared/narrator.js';
import { tamilDay } from './shared/tamilcal.js';
import { grahaStrength, dailyParigaram, NAVAGRAHA, STRENGTH_INDEX } from './shared/remedies.js';
import { doshams } from './shared/porutham.js';
import { nameLetters } from './shared/special.js';
import { practicalSafeguards } from './shared/safeguards.js';
import {
  state, $, $$, L, ta, esc, bi, GLYPH, COLOR, planetName, rasiName, nakName, fmtTime, fmtDate, countdown,
  activeMember, chartOf, registerScreen, go, STATIC, sse, toast, speak, saveFamily,
  displayName, copyright, appName,
  yogaName, karanaName,
  placeName, hasLagna, lagnaText, needsTimeText, unstableChip, precisionNote, reportMeta,
  policyContext, serverBirth, rememberSessionFlags, showExtras, LIMITED_NOTICE, STATIC_NOTICE,
} from './core.js';
import { weatherCardHtml, fillHomeWeather, relationsList, relationRow } from './screens-world.js';
import { trialBanner, ratePrompt } from './growth.js';
import { todayColorCard } from './screens-guide.js';
import { reminderCard } from './remind.js';
import { iconChip } from './icons.js';

const TARA = [['Janma', 'ஜன்ம', 'warn'], ['Sampat', 'சம்பத்', 'good'], ['Vipat', 'விபத்', 'bad'], ['Kshema', 'க்ஷேம', 'good'], ['Pratyak', 'பிரத்யக்', 'bad'], ['Sadhana', 'சாதக', 'good'], ['Naidhana', 'நைதன', 'bad'], ['Mitra', 'மித்ர', 'good'], ['Parama Mitra', 'பரம மித்ர', 'good']];

/** Personal day outlook for one family member: Tara Bala, Chandra Bala, Chandrashtamam. */
export function dayOutlook(chart, snap) {
  const tIdx = ((snap.nakshatra.index - chart.janmaNakshatra.index + 27) % 27) % 9;
  const pos = ((snap.moonRasi.index - chart.janmaRasi.index + 12) % 12) + 1;
  const chandra = pos === 8 ? 'bad' : [1, 3, 6, 7, 10, 11].includes(pos) ? 'good' : 'warn';
  const tara = TARA[tIdx];
  const overall = pos === 8 ? 'bad' : tara[2] === 'bad' && chandra !== 'good' ? 'bad' : tara[2] === 'good' && chandra === 'good' ? 'good' : 'warn';
  return { tara, taraKind: tara[2], pos, chandra, chandrashtama: pos === 8, overall };
}

/** Tools reachable from each destination — rendered as tile grids on the hub screens. */
export const HUB_TOOLS = {
  chart: [
    ['analysis', 'Full analysis — houses, yogas, house lords', 'முழு ஆய்வு — பாவங்கள், யோகங்கள், பாவ அதிபதிகள்'],
    ['vargas', 'Divisional charts & Ashtakavarga', 'வர்க்கச் சக்கரங்கள் & அஷ்டகவர்க்கம்'],
    ['guide', 'My Guide — colour, number, Ishta Theivam', 'என் வழிகாட்டி — நிறம், எண், இஷ்ட தெய்வம்'],
    ['life', 'Life questions — traditional periods', 'வாழ்க்கைக் கேள்விகள் — மரபுக் காலங்கள்'],
    ['roadmap', 'Life Road Map', 'வாழ்க்கை வரைபடம்'],
    ['health', 'Wellbeing & traditional context', 'நலம் & மரபுப் பின்னணி'],
    ['peyarchi', 'Guru / Sani / Rahu-Ketu Peyarchi', 'குரு / சனி / ராகு-கேது பெயர்ச்சி'],
    ['numerology', 'Name & number numerology', 'பெயர் & எண் கணிதம்'],
  ],
};
export const toolTiles = (list) => `<div class="tiles">${list.map(([id, en, tx]) => `<button class="tile" data-go="${id}">${iconChip(id, { size: 22, cls: 'ti-icon' })}<span>${esc(L(en, tx))}</span></button>`).join('')}</div>`;

// ================================================================ TODAY
let today = null; // { key, day } cache of tamilDay for the current local date
function todayInfo(loc) {
  const now = new Date();
  const key = `${fmtDate(now, loc.tz)}|${loc.lat}|${loc.lon}`;
  if (!today || today.key !== key) {
    const noon = new Date(Date.UTC(...fmtDate(now, loc.tz).split('-').reverse().map(Number).map((v, i) => (i === 1 ? v - 1 : v)), 12) - loc.tz * 3600000);
    today = { key, day: tamilDay(noon, loc.lat, loc.lon, loc.tz) };
  }
  return today.day;
}
const dayOfYear = () => Math.floor((Date.now() - Date.UTC(new Date().getUTCFullYear(), 0, 0)) / 86400000);

/** One practical safeguard tip for today (rotates daily) from the practical stream — never from astrology. */
function safeguardTip() {
  try {
    const cards = practicalSafeguards({ locale: state.lang });
    const all = cards.flatMap((c) => c.recommendedActions.map((a) => ({ a, c })));
    const pick = all[dayOfYear() % all.length];
    return pick ? `<div class="safe-tip"><span class="mini-label">${esc(bi(pick.c.title))}</span><p class="small">${esc(bi(pick.a))}</p></div>` : '';
  } catch { return ''; }
}

function renderHome(sec) {
  const loc = state.loc;
  const td = todayInfo(loc);
  const snap = state.snap || panchang(new Date(), loc.lat, loc.lon, loc.tz);
  const m = activeMember();
  const fest = td.festivals;
  const now = Date.now();
  const nalla = td.gowri.filter((g) => g.good && g.part === 'day');
  const nextNalla = nalla.find((g) => new Date(g.end).getTime() > now) || nalla[0];
  const inRahu = snap.inRahuKalam;
  const pari = dailyParigaram({ weekday: snap.weekday.index, chart: m && chartOf(m), snapshot: snap })[0];
  sec.innerHTML = `
    <div class="hero today-card" aria-labelledby="todayTitle">
      <div class="hero-orn" aria-hidden="true"></div>
      <div class="hero-top">
        <div>
          <div class="greet" id="todayTitle">🙏 ${L('Vanakkam', 'வணக்கம்')}${m ? `, ${esc(displayName(m))}` : ''}</div>
          <div class="muted small" id="homeLoc">📍 ${esc(placeName(loc.name))}</div>
        </div>
        <div class="clock" id="clock" aria-label="${esc(L('Current time', 'தற்போதைய நேரம்'))}">--:--:--</div>
      </div>
      <div class="mini-label">${L('1 · What is happening today', '1 · இன்று என்ன நடக்கிறது')}</div>
      <div class="tamil-date">
        <div class="td-day">${td.tamil.day}</div>
        <div>
          <div class="td-month">${esc(bi({ en: td.tamil.monthEn, ta: td.tamil.monthTa }))}</div>
          <div class="td-year">${esc(ta() ? `${td.tamil.year.ta} வருடம்` : `${td.tamil.year.en} year`)} · ${esc(bi(td.weekday))}</div>
          <div class="muted small">${fmtIsoDate2(td.date)}</div>
        </div>
      </div>
      <dl class="kv today-kv">
        <dt>${L('Star', 'நட்சத்திரம்')}</dt><dd>${esc(nakName(snap.nakshatra.index))} · ${L('till', 'வரை')} ${fmtTime(snap.nakshatra.endsAt, loc.tz)}</dd>
        <dt>${L('Tithi', 'திதி')}</dt><dd>${esc(ta() ? snap.tithi.ta : snap.tithi.name)} · ${L('till', 'வரை')} ${fmtTime(snap.tithi.endsAt, loc.tz)}</dd>
        <dt>${L('Rahu Kalam', 'ராகு காலம்')}</dt><dd>${fmtTime(td.rahuKalam.start, loc.tz)} – ${fmtTime(td.rahuKalam.end, loc.tz)}${inRahu ? ` <span class="pill">${L('now', 'இப்போது')}</span>` : ''}</dd>
        ${nextNalla ? `<dt>${L('Nalla Neram', 'நல்ல நேரம்')}</dt><dd>${fmtTime(nextNalla.start, loc.tz)} – ${fmtTime(nextNalla.end, loc.tz)}</dd>` : ''}
      </dl>
      <p class="muted small">${L('Rahu Kalam and Nalla Neram are traditional timings — follow real deadlines (doctor, court, bank, travel) first.', 'ராகு காலம், நல்ல நேரம் மரபு நேரங்கள் — உண்மையான காலக்கெடுவை (மருத்துவர், நீதிமன்றம், வங்கி, பயணம்) முதலில் பின்பற்றுங்கள்.')}</p>
    </div>

    <section class="card glass" aria-labelledby="practicalTitle">
      <div class="card-title"><span id="practicalTitle">${L('2 · What you can practically do', '2 · நடைமுறையில் செய்யக்கூடியவை')}</span><button class="link-btn" data-go="safeguards">${L('Safety', 'பாதுகாப்பு')} ›</button></div>
      ${weatherCardHtml().replace('card glass weather-mini', 'weather-mini inner')}
      ${safeguardTip()}
    </section>

    ${pari ? `<section class="card glass" aria-labelledby="practiceTitle">
      <div class="card-title"><span id="practiceTitle">${L('3 · An optional practice', '3 · விருப்ப வழிபாடு')}</span><span class="pill">${L('Optional · free', 'விருப்பம் · இலவசம்')}</span></div>
      <div class="pari-row"><span class="pg" style="color:${COLOR[pari.planet]}" aria-hidden="true">${GLYPH[pari.planet]}</span><div><p>${esc(bi(pari.free))}</p><p class="muted small">${esc(bi(pari.reason))}</p></div></div>
      <button class="link-btn" data-go="parigaram">${L('More practices', 'மேலும் வழிபாடுகள்')} ›</button>
    </section>` : ''}

    <details class="more-today">
      <summary>${L('More for today', 'இன்றைக்கு மேலும்')}</summary>
      ${fest.length || td.muhurthaDay ? `<div class="card glass"><div class="card-title">${L('Festivals & observances', 'பண்டிகை & விரதம்')}</div><div class="fest-row">${fest.map((f) => `<span class="fest ${f.kind}">${f.kind === 'festival' ? '🎉' : '🪔'} ${esc(bi(f))}</span>`).join('')}${td.muhurthaDay ? `<span class="fest muhurtham">💐 ${L('Subha Muhurtha day', 'சுப முகூர்த்த நாள்')}</span>` : ''}</div></div>` : ''}
      ${familyCard(snap)}
      ${relationsCard()}
      ${todayColorCard()}
      ${reminderCard()}
      <div class="chips">
        <div class="chip-card"><span class="mini-label">${L('Yoga', 'யோகம்')}</span><b>${esc(yogaName(snap.yoga))}</b><span class="mini-sub">${esc(karanaName(snap))}</span></div>
        <div class="chip-card"><span class="mini-label">${L('Sun', 'சூரியன்')}</span><b>☀ ${fmtTime(td.sunrise, loc.tz)}</b><span class="mini-sub">🌇 ${fmtTime(td.sunset, loc.tz)}</span></div>
      </div>
      <div class="card glass">
        <div class="card-title"><span>${L('Nalla Neram & kalams', 'நல்ல நேரம் & காலங்கள்')}</span><span class="pill">${L('Gowri', 'கௌரி')}</span></div>
        <div class="gowri">${td.gowri.filter((g) => g.part === 'day').map((g) => gowriCell(g, loc)).join('')}</div>
        <div class="kalam">${kalamCell(L('Rahu Kalam', 'ராகு காலம்'), td.rahuKalam, snap.inRahuKalam, loc)}${kalamCell(L('Yamagandam', 'எமகண்டம்'), td.yamagandam, snap.inYamagandam, loc)}${kalamCell(L('Guligai', 'குளிகை'), td.guligai, snap.inGuligai, loc)}</div>
      </div>
      <div class="card glass hora-mini" data-go="live" role="button" tabindex="0" aria-label="${esc(L('Live sky and Horai', 'நேரலை வானம், ஓரை'))}">
        <div class="hora-glyph" style="color:${COLOR[snap.currentHora.lord]}" aria-hidden="true">${GLYPH[snap.currentHora.lord]}</div>
        <div style="flex:1"><div class="mini-label">${L('Current Horai · Live sky', 'தற்போதைய ஓரை · நேரலை வானம்')}</div><div class="mini-value">${esc(planetName(snap.currentHora.lord))} ${L('Horai', 'ஓரை')}</div></div>
        <div style="text-align:right"><div class="mini-label">${L('ends in', 'முடிய')}</div><div class="countdown" data-end="${new Date(snap.currentHora.end).getTime()}">${countdown(snap.currentHora.end)}</div></div>
      </div>
      ${trialBanner()}${ratePrompt()}
      <button class="btn-gold share-btn" id="shareToday">📤 ${L('Share today\'s calendar card', 'இன்றைய காலண்டர் அட்டையைப் பகிரவும்')}</button>
    </details>

    <div class="brand-foot"><img src="logo.svg" alt="" width="56" height="56"><div><b>துணை</b><span class="slogan-sm">${L('Your guide for life', 'உங்கள் வாழ்க்கையின் வழிகாட்டி')}</span>${ta() ? '' : '<span>Thunai</span>'}</div></div>
    ${copyright()}`;
  fillHomeWeather(td);
  const more = $('.more-today', sec);
  if (homeMoreOpen) more.open = true;
  more.addEventListener('toggle', () => { homeMoreOpen = more.open; });
  $('#shareToday').addEventListener('click', () => import('./screens-tools.js').then((mod) => mod.shareToday(td, snap)));
  $$('.fam-row', sec).forEach((r) => r.addEventListener('click', () => { state.activeId = r.dataset.id; saveFamily(); renderHome(sec); }));
  tickHome();
}
let homeMoreOpen = false;
const fmtIsoDate2 = (iso) => { const [y, mo, d] = iso.split('-'); return `${d}-${mo}-${y}`; };

function gowriCell(g, loc) {
  const now = Date.now();
  const cur = now >= new Date(g.start).getTime() && now < new Date(g.end).getTime();
  return `<div class="gw ${g.good ? 'good' : 'bad'}${cur ? ' now' : ''}"><b>${esc(bi(g))}</b><span>${fmtTime(g.start, loc.tz)}</span></div>`;
}
function kalamCell(label, r, active, loc) {
  return `<div class="${active ? 'active' : ''}"><b>${label}</b>${fmtTime(r.start, loc.tz)} – ${fmtTime(r.end, loc.tz)}${active ? `<br><span class="pill">${L('now', 'இப்போது')}</span>` : ''}</div>`;
}

function familyCard(snap) {
  if (!state.family.length) {
    return `<div class="card glass cta-card" data-go="family" data-param='{"add":true}'>👨‍👩‍👧 ${L('Add your family\'s birth details to see each person\'s day', 'ஒவ்வொருவரின் இன்றைய பலனைப் பார்க்க குடும்பத்தினர் விவரங்களைச் சேர்க்கவும்')} ›</div>`;
  }
  const rows = state.family.map((m) => {
    const c = chartOf(m);
    const o = dayOutlook(c, snap);
    // Neutral wording and colours: a traditional reading of the day, never a danger warning.
    const label = o.chandrashtama ? L('Chandrashtamam — go gently', 'சந்திராஷ்டமம் — நிதானம்') : o.overall === 'good' ? L('Favourable day', 'சாதகமான நாள்') : o.overall === 'bad' ? L('Go gently', 'நிதானம்') : L('Ordinary day', 'சாதாரண நாள்');
    return `<button class="fam-row${m.id === state.activeId ? ' active' : ''}" data-id="${esc(m.id)}">
      <span class="avatar" aria-hidden="true">${esc(displayName(m).slice(0, 1).toUpperCase())}</span>
      <span class="fam-name">${esc(displayName(m))}<small>${esc(nakName(c.janmaNakshatra.index))} · ${esc(rasiName(c.janmaRasi.index))}</small></span>
      <span class="tag ${o.overall === 'good' ? 'good' : 'neutral'}">${label}</span></button>`;
  }).join('');
  return `<div class="card glass"><div class="card-title"><span>👨‍👩‍👧 ${L('Family today', 'இன்று குடும்பத்தினருக்கு')}</span><button class="link-btn" data-go="family">${L('Manage', 'நிர்வகி')}</button></div>${rows}
    <p class="muted small">${L('Traditional Tara / Chandra Bala reading — for reflection, not a prediction.', 'மரபு தாரா / சந்திர பலம் — சிந்தனைக்கு மட்டும், முன்னறிவிப்பு அல்ல.')}</p></div>`;
}

function relationsCard() {
  const list = relationsList(3);
  if (!list) return '';
  return `<div class="card glass" data-go="relations"><div class="card-title"><span>💞 ${L('Family relations today', 'இன்று குடும்ப உறவு')}</span><span class="link-btn">${L('All', 'அனைத்தும்')} ›</span></div>${list.map((r) => relationRow(r)).join('')}</div>`;
}

function tickHome() {
  if (!state.loc) return;
  const now = new Date();
  const c = $('#clock');
  if (c) c.textContent = fmtTime(now, state.loc.tz, true);
  for (const el of $$('[data-end]')) el.textContent = countdown(Number(el.dataset.end), now.getTime());
}

registerScreen('home', {
  render: renderHome, needsLoc: true,
  tick: () => {
    const ends = $$('#view-home [data-end]').map((e) => Number(e.dataset.end));
    if (ends.some((e) => e <= Date.now())) { refreshSnap(true); renderHome($('#view-home')); } else tickHome();
  },
});

export function refreshSnap(force = false) {
  const loc = state.loc;
  const now = new Date();
  if (force || !state.snap || now - state.snapAt > 60000) {
    state.snap = panchang(now, loc.lat, loc.lon, loc.tz);
    state.snapAt = now.getTime();
    return true;
  }
  return false;
}

// ================================================================ LIVE SKY
const SI_POS = { 11: [0, 0], 0: [0, 1], 1: [0, 2], 2: [0, 3], 10: [1, 0], 3: [1, 3], 9: [2, 0], 4: [2, 3], 8: [3, 0], 7: [3, 1], 6: [3, 2], 5: [3, 3] };

export function renderSI(el, houses, planets, lagnaRasi, title, sub, showDeg) {
  let html = '';
  for (let s = 0; s < 12; s++) {
    const [r, c] = SI_POS[s];
    const items = houses[s].map((k) => {
      const p = planets[k];
      const label = ta() ? PLANETS[k].short : PLANETS[k].en;
      const retro = p.retrograde && k !== 'Rahu' && k !== 'Ketu' ? (ta() ? '<sup>வ</sup>' : '<sup>R</sup>') : '';
      const deg = showDeg ? `<sup>${Math.floor(p.degreeInSign)}°</sup>` : '';
      return `<span class="si-pl ${k}" title="${esc(planetName(k))} ${esc(p.dms)}">${label}${retro}${deg}</span>`;
    }).join('');
    html += `<div class="si-cell${s === lagnaRasi ? ' lagna' : ''}" style="grid-row:${r + 1};grid-column:${c + 1}">${items}<span class="sn">${esc(ta() ? RASIS[s].ta : RASIS[s].en)}</span></div>`;
  }
  html += `<div class="si-center"><div class="t">${esc(title)}</div><div class="s">${sub}</div></div>`;
  el.innerHTML = html;
}

let wheelBuilt = false;
function buildWheel() {
  const svg = $('#wheel');
  const R1 = 150, R2 = 122, R3 = 100;
  const pt = (deg, r) => [r * Math.cos(-deg * Math.PI / 180), r * Math.sin(-deg * Math.PI / 180)];
  let ring = `<circle r="${R1}" fill="rgba(20,8,50,.55)" stroke="#f5c26b" stroke-width="1.5"/>
    <circle r="${R2}" fill="none" stroke="rgba(245,194,107,.5)"/><circle r="${R3}" fill="rgba(10,4,30,.4)" stroke="rgba(245,194,107,.35)"/>`;
  for (let i = 0; i < 12; i++) {
    const [x1, y1] = pt(i * 30, R3), [x2, y2] = pt(i * 30, R1);
    const [tx, ty] = pt(i * 30 + 15, (R1 + R2) / 2);
    const fill = i % 2 ? 'rgba(245,194,107,.05)' : 'rgba(255,140,58,.07)';
    const [a1, b1] = pt(i * 30, R1), [a2, b2] = pt(i * 30 + 30, R1), [c1, d1] = pt(i * 30 + 30, R2), [e1, f1] = pt(i * 30, R2);
    ring += `<path d="M${a1},${b1} A${R1},${R1} 0 0 0 ${a2},${b2} L${c1},${d1} A${R2},${R2} 0 0 1 ${e1},${f1}Z" fill="${fill}"/>`;
    ring += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgba(245,194,107,.45)"/>`;
    ring += `<text class="wr" data-i="${i}" x="${tx}" y="${ty}" fill="#ffdf9e" font-size="10.5" text-anchor="middle" dominant-baseline="central"></text>`;
  }
  for (let i = 0; i < 27; i++) {
    const deg = i * (360 / 27);
    const [x1, y1] = pt(deg, R3), [x2, y2] = pt(deg, R2);
    const [tx, ty] = pt(deg + 360 / 54, (R2 + R3) / 2);
    ring += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgba(183,169,214,.25)"/>`;
    ring += `<text class="wn" data-i="${i}" x="${tx}" y="${ty}" fill="#b7a9d6" font-size="7" text-anchor="middle" dominant-baseline="central">${i + 1}</text>`;
  }
  svg.innerHTML = `<defs><radialGradient id="core"><stop offset="0" stop-color="#ffe7a3"/><stop offset=".6" stop-color="#f5b83d"/><stop offset="1" stop-color="#b8620f" stop-opacity="0"/></radialGradient></defs>
    <g id="zring">${ring}</g>
    <line x1="-${R1 + 6}" y1="0" x2="${R1 + 6}" y2="0" stroke="rgba(255,255,255,.18)" stroke-dasharray="3 4"/>
    <text x="-${R1 + 2}" y="-6" fill="#f5c26b" font-size="9">${L('ASC', 'லக்')}</text>
    <circle r="16" fill="url(#core)"/><g id="zplanets"></g>`;
  wheelBuilt = true;
}

function renderWheel(pos, lagnaLon, moonNak) {
  if (!wheelBuilt) buildWheel();
  $$('#wheel .wr').forEach((el) => { el.textContent = ta() ? RASIS[el.dataset.i].ta.slice(0, 4) : RASIS[el.dataset.i].en.slice(0, 5); });
  $('#zring').setAttribute('transform', `rotate(${lagnaLon - 180})`);
  $$('#wheel .wn').forEach((el) => el.setAttribute('fill', Number(el.dataset.i) === moonNak ? '#ffe066' : '#b7a9d6'));
  const entries = Object.entries(pos).filter(([k]) => k !== 'Lagna').sort((a, b) => a[1].longitude - b[1].longitude);
  const radii = [82, 64, 46];
  let lastLon = -99, lvl = 0;
  $('#zplanets').innerHTML = entries.map(([k, p]) => {
    lvl = Math.abs(p.longitude - lastLon) < 10 ? (lvl + 1) % 3 : 0;
    lastLon = p.longitude;
    const a = (180 + p.longitude - lagnaLon) * Math.PI / 180;
    const r = radii[lvl];
    const x = r * Math.cos(a), y = -r * Math.sin(a);
    const tx = 100 * Math.cos(a), ty = -100 * Math.sin(a);
    return `<line x1="${x}" y1="${y}" x2="${tx}" y2="${ty}" style="stroke:${COLOR[k]}" stroke-opacity=".35"/>
      <circle cx="${x}" cy="${y}" r="10" fill="rgba(10,4,30,.85)" style="stroke:${COLOR[k]}"/>
      <text x="${x}" y="${y}" style="fill:${COLOR[k]}" font-size="11" text-anchor="middle" dominant-baseline="central">${GLYPH[k]}</text>`;
  }).join('');
}

function horaQuality(lord) {
  if (['Jupiter', 'Venus', 'Mercury', 'Moon'].includes(lord)) return ['good', L('Favourable', 'சாதகம்')];
  if (['Saturn', 'Mars'].includes(lord)) return ['bad', L('Unfavourable', 'பாதகம்')];
  return ['warn', L('Neutral', 'சமம்')];
}

function renderLive(sec) {
  wheelBuilt = false;
  const loc = state.loc;
  refreshSnap(true);
  const s = state.snap;
  const now = Date.now();
  const h = s.currentHora;
  const [q, ql] = horaQuality(h.lord);
  sec.innerHTML = `${subHeaderLocal(L('Live Sky', 'நேரலை வானம்'), L('Synchronised every second with the real sky', 'ஒவ்வொரு நொடியும் வானத்துடன் ஒத்திசைவு'))}
    <div class="card glass wheel-card">
      <div class="card-title"><span>${L('Rasi Mandalam', 'ராசி மண்டலம்')}</span><span class="live-dot">${L('LIVE', 'நேரலை')}</span></div>
      <svg id="wheel" viewBox="-160 -160 320 320" role="img" aria-label="Rasi Mandalam"></svg>
      <div class="lagna-line" id="lagnaNow"></div>
    </div>
    <div class="grid2">
      ${[['Star', 'நட்சத்திரம்', `${nakName(s.nakshatra.index)} · ${L('Pada', 'பாதம்')} ${s.nakshatra.pada}`, s.nakshatra.endsAt, 'cdNak'],
    ['Tithi', 'திதி', `${ta() ? s.tithi.ta : s.tithi.name} · ${ta() ? (s.tithi.paksha === 'Shukla' ? 'வளர்பிறை' : 'தேய்பிறை') : s.tithi.paksha}`, s.tithi.endsAt, 'cdTithi'],
    ['Moon Rasi', 'சந்திர ராசி', rasiName(s.moonRasi.index), s.moonRasi.endsAt, 'cdRasi'],
    ['Yoga', 'யோகம்', `${yogaName(s.yoga)} · ${karanaName(s)}`, s.yoga.endsAt, 'cdYoga'],
  ].map(([en, tx, v, end, id]) => `<div class="card glass"><div class="mini-label">${L(en, tx)}</div><div class="mini-value">${esc(v)}</div>
        <div class="mini-sub">${L('ends in', 'முடிய')} <span data-end="${end ? new Date(end).getTime() : ''}">${countdown(end, now)}</span></div>
        <div class="mini-sub">${fmtTime(end, loc.tz)}</div>${id === 'cdNak' ? '<div class="bar"><i id="cdNakBar"></i></div>' : ''}</div>`).join('')}
    </div>
    <div class="card glass">
      <div class="card-title"><span>${L('Horai', 'ஓரை')}</span><span class="muted small">☀ ${fmtTime(s.sunrise, loc.tz)} · 🌇 ${fmtTime(s.sunset, loc.tz)}</span></div>
      <div class="hora-now">
        <div class="hora-glyph" style="color:${COLOR[h.lord]}">${GLYPH[h.lord]}</div>
        <div style="flex:1"><div class="mini-label">${L('Current Horai', 'தற்போதைய ஓரை')}</div><div class="mini-value">${esc(planetName(h.lord))} ${L('Horai', 'ஓரை')}</div><span class="tag ${q}">${ql}</span></div>
        <div style="text-align:right"><div class="mini-label">${L('ends in', 'முடிய')}</div><div class="countdown" data-end="${new Date(h.end).getTime()}">${countdown(h.end, now)}</div></div>
      </div>
      <div class="hora-list">${s.horai.map((x) => {
    const cls = now >= new Date(x.start).getTime() && now < new Date(x.end).getTime() ? 'now' : now >= new Date(x.end).getTime() ? 'past' : '';
    return `<div class="hora-item ${cls}"><b style="color:${COLOR[x.lord]}">${GLYPH[x.lord]} ${esc(ta() ? PLANETS[x.lord].short : x.lord.slice(0, 3))}</b>${fmtTime(x.start, loc.tz)}</div>`;
  }).join('')}</div>
    </div>
    <div class="card glass"><div class="card-title"><span>${L('Gochara (transit) chart', 'கோசார கட்டம்')}</span><span class="live-dot">${L('LIVE', 'நேரலை')}</span></div><div id="gocharaChart" class="si-chart"></div></div>`;
  setTimeout(() => $('.hora-item.now')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }), 50);
  tickLive();
}
const subHeaderLocal = (title, sub) => `<div class="sub-head"><button class="back-btn" data-back="home" aria-label="Back">‹</button><div><h2>${title}</h2><p class="muted small">${sub}</p></div></div>`;

function tickLive() {
  const loc = state.loc;
  const now = new Date();
  for (const el of $$('#view-live [data-end]')) el.textContent = countdown(Number(el.dataset.end), now.getTime());
  const { planets } = planetPositions(now, loc.lat, loc.lon);
  renderWheel(planets, planets.Lagna.longitude, planets.Moon.nakshatra);
  $('#lagnaNow').textContent = `${L('Lagna now', 'தற்போதைய லக்னம்')}: ${rasiName(planets.Lagna.rasi)} ${planets.Lagna.dms} · ☽ ${nakName(planets.Moon.nakshatra)} ${planets.Moon.dms}`;
  const nb = $('#cdNakBar');
  if (nb) nb.style.width = `${(((planets.Moon.longitude % (360 / 27)) / (360 / 27)) * 100).toFixed(2)}%`;
  renderSI($('#gocharaChart'), buildCharts(planets).rasi, planets, planets.Lagna.rasi, L('Gochara', 'கோசாரம்'), fmtTime(now, loc.tz, true), true);
}

registerScreen('live', {
  render: renderLive, parent: 'home', needsLoc: true,
  tick: () => {
    const ends = $$('#view-live [data-end]').map((e) => Number(e.dataset.end)).filter(Boolean);
    if (ends.some((e) => e <= Date.now())) renderLive($('#view-live')); else tickLive();
  },
});


// ================================================================ MY CHART (JATHAGAM)
function memberSwitcher(current) {
  if (state.family.length < 2) return '';
  return `<div class="member-switch" role="group" aria-label="${esc(L('Choose a family member', 'குடும்ப உறுப்பினரைத் தேர்வு செய்க'))}">${state.family.map((m) => `<button class="mchip${m.id === current ? ' sel' : ''}" data-mid="${esc(m.id)}" aria-pressed="${m.id === current}">${esc(displayName(m))}</button>`).join('')}</div>`;
}

/** Chevvai / Rahu-Ketu: raw presence with the proposed exceptions listed for the astrologer — never auto-"cancelled". */
export function doshaCardHtml(c) {
  const d = doshams(c.planets, { stability: c.stability });
  const cv = d.chevvai;
  const present = cv.raw ?? cv.present;
  const cvText = present
    ? (cv.exceptions.length ? L('Present — your astrologer may review these exceptions', 'உண்டு — இந்த விலக்குகளை உங்கள் ஜோதிடர் பரிசீலிக்கலாம்') : L('Present', 'உண்டு'))
    : L('Not present', 'இல்லை');
  const refs = [cv.fromLagna != null ? `${L('from Lagna', 'லக்னத்திலிருந்து')} ${cv.fromLagna}` : (cv.needsBirthTime ? `${L('Lagna', 'லக்னம்')}: ${needsTimeText()}` : ''), cv.fromMoon != null ? `${L('from Moon', 'சந்திரனிலிருந்து')} ${cv.fromMoon}` : ''].filter(Boolean).join(' · ');
  const rk = d.rahuKetu;
  const rkText = rk.present == null ? needsTimeText() : rk.present ? L('Present', 'உண்டு') : L('Not present', 'இல்லை');
  return `<div class="card glass"><div class="card-title">${L('Doshams (traditional)', 'தோஷங்கள் (மரபு)')}</div>
    <div class="factor"><span>${L('Chevvai (Mars) dosham', 'செவ்வாய் தோஷம்')}${reviewChip(cv.status)}${refs ? `<br><small class="muted">${L('Mars house', 'செவ்வாய் பாவம்')}: ${esc(refs)}</small>` : ''}${unstableChip(c, 'house:Mars')}</span><b class="zero">${cvText}</b></div>
    ${present && cv.exceptions.length ? `<ul class="exc-list">${cv.exceptions.map((e) => `<li>${esc(bi(e))} <span class="chip-review">${L('proposed', 'முன்மொழிவு')}</span>${e.reason ? `<br><small class="muted">${esc(bi(e.reason))}</small>` : ''}</li>`).join('')}</ul><p class="muted small">${esc(bi(cv.note))}</p>` : ''}
    <div class="factor"><span>${L('Rahu-Ketu dosham', 'ராகு-கேது தோஷம்')}${reviewChip(rk.status)}</span><b class="zero">${rkText}</b></div>
    <p class="muted small">${L('These are traditional observations, common in many charts. Many traditions compare them with a partner\'s chart (dosha samyam). They are not a cause for fear.', 'இவை பல ஜாதகங்களில் காணப்படும் மரபுக் குறிப்புகள். பல மரபுகள் இவற்றை வாழ்க்கைத் துணையின் ஜாதகத்துடன் ஒப்பிடுகின்றன (தோஷ சாம்யம்). பயப்பட வேண்டியதில்லை.')}</p>
  </div>`;
}

/** "Traditional strength index" rows; tap a row for its factors and the index note. */
export function strengthCardHtml(c) {
  const strength = grahaStrength(c.planets);
  const idx = strength[0]?.indexName || STRENGTH_INDEX.indexName;
  return `<div class="card glass"><div class="card-title">💪 ${esc(bi(idx))}</div>
    <p class="muted small">${L('A simple 0–100 traditional index — not Shadbala and not a probability. Tap a planet for details.', '0–100 எளிய மரபுக் குறியீடு — ஷட்பலம் அல்ல, நிகழ்தகவும் அல்ல. விவரத்திற்குக் கிரகத்தைத் தொடவும்.')}</p>
    ${strength.map((g) => `<button class="gb-row" data-planet="${g.planet}" aria-expanded="false" aria-controls="gb-${g.planet}">
      <span class="gb-name" style="color:${COLOR[g.planet]}"><span aria-hidden="true">${GLYPH[g.planet]}</span> ${esc(planetName(g.planet))}</span>
      <span class="gb-bar" aria-hidden="true"><i class="${g.level}" style="width:${g.score}%"></i></span>
      <span class="tag ${g.level === 'strong' ? 'good' : 'neutral'}">${g.score} · ${g.level === 'strong' ? L('Higher', 'அதிகம்') : g.level === 'weak' ? L('Lower', 'குறைவு') : L('Middle', 'நடுத்தரம்')}</span></button>
      <div class="gb-detail" id="gb-${g.planet}" hidden>
        <ul>${g.reasons.map((r) => `<li>${r.pts > 0 ? '▲' : '▼'} ${esc(L(r.en, r.ta))}</li>`).join('') || `<li>${L('No special factors', 'சிறப்புக் காரணிகள் இல்லை')}</li>`}</ul>
        <p class="muted small">${esc(bi(NAVAGRAHA[g.planet].governs))}</p>
        <p class="muted small">ℹ️ ${esc(bi(g.note || STRENGTH_INDEX.note))}</p>
      </div>`).join('')}</div>`;
}
const reviewChip = (status) => (status && status !== 'approved' ? ` <span class="chip-review">${L('Proposed rule — awaiting astrologer review', 'முன்மொழியப்பட்ட விதி — ஜோதிடர் மதிப்பாய்வுக்குக் காத்திருக்கிறது')}</span>` : '');

export function wireStrengthRows(sec) {
  $$('.gb-row[data-planet]', sec).forEach((b) => b.addEventListener('click', () => {
    const d2 = $(`#gb-${b.dataset.planet}`, sec);
    d2.hidden = !d2.hidden;
    b.setAttribute('aria-expanded', String(!d2.hidden));
  }));
}

function renderChart(sec) {
  const m = activeMember();
  const c = chartOf(m);
  const lagnaOk = hasLagna(c);
  const sub = `${esc(displayName(m))}<br>${esc(c.date)}${c.time && c.timePrecision !== 'unknown' ? ` · ${esc(String(c.time).slice(0, 5))}${c.timePrecision === 'approximate' ? ' ~' : ''}` : ''}<br>${esc(placeName(c.place))}`;
  const bp = c.birthPanchang;
  const nl = nameLetters(c.janmaNakshatra.index, c.janmaNakshatra.pada);
  const now = new Date();
  const order = ['Lagna', 'Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'].filter((k) => c.planets[k]);
  const houseOf = (k) => (lagnaOk ? ((c.planets[k].rasi - c.planets.Lagna.rasi + 12) % 12) + 1 : null);
  sec.innerHTML = `${memberSwitcher(m.id)}
    <h2 class="screen-title">${L('My Chart', 'என் ஜாதகம்')}</h2>
    ${precisionNote(c)}
    <div class="card glass"><div class="card-title"><span>${L('Rasi chart', 'ராசி கட்டம்')}</span><button class="link-btn" data-go="chat" data-param='{"topic":"chart"}'>💬 ${L('Ask Thunai about my chart', 'என் ஜாதகம் பற்றித் துணையிடம் கேள்')}</button></div><div id="rasiChart" class="si-chart" role="img" aria-label="${esc(L('Rasi chart', 'ராசி கட்டம்'))}"></div>
      ${lagnaOk ? '' : `<p class="muted small">${L('Houses: needs birth time — the chart shows signs only.', 'பாவங்கள்: பிறந்த நேரம் தேவை — கட்டத்தில் ராசிகள் மட்டும்.')}</p>`}</div>
    <div class="section-title">${L('Explore my chart', 'என் ஜாதகத்தை ஆராய')}</div>
    ${toolTiles(HUB_TOOLS.chart)}
    <div class="btn-row"><button class="chip-btn" data-print="1">🖨️ ${L('Print / PDF', 'அச்சிடு / PDF')}</button></div>
    <div class="card glass"><div class="card-title">${L('Navamsa chart', 'நவாம்ச கட்டம்')}${unstableChip(c, 'navamsaLagna')}</div><div id="navamsaChart" class="si-chart" role="img" aria-label="${esc(L('Navamsa chart', 'நவாம்ச கட்டம்'))}"></div></div>
    <div class="card glass"><div class="card-title">${L('Birth details', 'பிறப்பு விவரம்')}</div>
      <dl class="kv">
        <dt>${L('Birth star', 'ஜென்ம நட்சத்திரம்')}</dt><dd>${esc(nakName(c.janmaNakshatra.index))} · ${L('Pada', 'பாதம்')} ${c.janmaNakshatra.pada}${unstableChip(c, 'moonNakshatra') || unstableChip(c, 'moonPada')}</dd>
        <dt>${L('Rasi', 'ராசி')}</dt><dd>${esc(rasiName(c.janmaRasi.index))}${unstableChip(c, 'moonRasi')}</dd>
        <dt>${L('Lagnam', 'லக்னம்')}</dt><dd>${lagnaOk ? `${esc(rasiName(c.lagna.rasi))} ${esc(c.lagna.dms)}${unstableChip(c, 'lagna')}` : `<span class="chip-unstable">${needsTimeText()}</span>`}</dd>
        <dt>${L('Birth time', 'பிறந்த நேரம்')}</dt><dd>${c.timePrecision === 'unknown' ? L('Unknown', 'தெரியாது') : c.timePrecision === 'approximate' ? L('Approximate', 'தோராயம்') : L('Exact', 'சரியானது')}${c.zone ? ` · ${esc(c.zone)}` : ` · UTC${c.tz >= 0 ? '+' : ''}${c.tz}`}</dd>
        <dt>${L('Weekday', 'கிழமை')}</dt><dd>${esc(bi(bp.weekday))}</dd>
        <dt>${L('Tithi', 'திதி')}</dt><dd>${esc(ta() ? bp.tithi.ta : `${bp.tithi.paksha} ${bp.tithi.name}`)}</dd>
        <dt>${L('Yoga / Karanam', 'யோகம் / கரணம்')}</dt><dd>${esc(yogaName(bp.yoga))} / ${esc(karanaName(bp))}</dd>
        <dt>${L('Name letters', 'பெயர் எழுத்து')}</dt><dd>${esc(nl.primary.ta)} (${esc(nl.primary.en)})</dd>
        <dt>${L('Ayanamsa', 'அயனாம்சம்')}</dt><dd>${c.ayanamsa.toFixed(4)}° ${L('Lahiri', 'லாஹிரி')}</dd>
      </dl></div>
    ${strengthCardHtml(c)}
    ${doshaCardHtml(c)}
    <div class="card glass"><div class="card-title">${L('Vimshottari Dasa', 'விம்சோத்தரி தசை')}${c.dasa.approximate ? ` <span class="chip-unstable">${L('approximate — birth time unknown', 'தோராயம் — பிறந்த நேரம் தெரியாது')}</span>` : ''}</div>
      <p class="muted small">${L('Dasa balance at birth', 'பிறப்பு தசா இருப்பு')}: ${esc(planetName(c.dasa.balance.lord))} ${c.dasa.balance.years.toFixed(2)} ${L('yrs', 'ஆண்டு')}</p>
      <div class="table-wrap"><table><tr><th scope="col">${L('Dasa', 'தசை')}</th><th scope="col">${L('From', 'தொடக்கம்')}</th><th scope="col">${L('To', 'முடிவு')}</th></tr>
      ${c.dasa.periods.map((p) => {
    const cur = now >= p.start && now < p.end;
    const bh = cur ? p.bhuktis.map((b) => `<tr class="${now >= b.start && now < b.end ? 'current' : ''}"><td style="padding-left:22px">↳ ${esc(planetName(b.lord))} ${L('Bhukti', 'புக்தி')}</td><td>${fmtDate(b.start, c.tz)}</td><td>${fmtDate(b.end, c.tz)}</td></tr>`).join('') : '';
    return `<tr class="${cur ? 'current' : ''}"><td class="pl">${GLYPH[p.lord]} ${esc(planetName(p.lord))}${cur ? ` · ${L('now', 'நடப்பு')}` : ''}</td><td>${fmtDate(p.start, c.tz)}</td><td>${fmtDate(p.end, c.tz)}</td></tr>${bh}`;
  }).join('')}</table></div></div>
    <div class="card glass"><div class="card-title">${L('Planet positions', 'கிரக நிலை')}</div><div class="table-wrap"><table>
      <tr><th scope="col">${L('Planet', 'கிரகம்')}</th><th scope="col">${L('Rasi', 'ராசி')}</th><th scope="col">${L('Degree', 'பாகை')}</th><th scope="col">${L('Star', 'நட்சத்திரம்')}</th><th scope="col">${L('Pada', 'பாதம்')}</th><th scope="col">${L('House', 'பாவம்')}</th></tr>
      ${order.map((k) => { const p = c.planets[k]; const h = k === 'Lagna' ? 1 : houseOf(k); return `<tr><td class="pl" style="color:${COLOR[k]}">${GLYPH[k]} ${esc(planetName(k))}${p.retrograde && !['Rahu', 'Ketu'].includes(k) ? ' ℞' : ''}</td><td>${esc(rasiName(p.rasi))}</td><td>${esc(p.dms)}</td><td>${esc(nakName(p.nakshatra))}</td><td>${p.pada}</td><td>${h ?? `<span class="muted small">${needsTimeText()}</span>`}${k === 'Lagna' ? unstableChip(c, 'lagna') : unstableChip(c, `house:${k}`)}</td></tr>`; }).join('')}
    </table></div></div>
    ${reportMeta()}`;
  renderSI($('#rasiChart'), c.charts.rasi, c.planets, lagnaOk ? c.lagna.rasi : null, L('Rasi', 'ராசி'), sub, true);
  renderSI($('#navamsaChart'), c.charts.navamsa, c.planets, lagnaOk ? c.lagna.navamsaRasi : null, L('Navamsa', 'நவாம்சம்'), sub, false);
  wireStrengthRows(sec);
  $$('.mchip', sec).forEach((b) => b.addEventListener('click', () => { state.activeId = b.dataset.mid; saveFamily(); renderChart(sec); }));
}
registerScreen('chart', { render: renderChart, needsMember: true });

// ================================================================ PRASNAM
let prasnaCategory = null;
let lastAnswer = null;
let askForId = null;
const askMember = () => state.family.find((m) => m.id === askForId) || activeMember();

function renderAsk(sec) {
  const cats = CATEGORIES.filter((c) => !c.event);
  sec.innerHTML = `${subHeaderAsk()}<div class="card glass">
      <h2>${L('Prasnam — Do or Don\'t?', 'பிரசன்னம் — செய்யலாமா?')}</h2>
      <p class="muted">${L('Choose what you are about to do. A traditional Prasnam is cast for this exact second. Real deadlines always come first.', 'செய்யப்போகும் காரியத்தைத் தேர்வு செய்யுங்கள். இந்த நொடிக்கான மரபுப் பிரசன்னம் கணிக்கப்படும். உண்மையான காலக்கெடுவே எப்போதும் முதன்மை.')}</p>
      ${state.family.length > 1 ? `<label>${L('Asking for', 'யாருக்காக')}<select id="askFor">${state.family.map((m) => `<option value="${esc(m.id)}"${m.id === askMember()?.id ? ' selected' : ''}>${esc(displayName(m))}${m.relation === 'organization' ? ` (${L('company', 'நிறுவனம்')})` : ''}</option>`).join('')}</select></label>` : ''}
      <div class="cat-grid" role="group" aria-label="${esc(L('What is it about?', 'எதைப் பற்றி?'))}">${cats.map((c) => `<button class="cat${prasnaCategory === c.id ? ' sel' : ''}" data-id="${c.id}" aria-pressed="${prasnaCategory === c.id}"><span class="ci" aria-hidden="true">${c.icon}</span>${esc(bi(c))}</button>`).join('')}</div>
      <label class="sr-only" for="question">${L('Your question', 'உங்கள் கேள்வி')}</label>
      <textarea id="question" rows="2" maxlength="400" placeholder="${esc(L('Your question (optional) — e.g. Can I sign the flat agreement today?', 'உங்கள் கேள்வி (விருப்பம்) — உ.தா. இன்று ஒப்பந்தம் கையெழுத்திடலாமா?'))}"></textarea>
      <button id="askBtn" class="btn-gold"${prasnaCategory ? '' : ' disabled'}>🔮 ${L('Ask now', 'இப்போது கேளுங்கள்')}</button>
    </div>
    <div id="answer"${lastAnswer ? '' : ' hidden'} aria-live="polite">
      <div class="card glass practical-first" id="practicalCard" hidden></div>
      <div class="card glass verdict-card" id="verdictCard"></div>
      <div class="card glass"><div class="card-title"><span>${L('Thunai says', 'துணை பதில்')}</span><span><button class="link-btn" id="speakReply" aria-label="${esc(L('Read aloud', 'வாசித்துக்காட்டு'))}">🔊</button> <span id="aiSource" class="pill"></span></span></div><div id="reply" class="reply"></div></div>
      <div class="card glass" id="factorCard"></div>
      <div class="card glass" id="bestCard"></div>
    </div>`;
  $$('.cat', sec).forEach((b) => b.addEventListener('click', () => {
    prasnaCategory = b.dataset.id;
    $$('.cat', sec).forEach((x) => { x.classList.toggle('sel', x === b); x.setAttribute('aria-pressed', String(x === b)); });
    $('#askBtn').disabled = false;
  }));
  $('#askBtn').addEventListener('click', ask);
  $('#askFor')?.addEventListener('change', (e) => { askForId = e.target.value; });
  $('#speakReply').addEventListener('click', () => { if (!speak($('#reply').textContent)) toast(L('Read-aloud is not available on this device', 'இந்தச் சாதனத்தில் வாசித்துக்காட்டும் வசதி இல்லை')); });
  if (lastAnswer) { renderAnswer(lastAnswer); $('#reply').textContent = lastAnswer.reply || ''; $('#aiSource').textContent = lastAnswer.source || ''; showExtras($('#reply'), lastAnswer.meta || {}); }
}
const subHeaderAsk = () => `<div class="sub-head"><button class="back-btn" data-back="plan" aria-label="${esc(L('Back', 'பின்செல்'))}">‹</button><div><h2>${L('Prasnam', 'பிரசன்னம்')}</h2><p class="muted small">${L('Traditional timing check — optional', 'மரபு நேரப் பார்வை — விருப்பத்திற்குரியது')}</p></div></div>`;

function gauge(score, verdict) {
  const col = verdict === 'DO' ? 'var(--good)' : verdict === 'CAUTION' ? 'var(--warn)' : 'var(--muted)';
  const C = 2 * Math.PI * 70;
  return `<div class="gauge" role="img" aria-label="${esc(`${L('Traditional score', 'மரபு மதிப்பு')} ${score} / 100`)}"><svg viewBox="0 0 170 170" aria-hidden="true"><circle cx="85" cy="85" r="70" fill="none" stroke="rgba(var(--ink-rgb),.08)" stroke-width="12"/>
    <circle cx="85" cy="85" r="70" fill="none" stroke="${col}" stroke-width="12" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C}" style="transition:stroke-dashoffset 1.2s ease" class="gArc" data-off="${C * (1 - score / 100)}"/></svg>
    <div class="num" style="color:${col}"><div>${score}<small>${L('traditional score', 'மரபு மதிப்பு')} / 100</small></div></div></div>`;
}
export function animateGauges() {
  requestAnimationFrame(() => requestAnimationFrame(() => $$('.gArc').forEach((g) => { g.style.strokeDashoffset = g.dataset.off; })));
}
export { gauge };

/** Normalises both the on-device evaluation and the server summary into the practical-first fields. */
function practicalOf(a) {
  const cat = getCategory(a.category);
  const pf = !!(a.practicalFirst || a.practical?.deadlineFirst || cat?.practicalFirst);
  const note = a.deadlineNote ? bi(a.deadlineNote) : a.practical?.note || (pf ? bi(DEADLINE_FIRST_NOTE[a.category] || DEADLINE_FIRST_NOTE.default) : '');
  const questions = a.practicalQuestions || a.practical?.questions || (pf ? PRACTICAL_QUESTIONS : []);
  return { pf, note, questions };
}

function renderAnswer(a) {
  const loc = state.loc;
  const cat = getCategory(a.category);
  const p = practicalOf(a);
  const verdictText = verdictTextFor({ verdict: a.verdict, practicalFirst: p.pf });
  const pc = $('#practicalCard');
  pc.hidden = !p.pf;
  pc.innerHTML = p.pf ? `<div class="card-title">✅ ${L('First, your real deadline', 'முதலில், உங்கள் உண்மையான காலக்கெடு')}</div>
    <p><b>${esc(p.note)}</b></p>
    ${p.questions?.length ? `<ul class="small">${p.questions.map((q) => `<li>${esc(typeof q === 'string' ? q : bi(q))}</li>`).join('')}</ul>` : ''}
    <p class="muted small">${L('The traditional reading below is optional and never a reason to delay care, a court date, a payment or travel.', 'கீழே உள்ள மரபுப் பார்வை விருப்பத்திற்குரியது; சிகிச்சை, நீதிமன்றத் தேதி, பணம், பயணத்தைத் தள்ளிப்போட இது காரணமல்ல.')}</p>` : '';
  const verdictCls = p.pf && a.verdict === 'AVOID' ? 'CAUTION' : a.verdict;
  $('#verdictCard').innerHTML = `<div class="muted small">${cat ? `${cat.icon} ${esc(bi(cat))} · ` : ''}${fmtTime(a.snapshot.at, loc.tz, true)}</div>
    ${gauge(a.score, verdictCls)}
    <div class="verdict-big ${verdictCls}">${esc(bi(verdictText))}</div>
    <div class="muted small" style="margin-top:6px">${L('Horai', 'ஓரை')}: ${esc(planetName(a.snapshot.currentHora.lord))} · ${L('Star', 'நட்சத்திரம்')}: ${esc(nakName(a.snapshot.nakshatra.index))}${a.snapshot.lagna ? ` · ${L('Lagna', 'லக்னம்')}: ${esc(rasiName(a.snapshot.lagna.rasi))}` : ''}</div>
    <p class="muted small">${L('A traditional score — not a probability.', 'மரபு மதிப்பு — நிகழ்தகவு அல்ல.')}</p>`;
  animateGauges();
  $('#factorCard').innerHTML = `<details><summary class="card-title">${L('Why? — traditional factors', 'ஏன்? — மரபுக் காரணங்கள்')}</summary>${(a.factors || []).map((f) => `<div class="factor"><span>${esc(ta() ? f.labelTa : f.label)}</span><b class="${f.points > 0 ? 'pos' : 'zero'}">${f.points > 0 ? '+' : ''}${f.points}</b></div>`).join('')}</details>`;
  $('#bestCard').innerHTML = `<div class="card-title">🕰️ ${L('Optional: traditional windows in the next 24 hours', 'விருப்பம்: அடுத்த 24 மணி நேர மரபு நேரங்கள்')}</div>${p.pf ? `<p class="muted small">${L('Only if your real timing is flexible.', 'உங்கள் உண்மையான நேரம் மாற்றக்கூடியதென்றால் மட்டும்.')}</p>` : ''}${(a.bestTimes || []).length ? a.bestTimes.map((w) => `<div class="best">🌟 ${fmtDate(w.start, loc.tz)} · <b>${fmtTime(w.start, loc.tz)} – ${fmtTime(w.end, loc.tz)}</b><br><span class="muted small">${L('score', 'மதிப்பு')} ${w.best} · ${esc(planetName(w.hora))} ${L('Horai', 'ஓரை')}</span></div>`).join('') : `<p class="muted">${L('No stronger traditional window in the next 24 hours.', 'அடுத்த 24 மணி நேரத்தில் வலுவான மரபு நேரம் இல்லை.')}</p>`}`;
}

async function askOnDevice(body, m, notice) {
  const c = m && chartOf(m);
  const birth = c && { janmaNakshatra: c.janmaNakshatra.index, janmaRasi: c.janmaRasi.index };
  const evaluation = evaluatePrasna({ at: new Date(), category: body.category, loc: body.loc, birth });
  const a = { ...evaluation, category: body.category };
  lastAnswer = a;
  renderAnswer(a);
  const profile = c && { name: c.name, janmaNakshatraName: c.janmaNakshatra.name, janmaRasiName: c.janmaRasi.name, lagnaName: c.lagna?.rasiName || null, currentDasa: c.dasa.current && `${c.dasa.current.lord} Dasa / ${c.dasa.currentBhukti?.lord} Bhukti` };
  const ctx = buildContext({ evaluation, question: body.question, category: body.category, lang: body.lang, profile, loc: body.loc });
  const fallback = ruleBasedReply(ctx, evaluation, body.lang);
  // Rule-based text only (never a browser-side model call); the notice says why.
  $('#reply').textContent = fallback; a.reply = fallback; a.source = `📜 ${L('Quick', 'சுருக்கம்')}`; $('#aiSource').textContent = a.source;
  a.meta = { notice };
  showExtras($('#reply'), a.meta);
}

async function ask() {
  const btn = $('#askBtn');
  btn.disabled = true;
  $('#answer').hidden = false;
  $('#practicalCard').hidden = true;
  $('#verdictCard').innerHTML = `<div class="loader" aria-hidden="true"><i></i><i></i><i></i></div><p class="muted">${L('Casting the Prasnam…', 'பிரசன்னம் கணிக்கப்படுகிறது…')}</p>`;
  $('#reply').textContent = '';
  $('#reply').classList.add('typing');
  $('#factorCard').innerHTML = ''; $('#bestCard').innerHTML = ''; $('#aiSource').textContent = '';
  const m = askMember();
  const body = { category: prasnaCategory, question: $('#question').value.trim(), lang: state.lang, loc: state.loc, birth: serverBirth(m), ...policyContext(m, { channel: 'ask' }) };
  showExtras($('#reply'), {});
  await new Promise((r) => setTimeout(r, 30));
  try {
    if (STATIC) throw Object.assign(new Error('static'), { offline: STATIC_NOTICE() });
    let reply = '';
    let gotEvaluation = false;
    let meta = {};
    await sse('/api/ask', body, {
      evaluation: (d) => { gotEvaluation = true; lastAnswer = d; renderAnswer(d); $('#verdictCard').scrollIntoView({ behavior: 'smooth' }); },
      policy: (d) => { meta = { ...meta, ...d }; rememberSessionFlags('ask', d.policy?.sessionFlags || d.sessionFlags); showExtras($('#reply'), meta); },
      delta: (d) => { reply += d.text; $('#reply').textContent = reply; },
      reset: () => { reply = ''; $('#reply').textContent = ''; },
      done: (d) => {
        showExtras($('#reply'), meta);
        if (!gotEvaluation) { $('#verdictCard').innerHTML = `<p>${L('Thunai answered this without a timing reading.', 'இதற்குத் துணை நேரப் பார்வை இல்லாமல் பதிலளித்தது.')}</p>`; $('#factorCard').innerHTML = ''; $('#bestCard').innerHTML = ''; lastAnswer = null; return; }
        lastAnswer.meta = meta;
        lastAnswer.reply = reply; lastAnswer.source = d.source === 'ai' ? `✨ ${L('Detailed', 'விரிவான பதில்')}` : `📜 ${L('Quick', 'சுருக்கம்')}`; $('#aiSource').textContent = lastAnswer.source;
      },
    });
  } catch (e) {
    // Only when the server could not be reached (or in the static preview): limited on-device rules.
    // A server error response (quota, sign-in) is shown as is — never replaced with on-device astrology.
    if (e.status) { $('#verdictCard').innerHTML = `<p>${esc(e.message)}</p>`; showExtras($('#reply'), { notice: e.message }); }
    else await askOnDevice(body, m, e.offline || LIMITED_NOTICE());
  } finally {
    $('#reply').classList.remove('typing');
    btn.disabled = false;
  }
}
registerScreen('ask', { render: renderAsk, parent: 'plan', needsLoc: true });

export { NAKSHATRAS };
