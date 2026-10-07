# Prediction audit — age, faith, consistency and wording

*Audit date: 7 October 2026 · Test: `test/prediction-audit.test.js` (25 checks, about 10 s) · Companion to `docs/ACCURACY-REPORT.md`*

## 1. What this audit can and cannot claim

Thunai has two kinds of output, and they need different kinds of evidence.

| Layer | Can it be verified? | Evidence |
|---|---|---|
| **Astronomy and calendar**: planet longitudes, ayanamsa, nakshatra, tithi, Lagna, dasa dates, sunrise, Rahu Kalam, Tamil months | **Yes.** Checked against Swiss Ephemeris and reference panchangams. | `docs/ACCURACY-REPORT.md` (not repeated here) |
| **Rule application**: which dasa is running, which houses a planet rules, which periods the stated rules mark as supportive, which milestone date applies | **Yes, for internal consistency.** The same inputs and rules must give the same answer on every screen. | This audit, §4–5 |
| **Safety rules**: what minors see, what people of other faiths see, wording | **Yes.** These are product rules and are tested directly. | This audit, §4–5 |
| **Prediction accuracy**: whether a "supportive period for career" actually brings career growth | **No.** No test can confirm this. Astrology readings are traditional interpretations, not measurable forecasts. Thunai does not claim they are accurate, and every surface says they are tendencies, not certainties. | §7 lists what a qualified astrologer should review |

**In short: the calculations are verified, the rules are applied consistently, and the safety rules hold on every prediction surface for the 80 profiles tested. Whether any prediction comes true is not something this audit, or any audit, can measure.**

## 2. Method

1. **Profile matrix.** 80 generated profiles (see §3) run through every prediction surface at one fixed moment (7 Oct 2026, 06:00 UTC). Each profile's daily timings use the panchangam of its **residence**. The chart uses the **birth place** and birth time zone.
2. **Surfaces run per profile**:
   - Today: do's and don'ts, why, prayer or practice, today's plan with Sashti, Pradosham and Ekadasi, Horai practice
   - Full analysis: life areas, yogas, transits, dasa outlook
   - Written palan, with its follow-up questions
   - Life road map: 10-year periods, year-by-year view, milestones, "what to do now"
   - Peyarchi: Guru, Sani, Rahu and Ketu transit palan, plus weekly rasi palan
   - Parigaram and today's remedies
   - Life-event timing (career, house, marriage; adults only)
   - Habit guard
   - Health guide
   - Star-birthday milestones at 60, 70 and 80
   - Porutham and the couple report
   - The age-guard answers used by Ask Thunai for children
3. **Text actually read by the person** was collected from each surface: 23,652 strings across the 80 profiles. These were checked with:
   - the app's own validators: `scanProhibited` with `ALWAYS_PROHIBITED`, `findProhibited` and `adultText`;
   - the audit's own patterns: certainty, fear words, lifespan, disease/diet/treatment from a dasa, Hindu-only instructions, gendered wording, and marriage or job pushing at 60+.
4. **Cross-surface comparisons** for the same profile and moment: running dasa and bhukti, their dates, the "supportive or not" verdict, life-area levels, star and rasi, and time zones.
5. An exploratory pass over all 12 rasis × 4 grahas × 12 houses of peyarchi text, and over every remedy table, found the wording problems fixed in §6.

## 3. The profile matrix

The matrix has 18 ages × 4 variants, plus 8 edge cases.

| Dimension | Values covered |
|---|---|
| Age | 0, 3, 6, 10, 13, 16, 17, 18, 21, 25, 30, 40, 50, 59, 60, 62, 70, 80, 90, 100 |
| Gender | Male and female, alternating |
| Faith | Hindu (at every age), Christian, Muslim, Jain, Sikh, Other, None. Each age has both a Hindu and a non-Hindu profile. |
| Birth time | Exact (06:30), approximate (14:10 ± 60 min), unknown |
| Birth place | Chennai, Madurai, London (born abroad) |
| Residence | Chennai, Dubai, London, New York, Singapore. Residence is separate from birth place. |
| Marital status | Single, married, separated/widowed. Two widowed elders (62, 70) chose remarriage questions. |

Totals: 29 minors, 23 people aged 60+, 59 non-Hindu profiles, 27 with unknown birth time and 25 with approximate birth time.

<details><summary>Full list (generated in the test)</summary>

| Age | Profiles: id, gender, faith, birth time, born → lives, marital |
|---|---|
| 0 | P01 M hindu exact Chennai→Chennai · P02 F muslim approx →Dubai · P03 M jain unknown →London · P04 F sikh exact →New York |
| 3 | P05 M hindu approx →Singapore · P06 F jain unknown →Chennai · P07 M sikh exact →Dubai · P08 F other approx →London |
| 6 | P09 M hindu unknown →New York · P10 F sikh exact →Singapore · P11 M other approx →Chennai · P12 F none unknown →Dubai |
| 10 | P13 M hindu exact →London · P14 F other approx →New York · P15 M none unknown →Singapore · P16 F christian exact →Chennai |
| 13 | P17 M hindu approx →Dubai · P18 F none unknown →London · P19 M christian exact →New York · P20 F muslim approx →Singapore |
| 16 | P21 M hindu unknown →Chennai · P22 F christian exact →Dubai · P23 M muslim approx →London · P24 F jain unknown →New York · P78 F jain unknown →Singapore |
| 17 | P25 M hindu exact →Singapore · P26 F muslim approx →Chennai · P27 M jain unknown →Dubai · P28 F sikh exact →London |
| 18 | P29 M hindu approx →New York married · P30 F jain unknown →Singapore widowed · P31 M sikh exact →Chennai single · P32 F other approx →Dubai married |
| 21 | P33 M hindu unknown →London widowed · P34 F sikh exact →New York single · P35 M other approx →Singapore married · P36 F none unknown →Chennai widowed |
| 25 | P37 M hindu exact →Dubai single · P38 F other approx →London married · P39 M none unknown →New York widowed · P40 F christian exact →Singapore single · P77 M none unknown →New York widowed |
| 30 | P41 M hindu approx →Chennai married · P42 F none unknown →Dubai widowed · P43 M christian exact →London single · P44 F muslim approx →New York married · P73 M hindu exact **London→Chennai** married |
| 40 | P45 M hindu unknown →Singapore widowed · P46 F christian exact →Chennai single · P47 M muslim approx →Dubai married · P48 F jain unknown →London widowed · P74 F christian approx **London→London** single |
| 50 | P49 M hindu exact →New York single · P50 F muslim approx →Singapore married · P51 M jain unknown →Chennai widowed · P52 F sikh exact →Dubai single |
| 59 | P80 F hindu exact Madurai→Singapore |
| 60 | P53 M hindu approx →London married · P54 F jain unknown →New York widowed · P55 M sikh exact →Singapore single · P56 F other approx →Chennai married |
| 62 | P75 M hindu exact →Singapore widowed + remarriage chosen |
| 70 | P57 M hindu unknown →Dubai widowed · P58 F sikh exact →London single · P59 M other approx →New York married · P60 F none unknown →Singapore widowed · P76 F muslim exact →Chennai widowed + remarriage chosen |
| 80 | P61 M hindu exact →Chennai single · P62 F other approx →Dubai married · P63 M none unknown →London widowed · P64 F christian exact →New York single · P79 M sikh unknown Madurai→Dubai widowed |
| 90 | P65 M hindu approx →Singapore married · P66 F none unknown →Chennai widowed · P67 M christian exact →Dubai single · P68 F muslim approx →London married |
| 100 | P69 M hindu unknown →New York widowed · P70 F christian exact →Singapore single · P71 M muslim approx →Chennai married · P72 F jain unknown →Dubai widowed |

Born in Chennai unless shown. "Widowed" stands for the profile option *Separated / widowed* (`maritalStatus: 'other'`).
</details>

## 4. What each surface does, by age band and faith

### By age band

| Surface | 0–5 | 6–12 | 13–17 | 18–59 | 60+ |
|---|---|---|---|---|---|
| **Today** (do's and don'ts) | Caregiver lines: routine, story or song, no screens | School: lessons, play, sleep | Study, calm, no late screens | Full list: work, purchases, Rahu Kalam | Full list. Fasting lines say "fast only if your health allows" |
| **Analysis** | Learning and spiritual areas only. Transit advice reworded for study | Same as 0–5 | Same as 0–5 | All 8 areas | All areas. Guru Balam advice speaks of family functions, not marriage or children |
| **Written palan** | Nature, studies, habits. No follow-up questions | Same as 0–5 | Same as 0–5 | Who / now / next / areas, 20-year windows | "Family life" in place of "Marriage", "Work & purpose" in place of "Career", family follow-ups. Marriage wording returns only if a remarriage context is chosen |
| **Road map** | Child areas (learning, family & home). Early-childhood goals | School goals | Exam and aptitude goals ("discover your interests"). No job timing | Career, wealth, family areas. Goals follow marital status | "Family & home". Only the "house" window. Milestone birthdays. 10 years shown at every age |
| **Life-event timing** | Blocked (`lifeQuestionAllowed`) | Blocked | Blocked. Career compass shown as aptitude only | Allowed. Marriage up to 50, job up to 59 | No marriage, child or job timing questions offered |
| **Parigaram** | Child-safe "governs" line, study prayer | Same as 0–5 | Same as 0–5 | Full | Full |
| **Health** (being rebuilt by another agent) | General habits and growth check-ups only, no body areas | Same as 0–5 | Same as 0–5 | Traditional guide | Traditional guide |
| **Milestones** | — | — | — | Shown from age 45 | Shashtiabdapoorthi (60), Bheemaratha Shanti (70), Sathabhishekam (80), with the 1000th full moon |

### By faith

| Surface | Hindu (or Auto) | Christian / Muslim / Jain / Sikh / Buddhist / Other / None |
|---|---|---|
| Today | God of the day, Dasa deity, closing போற்றி prayer, festival viratham with fasting caveats | Welcome note, a practice for every faith (`universalPractice`), their own blessing. No festival puja items. Chandrashtamam: "prayer in your own faith" |
| Parigaram | Full Navagraha entries: deity, mantra, temple, sthalam journey planner | Free practice and charity. No deity, temple, mantra or gem. The Navagraha cards sit in a collapsed panel labelled *optional, for information only, not required* (the opt-in) |
| Road map, life timing, peyarchi, analysis, written palan | Traditional parigaram per period, transit and topic | Same readings. Remedy lines replaced by every-faith practices. "Temple visit" becomes "your own place of worship", "mantra chanting" becomes "prayer in your own faith". The Hindu text is attached only with `traditional: true` and marked `optional` |
| Milestones | Thirukadaiyur or homam, with package and priest buttons | "A family thanksgiving in your own tradition". The Hindu ceremony is mentioned as information only, with no booking buttons |
| Child answers (age guard) | Saraswathi / Vinayagar prayer | "A short prayer or quiet moment in your family's own way" |

## 5. What the test asserts

| # | Check |
|---|---|
| 1 | The matrix covers every age, gender, faith, birth-time precision, residence and marital status, with a Hindu and a non-Hindu profile at every age. |
| 2 | **Minors:** no marriage, job, money, children, property or romance text on Today, analysis, written palan, road map or parigaram. Adult topics are blocked. Never offered for matching. Child health has no body-area or food reading. |
| 3 | **Bands:** 0–5 caregiver, 6–12 school, 13–17 exams and aptitude (career compass allowed, job timing blocked). |
| 4 | **60+:** no marriage or job push in written palan, follow-ups, road map or transit advice; marriage, child and job questions not offered. The remarriage context keeps the marriage reading. |
| 5 | **Milestones:** 60, 70 and 80 fall in birth year + n (or + n + 1 by Tamil month). The 1000th full moon falls at 80.7–81.0 years. |
| 6 | **No lifespan or death wording** at any age. Health vitality is `not-assessed`. The road map always lists 10 years and the palan 20 years, including at 80, 90 and 100 (no age-80 cutoff). |
| 7 | **Other faiths:** no Hindu-only instruction on any surface by default. Parigaram items carry no deity, temple, mantra or gem. Their own blessing and practice are shown. |
| 8 | **Opt-in:** Hindu content for another faith comes only with `traditional: true`, labelled *optional, for information only, not required*. |
| 9 | **Hindu users keep rich content:** deity, mantra, temple, festival practice, peyarchi parigaram, period deity, Thirukadaiyur. |
| 10 | **Fasting is never required:** children "need not fast", elders "only if your health allows", others "optional; skip if unwell, pregnant or on medication". |
| 11 | **One running dasa and bhukti** with the same dates on Today, analysis, written palan, road map, health, closing prayer and the Ask context. |
| 12 | **One tone rule (`dasaTone`):** a Maha Dasa is never "supportive" on one surface and "difficult" on another. |
| 13 | **Life-area levels** (strong / steady / needs care) are identical on the analysis card and in the written palan (over 200 comparisons). |
| 14 | **Unknown birth time:** Moon-based reading everywhere; the same star and rasi on every surface; the "needs birth time" line shown. |
| 15 | **Time zones:** the chart keeps the birth time zone; Rahu Kalam falls inside the residence's own sunrise–sunset. |
| 16 | **Wording:** no certainty, fear or `ALWAYS_PROHIBITED` claims; no disease, diet or treatment from a dasa; all peyarchi texts (12 × 4 × 12) clean. Health guide: no diagnosis phrasing, fatal-disease names, lifespan or medicine instructions. |
| 17 | **Tamil and English** on every line. |
| 18 | **Gender:** career and money text has no gendered words; the same remedy and question are given for men and women; the Jupiter karaka text is not gendered. |
| 19 | **Bride and groom** are labelled மணமகள் / மணமகன். Porutham output says no "girl/boy" and has no verdict. The couple report is clean. Minors are never matched. |
| 20–25 | **Mantra and faith review:** God of the day and closing prayer only for Hindus (F1); My Guide, Guru Vakku and Love by faith (F2); no Hindu prayer for other faiths' children (F3); Home parigaram faith- and age-aware (F5); one primary deity and mantra per planet, with 🔊 speaking only the mantra (M3–M4); single spellings for Guru, Mahalakshmi, Rama nama, துர்க்கை and Abhirami Anthadhi; Mrityunjaya not in travel mode (M5–M6, L1, L6, L7). |

## 6. Bugs found and fixed

### Faith

| # | Where | Bug | Fix |
|---|---|---|---|
| F1 | `shared/remedies.js`, Parigaram screen | Non-Hindus got only Hindu deity, temple, mantra and gem remedies, and the sthalam journey planner. | Added `remedyFor()`. `dailyParigaram({ faith, traditional, profile, now })` returns every-faith practices. The screen hides the sthalam card and collapses the Navagraha cards behind an *optional* label. |
| F2 | `shared/daily.js` (Today) | On Chandrashtamam, "Pray to Ambal / Shiva" appeared in a non-Hindu's do's. The Dasa-day line read "pray to Perumal". | `dailyReview(…, { faith })` uses neutral lines. Returns `practice`, `blessing`, and `prayer: null` for other faiths. |
| F3 | `shared/today-plan.js` | The non-Hindu Horai text read "one good act for **marriage**" (Venus governs), even for a 10-year-old. | Uses `universalPractice`, or a child practice for minors. |
| F4 | `shared/roadmap.js` | Period remedies (deity and mantra), "Temple yatras", and "Shashtiabdapoorthi" goals were given to every faith. | Takes a `faith` option. Remedies use `remedyFor`. Goals for other faiths: "milestone birthdays in your own tradition", "prayer or pilgrimage in your own faith". |
| F5 | `shared/peyarchi.js` | Peyarchi parigaram, "visit temples" and "mantra chanting" were given to every faith. | Takes a `{ faith }` option, with every-faith practices and wording. |
| F6 | `shared/predict.js`, Life screen | Life-question parigaram and karaka remedies were Hindu-only. Habit-guard support named Murugan or Anjaneya. | Added `faithRemedy()`. `questionFor` and `predictEvent` take `{ faith }`. `habitGuard` takes `{ faith }`. The Life screen title becomes "A simple practice (optional)". |
| F7 | `shared/analysis.js` | Transit advice ("sesame-oil lamp", "Dakshinamurthy", "Durga") and "its parigaram helps" were given to every faith. | `transitStatus` and `fullAnalysis` take `{ faith, age }`. |
| F8 | `shared/written-palan.js` | "An occasional temple visit"; a child's "lamp for Dakshinamurthy". | Faith-aware tips. |
| F9 | `shared/special.js`, Star-birthday screen | The 60th/70th/80th always showed Thirukadaiyur, homam and priest booking. | Added `milestoneNote(faith)`. Booking buttons are shown to Hindus only. |
| F10 | `shared/age-guard.js` | Child answers always gave a Saraswathi or Vinayagar prayer. | `ageGuardAnswer` and `childGeneralAnswer` take `{ faith }`. |
| F11 | `shared/faith.js` | There was no Jain, Sikh or Buddhist choice, and "None" read only "Prefer not to say". | Added these faiths, their blessings, and `isHinduFaith`, `practiceFor`, `CHILD_PRACTICE` and `TRADITIONAL_OPTIONAL`. |

### Age

| # | Where | Bug | Fix |
|---|---|---|---|
| A1 | `shared/age-guard.js` `adultText` | Substring false positives. "**learning**" matched "earning", "அர்**ப்பணம்**" matched "பணம்", and "வைத்தீஸ் **வரன்**" matched "வரன்". Harmless lines were dropped for children, and bad lines could hide among false alarms. | Added word-boundary and Tamil look-behind guards. |
| A2 | `shared/written-palan.js` | People aged 60–100 got "support for **marriage efforts**", "career growth" and the follow-up "When is a good time for marriage?". | Senior wording: "Family life", "Work & purpose", "Learning", and family follow-ups. Marriage wording is kept only with `remarriage: true`. |
| A3 | `shared/roadmap.js` | For people 60+, the label read "Family **& marriage**". For adults: "Marriage … at the right muhurtham" even when married, "Children's education fund", "Children's marriages" (assumes children). Teens' next-stage preview mentioned careers. | Senior label "Family & home". Goals follow marital status and are neutral. Teen preview filtered. |
| A4 | `shared/roadmap.js` | A child's period notes said "avoid big **loans**". | Child-safe notes. |
| A5 | `shared/analysis.js` | A child's transit advice read "avoid property disputes". For 60+, Guru Balam read "favourable for marriage, children". | Advice is age-aware. |
| A6 | `shared/daily.js` | 0–5-year-olds got "Revise yesterday's lessons". | Caregiver do's and don'ts. |
| A7 | `shared/remedies.js`, Parigaram screen | Children saw "governs: business, land, marriage, wealth". A Hindu child got "before any **work**" lines. | Added `governsFor` with child wording, and a study prayer. |
| A8 | `shared/today-plan.js` | Fasting was given as an instruction to elders and teens. A teen's caveat mentioned pregnancy. | Elders: "fast only if your health allows". Adults: "optional, skip if unwell, pregnant or on medication". Teens: "a light meal is fine". |
| A9 | `shared/predict.js` | "When will I get a job?" and "job change" were offered up to age 65. | Now offered up to age 59. |
| A10 | `shared/remedies.js` | Saturn "governs **longevity**" / ஆயுள் (a lifespan word). | Now "patience" / பொறுமை. |

### Consistency

| # | Where | Bug | Fix |
|---|---|---|---|
| C1 | analysis, written palan, parigaram | `chart.dasa.current` / `currentBhukti` were fixed when the chart was computed. A cached chart, or any `now` other than chart-creation time, could name a different bhukti from Today and the road map. | Added one lookup, `runningDasa(chart, now)` in `shared/daily.js`, used by all of these. The analysis screen passes one `now` to both the analysis card and the palan. |
| C2 | analysis vs written palan | With an unknown birth time, the analysis card called a dasa "A supportive period" while the palan said "rewards patience" for the same dasa (P25 and P80 in the first run). | Added a single `dasaTone()` in `shared/analysis.js`, used by both. |
| C3 | road map vs analysis | The current period showed as a **care** period on the road map while the analysis called the same Maha Dasa supportive (9 profiles in the first run). | The road map's per-period level is clamped by `dasaTone`: a supportive dasa is never "care", and an effort dasa is never "good". |
| C4 | `shared/today-plan.js` | The Saturday Sani item used the device clock's weekday, not the residence day. | Now uses `snap.weekday`. |

### Wording

| # | Where | Bug | Fix |
|---|---|---|---|
| W1 | `shared/peyarchi.js` | Lines read "health recovers", "wishes are fulfilled", "steady income growth, property gains", "நிச்சயம் கைகூடும்" (flagged by the validator), "slowly but surely", "check-ups keep you safe". | Reworded as support or tendency. |
| W2 | `shared/peyarchi.js` | Transits gave diet and body-part lines: "take care of diet and teeth", "keep a simple diet", "Mind your rest and diet". | Reworded as routine lines. |
| W3 | `shared/today-plan.js` | "Rahu's pressure eases", "Ketu's confusion clears", "obstacles ease" were stated as outcomes. | Framed as "the traditional practice for …". |
| W4 | `shared/remedies.js` | Jupiter governs "marriage **(for women)**" (gendered). | Removed. |

### Mantra and faith review (follow-up pass)

| # | Where | Gap | Fix |
|---|---|---|---|
| R-F1 | Today, `dailyCard` | The general "God of the day" card appeared for every member, including Christian, Muslim and none. | Shown only when the member is Hindu, or no member is chosen. The details panel shows an every-faith practice for others. |
| R-F2 | My Guide, Guru Vakku (Home), Love | Ishta Theivam mantra, Siddhar potri, the read-aloud mantra playlist, "chant …" on Home, and the Love closing prayer were shown to every faith. | `personalGuide(…, { faith })` returns `hindu`, `practice`, `blessing`, and an empty playlist for other faiths. The screens fold Ishta Theivam and Siddhar into *optional* panels, hide the playlist and temple chip, word Guru Vakku without "chant", and show the person's own blessing on Love. |
| R-F3 | Ask / Prasnam child answers | Non-Hindu children got "Om Gam Ganapataye Namaha", the Saraswathi sloka, and a Hindu "Today's prayer". | The screens pass `faith` to `childGeneralAnswer` and `ageGuardAnswer`. No day deity for other faiths. |
| R-F5 | Home "Today's parigaram" | Called without faith or age, so non-Hindus and children saw "Recite Kanda Sashti Kavasam". | Passes `faith`, `profile` and `now`. |
| M3 | Many surfaces | The same planet had different deities and mantras: Saturn as Saneeswarar, Venkatesa or Ayyanar; Moon as சந்திராய / சக்தி பராசக்தி / சக்தியே போற்றி; Sun as சூர்யாய / நமசிவாய. | Added `PRIMARY` in `shared/remedies.js`: one deity and mantra per planet (the Navagraha mantra), with the others kept as `also` ("also traditional"). `PLANET_DEITY`, `DEITY_MANTRA`, the closing போற்றி, the playlist and parigaram now all derive from it. Sun's closing prayer is now "ஓம் சூர்யாய நமஹ — சூரிய பகவானே போற்றி" (was "சிவனே போற்றி"). Kula Deivam forms (Ayyanar etc.) are a separate concept and unchanged. |
| M4 | Parigaram 🔊 button | Spoke the hymn title with the mantra ("… · ஆதித்ய ஹிருதயம்"). | Speaks only the mantra (`mantraOnly`). |
| M5 | | "Om Gurave Namaha" | "Om Guruve Namaha" everywhere (matches the Tamil குருவே). |
| M6 | | Three Mahalakshmi forms | "ஓம் ஸ்ரீ மகாலட்சுமியை நமஹ" / "Om Shri Mahalakshmiyai Namaha" everywhere. |
| L1 | | Three Rama nama forms | "ஸ்ரீ ராம ஜெய ராம ஜெய ஜெய ராம" everywhere. |
| L6 | `shared/mantras.js` | Mrityunjaya was tagged "travel", so travel mode looped it. Its meaning said "healing and long life". | Tag removed. Meaning changed to "peace, strength and well-being; a prayer, not a treatment". |
| L7 | | துர்கை / துர்க்கை spelled both ways | துர்க்கை in every owned module. "Abhirami Anthadhi" was already uniform. |

### Screens updated (non-styling code only)

- `public/screens-tools.js`: Parigaram, star birthday
- `public/screens-main.js`: Today, Home parigaram, Prasnam child answer
- `public/screens-guide.js`: My Guide, Guru Vakku
- `public/screens-love.js`: closing prayer
- `public/screens-world.js`: analysis and palan
- `public/screens-roadmap.js`: road map, including the AI prompt
- `public/screens-life.js`: life events and habits
- `public/screens-peyarchi.js`: peyarchi

All screens pass the member's faith (and marital status where relevant). `public/screens-health.js` and `shared/health.js` received only small faith edits before ownership moved to the health rebuild.

## 7. Still open: needs a qualified astrologer or another owner

**Astrologer review (cannot be settled by tests):**
1. The **`dasaTone` threshold**: strength index ≥ 55 and not in the 6th, 8th or 12th. This is a house rule, not a classical one. It decides "supportive" versus "effort" on three surfaces, so it should be reviewed once.
2. The **road-map area scoring weights** (Maha Dasa 0.4, Bhukti 0.6, gochara adjustments), the **analysis area formula** (house 0.45 / others 0.25 / karaka 0.3), and the 62/50 level cut-offs.
3. The **peyarchi palan texts**: 48 classical gochara lines, softened here for safety only. Their traditional content should be read by a Tamil jyotisha reviewer, together with the native Tamil wording.
4. The **every-faith practices** in `universalPractice` (planet → charity or service): written to be respectful. Ideally reviewed by people of each faith.
5. **Age bands and the 60+ wording**, for example "Work & purpose" at 60. Some people work past 60; they can still ask in Ask Thunai or choose life questions up to 59.
6. **Milestone conventions**: some families hold Bheemaratha at 69 or Sathabhishekam on the 1000th moon. Both dates are shown, but the default is a convention.

**Ask Thunai files (owned by another agent, not edited):**
- `shared/guidance.js` `chartFacts` still reads `chart.dasa.current` / `currentBhukti` (fixed when the chart was computed). It should use `runningDasa(chart, now)` from `shared/daily.js` to stay identical to the other surfaces after midnight or a bhukti change. The test checks it only at "now".
- `public/ask-thunai.js` line 141 uses the short "Sri Rama Jaya Rama" form. It should use "Sri Rama Jaya Rama Jaya Jaya Rama" (L1).
- `public/ask-thunai.js` topic `remedy` lines (Thirumanancheri, Mahalakshmi, Santhana Gopala, Kanda Sashti …) are Hindu-only regardless of faith. They should use `faithRemedy()` / `remedyFor()`. Callers of `ageGuardAnswer` / `childGeneralAnswer` should pass `faith`. `healthGuide` is called without `faith`.
- `shared/guidance.js` uses `NAVAGRAHA[k].temple` for "temples that suit your chart" without checking faith (it partly handles faith for blessings only).

**Health guide (rebuilt by another agent):**
- Owned by the health agent. In the current build, minors get no body-system lines (`remedies.planets[].governs` is null) and `bodyAreas`, `diet` and `outlook` are null. This audit keeps asserting those minor rules, plus no certainty, diagnosis, fatal-disease, lifespan or medicine-instruction wording at any age.

**Product:**
- The opt-in for Hindu content (other faiths) is currently opening the collapsed panel on the Parigaram screen. The engines support `traditional: true` everywhere. A saved profile setting ("show traditional Hindu practices too") would make the choice persistent across screens.
- `marriageReport().remedyPlanets` is not shown anywhere yet. If it is ever shown, pass it through `remedyFor`.
