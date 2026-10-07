# Thunai — development handover

This records what the rebuild against [`THUNAI-BRIEF.md`](THUNAI-BRIEF.md) delivered in code, and what only people can finish: expert sign-off, legal and medical review, verified contact numbers, the server, and the pilot. Finishing the code is **not** release approval (brief §30).

## 1. Status by brief section

| Brief section | Status | Where |
|---|---|---|
| §2 Engine audit | Done in code. Independent Swiss Ephemeris benchmark done (positions, panchangam, sunrise, dasa, Pratyantara/Sookshma, D9/D10/D12/D30/D60, sankranti); versions stamped and tested. Astrologer sign-off of D60 and rules still pending | `shared/astro.js`, `shared/datetime.js`, `shared/varga.js`, `docs/ENGINE-CONTRACT.md`, `docs/ACCURACY-REPORT.md`, `docs/CALCULATIONS.md`, `scripts/benchmark/` |
| §3 Rule governance | Done: versioned registry, tradition profiles, review status | `shared/rules/`, `docs/RULE-REGISTRY.md` |
| §4 House-lord roles (Badhaka, Maraka, Kendradhipathya) | Done as neutral facts, status *proposed* | `shared/rules/roles.js`, `houseRoles()` in `shared/analysis.js` |
| §4 Ayul Balam | Removed from consumer output | `shared/lifecheck.js`, `shared/couple.js` |
| §5 First 20 yogas + repairs | Done, status *proposed*; disputed labels off by default | `shared/rules/yogas.js`, `shared/rules/disputed.js` |
| §6, §16–24 Age-aware evidence-based AI | Done: policy routing, evidence bundle, validator, reviewed templates | `server/policy/`, `server/ai.js`, `docs/AI-SAFETY-POLICY.md` |
| §7 Birth-time uncertainty | Done: profiles pass `timeCertainty` to the engine (`birthArgs`); unknown time gives no Lagna anywhere ("needs birth time", Moon-based results); approximate times show "may change within ±N min" chips from `chart.stability` on chart, vargas and analysis; DST-repeated times ask earlier / later in the family form | `birthChart`, `chartStability`, `birthArgs`, `public/core.js` `stabilityChip` |
| §8 Five destinations, Today ≤ 3 cards, accessibility | Done; native Tamil review pending | `public/` |
| §9 Temple and leave planner | Done and wired into the journey screen and temple cards: every practical item is labelled Live / Saved / Estimated / Verified / Needs checking from one provenance model; tradition shown apart from travel facts; offline "Check before travel" banner; trip end date; accessibility needs (wheelchair, limited walking, elderly companion, toilet access, rest breaks). Saved journeys can be opened, renamed and deleted. No temple fact is verified yet (`VERIFIED` is empty) | `shared/journey.js` (model), `shared/temple-planner.js`, `shared/temple-verified.js`, `public/screens-journey.js`, `public/screens-world.js` |
| §10 Health, decisions | Done: no disease/lifespan inference; Prasnam deadline-first | `shared/health.js`, `shared/prasna.js`, `shared/special.js` |
| §11 Privacy, payments | Export and delete added; payments already verified server-side | `server/auth.js`, `server/billing.js` |
| §25–26 Themes and practical safeguards | Done; themes *proposed* | `shared/themes.js`, `shared/safeguards.js` |
| §27–29 First/remarriage matching, consent | Done: modes, adult check, two-person consent, five cards, no verdict | `shared/marriage-context.js` |
| §12, §23, §30 Release evidence | Partly: 620+ automated tests (`npm test`); release and rollback process written; controlled review plan written; expert fixtures and pilot pending | `test/`, `docs/RELEASE.md`, `docs/REVIEW-PLAN.md` |

Run `npm test` to check: every suite passes on this branch.

## 2. Waiting on people

| Owner | What is needed | Where to look |
|---|---|---|
| **Master astrologer** | Approve or correct every rule (55, all *proposed*): Badhaka scheme, Maraka facts, the 12-Lagna functional benefic table, Chevvai exceptions, Neecha Bhanga and Kemadruma conditions, yoga predicates, source verses | Sign-off sheet in `docs/RULE-REGISTRY.md` |
| Master astrologer | Varga mappings (D60 awaiting review), default Horai method, combustion orbs, strength weights | `docs/ENGINE-CONTRACT.md` §9 |
| Master astrologer | 100 de-identified charts with his own reading, used as test fixtures | Brief §12 |
| Second reviewer | Disputed or high-impact rules | Brief §3 |
| Engineering | Swiss Ephemeris benchmark is done as a dev-only script (not shipped, so the AGPL does not reach the app — confirm with legal before shipping any SE code). Still open: 200 committed astronomical fixtures | Brief §2, §12, `docs/ACCURACY-REPORT.md` |
| Child-safety reviewer | All age-route templates, escalation SOP | `docs/AI-SAFETY-POLICY.md` |
| Legal | POCSO duties, DPDP Act 2023 and 2025 Rules (child data, consent, retention), UAE law, marriage eligibility beyond age 18, ephemeral matching consent | `docs/AI-SAFETY-POLICY.md`, `shared/marriage-context.js` |
| Clinician | Self-harm, distress, sexual-health templates; age-wise screening list (source is a placeholder) | `server/policy/templates.js`, `shared/health.js` |
| Native Tamil reviewer | All Tamil wording, glossary and the Tamil/Tanglish detection patterns | `server/policy/lexicon.js`, every `{ en, ta }` string |
| Operations | Verify help numbers: India 112, 1098, 14416, 1930; UAE 999, 998. Add a UAE child line, mental-health line, women's helplines and Tamil Nadu lines | `server/policy/resource-directory.js` (`needsVerification: true`) |
| Operations | Verify temple hours, phone numbers and accessibility by phone or the official site, then add each to `VERIFIED` with source, date and reviewer (shows as "Verified" for 180 days) | `shared/temple-verified.js` |
| Product | Government partnership: describe it only as proposed until there is a written agreement | Brief §16 |

## 3. Putting the server up

Full steps are in [`DEPLOY.md`](DEPLOY.md) (Render blueprint, Docker, own domain). Short version:

1. Deploy with `render.yaml` or the `Dockerfile`. Mount a persistent disk at `/data`.
2. Set the required secrets:
   - `AUTH_SECRET` (the server refuses to start in production without it)
   - `ADMIN_TOKEN`
   - `PUBLIC_URL`
   - `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`
3. For Ask Thunai, set `ANTHROPIC_API_KEY`. Optional: `AI_MODEL` (default `claude-opus-5-5`) and `AI_TIMEOUT_MS` (default 45000). Without a key the app answers from reviewed templates only, and says so.
4. Login providers: an SMS provider (Twilio or MSG91 with DLT template), SMTP for email, and Facebook if used.
5. Payments: set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`. For USD, also set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`.
6. Check `GET /api/health` → `{"ok":true}`, then run the click-through below.
7. Keep a single server instance until session memory for the AI policy moves to a shared store. It currently lives in one process.
8. Back up `/data` daily and test a restore before the pilot.

Mobile builds: [`MOBILE.md`](MOBILE.md). The app id stays `app.kaippesi.jothidar`, so existing installs update in place; only the display name changed to Thunai.

## 4. Before the pilot (release gates, brief §30)

- [ ] Astrologer sign-off sheet returned; approved rules switched to `approved` with reviewer name
- [ ] Engine benchmark signed
- [ ] Help contacts verified with dates
- [ ] Legal, child-safety, clinical and Tamil reviews signed
- [ ] Security review (OTP, sessions, admin token, payment webhooks, account isolation)
- [ ] Backup restore drill done
- [ ] Controlled family pilot with incident reporting and rollback (`AI_MODEL` pin, kill switch: unset `ANTHROPIC_API_KEY`)
- [ ] Evaluation corpus grown from about 100 to 1,000+ conversations
