// Life Questions (வாழ்க்கைக் கேள்விகள்): marriage, job, PR / visa, own house, child, court case,
// husband–wife harmony, Kula Deivam and habits — timed by Dasa–Bhukti and Guru–Sani double transit.
import { QUESTIONS, predictEvent, kulaDeivam, habitGuard, careerCompass } from './shared/predict.js';
import {
  state, $, $$, L, esc, bi, GLYPH, COLOR, planetName, fmtIsoDate, activeMember, chartOf, registerScreen, subHeader, aiTask, speak, displayName,
  saveFamily, toast, needsTimeText, showExtras,
} from './core.js';
import { isLocked, lockCard } from './growth.js';

const EXTRA = [
  { id: 'compass', icon: '🧭', en: 'Which study & career suits me? (talent compass)', ta: 'எந்தப் படிப்பு, தொழில் பொருந்தும்? (திறமை வழிகாட்டி)' },
  { id: 'kula', icon: '🛕', en: 'Our Kula Deivam — record your family\'s own', ta: 'குலதெய்வம் — உங்கள் குடும்பத்தினுடையதைப் பதிவு செய்க' },
  { id: 'habits', icon: '🛡️', en: 'Guard against bad habits (drinking etc.)', ta: 'தீய பழக்கங்களிலிருந்து பாதுகாப்பு' },
];
const ui = { memberId: null, q: null };
const iso = (d) => new Date(d.getTime() + state.loc.tz * 3600000).toISOString().slice(0, 10);
const monthYear = (d) => new Date(d).toLocaleDateString(state.lang === 'ta' ? 'ta-IN' : 'en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' });
const dasaLabel = (w) => `${GLYPH[w.md]} ${planetName(w.md)} ${L('Dasa', 'தசை')} · ${GLYPH[w.ad]} ${planetName(w.ad)} ${L('Bhukti', 'புக்தி')}`;

function renderLife(sec, params = {}) {
  if (params.q) ui.q = params.q;
  if (params.memberId) ui.memberId = params.memberId;
  const people = state.family.filter((m) => m.relation !== 'organization');
  const m = people.find((x) => x.id === ui.memberId) || activeMember();
  sec.innerHTML = `${subHeader(L('Life Questions', 'வாழ்க்கைக் கேள்விகள்'), L('Periods your tradition associates with each topic — by Dasa, Bhukti and Guru–Sani transit. Not guaranteed dates.', 'ஒவ்வொரு விஷயத்துடனும் மரபு தொடர்புபடுத்தும் காலங்கள் — தசை, புக்தி, குரு–சனி கோசாரப்படி. உறுதியான தேதிகள் அல்ல.'))}
    ${people.length > 1 ? `<label>${L('For', 'யாருக்கு')}<select id="lifeFor">${people.map((x) => `<option value="${esc(x.id)}"${x.id === m.id ? ' selected' : ''}>${esc(displayName(x))}</option>`).join('')}</select></label>` : ''}
    <div class="q-grid">${[...QUESTIONS, ...EXTRA].map((q) => `<button class="q-card${ui.q === q.id ? ' sel' : ''}" data-q="${q.id}"><span class="ti-icon">${q.icon}</span><span>${esc(bi(q))}</span></button>`).join('')}</div>
    <div id="lifeOut"></div>`;
  $('#lifeFor')?.addEventListener('change', (e) => { ui.memberId = e.target.value; renderLife(sec); });
  $$('[data-q]', sec).forEach((b) => b.addEventListener('click', () => { ui.q = b.dataset.q; $$('[data-q]', sec).forEach((x) => x.classList.toggle('sel', x === b)); answer(m); }));
  if (ui.q) answer(m, false);
}

function answer(m, scroll = true) {
  const c = chartOf(m);
  const out = $('#lifeOut');
  if (isLocked('predictions')) { out.innerHTML = lockCard(L('Life-timing predictions for marriage, job, PR, house and children are part of Premium. Start with a free trial.', 'திருமணம், வேலை, PR, வீடு, குழந்தை — வாழ்க்கை நேரக் கணிப்புகள் பிரீமியத்தில் உள்ளன. இலவசச் சோதனையுடன் தொடங்குங்கள்.')); return; }
  out.innerHTML = '<div class="loader"><i></i><i></i><i></i></div>';
  setTimeout(() => {
    if (ui.q === 'kula') renderKula(c, m);
    else if (ui.q === 'compass') renderCompass(c, m);
    else if (ui.q === 'habits') renderHabits(c, m);
    else renderPrediction(c, m);
    if (scroll) out.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 30);
}

const promiseLabel = (lv) => ({
  strong: L('Strong', 'வலுவானது'), good: L('Good', 'நன்று'), 'needs effort': L('Comes with effort', 'முயற்சியால் கிடைக்கும்'),
  'not-assessed': L('Not assessed — Thunai does not read this from a chart', 'மதிப்பிடப்படவில்லை — துணை இதை ஜாதகத்திலிருந்து கணிப்பதில்லை'),
  'needs-birth-time': needsTimeText(),
}[lv] || lv);

function renderPrediction(c, m) {
  const r = predictEvent(c, ui.q);
  const q = r.question;
  const best = r.windows[0];
  const lv = r.promise.level;
  if (lv === 'not-assessed' || lv === 'needs-birth-time') {
    $('#lifeOut').innerHTML = `<div class="card glass verdict-card life-head"><div class="ti-icon">${q.icon}</div><div class="mini-label">${esc(displayName(m))} · ${esc(bi(q))}</div>
      <div class="life-answer">${esc(promiseLabel(lv))}</div></div>
      <div class="card glass">${r.promise.notes.map((n) => `<p class="small">${esc(bi(n))}</p>`).join('')}
        ${lv === 'needs-birth-time' ? `<button class="chip-btn" data-go="family" data-param='${JSON.stringify({ edit: m.id })}'>${L('Add the birth time', 'பிறந்த நேரத்தைச் சேர்')}</button>` : ''}</div>
      ${r.current ? `<div class="card glass"><div class="mini-label">${L('Running now', 'தற்போது நடப்பது')}</div><div class="mini-value">${esc(dasaLabel(r.current))}</div></div>` : ''}
      ${r.disclaimer ? `<p class="muted small center">${esc(bi(r.disclaimer))}</p>` : ''}`;
    return;
  }
  const headline = !r.windows.length
    ? L('No strong period in the next 15 years by this method — effort and parigaram will open the way; please also consult your family astrologer.', 'இந்த முறைப்படி அடுத்த 15 ஆண்டுகளில் வலுவான காலம் தெரியவில்லை — முயற்சியும் பரிகாரமும் வழி திறக்கும்; குடும்ப ஜோதிடரையும் அணுகவும்.')
    : L(`Most likely from ${monthYear(r.earliest?.peakFrom || best.peakFrom)} — during ${planetName((r.earliest || best).md)} Dasa, ${planetName((r.earliest || best).ad)} Bhukti.`,
      `பெரும்பாலும் ${monthYear(r.earliest?.peakFrom || best.peakFrom)} முதல் — ${planetName((r.earliest || best).md)} தசை, ${planetName((r.earliest || best).ad)} புக்தியில்.`);
  $('#lifeOut').innerHTML = `
    <div class="card glass verdict-card life-head"><div class="ti-icon">${q.icon}</div><div class="mini-label">${esc(displayName(m))} · ${esc(bi(q))}</div>
      <div class="life-answer">${esc(headline)}</div>
      <span class="tag ${lv === 'strong' || lv === 'good' ? 'good' : 'neutral'}">${L('Traditional indication', 'மரபுக் குறிப்பு')}: ${esc(promiseLabel(lv))}</span>
      ${r.framing ? `<p class="muted small">${esc(bi(r.framing))}</p>` : ''}</div>
    ${r.current ? `<div class="card glass"><div class="mini-label">${L('Running now', 'தற்போது நடப்பது')}</div><div class="mini-value">${esc(dasaLabel(r.current))}</div><div class="muted small">${L('until', 'வரை')} ${fmtIsoDate(iso(r.current.end))}</div></div>` : ''}
    <div class="section-title">🌟 ${q.harmony ? L('Best periods for togetherness', 'ஒற்றுமைக்கு சிறந்த காலங்கள்') : L('Best periods', 'சிறந்த காலங்கள்')}</div>
    ${r.windows.map((w) => `<div class="card glass window${w === r.earliest ? ' first' : ''}">
      <div class="win-dates">${monthYear(w.peakFrom)} – ${monthYear(w.peakTo)}${w.doubleTransit ? ` <span class="pill dt">${L('Guru + Sani support', 'குரு + சனி ஆதரவு')}</span>` : ''}</div>
      <div class="small">${esc(dasaLabel(w))} <span class="muted">(${fmtIsoDate(iso(w.start))} → ${fmtIsoDate(iso(w.end))})</span></div>
      <details><summary>${L('Why this period?', 'ஏன் இந்தக் காலம்?')}</summary>${w.reasons.map((x) => `<div class="small">• ${esc(bi(x))}</div>`).join('')}</details></div>`).join('') || ''}
    ${r.careful.length ? `<div class="section-title">🤍 ${L('Periods to be extra caring with each other', 'ஒருவருக்கொருவர் கூடுதல் அன்பு காட்ட வேண்டிய காலங்கள்')}</div>
      ${r.careful.map((w) => `<div class="card glass window care"><div class="win-dates">${monthYear(w.start)} – ${monthYear(w.end)}</div><div class="small">${esc(dasaLabel(w))}</div><p class="small">${L('Patience, shared prayer and open talks keep the bond strong in this period.', 'இந்தக் காலத்தில் பொறுமை, சேர்ந்த வழிபாடு, மனம் திறந்த பேச்சு உறவை வலுப்படுத்தும்.')}</p></div>`).join('')}` : ''}
    <div class="card glass"><div class="card-title">🔍 ${L('What the chart shows', 'ஜாதகம் காட்டுவது')}</div>${r.promise.notes.map((n) => `<div class="small">• ${esc(bi(n))}</div>`).join('')}</div>
    <div class="card glass"><div class="card-title">🪔 ${L('Parigaram', 'பரிகாரம்')}</div><p>${esc(bi(r.remedy))}</p>
      ${r.karakaRemedies.map((k) => `<p class="small"><span style="color:${COLOR[k.planet]}">${GLYPH[k.planet]}</span> ${esc(planetName(k.planet))}: ${esc(bi(k.free))}</p>`).join('')}</div>
    <button class="btn-gold" id="lifeExplain">📜 ${L('Explain with Thunai', 'துணையுடன் விளக்கம்')}</button>
    <div class="card glass" id="lifeAi" hidden><div class="card-title"><span>📜 ${L('Explanation', 'விளக்கம்')}</span><button class="link-btn" id="lifeSpeak" aria-label="${esc(L('Read aloud', 'வாசித்துக்காட்டு'))}">🔊</button></div><div class="reply" id="lifeText"></div></div>
    ${r.disclaimer ? `<p class="muted small center">${esc(bi(r.disclaimer))}</p>` : ''}
    <p class="muted small center">${L('Astrology shows favourable timing; effort, family support and the right professional advice make it happen.', 'ஜோதிடம் சாதகமான நேரத்தைக் காட்டும்; முயற்சி, குடும்ப ஆதரவு, சரியான நிபுணர் ஆலோசனையே அதை நிறைவேற்றும்.')}</p>`;
  $('#lifeExplain').addEventListener('click', async () => {
    $('#lifeAi').hidden = false;
    const t = $('#lifeText');
    t.classList.add('typing');
    const context = {
      person: { name: m.name, relation: m.relation, gender: m.gender, birth: `${m.date} ${c.timePrecision === 'unknown' ? '(time unknown)' : m.time} ${m.place}`, lagna: c.lagna?.rasiName || 'not available', rasi: c.janmaRasi.name, star: c.janmaNakshatra.name },
      question: q.en, promise: { level: r.promise.level, notes: r.promise.notes.map((n) => n.en) },
      runningNow: r.current && `${r.current.md} Dasa / ${r.current.ad} Bhukti until ${iso(r.current.end)}`,
      bestPeriods: r.windows.map((w) => ({ from: iso(w.peakFrom), to: iso(w.peakTo), dasa: `${w.md}/${w.ad}`, doubleTransit: w.doubleTransit, why: w.reasons.map((x) => x.en) })),
      periodsNeedingCare: r.careful.map((w) => `${iso(w.start)}..${iso(w.end)} ${w.md}/${w.ad}`),
      remedy: r.remedy.en,
    };
    const fallback = [$('.life-answer').textContent, ...r.windows.map((w) => `🌟 ${monthYear(w.peakFrom)} – ${monthYear(w.peakTo)}: ${dasaLabel(w)}`), `🪔 ${bi(r.remedy)}`].join('\n');
    await aiTask({ task: 'chat', context, messages: [{ role: 'user', content: `Explain, as traditional context only, the periods this tradition associates with: "${q.en}". Use the computed indication, the dasa-bhukti periods and transits; say clearly these are not guaranteed dates. Then practical steps that help, then one simple optional practice. Warm and specific. About 200 words.` }], fallbackText: fallback, member: m, channel: 'life', onText: (tx) => { t.textContent = tx; } }).then((r) => showExtras(t, r.meta));
    t.classList.remove('typing');
  });
  $('#lifeSpeak').addEventListener('click', () => speak($('#lifeText').textContent));
}

function renderKula(c, m) {
  const k = kulaDeivam(c, { recorded: m.kulaDeivam || null });
  const sg = k.suggestion;
  $('#lifeOut').innerHTML = `<div class="card glass verdict-card life-head"><div class="ti-icon">🛕</div><div class="mini-label">${esc(displayName(m))}</div>
      <div class="life-answer">${k.recordedByFamily ? `${L('Your family\'s Kula Deivam', 'உங்கள் குலதெய்வம்')}: ${esc(k.recordedByFamily)}` : L('Not recorded yet — ask your family elders', 'இன்னும் பதிவு செய்யப்படவில்லை — குடும்பப் பெரியோரிடம் கேளுங்கள்')}</div>
      ${k.recordedByFamily ? `<span class="tag good">${L('Recorded by your family', 'உங்கள் குடும்பம் பதிவு செய்தது')}</span>` : ''}</div>
    <form class="card glass" id="kulaForm"><div class="card-title">${L('Record your family\'s Kula Deivam', 'உங்கள் குலதெய்வத்தைப் பதிவு செய்க')}</div>
      <label>${L('Kula Deivam (deity and temple / village)', 'குலதெய்வம் (தெய்வம், கோவில் / ஊர்)')}<input name="kula" maxlength="120" value="${esc(m.kulaDeivam || '')}" placeholder="${esc(L('e.g. Ayyanar, Kovilpatti', 'உ.தா. ஐயனார், கோவில்பட்டி'))}"></label>
      <button class="btn-gold">${L('Save', 'சேமி')}</button>
      <p class="muted small">${L('Saved in this family profile only.', 'இந்தக் குடும்ப விவரத்தில் மட்டும் சேமிக்கப்படும்.')}</p></form>
    <div class="card glass"><p>${esc(bi(k.guidance))}</p></div>
    ${sg ? `<details class="card glass"><summary><b>${L('Optional suggestion (not a fact about your family)', 'விருப்பப் பரிந்துரை (உங்கள் குடும்பம் பற்றிய உண்மை அல்ல)')}</b></summary>
      <p>${L('A deity form for prayer', 'வழிபாட்டுக்கான தெய்வ வடிவம்')}: <b>${esc(bi(sg.deity))}</b></p>
      <p class="muted small">${L('Method', 'முறை')}: ${esc(bi(sg.method))}</p>
      <p class="muted small">${L('9th house', '9-ம் பாவம்')}: ${esc(bi(k.ninthSign))} · ${L('lord', 'அதிபதி')} ${esc(planetName(k.lord))}${k.occupants.length ? ` · ${L('planets', 'கிரகங்கள்')}: ${k.occupants.map((o) => esc(planetName(o))).join(', ')}` : ''}</p></details>` : ''}
    ${k.periods.length ? `<div class="card glass"><div class="card-title">🙏 ${L('Periods many families choose for a Kula Deivam visit (optional)', 'குலதெய்வ தரிசனத்திற்குப் பல குடும்பங்கள் தேர்ந்தெடுக்கும் காலங்கள் (விருப்பம்)')}</div>${k.periods.map((p) => `<div class="factor"><span>${GLYPH[p.ad]} ${esc(planetName(p.md))} / ${esc(planetName(p.ad))}</span><b class="zero">${monthYear(p.start)} – ${monthYear(p.end)}</b></div>`).join('')}</div>` : ''}`;
  $('#kulaForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = e.target.elements.kula.value.trim();
    const i = state.family.findIndex((x) => x.id === m.id);
    if (i >= 0) { state.family[i] = { ...state.family[i], kulaDeivam: v || undefined }; saveFamily(); }
    toast(L('Saved', 'சேமிக்கப்பட்டது'));
    renderKula(c, state.family[i] || m);
  });
}

function renderCompass(c, m) {
  const r = careerCompass(c);
  $('#lifeOut').innerHTML = `<div class="card glass verdict-card life-head"><div class="ti-icon">🧭</div><div class="mini-label">${esc(displayName(m))}</div>
      <div class="life-answer">${L('Best suited', 'மிகப் பொருத்தமானது')}: ${esc(bi(r.top[0]))}</div>
      <span class="tag good">${L('10th lord', '10-ம் அதிபதி')}: ${GLYPH[r.tenthLord]} ${esc(planetName(r.tenthLord))} · ${esc(bi(r.tenthSign))}</span></div>
    ${r.top.map((f, i) => `<div class="card glass window${i === 0 ? ' first' : ''}"><div class="win-dates">${i + 1}. ${esc(bi(f))} <span class="pill">${f.score}</span></div>
      <p class="small">🎓 ${esc(bi(f.study))}</p>${f.reasons.map((x) => `<div class="small">• ${esc(bi(x))}</div>`).join('')}</div>`).join('')}
    <div class="card glass"><div class="card-title">${L('All fields', 'அனைத்துத் துறைகளும்')}</div>${r.all.map((f) => `<div class="gb-row static"><span class="gb-name">${esc(bi(f))}</span><span class="gb-bar"><i class="${f.score >= 66 ? 'strong' : f.score >= 50 ? 'average' : 'weak'}" style="width:${f.score}%"></i></span><span class="muted small">${f.score}</span></div>`).join('')}</div>
    <p class="muted small center">${L('The chart shows natural talent; interest, hard work and good guidance decide success. Also see "Cinema / serial acting" and "Politics" timing above.', 'ஜாதகம் இயல்பான திறமையைக் காட்டும்; ஆர்வம், கடின உழைப்பு, நல்ல வழிகாட்டுதலே வெற்றியைத் தீர்மானிக்கும். மேலே "சினிமா / சீரியல் நடிப்பு", "அரசியல்" நேரத்தையும் பார்க்கவும்.')}</p>`;
}

function renderHabits(c, m) {
  const h = habitGuard(c);
  $('#lifeOut').innerHTML = `<div class="card glass verdict-card life-head"><div class="ti-icon">🛡️</div><div class="mini-label">${esc(displayName(m))}</div>
      <div class="life-answer">${h.level === 'low' ? L('No special tendency shown — keep healthy routines.', 'சிறப்பான போக்கு எதுவும் இல்லை — நல்ல பழக்கங்களைத் தொடருங்கள்.') : h.level === 'mild' ? L('A mild tendency to watch.', 'கவனிக்க வேண்டிய லேசான போக்கு.') : L('Areas to guard carefully.', 'கவனமாகக் காக்க வேண்டியவை.')}</div></div>
    ${h.notes.length ? `<div class="card glass">${h.notes.map((n) => `<div class="small">• ${esc(bi(n))}</div>`).join('')}</div>` : ''}
    <div class="card glass"><div class="card-title">🌿 ${L('What helps', 'உதவுவது')}</div><p>${esc(bi(h.support))}</p></div>`;
}

registerScreen('life', { render: renderLife, parent: 'chart', needsMember: true });
