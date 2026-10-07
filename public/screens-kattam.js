// Add a person from the written jathagam (எழுதிய ஜாதகம்): photo for reference, the 12-box South Indian Rasi
// Kattam, birth star + pada, Lagnam and the written dasa balance. No birth time needed. The photo stays on this
// phone (it is never uploaded).
// Import: a photo or PDF can be read automatically on the phone (ocr-import.js, loaded only when tapped). What is read
// only PREFILLS this form — every field stays editable, unclear ones are highlighted, and the confirmation panel
// is always shown before anything is calculated (mayCalculate in shared/horoscope-parse.js guards the save).
import { NAKSHATRAS, RASIS, PLANETS, vedicDay } from './shared/astro.js';
import { KATTAM_PLANETS, kattamWarnings } from './shared/kattam.js';
import { state, $, $$, L, esc, bi, registerScreen, subHeader, toast, saveFamily, go, RELATIONS, nakName, fmtIsoDate, rasiName } from './core.js';
import { placeSearch } from './account.js';
import { searchLocalPlaces, placeLabel, zoneOffsetHours } from './shared/places.js';
import { TAMIL_YEARS } from './shared/tamilcal.js';
import { parseWrittenDate, tamilYearCheck } from './shared/written-date.js';
import { parseHoroscopeText, importToDraft, mayCalculate, nazhigaiToClock } from './shared/horoscope-parse.js';

// South Indian layout: fixed sign positions in a 4 × 4 grid (centre 2 × 2 is the title).
const GRID = [[11, 0, 1, 2], [10, null, null, 3], [9, null, null, 4], [8, 7, 6, 5]];
const SHORT = { Sun: ['Su', 'சூ'], Moon: ['Mo', 'சந்'], Mars: ['Ma', 'செவ்'], Mercury: ['Me', 'பு'], Jupiter: ['Ju', 'கு'], Venus: ['Ve', 'சுக்'], Saturn: ['Sa', 'சனி'], Rahu: ['Ra', 'ரா'], Ketu: ['Ke', 'கே'] };

let draft = null;
let photoUrl = null;
let ocrJob = null; // { ctrl: AbortController, msg } while a photo / PDF is being read

function blank() {
  return { id: null, name: '', gender: 'male', relation: 'self', date: '', place: state.loc?.name || '', lat: state.loc?.lat ?? null, lon: state.loc?.lon ?? null, tz: state.loc?.tz ?? 5.5,
    writtenDate: '', tamilYear: null, dateChoice: null, placeChoice: null, confirming: false, confirmed: false,
    time: '', timeOptions: null, autoTime: null, timeChoice: null, nazhigai: null, nazhigaiAccept: false, tamilDateRead: null, autoRead: null,
    kattam: { star: null, pada: 1, lagna: null, planets: {}, balance: null } };
}

// Fields filled automatically get a gold edge; unclear ones an amber edge (low confidence).
const autoCls = (...keys) => {
  const a = draft.autoRead;
  if (!a) return '';
  if (keys.some((k) => a.low.includes(k))) return ' kt-low';
  return keys.some((k) => a.filled.includes(k)) ? ' kt-auto' : '';
};

function boxHtml(r) {
  const k = draft.kattam;
  const here = KATTAM_PLANETS.filter((p) => k.planets[p] === r);
  const auto = draft.autoRead && ((k.lagna === r && draft.autoRead.filled.includes('lagna')) || (k.planets.Moon === r && draft.autoRead.filled.includes('rasi'))) ? ' kt-auto' : '';
  return `<button type="button" class="kt-box${k.lagna === r ? ' lagna' : ''}${auto}" data-box="${r}" aria-label="${esc(bi(RASIS[r]))}">
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

const T2 = (en, ta) => ({ en, ta });
const fmtClock = (t) => { const [h, m] = t.split(':').map(Number); return `${t} (${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? L('AM', 'காலை') : L('PM', 'மாலை/இரவு')})`; };
// Flags the confirmation panel already shows in its own rows; the rest are listed under the auto-read note.
const SHOWN_IN_ROWS = ['day-month', 'two-digit-year', 'unreadable', 'ampm', 'nazhigai', 'tamil-cycle', 'place-choose', 'place-missing', 'no-date'];

/** Where the confirmed place is: { lat, lon, tz, zone } or null while it still has to be chosen / found. */
function resolvedPlace(place) {
  if (place.status === 'picked') return { lat: draft.lat, lon: draft.lon, tz: draft.tz, zone: draft.zone };
  if (place.status === 'matched') return place.options[0];
  if (place.status === 'choose') return place.options[draft.placeChoice] || null;
  return null;
}

/**
 * What still needs the family's confirmation before the chart is calculated:
 * { date: { candidates, flags } , place: { status: 'picked' | 'matched' | 'choose' | 'not-found' | 'none', options }, tamil,
 *   time, timeVia: 'clock' | 'nazhigai' | null, conv (nazhigai → clock), mode: 'kattam' | 'time' }.
 */
function reviewOf() {
  // A date read only from the Tamil calendar ("குரோதி வருடம் ஆடி 12") — each 60-year cycle gives a candidate.
  const tdr = !draft.writtenDate && draft.tamilDateRead && (!draft.date || draft.tamilDateRead.candidates.includes(draft.date)) ? draft.tamilDateRead : null;
  const wd = draft.writtenDate ? parseWrittenDate(draft.writtenDate)
    : tdr ? { candidates: tdr.candidates.map((iso) => ({ iso, reading: 'TAMIL' })), flags: [T2(`Read from the Tamil calendar date “${tdr.text}”. The 60-year cycle repeats — please confirm the date.`, `தமிழ் நாட்காட்டித் தேதி “${tdr.text}” இலிருந்து படிக்கப்பட்டது. 60 ஆண்டுச் சுழற்சி மீண்டும் வரும் — தேதியை உறுதிசெய்யவும்.`)] } : null;
  const dates = wd ? wd.candidates : [];
  const date = (draft.dateChoice && (!wd || dates.some((c) => c.iso === draft.dateChoice)) ? draft.dateChoice : null)
    || (wd && dates.length === 1 && !wd.flags.length ? dates[0].iso : wd ? null : draft.date || null);
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
  const where = resolvedPlace(place);
  const tamil = date && draft.tamilYear != null ? tamilYearCheck(date, draft.tamilYear, { lat: where?.lat ?? state.loc?.lat, lon: where?.lon ?? state.loc?.lon, tz: where?.tz ?? 5.5 }) : null;
  // Birth time: a clock time as written (AM/PM chosen when it was not written), or nazhigai after sunrise converted
  // with the sunrise at the confirmed place on the confirmed date — used only when the family ticks it.
  let time = null, timeVia = null, conv = null;
  const timeAmbiguous = Boolean(draft.time && draft.timeOptions && draft.time === draft.autoTime);
  if (draft.time) { timeVia = 'clock'; time = timeAmbiguous ? (draft.timeOptions.includes(draft.timeChoice) ? draft.timeChoice : null) : draft.time; }
  else if (draft.nazhigai && date && where && where.lat != null) {
    const [y, m, d] = date.split('-').map(Number);
    const tz = (where.zone && zoneOffsetHours(where.zone, Date.UTC(y, m - 1, d, 6))) ?? where.tz ?? 5.5;
    const sunrise = vedicDay(new Date(Date.UTC(y, m - 1, d, 12) - tz * 3600000), where.lat, where.lon).sunrise;
    conv = { ...nazhigaiToClock(draft.nazhigai.minutesAfterSunrise, sunrise, tz), sunrise: nazhigaiToClock(0, sunrise, tz).time };
    timeVia = 'nazhigai';
    time = draft.nazhigaiAccept ? conv.time : null;
  }
  const mode = Object.keys(draft.kattam.planets).length >= 7 ? 'kattam' : 'time';
  return { wd, dates, date, place, where, tamil, time, timeVia, conv, timeAmbiguous, mode };
}

function confirmHtml() {
  const k = draft.kattam;
  const r = reviewOf();
  const a = draft.autoRead;
  const flag = (t) => `<p class="small kt-flag">⚠️ ${esc(bi(t))}</p>`;
  const lowDd = (...keys) => (a && keys.some((x) => a.low.includes(x)) ? ' class="kt-low"' : '');
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
  const nz = draft.nazhigai;
  const timeBlock = r.timeVia === 'clock'
    ? (r.timeAmbiguous
      ? `${flag(T2(`The time “${draft.autoTime}” was read without AM/PM — please choose.`, `“${draft.autoTime}” நேரம் காலை/மாலை இல்லாமல் படிக்கப்பட்டது — தேர்வு செய்யவும்.`))}<div class="kt-choices" role="radiogroup" aria-label="${esc(L('Which time?', 'எந்த நேரம்?'))}">${draft.timeOptions.map((t) => `<label class="seg-opt"><input type="radio" name="ktTime" value="${t}"${draft.timeChoice === t ? ' checked' : ''}> ${esc(fmtClock(t))}</label>`).join('')}</div>`
      : `<b>${esc(fmtClock(r.time))}</b>`)
    : r.timeVia === 'nazhigai'
      ? `${flag(T2(`Written as ${nz.nazhigai} nazhigai ${nz.vinadi} vinadi after sunrise. Sunrise at this place on this date: ${r.conv.sunrise} → about ${r.conv.time}${r.conv.nextDay ? ' (after midnight, the next calendar day)' : ''}. Needs your confirmation.`, `சூரிய உதயத்திலிருந்து ${nz.nazhigai} நாழிகை ${nz.vinadi} விநாடி என எழுதப்பட்டுள்ளது. இந்த ஊரில் அன்று சூரிய உதயம் ${r.conv.sunrise} → சுமார் ${r.conv.time}${r.conv.nextDay ? ' (நள்ளிரவுக்குப் பின், அடுத்த நாள்)' : ''}. உறுதிசெய்ய வேண்டும்.`))}<label class="set-row"><span>${L(`Use about ${r.conv.time} as the birth time`, `சுமார் ${r.conv.time} ஐப் பிறந்த நேரமாகக் கொள்`)}</span><input type="checkbox" id="ktNz"${draft.nazhigaiAccept ? ' checked' : ''}></label>`
      : nz ? flag(T2(`Written as ${nz.nazhigai} nazhigai ${nz.vinadi} vinadi after sunrise — confirm the date and the place first; then it is converted to a clock time here.`, `சூரிய உதயத்திலிருந்து ${nz.nazhigai} நாழிகை ${nz.vinadi} விநாடி — முதலில் தேதியையும் இடத்தையும் உறுதிசெய்யவும்; பின் இங்கு மணியாக மாற்றப்படும்.`))
        : `<span class="muted">${L('Not given', 'கொடுக்கப்படவில்லை')}</span>`;
  const extra = a ? a.flags.filter((f) => !SHOWN_IN_ROWS.includes(f.code)) : [];
  const placed = KATTAM_PLANETS.filter((p) => k.planets[p] != null);
  return `<section class="card glass kt-confirm" aria-labelledby="ktConfTitle">
    <div class="card-title" id="ktConfTitle">🔎 ${L('Check these details before calculating', 'கணிப்பதற்கு முன் இவ்விவரங்களைச் சரிபார்க்கவும்')}</div>
    ${a ? `<div class="note-box kt-auto-note" role="note"><b>${L('Automatically read — please check every field', 'தானாகப் படிக்கப்பட்டது — ஒவ்வொரு விவரத்தையும் சரிபார்க்கவும்')}</b>${extra.map(flag).join('')}</div>` : ''}
    <dl class="kv kt-kv" style="display:block">
      <dt>${L('Name', 'பெயர்')}</dt><dd${lowDd('name')}>${esc(draft.name)}</dd>
      <dt>${L('Date of birth', 'பிறந்த தேதி')}</dt><dd${lowDd('date')}>${draft.writtenDate ? `<span class="muted small">${L('written', 'எழுதியபடி')}: “${esc(draft.writtenDate)}”</span><br>` : ''}${dateBlock}</dd>
      ${r.tamil ? `<dt>${L('Tamil year', 'தமிழ் ஆண்டு')}</dt><dd${lowDd('tamilYear')}>${r.tamil.ok ? `<b>${esc(bi(r.tamil.entered))}</b> <span class="tag good">${L('matches the date', 'தேதியுடன் பொருந்துகிறது')}</span>` : flag(r.tamil.flag)}</dd>` : ''}
      <dt>${L('Birth time', 'பிறந்த நேரம்')}</dt><dd${lowDd('time', 'nazhigai')}>${timeBlock}</dd>
      <dt>${L('Place of birth', 'பிறந்த இடம்')}</dt><dd${lowDd('place')}>${placeBlock}</dd>
      <dt>${L('Birth star', 'ஜென்ம நட்சத்திரம்')}</dt><dd${lowDd('star', 'pada')}>${k.star != null ? `${esc(nakName(k.star))} · ${L('Pada', 'பாதம்')} ${k.pada}` : '—'}</dd>
      <dt>${L('Lagnam', 'லக்னம்')}</dt><dd${lowDd('lagna')}>${k.lagna != null ? esc(rasiName(k.lagna)) : `<span class="badge unv">${L('not marked — Moon-based readings only', 'குறிக்கப்படவில்லை — சந்திர அடிப்படைப் பலன்கள் மட்டும்')}</span>`}</dd>
      <dt>${L('Planets placed', 'கிரகங்கள்')}</dt><dd>${placed.length} / 9</dd>
      <dt>${L('Dasa balance', 'தசா இருப்பு')}</dt><dd${lowDd('balance')}>${k.balance ? `${k.balance.years} ${L('yrs', 'ஆண்டு')} ${k.balance.months} ${L('months', 'மாதம்')}` : L('not given (dasa dates approximate)', 'கொடுக்கப்படவில்லை (தசா தேதிகள் தோராயம்)')}</dd>
      <dt>${L('Chart from', 'ஜாதகம் கணிப்பது')}</dt><dd>${r.mode === 'kattam' ? L('the Rasi Kattam boxes as written', 'எழுதிய ராசி கட்டப்படி') : L('the birth date, time and place (calculated)', 'பிறந்த தேதி, நேரம், இடம் கொண்டு (கணிப்பு)')}</dd>
    </dl>
    <p class="err" id="ktConfErr" role="alert"></p>
    <div class="btn-row"><button type="button" class="btn-gold" id="ktConfirmBtn">✔️ ${L('Confirm and calculate', 'உறுதிசெய்து கணி')}</button><button type="button" class="chip-btn" id="ktBack">✏️ ${L('Edit', 'திருத்து')}</button></div>
  </section>`;
}

function importCardHtml() {
  const busy = ocrJob;
  return `<div class="card glass kt-import">
      <div class="card-title">📥 ${L('Import the horoscope', 'ஜாதகத்தை இறக்கு')}</div>
      <p class="small">${L('Take a photo, or choose a photo or PDF of the jathagam. It is read on this phone — nothing is uploaded — and only fills the form below for you to check.', 'புகைப்படம் எடுக்கவும், அல்லது ஜாதகப் புகைப்படம் / PDF தேர்வு செய்யவும். இந்தக் கைப்பேசியிலேயே படிக்கப்படும் — எதுவும் பதிவேற்றப்படாது — கீழே உள்ள படிவத்தை நிரப்பும்; நீங்கள் சரிபார்க்க வேண்டும்.')}</p>
      <div class="btn-row kt-import-btns">
        <label class="chip-btn kt-photo-btn">📷 ${L('Take a photo', 'புகைப்படம் எடு')}<input type="file" accept="image/*" capture="environment" id="ktPhoto" hidden${busy ? ' disabled' : ''}></label>
        <label class="chip-btn kt-photo-btn">🗂️ ${L('Photo or PDF', 'புகைப்படம் / PDF')}<input type="file" accept="image/*,application/pdf,.pdf" id="ktFile" hidden${busy ? ' disabled' : ''}></label>
      </div>
      <div id="ktOcr" class="kt-ocr" aria-live="polite"${busy ? '' : ' hidden'}>${busy ? ocrStatusHtml(busy.msg) : ''}</div>
      ${photoUrl ? `<img src="${photoUrl}" alt="${esc(L('Jathagam photo', 'ஜாதகப் புகைப்படம்'))}" class="kt-photo">` : ''}
      <p class="small muted">${L('Printed jathagams read best. Handwriting is often misread, so the 12 boxes are always filled by you — look at the photo and tap each box.', 'அச்சிட்ட ஜாதகங்கள் நன்றாகப் படிக்கப்படும். கையெழுத்து அடிக்கடி தவறாகப் படிக்கப்படும்; அதனால் 12 கட்டங்களை நீங்களே நிரப்புங்கள் — புகைப்படத்தைப் பார்த்து ஒவ்வொரு கட்டத்தையும் தொடுங்கள்.')}</p>
    </div>`;
}

function ocrStatusHtml(msg) {
  const pct = msg?.progress != null ? Math.round(msg.progress * 100) : null;
  const text = !msg || msg.stage === 'load' ? L('Preparing the reader on this phone… (the first time takes longer)', 'இந்தக் கைப்பேசியில் படிப்பான் தயாராகிறது… (முதல் முறை சற்று நேரம் ஆகும்)')
    : msg.stage === 'pdf' ? L('Opening the PDF…', 'PDF திறக்கிறது…')
      : `${L('Reading', 'படிக்கிறது')}${msg.pages > 1 ? ` ${L('page', 'பக்கம்')} ${msg.page}/${msg.pages}` : ''}…`;
  return `<p class="small">${text}</p><progress max="100"${pct != null && msg?.stage === 'read' ? ` value="${pct}"` : ''}></progress>
    <button type="button" class="link-btn" id="ktOcrCancel">${L('Cancel', 'ரத்து')}</button>`;
}

function autoNoteHtml() {
  const a = draft.autoRead;
  if (!a) return '';
  const names = { name: ['name', 'பெயர்'], gender: ['gender', 'பாலினம்'], date: ['date', 'தேதி'], tamilYear: ['Tamil year', 'தமிழ் ஆண்டு'], time: ['time', 'நேரம்'], nazhigai: ['nazhigai', 'நாழிகை'], place: ['place', 'ஊர்'], star: ['star', 'நட்சத்திரம்'], pada: ['pada', 'பாதம்'], rasi: ['Rasi (Moon box)', 'ராசி (சந்திரன் கட்டம்)'], lagna: ['Lagnam', 'லக்னம்'], balance: ['dasa balance', 'தசா இருப்பு'] };
  const list = (keys) => keys.filter((x) => names[x]).map((x) => L(...names[x])).join(', ');
  const src = a.source === 'pdf-text' ? L('the PDF text', 'PDF உரை') : a.source === 'pdf-ocr' ? L('the PDF (read as an image)', 'PDF (படமாகப் படிக்கப்பட்டது)') : L('the photo', 'புகைப்படம்');
  return `<section class="card glass kt-auto-card" role="status" aria-labelledby="ktAutoTitle">
    <div class="card-title" id="ktAutoTitle">🤖 ${L('Automatically read — please check every field', 'தானாகப் படிக்கப்பட்டது — ஒவ்வொரு விவரத்தையும் சரிபார்க்கவும்')}</div>
    ${a.filled.length ? `<p class="small">${L(`Filled from ${src}`, `${src} இலிருந்து நிரப்பப்பட்டது`)}: <b>${esc(list(a.filled))}</b>.</p>` : `<p class="small kt-flag">⚠️ ${L('No birth details could be read. Please fill the form by hand — the photo is shown above for reference.', 'பிறப்பு விவரங்கள் எதுவும் படிக்க முடியவில்லை. படிவத்தைக் கையால் நிரப்பவும் — புகைப்படம் மேலே உள்ளது.')}</p>`}
    ${a.low.length ? `<p class="small"><span class="kt-low-key"></span> ${L('Amber = unclear, check carefully', 'மஞ்சள் = தெளிவில்லை, கவனமாகச் சரிபார்க்கவும்')}: <b>${esc(list(a.low))}</b></p>` : ''}
    ${a.flags.filter((f) => f.code !== 'no-date' || !a.filled.length).map((f) => `<p class="small kt-flag">⚠️ ${esc(bi(f))}</p>`).join('')}
    <details class="kt-ocr-text"><summary>${L('Show the text that was read', 'படிக்கப்பட்ட உரையைக் காட்டு')}</summary><pre>${esc(a.text || '')}</pre></details>
    <button type="button" class="link-btn" id="ktAutoClear">${L('Clear the automatic entries', 'தானியங்கி நிரப்பலை நீக்கு')}</button>
  </section>`;
}

function render(sec) {
  if (draft.confirming) { renderConfirm(sec); return; }
  const k = draft.kattam;
  const warn = k.star != null ? kattamWarnings(k) : [];
  const starLord = k.star != null ? NAKSHATRAS[k.star].lord : null;
  const nz = draft.nazhigai;
  sec.innerHTML = `${subHeader(L('From the written jathagam', 'எழுதிய ஜாதகத்திலிருந்து'), L('For families who have the Rasi Kattam but not the birth time', 'ராசி கட்டம் உள்ளது, பிறந்த நேரம் தெரியாதவர்களுக்கு'), 'family')}
    ${importCardHtml()}
    ${autoNoteHtml()}
    <form id="ktForm" class="card glass" novalidate>
      <div class="row2"><label class="${autoCls('name').trim()}">${L('Name', 'பெயர்')}<input name="name" value="${esc(draft.name)}" maxlength="60" required></label>
        <label class="${autoCls('gender').trim()}">${L('Gender', 'பாலினம்')}<select name="gender">${[['male', 'Male', 'ஆண்'], ['female', 'Female', 'பெண்']].map(([v, en, tx]) => `<option value="${v}"${draft.gender === v ? ' selected' : ''}>${L(en, tx)}</option>`).join('')}</select></label></div>
      <label>${L('Relation', 'உறவு')}<select name="relation">${RELATIONS.filter((r) => r.id !== 'organization').map((r) => `<option value="${r.id}"${draft.relation === r.id ? ' selected' : ''}>${esc(bi(r))}</option>`).join('')}</select></label>
      <label class="${autoCls('date').trim()}">${L('Date of birth (from the jathagam)', 'பிறந்த தேதி (ஜாதகத்திலிருந்து)')}<input type="date" name="date" value="${esc(draft.date)}"></label>
      <div class="row2"><label class="${autoCls('date').trim()}">${L('…or type it as written (optional)', '…அல்லது எழுதியபடியே (விருப்பம்)')}<input name="wdate" inputmode="text" placeholder="05/06/1972" maxlength="24" value="${esc(draft.writtenDate || '')}"></label>
        <label class="${autoCls('tamilYear').trim()}">${L('Tamil year in the jathagam (optional)', 'ஜாதகத்தில் தமிழ் ஆண்டு (விருப்பம்)')}<select name="tyear"><option value="">—</option>${TAMIL_YEARS.map((y) => `<option value="${y.index}"${draft.tamilYear === y.index ? ' selected' : ''}>${esc(bi(y))}</option>`).join('')}</select></label></div>
      <label class="${autoCls('time', 'nazhigai').trim()}">${L('Birth time, if written (optional)', 'பிறந்த நேரம், எழுதியிருந்தால் (விருப்பம்)')}<input type="time" name="btime" value="${esc(draft.time || '')}"></label>
      ${nz && !draft.time ? `<p class="small kt-flag">⏳ ${L(`Written as ${nz.nazhigai} nazhigai ${nz.vinadi} vinadi after sunrise — it is converted with the sunrise at the birth place in the next step, for you to confirm.`, `சூரிய உதயத்திலிருந்து ${nz.nazhigai} நாழிகை ${nz.vinadi} விநாடி — அடுத்த படியில் பிறந்த ஊரின் சூரிய உதயத்தைக் கொண்டு மாற்றப்படும்; நீங்கள் உறுதிசெய்ய வேண்டும்.`)}</p>` : ''}
      <label class="place-wrap${autoCls('place')}">${L('Place of birth (optional)', 'பிறந்த இடம் (விருப்பம்)')}<input name="place" value="${esc(draft.place)}" autocomplete="off"><ul id="ktPlaces" class="suggest" hidden></ul></label>
      <div class="row2"><label class="${autoCls('star').trim()}">${L('Birth star (Natchathiram)', 'ஜென்ம நட்சத்திரம்')}<select name="star" required><option value="">—</option>${NAKSHATRAS.map((n, i) => `<option value="${i}"${k.star === i ? ' selected' : ''}>${esc(nakName(i))}</option>`).join('')}</select></label>
        <label class="${autoCls('pada').trim()}">${L('Pada', 'பாதம்')}<select name="pada">${[1, 2, 3, 4].map((p) => `<option${k.pada === p ? ' selected' : ''}>${p}</option>`).join('')}</select></label></div>

      <div class="mini-label">${L('Rasi Kattam — tap each box and choose the planets written in it; mark the box with “ல” as Lagnam', 'ராசி கட்டம் — ஒவ்வொரு கட்டத்தையும் தொட்டு அதில் எழுதிய கிரகங்களைத் தேர்வு செய்யுங்கள்; “ல” உள்ள கட்டத்தை லக்னமாகக் குறியுங்கள்')}</div>
      ${gridHtml()}
      <div id="ktPicker"></div>

      <fieldset class="kt-bal${autoCls('balance')}"><legend>${L('Dasa balance at birth (தசா இருப்பு) — optional, makes dasa dates exact', 'பிறப்பில் தசா இருப்பு — விருப்பம், தசா தேதிகளைத் துல்லியமாக்கும்')}</legend>
        ${starLord ? `<p class="small">${L('Dasa at birth', 'பிறப்பில் தசை')}: <b>${esc(L(starLord, PLANETS[starLord].ta))}</b></p>` : `<p class="small muted">${L('Choose the birth star first.', 'முதலில் நட்சத்திரம் தேர்வு செய்யுங்கள்.')}</p>`}
        <div class="row2"><label>${L('Years', 'ஆண்டு')}<input name="by" inputmode="numeric" maxlength="2" value="${k.balance?.years ?? ''}"></label><label>${L('Months', 'மாதம்')}<input name="bm" inputmode="numeric" maxlength="2" value="${k.balance?.months ?? ''}"></label></div>
      </fieldset>
      ${warn.length ? `<div class="trip-warn">${warn.map((w) => `⚠️ ${esc(bi(w))}`).join('<br>')}</div>` : ''}
      <p class="err" id="ktErr" role="alert"></p>
      <button class="btn-gold">🔎 ${L('Check the details', 'விவரங்களைச் சரிபார்')}</button>
    </form>`;
  wire(sec);
}

function readForm(f) {
  draft.name = f.elements.name.value.trim();
  draft.gender = f.elements.gender.value;
  draft.relation = f.elements.relation.value;
  if (f.elements.date.value !== draft.date) draft.tamilDateRead = draft.tamilDateRead && draft.tamilDateRead.candidates.includes(f.elements.date.value) ? draft.tamilDateRead : (f.elements.date.value ? null : draft.tamilDateRead);
  draft.date = f.elements.date.value;
  const wd = f.elements.wdate.value.trim();
  if (wd !== (draft.writtenDate || '')) draft.dateChoice = null;
  draft.writtenDate = wd;
  draft.tamilYear = f.elements.tyear.value === '' ? null : Number(f.elements.tyear.value);
  const bt = f.elements.btime.value;
  if (bt !== (draft.time || '')) { draft.timeChoice = null; if (bt !== draft.autoTime) draft.timeOptions = null; }
  draft.time = bt;
  const pl = f.elements.place.value.trim();
  if (pl !== draft.place) { draft.placePicked = false; draft.placeChoice = null; draft.lat = null; draft.lon = null; }
  draft.place = pl;
  const st = f.elements.star.value;
  draft.kattam.star = st === '' ? null : Number(st);
  draft.kattam.pada = Number(f.elements.pada.value) || 1;
  const by = f.elements.by.value.trim(), bm = f.elements.bm.value.trim();
  draft.kattam.balance = /^\d{1,2}$/.test(by) || /^\d{1,2}$/.test(bm) ? { years: Number(by) || 0, months: Number(bm) || 0 } : null;
}

/** Read a photo / PDF on the phone, then prefill the form (never the confirmation or the chart). */
async function runImport(sec, file) {
  const f = $('#ktForm');
  if (f) readForm(f);
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '');
  if (!isPdf) { if (photoUrl) URL.revokeObjectURL(photoUrl); photoUrl = URL.createObjectURL(file); }
  const job = { ctrl: new AbortController(), msg: null };
  ocrJob = job;
  render(sec);
  let lastPaint = 0;
  const paint = () => { const box = $('#ktOcr'); if (box && ocrJob === job) { box.innerHTML = ocrStatusHtml(job.msg); $('#ktOcrCancel')?.addEventListener('click', () => job.ctrl.abort()); } };
  try {
    const { readHoroscopeFile } = await import('./ocr-import.js');
    const res = await readHoroscopeFile(file, { signal: job.ctrl.signal, onProgress: (m) => { job.msg = m; const t = Date.now(); if (t - lastPaint > 250 || m.progress === 1) { lastPaint = t; paint(); } } });
    if (ocrJob !== job) return;
    ocrJob = null;
    if (state.view !== 'kattam') return;
    const parsed = parseHoroscopeText(res.text);
    const fresh = f ? draft : blank();
    draft = importToDraft(fresh, parsed, { source: res.source });
    render(sec);
    toast(parsed.found ? L('Read — please check every field', 'படிக்கப்பட்டது — ஒவ்வொரு விவரத்தையும் சரிபார்க்கவும்') : L('Could not read the details — please fill them in', 'விவரங்களைப் படிக்க முடியவில்லை — நிரப்பவும்'));
    $('#ktAutoTitle')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (e) {
    if (ocrJob !== job) return;
    ocrJob = null;
    render(sec);
    if (e?.name !== 'AbortError') {
      console.warn('Horoscope import failed', e);
      toast(L('Automatic reading is not available here — please fill the form by hand.', 'தானியங்கி வாசிப்பு இங்கு இயலவில்லை — படிவத்தைக் கையால் நிரப்பவும்.'));
    }
  }
}

function wire(sec) {
  const f = $('#ktForm');
  for (const id of ['#ktPhoto', '#ktFile']) {
    $(id).addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) runImport(sec, file);
    });
  }
  $('#ktOcrCancel')?.addEventListener('click', () => ocrJob?.ctrl.abort());
  $('#ktAutoClear')?.addEventListener('click', () => { readForm(f); draft = { ...blank(), relation: draft.relation }; render(sec); });
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
  if (!draft.writtenDate && !/^\d{4}-\d{2}-\d{2}$/.test(draft.date) && !draft.tamilDateRead) return err(L('Please enter the date of birth.', 'பிறந்த தேதியை உள்ளிடவும்.'));
  const placed = Object.keys(draft.kattam.planets).length;
  const hasTime = Boolean(draft.time || draft.nazhigai);
  if (placed >= 7 || !hasTime) {
    if (draft.kattam.star == null) return err(L('Please choose the birth star.', 'ஜென்ம நட்சத்திரத்தைத் தேர்வு செய்யவும்.'));
    if (placed < 7) return err(L('Please place at least 7 planets in the boxes (Sun to Saturn, Rahu, Ketu) — or enter the birth time if it is written.', 'குறைந்தது 7 கிரகங்களைக் கட்டங்களில் வையுங்கள் — அல்லது பிறந்த நேரம் எழுதியிருந்தால் அதை உள்ளிடவும்.'));
  } else if (!draft.place) return err(L('To calculate from the birth time, the birth place is needed.', 'பிறந்த நேரத்திலிருந்து கணிக்க, பிறந்த இடம் தேவை.'));
  draft.confirming = true;
  draft.confirmed = false;
  render(sec);
}

function renderConfirm(sec) {
  sec.innerHTML = `${subHeader(L('From the written jathagam', 'எழுதிய ஜாதகத்திலிருந்து'), L('Confirm the details', 'விவரங்களை உறுதிசெய்யவும்'), 'family')}${confirmHtml()}`;
  $$('input[name="ktDate"]', sec).forEach((x) => x.addEventListener('change', () => { draft.dateChoice = x.value; renderConfirm(sec); }));
  $$('input[name="ktPlace"]', sec).forEach((x) => x.addEventListener('change', () => { draft.placeChoice = Number(x.value); renderConfirm(sec); }));
  $$('input[name="ktTime"]', sec).forEach((x) => x.addEventListener('change', () => { draft.timeChoice = x.value; renderConfirm(sec); }));
  $('#ktNz')?.addEventListener('change', (e) => { draft.nazhigaiAccept = e.target.checked; renderConfirm(sec); });
  $('#ktBack').addEventListener('click', () => { draft.confirming = false; draft.confirmed = false; render(sec); });
  $('#ktConfirmBtn').addEventListener('click', () => {
    const r = reviewOf();
    const err = (msg) => { $('#ktConfErr').textContent = msg; };
    if (!r.date) return err(L('Please choose the date of birth.', 'பிறந்த தேதியைத் தேர்வு செய்யவும்.'));
    if (r.timeAmbiguous && !r.time) return err(L('Please choose the birth time (morning or evening).', 'பிறந்த நேரத்தைத் தேர்வு செய்யவும் (காலை / மாலை).'));
    if (r.mode === 'time') {
      if (!r.where) return err(L('Please choose the birth place — it is needed to calculate from the birth time.', 'பிறந்த இடத்தைத் தேர்வு செய்யவும் — நேரத்திலிருந்து கணிக்க இது தேவை.'));
      if (!r.time) return err(r.timeVia === 'nazhigai' ? L('Please confirm the converted birth time (tick the box), or go back and type the time.', 'மாற்றிய பிறந்த நேரத்தை உறுதிசெய்யவும் (பெட்டியைத் தேர்வு செய்யவும்), அல்லது திருத்தி நேரத்தை உள்ளிடவும்.') : L('Please enter the birth time.', 'பிறந்த நேரத்தை உள்ளிடவும்.'));
    }
    if (r.tamil && !r.tamil.ok && !draft.tamilAck) { draft.tamilAck = true; return err(L('The Tamil year does not match this date. Tap Confirm again to keep the date as it is, or Edit to correct it.', 'தமிழ் ஆண்டு இந்தத் தேதியுடன் பொருந்தவில்லை. தேதியை அப்படியே வைக்க மீண்டும் உறுதிசெய்யவும்; திருத்த “திருத்து”.')); }
    if (r.place.status === 'choose') {
      const p = r.place.options[draft.placeChoice];
      if (!p) return err(L('Please choose the birth place.', 'பிறந்த இடத்தைத் தேர்வு செய்யவும்.'));
      Object.assign(draft, { place: placeLabel(p), lat: p.lat, lon: p.lon, tz: p.tz, zone: p.zone, placePicked: true });
    } else if (r.place.status === 'matched') {
      const p = r.place.options[0];
      Object.assign(draft, { place: placeLabel(p), lat: p.lat, lon: p.lon, tz: p.tz, zone: p.zone, placePicked: true });
    }
    // Nazhigai after midnight belongs to the next calendar day.
    draft.date = r.timeVia === 'nazhigai' && r.time && r.conv?.nextDay ? r.conv.date : r.date;
    draft.confirmedTime = r.time ? { time: r.time, via: r.timeVia } : null;
    draft.chartMode = r.mode;
    draft.confirmed = true; // the only place this is set — the family pressed Confirm
    save();
  });
}

/** Step 2 (after confirmation): store the profile and open the chart. */
function save() {
  if (!mayCalculate(draft)) return;
  const t = draft.confirmedTime;
  const base = {
    id: draft.id || Math.random().toString(36).slice(2, 10), name: draft.name, gender: draft.gender, relation: draft.relation, date: draft.date,
    place: draft.place || state.loc?.name || '', lat: draft.lat ?? state.loc?.lat ?? 13.08, lon: draft.lon ?? state.loc?.lon ?? 80.27, tz: draft.tz ?? state.loc?.tz ?? 5.5, zone: draft.zone || undefined,
    writtenDate: draft.writtenDate || undefined, tamilYear: draft.tamilYear ?? undefined,
  };
  const m = draft.chartMode === 'time' && t
    // Birth time read from the jathagam and confirmed: a normal calculated chart. Nazhigai conversions stay approximate.
    ? { ...base, time: `${t.time}:00`, timeCertainty: t.via === 'nazhigai' ? 'approx' : 'exact', ...(t.via === 'nazhigai' ? { timeWindowMin: 15 } : {}), kattam: undefined, writtenStar: draft.kattam.star ?? undefined }
    : { ...base, time: '12:00:00', timeCertainty: 'unknown', kattam: JSON.parse(JSON.stringify(draft.kattam)), writtenTime: t?.time };
  const i = state.family.findIndex((x) => x.id === m.id);
  if (i >= 0) state.family[i] = { ...state.family[i], ...m }; else state.family.push(m);
  if (!m.kattam) delete state.family[i >= 0 ? i : state.family.length - 1].kattam;
  state.activeId = m.id;
  saveFamily();
  toast(L('Saved — reading the jathagam', 'சேமிக்கப்பட்டது — ஜாதகம் பார்க்கிறது'));
  draft = null;
  go('chart', {});
}

/**
 * Open the import straight away (e.g. from an "Import horoscope" button on the family form). Call it from the click
 * handler: the screen renders synchronously, so the file chooser still counts as opened by the tap.
 */
export function startHoroscopeImport() {
  go('kattam', { import: 1 });
}

function renderKattam(sec, params = {}) {
  if (params.edit) {
    const m = state.family.find((x) => x.id === params.edit);
    if (m?.kattam) draft = { ...blank(), ...JSON.parse(JSON.stringify(m)), placePicked: m.lat != null, confirming: false, confirmed: false };
  }
  if (params.import && !ocrJob) draft = blank();
  if (!draft) draft = blank();
  render(sec);
  if (params.import && !ocrJob) { state.params = {}; $('#ktFile')?.click(); }
}

registerScreen('kattam', { render: renderKattam, parent: 'familyhub' });
