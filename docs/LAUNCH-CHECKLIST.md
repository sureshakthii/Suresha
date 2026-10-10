# Launch checklist — what people must supply

The code is ready to run, but these items can only come from the owner, a professional or an outside account.
Nothing here can be done by changing code alone. Tick each one before the app is opened to the public.

## 1. Contacts and addresses (owner)

- [ ] **Support email**: a real inbox someone reads. Put it in `SUPPORT_EMAIL` in `shared/brand.js`. Until then the
      app says "Support contact will be published at launch".
- [ ] **Grievance Officer** (required by India's IT Rules 2021 and DPDP Act 2023): name, email and phone, in
      `GRIEVANCE` in `shared/brand.js`.
- [ ] **Domain**: buy it, point it at the server and turn on HTTPS (`docs/DEPLOY.md`, "Your own domain and HTTPS").
      Then set `PUBLIC_URL=https://your-domain` on the server. This also fills in the share preview links
      (`https://thunai.example` in `public/index.html` is replaced automatically).
- [ ] **Share / download link**: the address printed on share cards and shared text. Put it in `APP_URL` in
      `shared/brand.js` (the website, or the Play Store page once it exists).
- [ ] **Brand name check**: "Thunai / துணை" is a working name. Confirm the trademark and domain are free.

## 2. Server secrets (owner, set on the host, never in git)

- [ ] `AUTH_SECRET` (`openssl rand -hex 32`), `ADMIN_TOKENS` (24+ characters each), `FORCE_HTTPS=1`, `TRUST_PROXY=1`.
- [ ] `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` for reminders (`npx web-push generate-vapid-keys`). Never change them later.
- [ ] **AI**: `ANTHROPIC_API_KEY`, a monthly spend limit in the Anthropic console, and `AI_DAILY_LIMIT_GLOBAL` to match it.
- [ ] **Backups**: `BACKUP_DIR` plus `BACKUP_ENCRYPTION_KEY` (kept in a password manager, not on the server disk).
      Copy backups off the server and do one test restore (`node scripts/db-backup.mjs verify|restore <file>`).
- [ ] Full list of variables: `docs/DEPLOY.md`. Security settings: `docs/SECURITY-REVIEW.md` §7.

## 3. Sign-in by SMS and email

- [ ] **India SMS**: MSG91 account with a **DLT-registered** sender ID and OTP template (`MSG91_AUTH_KEY`,
      `MSG91_TEMPLATE_ID`). DLT registration takes days — start early.
- [ ] **Other countries**: Twilio account (`TWILIO_*`), with SMS geo-permissions limited to the countries you serve.
- [ ] **Email codes**: an SMTP account (`SMTP_URL`, `MAIL_FROM`) on your own domain.

## 4. Payments

- [ ] **Razorpay** (India, ₹): live keys `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`; webhook
      registered at `https://your-domain/api/billing/razorpay/webhook`.
- [ ] **Stripe** (UAE dirham and US dollar): `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`; webhook at
      `https://your-domain/api/billing/stripe/webhook` with `checkout.session.completed` and `charge.refunded`.
- [ ] **Stripe AED**: confirm AED is enabled on the Stripe account and do one real AED test payment and refund
      (checklist in `docs/DEPLOY.md`, "Payment currencies").
- [ ] Final prices agreed (`docs/COSTING.md`); remove the "initial test prices" wording once they are final.

## 5. App stores

- [ ] **Signing key**: create the upload keystore once and keep two safe copies. Add the GitHub secrets
      `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`
      (`docs/MOBILE.md`). Losing this key means you can never update the app.
- [ ] **Play Store listing**: developer account, short and full description in Tamil and English, 512 px icon
      (`public/icon-512.png`), a 1024×500 feature graphic, phone screenshots, privacy policy URL, the Data safety
      form and the content rating questionnaire (`docs/MOBILE.md`).
- [ ] The app id stays `app.kaippesi.jothidar` (so existing installs update). Do not change it.
- [ ] iPhone (optional): Apple developer account, App Store listing and App Privacy answers.

## 6. Expert sign-offs (people outside engineering)

Each reviewer signs and dates their part; the app keeps showing "proposed" or "Needs checking" until they do.

- [ ] **Master astrologer**: every rule in the sign-off sheet of `docs/RULE-REGISTRY.md` (including the Dosham &
      Nivarthi rules), varga mappings and defaults in `docs/ENGINE-CONTRACT.md` §9, open questions in
      `docs/PREDICTION-AUDIT.md`. A second reviewer for disputed rules.
- [ ] **Native Tamil scholar**: all Tamil wording on screens, `server/policy/lexicon.js`, the Tamil templates in
      `server/policy/templates.js` and `docs/AI-SAFETY-POLICY.md` §9.
- [ ] **Lawyer**: terms, privacy and refund text (`public/legal.js`), DPDP Act 2023 and Rules, POCSO duties, UAE
      law, child-marriage wording (`docs/AI-SAFETY-POLICY.md` §9, `shared/marriage-context.js`), and the
      Swiss Ephemeris licence note in `docs/HANDOVER.md`.
- [ ] **Clinician**: self-harm, distress, medical and sexual-health templates (`server/policy/templates.js`),
      health screening list (`shared/health.js`), Tele-MANAS wording.
- [ ] **Child-safety specialist**: age-route templates and the escalation procedure (`docs/AI-SAFETY-POLICY.md` §8).

## 7. Facts to verify by phone or official source (operations)

- [ ] **Help numbers**: India 112, 1098, 14416, 1930; UAE 999 (police), 998 (ambulance); add the missing local
      lines (`server/policy/resource-directory.js`, all marked `needsVerification`).
- [ ] **Temple timings, phone numbers and access**: check each temple and add it to `VERIFIED` in
      `shared/temple-verified.js` with source, date and reviewer name. Unchecked ones stay labelled "Needs checking".

## 8. Last steps

- [ ] `npm test` passes; the security checklist in `docs/SECURITY-REVIEW.md` is ticked.
- [ ] A small family pilot (`docs/REVIEW-PLAN.md`) with a way to report problems and to roll back (`docs/RELEASE.md`).
