// Listing horizon (கால வரம்பு): every period, window or timeline the app lists for a person stays inside the
// person's age 0–80 — the listing simply ends at the date of their 80th birthday. For two people (porutham,
// married life, business partners, love match) it ends at the EARLIER of the two 80th birthdays.
// Periods that straddle the horizon are clipped to end on it; periods that start after it are dropped.
// This is a quiet display rule: the wording never refers to it — when nothing remains, a gentle line is shown.
// Pure functions, no dependencies — shared by the browser, the server and Node tests.

export const LISTING_YEARS = 80;
const ISO = /^(\d{4})-(\d{2})-(\d{2})/;
const T = (en, ta) => ({ en, ta });

/** Birth date ('YYYY-MM-DD') of a chart, a family member, or a plain date string; null if unknown. */
function birthIso(subject) {
  if (!subject) return null;
  if (typeof subject === 'string') return ISO.test(subject) ? subject.slice(0, 10) : null;
  if (subject instanceof Date) return Number.isFinite(subject.getTime()) ? subject.toISOString().slice(0, 10) : null;
  const d = subject.date || subject.birthDate || subject.dob || subject.chart?.date;
  if (typeof d === 'string' && ISO.test(d)) return d.slice(0, 10);
  const u = subject.utc instanceof Date ? subject.utc : subject.utc ? new Date(subject.utc) : null;
  return u && Number.isFinite(u.getTime()) ? u.toISOString().slice(0, 10) : null;
}

/**
 * The listing horizon of one person: their birth date + 80 years (00:00 UTC of that calendar day).
 * subject: a birthChart() result, a family member ({ date }), a 'YYYY-MM-DD' string or a Date. null if unknown.
 */
export function capDate(subject, years = LISTING_YEARS) {
  const iso = birthIso(subject);
  if (!iso) return null;
  const [, y, m, d] = iso.match(ISO).map(Number);
  const t = new Date(Date.UTC(2000, m - 1, d));
  t.setUTCFullYear(y + years);
  return t;
}

/** The horizon for two people: the earlier of the two 80th birthdays (either may be unknown). */
export function pairCapDate(a, b, years = LISTING_YEARS) {
  const ca = capDate(a, years), cb = capDate(b, years);
  if (!ca) return cb;
  if (!cb) return ca;
  return ca <= cb ? ca : cb;
}

const ms = (x) => (x instanceof Date ? x.getTime() : x == null ? NaN : new Date(x).getTime());
const asDate = (x) => (x == null ? null : x instanceof Date ? x : new Date(x));

/** The earlier of a Date and the horizon (the horizon may be null = no limit). */
export function minCap(date, cap) {
  const d = asDate(date);
  if (!cap) return d;
  return ms(d) > ms(cap) ? new Date(ms(cap)) : d;
}

/** True when a date falls before the horizon (or there is no horizon). */
export const withinCap = (date, cap) => !cap || ms(date) < ms(cap);

/**
 * Clip one period { start, end } (or custom keys, e.g. peakFrom / peakTo) to the horizon.
 * Returns null when the period starts on or after the horizon; otherwise the period, with `end` moved back to the
 * horizon and `clipped: true` when it straddled it. Other keys are copied. Dates keep their input type (Date / ISO).
 */
export function clipPeriod(p, cap, { start = 'start', end = 'end' } = {}) {
  if (!p) return null;
  if (!cap) return p;
  const s = ms(p[start]), e = ms(p[end]), c = ms(cap);
  if (!(s < c)) return null;
  if (!(e > c)) return p;
  const clippedEnd = p[end] instanceof Date ? new Date(c) : typeof p[end] === 'string' ? new Date(c).toISOString().slice(0, p[end].length >= 19 ? 24 : 10) : c;
  return { ...p, [end]: clippedEnd, clipped: true };
}

/** Clip a list of periods: straddling ones are cut at the horizon, later ones dropped. */
export function clipPeriods(list, cap, keys) {
  return (list || []).map((p) => clipPeriod(p, cap, keys)).filter(Boolean);
}

/**
 * A prediction window ({ start, end, peakFrom?, peakTo? }) clipped on both of its spans; null when it begins
 * on or after the horizon.
 */
export function clipWindow(w, cap) {
  const a = clipPeriod(w, cap);
  if (!a) return null;
  if (a.peakFrom == null) return a;
  const b = clipPeriod(a, cap, { start: 'peakFrom', end: 'peakTo' });
  return b || { ...a, peakFrom: a.start, peakTo: a.end };
}

/** The last calendar year that may be listed for this horizon (null = no limit). */
export const capYear = (cap) => (cap ? new Date(ms(cap) - 1).getUTCFullYear() : null);

/** Copy of a chart's Vimshottari schedule with maha periods and bhuktis clipped to the person's horizon. */
export function cappedDasaPeriods(chart, cap = capDate(chart)) {
  const periods = chart?.dasa?.periods || [];
  return periods.map((p) => {
    const c = clipPeriod(p, cap);
    if (!c) return null;
    return c === p && !p.bhuktis ? p : { ...c, bhuktis: clipPeriods(p.bhuktis, cap) };
  }).filter(Boolean);
}

/** Gentle lines shown when nothing remains to list (never a bare dash). */
export const CAP_LINES = {
  periods: T('Its blessings show steadily through your nature and effort — keep its simple prayer going.', 'இதன் நற்பலன் உங்கள் இயல்பிலும் முயற்சியிலும் சீராக வெளிப்படும் — அதன் எளிய வழிபாட்டைத் தொடருங்கள்.'),
  windows: T('Steady effort brings gradual growth — keep going with faith.', 'தொடர் முயற்சியால் படிப்படியான வளர்ச்சி — நம்பிக்கையுடன் தொடருங்கள்.'),
  timeline: T('A calm, steady stretch — keep up the good routines together.', 'அமைதியான, நிலையான காலம் — நல்ல பழக்கங்களைச் சேர்ந்து தொடருங்கள்.'),
};
