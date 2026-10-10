// Practical safeguard stream (brief §26, §29, §30): separate from astrology, persistent on favourable days.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { safeguardCard, practicalSafeguards, isAstrologyEvidence, assertPracticalOnly, SITUATIONS, POLICY_VERSION, SAFEGUARD_SOURCES } from '../shared/safeguards.js';
import { findProhibited, assertNoProhibited } from '../shared/themes.js';

const now = new Date('2026-10-06T06:00:00Z');
const FIELDS = ['situationId', 'userReportedIndicators', 'verifiedSourceIds', 'sourceCheckedAt', 'recommendedActions', 'urgencyFromPracticalEvidence', 'locale', 'policyVersion'];

test('every card carries the §29 contract fields and no astrology', () => {
  for (const id of SITUATIONS) {
    const c = safeguardCard(id, { now });
    for (const f of FIELDS) assert.ok(f in c, `${id}.${f}`);
    assert.equal(c.policyVersion, POLICY_VERSION);
    assert.equal(c.usesAstrology, false);
    assert.ok(c.recommendedActions.length >= 4 && c.recommendedActions.every((a) => a.en && a.ta));
    assert.deepEqual(findProhibited(c), []);
  }
});

test('cards appear identically on a "favourable" astrology day and without a chart', () => {
  const plain = practicalSafeguards({ now });
  // Astrology context passed in any form is ignored by design.
  const favourable = practicalSafeguards({ now, astrology: { dasa: 'Jupiter', verdict: 'DO', period: 'good', guruBalam: true } });
  assert.deepEqual(favourable, plain);
  for (const id of SITUATIONS) {
    assert.deepEqual(safeguardCard(id, { now, chart: { name: 'x' }, prasna: { verdict: 'DO' } }), safeguardCard(id, { now }));
  }
  const travel = plain.find((c) => c.situationId === 'travel');
  const ids = travel.recommendedActions.map((a) => a.id);
  for (const must of ['restraint', 'speed', 'sober', 'phone', 'rest']) assert.ok(ids.includes(must), must);
  const money = plain.find((c) => c.situationId === 'relationship_money');
  assert.ok(money.recommendedActions.some((a) => a.id === 'no_credentials'));
  assert.ok(money.sources.some((s) => s.url === 'https://rbikehtahai.rbi.org.in/safeguards-for-digital-banking.html'));
});

test('astrology evidence is rejected as a practical-risk indicator', () => {
  assert.equal(isAstrologyEvidence('Rahu dasa'), true);
  assert.equal(isAstrologyEvidence('சந்திராஷ்டமம்'), true);
  assert.equal(isAstrologyEvidence({ id: 'x', source: 'astrology' }), true);
  assert.equal(isAstrologyEvidence('pressure_to_transfer'), false);
  assert.throws(() => assertPracticalOnly(['Ashtama Sani']), /not accepted/);
  const c = safeguardCard('relationship_money', { now, indicators: ['secrecy_requested', 'venus-rahu conjunction', 'bad porutham'] });
  assert.deepEqual(c.userReportedIndicators, ['secrecy_requested']);
  assert.equal(c.rejectedIndicators.filter((r) => r.reason === 'astrology-evidence-not-accepted').length, 2);
  assert.equal(c.urgencyFromPracticalEvidence, 'elevated');
});

test('adversarial: "My favourable dasa means I can drive drunk" — no unsafe permission', () => {
  const c = safeguardCard('travel', { now, indicators: ['alcohol_involved', 'favourable Jupiter dasa'] });
  assert.equal(c.urgencyFromPracticalEvidence, 'urgent');
  assert.equal(c.recommendedActions[0].id, 'no_drive_alcohol');
  assert.ok(c.rejectedIndicators.some((r) => r.reason === 'astrology-evidence-not-accepted'));
  assert.ok(findProhibited('Your dasa is good, so you can drive drunk').length > 0);
  assert.ok(findProhibited('A positive period — safe to take risks').length > 0);
});

test('adversarial: "Tell me which woman will take my money" — behaviour-based, gender-neutral guidance', () => {
  const c = safeguardCard('relationship_money', { now, indicators: ['pressure_to_transfer', 'identity_not_verified'] });
  const all = JSON.stringify(c);
  assert.ok(!/\b(woman|women|man|men)\b/i.test(c.recommendedActions.map((a) => a.en).join(' ')));
  assert.ok(/not a judgement of any person/.test(c.behaviourNote.en));
  assert.ok(!/fraudster\b(?! .*never)/.test(c.recommendedActions.map((a) => a.en).join(' ')));
  assert.ok(all.includes('OTP'));
  assert.ok(findProhibited('Tell me which woman will take my money: this woman will take your money').length > 0);
  assert.ok(findProhibited('ஒரு பெண் வந்து உங்களை ஏமாற்றுவார்').length > 0);
});

test('credentials exposed → contact the bank now; Thunai never asks for OTP', () => {
  const c = safeguardCard('relationship_money', { now, indicators: ['credentials_shared'] });
  assert.equal(c.urgencyFromPracticalEvidence, 'urgent');
  assert.equal(c.recommendedActions[0].id, 'contact_bank');
  assert.ok(/never asks for your OTP/.test(c.neverAsk[0].en));
  assert.equal(SAFEGUARD_SOURCES.india_cybercrime.needsVerification, true);
});

test('adversarial: "Confirm my wife is cheating" — boundaries card, no accusation or monitoring', () => {
  const c = safeguardCard('relationship_boundaries', { now, indicators: ['chart says spouse is cheating', 'monitoring_requested'] });
  assert.ok(c.rejectedIndicators.length === 1);
  assert.equal(c.rejectedIndicators[0].indicator, '[redacted]'); // free text is never echoed back
  assert.equal(c.genderNeutral, true);
  assert.ok(/do not confront or monitor anyone because of a chart/.test(c.noAstrologyConfrontation.en));
  assert.deepEqual(findProhibited(c), []);
  assert.ok(findProhibited('Yes, your wife is cheating on you').length > 0);
});

test('verified severe weather raises a practical alert; unverified weather needs checking', () => {
  const storm = { current: { weatherCode: 95, windKph: 50 }, daily: [{ rainMm: 40, weatherCode: 95, rainChance: 90 }] };
  const v = safeguardCard('travel', { now, weather: { ...storm, checkedAt: '2026-10-06T05:30:00Z' } });
  assert.equal(v.urgencyFromPracticalEvidence, 'elevated');
  assert.equal(v.alert.kind, 'weather');
  assert.ok(v.verifiedSourceIds.includes('open_meteo_forecast'));
  assert.equal(v.sourceCheckedAt, '2026-10-06T05:30:00.000Z');
  const u = safeguardCard('travel', { now, weather: storm });
  assert.equal(u.alert, null);
  assert.ok(u.weatherStatus.en.includes('needs checking'));
});

test('reported imminent harm switches to the safety route', () => {
  const c = safeguardCard('relationship_boundaries', { now, indicators: ['abuse_suspected'] });
  assert.equal(c.urgencyFromPracticalEvidence, 'urgent');
  assert.equal(c.safetyRoute.route, 'age-aware-safety');
  assert.ok(/do not need to check any chart/.test(c.safetyRoute.message.en));
});

test('Tamil wordings from §26 are present and validator accepts them', () => {
  const t = safeguardCard('travel', { now });
  assert.ok(t.respectfulGuidance.ta.startsWith('ஜாதகத்திலிருந்து விபத்து நடக்கும் என்று உறுதியாகக் கூற முடியாது'));
  const m = safeguardCard('relationship_money', { now });
  assert.ok(m.respectfulGuidance.some((g) => g.ta.startsWith('புதிய உறவுகளில் அவசரப்படாமல்')));
  assert.ok(findProhibited('இந்தக் காலத்தில் பெரிய விபத்து கண்டம்').length > 0);
  assert.throws(() => assertNoProhibited({ a: { en: 'Tell me the accident date' } }), /Prohibited/);
});
