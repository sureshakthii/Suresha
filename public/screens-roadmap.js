// Life Road Map screen (வாழ்க்கை வரைபடம்) — each person's personal plan for the next 10 years,
// plus a print / save-as-PDF report (ஜாதகப் புத்தகம்) that families can keep or share.
import { lifeRoadmap, ROAD_AREAS as ALL_AREAS } from './shared/roadmap.js';
// Health is not scored from the chart (THUNAI brief: wellness stays separate from horoscope interpretation).
let ROAD_AREAS = ALL_AREAS.filter((a) => a.id !== 'health');
import {
  state, $, $$, L, ta, esc, bi, GLYPH, COLOR, planetName, monthName, activeMember, chartOf, registerScreen, subHeader,
  speak, displayName, aiTask, saveFamily,
} from './core.js';
import { isLocked, lockCard } from './growth.js';
import { remindBtn } from './remind.js';

const people = () => state.family.filter((m) => m.relation !== 'organization');
const mY = (d) => `${monthName(new Date(d).getUTCMonth())} ${new Date(d).getUTCFullYear()}`;
const lvTag = (lv) => `<span class="tag ${lv === 'good' ? 'good' : lv === 'steady' ? 'warn' : 'bad'}">${lv === 'good' ? L('Good', 'நன்று') : lv === 'steady' ? L('Steady', 'நிலை') : L('Care', 'கவனம்')}</span>`;
const bar = (s) => `<span class="gb-bar"><i class="${s >= 62 ? 'strong' : s >= 50 ? 'average' : 'weak'}" style="width:${s}%"></i></span>`;
// Health is not scored from the chart; if the engine picks it, show a neutral marker instead.
const area = (id) => ROAD_AREAS.find((a) => a.id === id) || { id, icon: '•', en: 'General', ta: 'பொது' };

function renderRoadmap(sec) {
  const m = activeMember()?.relation !== 'organization' ? activeMember() : people()[0];
  if (!m) { sec.innerHTML = `${subHeader(L('Life Road Map', 'வாழ்க்கை வரைபடம்'))}<p class="muted center">${L('Add a family member first.', 'முதலில் குடும்ப உறுப்பினரைச் சேர்க்கவும்.')}</p>`; return; }
  sec.innerHTML = `${subHeader(L('Life Road Map', 'வாழ்க்கை வரைபடம்'), L('Your personal plan for the next 10 years — from your own Jathagam', 'உங்கள் ஜாதகத்திலிருந்து அடுத்த 10 ஆண்டுகளுக்கான தனிப்பட்ட திட்டம்'))}
    ${people().length > 1 ? `<div class="member-switch">${people().map((x) => `<button class="mchip${x.id === m.id ? ' sel' : ''}" data-rid="${esc(x.id)}">${esc(displayName(x))}</button>`).join('')}</div>` : ''}
    <div id="rmBody"><div class="loader"><i></i><i></i><i></i></div></div>`;
  $$('[data-rid]', sec).forEach((b) => b.addEventListener('click', () => { state.activeId = b.dataset.rid; saveFamily(); renderRoadmap(sec); }));
  setTimeout(() => { if (state.view === 'roadmap') drawRoadmap(m); }, 30);
}

function drawRoadmap(m) {
  const c = chartOf(m);
  const r = lifeRoadmap(c);
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
    <div class="card glass rm-stage"><div class="mini-label">${L('Age', 'வயது')} ${r.age} · ${L('Life stage', 'வாழ்க்கைப் பருவம்')}</div>
      <div class="big-line">🌱 ${esc(bi(r.stage))}</div>
      ${r.stage.goals.map((g) => `<div class="small">✔️ ${esc(bi(g))}</div>`).join('')}
      ${r.nextStage ? `<p class="muted small">${L('Next stage', 'அடுத்த பருவம்')}: ${esc(bi(r.nextStage))}</p>` : ''}</div>

    ${cur ? `<div class="card glass"><div class="card-title"><span>📍 ${L('You are here', 'நீங்கள் இப்போது')}</span>${lvTag(cur.level)}</div>
      <p><b style="color:${COLOR[cur.md]}">${GLYPH[cur.md]} ${esc(planetName(cur.md))}</b> ${L('Dasa', 'தசை')} · <b style="color:${COLOR[cur.ad]}">${GLYPH[cur.ad]} ${esc(planetName(cur.ad))}</b> ${L('Bhukti', 'புக்தி')} <span class="muted small">(${L('till', 'வரை')} ${mY(cur.end)})</span></p>
      ${ROAD_AREAS.map((a) => `<div class="gb-row static"><span class="gb-name">${a.icon} ${esc(bi(a))}</span>${bar(cur.scores[a.id])}<b>${cur.scores[a.id]}</b></div>`).join('')}
      ${cur.notes.map((n) => `<p class="small">🪐 ${esc(bi(n))}</p>`).join('')}</div>` : ''}

    ${childFocus}
    <div class="card glass"><div class="card-title"><span>🧭 ${L('What to do now', 'இப்போது செய்ய வேண்டியவை')}</span><button class="link-btn" id="rmSpeak" aria-label="${esc(L('Read aloud', 'வாசித்துக்காட்டு'))}">🔊</button></div>
      ${r.now.map((x, i) => `<div class="factor"><span>${i + 1}. ${esc(bi(x))}</span></div>`).join('')}</div>

    ${locked ? lockCard(L('The 10-year period map, yearly outlook and event windows are part of Premium.', '10 ஆண்டு கால வரைபடம், ஆண்டுவாரிப் பலன், நிகழ்வுக் காலங்கள் பிரீமியத்தில் உள்ளன.')) : `
    ${r.milestones.length ? `<div class="card glass"><div class="card-title">🎯 ${L('Next best windows for big steps', 'பெரிய முடிவுகளுக்கான அடுத்த சிறந்த காலங்கள்')}</div>
      ${r.milestones.map((x) => `<div class="factor"><span>${x.icon} ${esc(bi(x.name))}${x.doubleTransit ? ` <span class="tag good">${L('Double transit', 'இரட்டைக் கோசாரம்')}</span>` : ''}</span><b class="zero">${mY(x.from)} – ${mY(x.to)} ${x.from > Date.now() ? remindBtn({ title: `${bi(x.name)} — ${L('good period begins', 'நல்ல காலம் தொடக்கம்')}`, at: x.from }) : ''}</b></div>`).join('')}
      <button class="chip-btn" data-go="life">🔭 ${L('Details for each question', 'ஒவ்வொரு கேள்விக்கும் விவரம்')}</button></div>` : ''}

    <div class="section-title">📅 ${L('Year by year', 'ஆண்டுவாரியாக')}</div>
    <div class="rm-years">${r.years.map((y) => `<div class="rm-year ${y.level}"><b>${y.year}</b><span class="muted small">${L('age', 'வயது')} ${y.age}</span><div class="rm-meter"><i style="height:${y.overall}%"></i></div><span class="small">${area(y.best).icon}</span></div>`).join('')}</div>
    <p class="muted small center">${ROAD_AREAS.map((a) => `${a.icon} ${esc(bi(a))}`).join(' · ')}</p>

    <div class="section-title">🛤️ ${L('Period by period', 'காலம் காலமாக')}</div>
    ${r.periods.map((p) => `<details class="card glass rm-period ${p.level}"${p.current ? ' open' : ''}><summary>
        <span><b>${GLYPH[p.md]} ${esc(planetName(p.md))} – ${GLYPH[p.ad]} ${esc(planetName(p.ad))}</b><br><small class="muted">${mY(p.start)} – ${mY(p.end)}</small></span>${lvTag(p.level)}</summary>
      ${ROAD_AREAS.map((a) => `<div class="gb-row static"><span class="gb-name">${a.icon} ${esc(bi(a))}</span>${bar(p.scores[a.id])}<b>${p.scores[a.id]}</b></div>`).join('')}
      <p class="small">${p.focus !== 'health' ? `⭐ ${L('Focus', 'கவனம் செலுத்த')}: <b>${esc(bi(area(p.focus)))}</b>` : ''}${p.careArea && p.careArea !== 'health' ? ` · 🤍 ${L('Care', 'கவனம்')}: ${esc(bi(area(p.careArea)))}` : ''}</p>
      ${p.notes.map((n) => `<p class="small">🪐 ${esc(bi(n))}</p>`).join('')}
      <p class="small">🪔 ${esc(bi(p.remedy.deity))} · ${esc(bi(p.remedy.mantra))}</p></details>`).join('')}
    <button class="btn-gold" id="rmAi">📜 ${L('Guru\'s reading of my road map', 'என் வரைபடத்திற்கு குருவின் விளக்கம்')}</button>
    <div class="card glass" id="rmAiBox" hidden><div class="reply" id="rmAiText"></div></div>`}
    <div class="btn-row"><button class="chip-btn" id="rmPrint">🖨️ ${L('Print / save as PDF', 'அச்சிடு / PDF ஆக சேமி')}</button><button class="chip-btn" data-go="guide">🧭 ${L('My Guide', 'என் வழிகாட்டி')}</button><button class="chip-btn" data-go="analysis">📜 ${L('Full analysis', 'முழு ஆய்வு')}</button></div>
    <p class="muted small center">${L('A road map shows the seasons of life; your effort, family and faith drive the journey.', 'வரைபடம் வாழ்க்கையின் பருவங்களைக் காட்டுகிறது; பயணத்தை நடத்துவது உங்கள் உழைப்பும் குடும்பமும் நம்பிக்கையும்.')}</p>`;
  $('#rmSpeak').addEventListener('click', () => speak(spoken));
  $('#rmPrint').addEventListener('click', () => { $$('#rmBody details').forEach((d) => { d.open = true; }); import('./core.js').then((c) => c.printPage()); });
  $('#rmAi')?.addEventListener('click', async () => {
    $('#rmAiBox').hidden = false;
    const t = $('#rmAiText');
    t.classList.add('typing');
    const context = {
      person: { name: m.name, age: r.age, stage: r.stage.en, star: c.janmaNakshatra.name, lagna: c.lagna.rasiName },
      periods: r.periods.map((p) => ({ dasa: `${p.md}/${p.ad}`, from: p.start.toISOString().slice(0, 7), to: p.end.toISOString().slice(0, 7), level: p.level, focus: p.focus, scores: p.scores, transit: p.notes.map((n) => n.en) })),
      milestones: r.milestones.map((x) => ({ event: x.name.en, from: x.from.toISOString().slice(0, 7), to: x.to.toISOString().slice(0, 7) })),
    };
    await aiTask({ task: 'chat', context, messages: [{ role: 'user', content: r.minor ? `This road map is for a ${r.age}-year-old child. As a kind family Guru, give a warm, simple plan for the coming years focused only on studies, health, good habits, character and family — no career, money, marriage or relationship predictions. Suggest simple prayers. About 200 words.` : 'Act as my life Guru. From this road map, give me a warm, practical 10-year plan: what to focus on in each period (career, money, family, health, learning), the best windows for big decisions, how to prepare for the care periods, and simple daily habits and parigarams. Positive, no fear. About 300 words.' }],
      fallbackText: r.now.map((x) => bi(x)).join('\n'), onText: (tx) => { t.textContent = tx; } });
    t.classList.remove('typing');
  });
}
registerScreen('roadmap', { render: renderRoadmap, parent: 'home', needsMember: true });
