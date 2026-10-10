// Every module the browser can reach by import from public/app.js must be in the service-worker precache,
// so the app (charts, calendars, planners) works offline after the first visit.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IMPORT_RE = /(?:import|export)\s+(?:[^'"`;]*?\s+from\s+)?['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;
const BARE = { 'astronomy-engine': '/vendor/astronomy-engine.js' };

/** URL path (as the browser requests it) -> file on disk. */
function fileFor(url) {
  if (url.startsWith('/shared/')) return path.join(root, url);
  if (url.startsWith('/vendor/')) return null; // served from node_modules by the server
  return path.join(root, 'public', url);
}

/** Static walk of import specifiers (static and literal dynamic imports) starting at /app.js. */
export function reachableUrls(entry = '/app.js') {
  const seen = new Set();
  const queue = [entry];
  while (queue.length) {
    const url = queue.shift();
    if (seen.has(url)) continue;
    seen.add(url);
    const file = fileFor(url);
    if (!file) continue;
    const src = fs.readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    for (const m of src.matchAll(IMPORT_RE)) {
      const spec = m[1] || m[2];
      if (BARE[spec]) { queue.push(BARE[spec]); continue; }
      if (!spec.startsWith('.') && !spec.startsWith('/')) continue;
      queue.push(new URL(spec, `http://x${url}`).pathname);
    }
  }
  return [...seen];
}

function precacheList() {
  const sw = fs.readFileSync(path.join(root, 'public/sw.js'), 'utf8');
  const m = /const SHELL = \[([\s\S]*?)\];/.exec(sw);
  assert.ok(m, 'sw.js must define const SHELL = [...]');
  return new Set([...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]));
}

test('every module reachable from public/app.js is precached by the service worker', () => {
  const shell = precacheList();
  const urls = reachableUrls();
  assert.ok(urls.includes('/shared/astro.js') && urls.includes('/shared/rules/registry.js'), 'walker should reach shared modules');
  const missing = urls.filter((u) => !shell.has(u));
  assert.deepEqual(missing, [], `missing from public/sw.js SHELL: ${missing.join(', ')}`);
});

test('every precached file exists (or is served by the server)', () => {
  for (const u of precacheList()) {
    if (u === '/' || u.startsWith('/vendor/')) continue;
    const f = fileFor(u);
    assert.ok(fs.existsSync(f), `precached file does not exist: ${u}`);
  }
});

test('service worker cache version was bumped for Thunai', () => {
  const sw = fs.readFileSync(path.join(root, 'public/sw.js'), 'utf8');
  const v = /const CACHE = 'kj-v(\d+)'/.exec(sw);
  assert.ok(v && Number(v[1]) >= 13, 'CACHE should be kj-v13 or later');
});
