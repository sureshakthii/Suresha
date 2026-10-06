import { test } from 'node:test';
import assert from 'node:assert/strict';
import { birthChart } from '../shared/astro.js';
import { personalGuide, luckyNumbers, colorForDay, gemstones, atmakaraka } from '../shared/personal.js';
import { ayulBalam, papaPoints, deepMarriageChecks } from '../shared/lifecheck.js';
import { marriageReport } from '../shared/couple.js';

const bride = birthChart({ name: 'Meena', date: '1997-11-05', time: '07:45', lat: 9.92, lon: 78.12, tz: 5.5 });
const groom = birthChart({ name: 'Arun', date: '1994-02-18', time: '22:10', lat: 13.08, lon: 80.27, tz: 5.5 });

test('lucky numbers follow digit sums', () => {
  const n = luckyNumbers('1997-11-05');
  assert.equal(n.birth, 5);
  assert.equal(n.destiny, 6); // 1+9+9+7+1+1+5 = 33 → 6
  assert.equal(n.birthPlanet, 'Mercury');
  assert.ok(n.lucky.includes(5) && n.lucky.includes(6));
  for (const d of n.luckyDates) assert.ok(d >= 1 && d <= 31);
  assert.equal(luckyNumbers('2000-01-29').birth, 2); // 29 → 11 → 2
});

test('personal guide: ishta theivam, colours, gems, siddhar, playlist', () => {
  const g = personalGuide(bride, { date: bride.date, weekday: 3 });
  assert.ok(['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'].includes(atmakaraka(bride.planets)));
  assert.ok(g.ishta.deity.ta && g.ishta.starDeity.ta);
  assert.equal(g.week.length, 7);
  assert.match(g.today.hex, /^#[0-9a-f]{6}$/);
  const gems = gemstones(bride);
  assert.ok(gems.good.length >= 1 && gems.good[0].primary);
  for (const a of gems.avoid) assert.ok(!gems.good.some((x) => x.planet === a.planet), 'a stone cannot be both good and avoid');
  assert.ok(g.siddhar.main.ta && g.siddhar.main.place.ta);
  assert.ok(g.playlist.length >= 5);
  assert.equal(new Set(g.playlist.map((p) => p.text)).size, g.playlist.length, 'playlist has no duplicates');
  for (const p of g.playlist) assert.ok(!p.text.includes('·'));
  const c = colorForDay(bride, 0);
  assert.ok(typeof c.clash === 'boolean');
});

// Adapted after the merge: Ayul Balam (a long-life strength level) is retired — Thunai gives no longevity
// output at all, so the function is a crash-safe stub with no level, score or text.
test('ayul balam is retired: no level, score or years', () => {
  for (const ch of [bride, groom]) {
    const a = ayulBalam(ch);
    assert.equal(a.removed, true);
    assert.equal(a.level, null);
    assert.equal(a.score, null);
    assert.ok(!/year|ஆண்டு வரை|வயது/.test(a.reason.en + a.reason.ta));
  }
  assert.ok(papaPoints(bride).total >= 0);
});

test('deep marriage checks feed the complete porutham', () => {
  const wedding = new Date('2026-11-20T06:00:00Z');
  const d = deepMarriageChecks(bride, groom, wedding);
  assert.ok(d.checks.length >= 8);
  // Longevity is never part of matching (THUNAI brief: no lifespan assessments).
  assert.ok(!d.checks.some((c) => c.id === 'ayul'));
  assert.equal(d.ayul, undefined);
  assert.ok(d.score >= 0 && d.score <= 100);
  const r = marriageReport(bride, groom, { weddingDate: wedding });
  assert.ok(r.deep && r.deep.checks.length === d.checks.length);
  assert.ok(r.total >= 0 && r.total <= 100);
});
