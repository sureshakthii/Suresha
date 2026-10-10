// Birth inputs, historical time zones and calendar age.
// Pure functions (Intl only, no dependencies) shared by the browser, the server and Node tests.
//
// Time zones: we never use "today's" offset for an old birth. Offsets come from the IANA tz database
// bundled with the JavaScript runtime (Intl.DateTimeFormat), which knows e.g. India's war-time
// +6:30 (1942–45) and Dubai's +4:00. A local wall-clock time can be:
//   • normal      — exactly one UTC instant,
//   • ambiguous   — two instants (clocks went back, e.g. end of DST); we pick the EARLIER one by default,
//   • nonexistent — no instant (clocks jumped forward); we move it forward by the gap
//                   (same as Temporal's 'compatible' disambiguation) and flag it.

const MIN = 60000;
const DAY = 86400000;

const fmtCache = new Map();
function formatter(zone) {
  let f = fmtCache.get(zone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: zone, hourCycle: 'h23',
      year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric',
    });
    fmtCache.set(zone, f);
  }
  return f;
}

/** True if the runtime knows this IANA zone name (e.g. 'Asia/Kolkata'). */
export function isValidZone(zone) {
  if (typeof zone !== 'string' || !zone) return false;
  try { formatter(zone); return true; } catch { return false; }
}

/** Wall-clock time in `zone` at UTC instant `ms`, expressed as "naive UTC" milliseconds. */
function wallMs(ms, zone) {
  const parts = {};
  for (const p of formatter(zone).formatToParts(new Date(ms))) parts[p.type] = p.value;
  const y = Number(parts.year);
  // Date.UTC treats years 0–99 as 1900+; set the full year explicitly.
  const d = new Date(Date.UTC(2000, Number(parts.month) - 1, Number(parts.day), Number(parts.hour) % 24, Number(parts.minute), Number(parts.second)));
  d.setUTCFullYear(y);
  return d.getTime();
}

/** UTC offset of `zone` at a UTC instant, in minutes (India → 330, Dubai → 240). */
export function zoneOffsetMinutes(zone, instant) {
  const ms = instant instanceof Date ? instant.getTime() : instant;
  const whole = Math.floor(ms / 1000) * 1000; // Intl has second resolution
  return Math.round((wallMs(whole, zone) - whole) / MIN);
}

function parseLocal(dateStr, timeStr) {
  const [y, mo, d] = String(dateStr).split('-').map(Number);
  const [h = 0, mi = 0, s = 0] = String(timeStr ?? '00:00').split(':').map(Number);
  if (![y, mo, d, h, mi, s].every(Number.isFinite)) return null;
  const t = new Date(Date.UTC(2000, mo - 1, d, h, mi, s));
  t.setUTCFullYear(y);
  return t.getTime();
}

/**
 * Local date + time in an IANA zone → UTC instant, with DST/war-time history.
 * Returns { utc: Date, offsetMinutes, ambiguous, nonexistent, alternatives: Date[] }.
 * `disambiguation`: 'earlier' (default) or 'later' for ambiguous times.
 */
export function zonedToUtc(dateStr, timeStr, zone, { disambiguation = 'earlier' } = {}) {
  if (!isValidZone(zone)) throw new Error(`Unknown IANA time zone: ${zone}`);
  const local = parseLocal(dateStr, timeStr);
  if (local == null) throw new Error(`Invalid local date/time: ${dateStr} ${timeStr}`);
  // Offsets a day either side cover any single transition near this wall time.
  const before = zoneOffsetMinutes(zone, local - DAY);
  const after = zoneOffsetMinutes(zone, local + DAY);
  const valid = [...new Set([before, after, zoneOffsetMinutes(zone, local)])]
    .map((o) => local - o * MIN)
    .filter((u) => wallMs(u, zone) === local)
    .sort((a, b) => a - b);
  const uniq = [...new Set(valid)];
  if (uniq.length >= 1) {
    const u = uniq.length > 1 && disambiguation === 'later' ? uniq[uniq.length - 1] : uniq[0];
    return {
      utc: new Date(u), offsetMinutes: zoneOffsetMinutes(zone, u),
      ambiguous: uniq.length > 1, nonexistent: false, alternatives: uniq.map((x) => new Date(x)),
    };
  }
  // Nonexistent (spring-forward gap): use the pre-transition offset → lands after the gap.
  const u = local - before * MIN;
  return { utc: new Date(u), offsetMinutes: zoneOffsetMinutes(zone, u), ambiguous: false, nonexistent: true, alternatives: [] };
}

export const TIME_PRECISION = ['exact', 'approximate', 'unknown'];

/**
 * Normalise a birth record. Keeps the ORIGINAL local date/time and place next to the derived UTC instant.
 * Input: { date, time?, zone? (IANA), tz? (hours, legacy), lat, lon, place?, timePrecision?, disambiguation? }
 * `disambiguation` ('earlier' default | 'later') picks the instant of a wall time repeated when clocks go back.
 * When `zone` is given it wins over the numeric `tz`. Unknown time → computed at local noon, flagged.
 */
export function birthInput({ date, time, zone, tz, lat, lon, place, timePrecision, disambiguation = 'earlier' } = {}) {
  let precision = TIME_PRECISION.includes(timePrecision) ? timePrecision : (time ? 'exact' : 'unknown');
  if (!time) precision = 'unknown';
  const usedTime = precision === 'unknown' ? '12:00' : time;
  let utc; let offsetMinutes; let flags = { ambiguous: false, nonexistent: false };
  if (zone) {
    const z = zonedToUtc(date, usedTime, zone, { disambiguation });
    utc = z.utc; offsetMinutes = z.offsetMinutes; flags = { ambiguous: z.ambiguous, nonexistent: z.nonexistent };
  } else {
    const off = Number(tz ?? 0);
    offsetMinutes = Math.round(off * 60);
    utc = new Date(parseLocal(date, usedTime) - offsetMinutes * MIN);
  }
  return {
    local: { date, time: time ?? null, usedTime },
    zone: zone || null,
    tzSource: zone ? 'iana' : 'fixed-offset',
    offsetMinutes,
    tz: offsetMinutes / 60,
    utc,
    lat, lon, place: place ?? null,
    timePrecision: precision,
    ...flags,
  };
}

// ---------------------------------------------------------------- Age (calendar arithmetic)
const isLeap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

function ymdParts(s) {
  const m = /^(-?\d{1,6})-(\d{1,2})-(\d{1,2})/.exec(String(s ?? ''));
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mo < 1 || mo > 12 || d < 1) return null;
  const dim = [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mo - 1];
  if (d > dim) return null;
  return { y, mo, d };
}

/**
 * Completed years of age on a reference calendar date (both 'YYYY-MM-DD', in the person's own local calendar).
 * Pure calendar arithmetic — never milliseconds ÷ 365.25.
 * Leap-day policy: a 29 February birthday is treated as reached on 28 February in non-leap years
 * (so someone born 2008-02-29 turns 18 on 2026-02-28). Birth time is not used.
 * Returns null for invalid input or a reference date before the birth date.
 */
export function ageOn(dobStr, refDateStr) {
  const b = ymdParts(dobStr);
  const r = ymdParts(refDateStr);
  if (!b || !r) return null;
  if (r.y < b.y || (r.y === b.y && (r.mo < b.mo || (r.mo === b.mo && r.d < b.d)))) return null;
  let bMo = b.mo; let bD = b.d;
  if (bMo === 2 && bD === 29 && !isLeap(r.y)) bD = 28;
  let age = r.y - b.y;
  if (r.mo < bMo || (r.mo === bMo && r.d < bD)) age -= 1;
  return age;
}

/** Today's local calendar date ('YYYY-MM-DD') in an IANA zone — the reference date for ageOn(). */
export function localDateIn(zone, instant = new Date()) {
  const ms = (instant instanceof Date ? instant.getTime() : instant);
  return new Date(wallMs(Math.floor(ms / 1000) * 1000, zone)).toISOString().slice(0, 10);
}

/** Age band used for presentation (Brief §18). Bands guide tone, not destiny. */
export function ageBand(age) {
  if (age == null || !Number.isFinite(age) || age < 0) return 'unknown';
  if (age <= 5) return '0-5';
  if (age <= 12) return '6-12';
  if (age <= 17) return '13-17';
  if (age <= 25) return '18-25';
  if (age <= 59) return '26-59';
  return '60+';
}
