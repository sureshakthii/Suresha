import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { birthChart, panchang } from '../shared/astro.js';
import { CATEGORIES, evaluatePrasna, getCategory } from '../shared/prasna.js';
import { searchLocalPlaces, searchOnline } from './places.js';
import { aiEnabled, buildContext, generateReply } from './ai.js';

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
  app.use(express.json({ limit: '64kb' }));

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
   * Ask the Jothidar. Body: { category, question?, lang?, loc:{lat,lon,tz,name}, birth?:{date,time,lat,lon,tz,...} }
   * Streams Server-Sent Events when the client accepts text/event-stream, else returns JSON.
   */
  app.post('/api/ask', async (req, res) => {
    const { category, question = '', lang = 'en' } = req.body || {};
    if (!getCategory(category)) throw new BadRequest('Unknown category');
    const loc = parseLoc(req.body.loc || {});
    let chart = null;
    if (req.body.birth) chart = birthChart(parseBirth(req.body.birth));

    const birth = chart && { janmaNakshatra: chart.janmaNakshatra.index, janmaRasi: chart.janmaRasi.index };
    const evaluation = evaluatePrasna({ at: new Date(), category, loc, birth });
    const profile = chart && {
      name: chart.name,
      janmaNakshatraName: chart.janmaNakshatra.name,
      janmaRasiName: chart.janmaRasi.name,
      lagnaName: chart.lagna.rasiName,
      currentDasa: chart.dasa.current && `${chart.dasa.current.lord} Dasa / ${chart.dasa.currentBhukti?.lord} Bhukti`,
    };
    const ctx = buildContext({ evaluation, question: String(question).slice(0, 500), category, lang, profile, loc });
    const summary = {
      category, score: evaluation.score, verdict: evaluation.verdict, verdictText: evaluation.verdictText,
      factors: evaluation.factors, bestTimes: evaluation.bestTimes,
      snapshot: {
        at: evaluation.snapshot.at, nakshatra: evaluation.snapshot.nakshatra, tithi: evaluation.snapshot.tithi,
        currentHora: evaluation.snapshot.currentHora, lagna: evaluation.snapshot.lagna, moonRasi: evaluation.snapshot.moonRasi,
      },
    };

    const wantsStream = (req.headers.accept || '').includes('text/event-stream');
    if (!wantsStream) {
      const reply = await generateReply({ ctx, evaluation, lang });
      return res.json({ ...summary, reply: reply.text, source: reply.source });
    }

    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    send('evaluation', summary);
    const reply = await generateReply({
      ctx, evaluation, lang,
      onText: (t) => send('delta', { text: t }),
      onReset: () => send('reset', {}),
    });
    send('done', { source: reply.source });
    res.end();
  });

  app.use('/shared', express.static(path.join(root, 'shared')));
  app.get('/vendor/astronomy-engine.js', (_req, res) => {
    res.sendFile(path.join(root, 'node_modules/astronomy-engine/esm/astronomy.js'));
  });
  app.use(express.static(path.join(root, 'public')));

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
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
    console.log(`🪐 Kaippesi Jothidar running at http://localhost:${port}  (AI: ${aiEnabled() ? 'Claude' : 'rule-based'})`);
  });
}
