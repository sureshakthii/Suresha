import { test } from 'node:test';
import assert from 'node:assert/strict';
import { birthChart } from '../shared/astro.js';
import { fullAnalysis, bhavaAnalysis, detectYogas, transitStatus } from '../shared/analysis.js';
import { QUESTIONS, predictEvent, careerCompass, kulaDeivam, habitGuard } from '../shared/predict.js';
import { familyRelations, pairLabel } from '../shared/relations.js';
import { templesNear, TEMPLES, distanceKm } from '../shared/temples.js';
import { MANTRAS } from '../shared/mantras.js';
import { PACKAGES, packageRoute } from '../shared/packages.js';
import { milestones } from '../shared/special.js';
import { panchang } from '../shared/astro.js';

const loc = { lat: 13.0827, lon: 80.2707, tz: 5.5 };
const chart = birthChart({ name: 'S', date: '1998-04-20', time: '09:10', ...loc });

test('analysis: 12 bhavas, life areas and transits', () => {
  const b = bhavaAnalysis(chart);
  assert.equal(b.length, 12);
  for (const h of b) assert.ok(h.score >= 15 && h.score <= 95);
  const a = fullAnalysis(chart, new Date('2026-10-03T00:00:00Z'));
  assert.equal(a.areas.length, 8);
  assert.ok(a.transit.status.some((s) => s.id.startsWith('guru')));
  assert.ok(a.transit.satSpan.from < a.transit.satSpan.to);
  assert.ok(Array.isArray(detectYogas(chart)));
});

test('Gaja Kesari is detected when Jupiter is in a kendra from the Moon', () => {
  const fake = structuredClone(chart);
  fake.planets.Jupiter.rasi = (fake.planets.Moon.rasi + 3) % 12;
  assert.ok(detectYogas(fake).some((y) => y.id === 'gajakesari'));
});

test('Ezharai Sani is reported when Saturn transits the Moon sign', () => {
  const t = transitStatus(chart, new Date('2026-10-03T00:00:00Z'));
  assert.equal(typeof t.saturnFromMoon, 'number');
  const fake = structuredClone(chart);
  fake.planets.Moon.rasi = t.saturnSign; // Saturn now sits on this Moon
  assert.ok(transitStatus(fake, new Date('2026-10-03T00:00:00Z')).status.some((s) => s.id === 'ezharai'));
});

test('life predictions: every question returns ordered windows inside the age range', () => {
  const from = new Date('2026-10-03T00:00:00Z');
  for (const q of QUESTIONS) {
    const r = predictEvent(chart, q.id, { from });
    // Reproductive questions are never assessed from a chart (brief §10).
    assert.ok((q.sensitive === 'reproductive' ? ['not-assessed'] : ['strong', 'good', 'needs effort']).includes(r.promise.level), q.id);
    for (let i = 1; i < r.windows.length; i++) assert.ok(r.windows[i - 1].start <= r.windows[i].start);
    for (const w of r.windows) {
      const age = (w.start - chart.utc) / (365.25 * 86400000);
      assert.ok(age >= q.ageMin - 3 && age <= q.ageMax + 3, `${q.id} age ${age}`);
      assert.ok(w.peakFrom >= w.start && w.peakTo <= w.end);
    }
  }
});

test('career compass, kula deivam and habit guard', () => {
  const c = careerCompass(chart);
  assert.equal(c.top.length, 4);
  assert.ok(c.top[0].score >= c.top[3].score);
  assert.ok(kulaDeivam(chart).deity.ta);
  assert.ok(['low', 'mild', 'guard'].includes(habitGuard(chart).level));
});

test('family relations label father–son and husband–wife', () => {
  const fam = [
    { id: 'a', name: 'Suresh', relation: 'self', gender: 'male', date: '1982-06-15', time: '06:30:00', ...loc },
    { id: 'b', name: 'Raman', relation: 'father', gender: 'male', date: '1955-02-01', time: '10:00:00', ...loc },
    { id: 'c', name: 'Priya', relation: 'spouse', gender: 'female', date: '1986-09-09', time: '18:00:00', ...loc },
  ];
  assert.equal(pairLabel(fam[0], fam[1], fam).ta, 'தந்தை – மகன்');
  assert.equal(pairLabel(fam[0], fam[2], fam).ta, 'கணவன் – மனைவி');
  const charts = Object.fromEntries(fam.map((m) => [m.id, birthChart(m)]));
  const rel = familyRelations(fam, charts, panchang(new Date('2026-10-03T06:00:00Z'), loc.lat, loc.lon, loc.tz));
  assert.equal(rel.length, 3);
  for (const r of rel) assert.ok(['harmony', 'careful', 'avoid'].includes(r.level));
});

test('temples sorted by distance; packages resolve their temples', () => {
  const near = templesNear(9.9252, 78.1198);
  assert.equal(near[0].id, 'madurai_meenakshi');
  assert.ok(near[0].km < near[near.length - 1].km);
  assert.ok(templesNear(loc.lat, loc.lon, { tag: 'navagraha' }).every((t) => t.tags.includes('navagraha')));
  assert.equal(TEMPLES.filter((t) => t.tags.includes('navagraha')).length, 9);
  assert.ok(Math.abs(distanceKm(13.0827, 80.2707, 9.9252, 78.1198) - 425) < 30);
  for (const p of PACKAGES) {
    const r = packageRoute(p, loc);
    assert.equal(r.days.flat().length, p.stops.flat().length, p.id);
    assert.ok(r.km > 0);
  }
  assert.ok(MANTRAS.every((m) => /[஀-௿]/.test(m.text)));
});

test('milestones: Sathabhishekam follows the 1000th full moon (~80.8 years)', () => {
  const elder = birthChart({ name: 'E', date: '1950-03-12', time: '05:40', lat: 10.96, lon: 79.38, tz: 5.5 });
  const m = milestones(elder, { lat: 10.96, lon: 79.38, tz: 5.5 }, new Date('2026-10-03T00:00:00Z'));
  const sat = m.find((x) => x.id === 'sathabhishekam');
  const years = (sat.thousandthFullMoon - elder.utc) / (365.25 * 86400000);
  assert.ok(years > 80.6 && years < 81.0, `years ${years}`);
  assert.equal(m.find((x) => x.id === 'shashti').past, true);
});
