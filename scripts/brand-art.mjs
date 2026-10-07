// Shared artwork for every generated icon / splash / share image (web, Android, iOS).
// Source of truth is public/icon.svg: its <defs>, the rounded gradient tile and the lamp-and-arch mark on top.
// Every variant below is built from those same paths, so changing icon.svg and re-running
//   npm run icons && npm run mobile:icons
// regenerates everything consistently.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = fs.readFileSync(path.join(root, 'public', 'icon.svg'), 'utf8');
const TILE = /<rect width="512" height="512" rx="112" fill="url\(#bg\)"\/>/;
if (!TILE.test(src)) throw new Error('public/icon.svg: background tile <rect … rx="112" fill="url(#bg)"/> not found');

/** Brand colours. SPLASH is the ONE launch colour: native splash, window background, first status bar. */
export const COLORS = Object.freeze({ SPLASH: '#3d0d1f', TILE_TOP: '#c2305a', TILE_BOTTOM: '#7a1636' });

export const DEFS = src.match(/<defs>[\s\S]*?<\/defs>/)[0];
/** The mark (glow, arch, flame, diya, base) without the tile, in icon.svg's 512-unit coordinates. */
export const MARK = src.slice(src.search(TILE)).replace(TILE, '').replace(/<\/svg>\s*$/, '').trim();
/** Visual centre and the radius that encloses every opaque part of the mark (arch, base bar corners). */
export const MARK_CX = 256;
export const MARK_CY = 259;
export const MARK_R = 210;

/** Place the mark so its enclosing circle has radius `r` around (cx, cy) in the target coordinates. */
const place = (body, cx, cy, r) => `<g transform="translate(${cx} ${cy}) scale(${r / MARK_R}) translate(${-MARK_CX} ${-MARK_CY})">${body}</g>`;

/** Single-colour silhouette for Android 13 themed icons: only alpha matters; inner flame and diya groove cut out. */
const MONO = `
  <defs><mask id="m" maskUnits="userSpaceOnUse" x="0" y="0" width="512" height="512">
    <rect width="512" height="512" fill="#000"/>
    <path d="M120 404V250c0-75 61-136 136-136s136 61 136 136v154" fill="none" stroke="#fff" stroke-width="16" stroke-linecap="round"/>
    <path d="M152 404V256c0-57 47-104 104-104s104 47 104 104v148" fill="none" stroke="#fff" stroke-width="5" opacity=".55"/>
    <path d="M256 150c32 40 50 70 50 98a50 50 0 0 1-100 0c0-28 18-58 50-98z" fill="#fff"/>
    <path d="M256 214c10 13 15 23 15 32a15 15 0 0 1-30 0c0-9 5-19 15-32z" fill="#000"/>
    <path d="M168 300h176c-6 44-42 74-88 74s-82-30-88-74z" fill="#fff"/>
    <path d="M196 300c8 28 32 46 60 46s52-18 60-46" fill="none" stroke="#000" stroke-width="6"/>
    <rect x="112" y="398" width="288" height="14" rx="7" fill="#fff"/>
  </mask></defs>
  <rect width="512" height="512" fill="#fff" mask="url(#m)"/>`;

const svg = (vb, body, extraDefs = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vb} ${vb}">${DEFS}${extraDefs}${body}</svg>`;
const gradientRect = (w, h, rx = 0) => `<rect width="${w}" height="${h}" rx="${rx}" fill="url(#bg)"/>`;

export const art = {
  /** "any" icon exactly as drawn: rounded tile, transparent corners. */
  tile: () => src,
  /** Full-bleed square (maskable, apple-touch, iOS App Store): gradient to the edges, mark radius = `k` × half-size. */
  fullBleed: (k) => svg(512, gradientRect(512, 512) + place(MARK, 256, 256, 256 * k)),
  /** Legacy Android square icon: rounded tile inset by `inset` (fraction of size), transparent around it. */
  legacy: (inset = 1 / 24) => {
    const p = 512 * inset, s = 512 - 2 * p;
    return svg(512, `<g transform="translate(${p} ${p}) scale(${s / 512})">${gradientRect(512, 512, 112)}${place(MARK, 256, 256, 256 * 0.82)}</g>`);
  },
  /** Legacy Android round icon. */
  round: (inset = 1 / 24) => {
    const r = 256 * (1 - 2 * inset);
    return svg(512, `<circle cx="256" cy="256" r="${r}" fill="url(#bg)"/>${place(MARK, 256, 256, r * 0.8)}`);
  },
  /** Adaptive foreground (108 dp canvas): mark only, inside the 66 dp safe circle, transparent elsewhere. */
  foreground: (safeRadiusDp = 32) => svg(108, place(MARK, 54, 54, safeRadiusDp)),
  /** Adaptive monochrome layer (Android 13 themed icon): same placement as the foreground. */
  monochrome: (safeRadiusDp = 32) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108">${place(MONO, 54, 54, safeRadiusDp)}</svg>`,
  /** Splash: the mark (no tile) on the flat launch colour, mark radius = `r` px on a w×h canvas. */
  splash: (w, h, r) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">${DEFS}<rect width="${w}" height="${h}" fill="${COLORS.SPLASH}"/>${place(MARK, w / 2, h / 2, r)}</svg>`,
};

/** Base64 data URI of a bundled font file (public/fonts/…), for rendering text in headless Chromium. */
export const fontData = (file) => `data:font/woff2;base64,${fs.readFileSync(path.join(root, 'public', 'fonts', file)).toString('base64')}`;

/**
 * Render SVG markup (or full HTML with `html: true`) to a PNG with Playwright's Chromium.
 * `transparent` keeps the alpha channel (adaptive layers, "any" icons); otherwise the page is opaque.
 */
export async function renderPng(browser, markup, file, { w, h = w, transparent = false, html = false }) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const body = html ? markup : `<html><body style="margin:0;background:transparent">${markup.replace('<svg ', `<svg width="${w}" height="${h}" style="display:block" `)}</body></html>`;
  await page.setContent(body);
  await page.evaluate(async () => { await document.fonts?.ready; await Promise.all([...document.images].map((i) => i.decode().catch(() => {}))); });
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await page.screenshot({ path: file, omitBackground: transparent });
  await page.close();
}
