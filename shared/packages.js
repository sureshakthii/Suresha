// Pilgrimage & parigaram packages (யாத்திரை பேக்கேஜ்): temples, day-wise route and what is included.
// Prices are quoted per family by the operations team, so no prices are shown here.
import { TEMPLES, distanceKm } from './temples.js';

const P = (id, icon, en, ta, days, stops, forEn, forTa, extraEn = [], extraTa = []) => ({ id, icon, name: { en, ta }, days, stops, for: { en: forEn, ta: forTa }, extra: { en: extraEn, ta: extraTa } });

export const PACKAGES = [
  P('navagraha', '🪐', 'Navagraha Yatra (all nine planets)', 'நவகிரக யாத்திரை (ஒன்பது கிரகங்கள்)', 2,
    [['suriyanar', 'kanjanur', 'vaitheeswaran', 'thiruvenkadu', 'keezhaperumpallam'], ['thirunallar', 'thirunageswaram', 'alangudi', 'thingalur']],
    'For weak planets, dasa sandhi, Ezharai / Ashtama Sani', 'பலவீன கிரகங்கள், தசா சந்தி, ஏழரை / அஷ்டமச் சனிக்கு',
    ['Navagraha archanai at each temple', 'Navadhanya and vastra set for each planet'], ['ஒவ்வொரு கோவிலிலும் நவகிரக அர்ச்சனை', 'ஒவ்வொரு கிரகத்திற்கும் நவதானியம், வஸ்திரம்']),
  P('arupadai', '🦚', 'Arupadai Veedu — six abodes of Murugan', 'அறுபடை வீடு யாத்திரை', 5,
    [['thiruparankundram', 'pazhamudircholai'], ['tiruchendur'], ['palani'], ['swamimalai'], ['thiruthani']],
    'For Chevvai dosham, courage, marriage and property', 'செவ்வாய் தோஷம், தைரியம், திருமணம், சொத்துக்கு',
    ['Abhishekam booking where available', 'Kavadi / special darshan guidance'], ['இயன்ற இடங்களில் அபிஷேக முன்பதிவு', 'காவடி / சிறப்பு தரிசன வழிகாட்டல்']),
  P('pancha_bhoota', '🔥', 'Pancha Bhoota Sthalam Yatra', 'பஞ்ச பூதத் தல யாத்திரை', 4,
    [['kalahasti'], ['kanchi_ekambaram', 'kanchi_kamakshi'], ['tiruvannamalai'], ['chidambaram', 'thiruvanaikaval']],
    'For overall balance, health and spiritual progress', 'முழுமையான சமநிலை, ஆரோக்கியம், ஆன்மீக முன்னேற்றத்திற்கு',
    ['Rahu–Ketu pooja at Srikalahasti (optional)'], ['ஸ்ரீகாளஹஸ்தியில் ராகு–கேது பூஜை (விருப்பம்)']),
  P('thirukadaiyur', '🪔', 'Shashtiabdapoorthi / Sathabhishekam at Thirukadaiyur', 'திருக்கடையூரில் சஷ்டியப்தபூர்த்தி / சதாபிஷேகம்', 2,
    [['thirukadaiyur'], ['vaitheeswaran']],
    '60th, 70th and 80th celebrations', '60, 70, 80-ம் ஆண்டு விழாக்களுக்கு',
    ['Ayush homam and kalasa abhishekam with priests', 'Muhurtham on the birth-star day', 'Family stay and meals'], ['புரோகிதர்களுடன் ஆயுஷ் ஹோமம், கலச அபிஷேகம்', 'ஜென்ம நட்சத்திர நாளில் முகூர்த்தம்', 'குடும்பத் தங்குமிடம், உணவு']),
  P('rahu_ketu', '🐍', 'Rahu–Ketu dosha parigaram', 'ராகு–கேது தோஷ பரிகாரம்', 2,
    [['kalahasti'], ['thirunageswaram', 'keezhaperumpallam']],
    'For Rahu–Ketu dosham, Sarpa dosham and Rahu/Ketu dasa', 'ராகு–கேது தோஷம், சர்ப்ப தோஷம், ராகு/கேது தசைக்கு',
    ['Rahu Kalam pooja with milk abhishekam'], ['ராகு கால பூஜை, பாலபிஷேகம்']),
  P('sani', '♄', 'Sani parigaram at Thirunallar', 'திருநள்ளாறு சனி பரிகாரம்', 1,
    [['thirunallar']],
    'For Ezharai Sani, Ashtama Sani and Saturn dasa', 'ஏழரைச் சனி, அஷ்டமச் சனி, சனி தசைக்கு',
    ['Nala Theertham bath', 'Ellu deepam and Sani archanai'], ['நள தீர்த்த நீராடல்', 'எள் தீபம், சனி அர்ச்சனை']),
  P('rameswaram', '🌊', 'Rameswaram theertham & tharpanam', 'ராமேஸ்வரம் தீர்த்தம் & தர்ப்பணம்', 2,
    [['rameswaram'], ['madurai_meenakshi']],
    'For pitru tharpanam, ancestors\' blessings and dosha nivarthi', 'பித்ரு தர்ப்பணம், முன்னோர் ஆசி, தோஷ நிவர்த்திக்கு',
    ['Agni Theertham and 22 theertham bath', 'Tharpanam with a priest'], ['அக்னி தீர்த்தம், 22 தீர்த்த நீராடல்', 'புரோகிதருடன் தர்ப்பணம்']),
  P('marriage', '💐', 'Marriage blessings yatra', 'திருமணத் தடை நீக்கும் யாத்திரை', 2,
    [['thirumanancheri', 'oppiliappan'], ['thiruvidanthai', 'mangadu_kamakshi']],
    'For delayed marriage, dosham and a happy married life', 'திருமணத் தாமதம், தோஷம் நீங்கி மகிழ்ச்சியான மண வாழ்க்கைக்கு',
    ['Kalyana parigaram archanai with garland', 'Muhurtham for the visit from your Jathagam'], ['மாலையுடன் கல்யாணப் பரிகார அர்ச்சனை', 'ஜாதகப்படி தரிசன முகூர்த்தம்']),
  P('sani_full', '🪔', 'Sani relief yatra (Ezharai / Ashtama)', 'சனி நிவர்த்தி யாத்திரை (ஏழரை / அஷ்டமம்)', 3,
    [['thirunallar', 'thirukollikadu'], ['kuchanur'], ['sholingur']],
    'For Ezharai Sani, Ashtama Sani and Saturn dasa', 'ஏழரைச் சனி, அஷ்டமச் சனி, சனி தசைக்கு',
    ['Ellu deepam and Sani archanai at each temple', 'Anjaneyar vadai malai at Sholingur'], ['ஒவ்வொரு கோவிலிலும் எள் தீபம், சனி அர்ச்சனை', 'சோளிங்கரில் ஆஞ்சநேயருக்கு வடை மாலை']),
  P('shakti', '🔱', 'Shakti Amman yatra', 'சக்தி அம்மன் யாத்திரை', 3,
    [['mangadu_kamakshi', 'thiruverkadu', 'kanchi_kamakshi'], ['melmaruvathur'], ['samayapuram', 'thirumeyachur']],
    'For protection, health of the family and removal of fear', 'குடும்பப் பாதுகாப்பு, ஆரோக்கியம், பயம் நீங்க',
    ['Kumkum archanai and saree offering (optional)'], ['குங்கும அர்ச்சனை, புடவை சாற்றுதல் (விருப்பம்)']),
  P('kerala', '🌴', 'Kerala temples yatra', 'கேரளக் கோவில் யாத்திரை', 3,
    [['guruvayur'], ['chottanikkara'], ['padmanabhaswamy', 'attukal']],
    'For children\'s blessings, mental peace and prosperity', 'குழந்தைகளுக்கு ஆசி, மன அமைதி, செல்வத்திற்கு',
    ['Traditional dress guidance', 'Thulabharam / choroonu booking help at Guruvayur'], ['பாரம்பரிய உடை வழிகாட்டல்', 'குருவாயூரில் துலாபாரம் / அன்னப்பிராசன முன்பதிவு உதவி']),
  P('tirupati', '🙏', 'Tirupati yatra', 'திருப்பதி யாத்திரை', 2,
    [['tirumala'], ['thiruchanur', 'srinivasa_mangapuram', 'kalahasti']],
    'For prosperity, removal of obstacles and fulfilment of vows', 'செல்வம், தடை நீக்கம், நேர்த்திக்கடன் நிறைவேற',
    ['Help with official darshan booking', 'Padmavathi Thayar archanai'], ['அதிகாரப்பூர்வ தரிசன முன்பதிவு உதவி', 'பத்மாவதி தாயார் அர்ச்சனை']),
  P('south', '🌅', 'South Tamil Nadu grand yatra', 'தென் தமிழகப் பெரும் யாத்திரை', 4,
    [['madurai_meenakshi', 'koodal_azhagar', 'alagar_kovil'], ['rameswaram'], ['tiruchendur', 'srivaikuntam'], ['suchindram', 'kanyakumari']],
    'A complete family pilgrimage — ideal for NRI families and elders', 'முழுமையான குடும்ப யாத்திரை — வெளிநாட்டுவாழ் குடும்பங்கள், பெரியோருக்கு ஏற்றது',
    ['Elder-friendly pace with rest breaks', 'Airport pickup at Madurai'], ['பெரியோருக்கு ஏற்ற நிதானமான பயணம்', 'மதுரை விமான நிலைய வரவேற்பு']),
  // Abroad
  P('lanka_ishwaram', '🌊', 'Sri Lanka Ishwaram & Murugan yatra', 'இலங்கை ஈச்சரம் & முருகன் யாத்திரை', 5,
    [['munneswaram'], ['ketheeswaram'], ['nallur', 'nainativu'], ['koneswaram'], ['kataragama']],
    'For ancestors\' blessings, removal of obstacles and Murugan\'s grace', 'முன்னோர் ஆசி, தடை நீக்கம், முருகன் அருளுக்கு',
    ['Boat crossing to Nainativu arranged', 'Elder-friendly pace with rest breaks'], ['நயினாதீவுக்குப் படகு ஏற்பாடு', 'பெரியோருக்கு ஏற்ற நிதானமான பயணம்']),
  P('malaysia_singapore', '🦚', 'Malaysia & Singapore Murugan temples', 'மலேசியா & சிங்கப்பூர் முருகன் கோவில்கள்', 3,
    [['batu_caves', 'kl_mahamariamman'], ['penang_waterfall'], ['sg_thendayuthapani', 'sg_srinivasa_perumal', 'sg_mariamman']],
    'For courage, vows (kavadi) and family welfare', 'தைரியம், நேர்த்திக்கடன் (காவடி), குடும்ப நலனுக்கு',
    ['Thaipusam-season guidance', 'Flights between the cities are not included'], ['தைப்பூசக் கால வழிகாட்டல்', 'நகரங்களுக்கு இடையிலான விமானக் கட்டணம் சேர்க்கப்படவில்லை']),
];

export const PACKAGE_INCLUDES = [
  { en: 'Priest (Iyer) arranged for every pooja', ta: 'ஒவ்வொரு பூஜைக்கும் புரோகிதர் ஏற்பாடு' },
  { en: 'Pooja items kit (flowers, ghee, camphor, fruits)', ta: 'பூஜைப் பொருட்கள் (பூ, நெய், கற்பூரம், பழங்கள்)' },
  { en: 'Clean hotel stay near the temples', ta: 'கோவில் அருகில் சுத்தமான தங்குமிடம்' },
  { en: 'Car with driver, airport / railway pickup', ta: 'ஓட்டுநருடன் கார், விமான நிலையம் / ரயில் நிலைய வரவேற்பு' },
  { en: 'Muhurtham for each pooja from your Jathagam', ta: 'உங்கள் ஜாதகப்படி ஒவ்வொரு பூஜைக்கும் முகூர்த்தம்' },
];

/**
 * Resolve a package's temples and approximate total road distance along the route. When the start is far away
 * (another country / over ~800 km — e.g. a family in London), the first leg is a flight: `flight` is true,
 * `flightKm` is the straight-line distance to the first temple and `km` covers only the road part of the yatra.
 */
export function packageRoute(pkg, start) {
  const days = pkg.stops.map((ids) => ids.map((id) => TEMPLES.find((t) => t.id === id)).filter(Boolean));
  const flat = days.flat();
  let km = 0;
  const firstLeg = start && flat[0] ? distanceKm(start.lat, start.lon, flat[0].lat, flat[0].lon) : 0;
  const flight = firstLeg > 800;
  let prev = start && !flight ? { lat: start.lat, lon: start.lon } : flat[0];
  for (const t of flat) { km += distanceKm(prev.lat, prev.lon, t.lat, t.lon) * 1.3; prev = t; }
  const mapsUrl = `https://www.google.com/maps/dir/${[start ? `${start.lat},${start.lon}` : null, ...flat.map((t) => `${t.lat},${t.lon}`)].filter(Boolean).join('/')}`;
  return { days, km, mapsUrl, firstTemple: flat[0], flight, flightKm: flight ? Math.round(firstLeg) : 0 };
}
