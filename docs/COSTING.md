# Thunai — plan and package costing (initial test prices)

Owner requirement §10–§11: cost the answer allowances, infrastructure, support, refunds and any expert services
**before** finalising the offers. This file is the working model. **Every external number below is an
assumption to verify** against the provider's current price page and against our own measured usage
(`/api/admin/metrics` → AI cost per payer, once `AI_COST_INR_PER_MTOK_IN/OUT` are set).

Status: draft for the owner. Prices in the app are labelled "initial test price" and are all env-configurable
(`PRICE_INR_*`, `PRICE_AED_*`, `PRICE_USD_*`, `AI_PERSONAL_MONTHLY`, `AI_FAMILY_MONTHLY`, `PACKAGE_MARRIAGE_ANSWERS`,
`PACKAGE_JOURNEY_ANSWERS`), so every recommendation here can be applied without a code change.

## 1. What is being sold

| Offer | Price (test) | Term | Detailed answers | Other paid rights |
|---|---|---|---|---|
| Free | ₹0 | — | `AI_FREE_DAILY` (5/day) | Everything basic: calendar, charts, guidance, basic porutham, baby-name browsing/meanings/star letters, weekly planning, 1 saved goal, 1 saved journey, 10 shortlisted names |
| Personal | ₹199 / month, ₹1,999 / year (AED 18 / AED 179 · $4.99 / $49) | one-time, no auto-renew | 100 / month | unlimited goals, longer shortlists, printable reports, detailed reports |
| Family | ₹399 / month, ₹3,999 / year (AED 36 / AED 359 · $9.99 / $99) | one-time, no auto-renew | 250 / month, shared | + up to 8 permission-based profiles, family collaboration, shared planning |
| Marriage package | ₹499 (AED 33 · $9) | 90 days, one couple | 30 in total | full five-card matching report + print for that couple (muhurtham shortlist marked "coming soon") |
| Journey package | ₹299 (AED 22 · $6) | 60 days, one journey | 15 in total | saved itinerary with live re-checks, printable plan |
| Thunai Private (concierge) | — | **deferred, not advertised** | — | — |

### 1a. Payment currencies — exactly three

Owner rule: the currency follows the country of **residence** the person sets in the app (Settings → Location;
the Plans screen shows "Prices in AED for United Arab Emirates · Change country"). If no residence is saved, the
account phone's country code is used, then the phone's locale / time zone.

| Residence | Currency | Gateway | Env prefix |
|---|---|---|---|
| India | ₹ INR | Razorpay | `PRICE_INR_*` |
| United Arab Emirates | AED | Stripe Checkout (`aed`, 100 fils = 1 AED) | `PRICE_AED_*` |
| every other country (US, UK, Singapore, Malaysia, Sri Lanka, Canada, Gulf states other than the UAE …) | $ USD | Stripe Checkout (`usd`) | `PRICE_USD_*` |

The server decides the currency again at checkout from the country the app sends (never a client price) and
refuses a currency that does not match that country. No other currency is ever charged; the "≈ LKR / GBP"
travel-budget estimates elsewhere in the app are guidance, not payments.

**AED price mapping** — clean local prices at ≈ USD × 3.6725 (the dirham's dollar peg), rounded to a whole
dirham; Family = 2 × Personal, as in USD:

| Offer | USD | × 3.6725 | AED price | env var |
|---|---|---|---|---|
| Personal monthly | $4.99 | 18.33 | **AED 18** | `PRICE_AED_PERSONAL_MONTH` |
| Personal yearly | $49 | 179.95 | **AED 179** | `PRICE_AED_PERSONAL_YEAR` |
| Family monthly | $9.99 | 36.69 | **AED 36** | `PRICE_AED_FAMILY_MONTH` |
| Family yearly | $99 | 363.58 | **AED 359** | `PRICE_AED_FAMILY_YEAR` |
| Marriage package | $9 | 33.05 | **AED 33** | `PRICE_AED_MARRIAGE_PACKAGE` |
| Journey package | $6 | 22.04 | **AED 22** | `PRICE_AED_JOURNEY_PACKAGE` |

(`PRICE_AED_PREMIUM_*` is also read for the Personal plan, like the INR/USD names.) Every AED price is above
Stripe's AED 2.00 minimum charge.

## 2. Assumptions (parameters — fill in / verify)

| # | Parameter | Value used | Source / status |
|---|---|---|---|
| A1 | Model | `claude-opus-5-5` (server/ai.js default, effort `low`) | configured |
| A2 | Model input price | **$4.00 / million tokens** | Anthropic list price for Claude Opus 5.5 (skill reference cached 2026-09-25) — **verify on anthropic.com/pricing before launch** |
| A3 | Model output price | **$20.00 / million tokens** | as A2 — verify |
| A4 | Cached-input read price | $0.20 / million tokens | as A2 — verify; only applies if prompt caching is enabled (not assumed below) |
| A5 | Input tokens per detailed answer | **6,000** (system prompt + policy + chart evidence + question + short history) | **estimate — measure** from `ai_cost` rows (metrics.js) |
| A6 | Output tokens per detailed answer (incl. thinking) | **1,500** | **estimate — measure**; effort `low` keeps this short |
| A7 | FX | ₹85 = $1 | assumption — update monthly |
| A8 | Allowance utilisation (share of allowance actually used) | Personal 30 %, Family 30 %, packages 60 % | **assumption** — most people use far less than the cap; measure |
| A9 | Hosting | Render Starter web service **$7/mo** + 1 GB persistent disk **~$0.25/GB-mo** → budget **$10/mo** incl. bandwidth headroom | assumption from Render's public price list — verify; scale to Standard ($25) beyond ~5k MAU |
| A10 | SMS OTP — MSG91 (India, DLT) | **₹0.20 per SMS** | assumption — verify on MSG91 plan; DLT registration fees extra |
| A11 | SMS OTP — Twilio (abroad) | **$0.05 per SMS** (varies 0.01–0.10 by country) | assumption — verify per country |
| A12 | OTPs per active user per month | 1.5 (sessions last; re-login on new phone) | assumption — measure |
| A13 | Razorpay fee (domestic cards/UPI) | **2 % + 18 % GST on the fee** = 2.36 % | Razorpay standard plan — verify; UPI may be lower |
| A14 | Stripe fee (international cards) | **2.9 % + $0.30**, +1.5 % cross-border, +1 % FX if converted ≈ **5.4 % + $0.30** | assumption — verify for the account's country |
| A15 | Support time | 10 min per paying user per year for plans; 10 min per package; at **₹400/hour** loaded cost | assumption |
| A16 | Refund rate | **5 %** of revenue (7-day no-questions window) | assumption — track `refundsInr` in metrics |
| A17 | GST on our price | 18 % — prices are "inclusive once registered"; net revenue = price ÷ 1.18 | verify with the accountant |
| A18 | Expert services (astrologer review, priest consult) | **not offered** — deferred; cost 0 here | owner decision |
| A19 | Free users per paying user | 20 | assumption — conversion 5 %; measure |

## 3. Cost per detailed answer

`cost = (input_tokens × in_price + output_tokens × out_price) / 1,000,000`

= (6,000 × $4 + 1,500 × $20) / 1e6 = $0.024 + $0.030 = **$0.054 ≈ ₹4.6 per detailed answer** (A2–A7).

Sensitivity: with prompt caching of the stable ~4,000-token system/policy prefix (A4), input falls to
≈ 2,000 × $4 + 4,000 × $0.20 → $0.0088, so ≈ **$0.039 ≈ ₹3.3**. If real answers are twice as long (3,000 output
tokens), ≈ **$0.084 ≈ ₹7.1**. Everyday guidance is computed on the phone and costs nothing.

## 4. Monthly cost per active paying user

| Line | Personal (monthly ₹199) | Family (monthly ₹399) | Marriage pkg (₹499, 90 d) | Journey pkg (₹299, 60 d) |
|---|---|---|---|---|
| Net of GST (A17) | ₹168.6 | ₹338.1 | ₹422.9 | ₹253.4 |
| AI: allowance × utilisation × ₹4.6 | 100 × 30 % → ₹138 | 250 × 30 % → ₹345 | 30 × 60 % → ₹83 | 15 × 60 % → ₹41 |
| AI at **100 %** utilisation (worst case) | ₹460 | ₹1,150 | ₹138 | ₹69 |
| Gateway fee (A13, INR) | ₹4.7 | ₹9.4 | ₹11.8 | ₹7.1 |
| SMS OTP (A10, A12) | ₹0.3 | ₹1.2 (≈ 4 members) | ₹0.3 | ₹0.3 |
| Hosting share ($10 ÷ assumed 200 payers + their 4,000 free users) | ₹4.3 | ₹4.3 | ₹4.3 | ₹4.3 |
| Support (A15) | ₹5.6 | ₹5.6 | ₹67 | ₹67 |
| Refund reserve (A16, 5 % of price) | ₹10 | ₹20 | ₹25 | ₹15 |
| Free-user subsidy (A19: 20 free users × ~1.5 detailed answers actually used per month × ₹4.6) | ₹138 | ₹138 | — | — |
| **Total cost (typical)** | **≈ ₹301** | **≈ ₹523** | **≈ ₹191** | **≈ ₹135** |
| **Margin (typical)** | **≈ −₹132** | **≈ −₹185** | **≈ +₹232** | **≈ +₹118** |

Yearly plans (₹1,999 / ₹3,999 net ≈ ₹1,694 / ₹3,389 → ₹141 / ₹282 a month) are lower per month than the
monthly plans, so the gap is wider.

USD buyers: Stripe ≈ 5.4 % + $0.30 (A14): on $4.99 that is ≈ $0.57 (11 %) — the $4.99 monthly price carries the
highest fee share; the $49 / $99 yearly prices are far better.

### 4a. AED and USD buyers (Stripe)

Assumptions: FX ₹85 = $1 = AED 3.6725 (≈ ₹23.1 per dirham); Stripe A14 ≈ 5.4 % + AED 1.10 (≈ $0.30); a
conservative 5 % UAE VAT taken out of the AED price (prices are shown as "include applicable taxes" — **verify
with the accountant whether UAE VAT registration applies**; the same 5 % is applied to USD for comparison, the
real rate depends on the buyer's country); SMS by Twilio (A11) ≈ ₹6 a month (₹26 for a family); support, hosting,
refund reserve and AI utilisation as §4. **The free-user subsidy (₹138) is left out** — add it back if diaspora
free users are paid for from these prices.

| Offer | AED price (≈ ₹) | Net after VAT + Stripe | Typical cost | **Margin (AED)** | USD price → margin |
|---|---|---|---|---|---|
| Personal monthly | AED 18 (₹417) | ₹349 | ₹175 | **≈ +₹174** | $4.99 → ≈ +₹180 |
| Personal yearly (per month) | AED 179 ÷ 12 (₹345) | ₹308 | ₹172 | **≈ +₹136** | $49 → ≈ +₹138 |
| Family monthly | AED 36 (₹833) | ₹723 | ₹422 | **≈ +₹301** | $9.99 → ≈ +₹315 |
| Family yearly (per month) | AED 359 ÷ 12 (₹692) | ₹620 | ₹415 | **≈ +₹205** | $99 → ≈ +₹212 |
| Marriage package | AED 33 (₹764) | ₹661 | ₹199 | **≈ +₹462** | $9 → ≈ +₹463 |
| Journey package | AED 22 (₹509) | ₹432 | ₹144 | **≈ +₹288** | $6 → ≈ +₹288 |

Reading: AED prices sit within 1–2 % of the USD margins (the rounding down to clean dirham prices costs at most
≈ ₹8 a month). Abroad prices are about 2× the rupee prices, so every AED / USD offer covers its typical cost even
at 30 % allowance use; at 100 % use the Personal monthly allowance (₹460 of AI) still exceeds its AED net.

## 5. Break-even at the test prices

Break-even AI utilisation `u` (other costs fixed, free-user subsidy included):

| Offer | Net price | Non-AI costs | Room for AI | Break-even answers / month at ₹4.6 | = utilisation of allowance |
|---|---|---|---|---|---|
| Personal monthly | ₹168.6 | ₹163 (incl. ₹138 free subsidy) | ₹5.6 | ≈ 1 | ≈ 1 % |
| Personal monthly, **no free subsidy** | ₹168.6 | ₹25 | ₹144 | ≈ 31 | 31 % |
| Family monthly, no free subsidy | ₹338.1 | ₹40 | ₹298 | ≈ 65 | 26 % |
| Marriage package | ₹422.9 | ₹108 | ₹315 | ≈ 68 (allowance 30) | always covered |
| Journey package | ₹253.4 | ₹94 | ₹159 | ≈ 35 (allowance 15) | always covered |

Reading: **packages are profitable at any use of their allowance**. Subscriptions break even only if paying
users use roughly a quarter to a third of their detailed-answer allowance **and** free users' detailed answers
are paid for elsewhere. At 100 % utilisation the Personal allowance (₹460 of AI) is about 2.7× the net price.

## 6. Recommendations

1. **Measure first (week 1 after launch):** set `AI_COST_INR_PER_MTOK_IN=340` and `AI_COST_INR_PER_MTOK_OUT=1700`
   (A2/A3 × A7) so the owner dashboard shows real AI cost per payer; replace A5/A6/A8 with measured values.
2. **Enable prompt caching** on the stable system/policy prefix — the cheapest lever (≈ −30 % per answer, §3).
3. **Lower the free daily allowance** from 5 to 2–3 detailed answers (`AI_FREE_DAILY`) — the free subsidy is
   the single largest cost line. Everyday on-phone guidance stays unlimited and free.
4. **Right-size the subscription allowances** until measured: Personal **60/month** (`AI_PERSONAL_MONTHLY=60`),
   Family **150/month** (`AI_FAMILY_MONTHLY=150`). Keep them stated exactly on the Plans screen; never "unlimited".
5. **Keep the packages as priced** (₹499 / ₹299): they cover their full allowance with margin, suit occasional
   users and have no renewal. Support time (A15) is their largest non-AI cost — keep the scope picker and the
   "what this adds" list clear to avoid tickets.
6. **Prefer yearly USD / AED prices** (or raise $4.99 → $5.99 and AED 18 → AED 22 monthly) because of Stripe's
   fixed per-payment fee.
7. **Refunds:** keep the 7-day full-refund window; revisit if `refundsInr` exceeds 5 % of revenue.
8. **Expert services and Thunai Private stay deferred**; cost them separately (practitioner fee, review time,
   commission disclosure) before any offer, and never advertise them until then.
9. Re-run this table when any price, model, effort level or allowance changes.

## 7. Not claimed

The app's value summary shows only counts of things the person actually completed (goals, steps, weekly plans,
journeys, matching results, reminders, shortlisted names). It never estimates money saved, accidents prevented
or any other outcome, and no paywall uses countdowns, fear or artificial scarcity.
