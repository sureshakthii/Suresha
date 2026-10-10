// Temple journey provenance (brief §9c): every practical item carries ONE provenance record from the shared model in
// shared/journey.js (live / saved / estimated / verified / needs checking), the temple planner reuses it, trip end
// dates are derived, accessibility needs change the pace, and the screens keep tradition apart from travel facts.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  PROVENANCE, prov, provLabel, asSaved, templeFacts, tripEndDate, ACCESS_NEEDS, normaliseNeeds, planJourney, dayInfo,
} from '../shared/journey.js';
import { planTempleTrip } from '../shared/temple-planner.js';
import { VERIFIED } from '../shared/temple-verified.js';

const MADURAI = { lat: 9.9252, lon: 78.1198, name: 'Madurai' };
const KINDS = Object.keys(PROVENANCE);

test('provenance model: five kinds, bilingual labels with time, date and source', () => {
  assert.deepEqual(KINDS, ['live', 'saved', 'estimated', 'verified', 'check']);
  assert.deepEqual(PROVENANCE.check, { en: 'Needs checking', ta: 'சரிபார்க்க வேண்டும்' });
  assert.deepEqual(PROVENANCE.live.ta, 'நேரலை');
  assert.throws(() => prov('guess'));
  const live = provLabel(prov('live', { checkedAt: '2026-10-07T09:05:00Z' }), { time: () => '14:35' });
  assert.equal(live.en, 'Live (checked 14:35)');
  assert.match(live.ta, /^நேரலை \(14:35/);
  assert.equal(provLabel(prov('saved', { savedOn: '2026-10-01' })).en, 'Saved (on 2026-10-01)');
  assert.match(provLabel(prov('saved', { savedOn: '2026-10-01' })).ta, /^சேமித்தது/);
  assert.deepEqual(provLabel(prov('estimated')), { en: 'Estimated', ta: 'மதிப்பீடு' });
  const v = provLabel(prov('verified', { source: 'Temple office phone call', verifiedOn: '2026-09-30' }));
  assert.equal(v.en, 'Verified (Temple office phone call, last checked 2026-09-30)');
  assert.match(v.ta, /^சரிபார்த்தது \(Temple office phone call, 2026-09-30\)/);
  assert.match(provLabel(prov('check', { verifiedOn: '2020-01-01', stale: true })).en, /^Needs checking \(last verified 2020-01-01/);
});

test('a saved plan shows estimates as "Saved (on date)"; verified facts keep their own date', () => {
  assert.deepEqual(asSaved(prov('estimated'), '2026-10-01'), { kind: 'saved', savedOn: '2026-10-01', basis: 'estimated' });
  assert.equal(asSaved(prov('live', { checkedAt: 'x' }), '2026-10-01').kind, 'saved');
  const ver = prov('verified', { source: 'Visit', verifiedOn: '2026-09-01' });
  assert.equal(asSaved(ver, '2026-10-01'), ver);
  assert.equal(asSaved(prov('check'), '2026-10-01').kind, 'check');
  assert.equal(asSaved(prov('estimated'), null).kind, 'estimated');
});

test('temple facts: compiled hours and unknown phone need checking; reviewed records are verified until stale', () => {
  const f = templeFacts('madurai_meenakshi');
  assert.equal(f.hours.prov.kind, 'check', 'compiled timings have no review date — never "verified"');
  assert.ok(f.hours.value && f.hours.approx);
  assert.equal(f.phone.prov.kind, 'check');
  assert.equal(f.phone.value, null);
  assert.equal(f.accessibility.prov.kind, 'check');
  const today = new Date().toISOString().slice(0, 10);
  VERIFIED.madurai_meenakshi = {
    hours: { en: '5:00–12:30, 16:00–21:30', source: 'Temple office phone call', verifiedOn: today, verifiedBy: 'test' },
    phone: { en: '+91 452 000 0000', source: 'HR&CE temple page', verifiedOn: '2020-01-01', verifiedBy: 'test' },
  };
  try {
    const g = templeFacts('madurai_meenakshi');
    assert.equal(g.hours.prov.kind, 'verified');
    assert.equal(g.hours.prov.source, 'Temple office phone call');
    assert.equal(g.hours.prov.verifiedOn, today);
    assert.equal(g.phone.prov.kind, 'check', 'a review older than STALE_DAYS needs a re-check');
    assert.equal(g.phone.prov.stale, true);
  } finally { delete VERIFIED.madurai_meenakshi; }
});

test('journey plan: costs, crowds, times and flights are estimated; every temple has facts with provenance', () => {
  const plan = planJourney({ start: MADURAI, days: 3, travellers: 2, transport: 'bus' });
  for (const o of plan.options) {
    assert.equal(o.cost.prov.kind, 'estimated');
    for (const d of o.itinerary) {
      assert.equal(d.prov.kind, 'estimated');
      for (const s of d.stops) assert.equal(s.prov.kind, 'estimated');
    }
    for (const t of o.temples) for (const k of ['hours', 'phone', 'accessibility']) assert.ok(KINDS.includes(t.facts[k].prov.kind), `${t.id} ${k}`);
  }
  assert.equal(dayInfo('2026-11-14', { lat: 9.9, lon: 78.1, tags: ['shiva'] }).prov.kind, 'estimated');
  const abroad = planJourney({ start: { lat: 25.2048, lon: 55.2708, name: 'Dubai', cc: 'AE' }, destCc: 'IN', days: 6, travellers: 2, transport: 'flight' });
  assert.equal(abroad.flight.prov.kind, 'estimated');
  for (const o of abroad.options.filter((x) => x.flight)) assert.equal(o.flightCost.prov.kind, 'estimated');
});

test('trip end date is derived from the first day and the number of days', () => {
  assert.equal(tripEndDate('2026-10-30', 4), '2026-11-02');
  assert.equal(tripEndDate('2026-12-31', 1), '2026-12-31');
  assert.equal(tripEndDate('2028-02-28', 2), '2028-02-29');
  assert.equal(tripEndDate('', 3), null);
  assert.equal(tripEndDate('2026-10-30', 0), null);
});

test('accessibility needs beyond mobility: relaxed pace, longer darshan, rest breaks and notes', () => {
  assert.deepEqual(Object.keys(ACCESS_NEEDS), ['wheelchair', 'limited_walking', 'elderly', 'toilet', 'rest']);
  for (const n of Object.values(ACCESS_NEEDS)) assert.ok(n.en && /[஀-௿]/.test(n.ta) && n.note.en && n.note.ta);
  assert.deepEqual(normaliseNeeds([], 'wheelchair'), ['wheelchair']);
  assert.deepEqual(normaliseNeeds(['toilet', 'bogus'], 'limited'), ['toilet', 'limited_walking']);
  const base = planJourney({ start: MADURAI, days: 2, travellers: 2, transport: 'taxi', pace: 'packed' });
  assert.equal(base.inputs.pace, 'packed');
  assert.deepEqual(base.accessNotes, []);
  const toilet = planJourney({ start: MADURAI, days: 2, travellers: 2, transport: 'taxi', pace: 'packed', needs: ['toilet'] });
  assert.equal(toilet.inputs.pace, 'packed', 'a toilet-access need adds a note but does not slow the pace');
  assert.equal(toilet.accessNotes.length, 1);
  const slow = planJourney({ start: MADURAI, days: 2, travellers: 2, transport: 'taxi', pace: 'packed', needs: ['elderly', 'rest'] });
  assert.equal(slow.inputs.pace, 'relaxed');
  assert.deepEqual(slow.inputs.needs, ['elderly', 'rest']);
  const stops = slow.options[0].itinerary[0].stops;
  assert.ok(stops.every((s) => s.restMin === 30));
  const mins = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  assert.ok(stops.every((s) => mins(s.leave) - mins(s.arrive) === 90 + 20), 'relaxed 90 min + 20 min for an elderly companion');
  // Older saved plans with only `mobility` still slow the pace.
  assert.equal(planJourney({ start: MADURAI, days: 2, travellers: 1, transport: 'bus', mobility: 'wheelchair' }).inputs.pace, 'relaxed');
});

test('temple planner reuses the same provenance model (no second copy)', () => {
  const src = fs.readFileSync(new URL('../shared/temple-planner.js', import.meta.url), 'utf8');
  assert.match(src, /import \{ prov, templeFacts \} from '\.\/journey\.js'/);
  const now = new Date().toISOString();
  const plan = planTempleTrip({ departure: { city: 'Madurai', lat: 9.9252, lon: 78.1198 }, days: 2, weather: { madurai_meenakshi: { summary: 'Clear', checkedAt: now } } });
  for (const o of [plan.nearbyLowCost, ...plan.trips]) {
    assert.equal(o.practical.route.prov.kind, 'estimated');
    assert.equal(o.practical.crowds.prov.kind, 'estimated');
    assert.equal(o.practical.hours.prov.kind, 'check');
    assert.equal(o.practical.booking.confirmed, false);
  }
  const m = [plan.nearbyLowCost, ...plan.trips].find((o) => o.temple.id === 'madurai_meenakshi');
  if (m) { assert.equal(m.practical.weather.prov.kind, 'live'); assert.equal(m.practical.weather.lastVerified, now); }
});

test('screens: travel facts and tradition are separate blocks; offline banner; saved journeys list', () => {
  const j = fs.readFileSync(new URL('../public/screens-journey.js', import.meta.url), 'utf8');
  const w = fs.readFileSync(new URL('../public/screens-world.js', import.meta.url), 'utf8');
  assert.match(j, /export function savedJourneysHtml\(/);
  assert.match(j, /data-rename-plan/); assert.match(j, /data-delete-plan/); assert.match(j, /data-open-plan/);
  assert.match(j, /savedAt: new Date\(\)\.toISOString\(\)/);
  assert.match(j, /என் பயணத் திட்டங்கள்/);
  for (const src of [j, w]) {
    assert.match(src, /class="trad-block"/);
    assert.match(src, /class="facts-block"/);
    assert.match(src, /'Tradition', 'மரபு'/);
  }
  assert.match(w, /export function offlineBanner\(/);
  assert.match(w, /'Check before travel', 'பயணத்திற்கு முன் சரிபார்க்கவும்'/);
  assert.match(j, /offlineBanner\(\)/);
  assert.doesNotMatch(j, /t\.phone \|\| '—'/, 'no unlabelled phone value');
  assert.doesNotMatch(j, /class="badge est">\$\{L\('Estimate'/, 'estimates use the shared provenance badge');
  assert.doesNotMatch(j, /name="mobility"/, 'mobility select replaced by accessibility checkboxes');
});
