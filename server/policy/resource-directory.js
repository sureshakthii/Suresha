// Help-contact directory (Brief §20): jurisdiction-specific, with source URL and verification status.
// EVERY entry below is a DRAFT that the operations/legal team must verify before launch
// (needsVerification: true, lastVerified: null). Never fabricate numbers, and never assume India when the
// person's location is the UAE (or anywhere else) — unknown locations get only the offline fallback text.

export const DIRECTORY_VERSION = 'resources-0.1.0-draft';

const ENTRIES = {
  IN: [
    { id: 'in-112', kind: 'emergency', number: '112', name: { en: 'Emergency Response Support System (police, fire, ambulance)', ta: 'அவசர உதவி எண் (காவல், தீயணைப்பு, ஆம்புலன்ஸ்)' }, source: 'https://112.gov.in/', lastVerified: null, needsVerification: true },
    { id: 'in-1098', kind: 'child', number: '1098', name: { en: 'CHILDLINE — help for children in need of care and protection', ta: 'சைல்ட்லைன் — குழந்தைகளுக்கான உதவி எண்' }, source: 'https://wcd.nic.in/', lastVerified: null, needsVerification: true },
    { id: 'in-14416', kind: 'mental_health', number: '14416', name: { en: 'Tele-MANAS — free mental-health support (also 1-800-891-4416)', ta: 'டெலி-மனஸ் — இலவச மனநல ஆதரவு (1-800-891-4416)' }, source: 'https://telemanas.mohfw.gov.in/', lastVerified: null, needsVerification: true },
  ],
  AE: [
    { id: 'ae-999', kind: 'emergency', number: '999', name: { en: 'Police (UAE)', ta: 'காவல் துறை (ஐக்கிய அரபு அமீரகம்)' }, source: 'https://u.ae/en/information-and-services/justice-safety-and-the-law/handling-emergencies/emergency-numbers', lastVerified: null, needsVerification: true },
    { id: 'ae-998', kind: 'emergency', number: '998', name: { en: 'Ambulance (UAE)', ta: 'ஆம்புலன்ஸ் (ஐக்கிய அரபு அமீரகம்)' }, source: 'https://u.ae/en/information-and-services/justice-safety-and-the-law/handling-emergencies/emergency-numbers', lastVerified: null, needsVerification: true },
  ],
};

export const OFFLINE_FALLBACK = {
  en: 'If you or someone else is in immediate danger, contact your local emergency services now, or go to the nearest hospital or police station. If you can, tell a trusted person who is not involved in the harm.',
  ta: 'நீங்களோ வேறு யாரோ உடனடி ஆபத்தில் இருந்தால், உடனே உங்கள் பகுதியின் அவசர உதவி எண்ணைத் தொடர்புகொள்ளுங்கள், அல்லது அருகிலுள்ள மருத்துவமனை அல்லது காவல் நிலையத்துக்குச் செல்லுங்கள். முடிந்தால், இந்தப் பிரச்சினையில் சம்பந்தப்படாத நம்பிக்கையான ஒருவரிடம் சொல்லுங்கள்.',
};

const inBox = (lat, lon, [s, n, w, e]) => lat >= s && lat <= n && lon >= w && lon <= e;

/**
 * Work out the jurisdiction. Priority: explicit body.country (ISO-2) → location coordinates → 'unknown'.
 * The UTC offset alone is NOT used (many countries share +5:30 / +4:00).
 */
export function resolveJurisdiction(body = {}) {
  const c = typeof body.country === 'string' ? body.country.trim().toUpperCase() : '';
  if (/^[A-Z]{2}$/.test(c)) return { country: c, basis: 'declared' };
  const loc = body.loc && typeof body.loc === 'object' ? body.loc : null; // current location, never the birthplace
  const lat = Number(loc?.lat); const lon = Number(loc?.lon);
  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    if (inBox(lat, lon, [22.4, 26.5, 51.0, 56.6])) return { country: 'AE', basis: 'location' };
    // India (approximate box; excludes the UAE box above). Borders are approximate — neighbouring
    // countries can fall inside, so this is treated as "probable" and the UI should let the person confirm.
    if (inBox(lat, lon, [6.5, 35.7, 68.0, 97.5])) return { country: 'IN', basis: 'location-approximate' };
  }
  return { country: 'unknown', basis: 'none' };
}

/**
 * Contacts for a jurisdiction and need. kinds: 'emergency' | 'child' | 'mental_health'.
 * Returns { jurisdiction, contacts, fallback, needsVerification, version }.
 */
export function resourcesFor(jurisdiction, kinds = ['emergency'], lang = 'en') {
  const country = jurisdiction?.country || 'unknown';
  const all = ENTRIES[country] || [];
  const contacts = all.filter((e) => kinds.includes(e.kind) || e.kind === 'emergency').map((e) => ({
    id: e.id, kind: e.kind, number: e.number, name: lang === 'ta' ? e.name.ta : e.name.en,
    source: e.source, lastVerified: e.lastVerified, needsVerification: e.needsVerification,
  }));
  return {
    jurisdiction: country,
    contacts,
    fallback: lang === 'ta' ? OFFLINE_FALLBACK.ta : OFFLINE_FALLBACK.en,
    needsVerification: contacts.some((x) => x.needsVerification) || !contacts.length,
    version: DIRECTORY_VERSION,
  };
}

/** One short text block listing the contacts (used inside template answers). */
export function resourcesText(res) {
  const lines = res.contacts.map((c) => `☎️ ${c.number} — ${c.name}`);
  lines.push(res.fallback);
  return lines.join('\n');
}

/** Every entry, for documentation and the verification checklist. */
export const allEntries = () => Object.entries(ENTRIES).flatMap(([country, list]) => list.map((e) => ({ country, ...e })));
