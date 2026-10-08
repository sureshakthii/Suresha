// Life Road Map (வாழ்க்கை வரைபடம்) — a personal plan for each individual:
// life stage and its goals, every Dasa–Bhukti period ahead scored for career, wealth, family, health and learning,
// a year-by-year outlook with Saturn / Jupiter transits, the next best windows for big events and a simple
// "what to do now" list. Rule-based (KP-style significations + gochara) and written to guide, never to frighten.
import { planetPositions, PLANETS } from './astro.js';
import { significations, planetScore, predictEvent } from './predict.js';
import { remedyFor } from './remedies.js';
import { ageProfile, topicAllowed, adultText } from './age-guard.js';
import { dasaTone } from './analysis.js';
import { fmtMonth, planetAdjTa } from './fmt.js';

/** "Dec 2027" / "டிசம்பர் 2027" — never "2027-12". */
const monthT = (d) => T(fmtMonth(new Date(d), 'en', 0), fmtMonth(new Date(d), 'ta', 0));
const pAdj = (k) => planetAdjTa(k, PLANETS[k].ta);
/** Areas scored on screen (wellbeing is not scored from the chart, so it is never called the "strongest" area). */
const shown = (a) => !a.traditionalOnly;

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

// Under 18 (shared/age-guard.js): no career, wealth or marriage scores — only learning, family & home and
// wellbeing, with the child's own stage and goals.
const byId = (id) => ROAD_AREAS.find((a) => a.id === id);
export const CHILD_AREAS = [
  byId('learning'),
  { ...byId('family'), ...T('Family & home', 'குடும்பம் & வீடு'), houses: [2, 4, 11], negate: [6, 8, 12], karakas: ['Moon', 'Jupiter'] },
  byId('health'),
];
const CHILD_STAGES = {
  '0-5': { id: 'early', ...T('Early childhood', 'சிறு குழந்தைப் பருவம்'), goals: [T('Play, stories and songs with the family every day', 'தினமும் குடும்பத்துடன் விளையாட்டு, கதை, பாடல்'), T('Nutritious food, good sleep and timely vaccinations', 'சத்தான உணவு, நல்ல உறக்கம், உரிய நேரத் தடுப்பூசி'), T('Simple prayers and festivals together', 'சேர்ந்து எளிய பிரார்த்தனை, பண்டிகைகள்')] },
  '6-12': { id: 'school', ...T('School years', 'பள்ளிப் பருவம்'), goals: [T('A daily study habit and joy in reading', 'தினசரி படிப்புப் பழக்கமும் வாசிப்பில் மகிழ்ச்சியும்'), T('Outdoor play, healthy food and early sleep', 'வெளி விளையாட்டு, ஆரோக்கிய உணவு, சீக்கிரம் உறக்கம்'), T('Kindness, sharing and respect for parents and teachers', 'அன்பு, பகிர்தல், பெற்றோர் ஆசிரியருக்கு மரியாதை')] },
  '13-17': { id: 'teen', ...T('Teen years', 'பதின்பருவம்'), goals: [T('Strong exam preparation with a steady timetable', 'சீரான அட்டவணையுடன் தேர்வுக்கு நல்ல தயாரிப்பு'), T('Discover your interests and strengths for the study choice (see the talent compass)', 'படிப்புத் தேர்வுக்கு ஆர்வமும் திறமையும் கண்டறியுங்கள் (திறமை வழிகாட்டி பாருங்கள்)'), T('Sleep, exercise, good friends and safe use of the phone', 'உறக்கம், உடற்பயிற்சி, நல்ல நண்பர்கள், கைப்பேசியைப் பாதுகாப்பாகப் பயன்படுத்துதல்')] },
};

const STAGES = [
  { max: 22, id: 'student', ...T('Learning years', 'கற்கும் பருவம்'),
    goals: [T('Build strong study habits and one skill deeply', 'நல்ல படிப்புப் பழக்கமும் ஒரு திறமையில் ஆழமும்'), T('Choose the field your chart supports (see Career Compass)', 'ஜாதகம் ஆதரிக்கும் துறையைத் தேர்வு (தொழில் திசைகாட்டி பாருங்கள்)'), T('Respect parents and teachers — Guru\'s blessing is the biggest asset', 'பெற்றோர், ஆசிரியரை மதியுங்கள் — குரு அருளே பெரிய சொத்து')] },
  { max: 35, id: 'build', ...T('Building years', 'கட்டியெழுப்பும் பருவம்'),
    goals: [T('Settle career and income; save 20% of every salary', 'தொழில், வருமானத்தை நிலைப்படுத்துங்கள்; ஒவ்வொரு சம்பளத்திலும் 20% சேமிப்பு'), { unmarried: true, ...T('Family life at your own pace — if you choose marriage, a good muhurtham', 'உங்கள் விருப்பப்படி குடும்ப வாழ்க்கை — திருமணம் எனில் நல்ல முகூர்த்தத்தில்') }, { married: true, ...T('Time, care and shared plans with your spouse and family', 'வாழ்க்கைத் துணையுடனும் குடும்பத்துடனும் நேரம், அக்கறை, கூட்டுத் திட்டங்கள்') }, T('Health insurance and a term plan early', 'ஆரோக்கியக் காப்பீடு, ஆயுள் காப்பீடு முன்கூட்டியே')] },
  { max: 50, id: 'grow', ...T('Growing years', 'வளரும் பருவம்'),
    goals: [T('Own home and steady assets', 'சொந்த வீடும் நிலையான சொத்தும்'), T('An education and future fund for your family', 'குடும்பத்தின் கல்வி, எதிர்காலத்திற்கான நிதி'), T('Lead at work or start the business — in your good periods', 'நல்ல காலத்தில் தலைமைப் பொறுப்பு அல்லது தொழில் தொடக்கம்')] },
  { max: 60, id: 'secure', ...T('Securing years', 'பாதுகாக்கும் பருவம்'),
    goals: [T('Become debt-free and secure retirement savings', 'கடன் இல்லா நிலை, ஓய்வுக்கால சேமிப்பு'), T('Yearly full health check-up', 'ஆண்டுதோறும் முழு மருத்துவப் பரிசோதனை'), T('Support the next generation\'s milestones', 'அடுத்த தலைமுறையின் முக்கிய நிகழ்வுகளுக்குத் துணை')] },
  { max: 200, id: 'wisdom', ...T('Years of wisdom', 'ஞானப் பருவம்'),
    goals: [T('Shashtiabdapoorthi (60), Bheemaratha Shanthi (70) and Sathabhishekam (80) with family', 'குடும்பத்துடன் சஷ்டியப்தபூர்த்தி (60), பீமரத சாந்தி (70), சதாபிஷேகம் (80)'), T('Temple yatras, annadhanam and passing on family traditions', 'கோவில் யாத்திரை, அன்னதானம், குடும்பப் பாரம்பரியத்தைக் கடத்துதல்'),
      T('Gentle exercise, good sleep and joyful company', 'மென்மையான உடற்பயிற்சி, நல்ல உறக்கம், மகிழ்ச்சியான சகவாசம்')] },
];

const ageAt = (chart, d) => (d - chart.utc) / YEAR;

/** A stage's goals for this person: marital status (no marriage push for the married). */
function goalsFor(stage, { maritalStatus = null } = {}) {
  if (!stage) return stage;
  const married = maritalStatus === 'married';
  const goals = stage.goals.filter((g) => (g.married ? married : true) && (g.unmarried ? !married : true))
    .map((g) => T(g.en, g.ta));
  return { ...stage, goals };
}

// Notes for a child's period rows: the same transit, without loans / money / career words.
const CHILD_NOTE = {
  ezharai: T('Ezharai Sani — steady study habits and patience help most now', 'ஏழரைச் சனி — சீரான படிப்புப் பழக்கமும் பொறுமையும் இப்போது பெரிய உதவி'),
  ashtama: T('Ashtama Sani — a calm routine, good sleep and family support', 'அஷ்டமச் சனி — அமைதியான அன்றாட ஒழுங்கு, நல்ல உறக்கம், குடும்பத்தின் துணை'),
};

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
/**
 * opts: from, years, maritalStatus ('married' | 'single' | 'other').
 */
export function lifeRoadmap(chart, { from = new Date(), years = 10, maritalStatus = null } = {}) {
  const sig = significations(chart);
  // Report horizon: `years` ahead of `from` (the screen says "Covers the next N years"). No age cutoff.
  const end = new Date(from.getTime() + years * YEAR);
  const age = ageAt(chart, from);
  const senior = age >= 60; // later years: home, health, family and spiritual focus — no new marriage / career pushes
  const profile = ageProfile(chart, { now: from });
  const minor = profile.minor;
  // 60+: the family area is about family and home — the same houses, without a marriage push.
  const AREAS = minor ? CHILD_AREAS : senior ? ROAD_AREAS.map((a) => (a.id === 'family' ? { ...a, ...T('Family & home', 'குடும்பம் & வீடு') } : a)) : ROAD_AREAS;
  const stage = minor ? CHILD_STAGES[profile.band] : goalsFor(STAGES.find((s) => age < s.max), { maritalStatus });
  const nextStage = minor ? (profile.band === '0-5' ? CHILD_STAGES['6-12'] : profile.band === '6-12' ? CHILD_STAGES['13-17'] : (() => { const s0 = goalsFor(STAGES[0], { maritalStatus }); return { ...s0, goals: s0.goals.filter((g) => !adultText(g)) }; })()) : goalsFor(STAGES[STAGES.findIndex((s) => s.id === stage.id) + 1], { maritalStatus }) || null;

  // Every Dasa–Bhukti period ahead, scored per area.
  const periods = [];
  const toneCache = {};
  const toneOf = (k) => (toneCache[k] ??= dasaTone(chart, k).good);
  for (const md of chart.dasa.periods) {
    if (md.end < from || md.start > end) continue;
    for (const ad of md.bhuktis) {
      if (ad.end < from || ad.start > end) continue;
      const s = new Date(Math.max(ad.start, from)), e = new Date(Math.min(ad.end, end));
      if (e <= s) continue;
      const g = gochara(chart, new Date((s.getTime() + e.getTime()) / 2));
      const scores = {};
      for (const a of AREAS) {
        const raw = planetScore(sig, md.lord, a) * 0.4 + planetScore(sig, ad.lord, a) * 0.6;
        scores[a.id] = clamp(46 + 5 * Math.max(-4, Math.min(5, raw)) + g.adj[a.id]);
      }
      const overall = Math.round(Object.values(scores).reduce((x, y) => x + y, 0) / AREAS.length);
      const ranked = AREAS.filter(shown).sort((x, y) => scores[y.id] - scores[x.id]);
      // One tone rule across surfaces: a Maha Dasa the analysis card calls supportive is never shown as a
      // "care" period here, and one it calls "growth through effort" is never shown as "good" (shared dasaTone).
      let level = overall >= 62 ? 'good' : overall >= 50 ? 'steady' : 'care';
      const mdGood = toneOf(md.lord);
      if (mdGood && level === 'care') level = 'steady';
      if (!mdGood && level === 'good') level = 'steady';
      const notes = minor ? g.notes.map((n) => (adultText(n) ? (CHILD_NOTE[g.sat === 8 ? 'ashtama' : 'ezharai']) : n)) : g.notes;
      const rem = remedyFor(ad.lord, { profile });
      periods.push({
        md: md.lord, ad: ad.lord, start: s, end: e, scores, overall,
        level,
        focus: ranked[0].id, careArea: scores[ranked[ranked.length - 1].id] < 50 ? ranked[ranked.length - 1].id : null,
        notes, remedy: { planet: ad.lord, deity: rem.deity || null, mantra: rem.mantra || null, free: rem.free, traditional: rem.traditional || null },
        current: from >= ad.start && from < ad.end,
      });
    }
  }

  // Year by year (calendar years), weighted by how long each period covers the year.
  const yearsOut = [];
  // The age the person turns in that calendar year (the age the family says for that year).
  const birthYear = /^\d{4}-/.test(String(chart.date || '')) ? Number(String(chart.date).slice(0, 4)) : null;
  const y0 = new Date(from).getUTCFullYear();
  for (let y = y0; y < y0 + years; y++) {
    const ys = Date.UTC(y, 0, 1), ye = Date.UTC(y + 1, 0, 1);
    const acc = Object.fromEntries(AREAS.map((a) => [a.id, 0]));
    let w = 0;
    for (const p of periods) {
      const ov = Math.min(ye, p.end.getTime()) - Math.max(ys, p.start.getTime());
      if (ov <= 0) continue;
      w += ov;
      for (const a of AREAS) acc[a.id] += p.scores[a.id] * ov;
    }
    if (!w) continue;
    const scores = Object.fromEntries(AREAS.map((a) => [a.id, Math.round(acc[a.id] / w)]));
    const overall = Math.round(Object.values(scores).reduce((x, z) => x + z, 0) / AREAS.length);
    const best = AREAS.filter(shown).sort((a, b) => scores[b.id] - scores[a.id])[0];
    yearsOut.push({ year: y, scores, overall, level: overall >= 62 ? 'good' : overall >= 50 ? 'steady' : 'care', best: best.id, age: birthYear != null ? y - birthYear : Math.floor(ageAt(chart, new Date(Date.UTC(y, 6, 1)))) });
  }

  // Next best windows for the big life events that fit this age.
  const wanted = [
    ['career', 18, 70], ['house', 22, 75], ['business', 21, 70], ['marriage', 20, 40], ['education', 15, 30], ['child', 22, 42], ['visa', 18, 60],
  ].filter(([id, a, b]) => age >= a - 2 && age <= b && (!minor || topicAllowed(id, profile)) && (!minor || (id === 'education' && profile.band === '13-17'))
    && (!senior || id === 'house')
    // Married (or a spouse profile): never "when will marriage happen".
    && !(id === 'marriage' && maritalStatus === 'married'));
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
    const focus = AREAS.find((a) => a.id === current.focus);
    now.push(T(`Your strongest area now is ${focus.en.toLowerCase()} — put your energy here.`, `இப்போது உங்கள் வலுவான துறை ${focus.ta} — இதில் முழு கவனம் செலுத்துங்கள்.`));
    if (current.careArea) {
      const c = AREAS.find((a) => a.id === current.careArea);
      now.push(T(`Give extra care to ${c.en.toLowerCase()} in this period.`, `இக்காலத்தில் ${c.ta} மீது கூடுதல் கவனம் தேவை.`));
    }
    now.push(T(`Period lord ${current.ad}: ${current.remedy.free.en}`, `புக்தி அதிபதி ${PLANETS[current.ad].ta}: ${current.remedy.free.ta}`));
  }
  if (senior) {
    now.push(T('This stage is for peace, health and family: a yearly full check-up, gentle daily walks and good sleep keep you strong.', 'இது அமைதி, ஆரோக்கியம், குடும்பத்திற்கான பருவம்: ஆண்டுதோறும் முழுப் பரிசோதனை, தினசரி மென்மையான நடை, நல்ல உறக்கம் உங்களைப் பலமாக வைக்கும்.'));
    now.push(T('Keep savings simple and safe, and share your family traditions and stories with the next generation.', 'சேமிப்பை எளிமையாகவும் பாதுகாப்பாகவும் வையுங்கள்; குடும்பப் பாரம்பரியங்களையும் அனுபவங்களையும் அடுத்த தலைமுறைக்குப் பகிருங்கள்.'));
  }
  if (nextGood && !minor && senior) now.push(T(`The ${nextGood.md}–${nextGood.ad} period from ${monthT(nextGood.start).en} suits family functions, temple yatras and home comforts.`, `${monthT(nextGood.start).ta} முதல் ${PLANETS[nextGood.md].ta}–${PLANETS[nextGood.ad].ta} காலம் குடும்ப விழாக்கள், கோவில் யாத்திரை, வீட்டு வசதிகளுக்கு ஏற்றது.`));
  if (nextGood && !minor && !senior) now.push(T(`Plan big moves for the ${nextGood.md}–${nextGood.ad} period starting ${monthT(nextGood.start).en}.`, `பெரிய முடிவுகளை ${PLANETS[nextGood.md].ta}–${PLANETS[nextGood.ad].ta} காலத்திற்குத் (${monthT(nextGood.start).ta} முதல்) திட்டமிடுங்கள்.`));
  if (minor) {
    // A child's "what to do now" is about learning, health and family — never money or big decisions.
    now.length = 0;
    if (current) {
      const focus = AREAS.find((a) => a.id === current.focus);
      now.push(T(`Strongest support now: ${focus.en.toLowerCase()} — encourage it with time and praise.`, `இப்போது வலுவான ஆதரவு: ${focus.ta} — நேரமும் பாராட்டும் தந்து ஊக்குவியுங்கள்.`));
      now.push(T(`Simple practice for the ${current.ad} period: ${current.remedy.free.en}`, `${pAdj(current.ad)} புக்திக்கு எளிய வழிபாடு: ${current.remedy.free.ta}`));
    }
    for (const g of stage.goals) now.push(g);
  }
  if (nextCare && !minor && !senior) now.push(T(`Prepare savings and health before ${monthT(nextCare.start).en} (a period needing care).`, `${monthT(nextCare.start).ta}-க்கு முன் சேமிப்பையும் ஆரோக்கியத்தையும் தயார் செய்யுங்கள் (கவனம் தேவைப்படும் காலம்).`));

  return {
    age: profile.age ?? Math.floor(age), minor, senior, horizon: end, horizonYears: years, band: profile.band, areas: AREAS, stage, nextStage, periods, years: yearsOut, milestones, current, nextGood, nextCare, now,
    needsBirthTime: !sig,
    birthTimeNote: sig ? null : T('Birth time unknown — area scores use Moon-based transits only; house-based period readings need a known birth time.', 'பிறந்த நேரம் தெரியவில்லை — சந்திரன் சார்ந்த கோசாரம் மட்டுமே; பாவம் சார்ந்த கால பலன்களுக்குப் பிறந்த நேரம் தேவை.'),
    disclaimerId: 'roadmap.traditional-periods.v1',
    disclaimer: T('Period scores show how your selected tradition reads each Dasa–Bhukti. They are not guarantees, and the wellbeing area is not a medical assessment.',
      'காலப் புள்ளிகள் நீங்கள் தேர்ந்தெடுத்த மரபு ஒவ்வொரு தசா–புக்தியையும் எப்படிப் பார்க்கிறது என்பதைக் காட்டுகின்றன. இவை உறுதிமொழிகள் அல்ல; நலப் பகுதி மருத்துவ மதிப்பீடும் அல்ல.'),
  };
}
