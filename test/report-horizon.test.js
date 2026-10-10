// Report horizon (replaces the removed age-80 listing cutoff): nothing is dropped because of a person's age,
// older adults keep every service, and each listing states the span it covers ("Covers the next 10 years";
// the dasa table: "Vimshottari schedule computed for 120 years from birth"). Also covers birth-time certainty
// reaching the engine (unknown time → no Lagna; approximate → chart.stability for the person's own window).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { birthChart, listedDasaPeriods } from '../shared/astro.js';
import { REPORT_YEARS, horizonLabel, DASA_SCHEDULE_LABEL, splitByHorizon, withinHorizon, horizonEnd, HORIZON_LINES, GENTLE_LINES } from '../shared/report-horizon.js';
import { detectYogas, fullAnalysis, houseRoles } from '../shared/analysis.js';
import { lifeRoadmap } from '../shared/roadmap.js';
import { predictEvent, kulaDeivam, QUESTIONS, questionFor, questionFitsAge } from '../shared/predict.js';
import { chartFacts, lifeEventCheck } from '../shared/guidance.js';
import { dasaSandhi } from '../shared/lifecheck.js';
import { relevantPeriods } from '../shared/rules/registry.js';
import { birthArgs, certaintyOf, timeReliability } from '../shared/birthtime.js';
import { favourablePlanets } from '../shared/compat.js';
import { doshams } from '../shared/porutham.js';
import { savInsights } from '../shared/varga.js';
import { parseWrittenDate, tamilYearCheck } from '../shared/written-date.js';
import { birthInput } from '../shared/datetime.js';
import { HORIZON_LINES as COUPLE_HORIZON_LINES } from '../shared/couple.js';

const NOW = new Date('2026-10-06T06:00:00Z');
const P = {
  boy6: { name: 'Kavin', date: '2020-03-10', time: '08:15', lat: 13.08, lon: 80.27, tz: 5.5, gender: 'male' },
  woman32: { name: 'Priya', date: '1994-01-15', time: '05:50', lat: 11.0, lon: 76.96, tz: 5.5, gender: 'female' },
  woman70: { name: 'Kamala', date: '1956-08-20', time: '06:30', lat: 10.79, lon: 78.7, tz: 5.5, gender: 'female' },
  man75: { name: 'Raman', date: '1951-02-02', time: '11:20', lat: 10.79, lon: 78.7, tz: 5.5, gender: 'male' },
  woman78: { name: 'Meena', date: '1948-06-14', time: '04:45', lat: 9.92, lon: 78.12, tz: 5.5, gender: 'female' },
};
const C = Object.fromEntries(Object.entries(P).map(([k, v]) => [k, birthChart(v)]));
const t = (d) => new Date(d).getTime();
const at80 = (c) => { const d = new Date(`${c.date}T00:00:00Z`); d.setUTCFullYear(d.getUTCFullYear() + 80); return d; };
const LIFESPAN = /death|die|lifespan|longevity|ஆயுள்|மரண|இறப்/i;

test('horizon labels: stated per section, never lifespan wording', () => {
  assert.deepEqual(horizonLabel(10), { en: 'Covers the next 10 years', ta: 'அடுத்த 10 ஆண்டுகள்' });
  assert.match(DASA_SCHEDULE_LABEL.en, /Vimshottari schedule computed for 120 years from birth/);
  assert.match(DASA_SCHEDULE_LABEL.ta, /120 ஆண்டுகளுக்கு/);
  for (const line of [horizonLabel(), DASA_SCHEDULE_LABEL, HORIZON_LINES.periods(20), HORIZON_LINES.windows(15), ...Object.values(GENTLE_LINES), ...Object.values(COUPLE_HORIZON_LINES)]) {
    assert.ok(!LIFESPAN.test(line.en + line.ta), line.en);
  }
  assert.ok(Object.values(REPORT_YEARS).every((y) => y >= 10 && y <= 20));
});

test('dasa schedule: the full 120 years is listed — no period is dropped for being after age 80', () => {
  for (const [k, c] of Object.entries(C)) {
    const list = listedDasaPeriods(c);
    assert.equal(list.length, 9, `${k}: all nine maha dasas`);
    assert.equal(list, c.dasa.periods);
    const span = (t(list[8].end) - t(list[0].start)) / (365.25 * 86400000);
    assert.ok(span > 100 && span <= 120.01, `${k} span ${span}`);
    assert.ok(list.some((p) => t(p.end) > t(at80(c))), `${k}: periods after the 80th birthday are kept`);
  }
  // The chart screen splits at a stated horizon: shown + "Show more" = everything.
  const s = splitByHorizon(listedDasaPeriods(C.woman78), { from: NOW, years: REPORT_YEARS.dasaTable });
  assert.equal(s.shown.length + s.more.length, 9);
  assert.ok(s.shown.some((p) => t(p.end) > t(at80(C.woman78))), 'a 78-year-old sees the periods running past 80');
  assert.ok(s.shown.every((p) => t(p.start) < t(horizonEnd(NOW, REPORT_YEARS.dasaTable))));
});

test('analysis: yoga periods, Badhaka / Maraka periods and the dasa outlook are not cut at 80', () => {
  const c = C.woman70; // Venus Dasa 2045 and Sun Dasa 2065 (after her 80th birthday) carry yogas
  const later = detectYogas(c).flatMap((y) => y.periods?.dasas || []).filter((p) => t(p.start) >= t(at80(c)));
  const all = c.dasa.periods.filter((p) => t(p.start) >= t(at80(c)));
  assert.ok(all.length >= 1);
  for (const y of detectYogas(c)) {
    const lords = [...new Set((y.periods?.dasas || []).map((p) => p.lord))];
    if (lords.length) assert.deepEqual(y.periods.dasas.map((p) => p.lord), c.dasa.periods.filter((p) => lords.includes(p.lord)).map((p) => p.lord), y.id);
  }
  const yLords = new Set(detectYogas(c).flatMap((y) => (y.periods?.dasas || []).map((p) => p.lord)));
  const expected = c.dasa.periods.filter((p) => yLords.has(p.lord) && t(p.start) >= t(at80(c)));
  assert.equal(later.length >= expected.length, true, 'yoga periods after 80 are kept');
  assert.ok(expected.length >= 1, 'fixture has yoga periods after 80');
  const rp = relevantPeriods(c, ['Jupiter', 'Saturn', 'Mercury', 'Venus']);
  assert.equal(rp.dasas.length, c.dasa.periods.filter((p) => ['Jupiter', 'Saturn', 'Mercury', 'Venus'].includes(p.lord)).length);
  const a = fullAnalysis(c, NOW);
  if (a.dasaOutlook) assert.equal(t(a.dasaOutlook.until), t(c.dasa.current.end), 'outlook ends with the running dasa itself');
  const roles = houseRoles(c);
  assert.ok(roles.available && roles.badhaka.lord && roles.maraka.second.lord);
  const near = withinHorizon(c.dasa.periods, { from: NOW, years: REPORT_YEARS.analysis });
  assert.ok(near.length >= 1 && near.every((p) => t(p.end) > t(NOW)));
});

test('a 75-year-old keeps full services: life questions, windows past 80, road map, facts, kula deivam', () => {
  for (const k of ['man75', 'woman78']) {
    const c = C[k];
    const age = k === 'man75' ? 75 : 78;
    const fits = QUESTIONS.filter((q) => questionFitsAge(q, age)).map((q) => q.id);
    for (const id of ['house', 'business', 'visa', 'court', 'harmony']) assert.ok(fits.includes(id), `${k} ${id}`);
    const years = REPORT_YEARS.life;
    const r = predictEvent(c, 'house', { from: NOW, years });
    assert.ok(r.windows.length + r.allWindows.length >= 1, `${k} house windows`);
    for (const w of r.allWindows) assert.ok(t(w.end) <= t(horizonEnd(NOW, years)) + 86400000, 'inside the stated horizon');
    if (k === 'woman78') assert.ok([...r.allWindows, ...r.careful].some((w) => t(w.end) > t(at80(c))), `${k}: house windows run past 80`);
    const road = lifeRoadmap(c, { from: NOW, years: REPORT_YEARS.roadmap });
    assert.equal(road.years.length, REPORT_YEARS.roadmap, `${k}: every year of the stated horizon`);
    assert.ok(road.years.some((y) => y.age > 80), `${k}: years after 80 are listed`);
    assert.ok(road.periods.length >= 1 && road.horizonYears === REPORT_YEARS.roadmap);
    const f = chartFacts(c, { lagna: true, nakshatra: true, dasa: true }, NOW);
    assert.equal(f.dasa.end, c.dasa.current.end.toISOString().slice(0, 10), 'the running dasa end date is the engine date');
    assert.ok(kulaDeivam(c, { now: NOW }).periods.length >= 1);
    const life = lifeEventCheck(c, 'house', { now: NOW });
    assert.ok(Array.isArray(life.future));
  }
  // Age-appropriate topics stay (not a cutoff): an elder is not asked about marriage or child timing.
  for (const id of ['marriage', 'partner', 'child', 'education']) assert.ok(!QUESTIONS.filter((q) => questionFitsAge(q, 75)).map((q) => q.id).includes(id), id);
  const kid = lifeRoadmap(C.boy6, { from: NOW });
  assert.deepEqual(kid.milestones, []);
});

test('dasa sandhi covers its stated years after the wedding, with no age cutoff', () => {
  const r = dasaSandhi(C.woman70, C.man75, NOW, 20);
  for (const d of r.clashes) assert.ok(t(d) < t(NOW) + 20 * 365.25 * 86400000);
});

test('gender-aware question wording: a woman looks for a மணமகன், a man for a மணமகள்', () => {
  const q = QUESTIONS.find((x) => x.id === 'partner');
  assert.match(questionFor(q, 'female').ta, /மணமகன்/);
  assert.match(questionFor(q, 'male').ta, /மணமகள்/);
});

// ------------------------------------------------------------------ birth-time certainty reaches the engine
const base = { id: 'u', name: 'U', date: '1990-04-12', lat: 13.08, lon: 80.27, tz: 5.5, zone: 'Asia/Kolkata', place: 'Chennai' };

test('profiles: timeCertainty maps to timePrecision; unknown time gives no Lagna (never the 12:00 placeholder)', () => {
  const unk = birthChart(birthArgs({ ...base, time: '12:00:00', timeCertainty: 'unknown' }));
  assert.equal(unk.lagna, null);
  assert.ok(!('Lagna' in unk.planets));
  assert.equal(unk.timePrecision, 'unknown');
  assert.equal(unk.availability.lagna, false);
  assert.ok(unk.stability && unk.stability.unavailable.includes('lagna'));
  assert.equal(unk.time, null, 'the placeholder time is not carried as a birth time');
  // Older profiles without timeCertainty stay exact; a legacy timePrecision field is honoured.
  const old = birthChart(birthArgs({ ...base, time: '06:40:00' }));
  assert.ok(old.lagna && old.planets.Lagna && !old.stability);
  assert.equal(certaintyOf({ timePrecision: 'unknown' }), 'unknown');
  assert.equal(certaintyOf({ timePrecision: 'approximate' }), 'approx');
  // Engine results stay callable without a Lagna (Moon-based).
  assert.equal(favourablePlanets(unk).reference, 'moon');
  assert.equal(favourablePlanets(unk).referenceReason, 'no-lagna');
  const d = doshams(unk.planets, { stability: unk.stability });
  assert.equal(d.chevvai.needsBirthTime, true);
  assert.equal(d.chevvai.fromLagna, null);
  assert.ok(Number.isInteger(d.chevvai.fromMoon));
  const sav = savInsights({ planets: { ...unk.planets, Lagna: unk.planets.Moon }, lagna: { rasi: unk.planets.Moon.rasi } });
  assert.equal(sav.lagna, unk.planets.Moon.rasi, 'house-wise Ashtakavarga counted from the Moon sign');
  assert.equal(sav.total, 337, 'the usual Sarvashtakavarga scale');
  assert.equal(fullAnalysis(unk, NOW).bhavas.length, 0);
  assert.equal(houseRoles(unk).available, false);
});

test('approximate time: chart.stability uses the entered ± window; reliability notes say "may change"', () => {
  const m = { ...base, time: '06:40:00', timeCertainty: 'approx', timeWindowMin: 30 };
  const a = birthChart(birthArgs(m));
  assert.equal(a.stability.windowMinutes, 30);
  assert.equal(a.stability.timePrecision, 'approximate');
  assert.ok(a.stability.unstable.includes('D60Lagna'), 'D60 changes within ±30 min');
  const wide = birthChart(birthArgs({ ...m, timeWindowMin: 120 }));
  assert.equal(wide.stability.windowMinutes, 120);
  assert.ok(wide.stability.unstable.length >= a.stability.unstable.length);
  assert.ok(birthChart(birthArgs({ ...m, timeWindowMin: undefined })).stability.windowMinutes === 60, 'profile default ±60');
  const rel = timeReliability({ ...m, timeWindowMin: 240 });
  assert.ok(rel.notes.some((n) => /may change/.test(n.en) && /மாறக்கூடிய/.test(n.ta)));
  assert.ok(!rel.notes.some((n) => /not shown/.test(n.en)), 'approximate items are marked, not hidden');
});

test('DST: a repeated wall time can be pinned to the later instant', () => {
  const e = birthInput({ date: '2021-11-07', time: '01:30', zone: 'America/New_York', lat: 40.7, lon: -74 });
  const l = birthInput({ date: '2021-11-07', time: '01:30', zone: 'America/New_York', lat: 40.7, lon: -74, disambiguation: 'later' });
  assert.ok(e.ambiguous && l.ambiguous);
  assert.equal(t(l.utc) - t(e.utc), 3600000);
  const c = birthChart(birthArgs({ date: '2021-11-07', time: '01:30', zone: 'America/New_York', lat: 40.7, lon: -74, tz: -4, dstChoice: 'later' }));
  assert.equal(t(c.utc), t(l.utc));
  assert.ok(birthInput({ date: '2021-03-14', time: '02:30', zone: 'America/New_York', lat: 40.7, lon: -74 }).nonexistent);
});

test('written jathagam dates: day/month and 2-digit years are flagged; Tamil year mismatch is caught', () => {
  const a = parseWrittenDate('05/06/1972', { now: NOW });
  assert.deepEqual(a.candidates.map((c) => c.iso), ['1972-06-05', '1972-05-06']);
  assert.ok(a.ambiguous && a.flags.some((f) => f.code === 'day-month'));
  const b = parseWrittenDate('13/05/90', { now: NOW });
  assert.deepEqual(b.candidates.map((c) => c.iso), ['1990-05-13']);
  assert.ok(b.flags.some((f) => f.code === 'two-digit-year'));
  const c = parseWrittenDate('12/03/24', { now: NOW });
  assert.deepEqual(c.candidates.map((x) => x.iso).sort(), ['1924-03-12', '1924-12-03', '2024-03-12', '2024-12-03']);
  assert.deepEqual(parseWrittenDate('1985-03-12', { now: NOW }).candidates.map((x) => x.iso), ['1985-03-12']);
  assert.ok(parseWrittenDate('31/02/1990', { now: NOW }).flags.some((f) => f.code === 'unreadable'));
  assert.deepEqual(parseWrittenDate('12 Mar 1985', { now: NOW }).candidates.map((x) => x.iso), ['1985-03-12']);
  const ok = tamilYearCheck('1990-05-12', 3);
  assert.equal(ok.ok, true);
  assert.equal(ok.expected.en, 'Pramodhoota');
  const bad = tamilYearCheck('1990-04-12', 3);
  assert.equal(bad.ok, false);
  assert.match(bad.flag.ta, /பொருந்தவில்லை/);
});
