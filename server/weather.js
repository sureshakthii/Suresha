import express from 'express';
import { round, WMO, wmoDescription, forecastUrl, mapForecast, travelAdvice } from '../shared/weather.js';
import { distanceKm, nearestStation, decodeWx, mapMetar, stationObservation as stationObs } from '../shared/station.js';

export { distanceKm, nearestStation, decodeWx, mapMetar };

export { WMO, wmoDescription, travelAdvice };

// Live weather: Open-Meteo forecast + the nearest airport METAR observation (NOAA Aviation Weather).
const TIMEOUT = 8000;
const CACHE_TTL = 10 * 60000;

let fetchImpl = (...args) => fetch(...args);
const cache = new Map(); // "lat,lon" (0.05° grid) -> { at, promise }

/** Tests inject a mock fetch here; pass nothing to restore the global one. */
export function setWeatherFetch(fn) {
  fetchImpl = fn || ((...args) => fetch(...args));
  cache.clear();
}
export const clearWeatherCache = () => cache.clear();


async function getJson(url) {
  const r = await fetchImpl(url, { signal: AbortSignal.timeout(TIMEOUT), headers: { Accept: 'application/json', 'User-Agent': 'ThunaiApp/1.0' } });
  if (!r.ok) throw new Error(`${new URL(url).host} ${r.status}`);
  return r.json();
}

// ---- WMO weather codes ----

const stationObservation = (lat, lon) => stationObs(lat, lon, getJson);

const gridKey = (lat, lon) => `${Math.round(lat * 20)},${Math.round(lon * 20)}`;

/** Weather for a point, cached per 0.05° cell for 10 minutes. Throws if the forecast is unavailable. */
export function getWeather(lat, lon) {
  const key = gridKey(lat, lon);
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.at < CACHE_TTL) return hit.promise;
  if (cache.size > 1000) for (const [k, v] of cache) if (now - v.at >= CACHE_TTL) cache.delete(k);
  const glat = Math.round(lat * 20) / 20, glon = Math.round(lon * 20) / 20;
  const promise = (async () => {
    const [forecast, station] = await Promise.all([getJson(forecastUrl(glat, glon)), stationObservation(lat, lon)]);
    const { current, hourly, daily } = mapForecast(forecast);
    return {
      station, current, hourly, daily,
      travel: travelAdvice(current, daily[0]),
      source: { forecast: 'Open-Meteo', station: 'NOAA Aviation Weather (METAR)' },
      fetchedAt: new Date().toISOString(),
    };
  })();
  cache.set(key, { at: now, promise });
  promise.catch(() => { if (cache.get(key)?.promise === promise) cache.delete(key); });
  return promise;
}

export function weatherRouter() {
  const r = express.Router();
  r.get('/weather', async (req, res) => {
    const lat = Number(req.query.lat), lon = Number(req.query.lon);
    if (req.query.lat === undefined || req.query.lat === '' || !Number.isFinite(lat) || lat < -90 || lat > 90) return res.status(400).json({ error: 'Invalid lat' });
    if (req.query.lon === undefined || req.query.lon === '' || !Number.isFinite(lon) || lon < -180 || lon > 180) return res.status(400).json({ error: 'Invalid lon' });
    try {
      res.json(await getWeather(lat, lon));
    } catch (e) {
      console.warn('weather:', e.message);
      res.status(502).json({ error: 'Weather service unavailable — please try again shortly' });
    }
  });
  return r;
}
