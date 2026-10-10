// Baby-name engine: data quality, pada-sound coverage, filters and deterministic numerology scoring.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  allNames, ALL_PADAS, soundMatch, suggestNames, nameNumerology, enSound, taSound, luckSummary, DEITIES, nameId, shareText,
} from '../shared/baby-names.js';
import { nameNumber } from '../shared/numerology.js';
import { luckyNumbers } from '../shared/personal.js';

const N = allNames();
// Sounds that (almost) no names begin with; for these the star's other pada letters are used, as is customary.
const RARE = new Set(['lu', 'le', 'vu', 'vo', 'nga', 'hu', 'ho', 'do', 'to', 'nu', 'ne', 'no', 'yi', 'ye']);

test('the database has at least 2,500 names, boys and girls, without duplicates', () => {
  assert.ok(N.length >= 2500, `only ${N.length} names`);
  const boys = N.filter((n) => n.gender !== 'girl').length;
  const girls = N.filter((n) => n.gender !== 'boy').length;
  assert.ok(boys >= 1000 && girls >= 1000, `boys ${boys}, girls ${girls}`);
  const ids = new Set();
  for (const n of N) {
    const id = nameId(n);
    assert.ok(!ids.has(id), `duplicate name ${n.en}`);
    ids.add(id);
  }
});

test('every entry has Tamil script, English spelling, gender, tags and a meaning in both languages', () => {
  for (const n of N) {
    assert.match(n.en, /^[A-Za-z][A-Za-z .'-]*$/, `English spelling: ${n.en}`);
    assert.match(n.ta, /^[஀-௿ ]+$/, `Tamil script: ${n.en} → ${n.ta}`);
    assert.ok(['boy', 'girl', 'unisex'].includes(n.gender), n.en);
    assert.ok(n.tags.length > 0, `tags: ${n.en}`);
    assert.ok(n.meaning.en.length >= 3 && /[A-Za-z]/.test(n.meaning.en), `English meaning: ${n.en}`);
    assert.ok(n.meaning.ta.length >= 2 && /[஀-௿]/.test(n.meaning.ta), `Tamil meaning: ${n.en}`);
    if (n.tags.includes('god')) assert.ok(DEITIES[n.deity], `deity code for ${n.en}`);
    else assert.equal(n.deity, null, `deity without the god tag: ${n.en}`);
    assert.ok(n.enKey && n.taKey, `sound keys: ${n.en}`);
  }
  for (const style of ['god', 'classic', 'modern', 'pure-tamil']) assert.ok(N.filter((n) => n.tags.includes(style)).length >= 300, style);
  for (const d of Object.keys(DEITIES)) assert.ok(N.some((n) => n.deity === d), `no names for deity ${d}`);
});

test('sound keys follow the spoken first syllable in English and the first Tamil letter', () => {
  assert.equal(enSound('Dharun'), 'da');
  assert.equal(enSound('Krishna'), 'ki');
  assert.equal(enSound('Shyam'), 'sha');
  assert.equal(enSound('Sowmya'), 'so');
  assert.equal(enSound('Gnanam'), 'na');
  assert.equal(enSound('Hemanth'), 'he');
  assert.equal(enSound('Chha'), 'cha');
  assert.equal(taSound('கிருஷ்ணா'), 'கி');
  assert.equal(taSound('ஸ்ரீராம்'), 'சி');
  assert.equal(taSound('கௌசல்யா'), 'கோ');
  assert.equal(taSound('ஈஸ்வரன்'), 'இ');
  assert.equal(taSound('பொன்னி'), 'போ');
});

test('all 108 nakshatra-pada sounds have names for boys and girls', () => {
  assert.equal(ALL_PADAS.length, 108);
  for (const ps of ALL_PADAS) {
    const exact = N.filter((n) => soundMatch(n, ps) === 'exact');
    const b = exact.filter((n) => n.gender !== 'girl').length;
    const g = exact.filter((n) => n.gender !== 'boy').length;
    const label = `${ps.star}/${ps.pada} ${ps.en} ${ps.ta}`;
    if (!RARE.has(ps.enKey) && ps.ta !== 'ங') {
      assert.ok(b >= 6 && g >= 6, `${label}: boys ${b}, girls ${g}`);
    }
    // Whatever the letter, the screen always offers at least 8 boy and 8 girl names (pada first, then the star's other letters).
    for (const gender of ['boy', 'girl']) {
      const r = suggestNames({ star: ps.star, pada: ps.pada, gender });
      assert.ok(r.results.length >= 8, `${label} ${gender}: ${r.results.length}`);
      if (b + g === 0 || RARE.has(ps.enKey)) assert.ok(r.note, `${label}: rare letter needs an explanation`);
    }
  }
  // The owner's example: Poosam pada 2 → ஹே / He.
  const poosam = suggestNames({ star: 7, pada: 2, gender: 'boy' });
  assert.equal(poosam.pada.ta, 'ஹே');
  assert.ok(poosam.results.slice(0, 5).every((r) => r.match === 'pada' && /^He/i.test(r.name.en)), poosam.results.slice(0, 5).map((r) => r.name.en).join());
});

test('gender, style, deity and search filters', () => {
  const boys = suggestNames({ star: 0, pada: 1, gender: 'boy' }).results;
  assert.ok(boys.length && boys.every((r) => r.name.gender !== 'girl'));
  const girls = suggestNames({ star: 0, pada: 1, gender: 'girl' }).results;
  assert.ok(girls.length && girls.every((r) => r.name.gender !== 'boy'));
  for (const style of ['god', 'classic', 'modern', 'pure-tamil']) {
    const r = suggestNames({ star: 2, pada: 1, style }).results;
    assert.ok(r.length > 0 && r.every((x) => x.name.tags.includes(style)), style);
  }
  const mu = suggestNames({ star: null, style: 'god', deity: 'mu' }).results;
  assert.ok(mu.length >= 50 && mu.every((x) => x.name.deity === 'mu'));
  const q = suggestNames({ query: 'lotus' }).results;
  assert.ok(q.length >= 10 && q.every((x) => /lotus/i.test(x.name.meaning.en) || /lotus/i.test(x.name.en)));
  const qt = suggestNames({ query: 'முருகன்' }).results;
  assert.ok(qt.length >= 10);
});

test('numerology scoring is deterministic and never shows unsuitable names', () => {
  const date = '2024-05-14'; // birth 5, destiny 7
  const ln = luckyNumbers(date);
  const a = suggestNames({ star: 10, pada: 3, date, gender: 'girl' });
  const b = suggestNames({ star: 10, pada: 3, date, gender: 'girl' });
  assert.deepEqual(a.results.map((r) => r.id), b.results.map((r) => r.id));
  for (const r of a.results) {
    assert.notEqual(r.num.level, 'avoid', r.name.en);
    assert.ok(!ln.avoid.includes(r.num.single) || r.num.level !== 'avoid');
    assert.equal(r.num.single, nameNumber(r.name.en).single);
  }
  // Within the pada-letter names, excellent ones come before good, before neutral.
  const order = { excellent: 0, good: 1, neutral: 2 };
  const pada = a.results.filter((r) => r.match === 'pada').map((r) => order[r.num.level]);
  assert.deepEqual(pada, [...pada].sort((x, y) => x - y));

  const ex = nameNumerology('Sowmya', date);
  assert.equal(ex.single, nameNumber('Sowmya').single);
  const lvl = ex.single === ln.birth || ex.single === ln.destiny ? 'excellent' : ln.lucky.includes(ex.single) ? 'good' : ln.avoid.includes(ex.single) ? 'avoid' : 'neutral';
  if (![12, 16, 18, 26, 29, 43].includes(ex.compound)) assert.equal(ex.level, lvl);
  assert.ok(ex.reason.en && ex.reason.ta);
  // The initial is added to the total.
  const withIni = nameNumerology('Sowmya', date, 'R');
  assert.equal(withIni.compound, nameNumber('Sowmya').compound + nameNumber('R').compound);
  assert.match(withIni.reason.ta, /இனிஷியல்|பெயர் எண்/);
});

test('luck summary lists birth, destiny and lucky numbers with matching letters', () => {
  const s = luckSummary('2024-05-14', 7, 2);
  assert.equal(s.birth, 5);
  assert.equal(s.primary.ta, 'ஹே');
  assert.equal(s.starLetters.length, 4);
  assert.ok(s.letters.includes('E') && s.letters.includes('H'));
  const text = shareText(suggestNames({ star: 7, pada: 2 }).results.slice(0, 3), 'ta');
  assert.equal(text.split('\n').length, 3);
});

test('name search forgives common English misspellings only when nothing matches exactly', async () => {
  const { suggestNames, looseKey } = await import('../shared/baby-names.js');
  assert.equal(looseKey('Murugan'), looseKey('murgan'));
  assert.ok(suggestNames({ query: 'murgan' }).results.some((r) => r.name.en === 'Murugan'));
  assert.ok(suggestNames({ query: 'kartik' }).results.some((r) => /^Karthik/.test(r.name.en)));
  // An exact hit keeps the strict list (no loose extras).
  assert.ok(suggestNames({ query: 'Karthik' }).results.every((r) => /karthi/i.test(r.name.en) || /karthi/i.test(r.name.meaning.en)));
  assert.equal(suggestNames({ query: 'xyzzy' }).results.length, 0);
});
