import { BRAND } from '../shared/brand.js';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { birthChart, panchang } from '../shared/astro.js';
import { CATEGORIES, evaluatePrasna, getCategory } from '../shared/prasna.js';
import { searchLocalPlaces, searchOnline } from './places.js';
import { aiEnabled, buildContext, generateReply, runTask } from './ai.js';
import { authRouter, currentUser } from './auth.js';
import { weatherRouter } from './weather.js';
import { pushRouter, startPushScheduler } from './push.js';
import { marketRouter } from './market.js';
import { billingEnforced, billingRouter, checkAiQuota, familyProfileGuard, recordAiUsage } from './billing.js';
import { growthRouter } from './growth.js';
import { familyRouter } from './family.js';
import { rateLimit, requireAdmin, auditLog } from './admin.js';
import { businessMetrics, recordAiCost } from './metrics.js';
import { startBackupSchedule } from './backup.js';
import { tamilMonth } from '../shared/tamilcal.js';
import { isValidZone, zonedToUtc } from '../shared/datetime.js';
import { matchPorutham, doshams, doshaSamyam } from '../shared/porutham.js';
import { findMuhurtham } from '../shared/special.js';
import { AI_TASKS, DEADLINE_FIRST } from '../shared/narrator.js';
import { evaluatePolicy, templateAnswer, deadlineNote, publicPolicy, audit, buildEvidence, publicEvidence, templateText, traceFor } from './policy/index.js';
import { policyRouter } from './policy/routes.js';

// Simple per-IP limiter for AI calls (protects the API budget).
const aiHits = new Map();
function aiRateLimited(ip, max = Number(process.env.AI_RATE_LIMIT) || 40, windowMs = 10 * 60000) {
  const now = Date.now();
  const hits = (aiHits.get(ip) || []).filter((t) => now - t < windowMs);
  hits.push(now);
  aiHits.set(ip, hits);
  return hits.length > max;
}

function openStream(res) {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  return (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

class BadRequest extends Error {}

function num(v, name, min, max) {
  const n = Number(v);
  if (v === undefined || v === null || v === '' || !Number.isFinite(n) || n < min || n > max) {
    throw new BadRequest(`Invalid ${name}`);
  }
  return n;
}

function parseLoc(src) {
  return {
    lat: num(src.lat, 'lat', -90, 90),
    lon: num(src.lon, 'lon', -180, 180),
    tz: num(src.tz, 'tz', -12, 14),
    name: typeof src.name === 'string' ? src.name.slice(0, 120) : undefined,
  };
}

const TIME_PRECISIONS = ['exact', 'approximate', 'unknown'];

/**
 * Birth details. Optional `zone` (IANA name, e.g. Asia/Kolkata): when `tz` is missing the zone's offset on the
 * birth date is used. Optional `timePrecision` exact | approximate | unknown: an unknown time needs no clock
 * time (the engine computes at 12:00 and gives no Lagna).
 */
function parseBirth(b) {
  if (!b || typeof b !== 'object') throw new BadRequest('Missing birth details');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.date || '')) throw new BadRequest('Invalid date (YYYY-MM-DD)');
  const timePrecision = b.timePrecision == null ? 'exact' : String(b.timePrecision);
  if (!TIME_PRECISIONS.includes(timePrecision)) throw new BadRequest('Invalid timePrecision (exact | approximate | unknown)');
  const time = timePrecision === 'unknown' && !b.time ? '12:00' : b.time;
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(time || '')) throw new BadRequest('Invalid time (HH:MM)');
  if (b.zone != null && !isValidZone(String(b.zone))) throw new BadRequest('Invalid time zone (IANA name such as Asia/Kolkata)');
  const loc = parseLoc(b.zone != null && (b.tz === undefined || b.tz === null || b.tz === '')
    ? { ...b, tz: zonedToUtc(b.date, time, String(b.zone)).offsetMinutes / 60 } : b);
  return {
    name: String(b.name || 'Guest').slice(0, 80),
    place: String(b.place || loc.name || '').slice(0, 120),
    date: b.date, time, lat: loc.lat, lon: loc.lon, tz: loc.tz,
    ...(b.zone != null ? { zone: String(b.zone) } : {}),
    timePrecision,
  };
}

export function createApp() {
  const app = express();
  if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);
  app.use('/api/billing/stripe/webhook', express.raw({ type: '*/*', limit: '256kb' })); // Stripe signs the raw bytes
  app.use('/api/billing/razorpay/webhook', express.raw({ type: '*/*', limit: '256kb' })); // Razorpay signs the raw bytes
  app.use('/api/me/data', express.json({ limit: '256kb' })); // saved family profiles can be larger
  app.use(express.json({ limit: '64kb' }));
  // Basic security headers and per-IP rate limits (in-memory; use a shared store with several instances).
  app.use((_req, res, next) => { res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin'); res.setHeader('X-Frame-Options', 'SAMEORIGIN'); next(); });
  if (process.env.RATE_LIMITS !== 'off') {
    app.use(['/api/chart', '/api/places', '/api/weather', '/api/panchang', '/api/calendar'], rateLimit({ windowMs: 60000, max: Number(process.env.RATE_READ_PER_MIN) || 120 }));
    const writes = rateLimit({ windowMs: 10 * 60000, max: Number(process.env.RATE_WRITE_PER_10MIN) || 30 });
    app.use(['/api/store/orders', '/api/requests', '/api/billing/redeem', '/api/billing/checkout', '/api/billing/restore'], (req, res, next) => (req.method === 'POST' ? writes(req, res, next) : next()));
  }
  app.put('/api/me/data', familyProfileGuard); // BILLING_ENFORCE: account backup keeps the plan's profile count
  app.use('/api', authRouter());
  app.use('/api', weatherRouter());
  app.use('/api', pushRouter());
  app.use('/api', marketRouter());
  app.use('/api', billingRouter());
  app.use('/api', growthRouter());
  app.use('/api', familyRouter());
  app.use('/api', policyRouter());

  app.get('/api/health', (_req, res) => res.json({ ok: true, ai: aiEnabled() }));
  app.get('/api/admin/metrics', requireAdmin('viewer'), (req, res) => res.json(businessMetrics({ days: Math.min(365, Math.max(1, Number(req.query.days) || 30)) })));
  app.get('/api/admin/audit', requireAdmin('owner'), (req, res) => res.json({ audit: auditLog(Number(req.query.limit) || 200) }));

  app.get('/api/categories', (_req, res) => {
    res.json(CATEGORIES.map(({ id, icon, en, ta }) => ({ id, icon, en, ta })));
  });

  app.get('/api/places', async (req, res) => {
    const q = String(req.query.q || '').slice(0, 80);
    let results = searchLocalPlaces(q);
    if (results.length < 3 && q.length >= 3 && req.query.online !== '0') {
      const online = await searchOnline(q);
      results = [...results, ...online];
    }
    res.json(results);
  });

  app.post('/api/chart', (req, res) => {
    const birth = parseBirth(req.body);
    res.json(birthChart(birth));
  });

  app.get('/api/panchang', (req, res) => {
    const loc = parseLoc(req.query);
    const at = req.query.at ? new Date(String(req.query.at)) : new Date();
    if (Number.isNaN(at.getTime())) throw new BadRequest('Invalid at');
    res.json(panchang(at, loc.lat, loc.lon, loc.tz));
  });

  /**
   * Ask the Jothidar (Prasnam). Body: { category, question?, lang?, loc:{lat,lon,tz,name}, birth?:{date,time,lat,lon,tz,...},
   *   speaker?, subject?, participants?, sessionFlags?, sessionId?, country? } — see docs/AI-SAFETY-POLICY.md.
   * Policy runs FIRST: when astrology is not appropriate no chart or Prasna is computed and a reviewed answer
   * (with help contacts where needed) is returned. Otherwise SSE: evaluation → policy → delta (the whole,
   * validated reply) → done. JSON without Accept: text/event-stream.
   */
  app.post('/api/ask', async (req, res) => {
    const { category, question = '', lang = 'en' } = req.body || {};
    if (!getCategory(category)) throw new BadRequest('Unknown category');
    const loc = parseLoc(req.body.loc || {});
    const birthIn = req.body.birth ? parseBirth(req.body.birth) : null;
    const q = String(question).slice(0, 500);
    const wantsStream = (req.headers.accept || '').includes('text/event-stream');
    const started = Date.now();
    const user = currentUser(req);
    const { intent, ctx: pctx, decision } = await evaluatePolicy({ body: req.body, user, turns: q.trim() ? [q] : [], lang, category });

    const trace = traceFor(pctx, req.body);
    if (!decision.allowAstrology) {
      const t = templateAnswer(decision, pctx, lang);
      const policy = publicPolicy(decision, pctx);
      audit('ask', { decision, ctx: pctx, intent, source: 'policy', latencyMs: Date.now() - started, trace });
      if (!wantsStream) return res.json({ category, route: decision.route, reply: t.text, source: 'policy', policy, resources: t.resources, trace });
      const send = openStream(res);
      send('policy', { ...policy, resources: t.resources, trace });
      send('delta', { text: t.text });
      send('done', { source: 'policy', route: decision.route });
      return res.end();
    }

    const chart = birthIn ? birthChart(birthIn) : null;
    const birth = chart && { janmaNakshatra: chart.janmaNakshatra.index, janmaRasi: chart.janmaRasi.index };
    const evaluation = evaluatePrasna({ at: new Date(), category, loc, birth, deadline: Boolean(decision.deadline) });
    const profile = chart && {
      janmaNakshatraName: chart.janmaNakshatra.name,
      janmaRasiName: chart.janmaRasi.name,
      lagnaName: chart.lagna?.rasiName ?? null,
      currentDasa: chart.dasa.current && `${chart.dasa.current.lord} Dasa / ${chart.dasa.currentBhukti?.lord} Bhukti`,
    };
    const ctx = buildContext({ evaluation, question: q, category, lang, profile, loc });
    const evidence = buildEvidence({ chart, evaluation, loc });
    decision.permittedEvidenceIds = evidence.ids;
    const engineNote = evaluation.practicalFirst && evaluation.deadlineNote ? (lang === 'ta' ? evaluation.deadlineNote.ta : evaluation.deadlineNote.en) : null;
    const note = engineNote || deadlineNote(decision, lang);
    const practical = note ? { deadlineFirst: true, note, questions: evaluation.practicalQuestions || null } : { deadlineFirst: false };
    const summary = {
      category, score: evaluation.score, verdict: evaluation.verdict, verdictText: evaluation.verdictText,
      factors: evaluation.factors, bestTimes: evaluation.bestTimes, practical,
      snapshot: {
        at: evaluation.snapshot.at, nakshatra: evaluation.snapshot.nakshatra, tithi: evaluation.snapshot.tithi,
        currentHora: evaluation.snapshot.currentHora, lagna: evaluation.snapshot.lagna, moonRasi: evaluation.snapshot.moonRasi,
      },
    };

    const send = wantsStream ? openStream(res) : null;
    send?.('evaluation', summary); // deterministic engine output — safe to show before the explanation
    const reply = await generateReply({
      ctx, evaluation, lang, decision, evidence, practicalNote: note,
      onUsage: (u) => recordAiCost({ userId: user?.id || null, task: 'ask', model: u.model, usage: u }),
    });
    // Deadline-first: the practical note always leads (the rule-based narrator already includes it).
    const narratorHasNote = Boolean(DEADLINE_FIRST[category] || evaluation.practicalFirst);
    const text = note && (reply.source === 'ai' || !narratorHasNote) ? `${note}\n\n${reply.text}` : reply.text;
    const cited = reply.answer?.claims?.flatMap((c) => c.evidenceIds);
    const extra = {
      route: decision.route,
      policy: publicPolicy(decision, pctx),
      evidence: publicEvidence(evidence, cited || null),
      claims: reply.answer?.claims || [],
      validation: reply.validation.status,
      notice: reply.source === 'ai' ? null : templateText('no_ai_notice', lang),
      trace,
    };
    audit('ask', { decision, ctx: pctx, intent, validation: reply.validation.status, validationErrors: reply.validation.errors, source: reply.source, latencyMs: Date.now() - started, trace });
    if (!send) return res.json({ ...summary, reply: text, source: reply.source, ...extra });
    send('policy', extra);
    send('delta', { text });
    send('done', { source: reply.source, route: decision.route });
    res.end();
  });

  /** Tamil calendar for a Gregorian month: GET /api/calendar?year=2026&month=1&lat&lon&tz (month 1-12). */
  app.get('/api/calendar', (req, res) => {
    const loc = parseLoc(req.query);
    const year = num(req.query.year, 'year', 1900, 2100);
    const month = num(req.query.month, 'month', 1, 12);
    res.json(tamilMonth(year, month - 1, loc.lat, loc.lon, loc.tz));
  });

  /** Thirumana Porutham. Body: { girl, boy } each either { star, rasi } or a birth object like /api/chart. */
  app.post('/api/porutham', (req, res) => {
    const side = (x, who) => {
      if (x && x.date) {
        const c = birthChart(parseBirth(x));
        return { star: c.janmaNakshatra.index, rasi: c.janmaRasi.index, doshams: doshams(c.planets) };
      }
      return { star: num(x?.star, `${who}.star`, 0, 26), rasi: num(x?.rasi, `${who}.rasi`, 0, 11) };
    };
    const girl = side(req.body?.girl, 'girl');
    const boy = side(req.body?.boy, 'boy');
    const result = matchPorutham(girl, boy);
    if (girl.doshams && boy.doshams) Object.assign(result, { doshams: { girl: girl.doshams, boy: boy.doshams }, samyam: doshaSamyam(girl.doshams, boy.doshams) });
    res.json(result);
  });

  /** Muhurtham finder. Body: { category, loc, persons:[{name,janmaNakshatra,janmaRasi}], days? } */
  app.post('/api/muhurtham', (req, res) => {
    const { category, persons = [], days = 30 } = req.body || {};
    if (!getCategory(category)) throw new BadRequest('Unknown category');
    const loc = parseLoc(req.body.loc || {});
    if (!Array.isArray(persons) || persons.length > 8) throw new BadRequest('Invalid persons');
    const ps = persons.map((p, i) => ({ name: String(p.name || `Person ${i + 1}`).slice(0, 40), janmaNakshatra: num(p.janmaNakshatra, 'janmaNakshatra', 0, 26), janmaRasi: num(p.janmaRasi, 'janmaRasi', 0, 11) }));
    res.json(findMuhurtham({ category, loc, persons: ps, days: num(days, 'days', 1, 90) }));
  });

  /**
   * AI tasks: POST /api/ai/chat | /api/ai/porutham | /api/ai/names
   * Body: { context, messages?:[{role,content}], lang, fallbackText, birth?, speaker?, subject?, participants?,
   *   sessionFlags?, sessionId?, country?, loc? } — SSE: policy → delta (the whole, validated reply) → done.
   * Safety / decline / clarify answers are reviewed templates: no chart work, no model call, no login or quota.
   * Ordinary questions: the model explains the app's own facts (context); its draft is validated before it is
   * shown, otherwise the app's built-in answer (fallbackText) is sent.
   */
  app.post('/api/ai/:task', async (req, res) => {
    const { task } = req.params;
    if (!AI_TASKS[task]) throw new BadRequest('Unknown task');
    const { context = {}, messages = [], lang = 'en', fallbackText = '' } = req.body || {};
    if (JSON.stringify(context).length > 20000) throw new BadRequest('Context too large');
    if (!Array.isArray(messages) || messages.length > 24) throw new BadRequest('Invalid messages');
    const msgs = messages.map((m) => {
      if (!['user', 'assistant'].includes(m?.role) || typeof m.content !== 'string' || !m.content.trim()) throw new BadRequest('Invalid message');
      return { role: m.role, content: m.content.slice(0, 2000) };
    });
    if (msgs.length && (msgs[0].role !== 'user' || msgs[msgs.length - 1].role !== 'user')) throw new BadRequest('Conversation must start and end with the person');
    const wantsStream = (req.headers.accept || '').includes('text/event-stream');
    const started = Date.now();
    const user = currentUser(req);
    const { intent, ctx: pctx, decision } = await evaluatePolicy({ body: req.body, user, turns: msgs.filter((m) => m.role === 'user').map((m) => m.content), lang });

    const respond = (payload, source) => {
      if (!wantsStream) return res.json(payload);
      const send = openStream(res);
      const { reply, ...meta } = payload;
      send('policy', meta);
      send('delta', { text: reply });
      send('done', { source, route: decision.route });
      return res.end();
    };

    const trace = traceFor(pctx, req.body);
    if (!decision.allowAstrology) {
      const t = templateAnswer(decision, pctx, lang);
      audit(`ai:${task}`, { decision, ctx: pctx, intent, source: 'policy', latencyMs: Date.now() - started, trace });
      return respond({ reply: t.text, source: 'policy', route: decision.route, policy: publicPolicy(decision, pctx), resources: t.resources, trace }, 'policy');
    }

    if (process.env.AI_REQUIRE_LOGIN === '1' && !user) return res.status(401).json({ error: 'Please sign in to use the AI Jothidar' });
    if (aiRateLimited(req.ip)) return res.status(429).json({ error: 'Too many questions — please wait a few minutes' });
    const metered = billingEnforced();
    const quota = metered ? checkAiQuota(req) : null;
    if (quota && !quota.allowed) {
      return res.status(402).json(quota.period === 'month'
        ? { error: `Monthly AI allowance of ${quota.limit} answers reached — built-in guidance keeps working`, upgrade: false }
        : { error: 'Free daily AI limit reached — built-in guidance keeps working; the Personal plan includes a monthly AI allowance', upgrade: true });
    }

    // Evidence: a server-computed chart when birth details are sent; otherwise the app's deterministic facts
    // (minimised: names, birth data, places and relations are dropped). Today's date is added as a fact.
    let chart = null;
    if (req.body?.birth) { try { chart = birthChart(parseBirth(req.body.birth)); } catch { chart = null; } }
    const evidence = buildEvidence({ chart, clientContext: context });
    const today = pctx.reference?.date;
    if (today) { evidence.facts.unshift({ id: 'NOW.date', text: `Today's date: ${today}`, source: 'engine', rule: 'server-clock' }); evidence.ids.unshift('NOW.date'); }
    decision.permittedEvidenceIds = evidence.ids;
    const r = await runTask({
      task, evidence, messages: msgs, lang, decision,
      onUsage: (u) => recordAiCost({ userId: user?.id || null, task, model: u.model, usage: u }),
    });
    if (metered) recordAiUsage(req);
    let reply = r.text;
    let templateId = null;
    if (!reply) {
      const adultLove = r.validation.status === 'not_run' && intent.flags.romanticOrSexual && pctx.speaker.minor === false;
      if (adultLove) { templateId = 'adult_love_any_age'; reply = templateText('adult_love_any_age', lang); }
      // The app's own built-in answer (deterministic, computed on the device) — or a reviewed fallback.
      else reply = String(fallbackText).slice(0, 4000) || templateText('validation_fallback', lang);
    }
    const cited = r.answer?.claims?.flatMap((c) => c.evidenceIds);
    audit(`ai:${task}`, { decision, ctx: pctx, intent, validation: r.validation.status, validationErrors: r.validation.errors, source: r.source, latencyMs: Date.now() - started, trace });
    return respond({
      reply, source: r.source, route: decision.route, policy: publicPolicy(decision, pctx, templateId ? { templateId } : {}),
      evidence: r.answer ? publicEvidence(evidence, cited) : [],
      claims: r.answer?.claims || [], uncertainty: r.answer?.uncertainty || null, nextSteps: r.answer?.nextSteps || [],
      validation: r.validation.status,
      notice: r.source === 'ai' ? null : templateText('no_ai_notice', lang),
      trace,
    }, r.source);
  });

  app.use('/shared', express.static(path.join(root, 'shared')));
  app.get('/vendor/astronomy-engine.js', (_req, res) => {
    res.sendFile(path.join(root, 'node_modules/astronomy-engine/esm/astronomy.js'));
  });
  app.use(express.static(path.join(root, 'public')));

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request too large' });
    if (err instanceof BadRequest || err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  });
  return app;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT) || 3000;
  createApp().listen(port, '0.0.0.0', () => {
    console.log(`🪔 ${BRAND.name} running at http://localhost:${port}  (AI: ${aiEnabled() ? 'Claude' : 'rule-based'})`);
    startPushScheduler();
    startBackupSchedule();
  });
}
