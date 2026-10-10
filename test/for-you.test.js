// Thunai For You: chart-led fields, stars and periods; the person's own details drive the search; community is never
// guessed; health never gets timing; every link is a plain https link to a known site.
import test from 'node:test';
import assert from 'node:assert/strict';
import { birthChart } from '../shared/astro.js';
import { jobPlan, marriagePlan, healthPlan, legalPlan, studyPlan, engineQuery, compatibleStars, jobLinks, matrimonyLinks, EDUCATION, SPECIALTIES, LEGAL_PROBLEMS } from '../shared/for-you.js';
import { matchPorutham } from '../shared/porutham.js';
import { scanCertainty } from '../shared/certainty-guard.js';
import { findProhibited } from '../shared/themes.js';

const NOW = new Date('2026-10-10T06:00:00Z');
const C = birthChart({ date: '2002-03-21', time: '10:15:00', lat: 13.08, lon: 80.27, tz: 5.5 });
const HOSTS = /^https:\/\/(www\.)?(google\.com|naukri\.com|in\.indeed\.com|linkedin\.com|naukrigulf\.com|tamilmatrimony\.com|bharatmatrimony\.com|shaadi\.com|tnvelaivaaippu\.gov\.in|tnpsc\.gov\.in|naanmudhalvan\.tn\.gov\.in|ncs\.gov\.in|apprenticeshipindia\.gov\.in|cybercrime\.gov\.in|nalsa\.gov\.in|edaakhil\.nic\.in|ecourts\.gov\.in|tneaonline\.org|scholarships\.gov\.in)(\/|$)/;
const urls = (o) => JSON.stringify(o).match(/https:\/\/[^"\s]+/g) || [];

test('job plan: fields come from the chart and the education, each with search links; every link is a known https site', () => {
  for (const e of EDUCATION) {
    const j = jobPlan({ chart: C, education: e.id, experience: 'fresher', place: 'Chennai, Tamil Nadu, India', cc: 'IN', now: NOW });
    assert.ok(j.fields.length >= 1 && j.fields.length <= 4, e.id);
    assert.ok(j.fields.every((f) => f.links.length >= 3), e.id);
    for (const u of urls(j)) assert.match(u, HOSTS, u);
    assert.deepEqual(scanCertainty(JSON.stringify(j)), []);
    assert.deepEqual(findProhibited(j), []);
  }
  assert.ok(jobLinks('accountant', 'Dubai, UAE', 'AE').some((l) => /naukrigulf/.test(l.url)));
  assert.ok(!jobLinks('accountant', 'London, UK', 'GB').some((l) => /naukri\.com|indeed/.test(l.url)));
});

test('compatible stars all have Rajju and Vedhai agreeing and at least 7 of 10, for both genders', () => {
  for (const gender of ['male', 'female']) {
    const list = compatibleStars(C.janmaNakshatra.index, C.janmaRasi.index, gender);
    assert.ok(list.length > 0);
    for (const s of list) {
      const me = { star: C.janmaNakshatra.index, rasi: C.janmaRasi.index }, o = { star: s.star, rasi: s.rasi };
      const m = gender === 'female' ? matchPorutham(me, o) : matchPorutham(o, me);
      assert.ok(!m.keyFactorsDisagree && m.agree >= 7 && m.agree === s.agree);
    }
  }
});

test('community is only what the family typed: absent from the search when empty, never derived from the chart', () => {
  const none = marriagePlan({ chart: C, gender: 'male', place: 'Chennai', now: NOW });
  const typed = marriagePlan({ chart: C, gender: 'male', community: 'Mudaliar', place: 'Chennai', now: NOW });
  assert.doesNotMatch(none.links.at(-1).url, /Mudaliar/);
  assert.match(typed.links.at(-1).url, /Mudaliar/);
  assert.equal(none.seeking, 'bride');
  assert.equal(marriagePlan({ chart: C, gender: 'female', now: NOW }).seeking, 'groom');
  const second = marriagePlan({ chart: C, gender: 'male', second: true, now: NOW });
  assert.match(second.links.at(-1).url, /second%20marriage/);
  for (const g of [none, typed, second]) { assert.deepEqual(scanCertainty(JSON.stringify(g)), []); assert.deepEqual(findProhibited(g), []); for (const u of urls(g)) assert.match(u, HOSTS, u); }
  assert.match(matrimonyLinks({ seeking: 'groom', stars: ['Hastham'] }).at(-1).url, /groom/);
});

test('health: no timing, doctor first, local emergency numbers', () => {
  for (const s of SPECIALTIES) {
    const h = healthPlan({ specialty: s.id, place: 'Chennai', cc: 'IN' });
    assert.ok(!('when' in h));
    assert.match(h.first.en, /doctor/);
    assert.match(h.emergency.en, /108/);
    for (const u of urls(h)) assert.match(u, HOSTS, u);
  }
  assert.match(healthPlan({ place: 'Dubai', cc: 'AE' }).emergency.en, /998/);
});

test('legal help: official help lines first, lawyer search, court periods only for disputes — never for crime or violence', () => {
  for (const pb of LEGAL_PROBLEMS) {
    const g = legalPlan({ chart: C, problem: pb.id, place: 'Chennai', cc: 'IN', now: NOW });
    assert.ok(g.help.some((h) => h.url === 'tel:112'));
    assert.match(g.first.en, /lawyer/);
    assert.equal(Boolean(g.when), pb.court, pb.id);
    for (const u of urls(g)) assert.match(u, HOSTS, u);
    assert.deepEqual(scanCertainty(JSON.stringify(g)), []);
  }
  assert.ok(legalPlan({ chart: C, problem: 'cyber' }).help.some((h) => /cybercrime/.test(h.url)));
  assert.ok(legalPlan({ chart: C, problem: 'police', cc: 'AE' }).help.some((h) => h.url === 'tel:999'));
});

test('studies and the engine query: chart streams, college searches, and only short keywords for the live search', () => {
  const s = studyPlan({ chart: C, place: 'Chennai', now: NOW });
  for (const u of urls(s)) assert.match(u, HOSTS, u);
  const qs = [engineQuery('job', jobPlan({ chart: C, education: 'engineering', now: NOW })), engineQuery('study', s), engineQuery('health', healthPlan({ specialty: 'heart' })),
    engineQuery('legal', legalPlan({ chart: C, problem: 'property' })), engineQuery('second', marriagePlan({ chart: C, second: true, community: 'Mudaliar', now: NOW }))];
  assert.deepEqual(qs.map((q) => q.category), ['job', 'college', 'hospital', 'lawyer', 'matrimony']);
  for (const q of qs) { assert.ok(q.keywords.length <= 6 && q.keywords.every((k) => typeof k === 'string' && k.length <= 80)); assert.doesNotMatch(JSON.stringify(q), /2002|Karthik|nakshatra/i); }
});
