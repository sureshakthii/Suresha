// Festivals & Vratham (விழாக்கள் & விரதங்கள்): the next 365 days for the person's place, month by month,
// with filter chips, and a detail page per festival — why, story, how, mantra (read aloud), temples, reminders.
// All dates and text come from shared/spiritual-kb.js (offline, deterministic).
import { festivalCalendar, getEntry, entrySections, nextOccurrences, fmtDay } from './shared/spiritual-kb.js';
import { WEEKDAYS } from './shared/astro.js';
import { TAMIL_MONTHS } from './shared/tamilcal.js';
import { MANTRAS } from './shared/mantras.js';
import { state, $, $$, L, ta, esc, bi, go, registerScreen, subHeader, speak, placeName, monthName, activeMember } from './core.js';
import { remindBtn } from './remind.js';
import { faithOf } from './shared/faith.js';
import { hymnText } from './hymn-links.js';
import { icon } from './icons.js';

const FILTERS = [
  { id: 'all', en: 'All', ta: 'அனைத்தும்' },
  { id: 'festival', en: 'Festivals', ta: 'பண்டிகைகள்' },
  { id: 'vratham', en: 'Vratham', ta: 'விரதங்கள்' },
  { id: 'monthly', en: 'Monthly days', ta: 'மாதாந்திர நாட்கள்' },
];
const ui = { filter: 'all' };
const cache = new Map(); // place|day -> rows
const LOADER = '<div class="loader"><i></i><i></i><i></i></div>';
const tz = () => state.loc?.tz ?? 5.5;
const lang = () => (ta() ? 'ta' : 'en');
const todayIso = () => new Date(Date.now() + tz() * 3600000).toISOString().slice(0, 10);
const localAt = (iso, hm) => { const [y, mo, d] = iso.split('-').map(Number); const [h, mi] = hm.split(':').map(Number); return new Date(Date.UTC(y, mo - 1, d, h, mi) - tz() * 3600000); };
const locKey = () => `${state.loc.lat.toFixed(3)}|${state.loc.lon.toFixed(3)}|${tz()}|${todayIso()}`;
const viewerFaith = () => { const m = activeMember(); return m && m.relation !== 'organization' ? faithOf(m) : 'hindu'; };
const kindOf = (row) => (row.kind === 'festival' ? 'festival' : row.kind === 'vratham' ? 'vratham' : 'monthly');
const KIND_ICON = { festival: '🪔', vratham: '🙏', monthly: '🌙' };

function rowsNow() {
  const key = locKey();
  if (!cache.has(key)) {
    cache.clear();
    cache.set(key, festivalCalendar({ from: new Date(), days: 365, loc: { lat: state.loc.lat, lon: state.loc.lon, name: state.loc.name }, tz: tz() }));
  }
  return cache.get(key);
}

function render(sec, params = {}) {
  // List and detail share one screen id, so go() keeps the scroll position — start each page at the top.
  if (params.id !== render.last) scrollTo({ top: 0 });
  render.last = params.id;
  if (params.id && getEntry(params.id)) { renderDetail(sec, params.id); return; }
  sec.innerHTML = `${subHeader(L('Festivals & Vratham', 'விழாக்கள் & விரதங்கள்'), L('The next 365 days — why, how and when', 'அடுத்த 365 நாட்கள் — ஏன், எப்படி, எப்போது'))}
    <div class="card glass fx-top">
      <div class="member-switch fx-filter" role="tablist">${FILTERS.map((f) => `<button class="mchip${ui.filter === f.id ? ' sel' : ''}" role="tab" aria-selected="${ui.filter === f.id}" data-fx-filter="${f.id}">${esc(bi(f))}<span class="fx-count" data-fx-count="${f.id}"></span></button>`).join('')}</div>
      <p class="muted small">📍 ${esc(placeName(state.loc?.name || ''))} · ${L('dates by sunrise at your place; almanacs may differ by a day', 'உங்கள் ஊர் சூரிய உதயப்படி; பஞ்சாங்கங்களில் ஒரு நாள் மாறலாம்')}</p>
    </div>
    <div id="fxList"><div class="card glass">${LOADER}<p class="muted center">${L('Calculating the year…', 'ஆண்டு கணிக்கப்படுகிறது…')}</p></div></div>`;
  $$('[data-fx-filter]', sec).forEach((b) => b.addEventListener('click', () => {
    ui.filter = b.dataset.fxFilter;
    $$('[data-fx-filter]', sec).forEach((x) => { const on = x === b; x.classList.toggle('sel', on); x.setAttribute('aria-selected', on); });
    draw(sec);
  }));
  // Let the loader paint before the year is computed (≈ 0.5–1 s on a phone the first time).
  setTimeout(() => { if (state.view === 'festivals' && sec.isConnected) draw(sec); }, 30);
}

function draw(sec) {
  const box = $('#fxList', sec);
  if (!box) return;
  const rows = rowsNow();
  for (const f of FILTERS) {
    const el = $(`[data-fx-count="${f.id}"]`, sec);
    if (el) el.textContent = ` · ${f.id === 'all' ? rows.length : rows.filter((r) => kindOf(r) === f.id).length}`;
  }
  const list = rows.filter((r) => ui.filter === 'all' || kindOf(r) === ui.filter);
  const months = new Map();
  for (const r of list) { const k = r.date.slice(0, 7); if (!months.has(k)) months.set(k, []); months.get(k).push(r); }
  const today = todayIso();
  let html = '';
  for (const [ym, items] of months) {
    const [y, m] = ym.split('-').map(Number);
    html += `<section class="card glass fx-month" aria-label="${esc(`${monthName(m - 1)} ${y}`)}"><div class="card-title"><span>${esc(monthName(m - 1))} ${y}</span><span class="pill">${items.length}</span></div>
      ${items.map((r) => {
        const d = Number(r.date.slice(8));
        const wd = WEEKDAYS[r.weekday];
        const name = r.sub ? `${bi(r.names)} — ${bi(r.sub.names)}` : bi(r.names);
        const range = r.end && r.end !== r.date ? ` → ${fmtDay(r.end, lang(), { weekday: false, year: false })}` : '';
        return `<button type="button" class="fx-row${r.date === today ? ' today' : ''}" data-fx-id="${esc(r.id)}">
          <span class="fx-date"><b>${d}</b><small>${esc(ta() ? wd.ta : wd.en.slice(0, 3))}</small></span>
          <span class="fx-tx"><b>${KIND_ICON[kindOf(r)]} ${esc(name)}</b>${range ? `<small class="fx-range">${esc(range)}</small>` : ''}<span>${esc(bi(r.line))}</span>
          <small class="muted">${esc(bi(TAMIL_MONTHS[r.solar.month]))} ${r.solar.day}${r.date === today ? ` · ${L('today', 'இன்று')}` : ''}</small></span>
          <span class="fx-go" aria-hidden="true">›</span></button>`;
      }).join('')}</section>`;
  }
  box.innerHTML = html || `<div class="card glass"><p class="muted">${L('Nothing in this filter.', 'இந்த வகையில் எதுவும் இல்லை.')}</p></div>`;
  $$('[data-fx-id]', box).forEach((b) => b.addEventListener('click', () => go('festivals', { id: b.dataset.fxId })));
}

function renderDetail(sec, id) {
  const e = getEntry(id);
  const lg = lang();
  const faith = viewerFaith();
  const rows = rowsNow().filter((r) => r.id === id).slice(0, e.kind === 'monthly' ? 4 : 3);
  const upcoming = rows.length ? rows : nextOccurrences(id, { from: new Date(), count: 3, loc: { lat: state.loc.lat, lon: state.loc.lon }, tz: tz() }).map((o) => ({ ...o, end: o.end || null }));
  const dateHtml = upcoming.length ? upcoming.map((r) => {
    const title = `${bi(e.names)} — ${fmtDay(r.date, lg, { year: false })}`;
    return `<div class="fx-when"><span>📅 <b>${esc(fmtDay(r.date, lg))}</b>${r.end && r.end !== r.date ? ` → ${esc(fmtDay(r.end, lg))}` : ''}${r.sub ? ` · ${esc(bi(r.sub.names))}` : ''}</span>
      ${remindBtn({ title, at: localAt(r.date, '06:00'), place: state.loc?.name || '', label: L('Remind', 'நினைவூட்டு') })}</div>`;
  }).join('') : `<p class="muted small">${L('Not a fixed-date day — see below.', 'நிலையான தேதி இல்லை — கீழே பாருங்கள்.')}</p>`;
  const sections = entrySections(e, lg, { faith });
  const mantra = e.mantra ? MANTRAS.find((m) => m.id === e.mantra) : null;
  const spoken = mantra ? (ta() ? mantra.text : mantra.translit) : e.chant ? (ta() ? e.chant.text : e.chant.translit) : '';
  const body = sections.map((s) => {
    if (s.key === 'temples') {
      return `<div class="card glass"><div class="card-title"><span>🛕 ${esc(s.title)}</span></div><div class="btn-row">${(e.temples || []).slice(0, 4).map((tid, i) => (s.lines[i] ? `<button class="chip-btn" data-fx-temple="${esc(tid)}">${esc(s.lines[i].split(' — ')[0])}</button>` : '')).join('')}</div></div>`;
    }
    if (s.key === 'mantra') {
      return `<div class="card glass fx-mantra"><div class="card-title"><span>🕉️ ${esc(s.title)}</span>${spoken ? `<button class="chip-btn" id="fxSpeak" aria-label="${esc(L('Read aloud', 'வாசித்துக் காட்டு'))}">${icon('volume-2', { size: 16 })} ${L('Listen', 'கேளுங்கள்')}</button>` : ''}</div>
        ${s.lines.map((l, i) => `<p class="${i === 0 ? 'fx-chant' : 'small muted'}">${esc(l)}</p>`).join('')}</div>`;
    }
    const isList = s.lines.length > 1;
    return `<div class="card glass fx-sec fx-${esc(s.key)}"><div class="card-title"><span>${esc(s.title)}</span></div>
      ${isList ? `<ul class="fx-list">${s.lines.map((l) => `<li>${hymnText(l)}</li>`).join('')}</ul>` : `<p>${hymnText(s.lines[0] || '')}</p>`}</div>`;
  }).join('');
  sec.innerHTML = `${subHeader(bi(e.names), bi(e.line), 'festivals')}
    <div class="card glass fx-head">
      ${e.deity ? `<p class="small"><b>${L('Deity', 'தெய்வம்')}:</b> ${esc(bi(e.deity))}</p>` : ''}
      ${dateHtml}
      ${e.ruleText ? `<p class="small muted">${L('How the date is fixed', 'தேதி கணிப்பு')}: ${esc(bi(e.ruleText))}</p>` : ''}
    </div>
    ${body}
    <div class="card glass"><div class="btn-row">
      <button class="chip-btn" id="fxAsk">💬 ${L('Ask Thunai about this', 'இது பற்றித் துணையிடம் கேளுங்கள்')}</button>
      <button class="chip-btn" id="fxBack">📅 ${L('All festivals', 'எல்லா விழாக்களும்')}</button>
    </div><p class="small muted">${L('Traditional / puranic accounts — practices vary by family and region.', 'மரபு / புராணச் செய்திகள் — குடும்பம், பகுதிக்கு ஏற்ப வழக்கங்கள் மாறலாம்.')}</p></div>`;
  $('#fxSpeak', sec)?.addEventListener('click', () => speak(spoken, { rate: 0.8 }));
  $$('[data-fx-temple]', sec).forEach((b) => b.addEventListener('click', () => go('temples', { temple: b.dataset.fxTemple })));
  $('#fxAsk', sec).addEventListener('click', () => go('chat', { q: ta() ? `${e.names.ta} ஏன், எப்படி?` : `Why and how is ${e.names.en} observed?` }));
  $('#fxBack', sec).addEventListener('click', () => go('festivals'));
}

registerScreen('festivals', { render, parent: 'home', needsLoc: true });
