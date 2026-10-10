// Thunai Engine (server/web-search.js): only category + city + keywords go to the model, items must cite this
// search's own result pages, invented links are dropped, and the route degrades to the app's links when AI is off.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
process.env.DB_PATH = ':memory:';
const { createApp } = await import('../server/index.js');
const { buildSearchRequest, cleanResults, resultSources, setSearchCallerForTests, SEARCH_CATEGORIES } = await import('../server/web-search.js');

let server, base;
before(async () => { server = createApp().listen(0); await new Promise((r) => server.once('listening', r)); base = `http://127.0.0.1:${server.address().port}`; });
after(() => { setSearchCallerForTests(null); server.close(); });
const post = (body) => fetch(`${base}/api/foryou/search`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

const RESULTS = [{ type: 'server_tool_use', id: 's1', name: 'web_search', input: { query: 'cardiology hospital Chennai' } },
  { type: 'web_search_tool_result', tool_use_id: 's1', content: [
    { type: 'web_search_result', url: 'https://www.ggh-chennai.example.gov.in/cardio', title: 'GH Cardiology' },
    { type: 'web_search_result', url: 'https://heartcare.example.com/', title: 'Heart Care' }] }];
const answer = (items) => ({ stop_reason: 'end_turn', model: 'claude-opus-5-5', usage: { input_tokens: 1, output_tokens: 1 },
  content: [...RESULTS, { type: 'text', text: JSON.stringify({ summary: 'Two options found.', items }) }] });

test('the request carries only category, city, country and keywords — with the web search tool', () => {
  const p = buildSearchRequest({ category: 'hospital', place: 'Chennai, Tamil Nadu, India', cc: 'IN', keywords: ['cardiology'], lang: 'ta' });
  assert.equal(p.tools[0].type, 'web_search_20260209');
  assert.equal(p.tools[0].user_location.city, 'Chennai');
  const text = JSON.stringify(p.messages);
  assert.match(text, /cardiology/); assert.match(text, /lang: ta/);
  assert.doesNotMatch(text, /19\d\d-\d\d-\d\d|nakshatra|lagna/i);
  assert.ok(Object.keys(SEARCH_CATEGORIES).includes('lawyer'));
});

test('items whose URL is not from this search are dropped; phone is sanitised', () => {
  const src = resultSources(RESULTS);
  const r = cleanResults(JSON.stringify({ summary: 's', items: [
    { name: 'GH', kind: 'government', why: 'x', phone: '044-2530 5000 <b>', url: 'https://www.ggh-chennai.example.gov.in/cardio' },
    { name: 'Made up', kind: 'private', why: 'x', url: 'https://invented.example.org/' },
  ] }), src);
  assert.equal(r.items.length, 1); assert.equal(r.dropped, 1);
  assert.equal(r.items[0].phone, '044-2530 5000');
  assert.equal(r.items[0].source, 'ggh-chennai.example.gov.in');
  assert.deepEqual(cleanResults('not json', src).items, []);
});

test('route: 400 for an unknown category, 503 (offline) when AI is off', async () => {
  delete process.env.ANTHROPIC_API_KEY; delete process.env.ANTHROPIC_AUTH_TOKEN;
  assert.equal((await post({ category: 'astrology', place: 'Chennai' })).status, 400);
  const r = await post({ category: 'job', place: 'Chennai', keywords: ['accountant'] });
  assert.equal(r.status, 503); assert.equal((await r.json()).offline, true);
});

test('route: returns cleaned, cited results from the engine', async () => {
  process.env.ANTHROPIC_API_KEY = 'test-key';
  setSearchCallerForTests(async () => answer([
    { name: 'Govt General Hospital — Cardiology', kind: 'government', why: 'அரசு இதய சிகிச்சை', url: 'https://www.ggh-chennai.example.gov.in/cardio' },
    { name: 'Fake Clinic', kind: 'private', why: 'x', url: 'https://nowhere.example.net/' },
  ]));
  const r = await post({ category: 'hospital', place: 'Chennai', cc: 'IN', keywords: ['cardiology'], lang: 'ta' });
  assert.equal(r.status, 200);
  const j = await r.json();
  assert.equal(j.items.length, 1); assert.equal(j.dropped, 1);
  assert.ok(j.searched.includes('heartcare.example.com'));
  setSearchCallerForTests(async () => { throw new Error('boom'); });
  const bad = await post({ category: 'job', place: 'Chennai', keywords: ['x'] });
  assert.equal(bad.status, 502); assert.equal((await bad.json()).offline, true);
  delete process.env.ANTHROPIC_API_KEY;
});
