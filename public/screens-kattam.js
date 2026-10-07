// Add a person from the written jathagam (எழுதிய ஜாதகம்): photo for reference, the 12-box South Indian Rasi
// Kattam, birth star + pada, Lagnam and the written dasa balance. No birth time needed. The photo stays on this
// phone (it is only shown while you fill the boxes; it is not uploaded or read automatically).
import { NAKSHATRAS, RASIS, PLANETS } from './shared/astro.js';
import { KATTAM_PLANETS, kattamWarnings } from './shared/kattam.js';
import { state, $, $$, L, esc, bi, registerScreen, subHeader, toast, saveFamily, go, RELATIONS, nakName, fmtIsoDate, rasiName } from './core.js';
import { placeSearch } from './account.js';
import { searchLocalPlaces, placeLabel } from './shared/places.js';
import { TAMIL_YEARS } from './shared/tamilcal.js';
import { parseWrittenDate, tamilYearCheck } from './shared/written-date.js';

// South Indian layout: fixed sign positions in a 4 × 4 grid (centre 2 × 2 is the title).
const GRID = [[11, 0, 1, 2], [10, null, null, 3], [9, null, null, 4], [8, 7, 6, 5]];
const SHORT = { Sun: ['Su', 'சூ'], Moon: ['Mo', 'சந்'], Mars: ['Ma', 'செவ்'], Mercury: ['Me', 'பு'], Jupiter: ['Ju', 'கு'], Venus: ['Ve', 'சுக்'], Saturn: ['Sa', 'சனி'], Rahu: ['Ra', 'ரா'], Ketu: ['Ke', 'கே'] };

let draft = null;
let photoUrl = null;

function blank() {
  return { id: null, name: '', gender: 'male', relation: 'self', date: '', place: state.loc?.name || '', lat: state.loc?.lat ?? null, lon: state.loc?.lon ?? null, tz: state.loc?.tz ?? 5.5,
    writtenDate: '', tamilYear: null, dateChoice: null, placeChoice: null, confirming: false,
    kattam: { star: null, pada: 1, lagna: null, planets: {}, balance: null } };
}

function boxHtml(r) {
  const k = draft.kattam;
  const here = KATTAM_PLANETS.filter((p) => k.planets[p] === r);
  return `<button type="button" class="kt-box${k.lagna === r ? ' lagna' : ''}" data-box="${r}" aria-label="${esc(bi(RASIS[r]))}">
    <span class="kt-pl">${k.lagna === r ? `<b class="kt-l">${L('Lg', 'ல')}</b>` : ''}${here.map((p) => `<b>${L(...SHORT[p])}</b>`).join(' ')}</span>
    <span class="kt-name">${esc(bi(RASIS[r]))}</span></button>`;
}

function gridHtml() {
  return `<div class="kt-grid">${GRID.map((row, ri) => row.map((r, ci) => (r == null
    ? (ri === 1 && ci === 1 ? `<div class="kt-centre">${L('Rasi', 'ராசி')}<small>${L('tap a box', 'கட்டத்தைத் தொடுங்கள்')}</small></div>` : '')
    : boxHtml(r))).join('')).join('')}</div>`;
}

// Confirmation list: label above value so long Tamil flags get the full width on a phone.
if (!document.getElementById('kt-kv-css')) { const st = document.createElement('style'); st.id = 'kt-kv-css'; st.textContent = '.kt-kv dt{font-weight:600;margin-top:10px}.kt-kv dd{margin:2px 0 0}.kt-choices{display:flex;flex-direction:column;gap:6px;margin-top:6px}'; document.head.append(st); }
const WEEKDAY = [['Sunday', 'ஞாயிறு'], ['Monday', 'திங்கள்'], ['Tuesday', 'செவ்வாய்'], ['Wednesday', 'புதன்'], ['Thursday', 'வியாழன்'], ['Friday', 'வெள்ளி'], ['Saturday', 'சனி']];
const weekdayOf = (iso) => L(...WEEKDAY[new Date(`${iso}T12:00:00Z`).getUTCDay()]);
const fold = (x) => String(x || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

/**
 * What still needs the family's confirmation before the chart is calculated:
 * { date: { candidates, flags } , place: { status: 'picked' | 'matched' | 'choose' | 'not-found' | 'none', options }, tamil }.
 */
function reviewOf() {
  const wd = draft.writtenDate ? parseWrittenDate(draft.writtenDate) : null;
  const dates = wd ? wd.candidates : [];
  const date = draft.dateChoice || (wd && dates.length === 1 && !wd.flags.length ? dates[0].iso : wd && !dates.length ? null : wd ? null : draft.date || null);
  let place;
  if (!draft.place) place = { status: 'none', options: [] };
  else if (draft.lat != null && draft.placePicked) place = { status: 'picked', options: [] };
  else {
    const head = fold(draft.place.split(',')[0]);
    const found = searchLocalPlaces(draft.place, 6);
    const exact = found.filter((p) => fold(p.name) === head);
    const options = exact.length ? exact : found;
    place = { status: options.length === 1 && exact.length === 1 ? 'matched' : options.length ? 'choose' : 'not-found', options };
  }
  const tamil = date && draft.tamilYear != null ? tamilYearCheck(date, draft.tamilYear, { lat: draft.lat ?? state.loc?.lat, lon: draft.lon ?? state.loc?.lon, tz: draft.tz ?? 5.5 }) : null;
  return { wd, dates, date, place, tamil };
}

function confirmHtml() {
  const k = draft.kattam;
  const r = reviewOf();
  const flag = (t) => `<p class="small kt-flag">⚠️ ${esc(bi(t))}</p>`;
  const dateBlock = r.wd && (r.dates.length > 1 || r.wd.flags.length)
    ? `${r.wd.flags.map(flag).join('')}${r.dates.length ? `<div class="kt-choices" role="radiogroup" aria-label="${esc(L('Which date?', 'எந்தத் தேதி?'))}">${r.dates.map((c) => `<label class="seg-opt"><input type="radio" name="ktDate" value="${c.iso}"${draft.dateChoice === c.iso ? ' checked' : ''}> ${esc(fmtIsoDate(c.iso))} · ${esc(weekdayOf(c.iso))}</label>`).join('')}</div>` : ''}`
    : r.date ? `<b>${esc(fmtIsoDate(r.date))}</b> · ${esc(weekdayOf(r.date))}` : flag({ en: 'Please enter the date of birth.', ta: 'பிறந்த தேதியை உள்ளிடவும்.' });
  const placeBlock = r.place.status === 'picked' || r.place.status === 'matched'
    ? `<b>${esc(r.place.status === 'matched' ? placeLabel(r.place.options[0]) : draft.place)}</b>${draft.lat != null || r.place.options[0] ? ` <span class="muted small">(${Number(draft.lat ?? r.place.options[0].lat).toFixed(2)}, ${Number(draft.lon ?? r.place.options[0].lon).toFixed(2)})</span>` : ''}`
    : r.place.status === 'choose'
      ? `${flag({ en: `“${draft.place}” matches more than one place — please choose the birth place.`, ta: `“${draft.place}” பல இடங்களுடன் பொருந்துகிறது — பிறந்த இடத்தைத் தேர்வு செய்யவும்.` })}<div class="kt-choices" role="radiogroup">${r.place.options.map((p, i) => `<label class="seg-opt"><input type="radio" name="ktPlace" value="${i}"${draft.placeChoice === i ? ' checked' : ''}> ${esc(placeLabel(p))}</label>`).join('')}</div>`
      : r.place.status === 'not-found'
        ? flag({ en: `“${draft.place}” was not found in the place list. Go back and pick it from the suggestions, or the chart will use your current location (${state.loc?.name || 'Chennai'}) for the calendar details.`, ta: `“${draft.place}” இடப் பட்டியலில் இல்லை. திருத்தி பரிந்துரையிலிருந்து தேர்வு செய்யவும்; இல்லையெனில் நாட்காட்டி விவரங்களுக்கு உங்கள் தற்போதைய இடம் (${state.loc?.name || 'சென்னை'}) பயன்படும்.` })
        : `<span class="muted">${L(`Not given — your current location (${state.loc?.name || 'Chennai'}) is used for the calendar details.`, `கொடுக்கப்படவில்லை — நாட்காட்டி விவரங்களுக்கு உங்கள் தற்போதைய இடம் (${state.loc?.name || 'சென்னை'}) பயன்படும்.`)}</span>`;
  const placed = KATTAM_PLANETS.filter((p) => k.planets[p] != null);
  return `<section class="card glass kt-confirm" aria-labelledby="ktConfTitle">
    <div class="card-title" id="ktConfTitle">🔎 ${L('Check these details before calculating', 'கணிப்பதற்கு முன் இவ்விவரங்களைச் சரிபார்க்கவும்')}</div>
    <dl class="kv kt-kv" style="display:block">
      <dt>${L('Name', 'பெயர்')}</dt><dd>${esc(draft.name)}</dd>
      <dt>${L('Date of birth', 'பிறந்த தேதி')}</dt><dd>${draft.writtenDate ? `<span class="muted small">${L('written', 'எழுதியபடி')}: “${esc(draft.writtenDate)}”</span><br>` : ''}${dateBlock}</dd>
      ${r.tamil ? `<dt>${L('Tamil year', 'தமிழ் ஆண்டு')}</dt><dd>${r.tamil.ok ? `<b>${esc(bi(r.tamil.entered))}</b> <span class="tag good">${L('matches the date', 'தேதியுடன் பொருந்துகிறது')}</span>` : flag(r.tamil.flag)}</dd>` : ''}
      <dt>${L('Place of birth', 'பிறந்த இடம்')}</dt><dd>${placeBlock}</dd>
      <dt>${L('Birth star', 'ஜென்ம நட்சத்திரம்')}</dt><dd>${k.star != null ? `${esc(nakName(k.star))} · ${L('Pada', 'பாதம்')} ${k.pada}` : '—'}</dd>
      <dt>${L('Lagnam', 'லக்னம்')}</dt><dd>${k.lagna != null ? esc(rasiName(k.lagna)) : `<span class="badge unv">${L('not marked — Moon-based readings only', 'குறிக்கப்படவில்லை — சந்திர அடிப்படைப் பலன்கள் மட்டும்')}</span>`}</dd>
      <dt>${L('Planets placed', 'கிரகங்கள்')}</dt><dd>${placed.length} / 9</dd>
      <dt>${L('Dasa balance', 'தசா இருப்பு')}</dt><dd>${k.balance ? `${k.balance.years} ${L('yrs', 'ஆண்டு')} ${k.balance.months} ${L('months', 'மாதம்')}` : L('not given (dasa dates approximate)', 'கொடுக்கப்படவில்லை (தசா தேதிகள் தோராயம்)')}</dd>
    </dl>
    <p class="err" id="ktConfErr" role="alert"></p>
    <div class="btn-row"><button type="button" class="btn-gold" id="ktConfirmBtn">✔️ ${L('Confirm and calculate', 'உறுதிசெய்து கணி')}</button><button type="button" class="chip-btn" id="ktBack">✏️ ${L('Edit', 'திருத்து')}</button></div>
  </section>`;
}

function render(sec) {
  if (draft.confirming) { renderConfirm(sec); return; }
  const k = draft.kattam;
  const warn = k.star != null ? kattamWarnings(k) : [];
  const starLord = k.star != null ? NAKSHATRAS[k.star].lord : null;
  sec.innerHTML = `${subHeader(L('From the written jathagam', 'எழுதிய ஜாதகத்திலிருந்து'), L('For families who have the Rasi Kattam but not the birth time', 'ராசி கட்டம் உள்ளது, பிறந்த நேரம் தெரியாதவர்களுக்கு'), 'family')}
    <div class="card glass">
      <label class="chip-btn kt-photo-btn">📷 ${L('Take / choose a photo of the jathagam', 'ஜாதகப் புகைப்படம் எடு / தேர்வு செய்')}<input type="file" accept="image/*" capture="environment" id="ktPhoto" hidden></label>
      ${photoUrl ? `<img src="${photoUrl}" alt="${esc(L('Jathagam photo', 'ஜாதகப் புகைப்படம்'))}" class="kt-photo">` : ''}
      <p class="small muted">${L('The photo stays on this phone — look at it and fill the boxes below. (Automatic reading of handwriting is not reliable yet, so we never guess from the photo.)', 'புகைப்படம் இந்தக் கைப்பேசியிலேயே இருக்கும் — அதைப் பார்த்துக் கீழே உள்ள கட்டங்களை நிரப்புங்கள். (கையெழுத்தைத் தானாகப் படிப்பது இன்னும் நம்பகமில்லை; அதனால் புகைப்படத்திலிருந்து ஊகிப்பதில்லை.)')}</p>
    </div>
    <form id="ktForm" class="card glass" novalidate>
      <div class="row2"><label>${L('Name', 'பெயர்')}<input name="name" value="${esc(draft.name)}" maxlength="60" required></label>
        <label>${L('Gender', 'பாலினம்')}<select name="gender">${[['male', 'Male', 'ஆண்'], ['female', 'Female', 'பெண்']].map(([v, en, tx]) => `<option value="${v}"${draft.gender === v ? ' selected' : ''}>${L(en, tx)}</option>`).join('')}</select></label></div>
      <label>${L('Relation', 'உறவு')}<select name="relation">${RELATIONS.filter((r) => r.id !== 'organization').map((r) => `<option value="${r.id}"${draft.relation === r.id ? ' selected' : ''}>${esc(bi(r))}</option>`).join('')}</select></label>
      <label>${L('Date of birth (from the jathagam)', 'பிறந்த தேதி (ஜாதகத்திலிருந்து)')}<input type="date" name="date" value="${esc(draft.date)}"></label>
      <div class="row2"><label>${L('…or type it as written (optional)', '…அல்லது எழுதியபடியே (விருப்பம்)')}<input name="wdate" inputmode="text" placeholder="05/06/1972" maxlength="24" value="${esc(draft.writtenDate || '')}"></label>
        <label>${L('Tamil year in the jathagam (optional)', 'ஜாதகத்தில் தமிழ் ஆண்டு (விருப்பம்)')}<select name="tyear"><option value="">—</option>${TAMIL_YEARS.map((y) => `<option value="${y.index}"${draft.tamilYear === y.index ? ' selected' : ''}>${esc(bi(y))}</option>`).join('')}</select></label></div>
      <label class="place-wrap">${L('Place of birth (optional)', 'பிறந்த இடம் (விருப்பம்)')}<input name="place" value="${esc(draft.place)}" autocomplete="off"><ul id="ktPlaces" class="suggest" hidden></ul></label>
      <div class="row2"><label>${L('Birth star (Natchathiram)', 'ஜென்ம நட்சத்திரம்')}<select name="star" required><option value="">—</option>${NAKSHATRAS.map((n, i) => `<option value="${i}"${k.star === i ? ' selected' : ''}>${esc(nakName(i))}</option>`).join('')}</select></label>
        <label>${L('Pada', 'பாதம்')}<select name="pada">${[1, 2, 3, 4].map((p) => `<option${k.pada === p ? ' selected' : ''}>${p}</option>`).join('')}</select></label></div>

      <div class="mini-label">${L('Rasi Kattam — tap each box and choose the planets written in it; mark the box with “ல” as Lagnam', 'ராசி கட்டம் — ஒவ்வொரு கட்டத்தையும் தொட்டு அதில் எழுதிய கிரகங்களைத் தேர்வு செய்யுங்கள்; “ல” உள்ள கட்டத்தை லக்னமாகக் குறியுங்கள்')}</div>
      ${gridHtml()}
      <div id="ktPicker"></div>

      <fieldset class="kt-bal"><legend>${L('Dasa balance at birth (தசா இருப்பு) — optional, makes dasa dates exact', 'பிறப்பில் தசா இருப்பு — விருப்பம், தசா தேதிகளைத் துல்லியமாக்கும்')}</legend>
        ${starLord ? `<p class="small">${L('Dasa at birth', 'பிறப்பில் தசை')}: <b>${esc(L(starLord, PLANETS[starLord].ta))}</b></p>` : `<p class="small muted">${L('Choose the birth star first.', 'முதலில் நட்சத்திரம் தேர்வு செய்யுங்கள்.')}</p>`}
        <div class="row2"><label>${L('Years', 'ஆண்டு')}<input name="by" inputmode="numeric" maxlength="2" value="${k.balance?.years ?? ''}"></label><label>${L('Months', 'மாதம்')}<input name="bm" inputmode="numeric" maxlength="2" value="${k.balance?.months ?? ''}"></label></div>
      </fieldset>
      ${warn.length ? `<div class="trip-warn">${warn.map((w) => `⚠️ ${esc(bi(w))}`).join('<br>')}</div>` : ''}
      <p class="err" id="ktErr" role="alert"></p>
      <button class="btn-gold">💾 ${L('Save and read this jathagam', 'சேமித்து ஜாதகம் பார்')}</button>
    </form>`;
  wire(sec);
}

function readForm(f) {
  draft.name = f.elements.name.value.trim();
  draft.gender = f.elements.gender.value;
  draft.relation = f.elements.relation.value;
  draft.date = f.elements.date.value;
  const wd = f.elements.wdate.value.trim();
  if (wd !== (draft.writtenDate || '')) draft.dateChoice = null;
  draft.writtenDate = wd;
  draft.tamilYear = f.elements.tyear.value === '' ? null : Number(f.elements.tyear.value);
  const pl = f.elements.place.value.trim();
  if (pl !== draft.place) { draft.placePicked = false; draft.placeChoice = null; draft.lat = null; draft.lon = null; }
  draft.place = pl;
  const st = f.elements.star.value;
  draft.kattam.star = st === '' ? null : Number(st);
  draft.kattam.pada = Number(f.elements.pada.value) || 1;
  const by = f.elements.by.value.trim(), bm = f.elements.bm.value.trim();
  draft.kattam.balance = /^\d{1,2}$/.test(by) || /^\d{1,2}$/.test(bm) ? { years: Number(by) || 0, months: Number(bm) || 0 } : null;
}

function wire(sec) {
  const f = $('#ktForm');
  $('#ktPhoto').addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    photoUrl = URL.createObjectURL(file);
    readForm(f); render(sec);
  });
  placeSearch(f.elements.place, $('#ktPlaces'), (p) => { Object.assign(draft, { place: p.text || p.name, lat: p.lat, lon: p.lon, tz: p.tz, zone: p.zone, placePicked: true }); f.elements.place.value = p.text || p.name; });
  f.elements.star.addEventListener('change', () => { readForm(f); render(sec); });
  f.elements.pada.addEventListener('change', () => { readForm(f); render(sec); });
  $$('[data-box]', sec).forEach((b) => b.addEventListener('click', () => { readForm(f); picker(sec, Number(b.dataset.box)); }));
  f.addEventListener('submit', (e) => { e.preventDefault(); readForm(f); review(sec); });
}

function picker(sec, r) {
  const k = draft.kattam;
  $('#ktPicker').innerHTML = `<div class="kt-pick card glass"><div class="card-title"><span>${esc(bi(RASIS[r]))}</span><button type="button" class="link-btn" id="ktDone">${L('Done', 'முடிந்தது')}</button></div>
    <div class="kt-chips">${KATTAM_PLANETS.map((p) => `<button type="button" class="mchip${k.planets[p] === r ? ' sel' : ''}" data-pl="${p}">${esc(L(p, PLANETS[p].ta))}</button>`).join('')}
    <button type="button" class="mchip${k.lagna === r ? ' sel' : ''}" data-pl="Lagna">${L('Lagnam (ல)', 'லக்னம் (ல)')}</button></div>
    <p class="small muted">${L('Tap again to remove. A planet moves here from any other box.', 'மீண்டும் தொட்டால் நீக்கம். வேறு கட்டத்தில் இருந்தால் இங்கு மாறும்.')}</p></div>`;
  $$('[data-pl]', sec).forEach((b) => b.addEventListener('click', () => {
    const p = b.dataset.pl;
    if (p === 'Lagna') k.lagna = k.lagna === r ? null : r;
    else if (k.planets[p] === r) delete k.planets[p]; else k.planets[p] = r;
    const f = $('#ktForm'); readForm(f); render(sec); picker(sec, r);
    $('#ktPicker').scrollIntoView({ block: 'nearest' });
  }));
  $('#ktDone').addEventListener('click', () => { $('#ktPicker').innerHTML = ''; });
  $('#ktPicker').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/** Step 1 (form submit): basic checks, then the confirmation panel — nothing is calculated yet. */
function review(sec) {
  const err = (msg) => { $('#ktErr').textContent = msg; };
  if (!draft.name) return err(L('Please enter the name.', 'பெயரை உள்ளிடவும்.'));
  if (!draft.writtenDate && !/^\d{4}-\d{2}-\d{2}$/.test(draft.date)) return err(L('Please enter the date of birth.', 'பிறந்த தேதியை உள்ளிடவும்.'));
  if (draft.kattam.star == null) return err(L('Please choose the birth star.', 'ஜென்ம நட்சத்திரத்தைத் தேர்வு செய்யவும்.'));
  if (Object.keys(draft.kattam.planets).length < 7) return err(L('Please place at least 7 planets in the boxes (Sun to Saturn, Rahu, Ketu).', 'குறைந்தது 7 கிரகங்களைக் கட்டங்களில் வையுங்கள்.'));
  draft.confirming = true;
  render(sec);
}

function renderConfirm(sec) {
  sec.innerHTML = `${subHeader(L('From the written jathagam', 'எழுதிய ஜாதகத்திலிருந்து'), L('Confirm the details', 'விவரங்களை உறுதிசெய்யவும்'), 'family')}${confirmHtml()}`;
  $$('input[name="ktDate"]', sec).forEach((x) => x.addEventListener('change', () => { draft.dateChoice = x.value; renderConfirm(sec); }));
  $$('input[name="ktPlace"]', sec).forEach((x) => x.addEventListener('change', () => { draft.placeChoice = Number(x.value); renderConfirm(sec); }));
  $('#ktBack').addEventListener('click', () => { draft.confirming = false; render(sec); });
  $('#ktConfirmBtn').addEventListener('click', () => {
    const r = reviewOf();
    const err = (msg) => { $('#ktConfErr').textContent = msg; };
    if (!r.date) return err(L('Please choose the date of birth.', 'பிறந்த தேதியைத் தேர்வு செய்யவும்.'));
    if (r.tamil && !r.tamil.ok && !draft.tamilAck) { draft.tamilAck = true; return err(L('The Tamil year does not match this date. Tap Confirm again to keep the date as it is, or Edit to correct it.', 'தமிழ் ஆண்டு இந்தத் தேதியுடன் பொருந்தவில்லை. தேதியை அப்படியே வைக்க மீண்டும் உறுதிசெய்யவும்; திருத்த “திருத்து”.')); }
    if (r.place.status === 'choose') {
      const p = r.place.options[draft.placeChoice];
      if (!p) return err(L('Please choose the birth place.', 'பிறந்த இடத்தைத் தேர்வு செய்யவும்.'));
      Object.assign(draft, { place: placeLabel(p), lat: p.lat, lon: p.lon, tz: p.tz, zone: p.zone, placePicked: true });
    } else if (r.place.status === 'matched') {
      const p = r.place.options[0];
      Object.assign(draft, { place: placeLabel(p), lat: p.lat, lon: p.lon, tz: p.tz, zone: p.zone, placePicked: true });
    }
    draft.date = r.date;
    save();
  });
}

/** Step 2 (after confirmation): store the profile and open the chart. */
function save() {
  const m = {
    id: draft.id || Math.random().toString(36).slice(2, 10), name: draft.name, gender: draft.gender, relation: draft.relation,
    date: draft.date, time: '12:00:00', timeCertainty: 'unknown', place: draft.place || state.loc?.name || '',
    lat: draft.lat ?? state.loc?.lat ?? 13.08, lon: draft.lon ?? state.loc?.lon ?? 80.27, tz: draft.tz ?? state.loc?.tz ?? 5.5, zone: draft.zone || undefined, kattam: JSON.parse(JSON.stringify(draft.kattam)),
    writtenDate: draft.writtenDate || undefined, tamilYear: draft.tamilYear ?? undefined,
  };
  const i = state.family.findIndex((x) => x.id === m.id);
  if (i >= 0) state.family[i] = { ...state.family[i], ...m }; else state.family.push(m);
  state.activeId = m.id;
  saveFamily();
  toast(L('Saved — reading the jathagam', 'சேமிக்கப்பட்டது — ஜாதகம் பார்க்கிறது'));
  draft = null;
  go('chart', {});
}

function renderKattam(sec, params = {}) {
  if (params.edit) {
    const m = state.family.find((x) => x.id === params.edit);
    if (m?.kattam) draft = { ...blank(), ...JSON.parse(JSON.stringify(m)), placePicked: m.lat != null, confirming: false };
  }
  if (!draft) draft = blank();
  render(sec);
}

registerScreen('kattam', { render: renderKattam, parent: 'familyhub' });
