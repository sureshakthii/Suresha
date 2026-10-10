import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { tamilDay, tamilMonth, tamilDate } from '../shared/tamilcal.js';
import { matchPorutham, doshams } from '../shared/porutham.js';
import { grahaStrength, dailyParigaram, NAVAGRAHA } from '../shared/remedies.js';
import { nameLetters, thivasamDates, natchathiraBirthdays, findMuhurtham } from '../shared/special.js';
import { birthChart } from '../shared/astro.js';

const loc = { lat: 13.0827, lon: 80.2707, tz: 5.5 };
const noon = (y, m, d) => new Date(Date.UTC(y, m - 1, d, 12) - 5.5 * 3600000);

test('Tamil calendar: Pongal, Tamil New Year and year names', () => {
  const pongal = tamilDay(noon(2026, 1, 14), loc.lat, loc.lon, loc.tz);
  assert.equal(pongal.tamil.monthEn, 'Thai');
  assert.equal(pongal.tamil.day, 1);
  assert.ok(pongal.festivals.some((f) => f.en === 'Thai Pongal'));
  assert.equal(pongal.tamil.year.en, 'Visuvaavasu');
  const ny = tamilDay(noon(2026, 4, 14), loc.lat, loc.lon, loc.tz);
  assert.equal(ny.tamil.monthEn, 'Chithirai');
  assert.equal(ny.tamil.day, 1);
  assert.equal(ny.tamil.year.en, 'Parabhava');
  const margazhi = tamilDate(noon(2026, 1, 5), loc.lat, loc.lon, loc.tz);
  assert.equal(margazhi.year.en, 'Visuvaavasu');
});

test('Tamil calendar: Deepavali 2025 and Gowri slots', () => {
  const d = tamilDay(noon(2025, 10, 20), loc.lat, loc.lon, loc.tz);
  assert.ok(d.festivals.some((f) => f.en === 'Deepavali'));
  assert.equal(d.gowri.length, 16);
  assert.ok(d.nallaNeram.length >= 3);
  const month = tamilMonth(2026, 0, loc.lat, loc.lon, loc.tz);
  assert.equal(month.length, 31);
  // Consecutive Tamil dates never skip.
  for (let i = 1; i < month.length; i++) {
    const a = month[i - 1].tamil, b = month[i].tamil;
    assert.ok(b.day === a.day + 1 || b.day === 1, `${month[i].date}: ${a.day} -> ${b.day}`);
  }
});

test('Porutham: Rajju and Vedhai are reported as key factors to discuss — no verdict, no combined score', () => {
  // Ashwini (0) & Magam (9): same Paada rajju.
  const r = matchPorutham({ star: 0, rasi: 0 }, { star: 9, rasi: 4 });
  assert.equal(r.rows.find((x) => x.key === 'rajju').status, 'poruthamillai');
  assert.equal(r.verdict, undefined);
  assert.equal(r.noVerdict, true);
  assert.equal(r.agree, r.rows.filter((x) => x.status !== 'poruthamillai').length);
  assert.deepEqual(r.keyFactors.map((k) => k.key), ['rajju', 'vedhai']);
  assert.match(r.summary.en, new RegExp(`^${r.agree} of 10 traditional factors agree`));
  assert.match(r.summary.en, /Rajju does not agree — see the key factors to discuss together/);
  assert.ok(r.rows.every((x) => x.basis.en && x.basis.ta && x.label.en && x.label.ta));
  const words = JSON.stringify(r);
  assert.doesNotMatch(words, /Not recommended|பொருத்தம் இல்லை|Excellent match|blessed|\/100|%/);
  // Ashwini & Kettai are a Vedha pair.
  const v = matchPorutham({ star: 0, rasi: 0 }, { star: 17, rasi: 7 });
  assert.equal(v.rows.find((x) => x.key === 'vedhai').status, 'poruthamillai');
  const ok = matchPorutham({ star: 3, rasi: 1 }, { star: 12, rasi: 5 });
  assert.equal(ok.rows.length, 10);
  assert.ok(ok.score >= 0 && ok.score <= 10);
});

test('Doshams, graha strength and daily parigaram', () => {
  const c = birthChart({ name: 'T', date: '1990-01-01', time: '10:00', ...loc });
  const d = doshams(c.planets);
  assert.equal(typeof d.chevvai.present, 'boolean');
  const gs = grahaStrength(c.planets);
  assert.equal(gs.length, 9);
  for (const g of gs) assert.ok(g.score >= 0 && g.score <= 100);
  const items = dailyParigaram({ weekday: 6, chart: c });
  assert.equal(items[0].planet, 'Saturn');
  assert.ok(NAVAGRAHA.Saturn.temple.en.includes('Thirunallar'));
});

test('Name letters, Thivasam and Natchathira birthday', () => {
  assert.deepEqual(nameLetters(0, 1).primary, { pada: 1, en: 'Chu', ta: 'சு' });
  const th = thivasamDates({ death: new Date('2019-08-12T10:00:00Z'), loc, from: new Date('2026-01-01T00:00:00Z') });
  assert.equal(th.month.en, 'Aadi');
  assert.ok(th.dates.length >= 1 && th.dates[0].tamil.monthEn === 'Aadi');
  const nb = natchathiraBirthdays({ birthStar: 4, birthTamilMonth: 10, loc, from: new Date('2026-01-01T00:00:00Z'), count: 1 });
  assert.equal(nb[0].tamil.monthEn, 'Maasi');
});

test('Muhurtham finder never offers Rahu Kalam, Tuesday/Saturday or Aadi for marriage', () => {
  const res = findMuhurtham({ category: 'marriage', loc, persons: [{ name: 'A', janmaNakshatra: 3, janmaRasi: 1 }], from: new Date('2026-07-10T00:00:00Z'), days: 45 });
  for (const w of res) {
    assert.ok(![2, 6].includes(w.weekday.index));
    assert.ok(!w.factors.some((f) => f.key === 'rahu' || f.key === 'yama'));
  }
  // Aadi 2026 is roughly 17 Jul – 16 Aug: nothing inside it.
  assert.ok(res.every((w) => w.date < '2026-07-17' || w.date > '2026-08-16'));
});

let server, base;
before(async () => {
  process.env.DB_PATH = ':memory:';
  const { createApp } = await import('../server/index.js');
  server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());
const post = (p, body) => fetch(base + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

test('API: calendar, porutham, muhurtham and AI task endpoints', async () => {
  const cal = await (await fetch(`${base}/api/calendar?year=2026&month=1&lat=13.08&lon=80.27&tz=5.5`)).json();
  assert.equal(cal.length, 31);
  const por = await (await post('/api/porutham', { girl: { star: 3, rasi: 1 }, boy: { star: 12, rasi: 5 } })).json();
  assert.equal(por.rows.length, 10);
  const full = await (await post('/api/porutham', {
    girl: { date: '1995-03-10', time: '08:15', ...loc }, boy: { date: '1992-11-22', time: '19:40', ...loc },
  })).json();
  assert.ok(full.doshams && full.samyam.length >= 1);
  const mu = await (await post('/api/muhurtham', { category: 'naming', loc, days: 10 })).json();
  assert.ok(Array.isArray(mu));
  delete process.env.ANTHROPIC_API_KEY;
  const ai = await (await post('/api/ai/chat', { context: { a: 1 }, messages: [{ role: 'user', content: 'Hi' }], lang: 'ta', fallbackText: 'fallback' })).json();
  assert.equal(ai.reply, 'fallback');
  assert.equal((await post('/api/ai/nope', {})).status, 400);
  assert.equal((await post('/api/ai/chat', { messages: [{ role: 'assistant', content: 'x' }] })).status, 400);
});
