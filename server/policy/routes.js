// Small policy API: help contacts for the safety screens and an admin-only metrics snapshot.
// Admin routes use the shared role-based admin tokens (server/admin.js; viewer role or higher).
import express from 'express';
import { requireAdmin } from '../admin.js';
import { resourcesFor, resolveJurisdiction, allEntries, DIRECTORY_VERSION } from './resource-directory.js';
import { auditSnapshot } from './audit-events.js';
import { VERSIONS } from './index.js';

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
  r.get('/admin/policy/resources', requireAdmin('viewer'), (_req, res) => res.json({ version: DIRECTORY_VERSION, entries: allEntries() }));
  /** Admin: minimal policy metrics (no message text, DOB or location). */
  r.get('/admin/policy/metrics', requireAdmin('viewer'), (_req, res) => res.json({ versions: VERSIONS, ...auditSnapshot() }));
  return r;
}
