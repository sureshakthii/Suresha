// Ask Thunai — chart-specific answers to WHICH questions ("which profession suits my chart?", "which business",
// "abroad or here", "how will my partner be", "which course", "which day / colour / number", "which god", "which gem").
// Every option named comes from THIS chart, with the reason in plain words — never a generic list.
//
// Career mapping (traditional table — Saravali / Phaladeepika style karakatva of the planets, as family jothidars use it):
//   Sun     → government, administration, medicine, leadership
//   Moon    → hospitality & food, nursing & care, travel, public dealing
//   Mars    → engineering & construction, police / defence, real estate, surgery, sports
//   Mercury → accounts, IT & software, writing & media, trade, teaching
//   Jupiter → teaching, law, finance & banking, advisory, temple / spiritual service
//   Venus   → arts & film, fashion & textiles, hospitality, vehicles, finance
//   Saturn  → manufacturing, mining & oil, the service sector, long-term government service
//   Rahu    → foreign / multinational companies, new technology, aviation, chemicals
//   Ketu    → research, spirituality, coding & data, Siddha / Ayurveda
// The planets read: the 10th lord (and the house it sits in), planets in the 10th, the dispositor of the 10th lord,
// the Dasamsa (D10) 10th lord and occupants when the birth time is exact, the two strongest planets (shared/remedies.js
// grahaStrength) and the Lagna lord. The house the planet sits in orders its fields (2nd → finance / accounts,
// 12th → foreign, 6th → service / medicine …) and the element of the 10th sign adds a flavour (fire → leadership,
// earth → finance / practical, air → communication / tech, water → care / research).
import { RASIS, PLANETS } from './astro.js';
import { grahaStrength, NAVAGRAHA, remedyFor } from './remedies.js';
import { vargaRasi } from './varga.js';
import { runningDasa } from './daily.js';
import { luckyNumbers, ishtaTheivam, gemstones, PLANET_DEITY, STAR_DEITY, PLANET_COLOR } from './personal.js';
import { isHinduFaith, universalPractice, faithBlessing } from './faith.js';

const T = (en, ta) => ({ en, ta });
const ta = (k) => PLANETS[k]?.ta || k;
const ordEn = (n) => `${n}${n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th'}`;
const hOf = (from, rasi) => ((rasi - from + 12) % 12) + 1;
const lordOf = (from, h) => RASIS[(from + h - 1) % 12].lord;
const MONTHS_TA = ['ஜனவரி', 'பிப்ரவரி', 'மார்ச்', 'ஏப்ரல்', 'மே', 'ஜூன்', 'ஜூலை', 'ஆகஸ்ட்', 'செப்டம்பர்', 'அக்டோபர்', 'நவம்பர்', 'டிசம்பர்'];
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const my = (d, lang) => `${(lang === 'ta' ? MONTHS_TA : MONTHS_EN)[new Date(d).getUTCMonth()]} ${new Date(d).getUTCFullYear()}`;
const pick = (o, lang) => (o ? (lang === 'ta' ? o.ta : o.en) : '');
const SEVEN = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
const WEEKDAY = { Sun: T('Sunday', 'ஞாயிறு'), Moon: T('Monday', 'திங்கள்'), Mars: T('Tuesday', 'செவ்வாய்'), Mercury: T('Wednesday', 'புதன்'), Jupiter: T('Thursday', 'வியாழன்'), Venus: T('Friday', 'வெள்ளி'), Saturn: T('Saturday', 'சனி') };

// ------------------------------------------------------------------ the field catalogue (documented table above)
export const FIELDS = {
  govt: T('Government service & administration', 'அரசுப் பணி & நிர்வாகம்'),
  medicine: T('Medicine & healthcare', 'மருத்துவம் & சுகாதாரம்'),
  leadership: T('Management & leadership roles', 'மேலாண்மை & தலைமைப் பொறுப்பு'),
  hospitality: T('Hotels, food & hospitality', 'ஹோட்டல், உணவு & விருந்தோம்பல்'),
  nursing: T('Nursing & care work', 'செவிலியர் & பராமரிப்புப் பணி'),
  travel: T('Travel, tourism & transport', 'பயணம், சுற்றுலா & போக்குவரத்து'),
  public: T('Public dealing, sales & customer service', 'மக்கள் தொடர்பு, விற்பனை & வாடிக்கையாளர் சேவை'),
  engineering: T('Engineering & construction', 'பொறியியல் & கட்டுமானம்'),
  police: T('Police, defence & security', 'காவல், ராணுவம் & பாதுகாப்பு'),
  realestate: T('Real estate & land', 'ரியல் எஸ்டேட் & நிலம்'),
  surgery: T('Surgery & emergency care', 'அறுவை சிகிச்சை & அவசர மருத்துவம்'),
  sports: T('Sports & fitness', 'விளையாட்டு & உடற்பயிற்சி'),
  accounts: T('Accounts & audit', 'கணக்கியல் & தணிக்கை'),
  it: T('IT & software', 'IT & மென்பொருள்'),
  writing: T('Writing, media & communication', 'எழுத்து, ஊடகம் & தகவல்தொடர்பு'),
  trade: T('Trade & commerce', 'வணிகம் & வர்த்தகம்'),
  teaching: T('Teaching & training', 'கற்பித்தல் & பயிற்சி'),
  law: T('Law & judiciary', 'சட்டம் & நீதித்துறை'),
  finance: T('Finance & banking', 'நிதி & வங்கி'),
  advisory: T('Advisory & consulting', 'ஆலோசனைப் பணி'),
  priesthood: T('Temple & spiritual service', 'கோவில் / ஆன்மீகப் பணி'),
  arts: T('Arts, music & film', 'கலை, இசை & திரைத்துறை'),
  fashion: T('Fashion, textiles & beauty', 'ஆடை, ஜவுளி & அழகுக்கலை'),
  vehicles: T('Vehicles & automobiles', 'வாகனம் & ஆட்டோமொபைல்'),
  manufacturing: T('Manufacturing & factories', 'உற்பத்தி & தொழிற்சாலை'),
  mining: T('Mining, oil & metals', 'சுரங்கம், எண்ணெய் & உலோகம்'),
  service: T('Service sector & operations', 'சேவைத் துறை & செயல்பாடு'),
  foreign: T('Foreign / multinational companies', 'வெளிநாட்டு / பன்னாட்டு நிறுவனங்கள்'),
  tech: T('New technology & electronics', 'புதிய தொழில்நுட்பம் & மின்னணு'),
  aviation: T('Aviation & logistics', 'விமானத் துறை & சரக்குப் போக்குவரத்து'),
  chemicals: T('Chemicals & pharma', 'ரசாயனம் & மருந்துத் தொழில்'),
  research: T('Research & analysis', 'ஆராய்ச்சி & பகுப்பாய்வு'),
  spiritual: T('Spirituality & counselling', 'ஆன்மீகம் & ஆலோசனை'),
  coding: T('Coding & data', 'கோடிங் & தரவு'),
  altmed: T('Siddha / Ayurveda & alternative healing', 'சித்தா / ஆயுர்வேதம் & மாற்று மருத்துவம்'),
};
export const PLANET_FIELDS = {
  Sun: ['govt', 'medicine', 'leadership'],
  Moon: ['hospitality', 'nursing', 'travel', 'public'],
  Mars: ['engineering', 'police', 'realestate', 'surgery', 'sports'],
  Mercury: ['accounts', 'it', 'writing', 'trade', 'teaching'],
  Jupiter: ['teaching', 'law', 'finance', 'advisory', 'priesthood'],
  Venus: ['arts', 'fashion', 'hospitality', 'vehicles', 'finance'],
  Saturn: ['manufacturing', 'mining', 'service', 'govt'],
  Rahu: ['foreign', 'tech', 'aviation', 'chemicals'],
  Ketu: ['research', 'spiritual', 'coding', 'altmed'],
};
// The house a planet sits in: which of its fields come first.
const HOUSE_FLAVOUR = {
  1: ['leadership', 'sports', 'arts', 'public'], 2: ['finance', 'accounts', 'trade', 'teaching', 'hospitality'], 3: ['writing', 'public', 'it', 'sports', 'travel'],
  4: ['realestate', 'vehicles', 'teaching', 'hospitality', 'engineering'], 5: ['teaching', 'advisory', 'arts', 'finance'], 6: ['medicine', 'law', 'service', 'police', 'nursing', 'surgery'],
  7: ['trade', 'public', 'law', 'fashion'], 8: ['research', 'chemicals', 'mining', 'altmed', 'surgery'], 9: ['teaching', 'law', 'priesthood', 'foreign', 'advisory'],
  10: ['govt', 'leadership', 'engineering', 'manufacturing'], 11: ['finance', 'trade', 'it', 'foreign', 'tech'], 12: ['foreign', 'aviation', 'medicine', 'spiritual', 'hospitality', 'travel'],
};
const HOUSE_NOTE = {
  1: T(' (self — your own personality)', ' (லக்னம் — உங்கள் தனித்தன்மை)'), 2: T(' (income, speech)', ' (வருமானம், பேச்சு)'), 3: T(' (effort, communication)', ' (முயற்சி, தொடர்பு)'),
  4: T(' (home, land, vehicles)', ' (வீடு, நிலம், வாகனம்)'), 5: T(' (intellect, creativity)', ' (அறிவு, படைப்பு)'), 6: T(' (service, competition)', ' (சேவை, போட்டி)'),
  7: T(' (trade, partners, the public)', ' (வணிகம், கூட்டாளி, மக்கள்)'), 8: T(' (research, hidden things)', ' (ஆராய்ச்சி, மறைபொருள்)'), 9: T(' (higher learning, fortune)', ' (உயர்கல்வி, பாக்கியம்)'),
  10: T(' (its own house — a firm career position)', ' (சொந்த வீடு — உறுதியான தொழில் நிலை)'), 11: T(' (gains, large organisations)', ' (லாபம், பெரிய நிறுவனம்)'), 12: T(' (foreign lands, distant places)', ' (வெளிநாடு, தொலைதூரம்)'),
};
// Element of a sign (index % 4): 0 fire, 1 earth, 2 air, 3 water.
const ELEMENT = [T('fire', 'நெருப்பு'), T('earth', 'நிலம்'), T('air', 'காற்று'), T('water', 'நீர்')];
const ELEMENT_FIELDS = [['leadership', 'govt', 'police', 'sports'], ['finance', 'accounts', 'manufacturing', 'realestate'], ['it', 'writing', 'trade', 'law'], ['nursing', 'hospitality', 'research', 'travel']];
const ELEMENT_NATURE = [
  T('work where you lead, decide and act', 'முன்னின்று நடத்தி முடிவெடுக்கும் பணிகள்'),
  T('steady, practical, well-organised work', 'நிலையான, நடைமுறை, ஒழுங்கான பணிகள்'),
  T('work with ideas, words, people and networks', 'யோசனை, பேச்சு, எழுத்து, மக்கள் தொடர்பு சார்ந்த பணிகள்'),
  T('caring, feeling and deep-thinking work', 'பராமரிப்பு, உணர்வு, ஆழ்ந்த சிந்தனை சார்ந்த பணிகள்'),
];

function base(chart, rel) {
  const P = chart.planets;
  const useLagna = Boolean(P.Lagna) && rel?.lagna !== false;
  const from = useLagna ? P.Lagna.rasi : P.Moon.rasi;
  const planets = useLagna ? P : Object.fromEntries(Object.entries(P).filter(([k]) => k !== 'Lagna'));
  const st = Object.fromEntries(grahaStrength(planets).map((g) => [g.planet, g]));
  const occ = (h) => Object.keys(P).filter((k) => k !== 'Lagna' && hOf(from, P[k].rasi) === h);
  return { P, useLagna, from, st, occ, house: (k) => hOf(from, P[k].rasi), exact: useLagna && (rel?.certainty || 'exact') === 'exact' && rel?.vargas !== false };
}
const refWord = (b) => (b.useLagna ? T('Lagna', 'லக்னம்') : T('Moon sign (birth time not exact)', 'சந்திர ராசி'));
// "from your Lagna" / "லக்னப்படி" — the reference the houses are counted from.
const refBy = (b) => (b.useLagna ? T('from your Lagna', 'லக்னப்படி') : T('from your Moon sign (birth time not exact)', 'சந்திர ராசிப்படி (பிறந்த நேரம் துல்லியமில்லை)'));

// ------------------------------------------------------------------ career / profession
/**
 * Which fields suit this chart: { groups: [{ planet, fields, reasons }], jobBusiness, dasaFit, tenth, d10, nature }.
 * opts: rel (shared/birthtime.js), now, minor (study wording only).
 */
export function careerReading(chart, { rel = null, now = new Date(), minor = false } = {}) {
  const b = base(chart, rel);
  const { P, from, st } = b;
  const tenthSign = (from + 9) % 12;
  const tLord = RASIS[tenthSign].lord;
  const tLordH = b.house(tLord);
  const dispositor = RASIS[P[tLord].rasi].lord;
  const occupants = b.occ(10);
  const lagnaLord = lordOf(from, 1);
  const note = (h) => (minor ? T('', '') : HOUSE_NOTE[h]);
  const cand = {};
  const add = (p, w, reason) => { cand[p] ||= { w: 0, reasons: [] }; cand[p].w += w; if (reason) cand[p].reasons.push(reason); };
  add(tLord, 5, T(`10th lord ${tLord} sits in the ${ordEn(tLordH)} house${note(tLordH).en}`, `10-ம் அதிபதி ${ta(tLord)} ${tLordH}-ம் வீட்டில்${note(tLordH).ta}`));
  for (const o of occupants) add(o, 4, o === tLord ? null : T(`${o} sits in your 10th house`, `${ta(o)} 10-ம் வீட்டிலேயே${minor ? '' : ' (தொழில் ஸ்தானம்)'}`));
  if (dispositor !== tLord) add(dispositor, 1.5, T(`${dispositor} rules the sign your 10th lord sits in`, `10-ம் அதிபதி அமர்ந்த ராசியின் அதிபதி ${ta(dispositor)}`));
  let d10 = null;
  if (b.exact) {
    const dL = vargaRasi(P.Lagna.longitude, 10);
    const dTenth = (dL + 9) % 12;
    const dLord = RASIS[dTenth].lord;
    const dOcc = Object.keys(P).filter((k) => k !== 'Lagna' && vargaRasi(P[k].longitude, 10) === dTenth);
    d10 = { lagna: dL, tenth: dTenth, lord: dLord, occupants: dOcc };
    add(dLord, 3, T(`in the Dasamsa (D10, the career chart) the 10th lord is ${dLord}`, `தசாம்சத்தில் (D10 — தொழில் சக்கரம்) 10-ம் அதிபதி ${ta(dLord)}`));
    for (const o of dOcc) add(o, 2, T(`${o} is in the 10th of the Dasamsa (D10)`, `தசாம்சத்தில் (D10) 10-ம் வீட்டில் ${ta(o)}`));
  }
  const strongest = Object.values(st).filter((g) => SEVEN.includes(g.planet)).sort((x, y) => y.score - x.score).slice(0, 2);
  for (const g of strongest) {
    if (g.score < 60) continue;
    const why = g.reasons.find((r) => r.pts > 0);
    add(g.planet, 2, T(`${g.planet} is one of the strongest planets in your chart${why ? ` (${why.en})` : ''}`, `${ta(g.planet)} உங்கள் ஜாதகத்தின் பலமான கிரகங்களில் ஒன்று${why ? ` (${why.ta})` : ''}`));
  }
  add(lagnaLord, 1, T(`${lagnaLord} rules your ${b.useLagna ? 'Lagna' : 'Moon sign'} — your own nature`, `${ta(lagnaLord)} ${b.useLagna ? 'லக்னாதிபதி' : 'ராசி அதிபதி'} — உங்கள் இயல்பு`));
  for (const [p, c] of Object.entries(cand)) c.w += ((st[p]?.score ?? 55) - 55) / 30;
  const element = tenthSign % 4;
  const ranked = Object.entries(cand).sort((x, y) => y[1].w - x[1].w);
  const used = new Set();
  const groups = [];
  for (const [p, c] of ranked) {
    if (groups.length >= 3) break;
    const h = b.house(p);
    const order = (f) => (HOUSE_FLAVOUR[h].includes(f) ? 0 : 2) + (ELEMENT_FIELDS[element].includes(f) ? 0 : 1);
    const fields = [...PLANET_FIELDS[p]].filter((f) => !used.has(f)).sort((x, y) => order(x) - order(y)).slice(0, 3);
    if (fields.length < 2) continue;
    fields.forEach((f) => used.add(f));
    groups.push({ planet: p, house: h, weight: Math.round(c.w * 10) / 10, fields, reasons: c.reasons.slice(0, 2) });
  }
  // Job (salaried service) or business (own enterprise) — 7th / 10th / Lagna lord.
  const seventhLord = lordOf(from, 7);
  const sevH = b.house(seventhLord);
  const sixthLord = lordOf(from, 6);
  const llH = b.house(lagnaLord);
  let biz = 0, job = 0;
  const bizWhy = [], jobWhy = [];
  if ([1, 7, 10, 11].includes(sevH)) { biz += 2; bizWhy.push(T(`the 7th lord (trade) ${seventhLord} is in the ${ordEn(sevH)}`, `7-ம் அதிபதி (வணிகம்) ${ta(seventhLord)} ${sevH}-ம் வீட்டில்`)); }
  if (tLordH === 7) { biz += 2; bizWhy.push(T('the 10th lord sits in the 7th (trade)', '10-ம் அதிபதி 7-ல் (வணிக ஸ்தானம்)')); }
  if ([1, 3, 11].includes(tLordH)) { biz += 1; bizWhy.push(T(`the 10th lord is in the ${ordEn(tLordH)} (own effort)`, `10-ம் அதிபதி ${tLordH}-ல் (சொந்த முயற்சி)`)); }
  if (['Mercury', 'Venus', 'Rahu'].some((k) => k === tLord || occupants.includes(k))) { biz += 1; bizWhy.push(T('Mercury / Venus / Rahu link to the 10th (trade sense)', 'புதன் / சுக்கிரன் / ராகு 10-ம் வீட்டுடன் தொடர்பு (வணிகத் திறன்)')); }
  if (st[lagnaLord]?.level === 'strong' && [1, 4, 7, 10].includes(llH)) { biz += 1; bizWhy.push(T('a strong Lagna lord in a kendra (independence)', 'லக்னாதிபதி பலமாகக் கேந்திரத்தில் (சுதந்திரமாகச் செயல்படும் திறன்)')); }
  if ([6, 10].includes(tLordH)) { job += 2; jobWhy.push(T(`the 10th lord is in the ${ordEn(tLordH)} (${tLordH === 6 ? 'service' : 'a steady position'})`, `10-ம் அதிபதி ${tLordH}-ல் (${tLordH === 6 ? 'சேவை' : 'நிலையான பதவி'})`)); }
  if (['Sun', 'Saturn'].some((k) => k === tLord || occupants.includes(k))) { job += 1; jobWhy.push(T('Sun / Saturn link to the 10th (organisations, government)', 'சூரியன் / சனி 10-ம் வீட்டுடன் தொடர்பு (நிறுவனம், அரசுப் பணி)')); }
  if (b.house(sixthLord) === 10) { job += 2; jobWhy.push(T('the 6th lord (service) sits in the 10th', '6-ம் அதிபதி (சேவை) 10-ல்')); }
  if ([6, 8, 12].includes(sevH)) { job += 1; jobWhy.push(T(`the 7th lord (trade) is in the ${ordEn(sevH)}`, `7-ம் அதிபதி (வணிகம்) ${sevH}-ல்`)); }
  const lean = biz >= job + 2 ? 'business' : job >= biz + 2 ? 'job' : 'both';
  const jobBusiness = { lean, biz, job, reasons: lean === 'business' ? bizWhy : lean === 'job' ? jobWhy : [...jobWhy.slice(0, 1), ...bizWhy.slice(0, 1)] };
  const dasaFit = dasaFitFor(chart, groups, rel, now);
  const nature = { element: chart.planets.Lagna && b.useLagna ? from % 4 : P.Moon.rasi % 4, moonElement: P.Moon.rasi % 4 };
  return { reference: b.useLagna ? 'lagna' : 'moon', refWord: refWord(b), refBy: refBy(b), tenth: { sign: tenthSign, lord: tLord, lordHouse: tLordH, occupants, element }, groups, jobBusiness, dasaFit, d10, d10Skipped: !b.exact, nature, lagnaLord };
}

/** Which of the top groups the running Dasa / Bhukti activates, or the next bhukti of one of them. */
function dasaFitFor(chart, groups, rel, now) {
  if (rel?.nakshatra === false || !chart.dasa?.periods) return null;
  const { md, ad } = runningDasa(chart, now);
  if (!md) return null;
  const top = groups.map((g) => g.planet);
  const hit = [ad?.lord, md.lord].filter(Boolean).find((p) => top.includes(p));
  let next = null;
  if (!hit) {
    outer: for (const m of chart.dasa.periods) {
      if (new Date(m.end) <= now) continue;
      for (const a of m.bhuktis || []) {
        if (new Date(a.start) > now && top.includes(a.lord)) { next = { md: m.lord, ad: a.lord, start: new Date(a.start), end: new Date(a.end) }; break outer; }
      }
    }
  }
  return { md: md.lord, ad: ad?.lord || null, until: ad ? new Date(ad.end) : new Date(md.end), hit, group: groups.find((g) => g.planet === hit) || null, next, nextGroup: next ? groups.find((g) => g.planet === next.ad) : null };
}

const fieldsText = (ids, lang) => ids.map((f) => pick(FIELDS[f], lang)).join(' / ');

/** Lines for a career WHICH answer: { answer, chart, now } — top 3 fields with reasons first. */
export function careerLines(r, lang = 'ta', { name = '', minor = false, focus = null } = {}) {
  const L = (en, t) => (lang === 'ta' ? t : en);
  const who = name ? `${name}, ` : '';
  const answer = [L(`${who}from your chart, the three fields that fit you best are:`, `${who}உங்கள் ஜாதகப்படி உங்களுக்கு மிகப் பொருந்தும் மூன்று துறைகள்:`)];
  r.groups.forEach((g, i) => {
    const why = g.reasons.map((x) => pick(x, lang)).join(L('; ', '; '));
    answer.push(`${i + 1}) ${fieldsText(g.fields, lang)} — ${why}.`);
  });
  if (!minor) {
    const jb = r.jobBusiness;
    const why = jb.reasons.slice(0, 2).map((x) => pick(x, lang)).join(L(' and ', ', '));
    const lean = { business: T('Own business / enterprise is well supported', 'சொந்தத் தொழில் / வியாபாரத்துக்கு மரபுப்படி ஆதரவு அதிகம்'), job: T('A salaried job in an organisation suits you more than your own business', 'சொந்தத் தொழிலை விட நிறுவனத்தில் சம்பள வேலையே அதிகம் பொருந்தும்'), both: T('Both can work — build experience in a job first, then start something of your own on a small scale', 'இரண்டும் பொருந்தும் — முதலில் வேலையில் அனுபவம், பிறகு சிறிய அளவில் சொந்த முயற்சி') }[jb.lean];
    answer.push(L(`Job or business: ${lean.en}${why ? ` — ${why}` : ''}.`, `வேலையா தொழிலா: ${lean.ta}${why ? ` — ${why}` : ''}.`));
  }
  const d = r.dasaFit;
  if (d) {
    const run = L(`${d.md} Dasa${d.ad ? `, ${d.ad} Bhukti` : ''} (till ${my(d.until, 'en')})`, `${ta(d.md)} தசை${d.ad ? `, ${ta(d.ad)} புக்தி` : ''} (${my(d.until, 'ta')} வரை)`);
    if (d.hit) answer.push(L(`Right now: the running ${run} is ruled by ${d.hit} — option ${r.groups.indexOf(d.group) + 1} (${fieldsText(d.group.fields.slice(0, 2), 'en')}) is the one this period supports most.`, `இப்போது: நடப்பு ${run} — ${ta(d.hit)} இயக்கும் காலம்; ${r.groups.indexOf(d.group) + 1}-வது துறைக்கு (${fieldsText(d.group.fields.slice(0, 2), 'ta')}) இப்போதே அதிக ஆதரவு.`));
    else {
      const own = PLANET_FIELDS[d.ad || d.md].slice(0, 2);
      answer.push(L(`Right now: the running ${run} does not rule these fields directly — it favours skills in ${fieldsText(own, 'en')}; use this time to train and prepare${d.next ? `. ${d.next.ad} Bhukti from ${my(d.next.start, 'en')} supports option ${r.groups.indexOf(d.nextGroup) + 1}` : ''}.`,
        `இப்போது: நடப்பு ${run} மேலே உள்ள துறைகளை நேரடியாக இயக்கவில்லை — ${fieldsText(own, 'ta')} சார்ந்த திறன்களுக்கு ஏற்ற காலம்; பயிற்சி பெற்றுத் தயாராகுங்கள்${d.next ? `. ${my(d.next.start, 'ta')} முதல் ${ta(d.next.ad)} புக்தி ${r.groups.indexOf(d.nextGroup) + 1}-வது துறைக்கு ஆதரவு` : ''}.`));
    }
  }
  const t = r.tenth;
  const chart = [
    L(`10th house (career) ${r.refBy.en}: ${RASIS[t.sign].en} (${ELEMENT[t.element].en} sign), lord ${t.lord} in the ${ordEn(t.lordHouse)}${t.occupants.length ? `, with ${t.occupants.join(', ')} in it` : ''}.`,
      `${r.refBy.ta} 10-ம் வீடு (தொழில்): ${RASIS[t.sign].ta} (${ELEMENT[t.element].ta} ராசி), அதிபதி ${ta(t.lord)} ${t.lordHouse}-ம் வீட்டில்${t.occupants.length ? `; இந்த வீட்டில் ${t.occupants.map(ta).join(', ')}` : ''}.`),
    L(`A ${ELEMENT[t.element].en} 10th sign favours ${ELEMENT_NATURE[t.element].en}; your ${r.reference === 'lagna' ? 'Lagna' : 'Moon sign'} is a ${ELEMENT[r.nature.element].en} sign — ${ELEMENT_NATURE[r.nature.element].en}.`,
      `${ELEMENT[t.element].ta} ராசியான 10-ம் வீடு — ${ELEMENT_NATURE[t.element].ta}; உங்கள் ${r.reference === 'lagna' ? 'லக்னம்' : 'ராசி'} ${ELEMENT[r.nature.element].ta} ராசி — ${ELEMENT_NATURE[r.nature.element].ta}.`),
    r.d10 ? L(`Dasamsa (D10): 10th lord ${r.d10.lord}${r.d10.occupants.length ? `, ${r.d10.occupants.join(', ')} in its 10th` : ''} — read together with the birth chart.`, `தசாம்சம் (D10): 10-ம் அதிபதி ${ta(r.d10.lord)}${r.d10.occupants.length ? `; அதன் 10-ம் வீட்டில் ${r.d10.occupants.map(ta).join(', ')}` : ''} — ராசிக் கட்டத்துடன் சேர்த்துப் பார்க்கப்பட்டது.`)
      : L('The Dasamsa (D10) needs an exact birth time, so it is not used here.', 'தசாம்சம் (D10) பார்க்கத் துல்லியமான பிறந்த நேரம் தேவை; எனவே இங்கே பயன்படுத்தப்படவில்லை.'),
    L('Method: the traditional planet–field table (Sun → government, medicine; Mercury → accounts, IT, trade; Saturn → industry, service …) applied to the planets that rule and occupy your 10th house.', 'முறை: மரபுக் கிரக–துறை அட்டவணை (சூரியன் → அரசு, மருத்துவம்; புதன் → கணக்கு, IT, வணிகம்; சனி → தொழிற்சாலை, சேவை …) — உங்கள் 10-ம் வீட்டை ஆளும், அதில் உள்ள கிரகங்களுக்குப் பொருத்தப்பட்டது.'),
  ];
  return { answer, chart };
}

// ------------------------------------------------------------------ business
const BUSINESS_OF = {
  Sun: T('pharmacy / medical supplies, government contracts, electricals', 'மருந்துக் கடை / மருத்துவப் பொருட்கள், அரசு ஒப்பந்தப் பணி, மின்சாதனங்கள்'),
  Moon: T('restaurant / catering, dairy & food products, travel agency', 'உணவகம் / கேட்டரிங், பால் & உணவுப் பொருட்கள், பயண முகவர்'),
  Mars: T('construction, real estate, machinery & spare parts, a gym', 'கட்டுமானம், ரியல் எஸ்டேட், இயந்திரம் & உதிரிபாகம், உடற்பயிற்சிக் கூடம்'),
  Mercury: T('trading, accounts / tax services, IT services, books & printing, online selling', 'வர்த்தகம், கணக்கு / வரி சேவை, IT சேவை, புத்தகம் & அச்சு, ஆன்லைன் விற்பனை'),
  Jupiter: T('a coaching centre, financial advisory, an educational institution', 'பயிற்சி மையம், நிதி ஆலோசனை, கல்வி நிறுவனம்'),
  Venus: T('textiles, a beauty parlour, jewellery, vehicle sales, a hotel', 'ஜவுளி, அழகு நிலையம், நகை, வாகன விற்பனை, ஹோட்டல்'),
  Saturn: T('manufacturing, iron / oil products, transport, labour-based services', 'உற்பத்தி, இரும்பு / எண்ணெய்ப் பொருட்கள், போக்குவரத்து, தொழிலாளர் சார்ந்த சேவை'),
  Rahu: T('import–export, electronics & technology, online trade', 'ஏற்றுமதி–இறக்குமதி, மின்னணு & தொழில்நுட்பம், ஆன்லைன் வர்த்தகம்'),
  Ketu: T('herbal / Siddha products, research services, software services', 'மூலிகை / சித்தா பொருட்கள், ஆராய்ச்சி சேவை, மென்பொருள் சேவை'),
};
/** Lines for "which business suits me": business types from the same planets, the 7th house for partners. */
export function businessLines(r, chart, lang = 'ta', { rel = null, name = '' } = {}) {
  const L = (en, t) => (lang === 'ta' ? t : en);
  const b = base(chart, rel);
  const who = name ? `${name}, ` : '';
  const answer = [L(`${who}the kinds of business your chart supports most:`, `${who}உங்கள் ஜாதகம் அதிகம் ஆதரிக்கும் தொழில் வகைகள்:`)];
  r.groups.forEach((g, i) => answer.push(`${i + 1}) ${pick(BUSINESS_OF[g.planet], lang)} — ${g.reasons.map((x) => pick(x, lang)).join('; ')}.`));
  const sl = lordOf(b.from, 7);
  const sh = b.house(sl);
  const s7 = b.st[sl];
  const occ7 = b.occ(7);
  const goodP = [1, 4, 5, 7, 9, 10, 11].includes(sh) && s7?.level !== 'weak';
  answer.push(goodP
    ? L(`Partnership: the 7th lord ${sl} is in the ${ordEn(sh)}${occ7.length ? ` with ${occ7.join(', ')} in the 7th` : ''} — a partner can help, with every term in writing.`, `கூட்டுத் தொழில்: 7-ம் அதிபதி ${ta(sl)} ${sh}-ம் வீட்டில்${occ7.length ? `; 7-ல் ${occ7.map(ta).join(', ')}` : ''} — கூட்டாளி உதவுவார்; ஒவ்வொரு நிபந்தனையையும் எழுத்தில் வையுங்கள்.`)
    : L(`Partnership: the 7th lord ${sl} is in the ${ordEn(sh)} — starting on your own (or with family) suits you better; if you take a partner, keep a clear written agreement.`, `கூட்டுத் தொழில்: 7-ம் அதிபதி ${ta(sl)} ${sh}-ம் வீட்டில் — தனியாகவோ குடும்பத்துடனோ தொடங்குவது அதிகம் பொருந்தும்; கூட்டாளி என்றால் தெளிவான எழுத்து ஒப்பந்தம் வையுங்கள்.`));
  const lean = r.jobBusiness.lean;
  answer.push(lean === 'job'
    ? L('Note: your chart leans more to a salaried job — begin the business small, alongside work, before risking savings.', 'குறிப்பு: உங்கள் ஜாதகம் சம்பள வேலை பக்கம் அதிகம் சாய்கிறது — சேமிப்பைப் பணயம் வைக்கும் முன், வேலையுடன் சேர்த்துச் சிறிய அளவில் தொடங்குங்கள்.')
    : lean === 'business' ? L('Your chart leans to own enterprise — the fields above are where it shows most.', 'உங்கள் ஜாதகம் சொந்த முயற்சி பக்கம் சாய்கிறது — மேலே உள்ளவற்றில் அது அதிகம் வெளிப்படும்.')
      : L('Your chart supports both work and business — start small and grow step by step.', 'உங்கள் ஜாதகம் வேலைக்கும் தொழிலுக்கும் ஆதரவு — சிறிதாகத் தொடங்கிப் படிப்படியாக வளருங்கள்.'));
  const { chart: chartL } = careerLines(r, lang, { name });
  return { answer, chart: chartL.slice(0, 3) };
}

// ------------------------------------------------------------------ abroad or home (direction / place)
// Traditional directions of the planets (dik): used for "which direction / side".
const DIK = { Sun: T('East', 'கிழக்கு'), Venus: T('South-east', 'தென்கிழக்கு'), Mars: T('South', 'தெற்கு'), Rahu: T('South-west', 'தென்மேற்கு'), Saturn: T('West', 'மேற்கு'), Moon: T('North-west', 'வடமேற்கு'), Mercury: T('North', 'வடக்கு'), Jupiter: T('North-east', 'வடகிழக்கு'), Ketu: T('North-east', 'வடகிழக்கு') };
export function directionReading(chart, { rel = null, now = new Date() } = {}) {
  const b = base(chart, rel);
  const l12 = lordOf(b.from, 12), l9 = lordOf(b.from, 9), l4 = lordOf(b.from, 4);
  const h12 = b.house(l12), h9 = b.house(l9), h4 = b.house(l4), hR = b.house('Rahu');
  const in12 = b.occ(12), in4 = b.occ(4);
  let abroad = 0, home = 0;
  const aw = [], hw = [];
  if ([1, 9, 10, 12].includes(h12)) { abroad += 2; aw.push(T(`12th lord (foreign lands) ${l12} is in the ${ordEn(h12)}`, `12-ம் அதிபதி (வெளிநாடு) ${ta(l12)} ${h12}-ம் வீட்டில்`)); }
  if (h9 === 12 || h9 === 3) { abroad += 1; aw.push(T(`9th lord (long journeys) ${l9} is in the ${ordEn(h9)}`, `9-ம் அதிபதி (நெடும் பயணம்) ${ta(l9)} ${h9}-ம் வீட்டில்`)); }
  if ([1, 7, 9, 10, 12].includes(hR)) { abroad += 1; aw.push(T(`Rahu (foreign links) is in the ${ordEn(hR)}`, `ராகு (வெளிநாட்டுத் தொடர்பு) ${hR}-ம் வீட்டில்`)); }
  const in12x = in12.filter((k) => !(k === 'Rahu' && [12].includes(hR)));
  if (in12.length) { abroad += 1; if (in12x.length) aw.push(T(`${in12x.join(', ')} in the 12th`, `12-ம் வீட்டில் ${in12x.map(ta).join(', ')}`)); }
  if ([1, 4, 7, 10].includes(h4) && b.st[l4]?.level !== 'weak') { home += 2; hw.push(T(`4th lord (home, native place) ${l4} is firm in the ${ordEn(h4)}`, `4-ம் அதிபதி (வீடு, சொந்த ஊர்) ${ta(l4)} ${h4}-ம் வீட்டில் உறுதியாக`)); }
  if (in4.some((k) => ['Jupiter', 'Venus', 'Moon', 'Mercury'].includes(k))) { home += 1; hw.push(T(`${in4.join(', ')} in the 4th`, `4-ம் வீட்டில் ${in4.map(ta).join(', ')}`)); }
  if ([6, 8].includes(h12)) { home += 1; hw.push(T(`12th lord ${l12} is in the ${ordEn(h12)}`, `12-ம் அதிபதி ${ta(l12)} ${h12}-ம் வீட்டில்`)); }
  if (b.st.Moon?.level === 'strong' && [1, 4, 7, 10].includes(b.house('Moon'))) { home += 1; hw.push(T('a strong Moon in a kendra (roots, family)', 'சந்திரன் பலமாகக் கேந்திரத்தில் (வேர், குடும்பம்)')); }
  // The running dasa: does it link to the 12th / 9th (or is it Rahu)?
  let nowLink = null;
  if (rel?.nakshatra !== false && chart.dasa?.periods) {
    const { md, ad } = runningDasa(chart, now);
    const lords = [md?.lord, ad?.lord].filter(Boolean);
    const linked = lords.find((p) => p === 'Rahu' || [12, 9].includes(b.house(p)) || [l12, l9].includes(p));
    nowLink = { md: md?.lord, ad: ad?.lord, until: ad ? new Date(ad.end) : md ? new Date(md.end) : null, linked: linked || null };
    if (linked) abroad += 1;
  }
  const lean = abroad >= home + 2 ? 'abroad' : home >= abroad + 2 ? 'home' : 'both';
  const tenthLord = lordOf(b.from, 10);
  return { lean, abroad, home, abroadWhy: aw, homeWhy: hw, nowLink, dik: DIK[tenthLord], tenthLord, refWord: refWord(b), refBy: refBy(b) };
}
export function directionLines(d, lang = 'ta', { name = '', aboutChild = false } = {}) {
  const L = (en, t) => (lang === 'ta' ? t : en);
  const who = name ? `${name}, ` : '';
  const verdict = {
    abroad: T('your chart leans towards working / living abroad (or far from your native place)', 'உங்கள் ஜாதகம் வெளிநாடு / தொலைதூரத்தில் வேலை, வாழ்க்கை பக்கம் சாய்கிறது'),
    home: T('your chart leans towards growing here — at home or near your native place', 'உங்கள் ஜாதகம் இங்கேயே — சொந்த ஊர் / நாட்டுக்கு அருகில் — வளர்வதை அதிகம் ஆதரிக்கிறது'),
    both: T('your chart supports both — a spell abroad for work or study, with your roots and settling here', 'உங்கள் ஜாதகம் இரண்டையும் ஆதரிக்கிறது — வேலை / படிப்புக்காகச் சில ஆண்டுகள் வெளிநாடு, வேரும் நிலைப்பும் இங்கே'),
  }[d.lean];
  const answer = [L(`${who}${verdict.en}.`, `${who}${verdict.ta}.`)];
  const first = d.lean === 'home' ? d.homeWhy : d.abroadWhy;
  const second = d.lean === 'home' ? d.abroadWhy : d.homeWhy;
  if (first.length) answer.push(L(`Why: ${first.slice(0, 3).map((x) => x.en).join('; ')}.`, `காரணம்: ${first.slice(0, 3).map((x) => x.ta).join('; ')}.`));
  if (second.length) answer.push(L(`On the other side: ${second.slice(0, 2).map((x) => x.en).join('; ')}.`, `மறுபக்கம்: ${second.slice(0, 2).map((x) => x.ta).join('; ')}.`));
  if (d.nowLink?.md) {
    answer.push(d.nowLink.linked
      ? L(`Right now: the running ${d.nowLink.md} Dasa${d.nowLink.ad ? ` / ${d.nowLink.ad} Bhukti` : ''} is linked to the 12th / 9th — a period that opens doors to distant places${d.nowLink.until ? ` (till ${my(d.nowLink.until, 'en')})` : ''}.`, `இப்போது: நடப்பு ${ta(d.nowLink.md)} தசை${d.nowLink.ad ? ` / ${ta(d.nowLink.ad)} புக்தி` : ''} 12 / 9-ம் வீட்டுடன் தொடர்புடையது — தொலைதூர வாய்ப்புகளுக்கு வழி திறக்கும் காலம்${d.nowLink.until ? ` (${my(d.nowLink.until, 'ta')} வரை)` : ''}.`)
      : L(`Right now: the running ${d.nowLink.md} Dasa${d.nowLink.ad ? ` / ${d.nowLink.ad} Bhukti` : ''} is not a foreign-travel period — growth where you are is easier now.`, `இப்போது: நடப்பு ${ta(d.nowLink.md)} தசை${d.nowLink.ad ? ` / ${ta(d.nowLink.ad)} புக்தி` : ''} வெளிநாட்டுக் காலம் அல்ல — இப்போது இருக்கும் இடத்திலேயே வளர்வது எளிது.`));
  }
  answer.push(L(`Traditional direction for work (from your 10th lord ${d.tenthLord}): ${d.dik.en}.`, `மரபுப்படி தொழிலுக்குச் சாதகமான திசை (10-ம் அதிபதி ${ta(d.tenthLord)}): ${d.dik.ta}.`));
  const chart = [
    L(`Houses read ${d.refBy.en}: 12th (foreign lands), 9th (long journeys), 4th (home, native place); Rahu for foreign links.`, `${d.refBy.ta} பார்க்கும் வீடுகள்: 12-ம் வீடு (வெளிநாடு), 9-ம் வீடு (நெடும் பயணம்), 4-ம் வீடு (வீடு, சொந்த ஊர்); வெளிநாட்டுத் தொடர்புக்கு ராகு.`),
    L('A chart cannot pick a country or city — choose by the job offer, family needs, costs and the official visa rules.', 'எந்த நாடு / நகரம் என்பதை ஜாதகம் சொல்லாது — வேலை வாய்ப்பு, குடும்பத் தேவை, செலவு, அதிகாரப்பூர்வ விசா விதிகள் — இவற்றை வைத்து முடிவு செய்யுங்கள்.'),
  ];
  if (aboutChild) chart.unshift(L('This is read from your own chart; their own horoscope gives the clearest reading.', 'இது உங்கள் ஜாதகத்திலிருந்து; அவருடைய சொந்த ஜாதகமே மிகத் தெளிவான பலன் தரும்.'));
  return { answer, chart };
}

// ------------------------------------------------------------------ partner nature (personality only)
const PLANET_TRAITS = {
  Sun: T('self-respecting, responsible, takes the lead', 'தன்மானம், பொறுப்புணர்வு, முன்னின்று நடத்தும் இயல்பு'),
  Moon: T('affectionate, emotional, close to family', 'அன்பு, உணர்வுப்பூர்வம், குடும்பப் பற்று'),
  Mars: T('energetic, direct in speech, courageous', 'சுறுசுறுப்பு, நேரடிப் பேச்சு, துணிவு'),
  Mercury: T('intelligent, talkative, good humour', 'புத்திசாலித்தனம், பேச்சுத் திறன், நகைச்சுவை'),
  Jupiter: T('broad-minded, knowledgeable, principled', 'பெருந்தன்மை, அறிவு, நல்லொழுக்கம்'),
  Venus: T('gentle, artistic, enjoys beauty and comfort', 'இனிமை, கலையார்வம், அழகும் வசதியும் விரும்பும் இயல்பு'),
  Saturn: T('patient, dutiful, mature (often a little older or serious)', 'பொறுமை, கடமை உணர்வு, முதிர்ச்சி'),
  Rahu: T('unconventional thinking, wide outside contacts', 'வித்தியாசமான சிந்தனை, வெளியுலகத் தொடர்பு'),
  Ketu: T('spiritual, quiet, independent-minded', 'ஆன்மீக நாட்டம், அமைதி, சுதந்திர மனம்'),
};
const ELEMENT_TRAITS = [
  T('warm, confident and active', 'உற்சாகம், தன்னம்பிக்கை, செயல்திறன்'),
  T('practical, stable and dependable', 'நடைமுறை அறிவு, நிலைத்தன்மை, நம்பகத்தன்மை'),
  T('sociable, communicative and thoughtful', 'பழகும் தன்மை, பேச்சு, சிந்தனை'),
  T('caring, sensitive and loyal', 'பராமரிப்பு, மென்மை, விசுவாசம்'),
];
export function partnerLines(chart, lang = 'ta', { rel = null, gender = null, name = '' } = {}) {
  const L = (en, t) => (lang === 'ta' ? t : en);
  const b = base(chart, rel);
  const s7 = (b.from + 6) % 12;
  const l7 = RASIS[s7].lord;
  const h7 = b.house(l7);
  const occ7 = b.occ(7);
  const kar = gender === 'female' ? 'Jupiter' : 'Venus';
  const traits = [ELEMENT_TRAITS[s7 % 4], PLANET_TRAITS[l7], ...occ7.slice(0, 2).map((o) => PLANET_TRAITS[o])];
  const who = name ? `${name}, ` : '';
  const answer = [
    L(`${who}by tradition your partner's nature is read from the 7th house — in your chart it points to someone ${traits.slice(0, 2).map((x) => x.en).join('; ')}.`, `${who}மரபுப்படி வாழ்க்கைத் துணையின் இயல்பு 7-ம் வீட்டிலிருந்து பார்க்கப்படும் — உங்கள் ஜாதகத்தில்: ${traits.slice(0, 2).map((x) => x.ta).join('; ')}.`),
  ];
  if (occ7.length) answer.push(L(`${occ7.join(', ')} in your 7th adds: ${occ7.slice(0, 2).map((o) => PLANET_TRAITS[o].en).join('; ')}.`, `7-ம் வீட்டில் ${occ7.map(ta).join(', ')} — கூடுதலாக: ${occ7.slice(0, 2).map((o) => PLANET_TRAITS[o].ta).join('; ')}.`));
  const ks = b.st[kar];
  answer.push(L(`${kar} (karaka for the ${gender === 'female' ? 'husband' : 'wife'} by tradition) is ${ks?.level === 'strong' ? 'strong — a caring, supportive bond' : ks?.level === 'weak' ? 'in need of support — patience and clear talk build the bond' : 'average — the bond grows with understanding'}.`,
    `${ta(kar)} (மரபுப்படி ${gender === 'female' ? 'கணவருக்குக்' : 'மனைவிக்குக்'} காரகர்) ${ks?.level === 'strong' ? 'பலம் — அன்பும் ஆதரவும் உள்ள பந்தம்' : ks?.level === 'weak' ? 'ஆதரவு தேவை — பொறுமையும் தெளிவான பேச்சும் பந்தத்தை வளர்க்கும்' : 'மத்திமம் — புரிதலால் பந்தம் வளரும்'}.`));
  answer.push(L('This speaks of nature only — never of looks, caste, money or family background; meet and talk, and match horoscopes with full birth details.', 'இது இயல்பு பற்றி மட்டுமே — தோற்றம், ஜாதி, பணம், குடும்பப் பின்னணி பற்றி அல்ல; நேரில் பேசிப் பழகி, முழு பிறப்பு விவரத்துடன் பொருத்தம் பாருங்கள்.'));
  const chartL = [L(`7th house ${refBy(b).en}: ${RASIS[s7].en} (${ELEMENT[s7 % 4].en} sign), its lord ${l7} in the ${ordEn(h7)}${occ7.length ? `, with ${occ7.join(', ')} in it` : ''}.`, `${refBy(b).ta} 7-ம் வீடு: ${RASIS[s7].ta} (${ELEMENT[s7 % 4].ta} ராசி), அதிபதி ${ta(l7)} ${h7}-ம் வீட்டில்${occ7.length ? `; இந்த வீட்டில் ${occ7.map(ta).join(', ')}` : ''}.`)];
  return { answer, chart: chartL };
}

// ------------------------------------------------------------------ study stream
const STREAM = {
  maths: { en: 'Maths / Computer Science (B.E., B.Tech, B.Sc CS, BCA)', ta: 'கணிதம் / கணினி அறிவியல் (பி.இ., பி.டெக், பி.எஸ்சி கணினி, பிசிஏ)', minor: T('Maths and Computer Science', 'கணிதம், கணினி அறிவியல்'), fields: ['engineering', 'it', 'coding', 'tech', 'aviation'] },
  bio: { en: 'Biology / health sciences (MBBS, BDS, Nursing, Pharmacy, Siddha)', ta: 'உயிரியல் / மருத்துவ அறிவியல் (எம்.பி.பி.எஸ், பல் மருத்துவம், செவிலியர், மருந்தியல், சித்தா)', minor: T('Biology and life sciences', 'உயிரியல், மருத்துவ அறிவியல்'), fields: ['medicine', 'surgery', 'nursing', 'altmed', 'chemicals', 'research'] },
  commerce: { en: 'Commerce / Accounts (B.Com, CA, CMA, BBA)', ta: 'வணிகவியல் / கணக்கியல் (பி.காம், சி.ஏ, சி.எம்.ஏ, பி.பி.ஏ)', minor: T('Commerce and Accountancy', 'வணிகவியல், கணக்குப்பதிவியல்'), fields: ['accounts', 'finance', 'trade', 'leadership'] },
  arts: { en: 'Arts / Humanities (law, literature, media, education, fine arts)', ta: 'கலை / மனிதவியல் (சட்டம், இலக்கியம், ஊடகம், கல்வியியல், நுண்கலை)', minor: T('Languages, history and the arts', 'மொழிகள், வரலாறு, கலைகள்'), fields: ['law', 'writing', 'teaching', 'arts', 'fashion', 'priesthood', 'spiritual', 'public', 'govt', 'advisory'] },
  applied: { en: 'Applied / vocational (hotel management, travel, design, sports science)', ta: 'பயிற்சிப் படிப்புகள் (ஹோட்டல் மேலாண்மை, சுற்றுலா, வடிவமைப்பு, விளையாட்டு அறிவியல்)', minor: T('Design, sports and practical skills', 'வடிவமைப்பு, விளையாட்டு, செய்முறைத் திறன்கள்'), fields: ['hospitality', 'travel', 'sports', 'vehicles', 'realestate', 'police', 'manufacturing', 'service', 'mining', 'foreign'] },
};
export function studyReading(r) {
  const score = Object.fromEntries(Object.keys(STREAM).map((k) => [k, 0]));
  const why = {};
  r.groups.forEach((g, i) => {
    const w = 3 - i;
    for (const f of g.fields) for (const [k, s] of Object.entries(STREAM)) if (s.fields.includes(f)) { score[k] += w; (why[k] ||= []).includes(g) || why[k].push(g); }
  });
  const ranked = Object.entries(score).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 2);
  const usedG = new Set();
  const top = ranked.map(([k]) => { const g = why[k].find((x) => !usedG.has(x)) || why[k][0]; usedG.add(g); return { id: k, group: g }; });
  return { top, score };
}
export function studyLines(r, chart, lang = 'ta', { rel = null, name = '', minor = false } = {}) {
  const L = (en, t) => (lang === 'ta' ? t : en);
  const b = base(chart, rel);
  const s = studyReading(r);
  const who = name ? `${name}, ` : '';
  const answer = [L(`${who}from your chart, the study streams that suit you best:`, `${who}உங்கள் ஜாதகப்படி மிகப் பொருந்தும் படிப்புப் பிரிவுகள்:`)];
  s.top.forEach((x, i) => {
    const st = STREAM[x.id];
    const label = minor ? pick(st.minor, lang) : lang === 'ta' ? st.ta : st.en;
    const reason = x.group ? x.group.reasons.slice(0, 1).map((y) => pick(y, lang)).join('') : '';
    answer.push(`${i + 1}) ${label}${reason ? ` — ${reason}` : ''}.`);
  });
  const me = b.st.Mercury, ju = b.st.Jupiter;
  const lv = (g) => (g?.level === 'strong' ? L('strong', 'பலம்') : g?.level === 'weak' ? L('needs support', 'ஆதரவு தேவை') : L('average', 'மத்திமம்'));
  answer.push(L(`Learning planets: Mercury (logic, maths, language) — ${lv(me)}; Jupiter (higher studies, understanding) — ${lv(ju)}.`, `கல்விக் கிரகங்கள்: புதன் (தர்க்கம், கணக்கு, மொழி) — ${lv(me)}; குரு (உயர்கல்வி, புரிதல்) — ${lv(ju)}.`));
  const chartL = [4, 5, 9].map((h) => {
    const l = lordOf(b.from, h);
    const hh = b.house(l);
    const name4 = { 4: T('schooling', 'அடிப்படைக் கல்வி'), 5: T('intellect', 'அறிவு'), 9: T('higher studies', 'உயர்கல்வி') }[h];
    return L(`${ordEn(h)} house (${name4.en}): lord ${l} in the ${ordEn(hh)} — ${lv(b.st[l])}.`, `${h}-ம் வீடு (${name4.ta}): அதிபதி ${ta(l)} ${hh}-ம் வீட்டில் — ${lv(b.st[l])}.`);
  });
  chartL.push(L('Interest and marks matter as much as the chart — try a short course or an aptitude test before deciding.', 'ஜாதகத்தைப் போலவே ஆர்வமும் மதிப்பெண்ணும் முக்கியம் — முடிவுக்கு முன் ஒரு சிறு பயிற்சி அல்லது திறனறி தேர்வு செய்து பாருங்கள்.'));
  return { answer, chart: chartL };
}

// ------------------------------------------------------------------ day, colour, number
const WEEKDAY_OF = (p) => WEEKDAY[p] || null;
export function luckLines(kind, chart, lang = 'ta', { rel = null, name = '', vehicle = false, question = '' } = {}) {
  const L = (en, t) => (lang === 'ta' ? t : en);
  const b = base(chart, rel);
  const ll = lordOf(b.from, 1), l9 = lordOf(b.from, 9), l5 = lordOf(b.from, 5);
  const strongest = Object.values(b.st).filter((g) => SEVEN.includes(g.planet)).sort((x, y) => y.score - x.score)[0]?.planet;
  const who = name ? `${name}, ` : '';
  const ref = refWord(b);
  if (kind === 'number') {
    const n = luckyNumbers(String(chart.date).slice(0, 10));
    return { answer: [
      L(`${who}your birth number is ${n.birth} (${n.birthPlanet}) and destiny number ${n.destiny} (${n.destinyPlanet}).`, `${who}உங்கள் பிறந்த எண் ${n.birth} (${ta(n.birthPlanet)}), விதி எண் ${n.destiny} (${ta(n.destinyPlanet)}).`),
      L(`Numbers that suit you: ${n.lucky.join(', ')}; dates in a month: ${n.luckyDates.slice(0, 8).join(', ')}.`, `உங்களுக்கு ஏற்ற எண்கள்: ${n.lucky.join(', ')}; மாதத்தில் ஏற்ற தேதிகள்: ${n.luckyDates.slice(0, 8).join(', ')}.`),
      ...(n.avoid.length ? [L(`Tradition is less keen on: ${n.avoid.join(', ')} — a preference, never a fear.`, `மரபு அதிகம் விரும்பாதவை: ${n.avoid.join(', ')} — விருப்பம் மட்டுமே, பயம் தேவையில்லை.`)] : []),
    ], chart: [L('Method: Chaldean birth-date numerology (birth number = day of birth reduced; destiny = full date reduced).', 'முறை: பிறந்த தேதி எண் கணிதம் (பிறந்த எண் = பிறந்த நாள் கூட்டு; விதி எண் = முழுத் தேதி கூட்டு).')] };
  }
  if (kind === 'colour') {
    const c1 = PLANET_COLOR[ll], c2 = PLANET_COLOR[l9 === ll ? l5 : l9], c3 = PLANET_COLOR[strongest];
    const list = [...new Map([[ll, c1], [l9 === ll ? l5 : l9, c2], [strongest, c3]].filter(([, c]) => c)).entries()];
    return { answer: [
      L(`${who}${vehicle ? 'for your vehicle, ' : ''}the colours that suit your chart:`, `${who}${vehicle ? 'உங்கள் வாகனத்திற்கு ' : ''}உங்கள் ஜாதகத்திற்கு ஏற்ற நிறங்கள்:`),
      ...list.slice(0, 3).map(([p, c], i) => `${i + 1}) ${pick(c, lang)} — ${L(i === 0 ? `colour of your ${b.useLagna ? 'Lagna' : 'Moon-sign'} lord ${p}` : p === strongest ? `colour of ${p}, the strongest planet in your chart` : `colour of ${p}, lord of your 9th (fortune) house`, i === 0 ? `${b.useLagna ? 'லக்னாதிபதி' : 'ராசி அதிபதி'} ${ta(p)} ஆளும் நிறம்` : p === strongest ? `ஜாதகத்தின் பலமான கிரகம் ${ta(p)} ஆளும் நிறம்` : `பாக்கிய (9-ம்) அதிபதி ${ta(p)} ஆளும் நிறம்`)}.`),
      L('Colour is a preference — choose what you like and can keep clean and safe.', 'நிறம் ஒரு விருப்பம் மட்டுமே — உங்களுக்குப் பிடித்ததையும் பராமரிக்க எளிதானதையும் தேர்வு செய்யுங்கள்.'),
    ], chart: [L(`Read from your ${ref.en}: the 1st lord ${ll}, the 9th lord ${l9}.`, `${ref.ta}படி: 1-ம் அதிபதி ${ta(ll)}, 9-ம் அதிபதி ${ta(l9)}.`)] };
  }
  // day of the week (for prayer, when that was asked)
  const prayer = /pray|worship|வழிபா|kumbid|பிரார்த்த/i.test(String(question || ''));
  const days = [...new Set([ll, l9, strongest, l5].filter((p) => WEEKDAY_OF(p)))].slice(0, 3);
  return { answer: [
    prayer ? L(`${who}the weekdays that suit your prayer best:`, `${who}உங்கள் வழிபாட்டுக்கு மிக ஏற்ற கிழமைகள்:`) : L(`${who}the weekdays that suit you best:`, `${who}உங்களுக்கு மிக ஏற்ற கிழமைகள்:`),
    ...days.map((p, i) => `${i + 1}) ${pick(WEEKDAY_OF(p), lang)} — ${L(p === ll ? `day of your ${b.useLagna ? 'Lagna' : 'Moon-sign'} lord ${p}` : p === l9 ? `day of your 9th lord (fortune) ${p}` : p === strongest ? `day of ${p}, the strongest planet in your chart` : `day of your 5th lord ${p}`, p === ll ? `${b.useLagna ? 'லக்னாதிபதி' : 'ராசி அதிபதி'} ${ta(p)} ஆளும் கிழமை` : p === l9 ? `பாக்கிய (9-ம்) அதிபதி ${ta(p)} ஆளும் கிழமை` : p === strongest ? `ஜாதகத்தின் பலமான கிரகம் ${ta(p)} ஆளும் கிழமை` : `5-ம் அதிபதி ${ta(p)} ஆளும் கிழமை`)}.`),
    prayer ? L('Early morning (Brahma muhurtham) or the planet’s own Horai on that day is the traditional time for prayer.', 'அந்த நாளில் அதிகாலை (பிரம்ம முகூர்த்தம்) அல்லது அந்தக் கிரகத்தின் ஓரை — வழிபாட்டுக்கு மரபு நேரம்.') : L('For an important start on one of these days, also check that day’s Rahu Kalam and your Chandrashtamam.', 'இந்தக் கிழமைகளில் முக்கியத் தொடக்கம் என்றால், அன்றைய ராகு காலத்தையும் உங்கள் சந்திராஷ்டமத்தையும் பாருங்கள்.'),
  ], chart: [L(`Read from your ${ref.en}: weekday lords of the 1st, 9th and 5th lords and your strongest planet.`, `${ref.ta}படி: 1, 9, 5-ம் அதிபதிகள், பலமான கிரகம் — அவற்றின் கிழமைகள்.`)] };
}

// ------------------------------------------------------------------ which god (faith-aware)
export function godLines(chart, lang = 'ta', { rel = null, faith = 'hindu', name = '' } = {}) {
  const L = (en, t) => (lang === 'ta' ? t : en);
  const b = base(chart, rel);
  const ll = lordOf(b.from, 1);
  const who = name ? `${name}, ` : '';
  if (!isHinduFaith(faith)) {
    return { answer: [
      L(`${who}pray in your own faith — that is the right way for you. Thunai does not suggest Hindu deities for another faith.`, `${who}உங்கள் சொந்த நம்பிக்கைப்படி பிரார்த்தியுங்கள் — அதுவே உங்களுக்கு ஏற்ற வழி. மற்ற நம்பிக்கையுள்ளவர்களுக்குத் துணை இந்துத் தெய்வங்களைப் பரிந்துரைப்பதில்லை.`),
      pick(universalPractice(ll), lang),
      pick(faithBlessing(faith) || faithBlessing('other'), lang),
    ], chart: [L(`Your ${b.useLagna ? 'Lagna' : 'Moon-sign'} lord ${ll} speaks of the virtues above.`, `உங்கள் ${b.useLagna ? 'லக்னாதிபதி' : 'ராசி அதிபதி'} ${ta(ll)} மேலே உள்ள நற்பண்புகளைக் குறிக்கிறார்.`)] };
  }
  const answer = [L(`${who}the deities your chart points to, by traditional method:`, `${who}உங்கள் ஜாதகப்படி மரபு முறைகள் காட்டும் வழிபாட்டுத் தெய்வம்:`)];
  let i = 1;
  if (b.exact) {
    try {
      const it = ishtaTheivam(chart);
      answer.push(`${i++}) ${pick(it.deity, lang)} — ${L(`Ishta Theivam by the Jaimini method (${it.why.en})`, `ஜைமினி முறைப்படி இஷ்ட தெய்வம் (${it.why.ta})`)}.`);
    } catch { /* optional */ }
  }
  const seen = () => answer.slice(1).map((x) => x.replace(/^\d+\) /, '').slice(0, 4));
  const fresh = (d) => !seen().some((x) => pick(d, lang).startsWith(x) || x.startsWith(pick(d, lang).slice(0, 4)));
  if (rel?.nakshatra !== false && chart.janmaNakshatra && fresh(STAR_DEITY[chart.janmaNakshatra.index])) answer.push(`${i++}) ${pick(STAR_DEITY[chart.janmaNakshatra.index], lang)} — ${L(`deity of your birth star ${chart.janmaNakshatra.name}`, `உங்கள் நட்சத்திரம் ${chart.janmaNakshatra.ta || chart.janmaNakshatra.name} — அதற்கான தெய்வம்`)}.`);
  if (fresh(PLANET_DEITY[ll]) || i === 1) answer.push(`${i++}) ${pick(PLANET_DEITY[ll], lang)} — ${L(`deity of your ${b.useLagna ? 'Lagna' : 'Moon-sign'} lord ${ll}`, `${b.useLagna ? 'லக்னாதிபதி' : 'ராசி அதிபதி'} ${ta(ll)} — அவருக்கான தெய்வம்`)}.`);
  answer.push(L('Your family’s own Kula Deivam and practice come first — these are optional traditional suggestions.', 'உங்கள் குடும்பக் குலதெய்வமும் வழக்கமுமே முதன்மை — இவை விருப்பத்திற்குரிய மரபுப் பரிந்துரைகள் மட்டுமே.'));
  return { answer, chart: [L(b.exact ? 'Methods: Jaimini Karakamsa (needs the exact birth time), the birth-star deity table and the Lagna lord’s deity.' : 'Methods: the birth-star deity table and the Moon-sign lord’s deity (the Ishta Theivam method needs an exact birth time).', b.exact ? 'முறைகள்: ஜைமினி காரகாம்சம் (துல்லியமான பிறந்த நேரம் தேவை), நட்சத்திரத் தெய்வ அட்டவணை, லக்னாதிபதியின் தெய்வம்.' : 'முறைகள்: நட்சத்திரத் தெய்வ அட்டவணை, ராசி அதிபதியின் தெய்வம் (இஷ்ட தெய்வ முறைக்குத் துல்லியமான பிறந்த நேரம் தேவை).')] };
}

// ------------------------------------------------------------------ which gem (optional; the free practice first)
export function gemLines(chart, lang = 'ta', { rel = null, faith = 'hindu', name = '', profile = null } = {}) {
  const L = (en, t) => (lang === 'ta' ? t : en);
  const b = base(chart, rel);
  const ll = lordOf(b.from, 1);
  const who = name ? `${name}, ` : '';
  const free0 = remedyFor(ll, { faith, profile })?.free;
  const free = free0 && { en: String(free0.en).replace(/[.\s]+$/, ''), ta: String(free0.ta).replace(/[.\s]+$/, '') };
  const answer = [L(`${who}first, the free way: ${free ? free.en : 'prayer, charity and discipline'} — this strengthens your ${b.useLagna ? 'Lagna' : 'Moon-sign'} lord ${ll} without buying anything.`, `${who}முதலில் இலவச வழி: ${free ? free.ta : 'வழிபாடு, தானம், ஒழுக்கம்'} — எதையும் வாங்காமலே ${b.useLagna ? 'லக்னாதிபதி' : 'ராசி அதிபதி'} ${ta(ll)} பலம் பெற உதவும்.`)];
  if (b.useLagna && isHinduFaith(faith)) {
    const g = gemstones(chart);
    const good = g.good.slice(0, 2);
    if (good.length) answer.push(L(`Only if you wish (tradition, optional): ${good.map((x) => `${pick(x.gem, 'en')} for ${x.planet} (${x.role.en})`).join('; ')}.`, `விரும்பினால் மட்டும் (மரபு, விருப்பத்திற்குரியது): ${good.map((x) => `${pick(x.gem, 'ta')} — ${ta(x.planet)} (${x.role.ta})`).join('; ')}.`));
    if (g.avoid.length) answer.push(L(`Tradition does not suggest: ${g.avoid.slice(0, 3).map((x) => pick(x.gem, 'en')).join(', ')}.`, `மரபு பரிந்துரைக்காதவை: ${g.avoid.slice(0, 3).map((x) => pick(x.gem, 'ta')).join(', ')}.`));
    answer.push(pick(g.note, lang));
  } else {
    answer.push(L('Gemstones are an optional tradition, never necessary protection, and you do not need to buy anything.', 'ரத்தினம் விருப்பத்திற்குரிய மரபு மட்டுமே; பாதுகாப்புக்குக் கட்டாயமல்ல, எதையும் வாங்க வேண்டியதில்லை.'));
    if (!b.useLagna) answer.push(L('The traditional gem choice needs the Lagna (exact birth time), so none is named here.', 'மரபு ரத்தினத் தேர்வுக்கு லக்னம் (துல்லியமான பிறந்த நேரம்) தேவை; எனவே இங்கே பெயரிடப்படவில்லை.'));
  }
  return { answer, chart: [L('Method: lords of the 1st, 5th and 9th houses (trine lords); the 6th, 8th and 12th lords are avoided.', 'முறை: 1, 5, 9-ம் அதிபதிகள் (திரிகோணாதிபதிகள்); 6, 8, 12-ம் அதிபதிகள் தவிர்க்கப்படுகின்றனர்.')] };
}

// ------------------------------------------------------------------ for the AI prompt (English, compact)
/** Career-suitability facts for the AI evidence: the same reading the on-device answer gives. */
export function careerFactsForAI(chart, rel = null, now = new Date()) {
  try {
    const r = careerReading(chart, { rel, now });
    return {
      tenthHouse: `${RASIS[r.tenth.sign].en} (${ELEMENT[r.tenth.element].en}), lord ${r.tenth.lord} in house ${r.tenth.lordHouse}${r.tenth.occupants.length ? `, occupants ${r.tenth.occupants.join(', ')}` : ''} (from the ${r.reference === 'lagna' ? 'Lagna' : 'Moon sign'})`,
      topFields: r.groups.map((g, i) => `${i + 1}. ${g.fields.map((f) => FIELDS[f].en).join(', ')} — ${g.reasons.map((x) => x.en).join('; ')}`),
      jobOrBusiness: `${r.jobBusiness.lean}${r.jobBusiness.reasons.length ? ` — ${r.jobBusiness.reasons.slice(0, 2).map((x) => x.en).join('; ')}` : ''}`,
      dasamsa: r.d10 ? `D10 10th lord ${r.d10.lord}${r.d10.occupants.length ? `, occupants ${r.d10.occupants.join(', ')}` : ''}` : 'not used (birth time not exact)',
      currentDasaFit: r.dasaFit ? (r.dasaFit.hit ? `running ${r.dasaFit.md}/${r.dasaFit.ad} activates field group ${r.groups.indexOf(r.dasaFit.group) + 1}` : `running ${r.dasaFit.md}/${r.dasaFit.ad} does not rule these fields directly${r.dasaFit.next ? `; ${r.dasaFit.next.ad} bhukti from ${new Date(r.dasaFit.next.start).toISOString().slice(0, 10)} supports group ${r.groups.indexOf(r.dasaFit.nextGroup) + 1}` : ''}`) : 'dasa not available',
      method: 'traditional planet-field table applied to the 10th lord, 10th-house planets, dispositor, D10 (exact time only), strongest planets and Lagna lord',
    };
  } catch { return null; }
}
