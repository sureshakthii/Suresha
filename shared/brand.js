// Brand configuration — the ONE place the product name lives.
//
// "THUNAI / துணை" is a WORKING brand: trademark and domain availability are not yet confirmed.
// To rename the product, change the values below (and the static fallbacks listed in
// docs/BRAND.md: manifest, capacitor appName, Android strings.xml, iOS Info.plist, sw.js).
// Internal identifiers (app ID app.kaippesi.jothidar, storage keys kj_*, cookie kj_session)
// deliberately stay unchanged so installed apps update in place and nobody loses data.
export const BRAND = Object.freeze({
  name: 'Thunai',                 // English / Latin name used in running text
  nameUpper: 'THUNAI',            // wordmark
  nameTa: 'துணை',                 // Tamil name
  taglineTa: 'உங்கள் வாழ்வின் வழித்துணை.',
  taglineEn: 'Your companion on life’s path.',
  descriptorEn: 'Personal Astrology & Spiritual Guidance',
  descriptorTa: 'தனிப்பட்ட ஜோதிடம் & ஆன்மீக வழிகாட்டல்',
  assistantEn: 'Thunai Guide',     // the chat assistant's display name
  assistantTa: 'துணை வழிகாட்டி',
  personalEn: 'Thunai Personal',   // the paid plan for one person (called "Premium" before)
  personalTa: 'துணை தனிநபர்',
  premiumEn: 'Thunai Personal',    // deprecated alias of personalEn — kept so older code shows the new name
  premiumTa: 'துணை தனிநபர்',
  familyEn: 'Thunai Family',
  familyTa: 'துணை குடும்பம்',
  year: 2026,
  developer: 'AG Technology Solutions',
  supportEmail: '', // = SUPPORT_EMAIL below (kept for older callers)
});

// Support & grievance contacts — the ONE place they live. Empty until the owner publishes the real address:
// screens then say "support contact will be published at launch" (never a made-up address or domain).
export const SUPPORT_EMAIL = '';
/** Grievance Officer (IT Rules 2021 / DPDP Act 2023). Fill all three before public release. */
export const GRIEVANCE = Object.freeze({ name: '', email: '', phone: '' });
// Public app link printed on share cards and shared text. Empty until the domain is final (no placeholder domain).
export const APP_URL = '';

const PENDING = { en: 'Support contact will be published at launch', ta: 'உதவித் தொடர்பு முகவரி செயலி வெளியீட்டின்போது அறிவிக்கப்படும்' };
/** The support address, or the honest "published at launch" line when none is set yet. */
export const supportContact = (lang = 'en') => SUPPORT_EMAIL || (lang === 'ta' ? PENDING.ta : PENDING.en);
/** Grievance Officer contact lines ("Name: …", "E-mail: …", "Phone: …"), or the same fallback line when not set. */
export function grievanceContact(lang = 'en') {
  const ta = lang === 'ta';
  const rows = [[ta ? 'பெயர்' : 'Name', GRIEVANCE.name], [ta ? 'மின்னஞ்சல்' : 'E-mail', GRIEVANCE.email], [ta ? 'தொலைபேசி' : 'Phone', GRIEVANCE.phone]].filter(([, v]) => v);
  if (!rows.length) return ta ? 'குறைதீர் அலுவலரின் தொடர்பு விவரங்கள் செயலி வெளியீட்டின்போது அறிவிக்கப்படும்' : 'The Grievance Officer’s contact details will be published at launch';
  return rows.map(([k, v]) => `${k}: ${v}`).join(' · ');
}

/** Bilingual helper usable on server and client: brandText('en'|'ta', key). */
export const brandName = (lang) => (lang === 'ta' ? BRAND.nameTa : BRAND.name);
export const brandTitle = () => `${BRAND.nameTa} · ${BRAND.nameUpper} — ${BRAND.descriptorEn}`;
