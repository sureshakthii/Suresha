// Prepares the native (Capacitor) build:
//   1. writes mobile/www — a tiny offline launcher that opens the deployed web app (KJ_APP_URL)
//      and shows a Tamil "loading / no internet — retry" screen when the server can't be reached;
//   2. patches capacitor.config.json so server.url points at KJ_APP_URL, which means the
//      Android / iOS apps always show the latest deployed version without a store update.
//
// Usage: KJ_APP_URL=https://kaippesi.example.com node mobile/prepare.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const configFile = path.join(root, 'capacitor.config.json');
const wwwDir = path.join(root, 'mobile', 'www');
const PAYMENT_HOSTS = ['checkout.razorpay.com', 'api.razorpay.com', 'checkout.stripe.com'];
const PLACEHOLDER = 'https://kaippesi.example.com';

function appUrlFromEnv() {
  const raw = (process.env.KJ_APP_URL || '').trim();
  if (!raw) {
    const msg = 'KJ_APP_URL is not set (e.g. KJ_APP_URL=https://kaippesi.example.com).';
    if (process.env.CI) {
      console.error(`✖ ${msg} Set the repository variable KJ_APP_URL.`);
      process.exit(1);
    }
    console.warn(`⚠ ${msg} Using the placeholder ${PLACEHOLDER} — the app will not reach a real server.`);
    return new URL(PLACEHOLDER);
  }
  let url;
  try {
    url = new URL(raw);
  } catch {
    console.error(`✖ KJ_APP_URL is not a valid URL: ${raw}`);
    process.exit(1);
  }
  if (!['https:', 'http:'].includes(url.protocol)) {
    console.error('✖ KJ_APP_URL must start with https:// (http:// only for local testing).');
    process.exit(1);
  }
  if (url.protocol === 'http:') console.warn('⚠ KJ_APP_URL uses http:// — fine for LAN testing, but stores require https://.');
  return url;
}

function launcherHtml(appUrl) {
  const target = appUrl.href.replace(/\/$/, '');
  return `<!doctype html>
<html lang="ta">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="theme-color" content="#0b0620" />
  <title>கைப்பேசி ஜோதிடர்</title>
  <style>
    :root { --bg0: #06031a; --bg1: #140a3a; --bg2: #2a0f4f; --gold: #f5c26b; --gold2: #ffdf9e; --text: #f4ecff; --muted: #b7a9d6; }
    * { box-sizing: border-box; }
    html, body { margin: 0; height: 100%; }
    body {
      display: flex; align-items: center; justify-content: center; text-align: center;
      padding: env(safe-area-inset-top) 24px env(safe-area-inset-bottom);
      color: var(--text); font-family: 'Noto Sans Tamil', 'Latha', system-ui, sans-serif;
      background: radial-gradient(120% 80% at 50% 0%, var(--bg2), transparent 70%), linear-gradient(180deg, var(--bg1), var(--bg0));
    }
    .wrap { max-width: 360px; width: 100%; }
    .logo { width: 112px; height: 112px; border-radius: 28px; box-shadow: 0 0 40px rgba(245, 194, 107, .35); }
    h1 { color: var(--gold); font-size: 24px; font-weight: 800; margin: 20px 0 4px; }
    .en { color: var(--gold2); font-size: 12px; letter-spacing: 3px; text-transform: uppercase; margin: 0 0 28px; }
    .ring { width: 44px; height: 44px; margin: 0 auto 14px; border-radius: 50%; border: 3px solid rgba(245, 194, 107, .2); border-top-color: var(--gold); animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    p { margin: 6px 0; line-height: 1.5; }
    .muted { color: var(--muted); font-size: 13px; }
    button {
      margin-top: 22px; padding: 14px 28px; border: 0; border-radius: 999px; cursor: pointer;
      font-family: inherit; font-size: 16px; font-weight: 700; color: #2a1200;
      background: linear-gradient(180deg, var(--gold2), var(--gold)); box-shadow: 0 6px 20px rgba(245, 194, 107, .3);
    }
    [hidden] { display: none !important; }
  </style>
</head>
<body>
  <main class="wrap">
    <img class="logo" src="icon.png" alt="" />
    <h1>கைப்பேசி ஜோதிடர்</h1>
    <p class="en">Kaippesi Jothidar</p>
    <section id="loading">
      <div class="ring" aria-hidden="true"></div>
      <p>ஏற்றுகிறது…</p>
      <p class="muted">Loading…</p>
    </section>
    <section id="offline" hidden>
      <p><strong>இணைய இணைப்பு இல்லை</strong></p>
      <p class="muted">No internet connection. Please check mobile data or Wi-Fi.</p>
      <button id="retry" type="button">மீண்டும் முயற்சி · Retry</button>
    </section>
  </main>
  <script>
    (function () {
      var APP_URL = ${JSON.stringify(target)};
      var loading = document.getElementById('loading');
      var offline = document.getElementById('offline');
      function show(isOffline) { loading.hidden = isOffline; offline.hidden = !isOffline; }
      function go() {
        show(false);
        if (navigator.onLine === false) return show(true);
        var done = false;
        var timer = setTimeout(function () { if (!done) { done = true; show(true); } }, 10000);
        fetch(APP_URL + '/api/health', { mode: 'no-cors', cache: 'no-store' })
          .then(function () { if (!done) { done = true; clearTimeout(timer); location.replace(APP_URL + '/'); } })
          .catch(function () { if (!done) { done = true; clearTimeout(timer); show(true); } });
      }
      document.getElementById('retry').addEventListener('click', go);
      window.addEventListener('online', go);
      go();
    })();
  </script>
</body>
</html>
`;
}

const appUrl = appUrlFromEnv();

// 1. mobile/www
fs.rmSync(wwwDir, { recursive: true, force: true });
fs.mkdirSync(wwwDir, { recursive: true });
fs.writeFileSync(path.join(wwwDir, 'index.html'), launcherHtml(appUrl));
fs.copyFileSync(path.join(root, 'public', 'icon-512.png'), path.join(wwwDir, 'icon.png'));

// 2. capacitor.config.json → server.url
const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
config.server = {
  ...config.server,
  url: appUrl.href.replace(/\/$/, ''),
  cleartext: appUrl.protocol === 'http:',
  errorPath: 'index.html',
  allowNavigation: [appUrl.hostname, ...PAYMENT_HOSTS],
};
fs.writeFileSync(configFile, `${JSON.stringify(config, null, 2)}\n`);

console.log(`✔ mobile/www written; server.url = ${config.server.url}`);
console.log(`  (${appUrl.hostname} + ${PAYMENT_HOSTS.join(', ')} allowed for in-app navigation)`);
