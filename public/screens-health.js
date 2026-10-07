// Health screen (ஆரோக்கியம்) — two clearly separated parts (owner checklist §5):
//  1. பொது நலம் / General wellbeing — general, non-astrological habits and age-wise check-ups, each marked
//     "needs medical review" until a clinician signs off. No diagnosis, no treatment, no restrictions.
//  2. மரபுச் சிந்தனை / Traditional reflection (optional) — spiritual practices only (prayer, lamp, mantra, a calm
//     routine) linked to the running Dasa / Bhukti and Gochara. Explicitly not health advice.
import { healthGuide } from './shared/health.js';
import {
  state, $, $$, L, esc, bi, GLYPH, COLOR, planetName, monthName, activeMember, chartOf, registerScreen, subHeader,
  speak, displayName, saveFamily,
} from './core.js';
import { remindBtn } from './remind.js';

const people = () => state.family.filter((m) => m.relation !== 'organization');
const mY = (d) => `${monthName(new Date(d).getUTCMonth())} ${new Date(d).getUTCFullYear()}`;

/** First day of next month, 9 AM in the user's local time zone. */
function nextMonth9am() {
  const tz = state.loc?.tz ?? 5.5;
  const local = new Date(Date.now() + tz * 3600000);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + 1, 1, 9, 0) - tz * 3600000);
}

function injectCss() {
  if (document.getElementById('health-css')) return;
  const s = document.createElement('style');
  s.id = 'health-css';
  s.textContent = `
  .hl-note { border-left: 3px solid var(--warn); background: rgba(var(--gold-rgb), .08); color: var(--text); border-radius: 12px; padding: 10px 12px; font-size: 13px; margin: 0 0 12px; }
  .hl-part { font-size: 16px; margin: 18px 0 8px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .hl-review { font-size: 11px; padding: 2px 8px; border-radius: 999px; border: 1px dashed var(--warn); color: var(--text); white-space: normal; }
  .hl-check { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 8px 0; border-bottom: 1px solid rgba(var(--ink-rgb), .06); font-size: 13px; }
  .hl-check > span { min-width: 0; overflow-wrap: anywhere; }
  .hl-reflect { border-left: 3px solid var(--gold); }
  .hl-reflect > summary { font-size: 15px; color: var(--text); list-style: none; display: flex; justify-content: space-between; gap: 8px; align-items: center; margin: 0; }
  .hl-reflect > summary::-webkit-details-marker { display: none; }
  .hl-reflect[open] > summary { margin-bottom: 8px; }
  .hl-mantra { font-size: 14px; color: var(--gold2); line-height: 1.6; }`;
  document.head.append(s);
}

function renderHealth(sec) {
  injectCss();
  const m = activeMember()?.relation !== 'organization' ? activeMember() : people()[0];
  if (!m) { sec.innerHTML = `${subHeader(L('Health', 'ஆரோக்கியம்'))}<p class="muted center">${L('Add a family member first.', 'முதலில் குடும்ப உறுப்பினரைச் சேர்க்கவும்.')}</p>`; return; }
  sec.innerHTML = `${subHeader(L('Health', 'ஆரோக்கியம்'), L('General wellbeing · optional traditional reflection', 'பொது நலம் · விருப்ப மரபுச் சிந்தனை'))}
    ${people().length > 1 ? `<div class="member-switch">${people().map((x) => `<button class="mchip${x.id === m.id ? ' sel' : ''}" data-hid="${esc(x.id)}">${esc(displayName(x))}</button>`).join('')}</div>` : ''}
    <div id="hlBody"><div class="loader"><i></i><i></i><i></i></div></div>`;
  $$('[data-hid]', sec).forEach((b) => b.addEventListener('click', () => { state.activeId = b.dataset.hid; saveFamily(); renderHealth(sec); }));
  setTimeout(() => { if (state.view === 'health') drawHealth(m); }, 30);
}

function drawHealth(m) {
  const c = chartOf(m);
  const h = healthGuide(c, { gender: m.gender });
  const w = h.wellbeing, r = h.reflection, p = r.period;
  const at = nextMonth9am();
  const review = `<span class="hl-review">⚕️ ${esc(bi(w.reviewLabel))}</span>`;
  const spoken = [
    `${displayName(m)}. ${L('Age', 'வயது')} ${h.age}, ${bi(h.stage)}.`,
    `${bi(w.label)}: ${w.habits.map((x) => bi(x)).join('. ')}.`,
    bi(h.disclaimer),
  ].join(' ');

  $('#hlBody').innerHTML = `
    <div class="hl-note">⚕️ ${esc(bi(h.disclaimer))} ${L('Emergency: 112.', 'அவசரம்: 112.')}</div>
    <div class="card glass"><div class="card-title"><span>🌿 ${esc(displayName(m))}</span><button class="link-btn" id="hlSpeak" aria-label="${esc(L('Read aloud', 'வாசித்துக்காட்டு'))}">🔊</button></div>
      <div class="mini-label">${L('Age', 'வயது')} ${h.age} · ${L('Life stage', 'வாழ்க்கைப் பருவம்')}</div>
      <div class="big-line">${esc(bi(h.stage))}</div></div>

    <h3 class="hl-part" id="hlWellbeing">🌿 ${esc(bi(w.label))} ${review}</h3>
    <div class="card glass"><div class="card-title">☀️ ${L('Everyday habits', 'தினசரிப் பழக்கங்கள்')}</div>
      ${w.habits.map((x) => `<div class="factor"><span>${x.icon} ${esc(bi(x))}</span></div>`).join('')}
      <p class="muted small">${esc(bi(w.note))}</p></div>

    <div class="card glass"><div class="card-title">🩺 ${L('Check-ups for your age', 'உங்கள் வயதுக்கான பரிசோதனைகள்')}</div>
      ${h.stage.checklist.map((x) => `<div class="hl-check"><span>✔️ ${esc(bi(x))}${x.forGender === 'female' && !m.gender ? ` <span class="pill">${L('women', 'பெண்கள்')}</span>` : ''}</span>${remindBtn({ title: `${bi(x)} — ${L('check-up', 'பரிசோதனை')}`, at })}</div>`).join('')}
      <p class="muted small">👨‍⚕️ ${esc(bi(h.stage.note))}</p></div>

    <div class="card glass"><div class="card-title">🧘 ${L('Gentle movement & breathing', 'மென்மையான உடற்பயிற்சி & சுவாசம்')}</div>
      ${w.yoga.map((x) => `<div class="factor"><span>🧘 ${esc(bi(x))}</span></div>`).join('')}
      <p class="muted small">${L('Go gently and stop if anything hurts. Ask your doctor first if you have a condition.', 'மெதுவாகச் செய்யுங்கள்; வலி இருந்தால் நிறுத்துங்கள். உடல்நலப் பிரச்சினை இருந்தால் முதலில் மருத்துவரிடம் கேளுங்கள்.')}</p></div>

    <h3 class="hl-part" id="hlReflection">🪔 ${esc(bi(r.label))}</h3>
    <details class="card glass hl-reflect"><summary><span>${esc(bi(r.note))}</span><span class="pill">${L('Open', 'திற')}</span></summary>
      ${h.birthTimeNote ? `<p class="small muted">🕰️ ${esc(bi(h.birthTimeNote))}</p>` : ''}
      ${p.md ? `<p><b style="color:${COLOR[p.md.lord]}">${GLYPH[p.md.lord]} ${esc(planetName(p.md.lord))}</b> ${L('Dasa', 'தசை')}${p.ad ? ` · <b style="color:${COLOR[p.ad.lord]}">${GLYPH[p.ad.lord]} ${esc(planetName(p.ad.lord))}</b> ${L('Bhukti', 'புக்தி')} <span class="muted small">(${L(`till ${mY(p.ad.end)}`, `${mY(p.ad.end)} வரை`)})</span>` : ''}</p>` : ''}
      ${r.practices.map((x) => `<div class="factor"><span><b style="color:${COLOR[x.planet]}">${GLYPH[x.planet]} ${esc(bi(x.why))}</b>
        <br><small>🪔 ${esc(bi(x.lamp))}</small><br><small>🙏 ${esc(bi(x.deity))} · ${esc(bi(x.mantra))}</small><br><small class="muted">🎁 ${esc(bi(x.charity))}</small></span></div>`).join('')}
      ${r.gochara.map((n) => `<div class="factor"><span>🌙 ${esc(bi(n))}</span></div>`).join('')}
      <div class="factor"><span>🕊️ ${esc(bi(r.calm))}</span></div>
      ${r.healing.map((x) => `<div class="factor"><span>🕉️ ${esc(bi(x))}</span></div>`).join('')}
      <div class="mini-label" style="margin-top:10px">${L('Maha Mrityunjaya mantra', 'மகா மிருத்யுஞ்ஜய மந்திரம்')}</div>
      <p class="hl-mantra">${esc(bi(r.mantra))}</p>
      <p class="muted small">${esc(bi(r.mantra.how))}</p>
      <p class="muted small">ℹ️ ${esc(bi(r.note))}</p></details>

    <div class="btn-row"><button class="chip-btn" data-go="roadmap">🗺️ ${L('Life Road Map', 'வாழ்க்கை வரைபடம்')}</button><button class="chip-btn" data-go="guide">🧭 ${L('My Guide', 'என் வழிகாட்டி')}</button></div>`;
  $('#hlSpeak').addEventListener('click', () => speak(spoken));
}

registerScreen('health', { render: renderHealth, parent: 'home', needsMember: true });
