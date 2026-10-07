// On-demand screens: modules that Today does not need are not downloaded, parsed or run before the first screen.
// Each screen below is registered as a light stub with the same metadata as the real screen (parent / needsMember,
// so the tab highlight, back button and "add a family member first" redirect work before the module arrives).
// Opening one shows a short loader, imports its module (which registers the real screen over the stub) and draws it.
// After Today is on screen the modules are also fetched in idle time, so a later tap is normally instant.
// test/perf-budget.test.js checks this list against the registerScreen() calls in each module.
import { state, L, currentScreen, registerScreen } from './core.js';

/** [load, { screen: { parent, needsMember? } }] — the import() specifiers stay literal so the precache check sees them. */
export const LAZY_SCREENS = [
  // Ask (chat) lives here: fetched first in idle time.
  [() => import('./screens-tools.js'), {
    chat: {}, calendar: { parent: 'home' }, porutham: { parent: 'home' }, muhurtham: { parent: 'home' }, ruthu: { parent: 'home' },
    parigaram: { parent: 'home' }, thivasam: { parent: 'home' }, starbday: { parent: 'home' },
  }],
  [() => import('./screens-festivals.js'), { festivals: { parent: 'home' } }],
  [() => import('./screens-peyarchi.js'), { peyarchi: { parent: 'home' }, vratham: { parent: 'home' } }],
  [() => import('./screens-kattam.js'), { kattam: { parent: 'familyhub' } }],
  [() => import('./screens-names.js'), { names: { parent: 'home' } }],
  [() => import('./screens-life.js'), { life: { parent: 'home', needsMember: true } }],
  [() => import('./screens-roadmap.js'), { roadmap: { parent: 'home', needsMember: true } }],
  [() => import('./screens-depth.js'), { vargas: { parent: 'chart', needsMember: true } }],
  [() => import('./screens-couple.js'), { couple: { parent: 'home' }, partners: { parent: 'home' } }],
  [() => import('./screens-love.js'), { lovematch: { parent: 'familyhub' } }],
  [() => import('./screens-extra.js'), { gunamilan: { parent: 'home' }, numerology: { parent: 'home' } }],
  [() => import('./screens-trust.js'), { birthtime: { parent: 'chart' }, why: { parent: 'chart' }, calc: { parent: 'more' }, privacy: { parent: 'more' } }],
];

const pending = new Map();
const loadOnce = (load) => {
  if (!pending.has(load)) pending.set(load, load().catch((e) => { pending.delete(load); throw e; }));
  return pending.get(load);
};

const loaderHtml = () => `<div class="lazy-screen" role="status" aria-live="polite"><div class="loader"><i></i><i></i><i></i></div><p class="muted center">${L('Opening…', 'திறக்கிறது…')}</p></div>`;
const failHtml = () => `<div class="card glass lazy-screen" role="alert"><p>${L('This page could not be opened. Please check the internet connection and try again.', 'இந்தப் பக்கத்தைத் திறக்க முடியவில்லை. இணைய இணைப்பைச் சரிபார்த்து மீண்டும் முயற்சிக்கவும்.')}</p>
  <button class="btn-gold" type="button" data-lazy-retry>${L('Try again', 'மீண்டும் முயற்சி')}</button></div>`;

for (const [load, defs] of LAZY_SCREENS) {
  for (const [name, meta] of Object.entries(defs)) {
    const stub = {
      ...meta,
      lazy: true,
      render(sec, params) {
        sec.innerHTML = loaderHtml();
        const hadFocus = document.activeElement && document.activeElement !== document.body;
        loadOnce(load).then(() => {
          // Still on this screen (the person may have moved on while it loaded): draw the real one in place.
          const real = currentScreen();
          if (state.view !== name || !real || real === stub) return;
          real.render(sec, state.params || params || {});
          if (hadFocus) { const h = sec.querySelector('h1, h2'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); } }
        }, () => {
          if (state.view !== name) return;
          sec.innerHTML = failHtml();
          sec.querySelector('[data-lazy-retry]')?.addEventListener('click', () => stub.render(sec, params));
        });
      },
    };
    registerScreen(name, stub);
  }
}

/**
 * Fetch the on-demand modules one at a time while the phone is idle (after Today is drawn). Skipped when the
 * person asked the browser to save data or the connection is 2G — the screens then load when opened.
 */
export function prefetchLazyScreens() {
  const conn = navigator.connection;
  if (conn && (conn.saveData || /(^|-)2g$/.test(conn.effectiveType || ''))) return;
  const idle = window.requestIdleCallback || ((fn) => setTimeout(() => fn({ timeRemaining: () => 10 }), 200));
  const queue = LAZY_SCREENS.map(([load]) => load);
  const next = () => {
    const load = queue.shift();
    if (!load) return;
    idle(() => loadOnce(load).catch(() => {}).finally(() => setTimeout(next, 50)), { timeout: 4000 });
  };
  next();
}
