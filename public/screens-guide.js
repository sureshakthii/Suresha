// Personal guide (என் வழிகாட்டி) for every family member, and a big, simple Panchangam (பஞ்சாங்கம்)
// for elders with a quick "vibe" card for the young generation.
import { NAKSHATRAS, RASIS, panchang } from './shared/astro.js';
import { tamilDay, offsetOnDay } from './shared/tamilcal.js';
import { personalGuide, DAY_COLOR } from './shared/personal.js';
import { faithOf, TRADITIONAL_OPTIONAL } from './shared/faith.js';
import {
  state, $, $$, L, ta, esc, bi, GLYPH, COLOR, planetName, rasiName, nakName, fmtTime, fmtDate, activeMember, chartOf,
  registerScreen, subHeader, speak, stopSpeaking, toast, displayName, placeName, yogaName, saveSettings, copyright, BRAND,
  localYMD, fmtIsoDate, fmtTimeRange, untilL, tithiName
} from './core.js';
import { dayOutlook, starRasiText } from './screens-main.js';
import { isLocked, lockCard } from './growth.js';
import { remindBtn } from './remind.js';

const WEEK_TA = ['ஞாயிறு', 'திங்கள்', 'செவ்வாய்', 'புதன்', 'வியாழன்', 'வெள்ளி', 'சனி'];
const WEEK_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const dayName = (i) => (ta() ? WEEK_TA[i] : WEEK_EN[i]);
const people = () => state.family.filter((m) => m.relation !== 'organization');
// A mantra: Tamil script on Tamil screens; on English screens the Latin-letter form first, the Tamil script under it.
const mantraHtml = (taText, enText) => (ta() || !enText || enText === taText ? esc(taText) : `${esc(enText)}<br><span class="muted" lang="ta">${esc(taText)}</span>`);
const swatch = (c, big = false) => `<span class="swatch${big ? ' big' : ''}" style="background:${c.hex}" aria-hidden="true"></span>`;

/** "Guru Vakku" — today's personal word from Thunai for the active member: outlook, colour, number. Used on home. */
export function todayColorCard() {
  const m = activeMember();
  if (!m || m.relation === 'organization') return '';
  const c = chartOf(m);
  const g = personalGuide(c, { date: m.date, faith: faithOf(m) });
  const snap = state.snap || panchang(new Date(), state.loc.lat, state.loc.lon, state.loc.tz);
  const o = dayOutlook(c, snap);
  // The verdict word is the one shared day label (shared/daily.js DAY_LABEL) — the same as Today and the family list.
  const tail = {
    good: L('begin important work with confidence.', 'முக்கிய வேலைகளைத் தைரியமாகத் தொடங்குங்கள்.'),
    warn: !g.hindu ? L('plan well and keep a quiet moment of prayer in your own way.', 'திட்டமிட்டுச் செயல்படுங்கள்; உங்கள் வழியில் சிறிது நேரம் அமைதியான பிரார்த்தனை.') : L('plan well and remember your Ishta Theivam.', 'திட்டமிட்டுச் செயல்படுங்கள், இஷ்ட தெய்வத்தை நினையுங்கள்.'),
    bad: !g.hindu ? L('postpone new starts and take a few quiet minutes of prayer in your own faith.', 'புதிய முயற்சிகளைத் தள்ளிவைத்து, உங்கள் நம்பிக்கைப்படி சில நிமிட அமைதியான பிரார்த்தனை.') : L(`postpone new starts and chant ${g.ishta.mantraEn || g.ishta.mantra}.`, `புதிய முயற்சிகளைத் தள்ளிவைத்து "${g.ishta.mantra}" சொல்லுங்கள்.`),
  }[o.overall];
  const word = `${bi(o.label)} — ${tail}`;
  return `<div class="card glass color-today guru" data-go="guide">${swatch(g.today, true)}
    <div style="flex:1;min-width:0"><div class="mini-label">🙏 ${L('Guru Vakku', 'குரு வாக்கு')} · ${esc(displayName(m))}</div>
      <div class="small">${esc(word)}</div>
      <div class="muted small">👕 ${esc(bi(g.today))} · 🔢 ${g.numbers.birth}${g.hindu ? ` · 🙏 ${esc(bi(g.ishta.deity))}` : ''}</div></div><span class="chev">›</span></div>`;
}

// ================================================================ PERSONAL GUIDE
const guideUi = { id: null, active: null, playing: false };
let wakeLock = null;
async function keepAwake(on) {
  try {
    if (on && 'wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen');
    else { await wakeLock?.release(); wakeLock = null; }
  } catch { /* not granted */ }
}

function renderGuide(sec) {
  const pool = people();
  // A person picked on this screen is kept while it is open, but switching the active person elsewhere wins.
  if (guideUi.active !== state.activeId) { guideUi.active = state.activeId; guideUi.id = null; }
  const m = pool.find((x) => x.id === guideUi.id) || (activeMember()?.relation !== 'organization' ? activeMember() : pool[0]);
  if (!m) { sec.innerHTML = `${subHeader(L('My Guide', 'என் வழிகாட்டி'))}<p class="muted center">${L('Add a family member first.', 'முதலில் குடும்ப உறுப்பினரைச் சேர்க்கவும்.')}</p>`; return; }
  guideUi.id = m.id;
  const c = chartOf(m);
  const g = personalGuide(c, { date: m.date, faith: faithOf(m) });
  // Unknown birth time: no Lagna (chart.lagna / planets.Lagna are empty) — say so instead of failing.
  const lagnaRasi = c.lagna?.rasi ?? c.planets?.Lagna?.rasi ?? null;
  const locked = isLocked('predictions');
  sec.innerHTML = `${subHeader(L('My Guide', 'என் வழிகாட்டி'), L('Lucky number, colour, Ishta Theivam, gemstones, Siddhar and your own mantra playlist', 'அதிர்ஷ்ட எண், நிறம், இஷ்ட தெய்வம், ரத்தினம், சித்தர், உங்கள் மந்திரப் பட்டியல்'))}
    ${pool.length > 1 ? `<div class="member-switch">${pool.map((x) => `<button class="mchip${x.id === m.id ? ' sel' : ''}" data-gid="${esc(x.id)}">${esc(displayName(x))}</button>`).join('')}</div>` : ''}
    <div class="card glass guide-head"><div class="g-avatar">${GLYPH[g.lagnaLord || RASIS[c.janmaRasi.index].lord] || '☽'}</div><div><b>${esc(displayName(m))}</b>
      <div class="muted small">${lagnaRasi == null ? L('Lagna needs the birth time', 'லக்னத்திற்குப் பிறந்த நேரம் தேவை') : `${L('Lagna', 'லக்னம்')}: ${esc(rasiName(lagnaRasi))}`} · ${esc(starRasiText(m, c))}</div></div></div>

    <div class="card glass"><div class="card-title">👕 ${L('Colour to wear today', 'இன்று அணிய வேண்டிய நிறம்')}</div>
      <div class="color-big">${swatch(g.today, true)}<div><b>${esc(bi(g.today))}</b><p class="small">${esc(bi(g.today.note))}</p></div></div>
      <div class="week-colors">${g.week.map((d) => `<div class="wc${d.weekday === new Date().getDay() ? ' now' : ''}">${swatch(d)}<span>${dayName(d.weekday)}</span></div>`).join('')}</div>
      <p class="muted small">${L('Always lucky for you', 'எப்போதும் உங்களுக்கு ஏற்ற நிறங்கள்')}: ${g.luckyColors.map((x) => `${swatch(x)} ${esc(bi(x))}`).join(' · ')}</p></div>

    <div class="card glass"><div class="card-title">🔢 ${L('Lucky numbers', 'அதிர்ஷ்ட எண்கள்')}</div>
      <div class="num-row"><div class="num"><b>${g.numbers.birth}</b><span>${L('Birth number', 'பிறவி எண்')}<br>${GLYPH[g.numbers.birthPlanet]} ${esc(planetName(g.numbers.birthPlanet))}</span></div>
        <div class="num"><b>${g.numbers.destiny}</b><span>${L('Destiny number', 'விதி எண்')}<br>${GLYPH[g.numbers.destinyPlanet]} ${esc(planetName(g.numbers.destinyPlanet))}</span></div></div>
      <div class="factor"><span>✨ ${L('Lucky numbers', 'அதிர்ஷ்ட எண்கள்')}</span><b class="pos">${g.numbers.lucky.join(', ')}</b></div>
      ${g.numbers.avoid.length ? `<div class="factor"><span>🚫 ${L('Less favourable', 'தவிர்க்க வேண்டிய எண்கள்')}</span><b class="neg">${g.numbers.avoid.join(', ')}</b></div>` : ''}
      <div class="factor"><span>📅 ${L('Lucky dates every month', 'ஒவ்வொரு மாதமும் அதிர்ஷ்ட தேதிகள்')}</span><b class="zero">${g.numbers.luckyDates.join(', ')}</b></div></div>

    ${g.hindu ? '' : `<div class="card glass"><div class="card-title">🙏 ${L('A practice for you', 'உங்களுக்கான எளிய வழி')}</div><p>${esc(bi(g.practice))}</p>${g.blessing ? `<p class="small">${esc(bi(g.blessing))}</p>` : ''}</div>`}
    ${g.hindu ? '' : `<details class="card glass disclose"><summary>${L('Traditional Hindu guidance (optional)', 'இந்து மரபு வழிகாட்டல் (விருப்பம்)')}</summary><p class="small muted">${esc(bi(TRADITIONAL_OPTIONAL))}</p>`}
    <div class="card glass"><div class="card-title">🙏 ${L('Ishta Theivam', 'இஷ்ட தெய்வம்')}</div>
      <p class="big-line">${esc(bi(g.ishta.deity))}</p><p class="small">🕉️ ${mantraHtml(g.ishta.mantra, g.ishta.mantraEn)}</p>
      <p class="small">⭐ ${L('Your birth-star deity', 'உங்கள் நட்சத்திர வழிபாட்டுத் தெய்வம்')}: <b>${esc(bi(g.ishta.starDeity))}</b></p>
      <p class="muted small">${L('How we found it', 'கணக்கு')}: ${esc(bi(g.ishta.why))}</p></div>
    ${g.hindu ? '' : '</details>'}

    ${locked ? lockCard(L('Gemstones, your Siddhar and your personal mantra playlist are part of the Personal plan.', 'ரத்தினங்கள், உங்கள் சித்தர், தனிப்பட்ட மந்திரப் பட்டியல் தனிநபர் திட்டத்தில் உள்ளன.')) : `
    <div class="card glass"><div class="card-title">💎 ${L('Gemstones', 'ரத்தினங்கள்')}</div>
      <div class="mini-label">✅ ${L('Suitable for you', 'உங்களுக்கு ஏற்றவை')}</div>
      ${g.gems.good.map((x) => `<div class="factor"><span>${GLYPH[x.planet]} <b>${esc(bi(x.gem))}</b>${x.primary ? ` <span class="tag good">${L('Main', 'முதன்மை')}</span>` : ''}<br><small class="muted">${esc(bi(x.role))}</small></span></div>`).join('')}
      <div class="mini-label">⛔ ${L('Avoid', 'தவிர்க்க வேண்டியவை')}</div>
      ${g.gems.avoid.map((x) => `<div class="factor"><span>${GLYPH[x.planet]} ${esc(bi(x.gem))}<br><small class="muted">${esc(bi(x.role))}</small></span></div>`).join('')}
      <p class="muted small">⚠️ ${esc(bi(g.gems.note))}</p></div>

    ${g.hindu ? '' : `<details class="card glass disclose"><summary>${L('Siddhar tradition (optional)', 'சித்தர் மரபு (விருப்பம்)')}</summary>`}
    <div class="card glass siddhar"><div class="card-title">🧘 ${L('Your Siddhar', 'உங்கள் சித்தர்')} <span class="pill">${L('Our proposal', 'எங்கள் பரிந்துரை')}</span></div>
      <p class="big-line">${esc(bi(g.siddhar.main))}</p><p class="small">📍 ${L('Jeeva Samadhi', 'ஜீவ சமாதி')}: ${esc(bi(g.siddhar.main.place))}</p>
      <p class="small">🕉️ ${mantraHtml(g.siddhar.main.mantra, g.siddhar.main.mantraEn)}</p>
      ${g.siddhar.second ? `<p class="small">➕ ${L('Also', 'மேலும்')}: <b>${esc(bi(g.siddhar.second))}</b> (${esc(bi(g.siddhar.second.place))})</p>` : ''}
      <p class="muted small">${esc(bi(g.siddhar.why))}</p><p class="small">${esc(bi(g.siddhar.howTo))}</p></div>
    ${g.hindu ? '' : '</details>'}


    ${g.playlist.length ? `<div class="card glass"><div class="card-title"><span>🎧 ${L('My mantra playlist', 'என் மந்திரப் பாடல் பட்டியல்')}</span></div>
      <p class="muted small">${L('Made from your chart — listen in the morning, while travelling or before sleep.', 'உங்கள் ஜாதகத்திலிருந்து உருவானது — காலையில், பயணத்தில், உறங்கும் முன் கேளுங்கள்.')}</p>
      <button class="btn-gold" id="plAll">${guideUi.playing ? `⏹ ${L('Stop', 'நிறுத்து')}` : `▶️ ${L('Play all', 'அனைத்தையும் ஒலி')}`}</button>
      ${g.playlist.map((p, i) => `<div class="pl-item" id="pl-${i}"><button class="play-btn" data-pl="${i}" aria-label="${esc(L('Play', 'ஒலி'))}">▶</button>
        <div style="flex:1;min-width:0"><b>${esc(bi(p.title))}</b><div class="small">${mantraHtml(p.text, p.textEn)}</div><div class="muted small">${esc(bi(p.why))} · ×${p.repeat}</div></div><span class="pl-count" id="plc-${i}"></span></div>`).join('')}
      <p class="muted small">${L('Uses your phone\'s Tamil voice. If silent: Settings → Google Text-to-speech → install Tamil.', 'உங்கள் கைப்பேசியின் தமிழ் குரலைப் பயன்படுத்தும். ஒலிக்காவிட்டால்: Settings → Google Text-to-speech → தமிழ் நிறுவவும்.')}</p></div>` : ''}`}
    <div class="btn-row"><button class="chip-btn" data-go="parigaram">🪔 ${L('Parigaram', 'பரிகாரம்')}</button>${g.hindu ? `<button class="chip-btn" data-go="temples">🛕 ${L('Temples', 'கோவில்கள்')}</button>` : ''}<button class="chip-btn" data-go="analysis">📜 ${L('Full analysis', 'முழு ஆய்வு')}</button></div>`;

  $$('[data-gid]', sec).forEach((b) => b.addEventListener('click', () => { stopPlaylist(); guideUi.id = b.dataset.gid; renderGuide(sec); }));
  const playOne = async (i) => {
    const p = g.playlist[i];
    $$('.pl-item', sec).forEach((x) => x.classList.toggle('playing', x.id === `pl-${i}`));
    for (let k = 0; k < p.repeat && guideUi.playing; k++) {
      const ok = await speak(p.text, { rate: 0.82 });
      if (!ok) { guideUi.playing = false; break; }
      const cnt = $(`#plc-${i}`);
      if (cnt) cnt.textContent = `${k + 1}/${p.repeat}`;
    }
  };
  $$('[data-pl]', sec).forEach((b) => b.addEventListener('click', async () => {
    stopPlaylist(); guideUi.playing = true; keepAwake(true);
    await playOne(Number(b.dataset.pl));
    stopPlaylist();
  }));
  $('#plAll')?.addEventListener('click', async () => {
    if (guideUi.playing) { stopPlaylist(); renderGuide(sec); return; }
    guideUi.playing = true; keepAwake(true); $('#plAll').textContent = `⏹ ${L('Stop', 'நிறுத்து')}`;
    for (let i = 0; i < g.playlist.length && guideUi.playing; i++) await playOne(i);
    stopPlaylist();
    if (state.view === 'guide') renderGuide(sec);
  });
}
function stopPlaylist() { guideUi.playing = false; stopSpeaking(); keepAwake(false); $$('.pl-item').forEach((x) => x.classList.remove('playing')); }
document.addEventListener('kj:screen', (e) => { if (e.detail !== 'guide' && guideUi.playing) stopPlaylist(); });
registerScreen('guide', { render: renderGuide, parent: 'home', needsMember: true });

// ================================================================ PANCHANGAM
// Soolam: direction to avoid travelling towards on each weekday, and the parigaram if travel is unavoidable.
const SOOLAM = [
  ['West', 'மேற்கு', 'Jaggery', 'வெல்லம்'], ['East', 'கிழக்கு', 'Curd', 'தயிர்'], ['North', 'வடக்கு', 'Milk', 'பால்'], ['North', 'வடக்கு', 'Milk', 'பால்'],
  ['South', 'தெற்கு', 'Oil (thailam)', 'தைலம்'], ['West', 'மேற்கு', 'Jaggery', 'வெல்லம்'], ['East', 'கிழக்கு', 'Curd', 'தயிர்'],
];
// Daily rasi palan from the Moon's position counted from each janma rasi.
const PALAN = {
  1: ['warn', 3, 'Moon in your sign — keep calm, avoid hasty words.', 'ஜென்ம சந்திரன் — மனதில் சிறு சஞ்சலம், நிதானமாகப் பேசுங்கள்.'],
  2: ['warn', 3, 'Mixed money matters; speak gently with family.', 'பண வரவு கலவை; குடும்பத்தில் இனிமையாகப் பேசுங்கள்.'],
  3: ['good', 5, 'Courage and success — efforts bear fruit.', 'தைரியம், வெற்றி — முயற்சிகள் பலிக்கும்.'],
  4: ['warn', 3, 'Take care of home and mother; drive carefully.', 'வீடு, தாய் நலனில் கவனம்; வாகனத்தில் கவனம்.'],
  5: ['warn', 3, 'Think twice before decisions; children bring news.', 'முடிவுகளை யோசித்து எடுங்கள்; பிள்ளைகளால் செய்தி.'],
  6: ['good', 4, 'Obstacles clear, health improves, debts reduce.', 'தடைகள் விலகும், ஆரோக்கியம் சீராகும், கடன் குறையும்.'],
  7: ['good', 4, 'Good for partnerships, meetings and travel.', 'கூட்டு முயற்சி, சந்திப்பு, பயணம் நன்று.'],
  8: ['bad', 1, 'Chandrashtamam — avoid new starts and arguments; pray and rest.', 'சந்திராஷ்டமம் — புதிய முயற்சி, வாக்குவாதம் தவிர்க்கவும்; வழிபட்டு ஓய்வெடுங்கள்.'],
  9: ['warn', 4, 'Blessings of elders; a good day for prayer.', 'பெரியோர் ஆசி; வழிபாட்டிற்கு நல்ல நாள்.'],
  10: ['good', 5, 'Progress and praise at work.', 'தொழிலில் முன்னேற்றம், பாராட்டு.'],
  11: ['good', 5, 'Gains and good news.', 'லாபம், நல்ல செய்தி.'],
  12: ['warn', 2, 'Expenses — spend wisely and rest well.', 'செலவுகள் — கவனமாகச் செலவிட்டு நன்கு ஓய்வெடுங்கள்.'],
};
const starsInRasi = (r) => [...new Set(Array.from({ length: 9 }, (_, i) => Math.floor((r * 9 + i) / 4)))];
const panUi = { offset: 0 };

function dayFor(offset) {
  const loc = state.loc;
  const base = localYMD(new Date(Date.now() + offset * 86400000), loc.tz);
  const [y, m, d] = base.split('-').map(Number);
  // The clock offset in force on THAT day (London after the clocks go back, Toronto in March…), not today's.
  const tz = offset ? offsetOnDay(y, m - 1, d, loc.tz, loc.zone) : loc.tz;
  const noon = new Date(Date.UTC(y, m - 1, d, 12) - tz * 3600000);
  return { iso: base, noon, tz, td: tamilDay(noon, loc.lat, loc.lon, tz) };
}

function renderPanchangam(sec) {
  const { iso, noon, td, tz } = dayFor(panUi.offset);
  const loc = { ...state.loc, tz };
  const isToday = panUi.offset === 0;
  const snapNow = isToday ? (state.snap || panchang(new Date(), loc.lat, loc.lon, loc.tz)) : panchang(noon, loc.lat, loc.lon, loc.tz);
  const wd = td.weekday.index;
  const so = SOOLAM[wd];
  const cRasi = td.chandrashtamaRasi;
  const m = activeMember();
  const t = (x) => fmtTime(x, loc.tz);
  const tr = (a, b) => fmtTimeRange(a, b, loc.tz);
  const tillT = (x) => (x ? ` · ${untilL(t(x))}` : '');
  // Karanam end time for the day shown (the day's panchangam is read at local noon, like the rest of the page).
  let karanaEnd = null;
  try { karanaEnd = (isToday ? panchang(noon, loc.lat, loc.lon, loc.tz) : snapNow).karanaEndsAt || null; } catch { karanaEnd = null; }
  const good = td.gowri.filter((g) => g.good);
  const vibe = m && m.relation !== 'organization' && isToday ? vibeCard(m, snapNow) : '';
  const spokenTa = `${td.tamil.year.ta} வருடம், ${td.tamil.monthTa} ${td.tamil.day}, ${td.weekday.ta}. திதி ${td.tithi.index === 14 || td.tithi.index === 29 ? td.tithi.ta : `${td.paksha === 'Shukla' ? 'வளர்பிறை' : 'தேய்பிறை'} ${td.tithi.ta}`}. நட்சத்திரம் ${NAKSHATRAS[td.nakshatra.index].ta}. யோகம் ${td.yoga.ta || td.yoga.name}. ராகு காலம் ${t(td.rahuKalam.start)} முதல் ${t(td.rahuKalam.end)} வரை. எமகண்டம் ${t(td.yamagandam.start)} முதல் ${t(td.yamagandam.end)} வரை. சூலம் ${so[1]}, பரிகாரம் ${so[3]}. சந்திராஷ்டமம் ${starsInRasi(cRasi).map((s) => NAKSHATRAS[s].ta).join(', ')}.`;
  const spokenEn = `${td.weekday.en}, ${td.tamil.monthEn} ${td.tamil.day}. Tithi ${td.tithi.index === 14 || td.tithi.index === 29 ? td.tithi.name : `${td.paksha} ${td.tithi.name}`}. Star ${NAKSHATRAS[td.nakshatra.index].en}. Rahu kalam ${t(td.rahuKalam.start)} to ${t(td.rahuKalam.end)}. Soolam ${so[0]}.`;
  sec.innerHTML = `${subHeader(L('Panchangam', 'பஞ்சாங்கம்'), `📍 ${esc(placeName(loc.name))}`)}
    <div class="pan-nav"><button class="chip-btn" id="panPrev" aria-label="${esc(L('Previous day', 'முந்தைய நாள்'))}">‹ ${isToday ? L('Yesterday', 'நேற்று') : L('Previous day', 'முந்தைய')}</button>
      ${isToday ? `<span class="pill">${L('Today', 'இன்று')}</span>` : `<button class="chip-btn" id="panToday">${L('Today', 'இன்று')}</button>`}
      <button class="chip-btn" id="panNext" aria-label="${esc(L('Next day', 'அடுத்த நாள்'))}">${isToday ? L('Tomorrow', 'நாளை') : L('Next day', 'அடுத்த')} ›</button></div>
    <div class="btn-row"><button class="chip-btn" id="panBig">🔠 ${state.settings.large ? L('Normal text', 'சாதாரண எழுத்து') : L('Big text', 'பெரிய எழுத்து')}</button>
      <button class="chip-btn" id="panSpeak">🔊 ${L('Read aloud', 'சத்தமாக வாசி')}</button><button class="chip-btn" id="panShare">📤 ${L('Share', 'பகிர்')}</button></div>

    <div class="card glass pan-head"><div class="pan-day">${td.tamil.day}</div><div><div class="pan-month">${esc(bi({ en: td.tamil.monthEn, ta: td.tamil.monthTa }))}</div>
      <div>${esc(ta() ? `${td.tamil.year.ta} வருடம்` : `${td.tamil.year.en} year`)} · <b>${esc(bi(td.weekday))}</b></div><div class="muted">${esc(fmtIsoDate(iso))} · ${esc(L(td.paksha === 'Shukla' ? 'Valarpirai' : 'Theipirai', td.paksha === 'Shukla' ? 'வளர்பிறை' : 'தேய்பிறை'))}</div></div></div>
    ${td.festivals.length || td.muhurthaDay ? `<div class="fest-row">${td.festivals.map((f) => `<span class="fest ${f.kind}">${f.kind === 'festival' ? '🎉' : '🪔'} ${esc(bi(f))} ${remindBtn({ title: bi(f), at: td.sunrise })}</span>`).join('')}${td.muhurthaDay ? `<span class="fest muhurtham">💐 ${L('Subha Muhurtha day', 'சுப முகூர்த்த நாள்')}</span>` : ''}</div>` : ''}

    <div class="card glass pan-big"><div class="card-title">📖 ${L('Panchangam — the five limbs', 'பஞ்சாங்கம் — ஐந்து அங்கங்கள்')}</div>
      <div class="pan-row"><span>📅 ${L('Day', 'கிழமை')}</span><b>${esc(bi(td.weekday))}</b></div>
      <div class="pan-row"><span>🌙 ${L('Tithi', 'திதி')}</span><b>${esc(tithiName({ ...td.tithi, paksha: td.tithi.paksha || td.paksha }))}<small>${tillT(td.tithi.endsAt)}</small></b></div>
      <div class="pan-row"><span>⭐ ${L('Star', 'நட்சத்திரம்')}</span><b>${esc(nakName(td.nakshatra.index))}<small>${tillT(td.nakshatra.endsAt)}</small></b></div>
      <div class="pan-row"><span>🔗 ${L('Yoga', 'யோகம்')}</span><b>${esc(yogaName(td.yoga))}<small>${tillT(td.yoga.endsAt)}</small></b></div>
      <div class="pan-row"><span>🌗 ${L('Karanam', 'கரணம்')}</span><b>${esc(ta() ? td.karanaTa || td.karana : td.karana)}<small>${tillT(karanaEnd)}</small></b></div>
      <div class="pan-row"><span>☽ ${L('Moon in', 'சந்திரன் ராசி')}</span><b>${esc(rasiName(td.moonRasi.index))}<small>${tillT(td.moonRasi.endsAt)}</small></b></div>
      <div class="pan-row"><span>☀️ ${L('Sunrise / Sunset', 'சூரிய உதயம் / அஸ்தமனம்')}</span><b>${t(td.sunrise)} / ${t(td.sunset)}</b></div></div>

    <div class="card glass pan-big"><div class="card-title">✨ ${L('Nalla Neram (Gowri)', 'நல்ல நேரம் (கௌரி)')}</div>
      ${good.map((g) => `<div class="pan-row good"><span>${g.part === 'day' ? '🌞' : '🌙'} ${esc(bi(g))}</span><b>${tr(g.start, g.end)} ${remindBtn({ title: `${L('Nalla neram', 'நல்ல நேரம்')} · ${bi(g)} ${t(g.start)}`, at: g.start })}</b></div>`).join('')}</div>

    <div class="card glass pan-big"><div class="card-title">⛔ ${L('Avoid these times', 'தவிர்க்க வேண்டிய நேரம்')}</div>
      <div class="pan-row bad"><span>🐍 ${L('Rahu Kalam', 'ராகு காலம்')}</span><b>${tr(td.rahuKalam.start, td.rahuKalam.end)} ${remindBtn({ title: `${L('Rahu Kalam starts', 'ராகு காலம் தொடக்கம்')} ${t(td.rahuKalam.start)}`, at: td.rahuKalam.start })}</b></div>
      <div class="pan-row bad"><span>⚔️ ${L('Yamagandam', 'எமகண்டம்')}</span><b>${tr(td.yamagandam.start, td.yamagandam.end)}</b></div>
      <div class="pan-row bad"><span>🌑 ${L('Guligai', 'குளிகை')}</span><b>${tr(td.guligai.start, td.guligai.end)}</b></div>
      <div class="pan-row"><span>🧭 ${L('Soolam', 'சூலம்')}</span><b>${esc(L(so[0], so[1]))}<small> · ${L('parigaram', 'பரிகாரம்')}: ${esc(L(so[2], so[3]))}</small></b></div>
      <div class="pan-row"><span>🌘 ${L('Chandrashtamam', 'சந்திராஷ்டமம்')}</span><b>${starsInRasi(cRasi).map((s) => esc(nakName(s))).join(', ')}<small> (${esc(rasiName(cRasi))})</small></b></div></div>

    ${vibe}

    <div class="section-title">🔮 ${L('Rasi palan — all 12 signs', '12 ராசி பலன்')}</div>
    <div class="rasi-grid">${RASIS.map((r, i) => {
    const pos = ((td.moonRasi.index - i + 12) % 12) + 1;
    const [lv, stars, en, tx] = PALAN[pos];
    const mine = m && m.relation !== 'organization' && chartOf(m).janmaRasi.index === i;
    return `<div class="card glass rp ${lv}${mine ? ' mine' : ''}"><b>${esc(rasiName(i))}${mine ? ' 👤' : ''}</b><span class="stars" aria-label="${stars}/5">${'★'.repeat(stars)}${'☆'.repeat(5 - stars)}</span><p class="small">${esc(L(en, tx))}</p></div>`;
  }).join('')}</div>
    <div class="btn-row"><button class="chip-btn" data-go="calendar">📅 ${L('Month calendar', 'மாத நாட்காட்டி')}</button><button class="chip-btn" data-go="muhurtham">🗓️ ${L('Muhurtham', 'முகூர்த்தம்')}</button><button class="chip-btn" data-go="live">🌌 ${L('Live horai', 'நேரலை ஓரை')}</button></div>
    ${copyright()}`;
  $('#panPrev').addEventListener('click', () => { panUi.offset -= 1; renderPanchangam(sec); });
  $('#panNext').addEventListener('click', () => { panUi.offset += 1; renderPanchangam(sec); });
  $('#panToday')?.addEventListener('click', () => { panUi.offset = 0; renderPanchangam(sec); });
  $('#panBig').addEventListener('click', () => { state.settings.large = !state.settings.large; saveSettings(); renderPanchangam(sec); });
  $('#panSpeak').addEventListener('click', () => speak(ta() ? spokenTa : spokenEn));
  $('#panShare').addEventListener('click', async () => {
    const text = `🙏 ${L('Thunai — Panchangam', 'துணை — பஞ்சாங்கம்')}\n${ta() ? spokenTa : spokenEn}`;
    try { if (navigator.share) { await navigator.share({ text }); return; } } catch { return; }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  });
  $$('.vibe-share', sec).forEach((b) => b.addEventListener('click', async () => {
    const text = b.dataset.text;
    try { if (navigator.share) { await navigator.share({ text }); return; } } catch { return; }
    try { await navigator.clipboard.writeText(text); toast(L('Copied', 'நகலெடுக்கப்பட்டது')); } catch { /* ignore */ }
  }));
}

/** Gen Z "vibe" card: energy, lucky colour & number, power hour — short and shareable. */
function vibeCard(m, snap) {
  const c = chartOf(m);
  const o = dayOutlook(c, snap);
  const g = personalGuide(c, { date: m.date });
  // One verdict everywhere: the headline is the shared day label; the line under it is only a friendly tagline.
  const energy = { great: 92, good: 80, steady: 60, care: 38 }[o.level];
  const emoji = { great: '🔥', good: '✨', steady: '😌', care: '🧘' }[o.level];
  const tagline = { great: L('Your day to shine', 'இன்று உங்கள் நாள்'), good: L('Your day to shine', 'இன்று உங்கள் நாள்'), steady: L('Keep it calm and steady', 'அமைதியாக, நிதானமாகச் செல்லுங்கள்'), care: L('Rest and self-care', 'ஓய்வும் தன்கவனிப்பும்') }[o.level];
  const word = `${emoji} ${bi(o.label)}`;
  const now = Date.now();
  const power = (snap.horai || []).find((h) => new Date(h.end).getTime() > now && ['Jupiter', 'Venus', g.lagnaLord].includes(h.lord));
  const text = `${word} — ${tagline} · ${L('Energy', 'ஆற்றல்')} ${energy}% · ${L('Colour', 'நிறம்')}: ${bi(g.today)} · ${L('Lucky no.', 'அதிர்ஷ்ட எண்')} ${g.numbers.birth}${power ? ` · ${L('Power hour', 'சுப நேரம்')} ${fmtTime(power.start, state.loc.tz)}` : ''} — ${L(BRAND.name, BRAND.nameTa)}`;
  return `<div class="card vibe" style="--vc:${g.today.hex}"><div class="vibe-top"><span class="mini-label">✨ ${L('Today\'s vibe', 'இன்றைய மனநிலை')} · ${esc(displayName(m))}</span><button class="link-btn vibe-share" data-text="${esc(text)}" aria-label="${esc(L('Share', 'பகிர்'))}">📤</button></div>
    <div class="vibe-word">${esc(word)}</div><div class="muted small">${esc(tagline)}</div>
    <div class="vibe-bar"><i style="width:${energy}%"></i></div><div class="muted small">${L('Energy', 'ஆற்றல்')} ${energy}%</div>
    <div class="vibe-grid"><div>${swatch(g.today)}<span>${esc(bi(g.today))}</span></div><div><b>${g.numbers.birth}</b><span>${L('Lucky no.', 'அதிர்ஷ்ட எண்')}</span></div>
      ${power ? `<div><b style="color:${COLOR[power.lord]}">${GLYPH[power.lord]} ${fmtTime(power.start, state.loc.tz)}</b><span>${L('Power hour', 'சுப நேரம்')} · ${esc(planetName(power.lord))}</span></div>` : ''}</div></div>`;
}
registerScreen('panchangam', { render: renderPanchangam, parent: 'home', needsLoc: true });

export { DAY_COLOR };
