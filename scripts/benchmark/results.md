# Benchmark results

Generated 2026-10-07T03:07:24.323Z · CALC_VERSION 2.0.1 · RULES_VERSION 1.0.0 · ENGINE_VERSION 2.0.1 · astronomy-engine 2.1.19 · git 36c9bf2 (uncommitted changes)

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

## Pratyantara and Sookshma (sub-periods)

One random instant within the first 80 years of each of 300 births. Lord path (maha → bhukti → pratyantara) agreement 99 %; pratyantara start: median 3.05 h, 95th pct 28.62 h, max 74.53 h (births to 2025: max 14.55 h). Sookshma lord agreement 94.33 %; start: median 2.79 h, max 74.53 h.

## Divisional charts (Swiss longitude → independent Parashara mapping)

| Varga | Placements | Placement agree % | Mapping-only agree % (samples) |
|---|---|---|---|
| D9 | 5000 | 100 | 100 (20216) |
| D10 | 5000 | 100 | 100 (20240) |
| D12 | 5000 | 99.98 | 100 (20288) |
| D30 | 5000 | 100 | 100 (20000) |
| D60 | 5000 | 99.96 | 100 (21440) |

Every placement disagreement lies within 6.8″ of a varga boundary (3 of 25000).

## Sankranti (Tamil month start)

Time error: median 11.42 s, max 47.9 s over 372 ingresses. Tamil day-1 date (Chennai, sunset rule) agreement: 100 %.

## Boundary disagreements (every one)

- Jupiter pada at 2021-02-18T07:45:41.408Z: app 290°, ref 290°, Δ -1.76″; reference is 0.06″ from the pada boundary
- D12 Jupiter at 2019-07-04T12:24:30.299Z: app sign 4, ref sign 3, Δ 7.49″; reference is 6.8″ from the varga boundary
- D60 Jupiter at 2019-07-04T12:24:30.299Z: app sign 4, ref sign 3, Δ 7.49″; reference is 6.8″ from the varga boundary
- D60 Moon at 2042-02-27T09:18:16.144Z: app sign 4, ref sign 3, Δ 7.61″; reference is 6.44″ from the varga boundary
- sookshma at 2099-04-26T08:51:17.805Z (birth 2034-02-12T02:14:17.002Z): app Mars, ref Moon; instant is 15.25 h from the reference boundary
- sookshma at 2078-05-07T03:45:30.272Z (birth 2036-04-14T04:26:31.070Z): app Mars, ref Moon; instant is 9.87 h from the reference boundary
- sookshma at 2081-06-23T17:12:15.208Z (birth 2043-05-19T15:01:26.700Z): app Jupiter, ref Rahu; instant is 8.76 h from the reference boundary
- sookshma at 2070-10-24T13:17:19.216Z (birth 2007-03-17T22:58:36.418Z): app Rahu, ref Jupiter; instant is 0.87 h from the reference boundary
- sookshma at 2029-07-10T08:43:40.602Z (birth 2000-01-03T08:10:55.141Z): app Rahu, ref Mars; instant is 3.45 h from the reference boundary
- sookshma at 2053-06-10T06:56:08.857Z (birth 2042-06-21T16:50:07.140Z): app Mars, ref Moon; instant is 19.37 h from the reference boundary
- pratyantara at 2012-09-27T12:03:54.122Z (birth 2011-01-03T02:24:00.129Z): app Mercury, ref Saturn; instant is 0.4 h from the reference boundary
- pratyantara at 2109-10-14T17:06:40.194Z (birth 2056-01-31T11:48:44.995Z): app Mercury, ref Saturn; instant is 3.13 h from the reference boundary
- sookshma at 2059-08-28T18:22:02.663Z (birth 2059-03-30T09:15:58.927Z): app Mercury, ref Saturn; instant is 11.87 h from the reference boundary
- sookshma at 2053-01-04T21:28:11.912Z (birth 2047-10-25T17:42:22.877Z): app Jupiter, ref Rahu; instant is 1.29 h from the reference boundary
- sookshma at 2066-12-01T13:12:45.745Z (birth 2060-12-14T17:54:51.266Z): app Ketu, ref Mercury; instant is 6.32 h from the reference boundary
- sookshma at 2081-10-29T21:50:15.261Z (birth 2053-09-27T22:14:53.263Z): app Jupiter, ref Rahu; instant is 32.97 h from the reference boundary
- sookshma at 2084-10-29T10:07:20.120Z (birth 2048-11-25T13:56:36.304Z): app Moon, ref Sun; instant is 7.42 h from the reference boundary
- sookshma at 2014-03-21T22:05:26.953Z (birth 1963-10-03T21:20:40.098Z): app Mars, ref Moon; instant is 0.54 h from the reference boundary
- pratyantara at 2012-05-28T20:21:53.004Z (birth 1984-06-24T07:31:35.567Z): app Ketu, ref Venus; instant is 1.13 h from the reference boundary
- sookshma at 2081-10-14T02:20:35.431Z (birth 2054-02-22T18:19:24.907Z): app Ketu, ref Mercury; instant is 46.25 h from the reference boundary
- sookshma at 2116-08-27T21:56:35.485Z (birth 2050-09-12T02:40:33.577Z): app Venus, ref Ketu; instant is 20.82 h from the reference boundary

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
