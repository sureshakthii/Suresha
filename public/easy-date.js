// Easy date & time entry (எளிய தேதி / நேரம்). Every <input type="date"> and <input type="time"> in the app is
// shown as simple pickers that elders find easy: Day ▾ Month ▾ Year (typed), and Hour ▾ Minute ▾ AM/PM ▾.
// The original input stays in the form (hidden) and keeps its normal value (YYYY-MM-DD / HH:MM[:SS]),
// so all existing code that reads it keeps working. Add data-native to an input to keep the phone's picker.
import { L, ta } from './core.js';

const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_TA = ['ஜனவரி', 'பிப்ரவரி', 'மார்ச்', 'ஏப்ரல்', 'மே', 'ஜூன்', 'ஜூலை', 'ஆகஸ்ட்', 'செப்டம்பர்', 'அக்டோபர்', 'நவம்பர்', 'டிசம்பர்'];
const pad = (n) => String(n).padStart(2, '0');
const opt = (v, t, sel) => `<option value="${v}"${sel ? ' selected' : ''}>${t}</option>`;

function fire(input) {
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function enhanceDate(input) {
  const [y0, m0, d0] = (input.value || '').split('-').map(Number);
  const box = document.createElement('div');
  box.className = 'easy-dt';
  const months = ta() ? MONTHS_TA : MONTHS_EN;
  box.innerHTML = `
    <select class="ed-d" aria-label="${L('Day', 'நாள்')}">${opt('', L('Day', 'நாள்'), !d0)}${Array.from({ length: 31 }, (_, i) => opt(i + 1, i + 1, d0 === i + 1)).join('')}</select>
    <select class="ed-m" aria-label="${L('Month', 'மாதம்')}">${opt('', L('Month', 'மாதம்'), !m0)}${months.map((n, i) => opt(i + 1, n, m0 === i + 1)).join('')}</select>
    <input class="ed-y" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="${L('Year', 'ஆண்டு')}" aria-label="${L('Year (4 digits)', 'ஆண்டு (4 இலக்கம்)')}" value="${y0 || ''}">`;
  const [d, m, y] = [box.querySelector('.ed-d'), box.querySelector('.ed-m'), box.querySelector('.ed-y')];
  const sync = () => {
    y.value = y.value.replace(/\D/g, '').slice(0, 4);
    const Y = Number(y.value), M = Number(m.value);
    let D = Number(d.value);
    const ok = Y >= 1800 && Y <= 2200 && M && D;
    if (ok) { const maxD = new Date(Y, M, 0).getDate(); if (D > maxD) { D = maxD; d.value = String(D); } }
    const v = ok ? `${Y}-${pad(M)}-${pad(D)}` : '';
    y.classList.toggle('bad', y.value.length === 4 && !(Y >= 1800 && Y <= 2200));
    if (v !== input.value) { input.value = v; fire(input); }
  };
  d.addEventListener('change', sync); m.addEventListener('change', sync); y.addEventListener('input', sync);
  if (input.required) { input.required = false; d.required = true; m.required = true; y.required = true; y.pattern = '\\d{4}'; }
  return box;
}

function enhanceTime(input) {
  const [h0, mi0] = (input.value || '').split(':').map(Number);
  const has = input.value !== '';
  const h12 = has ? ((h0 + 11) % 12) + 1 : 0;
  const pm = has && h0 >= 12;
  const box = document.createElement('div');
  box.className = 'easy-dt easy-tm';
  box.innerHTML = `
    <select class="et-h" aria-label="${L('Hour', 'மணி')}">${opt('', L('Hour', 'மணி'), !has)}${Array.from({ length: 12 }, (_, i) => opt(i + 1, i + 1, h12 === i + 1)).join('')}</select>
    <select class="et-m" aria-label="${L('Minute', 'நிமிடம்')}">${opt('', L('Min', 'நிமி'), !has)}${Array.from({ length: 60 }, (_, i) => opt(i, pad(i), has && mi0 === i)).join('')}</select>
    <select class="et-p" aria-label="${L('AM or PM', 'காலை / மாலை')}">${opt('am', 'AM', !pm)}${opt('pm', 'PM', pm)}</select>`;
  const [h, mi, p] = [box.querySelector('.et-h'), box.querySelector('.et-m'), box.querySelector('.et-p')];
  const withSec = input.step && Number(input.step) < 60;
  const sync = () => {
    const H = Number(h.value), M = mi.value === '' ? NaN : Number(mi.value);
    const v = H && !Number.isNaN(M) ? `${pad((H % 12) + (p.value === 'pm' ? 12 : 0))}:${pad(M)}${withSec ? ':00' : ''}` : '';
    if (v !== input.value) { input.value = v; fire(input); }
  };
  [h, mi, p].forEach((s) => s.addEventListener('change', sync));
  if (input.required) { input.required = false; h.required = true; mi.required = true; }
  return box;
}

function enhance(root = document) {
  root.querySelectorAll?.('input[type="date"]:not([data-easy]):not([data-native]), input[type="time"]:not([data-easy]):not([data-native])').forEach((input) => {
    input.dataset.easy = '1';
    const box = input.type === 'date' ? enhanceDate(input) : enhanceTime(input);
    input.classList.add('easy-src');
    input.tabIndex = -1;
    input.setAttribute('aria-hidden', 'true');
    // Tapping the field's label must never open the phone's own picker — send focus to the first easy picker.
    input.addEventListener('focus', () => { input.blur(); box.querySelector('select, input')?.focus(); });
    input.addEventListener('click', (e) => e.preventDefault());
    input.after(box);
  });
}

if (typeof document !== 'undefined') {
  new MutationObserver((list) => { for (const m of list) for (const n of m.addedNodes) if (n.nodeType === 1) enhance(n.parentNode || n); }).observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => enhance()); else enhance();
}
