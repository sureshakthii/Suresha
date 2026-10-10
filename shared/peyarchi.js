// Peyarchi Palan (Guru / Sani / Rahu-Ketu transits), monthly & yearly Rasi Palan and the
// annual Viratha Naatkal list. Sidereal (Lahiri), runs unchanged in Node and the browser.
import * as A from 'astronomy-engine';
import { lahiriAyanamsa, norm360, sunSidereal, moonSidereal, RASIS, PLANETS } from './astro.js';
import { tamilMonth } from './tamilcal.js';

const DAY = 86400000;
const MINUTE = 60000;

/** The four slow grahas whose sign change is a "Peyarchi". */
export const PEYARCHI_PLANETS = ['Jupiter', 'Saturn', 'Rahu', 'Ketu'];
export const PEYARCHI_NAMES = {
  Jupiter: { en: 'Guru Peyarchi', ta: 'குருப் பெயர்ச்சி' },
  Saturn: { en: 'Sani Peyarchi', ta: 'சனிப் பெயர்ச்சி' },
  Rahu: { en: 'Rahu Peyarchi', ta: 'ராகுப் பெயர்ச்சி' },
  Ketu: { en: 'Ketu Peyarchi', ta: 'கேதுப் பெயர்ச்சி' },
};

// ---------------------------------------------------------------- longitudes
function meanNodeTropical(date) {
  const T = (date.getTime() / DAY + 2440587.5 - 2451545.0) / 36525;
  return norm360(125.0445479 - 1934.1362891 * T + 0.0020754 * T * T + (T * T * T) / 467441);
}

/** Sidereal longitude of a slow graha (Jupiter, Saturn, Rahu = mean node, Ketu = Rahu + 180). */
export function siderealLongitude(planet, date) {
  const aya = lahiriAyanamsa(date);
  if (planet === 'Rahu') return norm360(meanNodeTropical(date) - aya);
  if (planet === 'Ketu') return norm360(meanNodeTropical(date) - aya + 180);
  if (planet === 'Sun') return sunSidereal(date);
  return norm360(A.Ecliptic(A.GeoVector(planet, A.MakeTime(date), true)).elon - aya);
}

// Day-quantized sample cache (keyed by UTC day number) shared by every scan.
const sampleCache = new Map();
function dayLon(planet, dayNum) {
  const key = `${planet}|${dayNum}`;
  let v = sampleCache.get(key);
  if (v === undefined) {
    v = siderealLongitude(planet, new Date(dayNum * DAY));
    if (sampleCache.size > 40000) sampleCache.clear();
    sampleCache.set(key, v);
  }
  return v;
}
const rasiOf = (lon) => Math.floor(lon / 30) % 12;

/**
 * Sidereal sign changes of Jupiter / Saturn / Rahu / Ketu between `from` and `to`.
 * Stepped in whole UTC days (cached) and refined by bisection to under a minute.
 * `retro` is true when the graha moved back into the previous sign (Rahu/Ketu always move back).
 */
export function ingresses(planet, from, to) {
  if (planet === 'Ketu') {
    return ingresses('Rahu', from, to).map((x) => ({ ...x, fromRasi: (x.fromRasi + 6) % 12, toRasi: (x.toRasi + 6) % 12 }));
  }
  const out = [];
  const d0 = Math.floor(new Date(from).getTime() / DAY);
  const d1 = Math.ceil(new Date(to).getTime() / DAY);
  let prev = rasiOf(dayLon(planet, d0));
  for (let d = d0 + 1; d <= d1; d++) {
    const r = rasiOf(dayLon(planet, d));
    if (r === prev) continue;
    let lo = (d - 1) * DAY;
    let hi = d * DAY;
    while (hi - lo > 30000) {
      const mid = (lo + hi) / 2;
      if (rasiOf(siderealLongitude(planet, new Date(mid))) === prev) lo = mid; else hi = mid;
    }
    const date = new Date(Math.round(hi / MINUTE) * MINUTE);
    if (date >= new Date(from) && date <= new Date(to)) {
      out.push({ date, fromRasi: prev, toRasi: r, retro: r === (prev + 11) % 12 });
    }
    prev = r;
  }
  return out;
}

const SEARCH_YEARS = { Jupiter: 3, Saturn: 4, Rahu: 3, Ketu: 3 };
const currentCache = new Map();

/** Where each slow graha is now, since when, and its next sign change. */
export function currentPeyarchi(now = new Date()) {
  const key = Math.floor(now.getTime() / (6 * 3600000));
  if (currentCache.has(key)) return currentCache.get(key);
  const out = {};
  for (const planet of PEYARCHI_PLANETS) {
    const span = SEARCH_YEARS[planet] * 365.25 * DAY;
    const list = ingresses(planet, new Date(now.getTime() - span), new Date(now.getTime() + span));
    const lon = siderealLongitude(planet, now);
    const rasi = rasiOf(lon);
    const past = list.filter((x) => x.date <= now);
    const sinceEv = past.length ? past[past.length - 1] : null;
    const nextEv = list.find((x) => x.date > now) || null;
    const after = siderealLongitude(planet, new Date(now.getTime() + DAY));
    let dlon = after - lon; if (dlon > 180) dlon -= 360; if (dlon < -180) dlon += 360;
    out[planet] = {
      planet, ta: PLANETS[planet].ta, name: PEYARCHI_NAMES[planet],
      longitude: lon, rasi, rasiEn: RASIS[rasi].en, rasiTa: RASIS[rasi].ta,
      degreeInSign: lon - rasi * 30,
      retrograde: dlon < 0,
      since: sinceEv ? sinceEv.date : null, sinceRetro: sinceEv ? sinceEv.retro : false,
      next: nextEv ? nextEv.date : null, nextRasi: nextEv ? nextEv.toRasi : null, nextRetro: nextEv ? nextEv.retro : false,
      events: list,
    };
  }
  currentCache.set(key, out);
  if (currentCache.size > 8) currentCache.delete(currentCache.keys().next().value);
  return out;
}

// ---------------------------------------------------------------- gochara palan
// Per house 1..12 from the janma rasi: level code (g good, m mixed, c care) and score.
const RULES = {
  Jupiter: { lv: 'mgcmgcgcgmgc', sc: [50, 80, 40, 52, 85, 40, 80, 32, 90, 50, 90, 40] },
  Saturn: { lv: 'ccgcmgmcmmgc', sc: [28, 35, 85, 35, 50, 85, 48, 25, 52, 48, 90, 35] },
  Rahu: { lv: 'ccgmmgccmmgc', sc: [38, 40, 80, 50, 48, 82, 40, 32, 52, 55, 85, 40] },
  Ketu: { lv: 'ccgmmgccmmgm', sc: [40, 40, 80, 50, 52, 80, 42, 36, 55, 52, 82, 55] },
  Sun: { lv: 'cmgcmgmcmggc', sc: [38, 50, 80, 42, 48, 80, 50, 35, 50, 82, 85, 38] },
  Mars: { lv: 'cmgcmgccmmgc', sc: [36, 48, 80, 38, 48, 82, 38, 32, 50, 52, 85, 36] },
};
const LEVEL = { g: 'good', m: 'mixed', c: 'care' };
const ORD_EN = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];
const ORD_TA = ['ஒன்றாம்', 'இரண்டாம்', 'மூன்றாம்', 'நான்காம்', 'ஐந்தாம்', 'ஆறாம்', 'ஏழாம்', 'எட்டாம்', 'ஒன்பதாம்', 'பத்தாம்', 'பதினொன்றாம்', 'பன்னிரண்டாம்'];
export const houseOrdinal = (h) => ({ en: ORD_EN[h - 1], ta: ORD_TA[h - 1] });

// [english, tamil] for houses 1..12 from the Moon sign.
const TEXTS = {
  Jupiter: [
    ['Janma Guru (Guru in your own rasi): a time to slow down and plan well. Spending on family functions and travel may rise; keep your health routine steady. Interest in prayer and good books grows.',
      'ஜென்ம குரு: நிதானமாகத் திட்டமிட வேண்டிய காலம். குடும்ப விழா, பயணம் காரணமாகச் செலவுகள் கூடலாம்; உடல்நல ஒழுங்கைக் கடைப்பிடியுங்கள். இறை வழிபாட்டிலும் நல்ல நூல்களிலும் ஆர்வம் வளரும்.'],
    ['Guru in the 2nd brings money flow, sweet speech and happiness in the family. Marriage talks move forward and savings grow.',
      'இரண்டாம் இட குரு: பணவரவு பெருகும், பேச்சில் இனிமை கூடும், குடும்பத்தில் மகிழ்ச்சி நிறையும். திருமணப் பேச்சுகள் கைகூடும், சேமிப்பு உயரும்.'],
    ['Guru in the 3rd asks for patience: efforts may take a little longer to bear fruit and short trips increase. Avoid hasty job changes and trust steady work.',
      'மூன்றாம் இட குரு: முயற்சிகளுக்குப் பலன் சற்றுத் தாமதமாக வரலாம், சிறு பயணங்கள் கூடும். அவசரமாக வேலை மாற வேண்டாம்; தொடர் உழைப்பை நம்புங்கள்.'],
    ['Guru in the 4th: give attention to home, mother and peace of mind. House or vehicle plans move slowly and steadily; let go of needless worry.',
      'நான்காம் இட குரு: வீடு, தாய், மன அமைதி மீது கவனம் செலுத்துங்கள். வீடு, வாகனத் திட்டங்கள் மெதுவாக ஆனால் உறுதியாக நகரும்; தேவையற்ற கவலையை விட்டுவிடுங்கள்.'],
    ['Guru in the 5th is a blessing for children, education and new ideas. Good news about children, recognition for your intelligence and deeper devotion.',
      'ஐந்தாம் இட குரு: குழந்தைகள், கல்வி, புதிய சிந்தனைகளுக்கு அருள் நிறைந்த காலம். புத்திர பாக்கியம், அறிவுக்கு அங்கீகாரம், இறை பக்தி பெருகும்.'],
    ['Guru in the 6th: be careful while borrowing or lending, and look after small health issues early. Hard work helps you win over competition; keep your accounts clear.',
      'ஆறாம் இட குரு: கடன் வாங்குவதிலும் கொடுப்பதிலும் கவனம் தேவை; சிறு உடல் உபாதைகளை உடனே கவனியுங்கள். கடின உழைப்பால் போட்டிகளை வெல்வீர்கள்; கணக்குகளைத் தெளிவாக வைத்திருங்கள்.'],
    ['Guru in the 7th favours marriage, partnerships and support from your spouse. New business ties and respect in society grow.',
      'ஏழாம் இட குரு: திருமணம், கூட்டுத் தொழில், வாழ்க்கைத் துணையின் ஆதரவுக்கு உகந்த காலம். புதிய தொழில் உறவுகளும் சமூக மதிப்பும் உயரும்.'],
    ['Guru in the 8th: a quiet period — avoid bold investments, speculation and arguments. Keep up regular health check-ups; help still arrives through elders when needed.',
      'எட்டாம் இட குரு: அமைதியாகச் செல்ல வேண்டிய காலம். துணிச்சலான முதலீடுகள், ஊக வணிகம், வாக்குவாதங்களைத் தவிருங்கள். உடல்நலப் பரிசோதனைகளைத் தொடருங்கள்; தேவையான நேரத்தில் பெரியோர் மூலம் உதவி கிடைக்கும்.'],
    ['Guru in the 9th is one of the best times: luck, your father\'s blessings, pilgrimages and long-pending wishes come true.',
      'ஒன்பதாம் இட குரு: மிகச் சிறந்த காலம். அதிர்ஷ்டம், தந்தையின் ஆசி, புனிதப் பயணங்கள் கைகூடும்; நீண்ட நாள் ஆசைகள் நிறைவேறும்.'],
    ['Guru in the 10th: workload and responsibilities rise. Stay humble at work and avoid ego clashes with seniors; steady effort keeps your position safe.',
      'பத்தாம் இட குரு: வேலைப்பளுவும் பொறுப்புகளும் கூடும். பணியிடத்தில் பணிவுடன் இருங்கள், மேலதிகாரிகளுடன் கருத்து மோதலைத் தவிருங்கள்; தொடர் முயற்சி பதவியைக் காக்கும்.'],
    ['Guru in the 11th brings gains from all sides: income can rise, friends tend to help and heartfelt wishes have good support.',
      'பதினொன்றாம் இட குரு: எல்லாப் பக்கங்களிலிருந்தும் லாபம். வருமானம் உயர வாய்ப்பு, நண்பர்கள் உதவக்கூடும், மனதின் ஆசைகளுக்கு நல்ல ஆதரவு.'],
    ['Guru in the 12th: expenses rise, mostly for good causes — temples, travel and children\'s needs. Plan a budget and make time for rest and sleep.',
      'பன்னிரண்டாம் இட குரு: செலவுகள் கூடும் — பெரும்பாலும் கோவில், பயணம், குழந்தைகளின் தேவை போன்ற நல்ல காரியங்களுக்கே. செலவுத் திட்டம் வகுத்து, போதிய ஓய்வும் தூக்கமும் எடுங்கள்.'],
  ],
  Saturn: [
    ['Janma Sani (middle of Ezharai Sani): work feels heavy and results come slowly. Stay calm and disciplined with health and money — the patience you build now becomes lasting strength.',
      'ஜென்ம சனி (ஏழரைச் சனியின் நடுப்பகுதி): உழைப்பு அதிகம், பலன் மெதுவாக வரும். அமைதியாக இருந்து உடல்நலத்திலும் பணத்திலும் ஒழுங்கு காட்டுங்கள்; இப்போது வளர்க்கும் பொறுமை நிலையான வலிமையாக மாறும்.'],
    ['Paadha Sani (last phase of Ezharai Sani): mind your words in the family and avoid lending money. Life steadily brightens as this phase ends.',
      'பாதச் சனி (ஏழரைச் சனியின் இறுதிப் பகுதி): குடும்பத்தில் பேச்சில் கவனம் தேவை, பிறருக்குப் பணம் கடன் கொடுப்பதைத் தவிருங்கள். இந்தக் காலம் முடியும்போது வாழ்க்கை படிப்படியாகப் பிரகாசிக்கும்.'],
    ['Sani in the 3rd is excellent: courage grows, efforts succeed, siblings support you and hard work pays well.',
      'மூன்றாம் இட சனி: மிகச் சிறப்பான காலம். தைரியம் கூடும், முயற்சிகள் வெற்றி பெறும், உடன்பிறந்தோர் துணை நிற்பர், உழைப்புக்கு நல்ல பலன் கிடைக்கும்.'],
    ['Ardhashtama Sani (4th): peace at home and your mother\'s health need care; drive carefully. Be patient in property matters and they will settle.',
      'அர்த்தாஷ்டமச் சனி (நான்காம் இடம்): வீட்டு அமைதியும் தாயின் உடல்நலமும் கவனம் பெற வேண்டும்; வாகனப் பயணத்தில் எச்சரிக்கை தேவை. சொத்து விவகாரங்களில் பொறுமை காத்தால் எல்லாம் சீராகும்.'],
    ['Sani in the 5th: children\'s matters and studies need more attention. Avoid speculation and think twice before big decisions.',
      'ஐந்தாம் இட சனி: குழந்தைகள், கல்வி விஷயங்களில் கூடுதல் கவனம் தேவை. ஊக முதலீடுகளைத் தவிருங்கள்; பெரிய முடிவுகளுக்கு முன் இருமுறை யோசியுங்கள்.'],
    ['Sani in the 6th helps you clear debts and face opposition, and supports effort in jobs and competitive exams. A disciplined daily routine is your best support.',
      'ஆறாம் இட சனி: கடன்களைத் தீர்க்கவும் எதிர்ப்புகளைச் சமாளிக்கவும் உதவும் காலம்; வேலையிலும் போட்டித் தேர்வுகளிலும் முயற்சிக்கு ஆதரவு. ஒழுங்கான அன்றாட வாழ்க்கை முறையே சிறந்த துணை.'],
    ['Kandaka Sani (7th): give extra love and understanding to your spouse and partners. Avoid rushing into new partnerships; travel gives mixed results.',
      'கண்டகச் சனி (ஏழாம் இடம்): வாழ்க்கைத் துணையிடமும் கூட்டாளிகளிடமும் கூடுதல் அன்பும் புரிதலும் காட்டுங்கள். அவசரமாகப் புதிய கூட்டுத் தொழில் வேண்டாம்; பயணங்கள் கலவையான பலன் தரும்.'],
    ['Ashtama Sani (8th): a time to go slow. Avoid bold new ventures, long night journeys and arguments, and look after your health. Sincere prayer and a steady routine carry you safely through.',
      'அஷ்டமச் சனி (எட்டாம் இடம்): நிதானமாகச் செல்ல வேண்டிய காலம். துணிச்சலான புதிய முயற்சிகள், இரவு நெடும்பயணம், வாக்குவாதங்களைத் தவிருங்கள்; உடல்நலத்தைப் பேணுங்கள். மனமார்ந்த வழிபாடும் ஒழுங்கான வாழ்க்கையும் உங்களைப் பாதுகாப்பாகக் கரை சேர்க்கும்.'],
    ['Sani in the 9th: luck comes through effort; respect elders and your father. Long-distance plans may take longer — patient effort keeps them moving.',
      'ஒன்பதாம் இட சனி: உழைப்பின் வழியே அதிர்ஷ்டத்திற்கு ஆதரவு; பெரியோரையும் தந்தையையும் மதியுங்கள். தொலைதூரத் திட்டங்கள் தாமதமாகலாம் — பொறுமையான முயற்சி அவற்றை முன்னெடுக்கும்.'],
    ['Karma Sani (10th): a heavy workload, but sincere work earns recognition. Avoid shortcuts, and do not leave a job without a firm new offer.',
      'கர்மச் சனி (பத்தாம் இடம்): வேலைப்பளு அதிகம், ஆனால் நேர்மையான உழைப்புக்கு அங்கீகாரம் கிடைக்கும். குறுக்கு வழிகளைத் தவிருங்கள்; உறுதியான புதிய வாய்ப்பின்றி வேலையை விடாதீர்கள்.'],
    ['Sani in the 11th supports steady income growth, property plans and progress on long-held goals.',
      'பதினொன்றாம் இட சனி: வருமானம் நிலையாக உயர ஆதரவு, சொத்துத் திட்டங்களுக்குச் சாதகம், நீண்ட நாள் லட்சியங்களில் முன்னேற்றம்.'],
    ['Viraya Sani (start of Ezharai Sani): expenses and travel increase and sleep may suffer. Save wisely and avoid standing guarantee for others.',
      'விரயச் சனி (ஏழரைச் சனியின் தொடக்கம்): செலவுகளும் பயணங்களும் கூடும், தூக்கம் குறையலாம். கவனமாகச் சேமியுங்கள்; பிறருக்கு ஜாமீன் கையெழுத்து போடுவதைத் தவிருங்கள்.'],
  ],
  Rahu: [
    ['Rahu in your rasi: the mind may be restless with sudden ideas. Avoid shortcuts, keep a simple daily routine, and a few minutes of meditation daily can bring clarity.',
      'ஜென்ம ராகு: மனம் அலைபாயும், திடீர் எண்ணங்கள் தோன்றும். குறுக்கு வழிகளைத் தவிர்த்து எளிய அன்றாட ஒழுங்கைப் பின்பற்றுங்கள்; தினமும் சில நிமிட தியானம் தெளிவு தர உதவும்.'],
    ['Rahu in the 2nd: be mindful of your words and family harmony; check documents carefully before money dealings.',
      'இரண்டாம் இட ராகு: பேச்சிலும் குடும்ப ஒற்றுமையிலும் கவனம் தேவை; பணப் பரிவர்த்தனைக்கு முன் ஆவணங்களைக் கவனமாகச் சரிபாருங்கள்.'],
    ['Rahu in the 3rd gives boldness and success in travel, communication and new ventures. Your efforts get noticed.',
      'மூன்றாம் இட ராகு: துணிவு கூடும்; பயணம், தகவல் தொடர்பு, புதிய முயற்சிகளில் வெற்றி கிடைக்கும். உங்கள் முயற்சிகள் பாராட்டப்படும்.'],
    ['Rahu in the 4th: keep peace at home and be careful with vehicles and property papers.',
      'நான்காம் இட ராகு: வீட்டில் அமைதியைப் பேணுங்கள்; வாகனம், சொத்து ஆவணங்களில் கவனம் தேவை.'],
    ['Rahu in the 5th: avoid speculation and guide children patiently; learning new technology is favoured.',
      'ஐந்தாம் இட ராகு: ஊக வணிகத்தைத் தவிருங்கள்; குழந்தைகளைப் பொறுமையுடன் வழிநடத்துங்கள். புதிய தொழில்நுட்பம் கற்க உகந்த காலம்.'],
    ['Rahu in the 6th is traditionally linked with doing well against competition and easing debts. Legal matters: follow your lawyer; tradition sees this as a supportive period.',
      'ஆறாம் இட ராகு: போட்டிகளில் சிறப்பு, கடன் குறைதல் ஆகியவற்றுடன் பாரம்பரியமாக இணைக்கப்படுகிறது. வழக்கு விவகாரங்களில் வழக்கறிஞர் ஆலோசனையைப் பின்பற்றுங்கள்; பாரம்பரியப்படி இது ஆதரவான காலம்.'],
    ['Rahu in the 7th: give time and trust to your spouse; read agreements carefully before signing.',
      'ஏழாம் இட ராகு: வாழ்க்கைத் துணைக்கு நேரமும் நம்பிக்கையும் கொடுங்கள்; ஒப்பந்தங்களைக் கவனமாகப் படித்த பின்பே கையெழுத்திடுங்கள்.'],
    ['Rahu in the 8th: avoid bold investments and needless night travel; keep up your regular check-ups with your doctor.',
      'எட்டாம் இட ராகு: துணிச்சலான முதலீடுகளையும் இரவுப் பயணங்களையும் தவிருங்கள்; மருத்துவரிடம் வழக்கமான பரிசோதனைகளைத் தொடருங்கள்.'],
    ['Rahu in the 9th: value elders\' advice; pilgrimages to distant places or abroad may come up.',
      'ஒன்பதாம் இட ராகு: பெரியோரின் அறிவுரையை மதியுங்கள்; தொலைதூர அல்லது வெளிநாட்டுப் புனிதப் பயணங்கள் அமையலாம்.'],
    ['Rahu in the 10th: sudden changes and new roles at work; stay honest and keep away from office politics.',
      'பத்தாம் இட ராகு: பணியில் திடீர் மாற்றங்களும் புதிய பொறுப்புகளும் வரலாம்; நேர்மையுடன் இருங்கள், பணியிட அரசியலிலிருந்து விலகியிருங்கள்.'],
    ['Rahu in the 11th brings unexpected gains, new friends and income from new or foreign sources.',
      'பதினொன்றாம் இட ராகு: எதிர்பாராத லாபம், புதிய நண்பர்கள், புதிய அல்லது வெளிநாட்டு வழிகளில் வருமானம் கிடைக்கும்.'],
    ['Rahu in the 12th: keep expenses in check and get enough sleep; foreign travel or a spiritual retreat is possible.',
      'பன்னிரண்டாம் இட ராகு: செலவுகளைக் கட்டுக்குள் வையுங்கள், போதிய தூக்கம் அவசியம்; வெளிநாட்டுப் பயணம் அல்லது ஆன்மிகப் பயணம் அமையலாம்.'],
  ],
  Ketu: [
    ['Ketu in your rasi: you may feel detached or tired at times; look after your health and lean on prayer and spiritual practice.',
      'ஜென்ம கேது: அவ்வப்போது பற்றின்மையும் சோர்வும் தோன்றலாம்; உடல்நலம் பேணி, வழிபாட்டிலும் ஆன்மிகப் பயிற்சியிலும் ஈடுபடுங்கள்.'],
    ['Ketu in the 2nd: speak gently at home and keep your words kind and your routine regular; money comes through steady effort.',
      'இரண்டாம் இட கேது: வீட்டில் மென்மையாகப் பேசுங்கள், இனிய சொல்லும் சீரான அன்றாட ஒழுங்கும் நன்று; தொடர் முயற்சியால் பண வரவு.'],
    ['Ketu in the 3rd gives courage, quick success and spiritual strength.',
      'மூன்றாம் இட கேது: தைரியம், விரைவான வெற்றி, ஆன்மிக வலிமை கிடைக்கும்.'],
    ['Ketu in the 4th: your mother\'s health and home comforts need attention; keep the mind calm.',
      'நான்காம் இட கேது: தாயின் உடல்நலம், வீட்டு வசதிகளில் கவனம் தேவை; மனதை அமைதியாக வைத்திருங்கள்.'],
    ['Ketu in the 5th: guide children lovingly; deep study and mantra chanting bring good results.',
      'ஐந்தாம் இட கேது: குழந்தைகளை அன்புடன் வழிநடத்துங்கள்; ஆழ்ந்த படிப்பும் மந்திர ஜபமும் நல்ல பலன் தரும்.'],
    ['Ketu in the 6th helps you work through obstacles and opposition; a good time to steadily reduce debts.',
      'ஆறாம் இட கேது: தடைகளையும் எதிர்ப்புகளையும் சமாளிக்க உதவும் காலம்; கடன்களைப் படிப்படியாகக் குறைக்க நல்ல நேரம்.'],
    ['Ketu in the 7th: be patient and affectionate with your spouse; clear up misunderstandings with partners early.',
      'ஏழாம் இட கேது: வாழ்க்கைத் துணையிடம் பொறுமையும் அன்பும் காட்டுங்கள்; கூட்டாளிகளுடனான தவறான புரிதல்களை உடனே தீர்த்துக்கொள்ளுங்கள்.'],
    ['Ketu in the 8th: take care while travelling and with small health issues; interest in spiritual learning deepens.',
      'எட்டாம் இட கேது: பயணத்திலும் சிறு உடல் உபாதைகளிலும் கவனம் தேவை; ஆன்மிகத் தேடலில் ஆர்வம் ஆழமாகும்.'],
    ['Ketu in the 9th: visit temples and seek elders\' blessings; luck grows through charity and good deeds.',
      'ஒன்பதாம் இட கேது: கோவில்களுக்குச் சென்று பெரியோரின் ஆசி பெறுங்கள்; தர்மச் செயல்களால் அதிர்ஷ்டம் கூடும்.'],
    ['Ketu in the 10th: do your duty without waiting for praise; changes at work turn out well with patience.',
      'பத்தாம் இட கேது: பாராட்டை எதிர்பார்க்காமல் கடமையைச் செய்யுங்கள்; பணியிட மாற்றங்கள் பொறுமையால் நன்மையாக முடியும்.'],
    ['Ketu in the 11th supports gains and wishes, with help from friends.',
      'பதினொன்றாம் இட கேது: லாபத்திற்கும் ஆசைகளுக்கும் ஆதரவு; நண்பர்கள் உதவக்கூடும்.'],
    ['Ketu in the 12th: money goes to pilgrimages and good deeds; prayer brings deep inner peace.',
      'பன்னிரண்டாம் இட கேது: புனிதப் பயணம், நற்காரியங்களுக்குச் செலவு ஆகும்; வழிபாட்டால் ஆழ்ந்த மன அமைதி கிடைக்கும்.'],
  ],
};

const REMEDIES = {
  Jupiter: {
    good: ['On Thursdays, thank Dakshinamurthy with a ghee lamp and help a teacher or student.',
      'வியாழக்கிழமைகளில் தட்சிணாமூர்த்திக்கு நெய் தீபம் ஏற்றி நன்றி செலுத்துங்கள்; ஆசிரியர் அல்லது மாணவருக்கு உதவுங்கள்.'],
    other: ['On Thursdays, light a ghee lamp for Dakshinamurthy, offer yellow flowers and a chickpea (kondaikadalai) garland, and feed the needy.',
      'வியாழக்கிழமைகளில் தட்சிணாமூர்த்திக்கு நெய் தீபம் ஏற்றி, மஞ்சள் மலரும் கொண்டைக்கடலை மாலையும் சாற்றி வழிபடுங்கள்; ஏழைகளுக்கு உணவளியுங்கள்.'],
  },
  Saturn: {
    good: ['Light a sesame-oil (ellu) lamp on Saturdays and help elderly workers — the blessings keep flowing.',
      'சனிக்கிழமைகளில் எள் எண்ணெய் தீபம் ஏற்றுங்கள்; வயதான உழைப்பாளர்களுக்கு உதவுங்கள் — நன்மைகள் தொடரும்.'],
    mixed: ['A Saturday ellu deepam for Sani Bhagavan and Anjaneyar worship keep things smooth.',
      'சனிக்கிழமை சனி பகவானுக்கு எள் தீபமும் ஆஞ்சநேயர் வழிபாடும் காரியங்களைச் சீராக்கும்.'],
    care: ['Every Saturday light an ellu (sesame) deepam for Sani Bhagavan, worship Anjaneyar, feed crows, and if you can, visit Thirunallar Saneeswarar.',
      'ஒவ்வொரு சனிக்கிழமையும் சனி பகவானுக்கு எள் தீபம் ஏற்றுங்கள், ஆஞ்சநேயரை வழிபடுங்கள், காகத்திற்கு உணவு வையுங்கள்; இயன்றால் திருநள்ளாறு சனீஸ்வரரைத் தரிசியுங்கள்.'],
  },
  Rahu: {
    good: ['Pray to Durga during Rahu kalam on Sundays to keep the gains steady.',
      'ஞாயிற்றுக்கிழமை ராகு காலத்தில் துர்க்கை அம்மனை வழிபட்டால் நன்மைகள் நிலைக்கும்.'],
    other: ['Light a lemon lamp for Durga during Rahu kalam on Tuesdays, Fridays or Sundays and chant Durga stotram.',
      'செவ்வாய், வெள்ளி அல்லது ஞாயிறு ராகு காலத்தில் துர்க்கை அம்மனுக்கு எலுமிச்சை தீபம் ஏற்றி, துர்க்கை துதி பாடி வழிபடுங்கள்.'],
  },
  Ketu: {
    good: ['Offer arugampul (durva grass) to Vinayagar on Chathurthi days.',
      'சதுர்த்தி நாட்களில் விநாயகருக்கு அருகம்புல் சாற்றி வழிபடுங்கள்.'],
    other: ['Worship Vinayagar daily with an arugampul garland; Sankatahara Chathurthi fasting brings relief.',
      'தினமும் விநாயகரை அருகம்புல் மாலையுடன் வழிபடுங்கள்; சங்கடஹர சதுர்த்தி விரதம் நிவாரணம் தரும்.'],
  },
};

const SPECIAL = {
  Jupiter: { 1: ['Janma Guru', 'ஜென்ம குரு'] },
  Saturn: {
    12: ['Ezharai Sani · Viraya', 'ஏழரைச் சனி · விரயம்'], 1: ['Ezharai Sani · Janma', 'ஏழரைச் சனி · ஜென்மம்'], 2: ['Ezharai Sani · Paadha', 'ஏழரைச் சனி · பாதம்'],
    4: ['Ardhashtama Sani', 'அர்த்தாஷ்டமச் சனி'], 8: ['Ashtama Sani', 'அஷ்டமச் சனி'], 7: ['Kandaka Sani', 'கண்டகச் சனி'], 10: ['Karma Sani', 'கர்மச் சனி'],
  },
};
const pair = ([en, ta]) => ({ en, ta });

/** House of `transitRasi` counted from `moonRasi` (1..12). */
export const houseFrom = (moonRasi, transitRasi) => ((transitRasi - moonRasi + 12) % 12) + 1;

/** Classical gochara palan for one slow graha transiting `transitRasi`, for janma rasi `moonRasi`. */
export function peyarchiPalan(planet, transitRasi, moonRasi) {
  const house = houseFrom(moonRasi, transitRasi);
  const rule = RULES[planet];
  const level = LEVEL[rule.lv[house - 1]];
  const rem = REMEDIES[planet];
  const remedy = pair(rem[level] || (level === 'good' ? rem.good : rem.other));
  const sp = SPECIAL[planet]?.[house];
  return {
    planet, house, level, score: rule.sc[house - 1],
    text: pair(TEXTS[planet][house - 1]),
    remedy,
    special: sp ? pair(sp) : null,
  };
}

// ---------------------------------------------------------------- period palan
const AREA_WEIGHTS = {
  career: { Sun: 0.25, Saturn: 0.3, Jupiter: 0.2, Mars: 0.15, Rahu: 0.1 },
  money: { Jupiter: 0.4, Saturn: 0.2, Rahu: 0.15, Sun: 0.1, Mars: 0.1, Ketu: 0.05 },
  family: { Jupiter: 0.4, Saturn: 0.2, Ketu: 0.15, Mars: 0.15, Sun: 0.1 },
  health: { Saturn: 0.3, Mars: 0.2, Sun: 0.2, Rahu: 0.15, Ketu: 0.15 },
};
const OVERALL_WEIGHTS = { Jupiter: 0.3, Saturn: 0.3, Rahu: 0.1, Ketu: 0.1, Sun: 0.1, Mars: 0.1 };
const AREA_NOTES = {
  career: {
    good: ['Work goes well — a good time to ask for growth or start something new.', 'பணி சிறப்பாக நடக்கும் — முன்னேற்றம் கேட்கவும் புதியது தொடங்கவும் நல்ல நேரம்.'],
    mixed: ['Steady effort is needed; avoid sudden job changes.', 'தொடர் உழைப்பு தேவை; திடீர் வேலை மாற்றம் வேண்டாம்.'],
    care: ['Be patient at work; stay humble and keep good records.', 'பணியிடத்தில் பொறுமை தேவை; பணிவுடன் இருந்து பதிவுகளைச் சரியாக வைத்திருங்கள்.'],
  },
  money: {
    good: ['Income flows well — save a part for the future.', 'பணவரவு நன்றாக இருக்கும் — ஒரு பகுதியை எதிர்காலத்திற்குச் சேமியுங்கள்.'],
    mixed: ['Income is steady; plan your expenses.', 'வருமானம் சீராக இருக்கும்; செலவுகளைத் திட்டமிடுங்கள்.'],
    care: ['Avoid lending and big purchases; spend carefully.', 'கடன் கொடுப்பதையும் பெரிய கொள்முதலையும் தவிருங்கள்; கவனமாகச் செலவிடுங்கள்.'],
  },
  family: {
    good: ['Happiness at home — good for functions and family plans.', 'வீட்டில் மகிழ்ச்சி — விழாக்களுக்கும் குடும்பத் திட்டங்களுக்கும் உகந்தது.'],
    mixed: ['Small differences may come up; patient words keep harmony.', 'சிறு கருத்து வேறுபாடுகள் வரலாம்; பொறுமையான பேச்சு ஒற்றுமை காக்கும்.'],
    care: ['Give family your time and gentle words; avoid arguments.', 'குடும்பத்தினருக்கு நேரமும் இனிய சொற்களும் கொடுங்கள்; வாக்குவாதத்தைத் தவிருங்கள்.'],
  },
  health: {
    good: ['Energy is good — keep up your walk or exercise.', 'உடல் ஆற்றல் நன்றாக இருக்கும் — நடைப்பயிற்சியைத் தொடருங்கள்.'],
    mixed: ['Mind your rest and keep a regular routine.', 'ஓய்விலும் சீரான அன்றாட ஒழுங்கிலும் கவனம் செலுத்துங்கள்.'],
    care: ['Take extra care of health; do not skip rest or check-ups.', 'உடல்நலத்தில் கூடுதல் கவனம்; ஓய்வையும் பரிசோதனைகளையும் தவறவிடாதீர்கள்.'],
  },
};
const SUMMARY = {
  good: ['A favourable period overall — move ahead with confidence.', 'மொத்தத்தில் சாதகமான காலம் — நம்பிக்கையுடன் முன்னேறுங்கள்.'],
  mixed: ['A balanced period — steady effort brings steady results.', 'சமநிலையான காலம் — தொடர் முயற்சி நிலையான பலன் தரும்.'],
  care: ['A period to go slow and plan carefully — prayer and patience will see you through.', 'நிதானமாகத் திட்டமிட வேண்டிய காலம் — வழிபாடும் பொறுமையும் துணை நிற்கும்.'],
};
const levelOf = (score) => (score >= 63 ? 'good' : score >= 45 ? 'mixed' : 'care');
const clamp = (x) => Math.max(0, Math.min(100, Math.round(x)));

function marsSidereal(date) {
  return norm360(A.Ecliptic(A.GeoVector('Mars', A.MakeTime(date), true)).elon - lahiriAyanamsa(date));
}

/** Chandrashtamam windows (Moon in the 8th rasi from `moonRasi`) inside [from, to]. */
export function chandrashtamam(moonRasi, from, to, tz = 5.5) {
  const target = (moonRasi + 7) % 12;
  const isIn = (t) => rasiOf(moonSidereal(new Date(t))) === target;
  const refine = (lo, hi, wantIn) => {
    while (hi - lo > MINUTE) {
      const mid = (lo + hi) / 2;
      if (isIn(mid) === wantIn) hi = mid; else lo = mid;
    }
    return hi;
  };
  const step = 6 * 3600000;
  const t0 = from.getTime();
  const t1 = to.getTime();
  const out = [];
  let prevT = t0;
  let prevIn = isIn(t0);
  let start = prevIn ? t0 : null;
  for (let t = t0 + step; ; t += step) {
    const tt = Math.min(t, t1);
    const now = isIn(tt);
    if (now && !prevIn) start = refine(prevT, tt, true);
    if (!now && prevIn) { out.push([start, refine(prevT, tt, false)]); start = null; }
    prevT = tt; prevIn = now;
    if (tt >= t1) break;
  }
  if (start != null) out.push([start, t1]);
  const iso = (ms) => new Date(ms + tz * 3600000).toISOString().slice(0, 10);
  return out.map(([s, e]) => {
    const dates = [];
    for (let d = Date.parse(iso(s)); d <= Date.parse(iso(e)); d += DAY) dates.push(new Date(d).toISOString().slice(0, 10));
    return { start: new Date(s), end: new Date(e), dates };
  });
}

/**
 * Monthly / yearly Rasi Palan for one janma rasi.
 * `days` may be a number or 'month' (30) / 'year' (365). Month samples daily, year weekly.
 */
export function rasiPalanPeriod(moonRasi, from = new Date(), days = 'month', { tz = 5.5 } = {}) {
  const n = days === 'year' ? 365 : days === 'month' ? 30 : Number(days) || 30;
  const kind = n > 60 ? 'year' : 'month';
  const step = kind === 'year' ? 7 : 1;
  const start = new Date(from);
  const end = new Date(start.getTime() + n * DAY);
  const planets = ['Jupiter', 'Saturn', 'Rahu', 'Ketu', 'Sun', 'Mars'];
  const samples = [];
  const d0 = Math.floor(start.getTime() / DAY);
  for (let k = 0; k <= n; k += step) {
    const dn = d0 + k;
    const at = new Date(dn * DAY + DAY / 2);
    const lon = {
      Jupiter: dayLon('Jupiter', dn), Saturn: dayLon('Saturn', dn), Rahu: dayLon('Rahu', dn),
      Sun: sunSidereal(at), Mars: marsSidereal(at),
    };
    lon.Ketu = norm360(lon.Rahu + 180);
    const s = { at, rasi: {}, house: {}, score: {} };
    for (const p of planets) {
      const r = rasiOf(lon[p]);
      const h = houseFrom(moonRasi, r);
      s.rasi[p] = r; s.house[p] = h; s.score[p] = RULES[p].sc[h - 1];
    }
    samples.push(s);
  }
  const avg = (p) => samples.reduce((a, s) => a + s.score[p], 0) / samples.length;
  const mean = Object.fromEntries(planets.map((p) => [p, avg(p)]));
  const weighted = (w) => Object.entries(w).reduce((a, [p, x]) => a + mean[p] * x, 0) / Object.values(w).reduce((a, x) => a + x, 0);

  // Segments of each planet's sign over the period (with house & palan level).
  const transits = {};
  for (const p of planets) {
    const segs = [];
    for (const s of samples) {
      const last = segs[segs.length - 1];
      if (last && last.rasi === s.rasi[p]) { last.to = s.at; continue; }
      segs.push({ rasi: s.rasi[p], house: s.house[p], level: LEVEL[RULES[p].lv[s.house[p] - 1]], from: s.at, to: s.at });
    }
    segs[0].from = start;
    segs[segs.length - 1].to = end;
    transits[p] = segs;
  }
  const changes = {};
  for (const p of ['Jupiter', 'Saturn', 'Rahu', 'Ketu']) changes[p] = ingresses(p, start, end);

  const score = clamp(weighted(OVERALL_WEIGHTS));
  const level = levelOf(score);
  const areas = {};
  for (const [a, w] of Object.entries(AREA_WEIGHTS)) {
    const sc = clamp(weighted(w));
    const lv = levelOf(sc);
    areas[a] = { score: sc, level: lv, note: pair(AREA_NOTES[a][lv]) };
  }
  const cs = chandrashtamam(moonRasi, start, end, tz);
  const csDates = [...new Set(cs.flatMap((c) => c.dates))];

  // Best support / main caution among the slow grahas, by average score.
  const slow = ['Jupiter', 'Saturn', 'Rahu', 'Ketu'].sort((a, b) => mean[b] - mean[a]);
  const best = slow[0];
  const worst = slow[slow.length - 1];
  const nm = (p) => ({ en: p === 'Jupiter' ? 'Guru' : p === 'Saturn' ? 'Sani' : p, ta: PLANETS[p].ta });
  const summary = {
    en: `${SUMMARY[level][0]} ${mean[best] >= 63 ? `${nm(best).en} gives the strongest support.` : ''} ${mean[worst] < 45 ? `${nm(worst).en} asks for extra care.` : ''} Chandrashtamam: ${csDates.length} day(s).`.replace(/\s+/g, ' ').trim(),
    ta: `${SUMMARY[level][1]} ${mean[best] >= 63 ? `${nm(best).ta} பலமான ஆதரவு தருவார்.` : ''} ${mean[worst] < 45 ? `${nm(worst).ta} காரணமாகக் கூடுதல் கவனம் தேவை.` : ''} சந்திராஷ்டம நாட்கள்: ${csDates.length}.`.replace(/\s+/g, ' ').trim(),
  };

  // Year view: score per Gregorian month (local tz).
  let months = null;
  if (kind === 'year') {
    const byMonth = new Map();
    for (const s of samples) {
      const key = new Date(s.at.getTime() + tz * 3600000).toISOString().slice(0, 7);
      if (!byMonth.has(key)) byMonth.set(key, []);
      byMonth.get(key).push(Object.entries(OVERALL_WEIGHTS).reduce((a, [p, w]) => a + s.score[p] * w, 0));
    }
    months = [...byMonth].map(([month, arr]) => {
      const sc = clamp(arr.reduce((a, x) => a + x, 0) / arr.length);
      return { month, score: sc, level: levelOf(sc) };
    });
  }

  return {
    moonRasi, kind, from: start, to: end, days: n,
    score, level, summary, areas, transits, changes,
    sun: { house: transits.Sun[0].house, level: transits.Sun[0].level },
    mars: { house: transits.Mars[0].house, level: transits.Mars[0].level },
    chandrashtamam: cs, chandrashtamamDates: csDates, chandrashtamamDays: csDates.length,
    months,
  };
}

// ---------------------------------------------------------------- viratha naatkal
/** Vratham / festival groups for filter chips (only names tamilcal.js emits). */
export const VRATHAM_TYPES = [
  { id: 'amavasai', en: 'Amavasai', ta: 'அமாவாசை', icon: '🌑', match: ['Amavasai'] },
  { id: 'pournami', en: 'Pournami', ta: 'பௌர்ணமி', icon: '🌕', match: ['Pournami'] },
  { id: 'ekadasi', en: 'Ekadasi', ta: 'ஏகாதசி', icon: '🙏', match: ['Ekadasi'] },
  { id: 'pradosham', en: 'Pradosham', ta: 'பிரதோஷம்', icon: '🔱', match: ['Pradosham'] },
  { id: 'sashti', en: 'Sashti', ta: 'சஷ்டி', icon: '🦚', match: ['Sashti Viratham'] },
  { id: 'chathurthi', en: 'Sankatahara Chathurthi', ta: 'சங்கடஹர சதுர்த்தி', icon: '🐘', match: ['Sankatahara Chathurthi'] },
  { id: 'karthigai', en: 'Karthigai', ta: 'கார்த்திகை', icon: '🪔', match: ['Karthigai Viratham'] },
  { id: 'sivarathri', en: 'Sivarathri', ta: 'சிவராத்திரி', icon: '🕉️', match: ['Masa Sivarathri'] },
  { id: 'thiruvonam', en: 'Thiruvonam', ta: 'திருவோணம்', icon: '🐚', match: ['Thiruvonam Viratham'] },
  { id: 'festival', en: 'Festivals', ta: 'பண்டிகைகள்', icon: '🎉', match: [] },
];
const TYPE_OF = new Map(VRATHAM_TYPES.flatMap((t) => t.match.map((m) => [m, t.id])));
export const vrathamType = (f) => (f.kind === 'festival' ? 'festival' : TYPE_OF.get(f.en) || 'festival');

/** Vratham / festival entries of one Gregorian month. */
export function vrathamOfMonth(year, month0, lat, lon, tz) {
  const out = [];
  for (const d of tamilMonth(year, month0, lat, lon, tz)) {
    for (const f of d.festivals) out.push({ date: d.date, en: f.en, ta: f.ta, kind: f.kind, type: vrathamType(f), weekday: d.weekday.index });
  }
  return out;
}

const vrathamCache = new Map();
/** All vratham & festival days of a Gregorian year, sorted by date. */
export function vrathamDays(year, lat, lon, tz) {
  const key = `${year}|${lat}|${lon}|${tz}`;
  if (vrathamCache.has(key)) return vrathamCache.get(key);
  const out = [];
  for (let m = 0; m < 12; m++) out.push(...vrathamOfMonth(year, m, lat, lon, tz));
  out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  vrathamCache.set(key, out);
  return out;
}
