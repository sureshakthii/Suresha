// Engine behaviours: practical-first Prasnam, muhurtham never blocks urgent needs, Ruthu data minimisation,
// temple planner, health split, reflection themes, predict framing, relations and couple wording.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { birthChart, panchang } from '../shared/astro.js';
import { CATEGORIES, URGENT_CATEGORIES, scoreSnapshot, evaluatePrasna, PRACTICAL_FIRST_TEXT } from '../shared/prasna.js';
import { muhurthamPlan, ruthuPlan } from '../shared/special.js';
import { planTempleTrip } from '../shared/temple-planner.js';
import { healthGuide } from '../shared/health.js';
import { dasaThemes, findProhibited, assertNoProhibited } from '../shared/themes.js';
import { predictEvent, kulaDeivam, PREDICT_DISCLAIMER_ID } from '../shared/predict.js';
import { personalGuide, gemstones, ishtaTheivam } from '../shared/personal.js';
import { familyRelations } from '../shared/relations.js';
import { marriageReport, manaPorutham } from '../shared/couple.js';
import { lifeRoadmap } from '../shared/roadmap.js';

const loc = { lat: 13.0827, lon: 80.2707, tz: 5.5 };
const now = new Date('2026-10-04T00:00:00Z');
const chart = birthChart({ name: 'A', date: '1994-02-18', time: '22:10:00', lat: 13.08, lon: 80.27, tz: 5.5 });
const bride = birthChart({ name: 'Meena', date: '1997-11-05', time: '07:45', lat: 9.92, lon: 78.12, tz: 5.5 });
const noTime = birthChart({ name: 'U', date: '1994-02-18', time: '12:00', lat: 13.08, lon: 80.27, tz: 5.5, timePrecision: 'unknown' });

// ------------------------------------------------------------------ Prasnam
test('urgent Prasnam categories never return AVOID, even at the worst moment', () => {
  const snap = panchang(new Date('2026-09-28T06:00:00Z'), loc.lat, loc.lon, loc.tz);
  const worst = { ...snap, inRahuKalam: true, inYamagandam: true, inGuligai: true };
  const eighth = (snap.moonRasi.index - 7 + 12) % 12;
  const birth = { janmaNakshatra: (snap.nakshatra.index + 27 - 6) % 27, janmaRasi: eighth }; // Naidhana tara + Chandrashtamam
  for (const id of URGENT_CATEGORIES) {
    const r = scoreSnapshot(worst, id, birth);
    assert.notEqual(r.verdict, 'AVOID', id);
    assert.equal(r.practicalFirst, true, id);
    assert.ok(r.deadlineNote.en && r.deadlineNote.ta, id);
    assert.ok(r.practicalQuestions.length >= 1);
  }
  // Surgery and court notes put the doctor / lawyer first.
  assert.ok(/doctor/.test(scoreSnapshot(worst, 'surgery', birth).deadlineNote.en));
  assert.ok(/court date/.test(scoreSnapshot(worst, 'court', birth).deadlineNote.en));
  // A non-urgent category can still say AVOID, unless the user reports a real deadline.
  assert.equal(scoreSnapshot(worst, 'business', birth).verdict, 'AVOID');
  const withDeadline = scoreSnapshot(worst, 'business', birth, { deadline: true });
  assert.equal(withDeadline.verdict, 'CAUTION');
  assert.equal(withDeadline.rawVerdict, 'AVOID');
  assert.equal(withDeadline.capped, true);
  assert.ok(['surgery', 'cheque', 'court', 'contract', 'travel'].every((id) => CATEGORIES.find((c) => c.id === id).practicalFirst));
});

test('evaluatePrasna exposes practicalFirst and deadline-first verdict text', () => {
  for (let h = 0; h < 24; h += 3) {
    const r = evaluatePrasna({ at: new Date(Date.UTC(2026, 9, 6, h)), category: 'surgery', loc });
    assert.ok(['DO', 'CAUTION'].includes(r.verdict));
    assert.equal(r.practicalFirst, true);
    if (r.verdict === 'CAUTION') assert.deepEqual(r.verdictText, PRACTICAL_FIRST_TEXT);
    assert.equal(r.bestTimesOptional, true);
  }
});

// ------------------------------------------------------------------ Muhurtham & Ruthu
test('muhurtham finder never blocks urgent needs and respects the real deadline', () => {
  const from = new Date('2026-10-06T00:00:00Z');
  const deadline = new Date('2026-10-08T00:00:00Z');
  const p = muhurthamPlan({ category: 'surgery', loc, from, days: 10, deadline });
  assert.equal(p.practicalFirst, true);
  assert.equal(p.neverBlocks, true);
  assert.ok(p.deadlineNote.en);
  for (const w of p.windows) { assert.ok(w.start < deadline); assert.equal(w.optional, true); }
  const empty = muhurthamPlan({ category: 'contract', loc, from, days: 0.01, deadline: new Date(from.getTime() + 60000) });
  assert.equal(empty.windows.length, 0);
  assert.ok(/go ahead with your real timing/.test(empty.emptyMeaning.en));
});

test('Ruthu plan minimises data: the entered time is not returned and nothing is stored', () => {
  const at = new Date('2026-10-05T03:17:00Z');
  const r = ruthuPlan({ at, loc, person: { name: 'Private Name', janmaNakshatra: 4, janmaRasi: 1 } });
  assert.equal(r.dataPolicy.storesMenstrualDate, false);
  const json = JSON.stringify(r);
  assert.ok(!json.includes(at.toISOString()));
  assert.ok(!json.includes('Private Name'));
  assert.ok(Array.isArray(r.bath) && Array.isArray(r.vizha));
});

// ------------------------------------------------------------------ Temple planner
test('temple planner: free/local first, nearby low-cost, sourced practical data, no bookings', () => {
  const plan = planTempleTrip({ departure: { city: 'Chennai', lat: 13.08, lon: 80.27 }, days: 4, budget: 'medium', travelMode: 'car', dasaLord: 'Mars', preferences: { tags: ['murugan'] }, members: [{ age: 72 }, { age: 40 }] });
  assert.deepEqual(plan.order, ['freeLocal', 'nearbyLowCost', 'trips', 'packages']);
  assert.equal(plan.freeLocal.cost, 'free');
  assert.ok(plan.nearbyLowCost.km <= Math.min(...plan.trips.map((t) => t.km)));
  assert.ok(plan.trips.length >= 1);
  for (const o of [plan.nearbyLowCost, ...plan.trips]) {
    for (const k of ['hours', 'crowds', 'route', 'accommodation', 'accessibility', 'weather']) {
      assert.ok(o.practical[k].source, `${k} source`);
      assert.ok(o.practical[k].lastVerified !== undefined);
      assert.ok(['needs-checking', 'estimated'].includes(o.practical[k].status) || o.practical[k].lastVerified);
      assert.ok(['live', 'saved', 'estimated', 'verified', 'check'].includes(o.practical[k].prov.kind), `${k} provenance`);
    }
    assert.equal(o.practical.booking.confirmed, false);
    assert.equal(o.practical.booking.status, 'not-booked');
    if (o.devotionalAssociation) assert.equal(o.devotionalAssociation.status, 'proposed');
  }
  for (const p of plan.packages) { assert.equal(p.booking.confirmed, false); assert.equal(p.paid, true); }
  assert.ok(plan.trips.some((t) => t.devotionalAssociation && /Traditional devotional association/.test(t.devotionalAssociation.en)));
  assert.ok(plan.accessibilityNote);
  assert.deepEqual(findProhibited(plan), []);
  assert.ok(!/will solve|necessary for protection|must visit/i.test(JSON.stringify(plan).replace(/never required for protection/g, '')));
});

test('temple planner: sponsorship never changes the ranking', () => {
  const input = { departure: { lat: 10.79, lon: 78.70 }, days: 3, preferences: { tags: ['shiva'] } };
  const base = planTempleTrip(input);
  const last = base.trips[base.trips.length - 1].temple.id;
  const sponsored = Object.fromEntries([...base.trips.map((t) => t.temple.id), 'navagraha', 'south'].map((id) => [id, id === last]));
  const s = planTempleTrip({ ...input, sponsored });
  assert.deepEqual(s.trips.map((t) => t.temple.id), base.trips.map((t) => t.temple.id));
  assert.equal(s.trips.find((t) => t.temple.id === last).sponsored, true);
  assert.ok(s.trips.every((t) => t.rankingUsesSponsorship === false));
  assert.throws(() => planTempleTrip({}), /departure/);
});

// ------------------------------------------------------------------ Health
test('health: wellbeing separated from optional traditional context; no lifespan/reproductive inference', () => {
  const h = healthGuide(chart, { now, gender: 'female' });
  assert.equal(h.flags.canDriveTreatment, false);
  assert.equal(h.flags.lifespanInference, false);
  assert.equal(h.flags.reproductiveInference, false);
  assert.equal(h.wellbeing.fromAstrology, false);
  assert.ok(h.stage.checklist.every((c) => c.needsMedicalReview === true));
  assert.equal(h.stage.source.status, 'needs-medical-review');
  assert.equal(h.traditionalContext.optional, true);
  assert.ok(/not medical advice/.test(h.traditionalContext.label.en));
  assert.equal(h.bodyAreas, undefined);
  assert.equal(h.reflection.notHealthAdvice, true);
  assert.equal(h.vitality.level, 'not-assessed');
  assert.ok(!/protects your health|long life|healing influence/i.test(JSON.stringify(h)));
  assert.deepEqual(findProhibited(h), []);
  const u = healthGuide(noTime, { now });
  assert.equal(u.needsBirthTime, true);
  assert.ok(u.birthTimeNote.en && u.reflection.practices.length >= 1);
});

// ------------------------------------------------------------------ Themes
test('reflection themes: §29 fields, proposed status, no probabilities or risk permission', () => {
  const themes = dasaThemes(chart, { from: now, count: 4 });
  assert.equal(themes.length, 4);
  for (const t of themes) {
    for (const f of ['themeId', 'traditionProfileId', 'ruleVersion', 'periodStart', 'periodEnd', 'supportingRuleIds', 'modifiers', 'inputCertainty', 'reflectionText', 'optionalPractice']) assert.ok(f in t, f);
    assert.equal(t.status, 'proposed');
    assert.deepEqual(t.supportingRuleIds, []);
    assert.equal(t.optionalPractice.optional, true);
    assert.ok(!Object.keys(t).some((k) => /prob|risk|danger|score/i.test(k)));
    assert.ok(/selected tradition/.test(t.reflectionText.en));
    assert.ok(t.alwaysSensible.some((x) => /seat belt/.test(x.en)));
  }
  const approved = dasaThemes(chart, { from: now, count: 1, approvedRules: { [themes[0].themeId]: { ruleIds: ['R-12'], modifiers: ['m1'] } } });
  assert.equal(approved[0].status, 'approved');
  assert.equal(dasaThemes(noTime, { from: now, birthTimeCertainty: 'unknown' })[0].inputCertainty, 'unknown-time');
  for (const bad of ['A heavy accident will happen this month', 'Your partner will cheat during Rahu bhukti', '82% chance of betrayal', 'Guaranteed theft in this period', 'Good period — safe to take risks', 'பெரிய விபத்து கண்டம்']) {
    assert.throws(() => assertNoProhibited(bad), /Prohibited/, bad);
  }
});

// ------------------------------------------------------------------ Predict, personal, relations, couple, roadmap
test('predict: traditional-period framing, no fertility promise, Kula Deivam never a fact', () => {
  const r = predictEvent(chart, 'marriage', { from: now });
  assert.equal(r.disclaimerId, PREDICT_DISCLAIMER_ID);
  assert.equal(r.exactDatesGuaranteed, false);
  assert.ok(/Periods your selected tradition associates with/.test(r.framing.en));
  assert.ok(!/will (happen|arrive) on/i.test(JSON.stringify(r)));
  const c = predictEvent(chart, 'child', { from: now });
  assert.equal(c.promise.level, 'not-assessed');
  assert.ok(/does not assess fertility/.test(c.promise.notes[0].en));
  const k = kulaDeivam(chart, { now });
  assert.equal(k.recordedByFamily, null);
  assert.equal(k.suggestion.optional, true);
  assert.equal(k.suggestion.isFact, false);
  assert.ok(/not a fact/.test(k.suggestion.method.en));
  const rec = { en: 'Ayyanar of our village', ta: 'எங்கள் ஊர் ஐயனார்' };
  assert.deepEqual(kulaDeivam(chart, { recorded: rec, now }).recordedByFamily, rec);
  const u = predictEvent(noTime, 'job', { from: now });
  assert.equal(u.needsBirthTime, true);
  assert.equal(u.windows.length, 0);
  assert.equal(kulaDeivam(noTime, { now }).suggestion.reference, 'moon');
});

test('personal: Ishta Theivam attributed and optional; gems never necessary protection', () => {
  const i = ishtaTheivam(chart);
  assert.equal(i.optional, true);
  assert.ok(/Karakamsa/.test(i.method.en));
  const g = gemstones(chart);
  assert.equal(g.necessaryForProtection, false);
  assert.ok(/never necessary protection/.test(g.note.en));
  const p = personalGuide(noTime, { now });
  assert.equal(p.needsBirthTime, true);
  assert.equal(p.gems.good.length, 0);
});

test('relations: respectful prompts, never predicting arguments', () => {
  const fam = [
    { id: 'a', name: 'S', relation: 'self', gender: 'male', date: '1982-06-15', time: '06:30:00', ...loc },
    { id: 'b', name: 'R', relation: 'father', gender: 'male', date: '1955-02-01', time: '10:00:00', ...loc },
    { id: 'c', name: 'P', relation: 'spouse', gender: 'female', date: '1986-09-09', time: '18:00:00', ...loc },
  ];
  const charts = Object.fromEntries(fam.map((m) => [m.id, birthChart(m)]));
  for (let d = 0; d < 14; d++) {
    const rel = familyRelations(fam, charts, panchang(new Date(Date.UTC(2026, 9, 1 + d, 6)), loc.lat, loc.lon, loc.tz));
    for (const r of rel) {
      assert.equal(r.predictsConflict, false);
      assert.ok(r.levelLabel.en && r.levelLabel.ta);
      assert.ok(!/argument|fight|quarrel|likely/i.test(r.advice.en + r.reasons.map((x) => x.en).join(' ')));
      assert.ok(!/வாக்குவாதம் வர/.test(r.advice.ta));
    }
  }
});

test('couple: no lifespan/fertility checks, neutral wording, works without birth time', () => {
  const r = marriageReport(bride, chart, { weddingDate: now });
  assert.ok(!r.deep.checks.some((c) => c.id === 'ayul'));
  assert.equal(r.deep.ayul, undefined, 'longevity is never part of matching');
  assert.ok(!r.mana.areas.some((a) => /long life/i.test(a.name.en)));
  assert.ok(!/ego clash|disagreements likely|misunderstandings can arise/i.test(JSON.stringify(r)));
  assert.ok(r.remedies.every((x) => x.optional));
  assert.deepEqual(findProhibited(r), []);
  const m = manaPorutham(bride, noTime);
  assert.equal(m.needsBirthTime, true);
  assert.equal(m.areas.length, 6); // health/longevity is not scored
  assert.equal(marriageReport(bride, noTime, { weddingDate: now }).needsBirthTime, true);
});

test('roadmap works without birth time and carries a disclaimer', () => {
  const r = lifeRoadmap(noTime, { from: now, years: 3 });
  assert.equal(r.needsBirthTime, true);
  assert.ok(r.disclaimer.en && r.disclaimerId);
  assert.equal(lifeRoadmap(chart, { from: now, years: 3 }).needsBirthTime, false);
});
