// Life-event timing (வாழ்க்கைக் கேள்விகள்): when will marriage, a job, PR / visa, own house, a child… happen?
// Method used by traditional astrologers:
//   1. Promise in the birth chart — strength of the event's houses, lords and karaka.
//   2. Dasa–Bhukti — periods whose lords signify the event's houses (as lord, occupant, or through their
//      nakshatra lord), minus those that signify the houses that negate the event.
//   3. Double transit — months when both Jupiter and Saturn influence the key house from Lagna or Moon.
import { planetPositions, RASIS, NAKSHATRAS, PLANETS } from './astro.js';
import { bhavaAnalysis } from './analysis.js';
import { grahaStrength, NAVAGRAHA } from './remedies.js';

const ASPECTS = { Jupiter: [1, 5, 7, 9], Saturn: [1, 3, 7, 10] };
const DAY = 86400000;
const houseOf = (lagna, rasi) => ((rasi - lagna + 12) % 12) + 1;

export const QUESTIONS = [
  { id: 'marriage', icon: '💐', en: 'When will marriage happen?', ta: 'திருமணம் எப்போது?', houses: [2, 7, 11], negate: [1, 6, 10], key: 7, karakas: ['Venus', 'Jupiter'], ageMin: 20, ageMax: 50,
    remedy: { en: 'Pray to Lord Murugan and Valli–Deivanai on Tuesdays; girls may chant the Katyayani mantra, boys light a lamp for Mahalakshmi on Fridays.', ta: 'செவ்வாய்தோறும் வள்ளி–தெய்வானை சமேத முருகனை வழிபடவும்; பெண்கள் காத்யாயனி மந்திரம், ஆண்கள் வெள்ளிதோறும் மகாலட்சுமிக்கு தீபம்.' } },
  { id: 'partner', icon: '👰', en: 'Will we find the right bride / groom soon?', ta: 'பெண் / மாப்பிள்ளை கிடைப்பார்களா?', houses: [2, 7, 11], negate: [1, 6, 10], key: 7, karakas: ['Venus', 'Jupiter'], ageMin: 20, ageMax: 50,
    remedy: { en: 'Visit Thirumanancheri (Kalyanasundareswarar) and offer garlands; keep a positive, open search.', ta: 'திருமணஞ்சேரி கல்யாணசுந்தரேஸ்வரரை தரிசித்து மாலை சாற்றவும்; நம்பிக்கையுடன் தேடலைத் தொடரவும்.' } },
  { id: 'job', icon: '💼', en: 'When will I get a job?', ta: 'வேலை எப்போது கிடைக்கும்?', houses: [2, 6, 10, 11], negate: [5, 8, 12], key: 10, karakas: ['Saturn', 'Sun'], ageMin: 17, ageMax: 65,
    remedy: { en: 'Offer water to the rising Sun daily and light a sesame-oil lamp on Saturdays; help a worker or elder each week.', ta: 'தினமும் உதய சூரியனுக்கு அர்க்யம், சனிக்கிழமை நல்லெண்ணெய் தீபம்; வாரம் ஒருமுறை உழைப்பாளர்/முதியோருக்கு உதவி.' } },
  { id: 'career', icon: '📈', en: 'Career growth & promotion', ta: 'தொழில் வெற்றி & பதவி உயர்வு', houses: [2, 10, 11], negate: [5, 8, 12], key: 10, karakas: ['Sun', 'Saturn', 'Jupiter'], ageMin: 18, ageMax: 75,
    remedy: { en: 'Recite Aditya Hrudayam on Sundays and keep your word at work — Saturn rewards discipline.', ta: 'ஞாயிறு ஆதித்ய ஹிருதயம்; வேலையில் சொல் தவறாமை — ஒழுக்கத்திற்கு சனி பலன் தருவார்.' } },
  { id: 'job_change', icon: '🧭', en: 'When is a good job change?', ta: 'வேலை மாற்றம் எப்போது?', houses: [3, 5, 9, 10], negate: [6, 11], key: 10, karakas: ['Rahu', 'Saturn'], ageMin: 18, ageMax: 65,
    remedy: { en: 'Pray to Vinayagar before applying; sign offers in a good Horai from the Prasnam screen.', ta: 'விண்ணப்பிக்கும் முன் விநாயகர் வழிபாடு; பிரசன்னத் திரையில் நல்ல ஓரையில் ஒப்பந்தம் கையெழுத்திடவும்.' } },
  { id: 'pr', icon: '🛂', en: 'When will I get PR / permanent visa abroad?', ta: 'வெளிநாட்டில் நிரந்தர விசா (PR) எப்போது?', houses: [3, 9, 12], negate: [4], key: 12, karakas: ['Rahu', 'Saturn', 'Moon'], ageMin: 18, ageMax: 75,
    remedy: { en: 'Durga worship during Rahu Kalam on Tuesdays/Fridays; keep documents complete and file in a good Horai.', ta: 'செவ்வாய்/வெள்ளி ராகு காலத்தில் துர்கை வழிபாடு; ஆவணங்களை முழுமையாக்கி நல்ல ஓரையில் விண்ணப்பிக்கவும்.' } },
  { id: 'visa', icon: '✈️', en: 'Foreign travel / work visa', ta: 'வெளிநாட்டுப் பயணம் / வேலை விசா', houses: [3, 9, 12], negate: [4, 8], key: 9, karakas: ['Rahu', 'Moon'], ageMin: 16, ageMax: 80,
    remedy: { en: 'Pray to Lord Anjaneya before travel and chant "Sri Rama Jaya Rama" on the way.', ta: 'பயணத்திற்கு முன் ஆஞ்சநேயர் வழிபாடு; வழியில் "ஸ்ரீ ராம ஜெய ராம" ஜபம்.' } },
  { id: 'house', icon: '🏡', en: 'When can I buy my own house?', ta: 'சொந்த வீடு எப்போது?', houses: [4, 11, 2], negate: [3, 12], key: 4, karakas: ['Mars', 'Venus'], ageMin: 21, ageMax: 80,
    remedy: { en: 'Pray to Lord Murugan on Tuesdays and offer red flowers; Bhoomi Devi worship before buying land.', ta: 'செவ்வாய்தோறும் முருகனுக்கு சிவப்பு மலர்; நிலம் வாங்கும் முன் பூமாதேவி வழிபாடு.' } },
  { id: 'vehicle', icon: '🚗', en: 'When can I buy a vehicle (bike / car)?', ta: 'வாகனம் (பைக் / கார்) எப்போது வாங்கலாம்?', houses: [4, 11, 2], negate: [3, 8, 12], key: 4, karakas: ['Venus', 'Mars'], ageMin: 16, ageMax: 85,
    remedy: { en: 'Light a lamp for Mahalakshmi on Fridays; take the first drive to a Vinayagar temple, break a coconut and crush lemons under the wheels as per tradition. Always wear a helmet / seat belt and follow road safety.', ta: 'வெள்ளிதோறும் மகாலட்சுமிக்கு தீபம்; முதல் பயணம் விநாயகர் கோவிலுக்கு — தேங்காய் உடைத்து, சக்கரங்களின் கீழ் எலுமிச்சை வைத்து ஓட்டுவது மரபு. எப்போதும் தலைக்கவசம் / இருக்கைப் பட்டை அணிந்து சாலை விதிகளைப் பின்பற்றவும்.' } },
  { id: 'child', icon: '👶', en: 'When will we be blessed with a child?', ta: 'குழந்தை பாக்கியம் எப்போது?', houses: [2, 5, 11], negate: [1, 4, 10], key: 5, karakas: ['Jupiter'], ageMin: 20, ageMax: 50, sensitive: 'reproductive',
    remedy: { en: 'Optional prayer: the Santhana Gopala mantra; visit Garbharakshambigai Temple (Thirukkarukavur). Follow your doctor\'s guidance first.', ta: 'சந்தான கோபால மந்திரம்; திருக்கருகாவூர் கர்ப்பரக்ஷாம்பிகை தரிசனம். மருத்துவர் ஆலோசனையே முதன்மை.' } },
  { id: 'education', icon: '🎓', en: 'Higher studies / study abroad', ta: 'உயர்கல்வி / வெளிநாட்டுப் படிப்பு', houses: [4, 9, 11], negate: [3, 8], key: 9, karakas: ['Mercury', 'Jupiter'], ageMin: 15, ageMax: 45,
    remedy: { en: 'Pray to Saraswathi and Dakshinamurthy on Thursdays; study in the Mercury Horai.', ta: 'வியாழன் சரஸ்வதி, தட்சிணாமூர்த்தி வழிபாடு; புதன் ஓரையில் படிக்கவும்.' } },
  { id: 'business', icon: '🏪', en: 'Business success', ta: 'வியாபார வெற்றி', houses: [7, 10, 11, 2], negate: [6, 8, 12], key: 10, karakas: ['Mercury', 'Jupiter'], ageMin: 18, ageMax: 80,
    remedy: { en: 'Begin new ventures on a Muhurtham day; Mahalakshmi lamp on Fridays; give a little to charity from each profit.', ta: 'முகூர்த்த நாளில் தொடங்கவும்; வெள்ளி மகாலட்சுமி தீபம்; ஒவ்வொரு லாபத்திலும் சிறு தானம்.' } },
  { id: 'acting', icon: '🎬', en: 'Cinema / serial acting — when is the breakthrough?', ta: 'சினிமா / சீரியல் நடிப்பு — வாய்ப்பு எப்போது?', houses: [3, 5, 10, 11], negate: [6, 8, 12], key: 5, karakas: ['Venus', 'Moon', 'Rahu'], ageMin: 5, ageMax: 75,
    remedy: { en: 'Pray to Goddess Saraswathi and Lord Nataraja; train daily — Venus rewards practice and grace.', ta: 'சரஸ்வதி, நடராஜர் வழிபாடு; தினமும் பயிற்சி — பயிற்சிக்கும் நளினத்திற்கும் சுக்கிரன் பலன் தருவார்.' } },
  { id: 'politics', icon: '🏛️', en: 'Politics / public life — rise and election periods', ta: 'அரசியல் / பொது வாழ்க்கை — உயர்வு, தேர்தல் காலம்', houses: [6, 10, 11], negate: [5, 8, 12], key: 10, karakas: ['Sun', 'Saturn', 'Rahu', 'Mars'], ageMin: 21, ageMax: 85,
    remedy: { en: 'Serve people steadily (Saturn), honour your word (Sun); Surya namaskaram and Aditya Hrudayam on Sundays.', ta: 'மக்களுக்குத் தொடர்ந்து சேவை (சனி), சொன்ன சொல் தவறாமை (சூரியன்); ஞாயிறு சூரிய நமஸ்காரம், ஆதித்ய ஹிருதயம்.' } },
  { id: 'court', icon: '⚖️', en: 'Court case (vazhakku) — favourable period', ta: 'வழக்கு — சாதகமான காலம்', houses: [6, 11, 1], negate: [5, 12, 8], key: 6, karakas: ['Mars', 'Sun'], ageMin: 0, ageMax: 120,
    remedy: { en: 'Recite Kanda Sashti Kavasam on Tuesdays; settle out of court where fair. Your lawyer\'s advice comes first.', ta: 'செவ்வாய் கந்த சஷ்டி கவசம்; நியாயமானால் சமரசம் நல்லது. வழக்கறிஞர் ஆலோசனையே முதன்மை.' } },
  { id: 'harmony', icon: '💞', en: 'Husband–wife harmony (and periods needing care)', ta: 'கணவன்–மனைவி ஒற்றுமை (கவனம் தேவைப்படும் காலம்)', houses: [2, 7, 11], negate: [1, 6, 10], key: 7, karakas: ['Venus', 'Jupiter'], ageMin: 18, ageMax: 100, harmony: true,
    remedy: { en: 'Visit Shiva–Parvathi temples together on Mondays; talk daily without blame. A counsellor helps when needed — it is a sign of strength.', ta: 'திங்கள் சேர்ந்து சிவ–பார்வதி தரிசனம்; குற்றம் சாட்டாமல் தினமும் பேசுங்கள். தேவைப்பட்டால் ஆலோசகரை அணுகுவது பலத்தின் அடையாளம்.' } },
];

// Short topic names for the "periods your tradition associates with …" framing line.
const TOPIC = {
  marriage: ['marriage', 'திருமணம்'], partner: ['finding a life partner', 'வாழ்க்கைத் துணை தேடல்'], job: ['a new job', 'புதிய வேலை'],
  career: ['career growth', 'தொழில் வளர்ச்சி'], job_change: ['a job change', 'வேலை மாற்றம்'], pr: ['PR / permanent visa', 'நிரந்தர விசா (PR)'],
  visa: ['foreign travel', 'வெளிநாட்டுப் பயணம்'], house: ['an own house', 'சொந்த வீடு'], vehicle: ['buying a vehicle', 'வாகனம் வாங்குதல்'],
  child: ['children', 'குழந்தைகள்'], education: ['higher studies', 'உயர்கல்வி'], business: ['business', 'வியாபாரம்'], acting: ['acting', 'நடிப்பு'],
  politics: ['public life', 'பொது வாழ்க்கை'], court: ['a court case', 'வழக்கு'], harmony: ['couple harmony', 'தம்பதியர் ஒற்றுமை'],
};
const topicOf = (q) => { const t = TOPIC[q.id]; return t ? { en: t[0], ta: t[1] } : { en: q.en.split(' — ')[0].toLowerCase(), ta: q.ta.split(' — ')[0] }; };
const framingOf = (q) => { const t = topicOf(q); return { en: `Periods your selected tradition associates with ${t.en}`, ta: `நீங்கள் தேர்ந்தெடுத்த மரபு ${t.ta} உடன் தொடர்புபடுத்தும் காலங்கள்` }; };

export const PREDICT_DISCLAIMER_ID = 'predict.traditional-periods.v1';
export const PREDICT_DISCLAIMER = {
  en: 'These are periods your selected tradition associates with this topic. They are not guaranteed dates and not evidence that an event will or will not happen — your own choices and circumstances matter most.',
  ta: 'இவை நீங்கள் தேர்ந்தெடுத்த மரபு இந்த விஷயத்துடன் தொடர்புபடுத்தும் காலங்கள். இவை உறுதியான தேதிகள் அல்ல; ஒரு நிகழ்வு நடக்கும் அல்லது நடக்காது என்பதற்கான சான்றும் அல்ல — உங்கள் தேர்வுகளும் சூழலுமே முதன்மை.',
};
const NOT_ASSESSED_NOTE = {
  en: 'Thunai does not assess fertility or the ability to have children from a horoscope. For health questions please speak to a doctor.',
  ta: 'துணை ஜாதகத்திலிருந்து கருவுறுதலையோ குழந்தைப் பேற்றையோ மதிப்பிடுவதில்லை. உடல்நலக் கேள்விகளுக்கு மருத்துவரிடம் பேசுங்கள்.',
};

export const NEEDS_BIRTH_TIME = {
  en: 'This needs a known birth time (Lagna and houses). Only Moon-based information is shown.',
  ta: 'இதற்குப் பிறந்த நேரம் (லக்னம், பாவங்கள்) தேவை. சந்திரன் சார்ந்த தகவல் மட்டுமே காட்டப்படுகிறது.',
};

const DEITY_OF = {
  Sun: { en: 'Lord Shiva / Surya', ta: 'சிவன் / சூரியன்' }, Moon: { en: 'Ambal (Parvathi, Mariamman)', ta: 'அம்பாள் (பார்வதி, மாரியம்மன்)' },
  Mars: { en: 'Lord Murugan', ta: 'முருகன்' }, Mercury: { en: 'Lord Vishnu / Perumal', ta: 'பெருமாள்' },
  Jupiter: { en: 'Dakshinamurthy / Guru', ta: 'தட்சிணாமூர்த்தி / குரு' }, Venus: { en: 'Mahalakshmi / Amman', ta: 'மகாலட்சுமி / அம்மன்' },
  Saturn: { en: 'Ayyanar / Sastha / Karuppasamy', ta: 'ஐயனார் / சாஸ்தா / கருப்பசாமி' }, Rahu: { en: 'Durga / Mariamman', ta: 'துர்கை / மாரியம்மன்' },
  Ketu: { en: 'Vinayagar', ta: 'விநாயகர்' },
};

/** Which houses each planet signifies: houses it owns, occupies, and those of its nakshatra lord. */
export function significations(chart) {
  const P = chart.planets;
  if (!P.Lagna) return null; // house significations need a known birth time
  const L = P.Lagna.rasi;
  const own = {}, occ = {};
  for (const k of Object.keys(PLANETS)) { if (k === 'Lagna') continue; own[k] = []; occ[k] = [houseOf(L, P[k].rasi)]; }
  for (let h = 1; h <= 12; h++) own[RASIS[(L + h - 1) % 12].lord].push(h);
  // Rahu and Ketu act for the lord of the sign they occupy.
  for (const n of ['Rahu', 'Ketu']) own[n] = [...own[RASIS[P[n].rasi].lord]];
  const sig = {};
  for (const k of Object.keys(own)) {
    const starLord = NAKSHATRAS[P[k].nakshatra].lord;
    sig[k] = { own: own[k], occ: occ[k], star: [...(own[starLord] || []), ...(occ[starLord] || [])] };
  }
  return sig;
}

export function planetScore(sig, k, q) {
  if (!sig) return 0; // no house significations without a birth time
  const s = sig[k];
  let score = 0;
  const hit = (arr, w, neg) => { for (const h of arr) { if (q.houses.includes(h)) score += w; if (q.negate.includes(h)) score -= neg; } };
  hit(s.star, 2, 1.2);
  hit(s.occ, 2.5, 1.2);
  hit(s.own, 1.5, 0.8);
  if (q.karakas.includes(k)) score += 1.5;
  return score;
}

/** Jupiter/Saturn influence on the key house (from Lagna or Moon) at a date. */
function transitSupport(chart, keyHouse, date) {
  const { planets } = planetPositions(date);
  const res = {};
  for (const g of ['Jupiter', 'Saturn']) {
    const targets = [chart.planets.Lagna.rasi, chart.planets.Moon.rasi].map((ref) => (ref + keyHouse - 1) % 12);
    const from = planets[g].rasi;
    res[g] = ASPECTS[g].some((a) => targets.includes((from + a - 1) % 12));
  }
  return res;
}

const ageAt = (chart, d) => (d - chart.utc) / (365.25 * DAY);

/**
 * Predict windows for a question. Returns the chart promise, the best dasa–bhukti windows (with
 * double-transit months), the current period, and positive guidance.
 */
export function predictEvent(chart, questionId, { from = new Date(), years = 15 } = {}) {
  const q = QUESTIONS.find((x) => x.id === questionId);
  const sig = significations(chart);
  if (!sig) {
    const md = chart.dasa.periods.find((p) => from >= p.start && from < p.end);
    const ad = md?.bhuktis.find((b) => from >= b.start && from < b.end);
    return {
      question: q, needsBirthTime: true, birthTimeNote: NEEDS_BIRTH_TIME,
      promise: { score: null, level: q.sensitive === 'reproductive' ? 'not-assessed' : 'needs-birth-time', notes: [q.sensitive === 'reproductive' ? NOT_ASSESSED_NOTE : NEEDS_BIRTH_TIME] },
      windows: [], earliest: null, careful: [],
      current: md && ad ? { md: md.lord, ad: ad.lord, start: ad.start, end: ad.end, dasaScore: null } : null,
      remedy: { ...q.remedy, optional: true }, karakaRemedies: [],
      disclaimerId: PREDICT_DISCLAIMER_ID, disclaimer: PREDICT_DISCLAIMER, exactDatesGuaranteed: false,
      framing: framingOf(q),
    };
  }
  const bhavas = bhavaAnalysis(chart);
  const strength = Object.fromEntries(grahaStrength(chart.planets).map((g) => [g.planet, g.score]));
  const key = bhavas[q.key - 1];
  const promiseScore = Math.round(q.houses.reduce((s, h) => s + bhavas[h - 1].score, 0) / q.houses.length * 0.6
    + q.karakas.reduce((s, k) => s + strength[k], 0) / q.karakas.length * 0.4);
  const promise = q.sensitive === 'reproductive' ? { score: null, level: 'not-assessed', notes: [NOT_ASSESSED_NOTE] } : {
    score: promiseScore,
    level: promiseScore >= 62 ? 'strong' : promiseScore >= 48 ? 'good' : 'needs effort',
    notes: [
      { en: `House ${q.key} (${key.area.en.split(',')[0]}) strength ${key.score}/100; its lord ${key.lord} sits in house ${key.lordHouse}.`, ta: `${q.key}-ம் பாவம் பலம் ${key.score}/100; அதிபதி ${PLANETS[key.lord].ta} ${key.lordHouse}-ம் வீட்டில்.` },
      ...q.karakas.map((k) => ({ en: `Karaka ${k} strength ${strength[k]}/100.`, ta: `காரகர் ${PLANETS[k].ta} பலம் ${strength[k]}/100.` })),
      ...key.occupants.map((o) => ({ en: `${o} occupies house ${q.key}.`, ta: `${PLANETS[o].ta} ${q.key}-ம் வீட்டில் உள்ளார்.` })),
    ],
  };

  const end = new Date(from.getTime() + years * 365.25 * DAY);
  const windows = [];
  let current = null;
  for (const md of chart.dasa.periods) {
    if (md.end < from || md.start > end) continue;
    const mdScore = planetScore(sig, md.lord, q);
    for (const ad of md.bhuktis) {
      if (ad.end < from || ad.start > end) continue;
      const adScore = planetScore(sig, ad.lord, q);
      const dasaScore = mdScore * 0.4 + adScore * 0.6;
      const s = new Date(Math.max(ad.start, from)), e = new Date(Math.min(ad.end, end));
      const midAge = ageAt(chart, new Date((s.getTime() + e.getTime()) / 2));
      const entry = { md: md.lord, ad: ad.lord, start: s, end: e, dasaScore: Math.round(dasaScore * 10) / 10 };
      if (from >= ad.start && from < ad.end) current = entry;
      if (midAge < q.ageMin || midAge > q.ageMax) continue;
      if (dasaScore <= 0.5 && !q.harmony) continue;
      // Scan months inside the bhukti for double transit.
      const months = [];
      for (let t = s.getTime(); t < e.getTime(); t += 30 * DAY) {
        const tr = transitSupport(chart, q.key, new Date(t));
        months.push({ t, both: tr.Jupiter && tr.Saturn, jup: tr.Jupiter, sat: tr.Saturn });
      }
      const both = months.filter((m) => m.both);
      const jupOnly = months.filter((m) => m.jup);
      const best = both.length ? both : jupOnly;
      const transitScore = both.length ? 2 : jupOnly.length ? 1 : 0;
      windows.push({
        ...entry,
        transitScore,
        score: Math.round((dasaScore * 0.75 + transitScore * 1.6) * 10) / 10,
        peakFrom: best.length ? new Date(best[0].t) : s,
        peakTo: best.length ? new Date(Math.min(best[best.length - 1].t + 30 * DAY, e.getTime())) : e,
        doubleTransit: both.length > 0,
        reasons: windowReasons(sig, md.lord, ad.lord, q, both.length > 0, jupOnly.length > 0),
      });
    }
  }
  const ranked = [...windows].sort((a, b) => b.score - a.score);
  let top = ranked.slice(0, 4).sort((a, b) => a.start - b.start);
  let careful = [];
  if (q.harmony) {
    // For harmony, also list periods whose lords lean to the separating houses — to be extra caring then.
    careful = windows.filter((w) => w.dasaScore < 0).sort((a, b) => a.dasaScore - b.dasaScore).slice(0, 3).sort((a, b) => a.start - b.start);
    top = ranked.filter((w) => w.dasaScore > 0).slice(0, 3).sort((a, b) => a.start - b.start);
  }
  const earliest = [...windows].filter((w) => w.score >= (ranked[0]?.score || 0) * 0.7).sort((a, b) => a.start - b.start)[0] || null;
  return {
    question: q, promise, windows: top, allWindows: windows, earliest, careful, current, remedy: { ...q.remedy, optional: true },
    karakaRemedies: q.sensitive ? [] : q.karakas.filter((k) => strength[k] < 50).map((k) => ({ planet: k, ...NAVAGRAHA[k], optional: true })),
    disclaimerId: PREDICT_DISCLAIMER_ID,
    disclaimer: PREDICT_DISCLAIMER,
    framing: framingOf(q),
    exactDatesGuaranteed: false,
  };
}

function windowReasons(sig, md, ad, q, both, jup) {
  const r = [];
  const role = (k) => {
    const s = sig[k];
    const parts = [];
    const own = s.own.filter((h) => q.houses.includes(h)), occ = s.occ.filter((h) => q.houses.includes(h)), star = s.star.filter((h) => q.houses.includes(h));
    if (own.length) parts.push({ en: `rules house ${own.join('/')}`, ta: `${own.join('/')}-ம் வீட்டு அதிபதி` });
    if (occ.length) parts.push({ en: `sits in house ${occ.join('/')}`, ta: `${occ.join('/')}-ம் வீட்டில் உள்ளார்` });
    if (star.length) parts.push({ en: `its star lord connects to house ${[...new Set(star)].join('/')}`, ta: `நட்சத்திர அதிபதி ${[...new Set(star)].join('/')}-ம் வீட்டுடன் தொடர்பு` });
    if (q.karakas.includes(k)) parts.push({ en: 'is the karaka', ta: 'காரகர்' });
    return parts;
  };
  for (const [k, label] of [[md, 'Dasa'], [ad, 'Bhukti']]) {
    const p = role(k);
    if (p.length) r.push({ en: `${k} ${label}: ${p.map((x) => x.en).join(', ')}`, ta: `${PLANETS[k].ta} ${label === 'Dasa' ? 'தசை' : 'புக்தி'}: ${p.map((x) => x.ta).join(', ')}` });
  }
  if (both) r.push({ en: `Double transit: Jupiter and Saturn both bless house ${q.key}`, ta: `இரட்டைக் கோசாரம்: குருவும் சனியும் ${q.key}-ம் வீட்டை ஆசீர்வதிக்கின்றனர்` });
  else if (jup) r.push({ en: `Jupiter's transit blesses house ${q.key}`, ta: `குருவின் கோசாரம் ${q.key}-ம் வீட்டிற்கு சாதகம்` });
  return r;
}

/**
 * Kula Deivam: the family's own deity is a family record, never a chart inference (brief §9).
 * Returns recordedByFamily (what the family recorded, or null) and an OPTIONAL suggestion attributed to the
 * 9th-house method for families who do not know theirs. `deity` is kept as a deprecated alias of
 * suggestion.deity for older screens — show it only as "a suggestion from the 9th-house method".
 */
export function kulaDeivam(chart, { recorded = null, now = new Date() } = {}) {
  // Without a birth time the optional suggestion uses the 9th from the Moon sign (labelled in `method`).
  const fromMoon = !chart.planets.Lagna;
  const L = fromMoon ? chart.planets.Moon.rasi : chart.planets.Lagna.rasi;
  const ninth = (L + 8) % 12;
  const lord = RASIS[ninth].lord;
  const occupants = Object.keys(chart.planets).filter((k) => k !== 'Lagna' && chart.planets[k].rasi === ninth);
  const strongest = occupants.length ? occupants[0] : lord;
  const periods = chart.dasa.periods.flatMap((p) => p.bhuktis.map((b) => ({ md: p.lord, ad: b.lord, start: b.start, end: b.end })))
    .filter((b) => b.end > now && (b.ad === lord || b.ad === 'Jupiter' || b.ad === 'Ketu')).slice(0, 3);
  const suggestion = {
    deity: DEITY_OF[strongest],
    optional: true,
    isFact: false,
    reference: fromMoon ? 'moon' : 'lagna',
    method: fromMoon ? { id: 'ninth-from-moon-v0', en: '9th from the Moon sign (birth time unknown) — a traditional suggestion, not a fact about your family', ta: 'சந்திர ராசியிலிருந்து 9-ம் இடம் (பிறந்த நேரம் தெரியவில்லை) — மரபுப் பரிந்துரை மட்டுமே, உங்கள் குடும்பம் பற்றிய உண்மை அல்ல' } : { id: 'ninth-house-v0', en: '9th-house method (house of ancestral dharma) — a traditional suggestion, not a fact about your family', ta: '9-ம் பாவ முறை (பித்ரு தர்ம ஸ்தானம்) — மரபுப் பரிந்துரை மட்டுமே, உங்கள் குடும்பம் பற்றிய உண்மை அல்ல' },
  };
  return {
    recordedByFamily: recorded || null,
    status: recorded ? 'recorded-by-family' : 'not-recorded',
    suggestion,
    ninthSign: RASIS[ninth], lord, occupants,
    deity: suggestion.deity, // deprecated alias — display as a suggestion only
    guidance: {
      en: 'Your Kula Deivam is your family\'s own tradition — ask the elders of your family and record it here. A chart cannot tell you who it is. If your family does not know, the 9th-house method offers an optional deity form for prayer. Many families visit once a year, for example on Panguni Uthiram, Maasi Magam or Aadi Fridays.',
      ta: 'குலதெய்வம் உங்கள் குடும்பத்தின் சொந்த மரபு — குடும்பப் பெரியோரிடம் கேட்டு இங்கே பதிவு செய்யுங்கள். ஜாதகத்தால் அதைச் சொல்ல முடியாது. குடும்பத்திற்குத் தெரியாவிட்டால், 9-ம் பாவ முறை வழிபாட்டிற்கு ஒரு விருப்பத் தெய்வ வடிவைப் பரிந்துரைக்கிறது. பல குடும்பங்கள் ஆண்டுக்கு ஒருமுறை, உதாரணமாக பங்குனி உத்திரம், மாசி மகம், ஆடி வெள்ளியில் வழிபடுகின்றன.',
    },
    periods,
  };
}

/** Habits to guard (e.g. alcohol/addiction): gentle, natal tendencies with practical support — never a label. */
export function habitGuard(chart) {
  const P = chart.planets;
  const L = P.Lagna ? P.Lagna.rasi : null;
  const notes = [];
  const h = (k) => (L == null ? 0 : houseOf(L, P[k].rasi)); // house notes need a birth time
  if ([1, 2, 12].includes(h('Rahu'))) notes.push({ en: `Rahu in house ${h('Rahu')}: be mindful of sudden cravings and habits that "start small".`, ta: `ராகு ${h('Rahu')}-ல்: "சிறிதாகத் தொடங்கும்" பழக்கங்களில் கவனம்.` });
  if (P.Moon.rasi === P.Rahu.rasi || P.Moon.rasi === P.Ketu.rasi) notes.push({ en: 'Moon with Rahu/Ketu: the mind seeks escape under stress — choose healthy outlets.', ta: 'சந்திரனுடன் ராகு/கேது: மன அழுத்தத்தில் தப்பிக்க மனம் விரும்பும் — நல்ல வழிகளைத் தேர்வு செய்யவும்.' });
  if (P.Venus.rasi === P.Rahu.rasi) notes.push({ en: 'Venus with Rahu: indulgence can grow quickly — set limits early.', ta: 'சுக்கிரனுடன் ராகு: சுகபோகம் விரைவில் வளரலாம் — முன்பே எல்லை வைக்கவும்.' });
  if ([12].includes(h('Moon')) || [6, 8, 12].includes(h('Venus'))) notes.push({ en: 'The 12th house (expenses, pleasures) is active — watch spending on habits.', ta: '12-ம் பாவம் (செலவு, சுகம்) செயல்பாட்டில் — பழக்கச் செலவில் கவனம்.' });
  return {
    level: notes.length >= 2 ? 'guard' : notes.length ? 'mild' : 'low',
    notes,
    ...(L == null ? { needsBirthTime: true, birthTimeNote: NEEDS_BIRTH_TIME } : {}),
    support: {
      en: 'Daily routine, exercise and sleep; Murugan or Anjaneya worship on Tuesdays and Saturdays; avoid company that pressures you. If a habit is already hard to stop, talk to a doctor or a de-addiction counsellor — help works, and asking is strength.',
      ta: 'தினசரி ஒழுங்கு, உடற்பயிற்சி, உறக்கம்; செவ்வாய், சனி முருகன் அல்லது ஆஞ்சநேயர் வழிபாடு; அழுத்தம் தரும் நட்பைத் தவிர்க்கவும். பழக்கத்தை நிறுத்த கடினமாக இருந்தால் மருத்துவர் அல்லது போதை மீட்பு ஆலோசகரை அணுகவும் — உதவி பலன் தரும், கேட்பது பலம்.',
    },
  };
}

const FIELDS = [
  { id: 'arts', en: 'Cinema, serial, music & arts', ta: 'சினிமா, சீரியல், இசை & கலை', planets: ['Venus', 'Moon', 'Rahu'], houses: [3, 5],
    study: { en: 'Visual communication, film & acting schools, fine arts, music', ta: 'விஷுவல் கம்யூனிகேஷன், திரைப்பட/நடிப்புப் பள்ளி, நுண்கலை, இசை' } },
  { id: 'politics', en: 'Politics & public leadership', ta: 'அரசியல் & பொதுத் தலைமை', planets: ['Sun', 'Saturn', 'Rahu', 'Mars'], houses: [10, 6, 11],
    study: { en: 'Law, political science, public administration, social work', ta: 'சட்டம், அரசியல் அறிவியல், பொது நிர்வாகம், சமூகப் பணி' } },
  { id: 'tech', en: 'Engineering, IT & technology', ta: 'பொறியியல், IT & தொழில்நுட்பம்', planets: ['Mars', 'Saturn', 'Mercury', 'Rahu'], houses: [3, 6, 10],
    study: { en: 'B.E./B.Tech (CS, AI, ECE, Mech), data science', ta: 'பி.இ./பி.டெக் (கணினி, செயற்கை நுண்ணறிவு, மின்னணு, இயந்திரவியல்), தரவு அறிவியல்' } },
  { id: 'medicine', en: 'Medicine & healing', ta: 'மருத்துவம் & சிகிச்சை', planets: ['Sun', 'Mars', 'Ketu', 'Jupiter'], houses: [6, 8, 12],
    study: { en: 'MBBS, dental, nursing, pharmacy, Siddha/Ayurveda', ta: 'எம்.பி.பி.எஸ், பல் மருத்துவம், செவிலியர், மருந்தியல், சித்தா/ஆயுர்வேதம்' } },
  { id: 'law', en: 'Law & judiciary', ta: 'சட்டம் & நீதித்துறை', planets: ['Jupiter', 'Saturn', 'Sun'], houses: [6, 9],
    study: { en: 'LLB / integrated law, judicial services', ta: 'எல்.எல்.பி / ஒருங்கிணைந்த சட்டப் படிப்பு, நீதித்துறைத் தேர்வுகள்' } },
  { id: 'finance', en: 'Finance, banking & accounts', ta: 'நிதி, வங்கி & கணக்கியல்', planets: ['Mercury', 'Jupiter', 'Venus'], houses: [2, 11],
    study: { en: 'B.Com, CA/CMA, MBA Finance, banking exams', ta: 'பி.காம், சி.ஏ/சி.எம்.ஏ, எம்.பி.ஏ நிதி, வங்கித் தேர்வுகள்' } },
  { id: 'business', en: 'Business & trade', ta: 'வியாபாரம் & வணிகம்', planets: ['Mercury', 'Venus', 'Rahu'], houses: [7, 10, 11],
    study: { en: 'BBA/MBA, entrepreneurship, family business', ta: 'பி.பி.ஏ/எம்.பி.ஏ, தொழில்முனைவு, குடும்ப வியாபாரம்' } },
  { id: 'teaching', en: 'Teaching, research & science', ta: 'கற்பித்தல், ஆராய்ச்சி & அறிவியல்', planets: ['Jupiter', 'Mercury', 'Ketu'], houses: [4, 5, 9, 8],
    study: { en: 'B.Sc/M.Sc, PhD, B.Ed', ta: 'பி.எஸ்.சி/எம்.எஸ்.சி, முனைவர், பி.எட்' } },
  { id: 'govt', en: 'Government service & administration', ta: 'அரசுப் பணி & நிர்வாகம்', planets: ['Sun', 'Saturn', 'Jupiter'], houses: [10, 6],
    study: { en: 'UPSC / TNPSC civil services, public sector exams', ta: 'UPSC / TNPSC குடிமைப் பணித் தேர்வுகள், பொதுத்துறைத் தேர்வுகள்' } },
  { id: 'defence', en: 'Police, defence & sports', ta: 'காவல், ராணுவம் & விளையாட்டு', planets: ['Mars', 'Sun'], houses: [3, 6],
    study: { en: 'NDA/police academies, physical education, sports science', ta: 'என்.டி.ஏ/காவல் பயிற்சி, உடற்கல்வி, விளையாட்டு அறிவியல்' } },
  { id: 'media', en: 'Writing, journalism & communication', ta: 'எழுத்து, இதழியல் & தகவல்தொடர்பு', planets: ['Mercury', 'Moon', 'Venus'], houses: [3, 5],
    study: { en: 'Journalism & mass communication, literature, languages', ta: 'இதழியல் & மக்கள் தொடர்பியல், இலக்கியம், மொழிகள்' } },
  { id: 'spiritual', en: 'Spiritual, astrology & counselling', ta: 'ஆன்மீகம், ஜோதிடம் & ஆலோசனை', planets: ['Ketu', 'Jupiter', 'Moon'], houses: [8, 9, 12],
    study: { en: 'Psychology, philosophy, Sanskrit/Tamil literature, Jyotisha', ta: 'உளவியல், தத்துவம், சமஸ்கிருதம்/தமிழ் இலக்கியம், ஜோதிடம்' } },
  { id: 'abroad', en: 'Foreign career & multinational work', ta: 'வெளிநாட்டுப் பணி & பன்னாட்டு நிறுவனம்', planets: ['Rahu', 'Saturn', 'Moon'], houses: [12, 9, 7],
    study: { en: 'Study abroad, global certifications, languages', ta: 'வெளிநாட்டுப் படிப்பு, சர்வதேசச் சான்றிதழ்கள், மொழிகள்' } },
];

/**
 * Career & study compass: ranks fields by the strength of their planets, their link to the 10th house
 * (as 10th lord, occupant or aspecting planet) and the strength of the related houses.
 */
export function careerCompass(chart) {
  const P = chart.planets;
  const strength = Object.fromEntries(grahaStrength(P).map((g) => [g.planet, g.score]));
  if (!P.Lagna) {
    // Without a birth time: planet strength only (no house links), clearly labelled.
    const ranked = FIELDS.map((f) => ({ ...f, score: Math.round(Math.min(98, f.planets.reduce((s, k) => s + strength[k], 0) / f.planets.length)), reasons: [] })).sort((a, b) => b.score - a.score);
    return { top: ranked.slice(0, 4), all: ranked, tenthLord: null, tenthSign: null, needsBirthTime: true, birthTimeNote: NEEDS_BIRTH_TIME };
  }
  const L = P.Lagna.rasi;
  const bhavas = bhavaAnalysis(chart);
  const tenth = bhavas[9];
  const tenthLinked = new Set([tenth.lord, ...tenth.occupants, ...tenth.aspects]);
  const ninthLord = bhavas[8].lord, fifthLord = bhavas[4].lord;
  const ranked = FIELDS.map((f) => {
    const reasons = [];
    let score = f.planets.reduce((s, k) => s + strength[k], 0) / f.planets.length * 0.5;
    score += f.houses.reduce((s, h) => s + bhavas[h - 1].score, 0) / f.houses.length * 0.35;
    for (const k of f.planets) {
      if (tenthLinked.has(k)) { score += 7; reasons.push({ en: `${k} is connected to your 10th house of career`, ta: `${PLANETS[k].ta} தொழில் ஸ்தானமான 10-ம் வீட்டுடன் தொடர்பு` }); }
      if (k === fifthLord || k === ninthLord) { score += 3; reasons.push({ en: `${k} rules your ${k === fifthLord ? '5th (talent)' : '9th (fortune)'} house`, ta: `${PLANETS[k].ta} ${k === fifthLord ? '5-ம் (திறமை)' : '9-ம் (பாக்கியம்)'} வீட்டு அதிபதி` }); }
      if (strength[k] >= 70) reasons.push({ en: `${k} is strong in your chart`, ta: `${PLANETS[k].ta} பலமாக உள்ளார்` });
      if (houseOf(L, P[k].rasi) === 1) { score += 4; reasons.push({ en: `${k} sits in your Lagna — shapes your personality`, ta: `${PLANETS[k].ta} லக்னத்தில் — உங்கள் இயல்பை வடிவமைக்கிறார்` }); }
    }
    return { ...f, score: Math.round(Math.min(98, score)), reasons: reasons.slice(0, 4) };
  }).sort((a, b) => b.score - a.score);
  return { top: ranked.slice(0, 4), all: ranked, tenthLord: tenth.lord, tenthSign: tenth.rasiName };
}
