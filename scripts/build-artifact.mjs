// Builds a backend-free copy of the app into dist/artifact/ for hosting as a static test page.
// Everything runs on the device; astronomy-engine loads from the jsDelivr CDN.
import fs from 'node:fs';
import path from 'node:path';

const out = 'dist/artifact';
const AE = 'https://cdn.jsdelivr.net/npm/astronomy-engine@2.1.19/esm/astronomy.js';
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'shared'), { recursive: true });

for (const f of ['astro.js', 'prasna.js', 'narrator.js', 'places.js']) {
  const src = fs.readFileSync(path.join('shared', f), 'utf8').replace("from 'astronomy-engine'", `from '${AE}'`);
  fs.writeFileSync(path.join(out, 'shared', f), src);
}
fs.copyFileSync('public/app.js', path.join(out, 'app.js'));
fs.copyFileSync('public/icon.svg', path.join(out, 'icon.svg'));

const html = fs.readFileSync('public/index.html', 'utf8');
const css = fs.readFileSync('public/styles.css', 'utf8');
const body = html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>'))
  .replace('<script type="module" src="/app.js"></script>', '<script>window.KJ_STATIC = true;</script>\n  <script type="module" src="app.js"></script>');
const fonts = /<link href="https:\/\/fonts\.googleapis\.com[^>]+>/.exec(html)[0];
const page = `<title>Kaippesi Jothidar</title>
${fonts}
<style>
:root { color-scheme: dark; }
${css}
.topbar { top: env(safe-area-inset-top, 0px); }
</style>
${body}`;
fs.writeFileSync(path.join(out, 'index.html'), page);
console.log(`Built ${out}`);
