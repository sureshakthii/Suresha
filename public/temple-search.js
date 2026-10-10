// Temple search with a live suggestion list (autocomplete) — used wherever a temple is searched or chosen:
// Temples list, journey planner, parigaram sthalam picker, packages and the seva / archanai booking form.
// Matching and ranking live in shared/temples.js (searchTemples): offline, Tamil / English / Tanglish, prefix first,
// then nearest to the selected place.
import { searchTemples } from './shared/temples.js';
import { state, esc, bi, L, ta, placeName, GLYPH, COLOR } from './core.js';

let uid = 0;

/** Markup for a temple search field. `name` (optional) adds a hidden input carrying the chosen temple id. */
export function templeSearchField({ id = `ts${++uid}`, label = '', placeholder = '', value = '', name = '', selectedId = '', cls = '' } = {}) {
  const ph = placeholder || L('Type a temple, deity or town — e.g. Palani, திருச்செந்தூர்', 'கோவில், தெய்வம், ஊர் — எ.கா. பழனி, Tiruchendur');
  return `<div class="ts-wrap ${cls}">
    ${label ? `<label class="ts-label" for="${id}">${label}</label>` : `<label class="sr-only" for="${id}">${L('Search temples', 'கோவில் தேடல்')}</label>`}
    <div class="ts-box"><span class="ts-icon" aria-hidden="true">🔍</span>
      <input id="${id}" class="ts-input" type="search" enterkeyhint="search" autocomplete="off" autocapitalize="off" spellcheck="false"
        role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="${id}-list" placeholder="${esc(ph)}" value="${esc(value)}">
      ${name ? `<input type="hidden" name="${esc(name)}" value="${esc(selectedId)}">` : ''}</div>
    <ul id="${id}-list" class="suggest ts-list" role="listbox" hidden></ul></div>`;
}

/** Distance text from the selected place: road estimate when near, a flight hint when far. */
export function kmText(km) {
  if (km == null) return '';
  if (km > 700) return `✈️ ~${Math.round(km).toLocaleString()} ${L('km', 'கி.மீ')}`;
  return `📏 ~${km < 1 ? '<1' : Math.round(km * 1.3)} ${L('km', 'கி.மீ')}`;
}

function rowHtml(t, i, active) {
  const main = bi(t.name), other = ta() ? t.name.en : t.name.ta;
  const icon = t.planet ? `<span style="color:${COLOR[t.planet]}">${GLYPH[t.planet]}</span>` : '🛕';
  return `<li id="${i}" role="option" class="ts-row" data-i="${i.split('-o').pop()}" aria-selected="${active ? 'true' : 'false'}">
    <span class="ts-ic" aria-hidden="true">${icon}</span>
    <span class="ts-txt"><b>${esc(main)}</b><small class="ts-alt">${esc(other)}</small>
      <small>${esc(bi(t.deity))} · ${esc(placeName(t.town))}${t.km != null ? ` · ${kmText(t.km)}` : ''}</small></span></li>`;
}

/**
 * Attach live suggestions to an input made by templeSearchField (or any input followed by a .ts-list).
 *   onPick(temple)  — called when a suggestion is tapped / chosen with Enter.
 *   onQuery(text)   — optional: called (debounced) with the typed text, e.g. to filter a list below.
 *   filter(temple)  — optional: limit the suggestions (e.g. temples in packages only).
 */
export function attachTempleSearch(input, { onPick, onQuery, filter = null, limit = 8, keepText = true } = {}) {
  if (!input) return;
  const wrap = input.closest('.ts-wrap') || input.parentElement;
  const list = wrap.querySelector('.ts-list');
  const hidden = wrap.querySelector('input[type=hidden]');
  let items = [], active = -1, timer = 0;
  // The open list must sit above the following cards (glass cards form their own stacking contexts).
  const host = wrap.closest('.card, form') || wrap;
  const setOpen = (on) => { list.hidden = !on; input.setAttribute('aria-expanded', on ? 'true' : 'false'); host.classList.toggle('ts-open', on); };
  const close = () => { setOpen(false); input.removeAttribute('aria-activedescendant'); active = -1; };
  const draw = () => {
    if (!items.length) {
      const q = input.value.trim();
      if (q) {
        list.innerHTML = `<li class="ts-none" role="option" aria-disabled="true">${L('No temple found — try another spelling or the town name', 'கோவில் கிடைக்கவில்லை — வேறு எழுத்துக்கூட்டல் அல்லது ஊர்ப் பெயரில் தேடுங்கள்')}</li>`;
        setOpen(true);
      } else close();
      return;
    }
    list.innerHTML = items.map((t, i) => rowHtml(t, `${input.id}-o${i}`, i === active)).join('');
    setOpen(true);
    if (active >= 0) input.setAttribute('aria-activedescendant', `${input.id}-o${active}`);
  };
  const run = () => {
    const q = input.value.trim();
    onQuery?.(q);
    if (!q) { items = []; close(); return; }
    const loc = state.loc || {};
    items = searchTemples(q, { lat: loc.lat, lon: loc.lon, limit: filter ? 200 : limit }).filter((t) => !filter || filter(t)).slice(0, limit);
    active = -1;
    draw();
  };
  const pick = (i) => {
    const t = items[i];
    if (!t) return;
    if (keepText) input.value = bi(t.name);
    if (hidden) hidden.value = t.id;
    close();
    onPick?.(t);
  };
  input.addEventListener('input', () => { if (hidden) hidden.value = ''; clearTimeout(timer); timer = setTimeout(run, 120); });
  input.addEventListener('focus', () => { if (input.value.trim() && !hidden?.value) run(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (list.hidden) { run(); return; }
      e.preventDefault();
      const n = items.length;
      active = !n ? -1 : e.key === 'ArrowDown' ? (active + 1) % n : active <= 0 ? n - 1 : active - 1;
      draw();
      list.querySelector('[aria-selected=true]')?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      if (!list.hidden && items.length) { e.preventDefault(); pick(active >= 0 ? active : 0); }
    } else if (e.key === 'Escape') close();
  });
  // pointerdown + preventDefault keeps the input focused, so the tap selects before blur closes the list.
  list.addEventListener('pointerdown', (e) => { if (e.target.closest('.ts-row')) e.preventDefault(); });
  list.addEventListener('click', (e) => { const li = e.target.closest('.ts-row'); if (li) pick(Number(li.dataset.i)); });
  input.addEventListener('blur', () => setTimeout(close, 150));
  return { close, run };
}
