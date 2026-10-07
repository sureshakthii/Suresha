// Life Questions (வாழ்க்கைக் கேள்விகள்): marriage, job, PR / visa, own house, child, court case,
// husband–wife harmony, Kula Deivam and habits — timed by Dasa–Bhukti and Guru–Sani double transit.
import { faithOf } from './shared/faith.js';
import { hymnText } from './hymn-links.js';
import { QUESTIONS, predictEvent, kulaDeivam, habitGuard, careerCompass, questionFor, questionFitsAge } from './shared/predict.js';
import { REPORT_YEARS, horizonLabel, HORIZON_LINES } from './shared/report-horizon.js';
import {
  state, $, $$, L, esc, bi, GLYPH, COLOR, planetName, fmtIsoDate, activeMember, chartOf, registerScreen, subHeader, aiTask, speak, displayName,
  needsTimeNote, birthContext, stabilityChip,
} from './core.js';
import { isLocked, lockCard } from './growth.js';
import { ageProfile, lifeQuestionAllowed, stageLabel } from './shared/age-guard.js';

const ageOf = (m) => ageProfile(m, { tz: state.loc?.tz });

const EXTRA = [
  { id: 'compass', icon: '🧭', en: 'Which study & career suits me? (talent compass)', ta: 'எந்தப் படிப்பு, தொழில் பொருந்தும்? (திறமை வழிகாட்டி)' },
  { id: 'kula', icon: '🛕', en: 'Kula Deivam — how to find out', ta: 'குலதெய்வம் — அறியும் வழி' },
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
  // Age first: a child sees only the questions that suit the age (studies, Kula Deivam) — never marriage, job, money or court.
  const prof = ageOf(m);
  // …and each timing question only within its own age range (no marriage / child timing for an elder).
  const qs = [...QUESTIONS, ...EXTRA].filter((q) => lifeQuestionAllowed(q.id, prof) && questionFitsAge(q, prof.age))
    .map((q) => ({ ...q, ...(QUESTIONS.includes(q) ? questionFor(q, m.gender) : {}) }));
  if (ui.q && !qs.some((q) => q.id === ui.q)) ui.q = null;
  sec.innerHTML = `${subHeader(L('Life Questions', 'வாழ்க்கைக் கேள்விகள்'), L('Traditional timing indicators from dasa, bhukti and Guru–Sani transits — not guarantees', 'தசை, புக்தி, குரு–சனி கோசார அடிப்படையிலான பாரம்பரியக் கால அறிகுறிகள் — உத்தரவாதம் அல்ல'))}
    ${people.length > 1 ? `<label>${L('For', 'யாருக்கு')}<select id="lifeFor">${people.map((x) => `<option value="${esc(x.id)}"${x.id === m.id ? ' selected' : ''}>${esc(displayName(x))}</option>`).join('')}</select></label>` : ''}
    ${prof.minor ? `<div class="note-box age-note" role="note">🌱 ${esc(L(`${displayName(m)} is ${prof.age} (${bi(stageLabel(prof))}). Marriage, job, money and court questions are read only after 18 — here are the questions that suit this age.`, `${displayName(m)} — வயது ${prof.age} (${bi(stageLabel(prof))}). திருமணம், வேலை, பணம், வழக்கு பற்றிய கேள்விகள் 18 வயதுக்குப் பிறகே — இந்த வயதிற்கு ஏற்ற கேள்விகள் இங்கே.`))}</div>` : ''}
    <div class="q-grid">${qs.map((q) => `<button class="q-card${ui.q === q.id ? ' sel' : ''}" data-q="${q.id}"><span class="ti-icon">${q.icon}</span><span>${esc(bi(q))}</span></button>`).join('')}</div>
    <div id="lifeOut"></div>`;
  $('#lifeFor')?.addEventListener('change', (e) => { ui.memberId = e.target.value; renderLife(sec); });
  $$('[data-q]', sec).forEach((b) => b.addEventListener('click', () => { ui.q = b.dataset.q; $$('[data-q]', sec).forEach((x) => x.classList.toggle('sel', x === b)); answer(m); }));
  if (ui.q) answer(m, false);
}

function answer(m, scroll = true) {
  const c = chartOf(m);
  const out = $('#lifeOut');
  if (!lifeQuestionAllowed(ui.q, ageOf(m))) { out.innerHTML = ''; return; }
  // Value before payment: when locked, the first result card is still shown free; the lock card follows it.
  const locked = isLocked('predictions');
  const lockText = ageOf(m).minor ? L('This first result is free. Detailed readings are part of the Personal plan. Start with a free trial.', 'இந்த முதல் முடிவு இலவசம். விரிவான பலன்கள் தனிநபர் திட்டத்தில் உள்ளன. இலவசச் சோதனையுடன் தொடங்குங்கள்.') : L('This first result is free. All periods, parigaram and the detailed explanation for marriage, job, PR, house and children are part of the Personal plan. Start with a free trial.', 'இந்த முதல் முடிவு இலவசம். திருமணம், வேலை, PR, வீடு, குழந்தை — அனைத்துக் காலங்கள், பரிகாரம், விரிவான விளக்கம் தனிநபர் திட்டத்தில் உள்ளன. இலவசச் சோதனையுடன் தொடங்குங்கள்.');
  out.innerHTML = '<div class="loader"><i></i><i></i><i></i></div>';
  setTimeout(() => {
    if (ui.q === 'kula') renderKula(c, m);
    else if (ui.q === 'compass') renderCompass(c, m);
    else if (ui.q === 'habits') renderHabits(c, m);
    else renderPrediction(c, m);
    if (locked) {
      const kids = [...out.children];
      const first = kids.findIndex((el) => el.classList.contains('card'));
      kids.slice(first + 1).forEach((el) => el.remove());
      out.insertAdjacentHTML('beforeend', lockCard(lockText));
    }
    if (scroll) out.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 30);
}

function renderPrediction(c, m) {
  const years = REPORT_YEARS.life;
  const faith = faithOf(m);
  const r0 = predictEvent(c, ui.q, { years, faith });
  const qg = questionFor(r0.question, m.gender, { faith });
  const r = { ...r0, remedy: qg.remedy || r0.remedy };
  const q = { ...r0.question, en: qg.en, ta: qg.ta };
  const best = r.windows[0];
  const noTime = r.needsBirthTime && r.promise.level !== 'not-assessed';
  const headline = noTime
    ? L('This timing reads the houses from the Lagna, which needs the birth time. Add the birth time in the family profile to see the periods.', 'இந்தக் காலக் கணிப்பு லக்னத்திலிருந்து பாவங்களைப் பார்க்கிறது; அதற்குப் பிறந்த நேரம் தேவை. காலங்களைப் பார்க்க குடும்ப சுயவிவரத்தில் பிறந்த நேரத்தைச் சேர்க்கவும்.')
    : !r.windows.length
    ? faith !== 'hindu' ? L('Steady effort and sincere prayer in your own way open the way — keep going with hope.', 'தொடர் முயற்சியும் உங்கள் வழியில் மனமார்ந்த பிரார்த்தனையும் வழி திறக்கும் — நம்பிக்கையுடன் தொடருங்கள்.') : L('Steady effort and sincere parigaram open the way — keep going with faith; every Thursday and Friday morning is good for steps on this.', 'தொடர் முயற்சியும் மனமார்ந்த பரிகாரமும் வழி திறக்கும் — நம்பிக்கையுடன் தொடருங்கள்; ஒவ்வொரு வியாழன், வெள்ளி காலையும் இதற்கான முயற்சிக்கு நல்லது.')
    : L(`Tradition sees ${monthYear(r.earliest?.peakFrom || best.peakFrom)} onwards as a supportive period — ${planetName((r.earliest || best).md)} Dasa, ${planetName((r.earliest || best).ad)} Bhukti.`,
      `பாரம்பரியப்படி ${monthYear(r.earliest?.peakFrom || best.peakFrom)} முதல் சாதகமான காலம் — ${planetName((r.earliest || best).md)} தசை, ${planetName((r.earliest || best).ad)} புக்தி.`);
  const caution = ['child', 'pr', 'visa', 'court', 'marriage', 'partner'].includes(ui.q)
    ? `<div class="note-box" role="note">${L('No horoscope can guarantee a marriage, a pregnancy, a visa or a court result. Use these periods as one input; for children please consult a doctor, for visas the official embassy site, for cases your lawyer.', 'திருமணம், கர்ப்பம், விசா, நீதிமன்ற முடிவு — எதற்கும் ஜாதகம் உத்தரவாதம் தர முடியாது. இந்தக் காலங்களை ஒரு உள்ளீடாக மட்டும் கொள்ளுங்கள்; குழந்தைக்கு மருத்துவர், விசாவுக்கு அதிகாரப்பூர்வ தூதரகத் தளம், வழக்குக்கு வழக்கறிஞர்.')}</div>` : '';
  $('#lifeOut').innerHTML = `${caution}
    <div class="card glass verdict-card life-head"><div class="ti-icon">${q.icon}</div><div class="mini-label">${esc(displayName(m))} · ${esc(bi(q))}</div>
      <div class="life-answer">${esc(headline)}</div>
      ${noTime ? `<button class="chip-btn" data-go="family" data-param='${esc(JSON.stringify({ edit: m.id }))}'>🕰️ ${L('Add the birth time', 'பிறந்த நேரத்தைச் சேர்')}</button>` : r.promise.level === 'not-assessed' || r.promise.score == null
    ? `<p class="small">🤍 ${L('Every family’s path to a child is its own. Keep both partners’ health routines gentle and regular, follow your doctor’s care, and let the prayer below support you with hope.', 'ஒவ்வொரு குடும்பத்திற்கும் குழந்தை பாக்கியத்திற்கான பாதை தனித்துவமானது. இருவரின் உடல்நல வழக்கத்தையும் மென்மையாகச் சீராக வைத்து, மருத்துவர் வழிகாட்டலைப் பின்பற்றி, கீழே உள்ள வழிபாட்டை நம்பிக்கையுடன் செய்யுங்கள்.')}</p>`
    : `<span class="tag ${r.promise.level === 'strong' || r.promise.level === 'good' ? 'good' : 'warn'}">${L('Promise in chart', 'ஜாதக வாக்குறுதி')}: ${r.promise.level === 'strong' ? L('Strong', 'வலுவானது') : r.promise.level === 'good' ? L('Good', 'நன்று') : L('Comes with effort', 'முயற்சியால் கிடைக்கும்')}</span>`}</div>
    ${r.current ? `<div class="card glass"><div class="mini-label">${L('Running now', 'தற்போது நடப்பது')}</div><div class="mini-value">${esc(dasaLabel(r.current))}</div><div class="muted small">${L(`until ${fmtIsoDate(iso(r.current.end))}`, `${fmtIsoDate(iso(r.current.end))} வரை`)}</div>${stabilityChip(c, 'moonNakshatra', 'moonPada')}</div>` : ''}
    ${noTime ? '' : `<div class="section-title">🌟 ${q.harmony ? L('Best periods for togetherness', 'ஒற்றுமைக்குச் சிறந்த காலங்கள்') : L('Best periods', 'சிறந்த காலங்கள்')} <span class="pill horizon-label">${esc(bi(horizonLabel(years)))}</span></div>`}
    ${r.windows.map((w) => `<div class="card glass window${w === r.earliest ? ' first' : ''}">
      <div class="win-dates">${monthYear(w.peakFrom)} – ${monthYear(w.peakTo)}${w.doubleTransit ? ` <span class="pill dt">${L('Guru + Sani support', 'குரு + சனி ஆதரவு')}</span>` : ''}</div>
      <div class="small">${esc(dasaLabel(w))} <span class="muted">(${fmtIsoDate(iso(w.start))} → ${fmtIsoDate(iso(w.end))})</span></div>
      ${w.reasons.length ? `<div class="small muted">${w.reasons.map((x) => esc(bi(x))).join(' · ')}</div>` : ''}</div>`).join('') || (noTime ? '' : `<div class="card glass window"><p class="small">🌱 ${esc(bi(HORIZON_LINES.windows(years)))}</p></div>`)}
    ${r.careful.length ? `<div class="section-title">🤍 ${L('Periods to be extra caring with each other', 'ஒருவருக்கொருவர் கூடுதல் அன்பு காட்ட வேண்டிய காலங்கள்')}</div>
      ${r.careful.map((w) => `<div class="card glass window care"><div class="win-dates">${monthYear(w.start)} – ${monthYear(w.end)}</div><div class="small">${esc(dasaLabel(w))}</div><p class="small">${L('Patience, shared prayer and open talks keep the bond strong in this period.', 'இந்தக் காலத்தில் பொறுமை, சேர்ந்த வழிபாடு, மனம் திறந்த பேச்சு உறவை வலுப்படுத்தும்.')}</p></div>`).join('')}` : ''}
    <div class="card glass"><div class="card-title">🔍 ${L('What the chart shows', 'ஜாதகம் காட்டுவது')}</div>${r.promise.notes.map((n) => `<div class="small">• ${esc(bi(n))}</div>`).join('')}</div>
    <div class="card glass"><div class="card-title">🪔 ${faith === 'hindu' ? L('Parigaram', 'பரிகாரம்') : L('A simple practice (optional)', 'எளிய வழி (விருப்பம்)')}</div><p>${hymnText(bi(r.remedy))}</p>
      ${r.karakaRemedies.map((k) => `<p class="small"><span style="color:${COLOR[k.planet]}">${GLYPH[k.planet]}</span> ${esc(planetName(k.planet))}: ${hymnText(bi(k.free))}</p>`).join('')}</div>
    <button class="btn-gold" id="lifeExplain">📜 ${L('Detailed explanation', 'விரிவான விளக்கம்')}</button>
    <div class="card glass" id="lifeAi" hidden><div class="card-title"><span>📜 ${L('Explanation', 'விளக்கம்')}</span><button class="link-btn" id="lifeSpeak" aria-label="Read aloud">🔊</button></div><div class="reply" id="lifeText"></div></div>
    <p class="muted small center">${L('Astrology shows favourable timing; effort, family support and the right professional advice make it happen.', 'ஜோதிடம் சாதகமான நேரத்தைக் காட்டும்; முயற்சி, குடும்ப ஆதரவு, சரியான நிபுணர் ஆலோசனையே அதை நிறைவேற்றும்.')}</p>`;
  $('#lifeExplain').addEventListener('click', async () => {
    $('#lifeAi').hidden = false;
    const t = $('#lifeText');
    t.classList.add('typing');
    const context = {
      person: { name: m.name, relation: m.relation, gender: m.gender, ...birthContext(m, c), rasi: c.janmaRasi.name, star: c.janmaNakshatra.name },
      question: q.en, promise: { level: r.promise.level, notes: r.promise.notes.map((n) => n.en) },
      runningNow: r.current && `${r.current.md} Dasa / ${r.current.ad} Bhukti until ${iso(r.current.end)}`,
      coverage: `best periods searched over the next ${years} years`,
      bestPeriods: r.windows.map((w) => ({ from: iso(w.peakFrom), to: iso(w.peakTo), dasa: `${w.md}/${w.ad}`, doubleTransit: w.doubleTransit, why: w.reasons.map((x) => x.en) })),
      periodsNeedingCare: r.careful.map((w) => `${iso(w.start)}..${iso(w.end)} ${w.md}/${w.ad}`),
      remedy: r.remedy.en,
    };
    const fallback = [$('.life-answer').textContent, ...r.windows.map((w) => `🌟 ${monthYear(w.peakFrom)} – ${monthYear(w.peakTo)}: ${dasaLabel(w)}`), `🪔 ${bi(r.remedy)}`].join('\n');
    await aiTask({ task: 'chat', context, messages: [{ role: 'user', content: `Answer this life question like an experienced Tamil astrologer: "${q.en}". Use the computed promise, the best dasa-bhukti periods and transits. Give the most likely timing first, then what helps it happen sooner, then a simple parigaram. Be warm, positive and specific. About 200 words.` }], fallbackText: fallback, onText: (tx) => { t.textContent = tx; } });
    t.classList.remove('typing');
  });
  $('#lifeSpeak').addEventListener('click', () => speak($('#lifeText').textContent));
}

function renderKula(c, m) {
  const k = kulaDeivam(c);
  $('#lifeOut').innerHTML = `<div class="card glass verdict-card life-head"><div class="ti-icon">🛕</div><div class="mini-label">${esc(displayName(m))}</div>
      <div class="life-answer">${L('Your Kula Deivam is a family tradition — ask your elders', 'குலதெய்வம் ஒரு குடும்ப மரபு — பெரியோரிடம் கேளுங்கள்')}</div>
      <p class="small muted">${L('A chart cannot establish a Kula Deivam conclusively. Tradition links your 9th house with this deity form, which some families use only as a hint', 'ஜாதகம் குலதெய்வத்தை உறுதியாக நிர்ணயிக்க முடியாது. உங்கள் 9-ம் பாவத்தைப் பாரம்பரியம் இந்தத் தெய்வ வடிவுடன் இணைக்கிறது; சில குடும்பங்கள் இதைக் குறிப்பாக மட்டும் பயன்படுத்தும்')}: ${esc(bi(k.deity))}</p></div>
    <div class="card glass"><p>${esc(bi(k.guidance))}</p><p class="small muted">${L('9th house', '9-ம் பாவம்')}: ${esc(bi(k.ninthSign))} · ${L('lord', 'அதிபதி')} ${esc(planetName(k.lord))}${k.occupants.length ? ` · ${L('planets', 'கிரகங்கள்')}: ${k.occupants.map((o) => esc(planetName(o))).join(', ')}` : ''}</p></div>
    ${!c.planets.Lagna ? `<p class="small muted"><span class="pill">${L('Moon reference', 'சந்திர லக்னம்')}</span> ${L('The 9th house is counted from the Moon sign because the birth time (Lagna) is not known.', 'பிறந்த நேரம் (லக்னம்) தெரியாததால் 9-ம் பாவம் சந்திர ராசியிலிருந்து கணக்கிடப்பட்டது.')}</p>` : ''}
    ${k.periods.length ? `<div class="card glass"><div class="card-title">🙏 ${L('Especially good periods for a Kula Deivam visit', 'குலதெய்வ தரிசனத்திற்கு சிறப்பான காலங்கள்')}</div>${k.periods.map((p) => `<div class="factor"><span>${GLYPH[p.ad]} ${esc(planetName(p.md))} / ${esc(planetName(p.ad))}</span><b class="zero">${monthYear(p.start)} – ${monthYear(p.end)}</b></div>`).join('')}</div>` : ''}`;
}

function renderCompass(c, m) {
  const r = careerCompass(c);
  $('#lifeOut').innerHTML = `<div class="card glass verdict-card life-head"><div class="ti-icon">🧭</div><div class="mini-label">${esc(displayName(m))}</div>
      <div class="life-answer">${L('Best suited', 'மிகப் பொருத்தமானது')}: ${esc(bi(r.top[0]))}</div>
      ${r.tenthLord ? `<span class="tag good">${L('10th lord', '10-ம் அதிபதி')}: ${GLYPH[r.tenthLord]} ${esc(planetName(r.tenthLord))} · ${esc(bi(r.tenthSign))}</span>${stabilityChip(c, 'lagna')}` : needsTimeNote({ en: 'The 10th house (career) is counted from the Lagna.', ta: '10-ம் பாவம் (தொழில்) லக்னத்திலிருந்து கணக்கிடப்படுகிறது.' })}</div>
    ${r.top.map((f, i) => `<div class="card glass window${i === 0 ? ' first' : ''}"><div class="win-dates">${i + 1}. ${esc(bi(f))} <span class="pill">${f.score}</span></div>
      <p class="small">🎓 ${esc(bi(f.study))}</p>${f.reasons.map((x) => `<div class="small">• ${esc(bi(x))}</div>`).join('')}</div>`).join('')}
    <div class="card glass"><div class="card-title">${L('All fields', 'அனைத்துத் துறைகளும்')}</div>${r.all.map((f) => `<div class="gb-row static"><span class="gb-name">${esc(bi(f))}</span><span class="gb-bar"><i class="${f.score >= 66 ? 'strong' : f.score >= 50 ? 'average' : 'weak'}" style="width:${f.score}%"></i></span><span class="muted small">${f.score}</span></div>`).join('')}</div>
    ${ageOf(m).minor ? `<p class="muted small center">${L('These are interests and natural strengths to explore in studies — not a job prediction. Try what you enjoy, talk to teachers, and choose step by step.', 'இவை படிப்பில் ஆராய வேண்டிய ஆர்வங்களும் இயல்பான திறமைகளும் — வேலைக் கணிப்பு அல்ல. விரும்புவதை முயன்று பாருங்கள், ஆசிரியர்களிடம் பேசுங்கள், படிப்படியாகத் தேர்வு செய்யுங்கள்.')}</p>` : `<p class="muted small center">${L('The chart shows natural talent; interest, hard work and good guidance decide success. Also see "Cinema / serial acting" and "Politics" timing above.', 'ஜாதகம் இயல்பான திறமையைக் காட்டும்; ஆர்வம், கடின உழைப்பு, நல்ல வழிகாட்டுதலே வெற்றியைத் தீர்மானிக்கும். மேலே "சினிமா / சீரியல் நடிப்பு", "அரசியல்" நேரத்தையும் பார்க்கவும்.')}</p>`}`;
}

function renderHabits(c, m) {
  const h = habitGuard(c, { faith: faithOf(m) });
  $('#lifeOut').innerHTML = `<div class="card glass verdict-card life-head"><div class="ti-icon">🛡️</div><div class="mini-label">${esc(displayName(m))}</div>
      <div class="life-answer">${h.level === 'low' ? L('No special tendency shown — keep healthy routines.', 'சிறப்பான போக்கு எதுவும் இல்லை — நல்ல பழக்கங்களைத் தொடருங்கள்.') : h.level === 'mild' ? L('A mild tendency to watch.', 'கவனிக்க வேண்டிய லேசான போக்கு.') : L('Areas to guard carefully.', 'கவனமாகக் காக்க வேண்டியவை.')}</div></div>
    ${h.notes.length ? `<div class="card glass">${h.notes.map((n) => `<div class="small">• ${esc(bi(n))}</div>`).join('')}</div>` : ''}
    <div class="card glass"><div class="card-title">🌿 ${L('What helps', 'உதவுவது')}</div><p>${esc(bi(h.support))}</p></div>`;
}

registerScreen('life', { render: renderLife, parent: 'home', needsMember: true });
