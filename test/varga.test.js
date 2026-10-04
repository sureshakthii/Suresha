import { test } from 'node:test';
import assert from 'node:assert/strict';
import { birthChart } from '../shared/astro.js';
import { vargaRasi, vargaChart, vargottama, VARGAS, ashtakavarga, savInsights, AV_TABLES } from '../shared/varga.js';

const PEOPLE = [
  { name: 'A', date: '1997-11-05', time: '07:45:00', lat: 9.92, lon: 78.12, tz: 5.5 },
  { name: 'B', date: '1985-03-21', time: '23:10:00', lat: 13.08, lon: 80.27, tz: 5.5 },
  { name: 'C', date: '2012-07-14', time: '14:30:00', lat: 51.51, lon: -0.13, tz: 1 },
];
const charts = PEOPLE.map((p) => birthChart(p));

test('D1 equals rasi and D9 equals navamsaRasi for every planet', () => {
  for (const c of charts) {
    for (const [k, p] of Object.entries(c.planets)) {
      assert.equal(vargaRasi(p.longitude, 1), p.rasi, `${c.name} ${k} D1`);
      assert.equal(vargaRasi(p.longitude, 9), p.navamsaRasi, `${c.name} ${k} D9`);
    }
    assert.deepEqual(vargaChart(c, 1), c.charts.rasi);
    assert.deepEqual(vargaChart(c, 9), c.charts.navamsa);
  }
});

test('every varga places all planets in valid signs', () => {
  for (const c of charts) {
    for (const v of VARGAS) {
      const h = vargaChart(c, v.n);
      assert.equal(h.length, 12);
      assert.equal(h.flat().length, Object.keys(c.planets).length);
    }
    for (const k of vargottama(c)) assert.equal(c.planets[k].rasi, c.planets[k].navamsaRasi);
  }
});

test('varga rule spot checks', () => {
  const at = (sign, deg) => sign * 30 + deg;
  // Hora
  assert.equal(vargaRasi(at(0, 10), 2), 4); // Mesha 10° → Simha
  assert.equal(vargaRasi(at(0, 20), 2), 3); // Mesha 20° → Kataka
  assert.equal(vargaRasi(at(1, 10), 2), 3); // Rishaba 10° → Kataka
  assert.equal(vargaRasi(at(1, 20), 2), 4); // Rishaba 20° → Simha
  // Drekkana
  assert.equal(vargaRasi(at(1, 5), 3), 1); // Rishaba 1st → Rishaba
  assert.equal(vargaRasi(at(1, 15), 3), 5); // Rishaba 2nd → Kanni
  assert.equal(vargaRasi(at(1, 20), 3), 9); // Rishaba 3rd → Makara
  // Chaturthamsa
  assert.equal(vargaRasi(at(0, 8), 4), 3); // Mesha 2nd quarter → Kataka
  // Saptamsa
  assert.equal(vargaRasi(at(0, 1), 7), 0); // odd: from sign
  assert.equal(vargaRasi(at(1, 1), 7), 7); // even: from 7th → Vrischika
  // Dasamsa
  assert.equal(vargaRasi(at(0, 5), 10), 1); // Mesha 5° → 2nd part → Rishaba
  assert.equal(vargaRasi(at(1, 1), 10), 9); // Rishaba 1° → 9th from Rishaba → Makara
  // Dwadasamsa
  assert.equal(vargaRasi(at(3, 29), 12), 2); // Kataka last part → Mithuna
  // Shodasamsa / Vimsamsa
  assert.equal(vargaRasi(at(1, 0.5), 16), 4); // fixed → from Simha
  assert.equal(vargaRasi(at(2, 0.5), 16), 8); // dual → from Dhanusu
  assert.equal(vargaRasi(at(1, 0.5), 20), 8); // fixed → from Dhanusu
  assert.equal(vargaRasi(at(2, 0.5), 20), 4); // dual → from Simha
  // Chaturvimsamsa
  assert.equal(vargaRasi(at(0, 0.5), 24), 4);
  assert.equal(vargaRasi(at(1, 0.5), 24), 3);
  // Trimsamsa
  assert.equal(vargaRasi(at(0, 3), 30), 0); // odd Mars → Mesha
  assert.equal(vargaRasi(at(0, 7), 30), 10); // odd Saturn → Kumbha
  assert.equal(vargaRasi(at(0, 15), 30), 8); // odd Jupiter → Dhanusu
  assert.equal(vargaRasi(at(0, 20), 30), 2); // odd Mercury → Mithuna
  assert.equal(vargaRasi(at(0, 27), 30), 6); // odd Venus → Thula
  assert.equal(vargaRasi(at(1, 3), 30), 1); // even Venus → Rishaba
  assert.equal(vargaRasi(at(1, 10), 30), 5); // even Mercury → Kanni
  assert.equal(vargaRasi(at(1, 15), 30), 11); // even Jupiter → Meena
  assert.equal(vargaRasi(at(1, 22), 30), 9); // even Saturn → Makara
  assert.equal(vargaRasi(at(1, 29), 30), 7); // even Mars → Vrischika
  // Shashtiamsa
  assert.equal(vargaRasi(at(0, 0.2), 60), 0);
  assert.equal(vargaRasi(at(0, 29.9), 60), 11);
  assert.equal(vargaRasi(at(5, 1.2), 60), 7);
});

test('Ashtakavarga tables and totals', () => {
  const expected = { Sun: 48, Moon: 49, Mars: 39, Mercury: 54, Jupiter: 56, Venus: 52, Saturn: 39 };
  for (const [p, n] of Object.entries(expected)) {
    assert.equal(Object.values(AV_TABLES[p]).reduce((s, a) => s + a.length, 0), n, `${p} table`);
  }
  for (const c of charts) {
    const av = ashtakavarga(c);
    for (const [p, n] of Object.entries(expected)) {
      assert.equal(av.bav[p].reduce((a, b) => a + b, 0), n, `${c.name} ${p} BAV`);
      assert.ok(av.bav[p].every((b) => b >= 0 && b <= 8));
    }
    assert.equal(av.total, 337);
    assert.equal(av.sav.reduce((a, b) => a + b, 0), 337);
  }
});

test('Sun BAV for a synthetic chart (everything in Mesha)', () => {
  const planets = Object.fromEntries(['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Lagna'].map((k) => [k, { rasi: 0, longitude: 5 }]));
  const av = ashtakavarga({ planets });
  // Mesha (house 1 from all): Sun, Mars, Saturn contribute → 3
  assert.equal(av.bav.Sun[0], 3);
  // Simha (house 5): Mercury, Jupiter → 2
  assert.equal(av.bav.Sun[4], 2);
});

test('savInsights reads houses from lagna', () => {
  for (const c of charts) {
    const s = savInsights(c);
    assert.equal(s.houses.length, 12);
    assert.equal(s.houses[0].rasi, c.lagna.rasi);
    assert.equal(s.houses.reduce((a, h) => a + h.bindus, 0), 337);
    for (const h of s.houses) {
      assert.equal(h.level, h.bindus >= 28 ? 'strong' : h.bindus >= 25 ? 'average' : 'weak');
      assert.ok(h.note.en && h.note.ta);
    }
    assert.equal(s.best.length, 3);
    for (const p of Object.keys(s.transit)) for (const i of s.transit[p].good) assert.ok(s.bav[p][i] >= 4);
  }
});
