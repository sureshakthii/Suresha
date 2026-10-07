// This week's plan (இந்த வாரத் திட்டம்) — under Today. The person's own appointments and deadlines (fixed, never
// moved), family events, the observances they chose, and OPTIONAL good times for flexible tasks.
// Stored on this phone only after a one-time consent line; every item can be corrected or deleted.
// The plan itself is built by shared/week-plan.js (pure, tested in test/week-plan.test.js).
import {
  buildWeek, nextItems, weekText, emptyPlan, addTask, editTask, deleteTask, clearWeek, setObservances,
  TASK_TYPES, OBSERVANCES, OPTIONAL_NOTE, isFixedType, isoAt,
} from './shared/week-plan.js';
import { birthTamilMonth } from './shared/special.js';
import { weekSteps } from './shared/goals.js';
import { ageProfile } from './shared/age-guard.js';
import { state, $, $$, L, ta, esc, bi, store, toast, registerScreen, subHeader, activeMember, chartOf, displayName, fmtTime, fmtIsoDate } from './core.js';
import { remindBtn, upcomingReminders } from './remind.js';
import { sharePreview } from './screens-hubs.js';
import { icon } from './icons.js';

const KEY = 'kj_week';
let draft = null; // the plan before the person agreed to keep it on this phone (memory only)
let editing = null; // id of the task being corrected
let shareFamily = false;

/** The current plan: the saved one, or the unsaved draft. */
export function loadPlan() {
  const saved = store.get(KEY, null);
  if (saved && saved.consent) return { ...emptyPlan(), ...saved };
  return draft || emptyPlan();
}
function keep(plan, { explicit = false } = {}) {
  if (plan.consent) { store.set(KEY, { ...plan, savedAt: new Date().toISOString() }); draft = null; }
  else draft = plan;
  cache = null;
  if (explicit) document.dispatchEvent(new CustomEvent('kj:task', { detail: 'weekly_plan' })); // owner metrics (consent-gated, growth.js)
}
const residence = () => state.residence || state.loc;
const locOf = () => { const r = residence(); return r ? { lat: r.lat, lon: r.lon, tz: r.tz ?? 5.5, zone: r.zone } : null; };
/** Whose plan: the "self" profile, else the active person — the age guard follows them. */
const owner = () => state.family.find((m) => m.relation === 'self') || activeMember();
const tzNow = () => locOf()?.tz ?? 5.5;

function familyInputs() {
  return state.family.filter((m) => m.relation !== 'organization').map((m) => {
    const out = { id: m.id, name: displayName(m), relation: m.relation, dob: typeof m.date === 'string' ? m.date.slice(0, 10) : null };
    try { const c = chartOf(m); out.birthStar = c.janmaNakshatra.index; out.birthTamilMonth = birthTamilMonth(c).month; } catch { /* no chart */ }
    return out;
  });
}

let cache = null; // { key, week }
/** Build (or reuse) this week's plan for the current inputs. */
export function currentWeek() {
  const loc = locOf();
  if (!loc) return null;
  const plan = loadPlan();
  const o = owner();
  const profile = o ? ageProfile(o, { tz: loc.tz }) : { minor: false, age: null };
  const reminders = (() => { try { return upcomingReminders(200); } catch { return []; } })();
  const today = isoAt(new Date(), loc);
  // Dated next steps of saved goals (screens-goals.js, kj_goals) — corrected on the goal screen, shown here.
  const goalSteps = (() => { try { return weekSteps(store.get('kj_goals', null), { lang: ta() ? 'ta' : 'en', profileOf: (id) => { const p = state.family.find((m) => m.id === id) || o; return p ? ageProfile(p, { tz: loc.tz }) : null; } }); } catch { return []; } })();
  const key = JSON.stringify([today, loc, plan.tasks, goalSteps, plan.observances, state.family.map((m) => [m.id, m.date, m.time, m.name, m.relation]), state.ancestors, reminders.map((r) => r.id), profile.band, state.lang, Math.floor(Date.now() / 600000)]);
  if (cache && cache.key === key) return cache.week;
  const week = buildWeek({
    start: today, loc, now: new Date(), profile: { minor: profile.minor, age: profile.age ?? 30 },
    family: familyInputs(), ancestors: state.ancestors || [], chosenObservances: plan.observances, tasks: plan.tasks, reminders, goalSteps,
  });
  cache = { key, week };
  return week;
}

const tx = (x) => (typeof x === 'string' ? x : bi(x));
const hm = (iso, hhmm) => (iso ? fmtTime(new Date(iso), tzNow()) : hhmm || '');
const typeOf = (id) => TASK_TYPES.find((t) => t.id === id) || TASK_TYPES[2];
const dayLabel = (d) => `${d.isToday ? `${L('Today', 'இன்று')} · ` : ''}${bi(d.weekday)} · ${fmtIsoDate(d.date)}`;

// ---------------------------------------------------------------- Today card
/** Compact Today card: the next 2–3 items and "Open weekly plan". Filled after the page paints (fillWeekCard). */
export function weekCardHtml() {
  return `<section class="card glass week-card" id="homeWeek" aria-labelledby="wkCardT">
    <div class="card-title"><span id="wkCardT">${icon('calendar', { size: 18 })} ${L('This week', 'இந்த வாரம்')}</span></div>
    <div class="wk-next" id="wkNext"><p class="small muted">…</p></div>
    <button class="link-btn wk-open" data-go="week">${L('Open weekly plan', 'வாரத் திட்டத்தைத் திற')} ›</button>
  </section>`;
}
export function fillWeekCard(root = document) {
  setTimeout(() => {
    const box = $('#wkNext', root);
    if (!box) return;
    let items = [];
    try { const w = currentWeek(); items = w ? nextItems(w, { limit: 3 }) : []; } catch { items = []; }
    const day = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
    const wd = (iso) => day(iso).toLocaleDateString(ta() ? 'ta-IN' : 'en-IN', { weekday: 'short', timeZone: 'UTC' });
    box.innerHTML = items.length ? `<ul class="wk-list">${items.map((x) => `<li class="wk-li wk-${x.kind}"><span class="wk-when">${esc(wd(x.date))}${x.time || x.at ? ` · ${esc(hm(x.at, x.time))}` : ''}</span>
        <span class="wk-what">${kindIcon(x)} ${esc(tx(x.title))}${x.kind === 'optional' ? ` <span class="tag warn">${L('optional', 'விருப்பம்')}</span>` : ''}</span></li>`).join('')}</ul>`
      : `<p class="small muted">${L('Add your appointments, deadlines and the observances you follow — one short plan for the week.', 'சந்திப்புகள், கெடுக்கள், நீங்கள் கடைப்பிடிக்கும் விரதங்கள் — வாரத்துக்கு ஒரு சிறிய திட்டம்.')}</p>`;
  }, 30);
}
function kindIcon(x) {
  if (x.goalId) return '🎯';
  if (x.kind === 'fixed') return typeOf(x.type).icon;
  if (x.kind === 'family') return { 'star-birthday': '⭐', birthday: '🎂', thivasam: '🪔', reminder: '🔔' }[x.type] || '👪';
  if (x.kind === 'observance') return x.icon || '🙏';
  return '🌿';
}

// ---------------------------------------------------------------- the screen
function formHtml(t) {
  const today = isoAt(new Date(), locOf() || { tz: 5.5 });
  const type = t?.type || 'appointment';
  return `<form class="card glass wk-form" id="wkForm" novalidate>
    <div class="card-title"><span>${t ? `✏️ ${L('Correct this item', 'இதைத் திருத்து')}` : `➕ ${L('Add to this week', 'இந்த வாரத்தில் சேர்')}`}</span></div>
    <label>${L('What', 'என்ன')}<input id="wkTitle" maxlength="120" required value="${esc(t?.title || '')}" placeholder="${esc(L('e.g. Doctor visit, school fee, buy pooja items', 'எ.கா. மருத்துவர், பள்ளிக் கட்டணம், பூஜைப் பொருள் வாங்க'))}"></label>
    <fieldset class="wk-types"><legend class="small muted">${L('Kind', 'வகை')}</legend>
      ${TASK_TYPES.map((x) => `<label class="seg-opt"><input type="radio" name="wkType" value="${x.id}"${x.id === type ? ' checked' : ''}> ${x.icon} ${esc(bi(x))}</label>`).join('')}
    </fieldset>
    <label class="adult-confirm wk-any" id="wkAnyRow"><input type="checkbox" id="wkAny"${t ? (t.type === 'flexible' && !t.date ? ' checked' : '') : ' checked'}> ${L('Any day this week', 'இந்த வாரம் எந்த நாளும்')}</label>
    <div class="row2"><label id="wkDateRow">${L('Date', 'தேதி')}<input id="wkDate" type="date" min="${today}" value="${esc(t?.date || today)}"></label>
      <label>${L('Time (optional)', 'நேரம் (விருப்பம்)')}<input id="wkTime" type="time" value="${esc(t?.time || '')}"></label></div>
    <p class="small muted" id="wkTypeHelp"></p>
    <div class="btn-row"><button class="btn-gold" type="submit">${t ? L('Save changes', 'மாற்றங்களைச் சேமி') : L('Add', 'சேர்')}</button>${t ? `<button class="chip-btn" type="button" id="wkCancel">${L('Cancel', 'ரத்து')}</button>` : ''}</div>
  </form>`;
}
const TYPE_HELP = {
  appointment: () => L('Kept exactly at the date and time you give — never moved.', 'நீங்கள் தரும் தேதி, நேரத்திலேயே — ஒருபோதும் மாற்றப்படாது.'),
  deadline: () => L('A real deadline is shown as fixed. Astrology never pushes it later.', 'உண்மையான கெடு நிலையாகக் காட்டப்படும். ஜோதிடம் அதைத் தள்ளிப்போடாது.'),
  flexible: () => L('We suggest an optional good time for it, avoiding Rahu Kalam and Yamagandam. You decide.', 'ராகு காலம், எமகண்டம் தவிர்த்து விருப்ப நல்ல நேரம் தருவோம். முடிவு உங்களுடையது.'),
};

function itemActions(x) {
  const btns = [];
  if (x.kind === 'fixed' || x.kind === 'family' || x.kind === 'observance') btns.push(remindBtn({ title: tx(x.title), at: x.at || x.remindAt }));
  if (x.goalId) btns.push(`<button type="button" class="chip-btn icon-only" data-go="goals" data-param='${esc(JSON.stringify({ open: x.goalId }))}' aria-label="${esc(L('Open goal', 'இலக்கைத் திற'))}">🎯</button>`);
  if (x.taskId) {
    btns.push(`<button type="button" class="chip-btn icon-only" data-edit="${esc(x.taskId)}" aria-label="${esc(L('Edit', 'திருத்து'))}">✏️</button>`);
    btns.push(`<button type="button" class="chip-btn icon-only" data-del="${esc(x.taskId)}" aria-label="${esc(L('Delete', 'நீக்கு'))}">🗑️</button>`);
  }
  return `<span class="wk-acts">${btns.join('')}</span>`;
}
function rowHtml(x) {
  let when = '';
  let tag = '';
  if (x.kind === 'fixed') {
    when = x.time ? hm(x.at, x.time) : (x.type === 'deadline' ? L('by end of day', 'நாள் முடிவுக்குள்') : L('any time', 'எந்நேரமும்'));
    tag = `<span class="tag ${x.type === 'deadline' ? 'bad' : 'good'}">${x.type === 'deadline' ? L('Deadline · fixed', 'கெடு · நிலையானது') : L('Fixed', 'நிலையானது')}</span>`;
  } else if (x.kind === 'family' && x.time) when = hm(x.at, x.time);
  let extra = '';
  if (x.kind === 'optional') {
    extra = x.windows.length
      ? `<div class="small wk-wins">${L('Optional good time', 'விருப்ப நல்ல நேரம்')}: ${x.windows.map((w) => `<b>${esc(hm(w.start))}–${esc(hm(w.end))}</b>`).join(` ${L('or', 'அல்லது')} `)}</div>`
      : `<div class="small muted wk-wins">${L('No clear good time left this day — do it whenever it suits you.', 'இன்று தெளிவான நல்ல நேரம் இல்லை — உங்களுக்கு வசதியான நேரத்தில் செய்யுங்கள்.')}</div>`;
    if (x.preferred == null) extra += `<div class="small muted">${L('Any day this week', 'இந்த வாரம் எந்த நாளும்')}</div>`;
    tag = `<span class="tag warn">${L('Optional', 'விருப்பம்')}</span>`;
  }
  return `<li class="wk-item wk-${x.kind}"><span class="wk-ic" aria-hidden="true">${kindIcon(x)}</span>
    <div class="wk-main">${when ? `<span class="wk-time">${esc(when)}</span> ` : ''}<b>${esc(tx(x.title))}</b> ${tag}${x.goalId ? ` <span class="tag goal-tag">${L('Goal step', 'இலக்குப் படி')}</span>` : ''}${extra}</div>${itemActions(x)}</li>`;
}
function sectionHtml(cls, title, items, foot = '') {
  if (!items.length) return '';
  return `<div class="wk-sec wk-sec-${cls}"><div class="wk-sec-t">${title}</div><ul class="wk-items">${items.map(rowHtml).join('')}</ul>${foot}</div>`;
}
function dayHtml(d) {
  const rk = d.rahuKalam ? `<p class="small muted wk-rk">${L('Avoided', 'தவிர்த்தது')}: ${L('Rahu Kalam', 'ராகு காலம்')} ${esc(hm(d.rahuKalam.start))}–${esc(hm(d.rahuKalam.end))}${d.yamagandam ? ` · ${L('Yamagandam', 'எமகண்டம்')} ${esc(hm(d.yamagandam.start))}–${esc(hm(d.yamagandam.end))}` : ''}</p>` : '';
  const body = [
    sectionHtml('fixed', `📌 ${L('Fixed', 'நிலையானவை')}`, d.fixed),
    sectionHtml('family', `👪 ${L('Family', 'குடும்பம்')}`, d.family),
    sectionHtml('obs', `🙏 ${L('Observances', 'விரதம் / வழிபாடு')}`, d.observances, d.line ? `<p class="small wk-line">${esc(bi(d.line))}</p>` : ''),
    sectionHtml('opt', `🌿 ${L('Optional good times', 'விருப்ப நல்ல நேரம்')}`, d.optional, rk),
  ].join('');
  return `<article class="card glass wk-day${d.isToday ? ' wk-today' : ''}" aria-label="${esc(dayLabel(d))}">
    <div class="wk-day-h"><b>${esc(dayLabel(d))}</b><span class="small muted">${esc(ta() ? `${d.tamil.monthTa} ${d.tamil.day}` : `${d.tamil.monthEn} ${d.tamil.day}`)}</span></div>
    ${body || `<p class="small muted wk-empty">${L('Nothing planned', 'திட்டம் இல்லை')}</p>`}
  </article>`;
}

function render(sec) {
  const plan = loadPlan();
  const t = editing ? plan.tasks.find((x) => x.id === editing) : null;
  if (editing && !t) editing = null;
  const saved = Boolean(plan.consent);
  sec.innerHTML = `${subHeader(L('This week’s plan', 'இந்த வாரத் திட்டம்'), L('Your appointments and deadlines stay fixed. Family events and the observances you chose are added. Good times are only optional suggestions.', 'உங்கள் சந்திப்புகளும் கெடுக்களும் நிலையானவை. குடும்ப நிகழ்வுகளும் நீங்கள் தேர்ந்த விரதங்களும் சேர்க்கப்படும். நல்ல நேரம் விருப்ப ஆலோசனை மட்டுமே.'))}
    <div class="dsk-cols"><div class="dsk-col">
    ${formHtml(t)}
    <section class="card glass wk-obs" aria-labelledby="wkObsT"><div class="card-title"><span id="wkObsT">🙏 ${L('Observances I follow', 'நான் கடைப்பிடிப்பவை')}</span></div>
      <div class="member-switch wrap" role="group" aria-labelledby="wkObsT">${OBSERVANCES.map((o) => { const on = plan.observances.includes(o.id); return `<button type="button" class="mchip${on ? ' sel' : ''}" data-obs="${o.id}" aria-pressed="${on}">${o.icon} ${esc(bi(o))}</button>`; }).join('')}</div>
      <p class="small muted">${L('Only the ones you choose are shown in your week.', 'நீங்கள் தேர்ந்தவை மட்டுமே வாரத்தில் காட்டப்படும்.')}</p></section>
    <section class="card glass wk-save" aria-labelledby="wkSaveT"><div class="card-title"><span id="wkSaveT">💾 ${saved ? L('Saved on this phone', 'இந்தக் கைப்பேசியில் சேமிக்கப்பட்டது') : L('Keep this plan', 'இந்தத் திட்டத்தை வைத்திரு')}</span></div>
      <p class="small">${L('Saved on this phone; you can delete anytime.', 'இந்தக் கைப்பேசியில் மட்டும் சேமிக்கப்படும்; எப்போது வேண்டுமானாலும் நீக்கலாம்.')}</p>
      <div class="btn-row">
        <button type="button" class="btn-gold" id="wkSave">${saved ? `✓ ${L('Save plan', 'திட்டத்தைச் சேமி')}` : L('Save plan', 'திட்டத்தைச் சேமி')}</button>
        <button type="button" class="chip-btn" id="wkShare">${icon('share', { size: 16 })} ${L('Share as text', 'உரையாகப் பகிர்')}</button>
        <button type="button" class="chip-btn" id="wkClear">${L('Clear week', 'வாரத்தை அழி')}</button>
        ${saved ? `<button type="button" class="chip-btn" id="wkForget">${L('Delete saved plan', 'சேமித்ததை நீக்கு')}</button>` : ''}
      </div>
      <label class="adult-confirm small"><input type="checkbox" id="wkShareFam"${shareFamily ? ' checked' : ''}> ${L('Include family events when sharing (only if they are happy to share)', 'பகிரும்போது குடும்ப நிகழ்வுகளையும் சேர் (அவர்கள் ஒப்புக்கொண்டால் மட்டும்)')}</label>
      ${saved ? '' : `<p class="small muted">${L('Not saved yet — this plan is lost when the app closes.', 'இன்னும் சேமிக்கவில்லை — செயலியை மூடினால் இழக்கப்படும்.')}</p>`}
    </section>
    </div><div class="dsk-col">
    <p class="small muted wk-legend">📌 ${L('Fixed — never moved', 'நிலையானது — மாற்றப்படாது')} · 🌿 ${esc(bi(OPTIONAL_NOTE))}</p>
    <div id="wkDays" aria-live="polite"><p class="muted center">${L('Preparing your week…', 'உங்கள் வாரம் தயாராகிறது…')}</p></div>
    </div></div>`;
  wire(sec);
  setTimeout(() => { if (state.view === 'week') fillDays(sec); }, 20);
}

function fillDays(sec) {
  const box = $('#wkDays', sec);
  if (!box) return;
  let w;
  try { w = currentWeek(); } catch { w = null; }
  if (!w) { box.innerHTML = `<p class="muted">${L('Set your place first to see the week.', 'வாரத்தைக் காண முதலில் இடத்தை அமைக்கவும்.')}</p>`; return; }
  box.innerHTML = `${w.minor && w.hidden ? `<p class="small muted">${L('Some grown-up items are not shown in a child’s plan.', 'குழந்தையின் திட்டத்தில் பெரியவர்களுக்கான சில விஷயங்கள் காட்டப்படவில்லை.')}</p>` : ''}${w.days.map(dayHtml).join('')}`;
  $$('[data-edit]', box).forEach((b) => b.addEventListener('click', () => { editing = b.dataset.edit; render(sec); $('#wkTitle', sec)?.focus(); }));
  $$('[data-del]', box).forEach((b) => b.addEventListener('click', () => {
    const p = loadPlan(); const x = p.tasks.find((y) => y.id === b.dataset.del); if (!x) return;
    if (!confirm(L(`Delete “${x.title}”?`, `“${x.title}” நீக்கவா?`))) return;
    keep(deleteTask(p, x.id)); if (editing === x.id) editing = null;
    toast(L('Deleted', 'நீக்கப்பட்டது')); render(sec);
  }));
}

function wire(sec) {
  const form = $('#wkForm', sec);
  const help = () => {
    const v = $('input[name="wkType"]:checked', sec)?.value || 'appointment';
    $('#wkTypeHelp', sec).textContent = TYPE_HELP[v]();
    const flex = v === 'flexible';
    $('#wkAnyRow', sec).hidden = !flex;
    $('#wkDateRow', sec).hidden = flex && $('#wkAny', sec).checked;
  };
  $('#wkAny', sec).addEventListener('change', help);
  $$('input[name="wkType"]', sec).forEach((r) => r.addEventListener('change', help));
  help();
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const task = { title: $('#wkTitle', sec).value, type: $('input[name="wkType"]:checked', sec)?.value || 'appointment', date: ($('input[name="wkType"]:checked', sec)?.value === 'flexible' && $('#wkAny', sec).checked) ? null : ($('#wkDate', sec).value || null), time: $('#wkTime', sec).value || null };
    if (!task.title.trim()) { toast(L('Please write what it is', 'என்ன என்று எழுதுங்கள்')); $('#wkTitle', sec).focus(); return; }
    if (isFixedType(task.type) && !task.date) { toast(L('An appointment or deadline needs its date', 'சந்திப்பு / கெடுவுக்குத் தேதி தேவை')); $('#wkDate', sec).focus(); return; }
    const p = loadPlan();
    keep(editing ? editTask(p, editing, task) : addTask(p, task));
    toast(editing ? L('Updated', 'திருத்தப்பட்டது') : L('Added', 'சேர்க்கப்பட்டது'));
    editing = null;
    render(sec);
  });
  $('#wkCancel', sec)?.addEventListener('click', () => { editing = null; render(sec); });
  $$('[data-obs]', sec).forEach((b) => b.addEventListener('click', () => {
    const p = loadPlan();
    const set = new Set(p.observances);
    if (set.has(b.dataset.obs)) set.delete(b.dataset.obs); else set.add(b.dataset.obs);
    keep(setObservances(p, [...set]));
    render(sec);
  }));
  $('#wkSave', sec).addEventListener('click', () => {
    keep({ ...loadPlan(), consent: true }, { explicit: true });
    toast(L('Saved on this phone', 'இந்தக் கைப்பேசியில் சேமிக்கப்பட்டது'));
    render(sec);
  });
  $('#wkForget', sec)?.addEventListener('click', () => {
    if (!confirm(L('Delete the saved weekly plan from this phone?', 'சேமித்த வாரத் திட்டத்தை இந்தக் கைப்பேசியிலிருந்து நீக்கவா?'))) return;
    store.set(KEY, null); try { localStorage.removeItem(KEY); } catch { /* ignore */ }
    draft = null; editing = null; cache = null;
    toast(L('Deleted', 'நீக்கப்பட்டது')); render(sec);
  });
  $('#wkClear', sec).addEventListener('click', () => {
    if (!confirm(L('Remove this week’s tasks? Your chosen observances stay.', 'இந்த வார வேலைகளை நீக்கவா? தேர்ந்த விரதங்கள் இருக்கும்.'))) return;
    const loc = locOf() || { tz: 5.5 };
    keep(clearWeek(loadPlan(), isoAt(new Date(), loc), 7)); editing = null;
    render(sec);
  });
  $('#wkShareFam', sec).addEventListener('change', (e) => { shareFamily = e.target.checked; });
  $('#wkShare', sec).addEventListener('click', () => {
    let w; try { w = currentWeek(); } catch { w = null; }
    if (!w) return;
    sharePreview(L('This week’s plan', 'இந்த வாரத் திட்டம்'), weekText(w, { lang: ta() ? 'ta' : 'en', includeFamily: shareFamily }));
  });
}

registerScreen('week', { render, parent: 'home', needsLoc: true });
