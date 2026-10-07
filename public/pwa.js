// Installable web app: service worker registration, the "new version available" bar and a polite install offer.
// None of this runs in the Android / iOS app (Capacitor) or in the static test / review build (no service worker).
import { L, STATIC, store, state } from './core.js';

const native = () => Boolean(window.Capacitor?.isNativePlatform?.());
const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isIosSafari = () => isIos() && /safari/i.test(navigator.userAgent) && !/crios|fxios|edgios|opios/i.test(navigator.userAgent);

const SHARE_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-3px"><path d="M12 3v12"/><path d="m8 7 4-4 4 4"/><path d="M5 11v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9"/></svg>';
const INSTALL_DISMISS_KEY = 'kj_install_dismissed';
const VISITS_KEY = 'kj_visits';
const DISMISS_DAYS = 30;
const MIN_VISITS = 2;

// ---------------------------------------------------------------- bottom bar (update + install)
function bar(id, html) {
  document.getElementById(id)?.remove();
  const el = document.createElement('div');
  el.id = id;
  el.className = 'pwa-bar';
  el.setAttribute('role', 'status');
  el.innerHTML = html;
  document.body.append(el);
  requestAnimationFrame(() => el.classList.add('show'));
  return el;
}
const closeBar = (el) => { el.classList.remove('show'); setTimeout(() => el.remove(), 250); };

// ---------------------------------------------------------------- updates
let updateShown = false;
function showUpdate() {
  if (updateShown) return;
  updateShown = true;
  const el = bar('pwaUpdate', `<span>✨ ${L('A new version of Thunai is ready.', 'துணையின் புதிய பதிப்பு தயார்.')}</span>
    <button type="button" class="pwa-act" data-pwa="reload">${L('Refresh', 'புதுப்பி')}</button>
    <button type="button" class="pwa-x" data-pwa="later" aria-label="${L('Later', 'பிறகு')}">✕</button>`);
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-pwa]');
    if (!b) return;
    if (b.dataset.pwa === 'reload') location.reload();
    else closeBar(el);
  });
}

/** Registers /sw.js and shows "new version available — Refresh" when a newer app is stored for the next start. */
export function registerServiceWorker() {
  if (STATIC || native() || !('serviceWorker' in navigator)) return;
  const hadController = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener('message', (e) => { if (e.data?.type === 'kj:update') showUpdate(); });
  // A new service worker (new cache version) took over this page: the next start uses the new files.
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController) showUpdate(); });
  navigator.serviceWorker.register('/sw.js').then((reg) => {
    // Coming back to the app after a while: look for a new version.
    document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); });
  }).catch(() => {});
}

// ---------------------------------------------------------------- install offer
let deferredPrompt = null;
function installAllowed() {
  if (STATIC || window.KJ_REVIEW || native() || standalone()) return false;
  if (Date.now() - Number(store.get(INSTALL_DISMISS_KEY, 0)) < DISMISS_DAYS * 86400000) return false;
  return Number(store.get(VISITS_KEY, 0)) >= MIN_VISITS;
}
function dismissInstall(el) { store.set(INSTALL_DISMISS_KEY, Date.now()); closeBar(el); }

function offerInstall() {
  if (!installAllowed() || document.getElementById('pwaInstall')) return;
  // Never on top of a dialog or the first-run steps; try again a little later.
  if (document.querySelector('.modal') || document.body.classList.contains('kb-open') || state.view !== 'home') { setTimeout(offerInstall, 20000); return; }
  if (deferredPrompt) {
    const el = bar('pwaInstall', `<span>📲 ${L('Add Thunai to your home screen — opens faster and works offline.', 'துணையை முகப்புத் திரையில் சேர்க்கவும் — வேகமாகத் திறக்கும், இணையம் இல்லாமலும் இயங்கும்.')}</span>
      <button type="button" class="pwa-act" data-pwa="install">${L('Install', 'நிறுவு')}</button>
      <button type="button" class="pwa-x" data-pwa="later" aria-label="${L('Not now', 'இப்போது வேண்டாம்')}">✕</button>`);
    el.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-pwa]');
      if (!b) return;
      if (b.dataset.pwa === 'later') { dismissInstall(el); return; }
      const p = deferredPrompt;
      deferredPrompt = null;
      closeBar(el);
      try { p.prompt(); const { outcome } = await p.userChoice; if (outcome !== 'accepted') store.set(INSTALL_DISMISS_KEY, Date.now()); } catch { /* already used */ }
    });
  } else if (isIosSafari()) {
    // Safari has no install prompt: explain the two taps once.
    const el = bar('pwaInstall', `<span>📲 ${L(`Install Thunai: tap Share ${SHARE_ICON} then “Add to Home Screen”.`, `துணையை நிறுவ: பகிர் ${SHARE_ICON} அழுத்தி “Add to Home Screen” தேர்வு செய்யவும்.`)}</span>
      <button type="button" class="pwa-x" data-pwa="later" aria-label="${L('Close', 'மூடு')}">✕</button>`);
    el.addEventListener('click', (e) => { if (e.target.closest('[data-pwa]')) dismissInstall(el); });
  }
}

if (typeof window !== 'undefined' && !STATIC && !native()) {
  // One visit per browser session.
  try {
    if (!sessionStorage.getItem('kj_visit_counted')) { sessionStorage.setItem('kj_visit_counted', '1'); store.set(VISITS_KEY, Number(store.get(VISITS_KEY, 0)) + 1); }
  } catch { /* private mode */ }
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // our own polite bar instead of the browser's mini-infobar on the first visit
    deferredPrompt = e;
    if (installAllowed()) setTimeout(offerInstall, 15000);
  });
  window.addEventListener('appinstalled', () => { deferredPrompt = null; document.getElementById('pwaInstall')?.remove(); store.set(INSTALL_DISMISS_KEY, Date.now() + 3650 * 86400000); });
  if (isIosSafari() && !standalone()) setTimeout(offerInstall, 15000);
}
