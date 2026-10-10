// Jathagam health guide screen (ஜாதக ஆரோக்கிய வழிகாட்டி). For adults (18+): "health care now", the running Dasa /
// Bhukti and Gochara with dates, the next periods, a 12-month care map, body areas from the birth chart, body type by
// tradition, food to favour / reduce, daily routine & yoga, traditional remedies and age-wise check-ups with
// reminders. Every traditional section carries "traditional indication, not a diagnosis — see a doctor".
// Minors (<18): general sleep / play / food habits and growth check-ups only. Engine: shared/health.js.
import { healthGuide, healthNow } from './shared/health.js';
import { ageProfile } from './shared/age-guard.js';
import {
  state, $, $$, L, esc, bi, GLYPH, COLOR, planetName, activeMember, chartOf, registerScreen, subHeader,
  speak, displayName, saveFamily, stabilityChip, emergencyLine, dasaName,
} from './core.js';
import { remindBtn } from './remind.js';

const people = () => state.family.filter((m) => m.relation !== 'organization');
const tzNow = () => state.loc?.tz ?? 5.5;

/** First day of next month, 9 AM in the user's local (residence) time zone. */
function nextMonth9am() {
  const tz = tzNow();
  const local = new Date(Date.now() + tz * 3600000);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + 1, 1, 9, 0) - tz * 3600000);
}

/**
 * One-line "ஆரோக்கிய கவனம் இப்போது / Health care now" for the Today wellbeing card and the written reading
 * (body area + one tip + a link to the full guide). '' when there is nothing to show.
 */
export function healthNowHtml(m, { now = new Date(), chart = null, card = false, link = true } = {}) {
  if (!m || m.relation === 'organization') return '';
  if (typeof document !== 'undefined') injectCss();
  let h;
  try { h = healthNow(chart || chartOf(m), ageProfile(m, { tz: tzNow(), now }), now, { tz: tzNow() }); } catch { return ''; }
  if (!h) return '';
  const line = `<p class="small hl-now-line">🌿 <b>${esc(bi(h.label))}</b>: ${esc(L(h.en, h.ta))}${link ? ` <button class="link-btn" data-go="health">${L('Full health guide ›', 'முழு ஆரோக்கிய வழிகாட்டி ›')}</button>` : ''}</p>`;
  return card ? `<div class="card glass hl-now-card">${line}</div>` : line;
}

function injectCss() {
  if (document.getElementById('health-css')) return;
  const s = document.createElement('style');
  s.id = 'health-css';
  s.textContent = `
  .hl-note { border-left: 3px solid var(--warn); background: rgba(var(--gold-rgb), .08); color: var(--text); border-radius: 12px; padding: 10px 12px; font-size: 13px; margin: 0 0 12px; }
  .hl-trad { font-size: 12px; color: var(--muted); margin: 8px 0 0; }
  .hl-review { font-size: 11px; padding: 2px 8px; border-radius: 999px; border: 1px dashed var(--warn); color: var(--text); white-space: normal; }
  .hl-check { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 8px 0; border-bottom: 1px solid rgba(var(--ink-rgb), .06); font-size: 13px; }
  .hl-check > span { min-width: 0; overflow-wrap: anywhere; }
  .hl-now { border-left: 3px solid var(--gold); }
  .hl-now .big-line { font-size: 16px; line-height: 1.5; }
  .hl-per { padding: 8px 0; border-bottom: 1px solid rgba(var(--ink-rgb), .06); }
  .hl-per:last-child { border-bottom: 0; }
  .hl-per p { margin: 4px 0; }
  .hl-per small { display: block; color: var(--muted); }
  .hl-mmap { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px; margin-bottom: 8px; }
  .hl-month { border-radius: 12px; padding: 8px 10px; background: rgba(var(--ink-rgb), .04); border: 1px solid rgba(var(--ink-rgb), .08); font-size: 12px; min-width: 0; }
  .hl-month.care { border-color: var(--warn); }
  .hl-month b { display: block; font-size: 13px; }
  .hl-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .hl-cols h4 { margin: 0 0 6px; font-size: 14px; }
  .hl-cols ul { margin: 0; padding-left: 18px; font-size: 13px; color: var(--text); }
  .hl-cols li { margin: 0 0 6px; overflow-wrap: anywhere; }
  .hl-cols li small { color: var(--muted); }
  .hl-area p { margin: 4px 0; }
  .hl-dosha { display: grid; grid-template-columns: auto 1fr; gap: 6px 10px; align-items: center; font-size: 13px; margin: 6px 0; }
  .hl-dosha .gb-bar { min-width: 0; }
  .hl-mantra { font-size: 14px; color: var(--gold2); line-height: 1.6; }
  .hl-now-line { margin: 8px 0 0; }
  .hl-now-line .link-btn { padding: 0; font-size: 12px; }
  @media (max-width: 420px) { .hl-cols { grid-template-columns: 1fr; } .hl-mmap { grid-template-columns: 1fr 1fr; } }`;
  document.head.append(s);
}

function renderHealth(sec) {
  injectCss();
  const m = activeMember()?.relation !== 'organization' ? activeMember() : people()[0];
  if (!m) { sec.innerHTML = `${subHeader(L('Jathagam Health Guide', 'ஜாதக ஆரோக்கிய வழிகாட்டி'))}<p class="muted center">${L('Add a family member first.', 'முதலில் குடும்ப உறுப்பினரைச் சேர்க்கவும்.')}</p>`; return; }
  sec.innerHTML = `${subHeader(L('Jathagam Health Guide', 'ஜாதக ஆரோக்கிய வழிகாட்டி'), L('Traditional care guide from your Jathagam, Dasa and Gochara — not a diagnosis', 'ஜாதகம், தசை, கோசாரம் வழியே மரபுக் கவனக் குறிப்புகள் — நோய் கண்டறிதல் அல்ல'))}
    ${people().length > 1 ? `<div class="member-switch">${people().map((x) => `<button class="mchip${x.id === m.id ? ' sel' : ''}" data-hid="${esc(x.id)}">${esc(displayName(x))}</button>`).join('')}</div>` : ''}
    <div id="hlBody"><div class="loader"><i></i><i></i><i></i></div></div>`;
  $$('[data-hid]', sec).forEach((b) => b.addEventListener('click', () => { state.activeId = b.dataset.hid; saveFamily(); renderHealth(sec); }));
  setTimeout(() => { if (state.view === 'health') drawHealth(m); }, 30);
}

/** Consecutive months with the same note, as one "Oct 2026 – Feb 2027: …" line. */
function monthRuns(items) {
  const runs = [];
  for (const x of items) {
    const last = runs[runs.length - 1];
    if (last && last.note.en === x.note.en) last.to = x; else runs.push({ from: x, to: x, note: x.note });
  }
  return runs.map((r) => ({ note: r.note, label: r.from === r.to ? r.from.label : { en: `${r.from.label.en} – ${r.to.label.en}`, ta: `${r.from.label.ta} – ${r.to.label.ta}` } }));
}
const trad = (note) => `<p class="hl-trad">⚕️ ${esc(bi(note))}</p>`;
const pcol = (k) => `<b style="color:${COLOR[k]}">${GLYPH[k]} ${esc(planetName(k))}</b>`;

function checkupsCard(h, m, at) {
  return `<div class="card glass"><div class="card-title"><span>🩺 ${L('Check-ups for your age', 'உங்கள் வயதுக்கான பரிசோதனைகள்')}</span></div>
    ${h.stage.checklist.map((x) => `<div class="hl-check"><span>✔️ ${esc(bi(x))}${x.forGender === 'female' && !m.gender ? ` <span class="pill">${L('women', 'பெண்கள்')}</span>` : ''}</span>${remindBtn({ title: `${bi(x)} — ${L('check-up', 'பரிசோதனை')}`, at })}</div>`).join('')}
    <p class="muted small">👨‍⚕️ ${esc(bi(h.stage.note))}</p></div>`;
}

function remediesCard(h) {
  const r = h.remedies, refl = h.reflection;
  return `<div class="card glass"><div class="card-title">🪔 ${L('Remedies & prayer (optional)', 'பரிகாரம், பிரார்த்தனை (விருப்பம்)')}</div>
    ${r.planets.map((x) => `<div class="factor"><span>${pcol(x.planet)} <small class="muted">· ${esc(bi(x.why))}</small>
      ${x.deity ? `<br><small>🙏 ${esc(bi(x.deity))} · ${esc(bi(x.mantra))}</small>` : ''}
      ${x.temple ? `<br><small>🛕 ${esc(bi(x.temple))}</small>` : ''}
      <br><small>🌱 ${esc(bi(x.free || x.lamp))}</small><br><small class="muted">🎁 ${esc(bi(x.charity))}</small>
      ${x.traditional ? `<br><small class="muted">ℹ️ ${esc(bi(x.traditional.note))}: ${esc(bi(x.traditional.deity))} · ${esc(bi(x.traditional.mantra))}</small>` : ''}</span></div>`).join('')}
    ${refl.gochara.map((n) => `<div class="factor"><span>🌙 ${esc(bi(n))}</span></div>`).join('')}
    ${r.healing.map((x) => `<div class="factor"><span>${r.mantra ? '🕉️' : '🕊️'} ${esc(bi(x))}</span></div>`).join('')}
    ${r.mantra ? `<div class="mini-label" style="margin-top:10px">${L('Maha Mrityunjaya mantra', 'மகா மிருத்யுஞ்ஜய மந்திரம்')}</div>
    <p class="hl-mantra">${esc(bi(r.mantra))}</p><p class="muted small">${esc(bi(r.mantra.how))}</p>` : ''}
    <p class="muted small">ℹ️ ${esc(bi(r.note))}</p></div>`;
}

function drawMinor(h, m, at) {
  const spoken = [`${displayName(m)}. ${L('Age', 'வயது')} ${h.age}.`, ...h.kidTips.map((x) => bi(x)), bi(h.minorNote)].join(' ');
  $('#hlBody').innerHTML = `
    <div class="hl-note">⚕️ ${esc(bi(h.minorNote))} ${esc(emergencyLine())}</div>
    <div class="card glass"><div class="card-title"><span>🌿 ${esc(displayName(m))}</span><button class="link-btn" id="hlSpeak" aria-label="${esc(L('Read aloud', 'சத்தமாக வாசி'))}">🔊</button></div>
      <div class="mini-label">${L('Age', 'வயது')} ${h.age} · ${L('Life stage', 'வாழ்க்கைப் பருவம்')}</div>
      <div class="big-line">${esc(bi(h.stage))}</div></div>
    <div class="card glass"><div class="card-title">☀️ ${L('Good habits', 'நல்ல பழக்கங்கள்')}</div>
      ${h.kidTips.map((x) => `<div class="factor"><span>${x.icon} ${esc(bi(x))}</span></div>`).join('')}</div>
    ${checkupsCard(h, m, at)}
    <div class="card glass"><div class="card-title">🧘 ${L('Play, movement & breathing', 'விளையாட்டு, உடல் இயக்கம், சுவாசம்')}</div>
      ${h.yoga.map((x) => `<div class="factor"><span>🧘 ${esc(bi(x))}</span></div>`).join('')}</div>
    <div class="btn-row"><button class="chip-btn" data-go="guide">🧭 ${L('My Guide', 'என் வழிகாட்டி')}</button></div>`;
  $('#hlSpeak').addEventListener('click', () => speak(spoken));
}

function drawHealth(m) {
  const c = chartOf(m);
  const tz = tzNow();
  const prof = ageProfile(m, { tz });
  const h = healthGuide(c, { gender: m.gender, tz, profile: prof });
  const at = nextMonth9am();
  if (h.minor) { drawMinor(h, m, at); return; }
  const o = h.outlook, con = h.constitution, d = h.diet;
  const chip = (x) => (x?.mayChange ? stabilityChip(c, 'lagna') : '');
  const per = (p, extra = '') => `<div class="hl-per"><p><b style="color:${COLOR[p.lord]}">${GLYPH[p.lord]} ${esc(dasaName(p.lord))}</b> ${esc(bi(p.kind === 'dasa' ? { en: 'Dasa', ta: 'தசை' } : { en: 'Bhukti', ta: 'புக்தி' }))} <span class="muted small">· ${esc(bi(p.dates))}</span>${extra}${chip(p)}</p>
    <p>${esc(bi(p.line))}</p>${p.why.map((w) => `<small>• ${esc(bi(w))}</small>`).join('')}<small>💡 ${esc(bi(p.tips[0]))}</small></div>`;
  const li = (x) => `<li>${esc(bi(x))}${x.from ? ` <small>· ${esc(bi(x.from))}</small>` : ''}</li>`;
  const spoken = [
    `${displayName(m)}. ${bi(h.title)}.`,
    h.now ? bi(h.now) : '',
    `${L('Food to favour', 'சேர்க்க வேண்டியவை')}: ${d.favour.slice(0, 4).map((x) => bi(x)).join(', ')}.`,
    `${L('Food to reduce', 'குறைக்க வேண்டியவை')}: ${d.reduce.slice(0, 3).map((x) => bi(x)).join(', ')}.`,
    bi(h.disclaimer),
  ].filter(Boolean).join(' ');

  $('#hlBody').innerHTML = `
    <div class="hl-note">⚕️ ${esc(bi(o.note))} ${esc(emergencyLine())}</div>
    ${h.birthTimeNote ? `<p class="note-box small${h.needsBirthTime ? ' unv needs-time' : ''}" role="note">🕰️ ${esc(bi(h.birthTimeNote))} ${h.lagnaMayChange ? stabilityChip(c, 'lagna') : ''}</p>` : ''}

    ${h.now ? `<div class="card glass hl-now"><div class="card-title"><span>🌿 ${esc(bi(h.now.label))} · ${esc(displayName(m))}</span><button class="link-btn" id="hlSpeak" aria-label="${esc(L('Read aloud', 'சத்தமாக வாசி'))}">🔊</button></div>
      <div class="mini-label">${L('Age', 'வயது')} ${h.age} · ${esc(bi(h.stage))}</div>
      <div class="big-line">${esc(bi(o.line))}</div>
      ${o.tips.map((t) => `<p class="small">💡 ${esc(bi(t))}</p>`).join('')}
      ${trad(o.note)}</div>` : ''}

    <div class="card glass"><div class="card-title">🪐 ${esc(bi(o.title))}</div>
      ${o.md ? per(o.md) : ''}${o.ad ? per(o.ad) : ''}
      ${o.gochara.map((g) => `<div class="hl-per"><p>${pcol(g.planet)} · ${esc(bi(g))}${g.untilLabel ? ` <span class="muted small">(${esc(L(`until ${g.untilLabel.en}`, `${g.untilLabel.ta} வரை`))})</span>` : ''}${chip(g)}</p><p>${esc(bi(g.line))}</p></div>`).join('')}
      ${o.guruLine ? `<p class="small">🙏 ${esc(bi(o.guruLine))}</p>` : ''}
      ${trad(o.note)}</div>

    ${h.upcoming.items.length ? `<div class="card glass"><div class="card-title">⏭️ ${esc(bi(h.upcoming.title))}</div>
      ${h.upcoming.items.map((u) => per(u, ` <span class="muted small">· ${esc(bi(u.dasaName))}</span>`)).join('')}
      ${trad(h.upcoming.note)}</div>` : ''}

    <div class="card glass"><div class="card-title">📅 ${esc(bi(h.months.title))}</div>
      <div class="hl-mmap">${h.months.items.map((x) => `<div class="hl-month ${x.level}" title="${esc(bi(x.note))}"><b>${x.icon} ${esc(bi(x.label))}</b>${esc(bi(x.area))}${x.level === 'care' ? `<br><span class="tag warn">${L('extra care', 'கூடுதல் கவனம்')}</span>` : ''}</div>`).join('')}</div>
      ${monthRuns(h.months.items).map((g) => `<div class="hl-per"><p><b>${esc(bi(g.label))}</b></p><p class="small">${esc(bi(g.note))}</p></div>`).join('')}
      ${trad(h.months.note)}</div>

    <div class="card glass"><div class="card-title">🛡️ ${esc(bi(h.bodyAreas.title))}</div>
      <p class="muted small">${L('Read', 'கணக்கு')} ${esc(bi(h.bodyAreas.reference))}</p>
      ${h.bodyAreas.items.map((a) => `<div class="factor hl-area"><span><b>${a.icon} ${esc(bi(a))}</b>${chip(a)}
        <br><small>${esc(bi(a.line))}</small>
        ${a.reasons.map((r) => `<br><small class="muted">• ${esc(bi(r))}</small>`).join('')}
        <br><small>💡 ${esc(bi(a.tip))}</small></span></div>`).join('')}
      ${trad(h.bodyAreas.note)}<p class="muted small">📚 ${esc(bi(h.bodyAreas.source))}</p></div>

    <div class="card glass"><div class="card-title"><span>⚖️ ${esc(bi(con.title))}</span><span class="pill">${esc(bi(con.name))}</span></div>
      <div class="hl-dosha">${['vata', 'pitta', 'kapha'].map((k) => `<span>${esc(bi(con.doshas[k]))}</span><span class="gb-bar"><i class="${k === con.dominant ? 'strong' : 'average'}" style="width:${Math.round(con.share[k] * 100)}%"></i></span>`).join('')}</div>
      <p class="small">${esc(bi(con.plain))}</p>
      <p class="muted small">${L('From', 'கணக்கு')}: ${con.why.map((w) => esc(bi(w))).join(' · ')}${con.lagnaBased && h.lagnaMayChange ? stabilityChip(c, 'lagna') : ''}</p>
      ${trad(con.note)}</div>

    <div class="card glass"><div class="card-title">🍲 ${esc(bi(d.title))}</div>
      <div class="hl-cols"><div><h4>✅ ${L('Favour', 'சேர்த்துக்கொள்ளுங்கள்')}</h4><ul>${d.favour.map(li).join('')}</ul></div>
        <div><h4>➖ ${L('Reduce', 'குறைத்துக்கொள்ளுங்கள்')}</h4><ul>${d.reduce.map(li).join('')}</ul></div></div>
      ${trad(d.note)}${m.gender !== 'male' ? `<p class="hl-trad">🤰 ${esc(bi(d.pregnancy))}</p>` : ''}</div>

    <div class="card glass"><div class="card-title">🧘 ${esc(bi(h.routine.title))}</div>
      ${h.routine.daily.map((x) => `<div class="factor"><span>☀️ ${esc(bi(x))}</span></div>`).join('')}
      ${h.routine.yoga.map((x) => `<div class="factor"><span>🧘 ${esc(bi(x))}</span></div>`).join('')}
      ${trad(h.routine.note)}</div>

    ${checkupsCard(h, m, at)}
    ${remediesCard(h)}

    <div class="btn-row"><button class="chip-btn" data-go="roadmap">🗺️ ${L('Dasa Road Map', 'தசா வரைபடம்')}</button><button class="chip-btn" data-go="guide">🧭 ${L('My Guide', 'என் வழிகாட்டி')}</button></div>
    <div class="hl-note">⚕️ ${esc(bi(h.disclaimer))}</div>`;
  $('#hlSpeak')?.addEventListener('click', () => speak(spoken));
}

registerScreen('health', { render: renderHealth, parent: 'home', needsMember: true });
