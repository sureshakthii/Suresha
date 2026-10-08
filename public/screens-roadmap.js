// Life Road Map screen (வாழ்க்கை வரைபடம்) — each person's personal plan for the next 10 years,
// plus a print / save-as-PDF report (ஜாதகப் புத்தகம்) that families can keep or share.
import { lifeRoadmap, ROAD_AREAS as ALL_AREAS } from './shared/roadmap.js';
import { hymnText } from './hymn-links.js';
// Health is not scored from the chart (THUNAI brief: wellness stays separate from horoscope interpretation).
let ROAD_AREAS = ALL_AREAS.filter((a) => a.id !== 'health');
import {
  state, $, $$, L, ta, esc, bi, GLYPH, COLOR, planetName, monthName, activeMember, chartOf, registerScreen, subHeader,
  speak, displayName, aiTask, saveFamily, needsTimeNote, birthContext, stabilityChip,
  scaleTag, scaleName, fmtMonthOf, untilL, periodMonthsL, dasaName,
} from './core.js';
import { REPORT_YEARS, horizonLabel } from './shared/report-horizon.js';
import { isLocked, lockCard, gate } from './growth.js';
import { remindBtn } from './remind.js';

const people = () => state.family.filter((m) => m.relation !== 'organization');
const mY = (d) => fmtMonthOf(new Date(d), state.loc?.tz ?? 5.5);
/** A Dasa–Bhukti span by the one convention (start month – month of the last day). */
const span = (p) => periodMonthsL(p, state.loc?.tz ?? 5.5);
const lvTag = (lv) => scaleTag(lv);
const bar = (s) => `<span class="gb-bar"><i class="${s >= 62 ? 'strong' : s >= 50 ? 'average' : 'weak'}" style="width:${s}%"></i></span>`;
// Health is not scored from the chart; if the engine picks it, show a neutral marker instead.
const area = (id) => ROAD_AREAS.find((a) => a.id === id) || { id, icon: '•', en: 'General', ta: 'பொது' };

const lvName = (lv) => scaleName(lv);
function injectCss() {
  if (document.getElementById('roadmap-css')) return;
  const st = document.createElement('style');
  st.id = 'roadmap-css';
  // Year tiles: 5 per row on wide screens, 3 per row up to 420px (Tamil "வயது 34" always fits); no clipping.
  st.textContent = `
  .rmy-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; margin: 0 0 8px; padding: 0; list-style: none; }
  @media (max-width: 520px) { .rmy-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
  @media (max-width: 420px) { .rmy-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
  .rmy-tile { min-width: 0; display: flex; flex-direction: column; align-items: stretch; gap: 4px; padding: 8px 8px 7px; border-radius: 14px;
    background: var(--glass); border: 1px solid var(--glass-b); border-top: 3px solid var(--warn); }
  .rmy-tile.good { border-top-color: var(--good); }
  .rmy-tile.care { border-top-color: var(--bad); }
  .rmy-year { font-size: 15px; line-height: 1.4; font-variant-numeric: tabular-nums; }
  .rmy-age { font-size: 12px; line-height: 1.45; opacity: .8; white-space: nowrap; }
  .rmy-bar { display: block; height: 6px; border-radius: 6px; background: rgba(var(--ink-rgb), .1); overflow: hidden; }
  .rmy-bar i { display: block; height: 100%; border-radius: 6px; background: var(--warn); }
  .rmy-tile.good .rmy-bar i { background: var(--good); }
  .rmy-tile.care .rmy-bar i { background: var(--bad); }
  .rmy-foot { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0 4px; font-size: 12px; line-height: 1.45; }
  .rmy-ico { font-size: 15px; line-height: 1.35; }
  .rmy-lv { min-width: 0; white-space: normal; overflow-wrap: normal; word-break: keep-all; }
  .rmy-legend { display: flex; flex-wrap: wrap; gap: 4px 12px; margin: 2px 0 10px; padding: 0; list-style: none; font-size: 12px; line-height: 1.5; }
  .rmy-legend li { white-space: nowrap; }
  .rmy-key { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 4px; vertical-align: middle; background: var(--warn); }
  .rmy-key.good { background: var(--good); } .rmy-key.care { background: var(--bad); }
  body.large .rmy-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  @media (max-width: 380px) { body.large .rmy-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  `;
  document.head.appendChild(st);
}
/** Year tiles (year, age, overall bar, strongest-area icon) with a legend for icons and colours. */
function yearTiles(years) {
  if (!years.length) return '';
  const bestOf = (y) => [...ROAD_AREAS].sort((p, q) => (y.scores[q.id] ?? 0) - (y.scores[p.id] ?? 0))[0] || area(y.best);
  const used = [...new Set(years.map(bestOf))];
  return `<ul class="rmy-grid" aria-label="${esc(L('Year by year outlook', 'ஆண்டுவாரிப் பலன்'))}">${years.map((y) => {
    // Strongest of the areas shown here (wellbeing is not scored on this screen).
    const a = bestOf(y);
    const label = `${y.year} · ${L('age', 'வயது')} ${y.age} · ${lvName(y.level)} · ${L('strongest area', 'வலுவான துறை')}: ${bi(a)}`;
    return `<li class="rmy-tile ${y.level}" aria-label="${esc(label)}" title="${esc(label)}">
      <b class="rmy-year">${y.year}</b><span class="rmy-age">${L('Age', 'வயது')} ${y.age}</span>
      <span class="rmy-bar" aria-hidden="true"><i style="width:${y.overall}%"></i></span>
      <span class="rmy-foot" aria-hidden="true"><span class="rmy-ico">${a.icon}</span><span class="rmy-lv">${lvName(y.level)}</span></span></li>`;
  }).join('')}</ul>
    <ul class="rmy-legend muted" aria-label="${esc(L('Legend', 'விளக்கம்'))}">
      ${used.map((a) => `<li><span aria-hidden="true">${a.icon}</span> ${esc(bi(a))}</li>`).join('')}
      <li><span class="rmy-key good" aria-hidden="true"></span>${scaleName('good')}</li><li><span class="rmy-key" aria-hidden="true"></span>${scaleName('steady')}</li><li><span class="rmy-key care" aria-hidden="true"></span>${scaleName('care')}</li>
    </ul>
    <p class="muted small">${L('The icon shows the strongest area of that year; the bar shows the overall outlook.', 'சின்னம் — அந்த ஆண்டின் வலுவான துறை; பட்டை — ஒட்டுமொத்த நிலை.')}</p>`;
}

function renderRoadmap(sec) {
  injectCss();
  const m = activeMember()?.relation !== 'organization' ? activeMember() : people()[0];
  if (!m) { sec.innerHTML = `${subHeader(L('Dasa Road Map', 'தசா வரைபடம்'))}<p class="muted center">${L('Add a family member first.', 'முதலில் குடும்ப உறுப்பினரைச் சேர்க்கவும்.')}</p>`; return; }
  sec.innerHTML = `${subHeader(L('Dasa Road Map', 'தசா வரைபடம்'), L(`Your personal plan from your own Jathagam · Covers the next ${REPORT_YEARS.roadmap} years`, `உங்கள் ஜாதகத்திலிருந்து தனிப்பட்ட திட்டம் · அடுத்த ${REPORT_YEARS.roadmap} ஆண்டுகள்`))}
    ${people().length > 1 ? `<div class="member-switch">${people().map((x) => `<button class="mchip${x.id === m.id ? ' sel' : ''}" data-rid="${esc(x.id)}">${esc(displayName(x))}</button>`).join('')}</div>` : ''}
    <div id="rmBody"><div class="loader"><i></i><i></i><i></i></div></div>`;
  $$('[data-rid]', sec).forEach((b) => b.addEventListener('click', () => { state.activeId = b.dataset.rid; saveFamily(); renderRoadmap(sec); }));
  setTimeout(() => { if (state.view === 'roadmap') drawRoadmap(m); }, 30);
}

function drawRoadmap(m) {
  const c = chartOf(m);
  const years = REPORT_YEARS.roadmap;
  const married = m.maritalStatus === 'married' || m.relation === 'spouse' || (m.relation === 'self' && state.family.some((x) => x.relation === 'spouse')) ? 'married' : (m.maritalStatus || null);
  const r = lifeRoadmap(c, { years, maritalStatus: married });
  const cover = `<span class="pill horizon-label">${esc(bi(horizonLabel(years)))}</span>`;
  // Age first: for a child the engine returns only learning / family & home (no career, wealth or marriage scores).
  ROAD_AREAS = (r.areas || ALL_AREAS).filter((a) => a.id !== 'health');
  const locked = isLocked('predictions');
  const childFocus = r.minor ? `<div class="card glass"><div class="card-title">🌿 ${L('Health & character focus', 'ஆரோக்கியம் & நற்பண்பு')}</div>
      ${[[ '🥗', L('Healthy food, water and outdoor play every day', 'தினமும் ஆரோக்கிய உணவு, தண்ணீர், வெளி விளையாட்டு')], ['😴', L('Fixed sleep time and limited screen time', 'நேரத்திற்கு உறக்கம், குறைந்த திரை நேரம்')], ['🤝', L('Kindness, honesty and helping at home', 'அன்பு, நேர்மை, வீட்டில் உதவுதல்')], ['🙏', L('A short prayer before study', 'படிக்கும் முன் சிறு பிரார்த்தனை')]].map(([i, t]) => `<div class="factor"><span>${i} ${esc(t)}</span></div>`).join('')}</div>` : '';
  const cur = r.current;
  const spoken = [
    `${displayName(m)}. ${bi(r.stage)}.`,
    ...r.now.map((x) => bi(x)),
  ].join(' ');
  $('#rmBody').innerHTML = `
    ${r.needsBirthTime ? needsTimeNote({ en: 'House-based period readings use the Lagna.', ta: 'பாவ அடிப்படையிலான கால பலன்கள் லக்னத்தைப் பயன்படுத்துகின்றன.' }) : ''}
    ${stabilityChip(c, 'lagna', 'moonNakshatra', 'moonPada') ? `<p class="small">${stabilityChip(c, 'lagna', 'moonNakshatra', 'moonPada')} ${L('Your birth time is approximate: the Lagna or dasa dates used here can shift.', 'பிறந்த நேரம் தோராயம்: இங்கே பயன்படும் லக்னம் அல்லது தசா தேதிகள் மாறலாம்.')}</p>` : ''}
    <div class="card glass rm-stage"><div class="mini-label">${L('Age', 'வயது')} ${r.age} · ${L('Life stage', 'வாழ்க்கைப் பருவம்')}</div>
      <div class="big-line">🌱 ${esc(bi(r.stage))}</div>
      ${r.stage.goals.map((g) => `<div class="small">✔️ ${esc(bi(g))}</div>`).join('')}
      ${r.nextStage ? `<p class="muted small">${L('Next stage', 'அடுத்த பருவம்')}: ${esc(bi(r.nextStage))}</p>` : ''}</div>

    ${cur ? `<div class="card glass"><div class="card-title"><span>📍 ${L('You are here', 'நீங்கள் இப்போது')}</span>${lvTag(cur.level)}</div>
      <p><b style="color:${COLOR[cur.md]}">${GLYPH[cur.md]} ${esc(dasaName(cur.md))}</b> ${L('Dasa', 'தசை')} · <b style="color:${COLOR[cur.ad]}">${GLYPH[cur.ad]} ${esc(dasaName(cur.ad))}</b> ${L('Bhukti', 'புக்தி')} <span class="muted small">(${esc(untilL(mY(new Date(cur.end).getTime() - 86400000)))})</span></p>
      ${ROAD_AREAS.map((a) => `<div class="gb-row static"><span class="gb-name">${a.icon} ${esc(bi(a))}</span>${bar(cur.scores[a.id])}<b>${cur.scores[a.id]}</b></div>`).join('')}
      ${cur.notes.map((n) => `<p class="small">🪐 ${esc(bi(n))}</p>`).join('')}</div>` : ''}

    ${childFocus}
    <div class="card glass"><div class="card-title"><span>🧭 ${L('What to do now', 'இப்போது செய்ய வேண்டியவை')}</span><button class="link-btn" id="rmSpeak" aria-label="${esc(L('Read aloud', 'சத்தமாக வாசி'))}">🔊</button></div>
      ${r.now.map((x, i) => `<div class="factor"><span>${i + 1}. ${esc(bi(x))}</span></div>`).join('')}</div>

    ${locked ? lockCard(L('The 10-year period map, yearly outlook and event windows are part of the Personal plan.', '10 ஆண்டு கால வரைபடம், ஆண்டுவாரிப் பலன், நிகழ்வுக் காலங்கள் தனிநபர் திட்டத்தில் உள்ளன.')) : `
    ${r.milestones.length ? `<div class="card glass"><div class="card-title">🎯 ${L('Next best windows for big steps', 'பெரிய முடிவுகளுக்கான அடுத்த சிறந்த காலங்கள்')}</div>
      <p class="muted small">${L('Short windows when the running Dasa–Bhukti and the Guru–Sani transit both support the event. The Full analysis lists the longer supportive Dasa–Bhukti periods for each area — times inside both are the strongest.', 'நடப்பு தசா–புக்தியும் குரு–சனி கோசாரமும் சேர்ந்து ஆதரிக்கும் சிறு காலங்கள். முழு ஆய்வு ஒவ்வொரு துறைக்கும் ஆதரவான நீண்ட தசா–புக்தி காலங்களைக் காட்டும் — இரண்டிலும் வரும் நேரமே மிக வலுவானது.')}</p>
      ${r.milestones.map((x) => `<div class="factor"><span>${x.icon} ${esc(bi(x.name))}${x.doubleTransit ? ` <span class="tag good">${L('Double transit', 'இரட்டைக் கோசாரம்')}</span>` : ''}</span><b class="zero">${mY(x.from)} – ${mY(x.to)} ${x.from > Date.now() ? remindBtn({ title: `${bi(x.name)} — ${L('good period begins', 'நல்ல காலம் தொடக்கம்')}`, at: x.from }) : ''}</b></div>`).join('')}
      <button class="chip-btn" data-go="life">🔭 ${L('Details for each question', 'ஒவ்வொரு கேள்விக்கும் விவரம்')}</button></div>` : ''}

    <div class="section-title">📅 ${L('Year by year', 'ஆண்டுவாரியாக')} ${cover}</div>
    ${yearTiles(r.years)}

    <div class="section-title">🛤️ ${L('Period by period', 'காலம் காலமாக')} ${cover}</div>
    ${r.periods.map((p) => `<details class="card glass rm-period ${p.level}"${p.current ? ' open' : ''}><summary>
        <span><b>${GLYPH[p.md]} ${esc(planetName(p.md))} – ${GLYPH[p.ad]} ${esc(planetName(p.ad))}</b><br><small class="muted">${esc(span(p))}</small></span>${lvTag(p.level)}</summary>
      ${ROAD_AREAS.map((a) => `<div class="gb-row static"><span class="gb-name">${a.icon} ${esc(bi(a))}</span>${bar(p.scores[a.id])}<b>${p.scores[a.id]}</b></div>`).join('')}
      <p class="small">${p.focus !== 'health' ? `⭐ ${L('Focus', 'கவனம் செலுத்த')}: <b>${esc(bi(area(p.focus)))}</b>` : ''}${p.careArea && p.careArea !== 'health' ? ` · 🤍 ${L('Care', 'கவனம்')}: ${esc(bi(area(p.careArea)))}` : ''}</p>
      ${p.notes.map((n) => `<p class="small">🪐 ${esc(bi(n))}</p>`).join('')}
      <p class="small">🪔 ${p.remedy.deity ? `${esc(bi(p.remedy.deity))} · ${hymnText(bi(p.remedy.mantra))}` : hymnText(bi(p.remedy.free))}</p></details>`).join('')}
    <button class="btn-gold" id="rmAi">📜 ${L('Guru\'s reading of my road map', 'என் வரைபடத்திற்கு குருவின் விளக்கம்')}</button>
    <div class="card glass" id="rmAiBox" hidden><div class="reply" id="rmAiText"></div></div>`}
    <div class="btn-row"><button class="chip-btn" id="rmPrint">🖨️ ${L('Print / save as PDF', 'அச்சிடு / PDF ஆக சேமி')}</button><button class="chip-btn" data-go="guide">🧭 ${L('My Guide', 'என் வழிகாட்டி')}</button><button class="chip-btn" data-go="analysis">📜 ${L('Full analysis', 'முழு ஆய்வு')}</button></div>
    <p class="muted small center">${L('A road map shows the seasons of life; your effort, family and faith drive the journey.', 'வரைபடம் வாழ்க்கையின் பருவங்களைக் காட்டுகிறது; பயணத்தை நடத்துவது உங்கள் உழைப்பும் குடும்பமும் நம்பிக்கையும்.')}</p>`;
  $('#rmSpeak').addEventListener('click', () => speak(spoken));
  $('#rmPrint').addEventListener('click', () => { if (!gate('printReports', { near: $('#rmPrint') })) return; $$('#rmBody details').forEach((d) => { d.open = true; }); import('./core.js').then((c) => c.printPage()); });
  $('#rmAi')?.addEventListener('click', async () => {
    $('#rmAiBox').hidden = false;
    const t = $('#rmAiText');
    t.classList.add('typing');
    const context = {
      person: { name: m.name, age: r.age, stage: r.stage.en, star: c.janmaNakshatra.name, ...birthContext(m, c) },
      coverage: `the next ${years} years`,
      periods: r.periods.map((p) => ({ dasa: `${p.md}/${p.ad}`, from: p.start.toISOString().slice(0, 7), to: p.end.toISOString().slice(0, 7), level: p.level, focus: p.focus, scores: p.scores, transit: p.notes.map((n) => n.en) })),
      milestones: r.milestones.map((x) => ({ event: x.name.en, from: x.from.toISOString().slice(0, 7), to: x.to.toISOString().slice(0, 7) })),
    };
    await aiTask({ task: 'chat', context, messages: [{ role: 'user', content: r.minor ? `This road map is for a ${r.age}-year-old child. As a kind family Guru, give a warm, simple plan for the coming years focused only on studies, health, good habits, character and family — no career, money, marriage or relationship predictions. Suggest simple prayers. About 200 words.` : `Act as my life Guru. From this road map, give me a warm, practical ${years}-year plan: what to focus on in each period (career, money, family, health, learning), the best windows for big decisions, how to prepare for the care periods, and simple daily habits and parigarams. Positive, no fear. About 300 words.` }],
      fallbackText: r.now.map((x) => bi(x)).join('\n'), onText: (tx) => { t.textContent = tx; } });
    t.classList.remove('typing');
  });
}
registerScreen('roadmap', { render: renderRoadmap, parent: 'home', needsMember: true });
