# 🪐 Kaippesi Jothidar — கைப்பேசி ஜோதிடர்

An AI South Indian astrology mobile app. It covers the Jathagam, a live Rasi Mandalam, Nakshatra, Horai, and Prasnam questions answered as *Do or Don't*.

## Features

- **Splash screen** with the name *கைப்பேசி ஜோதிடர் / Kaippesi Jothidar*, an animated zodiac wheel and planet backgrounds.
- **Jathagam from birth details.** Enter date, time (to the second) and place. The app draws the **South Indian Rasi (D1) and Navamsa (D9) charts** and a planet table (degree, star, pada, retrograde). It also shows the birth Panchangam and the **Vimshottari Dasa / Bhukti** schedule.
- **Live screen, synced every second:**
  - Clock in the location's time zone.
  - **Rasi Mandalam wheel**: 12 rasis, 27 nakshatras and all 9 grahas. It turns with the rising Lagna.
  - Current **Nakshatra + pada, Tithi, Moon Rasi, Yoga and Karanam**, each with a countdown to the second before it changes.
  - **Horai**: the current lord, a countdown and the full list for the day.
  - **Rahu Kalam, Yamagandam and Guligai**, with a live "active now" warning.
  - A personal **Tara Bala, Chandra Bala / Chandrashtamam** and current Dasa.
  - A live **Gochara (transit) South Indian chart**.
- **Prasnam (Ask).** Pick one of 14 categories:
  - Hospital / Surgery, Cheque signing, Meeting, Client visit, Bride / Groom seeing
  - Court, Office / Job, Contract, Travel, Land / House
  - New business, Gold / Vehicle, Loan / Investment, Exam
  
  The Prasna is cast for that exact second and scored. The result is **DO / CAUTION / AVOID** with a 0–100 gauge, the reasons behind it and the **best time windows in the next 24 hours**. The **AI Jothidar** then explains it in Tamil or English, streamed live.
- **Tamil / English** toggle.
- **Installable PWA** (Add to Home Screen) that works offline for charts and the live Panchangam.

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
| POST | `/api/ask` | `{ category, question?, lang:"ta"\|"en", loc:{lat,lon,tz,name}, birth? }`. Send `Accept: text/event-stream` to get streaming |

Example:

```bash
curl -s -X POST localhost:3000/api/ask -H 'content-type: application/json' \
  -d '{"category":"contract","lang":"en","loc":{"lat":13.08,"lon":80.27,"tz":5.5},
       "birth":{"date":"1990-01-01","time":"10:00:00","lat":13.08,"lon":80.27,"tz":5.5}}'
```

## Project layout

```
server/   Express API, AI narrator (Claude), gazetteer
shared/   astro.js (ephemeris, Panchangam, charts, dasa) · prasna.js (Do/Don't scoring)
public/   Mobile PWA: index.html, styles.css, app.js, service worker, icons
test/     node:test suites
```

> Astrology gives guidance on timing only. For surgery, legal and financial decisions, the professional's advice always comes first. The AI is instructed to say so.
