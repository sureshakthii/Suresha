// Builds a backend-free copy of the app into dist/artifact/ for hosting as a static test page.
// Everything runs on the device; astronomy-engine loads from the jsDelivr CDN.
import fs from 'node:fs';
import path from 'node:path';

const out = 'dist/artifact';
const AE = 'https://cdn.jsdelivr.net/npm/astronomy-engine@2.1.19/esm/astronomy.js';
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'shared'), { recursive: true });

// shared/ has sub-folders (rules/), so copy it recursively.
for (const f of fs.readdirSync('shared', { recursive: true }).filter((x) => x.endsWith('.js'))) {
  const src = fs.readFileSync(path.join('shared', f), 'utf8').replace("from 'astronomy-engine'", `from '${AE}'`);
  fs.mkdirSync(path.dirname(path.join(out, 'shared', f)), { recursive: true });
  fs.writeFileSync(path.join(out, 'shared', f), src);
}
for (const f of fs.readdirSync('public').filter((x) => x.endsWith('.js') && x !== 'sw.js')) fs.copyFileSync(path.join('public', f), path.join(out, f));
fs.copyFileSync('public/icon.svg', path.join(out, 'icon.svg'));
fs.copyFileSync('public/logo.svg', path.join(out, 'logo.svg'));
const { CATEGORIES } = await import('../server/market.js');
const catalog = JSON.parse(fs.readFileSync('server/data/products.json', 'utf8'));
fs.writeFileSync(path.join(out, 'products.json'), JSON.stringify({ ...catalog, categories: CATEGORIES }));
const { PLANS } = await import('../server/billing.js');
fs.writeFileSync(path.join(out, 'plans.json'), JSON.stringify(PLANS));

const html = fs.readFileSync('public/index.html', 'utf8');
const css = fs.readFileSync('public/styles.css', 'utf8');
const body = html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>'))
  .replace('<script type="module" src="/app.js"></script>', '<script>window.KJ_STATIC = true;</script>\n  <script type="module" src="app.js"></script>');
const fonts = /<link href="https:\/\/fonts\.googleapis\.com[^>]+>/.exec(html)[0];
const page = `<title>துணை Thunai</title>
${fonts}
<style>
${css}
.topbar { top: env(safe-area-inset-top, 0px); }
</style>
${body}`;
fs.writeFileSync(path.join(out, 'index.html'), page);
console.log(`Built ${out}`);
