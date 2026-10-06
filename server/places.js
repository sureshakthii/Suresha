import { PLACES, searchLocalPlaces, fromNominatim, nominatimUrl } from '../shared/places.js';

export { PLACES, searchLocalPlaces };

const cache = new Map(); // query -> results (small, process-lifetime; Nominatim asks clients to cache)
let lastCall = 0;

/**
 * Online fallback via OpenStreetMap Nominatim (usage policy: identifying User-Agent, ≤ 1 request/second, cache).
 * Every result carries an IANA zone: the country's zone, or for countries with several zones the zone of the
 * nearest built-in city in that country (never a longitude estimate).
 */
export async function searchOnline(q, limit = 5) {
  const key = `${q.trim().toLowerCase()}|${limit}`;
  if (cache.has(key)) return cache.get(key);
  const wait = lastCall + 1000 - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  try {
    const res = await fetch(nominatimUrl(q, { limit }), {
      headers: { 'User-Agent': `ThunaiApp/1.0 (${process.env.PUBLIC_URL || 'https://github.com/sureshakthii/Suresha'})` },
      signal: ctrl.signal,
    });
    if (!res.ok) return [];
    const data = await res.json();
    const out = data.map(fromNominatim).filter((p) => p.zone && Number.isFinite(p.lat) && Number.isFinite(p.lon));
    if (cache.size > 500) cache.clear();
    cache.set(key, out);
    return out;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}
