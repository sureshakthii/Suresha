// Web icons and share image from public/icon.svg (re-run whenever the logo changes): npm run icons
//   icon-192.png / icon-512.png        — "any": rounded tile as drawn, TRANSPARENT corners
//   icon-maskable-192.png / -512.png   — "maskable": full-bleed gradient, mark inside the 80 % safe circle,
//                                        so Android's circle / squircle masks never cut the lamp or show corners
//   apple-touch-icon.png (180)         — iOS home screen (opaque, iOS rounds the corners itself)
//   og-image.png (1200×630)            — Open Graph / Twitter card preview
// Pass file names to regenerate only some: node scripts/make-icons.mjs og-image.png
import path from 'node:path';
import { chromium } from 'playwright';
import { art, COLORS, root, renderPng, fontData } from './brand-art.mjs';

const out = (f) => path.join(root, 'public', f);
const only = process.argv.slice(2);
const want = (f) => !only.length || only.includes(f);

function ogHtml() {
  const tile = art.tile().replace('<svg ', '<svg width="300" height="300" ');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  @font-face { font-family: 'NST'; font-weight: 700; src: url('${fontData('noto-serif-tamil-tamil-700-normal.woff2')}') format('woff2'); }
  @font-face { font-family: 'NS'; font-weight: 500; src: url('${fontData('noto-sans-tamil-tamil-500-normal.woff2')}') format('woff2'); }
  @font-face { font-family: 'Inter'; font-weight: 500; src: url('${fontData('inter-latin-500-normal.woff2')}') format('woff2'); }
  @font-face { font-family: 'Inter'; font-weight: 700; src: url('${fontData('inter-latin-700-normal.woff2')}') format('woff2'); }
  html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; }
  body { display: flex; align-items: center; gap: 64px; padding: 0 88px; box-sizing: border-box;
    background: radial-gradient(70% 90% at 22% 45%, #7a1636 0%, transparent 70%), linear-gradient(160deg, #57142e, ${COLORS.SPLASH} 70%);
    color: #f7f0e8; font-family: 'Inter', 'NS', sans-serif; }
  .tile { flex: none; filter: drop-shadow(0 18px 48px rgba(0,0,0,.45)) drop-shadow(0 0 60px rgba(240,194,122,.25)); }
  h1 { margin: 0; font: 700 128px/1.1 'NST', serif; color: #f0c27a; }
  .en { margin: 22px 0 30px; font: 700 34px/1 'Inter', sans-serif; letter-spacing: 14px; color: #f7d9a6; }
  .ta { margin: 0 0 12px; font: 500 38px/1.35 'NS', sans-serif; }
  .desc { margin: 0; font: 500 27px/1.4 'Inter', sans-serif; color: #e6d6c8; max-width: 640px; }
  </style></head><body>
  <div class="tile">${tile}</div>
  <div><h1>துணை</h1><p class="en">THUNAI</p>
  <p class="ta">உங்கள் வாழ்வின் வழித்துணை</p>
  <p class="desc">Tamil panchangam, family horoscopes, festivals and temple journeys — Tamil &amp; English.</p></div>
  </body></html>`;
}

const b = await chromium.launch();
for (const size of [192, 512]) if (want(`icon-${size}.png`)) await renderPng(b, art.tile(), out(`icon-${size}.png`), { w: size, transparent: true });
for (const size of [192, 512]) if (want(`icon-maskable-${size}.png`)) await renderPng(b, art.fullBleed(0.64), out(`icon-maskable-${size}.png`), { w: size });
if (want('apple-touch-icon.png')) await renderPng(b, art.fullBleed(0.74), out('apple-touch-icon.png'), { w: 180 });
if (want('og-image.png')) await renderPng(b, ogHtml(), out('og-image.png'), { w: 1200, h: 630, html: true });
await b.close();
console.log('✔ web icons written to public/');
