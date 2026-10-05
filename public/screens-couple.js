// Married-life analysis (திருமண வாழ்க்கை ஆய்வு) and business-partner matching (வணிகக் கூட்டாளி பொருத்தம்):
// full birth details of both people, deep compatibility and a year-by-year timeline.
import { birthChart } from './shared/astro.js';
import { marriageReport, partnershipReport } from './shared/couple.js';
import { VERDICTS } from './shared/porutham.js';
import {
  state, chartOf, $, $$, L, ta, esc, bi, GLYPH, planetName, nakName, rasiName, fmtIsoDate, registerScreen, subHeader, aiTask, speak, toast,
  displayName, saveFamily, placeName,
} from './core.js';
import { placeSearch } from './account.js';
import { isLocked, lockCard } from './growth.js';

const iso = (d) => new Date(d.getTime() + (state.loc?.tz ?? 5.5) * 3600000).toISOString().slice(0, 10);
const monthYear = (d) => new Date(d).toLocaleDateString(ta() ? 'ta-IN' : 'en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' });
export const forms = {}; // per-slot entered data, kept while the app is open

/** Person input: pick a family member or enter full birth details. */
export function personBlock(slot, title, { gender, nth = 0 } = {}) {
  const pool = state.family.filter((m) => m.relation !== 'organization');
  const f = forms[slot] ||= { mode: pool.length ? 'family' : 'new', memberId: (gender ? pool.find((m) => m.gender === gender) || pool[0] : pool[nth] || pool[0])?.id || null, gender: gender || 'male' };
  return `<div class="card glass person-block" data-slot="${slot}"><div class="card-title">${title}</div>
    ${pool.length ? `<div class="seg"><button type="button" data-mode="family" class="${f.mode === 'family' ? 'sel' : ''}">${L('From family', 'குடும்பத்திலிருந்து')}</button><button type="button" data-mode="new" class="${f.mode === 'new' ? 'sel' : ''}">${L('Enter details', 'விவரம் உள்ளிடு')}</button></div>` : ''}
    ${f.mode === 'family' && pool.length
    ? `<label>${L('Person', 'நபர்')}<select data-f="memberId">${pool.map((m) => `<option value="${esc(m.id)}"${m.id === f.memberId ? ' selected' : ''}>${esc(displayName(m))}</option>`).join('')}</select></label>`
    : `<div class="row2"><label>${L('Name', 'பெயர்')}<input data-f="name" value="${esc(f.name || '')}" maxlength="60"></label>
        <label>${L('Gender', 'பாலினம்')}<select data-f="gender">${[['male', 'Male', 'ஆண்'], ['female', 'Female', 'பெண்']].map(([id, en, tx]) => `<option value="${id}"${(f.gender || gender) === id ? ' selected' : ''}>${L(en, tx)}</option>`).join('')}</select></label></div>
      <div class="row2"><label>${L('Date of birth', 'பிறந்த தேதி')}<input type="date" data-f="date" value="${esc(f.date || '')}"></label>
        <label>${L('Time of birth', 'பிறந்த நேரம்')}<input type="time" step="1" data-f="time" value="${esc(f.time || '')}"></label></div>
      <label class="place-wrap">${L('Place of birth', 'பிறந்த இடம்')}<input data-f="place" value="${esc(f.place || '')}" placeholder="${esc(L('Type a city…', 'நகரம் தட்டச்சு செய்க…'))}"><ul class="suggest" hidden></ul></label>
      ${f.lat != null ? `<p class="muted small">📍 ${esc(placeName(f.place))} · ${Number(f.lat).toFixed(2)}, ${Number(f.lon).toFixed(2)} · ${L('UTC', 'நேர மண்டலம்')}${f.tz >= 0 ? '+' : ''}${f.tz}</p>` : ''}
      <label class="check-row"><input type="checkbox" data-f="save"${f.save ? ' checked' : ''}> ${L('Save to my family list', 'என் குடும்பப் பட்டியலில் சேமி')}</label>`}
  </div>`;
}

export function wirePersonBlocks(sec, rerender) {
  $$('.person-block', sec).forEach((blk) => {
    const slot = blk.dataset.slot;
    const f = forms[slot];
    $$('[data-mode]', blk).forEach((b) => b.addEventListener('click', () => { f.mode = b.dataset.mode; rerender(); }));
    $$('[data-f]', blk).forEach((el) => {
      const set = () => { f[el.dataset.f] = el.type === 'checkbox' ? el.checked : el.value; };
      el.addEventListener('change', set);
      el.addEventListener('input', set);
    });
    const place = $('[data-f="place"]', blk);
    if (place) placeSearch(place, $('.suggest', blk), (p) => { Object.assign(f, { place: p.name, lat: p.lat, lon: p.lon, tz: p.tz }); rerender(); });
  });
}

/** Resolve a slot into { chart, member, name } or throw a friendly error. */
function resolve(slot, label) {
  const f = forms[slot];
  if (f.mode === 'family' && state.family.length) {
    const m = state.family.find((x) => x.id === f.memberId) || state.family.find((x) => x.relation !== 'organization');
    return { member: m, chart: chartOf(m), name: { en: m.name, ta: displayName(m) } };
  }
  if (!f.name || !f.date || !f.time || f.lat == null) throw new Error(L(`Please enter ${label}'s name, birth date, time and place (pick the city from the list).`, `${label} — பெயர், பிறந்த தேதி, நேரம், இடம் (பட்டியலிலிருந்து நகரம்) உள்ளிடவும்.`));
  const m = { id: `${slot}_${f.date}_${f.time}`, name: f.name.trim(), gender: f.gender, date: f.date, time: f.time.length === 5 ? `${f.time}:00` : f.time, place: f.place, lat: Number(f.lat), lon: Number(f.lon), tz: Number(f.tz), relation: 'other' };
  if (f.save && !state.family.some((x) => x.date === m.date && x.time === m.time && x.name === m.name)) {
    state.family.push({ ...m, id: Math.random().toString(36).slice(2, 10) });
    saveFamily();
    toast(L('Saved to family', 'குடும்பத்தில் சேமிக்கப்பட்டது'));
  }
  return { member: m, chart: birthChart(m), name: { en: m.name, ta: m.name } };
}

const bar = (s) => `<span class="gb-bar"><i class="${s >= 66 ? 'strong' : s >= 50 ? 'average' : 'weak'}" style="width:${s}%"></i></span>`;
const areaRows = (areas) => areas.map((x) => `<details class="area-row"><summary><span class="gb-name">${esc(bi(x.name))}</span>${bar(x.score)}<b>${x.score}</b></summary>${x.reasons.map((r) => `<div class="small">• ${esc(bi(r))}</div>`).join('')}</details>`).join('');
const dasaPair = (y, names) => `${esc(bi(names[0]))}: ${GLYPH[y.a.md]}${esc(planetName(y.a.md))}/${esc(planetName(y.a.ad))} · ${esc(bi(names[1]))}: ${GLYPH[y.b.md]}${esc(planetName(y.b.md))}/${esc(planetName(y.b.ad))}`;
function timelineHtml(rows, names) {
  return `<div class="tl">${rows.map((y) => `<details class="tl-year ${y.level}"><summary><b>${y.year}</b><span class="tl-bar"><i style="width:${y.score}%"></i></span><span class="tag ${y.level === 'good' ? 'good' : y.level === 'steady' ? 'warn' : 'bad'}">${y.level === 'good' ? L('Good', 'நன்று') : y.level === 'steady' ? L('Steady', 'நிலை') : L('Care', 'கவனம்')}</span></summary>
    <div class="small muted">${dasaPair(y, names)}</div>${y.themes.map((t) => `<div class="small">${t.kind === 'good' ? '🌟' : '🤍'} ${esc(bi(t))}</div>`).join('') || `<div class="small">${L('An ordinary, steady year.', 'சாதாரணமான, நிலையான ஆண்டு.')}</div>`}</details>`).join('')}</div>`;
}

// ================================================================ MARRIED LIFE
const coupleUi = { wedding: null };
function renderCouple(sec) {
  coupleUi.wedding ||= iso(new Date());
  const rerender = () => renderCouple(sec);
  sec.innerHTML = `${subHeader(L('Complete Marriage Porutham', 'முழுமையான திருமணப் பொருத்தம்'), L('Not only 10 poruthams — birth date, time and place of both: papa samyam, dasa sandhi, lagna, 7th/8th/5th/2nd houses, mana porutham and the years after the wedding', '10 பொருத்தம் மட்டுமல்ல — இருவரின் பிறந்த தேதி, நேரம், இடம்: பாப சாம்யம், தசா சந்தி, லக்னம், 7/8/5/2 பாவங்கள், மனப் பொருத்தம், திருமணத்திற்குப் பின் ஆண்டுகள்'), 'home')}
    ${personBlock('bride', `👰 ${L('Bride', 'மணப்பெண்')}`, { gender: 'female' })}
    ${personBlock('groom', `🤵 ${L('Groom', 'மணமகன்')}`, { gender: 'male' })}
    <div class="card glass"><label>${L('Wedding date (done or planned)', 'திருமண தேதி (நடந்தது அல்லது திட்டமிட்டது)')}<input type="date" id="wedDate" value="${esc(coupleUi.wedding)}"></label>
      <button class="btn-gold" id="coupleBtn">💞 ${L('Analyse married life', 'திருமண வாழ்க்கையை ஆய்வு செய்')}</button><p class="err" id="coupleErr"></p></div>
    <div id="coupleOut"></div>`;
  wirePersonBlocks(sec, rerender);
  $('#wedDate').addEventListener('change', (e) => { coupleUi.wedding = e.target.value; });
  $('#coupleBtn').addEventListener('click', () => {
    let bride, groom;
    try { bride = resolve('bride', L('Bride', 'மணப்பெண்')); groom = resolve('groom', L('Groom', 'மணமகன்')); } catch (e) { $('#coupleErr').textContent = e.message; return; }
    $('#coupleErr').textContent = '';
    $('#coupleOut').innerHTML = '<div class="loader"><i></i><i></i><i></i></div>';
    setTimeout(() => showCouple(bride, groom), 30);
  });
}

function showCouple(bride, groom) {
  const [y, mo, d] = coupleUi.wedding.split('-').map(Number);
  const wedding = new Date(Date.UTC(y, mo - 1, d, 6));
  const names = [bride.name, groom.name];
  const r = marriageReport(bride.chart, groom.chart, { weddingDate: wedding, names });
  const verdictText = { excellent: L('Excellent match — a blessed married life', 'உத்தமப் பொருத்தம் — ஆசீர்வதிக்கப்பட்ட திருமண வாழ்க்கை'), good: L('Good match — happy with understanding', 'நல்ல பொருத்தம் — புரிதலுடன் மகிழ்ச்சி'), effort: L('Workable — love, patience and parigaram make it strong', 'முயற்சியால் வலுவாகும் — அன்பு, பொறுமை, பரிகாரம்'), consult: L('Please consult your family astrologer with both horoscopes before deciding', 'முடிவெடுக்கும் முன் இரு ஜாதகங்களுடன் குடும்ப ஜோதிடரை அணுகவும்') }[r.verdict];
  const locked = isLocked('predictions');
  const icon = (st) => (st === 'uttamam' ? '✅' : st === 'madhyamam' ? '🟡' : '❌');
  $('#coupleOut').innerHTML = `
    <div class="card glass verdict-card"><div class="muted small">${esc(bi(names[0]))} (${esc(nakName(bride.chart.janmaNakshatra.index))}) · ${esc(bi(names[1]))} (${esc(nakName(groom.chart.janmaNakshatra.index))})</div>
      <div class="big-score">${r.total}<small>/100</small></div><div class="verdict-big ${r.verdict === 'excellent' || r.verdict === 'good' ? 'DO' : r.verdict === 'effort' ? 'CAUTION' : 'AVOID'}">${esc(verdictText)}</div>
      <div class="muted small">${L('10 poruthams', '10 பொருத்தங்கள்')}: ${r.porutham.score}/10 · ${L('Mana porutham', 'மனப் பொருத்தம்')}: ${r.mana.overall}/100 · ${L('Deep checks', 'ஆழ்ந்த ஆய்வு')}: ${r.deep.score}/100</div></div>
    <div class="note-box" role="note">${L('This is a traditional interpretation to support a family conversation — not a verdict on anyone’s worth or suitability, and no guarantee of a happy or unhappy marriage. Health is never judged from a chart: a pre-marriage medical check-up is the reliable way.', 'இது குடும்ப உரையாடலுக்கு உதவும் பாரம்பரிய விளக்கம் மட்டுமே — யாருடைய மதிப்பையோ தகுதியையோ தீர்மானிப்பதல்ல; மகிழ்ச்சியான அல்லது மகிழ்ச்சியற்ற திருமணத்திற்கு உத்தரவாதமும் அல்ல. உடல்நலம் ஜாதகத்திலிருந்து மதிப்பிடப்படாது; திருமணத்திற்கு முன் மருத்துவப் பரிசோதனையே நம்பகமானது.')}</div>
    <details class="card glass"><summary><b>📋 ${L('10 Poruthams', '10 பொருத்தங்கள்')} — ${esc(bi(VERDICTS[r.porutham.verdict]))}</b></summary>
      ${r.porutham.rows.map((x) => `<div class="factor"><span>${icon(x.status)} ${esc(ta() ? x.ta : x.en)}<br><small class="muted">${esc(bi(x.detail))}</small></span></div>`).join('')}
      ${r.samyam.map((n) => `<div class="factor"><span>${esc(bi(n))}</span><b class="${n.ok ? 'pos' : 'neg'}">${n.ok ? '✓' : '!'}</b></div>`).join('')}</details>
    <div class="card glass"><div class="card-title">🛡️ ${L('Beyond the 10 poruthams', '10 பொருத்தத்திற்கும் மேலான ஆய்வு')} <span class="pill">${r.deep.passed}/${r.deep.checks.length}</span></div>
      ${r.deep.checks.map((c) => `<div class="deep-row"><span>${c.ok ? '✅' : '🟡'} <b>${esc(bi(c.name))}</b><br><small class="muted">${esc(bi(c.note))}</small></span></div>`).join('')}
    ${locked ? lockCard(L('Mana porutham, children and wealth timing and the 25-year married-life timeline are part of Premium.', 'மனப் பொருத்தம், குழந்தை & செல்வ காலம், 25 ஆண்டு திருமண வாழ்க்கைக் காலவரிசை பிரீமியத்தில் உள்ளன.')) : `
    <div class="card glass"><div class="card-title">💗 ${L('Mana Porutham — mind & life compatibility', 'மனப் பொருத்தம் — மனமும் வாழ்க்கையும்')}</div>${areaRows(r.mana.areas)}
      ${r.mana.karmic ? `<p class="small">✨ ${L('Rahu/Ketu link your charts — a strong karmic bond; keep honesty and shared prayer at the centre.', 'ராகு/கேது உங்கள் ஜாதகங்களை இணைக்கிறது — வலுவான கர்ம பந்தம்; நேர்மையும் சேர்ந்த வழிபாடும் மையமாக இருக்கட்டும்.')}</p>` : ''}</div>
    <div class="card glass"><div class="card-title">🏠 ${L('Marriage houses of each person', 'ஒவ்வொருவரின் திருமண பாவங்கள்')}</div>
      ${r.deep.houses.bride.map((h, i) => { const g = r.deep.houses.groom[i]; return `<details class="area-row"><summary><span class="gb-name">${esc(bi(h.name))}</span><small>👰 ${h.score} · 🤵 ${g.score}</small></summary><div class="small"><b>${esc(bi(names[0]))}</b></div>${h.notes.map((x) => `<div class="small">• ${esc(bi(x))}</div>`).join('')}<div class="small"><b>${esc(bi(names[1]))}</b></div>${g.notes.map((x) => `<div class="small">• ${esc(bi(x))}</div>`).join('')}</details>`; }).join('')}
      <p class="small">⚖️ ${L('Papa samyam points', 'பாப சாம்யப் புள்ளிகள்')}: 👰 ${r.deep.papa.bride.total} · 🤵 ${r.deep.papa.groom.total}</p></div>
    <div class="card glass"><div class="card-title">🌟 ${L('Key moments of married life', 'திருமண வாழ்க்கையின் முக்கிய தருணங்கள்')}</div>
      <div class="factor"><span>👶 ${L('Children blessing', 'குழந்தை பாக்கியம்')}</span><b class="zero">${r.children.length ? r.children.slice(0, 2).map((w) => `${monthYear(w.from)} – ${monthYear(w.to)}`).join(', ') : r.childFallback ? monthYear(r.childFallback.peakFrom) : L('with prayer & care', 'வழிபாடு, கவனத்துடன்')}</b></div>
      <div class="factor"><span>🏡 ${L('Own home together', 'சொந்த வீடு')}</span><b class="zero">${r.home.length ? `${monthYear(r.home[0].from)} – ${monthYear(r.home[0].to)}` : (r.goodYears[0] ? `${r.goodYears.find((x) => x.themes.some((t) => /Wealth/.test(t.en)))?.year || r.goodYears[0].year}` : '—')}</b></div>
      <div class="factor"><span>💰 ${L('Best years for wealth', 'செல்வ வளர்ச்சி ஆண்டுகள்')}</span><b class="zero">${r.timeline.filter((x) => x.themes.some((t) => /Wealth grows/.test(t.en))).slice(0, 4).map((x) => x.year).join(', ') || '—'}</b></div>
      <div class="factor"><span>🤍 ${L('Years needing extra care', 'கூடுதல் கவனம் தேவைப்படும் ஆண்டுகள்')}</span><b class="${r.careYears.length ? 'neg' : 'pos'}">${r.careYears.map((x) => x.year).join(', ') || L('None major', 'பெரிதாக இல்லை')}</b></div></div>
    ${r.strengths.length || r.challenges.length ? `<div class="card glass">${r.strengths.length ? `<p>💪 <b>${L('Strengths', 'பலங்கள்')}:</b> ${r.strengths.map((x) => esc(bi(x))).join(', ')}</p>` : ''}${r.challenges.length ? `<p>🌱 <b>${L('Grow together in', 'சேர்ந்து வளர வேண்டியவை')}:</b> ${r.challenges.map((x) => esc(bi(x))).join(', ')}</p>` : ''}</div>` : ''}
    <div class="section-title">📅 ${L('Year by year from the wedding', 'திருமணத்திலிருந்து ஆண்டுவாரியாக')}</div>${timelineHtml(r.timeline, names)}
    <div class="card glass"><div class="card-title">🪔 ${L('Parigaram for the couple', 'தம்பதியருக்கான பரிகாரம்')}</div>${r.remedies.map((x) => `<p class="small">• ${esc(bi(x))}</p>`).join('')}</div>
    <button class="btn-gold" id="coupleRead">📜 ${L('Detailed explanation', 'விரிவான விளக்கம்')}</button>
    <div class="card glass" id="coupleAi" hidden><div class="card-title"><span>📜 ${L('Reading', 'பலன்')}</span><button class="link-btn" id="coupleSpeak" aria-label="Read aloud">🔊</button></div><div class="reply" id="coupleText"></div></div>`}
    <p class="muted small center">${L('Marriage is made by love, respect and effort; astrology shows the seasons so you can prepare together.', 'திருமணம் அன்பு, மரியாதை, முயற்சியால் நிலைக்கிறது; ஜோதிடம் பருவங்களைக் காட்டி சேர்ந்து தயாராக உதவுகிறது.')}</p>`;
  $('#coupleRead')?.addEventListener('click', async () => {
    $('#coupleAi').hidden = false;
    const t = $('#coupleText');
    t.classList.add('typing');
    const context = {
      bride: { name: names[0].en, star: bride.chart.janmaNakshatra.name, rasi: bride.chart.janmaRasi.name, lagna: bride.chart.lagna.rasiName },
      groom: { name: names[1].en, star: groom.chart.janmaNakshatra.name, rasi: groom.chart.janmaRasi.name, lagna: groom.chart.lagna.rasiName },
      weddingDate: coupleUi.wedding, porutham: `${r.porutham.score}/10`, manaPorutham: r.mana.areas.map((x) => `${x.name.en}: ${x.score}`),
      doshaSamyam: r.samyam.map((n) => n.en), deepChecks: r.deep.checks.map((c) => `${c.name.en}: ${c.ok ? 'ok' : 'care'} — ${c.note.en}`), childrenWindows: r.children.map((w) => `${iso(w.from)}..${iso(w.to)}`),
      goodYears: r.goodYears.map((x) => x.year), careYears: r.careYears.map((x) => ({ year: x.year, why: x.themes.filter((th) => th.kind === 'care').map((th) => th.en) })),
    };
    await aiTask({ task: 'chat', context, messages: [{ role: 'user', content: 'Give a warm, honest married-life reading for this couple from the wedding day: how their bond grows, children, wealth and home, the years that need extra care and exactly how to handle them, and simple parigarams. Be positive and practical; never frighten. About 300 words.' }],
      fallbackText: [verdictText, ...r.timeline.slice(0, 10).map((x) => `${x.year}: ${x.themes.map((th) => bi(th)).join(' · ') || L('steady', 'நிலையானது')}`)].join('\n'), onText: (tx) => { t.textContent = tx; } });
    t.classList.remove('typing');
  });
  $('#coupleSpeak')?.addEventListener('click', () => speak($('#coupleText').textContent));
  $('#coupleOut').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
registerScreen('couple', { render: renderCouple, parent: 'home' });

// ================================================================ BUSINESS PARTNERS
const bizUi = { start: null, companyId: '' };
function renderPartners(sec) {
  bizUi.start ||= iso(new Date());
  const rerender = () => renderPartners(sec);
  const orgs = state.family.filter((m) => m.relation === 'organization');
  sec.innerHTML = `${subHeader(L('Business Partner Porutham', 'வணிகக் கூட்டாளி பொருத்தம்'), L('Before you invest together — trust, roles, money luck and the next 15 years', 'சேர்ந்து முதலீடு செய்யும் முன் — நம்பிக்கை, பொறுப்புகள், பண பாக்கியம், அடுத்த 15 ஆண்டுகள்'))}
    ${personBlock('p1', `🤝 ${L('Partner 1', 'கூட்டாளி 1')}`)}
    ${personBlock('p2', `🤝 ${L('Partner 2', 'கூட்டாளி 2')}`, { nth: 1 })}
    <div class="card glass">
      ${orgs.length ? `<label>${L('Company (optional)', 'நிறுவனம் (விருப்பம்)')}<select id="bizCo"><option value="">—</option>${orgs.map((o) => `<option value="${esc(o.id)}"${o.id === bizUi.companyId ? ' selected' : ''}>${esc(displayName(o))}</option>`).join('')}</select></label>` : `<p class="muted small">${L('Tip: add the company under Family as "Company / Team" with its founding date to include it.', 'குறிப்பு: நிறுவனத்தை "நிறுவனம் / குழு" ஆக அதன் தொடக்கத் தேதியுடன் குடும்பத்தில் சேர்த்தால் அதுவும் கணக்கில் வரும்.')}</p>`}
      <label>${L('Partnership start (done or planned)', 'கூட்டுத் தொடக்கம் (நடந்தது அல்லது திட்டமிட்டது)')}<input type="date" id="bizStart" value="${esc(bizUi.start)}"></label>
      <button class="btn-gold" id="bizBtn">📈 ${L('Analyse partnership', 'கூட்டை ஆய்வு செய்')}</button><p class="err" id="bizErr"></p></div>
    <div id="bizOut"></div>`;
  wirePersonBlocks(sec, rerender);
  $('#bizStart').addEventListener('change', (e) => { bizUi.start = e.target.value; });
  $('#bizCo')?.addEventListener('change', (e) => { bizUi.companyId = e.target.value; });
  $('#bizBtn').addEventListener('click', () => {
    let a, b;
    try { a = resolve('p1', L('Partner 1', 'கூட்டாளி 1')); b = resolve('p2', L('Partner 2', 'கூட்டாளி 2')); } catch (e) { $('#bizErr').textContent = e.message; return; }
    $('#bizErr').textContent = '';
    $('#bizOut').innerHTML = '<div class="loader"><i></i><i></i><i></i></div>';
    setTimeout(() => showPartners(a, b), 30);
  });
}

function showPartners(a, b) {
  const [y, mo, d] = bizUi.start.split('-').map(Number);
  const start = new Date(Date.UTC(y, mo - 1, d, 6));
  const co = state.family.find((m) => m.id === bizUi.companyId);
  const names = [a.name, b.name];
  const r = partnershipReport(a.chart, b.chart, { startDate: start, names, company: co ? birthChart(co) : null });
  const verdictText = { excellent: L('Excellent partnership — build boldly together', 'சிறந்த கூட்டு — தைரியமாக சேர்ந்து வளருங்கள்'), good: L('Good partnership — clear roles make it thrive', 'நல்ல கூட்டு — தெளிவான பொறுப்புகள் வளர்ச்சி தரும்'), structure: L('Workable with strong structure — written agreements and clear roles are essential', 'வலுவான அமைப்புடன் இயலும் — எழுத்து ஒப்பந்தமும் தெளிவான பொறுப்பும் அவசியம்') }[r.verdict];
  const locked = isLocked('predictions');
  const who = (x) => (x === 'both' ? L('Both', 'இருவரும்') : esc(bi(names[x === 'a' ? 0 : 1])));
  $('#bizOut').innerHTML = `
    <div class="card glass verdict-card"><div class="muted small">${esc(bi(names[0]))} · ${esc(bi(names[1]))}${co ? ` · 🏢 ${esc(displayName(co))}` : ''}</div>
      <div class="big-score">${r.overall}<small>/100</small></div><div class="verdict-big ${r.verdict === 'structure' ? 'CAUTION' : 'DO'}">${esc(verdictText)}</div></div>
    <div class="card glass"><div class="card-title">🤝 ${L('Compatibility', 'பொருத்தம்')}</div>${areaRows(r.areas)}</div>
    <div class="card glass"><div class="card-title">🧩 ${L('Who suits which role', 'யாருக்கு எந்தப் பொறுப்பு')}</div>
      ${r.roles.map((x) => `<div class="factor"><span>${esc(bi(x))}<br><small class="muted">${esc(bi(names[0]))} ${x.a} · ${esc(bi(names[1]))} ${x.b}</small></span><b class="pos">${who(x.best)}</b></div>`).join('')}</div>
    ${locked ? lockCard(L('The 15-year partnership timeline and growth periods are part of Premium.', '15 ஆண்டு கூட்டுக் காலவரிசையும் வளர்ச்சிக் காலங்களும் பிரீமியத்தில் உள்ளன.')) : `
    <div class="card glass"><div class="card-title">🚀 ${L('Growth periods both charts agree on', 'இரு ஜாதகமும் ஒப்புக்கொள்ளும் வளர்ச்சிக் காலம்')}</div>
      ${r.growth.length ? r.growth.slice(0, 4).map((w) => `<div class="best">🌟 ${monthYear(w.from)} – ${monthYear(w.to)}</div>`).join('') : `<p class="small">${L('Best years from the timeline below', 'கீழே உள்ள காலவரிசையின் சிறந்த ஆண்டுகள்')}: ${r.timeline.filter((x) => x.level === 'good').map((x) => x.year).join(', ') || '—'}</p>`}
      ${r.companyNote ? `<p class="small">🏢 ${L('Company chart: 10th house', 'நிறுவன ஜாதகம்: 10-ம் பாவம்')} ${r.companyNote.tenth}, ${L('11th (profits)', '11-ம் (லாபம்)')} ${r.companyNote.eleventh}</p>` : ''}</div>
    <div class="section-title">📅 ${L('Year by year', 'ஆண்டுவாரியாக')}</div>${timelineHtml(r.timeline, names)}`}
    <div class="card glass"><div class="card-title">📜 ${L('Guidance for a lasting partnership', 'நீடித்த கூட்டுக்கான வழிகாட்டல்')}</div>${r.guidance.map((x) => `<p class="small">• ${esc(bi(x))}</p>`).join('')}
      <button class="chip-btn" data-go="muhurtham">🗓️ ${L('Find a muhurtham to sign', 'கையெழுத்திட முகூர்த்தம்')}</button></div>
    <p class="muted small center">${L('Use this with legal and financial advice; astrology guides timing and temperament.', 'சட்ட, நிதி ஆலோசனையுடன் பயன்படுத்தவும்; ஜோதிடம் நேரத்தையும் சுபாவத்தையும் காட்டும்.')}</p>`;
  $('#bizOut').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
registerScreen('partners', { render: renderPartners, parent: 'home' });

export { rasiName, fmtIsoDate };
