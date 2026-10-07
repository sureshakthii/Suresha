// Main screens: Today (home dashboard), Live Sky, Jathagam, Prasnam.
import { panchang, planetPositions, buildCharts, RASIS, NAKSHATRAS, PLANETS, listedDasaPeriods } from './shared/astro.js';
import { CATEGORIES, evaluatePrasna } from './shared/prasna.js';
import { buildContext, ruleBasedReply } from './shared/narrator.js';
import { tamilDay } from './shared/tamilcal.js';
import { grahaStrength, dailyParigaram, NAVAGRAHA } from './shared/remedies.js';
import { doshams } from './shared/porutham.js';
import { diagnoseDoshams, primarySthalam } from './shared/dosham.js';
import { nameLetters } from './shared/special.js';
import { timeReliability } from './shared/birthtime.js';
import {
  state, $, $$, L, ta, esc, bi, GLYPH, COLOR, planetName, rasiName, nakName, fmtTime, fmtDate, countdown,
  dasaName, fmtTimeRange, untilL, scaleTag, tithiName, fmtYMDL, fmtIsoDate, localYMD, fmtBirthL, periodRangeL, periodStartL, periodLastL,
  activeMember, chartOf, registerScreen, go, STATIC, sse, toast, speak, saveFamily,
  displayName, copyright, store, listen, micMessage,
  yogaName, karanaName,
  placeName, zoneLine, zoneText, indiaTimeText
} from './core.js';
import { weatherCardHtml, fillHomeWeather, relationsList, relationRow } from './screens-world.js';
import { trialBanner, ratePrompt, clarityPrompt } from './growth.js';
import { todayColorCard } from './screens-guide.js';
import { reminderCard, remindBtn } from './remind.js';
import { icon, iconChip } from './icons.js';
import { searchPill } from './screens-hubs.js';
import { QUICK, toolById } from './tool-registry.js';
import { healthGuide } from './shared/health.js';
import { healthNowHtml } from './screens-health.js';
import { dailyReview, dayVerdict } from './shared/daily.js';
import { todayPlan } from './shared/today-plan.js';
import { hymnText } from './hymn-links.js';
import { faithOf, faithWelcome, faithBlessing, universalPractice, isHinduFaith } from './shared/faith.js';
import { todayLines } from './today-lines.js';
import { ageProfile, suggestionsFor, categoryAllowed, childSafe } from './shared/age-guard.js';
import { compatCardHtml, bindCompatCard } from './compat-card.js';
import { weekCardHtml, fillWeekCard } from './screens-week.js';
import { goalsCardHtml } from './screens-goals.js';
import { growHomeHtml } from './screens-journal.js'; // morning brief + diary / delight cards (also registers diary & dailyset)
import { APP_URL } from './shared/brand.js';

/** Age profile of a family member (calendar age today at the selected place) — the top-most filter on every card. */
export const ageOf = (m) => ageProfile(m, { tz: state.loc?.tz });

const TARA = [['Janma', 'ஜென்ம', 'warn'], ['Sampat', 'சம்பத்', 'good'], ['Vipat', 'விபத்', 'bad'], ['Kshema', 'க்ஷேம', 'good'], ['Pratyak', 'பிரத்யக்', 'bad'], ['Sadhana', 'சாதக', 'good'], ['Naidhana', 'நைதன', 'bad'], ['Mitra', 'மித்ர', 'good'], ['Parama Mitra', 'பரம மித்ர', 'good']];
const goodBad = (k) => (k === 'good' ? L('Favourable', 'சாதகம்') : k === 'bad' ? L('Careful', 'கவனம்') : L('Neutral', 'சமம்'));

/** Personal day outlook for one family member: Tara Bala, Chandra Bala, Chandrashtamam. */
// The verdict itself comes from ONE function (shared/daily.js dayVerdict), so Today, the family list, the
// Panchangam card, Guru vakku and the morning brief always name the same day the same way.
export function dayOutlook(chart, snap, now = new Date()) {
  const tIdx = ((snap.nakshatra.index - chart.janmaNakshatra.index + 27) % 27) % 9;
  const pos = ((snap.moonRasi.index - chart.janmaRasi.index + 12) % 12) + 1;
  const chandra = pos === 8 ? 'bad' : [1, 3, 6, 7, 10, 11].includes(pos) ? 'good' : 'warn';
  const tara = TARA[tIdx];
  const v = dayVerdict(chart, snap, now);
  const overall = { great: 'good', good: 'good', steady: 'warn', care: 'bad' }[v.level];
  return { tara, taraKind: tara[2], pos, chandra, chandrashtama: pos === 8, overall, level: v.level, label: v.label, score: v.score };
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

// Another faith (or none): no temple question among the suggestions.
const GUIDE_SUGGESTIONS_OTHER_FAITH = [
  ['A short prayer for today in my own faith', 'இன்றைக்கு என் நம்பிக்கைப்படி ஒரு சிறு பிரார்த்தனை'],
  ...GUIDE_SUGGESTIONS.slice(1),
];

let today = null; // { key, day } cache of tamilDay for the current local date
function todayInfo(loc) {
  const now = new Date();
  const key = `${localYMD(now, loc.tz)}|${loc.lat}|${loc.lon}`;
  if (!today || today.key !== key) {
    const [y, mo, d] = localYMD(now, loc.tz).split('-').map(Number);
    const noon = new Date(Date.UTC(y, mo - 1, d, 12) - loc.tz * 3600000);
    today = { key, day: tamilDay(noon, loc.lat, loc.lon, loc.tz) };
  }
  return today.day;
}

// Today's one-line guidance: the day's verdict for the person + one encouraging line. The plan details
// (sacred day, Horai practice) open on tap — progressive disclosure keeps the top of Today calm.
function todayPlanCard(m, snap, loc, td) {
  const person = m && m.relation !== 'organization' ? m : null;
  let plan, review;
  try {
    const chart = person ? chartOf(person) : null;
    review = chart ? minorDay(dailyReview(chart, snap, new Date(), { faith: faithOf(person) }), ageOf(person)) : null;
    const age = person ? (ageOf(person).age ?? 30) : 30;
    let dasaSure = true;
    try { dasaSure = person ? reliabilityOf(person).dasa !== false : true; } catch { dasaSure = true; }
    plan = todayPlan({ chart, snap, festivals: td.festivals || [], level: review?.level || 'steady', now: new Date(), faith: person ? faithOf(person) : 'hindu', age, dasaSure });
  } catch { return ''; }
  const h = plan.horai;
  const lvCls = review?.personal ? { great: 'good', good: 'good', steady: 'warn', care: 'bad' }[review.level] : '';
  const n = plan.items.length + (h && h.start ? 1 : 0);
  return `<section class="card glass plan-card verdict-${lvCls || 'none'}" aria-labelledby="tpTitle">
    <div class="card-title"><span id="tpTitle">${icon('sun', { size: 18 })} ${L('Today’s guidance', 'இன்றைய வழிகாட்டல்')}</span>${review?.personal ? `<span class="tag ${lvCls}">${esc(bi(review.label))}</span>` : ''}</div>
    <p class="tp-energy">${esc(bi(plan.energy))}</p>
    ${n ? `<details class="disclose tp-more"><summary>${L('Today’s plan', 'இன்றைய திட்டம்')} · ${n}</summary>
    ${plan.items.map((it) => `<div class="tp-item${it.personal ? ' mine' : ''}"><div class="tp-icon">${it.icon}</div><div><b>${esc(bi(it.title))}</b><div class="small">${hymnText(bi(it.text))}</div></div></div>`).join('')}
    ${h && h.start ? `<div class="tp-item tp-horai"><div class="tp-icon">⏰</div><div><b>${esc(fmtTimeRange(h.start, h.end, loc.tz))} · ${h.planet === 'Rahu' ? `${esc(planetName(h.planet))} ${L('(Rahu Kalam)', '(ராகு காலம்)')}` : h.planet === 'Ketu' ? esc(planetName(h.planet)) : `${esc(dasaName(h.planet))} ${L('Horai', 'ஓரை')}`}</b>
      <div class="small">${esc(bi(h.text))}</div><div class="small muted">${esc(bi(h.why))} · ${esc(bi(h.repeat))}</div></div>${remindBtn({ title: `${dasaName(h.planet)} ${L('Horai prayer', 'ஓரை வழிபாடு')}`, at: h.start })}</div>` : ''}
    </details>` : ''}
  </section>`;
}

// Nalla neram / Rahu kalam / Horai — one live strip: what is true NOW and what comes next.
function timeStrip(td, snap, loc) {
  const now = Date.now();
  const t = (d) => fmtTime(d, loc.tz);
  const ms = (d) => new Date(d).getTime();
  const gw = (td.gowri || []).filter((g) => ms(g.end) > now).sort((x, y) => ms(x.start) - ms(y.start));
  const cur = gw.find((g) => ms(g.start) <= now);
  const nextGood = gw.find((g) => g.good && ms(g.start) > now);
  const flips = [];
  let good;
  const tr = (a, b) => fmtTimeRange(a, b, loc.tz);
  if (cur?.good) { good = { cls: 'good', k: L('Good time now', 'இப்போது நல்ல நேரம்'), v: untilL(t(cur.end)), s: bi(cur) }; flips.push(ms(cur.end)); }
  else if (nextGood) { good = { cls: '', k: L('Next good time', 'அடுத்த நல்ல நேரம்'), v: tr(nextGood.start, nextGood.end), s: bi(nextGood) }; flips.push(ms(nextGood.start)); }
  else good = { cls: '', k: L('Nalla neram', 'நல்ல நேரம்'), v: L('over for today', 'இன்று முடிந்தது'), s: '' };
  const rk = td.rahuKalam || snap.rahuKalam;
  let rahu;
  if (rk && now >= ms(rk.start) && now < ms(rk.end)) { rahu = { cls: 'bad', k: L('Rahu Kalam now', 'இப்போது ராகு காலம்'), v: untilL(t(rk.end)), s: L('Avoid new starts', 'புதிய தொடக்கம் வேண்டாம்') }; flips.push(ms(rk.end)); }
  else if (rk && now < ms(rk.start)) { rahu = { cls: 'warn', k: L('Rahu Kalam', 'ராகு காலம்'), v: tr(rk.start, rk.end), s: L('later today', 'இன்று பின்னர்') }; flips.push(ms(rk.start)); }
  else rahu = { cls: '', k: L('Rahu Kalam', 'ராகு காலம்'), v: rk ? tr(rk.start, rk.end) : '—', s: L('over for today', 'இன்று முடிந்தது') };
  const hl = snap.currentHora;
  const cell = (c, extra = '') => `<div class="ts-cell ${c.cls}"><span class="ts-k">${c.k}</span><b class="ts-v">${esc(c.v)}</b>${c.s ? `<span class="ts-s">${esc(c.s)}</span>` : ''}${extra}</div>`;
  return `<section class="card glass time-strip" aria-label="${esc(L('Good and bad times today', 'இன்றைய நல்ல / தவிர்க்க வேண்டிய நேரம்'))}">
    <div class="ts-row">
      ${cell(good)}
      ${cell(rahu)}
      <div class="ts-cell"><span class="ts-k">${L('Horai now', 'இப்போது ஓரை')}</span><b class="ts-v" style="color:${COLOR[hl.lord]}">${GLYPH[hl.lord]} ${esc(planetName(hl.lord))}</b><span class="ts-s">${L('ends in', 'முடிய')} <span class="countdown-sm" data-end="${ms(hl.end)}">${countdown(hl.end)}</span></span></div>
    </div>
    ${flips.map((f) => `<i hidden data-flip="${f}"></i>`).join('')}
    <button class="link-btn ts-more" data-go="panchangam">${L('Full panchangam', 'முழு பஞ்சாங்கம்')} ›</button>
  </section>`;
}

// Today: personal do's & don'ts from gochara. The reasons, today's god and the prayer open on tap.
function dailyCard(m, snap, loc) {
  const person = m && m.relation !== 'organization' ? m : null;
  let r;
  try { r = dailyReview(person ? chartOf(person) : null, snap, new Date(), { faith: person ? faithOf(person) : 'hindu' }); } catch { return ''; }
  if (person) r = minorDay(r, ageOf(person));
  const god = `<div class="dc-god"><span class="mini-label">${L('God of the day', 'இன்றைய தெய்வம்')}</span><b>${esc(bi(r.deity.god))}</b><span class="dc-mantra">${esc(bi(r.deity.mantra))}</span><span class="small muted">${hymnText(bi(r.deity.act))}</span></div>`;
  // God of the day: Hindu tradition — shown only when the member is Hindu (or no member is chosen).
  if (!r.personal) return person && !isHinduFaith(faithOf(person)) ? '' : `<section class="card glass daily-card">${god}</section>`;
  const at = (d) => `${fmtDate(d, loc.tz)}, ${fmtTime(d, loc.tz)}`;
  const range = (w) => `${at(w.start)} – ${at(w.end)}`;
  const ch = r.nextChandrashtamam;
  const chLine = r.chandrashtamam
    ? `<div class="dc-alert">${icon('alert', { size: 16 })} <b>${L('Chandrashtamam today', 'இன்று சந்திராஷ்டமம்')}</b>${ch ? ` · ${esc(untilL(at(ch.end)))}` : ''}<br><span class="small">${ageOf(person).adult ? L('Stay patient; postpone big decisions, signatures and new starts.', 'பொறுமை காக்கவும்; பெரிய முடிவு, கையெழுத்து, புதிய தொடக்கத்தை ஒத்திவையுங்கள்.') : L('Stay calm and gentle today — rest well and keep to your routine.', 'இன்று அமைதியாக, மென்மையாக இருங்கள் — நன்கு ஓய்வெடுத்து வழக்கத்தைப் பின்பற்றுங்கள்.')}</span></div>`
    : '';
  const fam = state.family.filter((x) => x.id !== person.id && x.relation !== 'organization').filter((x) => { try { return ((snap.moonRasi.index - chartOf(x).janmaRasi.index + 12) % 12) === 7; } catch { return false; } });
  const faith = faithOf(person);
  const other = faith !== 'hindu';
  const welcome = faithWelcome(faith, displayName(person));
  const blessing = other ? faithBlessing(faith) : null;
  return `<section class="card glass daily-card" aria-labelledby="dcTitle">
    <div class="card-title"><span id="dcTitle">${icon('check', { size: 18 })} ${L('Do’s & don’ts today', 'இன்று செய்யலாம் · தவிர்க்கவும்')}</span></div>
    ${(() => { try { const tl = todayLines(chartOf(person), snap); if (!ageOf(person).adult && childSafe([tl.star, tl.moon], ageOf(person)).length < 2) return ''; const rel = reliabilityOf(person); return `<div class="dc-star"><span class="dc-star-k">${esc(starRasiText(person))}</span>${rel.nakshatra ? `<b>${esc(bi(tl.star))}</b>` : ''}${rel.rasi ? `<span>${esc(bi(tl.moon))}</span>` : ''}</div>`; } catch { return ''; } })()}
    ${welcome ? `<div class="dc-welcome">${esc(bi(welcome))}</div>` : ''}
    ${chLine}
    <div class="dc-cols"><div class="dc-do"><h4>${L('Do', 'செய்யலாம்')}</h4><ul>${r.dos.map((x) => `<li>${esc(bi(x))}</li>`).join('')}</ul></div>
      <div class="dc-dont"><h4>${L('Avoid', 'தவிர்க்கவும்')}</h4><ul>${r.donts.map((x) => `<li>${esc(bi(x))}</li>`).join('')}</ul></div></div>
    <details class="disclose dc-more"><summary>${L('Why, god of the day & prayer', 'ஏன், இன்றைய தெய்வம் & பிரார்த்தனை')}</summary>
    <ul class="dc-why">${r.why.map((w) => `<li>${esc(bi(w))}</li>`).join('')}</ul>
    ${!r.chandrashtamam && ch ? `<div class="dc-next">${L('Next Chandrashtamam', 'அடுத்த சந்திராஷ்டமம்')}: <b>${esc(range(ch))}</b></div>` : ''}
    ${other ? `<div class="dc-god"><span class="mini-label">${L('For you today', 'இன்று உங்களுக்கு')}</span><b>${esc(bi(universalPractice(r.dasaDeity?.planet || r.dayLord)))}</b></div>` : god}
    ${!other && r.dasaDeity ? `<p class="small">${L('Your Dasa deity', 'உங்கள் தசா தெய்வம்')}: <b>${esc(bi(r.dasaDeity.name))}</b> · ${L('Birth-star deity', 'நட்சத்திரத் தெய்வம்')}: <b>${esc(bi(r.starDeity))}</b></p>` : ''}
    ${fam.length ? `<p class="small dc-fam">${L('Chandrashtamam today in the family', 'இன்று குடும்பத்தில் சந்திராஷ்டமம்')}: <b>${fam.map((x) => esc(displayName(x))).join(', ')}</b> — ${L('be gentle with them today', 'இன்று அவர்களிடம் மென்மையாக இருங்கள்')}</p>` : ''}
    ${other ? (blessing ? `<div class="dc-prayer">${esc(bi(blessing))}</div>` : '') : r.prayer ? `<div class="dc-prayer">${r.prayer.lines.map((x) => esc(bi(x))).join(' · ')}</div>` : ''}
    </details>
    <button class="chip-btn" id="dcShare" type="button">${icon('share', { size: 16 })} ${L('Share my day', 'என் நாளைப் பகிர்')}</button>
  </section>`;
}

/** A minor's day card keeps only child-appropriate lines (no money, signatures, business …). */
function minorDay(r, prof) {
  if (!prof || prof.adult || !r?.personal) return r;
  return { ...r, why: childSafe(r.why, prof), dos: childSafe(r.dos, prof), donts: childSafe(r.donts, prof) };
}

function shareDaily(m, snap, loc) {
  const c = chartOf(m);
  const r = minorDay(dailyReview(c, snap, new Date(), { faith: faithOf(m) }), ageOf(m));
  // A shared message is read by someone else: name the person and their rasi instead of "your rasi".
  const ri = c?.janmaRasi?.index;
  const rasi = ri == null ? '' : rasiName(ri);
  const who = [displayName(m), rasi ? L(`${rasi} rasi`, `${rasi} ராசி`) : ''].filter(Boolean).join(' — ');
  const named = (s) => (!rasi ? s : s
    .replace(new RegExp(`உங்கள் ${rasi} ராசிக்கு`, 'g'), `${rasi} ராசிக்கு`)
    .replace(/உங்கள் ராசிக்கு/g, `${rasi} ராசிக்கு`)
    .replace(new RegExp(`your rasi ${rasi}`, 'g'), `${rasi} rasi`)
    .replace(/your rasi/g, `${rasi} rasi`))
    .replace(/ உங்களுக்கு /g, ' ')
    .replace(/ for you\b/g, displayName(m) ? ` for ${displayName(m)}` : '');
  const text = [
    `🌅 ${L('Today', 'இன்று')} · ${who} — ${bi(r.label)}`,
    r.chandrashtamam ? `⚠️ ${L('Chandrashtamam today', 'இன்று சந்திராஷ்டமம்')}` : '',
    ...r.why.map((w) => `• ${named(bi(w))}`),
    `✅ ${r.dos.map((x) => bi(x)).join('; ')}`,
    `🚫 ${r.donts.map((x) => bi(x)).join('; ')}`,
    faithOf(m) === 'hindu' ? `🛕 ${L('God of the day', 'இன்றைய தெய்வம்')}: ${bi(r.deity.god)} — ${bi(r.deity.mantra)}` : '',
    faithOf(m) === 'hindu' ? (r.prayer ? `🙏 ${r.prayer.lines.map((x) => bi(x)).join(' · ')}` : '') : (faithBlessing(faithOf(m)) ? bi(faithBlessing(faithOf(m))) : ''),
    '',
    `${L('From', 'வழங்குவது')} ${L('Thunai', 'துணை')} — ${L('Your companion on life’s path', 'உங்கள் வாழ்வின் வழித்துணை')}`,
    APP_URL ? `🔗 ${APP_URL}` : '',
  ].filter((x) => x !== '').join('\n');
  if (navigator.share) { navigator.share({ text }).catch(() => {}); return; }
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
}

// Today: a short general-wellbeing card (not astrology, needs medical review) plus one optional traditional
// practice linked to the running Dasa (spiritual only, not health advice). No food, body-part or period verdicts.
function healthTodayCard(m) {
  if (!m || m.relation === 'organization') return '';
  let h;
  try { h = healthGuide(chartOf(m), { gender: m.gender, faith: faithOf(m) }); } catch { return ''; }
  const w = h.wellbeing, r = h.reflection;
  const habits = w.habits.filter((x) => ['sleep', 'walk', 'doctor'].includes(x.id));
  const pr = r.practices[0];
  return `<section class="card glass health-today" aria-labelledby="htTitle">
    <div class="card-title"><span id="htTitle">${icon('health', { size: 18 })} ${esc(bi(w.label))}</span></div>
    <ul class="ht-list">${habits.map((x) => `<li>${x.icon} ${esc(bi(x))}</li>`).join('')}</ul>
    ${pr ? `<p class="small ht-practice">🪔 <b>${esc(bi(r.label))}</b>: ${esc(bi(pr.lamp))}. <span class="muted">${L('Spiritual practice — not health advice.', 'ஆன்மீகப் பழக்கம் — உடல்நல ஆலோசனை அல்ல.')}</span></p>` : ''}
    ${healthNowHtml(m, { link: false })}
    <button class="chip-btn" data-go="health">${L('Full health guide ›', 'முழு ஆரோக்கிய வழிகாட்டி ›')}</button>
  </section>`;
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

// Who is Today for: one tap switches the person (like stories avatars); + adds a family member.
function whoChips(m) {
  if (!state.family.length) return `<div class="who-row"><button class="mchip who add" data-go="family" data-param='{"add":true}'>${icon('plus', { size: 16 })} ${L('Add your birth details for a personal day', 'தனிப்பட்ட பலனுக்குப் பிறப்பு விவரம் சேர்க்கவும்')}</button></div>`;
  return `<div class="who-row member-switch" role="group" aria-label="${esc(L('Whose day', 'யாருக்கான நாள்'))}">${state.family.map((x) => `<button class="mchip who${x.id === m?.id ? ' sel' : ''}" data-who="${esc(x.id)}" aria-pressed="${x.id === m?.id}"><span class="avatar sm">${esc(initialOf(displayName(x)))}</span>${esc(displayName(x))}</button>`).join('')}
    ${state.family.filter((x) => x.relation !== 'organization').length < 8 ? `<button class="mchip who add" data-go="family" data-param='{"add":true}' aria-label="${esc(L('Add a family member', 'குடும்ப உறுப்பினர் சேர்'))}">${icon('plus', { size: 16 })}</button>` : ''}</div>`;
}

// Quick actions: round icon buttons, one row (Ask, Prasnam, Porutham, Temples, Baby names, Muhurtham, All tools).
const QUICK_LABEL = { chat: ['Ask', 'கேள்'], ask: ['Prasnam', 'பிரசன்னம்'], porutham: ['Porutham', 'பொருத்தம்'], temples: ['Temples', 'கோவில்'], names: ['Baby names', 'பெயர்கள்'], muhurtham: ['Muhurtham', 'முகூர்த்தம்'] };
function quickRow(m) {
  const minor = m && m.relation !== 'organization' && !ageOf(m).adult;
  const ids = QUICK.filter((id) => toolById(id) && !(minor && id === 'porutham'));
  return `<nav class="quick-stories" aria-label="${esc(L('Quick actions', 'விரைவுச் செயல்கள்'))}">${ids.map((id) => `<button data-go="${id}"><span class="qs-ring">${iconChip(id, { size: 24 })}</span><span class="qs-l">${L(...QUICK_LABEL[id])}</span></button>`).join('')}
    <button data-go="tools"><span class="qs-ring">${iconChip('tools', { size: 24 })}</span><span class="qs-l qs-wrap">${L('All Tools', 'அனைத்துக் கருவிகள்')}</span></button></nav>`;
}

function renderHome(sec) {
  homeDay = dayKey();
  const loc = state.loc;
  const td = todayInfo(loc);
  const snap = state.snap || panchang(new Date(), loc.lat, loc.lon, loc.tz);
  const m = activeMember();
  const person = m && m.relation !== 'organization' ? m : null;
  const fest = td.festivals;
  const plans = savedPlans();
  const moreOpen = store.get('kj_home_more', false);
  sec.innerHTML = `
    <div class="home-top">
      <h2 class="home-greet">${L('Vanakkam', 'வணக்கம்')}${m ? `, ${esc(displayName(m))}` : ''}</h2>
      <p class="home-date">${esc(bi(td.weekday))} · ${esc(bi({ en: td.tamil.monthEn, ta: td.tamil.monthTa }))} ${td.tamil.day} · <span id="homeLoc">${esc(placeName(loc.name))}</span></p>
      ${zoneLine(loc, { id: 'indiaClock' })}
    </div>
    ${whoChips(m)}
    ${searchPill()}
    <div class="dsk-cols home-dash"><div class="dsk-col">
    ${growHomeHtml(m, snap, loc, td)}
    ${todayPlanCard(m, snap, loc, td)}
    ${timeStrip(td, snap, loc)}
    ${weekCardHtml()}
    ${goalsCardHtml()}
    ${dailyCard(m, snap, loc)}
    </div><div class="dsk-col">
    ${healthTodayCard(m)}
    ${person ? compatCardHtml(person, { uncertain: (() => { try { return !reliabilityOf(person).nakshatra; } catch { return false; } })(), idPrefix: 'cpHome' }) : ''}
    ${quickRow(m)}
    </div></div>
    <details class="home-more" id="homeMore"${moreOpen ? ' open' : ''}>
      <summary class="more-btn"><span>${L('More for today', 'மேலும்')}</span>${icon('next', { size: 18 })}</summary>
    <div class="hm-body">
    <section class="guide-box card" aria-labelledby="guideQ">
      <h2 id="guideQ" class="guide-q">${L('What would you like guidance on?', 'எதற்கு வழிகாட்டல் வேண்டும்?')}</h2>
      <form id="guideForm" class="chat-form guide-form">
        <button type="button" id="guideMic" class="mic" aria-label="${L('Speak your question', 'உங்கள் கேள்வியைப் பேசுங்கள்')}">🎙️</button>
        <label class="sr-only" for="guideInput">${L('Your question', 'உங்கள் கேள்வி')}</label>
        <textarea id="guideInput" class="grow-in" rows="2" autocomplete="off" maxlength="600" placeholder="${esc(L('Ask Thunai your question…', 'உங்கள் கேள்வியைத் துணையிடம் கேளுங்கள்…'))}"></textarea>
        <button class="send" aria-label="${L('Ask', 'கேள்')}">➤</button>
      </form>
      <div class="guide-sugs">${suggestionsFor(m ? ageOf(m) : ageProfile(null), m && !isHinduFaith(faithOf(m)) ? GUIDE_SUGGESTIONS_OTHER_FAITH : GUIDE_SUGGESTIONS, { count: 4 }).map((x) => `<button class="sg" type="button">${esc(bi(x))}</button>`).join('')}</div>
      <p class="small muted">${L('Type or speak — Tamil, English or Tanglish. You can check the words before sending.', 'தமிழ், ஆங்கிலம், தங்கிலீஷ் — எழுதலாம் அல்லது பேசலாம். அனுப்பும் முன் சரிபார்க்கலாம்.')}</p>
    </section>

    <div class="hero">
      <div class="hero-top">
        <div class="tamil-date">
          <div class="td-day">${td.tamil.day}</div>
          <div>
            <div class="td-month">${esc(bi({ en: td.tamil.monthEn, ta: td.tamil.monthTa }))}</div>
            <div class="td-year">${esc(ta() ? `${td.tamil.year.ta} வருடம்` : `${td.tamil.year.en} year`)} · ${esc(bi(td.weekday))}</div>
            <div class="muted small">${esc(fmtIsoDate(td.date))} ·${esc(placeName(loc.name))}</div>
          </div>
        </div>
        <div class="clock" id="clock">--:--:--</div>
      </div>
      ${fest.length ? `<div class="fest-row">${fest.map((f) => `<span class="fest ${f.kind}">${esc(bi(f))}</span>`).join('')}</div>` : ''}
      ${td.muhurthaDay ? `<div class="fest-row"><span class="fest muhurtham">${L('Subha Muhurtha day', 'சுப முகூர்த்த நாள்')}</span></div>` : ''}
      <div class="chips">
        <div class="chip-card"><span class="mini-label">${L('Star', 'நட்சத்திரம்')}</span><b>${esc(nakName(snap.nakshatra.index))}</b><span class="mini-sub">${esc(untilL(fmtTime(snap.nakshatra.endsAt, loc.tz)))}</span></div>
        <div class="chip-card"><span class="mini-label">${L('Tithi', 'திதி')}</span><b>${esc(tithiName(snap.tithi))}</b><span class="mini-sub">${esc(untilL(fmtTime(snap.tithi.endsAt, loc.tz)))}</span></div>
        <div class="chip-card"><span class="mini-label">${L('Sunrise', 'சூரிய உதயம்')}</span><b>${fmtTime(td.sunrise, loc.tz)}</b><span class="mini-sub">${L('Sunset', 'அஸ்தமனம்')} ${fmtTime(td.sunset, loc.tz)}</span></div>
      </div>
      <div class="btn-row"><button class="chip-btn" data-go="panchangam">${L('Full panchangam', 'முழு பஞ்சாங்கம்')}</button><button class="chip-btn" data-go="calendar">${L('Calendar', 'நாட்காட்டி')}</button></div>
    </div>

    <div class="card glass">
      <div class="card-title"><span>${L('Nalla Neram today', 'இன்றைய நல்ல நேரம்')}</span><span class="pill">${L('Gowri', 'கௌரி')}</span></div>
      <p class="zone-sub">🕒 ${esc(zoneText(loc))}</p>
      <div class="gowri">${td.gowri.filter((g) => g.part === 'day').map((g) => gowriCell(g, loc)).join('')}</div>
      <div class="kalam">${kalamCell(L('Rahu Kalam', 'ராகு காலம்'), td.rahuKalam, snap.inRahuKalam, loc)}${kalamCell(L('Yamagandam', 'எமகண்டம்'), td.yamagandam, snap.inYamagandam, loc)}${kalamCell(L('Guligai', 'குளிகை'), td.guligai, snap.inGuligai, loc)}</div>
      <div class="hora-mini" data-go="live" role="button" tabindex="0">
        <div class="hora-glyph" style="color:${COLOR[snap.currentHora.lord]}">${GLYPH[snap.currentHora.lord]}</div>
        <div style="flex:1"><div class="mini-label">${L('Current Horai', 'தற்போதைய ஓரை')}</div><div class="mini-value">${esc(dasaName(snap.currentHora.lord))} ${L('Horai', 'ஓரை')}</div></div>
        <div style="text-align:right"><div class="mini-label">${L('ends in', 'முடிய')}</div><div class="countdown" data-end="${new Date(snap.currentHora.end).getTime()}">${countdown(snap.currentHora.end)}</div></div>
      </div>
    </div>

    ${m && (!ageOf(m).adult || isMarried(m) || /^(father|mother|grand)/.test(m.relation || '') || m.relation === 'organization') ? '' : `<button class="card glass cta-card love-cta" data-go="lovematch"><b>${L('Love Match', 'காதல் பொருத்தம்')}</b><span class="small">${L('Emotional sync, chemistry and the star match — check your love vibe and share it', 'உணர்வு, ஈர்ப்பு, நட்சத்திரப் பொருத்தம் — உங்கள் காதல் அதிர்வைப் பார்த்துப் பகிருங்கள்')}</span></button>`}
    ${trialBanner()}
    ${plans.length ? `<div class="card glass"><div class="card-title"><span>${L('Saved plans', 'சேமித்த திட்டங்கள்')}</span><button class="link-btn" data-go="journey">${L('Plan new', 'புதிய திட்டம்')}</button></div>
      ${plans.slice(0, 3).map((p) => `<button class="plan-row" data-go="journey" data-param='${esc(JSON.stringify({ open: p.id }))}'><b>${esc(p.title)}</b><span class="muted small">${esc(p.dates || '')}</span></button>`).join('')}</div>`
    : `<button class="card glass cta-card journey-cta" data-go="journey"><b>${L('My Spiritual Journey', 'என் ஆன்மீகப் பயணம்')}</b><span class="small muted">${m && !isHinduFaith(faithOf(m)) ? L('Plan a family trip or pilgrimage that fits your leave, budget and family — route, timings, weather and stay.', 'உங்கள் விடுப்பு, பட்ஜெட், குடும்பத்திற்கு ஏற்ற குடும்பப் பயணம் அல்லது புனிதப் பயணம் — வழி, நேரம், வானிலை, தங்குமிடத்துடன்.') : L('Plan a temple visit that fits your leave, budget and family — route, timings, weather and stay.', 'உங்கள் விடுப்பு, பட்ஜெட், குடும்பத்திற்கு ஏற்ற கோவில் பயணம் — வழி, நேரம், வானிலை, தங்குமிடத்துடன்.')}</span></button>`}
    ${reminderCard()}
    ${familyCard(snap)}
    ${weatherCardHtml()}
    ${todayColorCard()}${relationsCard()}${parigaramCard(snap)}
    <button class="btn-soft" data-go="tools">${icon('tools', { size: 18 })} ${L('All Tools', 'அனைத்துக் கருவிகள்')}</button>
    <button class="btn-soft" id="shareToday">${icon('share', { size: 18 })} ${L('Share today\'s calendar', 'இன்றைய நாட்காட்டியைப் பகிர்')}</button>
    </div>
    </details>
    ${ratePrompt()}
    ${copyright()}`;
  fillHomeWeather(td);
  $('#homeMore', sec).addEventListener('toggle', (e) => store.set('kj_home_more', e.target.open));
  $('#dcShare')?.addEventListener('click', () => shareDaily(m, snap, loc));
  bindCompatCard(sec);
  $('#shareToday').addEventListener('click', () => import('./screens-tools.js').then((mod) => mod.shareToday(td, snap)));
  $$('.fam-row', sec).forEach((r) => r.addEventListener('click', () => { state.activeId = r.dataset.id; saveFamily(); renderHome(sec); }));
  $$('[data-who]', sec).forEach((b) => b.addEventListener('click', () => { state.activeId = b.dataset.who; saveFamily(); renderHome(sec); }));
  const ask = (q) => { q = (q || '').trim(); if (q) go('chat', { q }); };
  $('#guideForm').addEventListener('submit', (e) => { e.preventDefault(); ask($('#guideInput').value); });
  $$('.guide-sugs .sg', sec).forEach((b) => b.addEventListener('click', () => ask(b.textContent)));
  setupVoiceInput($('#guideMic'), $('#guideInput'));
  fillWeekCard(sec);
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
    const label = `${esc(bi(o.label))}${o.chandrashtama ? ` · ${L('Chandrashtamam', 'சந்திராஷ்டமம்')}` : ''}`;
    return `<button class="fam-row${m.id === state.activeId ? ' active' : ''}" data-id="${esc(m.id)}">
      <span class="avatar">${esc(initialOf(displayName(m)))}</span>
      <span class="fam-name">${esc(displayName(m))}<small>${esc(starRasiText(m, c))}</small></span>
      <span class="tag ${o.overall}">${label}</span></button>`;
  }).join('');
  return `<div class="card glass"><div class="card-title"><span>👨‍👩‍👧 ${L('Family today', 'இன்று குடும்பத்தினருக்கு')}</span><button class="link-btn" data-go="family">${L('Manage', 'நிர்வகி')}</button></div>${rows}</div>`;
}

function relationsCard() {
  const list = relationsList(3);
  if (!list) return '';
  return `<div class="card glass" data-go="relations"><div class="card-title"><span>💞 ${L('Family Relations Today', 'இன்று குடும்ப உறவு நிலை')}</span><span class="link-btn">${L('All', 'அனைத்தும்')} ›</span></div>${list.map((r) => relationRow(r)).join('')}</div>`;
}

function parigaramCard(snap) {
  const m = activeMember();
  // Faith and age first: another faith gets every-faith practices, a child gets child-safe ones.
  const person = m && m.relation !== 'organization' ? m : null;
  const items = dailyParigaram({ weekday: snap.weekday.index, chart: person && chartOf(person), snapshot: snap, faith: person ? faithOf(person) : 'hindu', profile: person ? ageOf(person) : null, now: new Date() }).slice(0, 2);
  // An adult with doshams: the dosham-based parigara sthalam first (shared/dosham.js), then today's practices.
  let ds = null;
  try {
    const prof = person ? ageOf(person) : null;
    if (person && prof && !prof.minor && !prof.unknown) ds = primarySthalam(diagnoseDoshams(chartOf(person), { minor: prof.minor, age: prof.age }), { faith: faithOf(person) });
  } catch (e) { console.warn('dosham', e); }
  return `<div class="card glass" data-go="parigaram"><div class="card-title"><span>🪔 ${L('Today\'s parigaram', 'இன்றைய பரிகாரம்')}${m ? ` · ${esc(displayName(m))}` : ''}</span><span class="link-btn">${L('All', 'அனைத்தும்')} ›</span></div>
    ${ds ? `<div class="pari-row dz-today"><span class="pg">🛕</span><div><b>${esc(bi(ds.item.name))} — ${esc(bi(ds.sthalam.name))}</b><p class="small">${esc(bi(ds.sthalam.why))}${ds.day ? ` · 📅 ${esc(bi(ds.day))}` : ''}</p></div></div>` : ''}
    ${items.map((i) => `<div class="pari-row"><span class="pg" style="color:${COLOR[i.planet]}">${GLYPH[i.planet]}</span><div><b>${esc(bi(i.reason))}</b><p>${esc(bi(i.free))}</p></div></div>`).join('')}</div>`;
}

function tickHome() {
  if (!state.loc) return;
  const now = new Date();
  const c = $('#clock');
  if (c) c.textContent = fmtTime(now, state.loc.tz, true);
  const ic = $('#indiaClock');
  if (ic) ic.textContent = indiaTimeText(now);
  for (const el of $$('[data-end]')) el.textContent = countdown(Number(el.dataset.end), now.getTime());
}

registerScreen('home', {
  render: renderHome, needsLoc: true,
  tick: () => {
    const ends = $$('#view-home [data-end], #view-home [data-flip]').map((e) => Number(e.dataset.end || e.dataset.flip));
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
      const retro = p.retrograde && k !== 'Rahu' && k !== 'Ketu' ? '<sup>℞</sup>' : ''; // one retrograde mark everywhere
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
    <g class="wl"><rect x="-${R3 - 3}" y="-18" width="28" height="14" rx="7" fill="#0b0626" stroke="#f5c26b" stroke-width="1"/>
    <text x="-${R3 - 17}" y="-11" fill="#ffe7a3" font-size="9" font-weight="700" text-anchor="middle" dominant-baseline="central">${L('ASC', 'லக்')}</text></g>
    <circle r="16" fill="url(#core)"/><g id="zplanets"></g>`;
  wheelBuilt = true;
}

function renderWheel(pos, lagnaLon, moonNak) {
  if (!wheelBuilt) buildWheel();
  const spin = lagnaLon - 180;
  $('#zring').setAttribute('transform', `rotate(${spin})`);
  // Ring labels turn with the zodiac; counter-rotate each one about its own anchor so every rasi name and star number
  // stays upright (horizontal), then shrink a rasi name only as much as the ring band allows at its current angle.
  $$('#wheel .wr, #wheel .wn').forEach((el) => el.setAttribute('transform', `rotate(${-spin} ${el.getAttribute('x')} ${el.getAttribute('y')})`));
  $$('#wheel .wr').forEach((el) => {
    const r = RASIS[el.dataset.i];
    const name = ta() ? (r.ta === 'விருச்சிகம்' ? 'விருச்சி' : r.ta) : r.en;
    if (el.textContent !== name) el.textContent = name;
    const phi = (Number(el.dataset.i) * 30 + 15 - spin) * Math.PI / 180;
    const room = Math.min(62 / Math.max(Math.abs(Math.sin(phi)), 0.01), 30 / Math.max(Math.abs(Math.cos(phi)), 0.01));
    el.setAttribute('font-size', '10.5');
    let w = 0;
    try { w = el.getComputedTextLength(); } catch { /* not laid out yet */ }
    if (w > room && 10.5 * room / w >= 8.5) el.setAttribute('font-size', (10.5 * room / w).toFixed(2));
    else if (w > room) {
      // A long name ("Mithunam", "Vrischikam") near 3 or 9 o'clock cannot fit upright in the band: lay it along the
      // ring (tangent, never upside down) where the 30° segment has ~62 units of room.
      let t = -(Number(el.dataset.i) * 30 + 15) + spin + 90;
      t = ((t % 360) + 360) % 360; if (t > 90 && t <= 270) t -= 180; if (t > 270) t -= 360;
      el.setAttribute('transform', `rotate(${t - spin} ${el.getAttribute('x')} ${el.getAttribute('y')})`);
      if (w > 62) el.setAttribute('font-size', Math.max(7.5, 10.5 * 62 / w).toFixed(2));
    }
  });
  $$('#wheel .wn').forEach((el) => el.setAttribute('fill', Number(el.dataset.i) === moonNak ? '#ffe066' : '#ddd5f3'));
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
      <svg id="wheel" viewBox="-160 -160 320 320" role="img" aria-label="${esc(L('Rasi Mandalam', 'ராசி மண்டலம்'))}"></svg>
      <div class="lagna-line" id="lagnaNow"></div>
    </div>
    <div class="grid2">
      ${[['Star', 'நட்சத்திரம்', `${nakName(s.nakshatra.index)} · ${L('Pada', 'பாதம்')} ${s.nakshatra.pada}`, s.nakshatra.endsAt, 'cdNak'],
    ['Tithi', 'திதி', tithiName(s.tithi), s.tithi.endsAt, 'cdTithi'],
    ['Moon Rasi', 'சந்திர ராசி', rasiName(s.moonRasi.index), s.moonRasi.endsAt, 'cdRasi'],
    ['Yoga', 'யோகம்', yogaName(s.yoga), s.yoga.endsAt, 'cdYoga'],
    ['Karanam', 'கரணம்', karanaName(s), s.karanaEndsAt, 'cdKarana'],
  ].map(([en, tx, v, end, id]) => `<div class="card glass"><div class="mini-label">${L(en, tx)}</div><div class="mini-value">${esc(v)}</div>
        <div class="mini-sub">${L('ends in', 'முடிய')} <span data-end="${end ? new Date(end).getTime() : ''}">${countdown(end, now)}</span></div>
        <div class="mini-sub">${end ? esc(untilL(fmtTime(end, loc.tz))) : ''}</div>${id === 'cdNak' ? '<div class="bar"><i id="cdNakBar"></i></div>' : ''}</div>`).join('')}
    </div>
    <div class="card glass">
      <div class="card-title"><span>${L('Horai', 'ஓரை')}</span><span class="muted small">☀ ${fmtTime(s.sunrise, loc.tz)} · 🌇 ${fmtTime(s.sunset, loc.tz)}</span></div>
      <div class="hora-now">
        <div class="hora-glyph" style="color:${COLOR[h.lord]}">${GLYPH[h.lord]}</div>
        <div style="flex:1"><div class="mini-label">${L('Current Horai', 'தற்போதைய ஓரை')}</div><div class="mini-value">${esc(dasaName(h.lord))} ${L('Horai', 'ஓரை')}</div><span class="tag ${q}">${ql}</span></div>
        <div style="text-align:right"><div class="mini-label">${L('ends in', 'முடிய')}</div><div class="countdown" data-end="${new Date(h.end).getTime()}">${countdown(h.end, now)}</div></div>
      </div>
      <div class="hora-list">${s.horai.map((x) => {
    const cls = now >= new Date(x.start).getTime() && now < new Date(x.end).getTime() ? 'now' : now >= new Date(x.end).getTime() ? 'past' : '';
    return `<div class="hora-item ${cls}"><b style="color:${COLOR[x.lord]}">${GLYPH[x.lord]} ${esc(ta() ? PLANETS[x.lord].short : x.lord.slice(0, 3))}</b>${fmtTime(x.start, loc.tz)}</div>`;
  }).join('')}</div>
    </div>
    <div class="card glass"><div class="card-title"><span>${L('Gochara (transit) chart', 'கோசார கட்டம்')}</span><span class="live-dot">${L('LIVE', 'நேரலை')}</span></div><div id="gocharaChart" class="si-chart"></div></div>`;
  // Centre the current horai inside its own horizontal strip only — scrollIntoView would also scroll the page
  // down to the strip, so Live sky opened half-way down on phones.
  setTimeout(() => {
    const it = $('.hora-item.now'), list = it?.parentElement;
    if (list) list.scrollTo({ left: Math.max(0, it.offsetLeft - list.offsetLeft - (list.clientWidth - it.offsetWidth) / 2), behavior: 'smooth' });
  }, 50);
  tickLive();
}
const subHeaderLocal = (title, sub) => `<div class="sub-head"><button class="back-btn" data-back="home" aria-label="${esc(L('Back', 'பின்செல்'))}">‹</button><div><h2>${title}</h2><p class="muted small">${sub}</p></div></div>`;

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
// CHART screen helpers (birth-time certainty, report horizon).
import { hasLagna, stabilityChip, doshamReference } from './core.js';
import { splitByHorizon, DASA_SCHEDULE_LABEL, REPORT_YEARS } from './shared/report-horizon.js';

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

/** Married: the profile says so, or it is the spouse / the self of a family that has a spouse profile. */
export const isMarried = (m) => !!m && (m.maritalStatus === 'married' || m.relation === 'spouse' || (m.relation === 'self' && state.family.some((x) => x.relation === 'spouse')));

/** First letter of a name as people read it (a whole Tamil letter: "ரா", not "ர"). */
export function initialOf(name) {
  const s = String(name || '').trim();
  if (!s) return '?';
  try { if (typeof Intl !== 'undefined' && Intl.Segmenter) return [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(s)][0].segment.toUpperCase(); } catch { /* fall back */ }
  return [...s][0].toUpperCase();
}

/** "Star · Rasi" for a member, hedged when the birth time is unknown and the star (or rasi) may change that day. */
export function starRasiText(m, c = chartOf(m)) {
  let rel = null;
  try { rel = reliabilityOf(m); } catch { rel = null; }
  const star = nakName(c.janmaNakshatra.index), rasi = rasiName(c.janmaRasi.index);
  if (!rel || (rel.nakshatra && rel.rasi)) return `${star} · ${rasi}`;
  if (!rel.rasi) return L(`${star}? · ${rasi}? (star and rasi uncertain — birth time unknown)`, `${star}? · ${rasi}? (பிறந்த நேரம் தெரியாததால் நட்சத்திரம், ராசி உறுதியில்லை)`);
  return L(`${star}? · ${rasi} (star uncertain — birth time unknown)`, `${star}? · ${rasi} (பிறந்த நேரம் தெரியாததால் நட்சத்திரம் உறுதியில்லை)`);
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
    <p><b>${esc(dasaName(d.lord))} ${L('Mahadasa', 'மகா தசை')}</b> · ${esc(periodRangeL(d, c.tz))}</p>
    ${b ? `<p><b>${esc(dasaName(b.lord))} ${L('Bhukti', 'புக்தி')}</b> · ${esc(untilL(periodLastL(b, c.tz)))}</p>` : ''}
    <button class="link-btn" data-go="chat" data-param='${esc(JSON.stringify({ q: L('Explain my current dasa-bhukti simply.', 'என் நடப்பு தசா-புக்தியை எளிமையாக விளக்குங்கள்.') }))}'>💬 ${L('Explain simply', 'எளிமையாக விளக்கு')}</button></div>`;
}

/** Dasa table rows: past + running + periods starting in the next REPORT_YEARS.dasaTable years; the rest behind "Show more". */
function dasaRows(c, now) {
  // One boundary convention (shared/fmt.js): "From" is the start date, "Till" the day before the next period starts.
  // The first Dasa starts at birth (its earlier, unlived part is the balance shown above the table).
  const birth = c.utc ? new Date(c.utc) : null;
  const startOf = (p) => (birth && new Date(p.start) < birth ? { ...p, start: birth } : p);
  const row = (p) => {
    const cur = now >= p.start && now < p.end;
    const bh = cur ? p.bhuktis.filter((b) => !birth || new Date(b.end) > birth).map((b) => `<tr class="${now >= b.start && now < b.end ? 'current' : ''}"><td style="padding-left:22px">↳ ${esc(dasaName(b.lord))} ${L('Bhukti', 'புக்தி')}</td><td>${esc(periodStartL(startOf(b), c.tz))}</td><td>${esc(periodLastL(b, c.tz))}</td></tr>`).join('') : '';
    return `<tr class="${cur ? 'current' : ''}"><td class="pl">${GLYPH[p.lord]} ${esc(planetName(p.lord))}${cur ? ` · ${L('now', 'நடப்பு')}` : ''}</td><td>${esc(periodStartL(startOf(p), c.tz))}</td><td>${esc(periodLastL(p, c.tz))}</td></tr>${bh}`;
  };
  const head = `<tr><th>${L('Dasa', 'தசை')}</th><th>${L('From', 'முதல்')}</th><th>${L('Till', 'வரை')}</th></tr>`;
  const { shown, more, years } = splitByHorizon(listedDasaPeriods(c), { from: now, years: REPORT_YEARS.dasaTable });
  return `<p class="muted small dasa-scope">📅 ${esc(bi(DASA_SCHEDULE_LABEL))} · ${L(`listed up to the next ${years} years`, `அடுத்த ${years} ஆண்டுகள் வரை பட்டியல்`)}</p>
    <div class="table-wrap"><table>${head}${shown.map(row).join('')}</table></div>
    ${more.length ? `<details class="dasa-more"><summary class="link-btn">${L(`Show more (${more.length} later periods)`, `மேலும் காட்டு (${more.length} பிந்தைய காலங்கள்)`)}</summary><div class="table-wrap"><table>${head}${more.map(row).join('')}</table></div></details>` : ''}`;
}

function renderChart(sec) {
  const m = activeMember();
  const c = chartOf(m);
  const rel = reliabilityOf(m);
  // Lagna-based items: shown whenever the chart has a real Lagna (approximate times carry "may change" chips);
  // never for an unknown time (chart.lagna === null — no noon placeholder).
  const showLagna = hasLagna(c);
  const showNavamsa = showLagna && !c.fromKattam;
  const approx = c.stability?.timePrecision === 'approximate';
  const chip = (...k) => stabilityChip(c, ...k);
  const sub = `${esc(displayName(m))}<br>${esc(fmtBirthL(c.date, rel.timeShown ? c.time.slice(0, 5) : ''))}${rel.timeShown && rel.certainty === 'approx' ? ` ±${rel.windowMin}′` : ''}<br>${esc(placeName(c.place))}`;
  const bp = c.birthPanchang;
  const strength = grahaStrength(c.planets);
  const d = doshams(c.planets, { stability: c.stability });
  const dRef = doshamReference(d);
  const nl = nameLetters(c.janmaNakshatra.index, c.janmaNakshatra.pada);
  const now = new Date();
  const order = ['Lagna', 'Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
  sec.innerHTML = `${memberSwitcher(m.id)}
    ${certaintyBanner(rel)}
    ${dasaSummaryCard(c, rel)}
    <div class="dsk-cols chart-dash"><div class="dsk-col">
    <div class="card glass"><div class="card-title"><span>${L('Rasi chart', 'ராசி கட்டம்')}</span><button class="link-btn" data-go="chat" data-param='{"topic":"chart"}'>💬 ${L('Ask about my chart', 'என் ஜாதகம் பற்றிக் கேள்')}</button></div><div id="rasiChart" class="si-chart"></div>
      ${showLagna ? (chip('lagna') ? `<p class="small">${L('Lagnam (ல)', 'லக்னம் (ல)')} ${chip('lagna')}</p>` : '') : `<p class="small muted needs-time">${L('Lagnam (ல) is not marked — it needs the birth time. Planet signs are shown; houses are read from the Moon sign.', 'லக்னம் (ல) குறிக்கப்படவில்லை — அதற்குப் பிறந்த நேரம் தேவை. கிரக ராசிகள் காட்டப்படுகின்றன; பாவங்கள் சந்திர ராசியிலிருந்து.')}</p>`}</div>
    <button class="btn-gold" data-go="analysis">📜 ${L('Full chart reading', 'முழு ஜாதக ஆய்வு')}</button>
    <div class="btn-row"><button class="chip-btn" data-go="parigaram">🪔 ${L('Simple practices', 'எளிய வழிபாடு')}</button><button class="chip-btn" data-go="peyarchi">🪐 ${L('Transits', 'பெயர்ச்சி')}</button><button class="chip-btn" data-go="health">🌿 ${L('Wellbeing', 'பொது நலம்')}</button><button class="chip-btn" data-print="1">🖨️ ${L('Print / PDF', 'அச்சிடு / PDF')}</button></div>
    <details class="card glass advanced"><summary class="card-title">🔬 ${L('Advanced', 'மேம்பட்டவை')}</summary>
      <div class="menu">
        ${[['roadmap', 'Dasa road map — life periods', 'தசா வரைபடம் — வாழ்க்கைக் காலங்கள்'], ['vargas', 'Divisional charts & Ashtakavarga', 'வர்க்கச் சக்கரங்கள் & அஷ்டகவர்க்கம்'], ['life', 'Life questions — traditional timing', 'வாழ்க்கைக் கேள்விகள் — பாரம்பரிய காலம்'], ['guide', 'My guide — colour, number, Siddhar', 'என் வழிகாட்டி — நிறம், எண், சித்தர்'], ['numerology', 'Name & number numerology', 'பெயர் & எண் கணிதம்'], ['live', 'Live sky', 'நேரலை வானம்']].map(([id, en, tx]) => `<button data-go="${id}">${iconChip(id, { size: 20, cls: 'mi-icon' })}<span>${L(en, tx)}${id === 'vargas' && !showNavamsa ? ` <span class="badge unv">${L('needs birth time', 'பிறந்த நேரம் தேவை')}</span>` : id === 'vargas' && approx ? ` ${chip('navamsaLagna', 'D10Lagna', 'D60Lagna')}` : ''}</span></button>`).join('')}
      </div></details>
    ${showNavamsa ? `<div class="card glass"><div class="card-title">${L('Navamsa chart', 'நவாம்ச கட்டம்')}${chip('navamsaLagna')}</div><div id="navamsaChart" class="si-chart"></div></div>` : ''}
    </div><div class="dsk-col">
    <div class="card glass"><div class="card-title">${L('Birth details', 'பிறப்பு விவரம்')}</div>
      <dl class="kv">
        <dt>${L('Birth star', 'ஜென்ம நட்சத்திரம்')}</dt><dd>${rel.nakshatra ? `${esc(nakName(c.janmaNakshatra.index))}${rel.pada ? ` · ${L('Pada', 'பாதம்')} ${c.janmaNakshatra.pada}` : ''}${chip('moonNakshatra', 'moonPada')}` : `<span class="badge unv">${L('uncertain — the star changes on this day', 'உறுதியில்லை — அன்று நட்சத்திரம் மாறுகிறது')}</span>`}</dd>
        <dt>${L('Rasi', 'ராசி')}</dt><dd>${esc(rasiName(c.janmaRasi.index))}</dd>
        <dt>${L('Lagnam', 'லக்னம்')}</dt><dd>${showLagna ? `${esc(rasiName(c.lagna.rasi))}${c.fromKattam ? '' : ` ${esc(c.lagna.dms)}`}${chip('lagna')}` : `<span class="badge unv">${L('needs birth time', 'பிறந்த நேரம் தேவை')}</span>`}</dd>
        ${showNavamsa ? `<dt>${L('Navamsa Lagnam', 'நவாம்ச லக்னம்')}</dt><dd>${esc(rasiName(c.lagna.navamsaRasi))}${chip('navamsaLagna')}</dd>` : ''}
        <dt>${L('Weekday', 'கிழமை')}</dt><dd>${esc(bi(bp.weekday))}</dd>
        <dt>${L('Tithi', 'திதி')}</dt><dd>${esc(tithiName(bp.tithi))}</dd>
        <dt>${L('Yoga / Karanam', 'யோகம் / கரணம்')}</dt><dd>${esc(yogaName(bp.yoga))} / ${esc(karanaName(bp))}</dd>
        <dt>${L('Name letters', 'பெயர் எழுத்து')}</dt><dd>${esc(nl.primary.ta)} (${esc(nl.primary.en)})</dd>
        <dt>${L('Ayanamsa', 'அயனாம்சம்')}</dt><dd>${c.ayanamsa.toFixed(4)}° ${L('Lahiri', 'லாஹிரி')}</dd>
      </dl></div>
    ${compatCardHtml(m, { uncertain: !rel.nakshatra, idPrefix: 'cpChart' })}
    <div class="card glass"><div class="card-title">💪 ${L('Planet strength (Graha Balam)', 'கிரக பலம்')}</div>
      ${strength.map((g) => `<button class="gb-row" data-planet="${g.planet}">
        <span class="gb-name" style="color:${COLOR[g.planet]}">${GLYPH[g.planet]} ${esc(planetName(g.planet))}</span>
        <span class="gb-bar"><i class="${g.level}" style="width:${g.score}%"></i></span>
        ${scaleTag(g.level)}</button>
        <div class="gb-detail" id="gb-${g.planet}" hidden>
          <ul>${g.reasons.map((r) => `<li>${r.pts > 0 ? '▲' : '▼'} ${esc(L(r.en, r.ta))}</li>`).join('') || `<li>${L('No special factors', 'சிறப்புக் காரணிகள் இல்லை')}</li>`}</ul>
          <p class="muted small">${esc(bi(NAVAGRAHA[g.planet].governs))}</p>
          ${g.level === 'weak' ? `<p>🪔 ${hymnText(bi(NAVAGRAHA[g.planet].free))}</p><p>🛕 ${esc(bi(NAVAGRAHA[g.planet].temple))}</p>` : ''}
        </div>`).join('')}</div>
    ${ageOf(m).minor ? `<div class="card glass"><div class="card-title">${L('Doshams', 'தோஷங்கள்')}</div><p class="small">🌱 ${L('Doshams are looked at only for marriage matching, after 18. For a child, the chart is read for studies, health and good habits.', 'தோஷங்கள் 18 வயதுக்குப் பிறகு திருமணப் பொருத்தத்திற்கு மட்டுமே பார்க்கப்படும். குழந்தைக்கு ஜாதகம் கல்வி, ஆரோக்கியம், நல்ல பழக்கங்களுக்காக மட்டுமே பார்க்கப்படுகிறது.')}</p></div>` : `<div class="card glass"><div class="card-title">${L('Doshams', 'தோஷங்கள்')}</div>
      ${dRef ? `<p class="small muted"><span class="pill">${L('Moon reference', 'சந்திர லக்னம்')}</span> ${esc(bi(dRef))}</p>` : d.chevvai.lagnaStable === false ? `<p class="small">${chip('lagna', 'house:Mars')} ${L('The Lagna-based check can change within your birth-time window.', 'லக்ன அடிப்படைக் கணக்கு உங்கள் பிறந்த நேர இடைவெளிக்குள் மாறலாம்.')}</p>` : ''}
      <div class="factor"><span>${L('Chevvai (Mars) dosham', 'செவ்வாய் தோஷம்')}</span><b class="${d.chevvai.present ? 'neg' : 'pos'}">${d.chevvai.present ? L('Present', 'உண்டு') : d.chevvai.raw ? L('Cancelled', 'நிவர்த்தி') : L('None', 'இல்லை')}</b></div>
      ${d.chevvai.exceptions.map((e) => `<p class="muted small">✓ ${esc(bi(e))}</p>`).join('')}
      <div class="factor"><span>${L('Rahu-Ketu dosham', 'ராகு-கேது தோஷம்')}</span><b class="${d.rahuKetu.present ? 'neg' : 'pos'}">${d.rahuKetu.present ? L('Present', 'உண்டு') : L('None', 'இல்லை')}</b></div>
      ${(d.chevvai.present || d.rahuKetu.present) && !isMarried(m) ? `<p class="muted small">${L('A dosham is common and is balanced by a partner with a similar dosham (dosha samyam). It is not a cause for fear.', 'தோஷம் பொதுவானது; இதே தோஷம் உள்ள வரனுடன் சமமாகும் (தோஷ சாம்யம்). பயப்பட வேண்டியதில்லை.')}</p>` : ''}
    </div>`}
    ${rel.nakshatra ? `<div class="card glass"><div class="card-title">${L('Vimshottari Dasa', 'விம்சோத்தரி தசை')}${rel.dasa ? '' : ` <span class="badge est">${L(`approx. ± ${rel.dasaShiftDays} days`, `தோராயம் ± ${rel.dasaShiftDays} நாள்`)}</span>`}</div>
      <p class="muted small">${L('Dasa balance at birth', 'பிறப்பு தசா இருப்பு')}: ${esc(dasaName(c.dasa.balance.lord))} ${L('Dasa', 'தசை')} ${esc(fmtYMDL(c.dasa.balance.years))}${chip('moonNakshatra', 'moonPada') ? ` ${chip('moonNakshatra', 'moonPada')}` : approx ? ` <span class="badge est stab-chip">${L(`dasa start may shift ± ${rel.dasaShiftDays} days`, `தசா தொடக்கம் ± ${rel.dasaShiftDays} நாள் மாறலாம்`)}</span>` : ''}</p>
      ${dasaRows(c, now)}</div>` : ''}
    <div class="card glass"><div class="card-title">${L('Planet positions', 'கிரக நிலை')}</div>${rel.timeShown ? '' : `<p class="small muted">${L('Positions are for the middle of the birth day; the Moon can differ by up to ±7°.', 'பிறந்த நாளின் நடுப்பகுதிக்கான நிலைகள்; சந்திரன் ±7° வரை மாறலாம்.')}</p>`}<div class="table-wrap"><table>
      <tr><th>${L('Planet', 'கிரகம்')}</th><th>${L('Rasi', 'ராசி')}</th>${showLagna ? `<th>${L('House', 'பாவம்')}</th>` : ''}<th>${L('Degree', 'பாகை')}</th><th>${L('Star', 'நட்சத்திரம்')}</th><th>${L('Pada', 'பாதம்')}</th></tr>
      ${order.filter((k) => c.planets[k] && (k !== 'Lagna' || showLagna)).map((k) => { const p = c.planets[k]; const h = showLagna ? ((p.rasi - c.lagna.rasi + 12) % 12) + 1 : null; return `<tr><td class="pl" style="color:${COLOR[k]}">${GLYPH[k]} ${esc(planetName(k))}${p.retrograde && !['Rahu', 'Ketu'].includes(k) ? ' ℞' : ''}</td><td>${esc(rasiName(p.rasi))}</td>${showLagna ? `<td>${h}${k === 'Lagna' ? chip('lagna') : chip(`house:${k}`)}</td>` : ''}<td>${esc(p.dms)}</td><td>${esc(nakName(p.nakshatra))}${k === 'Moon' ? chip('moonNakshatra') : ''}</td><td>${p.pada}${k === 'Moon' ? chip('moonPada') : ''}</td></tr>`; }).join('')}
    </table></div></div>
    </div></div>
    ${copyright()}`;
  const noLagna = (houses) => (showLagna ? houses : houses.map((h) => h.filter((k) => k !== 'Lagna')));
  renderSI($('#rasiChart'), noLagna(c.charts.rasi), c.planets, showLagna ? c.lagna.rasi : -1, L('Rasi', 'ராசி'), sub, true);
  if (showNavamsa) renderSI($('#navamsaChart'), c.charts.navamsa, c.planets, c.lagna.navamsaRasi, L('Navamsa', 'நவாம்சம்'), sub, false);
  $$('.gb-row', sec).forEach((b) => b.addEventListener('click', () => { const d2 = $(`#gb-${b.dataset.planet}`); d2.hidden = !d2.hidden; }));
  bindCompatCard(sec);
  $$('.mchip', sec).forEach((b) => b.addEventListener('click', () => { state.activeId = b.dataset.mid; saveFamily(); renderChart(sec); }));
}
registerScreen('chart', { render: renderChart, needsMember: true });

// ================================================================ PRASNAM
// The app's special feature: one tap (or one typed question in Tamil / Tanglish / English) casts the Prasnam for
// this second. Tiles are grouped; the person it is asked for is shown on top, and a child sees only what suits the age.
import { RELATIONS } from './core.js';
import { PRASNA_GROUPS, getCategory, detectPrasnaCategory, defaultAsker, askerBanner, prasnaSummary } from './shared/prasna.js';
import { ageGuardAnswer } from './shared/age-guard.js';

let prasnaCategory = null;
let lastAnswer = null;
let askForId = null;
const askMember = () => state.family.find((m) => m.id === askForId) || defaultAsker(state.family, ageOf) || activeMember();
const relOf = (m) => RELATIONS.find((r) => r.id === m.relation) || RELATIONS.find((r) => r.id === 'other');
/** Who the banner names: the relation ("மகன்") when it is a family relation, else the person's name. */
const whoOf = (m) => (m.relation && !['self', 'other', 'organization'].includes(m.relation) ? relOf(m) : { en: displayName(m), ta: displayName(m) });
const prasnaTile = (c) => `<button type="button" class="cat pq-cat${prasnaCategory === c.id ? ' sel' : ''}" data-id="${c.id}"><span class="ci" aria-hidden="true">${c.icon}</span><span class="pq-name">${esc(bi(c))}</span></button>`;

function renderAsk(sec) {
  // Age first — but only for the person actually selected: a child sees study / exam / health / temple / family matters.
  const m = askMember();
  const prof = m ? ageOf(m) : ageProfile(null);
  const allowed = (c) => categoryAllowed(c.id, prof);
  if (prasnaCategory && !allowed(getCategory(prasnaCategory))) prasnaCategory = null;
  if (lastAnswer && lastAnswer.category && !allowed(getCategory(lastAnswer.category))) lastAnswer = null;
  const banner = m ? askerBanner(prof, whoOf(m), state.lang) : null;
  const people = state.family.filter((x) => x.relation !== 'organization' || state.family.length > 1)
    .sort((x, y) => (y.relation === 'self') - (x.relation === 'self')); // the user first
  const groups = PRASNA_GROUPS.map((g) => {
    const list = g.ids.map(getCategory).filter((c) => c && allowed(c));
    return list.length ? `<section class="pq-group" aria-label="${esc(L(g.en, g.ta))}"><h3 class="pq-gh"><span aria-hidden="true">${g.icon}</span> ${esc(L(g.en, g.ta))}</h3><div class="cat-grid pq-grid">${list.map(prasnaTile).join('')}</div></section>` : '';
  }).join('');
  sec.innerHTML = `<div class="seg ask-switch" role="tablist"><button role="tab" aria-selected="false" data-go="chat">💬 ${L('Ask Thunai', 'துணையிடம் கேள்')}</button><button class="sel" role="tab" aria-selected="true">🔮 ${L('Is now a good time? (Prasnam)', 'இப்போது செய்யலாமா? (பிரசன்னம்)')}</button></div>
    <div class="card glass pq-card">
      <h2>${L('Is now a good time? (Prasnam)', 'இப்போது செய்யலாமா? (பிரசன்னம்)')}</h2>
      ${people.length ? `<div class="pq-label">${L('Asking for', 'யாருக்காக')}</div>
      <div class="pq-people" role="radiogroup" aria-label="${esc(L('Asking for', 'யாருக்காக'))}">${people.map((x) => {
    const p = ageOf(x);
    const sub = [bi(relOf(x)), p.age != null && x.relation !== 'organization' ? L(`${p.age} yrs`, `${p.age} வயது`) : ''].filter(Boolean).join(' · ');
    const on = x.id === m?.id;
    return `<button type="button" class="pq-person${on ? ' sel' : ''}${p.minor ? ' minor' : ''}" role="radio" aria-checked="${on}" data-mid="${esc(x.id)}"><span class="avatar pq-av" aria-hidden="true">${esc(initialOf(displayName(x)))}</span><span class="pq-pt"><b>${esc(displayName(x))}</b><small>${esc(sub)}</small></span></button>`;
  }).join('')}</div>` : ''}
      ${banner ? `<button type="button" class="pq-minor" id="askMinor">🌱 ${esc(banner)}</button>` : ''}
      <p class="muted pq-lead">${L('Type your question or tap a box — the Prasnam is cast for this exact second.', 'உங்கள் கேள்வியை எழுதுங்கள் அல்லது ஒரு பெட்டியைத் தட்டுங்கள் — இந்த நொடிக்கான பிரசன்னம் கணிக்கப்படும்.')}</p>
      <label class="sr-only" for="question">${L('Your question', 'உங்கள் கேள்வி')}</label>
      <textarea id="question" rows="2" maxlength="400" placeholder="${esc(prof.minor ? L('e.g. Is today good to start revision for the exam?', 'உ.தா. தேர்வுக்கான படிப்பை இன்று தொடங்கலாமா?') : L('e.g. Nagai vangalama? · Can I sign the flat agreement today?', 'உ.தா. இன்று நகை வாங்கலாமா? · ஒப்பந்தம் கையெழுத்திடலாமா?'))}"></textarea>
      <p id="askGuess" class="small pq-guess" aria-live="polite" hidden></p>
      <button id="askBtn" class="btn-gold">🔮 ${L('Ask now', 'இப்போது கேளுங்கள்')}</button>
      <details class="prasna-intro">
        <summary>📖 ${L('What is Prasnam?', 'பிரசன்னம் என்றால் என்ன?')}</summary>
        <p>${L('Prasnam (horary astrology) answers a question from the sky at the very moment it is asked — no birth time is needed. It is a long-standing Tamil and Kerala tradition for everyday decisions.', 'பிரசன்னம் என்பது கேள்வி கேட்கப்படும் அந்த நொடியின் கிரக நிலையைக் கொண்டு பதில் சொல்லும் ஜோதிட முறை — பிறந்த நேரம் தேவையில்லை. அன்றாட முடிவுகளுக்காகத் தமிழகத்திலும் கேரளத்திலும் நெடுங்காலமாகப் பின்பற்றப்படும் மரபு.')}</p>
        <p><b>${L('How Thunai works it out', 'துணை எப்படிக் கணிக்கிறது')}</b><br>${L('For this exact second and your location it checks the Horai lord for your task, Rahu Kalam, Yamagandam and Guligai, the star, tithi and yoga of the moment, the Prasna Lagna, and — from your birth star — Tara Bala and Chandrashtamam. Each factor adds or removes points, giving a clear Do / Take care / Wait for a better time answer, with the best times in the next 24 hours.', 'இந்த நொடிக்கும் உங்கள் இடத்திற்கும் — உங்கள் காரியத்திற்கான ஓரை அதிபதி, ராகு காலம், எமகண்டம், குளிகை, அந்நேர நட்சத்திரம், திதி, யோகம், பிரசன்ன லக்னம், உங்கள் ஜென்ம நட்சத்திரப்படி தாரா பலம், சந்திராஷ்டமம் ஆகியவற்றைப் பார்க்கிறது. ஒவ்வொன்றும் புள்ளிகளைக் கூட்டி அல்லது குறைத்து, "செய்யலாம் / கவனத்துடன் / நல்ல நேரம் பார்த்து" என்ற தெளிவான பதிலையும், அடுத்த 24 மணி நேரத்தின் சிறந்த நேரங்களையும் தருகிறது.')}</p>
        <p><b>${L('How accurate is it?', 'எவ்வளவு துல்லியம்?')}</b><br>${L('Planet positions, times and panchangam are calculated precisely for your place. The verdict follows traditional Prasna rules, so treat it as guidance on timing — your real deadlines, a doctor, lawyer or bank always come first.', 'கிரக நிலை, நேரங்கள், பஞ்சாங்கம் ஆகியவை உங்கள் இடத்திற்குத் துல்லியமாகக் கணிக்கப்படுகின்றன. முடிவு பாரம்பரிய பிரசன்ன விதிகளின்படி அமைகிறது — இதை நேரம் பற்றிய வழிகாட்டலாகக் கொள்ளுங்கள்; உண்மையான காலக்கெடு தேதிகள், மருத்துவர், வழக்கறிஞர், வங்கி ஆலோசனை எப்போதும் முதன்மை.')}</p>
      </details>
      <div class="pq-groups">${groups}</div>
    </div>
    <div id="answer"${lastAnswer ? '' : ' hidden'}>
      <div class="card glass verdict-card" id="verdictCard"></div>
      <div class="card glass"><div class="card-title"><span>${L('Thunai says', 'துணை பதில்')}</span><span><button class="link-btn" id="speakReply" aria-label="${esc(L('Read aloud', 'சத்தமாக வாசி'))}">🔊</button> <span id="aiSource" class="pill"></span></span></div><div id="reply" class="reply"></div></div>
      <div class="card glass" id="bestCard"></div>
      <div class="card glass" id="factorCard"></div>
    </div>`;
  $$('.pq-cat', sec).forEach((b) => b.addEventListener('click', () => ask({ category: b.dataset.id })));
  $('#askBtn').addEventListener('click', () => ask());
  $$('.pq-person', sec).forEach((b) => b.addEventListener('click', () => { askForId = b.dataset.mid; renderAsk(sec); }));
  $('#askMinor')?.addEventListener('click', () => {
    const adult = defaultAsker(state.family, ageOf);
    if (adult && adult.id !== m?.id && ageOf(adult).adult) { askForId = adult.id; renderAsk(sec); } else $('.pq-people')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  let t;
  $('#question').addEventListener('input', (e) => { clearTimeout(t); t = setTimeout(() => showGuess(e.target.value), 250); });
  $('#speakReply').addEventListener('click', () => { if (!speak($('#reply').textContent)) toast(L('Read-aloud is not available on this device', 'இந்தச் சாதனத்தில் வாசித்துக்காட்டும் வசதி இல்லை')); });
  if (lastAnswer) {
    if (lastAnswer.guard) renderGuard(lastAnswer.guard);
    else { renderAnswer(lastAnswer); $('#reply').textContent = lastAnswer.reply || ''; $('#aiSource').textContent = lastAnswer.source || ''; }
  }
}

/** While typing: show which box the question will be read as, and highlight it. */
function showGuess(text) {
  const el = $('#askGuess');
  if (!el) return;
  const id = text.trim() ? detectPrasnaCategory(text) : null;
  $$('.pq-cat').forEach((x) => x.classList.toggle('guess', x.dataset.id === id));
  const c = id && getCategory(id);
  el.hidden = !c;
  if (!c) return;
  el.innerHTML = $(`.pq-cat[data-id="${id}"]`) ? `🔎 ${L('Will be read as', 'இப்படிப் பார்க்கப்படும்')}: <b>${c.icon} ${esc(bi(c))}</b>`
    : `🌱 ${L(`${c.en} is not read for this age`, `${c.ta} — இந்த வயதுக்குப் பார்க்கப்படுவதில்லை`)}`;
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
  const cat = getCategory(a.category);
  const s = prasnaSummary(a, cat);
  const tzName = loc.name ? L(`${placeName(loc.name)} time`, `${placeName(loc.name)} நேரம்`) : L('local time', 'உள்ளூர் நேரம்');
  const first = a.bestTimes?.[0];
  const deadline = a.practical?.deadlineFirst ? a.practical.note : a.deadlineNote ? bi(a.deadlineNote) : '';
  const read = a.how === 'text' ? `<p class="pq-read">🔎 ${L('Your question was read as', 'உங்கள் கேள்வி இப்படிப் பார்க்கப்பட்டது')}: <b>${cat.icon} ${esc(bi(cat))}</b></p>`
    : a.how === 'fallback' ? `<p class="pq-read">🔎 ${L('No specific work was recognised, so it was read as', 'குறிப்பிட்ட காரியம் கண்டறியப்படவில்லை; எனவே இப்படிப் பார்க்கப்பட்டது')}: <b>${cat.icon} ${esc(bi(cat))}</b>. ${L('Tap a box below for a sharper answer.', 'துல்லியமான பதிலுக்குக் கீழே ஒரு பெட்டியைத் தட்டுங்கள்.')}</p>` : '';
  $('#verdictCard').innerHTML = `<div class="muted small">${cat.icon} ${esc(bi(cat))}${a.forName ? ` · ${esc(a.forName)}` : ''} · ${fmtTime(a.snapshot.at, loc.tz, true)}</div>
    ${read}
    ${gauge(a.score, a.verdict)}
    <div class="verdict-big ${a.verdict}">${a.verdict === 'DO' ? '✅' : a.verdict === 'CAUTION' ? '⚠️' : '⛔'} ${esc(bi(a.verdictText))}</div>
    <p class="small muted">${L('Traditional points out of 100 — not a measured probability of success.', 'பாரம்பரியப் புள்ளிகள் 100-க்கு — வெற்றியின் அளவிடப்பட்ட நிகழ்தகவு அல்ல.')}</p>
    <div class="pq-sum">
      ${s.reasons.length ? `<div class="pq-row"><div class="pq-h">${L('Why', 'காரணங்கள்')}</div><ul class="pq-why">${s.reasons.map((r) => `<li class="${r.points > 0 ? 'pos' : 'neg'}">${r.points > 0 ? '▲' : '▼'} ${esc(L(r.en, r.ta))}</li>`).join('')}</ul></div>` : ''}
      <div class="pq-row"><div class="pq-h">🕰️ ${L('Best time in the next 24 h', 'அடுத்த 24 மணி நேரத்தில் சிறந்த நேரம்')}</div>
        <p>${first ? `<b>${fmtDate(first.start, loc.tz)} · ${fmtTimeRange(first.start, first.end, loc.tz)}</b> <span class="muted small">(${esc(tzName)})</span>` : L('No strongly favourable window in the next 24 hours.', 'அடுத்த 24 மணி நேரத்தில் வலுவான நல்ல நேரம் இல்லை.')}</p></div>
      <div class="pq-row pq-do"><div class="pq-h">👉 ${L('What to do now', 'இப்போது செய்ய வேண்டியது')}</div><p>${esc(bi(s.doNow))}</p>${deadline ? `<p class="small">🧭 ${esc(deadline)}</p>` : ''}</div>
      ${s.parigaram ? `<div class="pq-row pq-pari"><div class="pq-h">🪔 ${L('Simple parigaram (free)', 'எளிய பரிகாரம் (இலவசம்)')}</div><p>${esc(bi(s.parigaram))}</p></div>` : ''}
    </div>
    <div class="muted small" style="margin-top:6px">${L('Horai', 'ஓரை')}: ${esc(planetName(a.snapshot.currentHora.lord))} · ${L('Star', 'நட்சத்திரம்')}: ${esc(nakName(a.snapshot.nakshatra.index))} · ${L('Lagna', 'லக்னம்')}: ${esc(rasiName(a.snapshot.lagna.rasi))}</div>
    ${clarityPrompt('prasnam')}`;
  if (!a.counted) { a.counted = true; document.dispatchEvent(new CustomEvent('kj:task', { detail: 'prasnam' })); } // metrics: Prasnam answered (consent-gated, growth.js)
  animateGauges();
  $('#factorCard').hidden = false; $('#bestCard').hidden = false;
  $('#factorCard').innerHTML = `<details><summary class="card-title">${L('All astrological factors', 'எல்லா ஜோதிடக் காரணிகளும்')} (${a.factors.length})</summary>${a.factors.map((f) => `<div class="factor"><span>${esc(ta() ? f.labelTa : f.label)}</span><b class="${f.points > 0 ? 'pos' : f.points < 0 ? 'neg' : 'zero'}">${f.points > 0 ? '+' : ''}${f.points}</b></div>`).join('')}</details>`;
  $('#bestCard').innerHTML = `<div class="card-title">🕰️ ${L('Good windows in the next 24 hours', 'அடுத்த 24 மணி நேர நல்ல நேரங்கள்')} <span class="pill">${esc(tzName)}</span></div>${a.bestTimes.length ? a.bestTimes.map((w) => `<div class="best">🌟 ${fmtDate(w.start, loc.tz)} · <b>${fmtTimeRange(w.start, w.end, loc.tz)}</b><br><span class="muted small">${L('score', 'மதிப்பு')} ${w.best} · ${esc(dasaName(w.hora))} ${L('Horai', 'ஓரை')}</span></div>`).join('') : `<p class="muted">${L('No strongly favourable window in the next 24 hours.', 'அடுத்த 24 மணி நேரத்தில் வலுவான நல்ல நேரம் இல்லை.')}</p>`}`;
}

/** A typed adult question for a child: the warm age-appropriate reply instead of a Prasnam. */
function renderGuard(g) {
  $('#answer').hidden = false;
  $('#verdictCard').hidden = true; $('#factorCard').hidden = true; $('#bestCard').hidden = true;
  $('#reply').innerHTML = g.sections.map((s) => `<p><b>${esc(s.title)}</b></p><ul>${s.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>`).join('');
  $('#aiSource').textContent = '';
}

async function askOnDevice(body, m, extra) {
  const c = m && chartOf(m);
  const birth = c && { janmaNakshatra: c.janmaNakshatra.index, janmaRasi: c.janmaRasi.index };
  const evaluation = evaluatePrasna({ at: new Date(), category: body.category, loc: body.loc, birth });
  const a = { ...extra, category: body.category, score: evaluation.score, verdict: evaluation.verdict, verdictText: evaluation.verdictText, factors: evaluation.factors, bestTimes: evaluation.bestTimes, snapshot: evaluation.snapshot, practicalFirst: evaluation.practicalFirst, deadlineNote: evaluation.deadlineNote };
  lastAnswer = a;
  renderAnswer(a);
  const profile = c && { name: c.name, janmaNakshatraName: c.janmaNakshatra.name, janmaRasiName: c.janmaRasi.name, lagnaName: c.lagna?.rasiName ?? null, currentDasa: c.dasa.current && `${c.dasa.current.lord} Dasa / ${c.dasa.currentBhukti?.lord} Bhukti` };
  const ctx = buildContext({ evaluation, question: body.question, category: body.category, lang: body.lang, profile, loc: body.loc });
  const { aiTask } = await import('./core.js');
  const fallback = ruleBasedReply(ctx, evaluation, body.lang);
  if (!STATIC) { $('#reply').textContent = fallback; a.reply = fallback; a.source = ''; $('#aiSource').textContent = a.source; return; }
  $('#reply').textContent = L('Thinking…', 'யோசிக்கிறேன்…');
  const r = await aiTask({ task: 'chat', context: ctx, messages: [{ role: 'user', content: ctx.question }], fallbackText: fallback, onText: (tx) => { $('#reply').textContent = tx; } });
  a.reply = r.text; a.source = '';
  $('#aiSource').textContent = a.source;
}

/**
 * Cast the Prasnam. A tapped box is used as is; otherwise a typed question picks its box (Tamil / Tanglish /
 * English), and a question with no recognisable work is read as "general work" — the answer says which was used.
 */
async function ask(opts = {}) {
  const btn = $('#askBtn');
  const question = $('#question').value.trim();
  let category = opts.category || null;
  let how = category ? 'tile' : null;
  if (!category && question) {
    const d = detectPrasnaCategory(question);
    category = d || 'general';
    how = d ? 'text' : 'fallback';
  }
  if (!category && prasnaCategory) { category = prasnaCategory; how = 'tile'; }
  if (!category) {
    toast(L('Type your question, or tap one of the boxes below.', 'உங்கள் கேள்வியை எழுதுங்கள், அல்லது கீழே உள்ள பெட்டிகளில் ஒன்றைத் தட்டுங்கள்.'));
    $('#question')?.focus();
    return;
  }
  const m = askMember();
  const prof = m ? ageOf(m) : ageProfile(null);
  prasnaCategory = category;
  $$('.pq-cat').forEach((x) => { x.classList.toggle('sel', x.dataset.id === category); x.classList.remove('guess'); });
  $('#askGuess') && ($('#askGuess').hidden = true);
  const cat = getCategory(category);
  $('#answer').hidden = false;
  if (!categoryAllowed(category, prof)) {
    // Only the selected minor is limited: a typed adult question gets the age-appropriate reply, never a verdict.
    const g = ageGuardAnswer({ topic: category, profile: prof, lang: state.lang, name: m ? displayName(m) : '', question, label: { en: cat.en.toLowerCase(), ta: cat.ta }, faith: m && m.relation !== 'organization' ? faithOf(m) : 'hindu' });
    lastAnswer = { category: null, guard: g };
    renderGuard(g);
    $('#answer').scrollIntoView({ behavior: 'smooth' });
    return;
  }
  const extra = { how, forName: m && state.family.length > 1 ? displayName(m) : '' };
  btn.disabled = true;
  $('#verdictCard').hidden = false; $('#factorCard').hidden = false; $('#bestCard').hidden = false;
  $('#verdictCard').innerHTML = `<div class="loader"><i></i><i></i><i></i></div><p class="muted">${L('Casting the Prasnam…', 'பிரசன்னம் கணிக்கப்படுகிறது…')}</p>`;
  $('#verdictCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
  $('#reply').textContent = '';
  $('#reply').classList.add('typing');
  $('#factorCard').innerHTML = ''; $('#bestCard').innerHTML = ''; $('#aiSource').textContent = '';
  const body = { category, question, lang: state.lang, loc: state.loc, birth: m ? { name: m.name, date: m.date, time: m.time, lat: m.lat, lon: m.lon, tz: m.tz, place: m.place } : undefined };
  await new Promise((r) => setTimeout(r, 30));
  try {
    if (STATIC) throw new Error('static');
    let reply = '';
    let policyAnswer = false;
    lastAnswer = null;
    // Server events: [evaluation] → policy → delta (whole text once) → done{source, route}.
    // Safety / decline routes send no evaluation: show only their text (and help contacts), never a Prasnam.
    await sse('/api/ask', body, {
      evaluation: (d) => { lastAnswer = { ...extra, ...d }; renderAnswer(lastAnswer); },
      policy: (d) => {
        policyAnswer = true;
        if (!lastAnswer) { $('#verdictCard').hidden = true; $('#factorCard').innerHTML = ''; $('#bestCard').innerHTML = ''; }
        const res = Array.isArray(d?.resources) ? d.resources : [];
        if (res.length && !lastAnswer) $('#bestCard').innerHTML = `<div class="card-title">🤝 ${L('People who can help now', 'இப்போது உதவக்கூடியவர்கள்')}</div>${res.map((r) => `<div class="factor"><span>${esc(r.name || r.label || '')}</span>${r.phone ? `<a class="chip-btn" href="tel:${esc(String(r.phone).replace(/[^\d+]/g, ''))}">📞 ${esc(r.phone)}</a>` : ''}</div>`).join('')}`;
      },
      delta: (d) => { reply += d.text; $('#reply').textContent = reply; },
      reset: () => { reply = ''; $('#reply').textContent = ''; },
      done: () => { if (lastAnswer) { lastAnswer.reply = reply; lastAnswer.source = ''; } $('#aiSource').textContent = ''; },
    });
    if (!lastAnswer && !policyAnswer && !reply) throw new Error('empty');
  } catch (e) {
    // Fall back to the on-device Prasnam only when the server gave no answer at all.
    if (!$('#reply').textContent) await askOnDevice(body, m, extra);
  } finally {
    $('#reply').classList.remove('typing');
    btn.disabled = false;
  }
}
registerScreen('ask', { render: renderAsk, needsLoc: true });

export { NAKSHATRAS };
