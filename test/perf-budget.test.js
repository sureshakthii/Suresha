// Performance and install-quality guards: what the first screen downloads, what the service worker precaches,
// the on-demand screen list, and the web app manifest. Budgets are raw (uncompressed) bytes; gzip is ~3-4x smaller.
// If a budget fails, prefer loading the new code on demand (public/lazy-screens.js, or import() inside the screen
// that needs it) over raising the number.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BOOT_BUDGET_KB = 4000; // static imports from public/app.js (everything parsed before Today shows)
const PRECACHE_BUDGET_KB = 6000; // public/sw.js SHELL
const STATIC_RE = /(?:import|export)\s+(?:[^'"`;]*?\s+from\s+)?['"]([^'"]+)['"]/g;

const fileFor = (u) => (u.startsWith('/shared/') ? path.join(root, u)
  : u === '/vendor/astronomy-engine.js' ? path.join(root, 'node_modules/astronomy-engine/esm/astronomy.js')
    : path.join(root, 'public', u));
const strip = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/** Static (non-dynamic) import graph from /app.js. */
function bootGraph() {
  const seen = new Set();
  const queue = ['/app.js'];
  while (queue.length) {
    const u = queue.shift();
    if (seen.has(u)) continue;
    seen.add(u);
    if (u.startsWith('/vendor/')) continue;
    for (const m of strip(fs.readFileSync(fileFor(u), 'utf8')).matchAll(STATIC_RE)) {
      const spec = m[1];
      if (spec === 'astronomy-engine') queue.push('/vendor/astronomy-engine.js');
      else if (spec.startsWith('.') || spec.startsWith('/')) queue.push(new URL(spec, `http://x${u}`).pathname);
    }
  }
  return seen;
}
const kb = (urls) => Math.round([...urls].reduce((a, u) => a + (fs.existsSync(fileFor(u)) ? fs.statSync(fileFor(u)).size : 0), 0) / 1024);

/** public/lazy-screens.js: [[module, { screen: meta }]] */
function lazyList() {
  const src = fs.readFileSync(path.join(root, 'public/lazy-screens.js'), 'utf8');
  const out = [];
  for (const m of src.matchAll(/import\('\.\/([\w-]+\.js)'\)\s*,\s*\{([\s\S]*?)\}\]/g)) {
    const screens = {};
    for (const s of m[2].matchAll(/(\w+):\s*\{([^}]*)\}/g)) {
      screens[s[1]] = { parent: /parent:\s*'(\w+)'/.exec(s[2])?.[1] || null, needsMember: /needsMember:\s*true/.test(s[2]) };
    }
    out.push([`/${m[1]}`, screens]);
  }
  return out;
}

test(`first-screen JavaScript stays within ${BOOT_BUDGET_KB} KB (raw)`, () => {
  const g = bootGraph();
  const size = kb(g);
  assert.ok(size <= BOOT_BUDGET_KB, `app.js static import graph is ${size} KB (${g.size} files) — over the ${BOOT_BUDGET_KB} KB budget`);
});

test('on-demand screens are not pulled into the first screen by a static import', () => {
  const g = bootGraph();
  const eager = lazyList().map(([mod]) => mod).filter((mod) => g.has(mod));
  assert.deepEqual(eager, [], `statically imported (so not on demand any more): ${eager.join(', ')} — import it with import() or drop it from public/lazy-screens.js`);
});

test('lazy-screens.js stubs match the screens each module registers (names, parent, needsMember)', () => {
  const list = lazyList();
  assert.ok(list.length >= 10, 'expected the on-demand screen list');
  for (const [mod, stubs] of list) {
    const src = fs.readFileSync(fileFor(mod), 'utf8');
    const real = {};
    for (const m of src.matchAll(/registerScreen\('([\w-]+)',\s*\{([^}]*)\}/g)) {
      real[m[1]] = { parent: /parent:\s*'(\w+)'/.exec(m[2])?.[1] || null, needsMember: /needsMember:\s*true/.test(m[2]) };
    }
    assert.deepEqual(stubs, real, `${mod}: stub list in public/lazy-screens.js differs from its registerScreen() calls`);
  }
});

test(`service-worker precache stays within ${PRECACHE_BUDGET_KB} KB and includes the new boot modules`, () => {
  const sw = fs.readFileSync(path.join(root, 'public/sw.js'), 'utf8');
  const shell = [...(/const SHELL = \[([\s\S]*?)\];/.exec(sw)[1]).matchAll(/'([^']+)'/g)].map((x) => x[1]).filter((u) => u !== '/');
  const size = kb(shell);
  assert.ok(size <= PRECACHE_BUDGET_KB, `precache is ${size} KB — over the ${PRECACHE_BUDGET_KB} KB budget (OCR, hymn and story texts stay out of it)`);
  for (const u of ['/lazy-screens.js', '/pwa.js']) assert.ok(shell.includes(u), `${u} must be precached`);
  assert.ok(!shell.some((u) => u.startsWith('/vendor/ocr/') || u.startsWith('/screenshots/')), 'OCR files and install screenshots are never precached');
});

test('index.html: import map before any module preload, preloads point at real files', () => {
  const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  const im = html.indexOf('type="importmap"');
  const firstPreload = html.indexOf('rel="modulepreload"');
  assert.ok(im > 0 && firstPreload > im, 'the import map must come before modulepreload links');
  for (const m of html.matchAll(/rel="(?:modulepreload|preload)" href="([^"]+)"/g)) assert.ok(fs.existsSync(fileFor(m[1])), `preloaded file missing: ${m[1]}`);
  assert.match(html, /rel="apple-touch-icon" href="\/apple-touch-icon\.png"/);
});

test('web app manifest: names, colours, maskable icons, screenshots, shortcuts', () => {
  const man = JSON.parse(fs.readFileSync(path.join(root, 'public/manifest.webmanifest'), 'utf8'));
  assert.equal(man.name, 'Thunai — துணை');
  assert.ok(man.short_name && man.short_name.length <= 12, 'short_name fits under the home-screen icon');
  assert.match(man.description, /[஀-௿]/, 'Tamil description');
  assert.match(man.description, /[A-Za-z]{4}/, 'English description');
  assert.ok(man.id && man.start_url && man.display === 'standalone');
  assert.match(man.theme_color, /^#[0-9a-f]{6}$/i);
  assert.match(man.background_color, /^#[0-9a-f]{6}$/i);
  const purposes = man.icons.map((i) => `${i.sizes}:${i.purpose}`);
  for (const p of ['192x192:any', '512x512:any', '192x192:maskable', '512x512:maskable']) assert.ok(purposes.includes(p), `icon ${p}`);
  for (const i of [...man.icons, ...man.screenshots]) assert.ok(fs.existsSync(path.join(root, 'public', i.src)), `missing ${i.src}`);
  assert.ok(man.screenshots.some((s) => s.form_factor === 'narrow') && man.screenshots.some((s) => s.form_factor === 'wide'));
  assert.ok(man.screenshots.every((s) => fs.statSync(path.join(root, 'public', s.src)).size < 400 * 1024), 'screenshots stay small');
  const urls = man.shortcuts.map((s) => s.url.split('#')[1]);
  assert.deepEqual(urls, ['today', 'ask', 'panchangam', 'festivals']);
  const app = fs.readFileSync(path.join(root, 'public/app.js'), 'utf8');
  for (const h of urls) assert.ok(app.includes(`'#${h}'`), `app.js handles the #${h} shortcut`);
});
