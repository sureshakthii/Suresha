// Life Road Map (வாழ்க்கை வரைபடம்) — a personal plan for each individual:
// life stage and its goals, every Dasa–Bhukti period ahead scored for career, wealth, family, health and learning,
// a year-by-year outlook with Saturn / Jupiter transits, the next best windows for big events and a simple
// "what to do now" list. Rule-based (KP-style significations + gochara) and written to guide, never to frighten.
import { planetPositions, PLANETS } from './astro.js';
import { significations, planetScore, predictEvent } from './predict.js';
import { NAVAGRAHA } from './remedies.js';

const DAY = 86400000;
const YEAR = 365.25 * DAY;
const T = (en, ta) => ({ en, ta });
const houseOf = (from, to) => ((to - from + 12) % 12) + 1;
const clamp = (x) => Math.max(10, Math.min(95, Math.round(x)));

export const ROAD_AREAS = [
  { id: 'career', icon: '💼', ...T('Career', 'தொழில்'), houses: [2, 10, 11], negate: [5, 8, 12], karakas: ['Sun', 'Saturn'] },
  { id: 'wealth', icon: '💰', ...T('Wealth', 'செல்வம்'), houses: [2, 11, 9], negate: [8, 12], karakas: ['Jupiter', 'Venus'] },
  { id: 'family', icon: '🏡', ...T('Family & marriage', 'குடும்பம் & திருமணம்'), houses: [2, 4, 7, 11], negate: [1, 6, 10], karakas: ['Venus', 'Moon'] },
  { id: 'health', icon: '🌿', ...T('Wellbeing (traditional view)', 'நலம் (மரபுப் பார்வை)'), traditionalOnly: true, houses: [1, 5, 11], negate: [6, 8, 12], karakas: ['Sun', 'Moon'] },
  { id: 'learning', icon: '🎓', ...T('Learning & growth', 'கல்வி & வளர்ச்சி'), houses: [4, 5, 9], negate: [3, 8], karakas: ['Mercury', 'Jupiter'] },
];

const STAGES = [
  { max: 22, id: 'student', ...T('Learning years', 'கற்கும் பருவம்'),
    goals: [T('Build strong study habits and one skill deeply', 'நல்ல படிப்புப் பழக்கமும் ஒரு திறமையில் ஆழமும்'), T('Choose the field your chart supports (see Career Compass)', 'ஜாதகம் ஆதரிக்கும் துறையைத் தேர்வு (தொழில் திசைகாட்டி பாருங்கள்)'), T('Respect parents and teachers — Guru\'s blessing is the biggest asset', 'பெற்றோர், ஆசிரியரை மதியுங்கள் — குரு அருளே பெரிய சொத்து')] },
  { max: 35, id: 'build', ...T('Building years', 'கட்டியெழுப்பும் பருவம்'),
    goals: [T('Settle career and income; save 20% of every salary', 'தொழில், வருமானத்தை நிலைப்படுத்துங்கள்; ஒவ்வொரு சம்பளத்திலும் 20% சேமிப்பு'), T('Marriage and family at the right muhurtham', 'சரியான முகூர்த்தத்தில் திருமணமும் குடும்பமும்'), T('Health insurance and a term plan early', 'ஆரோக்கியக் காப்பீடு, ஆயுள் காப்பீடு முன்கூட்டியே')] },
  { max: 50, id: 'grow', ...T('Growing years', 'வளரும் பருவம்'),
    goals: [T('Own home and steady assets', 'சொந்த வீடும் நிலையான சொத்தும்'), T('Children\'s education fund', 'பிள்ளைகளின் கல்வி நிதி'), T('Lead at work or start the business — in your good periods', 'நல்ல காலத்தில் தலைமைப் பொறுப்பு அல்லது தொழில் தொடக்கம்')] },
  { max: 60, id: 'secure', ...T('Securing years', 'பாதுகாக்கும் பருவம்'),
    goals: [T('Become debt-free and secure retirement savings', 'கடன் இல்லா நிலை, ஓய்வுக்கால சேமிப்பு'), T('Yearly full health check-up', 'ஆண்டுதோறும் முழு மருத்துவப் பரிசோதனை'), T('Children\'s marriages at the right time', 'பிள்ளைகளின் திருமணம் சரியான நேரத்தில்')] },
  { max: 200, id: 'wisdom', ...T('Years of wisdom', 'ஞானப் பருவம்'),
    goals: [T('Shashtiabdapoorthi / Sathabhishekam with family', 'குடும்பத்துடன் சஷ்டியப்தபூர்த்தி / சதாபிஷேகம்'), T('Temple yatras, annadhanam and passing on family traditions', 'கோவில் யாத்திரை, அன்னதானம், குடும்பப் பாரம்பரியத்தைக் கடத்துதல்'), T('Gentle exercise, good sleep and joyful company', 'மென்மையான உடற்பயிற்சி, நல்ல உறக்கம், மகிழ்ச்சியான சகவாசம்')] },
];

const ageAt = (chart, d) => (d - chart.utc) / YEAR;

/** Saturn / Jupiter gochara from the Moon at a date → small score adjustments and notes. */
function gochara(chart, date) {
  const { planets } = planetPositions(date);
  const M = chart.planets.Moon.rasi;
  const sat = houseOf(M, planets.Saturn.rasi), jup = houseOf(M, planets.Jupiter.rasi);
  const adj = { career: 0, wealth: 0, family: 0, health: 0, learning: 0 };
  const notes = [];
  if ([12, 1, 2].includes(sat)) { adj.health -= 5; adj.wealth -= 4; notes.push(T('Ezharai Sani — hard work pays slowly; avoid big loans', 'ஏழரைச் சனி — உழைப்புக்குப் பலன் மெதுவாக; பெரிய கடன் தவிர்க்கவும்')); }
  if (sat === 8) { adj.health -= 7; adj.career -= 4; notes.push(T('Ashtama Sani — go slow on risks, care for health', 'அஷ்டமச் சனி — அபாயங்களில் நிதானம், ஆரோக்கியத்தில் கவனம்')); }
  if (sat === 4) { adj.family -= 4; notes.push(T('Ardhashtama Sani — care for home and mother', 'அர்த்தாஷ்டமச் சனி — வீடு, தாய் நலனில் கவனம்')); }
  if ([3, 6, 11].includes(sat)) { adj.career += 5; adj.wealth += 3; notes.push(T('Saturn rewards effort in this period', 'இக்காலத்தில் சனி உழைப்புக்குப் பலன் தருவார்')); }
  if ([2, 5, 7, 9, 11].includes(jup)) { adj.family += 5; adj.wealth += 4; adj.learning += 3; notes.push(T('Guru Balam — blessings for family events', 'குரு பலம் — குடும்ப நிகழ்வுகளுக்கு ஆசி')); }
  return { adj, notes, sat, jup };
}

/**
 * The road map. chart: birthChart output. from: start date. years: how far ahead (default 10).
 */
export function lifeRoadmap(chart, { from = new Date(), years = 10 } = {}) {
  const sig = significations(chart);
  const end = new Date(from.getTime() + years * YEAR);
  const age = ageAt(chart, from);
  const stage = STAGES.find((s) => age < s.max);
  const nextStage = STAGES[STAGES.indexOf(stage) + 1] || null;

  // Every Dasa–Bhukti period ahead, scored per area.
  const periods = [];
  for (const md of chart.dasa.periods) {
    if (md.end < from || md.start > end) continue;
    for (const ad of md.bhuktis) {
      if (ad.end < from || ad.start > end) continue;
      const s = new Date(Math.max(ad.start, from)), e = new Date(Math.min(ad.end, end));
      const g = gochara(chart, new Date((s.getTime() + e.getTime()) / 2));
      const scores = {};
      for (const a of ROAD_AREAS) {
        const raw = planetScore(sig, md.lord, a) * 0.4 + planetScore(sig, ad.lord, a) * 0.6;
        scores[a.id] = clamp(46 + 5 * Math.max(-4, Math.min(5, raw)) + g.adj[a.id]);
      }
      const overall = Math.round(Object.values(scores).reduce((x, y) => x + y, 0) / ROAD_AREAS.length);
      const ranked = [...ROAD_AREAS].sort((x, y) => scores[y.id] - scores[x.id]);
      periods.push({
        md: md.lord, ad: ad.lord, start: s, end: e, scores, overall,
        level: overall >= 62 ? 'good' : overall >= 50 ? 'steady' : 'care',
        focus: ranked[0].id, careArea: scores[ranked[ranked.length - 1].id] < 50 ? ranked[ranked.length - 1].id : null,
        notes: g.notes, remedy: { planet: ad.lord, deity: NAVAGRAHA[ad.lord].deity, mantra: NAVAGRAHA[ad.lord].mantra, free: NAVAGRAHA[ad.lord].free },
        current: from >= ad.start && from < ad.end,
      });
    }
  }

  // Year by year (calendar years), weighted by how long each period covers the year.
  const yearsOut = [];
  const y0 = new Date(from).getUTCFullYear();
  for (let y = y0; y < y0 + years; y++) {
    const ys = Date.UTC(y, 0, 1), ye = Date.UTC(y + 1, 0, 1);
    const acc = Object.fromEntries(ROAD_AREAS.map((a) => [a.id, 0]));
    let w = 0;
    for (const p of periods) {
      const ov = Math.min(ye, p.end.getTime()) - Math.max(ys, p.start.getTime());
      if (ov <= 0) continue;
      w += ov;
      for (const a of ROAD_AREAS) acc[a.id] += p.scores[a.id] * ov;
    }
    if (!w) continue;
    const scores = Object.fromEntries(ROAD_AREAS.map((a) => [a.id, Math.round(acc[a.id] / w)]));
    const overall = Math.round(Object.values(scores).reduce((x, z) => x + z, 0) / ROAD_AREAS.length);
    const best = [...ROAD_AREAS].sort((a, b) => scores[b.id] - scores[a.id])[0];
    yearsOut.push({ year: y, scores, overall, level: overall >= 62 ? 'good' : overall >= 50 ? 'steady' : 'care', best: best.id, age: Math.floor(ageAt(chart, new Date(Date.UTC(y, 6, 1)))) });
  }

  // Next best windows for the big life events that fit this age.
  const wanted = [
    ['career', 18, 70], ['house', 22, 75], ['business', 21, 70], ['marriage', 20, 40], ['education', 15, 30], ['child', 22, 42], ['visa', 18, 60],
  ].filter(([, a, b]) => age >= a - 2 && age <= b);
  const milestones = wanted.map(([id]) => {
    const p = predictEvent(chart, id, { from, years: Math.min(years, 12) });
    const w = p.earliest || p.windows[0];
    return w ? { id, icon: p.question.icon, name: T(p.question.en, p.question.ta), from: w.peakFrom, to: w.peakTo, doubleTransit: w.doubleTransit, promise: p.promise.level } : null;
  }).filter(Boolean).sort((a, b) => a.from - b.from);

  const current = periods.find((p) => p.current) || periods[0] || null;
  const nextGood = periods.find((p) => !p.current && p.level === 'good') || null;
  const nextCare = periods.find((p) => !p.current && p.level === 'care') || null;
  const now = [];
  if (current) {
    const focus = ROAD_AREAS.find((a) => a.id === current.focus);
    now.push(T(`Your strongest area now is ${focus.en.toLowerCase()} — put your energy here.`, `இப்போது உங்கள் வலுவான துறை ${focus.ta} — இதில் முழு கவனம் செலுத்துங்கள்.`));
    if (current.careArea) {
      const c = ROAD_AREAS.find((a) => a.id === current.careArea);
      now.push(T(`Give extra care to ${c.en.toLowerCase()} in this period.`, `இக்காலத்தில் ${c.ta} மீது கூடுதல் கவனம் தேவை.`));
    }
    now.push(T(`Period lord ${current.ad}: ${current.remedy.free.en}`, `புக்தி அதிபதி ${PLANETS[current.ad].ta}: ${current.remedy.free.ta}`));
  }
  if (nextGood) now.push(T(`Plan big moves for the ${nextGood.md}–${nextGood.ad} period starting ${nextGood.start.toISOString().slice(0, 7)}.`, `பெரிய முடிவுகளை ${PLANETS[nextGood.md].ta}–${PLANETS[nextGood.ad].ta} காலத்திற்குத் (${nextGood.start.toISOString().slice(0, 7)} முதல்) திட்டமிடுங்கள்.`));
  if (nextCare) now.push(T(`Prepare savings and health before ${nextCare.start.toISOString().slice(0, 7)} (a period needing care).`, `${nextCare.start.toISOString().slice(0, 7)} முன் சேமிப்பையும் ஆரோக்கியத்தையும் தயார் செய்யுங்கள் (கவனம் தேவைப்படும் காலம்).`));

  return {
    age: Math.floor(age), stage, nextStage, periods, years: yearsOut, milestones, current, nextGood, nextCare, now,
    needsBirthTime: !sig,
    birthTimeNote: sig ? null : T('Birth time unknown — area scores use Moon-based transits only; house-based period readings need a known birth time.', 'பிறந்த நேரம் தெரியவில்லை — சந்திரன் சார்ந்த கோசாரம் மட்டுமே; பாவம் சார்ந்த கால பலன்களுக்குப் பிறந்த நேரம் தேவை.'),
    disclaimerId: 'roadmap.traditional-periods.v1',
    disclaimer: T('Period scores show how your selected tradition reads each Dasa–Bhukti. They are not guarantees, and the wellbeing area is not a medical assessment.',
      'காலப் புள்ளிகள் நீங்கள் தேர்ந்தெடுத்த மரபு ஒவ்வொரு தசா–புக்தியையும் எப்படிப் பார்க்கிறது என்பதைக் காட்டுகின்றன. இவை உறுதிமொழிகள் அல்ல; நலப் பகுதி மருத்துவ மதிப்பீடும் அல்ல.'),
  };
}
