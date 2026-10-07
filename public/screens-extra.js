// Extra tools competitors offer: North-Indian Ashtakoota Guna Milan (36 gunas) for NRI / inter-state
// marriages, and Chaldean name / mobile / vehicle numerology.
import { gunaMilan } from './shared/ashtakoota.js';
import { nameAdvice, mobileNumberLuck, vehicleNumberLuck } from './shared/numerology.js';
import {
  state, $, $$, L, ta, esc, bi, GLYPH, planetName, nakName, rasiName, starOptions, rasiOfStarPada,
  activeMember, chartOf, registerScreen, subHeader, displayName, toast,
} from './core.js';
import { isAdult, MATCH_ADULTS_NOTE } from './shared/age-guard.js';

// ---------------------------------------------------------------- shared bits
function injectCss() {
  if (document.getElementById('extra-css')) return;
  const st = document.createElement('style');
  st.id = 'extra-css';
  st.textContent = `
  .gm-row { padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,.06); }
  .gm-row:last-child { border-bottom: 0; }
  .gm-row .gm-head { display: flex; justify-content: space-between; gap: 10px; font-size: 13px; margin-bottom: 5px; }
  .gm-row .gm-head b { font-variant-numeric: tabular-nums; color: var(--gold2); white-space: nowrap; }
  .gm-row small { display: block; margin-top: 4px; }
  .gm-center { text-align: center; }
  .nm-num { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; }
  .nm-num .big-score { margin: 4px 0; }
  .nm-sugg { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
  .nm-sugg .chip-btn small { color: var(--muted); }
  .nm-input { font-size: 18px; letter-spacing: .5px; }
  `;
  document.head.append(st);
}
const people = () => state.family.filter((m) => m.relation !== 'organization');
const planetLabel = (p) => (p ? `${GLYPH[p] || ''} ${esc(planetName(p))}` : '—');
const harmonyTag = (h) => (h === 'good' ? `<span class="tag good">${L('In harmony', 'இணக்கம்')}</span>`
  : h === 'change' ? `<span class="tag bad">${L('Consider a change', 'மாற்றம் பரிசீலிக்கவும்')}</span>`
    : `<span class="tag warn">${L('Neutral', 'சமநிலை')}</span>`);
const barClass = (got, max) => (got / max >= 0.75 ? 'strong' : got / max >= 0.4 ? 'average' : 'weak');

// ================================================================ GUNA MILAN
const gmSide = { bride: { mode: null, star: 0, pada: 1, memberId: null }, groom: { mode: null, star: 0, pada: 1, memberId: null } };

function padaOptions(sel) { return [1, 2, 3, 4].map((p) => `<option value="${p}"${p === sel ? ' selected' : ''}>${p}</option>`).join(''); }

// Gunamilan is marriage matching: adults only (shared/age-guard.js).
const adults = () => people().filter((m) => isAdult(m, { tz: state.loc?.tz }));
function gmForm(who) {
  const s = gmSide[who];
  const pool = adults();
  if (!s.mode) s.mode = pool.length ? 'member' : 'star';
  if (s.mode === 'member' && !pool.length) s.mode = 'star';
  if (s.mode === 'member' && !pool.some((m) => m.id === s.memberId)) {
    const pref = pool.find((m) => m.gender === (who === 'bride' ? 'female' : 'male'));
    s.memberId = (pref || pool[0]).id;
  }
  return `<div class="por-side"><h3>${who === 'bride' ? `👰 ${L('Bride', 'மணமகள்')}` : `🤵 ${L('Groom', 'மணமகன்')}`}</h3>
    <div class="seg">${pool.length ? `<button type="button" class="${s.mode === 'member' ? 'sel' : ''}" data-who="${who}" data-mode="member">${L('From family', 'குடும்பத்திலிருந்து')}</button>` : ''}<button type="button" class="${s.mode === 'star' ? 'sel' : ''}" data-who="${who}" data-mode="star">${L('By star', 'நட்சத்திரம் மூலம்')}</button></div>
    ${s.mode === 'member'
    ? `<label>${who === 'bride' ? L('Bride', 'மணமகள்') : L('Groom', 'மணமகன்')}<select data-who="${who}" data-f="memberId">${pool.map((m) => `<option value="${esc(m.id)}"${m.id === s.memberId ? ' selected' : ''}>${esc(displayName(m))}</option>`).join('')}</select></label>`
    : `<label>${L('Birth star', 'நட்சத்திரம்')}<select data-who="${who}" data-f="star">${starOptions(s.star)}</select></label>
       <label>${L('Pada', 'பாதம்')}<select data-who="${who}" data-f="pada">${padaOptions(s.pada)}</select></label>`}
    <p class="muted small" id="gm-${who}-info"></p>
  </div>`;
}

function gmData(who) {
  const s = gmSide[who];
  if (s.mode === 'member') {
    const m = adults().find((x) => x.id === s.memberId);
    const c = m && chartOf(m);
    if (c) return { name: displayName(m), star: c.janmaNakshatra.index, rasi: c.janmaRasi.index };
  }
  return { name: who === 'bride' ? L('Bride', 'மணமகள்') : L('Groom', 'மணமகன்'), star: s.star, rasi: rasiOfStarPada(s.star, s.pada) };
}

function renderGunaMilan(sec) {
  injectCss();
  sec.innerHTML = `${subHeader(L('Guna Milan (36 Gunas)', 'குண மிலன் (36 குணங்கள்)'), L('North-Indian Ashtakoota matching — for NRI and inter-state marriages', 'வட இந்திய அஷ்டகூட பொருத்தம் — வெளிநாடு, பிற மாநிலத் திருமணங்களுக்கு'))}
    <div class="card glass"><div class="card-title">${L('Bride & groom', 'மணமகள் & மணமகன்')}</div>
      ${adults().length < people().length ? `<p class="small muted age-note">🌱 ${esc(bi(MATCH_ADULTS_NOTE))}</p>` : ''}<div class="por-grid">${gmForm('bride')}${gmForm('groom')}</div>
      ${gmStarUsed() ? `<label class="adult-confirm"><input type="checkbox" id="gmAdults"${gmSide.adultsOk ? ' checked' : ''}> ${L('I confirm both people are adults (18 or older). Marriage matching is never done for anyone under 18.', 'இருவரும் 18 வயது அல்லது அதற்கு மேற்பட்டவர்கள் என்று உறுதி செய்கிறேன். 18 வயதுக்குக் குறைவானவர்களுக்குத் திருமணப் பொருத்தம் பார்க்கப்படுவதில்லை.')}</label>` : ''}</div>
    <div id="gmResult"></div>
    <div class="card glass"><p class="small">🪔 ${L('Tamil tradition looks at the 10 poruthams (Rajju and Vedhai as key factors to discuss). Guna Milan is a separate North-Indian system with its own points — it is never added to the poruthams.', 'தமிழ் மரபில் 10 பொருத்தங்கள் பார்க்கப்படுகின்றன (ரஜ்ஜு, வேதை — பேச வேண்டிய முக்கியக் காரணிகள்). குண மிலன் தனி வட இந்திய முறை, அதன் சொந்தப் புள்ளிகள் — பொருத்தங்களுடன் ஒருபோதும் கூட்டப்படுவதில்லை.')}</p>
      <div class="btn-row"><button type="button" class="btn-gold" data-go="couple">💑 ${L('Complete Marriage Porutham', 'முழுமையான திருமணப் பொருத்தம்')}</button>
      <button type="button" class="chip-btn" data-go="porutham">💞 ${L('10 poruthams by star', 'நட்சத்திரம் மூலம் 10 பொருத்தங்கள்')}</button></div></div>`;
  $$('.seg button[data-who]', sec).forEach((b) => b.addEventListener('click', () => { gmSide[b.dataset.who].mode = b.dataset.mode; renderGunaMilan(sec); }));
  $$('select[data-who]', sec).forEach((el) => el.addEventListener('change', () => {
    const s = gmSide[el.dataset.who];
    s[el.dataset.f] = el.dataset.f === 'memberId' ? el.value : Number(el.value);
    showGuna(sec);
  }));
  $('#gmAdults', sec)?.addEventListener('change', (e) => { gmSide.adultsOk = e.target.checked; showGuna(sec); });
  showGuna(sec);
}
/** True when either side is entered by star: there is no birth date to check the age, so the person confirms both are adults. */
const gmStarUsed = () => ['bride', 'groom'].some((w) => gmSide[w].mode !== 'member');

function showGuna(sec) {
  let b, g;
  if (gmStarUsed() && !gmSide.adultsOk) { $('#gmResult', sec).innerHTML = `<div class="card glass"><p class="small">🌱 ${L('Please confirm above that both people are 18 or older to see the Guna Milan.', 'குண மிலன் பார்க்க, இருவரும் 18 வயது அல்லது அதற்கு மேற்பட்டவர்கள் என்று மேலே உறுதி செய்யவும்.')}</p></div>`; return; }
  if (gmSide.bride.mode === 'member' && gmSide.groom.mode === 'member' && gmSide.bride.memberId === gmSide.groom.memberId) { $('#gmResult', sec).innerHTML = `<div class="card glass note-box" role="alert">${L('Please choose two different people — the same person is selected on both sides.', 'இரண்டு வெவ்வேறு நபர்களைத் தேர்ந்தெடுக்கவும் — இரு பக்கமும் ஒரே நபர் தேர்வாகியுள்ளார்.')}</div>`; return; }
  try { b = gmData('bride'); g = gmData('groom'); } catch { toast(L('Could not read the birth details.', 'பிறப்பு விவரங்களைப் படிக்க முடியவில்லை.')); return; }
  for (const [who, d] of [['bride', b], ['groom', g]]) {
    const el = $(`#gm-${who}-info`, sec);
    if (el) el.textContent = `${nakName(d.star)} · ${rasiName(d.rasi)}`;
  }
  const r = gunaMilan(b, g);
  const doshaList = [
    r.doshas.nadi ? `<span class="tag warn">${L('Nadi dosha (traditional)', 'நாடி தோஷம் (மரபு)')}</span>` : `<span class="pill">${L('No Nadi dosha', 'நாடி தோஷம் இல்லை')}</span>`,
    r.doshas.bhakoot ? `<span class="tag warn">${L('Bhakoot dosha (traditional)', 'பகூட் தோஷம் (மரபு)')}</span>` : `<span class="pill">${L('No Bhakoot dosha', 'பகூட் தோஷம் இல்லை')}</span>`,
  ].join(' ');
  $('#gmResult', sec).innerHTML = `<div class="card glass gm-center">
      <div class="muted small">${esc(b.name)} (${esc(nakName(b.star))}) · ${esc(g.name)} (${esc(nakName(g.star))})</div>
      <div class="big-score">${r.total}<small> / ${r.max} ${L('gunas', 'குணங்கள்')}</small></div>
      <div class="gb-bar"><i class="${barClass(r.total, r.max)}" style="width:${Math.round((r.total / r.max) * 100)}%"></i></div>
      <p class="small">${esc(bi(r.scoreLabel))}</p>
      <p class="muted small">${esc(bi(r.note))} ${L('Shown only here — it is not combined with the 10 poruthams.', 'இங்கு மட்டுமே காட்டப்படுகிறது — 10 பொருத்தங்களுடன் இணைக்கப்படவில்லை.')}</p>
    </div>
    <div class="card glass"><div class="card-title">${L('8 Kootas', '8 கூடங்கள்')}</div>
      ${r.rows.map((x) => `<div class="gm-row"><div class="gm-head"><span>${esc(ta() ? x.ta : x.en)}</span><b>${x.got} / ${x.max}</b></div>
        <div class="gb-bar"><i class="${barClass(x.got, x.max)}" style="width:${Math.round((x.got / x.max) * 100)}%"></i></div>
        <small class="muted">${esc(bi(x.detail))}</small></div>`).join('')}
    </div>
    <div class="card glass"><div class="card-title">${L('Doshas', 'தோஷங்கள்')}</div>
      <div>${doshaList}</div>
      ${r.cancellations.length ? `<div class="mini-label" style="margin-top:10px">${L('Cancellations (parihara)', 'தோஷ நிவர்த்தி')}</div>${r.cancellations.map((c) => `<div class="factor"><span>${esc(bi(c))}</span><b class="pos">✓</b></div>`).join('')}`
    : (r.doshas.nadi || r.doshas.bhakoot ? `<p class="muted small">${L('Look at the complete marriage porutham with both full horoscopes for the whole picture.', 'முழுமையான பார்வைக்கு இருவரின் முழு ஜாதகத்துடன் விரிவான திருமணப் பொருத்தம் பாருங்கள்.')}</p>` : '')}
    </div>`;
}
registerScreen('gunamilan', { render: renderGunaMilan, parent: 'home' });

// ================================================================ NUMEROLOGY
const nm = { name: '', memberId: null, date: '', mobile: '', vehicle: '' };

function nmDate() {
  const pool = people();
  if (nm.memberId === '__custom') return nm.date;
  const m = pool.find((x) => x.id === nm.memberId) || activeMember();
  return m?.date || nm.date;
}

function renderNumerology(sec) {
  injectCss();
  const pool = people();
  const am = activeMember();
  if (nm.memberId == null) nm.memberId = am && am.relation !== 'organization' ? am.id : pool[0]?.id || '__custom';
  if (!nm.name) {
    const m = pool.find((x) => x.id === nm.memberId);
    if (m && /^[A-Za-z .'-]+$/.test(m.name || '')) nm.name = m.name;
  }
  sec.innerHTML = `${subHeader(L('Numerology', 'எண் கணிதம்'), L('Name, mobile and vehicle numbers — Chaldean system', 'பெயர், கைப்பேசி, வாகன எண்கள் — கல்தேய முறை'))}
    <div class="card glass"><div class="mini-label">${L('Birth date of', 'பிறந்த தேதி —')}</div>
      <div class="member-switch wrap">${pool.map((m) => `<button type="button" class="mchip${m.id === nm.memberId ? ' sel' : ''}" data-mid="${esc(m.id)}">${esc(displayName(m))}</button>`).join('')}
        <button type="button" class="mchip${nm.memberId === '__custom' ? ' sel' : ''}" data-mid="__custom">📅 ${L('Other date', 'வேறு தேதி')}</button></div>
      ${nm.memberId === '__custom' ? `<label>${L('Date of birth', 'பிறந்த தேதி')}<input type="date" id="nmDate" value="${esc(nm.date)}"></label>` : ''}
    </div>
    <div class="card glass"><div class="card-title">🔤 ${L('Name number', 'பெயர் எண்')}</div>
      <label>${L('Name in English letters (as you sign it)', 'ஆங்கில எழுத்துகளில் பெயர் (கையொப்பமிடுவது போல்)')}<input id="nmName" class="nm-input" autocomplete="off" autocapitalize="words" maxlength="60" value="${esc(nm.name)}"></label>
      <div id="nmNameRes"></div></div>
    <div class="card glass"><div class="card-title">📱 ${L('Mobile number luck', 'கைப்பேசி எண் அதிர்ஷ்டம்')}</div>
      <label>${L('Mobile number', 'கைப்பேசி எண்')}<input id="nmMobile" inputmode="tel" autocomplete="off" maxlength="20" value="${esc(nm.mobile)}"></label>
      <div id="nmMobileRes"></div></div>
    <div class="card glass"><div class="card-title">🚗 ${L('Vehicle number luck', 'வாகன எண் அதிர்ஷ்டம்')}</div>
      <label>${L('Registration number', 'பதிவு எண்')}<input id="nmVehicle" autocomplete="off" autocapitalize="characters" maxlength="16" placeholder="TN 09 AB 1234" value="${esc(nm.vehicle)}"></label>
      <div id="nmVehicleRes"></div></div>
    <p class="muted small">${L('Numerology is a traditional guide. Change a spelling only if you are comfortable using it everywhere.', 'எண் கணிதம் ஒரு பாரம்பரிய வழிகாட்டி. எல்லா இடங்களிலும் பயன்படுத்த வசதியாக இருந்தால் மட்டுமே எழுத்துக்கூட்டலை மாற்றுங்கள்.')}</p>`;
  $$('[data-mid]', sec).forEach((b) => b.addEventListener('click', () => {
    nm.memberId = b.dataset.mid;
    const m = pool.find((x) => x.id === nm.memberId);
    if (m && /^[A-Za-z .'-]+$/.test(m.name || '')) nm.name = m.name;
    renderNumerology(sec);
  }));
  $('#nmDate', sec)?.addEventListener('change', (e) => { nm.date = e.target.value; updateNumerology(sec); });
  $('#nmName', sec).addEventListener('input', (e) => { nm.name = e.target.value; updateNumerology(sec, 'name'); });
  $('#nmMobile', sec).addEventListener('input', (e) => { nm.mobile = e.target.value; updateNumerology(sec, 'mobile'); });
  $('#nmVehicle', sec).addEventListener('input', (e) => { nm.vehicle = e.target.value; updateNumerology(sec, 'vehicle'); });
  updateNumerology(sec);
}

function luckBlock(r) {
  return `<div class="nm-num"><div class="big-score">${r.single}</div><div>${planetLabel(r.planet)}<br>${harmonyTag(r.harmony)}</div></div>
    <p class="small">${esc(bi(r.text))}</p>${r.meaning?.en ? `<p class="muted small">${esc(bi(r.meaning))}</p>` : ''}`;
}

function updateNumerology(sec, only) {
  const date = nmDate();
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(date || '');
  const needDate = `<p class="muted small">${L('Choose a person or enter a birth date to compare.', 'ஒப்பிட ஒருவரைத் தேர்ந்தெடுக்கவும் அல்லது பிறந்த தேதியை உள்ளிடவும்.')}</p>`;
  if (!only || only === 'name') {
    const el = $('#nmNameRes', sec);
    const hasLatin = /[A-Za-z]/.test(nm.name);
    if (!nm.name.trim()) el.innerHTML = `<p class="muted small">${L('Type a name to see its number.', 'எண்ணைக் காண பெயரைத் தட்டச்சு செய்யவும்.')}</p>`;
    else if (!hasLatin) el.innerHTML = `<p class="tag warn block">${L('Please type the name in English letters (A–Z).', 'பெயரை ஆங்கில எழுத்துகளில் (A–Z) தட்டச்சு செய்யவும்.')}</p>`;
    else if (!valid) el.innerHTML = needDate;
    else {
      const a = nameAdvice(nm.name, date);
      el.innerHTML = `<div class="nm-num"><div class="big-score">${a.compound}<small> → ${a.single}</small></div><div>${planetLabel(a.planet)}<br>${harmonyTag(a.harmony)}</div></div>
        <p class="muted small">${esc(bi(a.meaning))}</p>
        <div class="factor"><span>${L('Birth number', 'பிறவி எண்')}</span><b>${a.birth}</b></div>
        <div class="factor"><span>${L('Destiny number', 'விதி எண்')}</span><b>${a.destiny}</b></div>
        <div class="factor"><span>${L('Lucky numbers', 'அதிர்ஷ்ட எண்கள்')}</span><b>${a.lucky.join(', ')}</b></div>
        <p class="small">${esc(bi(a.text))}</p>
        ${a.suggestions.length ? `<div class="mini-label">${L('Spelling suggestions', 'எழுத்துக்கூட்டல் பரிந்துரைகள்')}</div>
          <div class="nm-sugg">${a.suggestions.map((s) => `<button type="button" class="chip-btn" data-sugg="${esc(s.name)}">${esc(s.name)} <small>${s.compound}→${s.single}</small></button>`).join('')}</div>` : ''}`;
      $$('[data-sugg]', el).forEach((b) => b.addEventListener('click', () => {
        nm.name = b.dataset.sugg;
        $('#nmName', sec).value = nm.name;
        updateNumerology(sec, 'name');
      }));
    }
  }
  if (!only || only === 'mobile') {
    const el = $('#nmMobileRes', sec);
    const digits = nm.mobile.replace(/\D/g, '');
    el.innerHTML = !digits ? `<p class="muted small">${L('Enter a mobile number to check its total.', 'கூட்டு எண்ணைப் பார்க்க கைப்பேசி எண்ணை உள்ளிடவும்.')}</p>`
      : !valid ? needDate : luckBlock(mobileNumberLuck(digits, date));
  }
  if (!only || only === 'vehicle') {
    const el = $('#nmVehicleRes', sec);
    const r = valid && /\d/.test(nm.vehicle) ? vehicleNumberLuck(nm.vehicle, date) : null;
    el.innerHTML = !/\d/.test(nm.vehicle) ? `<p class="muted small">${L('Enter the registration number; its digits are added.', 'பதிவு எண்ணை உள்ளிடவும்; அதன் இலக்கங்கள் கூட்டப்படும்.')}</p>`
      : !r ? needDate : `${luckBlock(r)}<p class="muted small">${L('With letters (Chaldean values) the total is', 'எழுத்துகளையும் (கல்தேய மதிப்பு) சேர்த்தால் கூட்டு எண்')} ${r.withLetters.single}.</p>`;
  }
}
registerScreen('numerology', { render: renderNumerology, parent: 'home' });
