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
];

export const PACKAGE_INCLUDES = [
  { en: 'Priest (Iyer) arranged for every pooja', ta: 'ஒவ்வொரு பூஜைக்கும் புரோகிதர் ஏற்பாடு' },
  { en: 'Pooja items kit (flowers, ghee, camphor, fruits)', ta: 'பூஜைப் பொருட்கள் (பூ, நெய், கற்பூரம், பழங்கள்)' },
  { en: 'Clean hotel stay near the temples', ta: 'கோவில் அருகில் சுத்தமான தங்குமிடம்' },
  { en: 'Car with driver, airport / railway pickup', ta: 'ஓட்டுநருடன் கார், விமான நிலையம் / ரயில் நிலைய வரவேற்பு' },
  { en: 'Muhurtham for each pooja from your Jathagam', ta: 'உங்கள் ஜாதகப்படி ஒவ்வொரு பூஜைக்கும் முகூர்த்தம்' },
];

/** Resolve a package's temples and approximate total road distance along the route. */
export function packageRoute(pkg, start) {
  const days = pkg.stops.map((ids) => ids.map((id) => TEMPLES.find((t) => t.id === id)).filter(Boolean));
  const flat = days.flat();
  let km = 0;
  let prev = start ? { lat: start.lat, lon: start.lon } : flat[0];
  for (const t of flat) { km += distanceKm(prev.lat, prev.lon, t.lat, t.lon) * 1.3; prev = t; }
  const mapsUrl = `https://www.google.com/maps/dir/${[start ? `${start.lat},${start.lon}` : null, ...flat.map((t) => `${t.lat},${t.lon}`)].filter(Boolean).join('/')}`;
  return { days, km, mapsUrl, firstTemple: flat[0] };
}
