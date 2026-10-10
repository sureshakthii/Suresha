// Weekly plan (இந்த வாரத் திட்டம்) — a short 7-day plan under Today that combines the person's own tasks, family
// events and the observances they chose to follow. Pure: no DOM, no storage; runs on device and in tests.
//
// Four kinds of item, kept strictly apart:
//  • fixed       — the person's appointments and real deadlines, at the date/time they gave. Never moved, never
//                  re-timed, never "improved" by astrology. A deadline is always fixed.
//  • family      — star birthdays (shared/special.js, at the residence), birthdays, thivasam, saved reminders.
//  • observance  — only the vratham / festival types the person chose (Ekadasi, Pradosham, Sashti, …).
//  • optional    — good-time suggestions (Gowri nalla neram minus Rahu Kalam, Yamagandam and the person's fixed
//                  appointments) for tasks the person marked "flexible". Always labelled optional.
// Age guard: for a minor plan owner, adult-topic tasks are left out and observance lines carry no fasting advice.
import { offsetHoursAt } from './astro.js';
import { tamilDay, tamilDate } from './tamilcal.js';
import { natchathiraBirthdays, thivasamDates } from './special.js';
import { VRATHAM_TYPES, vrathamType } from './peyarchi.js';
import { todayPlan } from './today-plan.js';
import { isAdultTopic } from './age-guard.js';

const T = (en, ta) => ({ en, ta });
const DAY = 86400000;
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const HM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** The kinds of task a person can add. Appointments and deadlines are fixed; only flexible tasks get suggestions. */
export const TASK_TYPES = Object.freeze([
  { id: 'appointment', fixed: true, icon: '📌', ...T('Fixed appointment', 'நிலையான சந்திப்பு') },
  { id: 'deadline', fixed: true, icon: '⏳', ...T('Real deadline', 'உண்மையான காலக்கெடு') },
  { id: 'flexible', fixed: false, icon: '🌿', ...T('Flexible task', 'நெகிழ்வான வேலை') },
]);
const TYPE_IDS = new Set(TASK_TYPES.map((t) => t.id));
export const isFixedType = (type) => type === 'appointment' || type === 'deadline';

/** Observances the person may choose to follow (same groups as the Viratham screen). */
export const OBSERVANCES = VRATHAM_TYPES;
const OBS_IDS = new Set(OBSERVANCES.map((o) => o.id));

export const OPTIONAL_NOTE = T('Optional — only a traditional good time. Your fixed appointments and deadlines always come first.',
  'விருப்பம் மட்டும் — பாரம்பரிய நல்ல நேரம். உங்கள் நிலையான சந்திப்புகளும் காலக்கெடுகளும் எப்போதும் முதன்மை.');

// ---------------------------------------------------------------- dates
export const addDaysIso = (iso, n) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);
const tzOf = (loc, at) => (loc.zone ? offsetHoursAt(loc.zone, at) : Number(loc.tz ?? 5.5));
/** Local civil date ('YYYY-MM-DD') of an instant at loc. */
export function isoAt(at, loc) {
  const d = new Date(at);
  return new Date(d.getTime() + tzOf(loc, d) * 3600000).toISOString().slice(0, 10);
}
/** The instant of a local wall-clock time on a civil date at loc. */
export function instantAt(iso, hm, loc) {
  const [y, m, d] = iso.split('-').map(Number);
  const [h, mi] = (hm || '00:00').split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, h, mi);
  return new Date(guess - tzOf(loc, new Date(guess)) * 3600000);
}
const noonOf = (iso, loc) => instantAt(iso, '12:00', loc);
const hmAt = (at, loc) => { const d = new Date(at); return new Date(d.getTime() + tzOf(loc, d) * 3600000).toISOString().slice(11, 16); };

// ---------------------------------------------------------------- the stored plan (pure helpers)
/** An empty stored plan. */
export const emptyPlan = () => ({ v: 1, tasks: [], observances: [], consent: false, savedAt: null });

/** Clean one task: title (≤ 120 chars), date 'YYYY-MM-DD' or null, time 'HH:MM' or null, a known type. Null if unusable. */
export function normaliseTask(t = {}) {
  const title = String(t.title ?? '').replace(/\s+/g, ' ').trim().slice(0, 120);
  if (!title) return null;
  const type = TYPE_IDS.has(t.type) ? t.type : 'flexible';
  const date = typeof t.date === 'string' && ISO.test(t.date) ? t.date : null;
  if (isFixedType(type) && !date) return null; // an appointment or deadline needs its real date
  const time = typeof t.time === 'string' && HM.test(t.time) ? t.time : null;
  const out = { id: String(t.id || Math.random().toString(36).slice(2, 10)), title, type, date, time };
  if (t.topic) out.topic = String(t.topic).slice(0, 40);
  if (t.note) out.note = String(t.note).trim().slice(0, 200);
  return out;
}
/** Add a task; returns a new plan (the input is not changed). Invalid tasks are ignored. */
export function addTask(plan, task) {
  const t = normaliseTask(task);
  const p = { ...emptyPlan(), ...plan };
  return t ? { ...p, tasks: [...p.tasks.filter((x) => x.id !== t.id), t] } : p;
}
/** Correct a task (any of title/date/time/type/note); returns a new plan. An edit that makes it invalid is refused. */
export function editTask(plan, id, patch) {
  const p = { ...emptyPlan(), ...plan };
  return { ...p, tasks: p.tasks.map((x) => (x.id === id ? normaliseTask({ ...x, ...patch, id }) || x : x)) };
}
/** Delete one task; returns a new plan. */
export function deleteTask(plan, id) {
  const p = { ...emptyPlan(), ...plan };
  return { ...p, tasks: p.tasks.filter((x) => x.id !== id) };
}
/** Clear the week: removes tasks dated in [start, start + days) and undated flexible tasks. Chosen observances stay. */
export function clearWeek(plan, start, days = 7) {
  const p = { ...emptyPlan(), ...plan };
  const end = addDaysIso(start, days);
  return { ...p, tasks: p.tasks.filter((x) => x.date && (x.date < start || x.date >= end)) };
}
/** Set the chosen observances (unknown ids dropped). */
export function setObservances(plan, ids) {
  return { ...emptyPlan(), ...plan, observances: [...new Set((ids || []).filter((x) => OBS_IDS.has(x)))] };
}
/** Delete everything (the "you can delete anytime" promise). */
export const forgetPlan = () => emptyPlan();

// ---------------------------------------------------------------- age guard
// Words that make a task an adult matter (marriage, money, property, legal) when no topic was given.
const ADULT_WORDS = /\b(marriage|wedding|engagement|bride|groom|ponnu ?paarthal|loan|emi|invest\w*|stock|shares|property|land|registration|lawyer|court|salary|interview|business|contract|dating|date night)\b|திருமண|நிச்சய|பெண் பார்|கடன்|முதலீ|சொத்து|நிலம்|பத்திரப்|நீதிமன்ற|வழக்கு|சம்பள|வியாபார|ஒப்பந்த/i;
/** Is this task an adult matter (hidden from a minor's plan)? */
export function isAdultTask(t) {
  if (t?.topic && isAdultTopic(t.topic)) return true;
  return ADULT_WORDS.test(String(t?.title || ''));
}

// ---------------------------------------------------------------- good times
/** Subtract busy intervals from free intervals; all as { start: ms, end: ms }. */
function subtract(free, busy) {
  let out = free;
  for (const b of busy) {
    const next = [];
    for (const f of out) {
      if (b.end <= f.start || b.start >= f.end) { next.push(f); continue; }
      if (b.start > f.start) next.push({ start: f.start, end: b.start });
      if (b.end < f.end) next.push({ start: b.end, end: f.end });
    }
    out = next;
  }
  return out;
}
const MIN_WINDOW = 30 * 60000;
const BUSY_AFTER_FIXED = 60 * 60000; // a fixed appointment blocks an hour from its start
/**
 * Optional good-time windows on one day: Gowri nalla neram (daytime) minus Rahu Kalam, Yamagandam, Kuligai, the person's
 * timed fixed items (one hour each) and anything already past. Windows shorter than 30 minutes are dropped.
 */
export function goodWindows(td, { fixedAt = [], now = Date.now() } = {}) {
  const ms = (d) => new Date(d).getTime();
  let free = (td.nallaNeram || []).map((g) => ({ start: ms(g.start), end: ms(g.end) })).sort((a, b) => a.start - b.start);
  // merge touching slots
  free = free.reduce((acc, f) => { const l = acc[acc.length - 1]; if (l && f.start <= l.end) l.end = Math.max(l.end, f.end); else acc.push({ ...f }); return acc; }, []);
  const busy = [td.rahuKalam, td.yamagandam, td.guligai].filter(Boolean).map((k) => ({ start: ms(k.start), end: ms(k.end) }))
    .concat(fixedAt.map((t) => ({ start: ms(t), end: ms(t) + BUSY_AFTER_FIXED })))
    .concat([{ start: -Infinity, end: ms(now) }]);
  return subtract(free, busy).filter((w) => w.end - w.start >= MIN_WINDOW).map((w) => ({ start: new Date(w.start), end: new Date(w.end) }));
}

// ---------------------------------------------------------------- observance guidance
const strip = (s) => s.replace(/^As per your transits: /, '').replace(/^உங்கள் கோசாரப்படி: /, '');
function obsLine(festivals, age) {
  if (!festivals.length) return null;
  try {
    const it = todayPlan({ chart: null, snap: null, festivals, now: new Date(), age }).items[0];
    return it ? T(strip(it.text.en), strip(it.text.ta)) : null;
  } catch { return null; }
}
const FAST_RE = /fast|skip rice|avoid non-vegetarian|விரதம்|அரிசி உணவு|அசைவம்/i;

// ---------------------------------------------------------------- the week
/**
 * Build the 7-day plan.
 * @param {object} o
 *  start: Date | 'YYYY-MM-DD' (default today at loc) · loc: residence { lat, lon, tz, zone? } · days (7)
 *  now: Date · profile: age profile of the plan owner ({ minor, age })
 *  family: [{ id, name, relation?, birthStar?, birthTamilMonth?, dob? }]  (birthStar/month → star birthday; dob → birthday)
 *  ancestors: [{ id, name, date, time, lat, lon, tz }]  (thivasam)
 *  chosenObservances: ['ekadasi', 'pradosham', …] · tasks: stored tasks · reminders: [{ id, title, eventAt | alarmAt }]
 *  goalSteps: dated next steps of saved goals (shared/goals.js weekSteps) — [{ id, goalId, title, date, time?,
 *    type: 'deadline' | 'flexible', topic? }]. A deadline-type step is fixed; others get optional good times.
 *    Their items carry goalId (and no taskId: they are corrected on the goal screen, not here).
 * @returns {{ start, end, minor, days: [{ date, weekday, isToday, tamil, fixed, family, observances, optional, line }], hidden }}
 */
export function buildWeek(o = {}) {
  const loc = o.loc;
  if (!loc || !Number.isFinite(loc.lat) || !Number.isFinite(loc.lon)) throw new Error('buildWeek needs a residence loc');
  const now = o.now ? new Date(o.now) : new Date();
  const start = typeof o.start === 'string' && ISO.test(o.start) ? o.start : isoAt(o.start || now, loc);
  const nDays = Math.max(1, Math.min(14, o.days || 7));
  const end = addDaysIso(start, nDays - 1);
  const todayIso = isoAt(now, loc);
  const profile = o.profile || { minor: false, age: 30 };
  const minor = Boolean(profile.minor);
  const chosen = new Set((o.chosenObservances || []).filter((x) => OBS_IDS.has(x)));
  const goalTasks = (o.goalSteps || []).map((x) => {
    if (!x || !x.goalId) return null;
    // A step the person gave a clock time is an appointment at that time (kept fixed, never "optional good time").
    const t = normaliseTask({ id: `goal:${x.goalId}:${x.id}`, title: x.title, type: x.type === 'deadline' ? 'deadline' : x.time ? 'appointment' : 'flexible', date: x.date, time: x.time, topic: x.topic });
    return t && t.date ? { ...t, goalId: String(x.goalId) } : null; // only dated steps belong in a week
  }).filter(Boolean);
  const tasksIn = [...(o.tasks || []).map(normaliseTask).filter(Boolean), ...goalTasks];
  const tasks = minor ? tasksIn.filter((t) => !isAdultTask(t)) : tasksIn;
  const hidden = tasksIn.length - tasks.length;

  const isos = Array.from({ length: nDays }, (_, i) => addDaysIso(start, i));
  const days = isos.map((iso) => {
    const tz = tzOf(loc, noonOf(iso, loc));
    const td = tamilDay(noonOf(iso, loc), loc.lat, loc.lon, tz);
    return { date: iso, weekday: td.weekday, isToday: iso === todayIso, tamil: td.tamil, td, fixed: [], family: [], observances: [], optional: [], line: null };
  });
  const byDate = new Map(days.map((d) => [d.date, d]));

  // 1. Fixed: appointments and deadlines exactly as entered.
  for (const t of tasks) {
    if (!isFixedType(t.type) || !byDate.has(t.date)) continue;
    const at = t.time ? instantAt(t.date, t.time, loc) : null;
    byDate.get(t.date).fixed.push({
      id: `task:${t.id}`, taskId: t.goalId ? null : t.id, goalId: t.goalId || null, kind: 'fixed', type: t.type, title: t.title, date: t.date, time: t.time, at: at ? at.toISOString() : null,
      // A reminder instant: the time given, or 9 AM on the day for an all-day deadline.
      remindAt: (at || instantAt(t.date, '09:00', loc)).toISOString(), note: t.note || null,
    });
  }
  for (const d of days) d.fixed.sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));

  // 2. Family events.
  const weekMonths = new Set(days.map((d) => d.tamil.month));
  const famLoc = { lat: loc.lat, lon: loc.lon, tz: loc.tz, zone: loc.zone };
  for (const m of o.family || []) {
    if (!m || m.relation === 'organization') continue;
    const name = String(m.name || '').slice(0, 60);
    if (Number.isInteger(m.birthStar) && Number.isInteger(m.birthTamilMonth) && weekMonths.has(m.birthTamilMonth)) {
      try {
        const next = natchathiraBirthdays({ birthStar: m.birthStar, birthTamilMonth: m.birthTamilMonth, from: noonOf(start, loc), loc: famLoc, count: 1 })[0];
        if (next && byDate.has(next.date)) {
          byDate.get(next.date).family.push({ id: `star:${m.id}:${next.date}`, kind: 'family', type: 'star-birthday', person: m.id, name,
            title: T(`${name} — star birthday`, `${name} — நட்சத்திரப் பிறந்தநாள்`), date: next.date, remindAt: instantAt(next.date, '06:00', loc).toISOString() });
        }
      } catch { /* a chart the engine cannot place is skipped */ }
    }
    if (typeof m.dob === 'string' && ISO.test(m.dob)) {
      const md = m.dob.slice(5);
      for (const d of days) {
        const dmd = d.date.slice(5);
        const leapFallback = md === '02-29' && dmd === '02-28' && !byDate.has(`${d.date.slice(0, 4)}-02-29`);
        if (dmd !== md && !leapFallback) continue;
        const turns = Number(d.date.slice(0, 4)) - Number(m.dob.slice(0, 4));
        if (turns <= 0) continue;
        d.family.push({ id: `bday:${m.id}:${d.date}`, kind: 'family', type: 'birthday', person: m.id, name, turns,
          title: T(`${name} — birthday (${turns})`, `${name} — பிறந்தநாள் (${turns})`), date: d.date, remindAt: instantAt(d.date, '06:00', loc).toISOString() });
      }
    }
  }
  for (const a of o.ancestors || []) {
    if (!a?.date || !ISO.test(a.date)) continue;
    try {
      const aLoc = { lat: Number(a.lat ?? loc.lat), lon: Number(a.lon ?? loc.lon), tz: Number(a.tz ?? loc.tz) };
      const death = instantAt(a.date, HM.test(a.time || '') ? a.time : '12:00', aLoc);
      if (!weekMonths.has(tamilDate(death, aLoc.lat, aLoc.lon, aLoc.tz).month)) continue;
      const th = thivasamDates({ death, loc: aLoc, from: noonOf(start, loc), count: 1 });
      const x = (th.dates || th)[0];
      if (x && byDate.has(x.date)) {
        const name = String(a.name || '').slice(0, 60);
        byDate.get(x.date).family.push({ id: `thivasam:${a.id}:${x.date}`, kind: 'family', type: 'thivasam', name,
          title: minor ? T(`Remembering ${name}`, `${name} — நினைவு நாள்`) : T(`Thivasam — ${name}`, `திவசம் — ${name}`), date: x.date,
          remindAt: instantAt(x.date, '06:00', loc).toISOString() });
      }
    } catch { /* skip */ }
  }
  // Saved reminders (remind.js) whose event falls this week — unless it is a reminder for one of the week's own tasks.
  const taskKeys = new Set(tasks.map((t) => `${t.title}|${t.date}`));
  for (const r of o.reminders || []) {
    const when = r.eventAt || r.alarmAt;
    if (!when || Number.isNaN(new Date(when).getTime())) continue;
    const iso = isoAt(when, loc);
    if (!byDate.has(iso) || taskKeys.has(`${r.title}|${iso}`)) continue;
    if (minor && isAdultTask(r)) continue;
    byDate.get(iso).family.push({ id: `rem:${r.id}`, kind: 'family', type: 'reminder', title: String(r.title || '').slice(0, 120), date: iso,
      time: hmAt(when, loc), at: new Date(when).toISOString() });
  }

  // 3. Observances the person chose.
  for (const d of days) {
    const seen = new Set();
    const hits = [];
    for (const f of d.td.festivals || []) {
      const type = vrathamType(f);
      let id = chosen.has(type) ? type : null;
      // A named festival of a chosen kind ("Mahalaya Amavasai" for Amavasai) counts too.
      if (!id && f.kind === 'festival') id = OBSERVANCES.find((x) => chosen.has(x.id) && x.match.some((mm) => f.en.includes(mm.split(' ')[0])))?.id || null;
      if (!id || seen.has(f.en)) continue;
      seen.add(f.en);
      hits.push(f);
      const ob = OBSERVANCES.find((x) => x.id === id);
      d.observances.push({ id: `obs:${d.date}:${f.en}`, kind: 'observance', type: id, icon: ob?.icon || '🙏', title: T(f.en, f.ta), date: d.date,
        remindAt: instantAt(d.date, '05:30', loc).toISOString() });
    }
    const line = obsLine(hits, minor ? Math.min(profile.age ?? 12, 13) : (profile.age ?? 30));
    d.line = line && minor && (FAST_RE.test(line.en) || FAST_RE.test(line.ta))
      ? T('A simple prayer is enough — children need not fast.', 'எளிய பிரார்த்தனை போதும் — குழந்தைகள் விரதம் இருக்கத் தேவையில்லை.')
      : line;
  }

  // 4. Optional good times — flexible tasks only. Fixed items are inputs (busy), never outputs.
  const windowsOf = (d) => goodWindows(d.td, { fixedAt: d.fixed.filter((x) => x.at).map((x) => x.at), now });
  for (const t of tasks.filter((x) => x.type === 'flexible')) {
    if (t.date && !byDate.has(t.date)) continue;
    let day = t.date ? byDate.get(t.date) : null;
    let wins = day ? windowsOf(day) : [];
    if (!day) { // no preferred day: the first day of the week with a clear good time
      for (const d of days) { const w = windowsOf(d); if (w.length) { day = d; wins = w; break; } }
      if (!day) day = days[0];
    }
    day.optional.push({
      id: `opt:${t.id}`, taskId: t.goalId ? null : t.id, goalId: t.goalId || null, kind: 'optional', optional: true, type: 'flexible', title: t.title, date: day.date, preferred: t.date,
      windows: wins.slice(0, 2).map((w) => ({ start: w.start.toISOString(), end: w.end.toISOString(), from: hmAt(w.start, loc), to: hmAt(w.end, loc) })),
      label: OPTIONAL_NOTE,
    });
  }

  for (const d of days) {
    d.rahuKalam = d.td.rahuKalam ? { start: new Date(d.td.rahuKalam.start).toISOString(), end: new Date(d.td.rahuKalam.end).toISOString() } : null;
    d.yamagandam = d.td.yamagandam ? { start: new Date(d.td.yamagandam.start).toISOString(), end: new Date(d.td.yamagandam.end).toISOString() } : null;
    delete d.td;
  }
  return { start, end, today: todayIso, minor, hidden, days };
}

/** Upcoming items of a built week (fixed, family, observances), soonest first — for the Today card. */
export function nextItems(week, { now = new Date(), limit = 3, loc = null } = {}) {
  const nowMs = new Date(now).getTime();
  const out = [];
  for (const d of week.days) {
    if (d.date < week.today) continue;
    for (const x of [...d.fixed, ...d.family, ...d.observances]) {
      if (x.at && new Date(x.at).getTime() < nowMs) continue;
      out.push(x);
    }
    for (const x of d.optional) out.push(x);
  }
  const rank = { fixed: 0, family: 1, observance: 2, optional: 3 };
  out.sort((a, b) => a.date.localeCompare(b.date) || rank[a.kind] - rank[b.kind] || (a.time || '').localeCompare(b.time || ''));
  return out.slice(0, limit);
}

/**
 * Plain-text plan for sharing. Only the person's own items and chosen observances; family members' events are
 * included only when includeFamily is true (the person confirms they may share them).
 */
export function weekText(week, { lang = 'ta', includeFamily = false, title = null } = {}) {
  const tx = (x) => (typeof x === 'string' ? x : lang === 'ta' ? x.ta : x.en);
  const lines = [title || (lang === 'ta' ? 'இந்த வாரத் திட்டம்' : "This week's plan")];
  for (const d of week.days) {
    const rows = [];
    for (const x of d.fixed) rows.push(`  ${x.type === 'deadline' ? '⏳' : '📌'} ${x.time ? `${x.time} ` : ''}${x.title}${x.type === 'deadline' ? (lang === 'ta' ? ' (காலக்கெடு)' : ' (deadline)') : ''}`);
    if (includeFamily) for (const x of d.family) rows.push(`  👪 ${tx(x.title)}`);
    for (const x of d.observances) rows.push(`  ${x.icon} ${tx(x.title)}`);
    for (const x of d.optional) rows.push(`  🌿 ${x.title}${x.windows[0] ? ` — ${lang === 'ta' ? 'விருப்ப நேரம்' : 'optional good time'} ${x.windows[0].from}–${x.windows[0].to}` : ''}`);
    if (!rows.length) continue;
    lines.push(`${d.date} · ${tx(d.weekday)}`, ...rows);
  }
  return lines.join('\n');
}
