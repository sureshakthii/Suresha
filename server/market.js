import crypto from 'node:crypto';
import fs from 'node:fs';
import express from 'express';
import { getDb } from './db.js';
import { requireAdmin as adminRole, audit } from './admin.js';
import { currentUser, normalizePhone } from './auth.js';

// Marketplace: pooja store (Razorpay), priest directory, service requests, admin.

const CATALOG = JSON.parse(fs.readFileSync(new URL('./data/products.json', import.meta.url), 'utf8'));
const PRODUCTS = new Map(CATALOG.products.map((p) => [p.id, p]));
const RAZORPAY = 'https://api.razorpay.com/v1/orders';

export const CATEGORIES = [
  { id: 'lamps', en: 'Lamps', ta: 'விளக்குகள்' },
  { id: 'oils', en: 'Lamp oils & ghee', ta: 'விளக்கு எண்ணெய் & நெய்' },
  { id: 'pooja', en: 'Pooja items', ta: 'பூஜை பொருட்கள்' },
  { id: 'navagraha', en: 'Navagraha', ta: 'நவகிரகம்' },
  { id: 'homam', en: 'Homam', ta: 'ஹோமம்' },
  { id: 'gomatha', en: 'Gomatha pooja', ta: 'கோமாதா பூஜை' },
  { id: 'grahapravesam', en: 'Graha pravesam', ta: 'கிரகப்பிரவேசம்' },
  { id: 'books', en: 'Books', ta: 'புத்தகங்கள்' },
  { id: 'rudraksha', en: 'Rudraksha', ta: 'ருத்ராட்சம்' },
];

export const SERVICES = [
  { id: 'archanai', en: 'Archanai', ta: 'அர்ச்சனை' },
  { id: 'homam', en: 'Homam (Ganapathy / Navagraha / Sudarsana / Ayush)', ta: 'ஹோமம் (கணபதி / நவகிரக / சுதர்சன / ஆயுஷ்)' },
  { id: 'vasthu_shanti', en: 'Vasthu shanti', ta: 'வாஸ்து சாந்தி' },
  { id: 'graha_pravesam', en: 'Graha pravesam (house-warming)', ta: 'கிரகப்பிரவேசம்' },
  { id: 'gomatha_pooja', en: 'Gomatha pooja', ta: 'கோமாதா பூஜை' },
  { id: 'satyanarayana_pooja', en: 'Satyanarayana pooja', ta: 'சத்யநாராயண பூஜை' },
  { id: 'marriage', en: 'Marriage', ta: 'திருமணம்' },
  { id: 'seemantham', en: 'Seemantham', ta: 'சீமந்தம்' },
  { id: 'namakaranam', en: 'Namakaranam (naming ceremony)', ta: 'நாமகரணம் (பெயர் சூட்டுதல்)' },
  { id: 'ayush_homam', en: 'Ayush homam', ta: 'ஆயுஷ் ஹோமம்' },
  { id: 'sraddham', en: 'Sraddham / Thivasam', ta: 'சிராத்தம் / திவசம்' },
  { id: 'tharpanam', en: 'Tharpanam', ta: 'தர்ப்பணம்' },
  { id: 'annadhanam', en: 'Annadhanam (organise)', ta: 'அன்னதானம் (ஏற்பாடு)' },
  { id: 'parigaram_pooja', en: 'Parigaram pooja', ta: 'பரிகார பூஜை' },
  { id: 'navagraha_shanti', en: 'Navagraha shanti', ta: 'நவகிரக சாந்தி' },
  { id: 'kumbabhishekam', en: 'Kumbabhishekam', ta: 'கும்பாபிஷேகம்' },
  { id: 'kubera_pooja', en: 'Kubera Lakshmi Pooja', ta: 'குபேர லட்சுமி பூஜை' },
];
const SERVICE_IDS = new Set(SERVICES.map((s) => s.id));

const ORDER_ADMIN_STATUSES = ['paid', 'shipped', 'delivered', 'cancelled'];
const PRIEST_STATUSES = ['pending', 'verified', 'rejected'];
const REQUEST_TYPES = ['service', 'annadhanam', 'temple_booking', 'package'];
const REQUEST_ADMIN_STATUSES = ['confirmed', 'assigned', 'completed', 'cancelled'];

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS store_orders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    items TEXT NOT NULL,
    address TEXT NOT NULL,
    total INTEGER NOT NULL,
    status TEXT NOT NULL,
    razorpay_order_id TEXT,
    razorpay_payment_id TEXT,
    created_at INTEGER,
    updated_at INTEGER
  );
  CREATE INDEX IF NOT EXISTS store_orders_user ON store_orders(user_id);
  CREATE TABLE IF NOT EXISTS priests (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    city TEXT NOT NULL,
    languages TEXT NOT NULL,
    services TEXT NOT NULL,
    experience_years INTEGER NOT NULL,
    about TEXT,
    status TEXT NOT NULL,
    created_at INTEGER,
    updated_at INTEGER
  );
  CREATE TABLE IF NOT EXISTS service_requests (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    service TEXT,
    priest_id TEXT,
    temple_id TEXT,
    date TEXT NOT NULL,
    time TEXT,
    city TEXT NOT NULL,
    people INTEGER,
    meals INTEGER,
    amount INTEGER,
    notes TEXT,
    contact_phone TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at INTEGER,
    updated_at INTEGER
  );
  CREATE INDEX IF NOT EXISTS service_requests_user ON service_requests(user_id);
  CREATE INDEX IF NOT EXISTS service_requests_priest ON service_requests(priest_id);
`;

const env = (k) => (process.env[k] || '').trim();
const now = () => Date.now();

// Payment-gateway fetch is injectable so tests never hit the network.
let marketFetch = (...a) => fetch(...a);
export function setMarketFetch(fn) { marketFetch = fn || ((...a) => fetch(...a)); }

const ready = new WeakSet();
function db() {
  const d = getDb();
  if (!ready.has(d)) { d.exec(SCHEMA); ready.add(d); }
  return d;
}

class Invalid extends Error {}
const fail = (msg) => { throw new Invalid(msg); };

function safeEqual(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

// ---- validators (throw Invalid with a user-facing message) ----

function text(v, field, { min = 1, max = 100, optional = false } = {}) {
  if (v === undefined || v === null || v === '') {
    if (optional) return null;
    fail(`${field} is required`);
  }
  if (typeof v !== 'string') fail(`${field} must be text`);
  const s = v.trim().replace(/\s+/g, ' ');
  if (/[\u0000-\u001f\u007f]/.test(s)) fail(`${field} contains invalid characters`);
  if (s.length < min || s.length > max) fail(`${field} must be ${min}–${max} characters`);
  return s;
}

function int(v, field, min, max, { optional = false } = {}) {
  if (v === undefined || v === null || v === '') {
    if (optional) return null;
    fail(`${field} is required`);
  }
  const n = typeof v === 'string' && /^\d+$/.test(v.trim()) ? Number(v) : v;
  if (!Number.isInteger(n) || n < min || n > max) fail(`${field} must be a whole number from ${min} to ${max}`);
  return n;
}

function phone(v, field) {
  const p = normalizePhone(typeof v === 'string' ? v : '');
  if (!p) fail(`${field} must be a valid mobile number`);
  return p;
}

function date(v) {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) fail('date must be YYYY-MM-DD');
  const d = new Date(v + 'T00:00:00Z');
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v) fail('date is not a valid calendar date');
  const day = 86400000;
  if (d.getTime() < now() - 2 * day) fail('date cannot be in the past');
  if (d.getTime() > now() + 2 * 366 * day) fail('date must be within the next two years');
  return v;
}

function time(v) {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(v)) fail('time must be HH:MM (24-hour)');
  return v;
}

function oneOf(v, list, field) {
  if (!list.includes(v)) fail(`${field} must be one of: ${list.join(', ')}`);
  return v;
}

function parseAddress(a) {
  if (!a || typeof a !== 'object' || Array.isArray(a)) fail('address is required');
  const pincode = String(a.pincode ?? '').trim();
  if (!/^[1-9]\d{5}$/.test(pincode)) fail('address.pincode must be a 6-digit Indian PIN code');
  return {
    name: text(a.name, 'address.name', { min: 2, max: 80 }),
    phone: phone(a.phone, 'address.phone'),
    line1: text(a.line1, 'address.line1', { min: 5, max: 200 }),
    city: text(a.city, 'address.city', { min: 2, max: 60 }),
    pincode,
    state: text(a.state, 'address.state', { min: 2, max: 60 }),
  };
}

/** Prices always come from the catalogue; client-sent prices are ignored. */
function priceItems(items) {
  if (!Array.isArray(items) || !items.length) fail('items must be a non-empty list');
  if (items.length > 50) fail('Too many items in one order (max 50)');
  const qty = new Map();
  for (const it of items) {
    if (!it || typeof it !== 'object') fail('Each item must be { id, qty }');
    const p = PRODUCTS.get(it.id);
    if (!p) fail(`Unknown product: ${String(it.id).slice(0, 60)}`);
    qty.set(p.id, (qty.get(p.id) || 0) + int(it.qty, `qty for ${p.id}`, 1, 20));
  }
  const lines = [];
  for (const [id, q] of qty) {
    const p = PRODUCTS.get(id);
    if (q > 20) fail(`qty for ${id} must be a whole number from 1 to 20`);
    if (q > p.stock) fail(`Only ${p.stock} left in stock for ${p.name.en}`);
    lines.push({ id, name: p.name, unit: p.unit, price: p.price, qty: q, lineTotal: p.price * q });
  }
  return { lines, total: lines.reduce((s, l) => s + l.lineTotal, 0) };
}

const razorpayConfigured = () => !!(env('RAZORPAY_KEY_ID') && env('RAZORPAY_KEY_SECRET'));

async function createRazorpayOrder(amountPaise, receipt) {
  const auth = Buffer.from(`${env('RAZORPAY_KEY_ID')}:${env('RAZORPAY_KEY_SECRET')}`).toString('base64');
  const r = await marketFetch(RAZORPAY, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: amountPaise, currency: 'INR', receipt }),
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok || !body.id) throw new Error(`Razorpay ${r.status}: ${JSON.stringify(body).slice(0, 200)}`);
  return body;
}

// ---- row → API shapes ----

const parse = (s, d) => { try { return JSON.parse(s); } catch { return d; } };

const orderOut = (o, admin = false) => ({
  id: o.id, total: o.total, currency: 'INR', status: o.status, items: parse(o.items, []),
  address: parse(o.address, null), razorpayOrderId: o.razorpay_order_id || null,
  paymentId: o.razorpay_payment_id || null, createdAt: o.created_at, updatedAt: o.updated_at,
  ...(admin ? { userId: o.user_id } : {}),
});

const priestPublic = (p) => ({
  id: p.id, name: p.name, city: p.city, languages: parse(p.languages, []),
  services: parse(p.services, []), experience_years: p.experience_years, about: p.about || '',
});
const priestFull = (p) => ({ ...priestPublic(p), phone: p.phone, status: p.status, userId: p.user_id, createdAt: p.created_at, updatedAt: p.updated_at });

const requestOut = (q, admin = false) => ({
  id: q.id, type: q.type, service: q.service, priestId: q.priest_id, templeId: q.temple_id,
  date: q.date, time: q.time, city: q.city, people: q.people, meals: q.meals, amount: q.amount,
  notes: q.notes || '', contactPhone: q.contact_phone, status: q.status,
  createdAt: q.created_at, updatedAt: q.updated_at, ...(q.type === 'package' ? { packageId: q.service } : {}),
  ...(admin ? { userId: q.user_id } : {}),
});

// ---- middleware ----

function requireUser(req, res, next) {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: 'Please sign in first' });
  req.user = user;
  next();
}

// Named, role-based admin tokens with lock-out (server/admin.js).
const requireAdmin = adminRole('support');

// Turns validator errors into 400s; everything else falls through to the app error handler.
const handle = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (err) {
    if (err instanceof Invalid) return res.status(400).json({ error: err.message });
    next(err);
  }
};

// ---- router ----

export function marketRouter() {
  const r = express.Router();
  const body = (req) => (req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {});

  // Store
  r.get('/store/products', handle((req, res) => {
    const cat = req.query.category;
    if (cat !== undefined && !CATEGORIES.some((c) => c.id === cat)) fail(`category must be one of: ${CATEGORIES.map((c) => c.id).join(', ')}`);
    const products = cat ? CATALOG.products.filter((p) => p.category === cat) : CATALOG.products;
    res.json({ sample: !!CATALOG.sample, open: !CATALOG.sample || env('STORE_ALLOW_SAMPLE') === '1', currency: CATALOG.currency, categories: CATEGORIES, products });
  }));

  r.post('/store/orders', requireUser, handle(async (req, res) => {
    // Never sell the sample catalogue. A real catalogue sets "sample": false; STORE_ALLOW_SAMPLE=1 is for dev/tests only.
    if (CATALOG.sample && env('STORE_ALLOW_SAMPLE') !== '1') return res.status(409).json({ error: 'The store is not open yet — the catalogue shown is a sample and is not for sale.', storeClosed: true });
    const b = body(req);
    const { lines, total } = priceItems(b.items);
    const address = parseAddress(b.address);
    const id = crypto.randomUUID();
    let payment = null, rzpId = null;
    if (razorpayConfigured()) {
      try {
        const rz = await createRazorpayOrder(total * 100, id);
        rzpId = rz.id;
        payment = { gateway: 'razorpay', keyId: env('RAZORPAY_KEY_ID'), razorpayOrderId: rz.id, amount: total * 100, currency: 'INR' };
      } catch (err) {
        console.error('Razorpay order failed:', err.message);
        return res.status(502).json({ error: 'Payment gateway is unavailable right now. Please try again.' });
      }
    }
    const status = payment ? 'awaiting_payment' : 'awaiting_payment_setup';
    const t = now();
    db().prepare(`INSERT INTO store_orders (id, user_id, items, address, total, status, razorpay_order_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, req.user.id, JSON.stringify(lines), JSON.stringify(address), total, status, rzpId, t, t);
    res.status(201).json({ order: { id, total, currency: 'INR', status, items: lines }, payment });
  }));

  r.post('/store/orders/:id/verify', requireUser, handle((req, res) => {
    const secret = env('RAZORPAY_KEY_SECRET');
    if (!secret) return res.status(503).json({ error: 'Online payment is not configured' });
    const order = db().prepare('SELECT * FROM store_orders WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const { razorpay_order_id: oid, razorpay_payment_id: pid, razorpay_signature: sig } = body(req);
    if (![oid, pid, sig].every((v) => typeof v === 'string' && v.length > 0 && v.length <= 200)) {
      fail('razorpay_order_id, razorpay_payment_id and razorpay_signature are required');
    }
    if (!order.razorpay_order_id || !safeEqual(oid, order.razorpay_order_id)) fail('Payment does not match this order');
    const expected = crypto.createHmac('sha256', secret).update(`${oid}|${pid}`).digest('hex');
    if (!safeEqual(sig, expected)) return res.status(400).json({ error: 'Payment signature verification failed' });
    if (order.status === 'awaiting_payment') {
      db().prepare("UPDATE store_orders SET status = 'paid', razorpay_payment_id = ?, updated_at = ? WHERE id = ?").run(pid, now(), order.id);
    }
    res.json({ order: orderOut(db().prepare('SELECT * FROM store_orders WHERE id = ?').get(order.id)) });
  }));

  r.get('/store/orders', requireUser, (req, res) => {
    const rows = db().prepare('SELECT * FROM store_orders WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
    res.json({ orders: rows.map((o) => orderOut(o)) });
  });

  // Priests
  r.get('/services', (_req, res) => res.json(SERVICES));

  r.post('/priests/register', requireUser, handle((req, res) => {
    const b = body(req);
    if (!Array.isArray(b.languages) || b.languages.length < 1 || b.languages.length > 8) fail('languages must be a list of 1–8 languages');
    if (!Array.isArray(b.services) || b.services.length < 1 || b.services.length > SERVICES.length) fail('services must be a non-empty list');
    const services = [...new Set(b.services)];
    for (const s of services) if (!SERVICE_IDS.has(s)) fail(`Unknown service: ${String(s).slice(0, 40)}`);
    const p = {
      name: text(b.name, 'name', { min: 2, max: 80 }),
      phone: phone(b.phone, 'phone'),
      city: text(b.city, 'city', { min: 2, max: 60 }),
      languages: [...new Set(b.languages.map((l, i) => text(l, `languages[${i}]`, { min: 2, max: 30 })))],
      services,
      experience_years: int(b.experience_years, 'experience_years', 0, 80),
      about: text(b.about, 'about', { min: 0, max: 1000, optional: true }) || '',
    };
    const d = db();
    const t = now();
    const existing = d.prepare('SELECT id FROM priests WHERE user_id = ?').get(req.user.id);
    const id = existing?.id || crypto.randomUUID();
    if (existing) {
      d.prepare(`UPDATE priests SET name = ?, phone = ?, city = ?, languages = ?, services = ?, experience_years = ?, about = ?,
        status = 'pending', updated_at = ? WHERE id = ?`)
        .run(p.name, p.phone, p.city, JSON.stringify(p.languages), JSON.stringify(p.services), p.experience_years, p.about, t, id);
    } else {
      d.prepare(`INSERT INTO priests (id, user_id, name, phone, city, languages, services, experience_years, about, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`)
        .run(id, req.user.id, p.name, p.phone, p.city, JSON.stringify(p.languages), JSON.stringify(p.services), p.experience_years, p.about, t, t);
    }
    const row = d.prepare('SELECT * FROM priests WHERE id = ?').get(id);
    res.status(existing ? 200 : 201).json({ priest: { ...priestPublic(row), phone: row.phone, status: row.status } });
  }));

  r.get('/priests', handle((req, res) => {
    const { service, city } = req.query;
    if (service !== undefined && !SERVICE_IDS.has(service)) fail('Unknown service');
    const c = city === undefined ? null : text(city, 'city', { max: 60 }).toLowerCase();
    const rows = db().prepare("SELECT * FROM priests WHERE status = 'verified' ORDER BY experience_years DESC, name").all();
    const priests = rows.map(priestPublic)
      .filter((p) => !service || p.services.includes(service))
      .filter((p) => !c || p.city.toLowerCase() === c);
    res.json({ priests });
  }));

  r.get('/priests/me', requireUser, (req, res) => {
    const row = db().prepare('SELECT * FROM priests WHERE user_id = ?').get(req.user.id);
    if (!row) return res.status(404).json({ error: 'No priest profile for this account' });
    res.json({ priest: { ...priestPublic(row), phone: row.phone, status: row.status } });
  });

  r.get('/priests/me/requests', requireUser, (req, res) => {
    const priest = db().prepare('SELECT id FROM priests WHERE user_id = ?').get(req.user.id);
    if (!priest) return res.status(404).json({ error: 'No priest profile for this account' });
    const rows = db().prepare('SELECT * FROM service_requests WHERE priest_id = ? ORDER BY date, created_at').all(priest.id);
    res.json({ requests: rows.map((q) => requestOut(q)) });
  });

  // Service requests / bookings
  r.post('/requests', requireUser, handle((req, res) => {
    const b = body(req);
    const type = oneOf(b.type, REQUEST_TYPES, 'type');
    let service = null;
    if (type === 'service' || (type === 'temple_booking' && b.service !== undefined && b.service !== null && b.service !== '')) {
      if (!SERVICE_IDS.has(b.service)) fail(`service must be one of: ${[...SERVICE_IDS].join(', ')}`);
      service = b.service;
    } else if (type === 'annadhanam') service = 'annadhanam';
    else if (type === 'package') { // package id (e.g. navagraha, arupadai, rameswaram) lives in the service column
      service = text(b.packageId, 'packageId', { max: 60 });
      if (!/^[a-z0-9_-]+$/.test(service)) fail('packageId must use lowercase letters, digits, _ or - only');
    }
    let priestId = null;
    if (b.priestId !== undefined && b.priestId !== null && b.priestId !== '') {
      const p = typeof b.priestId === 'string' && db().prepare("SELECT id FROM priests WHERE id = ? AND status = 'verified'").get(b.priestId);
      if (!p) fail('priestId does not match a verified priest');
      priestId = p.id;
    }
    const templeId = text(b.templeId, 'templeId', { max: 100, optional: type !== 'temple_booking' });
    const meals = type === 'annadhanam' ? int(b.meals, 'meals', 1, 10000) : null;
    const rate = Number(env('ANNADHANAM_RATE'));
    const amount = meals && rate > 0 ? Math.round(meals * rate) : null;
    const q = {
      id: crypto.randomUUID(), type, service, priestId, templeId,
      date: date(b.date), time: time(b.time),
      city: text(b.city, 'city', { min: 2, max: 60 }),
      people: int(b.people, 'people', 1, 10000, { optional: true }),
      meals, amount,
      notes: text(b.notes, 'notes', { min: 0, max: 500, optional: true }) || '',
      contactPhone: phone(b.contactPhone, 'contactPhone'),
    };
    const t = now();
    db().prepare(`INSERT INTO service_requests (id, user_id, type, service, priest_id, temple_id, date, time, city, people, meals, amount,
      notes, contact_phone, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'requested', ?, ?)`)
      .run(q.id, req.user.id, q.type, q.service, q.priestId, q.templeId, q.date, q.time, q.city, q.people, q.meals, q.amount,
        q.notes, q.contactPhone, t, t);
    res.status(201).json({ request: requestOut(db().prepare('SELECT * FROM service_requests WHERE id = ?').get(q.id)) });
  }));

  r.get('/requests', requireUser, (req, res) => {
    const rows = db().prepare('SELECT * FROM service_requests WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
    res.json({ requests: rows.map((q) => requestOut(q)) });
  });

  // Admin (each route checks x-admin-token)

  // The customer can cancel their own request before it is completed (fulfilment tracking keeps the history).
  r.post('/requests/:id/cancel', requireUser, handle((req, res) => {
    const d = db();
    const row = d.prepare('SELECT * FROM service_requests WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!row) return res.status(404).json({ error: 'Request not found' });
    if (!['requested', 'confirmed', 'assigned'].includes(row.status)) return res.status(409).json({ error: `This request is already ${row.status}` });
    d.prepare("UPDATE service_requests SET status = 'cancelled', updated_at = ? WHERE id = ?").run(now(), row.id);
    audit({ admin: { name: `user:${req.user.id}`, role: 'customer' }, ip: req.ip }, 'request.cancel', row.id, { from: row.status });
    res.json({ request: requestOut(d.prepare('SELECT * FROM service_requests WHERE id = ?').get(row.id)) });
  }));

  r.get('/admin/priests', requireAdmin, handle((req, res) => {
    const { status } = req.query;
    if (status !== undefined) oneOf(status, PRIEST_STATUSES, 'status');
    const rows = status
      ? db().prepare('SELECT * FROM priests WHERE status = ? ORDER BY created_at').all(status)
      : db().prepare('SELECT * FROM priests ORDER BY created_at').all();
    res.json({ priests: rows.map(priestFull) });
  }));

  r.post('/admin/priests/:id/status', requireAdmin, handle((req, res) => {
    const status = oneOf(body(req).status, PRIEST_STATUSES, 'status');
    const d = db();
    const { changes } = d.prepare('UPDATE priests SET status = ?, updated_at = ? WHERE id = ?').run(status, now(), req.params.id);
    if (!changes) return res.status(404).json({ error: 'Priest not found' });
    audit(req, 'priest.status', req.params.id, { status });
    res.json({ priest: priestFull(d.prepare('SELECT * FROM priests WHERE id = ?').get(req.params.id)) });
  }));

  r.get('/admin/orders', requireAdmin, (_req, res) => {
    const rows = db().prepare('SELECT * FROM store_orders ORDER BY created_at DESC').all();
    res.json({ orders: rows.map((o) => orderOut(o, true)) });
  });

  r.post('/admin/orders/:id/status', requireAdmin, handle((req, res) => {
    const status = oneOf(body(req).status, ORDER_ADMIN_STATUSES, 'status');
    const d = db();
    const { changes } = d.prepare('UPDATE store_orders SET status = ?, updated_at = ? WHERE id = ?').run(status, now(), req.params.id);
    if (!changes) return res.status(404).json({ error: 'Order not found' });
    audit(req, 'order.status', req.params.id, { status });
    res.json({ order: orderOut(d.prepare('SELECT * FROM store_orders WHERE id = ?').get(req.params.id), true) });
  }));

  r.get('/admin/requests', requireAdmin, (_req, res) => {
    const rows = db().prepare('SELECT * FROM service_requests ORDER BY created_at DESC').all();
    res.json({ requests: rows.map((q) => requestOut(q, true)) });
  });

  r.post('/admin/requests/:id/status', requireAdmin, handle((req, res) => {
    const b = body(req);
    const status = oneOf(b.status, REQUEST_ADMIN_STATUSES, 'status');
    const d = db();
    const row = d.prepare('SELECT * FROM service_requests WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Request not found' });
    let priestId = row.priest_id;
    if (b.priestId !== undefined && b.priestId !== null && b.priestId !== '') {
      const p = typeof b.priestId === 'string' && d.prepare("SELECT id FROM priests WHERE id = ? AND status = 'verified'").get(b.priestId);
      if (!p) fail('priestId does not match a verified priest');
      priestId = p.id;
    }
    if (status === 'assigned' && !priestId) fail("priestId is required when status is 'assigned'");
    d.prepare('UPDATE service_requests SET status = ?, priest_id = ?, updated_at = ? WHERE id = ?').run(status, priestId, now(), row.id);
    audit(req, 'request.status', row.id, { from: row.status, status, priestId });
    res.json({ request: requestOut(d.prepare('SELECT * FROM service_requests WHERE id = ?').get(row.id), true) });
  }));

  return r;
}
