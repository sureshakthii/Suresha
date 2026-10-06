# 🪔 துணை · THUNAI — Personal Astrology & Spiritual Guidance

**உங்கள் வாழ்வின் வழித்துணை.** A Tamil/English app for daily panchangam, family horoscopes, explainable guidance and temple journeys. It was formerly "Thunai". THUNAI is a *working* brand, configurable in `shared/brand.js`.

> **Start here:** [docs/THUNAI-REVISION.md](docs/THUNAI-REVISION.md) covers what changed, what is still mocked or blocked, the server configuration, validation results, screenshots and the next-release checklist.

**Navigation:** Today · My Chart · Family · Ask · Services, with Settings behind the gear icon. The calendar and basic guidance work without signing in. Ask answers from verified chart facts in six parts, and labels each answer as AI-generated or built-in. Birth time can be Exact, Approximate or Unknown. My Spiritual Journey offers three honest options with sources and estimates clearly labelled.

## What makes it different

- **Honest astrology.** The app never uses fear, never predicts death and never pressures anyone into costly poojas or gems. Free parigarams come first: prayer, a lamp, charity, kindness.
- **You can see the calculation.** Every verdict lists the real factors (Horai, Tara Bala, Rahu Kalam, Prasna Lagna and so on) with their points.
- **Made for the whole family.** One account holds everyone's charts. It shows who should be careful today, finds muhurthams that suit every person involved, and tracks star birthdays and ancestors' thivasam.
- **A Jothidar you can talk to.** The AI chat answers in Tamil or English, by voice or text, from *your* chart and today's sky.
- **Private by design.** Birth details stay on the phone unless you sign in to back them up.

## Features

| Area | What it does |
|---|---|
| **Login** | Mobile OTP, email OTP or Facebook. The family's data is saved to the account. You can also continue without signing in. |
| **Today (இன்று)** | Tamil date and year name, festivals and vratham days, and the Subha Muhurtha day flag. Nakshatra, tithi and yoga with end times, sunrise and sunset. Gowri Nalla Neram, Rahu Kalam, Yamagandam and Guligai. The live Horai countdown, each family member's day, today's parigaram, and a WhatsApp share card. |
| **Tamil calendar** | Month view with Tamil dates and festivals: Pongal, Tamil New Year, Vinayagar Chathurthi, Deepavali, Karthigai Deepam, Thai Poosam and more. Also Pradosham, Ekadasi, Sashti, Sankatahara, Amavasai and Pournami, muhurtha days, and your Chandrashtamam days. |
| **Jathagam** | South Indian Rasi and Navamsa charts, the planet table, and Graha Balam (why each planet is strong or weak, with its parigaram). Chevvai and Rahu-Ketu dosham, Vimshottari Dasa/Bhukti, and name letters. |
| **Prasnam** | "Do or Don't?" for 14 everyday situations (hospital, cheque, court, contract and so on), cast for the exact second, with the best times in the next 24 hours. |
| **Thirumana Porutham** | All 10 poruthams (Rajju and Vedhai treated as essential), plus Chevvai and Rahu-Ketu dosham and dosha samyam. The AI explains the result. |
| **Muhurtham finder** | Marriage, graha pravesam, naming, ear piercing, annaprasanam, vidyarambam, business, property, vehicle, Manjal Neerattu and more. It checks every family member's Tara Bala and Chandrashtamam, and always excludes Rahu Kalam, Yamagandam, Ashtami, Navami and Amavasai (plus Aadi, Purattasi and Margazhi for marriage and graha pravesam). |
| **Ruthu / Manjal Neerattu** | The panchangam at the moment of Ruthu, the best first-bath (thanneer oothuthal) times, and ceremony dates. |
| **Parigaram and temples** | Personal daily remedies (weekday lord, weak planets, running dasa, Chandrashtamam), all nine Navagraha remedies, and the nine parigara sthalams with directions. |
| **Family traditions** | Natchathira (star) birthday, Thivasam/Sraddham dates for ancestors, upcoming Amavasai for tharpanam, and baby-name letters with AI name ideas. |
| **AI Jothidar chat** | Answers grounded in the person's chart, dasa, Graha Balam and today's panchangam. It has Tamil voice input and reads answers aloud. |
| **Comfort** | Tamil/English, a large-text mode for elders, and read-aloud. It is an installable PWA and works offline for charts and the calendar. |

## How the calculations work

- Planet positions come from [`astronomy-engine`](https://github.com/cosinekitty/astronomy) (accurate to arc-seconds). They are converted to sidereal using the **Lahiri (Chitrapaksha) ayanamsa**. Rahu/Ketu use the mean node.
- The Lagna comes from local sidereal time. The sunrise-based Vedic day uses real sunrise and sunset for the chosen place.
- Horai follows Tamil practice: 60-minute periods from sunrise, the first one ruled by the weekday lord.
- The Prasna score combines: Horai lord for the category, Rahu Kalam / Yamagandam / Guligai, the nature of the Nakshatra, Tithi (Rikta, Ashtami, Amavasai), Paksha, Yoga, weekday, Prasna Lagna (benefics or malefics in it, and where the Lagna lord sits), Tara Bala and Chandra Bala / Chandrashtamam. The rules live in `shared/prasna.js` and are easy to tune.
- The same code (`shared/`) runs on the server and in the phone's browser. That is how the Live screen can recompute every second without network calls.

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
| GET | `/api/places?q=madurai` | built-in world gazetteer, plus an OpenStreetMap (Nominatim) fallback; every result has an IANA `zone` |
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

## Places & time zones (worldwide)

Every place field (birth place, current location, journey start, kattam, matching) searches `shared/world-places.js`, an offline gazetteer of ~3,700 places in 240+ countries (GeoNames, CC BY 4.0 — all capitals, major cities everywhere, every Sri Lankan district, Malaysian / Singapore / Gulf towns, UK / US / Canada / Australia metros), with Tamil names and Tamil-script search for the main Tamil places. When the phone is online and the built-in list has few matches, OpenStreetMap Nominatim is asked too (through `/api/places` on the server, or directly from the offline app — debounced, one request a second, cached). Each place carries its **IANA time zone**; for online results the zone comes from the country (single-zone countries) or the nearest built-in city in the same country (US, CA, AU, RU, BR …) — never from the longitude. Charts use the offset in force on the birth date (`birthChart({ zone })`, daylight saving and historical changes included). Old profiles with only a numeric `tz` keep working; when their place is in the list the zone is attached quietly. Regenerate the data with `scripts/build-world-data.mjs` (instructions inside). Rupee estimates (journeys) also show an approximate amount in the user's currency (`shared/currency.js`); payments stay in INR.

## Login

Users sign in with a one-time code (OTP) sent by **SMS** or **email**, or with **Facebook**. Accounts, sessions and each user's saved data (family birth profiles, settings) live in SQLite (`node:sqlite`, file at `DB_PATH`, default `data/kaippesi.db`). Sessions are 30-day `httpOnly` cookies (`kj_session`).

| Channel | Provider |
|---|---|
| SMS | Chosen per number: Indian numbers (`+91`) go through MSG91 (`MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID`) when it is configured, every other country through Twilio (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM`). With only Twilio, Twilio sends everywhere (India too). With only MSG91, SMS login works for `+91` numbers only — other countries get a clear "use email" message (MSG91 is India-only; Twilio is international). |
| Email | SMTP via nodemailer (`SMTP_URL`, `MAIL_FROM`) |
| Facebook | `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`, `PUBLIC_URL` |

**Mobile numbers worldwide.** The login screen and every other mobile-number field (priest registration, bookings, contact numbers) have a searchable country-code picker (flag, Tamil / English country name, dialling code; all ITU calling regions from Google's libphonenumber metadata in `shared/country-data.js`). It defaults to the country of the phone's locale / time zone (India when unknown), checks the length loosely per country and sends the number in E.164 (`+94771234567`). The server also still accepts a bare 10-digit Indian mobile.

**Dev mode** (`AUTH_DEV_MODE=1`, or automatically outside production for any channel with no provider): nothing is sent; the code is printed to the server console and returned as `devCode` in the response, so you can log in locally with no accounts set up. In production a channel without a provider returns 503. Set `AUTH_SECRET` in production.

| Method | Path | Notes |
|---|---|---|
| GET | `/api/auth/providers` | `{ sms, smsWorldwide, email, facebook, devMode }` |
| POST | `/api/auth/otp/request` | `{ channel:"sms"\|"email", to }`: 5 per number/email and 30 per IP per hour |
| POST | `/api/auth/otp/verify` | `{ channel, to, code, name? }` → `{ user }` + session cookie (5 tries per code) |
| GET | `/api/auth/facebook/start` | redirects to Facebook; callback returns to `/#welcome` or `/#login-failed` |
| GET | `/api/auth/me` | `{ user }` or 401 |
| POST | `/api/auth/logout` | `{ ok: true }` |
| GET / PUT | `/api/me/data` | the user's JSON blob: `{ data, updatedAt }` / body `{ data }` |

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

`server/billing.js` — plans, payments and entitlements (tables `subscriptions` and `ai_usage`, created on first use). Plans: **Free** (panchangam, charts, calendar, porutham table, 5 Jothidar answers a day), **Premium** ₹199 / $4.99 a month or ₹1,999 / $49 a year (unlimited chat, life-timing predictions, full analysis, porutham explanation, priority seva booking) and **Family** ₹399 / $9.99 a month or ₹3,999 / $99 a year (Premium for up to 8 family profiles). INR is paid through Razorpay (`RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`), USD through Stripe Checkout (`STRIPE_SECRET_KEY`, webhook secret `STRIPE_WEBHOOK_SECRET`). Without a gateway, checkout returns `payment_setup_pending`. Buying while a plan is active extends it from the current expiry. The free AI quota (`AI_FREE_DAILY`, default 5 a day per user or per IP when signed out, India time) is enforced only when `BILLING_ENFORCE=1`: once it is used up, `/api/ai/:task` returns 402 `{ error, upgrade: true }`. Only successful answers count.

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
