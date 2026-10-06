import crypto from 'node:crypto';
import { getWeather } from './weather.js';
import { weatherAdvice } from '../shared/weather.js';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import webpush from 'web-push';
import { getDb } from './db.js';
import { currentUser } from './auth.js';
import { tamilDay } from '../shared/tamilcal.js';

// Morning alarm + parigaram trip reminders over Web Push.
const VAPID_FILE = 'data/vapid.json';
const TICK_MS = 60000;
const MORNING_WINDOW_MIN = 60; // still send if the server was briefly down at the exact minute
const TRIP_LEAD_MS = 60 * 60000;
const MAX_TRIPS = 60;
const DEFAULT_LOC = { lat: 13.0827, lon: 80.2707 }; // Chennai
const APP_TA = 'துணை';

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS push_subs (
    id TEXT PRIMARY KEY,
    user_id TEXT NULL,
    endpoint TEXT UNIQUE,
    subscription TEXT,
    prefs TEXT,
    last_sent TEXT,
    created_at INTEGER
  );
`;

const ready = new WeakSet();
function db() {
  const d = getDb();
  if (!ready.has(d)) { d.exec(SCHEMA); ready.add(d); }
  return d;
}

// ---- VAPID ----

let vapid = null;
export function getVapid() {
  if (vapid) return vapid;
  const env = (k) => (process.env[k] || '').trim();
  const subject = env('VAPID_SUBJECT') || 'mailto:admin@kaippesi.app';
  if (env('VAPID_PUBLIC_KEY') && env('VAPID_PRIVATE_KEY')) {
    vapid = { publicKey: env('VAPID_PUBLIC_KEY'), privateKey: env('VAPID_PRIVATE_KEY'), subject };
    return vapid;
  }
  let keys = null;
  try { keys = JSON.parse(fs.readFileSync(VAPID_FILE, 'utf8')); } catch { /* none yet */ }
  if (!keys?.publicKey || !keys?.privateKey) {
    keys = webpush.generateVAPIDKeys();
    fs.mkdirSync(path.dirname(path.resolve(VAPID_FILE)), { recursive: true });
    fs.writeFileSync(VAPID_FILE, JSON.stringify(keys, null, 2), { mode: 0o600 });
    console.warn(`⚠️  VAPID keys not set — generated a pair in ${VAPID_FILE}. Set VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY in production.`);
  }
  vapid = { publicKey: keys.publicKey, privateKey: keys.privateKey, subject };
  return vapid;
}

/** Default sender: resolves on success, rejects with err.statusCode on push-service errors. */
export function webPushSend(subscription, payload) {
  const v = getVapid();
  return webpush.sendNotification(subscription, JSON.stringify(payload), {
    TTL: 3600,
    vapidDetails: { subject: v.subject, publicKey: v.publicKey, privateKey: v.privateKey },
  });
}

let pushSender = webPushSend;
/** Tests can replace the default sender (scheduler and POST /api/push/test); pass nothing to restore. */
export function setPushSender(fn) {
  pushSender = fn || webPushSend;
}

// ---- validation ----

class Invalid extends Error {}
const HM = /^([01]\d|2[0-3]):[0-5]\d$/;
const YMD = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

function parseSubscription(s) {
  if (!s || typeof s !== 'object') throw new Invalid('Missing subscription');
  const { endpoint, keys } = s;
  if (typeof endpoint !== 'string' || endpoint.length > 1000 || !/^https:\/\/\S+$/.test(endpoint)) throw new Invalid('Invalid subscription endpoint');
  if (!keys || typeof keys.p256dh !== 'string' || typeof keys.auth !== 'string' || !keys.p256dh || !keys.auth
    || keys.p256dh.length > 200 || keys.auth.length > 100) throw new Invalid('Invalid subscription keys');
  return { endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } };
}

function parseNum(v, name, min, max, fallback) {
  if (v === undefined || v === null || v === '') {
    if (fallback !== undefined) return fallback;
    throw new Invalid(`Invalid ${name}`);
  }
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max) throw new Invalid(`Invalid ${name}`);
  return n;
}

function parsePrefs(p) {
  if (!p || typeof p !== 'object') throw new Invalid('Missing prefs');
  let morningTime = null;
  if (p.morningTime !== undefined && p.morningTime !== null && p.morningTime !== '') {
    if (!HM.test(p.morningTime)) throw new Invalid('Invalid morningTime (HH:MM)');
    morningTime = p.morningTime;
  }
  const trips = p.trips === undefined || p.trips === null ? [] : p.trips;
  if (!Array.isArray(trips) || trips.length > MAX_TRIPS) throw new Invalid(`Invalid trips (max ${MAX_TRIPS})`);
  return {
    morningTime,
    tz: parseNum(p.tz, 'tz', -12, 14),
    lat: parseNum(p.lat, 'lat', -90, 90, DEFAULT_LOC.lat),
    lon: parseNum(p.lon, 'lon', -180, 180, DEFAULT_LOC.lon),
    place: str(p.place, 120),
    lang: p.lang === 'en' ? 'en' : 'ta',
    name: str(p.name, 80),
    trips: trips.map((t, i) => {
      if (!t || typeof t !== 'object') throw new Invalid('Invalid trip');
      if (!YMD.test(t.date || '')) throw new Invalid('Invalid trip date (YYYY-MM-DD)');
      if (!HM.test(t.time || '')) throw new Invalid('Invalid trip time (HH:MM)');
      const title = str(t.title, 120);
      if (!title) throw new Invalid('Trip title required');
      return { id: String(t.id ?? i).slice(0, 64), date: t.date, time: t.time, title, place: str(t.place, 120), kind: t.kind === 'reminder' ? 'reminder' : 'trip' };
    }),
  };
}

// ---- storage ----

const findByEndpoint = (endpoint) => db().prepare('SELECT * FROM push_subs WHERE endpoint = ?').get(endpoint);
const removeSub = (id) => db().prepare('DELETE FROM push_subs WHERE id = ?').run(id);
const isGone = (err) => err && (err.statusCode === 404 || err.statusCode === 410);

export function upsertSubscription(subscription, prefs, userId = null) {
  db().prepare(`
    INSERT INTO push_subs (id, user_id, endpoint, subscription, prefs, last_sent, created_at)
    VALUES (?, ?, ?, ?, ?, '{}', ?)
    ON CONFLICT(endpoint) DO UPDATE SET
      subscription = excluded.subscription,
      prefs = excluded.prefs,
      user_id = COALESCE(excluded.user_id, push_subs.user_id)
  `).run(crypto.randomUUID(), userId, subscription.endpoint, JSON.stringify(subscription), JSON.stringify(prefs), Date.now());
}

// ---- message building ----

const pad = (n) => String(n).padStart(2, '0');
/** Wall-clock parts at a fixed UTC offset (hours). */
function localParts(ms, tz) {
  const d = new Date(ms + tz * 3600000);
  return { date: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`, minutes: d.getUTCHours() * 60 + d.getUTCMinutes() };
}
function clock12(h, m) {
  return `${h % 12 || 12}:${pad(m)} ${h < 12 ? 'AM' : 'PM'}`;
}
const fmtTime = (date, tz) => { const d = new Date(new Date(date).getTime() + tz * 3600000); return clock12(d.getUTCHours(), d.getUTCMinutes()); };
const fmtHM = (hm) => { const [h, m] = hm.split(':').map(Number); return clock12(h, m); };

/** Morning alarm payload for a local date (YYYY-MM-DD). */
export function morningMessage(prefs, localDate) {
  const [y, m, d] = localDate.split('-').map(Number);
  const noon = new Date(Date.UTC(y, m - 1, d, 12) - prefs.tz * 3600000);
  const day = tamilDay(noon, prefs.lat, prefs.lon, prefs.tz);
  const rk = `${fmtTime(day.rahuKalam.start, prefs.tz)} – ${fmtTime(day.rahuKalam.end, prefs.tz)}`;
  const ta = prefs.lang !== 'en';
  const fests = day.festivals.map((f) => (ta ? f.ta : f.en)).join(', ');
  const parts = ta
    ? [`இன்று ${day.tamil.monthTa} ${day.tamil.day}`, `நட்சத்திரம்: ${day.nakshatra.ta}`, `ராகு காலம்: ${rk}`]
    : [`Today is ${day.tamil.monthEn} ${day.tamil.day}`, `Star: ${day.nakshatra.name}`, `Rahu Kalam: ${rk}`];
  if (fests) parts.push(`🎉 ${fests}`);
  const greet = prefs.name ? `${prefs.name}, ` : '';
  return {
    title: ta ? `${APP_TA} · காலை வணக்கம்` : 'Thunai · Good morning',
    body: greet + parts.join(' · '),
    url: '/',
    tag: `morning-${localDate}`,
  };
}

/** Morning message plus today's weather advice ("heat rises from 11 AM — go early"), when the forecast is reachable. */
export async function morningWithWeather(prefs, localDate) {
  const msg = morningMessage(prefs, localDate);
  try {
    const w = await getWeather(prefs.lat, prefs.lon);
    const [y, m, d] = localDate.split('-').map(Number);
    const day = tamilDay(new Date(Date.UTC(y, m - 1, d, 12) - prefs.tz * 3600000), prefs.lat, prefs.lon, prefs.tz);
    const a = weatherAdvice(w, { tz: prefs.tz, good: day.gowri.filter((g) => g.good && g.part === 'day'), avoid: [day.rahuKalam, day.yamagandam] });
    const ta = prefs.lang !== 'en';
    const extra = [`${Math.round(w.current.tempC)}°C · 💧${w.current.humidity ?? '—'}%`, a.tips[0] && (ta ? a.tips[0].ta : a.tips[0].en), a.bestOut && (ta ? a.bestOut.ta : a.bestOut.en)].filter(Boolean);
    msg.body = `${msg.body}\n🌤️ ${extra.join(' · ')}`;
  } catch { /* weather is optional */ }
  return msg;
}

export function tripMessage(prefs, trip) {
  const ta = prefs.lang !== 'en';
  const at = fmtHM(trip.time);
  const place = trip.place ? ` · ${trip.place}` : '';
  return {
    title: ta ? `${APP_TA} · பயண நினைவூட்டல்` : 'Thunai · Trip reminder',
    body: ta ? `🛕 பரிகாரப் பயணம்: ${trip.title} — ${at} மணிக்கு${place}` : `🛕 Parigaram trip: ${trip.title} at ${at}${place}`,
    url: '/',
    tag: `trip-${trip.id}`,
  };
}

const REMINDER_WINDOW_MS = 30 * 60000;
export function reminderMessage(prefs, r) {
  const ta = prefs.lang !== 'en';
  return {
    title: ta ? `${APP_TA} · நினைவூட்டல்` : 'Thunai · Reminder',
    body: `🔔 ${r.title}${r.place ? ` · ${r.place}` : ''}`,
    url: '/',
    tag: `rem-${r.id}`,
  };
}

const tripKey = (t) => `${t.id}|${t.date}|${t.time}`;

// ---- scheduler ----

/**
 * One scheduler pass. `now` is a Date or ms; `send(subscription, payload)` delivers one notification.
 * Returns { sent, removed } counts.
 */
export async function runPushTick(now = Date.now(), send = pushSender) {
  const nowMs = now instanceof Date ? now.getTime() : Number(now);
  const rows = db().prepare('SELECT * FROM push_subs').all();
  let sent = 0, removed = 0;
  for (const row of rows) {
    let prefs, sub, last;
    try {
      prefs = JSON.parse(row.prefs);
      sub = JSON.parse(row.subscription);
      last = JSON.parse(row.last_sent || '{}') || {};
    } catch {
      continue;
    }
    last.trips ||= {};
    const due = [];
    const local = localParts(nowMs, prefs.tz);
    if (prefs.morningTime && last.morning !== local.date) {
      const [h, m] = prefs.morningTime.split(':').map(Number);
      const diff = local.minutes - (h * 60 + m);
      if (diff >= 0 && diff < MORNING_WINDOW_MIN) {
        due.push({ build: () => morningWithWeather(prefs, local.date), mark: () => { last.morning = local.date; } });
      }
    }
    const live = new Set();
    for (const t of prefs.trips || []) {
      const key = tripKey(t);
      live.add(key);
      if (last.trips[key]) continue;
      const [y, mo, d] = t.date.split('-').map(Number);
      const [h, mi] = t.time.split(':').map(Number);
      const at = Date.UTC(y, mo - 1, d, h, mi) - prefs.tz * 3600000;
      // Trips alert ahead of departure; general reminders (vratham, muhurtham, rahu kalam…) alert at their alarm time.
      const fire = t.kind === 'reminder' ? nowMs >= at && nowMs < at + REMINDER_WINDOW_MS : nowMs >= at - TRIP_LEAD_MS && nowMs < at;
      if (fire) {
        due.push({ build: () => (t.kind === 'reminder' ? reminderMessage(prefs, t) : tripMessage(prefs, t)), mark: () => { last.trips[key] = nowMs; } });
      }
    }
    // Forget reminders for trips that were removed or rescheduled.
    for (const k of Object.keys(last.trips)) if (!live.has(k)) delete last.trips[k];

    let gone = false;
    for (const item of due) {
      try {
        await send(sub, await item.build());
        item.mark();
        sent++;
      } catch (err) {
        if (isGone(err)) { gone = true; break; }
        console.warn('push send failed:', err.statusCode || '', err.message);
      }
    }
    if (gone) { removeSub(row.id); removed++; continue; }
    const next = JSON.stringify(last);
    if (next !== row.last_sent) db().prepare('UPDATE push_subs SET last_sent = ? WHERE id = ?').run(next, row.id);
  }
  return { sent, removed };
}

let timer = null;
/** Start the once-a-minute scheduler (call once when the server starts listening). */
export function startPushScheduler() {
  if (timer) return timer;
  getVapid();
  let busy = false;
  timer = setInterval(async () => {
    if (busy) return;
    busy = true;
    try { await runPushTick(); } catch (e) { console.error('push tick:', e); } finally { busy = false; }
  }, TICK_MS);
  timer.unref?.();
  return timer;
}

// ---- routes ----

export function pushRouter() {
  db(); // create the table up front
  const r = express.Router();
  const bad = (res, e) => res.status(400).json({ error: e.message });

  r.get('/push/key', (_req, res) => res.json({ publicKey: getVapid().publicKey }));

  r.post('/push/subscribe', (req, res) => {
    let subscription, prefs;
    try {
      subscription = parseSubscription(req.body?.subscription);
      prefs = parsePrefs(req.body?.prefs);
    } catch (e) {
      if (e instanceof Invalid) return bad(res, e);
      throw e;
    }
    upsertSubscription(subscription, prefs, currentUser(req)?.id || null);
    res.json({ ok: true });
  });

  r.post('/push/unsubscribe', (req, res) => {
    const endpoint = req.body?.endpoint;
    if (typeof endpoint !== 'string' || !endpoint) return res.status(400).json({ error: 'Missing endpoint' });
    db().prepare('DELETE FROM push_subs WHERE endpoint = ?').run(endpoint);
    res.json({ ok: true });
  });

  r.post('/push/test', async (req, res) => {
    const endpoint = req.body?.endpoint;
    if (typeof endpoint !== 'string' || !endpoint) return res.status(400).json({ error: 'Missing endpoint' });
    const row = findByEndpoint(endpoint);
    if (!row) return res.status(404).json({ error: 'Subscription not found' });
    try {
      await pushSender(JSON.parse(row.subscription), { title: APP_TA, body: 'Notifications are working', url: '/', tag: 'test' });
      res.json({ ok: true });
    } catch (err) {
      if (isGone(err)) { removeSub(row.id); return res.status(410).json({ error: 'Subscription expired — please enable notifications again' }); }
      console.warn('push test failed:', err.statusCode || '', err.message);
      res.status(502).json({ error: 'Could not send the notification' });
    }
  });
  return r;
}
