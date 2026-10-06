// Small policy API: help contacts for the safety screens and an admin-only metrics snapshot.
import express from 'express';
import crypto from 'node:crypto';
import { resourcesFor, resolveJurisdiction, allEntries, DIRECTORY_VERSION } from './resource-directory.js';
import { auditSnapshot } from './audit-events.js';
import { VERSIONS } from './index.js';

function requireAdmin(req, res, next) {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return res.status(503).json({ error: 'Admin is not configured (set ADMIN_TOKEN)' });
  const given = req.get('x-admin-token');
  if (!given) return res.status(401).json({ error: 'Admin token required' });
  const a = Buffer.from(given); const b = Buffer.from(token);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.status(403).json({ error: 'Invalid admin token' });
  next();
}

export function policyRouter() {
  const r = express.Router();
  /** GET /api/safety/resources?country=IN|AE&lat&lon&lang — contacts with source + verification status. */
  r.get('/safety/resources', (req, res) => {
    const q = req.query;
    const j = resolveJurisdiction({ country: q.country, loc: q.lat !== undefined ? { lat: q.lat, lon: q.lon } : null });
    const lang = q.lang === 'ta' ? 'ta' : 'en';
    res.json(resourcesFor(j, ['emergency', 'child', 'mental_health'], lang));
  });
  /** Admin: verification checklist for the help directory. */
  r.get('/admin/policy/resources', requireAdmin, (_req, res) => res.json({ version: DIRECTORY_VERSION, entries: allEntries() }));
  /** Admin: minimal policy metrics (no message text, DOB or location). */
  r.get('/admin/policy/metrics', requireAdmin, (_req, res) => res.json({ versions: VERSIONS, ...auditSnapshot() }));
  return r;
}
