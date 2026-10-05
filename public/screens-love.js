// Love Match (காதல் பொருத்தம்) — a friendly, shareable compatibility read for two people from both birth charts.
// Partner details are used only on this phone and are not saved unless the user ticks "Save to my family list".
import { birthChart } from './shared/astro.js';
import { loveMatch } from './shared/love.js';
import { closingPrayer } from './shared/daily.js';
import { state, $, L, esc, bi, registerScreen, subHeader, toast, displayName, saveFamily } from './core.js';
import { personBlock, wirePersonBlocks, forms } from './screens-couple.js';

let result = null;

function chartFor(slot) {
  const f = forms[slot];
  if (f.mode === 'family' && state.family.length) {
    const m = state.family.find((x) => x.id === f.memberId) || state.family.find((x) => x.relation !== 'organization');
    return { chart: birthChart(m), name: displayName(m), gender: m.gender, timeKnown: m.timeCertainty !== 'unknown' };
  }
  if (!f.name || !f.date) throw new Error(L('Please enter a name and birth date for both people.', 'இருவருக்கும் பெயர், பிறந்த தேதியை உள்ளிடவும்.'));
  const loc = f.lat != null ? { lat: Number(f.lat), lon: Number(f.lon), tz: Number(f.tz) } : { lat: state.loc?.lat ?? 13.08, lon: state.loc?.lon ?? 80.27, tz: state.loc?.tz ?? 5.5 };
  const time = f.time ? (f.time.length === 5 ? `${f.time}:00` : f.time) : '12:00:00';
  const m = { name: f.name.trim(), gender: f.gender, date: f.date, time, place: f.place || '', ...loc };
  if (f.save && !state.family.some((x) => x.date === m.date && x.name === m.name)) {
    state.family.push({ ...m, id: Math.random().toString(36).slice(2, 10), relation: 'other', timeCertainty: f.time ? 'exact' : 'unknown' });
    saveFamily();
  }
  return { chart: birthChart(m), name: m.name, gender: m.gender, timeKnown: !!f.time };
}

function meter(m) {
  return `<div class="lv-meter"><div class="lv-mh"><span>${m.icon} ${esc(bi(m.name))}</span><b>${m.score}%</b></div>
    <div class="lv-bar"><i style="width:${m.score}%"></i></div><p class="small muted">${esc(bi(m.why))}</p></div>`;
}

function renderResult() {
  const r = result;
  if (!r) return '';
  const pr = closingPrayer(r.charts[0]);
  return `<section class="card glass lv-result" aria-live="polite">
      <div class="lv-names">${esc(r.names[0])} <span>💞</span> ${esc(r.names[1])}</div>
      <div class="lv-ring" style="--p:${r.vibe}"><b>${r.vibe}%</b><span>${L('Love vibe', 'காதல் அதிர்வு')}</span></div>
      <div class="lv-tier">${esc(bi(r.tier))}</div>
      ${r.approx ? `<p class="small muted center">${L('One birth time is not known — Moon-based results may shift a little.', 'ஒருவரின் பிறந்த நேரம் தெரியவில்லை — சந்திர அடிப்படை முடிவுகள் சற்று மாறலாம்.')}</p>` : ''}
    </section>
    <section class="card glass">${r.meters.map(meter).join('')}</section>
    ${r.green.length ? `<section class="card glass"><div class="card-title">💚 ${L('Green flags', 'பலங்கள்')}</div><ul class="lv-list">${r.green.map((x) => `<li>${esc(bi(x))}</li>`).join('')}</ul></section>` : ''}
    ${r.work.length ? `<section class="card glass"><div class="card-title">🛠️ ${L('Grow together on', 'சேர்ந்து வளர வேண்டியவை')}</div><ul class="lv-list">${r.work.map((x) => `<li>${esc(bi(x))}</li>`).join('')}</ul></section>` : ''}
    <section class="card glass"><div class="card-title">📅 ${L('Best day for a date', 'சந்திப்புக்கு உகந்த நாள்')}</div><p>${esc(bi(r.dateDay))}</p>
      ${r.rajjuOk ? '' : `<p class="small">⚠️ ${L('Rajju / Vedhai does not match in the traditional star match. For marriage, please do the detailed matching with family.', 'பாரம்பரிய நட்சத்திரப் பொருத்தத்தில் ரஜ்ஜு / வேதை பொருந்தவில்லை. திருமணம் என்றால் குடும்பத்துடன் விரிவான பொருத்தம் பாருங்கள்.')}</p>`}
      <div class="btn-row"><button class="chip-btn" data-go="couple">💍 ${L('Detailed marriage matching', 'விரிவான திருமணப் பொருத்தம்')}</button></div></section>
    <p class="small muted">${L('Love is built by respect, consent, honesty and time. This reading helps you understand each other — it does not decide anyone’s worth or your future together.', 'காதல் மரியாதை, சம்மதம், நேர்மை, காலம் ஆகியவற்றால் உருவாகிறது. இந்த வாசிப்பு ஒருவரை ஒருவர் புரிந்துகொள்ள உதவும் — யாருடைய மதிப்பையும், உங்கள் எதிர்காலத்தையும் தீர்மானிப்பதில்லை.')}</p>
    ${pr ? `<div class="dc-prayer">🙏 ${pr.lines.map((x) => esc(bi(x))).join(' · ')}</div>` : ''}
    <button class="btn-gold" id="lvShare">📤 ${L('Share our love vibe', 'எங்கள் காதல் அதிர்வைப் பகிர்')}</button>`;
}

function renderLove(sec) {
  sec.innerHTML = `${subHeader(L('Love Match', 'காதல் பொருத்தம்'), L('Emotional sync, chemistry, communication and the star match — from both birth charts', 'உணர்வு, ஈர்ப்பு, பேச்சு இணக்கம், நட்சத்திரப் பொருத்தம் — இருவரின் ஜாதகத்திலிருந்து'))}
    ${personBlock('loveA', `💗 ${L('You', 'நீங்கள்')}`, { nth: 0 })}
    ${personBlock('loveB', `💙 ${L('Your person', 'உங்கள் அன்பானவர்')}`, { nth: 1 })}
    <p class="small muted">${L('Birth time is optional here. Partner details stay on this phone unless you choose to save them.', 'இங்கு பிறந்த நேரம் விருப்பம். நீங்கள் சேமிக்காவிட்டால் விவரங்கள் இந்தக் கைப்பேசியிலேயே இருக்கும்.')}</p>
    <button class="btn-gold" id="lvGo">💘 ${L('Check our love vibe', 'எங்கள் காதல் அதிர்வைப் பார்')}</button>
    <div id="lvOut">${renderResult()}</div>`;
  wirePersonBlocks(sec, () => renderLove(sec));
  $('#lvGo').addEventListener('click', () => {
    try {
      const a = chartFor('loveA'), b = chartFor('loveB');
      const ageOf = (c) => Math.floor((Date.now() - new Date(`${c.date}T00:00:00Z`)) / 31557600000);
      if (ageOf(a.chart) < 18 || ageOf(b.chart) < 18) {
        result = null;
        $('#lvOut').innerHTML = `<section class="card glass"><div class="card-title">🌱 ${L('Not for minors', 'சிறு வயதினருக்கு அல்ல')}</div><p>${L('Love and marriage matching is read only when both people are 18 or older. For now, the chart guides studies, health and friendships.', 'காதல் / திருமணப் பொருத்தம் இருவருக்கும் 18 வயது நிறைந்த பிறகே பார்க்கப்படும். இப்போது ஜாதகம் கல்வி, ஆரோக்கியம், நட்புக்கே வழிகாட்டும்.')}</p></section>`;
        return;
      }
      result = { ...loveMatch(a.chart, b.chart, { genderA: a.gender, genderB: b.gender, names: [a.name, b.name] }), charts: [a.chart, b.chart], approx: !a.timeKnown || !b.timeKnown };
      $('#lvOut').innerHTML = renderResult();
      wireShare();
      $('#lvOut').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (e) { toast(e.message); }
  });
  wireShare();
}

function wireShare() {
  $('#lvShare')?.addEventListener('click', () => {
    const r = result;
    const text = [`💞 ${r.names[0]} + ${r.names[1]} — ${L('Love vibe', 'காதல் அதிர்வு')} ${r.vibe}% · ${bi(r.tier)}`,
      ...r.meters.map((m) => `${m.icon} ${bi(m.name)}: ${m.score}%`), '',
      `${L('Check yours on', 'உங்களுடையதைப் பாருங்கள்')} ${L('Thunai', 'துணை')} — ${L('Your companion on life’s path', 'உங்கள் வாழ்வின் வழித்துணை')}`].join('\n');
    if (navigator.share) { navigator.share({ text }).catch(() => {}); return; }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  });
}

registerScreen('lovematch', { render: renderLove, parent: 'familyhub' });
