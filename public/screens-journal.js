// Daily companion: the morning brief on Today, the Thunai diary ("நல்லது நடந்தது"), gentle delight moments,
// shareable image cards and the one settings page for every reminder and prompt.
//
// Ethics (owner's brief): real value and honest reflection only. No fake numbers or testimonials, no fear, no
// nagging, no claim that the app or a remedy caused anything. Counts are the person's own marks. Every reminder,
// card and prompt can be switched off on one page (Settings → Daily brief & reminders), and the "share Thunai"
// prompt appears at most once a month, only after the person marked something helpful, and can be stopped forever.
import {
  state, $, $$, L, ta, esc, bi, store, toast, go, registerScreen, subHeader, activeMember, chartOf, displayName,
  saveFamily, STATIC, api, copyright, backupConsent,
} from './core.js';
import { morningBrief, weekAhead, monthAhead, sandhyaReminder, allOff, festivalInfo, dateLabel, monthLabel, isoAt } from './shared/daily-brief.js';
import * as J from './shared/journal.js';
import { faithOf, isHinduFaith } from './shared/faith.js';
import { birthTamilMonth, natchathiraBirthdays } from './shared/special.js';
import { openShareCard, inviteInfo, rewardLine } from './share-card.js';
import { scheduleBriefNotifications, settings, SETTINGS_KEY } from './brief-notify.js';

export { settings };
const saveSettings = (s) => { store.set(SETTINGS_KEY, s); };
const tzNow = () => Number(state.loc?.tz ?? 5.5);
const todayIso = () => isoAt(new Date(), tzNow());
const lang = () => (ta() ? 'ta' : 'en');
const noEmoji = (s) => String(s || '').replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu, '').replace(/\s{2,}/g, ' ').trim();

// ---------------------------------------------------------------- diary storage (this phone; backup only by choice)
export const journal = () => J.normaliseJournal(store.get(J.JOURNAL_KEY, null));
let syncT;
export function saveJournal(j) {
  store.set(J.JOURNAL_KEY, j);
  // Backup: only when signed in, with the backup consent AND the diary switch on (core.js → shared/sync-policy.js).
  if (state.user && !STATIC && settings().journalBackup && backupConsent()) { clearTimeout(syncT); syncT = setTimeout(() => saveFamily(), 800); }
}
const update = (fn) => { const j = fn(journal()); saveJournal(j); return j; };

// The day the app was used (for the gentle "days with Thunai" — never a guilt counter).
try { update((j) => J.recordOpen(j, todayIso())); } catch { /* storage blocked */ }

// After sign-in, bring back a backed-up diary (once per session; same consent rules as the upload).
let restored = false;
document.addEventListener('kj:screen', () => {
  if (restored || STATIC || !state.user || !settings().journalBackup || !backupConsent()) return;
  restored = true;
  api('/api/me/data').then(({ data }) => { if (data?.journal) store.set(J.JOURNAL_KEY, J.mergeJournal(data.journal, journal())); }).catch(() => {});
});

// ---------------------------------------------------------------- styles (kept with the feature)
const CSS = `
.brief-card{position:relative;overflow:hidden;border:1px solid rgba(var(--gold-rgb),.35);background:linear-gradient(160deg,rgba(var(--gold-rgb),.14),transparent 60%),var(--glass)}
.brief-card .bf-head{display:flex;justify-content:space-between;align-items:flex-start;gap:8px}
.brief-card .bf-kicker{font-size:12px;font-weight:600;color:var(--gold);letter-spacing:.2px}
.brief-card .bf-greet{margin:2px 0 8px;font-size:20px;color:var(--gold2);font-weight:700;line-height:1.3}
.brief-card ul.bf-lines{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.brief-card ul.bf-lines li{display:grid;grid-template-columns:26px 1fr;gap:6px;font-size:15px;line-height:1.55;color:var(--text)}
.brief-card .bf-ic{font-size:18px;line-height:1.4}
.bf-actions,.mark-row{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.bf-actions .chip-btn,.mark-row .chip-btn{font-size:13px;padding:6px 11px;min-height:40px}
.mark-row{margin-top:8px}
.mark-btn{font-size:13px}
.mark-btn.done{background:rgba(var(--good-rgb),.14);color:var(--good-text,var(--good));border-color:rgba(var(--good-rgb),.4)}
.delight-card{border:1px dashed rgba(var(--gold-rgb),.45)}
.delight-card .dl-row{display:grid;grid-template-columns:34px 1fr auto;gap:8px;align-items:start}
.delight-card .dl-ic{font-size:24px;line-height:1.2}
.delight-card p{margin:0;font-size:14.5px;line-height:1.55}
.delight-card .dl-x{background:none;border:0;color:var(--muted);font-size:18px;cursor:pointer;padding:2px 6px;min-width:36px;min-height:36px}
.delight-card ul{margin:6px 0 0;padding-left:18px;font-size:14px;line-height:1.55}
.mark-sheet,.sc-sheet{text-align:left}
.mark-sheet textarea{width:100%;min-height:84px}
.mark-sheet .seg{flex-wrap:wrap}
.sc-preview{background:var(--surface-soft);border-radius:12px;padding:8px;display:grid;place-items:center;min-height:120px}
.sc-preview img{max-height:52vh;width:auto;max-width:100%;border-radius:10px;box-shadow:0 4px 18px rgba(var(--shadow-rgb),.18)}
.diary-day{margin:14px 0 6px;font-size:13px;font-weight:700;color:var(--gold)}
.diary-entry{display:grid;grid-template-columns:30px 1fr auto;gap:8px;padding:10px 0;border-bottom:1px solid rgba(var(--ink-rgb),.07)}
.diary-entry .de-ic{font-size:20px;line-height:1.3}
.diary-entry .de-t{font-size:14px;line-height:1.5;color:var(--text)}
.diary-entry .de-n{font-size:15px;line-height:1.55;margin-top:2px;color:var(--text);font-weight:600}
.diary-entry .de-acts{display:flex;flex-direction:column;gap:4px}
.diary-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:6px}
.diary-add{margin-bottom:12px}
.diary-stats div{background:var(--surface-soft);border-radius:12px;padding:10px 6px;text-align:center;min-width:0}
.diary-stats b{display:block;font-size:22px;color:var(--gold2)}
.diary-stats span{font-size:11.5px;line-height:1.35;color:var(--muted);display:block;overflow-wrap:normal;word-break:keep-all}
.diary-follow{margin:4px 0 0 0;padding-left:16px;font-size:13px;color:var(--muted)}
.ds-group{margin-top:4px}
.ds-group .set-row small{display:block;color:var(--muted);font-size:12px;line-height:1.4}
.ds-time{display:flex;align-items:center;gap:8px}
.ds-time input{width:auto}
@media (min-width:900px){.sc-modal .modal-card{max-width:520px}}
`;
if (typeof document !== 'undefined' && !document.getElementById('grow-css')) {
  const st = document.createElement('style');
  st.id = 'grow-css';
  st.textContent = CSS;
  document.head.append(st);
}

// ---------------------------------------------------------------- card specs (one language, no emoji, no birth data)
const brand = () => (ta() ? 'துணை · Thunai' : 'Thunai · துணை');
const base = (kind, extra) => ({ kind, lang: lang(), brand: brand(), tagline: L('Personal astrology & spiritual guidance', 'தனிப்பட்ட ஜோதிடம் & ஆன்மீக வழிகாட்டல்'), ...extra });
/** Today's palan for the person (their own day: name and the three brief lines — no birth details). */
export const todaySpec = (b, name) => base('today', {
  kicker: `${L('Today’s guidance', 'இன்றைய பலன்')} · ${bi(dateLabel(b.date))}`,
  title: name ? L(`Today for ${name}`, `இன்று — ${name}`) : L('Today', 'இன்று'),
  lines: b.lines.map((l) => noEmoji(bi(l.text))),
  closing: b.blessing ? noEmoji(bi(b.blessing)) : L('May the day go well.', 'இந்நாள் இனிதாகட்டும்.'),
});
/** Festival greeting: "இனிய தீபாவளி நல்வாழ்த்துகள்", the date and what the day means. */
export const festivalSpec = (fi, iso) => base('festival', {
  kicker: bi(dateLabel(iso)),
  title: L(`Happy ${fi.name.en}!`, `இனிய ${fi.name.ta} நல்வாழ்த்துகள்`),
  quote: noEmoji(bi(fi.line)),
  lines: fi.deity ? [L(`Worship: ${fi.deity.en}`, `வழிபாடு: ${fi.deity.ta}`)] : [],
  closing: L('Warm wishes from our family to yours.', 'எங்கள் குடும்பத்தின் அன்பான வாழ்த்துகள்.'),
});
/** Star birthday wishes — the name and the date only (never the star or any birth detail). */
export const starbdaySpec = (name, iso) => base('starbday', {
  kicker: `${L('Star birthday', 'நட்சத்திரப் பிறந்தநாள்')} · ${bi(dateLabel(iso))}`,
  title: L(`Happy star birthday, ${name}!`, `இனிய நட்சத்திரப் பிறந்தநாள் வாழ்த்துகள், ${name}!`),
  lines: [L('May the year ahead bring peace, good company and joy.', 'வரும் ஆண்டு அமைதியும், நல்ல உறவுகளும், மகிழ்ச்சியும் நிறைந்ததாக அமையட்டும்.'),
    L('With love and blessings from all of us.', 'எங்கள் அனைவரின் அன்பும் ஆசியும்.')],
});
/** The person's own diary words. */
export const diarySpec = (e) => base('diary', {
  kicker: `${bi(J.KINDS[e.kind] || J.KINDS.good)} · ${bi(dateLabel(e.date))}`,
  title: L('A good thing happened', 'நல்லது நடந்தது'),
  quote: noEmoji(e.note || e.title),
  closing: L('From my Thunai diary', 'என் துணை நாட்குறிப்பிலிருந்து'),
});
export const summarySpec = (sum, kind) => base(kind, { kicker: L('Thunai', 'துணை'), title: noEmoji(bi(sum.title)), lines: sum.lines.map((l) => noEmoji(bi(l.text))) });
export const milestoneSpec = (ms) => base('milestone', { kicker: L('A small milestone', 'ஒரு சிறு மைல்கல்'), title: noEmoji(bi(ms)), closing: L('Walking with Thunai, one day at a time.', 'நாள்தோறும் துணையுடன்.') });
export function reflectionSpec(ref) {
  const c = ref.counts;
  const lines = [];
  if (c.helped) lines.push(L(`${c.helped} time${c.helped > 1 ? 's' : ''} I marked “this helped”`, c.helped > 1 ? `“இது உதவியது” என்று ${c.helped} முறை குறித்தேன்` : '“இது உதவியது” என்று ஒருமுறை குறித்தேன்'));
  if (c.happened) lines.push(L(`${c.happened} time${c.happened > 1 ? 's' : ''} I marked “it happened”`, c.happened > 1 ? `“இது நடந்தது” என்று ${c.happened} முறை குறித்தேன்` : '“இது நடந்தது” என்று ஒருமுறை குறித்தேன்'));
  if (c.remedy) lines.push(L(`${c.remedy} practice${c.remedy > 1 ? 's' : ''} I did`, c.remedy > 1 ? `${c.remedy} வழிபாடுகள் / பரிகாரங்கள் செய்தேன்` : 'ஒரு வழிபாடு / பரிகாரம் செய்தேன்'));
  if (c.good) lines.push(L(`${c.good} good thing${c.good > 1 ? 's' : ''} I wrote down`, c.good > 1 ? `${c.good} நல்ல விஷயங்களை எழுதினேன்` : 'ஒரு நல்ல விஷயத்தை எழுதினேன்'));
  const quote = ref.highlights.find((e) => e.note)?.note || '';
  return base('reflection', { kicker: bi(monthLabel(ref.month)), title: L('My month with Thunai', 'இந்த மாதம் என் துணை'), quote: noEmoji(quote), lines, closing: L('My own notes, my own month.', 'என் சொந்தக் குறிப்புகள், என் மாதம்.') });
}
export const inviteSpec = () => base('invite', {
  kicker: L('From one family to another', 'ஒரு குடும்பத்திலிருந்து இன்னொரு குடும்பத்திற்கு'),
  title: L('Thunai — a daily companion for the whole family', 'துணை — முழுக் குடும்பத்துக்கும் தினசரி வழித்துணை'),
  lines: [L('Three warm lines every morning, personal to each person', 'ஒவ்வொருவருக்கும் தனியாக, தினமும் காலையில் மூன்று வரிக் குறிப்பு'),
    L('Family horoscopes, panchangam and festivals — in Tamil', 'குடும்ப ஜாதகம், பஞ்சாங்கம், விழாக்கள் — தமிழில்'),
    L('Honest guidance — no fear, no costly remedies', 'நேர்மையான வழிகாட்டல் — பயமுறுத்தல் இல்லை, விலையுயர்ந்த பரிகாரம் இல்லை'),
    L('Your details stay on your phone', 'உங்கள் விவரங்கள் உங்கள் கைப்பேசியிலேயே')],
});
/**
 * Porutham five-card summary for a share card. Call ONLY after both people's share consent (screens-couple.js
 * hasConsent(ledger, ids, 'share')). Names, the factor count and the conversation topics — no stars, no birth data.
 */
export const matchSpec = ({ names, agree, total, topics = [], closing = '' }) => base('match', {
  kicker: L('Marriage Porutham', 'திருமணப் பொருத்தம்'),
  title: `${names[0]} · ${names[1]}`,
  subtitle: L(`${agree} of ${total} traditional factors agree`, `${total} மரபுக் காரணிகளில் ${agree} பொருந்துகின்றன`),
  lines: topics.map(noEmoji).slice(0, 5),
  closing: noEmoji(closing) || L('Marriage is made by love, respect and effort.', 'திருமணம் அன்பு, மரியாதை, முயற்சியால் நிலைக்கிறது.'),
});
export { openShareCard };

// ---------------------------------------------------------------- Today: brief + one delight card
const memo = new Map();
let tdCache = null; // today's tamilDay from the last Today render (festival greeting buttons)
function briefFor(m, snap, loc, td) {
  const person = m && m.relation !== 'organization' ? m : null;
  const key = `${person?.id || '-'}|${isoAt(new Date(), loc.tz)}|${Math.floor(Date.now() / 600000)}|${loc.lat}|${loc.lon}`;
  if (!memo.has(key)) {
    let chart = null;
    try { chart = person ? chartOf(person) : null; } catch { chart = null; }
    memo.clear();
    memo.set(key, morningBrief({ chart, member: person, name: person ? displayName(person) : '', loc, now: new Date(), faith: person ? faithOf(person) : 'hindu', td, snap }));
  }
  return memo.get(key);
}

function briefCardHtml(m, snap, loc, td, s) {
  const b = briefFor(m, snap, loc, td);
  const hour = new Date(Date.now() + loc.tz * 3600000).getUTCHours();
  const person = m && m.relation !== 'organization' ? m : null;
  const name = person ? displayName(person) : '';
  const greet = hour < 12 ? bi(b.greeting) : name ? L(`Vanakkam, ${name}`, `வணக்கம், ${name}`) : L('Vanakkam', 'வணக்கம்');
  const lines = [...b.lines];
  if (s.sandhya) { const r = sandhyaReminder({ loc, date: b.date, faith: person ? faithOf(person) : 'hindu', td }); if (r && r.at > new Date()) lines.push({ key: 'sandhya', icon: '🪔', text: r.text }); }
  return `<section class="card glass brief-card" aria-labelledby="bfTitle">
    <div class="bf-head"><div><div class="bf-kicker">🌅 ${L('Morning brief', 'காலைக் குறிப்பு')} · ${esc(bi(dateLabel(b.date)).replace(/ \d{4}$/, ''))}</div><h3 id="bfTitle" class="bf-greet">${esc(greet)}</h3></div>
      <button class="link-btn" data-go="dailyset" aria-label="${esc(L('Brief and reminder settings', 'குறிப்பு, நினைவூட்டல் அமைப்புகள்'))}">⚙️</button></div>
    <ul class="bf-lines">${lines.map((l) => `<li><span class="bf-ic" aria-hidden="true">${l.icon}</span><span>${esc(bi(l.text))}</span></li>`).join('')}</ul>
    ${b.blessing ? `<p class="small muted bf-bless">${esc(bi(b.blessing))}</p>` : ''}
    <div class="bf-actions">${s.markButtons ? markBtnHtml({ source: 'brief', title: bi(b.lines[0].text), personId: person?.id || '' }) : ''}
      <button class="chip-btn" type="button" data-grow="share-today">🖼️ ${L('Share as image', 'படமாகப் பகிர்')}</button>
      <button class="chip-btn" type="button" data-go="diary">🌼 ${L('My diary', 'என் நாட்குறிப்பு')}</button></div>
  </section>`;
}

const dlCard = (id, iconTxt, body, actions = '') => `<section class="card glass delight-card" data-dl="${esc(id)}">
  <div class="dl-row"><span class="dl-ic" aria-hidden="true">${iconTxt}</span><div>${body}${actions ? `<div class="btn-row">${actions}</div>` : ''}</div>
  <button class="dl-x" type="button" data-grow="dismiss" data-id="${esc(id)}" aria-label="${esc(L('Dismiss', 'மூடு'))}">✕</button></div></section>`;

let sbMemo = { key: '', list: [] };
/** Family members (Hindu tradition) whose star birthday is today at the residence. Cached per day. */
function starBirthdaysToday(td) {
  const loc = state.residence || state.loc;
  const key = `${todayIso()}|${state.family.map((m) => m.id).join(',')}`;
  if (sbMemo.key === key) return sbMemo.list;
  const list = [];
  for (const m of state.family) {
    if (m.relation === 'organization' || !isHinduFaith(faithOf(m))) continue;
    try {
      const c = chartOf(m);
      const month = birthTamilMonth(c).month;
      if (td?.tamil && td.tamil.month !== month) continue;
      const next = natchathiraBirthdays({ birthStar: c.janmaNakshatra.index, birthTamilMonth: month, loc: { lat: loc.lat, lon: loc.lon, tz: loc.tz, zone: loc.zone }, count: 1 })[0];
      if (next?.date === todayIso()) list.push(m);
    } catch { /* skip */ }
  }
  sbMemo = { key, list };
  return list;
}

function delightCardHtml(m, loc, td, s) {
  let j = journal();
  const today = todayIso();
  const dis = (id) => Boolean(j.dismissed[id]);
  const person = m && m.relation !== 'organization' ? m : null;
  const hindu = person ? isHinduFaith(faithOf(person)) : true;
  // 1. The person's own milestone.
  if (s.milestones) {
    const ms = J.pendingMilestone(j, today);
    if (ms) return dlCard(`ms:${ms.id}`, ms.icon, `<p><b>${esc(bi(ms))}</b></p>`,
      `<button class="chip-btn" type="button" data-grow="share-milestone" data-id="${esc(ms.id)}">🖼️ ${L('Make a card', 'அட்டை உருவாக்கு')}</button>`);
    // 2. A family star birthday today.
    const sb = starBirthdaysToday(td).find((x) => !dis(`sb:${x.id}:${today}`));
    if (sb) return dlCard(`sb:${sb.id}:${today}`, '🎂', `<p>${L(`Today is ${esc(displayName(sb))}’s star birthday.`, `இன்று ${esc(displayName(sb))} அவர்களின் நட்சத்திரப் பிறந்தநாள்.`)}</p>`,
      `<button class="chip-btn" type="button" data-grow="share-starbday" data-id="${esc(sb.id)}">🖼️ ${L('Send a wishes card', 'வாழ்த்து அட்டை அனுப்பு')}</button>`);
  }
  // 3. Festival greeting (Hindu festivals for a Hindu-tradition person).
  const fest = hindu ? (td.festivals || []).find((f) => f.kind === 'festival' && f.id !== 'month-start') : null;
  if (fest && !dis(`fe:${fest.id}:${today}`)) {
    const fi = festivalInfo(fest);
    return dlCard(`fe:${fest.id}:${today}`, '🪔', `<p><b>${L(`Happy ${esc(fi.name.en)}!`, `இனிய ${esc(fi.name.ta)} நல்வாழ்த்துகள்!`)}</b></p><p class="small muted">${esc(bi(fi.line))}</p>`,
      `<button class="chip-btn" type="button" data-grow="share-festival" data-id="${esc(fest.id)}">🖼️ ${L('Send a greeting card', 'வாழ்த்து அட்டை அனுப்பு')}</button><button class="chip-btn" type="button" data-go="festivals">${L('Why & how', 'ஏன், எப்படி')}</button>`);
  }
  // 4. Sunday: your week ahead · 1st of the month: your month.
  const wd = new Date(`${today}T12:00:00Z`).getUTCDay();
  const sumKind = s.monthly && today.endsWith('-01') ? 'month' : s.weekly && wd === 0 ? 'week' : null;
  if (sumKind && !dis(`${sumKind}:${today}`)) {
    const sum = summaryFor(sumKind, person, loc);
    if (sum) return dlCard(`${sumKind}:${today}`, sumKind === 'week' ? '🗓️' : '📅', `<p><b>${esc(bi(sum.title))}</b></p><ul>${sum.lines.map((l) => `<li>${esc(bi(l.text))}</li>`).join('')}</ul>`,
      `<button class="chip-btn" type="button" data-grow="share-summary" data-id="${sumKind}">🖼️ ${L('Share as image', 'படமாகப் பகிர்')}</button>${sumKind === 'week' ? `<button class="chip-btn" type="button" data-go="week">${L('Plan my week', 'வாரத் திட்டம்')}</button>` : ''}`);
  }
  // 5. First-week welcome series (in-app only).
  if (s.welcome) {
    const w = J.welcomeCard(j, today);
    if (w) return dlCard(`welcome:${w.day}`, w.icon, `<p class="small muted">${L(`Welcome · day ${w.day}`, `வரவேற்பு · நாள் ${w.day}`)}</p><p>${esc(bi(w))}</p>`,
      `<button class="chip-btn" type="button" data-go="${esc(w.go)}">${L('Show me', 'காட்டு')} ›</button>`);
  }
  // 6. "Would you share Thunai?" — only after a helpful mark, at most once a month, never again if asked.
  const shownToday = j.prompt.lastAt && isoAt(new Date(j.prompt.lastAt), tzNow()) === today;
  if (s.sharePrompt && !j.prompt.never && !dis(`share:${today}`) && (shownToday || J.sharePromptDue(j, { now: new Date(), enabled: s.sharePrompt }))) {
    if (!shownToday) { j = J.promptShown(j); saveJournal(j); }
    return dlCard(`share:${today}`, '💛', `<p>${L('Glad Thunai helped. Would you like to share it with someone you care about?', 'துணை உதவியதில் மகிழ்ச்சி. நீங்கள் அக்கறை கொண்ட ஒருவருடன் இதைப் பகிர விரும்புகிறீர்களா?')}</p>`,
      `<button class="chip-btn" type="button" data-grow="invite">💌 ${L('Invite family & friends', 'குடும்பம், நண்பர்களை அழையுங்கள்')}</button><button class="chip-btn" type="button" data-grow="dismiss" data-id="share:${today}">${L('Not now', 'இப்போது வேண்டாம்')}</button><button class="link-btn" type="button" data-grow="never">${L('Don’t ask again', 'மீண்டும் கேட்க வேண்டாம்')}</button>`);
  }
  return '';
}

const sumMemo = new Map();
function summaryFor(kind, person, loc) {
  const key = `${kind}|${person?.id || '-'}|${todayIso()}|${state.lang}`;
  if (!sumMemo.has(key)) {
    let chart = null;
    try { chart = person ? chartOf(person) : null; } catch { chart = null; }
    const o = { chart, loc, faith: person ? faithOf(person) : 'hindu', member: person, now: new Date() };
    try { sumMemo.set(key, kind === 'week' ? weekAhead({ ...o, start: todayIso() }) : monthAhead({ ...o, month: todayIso().slice(0, 7) })); } catch { sumMemo.set(key, null); }
  }
  return sumMemo.get(key);
}

/** Today hook (screens-main.js renderHome): the morning brief and at most one gentle card. */
export function growHomeHtml(m, snap, loc, td) {
  if (!loc) return '';
  tdCache = td;
  const s = settings();
  let html = '';
  try { if (s.showBrief) html += briefCardHtml(m, snap, loc, td, s); } catch { /* never break Today */ }
  try { html += delightCardHtml(m, loc, td, s); } catch { /* never break Today */ }
  return html;
}

// ---------------------------------------------------------------- "✓ This helped" marks
const REMEDY_SOURCES = new Set(['parigaram', 'dosham']);
function markBtnHtml({ source, title, personId = '', kind = '' }) {
  const data = esc(JSON.stringify({ source, title: String(title || '').slice(0, 160), personId, kind }));
  const label = REMEDY_SOURCES.has(source) ? L('✓ I did this / it helped', '✓ செய்தேன் / உதவியது') : L('✓ This helped', '✓ இது உதவியது');
  return `<button type="button" class="chip-btn mark-btn" data-grow="mark" data-mark="${data}">${label}</button>`;
}

function openMarkSheet(item, btn) {
  const remedy = REMEDY_SOURCES.has(item.source);
  let kind = item.kind && J.KINDS[item.kind] ? item.kind : remedy ? 'remedy' : 'helped';
  const kinds = remedy ? ['remedy', 'helped', 'happened'] : ['helped', 'happened'];
  const s = settings();
  const box = document.createElement('div');
  box.className = 'modal';
  box.innerHTML = `<form novalidate class="modal-card card glass mark-sheet" role="dialog" aria-modal="true" aria-labelledby="mkTitle">
    <div class="card-title"><span id="mkTitle">🌼 ${L('Add to my diary', 'என் நாட்குறிப்பில் சேர்')}</span><button type="button" class="link-btn" data-mk="x" aria-label="${esc(L('Close', 'மூடு'))}">✕</button></div>
    ${item.title ? `<p class="small muted">“${esc(item.title.slice(0, 140))}${item.title.length > 140 ? '…' : ''}”</p>` : ''}
    <div class="seg" role="radiogroup" aria-label="${esc(L('What happened', 'என்ன நடந்தது'))}">${kinds.map((k) => `<button type="button" role="radio" data-kind="${k}" class="${k === kind ? 'sel' : ''}" aria-checked="${k === kind}">${J.KINDS[k].icon} ${esc(bi(J.KINDS[k]))}</button>`).join('')}</div>
    <label class="small" for="mkNote">${L('In your own words (optional)', 'உங்கள் வார்த்தைகளில் (விருப்பம்)')}</label>
    <textarea id="mkNote" rows="3" maxlength="600" placeholder="${esc(L('What helped, or what good thing happened?', 'எது உதவியது, அல்லது என்ன நல்லது நடந்தது?'))}"></textarea>
    ${s.journalBackup ? `<label class="set-row small"><span>${L('Keep this one only on this phone', 'இதை இந்தக் கைப்பேசியில் மட்டும் வை')}</span><input type="checkbox" id="mkPrivate"></label>` : ''}
    <p class="muted small">${L('Your own private diary on this phone. Thunai never claims it caused what happened.', 'இது இந்தக் கைப்பேசியில் உள்ள உங்கள் சொந்த நாட்குறிப்பு. நடந்ததற்குத் துணையே காரணம் என்று ஒருபோதும் சொல்லாது.')}</p>
    <div class="btn-row"><button class="btn-gold" type="submit">${L('Save', 'சேமி')}</button><button class="chip-btn" type="button" data-mk="x">${L('Cancel', 'ரத்து')}</button></div>
  </form>`;
  document.body.append(box);
  const opener = document.activeElement;
  const close = () => { box.remove(); opener?.focus?.({ preventScroll: true }); };
  box.querySelector('textarea').focus();
  box.addEventListener('click', (e) => {
    if (e.target === box || e.target.closest('[data-mk="x"]')) { close(); return; }
    const k = e.target.closest('[data-kind]');
    if (k) { kind = k.dataset.kind; box.querySelectorAll('[data-kind]').forEach((b) => { b.classList.toggle('sel', b === k); b.setAttribute('aria-checked', String(b === k)); }); }
  });
  box.querySelector('form').addEventListener('submit', (e) => {
    e.preventDefault();
    const note = box.querySelector('#mkNote').value;
    const priv = box.querySelector('#mkPrivate')?.checked;
    const r = J.addEntry(journal(), { kind, source: item.source, title: item.title || noEmoji(note).slice(0, 80), note, personId: item.personId || activeMember()?.id || '', private: priv || undefined }, { date: todayIso() });
    if (!r.entry) { toast(L('Please write a few words', 'சில வார்த்தைகள் எழுதுங்கள்')); return; }
    saveJournal(r.journal);
    close();
    if (btn) { btn.classList.add('done'); btn.textContent = `✓ ${L('Saved in my diary', 'நாட்குறிப்பில் சேர்ந்தது')}`; }
    toast(`🌼 ${L('Added to your diary', 'உங்கள் நாட்குறிப்பில் சேர்க்கப்பட்டது')}`);
    document.dispatchEvent(new CustomEvent('kj:task', { detail: 'diary_mark' }));
    if (state.view === 'diary') go('diary', state.params || {});
  });
}

// Mark buttons appear on guidance cards across the app (Today, Ask answers, Prasnam, Parigaram, Doshams) without
// those screens having to know about the diary. Off with the "mark buttons" setting.
const TARGETS = [
  { sel: '#view-home .plan-card', source: 'today', title: (el) => el.querySelector('.tp-energy')?.textContent },
  { sel: '#view-home .daily-card', source: 'today' },
  { sel: '#view-ask #verdictCard', source: 'prasnam', need: (el) => el.textContent.trim().length > 20 },
  { sel: '#view-parigaram .card.nava, #view-parigaram .sthalam-card', source: 'parigaram' },
  { sel: '#view-dosham .dosham-card', source: 'dosham' },
  { sel: '#view-chat .bubble.ai', source: 'ask', after: true, need: (el) => el.previousElementSibling?.classList.contains('me') && !el.classList.contains('typing') && el.textContent.trim().length > 40,
    title: (el) => `${L('Question', 'கேள்வி')}: ${el.previousElementSibling?.textContent?.trim().slice(0, 100) || ''}` },
];
let injT = 0;
function injectMarks() {
  injT = 0;
  if (!settings().markButtons) return;
  for (const t of TARGETS) {
    for (const el of document.querySelectorAll(t.sel)) {
      if (t.need && !t.need(el)) continue;
      const has = t.after ? el.nextElementSibling?.classList.contains('mark-row') : el.querySelector(':scope > .mark-row');
      if (has) continue;
      const title = (t.title?.(el) || el.querySelector('.card-title')?.textContent || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 160);
      const row = document.createElement('div');
      row.className = 'mark-row';
      row.innerHTML = markBtnHtml({ source: t.source, title, personId: activeMember()?.id || '' });
      if (t.after) el.after(row); else el.append(row);
    }
  }
}
if (typeof MutationObserver !== 'undefined') {
  new MutationObserver(() => { if (!injT) injT = setTimeout(injectMarks, 400); }).observe(document.body, { childList: true, subtree: true });
}

// ---------------------------------------------------------------- actions (delegated)
async function shareToday() {
  const m = activeMember();
  const loc = state.loc;
  const b = briefFor(m, null, loc, null);
  const person = m && m.relation !== 'organization' ? m : null;
  // Only a profile's owner shares its palan as their own; for other family members the card says just the name.
  await openShareCard(todaySpec(b, person ? displayName(person) : ''), { filename: `thunai-today-${b.date}.png` });
}
document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-grow]');
  if (!b) return;
  const act = b.dataset.grow;
  const today = todayIso();
  if (act === 'mark') { e.preventDefault(); e.stopPropagation(); try { openMarkSheet(JSON.parse(b.dataset.mark || '{}'), b); } catch { openMarkSheet({ source: 'diary' }, b); } return; }
  if (act === 'dismiss') { update((j) => J.dismiss(j, b.dataset.id, today)); b.closest('.delight-card')?.remove(); return; }
  if (act === 'never') { update((j) => J.promptNever(j)); b.closest('.delight-card')?.remove(); toast(L('We will not ask again.', 'இனி கேட்க மாட்டோம்.')); return; }
  if (act === 'invite') { openInvite(); return; }
  if (act === 'share-today') { shareToday(); return; }
  if (act === 'share-milestone') {
    const ms = J.pendingMilestone(journal(), today);
    update((j) => J.markSeen(j, b.dataset.id, today));
    if (ms) await openShareCard(milestoneSpec(ms), { filename: `thunai-${ms.id}.png` });
    return;
  }
  if (act === 'share-starbday') {
    const m = state.family.find((x) => x.id === b.dataset.id);
    if (m) await openShareCard(starbdaySpec(displayName(m), today), { filename: 'thunai-star-birthday.png' });
    return;
  }
  if (act === 'share-festival') {
    const f = { id: b.dataset.id, ...(festivalNames(b.dataset.id) || {}) };
    const fi = festivalInfo(f);
    if (fi) await openShareCard(festivalSpec(fi, today), { filename: `thunai-${f.id}.png` });
    return;
  }
  if (act === 'share-summary') {
    const m = activeMember();
    const sum = summaryFor(b.dataset.id, m && m.relation !== 'organization' ? m : null, state.loc);
    if (sum) await openShareCard(summarySpec(sum, b.dataset.id), { filename: `thunai-${b.dataset.id}.png` });
    return;
  }
  if (act === 'share-entry') {
    const en = journal().entries.find((x) => x.id === b.dataset.id);
    if (en) await openShareCard(diarySpec(en), { filename: 'thunai-diary.png' });
    return;
  }
  if (act === 'share-reflection') { await openShareCard(reflectionSpec(J.monthReflection(journal(), b.dataset.id, { personId: diaryUi.person })), { filename: `thunai-month-${b.dataset.id}.png` }); return; }
});
const festivalNames = (id) => {
  const td = tdCache;
  const f = (td?.festivals || []).find((x) => x.id === id);
  return f ? { en: f.en, ta: f.ta, kind: f.kind } : null;
};

// ---------------------------------------------------------------- invite
async function openInvite() {
  const info = await inviteInfo();
  const box = document.createElement('div');
  box.className = 'modal';
  box.innerHTML = `<div class="modal-card card glass sc-sheet" role="dialog" aria-modal="true" aria-labelledby="ivTitle">
    <div class="card-title"><span id="ivTitle">💌 ${L('Invite family & friends', 'குடும்பம், நண்பர்களை அழையுங்கள்')}</span><button class="link-btn" data-iv="x" aria-label="${esc(L('Close', 'மூடு'))}">✕</button></div>
    ${info.referral ? `<p>${L('Your code', 'உங்கள் குறியீடு')}: <b class="invite-code">${esc(info.code)}</b></p><p class="small">${esc(rewardLine(info))}</p>`
    : `<p class="small">${L('Share the app link with a card. (Sign in to get your own invite code.)', 'செயலி இணைப்பை ஒரு அட்டையுடன் பகிருங்கள். (உங்கள் சொந்த அழைப்புக் குறியீட்டிற்கு உள்நுழையவும்.)')}</p>`}
    <div class="btn-row"><button class="btn-gold" data-iv="card">🖼️ ${L('Share a card', 'அட்டையைப் பகிர்')}</button>${info.referral ? `<button class="chip-btn" data-go="invite" data-iv="x">${L('Invite page', 'அழைப்புப் பக்கம்')}</button>` : ''}</div>
  </div>`;
  document.body.append(box);
  box.addEventListener('click', (e) => {
    if (e.target === box || e.target.closest('[data-iv="x"]')) { box.remove(); return; }
    if (e.target.closest('[data-iv="card"]')) { box.remove(); openShareCard(inviteSpec(), { filename: 'thunai-invite.png' }); }
  });
}

// ---------------------------------------------------------------- Diary screen
const diaryUi = { person: 'all' };
function renderDiary(sec, params = {}) {
  if (params.person) diaryUi.person = params.person;
  const j = journal();
  const today = todayIso();
  const ym = today.slice(0, 7);
  const people = state.family.filter((m) => m.relation !== 'organization');
  const list = J.entriesFor(j, diaryUi.person);
  const st = J.streak(j.days, today);
  const ref = J.monthReflection(j, ym, { personId: diaryUi.person });
  const rem = J.remediesWithFollowUps(j, { personId: diaryUi.person });
  const plans = store.get('kj_plans', []).slice(0, 5);
  const s = settings();
  const nameOf = (id) => { const m = state.family.find((x) => x.id === id); return m ? displayName(m) : ''; };
  sec.innerHTML = `${subHeader(L('My Thunai Diary', 'என் துணை நாட்குறிப்பு'), L('Good things that happened — your own notes, on this phone', 'நல்லது நடந்தது — உங்கள் சொந்தக் குறிப்புகள், இந்தக் கைப்பேசியில்'))}
    ${people.length > 1 ? `<div class="who-row member-switch" role="group" aria-label="${esc(L('Whose diary', 'யாருடைய குறிப்புகள்'))}"><button class="mchip who${diaryUi.person === 'all' ? ' sel' : ''}" data-dp="all" aria-pressed="${diaryUi.person === 'all'}">${L('Everyone', 'அனைவரும்')}</button>${people.map((m) => `<button class="mchip who${diaryUi.person === m.id ? ' sel' : ''}" data-dp="${esc(m.id)}" aria-pressed="${diaryUi.person === m.id}">${esc(displayName(m))}</button>`).join('')}</div>` : ''}
    <button class="btn-gold diary-add" type="button" data-grow="mark" data-mark="${esc(JSON.stringify({ source: 'diary', title: '', kind: 'good', personId: diaryUi.person === 'all' ? '' : diaryUi.person }))}">🌼 ${L('Write a good thing that happened', 'நடந்த ஒரு நல்லதை எழுது')}</button>
    <section class="card glass" aria-labelledby="dmTitle">
      <div class="card-title"><span id="dmTitle">🪔 ${L('This month with Thunai', 'இந்த மாதம் உங்கள் துணை')} · ${esc(bi(monthLabel(ym)))}</span></div>
      <div class="diary-stats">
        <div><b>${ref.counts.helped + ref.counts.happened + ref.counts.good}</b><span>${L('good things you marked', 'நீங்கள் குறித்த நல்லவை')}</span></div>
        <div><b>${ref.counts.remedy}</b><span>${L('practices you did', 'நீங்கள் செய்த வழிபாடுகள்')}</span></div>
        <div><b>${st.monthDays}</b><span>${L('days with Thunai', 'துணையுடன் நாட்கள்')}</span></div>
      </div>
      ${st.current >= 2 ? `<p class="small">🌱 ${L(`${st.current} days in a row — lovely.`, `தொடர்ந்து ${st.current} நாட்கள் — அருமை.`)}${st.best > st.current ? ` <span class="muted">${L(`Your longest run: ${st.best} days.`, `உங்கள் நீண்ட தொடர்: ${st.best} நாட்கள்.`)}</span>` : ''}</p>` : ''}
      ${ref.highlights.length ? `<div class="mini-label">${L('Your highlights', 'உங்கள் சிறப்புக் குறிப்புகள்')}</div><ul class="small">${ref.highlights.map((e) => `<li>${J.KINDS[e.kind].icon} ${esc(e.note || e.title)}</li>`).join('')}</ul>` : `<p class="small muted">${L('Nothing marked yet this month. When a guidance helps, tap “✓ This helped” on it.', 'இந்த மாதம் இன்னும் எதுவும் குறிக்கவில்லை. ஒரு வழிகாட்டல் உதவினால் அதில் “✓ இது உதவியது” என்று தொடுங்கள்.')}</p>`}
      <p class="muted small">${L('Counts are only your own marks. They are your reflection — not a measure of luck, and not proof of anything.', 'எண்ணிக்கைகள் நீங்கள் குறித்தவை மட்டுமே. இவை உங்கள் சுய சிந்தனைக்கு — அதிர்ஷ்டத்தின் அளவோ, எதற்கும் சான்றோ அல்ல.')}</p>
      ${ref.total ? `<button class="chip-btn" type="button" data-grow="share-reflection" data-id="${ym}">🖼️ ${L('Share my month', 'என் மாதத்தைப் பகிர்')}</button>` : ''}
    </section>
    <section class="card glass" aria-labelledby="drTitle">
      <div class="card-title"><span id="drTitle">🪔 ${L('Practices you did', 'நீங்கள் செய்த வழிபாடுகள் / பரிகாரங்கள்')}</span></div>
      ${rem.length ? rem.slice(0, 8).map((r) => `<div class="factor"><span>🪔 ${esc(r.remedy.title || r.remedy.note)}<br><small class="muted">${esc(bi(dateLabel(r.remedy.date)))}</small>
        ${r.after.length ? `<ul class="diary-follow">${r.after.map((a) => `<li>${L('Later you noted', 'பின்னர் நீங்கள் குறித்தது')} (${esc(bi(dateLabel(a.date)))}): ${esc(a.note || a.title)}</li>`).join('')}</ul>` : ''}</span></div>`).join('')
    : `<p class="small muted">${L('When you do a parigaram or a practice, mark it with “✓ I did this” on the Parigaram or Doshams page.', 'பரிகாரம் அல்லது வழிபாடு செய்தால், பரிகாரம் / தோஷங்கள் பக்கத்தில் “✓ செய்தேன்” என்று குறியுங்கள்.')}</p>`}
      ${plans.length ? `<div class="mini-label">${L('Saved journeys — mark one you completed', 'சேமித்த பயணங்கள் — முடித்ததைக் குறியுங்கள்')}</div>${plans.map((p) => `<div class="factor"><span>🛕 ${esc(p.title)}<br><small class="muted">${esc(p.dates || '')}</small></span>${list.some((e) => e.ref === `plan:${p.id}`) ? `<b class="zero">✓</b>` : `<button class="chip-btn" type="button" data-dplan="${esc(p.id)}">✓ ${L('Done', 'முடித்தேன்')}</button>`}</div>`).join('')}` : ''}
      <p class="muted small">${L('“Later you noted” shows only what you wrote afterwards. Thunai does not say a practice caused it.', '“பின்னர் நீங்கள் குறித்தது” — நீங்கள் பின்னர் எழுதியவை மட்டுமே. ஒரு வழிபாடே காரணம் என்று துணை சொல்லாது.')}</p>
    </section>
    <section class="card glass" aria-labelledby="dlTitle">
      <div class="card-title"><span id="dlTitle">📖 ${L('All your entries', 'உங்கள் எல்லாக் குறிப்புகளும்')}</span><span class="pill">${list.length}</span></div>
      ${list.length ? J.byDate(list).map((g) => `<div class="diary-day">${esc(bi(dateLabel(g.date)))}</div>${g.entries.map((e) => `<div class="diary-entry">
        <span class="de-ic" aria-hidden="true">${J.KINDS[e.kind].icon}</span>
        <div>${e.note ? `<div class="de-n">${esc(e.note)}</div>` : ''}${e.title ? `<div class="de-t muted">${esc(e.title)}</div>` : ''}<div class="small muted">${esc(bi(J.KINDS[e.kind]))}${e.personId && nameOf(e.personId) ? ` · ${esc(nameOf(e.personId))}` : ''}${e.private ? ' · 🔒' : ''}</div></div>
        <div class="de-acts"><button class="link-btn" type="button" data-grow="share-entry" data-id="${esc(e.id)}" aria-label="${esc(L('Share as image', 'படமாகப் பகிர்'))}">🖼️</button><button class="link-btn" type="button" data-ddel="${esc(e.id)}" aria-label="${esc(L('Delete', 'நீக்கு'))}">✕</button></div></div>`).join('')}`).join('')
    : `<p class="small muted">${L('Your diary is empty. It fills only with what you choose to mark.', 'உங்கள் நாட்குறிப்பு காலியாக உள்ளது. நீங்கள் குறிப்பவை மட்டுமே இதில் சேரும்.')}</p>`}
    </section>
    <p class="small muted center">🔒 ${s.journalBackup && backupConsent() && state.user ? L('Backed up to your account (you can switch this off).', 'உங்கள் கணக்கில் பாதுகாக்கப்படுகிறது (நிறுத்தலாம்).') : L('Stays only on this phone.', 'இந்தக் கைப்பேசியில் மட்டுமே இருக்கும்.')} <button class="link-btn" data-go="dailyset">${L('Settings', 'அமைப்புகள்')}</button></p>
    <button class="btn-soft" type="button" data-grow="invite">💌 ${L('Invite family & friends', 'குடும்பம், நண்பர்களை அழையுங்கள்')}</button>
    ${copyright()}`;
  $$('[data-dp]', sec).forEach((b) => b.addEventListener('click', () => { diaryUi.person = b.dataset.dp; renderDiary(sec); }));
  $$('[data-ddel]', sec).forEach((b) => b.addEventListener('click', () => {
    if (!window.confirm(L('Delete this entry?', 'இந்தக் குறிப்பை நீக்கவா?'))) return;
    update((jj) => J.deleteEntry(jj, b.dataset.ddel)); renderDiary(sec);
  }));
  $$('[data-dplan]', sec).forEach((b) => b.addEventListener('click', () => {
    const p = store.get('kj_plans', []).find((x) => x.id === b.dataset.dplan);
    if (!p) return;
    const r = J.addEntry(journal(), { kind: 'remedy', source: 'journey', title: p.title, ref: `plan:${p.id}`, personId: diaryUi.person === 'all' ? '' : diaryUi.person }, { date: todayIso() });
    saveJournal(r.journal); toast(`🌼 ${L('Added to your diary', 'உங்கள் நாட்குறிப்பில் சேர்க்கப்பட்டது')}`); renderDiary(sec);
  }));
}
registerScreen('diary', { render: renderDiary, parent: 'home' });

// ---------------------------------------------------------------- Settings: Daily brief & reminders (the one place)
function renderDailySet(sec) {
  const s = settings();
  const native = Boolean(window.Capacitor?.isNativePlatform?.());
  const row = (id, en, taText, subEn = '', subTa = '') => `<label class="set-row"><span>${L(en, taText)}${subEn ? `<small>${L(subEn, subTa)}</small>` : ''}</span><input type="checkbox" data-ds="${id}"${s[id] ? ' checked' : ''}></label>`;
  const rem = store.get('kj_reminders', {});
  sec.innerHTML = `${subHeader(L('Daily Brief & Reminders', 'தினசரி குறிப்பு & நினைவூட்டல்கள்'), L('Everything Thunai shows or sends you each day — switch any of it off here', 'துணை தினமும் காட்டுவது, அனுப்புவது எல்லாம் — எதையும் இங்கே நிறுத்தலாம்'), 'more')}
    <section class="card glass ds-group"><div class="card-title">🌅 ${L('Morning brief', 'காலைக் குறிப்பு')}</div>
      ${row('showBrief', 'Show the morning brief on Today', 'காலைக் குறிப்பை இன்று பக்கத்தில் காட்டு', 'Three short lines for the selected person', 'தேர்ந்தெடுத்தவருக்கு மூன்று சிறு வரிகள்')}
      ${row('notify', 'Phone notification each morning', 'தினமும் காலையில் அறிவிப்பு', native ? 'Made on this phone — works offline' : 'In the browser it appears only while Thunai is open; the installed app notifies every day', native ? 'இந்தக் கைப்பேசியிலேயே தயாராகிறது — இணையம் தேவையில்லை' : 'உலாவியில் துணை திறந்திருக்கும்போது மட்டும்; நிறுவிய செயலியில் தினமும் வரும்')}
      <div class="set-row ds-time"><span>${L('Time (where you live)', 'நேரம் (நீங்கள் வசிக்கும் இடம்)')}</span><input type="time" id="dsTime" value="${esc(s.morningTime)}" aria-label="${esc(L('Morning brief time', 'காலைக் குறிப்பு நேரம்'))}"></div>
      ${row('weekly', 'Sunday: your week ahead', 'ஞாயிறு: உங்கள் இந்த வாரம்')}
      ${row('monthly', '1st of the month: your month', 'மாதம் 1-ஆம் தேதி: உங்கள் மாதம்')}
      ${row('sandhya', 'Evening lamp time (at sunset)', 'மாலை விளக்கேற்றும் நேரம் (அஸ்தமனம்)')}
    </section>
    <section class="card glass ds-group"><div class="card-title">🌼 ${L('Diary & gentle moments', 'நாட்குறிப்பு & இனிய தருணங்கள்')}</div>
      ${row('markButtons', '“✓ This helped” buttons on guidance', 'வழிகாட்டல்களில் “✓ இது உதவியது” பொத்தான்')}
      ${row('welcome', 'First-week welcome cards', 'முதல் வார வரவேற்பு அட்டைகள்')}
      ${row('milestones', 'Celebrate my milestones and family star birthdays', 'என் மைல்கற்கள், குடும்ப நட்சத்திரப் பிறந்தநாட்கள்')}
      ${row('sharePrompt', '“Share Thunai?” — at most once a month', '“துணையைப் பகிர்வீர்களா?” — மாதம் ஒருமுறைக்கு மேல் இல்லை')}
      ${row('journalBackup', 'Include my diary in the account backup', 'என் நாட்குறிப்பைக் கணக்குப் பாதுகாப்பில் சேர்', backupConsent() ? 'Off by default. Entries of private profiles never leave this phone.' : 'Needs “Back up family profiles” on in Privacy & data.', backupConsent() ? 'இயல்பாக நிறுத்தம். தனிப்பட்ட சுயவிவரங்களின் குறிப்புகள் இந்தக் கைப்பேசியை விட்டு வெளியேறாது.' : 'தனியுரிமை & தரவு பக்கத்தில் “குடும்ப சுயவிவரங்களைப் பாதுகா” இயக்கத்தில் இருக்க வேண்டும்.')}
    </section>
    <section class="card glass ds-group"><div class="card-title">🔔 ${L('Other reminders', 'பிற நினைவூட்டல்கள்')}</div>
      <p class="small">${L('Bells you set yourself and the morning panchangam alarm are on the Alarm & reminders page.', 'நீங்களே அமைத்த மணிகளும் காலை பஞ்சாங்க அலாரமும் அலாரம் & நினைவூட்டல் பக்கத்தில்.')}</p>
      <button class="chip-btn" data-go="reminders">${L('Alarm & reminders', 'அலாரம் & நினைவூட்டல்')} ›</button>
    </section>
    <button class="btn-soft" type="button" id="dsAllOff">🔕 ${L('Turn off all reminders, notifications and prompts', 'எல்லா நினைவூட்டல், அறிவிப்பு, கேள்விகளையும் நிறுத்து')}</button>
    <p class="small muted center">${L('Your diary and settings stay on this phone unless you choose the backup above.', 'மேலே பாதுகாப்பைத் தேர்வு செய்யாவிட்டால், உங்கள் நாட்குறிப்பும் அமைப்புகளும் இந்தக் கைப்பேசியிலேயே இருக்கும்.')}</p>
    <p class="small center"><button class="link-btn" type="button" id="dsClear">${L('Clear my diary', 'என் நாட்குறிப்பை அழி')}</button></p>
    ${copyright()}`;
  const apply = async (next, { ask = false } = {}) => {
    saveSettings(next);
    const how = await scheduleBriefNotifications({ ask }).catch(() => 'off');
    if (ask && how === 'denied') toast(L('Notifications are blocked for Thunai in the phone settings.', 'கைப்பேசி அமைப்புகளில் துணைக்கு அறிவிப்பு தடுக்கப்பட்டுள்ளது.'), 5000);
    if (ask && (how === 'native' || how === 'browser')) toast(L('Morning brief notification is on', 'காலைக் குறிப்பு அறிவிப்பு இயக்கப்பட்டது'));
    if ('journalBackup' in next) saveFamily(); // upload with, or without, the diary right away (signed in only)
  };
  $$('[data-ds]', sec).forEach((x) => x.addEventListener('change', () => {
    const next = { ...settings(), [x.dataset.ds]: x.checked };
    if (x.dataset.ds === 'journalBackup' && x.checked && !backupConsent()) { x.checked = false; toast(L('Turn on “Back up family profiles” in Privacy & data first.', 'முதலில் தனியுரிமை & தரவு பக்கத்தில் குடும்பப் பாதுகாப்பை இயக்கவும்.'), 5000); return; }
    apply(next, { ask: (x.dataset.ds === 'notify' || x.dataset.ds === 'sandhya') && x.checked });
  }));
  $('#dsTime', sec).addEventListener('change', (e) => { if (/^\d{2}:\d{2}$/.test(e.target.value)) apply({ ...settings(), morningTime: e.target.value }); });
  $('#dsAllOff', sec).addEventListener('click', async () => {
    await apply(allOff(settings()));
    // The morning panchangam alarm (server push) on this phone is switched off too.
    if (rem.pushEndpoint && !STATIC) {
      try {
        const reg = await navigator.serviceWorker?.ready;
        const sub = await reg?.pushManager?.getSubscription();
        if (sub) { await api('/api/push/unsubscribe', { method: 'POST', body: { endpoint: sub.endpoint } }).catch(() => {}); await sub.unsubscribe().catch(() => {}); }
      } catch { /* ignore */ }
      store.set('kj_reminders', { ...store.get('kj_reminders', {}), pushEndpoint: null });
    }
    toast(L('All reminders and prompts are off', 'எல்லா நினைவூட்டல்களும் கேள்விகளும் நிறுத்தப்பட்டன'));
    renderDailySet(sec);
  });
  $('#dsClear', sec).addEventListener('click', () => {
    if (!window.confirm(L('Delete every diary entry on this phone?', 'இந்தக் கைப்பேசியில் உள்ள எல்லா நாட்குறிப்புப் பதிவுகளையும் நீக்கவா?'))) return;
    const j = journal();
    saveJournal({ ...J.clearJournal(), deleted: [...j.deleted, ...j.entries.map((x) => x.id)].slice(-300), days: j.days, firstOpen: j.firstOpen });
    toast(L('Diary cleared', 'நாட்குறிப்பு அழிக்கப்பட்டது'));
  });
}
registerScreen('dailyset', { render: renderDailySet, parent: 'more' });

// Plan the next week's notifications after start-up and whenever the app comes back (text matches each day).
if (typeof window !== 'undefined') {
  const plan = () => scheduleBriefNotifications().catch(() => {});
  setTimeout(plan, 4000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) setTimeout(plan, 1500); });
}

