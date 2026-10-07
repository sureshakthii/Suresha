// Web app icons from public/icon.svg (re-run whenever the logo changes): npm run icons
//   icon-192.png / icon-512.png        — "any" purpose (rounded square, as drawn)
//   icon-maskable-192.png / -512.png   — "maskable": full-bleed background, artwork inside the 80 % safe zone,
//                                        so Android's circle / squircle masks never cut the lamp or show corners
//   apple-touch-icon.png (180)         — iOS home screen (opaque, iOS rounds the corners itself)
import { chromium } from 'playwright';
import fs from 'node:fs';
const svg = fs.readFileSync('public/icon.svg', 'utf8');
/** Full-bleed variant: square background, artwork scaled about the centre. */
const fullBleed = (scale) => svg
  .replace('<rect width="512" height="512" rx="112" fill="url(#bg)"/>', '<rect width="512" height="512" fill="url(#bg)"/>')
  .replace(/(<rect width="512" height="512" fill="url\(#bg\)"\/>)([\s\S]*)(<\/svg>)/, `$1<g transform="translate(256 256) scale(${scale}) translate(-256 -256)">$2</g>$3`);
const b = await chromium.launch();
async function shot(markup, size, file, bg = '#3d0d1f') {
  const p = await b.newPage({ viewport: { width: size, height: size } });
  await p.setContent(`<html><body style="margin:0;background:${bg}">${markup.replace('<svg ', `<svg width="${size}" height="${size}" style="display:block" `)}</body></html>`);
  await p.screenshot({ path: file });
  await p.close();
}
const only = process.argv.slice(2);
const want = (f) => !only.length || only.includes(f);
for (const size of [192, 512]) if (want(`icon-${size}.png`)) await shot(svg, size, `public/icon-${size}.png`);
for (const size of [192, 512]) if (want(`icon-maskable-${size}.png`)) await shot(fullBleed(0.8), size, `public/icon-maskable-${size}.png`);
if (want('apple-touch-icon.png')) await shot(fullBleed(0.9), 180, 'public/apple-touch-icon.png');
await b.close();
