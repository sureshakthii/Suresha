// Ashtakoota (36 Guna Milan) — North-Indian marriage matching used by AstroSage / Prokerala style apps.
// For NRI / inter-state marriages where the family expects a "guna score out of 36".
// Tamil tradition uses the 10 poruthams (see porutham.js); this module is complementary.
//
// Classical tables (Muhurta Chintamani / Brihat Parashara as used in common software):
//   Varna by rasi, Vashya groups, Tara (count of 9), 14 Yonis with the standard 14x14 matrix,
//   Graha Maitri from naisargika friendships of the Moon-sign lords, Gana (Deva/Manushya/Rakshasa),
//   Bhakoot (2/12, 5/9, 6/8 rasi distances) and Nadi (Adi/Madhya/Antya).
import { NAKSHATRAS, RASIS, PLANETS } from './astro.js';

const T = (en, ta) => ({ en, ta });
const PTA = (p) => PLANETS[p]?.ta || p;

// ---------------------------------------------------------------- 1. Varna (by rasi)
// 3 Brahmin (Kataka, Vrischika, Meena), 2 Kshatriya (Mesha, Simha, Dhanus),
// 1 Vaishya (Rishaba, Kanni, Makara), 0 Shudra (Mithuna, Thula, Kumbha).
const VARNA = [2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3];
const VARNA_NAMES = [T('Shudra', 'சூத்திரர்'), T('Vaishya', 'வைசியர்'), T('Kshatriya', 'க்ஷத்திரியர்'), T('Brahmin', 'பிராமணர்')];

// ---------------------------------------------------------------- 2. Vashya groups
// 0 Chatushpada (quadruped), 1 Manava (human), 2 Jalachara (water), 3 Vanachara (wild), 4 Keeta (insect).
const VASHYA_NAMES = [T('Chatushpada (quadruped)', 'நாற்கால்'), T('Manava (human)', 'மனிதர்'), T('Jalachara (water)', 'நீர்வாழ்'), T('Vanachara (wild)', 'வனவாழ்'), T('Keeta (insect)', 'கீடம்')];
// Dhanus: first half Manava, second half Chatushpada. Makara: first half Chatushpada, second half Jalachara.
// We only know the star, so: Moolam (0°–13°20' of Dhanus) → Manava, later stars → Chatushpada;
// Uthiradam in Makara (0°–10°) → Chatushpada, Thiruvonam / Avittam → Jalachara.
function vashyaGroup(rasi, star) {
  switch (rasi) {
    case 0: case 1: return 0;
    case 2: case 5: case 6: case 10: return 1;
    case 3: case 11: return 2;
    case 4: return 3;
    case 7: return 4;
    case 8: return star === 18 ? 1 : 0;
    case 9: return star === 20 ? 0 : 2;
    default: return 1;
  }
}
// Standard (symmetric) Vashya score table, max 2.
const VASHYA_SCORE = [
  [2, 1, 1, 0.5, 1],
  [1, 2, 0.5, 0, 1],
  [1, 0.5, 2, 1, 1],
  [0.5, 0, 1, 2, 0],
  [1, 1, 1, 0, 2],
];

// ---------------------------------------------------------------- 3. Tara
const TARA_NAMES = [null, T('Janma', 'ஜன்ம'), T('Sampat', 'சம்பத்'), T('Vipat', 'விபத்'), T('Kshema', 'க்ஷேம'), T('Pratyak', 'பிரத்யக்'),
  T('Sadhana', 'சாதக'), T('Naidhana', 'நைதன'), T('Mitra', 'மித்ர'), T('Parama Mitra', 'பரம மித்ர')];
const BAD_TARA = new Set([3, 5, 7]);
const taraOf = (from, to) => { const c = ((to - from + 27) % 27) + 1; return ((c - 1) % 9) + 1; };

// ---------------------------------------------------------------- 4. Yoni
export const YONIS = ['horse', 'elephant', 'sheep', 'serpent', 'dog', 'cat', 'rat', 'cow', 'buffalo', 'tiger', 'deer', 'monkey', 'mongoose', 'lion'];
const YONI_NAMES = {
  horse: T('Horse', 'குதிரை'), elephant: T('Elephant', 'யானை'), sheep: T('Sheep', 'ஆடு'), serpent: T('Serpent', 'பாம்பு'), dog: T('Dog', 'நாய்'),
  cat: T('Cat', 'பூனை'), rat: T('Rat', 'எலி'), cow: T('Cow', 'பசு'), buffalo: T('Buffalo', 'எருமை'), tiger: T('Tiger', 'புலி'), deer: T('Deer', 'மான்'),
  monkey: T('Monkey', 'குரங்கு'), mongoose: T('Mongoose', 'கீரி'), lion: T('Lion', 'சிங்கம்'),
};
// Yoni animal per nakshatra (index 0..26).
export const NAK_YONI = ['horse', 'elephant', 'sheep', 'serpent', 'serpent', 'dog', 'cat', 'sheep', 'cat', 'rat', 'rat', 'cow', 'buffalo', 'tiger',
  'buffalo', 'tiger', 'deer', 'deer', 'dog', 'monkey', 'mongoose', 'monkey', 'lion', 'horse', 'lion', 'cow', 'elephant'];
// Standard 14x14 Yoni Koota matrix, order as YONIS. Sworn enemies score 0.
export const YONI_MATRIX = [
  //Ho El Sh Se Do Ca Ra Co Bu Ti De Mo Mn Li
  [4, 2, 2, 3, 2, 2, 2, 1, 0, 1, 3, 3, 2, 1], // horse
  [2, 4, 3, 3, 2, 2, 2, 2, 3, 1, 2, 3, 2, 0], // elephant
  [2, 3, 4, 2, 1, 2, 1, 3, 3, 1, 2, 0, 3, 1], // sheep
  [3, 3, 2, 4, 2, 1, 1, 1, 1, 2, 2, 2, 0, 2], // serpent
  [2, 2, 1, 2, 4, 2, 1, 2, 2, 1, 0, 2, 1, 1], // dog
  [2, 2, 2, 1, 2, 4, 0, 2, 2, 1, 3, 3, 2, 1], // cat
  [2, 2, 1, 1, 1, 0, 4, 2, 2, 2, 2, 2, 1, 2], // rat
  [1, 2, 3, 1, 2, 2, 2, 4, 3, 0, 3, 2, 2, 1], // cow
  [0, 3, 3, 1, 2, 2, 2, 3, 4, 1, 2, 2, 2, 1], // buffalo
  [1, 1, 1, 2, 1, 1, 2, 0, 1, 4, 1, 1, 2, 1], // tiger
  [3, 2, 2, 2, 0, 3, 2, 3, 2, 1, 4, 2, 2, 1], // deer
  [3, 3, 0, 2, 2, 3, 2, 2, 2, 1, 2, 4, 3, 2], // monkey
  [2, 2, 3, 0, 1, 2, 1, 2, 2, 2, 2, 3, 4, 2], // mongoose
  [1, 0, 1, 2, 1, 1, 2, 1, 1, 1, 1, 2, 2, 4], // lion
];

// ---------------------------------------------------------------- 5. Graha Maitri (naisargika friendship)
const FRIEND = {
  Sun: { f: ['Moon', 'Mars', 'Jupiter'], e: ['Venus', 'Saturn'] },
  Moon: { f: ['Sun', 'Mercury'], e: [] },
  Mars: { f: ['Sun', 'Moon', 'Jupiter'], e: ['Mercury'] },
  Mercury: { f: ['Sun', 'Venus'], e: ['Moon'] },
  Jupiter: { f: ['Sun', 'Moon', 'Mars'], e: ['Mercury', 'Venus'] },
  Venus: { f: ['Mercury', 'Saturn'], e: ['Sun', 'Moon'] },
  Saturn: { f: ['Mercury', 'Venus'], e: ['Sun', 'Moon', 'Mars'] },
};
/** 'F' friend, 'N' neutral, 'E' enemy — how planet a regards planet b. */
export const regard = (a, b) => (a === b ? 'F' : FRIEND[a].f.includes(b) ? 'F' : FRIEND[a].e.includes(b) ? 'E' : 'N');
const MAITRI_SCORE = { FF: 5, FN: 4, NF: 4, NN: 3, FE: 1, EF: 1, NE: 0.5, EN: 0.5, EE: 0 };
const REGARD_NAMES = { F: T('friend', 'நட்பு'), N: T('neutral', 'சமம்'), E: T('enemy', 'பகை') };

// ---------------------------------------------------------------- 6. Gana
// 0 Deva, 1 Manushya, 2 Rakshasa (by nakshatra index).
export const NAK_GANA = [0, 1, 2, 1, 0, 1, 0, 0, 2, 2, 1, 1, 0, 2, 0, 2, 0, 2, 2, 1, 1, 0, 2, 2, 1, 1, 0];
const GANA_NAMES = [T('Deva', 'தேவ'), T('Manushya', 'மனித'), T('Rakshasa', 'ராட்சச')];
// Rows: bride's gana, columns: groom's gana.
const GANA_SCORE = [
  [6, 5, 1],
  [6, 6, 0],
  [0, 0, 6],
];

// ---------------------------------------------------------------- 8. Nadi
// Zig-zag in blocks of six stars: Adi, Madhya, Antya, Antya, Madhya, Adi.
export const nadiOf = (star) => [0, 1, 2, 2, 1, 0][star % 6];
const NADI_NAMES = [T('Adi (Vata)', 'ஆதி (வாதம்)'), T('Madhya (Pitta)', 'மத்ய (பித்தம்)'), T('Antya (Kapha)', 'அந்த்ய (கபம்)')];

const KOOTA_TA = { varna: 'வர்ணம்', vashya: 'வசியம்', tara: 'தாரை', yoni: 'யோனி', maitri: 'கிரக மைத்ரம்', gana: 'கணம்', bhakoot: 'பகூட்', nadi: 'நாடி' };

export const GUNA_VERDICTS = {
  excellent: T('Excellent match', 'மிகச் சிறந்த பொருத்தம்'),
  good: T('Good match', 'நல்ல பொருத்தம்'),
  average: T('Average — acceptable with care', 'சுமாரான பொருத்தம் — கவனத்துடன் ஏற்கலாம்'),
  low: T('Low — not recommended', 'குறைவு — பரிந்துரைக்கப்படவில்லை'),
};

/**
 * Ashtakoota Guna Milan. Each side: { star: 0..26, rasi: 0..11 } (Moon nakshatra and Moon sign).
 * Returns 8 rows (max 1..8 = 36 total), verdict, Nadi/Bhakoot doshas and classical cancellations.
 */
export function gunaMilan(bride, groom) {
  const bs = bride.star, gs = groom.star, br = bride.rasi, gr = groom.rasi;
  const rows = [];
  const push = (id, en, max, got, detail) => rows.push({ id, en, ta: KOOTA_TA[id], max, got, detail });
  const pair = (a, b) => T(`${a.en} – ${b.en}`, `${a.ta} – ${b.ta}`);

  // 1. Varna — groom's varna equal or higher than bride's.
  const bv = VARNA[br], gv = VARNA[gr];
  push('varna', 'Varna', 1, gv >= bv ? 1 : 0, pair(VARNA_NAMES[bv], VARNA_NAMES[gv]));

  // 2. Vashya
  const bw = vashyaGroup(br, bs), gw = vashyaGroup(gr, gs);
  push('vashya', 'Vashya', 2, VASHYA_SCORE[bw][gw], pair(VASHYA_NAMES[bw], VASHYA_NAMES[gw]));

  // 3. Tara — counted both ways; 1.5 for each auspicious direction.
  const t1 = taraOf(bs, gs), t2 = taraOf(gs, bs);
  const tara = (BAD_TARA.has(t1) ? 0 : 1.5) + (BAD_TARA.has(t2) ? 0 : 1.5);
  push('tara', 'Tara', 3, tara, T(`Bride→groom: ${TARA_NAMES[t1].en} (${t1}), groom→bride: ${TARA_NAMES[t2].en} (${t2})`,
    `பெண்→ஆண்: ${TARA_NAMES[t1].ta} (${t1}), ஆண்→பெண்: ${TARA_NAMES[t2].ta} (${t2})`));

  // 4. Yoni
  const by = NAK_YONI[bs], gy = NAK_YONI[gs];
  push('yoni', 'Yoni', 4, YONI_MATRIX[YONIS.indexOf(by)][YONIS.indexOf(gy)], pair(YONI_NAMES[by], YONI_NAMES[gy]));

  // 5. Graha Maitri
  const bl = RASIS[br].lord, gl = RASIS[gr].lord;
  const r1 = regard(bl, gl), r2 = regard(gl, bl);
  const maitri = bl === gl ? 5 : MAITRI_SCORE[r1 + r2];
  push('maitri', 'Graha Maitri', 5, maitri, bl === gl
    ? T(`Same lord (${bl})`, `ஒரே அதிபதி (${PTA(bl)})`)
    : T(`${bl} – ${gl} (${REGARD_NAMES[r1].en} / ${REGARD_NAMES[r2].en})`, `${PTA(bl)} – ${PTA(gl)} (${REGARD_NAMES[r1].ta} / ${REGARD_NAMES[r2].ta})`));

  // 6. Gana
  const bg = NAK_GANA[bs], gg = NAK_GANA[gs];
  push('gana', 'Gana', 6, GANA_SCORE[bg][gg], pair(GANA_NAMES[bg], GANA_NAMES[gg]));

  // 7. Bhakoot
  const d1 = ((gr - br + 12) % 12) + 1, d2 = ((br - gr + 12) % 12) + 1;
  const badPair = [[2, 12], [5, 9], [6, 8]].find(([a, b]) => (d1 === a && d2 === b) || (d1 === b && d2 === a));
  push('bhakoot', 'Bhakoot', 7, badPair ? 0 : 7, T(`Rasis ${d1}/${d2} from each other${badPair ? ` (${badPair.join('/')} dosha)` : ''}`,
    `ராசிகள் ஒன்றுக்கொன்று ${d1}/${d2}${badPair ? ` (${badPair.join('/')} தோஷம்)` : ''}`));

  // 8. Nadi
  const bn = nadiOf(bs), gn = nadiOf(gs);
  push('nadi', 'Nadi', 8, bn === gn ? 0 : 8, pair(NADI_NAMES[bn], NADI_NAMES[gn]));

  const total = rows.reduce((s, r) => s + r.got, 0);
  const verdict = total >= 28 ? 'excellent' : total >= 24 ? 'good' : total >= 18 ? 'average' : 'low';
  const doshas = { nadi: bn === gn, bhakoot: !!badPair };

  // Classical cancellations (parihara).
  const cancellations = [];
  const lordsFriendly = bl === gl || (r1 === 'F' && r2 === 'F');
  if (doshas.nadi) {
    if (br === gr && bs !== gs) cancellations.push(T('Nadi dosha cancelled: same rasi, different stars.', 'நாடி தோஷம் நீங்கும்: ஒரே ராசி, வெவ்வேறு நட்சத்திரங்கள்.'));
    else if (bs === gs && br !== gr) cancellations.push(T('Nadi dosha cancelled: same star, different rasis.', 'நாடி தோஷம் நீங்கும்: ஒரே நட்சத்திரம், வெவ்வேறு ராசிகள்.'));
    else if (lordsFriendly && bs !== gs) cancellations.push(T('Nadi dosha reduced: Moon-sign lords are the same or mutual friends.', 'நாடி தோஷம் குறையும்: ராசி அதிபதிகள் ஒன்றே அல்லது பரஸ்பர நண்பர்கள்.'));
  }
  if (doshas.bhakoot) {
    if (bl === gl) cancellations.push(T(`Bhakoot dosha cancelled: both rasis are ruled by ${bl}.`, `பகூட் தோஷம் நீங்கும்: இரு ராசிகளுக்கும் அதிபதி ${PTA(bl)}.`));
    else if (lordsFriendly) cancellations.push(T('Bhakoot dosha cancelled: rasi lords are mutual friends.', 'பகூட் தோஷம் நீங்கும்: ராசி அதிபதிகள் பரஸ்பர நண்பர்கள்.'));
    else if (bn !== gn && tara === 3) cancellations.push(T('Bhakoot dosha reduced: Nadi and Tara both agree.', 'பகூட் தோஷம் குறையும்: நாடி, தாரை இரண்டும் பொருந்துகின்றன.'));
  }

  return {
    rows, total, max: 36, verdict, doshas, cancellations,
    bride: { star: NAKSHATRAS[bs], rasi: RASIS[br], yoni: YONI_NAMES[by], gana: GANA_NAMES[bg], nadi: NADI_NAMES[bn], varna: VARNA_NAMES[bv] },
    groom: { star: NAKSHATRAS[gs], rasi: RASIS[gr], yoni: YONI_NAMES[gy], gana: GANA_NAMES[gg], nadi: NADI_NAMES[gn], varna: VARNA_NAMES[gv] },
  };
}
