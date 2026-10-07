// Subscription plans: Free, Personal (தனிநபர் — formerly "Premium") and Family — INR in India, USD abroad.
import { state, $, $$, L, esc, bi, api, STATIC, registerScreen, subHeader, go, toast, fmtIsoDate, BRAND } from './core.js';
import { redeemBox, wireRedeem, trialBanner, track } from './growth.js';

/** Display name of a plan id (old premium_* ids are the Personal plan). */
export const planLabel = (id) => (!id || id === 'free' ? L('Free', 'இலவசம்') : id.startsWith('family') ? L('Family', 'குடும்பம்') : L('Personal', 'தனிநபர்'));
/** One feature line; planned-but-not-built features carry `soon` and are labelled, never sold as included. */
const featureItem = (f) => `<li${f.soon ? ' class="soon"' : ''}>${esc(bi(f))}${f.soon ? ` <span class="badge unv">${L('Coming soon', 'விரைவில்')}</span>` : ''}</li>`;

const inIndia = () => Math.abs((state.loc?.tz ?? 5.5) - 5.5) < 0.01;
const money = (amount, cur) => (cur === 'INR' ? `₹${Number(amount).toLocaleString('en-IN')}` : `$${amount}`);

async function loadPlans(currency) {
  if (STATIC) {
    const j = await (await fetch('plans.json')).json();
    const all = Array.isArray(j) ? j : j.plans;
    return { currency, testPrices: true, terms: j.terms, plans: all.map((p) => ({ ...p, currency, amount: p.price[currency] })) };
  }
  return api(`/api/billing/plans?currency=${currency}`);
}

async function renderPlans(sec, params = {}) {
  const currency = params.currency || (inIndia() ? 'INR' : 'USD');
  sec.innerHTML = `${subHeader(L(`${BRAND.personalEn} & ${BRAND.familyEn}`, `${BRAND.personalTa} & ${BRAND.familyTa}`), L('Calendar, guidance and baby-name browsing stay free for everyone. Personal adds detailed reports; Family adds up to 8 profiles shared only with permission.', 'நாட்காட்டி, வழிகாட்டல், குழந்தைப் பெயர் தேடல் அனைவருக்கும் இலவசம். தனிநபர் திட்டத்தில் விரிவான அறிக்கைகள்; குடும்பத் திட்டத்தில் அனுமதியுடன் பகிரப்படும் 8 சுயவிவரங்கள் வரை.'), 'more')}
    <div class="seg"><button data-cur="INR" class="${currency === 'INR' ? 'sel' : ''}">₹ ${L('India', 'இந்தியா')}</button><button data-cur="USD" class="${currency === 'USD' ? 'sel' : ''}">$ ${L('Abroad', 'வெளிநாடு')}</button></div>
    ${trialBanner()}${params.redeem ? redeemBox() : ''}<div id="myPlan"></div><div id="planList"><div class="loader"><i></i><i></i><i></i></div></div>`;
  $$('[data-cur]', sec).forEach((b) => b.addEventListener('click', () => renderPlans(sec, { ...params, currency: b.dataset.cur })));
  wireRedeem(() => renderPlans(sec, params));
  if (!STATIC) {
    api('/api/billing/me').then((me) => {
      if (!$('#myPlan')) return;
      $('#myPlan').innerHTML = `<div class="card glass"><b>${L('Your plan', 'உங்கள் திட்டம்')}: ${planLabel(me.plan)}</b>${me.expiresAt ? ` <span class="muted small">${L('until', 'வரை')} ${fmtIsoDate(new Date(me.expiresAt).toISOString().slice(0, 10))}</span>` : ''}
        ${me.aiPeriod === 'day' && me.aiLimit ? `<div class="tb-row"><span class="tb-label">${L('Detailed answers today', 'இன்றைய விரிவான பதில்கள்')}</span><span class="tb-value">${me.aiUsedToday} / ${me.aiLimit}</span><span class="tb-bar"><i style="width:${Math.min(100, Math.round(100 * me.aiUsedToday / me.aiLimit))}%"></i></span></div>` : ''}
        ${me.aiPeriod === 'month' && me.aiLimit ? `<div class="tb-row"><span class="tb-label">${L('Detailed answers this month', 'இந்த மாத விரிவான பதில்கள்')}</span><span class="tb-value">${me.aiUsedThisMonth} / ${me.aiLimit}</span><span class="tb-bar"><i style="width:${Math.min(100, Math.round(100 * me.aiUsedThisMonth / me.aiLimit))}%"></i></span></div>` : ''}
        <p class="small muted">${L('Everyday guidance never runs out; only detailed answers are counted.', 'அன்றாட வழிகாட்டல் தீராது; விரிவான பதில்கள் மட்டுமே கணக்கிடப்படும்.')}</p>
        ${state.user ? `<button class="chip-btn" id="restoreBtn">↺ ${L('Restore purchases', 'வாங்கியதை மீட்டெடு')}</button>` : ''}</div>`;
      $('#restoreBtn')?.addEventListener('click', async () => { try { const r = await api('/api/billing/restore', { method: 'POST' }); toast(r.restored ? L('Purchase restored 🙏', 'வாங்கியது மீட்டெடுக்கப்பட்டது 🙏') : L('No other purchases found for this account', 'இந்தக் கணக்கில் வேறு வாங்குதல் இல்லை')); renderPlans(sec, params); } catch (e) { toast(e.message); } });
    }).catch(() => {});
  }
  try {
    const { plans, terms } = await loadPlans(currency);
    $('#planList').innerHTML = `<div class="note-box">${L('Initial test prices — they may change before launch. Daily calendar and basic guidance stay free.', 'தொடக்கச் சோதனை விலைகள் — வெளியீட்டுக்கு முன் மாறலாம். தினசரி நாட்காட்டியும் அடிப்படை வழிகாட்டலும் எப்போதும் இலவசம்.')}</div>` + plans.map((p) => `<div class="card glass plan${p.id.startsWith('family') ? ' best' : ''}">
      ${p.id === 'family_year' ? `<span class="pill best-pill">${L('Best value', 'சிறந்த மதிப்பு')}</span>` : ''}
      <div class="plan-head"><b>${esc(bi(p.name))}</b><span class="plan-price">${p.amount ? money(p.amount, currency) : L('Free', 'இலவசம்')}<small>${p.interval ? ` / ${p.interval === 'month' ? L('month', 'மாதம்') : L('year', 'ஆண்டு')}` : ''}</small></span></div>
      <ul>${p.features.map(featureItem).join('')}</ul>
      ${p.amount ? `<button class="btn-gold" data-buy="${p.id}">${L('Choose', 'தேர்வு செய்')}</button>` : ''}</div>`).join('')
      + (terms ? `<div class="card glass"><div class="card-title">📄 ${L('Renewal, cancellation & refunds', 'புதுப்பித்தல், ரத்து, பணத்திருப்பம்')}</div><ul class="small">${['renewal', 'cancellation', 'refund'].map((k) => `<li>${esc(bi(terms[k]))}</li>`).join('')}</ul>
        <p class="small muted">${L('Payments are processed by Razorpay (India) or Stripe (abroad); card details never reach our servers. Prices include applicable taxes once GST registration is complete.', 'கட்டணங்களை Razorpay (இந்தியா) / Stripe (வெளிநாடு) செயலாக்கும்; அட்டை விவரம் எங்கள் சேவையகத்திற்கு வராது.')}</p>
        <button class="link-btn" data-go="legal">${L('Full terms', 'முழு விதிமுறைகள்')}</button></div>` : '')
      + (params.redeem ? '' : redeemBox());
    wireRedeem(() => renderPlans(sec, params));
    $$('[data-buy]', sec).forEach((b) => b.addEventListener('click', () => { track('plan_click', { feature: b.dataset.buy }); buy(b.dataset.buy, currency); }));
  } catch {
    $('#planList').innerHTML = `<p class="muted">${L('Plans are unavailable right now.', 'திட்டங்கள் தற்போது கிடைக்கவில்லை.')}</p>`;
  }
}

async function buy(plan, currency) {
  if (STATIC) { toast(L('Payments are not available in this version — nothing has been charged.', 'இந்தப் பதிப்பில் கட்டணம் இல்லை — எதுவும் வசூலிக்கப்படவில்லை.'), 4000); return; }
  if (!state.user) { toast(L('Please sign in first', 'முதலில் உள்நுழையவும்')); go('login'); return; }
  try {
    const r = await api('/api/billing/checkout', { method: 'POST', body: { plan, currency } });
    if (r.gateway === 'stripe') { location.href = r.url; return; }
    if (r.gateway === 'razorpay') {
      await new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://checkout.razorpay.com/v1/checkout.js'; s.onload = res; s.onerror = rej; document.head.append(s); });
      new window.Razorpay({
        key: r.keyId, amount: r.amount, currency: r.currency, order_id: r.razorpayOrderId, name: BRAND.nameTa, description: plan, theme: { color: '#6e1a35' },
        handler: async (resp) => {
          try { await api('/api/billing/verify', { method: 'POST', body: { subscriptionId: r.subscriptionId, ...resp } }); track('purchase', { feature: plan }); toast(L(`Welcome to ${planLabel(plan)} 🙏`, `${planLabel(plan)} திட்டத்திற்கு நல்வரவு 🙏`)); go('plans'); } catch (e) { toast(e.message); }
        },
      }).open();
      return;
    }
    toast(L('Online payment is not available yet — nothing has been charged.', 'ஆன்லைன் கட்டணம் இன்னும் இல்லை — எதுவும் வசூலிக்கப்படவில்லை.'), 5000);
  } catch (e) { toast(e.message); }
}

registerScreen('plans', { render: renderPlans, parent: 'more' });
