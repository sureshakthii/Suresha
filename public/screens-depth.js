// Depth screen (வர்க்க கட்டங்கள் & அஷ்டகவர்க்கம்): Shodasavarga divisional charts,
// vargottama planets and Ashtakavarga (Sarva + Bhinna) with house-wise insights.
import { RASIS } from './shared/astro.js';
import { VARGAS, vargaChart, vargaRasi, vargottama, savInsights, AV_PLANETS } from './shared/varga.js';
import {
  state, $, $$, L, ta, esc, bi, GLYPH, COLOR, planetName, rasiName, activeMember, chartOf, registerScreen, subHeader, displayName, saveFamily,
} from './core.js';
import { renderSI } from './screens-main.js';

const SI_POS = { 11: [0, 0], 0: [0, 1], 1: [0, 2], 2: [0, 3], 10: [1, 0], 3: [1, 3], 9: [2, 0], 4: [2, 3], 8: [3, 0], 7: [3, 1], 6: [3, 2], 5: [3, 3] };
const ORDER = ['Lagna', 'Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
let selN = 9;

function injectStyle() {
  if (document.getElementById('kj-depth-style')) return;
  const s = document.createElement('style');
  s.id = 'kj-depth-style';
  s.textContent = `
  .vg-chips { display: flex; flex-wrap: wrap; gap: 6px; margin: 4px 0 10px; }
  .vg-chips .chip-btn.sel { background: rgba(245,194,107,.2); border-color: var(--gold); color: var(--gold2); }
  .sav-cell { flex-direction: column; align-items: center; justify-content: center; }
  .sav-cell b { font-size: 20px; font-variant-numeric: tabular-nums; }
  .sav-cell.strong b { color: var(--good); } .sav-cell.weak b { color: var(--bad); } .sav-cell.average b { color: var(--warn); }
  .sav-cell .hn { position: absolute; top: 2px; left: 4px; font-size: 9px; color: var(--muted); }
  .bav-table td, .bav-table th { text-align: center; padding: 4px 3px; font-variant-numeric: tabular-nums; }
  .bav-table td.hi { color: var(--good); font-weight: 700; } .bav-table td.lo { color: var(--bad); }
  .vg-meaning { margin: 8px 0 0; }`;
  document.head.append(s);
}

const levelTag = (lvl) => `<span class="tag ${lvl === 'strong' ? 'good' : lvl === 'weak' ? 'bad' : 'warn'}">${lvl === 'strong' ? L('Strong', 'பலம்') : lvl === 'weak' ? L('Weak', 'பலவீனம்') : L('Average', 'மத்திமம்')}</span>`;
const vLabel = (v) => (ta() ? v.ta : `D${v.n} · ${v.en}`);
const rasiShort = (i) => (ta() ? RASIS[i].short : RASIS[i].en.slice(0, 3));
const houseWord = (h) => L(`House ${h}`, `${h}-ம் பாவம்`);

function renderSav(el, s) {
  let html = '';
  for (let r = 0; r < 12; r++) {
    const [row, col] = SI_POS[r];
    const h = s.houses.find((x) => x.rasi === r);
    html += `<div class="si-cell sav-cell ${h.level}${r === s.lagna ? ' lagna' : ''}" style="grid-row:${row + 1};grid-column:${col + 1}">
      <span class="hn">${h.house}</span><b>${s.sav[r]}</b><span class="sn">${esc(rasiName(r))}</span></div>`;
  }
  html += `<div class="si-center"><div class="t">${L('Sarva', 'சர்வ')}</div><div class="s">${L('Ashtakavarga', 'அஷ்டகவர்க்கம்')}<br>${L('Total', 'மொத்தம்')} ${s.total}</div></div>`;
  el.innerHTML = html;
}

function render(sec) {
  injectStyle();
  const m = activeMember();
  const c = chartOf(m);
  const v = VARGAS.find((x) => x.n === selN) || VARGAS[0];
  const houses = vargaChart(c, v.n);
  const lagnaV = vargaRasi(c.planets.Lagna.longitude, v.n);
  const vo = vargottama(c);
  const s = savInsights(c);
  const pool = state.family.filter((x) => x.relation !== 'organization');
  const placement = ORDER.filter((k) => c.planets[k]).map((k) => {
    const r = vargaRasi(c.planets[k].longitude, v.n);
    return `<div class="factor"><span style="color:${COLOR[k]}">${GLYPH[k]} ${esc(planetName(k))}</span><b>${esc(rasiName(r))}${r === c.planets[k].rasi && v.n !== 1 ? ` <span class="pill">${L('same as Rasi', 'ராசியிலும் இதே')}</span>` : ''}</b></div>`;
  }).join('');

  sec.innerHTML = `${subHeader(L('Divisional charts & Ashtakavarga', 'வர்க்க கட்டங்கள் & அஷ்டகவர்க்கம்'), L('Sixteen-fold depth of your Jathagam', 'உங்கள் ஜாதகத்தின் ஆழமான பார்வை'), 'chart')}
    ${pool.length > 1 ? `<div class="member-switch">${pool.map((x) => `<button class="mchip${x.id === m.id ? ' sel' : ''}" data-mid="${esc(x.id)}">${esc(displayName(x))}</button>`).join('')}</div>` : ''}
    <div class="card glass">
      <div class="card-title">${L('Divisional chart (Varga)', 'வர்க்க கட்டம்')}</div>
      <div class="vg-chips">${VARGAS.map((x) => `<button class="chip-btn${x.n === v.n ? ' sel' : ''}" data-vn="${x.n}">${esc(vLabel(x))}</button>`).join('')}</div>
      <div id="vargaChart" class="si-chart"></div>
      <p class="vg-meaning"><span class="tag good">${esc(ta() ? v.ta : v.en)}</span> ${esc(bi(v.signifies))}</p>
      <details><summary>${L('Planet placements in this chart', 'இக்கட்டத்தில் கிரக நிலை')}</summary>${placement}</details>
    </div>
    <div class="card glass">
      <div class="card-title">✨ ${L('Vargottama planets', 'வர்க்கோத்தம கிரகங்கள்')}</div>
      ${vo.length ? `<div class="btn-row">${vo.map((k) => `<span class="pill" style="color:${COLOR[k]}">${GLYPH[k]} ${esc(planetName(k))} · ${esc(rasiName(c.planets[k].rasi))}</span>`).join('')}</div>` : `<p class="muted small">${L('No planet is vargottama in this chart.', 'இந்த ஜாதகத்தில் வர்க்கோத்தம கிரகம் இல்லை.')}</p>`}
      <p class="muted small">${L('A planet in the same sign in Rasi and Navamsa is vargottama — it gives steady, reliable results like a planet in its own house.', 'ராசியிலும் நவாம்சத்திலும் ஒரே ராசியில் உள்ள கிரகம் வர்க்கோத்தமம் — சொந்த வீட்டில் உள்ளது போல் உறுதியான பலன் தரும்.')}</p>
    </div>
    <div class="card glass">
      <div class="card-title">🔢 ${L('Ashtakavarga', 'அஷ்டகவர்க்கம்')}</div>
      <div id="savChart" class="si-chart"></div>
      <p class="muted small">${L('Bindus per sign (small number = house from Lagna). 28 or more is strong, 25–27 average, below 25 weak.', 'ஒவ்வொரு ராசிக்கும் பரல்கள் (சிறிய எண் = லக்னத்திலிருந்து பாவம்). 28 அல்லது அதற்கு மேல் பலம், 25–27 மத்திமம், 25-க்குக் கீழ் பலவீனம்.')}</p>
      <div class="factor"><span>${L('Best houses', 'சிறந்த பாவங்கள்')}</span><b class="pos">${s.best.map((h) => houseWord(h)).join(', ')}</b></div>
      <div class="factor"><span>${L('Needs care', 'கவனம் தேவை')}</span><b class="neg">${s.weakest.map((h) => houseWord(h)).join(', ')}</b></div>
    </div>
    <div class="card glass">
      <div class="card-title">🏠 ${L('House-wise strength', 'பாவ வாரியான பலம்')}</div>
      ${s.houses.map((h) => `<div class="factor"><span><b>${houseWord(h.house)}</b> · ${esc(rasiName(h.rasi))}<br><span class="muted small">${esc(bi(h.note))}</span></span><span>${h.bindus} ${levelTag(h.level)}</span></div>`).join('')}
    </div>
    <div class="card glass">
      <div class="card-title">🪐 ${L('Planet Ashtakavarga (Bhinna)', 'கிரக அஷ்டகவர்க்கம் (பின்ன)')}</div>
      <p class="muted small">${esc(bi(s.tip))}</p>
      ${AV_PLANETS.map((p) => `<details class="bhava"><summary><span style="color:${COLOR[p]}">${GLYPH[p]} ${esc(planetName(p))}</span> · ${s.bav[p].reduce((a, b) => a + b, 0)} ${L('bindus', 'பரல்கள்')}</summary>
        <div class="table-wrap"><table class="bav-table"><tr>${s.bav[p].map((_, i) => `<th>${esc(rasiShort(i))}</th>`).join('')}</tr>
        <tr>${s.bav[p].map((b) => `<td class="${b >= 5 ? 'hi' : b <= 2 ? 'lo' : ''}">${b}</td>`).join('')}</tr></table></div>
        <p class="small">${L('Good transit signs', 'நல்ல கோசார ராசிகள்')}: ${s.transit[p].good.map((i) => esc(rasiName(i))).join(', ') || '—'}</p>
        ${s.transit[p].poor.length ? `<p class="muted small">${L('Be careful when it transits', 'இந்த ராசிகளில் சஞ்சரிக்கும்போது கவனம்')}: ${s.transit[p].poor.map((i) => esc(rasiName(i))).join(', ')}</p>` : ''}
      </details>`).join('')}
    </div>`;

  const sub = `${esc(displayName(m))}${ta() ? "" : `<br>D${v.n}`}`;
  renderSI($('#vargaChart', sec), houses, c.planets, lagnaV, ta() ? v.ta : v.en, sub, false);
  renderSav($('#savChart', sec), s);
  $$('[data-vn]', sec).forEach((b) => b.addEventListener('click', () => { selN = Number(b.dataset.vn); render(sec); }));
  $$('.mchip', sec).forEach((b) => b.addEventListener('click', () => { state.activeId = b.dataset.mid; saveFamily(); render(sec); }));
}

registerScreen('vargas', { render, parent: 'chart', needsMember: true });
