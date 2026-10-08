// The one tool registry: every screen in the app, grouped by what the person wants to do, in the order people use
// them most (today → ask → my chart → family → auspicious days → worship → services → more).
// Pure data + search (no DOM), so tests can check that every registered screen is reachable and searchable.

/** Intent groups, psychologically ordered: most-used first. */
export const GROUPS = [
  { id: 'today', en: 'Today', ta: 'இன்று' },
  { id: 'ask', en: 'Ask', ta: 'கேள்வி' },
  { id: 'mychart', en: 'My Jathagam', ta: 'என் ஜாதகம்' },
  { id: 'family', en: 'Family & marriage', ta: 'குடும்பம் & திருமணம்' },
  { id: 'subha', en: 'Auspicious events', ta: 'சுபகாரியம்' },
  { id: 'worship', en: 'Parigaram & temples', ta: 'பரிகாரம் & கோவில்' },
  { id: 'services', en: 'Services', ta: 'சேவைகள்' },
  { id: 'more', en: 'More', ta: 'மேலும்' },
];

/**
 * Every tool. k = extra search words (English, Tanglish spellings, Tamil synonyms).
 * status: 'server' needs the online service · 'sample' uses sample data · 'soon' is not available yet (shown as "Coming soon").
 */
export const TOOLS = [
  // 1. Today
  { id: 'home', group: 'today', en: 'Today’s Guidance', ta: 'இன்றைய வழிகாட்டல்', k: 'today indru inru home dos donts palan rasi palan daily horoscope இன்று பலன்' },
  { id: 'panchangam', group: 'today', en: 'Panchangam — nalla neram, rahu kalam', ta: 'பஞ்சாங்கம் — நல்ல நேரம், ராகு காலம்', k: 'panchang panjangam nalla neram good time rahu kalam rahukalam raghu yamagandam emagandam kuligai guligai gowri gauri tithi thithi nakshatra natchathiram star yogam karanam சூரிய உதயம் sunrise' },
  { id: 'live', group: 'today', en: 'Live Sky & Horai', ta: 'நேரலை வானம் & ஓரை', k: 'horai hora orai planets now grahangal கிரகம் live sky lagnam' },
  { id: 'weather', group: 'today', en: 'Weather & Travel', ta: 'வானிலை & பயணம்', k: 'weather vaanilai mazhai rain travel payanam' },
  { id: 'week', group: 'today', en: 'This Week’s Plan', ta: 'இந்த வாரத் திட்டம்', k: 'week weekly this week vaaram vaara plan thittam திட்டம் வாரம் இந்த வாரம் tasks appointment deadline' },
  { id: 'goals', group: 'today', en: 'My Goals', ta: 'என் இலக்குகள்', k: 'goal goals ilakku ilakkugal இலக்கு இலக்குகள் plan target checklist next steps marriage preparation thirumana erpadu career job preparation exam temple journey house deadline' },
  { id: 'reminders', group: 'today', en: 'Alarm & Reminders', ta: 'அலாரம் & நினைவூட்டல்', k: 'alarm reminder ninaivootal notification' },
  { id: 'diary', group: 'today', en: 'My Thunai Diary — good things that happened', ta: 'என் துணை நாட்குறிப்பு — நல்லது நடந்தது', k: 'diary journal naatkurippu nallathu nadanthathu helped happened gratitude remedy done நாட்குறிப்பு நன்றி' },
  { id: 'dailyset', group: 'today', en: 'Daily Brief & Reminders — on / off', ta: 'தினசரி குறிப்பு & நினைவூட்டல்கள் — இயக்கு / நிறுத்து', k: 'morning brief kaalai kurippu notification off turn off sandhya lamp weekly monthly share prompt settings காலைக் குறிப்பு அறிவிப்பு நிறுத்து' },
  { id: 'relations', group: 'today', en: 'Family Relations Today', ta: 'இன்று குடும்ப உறவு நிலை', k: 'relations uravu family today kudumbam' },
  // 2. Ask
  { id: 'chat', group: 'ask', en: 'Ask Thunai', ta: 'துணையிடம் கேளுங்கள்', k: 'ask question kelvi kel chat thunai jothidar astrologer doubt' },
  { id: 'ask', group: 'ask', en: 'Is Now a Good Time? (Prasnam)', ta: 'இப்போது செய்யலாமா? (பிரசன்னம்)', k: 'prasnam prasna prashna arudam ippo seyyalama now good time decision' },
  // 3. My Jathagam
  { id: 'chart', group: 'mychart', en: 'My Jathagam (Birth Chart)', ta: 'என் ஜாதகம்', k: 'jathagam jadhagam jathakam horoscope birth chart kundli rasi kattam lagnam navamsam' },
  { id: 'analysis', group: 'mychart', en: 'Full Jathaga Analysis', ta: 'முழு ஜாதக ஆய்வு', k: 'analysis reading palan bhavam yogam dosham chevvai dosham' },
  { id: 'dosham', group: 'mychart', en: 'Doshams & Nivarthi — expert view', ta: 'தோஷங்கள் & நிவர்த்தி — நிபுணர் பார்வை', k: 'dosham dosha thosham dosam nivarthi nivarthi parigara sthalam pariharam kovil sarpa rahu ketu dosham naga dosham kala sarpam chevvai dosham sevvai mangal manglik putra dosham puthira santhana kalathra pitru pithru sani dosham moudyam asthangam combust delay thamatham marriage delay child delay தோஷம் நிவர்த்தி பரிகாரத் தலம் தாமதம் சர்ப்ப நாக தோஷம் புத்திர தோஷம் களத்திர தோஷம் பித்ரு தோஷம்' },
  { id: 'roadmap', group: 'mychart', en: 'Dasa Road Map — life periods', ta: 'தசா வரைபடம் — வாழ்க்கைக் காலங்கள்', k: 'dasa dasai thasa bhukti puthi road map life periods kaalam' },
  { id: 'life', group: 'mychart', en: 'Life Questions — job, marriage, house', ta: 'வாழ்க்கைக் கேள்விகள் — வேலை, திருமணம், வீடு', k: 'life questions job velai marriage kalyanam house veedu child kuzhandhai career timing' },
  { id: 'health', group: 'mychart', en: 'Jathagam Health Guide — general wellbeing', ta: 'ஜாதக ஆரோக்கிய வழிகாட்டி — பொது நலம்', k: 'health arokiyam arogyam udal food unavu diet' },
  { id: 'guide', group: 'mychart', en: 'My Guide — colour, number, Siddhar', ta: 'என் வழிகாட்டி — நிறம், எண், சித்தர்', k: 'lucky colour color niram number en siddhar sithar' },
  { id: 'birthtime', group: 'mychart', en: 'Birth-Time Certainty', ta: 'பிறந்த நேரத் துல்லியம்', k: 'birth time piranda neram rectification certainty' },
  // 4. Family & marriage
  { id: 'family', group: 'family', en: 'Family Profiles', ta: 'குடும்ப சுயவிவரங்கள்', k: 'family kudumbam profile add member person' },
  { id: 'porutham', group: 'family', en: 'Star Porutham (quick)', ta: 'நட்சத்திரப் பொருத்தம்', k: 'porutham poruththam porutam match matching marriage kalyanam thirumanam 10 porutham star match' },
  { id: 'couple', group: 'family', en: 'Marriage Porutham — and married life', ta: 'திருமணப் பொருத்தம் — மண வாழ்க்கையும்', k: 'marriage life thirumanam kalyanam couple detailed matching dosham manavazhkai' },
  { id: 'lovematch', group: 'family', en: 'Love Match', ta: 'காதல் பொருத்தம்', k: 'love kadhal kaadhal match chemistry' },
  { id: 'names', group: 'family', en: 'Baby Names', ta: 'குழந்தைப் பெயர்கள்', k: 'baby names kuzhandhai kulanthai peyar name letters namakaranam child name' },
  { id: 'starbday', group: 'family', en: 'Star Birthday & 60th / 80th', ta: 'நட்சத்திரப் பிறந்தநாள் & சஷ்டியப்தபூர்த்தி', k: 'star birthday birthday piranthanaal pirandhanal natchathira sashtiapthapoorthi 60th 80th sathabishekam milestone' },
  { id: 'familyplan', group: 'family', en: 'Shared Events & Journeys', ta: 'பகிர்ந்த நிகழ்வுகள் & பயணங்கள்', k: 'shared plans events family journey' },
  { id: 'kattam', group: 'family', en: 'From a Written Jathagam', ta: 'எழுதிய ஜாதகத்திலிருந்து', k: 'rasi kattam written jathagam photo add chart' },
  { id: 'ruthu', group: 'family', en: 'Ruthu & Manjal Neerattu', ta: 'ருது & மஞ்சள் நீராட்டு', k: 'ruthu manjal neerattu puberty' },
  // 5. Subhakaryam
  { id: 'muhurtham', group: 'subha', en: 'Muhurtham Finder — choose good dates', ta: 'முகூர்த்தம் தேடல் — நல்ல நாள் தேர்வு', k: 'muhurtham muhurtham muhurat good date nalla naal subha griha pravesam house warming wedding date' },
  { id: 'calendar', group: 'subha', en: 'Tamil Calendar & festivals', ta: 'தமிழ் நாட்காட்டி & பண்டிகைகள்', k: 'calendar naatkaatti festival pandigai holiday month' },
  { id: 'festivals', group: 'subha', en: 'Festivals & Vratham — why, how, when', ta: 'விழாக்கள் & விரதங்கள் — ஏன், எப்படி, எப்போது', k: 'festival festivals pandigai vizha thiruvizha vratham viratham deepavali diwali pongal navaratri saraswathi pooja ayudha pooja vinayagar chathurthi karthigai deepam vaikunta ekadasi sivaratri thai poosam aadi perukku krishna jayanthi skanda sashti pradosham ekadasi amavasai why how 365 days பண்டிகை விழா விரதம் தீபாவளி பொங்கல் நவராத்திரி' },
  { id: 'vratham', group: 'subha', en: 'Vratham Days', ta: 'விரத நாட்கள்', k: 'vratham viratham fasting ekadasi pradosham amavasai pournami sashti' },
  { id: 'thivasam', group: 'subha', en: 'Thivasam & Tharpanam', ta: 'திவசம் & தர்ப்பணம்', k: 'thivasam dhivasam tharpanam ancestors munnorgal shraddha' },
  // 6. Parigaram & temples
  { id: 'parigaram', group: 'worship', en: 'Parigaram (simple practices)', ta: 'பரிகாரம் (எளிய வழிபாடு)', k: 'parigaram pariharam remedy remedies vazhipadu dosham' },
  { id: 'temples', group: 'worship', en: 'Temples Near You — timings & directions', ta: 'அருகிலுள்ள கோவில்கள் — நேரம் & வழி', k: 'temple temples kovil koil aalayam darshan timings sthalam' },
  { id: 'journey', group: 'worship', en: 'My Spiritual Journey', ta: 'என் ஆன்மீகப் பயணம்', k: 'journey yatra pilgrimage trip temple tour aanmeegam payanam' },
  { id: 'mantras', group: 'worship', en: 'Daily Chants', ta: 'தினசரி தோத்திரங்கள்', k: 'mantra mantras manthiram chant chants japam slokam sloka stotram prayer மந்திரம் மந்திரங்கள் தோத்திரம் ஜபம்' },
  { id: 'ithihasa', group: 'worship', en: 'Daily Ithihasa — Ramayanam & Mahabharatham', ta: 'இதிகாசத் தொடர் — இராமாயணம், மகாபாரதம்', k: 'ithihasa ithikasam itihasa ramayanam ramayana ramayan kamba ramayanam valmiki rama raman seethai sita hanuman anuman mahabharatham mahabharata bharatham krishna story kathai kadhai urai pravachanam upanyasam daily story audio listen read aloud இதிகாசம் இராமாயணம் ராமாயணம் மகாபாரதம் கதை உரை' },
  { id: 'hymns', group: 'worship', en: 'Hymns & Stotras', ta: 'தோத்திரங்கள் & பாடல்கள்', k: 'hymn hymns stotram stotra stothram slokam sloka paadal padal song lyrics full text read recite parayanam kavasam kavacham kanda sashti kavasam skanda vishnu sahasranamam sahasranamam hanuman chalisa anuman aditya hrudayam hridayam vinayagar agaval angaraka rina vimochana durga saptashloki katyayani santhana gopala abhirami anthadhi தோத்திரம் ஸ்தோத்திரம் பாடல் கவசம் கந்த சஷ்டி கவசம் விஷ்ணு சகஸ்ரநாமம் அனுமன் சாலீசா ஆதித்ய ஹிருதயம் விநாயகர் அகவல் அபிராமி அந்தாதி' },
  // 7. Services
  { id: 'priests', group: 'services', en: 'Priest Requests', ta: 'புரோகிதர் கோரிக்கை', k: 'priest purohit iyer aiyar homam pooja', status: 'server' },
  { id: 'seva', group: 'services', en: 'Temple Seva Requests', ta: 'கோவில் சேவை கோரிக்கை', k: 'seva archanai abishekam temple booking', status: 'server' },
  { id: 'store', group: 'services', en: 'Pooja Store', ta: 'பூஜைப் பொருள் கடை', k: 'store shop kadai pooja items buy', status: 'sample' },
  { id: 'packages', group: 'services', en: 'Yatra & Parigaram Packages', ta: 'யாத்திரை & பரிகாரத் தொகுப்புகள்', k: 'yatra package tour travel', status: 'server' },
  { id: 'bookings', group: 'services', en: 'My Bookings', ta: 'என் முன்பதிவுகள்', k: 'booking bookings status cancel order', status: 'server' },
  { id: 'consult', group: 'services', en: 'Talk to an Astrologer', ta: 'ஜோதிடருடன் பேசுங்கள்', k: 'consult astrologer jothidar call expert second opinion', status: 'soon' },
  { id: 'plans', group: 'services', en: 'Personal & Family Plans', ta: 'தனிநபர் & குடும்பத் திட்டங்கள்', k: 'personal plan premium subscription family plan pay thaninabar' },
  // 8. More
  { id: 'numerology', group: 'more', en: 'Name & Number Numerology', ta: 'பெயர் & எண் கணிதம்', k: 'numerology en kanitham name number' },
  { id: 'vargas', group: 'more', en: 'Divisional Charts & Ashtakavarga', ta: 'வர்க்கக் கட்டங்கள் & அஷ்டகவர்க்கம்', k: 'varga divisional navamsa d9 d10 ashtakavarga' },
  { id: 'gunamilan', group: 'more', en: 'Guna Milan (36 Gunas)', ta: 'குண மிலன் (36 குணங்கள்)', k: 'guna milan gunamilan ashtakoota north indian 36' },
  { id: 'peyarchi', group: 'more', en: 'Peyarchi Palan — Guru / Sani / Rahu-Ketu', ta: 'பெயர்ச்சி பலன் — குரு / சனி / ராகு-கேது', k: 'peyarchi transit guru sani saturn jupiter rahu ketu ezharai sade sati' },
  { id: 'partners', group: 'more', en: 'Business Partner Porutham', ta: 'வணிகக் கூட்டாளி பொருத்தம்', k: 'business partner koottali vyabaram' },
  { id: 'more', group: 'more', en: 'Settings & Account', ta: 'அமைப்புகள் & கணக்கு', k: 'settings amaippugal account language mozhi theme dark light large text sign in login' },
  { id: 'privacy', group: 'more', en: 'Privacy & Data', ta: 'தனியுரிமை & தரவு', k: 'privacy data delete export consent' },
  { id: 'why', group: 'more', en: 'How Thunai Reads Your Chart', ta: 'துணை ஜாதகத்தைப் படிக்கும் முறை', k: 'how why method explain' },
  { id: 'calc', group: 'more', en: 'Calculation Methods', ta: 'கணிப்பு முறைகள்', k: 'calculation ayanamsa lahiri method' },
  { id: 'feedback', group: 'more', en: 'Rate & Comment', ta: 'மதிப்பீடு & கருத்து', k: 'feedback rate review karuthu' },
  { id: 'report', group: 'more', en: 'Report a Problem', ta: 'பிரச்சினையைத் தெரிவியுங்கள்', k: 'report problem bug issue error defect not working pirachinai' },
  { id: 'invite', group: 'more', en: 'Invite Family & Friends', ta: 'குடும்பம், நண்பர்களை அழையுங்கள்', k: 'invite share friends' },
  { id: 'legal', group: 'more', en: 'Privacy, Terms & Refunds', ta: 'தனியுரிமை & விதிமுறைகள்', k: 'terms legal refund cancellation policy' },
  { id: 'about', group: 'more', en: 'About Thunai', ta: 'துணை பற்றி', k: 'about help version' },
];

/** The five bottom tabs. */
export const TABS = ['home', 'chart', 'familyhub', 'chat', 'services'];

/** Screens that are not tools but are reached from a fixed place (screen id -> the screen that opens it). */
export const ROUTES = {
  tools: 'home', // the launcher itself: Today's search bar, the header search button and the Services tab
  familyhub: 'tab', services: 'tab',
  login: 'more', // Sign in button on Settings
  value: 'more', // "Your Thunai so far" — optional value summary on Settings (screens-plans.js)
  admin: 'about', // owner only: shown on Settings for admins; long-press the build number in About
  hymn: 'hymns', // one hymn's reader: opened from the Hymns list and from hymn names in remedies, festivals and answers
};

/** Quick actions on Today (Instagram-stories-style row). */
export const QUICK = ['chat', 'ask', 'porutham', 'temples', 'names', 'muhurtham'];

export const toolById = (id) => TOOLS.find((t) => t.id === id) || null;

// ---------------------------------------------------------------- search
// Tanglish spellings vary a lot (porutham / poruththam / porutam, kalam / kaalam, koil / kovil):
// fold Latin text to a skeleton — long vowels, aspirated consonants and doubled letters collapse.
function foldLatin(s) {
  return s
    .replace(/zh/g, 'l').replace(/([kgcjtdpb])h/g, '$1').replace(/sh/g, 's').replace(/ch/g, 'c')
    .replace(/ee/g, 'i').replace(/oo/g, 'u').replace(/w/g, 'v').replace(/y/g, 'i')
    .replace(/(.)\1+/g, '$1');
}
/** Normalise text for matching: lower-case, Tamil kept, punctuation dropped, Latin folded. */
export function normalize(text) {
  const t = String(text || '').toLowerCase().normalize('NFC').replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
  return t.split(' ').map((w) => (/^[a-z0-9]+$/.test(w) ? foldLatin(w) : w)).join(' ');
}
const index = new Map();
function haystack(t) {
  if (!index.has(t.id)) {
    index.set(t.id, {
      name: `${normalize(t.en)} ${normalize(t.ta)}`,
      all: `${normalize(t.en)} ${normalize(t.ta)} ${normalize(t.k || '')} ${normalize(t.id)}`,
      words: `${normalize(t.en)} ${normalize(t.ta)} ${normalize(t.k || '')}`.split(' '),
    });
  }
  return index.get(t.id);
}
/** Score one query word against a tool (0 = no match). */
function wordScore(w, h) {
  if (h.name.split(' ').some((x) => x.startsWith(w))) return 3;
  if (h.words.some((x) => x.startsWith(w))) return 2;
  if (w.length >= 3 && h.all.includes(w)) return 1;
  return 0;
}
/**
 * Find tools by Tamil, English or Tanglish words. Every word of the query must match; the joined query
 * also matches ("rahukalam" = "rahu kalam"). Best matches first.
 */
export function searchTools(query, { tools = TOOLS, limit = 50 } = {}) {
  const q = normalize(query);
  if (!q) return [];
  const words = q.split(' ');
  const joined = words.join('');
  const out = [];
  for (const t of tools) {
    const h = haystack(t);
    let score = 0;
    const per = words.map((w) => wordScore(w, h));
    if (per.every((s) => s > 0)) score = per.reduce((a, b) => a + b, 0);
    else if (words.length > 1 && h.all.replace(/ /g, '').includes(joined)) score = 1;
    if (score) out.push({ t, score });
  }
  const order = (id) => TOOLS.findIndex((x) => x.id === id);
  return out.sort((a, b) => b.score - a.score || order(a.t.id) - order(b.t.id)).slice(0, limit).map((x) => x.t);
}
