# Thunai — Deterministic-Prediction Safety Standard

Version `responsible-1.0.0` / `certainty-guard-1.0.0` · October 2026 · Owner: AG Technology Solutions

> **Product principle.** Thunai does not predict a fixed future. It explains traditional astrological
> interpretations, communicates uncertainty, and encourages users to make informed decisions using practical
> information and qualified professional advice.

This standard is **binding on every output**: the rules engine, AI answers, reports, human astrologers (when
added), ads, push notifications, WhatsApp/share cards, temple packages and customer-support scripts.

Code: `shared/responsible.js` (principle, disclaimer, charter, practitioner code), `shared/certainty-guard.js`
(banned-phrase library), `shared/pro-questions.js` (risk levels, upsell rules), `server/policy/` (safety
pipeline), `test/certainty-guard.test.js` (corpus + copy scan).

Status key: ✅ built and tested · 🟡 partly built · ⬜ to do before launch.

## 1. Why this matters

| Risk | What can happen | Thunai response | Status |
|---|---|---|---|
| Consumer harm | People delay medical care, reject a marriage, quit work or borrow money because of an app output | A reading is never a decision or instruction; money, health and legal questions route to professionals | ✅ |
| Legal and advertising exposure | "Guaranteed", "accurate", "wealth" or "success" claims can be misleading advertising (CCPA Guidelines 2022). A disclaimer cannot repair a misleading claim | Outcome guarantees are banned in product and marketing copy; a test scans every shipped string | ✅ |
| Psychological harm | Fear-based messages worsen anxiety, grief, compulsive checking or financial vulnerability | No fear language; no countdowns; upsell blocked on high-risk topics and for minors | ✅ |
| Government credibility | Officials may see an exploitative or superstitious app | Presented as responsible cultural and decision-support technology, with measured safety | ✅ |
| Platform risk | App-store rules forbid misleading health claims and harmful financial advice | Explicit health / finance boundaries and safety routing | ✅ |

## 2. Required language patterns

| Do not say | Say instead |
|---|---|
| "You will get married in 2027." | "Traditional interpretation may indicate a comparatively supportive period for marriage planning in 2027–28. The outcome depends on personal choice, compatibility and circumstances." |
| "You will become wealthy." | "This period may be suitable for disciplined financial planning. Do not make investment decisions based on astrology; consult a qualified financial professional." |
| "This job is guaranteed to succeed." | "The chart-based interpretation may suggest a period for exploring career opportunities. Evaluate the role, income, skills and market conditions independently." |
| "Your dosham will be removed after this remedy." | "This remedy is offered as a voluntary traditional practice. It does not guarantee a specific outcome or replace practical action." |
| "Do not marry this person." | "Porutham is one traditional input. Consider consent, values, communication, wellbeing, family expectations and independent counselling before deciding." |
| "You have a health problem." | "Traditional astrology may associate this period with attention to wellbeing. It cannot diagnose illness. If you have symptoms or concerns, see a qualified doctor." |
| "You will have a boy/girl child." | "Thunai does not provide or infer fetal-sex or sex-selection information." |
| "You will face an accident/death." | "Thunai does not predict death, lifespan, accidents, catastrophe, or irreversible harm." |

Every "Do not say" line is in the test corpus and **must be caught**; every "Say instead" line **must pass**
(`test/certainty-guard.test.js`). ✅

## 3. Answer framework (every personal answer)

1. **Traditional context** — what the interpretation means in the tradition.
2. **Uncertainty statement** — early, plain Tamil and English (`UNCERTAINTY_LABEL`, `LIMITS_LINE`).
3. **Practical considerations** — real decision factors (consent, money, health, deadlines).
4. **Safe traditional action** — a free, voluntary prayer / temple / hymn first; no guarantee.
5. **Professional referral** — doctor / emergency / SEBI-registered adviser / lawyer / crisis line.

Status: ✅ on-device answers follow the six-part structure (`public/ask-thunai.js`); AI answers must return the JSON
contract with `uncertainty` and `nextSteps` (`server/policy/answer-validator.js`).

## 4. Hard guardrails

**Blocked categories** (decline or redirect): death / lifespan / accident / catastrophe; fetal sex and sex
selection (PCPNDT Act 1994); medical diagnosis, treatment, medication changes, fertility verdicts; trading,
loans, gambling, crypto, stock-picking, guaranteed income; legal-outcome and election predictions; curses,
black magic, revenge, coercion; child marriage and child pressure readings; defamatory predictions about another
person; any instruction to avoid emergency help or professionals. ✅ (`server/policy/safety-policy.js`,
`shared/age-guard.js`, templates in `server/policy/templates.js`)

**Risk levels** (`shared/pro-questions.js` `RISK_LEVEL`):

| Level | Examples | App response |
|---|---|---|
| Low | Panchangam, festival meaning, hymn, temple, chart learning | Normal answer with a short traditional-context label |
| Medium | Marriage timing, job suitability, relationships, remedies | Uncertainty statement, practical checklist, no certainty language |
| High | Health, money, loans, pregnancy, distress, death, abuse, legal | Safety template, professional referral, limited or no astrology; **no Pro upsell** |

**Banned-phrase library** (`shared/certainty-guard.js`) — English, Tamil and Tanglish, nine categories:
`certainty`, `fear`, `never_outcome`, `death_disaster`, `financial_instruction`, `medical_instruction`,
`guaranteed_remedy`, `false_urgency`, `fetal_sex`. Refusals ("Thunai does not guarantee…", "…உறுதியல்ல") are
recognised and not flagged.

Where it runs:

| Surface | How | Status |
|---|---|---|
| AI outputs (server) | `validateAnswer` adds `certainty:*` errors → reviewed fallback, never the draft | ✅ |
| AI outputs (phone) | Ask Thunai replaces a flagged AI reply with the reviewed on-device answer and says so | ✅ |
| In-app cards, plans, notifications, share text, server copy | Copy-scan test over every string literal in `public/`, `shared/`, `server/` | ✅ |
| AI prompts | System instruction below in `shared/narrator.js` | 🟡 existing rules cover it; add the exact wording at prompt review |
| Marketing copy, social media, landing pages | Run `scanCertainty()` on copy before publishing | ⬜ process |
| Human astrologer messages, support chats | Same library on the consultation channel | ⬜ when consultations open |

**System-level AI instruction**

> Never state or imply that any future event is certain, unavoidable or guaranteed. Do not provide death,
> disease, disaster, fetal-sex, financial trading, legal-outcome or medical-treatment predictions. Describe
> astrology as a traditional interpretation, clearly state uncertainty, and provide practical, non-coercive
> guidance. Escalate high-risk topics to safety templates and professional referrals.

## 5. Design for dignity, not fear (monetisation)

Never used (each pattern is in the banned list or blocked by design):
"Your problem is serious — pay to see the remedy" · "Only three hours left to remove dosham" · "Unlock the cure
for your marriage delay" · "Pay now to know if your life is in danger" · "Your Rahu period is bad — book urgently" ·
"Buy a puja to avoid misfortune" · "Premium users get protection from negative planetary effects".

Paid features add **usefulness**: deeper chart explanation, family profiles, detailed matching report, journey
planning, festival planning, read-aloud Ithihasa, printable reports, reminders. The upgrade line is
"Unlock a more detailed traditional report and practical planning checklist." ✅ See `docs/PRO-CONVERSION.md`.

## 6. Human astrologer governance

The Verified Practitioner Code of Conduct is in `shared/responsible.js` (`PRACTITIONER_CODE`, ten rules) with the
enforcement model (`PRACTITIONER_ENFORCEMENT`): verification, training, auditable sessions with consent,
automated flagging, random audits, complaints and refunds, warning → suspension → removal, and a "Report this
advice" button after every session. Consultations are **not open**; the Services screen says so and nothing can
be booked. ⬜ enforce in the consultation product before it opens.

> Thunai will not become a marketplace where fear is monetised. Every paid expert must follow a written safety
> and consumer-protection standard.

## 7. The disclaimer

English and Tamil text in `shared/responsible.js` (`DISCLAIMER`). Shown on: Ask Thunai (before the first personal
reading) ✅, the Pro page ✅, Plans (before payment) ✅, the Charter screen ✅, high-risk answers (safety templates) ✅.
⬜ onboarding card, WhatsApp/PDF share footers, marketing landing pages.

## 8. Audit trail and dashboard

`server/policy/audit-events.js` keeps privacy-respecting events (route, reason ids, template, validation status,
versions — never message text, birth data or location) and the **Responsible Guidance Dashboard** counters shown
in the Owner Dashboard: answers checked, deterministic / fear answers blocked, safety redirects, declines,
fetal-sex refusals, death / lifespan refusals, diagnosis refusals. ✅

Targets: 100% of high-risk outputs carry a safety notice · 100% of fetal-sex queries refused · 0 tolerated death
or diagnosis predictions · 100% of paid consultants trained · complaints acknowledged within 24–48 hours ·
high-severity reports investigated within one business day.

⬜ Still to add: complaints about fear wording, consultation audits and practitioner actions (when consultations
open), share of outputs with uncertainty language, content corrections received / resolved.

## 9. Pre-meeting checklist

1. ✅ Responsible Astrology Charter (Tamil + English) — in-app screen "Responsible Astrology Charter".
2. ✅ Deterministic-prediction policy in AI validation, reports copy and the practitioner code.
3. ✅ Blocked-category and red-flag list in Tamil, English and Tanglish.
4. ✅ Uncertainty label on personal interpretations.
5. ✅ Practical checklists for marriage, job, health and money questions.
6. ✅ Refusal flows for fetal sex, death, diagnosis, treatment, trading and legal outcomes.
7. ✅ No "wealth", "success", "guarantee", "cure", "remove dosham" or "fixed future" claims (copy scan).
8. 🟡 Reporting channel built ("Report a problem"); Grievance Officer name and contact still to publish.
9. ⬜ Legal, clinical, Tamil-scholar and senior-astrologer review.
10. ✅ Safety KPI dashboard (Owner Dashboard → Responsible guidance).
