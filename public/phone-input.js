// International mobile numbers (சர்வதேச மொபைல் எண்). Every mobile-number field in the app gets a country-code
// picker — searchable, flag + Tamil / English country name + dialling code, defaulting from the phone's locale and
// time zone (India when unknown). Like easy-date.js, any <input inputmode="tel"> (or type="tel") is enhanced
// automatically: the original input stays in the form, hidden, and always holds the number in E.164 form
// (+94771234567), so existing code that reads it keeps working. Add data-native to an input to opt out.
import { COUNTRIES, countryByCode, guessCountry, searchCountries, toE164, parseE164 } from './shared/countries.js';
import { L, ta, esc, store, state } from './core.js';
import { countryOfLoc } from './shared/residence.js';

const PREF_KEY = 'kj_phone_cc';
// Countries most of our users dial from, shown first in the picker.
const TOP = ['IN', 'LK', 'MY', 'SG', 'AE', 'GB', 'US', 'CA', 'AU', 'QA', 'SA', 'OM', 'KW', 'BH', 'FR', 'DE', 'CH', 'ZA', 'MU', 'NZ'];

/** The country the picker starts with: the last one chosen on this phone, else where the person lives, else the device's locale / time zone. */
export function defaultCountry() {
  const saved = countryByCode(store.get(PREF_KEY, ''));
  // Then where the person lives (set on first run), so a laptop with a foreign locale still starts at +91 in Chennai.
  let home = null; try { home = countryByCode(countryOfLoc(state.residence) || ''); } catch { home = null; }
  return saved || home || guessCountry();
}

const countryName = (c) => (ta() ? c.ta : c.en);
const btnText = (c) => `<span class="cc-flag" aria-hidden="true">${c.flag}</span><span class="cc-dial">+${c.dial}</span><span class="cc-caret" aria-hidden="true">▾</span>`;

/** Friendly error for a number that does not fit the country's mobile length. */
export function phoneError(c) {
  const len = c.min === c.max ? `${c.min}` : `${c.min}–${c.max}`;
  return L(`Enter a valid mobile number for ${c.en} (+${c.dial}): ${len} digits after the country code`,
    `${c.ta} (+${c.dial}) மொபைல் எண்ணைச் சரியாக உள்ளிடவும்: நாட்டுக் குறியீட்டுக்குப் பின் ${len} இலக்கங்கள்`);
}

/**
 * Enhance one input. Returns { get(): {ok, e164, country, error}, setCountry(cc) }.
 * The visible field takes the local number; the original input (now hidden) holds E.164.
 */
export function enhancePhone(input) {
  if (input.dataset.phoneDone) return input._phone;
  input.dataset.phoneDone = '1';
  const parsed = parseE164(input.value) || (/^\d{10}$/.test(String(input.value).replace(/\D/g, '')) && /^[6-9]/.test(String(input.value).replace(/\D/g, '')) ? { country: countryByCode('IN'), national: String(input.value).replace(/\D/g, '') } : null);
  let country = parsed?.country || defaultCountry();
  const wrap = document.createElement('div');
  wrap.className = 'phone-in intl';
  const vis = document.createElement('input');
  vis.type = 'tel';
  vis.inputMode = 'tel';
  vis.autocomplete = 'tel-national';
  vis.className = 'phone-national';
  vis.maxLength = 18;
  vis.value = parsed ? parsed.national : input.value.replace(/^\+/, '');
  vis.placeholder = input.placeholder && !/^\+/.test(input.placeholder) ? input.placeholder : L('Number', 'எண்');
  if (input.required) { vis.required = true; input.required = false; }
  if (input.id) { vis.id = input.id; input.removeAttribute('id'); }
  for (const a of ['aria-label', 'aria-describedby']) if (input.hasAttribute(a)) vis.setAttribute(a, input.getAttribute(a));
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'cc-btn';
  // DOM order: number first (so a wrapping <label> focuses the number, not the button); CSS shows the button first.
  input.parentNode.insertBefore(wrap, input);
  wrap.append(vis, btn, input);
  input.type = 'hidden';

  const paint = () => {
    btn.innerHTML = btnText(country);
    btn.setAttribute('aria-label', `${L('Country code', 'நாட்டுக் குறியீடு')}: ${countryName(country)} +${country.dial}`);
    btn.title = `${countryName(country)} +${country.dial}`;
  };
  const get = () => toE164(country.cc, vis.value);
  const sync = () => {
    const r = get();
    if (r.ok && r.country.cc !== country.cc) { country = r.country; paint(); } // typed +44… switches the flag
    input.value = r.ok ? r.e164 : (vis.value.trim() ? `+${country.dial}${vis.value.replace(/\D/g, '')}` : '');
    vis.setCustomValidity(!vis.value.trim() || r.ok ? '' : phoneError(country));
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };
  vis.addEventListener('input', sync);
  btn.addEventListener('click', () => openPicker(country, (c) => { country = c; store.set(PREF_KEY, c.cc); paint(); sync(); vis.focus(); }));
  paint();
  sync();
  input._phone = { get, setCountry: (cc) => { country = countryByCode(cc) || country; paint(); sync(); }, input: vis, country: () => country };
  return input._phone;
}

/** Full-screen (on phones) searchable country list. */
export function openPicker(current, onPick) {
  document.querySelector('.cc-sheet')?.remove();
  const sheet = document.createElement('div');
  sheet.className = 'cc-sheet';
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  sheet.setAttribute('aria-label', L('Choose country code', 'நாட்டுக் குறியீட்டைத் தேர்வு செய்க'));
  sheet.innerHTML = `<div class="cc-panel">
      <div class="cc-head"><b>${L('Country code', 'நாட்டுக் குறியீடு')}</b><button type="button" class="cc-close" aria-label="${esc(L('Close', 'மூடு'))}">✕</button></div>
      <input type="search" class="cc-search" data-native autocomplete="off" placeholder="${esc(L('Search country or code (e.g. Lanka, +94)', 'நாடு அல்லது குறியீடு தேடுக (எ.கா. இலங்கை, +94)'))}">
      <ul class="cc-list" role="listbox"></ul></div>`;
  document.body.append(sheet);
  const list = sheet.querySelector('.cc-list');
  const search = sheet.querySelector('.cc-search');
  const row = (c) => `<li role="option" tabindex="0" data-cc="${c.cc}"${c.cc === current?.cc ? ' aria-selected="true"' : ''}>
      <span class="cc-flag" aria-hidden="true">${c.flag}</span><span class="cc-name">${esc(countryName(c))}${ta() && c.ta !== c.en ? `<small>${esc(c.en)}</small>` : ''}</span><span class="cc-code">+${c.dial}</span></li>`;
  const draw = () => {
    const q = search.value.trim();
    const items = q ? searchCountries(q) : [...TOP.map(countryByCode).filter(Boolean), ...COUNTRIES.filter((c) => !TOP.includes(c.cc))];
    list.innerHTML = items.length ? `${q ? '' : `<li class="cc-sep" aria-hidden="true">${L('Common', 'அடிக்கடி')}</li>`}${items.map((c, i) => `${!q && i === TOP.length ? `<li class="cc-sep" aria-hidden="true">${L('All countries', 'எல்லா நாடுகளும்')}</li>` : ''}${row(c)}`).join('')}`
      : `<li class="cc-sep">${L('No match', 'பொருத்தம் இல்லை')}</li>`;
  };
  const close = () => { sheet.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  const pick = (li) => { const c = countryByCode(li.dataset.cc); if (c) { close(); onPick(c); } };
  list.addEventListener('click', (e) => { const li = e.target.closest('li[data-cc]'); if (li) pick(li); });
  list.addEventListener('keydown', (e) => { const li = e.target.closest('li[data-cc]'); if (li && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); pick(li); } });
  search.addEventListener('input', draw);
  search.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); const li = list.querySelector('li[data-cc]'); if (li) pick(li); } });
  sheet.querySelector('.cc-close').addEventListener('click', close);
  sheet.addEventListener('click', (e) => { if (e.target === sheet) close(); });
  draw();
  setTimeout(() => search.focus(), 30);
  return { close, sheet };
}

/** Phone-number inputs we enhance: inputmode="tel" or type="tel", unless marked data-native. */
const SELECTOR = 'input[inputmode="tel"]:not([data-native]):not([data-phone-done]), input[type="tel"]:not([data-native]):not([data-phone-done])';
function enhanceAll(root = document) {
  if (!root.querySelectorAll) return;
  for (const el of root.querySelectorAll(SELECTOR)) if (!el.classList.contains('phone-national')) enhancePhone(el);
}

let started = false;
export function startPhoneInputs() {
  if (started || typeof document === 'undefined') return;
  started = true;
  new MutationObserver((list) => { for (const m of list) for (const n of m.addedNodes) if (n.nodeType === 1) enhanceAll(n.parentNode || n); }).observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => enhanceAll()); else enhanceAll();
}
