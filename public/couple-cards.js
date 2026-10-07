// Pure HTML builders for the five-card marriage report (owner §6 / §1h). No DOM and no core.js, so the node tests can
// render them (test/safeguards-marriage.test.js). Input is a shared/marriage-context.js buildMatchingReport() result.
//  • Every card is an icon AND a text title — meaning never rests on an icon or a colour.
//  • The 10 poruthams, the dosha checks and the uncertainty notes sit in card 1; Ashtakoota is a separate link.
//  • No overall score, no percentage and no marry / don't-marry wording anywhere.
import { icon } from './icons.js';

const T = (en, ta) => ({ en, ta });
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
const pick = (o, lang) => (o == null ? '' : typeof o === 'string' ? o : lang === 'ta' ? o.ta : o.en);

const STATUS_MARK = { uttamam: '✅', madhyamam: '🟡', poruthamillai: '⚪' };
const STATUS_CLASS = { uttamam: 'pos', madhyamam: 'zero', poruthamillai: 'neg' };

export const CARD_UI = {
  optional: T('Optional', 'விருப்பம்'),
  optionalNote: T('Talk about any of these only if you both want to — nothing is scored or saved.', 'நீங்கள் இருவரும் விரும்பினால் மட்டும் பேசுங்கள் — எதற்கும் மதிப்பெண் இல்லை, எதுவும் சேமிக்கப்படாது.'),
  keyFactors: T('Key factors many families weigh most', 'பல குடும்பங்கள் அதிகம் கவனிக்கும் முக்கியக் காரணிகள்'),
  otherFactors: T('The other eight poruthams', 'மற்ற எட்டுப் பொருத்தங்கள்'),
  uncertainty: T('What is uncertain', 'உறுதியில்லாதவை'),
  agreeOf: (n, total) => T(`of ${total} traditional factors agree`, `/ ${total} மரபுக் காரணிகள் பொருந்துகின்றன`),
  standsAlone: T('Each factor stands on its own. There is no overall score — the decision rests with the two of you and your families.', 'ஒவ்வொரு காரணியும் தனித்தனியானது. மொத்த மதிப்பெண் இல்லை — முடிவு நீங்கள் இருவரும் உங்கள் குடும்பங்களும் எடுப்பது.'),
  ashtaTitle: T('36-point Ashtakoota (North Indian method)', '36-புள்ளி அஷ்டகூடம் (வட இந்திய முறை)'),
  ashtaNote: T('A separate tradition with its own points. It is shown on its own page and is never added to the 10 poruthams.', 'தனி மரபு, அதன் சொந்தப் புள்ளிகள். தனிப் பக்கத்தில் காட்டப்படுகிறது; 10 பொருத்தங்களுடன் ஒருபோதும் கூட்டப்படுவதில்லை.'),
  ashtaOpen: T('Open Ashtakoota separately', 'அஷ்டகூடத்தைத் தனியாகத் திற'),
};

const CARD_NUMBER = { traditional: 1, expectations: 2, money: 3, family: 4, next_steps: 5 };

/** Counts from the ten factor results (same rule as porutham.js: anything but "does not agree" agrees). */
export function factorCounts(report) {
  const rows = report?.traditionalFactorResults || [];
  return { total: rows.length, agree: rows.filter((f) => f.result !== 'poruthamillai').length, partly: rows.filter((f) => f.result === 'madhyamam').length };
}

/** One porutham: status mark + name + text label (never colour only), the calculation detail and its basis. */
export function factorRowHtml(f, lang) {
  return `<div class="factor match-factor mc-factor" data-factor="${esc(f.factorId)}" data-result="${esc(f.result)}"><span>${STATUS_MARK[f.result] || '⚪'} <b>${esc(pick(f.name, lang))}</b> <b class="mf-label ${STATUS_CLASS[f.result] || 'zero'}">${esc(pick(f.resultLabel, lang))}</b>
    ${f.calculationDetail ? `<br><small class="muted">${esc(pick(f.calculationDetail, lang))}</small>` : ''}<br><small class="muted">ℹ️ ${esc(pick(f.calculationBasis, lang))}</small></span></div>`;
}

/** Card 1 body: Rajju / Vedhai first as key factors, the other eight, the dosha slot, then the uncertainty notes. */
export function traditionalBodyHtml(report, lang, doshaHtml = '') {
  const rows = report.traditionalFactorResults || [];
  const key = rows.filter((f) => f.expertReview), rest = rows.filter((f) => !f.expertReview);
  const limits = [...new Set(rows.map((f) => pick(f.birthDataLimitation, lang)).filter(Boolean))];
  const unc = [...limits, ...(report.uncertainty || []).map((u) => pick(u, lang))];
  return `<div class="mc-sub key-factors"><div class="mini-label">🗝️ ${esc(pick(CARD_UI.keyFactors, lang))}</div>${key.map((f) => factorRowHtml(f, lang)).join('')}</div>
    <div class="mc-sub"><div class="mini-label">${esc(pick(CARD_UI.otherFactors, lang))}</div>${rest.map((f) => factorRowHtml(f, lang)).join('')}</div>
    ${doshaHtml ? `<div class="mc-sub mc-dosha">${doshaHtml}</div>` : ''}
    ${unc.length ? `<div class="note-box mc-unc" role="note"><b>🕰️ ${esc(pick(CARD_UI.uncertainty, lang))}</b><ul>${unc.map((u) => `<li>${esc(u)}</li>`).join('')}</ul></div>` : ''}`;
}

/** Short summary at the top: names line, "N of 10 traditional factors agree", one key-factor line, no score. */
export function summaryHtml(report, { lang, header = '', keyNote = null } = {}) {
  const { total, agree, partly } = factorCounts(report);
  return `<div class="card glass match-summary mc-summary">${header}
    <div class="match-count"><b>${agree}</b><span>${esc(pick(CARD_UI.agreeOf(agree, total), lang))}</span></div>
    ${partly ? `<p class="small muted">(${esc(lang === 'ta' ? `அவற்றில் ${partly} ஓரளவு` : `${partly} of them partly`)})</p>` : ''}
    ${keyNote ? `<p class="small">${esc(pick(keyNote, lang))}</p>` : ''}
    <p class="small muted">${esc(pick(CARD_UI.standsAlone, lang))}</p></div>`;
}

/** A slot is HTML (placed after the prompts) or { before, after }. */
const slotPart = (slot, where) => (slot == null ? '' : typeof slot === 'string' ? (where === 'after' ? slot : '') : slot[where] || '');

/**
 * The five result cards (plus the optional remarriage card when a person chose to share it) as <details> elements:
 * icon chip + numbered text title + one-line summary; the body holds the factors (card 1) or the optional prompts.
 * slots: extra HTML per cardId — a string (after the prompts) or { before, after } (traditional: dosha checks;
 * next_steps: supportive periods before, links after). open: cardIds open.
 */
export function resultCardsHtml(report, { lang, slots = {}, open = ['traditional'] } = {}) {
  return `<div class="mc-cards">${(report.cards || []).map((c) => {
    const n = CARD_NUMBER[c.cardId];
    const prompts = c.cardId === 'traditional' ? '' : (c.prompts || []).map((q) => `<li>${esc(pick(q, lang))}</li>`).join('');
    const body = c.cardId === 'traditional'
      ? traditionalBodyHtml(report, lang, slots.traditional || '') // its prompt repeats the summary's "decision rests with you" line
      : `${slotPart(slots[c.cardId], 'before')}${prompts ? `<ul class="mc-prompts">${prompts}</ul>` : ''}${c.optional ? `<p class="small muted">${esc(pick(CARD_UI.optionalNote, lang))}</p>` : ''}${slotPart(slots[c.cardId], 'after')}`;
    return `<details class="card glass mc-card" data-card="${esc(c.cardId)}"${open.includes(c.cardId) ? ' open' : ''}>
      <summary><span class="ic-chip ic-match mc-ic" title="${esc(pick(c.iconLabel, lang))}">${icon(c.iconName || 'scroll-text', { size: 22 })}</span>
        <span class="mc-head"><b class="mc-title">${n ? `${n}. ` : ''}${esc(pick(c.title, lang))}</b>${c.optional ? ` <span class="pill">${esc(pick(CARD_UI.optional, lang))}</span>` : ''}
        <small class="muted mc-sum">${esc(pick(c.summary, lang))}</small></span></summary>
      <div class="mc-body">${body}</div></details>`;
  }).join('')}</div>`;
}

/** Ashtakoota as its own clearly separate section with a link to its own page — never combined with the poruthams. */
export function ashtakootaLinkHtml(lang) {
  return `<div class="card glass mc-ashta"><div class="mc-ashta-row"><span class="ic-chip ic-match mc-ic">${icon('calculator', { size: 22 })}</span>
    <span><b>${esc(pick(CARD_UI.ashtaTitle, lang))}</b><br><small class="muted">${esc(pick(CARD_UI.ashtaNote, lang))}</small></span></div>
    <button type="button" class="chip-btn" data-go="gunamilan">${esc(pick(CARD_UI.ashtaOpen, lang))}</button></div>`;
}
