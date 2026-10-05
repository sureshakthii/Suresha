// Main screens: Today (home dashboard), Live Sky, Jathagam, Prasnam.
import { panchang, planetPositions, buildCharts, RASIS, NAKSHATRAS, PLANETS } from './shared/astro.js';
import { CATEGORIES, evaluatePrasna } from './shared/prasna.js';
import { buildContext, ruleBasedReply } from './shared/narrator.js';
import { tamilDay } from './shared/tamilcal.js';
import { grahaStrength, dailyParigaram, NAVAGRAHA } from './shared/remedies.js';
import { doshams } from './shared/porutham.js';
import { nameLetters } from './shared/special.js';
import { timeReliability } from './shared/birthtime.js';
import {
  state, $, $$, L, ta, esc, bi, GLYPH, COLOR, planetName, rasiName, nakName, fmtTime, fmtDate, countdown,
  activeMember, chartOf, registerScreen, go, STATIC, sse, toast, speak, saveFamily,
  displayName, copyright, store, detailed, listen, micMessage,
  yogaName, karanaName,
  placeName,
} from './core.js';
import { weatherCardHtml, fillHomeWeather, relationsList, relationRow } from './screens-world.js';
import { trialBanner, ratePrompt } from './growth.js';
import { todayColorCard } from './screens-guide.js';
import { reminderCard, remindBtn } from './remind.js';
import { iconChip } from './icons.js';
import { healthGuide } from './shared/health.js';
import { dailyReview } from './shared/daily.js';
import { todayPlan } from './shared/today-plan.js';
import { faithOf, faithWelcome, faithBlessing, universalPractice } from './shared/faith.js';

const TARA = [['Janma', 'ஜன்ம', 'warn'], ['Sampat', 'சம்பத்', 'good'], ['Vipat', 'விபத்', 'bad'], ['Kshema', 'க்ஷேம', 'good'], ['Pratyak', 'பிரத்யக்', 'bad'], ['Sadhana', 'சாதக', 'good'], ['Naidhana', 'நைதன', 'bad'], ['Mitra', 'மித்ர', 'good'], ['Parama Mitra', 'பரம மித்ர', 'good']];
const goodBad = (k) => (k === 'good' ? L('Favourable', 'சாதகம்') : k === 'bad' ? L('Careful', 'கவனம்') : L('Neutral', 'சமம்'));

/** Personal day outlook for one family member: Tara Bala, Chandra Bala, Chandrashtamam. */
export function dayOutlook(chart, snap) {
  const tIdx = ((snap.nakshatra.index - chart.janmaNakshatra.index + 27) % 27) % 9;
  const pos = ((snap.moonRasi.index - chart.janmaRasi.index + 12) % 12) + 1;
  const chandra = pos === 8 ? 'bad' : [1, 3, 6, 7, 10, 11].includes(pos) ? 'good' : 'warn';
  const tara = TARA[tIdx];
  const overall = pos === 8 ? 'bad' : tara[2] === 'bad' && chandra !== 'good' ? 'bad' : tara[2] === 'good' && chandra === 'good' ? 'good' : 'warn';
  return { tara, taraKind: tara[2], pos, chandra, chandrashtama: pos === 8, overall };
}

// ================================================================ HOME
// Guidance-first: one prominent question box, today's essentials, saved plans and family reminders.
// Every other tool lives in its hub (My Chart · Family · Ask · Services) or in "All tools".
export const GUIDE_SUGGESTIONS = [
  ['Which temple should I visit?', 'எந்தக் கோவிலுக்குச் செல்லலாம்?'],
  ['Help me understand my current period', 'என் தற்போதைய காலத்தைப் புரிந்துகொள்ள உதவுங்கள்'],
  ['Help our family choose a good date', 'எங்கள் குடும்பத்திற்கு ஏற்ற நாளைத் தேர்வு செய்ய உதவுங்கள்'],
  ['Explain my current dasa-bhukti simply', 'என் நடப்பு தசா புக்தியை எளிமையாக விளக்குங்கள்'],
];

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

// Today's spiritual plan: sacred day + the person's Dasa / Bhukti / Sani transit + the Horai to use, with an
// encouraging line — the first card after the greeting, so the morning starts with clear, positive actions.
function todayPlanCard(m, snap, loc, td) {
  const person = m && m.relation !== 'organization' ? m : null;
  let plan, review;
  try {
    const chart = person ? chartOf(person) : null;
    review = chart ? dailyReview(chart, snap, new Date()) : null;
    const age = chart?.date ? Math.floor((Date.now() - new Date(`${chart.date}T00:00:00Z`)) / 31557600000) : 30;
    plan = todayPlan({ chart, snap, festivals: td.festivals || [], level: review?.level || 'steady', now: new Date(), faith: person ? faithOf(person) : 'hindu', age });
  } catch { return ''; }
  const h = plan.horai;
  const dateLine = `${esc(bi(td.weekday))} · ${esc(bi({ en: td.tamil.monthEn, ta: td.tamil.monthTa }))} ${td.tamil.day}`;
  if (!plan.items.length && !h && !person) return '';
  return `<section class="card glass plan-card" aria-labelledby="tpTitle">
    <div class="card-title"><span id="tpTitle">🌞 ${L('Today’s guidance', 'இன்றைய வழிகாட்டல்')}</span><span class="pill">${dateLine}</span></div>
    <p class="tp-energy">✨ ${esc(bi(plan.energy))}</p>
    ${plan.items.map((it) => `<div class="tp-item${it.personal ? ' mine' : ''}"><div class="tp-icon">${it.icon}</div><div><b>${esc(bi(it.title))}</b><div class="small">${esc(bi(it.text))}</div></div></div>`).join('')}
    ${h && h.start ? `<div class="tp-item tp-horai"><div class="tp-icon">⏰</div><div><b>${esc(fmtTime(h.start, loc.tz))} – ${esc(fmtTime(h.end, loc.tz))} · ${esc(planetName(h.planet))} ${h.planet === 'Rahu' ? L('(Rahu Kalam)', '(ராகு காலம்)') : h.planet === 'Ketu' ? '' : L('Horai', 'ஓரை')}</b>
      <div class="small">${esc(bi(h.text))}</div><div class="small muted">${esc(bi(h.why))} · ${esc(bi(h.repeat))}</div></div>${remindBtn({ title: `${planetName(h.planet)} ${L('Horai prayer', 'ஓரை வழிபாடு')}`, at: h.start })}</div>` : ''}
    ${!plan.items.length && person ? `<p class="small muted">${L('No special vratham today — follow your Horai practice and the do’s below.', 'இன்று சிறப்பு விரதம் இல்லை — உங்கள் ஓரை வழிபாட்டையும் கீழே உள்ள செய்யலாம் பட்டியலையும் பின்பற்றுங்கள்.')}</p>` : ''}
  </section>`;
}

// Today: personal day review from gochara — Chandrashtamam, Tara / Chandra balam, do's & don'ts, today's god, prayer.
function dailyCard(m, snap, loc) {
  const person = m && m.relation !== 'organization' ? m : null;
  let r;
  try { r = dailyReview(person ? chartOf(person) : null, snap, new Date()); } catch { return ''; }
  const god = `<div class="dc-god"><span class="mini-label">🛕 ${L('God of the day', 'இன்றைய தெய்வம்')}</span><b>${esc(bi(r.deity.god))}</b><span class="dc-mantra">${esc(bi(r.deity.mantra))}</span><span class="small muted">${esc(bi(r.deity.act))}</span></div>`;
  if (!r.personal) return `<section class="card glass daily-card">${god}</section>`;
  const range = (w) => `${fmtDate(w.start, loc.tz)} ${fmtTime(w.start, loc.tz)} – ${fmtDate(w.end, loc.tz)} ${fmtTime(w.end, loc.tz)}`;
  const ch = r.nextChandrashtamam;
  const chLine = r.chandrashtamam
    ? `<div class="dc-alert">⚠️ <b>${L('Chandrashtamam today', 'இன்று சந்திராஷ்டமம்')}</b>${ch ? ` · ${L('till', 'வரை')} ${esc(fmtDate(ch.end, loc.tz))} ${esc(fmtTime(ch.end, loc.tz))}` : ''}<br><span class="small">${L('Stay patient; postpone big decisions, signatures and new starts.', 'பொறுமை காக்கவும்; பெரிய முடிவு, கையெழுத்து, புதிய தொடக்கத்தை ஒத்திவையுங்கள்.')}</span></div>`
    : ch ? `<div class="dc-next">🌙 ${L('Next Chandrashtamam', 'அடுத்த சந்திராஷ்டமம்')}: <b>${esc(range(ch))}</b></div>` : '';
  const fam = state.family.filter((x) => x.id !== person.id && x.relation !== 'organization').filter((x) => { try { return ((snap.moonRasi.index - chartOf(x).janmaRasi.index + 12) % 12) === 7; } catch { return false; } });
  const lvCls = { great: 'good', good: 'good', steady: 'warn', care: 'bad' }[r.level];
  const faith = faithOf(person);
  const other = faith !== 'hindu';
  const welcome = faithWelcome(faith, displayName(person));
  const blessing = other ? faithBlessing(faith) : null;
  return `<section class="card glass daily-card" aria-labelledby="dcTitle">
    <div class="card-title"><span id="dcTitle">🌅 ${L('Today for you', 'இன்று உங்களுக்கு')} · ${esc(displayName(person))}</span><span class="tag ${lvCls}">${esc(bi(r.label))}</span></div>
    ${welcome ? `<div class="dc-welcome">🌍 ${esc(bi(welcome))}</div>` : ''}
    ${chLine}
    <ul class="dc-why">${r.why.map((w) => `<li>${esc(bi(w))}</li>`).join('')}</ul>
    <div class="dc-cols"><div class="dc-do"><h4>✅ ${L('Do', 'செய்யலாம்')}</h4><ul>${r.dos.map((x) => `<li>${esc(bi(x))}</li>`).join('')}</ul></div>
      <div class="dc-dont"><h4>🚫 ${L('Avoid', 'தவிர்க்கவும்')}</h4><ul>${r.donts.map((x) => `<li>${esc(bi(x))}</li>`).join('')}${snap.rahuKalam ? `<li class="small muted">${L('Rahu Kalam', 'ராகு காலம்')}: ${esc(fmtTime(snap.rahuKalam.start, loc.tz))} – ${esc(fmtTime(snap.rahuKalam.end, loc.tz))}</li>` : ''}</ul></div></div>
    ${other ? `<div class="dc-god"><span class="mini-label">🤝 ${L('For you today', 'இன்று உங்களுக்கு')}</span><b>${esc(bi(universalPractice(r.dasaDeity?.planet || r.dayLord)))}</b></div>` : god}
    ${!other && r.dasaDeity ? `<p class="small">🪔 ${L('Your Dasa deity', 'உங்கள் தசா தெய்வம்')}: <b>${esc(bi(r.dasaDeity.name))}</b> · ${L('Birth-star deity', 'நட்சத்திரத் தெய்வம்')}: <b>${esc(bi(r.starDeity))}</b></p>` : ''}
    ${fam.length ? `<p class="small dc-fam">🌙 ${L('Chandrashtamam today in the family', 'இன்று குடும்பத்தில் சந்திராஷ்டமம்')}: <b>${fam.map((x) => esc(displayName(x))).join(', ')}</b> — ${L('be gentle with them today', 'இன்று அவர்களிடம் மென்மையாக இருங்கள்')}</p>` : ''}
    ${other ? (blessing ? `<div class="dc-prayer">${esc(bi(blessing))}</div>` : '') : r.prayer ? `<div class="dc-prayer">🙏 ${r.prayer.lines.map((x) => esc(bi(x))).join(' · ')}</div>` : ''}
    <button class="chip-btn" id="dcShare" type="button">📤 ${L('Share my day', 'என் நாளைப் பகிர்')}</button>
  </section>`;
}

function shareDaily(m, snap, loc) {
  const r = dailyReview(chartOf(m), snap, new Date());
  const text = [
    `🌅 ${L('Today for', 'இன்று')} ${displayName(m)} — ${bi(r.label)}`,
    r.chandrashtamam ? `⚠️ ${L('Chandrashtamam today', 'இன்று சந்திராஷ்டமம்')}` : '',
    ...r.why.map((w) => `• ${bi(w)}`),
    `✅ ${r.dos.map((x) => bi(x)).join('; ')}`,
    `🚫 ${r.donts.map((x) => bi(x)).join('; ')}`,
    faithOf(m) === 'hindu' ? `🛕 ${L('God of the day', 'இன்றைய தெய்வம்')}: ${bi(r.deity.god)} — ${bi(r.deity.mantra)}` : '',
    faithOf(m) === 'hindu' ? (r.prayer ? `🙏 ${r.prayer.lines.map((x) => bi(x)).join(' · ')}` : '') : (faithBlessing(faithOf(m)) ? bi(faithBlessing(faithOf(m))) : ''),
    '',
    `${L('From', 'வழங்குவது')} ${L('Thunai', 'துணை')} — ${L('Your companion on life’s path', 'உங்கள் வாழ்வின் வழித்துணை')}`,
  ].filter((x) => x !== '').join('\n');
  if (navigator.share) { navigator.share({ text }).catch(() => {}); return; }
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
}

// Today: Health & Planets summary for the active member (dasa-bhukti + gochara level, one eat / avoid tip).
function healthTodayCard(m) {
  if (!m || m.relation === 'organization') return '';
  let h;
  try { h = healthGuide(chartOf(m), { gender: m.gender }); } catch { return ''; }
  const lv = h.period.level;
  const word = lv === 'good' ? L('Supportive period', 'ஆதரவான காலம்') : lv === 'steady' ? L('Steady period', 'நிலையான காலம்') : L('Take extra care', 'கூடுதல் கவனம்');
  const first = (x) => bi(x).split(' — ')[0];
  return `<button class="card glass cta-card health-cta" data-go="health"><b>🌿 ${L('Health & Planets', 'ஆரோக்கியம் & கிரகங்கள்')} <span class="tag ${lv === 'good' ? 'good' : lv === 'steady' ? 'warn' : 'bad'}">${esc(word)}</span></b>
    <span class="small">${L('Protect', 'கவனிக்க')}: ${esc(h.bodyAreas.slice(0, 2).map((a) => bi(a)).join(', '))}</span>
    <span class="small">✅ ${esc(h.diet.eat.slice(0, 2).map(first).join(', '))} · 🚫 ${esc(h.diet.avoid.slice(0, 1).map(first).join(', '))}</span>
    <span class="small muted">${L('From your Dasa–Bhukti, Gochara & Peyarchi ›', 'உங்கள் தசா–புக்தி, கோசாரம், பெயர்ச்சிப்படி ›')}</span></button>`;
}

// The Today screen is re-drawn when the calendar day changes (app left open overnight or resumed next morning),
// so the daily review, do's and don'ts always belong to today.
let homeDay = '';
const dayKey = () => { const tz = state.loc?.tz ?? 5.5; return new Date(Date.now() + tz * 3600000).toISOString().slice(0, 10); };
function refreshIfNewDay() {
  if (homeDay && dayKey() !== homeDay) { state.snapAt = 0; state.snap = null; if (state.view === 'home') go('home', {}); }
}
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshIfNewDay(); });
  setInterval(refreshIfNewDay, 60000);
}

function renderHome(sec) {
  homeDay = dayKey();
  const loc = state.loc;
  const td = todayInfo(loc);
  const snap = state.snap || panchang(new Date(), loc.lat, loc.lon, loc.tz);
  const m = activeMember();
  const fest = td.festivals;
  const plans = savedPlans();
  sec.innerHTML = `
    <div class="home-greet">🙏 ${L('Vanakkam', 'வணக்கம்')}${m ? `, ${esc(displayName(m))}` : ''}</div>
    ${todayPlanCard(m, snap, loc, td)}
    <section class="guide-box card" aria-labelledby="guideQ">
      <h2 id="guideQ" class="guide-q">${L('What would you like guidance on?', 'எதற்கு வழிகாட்டல் வேண்டும்?')}</h2>
      <form id="guideForm" class="chat-form guide-form">
        <button type="button" id="guideMic" class="mic" aria-label="${L('Speak your question', 'உங்கள் கேள்வியைப் பேசுங்கள்')}">🎙️</button>
        <label class="sr-only" for="guideInput">${L('Your question', 'உங்கள் கேள்வி')}</label>
        <textarea id="guideInput" class="grow-in" rows="2" autocomplete="off" maxlength="600" placeholder="${esc(L('Ask Thunai your question…', 'உங்கள் கேள்வியைத் துணையிடம் கேளுங்கள்…'))}"></textarea>
        <button class="send" aria-label="${L('Ask', 'கேள்')}">➤</button>
      </form>
      <div class="guide-sugs">${GUIDE_SUGGESTIONS.map(([en, tx]) => `<button class="sg" type="button">${esc(L(en, tx))}</button>`).join('')}</div>
      <p class="small muted">🎙️ ${L('Type or speak — Tamil, English or Tanglish. You can check the words before sending.', 'தமிழ், ஆங்கிலம், தங்கிலீஷ் — எழுதலாம் அல்லது பேசலாம். அனுப்பும் முன் சரிபார்க்கலாம்.')}</p>
    </section>
    ${dailyCard(m, snap, loc)}
    ${healthTodayCard(m)}
    <button class="card glass cta-card love-cta" data-go="lovematch"><b>💘 ${L('Love Match', 'காதல் பொருத்தம்')}</b><span class="small">${L('Emotional sync, chemistry and the star match — check your love vibe and share it', 'உணர்வு, ஈர்ப்பு, நட்சத்திரப் பொருத்தம் — உங்கள் காதல் அதிர்வைப் பார்த்துப் பகிருங்கள்')}</span></button>

    <div class="hero">
      <div class="hero-top">
        <div class="tamil-date">
          <div class="td-day">${td.tamil.day}</div>
          <div>
            <div class="td-month">${esc(bi({ en: td.tamil.monthEn, ta: td.tamil.monthTa }))}</div>
            <div class="td-year">${esc(ta() ? `${td.tamil.year.ta} வருடம்` : `${td.tamil.year.en} year`)} · ${esc(bi(td.weekday))}</div>
            <div class="muted small">${fmtIsoDate2(td.date)} · <span id="homeLoc">📍 ${esc(placeName(loc.name))}</span></div>
          </div>
        </div>
        <div class="clock" id="clock">--:--:--</div>
      </div>
      ${fest.length ? `<div class="fest-row">${fest.map((f) => `<span class="fest ${f.kind}">${f.kind === 'festival' ? '🎉' : '🪔'} ${esc(bi(f))}</span>`).join('')}</div>` : ''}
      ${td.muhurthaDay ? `<div class="fest-row"><span class="fest muhurtham">💐 ${L('Subha Muhurtha day', 'சுப முகூர்த்த நாள்')}</span></div>` : ''}
      <div class="chips">
        <div class="chip-card"><span class="mini-label">${L('Star', 'நட்சத்திரம்')}</span><b>${esc(nakName(snap.nakshatra.index))}</b><span class="mini-sub">${L('till', 'வரை')} ${fmtTime(snap.nakshatra.endsAt, loc.tz)}</span></div>
        <div class="chip-card"><span class="mini-label">${L('Tithi', 'திதி')}</span><b>${esc(ta() ? snap.tithi.ta : snap.tithi.name)}</b><span class="mini-sub">${L('till', 'வரை')} ${fmtTime(snap.tithi.endsAt, loc.tz)}</span></div>
        <div class="chip-card"><span class="mini-label">${L('Sunrise', 'சூரிய உதயம்')}</span><b>☀ ${fmtTime(td.sunrise, loc.tz)}</b><span class="mini-sub">🌇 ${fmtTime(td.sunset, loc.tz)}</span></div>
      </div>
      <div class="btn-row"><button class="chip-btn" data-go="panchangam">📖 ${L('Full panchangam', 'முழு பஞ்சாங்கம்')}</button><button class="chip-btn" data-go="calendar">📅 ${L('Calendar', 'நாட்காட்டி')}</button></div>
    </div>

    <div class="card glass">
      <div class="card-title"><span>✨ ${L('Nalla Neram today', 'இன்றைய நல்ல நேரம்')}</span><span class="pill">${L('Gowri', 'கௌரி')}</span></div>
      <div class="gowri">${td.gowri.filter((g) => g.part === 'day').map((g) => gowriCell(g, loc)).join('')}</div>
      <div class="kalam">${kalamCell(L('Rahu Kalam', 'ராகு காலம்'), td.rahuKalam, snap.inRahuKalam, loc)}${kalamCell(L('Yamagandam', 'எமகண்டம்'), td.yamagandam, snap.inYamagandam, loc)}${kalamCell(L('Guligai', 'குளிகை'), td.guligai, snap.inGuligai, loc)}</div>
      <div class="hora-mini" data-go="live" role="button" tabindex="0">
        <div class="hora-glyph" style="color:${COLOR[snap.currentHora.lord]}">${GLYPH[snap.currentHora.lord]}</div>
        <div style="flex:1"><div class="mini-label">${L('Current Horai', 'தற்போதைய ஓரை')}</div><div class="mini-value">${esc(planetName(snap.currentHora.lord))} ${L('Horai', 'ஓரை')}</div></div>
        <div style="text-align:right"><div class="mini-label">${L('ends in', 'முடிய')}</div><div class="countdown" data-end="${new Date(snap.currentHora.end).getTime()}">${countdown(snap.currentHora.end)}</div></div>
      </div>
    </div>

    ${trialBanner()}
    ${plans.length ? `<div class="card glass"><div class="card-title"><span>🧭 ${L('Saved plans', 'சேமித்த திட்டங்கள்')}</span><button class="link-btn" data-go="journey">${L('Plan new', 'புதிய திட்டம்')}</button></div>
      ${plans.slice(0, 3).map((p) => `<button class="plan-row" data-go="journey" data-param='${esc(JSON.stringify({ open: p.id }))}'><b>${esc(p.title)}</b><span class="muted small">${esc(p.dates || '')}</span></button>`).join('')}</div>`
    : `<button class="card glass cta-card journey-cta" data-go="journey"><b>🛕 ${L('My Spiritual Journey', 'என் ஆன்மீகப் பயணம்')}</b><span class="small muted">${L('Plan a temple visit that fits your leave, budget and family — with honest, sourced information.', 'உங்கள் விடுப்பு, பட்ஜெட், குடும்பத்திற்கு ஏற்ற கோவில் பயணம் — ஆதாரத்துடன், நேர்மையான தகவலுடன்.')}</span></button>`}
    ${reminderCard()}
    ${familyCard(snap)}
    ${weatherCardHtml()}
    ${detailed() ? todayColorCard() + relationsCard() + parigaramCard(snap) : ''}

    <button class="btn-soft" data-go="tools">🧰 ${L('All tools', 'அனைத்து கருவிகள்')} ›</button>
    <button class="btn-soft" id="shareToday">📤 ${L('Share today\'s calendar', 'இன்றைய நாட்காட்டியைப் பகிர்')}</button>
    ${ratePrompt()}
    ${copyright()}`;
  fillHomeWeather(td);
  $('#dcShare')?.addEventListener('click', () => shareDaily(m, snap, loc));
  $('#shareToday').addEventListener('click', () => import('./screens-tools.js').then((mod) => mod.shareToday(td, snap)));
  $$('.fam-row', sec).forEach((r) => r.addEventListener('click', () => { state.activeId = r.dataset.id; saveFamily(); renderHome(sec); }));
  const ask = (q) => { q = (q || '').trim(); if (q) go('chat', { q }); };
  $('#guideForm').addEventListener('submit', (e) => { e.preventDefault(); ask($('#guideInput').value); });
  $$('.guide-sugs .sg', sec).forEach((b) => b.addEventListener('click', () => ask(b.textContent)));
  setupVoiceInput($('#guideMic'), $('#guideInput'));
  tickHome();
}

/** Saved journey / family plans (stored on this device). */
export const savedPlans = () => store.get('kj_plans', []);

/**
 * Optional voice input: the microphone is requested only when the person taps the mic.
 * The transcript is placed in the box so they can check names, dates and places before sending.
 */
export function setupVoiceInput(btn, input) {
  if (!btn) return;
  if (!(window.SpeechRecognition || window.webkitSpeechRecognition)) { btn.hidden = true; return; }
  btn.addEventListener('click', async () => {
    if (btn.classList.contains('on')) return;
    btn.classList.add('on');
    const ph = input.placeholder;
    input.placeholder = L('Listening… speak now', 'கேட்கிறேன்… இப்போது பேசுங்கள்');
    try {
      const text = await listen({ onPartial: (tx) => { input.value = tx; } });
      if (text) { input.value = text; input.focus(); toast(L('Please check the words, then tap ➤ to send', 'சொற்களைச் சரிபார்த்து ➤ அழுத்தவும்'), 3500); }
    } catch (e) {
      toast(micMessage(e.message), 5000);
    } finally {
      btn.classList.remove('on');
      input.placeholder = ph;
    }
  });
}
const fmtIsoDate2 = (iso) => { const [y, mo, d] = iso.split('-'); return `${d}-${mo}-${y}`; };

function gowriCell(g, loc) {
  const now = Date.now();
  const cur = now >= new Date(g.start).getTime() && now < new Date(g.end).getTime();
  return `<div class="gw ${g.good ? 'good' : 'bad'}${cur ? ' now' : ''}"><b>${esc(bi(g))}</b><span>${fmtTime(g.start, loc.tz)}</span></div>`;
}
function kalamCell(label, r, active, loc) {
  return `<div class="${active ? 'active' : ''}"><b>${label}</b>${fmtTime(r.start, loc.tz)} – ${fmtTime(r.end, loc.tz)}${active ? `<br><span class="tag bad">${L('NOW', 'இப்போது')}</span>` : ''}</div>`;
}

function familyCard(snap) {
  if (!state.family.length) {
    return `<div class="card glass cta-card" data-go="family" data-param='{"add":true}'>👨‍👩‍👧 ${L('Add your family\'s birth details to see each person\'s day', 'ஒவ்வொருவரின் இன்றைய பலனைப் பார்க்க குடும்பத்தினர் விவரங்களைச் சேர்க்கவும்')} ›</div>`;
  }
  const rows = state.family.map((m) => {
    const c = chartOf(m);
    const o = dayOutlook(c, snap);
    const label = o.chandrashtama ? L('Chandrashtamam — be careful', 'சந்திராஷ்டமம் — கவனம்') : o.overall === 'good' ? L('Good day', 'நல்ல நாள்') : o.overall === 'bad' ? L('Go slow', 'நிதானம் தேவை') : L('Average day', 'சுமாரான நாள்');
    return `<button class="fam-row${m.id === state.activeId ? ' active' : ''}" data-id="${esc(m.id)}">
      <span class="avatar">${esc(displayName(m).slice(0, 1).toUpperCase())}</span>
      <span class="fam-name">${esc(displayName(m))}<small>${esc(nakName(c.janmaNakshatra.index))} · ${esc(rasiName(c.janmaRasi.index))}</small></span>
      <span class="tag ${o.overall}">${label}</span></button>`;
  }).join('');
  return `<div class="card glass"><div class="card-title"><span>👨‍👩‍👧 ${L('Family today', 'இன்று குடும்பத்தினருக்கு')}</span><button class="link-btn" data-go="family">${L('Manage', 'நிர்வகி')}</button></div>${rows}</div>`;
}

function relationsCard() {
  const list = relationsList(3);
  if (!list) return '';
  return `<div class="card glass" data-go="relations"><div class="card-title"><span>💞 ${L('Family relations today', 'இன்று குடும்ப உறவு')}</span><span class="link-btn">${L('All', 'அனைத்தும்')} ›</span></div>${list.map((r) => relationRow(r)).join('')}</div>`;
}

function parigaramCard(snap) {
  const m = activeMember();
  const items = dailyParigaram({ weekday: snap.weekday.index, chart: m && chartOf(m), snapshot: snap }).slice(0, 2);
  return `<div class="card glass" data-go="parigaram"><div class="card-title"><span>🪔 ${L('Today\'s parigaram', 'இன்றைய பரிகாரம்')}${m ? ` · ${esc(displayName(m))}` : ''}</span><span class="link-btn">${L('All', 'அனைத்தும்')} ›</span></div>
    ${items.map((i) => `<div class="pari-row"><span class="pg" style="color:${COLOR[i.planet]}">${GLYPH[i.planet]}</span><div><b>${esc(bi(i.reason))}</b><p>${esc(bi(i.free))}</p></div></div>`).join('')}</div>`;
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

// ================================================================ JATHAGAM
function memberSwitcher(current) {
  if (state.family.length < 2) return '';
  return `<div class="member-switch">${state.family.map((m) => `<button class="mchip${m.id === current ? ' sel' : ''}" data-mid="${esc(m.id)}">${esc(displayName(m))}</button>`).join('')}</div>`;
}

const relCache = new Map();
/** Birth-time reliability for a member (cached per birth data). */
export function reliabilityOf(m) {
  const key = `${m.id}|${m.date}|${m.time}|${m.lat}|${m.lon}|${m.tz}|${m.timeCertainty}|${m.timeWindowMin}`;
  if (!relCache.has(key)) relCache.set(key, timeReliability(m));
  return relCache.get(key);
}

function certaintyBanner(rel) {
  if (rel.certainty === 'exact') return '';
  const head = rel.certainty === 'kattam' ? L('Chart from the written jathagam (Rasi Kattam)', 'எழுதிய ஜாதகத்திலிருந்து (ராசி கட்டம்)') : rel.certainty === 'unknown' ? L('Birth time: unknown', 'பிறந்த நேரம்: தெரியாது') : L(`Birth time: approximate (± ${rel.windowMin} min)`, `பிறந்த நேரம்: தோராயம் (± ${rel.windowMin} நிமி)`);
  return `<div class="note-box${rel.lagna ? '' : ' unv'}" role="note"><b>🕰️ ${head}</b><ul class="small">${rel.notes.map((n) => `<li>${esc(L(n.en, n.ta))}</li>`).join('')}</ul>
    <button class="link-btn" data-go="birthtime">${L('What depends on birth time?', 'எவை பிறந்த நேரத்தைச் சார்ந்தவை?')}</button></div>`;
}

/** Plain-language current dasa-bhukti (the most asked question). */
function dasaSummaryCard(c, rel) {
  if (!rel.nakshatra || !c.dasa.current) return '';
  const d = c.dasa.current, b = c.dasa.currentBhukti;
  return `<div class="card glass dasa-now"><div class="card-title"><span>⏳ ${L('Your current period', 'உங்கள் நடப்புக் காலம்')}</span>${rel.dasa ? '' : `<span class="badge est">${L('approximate', 'தோராயம்')}</span>`}</div>
    <p><b>${esc(planetName(d.lord))} ${L('Mahadasa', 'மகா தசை')}</b> · ${fmtDate(d.start, c.tz)} – ${fmtDate(d.end, c.tz)}</p>
    ${b ? `<p><b>${esc(planetName(b.lord))} ${L('Bhukti', 'புக்தி')}</b> · ${L('until', 'வரை')} ${fmtDate(b.end, c.tz)}</p>` : ''}
    <button class="link-btn" data-go="chat" data-param='${esc(JSON.stringify({ q: L('Explain my current dasa-bhukti simply.', 'என் நடப்பு தசா-புக்தியை எளிமையாக விளக்குங்கள்.') }))}'>💬 ${L('Explain simply', 'எளிமையாக விளக்கு')}</button></div>`;
}

function renderChart(sec) {
  const m = activeMember();
  const c = chartOf(m);
  const rel = reliabilityOf(m);
  const sub = `${esc(displayName(m))}<br>${esc(c.date)}${rel.timeShown ? ` · ${esc(c.time.slice(0, 5))}${rel.certainty === 'approx' ? ` ±${rel.windowMin}′` : ''}` : ''}<br>${esc(placeName(c.place))}`;
  const bp = c.birthPanchang;
  const strength = grahaStrength(c.planets);
  const d = doshams(c.planets);
  const nl = nameLetters(c.janmaNakshatra.index, c.janmaNakshatra.pada);
  const now = new Date();
  const order = ['Lagna', 'Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
  sec.innerHTML = `${memberSwitcher(m.id)}
    ${certaintyBanner(rel)}
    ${dasaSummaryCard(c, rel)}
    <div class="card glass"><div class="card-title"><span>${L('Rasi chart', 'ராசி கட்டம்')}</span><button class="link-btn" data-go="chat" data-param='{"topic":"chart"}'>💬 ${L('Ask about my chart', 'என் ஜாதகம் பற்றிக் கேள்')}</button></div><div id="rasiChart" class="si-chart"></div>
      ${rel.lagna ? '' : `<p class="small muted">${L('Lagnam (ல) is not marked because the birth time is not precise enough.', 'பிறந்த நேரம் போதுமான துல்லியமில்லாததால் லக்னம் (ல) குறிக்கப்படவில்லை.')}</p>`}</div>
    <button class="btn-gold" data-go="analysis">📜 ${L('Full chart reading', 'முழு ஜாதக ஆய்வு')}</button>
    <div class="btn-row"><button class="chip-btn" data-go="parigaram">🪔 ${L('Simple practices', 'எளிய வழிபாடு')}</button><button class="chip-btn" data-go="peyarchi">🪐 ${L('Transits', 'பெயர்ச்சி')}</button><button class="chip-btn" data-go="health">🌿 ${L('Health & Planets', 'ஆரோக்கியம் & கிரகங்கள்')}</button><button class="chip-btn" data-go="why">❓ ${L('Why this result?', 'இந்த முடிவு ஏன்?')}</button><button class="chip-btn" data-print="1">🖨️ ${L('Print / PDF', 'அச்சிடு / PDF')}</button></div>
    <details class="card glass advanced"${detailed() ? ' open' : ''}><summary class="card-title">🔬 ${L('Advanced', 'மேம்பட்டவை')}</summary>
      <div class="menu">
        ${[['roadmap', 'Life periods road map', 'வாழ்க்கைக் கால வரைபடம்'], ['vargas', 'Divisional charts & Ashtakavarga', 'வர்க்கச் சக்கரங்கள் & அஷ்டகவர்க்கம்'], ['life', 'Life questions — traditional timing', 'வாழ்க்கைக் கேள்விகள் — பாரம்பரிய காலம்'], ['guide', 'My guide — colour, number, Siddhar', 'என் வழிகாட்டி — நிறம், எண், சித்தர்'], ['numerology', 'Name & number numerology', 'பெயர் & எண் கணிதம்'], ['live', 'Live sky', 'நேரலை வானம்']].map(([id, en, tx]) => `<button data-go="${id}">${iconChip(id, { size: 20, cls: 'mi-icon' })}<span>${L(en, tx)}${id === 'vargas' && !rel.vargas ? ` <span class="badge unv">${L('needs exact time', 'துல்லிய நேரம் தேவை')}</span>` : ''}</span></button>`).join('')}
      </div></details>
    ${rel.navamsa ? `<div class="card glass"><div class="card-title">${L('Navamsa chart', 'நவாம்ச கட்டம்')}</div><div id="navamsaChart" class="si-chart"></div></div>` : ''}
    <div class="card glass"><div class="card-title">${L('Birth details', 'பிறப்பு விவரம்')}</div>
      <dl class="kv">
        <dt>${L('Birth star', 'ஜென்ம நட்சத்திரம்')}</dt><dd>${rel.nakshatra ? `${esc(nakName(c.janmaNakshatra.index))}${rel.pada ? ` · ${L('Pada', 'பாதம்')} ${c.janmaNakshatra.pada}` : ''}` : `<span class="badge unv">${L('uncertain — the star changes on this day', 'உறுதியில்லை — அன்று நட்சத்திரம் மாறுகிறது')}</span>`}</dd>
        <dt>${L('Rasi', 'ராசி')}</dt><dd>${esc(rasiName(c.janmaRasi.index))}</dd>
        <dt>${L('Lagnam', 'லக்னம்')}</dt><dd>${rel.lagna ? `${esc(rasiName(c.lagna.rasi))} ${esc(c.lagna.dms)}` : `<span class="badge unv">${L('needs exact birth time', 'துல்லிய பிறந்த நேரம் தேவை')}</span>`}</dd>
        <dt>${L('Weekday', 'கிழமை')}</dt><dd>${esc(bi(bp.weekday))}</dd>
        <dt>${L('Tithi', 'திதி')}</dt><dd>${esc(ta() ? bp.tithi.ta : `${bp.tithi.paksha} ${bp.tithi.name}`)}</dd>
        <dt>${L('Yoga / Karanam', 'யோகம் / கரணம்')}</dt><dd>${esc(yogaName(bp.yoga))} / ${esc(karanaName(bp))}</dd>
        <dt>${L('Name letters', 'பெயர் எழுத்து')}</dt><dd>${esc(nl.primary.ta)} (${esc(nl.primary.en)})</dd>
        <dt>${L('Ayanamsa', 'அயனாம்சம்')}</dt><dd>${c.ayanamsa.toFixed(4)}° ${L('Lahiri', 'லாஹிரி')}</dd>
      </dl></div>
    <div class="card glass"><div class="card-title">💪 ${L('Planet strength (Graha Balam)', 'கிரக பலம்')}</div>
      ${strength.map((g) => `<button class="gb-row" data-planet="${g.planet}">
        <span class="gb-name" style="color:${COLOR[g.planet]}">${GLYPH[g.planet]} ${esc(planetName(g.planet))}</span>
        <span class="gb-bar"><i class="${g.level}" style="width:${g.score}%"></i></span>
        <span class="tag ${g.level === 'strong' ? 'good' : g.level === 'weak' ? 'bad' : 'warn'}">${g.level === 'strong' ? L('Strong', 'பலம்') : g.level === 'weak' ? L('Weak', 'பலவீனம்') : L('Average', 'மத்திமம்')}</span></button>
        <div class="gb-detail" id="gb-${g.planet}" hidden>
          <ul>${g.reasons.map((r) => `<li>${r.pts > 0 ? '▲' : '▼'} ${esc(L(r.en, r.ta))}</li>`).join('') || `<li>${L('No special factors', 'சிறப்புக் காரணிகள் இல்லை')}</li>`}</ul>
          <p class="muted small">${esc(bi(NAVAGRAHA[g.planet].governs))}</p>
          ${g.level === 'weak' ? `<p>🪔 ${esc(bi(NAVAGRAHA[g.planet].free))}</p><p>🛕 ${esc(bi(NAVAGRAHA[g.planet].temple))}</p>` : ''}
        </div>`).join('')}</div>
    <div class="card glass"><div class="card-title">${L('Doshams', 'தோஷங்கள்')}</div>
      <div class="factor"><span>${L('Chevvai (Mars) dosham', 'செவ்வாய் தோஷம்')}</span><b class="${d.chevvai.present ? 'neg' : 'pos'}">${d.chevvai.present ? L('Present', 'உண்டு') : d.chevvai.raw ? L('Cancelled', 'நிவர்த்தி') : L('None', 'இல்லை')}</b></div>
      ${d.chevvai.exceptions.map((e) => `<p class="muted small">✓ ${esc(bi(e))}</p>`).join('')}
      <div class="factor"><span>${L('Rahu-Ketu dosham', 'ராகு-கேது தோஷம்')}</span><b class="${d.rahuKetu.present ? 'neg' : 'pos'}">${d.rahuKetu.present ? L('Present', 'உண்டு') : L('None', 'இல்லை')}</b></div>
      <p class="muted small">${L('A dosham is common and is balanced by a partner with a similar dosham (dosha samyam). It is not a cause for fear.', 'தோஷம் பொதுவானது; இதே தோஷம் உள்ள வரனுடன் சமமாகும் (தோஷ சாம்யம்). பயப்பட வேண்டியதில்லை.')}</p>
    </div>
    ${rel.nakshatra ? `<div class="card glass"><div class="card-title">${L('Vimshottari Dasa', 'விம்சோத்தரி தசை')}${rel.dasa ? '' : ` <span class="badge est">${L(`approx. ± ${rel.dasaShiftDays} days`, `தோராயம் ± ${rel.dasaShiftDays} நாள்`)}</span>`}</div>
      <p class="muted small">${L('Dasa balance at birth', 'பிறப்பு தசா இருப்பு')}: ${esc(planetName(c.dasa.balance.lord))} ${c.dasa.balance.years.toFixed(2)} ${L('yrs', 'ஆண்டு')}</p>
      <div class="table-wrap"><table><tr><th>${L('Dasa', 'தசை')}</th><th>${L('From', 'தொடக்கம்')}</th><th>${L('To', 'முடிவு')}</th></tr>
      ${c.dasa.periods.map((p) => {
    const cur = now >= p.start && now < p.end;
    const bh = cur ? p.bhuktis.map((b) => `<tr class="${now >= b.start && now < b.end ? 'current' : ''}"><td style="padding-left:22px">↳ ${esc(planetName(b.lord))} ${L('Bhukti', 'புக்தி')}</td><td>${fmtDate(b.start, c.tz)}</td><td>${fmtDate(b.end, c.tz)}</td></tr>`).join('') : '';
    return `<tr class="${cur ? 'current' : ''}"><td class="pl">${GLYPH[p.lord]} ${esc(planetName(p.lord))}${cur ? ` · ${L('now', 'நடப்பு')}` : ''}</td><td>${fmtDate(p.start, c.tz)}</td><td>${fmtDate(p.end, c.tz)}</td></tr>${bh}`;
  }).join('')}</table></div></div>` : ''}
    <div class="card glass"><div class="card-title">${L('Planet positions', 'கிரக நிலை')}</div>${rel.timeShown ? '' : `<p class="small muted">${L('Positions are for the middle of the birth day; the Moon can differ by up to ±7°.', 'பிறந்த நாளின் நடுப்பகுதிக்கான நிலைகள்; சந்திரன் ±7° வரை மாறலாம்.')}</p>`}<div class="table-wrap"><table>
      <tr><th>${L('Planet', 'கிரகம்')}</th><th>${L('Rasi', 'ராசி')}</th><th>${L('Degree', 'பாகை')}</th><th>${L('Star', 'நட்சத்திரம்')}</th><th>${L('Pada', 'பாதம்')}</th></tr>
      ${order.filter((k) => k !== 'Lagna' || rel.lagna).map((k) => { const p = c.planets[k]; return `<tr><td class="pl" style="color:${COLOR[k]}">${GLYPH[k]} ${esc(planetName(k))}${p.retrograde && !['Rahu', 'Ketu'].includes(k) ? ' ℞' : ''}</td><td>${esc(rasiName(p.rasi))}</td><td>${esc(p.dms)}</td><td>${esc(nakName(p.nakshatra))}</td><td>${p.pada}</td></tr>`; }).join('')}
    </table></div></div>`;
  const noLagna = (houses) => (rel.lagna ? houses : houses.map((h) => h.filter((k) => k !== 'Lagna')));
  renderSI($('#rasiChart'), noLagna(c.charts.rasi), c.planets, rel.lagna ? c.lagna.rasi : -1, L('Rasi', 'ராசி'), sub, true);
  if (rel.navamsa) renderSI($('#navamsaChart'), c.charts.navamsa, c.planets, c.lagna.navamsaRasi, L('Navamsa', 'நவாம்சம்'), sub, false);
  $$('.gb-row', sec).forEach((b) => b.addEventListener('click', () => { const d2 = $(`#gb-${b.dataset.planet}`); d2.hidden = !d2.hidden; }));
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
  sec.innerHTML = `<div class="seg ask-switch" role="tablist"><button role="tab" aria-selected="false" data-go="chat">💬 ${L('Ask Thunai', 'துணையிடம் கேள்')}</button><button class="sel" role="tab" aria-selected="true">🔮 ${L('Is now a good time?', 'இப்போது செய்யலாமா?')}</button></div>
    <div class="card glass">
      <h2>${L('Is now a good time?', 'இப்போது செய்யலாமா?')}</h2>
      <p class="muted">${L('Choose what you are about to do. The Prasnam is cast for this exact second.', 'செய்யப்போகும் காரியத்தைத் தேர்வு செய்யுங்கள். இந்த நொடிக்கான பிரசன்னம் கணிக்கப்படும்.')}</p>
      ${state.family.length > 1 ? `<label>${L('Asking for', 'யாருக்காக')}<select id="askFor">${state.family.map((m) => `<option value="${esc(m.id)}"${m.id === askMember()?.id ? ' selected' : ''}>${esc(displayName(m))}${m.relation === 'organization' ? ` (${L('company', 'நிறுவனம்')})` : ''}</option>`).join('')}</select></label>` : ''}
      <div class="cat-grid">${cats.map((c) => `<button class="cat${prasnaCategory === c.id ? ' sel' : ''}" data-id="${c.id}"><span class="ci">${c.icon}</span>${esc(bi(c))}</button>`).join('')}</div>
      <label class="sr-only" for="question">${L('Your question', 'உங்கள் கேள்வி')}</label>
      <textarea id="question" rows="2" maxlength="400" placeholder="${esc(L('Your question (optional) — e.g. Can I sign the flat agreement today?', 'உங்கள் கேள்வி (விருப்பம்) — உ.தா. இன்று ஒப்பந்தம் கையெழுத்திடலாமா?'))}"></textarea>
      <button id="askBtn" class="btn-gold">🔮 ${L('Ask now', 'இப்போது கேளுங்கள்')}</button>
    </div>
    <div id="answer"${lastAnswer ? '' : ' hidden'}>
      <div class="card glass verdict-card" id="verdictCard"></div>
      <div class="card glass"><div class="card-title"><span>${L('Thunai says', 'துணை பதில்')}</span><span><button class="link-btn" id="speakReply" aria-label="Read aloud">🔊</button> <span id="aiSource" class="pill"></span></span></div><div id="reply" class="reply"></div></div>
      <div class="card glass" id="factorCard"></div>
      <div class="card glass" id="bestCard"></div>
    </div>`;
  $$('.cat', sec).forEach((b) => b.addEventListener('click', () => {
    prasnaCategory = b.dataset.id;
    $$('.cat', sec).forEach((x) => x.classList.toggle('sel', x === b));
    $('#askBtn').disabled = false;
  }));
  $('#askBtn').addEventListener('click', ask);
  $('#askFor')?.addEventListener('change', (e) => { askForId = e.target.value; });
  $('#speakReply').addEventListener('click', () => { if (!speak($('#reply').textContent)) toast(L('Read-aloud is not available on this device', 'இந்தச் சாதனத்தில் வாசித்துக்காட்டும் வசதி இல்லை')); });
  if (lastAnswer) { renderAnswer(lastAnswer); $('#reply').textContent = lastAnswer.reply || ''; $('#aiSource').textContent = lastAnswer.source || ''; }
}

function gauge(score, verdict) {
  const col = verdict === 'DO' ? '#4ade80' : verdict === 'CAUTION' ? '#fbbf24' : '#f87171';
  const C = 2 * Math.PI * 70;
  return `<div class="gauge"><svg viewBox="0 0 170 170"><circle cx="85" cy="85" r="70" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="12"/>
    <circle cx="85" cy="85" r="70" fill="none" stroke="${col}" stroke-width="12" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C}" style="transition:stroke-dashoffset 1.2s ease;filter:drop-shadow(0 0 8px ${col})" class="gArc" data-off="${C * (1 - score / 100)}"/></svg>
    <div class="num" style="color:${col}"><div>${score}<small>${L('score', 'மதிப்பு')} / 100</small></div></div></div>`;
}
export function animateGauges() {
  requestAnimationFrame(() => requestAnimationFrame(() => $$('.gArc').forEach((g) => { g.style.strokeDashoffset = g.dataset.off; })));
}
export { gauge };

function renderAnswer(a) {
  const loc = state.loc;
  const cat = CATEGORIES.find((c) => c.id === a.category);
  $('#verdictCard').innerHTML = `<div class="muted small">${cat.icon} ${esc(bi(cat))} · ${fmtTime(a.snapshot.at, loc.tz, true)}</div>
    ${gauge(a.score, a.verdict)}
    <div class="verdict-big ${a.verdict}">${a.verdict === 'DO' ? '✅' : a.verdict === 'CAUTION' ? '⚠️' : '⛔'} ${esc(bi(a.verdictText))}</div>
    <p class="small muted">${L('Traditional points out of 100 — not a measured probability of success.', 'பாரம்பரியப் புள்ளிகள் 100-க்கு — வெற்றியின் அளவிடப்பட்ட நிகழ்தகவு அல்ல.')}</p>
    <div class="muted small" style="margin-top:6px">${L('Horai', 'ஓரை')}: ${esc(planetName(a.snapshot.currentHora.lord))} · ${L('Star', 'நட்சத்திரம்')}: ${esc(nakName(a.snapshot.nakshatra.index))} · ${L('Lagna', 'லக்னம்')}: ${esc(rasiName(a.snapshot.lagna.rasi))}</div>`;
  animateGauges();
  $('#factorCard').innerHTML = `<div class="card-title">${L('Why? — Astrological factors', 'ஏன்? — ஜோதிடக் காரணங்கள்')}</div>${a.factors.map((f) => `<div class="factor"><span>${esc(ta() ? f.labelTa : f.label)}</span><b class="${f.points > 0 ? 'pos' : f.points < 0 ? 'neg' : 'zero'}">${f.points > 0 ? '+' : ''}${f.points}</b></div>`).join('')}`;
  $('#bestCard').innerHTML = `<div class="card-title">🕰️ ${L('Best times in the next 24 hours', 'அடுத்த 24 மணி நேரத்தில் சிறந்த நேரம்')}</div>${a.bestTimes.length ? a.bestTimes.map((w) => `<div class="best">🌟 ${fmtDate(w.start, loc.tz)} · <b>${fmtTime(w.start, loc.tz)} – ${fmtTime(w.end, loc.tz)}</b><br><span class="muted small">${L('score', 'மதிப்பு')} ${w.best} · ${esc(planetName(w.hora))} ${L('Horai', 'ஓரை')}</span></div>`).join('') : `<p class="muted">${L('No strongly favourable window in the next 24 hours.', 'அடுத்த 24 மணி நேரத்தில் வலுவான நல்ல நேரம் இல்லை.')}</p>`}`;
}

async function askOnDevice(body, m) {
  const c = m && chartOf(m);
  const birth = c && { janmaNakshatra: c.janmaNakshatra.index, janmaRasi: c.janmaRasi.index };
  const evaluation = evaluatePrasna({ at: new Date(), category: body.category, loc: body.loc, birth });
  const a = { category: body.category, score: evaluation.score, verdict: evaluation.verdict, verdictText: evaluation.verdictText, factors: evaluation.factors, bestTimes: evaluation.bestTimes, snapshot: evaluation.snapshot };
  lastAnswer = a;
  renderAnswer(a);
  const profile = c && { name: c.name, janmaNakshatraName: c.janmaNakshatra.name, janmaRasiName: c.janmaRasi.name, lagnaName: c.lagna.rasiName, currentDasa: c.dasa.current && `${c.dasa.current.lord} Dasa / ${c.dasa.currentBhukti?.lord} Bhukti` };
  const ctx = buildContext({ evaluation, question: body.question, category: body.category, lang: body.lang, profile, loc: body.loc });
  const { aiTask } = await import('./core.js');
  const fallback = ruleBasedReply(ctx, evaluation, body.lang);
  if (!STATIC) { $('#reply').textContent = fallback; a.reply = fallback; a.source = ''; $('#aiSource').textContent = a.source; return; }
  $('#reply').textContent = L('Thinking…', 'யோசிக்கிறேன்…');
  const r = await aiTask({ task: 'chat', context: ctx, messages: [{ role: 'user', content: ctx.question }], fallbackText: fallback, onText: (tx) => { $('#reply').textContent = tx; } });
  a.reply = r.text; a.source = '';
  $('#aiSource').textContent = a.source;
}

async function ask() {
  const btn = $('#askBtn');
  if (!prasnaCategory) {
    toast(L('First choose what you are about to do (one of the boxes above).', 'முதலில் செய்யப்போகும் காரியத்தை மேலே உள்ள பெட்டிகளில் ஒன்றைத் தேர்வு செய்யுங்கள்.'));
    $('.cat-grid')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    $('.cat-grid')?.classList.add('pulse'); setTimeout(() => $('.cat-grid')?.classList.remove('pulse'), 1600);
    return;
  }
  btn.disabled = true;
  $('#answer').hidden = false;
  $('#verdictCard').innerHTML = `<div class="loader"><i></i><i></i><i></i></div><p class="muted">${L('Casting the Prasnam…', 'பிரசன்னம் கணிக்கப்படுகிறது…')}</p>`;
  $('#reply').textContent = '';
  $('#reply').classList.add('typing');
  $('#factorCard').innerHTML = ''; $('#bestCard').innerHTML = ''; $('#aiSource').textContent = '';
  const m = askMember();
  const body = { category: prasnaCategory, question: $('#question').value.trim(), lang: state.lang, loc: state.loc, birth: m ? { name: m.name, date: m.date, time: m.time, lat: m.lat, lon: m.lon, tz: m.tz, place: m.place } : undefined };
  await new Promise((r) => setTimeout(r, 30));
  try {
    if (STATIC) throw new Error('static');
    let reply = '';
    await sse('/api/ask', body, {
      evaluation: (d) => { lastAnswer = d; renderAnswer(d); $('#verdictCard').scrollIntoView({ behavior: 'smooth' }); },
      delta: (d) => { reply += d.text; $('#reply').textContent = reply; },
      reset: () => { reply = ''; $('#reply').textContent = ''; },
      done: (d) => { lastAnswer.reply = reply; lastAnswer.source = ''; $('#aiSource').textContent = lastAnswer.source; },
    });
  } catch {
    await askOnDevice(body, m);
  } finally {
    $('#reply').classList.remove('typing');
    btn.disabled = false;
  }
}
registerScreen('ask', { render: renderAsk, needsLoc: true });

export { NAKSHATRAS };
