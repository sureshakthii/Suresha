// Love Match (காதல் பொருத்தம்) — a modern, friendly compatibility read for two people, built from
// both birth charts: Moon (emotional sync), Venus–Mars (chemistry), Mercury (communication),
// Jupiter (trust & growth) and the traditional 10-porutham star match (both directions).
// It is guidance for understanding each other — never a verdict on a person or a relationship: the result is a
// neutral list of traditional affinity notes with no percentage, no tier and no combined score.
import { RASIS, PLANETS } from './astro.js';
import { matchPorutham } from './porutham.js';

const T = (en, ta) => ({ en, ta });
const dist = (a, b) => ((b - a + 12) % 12) + 1; // house of b counted from a
const ELEMENT = (r) => ['fire', 'earth', 'air', 'water'][r % 4];
const ELEMENT_NAME = { fire: T('Fire', 'நெருப்பு'), earth: T('Earth', 'நிலம்'), air: T('Air', 'காற்று'), water: T('Water', 'நீர்') };
const elemScore = (a, b) => {
  const x = ELEMENT(a), y = ELEMENT(b);
  if (x === y) return 85;
  const pair = [x, y].sort().join('-');
  return pair === 'air-fire' || pair === 'earth-water' ? 80 : pair === 'fire-water' || pair === 'air-earth' ? 45 : 60;
};
/** Mutual sign relation — 1/7 attraction, 5/9 harmony, 3/11 friendship, 4/10 effort, 2/12 & 6/8 friction. */
function relation(a, b) {
  const d = Math.min(dist(a, b), dist(b, a));
  const k = [dist(a, b), dist(b, a)].sort((p, q) => p - q).join('/');
  if (a === b) return { score: 78, key: 'same', text: T('Same sign — you think alike', 'ஒரே ராசி — ஒரே மாதிரி சிந்தனை') };
  if (k === '7/7') return { score: 90, key: 'opp', text: T('Opposite signs — strong pull, you complete each other', 'எதிர் ராசிகள் — வலுவான ஈர்ப்பு, ஒருவரை ஒருவர் நிறைவு செய்வீர்கள்') };
  if (k === '5/9') return { score: 92, key: 'trine', text: T('Trine (5/9) — natural harmony and luck together', 'திரிகோணம் (5/9) — இயல்பான இணக்கம், சேர்ந்தால் அதிர்ஷ்டம்') };
  if (k === '3/11') return { score: 80, key: 'friend', text: T('3/11 — best friends first, easy fun', '3/11 — முதலில் நல்ல நண்பர்கள், இனிய நேரம்') };
  if (k === '4/10') return { score: 62, key: 'square', text: T('4/10 — different paces; needs give-and-take', '4/10 — வேறுபட்ட வேகம்; விட்டுக்கொடுத்தல் தேவை') };
  if (k === '2/12') return { score: 50, key: 'dwi', text: T('2/12 — money and priorities need open talk', '2/12 — பணம், முன்னுரிமைகள் பற்றி வெளிப்படையான பேச்சு தேவை') };
  if (k === '6/8') return { score: 40, key: 'shash', text: T('6/8 — sensitive spots; patience and respect matter most', '6/8 — உணர்ச்சிப் புள்ளிகள்; பொறுமை, மரியாதை மிக முக்கியம்') };
  return { score: 60 + d, key: 'other', text: T('Mixed relation', 'கலவையான உறவு') };
}

/**
 * @param a chart of person A, @param b chart of person B (from birthChart)
 * @param opts { genderA, genderB, names:[a,b] }
 */
export function loveMatch(a, b, { genderA, genderB, names = ['A', 'B'] } = {}) {
  const P = (c, k) => c.planets[k].rasi;
  const moon = relation(a.janmaRasi.index, b.janmaRasi.index);
  const emo = Math.round((moon.score + elemScore(a.janmaRasi.index, b.janmaRasi.index)) / 2);
  // Chemistry: Venus of one with Mars of the other (both ways), plus Venus–Venus element.
  const vm = (x, y) => { const r = relation(P(x, 'Venus'), P(y, 'Mars')); return r.key === 'opp' || r.key === 'trine' || r.key === 'same' ? 92 : r.key === 'friend' ? 78 : r.score; };
  const chem = Math.round((vm(a, b) + vm(b, a) + elemScore(P(a, 'Venus'), P(b, 'Venus'))) / 3);
  const comm = Math.round((elemScore(P(a, 'Mercury'), P(b, 'Mercury')) + relation(P(a, 'Mercury'), P(b, 'Mercury')).score) / 2);
  const trust = Math.round((relation(P(a, 'Jupiter'), b.janmaRasi.index).score + relation(P(b, 'Jupiter'), a.janmaRasi.index).score) / 2);

  // Traditional star match — bride/groom direction from gender when known, else the kinder of both directions.
  const side = (c) => ({ star: c.janmaNakshatra.index, rasi: c.janmaRasi.index });
  const ab = matchPorutham(side(a), side(b)), ba = matchPorutham(side(b), side(a));
  const por = genderA === 'female' && genderB === 'male' ? ab : genderA === 'male' && genderB === 'female' ? ba : (ab.score >= ba.score ? ab : ba);
  const porPct = Math.round(por.score * 10); // internal only — never shown

  const meters = [
    { id: 'emotion', icon: '🌙', name: T('Emotional sync', 'உணர்வு இணக்கம்'), score: emo, why: T(`Moon signs ${RASIS[a.janmaRasi.index].en} & ${RASIS[b.janmaRasi.index].en}: ${moon.text.en}`, `சந்திர ராசிகள் ${RASIS[a.janmaRasi.index].ta} & ${RASIS[b.janmaRasi.index].ta}: ${moon.text.ta}`) },
    { id: 'chemistry', icon: '🔥', name: T('Chemistry', 'ஈர்ப்பு'), score: chem, why: T(`Venus in ${RASIS[P(a, 'Venus')].en} / ${RASIS[P(b, 'Venus')].en}, Mars in ${RASIS[P(a, 'Mars')].en} / ${RASIS[P(b, 'Mars')].en}`, `சுக்கிரன் ${RASIS[P(a, 'Venus')].ta} / ${RASIS[P(b, 'Venus')].ta}, செவ்வாய் ${RASIS[P(a, 'Mars')].ta} / ${RASIS[P(b, 'Mars')].ta}`) },
    { id: 'talk', icon: '💬', name: T('Communication', 'பேச்சு இணக்கம்'), score: comm, why: T(`Mercury: ${ELEMENT_NAME[ELEMENT(P(a, 'Mercury'))].en} & ${ELEMENT_NAME[ELEMENT(P(b, 'Mercury'))].en} signs`, `புதன்: ${ELEMENT_NAME[ELEMENT(P(a, 'Mercury'))].ta} & ${ELEMENT_NAME[ELEMENT(P(b, 'Mercury'))].ta} ராசிகள்`) },
    { id: 'trust', icon: '🤝', name: T('Trust & growth', 'நம்பிக்கை & வளர்ச்சி'), score: trust, why: T('Jupiter of each person seen from the other’s Moon sign', 'ஒவ்வொருவரின் குரு, மற்றவரின் ராசியிலிருந்து') },
    { id: 'porutham', icon: '🪐', name: T('Traditional star match', 'பாரம்பரிய நட்சத்திரப் பொருத்தம்'), score: porPct, why: T(`${por.agree} of 10 traditional factors agree`, `10 மரபுக் காரணிகளில் ${por.agree} பொருந்துகின்றன`) },
  ];
  const sorted = [...meters].sort((x, y) => y.score - x.score);
  const GREEN = {
    emotion: T('You feel understood without long explanations', 'நீண்ட விளக்கம் இல்லாமலே புரிந்துகொள்வீர்கள்'),
    chemistry: T('Natural spark — keep the fun and surprises alive', 'இயல்பான ஈர்ப்பு — வேடிக்கையும் ஆச்சரியமும் தொடரட்டும்'),
    talk: T('Easy conversations — you can solve things by talking', 'எளிய உரையாடல் — பேசியே தீர்வு காண்பீர்கள்'),
    trust: T('You help each other grow and stay loyal', 'ஒருவரை ஒருவர் வளர்த்து, விசுவாசமாக இருப்பீர்கள்'),
    porutham: T('Traditional star match supports the bond', 'பாரம்பரிய நட்சத்திரப் பொருத்தம் ஆதரிக்கிறது'),
  };
  const WORK = {
    emotion: T('Moods can clash — check in on feelings, not just plans', 'மனநிலை மோதலாம் — திட்டங்கள் மட்டுமல்ல, உணர்வுகளையும் கேளுங்கள்'),
    chemistry: T('Spark needs effort — plan time together without phones', 'ஈர்ப்புக்கு முயற்சி தேவை — கைப்பேசி இல்லாத நேரம் ஒதுக்குங்கள்'),
    talk: T('Different talking styles — listen fully before replying', 'வேறுபட்ட பேச்சு முறை — முழுதாகக் கேட்ட பின் பதில் சொல்லுங்கள்'),
    trust: T('Build trust with small promises kept', 'சிறிய வாக்குறுதிகளைக் காப்பதன் மூலம் நம்பிக்கை வளரும்'),
    porutham: T('Fewer star factors agree — if you plan marriage, look at the detailed matching together with family', 'குறைவான நட்சத்திரக் காரணிகள் பொருந்துகின்றன — திருமணம் என்றால் குடும்பத்துடன் சேர்ந்து விரிவான பொருத்தம் பாருங்கள்'),
  };
  // Best day for dates: the weekday whose lord is friendly to both Venus signs (simple: Friday, else Venus-element day).
  const dateDay = T('Friday (Venus) — and any day with Amirtha / Siddha yogam', 'வெள்ளிக்கிழமை (சுக்கிரன்) — மற்றும் அமிர்த / சித்த யோக நாட்கள்');
  // Neutral affinity notes: what each traditional factor looks at, and one gentle line — no number on any of them.
  const NEUTRAL = {
    emotion: T('Talk about how each of you shows and needs care', 'அன்பை நீங்கள் ஒவ்வொருவரும் எப்படிக் காட்டுகிறீர்கள், எதிர்பார்க்கிறீர்கள் என்று பேசுங்கள்'),
    chemistry: T('Keep time together that is just for the two of you', 'உங்கள் இருவருக்கு மட்டுமான நேரத்தை ஒதுக்குங்கள்'),
    talk: T('Listen fully before replying', 'முழுதாகக் கேட்ட பின் பதில் சொல்லுங்கள்'),
    trust: T('Small promises kept build trust', 'சிறிய வாக்குறுதிகளைக் காப்பது நம்பிக்கையை வளர்க்கும்'),
    porutham: T('If you plan marriage, look at the 10 poruthams together with family', 'திருமணம் என்றால் 10 பொருத்தங்களைக் குடும்பத்துடன் சேர்ந்து பாருங்கள்'),
  };
  const notes = meters.map((m) => ({ id: m.id, icon: m.icon, name: m.name, basis: m.why, line: m.score >= 70 ? GREEN[m.id] : m.score < 65 ? WORK[m.id] : NEUTRAL[m.id] }));
  return {
    names, notes,
    title: T('Traditional affinity notes', 'மரபு இணக்கக் குறிப்புகள்'),
    note: T('A traditional reading to understand each other — no score, no verdict. It does not decide anyone’s worth or your future together.', 'ஒருவரை ஒருவர் புரிந்துகொள்ள உதவும் மரபு வாசிப்பு — மதிப்பெண்ணோ தீர்ப்போ இல்லை. யாருடைய மதிப்பையும் உங்கள் எதிர்காலத்தையும் தீர்மானிப்பதில்லை.'),
    noPercentage: true, noVerdict: true,
    green: sorted.filter((m) => m.score >= 70).slice(0, 3).map((m) => GREEN[m.id]),
    work: sorted.filter((m) => m.score < 65).slice(-2).map((m) => WORK[m.id]),
    porutham: por, rajjuOk: !por.criticalFail, dateDay,
    venus: [P(a, 'Venus'), P(b, 'Venus')].map((r) => ({ rasi: r, name: T(RASIS[r].en, RASIS[r].ta) })),
    planetsUsed: ['Moon', 'Venus', 'Mars', 'Mercury', 'Jupiter'].map((k) => T(k, PLANETS[k].ta)),
  };
}
