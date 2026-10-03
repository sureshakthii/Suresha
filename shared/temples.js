// Major South Indian temples with approximate (town-level) coordinates for distance and directions.
// Opening times (nadai thirappu) and booking are linked to official sources rather than guessed.
// tags: arupadai (Murugan's six abodes), pancha_bhoota, navagraha, divya_desam, amman, shiva, vishnu, murugan, vinayagar
const T = (id, en, ta, deityEn, deityTa, town, lat, lon, tags, noteEn, noteTa, planet = null) => ({
  id, name: { en, ta }, deity: { en: deityEn, ta: deityTa }, town, lat, lon, tags, note: { en: noteEn, ta: noteTa }, planet,
});

export const TEMPLES = [
  T('madurai_meenakshi', 'Meenakshi Amman Temple', 'மீனாட்சி அம்மன் கோவில்', 'Meenakshi & Sundareswarar', 'மீனாட்சி – சுந்தரேஸ்வரர்', 'Madurai', 9.9195, 78.1193, ['amman', 'shiva'], 'Grand temple city; Chithirai Thiruvizha is its greatest festival.', 'கோவில் நகரம்; சித்திரைத் திருவிழா பிரசித்தம்.'),
  T('srirangam', 'Sri Ranganathaswamy Temple', 'ஸ்ரீ ரங்கநாதசுவாமி கோவில்', 'Lord Ranganatha', 'ஸ்ரீ ரங்கநாதர்', 'Srirangam, Tiruchirappalli', 10.8624, 78.6898, ['vishnu', 'divya_desam'], 'First of the 108 Divya Desams; Vaikunta Ekadasi is celebrated grandly.', '108 திவ்ய தேசங்களில் முதன்மை; வைகுண்ட ஏகாதசி சிறப்பு.'),
  T('thanjavur_big', 'Brihadeeswarar Temple', 'பெருவுடையார் கோவில் (தஞ்சை பெரிய கோவில்)', 'Lord Peruvudaiyar (Shiva)', 'பெருவுடையார்', 'Thanjavur', 10.7828, 79.1318, ['shiva'], 'Chola masterpiece built by Raja Raja Chola I (UNESCO World Heritage).', 'ராஜராஜ சோழன் கட்டிய உலகப் பாரம்பரியச் சின்னம்.'),
  T('rameswaram', 'Ramanathaswamy Temple', 'ராமநாதசுவாமி கோவில்', 'Lord Ramanathaswamy (Shiva)', 'ராமநாதசுவாமி', 'Rameswaram', 9.2881, 79.3174, ['shiva'], 'One of the twelve Jyotirlingas; holy bath in the 22 theerthams.', 'ஜோதிர்லிங்கத் தலம்; 22 தீர்த்த நீராடல் சிறப்பு.'),
  T('chidambaram', 'Thillai Nataraja Temple', 'தில்லை நடராஜர் கோவில்', 'Lord Nataraja', 'நடராஜர்', 'Chidambaram', 11.3993, 79.6936, ['shiva', 'pancha_bhoota'], 'Pancha Bhoota sthalam for space (Akasha); Arudra Darisanam in Margazhi.', 'ஆகாயத் தலம்; மார்கழி ஆருத்ரா தரிசனம்.'),
  T('tiruvannamalai', 'Arunachaleswarar Temple', 'அருணாசலேஸ்வரர் கோவில்', 'Lord Arunachaleswarar', 'அருணாசலேஸ்வரர்', 'Tiruvannamalai', 12.2319, 79.0677, ['shiva', 'pancha_bhoota'], 'Pancha Bhoota sthalam for fire; Karthigai Deepam and full-moon Girivalam.', 'அக்னித் தலம்; கார்த்திகை தீபம், பௌர்ணமி கிரிவலம்.'),
  T('kanchi_ekambaram', 'Ekambareswarar Temple', 'ஏகாம்பரேஸ்வரர் கோவில்', 'Lord Ekambareswarar', 'ஏகாம்பரேஸ்வரர்', 'Kanchipuram', 12.8475, 79.6997, ['shiva', 'pancha_bhoota'], 'Pancha Bhoota sthalam for earth; ancient mango tree.', 'பிருத்வித் தலம்; புராதன மாமரம்.'),
  T('thiruvanaikaval', 'Jambukeswarar Temple', 'ஜம்புகேஸ்வரர் கோவில்', 'Lord Jambukeswarar & Akilandeswari', 'ஜம்புகேஸ்வரர் – அகிலாண்டேஸ்வரி', 'Thiruvanaikaval, Tiruchirappalli', 10.8530, 78.7058, ['shiva', 'pancha_bhoota'], 'Pancha Bhoota sthalam for water.', 'அப்புத் தலம் (நீர்).'),
  T('kalahasti', 'Sri Kalahasteeswara Temple', 'ஸ்ரீ காளஹஸ்தீஸ்வரர் கோவில்', 'Lord Kalahasteeswara', 'காளஹஸ்தீஸ்வரர்', 'Srikalahasti (Andhra Pradesh)', 13.7497, 79.6984, ['shiva', 'pancha_bhoota'], 'Pancha Bhoota sthalam for air; renowned for Rahu-Ketu pooja.', 'வாயுத் தலம்; ராகு-கேது பூஜை பிரசித்தம்.'),
  T('kanchi_kamakshi', 'Kamakshi Amman Temple', 'காமாட்சி அம்மன் கோவில்', 'Goddess Kamakshi', 'காமாட்சி அம்மன்', 'Kanchipuram', 12.8406, 79.7037, ['amman'], 'One of the Shakti Peethas.', 'சக்தி பீடங்களில் ஒன்று.'),
  T('kanchi_varadaraja', 'Varadharaja Perumal Temple', 'வரதராஜ பெருமாள் கோவில்', 'Lord Varadharaja', 'வரதராஜப் பெருமாள்', 'Kanchipuram', 12.8191, 79.7246, ['vishnu', 'divya_desam'], 'Divya Desam famed for the golden and silver lizards and Athi Varadar.', 'திவ்ய தேசம்; தங்க, வெள்ளிப் பல்லி, அத்தி வரதர்.'),
  T('thiruparankundram', 'Thiruparankundram Murugan Temple', 'திருப்பரங்குன்றம் முருகன் கோவில்', 'Lord Subramanya', 'சுப்பிரமணியர்', 'Madurai', 9.8806, 78.0717, ['murugan', 'arupadai'], 'First Padai Veedu — Murugan\'s wedding with Deivanai.', 'முதல் படை வீடு — தெய்வானை திருமணத் தலம்.'),
  T('tiruchendur', 'Tiruchendur Subramaniya Swamy Temple', 'திருச்செந்தூர் சுப்பிரமணிய சுவாமி கோவில்', 'Lord Senthil Andavar', 'செந்தில் ஆண்டவர்', 'Tiruchendur', 8.4964, 78.1251, ['murugan', 'arupadai'], 'Second Padai Veedu by the sea; Kanda Sashti Soorasamharam.', 'இரண்டாம் படை வீடு — கடற்கரை; கந்த சஷ்டி சூரசம்ஹாரம்.'),
  T('palani', 'Palani Dhandayuthapani Temple', 'பழனி தண்டாயுதபாணி கோவில்', 'Lord Dhandayuthapani', 'தண்டாயுதபாணி', 'Palani', 10.4434, 77.5205, ['murugan', 'arupadai'], 'Third Padai Veedu on the hill; Thai Poosam pilgrimage.', 'மூன்றாம் படை வீடு — மலைக்கோவில்; தைப்பூசம்.'),
  T('swamimalai', 'Swamimalai Swaminatha Swamy Temple', 'சுவாமிமலை சுவாமிநாதசுவாமி கோவில்', 'Lord Swaminatha', 'சுவாமிநாதர்', 'Swamimalai, Kumbakonam', 10.9575, 79.3256, ['murugan', 'arupadai'], 'Fourth Padai Veedu — Murugan taught Pranava to Shiva.', 'நான்காம் படை வீடு — தந்தைக்கு பிரணவ உபதேசம்.'),
  T('thiruthani', 'Thiruthani Murugan Temple', 'திருத்தணி முருகன் கோவில்', 'Lord Subramanya', 'சுப்பிரமணியர்', 'Thiruthani', 13.1764, 79.6135, ['murugan', 'arupadai'], 'Fifth Padai Veedu — 365 steps for the days of the year.', 'ஐந்தாம் படை வீடு — 365 படிகள்.'),
  T('pazhamudircholai', 'Pazhamudircholai Murugan Temple', 'பழமுதிர்ச்சோலை முருகன் கோவில்', 'Lord Subramanya', 'சுப்பிரமணியர்', 'Alagar Kovil, Madurai', 10.0748, 78.2196, ['murugan', 'arupadai'], 'Sixth Padai Veedu in the forested hills above Alagar Kovil.', 'ஆறாம் படை வீடு — அழகர் மலை.'),
  T('mylapore', 'Kapaleeshwarar Temple', 'கபாலீஸ்வரர் கோவில்', 'Lord Kapaleeshwarar & Karpagambal', 'கபாலீஸ்வரர் – கற்பகாம்பாள்', 'Mylapore, Chennai', 13.0339, 80.2696, ['shiva'], 'Panguni Peruvizha and the 63 Nayanmars procession.', 'பங்குனிப் பெருவிழா — அறுபத்து மூவர்.'),
  T('triplicane', 'Parthasarathy Temple', 'பார்த்தசாரதி கோவில்', 'Lord Parthasarathy', 'பார்த்தசாரதி', 'Triplicane, Chennai', 13.0545, 80.2766, ['vishnu', 'divya_desam'], 'Divya Desam where Krishna is worshipped as Arjuna\'s charioteer.', 'திவ்ய தேசம் — அர்ஜுனனின் சாரதியாக கிருஷ்ணர்.'),
  T('vadapalani', 'Vadapalani Murugan Temple', 'வடபழனி முருகன் கோவில்', 'Lord Murugan', 'முருகன்', 'Vadapalani, Chennai', 13.0525, 80.2122, ['murugan'], 'Popular for weddings in Chennai.', 'சென்னையில் திருமணங்களுக்குப் பிரசித்தம்.'),
  T('samayapuram', 'Samayapuram Mariamman Temple', 'சமயபுரம் மாரியம்மன் கோவில்', 'Goddess Mariamman', 'மாரியம்மன்', 'Samayapuram, Tiruchirappalli', 10.9227, 78.7413, ['amman'], 'Powerful Amman sthalam; Poochoridal festival.', 'சக்தி வாய்ந்த அம்மன் தலம்; பூச்சொரிதல்.'),
  T('trichy_rockfort', 'Ucchi Pillayar Temple (Rockfort)', 'உச்சிப் பிள்ளையார் கோவில் (மலைக்கோட்டை)', 'Lord Vinayagar', 'விநாயகர்', 'Tiruchirappalli', 10.8299, 78.6971, ['vinayagar'], 'Vinayagar atop the ancient Rockfort.', 'மலைக்கோட்டை உச்சியில் விநாயகர்.'),
  T('tirunelveli', 'Nellaiappar Temple', 'நெல்லையப்பர் கோவில்', 'Lord Nellaiappar & Kanthimathi', 'நெல்லையப்பர் – காந்திமதி', 'Tirunelveli', 8.7290, 77.6847, ['shiva'], 'Famous musical pillars.', 'இசைத் தூண்கள் பிரசித்தம்.'),
  T('srivilliputhur', 'Srivilliputhur Andal Temple', 'ஸ்ரீவில்லிபுத்தூர் ஆண்டாள் கோவில்', 'Goddess Andal & Lord Vatapatrasayee', 'ஆண்டாள் – வடபத்ரசாயி', 'Srivilliputhur', 9.5097, 77.6331, ['vishnu', 'divya_desam'], 'Birthplace of Andal; its gopuram is the Tamil Nadu emblem.', 'ஆண்டாள் அவதாரத் தலம்; தமிழக அரசுச் சின்ன கோபுரம்.'),
  T('kanyakumari', 'Kanyakumari Bhagavathi Amman Temple', 'கன்னியாகுமரி பகவதி அம்மன் கோவில்', 'Goddess Kanyakumari', 'கன்னியாகுமரி அம்மன்', 'Kanyakumari', 8.0780, 77.5550, ['amman'], 'At the meeting of three seas.', 'முக்கடல் சங்கமம்.'),
  T('suchindram', 'Thanumalayan Temple', 'தாணுமாலயன் கோவில்', 'Thanumalayan (Shiva, Vishnu, Brahma)', 'தாணுமாலயன்', 'Suchindram', 8.1547, 77.4676, ['shiva', 'vishnu'], 'Trimurti in one lingam; huge Anjaneyar statue.', 'மும்மூர்த்தி லிங்கம்; பெரிய ஆஞ்சநேயர்.'),
  T('thiruvarur', 'Thyagaraja Temple', 'தியாகராஜர் கோவில்', 'Lord Thyagaraja', 'தியாகராஜர்', 'Thiruvarur', 10.7720, 79.6363, ['shiva'], 'The great Aazhi Ther (temple car).', 'ஆழித் தேர் பிரசித்தம்.'),
  T('kumbakonam_adi', 'Adi Kumbeswarar Temple', 'ஆதி கும்பேஸ்வரர் கோவில்', 'Lord Adi Kumbeswarar', 'ஆதி கும்பேஸ்வரர்', 'Kumbakonam', 10.9580, 79.3755, ['shiva'], 'Linked to the Mahamaham festival.', 'மகாமகத் திருவிழாத் தலம்.'),
  T('kumbakonam_sarangapani', 'Sarangapani Temple', 'சாரங்கபாணி கோவில்', 'Lord Sarangapani', 'சாரங்கபாணி', 'Kumbakonam', 10.9603, 79.3779, ['vishnu', 'divya_desam'], 'Divya Desam with a chariot-shaped sanctum.', 'தேர் வடிவ கருவறை கொண்ட திவ்ய தேசம்.'),
  T('thirukadaiyur', 'Amritaghateswarar Temple', 'அமிர்தகடேஸ்வரர் கோவில்', 'Lord Amritaghateswarar & Abhirami', 'அமிர்தகடேஸ்வரர் – அபிராமி', 'Thirukadaiyur', 11.0700, 79.8250, ['shiva', 'amman'], 'Famous for Shashtiabdapoorthi (60th) and Sathabhishekam (80th) celebrations.', 'சஷ்டியப்தபூர்த்தி, சதாபிஷேகம் பிரசித்தம்.'),
  T('sankarankovil', 'Sankaranarayanar Temple', 'சங்கரநாராயணர் கோவில்', 'Lord Sankaranarayanar & Gomathi Amman', 'சங்கரநாராயணர் – கோமதி அம்மன்', 'Sankarankovil', 9.1700, 77.5470, ['shiva', 'vishnu', 'amman'], 'Shiva and Vishnu as one; Aadi Thapasu festival.', 'சிவனும் விஷ்ணுவும் ஒன்றாக; ஆடித் தபசு.'),
  T('marudhamalai', 'Marudhamalai Murugan Temple', 'மருதமலை முருகன் கோவில்', 'Lord Murugan', 'முருகன்', 'Coimbatore', 11.0465, 76.8507, ['murugan'], 'Hill temple at the edge of the Western Ghats.', 'மேற்குத் தொடர்ச்சி மலை அடிவாரக் கோவில்.'),
  T('perur', 'Perur Pateeswarar Temple', 'பேரூர் பட்டீஸ்வரர் கோவில்', 'Lord Pateeswarar', 'பட்டீஸ்வரர்', 'Perur, Coimbatore', 10.9760, 76.9150, ['shiva'], 'Ancient Chola-era temple with fine sculptures.', 'சோழர் காலச் சிற்பக் கோவில்.'),
  T('tirumala', 'Tirumala Venkateswara Temple', 'திருமலை ஏழுமலையான் கோவில்', 'Lord Venkateswara', 'ஏழுமலையான்', 'Tirumala (Andhra Pradesh)', 13.6833, 79.3474, ['vishnu', 'divya_desam'], 'Darshan tickets through the official TTD website.', 'தரிசன டிக்கெட் அதிகாரப்பூர்வ TTD இணையதளம் மூலம்.'),
  T('guruvayur', 'Guruvayur Sri Krishna Temple', 'குருவாயூர் கிருஷ்ணன் கோவில்', 'Lord Guruvayurappan', 'குருவாயூரப்பன்', 'Guruvayur (Kerala)', 10.5946, 76.0410, ['vishnu'], 'Famous for Annaprasanam (choroonu) and weddings.', 'அன்னப்பிராசனம், திருமணங்கள் பிரசித்தம்.'),
  T('sabarimala', 'Sabarimala Ayyappa Temple', 'சபரிமலை ஐயப்பன் கோவில்', 'Lord Ayyappa', 'ஐயப்பன்', 'Sabarimala (Kerala)', 9.4346, 77.0815, ['ayyappa'], 'Mandala season pilgrimage; virtual queue booking is mandatory.', 'மண்டல காலம்; மெய்நிகர் வரிசை முன்பதிவு அவசியம்.'),
  // Navagraha sthalams around Kumbakonam
  T('suriyanar', 'Suriyanar Kovil', 'சூரியனார் கோவில்', 'Lord Surya', 'சூரிய பகவான்', 'Near Kumbakonam', 11.0058, 79.4630, ['navagraha'], 'Navagraha sthalam for the Sun.', 'சூரியனுக்கான நவகிரகத் தலம்.', 'Sun'),
  T('thingalur', 'Thingalur Kailasanathar Temple', 'திங்களூர் கைலாசநாதர் கோவில்', 'Lord Kailasanathar (Chandran)', 'கைலாசநாதர் (சந்திரன்)', 'Near Thiruvaiyaru', 10.8760, 79.0980, ['navagraha'], 'Navagraha sthalam for the Moon.', 'சந்திரனுக்கான நவகிரகத் தலம்.', 'Moon'),
  T('vaitheeswaran', 'Vaitheeswaran Kovil', 'வைத்தீஸ்வரன் கோவில்', 'Lord Vaidyanathar (Angarakan)', 'வைத்தியநாதர் (அங்காரகன்)', 'Vaitheeswaran Kovil', 11.2010, 79.7110, ['navagraha', 'shiva'], 'Navagraha sthalam for Mars; Lord of healing.', 'செவ்வாய்க்கான நவகிரகத் தலம்; நோய் தீர்க்கும் வைத்தியநாதர்.', 'Mars'),
  T('thiruvenkadu', 'Thiruvenkadu Swetharanyeswarar Temple', 'திருவெண்காடு ஸ்வேதாரண்யேஸ்வரர் கோவில்', 'Lord Swetharanyeswarar (Budhan)', 'ஸ்வேதாரண்யேஸ்வரர் (புதன்)', 'Thiruvenkadu', 11.1700, 79.8070, ['navagraha', 'shiva'], 'Navagraha sthalam for Mercury.', 'புதனுக்கான நவகிரகத் தலம்.', 'Mercury'),
  T('alangudi', 'Alangudi Abathsahayeswarar Temple', 'ஆலங்குடி ஆபத்சகாயேஸ்வரர் கோவில்', 'Lord Abathsahayeswarar (Guru)', 'ஆபத்சகாயேஸ்வரர் (குரு)', 'Alangudi, near Needamangalam', 10.8700, 79.3800, ['navagraha', 'shiva'], 'Navagraha sthalam for Jupiter (Guru).', 'குருவுக்கான நவகிரகத் தலம்.', 'Jupiter'),
  T('kanjanur', 'Kanjanur Agneeswarar Temple', 'கஞ்சனூர் அக்னீஸ்வரர் கோவில்', 'Lord Agneeswarar (Sukran)', 'அக்னீஸ்வரர் (சுக்கிரன்)', 'Kanjanur', 11.0640, 79.4560, ['navagraha', 'shiva'], 'Navagraha sthalam for Venus.', 'சுக்கிரனுக்கான நவகிரகத் தலம்.', 'Venus'),
  T('thirunallar', 'Thirunallar Dharbaranyeswarar Temple', 'திருநள்ளாறு தர்பாரண்யேஸ்வரர் கோவில்', 'Lord Saneeswarar', 'சனீஸ்வரர்', 'Thirunallar (Karaikal)', 10.9260, 79.7930, ['navagraha', 'shiva'], 'Navagraha sthalam for Saturn; bath in Nala Theertham.', 'சனிக்கான நவகிரகத் தலம்; நள தீர்த்த நீராடல்.', 'Saturn'),
  T('thirunageswaram', 'Thirunageswaram Naganathar Temple', 'திருநாகேஸ்வரம் நாகநாதர் கோவில்', 'Lord Naganathar (Rahu)', 'நாகநாதர் (ராகு)', 'Thirunageswaram', 10.9632, 79.4285, ['navagraha', 'shiva'], 'Navagraha sthalam for Rahu; milk abhishekam turns blue.', 'ராகுவுக்கான தலம்; பாலபிஷேகம் நீல நிறமாகும்.', 'Rahu'),
  T('keezhaperumpallam', 'Keezhaperumpallam Naganathar Temple', 'கீழப்பெரும்பள்ளம் நாகநாதர் கோவில்', 'Lord Naganathar (Ketu)', 'நாகநாதர் (கேது)', 'Near Poompuhar', 11.1500, 79.8400, ['navagraha', 'shiva'], 'Navagraha sthalam for Ketu.', 'கேதுவுக்கான நவகிரகத் தலம்.', 'Ketu'),
];

export const TEMPLE_TAGS = [
  { id: 'all', en: 'All', ta: 'அனைத்தும்' },
  { id: 'navagraha', en: 'Navagraha', ta: 'நவகிரகம்' },
  { id: 'arupadai', en: 'Arupadai Veedu', ta: 'அறுபடை வீடு' },
  { id: 'pancha_bhoota', en: 'Pancha Bhoota', ta: 'பஞ்ச பூதம்' },
  { id: 'divya_desam', en: 'Divya Desam', ta: 'திவ்ய தேசம்' },
  { id: 'shiva', en: 'Shiva', ta: 'சிவன்' },
  { id: 'amman', en: 'Amman', ta: 'அம்மன்' },
  { id: 'murugan', en: 'Murugan', ta: 'முருகன்' },
  { id: 'vishnu', en: 'Perumal', ta: 'பெருமாள்' },
];

/** Great-circle distance in km. */
export function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad, dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Temples sorted by distance from a point, with an estimated road distance and drive time. */
export function templesNear(lat, lon, { tag = 'all', query = '' } = {}) {
  const q = query.trim().toLowerCase();
  return TEMPLES
    .filter((t) => tag === 'all' || t.tags.includes(tag))
    .filter((t) => !q || `${t.name.en} ${t.name.ta} ${t.town} ${t.deity.en} ${t.deity.ta}`.toLowerCase().includes(q))
    .map((t) => {
      const km = distanceKm(lat, lon, t.lat, t.lon);
      const roadKm = km * 1.3;
      return { ...t, km, roadKm, driveHours: roadKm / 45 };
    })
    .sort((a, b) => a.km - b.km);
}

export const templeLinks = (t) => ({
  directions: `https://www.google.com/maps/dir/?api=1&destination=${t.lat},${t.lon}`,
  hotels: `https://www.google.com/maps/search/hotels+near+${encodeURIComponent(`${t.name.en}, ${t.town}`)}`,
  hrce: 'https://hrce.tn.gov.in/',
});
