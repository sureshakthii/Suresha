import { test } from 'node:test';
import assert from 'node:assert/strict';
import { birthChart } from '../shared/astro.js';
import { lifeRoadmap, ROAD_AREAS } from '../shared/roadmap.js';

test('life road map: stage, periods, years, milestones and actions', () => {
  const c = birthChart({ name: 'A', date: '1994-02-18', time: '22:10:00', lat: 13.08, lon: 80.27, tz: 5.5 });
  const from = new Date('2026-10-04T00:00:00Z');
  const r = lifeRoadmap(c, { from, years: 10 });
  assert.equal(r.age, 32);
  assert.equal(r.stage.id, 'build');
  assert.ok(r.periods.length >= 3);
  assert.ok(r.periods[0].start >= from);
  for (let i = 1; i < r.periods.length; i++) assert.ok(r.periods[i].start >= r.periods[i - 1].start);
  for (const p of r.periods) for (const a of ROAD_AREAS) assert.ok(p.scores[a.id] >= 10 && p.scores[a.id] <= 95);
  assert.equal(r.years.length, 10);
  assert.equal(r.years[0].year, 2026);
  assert.ok(r.current && r.current.current);
  assert.ok(r.now.length >= 2 && r.now.every((x) => x.en && x.ta));
  for (const m of r.milestones) assert.ok(m.from >= new Date(from.getTime() - 86400000 * 400));
});

test('road map adapts the life stage to age', () => {
  const elder = birthChart({ name: 'E', date: '1950-03-12', time: '05:40:00', lat: 9.92, lon: 78.12, tz: 5.5 });
  const r = lifeRoadmap(elder, { from: new Date('2026-10-04T00:00:00Z'), years: 5 });
  assert.equal(r.stage.id, 'wisdom');
  assert.ok(!r.milestones.some((m) => ['marriage', 'education', 'child'].includes(m.id)));
});
