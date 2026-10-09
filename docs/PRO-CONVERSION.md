# Thunai Pro — the Ask → Pro conversion engine

October 2026 · For founders and investors. Code: `public/screens-hubs.js` (Home box), `public/screens-tools.js`
(Related list), `public/screens-pro.js` (Pro page), `shared/pro-questions.js` (questions, rules, funnel maths),
`server/growth.js` (funnel metrics), Owner Dashboard → "Ask → Pro conversion funnel".

## 1. The journey

```
Home: "How can I help you today?"   ─►  Ask Thunai answers (free, from the person's own chart)
   (help_search)                          │
                                          ▼
                              ↳ Related (3 deeper questions, "Pro" tag)      (related_view)
                                          │ tap                              (related_click)
                                          ▼
                     Pro page: the question · "Already prepared from your chart" (true facts)
                               · 🔒 what the complete answer explains · honest price      (pro_view)
                                          │ "Activate Pro & see my answer"                 (pro_cta)
                                          ▼
                           Payment (Razorpay / Stripe) ─► the chosen question opens in Ask  (purchase)
```

1. **Home box.** A polite, working field — "How can I help you today?" / "இன்று உங்களுக்கு எப்படி உதவலாம்?".
   Typing shows "Ask Thunai: '…'" plus matching tools. Enter sends a question to Ask Thunai, or opens the one tool
   a short word names ("porutham").
2. **Free answer first.** Value comes before any ask: the person gets a real answer with reasons.
3. **Related.** Like Perplexity's follow-ups: three deeper questions for that topic, worded as explanation,
   never certainty ("Which periods… are traditionally more supportive for marriage planning?").
4. **Pro page.** Shows the question, the chart facts already computed for this person (birth star, rasi, lagnam,
   running dasa and bhukti with end dates), what the complete answer covers, the price per day and the yearly
   saving, then one button. After paying, the app opens that exact question.

## 2. Why it converts — and why it stays clean

| Lever | How Thunai uses it | Kept honest by |
|---|---|---|
| Reciprocity | A useful free answer before any ask | Free daily guidance never gets locked |
| Curiosity / the open question | The person chooses a deeper question they care about | Questions promise explanation, not outcomes |
| Personal relevance (endowment) | "Already prepared from Suresh's chart" with their own dasa dates | Only engine-computed facts are shown |
| Goal gradient | Part of the work is visibly done; the outline shows what is left | No fake progress percentages |
| Price anchoring | "About ₹5.5 a day · Save ₹389 vs monthly" | Computed from the real plan prices (`priceFrame`) |
| Low friction | One tap, then the question opens after payment | Same flow for UPI, cards and Stripe |
| Risk reversal | Cancel any time; packages never renew; same privacy on every plan | Matches the server's plan terms |
| Choice | Yearly recommended, monthly available, plain "Not now" | No confirm-shaming |

**Never used** (CCPA Dark Patterns Guidelines 2023 and Thunai's own standard): false urgency or countdowns,
fear ("before it is too late", "protection from bad planets"), invented social proof, nagging, confirm-shaming,
hidden auto-renewal, drip pricing. High-risk topics (health, money, loans, court, a missing person, crisis) and
every child or teen profile get **no upsell**. The copy is checked by `test/certainty-guard.test.js`.

## 3. What the investor dashboard shows

Owner Dashboard → **Product use** → "Ask → Pro conversion funnel" (consented analytics only, last 30 days):

| Step | Event | Shows |
|---|---|---|
| Asked from the Home box | `help_search` | Daily intent |
| Saw related questions | `related_view` | Reach of the upsell surface |
| Tapped a deeper question | `related_click` | Curiosity → interest |
| Saw the Pro page | `pro_view` | Qualified interest |
| Tapped Activate Pro | `pro_cta` | Purchase intent |
| Paid | `purchase` | Conversion |

Each row shows the count, the % of the previous step and a bar for the share of the first step. "Deeper questions
people tapped" ranks which questions sell best, so marketing spends on the topics that convert.

## 4. Planning targets (assumptions, not results)

These are **targets to test in the pilot**, not measured performance; replace them with real dashboard numbers
before sharing outside the company.

| Step | Target conversion from previous step |
|---|---|
| Answer → saw Related | 60% |
| Related → tapped | 20–25% |
| Pro page → Activate tapped | 25–30% |
| Activate → paid | 20–25% |
| **Overall: Related viewers → payers** | **about 1–2%** |

At 15 lakh monthly users (conservative case in the brief), 1.5% paying at a blended ₹1,500–1,700 a year gives
about ₹3.4–3.8 crore a year from this path alone — before Family plans, packages and services. The marketing ask
in the investor deck should be sized from real cost-per-install and the measured funnel above.

## 5. Test builds

While `BILLING_ENFORCE` is off (test / review builds), the Pro page still appears so the journey can be shown,
but it says "Thunai is in testing: Pro answers are open to everyone for now, and nothing is charged" and opens
the answer directly. With billing enforced, the price and "Activate Pro" button appear.
