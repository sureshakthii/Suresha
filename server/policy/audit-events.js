// Minimal policy/quality metrics (Brief §22 step 10, §23). NEVER records raw messages, names, dates of birth,
// locations, phone numbers or chart data — only route, reason ids, validation status, source and versions.
// Kept in memory (bounded ring buffer + counters); export to a metrics backend is an ops decision.

export const AUDIT_VERSION = 'audit-1.0.0';
const MAX_EVENTS = 500;
const events = [];
const counters = new Map();

const ALLOWED_KEYS = ['surface', 'route', 'reasons', 'templateId', 'allowAstrology', 'validation', 'validationErrors', 'source', 'band', 'ageSource', 'language', 'jurisdiction', 'deadline', 'retentionClass', 'versions', 'latencyMs', 'classifier'];
const safeId = (v) => String(v ?? '').replace(/[^\w:.-]/g, '').slice(0, 64);

/** Record one policy decision. Unknown keys are dropped; strings are reduced to identifier characters. */
export function recordPolicyEvent(e = {}) {
  const ev = { at: new Date().toISOString().slice(0, 16) }; // minute precision only
  for (const k of ALLOWED_KEYS) {
    if (e[k] === undefined) continue;
    const v = e[k];
    if (Array.isArray(v)) ev[k] = v.slice(0, 12).map(safeId);
    else if (v && typeof v === 'object') ev[k] = Object.fromEntries(Object.entries(v).slice(0, 12).map(([a, b]) => [safeId(a), safeId(b)]));
    else if (typeof v === 'number' || typeof v === 'boolean') ev[k] = v;
    else ev[k] = safeId(v);
  }
  events.push(ev);
  if (events.length > MAX_EVENTS) events.shift();
  const key = `${ev.route}|${ev.validation || 'n/a'}|${ev.source || 'n/a'}`;
  counters.set(key, (counters.get(key) || 0) + 1);
  return ev;
}

/** Snapshot for ops dashboards / tests. */
export function auditSnapshot() {
  return { version: AUDIT_VERSION, recent: events.slice(-50), counters: Object.fromEntries(counters) };
}

export function resetAudit() { events.length = 0; counters.clear(); }
