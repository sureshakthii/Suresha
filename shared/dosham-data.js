// Dosham & Nivarthi reference data (used by shared/dosham.js). Pure data, no logic.
// Every association here is TRADITIONAL (Tamil parigara-sthalam practice, as commonly taught) and is shown to the
// person as tradition and belief — never as a promise. Rule definitions are status 'proposed' until the master
// astrologer signs them off (docs/RULE-REGISTRY.md, "Dosham & Nivarthi rules"). Temple ids refer to shared/temples.js.
const T = (en, ta) => ({ en, ta });

export const DOSHAM_DATA_VERSION = 'dosham-data-0.1-proposed';

/** Life areas a dosham is traditionally read as delaying (plain words, no fear). */
export const AREAS = {
  marriage: T('Marriage', 'திருமணம்'),
  spouse: T('Harmony with the spouse', 'தம்பதியர் ஒற்றுமை'),
  children: T('Children (santhana bhagyam)', 'குழந்தை பாக்கியம்'),
  career: T('Work & career', 'வேலை & தொழில்'),
  effort: T('Effort before results', 'முயற்சிக்குப் பின் பலன்'),
  health: T('Energy & daily health routine', 'உடல் சக்தி & அன்றாட ஆரோக்கியப் பழக்கம்'),
  family: T('Family, speech & savings', 'குடும்பம், வாக்கு, சேமிப்பு'),
  father: T('Father & ancestors (pitru)', 'தந்தை & முன்னோர்'),
  mind: T('Peace of mind', 'மன அமைதி'),
  studies: T('Studies & clarity', 'கல்வி & தெளிவு'),
  fortune: T('Fortune & blessings', 'பாக்கியம் & அருள்'),
};

/** Weekday names (0 = Sunday). */
export const WEEKDAY = [T('Sunday', 'ஞாயிறு'), T('Monday', 'திங்கள்'), T('Tuesday', 'செவ்வாய்'), T('Wednesday', 'புதன்'), T('Thursday', 'வியாழன்'), T('Friday', 'வெள்ளி'), T('Saturday', 'சனி')];

/**
 * Per planet: the Navagraha parigara sthalam (temple id), why tradition goes there, what to do there,
 * the best day / time, the home hymn (shared/hymns.js id) and simple daily practice.
 */
export const PLANET_NIVARTHI = {
  Sun: {
    temple: 'suriyanar', day: 0,
    reason: T('Suriyanar Kovil is the Navagraha sthalam of Surya — the traditional place for Sun-related afflictions and for a combust (moudyam) planet.', 'சூரியனார் கோவில் சூரியனுக்கான நவகிரகத் தலம் — சூரிய பாதிப்புக்கும், அஸ்தங்கம் (மௌட்யம்) அடைந்த கிரகத்துக்கும் மரபான பரிகாரத் தலம்.'),
    todo: T('Go on a Sunday morning; offer red flowers / wheat, light a ghee lamp, and visit Thirumangalakudi Prananatheswarar first as is the custom there.', 'ஞாயிறு காலை செல்லுங்கள்; சிவப்பு மலர் / கோதுமை சமர்ப்பித்து நெய் தீபம் ஏற்றுங்கள்; வழக்கப்படி முதலில் திருமங்கலக்குடி பிராணநாதேஸ்வரரைத் தரிசியுங்கள்.'),
    time: T('Sunday, sunrise to about 7:30 am (Surya horai)', 'ஞாயிறு, சூரிய உதயம் முதல் காலை சுமார் 7:30 வரை (சூரிய ஓரை)'),
    hymn: 'aditya-hrudayam',
    home: T('Offer water to the rising Sun (arghyam) and recite Aditya Hrudayam on Sundays; respect your father and elders.', 'ஞாயிறுதோறும் உதய சூரியனுக்கு அர்க்யம் கொடுத்து ஆதித்ய ஹிருதயம் சொல்லுங்கள்; தந்தை, பெரியோரை மதியுங்கள்.'),
  },
  Moon: {
    temple: 'thingalur', day: 1,
    reason: T('Thingalur Kailasanathar is the Navagraha sthalam of Chandra.', 'திங்களூர் கைலாசநாதர் கோவில் சந்திரனுக்கான நவகிரகத் தலம்.'),
    todo: T('Go on a Monday; offer milk or white flowers and pray for a calm mind; full-moon (Pournami) evenings are also traditional.', 'திங்கள் அன்று செல்லுங்கள்; பால் / வெண்மலர் சமர்ப்பித்து மன அமைதிக்கு வேண்டுங்கள்; பௌர்ணமி மாலையும் மரபு.'),
    time: T('Monday evening, or Pournami', 'திங்கள் மாலை, அல்லது பௌர்ணமி'),
    hymn: 'abhirami-anthadhi',
    home: T('A few minutes of quiet prayer to Ambal on Mondays; time with your mother; good sleep.', 'திங்கள்தோறும் அம்பாளிடம் சில நிமிட அமைதியான பிரார்த்தனை; தாயுடன் நேரம்; நல்ல உறக்கம்.'),
  },
  Mars: {
    temple: 'vaitheeswaran', day: 2,
    reason: T('Vaitheeswaran Kovil is the Navagraha sthalam of Angaraka (Sevvai) — the traditional place for Chevvai dosham and Mars afflictions.', 'வைத்தீஸ்வரன் கோவில் அங்காரகனுக்கான (செவ்வாய்) நவகிரகத் தலம் — செவ்வாய் தோஷத்திற்கு மரபான பரிகாரத் தலம்.'),
    todo: T('Go on a Tuesday; pray at the Angaraka shrine and to Selvamuthukumaraswamy (Murugan); offer red flowers / thuvarai (toor dal).', 'செவ்வாய் அன்று செல்லுங்கள்; அங்காரகன் சன்னிதியிலும் செல்வமுத்துக்குமார சுவாமியிடமும் (முருகன்) வழிபடுங்கள்; சிவப்பு மலர் / துவரை சமர்ப்பியுங்கள்.'),
    time: T('Tuesday morning (Sevvai horai)', 'செவ்வாய் காலை (செவ்வாய் ஓரை)'),
    hymn: 'kanda-sashti-kavasam',
    home: T('Recite Kanda Sashti Kavasam on Tuesdays; keep a short pause before reacting in anger; help siblings.', 'செவ்வாய்தோறும் கந்த சஷ்டி கவசம்; கோபத்தில் சற்று நிதானம்; உடன்பிறந்தோருக்கு உதவி.'),
  },
  Mercury: {
    temple: 'thiruvenkadu', day: 3,
    reason: T('Thiruvenkadu Swetharanyeswarar is the Navagraha sthalam of Budhan — traditional for a weak or combust Mercury.', 'திருவெண்காடு ஸ்வேதாரண்யேஸ்வரர் கோவில் புதனுக்கான நவகிரகத் தலம் — பலவீனமான / அஸ்தங்க புதனுக்கு மரபான பரிகாரம்.'),
    todo: T('Go on a Wednesday; pray at the Budhan shrine; offer green gram (pachai payaru) and green cloth.', 'புதன் அன்று செல்லுங்கள்; புதன் சன்னிதியில் வழிபடுங்கள்; பச்சைப் பயறு, பச்சை வஸ்திரம் சமர்ப்பியுங்கள்.'),
    time: T('Wednesday morning (Budhan horai)', 'புதன் காலை (புதன் ஓரை)'),
    hymn: 'vishnu-sahasranamam',
    home: T('Read Vishnu Sahasranamam on Wednesdays; learn something new each week; keep accounts and promises clear.', 'புதன்தோறும் விஷ்ணு சகஸ்ரநாமம்; வாரம் ஒன்றாவது புதிதாகக் கற்றல்; கணக்கும் வாக்கும் தெளிவாக.'),
  },
  Jupiter: {
    temple: 'alangudi', day: 4,
    reason: T('Alangudi Abathsahayeswarar is the Guru sthalam — Jupiter is the putra karaka (children) and a karaka for marriage.', 'ஆலங்குடி ஆபத்சகாயேஸ்வரர் குரு தலம் — குரு புத்திர காரகர், திருமணத்துக்கும் காரகர்.'),
    todo: T('Go on a Thursday; pray to Dakshinamurthy; offer chickpeas (kondai kadalai) and yellow flowers.', 'வியாழன் அன்று செல்லுங்கள்; தட்சிணாமூர்த்தியை வழிபடுங்கள்; கொண்டைக் கடலை, மஞ்சள் மலர் சமர்ப்பியுங்கள்.'),
    time: T('Thursday morning (Guru horai)', 'வியாழன் காலை (குரு ஓரை)'),
    hymn: null,
    home: T('Light a ghee lamp for Dakshinamurthy on Thursdays; honour your teachers; share what you know.', 'வியாழன்தோறும் தட்சிணாமூர்த்திக்கு நெய் தீபம்; ஆசிரியர்களை மதித்தல்; அறிவைப் பகிர்தல்.'),
  },
  Venus: {
    temple: 'kanjanur', day: 5,
    reason: T('Kanjanur Agneeswarar is the Sukran sthalam — Venus is the kalathra karaka (spouse, marriage).', 'கஞ்சனூர் அக்னீஸ்வரர் சுக்கிரன் தலம் — சுக்கிரன் களத்திர காரகர் (வாழ்க்கைத் துணை, திருமணம்).'),
    todo: T('Go on a Friday; offer white flowers and mochai (field beans); pray for harmony at home.', 'வெள்ளி அன்று செல்லுங்கள்; வெண்மலர், மொச்சை சமர்ப்பித்து குடும்ப ஒற்றுமைக்கு வேண்டுங்கள்.'),
    time: T('Friday morning (Sukra horai)', 'வெள்ளி காலை (சுக்கிர ஓரை)'),
    hymn: 'katyayani-mantra',
    home: T('Light a lamp for Mahalakshmi on Friday evenings; keep the home clean and peaceful; respect women.', 'வெள்ளி மாலை மகாலட்சுமிக்கு விளக்கு; வீட்டைச் சுத்தமாக, அமைதியாக வைத்தல்; பெண்களை மதித்தல்.'),
  },
  Saturn: {
    temple: 'thirunallar', day: 6,
    reason: T('Thirunallar Dharbaranyeswarar is the Sani sthalam — where King Nala is said to have been freed of Saturn\'s hold; traditional for every Sani affliction.', 'திருநள்ளாறு தர்பாரண்யேஸ்வரர் சனி தலம் — நள மகாராஜா சனியின் பிடியிலிருந்து விடுபட்ட தலம் என்பது மரபு; எல்லா சனி பாதிப்புக்கும் மரபான பரிகாரம்.'),
    todo: T('Go on a Saturday; bathe in the Nala theertham, pray to Dharbaranyeswarar and then at the Saneeswarar shrine; light a sesame-oil (nallennai) lamp and give food (annadhanam) if you can.', 'சனி அன்று செல்லுங்கள்; நள தீர்த்தத்தில் நீராடி, தர்பாரண்யேஸ்வரரை வழிபட்டு பின் சனீஸ்வரர் சன்னிதியில் நல்லெண்ணெய் தீபம் ஏற்றுங்கள்; முடிந்தால் அன்னதானம்.'),
    time: T('Saturday morning (Sani horai); Sani peyarchi days are very crowded', 'சனி காலை (சனி ஓரை); சனிப் பெயர்ச்சி நாட்களில் மிகுந்த கூட்டம்'),
    hymn: 'hanuman-chalisa',
    home: T('Light a sesame-oil lamp on Saturdays; recite Hanuman Chalisa; serve the elderly and workers; be punctual.', 'சனிதோறும் நல்லெண்ணெய் தீபம்; அனுமன் சாலீசா; முதியோர், உழைப்பாளிகளுக்குச் சேவை; நேரந்தவறாமை.'),
  },
  Rahu: {
    temple: 'thirunageswaram', day: null,
    reason: T('Thirunageswaram Naganathar is the Rahu sthalam, where Rahu is enshrined with his consorts.', 'திருநாகேஸ்வரம் நாகநாதர் ராகு தலம் — தேவியருடன் ராகு தனிச் சன்னிதியில்.'),
    todo: T('Go during Rahu Kalam (Sunday about 4:30–6 pm is the most popular); offer milk abhishekam to Rahu.', 'ராகு காலத்தில் செல்லுங்கள் (ஞாயிறு மாலை சுமார் 4:30–6 மிகப் பிரசித்தம்); ராகுவுக்குப் பாலபிஷேகம்.'),
    time: T('Rahu Kalam — Sunday ~4:30–6 pm, or Tuesday / Friday Rahu Kalam for Durga (check the Panchangam for your town)', 'ராகு காலம் — ஞாயிறு மாலை ~4:30–6, அல்லது செவ்வாய் / வெள்ளி ராகு காலத்தில் துர்க்கை (உங்கள் ஊர் பஞ்சாங்கத்தில் பாருங்கள்)'),
    hymn: 'durga-saptashloki',
    home: T('Light a lamp for Durga during Rahu Kalam on Tuesdays or Fridays; avoid shortcuts and addictions.', 'செவ்வாய் / வெள்ளி ராகு காலத்தில் துர்க்கைக்கு விளக்கு; குறுக்கு வழி, போதைகளைத் தவிர்த்தல்.'),
  },
  Ketu: {
    temple: 'keezhaperumpallam', day: 2,
    reason: T('Keezhaperumpallam Naganathar is the Ketu sthalam, near Poompuhar.', 'கீழப்பெரும்பள்ளம் நாகநாதர் கேது தலம் — பூம்புகார் அருகே.'),
    todo: T('Pray at the Ketu shrine; offer horse gram (kollu) and multi-coloured cloth; pray to Vinayagar first.', 'கேது சன்னிதியில் வழிபடுங்கள்; கொள்ளு, பல வண்ண வஸ்திரம் சமர்ப்பியுங்கள்; முதலில் விநாயகர் வழிபாடு.'),
    time: T('Tuesday, or Sankatahara Chathurthi for Vinayagar', 'செவ்வாய், அல்லது சங்கடஹர சதுர்த்தியில் விநாயகர் வழிபாடு'),
    hymn: 'vinayagar-agaval',
    home: T('Pray to Vinayagar before any work; Vinayagar Agaval; a few minutes of meditation daily.', 'எந்த வேலைக்கும் முன் விநாயகர் வழிபாடு; விநாயகர் அகவல்; தினமும் சில நிமிட தியானம்.'),
  },
};

/**
 * Per dosham kind: name, the classical condition in plain words, whether the label is disputed, the areas it is
 * traditionally read as delaying, the special sthalams (beyond the planets' own), day / time and a note.
 * `planets` for a kind are decided per chart by shared/dosham.js (e.g. the Lagna lord).
 */
export const DOSHAM_KINDS = {
  rahuketu: {
    name: T('Rahu–Ketu (Sarpa) dosham', 'ராகு–கேது (சர்ப்ப) தோஷம்'),
    temples: [
      { id: 'kalahasti', why: T('Sri Kalahasti is the best-known sthalam for Rahu–Ketu (sarpa) dosha nivarthi pooja.', 'ராகு–கேது (சர்ப்ப) தோஷ நிவர்த்தி பூஜைக்கு மிகப் பிரசித்தமான தலம் ஸ்ரீ காளஹஸ்தி.'), todo: T('Do the Rahu–Ketu sarpa dosha nivarthi pooja at the temple counter (official temple tickets only), then pray to Kalahasteeswarar and Gnana Prasunambika. Tradition says to return home directly afterwards.', 'கோவில் கவுண்டரில் (அதிகாரப்பூர்வ கோவில் சீட்டு மட்டும்) ராகு–கேது சர்ப்ப தோஷ நிவர்த்தி பூஜை செய்து, காளஹஸ்தீஸ்வரர், ஞானப்பிரசூனாம்பிகையை வழிபடுங்கள். பின் நேராக வீடு திரும்புவது மரபு.') },
      { id: 'thirunageswaram', why: T('Rahu\'s own sthalam.', 'ராகுவின் சொந்தத் தலம்.'), todo: T('Milk abhishekam to Rahu during Rahu Kalam.', 'ராகு காலத்தில் ராகுவுக்குப் பாலபிஷேகம்.') },
      { id: 'keezhaperumpallam', why: T('Ketu\'s own sthalam.', 'கேதுவின் சொந்தத் தலம்.'), todo: T('Prayer at the Ketu shrine; horse gram offering.', 'கேது சன்னிதியில் வழிபாடு; கொள்ளு சமர்ப்பணம்.') },
    ],
    note: T('In marriage matching it is compared only with the same dosham in the partner\'s chart (dosha samyam).', 'திருமணப் பொருத்தத்தில் துணையின் ஜாதகத்தில் உள்ள இதே தோஷத்துடன் மட்டுமே ஒப்பிடப்படும் (தோஷ சாம்யம்).'),
  },
  kalasarpa: {
    name: T('Kala Sarpa yoga', 'கால சர்ப்ப யோகம்'), nameAmirtha: T('Kala Amirtha yoga', 'கால அமிர்த யோகம்'), disputed: true,
    temples: [
      { id: 'kalahasti', why: T('Traditional place for Kala Sarpa / sarpa dosha pooja.', 'கால சர்ப்ப / சர்ப்ப தோஷ பூஜைக்கு மரபான தலம்.'), todo: T('Sarpa dosha nivarthi pooja through the official temple counter.', 'அதிகாரப்பூர்வ கோவில் கவுண்டர் மூலம் சர்ப்ப தோஷ நிவர்த்தி பூஜை.') },
      { id: 'thirupampuram', why: T('Rahu and Ketu worship Shiva together here — traditional for Kala Sarpa.', 'ராகுவும் கேதுவும் சேர்ந்து சிவனை வழிபடும் தலம் — கால சர்ப்பத்திற்கு மரபு.'), todo: T('Prayer and abhishekam to Seshapureeswarar; go during Rahu Kalam if you can.', 'சேஷபுரீஸ்வரருக்கு வழிபாடு, அபிஷேகம்; முடிந்தால் ராகு காலத்தில்.') },
    ],
    note: T('Traditional; some astrologers differ — many classical texts do not mention it, and many people with this placement live full, successful lives.', 'மரபு வழக்கு; சில ஜோதிடர்கள் ஏற்பதில்லை — பல மூல நூல்களில் இது இல்லை; இந்த அமைப்புடைய பலர் நிறைவான, வெற்றிகரமான வாழ்க்கை வாழ்கின்றனர்.'),
  },
  naga: {
    name: T('Naga dosham', 'நாக தோஷம்'), disputed: true,
    temples: [
      { id: 'nagercoil_nagaraja', why: T('The Nagaraja temple is the traditional place for naga dosha relief.', 'நாக தோஷ நிவர்த்திக்கு மரபான தலம் நாகராஜா கோவில்.'), todo: T('Prayer to Nagaraja; Aayilyam (Ashlesha) star days are special.', 'நாகராஜாவை வழிபடுதல்; ஆயில்ய நட்சத்திர நாட்கள் சிறப்பு.') },
      { id: 'thirupampuram', why: T('Sarpa parihara sthalam.', 'சர்ப்ப பரிகாரத் தலம்.'), todo: T('Prayer to Seshapureeswarar.', 'சேஷபுரீஸ்வரர் வழிபாடு.') },
      { id: 'thirunageswaram', why: T('Naganathar — Rahu sthalam.', 'நாகநாதர் — ராகு தலம்.'), todo: T('Milk abhishekam during Rahu Kalam.', 'ராகு காலத்தில் பாலபிஷேகம்.') },
    ],
    note: T('Traditional; some astrologers differ. Also, simply: do not harm snakes or their homes (anthills) — the oldest form of this practice.', 'மரபு வழக்கு; சில ஜோதிடர்கள் ஏற்பதில்லை. எளிமையாக: பாம்புகளையும் புற்றுகளையும் சேதப்படுத்தாமல் இருப்பதே இதன் பழமையான வழி.'),
  },
  chevvai: {
    name: T('Chevvai (Mangal) dosham', 'செவ்வாய் தோஷம்'),
    temples: [{ id: 'vaitheeswaran', why: T('Angaraka (Sevvai) sthalam.', 'அங்காரகன் (செவ்வாய்) தலம்.'), todo: T('Tuesday prayer at the Angaraka shrine; red flowers, thuvarai.', 'செவ்வாய் அன்று அங்காரகன் சன்னிதியில் வழிபாடு; சிவப்பு மலர், துவரை.') }],
    note: T('Very common. In matching it is compared like with like (dosha samyam), so a good match is always possible.', 'மிகப் பொதுவானது. பொருத்தத்தில் ஒத்ததோடு ஒப்பிடப்படுகிறது (தோஷ சாம்யம்); நல்ல பொருத்தம் எப்போதும் சாத்தியம்.'),
  },
  sani: { name: T('Sani dosham', 'சனி தோஷம்'), temples: [] },
  sanisevvai: { name: T('Sani–Sevvai sambandham', 'சனி–செவ்வாய் சம்பந்தம்'), temples: [] },
  lagnalord: { name: T('Lagnadhipathi in a hidden house', 'லக்னாதிபதி மறைவு ஸ்தானத்தில்'), temples: [] },
  lord5: { name: T('5th lord in a hidden house', '5-ம் அதிபதி மறைவு ஸ்தானத்தில்'), temples: [] },
  lord7: { name: T('7th lord in a hidden house', '7-ம் அதிபதி மறைவு ஸ்தானத்தில்'), temples: [] },
  combust: { name: T('Combust planet (moudyam / asthangam)', 'அஸ்தங்கம் (மௌட்யம்)'), temples: [] },
  putra: {
    name: T('Putra (santhana) dosham', 'புத்திர (சந்தான) தோஷம்'),
    temples: [
      { id: 'thirukarugavur', why: T('Garbharakshambigai — traditionally prayed to for children and a safe pregnancy.', 'கர்ப்பரக்ஷாம்பிகை — குழந்தை பாக்கியம், சுகப்பிரசவத்திற்கு மரபான வழிபாடு.'), todo: T('Couples pray together; the custom of offering ghee to the Goddess and taking the blessed ghee home is widely followed — ask at the temple.', 'தம்பதியர் சேர்ந்து வழிபடுவது; அம்பாளுக்கு நெய் சமர்ப்பித்து, பிரசாத நெய்யை வீட்டுக்கு எடுத்துச் செல்லும் வழக்கம் பரவலானது — கோவிலில் கேட்டறியுங்கள்.') },
      { id: 'rameswaram', why: T('Sethu snanam and prayer at Rameswaram are traditional for putra dosham and for ancestors.', 'புத்திர தோஷத்திற்கும் முன்னோர்களுக்கும் ராமேஸ்வரத்தில் சேது ஸ்நானம், வழிபாடு மரபு.'), todo: T('Holy bath at Agni theertham, then the theerthams inside, and prayer to Ramanathaswamy.', 'அக்னி தீர்த்தத்தில் நீராடி, உள்ளே உள்ள தீர்த்தங்கள், ராமநாதசுவாமி வழிபாடு.') },
      { id: 'alangudi', why: T('Guru sthalam — Jupiter is the putra karaka.', 'குரு தலம் — குரு புத்திர காரகர்.'), todo: T('Thursday prayer to Dakshinamurthy.', 'வியாழன் தட்சிணாமூர்த்தி வழிபாடு.') },
    ],
    home: { hymn: 'santhana-gopala-mantra', text: T('Santhana Gopala mantra daily, and the Sashti viratham for Murugan (tradition: "Sashtiyil irundhal agappaiyil varum").', 'தினமும் சந்தான கோபால மந்திரம்; முருகனுக்குச் சஷ்டி விரதம் ("சஷ்டியில் இருந்தால் அகப்பையில் வரும்" என்பது மரபுச் சொல்).') },
    doctor: T('Please also consult a fertility specialist together, as a couple — prayer and medical care go hand in hand.', 'தம்பதியர் இருவரும் சேர்ந்து குழந்தைப்பேறு சிறப்பு மருத்துவரையும் அணுகுங்கள் — வழிபாடும் மருத்துவமும் கைகோர்த்துச் செல்லட்டும்.'),
  },
  kalathra: {
    name: T('Kalathra dosham (marriage-house affliction)', 'களத்திர தோஷம்'),
    temples: [
      { id: 'thirumanancheri', why: T('Kalyanasundareswarar — the best-known sthalam for removing marriage delays.', 'கல்யாணசுந்தரேஸ்வரர் — திருமணத் தடை நீக்கத்துக்கு மிகப் பிரசித்தமான தலம்.'), todo: T('Offer two garlands; take one home as prasadam, and return together after the wedding to give thanks (the custom there).', 'இரண்டு மாலை சாற்றி, ஒன்றைப் பிரசாதமாக வீட்டுக்கு எடுத்துச் செல்லுங்கள்; திருமணத்திற்குப் பின் தம்பதியராக வந்து நன்றி செலுத்துவது அங்கு வழக்கம்.') },
      { id: 'srinivasa_mangapuram', why: T('Kalyana Venkateswara — prayed to for a good alliance.', 'கல்யாண வெங்கடேஸ்வரர் — நல்ல வரனுக்காக வேண்டுதல்.'), todo: T('Prayer on a Friday or Saturday; Kalyanotsavam seva if available.', 'வெள்ளி / சனி வழிபாடு; வாய்ப்பிருந்தால் கல்யாணோற்சவ சேவை.') },
      { id: 'thiruvidanthai', why: T('Nithya Kalyana Perumal — known for removing marriage obstacles.', 'நித்ய கல்யாணப் பெருமாள் — திருமணத் தடை நீக்கம்.'), todo: T('Prayer with a garland.', 'மாலையுடன் வழிபாடு.') },
    ],
    home: { hymn: 'katyayani-mantra', text: T('The Katyayani mantra (traditional for marriage) on Fridays, with a lamp for Mahalakshmi or Ambal.', 'வெள்ளிதோறும் காத்யாயனி மந்திரம் (திருமணத்திற்கு மரபு), மகாலட்சுமி / அம்பாளுக்கு விளக்கு.') },
  },
  pitru: {
    name: T('Pitru dosham', 'பித்ரு தோஷம்'), disputed: true,
    temples: [
      { id: 'rameswaram', why: T('The foremost place for pitru tharpanam and Sethu snanam.', 'பித்ரு தர்ப்பணம், சேது ஸ்நானத்திற்கு முதன்மையான தலம்.'), todo: T('Tharpanam on Amavasai at Agni theertham with a priest, then prayer to Ramanathaswamy.', 'அமாவாசையில் அக்னி தீர்த்தத்தில் புரோகிதர் மூலம் தர்ப்பணம், பின் ராமநாதசுவாமி வழிபாடு.') },
      { id: 'thilatharpanapuri', why: T('Thila (sesame) tharpanam sthalam where Rama is said to have offered tharpanam for Dasaratha.', 'ராமர் தசரதருக்குத் தர்ப்பணம் செய்ததாகக் கூறப்படும் தில தர்ப்பண தலம்.'), todo: T('Thila tharpanam on Amavasai; prayer to Muktheeswarar and Adi Vinayagar.', 'அமாவாசையில் தில தர்ப்பணம்; முக்தீஸ்வரர், ஆதி விநாயகர் வழிபாடு.') },
      { id: 'thiruvallur_veeraraghava', why: T('Amavasai worship and tharpanam are traditional at Veeraraghava Perumal.', 'வீரராகவப் பெருமாள் கோவிலில் அமாவாசை வழிபாடு, தர்ப்பணம் மரபு.'), todo: T('Amavasai darshan; tharpanam near the tank as the priests guide.', 'அமாவாசை தரிசனம்; புரோகிதர் வழிகாட்டலில் தீர்த்தக் கரையில் தர்ப்பணம்.') },
    ],
    home: { hymn: null, text: T('On every Amavasai: tharpanam (or simply a prayer for your ancestors), feed crows and give food to someone in need.', 'ஒவ்வொரு அமாவாசையிலும் தர்ப்பணம் (அல்லது முன்னோர்களுக்கு ஒரு பிரார்த்தனை), காகத்திற்கு அன்னம், தேவையுள்ளவருக்கு உணவு.') },
    note: T('Traditional; some astrologers differ on how it is read from a chart. Honouring parents and ancestors is good in every tradition.', 'மரபு வழக்கு; ஜாதகத்தில் இதைப் பார்க்கும் முறையில் ஜோதிடர்கள் வேறுபடுகின்றனர். பெற்றோரையும் முன்னோரையும் போற்றுவது எல்லா மரபிலும் நல்லதே.'),
  },
  guruchandala: {
    name: T('Guru Chandala yoga', 'குரு சண்டாள யோகம்'), disputed: true,
    temples: [{ id: 'alangudi', why: T('Guru sthalam.', 'குரு தலம்.'), todo: T('Thursday prayer to Dakshinamurthy.', 'வியாழன் தட்சிணாமூர்த்தி வழிபாடு.') }, { id: 'thirunageswaram', why: T('Rahu sthalam.', 'ராகு தலம்.'), todo: T('Milk abhishekam to Rahu in Rahu Kalam.', 'ராகு காலத்தில் ராகுவுக்குப் பாலபிஷேகம்.') }],
    note: T('Traditional; some astrologers differ. Respecting teachers and elders is the simplest remedy.', 'மரபு வழக்கு; சில ஜோதிடர்கள் ஏற்பதில்லை. ஆசிரியர், பெரியோரை மதிப்பதே எளிய பரிகாரம்.'),
  },
  shrapit: {
    name: T('Shrapit (Sani–Rahu) yoga', 'சனி–ராகு சேர்க்கை (ஷ்ராபித்)'), disputed: true,
    temples: [{ id: 'thirunallar', why: T('Sani sthalam.', 'சனி தலம்.'), todo: T('Saturday — Nala theertham bath and sesame-oil lamp.', 'சனி அன்று நள தீர்த்த நீராடல், நல்லெண்ணெய் தீபம்.') }, { id: 'thirunageswaram', why: T('Rahu sthalam.', 'ராகு தலம்.'), todo: T('Milk abhishekam in Rahu Kalam.', 'ராகு காலத்தில் பாலபிஷேகம்.') }],
    note: T('Traditional; some astrologers differ — many do not use this label at all.', 'மரபு வழக்கு; சில ஜோதிடர்கள் இந்தப் பெயரையே பயன்படுத்துவதில்லை.'),
  },
  grahana: {
    name: T('Grahana dosham (Sun / Moon with Rahu or Ketu)', 'கிரகண தோஷம் (சூரியன் / சந்திரன் – ராகு / கேது சேர்க்கை)'), disputed: true,
    temples: [{ id: 'kalahasti', why: T('Sri Kalahasti is traditionally visited for grahana dosha nivarthi.', 'கிரகண தோஷ நிவர்த்திக்கு ஸ்ரீ காளஹஸ்தி மரபு.'), todo: T('Rahu–Ketu pooja through the official counter.', 'அதிகாரப்பூர்வ கவுண்டர் மூலம் ராகு–கேது பூஜை.') }],
    note: T('A sign placement only — not an eclipse in the sky. Traditional; some astrologers differ.', 'இது ராசி அமைப்பு மட்டுமே — வானில் நிகழும் கிரகணம் அல்ல. மரபு வழக்கு; சில ஜோதிடர்கள் ஏற்பதில்லை.'),
  },
  kemadruma: {
    name: T('Kemadruma yoga', 'கேமத்ரும யோகம்'),
    temples: [{ id: 'thingalur', why: T('Chandra sthalam — Kemadruma is a Moon configuration.', 'சந்திர தலம் — கேமத்ருமம் சந்திரன் சார்ந்த அமைப்பு.'), todo: T('Monday prayer; milk offering.', 'திங்கள் வழிபாடு; பால் சமர்ப்பணம்.') }],
  },
  sanitransit: {
    name: T('Sani transit (Ezharai / Ashtama / Ardhashtama Sani)', 'சனி கோசாரம் (ஏழரை / அஷ்டம / அர்த்தாஷ்டம சனி)'),
    temples: [{ id: 'thirunallar', why: T('Sani sthalam — the classic place during Ezharai Sani.', 'சனி தலம் — ஏழரைச் சனியில் மரபான தலம்.'), todo: T('Saturday — Nala theertham bath, sesame-oil lamp.', 'சனி — நள தீர்த்த நீராடல், நல்லெண்ணெய் தீபம்.') }, { id: 'kuchanur', why: T('Swayambu Saneeswarar.', 'சுயம்பு சனீஸ்வரர்.'), todo: T('Saturday prayer.', 'சனி வழிபாடு.') }],
  },
};

/** What NOT to do — shown with every plan (free practices first; no fear; no paid "guarantees"). */
export const AVOID = [
  T('No fear: a dosham is a tendency in the chart, not a curse — and it has a nivarthi.', 'பயம் வேண்டாம்: தோஷம் ஜாதகத்தில் உள்ள ஒரு போக்கு; சாபம் அல்ல — நிவர்த்தி உண்டு.'),
  T('Do not pay for costly poojas or homams sold with a "guarantee" — free prayer, lamp and charity come first; temple poojas only through official temple counters.', 'விலையுயர்ந்த பூஜை, ஹோமங்களை "உத்தரவாதம்" என்று விற்றால் பணம் கொடுக்க வேண்டாம் — இலவச வழிபாடு, தீபம், தானமே முதலில்; கோவில் பூஜை அதிகாரப்பூர்வ கோவில் கவுண்டரில் மட்டும்.'),
  T('Do not wear a gemstone without a careful second opinion — it is not needed for nivarthi.', 'கவனமான இரண்டாவது கருத்து இல்லாமல் ரத்தினம் அணிய வேண்டாம் — நிவர்த்திக்கு அது தேவையில்லை.'),
  T('Do not stop practical effort, medical care or official steps while doing parigaram — both go together.', 'பரிகாரம் செய்யும்போது நடைமுறை முயற்சி, மருத்துவம், அதிகாரப்பூர்வ நடவடிக்கைகளை நிறுத்த வேண்டாம் — இரண்டும் சேர்ந்தே.'),
];

/** The fixed framing lines (product rules: no fear, tradition-not-guarantee). */
export const FRAMING = {
  notCurse: T('A dosham is not a curse — there is a nivarthi.', 'தோஷம் சாபம் அல்ல — நிவர்த்தி உண்டு.'),
  belief: T('Tradition says many people who did their parigaram saw good change — this is belief and tradition, not a guarantee.', 'பரிகாரம் செய்தவர்கள் பலர் நல்ல மாற்றம் கண்டதாக மரபு சொல்கிறது — இது நம்பிக்கை சார்ந்தது, உத்தரவாதம் அல்ல.'),
  review: T('These readings are drafted from traditional rules and await review by a senior astrologer.', 'இவை மரபு விதிகளிலிருந்து தொகுக்கப்பட்டவை; மூத்த ஜோதிடரின் சரிபார்ப்புக்குக் காத்திருக்கின்றன.'),
  delayNotDenial: T('A delay shown by tradition is a delay, not a denial.', 'மரபு காட்டும் தாமதம் தாமதமே; மறுப்பு அல்ல.'),
};

/** Severity labels (never the word "severe"; strong = more traditional factors together). */
export const SEVERITY = {
  mild: T('Mild', 'லேசானது'),
  moderate: T('Moderate', 'மிதமானது'),
  strong: T('Strong', 'வலுவானது'),
};
