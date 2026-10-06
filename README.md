# Thunai (துணை) — உங்கள் வாழ்க்கையின் வழிகாட்டி

Thunai is a Tamil-first family companion for traditional astrology, spiritual practice, Tamil calendars and practical planning. It runs as a PWA and as Android/iOS apps (Capacitor). The development brief it follows is [`docs/THUNAI-BRIEF.md`](docs/THUNAI-BRIEF.md); what is done and what still needs people is in [`docs/HANDOVER.md`](docs/HANDOVER.md).

## Principles

- **Guidance, not prediction.** No death, lifespan, disease, fertility, accident or betrayal predictions; no probabilities; no "your job arrives on 17 November".
- **Practical first.** Prasnam, Rahu Kalam or a muhurtham never tells anyone to delay hospital care, court dates, contracts or necessary payments. Practical safety cards (travel, money, relationship boundaries) are shown whatever the chart says.
- **Traceable.** Every yoga, role and dosha comes from a versioned rule registry with a tradition profile and review status; every AI statement must cite a calculated fact.
- **Age-aware and safe.** Ask Thunai identifies the speaker, the chart owner and everyone mentioned, and routes by age and intent before any astrology is done.
- **Private.** Minimum data to the AI, data export and account deletion, both adults' consent before matching.
- **Free remedies first.** Prayer, a lamp, charity. Paid services are never presented as protection.

## Main sections

| Section | What it holds |
|---|---|
| **Today (இன்று)** | Up to three cards: today's panchangam, a practical tip, one optional free practice. More behind an expander. |
| **My Chart (என் ஜாதகம்)** | Rasi/Navamsa, divisional charts, yogas with review status, house lords (incl. Badhaka/Maraka as neutral facts), dasa to Sookshma, transits, life road map, health wellbeing guide. |
| **Family (குடும்பம்)** | Family profiles (birth-time precision and time zone), marriage matching for first marriage and remarriage with two-person consent, star birthdays, thivasam, names. |
| **Plan (திட்டம்)** | Muhurtham, Prasnam (deadline-first), calendar, vratham, weather, temple trip planner, practical safety cards, parigaram, store, seva, priests, reminders. |
| **Ask Thunai (துணையிடம் கேள்)** | Age-aware chat; answers are validated against the chart evidence before they are shown. |

## How the calculations work

Full contract: [`docs/ENGINE-CONTRACT.md`](docs/ENGINE-CONTRACT.md).

- Planet positions: [`astronomy-engine`](https://github.com/cosinekitty/astronomy) 2.1.19, geocentric apparent; documented target **±1 arcminute** (not arc-seconds). An independent benchmark (Swiss Ephemeris / JPL) is still to be done.
- Sidereal zodiac with the **Lahiri (Chitrapaksha) ayanamsa** defined at the 1956 epoch and advanced by IAU 2006 precession plus nutation. Rahu/Ketu: mean node. Houses: whole sign.
- Birth time is converted with the historical IANA time zone; approximate or unknown times are supported without inventing a Lagna, and unstable chart items are marked.
- Tithi, nakshatra, yoga and karana end times are found by root-finding to within one second. Horai: Tamil 60-minute method by default, unequal planetary hours as a labelled option.
- Vimshottari dasa down to Sookshma with exact partitions (365.25-day year).
- Yogas, house-lord roles and doshas: [`docs/RULE-REGISTRY.md`](docs/RULE-REGISTRY.md). All rules are **proposed** until the master astrologer signs them off.
- Ask Thunai safety and evidence contract: [`docs/AI-SAFETY-POLICY.md`](docs/AI-SAFETY-POLICY.md).

## Run it

```bash
npm install
npm start               # http://localhost:3000
```

To get **AI answers from Claude**, set an API key. Without one, the app still works and uses its built-in rule-based replies.

```bash
export ANTHROPIC_API_KEY=sk-ant-...
npm start
```

### Test on your phone

1. Put the phone on the same Wi-Fi as the computer and open `http://<computer-ip>:3000`.
2. In Chrome, open the menu and choose **Add to Home screen**. It then opens full-screen like a native app.
3. "Use my location" (GPS) only works on HTTPS or localhost. For a quick HTTPS link, use a tunnel such as `npx localtunnel --port 3000`.

### Automated tests

```bash
npm test
```

The tests cover:
- Astronomy checks against known positions (e.g. 1 Jan 1990: Jupiter and Mercury retrograde, Rahu in Makara).
- Sunrise/Lagna consistency and Rahu Kalam timing.
- Every API endpoint, including the SSE stream, across all 14 categories.

## API

| Method | Path | Body / query |
|---|---|---|
| GET | `/api/health` | returns `{ ok, ai }` |
| GET | `/api/categories` | list of question categories |
| GET | `/api/places?q=madurai` | built-in gazetteer, plus an OpenStreetMap fallback |
| POST | `/api/chart` | `{ name, date:"YYYY-MM-DD", time:"HH:MM:SS", lat, lon, tz, place }` |
| GET | `/api/panchang?lat=&lon=&tz=&at=` | live Panchangam snapshot |
| GET | `/api/calendar?year=&month=&lat=&lon=&tz=` | Tamil calendar month (month 1–12) |
| POST | `/api/porutham` | `{ girl, boy }`: each `{ star, rasi }` or full birth details |
| POST | `/api/muhurtham` | `{ category, loc, persons:[{name,janmaNakshatra,janmaRasi}], days }` |
| POST | `/api/ai/chat` · `/api/ai/porutham` · `/api/ai/names` | `{ context, messages, lang, fallbackText }`. Streams with `Accept: text/event-stream` |
| POST | `/api/ask` | `{ category, question?, lang:"ta"\|"en", loc:{lat,lon,tz,name}, birth? }`. Send `Accept: text/event-stream` to get streaming |

Example:

```bash
curl -s -X POST localhost:3000/api/ask -H 'content-type: application/json' \
  -d '{"category":"contract","lang":"en","loc":{"lat":13.08,"lon":80.27,"tz":5.5},
       "birth":{"date":"1990-01-01","time":"10:00:00","lat":13.08,"lon":80.27,"tz":5.5}}'
```

## Project layout

```
server/   Express API, auth (OTP, Facebook, sessions, SQLite), AI (Claude), gazetteer
shared/   astro.js (ephemeris, panchangam, charts, dasa) · prasna.js (Do/Don't scoring)
          tamilcal.js (Tamil calendar, Gowri, festivals) · porutham.js · remedies.js
          special.js (muhurtham finder, thivasam, star birthday, name letters) · narrator.js
public/   Mobile PWA: app.js (boot), core.js, screens-main.js, screens-tools.js, account.js
test/     node:test suites
```

> Astrology gives guidance on timing only. For surgery, legal and financial decisions, the professional's advice always comes first. The AI is instructed to say so.

## Login

Users sign in with a one-time code (OTP) sent by **SMS** or **email**, or with **Facebook**. Accounts, sessions and each user's saved data (family birth profiles, settings) live in SQLite (`node:sqlite`, file at `DB_PATH`, default `data/kaippesi.db`). Sessions are 30-day `httpOnly` cookies (`kj_session`).

| Channel | Provider (first configured wins) |
|---|---|
| SMS | Twilio (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM`), else MSG91 (`MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID`) |
| Email | SMTP via nodemailer (`SMTP_URL`, `MAIL_FROM`) |
| Facebook | `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`, `PUBLIC_URL` |

**Dev mode** (`AUTH_DEV_MODE=1`, or automatically outside production for any channel with no provider): nothing is sent; the code is printed to the server console and returned as `devCode` in the response, so you can log in locally with no accounts set up. In production a channel without a provider returns 503. Set `AUTH_SECRET` in production.

| Method | Path | Notes |
|---|---|---|
| GET | `/api/auth/providers` | `{ sms, email, facebook, devMode }` |
| POST | `/api/auth/otp/request` | `{ channel:"sms"\|"email", to }`: 5 per number/email and 30 per IP per hour |
| POST | `/api/auth/otp/verify` | `{ channel, to, code, name? }` → `{ user }` + session cookie (5 tries per code) |
| GET | `/api/auth/facebook/start` | redirects to Facebook; callback returns to `/#welcome` or `/#login-failed` |
| GET | `/api/auth/me` | `{ user }` or 401 |
| POST | `/api/auth/logout` | `{ ok: true }` |
| GET / PUT | `/api/me/data` | the user's JSON blob: `{ data, updatedAt }` / body `{ data }` |

## Privacy

| Method | Path | Notes |
|---|---|---|
| GET | `/api/me/export` | Everything held about the signed-in user, as a JSON download |
| DELETE | `/api/me/data` | Clears saved family profiles |
| POST | `/api/me/delete-account` | Body `{ "confirm": "DELETE" }`. Erases the account; payment and order rows are kept only as de-identified accounting records |

## Marketplace

Pooja store, priest (Iyer / Purohit / Vadhyar) directory and service bookings — `server/market.js`, tables created on first use. The catalogue in `server/data/products.json` is **sample data** (`"sample": true`); replace it with real stock and prices. Prices and totals are always computed on the server. Online payment uses Razorpay when `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` are set; otherwise orders wait in `awaiting_payment_setup`. No priests are seeded: people register themselves and appear publicly only after an admin verifies them (phone numbers are never shown publicly).

| Method | Path | Notes |
|---|---|---|
| GET | `/api/store/products?category=` | `{ sample, currency, categories, products }` |
| POST | `/api/store/orders` | sign-in · `{ items:[{id,qty}], address:{name,phone,line1,city,pincode,state} }` → `{ order, payment }` |
| POST | `/api/store/orders/:id/verify` | `{ razorpay_order_id, razorpay_payment_id, razorpay_signature }` → order `paid` |
| GET | `/api/store/orders` | the user's orders |
| GET | `/api/services` | fixed list of priest services |
| POST | `/api/priests/register` | sign-in · `{ name, phone, city, languages, services, experience_years, about }` → `pending` |
| GET | `/api/priests?service=&city=` | verified priests only |
| GET | `/api/priests/me`, `/api/priests/me/requests` | the signed-in priest's profile / assigned requests |
| POST / GET | `/api/requests` | sign-in · `{ type:"service"\|"annadhanam"\|"temple_booking", service?, priestId?, templeId?, date, time?, city, people?, meals?, notes?, contactPhone }` |
| GET / POST | `/api/admin/priests[/:id/status]`, `/api/admin/orders[/:id/status]`, `/api/admin/requests[/:id/status]` | header `x-admin-token: $ADMIN_TOKEN` (503 if unset) |

## Weather & reminders

**Weather** (`server/weather.js`): forecast from [Open-Meteo](https://open-meteo.com) (no key) plus the latest METAR observation from the nearest airport within 150 km (NOAA Aviation Weather; stations in `server/data/stations.json`). Results are cached per 0.05° cell for 10 minutes; each upstream call times out after 8 s. A failed METAR gives `station: null`; a failed forecast returns 502.

**Morning alarm & trip reminders** (`server/push.js`): Web Push via `web-push`. A once-a-minute scheduler (started with the server) sends a daily "காலை வணக்கம்" notification at the chosen local time with the Tamil date, nakshatra, Rahu Kalam and festivals, and a reminder 60 minutes before each saved parigaram trip. Set `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` in production (otherwise a pair is generated into `data/vapid.json`). Subscriptions the push service reports as gone (404/410) are deleted.

| Method | Path | Notes |
|---|---|---|
| GET | `/api/weather?lat=&lon=` | `{ station:{icao,name,distanceKm,observed}\|null, current, hourly[24], daily[7], travel:{level:"good"\|"caution"\|"avoid",en,ta,reasons}, source, fetchedAt }` |
| GET | `/api/push/key` | `{ publicKey }` for `pushManager.subscribe` |
| POST | `/api/push/subscribe` | `{ subscription, prefs:{ morningTime:"HH:MM"\|null, tz, lat, lon, place, lang:"ta"\|"en", name, trips:[{id,date,time,title,place}] (max 20) } }` — upsert by endpoint |
| POST | `/api/push/unsubscribe` | `{ endpoint }` |
| POST | `/api/push/test` | `{ endpoint }` — sends a test notification now |

## Subscriptions

`server/billing.js` — plans, payments and entitlements (tables `subscriptions` and `ai_usage`, created on first use). Plans: **Free** (panchangam, charts, calendar, porutham table, 5 Ask Thunai answers a day), **Premium** ₹199 / $4.99 a month or ₹1,999 / $49 a year (unlimited chat, life-timing predictions, full analysis, porutham explanation, priority seva booking) and **Family** ₹399 / $9.99 a month or ₹3,999 / $99 a year (Premium for up to 8 family profiles). INR is paid through Razorpay (`RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`), USD through Stripe Checkout (`STRIPE_SECRET_KEY`, webhook secret `STRIPE_WEBHOOK_SECRET`). Without a gateway, checkout returns `payment_setup_pending`. Buying while a plan is active extends it from the current expiry. The free AI quota (`AI_FREE_DAILY`, default 5 a day per user or per IP when signed out, India time) is enforced only when `BILLING_ENFORCE=1`: once it is used up, `/api/ai/:task` returns 402 `{ error, upgrade: true }`. Only successful answers count.

| Method | Path | Notes |
|---|---|---|
| GET | `/api/billing/plans?currency=INR\|USD` | `{ currency, plans:[{ id, name:{en,ta}, interval, price:{INR,USD}, amount, currency, features }] }` |
| GET | `/api/billing/me` | `{ plan, status, expiresAt, entitlements:{ unlimitedAi, predictions, familyProfiles }, aiUsedToday, aiFreeDaily }` (works signed out) |
| POST | `/api/billing/checkout` | sign-in · `{ plan, currency }` → Razorpay `{ subscriptionId, gateway:"razorpay", keyId, razorpayOrderId, amount, currency }`, Stripe `{ subscriptionId, gateway:"stripe", url }`, or `{ subscriptionId, gateway:null, status:"payment_setup_pending" }` |
| POST | `/api/billing/verify` | sign-in · `{ subscriptionId, razorpay_order_id, razorpay_payment_id, razorpay_signature }` → `{ subscription }` |
| POST | `/api/billing/stripe/webhook` | Stripe `checkout.session.completed` (raw body, `Stripe-Signature` checked, 5-minute tolerance) |
| POST | `/api/admin/billing/grant` | admin · `{ userId, plan, days }` complimentary access |
| GET | `/api/admin/billing/subscriptions` | admin · all subscriptions |

## Growth & admin

`server/growth.js` — gift / trial codes, privacy-friendly usage analytics, feedback & testimonials, referrals and an admin overview (tables `gift_codes`, `gift_redemptions`, `events`, `feedback`, `referral_codes`, `referral_claims`, created on first use). Complimentary access is a normal row in `subscriptions` (gateway `gift`, `trial` or `referral`, amount 0), so it **locks automatically** at `expires_at`; `/api/billing/me` then reports `locked: true`. A gift never shortens a later expiry; referral days stack on top of the current expiry. `TRIAL_HOURS` (unset = off) gives every new signed-in user a one-time Premium trial; `REFERRAL_DAYS` (default 7) sets the referral reward. Analytics store only an app-generated `deviceId`, never IPs or personal data. `/api/billing/me` also returns `trialEndsAt` (gift/trial only), `locked` and `enforced` (`BILLING_ENFORCE=1`).

| Method | Path | Notes |
|---|---|---|
| POST | `/api/admin/gift-codes` | admin · `{ plan, hours?:1–8760 (24), maxUses?:1–1000 (1), note?, expiresAt? }` → 201 `{ code:"KJ-7F3K-9QPA", giftCode }` |
| GET | `/api/admin/gift-codes` | admin · `{ giftCodes:[{ code, plan, hours, maxUses, uses, note, createdAt, expiresAt }] }` |
| POST | `/api/billing/redeem` | sign-in · `{ code }` → `{ subscription, expiresAt }`; 404 unknown, 409 already redeemed by you, 410 expired / used up |
| POST | `/api/events` | `{ deviceId (8–64 [A-Za-z0-9_-]), events:[{ type, screen?, feature?, platform?:"web"\|"pwa"\|"android"\|"ios"\|"huawei", appVersion? }] (max 50) }` → `{ ok:true }`; types `first_open, app_open, install, screen_view, signup, login, feature, purchase, share, referral_open`; 300 calls / 10 min per IP |
| GET | `/api/admin/stats?days=30` | admin · `{ totals:{ devices, installs, users, activeToday, active7, active30, payingUsers, revenueByCurrency:{INR,USD}, orders, requests, feedbackCount, avgRating }, byPlatform, daily:[{ date, opens, newDevices, installs, signups }], topScreens, topFeatures }` (days in India time) |
| POST | `/api/feedback` | `{ deviceId, rating:1–5, comment? (≤1000), screen? }` → `{ ok:true }`; 10 / hour per device |
| GET | `/api/testimonials` | up to 20 approved `{ rating, comment, name, createdAt }` (first name, or "அன்பர்") |
| GET / POST | `/api/admin/feedback?status=new\|approved\|hidden`, `/api/admin/feedback/:id` | admin · update `{ status?, reply? }` |
| GET | `/api/referral` | sign-in · `{ code, link:"${PUBLIC_URL}/?ref=CODE", referred, rewardDaysEarned }` |
| POST | `/api/referral/claim` | sign-in · `{ code }` → `{ ok, days, subscription, expiresAt }`; accounts < 7 days old, one claim per user, not your own (400), referrer rewarded for at most 12 claims; 404 unknown, 409 already claimed, 403 account too old |
| GET | `/api/admin/overview` | admin · `{ stats, latestFeedback (5), pendingPriests, openRequests, ordersAwaitingPayment }` |

Marketplace requests also accept `type:"package"` with `{ packageId (lowercase id ≤60, e.g. navagraha, arupadai, rameswaram), people?, date, city, contactPhone, notes? }`; the response carries `packageId`.
