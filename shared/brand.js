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
  supportEmail: 'support@example.com', // placeholder until a domain is confirmed
});

/** Bilingual helper usable on server and client: brandText('en'|'ta', key). */
export const brandName = (lang) => (lang === 'ta' ? BRAND.nameTa : BRAND.name);
export const brandTitle = () => `${BRAND.nameTa} · ${BRAND.nameUpper} — ${BRAND.descriptorEn}`;
