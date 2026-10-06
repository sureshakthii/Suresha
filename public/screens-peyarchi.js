// Peyarchi Palan (Guru / Sani / Rahu-Ketu transits + monthly & yearly Rasi Palan) and Viratha Naatkal.
import { RASIS, WEEKDAYS } from './shared/astro.js';
import {
  currentPeyarchi, peyarchiPalan, rasiPalanPeriod, houseOrdinal, PEYARCHI_PLANETS, PEYARCHI_NAMES,
  VRATHAM_TYPES, vrathamOfMonth,
} from './shared/peyarchi.js';
import {
  state, $, $$, L, ta, esc, bi, GLYPH, COLOR, planetName, rasiName, fmtIsoDate,
  activeMember, chartOf, registerScreen, subHeader, speak, displayName, placeName,
} from './core.js';
import { remindBtn } from './remind.js';

const localAt = (date, time) => { const [y, mo, d] = date.split('-').map(Number); const [h, mi] = time.split(':').map(Number); return new Date(Date.UTC(y, mo - 1, d, h, mi) - (state.loc?.tz ?? 5.5) * 3600000); };
const LOADER = '<div class="loader"><i></i><i></i><i></i></div>';
const later = (fn) => setTimeout(fn, 30);
const tz = () => state.loc?.tz ?? 5.5;
const isoLocal = (d) => new Date(new Date(d).getTime() + tz() * 3600000).toISOString().slice(0, 10);
const fmtD = (d) => (d ? fmtIsoDate(isoLocal(d)) : '—');
const TAG = { good: 'good', mixed: 'warn', care: 'bad' };
const levelLabel = (lv) => ({ good: L('Good', 'நன்மை'), mixed: L('Mixed', 'கலவை'), care: L('Needs care', 'கவனம் தேவை') }[lv]);
const BAR = { good: 'strong', mixed: 'average', care: 'weak' };
const houseLabel = (h) => (ta() ? `${houseOrdinal(h).ta} இடம்` : `${houseOrdinal(h).en} house`);
const gName = (p) => (ta() ? PEYARCHI_NAMES[p].ta.replace('ப் பெயர்ச்சி', '') : ({ Jupiter: 'Guru', Saturn: 'Sani' }[p] || p));

function injectCss() {
  if (document.getElementById('peyarchi-css')) return;
  const s = document.createElement('style');
  s.id = 'peyarchi-css';
  s.textContent = `
.py-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 14px; }
@media (min-width: 560px) { .py-grid { grid-template-columns: repeat(4, 1fr); } }
.py-grid .rp .gl { font-size: 22px; }
.py-grid .rp small { display: block; color: var(--muted); font-size: 12px; margin-top: 4px; line-height: 1.4; }
.py-rasis { flex-wrap: wrap; }
.py-palan { padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,.06); }
.py-palan:last-child { border-bottom: 0; }
.py-palan .hd { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 6px; }
.py-palan p { margin: 4px 0; line-height: 1.6; }
.py-palan .rem { color: var(--gold2); font-size: 13px; }
.py-area { margin: 10px 0; }
.py-area .row { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 4px; }
.py-tabs { display: flex; gap: 8px; margin-bottom: 10px; }
.py-tabs .chip-btn.sel, .vr-filter .mchip.sel { background: rgba(245,194,107,.2); border-color: var(--gold); color: var(--gold2); }
.py-months { display: grid; grid-template-columns: repeat(auto-fill, minmax(70px, 1fr)); gap: 6px; }
.py-months div { font-size: 12px; text-align: center; }
.py-cs { display: flex; flex-wrap: wrap; gap: 6px; }
.vr-month { margin-top: 6px; }
.vr-row { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,.06); font-size: 17px; }
.vr-row:last-child { border-bottom: 0; }
.vr-row .ic { font-size: 24px; width: 32px; text-align: center; }
.vr-row .tx { flex: 1; min-width: 0; }
.vr-row .tx b { display: block; font-size: 17px; }
.vr-row .tx span { color: var(--muted); font-size: 14px; }
.vr-row .chip-btn { flex: 0 0 auto; }
.vr-row.today { background: rgba(245,194,107,.08); border-radius: 10px; padding-left: 8px; }
.vr-row.past { opacity: .55; }
`;
  document.head.append(s);
}

// ================================================================ PEYARCHI PALAN
let pyRasi = null;
let pyTab = 'month';
const periodCache = new Map();

function defaultRasi() {
  const m = activeMember();
  const c = m && chartOf(m);
  return c ? c.janmaRasi.index : null;
}

function renderPeyarchi(sec) {
  injectCss();
  const mine = defaultRasi();
  if (pyRasi == null) pyRasi = mine ?? 0;
  const m = activeMember();
  sec.innerHTML = `${subHeader(L('Peyarchi Palan', 'பெயர்ச்சி பலன்'), L('Guru, Sani, Rahu and Ketu transits for all 12 rasis', 'குரு, சனி, ராகு, கேது பெயர்ச்சி — 12 ராசிகளுக்கும்'))}
    <div class="note-box" role="note">${L('Transit readings are traditional tendencies for a whole Moon sign — not personal guarantees. For money, health or legal decisions, the professional’s advice comes first.', 'பெயர்ச்சி பலன்கள் ஒரு ராசி முழுமைக்குமான பாரம்பரியப் போக்குகள் — தனிப்பட்ட உத்தரவாதம் அல்ல. பணம், உடல்நலம், சட்ட முடிவுகளுக்கு நிபுணர் ஆலோசனையே முதன்மை.')}</div>
    <div id="pyNow">${LOADER}</div>
    <div class="card glass">
      <div class="card-title"><span>${L('Choose your rasi', 'உங்கள் ராசியைத் தேர்ந்தெடுங்கள்')}</span>${mine != null && m ? `<span class="pill">★ ${esc(displayName(m))}</span>` : ''}</div>
      <div class="member-switch py-rasis">${RASIS.map((_, i) => `<button class="mchip${i === pyRasi ? ' sel' : ''}" data-rasi="${i}">${i === mine ? '★ ' : ''}${esc(rasiName(i))}</button>`).join('')}</div>
    </div>
    <div id="pyPalan"></div>
    <div id="pyPeriodCard" class="card glass">
      <div class="card-title"><span>${L('Rasi Palan', 'ராசி பலன்')} · ${esc(rasiName(pyRasi))}</span><button class="link-btn" id="pySpeak" aria-label="${L('Read aloud', 'வாசித்துக் காட்டு')}">🔊</button></div>
      <div class="py-tabs"><button class="chip-btn${pyTab === 'month' ? ' sel' : ''}" data-pytab="month">${L('This month', 'இந்த மாதம்')}</button><button class="chip-btn${pyTab === 'year' ? ' sel' : ''}" data-pytab="year">${L('This year', 'இந்த ஆண்டு')}</button></div>
      <div id="pyPeriod">${LOADER}</div>
    </div>`;
  $$('[data-rasi]', sec).forEach((b) => b.addEventListener('click', () => { pyRasi = Number(b.dataset.rasi); renderPeyarchi(sec); }));
  $$('.py-tabs [data-pytab]', sec).forEach((b) => b.addEventListener('click', () => {
    pyTab = b.dataset.pytab;
    $$('.py-tabs [data-pytab]', sec).forEach((x) => x.classList.toggle('sel', x === b));
    $('#pyPeriod').innerHTML = LOADER;
    later(() => fillPeriod());
  }));
  $('#pySpeak').addEventListener('click', () => speak(speechText()));
  later(() => {
    if (state.view !== 'peyarchi') return;
    const cur = currentPeyarchi(new Date());
    fillNow(cur);
    fillPalan(cur);
    later(() => fillPeriod());
  });
}

function fillNow(cur) {
  $('#pyNow').innerHTML = `<div class="py-grid">${PEYARCHI_PLANETS.map((p) => {
    const c = cur[p];
    return `<div class="card glass rp">
      <span class="gl" style="color:${COLOR[p]}">${GLYPH[p]}</span>
      <b>${esc(planetName(p))} · ${esc(rasiName(c.rasi))}${c.retrograde && p !== 'Rahu' && p !== 'Ketu' ? ` <span class="pill">${L('retro', 'வக்ரம்')}</span>` : ''}</b>
      <small>${L('Since', 'முதல்')}: ${fmtD(c.since)}</small>
      <small>${L('Next', 'அடுத்து')}: ${c.next ? `${esc(rasiName(c.nextRasi))} · ${fmtD(c.next)}${c.nextRetro && p !== 'Rahu' && p !== 'Ketu' ? ` (${L('retro', 'வக்ரம்')})` : ''}` : '—'}</small>
      ${c.next ? remindBtn({ title: L(`${p} peyarchi to ${RASIS[c.nextRasi].en}`, `${planetName(p)} பெயர்ச்சி — ${RASIS[c.nextRasi].ta}`), at: c.next, label: L('Remind', 'நினைவூட்டு') }) : ''}
    </div>`;
  }).join('')}</div>`;
}

let lastPalans = [];
function fillPalan(cur) {
  lastPalans = PEYARCHI_PLANETS.map((p) => ({ p, rasi: cur[p].rasi, x: peyarchiPalan(p, cur[p].rasi, pyRasi) }));
  $('#pyPalan').innerHTML = `<div class="card glass">
    <div class="card-title"><span>${L('Peyarchi Palan for', 'பெயர்ச்சி பலன்')} · ${esc(rasiName(pyRasi))} ${L('rasi', 'ராசி')}</span></div>
    ${lastPalans.map(({ p, rasi, x }) => `<div class="py-palan">
      <div class="hd"><b style="color:${COLOR[p]}">${GLYPH[p]} ${esc(planetName(p))} · ${esc(rasiName(rasi))} <span class="muted small">(${houseLabel(x.house)})</span></b><span class="tag ${TAG[x.level]}">${levelLabel(x.level)}</span></div>
      ${x.special ? `<span class="pill">${esc(bi(x.special))}</span>` : ''}
      <p>${esc(bi(x.text))}</p>
      <p class="rem">🙏 ${esc(bi(x.remedy))}</p>
    </div>`).join('')}
  </div>`;
}

let lastPeriod = null;
function fillPeriod() {
  if (state.view !== 'peyarchi' || !$('#pyPeriod')) return;
  const now = new Date();
  const key = `${pyRasi}|${pyTab}|${isoLocal(now)}|${tz()}`;
  if (!periodCache.has(key)) {
    // Start the window at local midnight today so the dates read naturally.
    const startMs = Date.parse(isoLocal(now)) - tz() * 3600000;
    periodCache.set(key, rasiPalanPeriod(pyRasi, new Date(startMs), pyTab, { tz: tz() }));
  }
  const r = periodCache.get(key);
  lastPeriod = r;
  const area = (k, en, taT, icon) => {
    const a = r.areas[k];
    return `<div class="py-area"><div class="row"><span>${icon} ${L(en, taT)}</span><b>${a.score}</b></div>
      <div class="gb-bar"><i class="${BAR[a.level]}" style="width:${a.score}%"></i></div>
      <p class="muted small">${esc(bi(a.note))}</p></div>`;
  };
  const months = r.months ? `<div class="mini-label" style="margin-top:12px">${L('Month by month', 'மாதவாரியாக')}</div>
    <div class="py-months">${r.months.map((mo) => `<div><span class="muted">${esc(fmtIsoDate(`${mo.month}-01`).split(' ').slice(1).join(' '))}</span>
      <div class="gb-bar"><i class="${BAR[mo.level]}" style="width:${mo.score}%"></i></div></div>`).join('')}</div>` : '';
  const changes = Object.entries(r.changes).flatMap(([p, list]) => list.map((c) => ({ p, ...c }))).sort((a, b) => a.date - b.date);
  $('#pyPeriod').innerHTML = `
    <p class="muted small">${fmtD(r.from)} – ${fmtD(r.to)}</p>
    <div class="py-area"><div class="row"><b>${L('Overall', 'மொத்தம்')}</b><span class="tag ${TAG[r.level]}">${levelLabel(r.level)} · ${r.score}</span></div>
      <div class="gb-bar"><i class="${BAR[r.level]}" style="width:${r.score}%"></i></div></div>
    <p>${esc(bi(r.summary))}</p>
    <div class="factor"><span>☉ ${L('Sun', 'சூரியன்')} · ${houseLabel(r.sun.house)}</span><b class="${r.sun.level === 'good' ? 'pos' : r.sun.level === 'care' ? 'neg' : 'zero'}">${levelLabel(r.sun.level)}</b></div>
    <div class="factor"><span>♂ ${L('Mars', 'செவ்வாய்')} · ${houseLabel(r.mars.house)}</span><b class="${r.mars.level === 'good' ? 'pos' : r.mars.level === 'care' ? 'neg' : 'zero'}">${levelLabel(r.mars.level)}</b></div>
    ${changes.length ? `<div class="mini-label" style="margin-top:12px">${L('Transits in this period', 'இந்தக் காலத்தில் பெயர்ச்சிகள்')}</div>
      ${changes.map((c) => `<div class="factor"><span>${GLYPH[c.p]} ${esc(planetName(c.p))}: ${esc(rasiName(c.fromRasi))} → ${esc(rasiName(c.toRasi))}</span><b>${fmtD(c.date)}</b></div>`).join('')}` : ''}
    ${area('career', 'Career', 'தொழில்', '💼')}
    ${area('money', 'Money', 'பணம்', '💰')}
    ${area('family', 'Family', 'குடும்பம்', '🏠')}
    ${area('health', 'Health', 'உடல்நலம்', '🌿')}
    ${months}
    <div class="mini-label" style="margin-top:12px">${L('Chandrashtamam days', 'சந்திராஷ்டம நாட்கள்')} (${r.chandrashtamamDays})</div>
    <p class="muted small">${L('Go slow on new starts and arguments on these days.', 'இந்த நாட்களில் புதிய தொடக்கங்களையும் வாக்குவாதங்களையும் தவிருங்கள்.')}</p>
    <div class="py-cs">${r.chandrashtamam.map((c) => {
      const a = c.dates[0]; const z = c.dates[c.dates.length - 1];
      return `<span class="pill">${esc(fmtIsoDate(a))}${z !== a ? ` – ${esc(fmtIsoDate(z))}` : ''}</span>`;
    }).join('')}</div>`;
}

function speechText() {
  const parts = [];
  parts.push(L(`${rasiName(pyRasi)} rasi.`, `${rasiName(pyRasi)} ராசி.`));
  if (lastPeriod) parts.push(bi(lastPeriod.summary));
  for (const { p, x } of lastPalans) parts.push(`${gName(p)}: ${bi(x.text)} ${bi(x.remedy)}`);
  return parts.join(' ');
}

registerScreen('peyarchi', { render: renderPeyarchi, parent: 'home' });

// ================================================================ VIRATHA NAATKAL
let vrYear = null;
let vrFilter = 'all';
const vrCache = new Map(); // key -> { months: [...12 arrays or undefined] }

function localYear() { return new Date(Date.now() + tz() * 3600000).getUTCFullYear(); }

function renderVratham(sec) {
  injectCss();
  const loc = state.loc;
  const y0 = localYear();
  if (vrYear == null || (vrYear !== y0 && vrYear !== y0 + 1)) vrYear = y0;
  sec.innerHTML = `${subHeader(L('Viratha Naatkal', 'விரத நாட்கள்'), L('Every vratham and festival day of the year', 'ஆண்டின் அனைத்து விரத, பண்டிகை நாட்கள்'))}
    <div class="card glass">
      <div class="py-tabs">${[y0, y0 + 1].map((y) => `<button class="chip-btn${y === vrYear ? ' sel' : ''}" data-year="${y}">${y}</button>`).join('')}</div>
      <div class="member-switch wrap vr-filter">${[{ id: 'all', en: 'All', ta: 'அனைத்தும்', icon: '📿' }, ...VRATHAM_TYPES]
        .map((t) => `<button class="mchip${vrFilter === t.id ? ' sel' : ''}" data-type="${t.id}">${t.icon} ${esc(bi(t))}<span class="vr-count" data-count="${t.id}"></span></button>`).join('')}</div>
      <p class="muted small">📍 ${esc(placeName(loc?.name || ''))}</p>
    </div>
    <div id="vrList"></div>`;
  $$('[data-year]', sec).forEach((b) => b.addEventListener('click', () => { vrYear = Number(b.dataset.year); renderVratham(sec); }));
  $$('[data-type]', sec).forEach((b) => b.addEventListener('click', () => {
    vrFilter = b.dataset.type;
    $$('[data-type]', sec).forEach((x) => x.classList.toggle('sel', x === b));
    drawVratham();
  }));
  const key = `${vrYear}|${loc.lat}|${loc.lon}|${loc.tz}`;
  if (!vrCache.has(key)) vrCache.set(key, { months: Array(12).fill(null) });
  const entry = vrCache.get(key);
  drawVratham();
  // Compute month by month so the screen stays responsive and fills in progressively.
  const step = () => {
    if (state.view !== 'vratham' || vrCache.get(`${vrYear}|${state.loc.lat}|${state.loc.lon}|${state.loc.tz}`) !== entry) return;
    const m = entry.months.findIndex((x) => x == null);
    if (m < 0) return;
    entry.months[m] = vrathamOfMonth(vrYear, m, loc.lat, loc.lon, loc.tz);
    drawVratham();
    later(step);
  };
  later(step);
}

function vrEntry() {
  const loc = state.loc;
  return vrCache.get(`${vrYear}|${loc.lat}|${loc.lon}|${loc.tz}`);
}

function drawVratham() {
  const box = $('#vrList');
  const entry = vrEntry();
  if (!box || !entry) return;
  const done = entry.months.filter(Boolean).length;
  const all = entry.months.filter(Boolean).flat();
  for (const t of [{ id: 'all' }, ...VRATHAM_TYPES]) {
    const el = document.querySelector(`[data-count="${t.id}"]`);
    if (el) el.textContent = ` · ${t.id === 'all' ? all.length : all.filter((x) => x.type === t.id).length}`;
  }
  const todayIso = isoLocal(new Date());
  let html = '';
  entry.months.forEach((rows, m) => {
    if (!rows) return;
    const list = rows.filter((x) => vrFilter === 'all' || x.type === vrFilter);
    if (!list.length) return;
    const title = fmtIsoDate(`${vrYear}-${String(m + 1).padStart(2, '0')}-01`).split(' ').slice(1).join(' ');
    html += `<div class="card glass vr-month"><div class="card-title"><span>${esc(title)}</span><span class="pill">${list.length}</span></div>
      ${list.map((x, i) => {
        const t = VRATHAM_TYPES.find((v) => v.id === x.type);
        return `<div class="vr-row${x.date === todayIso ? ' today' : x.date < todayIso ? ' past' : ''}">
          <span class="ic">${t ? t.icon : '🪔'}</span>
          <div class="tx"><b>${esc(bi(x))}</b><span>${esc(fmtIsoDate(x.date))} · ${esc(bi(WEEKDAYS[x.weekday]))}</span></div>
          ${x.date >= todayIso ? remindBtn({ title: bi(x), at: localAt(x.date, '06:00') }) : ''}
          <button class="chip-btn" data-ics="${m}:${rows.indexOf(x)}" aria-label="${L('Add to calendar', 'நாட்காட்டியில் சேர்')}">📅</button>
        </div>`;
      }).join('')}</div>`;
  });
  if (done < 12) html += `<div class="card glass">${LOADER}<p class="muted center">${L(`Calculating… ${done}/12 months`, `கணிக்கப்படுகிறது… ${done}/12 மாதங்கள்`)}</p></div>`;
  else if (!html) html = `<div class="card glass"><p class="muted">${L('No days found for this filter.', 'இந்த வகைக்கு நாட்கள் இல்லை.')}</p></div>`;
  box.innerHTML = html;
  $$('[data-ics]', box).forEach((b) => b.addEventListener('click', () => {
    const [m, i] = b.dataset.ics.split(':').map(Number);
    downloadIcs(entry.months[m][i]);
  }));
}

function downloadIcs(x) {
  const d = x.date.replace(/-/g, '');
  const next = new Date(Date.parse(x.date) + 86400000).toISOString().slice(0, 10).replace(/-/g, '');
  const title = `${x.ta} / ${x.en}`.replace(/[,;\\]/g, ' ');
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Thunai//Vratham//TA', 'BEGIN:VEVENT',
    `UID:${d}-${x.type}-${Math.random().toString(36).slice(2)}@kaippesi`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
    `DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${next}`, `SUMMARY:${title}`,
    'BEGIN:VALARM', 'TRIGGER:-PT12H', 'ACTION:DISPLAY', `DESCRIPTION:${title}`, 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  a.download = `${x.date}-${x.type}.ics`;
  document.body.append(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

registerScreen('vratham', { render: renderVratham, parent: 'home', needsLoc: true });
