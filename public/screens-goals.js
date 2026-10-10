// My goals (என் இலக்குகள் — owner requirement §8a): an optional saved workspace for a goal such as marriage
// preparation, a temple journey or career preparation. The person keeps the deadline, constraints, next steps and
// a weekly follow-up; every item can be corrected or deleted. Practical steps come first; chart-linked good
// periods are optional and never run past the real deadline (shared/goals.js, tested in test/goals.test.js).
// Saved on this phone; backed up to the account only with backup consent, never for a private profile
// (shared/sync-policy.js via saveFamily()).
import {
  TEMPLATES, templateById, templateAllowed, emptyGoals, createGoal, updateGoal, deleteGoal, toggleStep, addStep, editStep,
  deleteStep, moveStep, markReviewed, progress, nextStep, activeGoals, canAddGoal, topGoal, daysLeft, deadlineText, nextReview,
  reviewDue, goodPeriods, askText, mergeGoals, todayAt, afterDeadline, HEALTH_NOTE, MAX_STEPS,
} from './shared/goals.js';
import { ageProfile } from './shared/age-guard.js';
import { isPrivateProfile } from './shared/sync-policy.js';
import {
  state, $, $$, L, ta, esc, bi, store, toast, registerScreen, subHeader, go, activeMember, chartOf, displayName, fmtIsoDate,
  saveFamily, api, STATIC, planetName,
} from './core.js';
import { remindBtn } from './remind.js';
import { lockCard, isLocked } from './growth.js';
import { icon } from './icons.js';

const KEY = 'kj_goals';
let view = { mode: 'list', id: null, tpl: null, stepEdit: null, periods: null };
let pulled = false;

export const loadGoals = () => { const s = store.get(KEY, null); return s && Array.isArray(s.goals) ? { ...emptyGoals(), ...s } : emptyGoals(); };
function saveGoals(s) {
  store.set(KEY, s);
  // Account backup (only with the "Back up" consent, never private profiles) rides on the family sync.
  if (state.user && !STATIC) saveFamily();
}
const tz = () => state.loc?.tz ?? 5.5;
const today = () => todayAt(new Date(), tz());
const people = () => state.family.filter((m) => m.relation !== 'organization');
const personOf = (id) => state.family.find((m) => m.id === id) || null;
const profileOf = (id) => { const p = personOf(id); return p ? ageProfile(p, { tz: tz() }) : ageProfile(null); };
const defaultPerson = () => (people().find((m) => m.relation === 'self') || (activeMember()?.relation !== 'organization' ? activeMember() : null) || people()[0] || null);
/**
 * Personal / Family plans include saved goals; a free user (billing enforced) keeps one active goal — the value
 * before payment. The rule lives in shared/plan-gates.js (growth.js isLocked('goals', { count })).
 */
const goalGate = (s) => ({ locked: isLocked('goals', { count: activeGoals(s).length }), max: undefined });
const WEEKDAYS = [['Sunday', 'ஞாயிறு'], ['Monday', 'திங்கள்'], ['Tuesday', 'செவ்வாய்'], ['Wednesday', 'புதன்'], ['Thursday', 'வியாழன்'], ['Friday', 'வெள்ளி'], ['Saturday', 'சனி']];
const LINKS = {
  porutham: ['Check porutham', 'பொருத்தம் பார்'], couple: ['Marriage match', 'திருமணப் பொருத்தம்'], muhurtham: ['Muhurtham dates', 'முகூர்த்த நாட்கள்'],
  journey: ['Plan the journey', 'பயணத் திட்டம்'], temples: ['Temples', 'கோவில்கள்'], names: ['Baby names', 'குழந்தைப் பெயர்கள்'],
  life: ['Life questions', 'வாழ்க்கைக் கேள்விகள்'], ask: ['Is now a good time?', 'இப்போது செய்யலாமா?'], health: ['Health guide', 'ஆரோக்கிய வழிகாட்டி'],
  chat: ['Ask Thunai', 'துணையிடம் கேள்'],
};
const ADULT_LINKS = new Set(['porutham', 'couple']);

/** Pull goals saved in the account (backup on) once per session and merge them — newer copy wins, deletions stay. */
async function pullGoals(sec) {
  if (pulled || !state.user || STATIC) return;
  pulled = true;
  try {
    const { data } = await api('/api/me/data');
    if (!data?.goals) return;
    const privateIds = new Set(state.family.filter(isPrivateProfile).map((m) => m.id));
    const merged = mergeGoals(data.goals, loadGoals(), { privateIds });
    if (JSON.stringify(merged) !== JSON.stringify(loadGoals())) { store.set(KEY, merged); if (state.view === 'goals') render(sec, {}); }
  } catch { /* offline: keep the phone's copy */ }
}

// ---------------------------------------------------------------- Today card
/** Compact Today card (after This week): the top active goal, its next step and progress — or one subtle row. */
export function goalsCardHtml() {
  let s; try { s = loadGoals(); } catch { s = emptyGoals(); }
  const g = topGoal(s);
  if (!g) {
    // A child is active on Today: no marriage / career examples (QA-A).
    const minor = activeMember() && ageProfile(activeMember(), { tz: tz() }).minor;
    return `<button type="button" class="goal-set-row" data-go="goals" data-param='{"new":true}'>🎯 <span>${minor ? L('Set a goal — studies, journey, health…', 'ஓர் இலக்கை அமையுங்கள் — படிப்பு, பயணம், ஆரோக்கியம்…') : L('Set a goal — marriage, journey, career…', 'ஓர் இலக்கை அமையுங்கள் — திருமணம், பயணம், வேலை…')}</span> <span aria-hidden="true">›</span></button>`;
  }
  const ns = nextStep(g);
  const pc = progress(g);
  const due = reviewDue(g, today());
  const more = activeGoals(s).length - 1;
  return `<section class="card glass goal-card" id="homeGoals" aria-labelledby="goalCardT">
    <div class="card-title"><span id="goalCardT">🎯 ${L('My Goals', 'என் இலக்குகள்')}</span>${more > 0 ? `<span class="pill">+${more}</span>` : ''}</div>
    <button type="button" class="goal-today" data-go="goals" data-param='${esc(JSON.stringify({ open: g.id }))}'>
      <b class="goal-t">${templateById(g.template).icon} ${esc(g.title)}</b>
      <span class="small muted">${esc(bi(deadlineText(g, today())))}</span>
      ${ns ? `<span class="small goal-next">${L('Next', 'அடுத்து')}: ${esc(ns.title)}</span>` : `<span class="small goal-next">${L('All steps done', 'எல்லாப் படிகளும் முடிந்தன')} ✓</span>`}
      <span class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pc}" aria-label="${esc(L('Progress', 'முன்னேற்றம்'))}"><i style="width:${pc}%"></i></span>
      <span class="small muted">${pc}% ${L('done', 'முடிந்தது')}${due ? ` · ${L('weekly review due', 'வார மீளாய்வு நேரம்')}` : ''}</span>
    </button>
    <button class="link-btn wk-open" data-go="goals">${L('Open my goals', 'என் இலக்குகளைத் திற')} ›</button>
  </section>`;
}

// ---------------------------------------------------------------- pieces
const consentLine = () => `<p class="small muted goal-consent">🔒 ${L('Saved on this phone; backed up only if you turn on backup.', 'இந்தக் கைப்பேசியில் சேமிக்கப்படும்; நீங்கள் காப்பை இயக்கினால் மட்டுமே காப்புப் பிரதி.')}
  <button type="button" class="link-btn inline-link" data-go="privacy">${L('Privacy settings', 'தனியுரிமை அமைப்புகள்')} ›</button></p>`;
const progressBar = (pc) => `<span class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pc}" aria-label="${esc(L('Progress', 'முன்னேற்றம்'))}"><i style="width:${pc}%"></i></span>`;
const whoName = (g) => { const p = personOf(g.personId); return p ? displayName(p) : ''; };

function goalRow(g) {
  const ns = nextStep(g);
  const pc = progress(g);
  return `<li><button type="button" class="goal-row" data-open="${esc(g.id)}">
    <span class="goal-ic" aria-hidden="true">${templateById(g.template).icon}</span>
    <span class="goal-main"><b>${esc(g.title)}</b>${g.status === 'done' ? ` <span class="tag good">${L('Achieved', 'நிறைவேறியது')}</span>` : ''}
      <span class="small muted">${whoName(g) ? `${esc(whoName(g))} · ` : ''}${esc(bi(deadlineText(g, today())))}</span>
      ${ns && g.status !== 'done' ? `<span class="small">${L('Next', 'அடுத்து')}: ${esc(ns.title)}</span>` : ''}
      ${progressBar(pc)}<span class="small muted">${pc}%</span></span>
    <span aria-hidden="true" class="goal-chev">›</span></button></li>`;
}

function listHtml(s) {
  const canAdd = !goalGate(s).locked && canAddGoal(s);
  const act = s.goals.filter((g) => g.status !== 'done');
  const done = s.goals.filter((g) => g.status === 'done');
  return `${subHeader(L('My Goals', 'என் இலக்குகள்'), L('One place for a goal you are working on — your deadline, your limits and the next practical step. Astrology is only an optional extra.', 'நீங்கள் முயலும் இலக்குக்கு ஓர் இடம் — உங்கள் காலக்கெடு, வரம்புகள், அடுத்த நடைமுறைப் படி. ஜோதிடம் விருப்பத் துணை மட்டுமே.'))}
    <div class="dsk-cols"><div class="dsk-col">
    ${act.length ? `<section class="card glass" aria-labelledby="goalListT"><div class="card-title"><span id="goalListT">${L('Active goals', 'நடப்பு இலக்குகள்')}</span></div><ul class="goal-list">${act.map(goalRow).join('')}</ul></section>` : ''}
    ${done.length ? `<details class="card glass goal-done"><summary>${L('Achieved', 'நிறைவேறியவை')} (${done.length})</summary><ul class="goal-list">${done.map(goalRow).join('')}</ul></details>` : ''}
    ${!s.goals.length ? `<div class="card glass goal-empty"><p>${L('No goals yet. Pick what you are preparing for — we start you with a short practical checklist you can change.', 'இன்னும் இலக்கு இல்லை. நீங்கள் தயாராகும் ஒன்றைத் தேர்ந்தெடுங்கள் — மாற்றக்கூடிய ஒரு சிறிய நடைமுறைப் பட்டியலுடன் தொடங்குவோம்.')}</p></div>` : ''}
    </div><div class="dsk-col">
    ${canAdd ? templatePicker() : lockCard(L(`Saved goals are part of the Personal and Family plans. One active goal is free — mark it achieved or delete it to start another, or see the plans.`, `சேமித்த இலக்குகள் தனிநபர் & குடும்பத் திட்டங்களில் உள்ளன. ஒரு நடப்பு இலக்கு இலவசம் — அதை நிறைவேறியதாகக் குறித்தால் அல்லது நீக்கினால் புதியது தொடங்கலாம்; அல்லது திட்டங்களைப் பாருங்கள்.`), 'goals')}
    ${consentLine()}
    </div></div>`;
}

function templatePicker() {
  return `<section class="card glass" aria-labelledby="goalNewT"><div class="card-title"><span id="goalNewT">➕ ${L('Start a goal', 'புதிய இலக்கு')}</span></div>
    <div class="goal-tpls">${TEMPLATES.map((t) => `<button type="button" class="goal-tpl" data-tpl="${t.id}"><span aria-hidden="true">${t.icon}</span> ${esc(bi(t))}</button>`).join('')}</div>
    <p class="small muted">${L('Marriage, career and property goals are for adults (18+).', 'திருமணம், வேலை, சொத்து இலக்குகள் பெரியவர்களுக்கு (18+) மட்டும்.')}</p></section>`;
}

function formHtml(g, tplId) {
  const tpl = templateById(g ? g.template : tplId);
  const allowed = people().filter((m) => templateAllowed(tpl.id, ageProfile(m, { tz: tz() })));
  const sel = g ? g.personId : (allowed.find((m) => m.id === defaultPerson()?.id) || allowed[0])?.id || '';
  const fu = g?.followUp || { weekly: true, weekday: 0 };
  const title = g ? g.title : bi(tpl);
  const noPerson = tpl.topic && !allowed.length;
  return `${subHeader(g ? L('Edit Goal', 'இலக்கைத் திருத்து') : `${tpl.icon} ${esc(bi(tpl))}`, g ? '' : L('Only the name is needed. Everything can be changed later.', 'பெயர் மட்டும் போதும். பின்னர் எல்லாவற்றையும் மாற்றலாம்.'), 'goals')}
    <form class="card glass goal-form" id="goalForm" novalidate>
      ${noPerson ? `<p class="note-box small" role="note">${L(`${tpl.en} is only for people aged 18 and over. Add a profile with the date of birth first.`, `${tpl.ta} 18 வயதுக்கு மேற்பட்டவர்களுக்கு மட்டும். முதலில் பிறந்த தேதியுடன் ஒரு சுயவிவரத்தைச் சேர்க்கவும்.`)}</p>
        <button type="button" class="btn-gold" data-go="family" data-param='{"add":true}'>${L('Add profile', 'சுயவிவரம் சேர்')}</button>` : `
      <label>${L('Who is it for', 'யாருக்காக')}
        <select id="gPerson">${allowed.map((m) => `<option value="${esc(m.id)}"${m.id === sel ? ' selected' : ''}>${esc(displayName(m))}</option>`).join('')}${tpl.topic ? '' : `<option value=""${!sel ? ' selected' : ''}>${L('Family / general', 'குடும்பம் / பொது')}</option>`}</select></label>
      ${tpl.topic && allowed.length < people().length ? `<p class="small muted">${L('Only adults (18+) are listed for this goal.', 'இந்த இலக்குக்குப் பெரியவர்கள் (18+) மட்டும் காட்டப்படுகின்றனர்.')}</p>` : ''}
      <label>${L('Goal name', 'இலக்கின் பெயர்')}<input id="gTitle" maxlength="120" required value="${esc(title)}"></label>
      <label>${L('Deadline (optional)', 'காலக்கெடு (விருப்பம்)')}<input id="gDeadline" type="date" ${g ? '' : `min="${today()}"`} value="${esc(g?.deadline || '')}"></label>
      <p class="small muted">${L('Your real deadline always comes first — nothing in the app moves it.', 'உங்கள் உண்மையான காலக்கெடுவே முதன்மை — செயலியில் எதுவும் அதை மாற்றாது.')}</p>
      <label>${L('Constraints (optional)', 'வரம்புகள் (விருப்பம்)')}<textarea id="gCons" rows="2" maxlength="500" placeholder="${esc(L('e.g. budget, location, dates to avoid', 'எ.கா. பட்ஜெட், இடம், தவிர்க்க வேண்டிய தேதிகள்'))}">${esc(g?.constraints || '')}</textarea></label>
      <label>${L('Notes (optional)', 'குறிப்புகள் (விருப்பம்)')}<textarea id="gNotes" rows="2" maxlength="500">${esc(g?.notes || '')}</textarea></label>
      <label class="adult-confirm"><input type="checkbox" id="gWeekly"${fu.weekly ? ' checked' : ''}> ${L('Weekly review prompt', 'வாராந்திர மீளாய்வு நினைவு')}</label>
      <label>${L('Review day', 'மீளாய்வு நாள்')}<select id="gWeekday">${WEEKDAYS.map((d, i) => `<option value="${i}"${i === fu.weekday ? ' selected' : ''}>${L(...d)}</option>`).join('')}</select></label>
      ${tpl.habitsOnly ? `<p class="note-box small" role="note">${esc(bi(HEALTH_NOTE))}</p>` : ''}
      <p class="small err-line" id="gErr" role="alert"></p>
      <div class="btn-row"><button class="btn-gold" type="submit">${g ? L('Save changes', 'மாற்றங்களைச் சேமி') : L('Save goal', 'இலக்கைச் சேமி')}</button>
        <button type="button" class="chip-btn" id="gCancel">${L('Cancel', 'ரத்து')}</button></div>`}
    </form>
    ${consentLine()}`;
}

function stepRow(g, st, i) {
  if (view.stepEdit === st.id) return `<li class="goal-step editing">${stepForm(g, st)}</li>`;
  const date = st.date ? `<span class="tag ${st.kind === 'deadline' ? 'bad' : 'warn'}">${esc(fmtIsoDate(st.date))}${st.time ? ` ${esc(st.time)}` : ''}${st.kind === 'deadline' ? ` · ${L('fixed', 'நிலையானது')}` : ''}</span>` : '';
  return `<li class="goal-step${st.done ? ' done' : ''}">
    <label class="adult-confirm goal-check"><input type="checkbox" data-tick="${esc(st.id)}"${st.done ? ' checked' : ''}> <span>${esc(st.title)} ${date}</span></label>
    <span class="wk-acts">
      <button type="button" class="chip-btn icon-only" data-up="${esc(st.id)}" aria-label="${esc(L('Move up', 'மேலே நகர்த்து'))}"${i === 0 ? ' disabled' : ''}>↑</button>
      <button type="button" class="chip-btn icon-only" data-down="${esc(st.id)}" aria-label="${esc(L('Move down', 'கீழே நகர்த்து'))}"${i === g.steps.length - 1 ? ' disabled' : ''}>↓</button>
      <button type="button" class="chip-btn icon-only" data-sedit="${esc(st.id)}" aria-label="${esc(L('Edit step', 'படியைத் திருத்து'))}">✏️</button>
      <button type="button" class="chip-btn icon-only" data-sdel="${esc(st.id)}" aria-label="${esc(L('Delete step', 'படியை நீக்கு'))}">🗑️</button>
    </span></li>`;
}
function stepForm(g, st = null) {
  const p = st ? 'e' : 'n';
  return `<form class="goal-stepform" data-stepform="${st ? esc(st.id) : ''}" novalidate>
    <label>${st ? L('Step', 'படி') : L('Add a step', 'படி சேர்')}<input id="${p}StTitle" maxlength="120" value="${esc(st?.title || '')}" placeholder="${esc(L('e.g. Call the mandapam', 'எ.கா. மண்டபத்தை அழைக்கவும்'))}"></label>
    <div class="row2"><label>${L('Date (optional)', 'தேதி (விருப்பம்)')}<input id="${p}StDate" type="date" ${g.deadline ? `max="${esc(g.deadline)}"` : ''} value="${esc(st?.date || '')}"></label>
      <label>${L('Time (optional)', 'நேரம் (விருப்பம்)')}<input id="${p}StTime" type="time" value="${esc(st?.time || '')}"></label></div>
    <label class="adult-confirm small"><input type="checkbox" id="${p}StFixed"${st?.kind === 'deadline' ? ' checked' : ''}> ${L('This date is a real deadline (kept fixed in the weekly plan)', 'இந்தத் தேதி உண்மையான காலக்கெடு (வாரத் திட்டத்தில் நிலையாக இருக்கும்)')}</label>
    <div class="btn-row"><button class="${st ? 'btn-gold' : 'chip-btn'}" type="submit">${st ? L('Save', 'சேமி') : `➕ ${L('Add step', 'படி சேர்')}`}</button>${st ? `<button type="button" class="chip-btn" data-scancel>${L('Cancel', 'ரத்து')}</button>` : ''}</div>
  </form>`;
}

function periodsHtml(g) {
  const p = view.periods;
  if (!p || p.id !== g.id) {
    return `<button type="button" class="chip-btn" id="gPeriods">🌿 ${L('Show good periods before your deadline (optional)', 'காலக்கெடுவுக்கு முன் நல்ல காலங்கள் (விருப்பம்)')}</button>`;
  }
  const r = p.res;
  const reason = {
    'no-deadline': L('Set a deadline to see optional good periods within it.', 'காலக்கெடு வைத்தால் அதற்குள் உள்ள விருப்ப நல்ல காலங்களைக் காணலாம்.'),
    'no-chart': L('Add the birth details of the person to see this.', 'இதற்கு அவரின் பிறப்பு விவரங்களைச் சேர்க்கவும்.'),
    'needs-birth-time': L('This needs a known birth time. Your plan works just as well without it.', 'இதற்குப் பிறந்த நேரம் தேவை. அது இல்லாமலும் உங்கள் திட்டம் நன்றாக இயங்கும்.'),
    'none-before-deadline': L('No traditionally favoured period falls before your deadline — that is fine. Go by your deadline and the practical steps.', 'உங்கள் காலக்கெடுவுக்கு முன் பாரம்பரிய நல்ல காலம் எதுவும் இல்லை — பரவாயில்லை. உங்கள் காலக்கெடுவையும் நடைமுறைப் படிகளையும் பின்பற்றுங்கள்.'),
    past: L('The deadline has passed — change it to see this.', 'காலக்கெடு கடந்துவிட்டது — இதைக் காண அதை மாற்றுங்கள்.'),
    age: L('Not shown for this person.', 'இவருக்குக் காட்டப்படாது.'),
  }[r.reason] || '';
  return `<p class="small"><span class="tag warn">${L('Optional', 'விருப்பம்')}</span> ${esc(bi(r.note))}</p>
    ${r.windows.length ? `<ul class="goal-periods">${r.windows.map((w) => `<li><b>${esc(fmtIsoDate(w.from))} – ${esc(fmtIsoDate(w.to))}</b>
      <span class="small muted">${esc(ta() ? `${planetName(w.md)} தசை · ${planetName(w.ad)} புக்தி` : `${w.md} Dasa · ${w.ad} Bhukti`)}</span>
      ${w.reasons.length ? `<span class="small">${w.reasons.slice(0, 2).map((x) => esc(bi(x))).join(' · ')}</span>` : ''}</li>`).join('')}</ul>` : `<p class="small muted">${reason}</p>`}
    <p class="small muted">${esc(bi(r.basis))} ${esc(bi(r.disclaimer))}</p>`;
}

function reviewInstant(g) {
  const iso = nextReview(g, today());
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  let at = new Date(Date.UTC(y, m - 1, d, 19, 0) - tz() * 3600000);
  if (at.getTime() < Date.now()) at = new Date(at.getTime() + 7 * 86400000);
  return at;
}

function detailHtml(g) {
  const tpl = templateById(g.template);
  const pc = progress(g);
  const n = daysLeft(g, today());
  const who = whoName(g);
  const links = tpl.links.filter((id) => !(ADULT_LINKS.has(id) && !templateAllowed('marriage', profileOf(g.personId))));
  const rv = reviewInstant(g);
  const due = reviewDue(g, today());
  return `${subHeader(`${tpl.icon} ${esc(g.title)}`, `${who ? `${esc(who)} · ` : ''}${esc(bi(tpl))}`, 'goals')}
    <div class="dsk-cols"><div class="dsk-col">
    <section class="card glass goal-head" aria-label="${esc(L('Deadline and progress', 'காலக்கெடு, முன்னேற்றம்'))}">
      <p class="goal-dl"><b>${esc(bi(deadlineText(g, today())))}</b>${g.deadline ? ` <span class="small muted">(${esc(fmtIsoDate(g.deadline))})</span>` : ''}</p>
      ${n != null && n >= 0 ? `<p class="small muted">${L('Take it one step at a time.', 'ஒவ்வொரு படியாகச் செல்லுங்கள்.')}</p>` : ''}
      ${progressBar(pc)}<p class="small muted">${pc}% ${L('done', 'முடிந்தது')} · ${g.steps.filter((x) => x.done).length}/${g.steps.length} ${L('steps', 'படிகள்')}</p>
      ${g.constraints ? `<p class="small"><b>${L('Constraints', 'வரம்புகள்')}:</b> ${esc(g.constraints)}</p>` : ''}
      ${g.notes ? `<p class="small"><b>${L('Notes', 'குறிப்புகள்')}:</b> ${esc(g.notes)}</p>` : ''}
      ${tpl.habitsOnly ? `<p class="note-box small" role="note">${esc(bi(HEALTH_NOTE))}</p>` : ''}
    </section>
    <section class="card glass" aria-labelledby="gStepsT"><div class="card-title"><span id="gStepsT">✅ ${L('Next steps', 'அடுத்த படிகள்')}</span></div>
      ${g.steps.length ? `<ul class="goal-steps">${g.steps.map((st, i) => stepRow(g, st, i)).join('')}</ul>` : `<p class="small muted">${L('No steps yet — add the first one below.', 'இன்னும் படிகள் இல்லை — கீழே முதல் படியைச் சேர்க்கவும்.')}</p>`}
      ${g.steps.length < MAX_STEPS && !view.stepEdit ? stepForm(g) : ''}
      <p class="small muted">${L('Steps with a date also appear in your weekly plan.', 'தேதியுள்ள படிகள் உங்கள் வாரத் திட்டத்திலும் தோன்றும்.')} <button type="button" class="link-btn inline-link" data-go="week">${L('This week', 'இந்த வாரம்')} ›</button></p>
    </section>
    </div><div class="dsk-col">
    <section class="card glass" aria-labelledby="gFollowT"><div class="card-title"><span id="gFollowT">🔁 ${L('Weekly follow-up', 'வாராந்திர மீளாய்வு')}</span></div>
      ${g.followUp.weekly ? `<p class="small">${due ? L('This week’s review is due — look at the steps, tick what is done, and choose the next one.', 'இந்த வார மீளாய்வு நேரம் — படிகளைப் பார்த்து, முடிந்ததைக் குறித்து, அடுத்ததைத் தேர்ந்தெடுங்கள்.') : `${L('Next review', 'அடுத்த மீளாய்வு')}: ${esc(L(...WEEKDAYS[g.followUp.weekday]))}`}</p>
        <div class="btn-row">${rv ? remindBtn({ title: `${L('Goal review', 'இலக்கு மீளாய்வு')}: ${g.title}`, at: rv, label: L('Remind me', 'நினைவூட்டு') }) : ''}
        <button type="button" class="chip-btn" id="gReviewed">✓ ${L('Reviewed this week', 'இந்த வாரம் பார்த்தேன்')}</button></div>`
    : `<p class="small muted">${L('Weekly review is off. Turn it on in Edit.', 'வார மீளாய்வு அணைக்கப்பட்டுள்ளது. திருத்து-வில் இயக்கலாம்.')}</p>`}
    </section>
    ${tpl.question ? `<section class="card glass goal-opt" aria-labelledby="gOptT"><div class="card-title"><span id="gOptT">🌿 ${L('Good periods before your deadline', 'காலக்கெடுவுக்கு முன் நல்ல காலங்கள்')}</span><span class="tag warn">${L('optional', 'விருப்பம்')}</span></div>
      <div id="gPeriodsBox">${periodsHtml(g)}</div></section>` : ''}
    <section class="card glass" aria-labelledby="gToolsT"><div class="card-title"><span id="gToolsT">🧭 ${L('Helpful tools', 'உதவும் கருவிகள்')}</span></div>
      <div class="btn-row goal-links">${links.map((id) => (id === 'chat'
    ? `<button type="button" class="chip-btn" data-go="chat" data-param='${esc(JSON.stringify({ q: askText(g, ta() ? 'ta' : 'en') }))}'>💬 ${L(...LINKS.chat)}</button>`
    : `<button type="button" class="chip-btn" data-go="${id}">${L(...LINKS[id])}</button>`)).join('')}</div></section>
    <section class="card glass" aria-label="${esc(L('Manage goal', 'இலக்கை நிர்வகி'))}">
      <div class="btn-row">
        <button type="button" class="chip-btn" id="gEdit">✏️ ${L('Edit', 'திருத்து')}</button>
        <button type="button" class="chip-btn" id="gDone">${g.status === 'done' ? `↺ ${L('Mark active again', 'மீண்டும் நடப்பு')}` : `🏁 ${L('Mark achieved', 'நிறைவேறியது')}`}</button>
        <button type="button" class="chip-btn" id="gDelete">🗑️ ${L('Delete goal', 'இலக்கை நீக்கு')}</button>
      </div>
      ${consentLine()}
    </section>
    </div></div>`;
}

// ---------------------------------------------------------------- render + wiring
function render(sec, params = {}) {
  if (params.open) view = { mode: 'detail', id: params.open, tpl: null, stepEdit: null, periods: null };
  else if (params.new) view = { mode: 'list', id: null, tpl: null, stepEdit: null, periods: null };
  else if (params.edit) view = { mode: 'edit', id: params.edit, tpl: null, stepEdit: null, periods: null };
  else if (params.tpl) view = { mode: 'new', id: null, tpl: params.tpl, stepEdit: null, periods: null };
  if (params.open || params.new || params.edit || params.tpl) state.params = {};
  const s = loadGoals();
  const g = view.id ? s.goals.find((x) => x.id === view.id) : null;
  if ((view.mode === 'detail' || view.mode === 'edit') && !g) view = { mode: 'list', id: null, tpl: null, stepEdit: null, periods: null };
  if (view.mode === 'new' && (goalGate(s).locked || !canAddGoal(s))) view.mode = 'list';
  sec.innerHTML = view.mode === 'detail' ? detailHtml(g) : view.mode === 'edit' ? formHtml(g) : view.mode === 'new' ? formHtml(null, view.tpl) : listHtml(s);
  wire(sec);
  pullGoals(sec);
}
const rerender = (sec) => render(sec, {});
const swap = (sec, next) => { view = { ...view, ...next }; rerender(sec); window.scrollTo?.({ top: 0 }); };

function wire(sec) {
  $$('[data-open]', sec).forEach((b) => b.addEventListener('click', () => swap(sec, { mode: 'detail', id: b.dataset.open, stepEdit: null, periods: null })));
  $$('[data-tpl]', sec).forEach((b) => b.addEventListener('click', () => swap(sec, { mode: 'new', tpl: b.dataset.tpl })));
  // The sub-header back button goes to 'goals': from a detail / form, show the list again.
  $$('[data-back="goals"]', sec).forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); swap(sec, { mode: 'list', id: null, stepEdit: null }); }, { capture: true }));

  const form = $('#goalForm', sec);
  if (form && $('#gTitle', sec)) {
    $('#gCancel', sec).addEventListener('click', () => swap(sec, view.mode === 'edit' ? { mode: 'detail' } : { mode: 'list' }));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const personId = $('#gPerson', sec)?.value || null;
      const input = {
        template: view.mode === 'edit' ? undefined : view.tpl, title: $('#gTitle', sec).value, personId, deadline: $('#gDeadline', sec).value || null,
        constraints: $('#gCons', sec).value, notes: $('#gNotes', sec).value,
        followUp: { weekly: $('#gWeekly', sec).checked, weekday: Number($('#gWeekday', sec).value) }, lang: ta() ? 'ta' : 'en',
      };
      const opts = { profile: profileOf(personId), today: today() };
      const s = loadGoals();
      const res = view.mode === 'edit' ? updateGoal(s, view.id, input, opts) : createGoal(s, input, { ...opts, max: goalGate(s).locked ? 0 : undefined });
      if (!res.ok) {
        const msg = res.limit ? L('Your free goal is already in use — see the plans to save more.', 'உங்கள் இலவச இலக்கு ஏற்கனவே உள்ளது — மேலும் சேமிக்கத் திட்டங்களைப் பாருங்கள்.') : res.errors.map((x) => bi(x)).join(' ');
        $('#gErr', sec).textContent = msg;
        toast(msg);
        return;
      }
      saveGoals(res.state);
      document.dispatchEvent(new CustomEvent('kj:task', { detail: 'goal_saved' }));
      toast(view.mode === 'edit' ? L('Updated', 'திருத்தப்பட்டது') : L('Goal saved on this phone', 'இலக்கு இந்தக் கைப்பேசியில் சேமிக்கப்பட்டது'));
      swap(sec, { mode: 'detail', id: res.goal.id, stepEdit: null, periods: null });
    });
    return;
  }
  if (view.mode !== 'detail') return;
  const id = view.id;
  const apply = (next, msg) => { saveGoals(next); if (msg) toast(msg); rerender(sec); };
  $$('[data-tick]', sec).forEach((c) => c.addEventListener('change', () => {
    if (c.checked) document.dispatchEvent(new CustomEvent('kj:task', { detail: 'goal_step' })); // value summary (this phone only)
    apply(toggleStep(loadGoals(), id, c.dataset.tick));
  }));
  $$('[data-up]', sec).forEach((b) => b.addEventListener('click', () => apply(moveStep(loadGoals(), id, b.dataset.up, -1))));
  $$('[data-down]', sec).forEach((b) => b.addEventListener('click', () => apply(moveStep(loadGoals(), id, b.dataset.down, 1))));
  $$('[data-sedit]', sec).forEach((b) => b.addEventListener('click', () => { view.stepEdit = b.dataset.sedit; rerender(sec); $('#eStTitle', sec)?.focus(); }));
  $$('[data-scancel]', sec).forEach((b) => b.addEventListener('click', () => { view.stepEdit = null; rerender(sec); }));
  $$('[data-sdel]', sec).forEach((b) => b.addEventListener('click', () => {
    const st = loadGoals().goals.find((x) => x.id === id)?.steps.find((x) => x.id === b.dataset.sdel);
    if (!st || !confirm(L(`Delete the step “${st.title}”?`, `“${st.title}” படியை நீக்கவா?`))) return;
    apply(deleteStep(loadGoals(), id, st.id), L('Deleted', 'நீக்கப்பட்டது'));
  }));
  $$('[data-stepform]', sec).forEach((f) => f.addEventListener('submit', (e) => {
    e.preventDefault();
    const p = f.dataset.stepform ? 'e' : 'n';
    const step = { title: $(`#${p}StTitle`, f).value, date: $(`#${p}StDate`, f).value || null, time: $(`#${p}StTime`, f).value || null, kind: $(`#${p}StFixed`, f).checked ? 'deadline' : 'flexible' };
    if (!step.title.trim()) { toast(L('Please write the step', 'படியை எழுதுங்கள்')); $(`#${p}StTitle`, f).focus(); return; }
    const g = loadGoals().goals.find((x) => x.id === id);
    if (afterDeadline(g, step)) { toast(L('That date is after your deadline — the deadline comes first.', 'அந்தத் தேதி உங்கள் காலக்கெடுவுக்குப் பின் — காலக்கெடுவே முதன்மை.')); return; }
    if (f.dataset.stepform) { view.stepEdit = null; apply(editStep(loadGoals(), id, f.dataset.stepform, step), L('Updated', 'திருத்தப்பட்டது')); } else apply(addStep(loadGoals(), id, step), L('Added', 'சேர்க்கப்பட்டது'));
  }));
  $('#gReviewed', sec)?.addEventListener('click', () => apply(markReviewed(loadGoals(), id), L('Noted — see you next week', 'குறித்துக்கொண்டோம் — அடுத்த வாரம் சந்திப்போம்')));
  $('#gEdit', sec)?.addEventListener('click', () => swap(sec, { mode: 'edit' }));
  $('#gDone', sec)?.addEventListener('click', () => {
    const g = loadGoals().goals.find((x) => x.id === id);
    if (g.status === 'done' && goalGate(loadGoals()).locked) { toast(L('Your free goal is already in use — see the plans to keep more active.', 'உங்கள் இலவச இலக்கு ஏற்கனவே உள்ளது — மேலும் வைத்திருக்கத் திட்டங்களைப் பாருங்கள்.')); return; }
    const res = updateGoal(loadGoals(), id, { status: g.status === 'done' ? 'active' : 'done' }, { profile: profileOf(g.personId), today: today() });
    if (!res.ok) { toast(res.errors.map((x) => bi(x)).join(' ')); return; }
    if (g.status !== 'done') document.dispatchEvent(new CustomEvent('kj:task', { detail: 'goal_done' }));
    apply(res.state, g.status === 'done' ? L('Active again', 'மீண்டும் நடப்பில்') : L('Well done 🙏', 'வாழ்த்துகள் 🙏'));
  });
  $('#gDelete', sec)?.addEventListener('click', () => {
    const g = loadGoals().goals.find((x) => x.id === id);
    if (!confirm(L(`Delete the goal “${g.title}” and all its steps from this phone${state.user ? ' and your backup' : ''}?`, `“${g.title}” இலக்கையும் அதன் படிகளையும் இந்தக் கைப்பேசியிலிருந்து${state.user ? ', காப்பிலிருந்தும்' : ''} நீக்கவா?`))) return;
    saveGoals(deleteGoal(loadGoals(), id));
    toast(L('Goal deleted', 'இலக்கு நீக்கப்பட்டது'));
    swap(sec, { mode: 'list', id: null });
  });
  $('#gPeriods', sec)?.addEventListener('click', () => {
    const g = loadGoals().goals.find((x) => x.id === id);
    const person = personOf(g.personId);
    let chart = null; try { chart = person ? chartOf(person) : null; } catch { chart = null; }
    const res = goodPeriods(g, chart, { now: new Date(), tz: tz(), profile: profileOf(g.personId) });
    view.periods = { id, res };
    $('#gPeriodsBox', sec).innerHTML = periodsHtml(g);
  });
}

registerScreen('goals', { render, parent: 'home' });
