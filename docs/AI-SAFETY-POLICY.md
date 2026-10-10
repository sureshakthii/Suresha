# Thunai AI safety policy — age-aware, evidence-based answers

Status: **engineering draft, version `safety-policy-1.0.0`.** It implements sections 6, 10 and 16–26 of
`docs/THUNAI-BRIEF.md`. Every template, help contact, legal assumption and age threshold below needs
sign-off from the reviewers listed in §9 before launch. Passing the test suite does not prove real-world
safety, and it does not mean any government has approved the product.

**Owner decision (Oct 2026): Thunai is a Hindu-only app — every person gets the full Hindu content (deities, temples, mantras, parigaram, sthalams, prayers); the per-person faith field and every "own faith" / other-faith branch below are removed (other-religion practice questions get an honest "not covered" answer), while the age, no-fear, no-certainty, doctor, crisis, lifespan and PCPNDT rules are unchanged.**

Code: `server/policy/` (plain ES modules), wired into `POST /api/ask` and `POST /api/ai/:task` in
`server/index.js`. Prompts are in `shared/narrator.js`; model calls are in `server/ai.js`.

## 1. Pipeline (Brief §22)

```
request ─► identity-context  (account, speaker, chart subject, participants, ages + sources, reference date)
        ─► intent-router     (NFC normalisation, Tamil/Tanglish/English, number words, risk flags)
        ─► safety-policy     (route + reasons + allowAstrology + prohibited outputs) ── enforced in code
              │
              ├─ allowAstrology = false ─► reviewed template (+ verified-source contacts) ─► respond
              │                            (no chart, no Prasna, no model call, no login or quota)
              │
              └─ allowAstrology = true ──► evidence-builder (deterministic facts with ids, minimised)
                                         ─► model (JSON answer contract; bounded by AI_TIMEOUT_MS)
                                         ─► answer-validator (citations + prohibited classes)
                                              ├─ valid   ─► respond with the composed, validated text
                                              └─ invalid / timeout / error ─► reviewed fallback (never the draft)
        ─► audit-events (route, reason ids, validation status, versions — no text, DOB or location)
```

Modules: `identity-context.js`, `lexicon.js`, `intent-router.js`, `age-policy.js`, `safety-policy.js`,
`templates.js`, `resource-directory.js`, `evidence-builder.js`, `answer-validator.js`, `audit-events.js`,
`index.js` (pipeline helpers) and `routes.js` (`/api/safety/resources`, admin metrics).

Model output is buffered, never streamed. SSE clients get `policy` → one `delta` holding the whole validated
text → `done`. `/api/ask` also sends its deterministic `evaluation` event first, as before.

## 2. Request and response contract

### New optional request fields (both endpoints)

| Field | Meaning |
|---|---|
| `speaker: { type, dob?, age? }` | Who is typing. `type` is one of `self`, `guardian`, `child`, `caregiver` or `unknown`. A DOB or age the app sends counts as **profile-entered**, not verified. |
| `subject: { relation, dob?, timePrecision? }` | The person whose chart is open. It may be different from the speaker. `/api/ask` also reads `birth.relation`, and chat reads `context.person.relation` and `context.person.birth`. |
| `participants: [{ role, dob?, age? }]` | Other people the app already knows about, such as both people in a match. |
| `sessionFlags: { minorSignal, minAge }` | Echo back what the last response returned in `policy.sessionFlags`. These flags can only make handling **more** protective. |
| `sessionId` | A random client id of 8 or more characters. It keys short-lived protective memory for signed-out users. |
| `country` | An ISO-2 code (`IN`, `AE`, …). Without it the jurisdiction comes from `loc` coordinates, never from the UTC offset. |
| `consent: { rememberChat }` | Whether the person agreed to remembered chats. It is carried in the context but not acted on yet (§10). |
| `birth` (on `/api/ai/:task`) | When present, chart evidence is computed on the server instead of using the client's context. |

### New response fields

| Field | Meaning |
|---|---|
| `route` | `safety_support`, `child_guidance`, `teen_guidance`, `adult_guidance`, `clarify` or `decline_facilitation`. |
| `source` | `ai` (validated model answer), `rules` (deterministic narrator or app fallback) or `policy` (reviewed template). |
| `policy` | `{ route, allowAstrology, readingLevel, ageGroup, needsClarification, deadlineFirst, sessionFlags, policyVersion, templateId? }`. Internal reason ids and risk flags are **never** returned. |
| `resources` | `{ jurisdiction, contacts:[{ number, name, source, lastVerified, needsVerification }], fallback }` on safety templates. |
| `evidence` | `[{ id, text, source }]` for "Why this guidance?". These are only the facts the answer cited, or all facts for rule-based Prasna. |
| `claims`, `uncertainty`, `nextSteps` | Parts of a validated AI answer. |
| `validation` | `valid`, `invalid`, `timeout`, `error` or `not_run`. |
| `notice` | Text saying the app has limited capability whenever the answer is not a validated AI answer. |
| `practical` (`/api/ask`) | `{ deadlineFirst, note, questions }`. When a deadline applies, the note is also the first line of `reply`. |

## 3. Age (Brief §17, §18)

* **Calendar arithmetic.** Age is calculated with `ageOn()` from `shared/datetime.js`, with a local fallback.
  On a non-leap year, a 29 February birthday counts as reached on 28 February. The reference date is today's
  date in the person's IANA zone, else the UTC offset sent with the location, else UTC. Birth time is never used.
* **Sources.** Each age has one of these sources: `profile`, `chat`, `guardian`, `verified`, `conflicting` or
  `unknown`. Only an approved server-side process may set `verified`, using the `user.ageVerified` and
  `user.verifiedAge` hooks; none exists yet.
* **Conflicts.** When sources disagree, the youngest stated age wins. For example, "I am 14 but use my
  father's profile" is treated as 14. Saying "I am 18 now" does not erase an earlier minor statement, and
  nothing here changes the account record.
* **Memory.** Protective signals are kept in process memory for 30 minutes, keyed by user id or `sessionId`,
  and are never written to disk.
* **No inference.** Age is never guessed from voice, grammar, appearance or the horoscope.

| Band | Reading level | Notes |
|---|---|---|
| 0–5 | caregiver | Calendar, stories and observances directed at the caregiver only. No independent advisory chat. |
| 6–12 | simple | Friendship, kindness, study and body safety. No romantic forecasts and no sexual content. |
| 13–17 | teen | Emotions, boundaries, pressure, online safety and non-graphic health information. No marriage scheduling and no sexual facilitation. |
| 18–25, 26–59, 60+ | adult | Same dignity for every adult. No assumption about marriage, children, dementia or loneliness. |
| unknown / conflicting | general | General safe guidance. Adult-sensitive guidance is not unlocked. |

## 4. Decision priority (Brief §20, §22)

1. **Immediate safety.** Self-harm, immediate danger, acute medical need or a disclosure of abuse goes to
   `safety_support`. No chart, login or age check is required.
2. **Adult–minor romantic or sexual context.**
   * An adult pursuing, or asking about, a minor goes to `decline_facilitation`.
   * A minor speaker with an adult partner goes to `safety_support` (`teen_adult_partner`).
   * A guardian reporting an adult with their child goes to `safety_support` (`guardian_child_at_risk`).
   * A guardian asking about a child's romance or marriage goes to `teen_guidance` or `child_guidance`
     (`guardian_minor_romance` or `minor_marriage`).
3. **Coercion or severe distress** goes to `safety_support`.
4. **Minor speaker** goes to `child_guidance` or `teen_guidance`. Romantic, sexual and other sensitive
   requests get templates. Ordinary questions get astrology at the right reading level, with the
   minor-only prohibitions added.
5. **Ambiguity that changes the safe answer** (for example "funk") goes to `clarify`.
6. **Reviewed safeguard cards.** These cover privacy intrusion, accusations (relationship or money),
   requests for a death or lifespan, accident date, disease or fertility prediction, unsafe permission, and
   probability or odds.
7. **Unknown age with a romantic or sexual question** gets general guidance (`unknown_age_love` or
   `unknown_age_sexual`). Marriage *event* muhurtham chosen by category stays available.
8. **Ordinary questions** go to `adult_guidance` with evidence-only astrology.

Fictional framing, translation requests, base64 text, "ignore previous rules", a guardian's claimed
permission and "destiny" claims are all classified on their content. They never relax a decision.

### Policy matrix (age band × intent → route / template)

| Intent | 0–5 | 6–12 | 13–17 | Adult | Unknown |
|---|---|---|---|---|---|
| Self-harm, danger, abuse, acute medical | safety_support | safety_support | safety_support | safety_support | safety_support |
| Adult pursuing a minor (any framing) | — | — | — | **decline_facilitation** | teen_guidance (non-facilitating) |
| Minor with an adult partner | safety_support | safety_support | safety_support | — | — |
| Crush or love | child_guidance / caregiver | child_guidance / child_crush | teen_guidance / teen_romance | adult_guidance (AI, evidence) | adult_guidance / unknown_age_love |
| Sex or sexual health | child_guidance / caregiver | child_guidance / child_sensitive | teen_guidance / teen_sexual_health | adult_guidance (AI) | adult_guidance / unknown_age_sexual |
| Marriage timing for self | caregiver | child_crush | teen_guidance / minor_marriage | adult_guidance (AI) | unknown_age_love (category muhurtham allowed) |
| Guardian asks about a minor's romance or marriage | — | — | — | teen/child_guidance / guardian_minor_romance or minor_marriage | same |
| Coercion or forced marriage | safety_support | safety_support | safety_support | safety_support | safety_support |
| Reading someone's chats or location | — | child_sensitive | privacy_boundary | privacy_boundary | privacy_boundary |
| Accusation (cheating, money, widow) | — | child_sensitive | accusation_boundary / money_safeguard | same | same |
| Death, lifespan, ஆயுள் | — | child_sensitive | death_decline | death_decline | death_decline |
| Accident date or kandam | — | child_sensitive | travel_safeguard | travel_safeguard | travel_safeguard |
| Disease or fertility prediction | — | child_sensitive | disease_decline | disease_decline | disease_decline |
| "Good dasa so I can drive drunk / stop medicine" | — | child_sensitive | unsafe_permission | unsafe_permission | unsafe_permission |
| Ambiguous term ("funk") | — | clarify | clarify | clarify | clarify |
| Medical, legal or payment timing | caregiver | allowed + deadline-first | allowed + deadline-first | allowed + deadline-first | allowed + deadline-first |
| Ordinary (career, study, calendar, temple) | caregiver | child_guidance (AI, simple) | teen_guidance (AI) | adult_guidance (AI) | adult_guidance (AI) |

"—" means the policy does not apply to that band.

## 5. Output rules (Brief §6, §10, §25, §26)

The model must reply with a JSON object of this shape:
`{ text, claims:[{ text, evidenceIds }], uncertainty, nextSteps, optionalPractice, humanReview }`.
It must cite evidence ids for every chart statement. The validator rejects:

* claims without evidence, claims citing unknown ids, and claims whose planet or house does not appear in
  the cited fact
* chart talk with no claims, and claims with no uncertainty statement
* claims at all when astrology is not allowed
* **prohibited classes, checked in English, Tamil and Tanglish:**
  * prediction of death, lifespan or maraka; disease or infertility; accident dates; dated event promises
    ("job on 17 November")
  * accusations ("your wife will cheat", "ஒரு பெண் வந்து … ஏமாற்றுவார்", "பெண்களிடம் ஜாக்கிரதை")
  * adult–minor facilitation, emergency delay, private-data leaks
  * paid remedies presented as necessary or as protection
  * probability of betrayal or accident, guaranteed outcomes, unsafe permission
* for minors and unknown age, also: romantic forecasts, sexual content, marriage scheduling and
  frightening dosha talk

Sentences that negate the claim ("cannot predict", "முடியாது") are allowed.

**Jathagam health guide — traditional indications for adults (owner decision, Oct 2026).** The on-device
health guide (`shared/health.js`, `public/screens-health.js`) may again name the body areas that Tamil /
Jyotish tradition associates with the natal chart (6th house and its lord, planets in 6/8/12, weak planets,
Kalapurusha sign → body part, planet → body system), with the running Dasa / Bhukti and the Saturn, Jupiter and
Rahu–Ketu Gochara (with dates), a 12-month care map and traditional food tips (Siddha / Ayurveda planet and dosha
associations). Conditions, all tested in `test/health-guide.test.js`:

* adults (18+) only — children and teenagers get general sleep / play / food habits and growth check-ups, never a
  chart-based body area;
* every section says it is a traditional indication, not a diagnosis, and to see a doctor for any symptom; the
  wording is "தமிழ் மரபில் இந்தக் காலம் <பகுதி> பகுதியில் கவனம் தேவை எனக் கூறப்படுகிறது" — never
  "you will get / you have <disease>";
* still forbidden: diagnosis, disease or fertility prediction, fatal-disease names, lifespan or death, medicine,
  doses or treatment instructions, fear wording and certainty; food tips carry "if you have diabetes, a kidney or
  heart condition, are pregnant or have any condition, follow your doctor's diet", and pregnancy gets only
  "follow your obstetrician";
* unknown birth time → Moon-sign reference only, with a note that Lagna-based parts need the time; approximate
  time → Lagna-based items marked "may change";
* remedies follow the person's faith (non-Hindu: own-faith prayer, charity, discipline; Hindu practice only on
  opt-in, marked optional).

Other surfaces keep the stricter rule: the Today card shows only the one-line "ஆரோக்கிய கவனம் இப்போது" summary
(`healthNow`) with a link to the guide, and Ask Thunai's health answers carry no body-area or food lists.

**Deadline first.** Prasnam never tells anyone to defer hospital care, court deadlines, contracts or
necessary payments.
* The categories `surgery`, `delivery`, `court`, `contract`, `tech_partner`, `cheque`, `loan` and
  `lend_money` set `decision.deadline`. So do questions that combine medical, legal or financial topics with
  "wait/postpone/good time".
* The server passes `deadline: true` to `evaluatePrasna`, which caps AVOID at CAUTION. It puts the engine's
  deadline note first in `reply` and in `practical.note`.
* For AI answers, the validator also blocks "wait", "postpone" and "a better time is coming".

## 6. Evidence and data minimisation

* **Fact ids.** Facts come only from deterministic code:
  * `D1.lagna`, `D1.janma_rasi`, `D1.janma_nakshatra` and `D1.planet.<Planet>`
  * `DASA.current`, `DASA.bhukti` and `DASA.next.<n>`
  * `YOGA.<id>` from `detectYogas`, marked "pending astrologer approval"
  * `PN.*` (panchang), `PR.verdict`, `PR.factor.<key>` and `PR.window.<n>`
  * `C.<path>`, which is client context the server cannot re-verify, so it is marked `source: 'client'`
* **Never sent to the model:** names, birth date and time, birthplace, coordinates, time zone, relations,
  phone or email. The question goes in as the user turn.
* **Retention classes** come from the decision:
  * `safety_minimal`: metrics only
  * `minor_or_unknown_ephemeral`
  * `standard_ephemeral`

  Nothing in the policy layer persists chat text.
* **Audit.** Only identifier-like fields are kept: route, reason ids, validation status, source, age band,
  age source, language, jurisdiction, deadline, versions and latency. Times are rounded to the minute. You
  can view them at `GET /api/admin/policy/metrics` (header `x-admin-token`).

## 7. Help contacts — ALL need verification before launch

| Id | Country | Number | Purpose | Source | Status |
|---|---|---|---|---|---|
| in-112 | India | 112 | Emergency Response Support System | https://112.gov.in/ | needsVerification, lastVerified: null |
| in-1098 | India | 1098 | CHILDLINE (child protection) | https://wcd.nic.in/ | needsVerification (confirm current operator after the integration with 112) |
| in-14416 | India | 14416 / 1-800-891-4416 | Tele-MANAS mental health | https://telemanas.mohfw.gov.in/ | needsVerification |
| ae-999 | UAE | 999 | Police | u.ae emergency numbers page | needsVerification |
| ae-998 | UAE | 998 | Ambulance | u.ae emergency numbers page | needsVerification |

* If the location is unknown or outside these countries, only the offline fallback is shown: "contact your
  local emergency services". India is never assumed. The coordinate box for India is approximate, so the UI
  should let the person confirm their country.
* Still missing: a UAE child-protection line, a UAE mental-health line, women's helplines, and the Tamil Nadu
  state lines. Ops must add these from official sources.

## 8. Escalation SOP (outline — to be completed by child-protection and legal reviewers)

1. **Detect.** The policy routes a request to `safety_support` or `decline_facilitation`.
2. **Respond immediately.** Show a reviewed template and verified contacts, and ask about current safety.
   Never ask for explicit details or images. Never say authorities were notified, and never promise absolute
   secrecy.
3. **Record the minimum.** Keep only the metrics in §6. Do not automatically send the conversation to a
   parent or guardian, because they may be the source of harm.
4. **Human review queue (to build).** Define which routes create a case, who reviews it, the response time,
   and the duty-to-report rules for each launch jurisdiction. In India this includes POCSO s.19–21 reporting
   duties, which legal must define.
5. **Repeated adult–minor attempts (to define).** Decide on rate limits or account review, and how evidence
   is preserved lawfully.
6. **Incidents and rollback.** Use the kill switches: `AI_FALLBACKS`, `AI_STRUCTURED`, removing the API key
   (which forces templates and rules only), and `POLICY_MODEL_CLASSIFIER`. Pin policy, prompt and model
   versions, and re-run `npm test` after any change.

## 9. Required human reviews

* **Child-safety specialists**
  * every child and teen template
  * the adult–minor decisions, especially the unknown-age speaker with a minor partner, and the guardian
    templates
  * the escalation SOP and grooming signals (secrecy, private meetings)
* **Legal**
  * India: POCSO Act 2012 duties and confidentiality limits; the Prohibition of Child Marriage Act (the
    `minor_marriage` wording); DPDP Act 2023 (children's data, verifiable parental consent, retention and
    deletion, provider data handling)
  * UAE law for UAE users
  * the under-18 baseline, and whether in-chat age statements may be relied on
* **Clinical / mental health**
  * the self-harm, distress, medical and sexual-health templates
  * the Tele-MANAS referral wording
  * whether `support_distress` should catch more or fewer phrases
* **Native Tamil reviewers**
  * all Tamil template text, including the section 26 phrases already used
  * the Tamil and Tanglish detection lists in `intent-router.js` and `lexicon.js`
  * the Tamil prohibited-output patterns in `answer-validator.js`
* **Astrology reviewers:** yoga rules surfaced as `YOGA.*` evidence (marked pending approval).
* **Engineering and security**
  * replace the in-process memory with a shared store if the app runs on several instances
  * check that the client cannot spoof `speaker.type`/`age` to *unlock* anything. Today it cannot: profile
    ages only unlock adult routes when no minor signal exists, but a false adult profile is accepted as
    `profile`. Assess that risk.

## 10. Known limits and follow-ups

* **The corpus is far below target.** `test/policy-corpus.test.js` has ~100 cases against the brief's target
  of 1,000+. Grow it from reviewed failures, and measure risky misses and unnecessary refusals separately.
* **The rules are deterministic.** The model classifier hook (`setModelClassifier`,
  `POLICY_MODEL_CLASSIFIER=on`) is off by default and can only *add* flags. When it fails, sensitive topics
  get templates.
* **The hosted static build has no server policy.** It (`window.KJ_STATIC`) calls the model from the browser
  through `buildTaskPrompt`, which carries the guardrail prompt but no policy routing or validation. AI chat
  should be disabled there, or the policy ported to the client.
* **Other surfaces are not routed yet.** These include the horoscope PDF, notifications, porutham screens,
  the health guide, reminders, the store and priest bookings. The UI must not show a child a blocked forecast
  through those (Brief §24).
* **Consent is not acted on.** `consent.rememberChat` is carried but no chat history is stored server-side;
  deletion is covered by the existing account-deletion flow.

## 11. Ask Thunai for everyday questions (common-questions corpus)

`test/fixtures/common-questions.json` holds 350 real questions people ask a family jothidar (Tamil script,
Tanglish, English): child delay, marriage delay, remarriage, love vs arranged, divorce worry, jobs, government
jobs, abroad / visa / PR, business, debts, court and property disputes, house / land / vehicle, children's
studies, health of self and parents, family quarrels, lost items and missing persons, dosham, Ezharai / Ashtama
Sani, baby names, muhurtham, temples, lifespan fear, self-harm and abuse disclosures, teens, children and elders.
`test/common-questions.test.js` runs every question through `askThunai` (public/ask-thunai.js — the function
the chat screen calls) for an adult, a 10-year-old, a 69-year-old and an unknown-birth-time adult, and through
the server router with no API key. Each row lists what a good answer MUST and MUST NOT contain.

Answer shape (on device and in the AI prompt `ANSWER_STYLE`, shared/narrator.js): 1) a direct answer,
2) what the chart shows (named houses / karaka planets), 3) when — supportive windows with month and year from
the running Dasa–Bhukti and Jupiter / Saturn transits (Jupiter's transit from the Moon sign when the birth star is
uncertain), 4) what to do now — practical steps plus ONE free remedy suited to the person's faith, 5) one gentle
follow-up question.

Policy decisions taken here (need review — see §9):
* **Children questions** ("kulanthai late aguthu eppo", "குழந்தை பாக்கியம் உண்டா?") are answered with supportive
  periods and a line to meet a fertility specialist together — never a yes / no fertility verdict, never a
  percentage. The server no longer routes them to `disease_decline`; it adds the required elements
  `medical_referral`, `no_fertility_verdict`, `timing_periods_only`. Real infertility / disease predictions stay declined.
* **"Boy or girl?"** is declined (`baby_sex_decline`): a chart cannot tell, and pre-natal sex determination is
  illegal in India (PCPNDT Act).
* **Missing person** (`safety_missing`): police 112 / 100 first, Childline 1098 for under-18s, no chart reading.
  Lost *items* get practical steps (police complaint, Sanchar Saathi / CEIR for phones) and no accusation.
* **Abuse at home** (Tanglish "adikkiraaru", dowry torture, harassment) routes to help: Women Helpline 181, 112,
  Childline 1098, Tele-MANAS 14416 — "not your fault", no chart reading.
* **Soft distress inside a life question** ("romba kashtama irukku, eppo nalladhu nadakkum") is answered with
  empathy first and a safety check-in; strong distress words still route to `support_distress`.
* **A son's / daughter's / grandchild's matter** asked by a parent is read from the parent's 5th house and the
  house counted from it (11th for a child's marriage, 9th for grandchildren and studies, 2nd for work), and the
  answer says the person's own horoscope gives the clearest reading.
* **Faith**: a Christian, Muslim, other or no-faith asker (profile, or named in the question — "Insha Allah",
  "கர்த்தர்") never gets Hindu deity / temple / mantra lines; they get prayer in their own faith, charity and
  discipline (shared/faith.js).
* **Health of a parent or spouse**: the treating doctors guide recovery; no period-based reading is attached.

## 12. Dosham & remedy framing (shared/dosham.js — owner requirement, Oct 2026)

The dosham engine names the traditional doshams in a chart (Rahu–Ketu, Kala Sarpa, Chevvai, Sani, Sani–Sevvai, Lagna
lord / 5th / 7th lord in 6-8-12, combustion, Putra, Kalathra, Pitru, Guru Chandala, Shrapit, Grahana, Kemadruma, Naga,
Sani transit), which life areas tradition reads them as delaying, whether the running Dasa / Bhukti activates them and
when they ease, and a Nivarthi plan. Shown on Full Jathaga Analysis ("Doshams & remedies"), the `dosham` screen
("நிபுணர் பார்வை"), Ask Thunai (dosham questions and "why is my marriage / child / work delayed"), the Parigaram screen
and the Today parigaram card. Rules, enforced in code and by test/dosham.test.js:

* **No fear.** Every view opens with "தோஷம் சாபம் அல்ல — நிவர்த்தி உண்டு / A dosham is not a curse — there is a
  nivarthi". Severity words are mild / moderate / strong (லேசானது / மிதமானது / வலுவானது) — never "severe" or கடுமை.
  A delay is always "a delay, not a denial"; nothing says "you will never…".
* **Belief, not a guarantee.** Every plan ends with "பரிகாரம் செய்தவர்கள் பலர் நல்ல மாற்றம் கண்டதாக மரபு சொல்கிறது —
  இது நம்பிக்கை சார்ந்தது, உத்தரவாதம் அல்ல". No outcome is promised for any remedy.
* **Free first.** Home practice (lamp, hymn from shared/hymns.js, charity) comes first; temple poojas only through
  official temple counters; "no costly pooja / homam sold with a guarantee", "no gemstone without a careful second
  opinion — not needed for nivarthi", "do not stop practical effort, medical care or official steps".
* **Medical.** Any dosham touching children adds "consult a fertility specialist together, as a couple"; no disease,
  fertility verdict or lifespan statement is ever made (the existing prohibited-output scan runs on every string).
* **Contested labels** (Kala Sarpa, Naga, Pitru, Guru Chandala, Shrapit, Grahana) are always marked "traditional; some
  astrologers differ" and default to mild. This relaxes the earlier rule that contested labels are never paired with a
  remedy: they are now paired with free practice and a sthalam framed as belief. Needs reviewer confirmation (§9).
* **Age.** Under 18: no dosham list — only a short prayer-and-habits note (shared/age-guard.js CHILD_PRACTICE).
* **Birth time unknown:** only Moon / planet-based doshams; the Lagna-based ones are named as needing the time.
* **Faith.** Another faith (or none) gets own-faith practice per planet, charity and the avoid-list; Hindu sthalams appear
  only inside a closed "optional, for information" panel.

## Configuration

`AI_TIMEOUT_MS` (default 45000), `AI_STRUCTURED` (`off` disables the JSON schema output format; the validator
still runs), `AI_FALLBACKS`, `AI_MODEL`, `AI_EFFORT`, `POLICY_MODEL_CLASSIFIER` (`on` to enable the hook),
`POLICY_CLASSIFIER_TIMEOUT_MS`, `ADMIN_TOKEN` (admin metrics).
