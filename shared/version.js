// Versions of the calculation engine and the interpretation rules.
// Bump CALC when any astronomical/panchangam convention changes (see docs/CALCULATIONS.md),
// RULES when interpretation text or scoring rules change. Both appear in "Why this result?" and reports.
export const CALC_VERSION = '2.0.1';
export const RULES_VERSION = '1.0.0';
export const ENGINE_VERSION = `calc ${CALC_VERSION} · rules ${RULES_VERSION}`;
export const CONVENTIONS = {
  ephemeris: 'astronomy-engine 2.1.19 (VSOP87/ELP based), geocentric apparent positions',
  ayanamsa: 'Lahiri (Chitrapaksha)',
  nodes: 'Mean lunar node (Rahu); Ketu = Rahu + 180°',
  houses: 'Whole-sign houses from the sidereal Lagna (South Indian rasi chart)',
  lagna: 'Ascendant from local sidereal time and true obliquity at the birth place coordinates',
  sunrise: 'Upper limb of the Sun at the apparent horizon with standard refraction, at the chosen place',
  vedicDay: 'Panchangam day runs sunrise to next sunrise; tithi/nakshatra end times are instants',
  timezone: 'IANA time zone of the birth place (filled automatically from the built-in world list or the online place search) with the offset in force on the birth date — daylight saving and historical changes included (e.g. India +6:30 in 1942–45, Sri Lanka +6:30/+6:00 in 1996–2006, Singapore +7:30 before 1982). Profiles saved earlier with only a fixed UTC offset keep that offset unless their place is found in the world list',
  dasa: 'Vimshottari, 120-year cycle, balance from the Moon’s position in its nakshatra; year = 365.25 days',
  horai: 'Tamil practice: equal 60-minute horai from sunrise, first ruled by the weekday lord',
  rahuKalam: 'Day length (sunrise→sunset) divided into 8 equal parts, weekday sequence',
};
/** The same conventions in Tamil, for the Calculation methods screen in Tamil mode (library names stay in Latin). */
export const CONVENTIONS_TA = {
  ephemeris: 'astronomy-engine 2.1.19 (VSOP87/ELP அடிப்படை) — பூமியிலிருந்து தெரியும் (geocentric apparent) கிரக நிலைகள்',
  ayanamsa: 'லாஹிரி (சித்திரபக்ஷ) அயனாம்சம்',
  nodes: 'சராசரி சந்திரக் கணு (ராகு); கேது = ராகு + 180°',
  houses: 'நிராயன லக்னத்திலிருந்து முழு ராசி பாவங்கள் (தென்னிந்திய ராசி கட்டம்)',
  lagna: 'பிறந்த இடத்தின் அட்ச/தீர்க்க ரேகையில் உள்ளூர் நட்சத்திர நேரம், உண்மைச் சாய்வு கொண்டு லக்னம்',
  sunrise: 'சூரியனின் மேல் விளிம்பு தோன்றும் தொடுவானம், வழக்கமான ஒளிவிலகல் உட்பட — தேர்ந்த இடத்திற்கு',
  vedicDay: 'பஞ்சாங்க நாள் சூரிய உதயம் முதல் அடுத்த சூரிய உதயம் வரை; திதி / நட்சத்திர முடிவு நேரங்கள் துல்லியமான கணங்கள்',
  timezone: 'பிறந்த இடத்தின் IANA நேர மண்டலம் (உள்ளமைந்த உலகப் பட்டியல் அல்லது இணையத் தேடலிலிருந்து தானாக), பிறந்த நாளில் நடைமுறையில் இருந்த நேர வேறுபாட்டுடன் — பகல் சேமிப்பு நேரமும் வரலாற்று மாற்றங்களும் உட்பட (எ.கா. இந்தியா 1942–45-ல் +6:30, இலங்கை 1996–2006-ல் +6:30/+6:00, சிங்கப்பூர் 1982-க்கு முன் +7:30). முன்பு நிலையான UTC வேறுபாட்டுடன் சேமித்த சுயவிவரங்கள், இடம் உலகப் பட்டியலில் இல்லையெனில் அதே வேறுபாட்டைத் தொடரும்',
  dasa: 'விம்சோத்தரி, 120 ஆண்டுச் சுழற்சி; ஜன்ம நட்சத்திரத்தில் சந்திரன் நின்ற நிலையிலிருந்து தசா இருப்பு; ஓர் ஆண்டு = 365.25 நாட்கள்',
  horai: 'தமிழ் மரபு: சூரிய உதயம் முதல் சம அளவு 60 நிமிட ஓரைகள்; முதல் ஓரை அன்றைய கிழமை அதிபதி',
  rahuKalam: 'பகல் நேரம் (உதயம்→அஸ்தமனம்) 8 சம பாகங்கள்; கிழமை வரிசைப்படி',
};
