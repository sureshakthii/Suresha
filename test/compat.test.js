// உங்களுக்கு சாதகமானவர்கள் — shared/compat.js: Tara groups, gender-aware marriage ranking (porutham engine),
// age guard (no marriage / business for minors) and determinism.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { birthChart } from '../shared/astro.js';
import { ageProfile } from '../shared/age-guard.js';
import { matchPorutham } from '../shared/porutham.js';
import { compatibility, taraOf, marriageStars, favourablePlanets, lordFriendship, rasiPosition, TARA_GROUPS } from '../shared/compat.js';

const TODAY = '2026-10-06';
const man = { date: '1991-03-10', time: '06:30', lat: 13.08, lon: 80.27, tz: 5.5, gender: 'male' };
const woman = { date: '1996-07-22', time: '14:15', lat: 9.92, lon: 78.12, tz: 5.5, gender: 'female' };
const child = { date: '2016-05-01', time: '10:00', lat: 13.08, lon: 80.27, tz: 5.5, gender: 'male' };
const chartOf = (p) => birthChart({ name: 'x', ...p });
const prof = (p) => ageProfile(p.date, { today: TODAY });

test('tara groups: counted from the janma star, nine groups, favourable 2/4/6/8/9', () => {
  assert.equal(taraOf(0, 0).key, 'janma');
  assert.equal(taraOf(0, 0).count, 1);
  const keys = Array.from({ length: 9 }, (_, i) => taraOf(5, (5 + i) % 27).key);
  assert.deepEqual(keys, ['janma', 'sampat', 'vipat', 'kshema', 'pratyak', 'sadhana', 'vadha', 'mitra', 'parama_mitra']);
  assert.deepEqual(TARA_GROUPS.filter((g) => g.kind === 'good').map((g) => g.group), [2, 4, 6, 8, 9]);
  assert.deepEqual(TARA_GROUPS.filter((g) => g.kind === 'low').map((g) => g.group), [3, 5, 7]);
  // wraps around 27 and repeats every 9 stars
  assert.equal(taraOf(20, 2).count, 10);
  assert.equal(taraOf(20, 2).key, 'janma');
  assert.equal(taraOf(26, 0).key, 'sampat');
});

test('rasi position and lord friendship helpers', () => {
  assert.equal(rasiPosition(8, 0), 5);
  assert.equal(rasiPosition(0, 0), 1);
  assert.equal(lordFriendship('Sun', 'Jupiter'), 1);
  assert.equal(lordFriendship('Sun', 'Saturn'), -1);
  assert.equal(lordFriendship('Mars', 'Mars'), 1);
});

test('friends list favours Tara-favourable stars and never lists a 6/8 rasi', () => {
  const c = chartOf(man);
  const r = compatibility(c, { gender: 'male', profile: prof(man) });
  const fr = r.sections.find((s) => s.key === 'friends');
  assert.equal(fr.stars.length, 6);
  for (const s of fr.stars) assert.equal(taraOf(c.janmaNakshatra.index, s.index).kind, 'good', `${s.en} should be a favourable tara`);
  for (const x of fr.rasis) assert.ok(![6, 8].includes(x.position));
  for (const s of fr.stars) assert.ok(s.reason.ta && s.reason.en);
});

test('marriage for a man lists bride stars ranked with matchPorutham (man = groom)', () => {
  const c = chartOf(man);
  const me = { star: c.janmaNakshatra.index, rasi: c.janmaRasi.index };
  const r = compatibility(c, { gender: 'male', profile: prof(man) });
  const mar = r.sections.find((s) => s.key === 'marriage');
  assert.equal(mar.seeking, 'bride');
  assert.ok(mar.stars.length >= 1 && mar.stars.length <= 6);
  for (const s of mar.stars) {
    const m = matchPorutham({ star: s.index, rasi: s.rasi.index }, me);
    assert.equal(s.score, m.score, 'score comes from the porutham engine with the man as groom');
    assert.equal(m.criticalFail, false, 'no Rajju / Vedhai mismatch in the list');
  }
  for (let i = 1; i < mar.stars.length; i++) assert.ok(mar.stars[i - 1].score >= mar.stars[i].score, 'ranked by porutham score');
  for (const x of mar.rasis) assert.ok(![2, 6, 8, 12].includes(x.position), 'no 2/12 or 6/8 rasi for marriage');
});

test('marriage for a woman lists groom stars (woman = bride) — gender changes the ranking input', () => {
  const c = chartOf(woman);
  const me = { star: c.janmaNakshatra.index, rasi: c.janmaRasi.index };
  const asWoman = marriageStars(me.star, me.rasi, 'female');
  const asMan = marriageStars(me.star, me.rasi, 'male');
  assert.equal(asWoman.seeking, 'groom');
  assert.equal(asMan.seeking, 'bride');
  for (const s of asWoman.stars) assert.equal(s.score, matchPorutham(me, { star: s.index, rasi: s.rasi.index }).score);
  for (const s of asMan.stars) assert.equal(s.score, matchPorutham({ star: s.index, rasi: s.rasi.index }, me).score);
  // Dina / Stree Deergham are counted from the bride's star, so the two roles do not give the same list.
  assert.notDeepEqual(asWoman.stars.map((s) => s.index), asMan.stars.map((s) => s.index));
  const r = compatibility(c, { gender: 'female', profile: prof(woman) });
  assert.equal(r.sections.find((s) => s.key === 'marriage').seeking, 'groom');
});

test('minors get friends / study companions only — no marriage, no business', () => {
  const c = chartOf(child);
  const p = prof(child);
  assert.equal(p.minor, true);
  const r = compatibility(c, { gender: 'male', profile: p });
  assert.deepEqual(r.sections.map((s) => s.key), ['study']);
  assert.equal(r.minor, true);
  assert.ok(r.planets.planets.length >= 1);
  // a toddler: planets and tips only
  const baby = { ...child, date: '2024-01-15' };
  const rb = compatibility(chartOf(baby), { gender: 'female', profile: prof(baby) });
  assert.deepEqual(rb.sections, []);
  // unknown age: no adult sections either
  const ru = compatibility(c, { gender: 'male', profile: null });
  assert.ok(!ru.sections.some((s) => s.key === 'marriage' || s.key === 'business'));
});

test('adults without a gender get a note instead of a marriage list', () => {
  const r = compatibility(chartOf(man), { gender: null, profile: prof(man) });
  const mar = r.sections.find((s) => s.key === 'marriage');
  assert.equal(mar.stars.length, 0);
  assert.ok(mar.note.ta);
  assert.ok(r.sections.some((s) => s.key === 'business'));
});

test('favourable planets: lagna lord first, yogakaraka / benefics from the functional table; Moon sign without time', () => {
  const c = chartOf(man);
  const f = favourablePlanets(c);
  assert.equal(f.reference, 'lagna');
  assert.ok(f.planets[0].roles.includes('lagna_lord'));
  for (const p of f.planets) { assert.ok(p.colour?.hex); assert.ok(p.day?.ta); assert.ok(Number.isInteger(p.number)); }
  const noTime = birthChart({ name: 'y', date: man.date, time: '', lat: man.lat, lon: man.lon, tz: 5.5, timePrecision: 'unknown' });
  const g = favourablePlanets(noTime);
  assert.equal(g.reference, 'moon');
  assert.ok(g.planets[0].roles.includes('moon_lord'));
});

test('deterministic: the same chart always gives the same card', () => {
  const a = compatibility(chartOf(woman), { gender: 'female', profile: prof(woman) });
  const b = compatibility(chartOf(woman), { gender: 'female', profile: prof(woman) });
  assert.deepEqual(a, b);
});

test('positive wording: no "avoid" phrasing in any section text', () => {
  for (const p of [man, woman, child]) {
    const r = compatibility(chartOf(p), { gender: p.gender, profile: prof(p) });
    const text = JSON.stringify(r);
    assert.ok(!/avoid|தவிர்/i.test(text), 'no avoid wording');
  }
});
