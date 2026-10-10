import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gunaMilan, YONI_MATRIX, NAK_YONI, NAK_GANA, nadiOf } from '../shared/ashtakoota.js';
import { nameNumber, compoundMeaning, nameAdvice, mobileNumberLuck, vehicleNumberLuck } from '../shared/numerology.js';
import { luckyNumbers } from '../shared/personal.js';

const rasiOf = (star, pada = 1) => Math.floor((star * 4 + (pada - 1)) / 9);
const side = (star, pada = 1) => ({ star, rasi: rasiOf(star, pada) });
const row = (r, id) => r.rows.find((x) => x.id === id);

test('Guna Milan: structure, maxima sum to 36, Tamil names', () => {
  const r = gunaMilan(side(0), side(1));
  assert.equal(r.rows.length, 8);
  assert.deepEqual(r.rows.map((x) => x.id), ['varna', 'vashya', 'tara', 'yoni', 'maitri', 'gana', 'bhakoot', 'nadi']);
  assert.deepEqual(r.rows.map((x) => x.max), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(r.max, 36);
  assert.equal(r.rows.find((x) => x.id === 'nadi').ta, 'நாடி');
  assert.equal(r.rows.find((x) => x.id === 'maitri').ta, 'கிரக மைத்ரம்');
  for (const x of r.rows) { assert.ok(x.detail.en && x.detail.ta); assert.ok(x.got >= 0 && x.got <= x.max); }
});

test('Same nakshatra & rasi → Nadi 0 and Nadi dosha (no cancellation)', () => {
  const r = gunaMilan(side(3), side(3));
  assert.equal(row(r, 'nadi').got, 0);
  assert.equal(r.doshas.nadi, true);
  assert.equal(r.cancellations.length, 0);
  assert.equal(row(r, 'bhakoot').got, 7);
  assert.equal(row(r, 'yoni').got, 4);
  assert.equal(row(r, 'gana').got, 6);
  assert.equal(row(r, 'maitri').got, 5);
});

test('Nadi dosha cancelled: same rasi different stars / same star different rasi', () => {
  // Ashwini (0) and Magam (9)? different rasis. Use Thiruvathirai(5) & Punarpoosam(6) — both Adi, both Mithuna (pada 1).
  const a = gunaMilan(side(5), side(6, 1));
  assert.equal(a.doshas.nadi, true);
  assert.ok(a.cancellations.some((c) => /same rasi/.test(c.en)));
  // Krittika pada 1 (Mesha) vs Krittika pada 2 (Rishaba)
  const b = gunaMilan({ star: 2, rasi: 0 }, { star: 2, rasi: 1 });
  assert.equal(b.doshas.nadi, true);
  assert.ok(b.cancellations.some((c) => /same star/.test(c.en)));
});

test('Yoni: Ashwini (horse) / Bharani (elephant) = 2; enemies = 0; matrix symmetric', () => {
  assert.equal(NAK_YONI[0], 'horse');
  assert.equal(NAK_YONI[1], 'elephant');
  assert.equal(row(gunaMilan(side(0), side(1)), 'yoni').got, 2);
  // Ashwini (horse) vs Hastham (buffalo) — sworn enemies
  assert.equal(row(gunaMilan(side(0), side(12)), 'yoni').got, 0);
  for (let i = 0; i < 14; i++) for (let j = 0; j < 14; j++) assert.equal(YONI_MATRIX[i][j], YONI_MATRIX[j][i]);
});

test('Bhakoot 6/8, 2/12, 5/9 → 0 with dosha; 7/7 → 7', () => {
  // Mesha (0) vs Kanni (5): 6/8
  const r = gunaMilan({ star: 0, rasi: 0 }, { star: 12, rasi: 5 });
  assert.equal(row(r, 'bhakoot').got, 0);
  assert.equal(r.doshas.bhakoot, true);
  assert.equal(row(gunaMilan({ star: 0, rasi: 0 }, { star: 3, rasi: 1 }), 'bhakoot').got, 0); // 2/12
  assert.equal(row(gunaMilan({ star: 0, rasi: 0 }, { star: 10, rasi: 4 }), 'bhakoot').got, 0); // 5/9
  assert.equal(row(gunaMilan({ star: 0, rasi: 0 }, { star: 14, rasi: 6 }), 'bhakoot').got, 7); // 7/7
  // Mesha / Vrischika (6/8) share lord Mars → cancellation
  const c = gunaMilan({ star: 0, rasi: 0 }, { star: 16, rasi: 7 });
  assert.equal(c.doshas.bhakoot, true);
  assert.ok(c.cancellations.some((x) => /Bhakoot/.test(x.en)));
});

test('Totals bounded 0–36 and symmetric kootas symmetric for all star pairs', () => {
  const symmetric = ['vashya', 'tara', 'yoni', 'maitri', 'bhakoot', 'nadi'];
  for (let a = 0; a < 27; a++) for (let b = 0; b < 27; b++) {
    const x = gunaMilan(side(a), side(b)), y = gunaMilan(side(b), side(a));
    assert.ok(x.total >= 0 && x.total <= 36);
    assert.equal(x.total, x.rows.reduce((s, r) => s + r.got, 0));
    for (const id of symmetric) assert.equal(row(x, id).got, row(y, id).got, `${id} ${a}/${b}`);
    assert.equal(x.verdict, undefined); // traditional score only — no verdict label
  }
});

test('Gana, Nadi and Tara tables', () => {
  assert.equal(NAK_GANA.filter((g) => g === 0).length, 9);
  assert.equal(NAK_GANA.filter((g) => g === 2).length, 9);
  assert.deepEqual([0, 5, 6, 11, 12, 17, 18, 23, 24].map(nadiOf), Array(9).fill(0));
  assert.deepEqual([1, 4, 7, 10, 13, 16, 19, 22, 25].map(nadiOf), Array(9).fill(1));
  // Deva bride (Ashwini) with Rakshasa groom (Krittika) = 1; reverse = 0.
  assert.equal(row(gunaMilan(side(0), side(2)), 'gana').got, 1);
  assert.equal(row(gunaMilan(side(2), side(0)), 'gana').got, 0);
  // Ashwini → Krittika is 3rd (Vipat); Krittika → Ashwini is 26th → 8 (Mitra): 1.5
  assert.equal(row(gunaMilan(side(0), side(2)), 'tara').got, 1.5);
  // Same star: tara 1 both ways → 3
  assert.equal(row(gunaMilan(side(4), side(4)), 'tara').got, 3);
  // Varna: Brahmin groom (Kataka) with Shudra bride (Mithuna) = 1, reverse = 0
  assert.equal(row(gunaMilan({ star: 5, rasi: 2 }, { star: 7, rasi: 3 }), 'varna').got, 1);
  assert.equal(row(gunaMilan({ star: 7, rasi: 3 }, { star: 5, rasi: 2 }), 'varna').got, 0);
  // Graha maitri Moon (Kataka) – Mercury (Mithuna): Moon friend, Mercury enemy → 1
  assert.equal(row(gunaMilan({ star: 7, rasi: 3 }, { star: 5, rasi: 2 }), 'maitri').got, 1);
});

test('nameNumber: Chaldean SURESH = 24 → 6 Venus', () => {
  assert.deepEqual(nameNumber('SURESH'), { letters: 6, compound: 24, single: 6, planet: 'Venus' });
  assert.equal(nameNumber('Suresh').compound, 24);
  assert.equal(nameNumber('S. Suresh').compound, 27);
  assert.equal(nameNumber('').single, 0);
  assert.ok(compoundMeaning(24).en && compoundMeaning(24).ta);
  for (let n = 10; n <= 52; n++) assert.ok(compoundMeaning(n).en, `meaning ${n}`);
});

test('nameAdvice: harmony and suggestions land on lucky numbers', () => {
  const date = '1990-08-08'; // birth 8
  const ln = luckyNumbers(date);
  const a = nameAdvice('Suresh', date);
  assert.ok(['good', 'neutral', 'change'].includes(a.harmony));
  assert.equal(a.harmony, ln.lucky.includes(6) ? 'good' : ln.avoid.includes(6) ? 'change' : 'neutral');
  assert.ok(a.text.en && a.text.ta);
  assert.ok(a.suggestions.length <= 5);
  for (const s of a.suggestions) { assert.ok(ln.lucky.includes(s.single)); assert.notEqual(s.name, 'Suresh'); }
  // A name whose number is not lucky must get suggestions.
  const date2 = '1982-05-14'; // birth 5, lucky 1,3,5,6
  const b = nameAdvice('Ram', date2); // R2 A1 M4 = 7
  assert.equal(b.single, 7);
  assert.notEqual(b.harmony, 'good');
  assert.ok(b.suggestions.length > 0);
  for (const s of b.suggestions) assert.ok(luckyNumbers(date2).lucky.includes(s.single));
});

test('mobile and vehicle number luck', () => {
  const m = mobileNumberLuck('+91 98401 23456', '1982-05-14');
  assert.equal(m.digits, '919840123456');
  assert.equal(m.sum, 9 + 1 + 9 + 8 + 4 + 0 + 1 + 2 + 3 + 4 + 5 + 6);
  assert.equal(m.single, 7);
  assert.equal(m.planet, 'Ketu');
  assert.ok(['good', 'neutral', 'change'].includes(m.harmony));
  const v = vehicleNumberLuck('TN 09 AB 1234', '1982-05-14');
  assert.equal(v.sum, 19);
  assert.equal(v.single, 1);
  assert.equal(v.harmony, 'good');
  assert.equal(v.withLetters.sum, 19 + 4 + 5 + 1 + 2);
});
