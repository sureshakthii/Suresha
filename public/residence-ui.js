// Residence & travelling place — the first-run question, the "are you in Dubai now?" prompt and the
// Location section of Settings. Birth places stay with each family member and are never changed here.
import {
  state, $, L, esc, bi, store, toast, go, setResidence, setTravel, clearTravel, zoneText, placeName, fmtIsoDate, untilL,
} from './core.js';
import { placeSearch } from './account.js';
import { devicePlace, nearestPlace, placeText } from './shared/places.js';
import { isValidZone } from './shared/datetime.js';
import { locFromPlace, zoneLabel, zoneMismatch, deviceZone, isoPlusDays, locName } from './shared/residence.js';

/** Tamil locative: துபாய் → துபாயில், சென்னை → சென்னையில், கனடா → கனடாவில், பெங்களூரு → பெங்களூரில். */
export function inPlaceTa(name) {
  const w = String(name || '').trim();
  if (!w) return '';
  if (!/[஀-௿]$/.test(w)) return `${w}-ல்`;
  if (w.endsWith('்')) return `${w.slice(0, -1)}ில்`;
  if (w.endsWith('ு')) return `${w.slice(0, -1)}ில்`;
  if (/[ைிீெே]$/.test(w)) return `${w}யில்`;
  if (/[ாோொூ]$/.test(w)) return `${w}வில்`;
  return `${w}வில்`;
}

/** Current GPS position → a place with its IANA zone (nearest built-in town). */
export function gpsPlace() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('unsupported')); return; }
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude: lat, longitude: lon } = pos.coords;
      const near = nearestPlace(lat, lon, { maxKm: 150 });
      const dz = deviceZone();
      const zone = near?.zone || (isValidZone(dz) ? dz : undefined);
      resolve({ lat, lon, zone, cc: near?.cc, name: near?.name || L('Current location', 'தற்போதைய இருப்பிடம்'), text: near ? placeText(near) : L('Current location', 'தற்போதைய இருப்பிடம்') });
    }, (e) => reject(e), { timeout: 10000, maximumAge: 600000 });
  });
}

// After the place changes, re-draw the CURRENT screen with the new timings (never navigate elsewhere).
const redraw = () => go(state.view, state.params, { back: true });
const closeModal = (box) => { box.remove(); document.body.classList.remove('modal-open'); };
/** Overlay with a ✕, backdrop tap and Escape to dismiss (onDismiss); removed completely so nothing blocks taps after. */
function openModal(html, cls = '', onDismiss = null) {
  document.querySelector('.res-modal')?.remove();
  const box = document.createElement('div');
  box.className = `modal res-modal ${cls}`;
  box.innerHTML = html;
  box.querySelector('.res-card')?.insertAdjacentHTML('afterbegin', `<button type="button" class="res-x" aria-label="${esc(L('Close', 'மூடு'))}">✕</button>`);
  document.body.append(box);
  document.body.classList.add('modal-open');
  const dismiss = () => { document.removeEventListener('keydown', onKey); closeModal(box); onDismiss?.(); };
  const onKey = (e) => { if (e.key === 'Escape' && box.isConnected) dismiss(); };
  document.addEventListener('keydown', onKey);
  box.addEventListener('click', (e) => { if (e.target === box || e.target.closest('.res-x')) dismiss(); });
  return box;
}
const placeCard = (p) => {
  const loc = locFromPlace(p);
  return `<div class="res-pick" aria-live="polite"><span class="res-pin">📍</span><div><b>${esc(placeName(loc.name))}</b><span class="small">🕒 ${esc(bi(zoneLabel(loc)))}</span></div></div>`;
};

/**
 * One friendly step: "Where do you live now?" — preselected from the phone's time zone, GPS, or worldwide search.
 * Saved as the residence (confirmed); never touches anyone's birth place.
 */
export function residenceStep({ first = false, onDone } = {}) {
  let pick = state.residence && state.residence.confirmed !== false ? state.residence : { ...devicePlace(deviceZone() || undefined) };
  if (pick && !pick.text && pick.cc && !String(pick.name).includes(',')) pick = { ...pick, text: placeText(pick) };
  const box = openModal(`<div class="modal-card res-card" role="dialog" aria-modal="true" aria-labelledby="resTitle">
    <div class="res-icon" aria-hidden="true">🏠</div>
    <h2 id="resTitle">${L('Where do you live now?', 'நீங்கள் இப்போது எங்கே வசிக்கிறீர்கள்?')}</h2>
    <p class="small">${L('Today’s timings — sunrise, Rahu Kalam, Nalla Neram, Horai, Prasnam and reminders — are worked out for this place and shown in its local time.', 'இன்றைய நேரங்கள் — சூரிய உதயம், ராகு காலம், நல்ல நேரம், ஓரை, பிரசன்னம், நினைவூட்டல்கள் — இந்த இடத்திற்குக் கணக்கிடப்பட்டு அதன் உள்ளூர் நேரத்தில் காட்டப்படும்.')}</p>
    <div id="resPick">${placeCard(pick)}</div>
    ${first ? `<p class="small muted res-hint">${L('Suggested from your phone’s time zone', 'உங்கள் கைப்பேசியின் நேர மண்டலத்திலிருந்து பரிந்துரை')}</p>` : ''}
    <button type="button" class="btn-gold" id="resSave">✓ ${L('Yes, I live here', 'ஆம், இங்கே வசிக்கிறேன்')}</button>
    <button type="button" class="chip-btn res-gps" id="resGps">📡 ${L('Use my location (GPS)', 'என் இருப்பிடத்தைப் பயன்படுத்து (GPS)')}</button>
    <label class="place-wrap res-search">${L('Or search your city — anywhere in the world', 'அல்லது உங்கள் நகரத்தைத் தேடுங்கள் — உலகின் எந்த இடமும்')}
      <input id="resSearch" autocomplete="off" placeholder="${esc(L('e.g. Dubai, Toronto, Chennai…', 'எ.கா. துபாய், டொராண்டோ, சென்னை…'))}"><ul id="resList" class="suggest" hidden></ul></label>
    <p class="small muted">${L('Your birth place is asked separately for each family member — it is used only for the horoscope.', 'பிறந்த இடம் ஒவ்வொரு குடும்ப உறுப்பினருக்கும் தனியாகக் கேட்கப்படும் — அது ஜாதகத்திற்கு மட்டுமே.')}</p>
    ${first ? `<button type="button" class="link-btn" id="resLater">${L('Decide later', 'பிறகு முடிவு செய்கிறேன்')}</button>` : `<button type="button" class="link-btn" id="resLater">${L('Cancel', 'ரத்து')}</button>`}
  </div>`, 'res-first', () => { if (first) store.set('kj_res_later', Date.now()); onDone?.(); });
  const show = (p) => { pick = p; $('#resPick', box).innerHTML = placeCard(p); const h = $('.res-hint', box); if (h) h.hidden = true; $('#resSave', box).textContent = `✓ ${L('Save as my home', 'என் வசிப்பிடமாகச் சேமி')}`; };
  placeSearch($('#resSearch', box), $('#resList', box), (p) => { show(p); $('#resSearch', box).value = ''; });
  $('#resGps', box).addEventListener('click', async () => {
    const b = $('#resGps', box); b.disabled = true; b.textContent = `📡 ${L('Finding you…', 'இருப்பிடம் தேடுகிறது…')}`;
    try { show(await gpsPlace()); } catch { toast(L('Location unavailable — please search your city', 'இருப்பிடம் கிடைக்கவில்லை — நகரத்தைத் தேடுங்கள்'), 4000); }
    b.disabled = false; b.textContent = `📡 ${L('Use my location (GPS)', 'என் இருப்பிடத்தைப் பயன்படுத்து (GPS)')}`;
  });
  $('#resSave', box).addEventListener('click', () => {
    setResidence(pick);
    try { store.set('kj_zone_asked', deviceZone()); } catch { /* ignore */ }
    closeModal(box);
    toast(`🏠 ${placeName(state.loc.name)} · ${zoneText()}`, 4000);
    onDone?.(); redraw();
  });
  $('#resLater', box).addEventListener('click', () => { if (first) store.set('kj_res_later', Date.now()); closeModal(box); onDone?.(); });
}

/**
 * Existing users: the phone's clock zone differs from where the timings are calculated (e.g. just landed in Dubai).
 * Asked once per phone zone. Options: I live here now · I'm visiting (till a date) · keep the saved place.
 */
export function zonePrompt({ force = false } = {}) {
  const dz = deviceZone();
  if (!dz || !state.loc || !zoneMismatch(state.loc, dz)) return false;
  if (!force && store.get('kj_zone_asked', null) === dz) return false;
  // Only ask when we know a city on the phone's clock (not 'UTC' / 'Etc/…' or an unlisted zone).
  if (/^(UTC|GMT|Etc\/)/.test(dz) || devicePlace(dz).zone !== dz) return false;
  store.set('kj_zone_asked', dz); // shown once per phone zone, even if the app is closed without answering
  // Travelling, but the phone is back on the home clock: offer to end the travelling place early.
  if (state.travel && state.residence && !zoneMismatch(state.residence, dz)) {
    const home = locName(state.residence);
    const box = openModal(`<div class="modal-card res-card" role="dialog" aria-modal="true" aria-labelledby="zpTitle">
      <div class="res-icon" aria-hidden="true">🏠</div>
      <h2 id="zpTitle">${L(`Back home in ${home.en}? Switch the timings back?`, `${inPlaceTa(home.ta)} வீடு திரும்பினீர்களா? நேரங்களை மீண்டும் மாற்றவா?`)}</h2>
      <button type="button" class="btn-gold" id="zpHome">🏠 ${L('Yes, I am back home', 'ஆம், வீடு திரும்பினேன்')}</button>
      <button type="button" class="link-btn" id="zpKeep">${L(`No, keep ${placeName(state.loc.name)} until ${fmtIsoDate(state.travel.until)}`, `வேண்டாம், ${fmtIsoDate(state.travel.until)} வரை ${placeName(state.loc.name)}`)}</button></div>`);
    const end = (msg) => { closeModal(box); if (msg) { toast(msg, 4000); redraw(); } };
    $('#zpHome', box).addEventListener('click', () => { clearTravel(); end(`🏠 ${placeName(state.loc.name)} · ${zoneText()}`); });
    $('#zpKeep', box).addEventListener('click', () => end(''));
    return true;
  }
  const here = devicePlace(dz);
  const hereLoc = locFromPlace(here);
  const nm = locName(hereLoc);
  const until = isoPlusDays(dz, 14);
  const box = openModal(`<div class="modal-card res-card" role="dialog" aria-modal="true" aria-labelledby="zpTitle">
    <div class="res-icon" aria-hidden="true">🌍</div>
    <h2 id="zpTitle">${L(`Are you in ${nm.en} now? Change the timings?`, `நீங்கள் இப்போது ${inPlaceTa(nm.ta)} இருக்கிறீர்களா? நேரங்களை மாற்றவா?`)}</h2>
    <p class="small">${L(`Your phone shows ${bi(zoneLabel(hereLoc))}, but today’s timings are for ${placeName(state.loc.name)} (${zoneText()}).`, `உங்கள் கைப்பேசி ${bi(zoneLabel(hereLoc))} காட்டுகிறது; இன்றைய நேரங்கள் ${placeName(state.loc.name)} (${zoneText()}) இடத்திற்கானவை.`)}</p>
    <button type="button" class="btn-gold" id="zpLive">🏠 ${L(`I live in ${nm.en} now`, `நான் இப்போது ${inPlaceTa(nm.ta)} வசிக்கிறேன்`)}</button>
    <div class="res-visit"><label for="zpUntil">✈️ ${L('Just visiting? Use this place until', 'பயணம் மட்டுமா? இந்தத் தேதி வரை இந்த இடம்')}</label><input type="date" id="zpUntil" value="${until}">
      <button type="button" class="chip-btn" id="zpVisit">✈️ ${L('Visiting — switch until this date', 'பயணம் — இந்தத் தேதி வரை மாற்று')}</button></div>
    <button type="button" class="chip-btn" id="zpOther">🔍 ${L('Another place…', 'வேறு இடம்…')}</button>
    <button type="button" class="link-btn" id="zpKeep">${L(`No, keep ${placeName(state.loc.name)}`, `வேண்டாம், ${placeName(state.loc.name)} தொடரட்டும்`)}</button>
  </div>`);
  const done = (msg) => { closeModal(box); if (msg) { toast(msg, 4000); redraw(); } };
  $('#zpLive', box).addEventListener('click', () => { setResidence(here); done(`🏠 ${placeName(state.loc.name)} · ${zoneText()}`); });
  $('#zpVisit', box).addEventListener('click', () => { const u = $('#zpUntil', box).value || until; setTravel(here, u); done(`✈️ ${placeName(state.loc.name)} · ${untilL(fmtIsoDate(u))}`); });
  $('#zpOther', box).addEventListener('click', () => { closeModal(box); residenceStep({}); });
  $('#zpKeep', box).addEventListener('click', () => done(''));
  return true;
}

// ---------------------------------------------------------------- Settings → Location
/** The LOCATION part of Settings: residence, temporary travelling place, and a note about birth places. */
export function locationSettingsHtml() {
  const r = state.residence, t = state.travel;
  return `<div class="set-row col loc-set" id="locSettings">
    <div class="loc-block"><div class="mini-label">🏠 ${L('Where I live now (residence)', 'நான் இப்போது வசிக்கும் இடம்')}</div>
      <b>${esc(placeName(r?.name) || '—')}</b>${r ? `<span class="small muted">🕒 ${esc(bi(zoneLabel(r)))}</span>` : ''}
      <label class="place-wrap"><input id="locSearch" placeholder="${esc(L('Change — search a city…', 'மாற்ற — நகரத்தைத் தேடுக…'))}" autocomplete="off"><ul id="locList" class="suggest" hidden></ul></label>
      <button type="button" class="link-btn" id="geoBtn">📡 ${L('Use my current location (GPS)', 'என் தற்போதைய இருப்பிடம் (GPS)')}</button></div>
    <div class="loc-block"><div class="mini-label">✈️ ${L('Temporary / travelling location', 'தற்காலிக / பயண இடம்')}</div>
      ${t ? `<b>${esc(placeName(t.name))}</b><span class="small">${esc(untilL(fmtIsoDate(t.until)))} · 🕒 ${esc(bi(zoneLabel(t)))}</span>
        <span class="small muted">${L('Daily timings use this place now and return to your home place after this date.', 'தினசரி நேரங்கள் இப்போது இந்த இடத்திற்கு; இந்தத் தேதிக்குப் பின் உங்கள் வசிப்பிடத்திற்குத் திரும்பும்.')}</span>
        <button type="button" class="chip-btn" id="travelEnd">🏠 ${L('I am back home — end now', 'வீடு திரும்பினேன் — இப்போதே முடி')}</button>`
    : `<span class="small muted">${L('Visiting India or another city for a while? Daily timings switch to that place until the date you choose, then switch back.', 'சில நாட்கள் இந்தியா அல்லது வேறு ஊருக்குச் செல்கிறீர்களா? நீங்கள் தேர்வு செய்யும் தேதி வரை தினசரி நேரங்கள் அந்த இடத்திற்கு மாறி, பின் திரும்பும்.')}</span>
        <label class="place-wrap"><input id="travelSearch" placeholder="${esc(L('Travelling to — search a city…', 'செல்லும் இடம் — நகரத்தைத் தேடுக…'))}" autocomplete="off"><ul id="travelList" class="suggest" hidden></ul></label>
        <div class="travel-pick" id="travelPick" hidden></div>
        <label class="travel-until">${L('Until (inclusive)', 'இந்தத் தேதி வரை')}<input type="date" id="travelUntil" value="${isoPlusDays(r?.zone, 14)}"></label>
        <button type="button" class="chip-btn" id="travelSave" disabled>✈️ ${L('Use this place until the date', 'தேதி வரை இந்த இடத்தைப் பயன்படுத்து')}</button>`}
    </div>
    <p class="small muted">👶 ${L('Birth places are kept separately for each family member and are used only for their horoscope.', 'பிறந்த இடங்கள் ஒவ்வொரு குடும்ப உறுப்பினருக்கும் தனியாக — ஜாதகத்திற்கு மட்டும்.')}</p>
  </div>`;
}

export function bindLocationSettings(sec, rerender) {
  const res = $('#locSearch', sec);
  if (res) placeSearch(res, $('#locList', sec), (p) => { setResidence(p); toast(`🏠 ${placeName(state.residence.name)}`); rerender(); });
  $('#geoBtn', sec)?.addEventListener('click', async () => {
    try { const p = await gpsPlace(); setResidence(p); toast(`🏠 ${placeName(state.residence.name)}`); rerender(); } catch { toast(L('Location unavailable', 'இருப்பிடம் கிடைக்கவில்லை')); }
  });
  $('#travelEnd', sec)?.addEventListener('click', () => { clearTravel(); toast(L('Timings are back to your home place', 'நேரங்கள் மீண்டும் உங்கள் வசிப்பிடத்திற்கு')); rerender(); });
  let tp = null;
  const ts = $('#travelSearch', sec);
  if (ts) {
    placeSearch(ts, $('#travelList', sec), (p) => {
      tp = p; ts.value = '';
      const box = $('#travelPick', sec); box.hidden = false;
      box.innerHTML = `📍 <b>${esc(placeName(p.text || p.name))}</b> <span class="small muted">· ${esc(bi(zoneLabel(locFromPlace(p))))}</span>`;
      $('#travelSave', sec).disabled = false;
    });
    $('#travelSave', sec).addEventListener('click', () => {
      const u = $('#travelUntil', sec).value;
      if (!tp || !u) return;
      setTravel(tp, u);
      toast(`✈️ ${placeName(state.loc.name)} · ${untilL(fmtIsoDate(u))}`, 4000);
      rerender();
    });
  }
}

