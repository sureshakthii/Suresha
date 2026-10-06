// Time-limited review build (சோதனைப் பதிப்பு). Active only when the build injects window.KJ_REVIEW
// ({ hours, until }); the normal app and the website never set it, so this file does nothing there.
//   • The app works for `hours` from its FIRST launch on that phone.
//   • It also stops at the absolute `until` time baked into the build, so reinstalling or clearing app data
//     can never extend it past that date.
//   • If the phone clock is moved backwards, the app locks.
// When locked, the whole screen shows "please contact the administrator" and the app cannot be used.
(function reviewLock() {
  const R = window.KJ_REVIEW;
  if (!R || !R.hours) return;
  const KEY_FIRST = 'kj_review_first', KEY_SEEN = 'kj_review_seen', KEY_LOCK = 'kj_review_locked';
  const get = (k) => { try { return Number(localStorage.getItem(k)) || 0; } catch { return 0; } };
  const set = (k, v) => { try { localStorage.setItem(k, String(v)); } catch { /* storage blocked */ } };

  function state() {
    const now = Date.now();
    let first = get(KEY_FIRST);
    if (!first) { first = now; set(KEY_FIRST, first); }
    const seen = get(KEY_SEEN);
    const rolledBack = seen && now < seen - 10 * 60000; // clock moved back more than 10 minutes
    if (!rolledBack && now > seen) set(KEY_SEEN, now);
    const end = Math.min(first + R.hours * 3600000, R.until || Infinity);
    const locked = get(KEY_LOCK) === 1 || rolledBack || now >= end;
    if (locked) set(KEY_LOCK, 1);
    return { locked, end, left: Math.max(0, end - now) };
  }

  function lockScreen() {
    const ta = (() => { try { return (JSON.parse(localStorage.getItem('kj_lang') || '"ta"') || 'ta') !== 'en'; } catch { return true; } })();
    document.documentElement.innerHTML = `<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>துணை</title>
      <style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#faf7f2;color:#241a2b;font-family:'Noto Sans Tamil',system-ui,sans-serif;text-align:center;padding:24px;box-sizing:border-box}
      .b{max-width:420px}.i{font-size:56px}h1{color:#7a1f3d;font-size:22px;margin:12px 0 8px;line-height:1.4}p{font-size:16px;line-height:1.6;margin:8px 0}.s{color:#6b5d70;font-size:13px;margin-top:20px}</style></head>
      <body><div class="b"><div class="i">🔒</div>
      <h1>${ta ? 'இந்தச் சோதனைப் பதிப்பின் காலம் முடிந்தது' : 'This review version has expired'}</h1>
      <p>${ta ? 'தொடர்ந்து பயன்படுத்த நிர்வாகியைத் தொடர்பு கொள்ளவும்.' : 'Please contact the administrator to continue.'}</p>
      <p>${ta ? 'This review version has expired. Please contact the administrator.' : 'இந்தச் சோதனைப் பதிப்பின் காலம் முடிந்தது. நிர்வாகியைத் தொடர்பு கொள்ளவும்.'}</p>
      <p class="s">© 2026 Thunai (துணை). All rights reserved. · Concept &amp; Developed by AG TECHNOLOGY SOLUTIONS</p></div></body>`;
  }

  function banner(left) {
    const h = Math.floor(left / 3600000), m = Math.floor((left % 3600000) / 60000);
    let el = document.getElementById('reviewBanner');
    if (!el) {
      el = document.createElement('div');
      el.id = 'reviewBanner';
      el.setAttribute('role', 'status');
      el.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:calc(76px + env(safe-area-inset-bottom));z-index:40;background:#7a1f3d;color:#fff;font:600 12px system-ui,sans-serif;padding:5px 12px;border-radius:999px;opacity:.92;pointer-events:none;white-space:nowrap';
      document.body.append(el);
    }
    el.textContent = `🔒 சோதனைப் பதிப்பு · Review version — ${h}h ${m}m`;
  }

  const first = state();
  if (first.locked) {
    window.KJ_REVIEW_LOCKED = true;
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', lockScreen); else lockScreen();
    return;
  }
  const tick = () => { const s = state(); if (s.locked) { window.KJ_REVIEW_LOCKED = true; lockScreen(); return; } if (document.body) banner(s.left); };
  document.addEventListener('DOMContentLoaded', tick);
  setInterval(tick, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
}());
