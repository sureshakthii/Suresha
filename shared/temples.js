// Major South Indian temples with approximate (town-level) coordinates for distance and directions.
// Opening times (nadai thirappu) and booking are linked to official sources rather than guessed.
// tags: arupadai (Murugan's six abodes), pancha_bhoota, navagraha, divya_desam, amman, shiva, vishnu, murugan, vinayagar
import { nearestPlace, placeTa } from './places.js';

const T = (id, en, ta, deityEn, deityTa, town, lat, lon, tags, noteEn, noteTa, planet = null) => ({
  id, name: { en, ta }, deity: { en: deityEn, ta: deityTa }, town, lat, lon, tags, note: { en: noteEn, ta: noteTa }, planet,
});

// Temples abroad: same shape plus the ISO country code.
const A = (cc, ...args) => { const t = T(...args); t.tags = [...t.tags, 'abroad']; return { ...t, cc, abroad: true }; };

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
  T('swamimalai', 'Swamimalai Swaminatha Swamy Temple', 'சுவாமிமலை சுவாமிநாதசுவாமி கோவில்', 'Lord Swaminatha', 'சுவாமிநாதர்', 'Swamimalai, Kumbakonam', 10.9575, 79.3256, ['murugan', 'arupadai'], 'Fourth Padai Veedu — Murugan taught Pranava to Shiva.', 'நான்காம் படை வீடு — தந்தைக்குப் பிரணவ உபதேசம்.'),
  T('thiruthani', 'Thiruthani Murugan Temple', 'திருத்தணி முருகன் கோவில்', 'Lord Subramanya', 'சுப்பிரமணியர்', 'Thiruthani', 13.1764, 79.6135, ['murugan', 'arupadai'], 'Fifth Padai Veedu — 365 steps for the days of the year.', 'ஐந்தாம் படை வீடு — 365 படிகள்.'),
  T('pazhamudircholai', 'Pazhamudircholai Murugan Temple', 'பழமுதிர்ச்சோலை முருகன் கோவில்', 'Lord Subramanya', 'சுப்பிரமணியர்', 'Alagar Kovil, Madurai', 10.0748, 78.2196, ['murugan', 'arupadai'], 'Sixth Padai Veedu in the forested hills above Alagar Kovil.', 'ஆறாம் படை வீடு — அழகர் மலை.'),
  T('mylapore', 'Kapaleeshwarar Temple', 'கபாலீஸ்வரர் கோவில்', 'Lord Kapaleeshwarar & Karpagambal', 'கபாலீஸ்வரர் – கற்பகாம்பாள்', 'Mylapore, Chennai', 13.0339, 80.2696, ['shiva'], 'Panguni Peruvizha and the 63 Nayanmars procession.', 'பங்குனிப் பெருவிழா — அறுபத்து மூவர்.'),
  T('triplicane', 'Parthasarathy Temple', 'பார்த்தசாரதி கோவில்', 'Lord Parthasarathy', 'பார்த்தசாரதி', 'Triplicane, Chennai', 13.0545, 80.2766, ['vishnu', 'divya_desam'], 'Divya Desam where Krishna is worshipped as Arjuna\'s charioteer.', 'திவ்ய தேசம் — அர்ஜுனனின் சாரதியாகக் கிருஷ்ணர்.'),
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
  T('tirumala', 'Tirumala Venkateswara Temple', 'திருமலை ஏழுமலையான் கோவில்', 'Lord Venkateswara', 'ஏழுமலையான்', 'Tirumala (Andhra Pradesh)', 13.6833, 79.3474, ['vishnu', 'divya_desam'], 'Darshan tickets through the official TTD website.', 'தரிசனச் சீட்டு அதிகாரப்பூர்வ திருமலை தேவஸ்தான இணையதளம் மூலம்.'),
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
  // More well-known temples (marriage, Saturn relief, Amman, Kerala and Andhra favourites)
  T('thirumanancheri', 'Thirumanancheri Kalyanasundareswarar Temple', 'திருமணஞ்சேரி கல்யாணசுந்தரேஸ்வரர் கோவில்', 'Lord Kalyanasundareswarar & Kokilambal', 'கல்யாணசுந்தரேஸ்வரர் – கோகிலாம்பாள்', 'Thirumanancheri, near Kuthalam', 11.0400, 79.6100, ['shiva'], 'Famed parihara sthalam for delayed marriage.', 'திருமணத் தடை நீங்கும் பரிகாரத் தலம்.'),
  T('thiruvidaimarudur', 'Thiruvidaimarudur Mahalingeswarar Temple', 'திருவிடைமருதூர் மகாலிங்கேஸ்வரர் கோவில்', 'Lord Mahalingeswarar', 'மகாலிங்கேஸ்வரர்', 'Thiruvidaimarudur', 10.9960, 79.4480, ['shiva'], 'Great Chola-era temple; relief from Brahmahathi dosham.', 'பிரம்மஹத்தி தோஷம் நீங்கும் தலம்.'),
  T('oppiliappan', 'Oppiliappan Temple', 'ஒப்பிலியப்பன் கோவில்', 'Lord Oppiliappan (Venkatachalapathy)', 'ஒப்பிலியப்பன்', 'Thirunageswaram, Kumbakonam', 10.9670, 79.4240, ['vishnu', 'divya_desam'], 'Divya Desam where the naivedyam is offered without salt.', 'உப்பில்லா நைவேத்தியம் படைக்கும் திவ்ய தேசம்.'),
  T('patteeswaram_durgai', 'Patteeswaram Durgai Amman Temple', 'பட்டீஸ்வரம் துர்க்கை அம்மன் கோவில்', 'Goddess Durgai & Lord Thenupureeswarar', 'துர்க்கை அம்மன் – தேனுபுரீஸ்வரர்', 'Patteeswaram, Kumbakonam', 10.9290, 79.3420, ['amman', 'shiva'], 'Rahu kalam worship of the serene Durgai.', 'ராகு காலத் துர்க்கை வழிபாடு பிரசித்தம்.'),
  T('thiruvalangadu', 'Thiruvalangadu Vadaranyeswarar Temple', 'திருவாலங்காடு வடாரண்யேஸ்வரர் கோவில்', 'Lord Vadaranyeswarar (Nataraja)', 'வடாரண்யேஸ்வரர் (நடராஜர்)', 'Thiruvalangadu, Tiruvallur', 13.1300, 79.7700, ['shiva'], 'Ratna Sabha of Nataraja; linked to Karaikal Ammaiyar.', 'நடராஜரின் ரத்தின சபை; காரைக்கால் அம்மையார் தலம்.'),
  T('thirukollikadu', 'Thirukollikadu Agneeswarar Temple', 'திருக்கொள்ளிக்காடு அக்னீஸ்வரர் கோவில்', 'Lord Agneeswarar & Pongu Saneeswarar', 'அக்னீஸ்வரர் – பொங்கு சனீஸ்வரர்', 'Thirukollikadu, near Thiruthuraipoondi', 10.6100, 79.5700, ['shiva'], 'Saturn appears here as the bestower, Pongu Sani.', 'பொங்கு சனியாக அருள் தரும் சனீஸ்வரர்.', 'Saturn'),
  T('kuchanur', 'Kuchanur Saneeswara Bhagavan Temple', 'குச்சனூர் சனீஸ்வர பகவான் கோவில்', 'Lord Saneeswarar (Swayambu)', 'சுயம்பு சனீஸ்வரர்', 'Kuchanur, Theni', 9.8600, 77.3900, [], 'Swayambu Saneeswarar on the Surabhi river bank.', 'சுரபி நதிக்கரையில் சுயம்பு சனீஸ்வரர்.', 'Saturn'),
  T('koodal_azhagar', 'Koodal Azhagar Temple', 'கூடல் அழகர் கோவில்', 'Lord Koodal Azhagar', 'கூடல் அழகர்', 'Madurai', 9.9145, 78.1155, ['vishnu', 'divya_desam'], 'Divya Desam in Madurai with Ashtanga vimanam.', 'அஷ்டாங்க விமானம் கொண்ட மதுரை திவ்ய தேசம்.'),
  T('alagar_kovil', 'Kallazhagar Temple', 'கள்ளழகர் கோவில்', 'Lord Kallazhagar (Sundararaja)', 'கள்ளழகர் (சுந்தரராஜப் பெருமாள்)', 'Alagar Kovil, Madurai', 10.0730, 78.2150, ['vishnu', 'divya_desam'], 'Azhagar\'s entry into the Vaigai crowns Chithirai festival.', 'சித்திரைத் திருவிழாவில் அழகர் வைகையில் இறங்குதல்.'),
  T('srivaikuntam', 'Srivaikuntam Vaikuntanathar Temple', 'ஸ்ரீவைகுண்டம் வைகுண்டநாதர் கோவில்', 'Lord Vaikuntanathar (Kallapiran)', 'வைகுண்டநாதர் (கள்ளப்பிரான்)', 'Srivaikuntam', 8.6310, 77.9130, ['vishnu', 'divya_desam'], 'First of the Nava Tirupathi; sun rays touch the deity in Chithirai.', 'நவ திருப்பதிகளில் முதல்; சித்திரையில் சூரிய ஒளி மூலவர் மீது.'),
  T('srinivasa_mangapuram', 'Sri Kalyana Venkateswara Temple', 'ஸ்ரீ கல்யாண வெங்கடேஸ்வரர் கோவில்', 'Lord Kalyana Venkateswara', 'கல்யாண வெங்கடேஸ்வரர்', 'Srinivasa Mangapuram (Andhra Pradesh)', 13.6170, 79.3210, ['vishnu'], 'Where the Lord stayed after marrying Padmavathi; newlyweds visit.', 'பத்மாவதி திருமணத்திற்குப் பின் தங்கிய தலம்; புதுமணத் தம்பதியர் வழிபாடு.'),
  T('thirumeyachur', 'Thirumeyachur Lalithambigai Temple', 'திருமீயச்சூர் லலிதாம்பிகை கோவில்', 'Goddess Lalithambigai & Lord Meghanathar', 'லலிதாம்பிகை – மேகநாதர்', 'Thirumeyachur, near Peralam', 10.9620, 79.6420, ['amman', 'shiva'], 'Revered as the place of the Lalitha Sahasranamam.', 'லலிதா சகஸ்ரநாமம் தோன்றிய தலமாகப் போற்றப்படுகிறது.'),
  T('thirupugalur', 'Thirupugalur Agneeswarar Temple', 'திருப்புகலூர் அக்னீஸ்வரர் கோவில்', 'Lord Agneeswarar', 'அக்னீஸ்வரர்', 'Thirupugalur, near Nannilam', 10.8350, 79.7300, ['shiva'], 'Devotees pray here to build their own house.', 'சொந்த வீடு கட்ட வேண்டிக்கொள்ளும் தலம்.'),
  T('sirkazhi', 'Sirkazhi Sattainathar Temple', 'சீர்காழி சட்டைநாதர் கோவில்', 'Lord Brahmapureeswarar & Sattainathar', 'பிரம்மபுரீஸ்வரர் – சட்டைநாதர்', 'Sirkazhi', 11.2380, 79.7380, ['shiva'], 'Birthplace of Thirugnanasambandar.', 'திருஞானசம்பந்தர் அவதாரத் தலம்.'),
  T('mayiladuthurai', 'Mayuranathar Temple', 'மயூரநாதர் கோவில்', 'Lord Mayuranathar & Abhayambigai', 'மயூரநாதர் – அபயாம்பிகை', 'Mayiladuthurai', 11.1030, 79.6520, ['shiva'], 'Aippasi Thula snanam in the Cauvery is famous.', 'ஐப்பசி துலா ஸ்நானம் பிரசித்தம்.'),
  T('thiruvidanthai', 'Nithya Kalyana Perumal Temple', 'நித்ய கல்யாணப் பெருமாள் கோவில்', 'Lord Nithya Kalyana Perumal (Varaha)', 'நித்ய கல்யாணப் பெருமாள் (வராகர்)', 'Thiruvidanthai, ECR', 12.7610, 80.2420, ['vishnu', 'divya_desam'], 'Divya Desam famed for removing marriage obstacles.', 'திருமணத் தடை நீக்கும் திவ்ய தேசம்.'),
  T('pillaiyarpatti', 'Pillaiyarpatti Karpaga Vinayagar Temple', 'பிள்ளையார்பட்டி கற்பக விநாயகர் கோவில்', 'Lord Karpaga Vinayagar', 'கற்பக விநாயகர்', 'Pillaiyarpatti, near Karaikudi', 10.1180, 78.6640, ['vinayagar'], 'Rock-cut Vinayagar with two arms.', 'குடைவரை இரு கர விநாயகர்.'),
  T('melmaruvathur', 'Melmaruvathur Adhiparasakthi Temple', 'மேல்மருவத்தூர் ஆதிபராசக்தி கோவில்', 'Goddess Adhiparasakthi', 'ஆதிபராசக்தி', 'Melmaruvathur', 12.4300, 79.8310, ['amman'], 'Devotees in red throng here; Irumudi in Thai and Masi.', 'செவ்வாடை பக்தர்கள்; இருமுடி வழிபாடு.'),
  T('mangadu_kamakshi', 'Mangadu Kamakshi Amman Temple', 'மாங்காடு காமாட்சி அம்மன் கோவில்', 'Goddess Kamakshi', 'காமாட்சி அம்மன்', 'Mangadu, Chennai', 13.0285, 80.1095, ['amman'], 'Where Kamakshi did penance on fire; prayers for marriage.', 'அக்னித் தவம் செய்த காமாட்சி; திருமண வேண்டுதல்.'),
  T('thiruverkadu', 'Thiruverkadu Devi Karumariamman Temple', 'திருவேற்காடு தேவி கருமாரியம்மன் கோவில்', 'Goddess Karumariamman', 'கருமாரியம்மன்', 'Thiruverkadu, Chennai', 13.0730, 80.1240, ['amman'], 'Popular Amman shrine of Chennai.', 'சென்னையின் பிரசித்தமான அம்மன் தலம்.'),
  T('kanchi_kailasanathar', 'Kailasanathar Temple', 'கைலாசநாதர் கோவில்', 'Lord Kailasanathar', 'கைலாசநாதர்', 'Kanchipuram', 12.8426, 79.6868, ['shiva'], 'Oldest structural temple of Kanchi, built by the Pallavas.', 'பல்லவர் கட்டிய காஞ்சியின் பழமையான கற்றளி.'),
  T('thiruvellarai', 'Thiruvellarai Pundarikakshan Temple', 'திருவெள்ளறை புண்டரீகாட்சன் கோவில்', 'Lord Pundarikakshan', 'புண்டரீகாட்சப் பெருமாள்', 'Thiruvellarai, Tiruchirappalli', 10.9680, 78.6680, ['vishnu', 'divya_desam'], 'Ancient Divya Desam with the Swastika step-well.', 'சுவஸ்திக் வடிவக் கிணறு கொண்ட பழமையான திவ்ய தேசம்.'),
  T('sholingur', 'Sholingur Yoga Narasimhar Temple', 'சோளிங்கர் யோக நரசிம்மர் கோவில்', 'Lord Yoga Narasimhar', 'யோக நரசிம்மர்', 'Sholingur', 13.1180, 79.4200, ['vishnu', 'divya_desam'], 'Hill Divya Desam (Thirukkadigai) with Yoga Anjaneyar opposite.', 'மலைத் திவ்ய தேசம் (திருக்கடிகை); எதிரில் யோக ஆஞ்சநேயர்.'),
  T('thiruchanur', 'Sri Padmavathi Ammavari Temple', 'ஸ்ரீ பத்மாவதி தாயார் கோவில்', 'Goddess Padmavathi', 'பத்மாவதி தாயார்', 'Tiruchanur (Andhra Pradesh)', 13.6070, 79.4500, ['amman', 'vishnu'], 'Consort of Lord Venkateswara; visited with the Tirumala yatra.', 'ஏழுமலையானின் துணைவி; திருமலை யாத்திரையுடன் தரிசனம்.'),
  T('chottanikkara', 'Chottanikkara Bhagavathy Temple', 'சோட்டாணிக்கரை பகவதி கோவில்', 'Goddess Rajarajeswari (Bhagavathy)', 'ராஜராஜேஸ்வரி (பகவதி)', 'Chottanikkara (Kerala)', 9.9340, 76.3910, ['amman'], 'Known for relief from mental distress; Makam Thozhal.', 'மன நோய் நீங்கும் தலம்; மகம் தொழல்.'),
  T('attukal', 'Attukal Bhagavathy Temple', 'ஆற்றுக்கால் பகவதி கோவில்', 'Goddess Attukal Amma (Kannaki)', 'ஆற்றுக்கால் அம்மை (கண்ணகி)', 'Thiruvananthapuram (Kerala)', 8.4695, 76.9573, ['amman'], 'Attukal Pongala draws vast numbers of women devotees.', 'ஆற்றுக்கால் பொங்கலுக்குப் பெருந்திரளான பெண்கள்.'),
  T('padmanabhaswamy', 'Sri Padmanabhaswamy Temple', 'ஸ்ரீ பத்மநாபசுவாமி கோவில்', 'Lord Anantha Padmanabha', 'அனந்த பத்மநாபர்', 'Thiruvananthapuram (Kerala)', 8.4828, 76.9436, ['vishnu', 'divya_desam'], 'Reclining Vishnu seen through three doors; strict dress code.', 'மூன்று வாயில்கள் வழி சயனக் கோலம்; உடைக் கட்டுப்பாடு உண்டு.'),
  // ---- Abroad: major Hindu / Tamil temples of the diaspora (approximate coordinates; timings and phone not listed —
  //      always check with the temple). `cc` is the ISO country.
  A('LK', 'nallur', 'Nallur Kandaswamy Kovil', 'நல்லூர் கந்தசுவாமி கோவில்', 'Lord Murugan (Kandaswamy)', 'கந்தசுவாமி (முருகன்)', 'Nallur, Jaffna', 9.6747, 80.0294, ['murugan'], 'The great Murugan temple of Jaffna; its 25-day annual festival (Aug–Sep) draws devotees from across the world.', 'யாழ்ப்பாணத்தின் பெருமைமிகு முருகன் கோவில்; 25 நாள் மகோற்சவத்திற்கு (ஆவணி–புரட்டாசி) உலகெங்குமிருந்து அடியார்கள் வருவர்.'),
  A('LK', 'koneswaram', 'Koneswaram Temple (Thirukonamalai)', 'திருக்கோணேச்சரம் (கோணேஸ்வரர் கோவில்)', 'Lord Koneswarar (Shiva) & Mathumai Ambal', 'கோணேஸ்வரர் – மாதுமை அம்பாள்', 'Trincomalee', 8.5826, 81.2450, ['shiva'], 'Clifftop Shiva temple on Swami Rock; one of the Pancha Ishwarams, sung in the Thevaram.', 'சுவாமி மலைப் பாறை மேல் சிவாலயம்; பஞ்ச ஈச்சரங்களில் ஒன்று, தேவாரப் பாடல் பெற்ற தலம்.'),
  A('LK', 'ketheeswaram', 'Thiruketheeswaram Temple', 'திருக்கேதீச்சரம்', 'Lord Ketheeswarar (Shiva) & Gowri Ambal', 'கேதீஸ்வரர் – கௌரி அம்பாள்', 'Mannar', 8.9733, 79.9378, ['shiva'], 'Ancient Shiva temple near Mannar; one of the Pancha Ishwarams, sung in the Thevaram. Maha Shivaratri is its great day.', 'மன்னார் அருகே தொன்மையான சிவாலயம்; பஞ்ச ஈச்சரங்களில் ஒன்று, தேவாரப் பாடல் பெற்றது. மகா சிவராத்திரி சிறப்பு.'),
  A('LK', 'munneswaram', 'Munneswaram Temple', 'முன்னேஸ்வரம் கோவில்', 'Lord Munnainathar (Shiva) & Vadivambikai', 'முன்னைநாதர் – வடிவாம்பிகை', 'Chilaw', 7.5795, 79.8217, ['shiva'], 'One of the Pancha Ishwarams on the west coast, linked with Rama in tradition; the annual festival is in Aug–Sep.', 'மேற்குக் கரையில் பஞ்ச ஈச்சரங்களில் ஒன்று; ராமருடன் தொடர்புடைய மரபு. ஆண்டு உற்சவம் ஆவணி–புரட்டாசியில்.'),
  A('LK', 'kataragama', 'Kataragama (Kathirkamam) Murugan Temple', 'கதிர்காமம் முருகன் கோவில்', 'Lord Kathirkama Kandan (Murugan)', 'கதிர்காமக் கந்தன்', 'Kataragama', 6.4189, 81.3326, ['murugan'], 'Revered by Hindus, Buddhists and others; the Esala festival (Jul–Aug) ends a long Pada Yatra from Jaffna.', 'இந்துக்கள், பௌத்தர்கள் அனைவரும் போற்றும் தலம்; ஆடி எசல விழா, யாழ்ப்பாணத்திலிருந்து பாத யாத்திரை.'),
  A('LK', 'nainativu', 'Nainativu Sri Nagapooshani Amman Kovil', 'நயினாதீவு ஸ்ரீ நாகபூஷணி அம்மன் கோவில்', 'Goddess Nagapooshani (Parvati)', 'நாகபூஷணி அம்மன்', 'Nainativu, Jaffna', 9.6116, 79.7740, ['amman'], 'Island Shakti peetham reached by boat from Kurikadduwan; the Aani festival (Jun–Jul) is the biggest.', 'குறிகட்டுவானிலிருந்து படகில் செல்லும் தீவுச் சக்தி பீடம்; ஆனித் திருவிழா பெரியது.'),
  A('MY', 'batu_caves', 'Batu Caves Sri Subramaniar Temple', 'பத்துமலை ஸ்ரீ சுப்பிரமணியர் கோவில்', 'Lord Subramaniar (Murugan)', 'ஸ்ரீ சுப்பிரமணியர் (முருகன்)', 'Batu Caves, Selangor', 3.2379, 101.6840, ['murugan'], 'Limestone cave temple up 272 steps beside a giant golden Murugan statue; Thaipusam draws vast crowds.', '272 படிகள் ஏறும் சுண்ணாம்புக் குகைக் கோவில், பெரிய தங்க முருகன் சிலை; தைப்பூசம் மிகப் பெரிய திருவிழா.'),
  A('MY', 'kl_mahamariamman', 'Sri Mahamariamman Temple, Kuala Lumpur', 'ஸ்ரீ மகா மாரியம்மன் கோவில், கோலாலம்பூர்', 'Goddess Mahamariamman', 'ஸ்ரீ மகா மாரியம்மன்', 'Kuala Lumpur', 3.1434, 101.6962, ['amman'], 'The oldest Hindu temple in Kuala Lumpur (1873); the Thaipusam silver chariot leaves from here for Batu Caves.', 'கோலாலம்பூரின் மிகப் பழைய இந்துக் கோவில் (1873); தைப்பூச வெள்ளி ரதம் இங்கிருந்து பத்துமலைக்குச் செல்லும்.'),
  A('MY', 'penang_waterfall', 'Arulmigu Balathandayuthapani Temple (Waterfall Hill), Penang', 'அருள்மிகு பாலதண்டாயுதபாணி கோவில் (தண்ணீர்மலை), பினாங்கு', 'Lord Balathandayuthapani (Murugan)', 'பாலதண்டாயுதபாணி (முருகன்)', 'George Town, Penang', 5.4350, 100.2980, ['murugan'], 'Hilltop Murugan temple reached by over 500 steps; the centre of Penang\'s Thaipusam.', '500-க்கும் மேற்பட்ட படிகள் ஏறும் மலைக் கோவில்; பினாங்கு தைப்பூசத்தின் மையம்.'),
  A('SG', 'sg_mariamman', 'Sri Mariamman Temple, Singapore', 'ஸ்ரீ மாரியம்மன் கோவில், சிங்கப்பூர்', 'Goddess Mariamman', 'ஸ்ரீ மாரியம்மன்', 'Singapore', 1.2826, 103.8452, ['amman'], 'Singapore\'s oldest Hindu temple (1827) in Chinatown; known for the Theemithi fire-walking festival.', 'சிங்கப்பூரின் மிகப் பழைய இந்துக் கோவில் (1827); தீமிதித் திருவிழா பிரசித்தம்.'),
  A('SG', 'sg_srinivasa_perumal', 'Sri Srinivasa Perumal Temple, Singapore', 'ஸ்ரீ சீனிவாசப் பெருமாள் கோவில், சிங்கப்பூர்', 'Lord Srinivasa Perumal', 'ஸ்ரீ சீனிவாசப் பெருமாள்', 'Singapore', 1.3116, 103.8560, ['vishnu'], 'Perumal temple on Serangoon Road in Little India; the Thaipusam procession begins here.', 'லிட்டில் இந்தியா சிராங்கூன் சாலையில் பெருமாள் கோவில்; தைப்பூச ஊர்வலம் இங்கிருந்து தொடங்கும்.'),
  A('SG', 'sg_thendayuthapani', 'Sri Thendayuthapani Temple, Singapore', 'ஸ்ரீ தெண்டாயுதபாணி கோவில், சிங்கப்பூர்', 'Lord Thendayuthapani (Murugan)', 'ஸ்ரீ தெண்டாயுதபாணி (முருகன்)', 'Singapore', 1.2944, 103.8433, ['murugan'], 'Tank Road Murugan temple built by the Nattukottai Chettiar community; the Thaipusam kavadis end here.', 'நகரத்தார் கட்டிய டேங்க் ரோடு முருகன் கோவில்; தைப்பூசக் காவடிகள் இங்கு நிறைவடையும்.'),
  A('MU', 'grand_bassin', 'Grand Bassin (Ganga Talao)', 'கிராண்ட் பாசின் (கங்கா தலாவ்)', 'Lord Shiva (Mangal Mahadev)', 'சிவபெருமான் (மங்கள் மகாதேவ்)', 'Grand Bassin', -20.4178, 57.4925, ['shiva'], 'Sacred crater lake in the hills of Mauritius; the island-wide Maha Shivaratri pilgrimage walks here.', 'மொரீஷியஸ் மலைகளில் புனித ஏரி; மகா சிவராத்திரிக்கு நாடு முழுவதிலிருந்தும் பாத யாத்திரை.'),
  A('GB', 'uk_balaji_tividale', 'Shri Venkateswara (Balaji) Temple, Tividale', 'ஸ்ரீ வெங்கடேஸ்வரா (பாலாஜி) கோவில், டிவிடேல்', 'Lord Venkateswara (Balaji)', 'ஸ்ரீ வெங்கடேஸ்வரர் (பாலாஜி)', 'Tividale', 52.5132, -2.0472, ['vishnu'], 'A large South Indian–style Balaji temple in the West Midlands.', 'மேற்கு மிட்லாண்ட்ஸில் தென்னிந்தியப் பாணி பெரிய பாலாஜி கோவில்.'),
  A('GB', 'uk_highgate_murugan', 'Highgate Hill Murugan Temple, London', 'ஹைகேட் ஹில் முருகன் கோவில், லண்டன்', 'Lord Murugan', 'முருகன்', 'Highgate, London', 51.5735, -0.1430, ['murugan'], 'One of the oldest Tamil Murugan temples in Britain; its chariot festival fills the street.', 'பிரிட்டனின் பழமையான தமிழ் முருகன் கோவில்களில் ஒன்று; தேர்த் திருவிழா சிறப்பு.'),
  A('GB', 'uk_ealing_kanaga_thurkkai', 'Shri Kanaga Thurkkai Amman Temple, Ealing', 'ஸ்ரீ கனக துர்க்கை அம்மன் கோவில், ஈலிங்', 'Goddess Kanaga Thurkkai', 'ஸ்ரீ கனக துர்க்கை அம்மன்', 'Ealing, London', 51.5114, -0.3175, ['amman'], 'Durga temple of the West London Tamil community.', 'மேற்கு லண்டன் தமிழ் மக்களின் துர்க்கை அம்மன் கோவில்.'),
  A('GB', 'uk_london_murugan', 'London Sri Murugan Temple, Manor Park', 'லண்டன் ஸ்ரீ முருகன் கோவில், மனோர் பார்க்', 'Lord Murugan', 'முருகன்', 'East Ham, London', 51.5466, 0.0476, ['murugan'], 'Granite South Indian–style Murugan temple in East London.', 'கிழக்கு லண்டனில் கருங்கல் தென்னிந்தியப் பாணி முருகன் கோவில்.'),
  A('US', 'us_pittsburgh_venkateswara', 'Sri Venkateswara Temple, Pittsburgh', 'ஸ்ரீ வெங்கடேஸ்வரா கோவில், பிட்ஸ்பர்க்', 'Lord Venkateswara (Balaji)', 'ஸ்ரீ வெங்கடேஸ்வரர் (பாலாஜி)', 'Penn Hills, Pittsburgh', 40.4622, -79.7966, ['vishnu'], 'One of the first traditional Hindu temples in the USA (1976), modelled on Tirumala.', 'அமெரிக்காவின் முதல் பாரம்பரிய இந்துக் கோவில்களில் ஒன்று (1976); திருமலை மாதிரி.'),
  A('US', 'us_flushing_ganesha', 'Ganesha Temple (Maha Vallabha Ganapati), Flushing', 'கணேசர் கோவில் (மகா வல்லப கணபதி), ஃபிளஷிங்', 'Lord Maha Vallabha Ganapati', 'மகா வல்லப கணபதி', 'Flushing, New York', 40.7516, -73.8207, ['vinayagar'], 'The Hindu Temple Society of North America\'s Ganesha temple in Queens, consecrated in 1977.', 'நியூயார்க் குயின்ஸில் 1977-ல் கும்பாபிஷேகம் செய்யப்பட்ட கணேசர் கோவில்.'),
  A('US', 'us_malibu_venkateswara', 'Malibu Hindu Temple (Sri Venkateswara)', 'மாலிபு இந்துக் கோவில் (ஸ்ரீ வெங்கடேஸ்வரா)', 'Lord Venkateswara', 'ஸ்ரீ வெங்கடேஸ்வரர்', 'Calabasas, near Malibu', 34.0963, -118.7086, ['vishnu'], 'Hill-country Venkateswara temple near Malibu in Los Angeles county.', 'லாஸ் ஏஞ்சலஸ் அருகே மாலிபு மலைப் பகுதியில் வெங்கடேஸ்வரர் கோவில்.'),
  A('US', 'us_pearland_meenakshi', 'Sri Meenakshi Temple, Pearland (Houston)', 'ஸ்ரீ மீனாட்சி கோவில், பேர்லேண்ட் (ஹூஸ்டன்)', 'Goddess Meenakshi & Sundareswarar', 'மீனாட்சி – சுந்தரேஸ்வரர்', 'Pearland, Houston', 29.5580, -95.3190, ['amman', 'shiva'], 'Meenakshi temple in the Madurai tradition near Houston.', 'ஹூஸ்டன் அருகே மதுரை மரபில் மீனாட்சி கோவில்.'),
  A('CA', 'ca_richmond_hill_ganesha', 'Richmond Hill Hindu Temple (Ganesha)', 'ரிச்மண்ட் ஹில் இந்துக் கோவில் (கணேசர்)', 'Lord Ganesha', 'கணேசர்', 'Richmond Hill, Ontario', 43.8905, -79.4005, ['vinayagar'], 'Large Ganesha temple in the Greater Toronto Area.', 'டொரன்டோ பெருநகரப் பகுதியில் பெரிய கணேசர் கோவில்.'),
  A('AU', 'au_helensburgh_venkateswara', 'Sri Venkateswara Temple, Helensburgh', 'ஸ்ரீ வெங்கடேஸ்வரா கோவில், ஹெலன்ஸ்பர்க்', 'Lord Venkateswara', 'ஸ்ரீ வெங்கடேஸ்வரர்', 'Helensburgh, NSW', -34.1894, 150.9940, ['vishnu'], 'Bushland Venkateswara temple south of Sydney.', 'சிட்னிக்குத் தெற்கே வனப்பகுதியில் வெங்கடேஸ்வரர் கோவில்.'),
  A('AU', 'au_sydney_murugan', 'Sydney Murugan Temple, Mays Hill', 'சிட்னி முருகன் கோவில், மேஸ் ஹில்', 'Lord Murugan', 'முருகன்', 'Mays Hill, Sydney', -33.8205, 150.9963, ['murugan'], 'Murugan temple of Sydney\'s Tamil community in western Sydney.', 'மேற்கு சிட்னித் தமிழ் மக்களின் முருகன் கோவில்.'),
  A('AU', 'au_melbourne_vinayagar', 'Sri Vakrathunda Vinayagar Temple, The Basin', 'ஸ்ரீ வக்ரதுண்ட விநாயகர் கோவில், தி பேசின்', 'Lord Vinayagar', 'விநாயகர்', 'The Basin, Melbourne', -37.8530, 145.3130, ['vinayagar'], 'Vinayagar temple in the Dandenong foothills of Melbourne.', 'மெல்போர்ன் டாண்டினாங் மலையடிவாரத்தில் விநாயகர் கோவில்.'),
  A('ZA', 'za_durban_ambalavanar', 'Shri Ambalavanar Alayam (Second River Temple), Durban', 'ஸ்ரீ அம்பலவாணர் ஆலயம் (செகண்ட் ரிவர் கோவில்), டர்பன்', 'Lord Shiva (Ambalavanar)', 'அம்பலவாணர் (சிவன்)', 'Cato Manor, Durban', -29.8560, 30.9805, ['shiva'], 'Historic Tamil temple of Durban, a national monument.', 'டர்பனின் வரலாற்றுச் சிறப்புமிக்க தமிழ்க் கோவில்; தேசியச் சின்னம்.'),
  A('AE', 'ae_dubai_hindu_temple', 'Hindu Temple Dubai (Jebel Ali)', 'இந்துக் கோவில் துபாய் (ஜெபல் அலி)', 'Shiva, Krishna and other deities', 'சிவன், கிருஷ்ணர் உள்ளிட்ட தெய்வங்கள்', 'Jebel Ali, Dubai', 25.0050, 55.1150, ['shiva', 'vishnu'], 'Opened in 2022 for Dubai\'s Hindu community, continuing the worship of the old Bur Dubai Shiva and Krishna shrines.', '2022-ல் திறக்கப்பட்டது; பழைய பர் துபாய் சிவன், கிருஷ்ணர் சன்னதிகளின் வழிபாட்டைத் தொடர்கிறது.'),
  A('FJ', 'fj_nadi_murugan', 'Sri Siva Subramaniya Swami Temple, Nadi', 'ஸ்ரீ சிவ சுப்பிரமணிய சுவாமி கோவில், நாடி', 'Lord Murugan', 'முருகன்', 'Nadi', -17.8037, 177.4171, ['murugan'], 'The largest Hindu temple in Fiji, in Dravidian style.', 'பிஜியின் மிகப் பெரிய இந்துக் கோவில், திராவிடப் பாணி.'),
  A('DE', 'de_hamm_kamadchi', 'Sri Kamadchi Ampal Temple, Hamm', 'ஸ்ரீ காமாட்சி அம்பாள் கோவில், ஹாம்', 'Goddess Kamadchi', 'ஸ்ரீ காமாட்சி அம்பாள்', 'Hamm', 51.6720, 7.9475, ['amman'], 'Large Tamil temple in Germany; its yearly chariot festival draws Tamils from across Europe.', 'ஜெர்மனியில் பெரிய தமிழ்க் கோவில்; ஆண்டுத் தேர்த் திருவிழாவுக்கு ஐரோப்பா முழுவதிலிருந்தும் வருவர்.'),
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
  { id: 'abroad', en: 'Abroad', ta: 'வெளிநாடு' },
];

/** Great-circle distance in km. */
export function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad, dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

for (const t of TEMPLES) t.cc ||= 'IN';

// Common alternate names and spellings people type (English, Tanglish and Tamil). Used only by search.
const ALIASES = {
  madurai_meenakshi: ['Madurai Meenakshi', 'Meenatchi Amman', 'Meenakshi Sundareswarar', 'மதுரை மீனாட்சி', 'மீனாட்சி சுந்தரேஸ்வரர்'],
  srirangam: ['Srirangam', 'Sreerangam', 'Thiruvarangam', 'Ranganathar', 'Arangan', 'ஸ்ரீரங்கம்', 'திருவரங்கம்', 'அரங்கநாதர்'],
  thanjavur_big: ['Thanjai Periya Kovil', 'Big Temple Tanjore', 'Brihadisvara', 'Brihadeeswara', 'Tanjore Big Temple', 'தஞ்சை பெரிய கோவில்', 'தஞ்சாவூர்'],
  rameswaram: ['Rameshwaram', 'Ramanathar', 'ராமேஸ்வரம்', 'ராமநாதர்'],
  chidambaram: ['Chidambaram Natarajar', 'Thillai', 'சிதம்பரம்', 'தில்லை'],
  tiruvannamalai: ['Thiruvannamalai', 'Annamalaiyar', 'Arunachala', 'Girivalam', 'திருவண்ணாமலை', 'அண்ணாமலையார்'],
  kanchi_ekambaram: ['Ekambaranathar', 'Kanchipuram Ekambareswarar', 'காஞ்சி ஏகாம்பரநாதர்'],
  thiruvanaikaval: ['Thiruvanaikoil', 'Tiruvanaikaval', 'Thiruvanaikka', 'Akilandeswari', 'திருவானைக்காவல்', 'திருவானைக்கோவில்'],
  kalahasti: ['Srikalahasti', 'Kalahasthi', 'Sri Kalahasthi', 'காளஹஸ்தி', 'ஸ்ரீகாளஹஸ்தி'],
  kanchi_kamakshi: ['Kanchi Kamakshi', 'Kanchipuram Kamatchi', 'காஞ்சி காமாட்சி'],
  kanchi_varadaraja: ['Kanchi Varadar', 'Athi Varadar', 'Varadarajar', 'அத்தி வரதர்', 'காஞ்சி வரதர்'],
  thiruparankundram: ['Thirupparankundram', 'Tiruparankunram', 'திருப்பரங்குன்றம்'],
  tiruchendur: ['Thiruchendur', 'Tiruchendur Murugan', 'Thiruchenthur', 'Senthil Andavar', 'Chendur', 'திருச்செந்தூர் முருகன்', 'செந்தூர்'],
  palani: ['Pazhani', 'Palani Murugan', 'Palani Malai', 'Pazhani Andavar', 'பழநி', 'பழனி முருகன்', 'பழனி மலை'],
  swamimalai: ['Swamimalai Murugan', 'Swaminathar', 'சுவாமிமலை முருகன்'],
  thiruthani: ['Tiruttani', 'Thiruttani', 'Tiruthani', 'திருத்தணிகை'],
  pazhamudircholai: ['Palamudircholai', 'Pazhamuthircholai', 'Solaimalai', 'சோலைமலை'],
  mylapore: ['Kapaleeswarar', 'Mylapore Kapaleeshwarar', 'Mylai', 'மயிலாப்பூர்', 'மயிலை கபாலீஸ்வரர்'],
  triplicane: ['Thiruvallikeni', 'Parthasarathy Perumal', 'திருவல்லிக்கேணி'],
  vadapalani: ['Vadapalani Andavar', 'வடபழனி'],
  samayapuram: ['Samayapuram Amman', 'சமயபுரம்'],
  trichy_rockfort: ['Malaikottai', 'Trichy Rockfort', 'Uchi Pillaiyar', 'Ucchi Pillaiyar', 'மலைக்கோட்டை', 'உச்சி பிள்ளையார்'],
  tirunelveli: ['Nellai', 'Nellaiyappar', 'Thirunelveli', 'நெல்லை'],
  srivilliputhur: ['Srivilliputtur', 'Andal Kovil', 'ஸ்ரீவில்லிபுத்தூர்', 'ஆண்டாள்'],
  kanyakumari: ['Kumari Amman', 'Cape Comorin', 'Bhagavathi Amman', 'குமரி அம்மன்'],
  suchindram: ['Sucheendram', 'சுசீந்திரம்'],
  thiruvarur: ['Tiruvarur', 'Thiyagarajar', 'திருவாரூர்'],
  kumbakonam_adi: ['Kumbeswarar', 'Kudanthai', 'கும்பகோணம்', 'குடந்தை'],
  kumbakonam_sarangapani: ['Sarangapani Perumal', 'Kudanthai Sarangapani', 'சாரங்கபாணி'],
  thirukadaiyur: ['Thirukkadaiyur', 'Abhirami', 'Thirukadaiyur Abirami', 'திருக்கடையூர்', 'அபிராமி'],
  sankarankovil: ['Sankarankoil', 'Gomathi Amman', 'சங்கரன்கோவில்'],
  marudhamalai: ['Maruthamalai', 'Marudamalai', 'மருதமலை'],
  perur: ['Perur Patteeswarar', 'பேரூர்'],
  tirumala: ['Tirupati', 'Thirupathi', 'Tirupathi Balaji', 'Balaji', 'Venkatachalapathy', 'Ezhumalaiyan', 'Srinivasa', 'திருப்பதி', 'ஏழுமலையான்', 'பாலாஜி', 'வெங்கடாசலபதி'],
  guruvayur: ['Guruvayoor', 'Guruvayurappan', 'குருவாயூர்'],
  sabarimala: ['Sabarimalai', 'Ayyappan', 'Swami Ayyappa', 'சபரிமலை', 'ஐயப்பன்'],
  suriyanar: ['Suriyanar Koil', 'Surya Temple', 'சூரியனார் கோவில்'],
  thingalur: ['Chandran Temple', 'திங்களூர்'],
  vaitheeswaran: ['Vaitheeswarankoil', 'Vaideeswaran', 'Angarakan', 'Sevvai Sthalam', 'வைத்தீஸ்வரன்கோவில்', 'செவ்வாய் தலம்'],
  thiruvenkadu: ['Thiruvengadu', 'Budhan Sthalam', 'திருவெண்காடு', 'புதன் தலம்'],
  alangudi: ['Guru Sthalam', 'Alangudi Guru', 'ஆலங்குடி', 'குரு தலம்'],
  kanjanur: ['Sukran Sthalam', 'கஞ்சனூர்', 'சுக்கிரன் தலம்'],
  thirunallar: ['Thirunallaru', 'Tirunallar', 'Saneeswaran', 'Sani Bhagavan', 'Sani Temple', 'திருநள்ளாறு', 'சனீஸ்வரன்'],
  thirunageswaram: ['Rahu Sthalam', 'Thirunageshwaram', 'திருநாகேஸ்வரம்', 'ராகு தலம்'],
  keezhaperumpallam: ['Kizhaperumpallam', 'Ketu Sthalam', 'கீழப்பெரும்பள்ளம்', 'கேது தலம்'],
  thirumanancheri: ['Thirumanamcheri', 'Kalyanasundarar', 'திருமணஞ்சேரி'],
  oppiliappan: ['Uppiliappan', 'ஒப்பிலியப்பன்'],
  patteeswaram_durgai: ['Patteeswaram', 'Pattiswaram Durga', 'பட்டீஸ்வரம்'],
  kuchanur: ['Kuchanoor', 'Kuchanur Sani', 'குச்சனூர்'],
  koodal_azhagar: ['Koodalalagar', 'Koodal Alagar', 'கூடலழகர்'],
  alagar_kovil: ['Azhagar Kovil', 'Alagar Koil', 'Kallalagar', 'அழகர் கோவில்', 'கள்ளழகர்'],
  pillaiyarpatti: ['Pillayarpatti', 'Karpaga Vinayagar', 'பிள்ளையார்பட்டி'],
  melmaruvathur: ['Melmaruvathur Amma', 'Adhiparasakthi', 'மேல்மருவத்தூர்'],
  mangadu_kamakshi: ['Mangadu', 'Maangadu', 'மாங்காடு'],
  thiruverkadu: ['Karumari Amman', 'Thiruverkadu Karumari', 'திருவேற்காடு', 'கருமாரி'],
  thiruchanur: ['Tiruchanoor', 'Padmavathi Thayar', 'Alamelu Mangapuram', 'திருச்சானூர்', 'அலமேலு மங்காபுரம்'],
  chottanikkara: ['Chottanikara', 'சோட்டாணிக்கரை'],
  attukal: ['Attukal Pongala', 'ஆற்றுக்கால்'],
  padmanabhaswamy: ['Anantha Padmanabha', 'Trivandrum Padmanabha', 'Thiruvananthapuram Perumal', 'பத்மநாபசுவாமி', 'அனந்த பத்மநாபர்'],
  nallur: ['Nallur Murugan', 'Nallur Kandasamy', 'Jaffna Nallur', 'நல்லூர் முருகன்', 'நல்லூர் கந்தசாமி', 'யாழ் நல்லூர்'],
  koneswaram: ['Thirukonamalai', 'Trincomalee Koneswarar', 'Thirukoneswaram', 'கோணேஸ்வரம்', 'திருகோணமலை'],
  ketheeswaram: ['Thiruketheeswaram', 'Mannar Ketheeswaram', 'கேதீஸ்வரம்'],
  munneswaram: ['Munneswaram Chilaw', 'முன்னேஸ்வரம்'],
  kataragama: ['Kathirgamam', 'Kathirkamam', 'Katirkamam', 'Kataragama Devalaya', 'கதிர்காமம்'],
  nainativu: ['Nainativu Amman', 'Nagadeepa', 'Nainatheevu', 'நயினாதீவு', 'நாகபூசணி'],
  batu_caves: ['Batu Malai', 'Batumalai', 'Pathumalai', 'Batu Caves Murugan', 'பத்துமலை', 'பத்து மலை', 'பத்து குகை'],
  kl_mahamariamman: ['KL Mariamman', 'Kuala Lumpur Mariamman', 'கோலாலம்பூர் மாரியம்மன்'],
  penang_waterfall: ['Thanneer Malai', 'Thanneermalai', 'Penang Murugan', 'Waterfall Hill Temple', 'தண்ணீர்மலை', 'பினாங்கு முருகன்'],
  sg_mariamman: ['Singapore Mariamman', 'Chinatown Mariamman', 'சிங்கப்பூர் மாரியம்மன்'],
  sg_srinivasa_perumal: ['Singapore Perumal', 'Serangoon Perumal', 'சிங்கப்பூர் பெருமாள்'],
  sg_thendayuthapani: ['Tank Road Murugan', 'Chettiar Temple Singapore', 'Singapore Murugan', 'சிங்கப்பூர் முருகன்'],
  grand_bassin: ['Ganga Talao', 'Mauritius Shiva', 'கங்கா தலாவ்'],
  uk_balaji_tividale: ['Balaji Temple UK', 'Birmingham Balaji', 'பாலாஜி கோவில்'],
  uk_highgate_murugan: ['Highgate Murugan', 'London Murugan Highgate'],
  uk_london_murugan: ['East Ham Murugan', 'Manor Park Murugan'],
  us_flushing_ganesha: ['Flushing Ganesh', 'New York Ganesha', 'Queens Ganesha'],
  us_pearland_meenakshi: ['Houston Meenakshi', 'Pearland Meenakshi', 'ஹூஸ்டன் மீனாட்சி'],
  ca_richmond_hill_ganesha: ['Toronto Ganesha', 'Richmond Hill Ganesh'],
  au_sydney_murugan: ['Sydney Murugan', 'சிட்னி முருகன்'],
  ae_dubai_hindu_temple: ['Dubai Temple', 'Jebel Ali Temple', 'துபாய் கோவில்'],
  de_hamm_kamadchi: ['Hamm Kamatchi', 'Hamm Amman', 'ஹாம் காமாட்சி'],
};
for (const t of TEMPLES) t.alt = ALIASES[t.id] || [];

// ---------------------------------------------------------------- search (offline, from the built-in data)
const ZW = /[​-‍﻿]/g;
/**
 * Fold text for forgiving matching. English / Tanglish: lower case, accents removed, the common spelling pairs
 * merged (th→t, dh→d, zh→l, sh→s, ch→c, e/ee→i, o/oo→u, w→v, double letters → one) and spaces / punctuation dropped,
 * so "Thiruchendur", "tiruchendur" and "Thiru Chendur" all become "tirucendur". Tamil: spaces and joiners
 * dropped and the letters people commonly swap merged (ண/ந→ன, ள/ழ→ல, ற→ர).
 */
export function foldText(s) {
  let x = String(s || '').normalize('NFC').toLowerCase().replace(ZW, '');
  x = x.normalize('NFD').replace(/[̀-ͯ]/g, '');
  x = x.replace(/[ணந]/g, 'ன').replace(/[ளழ]/g, 'ல').replace(/ற/g, 'ர');
  // Pulli dropped and a doubled consonant merged, so திருசெந்தூர் meets திருச்செந்தூர் and a half-typed தில் meets தில்லை.
  x = x.replace(/்/g, '').replace(/([க-ஹ])\1+/g, '$1');
  // Long / short vowels are merged too (e→i, o→u), so a half-typed "Kapale…" still meets "Kapaleeshwarar".
  // zh (and z after a vowel, "Pazani") is ழ → l; y not before a vowel is the vowel i ("Palany", "Tirupathy").
  x = x.replace(/zh/g, 'l').replace(/([aeiou])z/g, '$1l').replace(/y(?![aeiou])/g, 'i').replace(/x/g, 'ks').replace(/q/g, 'k').replace(/w/g, 'v')
    .replace(/([tdskpbgc])h/g, '$1').replace(/e/g, 'i').replace(/o/g, 'u')
    .replace(/([a-z])\1+/g, '$1');
  return x.replace(/[^\p{L}\p{M}\p{N}]+/gu, '');
}
const words = (s) => String(s || '').split(/[\s,()–\-/&.]+/).filter(Boolean).map(foldText).filter(Boolean);
const HONORIFIC = /^(sri|shri|arulmigu|ஸ்ரீ|அருல்மிகு)/;

// The temple's category chips (Navagraha, Divya Desam …) in both languages, so typing "navagraha" finds those temples.
const tagWords = (t) => (t.tags || []).flatMap((id) => { const g = TEMPLE_TAGS.find((x) => x.id === id); return g ? [g.en, g.ta] : [id.replace(/_/g, ' ')]; });

// Pre-folded search keys per temple: names (both languages) and alternates are "primary"; town and deity "secondary".
const KEYS = new Map();
function keysOf(t) {
  let k = KEYS.get(t.id);
  if (k) return k;
  const townTa = placeTa(t.town);
  const primary = [t.name.en, t.name.ta, t.id.replace(/_/g, ' '), ...t.alt];
  const secondary = [t.town, townTa, t.deity.en, t.deity.ta, `${t.town.split(',')[0]} ${t.name.en}`, `${townTa.split(',')[0]} ${t.name.ta}`, ...tagWords(t)];
  k = {
    primary: primary.map(foldText).flatMap((x) => [x, x.replace(HONORIFIC, '')]),
    secondary: secondary.map(foldText),
    words: [...primary, ...secondary].flatMap(words),
  };
  KEYS.set(t.id, k);
  return k;
}

/**
 * How well a temple matches a query: 0 = a name / alternate name starts with it, 1 = the town or deity starts with
 * it, 2 = a word starts with it, 3 = it appears inside a name, town or deity (folded query of 4+ letters); -1 = no match.
 */
export function templeMatchTier(t, query) {
  const q = foldText(query);
  if (!q) return 0;
  const k = keysOf(t);
  if (k.primary.some((x) => x.startsWith(q))) return 0;
  if (k.secondary.some((x) => x.startsWith(q))) return 1;
  if (k.words.some((x) => x.startsWith(q))) return 2;
  if (q.length >= 4 && [...k.primary, ...k.secondary].some((x) => x.includes(q))) return 3;
  return -1;
}

/**
 * Live temple suggestions for a search box. Works offline from TEMPLES (India and abroad), on 1+ letters of Tamil,
 * English or Tanglish. Ranked by match tier (prefix of the name first), then by distance from (lat, lon) when given,
 * then by English name. Each result: the temple plus { tier, km (straight line, or null) }.
 */
export function searchTemples(query, { lat = null, lon = null, limit = 8, tag = 'all' } = {}) {
  if (!foldText(query)) return [];
  const hasLoc = Number.isFinite(lat) && Number.isFinite(lon);
  return TEMPLES
    .filter((t) => tag === 'all' || t.tags.includes(tag))
    .map((t) => ({ t, tier: templeMatchTier(t, query) }))
    .filter((x) => x.tier >= 0)
    .map(({ t, tier }) => ({ ...t, tier, km: hasLoc ? distanceKm(lat, lon, t.lat, t.lon) : null }))
    .sort((a, b) => a.tier - b.tier || (hasLoc ? a.km - b.km : 0) || a.name.en.localeCompare(b.name.en))
    .slice(0, limit);
}

/** Country of a point: the nearest built-in place (within 400 km), else null. */
export function countryAt(lat, lon) {
  return nearestPlace(lat, lon, { maxKm: 400 })?.cc || null;
}

/**
 * How to get from a point in country `fromCc` to a temple `km` away (straight line): by road, or — when it is far
 * or across a border/sea — a flight suggestion. Flight time ≈ 3 h at the airports + km / 700 km/h.
 */
export function travelMode(km, fromCc, toCc) {
  const flight = km > 700 || (fromCc && toCc && fromCc !== toCc && km > 120);
  return flight ? { mode: 'flight', flightHours: 3 + km / 700 } : { mode: 'road' };
}

/** Temples sorted by distance from a point, with an estimated road distance and drive time (or a flight hint). */
export function templesNear(lat, lon, { tag = 'all', query = '' } = {}) {
  const q = String(query || '').trim();
  const fromCc = countryAt(lat, lon);
  return TEMPLES
    .filter((t) => tag === 'all' || t.tags.includes(tag))
    .filter((t) => !q || templeMatchTier(t, q) >= 0)
    .map((t) => {
      const km = distanceKm(lat, lon, t.lat, t.lon);
      const roadKm = km * 1.3;
      return { ...t, km, roadKm, driveHours: roadKm / 45, ...travelMode(km, fromCc, t.cc) };
    })
    .sort((a, b) => a.km - b.km);
}

export const templeLinks = (t) => ({
  directions: `https://www.google.com/maps/dir/?api=1&destination=${t.lat},${t.lon}`,
  hotels: `https://www.google.com/maps/search/hotels+near+${encodeURIComponent(`${t.name.en}, ${t.town}`)}`,
  hrce: t.cc && t.cc !== 'IN' ? null : 'https://hrce.tn.gov.in/',
  // Live phone number, today's timings and reviews from the temple's Google Maps listing (kept current by Google).
  contact: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${t.name.en} ${t.town}`)}`,
  official: OFFICIAL[t.id] || null,
});

// Official websites only where the address is well established; everything else uses the live Maps listing.
const OFFICIAL = {
  tirupati: 'https://www.tirumala.org/',
  tirumala: 'https://www.tirumala.org/',
  sabarimala: 'https://sabarimalaonline.org/',
  guruvayur: 'https://guruvayurdevaswom.in/',
};
