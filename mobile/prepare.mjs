// Prepares the native (Capacitor) build. Two modes:
//
//   STANDALONE (default when KJ_APP_URL is unset, or with --standalone / KJ_STANDALONE=1):
//     runs scripts/build-artifact.mjs and copies the backend-free build into mobile/www, vendors
//     astronomy-engine so nothing loads from a CDN, and REMOVES server.url from capacitor.config.json.
//     The app then runs fully offline from the bundle: all astrology is computed on the phone,
//     server-only features (login, payments, bookings, weather) show a "needs server" card and
//     AI answers fall back to the rule-based text.
//
//   SERVER (KJ_APP_URL=https://… set):
//     writes mobile/www — a tiny offline launcher that opens the deployed web app — and patches
//     capacitor.config.json so server.url points at KJ_APP_URL, which means the Android / iOS apps
//     always show the latest deployed version without a store update.
//
// Usage: node mobile/prepare.mjs                                    # standalone (offline) app
//        KJ_APP_URL=https://kaippesi.example.com node mobile/prepare.mjs   # server-backed app
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const configFile = path.join(root, 'capacitor.config.json');
const wwwDir = path.join(root, 'mobile', 'www');
const artifactDir = path.join(root, 'dist', 'artifact');
const PAYMENT_HOSTS = ['checkout.razorpay.com', 'api.razorpay.com', 'checkout.stripe.com'];
const AE_CDN = 'https://cdn.jsdelivr.net/npm/astronomy-engine@2.1.19/esm/astronomy.js';

const truthy = (v) => /^(1|true|yes)$/i.test(String(v || '').trim());
const rawUrl = (process.env.KJ_APP_URL || '').trim();
const standalone = process.argv.includes('--standalone') || truthy(process.env.KJ_STANDALONE) || !rawUrl;

function appUrlFromEnv() {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    console.error(`✖ KJ_APP_URL is not a valid URL: ${rawUrl}`);
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
  <meta name="theme-color" content="#6e1a35" />
  <title>துணை · THUNAI</title>
  <style>
    :root { --bg0: #140a10; --bg1: #2a1220; --bg2: #4a1a2c; --gold: #f0c27a; --gold2: #f7d9a6; --text: #f7f0e8; --muted: #cbbfb4; }
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
    <h1>துணை</h1>
    <p class="en">THUNAI · Personal Astrology &amp; Spiritual Guidance</p>
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

function readConfig() {
  return JSON.parse(fs.readFileSync(configFile, 'utf8'));
}
function writeConfig(config) {
  fs.writeFileSync(configFile, `${JSON.stringify(config, null, 2)}\n`);
}

// Wraps the artifact page (a bare <title>/<link>/<style> + body fragment) in a full HTML document
// for the WebView: doctype, charset, mobile viewport with safe areas, theme colour.
function wrapArtifactPage(page) {
  const cut = page.indexOf('</style>');
  if (cut < 0) throw new Error('Unexpected dist/artifact/index.html layout (no </style>).');
  const head = page.slice(0, cut + '</style>'.length);
  const body = page.slice(cut + '</style>'.length);
  return `<!doctype html>
<html lang="ta">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="theme-color" content="#6e1a35" />
${head}
</head>
<body>${body}
</body>
</html>
`;
}

function buildStandalone() {
  if (!process.argv.includes('--standalone') && !truthy(process.env.KJ_STANDALONE)) {
    const note = 'KJ_APP_URL is not set — building the STANDALONE offline app (no server: login, payments and bookings are disabled).';
    if (process.env.GITHUB_ACTIONS) console.log(`::notice title=Standalone mobile build::${note} Set the repository variable KJ_APP_URL to build the server-backed app.`);
    else console.log(`ℹ ${note}`);
  }
  const r = spawnSync(process.execPath, ['scripts/build-artifact.mjs'], { cwd: root, stdio: 'inherit' });
  if (r.status !== 0) {
    console.error('✖ scripts/build-artifact.mjs failed.');
    process.exit(r.status || 1);
  }

  // 1. mobile/www ← dist/artifact (multi-file: index.html, *.js, shared/*.js, logo.svg, icon.svg, *.json)
  fs.rmSync(wwwDir, { recursive: true, force: true });
  fs.cpSync(artifactDir, wwwDir, { recursive: true });
  const indexFile = path.join(wwwDir, 'index.html');
  fs.writeFileSync(indexFile, wrapArtifactPage(fs.readFileSync(indexFile, 'utf8')));
  fs.copyFileSync(path.join(root, 'public', 'icon-512.png'), path.join(wwwDir, 'icon.png'));

  // 2. Vendor astronomy-engine so the app works with no internet at all.
  const aeSrc = path.join(root, 'node_modules', 'astronomy-engine', 'esm', 'astronomy.js');
  if (fs.existsSync(aeSrc)) {
    fs.mkdirSync(path.join(wwwDir, 'vendor'), { recursive: true });
    fs.copyFileSync(aeSrc, path.join(wwwDir, 'vendor', 'astronomy.js'));
    const sharedDir = path.join(wwwDir, 'shared');
    for (const f of fs.readdirSync(sharedDir).filter((x) => x.endsWith('.js'))) {
      const file = path.join(sharedDir, f);
      const src = fs.readFileSync(file, 'utf8');
      if (src.includes(AE_CDN)) fs.writeFileSync(file, src.split(AE_CDN).join('../vendor/astronomy.js'));
    }
  } else {
    console.warn('⚠ node_modules/astronomy-engine not found (run npm ci) — the app will load it from the CDN and needs internet on first use.');
  }
  const leftovers = fs.readdirSync(wwwDir, { recursive: true })
    .filter((f) => String(f).endsWith('.js'))
    .filter((f) => fs.readFileSync(path.join(wwwDir, String(f)), 'utf8').includes('cdn.jsdelivr.net'));
  if (leftovers.length) console.warn(`⚠ still loading from a CDN: ${leftovers.join(', ')}`);

  // 3. capacitor.config.json → no server.url: Capacitor serves mobile/www from inside the app.
  const config = readConfig();
  delete config.server;
  writeConfig(config);

  console.log('✔ mobile/www = standalone offline app (dist/artifact); capacitor.config.json has no server.url');
  console.log('  Google Fonts load when online; offline the phone\'s Tamil system font is used.');
}

function buildServer() {
  const appUrl = appUrlFromEnv();

  // 1. mobile/www
  fs.rmSync(wwwDir, { recursive: true, force: true });
  fs.mkdirSync(wwwDir, { recursive: true });
  fs.writeFileSync(path.join(wwwDir, 'index.html'), launcherHtml(appUrl));
  fs.copyFileSync(path.join(root, 'public', 'icon-512.png'), path.join(wwwDir, 'icon.png'));

  // 2. capacitor.config.json → server.url
  const config = readConfig();
  config.server = {
    ...config.server,
    url: appUrl.href.replace(/\/$/, ''),
    cleartext: appUrl.protocol === 'http:',
    errorPath: 'index.html',
    allowNavigation: [appUrl.hostname, ...PAYMENT_HOSTS],
  };
  writeConfig(config);

  console.log(`✔ mobile/www written; server.url = ${config.server.url}`);
  console.log(`  (${appUrl.hostname} + ${PAYMENT_HOSTS.join(', ')} allowed for in-app navigation)`);
}

if (standalone) buildStandalone();
else buildServer();
