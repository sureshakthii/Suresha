// Builds a backend-free copy of the app into dist/artifact/ for hosting as a static test page.
// Everything runs on the device; astronomy-engine loads from the jsDelivr CDN.
import fs from 'node:fs';
import path from 'node:path';

const out = 'dist/artifact';
const AE = 'https://cdn.jsdelivr.net/npm/astronomy-engine@2.1.19/esm/astronomy.js';
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'shared'), { recursive: true });

// shared/ has sub-folders (rules/), so copy it recursively.
for (const f of fs.readdirSync('shared', { recursive: true }).map(String).filter((x) => x.endsWith('.js'))) {
  const src = fs.readFileSync(path.join('shared', f), 'utf8').replace("from 'astronomy-engine'", `from '${AE}'`);
  fs.mkdirSync(path.dirname(path.join(out, 'shared', f)), { recursive: true });
  fs.writeFileSync(path.join(out, 'shared', f), src);
}
for (const f of fs.readdirSync('public').filter((x) => x.endsWith('.js') && x !== 'sw.js')) fs.copyFileSync(path.join('public', f), path.join(out, f));
fs.copyFileSync('public/icon.svg', path.join(out, 'icon.svg'));
fs.copyFileSync('public/logo.svg', path.join(out, 'logo.svg'));
fs.cpSync('public/fonts', path.join(out, 'fonts'), { recursive: true });
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
const page = `<title>துணை · THUNAI</title>
${fonts}
<style>
:root { color-scheme: dark; }
${css}
.topbar { top: 0; }
</style>
${body}`;
fs.writeFileSync(path.join(out, 'index.html'), page);
console.log(`Built ${out}`);
