// Report horizon (அறிக்கை கால எல்லை): how far ahead a section lists periods, windows or years — always stated in
// the section header ("Covers the next 10 years"). It is a reading window chosen for usefulness, never an
// assumption about anyone's lifespan: nothing is dropped because of a person's age, and older adults get every
// service. The Vimshottari schedule itself is computed for its full 120 years from birth.
// Pure functions, no dependencies — shared by the browser, the server and Node tests.

const T = (en, ta) => ({ en, ta });
const YEAR_MS = 365.25 * 86400000;
const ms = (x) => (x instanceof Date ? x.getTime() : x == null ? NaN : new Date(x).getTime());

/** Default horizons per section (years ahead of today). */
export const REPORT_YEARS = { roadmap: 10, life: 15, analysis: 20, dasaTable: 20, ask: 10 };
export const DASA_SCHEDULE_YEARS = 120;

/** End of a horizon of `years` from `from`. */
export const horizonEnd = (from = new Date(), years = REPORT_YEARS.roadmap) => new Date(ms(from) + years * YEAR_MS);

/** Header label: "Covers the next N years" / "அடுத்த N ஆண்டுகள்". */
export const horizonLabel = (years = REPORT_YEARS.roadmap) => T(`Covers the next ${years} years`, `அடுத்த ${years} ஆண்டுகள்`);

/** Chart screen dasa table header: the schedule's own span (never a lifespan statement). */
export const DASA_SCHEDULE_LABEL = T(
  `Vimshottari schedule computed for ${DASA_SCHEDULE_YEARS} years from birth`,
  `விம்சோத்தரி தசை அட்டவணை — பிறப்பிலிருந்து ${DASA_SCHEDULE_YEARS} ஆண்டுகளுக்குக் கணிக்கப்பட்டது`,
);

/**
 * Split a list of periods ({ start, end }) at a horizon: `shown` = everything that starts before from + years
 * (past and running periods included), `more` = later periods (offered behind "Show more"). Nothing is dropped.
 */
export function splitByHorizon(list, { from = new Date(), years = REPORT_YEARS.dasaTable, start = 'start' } = {}) {
  const end = ms(horizonEnd(from, years));
  const shown = [], more = [];
  for (const p of list || []) (ms(p[start]) < end ? shown : more).push(p);
  return { shown, more, horizon: new Date(end), years };
}

/** Periods (or windows) that overlap [from, from + years) — e.g. the next periods of one planet. */
export function withinHorizon(list, { from = new Date(), years = REPORT_YEARS.analysis, start = 'start', end = 'end' } = {}) {
  const a = ms(from), b = ms(horizonEnd(from, years));
  return (list || []).filter((p) => ms(p[end]) > a && ms(p[start]) < b);
}

/** Gentle lines when a section has nothing inside its horizon (never a bare dash, never a lifespan hint). */
export const HORIZON_LINES = {
  periods: (years = REPORT_YEARS.analysis) => T(`No period of this planet starts in the next ${years} years — its blessings show steadily through your nature and effort.`, `அடுத்த ${years} ஆண்டுகளில் இந்தக் கிரகத்தின் காலம் இல்லை — இதன் நற்பலன் உங்கள் இயல்பிலும் முயற்சியிலும் சீராக வெளிப்படும்.`),
  windows: (years = REPORT_YEARS.life) => T(`No strong window in the next ${years} years — steady effort brings gradual growth.`, `அடுத்த ${years} ஆண்டுகளில் வலுவான காலம் இல்லை — தொடர் முயற்சியால் படிப்படியான வளர்ச்சி.`),
};

/** Static gentle lines (no horizon number) for older callers. */
export const GENTLE_LINES = {
  periods: T('Its blessings show steadily through your nature and effort — keep its simple prayer going.', 'இதன் நற்பலன் உங்கள் இயல்பிலும் முயற்சியிலும் சீராக வெளிப்படும் — அதன் எளிய வழிபாட்டைத் தொடருங்கள்.'),
  windows: T('Steady effort brings gradual growth — keep going with faith.', 'தொடர் முயற்சியால் படிப்படியான வளர்ச்சி — நம்பிக்கையுடன் தொடருங்கள்.'),
  timeline: T('A calm, steady stretch — keep up the good routines together.', 'அமைதியான, நிலையான காலம் — நல்ல பழக்கங்களைச் சேர்ந்து தொடருங்கள்.'),
};
