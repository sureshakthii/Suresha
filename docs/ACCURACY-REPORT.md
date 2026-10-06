# Thunai — calculation accuracy report

*Engine: calc 2.0.1 (`shared/astro.js`, astronomy-engine 2.1.19). Report date: October 2026.*
*Reproduce: `cd scripts/benchmark && npm install && npm run setup && npm run bench`. Full output: `scripts/benchmark/results.md`.*

## 1. Summary for the owner

- We compared every number the app calculates with the **Swiss Ephemeris**, the reference most professional
  astrology software uses. We used its full-precision JPL-based data files. We checked 500 random moments between
  1940 and 2060, 600 sunrise days in 31 cities (Chennai, Madurai, Coimbatore, Colombo, Jaffna, Dubai, Singapore,
  London, Toronto and others), 300 births and 372 Tamil month beginnings.
- **Rasi, nakshatra, tithi, yoga, karana, weekday, dasa lord, Tamil month and Tamil date agreed in 100 % of cases.**
  The pada agreed in 99.98 % of cases. The only mismatch was Jupiter sitting 0.06″ (six hundredths of an arc-second)
  from a pada boundary.
- Sunrise and sunset agree within **4 seconds**. Rahu Kalam agrees within **4 seconds**. Tithi, nakshatra, yoga and
  karana end times agree within **40 seconds**, and within a few seconds for present-day dates.
- **One engine bug was found and fixed.** Rahu and Ketu could be off by up to 17″ (about 0.005°) because the wrong
  ayanamsa variant was subtracted. They now match the Swiss Ephemeris mean node to 0.13″.
- **The star birthday had real bugs, and they are fixed.** When the star fell twice in the birth month, the app
  listed both days as "this year" and "next year". When the star skipped sunrise for a whole month, the app jumped
  a year. It used the birth place instead of the place the family lives. Across all 27 stars × 12 months (the next two
  dates each, 648 dates in Chennai), 127 dates (20 %) changed. The Shashtiabdapoorthi date could also land a **year late**. This
  happened in 3 of 40 sample births.
- Calculations can be checked and proven. Interpretation (what a dasa or a yoga *means*) follows traditional rules,
  and nobody can prove it 100 % correct. Section 8 explains this.

## 2. Method

| Item | How |
|---|---|
| Reference | Swiss Ephemeris 2.10.03 through the `sweph` npm package (native). Data files `sepl_18.se1` and `semo_18.se1` (planets and Moon, 1800–2399, fitted to JPL DE431). No Moshier fallback happened: the benchmark checks every call |
| Ayanamsa in reference | `SE_SIDM_LAHIRI` (Indian Calendar Reform Committee definition), the same definition the app uses |
| Independence | The reference side calls only Swiss Ephemeris. It has its own root-finder (20-minute scan, bisection to 0.5 s), its own Rahu Kalam split from Swiss sunrise and sunset, and its own dasa arithmetic from the Swiss Moon. It does not call any app function |
| Samples | Random instants and days, uniform over 1940-01-01 to 2060-12-31 (fixed seed 7), across 31 cities from Auckland to San Francisco, latitudes 37° S to 52° N |
| Script | `scripts/benchmark/run.mjs`. Dev-only: its own `package.json`, and nothing is added to the app |

## 3. Results

### 3.1 Sidereal (Lahiri) longitudes — 500 random instants

| Body | Median error | 95 % within | Max error | Rasi agree | Nakshatra agree | Pada agree |
|---|---|---|---|---|---|---|
| Sun | 0.44″ | 1.4″ | 2.5″ | 100 % | 100 % | 100 % |
| Moon | 1.2″ | 13.8″ | 22.1″ | 100 % | 100 % | 100 % |
| Mars | 1.0″ | 4.0″ | 11.4″ | 100 % | 100 % | 100 % |
| Mercury | 1.6″ | 5.0″ | 12.0″ | 100 % | 100 % | 100 % |
| Jupiter | 2.7″ | 6.5″ | 9.5″ | 100 % | 100 % | 99.8 % (1 case, 0.06″ from the boundary) |
| Venus | 0.9″ | 6.3″ | 15.5″ | 100 % | 100 % | 100 % |
| Saturn | 2.3″ | 8.7″ | 12.7″ | 100 % | 100 % | 100 % |
| Rahu / Ketu (mean node) | 0.11″ | 0.13″ | 0.13″ | 100 % | 100 % | 100 % |
| Lagna (ascendant) | 0.14″ | 2.0″ | 3.2″ | 100 % | 100 % | 100 % |
| Ayanamsa itself | 0.14″ | 0.27″ | 0.35″ | | | |

1″ (one arc-second) is 1/3600 of a degree. A nakshatra pada is 3°20′, which is 12,000″.

The Moon's larger values come from **future** dates. Up to 2025 the median Moon error is 0.75″ and the maximum is
5.6″. For 2026–2060 the median is 8.2″ and the maximum is 22″. Nobody knows the Earth's future rotation (ΔT) exactly,
and the two libraries extrapolate it differently. That difference is a forecast uncertainty, not a bug.

**Rahu: mean node and true node.** The app uses the **mean** node, which is the usual convention for Tamil
jathagams and is written in `docs/ENGINE-CONTRACT.md`. Against the Swiss **true** node, the difference is 1.0°
(median) and up to 1.9°. This is the expected gap between the two conventions, not an error. Against the Swiss mean
node, the difference is 0.13″ or less.

### 3.2 Sunrise, sunset, Rahu Kalam — 600 days, 31 cities

| Item | Median | 95 % within | Max |
|---|---|---|---|
| Sunrise | 1.8 s | 2.8 s | 3.3 s |
| Sunset | 1.8 s | 2.8 s | 3.3 s |
| Rahu Kalam start | 0.9 s | 1.6 s | 2.5 s |
| Rahu Kalam end | 0.9 s | 2.0 s | 3.1 s |

### 3.3 Panchangam at sunrise — 600 days

| Element | Same value at sunrise | End time: median | 95 % within | Max |
|---|---|---|---|---|
| Tithi | 100 % | 2.2 s | 26 s | 40 s |
| Nakshatra | 100 % | 1.8 s | 27 s | 39 s |
| Yoga | 100 % | 1.9 s | 27 s | 38 s |
| Karana | 100 % | 2.2 s | 26 s | 39 s |
| Weekday | 100 % | | | |

The 26–40 s tail comes from the same future-date ΔT effect described in 3.1. The app shows times to the minute.

### 3.4 Vimshottari dasa — 300 births

The first dasa lord agreed for 100 % of births. For births up to 2025, maha-dasa start dates differ by a median of
1.7 hours and at most 10.9 hours, which is under half a day. Across 1940–2060 the maximum difference is 2.7 days, all
from future births. Both sides use 1 dasa year = 365.25 days, so these differences come only from the Moon position.

### 3.5 Tamil month start (Sankranti) — 372 ingresses

The Sun's sidereal ingress times differ by a median of 11 s and at most 48 s. The **Tamil month day 1** in Chennai
agreed in 100 % of cases. The rule: if the ingress is before sunset, the month starts that day. If it is after
sunset, the month starts the next day.

### 3.6 Spot checks against published days

| Published fact | App | Result |
|---|---|---|
| Tamil New Year 2024 = 14 Apr (Mesha Sankranti on 13 Apr at night, after sunset), year Krodhi | 14 Apr = Chithirai 1, Krodhi; ingress 21:04 IST | ✔ date and year |
| Thai Pongal 2024 = 15 Jan (Makara Sankranti before dawn, 15 Jan) | Thai 1 = 15 Jan; ingress 02:43 IST | ✔ date |
| Thai Pongal 2025 = 14 Jan (Sankranti ≈ 09:03 IST) | ingress 08:55 IST | ✔ date |
| New moon of the total solar eclipse, 8 Apr 2024, 18:21 UTC (NASA) | Amavasai ends 18:20 UTC | ✔ |
| Deepavali 2024: Chathurdasi ends 31 Oct ≈ 15:52 IST | 15:53 IST | ✔ |
| Lahiri ayanamsa at J2000.0 = 23°51′11″ | 23.8532° | ✔ |

Popular almanacs such as Drik Panchang print Sankranti times about 9–11 minutes later than the app. For example,
they print 21:15 instead of 21:04. This is **not an error**. Those almanacs use a slightly different Lahiri variant.
Swiss Ephemeris `SE_SIDM_LAHIRI_VP285` reproduces their times to 1–2 minutes, while the official ICRC Lahiri (Swiss
`SE_SIDM_LAHIRI`, used here) gives the app's times. The variants differ by about 23″. The **dates** are the same,
except when an ingress falls within about 10 minutes of sunset.

## 4. What was fixed

| Area | Problem | Fix |
|---|---|---|
| Rahu / Ketu (`shared/astro.js`) | The mean node is measured from the mean equinox, but the code subtracted the *true* ayanamsa. That ayanamsa includes nutation, so Rahu was off by up to 17″ | Subtract the mean ayanamsa. Now matches Swiss SE_MEAN_NODE to 0.13″. Engine version 2.0.0 → 2.0.1 |
| Star birthday (`shared/special.js`) | Star twice in the birth month: the app returned both days, the first as "this year" and the second as "next year" | All passages of the star in the month are collected, and **one** day per year is chosen (default: the second day, with a setting for the first) |
| Star birthday | The star skipped every sunrise in the month (a short nakshatra): no date that year, so the app silently jumped a year | That day is now taken: the day on whose daytime the star prevails longest, with a note |
| Star birthday | Calculated for the **birth place** | Calculated for the **residence** (where the family celebrates) |
| Star birthday | Birth month taken from the Sun's sign at the birth instant | Taken from the Tamil **calendar** month of the birth date. This differs only for births on the evening of an after-sunset Sankranti |
| Shashtiabdapoorthi / 70th / 80th | The search started "60 years minus 20 days" after birth. A birth late in the month whose star day falls early in the month skipped to the next year (a **year late** in 3 of 40 test births). Same twice-in-month and birth-place bugs | The month is found from the birth month's Sankranti plus *N* sidereal years. Then the star-birthday rule is applied in that month at the residence |
| Sathabhishekam | Held after the 1000th full moon (≈ 80 y 10 m). The next birth-month star day then fell at about **81** years | Held on completing 80 years (the common practice). The exact 1000th full moon is still shown for families who follow it |
| Thivasam (`shared/special.js`) | Same pattern: a tithi twice in the month gave both days as two "years". A tithi missing every afternoon gave no date | One date per Tamil month, the second when the tithi comes twice, and the kshaya (skipped) case handled with a note |

## 5. Star birthday (நட்சத்திரப் பிறந்தநாள்) — the rule used

1. **Month:** the Tamil (solar) month of the birth date. A Tamil month begins on the civil day of the Sun's sidereal
   (Lahiri) ingress if the ingress is before that day's sunset. Otherwise it begins on the next day.
2. **Day:** the day on which the Moon is in the janma nakshatra **at sunrise**, at the place where the family lives
   (*udaya nakshatram*, as printed in Tamil panchangams).
3. **Star twice in the month** (about 1 case in 9): the **second** day by default. The screen has a
   setting for families who follow the first day.
4. **Star covers two sunrises:** the first day, because the star rules that whole day.
5. **Star touches no sunrise** (it starts after one sunrise and ends before the next): the day on whose daytime it
   prevails longest. A note on screen says so.
6. **Star at sunrise for less than 1 nazhigai (24 min):** the sunrise rule is kept, so the date matches printed
   panchangams. A note names the previous day, which some families follow.

Checked by `test/starbday.test.js` against an **independent day-by-day scan**. That scan uses astronomy-engine's
own sunrise, the Sun's sign at sunset for the Tamil month and the Moon at sunrise. The function under test uses
Sankranti root-finding and nakshatra passages instead. The test covers all 27 stars in Chennai, four stars in
London, the twice-in-month case (both settings), the skipped-sunrise case, and Thivasam.

## 6. Milestone celebrations

| Celebration | Basis shown on screen | Date computed |
|---|---|---|
| Shashtiabdapoorthi (சஷ்டியப்தபூர்த்தி) | 60 years complete. The Tamil year name of birth returns (60-year cycle) | Star birthday in the birth month of that Tamil year. The test checks that the year name equals the birth year name |
| Bheemaratha Shanti (பீமரத சாந்தி) | 70 years complete. The screen notes that some families hold it a year earlier | Star birthday in the birth month after 70 years |
| Sathabhishekam (சதாபிஷேகம்) | 80 years complete (about 1000 full moons) | Star birthday in the birth month after 80 years, plus the exact 1000th full moon (tested by counting full moons independently) |
| Kanakabhishekam | **Not shown.** Families and texts place it at different ages (84, 90 or 100), so no single date can be called correct | — |

## 7. Conventions (what an astrologer should know)

| Item | Convention |
|---|---|
| Ayanamsa | Lahiri (Chitrapaksha), ICRC 1956 definition, IAU 2006 precession, true value (with nutation) for planets |
| Rahu / Ketu | Mean node. Ketu = Rahu + 180° |
| Positions | Geocentric, apparent (light-time, aberration, nutation). No topocentric Moon |
| Sunrise / sunset | Upper limb of the Sun touching the sea-level horizon, with standard refraction (34′). Some almanacs use the Sun's centre, which is about 1 minute later. Hill-top or "visible" sunrise is not used |
| Panchangam of a day | Values at sunrise (+1 minute). End times are exact instants |
| Tamil calendar | Thirukanitha (computed) Sankranti with the sunset rule. **Vakya panchangams** use older formulae and can differ by hours, and sometimes by a day. The app follows Thirukanitha |
| Dasa | Vimshottari, 1 year = 365.25 days |
| Houses | Whole-sign from the sidereal Lagna |

## 8. Honest limits

- **Calculations can be verified.** Every planet, sunrise, tithi, star and dasa date above was checked against an
  independent professional reference, and anyone can repeat the check with the script.
- **Ephemeris limits.** Present-day positions agree with the reference to a few arc-seconds. Future dates (2040–2060)
  carry an uncertainty of up to about 20″ for the Moon, because the Earth's rotation cannot be predicted exactly. An
  event within about 1 minute of a boundary (for example a tithi ending within a minute of sunrise) can legitimately
  differ between two good almanacs.
- **Convention differences are not errors.** Different Lahiri variants, the Vakya and Thirukanitha methods, the
  sunrise definition, the true and mean node, and the "first or second star day" choice can all change a printed
  date. The app states its convention on screen wherever this matters.
- **Birth data limits.** An approximate birth time makes the Lagna and the dasa dates approximate. The app already
  marks unstable items (`chartStability`).
- **Interpretation cannot be "100 % proven".** Predictions, porutham verdicts, yogas and remedies follow traditional
  rules (`docs/RULE-REGISTRY.md`). Those rules can be shown and reviewed by an astrologer, but nobody can prove them
  correct the way a sunrise time can be proven. The app presents them as traditional guidance, not certainty.
