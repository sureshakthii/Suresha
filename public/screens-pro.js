// Thunai Pro (the Personal plan) — the page a "related question" opens, and the Responsible Astrology Charter.
//
// Conversion design (docs/PRO-CONVERSION.md): the person has just seen a useful free answer; the page shows the
// deeper question they chose, the facts ALREADY worked out from their own chart, an outline of the complete answer,
// an honest per-day price and a one-tap activation. No fear, no countdown, no invented numbers, a plain "Not now".
import { state, $, L, esc, bi, STATIC, registerScreen, subHeader, go, activeMember, chartOf, displayName, nakName, rasiName, planetName, BRAND, copyright } from './core.js';
import { reliabilityOf, ageOf } from './screens-main.js';
import { chartFacts } from './shared/guidance.js';
import { relatedById, preparedFacts, priceFrame } from './shared/pro-questions.js';
import { DISCLAIMER, CHARTER, PRINCIPLE, UPGRADE_LINE } from './shared/responsible.js';
import { track, isLocked } from './growth.js';
import { loadPlans, buy, priceCountry } from './screens-plans.js';
import { formatPrice } from './shared/currency.js';
import { fmtDay } from './shared/fmt.js';
import { icon } from './icons.js';

const lgx = () => (state.lang === 'en' ? 'en' : 'ta');
const tag = (v) => String(v || '').replace(/[^\w./:-]/g, '_').slice(0, 60);

/** Does this person already have the detailed answers (paid plan), so the question can go straight to Ask Thunai? */
export const hasPro = () => Boolean(state.billing?.entitlements?.predictions) || (Boolean(state.billing?.enforced) && !isLocked('predictions'));

/** Facts already computed for the active person (true values from the engine, shown as "ready"). */
function personFacts(m) {
  try {
    const rel = reliabilityOf(m);
    const c = chartOf(m);
    const f = chartFacts(c, rel);
    const day = (iso) => (iso ? fmtDay(iso, lgx()) : '');
    return preparedFacts({
      star: rel.nakshatra ? nakName(c.janmaNakshatra.index) : '',
      rasi: rel.rasi !== false ? rasiName(c.janmaRasi.index) : '',
      lagna: rel.lagna ? rasiName(c.planets.Lagna.rasi) : '',
      dasa: f?.dasa ? planetName(f.dasa.lord) : '', dasaEnd: day(f?.dasa?.end),
      bhukti: f?.bhukti ? planetName(f.bhukti.lord) : '', bhuktiEnd: day(f?.bhukti?.end),
    }, lgx());
  } catch { return []; }
}

function renderPro(sec, params = {}) {
  const item = relatedById(params.id);
  const q = item ? bi(item.q) : String(params.q || '');
  const m = activeMember();
  const adult = m && m.relation !== 'organization' && ageOf(m).adult;
  // Never an upsell for a child or teen profile, or without a question: go back to Ask Thunai.
  if (!q || !adult) { go('chat', q ? { q } : {}); return; }
  if (hasPro()) { go('chat', item ? { q, id: item.id } : { q }); return; }
  track('pro_view', { feature: tag(item?.id || 'question') });
  const ready = personFacts(m);
  const testing = STATIC || !state.billing?.enforced; // test builds: everything is open, so the page says so honestly
  sec.innerHTML = `${subHeader(L('Your complete answer', 'உங்கள் முழுமையான பதில்'), '', 'chat')}
    <div class="card glass pro-q"><span class="pro-arrow" aria-hidden="true">↳</span><b>${esc(q)}</b></div>
    ${ready.length ? `<section class="card glass pro-ready" aria-labelledby="proReady">
      <div class="card-title" id="proReady">✅ ${L(`Already prepared from ${esc(displayName(m))}’s chart`, `${esc(displayName(m))} அவர்களின் ஜாதகத்திலிருந்து தயார்`)}</div>
      <ul class="pro-list ok">${ready.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></section>` : ''}
    ${item ? `<section class="card glass pro-locked" aria-labelledby="proLocked">
      <div class="card-title" id="proLocked">🔒 ${L('Your complete answer will explain', 'முழுமையான பதில் விளக்குவது')}</div>
      <ol class="pro-list">${item.covers.map((c) => `<li>${esc(bi(c))}</li>`).join('')}</ol>
      <div class="pro-fade" aria-hidden="true"><span></span><span></span><span></span></div>
      <p class="small muted">${L('Every point comes with the chart reason, dates from the calculation engine and a practical checklist.', 'ஒவ்வொரு கருத்தும் ஜாதகக் காரணம், கணிப்பு இயந்திரத் தேதிகள், நடைமுறைப் பட்டியலுடன்.')}</p></section>` : ''}
    <section class="card glass pro-offer" id="proOffer" aria-labelledby="proOfferT">
      <div class="card-title" id="proOfferT">👑 ${L(`${BRAND.name} Pro`, `${BRAND.nameTa} Pro`)} <span class="small muted">· ${L(BRAND.personalEn, BRAND.personalTa)}</span></div>
      <p>${esc(bi(UPGRADE_LINE))}</p>
      <ul class="pro-list ok small">
        <li>${L('Complete answers to deeper questions like this one', 'இது போன்ற ஆழமான கேள்விகளுக்கு முழுமையான பதில்கள்')}</li>
        <li>${L('Full chart analysis, life-timing periods and detailed matching', 'முழு ஜாதக ஆய்வு, வாழ்க்கை நேரக் காலங்கள், விரிவான பொருத்தம்')}</li>
        <li>${L('Printable reports and the full Daily Ithihasa', 'அச்சிடக்கூடிய அறிக்கைகள், முழு தினசரி இதிகாசம்')}</li>
      </ul>
      <div id="proPrice" class="pro-price">${testing ? '' : '<div class="loader"><i></i><i></i><i></i></div>'}</div>
      ${testing
    ? `<p class="note-box small">${L('Thunai is in testing: Pro answers are open to everyone for now, and nothing is charged.', 'துணை சோதனையில் உள்ளது: இப்போது Pro பதில்கள் அனைவருக்கும் திறந்தவை; எந்தக் கட்டணமும் இல்லை.')}</p>
        <button class="btn-gold pro-cta" type="button" data-pro-go>${L('See my complete answer', 'என் முழுமையான பதிலைப் பார்')}</button>`
    : `<button class="btn-gold pro-cta" type="button" data-pro-buy="personal_year">${L('Activate Pro & see my answer', 'Pro-வைச் செயல்படுத்திப் பதிலைப் பார்')}</button>
        <button class="chip-btn center-block" type="button" data-pro-buy="personal_month">${L('Or pay monthly', 'அல்லது மாதாந்திரம்')}</button>`}
      <ul class="pro-trust small muted">
        <li>${L('Cancel any time; one-time packages never renew', 'எப்போதும் ரத்து செய்யலாம்; ஒருமுறைத் தொகுப்புகள் புதுப்பிக்கப்படாது')}</li>
        <li>${L('Same calculations, safety rules and privacy on every plan', 'எல்லாத் திட்டங்களிலும் அதே கணிப்பு, பாதுகாப்பு, தனியுரிமை')}</li>
        <li>${L('Your free daily guidance stays free', 'இலவச தினசரி வழிகாட்டல் இலவசமாகவே தொடரும்')}</li>
      </ul>
      <button class="link-btn center-block" type="button" data-back="chat">${L('Not now', 'இப்போது வேண்டாம்')}</button>
    </section>
    <p class="small muted pro-disc">ℹ️ ${esc(bi(DISCLAIMER))}</p>
    ${copyright()}`;
  $('[data-pro-go]', sec)?.addEventListener('click', () => { track('pro_cta', { feature: tag(item?.id || 'question') }); go('chat', item ? { q, id: item.id } : { q }); });
  if (testing) return;
  const { cc: country } = priceCountry();
  loadPlans(country).then(({ plans, currency }) => {
    const pm = plans.find((p) => p.id === 'personal_month'), py = plans.find((p) => p.id === 'personal_year');
    const fr = priceFrame(pm?.amount, py?.amount);
    const box = $('#proPrice', sec);
    if (!box || !py) return;
    box.innerHTML = `<div class="pro-price-main"><b>${formatPrice(py.amount, currency)}</b> <span class="muted">/ ${L('year', 'ஆண்டு')}</span></div>
      ${fr ? `<div class="small">${L(`About ${formatPrice(fr.perDay, currency)} a day`, `நாளொன்றுக்குச் சுமார் ${formatPrice(fr.perDay, currency)}`)}${fr.saving > 0 ? ` · <span class="tag good">${L(`Save ${formatPrice(fr.saving, currency)} vs monthly`, `மாதாந்திரத்தை விட ${formatPrice(fr.saving, currency)} சேமிப்பு`)}</span>` : ''}</div>` : ''}
      ${pm ? `<div class="small muted">${L('Monthly', 'மாதாந்திரம்')}: ${formatPrice(pm.amount, currency)}</div>` : ''}`;
    sec.querySelectorAll('[data-pro-buy]').forEach((b) => b.addEventListener('click', () => {
      track('pro_cta', { feature: tag(`${item?.id || 'question'}:${b.dataset.proBuy}`) });
      try { sessionStorage.setItem('kj_pro_then', q); } catch { /* storage blocked: Plans opens after paying */ }
      buy(b.dataset.proBuy, country, currency);
    }));
  }).catch(() => { const box = $('#proPrice', sec); if (box) box.innerHTML = `<button class="chip-btn" data-go="plans">${L('See plans', 'திட்டங்களைப் பார்')}</button>`; });
}
registerScreen('pro', { render: renderPro, parent: 'chat' });

// ---------------------------------------------------------------- Responsible Astrology Charter
function renderCharter(sec) {
  sec.innerHTML = `${subHeader(L('Responsible Astrology Charter', 'பொறுப்பான ஜோதிட உறுதிமொழி'), '', 'more')}
    <div class="card glass"><p><b>${esc(bi(PRINCIPLE))}</b></p></div>
    <ol class="card glass charter-list">${CHARTER.map((c) => `<li>${esc(bi(c))}</li>`).join('')}</ol>
    <div class="note-box small">${esc(bi(DISCLAIMER))}</div>
    <button class="chip-btn center-block" data-go="report">⚠️ ${L('Report advice that worried you', 'கவலைப்படுத்திய ஆலோசனையைப் புகார் செய்')}</button>
    ${copyright()}`;
}
registerScreen('charter', { render: renderCharter, parent: 'more' });
