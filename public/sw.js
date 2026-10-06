// Thunai app-shell cache so charts, calendars and planners work offline. API calls always go to the network.
// SHELL must list every module reachable by import from /app.js (checked by test/ui-precache.test.js).
const CACHE = 'kj-v13';
const SHELL = ['/', '/index.html', '/styles.css', '/manifest.webmanifest', '/icon.svg', '/logo.svg', '/icon-192.png',
  '/account.js', '/app.js', '/core.js', '/growth.js', '/icons.js', '/legal.js',
  '/remind.js', '/screens-couple.js', '/screens-depth.js', '/screens-extra.js', '/screens-guide.js', '/screens-health.js',
  '/screens-life.js', '/screens-main.js', '/screens-peyarchi.js', '/screens-plans.js', '/screens-roadmap.js', '/screens-thunai.js',
  '/screens-tools.js', '/screens-world.js',
  '/shared/analysis.js', '/shared/ashtakoota.js', '/shared/astro.js', '/shared/couple.js', '/shared/datetime.js',
  '/shared/engine-contract.js', '/shared/health.js', '/shared/lifecheck.js', '/shared/mantras.js', '/shared/marriage-context.js',
  '/shared/narrator.js', '/shared/numerology.js', '/shared/packages.js', '/shared/personal.js', '/shared/peyarchi.js',
  '/shared/places.js', '/shared/porutham.js', '/shared/prasna.js', '/shared/predict.js', '/shared/relations.js',
  '/shared/remedies.js', '/shared/roadmap.js', '/shared/rules/chevvai.js', '/shared/rules/core.js', '/shared/rules/define.js',
  '/shared/rules/disputed.js', '/shared/rules/profiles.js', '/shared/rules/registry.js', '/shared/rules/roles.js', '/shared/rules/yogas.js',
  '/shared/safeguards.js', '/shared/special.js', '/shared/tamilcal.js', '/shared/temple-info.js', '/shared/temple-planner.js',
  '/shared/temples.js', '/shared/themes.js', '/shared/varga.js', '/shared/weather.js',
  '/vendor/astronomy-engine.js'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.pathname.startsWith('/api/') || url.origin !== location.origin) return;
  // Network first, fall back to cache — keeps the app fresh while testing.
  e.respondWith(
    fetch(e.request)
      .then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return res; })
      .catch(() => caches.match(e.request)),
  );
});

// Web Push: morning alarm and parigaram trip reminders. Payload: { title, body, url, tag }.
self.addEventListener('push', (e) => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch { data = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(data.title || 'துணை', {
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
