// Thunai (துணை) — app boot, splash, background sky and the one-second live tick.
import { fmtDay } from './shared/fmt.js';
import { state, $, $$, L, ta, STATIC, store, go, goBack, currentScreen, saveSettings, setLoc, toast, BRAND, checkTravelExpiry, placeName } from './core.js';
import { installWebHistory } from './web-history.js';
import { refreshSnap } from './screens-main.js';
import './screens-world.js';
import './screens-plans.js';
import './legal.js';
import './screens-guide.js';
import './screens-health.js';
import './screens-hubs.js';
import './screens-journey.js';
import './screens-week.js';
import './screens-goals.js';
import './screens-ithihasa.js';
import './screens-hymns.js';
import './screens-dosham.js';
import './screens-pro.js';
import './screens-lifeguide.js';
import { campFromUrl, startCamp } from './camp.js';
import './easy-date.js';
import { prefetchLazyScreens } from './lazy-screens.js';
import { registerServiceWorker } from './pwa.js';
import { loadSession } from './account.js';
import { devicePlace } from './shared/places.js';
import { locFromPlace } from './shared/residence.js';
import { residenceStep, zonePrompt } from './residence-ui.js';
import { startAnalytics, loadBilling } from './growth.js';
import { initDesktopNav } from './desktop-nav.js';

// Twinkling stars behind the app. The canvas is hidden by the current design (styles.css), so nothing is drawn —
// no canvas memory, no frames — unless a theme shows it. When shown: ~30 frames a second and one fill per
// brightness step instead of one per star, which keeps low-end phones cool.
function startSky() {
  const c = $('#sky');
  if (!c) return;
  const ctx = c.getContext('2d');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const LEVELS = 8;
  const fills = [0, 1].map((gold) => Array.from({ length: LEVELS }, (_, i) => { const a = (0.35 + 0.65 * (i + 0.5) / LEVELS).toFixed(2); return gold ? `rgba(255,214,140,${a})` : `rgba(235,230,255,${a})`; }));
  let stars = [];
  let running = false;
  let sized = false;
  let shoot = null;
  let last = 0;
  const visible = () => c.getClientRects().length > 0 && getComputedStyle(c).visibility !== 'hidden';
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = innerWidth * dpr; c.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = Array.from({ length: Math.round((innerWidth * innerHeight) / 2600) }, () => ({
      x: Math.random() * innerWidth, y: Math.random() * innerHeight, r: Math.random() * 1.3 + 0.2,
      p: Math.random() * Math.PI * 2, s: 0.5 + Math.random() * 1.5, gold: Math.random() < 0.12 ? 1 : 0,
    }));
    sized = true;
  };
  const paint = (ts) => {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    const buckets = [Array.from({ length: LEVELS }, () => []), Array.from({ length: LEVELS }, () => [])];
    for (const st of stars) {
      const a = Math.abs(Math.sin(st.p + (ts / 1000) * st.s));
      buckets[st.gold][Math.min(LEVELS - 1, Math.floor(a * LEVELS))].push(st);
    }
    for (let g = 0; g < 2; g++) {
      for (let i = 0; i < LEVELS; i++) {
        const list = buckets[g][i];
        if (!list.length) continue;
        ctx.fillStyle = fills[g][i];
        ctx.beginPath();
        for (const st of list) { ctx.moveTo(st.x + st.r, st.y); ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2); }
        ctx.fill();
      }
    }
  };
  const frame = (ts) => {
    if (!running) return;
    requestAnimationFrame(frame);
    const dt = ts - last;
    if (dt < 32) return; // ~30 fps is plenty for slow twinkling
    last = ts;
    paint(ts);
    if (!shoot && Math.random() < 0.008) shoot = { x: Math.random() * innerWidth, y: Math.random() * innerHeight * 0.4, l: 0 };
    if (shoot) {
      shoot.l += 14 * Math.min(dt, 100) / 16.7; // same speed as before, whatever the frame rate
      const g = ctx.createLinearGradient(shoot.x + shoot.l, shoot.y + shoot.l * 0.5, shoot.x + shoot.l - 90, shoot.y + shoot.l * 0.5 - 45);
      g.addColorStop(0, 'rgba(255,240,200,.9)'); g.addColorStop(1, 'rgba(255,240,200,0)');
      ctx.strokeStyle = g; ctx.lineWidth = 1.6; ctx.beginPath();
      ctx.moveTo(shoot.x + shoot.l, shoot.y + shoot.l * 0.5); ctx.lineTo(shoot.x + shoot.l - 90, shoot.y + shoot.l * 0.5 - 45); ctx.stroke();
      if (shoot.l > 500) shoot = null;
    }
  };
  const update = () => {
    const show = visible();
    if (!show) { running = false; if (sized) { c.width = 0; c.height = 0; sized = false; } return; }
    if (!sized) resize();
    if (reduced) { paint(0); return; }
    if (!running) { running = true; requestAnimationFrame(frame); }
  };
  addEventListener('resize', () => { if (sized) resize(); update(); });
  new MutationObserver(update).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
  update();
}

/** Draws the zodiac ring on the splash; returns hide(), which fades it out as soon as Today is ready. */
function splash() {
  const g = $('#splash-signs');
  const glyphs = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];
  if (g) g.innerHTML = glyphs.map((s, i) => {
    const a = (i * 30 - 75) * Math.PI / 180;
    const x = 100 + 85 * Math.cos(a), y = 100 + 85 * Math.sin(a);
    const lx = 100 + 96 * Math.cos(a - Math.PI / 12), ly = 100 + 96 * Math.sin(a - Math.PI / 12);
    const ix = 100 + 74 * Math.cos(a - Math.PI / 12), iy = 100 + 74 * Math.sin(a - Math.PI / 12);
    return `<line x1="${ix}" y1="${iy}" x2="${lx}" y2="${ly}" stroke="rgba(245,194,107,.4)"/><text x="${x}" y="${y}" fill="#ffdf9e" font-size="13" text-anchor="middle" dominant-baseline="central">${s}</text>`;
  }).join('');
  return () => {
    const el = $('#splash');
    if (!el) return;
    el.style.transition = 'opacity .3s ease';
    el.classList.add('fade');
    setTimeout(() => el.remove(), 320);
  };
}

function applyLang() {
  document.body.classList.toggle('ta', ta());
  document.documentElement.lang = state.lang; document.documentElement.setAttribute('translate', 'no'); document.documentElement.classList.add('notranslate');
  $$('[data-i18n-en]').forEach((el) => { el.textContent = ta() ? el.dataset.i18nTa : el.dataset.i18nEn; });
  const text = { ta: BRAND.nameTa, upper: BRAND.nameUpper, tagline: BRAND.taglineTa, descriptor: BRAND.descriptorEn,
    'tagline-auto': ta() ? BRAND.taglineTa : BRAND.descriptorEn,
    // Header: a short slogan that always fits on one line next to the buttons (360 px phones).
    'tagline-short': ta() ? 'வாழ்வின் வழித்துணை' : 'Your life’s companion' };
  $$('[data-brand]').forEach((el) => { el.textContent = text[el.dataset.brand] ?? el.textContent; });
  const lb = $('#langBtn');
  if (lb) lb.textContent = ta() ? 'EN' : 'தமிழ்';
  document.title = `${BRAND.nameTa} · ${BRAND.nameUpper} — ${(ta() ? BRAND.taglineTa : BRAND.descriptorEn).replace(/\.$/, '')}`;
}

// The installed Android app reports the phone's font size; with a large system font, switch on the app's own
// Large text mode once (unless the person already chose a setting).
function adoptSystemFontScale() {
  const k = Number(window.KJ_SYSTEM_FONT_SCALE);
  if (!(k >= 1.15) || state.settings.largeChosen) return;
  if (!state.settings.large) { state.settings.large = true; saveSettings(); go(state.view, state.params); }
}
document.addEventListener('kj:fontscale', adoptSystemFontScale);

// Android / iOS app: the status bar follows the app theme (same colour as the top bar) — dark during the splash.
function syncStatusBar() {
  const SB = window.Capacitor?.isNativePlatform?.() && window.Capacitor?.Plugins?.StatusBar;
  if (!SB) return;
  const apply = () => {
    const dark = document.documentElement.dataset.theme !== 'light';
    try {
      SB.setBackgroundColor?.({ color: dark ? '#18131a' : '#ffffff' })?.catch?.(() => {});
      SB.setStyle?.({ style: dark ? 'DARK' : 'LIGHT' })?.catch?.(() => {}); // DARK = light icons on a dark bar
    } catch { /* older plugin */ }
  };
  apply();
  new MutationObserver(apply).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
}

let homeStale = false;
document.addEventListener('kj:screen', (e) => { if (e.detail === 'home') homeStale = false; });
const typingOnScreen = () => { const a = document.activeElement; return !!(a && a.closest?.('#views') && (a.tagName === 'TEXTAREA' || a.tagName === 'SELECT' || (a.tagName === 'INPUT' && !['button', 'submit', 'checkbox', 'radio'].includes(a.type)))); };
const SESSION_WAIT_MS = 1500;

async function boot() {
  const inCamp = campFromUrl(); // ?camp=1 / ?camp=0 — read before any URL clean-up below
  const hideSplash = splash();
  applyLang();
  saveSettings();
  startAnalytics();
  // Native app: the web splash is already painted, so the system splash can go (no white flash in between).
  try { window.Capacitor?.Plugins?.SplashScreen?.hide?.({ fadeOutDuration: 150 }); } catch { /* not native */ }
  // Sign-in and plan come from the server: Today waits for them briefly (so a signed-in family shows at once),
  // but never longer than SESSION_WAIT_MS on a slow or absent network — Today then redraws when they arrive.
  let sessionDone = false;
  const session = loadSession().then(loadBilling).catch(() => {}).finally(() => { sessionDone = true; });
  await Promise.race([session, new Promise((r) => setTimeout(r, SESSION_WAIT_MS))]);
  // Let the splash paint between loading the modules and drawing Today (two shorter tasks instead of one long one).
  await new Promise((r) => setTimeout(r, 0));
  if (!sessionDone) session.then(() => { homeStale = true; }); // the one-second tick redraws Today (unless typing)
  // Residence is never taken from a birth place (born in Madurai, living in Dubai). Until the person answers, the
  // main city of the phone's time zone is used (Dubai phone → Dubai; Chennai in India / unknown).
  const firstRun = !state.loc;
  if (firstRun) setLoc(locFromPlace(devicePlace()), { confirmed: false });
  refreshSnap(true);
  initDesktopNav();
  $('#app').hidden = false;
  adoptSystemFontScale();

  $('#themeBtn')?.addEventListener('click', () => { state.settings.theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; saveSettings(); });
  $('#langBtn').addEventListener('click', () => { state.lang = ta() ? 'en' : 'ta'; store.set('kj_lang', state.lang); document.dispatchEvent(new Event('kj:lang')); });
  document.addEventListener('kj:lang', () => { applyLang(); go(state.view, state.params); });
  $$('.tabbar button').forEach((b) => b.addEventListener('click', () => go(b.dataset.tab)));

  // Web / PWA: the browser's back button moves between screens (the native app uses its own back key).
  installWebHistory({ win: window, doc: document, go, goBack, current: () => ({ view: state.view, params: state.params || {} }) });

  const startHash = location.hash;
  if (location.hash === '#billing-success') toast(L('Payment received — your plan is active 🙏', 'கட்டணம் பெறப்பட்டது — உங்கள் திட்டம் செயலில் 🙏'));
  if (location.hash === '#welcome') toast(L('Signed in with Facebook', 'Facebook மூலம் உள்நுழைந்தீர்கள்'));
  if (location.hash === '#login-failed') toast(L('Facebook sign-in failed. Please try again.', 'Facebook உள்நுழைவு தோல்வி. மீண்டும் முயற்சிக்கவும்.'));
  if (location.hash) history.replaceState(null, '', location.pathname);

  // The calendar and basic guidance work without registration: always open on Today.
  // Sign-in is offered from Settings and when a feature (backup, purchases) really needs it.
  // If a screen was already opened while the splash was showing (deep link, test, quick tap), stay on it.
  const opened = document.querySelector('#views .view:not([hidden])');
  // Deep links: #bookings (payment return) and the home-screen shortcuts in manifest.webmanifest.
  const DEEP = { '#bookings': 'bookings', '#today': 'home', '#ask': 'chat', '#panchangam': 'panchangam', '#festivals': 'festivals' };
  if (DEEP[startHash]) go(DEEP[startHash]); else if (opened && state.view && state.view !== 'home') go(state.view, state.params || {}, { back: true }); else go('home');
  // First run: one friendly step — where do you live now? Existing users: a gentle one-time prompt when the
  // phone's clock zone differs from the saved residence (e.g. landed in Dubai).
  const deferred = Date.now() - Number(store.get('kj_res_later', 0)) < 3 * 86400000; // "Decide later": ask again in 3 days
  // Camp mode (camp.js): the organiser sets the place once; visitors are not asked again.
  if (firstRun || (!inCamp && state.residence?.confirmed === false && !deferred)) residenceStep({ first: true });
  else if (!inCamp) setTimeout(() => zonePrompt(), 1200);
  if (inCamp) startCamp();
  hideSplash();
  syncStatusBar();
  // Not needed for the first screen: started once Today is drawn.
  const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 300));
  requestAnimationFrame(() => setTimeout(() => {
    startSky();
    idle(() => prefetchLazyScreens(), { timeout: 3000 });
  }, 0));

  setInterval(() => {
    if (!state.loc) return;
    // A temporary travelling place ends on its date: daily timings return to the residence.
    if (Date.now() % 60000 < 1000 && checkTravelExpiry()) { refreshSnap(true); toast(L(`🏠 Timings are back to ${placeName(state.loc.name)}`, `🏠 நேரங்கள் மீண்டும் ${placeName(state.loc.name)} இடத்திற்கு`), 5000); go(state.view, state.params); return; }
    const fresh = refreshSnap();
    const s = currentScreen();
    // Today redraws with the new minute's panchangam — but not while the app is in the background or the person is
    // typing on Today (that would wipe the text box); it catches up on the next tick instead.
    if (fresh && state.view === 'home') homeStale = true;
    if (homeStale && state.view === 'home') {
      if (!document.hidden && !typingOnScreen()) { homeStale = false; go('home'); }
    } else s?.tick?.();
  }, 1000);
  // After an update, say once which version is now running — so testers can be sure the new APK is installed.
  try {
    const b = window.KJ_BUILD;
    if (b && store.get('kj_seen_build', null) !== b) {
      const when = /^\d{4}-\d{2}-\d{2}/.test(b) ? fmtDay(b.slice(0, 10), state.lang) : b;
      if (store.get('kj_seen_build', null)) setTimeout(() => toast(L(`✨ Thunai updated · ${when}`, `✨ துணை புதுப்பிக்கப்பட்டது · ${when}`), 4000), 2500);
      store.set('kj_seen_build', b);
    }
  } catch { /* ignore */ }
  if (!STATIC && 'serviceWorker' in navigator) registerServiceWorker();
}

boot();
