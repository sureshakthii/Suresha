// Evidence builder (Brief §6, §22 step 7): only deterministic code issues chart facts. Each fact gets a stable
// id that the model must cite. We send the MINIMUM to the AI provider — no names, no exact birthplace,
// no coordinates, no family/relationship details unless the task needs them.
import { detectYogas } from '../../shared/analysis.js';

export const EVIDENCE_VERSION = 'evidence-1.0.0';

const MAX_FACTS = 160;
const MAX_TEXT = 220;
// Keys that are personal data and never sent to the model.
const PII_KEYS = /^(name|nameTa|names|fullName|birth|birthDate|birthTime|dob|date|time|place|birthPlace|lat|lon|lng|latitude|longitude|tz|zone|phone|email|address|relation|userId|id|city|pincode)$/i;

function fmtLocal(d, tz) {
  if (!d) return null;
  const t = new Date(new Date(d).getTime() + (Number(tz) || 0) * 3600000);
  if (Number.isNaN(t.getTime())) return null;
  return `${t.toISOString().slice(0, 10)} ${String(t.getUTCHours()).padStart(2, '0')}:${String(t.getUTCMinutes()).padStart(2, '0')}`;
}
const iso = (d) => (d instanceof Date ? d.toISOString().slice(0, 10) : typeof d === 'string' ? d.slice(0, 10) : null);
const clip = (s) => String(s).replace(/\s+/g, ' ').slice(0, MAX_TEXT);

/** Facts from a server-computed birth chart (shared/astro.js birthChart). */
export function evidenceFromChart(chart, { includeYogas = true } = {}) {
  const facts = [];
  if (!chart) return facts;
  const add = (id, text, rule) => facts.push({ id, text: clip(text), source: 'engine', rule });
  const L = chart.lagna;
  if (L) add('D1.lagna', `Lagna (ascendant): ${L.rasiName} ${L.dms || ''}`.trim(), 'astro.birthChart');
  if (chart.janmaRasi) add('D1.janma_rasi', `Janma Rasi (Moon sign): ${chart.janmaRasi.name}`, 'astro.birthChart');
  if (chart.janmaNakshatra) add('D1.janma_nakshatra', `Janma Nakshatra: ${chart.janmaNakshatra.name} pada ${chart.janmaNakshatra.pada}`, 'astro.birthChart');
  for (const [k, p] of Object.entries(chart.planets || {})) {
    if (k === 'Lagna' || !p) continue;
    const house = L ? ((p.rasi - L.rasi + 12) % 12) + 1 : null;
    add(`D1.planet.${k}`, `${k} in ${p.rasiName} ${p.dms || ''}, ${p.nakshatraName || ''}${house ? `, house ${house} from Lagna` : ''}${p.retrograde && !['Rahu', 'Ketu'].includes(k) ? ' (retrograde)' : ''}`, 'astro.birthChart');
  }
  const d = chart.dasa;
  if (d?.current) add('DASA.current', `${d.current.lord} Mahadasa ${iso(d.current.start)} to ${iso(d.current.end)}`, 'astro.vimshottari');
  if (d?.currentBhukti) add('DASA.bhukti', `${d.currentBhukti.lord} Bhukti until ${iso(d.currentBhukti.end)}`, 'astro.vimshottari');
  if (Array.isArray(d?.periods)) {
    d.periods.filter((p) => p.start > new Date()).slice(0, 2).forEach((p, i) => add(`DASA.next.${i}`, `${p.lord} Mahadasa from ${iso(p.start)}`, 'astro.vimshottari'));
  }
  if (includeYogas) {
    try {
      for (const y of detectYogas(chart)) add(`YOGA.${y.id}`, `${y.name.en} (detected by rule ${y.id}; rule pending astrologer approval): ${y.desc.en}`, `analysis.detectYogas:${y.id}`);
    } catch { /* yoga rules unavailable — omit, never guess */ }
  }
  return facts;
}

/** Facts from a Prasna evaluation (shared/prasna.js evaluatePrasna) at the asking place. */
export function evidenceFromEvaluation(evaluation, loc = {}) {
  const facts = [];
  if (!evaluation) return facts;
  const s = evaluation.snapshot || {};
  const add = (id, text, rule) => facts.push({ id, text: clip(text), source: 'engine', rule });
  if (s.weekday) add('PN.weekday', `Weekday: ${s.weekday.en}`, 'astro.panchang');
  if (s.tithi) add('PN.tithi', `Tithi: ${s.tithi.paksha} ${s.tithi.name}`, 'astro.panchang');
  if (s.nakshatra) add('PN.nakshatra', `Current nakshatra: ${s.nakshatra.name} pada ${s.nakshatra.pada}`, 'astro.panchang');
  if (s.yoga) add('PN.yoga', `Panchang yoga: ${s.yoga.name}`, 'astro.panchang');
  if (s.moonRasi) add('PN.moon_rasi', `Moon transiting ${s.moonRasi.name}`, 'astro.panchang');
  if (s.currentHora) add('PN.horai', `Current Horai: ${s.currentHora.lord} until ${fmtLocal(s.currentHora.end, loc.tz)}`, 'astro.horaiTable');
  if (s.lagna) add('PN.prasna_lagna', `Prasna Lagna: ${s.lagna.rasiName} ${s.lagna.dms || ''}`.trim(), 'astro.panchang');
  if (s.rahuKalam) add('PN.rahu_kalam', `Rahu Kalam: ${fmtLocal(s.rahuKalam.start, loc.tz)} to ${fmtLocal(s.rahuKalam.end, loc.tz)}`, 'astro.panchang');
  if (s.yamagandam) add('PN.yamagandam', `Yamagandam: ${fmtLocal(s.yamagandam.start, loc.tz)} to ${fmtLocal(s.yamagandam.end, loc.tz)}`, 'astro.panchang');
  add('PR.verdict', `Prasna verdict: ${evaluation.verdict} (score ${evaluation.score}/100)`, 'prasna.evaluatePrasna');
  for (const f of evaluation.factors || []) add(`PR.factor.${f.key}`, `${f.label} (${f.points > 0 ? '+' : ''}${f.points})`, `prasna.factor:${f.key}`);
  (evaluation.bestTimes || []).slice(0, 3).forEach((w, i) => add(`PR.window.${i}`, `Better window: ${fmtLocal(w.start, loc.tz)} to ${fmtLocal(w.end, loc.tz)} (score ${w.best}, ${w.hora} Horai)`, 'prasna.bestTimes'));
  return facts;
}

/**
 * Facts from the client-computed context (chat, porutham, names tasks). These were computed by the same
 * shared deterministic code in the browser, but the server cannot re-verify them, so they are marked
 * source 'client' (lower assurance). Personal keys are dropped.
 */
export function evidenceFromClientContext(context, { keep = [] } = {}) {
  const facts = [];
  const dropped = new Set();
  const keepSet = new Set(keep);
  const walk = (v, path, depth) => {
    if (facts.length >= MAX_FACTS || v == null) return;
    const key = path[path.length - 1];
    if (key !== undefined && typeof key === 'string' && PII_KEYS.test(key) && !keepSet.has(key)) { dropped.add(key); return; }
    if (key === 'question') return; // the question is sent separately as the user's message
    if (typeof v === 'object') {
      if (depth > 5) return;
      if (Array.isArray(v)) v.slice(0, 24).forEach((x, i) => walk(x, [...path, i], depth + 1));
      else for (const [k, x] of Object.entries(v)) walk(x, [...path, k], depth + 1);
      return;
    }
    if (!['string', 'number', 'boolean'].includes(typeof v)) return;
    const id = `C.${path.join('.')}`.replace(/[^\w.-]/g, '_').slice(0, 80);
    facts.push({ id, text: clip(`${path.filter((p) => typeof p === 'string').join(' › ')}: ${v}`), source: 'client', rule: 'client-context' });
  };
  if (context && typeof context === 'object') walk(context, [], 0);
  return { facts, dropped: [...dropped] };
}

/**
 * Build the bundle. Prefer server-computed facts (chart/evaluation); add client facts only when no chart
 * was computed here. Returns { version, facts, ids, dropped, sources }.
 */
export function buildEvidence({ chart = null, evaluation = null, loc = {}, clientContext = null, keepKeys = [] } = {}) {
  const facts = [...evidenceFromChart(chart), ...evidenceFromEvaluation(evaluation, loc)];
  let dropped = [];
  if (clientContext) {
    const c = evidenceFromClientContext(clientContext, { keep: keepKeys });
    dropped = c.dropped;
    const have = new Set(facts.map((f) => f.id));
    for (const f of c.facts) if (!have.has(f.id) && facts.length < MAX_FACTS) facts.push(f);
  }
  return {
    version: EVIDENCE_VERSION,
    facts,
    ids: facts.map((f) => f.id),
    dropped,
    sources: [...new Set(facts.map((f) => f.source))],
  };
}

/** Exactly what goes to the model: ids and texts only. */
export const modelPayload = (bundle) => ({ evidenceVersion: bundle.version, facts: bundle.facts.map(({ id, text }) => ({ id, text })) });

/** Compact form for the API response ("Why this guidance?"). */
export const publicEvidence = (bundle, ids = null) => {
  const pick = ids ? new Set(ids) : null;
  return bundle.facts.filter((f) => !pick || pick.has(f.id)).map(({ id, text, source }) => ({ id, text, source }));
};
