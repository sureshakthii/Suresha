// Trust & privacy screens: birth-time dependence, "Why this result?", calculation conventions,
// and the privacy centre (what stays on the phone, what reaches servers, consent, export, deletion).
import { TIME_DEPENDENCE } from './shared/birthtime.js';
import { CONVENTIONS, CONVENTIONS_TA } from './shared/version.js';
import {
  state, $, $$, L, ta, esc, bi, STATIC, store, api, go, registerScreen, subHeader, toast, activeMember, displayName, saveFamily, BRAND,
} from './core.js';
import { reliabilityOf } from './screens-main.js';

// ================================================================ BIRTH TIME
function renderBirthTime(sec) {
  const m = activeMember();
  const rel = m ? reliabilityOf(m) : null;
  const need = { exact: L('needs an exact time', 'துல்லிய நேரம் தேவை'), approx: L('works with an approximate time (marked)', 'தோராய நேரத்திலும் இயங்கும் (குறிப்புடன்)'), date: L('usually needs only the date', 'பொதுவாகத் தேதி போதும்'), none: L('needs no birth time', 'பிறந்த நேரம் தேவையில்லை') };
  sec.innerHTML = `${subHeader(L('What depends on birth time?', 'எவை பிறந்த நேரத்தைச் சார்ந்தவை?'), L('We never invent a birth time', 'பிறந்த நேரத்தை நாங்கள் ஒருபோதும் ஊகிப்பதில்லை'))}
    ${rel ? `<div class="note-box"><b>${esc(displayName(m))}:</b> ${rel.certainty === 'exact' ? L('exact time recorded.', 'துல்லிய நேரம் பதிவு.') : rel.certainty === 'approx' ? L(`approximate time (± ${rel.windowMin} min).`, `தோராய நேரம் (± ${rel.windowMin} நிமி).`) : L('time unknown.', 'நேரம் தெரியாது.')}
      <ul class="small">${rel.notes.map((n) => `<li>${esc(bi(n))}</li>`).join('') || `<li>${L('All results are available.', 'அனைத்து முடிவுகளும் கிடைக்கும்.')}</li>`}</ul>
      <button class="link-btn" data-go="family" data-param='${esc(JSON.stringify({ edit: m.id }))}'>${L('Change birth-time certainty', 'பிறந்த நேர உறுதியை மாற்று')}</button></div>` : ''}
    <div class="card glass">${TIME_DEPENDENCE.map((d) => `<div class="tb-row" style="margin-bottom:10px"><span class="tb-label">${esc(bi(d))}</span><span class="badge ${d.need === 'exact' ? 'unv' : d.need === 'approx' ? 'est' : 'ok'}">${need[d.need]}</span><span class="tb-note">${esc(bi(d.why))}</span></div>`).join('')}</div>
    <div class="card glass"><div class="card-title">${L('When the time is unknown', 'நேரம் தெரியாதபோது')}</div>
      <ul class="small">
        <li>${L('Calendar, panchangam, temples, journeys, reminders and family tools work fully.', 'நாட்காட்டி, பஞ்சாங்கம், கோவில்கள், பயணம், நினைவூட்டல், குடும்பக் கருவிகள் முழுமையாக இயங்கும்.')}</li>
        <li>${L('Rasi is shown when the Moon stays in one sign all day; otherwise it is marked uncertain.', 'நாள் முழுவதும் சந்திரன் ஒரே ராசியில் இருந்தால் ராசி காட்டப்படும்; இல்லையெனில் “உறுதியில்லை”.')}</li>
        <li>${L('Lagnam, houses, Navamsa and divisional charts are withheld; readings use the Moon sign (Chandra lagna) and say so.', 'லக்னம், பாவங்கள், நவாம்சம், வர்க்கச் சக்கரங்கள் காட்டப்படாது; பலன்கள் சந்திர ராசி அடிப்படையில் என்று குறிப்பிடப்படும்.')}</li>
        <li>${L('Internally the calculation uses the middle of the birth day only to place slow planets; that placeholder is never displayed or treated as your birth time.', 'மெதுவான கிரகங்களை வைக்க மட்டும் பிறந்த நாளின் நடுப்பகுதி உள்ளே பயன்படுகிறது; அது உங்கள் பிறந்த நேரமாகக் காட்டப்படுவதோ கருதப்படுவதோ இல்லை.')}</li>
      </ul></div>`;
}
registerScreen('birthtime', { render: renderBirthTime, parent: 'chart' });

// ================================================================ WHY THIS RESULT?
function renderWhy(sec) {
  sec.innerHTML = `${subHeader(L('How Thunai reads your chart', 'துணை ஜாதகத்தைப் படிக்கும் முறை'), L('How Thunai turns the sky into guidance', 'வானத்தை வழிகாட்டலாக மாற்றும் முறை'))}
    <div class="card glass"><ol class="why-steps">
      <li><b>${L('Astronomy (measured)', 'வானியல் (அளவிடப்பட்டது)')}</b> — ${L('Planet positions for your birth moment and place are computed by an astronomy library. This part is precise and checkable.', 'பிறந்த நேரம், இடத்திற்கான கிரக நிலைகள் வானியல் நூலகத்தால் கணிக்கப்படுகின்றன. இது துல்லியமானது, சரிபார்க்கக்கூடியது.')}</li>
      <li><b>${L('Conventions (chosen)', 'முறைகள் (தேர்ந்தெடுக்கப்பட்டவை)')}</b> — ${L('Lahiri ayanamsa, whole-sign houses, mean node, Vimshottari dasa. Other schools choose differently — see “Calculation methods”.', 'லாஹிரி அயனாம்சம், முழு ராசி பாவம், சராசரி ராகு, விம்சோத்தரி தசை. பிற மரபுகள் வேறுபடலாம் — “கணிப்பு முறைகள்” பார்க்கவும்.')}</li>
      <li><b>${L('Traditional interpretation (belief)', 'பாரம்பரிய விளக்கம் (நம்பிக்கை)')}</b> — ${L('Strength points, yogas and period meanings come from traditional rules written in the app. They are interpretations, not scientific measurements, and scores are not probabilities.', 'பலப் புள்ளிகள், யோகங்கள், கால விளக்கங்கள் செயலியில் எழுதப்பட்ட பாரம்பரிய விதிகள். இவை விளக்கங்கள், அறிவியல் அளவீடுகள் அல்ல; மதிப்பெண்கள் நிகழ்தகவுகள் அல்ல.')}</li>
      <li><b>${L('Your decisions', 'உங்கள் முடிவுகள்')}</b> — ${L('Astronomical accuracy does not prove life predictions. Use the guidance as one input alongside family, professionals and your own judgement.', 'வானியல் துல்லியம் வாழ்க்கைக் கணிப்புகளை நிரூபிக்காது. குடும்பம், நிபுணர்கள், உங்கள் சொந்த முடிவுடன் இதை ஒரு உள்ளீடாகப் பயன்படுத்துங்கள்.')}</li>
    </ol>
    <button class="chip-btn" data-go="calc">🧮 ${L('Calculation methods', 'கணிப்பு முறைகள்')}</button> <button class="chip-btn" data-go="birthtime">🕰️ ${L('Birth-time dependence', 'பிறந்த நேரச் சார்பு')}</button></div>`;
}
registerScreen('why', { render: renderWhy, parent: 'chart' });

// ================================================================ CALCULATION METHODS
function renderCalc(sec) {
  const label = { ephemeris: ['Ephemeris', 'கிரகக் கணிப்பு'], ayanamsa: ['Ayanamsa', 'அயனாம்சம்'], nodes: ['Rahu / Ketu', 'ராகு / கேது'], houses: ['Houses', 'பாவங்கள்'], lagna: ['Lagnam', 'லக்னம்'], sunrise: ['Sunrise', 'சூரிய உதயம்'], vedicDay: ['Panchangam day', 'பஞ்சாங்க நாள்'], timezone: ['Time zone & daylight saving', 'நேர மண்டலம்'], dasa: ['Dasa', 'தசை'], horai: ['Horai', 'ஓரை'], rahuKalam: ['Rahu Kalam', 'ராகு காலம்'] };
  sec.innerHTML = `${subHeader(L('Calculation methods', 'கணிப்பு முறைகள்'), '', 'more')}
    <div class="card glass"><dl class="kv">${Object.entries(CONVENTIONS).map(([k, v]) => `<dt>${L(...label[k])}</dt><dd>${esc(ta() ? CONVENTIONS_TA[k] || v : v)}</dd>`).join('')}</dl></div>
    <div class="note-box">${L('Coordinates come from the built-in gazetteer or what you enter. With a known time zone (built-in places, or a zone you choose) the historical UTC offset and daylight saving in force on the birth date are applied automatically from the time-zone database — including India’s war-time +6:30. A clock time that did not exist or happened twice when clocks changed is flagged (a repeated hour uses the earlier time). Reference checks against published positions and panchangam boundaries run in the automated tests (docs/CALCULATIONS.md).', 'அட்ச/தீர்க்க ரேகைகள் உள்ளமைந்த பட்டியலிலிருந்து அல்லது நீங்கள் உள்ளிடுவதிலிருந்து. நேர மண்டலம் தெரிந்தால் (உள்ளமைந்த இடங்கள் அல்லது நீங்கள் தேர்ந்த மண்டலம்), பிறந்த நாளில் நடைமுறையில் இருந்த UTC நேர வேறுபாடும் பகல் சேமிப்பு நேரமும் நேர மண்டலத் தரவுத்தளத்திலிருந்து தானாகப் பயன்படுத்தப்படும் — இந்தியாவின் போர்க்கால +6:30 உட்பட. கடிகாரம் மாற்றப்பட்டபோது இல்லாத அல்லது இருமுறை வந்த நேரம் தனியாகக் குறிக்கப்படும் (இருமுறை வந்த நேரத்திற்கு முந்தையது எடுக்கப்படும்).')}</div>`;
}
registerScreen('calc', { render: renderCalc, parent: 'more' });

// ================================================================ PRIVACY CENTRE
export const CONSENT_KEYS = [
  { id: 'analytics', en: 'Anonymous usage statistics (screens opened — never birth details or chat text)', ta: 'பெயரில்லாப் பயன்பாட்டுப் புள்ளிவிவரம் (திறந்த திரைகள் — பிறப்பு விவரமோ உரையாடலோ இல்லை)', def: false },
  { id: 'aiChat', en: 'Allow detailed answers written with an outside writing service (my question and chart facts are sent for that answer only)', ta: 'வெளி எழுத்துச் சேவை மூலம் விரிவான பதில்களை அனுமதி (என் கேள்வியும் ஜாதகத் தகவலும் அந்தப் பதிலுக்கு மட்டும் அனுப்பப்படும்)', def: true },
  { id: 'backup', en: 'Back up family profiles to my account (when signed in; private 🔒 profiles always stay on this phone)', ta: 'குடும்ப சுயவிவரங்களை என் கணக்கில் சேமி (உள்நுழைந்தால்; தனிப்பட்ட 🔒 சுயவிவரங்கள் எப்போதும் இந்தக் கைப்பேசியில் மட்டும்)', def: true },
];
export const consent = (id) => store.get('kj_consent', {})[id] ?? CONSENT_KEYS.find((c) => c.id === id)?.def ?? false;

function renderPrivacy(sec) {
  const flows = [
    ['🧮', 'Chart & panchangam calculations', 'ஜாதக, பஞ்சாங்கக் கணிப்பு', 'On this phone only', 'இந்தக் கைப்பேசியில் மட்டும்', true],
    ['👨‍👩‍👧', 'Family profiles & birth details', 'குடும்ப சுயவிவரம், பிறப்பு விவரம்', 'On this phone; copied to our server only if you sign in and keep backup on. Private 🔒 profiles are never copied.', 'இந்தக் கைப்பேசியில்; உள்நுழைந்து காப்பு இயக்கினால் மட்டும் சேவையகத்திற்கு. தனிப்பட்ட 🔒 சுயவிவரங்கள் ஒருபோதும் நகலெடுக்கப்படாது.', true],
    ['💬', 'Ask (chat)', 'கேள்வி (உரையாடல்)', 'Everyday answers are worked out on your phone. Detailed answers (when the online service is on): your question, today’s data and chart facts go to our server and a writing service (Anthropic) for that answer only; never used for advertising. Private profiles are never sent.', 'அன்றாட பதில்கள் உங்கள் கைப்பேசியிலேயே கணிக்கப்படும். விரிவான பதில்கள் (இணைய சேவை இயக்கத்தில் இருந்தால்): உங்கள் கேள்வி, இன்றைய தரவு, ஜாதகத் தகவல் அந்தப் பதிலுக்கு மட்டும் எங்கள் சேவையகம், எழுத்துச் சேவை (Anthropic) வழியாக; விளம்பரத்திற்குப் பயன்படாது. தனிப்பட்ட சுயவிவரங்கள் அனுப்பப்படாது.', false],
    ['🎙️', 'Voice', 'குரல்', 'Speech-to-text is done by your phone’s or browser’s speech service (Google/Apple), which may process audio online. Thunai receives only the text. Read-aloud uses the phone’s voice, offline.', 'பேச்சு-எழுத்து மாற்றம் உங்கள் கைப்பேசி / உலாவியின் சேவையால் (Google/Apple) — இணையத்தில் செயலாக்கப்படலாம். துணைக்கு உரை மட்டுமே வரும். வாசித்துக்காட்டுதல் கைப்பேசிக் குரலில், இணையமின்றி.', false],
    ['☁️', 'Backup', 'காப்பு', 'Only when signed in and backup is on: non-private profiles are stored in our database. Switching backup off removes the server copy.', 'உள்நுழைந்து காப்பு இயக்கத்தில் இருந்தால் மட்டும்: தனிப்பட்டதல்லாத சுயவிவரங்கள் எங்கள் தரவுத்தளத்தில். காப்பை நிறுத்தினால் சேவையக நகல் நீக்கப்படும்.', false],
    ['📊', 'Analytics', 'பகுப்பாய்வு', 'Off unless you allow it. Screen names and app version only — never birth details, names or chat content.', 'நீங்கள் அனுமதிக்கும் வரை நிறுத்தம். திரைப் பெயர், பதிப்பு மட்டும் — பிறப்பு விவரம், பெயர், உரையாடல் ஒருபோதும் இல்லை.', false],
    ['🎫', 'Bookings & payments', 'முன்பதிவு & கட்டணம்', 'When live: name, phone and booking details go to our server and the payment gateway (Razorpay). Card details never touch our server.', 'இயங்கும்போது: பெயர், தொலைபேசி, முன்பதிவு விவரம் எங்கள் சேவையகம், கட்டண நுழைவாயிலுக்கு (Razorpay). அட்டை விவரம் எங்கள் சேவையகத்திற்கு வராது.', false],
  ];
  const c = store.get('kj_consent', {});
  sec.innerHTML = `${subHeader(L('Privacy & data', 'தனியுரிமை & தரவு'), L('What stays on your phone and what reaches servers', 'எது கைப்பேசியில், எது சேவையகத்திற்கு'), 'more')}
    <div class="card glass">${flows.map(([i, en, tx, wen, wta, local]) => `<div class="tb-row" style="margin-bottom:12px"><span class="tb-label">${i} ${L(en, tx)}</span><span class="badge ${local ? 'ok' : 'est'}">${local ? L('On device', 'கைப்பேசியில்') : L('May reach servers', 'சேவையகம் செல்லலாம்')}</span><span class="tb-note">${L(wen, wta)}</span></div>`).join('')}</div>
    <div class="card glass"><div class="card-title">${L('Your choices', 'உங்கள் தேர்வுகள்')}</div>
      ${CONSENT_KEYS.map((k) => `<label class="set-row"><span>${L(k.en, k.ta)}</span><input type="checkbox" data-consent="${k.id}"${(c[k.id] ?? k.def) ? ' checked' : ''}></label>`).join('')}
      <p class="small muted">${L('Microphone and location are requested only when you tap the mic or “use my location”.', 'மைக் அல்லது “என் இருப்பிடம்” அழுத்தும்போது மட்டுமே அனுமதி கேட்கப்படும்.')}</p></div>
    <div class="card glass"><div class="card-title">${L('Your data', 'உங்கள் தரவு')}</div>
      <button class="btn-soft" id="exportData">⬇️ ${L('Export all my data (JSON file)', 'என் அனைத்துத் தரவையும் ஏற்றுமதி செய் (JSON)')}</button>
      <label>${L('Delete one profile', 'ஒரு சுயவிவரத்தை நீக்கு')}<select id="delWho">${state.family.map((m) => `<option value="${esc(m.id)}">${esc(displayName(m))}</option>`).join('')}</select></label>
      <button class="btn-soft" id="delProfile"${state.family.length ? '' : ' disabled'}>🗑️ ${L('Delete selected profile', 'தேர்ந்த சுயவிவரத்தை நீக்கு')}</button>
      <button class="btn-soft danger" id="delAll">⚠️ ${L('Delete everything on this phone' + (STATIC ? '' : ' and my account'), 'இந்தக் கைப்பேசியிலுள்ள அனைத்தையும்' + (STATIC ? '' : ', என் கணக்கையும்') + ' நீக்கு')}</button>
      <p class="small muted">${L('Children’s profiles are kept on the phone and in your private backup only; they are never shared or used for analytics.', 'குழந்தைகளின் சுயவிவரங்கள் கைப்பேசியிலும் உங்கள் தனிப்பட்ட காப்பிலும் மட்டுமே; பகிரப்படாது, பகுப்பாய்வுக்குப் பயன்படாது.')}</p></div>
    <p class="small muted center">${L('Questions: ', 'கேள்விகள்: ')}${esc(BRAND.supportEmail)}</p>`;
  $$('[data-consent]', sec).forEach((x) => x.addEventListener('change', async () => {
    const cur = store.get('kj_consent', {}); cur[x.dataset.consent] = x.checked; store.set('kj_consent', cur);
    if (x.dataset.consent === 'backup' && !STATIC && state.user) {
      // Off: stop syncing and remove the copy on our server. On: upload the non-private profiles now.
      if (!x.checked) {
        try { await api('/api/me/data', { method: 'DELETE' }); toast(L('Backup off — the copy on our server was removed', 'காப்பு நிறுத்தப்பட்டது — சேவையக நகல் நீக்கப்பட்டது')); } catch (e) { toast(L('Backup is off, but the server copy could not be removed: ', 'காப்பு நிறுத்தப்பட்டது; ஆனால் சேவையக நகலை நீக்க முடியவில்லை: ') + e.message, 5000); }
        return;
      }
      saveFamily();
    }
    toast(L('Saved', 'சேமிக்கப்பட்டது'));
  }));
  $('#exportData').addEventListener('click', async () => {
    const local = {};
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith('kj_')) local[k] = store.get(k, null); }
    let account = null;
    if (!STATIC && state.user) { try { account = await api('/api/me/export'); } catch { account = { error: 'server export unavailable' }; } }
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), app: BRAND.name, device: local, account }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'thunai-my-data.json'; a.click(); URL.revokeObjectURL(a.href);
  });
  $('#delProfile').addEventListener('click', () => {
    const id = $('#delWho').value; const m = state.family.find((x) => x.id === id);
    if (!m || !confirm(L(`Delete ${displayName(m)}'s profile? This cannot be undone.`, `${displayName(m)} சுயவிவரத்தை நீக்கவா? இதைத் திரும்பப் பெற முடியாது.`))) return;
    state.family = state.family.filter((x) => x.id !== id);
    if (state.activeId === id) state.activeId = state.family[0]?.id || null;
    saveFamily(); toast(L('Profile deleted', 'சுயவிவரம் நீக்கப்பட்டது')); renderPrivacy(sec);
  });
  $('#delAll').addEventListener('click', async () => {
    if (!confirm(L('Delete all profiles, plans, reminders and settings from this phone' + (STATIC ? '' : ', and delete your account on our server') + '? This cannot be undone.', 'இந்தக் கைப்பேசியிலுள்ள அனைத்து சுயவிவரம், திட்டம், நினைவூட்டல், அமைப்புகளை' + (STATIC ? '' : ', சேவையகத்திலுள்ள உங்கள் கணக்கையும்') + ' நீக்கவா? இதைத் திரும்பப் பெற முடியாது.'))) return;
    if (!STATIC && state.user) { try { await api('/api/me', { method: 'DELETE' }); } catch (e) { toast(L('Could not delete the account on the server: ', 'சேவையகக் கணக்கை நீக்க முடியவில்லை: ') + e.message, 5000); return; } }
    Object.keys(localStorage).filter((k) => k.startsWith('kj_')).forEach((k) => localStorage.removeItem(k));
    location.reload();
  });
}
registerScreen('privacy', { render: renderPrivacy, parent: 'more' });
