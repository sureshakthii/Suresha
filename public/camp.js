// Camp mode (துணை முகாம்): Thunai on shared computers at a camp or stall. Open the app with ?camp=1 once (the laptop
// package's "Start Thunai Camp" does this); it stays on until ?camp=0.
//   • A bar on every screen: ⭐ Give feedback · ↻ Next person.
//   • Next person clears everything the visitor entered (profiles, chat, plans, reminders) — reviews stay.
//   • After 6 idle minutes with a visitor's details on screen, it asks "Still there?" and clears after 30 seconds.
//   • Reviews are saved on this computer only; the organiser (PIN) sees the count and average and downloads a CSV.
import { state, L, esc, store, registerScreen, subHeader, go, toast, copyright } from './core.js';

const KEY = 'kj_camp';
// Kept when the next person starts: the camp itself, the place / language / display set by the organiser, and
// one-time notices (so each visitor does not get the same first-run prompts).
const KEEP = new Set([KEY, 'kj_loc', 'kj_lang', 'kj_settings', 'kj_consent', 'kj_first_open', 'kj_skip_login', 'kj_zone_asked', 'kj_res_later', 'kj_seen_build', 'kj_device']);
const IDLE_MS = 6 * 60000, WARN_MS = 30000;

const camp = () => store.get(KEY, null);
const save = (c) => store.set(KEY, c);
export const isCamp = () => Boolean(camp()?.on);

/** Turn camp mode on / off from the URL (?camp=1 / ?camp=0). Returns true when camp mode is on. */
export function campFromUrl(loc = location) {
  const q = new URLSearchParams(loc.search || '');
  if (q.get('camp') === '1' && !isCamp()) save({ on: true, station: '', pin: '', visitors: 0, reviews: [], startedAt: new Date().toISOString(), ...(camp() || {}), on: true });
  if (q.get('camp') === '0' && camp()) save({ ...camp(), on: false });
  return isCamp();
}

/** Clear the visitor's data (everything except KEEP) and start fresh for the next person. */
export function nextPerson({ auto = false } = {}) {
  const c = camp();
  if (!c) return;
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith('kj_') && !KEEP.has(k)) localStorage.removeItem(k);
    sessionStorage.clear();
  } catch { /* storage blocked */ }
  save({ ...c, visitors: (c.visitors || 0) + 1, lastReset: new Date().toISOString(), autoResets: (c.autoResets || 0) + (auto ? 1 : 0) });
  location.replace(`${location.pathname}?camp=1`);
}

const hasVisitorData = () => (state.family || []).length > 0 || Boolean(store.get('kj_chat', null));

// ---------------------------------------------------------------- the bar and the idle check
function bar() {
  if (document.getElementById('campBar')) return;
  const el = document.createElement('div');
  el.id = 'campBar';
  el.setAttribute('role', 'region');
  el.setAttribute('aria-label', L('Thunai camp', 'துணை முகாம்'));
  document.body.append(el);
  document.body.classList.add('camp-on');
  const draw = () => {
    el.innerHTML = `<span class="cb-name">🏕️ ${L('Thunai Camp', 'துணை முகாம்')}${camp()?.station ? ` · ${esc(camp().station)}` : ''}</span>
      <button type="button" class="cb-btn gold" data-camp="review">⭐ ${L('Feedback', 'கருத்து')}</button>
      <button type="button" class="cb-btn" data-camp="next">↻ ${L('Next person', 'அடுத்தவர்')}</button>
      <button type="button" class="cb-gear" data-camp="admin" aria-label="${esc(L('Organiser', 'ஏற்பாட்டாளர்'))}">⚙</button>`;
  };
  draw();
  document.addEventListener('kj:lang', draw);
  el.addEventListener('click', (e) => {
    const a = e.target.closest('[data-camp]')?.dataset.camp;
    if (a === 'review') go('campreview');
    else if (a === 'admin') go('campadmin');
    else if (a === 'next' && (!hasVisitorData() || confirm(L('Clear this person’s details and start for the next person?', 'இவரின் விவரங்களை அழித்து அடுத்தவருக்குத் தொடங்கவா?')))) nextPerson();
  });
}

function idleWatch() {
  let last = Date.now(), warn = null;
  const touch = () => { last = Date.now(); if (warn) { warn.remove(); warn = null; } };
  ['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach((ev) => window.addEventListener(ev, touch, { passive: true }));
  setInterval(() => {
    if (warn || !hasVisitorData() || Date.now() - last < IDLE_MS) return;
    warn = document.createElement('div');
    warn.className = 'camp-idle';
    warn.setAttribute('role', 'alertdialog');
    let left = WARN_MS / 1000;
    const draw = () => { warn.innerHTML = `<div class="ci-box"><b>${L('Are you still there?', 'இன்னும் இருக்கிறீர்களா?')}</b><p>${L(`For privacy, these details will be cleared in ${left} seconds.`, `தனியுரிமைக்காக, இந்த விவரங்கள் ${left} விநாடிகளில் அழிக்கப்படும்.`)}</p><button type="button" class="btn-gold">${L('Yes, I am here', 'ஆம், இருக்கிறேன்')}</button></div>`; warn.querySelector('button').addEventListener('click', touch); };
    draw();
    document.body.append(warn);
    const t = setInterval(() => { if (!warn) { clearInterval(t); return; } left -= 1; if (left <= 0) { clearInterval(t); nextPerson({ auto: true }); } else draw(); }, 1000);
  }, 5000);
}

/** Start camp mode (called by app.js after the first screen is drawn). */
export function startCamp() {
  if (!isCamp()) return false;
  bar();
  idleWatch();
  if (!(state.family || []).length) go('campwelcome');
  return true;
}

// ---------------------------------------------------------------- screens
function renderWelcome(sec) {
  sec.innerHTML = `<section class="card glass camp-hero">
      <div class="camp-logo" aria-hidden="true">🪔</div>
      <h2>${L('Welcome to Thunai', 'துணைக்கு வரவேற்கிறோம்')}</h2>
      <p>${L('Your companion on life’s path — your jathagam, today’s good times, your Life Guide and Ask Thunai, in Tamil and English.', 'உங்கள் வாழ்வின் வழித்துணை — உங்கள் ஜாதகம், இன்றைய நல்ல நேரம், வாழ்க்கை வழிகாட்டி, துணையிடம் கேளுங்கள் — தமிழிலும் ஆங்கிலத்திலும்.')}</p>
      <div class="camp-steps"><div><b>1</b>${L('Enter your birth details', 'பிறப்பு விவரங்களை உள்ளிடுங்கள்')}</div><div><b>2</b>${L('Read your reading and Life Guide', 'உங்கள் பலனையும் வாழ்க்கை வழிகாட்டியையும் படியுங்கள்')}</div><div><b>3</b>${L('Tell us what you think', 'உங்கள் கருத்தைச் சொல்லுங்கள்')}</div></div>
      <div class="btn-row center"><button type="button" class="chip-btn" data-cl="ta">தமிழ்</button><button type="button" class="chip-btn" data-cl="en">English</button></div>
      <button type="button" class="btn-gold camp-start" data-go="family" data-param='{"add":true}'>${L('Start — enter my birth details', 'தொடங்குங்கள் — என் பிறப்பு விவரங்கள்')} ›</button>
      <p class="small muted">${L('Your details stay on this computer only while you use it, and are cleared when you press “Next person”.', 'உங்கள் விவரங்கள் நீங்கள் பயன்படுத்தும் வரை இந்தக் கணினியில் மட்டும் இருக்கும்; “அடுத்தவர்” அழுத்தியதும் அழிக்கப்படும்.')}</p>
    </section>${copyright()}`;
  sec.querySelectorAll('[data-cl]').forEach((b) => b.addEventListener('click', () => { state.lang = b.dataset.cl; store.set('kj_lang', state.lang); document.dispatchEvent(new Event('kj:lang')); }));
}

const LIKED = [
  ['panchangam', 'Panchangam & good times', 'பஞ்சாங்கம் & நல்ல நேரம்'], ['chart', 'My jathagam', 'என் ஜாதகம்'], ['lifeguide', 'Life Guide', 'வாழ்க்கை வழிகாட்டி'],
  ['ask', 'Ask Thunai', 'துணையிடம் கேளுங்கள்'], ['porutham', 'Marriage matching', 'திருமணப் பொருத்தம்'], ['temples', 'Temples & yatra', 'கோவில்கள் & யாத்திரை'],
  ['festivals', 'Festivals & vratham', 'பண்டிகை & விரதம்'], ['tamil', 'Tamil language', 'தமிழ் மொழி'], ['design', 'Look & ease of use', 'தோற்றம் & எளிமை'],
];
const CHOICE = {
  use: [['yes', 'Yes, daily', 'ஆம், தினமும்'], ['sometimes', 'Sometimes', 'அவ்வப்போது'], ['no', 'Not now', 'இப்போது இல்லை']],
  pay: [['yes', 'Yes, for detailed reports', 'ஆம், விரிவான அறிக்கைக்கு'], ['maybe', 'Maybe', 'பார்க்கலாம்'], ['free', 'Only the free part', 'இலவசப் பகுதி மட்டும்']],
  age: [['u25', 'Under 25', '25-க்குக் கீழ்'], ['25_40', '25–40', '25–40'], ['40_60', '40–60', '40–60'], ['60p', 'Over 60', '60-க்கு மேல்']],
};
const pick = (name, rows, multi = false) => `<div class="cr-chips" role="group">${rows.map(([id, en, ta]) => `<label class="cr-chip"><input type="${multi ? 'checkbox' : 'radio'}" name="${name}" value="${id}"><span>${L(en, ta)}</span></label>`).join('')}</div>`;

function renderReview(sec) {
  sec.innerHTML = `${subHeader(L('Your feedback', 'உங்கள் கருத்து'), L('Two minutes — it helps us make Thunai better for everyone', 'இரண்டு நிமிடம் — துணையை அனைவருக்கும் மேம்படுத்த உதவும்'))}
    <form class="card glass camp-review" id="campForm" novalidate>
      <fieldset><legend>${L('How much did you like Thunai?', 'துணை உங்களுக்கு எவ்வளவு பிடித்தது?')}</legend>
        <div class="cr-stars" role="radiogroup">${[5, 4, 3, 2, 1].map((n) => `<label class="cr-star"><input type="radio" name="rating" value="${n}" required><span aria-label="${n}">★</span></label>`).join('')}</div></fieldset>
      <fieldset><legend>${L('What did you like? (choose any)', 'எது பிடித்தது? (எத்தனையும்)')}</legend>${pick('liked', LIKED, true)}</fieldset>
      <fieldset><legend>${L('Would you use Thunai?', 'துணையைப் பயன்படுத்துவீர்களா?')}</legend>${pick('use', CHOICE.use)}</fieldset>
      <fieldset><legend>${L('Would you pay for detailed reports?', 'விரிவான அறிக்கைக்குக் கட்டணம் செலுத்துவீர்களா?')}</legend>${pick('pay', CHOICE.pay)}</fieldset>
      <fieldset><legend>${L('Your age group', 'உங்கள் வயதுப் பிரிவு')}</legend>${pick('age', CHOICE.age)}</fieldset>
      <label>${L('What should we improve?', 'எதை மேம்படுத்த வேண்டும்?')}<textarea name="improve" rows="3" maxlength="600"></textarea></label>
      <label>${L('Your town (optional)', 'உங்கள் ஊர் (விருப்பம்)')}<input name="city" maxlength="60" autocomplete="off"></label>
      <div class="grid2"><label>${L('Name (optional)', 'பெயர் (விருப்பம்)')}<input name="name" maxlength="60" autocomplete="off"></label>
        <label>${L('Phone (optional)', 'தொலைபேசி (விருப்பம்)')}<input name="phone" maxlength="20" inputmode="tel" autocomplete="off"></label></div>
      <label class="check"><input type="checkbox" name="contact"> ${L('AG Technology Solutions may contact me about Thunai.', 'துணை பற்றி AG Technology Solutions என்னைத் தொடர்பு கொள்ளலாம்.')}</label>
      <p id="crErr" class="err" hidden></p>
      <button type="submit" class="btn-gold">${L('Submit feedback', 'கருத்தைச் சமர்ப்பிக்கவும்')}</button>
    </form>${copyright()}`;
  const f = sec.querySelector('#campForm');
  f.addEventListener('submit', (e) => {
    e.preventDefault();
    const d = new FormData(f);
    const rating = Number(d.get('rating'));
    if (!rating) { const er = sec.querySelector('#crErr'); er.hidden = false; er.textContent = L('Please choose 1 to 5 stars.', 'தயவுசெய்து 1 முதல் 5 நட்சத்திரம் தேர்ந்தெடுங்கள்.'); return; }
    const phone = String(d.get('phone') || '').trim(), name = String(d.get('name') || '').trim();
    const contact = d.get('contact') === 'on';
    const c = camp() || { on: true, reviews: [] };
    c.reviews = [...(c.reviews || []), {
      at: new Date().toISOString(), station: c.station || '', lang: state.lang, rating,
      liked: d.getAll('liked'), use: d.get('use') || '', pay: d.get('pay') || '', age: d.get('age') || '',
      improve: String(d.get('improve') || '').trim(), city: String(d.get('city') || '').trim(),
      // Name and phone are kept only with the visitor's consent to be contacted.
      name: contact ? name : '', phone: contact ? phone : '', contact,
    }];
    save(c);
    sec.innerHTML = `<section class="card glass camp-hero"><div class="camp-logo">🙏</div><h2>${L('Thank you!', 'நன்றி!')}</h2>
      <p>${L('Your feedback is saved. Thunai is presented by AG Technology Solutions.', 'உங்கள் கருத்து சேமிக்கப்பட்டது. துணை — AG Technology Solutions வழங்கும் செயலி.')}</p>
      <button type="button" class="btn-gold camp-start" id="crNext">↻ ${L('Finish — next person', 'முடிந்தது — அடுத்தவர்')}</button></section>`;
    sec.querySelector('#crNext').addEventListener('click', () => nextPerson());
  });
}

const csvCell = (v) => { const s = Array.isArray(v) ? v.join('; ') : String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
/** Reviews as CSV text (UTF-8 with BOM so Excel shows Tamil correctly). */
export function reviewsCsv(reviews = []) {
  const cols = ['at', 'station', 'lang', 'rating', 'liked', 'use', 'pay', 'age', 'improve', 'city', 'name', 'phone', 'contact'];
  return `﻿${cols.join(',')}\n${reviews.map((r) => cols.map((k) => csvCell(r[k])).join(',')).join('\n')}\n`;
}
function download(name, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

let adminOk = false;
function renderAdmin(sec) {
  const c = camp();
  const head = subHeader(L('Camp organiser', 'முகாம் ஏற்பாட்டாளர்'), L('Reviews on this computer', 'இந்தக் கணினியில் உள்ள கருத்துகள்'));
  if (!c) { sec.innerHTML = `${head}<p class="card glass">${L('Camp mode is off. Open Thunai with ?camp=1 to start.', 'முகாம் முறை இயக்கத்தில் இல்லை. தொடங்க ?camp=1 உடன் திறக்கவும்.')}</p>`; return; }
  if (!adminOk) {
    const setting = !c.pin;
    sec.innerHTML = `${head}<form class="card glass" id="pinForm"><label>${setting ? L('Set a 4-digit organiser PIN', 'ஏற்பாட்டாளர் 4 இலக்க PIN அமையுங்கள்') : L('Organiser PIN', 'ஏற்பாட்டாளர் PIN')}<input name="pin" inputmode="numeric" maxlength="8" autocomplete="off" required></label><p class="err" id="pinErr" hidden></p><button class="btn-gold" type="submit">${L('Open', 'திற')}</button></form>`;
    sec.querySelector('#pinForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const pin = String(new FormData(e.target).get('pin') || '').trim();
      if (setting) { if (!/^\d{4,8}$/.test(pin)) { const er = sec.querySelector('#pinErr'); er.hidden = false; er.textContent = L('Use 4 to 8 digits.', '4 முதல் 8 இலக்கங்கள்.'); return; } save({ ...c, pin }); adminOk = true; }
      else if (pin === c.pin) adminOk = true;
      else { const er = sec.querySelector('#pinErr'); er.hidden = false; er.textContent = L('Wrong PIN.', 'தவறான PIN.'); return; }
      renderAdmin(sec);
    });
    return;
  }
  const rs = c.reviews || [];
  const avg = rs.length ? (rs.reduce((s, r) => s + r.rating, 0) / rs.length).toFixed(1) : '—';
  const liked = {};
  rs.forEach((r) => (r.liked || []).forEach((k) => { liked[k] = (liked[k] || 0) + 1; }));
  const top = Object.entries(liked).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, n]) => { const row = LIKED.find((x) => x[0] === k); return `${row ? L(row[1], row[2]) : k} (${n})`; }).join(', ');
  const stamp = new Date().toISOString().slice(0, 10);
  sec.innerHTML = `${head}
    <section class="card glass"><div class="camp-stats"><div><b>${c.visitors || 0}</b><span>${L('visitors', 'வருகையாளர்')}</span></div><div><b>${rs.length}</b><span>${L('reviews', 'கருத்துகள்')}</span></div><div><b>${avg}</b><span>${L('average ★', 'சராசரி ★')}</span></div></div>
      ${top ? `<p class="small">${L('Liked most', 'அதிகம் பிடித்தவை')}: ${esc(top)}</p>` : ''}</section>
    <section class="card glass"><label>${L('Computer name (shown in the CSV)', 'கணினிப் பெயர் (CSV-இல் வரும்)')}<input id="campStation" maxlength="30" value="${esc(c.station || '')}" placeholder="${esc(L('e.g. Computer 3', 'எ.கா. கணினி 3'))}"></label>
      <div class="btn-row"><button type="button" class="chip-btn" id="campSaveSt">${L('Save name', 'பெயரைச் சேமி')}</button></div></section>
    <section class="card glass"><div class="btn-row"><button type="button" class="btn-gold" id="campCsv">⬇ ${L('Download reviews (CSV)', 'கருத்துகளைப் பதிவிறக்கு (CSV)')}</button><button type="button" class="chip-btn" id="campJson">⬇ JSON</button></div>
      <p class="small muted">${L('Download at the end of each day from every computer, then combine the files in Excel.', 'ஒவ்வொரு நாளின் முடிவிலும் ஒவ்வொரு கணினியிலிருந்தும் பதிவிறக்கி, Excel-இல் இணையுங்கள்.')}</p></section>
    ${rs.slice(-5).reverse().map((r) => `<div class="card glass small"><b>${'★'.repeat(r.rating)}</b> · ${esc(r.at.slice(0, 16).replace('T', ' '))}${r.improve ? `<p>${esc(r.improve)}</p>` : ''}</div>`).join('')}
    <section class="card glass"><div class="btn-row"><button type="button" class="chip-btn" id="campOff">${L('Turn camp mode off', 'முகாம் முறையை நிறுத்து')}</button><button type="button" class="chip-btn danger" id="campClear">${L('Delete all reviews', 'எல்லாக் கருத்துகளையும் நீக்கு')}</button></div></section>`;
  sec.querySelector('#campSaveSt').addEventListener('click', () => { save({ ...camp(), station: sec.querySelector('#campStation').value.trim() }); toast(L('Saved', 'சேமிக்கப்பட்டது')); document.getElementById('campBar')?.remove(); bar(); });
  sec.querySelector('#campCsv').addEventListener('click', () => download(`thunai-camp-${(camp().station || 'computer').replace(/\W+/g, '-')}-${stamp}.csv`, reviewsCsv(camp().reviews), 'text/csv;charset=utf-8'));
  sec.querySelector('#campJson').addEventListener('click', () => download(`thunai-camp-${stamp}.json`, JSON.stringify(camp().reviews, null, 2), 'application/json'));
  sec.querySelector('#campOff').addEventListener('click', () => { save({ ...camp(), on: false }); location.replace(location.pathname); });
  sec.querySelector('#campClear').addEventListener('click', () => { if (confirm(L('Delete all reviews on this computer? Download them first.', 'இந்தக் கணினியிலுள்ள எல்லாக் கருத்துகளையும் நீக்கவா? முதலில் பதிவிறக்குங்கள்.'))) { save({ ...camp(), reviews: [] }); renderAdmin(sec); } });
}

registerScreen('campwelcome', { render: renderWelcome, parent: 'home' });
registerScreen('campreview', { render: renderReview, parent: 'home' });
registerScreen('campadmin', { render: renderAdmin, parent: 'home' });
