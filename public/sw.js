// App-shell cache so the Jathagam and live Panchangam work offline. API calls always go to the network.
const CACHE = 'kj-v42';
const SHELL = [
  '/', '/index.html', '/styles.css', '/app.js', '/web-history.js', '/core.js', '/screens-main.js', '/screens-tools.js', '/screens-world.js',
  '/screens-life.js', '/screens-plans.js', '/screens-pro.js', '/screens-lifeguide.js', '/screens-foryou.js', '/shared/for-you.js', '/camp.js', '/shared/life-guide.js', '/shared/pro-questions.js', '/shared/responsible.js', '/shared/certainty-guard.js', '/screens-couple.js', '/couple-cards.js', '/shared/marriage-context.js', '/screens-guide.js', '/remind.js', '/screens-roadmap.js',
  '/screens-depth.js', '/screens-extra.js', '/screens-peyarchi.js', '/screens-health.js', '/screens-love.js', '/screens-kattam.js',
  '/easy-date.js', '/growth.js', '/legal.js', '/account.js', '/icons.js', '/screens-hubs.js', '/tool-registry.js', '/screens-journey.js', '/screens-trust.js', '/screens-names.js', '/screens-week.js', '/shared/week-plan.js', '/screens-goals.js', '/shared/goals.js',
  '/shared/baby-names.js', '/shared/baby-names-data-1.js', '/shared/baby-names-data-2.js', '/shared/baby-names-data-3.js',
  '/shared/baby-names-data-4.js', '/shared/baby-names-data-5.js', '/shared/baby-names-data-6.js', '/shared/baby-names-data-7.js',
  '/shared/baby-names-data-8.js', '/shared/baby-names-data-9.js', '/shared/baby-names-data-10.js',
  '/fonts.css', '/shared/astro.js', '/shared/prasna.js', '/shared/narrator.js', '/shared/places.js', '/shared/tamilcal.js',
  '/shared/porutham.js', '/shared/remedies.js', '/shared/special.js', '/shared/analysis.js', '/shared/relations.js', '/shared/temples.js',
  '/shared/mantras.js', '/shared/predict.js', '/shared/packages.js', '/shared/couple.js', '/shared/lifecheck.js', '/shared/personal.js',
  '/shared/temple-info.js', '/shared/roadmap.js', '/shared/varga.js', '/shared/ashtakoota.js', '/shared/numerology.js',
  '/shared/peyarchi.js', '/shared/health.js', '/shared/brand.js', '/shared/sync-policy.js', '/shared/plan-gates.js', '/shared/birthtime.js', '/shared/guidance.js', '/shared/journey.js',
  '/shared/version.js', '/shared/temple-verified.js', '/shared/kattam.js', '/shared/daily.js', '/shared/today-plan.js', '/shared/fmt.js',
  '/today-lines.js', '/ask-thunai.js', '/shared/ask-sense.js', '/shared/ask-which.js', '/shared/written-palan.js', '/shared/weather.js', '/shared/station.js', '/shared/love.js', '/shared/datetime.js', '/shared/age-guard.js', '/shared/themes.js', '/shared/report-horizon.js', '/shared/written-date.js', '/shared/horoscope-parse.js', '/ocr-import.js',
  '/shared/rules/core.js', '/shared/rules/profiles.js', '/shared/rules/registry.js', '/shared/rules/chevvai.js', '/shared/rules/roles.js',
  '/shared/rules/yogas.js', '/shared/rules/disputed.js', '/shared/rules/define.js', '/vendor/astronomy-engine.js', '/icon.svg',
  '/phone-input.js', '/family-share.js', '/shared/countries.js', '/shared/country-data.js', '/shared/world-places.js', '/shared/currency.js',
  '/temple-search.js', '/desktop-nav.js', '/compat-card.js', '/shared/compat.js', '/residence-ui.js', '/shared/residence.js', '/shared/airports.js',
  '/screens-festivals.js', '/screens-dosham.js', '/shared/dosham.js', '/shared/dosham-data.js', '/shared/spiritual-kb.js', '/shared/kb/common.js', '/shared/kb/monthly.js', '/shared/kb/festivals-a.js',
  '/shared/kb/festivals-b.js', '/shared/kb/ekadasi.js', '/shared/kb/concepts.js', '/shared/kb/characters.js',
  '/screens-ithihasa.js', '/shared/ithihasa/index.js', // Daily Ithihasa: series data (/shared/ithihasa/<series>.js) is cached on first read, not precached
  '/read-aloud.js', '/screens-hymns.js', '/hymn-links.js', '/shared/hymns.js', // Hymns: each text (/shared/hymns/<id>.js) is cached on first read, not precached
  '/shared/family-delete.js', '/shared/name-translit.js', '/logo.svg', '/manifest.webmanifest',
  '/screens-journal.js', '/share-card.js', '/brief-notify.js', '/shared/daily-brief.js', '/shared/journal.js', '/shared/share-card-layout.js', // morning brief, diary, share cards
  '/lazy-screens.js', '/pwa.js'];

// 'no-cache': revalidate with the server, so a new version never precaches a stale HTTP-cached file.
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'no-cache' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== 'kj-ocr-v1').map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.pathname.startsWith('/api/') || url.origin !== location.origin) return;
  // Horoscope-import reader (vendor/ocr, ~14 MB): never precached — fetched only when someone taps Import, then kept
  // in its own cache (cache-first: the files are versioned by folder content and never change in place).
  if (url.pathname.startsWith('/vendor/ocr/')) {
    e.respondWith(caches.open('kj-ocr-v1').then((c) => c.match(e.request).then((hit) => hit || fetch(e.request).then((res) => { if (res.ok) c.put(e.request, res.clone()); return res; }))));
    return;
  }
  // App shell (the page and every precached module): straight from the cache, so a repeat visit starts with no
  // network round trips at all on a slow 4G line. Opening the page also re-checks the shell in the background
  // (revalidateShell); when anything changed, the new files are stored together and the page shows
  // "New version available — Refresh". Fonts and icons never change in place: cache first as well.
  const shellPath = url.pathname === '/' || url.pathname === '/index.html' ? url.pathname : (SHELL_SET.has(url.pathname) && !url.search ? url.pathname : null);
  const immutable = /^\/fonts\/.+\.woff2$|^\/icon[^/]*\.(png|svg)$|^\/screenshots\//.test(url.pathname);
  if (shellPath || immutable) {
    if (e.request.mode === 'navigate') e.waitUntil(scheduleRevalidate());
    e.respondWith(caches.open(CACHE).then((c) => c.match(shellPath || e.request, { ignoreVary: true }).then((hit) => hit || fetch(e.request).then((res) => {
      if (res.ok && res.type === 'basic') c.put(shellPath || e.request, res.clone());
      return res;
    }))).catch(() => fetch(e.request)));
    return;
  }
  // Everything else (data files, hymn and story texts): network first, fall back to the cache when offline.
  e.respondWith(
    fetch(e.request)
      .then((res) => { if (res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); } return res; })
      .catch(() => caches.match(e.request)),
  );
});

const SHELL_SET = new Set(SHELL);
// Background update check: at most once every few minutes, a little after the page opened (so it never competes
// with the first screen). Uses conditional requests (ETag / Last-Modified), so unchanged files cost a few bytes.
let lastCheck = 0;
let checking = null;
function scheduleRevalidate() {
  if (checking || Date.now() - lastCheck < 5 * 60000) return Promise.resolve();
  lastCheck = Date.now();
  checking = new Promise((r) => setTimeout(r, 8000)).then(revalidateShell).catch(() => {}).finally(() => { checking = null; });
  return checking;
}
const stamp = (res) => res && (res.headers.get('etag') || res.headers.get('last-modified') || res.headers.get('content-length'));
async function revalidateShell() {
  const cache = await caches.open(CACHE);
  const changed = [];
  const urls = SHELL.slice();
  const worker = async () => {
    for (let u = urls.shift(); u; u = urls.shift()) {
      const old = await cache.match(u, { ignoreVary: true });
      const res = await fetch(new Request(u, { cache: 'no-cache' })).catch(() => null);
      if (!res || !res.ok || res.type !== 'basic') continue;
      if (!old || stamp(old) !== stamp(res) || !stamp(res)) {
        // No validator at all: compare the bytes.
        if (old && !stamp(res) && (await old.clone().text()) === (await res.clone().text())) continue;
        changed.push([u, res]);
      }
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
  if (!changed.length) return;
  // Store every changed file together, so the next start sees one consistent version.
  await Promise.all(changed.map(([u, res]) => cache.put(u, res)));
  const clients = await self.clients.matchAll({ type: 'window' });
  for (const c of clients) c.postMessage({ type: 'kj:update', files: changed.length });
}

// Web Push: morning alarm and parigaram trip reminders. Payload: { title, body, url, tag }.
self.addEventListener('push', (e) => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch { data = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(data.title || 'துணை · Thunai', {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    tag: data.tag,
    renotify: Boolean(data.tag),
    data: { url: data.url || '/' },
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const target = new URL((e.notification.data && e.notification.data.url) || '/', self.location.origin).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    const same = list.find((c) => c.url === target) || list.find((c) => new URL(c.url).origin === self.location.origin);
    if (same) return same.focus().then((c) => (c && c.url !== target && 'navigate' in c ? c.navigate(target) : c));
    return self.clients.openWindow(target);
  }));
});
