// Health & Planets screen (ஆரோக்கியம் & கிரகங்கள்) — for each family member: age-wise check-ups, body constitution
// (வாதம் / பித்தம் / கபம்), body areas to protect, the present Dasa–Bhukti + gochara outlook, a 12-month strip,
// what to eat and avoid, daily habits & yoga and simple remedies. Prevention only — never medical advice.
import { healthGuide } from './shared/health.js';
import {
  state, $, $$, L, esc, bi, GLYPH, COLOR, planetName, monthName, activeMember, chartOf, registerScreen, subHeader,
  speak, displayName, saveFamily,
} from './core.js';
import { isLocked, lockCard } from './growth.js';
import { remindBtn } from './remind.js';

const people = () => state.family.filter((m) => m.relation !== 'organization');
const mY = (d) => `${monthName(new Date(d).getUTCMonth())} ${new Date(d).getUTCFullYear()}`;
const lvTag = (lv) => `<span class="tag ${lv === 'good' ? 'good' : lv === 'steady' ? 'warn' : 'bad'}">${lv === 'good' ? L('Good', 'நன்று') : lv === 'steady' ? L('Steady', 'நிலை') : L('Care', 'கவனம்')}</span>`;
const DOSHA_BAR = { vata: 'average', pitta: 'weak', kapha: 'strong' };
const DOSHA_ICON = { vata: '🌬️', pitta: '🔥', kapha: '💧' };

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
  .hl-months { grid-template-columns: repeat(6, 1fr); }
  .hl-months .rm-year { min-width: 0; }
  .hl-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .hl-cols h4 { margin: 0 0 6px; font-size: 14px; }
  .hl-cols .eat h4 { color: var(--good); } .hl-cols .avoid h4 { color: var(--bad); }
  .hl-cols ul { margin: 0; padding-left: 18px; font-size: 13px; color: var(--text); }
  .hl-cols li { margin: 0 0 6px; }
  .hl-cols li small { color: var(--muted); }
  .hl-check { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 8px 0; border-bottom: 1px solid rgba(var(--ink-rgb), .06); font-size: 13px; }
  .hl-area p { margin: 4px 0; }
  .hl-mantra { font-size: 14px; color: var(--gold2); line-height: 1.6; }
  @media (max-width: 360px) { .hl-cols { grid-template-columns: 1fr; } .hl-months { grid-template-columns: repeat(4, 1fr); } }`;
  document.head.append(s);
}

function renderHealth(sec) {
  injectCss();
  const m = activeMember()?.relation !== 'organization' ? activeMember() : people()[0];
  if (!m) { sec.innerHTML = `${subHeader(L('Health & Planets', 'ஆரோக்கியம் & கிரகங்கள்'))}<p class="muted center">${L('Add a family member first.', 'முதலில் குடும்ப உறுப்பினரைச் சேர்க்கவும்.')}</p>`; return; }
  sec.innerHTML = `${subHeader(L('Health & Planets', 'ஆரோக்கியம் & கிரகங்கள்'), L('From your Jathagam, Dasa–Bhukti, Gochara and Peyarchi', 'ஜாதகம், தசா–புக்தி, கோசாரம், பெயர்ச்சி அடிப்படையில்'))}
    ${people().length > 1 ? `<div class="member-switch">${people().map((x) => `<button class="mchip${x.id === m.id ? ' sel' : ''}" data-hid="${esc(x.id)}">${esc(displayName(x))}</button>`).join('')}</div>` : ''}
    <div id="hlBody"><div class="loader"><i></i><i></i><i></i></div></div>`;
  $$('[data-hid]', sec).forEach((b) => b.addEventListener('click', () => { state.activeId = b.dataset.hid; saveFamily(); renderHealth(sec); }));
  setTimeout(() => { if (state.view === 'health') drawHealth(m); }, 30);
}

function drawHealth(m) {
  const c = chartOf(m);
  const h = healthGuide(c, { gender: m.gender });
  const locked = isLocked('predictions');
  const con = h.constitution;
  const p = h.period;
  const at = nextMonth9am();
  const disclaimer = `<div class="hl-note">⚕️ ${esc(bi(h.disclaimer))} ${L('Emergency: 112.', 'அவசரம்: 112.')}</div>`;
  const spoken = [
    `${displayName(m)}. ${L('Age', 'வயது')} ${h.age}, ${bi(h.stage)}.`,
    `${L('Body constitution', 'உடல்வாகு')}: ${bi(con.name)}.`,
    `${L('Areas to protect', 'பாதுகாக்க வேண்டிய பகுதிகள்')}: ${h.bodyAreas.map((a) => bi(a)).join(', ')}.`,
    bi(p.summary),
    `${L('Eat', 'உண்ண வேண்டியவை')}: ${h.diet.eat.slice(0, 3).map((x) => bi(x)).join(', ')}.`,
    `${L('Avoid', 'தவிர்க்க வேண்டியவை')}: ${h.diet.avoid.slice(0, 2).map((x) => bi(x)).join(', ')}.`,
    bi(h.disclaimer),
  ].join(' ');
  const eatList = locked ? h.diet.eat.slice(0, 3) : h.diet.eat;
  const avoidList = locked ? h.diet.avoid.slice(0, 3) : h.diet.avoid;
  const li = (x) => `<li>${esc(bi(x))}${x.from ? ` <small>· ${esc(bi(x.from))}</small>` : ''}</li>`;

  $('#hlBody').innerHTML = `
    ${disclaimer}
    <div class="card glass"><div class="card-title"><span>🌿 ${esc(displayName(m))}</span><button class="link-btn" id="hlSpeak" aria-label="${esc(L('Read aloud', 'வாசித்துக்காட்டு'))}">🔊</button></div>
      <div class="mini-label">${L('Age', 'வயது')} ${h.age} · ${L('Life stage', 'வாழ்க்கைப் பருவம்')}</div>
      <div class="big-line">${esc(bi(h.stage))}</div>
      <p class="small">${esc(bi(p.summary))}</p>
</div>

    <div class="card glass"><div class="card-title">🩺 ${L('Check-ups for your age', 'உங்கள் வயதுக்கான பரிசோதனைகள்')}</div>
      ${h.stage.checklist.map((x) => `<div class="hl-check"><span>✔️ ${esc(bi(x))}${x.forGender === 'female' && !m.gender ? ` <span class="pill">${L('women', 'பெண்கள்')}</span>` : ''}</span>${remindBtn({ title: `${bi(x)} — ${L('yearly check-up', 'ஆண்டுப் பரிசோதனை')}`, at })}</div>`).join('')}
      <p class="muted small">👨‍⚕️ ${esc(bi(h.stage.note))}</p></div>

    <div class="card glass"><div class="card-title"><span>⚖️ ${L('Body constitution', 'உடல்வாகு')}</span><span class="pill">${esc(bi(con.name))}</span></div>
      ${['vata', 'pitta', 'kapha'].map((d) => `<div class="gb-row static"><span class="gb-name">${DOSHA_ICON[d]} ${esc(bi(con.doshas[d]))}</span><span class="gb-bar"><i class="${DOSHA_BAR[d]}" style="width:${con[d]}%"></i></span><b>${con[d]}%</b></div>`).join('')}
      <p class="small">${esc(bi(con.desc))}</p>
      <p class="muted small">${L('From', 'கணக்கு')}: ${con.why.map((w) => esc(bi(w))).join(' · ')}</p></div>

    <div class="card glass"><div class="card-title">🛡️ ${L('Body areas to protect', 'பாதுகாக்க வேண்டிய உடல் பகுதிகள்')}</div>
      ${h.bodyAreas.map((a) => `<div class="factor hl-area"><span><b>${a.icon} ${esc(bi(a))}</b>
        ${a.reasons.map((r) => `<br><small class="muted">• ${esc(bi(r))}</small>`).join('')}
        <br><small>💡 ${esc(bi(a.tip))}</small></span>${a.level === 'care' ? `<span class="tag warn">${L('Care', 'கவனம்')}</span>` : `<span class="pill">${L('Watch', 'கவனிக்க')}</span>`}</div>`).join('')}
      <p class="muted small">${L('These are tendencies to protect, not illnesses.', 'இவை பாதுகாக்க வேண்டிய போக்குகள் மட்டுமே, நோய்கள் அல்ல.')}</p></div>

    <div class="card glass"><div class="card-title"><span>🪐 ${L('Current period & transits', 'நடப்புக் காலம் & கோசாரம்')}</span>${lvTag(p.level)}</div>
      ${p.md ? `<p><b style="color:${COLOR[p.md.lord]}">${GLYPH[p.md.lord]} ${esc(planetName(p.md.lord))}</b> ${L('Dasa', 'தசை')}${p.ad ? ` · <b style="color:${COLOR[p.ad.lord]}">${GLYPH[p.ad.lord]} ${esc(planetName(p.ad.lord))}</b> ${L('Bhukti', 'புக்தி')} <span class="muted small">(${L('till', 'வரை')} ${mY(p.ad.end)})</span>` : ''}</p>` : ''}
      ${p.dasaNotes.map((n) => `<p class="small">• ${esc(bi(n))}</p>`).join('')}
      ${p.gochara.map((n) => `<div class="factor"><span>${n.kind === 'good' ? '🌟' : '🤍'} ${esc(bi(n))}</span></div>`).join('')}
      <p class="small">${p.guruBalam ? `🙏 ${L('Guru Balam is with you — a protective shield.', 'குரு பலம் உள்ளது — பாதுகாப்புக் கவசம்.')}` : `🙏 ${L('Thursday prayer to Dakshinamurthy strengthens Guru\'s protection.', 'வியாழன் தட்சிணாமூர்த்தி வழிபாடு குருவின் பாதுகாப்பைப் பலப்படுத்தும்.')}`}</p></div>

    ${locked ? lockCard(L('The 12-month health strip, the full food guide and your fasting day are part of Premium.', '12 மாத ஆரோக்கியப் பட்டை, முழு உணவு வழிகாட்டி, உங்கள் விரத நாள் பிரீமியத்தில் உள்ளன.')) : `
    <div class="section-title">📅 ${L('Next 12 months', 'அடுத்த 12 மாதங்கள்')}</div>
    <div class="rm-years hl-months">${h.months.map((x) => { const [y, mo] = x.month.split('-').map(Number); return `<div class="rm-year ${x.level}" title="${esc(bi(x.note))}"><b>${esc(monthName(mo - 1))}</b><span class="muted small">${y}</span><div class="rm-meter"><i style="height:${Math.max(15, Math.min(100, Math.round(55 + x.score * 15)))}%"></i></div><span class="small">${x.marsCaution ? '⚠️' : x.level === 'good' ? '🌿' : x.level === 'care' ? '🤍' : '•'}</span></div>`; }).join('')}</div>
    <div class="card glass">${h.months.filter((x) => x.level !== 'steady').slice(0, 6).map((x) => { const [y, mo] = x.month.split('-').map(Number); return `<div class="factor"><span><b>${esc(monthName(mo - 1))} ${y}</b> · ${esc(bi(x.note))}</span>${lvTag(x.level)}</div>`; }).join('') || `<p class="small">${L('A steady year — keep your routine.', 'நிலையான ஆண்டு — வழக்கத்தைத் தொடருங்கள்.')}</p>`}
      <p class="muted small">🌿 ${L('Good', 'நன்று')} · • ${L('Steady', 'நிலை')} · 🤍 ${L('Care', 'கவனம்')} · ⚠️ ${L('Injury / fever caution', 'காயம் / காய்ச்சல் கவனம்')}</p></div>`}

    <div class="card glass"><div class="card-title">🍲 ${L('What to eat & avoid', 'உண்ண வேண்டியவை & தவிர்க்க வேண்டியவை')}</div>
      <div class="hl-cols"><div class="eat"><h4>✅ ${L('Eat', 'உண்ணுங்கள்')}</h4><ul>${eatList.map(li).join('')}</ul></div>
        <div class="avoid"><h4>🚫 ${L('Avoid', 'தவிர்க்கவும்')}</h4><ul>${avoidList.map(li).join('')}</ul></div></div>
      ${locked ? '' : `<div class="factor"><span>🕯️ ${L('Fasting day', 'விரத நாள்')}: <b>${esc(bi(h.diet.fasting.day))}</b><br><small class="muted">${esc(bi(h.diet.fasting.why))}</small></span></div>`}
      <p class="muted small">${L('General wellness food — follow your doctor\'s diet if you have a condition.', 'பொது நல உணவு மட்டுமே — உடல்நலப் பிரச்சினை இருந்தால் மருத்துவர் சொல்லும் உணவையே பின்பற்றுங்கள்.')}</p></div>

    <div class="card glass"><div class="card-title">🧘 ${L('Daily habits & yoga', 'தினசரிப் பழக்கங்கள் & யோகா')}</div>
      ${h.diet.habits.map((x) => `<div class="factor"><span>☀️ ${esc(bi(x))}</span></div>`).join('')}
      ${h.yoga.map((x) => `<div class="factor"><span>🧘 ${esc(bi(x))}</span></div>`).join('')}
      <p class="muted small">${L('Go gently and stop if anything hurts.', 'மெதுவாகச் செய்யுங்கள்; வலி இருந்தால் நிறுத்துங்கள்.')}</p></div>

    <div class="card glass"><div class="card-title">🪔 ${L('Remedies for health', 'ஆரோக்கியப் பரிகாரங்கள்')}</div>
      ${h.remedies.planets.map((r) => `<div class="factor"><span><b style="color:${COLOR[r.planet]}">${GLYPH[r.planet]} ${esc(planetName(r.planet))}</b> <small class="muted">(${esc(bi(r.governs))})</small>
        <br><small>🙏 ${esc(bi(r.deity))} · ${esc(bi(r.mantra))}</small><br><small>🌱 ${esc(bi(r.free))}</small><br><small class="muted">🎁 ${esc(bi(r.charity))}</small></span></div>`).join('')}
      ${h.remedies.healing.map((x) => `<div class="factor"><span>🕉️ ${esc(bi(x))}</span></div>`).join('')}
      <div class="mini-label" style="margin-top:10px">${L('Maha Mrityunjaya mantra', 'மகா மிருத்யுஞ்ஜய மந்திரம்')}</div>
      <p class="hl-mantra">${esc(bi(h.remedies.mantra))}</p>
      <p class="muted small">${esc(bi(h.remedies.mantra.how))}</p></div>

    <div class="btn-row"><button class="chip-btn" data-go="roadmap">🗺️ ${L('Life Road Map', 'வாழ்க்கை வரைபடம்')}</button><button class="chip-btn" data-go="guide">🧭 ${L('My Guide', 'என் வழிகாட்டி')}</button></div>
    ${disclaimer}`;
  $('#hlSpeak').addEventListener('click', () => speak(spoken));
}

registerScreen('health', { render: renderHealth, parent: 'home', needsMember: true });
