// Daily Ithihasa (இதிகாசத் தொடர்): a ~15-minute Tamil urai of Ramayanam / Mahabharatham each day, read aloud.
// Continuity: one new episode opens per residence day after the previous one is finished, the reader resumes at the
// paragraph where they stopped, a "previously" line opens each episode, and a streak counts the days in a row.
// Premium: free = intro + episode 1 + a ~2-minute preview of later episodes (feature 'ithihasa', shared/plan-gates.js).
// Audio: Web Speech API with a Tamil (ta-IN) voice; a native TextToSpeech plugin is used when the app has one. With
// no Tamil voice the text still steps paragraph by paragraph at reading pace ("read-along"), and a note explains how
// to add the voice. Browsers allow speech only after a tap, so auto-read starts on the first tap when needed.
import { state, $, $$, L, ta, esc, bi, store, registerScreen, subHeader, toast, copyright, go } from './core.js';
import { isLocked, lockCard } from './growth.js';
import { addReminder, upcomingReminders, deleteReminder } from './remind.js';
import { createPlayer, detectVoice, nativeTts, userHasTapped } from './read-aloud.js';
import {
  SERIES_LIST, loadSeries, todayIn, episodeFor, unlockedUpTo, savePosition, resumeAt, markDone, currentStreak, doneCount,
  minutesOf, readableParas, episodeAccess, previously, newProgress, CHARACTERS, addDays, WORDS_PER_MINUTE,
} from './shared/ithihasa/index.js';

const KEY = 'kj_ithihasa';
const RATES = [0.8, 0.9, 1, 1.1, 1.2];
const loadPrefs = () => ({ series: 'ramayanam', autoRead: true, rate: 1, autoScroll: true, remind: null, progress: {}, ...(store.get(KEY, {}) || {}) });
const savePrefs = (p) => store.set(KEY, p);
/** Residence date — episodes open by the calendar where the person lives (not the phone's travel zone). */
const residenceZone = () => state.residence?.zone || state.residence?.tz || state.loc?.zone || state.loc?.tz || 5.5;
const today = () => todayIn(residenceZone(), new Date());
const allowedFull = () => !isLocked('ithihasa');
const progressOf = (prefs, id) => prefs.progress[id] || null;
const setProgress = (id, p) => { const prefs = loadPrefs(); prefs.progress[id] = p; savePrefs(prefs); };

// ────────────────────────────────────────────────────────────── player (one at a time; shared with the hymn reader)
const player = createPlayer({ textAt: (i) => player.ep.ta[i], wpm: WORDS_PER_MINUTE, lang: 'ta-IN' });
Object.assign(player, { ep: null, seriesId: null });
const stopAudio = () => player.stop();
const playFrom = (i) => player.playFrom(i);
document.addEventListener('kj:screen', (e) => { if (e.detail !== 'ithihasa') stopAudio(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && player.engine === 'none') stopAudio(); });

// ────────────────────────────────────────────────────────────── reminder (rolling daily, via remind.js)
const REM_TITLE_TA = '📖 இன்றைய இதிகாசப் பகுதி';
const REM_TITLE_EN = '📖 Today’s Ithihasa episode';
const isOurReminder = (t) => t.title === REM_TITLE_TA || t.title === REM_TITLE_EN;
/** Instant of HH:MM on a residence date (uses the residence's current offset). */
function instantOn(date, hhmm) {
  const off = Number(state.residence?.tz ?? state.loc?.tz ?? 5.5);
  const [y, m, d] = date.split('-').map(Number); const [h, mi] = hhmm.split(':').map(Number);
  return new Date(Date.UTC(y, m - 1, d, h, mi) - off * 3600000);
}
/** Keep the next 7 daily reminders scheduled (each one is an ordinary reminder the person can also delete). */
async function topUpReminders(time) {
  const mine = upcomingReminders(200).filter(isOurReminder);
  const have = new Set(mine.map((t) => t.date));
  const t0 = today();
  let added = 0;
  for (let k = 0; k < 7; k++) {
    const day = addDays(t0, k);
    const at = instantOn(day, time);
    if (at.getTime() <= Date.now() + 60000 || have.has(day)) continue;
    await addReminder({ title: L(REM_TITLE_EN, REM_TITLE_TA), eventAt: at, alarmAt: at });
    added++;
  }
  return added;
}
function clearReminders() { for (const t of upcomingReminders(200).filter(isOurReminder)) deleteReminder(t.id); }

// ────────────────────────────────────────────────────────────── screen
const charChips = (ids = []) => ids.filter((c) => CHARACTERS[c]).slice(0, 8).map((c) => `<span class="pill ith-char">${esc(bi(CHARACTERS[c]))}</span>`).join('');
const minsText = (n) => L(`~${n} min`, `~${n} நிமிடம்`);

async function render(sec, params = {}) {
  const prefs = loadPrefs();
  const seriesId = params.series || prefs.series || 'ramayanam';
  if (prefs.series !== seriesId) { prefs.series = seriesId; savePrefs(prefs); }
  sec.innerHTML = `${subHeader(L('Daily Ithihasa', 'இதிகாசத் தொடர்'), '', 'services')}<div class="loader"><i></i><i></i><i></i></div>`;
  const series = await loadSeries(seriesId);
  if (state.view !== 'ithihasa') return;
  if (params.ep && series) return renderEpisode(sec, series, Number(params.ep), params);
  renderHome(sec, series, seriesId);
}

function seriesTabs(seriesId) {
  return `<div class="seg ith-series" role="tablist">${SERIES_LIST.map((s) => `<button role="tab" aria-selected="${s.id === seriesId}" class="${s.id === seriesId ? 'sel' : ''}" data-series="${s.id}">${s.icon} ${esc(bi(s.title))}</button>`).join('')}</div>`;
}

function renderHome(sec, series, seriesId) {
  const prefs = loadPrefs();
  const d = today();
  const meta = SERIES_LIST.find((s) => s.id === seriesId);
  if (!series) {
    sec.innerHTML = `${subHeader(L('Daily Ithihasa', 'இதிகாசத் தொடர்'), L('A 15-minute Tamil story-telling each day, read aloud.', 'ஒவ்வொரு நாளும் 15 நிமிட உரை — குரலில் வாசிப்புடன்.'), 'services')}
      ${seriesTabs(seriesId)}
      <div class="card glass" role="status"><b>${esc(bi(meta?.title))}</b><p class="small">${L('This series is being prepared and will open soon.', 'இந்தத் தொடர் தயாராகிறது; விரைவில் திறக்கும்.')}</p></div>${copyright()}`;
    wireTabs(sec);
    return;
  }
  const total = series.episodes.length;
  const prog = progressOf(prefs, seriesId) || newProgress(d);
  const pick = episodeFor(prog, total, d);
  const ep = series.episodes[pick.n - 1];
  const up = unlockedUpTo(prog, total, d);
  const streak = currentStreak(prog, d);
  const full = allowedFull();
  const access = episodeAccess(ep.n, full);
  const label = { today: L('Today’s episode', 'இன்றைய பகுதி'), continue: L('Continue yesterday’s episode', 'நேற்றைய பகுதியைத் தொடருங்கள்'), resume: L('Continue where you stopped', 'நிறுத்திய இடத்திலிருந்து தொடருங்கள்'), waiting: L('Done for today 🙏', 'இன்றைய பகுதி நிறைவு 🙏'), finished: L('Series complete 🙏', 'தொடர் நிறைவு 🙏') }[pick.kind];
  const cta = pick.kind === 'waiting' || pick.kind === 'finished'
    ? `<button class="chip-btn" data-open="${ep.n}">↺ ${L('Read again', 'மீண்டும் வாசி')}</button>`
    : `<button class="btn-gold ith-cta" data-open="${ep.n}" data-auto="1">▶ ${pick.para ? L(`Continue (paragraph ${pick.para + 1})`, `தொடர்க (பத்தி ${pick.para + 1})`) : L('Listen & read', 'கேட்கவும் வாசிக்கவும்')}</button>`;
  const nextEp = series.episodes[pick.n];
  sec.innerHTML = `${subHeader(L('Daily Ithihasa', 'இதிகாசத் தொடர்'), L('A 15-minute Tamil story-telling each day, read aloud. A new episode opens every day.', 'ஒவ்வொரு நாளும் 15 நிமிட உரை — குரலில் வாசிப்புடன். தினமும் ஒரு புதிய பகுதி திறக்கும்.'), 'services')}
    ${seriesTabs(seriesId)}
    <div class="card glass ith-today">
      <div class="card-title"><span>${label}</span>${streak ? `<span class="pill ith-streak" title="${esc(L('Days in a row', 'தொடர் நாட்கள்'))}">🔥 ${L(`${streak}-day streak`, `${streak} நாள் தொடர்ச்சி`)}</span>` : ''}</div>
      <div class="ith-meta small muted">${L(`Episode ${ep.n} of ${total}`, `பகுதி ${ep.n} / ${total}`)} · ${esc(bi(ep.part))} · ${minsText(minutesOf(ep))}${access === 'preview' ? ` · <span class="badge unv">${L('2-min preview', '2 நிமிட முன்னோட்டம்')}</span>` : ''}</div>
      <h3 class="ith-title">${esc(bi(ep.title))}</h3>
      <p class="small">${esc(bi(ep.summary))}</p>
      ${pick.kind === 'waiting' && nextEp ? `<p class="small ith-next">⏳ ${L('The next episode opens tomorrow:', 'அடுத்த பகுதி நாளை திறக்கும்:')} <b>${esc(bi(nextEp.title))}</b></p>` : ''}
      ${cta}
      <div class="ith-progress" aria-label="${esc(L('Progress', 'முன்னேற்றம்'))}"><i style="width:${Math.round((100 * doneCount(prog)) / total)}%"></i></div>
      <p class="small muted">${L(`${doneCount(prog)} of ${total} episodes completed`, `${total}-இல் ${doneCount(prog)} பகுதிகள் நிறைவு`)}</p>
    </div>
    <div class="card glass ith-settings">
      <label class="set-row"><span>🔊 ${L('Start reading aloud automatically', 'தானாக வாசிக்கத் தொடங்கு')}</span><input type="checkbox" id="ithAuto"${prefs.autoRead ? ' checked' : ''}></label>
      <p class="small muted">${L('Phones and browsers allow sound only after a tap — so reading starts when you tap “Listen”.', 'கைப்பேசி / உலாவி ஒரு தொடுதலுக்குப் பிறகே ஒலியை அனுமதிக்கும் — எனவே “கேட்கவும்” அழுத்தியதும் வாசிப்பு தொடங்கும்.')}</p>
      <label class="set-row"><span>🔔 ${L('Daily reminder', 'தினசரி நினைவூட்டல்')}</span><span class="ith-rem"><input type="time" id="ithRemTime" value="${esc(prefs.remind || '06:30')}" aria-label="${esc(L('Reminder time', 'நினைவூட்டல் நேரம்'))}"><input type="checkbox" id="ithRem"${prefs.remind ? ' checked' : ''}></span></label>
    </div>
    <details class="card glass disclose"${doneCount(prog) ? '' : ' open'}><summary class="card-title">📜 ${L('About this series', 'இந்தத் தொடர் பற்றி')}</summary>
      <p class="small">${esc(bi(series.intro))}</p><p class="small muted">${L('Source', 'மூலம்')}: ${esc(bi(series.source))}</p></details>
    <h3 class="section-title">${L('All episodes', 'எல்லாப் பகுதிகளும்')}</h3>
    <div class="menu list ith-list">${series.episodes.map((e) => epRow(e, prog, up, full)).join('')}</div>
    ${full ? '' : `<p class="small muted center">${L('Free: the introduction and episode 1, plus a 2-minute preview of every episode. Personal and Family plans open them all.', 'இலவசம்: அறிமுகம், முதல் பகுதி, ஒவ்வொரு பகுதியின் 2 நிமிட முன்னோட்டம். தனிநபர் / குடும்பத் திட்டங்களில் அனைத்தும் திறக்கும்.')}</p>`}
    <p class="small muted">${L('Told with devotion from the traditional texts; a Tamil scholar’s review of the wording is in progress.', 'பாரம்பரிய நூல்களின்படி பக்தியுடன் சொல்லப்பட்டது; தமிழறிஞர் மதிப்பாய்வு நடைபெறுகிறது.')}</p>
    ${copyright()}`;
  wireTabs(sec);
  $$('[data-open]', sec).forEach((b) => b.addEventListener('click', () => go('ithihasa', { series: seriesId, ep: Number(b.dataset.open), auto: b.dataset.auto === '1' })));
  $('#ithAuto', sec).addEventListener('change', (e) => { const p = loadPrefs(); p.autoRead = e.target.checked; savePrefs(p); });
  const remChange = async () => {
    const p = loadPrefs();
    const on = $('#ithRem', sec).checked;
    const time = $('#ithRemTime', sec).value || '06:30';
    clearReminders();
    p.remind = on ? time : null; savePrefs(p);
    if (on) await topUpReminders(time);
    else toast(L('Daily reminder switched off', 'தினசரி நினைவூட்டல் நிறுத்தப்பட்டது'));
  };
  $('#ithRem', sec).addEventListener('change', remChange);
  $('#ithRemTime', sec).addEventListener('change', () => { if ($('#ithRem', sec).checked) remChange(); });
  // Rolling daily reminder: keep a week ahead scheduled (only adds days that are missing).
  if (prefs.remind && upcomingReminders(200).filter(isOurReminder).length < 3) topUpReminders(prefs.remind);
}

function epRow(e, prog, up, full) {
  const done = !!prog.done?.[e.n];
  const open = e.n <= up;
  const lockedTxt = L('Opens after the previous episode', 'முந்தைய பகுதிக்குப் பின் திறக்கும்');
  const state_ = done ? `<span class="tag good" aria-label="${esc(L('Done', 'நிறைவு'))}">✓</span>`
    : !open ? `<span class="badge unv" title="${esc(lockedTxt)}" aria-label="${esc(lockedTxt)}">⏳</span>`
      : episodeAccess(e.n, full) === 'preview' ? `<span class="badge unv" title="${esc(L('2-minute preview', '2 நிமிட முன்னோட்டம்'))}">🔒 2′</span>`
        : `<span class="tag warn">${L('Today', 'இன்று')}</span>`;
  return `<button class="row ith-row${open ? '' : ' locked'}" ${open ? `data-open="${e.n}"` : 'disabled aria-disabled="true"'}><span class="ith-n">${e.n}</span><span class="row-txt"><span class="row-name">${esc(bi(e.title))}</span><small>${esc(bi(e.part))} · ${minsText(minutesOf(e))}</small></span>${state_}</button>`;
}

function wireTabs(sec) {
  $$('[data-series]', sec).forEach((b) => b.addEventListener('click', () => { stopAudio(); const p = loadPrefs(); p.series = b.dataset.series; savePrefs(p); go('ithihasa', { series: b.dataset.series }); }));
}

function renderEpisode(sec, series, n, params) {
  const prefs = loadPrefs();
  const d = today();
  const total = series.episodes.length;
  let prog = progressOf(prefs, series.id) || newProgress(d);
  const up = unlockedUpTo(prog, total, d);
  const ep = series.episodes[n - 1];
  if (!ep || n > up) { toast(L('This episode opens after the previous one — one new episode a day.', 'முந்தைய பகுதிக்குப் பிறகே இது திறக்கும் — தினமும் ஒரு புதிய பகுதி.')); go('ithihasa', { series: series.id }, { back: true }); return; }
  const full = allowedFull();
  const max = readableParas(ep, full);
  const start = Math.min(resumeAt(prog, n, ep.ta.length), max - 1);
  const prev = previously(series, n, ta() ? 'ta' : 'en');
  const nextEp = series.episodes[n];
  const rate = RATES.includes(prefs.rate) ? prefs.rate : 1;
  sec.innerHTML = `${subHeader(`${esc(bi(series.title))} · ${L(`Episode ${n}`, `பகுதி ${n}`)}`, '', 'ithihasa')}
    <article class="ith-read" lang="ta">
      <div class="ith-meta small muted">${esc(bi(ep.part))} · ${L(`${n} of ${total}`, `${n} / ${total}`)} · ${minsText(minutesOf(ep))}</div>
      <h2 class="ith-title">${esc(ep.title.ta)}</h2>${ta() ? '' : `<p class="small muted" lang="en">${esc(ep.title.en)}</p>`}
      ${prev ? `<p class="ith-prev small"><b>${L('Previously', 'முன்பு')}:</b> ${esc(prev)}</p>` : ''}
      ${ta() ? '' : `<p class="small ith-en-sum" lang="en">${esc(ep.summary.en)}</p>`}
      <div class="ith-chars">${charChips(ep.characters)}</div>
      <p class="ith-voice-note small" id="ithVoiceNote" hidden></p>
      <div class="ith-text">${ep.ta.slice(0, max).map((p, i) => `<p class="ith-p${i === start && start ? ' cur' : ''}" data-i="${i}">${esc(p)}</p>`).join('')}</div>
      ${max < ep.ta.length ? `<div class="ith-fade" aria-hidden="true">${esc(ep.ta[max].slice(0, 160))}…</div>${lockCard(L('The 2-minute preview ends here. The full episode is part of the Personal and Family plans.', '2 நிமிட முன்னோட்டம் இங்கே முடிகிறது. முழுப் பகுதி தனிநபர் / குடும்பத் திட்டங்களில் உண்டு.'), 'ithihasa')}` : `
      <div class="card glass ith-end">
        <div class="mini-label">${L('Today’s thought', 'இன்றைய சிந்தனை')}</div><p><b>${esc(bi(ep.moral))}</b></p>
        ${nextEp ? `<p class="small">${esc(bi(ep.next))}</p>` : `<p class="small">${L('This completes the series. Thank you for listening 🙏', 'இத்துடன் தொடர் நிறைவுறுகிறது. கேட்டதற்கு நன்றி 🙏')}</p>`}
        ${prog.done?.[n] ? `<p class="small muted">✓ ${L('Completed', 'நிறைவு செய்தீர்கள்')}</p>` : `<button class="btn-gold" id="ithDone">✓ ${L('I have finished this episode', 'இந்தப் பகுதியை முடித்தேன்')}</button>`}
      </div>`}
    </article>
    <div class="ith-bar" role="region" aria-label="${esc(L('Reading controls', 'வாசிப்புக் கட்டுப்பாடு'))}">
      <button class="ith-btn" id="ithPrev" aria-label="${esc(L('Previous paragraph', 'முந்தைய பத்தி'))}">⏮</button>
      <button class="ith-btn ith-play" id="ithPlay" aria-label="${esc(L('Play', 'இயக்கு'))}">▶</button>
      <button class="ith-btn" id="ithNext" aria-label="${esc(L('Next paragraph', 'அடுத்த பத்தி'))}">⏭</button>
      <span class="ith-pos small" id="ithPos" aria-live="polite"></span>
      <label class="ith-rate small"><span class="sr-only">${L('Speed', 'வேகம்')}</span><select id="ithRate" aria-label="${esc(L('Speed', 'வேகம்'))}">${RATES.map((r) => `<option value="${r}"${r === rate ? ' selected' : ''}>${r}×</option>`).join('')}</select></label>
    </div>
    ${copyright()}`;

  // Episode and series home are the same screen id, so the shared back stack has no entry for the home: go there directly.
  const back = $('.back-btn', sec);
  back?.removeAttribute('data-back');
  back?.addEventListener('click', () => { stopAudio(); go('ithihasa', { series: series.id }, { back: true }); scrollTo({ top: 0 }); });
  const paras = $$('.ith-p', sec);
  const playBtn = $('#ithPlay', sec);
  const note = $('#ithVoiceNote', sec);
  const pos = $('#ithPos', sec);
  stopAudio();
  Object.assign(player, { ep, max, rate, i: start, seriesId: series.id });
  const highlight = (i) => {
    paras.forEach((p, k) => p.classList.toggle('cur', k === i));
    pos.textContent = L(`¶ ${i + 1} / ${max}`, `பத்தி ${i + 1} / ${max}`);
    const cur = paras[i];
    if (cur && i > 0 && loadPrefs().autoScroll !== false) cur.scrollIntoView?.({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    prog = savePosition(prog, n, i, today());
    setProgress(series.id, prog);
  };
  player.onPara = highlight;
  player.onState = () => {
    if (!playBtn.isConnected) return;
    playBtn.textContent = player.playing ? '⏸' : '▶';
    playBtn.setAttribute('aria-label', player.playing ? L('Pause', 'நிறுத்து') : L('Play', 'இயக்கு'));
    playBtn.classList.toggle('on', player.playing);
  };
  const finish = () => {
    if (prog.done?.[n]) return;
    prog = markDone(prog, n, today());
    setProgress(series.id, prog);
    const s = currentStreak(prog, today());
    toast(L(`Episode ${n} complete 🙏${s > 1 ? ` · ${s}-day streak` : ''}`, `பகுதி ${n} நிறைவு 🙏${s > 1 ? ` · ${s} நாள் தொடர்ச்சி` : ''}`), 4000);
    renderEpisode(sec, series, n, {});
  };
  player.onEnd = () => { if (max === ep.ta.length) finish(); else toast(L('Preview finished', 'முன்னோட்டம் நிறைவு')); };
  pos.textContent = L(`¶ ${start + 1} / ${max}`, `பத்தி ${start + 1} / ${max}`);

  detectVoice().then((v) => {
    if (!note.isConnected) return;
    if (v.engine === 'none') {
      note.hidden = false;
      note.innerHTML = `🔈 ${'speechSynthesis' in window || nativeTts() ? 'உங்கள் கருவியில் தமிழ்க் குரல் இல்லை — Google Text-to-Speech-ல் தமிழ் சேர்க்கவும்.' : 'இந்தக் கருவியில் குரல் வாசிப்பு வசதி இல்லை.'}${ta() ? '' : ' <span lang="en">(No Tamil voice on this device — add Tamil in Google Text-to-Speech: Settings → Google Text-to-speech → Install voice data → Tamil.)</span>'} ${L('Play still moves through the text at reading pace.', '▶ அழுத்தினால் வாசிக்கும் வேகத்தில் பத்தி பத்தியாக நகரும்.')}`;
    }
  });

  playBtn.addEventListener('click', () => { if (player.playing) stopAudio(); else { note.dataset.tapped = '1'; playFrom(player.i); } });
  $('#ithPrev', sec).addEventListener('click', () => { const i = Math.max(0, player.i - 1); if (player.playing) playFrom(i); else { player.i = i; highlight(i); } });
  $('#ithNext', sec).addEventListener('click', () => { const i = Math.min(max - 1, player.i + 1); if (player.playing) playFrom(i); else { player.i = i; highlight(i); } });
  $('#ithRate', sec).addEventListener('change', (e) => { const r = Number(e.target.value); const p = loadPrefs(); p.rate = r; savePrefs(p); player.rate = r; if (player.playing) playFrom(player.i); });
  paras.forEach((p) => p.addEventListener('dblclick', () => playFrom(Number(p.dataset.i))));
  $('#ithDone', sec)?.addEventListener('click', () => { stopAudio(); finish(); });
  // Remember the first open of the series.
  if (!progressOf(loadPrefs(), series.id)) setProgress(series.id, prog);
  if (start) requestAnimationFrame(() => paras[start]?.scrollIntoView?.({ block: 'center' }));

  // Auto-read: start now when the person tapped to get here; otherwise on the first tap anywhere on the page.
  if (params.auto && prefs.autoRead && !prog.done?.[n]) {
    params.auto = false; // once per open (a language switch re-renders without restarting)
    if (userHasTapped()) playFrom(start);
    else {
      toast(L('Tap anywhere to start reading aloud', 'வாசிப்பைத் தொடங்க எங்காவது தொடவும்'), 4000);
      const once = (e) => { if (state.view === 'ithihasa' && !player.playing && !e.target.closest?.('#ithPlay')) playFrom(player.i); };
      document.addEventListener('pointerdown', once, { once: true, capture: true });
    }
  }
}

registerScreen('ithihasa', { render, parent: 'services' });
