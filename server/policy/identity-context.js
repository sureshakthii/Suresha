// Identity & request context (Brief §17, §22 step 1): keeps the authenticated account, the active speaker,
// the selected chart subject and every other person mentioned SEPARATE, each with an age status and source.
//
// Age sources: 'profile' (entered in the app — NOT verified identity), 'chat' (stated in conversation),
// 'guardian' (guardian-confirmed through an approved flow), 'verified' (approved verification process),
// 'conflicting' (sources disagree) or 'unknown'. When sources disagree we use the YOUNGEST stated age
// (conservative): "I am 18 now" never silently erases an earlier "I am 14". Nothing here updates the
// account record — age correction must go through a separate, legitimate process.
//
// Age is calendar arithmetic on the person's local calendar date (shared/datetime.js ageOn when available).
// Birth time is never needed for age grouping. We never infer age from voice, grammar, appearance or chart.
import * as dt from '../../shared/datetime.js';
import { resolveJurisdiction } from './resource-directory.js';

export const CONTEXT_SCHEMA_VERSION = 'ctx-1.0.0';
export const CONVERSATION_CONTEXT_VERSION = 'conv-1';

// ---------------------------------------------------------------- calendar age (local fallback)
const isLeap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
function ymd(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s ?? ''));
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mo < 1 || mo > 12 || d < 1 || d > [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mo - 1]) return null;
  return { y, mo, d };
}
/** Completed years on refDate. Leap-day policy matches shared/datetime.js: 29 Feb birthdays are reached on 28 Feb in non-leap years. */
function localAgeOn(dob, ref) {
  const b = ymd(dob); const r = ymd(ref);
  if (!b || !r) return null;
  if (r.y < b.y || (r.y === b.y && (r.mo < b.mo || (r.mo === b.mo && r.d < b.d)))) return null;
  const bd = b.mo === 2 && b.d === 29 && !isLeap(r.y) ? 28 : b.d;
  let age = r.y - b.y;
  if (r.mo < b.mo || (r.mo === b.mo && r.d < bd)) age -= 1;
  return age;
}
function localAgeBand(age) {
  if (age == null || !Number.isFinite(age) || age < 0) return 'unknown';
  if (age <= 5) return '0-5';
  if (age <= 12) return '6-12';
  if (age <= 17) return '13-17';
  if (age <= 25) return '18-25';
  if (age <= 59) return '26-59';
  return '60+';
}
export const ageOn = typeof dt.ageOn === 'function' ? dt.ageOn : localAgeOn;
export const ageBand = typeof dt.ageBand === 'function' ? dt.ageBand : localAgeBand;
export const isMinorAge = (age) => (age == null ? null : age < 18);

/**
 * Reference date policy: the current calendar date in the person's selected IANA zone (e.g. 'Asia/Kolkata');
 * else from the fixed UTC offset in hours sent with the location; else the UTC date.
 */
export function referenceDate({ now = new Date(), zone, tzHours } = {}) {
  if (zone && typeof dt.isValidZone === 'function' && dt.isValidZone(zone) && typeof dt.localDateIn === 'function') {
    return { date: dt.localDateIn(zone, now), zone, basis: 'iana-zone' };
  }
  if (Number.isFinite(Number(tzHours)) && tzHours !== null && tzHours !== '') {
    return { date: new Date(now.getTime() + Number(tzHours) * 3600000).toISOString().slice(0, 10), zone: `UTC${Number(tzHours) >= 0 ? '+' : ''}${Number(tzHours)}`, basis: 'utc-offset' };
  }
  return { date: now.toISOString().slice(0, 10), zone: 'UTC', basis: 'utc' };
}

// ---------------------------------------------------------------- ephemeral session signals
// Short-lived, in-memory only (never persisted): keeps protective signals across turns of a session so that a
// chart/profile switch or a new "I am 18" claim cannot erase them. Expires after 30 minutes of inactivity.
const MEMORY_TTL_MS = 30 * 60000;
const memory = new Map();
export function recallSignals(key, now = Date.now()) {
  if (!key) return null;
  const v = memory.get(key);
  if (!v) return null;
  if (v.expires < now) { memory.delete(key); return null; }
  return v;
}
export function rememberSignals(key, signals, now = Date.now()) {
  if (!key) return;
  const prev = recallSignals(key, now) || {};
  const next = { ...prev, expires: now + MEMORY_TTL_MS };
  if (Number.isFinite(signals.minAge)) next.minAge = Number.isFinite(prev.minAge) ? Math.min(prev.minAge, signals.minAge) : signals.minAge;
  if (signals.minorSignal) next.minorSignal = true;
  if (signals.selfHarm) next.selfHarm = true;
  memory.set(key, next);
  if (memory.size > 5000) memory.delete(memory.keys().next().value);
}
export function forgetSignals(key) { memory.delete(key); }

// ---------------------------------------------------------------- helpers
const CHILD_RELATIONS = new Set(['son', 'daughter', 'child', 'grandson', 'granddaughter']);
const clampAge = (v) => { const n = Number(v); return Number.isFinite(n) && n >= 0 && n <= 120 ? Math.floor(n) : null; };
const validDob = (v) => (typeof v === 'string' && ymd(v) ? v : null);

/**
 * The chat client's person.birth: an object { date, time, … } (current app), a { dob } object, or a free
 * string like "1990-01-01 10:00 Chennai" (older clients). Returns 'YYYY-MM-DD' or null.
 */
export function dobFrom(v) {
  if (v && typeof v === 'object') return dobFrom(typeof v.date === 'string' ? v.date : typeof v.dob === 'string' ? v.dob : null);
  if (typeof v !== 'string') return null;
  const m = /(\d{4}-\d{2}-\d{2})/.exec(v);
  return m && ymd(m[1]) ? m[1] : null;
}

function resolveAgeStatus(statements) {
  const list = statements.filter((s) => s && (Number.isFinite(s.age) || s.minorOnly));
  if (!list.length) return { age: null, band: 'unknown', minor: null, ageStatus: 'unknown', ageSource: 'unknown' };
  const numeric = list.filter((s) => Number.isFinite(s.age));
  const minorOnly = list.some((s) => s.minorOnly);
  const minAge = numeric.length ? Math.min(...numeric.map((s) => s.age)) : null;
  const anyMinor = minorOnly || numeric.some((s) => s.age < 18);
  const anyAdult = numeric.some((s) => s.age >= 18);
  const sources = [...new Set(list.map((s) => s.source))];
  const distinctAges = new Set(numeric.map((s) => s.age));
  const conflicting = (anyMinor && anyAdult) || distinctAges.size > 1 && sources.length > 1;
  let age = minAge;
  if (anyMinor && (minAge == null || minAge >= 18)) age = null; // minor signal without a number
  const minor = anyMinor ? true : (age == null ? null : false);
  const band = age != null ? ageBand(age) : anyMinor ? 'minor-unknown' : 'unknown';
  return {
    age, band, minor,
    ageStatus: conflicting ? 'conflicting' : 'known',
    ageSource: conflicting ? 'conflicting' : sources.length === 1 ? sources[0] : 'conflicting',
  };
}

/**
 * Build the request context. Inputs:
 *   body   – request body (see docs/AI-SAFETY-POLICY.md "Request contract")
 *   user   – authenticated user or null
 *   intent – result of classifyConversation() (ages mentioned in chat)
 *   turns  – the person's own messages (original wording)
 */
export function resolveContext({ body = {}, user = null, intent = null, turns = [], lang = 'en', now = new Date(), memoryKey = null } = {}) {
  const b = body && typeof body === 'object' ? body : {};
  const loc = b.loc && typeof b.loc === 'object' ? b.loc : {};
  const ref = referenceDate({ now, zone: typeof b.zone === 'string' ? b.zone : (typeof loc.zone === 'string' ? loc.zone : null), tzHours: loc.tz ?? b.birth?.tz });

  // Selected chart subject (whose horoscope is open) — may be different from the speaker.
  const ctxPerson = b.context && typeof b.context === 'object' && b.context.person && typeof b.context.person === 'object' ? b.context.person : null;
  const sIn = b.subject && typeof b.subject === 'object' ? b.subject : {};
  const subjectRelation = String(sIn.relation || b.birth?.relation || ctxPerson?.relation || 'unknown').slice(0, 24);
  const subjectDob = validDob(sIn.dob) || validDob(b.birth?.date) || dobFrom(ctxPerson?.birth);
  const subjectAge = subjectDob ? ageOn(subjectDob, ref.date) : clampAge(sIn.age);
  const subject = {
    relation: subjectRelation,
    present: Boolean(subjectDob || b.birth || ctxPerson),
    age: subjectAge,
    band: ageBand(subjectAge),
    minor: isMinorAge(subjectAge),
    ageSource: subjectAge == null ? 'unknown' : 'profile',
  };

  // Active speaker
  const spIn = b.speaker && typeof b.speaker === 'object' ? b.speaker : {};
  const declaredType = ['self', 'guardian', 'child', 'caregiver', 'unknown'].includes(spIn.type) ? spIn.type : null;
  const speakerType = declaredType || (subjectRelation === 'self' ? 'self' : CHILD_RELATIONS.has(subjectRelation) ? 'guardian' : 'unknown');
  const statements = [];
  const spDob = validDob(spIn.dob);
  if (spDob) statements.push({ age: ageOn(spDob, ref.date), source: 'profile' });
  else if (clampAge(spIn.age) != null) statements.push({ age: clampAge(spIn.age), source: 'profile' });
  else if (speakerType === 'self' && subjectAge != null) statements.push({ age: subjectAge, source: 'profile' });
  if (user && user.ageVerified && Number.isFinite(user.verifiedAge)) statements.push({ age: user.verifiedAge, source: 'verified' });
  for (const a of intent?.ages || []) if (a.who === 'speaker') statements.push({ age: a.age, source: 'chat', claimNow: a.claimNow });
  const flags = b.sessionFlags && typeof b.sessionFlags === 'object' ? b.sessionFlags : {};
  if (flags.minorSignal === true) statements.push({ minorOnly: true, age: clampAge(flags.minAge) ?? undefined, source: 'chat' });
  const mem = recallSignals(memoryKey);
  if (mem?.minorSignal) statements.push({ minorOnly: true, age: mem.minAge, source: 'chat' });
  if (speakerType === 'child') statements.push({ minorOnly: true, source: 'profile' });
  const speakerAge = resolveAgeStatus(statements);
  const adultClaimAfterMinor = statements.some((s) => s.source === 'chat' && s.age >= 18 && s.claimNow) && speakerAge.minor === true;

  // Other participants mentioned in the conversation or supplied by the app.
  const participants = [];
  if (subject.present && speakerType !== 'self') participants.push({ role: 'chart_subject', group: CHILD_RELATIONS.has(subjectRelation) ? 'child' : 'family', age: subject.age, band: subject.band, minor: subject.minor, ageSource: subject.ageSource });
  for (const a of intent?.ages || []) {
    if (a.who !== 'other') continue;
    participants.push({ role: a.role || 'person', group: a.group, age: a.age, band: ageBand(a.age), minor: a.age < 18, ageSource: 'chat' });
  }
  for (const p of Array.isArray(b.participants) ? b.participants.slice(0, 8) : []) {
    if (!p || typeof p !== 'object') continue;
    const dob = validDob(p.dob);
    const age = dob ? ageOn(dob, ref.date) : clampAge(p.age);
    participants.push({ role: String(p.role || 'person').slice(0, 24), group: CHILD_RELATIONS.has(p.role) ? 'child' : String(p.group || 'other').slice(0, 16), age, band: ageBand(age), minor: isMinorAge(age), ageSource: age == null ? 'unknown' : 'profile' });
  }

  const original = turns.length ? String(turns[turns.length - 1]) : '';
  const consent = b.consent && typeof b.consent === 'object' ? b.consent : {};
  return {
    schemaVersion: CONTEXT_SCHEMA_VERSION,
    actor: { id: user?.id ?? null, assurance: user ? (user.ageVerified ? 'verified' : 'authenticated') : 'anonymous' },
    speaker: { type: speakerType, ...speakerAge, adultClaimAfterMinor },
    subject,
    participants,
    reference: { date: ref.date, zone: ref.zone, basis: ref.basis, at: now.toISOString() },
    message: { original: original.slice(0, 2000), normalized: intent?.normalized || '' },
    language: lang === 'ta' ? 'ta' : 'en',
    intent: intent ? { purpose: intent.purpose, requestedAction: intent.requestedAction, urgency: intent.urgency, uncertainty: intent.uncertainty } : null,
    consent: { rememberChat: consent.rememberChat === true, scope: subjectRelation === 'self' || subjectRelation === 'unknown' ? 'self' : 'family' },
    chartPrecision: String(b.birth?.timePrecision || sIn.timePrecision || ctxPerson?.birthTimeCertainty || (typeof ctxPerson?.birth === 'object' && ctxPerson.birth?.timePrecision) || (subjectDob ? 'entered' : 'none')).slice(0, 16),
    jurisdiction: resolveJurisdiction(b),
    conversation: { version: CONVERSATION_CONTEXT_VERSION, turns: turns.length },
  };
}
