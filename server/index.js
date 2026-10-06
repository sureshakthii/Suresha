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
import { billingEnforced, billingRouter, checkAiQuota, recordAiUsage } from './billing.js';
import { growthRouter } from './growth.js';
import { tamilMonth } from '../shared/tamilcal.js';
import { matchPorutham, doshams, doshaSamyam } from '../shared/porutham.js';
import { findMuhurtham } from '../shared/special.js';
import { AI_TASKS, DEADLINE_FIRST } from '../shared/narrator.js';
import { evaluatePolicy, templateAnswer, deadlineNote, publicPolicy, audit, buildEvidence, publicEvidence, templateText } from './policy/index.js';
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

function parseBirth(b) {
  if (!b || typeof b !== 'object') throw new BadRequest('Missing birth details');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.date || '')) throw new BadRequest('Invalid date (YYYY-MM-DD)');
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(b.time || '')) throw new BadRequest('Invalid time (HH:MM)');
  const loc = parseLoc(b);
  return {
    name: String(b.name || 'Guest').slice(0, 80),
    place: String(b.place || loc.name || '').slice(0, 120),
    date: b.date, time: b.time, lat: loc.lat, lon: loc.lon, tz: loc.tz,
  };
}

export function createApp() {
  const app = express();
  if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);
  app.use('/api/billing/stripe/webhook', express.raw({ type: '*/*', limit: '256kb' })); // Stripe signs the raw bytes
  app.use('/api/me/data', express.json({ limit: '256kb' })); // saved family profiles can be larger
  app.use(express.json({ limit: '64kb' }));
  app.use('/api', authRouter());
  app.use('/api', weatherRouter());
  app.use('/api', pushRouter());
  app.use('/api', marketRouter());
  app.use('/api', billingRouter());
  app.use('/api', growthRouter());
  app.use('/api', policyRouter());

  app.get('/api/health', (_req, res) => res.json({ ok: true, ai: aiEnabled() }));

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
   * Ask the Jothidar (Prasnam). Body: { category, question?, lang?, loc:{lat,lon,tz,name}, birth?:{date,time,lat,lon,tz,relation?,...},
   *   speaker?, subject?, participants?, sessionFlags?, sessionId?, country? } — see docs/AI-SAFETY-POLICY.md.
   * Policy runs FIRST: when astrology is not allowed no chart or Prasna is computed and a reviewed template is returned.
   * Streams Server-Sent Events when the client accepts text/event-stream (validated text arrives as one delta), else JSON.
   */
  app.post('/api/ask', async (req, res) => {
    const { category, question = '', lang = 'en' } = req.body || {};
    if (!getCategory(category)) throw new BadRequest('Unknown category');
    const loc = parseLoc(req.body.loc || {});
    const birthIn = req.body.birth ? parseBirth(req.body.birth) : null;
    const q = String(question).slice(0, 500);
    const wantsStream = (req.headers.accept || '').includes('text/event-stream');
    const started = Date.now();
    const { intent, ctx: pctx, decision } = await evaluatePolicy({ body: req.body, user: currentUser(req), turns: q.trim() ? [q] : [], lang, category });

    if (!decision.allowAstrology) {
      const t = templateAnswer(decision, pctx, lang);
      const policy = publicPolicy(decision, pctx);
      audit('ask', { decision, ctx: pctx, intent, source: 'policy', latencyMs: Date.now() - started });
      const payload = { category, route: decision.route, reply: t.text, source: 'policy', policy, resources: t.resources };
      if (!wantsStream) return res.json(payload);
      const send = openStream(res);
      send('policy', { ...policy, resources: t.resources });
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
      lagnaName: chart.lagna.rasiName,
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
    const reply = await generateReply({ ctx, evaluation, lang, decision, evidence, practicalNote: note });
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
    };
    audit('ask', { decision, ctx: pctx, intent, validation: reply.validation.status, validationErrors: reply.validation.errors, source: reply.source, latencyMs: Date.now() - started });
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
   *   sessionFlags?, sessionId?, country?, loc? } — SSE like /api/ask (policy → delta (validated, whole) → done).
   * Safety/decline/clarify answers are reviewed templates: no chart work, no model call, no login or quota needed.
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

    if (!decision.allowAstrology) {
      const t = templateAnswer(decision, pctx, lang);
      audit(`ai:${task}`, { decision, ctx: pctx, intent, source: 'policy', latencyMs: Date.now() - started });
      return respond({ reply: t.text, source: 'policy', route: decision.route, policy: publicPolicy(decision, pctx), resources: t.resources }, 'policy');
    }

    if (process.env.AI_REQUIRE_LOGIN === '1' && !user) return res.status(401).json({ error: 'Please sign in to use the AI Jothidar' });
    if (aiRateLimited(req.ip)) return res.status(429).json({ error: 'Too many questions — please wait a few minutes' });
    const metered = billingEnforced();
    if (metered && !checkAiQuota(req).allowed) return res.status(402).json({ error: 'Free daily limit reached — upgrade to Premium for unlimited answers', upgrade: true });

    // Evidence: a server-computed chart when birth details are sent; otherwise the client's deterministic facts
    // (minimised: names, birth data, places and relations are dropped).
    let chart = null;
    if (req.body?.birth) { try { chart = birthChart(parseBirth(req.body.birth)); } catch { chart = null; } }
    const evidence = buildEvidence({ chart, clientContext: context });
    decision.permittedEvidenceIds = evidence.ids;
    const r = await runTask({ task, evidence, messages: msgs, lang, decision });
    if (metered) recordAiUsage(req);
    let reply = r.text;
    let templateId = null;
    if (!reply) {
      if (r.validation.status === 'not_run') {
        // No AI configured: only deterministic app text or an approved template, with a limited-capability notice.
        const adultLove = intent.flags.romanticOrSexual && pctx.speaker.minor === false;
        templateId = adultLove ? 'adult_love_any_age' : null;
        reply = adultLove ? templateText('adult_love_any_age', lang) : (String(fallbackText).slice(0, 4000) || '🙏');
      } else {
        templateId = 'validation_fallback';
        reply = templateText('validation_fallback', lang);
      }
    }
    const cited = r.answer?.claims?.flatMap((c) => c.evidenceIds);
    audit(`ai:${task}`, { decision, ctx: pctx, intent, validation: r.validation.status, validationErrors: r.validation.errors, source: r.source, latencyMs: Date.now() - started });
    return respond({
      reply, source: r.source, route: decision.route, policy: publicPolicy(decision, pctx, templateId ? { templateId } : {}),
      evidence: r.answer ? publicEvidence(evidence, cited) : [],
      claims: r.answer?.claims || [], uncertainty: r.answer?.uncertainty || null, nextSteps: r.answer?.nextSteps || [],
      validation: r.validation.status,
      notice: r.source === 'ai' ? null : templateText('no_ai_notice', lang),
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
    console.log(`🪐 Thunai running at http://localhost:${port}  (AI: ${aiEnabled() ? 'Claude' : 'rule-based'})`);
    startPushScheduler();
  });
}
