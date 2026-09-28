import { planetPositions, panchang, birthChart, buildCharts, RASIS, NAKSHATRAS, PLANETS } from './shared/astro.js';
import { CATEGORIES, evaluatePrasna } from './shared/prasna.js';
import { SYSTEM_PROMPT, buildContext, ruleBasedReply } from './shared/narrator.js';
import { searchLocalPlaces } from './shared/places.js';

// Hosted test build (no backend): everything is computed on the device and the
// AI Jothidar answers through the viewer's own Claude account when available.
const STATIC = Boolean(window.KJ_STATIC);

// ---------------------------------------------------------------- i18n
const I18N = {
  en: {
    birthTitle: 'Your Birth Details', birthSub: 'Enter date, exact time and place of birth to cast your South Indian Jathagam.',
    name: 'Name', dob: 'Date of birth', tob: 'Time of birth', pob: 'Place of birth', lat: 'Latitude', lon: 'Longitude', tz: 'UTC offset',
    generate: '✨ Generate My Jathagam', useMyLocation: '📍 Use my location', mandalam: 'Rasi Mandalam · Live Sky',
    gochara: 'Gochara (Transit) Chart', rasiChart: 'Rasi Chart (D1)', navamsaChart: 'Navamsa Chart (D9)',
    askTitle: 'Ask the Jothidar', askSub: 'Choose what you are about to do. The Prasnam is cast for this exact second.',
    askBtn: '🔮 Ask — Do or Don\'t?', jothidarSays: 'Kaippesi Jothidar says', tabLive: 'Live', tabChart: 'Jathagam', tabAsk: 'Prasnam', tabProfile: 'Profile',
    vanakkam: 'Vanakkam', nakshatra: 'Nakshatra', tithi: 'Tithi', moonRasi: 'Moon Rasi', yoga: 'Yoga', karana: 'Karanam', lagna: 'Lagna now',
    endsIn: 'ends in', horai: 'Horai (ஓரை)', currentHorai: 'Current Horai', rahu: 'Rahu Kalam', yama: 'Yamagandam', guligai: 'Guligai',
    activeNow: 'ACTIVE NOW', sunrise: 'Sunrise', sunset: 'Sunset', personal: 'For You Today', tara: 'Tara Bala', chandra: 'Chandra Bala',
    chandrashtama: '⚠️ Chandrashtamam today — avoid important beginnings', dasa: 'Vimshottari Dasa', current: 'current', bhukti: 'Bhukti',
    planet: 'Planet', sign: 'Rasi', degree: 'Degree', star: 'Star', pada: 'Pada', birthDetails: 'Birth Panchangam', weekday: 'Weekday',
    janmaStar: 'Janma Nakshatra', janmaRasi: 'Janma Rasi', lagnaBirth: 'Lagnam', ayanamsa: 'Ayanamsa (Lahiri)', dasaBalance: 'Dasa balance at birth',
    factors: 'Why? — Astrological factors', bestTimes: 'Best times in the next 24 hours', noBest: 'No strongly favourable window in the next 24 hours.',
    score: 'score', questionPh: 'Your question (optional) — e.g. Can I sign the flat agreement today?', thinking: 'Casting the Prasnam…',
    favourable: 'Favourable', unfavourable: 'Unfavourable', neutral: 'Neutral', geoFail: 'Location unavailable — using birth place.',
    years: 'yrs', from: 'From', to: 'To', offline: 'Offline — computed on device.',
  },
  ta: {
    birthTitle: 'பிறப்பு விவரங்கள்', birthSub: 'உங்கள் தென்னிந்திய ஜாதகம் கணிக்க பிறந்த தேதி, நேரம், இடம் உள்ளிடவும்.',
    name: 'பெயர்', dob: 'பிறந்த தேதி', tob: 'பிறந்த நேரம்', pob: 'பிறந்த இடம்', lat: 'அட்சரேகை', lon: 'தீர்க்கரேகை', tz: 'நேர மண்டலம்',
    generate: '✨ ஜாதகம் கணிக்கவும்', useMyLocation: '📍 என் இருப்பிடம்', mandalam: 'ராசி மண்டலம் · நேரலை',
    gochara: 'கோசார கட்டம்', rasiChart: 'ராசி கட்டம்', navamsaChart: 'நவாம்ச கட்டம்',
    askTitle: 'ஜோதிடரிடம் கேளுங்கள்', askSub: 'செய்யப்போகும் காரியத்தைத் தேர்வு செய்யுங்கள். இந்த நொடிக்கான பிரசன்னம் கணிக்கப்படும்.',
    askBtn: '🔮 கேளுங்கள் — செய்யலாமா?', jothidarSays: 'கைப்பேசி ஜோதிடர் பதில்', tabLive: 'நேரலை', tabChart: 'ஜாதகம்', tabAsk: 'பிரசன்னம்', tabProfile: 'சுயவிவரம்',
    vanakkam: 'வணக்கம்', nakshatra: 'நட்சத்திரம்', tithi: 'திதி', moonRasi: 'சந்திர ராசி', yoga: 'யோகம்', karana: 'கரணம்', lagna: 'தற்போதைய லக்னம்',
    endsIn: 'முடிய', horai: 'ஓரை', currentHorai: 'தற்போதைய ஓரை', rahu: 'ராகு காலம்', yama: 'எமகண்டம்', guligai: 'குளிகை',
    activeNow: 'இப்போது', sunrise: 'சூரிய உதயம்', sunset: 'அஸ்தமனம்', personal: 'இன்று உங்களுக்கு', tara: 'தாரா பலம்', chandra: 'சந்திர பலம்',
    chandrashtama: '⚠️ இன்று சந்திராஷ்டமம் — முக்கிய தொடக்கங்களைத் தவிர்க்கவும்', dasa: 'விம்சோத்தரி தசை', current: 'நடப்பு', bhukti: 'புக்தி',
    planet: 'கிரகம்', sign: 'ராசி', degree: 'பாகை', star: 'நட்சத்திரம்', pada: 'பாதம்', birthDetails: 'பிறப்பு பஞ்சாங்கம்', weekday: 'கிழமை',
    janmaStar: 'ஜென்ம நட்சத்திரம்', janmaRasi: 'ஜென்ம ராசி', lagnaBirth: 'லக்னம்', ayanamsa: 'அயனாம்சம் (லாஹிரி)', dasaBalance: 'பிறப்பு தசா இருப்பு',
    factors: 'ஏன்? — ஜோதிடக் காரணங்கள்', bestTimes: 'அடுத்த 24 மணி நேரத்தில் சிறந்த நேரம்', noBest: 'அடுத்த 24 மணி நேரத்தில் வலுவான நல்ல நேரம் இல்லை.',
    score: 'மதிப்பு', questionPh: 'உங்கள் கேள்வி (விருப்பம்) — உ.தா. இன்று ஒப்பந்தம் கையெழுத்திடலாமா?', thinking: 'பிரசன்னம் கணிக்கப்படுகிறது…',
    favourable: 'சாதகம்', unfavourable: 'பாதகம்', neutral: 'சமம்', geoFail: 'இருப்பிடம் கிடைக்கவில்லை — பிறந்த இடம் பயன்படுத்தப்படுகிறது.',
    years: 'ஆண்டு', from: 'தொடக்கம்', to: 'முடிவு', offline: 'ஆஃப்லைன் — சாதனத்தில் கணிக்கப்பட்டது.',
  },
};

const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
};

const state = {
  lang: store.get('kj_lang', 'ta'),
  profile: store.get('kj_profile', null),
  loc: store.get('kj_loc', null),
  chart: null,
  snap: null,
  snapAt: 0,
  tab: 'live',
  category: null,
};

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const t = (k) => I18N[state.lang][k] ?? I18N.en[k] ?? k;
const ta = () => state.lang === 'ta';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const GLYPH = { Sun: '☉', Moon: '☽', Mars: '♂', Mercury: '☿', Jupiter: '♃', Venus: '♀', Saturn: '♄', Rahu: '☊', Ketu: '☋', Lagna: 'Asc' };
const COLOR = { Sun: '#ffb347', Moon: '#e6e9ff', Mars: '#ff7b5c', Mercury: '#7ee2a8', Jupiter: '#ffe066', Venus: '#ff9ed8', Saturn: '#8fb3ff', Rahu: '#c29bff', Ketu: '#d7a57a', Lagna: '#f5c26b' };

const planetName = (k) => (ta() ? PLANETS[k].ta : k);
const rasiName = (i) => (ta() ? RASIS[i].ta : RASIS[i].en);
const nakName = (i) => (ta() ? NAKSHATRAS[i].ta : NAKSHATRAS[i].en);

// ---------------------------------------------------------------- time helpers
const localParts = (d, tz) => new Date(new Date(d).getTime() + tz * 3600000);
function fmtTime(d, tz, sec = false) {
  if (!d) return '—';
  const x = localParts(d, tz);
  const h = x.getUTCHours();
  const m = String(x.getUTCMinutes()).padStart(2, '0');
  const s = String(x.getUTCSeconds()).padStart(2, '0');
  return `${((h + 11) % 12) + 1}:${m}${sec ? `:${s}` : ''} ${h < 12 ? 'AM' : 'PM'}`;
}
function fmtDate(d, tz) {
  const x = localParts(d, tz);
  return `${String(x.getUTCDate()).padStart(2, '0')}-${String(x.getUTCMonth() + 1).padStart(2, '0')}-${x.getUTCFullYear()}`;
}
function countdown(to, now = Date.now()) {
  if (!to) return '—';
  let s = Math.max(0, Math.floor((new Date(to).getTime() - now) / 1000));
  const h = Math.floor(s / 3600); s -= h * 3600;
  const m = Math.floor(s / 60); s -= m * 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ---------------------------------------------------------------- background sky
function startSky() {
  const c = $('#sky');
  const ctx = c.getContext('2d');
  let stars = [];
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = innerWidth * dpr; c.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = Array.from({ length: Math.round((innerWidth * innerHeight) / 2600) }, () => ({
      x: Math.random() * innerWidth, y: Math.random() * innerHeight, r: Math.random() * 1.3 + 0.2,
      p: Math.random() * Math.PI * 2, s: 0.5 + Math.random() * 1.5, gold: Math.random() < 0.12,
    }));
  };
  resize();
  addEventListener('resize', resize);
  let shoot = null;
  const draw = (ts) => {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const st of stars) {
      const a = 0.35 + 0.65 * Math.abs(Math.sin(st.p + (ts / 1000) * st.s));
      ctx.fillStyle = st.gold ? `rgba(255,214,140,${a})` : `rgba(235,230,255,${a})`;
      ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2); ctx.fill();
    }
    if (!shoot && Math.random() < 0.004) shoot = { x: Math.random() * innerWidth, y: Math.random() * innerHeight * 0.4, l: 0 };
    if (shoot) {
      shoot.l += 14;
      const g = ctx.createLinearGradient(shoot.x + shoot.l, shoot.y + shoot.l * 0.5, shoot.x + shoot.l - 90, shoot.y + shoot.l * 0.5 - 45);
      g.addColorStop(0, 'rgba(255,240,200,.9)'); g.addColorStop(1, 'rgba(255,240,200,0)');
      ctx.strokeStyle = g; ctx.lineWidth = 1.6; ctx.beginPath();
      ctx.moveTo(shoot.x + shoot.l, shoot.y + shoot.l * 0.5); ctx.lineTo(shoot.x + shoot.l - 90, shoot.y + shoot.l * 0.5 - 45); ctx.stroke();
      if (shoot.l > 500) shoot = null;
    }
    requestAnimationFrame(draw);
  };
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) requestAnimationFrame(draw);
  else draw(0);
}

// ---------------------------------------------------------------- splash
function splash() {
  const g = $('#splash-signs');
  const glyphs = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];
  g.innerHTML = glyphs.map((s, i) => {
    const a = (i * 30 - 75) * Math.PI / 180;
    const x = 100 + 85 * Math.cos(a), y = 100 + 85 * Math.sin(a);
    const lx = 100 + 96 * Math.cos(a - Math.PI / 12), ly = 100 + 96 * Math.sin(a - Math.PI / 12);
    const ix = 100 + 74 * Math.cos(a - Math.PI / 12), iy = 100 + 74 * Math.sin(a - Math.PI / 12);
    return `<line x1="${ix}" y1="${iy}" x2="${lx}" y2="${ly}" stroke="rgba(245,194,107,.4)"/><text x="${x}" y="${y}" fill="#ffdf9e" font-size="13" text-anchor="middle" dominant-baseline="central">${s}</text>`;
  }).join('');
  return new Promise((res) => setTimeout(() => {
    $('#splash').classList.add('fade');
    setTimeout(() => { $('#splash').remove(); res(); }, 800);
  }, 2600));
}

// ---------------------------------------------------------------- i18n apply
function applyLang() {
  document.body.classList.toggle('ta', ta());
  document.documentElement.lang = state.lang;
  $$('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  $('#question').placeholder = t('questionPh');
  renderCategories();
  if (state.chart) renderChart();
  state.snapAt = 0; // force full live refresh
  if (state.lastAnswer) renderAnswer(state.lastAnswer);
}

// ---------------------------------------------------------------- navigation
function show(tab) {
  state.tab = tab;
  $$('.view').forEach((v) => v.classList.add('hidden'));
  $(`#view-${tab}`).classList.remove('hidden');
  $$('.tabbar button').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  scrollTo({ top: 0, behavior: 'smooth' });
  if (tab === 'live') tick(true);
}

// ---------------------------------------------------------------- profile form
function fillForm() {
  const f = $('#birthForm');
  const p = state.profile;
  if (!p) return;
  for (const k of ['name', 'date', 'time', 'place', 'lat', 'lon', 'tz']) f.elements[k].value = p[k] ?? '';
}

function setupPlaceSearch() {
  const input = $('#birthForm').elements.place;
  const list = $('#placeList');
  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    const q = input.value.trim();
    if (q.length < 2) { list.classList.add('hidden'); return; }
    timer = setTimeout(async () => {
      try {
        let places = searchLocalPlaces(q);
        if (!STATIC && places.length < 3) {
          try { places = await (await fetch(`/api/places?q=${encodeURIComponent(q)}`)).json(); } catch { /* keep local */ }
        }
        list.innerHTML = places.map((p, i) => `<li tabindex="0" data-i="${i}">${esc(p.name)} <small>${esc(p.region)} · UTC${p.tz >= 0 ? '+' : ''}${p.tz}</small></li>`).join('');
        list.classList.toggle('hidden', !places.length);
        $$('li', list).forEach((li) => li.addEventListener('click', () => {
          const p = places[li.dataset.i];
          const f = $('#birthForm');
          f.elements.place.value = p.name; f.elements.lat.value = p.lat; f.elements.lon.value = p.lon; f.elements.tz.value = p.tz;
          list.classList.add('hidden');
        }));
      } catch { list.classList.add('hidden'); }
    }, 220);
  });
  document.addEventListener('click', (e) => { if (!e.target.closest('.place-wrap')) list.classList.add('hidden'); });
}

async function onSubmitBirth(e) {
  e.preventDefault();
  const f = e.target;
  const p = {
    name: f.elements.name.value.trim(), date: f.elements.date.value, time: f.elements.time.value.length === 5 ? `${f.elements.time.value}:00` : f.elements.time.value,
    place: f.elements.place.value.trim(), lat: Number(f.elements.lat.value), lon: Number(f.elements.lon.value), tz: Number(f.elements.tz.value),
  };
  if (!p.lat && !p.lon) { $('#formErr').textContent = 'Please pick a place from the list or enter latitude / longitude.'; return; }
  $('#formErr').textContent = '';
  state.profile = p;
  store.set('kj_profile', p);
  if (!state.loc) setLoc({ lat: p.lat, lon: p.lon, tz: p.tz, name: p.place });
  await loadChart();
  show('chart');
}

function setLoc(loc) {
  state.loc = loc;
  store.set('kj_loc', loc);
  state.snapAt = 0;
}

function geoFail() { $('#liveLoc').textContent = t('geoFail'); }

function useMyLocation() {
  if (!navigator.geolocation) { geoFail(); return; }
  navigator.geolocation.getCurrentPosition(
    (pos) => setLoc({ lat: pos.coords.latitude, lon: pos.coords.longitude, tz: -new Date().getTimezoneOffset() / 60, name: '📍 Current location' }),
    geoFail,
    { enableHighAccuracy: false, timeout: 8000 },
  );
}

// ---------------------------------------------------------------- chart
const reviveDates = (o) => JSON.parse(JSON.stringify(o), (k, v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(v) ? new Date(v) : v));

async function loadChart() {
  const p = state.profile;
  try {
    if (STATIC) throw new Error('static');
    const res = await fetch('/api/chart', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) });
    if (!res.ok) throw new Error((await res.json()).error);
    state.chart = reviveDates(await res.json());
  } catch {
    state.chart = birthChart(p); // fully offline fallback
  }
  renderChart();
}

const SI_POS = { 11: [0, 0], 0: [0, 1], 1: [0, 2], 2: [0, 3], 10: [1, 0], 3: [1, 3], 9: [2, 0], 4: [2, 3], 8: [3, 0], 7: [3, 1], 6: [3, 2], 5: [3, 3] };

function renderSI(el, houses, planets, lagnaRasi, title, sub, showDeg) {
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

function renderChart() {
  const c = state.chart;
  if (!c) return;
  const sub = `${esc(c.name)}<br>${esc(c.date)} · ${esc(c.time.slice(0, 5))}<br>${esc(c.place)}`;
  renderSI($('#rasiChart'), c.charts.rasi, c.planets, c.lagna.rasi, ta() ? 'ராசி' : 'Rasi', sub, true);
  renderSI($('#navamsaChart'), c.charts.navamsa, c.planets, c.lagna.navamsaRasi, ta() ? 'நவாம்சம்' : 'Navamsa', sub, false);

  const bp = c.birthPanchang;
  $('#birthSummary').innerHTML = `<div class="card-title">${t('birthDetails')}</div>
    <dl class="kv">
      <dt>${t('janmaStar')}</dt><dd>${esc(nakName(c.janmaNakshatra.index))} · ${t('pada')} ${c.janmaNakshatra.pada}</dd>
      <dt>${t('janmaRasi')}</dt><dd>${esc(rasiName(c.janmaRasi.index))}</dd>
      <dt>${t('lagnaBirth')}</dt><dd>${esc(rasiName(c.lagna.rasi))} ${esc(c.lagna.dms)}</dd>
      <dt>${t('weekday')}</dt><dd>${esc(ta() ? bp.weekday.ta : bp.weekday.en)}</dd>
      <dt>${t('tithi')}</dt><dd>${esc(ta() ? bp.tithi.ta : `${bp.tithi.paksha} ${bp.tithi.name}`)}</dd>
      <dt>${t('yoga')} / ${t('karana')}</dt><dd>${esc(bp.yoga.name)} / ${esc(bp.karana)}</dd>
      <dt>${t('horai')}</dt><dd>${esc(planetName(bp.horaAtBirth))}</dd>
      <dt>${t('ayanamsa')}</dt><dd>${c.ayanamsa.toFixed(4)}°</dd>
    </dl>`;

  const order = ['Lagna', 'Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
  $('#planetTable').innerHTML = `<div class="card-title">${t('planet')}</div><table>
    <tr><th>${t('planet')}</th><th>${t('sign')}</th><th>${t('degree')}</th><th>${t('star')}</th><th>${t('pada')}</th></tr>
    ${order.map((k) => {
      const p = c.planets[k];
      return `<tr><td class="pl" style="color:${COLOR[k]}">${GLYPH[k]} ${esc(planetName(k))}${p.retrograde && !['Rahu', 'Ketu'].includes(k) ? ' ℞' : ''}</td>
        <td>${esc(rasiName(p.rasi))}</td><td>${esc(p.dms)}</td><td>${esc(nakName(p.nakshatra))}</td><td>${p.pada}</td></tr>`;
    }).join('')}</table>`;

  const now = new Date();
  $('#dasaCard').innerHTML = `<div class="card-title">${t('dasa')}</div>
    <p class="muted small">${t('dasaBalance')}: ${esc(planetName(c.dasa.balance.lord))} ${c.dasa.balance.years.toFixed(2)} ${t('years')}</p>
    <table><tr><th>${t('dasa')}</th><th>${t('from')}</th><th>${t('to')}</th></tr>
    ${c.dasa.periods.map((d) => {
      const cur = now >= d.start && now < d.end;
      const bh = cur ? d.bhuktis.map((b) => {
        const bc = now >= b.start && now < b.end;
        return `<tr class="${bc ? 'current' : ''}"><td style="padding-left:22px">↳ ${esc(planetName(b.lord))} ${t('bhukti')}</td><td>${fmtDate(b.start, c.tz)}</td><td>${fmtDate(b.end, c.tz)}</td></tr>`;
      }).join('') : '';
      return `<tr class="${cur ? 'current' : ''}"><td class="pl">${GLYPH[d.lord]} ${esc(planetName(d.lord))}${cur ? ` · ${t('current')}` : ''}</td><td>${fmtDate(d.start, c.tz)}</td><td>${fmtDate(d.end, c.tz)}</td></tr>${bh}`;
    }).join('')}</table>`;
}

// ---------------------------------------------------------------- live wheel
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
    <text x="-${R1 + 2}" y="-6" fill="#f5c26b" font-size="9">ASC</text>
    <circle r="16" fill="url(#core)"/><g id="zplanets"></g><g id="znak"></g>`;
  wheelBuilt = true;
}

function renderWheel(pos, lagnaLon, moonNak) {
  if (!wheelBuilt) buildWheel();
  $$('#wheel .wr').forEach((el) => { el.textContent = ta() ? RASIS[el.dataset.i].ta.slice(0, 4) : RASIS[el.dataset.i].en.slice(0, 5); });
  $('#zring').setAttribute('transform', `rotate(${lagnaLon - 180})`);
  $$('#wheel .wn').forEach((el) => el.setAttribute('fill', Number(el.dataset.i) === moonNak ? '#ffe066' : '#b7a9d6'));
  // Planets: screen angle = 180 + (L - lagna), counter-clockwise from +x axis.
  const entries = Object.entries(pos).filter(([k]) => k !== 'Lagna').sort((a, b) => a[1].longitude - b[1].longitude);
  const radii = [82, 64, 46];
  let lastLon = -99, lvl = 0;
  const out = entries.map(([k, p]) => {
    lvl = Math.abs(p.longitude - lastLon) < 10 ? (lvl + 1) % 3 : 0;
    lastLon = p.longitude;
    const a = (180 + p.longitude - lagnaLon) * Math.PI / 180;
    const r = radii[lvl];
    const x = r * Math.cos(a), y = -r * Math.sin(a);
    const tx = 100 * Math.cos(a), ty = -100 * Math.sin(a);
    return `<line x1="${x}" y1="${y}" x2="${tx}" y2="${ty}" stroke="${COLOR[k]}" stroke-opacity=".35"/>
      <circle cx="${x}" cy="${y}" r="10" fill="rgba(10,4,30,.85)" stroke="${COLOR[k]}"/>
      <text x="${x}" y="${y}" fill="${COLOR[k]}" font-size="11" text-anchor="middle" dominant-baseline="central">${GLYPH[k]}</text>`;
  }).join('');
  $('#zplanets').innerHTML = out;
}

// ---------------------------------------------------------------- live panchang
function horaQuality(lord) {
  if (['Jupiter', 'Venus', 'Mercury', 'Moon'].includes(lord)) return ['good', t('favourable')];
  if (['Saturn', 'Mars'].includes(lord)) return ['bad', t('unfavourable')];
  return ['warn', t('neutral')];
}

function renderLiveStatic(s, loc) {
  const now = Date.now();
  $('#panchangCards').innerHTML = [
    ['nakshatra', `${nakName(s.nakshatra.index)} · ${t('pada')} ${s.nakshatra.pada}`, s.nakshatra.endsAt, s.nakshatra.progress, 'cdNak'],
    ['tithi', `${ta() ? s.tithi.ta : s.tithi.name}${ta() ? (s.tithi.paksha === 'Shukla' ? ' · வளர்பிறை' : ' · தேய்பிறை') : ` · ${s.tithi.paksha}`}`, s.tithi.endsAt, s.tithi.progress, 'cdTithi'],
    ['moonRasi', rasiName(s.moonRasi.index), s.moonRasi.endsAt, null, 'cdRasi'],
    ['yoga', `${s.yoga.name} · ${s.karana}`, s.yoga.endsAt, null, 'cdYoga'],
  ].map(([k, v, end, prog, id]) => `<div class="card glass">
      <div class="mini-label">${t(k)}</div><div class="mini-value">${esc(v)}</div>
      <div class="mini-sub">${t('endsIn')} <span id="${id}" data-end="${end ? new Date(end).getTime() : ''}">${countdown(end, now)}</span></div>
      <div class="mini-sub">${fmtTime(end, loc.tz)}</div>
      ${prog != null ? `<div class="bar"><i id="${id}Bar" style="width:${(prog * 100).toFixed(1)}%"></i></div>` : ''}
    </div>`).join('');

  const h = s.currentHora;
  const [q, ql] = horaQuality(h.lord);
  $('#horaCard').innerHTML = `<div class="card-title"><span>${t('horai')}</span><span class="muted small">${t('sunrise')} ${fmtTime(s.sunrise, loc.tz)} · ${t('sunset')} ${fmtTime(s.sunset, loc.tz)}</span></div>
    <div class="hora-now">
      <div class="hora-glyph" style="color:${COLOR[h.lord]}">${GLYPH[h.lord]}</div>
      <div style="flex:1">
        <div class="mini-label">${t('currentHorai')}</div>
        <div class="mini-value">${esc(planetName(h.lord))} ${ta() ? 'ஓரை' : 'Horai'}</div>
        <span class="tag ${q}">${ql}</span>
      </div>
      <div style="text-align:right"><div class="mini-label">${t('endsIn')}</div><div class="countdown" id="cdHora" data-end="${new Date(h.end).getTime()}">${countdown(h.end, now)}</div></div>
    </div>
    <div class="hora-list">${s.horai.map((x) => {
      const cls = now >= new Date(x.start).getTime() && now < new Date(x.end).getTime() ? 'now' : now >= new Date(x.end).getTime() ? 'past' : '';
      return `<div class="hora-item ${cls}"><b style="color:${COLOR[x.lord]}">${GLYPH[x.lord]} ${esc(ta() ? PLANETS[x.lord].short : x.lord.slice(0, 3))}</b>${fmtTime(x.start, loc.tz)}</div>`;
    }).join('')}</div>`;
  setTimeout(() => $('.hora-item.now')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }), 50);

  const k = (key, r, active) => `<div class="${active ? 'active' : ''}"><b>${t(key)}</b>${fmtTime(r.start, loc.tz)}<br>${fmtTime(r.end, loc.tz)}${active ? `<br><span class="tag bad">${t('activeNow')}</span>` : ''}</div>`;
  $('#kalamCard').innerHTML = `<div class="kalam">${k('rahu', s.rahuKalam, s.inRahuKalam)}${k('yama', s.yamagandam, s.inYamagandam)}${k('guligai', s.guligai, s.inGuligai)}</div>`;

  const c = state.chart;
  const pc = $('#personalCard');
  if (c) {
    const tIdx = ((s.nakshatra.index - c.janmaNakshatra.index + 27) % 27) % 9;
    const TARA = [['Janma', 'ஜன்ம', 'warn'], ['Sampat', 'சம்பத்', 'good'], ['Vipat', 'விபத்', 'bad'], ['Kshema', 'க்ஷேம', 'good'], ['Pratyak', 'பிரத்யக்', 'bad'], ['Sadhana', 'சாதக', 'good'], ['Naidhana', 'நைதன', 'bad'], ['Mitra', 'மித்ர', 'good'], ['Parama Mitra', 'பரம மித்ர', 'good']][tIdx];
    const pos = ((s.moonRasi.index - c.janmaRasi.index + 12) % 12) + 1;
    const cb = [1, 3, 6, 7, 10, 11].includes(pos);
    const d = c.dasa.current;
    pc.classList.remove('hidden');
    pc.innerHTML = `<div class="card-title">${t('personal')} · ${esc(c.name)}</div>
      <dl class="kv">
        <dt>${t('tara')}</dt><dd>${ta() ? TARA[1] : TARA[0]} <span class="tag ${TARA[2]}">${TARA[2] === 'good' ? t('favourable') : TARA[2] === 'bad' ? t('unfavourable') : t('neutral')}</span></dd>
        <dt>${t('chandra')}</dt><dd>${pos} <span class="tag ${pos === 8 ? 'bad' : cb ? 'good' : 'warn'}">${pos === 8 ? 'Chandrashtamam' : cb ? t('favourable') : t('neutral')}</span></dd>
        ${d ? `<dt>${t('dasa')}</dt><dd>${esc(planetName(d.lord))} / ${esc(planetName(c.dasa.currentBhukti?.lord || d.lord))} ${t('bhukti')}</dd>` : ''}
      </dl>${pos === 8 ? `<p class="tag bad" style="display:block;margin-top:10px">${t('chandrashtama')}</p>` : ''}`;
  } else pc.classList.add('hidden');
}

function tick(force = false) {
  if (!state.loc || state.tab !== 'live') return;
  const loc = state.loc;
  const now = new Date();
  $('#clock').textContent = fmtTime(now, loc.tz, true);
  // Full panchang refresh every minute or whenever any running period has ended.
  const ends = $$('[data-end]').map((e) => Number(e.dataset.end)).filter(Boolean);
  if (force || !state.snap || now - state.snapAt > 60000 || ends.some((e) => e <= now.getTime())) {
    state.snap = panchang(now, loc.lat, loc.lon, loc.tz);
    state.snapAt = now.getTime();
    const s = state.snap;
    $('#greet').textContent = `🙏 ${t('vanakkam')}${state.profile ? `, ${state.profile.name}` : ''}`;
    $('#liveDate').textContent = `${fmtDate(now, loc.tz)} · ${ta() ? s.weekday.ta : s.weekday.en}`;
    $('#liveLoc').textContent = `📍 ${loc.name || ''} (${loc.lat.toFixed(2)}, ${loc.lon.toFixed(2)}, UTC${loc.tz >= 0 ? '+' : ''}${loc.tz})`;
    renderLiveStatic(s, loc);
  }
  // Every second: countdowns + moving sky (Lagna advances ~1° every 4 minutes).
  for (const el of $$('[data-end]')) el.textContent = countdown(Number(el.dataset.end), now.getTime());
  const { planets } = planetPositions(now, loc.lat, loc.lon);
  renderWheel(planets, planets.Lagna.longitude, planets.Moon.nakshatra);
  $('#lagnaNow').textContent = `${t('lagna')}: ${rasiName(planets.Lagna.rasi)} ${planets.Lagna.dms} · ☽ ${nakName(planets.Moon.nakshatra)} ${planets.Moon.dms}`;
  const nb = $('#cdNakBar');
  if (nb) nb.style.width = `${(((planets.Moon.longitude % (360 / 27)) / (360 / 27)) * 100).toFixed(2)}%`;
  const houses = buildCharts(planets).rasi;
  renderSI($('#gocharaChart'), houses, planets, planets.Lagna.rasi, ta() ? 'கோசாரம்' : 'Gochara', `${fmtTime(now, loc.tz, true)}`, true);
}

// ---------------------------------------------------------------- Prasnam
function renderCategories() {
  $('#catGrid').innerHTML = CATEGORIES.map((c) => `<button class="cat${state.category === c.id ? ' sel' : ''}" data-id="${c.id}"><span class="ci">${c.icon}</span>${esc(ta() ? c.ta : c.en)}</button>`).join('');
  $$('#catGrid .cat').forEach((b) => b.addEventListener('click', () => {
    state.category = b.dataset.id;
    $$('#catGrid .cat').forEach((x) => x.classList.toggle('sel', x === b));
    $('#askBtn').disabled = false;
  }));
}

function gauge(score, verdict) {
  const col = verdict === 'DO' ? '#4ade80' : verdict === 'CAUTION' ? '#fbbf24' : '#f87171';
  const C = 2 * Math.PI * 70;
  return `<div class="gauge"><svg viewBox="0 0 170 170"><circle cx="85" cy="85" r="70" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="12"/>
    <circle cx="85" cy="85" r="70" fill="none" stroke="${col}" stroke-width="12" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C}" style="transition:stroke-dashoffset 1.2s ease;filter:drop-shadow(0 0 8px ${col})" id="gArc" data-off="${C * (1 - score / 100)}"/></svg>
    <div class="num" style="color:${col}"><div>${score}<small>${t('score')} / 100</small></div></div></div>`;
}

function renderAnswer(a) {
  const loc = state.loc;
  const cat = CATEGORIES.find((c) => c.id === a.category);
  $('#verdictCard').innerHTML = `<div class="muted small">${cat.icon} ${esc(ta() ? cat.ta : cat.en)} · ${fmtTime(a.snapshot.at, loc.tz, true)}</div>
    ${gauge(a.score, a.verdict)}
    <div class="verdict-big ${a.verdict}">${a.verdict === 'DO' ? '✅' : a.verdict === 'CAUTION' ? '⚠️' : '⛔'} ${esc(ta() ? a.verdictText.ta : a.verdictText.en)}</div>
    <div class="muted small" style="margin-top:6px">${t('horai')}: ${esc(planetName(a.snapshot.currentHora.lord))} · ${t('nakshatra')}: ${esc(nakName(a.snapshot.nakshatra.index))} · ${t('lagna')}: ${esc(rasiName(a.snapshot.lagna.rasi))}</div>`;
  requestAnimationFrame(() => requestAnimationFrame(() => { const g = $('#gArc'); if (g) g.style.strokeDashoffset = g.dataset.off; }));
  $('#factorCard').innerHTML = `<div class="card-title">${t('factors')}</div>${a.factors.map((f) => `<div class="factor"><span>${esc(ta() ? f.labelTa : f.label)}</span><b class="${f.points > 0 ? 'pos' : f.points < 0 ? 'neg' : 'zero'}">${f.points > 0 ? '+' : ''}${f.points}</b></div>`).join('')}`;
  $('#bestCard').innerHTML = `<div class="card-title">🕰️ ${t('bestTimes')}</div>${a.bestTimes.length ? a.bestTimes.map((w) => `<div class="best">🌟 ${fmtDate(w.start, loc.tz)} · <b>${fmtTime(w.start, loc.tz)} – ${fmtTime(w.end, loc.tz)}</b><br><span class="muted small">${t('score')} ${w.best} · ${esc(planetName(w.hora))} ${ta() ? 'ஓரை' : 'Horai'}</span></div>`).join('') : `<p class="muted">${t('noBest')}</p>`}`;
}

/** Evaluate the Prasnam on the device; narrate with Claude (hosted build) or the rule-based Jothidar. */
async function askOnDevice(body) {
  const c = state.chart;
  const birth = c && { janmaNakshatra: c.janmaNakshatra.index, janmaRasi: c.janmaRasi.index };
  const evaluation = evaluatePrasna({ at: new Date(), category: body.category, loc: body.loc, birth });
  const a = { category: body.category, score: evaluation.score, verdict: evaluation.verdict, verdictText: evaluation.verdictText, factors: evaluation.factors, bestTimes: evaluation.bestTimes, snapshot: evaluation.snapshot };
  state.lastAnswer = a;
  renderAnswer(a);
  $('#verdictCard').scrollIntoView({ behavior: 'smooth' });
  const profile = c && {
    name: c.name, janmaNakshatraName: c.janmaNakshatra.name, janmaRasiName: c.janmaRasi.name, lagnaName: c.lagna.rasiName,
    currentDasa: c.dasa.current && `${c.dasa.current.lord} Dasa / ${c.dasa.currentBhukti?.lord} Bhukti`,
  };
  const ctx = buildContext({ evaluation, question: body.question, category: body.category, lang: body.lang, profile, loc: body.loc });
  const sample = STATIC && window.claude ? await window.claude.use('sample').catch(() => null) : null;
  if (sample) {
    $('#reply').textContent = t('thinking');
    try {
      await sample(`${SYSTEM_PROMPT}\n\nHere is the computed Prasna data (JSON):\n${JSON.stringify(ctx, null, 2)}\n\nAnswer the person's question now in ${ctx.replyLanguage}.`, {
        cache: false,
        onText: ({ text }) => { $('#reply').textContent = text; },
      });
      $('#aiSource').textContent = '✨ AI';
      return;
    } catch { /* not allowed or unavailable: fall through to the rule-based Jothidar */ }
  }
  $('#reply').textContent = ruleBasedReply(ctx, evaluation, body.lang);
  $('#aiSource').textContent = '📜 Rules';
}

async function ask() {
  if (!state.category || !state.loc) return;
  const btn = $('#askBtn');
  btn.disabled = true;
  $('#answer').classList.remove('hidden');
  $('#verdictCard').innerHTML = `<div class="loader"><i></i><i></i><i></i></div><p class="muted">${t('thinking')}</p>`;
  $('#reply').textContent = '';
  $('#reply').classList.add('typing');
  $('#factorCard').innerHTML = ''; $('#bestCard').innerHTML = ''; $('#aiSource').textContent = '';
  const body = { category: state.category, question: $('#question').value.trim(), lang: state.lang, loc: state.loc, birth: state.profile };
  try {
    if (STATIC) throw new Error('static');
    const res = await fetch('/api/ask', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' }, body: JSON.stringify(body) });
    if (!res.ok || !res.body) throw new Error('network');
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf('\n\n')) >= 0) {
        const chunk = buf.slice(0, i); buf = buf.slice(i + 2);
        const ev = /event: (\w+)/.exec(chunk)?.[1];
        const data = JSON.parse(/data: (.*)/s.exec(chunk)?.[1] || '{}');
        if (ev === 'evaluation') { state.lastAnswer = data; renderAnswer(data); $('#verdictCard').scrollIntoView({ behavior: 'smooth' }); }
        else if (ev === 'delta') $('#reply').textContent += data.text;
        else if (ev === 'reset') $('#reply').textContent = '';
        else if (ev === 'done') $('#aiSource').textContent = data.source === 'ai' ? '✨ AI' : '📜 Rules';
      }
    }
  } catch {
    await askOnDevice(body);
  } finally {
    $('#reply').classList.remove('typing');
    btn.disabled = false;
  }
}

// ---------------------------------------------------------------- boot
async function boot() {
  startSky();
  await splash();
  $('#app').classList.remove('hidden');
  applyLang();
  $('#langBtn').addEventListener('click', () => { state.lang = ta() ? 'en' : 'ta'; store.set('kj_lang', state.lang); applyLang(); tick(true); });
  $$('.tabbar button').forEach((b) => b.addEventListener('click', () => {
    if (!state.profile && b.dataset.tab !== 'profile') { show('profile'); return; }
    show(b.dataset.tab);
  }));
  $('#birthForm').addEventListener('submit', onSubmitBirth);
  $('#geoBtn').addEventListener('click', useMyLocation);
  $('#askBtn').addEventListener('click', ask);
  setupPlaceSearch();
  fillForm();
  if (state.profile) {
    if (!state.loc) setLoc({ lat: state.profile.lat, lon: state.profile.lon, tz: state.profile.tz, name: state.profile.place });
    show('live');
    loadChart().then(() => tick(true));
  } else {
    show('profile');
  }
  setInterval(() => tick(), 1000);
  if (STATIC) $('#geoBtn').classList.add('hidden');
  if (!STATIC && 'serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
}

boot();
