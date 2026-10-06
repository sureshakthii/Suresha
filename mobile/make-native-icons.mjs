// Generates the native launcher icons and splash screens from the app logo
// (public/icon.svg for crisp large sizes, falling back to public/icon-512.png).
//   Android: mipmap-*/ic_launcher.png, ic_launcher_round.png, ic_launcher_foreground.png and drawable*/splash.png
//   iOS:     Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png (1024 px) and Splash.imageset (2732 px)
// Uses the Playwright Chromium that is already installed (no `playwright install` needed).
// Usage: npm run mobile:icons   (re-run whenever the logo changes)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BG = '#9e2449';
const svgFile = path.join(root, 'public', 'icon.svg');
const src = fs.existsSync(svgFile)
  ? `data:image/svg+xml;base64,${fs.readFileSync(svgFile).toString('base64')}`
  : `data:image/png;base64,${fs.readFileSync(path.join(root, 'public', 'icon-512.png')).toString('base64')}`;
const androidRes = path.join(root, 'android', 'app', 'src', 'main', 'res');
const iosAssets = path.join(root, 'ios', 'App', 'App', 'Assets.xcassets');

// Android density buckets: legacy icon px (48dp) and adaptive foreground px (108dp).
const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
const SPLASH = {
  'drawable': [480, 320],
  'drawable-port-mdpi': [320, 480], 'drawable-port-hdpi': [480, 800], 'drawable-port-xhdpi': [720, 1280],
  'drawable-port-xxhdpi': [960, 1600], 'drawable-port-xxxhdpi': [1280, 1920],
  'drawable-land-mdpi': [480, 320], 'drawable-land-hdpi': [800, 480], 'drawable-land-xhdpi': [1280, 720],
  'drawable-land-xxhdpi': [1600, 960], 'drawable-land-xxxhdpi': [1920, 1280],
};

const browser = await chromium.launch();
const written = [];

/**
 * Render one PNG. `img` = image size in px, `clip` = CSS border-radius applied to the image box,
 * `bg` = page background (null → transparent).
 */
async function render(file, { w, h = w, img, clip = '0', bg = BG, scale = 1 }) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const inner = Math.round(img * scale);
  await page.setContent(`<html><body style="margin:0;width:${w}px;height:${h}px;display:flex;align-items:center;justify-content:center;background:${bg || 'transparent'}">
    <div style="width:${img}px;height:${img}px;border-radius:${clip};overflow:hidden;display:flex;align-items:center;justify-content:center;background:${BG}">
      <img src="${src}" style="width:${inner}px;height:${inner}px;flex:none" />
    </div></body></html>`);
  await page.waitForFunction(() => document.images[0].complete);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await page.screenshot({ path: file, omitBackground: !bg });
  await page.close();
  written.push(path.relative(root, file));
}

if (fs.existsSync(androidRes)) {
  for (const [name, d] of Object.entries(DENSITIES)) {
    const dir = path.join(androidRes, `mipmap-${name}`);
    const legacy = Math.round(48 * d);
    const canvas = Math.round(108 * d);
    // Legacy (pre-Android 8) square icon with rounded corners, and the round variant.
    await render(path.join(dir, 'ic_launcher.png'), { w: legacy, img: legacy, clip: '22%', bg: null });
    await render(path.join(dir, 'ic_launcher_round.png'), { w: legacy, img: legacy, clip: '50%', bg: null, scale: 1.12 });
    // Adaptive foreground: 108dp canvas; launchers show roughly the centre 72dp, so the logo
    // fills 84dp — its rounded corners fall outside the visible mask.
    await render(path.join(dir, 'ic_launcher_foreground.png'), { w: canvas, img: Math.round(84 * d) });
  }
  for (const [dir, [w, h]] of Object.entries(SPLASH)) {
    await render(path.join(androidRes, dir, 'splash.png'), { w, h, img: Math.round(Math.min(w, h) * 0.38), clip: '22%' });
  }
  fs.writeFileSync(path.join(androidRes, 'values', 'ic_launcher_background.xml'),
    `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${BG}</color>\n</resources>\n`);
} else {
  console.warn('⚠ android/ not found — run `npx cap add android` first.');
}

if (fs.existsSync(iosAssets)) {
  // App Store icon: 1024 px, opaque, square (iOS applies its own corner mask).
  await render(path.join(iosAssets, 'AppIcon.appiconset', 'AppIcon-512@2x.png'), { w: 1024, img: 1024, scale: 1.14 });
  const splashDir = path.join(iosAssets, 'Splash.imageset');
  for (const name of ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png']) {
    await render(path.join(splashDir, name), { w: 2732, img: 640, clip: '22%' });
  }
} else {
  console.warn('ℹ ios/ not found — skipping iOS icons.');
}

await browser.close();
console.log(`✔ ${written.length} images written:\n  ${written.join('\n  ')}`);
