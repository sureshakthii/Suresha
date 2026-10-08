// Hymns & Stotras (தோத்திரங்கள் & பாடல்கள்): the full text of every hymn the app names in its remedies, festivals,
// health guide and answers — Kanda Sashti Kavasam, Vishnu Sahasranamam, Hanuman Chalisa, Aditya Hrudayam …
// List screen 'hymns' and reader 'hymn' ({ id }). The reader shows a short introduction (what, who, when, how long),
// the source edition, then the text in large Tamil script by section, read aloud line by line with the shared
// player (read-aloud.js): highlight, speed, and resume at the last line. Texts load only when opened.
// A hymn whose text is still pending shows its name, meaning and a "full text coming" note — never unverified text.
import { state, $, $$, L, ta, esc, bi, store, registerScreen, subHeader, toast, copyright, go } from './core.js';
import { createPlayer, detectVoice, nativeTts, userHasTapped } from './read-aloud.js';
import { HYMNS, hymnById, hymnReady, loadHymn, speakable } from './shared/hymns.js';

const KEY = 'kj_hymns';
const RATES = [0.7, 0.8, 0.9, 1, 1.1, 1.2];
const loadPrefs = () => { try { return { rate: 0.9, pos: {}, ...(store.get(KEY, {}) || {}) }; } catch { return { rate: 0.9, pos: {} }; } };
const savePrefs = (p) => { try { store.set(KEY, p); } catch { /* ignore */ } };

const LANG = { tamil: { en: 'Tamil', ta: 'தமிழ்' }, sanskrit: { en: 'Sanskrit', ta: 'சம்ஸ்கிருதம்' }, awadhi: { en: 'Awadhi (old Hindi)', ta: 'அவதி (பழைய ஹிந்தி)' } };
const mins = (n) => L(`~${n} min`, `~${n} நிமிடம்`);

// ────────────────────────────────────────────────────────────── player
const player = createPlayer({ textAt: (i) => speakable(player.lines[i] || ''), wpm: 70, lang: 'ta-IN', minMs: 2000 });
Object.assign(player, { lines: [], hymnId: null });
document.addEventListener('kj:screen', (e) => { if (e.detail !== 'hymn') player.stop(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && player.engine === 'none') player.stop(); });

// ────────────────────────────────────────────────────────────── list
function renderList(sec) {
  const prefs = loadPrefs();
  const row = (h) => {
    const at = prefs.pos[h.id];
    const badge = hymnReady(h)
      ? (at ? `<span class="tag warn">${L(`Line ${at + 1}`, `வரி ${at + 1}`)}</span>` : `<span class="tag good">${L('Full text', 'முழுப் பாடல்')}</span>`)
      : `<span class="badge unv">${L('Text coming', 'விரைவில்')}</span>`;
    return `<button class="row hy-row" data-go="hymn" data-param="${esc(JSON.stringify({ id: h.id }))}"><span class="hy-ic" aria-hidden="true">${h.icon}</span><span class="row-txt"><span class="row-name">${esc(bi(h.title))}</span><small>${esc(bi(h.deity))} · ${esc(bi(LANG[h.language]))} · ${mins(h.minutes)}</small></span>${badge}</button>`;
  };
  const ready = HYMNS.filter(hymnReady);
  const coming = HYMNS.filter((h) => !hymnReady(h));
  sec.innerHTML = `${subHeader(L('Hymns & Stotras', 'தோத்திரங்கள் & பாடல்கள்'), L('The full text of the hymns Thunai suggests — read along or listen.', 'துணை பரிந்துரைக்கும் பாடல்களின் முழு வடிவம் — வாசிக்கலாம், கேட்கலாம்.'))}
    <div class="menu list hy-list">${ready.map(row).join('')}</div>
    ${coming.length ? `<h3 class="section-title">${L('Full text coming', 'முழுப் பாடல் விரைவில்')}</h3><div class="menu list hy-list">${coming.map(row).join('')}</div>` : ''}
    <p class="small muted">${L('Texts come only from public-domain source editions, named on each page. Sanskrit and Awadhi hymns are shown in Tamil script (letter for letter); ² ³ ⁴ after a letter mark its harder sound (க² = kha, க³ = ga, க⁴ = gha).', 'பாடல்கள் பொதுப் பயன்பாட்டு (public domain) மூலப் பதிப்புகளிலிருந்து மட்டுமே — ஒவ்வொரு பக்கத்திலும் மூலம் குறிப்பிடப்பட்டுள்ளது. சம்ஸ்கிருத, அவதி பாடல்கள் தமிழ் எழுத்தில் (எழுத்துக்கு எழுத்து); எழுத்தின் பின் வரும் ² ³ ⁴ அழுத்த ஒலியைக் குறிக்கும் (க² = kha, க³ = ga, க⁴ = gha).')}</p>
    ${copyright()}`;
}

// ────────────────────────────────────────────────────────────── reader
async function renderHymn(sec, params = {}) {
  const meta = hymnById(params.id);
  if (!meta) { go('hymns', {}, { back: true }); return; }
  sec.innerHTML = `${subHeader(esc(bi(meta.title)), '', 'hymns')}<div class="loader"><i></i><i></i><i></i></div>`;
  let h;
  try { h = await loadHymn(meta.id); } catch { h = { ...meta, sections: [] }; }
  if (state.view !== 'hymn' || state.params?.id !== meta.id) return;
  const ready = hymnReady(h) && h.sections.length;
  const info = `<div class="card glass hy-intro">
      <div class="hy-head"><span class="hy-big-ic" aria-hidden="true">${h.icon}</span><div><h2 class="hy-title" lang="ta">${esc(h.title.ta)}</h2>${ta() ? '' : `<p class="small muted">${esc(h.title.en)}</p>`}</div></div>
      <p>${esc(bi(h.intro))}</p>
      <dl class="kv small"><dt>${L('By', 'அருளியவர்')}</dt><dd>${esc(bi(h.author))}</dd>
        <dt>${L('Deity', 'தெய்வம்')}</dt><dd>${esc(bi(h.deity))}</dd>
        <dt>${L('When', 'எப்போது')}</dt><dd>${esc(bi(h.when))}</dd>
        <dt>${L('Time', 'நேரம்')}</dt><dd>${mins(h.minutes)}</dd>
        <dt>${L('Language', 'மொழி')}</dt><dd>${esc(bi(LANG[h.language]))}${h.transliterated ? ` · ${L('shown in Tamil script (transliterated letter for letter)', 'தமிழ் எழுத்தில் (எழுத்துக்கு எழுத்து ஒலிபெயர்ப்பு)')}` : ''}</dd></dl>
    </div>`;
  if (!ready) {
    sec.innerHTML = `${subHeader(esc(bi(meta.title)), '', 'hymns')}${info}
      <div class="card glass hy-coming" role="status"><b>📜 ${L('Full text coming', 'முழுப் பாடல் விரைவில்')}</b>
        <p class="small">${L('We add a hymn only after its text is checked against a public-domain source edition, so that every word is exact.', 'ஒவ்வொரு சொல்லும் துல்லியமாக இருக்க, பொதுப் பயன்பாட்டு மூலப் பதிப்புடன் சரிபார்த்த பிறகே பாடலைச் சேர்க்கிறோம்.')}</p>
        ${h.pendingWhy ? `<p class="small muted">${esc(bi(h.pendingWhy))}</p>` : ''}
        <p class="small muted">${L('Planned source', 'திட்டமிட்ட மூலம்')}: ${esc(h.source?.name || '')}</p></div>
      ${copyright()}`;
    return;
  }
  const lines = h.sections.flatMap((s) => s.lines);
  const prefs = loadPrefs();
  const start = Math.min(prefs.pos[h.id] || 0, lines.length - 1);
  const rate = RATES.includes(prefs.rate) ? prefs.rate : 0.9;
  let k = 0;
  const body = h.sections.map((s) => `<section class="hy-sec"><h3 class="hy-sec-title">${esc(bi(s.title))}</h3>${s.lines.map((l) => { const i = k++; return `<p class="hy-line${i === start && start ? ' cur' : ''}" data-i="${i}">${esc(l)}</p>`; }).join('')}</section>`).join('');
  sec.innerHTML = `${subHeader(esc(bi(meta.title)), '', 'hymns')}${info}
    <p class="hy-voice-note small" id="hyVoiceNote" hidden></p>
    <article class="hy-read" lang="ta">${body}</article>
    <div class="ith-bar hy-bar" role="region" aria-label="${esc(L('Reading controls', 'வாசிப்புக் கட்டுப்பாடு'))}">
      <button class="ith-btn" id="hyPrev" aria-label="${esc(L('Previous line', 'முந்தைய வரி'))}">⏮</button>
      <button class="ith-btn ith-play" id="hyPlay" aria-label="${esc(L('Play', 'இயக்கு'))}">▶</button>
      <button class="ith-btn" id="hyNext" aria-label="${esc(L('Next line', 'அடுத்த வரி'))}">⏭</button>
      <span class="ith-pos small" id="hyPos" aria-live="polite"></span>
      <label class="ith-rate small"><span class="sr-only">${L('Speed', 'வேகம்')}</span><select id="hyRate" aria-label="${esc(L('Speed', 'வேகம்'))}">${RATES.map((r) => `<option value="${r}"${r === rate ? ' selected' : ''}>${r}×</option>`).join('')}</select></label>
    </div>
    <p class="small muted hy-source">${L('Source', 'மூலம்')}: <a href="${esc(h.source.url)}" target="_blank" rel="noopener">${esc(h.source.name)}</a> · ${L('retrieved', 'பெறப்பட்டது')} ${esc(h.source.retrieved || '')}${h.transliterated ? ` · ${L('Tamil-script transliteration by Thunai from the Devanagari of this edition; only the original verses are used, no translation.', 'இந்தப் பதிப்பின் தேவநாகரியிலிருந்து துணை செய்த தமிழ் எழுத்து ஒலிபெயர்ப்பு; மூலச் சுலோகங்கள் மட்டுமே, மொழிபெயர்ப்பு இல்லை.')}` : ''}</p>
    ${copyright()}`;

  const rows = $$('.hy-line', sec);
  const playBtn = $('#hyPlay', sec);
  const pos = $('#hyPos', sec);
  const note = $('#hyVoiceNote', sec);
  player.stop();
  Object.assign(player, { lines, max: lines.length, rate, i: start, hymnId: h.id });
  const posText = (i) => `${i + 1} / ${lines.length}`;
  const highlight = (i) => {
    rows.forEach((p, n) => p.classList.toggle('cur', n === i));
    pos.textContent = posText(i);
    if (i > 0) rows[i]?.scrollIntoView?.({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    const p = loadPrefs(); p.pos[h.id] = i; savePrefs(p);
  };
  player.onPara = highlight;
  player.onState = () => {
    if (!playBtn.isConnected) return;
    playBtn.textContent = player.playing ? '⏸' : '▶';
    playBtn.setAttribute('aria-label', player.playing ? L('Pause', 'நிறுத்து') : L('Play', 'இயக்கு'));
    playBtn.classList.toggle('on', player.playing);
  };
  player.onEnd = () => { const p = loadPrefs(); delete p.pos[h.id]; savePrefs(p); toast(L('Completed 🙏', 'பாராயணம் நிறைவு 🙏')); };
  pos.textContent = posText(start);
  detectVoice().then((v) => {
    if (!note.isConnected || v.engine !== 'none') return;
    note.hidden = false;
    note.textContent = `🔈 ${'speechSynthesis' in window || nativeTts() ? L('No Tamil voice on this device — add Tamil in Google Text-to-Speech. Play still moves line by line at reading pace.', 'உங்கள் கருவியில் தமிழ்க் குரல் இல்லை — Google Text-to-Speech-ல் தமிழ் சேர்க்கவும். ▶ அழுத்தினால் வாசிக்கும் வேகத்தில் வரி வரியாக நகரும்.') : L('Read-aloud is not available on this device; Play moves line by line at reading pace.', 'இந்தக் கருவியில் குரல் வாசிப்பு இல்லை; ▶ அழுத்தினால் வரி வரியாக நகரும்.')}`;
  });
  const move = (i) => { if (player.playing) player.playFrom(i); else { player.i = i; highlight(i); } };
  playBtn.addEventListener('click', () => { if (player.playing) player.stop(); else player.playFrom(player.i); });
  $('#hyPrev', sec).addEventListener('click', () => move(Math.max(0, player.i - 1)));
  $('#hyNext', sec).addEventListener('click', () => move(Math.min(lines.length - 1, player.i + 1)));
  $('#hyRate', sec).addEventListener('change', (e) => { const r = Number(e.target.value); const p = loadPrefs(); p.rate = r; savePrefs(p); player.rate = r; if (player.playing) player.playFrom(player.i); });
  rows.forEach((p) => p.addEventListener('click', () => move(Number(p.dataset.i))));
  if (start) requestAnimationFrame(() => rows[start]?.scrollIntoView?.({ block: 'center' }));
  if (params.auto && userHasTapped()) player.playFrom(start);
}

registerScreen('hymns', { render: renderList, parent: 'services' });
registerScreen('hymn', { render: renderHymn, parent: 'hymns' });
