// App-shell cache so the Jathagam and live Panchangam work offline. API calls always go to the network.
const CACHE = 'kj-v22';
const SHELL = [
  '/', '/index.html', '/styles.css', '/app.js', '/core.js', '/screens-main.js', '/screens-tools.js', '/screens-world.js',
  '/screens-life.js', '/screens-plans.js', '/screens-couple.js', '/screens-guide.js', '/remind.js', '/screens-roadmap.js',
  '/screens-depth.js', '/screens-extra.js', '/screens-peyarchi.js', '/screens-health.js', '/screens-love.js', '/screens-kattam.js',
  '/easy-date.js', '/growth.js', '/legal.js', '/account.js', '/icons.js', '/screens-hubs.js', '/tool-registry.js', '/screens-journey.js', '/screens-trust.js', '/screens-names.js', '/screens-week.js', '/shared/week-plan.js',
  '/shared/baby-names.js', '/shared/baby-names-data-1.js', '/shared/baby-names-data-2.js', '/shared/baby-names-data-3.js',
  '/shared/baby-names-data-4.js', '/shared/baby-names-data-5.js', '/shared/baby-names-data-6.js', '/shared/baby-names-data-7.js',
  '/shared/baby-names-data-8.js', '/shared/baby-names-data-9.js', '/shared/baby-names-data-10.js',
  '/fonts.css', '/shared/astro.js', '/shared/prasna.js', '/shared/narrator.js', '/shared/places.js', '/shared/tamilcal.js',
  '/shared/porutham.js', '/shared/remedies.js', '/shared/special.js', '/shared/analysis.js', '/shared/relations.js', '/shared/temples.js',
  '/shared/mantras.js', '/shared/predict.js', '/shared/packages.js', '/shared/couple.js', '/shared/lifecheck.js', '/shared/personal.js',
  '/shared/temple-info.js', '/shared/roadmap.js', '/shared/varga.js', '/shared/ashtakoota.js', '/shared/numerology.js',
  '/shared/peyarchi.js', '/shared/health.js', '/shared/brand.js', '/shared/sync-policy.js', '/shared/birthtime.js', '/shared/guidance.js', '/shared/journey.js',
  '/shared/version.js', '/shared/temple-verified.js', '/shared/kattam.js', '/shared/daily.js', '/shared/today-plan.js', '/shared/faith.js',
  '/today-lines.js', '/ask-thunai.js', '/shared/weather.js', '/shared/station.js', '/shared/love.js', '/shared/datetime.js', '/shared/age-guard.js', '/shared/themes.js', '/shared/report-horizon.js', '/shared/written-date.js',
  '/shared/rules/core.js', '/shared/rules/profiles.js', '/shared/rules/registry.js', '/shared/rules/chevvai.js', '/shared/rules/roles.js',
  '/shared/rules/yogas.js', '/shared/rules/disputed.js', '/shared/rules/define.js', '/vendor/astronomy-engine.js', '/icon.svg',
  '/phone-input.js', '/shared/countries.js', '/shared/country-data.js', '/shared/world-places.js', '/shared/currency.js',
  '/temple-search.js', '/desktop-nav.js', '/compat-card.js', '/shared/compat.js', '/residence-ui.js', '/shared/residence.js', '/shared/airports.js',
  '/logo.svg', '/manifest.webmanifest'];

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
