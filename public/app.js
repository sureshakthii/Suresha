// Kaippesi Jothidar — app boot, splash, background sky and the one-second live tick.
import { state, $, $$, L, ta, STATIC, store, go, currentScreen, saveSettings, setLoc, activeMember, toast } from './core.js';
import { refreshSnap } from './screens-main.js';
import './screens-tools.js';
import './screens-world.js';
import './screens-life.js';
import './screens-plans.js';
import './legal.js';
import './screens-couple.js';
import './screens-guide.js';
import './screens-roadmap.js';
import './screens-depth.js';
import { loadSession } from './account.js';
import { startAnalytics, loadBilling } from './growth.js';

function startSky() {
  const c = $('#sky');
  const ctx = c.getContext('2d');
  let stars = [];
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = innerWidth * dpr; c.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = Array.from({ length: Math.round((innerWidth * innerHeight) / 2600) }, () => ({
      x: Math.random() * innerWidth, y: Math.random() * innerHeight, r: Math.random() * 1.3 + 0.2,
      p: Math.random() * Math.PI * 2, s: 0.5 + Math.random() * 1.5, gold: Math.random() < 0.12,
    }));
  };
  resize();
  addEventListener('resize', resize);
  let shoot = null;
  const draw = (ts) => {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const st of stars) {
      const a = 0.35 + 0.65 * Math.abs(Math.sin(st.p + (ts / 1000) * st.s));
      ctx.fillStyle = st.gold ? `rgba(255,214,140,${a})` : `rgba(235,230,255,${a})`;
      ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2); ctx.fill();
    }
    if (!shoot && Math.random() < 0.004) shoot = { x: Math.random() * innerWidth, y: Math.random() * innerHeight * 0.4, l: 0 };
    if (shoot) {
      shoot.l += 14;
      const g = ctx.createLinearGradient(shoot.x + shoot.l, shoot.y + shoot.l * 0.5, shoot.x + shoot.l - 90, shoot.y + shoot.l * 0.5 - 45);
      g.addColorStop(0, 'rgba(255,240,200,.9)'); g.addColorStop(1, 'rgba(255,240,200,0)');
      ctx.strokeStyle = g; ctx.lineWidth = 1.6; ctx.beginPath();
      ctx.moveTo(shoot.x + shoot.l, shoot.y + shoot.l * 0.5); ctx.lineTo(shoot.x + shoot.l - 90, shoot.y + shoot.l * 0.5 - 45); ctx.stroke();
      if (shoot.l > 500) shoot = null;
    }
    requestAnimationFrame(draw);
  };
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) requestAnimationFrame(draw);
  else draw(0);
}

function splash() {
  const g = $('#splash-signs');
  const glyphs = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];
  g.innerHTML = glyphs.map((s, i) => {
    const a = (i * 30 - 75) * Math.PI / 180;
    const x = 100 + 85 * Math.cos(a), y = 100 + 85 * Math.sin(a);
    const lx = 100 + 96 * Math.cos(a - Math.PI / 12), ly = 100 + 96 * Math.sin(a - Math.PI / 12);
    const ix = 100 + 74 * Math.cos(a - Math.PI / 12), iy = 100 + 74 * Math.sin(a - Math.PI / 12);
    return `<line x1="${ix}" y1="${iy}" x2="${lx}" y2="${ly}" stroke="rgba(245,194,107,.4)"/><text x="${x}" y="${y}" fill="#ffdf9e" font-size="13" text-anchor="middle" dominant-baseline="central">${s}</text>`;
  }).join('');
  return new Promise((res) => setTimeout(() => {
    $('#splash').classList.add('fade');
    setTimeout(() => { $('#splash').remove(); res(); }, 800);
  }, 2600));
}

function applyLang() {
  document.body.classList.toggle('ta', ta());
  document.documentElement.lang = state.lang;
  $$('[data-i18n-en]').forEach((el) => { el.textContent = ta() ? el.dataset.i18nTa : el.dataset.i18nEn; });
}

async function boot() {
  startSky();
  applyLang();
  saveSettings();
  startAnalytics();
  await Promise.all([splash(), loadSession().then(loadBilling)]);
  if (!state.loc) {
    const m = activeMember();
    setLoc(m ? { lat: m.lat, lon: m.lon, tz: m.tz, name: m.place } : { lat: 13.0827, lon: 80.2707, tz: 5.5, name: 'Chennai' });
  }
  refreshSnap(true);
  $('#app').hidden = false;

  $('#langBtn').addEventListener('click', () => { state.lang = ta() ? 'en' : 'ta'; store.set('kj_lang', state.lang); document.dispatchEvent(new Event('kj:lang')); });
  document.addEventListener('kj:lang', () => { applyLang(); go(state.view, state.params); });
  $$('.tabbar button').forEach((b) => b.addEventListener('click', () => go(b.dataset.tab)));

  if (location.hash === '#billing-success') toast(L('Payment received — Premium is active 🙏', 'கட்டணம் பெறப்பட்டது — பிரீமியம் செயலில் 🙏'));
  if (location.hash === '#welcome') toast(L('Signed in with Facebook', 'Facebook மூலம் உள்நுழைந்தீர்கள்'));
  if (location.hash === '#login-failed') toast(L('Facebook sign-in failed. Please try again.', 'Facebook உள்நுழைவு தோல்வி. மீண்டும் முயற்சிக்கவும்.'));
  if (location.hash) history.replaceState(null, '', location.pathname);

  if (!state.user && !store.get('kj_skip_login', false)) go('login');
  else if (!state.family.length) go('family', { add: true, first: true });
  else go('home');

  setInterval(() => {
    if (!state.loc) return;
    const fresh = refreshSnap();
    const s = currentScreen();
    if (fresh && state.view === 'home') go('home');
    else s?.tick?.();
  }, 1000);
  if (!STATIC && 'serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
}

boot();
