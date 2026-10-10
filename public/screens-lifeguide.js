// Life Guide (வாழ்க்கை வழிகாட்டி): "Who am I" from the person's own jathagam, and the Magic Tap — five quick taps that
// turn what is on their mind into WHY · WHEN · WHAT · WHERE, with a parigaram and a 7-day start (shared/life-guide.js).
import { state, L, esc, bi, registerScreen, subHeader, go, activeMember, chartOf, displayName, planetName, copyright } from './core.js';
import { reliabilityOf, ageOf, isMarried } from './screens-main.js';
import { whoAmI, lifeGuide, checkFor } from './shared/life-guide.js';
import { fmtMonth, weekdayName } from './shared/fmt.js';
import { hymnText } from './hymn-links.js';

const ui = { mode: 'who', step: 0, answers: {}, person: null };
const lgx = () => (state.lang === 'en' ? 'en' : 'ta');
const li = (x) => `<li>${hymnText(bi(x))}</li>`;

function personOf() {
  const m = activeMember();
  if (!m || m.relation === 'organization') return null;
  const rel = reliabilityOf(m);
  return { m, chart: chartOf(m), prof: ageOf(m), married: isMarried(m), lagna: rel.lagna !== false, tz: Number.isFinite(Number(m.tz)) ? Number(m.tz) : (state.loc?.tz ?? 5.5) };
}

function whoHtml(p) {
  const w = whoAmI(p.chart, { lagnaReliable: p.lagna, profile: p.prof });
  if (!w) return '';
  const outerLabel = w.outer.from === 'lagna' ? L(`${w.outer.sign.en} Lagna`, `${w.outer.sign.ta} லக்னம்`) : L(`${w.outer.sign.en} Moon sign`, `${w.outer.sign.ta} ராசி`);
  return `<section class="card glass lg-who" aria-labelledby="lgWho">
      <div class="card-title" id="lgWho">🪷 ${L(`Who is ${esc(displayName(p.m))}?`, `${esc(displayName(p.m))} — யார்?`)}</div>
      <div class="lg-block"><div class="lg-k">${L('How people see you', 'மற்றவர்கள் பார்க்கும் நீங்கள்')} · <span class="muted">${esc(outerLabel)}</span></div>
        <p>${esc(bi(w.outer.traits))}.</p>
        <p class="small">✨ ${L('Your gift', 'உங்கள் வரம்')}: <b>${esc(bi(w.outer.gift))}</b> · ⚠️ ${L('Watch', 'கவனிக்க')}: ${esc(bi(w.outer.watch))}</p></div>
      <div class="lg-block"><div class="lg-k">${L('Your mind inside', 'உள்ளே உங்கள் மனம்')} · <span class="muted">${esc(L(`${w.mind.sign.en} Moon sign`, `${w.mind.sign.ta} ராசி`))}</span></div>
        <p>${esc(bi(w.mind.traits))}.</p>
        <p class="small">${esc(bi(w.stress.shows))} ${esc(bi(w.stress.calm))}</p></div>
      <div class="lg-block"><div class="lg-k">💪 ${L('Your strengths', 'உங்கள் பலங்கள்')}</div>
        <ul class="lg-list">${w.strengths.map((s) => `<li><b>${esc(planetName(s.planet))}</b> — ${esc(bi(s.text))}</li>`).join('')}</ul></div>
      <div class="lg-block"><div class="lg-k">🌱 ${L('Where you can grow', 'நீங்கள் வளர வேண்டிய இடம்')}</div>
        <ul class="lg-list">${w.growth.map((g) => `<li><b>${esc(planetName(g.planet))}</b> — ${esc(bi(g.pattern))}.<br><span class="small">👉 ${esc(bi(g.step))}</span></li>`).join('')}</ul></div>
      <div class="lg-block"><div class="lg-k">🤝 ${L('How to present yourself to society', 'சமூகத்தில் உங்களை எப்படி முன்வைப்பது')}</div><p>${esc(bi(w.present))}</p></div>
      ${w.dasa ? `<div class="lg-block"><div class="lg-k">🕰️ ${L('The chapter of life now', 'இப்போதைய வாழ்க்கைப் பருவம்')}</div><p>${esc(L(`${planetName(w.dasa.lord)} Mahadasa`, `${planetName(w.dasa.lord)} மகா தசை`))}: ${esc(bi(w.dasa.theme))}.</p></div>` : ''}
      ${p.lagna ? '' : `<p class="small muted">${L('Birth time is not exact, so this reads from the Moon sign. Add the exact time for the Lagna view.', 'பிறந்த நேரம் துல்லியமாக இல்லை; அதனால் இது ராசியிலிருந்து. லக்னப் பார்வைக்குத் துல்லிய நேரத்தைச் சேருங்கள்.')}</p>`}
    </section>
    <button class="btn-gold lg-magic" type="button" data-lg="start">✨ ${L('Magic Tap — tell Thunai what is on your mind', 'மேஜிக் டேப் — உங்கள் மனதில் உள்ளதைத் துணையிடம் சொல்லுங்கள்')}</button>
    <p class="small muted center">${L('Five quick taps. No typing. Thunai reads your chart with your answers.', 'ஐந்து விரைவான தொடுதல்கள். எழுத வேண்டியதில்லை. உங்கள் பதில்களுடன் துணை உங்கள் ஜாதகத்தைப் படிக்கும்.')}</p>`;
}

function checkHtml(p) {
  const qs = checkFor(p.prof, { married: p.married });
  const q = qs[ui.step];
  return `<section class="card glass lg-check" aria-labelledby="lgQ">
      <div class="lg-dots" aria-label="${esc(L(`Question ${ui.step + 1} of ${qs.length}`, `கேள்வி ${ui.step + 1} / ${qs.length}`))}">${qs.map((_, i) => `<i class="${i < ui.step ? 'done' : i === ui.step ? 'cur' : ''}"></i>`).join('')}</div>
      <h3 id="lgQ" class="lg-q">${esc(bi(q.q))}</h3>
      <div class="lg-opts">${q.options.map((o) => `<button type="button" class="lg-opt${ui.answers[q.id] === o.id ? ' sel' : ''}" data-q="${q.id}" data-o="${o.id}">${esc(bi(o.label))}</button>`).join('')}</div>
      <div class="btn-row"><button type="button" class="chip-btn" data-lg="${ui.step ? 'back' : 'who'}">‹ ${L('Back', 'பின்')}</button></div>
    </section>`;
}

function resultHtml(p) {
  const g = lifeGuide(p.chart, ui.answers, { profile: p.prof, married: p.married, lagnaReliable: p.lagna });
  const lang = lgx();
  const range = (x) => `${fmtMonth(new Date(x.start), lang, p.tz)} – ${fmtMonth(new Date(x.end), lang, p.tz)}`;
  const pg = g.parigaram;
  return `${g.help ? `<section class="card glass lg-help" role="alert"><div class="card-title">🤝 ${L('You are not alone', 'நீங்கள் தனியாக இல்லை')}</div><p>${esc(bi(g.help))}</p></section>` : ''}
    <section class="card glass lg-res"><div class="card-title">🧭 ${esc(L(`About ${g.area.en}`, `${g.area.ta} பற்றி`))}</div>
      <div class="lg-block"><div class="lg-k">❓ ${L('Why', 'ஏன்?')}</div><ul class="lg-list">${g.why.map(li).join('')}</ul></div>
      <div class="lg-block"><div class="lg-k">📅 ${L('When', 'எப்போது?')}</div>
        ${g.when.periods.length ? `<ul class="lg-list">${g.when.periods.map((w) => `<li><b>${esc(range(w))}</b>${w.reason ? `<br><span class="small muted">${esc(bi(w.reason))}</span>` : ''}</li>`).join('')}</ul>
          <p class="small muted">${L('Supportive periods by tradition (Dasa–Bhukti and Guru–Sani transit) — prepare in the months before.', 'பாரம்பரியப்படி சாதகமான காலங்கள் (தசா–புக்தி, குரு–சனி கோசாரம்) — அதற்கு முந்தைய மாதங்களில் தயாராகுங்கள்.')}</p>` : ''}
        ${g.when.note ? `<p>${esc(bi(g.when.note))}</p>` : ''}</div>
      <div class="lg-block"><div class="lg-k">✅ ${L('What you can do', 'என்ன செய்யலாம்?')}</div><ol class="lg-list">${g.what.map(li).join('')}</ol></div>
      <div class="lg-block"><div class="lg-k">📍 ${L('Where', 'எங்கே?')}</div><ul class="lg-list">${g.where.map(li).join('')}</ul></div>
    </section>
    ${pg ? `<section class="card glass lg-pari"><div class="card-title">🪔 ${L('Parigaram (optional)', 'பரிகாரம் (விருப்பம்)')} · ${esc(planetName(pg.planet))}</div>
      <p><b>${esc(bi(pg.deity))}</b> · ${esc(L(`${weekdayName(pg.day, 'en')}s`, weekdayName(pg.day, 'ta')))}</p>
      <p>🕉️ ${hymnText(bi(pg.mantra))}</p><p class="small">${esc(bi(pg.free))}</p>${pg.charity ? `<p class="small muted">${esc(bi(pg.charity))}</p>` : ''}</section>` : ''}
    <section class="card glass lg-week"><div class="card-title">🗓️ ${L('Your 7-day start', 'உங்கள் 7 நாள் தொடக்கம்')}</div>
      <ol class="lg-list">${g.week.map((x, i) => `<li><b>${L(`Day ${i + 1}`, `நாள் ${i + 1}`)}:</b> ${esc(bi(x))}</li>`).join('')}</ol></section>
    <section class="card glass lg-karma"><p class="lg-karma-line">${esc(bi(g.karma.line))}</p><p class="small">${esc(bi(g.karma.meaning))}</p></section>
    <p class="small muted center">${esc(bi(g.note))}</p>
    <div class="btn-row center"><button type="button" class="chip-btn" data-lg="again">↺ ${L('Start again', 'மீண்டும் தொடங்கு')}</button><button type="button" class="chip-btn" data-lg="ask">💬 ${L('Ask Thunai more', 'துணையிடம் மேலும் கேளுங்கள்')} ›</button>${['job_change', 'business', 'marriage', 'health', 'abroad'].includes(g.concern) && p.prof.adult ? `<button type="button" class="chip-btn" data-go="foryou">🌍 ${L('Thunai For You — find openings', 'துணை உங்களுக்காக — வாய்ப்புகளைத் தேடுங்கள்')} ›</button>` : ''}</div>`;
}

function renderLifeGuide(sec, params = {}) {
  const p = personOf();
  if (params.start && ui.mode === 'who') { ui.mode = 'check'; ui.step = 0; ui.answers = {}; }
  if (p && ui.person !== p.m.id) { ui.person = p.m.id; if (!params.start) { ui.mode = 'who'; ui.step = 0; ui.answers = {}; } }
  const title = subHeader(L('Life Guide', 'வாழ்க்கை வழிகாட்டி'), L('Who you are, and how to handle what is on your mind', 'நீங்கள் யார் — மனதில் உள்ளதை எப்படிக் கையாள்வது'));
  if (!p) {
    sec.innerHTML = `${title}<div class="card glass cta-card" data-go="family" data-param='{"add":true}'>${L('Add your birth details to see your Life Guide', 'உங்கள் வாழ்க்கை வழிகாட்டியைப் பார்க்க பிறப்பு விவரங்களைச் சேருங்கள்')} ›</div>${copyright()}`;
    return;
  }
  sec.innerHTML = `${title}${ui.mode === 'who' ? whoHtml(p) : ui.mode === 'check' ? checkHtml(p) : resultHtml(p)}${copyright()}`;
  const rerender = () => { renderLifeGuide(sec); sec.scrollIntoView?.({ block: 'start' }); window.scrollTo?.(0, 0); };
  sec.querySelectorAll('[data-lg]').forEach((b) => b.addEventListener('click', () => {
    const a = b.dataset.lg;
    if (a === 'start' || a === 'again') { ui.mode = 'check'; ui.step = 0; ui.answers = {}; }
    else if (a === 'who') ui.mode = 'who';
    else if (a === 'back') ui.step = Math.max(0, ui.step - 1);
    else if (a === 'ask') {
      const g = checkFor(p.prof, { married: p.married })[0].options.find((o) => o.id === ui.answers.concern);
      go('chat', { q: g ? L(`What should I know about ${g.label.en.toLowerCase()} from my chart?`, `${g.label.ta} பற்றி என் ஜாதகம் என்ன சொல்கிறது?`) : '' });
      return;
    }
    rerender();
  }));
  sec.querySelectorAll('.lg-opt').forEach((b) => b.addEventListener('click', () => {
    ui.answers[b.dataset.q] = b.dataset.o;
    const n = checkFor(p.prof, { married: p.married }).length;
    if (ui.step < n - 1) ui.step += 1; else ui.mode = 'result';
    rerender();
  }));
}
registerScreen('lifeguide', { render: renderLifeGuide, parent: 'home', needsLoc: false });
