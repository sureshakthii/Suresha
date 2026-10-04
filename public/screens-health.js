// Health Guide screen (ஆரோக்கிய வழிகாட்டி) — for each family member: age-wise check-ups, body constitution
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

// Revised for the THUNAI brief: astrology is NOT used to derive disease risks, body "weak areas",
// medical check-up schedules, diet rules or monthly illness warnings. This screen shows general,
// age-based wellness habits (not from the chart) and, separately, optional prayer for comfort.
const GENERAL_HABITS = [
  ['Sleep 7–9 hours at a regular time (children need more).', 'சீரான நேரத்தில் 7–9 மணி நேர உறக்கம் (குழந்தைகளுக்கு அதிகம்).'],
  ['Walk or move for about 30 minutes most days, at a pace that suits you.', 'பெரும்பாலான நாட்களில் சுமார் 30 நிமிடம் நடை / உடற்பயிற்சி, உங்களுக்கு ஏற்ற வேகத்தில்.'],
  ['Drink enough water; more in hot weather.', 'போதுமான தண்ணீர்; வெயில் காலத்தில் அதிகம்.'],
  ['Plenty of vegetables, greens, pulses and fruit; less sugar, salt and fried food.', 'காய்கறி, கீரை, பருப்பு, பழங்கள் அதிகம்; சர்க்கரை, உப்பு, பொரித்த உணவு குறைவு.'],
  ['Screen breaks: every 20 minutes, look 20 feet away for 20 seconds.', 'திரை இடைவெளி: 20 நிமிடத்திற்கு ஒருமுறை 20 அடி தூரம் 20 விநாடி பாருங்கள்.'],
  ['Take prescribed medicines exactly as your doctor advised.', 'மருத்துவர் சொன்னபடி மருந்துகளைச் சரியாக எடுத்துக்கொள்ளுங்கள்.'],
  ['Talk to someone you trust when stressed; Tele-MANAS 14416 is free and confidential.', 'மன அழுத்தத்தில் நம்பிக்கையானவரிடம் பேசுங்கள்; Tele-MANAS 14416 இலவசம், ரகசியம்.'],
];

function renderHealth(sec) {
  injectCss();
  const m = activeMember()?.relation !== 'organization' ? activeMember() : people()[0];
  sec.innerHTML = `${subHeader(L('Wellness habits (general)', 'நல்வாழ்வுப் பழக்கங்கள் (பொது)'), L('General guidance — not derived from your horoscope', 'பொது வழிகாட்டல் — ஜாதகத்திலிருந்து பெறப்பட்டதல்ல'))}
    ${m && people().length > 1 ? `<div class="member-switch">${people().map((x) => `<button class="mchip${x.id === m.id ? ' sel' : ''}" data-hid="${esc(x.id)}">${esc(displayName(x))}</button>`).join('')}</div>` : ''}
    <div id="hlBody"></div>`;
  $$('[data-hid]', sec).forEach((b) => b.addEventListener('click', () => { state.activeId = b.dataset.hid; saveFamily(); renderHealth(sec); }));
  drawHealth(m);
}

function drawHealth(m) {
  const h = m ? healthGuide(chartOf(m), { gender: m.gender }) : null;
  const at = nextMonth9am();
  $('#hlBody').innerHTML = `
    <div class="note-box" role="note">⚕️ ${L('Thunai does not diagnose, predict illness or set medical schedules from astrology. For any symptom or concern, please see a doctor. In an emergency call 112.', 'துணை ஜோதிடத்திலிருந்து நோயைக் கண்டறிவதில்லை, கணிப்பதில்லை, மருத்துவ அட்டவணை அமைப்பதில்லை. எந்த அறிகுறிக்கும் மருத்துவரை அணுகுங்கள். அவசரம்: 112.')}</div>
    <div class="card glass"><div class="card-title">🌿 ${L('Everyday habits', 'அன்றாடப் பழக்கங்கள்')}</div>
      <ul>${GENERAL_HABITS.map(([en, tx]) => `<li>${L(en, tx)}</li>`).join('')}</ul>
      <p class="small muted">${L('Source: general public-health guidance. Your doctor’s advice comes first.', 'ஆதாரம்: பொதுச் சுகாதார வழிகாட்டல். உங்கள் மருத்துவர் ஆலோசனையே முதன்மை.')}</p></div>
    ${h ? `<div class="card glass"><div class="card-title">🩺 ${L(`Common check-ups people discuss with their doctor at age ${h.age}`, `${h.age} வயதில் மருத்துவரிடம் பொதுவாகப் பேசப்படும் பரிசோதனைகள்`)}</div>
      ${h.stage.checklist.map((x) => `<div class="hl-check"><span>• ${esc(bi(x))}</span>${remindBtn({ title: bi(x), at })}</div>`).join('')}
      <p class="small muted">${L('Based on age only (not on your chart). Your doctor decides what you need and how often.', 'வயது அடிப்படையில் மட்டும் (ஜாதகம் அல்ல). தேவையையும் கால இடைவெளியையும் மருத்துவரே தீர்மானிப்பார்.')}</p></div>` : ''}
    <div class="card glass"><div class="card-title">🪔 ${L('Optional prayer for peace and well-being', 'அமைதி, நலனுக்கான விருப்ப வழிபாடு')}</div>
      <p class="small">${L('Many families find comfort in prayer. It is a spiritual practice — never a replacement for medical care, and it does not promise a cure.', 'பல குடும்பங்களுக்கு வழிபாடு ஆறுதல் தருகிறது. இது ஆன்மீகப் பழக்கம் — மருத்துவச் சிகிச்சைக்கு மாற்றல்ல; குணமாகும் என்று உறுதியளிப்பதில்லை.')}</p>
      ${h ? h.remedies.healing.map((x) => `<div class="factor"><span>🕉️ ${esc(bi(x))}</span></div>`).join('') : ''}
      ${h ? `<div class="mini-label" style="margin-top:10px">${L('Maha Mrityunjaya mantra', 'மகா மிருத்யுஞ்ஜய மந்திரம்')}</div><p class="hl-mantra">${esc(bi(h.remedies.mantra))}</p>` : ''}
      <button class="chip-btn" id="hlSpeak">🔊 ${L('Read aloud', 'வாசித்துக்காட்டு')}</button></div>`;
  $('#hlSpeak').addEventListener('click', () => speak(GENERAL_HABITS.map(([en, tx]) => L(en, tx)).join(' ')));
}

registerScreen('health', { render: renderHealth, parent: 'home', needsMember: true });
