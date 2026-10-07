import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server/index.js';
import { CATEGORIES, scoreSnapshot } from '../shared/prasna.js';
import { panchang } from '../shared/astro.js';

// Own in-memory database: the SQLite-backed rate limiter (server/admin.js) would otherwise share
// data/kaippesi.db — and its per-IP window — with every other test file running in parallel.
process.env.DB_PATH = ':memory:';
delete process.env.ANTHROPIC_API_KEY;
delete process.env.ANTHROPIC_AUTH_TOKEN;
let server, base;
before(async () => {
  server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

const post = (path, body, headers = {}) => fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
const loc = { lat: 13.0827, lon: 80.2707, tz: 5.5, name: 'Chennai' };
const birth = { name: 'Test', date: '1990-01-01', time: '10:00:00', lat: 13.0827, lon: 80.2707, tz: 5.5, place: 'Chennai' };

test('health + categories', async () => {
  assert.deepEqual(await (await fetch(`${base}/api/health`)).json(), { ok: true, ai: false });
  const cats = await (await fetch(`${base}/api/categories`)).json();
  for (const id of ['surgery', 'cheque', 'meeting', 'client', 'bride_groom', 'court', 'office', 'contract']) {
    assert.ok(cats.some((c) => c.id === id), id);
  }
});

test('places search finds Tamil Nadu cities offline', async () => {
  const r = await (await fetch(`${base}/api/places?q=madu&online=0`)).json();
  assert.equal(r[0].name, 'Madurai');
});

test('chart endpoint validates and returns a chart', async () => {
  assert.equal((await post('/api/chart', { date: 'x' })).status, 400);
  const c = await (await post('/api/chart', birth)).json();
  assert.equal(c.janmaRasi.name, 'Kumbha');
  assert.equal(c.charts.rasi.length, 12);
});

test('panchang endpoint', async () => {
  const s = await (await fetch(`${base}/api/panchang?lat=13.08&lon=80.27&tz=5.5`)).json();
  assert.ok(s.nakshatra.name && s.currentHora.lord && s.rahuKalam.start);
});

test('ask (JSON) returns verdict, factors and a reply for every category', async () => {
  for (const c of CATEGORIES) {
    const r = await (await post('/api/ask', { category: c.id, loc, birth, lang: 'en' })).json();
    assert.ok(['DO', 'CAUTION', 'AVOID'].includes(r.verdict), c.id);
    assert.ok(r.score >= 0 && r.score <= 100);
    assert.ok(r.factors.some((f) => f.key === 'tara'));
    assert.ok(r.reply.length > 20);
    assert.equal(r.source, 'rules');
  }
  assert.equal((await post('/api/ask', { category: 'nope', loc })).status, 400);
});

test('ask (SSE) streams evaluation, delta and done events', async () => {
  const res = await post('/api/ask', { category: 'contract', loc, lang: 'ta' }, { Accept: 'text/event-stream' });
  const text = await res.text();
  assert.match(text, /event: evaluation/);
  assert.match(text, /event: delta/);
  assert.match(text, /event: done/);
});

test('Rahu Kalam and Chandrashtamam pull the score down', () => {
  const s = panchang(new Date('2026-09-28T06:00:00Z'), 13.0827, 80.2707, 5.5);
  const base = scoreSnapshot({ ...s, inRahuKalam: false }, 'contract').score;
  const rahu = scoreSnapshot({ ...s, inRahuKalam: true }, 'contract').score;
  assert.ok(rahu < base);
  const eighth = (s.moonRasi.index - 7 + 12) % 12;
  const f = scoreSnapshot(s, 'contract', { janmaNakshatra: 0, janmaRasi: eighth }).factors;
  assert.ok(f.some((x) => x.key === 'chandrashtama'));
});

test('POST /api/chart honours IANA zone and unknown birth time', async () => {
  const war = await post('/api/chart', { name: 'T', date: '1943-06-01', time: '10:00', lat: 13.08, lon: 80.27, zone: 'Asia/Kolkata' });
  assert.equal(war.status, 200);
  assert.equal(new Date((await war.json()).utc).toISOString(), '1943-06-01T03:30:00.000Z'); // wartime +6:30
  const unk = await post('/api/chart', { name: 'U', date: '1990-05-01', lat: 13.08, lon: 80.27, tz: 5.5, timePrecision: 'unknown' });
  assert.equal(unk.status, 200);
  assert.equal((await unk.json()).lagna, null);
  assert.equal((await post('/api/chart', { date: '1990-05-01', time: '10:00', lat: 13, lon: 80, zone: 'Mars/Base' })).status, 400);
});
