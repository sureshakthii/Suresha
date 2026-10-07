// Browser / PWA back and forward inside the app. On the web, every screen change adds a browser-history entry
// (history.pushState), so the browser's back button, a mouse back button or an Android PWA back gesture returns to
// the previous screen — at the same scroll position — instead of leaving the app. The in-app ‹ back button walks
// the same history, so the two never disagree. The installed Android/iOS app keeps its own back key (core.js).
// No imports: app.js passes the router in, so tests can drive it with a fake window.

/**
 * @param {object} o
 * @param {Window} o.win            window (history, scrollTo, scrollY, addEventListener, requestAnimationFrame, setTimeout)
 * @param {Document} o.doc          document (kj:screen events, clicks on [data-back], open .modal dialogs)
 * @param {(view: string, params?: object, opts?: object) => void} o.go
 * @param {(fallback?: string) => boolean} o.goBack
 * @param {() => { view: string, params: object }} o.current  the screen now showing
 * @returns {{ depth: () => number, uninstall: () => void } | null}  null on the native app (its back key is used)
 */
export function installWebHistory({ win, doc, go, goBack, current }) {
  if (!win?.history?.pushState || win.Capacitor?.isNativePlatform?.()) return null;
  const H = win.history;
  let depth = Number.isInteger(H.state?.kj) ? H.state.kj : 0;
  let applying = false; // a screen change caused by back / forward: do not add another entry
  const plain = (p) => { try { return JSON.parse(JSON.stringify(p || {})); } catch { return {}; } };
  const entry = (view, params, extra = {}) => ({ kj: depth, view, params: plain(params), y: 0, ...extra });
  if (!Number.isInteger(H.state?.kj)) H.replaceState(entry(null, {}), '');
  try { H.scrollRestoration = 'manual'; } catch { /* older browsers */ }
  // Where the current screen is scrolled. Read from scroll events: by the time a screen change is announced the old
  // screen is already hidden and the page has collapsed to the top.
  let lastY = win.scrollY || 0;
  let touched = 0; // the person scrolled by hand after a back: stop restoring
  const onScroll = () => { lastY = win.scrollY || 0; };
  const onTouch = () => { touched += 1; };

  const onScreen = (e) => {
    const view = e.detail;
    if (applying) return;
    const st = H.state || {};
    const { params } = current();
    if (!st.view || st.view === view) { H.replaceState({ ...entry(view, params), y: st.view === view ? st.y || 0 : 0 }, ''); return; }
    // Leaving a screen: remember where it was scrolled.
    H.replaceState({ ...st, y: lastY }, '');
    lastY = 0;
    depth += 1;
    H.pushState(entry(view, params), '');
  };

  // Scroll back to where the person was, retrying while a screen that draws in steps (calendar, festivals) grows.
  const restore = (y) => {
    if (!y) return;
    let tries = 0;
    const mark = touched;
    const tick = () => {
      if (touched !== mark) return;
      win.scrollTo({ top: y });
      if (Math.abs((win.scrollY || 0) - y) > 2 && ++tries < 40) win.setTimeout(tick, 80);
    };
    (win.requestAnimationFrame || ((f) => win.setTimeout(f, 0)))(tick);
  };

  const onPop = (e) => {
    const st = e.state;
    if (!st || !Number.isInteger(st.kj)) return;
    // An open dialog closes first; the screen stays where it is.
    const modal = doc.querySelector?.('.modal');
    if (modal && st.kj < depth) { modal.remove(); H.pushState(H.state ? { ...H.state, kj: depth } : entry(current().view, current().params), ''); return; }
    const backward = st.kj < depth;
    depth = st.kj;
    if (!st.view) return; // the very first entry (before Today was drawn)
    applying = true;
    try {
      if (backward) {
        goBack(st.view);
        if (current().view !== st.view) go(st.view, st.params || {}, { back: true });
      } else go(st.view, st.params || {}, { back: true });
    } finally { applying = false; }
    restore(st.y || 0);
  };

  // The in-app ‹ button: walk the browser history when there is an app entry to go back to.
  const onClick = (e) => {
    if (!e.target?.closest?.('[data-back]') || depth <= 0) return;
    e.stopPropagation();
    e.preventDefault();
    H.back();
  };

  doc.addEventListener('kj:screen', onScreen);
  win.addEventListener('popstate', onPop);
  doc.addEventListener('click', onClick, true);
  win.addEventListener('scroll', onScroll, { passive: true });
  for (const t of ['wheel', 'touchstart', 'keydown']) win.addEventListener(t, onTouch, { passive: true });
  return {
    depth: () => depth,
    uninstall() { doc.removeEventListener('kj:screen', onScreen); win.removeEventListener('popstate', onPop); doc.removeEventListener('click', onClick, true); win.removeEventListener('scroll', onScroll); for (const t of ['wheel', 'touchstart', 'keydown']) win.removeEventListener(t, onTouch); },
  };
}
