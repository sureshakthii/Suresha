// Builds a backend-free copy of the app into dist/artifact/ for hosting as a static test page.
// Everything runs on the device; astronomy-engine loads from the jsDelivr CDN.
import fs from 'node:fs';
import path from 'node:path';

// KJ_OUT picks the folder, so a review copy can be built next to the test copy.
const out = process.env.KJ_OUT || 'dist/artifact';
const AE = 'https://cdn.jsdelivr.net/npm/astronomy-engine@2.1.19/esm/astronomy.js';
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'shared'), { recursive: true });

// shared/ has sub-folders (rules/), so copy it recursively — modules get the CDN astronomy-engine; any data file
// (JSON etc.) is copied as is.
for (const f of fs.readdirSync('shared', { recursive: true }).map(String)) {
  const from = path.join('shared', f);
  if (!fs.statSync(from).isFile()) continue;
  fs.mkdirSync(path.dirname(path.join(out, 'shared', f)), { recursive: true });
  if (f.endsWith('.js')) fs.writeFileSync(path.join(out, 'shared', f), fs.readFileSync(from, 'utf8').replace("from 'astronomy-engine'", `from '${AE}'`));
  else fs.copyFileSync(from, path.join(out, 'shared', f));
}
for (const f of fs.readdirSync('public').filter((x) => x.endsWith('.js') && x !== 'sw.js')) fs.copyFileSync(path.join('public', f), path.join(out, f));
fs.copyFileSync('public/icon.svg', path.join(out, 'icon.svg'));
fs.copyFileSync('public/logo.svg', path.join(out, 'logo.svg'));
fs.cpSync('public/fonts', path.join(out, 'fonts'), { recursive: true });
// Horoscope-import reader (tesseract.js + Tamil/English models + pdf.js, ~14 MB): served from the build's own
// folder by relative URL and loaded only when someone taps Import — no CDN, works offline in the app.
if (fs.existsSync('public/vendor/ocr')) fs.cpSync('public/vendor/ocr', path.join(out, 'vendor', 'ocr'), { recursive: true });
else console.warn('⚠ public/vendor/ocr missing — horoscope import will not work in this build.');
// Device-preview page (phone · tablet · laptop · desktop frames): a standalone HTML file next to the app page.
fs.writeFileSync(path.join(out, 'devices.html'), fs.readFileSync('public/devices.html', 'utf8').replace("const APP_URL = '/';", "const APP_URL = './index.html';"));
const { CATEGORIES } = await import('../server/market.js');
const catalog = JSON.parse(fs.readFileSync('server/data/products.json', 'utf8'));
fs.writeFileSync(path.join(out, 'products.json'), JSON.stringify({ ...catalog, categories: CATEGORIES }));
const { PLANS, PLAN_TERMS } = await import('../server/billing.js');
fs.writeFileSync(path.join(out, 'plans.json'), JSON.stringify({ plans: PLANS, terms: PLAN_TERMS }));

// Time-limited review build: KJ_REVIEW_HOURS (from first launch) and KJ_REVIEW_DAYS (absolute cap from build time).
const REVIEW = Number(process.env.KJ_REVIEW_HOURS) > 0
  ? { hours: Number(process.env.KJ_REVIEW_HOURS), until: Date.now() + (Number(process.env.KJ_REVIEW_DAYS) || 3) * 86400000 }
  : null;
if (REVIEW) console.log(`Review build: ${REVIEW.hours} h from first launch, hard stop ${new Date(REVIEW.until).toISOString()}`);
const html = fs.readFileSync('public/index.html', 'utf8');
const css = fs.readFileSync('public/styles.css', 'utf8');
const body = html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>'))
  .replace('<script type="module" src="/app.js"></script>', `<script>window.KJ_STATIC = true; window.KJ_BUILD = '${(process.env.GITHUB_RUN_NUMBER ? `build ${process.env.GITHUB_RUN_NUMBER} · ` : '')}${new Date().toISOString().slice(0, 10)}${REVIEW ? ' · review' : ''}';${REVIEW ? ` window.KJ_REVIEW = ${JSON.stringify(REVIEW)};` : ''}</script>\n  ${REVIEW ? '<script src="review-lock.js"></script>\n  ' : ''}<script type="module" src="app.js"></script>`);
const fonts = `<style>\n${fs.readFileSync('public/fonts.css', 'utf8')}</style>`;
// In the Android / iOS app the native splash goes as soon as this page paints its own splash (no blank gap).
// (Measured and left out: <link rel=modulepreload> for every boot module saved ~0.1 s to Today but delayed the
// first paint by ~0.2 s on a slow phone; font preloads delayed it too — the @font-face rules are inline anyway.)
const head = `<script>requestAnimationFrame(function () { try { window.Capacitor && window.Capacitor.Plugins.SplashScreen && window.Capacitor.Plugins.SplashScreen.hide({ fadeOutDuration: 150 }); } catch (e) { /* web */ } });</script>`;
const page = `<title>${REVIEW ? "துணை · THUNAI Review" : "துணை · THUNAI"}</title>
${head}
${fonts}
<style>
:root { color-scheme: dark; }
${css}
.topbar { top: 0; }
</style>
${body}`;
fs.writeFileSync(path.join(out, 'index.html'), page);
console.log(`Built ${out}`);
