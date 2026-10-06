// உங்களுக்கு சாதகமானவர்கள் — who suits you: favourable birth stars (nakshatras) and rasis for friends,
// business partners and (adults only) a marriage partner, plus the favourable planets of the chart with simple tips.
// Everything comes from the person's janma (birth) chart with traditional, explainable rules; pure and deterministic
// (no clock, no randomness), so it runs the same on the phone (offline) and in tests.
//
// METHOD
// 1. Tara bala (தாரா பலம்) — count from the person's janma nakshatra to the other star (1–27) and reduce to the nine
//    groups (count − 1) % 9 + 1:
//      1 Janma (neutral) · 2 Sampat (wealth, favourable) · 3 Vipat (less) · 4 Kshema (well-being, favourable) ·
//      5 Pratyak (less) · 6 Sadhana (achievement, favourable) · 7 Vadha / Naidhana (less) · 8 Mitra (friend,
//      favourable) · 9 Parama Mitra (close friend, favourable).
//    Friendship is mutual, so the reverse count (their star → yours) is added at half weight.
//    Friends weight Mitra / Parama Mitra highest; business weights Sampat / Sadhana highest.
// 2. Rasi relationship — position of the other rasi counted from the janma rasi (1–12):
//    good 1 (same sign), 5 / 9 (trine) and 3 / 11 (companions / gains); 7 complements; 6 / 8 are the least helpful;
//    for marriage 2 / 12 are also left out (as in the Rasi porutham).
// 3. Rasi lords — natural (naisargika) friendship of the two rasi lords: friends +, enemies −.
// 4. Marriage (18+ only, shared/age-guard.js) — the 10-porutham engine (shared/porutham.js matchPorutham) is run for
//    every star of the opposite gender in each rasi that star touches (gender-aware: a woman's chart is the bride and
//    lists groom stars; a man's chart is the groom and lists bride stars). Stars with a Rajju / Vedhai mismatch are
//    not listed; the rest are ranked by porutham score, then Tara bala; the top six are shown with a short reason.
// 5. Favourable planets — Lagna lord, yogakaraka and functional benefics from shared/analysis.js houseRoles
//    (the per-Lagna Parashari table in shared/rules/roles.js). Without a birth time the Moon sign is used as the
//    reference (Chandra Lagna, labelled). Tips: the planet's colour, weekday and number (shared/personal.js).
//
// Wording is positive by design: stars that fit less are never shown as "avoid this person" — at most
// "குறைந்த பொருத்தம்" (lower match). Compatibility between people is never decided by stars alone.
import { NAKSHATRAS, RASIS, PLANETS, WEEKDAYS } from './astro.js';
import { matchPorutham } from './porutham.js';
import { houseRoles } from './analysis.js';
import { FUNCTIONAL_TABLE } from './rules/roles.js';
import { topicAllowed } from './age-guard.js';
import { PLANET_COLOR, PLANET_NUMBER, luckyNumbers } from './personal.js';

export const COMPAT_VERSION = 'compat-2026.10-v1';
const T = (en, ta) => ({ en, ta });

// ------------------------------------------------------------------ Tara bala
export const TARA_GROUPS = [
  { group: 1, key: 'janma', kind: 'neutral', ...T('Janma', 'ஜன்ம'), mean: T('same nature', 'ஒத்த இயல்பு') },
  { group: 2, key: 'sampat', kind: 'good', ...T('Sampat', 'சம்பத்'), mean: T('brings prosperity', 'செல்வம் சேர்க்கும்') },
  { group: 3, key: 'vipat', kind: 'low', ...T('Vipat', 'விபத்'), mean: T('lower match', 'குறைந்த பொருத்தம்') },
  { group: 4, key: 'kshema', kind: 'good', ...T('Kshema', 'க்ஷேம'), mean: T('well-being and care', 'நலம், அக்கறை') },
  { group: 5, key: 'pratyak', kind: 'low', ...T('Pratyak', 'பிரத்யக்'), mean: T('lower match', 'குறைந்த பொருத்தம்') },
  { group: 6, key: 'sadhana', kind: 'good', ...T('Sadhana', 'சாதக'), mean: T('helps achieve goals', 'காரிய சித்தி') },
  { group: 7, key: 'vadha', kind: 'low', ...T('Vadha', 'வதை'), mean: T('lower match', 'குறைந்த பொருத்தம்') },
  { group: 8, key: 'mitra', kind: 'good', ...T('Mitra', 'மித்ர'), mean: T('friendly', 'நட்பு') },
  { group: 9, key: 'parama_mitra', kind: 'good', ...T('Parama Mitra', 'பரம மித்ர'), mean: T('a close, trusted friend', 'நெருங்கிய நட்பு') },
];

/** Tara from star `from` to star `to` (0–26): { count 1–27, group 1–9, key, kind, en, ta, mean }. */
export function taraOf(from, to) {
  const count = ((to - from + 27) % 27) + 1;
  return { count, ...TARA_GROUPS[(count - 1) % 9] };
}

const TARA_WEIGHT = {
  friends: { janma: 1.5, sampat: 3, kshema: 3, sadhana: 3, mitra: 4, parama_mitra: 4, vipat: 0, pratyak: 0, vadha: 0 },
  business: { janma: 1.5, sampat: 4, kshema: 3, sadhana: 4, mitra: 3, parama_mitra: 3, vipat: 0, pratyak: 0, vadha: 0 },
};

// ------------------------------------------------------------------ rasi relationship
const FRIENDS = {
  Sun: { f: ['Moon', 'Mars', 'Jupiter'], e: ['Venus', 'Saturn'] },
  Moon: { f: ['Sun', 'Mercury'], e: [] },
  Mars: { f: ['Sun', 'Moon', 'Jupiter'], e: ['Mercury'] },
  Mercury: { f: ['Sun', 'Venus'], e: ['Moon'] },
  Jupiter: { f: ['Sun', 'Moon', 'Mars'], e: ['Mercury', 'Venus'] },
  Venus: { f: ['Mercury', 'Saturn'], e: ['Sun', 'Moon'] },
  Saturn: { f: ['Mercury', 'Venus'], e: ['Sun', 'Moon', 'Mars'] },
};
/** Natural friendship of two rasi lords: 1 friends (or the same lord), -1 enemies (either way), 0 neutral. */
export function lordFriendship(a, b) {
  if (a === b) return 1;
  const ab = FRIENDS[a].f.includes(b) ? 1 : FRIENDS[a].e.includes(b) ? -1 : 0;
  const ba = FRIENDS[b].f.includes(a) ? 1 : FRIENDS[b].e.includes(a) ? -1 : 0;
  return ab === -1 || ba === -1 ? -1 : ab === 1 && ba === 1 ? 1 : 0;
}
/** Position of rasi `to` counted from rasi `from` (1–12). */
export const rasiPosition = (from, to) => ((to - from + 12) % 12) + 1;

const POS_WEIGHT = {
  friends: { 1: 2, 2: 1, 3: 3, 4: 1, 5: 3, 6: 0, 7: 2, 8: 0, 9: 3, 10: 1, 11: 3, 12: 1 },
  business: { 1: 2, 2: 1, 3: 3, 4: 1, 5: 2, 6: 0, 7: 2, 8: 0, 9: 2, 10: 2, 11: 4, 12: 1 },
};
const POS_TEXT = {
  1: T('same rasi — similar outlook', 'அதே ராசி — ஒத்த பார்வை'),
  3: T('3rd — supportive companion', '3-ம் ராசி — துணை நிற்பவர்'),
  5: T('5th (trine) — easy understanding', '5-ம் ராசி (திரிகோணம்) — எளிதில் புரிதல்'),
  7: T('7th — complements you', '7-ம் ராசி — நிறைவு செய்பவர்'),
  9: T('9th (trine) — good fortune together', '9-ம் ராசி (திரிகோணம்) — சேர்ந்தால் நல்ல பாக்கியம்'),
  10: T('10th — good for work together', '10-ம் ராசி — சேர்ந்து உழைக்க நல்லது'),
  11: T('11th — gains and friendship', '11-ம் ராசி — லாபம், நட்பு'),
  4: T('4th — comfortable', '4-ம் ராசி — இணக்கம்'),
};

/** The rasi a star mostly lies in (the one holding its midpoint) and every rasi it touches (by pada). */
const starRasi = (s) => Math.floor((s * 4 + 2) / 9);
const starRasis = (s) => [...new Set([0, 1, 2, 3].map((p) => Math.floor((s * 4 + p) / 9)))];

const nak = (i) => ({ index: i, en: NAKSHATRAS[i].en, ta: NAKSHATRAS[i].ta });
const ras = (i) => ({ index: i, en: RASIS[i].en, ta: RASIS[i].ta, lord: RASIS[i].lord });
const join = (parts) => T(parts.map((p) => p.en).join(' · '), parts.map((p) => p.ta).join(' · '));

/** Star ranking for friends or business: mutual Tara bala + rasi-lord friendship. */
function rankStars(star, rasi, kind, top) {
  const w = TARA_WEIGHT[kind];
  const myLord = RASIS[rasi].lord;
  return NAKSHATRAS.map((n) => {
    const there = taraOf(star, n.index), back = taraOf(n.index, star);
    const rel = lordFriendship(myLord, RASIS[starRasi(n.index)].lord);
    const score = w[there.key] + 0.5 * w[back.key] + 0.5 * rel;
    const reason = [{ en: `${there.en} tara — ${there.mean.en}`, ta: `${there.ta} தாரை — ${there.mean.ta}` }];
    if (back.kind === 'good') reason.push(T('good both ways', 'இருவருக்கும் சாதகம்'));
    return { ...nak(n.index), tara: there.key, score, reason: join(reason) };
  }).filter((x) => x.index !== star || kind === 'friends')
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, top);
}

/** Rasi ranking for friends / business: position from the janma rasi + lord friendship. */
function rankRasis(rasi, kind, top) {
  const myLord = RASIS[rasi].lord;
  return RASIS.map((r, i) => {
    const pos = rasiPosition(rasi, i);
    const rel = lordFriendship(myLord, r.lord);
    const score = POS_WEIGHT[kind][pos] + 0.75 * rel;
    const reason = [POS_TEXT[pos] || T(`${pos}th from yours`, `உங்கள் ராசியிலிருந்து ${pos}`)];
    if (rel === 1 && r.lord !== myLord) reason.push(T(`lords ${myLord} & ${r.lord} are friends`, `அதிபதிகள் ${PLANETS[myLord].ta} – ${PLANETS[r.lord].ta} நட்பு`));
    return { ...ras(i), position: pos, score, reason: join(reason) };
  }).filter((x) => x.score >= 2)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, top);
}

// ------------------------------------------------------------------ marriage (porutham engine)
const GOOD = 'uttamam';
const SHORT = { dina: T('Dina', 'தினம்'), gana: T('Gana', 'கணம்'), yoni: T('Yoni', 'யோனி'), rasi: T('Rasi', 'ராசி'), rajju: T('Rajju', 'ரஜ்ஜு'), mahendra: T('Mahendra', 'மகேந்திரம்'), stree: T('Stree Deergham', 'ஸ்திரீ தீர்க்கம்'), athipathi: T('Rasi lord', 'ராசி அதிபதி'), vasya: T('Vasya', 'வசியம்'), vedhai: T('Vedhai', 'வேதை') };

/**
 * Marriage stars for one person. gender 'female' → the person is the bride and the list holds groom stars;
 * 'male' → the person is the groom and the list holds bride stars. Each candidate star is matched in every rasi it
 * touches with matchPorutham; the best rasi is kept. Returns { seeking, stars (top N), rasis, lowerCount }.
 */
export function marriageStars(star, rasi, gender, { top = 6 } = {}) {
  const isBride = gender === 'female';
  const me = { star, rasi };
  const cands = [];
  for (let s = 0; s < 27; s++) {
    let best = null;
    for (const r of starRasis(s)) {
      const other = { star: s, rasi: r };
      const m = isBride ? matchPorutham(me, other) : matchPorutham(other, me);
      if (!best || (best.m.criticalFail && !m.criticalFail) || (best.m.criticalFail === m.criticalFail && m.score > best.m.score)) best = { r, m };
    }
    cands.push({ s, ...best });
  }
  const tara = (s) => (taraOf(star, s).kind === 'good' ? 1 : 0);
  const ok = cands.filter((c) => !c.m.criticalFail)
    .sort((a, b) => b.m.score - a.m.score || tara(b.s) - tara(a.s) || a.s - b.s);
  const stars = ok.slice(0, top).map(({ s, r, m }) => {
    const good = m.rows.filter((x) => x.status === GOOD && (x.importance !== 'normal' || x.key === 'mahendra')).map((x) => SHORT[x.key]);
    return {
      ...nak(s), rasi: ras(r), score: m.score, outOf: m.outOf, verdict: m.verdict,
      reason: T(`${m.score}/10 poruthams${good.length ? ` · ${good.slice(0, 4).map((g) => g.en).join(', ')} match` : ''}`,
        `10-க்கு ${m.score} பொருத்தம்${good.length ? ` · ${good.slice(0, 4).map((g) => g.ta).join(', ')} பொருத்தம் உண்டு` : ''}`),
    };
  });
  // Rasis of the other person from the Rasi, Rasi-lord and Vasya poruthams (they depend on the rasis only).
  const rasis = RASIS.map((x, i) => {
    const m = isBride ? matchPorutham(me, { star: 0, rasi: i }) : matchPorutham({ star: 0, rasi: i }, me);
    const row = (k) => m.rows.find((y) => y.key === k);
    const val = (k) => (row(k).status === GOOD ? 1 : row(k).status === 'madhyamam' ? 0.5 : 0);
    const pos = rasiPosition(rasi, i);
    const bad = row('rasi').status === 'poruthamillai' || [2, 6, 8, 12].includes(pos);
    const score = 2 * val('rasi') + val('athipathi') + val('vasya') + (pos === 7 ? 0.5 : 0);
    const parts = [POS_TEXT[pos] || T(`${pos}th from yours`, `உங்கள் ராசியிலிருந்து ${pos}`)];
    if (val('athipathi') === 1) parts.push(T('rasi lords agree', 'ராசி அதிபதி பொருத்தம்'));
    if (val('vasya') === 1) parts.push(T('Vasya porutham', 'வசியப் பொருத்தம்'));
    return { ...ras(i), position: pos, score, bad, reason: join(parts) };
  }).filter((x) => !x.bad).sort((a, b) => b.score - a.score || a.index - b.index).slice(0, 4);
  return { seeking: isBride ? 'groom' : 'bride', stars, rasis, lowerCount: cands.length - ok.length };
}

// ------------------------------------------------------------------ favourable planets
const ROLE_TEXT = {
  lagna_lord: T('Lagna lord', 'லக்னாதிபதி'),
  moon_lord: T('Rasi lord (Moon sign)', 'ராசி அதிபதி (சந்திர லக்னம்)'),
  yogakaraka: T('Yogakaraka', 'யோககாரகன்'),
  benefic: T('Functional benefic', 'சுப பலன் தரும் கிரகம்'),
};

/** Lagna lord, yogakaraka and functional benefics (Moon sign as reference when the birth time is unknown). */
export function favourablePlanets(chart) {
  let ref, lagnaKnown = false, row;
  const roles = chart.planets?.Lagna ? houseRoles(chart) : { available: false };
  if (roles.available) {
    lagnaKnown = true; ref = roles.lagna;
    row = roles.kendradhipathya.functional;
  } else {
    ref = chart.janmaRasi.index;
    const t = FUNCTIONAL_TABLE[ref];
    row = { benefics: t.benefics, yogakaraka: t.yogakaraka };
  }
  const out = [];
  const add = (planet, role) => {
    const have = out.find((x) => x.planet === planet);
    if (have) { if (!have.roles.includes(role)) have.roles.push(role); return; }
    out.push({ planet, roles: [role] });
  };
  add(RASIS[ref].lord, lagnaKnown ? 'lagna_lord' : 'moon_lord');
  for (const p of row.yogakaraka || []) add(p, 'yogakaraka');
  for (const p of row.benefics || []) add(p, 'benefic');
  const planets = out.slice(0, 3).map((x) => {
    const c = PLANET_COLOR[x.planet];
    const wd = WEEKDAYS.find((w) => w.lord === x.planet);
    return {
      ...x, name: T(x.planet, PLANETS[x.planet].ta), label: join(x.roles.map((r) => ROLE_TEXT[r])),
      colour: c ? { en: c.en, ta: c.ta, hex: c.hex } : null, day: wd ? T(wd.en, wd.ta) : null, number: PLANET_NUMBER[x.planet] ?? null,
    };
  });
  let lucky = null;
  try { lucky = chart.date ? luckyNumbers(chart.date).lucky : null; } catch { lucky = null; }
  return { reference: lagnaKnown ? 'lagna' : 'moon', planets, luckyNumbers: lucky };
}

// ------------------------------------------------------------------ the whole card
/**
 * Who suits you, for one chart.
 * @param chart    birth chart (shared/astro.js birthChart / chartOf)
 * @param opts.gender   'male' | 'female' (marriage list is gender-aware; without it no marriage list)
 * @param opts.profile  age profile from shared/age-guard.js ageProfile — marriage and business only for adults;
 *                      minors get friends / study companions only (children under 6: planets and tips only).
 * @returns {{ version, person, sections: Array<{key,title,stars,rasis,note?}>, planets, minor, adult }}
 */
export function compatibility(chart, { gender = null, profile = null, top = 6 } = {}) {
  const star = chart.janmaNakshatra.index, rasi = chart.janmaRasi.index;
  const p = profile || { band: 'unknown', minor: null, adult: false };
  const sections = [];
  if (topicAllowed('friendship', p)) {
    sections.push({
      key: p.adult ? 'friends' : 'study',
      title: p.adult ? T('Friends', 'நண்பர்கள்') : T('Friends & study companions', 'நண்பர்கள் & படிப்புத் துணை'),
      stars: rankStars(star, rasi, 'friends', top), rasis: rankRasis(rasi, 'friends', 4),
    });
  }
  if (p.adult && topicAllowed('business', p)) {
    sections.push({ key: 'business', title: T('Business partners', 'வணிகக் கூட்டாளிகள்'), stars: rankStars(star, rasi, 'business', top), rasis: rankRasis(rasi, 'business', 4) });
  }
  if (p.adult && topicAllowed('marriage', p)) {
    if (gender === 'male' || gender === 'female') {
      const m = marriageStars(star, rasi, gender, { top });
      sections.push({
        key: 'marriage', seeking: m.seeking,
        title: gender === 'female' ? T('Marriage — groom’s star', 'திருமணம் — மணமகன் நட்சத்திரம்') : T('Marriage — bride’s star', 'திருமணம் — மணமகள் நட்சத்திரம்'),
        stars: m.stars, rasis: m.rasis,
        note: T('From the 10-porutham check; a full match of both charts is still needed.', '10 பொருத்த முறைப்படி; இருவரின் முழு ஜாதகப் பொருத்தமும் பார்க்க வேண்டும்.'),
      });
    } else {
      sections.push({ key: 'marriage', stars: [], rasis: [], title: T('Marriage', 'திருமணம்'), note: T('Add gender in the profile to see marriage stars.', 'திருமண நட்சத்திரங்களைப் பார்க்க சுயவிவரத்தில் பாலினத்தைச் சேர்க்கவும்.') });
    }
  }
  return {
    version: COMPAT_VERSION, person: { star: nak(star), rasi: ras(rasi) },
    sections, planets: favourablePlanets(chart), minor: !!p.minor, adult: !!p.adult,
  };
}
