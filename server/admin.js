// Admin access and audit trail shared by billing, market and growth routes.
//
// Tokens: ADMIN_TOKENS="name:role:token,name2:role:token2" (roles: owner | finance | support | viewer).
// The legacy single ADMIN_TOKEN still works and acts as an "owner" named "owner".
// Every state-changing admin action is written to audit_log (who, role, action, target, details, time, ip).
import crypto from 'node:crypto';
import { getDb } from './db.js';

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    at INTEGER NOT NULL,
    actor TEXT NOT NULL,
    role TEXT NOT NULL,
    action TEXT NOT NULL,
    target TEXT,
    details TEXT,
    ip TEXT
  );
  CREATE INDEX IF NOT EXISTS audit_at ON audit_log(at);
  CREATE TABLE IF NOT EXISTS rate_hits (
    key TEXT PRIMARY KEY,
    window_start INTEGER NOT NULL,
    n INTEGER NOT NULL
  );
`;
const ready = new WeakSet();
function db() {
  const d = getDb();
  if (!ready.has(d)) { d.exec(SCHEMA); ready.add(d); }
  return d;
}

export const ROLES = ['viewer', 'support', 'finance', 'owner'];
const rank = (r) => ROLES.indexOf(r);

function safeEqual(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

/** Parsed admin identities from the environment (read each time so tests can change env). */
export function adminIdentities() {
  const out = [];
  for (const part of String(process.env.ADMIN_TOKENS || '').split(',').map((s) => s.trim()).filter(Boolean)) {
    const [name, role, ...rest] = part.split(':');
    const token = rest.join(':');
    if (name && ROLES.includes(role) && token.length >= 16) out.push({ name, role, token });
  }
  const legacy = (process.env.ADMIN_TOKEN || '').trim();
  if (legacy) out.push({ name: 'owner', role: 'owner', token: legacy });
  return out;
}

/**
 * Count one hit for `key` in a fixed window; returns the count in the current window.
 * Stored in SQLite, so limits survive restarts and are shared by every process using the same database.
 */
export function hit(key, windowMs, { peek = false } = {}) {
  const t = Date.now();
  const d = db();
  const row = d.prepare('SELECT window_start, n FROM rate_hits WHERE key = ?').get(key);
  if (!row || t - row.window_start >= windowMs) {
    if (peek) return 0;
    d.prepare('INSERT INTO rate_hits (key, window_start, n) VALUES (?, ?, 1) ON CONFLICT(key) DO UPDATE SET window_start = excluded.window_start, n = 1').run(key, t);
    if (Math.random() < 0.01) d.prepare('DELETE FROM rate_hits WHERE window_start < ?').run(t - 86400000);
    return 1;
  }
  if (peek) return row.n;
  d.prepare('UPDATE rate_hits SET n = n + 1 WHERE key = ?').run(key);
  return row.n + 1;
}

// Lock-out against token guessing: 10 failures per IP per 15 minutes.
const WINDOW = 15 * 60000;

/** Express middleware: requireAdmin(minRole = 'support'). Sets req.admin = { name, role }. */
export function requireAdmin(minRole = 'support') {
  return (req, res, next) => {
    const ids = adminIdentities();
    if (!ids.length) return res.status(503).json({ error: 'Admin is not configured (set ADMIN_TOKEN or ADMIN_TOKENS)' });
    if (hit(`adminfail:${req.ip}`, WINDOW, { peek: true }) >= 10) return res.status(429).json({ error: 'Too many failed admin attempts. Try again later.' });
    const given = req.get('x-admin-token');
    if (!given) return res.status(401).json({ error: 'Admin token required' });
    const who = ids.find((i) => safeEqual(given, i.token));
    if (!who) {
      hit(`adminfail:${req.ip}`, WINDOW);
      return res.status(403).json({ error: 'Invalid admin token' });
    }
    if (rank(who.role) < rank(minRole)) return res.status(403).json({ error: `This action needs the ${minRole} role` });
    req.admin = { name: who.name, role: who.role };
    next();
  };
}

/** Record an admin (or system) action. */
export function audit(req, action, target = null, details = null) {
  const actor = req?.admin?.name || 'system';
  const role = req?.admin?.role || 'system';
  db().prepare('INSERT INTO audit_log (at, actor, role, action, target, details, ip) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(Date.now(), actor, role, action, target, details == null ? null : JSON.stringify(details).slice(0, 2000), req?.ip || null);
}

export function auditLog(limit = 200) {
  return db().prepare('SELECT * FROM audit_log ORDER BY id DESC LIMIT ?').all(Math.min(1000, Math.max(1, limit)))
    .map((r) => ({ ...r, details: r.details ? JSON.parse(r.details) : null }));
}

let limiterSeq = 0;
/** Fixed-window rate limiter backed by SQLite (see hit()). */
export function rateLimit({ windowMs, max, key = (req) => req.ip, message = 'Too many requests. Please slow down.' }) {
  const name = `rl${++limiterSeq}`;
  return (req, res, next) => {
    if (hit(`${name}:${key(req)}`, windowMs) > max) return res.status(429).json({ error: message });
    next();
  };
}
