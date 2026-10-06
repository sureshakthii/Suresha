# Benchmark results

Swiss Ephemeris 2.10.03 (sweph npm, SE data files sepl_18/semo_18), SE_SIDM_LAHIRI vs shared/astro.js on astronomy-engine 2.1.19. Samples: 500 instants, 600 sunrise-days, 300 births, 372 sankrantis, 31 cities, 1940-01-01 … 2060-12-31.

## Sidereal longitudes (arc-seconds)

| Body | Median | 95th pct | Max | Rasi agree % | Nakshatra agree % | Pada agree % |
|---|---|---|---|---|---|---|
| Sun | 0.44 | 1.43 | 2.5 | 100 | 100 | 100 |
| Moon | 1.15 | 13.75 | 22.08 | 100 | 100 | 100 |
| Mars | 0.98 | 3.95 | 11.44 | 100 | 100 | 100 |
| Mercury | 1.57 | 4.95 | 11.98 | 100 | 100 | 100 |
| Jupiter | 2.7 | 6.45 | 9.48 | 100 | 100 | 99.8 |
| Venus | 0.94 | 6.33 | 15.53 | 100 | 100 | 100 |
| Saturn | 2.31 | 8.68 | 12.71 | 100 | 100 | 100 |
| Rahu | 0.11 | 0.13 | 0.13 | 100 | 100 | 100 |
| Ketu | 0.11 | 0.13 | 0.13 | 100 | 100 | 100 |
| Lagna | 0.14 | 1.95 | 3.23 | 100 | 100 | 100 |
| Ayanamsa | 0.14 | 0.27 | 0.35 | | | |

Moon by era: births/instants up to 2025 median 0.75″, max 5.56″; 2026–2060 median 8.24″, max 22.08″ (Delta-T extrapolation).


Mean node vs Swiss TRUE node (convention difference, not an error): median 1.03°, max 1.89°.

## Sunrise, sunset, Rahu Kalam (seconds)

| Item | Median | 95th pct | Max |
|---|---|---|---|
| Sunrise | 1.8 | 2.79 | 3.32 |
| Sunset | 1.82 | 2.75 | 3.27 |
| Rahu Kalam start | 0.85 | 1.64 | 2.49 |
| Rahu Kalam end | 0.86 | 2 | 3.08 |

## Panchangam at sunrise

| Element | Agreement % | End-time median (s) | 95th pct (s) | Max (s) |
|---|---|---|---|---|
| tithi | 100 | 2.18 | 26.01 | 39.94 |
| nakshatra | 100 | 1.76 | 26.72 | 39.06 |
| yoga | 100 | 1.9 | 27.02 | 38.18 |
| karana | 100 | 2.21 | 26.01 | 39.35 |
| weekday | 100 | | | |

## Vimshottari dasa

First dasa lord agreement 100 %; maha-dasa start dates: median 2.82 h, 95th pct 39.58 h, max 65.81 h (births up to 2025 only: median 1.69 h, max 10.86 h).

## Sankranti (Tamil month start)

Time error: median 11.42 s, max 47.9 s over 372 ingresses. Tamil day-1 date (Chennai, sunset rule) agreement: 100 %.

## Boundary disagreements (every one)

- Jupiter pada at 2021-02-18T07:45:41.408Z: app 290°, ref 290°, Δ -1.76″; reference is 0.06″ from the pada boundary

## Spot checks

| Check | Expected | Engine | OK |
|---|---|---|---|
| Mesha Sankranti 2024 at about 21:15 IST on 13 Apr (after sunset) → Tamil New Year (Chithirai 1, Krodhi) on 14 Apr 2024 | 13 Apr 2024 ~21:15 IST; 14 Apr = Chithirai 1 | 2024-04-13T21:04 IST (Lahiri-VP285 variant: 21:13 IST); 14 Apr = Chithirai 1, Krodhi | yes |
| Makara Sankranti 2024 at about 02:54 IST on 15 Jan → Thai Pongal (Thai 1) on 15 Jan 2024 | 15 Jan 2024 ~02:54 IST; Thai 1 | 2024-01-15T02:43 IST (Lahiri-VP285 variant: 02:52 IST); Thai 1 | yes |
| New moon of the total solar eclipse, 8 Apr 2024 18:21 UTC (NASA) = end of Amavasai | 2024-04-08 18:21 UTC | 2024-04-08T18:20 | yes |
| Deepavali 2024: Chathurdasi ends / Amavasai begins 31 Oct 2024 ≈ 15:52 IST | 31 Oct 2024 15:52 IST | 2024-10-31T15:53 IST | yes |
| Makara Sankranti 2025 ≈ 09:03 IST on 14 Jan → Thai Pongal 14 Jan 2025 | 14 Jan 2025 ~09:03 IST | 2025-01-14T08:55 IST (Lahiri-VP285 variant: 09:04 IST) | yes |
| Lahiri ayanamsa at J2000.0 = 23°51′11″ (Indian Astronomical Ephemeris, mean) | 23.8531° | 23.8532° (true, incl. nutation) | yes |

Moshier fallbacks (should be 0): 0
