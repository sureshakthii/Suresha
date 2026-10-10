// Thunai For You (துணை உங்களுக்காக): from the person's jathagam, Thunai goes out into the world for them — job
// openings that suit their chart and education, matrimony searches with the stars that match theirs, remarriage
// with respect, and the right hospitals nearby — with periods, parigaram and practical steps (shared/for-you.js).
import { state, L, esc, bi, store, registerScreen, subHeader, activeMember, chartOf, displayName, planetName, copyright, fmtTimeRange, STATIC } from './core.js';
import { reliabilityOf, ageOf, isMarried } from './screens-main.js';
import { jobPlan, marriagePlan, healthPlan, EDUCATION, SPECIALTIES } from './shared/for-you.js';
import { tamilDay } from './shared/tamilcal.js';
import { fmtMonth } from './shared/fmt.js';
import { hymnText } from './hymn-links.js';
import { isLocked, lockCard } from './growth.js';

const KEY = 'kj_foryou';
const ui = { tab: null };
const prefsOf = (id) => ({ education: 'arts', experience: 'fresher', community: '', specialty: 'general', ...(store.get(KEY, {})[id] || {}) });
const savePrefs = (id, p) => { const all = store.get(KEY, {}); all[id] = { ...(all[id] || {}), ...p }; store.set(KEY, all); };
const lgx = () => (state.lang === 'en' ? 'en' : 'ta');
const ext = (l) => `<a class="fy-link" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${esc(typeof l.site === 'string' ? l.site : bi(l.site))} ↗</a>`;
const li = (x) => `<li>${esc(bi(x))}</li>`;

function todayTd() {
  const loc = state.loc;
  if (!loc) return null;
  const [y, mo, d] = new Date(Date.now() + loc.tz * 3600000).toISOString().slice(0, 10).split('-').map(Number);
  try { return tamilDay(new Date(Date.UTC(y, mo - 1, d, 12) - loc.tz * 3600000), loc.lat, loc.lon, loc.tz); } catch { return null; }
}

function periods(when, tz) {
  if (!when) return '';
  if (when.needsBirthTime) return `<p class="small muted">${L('Dated periods need an exact birth time.', 'தேதியுடன் காலம் பார்க்கத் துல்லியமான பிறந்த நேரம் தேவை.')}</p>`;
  if (!when.windows.length) return `<p class="small muted">${L('No strongly supportive period in the next 6 years — steady effort now matters most.', 'அடுத்த 6 ஆண்டுகளில் மிகச் சாதகமான காலம் இல்லை — இப்போதைய தொடர் முயற்சியே முக்கியம்.')}</p>`;
  const r = (w) => `${fmtMonth(new Date(w.start), lgx(), tz)} – ${fmtMonth(new Date(w.end), lgx(), tz)}`;
  return `<ul class="lg-list">${when.windows.map((w) => `<li><b>${esc(r(w))}</b> <span class="small muted">· ${esc(planetName(w.md))} / ${esc(planetName(w.ad))}</span>${w.reason ? `<br><span class="small muted">${esc(bi(w.reason))}</span>` : ''}</li>`).join('')}</ul>
    <p class="small muted">${L('By tradition (Dasa–Bhukti and Guru–Sani transit). Prepare in the months before.', 'மரபுப்படி (தசா–புக்தி, குரு–சனி கோசாரம்). அதற்கு முந்தைய மாதங்களில் தயாராகுங்கள்.')}</p>`;
}
const remedy = (r) => (r ? `<section class="card glass"><div class="card-title">🪔 ${L('Parigaram (optional)', 'பரிகாரம் (விருப்பம்)')}</div><p>${hymnText(bi(r))}</p></section>` : '');

function jobHtml(p, pr) {
  const g = jobPlan({ chart: p.chart, rel: p.rel, education: pr.education, experience: pr.experience, place: state.loc?.name || p.m.place, cc: state.loc?.cc || 'IN', td: todayTd() });
  return `<section class="card glass"><div class="card-title">🎓 ${L('Your details', 'உங்கள் விவரம்')}</div>
      <div class="fy-grid"><label>${L('Education', 'கல்வி')}<select data-pref="education">${EDUCATION.map((e) => `<option value="${e.id}"${e.id === pr.education ? ' selected' : ''}>${esc(bi(e.label))}</option>`).join('')}</select></label>
      <label>${L('Experience', 'அனுபவம்')}<select data-pref="experience">${[['fresher', 'Fresher', 'புதியவர்'], ['some', '1–3 years', '1–3 ஆண்டுகள்'], ['many', 'More than 3 years', '3 ஆண்டுக்கு மேல்']].map(([v, en, ta]) => `<option value="${v}"${v === pr.experience ? ' selected' : ''}>${L(en, ta)}</option>`).join('')}</select></label></div></section>
    <section class="card glass"><div class="card-title">💼 ${L('Jobs that suit your chart', 'உங்கள் ஜாதகத்திற்கு ஏற்ற வேலைகள்')}</div>
      ${g.fields.map((f) => `<div class="fy-field"><b>${esc(bi(f.name))}</b>${f.fromChart ? ` <span class="pill">${L('chart', 'ஜாதகம்')}${f.planet ? ` · ${esc(planetName(f.planet))}` : ''}</span>` : ''}${f.alsoEducation ? ` <span class="pill">${L('your studies', 'உங்கள் படிப்பு')}</span>` : ''}
        ${f.reason ? `<div class="small muted">${esc(bi(f.reason))}</div>` : ''}<div class="fy-links">${f.links.map(ext).join('')}</div></div>`).join('')}
      <p class="small muted">${L('The links open live searches on each website — Thunai does not copy their listings.', 'இணைப்புகள் ஒவ்வொரு தளத்திலும் நேரலைத் தேடலைத் திறக்கும் — துணை அவற்றின் பட்டியலை நகலெடுப்பதில்லை.')}</p></section>
    ${g.govt.length ? `<section class="card glass"><div class="card-title">🏛️ ${L('Government jobs and free skills', 'அரசு வேலை & இலவசத் திறன் பயிற்சி')}</div><div class="fy-links col">${g.govt.map(ext).join('')}</div></section>` : ''}
    <section class="card glass"><div class="card-title">📅 ${L('Supportive periods', 'சாதகமான காலம்')}</div>${periods(g.when, p.tz)}
      ${g.applyTimes.length ? `<p>⏰ ${L('Good times to apply today', 'இன்று விண்ணப்பிக்க நல்ல நேரம்')}: <b>${g.applyTimes.map((w) => esc(fmtTimeRange(w.start, w.end, state.loc.tz))).join(' · ')}</b></p>` : ''}</section>
    <section class="card glass"><div class="card-title">✅ ${L('Steps that work', 'பலன் தரும் அடிகள்')}</div><ol class="lg-list">${g.steps.map(li).join('')}</ol><p class="note-box small">⚠️ ${esc(bi(g.safety))}</p></section>
    ${remedy(g.parigaram)}`;
}

function marriageHtml(p, pr, second) {
  const g = marriagePlan({ chart: p.chart, rel: p.rel, gender: p.m.gender === 'female' ? 'female' : 'male', second, community: pr.community, place: state.loc?.name || p.m.place });
  const seek = g.seeking === 'groom' ? L('groom', 'மணமகன்') : L('bride', 'மணமகள்');
  return `${second ? `<section class="card glass"><p>${L('A new beginning deserves respect. Thunai helps you look again, calmly and with your family.', 'புதிய தொடக்கம் மரியாதைக்குரியது. குடும்பத்துடன், அமைதியாக மீண்டும் தேட துணை உதவும்.')}</p></section>` : ''}
    <section class="card glass"><div class="card-title">⭐ ${L(`Stars that match yours (${g.myStar.en}, ${g.myRasi.en})`, `உங்கள் நட்சத்திரத்துடன் பொருந்தும் நட்சத்திரங்கள் (${g.myStar.ta}, ${g.myRasi.ta})`)}</div>
      ${g.starOk ? `<div class="fy-stars">${g.stars.slice(0, 12).map((s) => `<span class="fy-star"><b>${esc(bi(s.name))}</b> <span class="small muted">${esc(bi(s.rasiName))} · ${s.agree}/10</span></span>`).join('')}</div>
      <p class="small muted">${L(`Rajju and Vedhai agree, and at least 7 of 10 poruthams. Use these stars in the ${seek} search on any matrimony site.`, `ரஜ்ஜு, வேதை பொருந்தும்; 10-இல் குறைந்தது 7 பொருத்தங்கள். எந்தத் திருமணத் தளத்திலும் ${seek} தேடலில் இந்த நட்சத்திரங்களைப் பயன்படுத்துங்கள்.`)}</p>`
    : `<p class="small muted">${L('The birth star is not certain — add an exact birth time first.', 'ஜன்ம நட்சத்திரம் உறுதியாக இல்லை — முதலில் துல்லியமான பிறந்த நேரத்தைச் சேருங்கள்.')}</p>`}
      ${g.dosham ? `<p>${L('Chevvai dosham', 'செவ்வாய் தோஷம்')}: <b>${g.dosham.chevvai ? L('present', 'உண்டு') : L('not present', 'இல்லை')}</b> · ${L('Rahu–Ketu dosham', 'ராகு–கேது தோஷம்')}: <b>${g.dosham.rahuKetu ? L('present', 'உண்டு') : L('not present', 'இல்லை')}</b></p>${g.dosham.chevvai || g.dosham.rahuKetu ? `<p class="small">${esc(bi(g.doshamNote))}</p>` : ''}` : ''}</section>
    <section class="card glass"><div class="card-title">🔎 ${L(`Find a ${seek}`, `${seek} தேடல்`)}</div>
      <label>${L('Community / sub-caste (optional)', 'சமூகம் / உட்பிரிவு (விருப்பம்)')}<input data-pref="community" maxlength="40" value="${esc(pr.community)}" autocomplete="off"></label>
      <p class="small muted">${esc(bi(g.communityNote))}</p><div class="fy-links">${g.links.map(ext).join('')}</div></section>
    <section class="card glass"><div class="card-title">📅 ${L('Supportive periods', 'சாதகமான காலம்')}</div>${periods(g.when, p.tz)}</section>
    <section class="card glass"><div class="card-title">✅ ${L('Steps', 'அடிகள்')}</div><ol class="lg-list">${g.steps.map(li).join('')}</ol><p class="note-box small">⚠️ ${esc(bi(g.safety))}</p>
      <div class="btn-row"><button class="chip-btn" data-go="porutham">💞 ${L('Check full porutham', 'முழுப் பொருத்தம் பாருங்கள்')} ›</button></div></section>
    ${remedy(g.parigaram)}`;
}

function healthHtml(p, pr) {
  const g = healthPlan({ specialty: pr.specialty, place: state.loc?.name || p.m.place, cc: state.loc?.cc || 'IN', profile: p.prof });
  return `<section class="card glass"><p class="note-box">🩺 ${esc(bi(g.first))}</p>
      <label>${L('What do you need?', 'உங்களுக்கு என்ன தேவை?')}<select data-pref="specialty">${SPECIALTIES.map((s) => `<option value="${s.id}"${s.id === pr.specialty ? ' selected' : ''}>${esc(bi(s.label))}</option>`).join('')}</select></label>
      <div class="fy-links">${g.links.map((l, i) => `<a class="fy-link" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${i ? L('Government hospitals', 'அரசு மருத்துவமனைகள்') : L('Hospitals near you', 'அருகிலுள்ள மருத்துவமனைகள்')} ↗</a>`).join('')}</div>
      <p><b>🚑 ${esc(bi(g.emergency))}</b></p></section>
    ${g.prayer ? `<section class="card glass"><div class="card-title">🙏 ${L('Prayer (optional)', 'வழிபாடு (விருப்பம்)')}</div><p><b>${esc(bi(g.prayer.deity))}</b></p><p class="small">${esc(bi(g.prayer.free))}</p></section>` : ''}
    <div class="btn-row"><button class="chip-btn" data-go="health">🌿 ${L('Jathagam health guide', 'ஜாதக ஆரோக்கிய வழிகாட்டி')} ›</button></div>`;
}

function renderForYou(sec) {
  const m = activeMember();
  const head = subHeader(L('Thunai For You', 'துணை உங்களுக்காக'), L('From your jathagam, Thunai goes out into the world and brings what you need', 'உங்கள் ஜாதகப்படி, துணை வெளி உலகிற்குச் சென்று உங்களுக்கான தேவைகளைக் கொண்டு வரும்'));
  if (!m || m.relation === 'organization') { sec.innerHTML = `${head}<div class="card glass cta-card" data-go="family" data-param='{"add":true}'>${L('Add your birth details first', 'முதலில் பிறப்பு விவரங்களைச் சேருங்கள்')} ›</div>${copyright()}`; return; }
  const prof = ageOf(m);
  if (!prof.adult) { sec.innerHTML = `${head}<div class="card glass"><p>${L('Thunai For You is for adults. For studies, open the Life Guide.', 'துணை உங்களுக்காக — பெரியவர்களுக்கானது. படிப்புக்கு வாழ்க்கை வழிகாட்டியைத் திறங்கள்.')}</p><button class="chip-btn" data-go="lifeguide">🪷 ${L('Life Guide', 'வாழ்க்கை வழிகாட்டி')} ›</button></div>${copyright()}`; return; }
  const rel = reliabilityOf(m);
  const p = { m, prof, rel, chart: chartOf(m), tz: Number.isFinite(Number(m.tz)) ? Number(m.tz) : (state.loc?.tz ?? 5.5) };
  const married = isMarried(m), status = m.maritalStatus || '';
  const tabs = [['job', '💼', L('Job', 'வேலை')]];
  if (!married && status !== 'other') tabs.push(['marriage', '💐', L('Marriage', 'திருமணம்')]);
  if (!married && (status === 'other' || status === '')) tabs.push(['second', '🤝', L('Remarriage', 'மறுமணம்')]);
  tabs.push(['health', '🏥', L('Health', 'உடல்நலம்')]);
  if (!tabs.some((t) => t[0] === ui.tab)) ui.tab = tabs[0][0];
  const pr = prefsOf(m.id);
  const locked = isLocked('predictions');
  const testing = STATIC || !state.billing?.enforced;
  const body = locked ? lockCard(L('Job, marriage and hospital searches from your jathagam are part of Thunai Pro.', 'உங்கள் ஜாதகப்படி வேலை, திருமணம், மருத்துவமனைத் தேடல் — துணை Pro வசதி.'))
    : ui.tab === 'job' ? jobHtml(p, pr) : ui.tab === 'marriage' ? marriageHtml(p, pr, false) : ui.tab === 'second' ? marriageHtml(p, pr, true) : healthHtml(p, pr);
  sec.innerHTML = `${head}
    <p class="small">👤 <b>${esc(displayName(m))}</b>${testing && !locked ? ` · <span class="pill rq-pro">Pro</span> <span class="small muted">${L('open to all while testing', 'சோதனையின்போது அனைவருக்கும் திறந்தது')}</span>` : ''}</p>
    <div class="seg fy-tabs" role="tablist">${tabs.map(([id, ic, label]) => `<button type="button" role="tab" aria-selected="${id === ui.tab}" class="${id === ui.tab ? 'sel' : ''}" data-tab-fy="${id}">${ic} ${label}</button>`).join('')}</div>
    ${body}${copyright()}`;
  sec.querySelectorAll('[data-tab-fy]').forEach((b) => b.addEventListener('click', () => { ui.tab = b.dataset.tabFy; renderForYou(sec); }));
  sec.querySelectorAll('[data-pref]').forEach((el) => el.addEventListener('change', () => { savePrefs(m.id, { [el.dataset.pref]: el.value.trim() }); renderForYou(sec); }));
}
registerScreen('foryou', { render: renderForYou, parent: 'home' });
