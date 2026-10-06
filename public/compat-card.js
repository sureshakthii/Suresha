// "உங்களுக்கு சாதகமானவர்கள்" (who suits you) card — Today and My Chart.
// The method lives in shared/compat.js; this file only renders it. Compact by default (tap to expand), one tab per
// section (friends / study, business, marriage, planets), positive wording only.
import { compatibility } from './shared/compat.js';
import { ageProfile } from './shared/age-guard.js';
import { state, $$, L, esc, bi, store, chartOf, displayName, GLYPH, COLOR } from './core.js';

const ICON = { friends: '🤝', study: '📚', business: '💼', marriage: '💍', planets: '🪐' };
const TAB_LABEL = {
  friends: ['Friends', 'நண்பர்கள்'], study: ['Friends', 'நண்பர்கள்'], business: ['Business', 'வணிகம்'],
  marriage: ['Marriage', 'திருமணம்'], planets: ['Planets', 'கிரகம்'],
};

function starList(s) {
  if (!s.stars.length) return s.note ? `<p class="small muted">${esc(bi(s.note))}</p>` : '';
  return `<ol class="cp-stars">${s.stars.map((x) => `<li><b>${esc(bi(x))}${x.rasi ? ` <span class="cp-r">(${esc(bi(x.rasi))})</span>` : ''}</b><span>${esc(bi(x.reason))}</span></li>`).join('')}</ol>
    ${s.rasis.length ? `<div class="cp-sub">${L('Rasis', 'ராசிகள்')}</div><ul class="cp-rasis">${s.rasis.map((r) => `<li><b>${esc(bi(r))}</b><span>${esc(bi(r.reason))}</span></li>`).join('')}</ul>` : ''}
    ${s.stars.length && s.note ? `<p class="small muted">${esc(bi(s.note))}</p>` : ''}`;
}

function planetPane(pl) {
  return `${pl.reference === 'moon' ? `<p class="small muted">${L('Birth time not exact — read from the Moon sign (Chandra Lagna).', 'பிறந்த நேரம் துல்லியமில்லை — சந்திர லக்னப்படி.')}</p>` : ''}
    <ul class="cp-planets">${pl.planets.map((p) => `<li><span class="cp-g" style="color:${COLOR[p.planet]}">${GLYPH[p.planet]}</span><span><b>${esc(bi(p.name))}</b> · <span class="small">${esc(bi(p.label))}</span>
      <span class="cp-tip">${p.colour ? `<i class="cp-dot" style="background:${esc(p.colour.hex)}"></i>${esc(bi(p.colour))}` : ''}${p.day ? ` · ${esc(bi(p.day))}` : ''}${p.number ? ` · ${L('No.', 'எண்')} ${p.number}` : ''}</span></span></li>`).join('')}</ul>
    ${pl.luckyNumbers?.length ? `<p class="small">🔢 ${L('Lucky numbers', 'அதிர்ஷ்ட எண்கள்')}: <b>${pl.luckyNumbers.join(', ')}</b></p>` : ''}`;
}

/**
 * Card HTML for one family member (empty for a company / team or when the chart cannot be read).
 * opts.uncertain — the birth star is not certain (time unknown on a star-change day): adds a gentle note.
 * opts.open — start expanded (My Chart); Today starts collapsed.
 */
export function compatCardHtml(m, { open = false, uncertain = false, idPrefix = 'cp' } = {}) {
  if (!m || m.relation === 'organization') return '';
  let r;
  try { r = compatibility(chartOf(m), { gender: m.gender, profile: ageProfile(m, { tz: state.loc?.tz }) }); } catch { return ''; }
  const tabs = [...r.sections.filter((s) => s.stars.length || s.note), { key: 'planets' }];
  const saved = store.get('kj_compat_tab', null);
  const cur = tabs.some((t) => t.key === saved) ? saved : tabs[0].key;
  const first = r.sections[0];
  const preview = first?.stars.length ? first.stars.slice(0, 3).map((x) => bi(x)).join(' · ') : r.planets.planets.map((p) => bi(p.name)).join(' · ');
  return `<section class="card glass compat-card" aria-labelledby="${idPrefix}Title">
    <details class="cp-det"${open ? ' open' : ''}><summary>
      <span class="cp-head"><span id="${idPrefix}Title" class="cp-title">🤝 ${L('People who suit you', 'உங்களுக்கு சாதகமானவர்கள்')}</span>
        <span class="cp-prev">⭐ ${esc(bi(r.person.star))} · ${esc(bi(r.person.rasi))} → ${esc(preview)}</span></span>
      <span class="cp-more" aria-hidden="true">›</span></summary>
      <p class="small muted cp-lead">${esc(displayName(m))} — ${L('from the birth star and rasi (Tara bala, rasi friendship', 'பிறந்த நட்சத்திரம், ராசிப்படி (தாரா பலம், ராசி நட்பு')}${r.adult ? L(', 10 poruthams)', ', 10 பொருத்தம்)') : ')'}.</p>
      ${uncertain ? `<p class="small cp-warn">${L('The birth star is not certain for this birth time — treat this as approximate.', 'இந்தப் பிறந்த நேரத்திற்கு நட்சத்திரம் உறுதியில்லை — தோராயமாகக் கொள்ளவும்.')}</p>` : ''}
      <div class="cp-tabs" role="tablist">${tabs.map((t) => `<button type="button" role="tab" class="cp-tab${t.key === cur ? ' sel' : ''}" aria-selected="${t.key === cur}" data-cptab="${t.key}">${ICON[t.key]} ${L(...TAB_LABEL[t.key])}</button>`).join('')}</div>
      ${tabs.map((t) => `<div class="cp-pane" role="tabpanel" data-cppane="${t.key}"${t.key === cur ? '' : ' hidden'}>
        ${t.key === 'planets' ? `<div class="cp-sub">${L('Favourable planets', 'சாதகமான கிரகம்')}</div>${planetPane(r.planets)}` : `<div class="cp-sub">${esc(bi(t.title))}</div>${starList(t)}`}</div>`).join('')}
      <p class="small muted cp-foot">🌱 ${r.adult ? L('Stars are a gentle guide — kindness, trust and shared values matter most.', 'நட்சத்திரம் ஒரு மென்மையான வழிகாட்டல் — அன்பு, நம்பிக்கை, ஒத்த மதிப்புகளே முக்கியம்.') : L('Good friends are found through kindness and good habits — stars are only a gentle guide.', 'நல்ல நண்பர்கள் அன்பாலும் நல்ல பழக்கத்தாலும் அமைவர் — நட்சத்திரம் ஒரு வழிகாட்டல் மட்டுமே.')}</p>
    </details></section>`;
}

/** Wire the tabs of every compat card inside `root`. */
export function bindCompatCard(root) {
  $$('.compat-card', root).forEach((card) => {
    $$('[data-cptab]', card).forEach((b) => b.addEventListener('click', () => {
      const k = b.dataset.cptab;
      store.set('kj_compat_tab', k);
      $$('[data-cptab]', card).forEach((x) => { x.classList.toggle('sel', x === b); x.setAttribute('aria-selected', String(x === b)); });
      $$('[data-cppane]', card).forEach((p) => { p.hidden = p.dataset.cppane !== k; });
    }));
  });
}
