// Desktop & laptop navigation (≥ 1024 px wide): a left sidebar with the brand, a tools search, the five main
// destinations, the eight tool groups (collapsible) and settings / language / theme at the bottom.
// Phones and tablets never see it (CSS hides it below 1024 px) — their bottom tab bar is unchanged.
// Also: Esc closes the open dialog, and "/" or Ctrl/⌘+K jumps to the search box.
import { state, $, $$, L, esc, go, store, saveSettings, activeMember, displayName, BRAND } from './core.js';
import { icon, iconChip } from './icons.js';
import { GROUPS, TOOLS, TABS } from './tool-registry.js';

const OPEN_KEY = 'kj_side_open';
const TAB_LABEL = { home: ['Today', 'இன்று'], chart: ['My Chart', 'ஜாதகம்'], familyhub: ['Family', 'குடும்பம்'], chat: ['Ask', 'கேள்'], services: ['Services', 'சேவைகள்'] };
const shortName = (t) => L(t.en, t.ta).split(' — ')[0].split(' (')[0];
const desktop = () => window.matchMedia?.('(min-width: 1024px)').matches;

let aside;

function tabIcon(id) {
  // Same icons as the bottom tab bar (one source of truth: index.html).
  const svg = document.querySelector(`.tabbar button[data-tab="${id}"] .ti`)?.innerHTML || '';
  return `<span class="sn-ic" aria-hidden="true">${svg}</span>`;
}

function render() {
  if (!aside) return;
  const openSet = new Set(store.get(OPEN_KEY, ['today']) || []);
  const m = activeMember();
  const dark = document.documentElement.dataset.theme === 'dark';
  const searchVal = $('#snSearch', aside)?.value || '';
  aside.innerHTML = `
    <button type="button" class="sn-skip" id="snSkip">${L('Skip to content', 'உள்ளடக்கத்திற்குச் செல்')}</button>
    <div class="sn-head">
      <button class="sn-brand" type="button" data-sn-go="home" aria-label="${esc(`${BRAND.nameTa} · ${BRAND.nameUpper} — ${L('Today', 'இன்று')}`)}">
        <img src="logo.svg" alt="" width="40" height="40" decoding="async" />
        <span class="sn-brand-txt"><span class="sn-name">${esc(BRAND.nameTa)} <span class="sn-latin">${esc(BRAND.nameUpper)}</span></span>
        <span class="sn-tag">${esc(L('Your life’s companion', 'வாழ்வின் வழித்துணை'))}</span></span>
      </button>
      <div class="sn-search" role="search">${icon('search', { size: 18 })}
        <label class="sr-only" for="snSearch">${L('Search tools', 'கருவிகளைத் தேடு')}</label>
        <input id="snSearch" type="search" autocomplete="off" spellcheck="false" enterkeyhint="search" value="${esc(searchVal)}" placeholder="${esc(L('Search tools…', 'கருவிகளைத் தேடு…'))}" />
        <kbd class="sn-kbd" aria-hidden="true">/</kbd>
      </div>
    </div>
    <nav class="sn-scroll" aria-label="${esc(L('Main', 'முதன்மை'))}">
      <div class="sn-tabs">${TABS.map((id) => `<button type="button" class="sn-item sn-tab" data-sn-go="${id}" data-sn-tab="${id}">${tabIcon(id)}<span>${L(...TAB_LABEL[id])}</span></button>`).join('')}</div>
      <div class="sn-label">${L('All tools', 'அனைத்து கருவிகள்')}</div>
      ${GROUPS.map((g) => `<details class="sn-group" data-group="${g.id}"${openSet.has(g.id) ? ' open' : ''}>
        <summary><span>${esc(L(g.en, g.ta))}</span>${icon('chevron-right', { size: 16, cls: 'sn-chev' })}</summary>
        <div class="sn-list">${TOOLS.filter((t) => t.group === g.id).map((t) => `<button type="button" class="sn-item sn-tool" data-sn-go="${t.id}" title="${esc(L(t.en, t.ta))}">${iconChip(t.id, { size: 15, cls: 'sn-chip' })}<span>${esc(shortName(t))}</span></button>`).join('')}</div>
      </details>`).join('')}
    </nav>
    <div class="sn-foot">
      <button type="button" class="sn-item sn-profile" data-sn-go="more">
        <span class="avatar sm" aria-hidden="true">${m ? esc(([...displayName(m)][0] || '').toUpperCase()) : icon('user', { size: 16 })}</span>
        <span class="sn-pt"><b>${m ? esc(displayName(m)) : L('Add your details', 'உங்கள் விவரம்')}</b><small>${L('Settings & account', 'அமைப்புகள் & கணக்கு')}</small></span>
        ${icon('settings', { size: 18, cls: 'sn-gear' })}
      </button>
      <div class="sn-row">
        <button type="button" class="sn-pill" id="snLang" aria-label="${esc(L('Change language to Tamil', 'Change language to English'))}">${L('தமிழ்', 'English')}</button>
        <button type="button" class="sn-pill" id="snTheme" aria-pressed="${dark}" aria-label="${esc(dark ? L('Switch to light theme', 'வெளிர் தோற்றம்') : L('Switch to dark theme', 'இருண்ட தோற்றம்'))}">${icon(dark ? 'sun' : 'moon', { size: 18 })}<span>${dark ? L('Light', 'வெளிர்') : L('Dark', 'இருள்')}</span></button>
      </div>
    </div>`;
  highlight();
}

function highlight() {
  if (!aside) return;
  const tab = document.querySelector('.tabbar button.active')?.dataset.tab || null;
  $$('[data-sn-tab]', aside).forEach((b) => {
    b.classList.toggle('on', b.dataset.snTab === tab);
    if (b.dataset.snTab === state.view) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  $$('.sn-tool', aside).forEach((b) => { const on = b.dataset.snGo === state.view; b.classList.toggle('on', on); if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  // Open the group of the screen being shown (once), so the person sees where they are.
  const t = TOOLS.find((x) => x.id === state.view);
  const d = t && $(`.sn-group[data-group="${t.group}"]`, aside);
  if (d && !d.open) { d.open = true; }
}

function searchTo(q) {
  const input = $('#snSearch', aside);
  if (state.view === 'tools') {
    const box = $('#toolSearch');
    if (box) { box.value = q; box.dispatchEvent(new Event('input')); return; }
  }
  go('tools', { q });
  requestAnimationFrame(() => { input?.focus({ preventScroll: true }); });
}

function bind() {
  aside.addEventListener('click', (e) => {
    const b = e.target.closest('[data-sn-go]');
    if (b) { const s = $('#snSearch', aside); if (s && b.dataset.snGo !== 'tools') s.value = ''; go(b.dataset.snGo); return; }
    if (e.target.closest('#snLang')) { $('#langBtn')?.click(); return; }
    if (e.target.closest('#snSkip')) {
      const v = document.querySelector('#views .view:not([hidden])');
      const h = v?.querySelector('h1, h2') || v?.querySelector('button, a[href], input, textarea, select');
      if (h) { if (/^H[12]$/.test(h.tagName)) h.setAttribute('tabindex', '-1'); h.focus(); }
      return;
    }
    if (e.target.closest('#snTheme')) {
      state.themeOverride = null;
      state.settings.theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      saveSettings();
      render();
      if (state.view === 'more') go('more', state.params || {}, { back: true });
    }
  });
  aside.addEventListener('toggle', () => {
    store.set(OPEN_KEY, $$('.sn-group', aside).filter((d) => d.open).map((d) => d.dataset.group));
  }, true);
  aside.addEventListener('input', (e) => { if (e.target.id === 'snSearch') searchTo(e.target.value); });
  aside.addEventListener('keydown', (e) => {
    if (e.target.id !== 'snSearch') return;
    if (e.key === 'Enter') { e.preventDefault(); const first = document.querySelector('#tlResults:not([hidden]) .row'); if (first) first.click(); }
    if (e.key === 'Escape') { e.target.value = ''; e.target.blur(); }
  });
}

export function initDesktopNav() {
  const app = $('#app');
  if (!app || $('.sidenav', app)) return;
  aside = document.createElement('aside');
  aside.className = 'sidenav';
  aside.setAttribute('aria-label', L('Thunai navigation', 'துணை வழிசெலுத்தல்'));
  app.prepend(aside);
  render();
  bind();
  document.addEventListener('kj:screen', highlight);
  document.addEventListener('kj:lang', () => { aside.setAttribute('aria-label', L('Thunai navigation', 'துணை வழிசெலுத்தல்')); render(); });
  // Theme can also change in Settings or with the phone/OS setting.
  new MutationObserver(() => render()).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  // Family member changes (name on the profile button)
  document.addEventListener('kj:screen', () => { const b = $('.sn-profile b', aside); const m = activeMember(); if (b && m) b.textContent = displayName(m); });
}

// ---- Keyboard: Esc closes the top dialog; "/" or Ctrl/⌘+K focuses search (desktop), else opens the launcher.
if (typeof document !== 'undefined') {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !e.defaultPrevented) {
      const modals = [...document.querySelectorAll('.modal')].filter((x) => !x.classList.contains('res-modal'));
      const top = modals.at(-1);
      if (top) { top.remove(); e.preventDefault(); }
      return;
    }
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '') || document.activeElement?.isContentEditable;
    const k = (e.key === '/' && !typing) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k');
    if (!k || document.querySelector('.modal, .cc-sheet')) return;
    e.preventDefault();
    const s = desktop() && $('#snSearch');
    if (s) { s.focus(); s.select(); } else go('tools', { focus: true });
  });
}
