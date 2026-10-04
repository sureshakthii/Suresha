// Divisional charts (Shodasavarga, Parashara) and Ashtakavarga.
// Pure functions shared by the browser and Node tests. Sign indices: 0 = Mesha … 11 = Meena.
// "Odd sign" means Mesha, Mithuna, Simha… (index 0, 2, 4 …); "even sign" is Rishaba, Kataka …

const mod12 = (x) => ((x % 12) + 12) % 12;

/** Divisional charts offered in the app, with what each one is read for. */
export const VARGAS = [
  { n: 1, en: 'Rasi', ta: 'ராசி', signifies: { en: 'Body, overall life and the main chart', ta: 'உடல், முழு வாழ்க்கை — அடிப்படைக் கட்டம்' } },
  { n: 2, en: 'Hora', ta: 'ஹோரை', signifies: { en: 'Wealth and family resources', ta: 'செல்வம், குடும்ப வளம்' } },
  { n: 3, en: 'Drekkana', ta: 'திரேக்காணம்', signifies: { en: 'Siblings, courage and initiative', ta: 'உடன்பிறப்பு, தைரியம், முயற்சி' } },
  { n: 4, en: 'Chaturthamsa', ta: 'சதுர்த்தாம்சம்', signifies: { en: 'Property, home, land and fortune', ta: 'சொத்து, வீடு, நிலம், பாக்கியம்' } },
  { n: 7, en: 'Saptamsa', ta: 'சப்தாம்சம்', signifies: { en: 'Children and progeny', ta: 'குழந்தைகள், சந்ததி' } },
  { n: 9, en: 'Navamsa', ta: 'நவாம்சம்', signifies: { en: 'Spouse, marriage, dharma and inner strength of planets', ta: 'வாழ்க்கைத் துணை, திருமணம், தர்மம், கிரகங்களின் உள் பலம்' } },
  { n: 10, en: 'Dasamsa', ta: 'தசாம்சம்', signifies: { en: 'Career, profession and status', ta: 'தொழில், உத்தியோகம், அந்தஸ்து' } },
  { n: 12, en: 'Dwadasamsa', ta: 'துவாதசாம்சம்', signifies: { en: 'Parents and ancestry', ta: 'பெற்றோர், முன்னோர்' } },
  { n: 16, en: 'Shodasamsa', ta: 'ஷோடசாம்சம்', signifies: { en: 'Vehicles, comforts and happiness', ta: 'வாகனம், சுக வசதிகள், மகிழ்ச்சி' } },
  { n: 20, en: 'Vimsamsa', ta: 'விம்சாம்சம்', signifies: { en: 'Spiritual progress, worship and devotion', ta: 'ஆன்மிக முன்னேற்றம், வழிபாடு, பக்தி' } },
  { n: 24, en: 'Chaturvimsamsa', ta: 'சதுர்விம்சாம்சம்', signifies: { en: 'Education, learning and knowledge', ta: 'கல்வி, கற்றல், அறிவு' } },
  { n: 30, en: 'Trimsamsa', ta: 'திரிம்சாம்சம்', signifies: { en: 'Misfortunes, illness and hidden troubles', ta: 'துன்பங்கள், நோய், மறைமுக சிக்கல்கள்' } },
  { n: 60, en: 'Shashtiamsa', ta: 'ஷஷ்டியாம்சம்', signifies: { en: 'Past-life karma — the finest overall check', ta: 'பூர்வ ஜென்ம கர்மா — மிக நுட்பமான சோதனை' } },
];

// Trimsamsa (D30) — unequal Parashara portions: [upper degree limit, resulting sign].
// Odd signs: Mars 0–5 → Mesha, Saturn 5–10 → Kumbha, Jupiter 10–18 → Dhanusu, Mercury 18–25 → Mithuna, Venus 25–30 → Thula.
// Even signs: Venus 0–5 → Rishaba, Mercury 5–12 → Kanni, Jupiter 12–20 → Meena, Saturn 20–25 → Makara, Mars 25–30 → Vrischika.
const D30_ODD = [[5, 0], [10, 10], [18, 8], [25, 2], [30, 6]];
const D30_EVEN = [[5, 1], [12, 5], [20, 11], [25, 9], [30, 7]];

/**
 * Sign (0–11) occupied in divisional chart Dn by a sidereal longitude.
 * Rules (Brihat Parashara Hora Shastra):
 *  D1  Rasi        — the sign itself.
 *  D2  Hora        — odd sign: 0–15° Simha (Sun), 15–30° Kataka (Moon); even sign: 0–15° Kataka, 15–30° Simha.
 *  D3  Drekkana    — 10° parts: 1st, 5th, 9th sign from the sign.
 *  D4  Chaturthamsa— 7°30' parts: 1st, 4th, 7th, 10th from the sign.
 *  D7  Saptamsa    — odd sign: counted from the sign; even sign: from the 7th sign.
 *  D9  Navamsa     — 3°20' parts counted continuously from Mesha (fire→Mesha, earth→Makara, air→Thula, water→Kataka).
 *  D10 Dasamsa     — odd sign: from the sign; even sign: from the 9th sign.
 *  D12 Dwadasamsa  — 2°30' parts counted from the sign.
 *  D16 Shodasamsa  — movable signs from Mesha, fixed from Simha, dual from Dhanusu.
 *  D20 Vimsamsa    — movable signs from Mesha, fixed from Dhanusu, dual from Simha.
 *  D24 Chaturvimsamsa — odd sign from Simha, even sign from Kataka.
 *  D30 Trimsamsa   — unequal portions ruled by Mars/Saturn/Jupiter/Mercury/Venus (tables above).
 *  D60 Shashtiamsa — 30' parts counted from the sign itself: (floor(deg × 2) + sign) mod 12
 *                    (same rule for odd and even signs — the common Parashara/Jagannatha Hora convention).
 */
export function vargaRasi(longitude, n) {
  const lon = ((longitude % 360) + 360) % 360;
  const sign = Math.floor(lon / 30);
  const deg = lon - sign * 30;
  const odd = sign % 2 === 0;
  const part = Math.min(n - 1, Math.floor(deg / (30 / n)));
  switch (n) {
    case 1: return sign;
    case 2: return odd ? (deg < 15 ? 4 : 3) : (deg < 15 ? 3 : 4);
    case 3: return mod12(sign + part * 4);
    case 4: return mod12(sign + part * 3);
    case 7: return mod12((odd ? sign : sign + 6) + part);
    case 9: return Math.floor(lon / (30 / 9)) % 12;
    case 10: return mod12((odd ? sign : sign + 8) + part);
    case 12: return mod12(sign + part);
    case 16: return mod12([0, 4, 8][sign % 3] + part);
    case 20: return mod12([0, 8, 4][sign % 3] + part);
    case 24: return mod12((odd ? 4 : 3) + part);
    case 30: return (odd ? D30_ODD : D30_EVEN).find(([lim]) => deg < lim)?.[1] ?? (odd ? 6 : 7);
    case 60: return mod12(Math.floor(deg * 2) + sign);
    default: throw new Error(`Unsupported varga D${n}`);
  }
}

/** Divisional chart: 12 arrays (by sign index) of planet keys, like buildCharts().rasi. */
export function vargaChart(chart, n) {
  const houses = Array.from({ length: 12 }, () => []);
  for (const [k, p] of Object.entries(chart.planets)) houses[vargaRasi(p.longitude, n)].push(k);
  return houses;
}

/** Planets (and Lagna) occupying the same sign in D1 and D9. */
export function vargottama(chart) {
  return Object.entries(chart.planets).filter(([, p]) => p.rasi === vargaRasi(p.longitude, 9)).map(([k]) => k);
}

// ---------------------------------------------------------------- Ashtakavarga
export const AV_PLANETS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
const CONTRIB = [...AV_PLANETS, 'Lagna'];

// Benefic places (houses counted from each contributor) — BPHS Ashtakavarga chapter.
export const AV_TABLES = {
  Sun: {
    Sun: [1, 2, 4, 7, 8, 9, 10, 11], Moon: [3, 6, 10, 11], Mars: [1, 2, 4, 7, 8, 9, 10, 11], Mercury: [3, 5, 6, 9, 10, 11, 12],
    Jupiter: [5, 6, 9, 11], Venus: [6, 7, 12], Saturn: [1, 2, 4, 7, 8, 9, 10, 11], Lagna: [3, 4, 6, 10, 11, 12],
  }, // 48
  Moon: {
    Sun: [3, 6, 7, 8, 10, 11], Moon: [1, 3, 6, 7, 10, 11], Mars: [2, 3, 5, 6, 9, 10, 11], Mercury: [1, 3, 4, 5, 7, 8, 10, 11],
    Jupiter: [1, 4, 7, 8, 10, 11, 12], Venus: [3, 4, 5, 7, 9, 10, 11], Saturn: [3, 5, 6, 11], Lagna: [3, 6, 10, 11],
  }, // 49
  Mars: {
    Sun: [3, 5, 6, 10, 11], Moon: [3, 6, 11], Mars: [1, 2, 4, 7, 8, 10, 11], Mercury: [3, 5, 6, 11],
    Jupiter: [6, 10, 11, 12], Venus: [6, 8, 11, 12], Saturn: [1, 4, 7, 8, 9, 10, 11], Lagna: [1, 3, 6, 10, 11],
  }, // 39
  Mercury: {
    Sun: [5, 6, 9, 11, 12], Moon: [2, 4, 6, 8, 10, 11], Mars: [1, 2, 4, 7, 8, 9, 10, 11], Mercury: [1, 3, 5, 6, 9, 10, 11, 12],
    Jupiter: [6, 8, 11, 12], Venus: [1, 2, 3, 4, 5, 8, 9, 11], Saturn: [1, 2, 4, 7, 8, 9, 10, 11], Lagna: [1, 2, 4, 6, 8, 10, 11],
  }, // 54
  Jupiter: {
    Sun: [1, 2, 3, 4, 7, 8, 9, 10, 11], Moon: [2, 5, 7, 9, 11], Mars: [1, 2, 4, 7, 8, 10, 11], Mercury: [1, 2, 4, 5, 6, 9, 10, 11],
    Jupiter: [1, 2, 3, 4, 7, 8, 10, 11], Venus: [2, 5, 6, 9, 10, 11], Saturn: [3, 5, 6, 12], Lagna: [1, 2, 4, 5, 6, 7, 9, 10, 11],
  }, // 56
  Venus: {
    Sun: [8, 11, 12], Moon: [1, 2, 3, 4, 5, 8, 9, 11, 12], Mars: [3, 5, 6, 9, 11, 12], Mercury: [3, 5, 6, 9, 11],
    Jupiter: [5, 8, 9, 10, 11], Venus: [1, 2, 3, 4, 5, 8, 9, 10, 11], Saturn: [3, 4, 5, 8, 9, 10, 11], Lagna: [1, 2, 3, 4, 5, 8, 9, 11],
  }, // 52
  Saturn: {
    Sun: [1, 2, 4, 7, 8, 10, 11], Moon: [3, 6, 11], Mars: [3, 5, 6, 10, 11, 12], Mercury: [6, 8, 9, 10, 11, 12],
    Jupiter: [5, 6, 11, 12], Venus: [6, 11, 12], Saturn: [3, 5, 6, 11], Lagna: [1, 3, 4, 6, 10, 11],
  }, // 39
};

/** Bhinnashtakavarga (per planet) and Sarvashtakavarga, indexed by sign (0 = Mesha). */
export function ashtakavarga(chart) {
  const bav = {};
  for (const p of AV_PLANETS) {
    const row = Array(12).fill(0);
    for (const c of CONTRIB) {
      const from = chart.planets[c]?.rasi;
      if (from == null) continue;
      for (const h of AV_TABLES[p][c]) row[mod12(from + h - 1)] += 1;
    }
    bav[p] = row;
  }
  const sav = Array.from({ length: 12 }, (_, i) => AV_PLANETS.reduce((s, p) => s + bav[p][i], 0));
  return { bav, sav, total: sav.reduce((a, b) => a + b, 0) };
}

const HOUSE_TOPIC = [
  { en: 'self, health and personality', ta: 'தன்னம்பிக்கை, உடல்நலம், தோற்றம்' },
  { en: 'money, family and speech', ta: 'பணம், குடும்பம், பேச்சு' },
  { en: 'courage, siblings and short travel', ta: 'தைரியம், உடன்பிறப்பு, குறுகிய பயணம்' },
  { en: 'home, mother, vehicles and peace', ta: 'வீடு, தாய், வாகனம், மன அமைதி' },
  { en: 'children, intelligence and merit', ta: 'குழந்தைகள், புத்தி, பூர்வ புண்ணியம்' },
  { en: 'debts, disease and competition', ta: 'கடன், நோய், போட்டி' },
  { en: 'marriage and partnership', ta: 'திருமணம், கூட்டாண்மை' },
  { en: 'longevity and sudden events', ta: 'ஆயுள், திடீர் நிகழ்வுகள்' },
  { en: 'fortune, father and dharma', ta: 'பாக்கியம், தந்தை, தர்மம்' },
  { en: 'career and reputation', ta: 'தொழில், புகழ்' },
  { en: 'gains and fulfilment of wishes', ta: 'லாபம், ஆசைகள் நிறைவேறுதல்' },
  { en: 'expenses, foreign lands and liberation', ta: 'செலவு, வெளிநாடு, மோட்சம்' },
];

/**
 * House-wise Sarvashtakavarga reading (houses counted from Lagna).
 * ≥ 28 bindus strong, 25–27 average, < 25 weak.
 */
export function savInsights(chart) {
  const av = ashtakavarga(chart);
  const lagna = chart.planets.Lagna?.rasi ?? chart.lagna?.rasi ?? 0;
  const houses = Array.from({ length: 12 }, (_, i) => {
    const rasi = mod12(lagna + i);
    const bindus = av.sav[rasi];
    const level = bindus >= 28 ? 'strong' : bindus >= 25 ? 'average' : 'weak';
    const t = HOUSE_TOPIC[i];
    const note = level === 'strong'
      ? { en: `Strong — ${t.en} flourish with less effort.`, ta: `பலம் — ${t.ta} எளிதில் சிறக்கும்.` }
      : level === 'average'
        ? { en: `Average — ${t.en} give steady, mixed results.`, ta: `மத்திமம் — ${t.ta} சீரான, கலந்த பலன்.` }
        : { en: `Weak — ${t.en} need extra care and patience.`, ta: `பலவீனம் — ${t.ta} கூடுதல் கவனமும் பொறுமையும் தேவை.` };
    return { house: i + 1, rasi, bindus, level, topic: t, note };
  });
  const ranked = [...houses].sort((a, b) => b.bindus - a.bindus || a.house - b.house);
  const best = ranked.slice(0, 3).map((h) => h.house);
  const weakest = ranked.slice(-3).reverse().map((h) => h.house);
  const transit = Object.fromEntries(AV_PLANETS.map((p) => [p, {
    good: av.bav[p].map((b, i) => (b >= 4 ? i : -1)).filter((i) => i >= 0),
    poor: av.bav[p].map((b, i) => (b <= 2 ? i : -1)).filter((i) => i >= 0),
  }]));
  return {
    ...av, lagna, houses, best, weakest, transit,
    tip: {
      en: 'Transit tip: a planet moving through a sign where it has 4 or more bindus in its own Ashtakavarga gives good results; 0–2 bindus calls for caution.',
      ta: 'கோசார குறிப்பு: ஒரு கிரகம் தன் அஷ்டகவர்க்கத்தில் 4 அல்லது அதற்கு மேல் பரல்கள் உள்ள ராசியில் சஞ்சரிக்கும்போது நல்ல பலன் தரும்; 0–2 பரல்கள் என்றால் கவனம் தேவை.',
    },
  };
}
