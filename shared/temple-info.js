// Temple details: highlights (sirappu), what devotees pray for, short thala varalaru, travel and festivals.
// Facts are kept to traditional, widely documented accounts and phrased modestly.
// Timings and distances are APPROXIMATE and change with festivals and seasons — the official
// HR&CE (hrce.tn.gov.in) / temple devasthanam website is the source of truth.
import { TEMPLES, distanceKm } from './temples.js';

const B = (en, ta) => ({ en, ta });

// Major airports; the nearest one is picked automatically and road distance estimated (~1.3 x straight line).
const AIRPORTS = [
  { code: 'MAA', en: 'Chennai', ta: 'சென்னை', lat: 12.9941, lon: 80.1709 },
  { code: 'TRZ', en: 'Tiruchirappalli', ta: 'திருச்சி', lat: 10.7654, lon: 78.7097 },
  { code: 'IXM', en: 'Madurai', ta: 'மதுரை', lat: 9.8345, lon: 78.0934 },
  { code: 'CJB', en: 'Coimbatore', ta: 'கோவை', lat: 11.0300, lon: 77.0434 },
  { code: 'TIR', en: 'Tirupati', ta: 'திருப்பதி', lat: 13.6325, lon: 79.5433 },
  { code: 'TRV', en: 'Thiruvananthapuram', ta: 'திருவனந்தபுரம்', lat: 8.4821, lon: 76.9201 },
  { code: 'COK', en: 'Kochi', ta: 'கொச்சி', lat: 10.1520, lon: 76.4019 },
  { code: 'TCR', en: 'Thoothukudi', ta: 'தூத்துக்குடி', lat: 8.7242, lon: 78.0258 },
];

const roundKm = (km) => (km < 10 ? Math.max(1, Math.round(km)) : Math.round(km / 5) * 5);

function nearestAirport(t) {
  const best = AIRPORTS.map((a) => ({ a, km: distanceKm(t.lat, t.lon, a.lat, a.lon) * 1.3 })).sort((x, y) => x.km - y.km)[0];
  const km = roundKm(best.km);
  return B(`${best.a.en} (${best.a.code}) ~${km} km`, `${best.a.ta} விமான நிலையம் (~${km} கி.மீ)`);
}

const rail = (en, ta, km) => B(`${en} ~${km} km`, `${ta} (~${km} கி.மீ)`);

// Timings: ranges in 24h 'H:MM'; Tamil uses காலை / மதியம் / மாலை / இரவு with 12-hour clock.
const period = (h) => (h < 12 ? 'காலை' : h < 16 ? 'மதியம்' : h < 19 ? 'மாலை' : 'இரவு');
const h12 = (s) => { const [h, m] = s.split(':').map(Number); return `${h > 12 ? h - 12 : h === 0 ? 12 : h}:${String(m).padStart(2, '0')}`; };
const hour = (s) => Number(s.split(':')[0]);
function tm(ranges, noteEn = '', noteTa = '') {
  const en = `approx. ${ranges.map(([a, b]) => `${a}–${b}`).join(', ')}${noteEn ? ` (${noteEn})` : ''}`;
  const ta = `சுமார் ${ranges.map(([a, b]) => (period(hour(a)) === period(hour(b))
    ? `${period(hour(a))} ${h12(a)}–${h12(b)}`
    : `${period(hour(a))} ${h12(a)} – ${period(hour(b))} ${h12(b)}`)).join(', ')}${noteTa ? ` (${noteTa})` : ''}`;
  return { ...B(en, ta), ranges };
}
const STD = tm([['6:00', '12:00'], ['16:00', '20:30']]);
const VILLAGE = tm([['6:30', '12:00'], ['16:30', '20:00']]);

// Per temple: s = sirappu, p = power, v = varalaru, r = rail [en, ta, km], t = timings, f = festival
const RAW = {
  madurai_meenakshi: {
    s: B('A vast temple city with 14 gopurams, the golden lotus tank and the thousand-pillar hall.', 'பதினான்கு கோபுரங்கள், பொற்றாமரைக் குளம், ஆயிரங்கால் மண்டபம் கொண்ட கோவில் நகரம்.'),
    p: B('Marriage, family harmony and blessings of the Mother.', 'திருமணம், குடும்ப ஒற்றுமை, அன்னையின் அருள்.'),
    v: B('Meenakshi, born to the Pandya king, ruled Madurai and married Lord Sundareswarar here. Shiva\'s 64 sacred plays (Thiruvilaiyadal) are set in this city.', 'பாண்டிய மன்னனின் மகளாகப் பிறந்த மீனாட்சி மதுரையை ஆண்டு சுந்தரேஸ்வரரை மணந்தாள். சிவனின் அறுபத்து நான்கு திருவிளையாடல்கள் இங்கு நிகழ்ந்தன.'),
    r: ['Madurai Junction', 'மதுரை சந்திப்பு', 1.5], t: tm([['5:00', '12:30'], ['16:00', '21:30']]),
    f: B('Chithirai Thiruvizha (celestial wedding)', 'சித்திரைத் திருவிழா (திருக்கல்யாணம்)'),
  },
  srirangam: {
    s: B('The largest functioning Hindu temple complex, set on an island between the Cauvery and Kollidam.', 'காவிரி, கொள்ளிடம் இடையே தீவில் அமைந்த மிகப் பெரிய வழிபாட்டுக் கோவில் வளாகம்.'),
    p: B('Moksha, prosperity and relief from troubles.', 'முக்தி, செல்வம், துன்ப நீக்கம்.'),
    v: B('The Ranganatha idol, worshipped by Rama, was given to Vibhishana; it settled here on the way to Lanka. The temple is praised by all the Azhwars.', 'ராமர் வழிபட்ட ரங்கநாதர் விக்கிரகம் விபீஷணனுக்கு அளிக்கப்பட்டு, இலங்கை செல்லும் வழியில் இங்கு நிலைகொண்டது. ஆழ்வார்கள் பாடிய தலம்.'),
    r: ['Srirangam', 'ஸ்ரீரங்கம்', 1.5], t: tm([['6:00', '13:00'], ['15:00', '21:00']]),
    f: B('Vaikunta Ekadasi', 'வைகுண்ட ஏகாதசி'),
  },
  thanjavur_big: {
    s: B('Chola masterpiece with a soaring vimanam and a huge monolithic Nandi.', 'உயர்ந்த விமானமும் ஒற்றைக்கல் பெரிய நந்தியும் கொண்ட சோழர் கலைப் பொக்கிஷம்.'),
    p: B('Success, authority and removal of obstacles.', 'வெற்றி, பதவி உயர்வு, தடைகள் நீக்கம்.'),
    v: B('Built by Raja Raja Chola I and completed around 1010 CE. It is part of the UNESCO Great Living Chola Temples.', 'முதலாம் ராஜராஜ சோழன் சுமார் கி.பி. 1010-ல் கட்டி முடித்தான். உலகப் பாரம்பரியச் சின்னங்களில் ஒன்று.'),
    r: ['Thanjavur Junction', 'தஞ்சாவூர் சந்திப்பு', 2], t: tm([['6:00', '12:30'], ['16:00', '20:30']]),
    f: B('Sadhaya Vizha (Raja Raja\'s birth star) and Maha Shivaratri', 'சதய விழா, மகா சிவராத்திரி'),
  },
  rameswaram: {
    s: B('Jyotirlinga with the longest temple corridors and 22 sacred wells.', 'நீண்ட பிரகாரங்களும் 22 தீர்த்தங்களும் கொண்ட ஜோதிர்லிங்கத் தலம்.'),
    p: B('Pitru tarpanam, removal of sins and doshas.', 'பித்ரு தர்ப்பணம், பாவ, தோஷ நிவர்த்தி.'),
    v: B('Rama worshipped a sand lingam made by Sita here after the war in Lanka. A second lingam brought by Hanuman is also worshipped.', 'இலங்கைப் போருக்குப் பின் சீதை செய்த மணல் லிங்கத்தை ராமர் வழிபட்டார். அனுமன் கொண்டுவந்த லிங்கமும் வழிபடப்படுகிறது.'),
    r: ['Rameswaram', 'ராமேஸ்வரம்', 2], t: tm([['5:00', '13:00'], ['15:00', '21:00']]),
    f: B('Maha Shivaratri and Aadi Amavasai', 'மகா சிவராத்திரி, ஆடி அமாவாசை'),
  },
  chidambaram: {
    s: B('Nataraja\'s cosmic dance in the golden hall; the Chidambara Rahasyam of space.', 'பொன்னம்பலத்தில் நடராஜரின் ஆனந்தத் தாண்டவம்; சிதம்பர ரகசியம்.'),
    p: B('Wisdom, arts, dance and liberation.', 'ஞானம், கலை, நடனம், முக்தி.'),
    v: B('Shiva danced here for the sages Patanjali and Vyaghrapada. The Chola kings covered the hall with gold.', 'பதஞ்சலி, வியாக்ரபாதர் முனிவர்களுக்காக சிவன் இங்கு நடனம் ஆடினார். சோழ மன்னர்கள் சபைக்குப் பொன் வேய்ந்தனர்.'),
    r: ['Chidambaram', 'சிதம்பரம்', 1.5], t: tm([['6:00', '12:00'], ['17:00', '22:00']]),
    f: B('Margazhi Arudra Darisanam and Aani Thirumanjanam', 'மார்கழி ஆருத்ரா தரிசனம், ஆனித் திருமஞ்சனம்'),
  },
  tiruvannamalai: {
    s: B('The hill itself is worshipped as Shiva; the Karthigai Deepam is lit on its summit.', 'மலையே சிவனாக வணங்கப்படுகிறது; உச்சியில் கார்த்திகை தீபம்.'),
    p: B('Inner peace, removal of karma, spiritual progress.', 'மன அமைதி, கர்ம நிவர்த்தி, ஆன்மிக உயர்வு.'),
    v: B('Shiva appeared as an endless column of fire when Brahma and Vishnu sought his head and feet. The column became the Arunachala hill.', 'பிரம்மனும் விஷ்ணுவும் அடிமுடி தேடியபோது சிவன் அளவற்ற அக்னிப் பிழம்பாகத் தோன்றினார்; அதுவே அருணாசல மலை.'),
    r: ['Tiruvannamalai', 'திருவண்ணாமலை', 1.5], t: tm([['5:30', '12:30'], ['15:30', '21:30']]),
    f: B('Karthigai Deepam', 'கார்த்திகை தீபம்'),
  },
  kanchi_ekambaram: {
    s: B('Earth lingam (Prithvi) under a sacred mango tree; one of the tallest gopurams.', 'புனித மாமரத்தடியில் மண் லிங்கம்; உயர்ந்த ராஜகோபுரம்.'),
    p: B('Marriage, union of couples and stability.', 'திருமணம், தம்பதியர் ஒற்றுமை, நிலைத்தன்மை.'),
    v: B('Parvati made a lingam of sand under the mango tree and held it fast when the Kampa river flooded. Pleased, Shiva married her here.', 'பார்வதி மாமரத்தடியில் மணல் லிங்கம் அமைத்து, கம்பா நதி வெள்ளத்தில் அதை அணைத்துக் காத்தாள்; மகிழ்ந்த சிவன் அவளை மணந்தார்.'),
    r: ['Kanchipuram', 'காஞ்சிபுரம்', 2], t: tm([['6:00', '12:30'], ['16:00', '20:30']]),
    f: B('Panguni Uthiram', 'பங்குனி உத்திரம்'),
  },
  thiruvanaikaval: {
    s: B('Water lingam (Appu) with a spring that keeps the sanctum moist.', 'கருவறையில் எப்போதும் நீர் ஊறும் அப்பு லிங்கம்.'),
    p: B('Knowledge, health and relief from sins.', 'கல்வி, உடல்நலம், பாவ நிவர்த்தி.'),
    v: B('Parvati as Akilandeswari worshipped a lingam made of Cauvery water under a jambu (naaval) tree. An elephant and a spider also worshipped here.', 'அகிலாண்டேஸ்வரியாக பார்வதி நாவல் மரத்தடியில் காவிரி நீரால் லிங்கம் அமைத்து வழிபட்டாள். யானையும் சிலந்தியும் வழிபட்ட தலம்.'),
    r: ['Srirangam', 'ஸ்ரீரங்கம்', 3], t: tm([['6:00', '13:00'], ['15:00', '21:00']]),
    f: B('Panguni Brahmotsavam', 'பங்குனிப் பிரம்மோற்சவம்'),
  },
  kalahasti: {
    s: B('Air lingam (Vayu) where the lamp flame flickers in the closed sanctum.', 'மூடிய கருவறையிலும் தீபச் சுடர் அசையும் வாயு லிங்கம்.'),
    p: B('Rahu-Ketu dosha parihara and naga dosha relief.', 'ராகு கேது தோஷ பரிகாரம், நாக தோஷ நிவர்த்தி.'),
    v: B('A spider (sri), a serpent (kala) and an elephant (hasti) worshipped Shiva here and gained moksha. The hunter-saint Kannappar offered his eyes here.', 'சிலந்தி, பாம்பு, யானை சிவனை வழிபட்டு முக்தி பெற்றன. கண்ணப்ப நாயனார் தம் கண்களைப் படைத்த தலம்.'),
    r: ['Srikalahasti', 'ஸ்ரீகாளஹஸ்தி', 2.5], t: tm([['6:00', '21:00']]),
    f: B('Maha Shivaratri Brahmotsavam', 'மகா சிவராத்திரி பிரம்மோற்சவம்'),
  },
  kanchi_kamakshi: {
    s: B('Shakti Peetha where the Mother sits in Padmasana; Sri Chakra worship.', 'பத்மாசனக் கோலத்தில் அன்னை; ஸ்ரீ சக்ர வழிபாடு கொண்ட சக்தி பீடம்.'),
    p: B('Marriage, children and family welfare.', 'திருமணம், குழந்தைப் பேறு, குடும்ப நலன்.'),
    v: B('Kamakshi is believed to have done penance here and subdued the demon Bhandasura. Adi Shankara is said to have installed the Sri Chakra.', 'காமாட்சி இங்கு தவம் செய்து பண்டாசுரனை அடக்கியதாக ஐதீகம். ஆதி சங்கரர் ஸ்ரீ சக்கரம் பிரதிஷ்டை செய்ததாகக் கூறப்படுகிறது.'),
    r: ['Kanchipuram', 'காஞ்சிபுரம்', 1.5], t: tm([['5:30', '12:30'], ['16:00', '21:00']]),
    f: B('Masi Brahmotsavam and Navaratri', 'மாசிப் பிரம்மோற்சவம், நவராத்திரி'),
  },
  kanchi_varadaraja: {
    s: B('Touching the golden and silver lizards; Athi Varadar emerges once in 40 years.', 'தங்க, வெள்ளிப் பல்லி தரிசனம்; நாற்பது ஆண்டுக்கு ஒருமுறை அத்தி வரதர்.'),
    p: B('Relief from lizard-fall dosha, wishes granted.', 'பல்லி விழுந்த தோஷ நிவர்த்தி, வேண்டுதல் நிறைவேற்றம்.'),
    v: B('Vishnu appeared from Brahma\'s sacrificial fire as Varadaraja, the giver of boons. The wooden Athi Varadar rests in the temple tank.', 'பிரம்மனின் யாகத்தில் வரம் தரும் வரதராஜராக விஷ்ணு தோன்றினார். அத்தி மர வரதர் திருக்குளத்தில் உறைகிறார்.'),
    r: ['Kanchipuram', 'காஞ்சிபுரம்', 3], t: tm([['6:00', '12:00'], ['16:00', '20:00']]),
    f: B('Vaikasi Brahmotsavam (Garuda Sevai)', 'வைகாசிப் பிரம்மோற்சவம் (கருட சேவை)'),
  },
  thiruparankundram: {
    s: B('Rock-cut cave temple at the foot of a hill; first of the six abodes.', 'மலையடிவாரக் குடைவரைக் கோவில்; முதல் படை வீடு.'),
    p: B('Marriage and married life.', 'திருமணம், இல்லற வாழ்வு.'),
    v: B('After defeating Soorapadman, Murugan married Deivanai, daughter of Indra, here. Many deities are carved in the rock sanctum.', 'சூரபத்மனை வென்ற முருகன் இந்திரனின் மகள் தெய்வானையை இங்கு மணந்தார். குடைவரையில் பல தெய்வங்கள் உள்ளன.'),
    r: ['Madurai Junction', 'மதுரை சந்திப்பு', 8], t: tm([['5:30', '13:00'], ['16:00', '21:00']]),
    f: B('Panguni Uthiram and Kanda Sashti', 'பங்குனி உத்திரம், கந்த சஷ்டி'),
  },
  tiruchendur: {
    s: B('The only Padai Veedu on the seashore; sea bath before darshan.', 'கடற்கரையில் அமைந்த ஒரே படை வீடு; கடல் நீராடி தரிசனம்.'),
    p: B('Victory over enemies, health and relief from troubles.', 'பகை வெற்றி, உடல்நலம், துன்ப நீக்கம்.'),
    v: B('Murugan camped here and vanquished the demon Soorapadman. He then worshipped Shiva here, which is shown in the sanctum.', 'முருகன் இங்கு தங்கி சூரபத்மனை வதம் செய்தார். பின் சிவனை வழிபட்ட கோலம் கருவறையில் உள்ளது.'),
    r: ['Tiruchendur', 'திருச்செந்தூர்', 1], t: tm([['5:00', '21:00']]),
    f: B('Kanda Sashti Soorasamharam', 'கந்த சஷ்டி சூரசம்ஹாரம்'),
  },
  palani: {
    s: B('Hill shrine with the Navapashana idol; reached by steps, winch or rope car.', 'நவபாஷாண சிலை கொண்ட மலைக்கோவில்; படிகள், இழுவை ரயில், கம்பி வடம் மூலம் செல்லலாம்.'),
    p: B('Health, renunciation of ego and fulfilment of vows.', 'உடல்நலம், அகந்தை நீக்கம், நேர்த்திக்கடன் நிறைவேற்றம்.'),
    v: B('Upset at losing the divine fruit to Ganesha, Murugan came here as a renunciant. Shiva consoled him saying "you are the fruit" (Pazham Nee).', 'ஞானப்பழம் விநாயகருக்குச் சென்றதால் முருகன் துறவுக் கோலத்தில் இங்கு வந்தார். "பழம் நீ" என்று சிவன் சமாதானம் செய்தார்.'),
    r: ['Palani', 'பழனி', 1.5], t: tm([['6:00', '20:00']]),
    f: B('Thai Poosam', 'தைப்பூசம்'),
  },
  swamimalai: {
    s: B('Murugan as the guru of his own father, on a built-up hillock of 60 steps.', 'தந்தைக்கே குருவான முருகன்; அறுபது படிகள் கொண்ட கட்டுமலை.'),
    p: B('Education, wisdom and success in exams.', 'கல்வி, ஞானம், தேர்வு வெற்றி.'),
    v: B('Murugan explained the meaning of Om (Pranava) to Shiva here. Hence he is called Swaminathan.', 'பிரணவத்தின் பொருளை முருகன் சிவனுக்கு இங்கு உபதேசித்தார்; எனவே சுவாமிநாதர்.'),
    r: ['Kumbakonam', 'கும்பகோணம்', 8], t: tm([['6:00', '12:00'], ['16:00', '21:00']]),
    f: B('Vaikasi Visakam and Kanda Sashti', 'வைகாசி விசாகம், கந்த சஷ்டி'),
  },
  thiruthani: {
    s: B('Hill temple whose steps match the days of the year; New Year step pooja.', 'ஆண்டின் நாட்களுக்கேற்ற படிகள் கொண்ட மலைக்கோவில்; புத்தாண்டுப் படி பூஜை.'),
    p: B('Peace of mind and calm after anger.', 'மன அமைதி, சினம் தணிதல்.'),
    v: B('Murugan rested here, his anger calmed, after the battle with Soorapadman. He also married Valli at this place.', 'சூரபத்ம போருக்குப் பின் சினம் தணிந்து முருகன் இங்கு அமர்ந்தார்; வள்ளியை மணந்த தலமும் இதுவே.'),
    r: ['Tiruttani', 'திருத்தணி', 1.5], t: tm([['5:45', '21:00']]),
    f: B('Aadi Krithigai', 'ஆடிக் கிருத்திகை'),
  },
  pazhamudircholai: {
    s: B('Forest abode on the Alagar hills near the Noopura Gangai spring.', 'நூபுர கங்கை அருகே அழகர் மலைக் காட்டில் அமைந்த படை வீடு.'),
    p: B('Wisdom and humility.', 'ஞானம், பணிவு.'),
    v: B('Here Murugan, as a boy, tested Avvaiyar asking "do you want roasted or unroasted fruit?". The episode teaches humility of learning.', 'சிறுவனாக வந்த முருகன் "சுட்ட பழம் வேண்டுமா, சுடாத பழம் வேண்டுமா" என அவ்வையாரைச் சோதித்த தலம்.'),
    r: ['Madurai Junction', 'மதுரை சந்திப்பு', 25], t: tm([['6:00', '13:00'], ['16:00', '19:00']]),
    f: B('Kanda Sashti', 'கந்த சஷ்டி'),
  },
  mylapore: {
    s: B('Dravidian gopuram, Karpagambal shrine and a large temple tank in old Chennai.', 'திராவிடக் கோபுரம், கற்பகாம்பாள் சன்னிதி, பெரிய திருக்குளம்.'),
    p: B('Wishes granted by Karpagambal (the wish-giving Mother).', 'கற்பகத் தரு போல் வேண்டுதல் நிறைவேற்றும் அன்னை.'),
    v: B('Parvati worshipped Shiva here in the form of a peacock, giving the name Mylapore. Sambandar revived Poompavai from her ashes here.', 'பார்வதி மயில் வடிவில் சிவனை வழிபட்டதால் மயிலாப்பூர். சம்பந்தர் பூம்பாவையை உயிர்ப்பித்த தலம்.'),
    r: ['Thirumayilai (MRTS)', 'திருமயிலை (பறக்கும் ரயில்)', 1], t: tm([['5:30', '12:00'], ['16:00', '21:30']]),
    f: B('Panguni Peruvizha (Arupathu Moovar)', 'பங்குனிப் பெருவிழா (அறுபத்து மூவர்)'),
  },
  triplicane: {
    s: B('Krishna stands with a moustache and battle scars, as Arjuna\'s charioteer.', 'மீசையுடனும் போர்த் தழும்புகளுடனும் பார்த்தசாரதி.'),
    p: B('Courage, guidance and family welfare.', 'தைரியம், வழிகாட்டல், குடும்ப நலன்.'),
    v: B('An ancient Pallava-era shrine sung by the Azhwars. Five forms of Vishnu are worshipped here.', 'ஆழ்வார்கள் பாடிய பல்லவர் காலத் தலம்; ஐந்து பெருமாள் வடிவங்கள் வழிபாடு.'),
    r: ['Chennai Central', 'சென்னை சென்ட்ரல்', 4], t: tm([['6:00', '12:00'], ['16:00', '21:00']]),
    f: B('Vaikunta Ekadasi and Chithirai Brahmotsavam', 'வைகுண்ட ஏகாதசி, சித்திரைப் பிரம்மோற்சவம்'),
  },
  vadapalani: {
    s: B('Much-loved Chennai Murugan shrine where many weddings take place.', 'பல திருமணங்கள் நடைபெறும் சென்னையின் பிரியமான முருகன் கோவில்.'),
    p: B('Marriage, jobs and fulfilment of vows.', 'திருமணம், வேலை வாய்ப்பு, நேர்த்திக்கடன்.'),
    v: B('Began as a small shrine set up by a devotee who had a Palani Murugan picture. It grew into a major temple in the twentieth century.', 'பழனி முருகன் படத்தை வைத்து ஒரு பக்தர் தொடங்கிய சிறு சன்னிதி பின்னர் பெருங்கோவிலானது.'),
    r: ['Kodambakkam', 'கோடம்பாக்கம்', 2.5], t: tm([['5:30', '12:00'], ['16:00', '21:00']]),
    f: B('Thai Poosam and Kanda Sashti', 'தைப்பூசம், கந்த சஷ்டி'),
  },
  samayapuram: {
    s: B('One of the most visited Amman shrines; the Mother is said to fast for devotees in Maasi.', 'அதிகம் பேர் வழிபடும் அம்மன் தலம்; மாசியில் அம்மனே பக்தருக்காக விரதம் இருப்பதாக ஐதீகம்.'),
    p: B('Health, cure from pox and eye ailments, fulfilment of vows.', 'உடல்நலம், அம்மை, கண் நோய் நீக்கம், நேர்த்திக்கடன்.'),
    v: B('The deity is believed to have been brought from Srirangam and installed here. She is worshipped as the elder sister of Ranganatha.', 'ஸ்ரீரங்கத்திலிருந்து கொண்டுவரப்பட்டு இங்கு நிறுவப்பட்டதாக ஐதீகம்; ரங்கநாதரின் தங்கையாகப் போற்றப்படுகிறாள்.'),
    r: ['Srirangam', 'ஸ்ரீரங்கம்', 12], t: tm([['5:00', '21:00']]),
    f: B('Poochoridal (Maasi) and Chithirai Ther', 'பூச்சொரிதல் (மாசி), சித்திரைத் தேர்'),
  },
  trichy_rockfort: {
    s: B('Vinayagar on the summit of an ancient rock, reached by about 400 steps.', 'சுமார் நானூறு படிகள் ஏறிச் செல்லும் மலை உச்சி விநாயகர்.'),
    p: B('Removal of obstacles and success in new ventures.', 'தடைகள் நீக்கம், புதிய முயற்சிகளில் வெற்றி.'),
    v: B('Vinayagar, as a boy, placed Vibhishana\'s Ranganatha idol on the ground at Srirangam and then ran up this rock. The Thayumanavar shrine is midway.', 'சிறுவனாக வந்த விநாயகர் விபீஷணனின் ரங்கநாதரை ஸ்ரீரங்கத்தில் வைத்துவிட்டு இம்மலைமேல் ஓடினார். இடையில் தாயுமானவர் சன்னிதி.'),
    r: ['Tiruchirappalli Junction', 'திருச்சி சந்திப்பு', 5], t: tm([['6:00', '20:00']]),
    f: B('Vinayagar Chathurthi', 'விநாயகர் சதுர்த்தி'),
  },
  tirunelveli: {
    s: B('Twin temple of Nellaiappar and Kanthimathi with musical stone pillars.', 'இசைத் தூண்கள் கொண்ட நெல்லையப்பர் – காந்திமதி இரட்டைக் கோவில்.'),
    p: B('Prosperity, good harvest and family welfare.', 'செழிப்பு, நல்ல விளைச்சல், குடும்ப நலன்.'),
    v: B('Shiva protected a devotee\'s paddy from rain, earning the name Nellaiappar and giving the town its name.', 'ஒரு பக்தரின் நெல்லை மழையிலிருந்து காத்ததால் சிவன் நெல்லையப்பர் ஆனார்; ஊருக்கும் பெயர் வந்தது.'),
    r: ['Tirunelveli Junction', 'திருநெல்வேலி சந்திப்பு', 2.5], t: tm([['5:00', '12:30'], ['16:00', '21:00']]),
    f: B('Aani Ther festival', 'ஆனித் தேரோட்டம்'),
  },
  srivilliputhur: {
    s: B('Birthplace of Andal; the tall gopuram appears in the Tamil Nadu government emblem.', 'ஆண்டாள் அவதாரத் தலம்; தமிழக அரசுச் சின்னத்தில் இடம்பெறும் கோபுரம்.'),
    p: B('Marriage to a good spouse; devotion.', 'நல்ல வாழ்க்கைத் துணை, பக்தி.'),
    v: B('Andal, found by Periyazhwar in the tulsi garden, wore the garland meant for the Lord and later merged with Ranganatha. She composed the Thiruppavai.', 'துளசித் தோட்டத்தில் பெரியாழ்வார் கண்டெடுத்த ஆண்டாள், இறைவனுக்கான மாலையைச் சூடிக் கொடுத்து, பின் ரங்கநாதருடன் இணைந்தாள். திருப்பாவை அருளியவள்.'),
    r: ['Srivilliputhur', 'ஸ்ரீவில்லிபுத்தூர்', 2], t: tm([['6:30', '12:30'], ['16:00', '21:00']]),
    f: B('Aadi Pooram Ther and Margazhi', 'ஆடிப்பூரத் தேர், மார்கழி'),
  },
  kanyakumari: {
    s: B('The virgin goddess at India\'s southern tip, where three seas meet; her diamond nose-ring is famous.', 'முக்கடல் சங்கமத்தில் கன்னி தெய்வம்; வைர மூக்குத்தி பிரசித்தம்.'),
    p: B('Marriage, courage and protection.', 'திருமணம், தைரியம், பாதுகாப்பு.'),
    v: B('The goddess did penance here to wed Shiva; the wedding did not happen and she remained a virgin, vanquishing the demon Banasura.', 'சிவனை மணக்க அன்னை இங்கு தவம் செய்தாள்; திருமணம் நிகழாததால் கன்னியாகவே இருந்து பாணாசுரனை வதம் செய்தாள்.'),
    r: ['Kanyakumari', 'கன்னியாகுமரி', 1.5], t: tm([['4:30', '12:30'], ['16:00', '20:00']]),
    f: B('Navaratri and Vaikasi festival', 'நவராத்திரி, வைகாசித் திருவிழா'),
  },
  suchindram: {
    s: B('Brahma, Vishnu and Shiva in one lingam; musical pillars and a tall Anjaneyar.', 'மும்மூர்த்திகள் ஒரே லிங்கத்தில்; இசைத் தூண்கள், உயரமான ஆஞ்சநேயர்.'),
    p: B('Purity, removal of curses and family welfare.', 'தூய்மை, சாப நிவர்த்தி, குடும்ப நலன்.'),
    v: B('Indra is believed to have been cleansed (suchi) of a curse here. The Trimurti tested the chaste Anasuya at this place.', 'இந்திரன் சாபம் நீங்கித் தூய்மை பெற்ற தலம் எனப்படுகிறது. அனசூயையை மும்மூர்த்திகள் சோதித்த இடம்.'),
    r: ['Nagercoil Junction', 'நாகர்கோவில் சந்திப்பு', 7], t: tm([['4:30', '12:00'], ['17:00', '20:30']]),
    f: B('Margazhi festival and Hanuman Jayanthi', 'மார்கழித் திருவிழா, அனுமன் ஜெயந்தி'),
  },
  thiruvarur: {
    s: B('Huge Aazhi Ther (temple car) and the Kamalalayam tank.', 'பெரிய ஆழித் தேரும் கமலாலயக் குளமும்.'),
    p: B('Moksha and blessings for those born here; arts and music.', 'முக்தி, கலை, இசை அருள்.'),
    v: B('Thyagaraja (Somaskanda) was brought here by the Chola king Musukunda from Indra\'s heaven. Birthplace of the music trinity\'s Thyagaraja.', 'முசுகுந்த சக்கரவர்த்தி இந்திரலோகத்திலிருந்து தியாகராஜரைக் கொண்டு வந்தார். சங்கீத மும்மூர்த்திகள் பிறந்த ஊர்.'),
    r: ['Thiruvarur Junction', 'திருவாரூர் சந்திப்பு', 1.5], t: tm([['5:30', '12:00'], ['16:00', '21:00']]),
    f: B('Panguni Aazhi Ther', 'பங்குனி ஆழித் தேரோட்டம்'),
  },
  kumbakonam_adi: {
    s: B('Lingam shaped from the pot (kumbam) of nectar; centre of the Mahamaham.', 'அமுதக் குடத்திலிருந்து உருவான லிங்கம்; மகாமகத்தின் மையம்.'),
    p: B('Removal of sins and new beginnings.', 'பாவ நீக்கம், புதிய தொடக்கம்.'),
    v: B('At the deluge, a pot of nectar carrying the seeds of creation came to rest here. Shiva broke it with an arrow and the lingam was formed.', 'பிரளயத்தில் படைப்பின் விதைகளுடன் வந்த அமுதக் குடம் இங்கு நின்றது; சிவன் அம்பால் உடைக்க லிங்கம் உருவானது.'),
    r: ['Kumbakonam', 'கும்பகோணம்', 2], t: tm([['6:00', '12:30'], ['16:00', '21:00']]),
    f: B('Masi Magam (Mahamaham every 12 years)', 'மாசி மகம் (பன்னிரண்டு ஆண்டுக்கு ஒருமுறை மகாமகம்)'),
  },
  kumbakonam_sarangapani: {
    s: B('Sanctum shaped like a chariot drawn by horses and elephants.', 'குதிரைகளும் யானைகளும் இழுக்கும் தேர் வடிவ கருவறை.'),
    p: B('Prosperity and grace of Lakshmi.', 'செல்வம், மகாலட்சுமி அருள்.'),
    v: B('Vishnu came down with his bow (Saranga) to marry Komalavalli, born as the daughter of sage Hema. Sung by seven Azhwars.', 'ஹேம முனிவரின் மகளாகப் பிறந்த கோமளவல்லியை மணக்க சாரங்கம் ஏந்தி விஷ்ணு இறங்கினார். ஏழு ஆழ்வார்கள் பாடிய தலம்.'),
    r: ['Kumbakonam', 'கும்பகோணம்', 2], t: tm([['7:00', '12:00'], ['17:00', '21:00']]),
    f: B('Chithirai Ther', 'சித்திரைத் தேர்'),
  },
  thirukadaiyur: {
    s: B('Where Shiva defeated Yama to save Markandeya; renowned for 60th and 80th birthday rites.', 'மார்க்கண்டேயனைக் காக்க எமனை வென்ற தலம்; அறுபது, எண்பதாம் கல்யாணம் பிரசித்தம்.'),
    p: B('Long life, health and Ayush homam.', 'நீண்ட ஆயுள், உடல்நலம், ஆயுஷ் ஹோமம்.'),
    v: B('Shiva emerged from the lingam to kick Yama away from young Markandeya. Abhirami Bhattar sang the Abhirami Anthadhi here.', 'சிறுவன் மார்க்கண்டேயனுக்காக லிங்கத்திலிருந்து தோன்றி சிவன் எமனை உதைத்தார். அபிராமி பட்டர் அபிராமி அந்தாதி பாடிய தலம்.'),
    r: ['Mayiladuthurai Junction', 'மயிலாடுதுறை சந்திப்பு', 20], t: tm([['6:00', '13:00'], ['16:00', '21:00']]),
    f: B('Thai Amavasai (Abhirami) and Karthigai', 'தை அமாவாசை (அபிராமி), கார்த்திகை'),
  },
  sankarankovil: {
    s: B('Sankaranarayanar — half Shiva, half Vishnu — and the snake-pit (puttru) worship.', 'பாதி சிவன், பாதி விஷ்ணு — சங்கரநாராயணர்; புற்று மண் வழிபாடு.'),
    p: B('Relief from snake dosha, skin ailments; harmony.', 'நாக தோஷம், தோல் நோய் நீக்கம்; ஒற்றுமை.'),
    v: B('Gomathi Amman did penance to see Shiva and Vishnu as one. The Lord appeared as Sankaranarayanar on Aadi Pournami.', 'சிவனும் விஷ்ணுவும் ஒன்றே எனக் காண கோமதி அம்மன் தவம் இருந்தாள்; ஆடிப் பௌர்ணமியில் சங்கரநாராயணராகக் காட்சி தந்தார்.'),
    r: ['Sankarankovil', 'சங்கரன்கோவில்', 2], t: tm([['5:30', '12:30'], ['16:00', '21:00']]),
    f: B('Aadi Thapasu', 'ஆடித் தபசு'),
  },
  marudhamalai: {
    s: B('Hill temple near Coimbatore linked to the Siddhar Pambatti.', 'பாம்பாட்டிச் சித்தர் தொடர்புடைய கோவை மலைக்கோவில்.'),
    p: B('Health, herbal healing and protection.', 'உடல்நலம், மூலிகை குணம், பாதுகாப்பு.'),
    v: B('The hill is rich in marudha trees and medicinal herbs. The Siddhar Pambatti is believed to have meditated in a cave here.', 'மருத மரங்களும் மூலிகைகளும் நிறைந்த மலை; பாம்பாட்டிச் சித்தர் இங்கு குகையில் தவம் செய்ததாக ஐதீகம்.'),
    r: ['Coimbatore Junction', 'கோவை சந்திப்பு', 15], t: tm([['6:00', '13:00'], ['14:00', '20:00']]),
    f: B('Thai Poosam and Kanda Sashti', 'தைப்பூசம், கந்த சஷ்டி'),
  },
  perur: {
    s: B('Kanaka Sabha with exquisite Nayak-era sculptures; the immortal palm tree.', 'நாயக்கர் காலச் சிற்பங்கள் கொண்ட கனக சபை; இறவாப் பனை.'),
    p: B('Moksha and pitru rites on the Noyyal banks.', 'முக்தி, நொய்யல் கரையில் பித்ரு கடன்.'),
    v: B('The divine cow Kamadhenu and her calf Patti worshipped Shiva here, giving the name Pateeswarar. Sung by Sundarar.', 'காமதேனுவும் அதன் கன்று பட்டியும் சிவனை வழிபட்டதால் பட்டீஸ்வரர். சுந்தரர் பாடிய தலம்.'),
    r: ['Coimbatore Junction', 'கோவை சந்திப்பு', 8], t: tm([['6:00', '13:00'], ['16:00', '20:30']]),
    f: B('Panguni Uthiram', 'பங்குனி உத்திரம்'),
  },
  tirumala: {
    s: B('One of the most visited shrines in the world; famous laddu prasadam.', 'உலகில் அதிகம் பேர் வழிபடும் தலங்களில் ஒன்று; லட்டு பிரசாதம்.'),
    p: B('Wealth, removal of debts and wishes granted; hair offering.', 'செல்வம், கடன் நீக்கம், வேண்டுதல் நிறைவேற்றம்; முடி காணிக்கை.'),
    v: B('Vishnu came to the Seven Hills as Srinivasa and married Padmavathi. He is said to repay the wedding loan from Kubera with devotees\' offerings.', 'விஷ்ணு சீனிவாசராக ஏழுமலைக்கு வந்து பத்மாவதியை மணந்தார்; குபேரனிடம் பெற்ற கடனை பக்தர் காணிக்கையால் செலுத்துவதாக ஐதீகம்.'),
    r: ['Tirupati', 'திருப்பதி', 22], t: tm([['3:00', '23:30']], 'darshan slots vary; book on the official TTD site', 'தரிசன நேரம் மாறும்; அதிகாரப்பூர்வ தேவஸ்தான இணையதளத்தில் முன்பதிவு'),
    f: B('Brahmotsavam (Purattasi) and Vaikunta Ekadasi', 'புரட்டாசி பிரம்மோற்சவம், வைகுண்ட ஏகாதசி'),
  },
  guruvayur: {
    s: B('Child Krishna worshipped with elaborate rituals; Thulabharam and first-rice feeding.', 'குழந்தைக் கண்ணன் வழிபாடு; துலாபாரம், அன்னப்பிராசனம்.'),
    p: B('Child welfare, health and marriage.', 'குழந்தை நலன், உடல்நலம், திருமணம்.'),
    v: B('The idol worshipped by Krishna\'s parents was installed here by Guru (Brihaspati) and Vayu, hence Guruvayur. Narayana Bhattathiri composed the Narayaneeyam here.', 'கண்ணனின் பெற்றோர் வழிபட்ட விக்கிரகத்தை குருவும் வாயுவும் இங்கு நிறுவினர்; எனவே குருவாயூர். நாராயண பட்டதிரி நாராயணீயம் இயற்றிய தலம்.'),
    r: ['Guruvayur', 'குருவாயூர்', 1], t: tm([['3:00', '12:30'], ['16:30', '21:15']], 'dress code applies', 'உடைக் கட்டுப்பாடு உண்டு'),
    f: B('Ekadasi (Vrischikam) and Ulsavam', 'குருவாயூர் ஏகாதசி, உற்சவம்'),
  },
  sabarimala: {
    s: B('Forest hill shrine reached after a 41-day vratham carrying the Irumudi; 18 holy steps.', 'நாற்பத்தொரு நாள் விரதம், இருமுடியுடன் செல்லும் காட்டு மலைக்கோவில்; பதினெட்டாம் படி.'),
    p: B('Discipline, Saturn relief and fulfilment of vows.', 'ஒழுக்கம், சனி தோஷ நிவர்த்தி, நேர்த்திக்கடன்.'),
    v: B('Ayyappa, son of Shiva and Mohini, slew the demoness Mahishi and then sat in meditation here. The Makara Jyothi is seen on Makara Sankranthi.', 'சிவன் – மோகினி மைந்தனான ஐயப்பன் மகிஷியை வதம் செய்து இங்கு தவக்கோலத்தில் அமர்ந்தார். மகர சங்கராந்தியில் மகரஜோதி.'),
    r: ['Chengannur', 'செங்கண்ணூர்', 80], t: tm([['3:00', '13:00'], ['16:00', '23:00']], 'open only in Mandala–Makaravilakku season and monthly openings', 'மண்டல – மகரவிளக்கு காலத்திலும் மாதப் பிறப்பிலும் மட்டும் திறப்பு'),
    f: B('Mandala Pooja and Makaravilakku', 'மண்டல பூஜை, மகரவிளக்கு'),
  },
  suriyanar: {
    s: B('Rare temple where the Sun is the main deity, with the other eight planets around him.', 'சூரியனே மூலவராக, மற்ற எட்டு கிரகங்களும் சுற்றி அமைந்த அரிய கோவில்.'),
    p: B('Sun dosha relief: health, eyesight, government favour and career.', 'சூரிய தோஷ நிவர்த்தி: உடல்நலம், கண் பார்வை, அரசு அனுகூலம், பணி உயர்வு.'),
    v: B('Built in the Chola period. Tradition says the Navagrahas were cursed through sage Kalava and freed of it here.', 'சோழர் காலத்தில் கட்டப்பட்டது. காலவ முனிவரால் சாபம் பெற்ற நவகிரகங்கள் இங்கு விமோசனம் பெற்றதாக ஐதீகம்.'),
    r: ['Kumbakonam', 'கும்பகோணம்', 15], t: VILLAGE,
    f: B('Ratha Saptami (Thai)', 'ரத சப்தமி (தை)'),
  },
  thingalur: {
    s: B('Moon sthalam where moonlight falls on the lingam on certain days of Panguni and Purattasi.', 'பங்குனி, புரட்டாசியில் சில நாட்கள் நிலவொளி லிங்கத்தின் மீது விழும் சந்திரத் தலம்.'),
    p: B('Moon dosha relief: peace of mind, mother\'s health.', 'சந்திர தோஷ நிவர்த்தி: மன அமைதி, தாயின் நலம்.'),
    v: B('Linked to Appoothi Adigal, who named everything after Appar; Appar revived his son here from a snake bite.', 'அப்பர் பெயரிலேயே அனைத்தையும் வைத்த அப்பூதி அடிகளின் ஊர்; பாம்பு கடித்த அவரது மகனை அப்பர் உயிர்ப்பித்தார்.'),
    r: ['Thanjavur Junction', 'தஞ்சாவூர் சந்திப்பு', 18], t: VILLAGE,
    f: B('Panguni Uthiram and Pournami days', 'பங்குனி உத்திரம், பௌர்ணமி நாட்கள்'),
  },
  vaitheeswaran: {
    s: B('Shiva as the divine physician; Mars (Angarakan) shrine; famous nadi astrologers in town.', 'மருத்துவராக சிவன்; அங்காரகன் சன்னிதி; ஊரில் நாடி ஜோதிடம் பிரசித்தம்.'),
    p: B('Cure of diseases, Mars (sevvai) dosha relief.', 'நோய் தீர்தல், செவ்வாய் தோஷ நிவர்த்தி.'),
    v: B('Shiva came as Vaidyanathar with Thaiyalnayaki carrying healing oil to cure devotees. Mars was cured of leprosy here.', 'தைலம் ஏந்திய தையல்நாயகியுடன் வைத்தியநாதராக சிவன் நோய் தீர்த்தார். அங்காரகன் தொழுநோய் நீங்கப்பெற்ற தலம்.'),
    r: ['Vaitheeswaran Kovil', 'வைத்தீஸ்வரன் கோவில்', 1], t: tm([['6:00', '13:00'], ['16:00', '21:00']]),
    f: B('Thai and Panguni Brahmotsavam; Tuesdays', 'தை, பங்குனி பிரம்மோற்சவம்; செவ்வாய்க்கிழமைகள்'),
  },
  thiruvenkadu: {
    s: B('Mercury sthalam with the Aghora Murthy and three sacred tanks.', 'அகோர மூர்த்தி, மூன்று தீர்த்தங்கள் கொண்ட புதன் தலம்.'),
    p: B('Mercury relief: education, intelligence, speech and business.', 'புதன் தோஷ நிவர்த்தி: கல்வி, அறிவு, பேச்சுத் திறன், வணிகம்.'),
    v: B('Shiva took the fierce Aghora form here to destroy the demon Maruthuvasuran. Budhan worshipped here and gained his place among the planets.', 'மருத்துவாசுரனை அழிக்க சிவன் அகோர வடிவம் எடுத்தார். புதன் இங்கு வழிபட்டு கிரக பதவி பெற்றார்.'),
    r: ['Sirkazhi', 'சீர்காழி', 12], t: VILLAGE,
    f: B('Masi Brahmotsavam', 'மாசிப் பிரம்மோற்சவம்'),
  },
  alangudi: {
    s: B('Guru sthalam where Dakshinamurthy is worshipped as Jupiter.', 'தட்சிணாமூர்த்தியே குருவாக வணங்கப்படும் தலம்.'),
    p: B('Jupiter relief: marriage, children, wisdom and wealth.', 'குரு தோஷ நிவர்த்தி: திருமணம், குழந்தைப் பேறு, ஞானம், செல்வம்.'),
    v: B('Shiva drank the poison from the churning of the ocean and saved the world — hence Abathsahayeswarar, the helper in danger. The village takes its name from the poison (aalam).', 'பாற்கடல் கடைந்தபோது எழுந்த ஆலகால விஷத்தை உண்டு உலகைக் காத்ததால் ஆபத்சகாயேஸ்வரர்; ஊருக்கும் ஆலங்குடி என்ற பெயர்.'),
    r: ['Needamangalam', 'நீடாமங்கலம்', 7], t: VILLAGE,
    f: B('Guru Peyarchi and Thursdays', 'குருப் பெயர்ச்சி, வியாழக்கிழமைகள்'),
  },
  kanjanur: {
    s: B('Venus sthalam where Shiva himself is worshipped as Sukran.', 'சிவனே சுக்கிரனாக வணங்கப்படும் தலம்.'),
    p: B('Venus relief: marriage, marital harmony, vehicles and comforts.', 'சுக்கிர தோஷ நிவர்த்தி: திருமணம், இல்லற இன்பம், வாகனம், வசதி.'),
    v: B('Agni worshipped Shiva here to be cured, hence Agneeswarar. Haradatta Sivacharyar, a great Shaiva devotee, lived here.', 'அக்னி இங்கு சிவனை வழிபட்டு குணமடைந்ததால் அக்னீஸ்வரர். சிவபக்தர் ஹரதத்த சிவாச்சாரியார் வாழ்ந்த ஊர்.'),
    r: ['Kumbakonam', 'கும்பகோணம்', 18], t: VILLAGE,
    f: B('Fridays and Masi Magam', 'வெள்ளிக்கிழமைகள், மாசி மகம்'),
  },
  thirunallar: {
    s: B('Most famous Saturn sthalam; bath in the Nala Theertham before darshan.', 'மிகப் பிரசித்தமான சனித் தலம்; நள தீர்த்தத்தில் நீராடி தரிசனம்.'),
    p: B('Relief from Ezharai Sani, Ashtama Sani and Saturn dasa troubles.', 'ஏழரைச் சனி, அஷ்டமச் சனி, சனி தசை துன்ப நிவர்த்தி.'),
    v: B('King Nala, troubled by Saturn for years, was freed after bathing and worshipping here. Saneeswarar stands at the entrance in a special shrine.', 'சனியால் பல ஆண்டுகள் துன்புற்ற நள மன்னன் இங்கு நீராடி வழிபட்டு விடுதலை பெற்றான். நுழைவாயிலில் சனீஸ்வரர் தனிச் சன்னிதி.'),
    r: ['Karaikal', 'காரைக்கால்', 5], t: tm([['5:30', '13:00'], ['16:00', '21:00']], 'very crowded on Saturdays', 'சனிக்கிழமைகளில் அதிக கூட்டம்'),
    f: B('Sani Peyarchi', 'சனிப் பெயர்ச்சி'),
  },
  thirunageswaram: {
    s: B('Rahu sthalam where the milk poured on Rahu is said to turn blue.', 'ராகுவுக்கு ஊற்றும் பால் நீல நிறமாவதாகக் கூறப்படும் தலம்.'),
    p: B('Rahu relief, naga dosha, delayed marriage and childlessness.', 'ராகு தோஷம், நாக தோஷம், திருமணத் தாமதம், குழந்தையின்மை நிவர்த்தி.'),
    v: B('The serpent kings Adisesha, Takshaka and Karkotaka worshipped Shiva here. Rahu himself is enshrined with his consorts.', 'ஆதிசேஷன், தட்சகன், கார்க்கோடகன் போன்ற நாகராஜர்கள் வழிபட்ட தலம். தேவியருடன் ராகு தனிச் சன்னிதியில்.'),
    r: ['Kumbakonam', 'கும்பகோணம்', 7], t: tm([['6:00', '13:00'], ['16:00', '20:30']]),
    f: B('Rahu Peyarchi and Rahu kalam abhishekam', 'ராகுப் பெயர்ச்சி, ராகு கால அபிஷேகம்'),
  },
  keezhaperumpallam: {
    s: B('Ketu sthalam near Poompuhar where Ketu is shown worshipping Shiva.', 'பூம்புகார் அருகே சிவனை வணங்கும் கோலத்தில் கேது.'),
    p: B('Ketu relief: spiritual clarity, removal of obstacles.', 'கேது தோஷ நிவர்த்தி: ஆன்மிகத் தெளிவு, தடை நீக்கம்.'),
    v: B('Ketu, the serpent body separated from Rahu, worshipped Shiva here and received his place among the planets.', 'ராகுவிடமிருந்து பிரிந்த பாம்பு உடலான கேது இங்கு சிவனை வழிபட்டு கிரக பதவி பெற்றான்.'),
    r: ['Mayiladuthurai Junction', 'மயிலாடுதுறை சந்திப்பு', 25], t: VILLAGE,
    f: B('Ketu Peyarchi', 'கேதுப் பெயர்ச்சி'),
  },
  thirumanancheri: {
    s: B('Shiva and Parvati are seen in their wedding form; garland prayer for marriage.', 'சிவனும் பார்வதியும் திருமணக் கோலத்தில்; திருமண மாலை வேண்டுதல்.'),
    p: B('Removal of marriage delays; couples return to give thanks.', 'திருமணத் தடை நீக்கம்; மணமான பின் நன்றி செலுத்த மீண்டும் வருகை.'),
    v: B('Shiva married Parvati here after she was freed from a curse; the town is named for the wedding (thirumanam).', 'சாப விமோசனம் பெற்ற பார்வதியை சிவன் இங்கு மணந்தார்; ஊரின் பெயரே திருமணத்தைக் குறிக்கிறது.'),
    r: ['Kuthalam', 'குத்தாலம்', 6], t: tm([['6:00', '13:00'], ['15:30', '20:00']]),
    f: B('Chithirai Thirukalyanam', 'சித்திரைத் திருக்கல்யாணம்'),
  },
  thiruvidaimarudur: {
    s: B('Grand Shiva temple counted as the central (Madhyarjunam) Marudhur, with huge corridors.', 'மத்தியார்ஜுனம் எனப்படும் பெரிய பிரகாரங்கள் கொண்ட சிவாலயம்.'),
    p: B('Relief from Brahmahathi dosha, mental unrest and fear.', 'பிரம்மஹத்தி தோஷம், மனக் கலக்கம், அச்சம் நீக்கம்.'),
    v: B('A Chola king, haunted by a Brahmahathi for an accidental killing, was freed here by entering through the east gate and leaving by another. Devotees still follow this path.', 'தவறுதலான கொலையால் பிரம்மஹத்தி பற்றிய சோழ மன்னன் கிழக்கு வாயிலில் நுழைந்து வேறு வழியில் வெளியேறி விடுபட்டான்; பக்தர்கள் இன்றும் அதே வழி பின்பற்றுகின்றனர்.'),
    r: ['Thiruvidaimarudur', 'திருவிடைமருதூர்', 1], t: tm([['6:00', '12:30'], ['16:00', '21:00']]),
    f: B('Thai Poosam theerthavari', 'தைப்பூசத் தீர்த்தவாரி'),
  },
  oppiliappan: {
    s: B('Food offerings are made without salt; considered equal to Tirumala for vows.', 'உப்பில்லா நைவேத்தியம்; திருமலைக்கு இணையான நேர்த்திக்கடன் தலம்.'),
    p: B('Marriage, prosperity and fulfilment of Tirumala vows.', 'திருமணம், செல்வம், திருமலை வேண்டுதல் நிறைவேற்றம்.'),
    v: B('Sage Markandeya\'s daughter Bhoomadevi was too young to cook with salt; the Lord accepted saltless food and married her. He is the "elder brother" of Tirumala\'s Venkateswara.', 'மார்க்கண்டேய முனிவரின் மகள் பூமாதேவிக்கு உப்பிட்டுச் சமைக்கத் தெரியாததால் உப்பில்லா உணவை ஏற்று பெருமாள் அவளை மணந்தார். ஏழுமலையானின் அண்ணன் எனப்படுகிறார்.'),
    r: ['Kumbakonam', 'கும்பகோணம்', 7], t: tm([['6:00', '13:00'], ['16:00', '21:00']]),
    f: B('Purattasi Brahmotsavam and Thirukalyanam', 'புரட்டாசிப் பிரம்மோற்சவம், திருக்கல்யாணம்'),
  },
  patteeswaram_durgai: {
    s: B('A gentle, smiling Durgai with eight arms; Rahu kalam lamps on Sundays and Tuesdays.', 'எட்டுக் கரங்களுடன் புன்னகைக்கும் சாந்த துர்க்கை; ஞாயிறு, செவ்வாய் ராகு கால விளக்கு.'),
    p: B('Rahu dosha relief, marriage, courage and protection.', 'ராகு தோஷ நிவர்த்தி, திருமணம், தைரியம், பாதுகாப்பு.'),
    v: B('Patti, the calf of Kamadhenu, worshipped Shiva here (Thenupureeswarar). The Durgai shrine was a guardian deity of the Chola palace.', 'காமதேனுவின் கன்று பட்டி சிவனை வழிபட்ட தலம் (தேனுபுரீஸ்வரர்). துர்க்கை சோழர் அரண்மனைக் காவல் தெய்வம்.'),
    r: ['Kumbakonam', 'கும்பகோணம்', 8], t: tm([['6:00', '12:30'], ['16:00', '20:30']]),
    f: B('Navaratri and Rahu kalam on Fridays', 'நவராத்திரி, வெள்ளி ராகு கால வழிபாடு'),
  },
  thiruvalangadu: {
    s: B('Ratna Sabha (gem hall) of Nataraja, site of the dance contest with Kali.', 'காளியுடன் நடனப் போட்டி நிகழ்ந்த நடராஜரின் ரத்தின சபை.'),
    p: B('Victory, arts and relief from fear.', 'வெற்றி, கலை, அச்ச நீக்கம்.'),
    v: B('Shiva defeated Kali in a dance contest by raising his leg in the Urdhva Thandavam. Karaikal Ammaiyar reached the Lord\'s feet here.', 'ஊர்த்துவ தாண்டவத்தில் காலை உயர்த்தி சிவன் காளியை நடனத்தில் வென்றார். காரைக்கால் அம்மையார் இறைவனடி சேர்ந்த தலம்.'),
    r: ['Thiruvalangadu', 'திருவாலங்காடு', 3], t: VILLAGE,
    f: B('Margazhi Arudra Darisanam', 'மார்கழி ஆருத்ரா தரிசனம்'),
  },
  thirukollikadu: {
    s: B('Saturn appears as Pongu Sani, the giver of abundance, rather than of hardship.', 'துன்பம் அல்ல, பொங்கும் வளம் தரும் பொங்கு சனி.'),
    p: B('Saturn relief, especially during Ezharai and Ashtama Sani.', 'சனி தோஷ நிவர்த்தி, ஏழரை, அஷ்டமச் சனி காலங்களில் சிறப்பு.'),
    v: B('Saturn is believed to have worshipped Agneeswarar here and been freed of his own fierce nature. Sung in the Thevaram by Sambandar.', 'சனி இங்கு அக்னீஸ்வரரை வழிபட்டு தன் கடுமை நீங்கியதாக ஐதீகம். சம்பந்தர் பாடிய தேவாரத் தலம்.'),
    r: ['Thiruthuraipoondi', 'திருத்துறைப்பூண்டி', 15], t: VILLAGE,
    f: B('Sani Peyarchi and Saturdays', 'சனிப் பெயர்ச்சி, சனிக்கிழமைகள்'),
  },
  kuchanur: {
    s: B('The only major shrine where Saneeswarar is a swayambu (self-manifested) main deity.', 'சுயம்பு சனீஸ்வரரே மூலவராக உள்ள முக்கியத் தலம்.'),
    p: B('Relief from Saturn troubles, delays and hardship.', 'சனி தோஷம், தாமதம், கஷ்டங்கள் நீக்கம்.'),
    v: B('A local king worshipped Saturn here to save his son from Saturn\'s affliction, and the deity manifested on its own. Shrines are tied with a crow, Saturn\'s mount.', 'சனி பீடிப்பிலிருந்து மகனைக் காக்க மன்னன் வழிபட, சனீஸ்வரர் சுயம்புவாகத் தோன்றினார். அவரது வாகனம் காகம்.'),
    r: ['Theni', 'தேனி', 25], t: tm([['6:00', '12:30'], ['16:00', '20:00']], 'crowded on Saturdays', 'சனிக்கிழமைகளில் கூட்டம்'),
    f: B('Aadi Saturdays festival', 'ஆடிச் சனிக்கிழமைத் திருவிழா'),
  },
  koodal_azhagar: {
    s: B('Divya Desam with a three-tiered Ashtanga vimanam showing Vishnu standing, seated and reclining.', 'நின்ற, இருந்த, கிடந்த கோலங்கள் கொண்ட அஷ்டாங்க விமானத் திவ்ய தேசம்.'),
    p: B('Education, harmony and prosperity.', 'கல்வி, ஒற்றுமை, செல்வம்.'),
    v: B('Periyazhwar sang the Thiruppallandu here after winning a debate in the Pandya court. The Navagraha shrine here is notable.', 'பாண்டிய அவையில் வாதில் வென்ற பெரியாழ்வார் இங்கு திருப்பல்லாண்டு பாடினார். இங்கு நவகிரக சன்னிதி சிறப்பு.'),
    r: ['Madurai Junction', 'மதுரை சந்திப்பு', 1], t: tm([['6:00', '12:00'], ['16:00', '21:00']]),
    f: B('Vaikunta Ekadasi and Navaratri', 'வைகுண்ட ஏகாதசி, நவராத்திரி'),
  },
  alagar_kovil: {
    s: B('Kallazhagar on the forested Alagar hills; Karuppannasamy guards the gate.', 'அழகர் மலையில் கள்ளழகர்; வாயிலில் பதினெட்டாம்படிக் கருப்பசாமி.'),
    p: B('Prosperity, justice and protection.', 'செல்வம், நீதி, பாதுகாப்பு.'),
    v: B('Azhagar travels to Madurai each Chithirai for his sister Meenakshi\'s wedding and enters the Vaigai river. The Noopura Gangai spring is used for the abhishekam.', 'தங்கை மீனாட்சியின் திருமணத்திற்கு அழகர் சித்திரையில் மதுரை வந்து வைகையில் இறங்குகிறார். நூபுர கங்கை நீரால் அபிஷேகம்.'),
    r: ['Madurai Junction', 'மதுரை சந்திப்பு', 22], t: tm([['6:00', '12:30'], ['15:30', '20:00']]),
    f: B('Chithirai festival (Azhagar in the Vaigai)', 'சித்திரைத் திருவிழா (அழகர் வைகையில் இறங்குதல்)'),
  },
  srivaikuntam: {
    s: B('First of the Nava Tirupathi on the Thamirabarani; the Sun lights the deity in Chithirai and Aippasi.', 'தாமிரபரணிக் கரை நவ திருப்பதிகளில் முதல்; சித்திரை, ஐப்பசியில் சூரிய ஒளி மூலவர் மீது.'),
    p: B('Sun-related relief, recovery of lost wealth.', 'சூரிய தோஷ நிவர்த்தி, இழந்த செல்வம் மீட்பு.'),
    v: B('The Lord came as Kallapiran to recover the Vedas stolen from Brahma. The nine Tirupathi temples are linked to the nine planets.', 'பிரம்மனிடமிருந்து திருடப்பட்ட வேதங்களை மீட்க கள்ளப்பிரானாக வந்தார். ஒன்பது திருப்பதிகள் நவகிரகங்களுடன் தொடர்புடையவை.'),
    r: ['Srivaikuntam', 'ஸ்ரீவைகுண்டம்', 2], t: VILLAGE,
    f: B('Garuda Sevai (Vaikasi, Nava Tirupathi)', 'வைகாசி கருட சேவை (நவ திருப்பதி)'),
  },
  srinivasa_mangapuram: {
    s: B('Venkateswara in wedding form; a calm alternative darshan near Tirupati.', 'திருமணக் கோலத்தில் வெங்கடேஸ்வரர்; திருப்பதி அருகே அமைதியான தரிசனம்.'),
    p: B('Marriage, happy married life; newlyweds seek blessings.', 'திருமணம், இனிய இல்லறம்; புதுமணத் தம்பதியர் ஆசி.'),
    v: B('After marrying Padmavathi, Srinivasa stayed here for six months before going up the Tirumala hills, as tradition forbade newlyweds climbing hills.', 'பத்மாவதியை மணந்த பின் புதுமணத் தம்பதியர் மலை ஏறக்கூடாது என்பதால் சீனிவாசர் ஆறு மாதம் இங்கு தங்கினார்.'),
    r: ['Tirupati', 'திருப்பதி', 12], t: tm([['5:30', '20:00']]),
    f: B('Brahmotsavam (Magha month)', 'பிரம்மோற்சவம் (மாசி)'),
  },
  thirumeyachur: {
    s: B('Lalithambigai seated in grace; the Lalitha Sahasranamam is chanted here with special devotion.', 'அருள் கோலத்தில் லலிதாம்பிகை; லலிதா சகஸ்ரநாமப் பாராயணம் சிறப்பு.'),
    p: B('Family welfare, health, relief from Surya dosha.', 'குடும்ப நலன், உடல்நலம், சூரிய தோஷ நிவர்த்தி.'),
    v: B('The Mother\'s thousand names (Lalitha Sahasranamam) are traditionally said to have been revealed here. Surya worshipped Shiva here to regain his lustre.', 'லலிதா சகஸ்ரநாமம் இங்கு வெளிப்பட்டதாக மரபு. சூரியன் தன் ஒளியை மீண்டும் பெற இங்கு சிவனை வழிபட்டான்.'),
    r: ['Peralam', 'பேரளம்', 3], t: VILLAGE,
    f: B('Navaratri and Pournami pooja', 'நவராத்திரி, பௌர்ணமி பூஜை'),
  },
  thirupugalur: {
    s: B('Devotees offer bricks and pray for their own house; Appar attained mukti here.', 'செங்கல் வைத்து சொந்த வீட்டுக்காக வேண்டுதல்; அப்பர் முக்தி பெற்ற தலம்.'),
    p: B('Building or buying a house, vastu relief and land matters.', 'வீடு கட்டுதல், வாங்குதல், வாஸ்து தோஷ நிவர்த்தி, நிலப் பிரச்சினை தீர்வு.'),
    v: B('Appar spent his last days here and merged with the Lord in Chithirai Sadhayam. Bricks offered by Sundarar are said to have turned to gold here.', 'அப்பர் இங்கு இறுதி நாட்களைக் கழித்து சித்திரைச் சதயத்தில் இறைவனடி சேர்ந்தார். சுந்தரர் தலைக்கு வைத்த செங்கல் பொன்னானதாக ஐதீகம்.'),
    r: ['Thiruvarur Junction', 'திருவாரூர் சந்திப்பு', 15], t: VILLAGE,
    f: B('Chithirai Sadhayam (Appar Guru Pooja)', 'சித்திரைச் சதயம் (அப்பர் குருபூஜை)'),
  },
  sirkazhi: {
    s: B('Three-tiered shrine of Brahmapureeswarar, Umamaheswarar and Sattainathar (Bhairavar).', 'பிரம்மபுரீஸ்வரர், உமாமகேஸ்வரர், சட்டைநாதர் என மூன்று நிலைச் சன்னிதிகள்.'),
    p: B('Education, eloquence and protection; Friday Sattainathar worship.', 'கல்வி, சொல்வன்மை, பாதுகாப்பு; வெள்ளிக்கிழமை சட்டைநாதர் வழிபாடு.'),
    v: B('The child Sambandar was fed milk of wisdom by Parvati at the temple tank and began singing the Thevaram. The town is counted among the oldest Shaiva centres.', 'திருக்குளக் கரையில் பார்வதி ஞானப்பால் ஊட்ட, குழந்தை சம்பந்தர் தேவாரம் பாடத் தொடங்கினார்.'),
    r: ['Sirkazhi', 'சீர்காழி', 1.5], t: tm([['6:00', '12:30'], ['16:00', '21:00']]),
    f: B('Chithirai Thirumulaippal festival', 'சித்திரைத் திருமுலைப்பால் விழா'),
  },
  mayiladuthurai: {
    s: B('Parvati worshipped Shiva in peacock form; Aippasi Thula snanam in the Cauvery.', 'மயில் வடிவில் பார்வதி வழிபட்ட தலம்; ஐப்பசி துலா ஸ்நானம்.'),
    p: B('Removal of sins and family harmony.', 'பாவ நீக்கம், குடும்ப ஒற்றுமை.'),
    v: B('Cursed to become a peahen, Parvati worshipped Shiva here and regained her form. A bath in the Cauvery in Aippasi is held equal to a Ganga bath.', 'மயிலாகச் சாபம் பெற்ற பார்வதி இங்கு சிவனை வழிபட்டு சுய உருவம் பெற்றாள். ஐப்பசியில் காவிரி நீராடல் கங்கை நீராடலுக்கு இணை.'),
    r: ['Mayiladuthurai Junction', 'மயிலாடுதுறை சந்திப்பு', 2], t: tm([['6:00', '12:30'], ['16:00', '21:00']]),
    f: B('Aippasi Kadai Muzhukku', 'ஐப்பசி கடைமுழுக்கு'),
  },
  thiruvidanthai: {
    s: B('The Lord weds a maiden every day — hence Nithya Kalyana Perumal; garland prayer for marriage.', 'தினமும் ஒரு கன்னியை மணப்பதால் நித்ய கல்யாணப் பெருமாள்; திருமண மாலை வேண்டுதல்.'),
    p: B('Removal of marriage delays.', 'திருமணத் தடை நீக்கம்.'),
    v: B('Varaha married the 360 daughters of sage Kalava, one each day of the year. Devotees circle the temple nine times wearing a garland.', 'காலவ முனிவரின் முந்நூற்றறுபது மகள்களை நாளுக்கு ஒருவராக வராகர் மணந்தார். மாலையுடன் ஒன்பது முறை வலம் வருதல் வழக்கம்.'),
    r: ['Chengalpattu', 'செங்கல்பட்டு', 30], t: tm([['6:00', '12:30'], ['15:00', '20:00']]),
    f: B('Chithirai Brahmotsavam', 'சித்திரைப் பிரம்மோற்சவம்'),
  },
  pillaiyarpatti: {
    s: B('Rock-cut Karpaga Vinayagar about six feet tall with two arms and trunk turned right.', 'வலம்புரித் தும்பிக்கையுடன் இரு கரம் கொண்ட குடைவரைக் கற்பக விநாயகர்.'),
    p: B('Success in new ventures, education and removal of obstacles.', 'புதிய முயற்சி வெற்றி, கல்வி, தடை நீக்கம்.'),
    v: B('Carved in early Pandya times, it is one of the oldest Vinayagar shrines in Tamil Nadu. The Nagarathar community maintains the temple.', 'முற்காலப் பாண்டியர் காலத்தில் செதுக்கப்பட்ட தமிழகத்தின் பழமையான விநாயகர் தலங்களில் ஒன்று; நகரத்தார் நிர்வாகம்.'),
    r: ['Karaikudi Junction', 'காரைக்குடி சந்திப்பு', 12], t: tm([['6:00', '13:00'], ['16:00', '20:30']]),
    f: B('Vinayagar Chathurthi (with the giant modakam)', 'விநாயகர் சதுர்த்தி (பெரிய கொழுக்கட்டை)'),
  },
  melmaruvathur: {
    s: B('Devotees in red, both men and women, perform poojas themselves in the sanctum.', 'செவ்வாடை அணிந்த ஆண், பெண் பக்தர்களே கருவறையில் பூஜை செய்வது சிறப்பு.'),
    p: B('Health, family welfare and fulfilment of vows.', 'உடல்நலம், குடும்ப நலன், நேர்த்திக்கடன்.'),
    v: B('The Mother is believed to have manifested from a neem tree here in the twentieth century. The movement led by Bangaru Adigalar spread worldwide.', 'இருபதாம் நூற்றாண்டில் வேப்பமரத்திலிருந்து அன்னை வெளிப்பட்டதாக நம்பிக்கை. பங்காரு அடிகளார் வழியில் பரவிய வழிபாடு.'),
    r: ['Melmaruvathur', 'மேல்மருவத்தூர்', 1], t: tm([['5:00', '21:00']]),
    f: B('Thai Poosam and Irumudi season (Thai–Masi)', 'தைப்பூசம், இருமுடி காலம் (தை – மாசி)'),
  },
  mangadu_kamakshi: {
    s: B('The Mother on one leg in the fire of penance; Ardha Meru Sri Chakra installed by Adi Shankara.', 'பஞ்சாக்னியில் ஒற்றைக் காலில் தவக்கோலம்; ஆதி சங்கரர் நிறுவிய அர்த்தமேரு ஸ்ரீ சக்கரம்.'),
    p: B('Marriage — devotees light lamps on six consecutive Tuesdays.', 'திருமணம் — ஆறு வாரச் செவ்வாய் விளக்கு வேண்டுதல்.'),
    v: B('Kamakshi did penance here amid five fires to rejoin Shiva, before going to Kanchipuram for the wedding. Hence Mangadu precedes a Kanchi visit.', 'சிவனைச் சேர காமாட்சி இங்கு பஞ்சாக்னி நடுவே தவம் செய்து பின் காஞ்சி சென்று மணந்தாள்.'),
    r: ['Chennai Central', 'சென்னை சென்ட்ரல்', 22], t: tm([['6:00', '13:30'], ['15:00', '21:00']]),
    f: B('Vijayadasami and Panguni festival', 'விஜயதசமி, பங்குனித் திருவிழா'),
  },
  thiruverkadu: {
    s: B('Swayambu Karumariamman; one of Chennai\'s most visited Amman temples.', 'சுயம்பு கருமாரியம்மன்; சென்னையின் அதிகம் பேர் வழிபடும் அம்மன் கோவில்.'),
    p: B('Health, protection from evil and fulfilment of vows.', 'உடல்நலம், தீமை நீக்கம், நேர்த்திக்கடன்.'),
    v: B('The Mother is said to have appeared here as a snake-dwelling anthill (puttru), and is worshipped with the ant-hill. Thiruverkadu is also a Thevaram Shiva sthalam.', 'அன்னை புற்று வடிவில் இங்கு தோன்றியதாக ஐதீகம்; புற்று வழிபாடு சிறப்பு. திருவேற்காடு தேவாரச் சிவத் தலமும் ஆகும்.'),
    r: ['Chennai Central', 'சென்னை சென்ட்ரல்', 20], t: tm([['5:30', '13:00'], ['15:00', '21:00']]),
    f: B('Aadi festival (Aadi Fridays)', 'ஆடித் திருவிழா (ஆடி வெள்ளி)'),
  },
  kanchi_kailasanathar: {
    s: B('Sandstone Pallava temple with Somaskanda panels and painted traces from the 8th century.', 'எட்டாம் நூற்றாண்டு பல்லவர் மணற்கல் கோவில்; சோமாஸ்கந்தர் சிற்பங்கள்.'),
    p: B('Peace, art and heritage; Shiva\'s grace.', 'அமைதி, கலை, சிவனருள்.'),
    v: B('Built by the Pallava king Rajasimha (Narasimhavarman II). Its design inspired later Chola temples.', 'பல்லவ மன்னன் ராஜசிம்மன் (இரண்டாம் நரசிம்மவர்மன்) கட்டியது; பின்வந்த சோழர் கோவில்களுக்கு முன்மாதிரி.'),
    r: ['Kanchipuram', 'காஞ்சிபுரம்', 2], t: tm([['6:00', '12:30'], ['16:00', '19:30']]),
    f: B('Maha Shivaratri', 'மகா சிவராத்திரி'),
  },
  thiruvellarai: {
    s: B('Older than Srirangam by tradition; the Swastika-shaped step-well with four entrances.', 'ஸ்ரீரங்கத்தினும் பழமையானதாகக் கருதப்படும் தலம்; நான்கு வாயில் சுவஸ்திக் கிணறு.'),
    p: B('Prosperity, relief from troubles.', 'செல்வம், துன்ப நீக்கம்.'),
    v: B('Built on a white rock hill (vellai parai), hence the name. Sung by Periyazhwar and Thirumangai Azhwar.', 'வெள்ளைப் பாறை மேல் அமைந்ததால் திருவெள்ளறை. பெரியாழ்வார், திருமங்கை ஆழ்வார் பாடிய தலம்.'),
    r: ['Srirangam', 'ஸ்ரீரங்கம்', 17], t: VILLAGE,
    f: B('Chithirai Brahmotsavam', 'சித்திரைப் பிரம்மோற்சவம்'),
  },
  sholingur: {
    s: B('Yoga Narasimhar on a hill of about 1300 steps, with Yoga Anjaneyar on the facing hill.', 'சுமார் ஆயிரத்து முந்நூறு படிகள் கொண்ட மலையில் யோக நரசிம்மர்; எதிர் மலையில் யோக ஆஞ்சநேயர்.'),
    p: B('Relief from mental distress, fear and evil influences.', 'மனக் கலக்கம், அச்சம், தீய சக்திகள் நீக்கம்.'),
    v: B('Narasimha appeared in yogic posture to the Saptarishis, who meditated here for a ghatika (24 minutes) — hence Thirukkadigai. Anjaneyar sits in yoga facing him.', 'சப்தரிஷிகள் ஒரு கடிகை நேரம் தவம் செய்ய நரசிம்மர் யோகக் கோலத்தில் காட்சி தந்தார்; எனவே திருக்கடிகை.'),
    r: ['Sholinghur', 'சோளிங்கர்', 10], t: tm([['8:00', '17:30']], 'hill shrine; check timings', 'மலைக்கோவில்; நேரம் சரிபார்க்கவும்'),
    f: B('Karthigai Fridays', 'கார்த்திகை வெள்ளிக்கிழமைகள்'),
  },
  thiruchanur: {
    s: B('Padmavathi Thayar\'s shrine; customary to visit before or after Tirumala.', 'பத்மாவதி தாயார் சன்னிதி; திருமலை யாத்திரையுடன் தரிசனம் வழக்கம்.'),
    p: B('Wealth, marriage and family prosperity.', 'செல்வம், திருமணம், குடும்ப வளம்.'),
    v: B('Lakshmi is believed to have appeared on a golden lotus in the temple tank as Padmavathi after twelve years of penance by Srinivasa.', 'சீனிவாசர் பன்னிரண்டு ஆண்டு தவம் செய்ய, திருக்குளத்தில் பொற்றாமரையில் பத்மாவதியாக லட்சுமி தோன்றியதாக ஐதீகம்.'),
    r: ['Tirupati', 'திருப்பதி', 5], t: tm([['5:30', '21:00']]),
    f: B('Karthigai Brahmotsavam (Panchami Theertham)', 'கார்த்திகைப் பிரம்மோற்சவம் (பஞ்சமி தீர்த்தம்)'),
  },
  chottanikkara: {
    s: B('Bhagavathy worshipped as Saraswati in the morning, Lakshmi at noon and Durga in the evening.', 'காலையில் சரஸ்வதி, மதியம் லட்சுமி, மாலை துர்க்கையாக பகவதி வழிபாடு.'),
    p: B('Relief from mental illness and evil influences.', 'மன நோய், தீய சக்தி பாதிப்பு நீக்கம்.'),
    v: B('The lower shrine of Keezhkavu Bhagavathy is believed to free devotees from mental afflictions; a nail-studded tree there carries their offerings.', 'கீழ்க்காவு பகவதி சன்னிதி மனப் பாதிப்புகளை நீக்குவதாக நம்பிக்கை; அங்குள்ள மரத்தில் ஆணி அடிக்கும் வழக்கம்.'),
    r: ['Ernakulam Junction', 'எர்ணாகுளம் சந்திப்பு', 17], t: tm([['4:00', '12:00'], ['16:00', '20:30']]),
    f: B('Makam Thozhal (Kumbham)', 'மகம் தொழல் (மாசி)'),
  },
  attukal: {
    s: B('Attukal Pongala, where women cook offerings on streets across the city.', 'நகரெங்கும் பெண்கள் தெருவில் பொங்கலிடும் ஆற்றுக்கால் பொங்கல்.'),
    p: B('Family welfare, women\'s wishes and protection.', 'குடும்ப நலன், பெண்களின் வேண்டுதல், பாதுகாப்பு.'),
    v: B('The goddess is identified with Kannaki of the Silappathikaram, who rested here on her way after burning Madurai.', 'மதுரையை எரித்த பின் வழியில் இங்கு தங்கிய சிலப்பதிகாரக் கண்ணகியே அம்மையாகப் போற்றப்படுகிறாள்.'),
    r: ['Thiruvananthapuram Central', 'திருவனந்தபுரம் சென்ட்ரல்', 2], t: tm([['4:30', '12:30'], ['17:00', '20:30']]),
    f: B('Attukal Pongala (Kumbham)', 'ஆற்றுக்கால் பொங்கல் (மாசி)'),
  },
  padmanabhaswamy: {
    s: B('Reclining Vishnu on Adisesha seen through three doors; Hindus only, strict dress code.', 'மூன்று வாயில்கள் வழி ஆதிசேஷன் மேல் சயனப் பெருமாள்; கடுமையான உடைக் கட்டுப்பாடு.'),
    p: B('Prosperity, protection and moksha.', 'செல்வம், பாதுகாப்பு, முக்தி.'),
    v: B('The Travancore kings dedicated their kingdom to the Lord and ruled as his servants (Padmanabha Dasa). Sung by Nammazhwar.', 'திருவிதாங்கூர் மன்னர்கள் நாட்டையே இறைவனுக்கு அர்ப்பணித்து பத்மநாப தாசர்களாக ஆண்டனர். நம்மாழ்வார் பாடிய தலம்.'),
    r: ['Thiruvananthapuram Central', 'திருவனந்தபுரம் சென்ட்ரல்', 1], t: tm([['3:30', '12:00'], ['17:00', '20:00']], 'dress code applies', 'உடைக் கட்டுப்பாடு உண்டு'),
    f: B('Alpashi and Panguni Utsavam (Aarattu)', 'ஐப்பசி, பங்குனி உற்சவம் (ஆறாட்டு)'),
  },
};

export const TEMPLE_INFO = Object.fromEntries(TEMPLES.filter((t) => RAW[t.id]).map((t) => {
  const r = RAW[t.id];
  return [t.id, {
    sirappu: r.s,
    power: r.p,
    varalaru: r.v,
    airport: nearestAirport(t),
    rail: rail(...r.r),
    timings: r.t || STD,
    festival: r.f,
  }];
}));

/** Opening ranges in minutes after midnight, e.g. [[300, 750], [960, 1290]] (approximate; standard if unknown). */
export function templeRanges(id) {
  const r = (TEMPLE_INFO[id]?.timings || STD).ranges || STD.ranges;
  const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  return r.map(([a, b]) => [toMin(a), toMin(b)]);
}

/** Details for a temple id, or null. */
export const templeInfo = (id) => TEMPLE_INFO[id] || null;
