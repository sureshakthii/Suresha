# 🪐 Kaippesi Jothidar — கைப்பேசி ஜோதிடர்

An AI South Indian astrology mobile app. It covers the Jathagam, a live Rasi Mandalam, Nakshatra, Horai, and Prasnam questions answered as *Do or Don't*.

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
