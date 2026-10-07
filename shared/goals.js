// Goals workspace (என் இலக்குகள் — owner requirement §8a): an optional saved workspace for one goal of the person
// or a family member — marriage preparation, a temple journey, career / job preparation, studies, a house, a
// simple health routine, or anything else. Pure: no DOM, no storage; runs on the phone and in tests.
//
// Rules kept here so every screen follows them:
//  • Practical steps first. Each template starts with a plain checklist the person can correct, reorder or delete.
//  • A real deadline always comes first. Chart-linked "good periods" are OPTIONAL, deterministic (Vimshottari
//    dasa–bhukti from shared/predict.js) and are clipped so that they never run past the deadline.
//  • No fear: no "bad period" warnings, no pressure — only a plain count of days left.
//  • Age guard: marriage, career and property goals are not offered for a minor (shared/age-guard.js topicAllowed).
//  • Privacy: the screen stores the goals on the phone; shared/sync-policy.js backs them up only with consent and
//    never for a private profile.
import { predictEvent, PREDICT_DISCLAIMER } from './predict.js';
import { topicAllowed } from './age-guard.js';
import { shareableGoals } from './sync-policy.js';

export { shareableGoals };

const T = (en, ta) => ({ en, ta });
const DAY = 86400000;
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const HM = /^([01]\d|2[0-3]):[0-5]\d$/;
const clean = (s, n) => String(s ?? '').replace(/[\u0000-\u0008\u000b-\u001f]/g, '').replace(/[ \t]+/g, ' ').trim().slice(0, n);
const uid = () => Math.random().toString(36).slice(2, 10);

export const MAX_GOALS = 20;
export const MAX_STEPS = 30;
/** Free users (when billing is enforced) keep one active goal — the value before payment. */
export const FREE_ACTIVE_GOALS = 1;

/**
 * Goal templates. topic: the age-guard topic (null = open to every age). question: the shared/predict.js question
 * used for the optional good periods (null = none). links: tools the goal screen offers.
 */
export const TEMPLATES = Object.freeze([
  { id: 'marriage', icon: '💐', topic: 'marriage', question: 'marriage', ...T('Marriage preparation', 'திருமண ஏற்பாடு'),
    links: ['porutham', 'couple', 'muhurtham', 'chat'],
    steps: [
      T('Talk with the family about expectations and timing', 'எதிர்பார்ப்பு, காலம் பற்றி குடும்பத்துடன் பேசுங்கள்'),
      T('Collect both horoscopes (birth date, time, place)', 'இருவரின் ஜாதகங்களையும் சேகரியுங்கள் (பிறந்த தேதி, நேரம், இடம்)'),
      T('Check porutham (star match)', 'பொருத்தம் பாருங்கள்'),
      T('Shortlist muhurtham dates', 'முகூர்த்த நாட்களைத் தேர்ந்தெடுங்கள்'),
      T('Fix the venue and the budget', 'மண்டபம், செலவுத் திட்டம் முடிவு செய்யுங்கள்'),
      T('Invitations and guest list', 'அழைப்பிதழ், விருந்தினர் பட்டியல்'),
    ] },
  { id: 'journey', icon: '🛕', topic: null, question: null, ...T('Temple journey', 'கோவில் பயணம்'),
    links: ['journey', 'temples', 'muhurtham', 'chat'],
    steps: [
      T('Choose the dates (leave, school holidays)', 'தேதிகளைத் தேர்ந்தெடுங்கள் (விடுப்பு, பள்ளி விடுமுறை)'),
      T('Set the budget', 'செலவுத் தொகையை முடிவு செய்யுங்கள்'),
      T('Plan the journey — temples, route and timings', 'பயணத் திட்டம் — கோவில்கள், வழி, நேரங்கள்'),
      T('Book travel and stay yourself', 'பயணம், தங்குமிடத்தை நீங்களே முன்பதிவு செய்யுங்கள்'),
      T('Pack pooja items and medicines', 'பூஜைப் பொருட்கள், மருந்துகளை எடுத்து வையுங்கள்'),
    ] },
  { id: 'career', icon: '💼', topic: 'career', question: 'job', ...T('Career / job preparation', 'வேலை / தொழில் தயாரிப்பு'),
    links: ['life', 'ask', 'chat'],
    steps: [
      T('Update your CV', 'உங்கள் சுயவிவரத்தை (CV) புதுப்பியுங்கள்'),
      T('List the jobs to apply for', 'விண்ணப்பிக்க வேண்டிய வேலைகளைப் பட்டியலிடுங்கள்'),
      T('Send the applications', 'விண்ணப்பங்களை அனுப்புங்கள்'),
      T('Prepare for interviews', 'நேர்காணலுக்குத் தயாராகுங்கள்'),
      T('Follow up with the companies', 'நிறுவனங்களிடம் தொடர்ந்து விசாரியுங்கள்'),
    ] },
  { id: 'education', icon: '🎓', topic: 'education', question: 'education', ...T('Studies / exam', 'படிப்பு / தேர்வு'),
    links: ['ask', 'chat'],
    steps: [
      T('Note the exam or application date', 'தேர்வு / விண்ணப்பத் தேதியைக் குறியுங்கள்'),
      T('Make a study timetable', 'படிப்பு அட்டவணை தயாரியுங்கள்'),
      T('Finish the syllabus once', 'பாடத்திட்டத்தை ஒருமுறை முடியுங்கள்'),
      T('Practise old question papers', 'பழைய வினாத்தாள்களைப் பயிற்சி செய்யுங்கள்'),
      T('Keep documents and hall ticket ready', 'ஆவணங்கள், நுழைவுச் சீட்டை தயாராக வையுங்கள்'),
    ] },
  { id: 'house', icon: '🏡', topic: 'property', question: 'house', ...T('House / property', 'வீடு / சொத்து'),
    links: ['muhurtham', 'ask', 'chat'],
    steps: [
      T('Decide the budget and the loan amount', 'செலவு, கடன் தொகையை முடிவு செய்யுங்கள்'),
      T('Shortlist areas and visit houses', 'இடங்களைத் தேர்ந்து வீடுகளைப் பாருங்கள்'),
      T('Check documents with a lawyer', 'ஆவணங்களை வழக்கறிஞரிடம் சரிபாருங்கள்'),
      T('Arrange the loan / payment', 'கடன் / பணத்தை ஏற்பாடு செய்யுங்கள்'),
      T('Registration and griha pravesam date', 'பத்திரப் பதிவு, கிரகப் பிரவேச நாள்'),
    ] },
  { id: 'health', icon: '🌿', topic: null, question: null, ...T('Health routine (daily habits)', 'ஆரோக்கியப் பழக்கம் (தினசரி)'),
    links: ['health', 'chat'], habitsOnly: true,
    steps: [
      T('Choose one simple habit (walk, sleep time, water)', 'ஒரு எளிய பழக்கத்தைத் தேர்ந்தெடுங்கள் (நடை, தூக்க நேரம், தண்ணீர்)'),
      T('Fix a daily time for it', 'அதற்கு ஒரு தினசரி நேரம் வையுங்கள்'),
      T('Keep it for one week and note how it went', 'ஒரு வாரம் தொடர்ந்து செய்து குறித்து வையுங்கள்'),
      T('Ask your doctor before any change in medicine or diet', 'மருந்து / உணவு மாற்றத்துக்கு முன் மருத்துவரைக் கேளுங்கள்'),
    ] },
  { id: 'custom', icon: '🎯', topic: null, question: null, ...T('Other goal', 'வேறு இலக்கு'),
    links: ['chat'],
    steps: [
      T('Write the first small step', 'முதல் சிறிய படியை எழுதுங்கள்'),
    ] },
]);
export const templateById = (id) => TEMPLATES.find((t) => t.id === id) || TEMPLATES[TEMPLATES.length - 1];

export const HEALTH_NOTE = T('Daily habits only — not medical advice. Follow your doctor for any treatment.',
  'தினசரிப் பழக்கங்கள் மட்டும் — மருத்துவ ஆலோசனை அல்ல. சிகிச்சைக்கு உங்கள் மருத்துவரைப் பின்பற்றுங்கள்.');
export const OPTIONAL_PERIODS_NOTE = T('Optional — traditional good periods from the birth chart. Your real deadline always comes first; nothing here moves it.',
  'விருப்பம் மட்டும் — பிறப்பு ஜாதகப்படி பாரம்பரிய நல்ல காலங்கள். உங்கள் உண்மையான கெடுவே முதன்மை; இது அதை மாற்றாது.');
export const PERIODS_BASIS = T('Basis: Vimshottari dasa–bhukti of the birth chart and Jupiter/Saturn transits, only within your deadline.',
  'அடிப்படை: பிறப்பு ஜாதகத்தின் விம்சோத்தரி தசா–புக்தி, குரு/சனி கோசாரம் — உங்கள் கெடுவுக்குள் மட்டும்.');

// ---------------------------------------------------------------- dates
const toIso = (ms) => new Date(ms).toISOString().slice(0, 10);
const isoMs = (iso) => Date.parse(`${iso}T00:00:00Z`);
/** Today's civil date at a UTC offset (hours). */
export const todayAt = (now = new Date(), tz = 5.5) => toIso(new Date(now).getTime() + Number(tz ?? 5.5) * 3600000);
/** Whole days from today to the deadline (negative once it has passed); null without a deadline. */
export function daysLeft(goal, today) {
  if (!goal?.deadline || !ISO.test(today || '')) return null;
  return Math.round((isoMs(goal.deadline) - isoMs(today)) / DAY);
}
/** A plain, pressure-free line about the deadline. */
export function deadlineText(goal, today) {
  const n = daysLeft(goal, today);
  if (n == null) return T('No deadline set', 'கெடு வைக்கவில்லை');
  if (n > 1) return T(`${n} days to your deadline`, `உங்கள் கெடுவுக்கு ${n} நாட்கள்`);
  if (n === 1) return T('Deadline tomorrow', 'கெடு நாளை');
  if (n === 0) return T('Deadline today', 'கெடு இன்று');
  return T('The deadline date has passed — you can change it', 'கெடு தேதி கடந்துவிட்டது — நீங்கள் மாற்றலாம்');
}

// ---------------------------------------------------------------- stored state
/** The stored workspace: goals plus ids deleted by the person (so a backup copy never brings them back). */
export const emptyGoals = () => ({ v: 1, goals: [], deleted: [] });
const norm = (s) => ({ ...emptyGoals(), ...(s || {}), goals: Array.isArray(s?.goals) ? s.goals : [], deleted: Array.isArray(s?.deleted) ? s.deleted : [] });

/** Clean one step. kind 'deadline' = a real date that stays fixed in the weekly plan; 'flexible' otherwise. */
export function normaliseStep(s = {}) {
  const title = clean(s.title, 120).replace(/\n/g, ' ');
  if (!title) return null;
  const date = typeof s.date === 'string' && ISO.test(s.date) ? s.date : null;
  const time = date && typeof s.time === 'string' && HM.test(s.time) ? s.time : null;
  return { id: String(s.id || uid()).slice(0, 24), title, done: Boolean(s.done), date, time, kind: date && s.kind === 'deadline' ? 'deadline' : 'flexible' };
}

/** Age profile of the goal's person: { band, minor, adult, unknown } (shared/age-guard.js ageProfile). */
export function templateAllowed(templateId, profile) {
  const t = templateById(templateId);
  return !t.topic || topicAllowed(t.topic, profile);
}
/** Templates that may be offered for this person. */
export const templatesFor = (profile) => TEMPLATES.filter((t) => templateAllowed(t.id, profile));

/**
 * Validate a goal input. opts: { profile, today, editing }. Returns a list of { field, en, ta } (empty = fine).
 * A new goal's deadline may not be in the past; an edit may keep an old one (the person corrects it later).
 */
export function validateGoal(input = {}, { profile = null, today = null, editing = false } = {}) {
  const errs = [];
  const tpl = templateById(input.template);
  if (!clean(input.title, 120)) errs.push({ field: 'title', ...T('Please give the goal a short name', 'இலக்குக்கு ஒரு சிறு பெயர் தாருங்கள்') });
  if (input.deadline != null && input.deadline !== '' && !ISO.test(String(input.deadline))) errs.push({ field: 'deadline', ...T('Please choose a valid date', 'சரியான தேதியைத் தேர்ந்தெடுங்கள்') });
  else if (input.deadline && today && !editing && input.deadline < today) errs.push({ field: 'deadline', ...T('The deadline cannot be in the past', 'கெடு கடந்த தேதியாக இருக்க முடியாது') });
  if (!templateAllowed(tpl.id, profile)) {
    errs.push({ field: 'person', ...T(`${tpl.en} is only for people aged 18 and over (with a date of birth saved).`, `${tpl.ta} 18 வயதுக்கு மேற்பட்டவர்களுக்கு மட்டும் (பிறந்த தேதி சேமித்திருக்க வேண்டும்).`) });
  }
  return errs;
}

function buildGoal(input, prev = null, now = new Date()) {
  const tpl = templateById(input.template ?? prev?.template);
  const fu = input.followUp ?? prev?.followUp ?? { weekly: true, weekday: 0 };
  const g = {
    id: prev?.id || String(input.id || `g${uid()}`).slice(0, 24),
    template: tpl.id,
    title: clean(input.title ?? prev?.title, 120).replace(/\n/g, ' '),
    personId: (input.personId === undefined ? prev?.personId : input.personId) || null,
    deadline: (() => { const d = input.deadline === undefined ? prev?.deadline : input.deadline; return typeof d === 'string' && ISO.test(d) ? d : null; })(),
    constraints: clean(input.constraints ?? prev?.constraints ?? '', 500),
    notes: clean(input.notes ?? prev?.notes ?? '', 500),
    steps: (input.steps ?? prev?.steps ?? []).map(normaliseStep).filter(Boolean).slice(0, MAX_STEPS),
    followUp: { weekly: fu.weekly !== false, weekday: Number.isInteger(fu.weekday) && fu.weekday >= 0 && fu.weekday <= 6 ? fu.weekday : 0 },
    status: ['active', 'done'].includes(input.status ?? prev?.status) ? (input.status ?? prev?.status) : 'active',
    reviewedAt: input.reviewedAt ?? prev?.reviewedAt ?? null,
    createdAt: prev?.createdAt || new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString(),
  };
  return g;
}

/**
 * Create a goal from a template. input: { template, title, personId, deadline, constraints, notes, followUp }.
 * opts: { profile (the person's age profile), today, now, locked (free user with billing enforced) }.
 * Returns { ok, state, goal, errors, limit } — the input state is never changed.
 */
export function createGoal(state, input = {}, { profile = null, today = null, now = new Date(), locked = false, max = undefined } = {}) {
  const s = norm(state);
  const errors = validateGoal(input, { profile, today });
  if (errors.length) return { ok: false, state: s, goal: null, errors };
  if (!canAddGoal(s, { locked, max })) return { ok: false, state: s, goal: null, errors: [], limit: true };
  const tpl = templateById(input.template);
  const steps = Array.isArray(input.steps) ? input.steps : tpl.steps.map((x, i) => ({ id: `s${i + 1}`, title: input.lang === 'en' ? x.en : x.ta }));
  const goal = buildGoal({ ...input, steps }, null, now);
  return { ok: true, state: { ...s, goals: [...s.goals, goal] }, goal, errors: [] };
}

/** Correct a goal (title, person, deadline, constraints, notes, follow-up, status). Re-validates the age gate. */
export function updateGoal(state, id, patch = {}, { profile = null, today = null, now = new Date() } = {}) {
  const s = norm(state);
  const prev = s.goals.find((g) => g.id === id);
  if (!prev) return { ok: false, state: s, errors: [{ field: 'id', ...T('Goal not found', 'இலக்கு கிடைக்கவில்லை') }] };
  patch = Object.fromEntries(Object.entries(patch || {}).filter(([k, v]) => v !== undefined && k !== 'template' && k !== 'id'));
  const merged = { template: prev.template, title: prev.title, deadline: prev.deadline, ...patch };
  const errors = validateGoal(merged, { profile, today, editing: true });
  if (errors.length) return { ok: false, state: s, errors };
  const goal = buildGoal({ ...patch, template: prev.template }, prev, now);
  return { ok: true, state: { ...s, goals: s.goals.map((g) => (g.id === id ? goal : g)) }, goal, errors: [] };
}

/** Delete a goal (and remember the id so an older backup never restores it). */
export function deleteGoal(state, id) {
  const s = norm(state);
  return { ...s, goals: s.goals.filter((g) => g.id !== id), deleted: [...new Set([...s.deleted, id])].slice(-200) };
}

function withGoal(state, goalId, fn, now = new Date()) {
  const s = norm(state);
  return { ...s, goals: s.goals.map((g) => (g.id === goalId ? { ...fn(g), updatedAt: new Date(now).toISOString() } : g)) };
}
/** Tick / untick a step. */
export const toggleStep = (state, goalId, stepId, now) => withGoal(state, goalId, (g) => ({ ...g, steps: g.steps.map((x) => (x.id === stepId ? { ...x, done: !x.done } : x)) }), now);
/** Add a step (refused when empty, when the goal already has MAX_STEPS, or when its date is after the deadline). */
export function addStep(state, goalId, step, now) {
  const st = normaliseStep(step);
  return withGoal(state, goalId, (g) => (!st || g.steps.length >= MAX_STEPS || afterDeadline(g, st) ? g : { ...g, steps: [...g.steps, st] }), now);
}
/** Correct a step's title, date, time or kind. An edit that empties it or moves it past the deadline is refused. */
export function editStep(state, goalId, stepId, patch, now) {
  return withGoal(state, goalId, (g) => ({ ...g, steps: g.steps.map((x) => { if (x.id !== stepId) return x; const y = normaliseStep({ ...x, ...patch, id: x.id }); return y && !afterDeadline(g, y) ? y : x; }) }), now);
}
export const deleteStep = (state, goalId, stepId, now) => withGoal(state, goalId, (g) => ({ ...g, steps: g.steps.filter((x) => x.id !== stepId) }), now);
/** Move a step up (-1) or down (+1). */
export function moveStep(state, goalId, stepId, dir, now) {
  return withGoal(state, goalId, (g) => {
    const i = g.steps.findIndex((x) => x.id === stepId);
    const j = i + (dir < 0 ? -1 : 1);
    if (i < 0 || j < 0 || j >= g.steps.length) return g;
    const steps = [...g.steps];
    [steps[i], steps[j]] = [steps[j], steps[i]];
    return { ...g, steps };
  }, now);
}
/** True when a dated step would fall after the goal's deadline (the deadline wins). */
export const afterDeadline = (goal, step) => Boolean(goal?.deadline && step?.date && step.date > goal.deadline);
/** Mark this week's review done. */
export const markReviewed = (state, goalId, now = new Date()) => withGoal(state, goalId, (g) => ({ ...g, reviewedAt: new Date(now).toISOString() }), now);

// ---------------------------------------------------------------- reading the workspace
/** Progress 0–100 (done steps / steps). */
export function progress(goal) {
  const n = goal?.steps?.length || 0;
  return n ? Math.round((goal.steps.filter((x) => x.done).length / n) * 100) : 0;
}
/** The first step not yet done (in the person's order), or null. */
export const nextStep = (goal) => goal?.steps?.find((x) => !x.done) || null;
export const activeGoals = (state) => norm(state).goals.filter((g) => g.status !== 'done');
/**
 * May another goal be started? max: active-goal limit from the plan (server entitlements.goalsMax; null = no
 * limit); locked: free user with billing enforced and no explicit max → FREE_ACTIVE_GOALS. Never above MAX_GOALS.
 */
export function canAddGoal(state, { locked = false, max = undefined } = {}) {
  const s = norm(state);
  if (s.goals.length >= MAX_GOALS) return false;
  const limit = Number.isInteger(max) ? max : locked ? FREE_ACTIVE_GOALS : null;
  return limit == null || activeGoals(s).length < limit;
}
/** The goal to show on Today: the active one with the nearest deadline (undated last), then the newest. */
export function topGoal(state) {
  const a = activeGoals(state);
  return [...a].sort((x, y) => (x.deadline || '9999').localeCompare(y.deadline || '9999') || String(y.updatedAt).localeCompare(String(x.updatedAt)))[0] || null;
}
/** Weekly follow-up: the next review date ('YYYY-MM-DD', on the chosen weekday, today or later). */
export function nextReview(goal, today) {
  if (!goal?.followUp?.weekly || !ISO.test(today || '')) return null;
  const wd = new Date(isoMs(today)).getUTCDay();
  const add = (goal.followUp.weekday - wd + 7) % 7;
  return toIso(isoMs(today) + add * DAY);
}
/** True when the weekly review is due (weekly follow-up on, not reviewed in the last 7 days, today is the day or later). */
export function reviewDue(goal, today) {
  if (!goal?.followUp?.weekly || goal.status === 'done' || !ISO.test(today || '')) return false;
  const last = goal.reviewedAt ? toIso(Date.parse(goal.reviewedAt)) : toIso(Date.parse(goal.createdAt || 0));
  if (isoMs(today) - isoMs(last) < 7 * DAY) return false;
  return new Date(isoMs(today)).getUTCDay() === goal.followUp.weekday || isoMs(today) - isoMs(last) >= 8 * DAY;
}

/**
 * Dated steps (not done) and each goal's own deadline, as weekly-plan tasks (shared/week-plan.js buildWeek goalSteps).
 * A step marked as a real deadline (and the goal deadline) is fixed; other dated steps are flexible.
 * profileOf(personId) → age profile: goals a minor may not have are never passed on.
 */
export function weekSteps(state, { lang = 'ta', profileOf = null } = {}) {
  const out = [];
  for (const g of activeGoals(state)) {
    const tpl = templateById(g.template);
    if (profileOf && !templateAllowed(tpl.id, profileOf(g.personId))) continue;
    for (const st of g.steps) {
      if (st.done || !st.date) continue;
      out.push({ id: st.id, goalId: g.id, title: st.title, date: st.date, time: st.time, type: st.kind === 'deadline' ? 'deadline' : 'flexible', topic: tpl.topic, goalTitle: g.title });
    }
    if (g.deadline) out.push({ id: 'deadline', goalId: g.id, title: `${g.title} — ${lang === 'en' ? 'deadline' : 'கெடு'}`, date: g.deadline, time: null, type: 'deadline', topic: tpl.topic, goalTitle: g.title });
  }
  return out;
}

/**
 * OPTIONAL good periods before the deadline, from the birth chart (deterministic: predictEvent with until = deadline).
 * Every window is clipped to [today, deadline]; none ends after the deadline. Returns
 * { available, reason?, windows: [{ start, end, md, ad, reasons }], optional: true, note, basis, disclaimer }.
 */
export function goodPeriods(goal, chart, { now = new Date(), tz = 5.5, profile = null } = {}) {
  const base = { optional: true, note: OPTIONAL_PERIODS_NOTE, basis: PERIODS_BASIS, disclaimer: PREDICT_DISCLAIMER, windows: [] };
  const tpl = templateById(goal?.template);
  if (!tpl.question) return { ...base, available: false, reason: 'no-question' };
  if (profile && !templateAllowed(tpl.id, profile)) return { ...base, available: false, reason: 'age' };
  if (!goal.deadline) return { ...base, available: false, reason: 'no-deadline' };
  if (!chart) return { ...base, available: false, reason: 'no-chart' };
  const today = todayAt(now, tz);
  if (goal.deadline < today) return { ...base, available: false, reason: 'past' };
  const from = new Date(now);
  // The deadline day ends at local midnight; nothing may run past it.
  const until = new Date(isoMs(goal.deadline) + DAY - Number(tz ?? 5.5) * 3600000);
  let res;
  try { res = predictEvent(chart, tpl.question, { from, years: 15, until }); } catch { return { ...base, available: false, reason: 'error' }; }
  if (res.needsBirthTime) return { ...base, available: false, reason: 'needs-birth-time', note2: res.birthTimeNote };
  const windows = (res.windows || [])
    .map((w) => ({ start: new Date(Math.max(+w.start, +from)), end: new Date(Math.min(+w.end, +until)), md: w.md, ad: w.ad, reasons: w.reasons || [] }))
    .filter((w) => w.end > w.start && w.end <= until)
    .sort((a, b) => a.start - b.start)
    .slice(0, 3)
    .map((w) => ({ ...w, start: w.start.toISOString(), end: w.end.toISOString(), from: toIso(+w.start + Number(tz ?? 5.5) * 3600000), to: toIso(+w.end - 1 + Number(tz ?? 5.5) * 3600000) })) // last local day inside the window;
  return { ...base, available: windows.length > 0, reason: windows.length ? null : 'none-before-deadline', windows };
}

/** A prefilled Ask Thunai question for the goal (no personal details beyond the goal itself). */
export function askText(goal, lang = 'ta') {
  const ns = nextStep(goal);
  if (lang === 'en') return `I am working on my goal "${goal.title}"${goal.deadline ? ` with a deadline of ${goal.deadline}` : ''}.${ns ? ` My next step is "${ns.title}".` : ''} What practical things should I keep in mind?`;
  return `என் இலக்கு "${goal.title}"${goal.deadline ? `, கெடு ${goal.deadline}` : ''}.${ns ? ` அடுத்த படி "${ns.title}".` : ''} நடைமுறையில் எதைக் கவனிக்க வேண்டும்?`;
}

// ---------------------------------------------------------------- backup helpers (used by shared/sync-policy.js)
/**
 * Merge account goals into this phone's after sign-in: newer updatedAt wins; ids deleted on either side stay
 * deleted; goals of profiles that are private on this phone keep the phone's copy only.
 */
export function mergeGoals(remote, local, { privateIds = new Set() } = {}) {
  const l = norm(local);
  const r = norm(remote);
  const deleted = new Set([...l.deleted, ...r.deleted]);
  const byId = new Map();
  for (const g of l.goals) if (!deleted.has(g.id)) byId.set(g.id, g);
  for (const g of shareableGoals(r.goals, privateIds)) {
    if (!g?.id || deleted.has(g.id)) continue;
    const mine = byId.get(g.id);
    if (mine && (mine.private || (mine.personId && privateIds.has(mine.personId)))) continue;
    if (!mine || String(g.updatedAt || '') > String(mine.updatedAt || '')) byId.set(g.id, g);
  }
  return { ...l, goals: [...byId.values()].slice(0, MAX_GOALS), deleted: [...deleted].slice(-200) };
}
