// Baby names (குழந்தை பெயர்கள்): an offline name-suggestion engine. Names come from the curated list in
// shared/baby-names-data-*.js, are matched to the birth-star pada letter (namakshara) and ranked by Chaldean
// numerology against the child's birth and destiny numbers. Works fully on the device.
import { birthChart, NAKSHATRAS } from './shared/astro.js';
import { NUMBER_PLANET } from './shared/personal.js';
import {
  state, store, $, $$, L, ta, esc, bi, chartOf, registerScreen, subHeader, speak, starOptions, displayName, planetName,
} from './core.js';
import { placeSearch } from './account.js';
import { gate } from './growth.js';
import { sharePreview } from './screens-hubs.js';

const FAV_KEY = 'kj_name_favs';
const PAGE = 20;
let engine = null;
const loadEngine = () => (engine ? Promise.resolve(engine) : import('./shared/baby-names.js').then((m) => { engine = m; return m; }));

/** Form state (kept while the app is open). */
const nf = {
  mode: null, memberId: '', date: '', time: '', place: '', lat: null, lon: null, tz: null, zone: '',
  star: 0, pada: 1, gender: 'any', style: 'all', deity: '', initial: '', query: '', shown: PAGE, favOnly: false,
};

const favs = () => new Set(store.get(FAV_KEY, []));

/** A result is a favourite when its spelling, or one of its other spellings, was starred. */
const isFavIn = (r, set) => set.has(r.id) || (r.spellings || []).some((v) => set.has(v.id));

const pool = () => state.family.filter((m) => m.relation !== 'organization');
function defaultMember() {
  const p = pool();
  return (p.find((m) => m.relation === 'son' || m.relation === 'daughter') || p[p.length - 1] || p[0])?.id || '';
}

function injectCss() {
  if (document.getElementById('names-css')) return;
  const s = document.createElement('style');
  s.id = 'names-css';
  s.textContent = `
  .nm-chips { display: flex; flex-wrap: wrap; gap: 8px; margin: 6px 0 10px; }
  .nm-chips .mchip { min-height: 40px; line-height: 1.4; }
  .nm-lucky { display: flex; gap: 14px; align-items: center; }
  .nm-lucky .letter-big { flex: 0 0 auto; width: 76px; height: 76px; font-size: 36px; line-height: 1.35; }
  .nm-lucky-body { min-width: 0; line-height: 1.55; }
  .nm-nums { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-top: 12px; }
  .nm-num { text-align: center; padding: 8px 4px; border-radius: 12px; background: rgba(var(--gold-rgb), .1); border: 1px solid var(--glass-b); line-height: 1.4; min-width: 0; }
  .nm-num b { display: block; font-size: 22px; color: var(--gold2); line-height: 1.35; }
  .nm-num b.nm-many { font-size: 17px; }
  .nm-num span { font-size: 12px; color: var(--muted); overflow-wrap: anywhere; }
  .nm-list { display: grid; gap: 10px; }
  .nm-card { padding: 14px; margin: 0; line-height: 1.5; }
  .nm-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-top: 2px; }
  .nm-ta { font-size: 24px; font-weight: 800; color: var(--gold2); line-height: 1.4; min-width: 0; }
  .nm-ta.nm-l { font-size: 21px; }
  .nm-ta.nm-xl { font-size: 18px; }
  .nm-en { font-size: 14px; color: var(--muted); line-height: 1.45; min-width: 0; padding-top: 4px; }
  .nm-mean { margin: 6px 0 4px; line-height: 1.55; }
  .nm-acts { display: flex; gap: 6px; flex: 0 0 auto; }
  .nm-ic { min-width: 44px; min-height: 44px; border-radius: 12px; border: 1px solid var(--glass-b); background: rgba(var(--gold-rgb), .1); color: var(--gold2); font-size: 18px; line-height: 1; cursor: pointer; }
  .nm-ic[aria-pressed="true"] { background: rgba(var(--gold-rgb), .28); border-color: var(--gold); }
  .nm-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; align-items: center; }
  .nm-tags .tag { margin-top: 0; }
  .nm-tags .pill { font-size: 12px; padding: 2px 9px; }
  .nm-why { margin-top: 6px; line-height: 1.5; }
  .nm-note { line-height: 1.55; }
  .nm-bar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; justify-content: space-between; margin: 4px 0 10px; }
  .nm-search { position: relative; }
  #nmPlaceList { position: relative; }
  `;
  document.head.append(s);
}

/** Star, pada and date for the selected input mode; `err` explains what is missing. */
function birthInfo() {
  if (nf.mode === 'family') {
    const m = pool().find((x) => x.id === nf.memberId);
    if (!m) return { err: L('Pick a family member.', 'குடும்ப உறுப்பினரைத் தேர்ந்தெடுக்கவும்.') };
    const c = chartOf(m);
    return { star: c.janmaNakshatra.index, pada: c.janmaNakshatra.pada, date: m.date || '', who: displayName(m), gender: m.gender === 'female' ? 'girl' : m.gender === 'male' ? 'boy' : null };
  }
  if (nf.mode === 'birth') {
    if (!nf.date) return { err: L('Enter the birth date.', 'பிறந்த தேதியை உள்ளிடவும்.') };
    const loc = nf.lat != null ? { lat: nf.lat, lon: nf.lon, tz: nf.tz, zone: nf.zone || undefined, place: nf.place } : state.loc ? { lat: state.loc.lat, lon: state.loc.lon, tz: state.loc.tz, zone: state.loc.zone, place: state.loc.name } : null;
    if (!nf.time || !loc) return { date: nf.date, star: null, err: L('Add the birth time and place to find the birth star; numerology already uses the date.', 'நட்சத்திரம் அறிய பிறந்த நேரமும் இடமும் சேர்க்கவும்; எண்கணிதம் தேதியை வைத்தே கணிக்கப்படுகிறது.') };
    try {
      const c = birthChart({ name: 'baby', date: nf.date, time: nf.time.length === 5 ? `${nf.time}:00` : nf.time, ...loc });
      return { star: c.janmaNakshatra.index, pada: c.janmaNakshatra.pada, date: nf.date };
    } catch {
      return { date: nf.date, star: null, err: L('Could not read the birth details — please check them.', 'பிறப்பு விவரங்களைப் படிக்க முடியவில்லை — சரிபார்க்கவும்.') };
    }
  }
  return { star: nf.star, pada: nf.pada, date: nf.date || '' };
}

const LEVEL = {
  excellent: { cls: 'tag good', en: 'Excellent', ta: 'மிகச் சிறப்பு', icon: '🌟' },
  good: { cls: 'tag good', en: 'Good', ta: 'நன்று', icon: '✓' },
  neutral: { cls: 'tag warn', en: 'Neutral', ta: 'சமநிலை', icon: '•' },
};
const styleName = (s) => bi(engine.STYLES[s]);

function nameCard(r, favSet, hasDate) {
  const n = r.name;
  const lv = LEVEL[r.num.level] || LEVEL.neutral;
  const sound = r.sound ? `${r.sound.ta}${ta() ? '' : ` (${r.sound.en})`}` : '';
  const matchTag = r.match === 'pada' ? `<span class="pill" title="${L('Starts with the pada letter', 'பாத எழுத்தில் தொடங்குகிறது')}">✓ ${esc(sound)} · ${L('pada', 'பாதம்')} ${r.sound.pada}</span>`
    : r.match === 'alt' ? `<span class="pill">${esc(sound)} · ${L('accepted substitute', 'ஏற்கும் மாற்று')}</span>`
    : r.match === 'star' ? `<span class="pill">${esc(sound)} · ${L('same star, pada', 'அதே நட்சத்திரம், பாதம்')} ${r.sound.pada}</span>` : '';
  const gender = { boy: L('Boy', 'ஆண்'), girl: L('Girl', 'பெண்'), unisex: L('Boy / Girl', 'ஆண் / பெண்') }[n.gender];
  const tags = n.tags.map((t) => (t === 'god' && n.deity ? `<span class="pill">🙏 ${esc(bi(engine.DEITIES[n.deity]))}</span>` : `<span class="pill">${esc(styleName(t))}</span>`)).join('');
  const isFav = isFavIn(r, favSet);
  const len = [...n.ta].length;
  return `<article class="card glass nm-card" data-id="${esc(r.id)}" data-en="${esc(n.en)}" data-alt="${esc((r.spellings || []).map((v) => v.id).join(','))}">
    <div class="nm-ta${len > 15 ? ' nm-xl' : len > 11 ? ' nm-l' : ''}" lang="ta">${esc(n.ta)}</div>
    <div class="nm-top"><div class="nm-en">${esc(n.en)} · ${gender}${r.spellings?.length ? `<br><span class="small">${L('Also spelt', 'வேறு எழுத்துக்கூட்டல்')}: ${r.spellings.map((v) => `${esc(v.en)}${hasDate ? ` (${L('No.', 'எண்')} ${v.single})` : ''}`).join(', ')}</span>` : ''}</div>
      <div class="nm-acts"><button type="button" class="nm-ic" data-say aria-label="${L('Read the name aloud', 'பெயரை வாசித்துக் காட்டு')}">🔊</button><button type="button" class="nm-ic" data-fav aria-pressed="${isFav}" aria-label="${L('Favourite', 'பிடித்தது')}">${isFav ? '⭐' : '☆'}</button></div></div>
    <div class="nm-mean">${esc(ta() ? n.meaning.ta : n.meaning.en)}</div>
    <div class="nm-tags">${hasDate ? `<span class="${lv.cls}">${lv.icon} ${L(lv.en, lv.ta)} · ${L('No.', 'எண்')} ${r.num.single}</span>` : `<span class="pill">${L('Name no.', 'பெயர் எண்')} ${r.num.single}</span>`}${matchTag}${tags}</div>
    ${hasDate ? `<div class="small muted nm-why">${esc(bi(r.num.reason))} ${L('Compound', 'கூட்டு எண்')} ${r.num.compound}: ${esc(bi(r.num.compoundMeaning))}</div>` : ''}
  </article>`;
}

function luckyCard(info) {
  if (info.star == null && !info.date) return '';
  const ls = engine.luckSummary(info.date, info.star ?? undefined, info.pada);
  const nl = info.star != null ? ls.starLetters : [];
  const pl = (n) => planetName(NUMBER_PLANET[n]);
  return `<section class="card glass" aria-labelledby="nmLuckT">
    <div class="card-title"><span id="nmLuckT">🍀 ${L('Lucky letters & numbers', 'அதிர்ஷ்ட எழுத்துகள் & எண்கள்')}${info.who ? ` · ${esc(info.who)}` : ''}</span></div>
    ${info.star != null ? `<div class="nm-lucky"><div class="letter-big" lang="ta">${esc(ls.primary.ta)}</div><div class="nm-lucky-body">
      <div class="mini-label">${esc(ta() ? NAKSHATRAS[info.star].ta : NAKSHATRAS[info.star].en)} · ${L('pada', 'பாதம்')} ${info.pada}</div>
      <div><b>${L('Best first letter', 'சிறந்த முதல் எழுத்து')}: ${esc(ls.primary.ta)}${ta() ? '' : ` (${esc(ls.primary.en)})`}</b></div>
      <div class="small muted">${L('Star letters', 'நட்சத்திர எழுத்துகள்')}: ${nl.map((a) => (ta() ? a.ta : `${a.ta} (${a.en})`)).join(' · ')}</div></div></div>` : ''}
    ${info.date ? `<div class="nm-nums">
      <div class="nm-num"><b>${ls.birth}</b><span>${L('Birth no.', 'பிறந்த எண்')} · ${esc(pl(ls.birth))}</span></div>
      <div class="nm-num"><b>${ls.destiny}</b><span>${L('Destiny no.', 'விதி எண்')} · ${esc(pl(ls.destiny))}</span></div>
      <div class="nm-num"><b class="${ls.lucky.length > 3 ? 'nm-many' : ''}">${ls.lucky.join(', ')}</b><span>${L('Lucky numbers', 'அதிர்ஷ்ட எண்கள்')}</span></div></div>
      <p class="small nm-note">${L('Numerology letters for the birth & destiny numbers', 'பிறந்த / விதி எண்ணுக்கான ஆங்கில எழுத்துகள்')}: <b>${ls.letters.join(' ')}</b></p>`
    : `<p class="small muted nm-note">${L('Add the birth date to rank names by numerology (birth number, destiny number, compound number).', 'எண்கணிதப்படி வரிசைப்படுத்த பிறந்த தேதியைச் சேர்க்கவும் (பிறந்த எண், விதி எண், கூட்டு எண்).')}</p>`}
  </section>`;
}

function formCard(info) {
  const p = pool();
  const modes = [['family', 'From family', 'குடும்பத்திலிருந்து'], ['birth', 'Birth details', 'பிறப்பு விவரம்'], ['star', 'Star & pada', 'நட்சத்திரம்']].filter(([id]) => id !== 'family' || p.length);
  return `<section class="card glass" aria-labelledby="nmBirthT">
    <div class="card-title"><span id="nmBirthT">👶 ${L("Child's birth", 'குழந்தையின் பிறப்பு')}</span></div>
    <div class="seg" id="nmMode" role="group">${modes.map(([id, en, tx]) => `<button type="button" data-mode="${id}" class="${nf.mode === id ? 'sel' : ''}" aria-pressed="${nf.mode === id}">${L(en, tx)}</button>`).join('')}</div>
    ${nf.mode === 'family' ? `<label>${L('Family member', 'குடும்ப உறுப்பினர்')}<select id="nmMember">${p.map((m) => `<option value="${esc(m.id)}"${m.id === nf.memberId ? ' selected' : ''}>${esc(displayName(m))}</option>`).join('')}</select></label>` : ''}
    ${nf.mode === 'birth' ? `<div class="row2"><label>${L('Birth date', 'பிறந்த தேதி')}<input type="date" id="nmDate" value="${esc(nf.date)}"></label><label>${L('Time', 'நேரம்')}<input type="time" id="nmTime" value="${esc(nf.time)}"></label></div>
      <label>${L('Place of birth', 'பிறந்த இடம்')}<input id="nmPlace" autocomplete="off" value="${esc(nf.place)}" placeholder="${esc(state.loc?.name ? `${L('Current', 'தற்போதைய')}: ${state.loc.name}` : L('Type a town', 'ஊரின் பெயர்'))}"></label><ul class="suggest" id="nmPlaceList" hidden></ul>` : ''}
    ${nf.mode === 'star' ? `<div class="row2"><label>${L('Birth star', 'நட்சத்திரம்')}<select id="nmStar">${starOptions(nf.star)}</select></label><label>${L('Pada', 'பாதம்')}<select id="nmPada">${[1, 2, 3, 4].map((x) => `<option value="${x}"${x === nf.pada ? ' selected' : ''}>${L('Pada', 'பாதம்')} ${x}</option>`).join('')}</select></label></div>
      <label>${L('Birth date (for numerology, optional)', 'பிறந்த தேதி (எண்கணிதத்திற்கு, விருப்பம்)')}<input type="date" id="nmDate" value="${esc(nf.date)}"></label>` : ''}
    ${info.err ? `<p class="small muted nm-note" role="status">ℹ️ ${esc(info.err)}</p>` : ''}
  </section>`;
}

function filterCard() {
  const styles = [['all', 'All', 'அனைத்தும்'], ['god', 'Deity names', 'கடவுள் பெயர்'], ['classic', 'Traditional', 'பாரம்பரிய'], ['modern', 'Modern', 'நவீன'], ['pure-tamil', 'Pure Tamil', 'தனித்தமிழ்']];
  return `<section class="card glass" aria-labelledby="nmFiltT">
    <div class="card-title"><span id="nmFiltT">🎯 ${L('What kind of name?', 'எந்த வகைப் பெயர்?')}</span></div>
    <div class="seg" id="nmGender" role="group">${[['any', 'Any', 'எதுவும்'], ['boy', 'Boy', 'ஆண்'], ['girl', 'Girl', 'பெண்']].map(([id, en, tx]) => `<button type="button" data-g="${id}" class="${nf.gender === id ? 'sel' : ''}" aria-pressed="${nf.gender === id}">${L(en, tx)}</button>`).join('')}</div>
    <div class="nm-chips" id="nmStyle" role="group" aria-label="${L('Style', 'வகை')}">${styles.map(([id, en, tx]) => `<button type="button" class="mchip${nf.style === id ? ' sel' : ''}" data-s="${id}" aria-pressed="${nf.style === id}">${L(en, tx)}</button>`).join('')}</div>
    ${nf.style === 'god' ? `<div class="nm-chips" id="nmDeity" role="group" aria-label="${L('Deity', 'தெய்வம்')}"><button type="button" class="mchip${!nf.deity ? ' sel' : ''}" data-d="">${L('All deities', 'எல்லா தெய்வங்களும்')}</button>${Object.entries(engine.DEITIES).map(([id, d]) => `<button type="button" class="mchip${nf.deity === id ? ' sel' : ''}" data-d="${id}">${esc(bi(d))}</button>`).join('')}</div>` : ''}
    <label>${L('Search a name or meaning', 'பெயர் / பொருள் தேடல்')}<input id="nmQuery" type="search" autocomplete="off" value="${esc(nf.query)}" placeholder="${L('e.g. lotus, Murugan', 'எ.கா. தாமரை, முருகன்')}"></label>
    <label>${L("Father's / mother's initial (optional)", 'தந்தை / தாய் இனிஷியல் (விருப்பம்)')}<input id="nmInitial" maxlength="6" autocomplete="off" autocapitalize="characters" value="${esc(nf.initial)}" placeholder="${L('e.g. R', 'எ.கா. R')}"></label>
    <p class="small muted nm-note">${L('With an initial, the numerology adds it to the name (as written: “R. Name”).', 'இனிஷியல் கொடுத்தால், அதையும் சேர்த்து எண் கணிக்கப்படும் (“R. பெயர்” என எழுதுவது போல).')}</p>
  </section>`;
}

function resultsHtml(info) {
  const favSet = favs();
  const hasStar = info.star != null;
  const r = engine.suggestNames({ star: hasStar ? info.star : null, pada: info.pada || 1, date: info.date, gender: nf.gender, style: nf.style, deity: nf.deity, initial: nf.initial.replace(/[^A-Za-z]/g, ''), query: nf.query });
  let list = r.results;
  if (nf.favOnly) list = list.filter((x) => isFavIn(x, favSet));
  const shown = list.slice(0, nf.shown);
  const count = L(`${list.length} names`, `${list.length} பெயர்கள்`) + (hasStar && !nf.favOnly ? L(` · ${r.counts.pada} start with ${r.pada.ta}`, ` · ${r.counts.pada} பெயர்கள் ${r.pada.ta}-வில் தொடங்குகின்றன`) : '');
  return `<div class="nm-bar"><span class="small muted" role="status">${esc(count)}</span>
      <span class="btn-row"><button type="button" class="mchip${nf.favOnly ? ' sel' : ''}" id="nmFavOnly" aria-pressed="${nf.favOnly}">⭐ ${L('Favourites', 'பிடித்தவை')} (${favSet.size})</button>
      <button type="button" class="mchip" id="nmShare">📤 ${L('Share list', 'பட்டியலைப் பகிர்')}</button></span></div>
    ${r.note && !nf.favOnly ? `<div class="card glass nm-note small" role="note">ℹ️ ${esc(bi(r.note))}</div>` : ''}
    ${!info.date ? '' : `<p class="small muted nm-note">${L('Names whose number does not suit the birth number are left out.', 'பிறந்த எண்ணுக்குப் பொருந்தாத எண் கொண்ட பெயர்கள் காட்டப்படவில்லை.')}</p>`}
    <div class="nm-list">${shown.map((x) => nameCard(x, favSet, Boolean(info.date))).join('') || `<div class="card glass"><p class="muted">${nf.favOnly ? L('No favourites yet — tap ☆ on a name to save it on this phone.', 'இன்னும் பிடித்தவை இல்லை — பெயரில் ☆ தொட்டு இந்தக் கைப்பேசியில் சேமிக்கலாம்.') : L('No names match. Try another style or clear the search.', 'பொருந்தும் பெயர்கள் இல்லை. வேறு வகை அல்லது தேடலை அழித்துப் பாருங்கள்.')}</p></div>`}</div>
    ${list.length > shown.length ? `<button type="button" class="btn-soft" id="nmMore" style="width:100%;margin-top:12px">${L(`Show more (${list.length - shown.length} left)`, `மேலும் காட்டு (இன்னும் ${list.length - shown.length})`)}</button>` : ''}`;
}

function shareList(info) {
  const favSet = favs();
  const r = engine.suggestNames({ star: info.star ?? null, pada: info.pada || 1, date: info.date, gender: nf.gender, style: nf.style, deity: nf.deity, initial: nf.initial.replace(/[^A-Za-z]/g, ''), query: nf.query });
  const fav = r.results.filter((x) => isFavIn(x, favSet));
  const list = (fav.length ? fav : r.results).slice(0, 15);
  if (!list.length) return;
  const head = info.star != null ? `${L('Baby names', 'குழந்தை பெயர்கள்')} — ${ta() ? NAKSHATRAS[info.star].ta : NAKSHATRAS[info.star].en} ${L('pada', 'பாதம்')} ${info.pada}` : L('Baby names', 'குழந்தை பெயர்கள்');
  sharePreview(L('Baby names', 'குழந்தை பெயர்கள்'), `${head}\n${engine.shareText(list, ta() ? 'ta' : 'en')}\n— ${L('Thunai', 'துணை')}`);
}

function drawResults(sec, info) {
  const box = $('#nmResults', sec);
  box.innerHTML = resultsHtml(info);
  $('#nmMore', box)?.addEventListener('click', () => { nf.shown += PAGE; drawResults(sec, info); });
  $('#nmFavOnly', box).addEventListener('click', () => { nf.favOnly = !nf.favOnly; nf.shown = PAGE; drawResults(sec, info); });
  $('#nmShare', box).addEventListener('click', () => shareList(info));
  $$('.nm-card', box).forEach((card) => {
    const id = card.dataset.id;
    $('[data-fav]', card).addEventListener('click', (e) => {
      const group = [id, ...(card.dataset.alt ? card.dataset.alt.split(',') : [])];
      const f = favs();
      const on = !group.some((x) => f.has(x));
      if (on && !gate('shortlist', { count: f.size, near: card })) return; // BILLING_ENFORCE: free shortlist holds 10 (public/growth.js)
      group.forEach((x) => f.delete(x));
      if (on) f.add(id);
      store.set(FAV_KEY, [...f]);
      if (on) document.dispatchEvent(new CustomEvent('kj:task', { detail: 'names' })); // metrics: a name shortlisted (consent-gated, public/growth.js)
      e.currentTarget.textContent = on ? '⭐' : '☆';
      e.currentTarget.setAttribute('aria-pressed', String(on));
      const fb = $('#nmFavOnly', box);
      if (fb) fb.textContent = `⭐ ${L('Favourites', 'பிடித்தவை')} (${favs().size})`;
    });
    $('[data-say]', card).addEventListener('click', () => speak(ta() ? $('.nm-ta', card).textContent : card.dataset.en));
  });
}

async function renderNames(sec) {
  injectCss();
  if (!nf.mode) { nf.mode = pool().length ? 'family' : 'star'; nf.memberId = defaultMember(); }
  if (!engine) {
    sec.innerHTML = `${subHeader(L('Baby Names', 'குழந்தை பெயர்கள்'), L('Names by birth star and numerology', 'நட்சத்திரமும் எண்கணிதமும் பார்த்துப் பெயர்கள்'))}<div class="loader"><i></i><i></i><i></i></div>`;
    await loadEngine();
    if (state.view !== 'names') return;
  }
  const info = birthInfo();
  if (nf.mode === 'family' && info.gender && nf.genderFor !== nf.memberId) { nf.gender = info.gender; nf.genderFor = nf.memberId; }
  sec.innerHTML = `${subHeader(L('Baby Names', 'குழந்தை பெயர்கள்'), L('Names by birth star and numerology', 'நட்சத்திரமும் எண்கணிதமும் பார்த்துப் பெயர்கள்'))}
    <div class="nm-cols"><div class="nm-side">${formCard(info)}${luckyCard(info)}${filterCard()}</div><div id="nmResults"></div></div>
    <p class="small muted nm-note">${L('Meanings are short, commonly accepted ones. Numerology follows the Chaldean (Cheiro) system used across the app.', 'பொருள்கள் சுருக்கமான, பொதுவாக ஏற்கப்பட்டவை. எண்கணிதம் செயலி முழுவதும் பயன்படும் கல்டியன் (கீரோ) முறைப்படி.')}</p>`;
  drawResults(sec, info);
  const rerender = () => { nf.shown = PAGE; renderNames(sec); };
  $$('#nmMode button', sec).forEach((b) => b.addEventListener('click', () => { nf.mode = b.dataset.mode; if (nf.mode === 'family' && !nf.memberId) nf.memberId = defaultMember(); rerender(); }));
  $('#nmMember', sec)?.addEventListener('change', (e) => { nf.memberId = e.target.value; rerender(); });
  $('#nmStar', sec)?.addEventListener('change', (e) => { nf.star = Number(e.target.value); rerender(); });
  $('#nmPada', sec)?.addEventListener('change', (e) => { nf.pada = Number(e.target.value); rerender(); });
  $('#nmDate', sec)?.addEventListener('change', (e) => { nf.date = e.target.value; rerender(); });
  $('#nmTime', sec)?.addEventListener('change', (e) => { nf.time = e.target.value; rerender(); });
  const place = $('#nmPlace', sec);
  if (place) placeSearch(place, $('#nmPlaceList', sec), (p) => { Object.assign(nf, { place: p.text || p.name, lat: p.lat, lon: p.lon, tz: p.tz, zone: p.zone || '' }); rerender(); });
  $$('#nmGender button', sec).forEach((b) => b.addEventListener('click', () => { nf.gender = b.dataset.g; rerender(); }));
  $$('#nmStyle button', sec).forEach((b) => b.addEventListener('click', () => { nf.style = b.dataset.s; if (nf.style !== 'god') nf.deity = ''; rerender(); }));
  $$('#nmDeity button', sec).forEach((b) => b.addEventListener('click', () => { nf.deity = b.dataset.d; rerender(); }));
  let t;
  const live = (key) => (e) => { nf[key] = e.target.value; nf.shown = PAGE; clearTimeout(t); t = setTimeout(() => drawResults(sec, birthInfo()), 220); };
  $('#nmInitial', sec).addEventListener('input', live('initial'));
  $('#nmQuery', sec).addEventListener('input', live('query'));
}
registerScreen('names', { render: renderNames, parent: 'home' });
