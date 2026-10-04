// Subscription plans: Free, Premium and Family — INR in India, USD abroad.
import { state, $, $$, L, esc, bi, api, STATIC, registerScreen, subHeader, go, toast, fmtIsoDate, BRAND } from './core.js';
import { redeemBox, wireRedeem, trialBanner } from './growth.js';

const inIndia = () => Math.abs((state.loc?.tz ?? 5.5) - 5.5) < 0.01;
const money = (amount, cur) => (cur === 'INR' ? `₹${Number(amount).toLocaleString('en-IN')}` : `$${amount}`);

async function loadPlans(currency) {
  if (STATIC) {
    const all = await (await fetch('plans.json')).json();
    return { currency, plans: all.map((p) => ({ ...p, currency, amount: p.price[currency] })) };
  }
  return api(`/api/billing/plans?currency=${currency}`);
}

async function renderPlans(sec, params = {}) {
  const currency = params.currency || (inIndia() ? 'INR' : 'USD');
  sec.innerHTML = `${subHeader(L(BRAND.premiumEn, BRAND.premiumTa), L('Unlimited answers, life-timing predictions and full readings for your whole family', 'வரம்பற்ற பதில்கள், வாழ்க்கை நேரக் கணிப்பு, முழு குடும்பத்திற்கும் விரிவான பலன்'), 'more')}
    <div class="seg"><button data-cur="INR" class="${currency === 'INR' ? 'sel' : ''}">₹ ${L('India', 'இந்தியா')}</button><button data-cur="USD" class="${currency === 'USD' ? 'sel' : ''}">$ ${L('Abroad', 'வெளிநாடு')}</button></div>
    ${trialBanner()}${params.redeem ? redeemBox() : ''}<div id="myPlan"></div><div id="planList"><div class="loader"><i></i><i></i><i></i></div></div>`;
  $$('[data-cur]', sec).forEach((b) => b.addEventListener('click', () => renderPlans(sec, { ...params, currency: b.dataset.cur })));
  wireRedeem(() => renderPlans(sec, params));
  if (!STATIC) {
    api('/api/billing/me').then((me) => {
      if (!$('#myPlan')) return;
      $('#myPlan').innerHTML = `<div class="card glass"><b>${L('Your plan', 'உங்கள் திட்டம்')}: ${me.plan === 'free' ? L('Free', 'இலவசம்') : me.plan.startsWith('family') ? L('Family', 'குடும்பம்') : L('Premium', 'பிரீமியம்')}</b>${me.expiresAt ? ` <span class="muted small">${L('until', 'வரை')} ${fmtIsoDate(new Date(me.expiresAt).toISOString().slice(0, 10))}</span>` : ''}
        ${me.plan === 'free' && me.aiFreeDaily ? `<p class="small muted">${L('Jothidar answers used today', 'இன்று பயன்படுத்திய பதில்கள்')}: ${me.aiUsedToday} / ${me.aiFreeDaily}</p>` : ''}</div>`;
    }).catch(() => {});
  }
  try {
    const { plans } = await loadPlans(currency);
    $('#planList').innerHTML = plans.map((p) => `<div class="card glass plan${p.id.startsWith('family') ? ' best' : ''}">
      ${p.id === 'family_year' ? `<span class="pill best-pill">${L('Best value', 'சிறந்த மதிப்பு')}</span>` : ''}
      <div class="plan-head"><b>${esc(bi(p.name))}</b><span class="plan-price">${p.amount ? money(p.amount, currency) : L('Free', 'இலவசம்')}<small>${p.interval ? ` / ${p.interval === 'month' ? L('month', 'மாதம்') : L('year', 'ஆண்டு')}` : ''}</small></span></div>
      <ul>${p.features.map((f) => `<li>${esc(bi(f))}</li>`).join('')}</ul>
      ${p.amount ? `<button class="btn-gold" data-buy="${p.id}">${L('Choose', 'தேர்வு செய்')}</button>` : ''}</div>`).join('') + (params.redeem ? '' : redeemBox());
    wireRedeem(() => renderPlans(sec, params));
    $$('[data-buy]', sec).forEach((b) => b.addEventListener('click', () => buy(b.dataset.buy, currency)));
  } catch {
    $('#planList').innerHTML = `<p class="muted">${L('Plans are unavailable right now.', 'திட்டங்கள் தற்போது கிடைக்கவில்லை.')}</p>`;
  }
}

async function buy(plan, currency) {
  if (STATIC) { toast(L('Payments work in the installed app', 'கட்டணம் நிறுவப்பட்ட செயலியில் இயங்கும்')); return; }
  if (!state.user) { toast(L('Please sign in first', 'முதலில் உள்நுழையவும்')); go('login'); return; }
  try {
    const r = await api('/api/billing/checkout', { method: 'POST', body: { plan, currency } });
    if (r.gateway === 'stripe') { location.href = r.url; return; }
    if (r.gateway === 'razorpay') {
      await new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://checkout.razorpay.com/v1/checkout.js'; s.onload = res; s.onerror = rej; document.head.append(s); });
      new window.Razorpay({
        key: r.keyId, amount: r.amount, currency: r.currency, order_id: r.razorpayOrderId, name: BRAND.nameTa, description: plan, theme: { color: '#f5b83d' },
        handler: async (resp) => {
          try { await api('/api/billing/verify', { method: 'POST', body: { subscriptionId: r.subscriptionId, ...resp } }); toast(L('Welcome to Premium 🙏', 'பிரீமியத்திற்கு நல்வரவு 🙏')); go('plans'); } catch (e) { toast(e.message); }
        },
      }).open();
      return;
    }
    toast(L('Online payment is being set up — our team will contact you.', 'ஆன்லைன் கட்டணம் அமைக்கப்படுகிறது — எங்கள் குழு தொடர்பு கொள்ளும்.'), 5000);
  } catch (e) { toast(e.message); }
}

registerScreen('plans', { render: renderPlans, parent: 'more' });
