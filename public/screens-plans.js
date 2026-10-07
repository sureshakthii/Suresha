// Subscription plans: Free, Personal (தனிநபர் — formerly "Premium") and Family — plus one-time packages for
// occasional needs (Marriage / Journey), and the optional "Your Thunai so far" summary.
// Prices follow the country of RESIDENCE (shared/currency.js): India → ₹ INR, United Arab Emirates → AED, any other
// country → $ USD. The server decides the currency again at checkout from the same country; changing the
// residence is the only way to see another currency.
import { state, $, $$, L, esc, bi, api, STATIC, store, registerScreen, subHeader, go, toast, fmtIsoDate, displayName, BRAND } from './core.js';
import { redeemBox, wireRedeem, trialBanner, track, taskLog, pairKey } from './growth.js';
import { valueSummary, PLAN_FEATURE_LINES } from './shared/plan-gates.js';
import { formatPrice, payCountry, payCurrencyFor } from './shared/currency.js';
import { countryByCode, parseE164 } from './shared/countries.js';
import { countryOfLoc } from './shared/residence.js';
import { residenceStep } from './residence-ui.js';

/** Display name of a plan id (old premium_* ids are the Personal plan). */
export const planLabel = (id) => (!id || id === 'free' ? L('Free', 'இலவசம்')
  : id === 'marriage_package' ? L('Marriage package', 'திருமணத் தொகுப்பு') : id === 'journey_package' ? L('Journey package', 'யாத்திரைத் தொகுப்பு')
    : id.startsWith('family') ? L('Family', 'குடும்பம்') : L('Personal', 'தனிநபர்'));
/** One feature line; planned-but-not-built features carry `soon` and are labelled, never sold as included. */
const featureItem = (f) => `<li${f.soon ? ' class="soon"' : ''}>${esc(bi(f))}${f.soon ? ` <span class="badge unv">${L('Coming soon — not included yet', 'விரைவில் — இன்னும் சேர்க்கப்படவில்லை')}</span>` : ''}</li>`;

/** The country prices are shown and charged for: residence (not a travelling place) → account phone → device. */
export const priceCountry = () => payCountry({
  residenceCc: state.residence ? countryOfLoc(state.residence) : null,
  phoneCc: parseE164(state.user?.phone)?.country?.cc || null,
});
const money = (amount, cur) => formatPrice(amount, cur);
const CUR_LABEL = { INR: '₹ (INR)', AED: 'AED', USD: '$ (USD)' };
/** "Prices in AED for United Arab Emirates · Change country" — always visible above the plans. */
function countryLine(cc, source, currency) {
  const c = countryByCode(cc);
  const en = c?.en || cc, ta = c?.ta || en;
  const why = source === 'residence' ? '' : source === 'phone'
    ? L(' (from your phone number — set where you live for the right prices)', ' (உங்கள் கைப்பேசி எண்ணிலிருந்து — சரியான விலைக்கு வசிக்கும் இடத்தை அமைக்கவும்)')
    : L(' (from this phone’s settings — set where you live for the right prices)', ' (இந்தக் கைப்பேசி அமைப்பிலிருந்து — சரியான விலைக்கு வசிக்கும் இடத்தை அமைக்கவும்)');
  return `<div class="card glass price-country" id="priceCountry" style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:4px 12px"><span>🌐 ${L(`Prices in ${CUR_LABEL[currency]} for ${esc(en)}`, `${esc(ta)} — விலைகள்: ${CUR_LABEL[currency]}`)}<span class="small muted">${why}</span></span>
    <button type="button" class="link-btn" id="changeCountry">${L('Change country', 'நாட்டை மாற்று')}</button></div>`;
}
const dateOf = (t) => fmtIsoDate(new Date(t).toISOString().slice(0, 10));
const bar = (label, used, limit) => `<div class="tb-row"><span class="tb-label">${label}</span><span class="tb-value">${used} / ${limit}</span><span class="tb-bar"><i style="width:${Math.min(100, Math.round(100 * used / limit))}%"></i></span></div>`;

async function loadPlans(country) {
  if (STATIC) {
    const currency = payCurrencyFor(country);
    const j = await (await fetch('plans.json')).json();
    const all = Array.isArray(j) ? j : j.plans;
    return { country, currency, testPrices: true, terms: j.terms, plans: all.map((p) => ({ ...p, currency, amount: p.price?.[currency] })) };
  }
  return api(`/api/billing/plans?country=${encodeURIComponent(country)}`);
}

/** Saved journeys on this phone (screens-journey.js, kj_plans). */
const savedJourneys = () => { const a = store.get('kj_plans', []); return Array.isArray(a) ? a : []; };

/** The "who / which journey is this for" picker inside a package card — the package covers only that scope. */
function scopePicker(p, params) {
  if (p.scopeKind === 'pair') {
    if (params.pkg === p.id && params.pairId) return `<p class="small">💍 ${L('For the couple you just checked.', 'நீங்கள் இப்போது பார்த்த ஜோடிக்கு.')}</p><input type="hidden" data-scope-pair="${esc(params.pairId)}">`;
    const people = state.family.filter((m) => !m.private);
    if (people.length < 2) return `<p class="small muted">${L('Add both people (Family → Add) or run the marriage matching first; the package then covers that couple.', 'இருவரையும் சேர்க்கவும் (குடும்பம் → சேர்) அல்லது முதலில் திருமணப் பொருத்தம் பார்க்கவும்; தொகுப்பு அந்த ஜோடிக்குப் பொருந்தும்.')}</p>`;
    const opt = (sel) => people.map((m, i) => `<option value="${esc(m.id)}"${i === sel ? ' selected' : ''}>${esc(displayName(m))}</option>`).join('');
    return `<div class="pkg-scope"><label class="small">${L('Person 1', 'நபர் 1')}<select data-pair-a>${opt(0)}</select></label><label class="small">${L('Person 2', 'நபர் 2')}<select data-pair-b>${opt(1)}</select></label></div>`;
  }
  const trips = savedJourneys();
  if (params.pkg === p.id && params.journeyId) return `<p class="small">🛕 ${L('For the journey you were viewing.', 'நீங்கள் பார்த்த பயணத்திற்கு.')}</p><input type="hidden" data-scope-journey="${esc(params.journeyId)}">`;
  if (!trips.length) return `<p class="small muted">${L('Save a journey plan first (one saved journey is free); the package then covers that journey.', 'முதலில் ஒரு பயணத் திட்டத்தைச் சேமிக்கவும் (ஒன்று இலவசம்); தொகுப்பு அந்தப் பயணத்திற்குப் பொருந்தும்.')}</p><button class="chip-btn" data-go="journey">🛕 ${L('Plan a journey', 'பயணம் திட்டமிடு')}</button>`;
  return `<label class="small">${L('Which journey', 'எந்தப் பயணம்')}<select data-journey>${trips.map((t) => `<option value="${esc(t.id)}">${esc(t.title || t.id)}</option>`).join('')}</select></label>`;
}

/** The scope chosen in a package card, or null (with a message) when it is not chosen yet. */
function chosenScope(card, plan) {
  if (plan.scopeKind === 'pair') {
    const fixed = card.querySelector('[data-scope-pair]')?.dataset.scopePair;
    if (fixed) return { pairId: fixed };
    const a = card.querySelector('[data-pair-a]')?.value, b = card.querySelector('[data-pair-b]')?.value;
    if (!a || !b || a === b) { toast(L('Choose two different people for the couple', 'ஜோடிக்கு இரு வெவ்வேறு நபர்களைத் தேர்ந்தெடுக்கவும்')); return null; }
    return { pairId: pairKey(state.family.find((m) => m.id === a), state.family.find((m) => m.id === b)) };
  }
  const id = card.querySelector('[data-scope-journey]')?.dataset.scopeJourney || card.querySelector('[data-journey]')?.value;
  if (!id) { toast(L('Save a journey plan first', 'முதலில் ஒரு பயணத் திட்டத்தைச் சேமிக்கவும்')); return null; }
  return { journeyId: id };
}

/** The server's feature list plus app-side lines (Daily Ithihasa: intro + episode 1 free, every episode on paid plans). */
const planFeatures = (p) => [...(p.features || []), ...(p.kind === 'free' || !p.amount ? PLAN_FEATURE_LINES.free : PLAN_FEATURE_LINES.paid)];
const planCard = (p, currency) => `<div class="card glass plan${p.id.startsWith('family') ? ' best' : ''}">
      ${p.id === 'family_year' ? `<span class="pill best-pill">${L('Best value', 'சிறந்த மதிப்பு')}</span>` : ''}
      <div class="plan-head"><b>${esc(bi(p.name))}</b><span class="plan-price">${p.amount ? money(p.amount, currency) : L('Free', 'இலவசம்')}<small>${p.interval ? ` / ${p.interval === 'month' ? L('month', 'மாதம்') : L('year', 'ஆண்டு')}` : ''}</small></span></div>
      <ul>${planFeatures(p).map(featureItem).join('')}</ul>
      ${p.amount ? `<button class="btn-gold" data-buy="${p.id}">${L('Choose', 'தேர்வு செய்')}</button>` : ''}</div>`;

const packageCard = (p, currency, params) => `<div class="card glass plan pkg" data-pkg="${p.id}" id="pkg-${p.id}">
      <div class="plan-head"><b>${esc(bi(p.name))}</b><span class="plan-price">${money(p.amount, currency)}<small> · ${L('one-time', 'ஒருமுறை')}</small></span></div>
      <p class="small muted">${L('Initial test price', 'தொடக்கச் சோதனை விலை')} · ${L(`${p.durationDays} days`, `${p.durationDays} நாள்`)} · ${L('no subscription, no auto-renewal', 'சந்தா இல்லை, தானியங்கிப் புதுப்பிப்பு இல்லை')}</p>
      <div class="mini-label">${L('What this adds', 'இது சேர்ப்பது')}</div>
      <ul>${p.features.map(featureItem).join('')}</ul>
      ${scopePicker(p, params)}
      <button class="btn-gold" data-buy="${p.id}">${L('Buy once', 'ஒருமுறை வாங்கு')}</button></div>`;

async function renderPlans(sec, params = {}) {
  const { cc: country, source } = priceCountry();
  let currency = payCurrencyFor(country);
  sec.innerHTML = `${subHeader(L(`${BRAND.personalEn} & ${BRAND.familyEn}`, `${BRAND.personalTa} & ${BRAND.familyTa}`), L('Calendar, guidance and baby-name browsing stay free for everyone. Personal adds detailed reports; Family adds up to 8 profiles shared only with permission.', 'நாட்காட்டி, வழிகாட்டல், குழந்தைப் பெயர் தேடல் அனைவருக்கும் இலவசம். தனிநபர் திட்டத்தில் விரிவான அறிக்கைகள்; குடும்பத் திட்டத்தில் அனுமதியுடன் பகிரப்படும் 8 சுயவிவரங்கள் வரை.'), 'more')}
    ${countryLine(country, source, currency)}
    ${trialBanner()}${params.redeem ? redeemBox() : ''}<div id="myPlan"></div><div id="planList"><div class="loader"><i></i><i></i><i></i></div></div>`;
  // Saving a new residence redraws this screen (residence-ui.js), so the prices follow the new country.
  $('#changeCountry', sec)?.addEventListener('click', () => residenceStep());
  wireRedeem(() => renderPlans(sec, params));
  if (!STATIC) {
    api('/api/billing/me').then((me) => {
      if (!$('#myPlan')) return;
      const pk = me.entitlements?.packages || [];
      $('#myPlan').innerHTML = `<div class="card glass"><b>${L('Your plan', 'உங்கள் திட்டம்')}: ${planLabel(me.plan)}</b>${me.expiresAt ? ` <span class="muted small">${L('until', 'வரை')} ${dateOf(me.expiresAt)}</span>` : ''}
        ${me.lastPayment ? `<div class="small receipt-line">🧾 ${L('Last payment', 'கடைசிக் கட்டணம்')}: <b>${money(me.lastPayment.amount, me.lastPayment.currency)}</b> · ${planLabel(me.lastPayment.plan)}${me.lastPayment.paidAt ? ` · ${dateOf(me.lastPayment.paidAt)}` : ''}${me.lastPayment.status === 'refunded' ? ` · ${L('refunded', 'திருப்பித் தரப்பட்டது')}` : ''}</div>` : ''}
        ${pk.map((p) => `<div class="small">🎫 ${planLabel(p.plan)} — ${p.scope?.pairId ? L('one couple', 'ஒரு ஜோடி') : L('one journey', 'ஒரு பயணம்')} · ${L('until', 'வரை')} ${dateOf(p.expiresAt)}</div>`).join('')}
        ${me.aiPeriod === 'day' && me.aiLimit ? bar(L('Detailed answers today', 'இன்றைய விரிவான பதில்கள்'), me.aiUsedToday, me.aiLimit) : ''}
        ${me.aiPeriod === 'month' && me.aiLimit ? bar(L('Detailed answers this month', 'இந்த மாத விரிவான பதில்கள்'), me.aiUsedThisMonth, me.aiLimit) : ''}
        ${me.aiPeriod === 'package' && me.aiLimit ? bar(L('Package detailed answers', 'தொகுப்பு விரிவான பதில்கள்'), me.aiUsedPackage, me.aiLimit) : ''}
        <p class="small muted">${L('Everyday guidance never runs out; only detailed answers are counted.', 'அன்றாட வழிகாட்டல் தீராது; விரிவான பதில்கள் மட்டுமே கணக்கிடப்படும்.')}</p>
        ${state.user ? `<button class="chip-btn" id="restoreBtn">↺ ${L('Restore purchases', 'வாங்கியதை மீட்டெடு')}</button>` : ''}</div>`;
      $('#restoreBtn')?.addEventListener('click', async () => { try { const r = await api('/api/billing/restore', { method: 'POST' }); toast(r.restored ? L('Purchase restored 🙏', 'வாங்கியது மீட்டெடுக்கப்பட்டது 🙏') : L('No other purchases found for this account', 'இந்தக் கணக்கில் வேறு வாங்குதல் இல்லை')); renderPlans(sec, params); } catch (e) { toast(e.message); } });
    }).catch(() => {});
  }
  try {
    const loaded = await loadPlans(country);
    const { plans, terms } = loaded;
    currency = loaded.currency || currency; // the server's decision wins
    const subs = plans.filter((p) => p.kind !== 'package');
    const pkgs = plans.filter((p) => p.kind === 'package' && p.amount);
    $('#planList').innerHTML = `<div class="note-box">${L('Initial test prices — they may change before launch. Daily calendar and basic guidance stay free. Calculations, safety explanations and privacy controls are the same on every plan.', 'தொடக்கச் சோதனை விலைகள் — வெளியீட்டுக்கு முன் மாறலாம். தினசரி நாட்காட்டியும் அடிப்படை வழிகாட்டலும் எப்போதும் இலவசம். கணிப்பு, பாதுகாப்பு விளக்கம், தனியுரிமைக் கட்டுப்பாடுகள் எல்லாத் திட்டங்களிலும் ஒன்றே.')}</div>`
      + subs.map((p) => planCard(p, currency)).join('')
      + (pkgs.length ? `<h3 class="sec-h" id="packages">🎫 ${L('One-time packages for occasional needs', 'அவ்வப்போதைய தேவைக்கு ஒருமுறைத் தொகுப்புகள்')}</h3>
        <p class="small muted">${L('For one wedding or one journey, without a subscription. Each package covers only the couple or journey you choose, for a fixed number of days, and then simply ends.', 'ஒரு திருமணம் அல்லது ஒரு பயணத்திற்கு — சந்தா இன்றி. ஒவ்வொரு தொகுப்பும் நீங்கள் தேர்ந்தெடுக்கும் ஜோடி / பயணத்திற்கு மட்டும், குறிப்பிட்ட நாட்களுக்கு; பிறகு தானாக முடியும்.')}</p>
        ${pkgs.map((p) => packageCard(p, currency, params)).join('')}` : '')
      + (terms ? `<div class="card glass"><div class="card-title">📄 ${L('Renewal, cancellation & refunds', 'புதுப்பித்தல், ரத்து, பணத்திருப்பம்')}</div><ul class="small">${['renewal', 'cancellation', 'refund', 'packages'].filter((k) => terms[k]).map((k) => `<li>${esc(bi(terms[k]))}</li>`).join('')}</ul>
        <p class="small muted">${payNote(currency)}</p>
        <button class="link-btn" data-go="legal" data-param='{"open":"refunds"}'>${L('Full terms', 'முழு விதிமுறைகள்')}</button></div>` : '')
      + `<button class="chip-btn center-block" data-go="value">📒 ${L('Your Thunai so far', 'என் பயன்')}</button>`
      + (params.redeem ? '' : redeemBox());
    wireRedeem(() => renderPlans(sec, params));
    $$('[data-buy]', sec).forEach((b) => b.addEventListener('click', () => {
      const plan = plans.find((x) => x.id === b.dataset.buy);
      let scope;
      if (plan?.kind === 'package') { scope = chosenScope(b.closest('.card'), plan); if (!scope) return; }
      track('plan_click', { feature: b.dataset.buy });
      buy(b.dataset.buy, country, currency, scope);
    }));
    if (params.pkg) requestAnimationFrame(() => $(`#pkg-${params.pkg}`)?.scrollIntoView({ block: 'start' }));
  } catch {
    $('#planList').innerHTML = `<p class="muted">${L('Plans are unavailable right now.', 'திட்டங்கள் தற்போது கிடைக்கவில்லை.')}</p>`;
  }
}

/** Who processes the payment, in which currency, and the tax line (display only — no tax is calculated here). */
function payNote(currency) {
  const card = L('Card details never reach our servers.', 'அட்டை விவரம் எங்கள் சேவையகத்திற்கு வராது.');
  if (currency === 'INR') return `${L('Payments in rupees (₹) are processed by Razorpay.', 'ரூபாய் (₹) கட்டணங்களை Razorpay செயலாக்கும்.')} ${card} ${L('Prices include applicable taxes once GST registration is complete.', 'GST பதிவு முடிந்ததும் விலைகளில் பொருந்தும் வரிகள் அடங்கும்.')}`;
  return `${currency === 'AED' ? L('Payments in UAE dirhams (AED) are processed by Stripe.', 'அமீரக திர்ஹாம் (AED) கட்டணங்களை Stripe செயலாக்கும்.') : L('Payments in US dollars ($) are processed by Stripe.', 'அமெரிக்க டாலர் ($) கட்டணங்களை Stripe செயலாக்கும்.')} ${card} ${L('Prices include applicable taxes.', 'விலைகளில் பொருந்தும் வரிகள் அடங்கும்.')}`;
}

async function buy(plan, country, currency, scope) {
  if (STATIC) { toast(L('Payments are not available in this version — nothing has been charged.', 'இந்தப் பதிப்பில் கட்டணம் இல்லை — எதுவும் வசூலிக்கப்படவில்லை.'), 4000); return; }
  if (!state.user) { toast(L('Please sign in first', 'முதலில் உள்நுழையவும்')); go('login'); return; }
  try {
    // Only the plan and the residence country are sent; the server works out the currency and price again.
    const r = await api('/api/billing/checkout', { method: 'POST', body: { plan, country, currency, ...(scope ? { scope } : {}) } });
    if (r.gateway === 'stripe') { location.href = r.url; return; }
    if (r.gateway === 'razorpay') {
      await new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://checkout.razorpay.com/v1/checkout.js'; s.onload = res; s.onerror = rej; document.head.append(s); });
      new window.Razorpay({
        key: r.keyId, amount: r.amount, currency: r.currency, order_id: r.razorpayOrderId, name: BRAND.nameTa, description: plan, theme: { color: '#6e1a35' },
        handler: async (resp) => {
          try { await api('/api/billing/verify', { method: 'POST', body: { subscriptionId: r.subscriptionId, ...resp } }); track('purchase', { feature: plan }); toast(L(`Welcome to ${planLabel(plan)} 🙏`, `${planLabel(plan)} — நல்வரவு 🙏`)); go('plans'); } catch (e) { toast(e.message); }
        },
      }).open();
      return;
    }
    toast(L('Online payment is not available yet — nothing has been charged.', 'இணையவழிக் கட்டணம் இன்னும் இல்லை — எதுவும் வசூலிக்கப்படவில்லை.'), 5000);
  } catch (e) { toast(e.message); }
}

registerScreen('plans', { render: renderPlans, parent: 'more' });

// ---------------------------------------------------------------- "Your Thunai so far" (optional value summary)
const VALUE_ON = 'kj_value_on';
/** This phone's counts (shared/plan-gates.js valueSummary): only things actually completed, never sent anywhere. */
export const localValueSummary = () => valueSummary({
  goals: store.get('kj_goals', null), taskLog: taskLog(), week: store.get('kj_week', null), journeys: savedJourneys(),
  nameFavs: store.get('kj_name_favs', []), reminders: store.get('kj_reminders', null),
});
const VALUE_ROWS = [
  ['goalsCompleted', '🏁', 'Goals completed', 'நிறைவேற்றிய இலக்குகள்'],
  ['stepsDone', '✅', 'Goal steps done', 'முடித்த இலக்குப் படிகள்'],
  ['weeklyPlansSaved', '🗓️', 'Weekly plans saved', 'சேமித்த வாரத் திட்டங்கள்'],
  ['journeysPlanned', '🛕', 'Journeys planned', 'திட்டமிட்ட பயணங்கள்'],
  ['matchingReportsPrepared', '💞', 'Matching results prepared', 'தயாரித்த பொருத்த முடிவுகள்'],
  ['remindersKept', '🔔', 'Reminders that reached their time', 'நேரம் வந்த நினைவூட்டல்கள்'],
  ['namesShortlisted', '⭐', 'Names shortlisted', 'பட்டியலிட்ட பெயர்கள்'],
];
function renderValue(sec) {
  const on = Boolean(store.get(VALUE_ON, false));
  const v = on ? localValueSummary() : null;
  const any = v && Object.values(v).some((n) => n > 0);
  sec.innerHTML = `${subHeader(L('Your Thunai so far', 'என் பயன்'), L('An optional, factual count of what you have completed with the app.', 'இந்தச் செயலியுடன் நீங்கள் முடித்தவற்றின் விருப்பத் தேர்வு, உண்மை எண்ணிக்கை.'), 'more')}
    <div class="card glass"><label class="set-row"><span>${L('Show my summary', 'என் சுருக்கத்தைக் காட்டு')}</span><input type="checkbox" id="valueOn"${on ? ' checked' : ''}></label>
      <p class="small muted">${L('Counted on this phone only, from your own saved items — never sent to us. Only things you actually completed; no estimates of money or risk.', 'இந்தக் கைப்பேசியில் மட்டும், நீங்கள் சேமித்தவற்றிலிருந்து எண்ணப்படுகிறது — எங்களுக்கு அனுப்பப்படாது. நீங்கள் உண்மையில் முடித்தவை மட்டும்; பணம், ஆபத்து பற்றிய மதிப்பீடு இல்லை.')}</p></div>
    ${on ? `<div class="card glass value-card"><div class="tb-list">${VALUE_ROWS.map(([k, ic, en, tx]) => `<div class="factor"><span>${ic} ${L(en, tx)}</span><b class="${v[k] ? '' : 'zero'}">${v[k]}</b></div>`).join('')}</div>
      ${any ? '' : `<p class="small muted">${L('Nothing counted yet — finished tasks will appear here.', 'இன்னும் எதுவும் இல்லை — முடித்த பணிகள் இங்கே தோன்றும்.')}</p>`}</div>` : ''}`;
  $('#valueOn').addEventListener('change', (e) => { store.set(VALUE_ON, e.target.checked); renderValue(sec); });
}
registerScreen('value', { render: renderValue, parent: 'more' });
