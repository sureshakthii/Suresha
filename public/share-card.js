// Shareable image cards (canvas): Today's palan, festival greetings, porutham summary (both people's consent),
// star birthday wishes, the person's own diary words, week / month summaries and the invite card.
// Layout lives in shared/share-card-layout.js (pure, tested); this file paints it with the bundled Tamil fonts and
// the logo, then shares the PNG: Capacitor Share (installed app, when the plugin is present) → Web Share with a file
// → download + WhatsApp text. Nothing is uploaded by Thunai; the person chooses where the image goes.
import { state, L, esc, api, STATIC, toast, BRAND } from './core.js';
import { layoutCard, assertShareable, SIZES, COLORS, approxMeasure } from './shared/share-card-layout.js';
import { APP_URL } from './shared/brand.js';

/**
 * The link put on cards. Configure with window.KJ_SHARE_URL (set by the hosting page / native shell); a web
 * deployment uses its own address; otherwise APP_URL from shared/brand.js — empty until the domain is final, and
 * then no link is printed (never a placeholder domain).
 */
export const DEFAULT_SHARE_URL = APP_URL;
export function shareUrl() {
  if (typeof window !== 'undefined' && typeof window.KJ_SHARE_URL === 'string' && /^https:\/\//.test(window.KJ_SHARE_URL)) return window.KJ_SHARE_URL;
  try {
    const { protocol, hostname, origin } = window.location;
    if (protocol === 'https:' && !/^(localhost|127\.|10\.|192\.168\.)/.test(hostname) && !/claude\.ai|claudeusercontent/.test(hostname)) return origin;
  } catch { /* no location */ }
  return DEFAULT_SHARE_URL;
}

let inviteMemo = null;
/**
 * Invite details for cards: the signed-in person's referral code and link when the server runs referrals
 * (server/growth.js: both people get free Personal-plan days when a new account joins with the code in its first
 * 7 days); otherwise only the app link — no reward is claimed.
 */
export async function inviteInfo() {
  if (inviteMemo && inviteMemo.user === (state.user?.id || null)) return inviteMemo;
  let info = { code: null, link: shareUrl(), referral: false, referred: 0, rewardDaysEarned: 0 };
  if (!STATIC && state.user) {
    try {
      const r = await api('/api/referral');
      if (r?.code) info = { code: String(r.code), link: String(r.link || shareUrl()), referral: true, referred: Number(r.referred) || 0, rewardDaysEarned: Number(r.rewardDaysEarned) || 0 };
    } catch { /* offline or not enabled: plain link */ }
  }
  inviteMemo = { ...info, user: state.user?.id || null };
  return inviteMemo;
}
/** The invite line printed on a card (in the card's language). */
export function inviteLine(info, lang = state.lang) {
  if (!info) return '';
  if (info.referral && info.code) return lang === 'en' ? `Join me on Thunai — code ${info.code} · ${info.link}` : `துணையில் இணையுங்கள் — அழைப்புக் குறியீடு ${info.code} · ${info.link}`;
  if (!info.link) return lang === 'en' ? 'Made with the Thunai app' : 'துணை செயலியில் உருவாக்கப்பட்டது';
  return lang === 'en' ? `Get the Thunai app: ${info.link}` : `துணை செயலியைப் பெற: ${info.link}`;
}
/** Honest reward line for the invite screen / prompt (only when the server runs referrals). */
export function rewardLine(info) {
  if (!info?.referral) return '';
  return L('When someone new joins with your code in their first week, you both get free Personal-plan days (up to 12 friends).',
    'புதியவர் தங்கள் முதல் வாரத்தில் உங்கள் குறியீட்டுடன் சேர்ந்தால், உங்கள் இருவருக்கும் இலவச தனிநபர் திட்ட நாட்கள் (12 நண்பர்கள் வரை).');
}

// ---------------------------------------------------------------- painting
let fontsReady = null;
function loadFonts() {
  if (fontsReady) return fontsReady;
  const loads = ['500 40px "Noto Sans Tamil"', '600 40px "Noto Sans Tamil"', '700 40px "Noto Sans Tamil"', '700 40px "Noto Serif Tamil"', '600 40px "Noto Serif Tamil"',
    '500 40px "Inter"', '600 40px "Inter"', '700 40px "Inter"'].map((f) => document.fonts?.load(f, f.includes('Inter') ? 'Thunai 0123' : 'துணை').catch(() => null));
  fontsReady = Promise.all(loads).then(() => document.fonts?.ready).catch(() => null);
  return fontsReady;
}
let logoImg = null;
function loadLogo() {
  if (logoImg) return logoImg;
  logoImg = new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = 'logo.svg'; });
  return logoImg;
}

/** Paint a card spec to a canvas. Returns { canvas, layout }. */
export async function renderCard(spec, { size = 'portrait' } = {}) {
  assertShareable(spec);
  await loadFonts();
  const logo = await loadLogo();
  const { w, h } = SIZES[size] || SIZES.portrait;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  const measure = (text, f) => { ctx.font = f; return ctx.measureText(text).width; };
  const lay = layoutCard(spec, { size, measure });
  for (const it of lay.items) paint(ctx, it, logo);
  return { canvas, layout: lay };
}

function paint(ctx, it, logo) {
  if (it.t === 'bg' || it.t === 'band') {
    const g = ctx.createLinearGradient(0, it.y, 0, it.y + it.h);
    g.addColorStop(0, it.from); g.addColorStop(1, it.to);
    ctx.fillStyle = g; ctx.fillRect(it.x, it.y, it.w, it.h);
    if (it.t === 'band') { ctx.fillStyle = 'rgba(245, 194, 107, 0.9)'; ctx.fillRect(it.x, it.y + it.h - 6, it.w, 6); }
    return;
  }
  if (it.t === 'logo') {
    if (logo) ctx.drawImage(logo, it.x, it.y, it.size, it.size);
    else { ctx.fillStyle = '#ffe7b8'; ctx.beginPath(); ctx.arc(it.x + it.size / 2, it.y + it.size / 2, it.size / 2, 0, Math.PI * 2); ctx.fill(); }
    return;
  }
  if (it.t === 'rule') { ctx.fillStyle = it.color; ctx.fillRect(it.x, it.y, it.w, 2); return; }
  if (it.t === 'ornament') {
    ctx.strokeStyle = it.color; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(it.x, it.y); ctx.lineTo(it.x + 150, it.y); ctx.stroke();
    ctx.fillStyle = it.color; ctx.beginPath(); ctx.moveTo(it.x + 170, it.y - 9); ctx.lineTo(it.x + 179, it.y); ctx.lineTo(it.x + 170, it.y + 9); ctx.lineTo(it.x + 161, it.y); ctx.closePath(); ctx.fill();
    return;
  }
  if (it.t === 'dot') { ctx.fillStyle = it.color; ctx.beginPath(); ctx.arc(it.x, it.y, it.r, 0, Math.PI * 2); ctx.fill(); return; }
  if (it.t === 'quote') { ctx.fillStyle = it.color; ctx.font = `700 ${Math.round(it.size)}px Georgia, serif`; ctx.textBaseline = 'top'; ctx.fillText('“', it.x - 8, it.y - it.size * 0.3); return; }
  if (it.t === 'text') {
    ctx.font = it.font; ctx.fillStyle = it.color; ctx.textAlign = it.align || 'left'; ctx.textBaseline = it.base || 'alphabetic';
    let text = it.text;
    if (it.maxW) while (text.length > 4 && ctx.measureText(text).width > it.maxW) text = `${text.slice(0, -2)}…`;
    ctx.fillText(text, it.x, it.y);
    ctx.textAlign = 'left';
  }
}

const toBlob = (canvas) => new Promise((res) => canvas.toBlob((b) => res(b), 'image/png'));

/** Share a PNG: Capacitor Share plugin → Web Share with a file → download + WhatsApp text. Returns how it went. */
export async function shareImage(blob, { filename = 'thunai.png', text = '', title = BRAND.name } = {}) {
  const cap = window.Capacitor;
  const Share = cap?.Plugins?.Share, FS = cap?.Plugins?.Filesystem;
  if (cap?.isNativePlatform?.() && Share && FS) {
    try {
      const data = await new Promise((res) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.readAsDataURL(blob); });
      const w = await FS.writeFile({ path: filename, data, directory: 'CACHE' });
      await Share.share({ title, text, files: [w.uri], url: undefined });
      return 'shared';
    } catch { /* fall through */ }
  }
  try {
    const file = new File([blob], filename, { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], text, title }); return 'shared'; }
  } catch (e) { if (e?.name === 'AbortError') return 'cancelled'; }
  downloadBlob(blob, filename);
  return 'downloaded';
}
export function downloadBlob(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
const whatsappText = (spec, invite) => [spec.title, spec.subtitle, spec.quote ? `“${spec.quote}”` : '', ...(spec.lines || []).map((x) => `• ${x}`), spec.closing, '', invite || ''].filter((x, i, a) => x || (x === '' && a[i - 1])).join('\n').trim();

/**
 * Preview + share sheet for a card. spec: see shared/share-card-layout.js (text already in one language).
 * The invite line is added here (and can be left off by the person).
 */
export async function openShareCard(spec, { filename = 'thunai-card.png' } = {}) {
  try { assertShareable(spec); } catch { toast(L('This card cannot be shared.', 'இந்த அட்டையைப் பகிர இயலாது.')); return; }
  const info = await inviteInfo();
  const ui = { size: 'portrait', invite: true, blob: null };
  const box = document.createElement('div');
  box.className = 'modal sc-modal';
  box.innerHTML = `<div class="modal-card card glass sc-sheet" role="dialog" aria-modal="true" aria-labelledby="scTitle">
    <div class="card-title"><span id="scTitle">🖼️ ${L('Share as image', 'படமாகப் பகிர்')}</span><button class="link-btn" data-sc="x" aria-label="${esc(L('Close', 'மூடு'))}">✕</button></div>
    <div class="seg sc-size" role="radiogroup" aria-label="${esc(L('Size', 'அளவு'))}"><button type="button" role="radio" data-size="portrait" class="sel" aria-checked="true">${L('Status 4:5', 'ஸ்டேட்டஸ் 4:5')}</button><button type="button" role="radio" data-size="square" aria-checked="false">${L('Square 1:1', 'சதுரம் 1:1')}</button></div>
    <div class="sc-preview"><p class="muted small">${L('Preparing…', 'தயாராகிறது…')}</p></div>
    <label class="set-row small"><span>${info.referral ? L('Add my invite code', 'என் அழைப்புக் குறியீட்டைச் சேர்') : L('Add the app link', 'செயலி இணைப்பைச் சேர்')}</span><input type="checkbox" data-sc="invite" checked></label>
    <p class="muted small">${L('Only the picture you see is shared. No birth details are on it.', 'நீங்கள் பார்க்கும் படம் மட்டுமே பகிரப்படும். இதில் பிறப்பு விவரங்கள் இல்லை.')}</p>
    <div class="btn-row"><button class="btn-gold" data-sc="share">📤 ${L('Share', 'பகிர்')}</button><button class="chip-btn" data-sc="save">⬇️ ${L('Save image', 'படத்தைச் சேமி')}</button><button class="chip-btn" data-sc="wa">WhatsApp ${L('text', 'உரை')}</button></div>
  </div>`;
  document.body.append(box);
  const opener = document.activeElement;
  const close = () => { box.remove(); opener?.focus?.({ preventScroll: true }); };
  const draw = async () => {
    const full = { ...spec, invite: ui.invite ? inviteLine(info, spec.lang) : '' };
    const { canvas } = await renderCard(full, { size: ui.size });
    ui.blob = await toBlob(canvas);
    const url = canvas.toDataURL('image/png');
    box.querySelector('.sc-preview').innerHTML = `<img src="${url}" alt="${esc(spec.title || '')}" width="${canvas.width}" height="${canvas.height}">`;
  };
  await draw().catch(() => { box.querySelector('.sc-preview').innerHTML = `<p class="err">${L('Could not draw the card on this phone.', 'இந்தக் கைப்பேசியில் அட்டையை வரைய இயலவில்லை.')}</p>`; });
  box.querySelector('[data-sc="share"]')?.focus();
  box.addEventListener('click', async (e) => {
    if (e.target === box) { close(); return; }
    const sz = e.target.closest('[data-size]');
    if (sz) {
      ui.size = sz.dataset.size;
      box.querySelectorAll('[data-size]').forEach((b) => { b.classList.toggle('sel', b === sz); b.setAttribute('aria-checked', String(b === sz)); });
      await draw();
      return;
    }
    const b = e.target.closest('[data-sc]');
    if (!b) return;
    const act = b.dataset.sc;
    if (act === 'x') close();
    else if (act === 'share' && ui.blob) {
      const how = await shareImage(ui.blob, { filename, text: ui.invite ? inviteLine(info, spec.lang) : '' });
      if (how === 'downloaded') toast(L('Image saved — attach it in WhatsApp', 'படம் சேமிக்கப்பட்டது — WhatsApp-இல் இணைக்கவும்'));
      if (how !== 'cancelled') document.dispatchEvent(new CustomEvent('kj:task', { detail: `sharecard:${spec.kind}` }));
    } else if (act === 'save' && ui.blob) { downloadBlob(ui.blob, filename); toast(L('Image saved', 'படம் சேமிக்கப்பட்டது')); }
    else if (act === 'wa') window.open(`https://wa.me/?text=${encodeURIComponent(whatsappText(spec, ui.invite ? inviteLine(info, spec.lang) : ''))}`, '_blank', 'noopener');
  });
  box.querySelector('[data-sc="invite"]').addEventListener('change', async (e) => { ui.invite = e.target.checked; await draw(); });
}

export { COLORS, approxMeasure };
