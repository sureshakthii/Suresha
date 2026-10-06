# Thunai calculation engine contract

Engine version **2.0.1** (2.0.1: mean node now uses the mean ayanamsa — see docs/ACCURACY-REPORT.md). The machine-readable copy is `ENGINE_SETTINGS` in `shared/engine-contract.js`.
Tests in `test/engine-*.test.js` check that the code and this document agree.

This contract covers the deterministic astronomy and calendar layer only. It does not cover
interpretation, rule approval or AI wording. A setting listed here is an engineering default. It is
not an astrologer's approval: see "Needs expert / team" at the end.

## 1. Settings

| Setting | Value | Where |
|---|---|---|
| Zodiac | Sidereal | `shared/astro.js` |
| Ayanamsa | Lahiri (Chitrapaksha), ICRC definition, id `lahiri-chitrapaksha`, version `lahiri-icrc-1956/iau2006-precession/v1` | `lahiriAyanamsa`, `lahiriAyanamsaMean` |
| Node | **Mean** lunar node (Meeus 47.7), mean equinox of date, so the sidereal value subtracts the **mean** Lahiri ayanamsa (matches Swiss Ephemeris SE_MEAN_NODE to 0.2″). Ketu = Rahu + 180° exactly | `planetPositions` |
| Houses | **Whole-sign**: house *n* = *n*-th sign from the Lagna sign | all modules |
| Horai | Default `tamil-60` (fixed 60-minute periods from sunrise). Optional `planetary-unequal` | `horaiTable`, `HORAI_METHODS` |
| Dasa | Vimshottari, 1 year = **365.25 days**, levels maha → bhukti → pratyantara (→ sookshma via `subPeriods`) | `vimshottari`, `subPeriods` |
| Vargas | Named variant per D-chart, `VARGA_VARIANTS` (D60 **not approved**) | `shared/varga.js` |
| Strength | "Traditional strength index", a custom 0–100 heuristic. It is **not Shadbala** and **not a probability** | `grahaStrength`, `STRENGTH_INDEX` |
| Combustion orbs | `COMBUSTION_ORBS`: Mars 17°, Mercury 14° (12° when retrograde), Jupiter 11°, Venus 10° (8° when retrograde), Saturn 15°. The Moon is not scored as combust (the phase rule already covers it) | `shared/remedies.js` |
| Ephemeris | `astronomy-engine` **2.1.19** (pinned; a test checks it against `node_modules`) | `package.json` |
| Root-finding tolerance | 1 second (`CROSSING_TOLERANCE_MS`) | `findCrossing`, `findBoundaries` |

## 2. Accuracy

astronomy-engine documents a general accuracy of **±1 arcminute**, validated against NOVAS and JPL
Horizons. We claim **±1′** for positions. We do **not** claim arc-second accuracy. (`README.md` still
says "accurate to arc-seconds". The owner of that file must correct it.)

What ±1′ means downstream:

- The Moon moves about 1′ in 2 minutes of time. Nakshatra and tithi end times can therefore be off by
  about 2 minutes, independent of the 1-second root-finding tolerance.
- The Lagna moves about 1′ in 4 seconds. Birth-time uncertainty, not the ephemeris, controls Lagna
  reliability. See §7.
- A point within 1′ of a varga or nakshatra boundary cannot be classified with certainty. We never
  round a longitude before classifying it.

## 3. Ayanamsa definition

- **Definition.** Lahiri as adopted by the Indian Calendar Reform Committee: 23°15′00.658″ on
  1956-03-21 0h. We use the same constants as Swiss Ephemeris `SE_SIDM_LAHIRI`: **mean** ayanamsa
  23.245522556° (= 23°15′00.658″ − 16.777″ nutation) at **JD 2435553.5 TT**.
- **Motion.** The value advances by the IAU 2006 general precession in longitude
  p_A = 5028.796195 T + 1.1054348 T² + 0.00007964 T³ − 0.000023857 T⁴ − 0.0000000383 T⁵ (arcsec).
  T is in Julian centuries of **TT** from J2000.0. Source: Capitaine, Wallace & Chapront 2003.
- **True ayanamsa.** The true value is mean + Δψ (IAU 2000B nutation in longitude, from astronomy-engine).
  Planet longitudes are apparent (true equinox of date), so subtracting the true ayanamsa gives sidereal
  longitudes without the ±17″ nutation wobble. This is the Swiss Ephemeris convention.
  `lahiriAyanamsa()` returns the true value. `lahiriAyanamsaMean()` returns the mean value.
- **Fixtures** (`test/engine-ayanamsa.test.js`):

  | Check | Expected value | Tolerance |
  |---|---|---|
  | Mean value at the epoch | Exact | Exact |
  | True value at the epoch | 23°15′00.658″ | ±2″ |
  | Swiss Ephemeris table, J1900 | 22.460148° | ±5″ (we get +1.2″) |
  | Published almanac values for 2000, 2024, 2025 and 2026 | 23°51′11″, 24°11′, 24°12′, 24°13′ | ±1′ |

  The ±1′ tolerance for almanac values follows from the ephemeris budget and from the almanacs'
  1′ rounding. The tolerance was set before testing.
- **Not included.** "Thirukanitha" is a calculation method, not an ayanamsa. KP and other ayanamsas would
  each be a separate, separately approved configuration with a new `ayanamsa.id`.

## 4. Time scales and coordinates

| Item | Convention |
|---|---|
| Input instants | UTC (`Date`). astronomy-engine converts to TT with its own ΔT model. UT1 ≈ UTC (difference < 0.9 s) |
| Ayanamsa, precession, mean node | TT |
| Planet positions | **Geocentric**, **apparent**: light-time and aberration corrected; ecliptic and true equinox of date; IAU 2000B nutation |
| Moon | Geocentric apparent (`EclipticGeoMoon`, ecliptic of date). No topocentric parallax |
| Lagna | ASC = atan2(cos RAMC, −(sin RAMC·cos ε + tan φ·sin ε)), where RAMC = GAST·15° + east longitude, ε = **true** obliquity and φ = geographic latitude. Normalised to [0, 360) |
| Speed | Sidereal °/day. Central difference over ±12 h of **unwrapped** longitude (`angleDiff`), so crossing 359°→0° is handled |
| Retrograde | speed < 0. Sun and Moon are never retrograde. The mean node is always retrograde |
| Stationary | \|speed\| below `STATIONARY_SPEED`: Mercury 0.1, Venus 0.05, Mars 0.05, Jupiter 0.008, Saturn 0.004 °/day (≈10 % of mean motion; pending approval) |
| Angles | Every longitude is normalised to [0, 360). Indices: rasi 0–11, nakshatra 0–26, pada 1–4, house 1–12 |
| Segment boundaries | Half-open [start, end): a value exactly on a boundary belongs to the **following** segment (rasi, nakshatra, varga, tithi, yoga, karana) |

The Lagna is verified against an independent numerical search for the ecliptic point on the eastern
horizon, across seven cities in both hemispheres. It agrees to < 0.01°.

## 5. Sunrise, Vedic day and Panchangam

- **Sunrise and sunset.** The Sun's upper limb touches the sea-level horizon, with standard atmospheric
  refraction (astronomy-engine `SearchRiseSet`, observer height 0). Elevation and local horizon are not
  modelled.
- **Vedic day.** Runs from one sunrise to the next. **An instant before sunrise belongs to the previous
  weekday.** The weekday is read in the local time zone at sunrise; this can be a fixed offset or an IANA
  zone.
- **Rahu Kalam, Yamagandam and Guligai.** Each is an eighth of sunrise → sunset. The 8th eighth ends
  exactly at sunset.
- **End times.** Tithi (12°), karana (6°), nakshatra (13°20′), yoga (13°20′) and Moon rasi end times use
  numerical root-finding:
  1. An hourly scan only brackets the root. Every panchangam angle moves < 1°/h, so one hour cannot
     contain two crossings of the same target.
  2. Bisection then narrows it to ≤ 1 s.
  3. Tests confirm that the value 1 s before the end is still the current index, and that the value at
     the end is the next index.
- **Multiple transitions.** `panchangTransitions(from, to)` lists every tithi, nakshatra, yoga and karana
  change, in order. After each boundary the search cursor restarts at that boundary, so two changes
  inside one scan step are both found. Skipped (kshaya) tithis appear as two tithi endings between
  consecutive sunrises. Tests find at least one such day in the first three months of 2026.
- **Horai.**
  - `tamil-60` (default): fixed 60-minute periods from sunrise. The last period is cut short at the next
    sunrise.
  - `planetary-unequal`: sunrise → sunset split into 12 equal parts, then sunset → next sunrise split
    into 12 equal parts.
  - Both methods start with the weekday lord and follow the Chaldean order (Sun, Venus, Mercury, Moon,
    Saturn, Jupiter, Mars).
  - Every row carries `method`. `panchang()` returns `horaiMethod` with `{id, en, ta}` so that the UI
    can label it.
  - The traditional authority for each method still needs confirmation (§9).
- **Festivals.** Out of scope for this contract. They need a separate regional observance engine
  (Brief §2).

## 6. Birth input and time zones (`shared/datetime.js`)

- **`birthInput()`.** Stores the original local date and time, the IANA zone, the UTC instant, the offset
  used, lat/lon, the place, and `timePrecision` (`exact` | `approximate` | `unknown`).
- **Zone versus numeric offset.** When `zone` is given, it replaces the numeric `tz`. Offsets come from
  the tz database bundled with the runtime (`Intl`). Examples:
  - India +6:30 war time, 1942–45 (tested with 1943).
  - Dubai +4:00.
  - DST in London, New York and Sydney.
- **Ambiguous local times** (clocks go back). These are flagged `ambiguous`. The **earlier** instant is
  used by default; `{ disambiguation: 'later' }` selects the other.
- **Nonexistent local times** (clocks go forward). These are flagged `nonexistent` and moved forward by
  the size of the gap (Temporal "compatible").
- **Age.**
  - `ageOn(dob, refDate)` uses calendar arithmetic only. It never divides milliseconds by 365.25.
  - The reference date is the person's local calendar date: `localDateIn(zone)`.
  - **Leap-day policy:** a 29 February birthday is reached on **28 February** in non-leap years.
  - `ageBand()` returns `0-5`, `6-12`, `13-17`, `18-25`, `26-59`, `60+` or `unknown`.
  - Birth time is not used for age.
- **Platform caveat.** The tz database version depends on the runtime (Node ICU, browser, Android/iOS
  WebView). Historical offsets for rare zones can differ between platforms. See §9.

## 7. Birth-time uncertainty

`chartStability(birthOrChart, windowMinutes)` recomputes across ±window. It reports `stable`,
`unstable` or `unavailable` for each of these items:

- Lagna rasi
- Navamsa Lagna
- every D-chart Lagna
- each planet's whole-sign house
- Moon nakshatra, pada and rasi

How it works:

- The Lagna is sampled every 30 s, so a change and a change back within the window are both seen.
- Planet signs are checked at −window, 0 and +window.
- `birthChart()` attaches `stability` automatically for `approximate` time (±30 min) and `unknown` time
  (±12 h).

For **unknown** time, positions are computed at local noon. The Lagna is **not invented**:

- `lagna` is `null` and `planets.Lagna` is absent.
- `availability.lagna` and `availability.houses` are `false`, with a bilingual reason.
- `dasa.approximate` is `true`.

Callers that read `chart.lagna.rasi` must handle this case. Existing callers only send exact times today.

## 8. Supported range and known limits

- **Range.** 1900-01-01 to 2100-12-31 is fixture-tested. Outside it, results are computed but not
  validated. ΔT extrapolation makes times before 1800 and after 2150 progressively less reliable.
- **High latitudes.**
  - Inside the polar circles the Sun may not rise or set. `vedicDay()` does not throw in that case.
    Missing events are replaced with 06:00 / 18:00 local mean time, and the result carries
    `polar: true`, `approximate: true` and `missing: [...]`.
  - `panchang()` exposes the same flags as `dayFlags`.
  - Unequal horai falls back to `tamil-60` with `fallback: true`.
  - Gowri slots are marked `approximate`.
  - Lagna gets `highLatitude: true` for |lat| > 66°, where the ascendant can jump.
- **Parallax.** No topocentric Moon parallax (up to about 1°). Tradition generally uses geocentric
  positions, but this needs confirmation.
- **Node.** True node is not supported. If it is added, it must be a separate configuration.
- **Rounding.** Root-finding stops at 1 s. Displayed times are rounded by the UI, never by the engine.

## 9. Needs expert / team

1. **Independent ephemeris benchmark.** Compare against Swiss Ephemeris (or JPL Horizons), using
   identical settings, over 1900–2100. Publish maximum and typical errors. Swiss Ephemeris is
   **AGPL or commercial**, so the team must make a licensing decision before linking it or shipping any
   validation tool built with it.
2. **At least 200 astronomical fixtures** checked against that independent ephemeris:
   - positions, Lagna, sunrise and end times
   - every Lagna sign
   - nakshatra and varga boundaries
   - stations
   - 0°/360°
   - high latitude
3. **100 consented, de-identified, expert-reviewed charts.**
4. **Astrologer sign-off on each varga mapping.**
   - `VARGA_VARIANTS[n].astrologerSignOff` is `false` for all of them.
   - D60 is `approved: false`, note 'awaiting astrologer review'. Do not show it as precise.
   - D2, D30 and D60 have exact boundary fixtures, which an expert should review.
5. **Ashtakavarga.** The BAV tables were checked cell by cell against the standard BPHS tables. No
   errors were found; totals are 48/49/39/54/56/52/39 and SAV = 337. An expert should still confirm the
   approved method and the use of the SAV thresholds (28 / 25).
6. **Horai.** Confirm the intended tradition for `tamil-60` versus `planetary-unequal`, and which one is
   shown by default.
7. **Thresholds.** Approve the stationary thresholds, the combustion orbs, and the strength-index
   weights. Also confirm that the index must never be presented as Shadbala or as a probability.
8. **Cross-platform parity.** Run the engine tests on web, Android and iOS WebViews and on the server.
   This includes the `Intl` tz database version on each platform.
9. **Other owners' follow-ups.**
   - `README.md` still claims arc-second accuracy.
   - `public/sw.js` precache must add `/shared/datetime.js` (astro.js imports it) and
     `/shared/engine-contract.js`.
   - The UI must handle `chart.lagna === null` for unknown birth times.
