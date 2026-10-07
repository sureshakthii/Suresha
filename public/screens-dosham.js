// Dosham & Nivarthi: the card on the Full Jathaga Analysis screen and the dedicated "dosham" screen
// (நிபுணர் பார்வை — the expert view). The reading itself comes from shared/dosham.js; this file only draws it.
// Faith first: another faith sees own-faith practice; the Hindu sthalams stay behind a closed "optional" panel.
// Age first: a child sees a short prayer-and-habits note, never a dosham.
import { diagnoseDoshams, nivarthiPlan, expertView, yatraIds, SEVERITY, AREAS, AVOID, FRAMING } from './shared/dosham.js';
import { faithOf, isHinduFaith, TRADITIONAL_OPTIONAL } from './shared/faith.js';
import { ageProfile } from './shared/age-guard.js';
import { hymnText } from './hymn-links.js';
import { state, $, $$, L, esc, bi, activeMember, chartOf, registerScreen, go, subHeader, speak, displayName, copyright } from './core.js';

const SEV_TAG = { mild: 'good', moderate: 'warn', strong: 'bad' };
/** The diagnosis for a family member (memoised in the engine per day). */
export function doshamFor(m, now = new Date()) {
  const c = chartOf(m);
  const prof = ageProfile(m, { tz: state.loc?.tz });
  return { c, prof, faith: faithOf(m), diag: diagnoseDoshams(c, { now, minor: prof.minor, age: prof.age }) };
}

function sthalamButtons(plan) {
  if (!plan.sthalams.length) return '';
  return `<div class="dz-sthalams">${plan.sthalams.slice(0, 4).map((s, i) => `<div class="dz-st">
      <button class="chip-btn" data-dtemple="${esc(s.id)}">🛕 ${esc(bi(s.name))}</button>
      ${i < 2 ? `<p class="small">${esc(bi(s.why))} <span class="muted">— ${esc(bi(s.todo))}</span></p>` : ''}</div>`).join('')}</div>`;
}

function planHtml(it, plan, faith) {
  const hindu = isHinduFaith(faith);
  const rows = [];
  if (hindu) {
    rows.push(sthalamButtons(plan));
    if (plan.day) rows.push(`<p class="small">📅 <b>${L('Best day / time', 'சிறந்த நாள் / நேரம்')}:</b> ${esc(bi(plan.day))}</p>`);
    rows.push(`<p class="small">⏳ <b>${L('Best period', 'சிறந்த காலம்')}:</b> ${esc(bi(plan.period))}</p>`);
    for (const h of plan.home.slice(0, 2)) rows.push(`<p class="small">🪔 <b>${L('At home (free)', 'வீட்டில் (இலவசம்)')}:</b> ${hymnText(bi(h.text))}</p>`);
  } else {
    for (const u of plan.universal) rows.push(`<p class="small">🤲 ${esc(bi(u))}</p>`);
    rows.push(`<p class="small">⏳ <b>${L('Best period', 'சிறந்த காலம்')}:</b> ${esc(bi(plan.period))}</p>`);
  }
  if (plan.charity.length) rows.push(`<p class="small">🎁 <b>${L('Charity (daanam)', 'தானம்')}:</b> ${plan.charity.map((c) => esc(bi(c))).join(' ')}</p>`);
  if (plan.doctor) rows.push(`<p class="small note-box">🩺 ${esc(bi(plan.doctor))}</p>`);
  if (hindu && plan.yatra.length) rows.push(`<button class="chip-btn" data-dyatra="${esc(plan.yatra.join(','))}">🧭 ${L('Plan this parigara yatra', 'இந்தப் பரிகார யாத்திரையைத் திட்டமிடு')}</button>`);
  if (!hindu) {
    const st = nivarthiPlan(it, { faith: 'hindu' }).sthalams;
    if (st.length) rows.push(`<details class="disclose"><summary>${L('Traditional Hindu sthalams (optional)', 'இந்து மரபுப் பரிகாரத் தலங்கள் (விருப்பம்)')}</summary><p class="small muted">${esc(bi(TRADITIONAL_OPTIONAL))}</p><p class="small">${st.slice(0, 3).map((s) => esc(bi(s.name))).join(' · ')}</p></details>`);
  }
  return rows.join('');
}

function itemHtml(it, faith, open) {
  const plan = nivarthiPlan(it, { faith });
  const t = it.timing || {};
  return `<details class="dz-item"${open ? ' open' : ''}><summary>
      <span class="dz-head"><b>${esc(bi(it.name))}</b>
        <span class="tag ${SEV_TAG[it.severity]}">${esc(bi(SEVERITY[it.severity]))}</span>
        ${t.activeNow ? `<span class="tag warn">${L('Active now', 'இப்போது நடப்பில்')}</span>` : ''}
        ${it.disputed ? `<span class="pill">${L('traditional; some astrologers differ', 'மரபு வழக்கு; சிலர் ஏற்பதில்லை')}</span>` : ''}</span>
      <span class="small dz-cond">${esc(bi(it.condition))}</span>
      <span class="dz-areas">${it.areas.map((a) => `<span class="pill">${esc(bi(AREAS[a]))}</span>`).join('')}</span></summary>
    <div class="dz-body">
      ${it.facts.length ? `<p class="small">🔎 ${it.facts.map((f) => esc(bi(f))).join(' · ')}</p>` : ''}
      ${it.cancellations.length ? `<p class="small">🌿 <b>${L('What softens it', 'குறைப்பவை')}:</b> ${it.cancellations.map((c) => esc(bi(c))).join(' · ')}</p>` : ''}
      ${t.text ? `<p class="small">⏳ ${esc(bi(t.text))}</p>` : ''}
      ${it.traditionNote ? `<p class="small muted">${esc(bi(it.traditionNote))}</p>` : ''}
      <div class="mini-label">🪔 ${L('Nivarthi', 'நிவர்த்தி')}</div>
      ${planHtml(it, plan, faith)}
    </div></details>`;
}

/**
 * The "Doshams & remedies" card. opts.full: every item open-able + avoid list (dosham screen);
 * otherwise the analysis card: main doshams, lighter notes collapsed, and a link to the expert view.
 */
export function doshamCardHtml(m, { full = false, now = new Date() } = {}) {
  const { diag, faith } = doshamFor(m, now);
  const title = `<div class="card-title"><span>🛡️ ${L('Doshams & remedies', 'தோஷங்கள் & நிவர்த்தி')}</span>${full ? '' : `<button class="link-btn" data-go="dosham">${L('Expert view', 'நிபுணர் பார்வை')} ›</button>`}</div>`;
  if (!diag.available) return `<div class="card glass dosham-card">${title}<p class="small">${L('Birth details are needed.', 'பிறப்பு விவரம் தேவை.')}</p></div>`;
  if (diag.minor) {
    return `<div class="card glass dosham-card">${title}<p class="small">${L('For children Thunai does not read doshams.', 'குழந்தைகளுக்குத் துணை தோஷம் பார்ப்பதில்லை.')} ${esc(bi(diag.childNote))}</p></div>`;
  }
  const main = diag.items.filter((x) => x.severity !== 'mild');
  const light = diag.items.filter((x) => x.severity === 'mild');
  const ids = yatraIds(diag, { faith });
  return `<div class="card glass dosham-card" id="doshamCard">${title}
    <p class="dz-frame"><b>${esc(bi(FRAMING.notCurse))}</b></p>
    ${diag.items.length ? '' : `<p class="small">${L('By the common traditional rules no notable dosham stands out in this chart.', 'பொது மரபு விதிகளின்படி இந்த ஜாதகத்தில் குறிப்பிடத்தக்க தோஷம் எதுவும் இல்லை.')}</p>`}
    ${main.map((it, i) => itemHtml(it, faith, i === 0)).join('')}
    ${light.length ? (full ? `<div class="mini-label">${L('Lighter notes', 'லேசான குறிப்புகள்')}</div>${light.map((it) => itemHtml(it, faith, false)).join('')}`
    : `<details class="disclose"><summary>${L(`Lighter notes (${light.length})`, `லேசான குறிப்புகள் (${light.length})`)}</summary>${light.map((it) => itemHtml(it, faith, false)).join('')}</details>`) : ''}
    ${diag.needsTime.length ? `<p class="small muted needs-time">🕰️ ${L('Lagna-based doshams need the birth time', 'லக்ன அடிப்படையிலான தோஷங்களுக்குப் பிறந்த நேரம் தேவை')}: ${diag.needsTime.slice(0, 6).map((n) => esc(bi(n))).join(', ')}</p>` : ''}
    ${ids.length ? `<button class="btn-gold" data-dyatra="${esc(ids.join(','))}">🧭 ${L('Plan this parigara yatra', 'இந்தப் பரிகார யாத்திரையைத் திட்டமிடு')}</button>` : ''}
    ${full ? `<div class="mini-label">🚫 ${L('What not to do', 'செய்ய வேண்டாதவை')}</div><ul class="small dz-avoid">${AVOID.map((a) => `<li>${esc(bi(a))}</li>`).join('')}</ul>` : ''}
    <p class="muted small">${esc(bi(FRAMING.belief))} ${esc(bi(FRAMING.review))}</p></div>`;
}

/** Wire the temple, yatra and expert-view buttons inside `root`. */
export function bindDosham(root) {
  $$('[data-dtemple]', root).forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); go('temples', { temple: b.dataset.dtemple }); }));
  $$('[data-dyatra]', root).forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); go('journey', { temples: b.dataset.dyatra.split(',').filter(Boolean) }); }));
}

// ================================================================ the dedicated screen
function renderDosham(sec) {
  const m = activeMember();
  const { diag, faith } = doshamFor(m);
  const ev = expertView(diag, { name: displayName(m), faith });
  sec.innerHTML = `${subHeader(L('Doshams & Nivarthi', 'தோஷங்கள் & நிவர்த்தி'), esc(displayName(m)), 'analysis')}
    <div class="card glass dz-expert" id="dzExpert"><div class="card-title"><span>🧘 ${esc(bi(ev.title))}</span><button class="link-btn" id="dzSpeak" aria-label="${esc(L('Read aloud', 'சத்தமாக வாசி'))}">🔊</button></div>
      ${ev.paras.map((p) => `<p>${esc(bi(p))}</p>`).join('')}</div>
    ${doshamCardHtml(m, { full: true })}
    <div class="btn-row"><button class="chip-btn" data-go="parigaram">🪔 ${L('Daily parigaram', 'தினசரி பரிகாரம்')}</button><button class="chip-btn" data-dask="1">💬 ${L('Ask Thunai about this', 'இதைப் பற்றித் துணையிடம் கேளுங்கள்')}</button></div>
    ${copyright()}`;
  bindDosham(sec);
  $('#dzSpeak')?.addEventListener('click', () => speak($('#dzExpert').innerText.replace(/🔊|🧘/g, '')));
  $('[data-dask]', sec)?.addEventListener('click', () => go('chat', { q: L('What dosham do I have, and what is the parigaram?', 'எனக்கு என்ன தோஷம் இருக்கிறது, பரிகாரம் என்ன?') }));
}
registerScreen('dosham', { render: renderDosham, parent: 'analysis', needsMember: true });
