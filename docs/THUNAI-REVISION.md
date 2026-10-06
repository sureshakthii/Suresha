# THUNAI / துணை: revision report

**Tamil tagline:** உங்கள் வாழ்வின் வழித்துணை. **English descriptor:** Personal Astrology & Spiritual Guidance.
**Branch:** `claude/kaippesi-thunai-rebrand-9rg5d1`. **Engine:** calc 2.0.0 · rules 1.0.0 (`shared/version.js`).

This report covers what changed, what is still mocked or blocked, the server configuration needed, how the work was validated, screenshots, and the checklist for the next release.

---

## 1. What was there before (inventory)

| Area | Status before | Status now |
|---|---|---|
| Panchangam, calendar, charts, dasa, porutham, muhurtham, transits, divisional charts | **Implemented on the device** (`shared/`, astronomy-engine) | Kept unchanged. Calculations were not replaced; they are now versioned and reference-checked. |
| AI Jothidar chat | Needed the server plus `ANTHROPIC_API_KEY`. Without them (the installed APK) it always showed **one fixed "today's guidance" text**. | Fixed. A new offline engine answers the actual question. AI is optional and its answers are labelled. |
| Login (OTP) | Works with Twilio, MSG91 or SMTP. The standalone APK has a local demo login. | Unchanged. Login is no longer required to use the app. |
| Payments | Razorpay and Stripe checkout. **No Razorpay webhook**, no refunds, no restore. | Verified webhook, duplicate protection, refunds, restore (§3). |
| Store | **Sample catalogue**, and checkout could take real money. | Sample cannot be bought: the server returns 409 and the app shows it browse-only. |
| Seva, priests, packages | Request records only. Hidden in the APK. | Customers can cancel their own requests; admin changes are audited. |
| Weather | Live from Open-Meteo plus METAR. | Unchanged. |
| Owner dashboard | One shared token, no audit log. | Named role-based tokens, audit log, lock-out, business metrics. |

## 2. Changes implemented

### Stage 1: brand, navigation, guidance-first home
- **Configurable brand** in `shared/brand.js`. Every surface reads it: header, splash, title, notifications, OTP texts, share card, reports, AI prompts and legal text. To rename, edit that file plus the static fallbacks listed in §7. Internal IDs (`app.kaippesi.jothidar`, `kj_*` storage keys) are unchanged, so installed apps update without losing data.
- **Identity:** a new lamp-under-temple-arch logo, a warm ivory/maroon/saffron day theme and a warm lamp-lit night theme. Noto Sans Tamil, Noto Serif Tamil and Inter are **bundled** (offline-safe, OFL licence).
- **Typography fixes from your screenshots:**
  - Words no longer break letter by letter. This was caused by `overflow-wrap: anywhere`.
  - The header is a compact single opaque line, so text no longer shows through it.
  - Bar labels are never cut off with "…". Each label sits on its own line, then the bar, then the value in words.
  - Large-text mode now scales the font itself instead of zooming the page, so nothing gets clipped.
  - New high-contrast mode, and 44 px touch targets.
- **Five tabs:** Today · My Chart · Family · Ask · Services. Settings sit behind the header gear.
  - **All tools** is a searchable directory of every feature.
  - **Simple / Detailed** view; specialist tools appear in Detailed.
  - **Advanced** section in My Chart.
- **Home opens without registration.** It leads with "What would you like guidance on? / எதற்கு வழிகாட்டல் வேண்டும்?" (text, plus optional voice) and the four suggested questions from the brief. Below that come today's essentials, saved plans, family reminders and weather. The 36-tile grid has moved to All tools.

### Stage 2: explainable Ask and birth-time certainty
- **`shared/guidance.js`** classifies the question (Tamil and English) and builds the answer only from engine facts, in six parts: *Your question · Relevant chart factors · Traditional interpretation · Uncertainty · Optional spiritual practice · Practical next step*.
  - An English question gets an English answer, even in Tamil mode.
  - Every answer is labelled **AI-generated** or **Built-in guidance (no AI)**.
  - With AI configured, the AI receives `verifiedChartFacts` and is instructed not to invent positions, yogas or dasa dates.
- **Safety rules:**
  - "Pain" triggers a clarifying question (physical, emotional or other).
  - A crisis message gives Tele-MANAS 14416 and emergency 112.
  - No death or lifespan predictions.
  - No diagnosis, and no disease risks or check-up schedules derived from the chart.
  - No guarantees about marriage, pregnancy, visas, court cases or money.
  - Kula Deivam is deferred to family elders.
  - Safety topics and private profiles never go to the AI.
- **Birth time: Exact / Approximate (± window) / Unknown** (`shared/birthtime.js`).
  - The engine recomputes the chart at both ends of the uncertainty window and reports what changes.
  - Lagnam, houses, Navamsa and divisional charts are withheld when unreliable.
  - Dasa dates are marked "± N days".
  - With an unknown time, readings use the Moon sign and say so.
  - No time is ever shown or invented.
  - A screen explains which results depend on the birth time.
- **Health:**
  - The "Health Guide" is replaced by **Wellness habits (general)**: age-based habits plus optional prayer, kept separate from the chart.
  - Marriage matching no longer contains longevity (ayul) or health scores.
  - Life-question timing is framed as traditional indicators.
  - The chart-based "bad habits" screen is removed.

### Stage 3: My Spiritual Journey
- Brings together chart factors (current dasa lord and the planet needing care), the 72-temple database and trip details: dates, starting city, budget, transport, travellers, mobility, pace and devotional preference.
- It asks only for missing fields. Typed or voice descriptions fill the form, and every filled value is highlighted and must be confirmed.
- **It offers three options:**
  - **A.** Nearby and economical.
  - **B.** A journey that fits your leave.
  - **C.** Minimal travel, or worship at home.
- **Each option includes:**
  - why it was suggested;
  - the traditional association and its source;
  - a day-by-day itinerary;
  - travel time and an itemised **estimate** with its assumptions shown;
  - opening hours marked **Unverified** ("last verified: never"), with a link to HR&CE;
  - accessibility marked **Unverified**;
  - free and simple worship options;
  - Save, Share (with a preview) and Reminders.
- Booking is shown as "not available yet".
- Ranking never uses payment. No promise of a cure or of problems disappearing.

### Stage 4: family and production commerce
- **Family:** an 8-profile cap and shared event and journey planning. Housewarming dates use the muhurtham finder with all family members pre-selected.
- **Privacy per profile:** a **Private** profile's chats stay on the phone and never reach the AI. Shares send minimal information after a preview; no birth times or private questions.
- **Commerce and operations:** see §3.
- **Privacy centre:**
  - a table of what stays on the device and what reaches servers (chat, voice, backup, analytics, bookings);
  - consent switches, with analytics now **opt-in**;
  - export as JSON, delete one profile, or delete the account and all data on the phone.
- **Owner analytics:** see §5. Shown as text with bars.

## 3. Production readiness: working, placeholder or blocked

| Integration | State | Notes |
|---|---|---|
| OTP login | **Works once configured**: Twilio, MSG91 or SMTP | Dev mode returns the code. Never set `AUTH_DEV_MODE=1` in production. |
| Subscriptions (INR) | **Works once configured**: Razorpay | Server entitlement is set by `/billing/verify` (HMAC) **and** `/billing/razorpay/webhook` (HMAC of the raw body). Duplicate events are ignored (`webhook_events`). `payment.failed` marks the subscription failed; `refund.processed` revokes access. |
| Subscriptions (USD) | **Works once configured**: Stripe Checkout | Signed webhook with event-ID de-duplication. Refund from the Stripe dashboard. |
| Restore purchases | **Implemented** | `POST /api/billing/restore` re-checks pending Razorpay orders with the gateway. |
| Cancellation | **Documented** | Plans are one-time and never auto-renew, so there is nothing to cancel. Terms are shown on the Plans screen. |
| Refunds | **Implemented** (finance role) | `POST /api/admin/billing/refund` calls Razorpay, revokes access and writes an audit record. |
| Pooja store | **Blocked on purpose** | Sample catalogue. Checkout returns 409 until a real catalogue (`"sample": false`) exists. **Stock accounting is implemented**: paid orders, plus 30-minute holds for pending checkouts, reduce what is left. Courier fulfilment is **not implemented**. |
| Seva, priest and package requests | **Request tracking, acceptance and status history** | Statuses run requested → confirmed → assigned → accepted/declined → completed or cancelled. Every change is logged in `request_events`. The assigned priest accepts or declines (`/api/priests/me/requests/:id/respond`). The customer gets a push notification on each change. **My bookings** (Services) shows the timeline and a Cancel button. **No payment or real partners yet.** Shown as unavailable in the standalone APK. |
| Human consultation | **Prepared, closed** | Fixed prices and durations are shown as proposals. Nobody is labelled "verified" until checks exist. |
| AI answers | **Optional** | Needs `ANTHROPIC_API_KEY` on the server. The standalone APK always uses the built-in engine. |
| Weather | **Working** | Open-Meteo plus METAR, no key needed. |
| Admin | **Implemented** | `ADMIN_TOKENS` with owner, finance, support and viewer roles; lock-out after 10 failures; `audit_log`; `GET /api/admin/audit` (owner only). |
| Backups | **Scheduled, verified, tested restore** | Set `BACKUP_DIR` (and optionally `BACKUP_EVERY_HOURS`, `BACKUP_KEEP`). The server backs up on schedule, verifies each copy and prunes old ones. Manual CLI: `scripts/db-backup.mjs backup | verify | restore`. Still copy backups off the server. |
| Rate limits | **Implemented, persistent** | Read routes 120/min/IP, write routes 30 per 10 min/IP, plus the admin lock-out, are stored in SQLite: they survive restarts and are shared by every process on the same database. The AI (40 per 10 min) and OTP limits are still in memory. Several servers on separate databases would need a shared store. |
| Secrets | **Server only** | No keys in client code (audited). The Razorpay *key id* is public by design. |

Do not treat a browser preview as proof of how the installed app or the server behaves. Test the signed APK against the deployed server (see §8).

## 4. Required server and API configuration
Everything is documented in `.env.example`. The minimum for a public launch:
`AUTH_SECRET`, `PUBLIC_URL`, `TRUST_PROXY` (behind a proxy), an SMS or email provider, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` (with the webhook registered in Razorpay), `ADMIN_TOKENS`, `VAPID_*`, `DB_PATH` on a persistent disk, and a backup cron job.

Optional:
- `ANTHROPIC_API_KEY`, `AI_REQUIRE_LOGIN=1`, `BILLING_ENFORCE=1` for AI;
- `STRIPE_*` for USD;
- `PRICE_*` and `AI_*_MONTHLY` to change prices and AI allowances;
- `AI_COST_INR_PER_MTOK_*` and `MARKETING_SPEND_INR_30D` for the metrics.

For the mobile app: set the repository variable `KJ_APP_URL` for a server-backed build. Leave it unset for the offline standalone build.

## 5. Analytics definitions (owner dashboard)
- **Activation:** new devices that open a personal feature (chart, ask, journey or family) within 24 hours.
- **Day-7 and day-30 retention:** the share of the new-device cohort that opens the app again on days 7–13 and days 30–36.
- **Paid conversion:** new accounts that made a real gateway payment.
- **Churn:** paid periods that ended without a new paid period within 7 days.
- **AI cost per payer:** AI token cost divided by active payers. It needs your provider's price set in the environment; nothing is guessed.
- **Acquisition cost:** marketing spend divided by new users.
- **Contribution margin:** revenue − refunds − gateway fees − AI cost. This is **not profit** and **not a valuation**.
- **Booking value:** gross value, shown separately from revenue.
- **₹800 crore over two years** is recorded only as a *stretch business ambition*. It is not a forecast and is never shown to consumers.

Analytics events contain no birth details, names or chat text, and they are off unless the person allows them.

## 6. Calculation conventions and licences
See **Settings → Calculation methods** and `shared/version.js`:
- Lahiri ayanamsa;
- mean node, with Ketu at Rahu + 180°;
- whole-sign houses from the sidereal lagna;
- sunrise as the upper limb at the apparent horizon with refraction;
- the panchangam day runs from sunrise to sunrise;
- a fixed UTC offset per profile, with **no automatic historical daylight-saving**: enter the offset that applied, for births abroad or before 1955;
- Vimshottari dasa with a 365.25-day year;
- horai of 60 minutes from sunrise;
- Rahu Kalam as one-eighth of the daytime.

**Reference checks** (`test/reference.test.js`):
- Lahiri ayanamsa at J2000 = 23°51′11″;
- the Pournami boundary matches the full moon and lunar eclipse of 3 March 2026 (11:38 UTC) within 5 minutes;
- the Amavasai boundary matches the new moon and annular eclipse of 17 February 2026 (12:01 UTC);
- Rahu and Ketu are exactly opposite; the lagna rate is checked;
- Rahu Kalam falls in the correct weekday slot.

Astronomical accuracy does not prove life predictions; the app says so in "Why this result?".

**Licence review** of runtime dependencies (`npm ls --omit=dev`):
- 81 MIT, 5 ISC, 2 BSD-3-Clause, 1 each of Apache-2.0, 0BSD, Unlicense and MIT-0: all permit commercial use;
- web-push is **MPL-2.0**: fine to use unmodified, but any changes to its files must be published;
- astronomy-engine is **MIT**;
- the bundled fonts are **SIL OFL 1.1** (licence files are in `public/fonts/`).

## 7. Renaming the brand
Edit `shared/brand.js`. The static fallbacks that cannot import it are:
- `public/manifest.webmanifest`
- `capacitor.config.json` (`appName`)
- `android/app/src/main/res/values/strings.xml`
- `ios/App/App/Info.plist` (`CFBundleDisplayName`)
- `public/sw.js`
- `mobile/prepare.mjs` (launcher)
- `scripts/build-artifact.mjs` (`<title>`)
- the header and splash fallback text in `public/index.html`, which `applyLang()` overwrites at runtime

A handful of sentence-level strings say "Thunai" literally; find them with `grep -rn "Thunai\|துணை" public server shared`. Trademark and domain checks are still pending, and `supportEmail` is a placeholder.

## 8. Validation results
- `npm test`: **152 tests pass**, up from 120. New suites:
  - `thunai.test.js`: brand; classification of the screenshot questions; *different questions get different answers*; the six-part structure; safety rules; birth-time rules; journey labels and arithmetic.
  - `production.test.js`: webhook signature and duplicates; payment failure and restore; refund role and audit; closed sample store; booking cancellation; export and delete; admin roles and lock-out; rate limits; metrics.
  - `reference.test.js` and `backup.test.js`.
- The standalone (APK) bundle was built with `node mobile/prepare.mjs --standalone` and driven in Chromium at phone size: **no console or page errors**. The screenshots in `docs/screenshots/` were taken from that bundle.
- **Not verified here:**
  - a real Razorpay or Stripe transaction;
  - real SMS or email delivery;
  - push notifications on a device;
  - an installed Android or iOS build;
  - screen-reader passes (TalkBack, VoiceOver);
  - Tamil voice input on a phone;
  - AI answers with a real API key.

  These need the reviewable build and test keys (§10).
- **Automated layout and accessibility checks** (run for this release): all 42 screens at 320 px, in normal and large text, show no sideways overflow and no script errors. Every button has an accessible name, every field a label, every image an alt attribute. The active tab is announced as the current page, and focus moves to each new screen's heading.
- **Known issues and limits:**
  - The AI and OTP rate limits are still in memory, per process.
  - The temple data is compiled, not expert-reviewed. Reviewers record checked facts in `shared/temple-verified.js` (source, date, reviewer); those show as **Verified**, and reviews older than 180 days show as **Needs re-check**. Everything else stays **Unverified**.
  - The journey's road distances are straight-line × 1.3.
  - The older specialist screens were reviewed for fear and guarantee language. Fixed: the Prasnam "success is certain" line, and the Rahu-in-6th court promise. Transit readings carry a "tendencies, not guarantees" note.
  - The automated 320 px check is not a substitute for testing on real small phones.

## 9. Screenshots of key flows
In `docs/screenshots/`, taken from the offline bundle at 390×844 px:

| File | Flow |
|---|---|
| `01-home-ta.png` | Guidance-first Today |
| `02-ask-car-en.png` | The car colour/number question answered in English in the six parts |
| `03-ask-weak-ta.png` | Weak planet question in Tamil |
| `04-mychart.png` | My Chart with the current-period card and Advanced section |
| `05-mychart-unknown-time.png` | Unknown birth time: lagna withheld |
| `06-family.png` | Family hub |
| `07-services.png` | Services and commitments |
| `08-journey-form.png` | Journey form with highlighted values to confirm |
| `09-journey-options.png` | Three journey options |
| `10-privacy.png` | Privacy centre |
| `11-settings.png` | Settings (view, high contrast, read-aloud speed) |
| `12-vargas.png` | Divisional charts |
| `13-consult.png` | Human consultation (prepared, closed) |
| `14-store.png` | Sample store, browse-only |
| `15-plans.png` | Plans with test prices and terms |
| `16-home-en-dark.png` | English, night theme |

## 10. Next-release checklist
1. [ ] Trademark and domain search for "Thunai / துணை"; set `supportEmail`.
2. [ ] Build the **reviewable** APK: Actions → "Mobile apps" → Run workflow. This publishes the `test-latest` release, which is a public link on a public repository, so decide first. Install it and walk through every screen with elders and young users.
3. [ ] Deploy the server with the §4 settings. Register the Razorpay webhook. Make one ₹1 test-mode payment, one deliberately failed payment, and one refund.
4. [ ] Run a TalkBack/VoiceOver pass and check large text on a 5-inch phone.
5. [ ] Expert review of temple associations. Verify the opening hours and accessibility for the top 20 temples and record them in `shared/temple-verified.js` (source, date, reviewer).
6. [ ] Set the AI cost prices, and decide whether to set `BILLING_ENFORCE=1` and `AI_REQUIRE_LOGIN=1` after measuring usage.
7. [ ] Legal review of terms, refunds and privacy against the DPDP Act 2023 and DPDP Rules, plus app-store data-safety forms. Confirm the phased compliance dates with counsel.
8. [ ] Set `BACKUP_DIR` on the server, copy backups off-site, and do a restore drill with `scripts/db-backup.mjs restore`.
9. [ ] Store: only with a real catalogue, stock handling and a courier partner. Bookings: only with operational partners and disclosed commissions.
10. [ ] Do not enable real charges publicly until steps 2, 3 and 7 are done.
