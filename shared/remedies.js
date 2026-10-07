// Parigaram (remedies) and Graha Balam (planet strength).
// Philosophy: free and simple remedies first — prayer, lamp, charity, discipline.
import { RASIS, PLANETS } from './astro.js';
import { isHinduFaith, universalPractice, CHILD_PRACTICE, TRADITIONAL_OPTIONAL } from './faith.js';
import { adultText } from './age-guard.js';
import { WEEKDAYS_TA, WEEKDAYS_EN, planetAdjTa } from './fmt.js';
const ordEn = (n) => `${n}${n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th'}`;

export const NAVAGRAHA = {
  Sun: {
    deity: { en: 'Lord Surya / Lord Shiva', ta: 'சூரிய பகவான் / சிவன்' }, day: 0, color: { en: 'Red / saffron', ta: 'சிவப்பு / காவி' },
    grain: { en: 'Wheat', ta: 'கோதுமை' }, gem: { en: 'Ruby', ta: 'மாணிக்கம்' },
    mantra: { en: 'Om Suryaya Namaha · Aditya Hrudayam', ta: 'ஓம் சூர்யாய நமஹ · ஆதித்ய ஹிருதயம்' }, hymn: 'aditya-hrudayam', // full text: shared/hymns.js
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
    free: { en: 'Keep the mind calm with meditation; offer milk to Shiva on Monday; care for your mother.', ta: 'தியானம் செய்து மனதை அமைதியாக வைக்கவும்; திங்கள் சிவனுக்குப் பால் அபிஷேகம்; தாயைப் பேணவும்.' },
    charity: { en: 'Donate rice or milk on Monday.', ta: 'திங்கள் அன்று அரிசி அல்லது பால் தானம்.' },
    governs: { en: 'Mind, emotions, mother, sleep', ta: 'மனம், உணர்வு, தாய், உறக்கம்' },
  },
  Mars: {
    deity: { en: 'Lord Murugan', ta: 'முருகப் பெருமான்' }, day: 2, color: { en: 'Red', ta: 'சிவப்பு' },
    grain: { en: 'Toor dal (thuvarai)', ta: 'துவரை' }, gem: { en: 'Red coral', ta: 'பவளம்' },
    mantra: { en: 'Om Saravanabhava · Kanda Sashti Kavasam', ta: 'ஓம் சரவணபவ · கந்த சஷ்டி கவசம்' }, hymn: 'kanda-sashti-kavasam', // full text: shared/hymns.js
    temple: { en: 'Vaitheeswaran Kovil', ta: 'வைத்தீஸ்வரன் கோவில்' },
    free: { en: 'Recite Kanda Sashti Kavasam on Tuesday; control anger; help siblings.', ta: 'செவ்வாய் அன்று கந்த சஷ்டி கவசம் பாராயணம்; கோபத்தைக் கட்டுப்படுத்தவும்; உடன்பிறந்தோருக்கு உதவவும்.' },
    charity: { en: 'Donate toor dal or red cloth on Tuesday.', ta: 'செவ்வாய் அன்று துவரை அல்லது சிவப்பு துணி தானம்.' },
    governs: { en: 'Courage, land, siblings, blood', ta: 'தைரியம், நிலம், உடன்பிறப்பு, ரத்தம்' },
  },
  Mercury: {
    deity: { en: 'Lord Vishnu / Perumal', ta: 'பெருமாள் / விஷ்ணு' }, day: 3, color: { en: 'Green', ta: 'பச்சை' },
    grain: { en: 'Green gram (pachai payaru)', ta: 'பச்சைப் பயறு' }, gem: { en: 'Emerald', ta: 'மரகதம்' },
    mantra: { en: 'Om Budhaya Namaha · Vishnu Sahasranamam', ta: 'ஓம் புதாய நமஹ · விஷ்ணு சகஸ்ரநாமம்' }, hymn: 'vishnu-sahasranamam', // full text: shared/hymns.js
    temple: { en: 'Thiruvenkadu Swetharanyeswarar Temple', ta: 'திருவெண்காடு ஸ்வேதாரண்யேஸ்வரர் கோவில்' },
    free: { en: 'Read or chant Vishnu Sahasranamam on Wednesday; learn something new; speak truthfully.', ta: 'புதன் அன்று விஷ்ணு சகஸ்ரநாமம்; புதிதாக ஏதேனும் கற்கவும்; உண்மையே பேசவும்.' },
    charity: { en: 'Donate green gram or books to students.', ta: 'பச்சைப் பயறு அல்லது மாணவர்களுக்குப் புத்தகம் தானம்.' },
    governs: { en: 'Intelligence, business, speech, education', ta: 'அறிவு, வியாபாரம், பேச்சு, கல்வி' },
  },
  Jupiter: {
    deity: { en: 'Lord Dakshinamurthy', ta: 'தட்சிணாமூர்த்தி' }, day: 4, color: { en: 'Yellow', ta: 'மஞ்சள்' },
    grain: { en: 'Chickpea (kondai kadalai)', ta: 'கொண்டைக் கடலை' }, gem: { en: 'Yellow sapphire', ta: 'புஷ்பராகம்' },
    mantra: { en: 'Om Guruve Namaha', ta: 'ஓம் குருவே நமஹ' },
    temple: { en: 'Alangudi Abathsahayeswarar Temple', ta: 'ஆலங்குடி ஆபத்சகாயேஸ்வரர் கோவில்' },
    free: { en: 'Light a ghee lamp for Dakshinamurthy on Thursday; respect teachers; share knowledge.', ta: 'வியாழன் தட்சிணாமூர்த்திக்கு நெய் தீபம்; ஆசிரியர்களை மதிக்கவும்; அறிவைப் பகிரவும்.' },
    charity: { en: 'Donate chickpeas or yellow cloth on Thursday.', ta: 'வியாழன் அன்று கொண்டைக் கடலை அல்லது மஞ்சள் துணி தானம்.' },
    governs: { en: 'Wisdom, children, wealth, marriage', ta: 'ஞானம், குழந்தைகள், செல்வம், திருமணம்' },
  },
  Venus: {
    deity: { en: 'Goddess Mahalakshmi', ta: 'மகாலட்சுமி' }, day: 5, color: { en: 'White / pastel', ta: 'வெள்ளை / இளநிறம்' },
    grain: { en: 'Field beans (mochai)', ta: 'மொச்சை' }, gem: { en: 'Diamond', ta: 'வைரம்' },
    mantra: { en: 'Om Shri Mahalakshmiyai Namaha', ta: 'ஓம் ஸ்ரீ மகாலட்சுமியை நமஹ' },
    temple: { en: 'Kanjanur Agneeswarar Temple', ta: 'கஞ்சனூர் அக்னீஸ்வரர் கோவில்' },
    free: { en: 'Light a lamp for Mahalakshmi on Friday evening; keep home clean and fragrant; respect women.', ta: 'வெள்ளி மாலை மகாலட்சுமிக்கு விளக்கேற்றவும்; வீட்டைச் சுத்தமாக வைக்கவும்; பெண்களை மதிக்கவும்.' },
    charity: { en: 'Donate white sweets or clothes on Friday.', ta: 'வெள்ளி அன்று இனிப்பு அல்லது வெண்ணிற ஆடை தானம்.' },
    governs: { en: 'Marriage, comforts, vehicles, arts', ta: 'திருமணம், சுகம், வாகனம், கலை' },
  },
  Saturn: {
    deity: { en: 'Lord Saneeswarar / Lord Anjaneya', ta: 'சனீஸ்வரர் / ஆஞ்சநேயர்' }, day: 6, color: { en: 'Black / dark blue', ta: 'கருப்பு / கருநீலம்' },
    grain: { en: 'Black sesame (ellu)', ta: 'எள்' }, gem: { en: 'Blue sapphire', ta: 'நீலம்' },
    mantra: { en: 'Om Shanaischaraya Namaha · Hanuman Chalisa', ta: 'ஓம் சனைச்சராய நமஹ · அனுமன் சாலீசா' }, hymn: 'hanuman-chalisa', // full text: shared/hymns.js
    temple: { en: 'Thirunallar Dharbaranyeswarar Temple', ta: 'திருநள்ளாறு தர்பாரண்யேஸ்வரர் கோவில்' },
    free: { en: 'Light a sesame-oil (nallennai) lamp on Saturday; feed crows; serve the elderly and workers.', ta: 'சனி அன்று நல்லெண்ணெய் தீபம்; காகத்திற்கு அன்னமிடவும்; முதியோர், உழைப்பாளர்களுக்கு உதவவும்.' },
    charity: { en: 'Donate black sesame, oil or food on Saturday.', ta: 'சனி அன்று எள், எண்ணெய் அல்லது அன்னதானம்.' },
    governs: { en: 'Career, discipline, patience, hard work', ta: 'தொழில், ஒழுக்கம், பொறுமை, உழைப்பு' },
  },
  Rahu: {
    deity: { en: 'Goddess Durga', ta: 'துர்க்கை அம்மன்' }, day: null, color: { en: 'Smoky / dark', ta: 'புகை நிறம்' },
    grain: { en: 'Black gram (ulundhu)', ta: 'உளுந்து' }, gem: { en: 'Hessonite (Gomedhagam)', ta: 'கோமேதகம்' },
    mantra: { en: 'Om Rahave Namaha', ta: 'ஓம் ராகவே நமஹ' },
    temple: { en: 'Thirunageswaram Naganathar Temple', ta: 'திருநாகேஸ்வரம் நாகநாதர் கோவில்' },
    free: { en: 'Light a lamp for Durga during Rahu Kalam on Tuesday or Friday; avoid shortcuts and addictions.', ta: 'செவ்வாய்/வெள்ளி ராகு காலத்தில் துர்க்கைக்கு விளக்கேற்றவும்; குறுக்கு வழிகள், போதைகளைத் தவிர்க்கவும்.' },
    charity: { en: 'Donate black gram.', ta: 'உளுந்து தானம்.' },
    governs: { en: 'Ambition, foreign lands, sudden events', ta: 'ஆசை, வெளிநாடு, திடீர் நிகழ்வுகள்' },
  },
  Ketu: {
    deity: { en: 'Lord Vinayagar', ta: 'விநாயகர்' }, day: null, color: { en: 'Multi-colour', ta: 'பல வண்ணம்' },
    grain: { en: 'Horse gram (kollu)', ta: 'கொள்ளு' }, gem: { en: "Cat's eye (Vaiduryam)", ta: 'வைடூரியம்' },
    mantra: { en: 'Om Ketave Namaha · Vinayagar Agaval', ta: 'ஓம் கேதவே நமஹ · விநாயகர் அகவல்' }, hymn: 'vinayagar-agaval', // full text: shared/hymns.js
    temple: { en: 'Keezhaperumpallam Naganathar Temple', ta: 'கீழப்பெரும்பள்ளம் நாகநாதர் கோவில்' },
    free: { en: 'Pray to Vinayagar before any work; practise meditation and spiritual reading.', ta: 'எந்த வேலைக்கும் முன் விநாயகரை வணங்கவும்; தியானம், ஆன்மீக வாசிப்பு.' },
    charity: { en: 'Donate horse gram or feed dogs.', ta: 'கொள்ளு தானம் அல்லது நாய்களுக்கு உணவு.' },
    governs: { en: 'Spirituality, detachment, moksha', ta: 'ஆன்மீகம், பற்றின்மை, மோட்சம்' },
  },
};

/**
 * ONE primary deity and mantra per planet, used by every surface (Today's Dasa deity and closing prayer, My Guide,
 * the mantra playlist, parigaram). It is the first mantra of the Navagraha entry above. Other well-loved forms are
 * kept as `also` ("also traditional") so a family's own practice is still recognised.
 */
export const PRIMARY = Object.freeze({
  Sun: { deity: { en: 'Lord Surya', ta: 'சூரிய பகவான்' }, mantra: { en: 'Om Suryaya Namaha', ta: 'ஓம் சூர்யாய நமஹ' }, potri: { en: 'Surya Bhagavane Potri', ta: 'சூரிய பகவானே போற்றி' }, also: { en: 'Lord Shiva — Om Namah Shivaya; Aditya Hrudayam', ta: 'சிவபெருமான் — ஓம் நமசிவாய; ஆதித்ய ஹிருதயம்' } },
  Moon: { deity: { en: 'Goddess Ambal (Parvathi)', ta: 'அம்பாள் (பார்வதி)' }, mantra: { en: 'Om Chandraya Namaha', ta: 'ஓம் சந்திராய நமஹ' }, potri: { en: 'Ambal Thaye Potri', ta: 'அம்பாள் தாயே போற்றி' }, also: { en: 'Om Sakthiye Potri', ta: 'ஓம் சக்தியே போற்றி' } },
  Mars: { deity: { en: 'Lord Murugan', ta: 'முருகப் பெருமான்' }, mantra: { en: 'Om Saravanabhava', ta: 'ஓம் சரவணபவ' }, potri: { en: 'Muruga Potri', ta: 'முருகா போற்றி' }, also: { en: 'Kanda Sashti Kavasam', ta: 'கந்த சஷ்டி கவசம்' } },
  Mercury: { deity: { en: 'Lord Perumal (Vishnu)', ta: 'பெருமாள் (விஷ்ணு)' }, mantra: { en: 'Om Budhaya Namaha', ta: 'ஓம் புதாய நமஹ' }, potri: { en: 'Perumale Potri', ta: 'பெருமாளே போற்றி' }, also: { en: 'Om Namo Narayanaya; Vishnu Sahasranamam', ta: 'ஓம் நமோ நாராயணாய; விஷ்ணு சகஸ்ரநாமம்' } },
  Jupiter: { deity: { en: 'Lord Dakshinamurthy', ta: 'தட்சிணாமூர்த்தி' }, mantra: { en: 'Om Guruve Namaha', ta: 'ஓம் குருவே நமஹ' }, potri: { en: 'Dakshinamurthiye Potri', ta: 'தட்சிணாமூர்த்தியே போற்றி' }, also: null },
  Venus: { deity: { en: 'Goddess Mahalakshmi', ta: 'மகாலட்சுமி' }, mantra: { en: 'Om Shri Mahalakshmiyai Namaha', ta: 'ஓம் ஸ்ரீ மகாலட்சுமியை நமஹ' }, potri: { en: 'Thaye Potri', ta: 'தாயே போற்றி' }, also: null },
  Saturn: { deity: { en: 'Lord Saneeswarar', ta: 'சனீஸ்வரர்' }, mantra: { en: 'Om Shanaischaraya Namaha', ta: 'ஓம் சனைச்சராய நமஹ' }, potri: { en: 'Saneeswara Potri', ta: 'சனீஸ்வரா போற்றி' }, also: { en: 'Lord Venkatachalapathi — Om Namo Venkatesaya; Sri Anjaneyar — Sri Rama Jaya Rama Jaya Jaya Rama', ta: 'வெங்கடாசலபதி — ஓம் நமோ வெங்கடேசாய; ஸ்ரீ ஆஞ்சநேயர் — ஸ்ரீ ராம ஜெய ராம ஜெய ஜெய ராம' } },
  Rahu: { deity: { en: 'Goddess Durga', ta: 'துர்க்கை அம்மன்' }, mantra: { en: 'Om Rahave Namaha', ta: 'ஓம் ராகவே நமஹ' }, potri: { en: 'Durga Thaye Potri', ta: 'துர்க்கை தாயே போற்றி' }, also: { en: 'Om Durgayai Namaha', ta: 'ஓம் துர்காயை நமஹ' } },
  Ketu: { deity: { en: 'Lord Vinayagar', ta: 'விநாயகர்' }, mantra: { en: 'Om Ketave Namaha', ta: 'ஓம் கேதவே நமஹ' }, potri: { en: 'Vinayaga Potri', ta: 'விநாயகா போற்றி' }, also: { en: 'Om Gam Ganapataye Namaha', ta: 'ஓம் கம் கணபதயே நமஹ' } },
});
/** Only the chantable mantra of a Navagraha entry (no hymn title after "·") — what the 🔊 button speaks. */
export const mantraOnly = (m) => String(m?.ta ?? m ?? '').split(' · ')[0].trim();

const EXALT = { Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6 };
const OWN = { Sun: [4], Moon: [3], Mars: [0, 7], Mercury: [2, 5], Jupiter: [8, 11], Venus: [1, 6], Saturn: [9, 10] };
/**
 * Combustion (Asta / அஸ்தங்கம்) orbs: angular distance from the Sun, in degrees, below which a planet is
 * combust (Surya Siddhanta / BPHS values; Mercury and Venus use smaller orbs when retrograde).
 * The Moon is listed for reference but NOT scored as combust: its nearness to the Sun is already scored
 * once by the waxing/waning (phase) rule, so counting both would double-penalise the same fact.
 */
export const COMBUSTION_ORBS = Object.freeze({
  Moon: { direct: 12, retrograde: 12, scored: false },
  Mars: { direct: 17, retrograde: 17, scored: true },
  Mercury: { direct: 14, retrograde: 12, scored: true },
  Jupiter: { direct: 11, retrograde: 11, scored: true },
  Venus: { direct: 10, retrograde: 8, scored: true },
  Saturn: { direct: 15, retrograde: 15, scored: true },
});

/** Name and caveat shown with every strength score (Brief §2 "Strength"). */
export const STRENGTH_INDEX = Object.freeze({
  indexName: { en: 'Traditional strength index', ta: 'பாரம்பரிய பல குறியீடு' },
  note: {
    en: 'A custom 0–100 heuristic built from dignity, combustion, retrogression, Moon phase and house placement. It is not Shadbala and not a probability of any event.',
    ta: 'கண்ணியம், அஸ்தங்கம், வக்கிரம், சந்திர கலை, பாவ நிலை ஆகியவற்றிலிருந்து கணிக்கப்படும் 0–100 தனிப்பட்ட மதிப்பீடு. இது ஷட்பலம் அல்ல; எந்த நிகழ்வின் சாத்தியக்கூறும் அல்ல.',
  },
});
const FRIEND_SIGNS = {
  Sun: ['Moon', 'Mars', 'Jupiter'], Moon: ['Sun', 'Mercury'], Mars: ['Sun', 'Moon', 'Jupiter'], Mercury: ['Sun', 'Venus'],
  Jupiter: ['Sun', 'Moon', 'Mars'], Venus: ['Mercury', 'Saturn'], Saturn: ['Mercury', 'Venus'],
};
const ENEMY_SIGNS = {
  Sun: ['Venus', 'Saturn'], Moon: [], Mars: ['Mercury'], Mercury: ['Moon'], Jupiter: ['Mercury', 'Venus'], Venus: ['Sun', 'Moon'], Saturn: ['Sun', 'Moon', 'Mars'],
};

/**
 * Graha Balam — "Traditional strength index": a simple, explainable 0–100 score for each planet.
 * Custom heuristic, NOT Shadbala and NOT a probability. Each fact is counted once:
 *  • dignity: exactly one of exalted / debilitated / own / friend / enemy (first match wins);
 *  • combustion: COMBUSTION_ORBS (Moon excluded — covered by the phase rule);
 *  • Moon phase (waxing/waning) only for the Moon;
 *  • house: grahas get one of dusthana / kendra / trikona (disjoint sets); Rahu/Ketu use only their own
 *    3-6-11 / 1-7-8-12 rule (no generic kendra bonus on top).
 * Each row carries `indexName` and `note` for display.
 */
export function grahaStrength(planets) {
  const out = [];
  const lagna = planets.Lagna?.rasi;
  for (const k of ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu']) {
    const p = planets[k];
    let score = 55;
    const reasons = [];
    const r = (pts, en, ta) => { score += pts; reasons.push({ pts, en, ta }); };
    const node = k === 'Rahu' || k === 'Ketu';
    if (k in EXALT) {
      const lordOfSign = RASIS[p.rasi].lord;
      if (p.rasi === EXALT[k]) r(30, 'Exalted (Uchcham)', 'உச்சம்');
      else if (p.rasi === (EXALT[k] + 6) % 12) r(-30, 'Debilitated (Neecham)', 'நீசம்');
      else if (OWN[k].includes(p.rasi)) r(20, 'In own sign (Aatchi)', 'ஆட்சி');
      else if (FRIEND_SIGNS[k].includes(lordOfSign)) r(8, `In a friend's sign (${lordOfSign})`, 'நட்பு வீடு');
      else if (ENEMY_SIGNS[k].includes(lordOfSign)) r(-12, `In an enemy's sign (${lordOfSign})`, 'பகை வீடு');
      const orb = COMBUSTION_ORBS[k];
      if (orb?.scored) {
        const d = Math.abs(((p.longitude - planets.Sun.longitude + 540) % 360) - 180);
        const limit = p.retrograde ? orb.retrograde : orb.direct;
        if (d < limit) r(-18, `Combust — too close to the Sun (${d.toFixed(1)}° < ${limit}°)`, 'அஸ்தங்கம்');
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
      if (node) {
        if ([3, 6, 11].includes(house)) r(12, `Well placed in the ${ordEn(house)} house`, `${house}-ம் வீட்டில் நன்று`);
        else if ([1, 7, 8, 12].includes(house)) r(-10, `In the ${ordEn(house)} house`, `${house}-ம் வீடு`);
      } else if ([6, 8, 12].includes(house)) r(-10, `In the ${ordEn(house)} house (dusthana)`, `${house}-ம் வீடு (மறைவு ஸ்தானம்)`);
      else if ([1, 4, 7, 10].includes(house)) r(8, `In a kendra (${ordEn(house)} house)`, `கேந்திரம் (${house})`);
      else if ([5, 9].includes(house)) r(8, `In a trikona (${ordEn(house)} house)`, `திரிகோணம் (${house})`);
    }
    score = Math.max(0, Math.min(100, score));
    out.push({
      planet: k, ta: PLANETS[k].ta, score, level: score >= 65 ? 'strong' : score >= 45 ? 'average' : 'weak', reasons,
      indexName: STRENGTH_INDEX.indexName, note: STRENGTH_INDEX.note,
    });
  }
  return out;
}

// What a planet "governs", worded for a child (no business, land, marriage, wealth or longevity words).
const GOVERNS_CHILD = {
  Sun: { en: 'Confidence, health habits and respect for elders', ta: 'தன்னம்பிக்கை, ஆரோக்கியப் பழக்கம், பெரியோருக்கு மரியாதை' },
  Moon: { en: 'Feelings, a calm mind, mother and sleep', ta: 'உணர்வு, அமைதியான மனம், தாய், உறக்கம்' },
  Mars: { en: 'Courage, sports and brothers and sisters', ta: 'தைரியம், விளையாட்டு, உடன்பிறப்பு' },
  Mercury: { en: 'Learning, speech, reading and maths', ta: 'கற்றல், பேச்சு, வாசிப்பு, கணக்கு' },
  Jupiter: { en: 'Wisdom, good values and teachers', ta: 'ஞானம், நல்லொழுக்கம், ஆசிரியர்கள்' },
  Venus: { en: 'Music, art, friendships and a happy home', ta: 'இசை, கலை, நட்பு, மகிழ்ச்சியான வீடு' },
  Saturn: { en: 'Discipline, patience and hard work', ta: 'ஒழுக்கம், பொறுமை, உழைப்பு' },
  Rahu: { en: 'Curiosity and new interests', ta: 'ஆர்வம், புதிய விருப்பங்கள்' },
  Ketu: { en: 'Concentration, prayer and quiet focus', ta: 'மன ஒருமைப்பாடு, வழிபாடு, அமைதியான கவனம்' },
};
/** What a planet governs, worded for the chart owner's age (a minor never sees business / marriage / wealth words). */
export function governsFor(planet, profile = null) {
  return profile && profile.minor ? GOVERNS_CHILD[planet] : NAVAGRAHA[planet]?.governs;
}

/**
 * The practice to show for a planet, by faith and age.
 * Hindu (or Auto): the full Navagraha entry, unchanged — deity, mantra, temple, free remedy, charity, gem.
 * Any other faith or none: a universal practice (prayer in their own faith, charity, discipline, service) and the
 * charity line; NO deity, mantra, temple or gem. The Hindu entry is attached as `traditional` (marked optional,
 * for information) only when the person opted in. A minor gets a child-safe practice and governs line.
 */
export function remedyFor(planet, { faith = 'hindu', traditional = false, profile = null } = {}) {
  const n = NAVAGRAHA[planet];
  if (!n) return null;
  const minor = !!profile?.minor;
  if (isHinduFaith(faith)) {
    // A Hindu child keeps the deity and prayer; a free-practice line about work or money becomes a study prayer.
    const free = minor && adultText(n.free) ? { en: `A short prayer to ${n.deity.en} before studies, and kind words at home.`, ta: `படிக்கும் முன் ${n.deity.ta} வழிபாடு; வீட்டில் இனிய சொல்.` } : n.free;
    return { planet, ...n, free, governs: governsFor(planet, profile), faith: 'hindu' };
  }
  return {
    planet, faith, day: n.day, color: n.color, governs: governsFor(planet, profile),
    free: minor ? CHILD_PRACTICE : universalPractice(planet), charity: n.charity,
    traditional: traditional ? { deity: n.deity, mantra: n.mantra, temple: n.temple, free: n.free, note: TRADITIONAL_OPTIONAL, optional: true } : null,
  };
}

/**
 * Today's personal parigaram: weekday lord + weakest planets + running dasa lord + moon-based cautions.
 * opts: faith (non-Hindu → universal practices, Hindu entries only as opt-in `traditional`), traditional (opt-in),
 * profile (ageProfile — a minor gets child-safe lines), now (for the running dasa; default: the chart's own).
 */
export function dailyParigaram({ weekday, chart, snapshot, faith = 'hindu', traditional = false, profile = null, now = null }) {
  const items = [];
  const R = (planet) => remedyFor(planet, { faith, traditional, profile });
  const dayLord = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'][weekday];
  items.push({ reason: { en: `Today is ${WEEKDAYS_EN[weekday]}, ruled by ${dayLord}`, ta: `இன்று ${WEEKDAYS_TA[weekday]} — ${PLANETS[dayLord].ta} ஆளும் நாள்` }, ...R(dayLord) });
  if (chart) {
    const weak = grahaStrength(chart.planets).filter((g) => g.level === 'weak').sort((a, b) => a.score - b.score);
    for (const w of weak.slice(0, 2)) {
      if (w.planet === dayLord) continue;
      items.push({ reason: { en: `${w.planet} is weak in your chart`, ta: `உங்கள் ஜாதகத்தில் ${w.ta} பலவீனம்` }, ...R(w.planet) });
    }
    const t = now ? new Date(now) : null;
    const dasa = (t && (chart.dasa?.periods || []).find((p) => new Date(p.start) <= t && t < new Date(p.end))?.lord) || chart.dasa?.current?.lord;
    if (dasa && !items.some((i) => i.planet === dasa)) {
      items.push({ reason: { en: `You are running ${dasa} Dasa`, ta: `${planetAdjTa(dasa, PLANETS[dasa].ta)} தசை நடக்கிறது` }, ...R(dasa) });
    }
    if (snapshot) {
      const pos = ((snapshot.moonRasi.index - chart.janmaRasi.index + 12) % 12) + 1;
      if (pos === 8) items.unshift({ reason: { en: 'Chandrashtamam today — be patient, avoid arguments and big decisions', ta: 'இன்று சந்திராஷ்டமம் — பொறுமை காக்கவும், பெரிய முடிவுகளைத் தவிர்க்கவும்' }, ...R('Moon') });
    }
  }
  return items;
}
