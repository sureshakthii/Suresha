# Thunai — how the calculations are made

This is the short guide to the calculation engine: what settings it uses, which version you are looking at, and
where the full rules and the accuracy evidence live. `shared/version.js` points here.

- Full contract (every setting, with formulas): [ENGINE-CONTRACT.md](ENGINE-CONTRACT.md)
- Evidence that the numbers are right (Swiss Ephemeris benchmark, test coverage, limits): [ACCURACY-REPORT.md](ACCURACY-REPORT.md)
- Interpretation rules and their review status: [RULE-REGISTRY.md](RULE-REGISTRY.md)

## 1. Versions

| Constant | File | Current | Meaning | When to bump |
|---|---|---|---|---|
| `CALC_VERSION` | `shared/version.js` | 2.0.1 | Astronomy and panchangam conventions | Any change that can move a planet, a sunrise, a tithi/nakshatra end, a dasa date or a varga placement |
| `RULES_VERSION` | `shared/version.js` | 1.0.0 | Interpretation text and scoring rules | Any change to a rule, a score or the wording of a reading |
| `ENGINE_VERSION` | `shared/engine-contract.js` | 2.0.1 | Version of the settings contract (`ENGINE_SETTINGS`) | Always equal to `CALC_VERSION` (tested) |
| `ENGINE_VERSION` (label) | `shared/version.js` | `calc 2.0.1 · rules 1.0.0` | Display string for "Why this result?" and reports | Derived; never edited by hand |
| astronomy-engine | `package.json` | 2.1.19 | Ephemeris library | Pinned; `ENGINE_SETTINGS.ephemeris.version` must match (tested) |

Saved charts and reports carry these versions, so a later change is visible, never silent.
`test/accuracy-report.test.js` and `test/engine-contract.test.js` fail if the documents and the code disagree.

## 2. Settings (summary)

| Item | Convention |
|---|---|
| Zodiac | Sidereal |
| Ayanamsa | Lahiri (Chitrapaksha), Indian Calendar Reform Committee 1956 definition, IAU 2006 precession; true value (with nutation) for apparent planet positions |
| Positions | Geocentric, apparent (light-time, aberration, nutation), ecliptic of date |
| Rahu / Ketu | Mean lunar node; Ketu = Rahu + 180°. No true-node option |
| Lagna | Ascendant from apparent sidereal time, true obliquity and the birth place latitude |
| Houses | Whole-sign from the sidereal Lagna (South Indian rasi chart) |
| Sunrise / sunset | Upper limb on the sea-level horizon with standard refraction |
| Vedic day | Sunrise to next sunrise; the weekday before sunrise belongs to the previous day |
| Panchangam of a day | Values at sunrise (+1 minute); end times are exact instants |
| Tamil month | Thirukanitha Sankranti with the sunset rule (before sunset → that day; after → next day). Vakya is not supported |
| Dasa | Vimshottari, 120 years, balance from the Moon in its nakshatra; 1 year = 365.25 days. Levels: maha, bhukti, pratyantara (sookshma available) — every level is an exact proportional split |
| Divisional charts | Parashara mappings, each with a named variant id (`VARGA_VARIANTS` in `shared/varga.js`). D60 is *awaiting astrologer review* |
| Horai | Tamil equal 60-minute horai from sunrise by default; planetary unequal hours optional |
| Rahu Kalam, Yamagandam, Guligai | Day length split into 8 equal parts, weekday sequence |
| Time zones | IANA zone of the birth place with the offset in force on that date (historical changes and daylight saving included). Ambiguous times use the earlier instant and are flagged; nonexistent times move forward and are flagged |

## 3. Supported range and limits

- Benchmarked against the Swiss Ephemeris for **1940–2060** in 31 cities between 37° S and 52° N.
- Computed but not benchmarked outside that range. Polar latitudes are flagged (`highLatitude`, `polar`).
- Present-day planets agree to a few arc-seconds; future Moon positions differ by up to about 20″ because the
  Earth's future rotation (ΔT) is extrapolated differently by different libraries.
- An approximate birth time makes the Lagna, D60 and Sookshma periods approximate (`chartStability()`).
- Astronomical agreement is not prediction accuracy: interpretation is traditional guidance (see
  [ACCURACY-REPORT.md §8–9](ACCURACY-REPORT.md)).

## 4. Re-running the evidence

```bash
npm test                                   # engine fixtures, invariants, version stamps (no network)
cd scripts/benchmark && npm install && npm run setup && npm run bench   # Swiss Ephemeris comparison (dev only)
```

The benchmark writes `results.json` and `results.md` with `CALC_VERSION`, `RULES_VERSION`, `ENGINE_VERSION`, the
astronomy-engine version and the git commit. After a re-run, update the numbers and the version table in
ACCURACY-REPORT.md; the test checks that the report and `results.json` carry the same stamps.
