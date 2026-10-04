# வணிகத் திட்டம் · Kaippesi Jothidar Business Plan 2026–2031

*A working plan for the owner. Every number here is an estimate to test, not a promise. Revise it each
quarter with real data from the app.*

---

## 1. நோக்கம் · Vision

To be the trusted daily companion for every Tamil family, at home and abroad. It should be easy for
grandparents, fun for Gen Z, and accurate enough for professional astrologers.

**Positioning:** "Panchangam in the morning, guidance when you need it, and your family's horoscopes always
in your pocket." The app sells **guidance and convenience, never fear**.

**Who it serves**

| Segment | Size (rough) | What they want |
|---|---|---|
| Tamil Nadu + Puducherry households | ~2.3 cr households | Daily panchangam, rahu kalam, muhurtham, marriage porutham, family charts |
| Global Tamil diaspora (Sri Lanka, Singapore, Malaysia, Gulf, UK, US, Canada, Australia) | ~1 cr+ people | Panchangam in *their* time zone, temple and festival dates, poojas back home done for them |
| Elders (55+) | High daily usage | Large text, read-aloud, simple icons, no login friction |
| Young adults (18–30) | Highest growth | Shareable, playful, career and relationship insight, voice |
| Astrologers, priests, temples, matrimony sites, wedding planners | Thousands of businesses | Tools, leads, bookings, APIs |

---

## 2. வருவாய் வழிகள் · Revenue streams

### 2.1 Subscriptions (core, recurring)

Current plans in the app (`server/billing.js`):

| Plan | INR | USD | Notes |
|---|---|---|---|
| Free | ₹0 | $0 | Panchangam, own chart, basic porutham, limited AI answers per day |
| Premium monthly / yearly | ₹199 / ₹1,999 | $4.99 / $49 | Unlimited AI Jothidar, detailed predictions, reports |
| Family monthly / yearly | ₹399 / ₹3,999 | $9.99 / $99 | Up to ~6 members, **ads-free**, shared family charts |

Add over time:

- **1-day relative trial.** A Premium user invites a relative, who gets 24 hours of Premium (`TRIAL_HOURS`,
  gift codes, referral days already exist on the server). This is the main viral loop.
- **Gift subscriptions for parents.** "Gift a year of Panchangam + guidance to Amma/Appa." Targeted at NRIs
  and young earners; peaks around Pongal, Tamil New Year, Deepavali, Mother's/Father's Day.
- **Regional price tiers.** INR in India; USD/SGD/MYR/GBP/AUD for the diaspora at roughly 2–3× INR value,
  following purchasing power.
- **Ads-free family plan.** If ads are ever shown to free users, keep them few and respectful (never on
  temple or remedy screens).

### 2.2 Premium one-time reports (₹99–₹999 / $3–$25)

- **Marriage deep match.** 10 porutham + dosha analysis + dasa compatibility + a printable PDF for the family.
- **Business partner match.** Partner / co-founder compatibility, plus muhurtham for incorporation.
- **Personal life guide.** A yearly report covering career, health windows, finance and remedies.
- Baby name report (nakshatra letters), house-warming / vehicle muhurtham pack, yearly transit report
  (Guru/Sani peyarchi).

### 2.3 Marketplace commissions (10–20%)

- **Seva and Priests (புரோகிதர்கள்).** Verified Iyer / Vadhyar bookings for homam, griha pravesam, wedding
  and shraddham. The priest booking flow already exists.
- **Pooja store.** Pooja kits, rudraksha, idols and books (physical goods, so Razorpay/Stripe are allowed
  in the store apps).
- **Facilitation fees** on annadhanam, gomatha (cow) seva and kubera pooja done at partner temples on the
  user's behalf, with photo/video proof. Use fixed, published fees and full transparency.
- **Temple yatra packages.** Navagraha, Arupadai Veedu, Pancha Bhoota and Divya Desam tours with partner
  travel agents.
- **Hotel / flight / train affiliate links** (OTA affiliate programmes; IRCTC through authorised agents),
  attached to yatra plans and festival trips.

### 2.4 Global Tamil / NRI services

- Pooja and archana done back home for diaspora families, with live stream or recording.
- Panchangam and festival calendar for each overseas city; reminders for shraddham (tithi-based) dates.
- Paid video consultations with Tamil astrologers across time zones.

### 2.5 Business and B2B

- **Corporate muhurtham.** Muhurtham for shop openings, product launches, contract signing and
  incorporation. Per-request fee or an annual plan for SMEs.
- **B2B APIs** (per-call or monthly): porutham API for **matrimony sites**, panchangam/muhurtham API for
  **wedding planners**, calendar printers, temple websites and smart-TV apps.
- **Astrologer marketplace.** Human astrologers consult through the app (chat/voice/video). The platform
  takes 20–30%. The **AI co-pilot** prepares charts and drafts readings for them (SaaS ₹499–₹1,999/month).

---

## 3. வளர்ச்சி வழிகள் · Growth channels

| Channel | Play | Cost |
|---|---|---|
| **WhatsApp** | A beautiful daily panchangam card each morning, shared into family groups, with an "Open in app" link. Every share is an ad. | Near zero |
| **YouTube / Shorts / Instagram Reels** | 30-second daily rasi palan, festival explainers, "what your nakshatra says" series; Tamil creators as partners | Low–medium |
| **Temple partnerships** | QR posters at temples ("Today's panchangam + book archana"); e-hundi and annadhanam integrations | Revenue share |
| **NRI associations** | Tamil Sangams in the US, UK, Singapore, Malaysia and the Gulf: festival calendars, sponsorships, group gift plans | Low |
| **Referral + 1-day trial** | Invite a relative → both get Premium days | Revenue forgone only |
| **Astrologers and priests** | Every verified professional brings their own clients onto the platform | Commission |
| **App store optimisation** | Tamil-first listing, screenshots, ratings prompt after the 4th open (already built) | Free |

---

## 4. இளைஞர்களுக்கு · Gen Z features

- **Vibe card.** A daily shareable card with colour, number, mood and nakshatra energy, sized for Stories.
- **Streaks.** Daily check-in streaks with gentle rewards (extra AI questions, badges).
- **Share cards.** Porutham results, "my chart in 3 words", friend compatibility (light-hearted, clearly
  labelled as fun).
- **Career / acting / politics compass.** Which fields your chart favours, with real-world caveats and links
  to study/skill paths.
- **Voice.** Ask in spoken Tamil (Tanglish too), hear answers read back.
- Dark, modern UI; quick answers first, depth on tap; privacy-respecting (no public profiles by default).

## 5. பெரியவர்களுக்கு · Elders

- **Large-text panchangam** home screen: tithi, nakshatra, rahu kalam, nalla neram on one screen.
- **Read-aloud** in Tamil for every result; slow, clear voice.
- **Simple icons**, big buttons, no hidden menus, no forced login, works offline (the standalone build).
- Morning alarm with the day's panchangam spoken aloud; festival and fasting reminders.
- Family plan lets a son or daughter abroad manage settings and pay for parents.

---

## 6. ஐந்தாண்டுத் திட்டம் · 5-year roadmap

| Year | Theme | Key launches | Target (end of year) |
|---|---|---|---|
| **2026** | Launch and trust | Standalone app for testing; server, login, payments; Play + AppGallery + App Store; WhatsApp daily card; 1-day relative trial; priest booking beta in Chennai, Madurai, Coimbatore | 1 lakh installs, 25k MAU, 3k paying |
| **2027** | Voice-first Tamil | Voice Q&A in Tamil; elder mode; NRI time-zone panchangam; gift plans; premium reports; 200 verified priests; first temple partnerships | 10 lakh installs, 2 lakh MAU, 25k paying |
| **2028** | South India | **Telugu, Kannada, Malayalam** editions; astrologer marketplace + **AI astrologer co-pilot**; B2B porutham API for matrimony sites; yatra packages | 50 lakh installs, 10 lakh MAU, 1 lakh paying |
| **2029** | Every screen in the home | **Smart-TV and smart-speaker panchangam** (morning briefing); **wearables**: daily colour and horai alerts on watches; **verified priest network** across South India + diaspora cities | 1.5 cr installs, 30 lakh MAU, 2.5 lakh paying |
| **2030** | Temples and protection | **Temple e-hundi partnerships** (official, with HR&CE-compliant processes); **"parigaram plans"** — a yearly subscription bundling remedies, poojas and annadhanam, transparent and with no fear-selling; corporate muhurtham SaaS | 3 cr installs, 60 lakh MAU, 4 lakh paying |
| **2031** | Immersive and global | **AR temple tours** (history, sthala puranam, darshan timings); global diaspora hubs; API platform for calendars/TV/auto infotainment | 5 cr installs, 1 cr MAU, 6 lakh paying |

---

## 7. அளவீடுகள் · KPIs

| Area | KPI | Healthy target |
|---|---|---|
| Habit | DAU / MAU | ≥ 35% (panchangam is a daily habit) |
| Retention | D1 / D7 / D30 | 45% / 25% / 15% |
| Virality | WhatsApp shares per DAU; invites → installs (k-factor) | 0.3 shares/day; k ≥ 0.3 |
| Monetisation | Free → paid conversion (of MAU) | 2–5% (diaspora higher) |
| Revenue | ARPPU (monthly) | ₹180 India, $6 diaspora |
| Revenue | Marketplace GMV and take rate | 12–18% blended |
| Quality | Rating; complaints per 1,000 bookings | ≥ 4.5★; < 5 |
| Trust | Refund rate; % priests verified | < 2%; 100% |
| Cost | CAC (paid channels); AI cost per paying user | < ₹150; < 15% of ARPPU |

---

## 8. அலகுப் பொருளாதாரம் · Unit economics (sketch)

**India Premium user (yearly plan ₹1,999):**

- Store/payment fees: ~₹60–₹300 (2% Razorpay on web; 15–30% if Apple/Google billing applies)
- AI + server cost: ~₹150–₹250 per year (rule-based replies first; AI for detailed answers; caching)
- Contribution: **~₹1,450–₹1,750 per paying user per year**
- With CAC ≤ ₹150 per install and 3% conversion, the CAC per paying user is about ₹5,000 on paid ads alone.
  **Paid acquisition only works for the diaspora or for reports; India growth must be organic (WhatsApp,
  referrals, temples).**

**Diaspora Family plan ($99/year):** ~$65–$85 contribution after store fees and AI. CAC up to $25 is fine.

**Marketplace booking (₹3,000 homam):** 15% take = ₹450 per booking, minus ~₹60 payment/support cost.

---

## 9. US$1 பில்லியன் கனவு · The "1 billion dollar" ambition (stretch goal)

A US$1B valuation is a **stretch goal**, not a plan. Here is the funnel it would roughly need, assuming a
consumer-subscription valuation multiple of 8–10× revenue:

| Step | Needed by ~2031 |
|---|---|
| Annual revenue | **~US$100–125M (≈ ₹850–1,050 cr)** |
| Mix (example) | Subscriptions $55M + marketplace/temple/yatra $35M + B2B/API & astrologer SaaS $15M + reports/ads $15M |
| Paying subscribers | ~15 lakh at a blended ~$37/year (≈ 10 lakh India at ~₹1,500 + 5 lakh diaspora at ~$75) |
| MAU at 3–5% conversion | **~3–5 crore MAU** (Tamil alone is not enough → needs Telugu, Kannada and Malayalam plus diaspora) |
| Installs at ~30% long-term MAU/installs | **~10–15 crore installs** |
| Marketplace GMV at 15% take | ~US$230M GMV (≈ 2 lakh bookings/orders a month) |

**Reality check:** the roadmap targets in §6 (1 crore MAU, 6 lakh paying by 2031) give roughly
**US$35–50M revenue** (≈ $22M subscriptions + marketplace, B2B and reports), a valuation of about $300–500M. Reaching $1B needs the multi-language expansion to work,
the marketplace to scale, and a B2B line that makes the app a platform. Track the funnel every quarter and
decide on fundraising only when retention and conversion prove themselves.

---

## 10. இடர்கள் & நெறிமுறைகள் · Risks and compliance

| Risk | Mitigation |
|---|---|
| **Fear-selling** (dosham panic, forced remedies) | House rule: never use scary language or tell someone "do this or something bad will happen". Remedies are optional, with free options shown first (prayer, charity, mantra). Remove any partner who fear-sells. |
| **Disclaimers** | "Astrology is guidance only; not a substitute for medical, legal or financial advice" (already in the app footer). No health diagnoses, no guaranteed outcomes, no stock tips. |
| **Apple / Google billing rules** | Digital subscriptions inside store apps may require IAP / Play Billing (15–30%). Physical goods and real-world services (poojas, priests, store) may use Razorpay/Stripe. Get legal advice before launch; consider web-only purchase where permitted. |
| **Data privacy — DPDP Act 2023 (India)** | Birth data is personal data: get clear consent, collect the minimum, allow export and deletion, publish a privacy notice in Tamil and English, report breaches, and appoint a grievance officer. GDPR/UK-GDPR/PDPA apply to diaspora users. |
| **Payments and refunds** | Clear refund policy for bookings; escrow-style payout to priests after service; GST invoices. |
| **Temple and religious sensitivity** | Partner only through official temple channels; follow HR&CE norms; never misrepresent an official service; show proof of every pooja. |
| **Accuracy and trust** | Use astronomy-grade calculations (already on device); publish methodology (ayanamsa, sunrise basis); let users choose options. |
| **AI cost and safety** | Rule-based answers by default; AI for detail; rate limits; human-reviewed prompts; no harmful advice. |
| **Concentration on one platform** | Web PWA + Play + AppGallery + App Store; standalone offline build as a fallback. |
| **Competition** | Win on Tamil-first quality, elder-friendliness, family plans and a trustworthy marketplace. |

---

**சேர்ந்து வளர்வோம் — let's grow together.** Review this plan every quarter, keep what the data supports,
and drop what it doesn't.
