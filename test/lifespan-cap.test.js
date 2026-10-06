// Listing horizon: every period / window / timeline shown for a person stays inside age 0–80, and for two people
// inside the earlier of the two 80th birthdays. Straddling periods are clipped, later ones dropped.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { birthChart, listedDasaPeriods } from '../shared/astro.js';
import { capDate, pairCapDate, clipPeriod, clipPeriods, clipWindow, minCap, withinCap, capYear, cappedDasaPeriods, CAP_LINES } from '../shared/lifespan-cap.js';
import { detectYogas, fullAnalysis } from '../shared/analysis.js';
import { lifeRoadmap } from '../shared/roadmap.js';
import { marriageReport, partnershipReport } from '../shared/couple.js';
import { predictEvent, kulaDeivam, QUESTIONS, questionFor, questionFitsAge } from '../shared/predict.js';
import { chartFacts, lifeEventCheck } from '../shared/guidance.js';
import { dasaSandhi } from '../shared/lifecheck.js';
import { houseRoles } from '../shared/analysis.js';

const NOW = new Date('2026-10-06T06:00:00Z');
const P = {
  boy6: { name: 'Kavin', date: '2020-03-10', time: '08:15', lat: 13.08, lon: 80.27, tz: 5.5, gender: 'male' },
  girl15: { name: 'Nila', date: '2011-07-22', time: '16:40', lat: 9.92, lon: 78.12, tz: 5.5, gender: 'female' },
  woman32: { name: 'Priya', date: '1994-01-15', time: '05:50', lat: 11.0, lon: 76.96, tz: 5.5, gender: 'female' },
  man35: { name: 'Karthik', date: '1991-05-05', time: '21:05', lat: 13.08, lon: 80.27, tz: 5.5, gender: 'male' },
  woman70: { name: 'Kamala', date: '1956-08-20', time: '06:30', lat: 10.79, lon: 78.7, tz: 5.5, gender: 'female' },
  man72: { name: 'Raman', date: '1954-02-02', time: '11:20', lat: 10.79, lon: 78.7, tz: 5.5, gender: 'male' },
};
const C = Object.fromEntries(Object.entries(P).map(([k, v]) => [k, birthChart(v)]));
const t = (d) => new Date(d).getTime();
const beforeCap = (d, cap, msg) => assert.ok(t(d) <= t(cap), `${msg}: ${new Date(d).toISOString()} > ${cap.toISOString()}`);

test('capDate / pairCapDate: birth date + 80 years; the earlier of two for a pair', () => {
  assert.equal(capDate('1956-08-20').toISOString().slice(0, 10), '2036-08-20');
  assert.equal(capDate(C.woman70).toISOString().slice(0, 10), '2036-08-20');
  assert.equal(capDate({ date: '1994-01-15' }).toISOString().slice(0, 10), '2074-01-15');
  assert.equal(capDate(null), null);
  assert.equal(capDate('2000-02-29').toISOString().slice(0, 10), '2080-02-29');
  assert.equal(pairCapDate(C.woman70, C.man72).toISOString().slice(0, 10), '2034-02-02');
  assert.equal(pairCapDate(C.woman32, null).toISOString().slice(0, 10), '2074-01-15');
  assert.equal(capYear(capDate('1956-08-20')), 2036);
});

test('clipPeriod: inside kept, straddling clipped to the cap, later dropped; dates keep their type', () => {
  const cap = new Date('2036-08-20T00:00:00Z');
  const inside = { lord: 'Moon', start: new Date('2020-01-01'), end: new Date('2030-01-01') };
  assert.equal(clipPeriod(inside, cap), inside);
  const straddle = clipPeriod({ lord: 'Jupiter', start: new Date('2030-01-01'), end: new Date('2046-01-01') }, cap);
  assert.equal(straddle.end.toISOString(), cap.toISOString());
  assert.equal(straddle.clipped, true);
  assert.equal(straddle.lord, 'Jupiter');
  assert.equal(clipPeriod({ start: new Date('2040-01-01'), end: new Date('2050-01-01') }, cap), null);
  assert.equal(clipPeriod({ start: cap, end: new Date('2050-01-01') }, cap), null);
  const iso = clipPeriod({ start: '2030-01-01', end: '2040-01-01' }, cap);
  assert.equal(iso.end, '2036-08-20');
  assert.equal(clipPeriods([inside, { start: new Date('2045-01-01'), end: new Date('2047-01-01') }], cap).length, 1);
  const w = clipWindow({ start: new Date('2035-01-01'), end: new Date('2038-01-01'), peakFrom: new Date('2037-01-01'), peakTo: new Date('2037-06-01') }, cap);
  assert.ok(w.end <= cap && w.peakFrom <= w.peakTo && w.peakTo <= cap);
  assert.equal(minCap(new Date('2040-01-01'), cap).toISOString(), cap.toISOString());
  assert.ok(withinCap(new Date('2030-01-01'), cap) && !withinCap(new Date('2037-01-01'), cap) && withinCap(new Date('2099-01-01'), null));
  for (const line of Object.values(CAP_LINES)) assert.ok(!/death|die|lifespan|ஆயுள்|மரண|இறப்/i.test(line.en + line.ta));
});

test('listed dasa periods (and bhuktis) never pass birth + 80', () => {
  for (const [k, c] of Object.entries(C)) {
    const cap = capDate(c);
    const list = listedDasaPeriods(c);
    assert.ok(list.length >= 1 && list.length < c.dasa.periods.length, k);
    for (const p of list) {
      beforeCap(p.end, cap, `${k} dasa ${p.lord}`);
      for (const b of p.bhuktis) beforeCap(b.end, cap, `${k} bhukti ${p.lord}/${b.lord}`);
    }
    assert.equal(t(list[list.length - 1].end), t(cap), `${k}: the last listed period ends at the cap`);
    assert.deepEqual(cappedDasaPeriods(c).map((p) => p.lord), list.map((p) => p.lord));
    assert.equal(c.dasa.periods.length, 9, 'the engine schedule itself is unchanged');
  }
});

test('yoga periods, Badhaka/Maraka source data and the dasa outlook stay inside the cap', () => {
  for (const [k, c] of Object.entries(C)) {
    const cap = capDate(c);
    for (const y of detectYogas(c)) {
      for (const p of y.periods?.dasas || []) {
        beforeCap(p.end, cap, `${k} ${y.id}`);
        assert.ok(t(p.start) < t(cap));
      }
      assert.ok(y.reading && /^In your chart/.test(y.reading.en) && /^உங்கள்/.test(y.reading.ta), `${k} ${y.id} personal reading`);
      assert.ok(!/awaiting|review/i.test(y.reading.en), 'no review text');
    }
    const a = fullAnalysis(c, NOW);
    if (a.dasaOutlook?.until) beforeCap(a.dasaOutlook.until, cap, `${k} dasa outlook`);
    const roles = houseRoles(c);
    if (roles.available) assert.ok(roles.badhaka.lord && roles.maraka.second.lord);
  }
  // The 70-year-old: nothing after 2036.
  const later = detectYogas(C.woman70).flatMap((y) => y.periods?.dasas || []).filter((p) => new Date(p.end).getUTCFullYear() > 2036);
  assert.deepEqual(later, []);
});

test('life questions: windows end by the cap; the 70-year-old gets no marriage / child timing questions', () => {
  for (const [k, c] of Object.entries(C)) {
    const cap = capDate(c);
    for (const q of ['career', 'house', 'business', 'visa', 'court', 'harmony']) {
      const r = predictEvent(c, q, { from: NOW, years: 30 });
      for (const w of [...r.windows, ...r.allWindows, ...r.careful]) {
        beforeCap(w.end, cap, `${k} ${q}`);
        beforeCap(w.peakTo, cap, `${k} ${q} peak`);
      }
    }
    for (const p of kulaDeivam(c, { now: NOW }).periods) beforeCap(p.end, cap, `${k} kula`);
    const life = lifeEventCheck(c, 'house', { now: NOW });
    for (const w of life.future) beforeCap(w.end, cap, `${k} life check`);
  }
  const age70 = 70;
  const fits = QUESTIONS.filter((q) => questionFitsAge(q, age70)).map((q) => q.id);
  for (const id of ['marriage', 'partner', 'child', 'job', 'education']) assert.ok(!fits.includes(id), id);
  for (const id of ['house', 'court', 'harmony']) assert.ok(fits.includes(id), id);
});

test('guidance facts: running dasa / bhukti end dates are listed inside the cap', () => {
  const c = C.woman70;
  const cap = capDate(c);
  const f = chartFacts(c, { lagna: true, nakshatra: true, dasa: true }, NOW);
  if (f.dasa) beforeCap(`${f.dasa.end}T00:00:00Z`, cap, 'dasa');
  if (f.bhukti) beforeCap(`${f.bhukti.end}T00:00:00Z`, cap, 'bhukti');
  if (f.nextDasa) assert.ok(t(f.nextDasa.start) < t(cap));
});

test('road map: periods, years and milestones stay inside the cap (70-year-old: health / home focus)', () => {
  for (const [k, c] of Object.entries(C)) {
    const cap = capDate(c);
    const r = lifeRoadmap(c, { from: NOW, years: 20 });
    for (const p of r.periods) beforeCap(p.end, cap, `${k} period`);
    for (const y of r.years) assert.ok(y.year <= capYear(cap) && y.age <= 80, `${k} year ${y.year}`);
    for (const m of r.milestones) beforeCap(m.to, cap, `${k} milestone ${m.id}`);
  }
  const old = lifeRoadmap(C.woman70, { from: NOW, years: 20 });
  assert.equal(old.senior, true);
  assert.ok(old.years.length <= 11 && old.years.every((y) => y.year <= 2036));
  assert.ok(old.milestones.every((m) => m.id === 'house'));
  assert.ok(!old.now.some((x) => /marri|திருமண/i.test(x.en + x.ta)));
  assert.ok(old.now.some((x) => /health|check-up/i.test(x.en)));
  const kid = lifeRoadmap(C.boy6, { from: NOW });
  assert.deepEqual(kid.milestones, []);
  assert.ok(!kid.areas.some((a) => ['career', 'wealth'].includes(a.id)));
});

test('married life: timeline and every key moment inside the couple cap (earlier 80th birthday)', () => {
  for (const [a, b] of [[C.woman32, C.man35], [C.woman70, C.man72]]) {
    const cap = pairCapDate(a, b);
    const r = marriageReport(a, b, { weddingDate: NOW });
    for (const row of r.timeline) { assert.ok(t(row.from) < t(cap)); beforeCap(row.to, cap, `timeline ${row.year}`); }
    for (const w of [...r.children, ...r.home]) beforeCap(w.to, cap, 'agree window');
    for (const m of r.moments) {
      if (m.kind === 'range') beforeCap(m.to, cap, m.id);
      for (const x of m.ranges || []) beforeCap(x.to, cap, `${m.id} range`);
    }
    for (const d of dasaSandhi(a, b, NOW).clashes) beforeCap(d, cap, 'sandhi');
  }
  const old = marriageReport(C.woman70, C.man72, { weddingDate: NOW });
  assert.ok(old.timeline.length <= 8, 'the older couple timeline stops at the cap');
  assert.ok(!old.moments.some((m) => m.id === 'children'), 'no santhana row for an older couple');
});

test('married life key moments: consistent rows — month ranges or a gentle line, never a dash', () => {
  const r = marriageReport(C.woman32, C.man35, { weddingDate: NOW });
  const ids = r.moments.map((m) => m.id);
  assert.deepEqual(ids, ['children', 'home', 'wealth', 'care']);
  for (const m of r.moments) {
    assert.ok(m.label?.en && m.label?.ta, m.id);
    assert.ok(['range', 'line', 'years'].includes(m.kind), m.id);
    if (m.kind === 'range') {
      assert.ok(m.from instanceof Date && m.to instanceof Date, m.id);
      assert.equal(m.from.getUTCDate(), 1, `${m.id} starts on a month`);
      assert.ok(m.to - m.from >= 28 * 86400000, `${m.id} is a real range, not a single month`);
    } else if (m.kind === 'line') {
      assert.ok(m.line?.en && m.line?.ta, `${m.id} has a gentle line`);
    } else {
      assert.ok(m.ranges.length && m.ranges.every((x) => x.years.length >= 1), m.id);
    }
    const json = JSON.stringify(m);
    assert.ok(!/"—"|: ?—|^—$/.test(json) && !/"(en|ta|line)":"—"/.test(json), `${m.id} never a bare dash`);
    assert.ok(!/fertil|infertil|கருவுறாமை/i.test(m.label.en + m.label.ta), 'child row is a supportive period, not an assessment');
  }
  const child = r.moments.find((m) => m.id === 'children');
  assert.match(child.label.ta, /சந்தான பாக்கியம்/);
  // Partner report shares the couple cap.
  const p = partnershipReport(C.woman70, C.man72, { startDate: NOW });
  const cap = pairCapDate(C.woman70, C.man72);
  for (const row of p.timeline) beforeCap(row.to, cap, 'partner timeline');
  for (const g of p.growth) beforeCap(g.to, cap, 'partner growth');
});

test('gender-aware question wording: a woman looks for a மணமகன், a man for a மணமகள்', () => {
  const q = QUESTIONS.find((x) => x.id === 'partner');
  assert.match(questionFor(q, 'female').ta, /மணமகன்/);
  assert.match(questionFor(q, 'male').ta, /மணமகள்/);
  assert.match(questionFor(QUESTIONS.find((x) => x.id === 'harmony'), 'female').ta, /கணவருடன்/);
  assert.match(questionFor(QUESTIONS.find((x) => x.id === 'harmony'), 'male').ta, /மனைவியுடன்/);
  const rem = questionFor(QUESTIONS.find((x) => x.id === 'marriage'), 'female').remedy;
  assert.ok(!/boys|ஆண்கள்/.test(rem.en + rem.ta));
});
