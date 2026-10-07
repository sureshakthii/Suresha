// Deep compatibility for couples (திருமண வாழ்க்கை ஆய்வு) and business partners (வணிகக் கூட்டாளி பொருத்தம்):
// both full birth charts are compared, then a year-by-year timeline is built from the wedding / partnership date
// using both people's Dasa–Bhukti and today's slow-planet transits.
// Wording is neutral and discussion-oriented: no prediction of fights, divorce, death, infidelity or
// infertility, no "unsuitable" verdicts, no combined /100 score, and both charts are treated symmetrically.
// Timelines cover an explicit report horizon from the wedding / partnership date ("first 25 years of marriage") —
// a reading window, never an assumption about anyone's lifespan. For the consent-aware, inclusive matching
// report (first marriage / remarriage, five result cards) see marriage-context.js.
import { planetPositions, RASIS, PLANETS } from './astro.js';
import { matchPorutham, doshams, doshaSamyam } from './porutham.js';
import { grahaStrength, NAVAGRAHA } from './remedies.js';
import { bhavaAnalysis } from './analysis.js';
import { significations, planetScore, predictEvent } from './predict.js';
import { deepMarriageChecks } from './lifecheck.js';

const DAY = 86400000;
const YEAR = 365.25 * DAY;
const houseFrom = (from, to) => ((to - from + 12) % 12) + 1;
const ELEMENT = (r) => ['fire', 'earth', 'air', 'water'][r % 4];
const ELEMENT_OK = { fire: ['fire', 'air'], air: ['air', 'fire'], earth: ['earth', 'water'], water: ['water', 'earth'] };
const FRIENDS = {
  Sun: ['Moon', 'Mars', 'Jupiter'], Moon: ['Sun', 'Mercury'], Mars: ['Sun', 'Moon', 'Jupiter'], Mercury: ['Sun', 'Venus'],
  Jupiter: ['Sun', 'Moon', 'Mars'], Venus: ['Mercury', 'Saturn'], Saturn: ['Mercury', 'Venus'],
};
const ENEMIES = {
  Sun: ['Venus', 'Saturn'], Moon: [], Mars: ['Mercury'], Mercury: ['Moon'], Jupiter: ['Mercury', 'Venus'], Venus: ['Sun', 'Moon'], Saturn: ['Sun', 'Moon', 'Mars'],
};
const T = (en, ta) => ({ en, ta });
const rel = (a, b) => (!a || !b ? 0 : a === b || FRIENDS[a].includes(b) ? 1 : ENEMIES[a].includes(b) ? -1 : 0);
// Bhavas need a known birth time. Without one, house-based areas use a neutral placeholder (score 50, no lord)
// and the report carries needsBirthTime; Moon-based parts are unchanged.
const NEUTRAL_BHAVAS = Array.from({ length: 12 }, (_, i) => ({ house: i + 1, score: 50, lord: null, placeholder: true }));
const bhavasOf = (chart) => (chart.planets.Lagna ? bhavaAnalysis(chart) : NEUTRAL_BHAVAS);
const lagnaLordOf = (P) => (P.Lagna ? RASIS[P.Lagna.rasi].lord : null);
const NEEDS_TIME = T('One or both birth times are unknown — Lagna and house-based areas are neutral placeholders; Moon-based parts are shown.', 'ஒருவர் அல்லது இருவரின் பிறந்த நேரம் தெரியவில்லை — லக்னம், பாவம் சார்ந்த பகுதிகள் நடுநிலை மதிப்பில்; சந்திரன் சார்ந்தவை காட்டப்படுகின்றன.');
const clamp = (x) => Math.max(10, Math.min(98, Math.round(x)));
/** The earlier of a date and the report horizon end. */
const minCap = (d, end) => (end && d > end ? new Date(end) : d);
/** Report horizon of a couple / partnership report: `years` from the start date, with its header label. */
export function reportHorizon(start, years, kind = 'marriage') {
  return {
    years, from: start, to: new Date(start.getTime() + years * YEAR),
    label: kind === 'marriage'
      ? T(`First ${years} years of marriage`, `திருமணத்தின் முதல் ${years} ஆண்டுகள்`)
      : T(`First ${years} years of the partnership`, `கூட்டின் முதல் ${years} ஆண்டுகள்`),
  };
}
export const HORIZON_LINES = {
  timeline: T('Nothing to list inside this report horizon — steady years; keep up the good routines together.', 'இந்த அறிக்கைக் காலத்தில் பட்டியலிட எதுவும் இல்லை — சீரான ஆண்டுகள்; நல்ல பழக்கங்களைச் சேர்ந்து தொடருங்கள்.'),
  windows: T('No strong window inside this report horizon — steady effort brings gradual growth.', 'இந்த அறிக்கைக் காலத்தில் வலுவான காலம் இல்லை — தொடர் முயற்சியால் படிப்படியான வளர்ச்சி.'),
};

/** How strongly one person's planet touches the other's sign (same sign or 7th = full contact, trines = harmony). */
function contact(fromRasi, toRasi) {
  const h = houseFrom(fromRasi, toRasi);
  return h === 1 || h === 7 ? 2 : [5, 9].includes(h) ? 1 : [6, 8].includes(h) ? -1 : 0;
}

/** Mana Porutham — mind-level compatibility in seven areas, each 0–100 with reasons. */
export function manaPorutham(a, b) {
  const A = a.planets, B = b.planets;
  const sa = Object.fromEntries(grahaStrength(A).map((g) => [g.planet, g.score]));
  const sb = Object.fromEntries(grahaStrength(B).map((g) => [g.planet, g.score]));
  const ba = bhavasOf(a), bb = bhavasOf(b);
  const areas = [];
  const area = (id, en, ta, score, reasons) => areas.push({ id, name: T(en, ta), score: clamp(score), reasons });

  // Emotional bond: Moon signs and elements.
  {
    const r = [];
    let s = 60;
    const h = houseFrom(A.Moon.rasi, B.Moon.rasi);
    if ([1, 5, 9, 7].includes(h) || [1, 5, 9, 7].includes(houseFrom(B.Moon.rasi, A.Moon.rasi))) { s += 15; r.push(T('Moon signs support each other — you understand each other\'s feelings', 'சந்திர ராசிகள் ஒன்றுக்கொன்று ஆதரவு — உணர்வுகளைப் புரிந்துகொள்வீர்கள்')); }
    if ([6, 8].includes(h)) { s -= 15; r.push(T('Moon signs 6–8 apart: tradition sees different emotional rhythms — a good topic to talk about', 'ராசிகள் 6–8: மரபுப்படி உணர்வு வேகம் வேறு — பேசிப் புரிந்துகொள்ள நல்ல விஷயம்')); }
    if ([2, 12].includes(h)) { s -= 6; r.push(T('Moon signs 2–12: different priorities at home', 'ராசிகள் 2–12: வீட்டில் முன்னுரிமைகள் வேறு')); }
    if (ELEMENT_OK[ELEMENT(A.Moon.rasi)].includes(ELEMENT(B.Moon.rasi))) { s += 8; r.push(T('Moon elements are in harmony', 'சந்திர தத்துவம் இணக்கமானது')); }
    area('emotional', 'Emotional bond', 'உணர்வுப் பிணைப்பு', s, r);
  }
  // Attraction: Venus–Mars cross contacts.
  {
    const r = [];
    let s = 55 + 8 * (contact(A.Venus.rasi, B.Mars.rasi) + contact(B.Venus.rasi, A.Mars.rasi));
    if (s > 60) r.push(T('Venus and Mars connect across your charts — natural attraction and affection', 'சுக்கிரன்–செவ்வாய் இணைப்பு — இயல்பான ஈர்ப்பு, அன்பு'));
    if (contact(A.Venus.rasi, B.Venus.rasi) > 0) { s += 6; r.push(T('Similar tastes and sense of beauty', 'ஒத்த ரசனை')); }
    area('attraction', 'Love & attraction', 'அன்பு & ஈர்ப்பு', s, r);
  }
  // Communication: Mercury.
  {
    const r = [];
    let s = 58 + 9 * contact(A.Mercury.rasi, B.Mercury.rasi);
    if (ELEMENT_OK[ELEMENT(A.Mercury.rasi)].includes(ELEMENT(B.Mercury.rasi))) { s += 8; r.push(T('You think and talk in a similar way', 'ஒரே மாதிரி யோசிப்பீர்கள், பேசுவீர்கள்')); } else r.push(T('Different ways of talking — listen fully before replying', 'பேசும் விதம் வேறு — முழுதும் கேட்டுப் பின் பதில்'));
    area('communication', 'Communication', 'பேச்சுப் புரிதல்', s, r);
  }
  // Values & family: Lagna lords and Jupiter.
  {
    const r = [];
    const la = lagnaLordOf(A), lb = lagnaLordOf(B);
    let s = 58 + 10 * (rel(la, lb) + rel(lb, la)) / 2;
    if (rel(la, lb) > 0 && rel(lb, la) > 0) r.push(T('Lagna lords are friends — similar values in life', 'லக்னாதிபதிகள் நண்பர்கள் — வாழ்க்கை மதிப்பீடுகள் ஒத்தவை'));
    if (contact(A.Jupiter.rasi, B.Moon.rasi) > 0 || contact(B.Jupiter.rasi, A.Moon.rasi) > 0) { s += 10; r.push(T('Jupiter of one blesses the other\'s Moon — mutual respect and protection', 'ஒருவரின் குரு மற்றவர் சந்திரனை ஆசீர்வதிக்கிறது — பரஸ்பர மரியாதை')); }
    if (contact(A.Saturn.rasi, B.Moon.rasi) === 2 || contact(B.Saturn.rasi, A.Moon.rasi) === 2) { s -= 6; r.push(T('Saturn touches a Moon across the charts — tradition links this with duty; keep time for joy together', 'சனி ஒருவரின் சந்திரனைத் தொடுகிறது — மரபுப்படி பொறுப்புகள்; சேர்ந்து மகிழ நேரம் ஒதுக்கவும்')); }
    area('values', 'Values & family', 'குடும்ப மதிப்புகள்', s, r);
  }
  // Money harmony: 2nd and 11th houses of both.
  {
    const s = (ba[1].score + ba[10].score + bb[1].score + bb[10].score) / 4 + 6 * (rel(ba[1].lord, bb[1].lord));
    area('wealth', 'Wealth together', 'சேர்ந்த செல்வம்', s, [T(`2nd/11th houses: ${Math.round((ba[1].score + ba[10].score) / 2)} and ${Math.round((bb[1].score + bb[10].score) / 2)}`, `2/11-ம் பாவ பலம்: ${Math.round((ba[1].score + ba[10].score) / 2)}, ${Math.round((bb[1].score + bb[10].score) / 2)}`)]);
  }
  // Family hopes: 5th houses and Jupiter — a traditional factor, never a fertility assessment.
  {
    const s = (ba[4].score + bb[4].score) / 2 * 0.6 + (sa.Jupiter + sb.Jupiter) / 2 * 0.4;
    area('children', 'Family hopes (5th house, traditional)', 'குடும்ப எதிர்பார்ப்புகள் (5-ம் பாவம், மரபு)', s, [
      T(`5th houses ${ba[4].score} & ${bb[4].score}; Jupiter ${sa.Jupiter} & ${sb.Jupiter}`, `5-ம் பாவம் ${ba[4].score}, ${bb[4].score}; குரு ${sa.Jupiter}, ${sb.Jupiter}`),
      T('A traditional factor only — not a fertility or health assessment. Talk together about your wishes for children.', 'மரபுக் காரணி மட்டுமே — கருவுறுதல் அல்லது உடல்நல மதிப்பீடு அல்ல. குழந்தைகள் பற்றிய விருப்பங்களைச் சேர்ந்து பேசுங்கள்.'),
    ]);
  }
  // Health / longevity is intentionally not scored: Thunai never judges health or lifespan from charts.
  // Karmic intensity: Rahu/Ketu on the other's Moon or Venus.
  const karmic = ['Rahu', 'Ketu'].some((n) => A[n].rasi === B.Moon.rasi || A[n].rasi === B.Venus.rasi || B[n].rasi === A.Moon.rasi || B[n].rasi === A.Venus.rasi);
  const overall = clamp(areas.reduce((s, x) => s + x.score, 0) / areas.length);
  const needsBirthTime = !A.Lagna || !B.Lagna;
  return { areas, overall, karmic, sa, sb, needsBirthTime, birthTimeNote: needsBirthTime ? NEEDS_TIME : null };
}

const MARRIAGE_Q = { houses: [2, 7, 11], negate: [1, 6, 10], karakas: ['Venus', 'Jupiter'] };
const WEALTH_Q = { houses: [2, 11, 10], negate: [12, 8], karakas: ['Jupiter', 'Venus'] };
const BUSINESS_Q = { houses: [7, 10, 11, 2], negate: [6, 8, 12], karakas: ['Mercury', 'Jupiter'] };

function runningAt(chart, d) {
  const md = chart.dasa.periods.find((p) => d >= p.start && d < p.end);
  const ad = md?.bhuktis.find((b) => d >= b.start && d < b.end);
  return md && ad ? { md: md.lord, ad: ad.lord } : null;
}

/** Slow-planet transits for one person at a date: Ezharai / Ashtama Sani and Guru Balam. */
function transitAt(chart, positions) {
  const sat = houseFrom(chart.planets.Moon.rasi, positions.Saturn.rasi);
  const jup = houseFrom(chart.planets.Moon.rasi, positions.Jupiter.rasi);
  return { sat, jup, sadeSati: [12, 1, 2].includes(sat), ashtama: sat === 8, guruBalam: [2, 5, 7, 9, 11].includes(jup) };
}

/** Year-by-year timeline for two people from a start date (ends at the report horizon, `cap`). */
function timeline(a, b, start, years, focusQ, names, cap = null) {
  const sigA = significations(a), sigB = significations(b);
  const rows = [];
  for (let i = 0; i < years; i++) {
    const s = new Date(start.getTime() + i * YEAR);
    if (cap && s >= cap) break;
    const mid = new Date(s.getTime() + YEAR / 2);
    const pos = planetPositions(mid).planets;
    const ra = runningAt(a, mid), rb = runningAt(b, mid);
    if (!ra || !rb) break;
    const sc = (sig, r, q) => planetScore(sig, r.md, q) * 0.4 + planetScore(sig, r.ad, q) * 0.6;
    const hA = sc(sigA, ra, focusQ), hB = sc(sigB, rb, focusQ);
    const wA = sc(sigA, ra, WEALTH_Q), wB = sc(sigB, rb, WEALTH_Q);
    const tA = transitAt(a, pos), tB = transitAt(b, pos);
    let score = 50 + 3 * (Math.max(-3, Math.min(4, hA)) + Math.max(-3, Math.min(4, hB)));
    const themes = [];
    for (const [t, n] of [[tA, names[0]], [tB, names[1]]]) {
      if (t.sadeSati) { score -= 6; themes.push({ kind: 'care', ...T(`Ezharai Sani for ${n.en} — share responsibilities`, `${n.ta} அவர்களுக்கு ஏழரைச் சனி — பொறுப்புகளைப் பகிருங்கள்`) }); }
      if (t.ashtama) { score -= 8; themes.push({ kind: 'care', ...T(`Ashtama Sani for ${n.en} — go slow on big risks`, `${n.ta} அவர்களுக்கு அஷ்டமச் சனி — பெரிய அபாயங்களில் நிதானம்`) }); }
      if (t.guruBalam) score += 3;
    }
    if (tA.guruBalam && tB.guruBalam) themes.push({ kind: 'good', ...T('Guru Balam for both — blessings for family events', 'இருவருக்கும் குரு பலம் — குடும்ப நிகழ்வுகளுக்கு ஆசி') });
    if (hA < 0 && hB < 0) { score -= 6; themes.push({ kind: 'care', ...T('Tradition sees busy periods for both — plan time together and make decisions calmly', 'மரபுப்படி இருவருக்கும் பரபரப்பான காலம் — சேர்ந்து நேரம் ஒதுக்கி, முடிவுகளை நிதானமாக எடுங்கள்') }); }
    if (hA > 2 && hB > 2) themes.push({ kind: 'good', ...T('Tradition sees a supportive year for planning together', 'மரபுப்படி சேர்ந்து திட்டமிட ஆதரவான ஆண்டு') });
    if (wA + wB > 4) { score += 4; themes.push({ kind: 'good', ...T('Tradition sees a supportive time for saving together', 'மரபுப்படி சேர்ந்து சேமிக்க ஆதரவான காலம்') }); }
    if (wA + wB < -2) themes.push({ kind: 'care', ...T('Control expenses and avoid lending', 'செலவைக் கட்டுப்படுத்தி, கடன் கொடுப்பதைத் தவிர்க்கவும்') });
    score = clamp(score);
    rows.push({ year: s.getUTCFullYear(), from: s, to: minCap(new Date(s.getTime() + YEAR), cap), score, level: score >= 66 ? 'good' : score >= 48 ? 'steady' : 'care', a: ra, b: rb, themes, wealth: Math.round((wA + wB) * 10) / 10 });
  }
  return rows;
}

/** Overlap of two lists of windows (from predictEvent) — when both charts agree. */
function agree(wa, wb) {
  const out = [];
  for (const x of wa) for (const y of wb) {
    const s = Math.max(x.peakFrom, y.peakFrom), e = Math.min(x.peakTo, y.peakTo);
    if (e - s > 60 * DAY) out.push({ from: new Date(s), to: new Date(e) });
  }
  return out.sort((p, q) => p.from - q.from);
}

/**
 * Full marriage report. bride / groom: birth charts (birthChart output). weddingDate: Date (planned or actual).
 */
export function marriageReport(bride, groom, { weddingDate = new Date(), years = 25, names } = {}) {
  const nm = names || [T(bride.name, bride.name), T(groom.name, groom.name)];
  const porutham = matchPorutham({ star: bride.janmaNakshatra.index, rasi: bride.janmaRasi.index }, { star: groom.janmaNakshatra.index, rasi: groom.janmaRasi.index });
  const dB = doshams(bride.planets, { stability: bride.stability }), dG = doshams(groom.planets, { stability: groom.stability });
  const samyam = doshaSamyam(dB, dG);
  const mana = manaPorutham(bride, groom);
  // Report horizon: the first `years` years of marriage from the wedding date (a reading window, not a lifespan).
  const horizon = reportHorizon(weddingDate, years, 'marriage');
  const cap = horizon.to;
  const rows = timeline(bride, groom, weddingDate, years, MARRIAGE_Q, nm, cap);
  // No children / fertility timing is computed for a couple (owner checklist §6.4).
  const houseA = predictEvent(bride, 'house', { from: weddingDate, years: 20, until: cap });
  const houseB = predictEvent(groom, 'house', { from: weddingDate, years: 20, until: cap });
  const home = agree(houseA.windows, houseB.windows);
  const careYears = rows.filter((r) => r.level === 'care');
  const goodYears = rows.filter((r) => r.level === 'good');
  const deep = neutralDeepChecks(deepMarriageChecks(bride, groom, weddingDate));
  // No combined score and no verdict: the poruthams, the mana areas and the deep checks are shown separately.
  const strengths = mana.areas.filter((x) => x.score >= 66).map((x) => x.name);
  const challenges = mana.areas.filter((x) => x.score < 50).map((x) => x.name);
  const remedies = [
    T('Visit Thirumanancheri or your Kula Deivam together after the wedding.', 'திருமணத்திற்குப் பின் திருமணஞ்சேரி அல்லது குலதெய்வக் கோவிலுக்கு சேர்ந்து செல்லுங்கள்.'),
    T('Light a lamp together every Friday evening for Mahalakshmi — for harmony and prosperity.', 'ஒவ்வொரு வெள்ளி மாலையும் சேர்ந்து மகாலட்சுமிக்கு தீபம் — ஒற்றுமைக்கும் செல்வத்திற்கும்.'),
    ...(careYears.length ? [T('In care years: daily 10 minutes of talking without phones, and joint decisions only after a night\'s sleep.', 'கவனக் காலங்களில்: தினமும் 10 நிமிடம் கைப்பேசி இல்லாமல் பேசுங்கள்; பெரிய முடிவுகளை ஒரு இரவு கழித்து எடுங்கள்.')] : []),
    ...(!dB.chevvai.present !== !dG.chevvai.present ? [T('Optional, if your tradition suggests it: Murugan worship together on Tuesdays.', 'விருப்பமெனில், உங்கள் மரபு சொன்னால்: செவ்வாய்தோறும் சேர்ந்து முருகன் வழிபாடு.')] : []),
  ];
  if (!deep.papaOk) remedies.push(T('Optional: a Navagraha prayer together before the wedding.', 'விருப்பமெனில்: திருமணத்திற்கு முன் சேர்ந்து நவகிரக வழிபாடு.'));
  const moments = keyMoments({ weddingDate, cap, rows, home, houseA, houseB });
  const lagnaUnknown = [bride, groom].map((c) => c.lagna === null || !c.planets.Lagna);
  return {
    porutham, doshams: { bride: dB, groom: dG }, samyam, mana, deep, strengths, challenges, timeline: rows, home, careYears, goodYears, moments,
    horizon: cap, reportHorizon: horizon,
    remedies: remedies.map((r) => ({ ...r, optional: true })),
    noVerdict: true, noCombinedScore: true,
    needsBirthTime: mana.needsBirthTime || lagnaUnknown.some(Boolean),
    lagnaUnknown,
    birthTimeNote: mana.birthTimeNote || (lagnaUnknown.some(Boolean) ? NEEDS_TIME : null),
    summaryNote: T('A traditional reading to support your family conversation — the decision is yours.', 'குடும்பக் கலந்துரையாடலுக்கு உதவும் மரபு வாசிப்பு — முடிவு உங்களுடையது.'),
  };
}

const MONTH = 30.44 * DAY;
const monthStart = (d) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
/** A { from, to } range of whole months (to ≥ from + 1 month), kept inside the horizon. */
function monthRange(from, to, cap) {
  const f = monthStart(new Date(from));
  let t = minCap(new Date(to), cap);
  if (t - f < MONTH) t = minCap(new Date(f.getTime() + 2 * MONTH), cap);
  return { from: f, to: t };
}
/** First window (earliest start) from a list of predictEvent windows, as a month range. */
const firstWindow = (ws, cap) => {
  const w = [...ws].filter((x) => x && x.peakTo > x.peakFrom).sort((p, q) => p.peakFrom - q.peakFrom)[0];
  return w ? monthRange(w.peakFrom, w.peakTo, cap) : null;
};
/** Consecutive timeline rows that pass `test`, merged into ranges [{ from, to, years:[y…] }]. */
function rowRanges(rows, test) {
  const out = [];
  for (const r of rows) {
    const last = out[out.length - 1];
    if (!test(r)) continue;
    if (last && last.lastYear === r.year - 1) { last.to = r.to; last.lastYear = r.year; last.years.push(r.year); } else out.push({ from: r.from, to: r.to, lastYear: r.year, years: [r.year] });
  }
  return out.map(({ lastYear: _l, ...x }) => x);
}

/**
 * Key moments of married life — one consistent row each: a favourable month range (start–end) for the couple, from both
 * charts' Dasa–Bhukti and Jupiter/Saturn transits, never past the report horizon. When no range appears in the next
 * 20 years, the nearest supportive window of either chart is used, else a gentle line (never a bare dash).
 * There is no children / santhana row: family planning is a conversation for the couple, not a chart timing.
 */
function keyMoments({ weddingDate, cap, rows, home, houseA, houseB }) {
  const limit = minCap(new Date(weddingDate.getTime() + 20 * YEAR), cap);
  const inLimit = (r) => r && r.from < limit;
  const out = [];
  const row = (id, icon, label, range, line, extra = {}) => out.push({ id, icon, label, kind: range ? 'range' : 'line', from: range?.from || null, to: range?.to || null, line: range ? null : line, ...extra });

  {
    const both = home[0] ? monthRange(home[0].from, home[0].to, cap) : null;
    const good = rows.find((r) => r.level === 'good');
    const near = both || firstWindow([...houseA.windows, ...houseB.windows], cap) || (good ? monthRange(good.from, good.to, cap) : null);
    row('home', '🏡', T('Own home together', 'சொந்த வீடு'), inLimit(near) ? near : null, HORIZON_LINES.windows, { agreed: !!both });
  }
  {
    const ranges = rowRanges(rows, (r) => r.wealth > 4);
    const best = [...rows].filter((r) => r.wealth > 0).sort((p, q) => q.wealth - p.wealth || p.from - q.from)[0];
    const near = ranges[0] ? monthRange(ranges[0].from, ranges[0].to, cap) : best ? monthRange(best.from, best.to, cap) : null;
    row('wealth', '💰', T('Wealth growth period', 'செல்வ வளர்ச்சிக் காலம்'), inLimit(near) ? near : null,
      T('Steady effort brings gradual growth — save a little every month together.', 'தொடர் முயற்சியால் படிப்படியான வளர்ச்சி — மாதந்தோறும் சேர்ந்து சிறிது சேமியுங்கள்.'), { agreed: !!ranges[0] });
  }
  {
    const care = rowRanges(rows, (r) => r.level === 'care').filter((r) => r.from < limit).map((r) => ({ from: r.from, to: r.to, years: r.years }));
    out.push({ id: 'care', icon: '🤍', label: T('Years needing extra care', 'கூடுதல் கவனம் தேவைப்படும் ஆண்டுகள்'), kind: care.length ? 'years' : 'line', ranges: care,
      line: care.length ? T('Plan together calmly and keep time for each other in these years.', 'இந்த ஆண்டுகளில் நிதானமாகச் சேர்ந்து திட்டமிட்டு, ஒருவருக்கொருவர் நேரம் ஒதுக்குங்கள்.')
        : T('Steady years — keep up the good routines together.', 'சீரான ஆண்டுகள் — நல்ல பழக்கங்களைச் சேர்ந்து தொடருங்கள்.'),
      from: null, to: null });
  }
  return out;
}

/**
 * Remove lifespan (ayul) checks and gender-weighted rules from lifecheck's deep checks, keeping the shape.
 * Papa samyam is compared symmetrically (either side may carry more).
 */
function neutralDeepChecks(d) {
  const diff = Math.abs(d.papa.groom.total - d.papa.bride.total);
  const papaOk = diff <= 1.5;
  // Lagna porutham is shown as a note without its 0–100 number (no score shown in matching).
  const lagnaNote = (c) => ({ ...c, note: T(d.lagna.reasons.map((r) => r.en).join('; ') || c.note.en, d.lagna.reasons.map((r) => r.ta).join('; ') || c.note.ta) });
  const checks = d.checks.filter((c) => c.id !== 'ayul').map((c) => (c.id === 'lagna' ? lagnaNote(c) : c)).map((c) => (c.id !== 'papa' ? c : {
    ...c, ok: papaOk, ruleStatus: 'proposed',
    note: papaOk
      ? T(`Balanced — ${d.papa.bride.total} and ${d.papa.groom.total} points.`, `சமநிலை — ${d.papa.bride.total}, ${d.papa.groom.total} புள்ளிகள்.`)
      : T(`Points differ (${d.papa.bride.total} and ${d.papa.groom.total}) — a gentle Navagraha prayer together keeps the balance.`, `புள்ளிகள் வேறுபடுகின்றன (${d.papa.bride.total}, ${d.papa.groom.total}) — சேர்ந்து செய்யும் நவகிரக வழிபாடு சமநிலையைத் தரும்.`),
  }));
  const houseAvg = d.houses.bride.reduce((s, b, i) => s + (b.score + d.houses.groom[i].score) / 2, 0) / Math.max(1, d.houses.bride.length);
  const complete = !d.needsBirthTime?.length;
  const score = complete ? Math.round((d.lagna.score * 0.15 + (papaOk ? 80 : 45) * 0.15 + (d.sandhi.ok ? 80 : 55) * 0.1 + houseAvg * 0.35) / 0.75) : d.score;
  const { ayul: _removed, ...rest } = d; // longevity is never part of matching
  return { ...rest, papaOk, checks, passed: checks.filter((c) => c.ok).length, score };
}

const ROLE_FIELDS = [
  { id: 'lead', en: 'Leadership & vision (face of the company)', ta: 'தலைமை & தொலைநோக்கு (நிறுவன முகம்)', planets: ['Sun', 'Jupiter'], houses: [1, 10] },
  { id: 'finance', en: 'Finance & accounts', ta: 'நிதி & கணக்கு', planets: ['Jupiter', 'Mercury'], houses: [2, 11] },
  { id: 'sales', en: 'Sales, marketing & clients', ta: 'விற்பனை, சந்தைப்படுத்தல், வாடிக்கையாளர்', planets: ['Mercury', 'Venus', 'Moon'], houses: [3, 7] },
  { id: 'ops', en: 'Operations, team & delivery', ta: 'செயல்பாடு, குழு, விநியோகம்', planets: ['Saturn', 'Mars'], houses: [6, 10] },
  { id: 'tech', en: 'Technology & product', ta: 'தொழில்நுட்பம் & தயாரிப்பு', planets: ['Mercury', 'Rahu', 'Mars'], houses: [3, 5] },
];

/** Business partnership report for two partners (optionally with the company's founding chart). */
export function partnershipReport(a, b, { startDate = new Date(), years = 15, company = null, names } = {}) {
  const nm = names || [T(a.name, a.name), T(b.name, b.name)];
  const A = a.planets, B = b.planets;
  const sa = Object.fromEntries(grahaStrength(A).map((g) => [g.planet, g.score]));
  const sb = Object.fromEntries(grahaStrength(B).map((g) => [g.planet, g.score]));
  const ba = bhavasOf(a), bb = bhavasOf(b);
  const areas = [];
  const area = (id, en, ta, score, reasons) => areas.push({ id, name: T(en, ta), score: clamp(score), reasons });
  const moonH = houseFrom(A.Moon.rasi, B.Moon.rasi);
  area('trust', 'Trust & temperament', 'நம்பிக்கை & சுபாவம்', 60 + ([1, 5, 9, 3, 11].includes(moonH) ? 14 : [6, 8].includes(moonH) ? -16 : [2, 12].includes(moonH) ? -6 : 4),
    [[6, 8].includes(moonH) ? T('Moon signs 6–8: tradition sees different working styles — agree roles and write every agreement down', 'ராசிகள் 6–8: மரபுப்படி வேலை முறை வேறு — பொறுப்புகளைப் பேசி, ஒவ்வொரு ஒப்பந்தத்தையும் எழுத்தில் வைக்கவும்') : T('Temperaments suit each other in this tradition', 'இந்த மரபில் சுபாவங்கள் பொருந்துகின்றன')]);
  area('communication', 'Communication & negotiation', 'பேச்சு & பேரம்', 58 + 9 * contact(A.Mercury.rasi, B.Mercury.rasi) + (sa.Mercury + sb.Mercury - 110) / 6,
    [T(`Mercury strength ${sa.Mercury} & ${sb.Mercury}`, `புதன் பலம் ${sa.Mercury}, ${sb.Mercury}`)]);
  area('goals', 'Shared goals & values', 'பொது இலக்குகள்', 58 + 10 * (rel(lagnaLordOf(A), lagnaLordOf(B)) + rel(lagnaLordOf(B), lagnaLordOf(A))) / 2,
    [T('Based on the friendship of your Lagna lords', 'லக்னாதிபதிகளின் நட்பு அடிப்படையில்')]);
  area('wealth', 'Combined money luck', 'கூட்டுப் பணப் பலம்', (ba[1].score + ba[10].score + bb[1].score + bb[10].score) / 4 + (sa.Jupiter + sb.Jupiter - 110) / 8,
    [T('2nd and 11th houses and Jupiter of both partners', 'இருவரின் 2, 11-ம் பாவம், குரு')]);
  area('partnership', 'Partnership luck (7th house)', 'கூட்டு பாக்கியம் (7-ம் பாவம்)', (ba[6].score + bb[6].score) / 2 + (rel(ba[6].lord, bb[6].lord) * 6),
    [T(`7th house strength ${ba[6].score} & ${bb[6].score}`, `7-ம் பாவ பலம் ${ba[6].score}, ${bb[6].score}`)]);
  // No chart-derived suspicion of a partner: transparency is recommended for every partnership (see guidance).
  // No combined score: each area is shown on its own; the summary counts the areas tradition sees as supportive.
  const supportive = areas.filter((x) => x.score >= 60).length;
  const summary = T(`${supportive} of ${areas.length} traditional areas look supportive. Each area is shown on its own — written agreements and clear roles matter in every partnership.`,
    `${areas.length} மரபுப் பகுதிகளில் ${supportive} ஆதரவாக உள்ளன. ஒவ்வொரு பகுதியும் தனியாகக் காட்டப்படுகிறது — எல்லாக் கூட்டுக்கும் எழுத்து ஒப்பந்தமும் தெளிவான பொறுப்புகளும் முக்கியம்.`);
  const roleScore = (s, bh, f) => f.planets.reduce((x, k) => x + s[k], 0) / f.planets.length * 0.6 + f.houses.reduce((x, h) => x + bh[h - 1].score, 0) / f.houses.length * 0.4;
  const roles = ROLE_FIELDS.map((f) => {
    const x = roleScore(sa, ba, f), y = roleScore(sb, bb, f);
    return { ...f, a: Math.round(x), b: Math.round(y), best: Math.abs(x - y) < 3 ? 'both' : x > y ? 'a' : 'b' };
  });
  const horizon = reportHorizon(startDate, years, 'partnership');
  const cap = horizon.to;
  const rows = timeline(a, b, startDate, years, BUSINESS_Q, nm, cap);
  const bizA = predictEvent(a, 'business', { from: startDate, years, until: cap }), bizB = predictEvent(b, 'business', { from: startDate, years, until: cap });
  const growth = agree(bizA.windows, bizB.windows);
  let companyNote = null;
  if (company) {
    const bc = bhavasOf(company);
    companyNote = { tenth: bc[9].score, eleventh: bc[10].score, moonFitA: houseFrom(company.planets.Moon.rasi, A.Moon.rasi), moonFitB: houseFrom(company.planets.Moon.rasi, B.Moon.rasi) };
  }
  const guidance = [
    T('Sign a written partnership deed: capital, profit share, roles, exit terms and dispute resolution.', 'எழுத்துப்பூர்வ கூட்டு ஒப்பந்தம்: முதலீடு, லாபப் பங்கு, பொறுப்புகள், விலகல் விதிகள், பிரச்சினைத் தீர்வு.'),
    T('Keep one shared account, monthly reviews and an external auditor — good practice for every partnership.', 'ஒரே கூட்டுக் கணக்கு, மாதாந்திர ஆய்வு, வெளித் தணிக்கையாளர் — எல்லாக் கூட்டுக்கும் நல்ல நடைமுறை.'),
    T('Optional: sign in a Mercury or Jupiter Horai if it fits your real deadline — never delay a needed signature for it.', 'விருப்பமெனில்: உண்மையான காலக்கெடுவுக்கு ஏற்றால் புதன் அல்லது குரு ஓரையில் கையெழுத்திடுங்கள் — அதற்காகத் தேவையான கையெழுத்தைத் தாமதப்படுத்த வேண்டாம்.'),
    ...(rows.some((r) => r.level === 'care') ? [T('In care years avoid big loans and expansion; protect cash flow.', 'கவனக் காலங்களில் பெரிய கடன், விரிவாக்கம் தவிர்த்து பணப்புழக்கத்தைப் பாதுகாக்கவும்.')] : []),
    T('Pray to Lord Vinayagar and Mahalakshmi before opening the business each day.', 'தினமும் தொழில் தொடங்கும் முன் விநாயகர், மகாலட்சுமி வழிபாடு.'),
  ];
  return { areas, supportive, summary, noCombinedScore: true, roles, timeline: rows, growth, horizon: cap, reportHorizon: horizon, companyNote, guidance, deception: false, remedyPlanets: ['Mercury', 'Jupiter'].map((k) => ({ planet: k, ...NAVAGRAHA[k] })) };
}

export { PLANETS };
