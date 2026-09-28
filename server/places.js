import { PLACES, searchLocalPlaces } from '../shared/places.js';

export { PLACES, searchLocalPlaces };

/** Online fallback via OpenStreetMap Nominatim. Time zone is estimated; the user can edit it. */
export async function searchOnline(q, limit = 5) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=${limit}&q=${encodeURIComponent(q)}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'KaippesiJothidar/1.0' }, signal: ctrl.signal });
    if (!res.ok) return [];
    const data = await res.json();
    return data.map((d) => {
      const lat = Number(d.lat), lon = Number(d.lon);
      const cc = d.address?.country_code;
      const tz = cc === 'in' || cc === 'lk' ? 5.5 : Math.round((lon / 15) * 2) / 2;
      return { name: d.display_name.split(',')[0], region: d.display_name.split(',').slice(1, 3).join(',').trim(), lat, lon, tz, estimatedTz: !(cc === 'in' || cc === 'lk') };
    });
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}
