// The traditional Gowri Panchangam table (Pambu Panchangam; cross-checked with Drik Panchang and Prokerala) and the
// rule that a nalla neram is never inside Rahu Kalam, Yamagandam or Kuligai.
import test from 'node:test';
import assert from 'node:assert/strict';
import { GOWRI, gowriOrder, tamilDay, nallaNeramWindows, isNallaNeram } from '../shared/tamilcal.js';

const names = (row) => row.map((i) => GOWRI[i].en).join(',');
const DAY = [
  'Uthi,Amirtham,Rogam,Labham,Dhanam,Sugam,Soram,Visham', 'Amirtham,Visham,Rogam,Labham,Dhanam,Sugam,Soram,Uthi',
  'Rogam,Labham,Dhanam,Sugam,Soram,Uthi,Visham,Amirtham', 'Labham,Dhanam,Sugam,Soram,Visham,Uthi,Amirtham,Rogam',
  'Dhanam,Sugam,Soram,Uthi,Amirtham,Visham,Rogam,Labham', 'Sugam,Soram,Uthi,Visham,Amirtham,Rogam,Labham,Dhanam',
  'Soram,Uthi,Visham,Amirtham,Rogam,Labham,Dhanam,Sugam',
];
const NIGHT = [
  'Dhanam,Sugam,Soram,Visham,Uthi,Amirtham,Rogam,Labham', 'Sugam,Soram,Uthi,Amirtham,Visham,Rogam,Labham,Dhanam',
  'Soram,Uthi,Visham,Amirtham,Rogam,Labham,Dhanam,Sugam', 'Uthi,Amirtham,Rogam,Labham,Dhanam,Sugam,Soram,Visham',
  'Amirtham,Visham,Rogam,Labham,Dhanam,Sugam,Soram,Uthi', 'Rogam,Labham,Dhanam,Sugam,Soram,Uthi,Visham,Amirtham',
  'Labham,Dhanam,Sugam,Soram,Uthi,Visham,Amirtham,Rogam',
];

test('Gowri table matches the traditional panchangam for every weekday, day and night', () => {
  for (let w = 0; w < 7; w++) {
    assert.equal(names(gowriOrder(w).day), DAY[w], `day ${w}`);
    assert.equal(names(gowriOrder(w).night), NIGHT[w], `night ${w}`);
  }
});

const PLACES = [[13.0827, 80.2707, 5.5], [25.2048, 55.2708, 4], [1.3521, 103.8198, 8], [51.5072, -0.1276, 1]];
const at = (iso, tz) => new Date(new Date(`${iso}T12:00:00Z`).getTime() - tz * 3600000);
const overlaps = (a, k) => new Date(a.start) < new Date(k.end) && new Date(k.start) < new Date(a.end);

test('daytime Visham is exactly Rahu Kalam, and no nalla neram ever touches Rahu Kalam, Yamagandam or Kuligai', () => {
  for (const [lat, lon, tz] of PLACES) {
    for (let d = 0; d < 21; d++) {
      const iso = new Date(Date.UTC(2026, 9, 1 + d)).toISOString().slice(0, 10);
      const td = tamilDay(at(iso, tz), lat, lon, tz);
      const visham = td.gowri.find((g) => g.part === 'day' && g.en === 'Visham');
      assert.ok(Math.abs(new Date(visham.start) - new Date(td.rahuKalam.start)) < 1000, `${iso} ${lat}: Visham = Rahu Kalam`);
      for (const k of [td.rahuKalam, td.yamagandam, td.guligai]) {
        for (const w of nallaNeramWindows(td)) assert.ok(!overlaps(w, k), `${iso} ${lat}: window inside a kalam`);
        for (const g of td.nallaNeram) assert.ok(!overlaps({ start: new Date(new Date(g.start).getTime() + 60000), end: new Date(new Date(g.end).getTime() - 60000) }, k), `${iso}: nallaNeram slot inside a kalam`);
      }
      // A good slot inside Yamagandam / Kuligai keeps its name but is flagged, never offered.
      for (const g of td.gowri.filter((x) => x.good && x.clash)) assert.equal(isNallaNeram(g), false);
    }
  }
});

test('Saturday in Dubai (the reported day): next good time is never the Rahu Kalam slot', () => {
  const td = tamilDay(at('2026-10-10', 4), 25.2048, 55.2708, 4);
  const day = nallaNeramWindows(td).filter((w) => w.part === 'day');
  assert.deepEqual(day.map((w) => w.names.map((n) => n.en).join('+')), ['Uthi', 'Amirtham', 'Dhanam+Sugam']);
  const lab = td.gowri.find((g) => g.part === 'day' && g.en === 'Labham');
  assert.equal(lab.clash.id, 'yama');
});
