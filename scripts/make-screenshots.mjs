// Install-screen screenshots for manifest.webmanifest ("richer install UI" on Android / desktop Chrome).
// Usage: node scripts/make-screenshots.mjs [app URL]   (default http://localhost:3000/ — `npm start` first,
//        or serve dist/artifact after `npm run build:artifact`). Writes public/screenshots/*.jpg.
// Uses a sample profile (no real person) and the dark theme, in Tamil.
import fs from 'node:fs';
import { chromium } from 'playwright';

const url = process.argv[2] || 'http://localhost:3000/';
const out = 'public/screenshots';
fs.mkdirSync(out, { recursive: true });
const SAMPLE = { id: 'me', relation: 'self', name: 'Kumar', gender: 'male', date: '1985-04-12', time: '06:30', lat: 13.0827, lon: 80.2707, tz: 5.5, zone: 'Asia/Kolkata', place: 'Chennai' };
const LOC = { name: 'Chennai', lat: 13.0827, lon: 80.2707, tz: 5.5, zone: 'Asia/Kolkata', cc: 'IN', confirmed: true };
const seed = `try { localStorage.setItem('kj_family', ${JSON.stringify(JSON.stringify([SAMPLE]))}); localStorage.setItem('kj_active', '"me"');
  localStorage.setItem('kj_loc', ${JSON.stringify(JSON.stringify(LOC))}); localStorage.setItem('kj_lang', '"ta"'); localStorage.setItem('kj_install_dismissed', String(Date.now())); } catch {}`;

const browser = await chromium.launch();
async function capture(file, view, { width, height, scale }) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: scale, isMobile: width < 600, hasTouch: width < 600, colorScheme: 'dark', serviceWorkers: 'block' });
  await ctx.addInitScript(seed);
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => { const a = document.getElementById('app'); return a && !a.hidden && !document.getElementById('splash'); }, null, { timeout: 60000 });
  if (view !== 'home') await page.evaluate(async (v) => { const core = await import(new URL('core.js', location.href).href); core.go(v); }, view);
  await page.waitForTimeout(2500); // on-demand screen + fonts
  await page.evaluate(() => { document.querySelectorAll('#toast, .pwa-bar, .modal').forEach((e) => e.remove()); scrollTo(0, 0); });
  await page.screenshot({ path: `${out}/${file}`, type: 'jpeg', quality: 80 });
  await ctx.close();
  console.log(`✔ ${out}/${file}`);
}
const PHONE = { width: 360, height: 780, scale: 3 }; // 1080 × 2340
await capture('today.jpg', 'home', PHONE);
await capture('panchangam.jpg', 'panchangam', PHONE);
await capture('festivals.jpg', 'festivals', PHONE);
await capture('wide-today.jpg', 'home', { width: 1280, height: 800, scale: 1 });
await browser.close();
