// Today's spiritual plan (இன்றைய வழிகாட்டல்) — the first thing a person sees each morning.
// Combines today's sacred day (Pradosham, Sashti, Ekadasi…), the person's running Dasa / Bhukti and Saturn's
// transit (Ezharai / Ashtama Sani), and the planetary hour (Horai) of the planet that needs support, into a few
// clear, positive actions — with the reason for each. Built only from engine facts; runs on device and server.
import { PLANETS } from './astro.js';
import { NAVAGRAHA, grahaStrength } from './remedies.js';
import { isHinduFaith, universalPractice, CHILD_PRACTICE } from './faith.js';

const T = (en, ta) => ({ en, ta });

// Sacred days → deity, what to do, food rule, and the planets tradition links them to.
const SACRED = [
  { re: /Pradosham/, icon: '🔱', deity: T('Lord Shiva & Nandi', 'சிவபெருமான் & நந்தி'), planets: ['Saturn', 'Moon', 'Sun'],
    act: T('At Pradosha time (about 4:30–6:00 PM) visit Shiva and Nandi; offer bilva leaves and pray quietly.', 'பிரதோஷ வேளையில் (மாலை சுமார் 4:30–6:00) சிவன், நந்தி தரிசனம்; வில்வம் அர்ப்பணம், அமைதியான பிரார்த்தனை.') },
  { re: /Sashti|Soorasamharam/, icon: '🦚', deity: T('Lord Murugan', 'முருகப் பெருமான்'), planets: ['Mars', 'Rahu'],
    act: T('Sashti viratham: avoid non-vegetarian food today and read Kanda Sashti Kavasam.', 'சஷ்டி விரதம்: இன்று அசைவம் தவிர்த்து கந்த சஷ்டி கவசம் படியுங்கள்.'), food: true },
  { re: /Ekadasi/, icon: '🪷', deity: T('Lord Perumal', 'பெருமாள்'), planets: ['Mercury', 'Jupiter', 'Saturn'],
    act: T('Ekadasi viratham: skip rice (fruit / light food), chant Vishnu Sahasranamam or “Om Namo Narayanaya”.', 'ஏகாதசி விரதம்: அரிசி உணவு தவிர்த்து (பழம் / எளிய உணவு), விஷ்ணு சகஸ்ரநாமம் அல்லது “ஓம் நமோ நாராயணாய”.'), food: true },
  { re: /Amavasai/, icon: '🪔', deity: T('Ancestors (Pithrus)', 'முன்னோர்கள் (பித்ருக்கள்)'), planets: ['Sun', 'Rahu', 'Ketu'],
    act: T('Remember your ancestors: tharpanam or feed someone in need; light a lamp in the evening.', 'முன்னோர்களை நினைவுகூருங்கள்: தர்ப்பணம் அல்லது அன்னதானம்; மாலை தீபம்.') },
  { re: /Pournami/, icon: '🌕', deity: T('Goddess Ambal', 'அம்பாள்'), planets: ['Moon', 'Venus'],
    act: T('Full moon: Ambal worship or girivalam; a calm mind brings good results today.', 'பௌர்ணமி: அம்பாள் வழிபாடு அல்லது கிரிவலம்; அமைதியான மனம் நல்ல பலன் தரும்.') },
  { re: /Chathurthi/, icon: '🐘', deity: T('Lord Vinayagar', 'விநாயகர்'), planets: ['Ketu', 'Mercury'],
    act: T('Fast till moonrise if you can; offer arugampul to Vinayagar, traditionally for easing obstacles.', 'முடிந்தால் சந்திர உதயம் வரை விரதம்; தடைகள் நீங்க விநாயகருக்கு அருகம்புல் — மரபு வழிபாடு.'), food: true },
  { re: /Sivarathri/, icon: '🔱', deity: T('Lord Shiva', 'சிவபெருமான்'), planets: ['Saturn', 'Moon'],
    act: T('Night worship of Shiva; chant “Om Namah Shivaya” 108 times.', 'இரவு சிவ வழிபாடு; “ஓம் நமசிவாய” 108 முறை.') },
  { re: /Karthigai/, icon: '🪔', deity: T('Lord Murugan', 'முருகப் பெருமான்'), planets: ['Mars', 'Sun'],
    act: T('Light lamps at dusk and pray to Murugan.', 'மாலை தீபம் ஏற்றி முருகனை வழிபடுங்கள்.') },
  { re: /Thiruvonam/, icon: '🪷', deity: T('Lord Perumal', 'பெருமாள்'), planets: ['Mercury', 'Moon'],
    act: T('Thiruvonam viratham: Perumal darshan; simple vegetarian food.', 'திருவோண விரதம்: பெருமாள் தரிசனம்; எளிய சைவ உணவு.'), food: true },
];

const ENERGY = {
  great: [T('A bright day — begin with confidence; your efforts carry extra strength today.', 'பிரகாசமான நாள் — தன்னம்பிக்கையுடன் தொடங்குங்கள்; இன்று உங்கள் முயற்சிக்குக் கூடுதல் பலம்.'),
    T('The planets are with you today — take the step you have been waiting for.', 'இன்று கிரகங்கள் உங்களுடன் — காத்திருந்த அடியை எடுத்து வையுங்கள்.')],
  good: [T('A good day — steady work today brings results you will see soon.', 'நல்ல நாள் — இன்றைய நிதானமான உழைப்பு விரைவில் பலன் தரும்.'),
    T('Good support today — be kind, be clear, and keep moving forward.', 'இன்று நல்ல ஆதரவு — அன்புடன், தெளிவாக முன்னேறுங்கள்.')],
  steady: [T('Small, sincere steps today build tomorrow’s success.', 'இன்றைய சிறிய, உண்மையான அடிகள் நாளைய வெற்றியை உருவாக்கும்.'),
    T('A steady day — finish what is pending and keep your peace.', 'நிலையான நாள் — நிலுவைகளை முடித்து மன அமைதியைக் காப்போம்.')],
  care: [T('Patience is your strength today — this phase will pass, and prayer steadies the mind.', 'இன்று பொறுமையே உங்கள் பலம் — இந்தக் காலம் கடந்து போகும்; பிரார்த்தனை மனதை உறுதியாக்கும்.'),
    T('Go gently today — rest, pray and avoid quick decisions; better days are near.', 'இன்று மென்மையாக — ஓய்வு, பிரார்த்தனை; அவசர முடிவு வேண்டாம்; நல்ல நாட்கள் அருகில்.')],
};

/**
 * @param {object} p { chart, snap (panchang), festivals: [{en,ta}], level ('great'|'good'|'steady'|'care'), now, faith, age }
 * @returns {{ energy, items:[{icon,title,text,personal,at?}], horai:{planet,start,end,text,weeks}|null }}
 */
export function todayPlan({ chart, snap, festivals = [], level = 'steady', now = new Date(), faith = 'hindu', age = 30 }) {
  const dayIdx = Math.floor(now.getTime() / 86400000);
  const energy = ENERGY[level][dayIdx % ENERGY[level].length];
  const items = [];
  const per = chart ? (chart.dasa?.periods || []).find((p) => new Date(p.start) <= now && now < new Date(p.end)) : null;
  const md = per?.lord;
  const ad = per?.bhuktis?.find((b) => new Date(b.start) <= now && now < new Date(b.end))?.lord;
  const lords = [md, ad].filter(Boolean);
  const hindu = isHinduFaith(faith);

  // Saturn's transit from the birth Moon: Ezharai (12th, 1st, 2nd) or Ashtama (8th).
  let saniNote = null;
  if (chart && snap?.planets?.Saturn) {
    const h = ((snap.planets.Saturn.rasi - chart.janmaRasi.index + 12) % 12) + 1;
    if ([12, 1, 2].includes(h)) saniNote = T('Ezharai Sani is running for you', 'உங்களுக்கு ஏழரைச் சனி நடக்கிறது');
    else if (h === 8) saniNote = T('Ashtama Sani is running for you', 'உங்களுக்கு அஷ்டமச் சனி நடக்கிறது');
  }

  // 1. Today's sacred days, linked to the person's Dasa / Bhukti / Saturn transit.
  // Most specific name first (e.g. "Mahalaya Amavasai" before "Amavasai"); one item per sacred-day type.
  const used = new Set();
  for (const fe of [...festivals].sort((a, b) => b.en.length - a.en.length)) {
    const s = SACRED.find((x) => x.re.test(fe.en));
    if (!hindu) continue;
    if (s && used.has(s)) continue;
    if (s) used.add(s);
    if (!s) { items.push({ icon: '🎉', title: T(`Today: ${fe.en}`, `இன்று ${fe.ta}`), text: T('Celebrate with family and visit a temple if you can.', 'குடும்பத்துடன் கொண்டாடி, முடிந்தால் கோவில் தரிசனம்.') }); continue; }
    const hit = lords.find((l) => s.planets.includes(l));
    const saturnHit = saniNote && s.planets.includes('Saturn');
    const why = hit ? T(`special for your ${hit} ${hit === md ? 'Dasa' : 'Bhukti'}`, `உங்கள் ${PLANETS[hit].ta} ${hit === md ? 'தசை' : 'புக்தி'}க்குச் சிறப்பு`)
      : saturnHit ? T(`${saniNote.en} — very helpful today`, `${saniNote.ta} — இன்று மிக உதவும்`) : null;
    let act = s.act;
    if (s.food && age < 14) act = T(`${s.deity.en}: a simple prayer is enough — children need not fast.`, `${s.deity.ta}: எளிய பிரார்த்தனை போதும் — குழந்தைகள் விரதம் இருக்க வேண்டியதில்லை.`);
    // Fasting is never required: elders get a prayer-first line; everyone else is reminded that health comes first.
    else if (s.food && age >= 60) act = T(`${s.deity.en}: a simple prayer is enough — fast only if your health allows and your doctor agrees.`, `${s.deity.ta}: எளிய பிரார்த்தனை போதும் — உடல்நலம் அனுமதித்து, மருத்துவர் ஒப்புக்கொண்டால் மட்டும் விரதம்.`);
    else if (s.food && age < 18) act = T(`${act.en} (Fasting is optional — a light meal is fine, and skip it if you feel unwell.)`, `${act.ta} (விரதம் விருப்பம் மட்டுமே — எளிய உணவு போதும்; உடல்நலம் சரியில்லை என்றால் தவிர்க்கவும்.)`);
    else if (s.food) act = T(`${act.en} (Fasting is optional — skip it if you are unwell, pregnant or on medication.)`, `${act.ta} (விரதம் விருப்பம் மட்டுமே — உடல்நலக் குறைவு, கர்ப்பம், மருந்து உட்கொள்ளும் நிலையில் தவிர்க்கவும்.)`);
    items.push({
      icon: s.icon, personal: !!why,
      title: T(`Today is ${fe.en}${why ? ` — ${why.en}` : ''}`, `இன்று ${fe.ta}${why ? ` — ${why.ta}` : ''}`),
      text: T(`As per your transits: ${act.en}`, `உங்கள் கோசாரப்படி: ${act.ta}`),
    });
  }

  // 2. The planet to support today: the weaker of the Dasa and Bhukti lords.
  let horai = null;
  if (chart && lords.length) {
    const st = Object.fromEntries(grahaStrength(chart.planets).map((g) => [g.planet, g.score]));
    const planet = [...new Set(lords)].sort((a, b) => (st[a] ?? 50) - (st[b] ?? 50))[0];
    const n = NAVAGRAHA[planet];
    if (planet === 'Rahu' && snap?.rahuKalam) {
      horai = { planet, start: snap.rahuKalam.start, end: snap.rahuKalam.end, weeks: 9,
        text: hindu ? T('During Rahu Kalam light a lamp for Goddess Durga — the traditional practice for Rahu.', 'ராகு காலத்தில் துர்க்கைக்குத் தீபம் — ராகுவுக்கான மரபு வழிபாடு.') : T('Use this time for quiet prayer in your own faith and help someone in need.', 'இந்த நேரத்தில் உங்கள் நம்பிக்கைப்படி அமைதியான பிரார்த்தனை; தேவையுள்ளோருக்கு உதவி.') };
    } else if (planet === 'Ketu') {
      horai = { planet, start: snap?.sunrise, end: snap?.sunrise ? new Date(new Date(snap.sunrise).getTime() + 7200000) : null, weeks: 9,
        text: hindu ? T('Early morning: pray to Vinayagar before any work — the traditional practice for Ketu, for a clear mind.', 'அதிகாலை: எந்த வேலைக்கும் முன் விநாயகர் வழிபாடு — தெளிவான மனதுக்குக் கேதுவின் மரபு வழிபாடு.') : T('Early morning: a few minutes of silent prayer or meditation.', 'அதிகாலை: சில நிமிட அமைதியான பிரார்த்தனை / தியானம்.') };
    } else {
      const slot = (snap?.horai || []).find((h) => h.lord === planet && new Date(h.end) > now) || (snap?.horai || []).find((h) => h.lord === planet);
      if (slot) {
        const minor = age < 18;
        horai = { planet, start: slot.start, end: slot.end, weeks: 9,
          // Other faiths: one practice that fits every faith (never a deity puja); a child gets a child-safe one.
          text: !hindu ? (minor ? T(`In ${planet} hour: ${CHILD_PRACTICE.en[0].toLowerCase()}${CHILD_PRACTICE.en.slice(1)}`, `${PLANETS[planet].ta} ஓரையில்: ${CHILD_PRACTICE.ta}`) : T(`In ${planet} hour: ${universalPractice(planet).en}`, `${PLANETS[planet].ta} ஓரையில்: ${universalPractice(planet).ta}`))
            : minor ? T(`In ${planet} hour, study the hardest subject — and pray to Saraswathi before starting.`, `${PLANETS[planet].ta} ஓரையில் கடினமான பாடத்தைப் படியுங்கள் — தொடங்கும் முன் சரஸ்வதி வழிபாடு.`)
              : T(`In ${planet} hour, pray to ${n.deity.en} and chant ${n.mantra.en}.`, `${PLANETS[planet].ta} ஓரையில் ${n.deity.ta} வழிபாடு; ${n.mantra.ta}.`) };
      }
    }
    if (horai) {
      const wd = { Sun: T('Sunday', 'ஞாயிறு'), Moon: T('Monday', 'திங்கள்'), Mars: T('Tuesday', 'செவ்வாய்'), Mercury: T('Wednesday', 'புதன்'), Jupiter: T('Thursday', 'வியாழன்'), Venus: T('Friday', 'வெள்ளி'), Saturn: T('Saturday', 'சனி'), Rahu: T('Saturday', 'சனி'), Ketu: T('Tuesday', 'செவ்வாய்') }[planet];
      horai.repeat = T(`Do this every ${wd.en} for 9 weeks in a row.`, `${wd.ta}தோறும் தொடர்ந்து 9 வாரம் செய்யுங்கள்.`);
    }
    if (horai) horai.why = T(`${planet} is your ${planet === md ? 'Dasa' : 'Bhukti'} lord and needs support now`, `${PLANETS[planet].ta} உங்கள் ${planet === md ? 'தசா' : 'புக்தி'} நாதர் — இப்போது ஆதரவு தேவை`);
  }

  // 3. Saturn transit relief on Saturdays (when no sacred day already covered it).
  if (saniNote && hindu && (snap?.weekday?.index ?? now.getDay()) === 6 && !items.some((i) => /Sani|சனி/.test(i.title.en + i.title.ta))) {
    items.push({ icon: '🪐', personal: true, title: T(`Saturday — ${saniNote.en}`, `சனிக்கிழமை — ${saniNote.ta}`),
      text: T('Light a sesame-oil lamp, pray to Saneeswarar (or Venkatachalapathi / Anjaneyar, as your family does), and help an elderly person.', 'நல்லெண்ணெய் தீபம்; சனீஸ்வரர் வழிபாடு (அல்லது குடும்ப வழக்கப்படி வெங்கடாசலபதி / ஆஞ்சநேயர்); ஒரு முதியவருக்கு உதவி.') });
  }
  return { energy, items, horai, saniNote };
}
