# Thunai — pre-launch security review

Scope: the Express server (`server/*`), the client modules that handle accounts and family sharing
(`public/account.js`, `public/family-share.js`, `public/core.js`), the service worker, and a read-only review of
payments (`server/billing.js`). Context: public launch in India and the UAE. The app holds birth details of whole
families, including children, so India's DPDP Act 2023 and the UAE PDPL apply.

Review date: 2026-10-07. Tests: `test/security-auth.test.js`, `test/security-idor.test.js`,
`test/security-http.test.js` and `test/security-data.test.js` (37 tests). `npm test` passes.

Severity scale: **Critical**: remote compromise or mass data exposure. **High**: one account's data exposed or
taken over, or unbounded cost. **Medium**: needs specific conditions, or weakens a control. **Low**: hardening or
hygiene.

---

## 1. Summary

The codebase started in good shape. Every SQL statement is parameterised, sessions are 256-bit random tokens
stored only as SHA-256 hashes in HttpOnly cookies, OTPs come from `crypto.randomInt`, are kept as an HMAC and
compared in constant time, and every family route checks group membership. The review found no Critical issue.

What it fixed: the gaps that would have mattered at launch.

| # | Severity | Finding | Status |
|---|----------|---------|--------|
| F1 | High | `AUTH_DEV_MODE=1` also worked in production, so the sign-in code came back in the API response and anyone could sign in as any phone number or email. | **Fixed**: dev mode is now impossible when `NODE_ENV=production`, and the server refuses to start with that variable set. |
| F2 | High | `/api/ask` called the model with no rate limit or quota of any kind, and `/api/ai/*` was capped only per IP, in memory, for 10 minutes. Anyone could run up the Anthropic bill. | **Fixed**: SQLite-backed daily caps per person, per anonymous IP and per IP, an optional global daily ceiling, the per-IP burst limit now also on `/api/ask` (over the limit it falls back to the rule-based answer), and `AI_MAX_TOKENS`. |
| F3 | High | A family member's shared profile (name, place, kattam) reached other members' phones without HTML neutralisation. Many screens put `displayName(m)` into `innerHTML` unescaped, so one family member could plant stored XSS on another member's phone. | **Fixed** on both sides. The server (`cleanShareCopy`) keeps only known fields, checks their formats and turns `< > " ' \`` into look-alike characters. The client (`cleanIncoming`) does the same again before profiles enter `state.family`. |
| F4 | Medium | No Content-Security-Policy, HSTS or Permissions-Policy, and `X-Powered-By` was exposed. | **Fixed**: `server/security.js` (details in §3). |
| F5 | Medium | No CSRF defence beyond `SameSite=Lax`. | **Fixed**: `sameOriginWrites()` refuses any state-changing `/api` call that a browser marks as cross-site. Payment webhooks are exempt. |
| F6 | Medium | A wrong OTP cost 5 tries per code, but an attacker could ask for a new code 5 times an hour, which allows about 600 guesses a day against one number, and nothing limited guessing across many numbers from one IP. The per-IP send limit lived in memory only. | **Fixed**: 20 wrong codes per number per day (counted under an HMAC of the number, never the number itself), 30 wrong codes per IP per 15 minutes, and the per-IP send limit moved to SQLite. |
| F7 | Medium | Signing in did not end a session the browser already held (no rotation), and there was no way to sign out on every device. | **Fixed**: sign-in revokes the presented token. New `POST /api/auth/logout-all`. |
| F8 | Medium | Cookies were `Secure` only when `PUBLIC_URL` was https or `req.secure`. Behind a proxy without `TRUST_PROXY`, production cookies went out without `Secure`. | **Fixed**: always `Secure` in production. |
| F9 | Medium | The database file was created `0644`, readable by every user on the host. Backups were plaintext and also `0644`. | **Fixed**: database `0600` with folder `0700`, backups `0600`. Optional AES-256-GCM encrypted backups (`BACKUP_ENCRYPTION_KEY`). |
| F10 | Medium | Account deletion left traces: limiter keys named the account in `rate_hits`, and `audit_log` rows (`user:<id>` with IP) stayed. The export also left out the person's own audit entries. | **Fixed**, with a test that dumps **every table** after deletion and searches for the id, phone, name, child's name, notes and push endpoint. |
| F11 | Low | `/api/ai/:task` accepted `constructor`, `__proto__` and similar names, because a plain object lookup also finds inherited properties. | **Fixed** (`Object.hasOwn`). |
| F12 | Low | Malformed JSON errors echoed part of the request body. | **Fixed**: a generic "Invalid JSON body" message. |
| F13 | Low | The dev OTP log printed the full phone number or email. On send failures, the logged provider error could contain the number. | **Fixed**: the dev log shows the masked identifier, and failures log only the provider and status. |
| F14 | Low | Production could start with a weak or missing configuration. | **Fixed**: `productionConfig()` refuses to start on a missing or short `AUTH_SECRET` (under 32 characters), `AUTH_DEV_MODE=1`, an `ADMIN_TOKEN` shorter than 24 characters, a non-https `PUBLIC_URL`, `RATE_LIMITS=off`, `DB_PATH=:memory:` or a malformed backup key. It warns about a missing `TRUST_PROXY`, missing VAPID keys, unencrypted backups and no admin token. |
| F15 | Low | Expired OTP rows, each naming a phone number or email, stayed in the database indefinitely. | **Fixed**: they are purged once both the code and the send window are over. |
| F16 | Low | `/api/feedback`, `/api/push/subscribe`, `/api/push/test` and `/api/priests/register` had no per-IP limit, and device ids are free to rotate. | **Fixed**: 60 writes per IP per 10 minutes (`RATE_ANON_WRITE_PER_10MIN`). |

What still needs attention: see §6 (open findings) and §7 (operations checklist).

---

## 2. Authentication and sessions

| Control | State |
|---|---|
| OTP generation | 6 digits from `crypto.randomInt`, valid 5 minutes, single use (the row is deleted on success). |
| OTP storage and comparison | `HMAC-SHA256(AUTH_SECRET, id:code)`, compared with `crypto.timingSafeEqual`. |
| Attempts and lockout | 5 wrong tries per code. 20 wrong codes per number or email per 24 h. 30 wrong codes per IP per 15 minutes. |
| Send limits | 5 codes per number or email per hour, 30 per IP per hour (SQLite). |
| Dev mode | Only outside production. `AUTH_DEV_MODE=1` with `NODE_ENV=production` blocks startup. |
| `AUTH_SECRET` | Required in production (the server throws, and the startup check also requires at least 32 characters). |
| Session token | 32 random bytes (base64url). Only the SHA-256 is stored. Never sent in JSON. |
| Cookie | `kj_session`: `HttpOnly; SameSite=Lax; Path=/; Max-Age=30 days`, plus `Secure` in production or over HTTPS. |
| Expiry, rotation, logout | Expiry is enforced in SQL. Sign-in revokes the presented token. Logout deletes the row. `logout-all` ends every session. |
| Account deletion | Deletes every session of the account (tested with two devices). |
| Facebook login | `state` is a random cookie compared in constant time. Logins are linked to an existing account by the email Facebook returns (see §6, O6). |
| Admin | `ADMIN_TOKENS` (named, with roles) or legacy `ADMIN_TOKEN`, compared in constant time. 10 failures per IP per 15 minutes locks the IP out. With no token configured, admin routes return 503 (disabled). |

## 3. HTTP hardening (`server/security.js`)

- **CSP**:
  - `default-src 'self'`.
  - `script-src 'self' 'wasm-unsafe-eval' https://checkout.razorpay.com`, plus sha256 hashes of the inline
    scripts in `index.html` (the import map) and `devices.html`, computed when the server starts. No
    `unsafe-inline` and no `unsafe-eval` for scripts. `'wasm-unsafe-eval'` lets the on-device Tesseract OCR run
    WebAssembly. It does not allow JavaScript `eval`.
  - `style-src 'self' 'unsafe-inline'`: the screens use style attributes.
  - `connect-src`: self, Nominatim, Open-Meteo, aviationweather.gov and `*.razorpay.com`. Extra hosts go in
    `CSP_CONNECT_EXTRA`.
  - `worker-src 'self' blob:`, `frame-src` self and Razorpay, `object-src 'none'`, `base-uri 'self'`,
    `form-action 'self'`.
  - `frame-ancestors 'self'`: `devices.html` previews the app in same-origin iframes.
  - Checked in headless Chromium: the app loads, navigates and compiles WebAssembly with no CSP violation.
  - `CSP_MODE=report-only` is available for a staged roll-out, and `CSP_MODE=off` as an emergency switch.
- **Other headers**:
  - `Strict-Transport-Security: max-age=15552000; includeSubDomains` whenever the request is HTTPS (`req.secure`,
    which needs `TRUST_PROXY` behind a proxy).
  - `Permissions-Policy`: microphone, geolocation and camera allowed for self, payment for self and Razorpay,
    everything else off.
  - `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
    `X-Frame-Options: SAMEORIGIN`, `Cross-Origin-Opener-Policy: same-origin-allow-popups`.
  - `Cache-Control: no-store` on every `/api` response. `X-Powered-By` removed.
- **HTTPS**: `FORCE_HTTPS=1` redirects plain-HTTP GET and HEAD with a 308 and refuses other plain-HTTP requests.
  A malformed `Host` header gets a 400 and is never reflected into the redirect.
- **CORS**: none granted. The app is same-origin, including the Capacitor `server.url` build, so no
  `Access-Control-Allow-Origin` header is ever sent (tested).
- **CSRF**: on POST, PUT, PATCH and DELETE to `/api`, the server refuses an `Origin` other than the request host,
  `PUBLIC_URL` or `ALLOWED_ORIGINS`, an `Origin: null`, and `Sec-Fetch-Site: cross-site`. Webhooks are exempt.
- **Static files**: `express.static` on `public/` and `shared/` only, with dotfiles ignored. Tests try `../`,
  `%2e%2e`, `..%2f`, `.env`, `.git/config`, `data/*.db`, `data/vapid.json` and `server/*.js`, and nothing leaks.
- **Bodies**: 64 KB of JSON by default, 256 KB for `/api/me/data` (200 KB stored), 256 KB raw for webhooks. A
  `__proto__` key in a body stays inert (tested).

## 4. Authorization and isolation (IDOR)

- `test/security-idor.test.js` lists **every** route from the Express router: 90 or more. Each one is either on
  an explicit public allow-list (computations, sign-in, webhooks, public listings, anonymous analytics) or must
  answer 401 without a session or admin token.
- Two-account tests cover:
  - saved data and export;
  - bookings (cancel), orders (verify, refund request), subscriptions (`/billing/verify`);
  - the priest profile and its requests;
  - referral codes;
  - every family route as an outsider, and as a member without the right role or permission.
- Family invites:
  - 12 characters from a 32-letter alphabet (60 bits), stored as SHA-256;
  - single use (claimed atomically), expire after 7 days, revocable;
  - honoured immediately (tested);
  - minors cannot join.
- Revoking a share deletes the server copy at once (tested). Removing a member cuts their access at once.

## 5. Data protection

- **Logs** hold no OTPs (outside dev mode), no full phone numbers or emails, and no birth data. The deletion test
  captures every `console.*` line during a full account life cycle and checks it. Policy audit events keep ids
  only (`server/policy/audit-events.js`).
- **Export** (`GET /api/me/export`) covers: account, saved data, subscriptions, AI usage and cost, gifts,
  referrals, orders, refunds, bookings and their history, priest profile, feedback, push subscriptions (without
  keys or endpoint), analytics events, family memberships, invites and shares, the person's own audit entries and
  pending sign-in codes.
- **Deletion** (`DELETE /api/me`) removes or de-identifies the person everywhere. A test searches all tables
  afterwards. Payment, order and booking rows stay as `user_id='deleted'` with addresses, notes and phone cleared,
  for tax and accounting.
- **Child data**:
  - private profiles never leave the phone;
  - shares carry birth data only (no chats, health notes or goals);
  - minors cannot become family members;
  - the AI policy treats minors separately (`docs/AI-SAFETY-POLICY.md`).
- **At rest**: database `0600`, data folder `0700`, backups `0600`, optional AES-256-GCM backups. Disk
  encryption on the host is still required (§7).
- **Secrets in the repository**: `git grep` finds no live keys. There are placeholders in `.env.example` and
  `README.md`, and `android/app/test-signing.keystore` is a deliberately public test key. `data/` and `.env` are
  ignored by git.
- **Dependencies**: `npm audit --omit=dev` reports **0 vulnerabilities** (2026-10-07). Nothing was upgraded.
- **Client storage**: no session token in `localStorage` (HttpOnly cookie only). `kj_family` holds the family's
  birth data for offline use. The admin token is a problem (see O2).
- **Service worker**: never intercepts `/api/*`, non-GET requests or other origins, so authenticated responses
  are never cached. The review-lock screen is a UX gate, not a security boundary.

## 6. Open findings (not fixed here)

| # | Severity | Finding | Recommendation | Owner |
|---|----------|---------|----------------|-------|
| O1 | Medium | `server/billing.js` Stripe webhook: on `checkout.session.completed` the plan activates without checking `session.payment_status === 'paid'`, or `amount_total` and `currency` against `amount_minor`. Delayed payment methods would unlock the plan before the money arrives. | Activate only when the payment status is `paid`. Handle `checkout.session.async_payment_succeeded`. Compare the amount and currency. | payments |
| O2 | Medium | The admin console (`public/growth.js`) keeps the admin token in `localStorage` (`kj_admin`) for good. Any XSS, or anyone with the device, gets an owner-level token. | Use `sessionStorage`, or better, admin sessions behind OTP. Give everyday staff `support` or `viewer` tokens from `ADMIN_TOKENS`, never the owner token. | growth UI |
| O3 | Low | Several screens put a member's own `displayName(m)`, goal titles and similar text into `innerHTML` without `esc()`. Data from other accounts is now neutralised at the boundary (F3), so what remains is self-XSS from a person's own entries or their own account backup. | Over time, wrap these in `esc()` (`screens-main`, `screens-tools`, `screens-health`, `screens-couple`, `screens-life`, `screens-journey`, `screens-roadmap`, `screens-trust`, `account.js` line 488). | screen owners |
| O4 | Low | Razorpay webhook: events without `x-razorpay-event-id` are not deduplicated, and Razorpay signs no timestamp, so replay protection rests on idempotent state changes. Those are idempotent today: `payment.failed` only touches `pending`, and a refund only moves to `refunded`. | Keep the transitions idempotent, and alert on a refund for an unknown payment. | payments |
| O5 | Low | `GET /api/billing/me` can grant the automatic trial: a state change on a GET request. | Move it to a POST. Risk is low (the trial is granted only once). | payments |
| O6 | Low | Facebook login links a Facebook identity to an existing account through the email Facebook returns. | Link only when the email is verified, or ask for an OTP to the account's own email or phone before linking. | auth |
| O7 | Low | Push: `/api/push/test` and `/api/push/unsubscribe` accept any endpoint (the endpoint URL works as the secret). A subscription made while signed out (`user_id` NULL) is not removed by account deletion. | The client should unsubscribe on sign-out and on deletion. Consider binding test sends to a session. | push |
| O8 | Low | The `/api/ai` burst limiter (`aiHits`) and the `/api/events` limiter are in memory, one per process. | Fine for a single instance. The daily caps are already in SQLite. | ops |
| O9 | Low | Sessions last 30 days with no idle timeout, and people cannot see their list of devices. | Add a "devices" list and an idle expiry later. `logout-all` exists. | auth |
| O10 | Low | SMS pumping (toll fraud): 30 sends per IP per hour can still be spread across many IPs to premium numbers. | Turn on Twilio Geo Permissions (India and UAE only) or Twilio Verify Fraud Guard, and watch the SMS spend daily. | ops |
| O11 | Info (DPDP) | Self-registration has no age gate. DPDP §9 requires verifiable parental consent to process a child's data. Family accounts where a parent enters a child's chart fit the parent-consent model. A minor signing up alone does not. | Add an age confirmation at sign-up and a consent notice that names the Data Fiduciary, its purposes and a Grievance Officer. Have counsel review. | product / legal |
| O12 | Info | `public/app.js` (being changed by another workstream) threw `registerServiceWorker is not defined` during the browser check. | Not a security issue. Reported to the owner. | app shell |

## 7. Deployment checklist

**Environment (production)**

- [ ] `NODE_ENV=production`. The server refuses to start on unsafe settings, and every warning printed at
      startup should be read.
- [ ] `AUTH_SECRET`: 64 hex characters (`openssl rand -hex 32`). Rotating it ends every pending OTP. Sessions are
      unaffected (they are hashes of random tokens).
- [ ] `PUBLIC_URL=https://…`, `TRUST_PROXY=1` (or the proxy's hop count or subnet), `FORCE_HTTPS=1`.
- [ ] `ADMIN_TOKENS="name:role:token,…"` with tokens of at least 24 characters, one per person, with the lowest
      role that works. No shared owner token.
- [ ] `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` set in the secret store (not generated on disk).
- [ ] SMS: Twilio and/or MSG91 (DLT template) with geo permissions limited. Email: `SMTP_URL`, `MAIL_FROM`.
- [ ] AI:
  - `ANTHROPIC_API_KEY` stays on the server only (never sent to the client; tested);
  - a spend limit set in the Anthropic console;
  - `AI_DAILY_LIMIT_GLOBAL` set to the budget; `AI_DAILY_LIMIT_USER` (default 200), `AI_DAILY_LIMIT_ANON`
    (default 100), `AI_DAILY_LIMIT_IP` (default 500), `AI_MAX_TOKENS` (default 16000) and `AI_TIMEOUT_MS`
    reviewed.
- [ ] Payments: `RAZORPAY_WEBHOOK_SECRET` and `STRIPE_WEBHOOK_SECRET` set. Webhook URLs registered over https.
- [ ] Never set `AUTH_DEV_MODE`, `RATE_LIMITS=off` or `CSP_MODE=off`.

**HTTPS and the edge**

- [ ] TLS 1.2 or later at the proxy or CDN, HTTP redirected to HTTPS, and HSTS checked after go-live (consider
      HSTS preload once stable).
- [ ] The proxy passes `X-Forwarded-For` and `X-Forwarded-Proto`, and the app is reachable **only** through it.
      Otherwise `TRUST_PROXY` would let clients spoof their IP.
- [ ] If a CDN is used (Cloudflare and similar): no caching of `/api/*` (the app already sends `no-store`) and
      WAF or bot rules on `/api/auth/otp/*`.

**Data, backups, key rotation**

- [ ] `DB_PATH` on an encrypted volume. Check that the database and its `-wal` and `-shm` files are `0600`, owned
      by the service user.
- [ ] `BACKUP_DIR` with `BACKUP_ENCRYPTION_KEY` (kept in the secret store, **not** beside the backups). Copy
      backups off the machine (object storage with versioning and restricted access) and test a restore monthly
      (`node scripts/db-backup.mjs verify|restore <file>`).
- [ ] Retention: decide and document how long to keep analytics `events` and `feedback`, `audit_log` (it holds
      IPs) and de-identified orders. Run a monthly purge.
- [ ] Rotate on staff changes, or yearly: admin tokens (`ADMIN_TOKENS`; the old token stops at once), webhook
      secrets (rotate in the gateway dashboard first), `ANTHROPIC_API_KEY`, SMS and SMTP credentials, and the
      backup key (re-encrypt the backups you keep with the new key).

**Incident response**

1. **Contain**: rotate the leaked secret. For a suspected session theft, run
   `DELETE FROM sessions WHERE user_id = ?` for the affected accounts (or all of them). Set `ANTHROPIC_API_KEY=`
   to stop all model calls. The app falls back to built-in answers.
2. **Preserve**: snapshot the database (`node scripts/db-backup.mjs backup`), the proxy logs and `audit_log`
   (`GET /api/admin/audit`, owner role).
3. **Assess**: work out which tables, accounts and countries are affected, and whether children's data is
   involved.
4. **Notify**:
   - **India (DPDP)**: report a personal-data breach to the Data Protection Board and inform affected people
     without delay. The DPDP Rules give 72 hours for the detailed report.
   - **UAE (PDPL)**: notify the UAE Data Office, and the people affected where the breach harms them.
   - The payment gateways if payment data is involved.
5. **Recover and learn**: fix the cause, add a regression test under `test/security-*.test.js`, and update this
   document.

**Before every release**: run `npm test` (all security tests included) and `npm audit --omit=dev`, check the
CSP in a browser (no "Refused to …" errors in the console), and test a backup restore.
