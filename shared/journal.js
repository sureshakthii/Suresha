// Thunai diary — "நல்லது நடந்தது" (pure: no DOM, no storage; public/screens-journal.js keeps it in localStorage).
//
// Honest by design:
//   • Every entry is the person's OWN mark ("this helped", "it happened ✓", "I did this remedy") with their own words.
//   • Counts, streaks and the monthly reflection count only the person's own entries and app-open days — no
//     comparisons with other people, no invented numbers, and nothing claims the app or a remedy caused an event.
//   • Streaks are gentle: a missed day is never shown as a loss; only days used and the best run are shown.
//   • Private on the phone. It leaves the phone only through the account backup, with the backup consent AND the
//     separate diary switch on (shared/sync-policy.js shareableJournal) — never entries of a private profile.
const DAY = 86400000;
const T = (en, ta) => ({ en, ta });

export const JOURNAL_KEY = 'kj_journal';
export const JOURNAL_VERSION = 1;
/** What a mark means. */
export const KINDS = Object.freeze({
  helped: { icon: '🙏', ...T('This helped', 'இது உதவியது') },
  happened: { icon: '✓', ...T('It happened', 'இது நடந்தது') },
  remedy: { icon: '🪔', ...T('I did this', 'இதைச் செய்தேன்') },
  good: { icon: '🌼', ...T('A good thing', 'நல்லது நடந்தது') },
});
export const KIND_IDS = Object.keys(KINDS);
const MAX_ENTRIES = 1000;
const MAX_DAYS = 800;
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const clip = (s, n) => String(s ?? '').replace(/[\u0000-\u0008\u000b-\u001f]/g, '').trim().slice(0, n);

export const emptyJournal = () => ({ v: JOURNAL_VERSION, entries: [], deleted: [], days: [], firstOpen: null, prompt: { lastAt: null, never: false }, seen: {}, dismissed: {} });

/** Normalise a stored journal (anything malformed is dropped, never thrown). */
export function normaliseJournal(raw) {
  const j = emptyJournal();
  if (!raw || typeof raw !== 'object') return j;
  j.entries = (Array.isArray(raw.entries) ? raw.entries : []).map(normaliseEntry).filter(Boolean).slice(-MAX_ENTRIES);
  j.deleted = (Array.isArray(raw.deleted) ? raw.deleted : []).filter((x) => typeof x === 'string').slice(-300);
  j.days = [...new Set((Array.isArray(raw.days) ? raw.days : []).filter((d) => ISO.test(d)))].sort().slice(-MAX_DAYS);
  j.firstOpen = ISO.test(raw.firstOpen || '') ? raw.firstOpen : j.days[0] || null;
  j.prompt = { lastAt: typeof raw.prompt?.lastAt === 'string' ? raw.prompt.lastAt : null, never: raw.prompt?.never === true };
  j.seen = raw.seen && typeof raw.seen === 'object' && !Array.isArray(raw.seen) ? { ...raw.seen } : {};
  j.dismissed = raw.dismissed && typeof raw.dismissed === 'object' && !Array.isArray(raw.dismissed) ? { ...raw.dismissed } : {};
  return j;
}

/** One entry: { id, at, date, kind, source, title, note, personId, private, ref }. */
export function normaliseEntry(e) {
  if (!e || typeof e !== 'object') return null;
  const at = new Date(e.at);
  if (Number.isNaN(at.getTime())) return null;
  const kind = KIND_IDS.includes(e.kind) ? e.kind : 'good';
  const id = clip(e.id, 40);
  const date = ISO.test(e.date || '') ? e.date : at.toISOString().slice(0, 10);
  const title = clip(e.title, 160);
  const note = clip(e.note, 600);
  if (!id || (!title && !note)) return null;
  const out = { id, at: at.toISOString(), date, kind, source: clip(e.source || 'diary', 30), title, note };
  if (e.personId) out.personId = clip(e.personId, 64);
  if (e.private === true) out.private = true;
  if (e.ref) out.ref = clip(e.ref, 80);
  return out;
}

const newId = (now) => `j${now.getTime().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Add a mark. Returns the new journal (the input is not changed) and the entry. */
export function addEntry(j, e, { now = new Date(), date = null } = {}) {
  const base = normaliseJournal(j);
  const entry = normaliseEntry({ ...e, id: e.id || newId(now), at: e.at || now.toISOString(), date: date || e.date });
  if (!entry) return { journal: base, entry: null };
  base.entries = [...base.entries.filter((x) => x.id !== entry.id), entry].slice(-MAX_ENTRIES);
  return { journal: base, entry };
}
/** Change the note / kind / title of an entry. */
export function editEntry(j, id, patch = {}) {
  const base = normaliseJournal(j);
  base.entries = base.entries.map((x) => (x.id === id ? normaliseEntry({ ...x, ...patch, id: x.id, at: x.at }) || x : x));
  return base;
}
/** Delete an entry (remembered as deleted so a backup copy does not bring it back). */
export function deleteEntry(j, id) {
  const base = normaliseJournal(j);
  base.entries = base.entries.filter((x) => x.id !== id);
  base.deleted = [...base.deleted.filter((x) => x !== id), id].slice(-300);
  return base;
}
/** Forget everything (Settings → Clear diary). */
export const clearJournal = () => emptyJournal();

/** Record that the app was opened on a local date (for the gentle "days with Thunai"). */
export function recordOpen(j, iso) {
  const base = normaliseJournal(j);
  if (!ISO.test(iso)) return base;
  if (!base.days.includes(iso)) base.days = [...base.days, iso].sort().slice(-MAX_DAYS);
  if (!base.firstOpen || iso < base.firstOpen) base.firstOpen = iso;
  return base;
}

const prevIso = (iso) => new Date(Date.parse(`${iso}T00:00:00Z`) - DAY).toISOString().slice(0, 10);
const diffDays = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY);

/**
 * Gentle streak: { current, best, monthDays, totalDays }. current counts consecutive days ending today (or
 * yesterday — the day is not over). Never a "lost streak" number.
 */
export function streak(days, today) {
  const set = new Set((days || []).filter((d) => ISO.test(d)));
  let cur = 0;
  let d = set.has(today) ? today : prevIso(today);
  while (set.has(d)) { cur++; d = prevIso(d); }
  let best = 0, run = 0, last = null;
  for (const x of [...set].sort()) { run = last && diffDays(last, x) === 1 ? run + 1 : 1; best = Math.max(best, run); last = x; }
  const month = today.slice(0, 7);
  return { current: cur, best, monthDays: [...set].filter((x) => x.startsWith(month)).length, totalDays: set.size };
}

/** Entries for one person ('all' = every entry), newest first. */
export const entriesFor = (j, personId = 'all') => normaliseJournal(j).entries
  .filter((e) => personId === 'all' || !e.personId || e.personId === personId)
  .sort((a, b) => b.at.localeCompare(a.at));

/** Entries grouped by date (newest date first): [{ date, entries }]. */
export function byDate(entries) {
  const m = new Map();
  for (const e of entries) { if (!m.has(e.date)) m.set(e.date, []); m.get(e.date).push(e); }
  return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([date, list]) => ({ date, entries: list }));
}

/**
 * Monthly reflection — "இந்த மாதம் உங்கள் துணை": the person's own marks in month 'YYYY-MM'.
 * Counts are of their own entries only. Returns { month, total, counts:{kind:n}, highlights:[entry], daysUsed }.
 */
export function monthReflection(j, ym, { personId = 'all' } = {}) {
  const base = normaliseJournal(j);
  const list = entriesFor(base, personId).filter((e) => e.date.startsWith(ym));
  const counts = Object.fromEntries(KIND_IDS.map((k) => [k, list.filter((e) => e.kind === k).length]));
  // Highlights: entries with the person's own words first, then the latest.
  const highlights = [...list].sort((a, b) => (b.note ? 1 : 0) - (a.note ? 1 : 0) || b.at.localeCompare(a.at)).slice(0, 3);
  return { month: ym, total: list.length, counts, highlights, daysUsed: base.days.filter((d) => d.startsWith(ym)).length };
}

/**
 * Remedies the person marked as done, each with what THEY recorded afterwards (within 60 days, same person).
 * Nothing is inferred: "what followed" is only their own later entries, shown without any causal claim.
 */
export function remediesWithFollowUps(j, { personId = 'all', days = 60 } = {}) {
  const list = entriesFor(j, personId);
  return list.filter((e) => e.kind === 'remedy').map((r) => ({
    remedy: r,
    after: list.filter((e) => e.kind !== 'remedy' && e.at > r.at && Date.parse(e.at) - Date.parse(r.at) <= days * DAY && (!r.personId || !e.personId || e.personId === r.personId))
      .sort((a, b) => a.at.localeCompare(b.at)).slice(0, 5),
  }));
}

// ---------------------------------------------------------------- delight moments (all optional, all capped)
/** First-week welcome series: one in-app card per day for the first 7 days (never a notification). */
export const WELCOME = [
  { day: 1, go: 'family', icon: '👨‍👩‍👧', ...T('Welcome to Thunai! Start by adding your family’s birth details — each person gets their own day.', 'துணைக்கு வருக! குடும்பத்தினரின் பிறப்பு விவரங்களைச் சேர்த்துத் தொடங்குங்கள் — ஒவ்வொருவருக்கும் தனி நாள் பலன்.') },
  { day: 2, go: 'chat', icon: '💬', ...T('Try asking Thunai a question — in Tamil, English or Tanglish, by voice or text.', 'துணையிடம் ஒரு கேள்வி கேட்டுப் பாருங்கள் — தமிழ், ஆங்கிலம், தங்கிலீஷ்; குரலிலோ எழுத்திலோ.') },
  { day: 3, go: 'festivals', icon: '🪔', ...T('Festivals and vratham days — why, how and when, for your place.', 'விழாக்கள், விரத நாட்கள் — ஏன், எப்படி, எப்போது — உங்கள் ஊருக்கு ஏற்ப.') },
  { day: 4, go: 'diary', icon: '🌼', ...T('When a guidance helps or something good happens, tap “✓ This helped” — it goes into your own diary.', 'ஒரு வழிகாட்டல் உதவினாலோ நல்லது நடந்தாலோ “✓ இது உதவியது” என்று தொடுங்கள் — உங்கள் சொந்த நாட்குறிப்பில் சேரும்.') },
  { day: 5, go: 'week', icon: '🗓️', ...T('Plan your week — your appointments stay fixed; Thunai only suggests good times for flexible work.', 'உங்கள் வாரத்தைத் திட்டமிடுங்கள் — சந்திப்புகள் மாறாது; நெகிழ்வான வேலைகளுக்கு மட்டும் நல்ல நேரம்.') },
  { day: 6, go: 'temples', icon: '🛕', ...T('Find temples near you with timings and directions.', 'அருகிலுள்ள கோவில்களை நேரம், வழியுடன் கண்டுபிடியுங்கள்.') },
  { day: 7, go: 'dailyset', icon: '🔔', ...T('Choose your morning brief time — or switch any reminder off. It is your choice.', 'காலைக் குறிப்பு நேரத்தைத் தேர்வு செய்யுங்கள் — அல்லது எந்த நினைவூட்டலையும் நிறுத்தலாம். உங்கள் விருப்பம்.') },
];
/** Welcome card for today (day N since first open), or null after day 7 or when already dismissed. */
export function welcomeCard(j, today) {
  const base = normaliseJournal(j);
  if (!base.firstOpen) return null;
  const n = diffDays(base.firstOpen, today) + 1;
  const w = WELCOME.find((x) => x.day === n);
  if (!w || base.dismissed[`welcome:${n}`]) return null;
  return w;
}

/** Milestones of the person's own use: first diary entry, 7- and 30-day streaks. Returns the first not yet celebrated. */
export function pendingMilestone(j, today) {
  const base = normaliseJournal(j);
  const st = streak(base.days, today);
  const list = [];
  if (base.entries.length >= 1) list.push({ id: 'first-entry', icon: '🌼', ...T('Your first diary entry — a good habit has begun.', 'உங்கள் முதல் நாட்குறிப்புப் பதிவு — ஒரு நல்ல பழக்கம் தொடங்கியது.') });
  if (st.current >= 7) list.push({ id: 'streak-7', icon: '🪔', ...T('7 days in a row with Thunai — thank you for walking with us.', 'தொடர்ந்து 7 நாட்கள் துணையுடன் — எங்களுடன் பயணிப்பதற்கு நன்றி.') });
  if (st.current >= 30) list.push({ id: 'streak-30', icon: '🌟', ...T('30 days in a row — a month of mornings together.', 'தொடர்ந்து 30 நாட்கள் — ஒரு மாதக் காலை நேரங்கள் சேர்ந்து.') });
  return list.find((m) => !base.seen[m.id]) || null;
}
/** Mark a milestone as celebrated (or a card dismissed). */
export function markSeen(j, id, today) { const b = normaliseJournal(j); b.seen[id] = today; return b; }
export function dismiss(j, id, today) { const b = normaliseJournal(j); b.dismissed[id] = today; return b; }

export const SHARE_PROMPT_GAP_DAYS = 30;
/**
 * "Would you share Thunai with someone you care about?" — only when:
 *   the setting is on, the person did not choose "never", they marked something helpful in the last 3 days,
 *   and the prompt was not shown in the last 30 days.
 */
export function sharePromptDue(j, { now = new Date(), enabled = true } = {}) {
  if (!enabled) return false;
  const base = normaliseJournal(j);
  if (base.prompt.never) return false;
  if (base.prompt.lastAt && now.getTime() - Date.parse(base.prompt.lastAt) < SHARE_PROMPT_GAP_DAYS * DAY) return false;
  return base.entries.some((e) => (e.kind === 'helped' || e.kind === 'happened' || e.kind === 'good') && now.getTime() - Date.parse(e.at) <= 3 * DAY && Date.parse(e.at) <= now.getTime());
}
export function promptShown(j, now = new Date()) { const b = normaliseJournal(j); b.prompt.lastAt = now.toISOString(); return b; }
export function promptNever(j) { const b = normaliseJournal(j); b.prompt.never = true; return b; }

/** Account-backup merge: union by id, a delete on either side wins, newest first kept within the cap. */
export function mergeJournal(remote, local) {
  const r = normaliseJournal(remote), l = normaliseJournal(local);
  const deleted = new Set([...r.deleted, ...l.deleted]);
  const byId = new Map();
  for (const e of [...r.entries, ...l.entries]) if (!deleted.has(e.id)) byId.set(e.id, e);
  const out = normaliseJournal({ ...l, deleted: [...deleted] });
  out.entries = [...byId.values()].sort((a, b) => a.at.localeCompare(b.at)).slice(-MAX_ENTRIES);
  out.days = [...new Set([...r.days, ...l.days])].sort().slice(-MAX_DAYS);
  out.firstOpen = [r.firstOpen, l.firstOpen].filter(Boolean).sort()[0] || null;
  return out;
}
