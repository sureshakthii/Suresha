// Married-life analysis (திருமண வாழ்க்கை ஆய்வு) and business-partner matching (வணிகக் கூட்டாளி பொருத்தம்):
// full birth details of both people, the traditional factors shown separately and a year-by-year timeline for an
// explicit report horizon ("first 25 years of marriage"). No marry / reject verdict and no combined score.
// Saving another adult's profile needs that person's permission (consentAt and a consent ledger are stored with the
// profile; the permission can be withdrawn from the profile). The marriage result is a short summary, five icon-and-text
// cards (shared/marriage-context.js buildMatchingReport, rendered by couple-cards.js), a separate Ashtakoota link and an
// expandable expert view. Each person's marriage context is real-life context only: it never changes any factor.
import { birthChart } from './shared/astro.js';
import { birthArgs, UNKNOWN_TIME_PLACEHOLDER } from './shared/birthtime.js';
import {
  buildMatchingReport, createConsentLedger, recordConsent, revokeConsent, hasConsent, MARRIAGE_MODES, MARRIAGE_MODE_ORDER, MARRIAGE_CONTEXT_TITLE, KEEP_PRIVATE_LABEL,
} from './shared/marriage-context.js';
import { summaryHtml, resultCardsHtml, ashtakootaLinkHtml, factorCounts } from './couple-cards.js';
import { marriageReport, partnershipReport, HORIZON_LINES } from './shared/couple.js';
import { KEY_FACTORS_TITLE, DETAILED_VIEW_TITLE, DISCUSSION_TOPICS, DISCUSSION_TITLE } from './shared/porutham.js';
import {
  state, chartOf, hasLagna, stabilityChip, doshamReference, $, $$, L, ta, esc, bi, GLYPH, planetName, nakName, rasiName, fmtIsoDate, registerScreen, subHeader, aiTask, speak, toast,
  displayName, nameBi, saveFamily, placeName, printPage,
} from './core.js';
import { placeSearch } from './account.js';
import { isLocked, lockCard, pairKey, gate } from './growth.js';
import { isAdult, MATCH_ADULTS_NOTE, PARTNER_ADULTS_NOTE } from './shared/age-guard.js';

// Marriage, love and partner matching are for adults only (shared/age-guard.js): people under 18 — or without a
// birth date — are never offered in the pickers, and entered birth dates under 18 are refused gently.
export const adultPool = () => state.family.filter((m) => m.relation !== 'organization' && isAdult(m, { tz: state.loc?.tz }));
const hiddenMinors = () => state.family.filter((m) => m.relation !== 'organization').length > adultPool().length;
export const adultsNote = (business = false) => (hiddenMinors() ? `<p class="small muted age-note">🌱 ${esc(bi(business ? PARTNER_ADULTS_NOTE : MATCH_ADULTS_NOTE))}</p>` : '');

const iso = (d) => new Date(d.getTime() + (state.loc?.tz ?? 5.5) * 3600000).toISOString().slice(0, 10);
const monthYear = (d) => new Date(d).toLocaleDateString(ta() ? 'ta-IN' : 'en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' });
export const forms = {}; // per-slot entered data, kept while the app is open

// ---------------------------------------------------------------- permission (another adult's data)
export const PERMISSION_LABEL = () => L('I have this person’s permission', 'இவரின் அனுமதி பெற்றுள்ளேன்');
export const permissionError = () => L('Please confirm you have this person’s permission before saving or sharing.', 'சேமிக்க அல்லது பகிரும் முன் இவரின் அனுமதி பெற்றுள்ளீர்கள் என்று உறுதி செய்யவும்.');
/** A labelled permission checkbox with its inline error line (hidden until needed). */
export function permissionCheckbox(id, label = PERMISSION_LABEL(), checked = false) {
  return `<label class="adult-confirm perm-confirm"><input type="checkbox" id="${id}"${checked ? ' checked' : ''}> <span>${esc(label)}</span></label>
    <p class="small adult-confirm-err" id="${id}Err" role="alert" hidden>${esc(permissionError())}</p>`;
}
/**
 * Save another adult's profile to the family list with the time the user confirmed that person's permission and a
 * consent ledger (shared/marriage-context.js) holding that grant, so it can be checked (hasConsent) and withdrawn.
 */
export function saveWithConsent(m) {
  const id = Math.random().toString(36).slice(2, 10);
  const consentLedger = recordConsent(createConsentLedger(`profile:${id}`), { participantId: id, scopes: ['calculate', 'save'] });
  state.family.push({ ...m, id, consentAt: new Date().toISOString(), consentBy: 'in-app-confirmation', consentLedger });
  saveFamily();
  toast(L('Saved to family', 'குடும்பத்தில் சேமிக்கப்பட்டது'));
  return id;
}
/** true / false for a profile saved here with another adult's permission; null for profiles without a ledger. */
export const profileConsent = (m) => (m?.consentLedger ? hasConsent(m.consentLedger, [m.id], 'save') : null);
/** Withdraw a saved adult's permission from their profile: the revoke is recorded and their details leave this phone. */
export function revokeProfileConsent(id) {
  const m = state.family.find((x) => x.id === id);
  if (!m?.consentLedger) return false;
  if (!confirm(L(`Withdraw permission for ${displayName(m)}? Their saved birth details will be removed from this phone.`, `${displayName(m)} அவர்களின் அனுமதியைத் திரும்பப் பெறவா? சேமித்த பிறப்பு விவரங்கள் இந்தக் கைப்பேசியிலிருந்து நீக்கப்படும்.`))) return false;
  const ledger = revokeConsent(m.consentLedger, { participantId: id });
  if (hasConsent(ledger, [id], 'save')) return false;
  state.family = state.family.filter((x) => x.id !== id);
  if (state.activeId === id) state.activeId = state.family[0]?.id || null;
  saveFamily();
  toast(L('Permission withdrawn — details removed', 'அனுமதி திரும்பப் பெறப்பட்டது — விவரங்கள் நீக்கப்பட்டன'));
  return true;
}

/** Marriage context for one person (couple screen only): four choices, unselected = not disclosed, plus "keep private". */
function contextField(f) {
  return `<div class="mc-context"><label>${esc(bi(MARRIAGE_CONTEXT_TITLE))} <span class="pill">${L('optional', 'விருப்பம்')}</span>
      <select data-f="ctxMode"><option value=""${f.ctxMode ? '' : ' selected'}>${L('— Not chosen (not disclosed) —', '— தேர்வு செய்யவில்லை (சொல்லப்படவில்லை) —')}</option>${MARRIAGE_MODE_ORDER.map((k) => `<option value="${k}"${f.ctxMode === k ? ' selected' : ''}>${esc(bi(MARRIAGE_MODES[k]))}</option>`).join('')}</select></label>
    <label class="check-row"><input type="checkbox" data-f="ctxPrivate"${f.ctxPrivate ? ' checked' : ''}> ${esc(bi(KEEP_PRIVATE_LABEL))}</label>
    <p class="small muted">${L('Real-life context only — it never changes any porutham or dosha result.', 'வாழ்க்கைச் சூழல் மட்டுமே — எந்தப் பொருத்தம் அல்லது தோஷ முடிவையும் மாற்றாது.')}</p></div>`;
}

/** Person input: pick a family member or enter full birth details. */
export function personBlock(slot, title, { gender, nth = 0, business = false, context = false } = {}) {
  const pool = adultPool();
  const f = forms[slot] ||= { mode: pool.length ? 'family' : 'new', memberId: (gender ? pool.find((m) => m.gender === gender) || pool[0] : pool[nth] || pool[0])?.id || null, gender: gender || 'male' };
  if (f.mode === 'family' && !pool.length) f.mode = 'new';
  if (f.mode === 'family' && !pool.some((m) => m.id === f.memberId)) f.memberId = (gender ? pool.find((m) => m.gender === gender) || pool[0] : pool[nth] || pool[0])?.id || null;
  const picked = f.mode === 'family' ? pool.find((m) => m.id === f.memberId) : null;
  const permLine = profileConsent(picked) ? `<p class="small muted perm-saved">🔒 ${L('Saved with this person’s permission', 'இவரின் அனுமதியுடன் சேமிக்கப்பட்டது')}${picked.consentAt ? ` · ${esc(fmtIsoDate(picked.consentAt.slice(0, 10)))}` : ''} <button type="button" class="link-btn" data-revoke="${esc(picked.id)}">${L('Withdraw permission', 'அனுமதியைத் திரும்பப் பெறு')}</button></p>` : '';
  return `<div class="card glass person-block" data-slot="${slot}"><div class="card-title">${title}</div>${adultsNote(business)}
    ${pool.length ? `<div class="seg"><button type="button" data-mode="family" class="${f.mode === 'family' ? 'sel' : ''}">${L('From family', 'குடும்பத்திலிருந்து')}</button><button type="button" data-mode="new" class="${f.mode === 'new' ? 'sel' : ''}">${L('Enter details', 'விவரம் உள்ளிடு')}</button></div>` : ''}
    ${f.mode === 'family' && pool.length
    ? `<label>${gender === 'female' ? L('Bride', 'மணமகள்') : gender === 'male' ? L('Groom', 'மணமகன்') : business ? L('Partner', 'கூட்டாளி') : L('Name', 'பெயர்')}<select data-f="memberId">${pool.map((m) => `<option value="${esc(m.id)}"${m.id === f.memberId ? ' selected' : ''}>${esc(displayName(m))}</option>`).join('')}</select></label>${permLine}`
    : `<div class="row2"><label>${L('Name', 'பெயர்')}<input data-f="name" value="${esc(f.name || '')}" maxlength="60"></label>
        <label>${L('Gender', 'பாலினம்')}<select data-f="gender">${[['male', 'Male', 'ஆண்'], ['female', 'Female', 'பெண்']].map(([id, en, tx]) => `<option value="${id}"${(f.gender || gender) === id ? ' selected' : ''}>${L(en, tx)}</option>`).join('')}</select></label></div>
      <div class="row2"><label>${L('Date of birth', 'பிறந்த தேதி')}<input type="date" data-f="date" value="${esc(f.date || '')}"></label>
        <label>${L('Time of birth', 'பிறந்த நேரம்')} <span class="pill">${L('optional', 'விருப்பம்')}</span><input type="time" step="1" data-f="time" value="${esc(f.time || '')}"></label></div>
      <label class="place-wrap">${L('Place of birth', 'பிறந்த இடம்')}<input data-f="place" value="${esc(f.place || '')}" placeholder="${esc(L('Type a city…', 'நகரம் தட்டச்சு செய்க…'))}"><ul class="suggest" hidden></ul></label>
      ${f.lat != null ? `<p class="muted small">📍 ${esc(placeName(f.place))} · ${Number(f.lat).toFixed(2)}, ${Number(f.lon).toFixed(2)} · ${f.zone ? esc(f.zone) : `${L('UTC', 'நேர மண்டலம்')}${f.tz >= 0 ? '+' : ''}${f.tz}`}</p>` : ''}
      <label class="check-row"><input type="checkbox" data-f="save"${f.save ? ' checked' : ''}> ${L('Save to my family list', 'என் குடும்பப் பட்டியலில் சேமி')}</label>
      <label class="adult-confirm perm-confirm"${f.save ? '' : ' hidden'} data-perm><input type="checkbox" data-f="consent"${f.consent ? ' checked' : ''}> <span>${esc(PERMISSION_LABEL())} — ${L('needed to save another adult’s details', 'மற்றொருவரின் விவரங்களைச் சேமிக்கத் தேவை')}</span></label>`}
    ${context ? contextField(f) : ''}
  </div>`;
}

export function wirePersonBlocks(sec, rerender) {
  $$('.person-block', sec).forEach((blk) => {
    const slot = blk.dataset.slot;
    const f = forms[slot];
    $$('[data-mode]', blk).forEach((b) => b.addEventListener('click', () => { f.mode = b.dataset.mode; rerender(); }));
    $$('[data-f]', blk).forEach((el) => {
      const set = () => {
        f[el.dataset.f] = el.type === 'checkbox' ? el.checked : el.value;
        if (el.dataset.f === 'save') { const perm = $('[data-perm]', blk); if (perm) perm.hidden = !el.checked; }
      };
      el.addEventListener('change', set);
      el.addEventListener('input', set);
    });
    $('[data-f="memberId"]', blk)?.addEventListener('change', rerender); // refreshes the "saved with permission" line
    $$('[data-revoke]', blk).forEach((b) => b.addEventListener('click', () => { if (revokeProfileConsent(b.dataset.revoke)) rerender(); }));
    const place = $('[data-f="place"]', blk);
    if (place) placeSearch(place, $('.suggest', blk), (p) => { Object.assign(f, { place: p.text || p.name, lat: p.lat, lon: p.lon, tz: p.tz, zone: p.zone }); rerender(); });
  });
}

/** Resolve a slot into { chart, member, name } or throw a friendly error. */
function resolve(slot, label) {
  const f = forms[slot];
  if (f.mode === 'family' && adultPool().length) {
    const m = adultPool().find((x) => x.id === f.memberId) || adultPool()[0];
    return { member: m, chart: chartOf(m), name: nameBi(m) };
  }
  // Age first: a birth date under 18 is refused before anything else is asked for.
  if (f.date && !isAdult(f.date, { tz: state.loc?.tz })) throw new Error(L(`${label}: matching is only for people aged 18 and over.`, `${label}: பொருத்தம் 18 வயதுக்கு மேற்பட்டவர்களுக்கு மட்டும்.`));
  if (!f.name?.trim() || !f.date || f.lat == null) throw new Error(L(`Please enter ${label}'s name, birth date and place (pick the city from the list). Birth time is optional.`, `${label} — பெயர், பிறந்த தேதி, இடம் (பட்டியலிலிருந்து நகரம்) உள்ளிடவும். பிறந்த நேரம் விருப்பம்.`));
  if (f.save && !f.consent) throw new Error(`${label}: ${permissionError()}`);
  // Birth time not known: never invented — the chart is made without a Lagna (birthArgs, timeCertainty 'unknown') and
  // every Lagna-based check is shown as "needs birth time".
  const known = !!f.time;
  const time = known ? (f.time.length === 5 ? `${f.time}:00` : f.time) : UNKNOWN_TIME_PLACEHOLDER;
  const m = { id: `${slot}_${f.date}_${time}`, name: f.name.trim(), gender: f.gender, date: f.date, time, timeCertainty: known ? 'exact' : 'unknown', place: f.place, lat: Number(f.lat), lon: Number(f.lon), tz: Number(f.tz), zone: f.zone || undefined, relation: 'other' };
  if (f.save && !state.family.some((x) => x.date === m.date && x.time === m.time && x.name === m.name)) saveWithConsent(m);
  return { member: m, chart: birthChart(birthArgs(m)), name: nameBi(m) };
}

/** Matching needs two different people: the same profile (or the same typed birth details) on both sides is refused. */
export const samePerson = (a, b) => !!(a?.member && b?.member && (a.member.id === b.member.id || (a.member.date === b.member.date && a.member.time === b.member.time && String(a.member.name || '').trim().toLowerCase() === String(b.member.name || '').trim().toLowerCase())));
export const SAME_PERSON_MSG = () => L('Please choose two different people — the same person is selected on both sides.', 'இரண்டு வெவ்வேறு நபர்களைத் தேர்ந்தெடுக்கவும் — இரு பக்கமும் ஒரே நபர் தேர்வாகியுள்ளார்.');
function assertTwoPeople(a, b) { if (samePerson(a, b)) throw new Error(SAME_PERSON_MSG()); }

// ---------------------------------------------------------------- shared porutham view (also used by screens-tools)
const statusIcon = (st) => (st === 'uttamam' ? '✅' : st === 'madhyamam' ? '🟡' : '⚪');
const statusClass = (st) => (st === 'uttamam' ? 'pos' : st === 'madhyamam' ? 'zero' : 'neg');
const factorRow = (x) => `<div class="factor match-factor"><span>${statusIcon(x.status)} <b>${esc(ta() ? x.ta : x.en)}</b> <b class="mf-label ${statusClass(x.status)}">${esc(bi(x.label))}</b><br><small class="muted">${esc(bi(x.detail))}</small><br><small class="muted">ℹ️ ${esc(bi(x.basis))}</small></span></div>`;
const NEEDS_TIME_TAG = () => `<span class="pill">🕰️ ${L('needs birth time', 'பிறந்த நேரம் தேவை')}</span>`;

/** Chevvai / Rahu-Ketu observations for one person: Lagna checks are marked "needs birth time" when it is unknown. */
function doshaPersonHtml(d, name, lagnaUnknown, chart = null) {
  const c = d.chevvai, rk = d.rahuKetu;
  const lagnaNa = lagnaUnknown || c.needsBirthTime || c.references?.lagna?.unavailable;
  const seen = (present) => (present ? L('placement noted', 'அமைப்பு உள்ளது') : L('not noted', 'இல்லை'));
  const lines = [
    `🔴 ${L('Chevvai from Lagna', 'லக்னத்திலிருந்து செவ்வாய்')}: ${lagnaNa ? NEEDS_TIME_TAG() : `${L('house', 'வீடு')} ${c.fromLagna} — ${seen(c.references?.lagna?.present)}`}`,
    `🌙 ${L('Chevvai from Moon', 'சந்திரனிலிருந்து செவ்வாய்')}: ${L('house', 'வீடு')} ${c.fromMoon} — ${seen(c.references?.moon?.present)}`,
    `🐍 ${L('Rahu–Ketu from Lagna', 'லக்னத்திலிருந்து ராகு–கேது')}: ${lagnaNa || rk.references?.lagna?.unavailable ? NEEDS_TIME_TAG() : `${L('houses', 'வீடுகள்')} ${rk.rahuHouse} / ${rk.ketuHouse} — ${seen(rk.present)}`}`,
  ];
  const exc = (c.exceptions || []).map((e) => `<li>${esc(bi(e))}<br><small class="muted">${esc(bi(e.reason))}</small></li>`).join('');
  const ref = doshamReference(d);
  const chip = chart ? stabilityChip(chart, 'lagna', 'house:Mars') : '';
  return `<div class="dosha-person"><b>${esc(name)}</b> ${chip}${ref ? `<div class="small muted">🌙 ${esc(bi(ref))}</div>` : ''}${lines.map((x) => `<div class="small">${x}</div>`).join('')}
    ${exc ? `<div class="small"><b>${L('Traditional exceptions that may apply (conditions)', 'பொருந்தக்கூடிய மரபு விலக்குகள் (நிபந்தனைகள்)')}:</b><ul class="exc-list">${exc}</ul></div>` : ''}</div>`;
}

/**
 * The porutham result: "N of 10 traditional factors agree", the key factors (Rajju, Vedhai) to discuss together,
 * a short neutral summary and an expandable detailed view (every factor with its basis, doshas, samyam, birth-time
 * notes). opts: { names: [a, b] strings, doshas: [dA, dB] | null, lagnaUnknown: [bool, bool], samyam, starOnly }.
 */
export function poruthamView(r, { names, doshas = null, charts = [null, null], lagnaUnknown = [false, false], samyam = null, starOnly = false, header = '' } = {}) {
  const birthNotes = [];
  if (starOnly) birthNotes.push(L('Matched by birth star only — Chevvai and Rahu–Ketu need both full birth details.', 'நட்சத்திரம் மூலம் மட்டும் — செவ்வாய், ராகு–கேது பார்க்க இருவரின் முழு பிறப்பு விவரமும் தேவை.'));
  if (lagnaUnknown.some(Boolean)) birthNotes.push(L(`Birth time not known for ${names.filter((_, i) => lagnaUnknown[i]).join(', ')} — Lagna-based checks are marked “needs birth time”; star-based factors may change near a star boundary.`, `${names.filter((_, i) => lagnaUnknown[i]).join(', ')} — பிறந்த நேரம் தெரியவில்லை; லக்னம் சார்ந்தவை “பிறந்த நேரம் தேவை” எனக் குறிக்கப்பட்டுள்ளன; நட்சத்திர எல்லையில் காரணிகள் மாறலாம்.`));
  return `<div class="card glass match-summary">
      ${header}
      <div class="match-count"><b>${r.agree}</b><span>${L(`of ${r.rows.length} traditional factors agree`, `/ ${r.rows.length} மரபுக் காரணிகள் பொருந்துகின்றன`)}</span></div>
      ${r.partialNote ? `<p class="small muted">(${esc(bi(r.partialNote))})</p>` : ''}
      <p class="small">${esc(bi(r.keyNote))}</p>
      <p class="small muted">${esc(bi(r.note))}</p>
    </div>
    <div class="card glass key-factors"><div class="card-title">🗝️ ${esc(bi(KEY_FACTORS_TITLE))}</div>
      ${r.keyFactors.map(factorRow).join('')}
      <p class="small muted">${L('Many families give these two the most weight; schools differ on their exceptions. Talk them through together.', 'பல குடும்பங்கள் இவ்விரண்டையும் அதிகம் கவனிக்கின்றன; விதிவிலக்குகளில் மரபுகள் வேறுபடுகின்றன. சேர்ந்து பேசுங்கள்.')}</p></div>
    ${birthNotes.length ? `<div class="note-box" role="note">🕰️ ${birthNotes.map(esc).join('<br>')}</div>` : ''}
    <details class="card glass match-detail"><summary><b>📋 ${esc(bi(DETAILED_VIEW_TITLE))}</b> <span class="pill">${L('10 poruthams · doshams', '10 பொருத்தங்கள் · தோஷங்கள்')}</span></summary>
      ${r.rows.map(factorRow).join('')}
      ${doshaBlockHtml({ doshas, names, lagnaUnknown, charts, samyam })}
    </details>`;
}

/** Chevvai / Rahu–Ketu for each chart on its own (exceptions, Moon-only reference, needs-birth-time) and dosha samyam. */
function doshaBlockHtml({ doshas, names, lagnaUnknown = [false, false], charts = [null, null], samyam = null }) {
  return `${doshas ? `<div class="mini-label" style="margin-top:12px">${L('Chevvai & Rahu–Ketu (each chart on its own)', 'செவ்வாய் & ராகு–கேது (ஒவ்வொரு ஜாதகமும் தனியாக)')}</div>
        ${doshas.map((d, i) => doshaPersonHtml(d, names[i], lagnaUnknown[i], charts[i])).join('')}` : ''}
      ${samyam?.length ? `<div class="mini-label" style="margin-top:12px">${L('Dosha samyam (like with like)', 'தோஷ சாம்யம் (ஒன்றுக்கொன்று ஒப்பீடு)')}</div>${samyam.map((n) => `<div class="factor"><span>${esc(bi(n))}<br><small class="muted">${esc(bi(n.comparison))}</small></span></div>`).join('')}` : ''}`;
}

/** Optional practical discussion prompts — no scoring. */
export function discussionHtml() {
  return `<details class="card glass talk-list"><summary><b>🗣️ ${esc(bi(DISCUSSION_TITLE))}</b></summary>
    ${DISCUSSION_TOPICS.map((t) => `<div class="talk-group"><div class="mini-label">${t.icon} ${esc(bi(t.title))}</div><ul>${t.prompts.map((q) => `<li>${esc(bi(q))}</li>`).join('')}</ul></div>`).join('')}
    <p class="small muted">${L('For the two of you — there are no right answers and nothing is scored.', 'உங்கள் இருவருக்காக — சரியான / தவறான பதில் இல்லை; எதற்கும் மதிப்பெண் இல்லை.')}</p></details>`;
}

const bar = (s) => `<span class="gb-bar"><i class="${s >= 66 ? 'strong' : s >= 50 ? 'average' : 'weak'}" style="width:${s}%"></i></span>`;
const areaRows = (areas) => areas.map((x) => `<details class="area-row"><summary><span class="gb-name">${esc(bi(x.name))}</span>${bar(x.score)}<b>${x.score}</b></summary>${x.reasons.map((r) => `<div class="small">• ${esc(bi(r))}</div>`).join('')}</details>`).join('');
const dasaPair = (y, names) => `${esc(bi(names[0]))}: ${GLYPH[y.a.md]}${esc(planetName(y.a.md))}/${esc(planetName(y.a.ad))} · ${esc(bi(names[1]))}: ${GLYPH[y.b.md]}${esc(planetName(y.b.md))}/${esc(planetName(y.b.ad))}`;
function timelineHtml(rows, names) {
  if (!rows.length) return `<div class="card glass"><p class="small">🌿 ${esc(bi(HORIZON_LINES.timeline))}</p></div>`;
  return `<div class="tl">${rows.map((y) => `<details class="tl-year ${y.level}"><summary><b>${y.year}</b><span class="tl-bar"><i style="width:${y.score}%"></i></span><span class="tag ${y.level === 'good' ? 'good' : y.level === 'steady' ? 'warn' : 'bad'}">${y.level === 'good' ? L('Good', 'நன்று') : y.level === 'steady' ? L('Steady', 'நிலை') : L('Care', 'கவனம்')}</span></summary>
    <div class="small muted">${dasaPair(y, names)}</div>${y.themes.map((t) => `<div class="small">${t.kind === 'good' ? '🌟' : '🤍'} ${esc(bi(t))}</div>`).join('') || `<div class="small">${L('An ordinary, steady year.', 'சாதாரணமான, நிலையான ஆண்டு.')}</div>`}</details>`).join('')}</div>`;
}

/** One consistent row per key moment: a month range, a list of year ranges (care) or a gentle line — never a bare dash. */
const yearSpan = (x) => (x.years.length > 1 ? `${x.years[0]}–${x.years[x.years.length - 1]}` : `${x.years[0]}`);
function momentsCss() {
  if (document.getElementById('couple-css')) return;
  const st = document.createElement('style');
  st.id = 'couple-css';
  st.textContent = `
  .moment-row { padding: 9px 0; border-bottom: 1px solid var(--glass-b); }
  .moment-row:last-child { border-bottom: 0; }
  .moment-head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: baseline; gap: 2px 12px; line-height: 1.5; }
  .moment-head b { font-variant-numeric: tabular-nums; text-align: right; margin-left: auto; }
  .moment-row p { margin: 3px 0 0; line-height: 1.5; }
  `;
  document.head.appendChild(st);
}
function momentsHtml(moments) {
  momentsCss();
  return (moments || []).map((x) => {
    const value = x.kind === 'range' ? `${monthYear(x.from)} – ${monthYear(x.to)}`
      : x.kind === 'years' ? x.ranges.map(yearSpan).join(' · ') : '';
    return `<div class="moment-row"><div class="moment-head"><span>${x.icon} ${esc(bi(x.label))}</span>${value ? `<b class="${x.id === 'care' ? 'zero' : 'pos'}">${esc(value)}</b>` : ''}</div>
      ${x.kind !== 'range' && x.line ? `<p class="small muted">${esc(bi(x.line))}</p>` : ''}${x.kind === 'range' && x.note ? `<p class="small muted">${esc(bi(x.note))}</p>` : ''}</div>`;
  }).join('');
}

// ================================================================ MARRIED LIFE
const coupleUi = { wedding: null, ledger: null, ids: null };
const SLOTS = ['bride', 'groom'];
function renderCouple(sec, params = {}) {
  coupleUi.wedding ||= iso(new Date());
  // Prefilled from the quick porutham ("See full five-card report"): both people picked from Family.
  for (const slot of SLOTS) if (params[slot] && adultPool().some((m) => m.id === params[slot])) forms[slot] = { ...(forms[slot] || {}), mode: 'family', memberId: params[slot], gender: slot === 'bride' ? 'female' : 'male' };
  const rerender = () => renderCouple(sec);
  sec.innerHTML = `${subHeader(L('Complete Marriage Porutham', 'முழுமையான திருமணப் பொருத்தம்'), L('Not only 10 poruthams — birth date, time and place of both: papa samyam, dasa sandhi, lagna, the marriage houses, mana porutham and the first years of marriage', '10 பொருத்தம் மட்டுமல்ல — இருவரின் பிறந்த தேதி, நேரம், இடம்: பாப சாம்யம், தசா சந்தி, லக்னம், திருமண பாவங்கள், மனப் பொருத்தம், திருமணத்தின் முதல் ஆண்டுகள்'), 'home')}
    ${personBlock('bride', `👰 ${L('Bride', 'மணமகள்')}`, { gender: 'female', context: true })}
    ${personBlock('groom', `🤵 ${L('Groom', 'மணமகன்')}`, { gender: 'male', context: true })}
    <div class="card glass"><label>${L('Wedding date (done or planned)', 'திருமண தேதி (நடந்தது அல்லது திட்டமிட்டது)')}<input type="date" id="wedDate" value="${esc(coupleUi.wedding)}"></label>
      <button class="btn-gold" id="coupleBtn">💞 ${L('Analyse married life', 'திருமண வாழ்க்கையை ஆய்வு செய்')}</button><p class="err" id="coupleErr"></p></div>
    <div id="coupleOut"></div>`;
  wirePersonBlocks(sec, rerender);
  $('#wedDate').addEventListener('change', (e) => { coupleUi.wedding = e.target.value; });
  $('#coupleBtn').addEventListener('click', () => {
    let bride, groom;
    try { bride = resolve('bride', L('Bride', 'மணமகள்')); groom = resolve('groom', L('Groom', 'மணமகன்')); assertTwoPeople(bride, groom); } catch (e) { $('#coupleErr').textContent = e.message; return; }
    $('#coupleErr').textContent = '';
    $('#coupleOut').innerHTML = '<div class="loader"><i></i><i></i><i></i></div>';
    setTimeout(() => showCouple(bride, groom), 30);
  });
}

/** Each person's chosen marriage context (unselected = not disclosed) — never passed to any calculation. */
const modesFor = () => Object.fromEntries(SLOTS.map((slot) => [slot, { mode: forms[slot]?.ctxMode || 'undisclosed', historyPrivate: !!forms[slot]?.ctxPrivate }]));

/**
 * The traditional-matching report for the two people, built by shared/marriage-context.js. On this phone it is a private
 * look (ephemeral, requester 'self'): nothing is saved or shared until both people's permission is recorded below.
 */
export function coupleMatchingReport(bride, groom, modes = modesFor()) {
  const person = (p, slot) => ({
    id: slot, name: bi(p.name), chart: p.chart, birthDate: p.member?.date, adultConfirmed: true,
    birthTimeCertainty: hasLagna(p.chart) ? (p.chart.timePrecision || 'exact') : 'unknown',
  });
  return buildMatchingReport({ bride: person(bride, 'bride'), groom: person(groom, 'groom'), modes, consent: { ephemeral: true, requesterId: 'self' }, pairId: `${bride.member?.id || 'a'}~${groom.member?.id || 'b'}` });
}

/** Share text: the factor results only; a marriage context is included only when that person chose to disclose it and did not keep it private. */
function shareText(mr, nm) {
  const modes = modesFor();
  const ctx = SLOTS.map((slot, i) => (modes[slot].mode !== 'undisclosed' && !modes[slot].historyPrivate ? `${nm[i]}: ${bi(MARRIAGE_MODES[modes[slot].mode])}` : null)).filter(Boolean);
  const { agree, total } = factorCounts(mr);
  return [`💞 ${nm[0]} · ${nm[1]} — ${L('Thirumana Porutham', 'திருமணப் பொருத்தம்')}`, L(`${agree} of ${total} traditional factors agree`, `${total} மரபுக் காரணிகளில் ${agree} பொருந்துகின்றன`),
    ...mr.traditionalFactorResults.map((f) => `• ${bi(f.name)}: ${bi(f.resultLabel)}`), ...ctx, '', bi(mr.summary.recommendation)].join('\n');
}

function showCouple(bride, groom) {
  const [y, mo, d] = coupleUi.wedding.split('-').map(Number);
  const wedding = new Date(Date.UTC(y, mo - 1, d, 6));
  const names = [bride.name, groom.name];
  const nm = names.map((n) => bi(n));
  const mr = coupleMatchingReport(bride, groom);
  if (mr.status !== 'ok') { $('#coupleOut').innerHTML = `<div class="card glass note-box" role="alert">🌱 ${esc(bi(mr.message))}</div>`; return; }
  const r = marriageReport(bride.chart, groom.chart, { weddingDate: wedding, names });
  // BILLING_ENFORCE: a paid plan, or the one-time Marriage package bought for THIS couple, opens the detail.
  const scope = { pairId: pairKey(bride, groom) };
  const locked = isLocked('matchingReport', { scope });
  const hz = bi(r.reportHorizon.label);
  const lang = ta() ? 'ta' : 'en';
  const houseScore = (h) => (h.available === false || h.score == null ? L('needs birth time', 'பிறந்த நேரம் தேவை') : h.score);
  // Pair consent ledger for this report: each person's own share/export permission (recorded via the checkboxes below).
  coupleUi.ledger = createConsentLedger(mr.pairId);
  coupleUi.ids = [...SLOTS];
  const dosha = doshaBlockHtml({ doshas: [r.doshams.bride, r.doshams.groom], names: nm, lagnaUnknown: [!hasLagna(bride.chart), !hasLagna(groom.chart)], charts: [bride.chart, groom.chart], samyam: r.samyam });
  const timing = { before: `${locked ? lockCard(L(`Supportive periods for the two of you (${hz}) are part of the Personal plan or the Marriage package for this couple.`, `உங்கள் இருவருக்குமான ஆதரவுக் காலங்கள் (${hz}) தனிநபர் திட்டத்தில் அல்லது இந்த ஜோடிக்கான திருமணத் தொகுப்பில் உள்ளன.`), 'matchingReport')
    : `<div class="mini-label">🌟 ${L('Supportive periods for the two of you', 'உங்கள் இருவருக்குமான ஆதரவுக் காலங்கள்')} <span class="pill">${esc(hz)}</span></div>${momentsHtml(r.moments)}`}
    <div class="mini-label" style="margin-top:12px">👣 ${L('Next steps', 'அடுத்த படிகள்')}</div>`,
  after: `<div class="mc-links"><button type="button" class="chip-btn" data-go="muhurtham">🗓️ ${L('Find a wedding muhurtham', 'திருமண முகூர்த்தம் தேடு')}</button></div>` };
  $('#coupleOut').innerHTML = `
    ${summaryHtml(mr, { lang, keyNote: r.porutham.keyNote, header: `<div class="muted small">${esc(nm[0])} (${esc(nakName(bride.chart.janmaNakshatra.index))}) · ${esc(nm[1])} (${esc(nakName(groom.chart.janmaNakshatra.index))})</div>` })}
    ${resultCardsHtml(mr, { lang, slots: { traditional: dosha, next_steps: timing }, open: ['traditional'] })}
    ${ashtakootaLinkHtml(lang)}
    <details class="card glass match-detail mc-expert"><summary><b>📋 ${L('Expert view', 'நிபுணர் பார்வை')}</b> <span class="pill">${L('full detail', 'முழு விவரம்')}</span></summary>
      <div class="note-box" role="note">${L('A traditional interpretation to support a family conversation — not a judgement of anyone’s worth or suitability, and no guarantee of how a marriage will go. Health is never judged from a chart: a pre-marriage medical check-up is the reliable way.', 'குடும்ப உரையாடலுக்கு உதவும் பாரம்பரிய விளக்கம் மட்டுமே — யாருடைய மதிப்பையோ தகுதியையோ தீர்மானிப்பதல்ல; திருமணம் எப்படி அமையும் என்பதற்கான உத்தரவாதமும் அல்ல. உடல்நலம் ஜாதகத்திலிருந்து மதிப்பிடப்படாது; திருமணத்திற்கு முன் மருத்துவப் பரிசோதனையே நம்பகமானது.')}</div>
      <div class="mini-label" style="margin-top:12px">🛡️ ${L('Beyond the 10 poruthams', '10 பொருத்தத்திற்கும் மேலான ஆய்வு')}</div>
      ${r.deep.checks.map((c) => `<div class="deep-row"><span>${c.ok ? '✅' : '🟡'} <b>${esc(bi(c.name))}</b><br><small class="muted">${esc(bi(c.note))}</small></span></div>`).join('')}
      ${(r.deep.needsBirthTime || []).length ? `<div class="deep-row"><span>🕰️ <b>${L('Lagna porutham and the marriage houses', 'லக்னப் பொருத்தம், திருமண பாவங்கள்')}</b> ${NEEDS_TIME_TAG()}</span></div>` : ''}
      ${locked ? lockCard(L(`Mana porutham, the marriage houses and the year-by-year timeline (${hz}) are part of the Personal plan or the Marriage package for this couple.`, `மனப் பொருத்தம், திருமண பாவங்கள், ஆண்டுவாரிக் காலவரிசை (${hz}) தனிநபர் திட்டத்தில் அல்லது இந்த ஜோடிக்கான திருமணத் தொகுப்பில் உள்ளன.`), 'matchingReport') : `
      <div class="mini-label" style="margin-top:12px">💗 ${L('Mana Porutham — mind & life compatibility', 'மனப் பொருத்தம் — மனமும் வாழ்க்கையும்')}</div>${areaRows(r.mana.areas)}
      ${r.mana.karmic ? `<p class="small">✨ ${L('Rahu/Ketu link your charts — tradition calls this a karmic bond; keep honesty and shared prayer at the centre.', 'ராகு/கேது உங்கள் ஜாதகங்களை இணைக்கிறது — மரபு இதைக் கர்ம பந்தம் என்கிறது; நேர்மையும் சேர்ந்த வழிபாடும் மையமாக இருக்கட்டும்.')}</p>` : ''}
      ${r.strengths.length ? `<p class="small">💪 <b>${L('Strengths', 'பலங்கள்')}:</b> ${r.strengths.map((x) => esc(bi(x))).join(', ')}</p>` : ''}${r.challenges.length ? `<p class="small">🌱 <b>${L('Grow together in', 'சேர்ந்து வளர வேண்டியவை')}:</b> ${r.challenges.map((x) => esc(bi(x))).join(', ')}</p>` : ''}
      <div class="mini-label" style="margin-top:12px">🏠 ${L('Marriage houses of each person', 'ஒவ்வொருவரின் திருமண பாவங்கள்')}</div>
      ${r.deep.houses.bride.map((h, i) => { const g = r.deep.houses.groom[i]; return `<details class="area-row"><summary><span class="gb-name">${esc(bi(h.name))}</span><small>👰 ${houseScore(h)} · 🤵 ${houseScore(g)}</small></summary><div class="small"><b>${esc(nm[0])}</b></div>${h.notes.map((x) => `<div class="small">• ${esc(bi(x))}</div>`).join('')}<div class="small"><b>${esc(nm[1])}</b></div>${g.notes.map((x) => `<div class="small">• ${esc(bi(x))}</div>`).join('')}</details>`; }).join('')}
      <p class="small">⚖️ ${L('Papa samyam points', 'பாப சாம்யப் புள்ளிகள்')}: 👰 ${r.deep.papa.bride.total} · 🤵 ${r.deep.papa.groom.total}</p>
      <div class="mini-label" style="margin-top:12px">📅 ${L('Year by year', 'ஆண்டுவாரியாக')} — ${esc(hz)}</div>${timelineHtml(r.timeline, names)}
      <div class="mini-label" style="margin-top:12px">🪔 ${L('Optional practices for the couple', 'தம்பதியருக்கான விருப்ப வழிபாடுகள்')}</div>${r.remedies.map((x) => `<p class="small">• ${esc(bi(x))}</p>`).join('')}`}
      <div class="mini-label" style="margin-top:12px">❓ ${L('Questions to ask an astrologer', 'ஜோதிடரிடம் கேட்க வேண்டியவை')}</div>
      <ul class="mc-prompts">${mr.expertReviewQuestions.filter((q) => !q.expertApprovalPending).map((q) => `<li>${esc(bi(q))}</li>`).join('')}</ul>
      <p class="small muted">ℹ️ ${esc(bi(mr.calculationEvidence.method))}</p>
      ${locked ? '' : `<button class="btn-gold" id="coupleRead">📜 ${L('Detailed explanation', 'விரிவான விளக்கம்')}</button>
      <div class="card glass" id="coupleAi" hidden><div class="card-title"><span>📜 ${L('Reading', 'பலன்')}</span><button class="link-btn" id="coupleSpeak" aria-label="Read aloud">🔊</button></div><div class="reply" id="coupleText"></div></div>`}
    </details>
    <div class="card glass mc-share"><div class="card-title">🔒 ${L('Share or print this report', 'இந்த அறிக்கையைப் பகிர் அல்லது அச்சிடு')}</div>
      <p class="small muted">${L('Only after both people agree. A marriage context marked private is never included.', 'இருவரும் ஒப்புக்கொண்ட பின்பே. தனிப்பட்டதாகக் குறித்த திருமண நிலை ஒருபோதும் சேர்க்கப்படாது.')}</p>
      ${SLOTS.map((slot, i) => permissionCheckbox(`mcPerm_${slot}`, `${nm[i]}: ${PERMISSION_LABEL()}`)).join('')}
      <div class="mc-links"><button type="button" class="btn-gold" id="mcShare">📤 ${L('Share summary', 'சுருக்கத்தைப் பகிர்')}</button><button type="button" class="chip-btn" id="mcPrint">🖨️ ${L('Print / PDF', 'அச்சிடு / PDF')}</button></div></div>
    <p class="muted small center">${L('Marriage is made by love, respect and effort; astrology shows the seasons so you can prepare together.', 'திருமணம் அன்பு, மரியாதை, முயற்சியால் நிலைக்கிறது; ஜோதிடம் பருவங்களைக் காட்டி சேர்ந்து தயாராக உதவுகிறது.')}</p>`;
  // Each checkbox is that person's own permission in the pair ledger; unticking revokes it.
  SLOTS.forEach((slot) => $(`#mcPerm_${slot}`)?.addEventListener('change', (e) => {
    coupleUi.ledger = e.target.checked
      ? recordConsent(coupleUi.ledger, { participantId: slot, scopes: ['share', 'export'] })
      : revokeConsent(coupleUi.ledger, { participantId: slot, scopes: ['share', 'export'] });
    if (e.target.checked) $(`#mcPerm_${slot}Err`).hidden = true;
  }));
  /** hasConsent before any share / print: shows the first missing person's permission line. */
  const consented = (scope) => {
    if (hasConsent(coupleUi.ledger, coupleUi.ids, scope)) return true;
    const miss = coupleUi.ids.find((id) => !hasConsent(coupleUi.ledger, [id], scope));
    $(`#mcPerm_${miss}Err`).hidden = false;
    $(`#mcPerm_${miss}`)?.focus();
    return false;
  };
  $('#mcShare').addEventListener('click', () => {
    if (!consented('share')) return;
    const text = shareText(mr, nm);
    if (navigator.share) { navigator.share({ text }).catch(() => {}); return; }
    navigator.clipboard?.writeText(text).then(() => toast(L('Copied', 'நகலெடுக்கப்பட்டது'))).catch(() => {});
  });
  $('#mcPrint').addEventListener('click', () => {
    if (!consented('export')) return;
    if (!gate('printReports', { scope, near: $('#mcPrint') })) return; // BILLING_ENFORCE: paid plan or this couple's package
    // Print every section, then fold back the ones that were closed; printPage also prints natively in the Android app.
    const closed = $$('#coupleOut details').filter((x) => !x.open);
    closed.forEach((x) => { x.open = true; });
    addEventListener('afterprint', () => closed.forEach((x) => { x.open = false; }), { once: true });
    printPage(L('Marriage matching', 'திருமணப் பொருத்தம்'));
  });
  $('#coupleRead')?.addEventListener('click', async () => {
    $('#coupleAi').hidden = false;
    const t = $('#coupleText');
    t.classList.add('typing');
    // The marriage context is never sent to the reading: it is not an astrological input.
    const context = {
      bride: { name: bride.member?.name || names[0].en, star: bride.chart.janmaNakshatra.name, rasi: bride.chart.janmaRasi.name, lagna: bride.chart.lagna?.rasiName },
      groom: { name: groom.member?.name || names[1].en, star: groom.chart.janmaNakshatra.name, rasi: groom.chart.janmaRasi.name, lagna: groom.chart.lagna?.rasiName },
      weddingDate: coupleUi.wedding, reportHorizon: r.reportHorizon.label.en, poruthamFactorsAgree: `${r.porutham.agree} of ${r.porutham.rows.length}`, keyFactors: r.porutham.keyFactors.map((k) => `${k.en}: ${k.label.en}`),
      manaPorutham: r.mana.areas.map((x) => x.name.en),
      doshaSamyam: r.samyam.map((n) => n.en), deepChecks: r.deep.checks.map((c) => `${c.name.en}: ${c.ok ? 'ok' : 'care'} — ${c.note.en}`),
      goodYears: r.goodYears.map((x) => x.year), careYears: r.careYears.map((x) => ({ year: x.year, why: x.themes.filter((th) => th.kind === 'care').map((th) => th.en) })),
    };
    await aiTask({ task: 'chat', context, messages: [{ role: 'user', content: `Give a warm, honest married-life reading for this couple for the ${r.reportHorizon.label.en.toLowerCase()}: how their bond grows, home and money, the years that need extra care and exactly how to handle them, and simple optional practices. No verdict, no score, no prediction about children, health, lifespan or fidelity. Be positive and practical; never frighten. About 300 words.` }],
      fallbackText: [bi(r.porutham.summary), ...r.timeline.slice(0, 10).map((x) => `${x.year}: ${x.themes.map((th) => bi(th)).join(' · ') || L('steady', 'நிலையானது')}`)].join('\n'), onText: (tx) => { t.textContent = tx; } });
    t.classList.remove('typing');
  });
  $('#coupleSpeak')?.addEventListener('click', () => speak($('#coupleText').textContent));
  $('#coupleOut').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
registerScreen('couple', { render: renderCouple, parent: 'home' });

// ================================================================ BUSINESS PARTNERS
const bizUi = { start: null, companyId: '' };
function renderPartners(sec) {
  bizUi.start ||= iso(new Date());
  const rerender = () => renderPartners(sec);
  const orgs = state.family.filter((m) => m.relation === 'organization');
  sec.innerHTML = `${subHeader(L('Business Partner Porutham', 'வணிகக் கூட்டாளி பொருத்தம்'), L('Before you invest together — trust, roles, money and the first 15 years', 'சேர்ந்து முதலீடு செய்யும் முன் — நம்பிக்கை, பொறுப்புகள், பணம், முதல் 15 ஆண்டுகள்'))}
    ${personBlock('p1', `🤝 ${L('Partner 1', 'கூட்டாளி 1')}`, { business: true })}
    ${personBlock('p2', `🤝 ${L('Partner 2', 'கூட்டாளி 2')}`, { nth: 1, business: true })}
    <div class="card glass">
      ${orgs.length ? `<label>${L('Company (optional)', 'நிறுவனம் (விருப்பம்)')}<select id="bizCo"><option value="">—</option>${orgs.map((o) => `<option value="${esc(o.id)}"${o.id === bizUi.companyId ? ' selected' : ''}>${esc(displayName(o))}</option>`).join('')}</select></label>` : `<p class="muted small">${L('Tip: add the company under Family as "Company / Team" with its founding date to include it.', 'குறிப்பு: நிறுவனத்தை "நிறுவனம் / குழு" ஆக அதன் தொடக்கத் தேதியுடன் குடும்பத்தில் சேர்த்தால் அதுவும் கணக்கில் வரும்.')}</p>`}
      <label>${L('Partnership start (done or planned)', 'கூட்டுத் தொடக்கம் (நடந்தது அல்லது திட்டமிட்டது)')}<input type="date" id="bizStart" value="${esc(bizUi.start)}"></label>
      <button class="btn-gold" id="bizBtn">📈 ${L('Analyse partnership', 'கூட்டை ஆய்வு செய்')}</button><p class="err" id="bizErr"></p></div>
    <div id="bizOut"></div>`;
  wirePersonBlocks(sec, rerender);
  $('#bizStart').addEventListener('change', (e) => { bizUi.start = e.target.value; });
  $('#bizCo')?.addEventListener('change', (e) => { bizUi.companyId = e.target.value; });
  $('#bizBtn').addEventListener('click', () => {
    let a, b;
    try { a = resolve('p1', L('Partner 1', 'கூட்டாளி 1')); b = resolve('p2', L('Partner 2', 'கூட்டாளி 2')); assertTwoPeople(a, b); } catch (e) { $('#bizErr').textContent = e.message; return; }
    $('#bizErr').textContent = '';
    $('#bizOut').innerHTML = '<div class="loader"><i></i><i></i><i></i></div>';
    setTimeout(() => showPartners(a, b), 30);
  });
}

function showPartners(a, b) {
  const [y, mo, d] = bizUi.start.split('-').map(Number);
  const start = new Date(Date.UTC(y, mo - 1, d, 6));
  const co = state.family.find((m) => m.id === bizUi.companyId);
  const names = [a.name, b.name];
  const r = partnershipReport(a.chart, b.chart, { startDate: start, names, company: co ? birthChart(co) : null });
  const locked = isLocked('predictions');
  const hz = bi(r.reportHorizon.label);
  const who = (x) => (x === 'both' ? L('Both', 'இருவரும்') : esc(bi(names[x === 'a' ? 0 : 1])));
  $('#bizOut').innerHTML = `
    <div class="card glass match-summary"><div class="muted small">${esc(bi(names[0]))} · ${esc(bi(names[1]))}${co ? ` · 🏢 ${esc(displayName(co))}` : ''}</div>
      <div class="match-count"><b>${r.supportive}</b><span>${L(`of ${r.areas.length} traditional areas look supportive`, `/ ${r.areas.length} மரபுப் பகுதிகள் ஆதரவாக உள்ளன`)}</span></div>
      <p class="small">${L('Each area is shown on its own — written agreements and clear roles matter in every partnership.', 'ஒவ்வொரு பகுதியும் தனியாகக் காட்டப்படுகிறது — எல்லாக் கூட்டுக்கும் எழுத்து ஒப்பந்தமும் தெளிவான பொறுப்புகளும் முக்கியம்.')}</p></div>
    <div class="card glass"><div class="card-title">🤝 ${L('Compatibility areas', 'பொருத்தப் பகுதிகள்')}</div>${areaRows(r.areas)}</div>
    <div class="card glass"><div class="card-title">🧩 ${L('Who suits which role', 'யாருக்கு எந்தப் பொறுப்பு')}</div>
      ${r.roles.map((x) => `<div class="factor"><span>${esc(bi(x))}<br><small class="muted">${esc(bi(names[0]))} ${x.a} · ${esc(bi(names[1]))} ${x.b}</small></span><b class="pos">${who(x.best)}</b></div>`).join('')}</div>
    ${locked ? lockCard(L(`The partnership timeline (${hz}) and growth periods are part of the Personal plan.`, `கூட்டுக் காலவரிசையும் (${hz}) வளர்ச்சிக் காலங்களும் தனிநபர் திட்டத்தில் உள்ளன.`)) : `
    <div class="card glass"><div class="card-title">🚀 ${L('Growth periods both charts agree on', 'இரு ஜாதகமும் ஒப்புக்கொள்ளும் வளர்ச்சிக் காலம்')}</div>
      ${r.growth.length ? r.growth.slice(0, 4).map((w) => `<div class="best">🌟 ${monthYear(w.from)} – ${monthYear(w.to)}</div>`).join('') : `<p class="small">${r.timeline.some((x) => x.level === 'good') ? `${L('Best years from the timeline below', 'கீழே உள்ள காலவரிசையின் சிறந்த ஆண்டுகள்')}: ${r.timeline.filter((x) => x.level === 'good').map((x) => x.year).join(', ')}` : esc(bi(HORIZON_LINES.windows))}</p>`}
      ${r.companyNote ? `<p class="small">🏢 ${L('Company chart: 10th house', 'நிறுவன ஜாதகம்: 10-ம் பாவம்')} ${r.companyNote.tenth}, ${L('11th (profits)', '11-ம் (லாபம்)')} ${r.companyNote.eleventh}</p>` : ''}</div>
    <div class="section-title">📅 ${L('Year by year', 'ஆண்டுவாரியாக')} — ${esc(hz)}</div>${timelineHtml(r.timeline, names)}`}
    <div class="card glass"><div class="card-title">📜 ${L('Guidance for a lasting partnership', 'நீடித்த கூட்டுக்கான வழிகாட்டல்')}</div>${r.guidance.map((x) => `<p class="small">• ${esc(bi(x))}</p>`).join('')}
      <button class="chip-btn" data-go="muhurtham">🗓️ ${L('Find a muhurtham to sign', 'கையெழுத்திட முகூர்த்தம்')}</button></div>
    <p class="muted small center">${L('Use this with legal and financial advice; astrology guides timing and temperament.', 'சட்ட, நிதி ஆலோசனையுடன் பயன்படுத்தவும்; ஜோதிடம் நேரத்தையும் சுபாவத்தையும் காட்டும்.')}</p>`;
  $('#bizOut').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
registerScreen('partners', { render: renderPartners, parent: 'home' });

export { rasiName, fmtIsoDate };
