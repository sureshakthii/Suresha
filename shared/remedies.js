// Parigaram (remedies) and Graha Balam (planet strength).
// Philosophy: free and simple remedies first — prayer, lamp, charity, discipline.
import { RASIS, PLANETS } from './astro.js';

export const NAVAGRAHA = {
  Sun: {
    deity: { en: 'Lord Surya / Lord Shiva', ta: 'சூரிய பகவான் / சிவன்' }, day: 0, color: { en: 'Red / saffron', ta: 'சிவப்பு / காவி' },
    grain: { en: 'Wheat', ta: 'கோதுமை' }, gem: { en: 'Ruby', ta: 'மாணிக்கம்' },
    mantra: { en: 'Om Suryaya Namaha · Aditya Hrudayam', ta: 'ஓம் சூர்யாய நமஹ · ஆதித்ய ஹிருதயம்' },
    temple: { en: 'Suriyanar Kovil (near Kumbakonam)', ta: 'சூரியனார் கோவில் (கும்பகோணம் அருகே)' },
    free: { en: 'Offer water to the rising Sun (arghyam) and do Surya Namaskaram; respect your father and elders.', ta: 'உதய சூரியனுக்கு அர்க்யம் கொடுத்து சூரிய நமஸ்காரம் செய்யவும்; தந்தை, பெரியோரை மதிக்கவும்.' },
    charity: { en: 'Donate wheat or jaggery on Sunday.', ta: 'ஞாயிறு அன்று கோதுமை அல்லது வெல்லம் தானம் செய்யவும்.' },
    governs: { en: 'Health, confidence, government, father', ta: 'ஆரோக்கியம், தன்னம்பிக்கை, அரசு, தந்தை' },
  },
  Moon: {
    deity: { en: 'Goddess Parvathi / Ambal', ta: 'அம்பாள் / பார்வதி' }, day: 1, color: { en: 'White', ta: 'வெண்மை' },
    grain: { en: 'Raw rice', ta: 'பச்சரிசி' }, gem: { en: 'Pearl', ta: 'முத்து' },
    mantra: { en: 'Om Chandraya Namaha', ta: 'ஓம் சந்திராய நமஹ' },
    temple: { en: 'Thingalur Kailasanathar Temple', ta: 'திங்களூர் கைலாசநாதர் கோவில்' },
    free: { en: 'Keep the mind calm with meditation; offer milk to Shiva on Monday; care for your mother.', ta: 'தியானம் செய்து மனதை அமைதியாக வைக்கவும்; திங்கள் சிவனுக்கு பால் அபிஷேகம்; தாயைப் பேணவும்.' },
    charity: { en: 'Donate rice or milk on Monday.', ta: 'திங்கள் அன்று அரிசி அல்லது பால் தானம்.' },
    governs: { en: 'Mind, emotions, mother, sleep', ta: 'மனம், உணர்வு, தாய், உறக்கம்' },
  },
  Mars: {
    deity: { en: 'Lord Murugan', ta: 'முருகப் பெருமான்' }, day: 2, color: { en: 'Red', ta: 'சிவப்பு' },
    grain: { en: 'Toor dal (thuvarai)', ta: 'துவரை' }, gem: { en: 'Red coral', ta: 'பவளம்' },
    mantra: { en: 'Om Saravanabhava · Kanda Sashti Kavasam', ta: 'ஓம் சரவணபவ · கந்த சஷ்டி கவசம்' },
    temple: { en: 'Vaitheeswaran Kovil', ta: 'வைத்தீஸ்வரன் கோவில்' },
    free: { en: 'Recite Kanda Sashti Kavasam on Tuesday; control anger; help siblings.', ta: 'செவ்வாய் அன்று கந்த சஷ்டி கவசம் பாராயணம்; கோபத்தைக் கட்டுப்படுத்தவும்; உடன்பிறந்தோருக்கு உதவவும்.' },
    charity: { en: 'Donate toor dal or red cloth on Tuesday.', ta: 'செவ்வாய் அன்று துவரை அல்லது சிவப்பு துணி தானம்.' },
    governs: { en: 'Courage, land, siblings, blood', ta: 'தைரியம், நிலம், உடன்பிறப்பு, ரத்தம்' },
  },
  Mercury: {
    deity: { en: 'Lord Vishnu / Perumal', ta: 'பெருமாள் / விஷ்ணு' }, day: 3, color: { en: 'Green', ta: 'பச்சை' },
    grain: { en: 'Green gram (pachai payaru)', ta: 'பச்சைப் பயறு' }, gem: { en: 'Emerald', ta: 'மரகதம்' },
    mantra: { en: 'Om Budhaya Namaha · Vishnu Sahasranamam', ta: 'ஓம் புதாய நமஹ · விஷ்ணு சகஸ்ரநாமம்' },
    temple: { en: 'Thiruvenkadu Swetharanyeswarar Temple', ta: 'திருவெண்காடு ஸ்வேதாரண்யேஸ்வரர் கோவில்' },
    free: { en: 'Read or chant Vishnu Sahasranamam on Wednesday; learn something new; speak truthfully.', ta: 'புதன் அன்று விஷ்ணு சகஸ்ரநாமம்; புதிதாக ஏதேனும் கற்கவும்; உண்மையே பேசவும்.' },
    charity: { en: 'Donate green gram or books to students.', ta: 'பச்சைப் பயறு அல்லது மாணவர்களுக்கு புத்தகம் தானம்.' },
    governs: { en: 'Intelligence, business, speech, education', ta: 'அறிவு, வியாபாரம், பேச்சு, கல்வி' },
  },
  Jupiter: {
    deity: { en: 'Lord Dakshinamurthy', ta: 'தட்சிணாமூர்த்தி' }, day: 4, color: { en: 'Yellow', ta: 'மஞ்சள்' },
    grain: { en: 'Chickpea (kondai kadalai)', ta: 'கொண்டைக் கடலை' }, gem: { en: 'Yellow sapphire', ta: 'புஷ்பராகம்' },
    mantra: { en: 'Om Guruve Namaha', ta: 'ஓம் குருவே நமஹ' },
    temple: { en: 'Alangudi Abathsahayeswarar Temple', ta: 'ஆலங்குடி ஆபத்சகாயேஸ்வரர் கோவில்' },
    free: { en: 'Light a ghee lamp for Dakshinamurthy on Thursday; respect teachers; share knowledge.', ta: 'வியாழன் தட்சிணாமூர்த்திக்கு நெய் தீபம்; ஆசிரியர்களை மதிக்கவும்; அறிவைப் பகிரவும்.' },
    charity: { en: 'Donate chickpeas or yellow cloth on Thursday.', ta: 'வியாழன் அன்று கொண்டைக் கடலை அல்லது மஞ்சள் துணி தானம்.' },
    governs: { en: 'Wisdom, children, wealth, marriage (for women)', ta: 'ஞானம், குழந்தைகள், செல்வம், திருமணம்' },
  },
  Venus: {
    deity: { en: 'Goddess Mahalakshmi', ta: 'மகாலட்சுமி' }, day: 5, color: { en: 'White / pastel', ta: 'வெள்ளை / இளநிறம்' },
    grain: { en: 'Field beans (mochai)', ta: 'மொச்சை' }, gem: { en: 'Diamond', ta: 'வைரம்' },
    mantra: { en: 'Om Mahalakshmyai Namaha', ta: 'ஓம் மகாலட்சுமியை நமஹ' },
    temple: { en: 'Kanjanur Agneeswarar Temple', ta: 'கஞ்சனூர் அக்னீஸ்வரர் கோவில்' },
    free: { en: 'Light a lamp for Mahalakshmi on Friday evening; keep home clean and fragrant; respect women.', ta: 'வெள்ளி மாலை மகாலட்சுமிக்கு விளக்கேற்றவும்; வீட்டை சுத்தமாக வைக்கவும்; பெண்களை மதிக்கவும்.' },
    charity: { en: 'Donate white sweets or clothes on Friday.', ta: 'வெள்ளி அன்று இனிப்பு அல்லது வெண்ணிற ஆடை தானம்.' },
    governs: { en: 'Marriage, comforts, vehicles, arts', ta: 'திருமணம், சுகம், வாகனம், கலை' },
  },
  Saturn: {
    deity: { en: 'Lord Saneeswarar / Lord Anjaneya', ta: 'சனீஸ்வரர் / ஆஞ்சநேயர்' }, day: 6, color: { en: 'Black / dark blue', ta: 'கருப்பு / கருநீலம்' },
    grain: { en: 'Black sesame (ellu)', ta: 'எள்' }, gem: { en: 'Blue sapphire', ta: 'நீலம்' },
    mantra: { en: 'Om Shanaischaraya Namaha · Hanuman Chalisa', ta: 'ஓம் சனைச்சராய நமஹ · அனுமன் சாலீசா' },
    temple: { en: 'Thirunallar Dharbaranyeswarar Temple', ta: 'திருநள்ளாறு தர்பாரண்யேஸ்வரர் கோவில்' },
    free: { en: 'Light a sesame-oil (nallennai) lamp on Saturday; feed crows; serve the elderly and workers.', ta: 'சனி அன்று நல்லெண்ணெய் தீபம்; காகத்திற்கு அன்னமிடவும்; முதியோர், உழைப்பாளர்களுக்கு உதவவும்.' },
    charity: { en: 'Donate black sesame, oil or food on Saturday.', ta: 'சனி அன்று எள், எண்ணெய் அல்லது அன்னதானம்.' },
    governs: { en: 'Career, discipline, longevity, hard work', ta: 'தொழில், ஒழுக்கம், ஆயுள், உழைப்பு' },
  },
  Rahu: {
    deity: { en: 'Goddess Durga', ta: 'துர்கை அம்மன்' }, day: null, color: { en: 'Smoky / dark', ta: 'புகை நிறம்' },
    grain: { en: 'Black gram (ulundhu)', ta: 'உளுந்து' }, gem: { en: 'Hessonite (Gomedhagam)', ta: 'கோமேதகம்' },
    mantra: { en: 'Om Rahave Namaha', ta: 'ஓம் ராகவே நமஹ' },
    temple: { en: 'Thirunageswaram Naganathar Temple', ta: 'திருநாகேஸ்வரம் நாகநாதர் கோவில்' },
    free: { en: 'Light a lamp for Durga during Rahu Kalam on Tuesday or Friday; avoid shortcuts and addictions.', ta: 'செவ்வாய்/வெள்ளி ராகு காலத்தில் துர்கைக்கு விளக்கேற்றவும்; குறுக்கு வழிகள், போதைகளைத் தவிர்க்கவும்.' },
    charity: { en: 'Donate black gram.', ta: 'உளுந்து தானம்.' },
    governs: { en: 'Ambition, foreign lands, sudden events', ta: 'ஆசை, வெளிநாடு, திடீர் நிகழ்வுகள்' },
  },
  Ketu: {
    deity: { en: 'Lord Vinayagar', ta: 'விநாயகர்' }, day: null, color: { en: 'Multi-colour', ta: 'பல வண்ணம்' },
    grain: { en: 'Horse gram (kollu)', ta: 'கொள்ளு' }, gem: { en: "Cat's eye (Vaiduryam)", ta: 'வைடூரியம்' },
    mantra: { en: 'Om Ketave Namaha · Vinayagar Agaval', ta: 'ஓம் கேதவே நமஹ · விநாயகர் அகவல்' },
    temple: { en: 'Keezhaperumpallam Naganathar Temple', ta: 'கீழப்பெரும்பள்ளம் நாகநாதர் கோவில்' },
    free: { en: 'Pray to Vinayagar before any work; practise meditation and spiritual reading.', ta: 'எந்த வேலைக்கும் முன் விநாயகரை வணங்கவும்; தியானம், ஆன்மீக வாசிப்பு.' },
    charity: { en: 'Donate horse gram or feed dogs.', ta: 'கொள்ளு தானம் அல்லது நாய்களுக்கு உணவு.' },
    governs: { en: 'Spirituality, detachment, moksha', ta: 'ஆன்மீகம், பற்றின்மை, மோட்சம்' },
  },
};

const EXALT = { Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6 };
const OWN = { Sun: [4], Moon: [3], Mars: [0, 7], Mercury: [2, 5], Jupiter: [8, 11], Venus: [1, 6], Saturn: [9, 10] };
const COMBUST = { Moon: 12, Mars: 17, Mercury: 14, Jupiter: 11, Venus: 10, Saturn: 15 };
const FRIEND_SIGNS = {
  Sun: ['Moon', 'Mars', 'Jupiter'], Moon: ['Sun', 'Mercury'], Mars: ['Sun', 'Moon', 'Jupiter'], Mercury: ['Sun', 'Venus'],
  Jupiter: ['Sun', 'Moon', 'Mars'], Venus: ['Mercury', 'Saturn'], Saturn: ['Mercury', 'Venus'],
};
const ENEMY_SIGNS = {
  Sun: ['Venus', 'Saturn'], Moon: [], Mars: ['Mercury'], Mercury: ['Moon'], Jupiter: ['Mercury', 'Venus'], Venus: ['Sun', 'Moon'], Saturn: ['Sun', 'Moon', 'Mars'],
};

/** Graha Balam: a simple, explainable strength score (0–100) for each planet in a birth chart. */
export function grahaStrength(planets) {
  const out = [];
  const lagna = planets.Lagna?.rasi;
  for (const k of ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu']) {
    const p = planets[k];
    let score = 55;
    const reasons = [];
    const r = (pts, en, ta) => { score += pts; reasons.push({ pts, en, ta }); };
    if (k in EXALT) {
      const lordOfSign = RASIS[p.rasi].lord;
      if (p.rasi === EXALT[k]) r(30, 'Exalted (Uchcham)', 'உச்சம்');
      else if (p.rasi === (EXALT[k] + 6) % 12) r(-30, 'Debilitated (Neecham)', 'நீசம்');
      else if (OWN[k].includes(p.rasi)) r(20, 'In own sign (Aatchi)', 'ஆட்சி');
      else if (FRIEND_SIGNS[k].includes(lordOfSign)) r(8, `In a friend's sign (${lordOfSign})`, 'நட்பு வீடு');
      else if (ENEMY_SIGNS[k].includes(lordOfSign)) r(-12, `In an enemy's sign (${lordOfSign})`, 'பகை வீடு');
      if (k in COMBUST) {
        const d = Math.abs(((p.longitude - planets.Sun.longitude + 540) % 360) - 180);
        if (d < COMBUST[k]) r(-18, `Combust — too close to the Sun (${d.toFixed(1)}°)`, 'அஸ்தங்கம்');
      }
      if (p.retrograde && k !== 'Sun' && k !== 'Moon') r(6, 'Retrograde (Vakram) — gives strong but delayed results', 'வக்கிரம்');
    }
    if (k === 'Moon') {
      const phase = ((planets.Moon.longitude - planets.Sun.longitude) + 360) % 360;
      if (phase < 60 || phase > 300) r(-15, 'Weak Moon — close to Amavasai', 'பலம் குறைந்த சந்திரன்');
      else if (phase > 150 && phase < 210) r(12, 'Strong Moon — near Pournami', 'பௌர்ணமி சந்திரன்');
    }
    if (lagna != null) {
      const house = ((p.rasi - lagna + 12) % 12) + 1;
      if ([6, 8, 12].includes(house) && !['Rahu', 'Ketu'].includes(k)) r(-10, `In the ${house}th house (dusthana)`, `${house}-ம் வீடு (மறைவு ஸ்தானம்)`);
      if ([1, 4, 7, 10].includes(house)) r(8, `In a kendra (${house}th house)`, `கேந்திரம் (${house})`);
      if ([5, 9].includes(house)) r(8, `In a trikona (${house}th house)`, `திரிகோணம் (${house})`);
      if (['Rahu', 'Ketu'].includes(k) && [3, 6, 11].includes(house)) r(12, `Well placed in the ${house}th house`, `${house}-ம் வீட்டில் நன்று`);
      if (['Rahu', 'Ketu'].includes(k) && [1, 7, 8, 12].includes(house)) r(-10, `In the ${house}th house`, `${house}-ம் வீடு`);
    }
    score = Math.max(0, Math.min(100, score));
    out.push({ planet: k, ta: PLANETS[k].ta, score, level: score >= 65 ? 'strong' : score >= 45 ? 'average' : 'weak', reasons });
  }
  return out;
}

/** Today's personal parigaram: weekday lord + weakest planets + running dasa lord + moon-based cautions. */
export function dailyParigaram({ weekday, chart, snapshot }) {
  const items = [];
  const dayLord = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'][weekday];
  items.push({ reason: { en: `Today is ruled by ${dayLord}`, ta: `இன்று ${PLANETS[dayLord].ta} கிழமை` }, planet: dayLord, ...NAVAGRAHA[dayLord] });
  if (chart) {
    const weak = grahaStrength(chart.planets).filter((g) => g.level === 'weak').sort((a, b) => a.score - b.score);
    for (const w of weak.slice(0, 2)) {
      if (w.planet === dayLord) continue;
      items.push({ reason: { en: `${w.planet} is weak in your chart`, ta: `உங்கள் ஜாதகத்தில் ${w.ta} பலவீனம்` }, planet: w.planet, ...NAVAGRAHA[w.planet] });
    }
    const dasa = chart.dasa?.current?.lord;
    if (dasa && !items.some((i) => i.planet === dasa)) {
      items.push({ reason: { en: `You are running ${dasa} Dasa`, ta: `${PLANETS[dasa].ta} தசை நடக்கிறது` }, planet: dasa, ...NAVAGRAHA[dasa] });
    }
    if (snapshot) {
      const pos = ((snapshot.moonRasi.index - chart.janmaRasi.index + 12) % 12) + 1;
      if (pos === 8) items.unshift({ reason: { en: 'Chandrashtamam today — be patient, avoid arguments and big decisions', ta: 'இன்று சந்திராஷ்டமம் — பொறுமை காக்கவும், பெரிய முடிவுகளைத் தவிர்க்கவும்' }, planet: 'Moon', ...NAVAGRAHA.Moon });
    }
  }
  return items;
}
