// Hymns & Stotras (தோத்திரங்கள் & பாடல்கள்): the full text of every hymn the app asks people to recite.
// This index is small (names, introductions, sources); each hymn's text lives in shared/hymns/<id>.js and is
// loaded only when the reader opens it, so the offline precache stays light.
//
// Rules for the texts (sacred texts must be exact):
// - Taken only from a public-domain source edition, recorded in `source` (URL, edition, retrieval date). No text is
//   written from memory; translations and commentaries are never copied (only the original verses).
// - Sanskrit / Awadhi texts are shown in Tamil script, transliterated letter-for-letter from the Devanagari of the
//   source (grantha letters ஜ ஷ ஸ ஹ ஶ க்ஷ; superscript ² ³ ⁴ mark the aspirated / voiced sounds, as in
//   sanskritdocuments.org's Tamil script). `transliterated: true` says so on the page.
// - A hymn whose source could not be fetched is kept with `status: 'pending'` and no text; the reader then shows its
//   name, meaning and a "full text coming" note instead of anything unverified.
// Faith: the hymns open for anyone who taps them; they are *suggested* only where the existing faith rules
// (shared/faith.js) already allow Hindu practices — this file does not change those rules.

export const RETRIEVED = '2026-10-07';
const T = (en, ta) => ({ en, ta });

// Source files: mirrored copies of the printed editions (the publishers' own sites were not reachable from the
// build machine). Gita Press texts are its own digital e-books (typeset, not OCR), from the sanskrit/raw_etexts
// archive on GitHub; only the Sanskrit / Awadhi verses are used, never the Hindi translation.
const RAW = 'https://raw.githubusercontent.com/sanskrit/raw_etexts/master';
const GP = (file, book) => ({ url: `${RAW}/purANam/mishram/misc-gp/raw/stotra/${file}`, name: `Gita Press, Gorakhpur — ${book} (Gita Seva Trust e-book)`, retrieved: RETRIEVED });

/**
 * Every hymn. sections/lines are in shared/hymns/<id>.js (see loadHymn); `lineCount` is checked by the tests.
 * planet = the Navagraha the app suggests it for (if any).
 */
export const HYMNS = [
  {
    id: 'kanda-sashti-kavasam', icon: '🦚',
    title: T('Kanda Sashti Kavasam', 'கந்த சஷ்டி கவசம்'),
    author: T('Devaraya Swamigal', 'தேவராய சுவாமிகள்'),
    deity: T('Lord Murugan', 'முருகப் பெருமான்'), planet: 'Mars',
    language: 'tamil', script: 'tamil', transliterated: false,
    intro: T('A Tamil “armour” (kavasam) of prayer to Lord Murugan, sung by Devaraya Swamigal in the 19th century at Thiruchendur. Its lines ask Murugan’s vel to guard every part of the body and every hour of the day.',
      'பத்தொன்பதாம் நூற்றாண்டில் தேவராய சுவாமிகள் திருச்செந்தூரில் பாடிய முருகனுக்கான கவசம். உடலின் ஒவ்வொரு உறுப்பையும், நாளின் ஒவ்வொரு பொழுதையும் வேல் காக்க வேண்டும் என்று வேண்டும் பாடல்.'),
    when: T('By tradition on Tuesdays, Sashti days and through the six days of Skanda Sashti; also for Chevvai (Mars) afflictions.', 'மரபுப்படி செவ்வாய்க்கிழமை, சஷ்டி நாட்கள், கந்த சஷ்டி ஆறு நாட்களிலும்; செவ்வாய் தோஷத்துக்கும் பாராயணம் செய்வர்.'),
    minutes: 15,
    status: 'pending', lineCount: 0, text: null,
    source: { url: 'https://www.projectmadurai.org/pmworks.html', name: 'Project Madurai (Tamil Unicode etext) — planned; or Tamil Wikisource', retrieved: null },
    pendingWhy: T('The Tamil-script source (Project Madurai / Tamil Wikisource) could not be reached; the only copies found were Devanagari renderings that cannot be turned back into exact Tamil.', 'தமிழ் எழுத்து மூலம் (Project Madurai / தமிழ் விக்கிமூலம்) கிடைக்கவில்லை; கிடைத்தவை தேவநாகரியில் எழுதியவை — அவற்றிலிருந்து துல்லியமான தமிழைத் திரும்பப் பெற முடியாது.'),
  },
  {
    id: 'vishnu-sahasranamam', icon: '🪷',
    title: T('Vishnu Sahasranamam', 'விஷ்ணு சகஸ்ரநாமம்'),
    author: T('Sage Veda Vyasa (Mahabharatham, Anushasana Parvam) — taught by Bhishma', 'வேத வியாசர் (மகாபாரதம், அனுசாசன பர்வம்) — பீஷ்மர் உபதேசித்தது'),
    deity: T('Lord Vishnu (Perumal)', 'மகாவிஷ்ணு (பெருமாள்)'), planet: 'Mercury',
    language: 'sanskrit', script: 'tamil', transliterated: true,
    intro: T('The thousand names of Lord Vishnu. Lying on his bed of arrows, Bhishma gave them to Yudhishthira when asked “which one God, and which prayer, frees a person?” This is the Mahabharatham text as printed by Gita Press; South Indian recitation adds a few opening and closing verses (Shuklambaradharam…, Arjuna’s and Parvathi’s questions) which are not part of this edition.',
      'மகாவிஷ்ணுவின் ஆயிரம் திருநாமங்கள். அம்புப் படுக்கையில் இருந்த பீஷ்மர், “ஒரே தெய்வம் யார், எந்தப் பிரார்த்தனை விடுதலை தரும்?” என்ற யுதிஷ்டிரரின் கேள்விக்குப் பதிலாக உபதேசித்தது. இது கீதா பிரஸ் வெளியிட்ட மகாபாரதப் பாடம்; தென்னிந்தியப் பாராயணத்தில் சேர்க்கும் சில தொடக்க / நிறைவுச் சுலோகங்கள் (சுக்லாம்பரதரம்…, அர்ஜுனன், பார்வதி கேள்விகள்) இந்தப் பதிப்பில் இல்லை.'),
    when: T('Daily for many families; especially on Ekadasi, Wednesdays (Budhan) and Thursdays, and in Purattasi and Margazhi.', 'பல குடும்பங்களில் தினமும்; குறிப்பாக ஏகாதசி, புதன், வியாழன், புரட்டாசி, மார்கழி மாதங்களில்.'),
    minutes: 30,
    status: 'complete', lineCount: 306,
    source: GP('sahasranaam-stotra-sangrah.html', 'Sahasranama-stotra-sangraha: Shri Vishnu Sahasranama Stotram'),
  },
  {
    id: 'hanuman-chalisa', icon: '🐒',
    title: T('Hanuman Chalisa', 'அனுமன் சாலீசா'),
    author: T('Goswami Tulsidas (16th century)', 'கோஸ்வாமி துளசிதாசர் (16-ஆம் நூற்றாண்டு)'),
    deity: T('Lord Hanuman (Anjaneyar)', 'ஆஞ்சநேயர் (அனுமன்)'), planet: 'Saturn',
    language: 'awadhi', script: 'tamil', transliterated: true,
    intro: T('Forty verses (chaupais) in Awadhi, between an opening and a closing doha, praising Hanuman’s strength, devotion to Sri Rama and protection of devotees.',
      'அவதி மொழியில் நாற்பது சௌபாயீ பாடல்கள் — தொடக்க, நிறைவு தோஹாக்களுடன். அனுமனின் வலிமை, ஸ்ரீராம பக்தி, அடியவர்களைக் காக்கும் கருணையைப் போற்றுகிறது.'),
    when: T('By tradition on Tuesdays and Saturdays, and for Sani (Saturn) periods — Ezharai Sani, Ashtama Sani.', 'மரபுப்படி செவ்வாய், சனிக்கிழமைகளில்; ஏழரைச் சனி, அஷ்டமச் சனி காலங்களில்.'),
    minutes: 10,
    status: 'complete', lineCount: 92,
    source: GP('sri-hanumanchalisa.html', 'Shri Hanuman Chalisa'),
  },
  {
    id: 'aditya-hrudayam', icon: '☀️',
    title: T('Aditya Hrudayam', 'ஆதித்ய ஹிருதயம்'),
    author: T('Sage Valmiki (Ramayanam, Yuddha Kandam) — taught by Sage Agastya', 'வால்மீகி முனிவர் (இராமாயணம், யுத்த காண்டம்) — அகஸ்திய முனிவர் உபதேசித்தது'),
    deity: T('Lord Surya (the Sun)', 'சூரிய பகவான்'), planet: 'Sun',
    language: 'sanskrit', script: 'tamil', transliterated: true,
    intro: T('Thirty-one verses from the Valmiki Ramayanam. As Sri Rama stood tired before the last battle with Ravana, Sage Agastya came and taught him this hymn to the Sun for courage and victory.',
      'வால்மீகி இராமாயணத்தின் முப்பத்தொரு சுலோகங்கள். இராவணனுடனான இறுதிப் போருக்கு முன் சோர்ந்து நின்ற ஸ்ரீராமனுக்கு, அகஸ்திய முனிவர் வந்து வெற்றியும் மனத்திடமும் தரும் இந்தச் சூரிய ஸ்தோத்திரத்தை உபதேசித்தார்.'),
    when: T('By tradition at sunrise, especially on Sundays, and for Sun-related afflictions; many read it before important work.', 'மரபுப்படி சூரிய உதயத்தில், குறிப்பாக ஞாயிற்றுக்கிழமை; சூரிய பலம் வேண்டும்போதும், முக்கியப் பணிக்கு முன்னும்.'),
    minutes: 8,
    status: 'complete', lineCount: 62,
    source: GP('aadityahardyastrotam.html', 'Aditya-hridaya-stotram'),
  },
  {
    id: 'vinayagar-agaval', icon: '🐘',
    title: T('Vinayagar Agaval', 'விநாயகர் அகவல்'),
    author: T('Avvaiyar', 'ஔவையார்'),
    deity: T('Lord Vinayagar', 'விநாயகர்'), planet: 'Ketu',
    language: 'tamil', script: 'tamil', transliterated: false,
    intro: T('A Tamil hymn in agaval metre attributed to Avvaiyar. It praises Vinayagar and describes the inner path of yoga he grants.',
      'ஔவையார் அருளியதாகப் போற்றப்படும் அகவல். விநாயகரைப் போற்றி, அவர் அருளும் யோக நெறியை விவரிக்கிறது.'),
    when: T('By tradition before any new work, on Chathurthi and Vinayagar Chathurthi, and for Ketu periods.', 'மரபுப்படி புதிய வேலைக்கு முன், சதுர்த்தி, விநாயகர் சதுர்த்தி நாட்களில், கேது காலங்களில்.'),
    minutes: 10,
    status: 'pending', lineCount: 0, text: null,
    source: { url: 'https://www.projectmadurai.org/pmworks.html', name: 'Project Madurai (Tamil Unicode etext) — planned; or Tamil Wikisource', retrieved: null },
    pendingWhy: T('The Tamil-script source (Project Madurai / Tamil Wikisource) could not be reached from the build machine.', 'தமிழ் எழுத்து மூலம் (Project Madurai / தமிழ் விக்கிமூலம்) கிடைக்கவில்லை.'),
  },
  {
    id: 'rina-vimochana-angaraka-stotram', icon: '🔴',
    title: T('Rina Vimochana Angaraka Stotram', 'ருண விமோசன அங்காரக ஸ்தோத்திரம்'),
    author: T('Skanda Puranam (as told by Bhargava)', 'ஸ்கந்த புராணம் (பார்கவர் உரைத்தது)'),
    deity: T('Angaraka (Chevvai, Mars) / Lord Murugan', 'அங்காரகன் (செவ்வாய்) / முருகப் பெருமான்'), planet: 'Mars',
    language: 'sanskrit', script: 'tamil', transliterated: true,
    intro: T('Twelve Sanskrit verses praising Mangala (Mars), beginning “Mangalo bhoomiputrashcha…”, recited by tradition for relief from debts (runam).',
      '“மங்களோ பூமிபுத்ரஶ்ச…” என்று தொடங்கும், செவ்வாய் பகவானைப் போற்றும் பன்னிரண்டு சுலோகங்கள்; கடன் (ருணம்) தீர மரபுப்படி பாராயணம் செய்வர்.'),
    when: T('By tradition on Tuesdays, at sunrise or in the Chevvai horai.', 'மரபுப்படி செவ்வாய்க்கிழமை, சூரிய உதயத்தில் அல்லது செவ்வாய் ஓரையில்.'),
    minutes: 3,
    status: 'pending', lineCount: 0, text: null,
    source: { url: 'https://sanskritdocuments.org/', name: 'sanskritdocuments.org (proof-read etext) — planned', retrieved: null },
    pendingWhy: T('sanskritdocuments.org could not be reached; the only copies found were OCR scans of two old printed editions that differ in several words, so no single exact text could be confirmed.', 'sanskritdocuments.org கிடைக்கவில்லை; கிடைத்தவை இரண்டு பழைய அச்சுப் பதிப்புகளின் OCR நகல்கள் — அவை சில சொற்களில் வேறுபடுவதால் துல்லியமான பாடத்தை உறுதிசெய்ய முடியவில்லை.'),
  },
  {
    id: 'durga-saptashloki', icon: '🔱',
    title: T('Durga Saptashloki', 'துர்கா ஸப்தச்லோகீ'),
    author: T('Devi Mahatmyam (Markandeya Puranam)', 'தேவி மாஹாத்மியம் (மார்க்கண்டேய புராணம்)'),
    deity: T('Goddess Durga', 'துர்க்கை அம்மன்'), planet: 'Rahu',
    language: 'sanskrit', script: 'tamil', transliterated: true,
    intro: T('Seven verses that hold the essence of the 700-verse Durga Saptashati (Devi Mahatmyam). In it Shiva asks the Devi for an easy way for people of Kali yuga, and she gives this “Amba stuti”. Where the app says “Durga stotram” it means this short hymn.',
      '700 சுலோகங்கள் கொண்ட துர்கா ஸப்தசதியின் (தேவி மாஹாத்மியம்) சாரமான ஏழு சுலோகங்கள். கலியுக மக்களுக்கு எளிய வழி கேட்ட சிவனுக்குத் தேவி அருளிய “அம்பா ஸ்துதி” இது. செயலியில் “துர்க்கை துதி / Durga stotram” என்று சொல்லும் இடங்களில் இந்தச் சிறிய ஸ்தோத்திரமே.'),
    when: T('By tradition with a lemon or ghee lamp in Rahu Kalam on Tuesdays, Fridays or Sundays, during Navaratri and on Durgashtami.', 'மரபுப்படி செவ்வாய், வெள்ளி, ஞாயிறு ராகு காலத்தில் எலுமிச்சை / நெய் விளக்குடன்; நவராத்திரி, துர்காஷ்டமி நாட்களில்.'),
    minutes: 3,
    status: 'complete', lineCount: 26,
    source: GP('devi-stotra-ratnakar.html', 'Devi-stotra-ratnakara: Saptashloki Durga'),
  },
  {
    id: 'katyayani-mantra', icon: '💐',
    title: T('Katyayani mantra', 'காத்யாயனி மந்திரம்'),
    author: T('Srimad Bhagavatam 10.22.4 (Sage Vyasa)', 'ஸ்ரீமத் பாகவதம் 10.22.4 (வியாசர்)'),
    deity: T('Goddess Katyayani (Durga)', 'காத்யாயனி தேவி (துர்க்கை)'),
    language: 'sanskrit', script: 'tamil', transliterated: true,
    intro: T('The prayer the young girls of Vraja chanted through the month of Margazhi while worshipping Goddess Katyayani on the banks of the Yamuna, asking for Krishna as their husband. By tradition it is chanted for a good marriage.',
      'மார்கழி மாதம் முழுதும் யமுனைக் கரையில் காத்யாயனி தேவியை வழிபட்ட கோகுலத்துப் பெண்கள், கண்ணனையே கணவனாக வேண்டி ஜபித்த மந்திரம். நல்ல வரன் அமைய மரபுப்படி ஜபிப்பர்.'),
    when: T('By tradition 108 times a day, especially on Tuesdays and Fridays and in Margazhi.', 'மரபுப்படி தினமும் 108 முறை; குறிப்பாகச் செவ்வாய், வெள்ளி, மார்கழி மாதத்தில்.'),
    minutes: 1,
    status: 'complete', lineCount: 2,
    source: { url: `${RAW}/purANam/vaiShNavam/bhAgavata-purANam/wiki/10/022.md`, name: 'Srimad Bhagavata Puranam 10.22 — Sanskrit Wikisource text (sa.wikisource.org), via the sanskrit/raw_etexts archive', retrieved: RETRIEVED },
  },
  {
    id: 'santhana-gopala-mantra', icon: '👶',
    title: T('Santhana Gopala mantra', 'சந்தான கோபால மந்திரம்'),
    author: T('Traditional (Sanatkumara’s form, Narada rishi)', 'பாரம்பரியம் (ஸனத்குமாரர் உரைத்த வடிவம், நாரத ரிஷி)'),
    deity: T('Lord Krishna as the child Gopala', 'பாலகிருஷ்ணன் (சந்தான கோபாலன்)'),
    language: 'sanskrit', script: 'tamil', transliterated: true,
    intro: T('A prayer to Krishna, “son of Devaki”, for the blessing of a child: “O Govinda, Vasudeva, Lord of the world — give me a child, Krishna; I take refuge in you.” A short meditation verse on the new-born Krishna in Devaki’s lap comes first.',
      '“தேவகி மைந்தனே, கோவிந்தா, வாசுதேவா, உலகின் தலைவா — கிருஷ்ணா, எனக்கு மகவைத் தா; உன்னைச் சரணடைந்தேன்” என்று குழந்தைப் பேறுக்கு வேண்டும் மந்திரம். முன்னதாக, தேவகியின் மடியில் பிறந்த குழந்தையாகக் கண்ணனைத் தியானிக்கும் சுலோகம்.'),
    when: T('By tradition 108 times a day by the couple, especially on Thursdays and Ekadasi. It is a prayer alongside medical care, never instead of it.', 'மரபுப்படி தம்பதியர் தினமும் 108 முறை; குறிப்பாக வியாழன், ஏகாதசி நாட்களில். இது மருத்துவத்துடன் சேர்ந்த பிரார்த்தனை — மருத்துவத்துக்குப் பதிலல்ல.'),
    minutes: 1,
    status: 'complete', lineCount: 5,
    source: GP('santan-gopal-stotra-santan-prapti-ke-shstriya-upay.html', 'Santana-Gopala-stotra: Santana Gopala mantra (third method, Sanatkumara’s)'),
  },
  {
    id: 'abhirami-anthadhi', icon: '🌺',
    title: T('Abhirami Anthadhi', 'அபிராமி அந்தாதி'),
    author: T('Abhirami Bhattar (18th century, Thirukkadaiyur)', 'அபிராமி பட்டர் (18-ஆம் நூற்றாண்டு, திருக்கடையூர்)'),
    deity: T('Goddess Abhirami (Ambal)', 'அபிராமி அம்மை'),
    language: 'tamil', script: 'tamil', transliterated: false,
    intro: T('One hundred Tamil verses to Goddess Abhirami of Thirukkadaiyur, each beginning with the last word of the one before (anthadhi). Abhirami Bhattar sang them on a Thai Amavasai; by tradition the Goddess showed the full moon that night.',
      'திருக்கடையூர் அபிராமி அம்மை மீது பாடிய நூறு பாடல்கள்; ஒவ்வொன்றும் முந்தைய பாடலின் இறுதிச் சொல்லில் தொடங்கும் (அந்தாதி). தை அமாவாசையன்று அபிராமி பட்டர் பாடியபோது அம்மை முழு நிலவைக் காட்டியதாக மரபு.'),
    when: T('By tradition on Pournami, Fridays, Navaratri and Thai Amavasai.', 'மரபுப்படி பௌர்ணமி, வெள்ளி, நவராத்திரி, தை அமாவாசை நாட்களில்.'),
    minutes: 45,
    status: 'pending', lineCount: 0, text: null,
    source: { url: 'https://www.projectmadurai.org/pmworks.html', name: 'Project Madurai (Tamil Unicode etext) — planned; or Tamil Wikisource', retrieved: null },
    pendingWhy: T('The Tamil-script source (Project Madurai / Tamil Wikisource) could not be reached; the only copy found was a Devanagari rendering with a modern commentary.', 'தமிழ் எழுத்து மூலம் (Project Madurai / தமிழ் விக்கிமூலம்) கிடைக்கவில்லை; கிடைத்தது நவீன உரையுடன் கூடிய தேவநாகரி வடிவம் மட்டுமே.'),
  },
];

export const hymnById = (id) => HYMNS.find((h) => h.id === id) || null;
export const hymnReady = (h) => !!h && h.status === 'complete';

/** The full hymn with its sections (null for an unknown id; sections: [] while the text is pending). */
export async function loadHymn(id) {
  const h = hymnById(id);
  if (!h) return null;
  if (!hymnReady(h)) return { ...h, sections: [] };
  const mod = await import(`./hymns/${id}.js`);
  return { ...h, sections: mod.default };
}

/**
 * How the app's remedy, festival and answer texts name each hymn (English and Tamil, with the Tamil case endings
 * the texts use). Used to turn those names into links to the reader, without editing the sentences.
 * "Durga Saptashati" (the 700-verse text) is deliberately not linked to the seven-verse Saptashloki.
 */
export const HYMN_NAMES = {
  'kanda-sashti-kavasam': ['Kanda Sashti Kavasam', 'கந்த சஷ்டி கவச(?:ம்|த்தை|த்தின்|மும்)'],
  'vishnu-sahasranamam': ['Vishnu Sahasranamam', 'விஷ்ணு சகஸ்ரநாம(?:ம்|மும்|த்தை|த்துக்கு|த்துடன்)'],
  'hanuman-chalisa': ['Hanuman Chalisa', 'அனுமன் சாலீசா', 'ஹனுமான் சாலிசா'],
  'aditya-hrudayam': ['Aditya H(?:ru|ri)dayam', 'ஆதித்ய ஹ(?:ி|்)ருதய(?:ம்|மும்|த்தை)'],
  'vinayagar-agaval': ['Vinayagar Agaval', 'விநாயகர் அகவல்'],
  'rina-vimochana-angaraka-stotram': ['Rina Vimochana Angaraka Stotram', 'ருண விமோசன அங்காரக ஸ்தோத்திரம்'],
  'durga-saptashloki': ['Durga stotram', 'Durga Saptashloki', 'துர்க்கை துதி'],
  'katyayani-mantra': ['Katyayani mantra', 'காத்யாயனி மந்திர(?:ம்|த்தை)'],
  'santhana-gopala-mantra': ['Santhana Gopala mantra', 'சந்தான கோபால மந்திர(?:ம்|த்தை)'],
  'abhirami-anthadhi': ['Abhirami Anth(?:adhi|athi)', 'அபிராமி அந்தாதி'],
};
const NAME_RE = new RegExp(Object.entries(HYMN_NAMES).map(([id, pats]) => `(?<${id.replace(/-/g, '_')}>${pats.join('|')})`).join('|'), 'g');

/** Every hymn name in a text: [{ id, start, end, text }], in order. */
export function findHymnNames(text) {
  const s = String(text ?? '');
  const out = [];
  for (const m of s.matchAll(NAME_RE)) {
    const key = Object.keys(m.groups).find((k) => m.groups[k] !== undefined);
    out.push({ id: key.replace(/_/g, '-'), start: m.index, end: m.index + m[0].length, text: m[0] });
  }
  return out;
}
/**
 * A text with every hymn name replaced by link(id, name); the parts between are passed through escape().
 * Pure string work (the screens pass their HTML escaper and link maker — public/hymn-links.js).
 */
export function withHymnLinks(text, escape, link) {
  const s = String(text ?? '');
  let out = ''; let at = 0;
  for (const f of findHymnNames(s)) { out += escape(s.slice(at, f.start)) + link(f.id, f.text); at = f.end; }
  return out + escape(s.slice(at));
}
/** Hymn ids named in a text (unique, in order). */
export const hymnIdsIn = (text) => [...new Set(findHymnNames(text).map((x) => x.id))];

/** What a Tamil voice should say for a line: no superscript marks or verse numbers. */
export const speakable = (line) => String(line).replace(/[²³⁴]/g, '').replace(/([^\s]):/g, '$1ஹ').replace(/॥\s*[\d\s]+॥/g, '॥').replace(/[।॥]+/g, '.').replace(/'/g, '').replace(/\s+/g, ' ').trim();
