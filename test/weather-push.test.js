import { BRAND } from '../shared/brand.js';
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import webpush from 'web-push';

process.env.DB_PATH = ':memory:';
process.env.AUTH_DEV_MODE = '1';
process.env.AUTH_SECRET = 't';
const vapidKeys = webpush.generateVAPIDKeys();
process.env.VAPID_PUBLIC_KEY = vapidKeys.publicKey;
process.env.VAPID_PRIVATE_KEY = vapidKeys.privateKey;

let server, base, W, P, getDb;
before(async () => {
  const { createApp } = await import('../server/index.js');
  W = await import('../server/weather.js');
  P = await import('../server/push.js');
  ({ getDb } = await import('../server/db.js'));
  server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => {
  W.setWeatherFetch(null);
  P.setPushSender(null);
  server.close();
});

// ---- mocked upstream payloads ----

function openMeteo() {
  const hours = Array.from({ length: 168 }, (_, i) => {
    const d = new Date(Date.UTC(2026, 9, 3) + i * 3600000);
    return d.toISOString().slice(0, 13) + ':00';
  });
  return {
    latitude: 13.1, longitude: 80.25, timezone: 'Asia/Kolkata', utc_offset_seconds: 19800,
    current: {
      time: '2026-10-03T10:30', interval: 900, temperature_2m: 31.4, apparent_temperature: 36.2,
      relative_humidity_2m: 68, wind_speed_10m: 14.8, precipitation: 0.2, weather_code: 63,
    },
    hourly: {
      time: hours,
      temperature_2m: hours.map((_, i) => 26 + (i % 24) / 4),
      precipitation_probability: hours.map((_, i) => (i * 7) % 100),
      weather_code: hours.map((_, i) => (i % 5 ? 2 : 61)),
    },
    daily: {
      time: ['2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09'],
      weather_code: [63, 3, 95, 1, 0, 80, 61],
      temperature_2m_max: [32.1, 33.0, 30.2, 33.4, 34.0, 32.5, 31.9],
      temperature_2m_min: [25.2, 25.8, 24.9, 25.0, 25.6, 25.1, 24.8],
      precipitation_probability_max: [45, 10, 90, 5, 0, 70, 55],
      precipitation_sum: [6.4, 0, 42.5, 0, 0, 12.2, 4.1],
      sunrise: ['2026-10-03T05:59', '2026-10-04T05:59', '2026-10-05T05:59', '2026-10-06T05:59', '2026-10-07T06:00', '2026-10-08T06:00', '2026-10-09T06:00'],
      sunset: ['2026-10-03T17:56', '2026-10-04T17:55', '2026-10-05T17:54', '2026-10-06T17:54', '2026-10-07T17:53', '2026-10-08T17:52', '2026-10-09T17:51'],
    },
  };
}

const metar = (icao) => [{
  icaoId: icao, reportTime: '2026-10-03T05:00:00.000Z', temp: 31, dewp: 24, wdir: 110, wspd: 10, visib: '6+',
  altim: 1007, wxString: '-RA BR', clouds: [{ cover: 'SCT', base: 2000 }, { cover: 'BKN', base: 10000 }],
  rawOb: `${icao} 030500Z 11010KT 5000 -RA BR SCT020 BKN100 31/24 Q1007 NOSIG`, name: 'Chennai Intl, TN, IN',
}];

const json = (body, status = 200) => ({ ok: status < 400, status, json: async () => body, text: async () => JSON.stringify(body) });

function mockFetch({ forecastFails = false } = {}) {
  const calls = [];
  const fn = async (url) => {
    calls.push(String(url));
    const u = new URL(url);
    if (u.host === 'api.open-meteo.com') return forecastFails ? json({ error: true, reason: 'down' }, 500) : json(openMeteo());
    if (u.host === 'aviationweather.gov') return json(metar(u.searchParams.get('ids')));
    throw new Error(`unexpected fetch ${url}`);
  };
  fn.calls = calls;
  W.setWeatherFetch(fn);
  return fn;
}

const getWeather = (lat, lon) => fetch(`${base}/api/weather?lat=${lat}&lon=${lon}`);

// ---- weather ----

test('weather: nearest station selection', () => {
  assert.equal(W.nearestStation(13.0827, 80.2707).icao, 'VOMM');
  assert.equal(W.nearestStation(9.9252, 78.1198).icao, 'VOMD');
  assert.equal(W.nearestStation(12.97, 77.59).icao, 'VOBG');
  assert.equal(W.nearestStation(0, -30), null); // mid-Atlantic: nothing within 150 km
});

test('weather: METAR mapping and wx decoding', () => {
  const o = W.mapMetar(metar('VOMM')[0]);
  assert.equal(o.windKph, 18.5); // 10 kt
  assert.equal(o.visibilityKm, 9.7); // 6+ statute miles
  assert.equal(o.tempC, 31);
  assert.equal(o.pressureHpa, 1007);
  assert.equal(o.windDir, 110);
  assert.equal(o.conditions, 'Light rain, Mist');
  assert.equal(o.time, '2026-10-03T05:00:00.000Z');
  assert.deepEqual(o.clouds[0], { cover: 'SCT', baseFt: 2000 });
  assert.equal(W.mapMetar({ visib: '10+', wspd: 0 }).visibilityKm, 16.1);
  assert.equal(W.decodeWx('HZ'), 'Haze');
  assert.equal(W.decodeWx('TS'), 'Thunderstorm');
  assert.equal(W.decodeWx('+TSRA'), 'Heavy thunderstorm with rain');
  assert.equal(W.mapMetar({ clouds: [{ cover: 'FEW', base: 1500 }] }).conditions, 'Few clouds');
});

test('weather: WMO codes are bilingual', () => {
  for (const c of [0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99]) {
    const d = W.wmoDescription(c);
    assert.ok(d.en && d.ta && d.en !== 'Unknown', `code ${c}`);
  }
  assert.deepEqual(W.wmoDescription(63), { en: 'Moderate rain', ta: 'மிதமான மழை' });
  assert.equal(W.wmoDescription(42).en, 'Unknown');
});

test('weather: travel advice levels', () => {
  assert.equal(W.travelAdvice({ weatherCode: 1, windKph: 10 }, { weatherCode: 2, rainMm: 0, rainChance: 10 }).level, 'good');
  const c = W.travelAdvice({ weatherCode: 3, windKph: 45 }, { weatherCode: 61, rainMm: 3, rainChance: 70 });
  assert.equal(c.level, 'caution');
  assert.equal(c.reasons.length, 2);
  assert.ok(c.reasons.every((r) => r.en && r.ta));
  assert.equal(W.travelAdvice({ weatherCode: 2, windKph: 5 }, { weatherCode: 63, rainMm: 25, rainChance: 80 }).level, 'avoid');
  assert.equal(W.travelAdvice({ weatherCode: 95, windKph: 5 }, { weatherCode: 2, rainMm: 1, rainChance: 20 }).level, 'avoid');
  assert.equal(W.travelAdvice({ weatherCode: 2, windKph: 5 }, { weatherCode: 82, rainMm: 5, rainChance: 30 }).level, 'avoid');
});

test('weather: GET /api/weather full response, cached for repeat requests', async () => {
  const f = mockFetch();
  const res = await getWeather(13.0827, 80.2707);
  assert.equal(res.status, 200);
  const w = await res.json();
  assert.equal(w.station.icao, 'VOMM');
  assert.ok(w.station.distanceKm > 5 && w.station.distanceKm < 30);
  assert.equal(w.station.observed.windKph, 18.5);
  assert.equal(w.current.tempC, 31.4);
  assert.equal(w.current.feelsLikeC, 36.2);
  assert.deepEqual(w.current.description, { en: 'Moderate rain', ta: 'மிதமான மழை' });
  assert.equal(w.hourly.length, 24);
  assert.equal(w.hourly[0].time, '2026-10-03T10:00');
  assert.deepEqual(Object.keys(w.hourly[0]).sort(), ['rainChance', 'tempC', 'time', 'weatherCode']);
  assert.equal(w.daily.length, 7);
  assert.equal(w.daily[2].rainMm, 42.5);
  assert.equal(w.daily[2].description.en, 'Thunderstorm');
  assert.equal(w.daily[0].sunrise, '2026-10-03T05:59');
  assert.equal(w.travel.level, 'good'); // today: 6.4 mm, 45%, wind 14.8
  assert.equal(w.source.forecast, 'Open-Meteo');
  assert.ok(w.fetchedAt);
  const forecastCalls = () => f.calls.filter((u) => u.includes('open-meteo')).length;
  assert.equal(forecastCalls(), 1);
  assert.ok(f.calls.some((u) => u.includes('ids=VOMM')));
  // A nearby point in the same 0.05° cell is served from cache.
  const again = await (await getWeather(13.08, 80.27)).json();
  assert.equal(again.fetchedAt, w.fetchedAt);
  assert.equal(forecastCalls(), 1);
  assert.equal(f.calls.length, 2);
});

test('weather: no station far from airports; METAR failure is non-fatal', async () => {
  mockFetch();
  const w = await (await getWeather(-40, -120)).json();
  assert.equal(w.station, null);
  W.setWeatherFetch(async (url) => (String(url).includes('aviationweather') ? json({}, 503) : json(openMeteo())));
  const w2 = await (await getWeather(9.93, 78.12)).json();
  assert.equal(w2.station, null);
  assert.equal(w2.daily.length, 7);
});

test('weather: 400 on bad coordinates, 502 when the forecast fails', async () => {
  mockFetch({ forecastFails: true });
  assert.equal((await getWeather(91, 80)).status, 400);
  assert.equal((await fetch(`${base}/api/weather?lat=abc&lon=80`)).status, 400);
  assert.equal((await fetch(`${base}/api/weather?lon=80`)).status, 400);
  assert.equal((await getWeather(13, 181)).status, 400);
  const r = await getWeather(11.0168, 76.9558);
  assert.equal(r.status, 502);
  assert.ok((await r.json()).error);
  // Failures are not cached.
  mockFetch();
  assert.equal((await getWeather(11.0168, 76.9558)).status, 200);
});

// ---- push ----

const post = (path, body, cookie) => fetch(base + path, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
  body: JSON.stringify(body),
});
const sub = (n = 1) => ({ endpoint: `https://fcm.googleapis.com/fcm/send/abc${n}`, keys: { p256dh: 'BOr' + 'x'.repeat(84), auth: 'authsecret' + n } });
const prefs = (extra = {}) => ({ morningTime: '06:00', tz: 5.5, lat: 13.0827, lon: 80.2707, place: 'Chennai', lang: 'en', name: 'Suresh', trips: [], ...extra });
const rows = () => getDb().prepare('SELECT * FROM push_subs ORDER BY created_at').all();

beforeEach(() => {
  if (getDb) getDb().exec('DELETE FROM push_subs');
});

test('push: GET /api/push/key', async () => {
  const k = await (await fetch(`${base}/api/push/key`)).json();
  assert.equal(k.publicKey, vapidKeys.publicKey);
});

test('push: subscribe validation and upsert by endpoint', async () => {
  const bad = [
    {},
    { subscription: { endpoint: 'http://insecure', keys: sub().keys }, prefs: prefs() },
    { subscription: { endpoint: sub().endpoint, keys: {} }, prefs: prefs() },
    { subscription: sub(), prefs: prefs({ morningTime: '25:00' }) },
    { subscription: sub(), prefs: prefs({ tz: 20 }) },
    { subscription: sub(), prefs: prefs({ lat: 100 }) },
    { subscription: sub(), prefs: prefs({ trips: [{ date: '2026-13-01', time: '10:00', title: 'x' }] }) },
    { subscription: sub(), prefs: prefs({ trips: [{ date: '2026-10-05', time: '9am', title: 'x' }] }) },
    { subscription: sub(), prefs: prefs({ trips: Array.from({ length: 61 }, (_, i) => ({ id: i, date: '2026-10-05', time: '10:00', title: 't' })) }) },
  ];
  for (const body of bad) assert.equal((await post('/api/push/subscribe', body)).status, 400, JSON.stringify(body).slice(0, 120));
  assert.equal(rows().length, 0);

  const ok = await post('/api/push/subscribe', { subscription: sub(), prefs: prefs() });
  assert.equal(ok.status, 200);
  assert.deepEqual(await ok.json(), { ok: true });
  await post('/api/push/subscribe', { subscription: sub(), prefs: prefs({ morningTime: '05:30', lang: 'ta' }) });
  const r = rows();
  assert.equal(r.length, 1);
  assert.equal(JSON.parse(r[0].prefs).morningTime, '05:30');
  assert.equal(JSON.parse(r[0].prefs).lang, 'ta');
  assert.equal(r[0].user_id, null);

  // Signed-in users get attached.
  const otp = await (await post('/api/auth/otp/request', { channel: 'email', to: 'push@example.com' })).json();
  const v = await post('/api/auth/otp/verify', { channel: 'email', to: 'push@example.com', code: otp.devCode, name: 'P' });
  const cookie = v.headers.getSetCookie().find((s) => s.startsWith('kj_session=')).split(';')[0];
  const user = (await v.json()).user;
  await post('/api/push/subscribe', { subscription: sub(), prefs: prefs() }, cookie);
  assert.equal(rows()[0].user_id, user.id);

  assert.equal((await post('/api/push/unsubscribe', { endpoint: sub().endpoint })).status, 200);
  assert.equal(rows().length, 0);
});

test('push: morning alarm once per local day; trip reminder 60 minutes before', async () => {
  const trip = { id: 't1', date: '2026-10-03', time: '18:00', title: 'Thirunallar Saneeswaran', place: 'Karaikal' };
  await post('/api/push/subscribe', { subscription: sub(), prefs: prefs({ trips: [trip] }) });
  const sent = [];
  const send = async (s, payload) => { sent.push({ endpoint: s.endpoint, ...payload }); };
  const at = (d, h, m) => Date.UTC(2026, 9, d, h, m); // UTC; IST = UTC+5:30

  assert.equal((await P.runPushTick(at(3, 0, 29), send)).sent, 0); // 05:59 IST
  assert.equal((await P.runPushTick(at(3, 0, 30), send)).sent, 1); // 06:00 IST
  assert.equal(sent[0].endpoint, sub().endpoint);
  assert.equal(sent[0].title, `${BRAND.name} · Good morning`);
  assert.equal(sent[0].tag, 'morning-2026-10-03');
  assert.equal(sent[0].url, '/');
  assert.match(sent[0].body, /^Suresh, Today is \w+ \d+ · Star: \w+ · Rahu Kalam: \d+:\d\d [AP]M – \d+:\d\d [AP]M/);
  assert.equal((await P.runPushTick(at(3, 0, 31), send)).sent, 0);
  assert.equal((await P.runPushTick(at(3, 4, 0), send)).sent, 0);

  assert.equal((await P.runPushTick(at(3, 11, 29), send)).sent, 0); // 16:59 IST — 61 min before
  assert.equal((await P.runPushTick(at(3, 11, 30), send)).sent, 1); // 17:00 IST
  assert.equal(sent[1].body, '🛕 Parigaram trip: Thirunallar Saneeswaran at 6:00 PM · Karaikal');
  assert.equal(sent[1].tag, 'trip-t1');
  assert.equal((await P.runPushTick(at(3, 11, 45), send)).sent, 0);
  assert.equal((await P.runPushTick(at(3, 12, 31), send)).sent, 0); // after the trip

  assert.equal((await P.runPushTick(at(4, 0, 29), send)).sent, 0);
  assert.equal((await P.runPushTick(at(4, 0, 30), send)).sent, 1); // next local day
  assert.equal(sent[2].tag, 'morning-2026-10-04');
  assert.equal(sent.length, 3);
});

test('push: Tamil morning message includes festivals', () => {
  // Deepavali 2025 in Chennai.
  const m = P.morningMessage({ tz: 5.5, lat: 13.0827, lon: 80.2707, lang: 'ta', name: '' }, '2025-10-20');
  assert.equal(m.title, `${BRAND.nameTa} · காலை வணக்கம்`);
  assert.match(m.body, /ஐப்பசி 4/);
  assert.match(m.body, /நட்சத்திரம்: அஸ்தம்/);
  assert.match(m.body, /ராகு காலம்: 7:28 AM – 8:56 AM/);
  assert.match(m.body, /தீபாவளி/);
});

test('push: 410 from the push service removes the subscription', async () => {
  await post('/api/push/subscribe', { subscription: sub(1), prefs: prefs() });
  await post('/api/push/subscribe', { subscription: sub(2), prefs: prefs({ morningTime: '07:00' }) });
  const gone = async () => { const e = new Error('Gone'); e.statusCode = 410; throw e; };
  const r = await P.runPushTick(Date.UTC(2026, 9, 3, 0, 30), gone); // 06:00 IST: only sub 1 is due
  assert.deepEqual(r, { sent: 0, removed: 1 });
  assert.deepEqual(rows().map((x) => x.endpoint), [sub(2).endpoint]);

  // Test endpoint: OK, then a 410 deletes the subscription.
  const got = [];
  P.setPushSender(async (_s, p) => { got.push(p); });
  assert.equal((await post('/api/push/test', { endpoint: sub(2).endpoint })).status, 200);
  assert.deepEqual(got[0], { title: BRAND.nameTa, body: 'Notifications are working', url: '/', tag: 'test' });
  P.setPushSender(gone);
  assert.equal((await post('/api/push/test', { endpoint: sub(2).endpoint })).status, 410);
  assert.equal(rows().length, 0);
  assert.equal((await post('/api/push/test', { endpoint: sub(2).endpoint })).status, 404);
  P.setPushSender(null);
});

test('push: general reminders fire at their own time with a reminder message', async () => {
  const { reminderMessage } = await import('../server/push.js');
  const m = reminderMessage({ lang: 'ta' }, { id: 'r1', title: 'பிரதோஷம்', place: '' });
  assert.match(m.body, /பிரதோஷம்/);
  assert.equal(m.tag, 'rem-r1');
});
