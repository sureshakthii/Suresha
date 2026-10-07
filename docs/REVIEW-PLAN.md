# Thunai — controlled public review plan (brief §14)

A small, opt-in review with adults before any open launch. Its purpose is to learn whether Thunai is useful,
understood and reliable — not to sell. Release and rollback mechanics are in [RELEASE.md](RELEASE.md).

## 1. Who takes part

Adults (18+) only, each one invited personally and opting in with a short consent note (what is collected, how to
leave, how to ask for deletion). No children's profiles are created for the review; a reviewer may add an adult
family member only with that person's consent.

| Cohort | Size | Why |
|---|---|---|
| Families (parent + adult child, same household) | 8–10 households | Family profiles, Today, festivals, temple journeys |
| Young adults (18–30) | 10 | Ask Thunai tone, comprehension, privacy expectations |
| Diaspora (UAE, Singapore, Malaysia, UK, North America, Sri Lanka) | 10 | Time zones, flights in journeys, currency, local temples |
| Older adults (60+), Tamil-first | 10 | Tamil wording, text size, voice, simple navigation |

Reviewers are not paid per finding and are not told what to conclude.

## 2. What they get

- Android: the **time-limited review APK** (Actions → Mobile apps → `review_hours`, `review_days`); it stops
  working by itself. Web: the review site or the static artifact (`npm run build:artifact`).
- Server flags during review: `SERVICES_OPEN` unset (no seva / priest / package requests), `BILLING_ENFORCE`
  unset (no paywall), payment keys unset (checkout shows "setup pending"), `AI_MODEL` pinned.

## 3. Demo-only and out of scope — said up front

- **No payments and no bookings.** Plans, seva, priests, packages and the pooja store are shown for feedback only;
  nothing can be bought or booked, and the app says so.
- Temple hours, phone numbers and accessibility are **not verified** yet; the app labels them "Needs checking".
  Crowds, travel times, costs and flight times are labelled "Estimated". Nobody should travel on the app's word alone.
- Astrology readings, porutham and remedies are traditional guidance whose rules are still awaiting astrologer
  sign-off (`proposed`). They are not predictions anyone has validated (see [ACCURACY-REPORT.md](ACCURACY-REPORT.md)).
- Health, legal and money decisions: the app points to professionals; reviewers should too.

## 4. Feedback and defect channels

| Channel | For | Handling |
|---|---|---|
| In-app "Report a problem" (`POST /api/feedback`, type `defect`) | Bugs, wrong dates, confusing screens | Triage daily; severity per [RELEASE.md §9](RELEASE.md) |
| In-app rating / comment (type `feedback`) and "Was this clear?" | Usefulness, comprehension | Weekly summary |
| Private group chat or email run by the team | Questions, screenshots, urgent issues | Answered within one working day |
| Two short interviews per cohort (week 1 and the last week) | Depth: what they would pay for, what worried them | Notes, no recordings without consent |
| Safety line to the owner | Any harmful, frightening or child-related answer | S1: kill switch first, then investigate |

## 5. What we measure

| Metric | Source | Target to pass |
|---|---|---|
| Usefulness ("Would you open this again tomorrow?", 1–5) | Feedback + interviews | Median ≥ 4 in at least three cohorts |
| Comprehension ("Was this clear?" yes rate; can explain a result back in their own words) | `comprehension_feedback` events, interviews | ≥ 80 % yes; older adults ≥ 70 % |
| Task completion (chart, porutham, journey plan, names, prasnam, weekly plan) | `task_complete` events / tasks started | ≥ 70 % for chart, journey, porutham |
| Reliability (crash-free sessions; calculation defects) | Defect reports, server logs | No open S1/S2; zero unexplained calculation defects |
| Willingness to pay (stated, no money taken) | `plan_click`, interviews | Recorded only; no target |
| Safety | Defects + audit | Zero unhandled harmful answers |

Analytics are sent only with the person's analytics consent and contain no personal data ([README](../README.md),
`server/growth.js`).

## 6. Timeline

1. Week 0: invitations, consent, review APK built, flags set, backup taken.
2. Weeks 1–3: use at home; weekly triage and fixes (a new review APK each week if needed).
3. Week 4: final interviews, metrics summary, go / no-go note to the owner.

## 7. Rollback and stopping

- Any S1 incident: switch off the affected feature ([RELEASE.md §7](RELEASE.md)) — e.g. unset `ANTHROPIC_API_KEY`
  — tell the cohort, and resume only after a written review.
- A bad build: roll back the server deploy and re-publish the last good review APK; review APKs also expire by
  themselves after `review_days`.
- A reviewer can leave at any time; on request their account and data are deleted (Settings → delete account).

## 8. Exit criteria

The review ends with **go** to a wider launch only when all of these hold:

- [ ] Every metric in §5 met, or a written owner decision for any miss
- [ ] No open S1 or S2 defect; every calculation defect fixed with a regression test
- [ ] Astrologer, Tamil-language, legal, child-safety and clinical sign-offs in [HANDOVER.md §2](HANDOVER.md) done for
      the features that will launch
- [ ] Temple facts shown as practical information are verified (or remain clearly labelled "Needs checking")
- [ ] Backup restore drill done; rollback rehearsed once
- [ ] Payments and bookings stay off until fulfilment partners and payment review are in place

Otherwise the result is **no-go** with a list of fixes and a date for a second review round.
