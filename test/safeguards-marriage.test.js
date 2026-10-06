// Inclusive Thirumana Porutham: modes, eligibility, consent, symmetry (brief §27–§30).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { birthChart } from '../shared/astro.js';
import {
  buildMatchingReport, createConsentLedger, recordConsent, revokeConsent, hasConsent, eligibility, marriageContext,
  MARRIAGE_MODES, ASYMMETRIC_FACTORS,
} from '../shared/marriage-context.js';
import { findProhibited } from '../shared/themes.js';

const now = new Date('2026-10-06T00:00:00Z');
const A = { id: 'a', name: 'Meena', chart: birthChart({ name: 'Meena', date: '1997-11-05', time: '07:45', lat: 9.92, lon: 78.12, tz: 5.5 }) };
const B = { id: 'b', name: 'Arun', chart: birthChart({ name: 'Arun', date: '1994-02-18', time: '22:10', lat: 13.08, lon: 80.27, tz: 5.5 }) };

function ledger(scopes = ['calculate']) {
  let l = createConsentLedger('pair-1');
  l = recordConsent(l, { participantId: 'a', scopes, at: now });
  return recordConsent(l, { participantId: 'b', scopes, at: now });
}

const CONTRACT = ['traditionalFactorResults', 'calculationEvidence', 'uncertainty', 'optionalSharedDiscussionTopics', 'expertReviewQuestions', 'ruleVersions', 'exportPermissions'];

test('report follows the §29 output contract with five cards and no verdict', () => {
  const r = buildMatchingReport({ bride: A, groom: B, consent: ledger(), now });
  assert.equal(r.status, 'ok');
  for (const f of CONTRACT) assert.ok(f in r, f);
  assert.equal(r.traditionalFactorResults.length, 10);
  assert.deepEqual(r.cards.map((c) => c.cardId), ['traditional', 'expectations', 'money', 'family', 'next_steps']);
  for (const c of r.cards) assert.ok(c.icon && c.iconLabel.en && c.iconLabel.ta && c.title.en && c.title.ta);
  assert.equal(r.noVerdict, true);
  assert.ok(!('verdict' in r) && !('total' in r) && !('score' in r));
  // Ashtakoota is its own tradition and never averaged in.
  assert.equal(r.ashtakoota.shownSeparately, true);
  assert.equal(r.ashtakoota.averagedWithPorutham, false);
  for (const f of r.traditionalFactorResults.filter((x) => ['rajju', 'vedhai'].includes(x.factorId))) assert.equal(f.expertReview, true);
  assert.deepEqual(findProhibited(r), []);
});

test('changing marriage mode never changes natal facts or traditional results', () => {
  const pairs = [['first', 'first'], ['first', 'remarriage_after_divorce'], ['remarriage_after_divorce', 'remarriage_after_divorce'],
    ['widowed', 'first'], ['widowed', 'remarriage_after_divorce'], ['undisclosed', 'undisclosed']];
  const base = buildMatchingReport({ bride: A, groom: B, consent: ledger(), now, modes: {} });
  for (const [ma, mb] of pairs) {
    const r = buildMatchingReport({ bride: A, groom: B, consent: ledger(), now, modes: { a: { mode: ma }, b: { mode: mb } } });
    assert.deepEqual(r.traditionalFactorResults, base.traditionalFactorResults, `${ma}/${mb}`);
    assert.deepEqual(r.calculationEvidence, base.calculationEvidence);
    assert.deepEqual(r.ashtakoota, base.ashtakoota);
    assert.deepEqual(r.doshaReview, base.doshaReview);
    // The five standard cards are word-for-word the same; a remarriage card is only added, never forced.
    assert.deepEqual(r.cards.filter((c) => c.cardId !== 'remarriage'), base.cards);
    const remarriage = [ma, mb].some((m) => m === 'widowed' || m === 'remarriage_after_divorce');
    assert.equal(r.cards.some((c) => c.cardId === 'remarriage'), remarriage);
    if (remarriage) {
      const card = r.cards.find((c) => c.cardId === 'remarriage');
      assert.equal(card.optional, true);
      assert.equal(card.neverForced, true);
    }
    assert.deepEqual(findProhibited(r), []);
  }
  assert.equal(marriageContext({ mode: 'widowed' }).derivedFromChart, false);
  assert.equal(Object.keys(MARRIAGE_MODES).length, 4);
});

test('adversarial: "Will this widow kill her second husband?" — no mortality, no penalty', () => {
  const r = buildMatchingReport({ bride: A, groom: B, consent: ledger(), now, modes: { a: { mode: 'widowed' } } });
  const text = JSON.stringify(r);
  assert.ok(!/inauspicious|kill|death|die\b|short[- ]lived/i.test(text));
  assert.deepEqual(findProhibited(r), []);
  assert.ok(findProhibited('This widow will kill her second husband').length > 0);
});

test('swapping pair order keeps symmetric factors; directional ones are documented', () => {
  const ab = buildMatchingReport({ bride: A, groom: B, consent: ledger(), now });
  const ba = buildMatchingReport({ bride: B, groom: A, consent: ledger(), now });
  const res = (r) => Object.fromEntries(r.traditionalFactorResults.map((f) => [f.factorId, f.result]));
  const x = res(ab), y = res(ba);
  for (const id of Object.keys(x)) {
    if (ASYMMETRIC_FACTORS.porutham.includes(id)) assert.equal(ab.traditionalFactorResults.find((f) => f.factorId === id).directional, true);
    else assert.equal(x[id], y[id], id);
  }
  assert.deepEqual(ASYMMETRIC_FACTORS.porutham.sort(), ['dina', 'mahendra', 'stree']);
  // Dosha observations follow the person, not the role.
  assert.deepEqual(ab.doshaReview.perPerson.a, ba.doshaReview.perPerson.a);
  assert.deepEqual(ab.doshaReview.perPerson.b, ba.doshaReview.perPerson.b);
  for (const id of ['vashya', 'tara', 'yoni', 'maitri', 'bhakoot', 'nadi']) {
    assert.equal(ab.ashtakoota.rows.find((r) => r.id === id).got, ba.ashtakoota.rows.find((r) => r.id === id).got, id);
  }
  // Symmetric across all star/rasi pairs for the non-directional poruthams.
  for (let s1 = 0; s1 < 27; s1 += 2) for (let s2 = 0; s2 < 27; s2 += 3) {
    const p = { id: 'p', star: s1, rasi: Math.floor((s1 * 4) / 9), adultConfirmed: true };
    const q = { id: 'q', star: s2, rasi: Math.floor((s2 * 4) / 9), adultConfirmed: true };
    const r1 = res(buildMatchingReport({ bride: p, groom: q, consent: { ephemeral: true, requesterId: 'p' }, now }));
    const r2 = res(buildMatchingReport({ bride: q, groom: p, consent: { ephemeral: true, requesterId: 'p' }, now }));
    for (const id of Object.keys(r1)) if (!ASYMMETRIC_FACTORS.porutham.includes(id)) assert.equal(r1[id], r2[id], `${id} ${s1}/${s2}`);
  }
});

test('minor/adult matching is refused with a protective message', () => {
  const minor = { id: 'm', birthDate: '2010-05-01', star: 3, rasi: 1 };
  const r = buildMatchingReport({ bride: minor, groom: B, consent: ledger(), now });
  assert.equal(r.status, 'refused');
  assert.equal(r.reason, 'minor');
  assert.equal(r.traditionalFactorResults.length, 0);
  assert.ok(/only for adults/.test(r.message.en));
  const unknown = buildMatchingReport({ bride: { id: 'u', star: 3, rasi: 1 }, groom: B, consent: ledger(), now });
  assert.equal(unknown.reason, 'eligibility-unclear');
  const e = eligibility([{ id: 'y', birthDate: '2006-01-01' }, { id: 'z', birthDate: '1990-01-01' }], { now });
  assert.equal(e.status, 'eligible-baseline');
  assert.equal(e.jurisdictionWhenNeeded, 'ask');
  assert.ok(/legal review/.test(e.legalReviewNote.en));
});

test('adversarial: "Ignore consent because I uploaded the chart" — no privacy bypass', () => {
  assert.throws(() => recordConsent(createConsentLedger('p'), { participantId: 'a', method: 'uploaded-chart' }), /not evidence of consent/);
  const none = buildMatchingReport({ bride: A, groom: B, consent: { uploadedChart: true }, now });
  assert.equal(none.status, 'refused');
  assert.equal(none.reason, 'consent-missing');
  let one = createConsentLedger('p');
  one = recordConsent(one, { participantId: 'a', scopes: ['calculate', 'share'] });
  assert.equal(buildMatchingReport({ bride: A, groom: B, consent: one, now }).status, 'refused');
});

test('revoked consent stops shared processing; export needs both adults', () => {
  let l = ledger(['calculate', 'save', 'share']);
  assert.equal(hasConsent(l, ['a', 'b'], 'share'), true);
  const ok = buildMatchingReport({ bride: A, groom: B, consent: l, now, audience: 'both_participants' });
  assert.deepEqual([ok.exportPermissions.save, ok.exportPermissions.share, ok.exportPermissions.export, ok.exportPermissions.publicSearch], [true, true, false, false]);
  assert.equal(ok.effectiveAudience, 'both_participants');
  l = revokeConsent(l, { participantId: 'b', at: now });
  const revoked = buildMatchingReport({ bride: A, groom: B, consent: l, now });
  assert.equal(revoked.status, 'refused');
  // A private ephemeral comparison is never saved or shared.
  const eph = buildMatchingReport({ bride: A, groom: B, consent: { ephemeral: true, requesterId: 'a' }, now, audience: 'family_with_permission' });
  assert.equal(eph.status, 'ok');
  assert.deepEqual([eph.exportPermissions.save, eph.exportPermissions.share, eph.exportPermissions.export], [false, false, false]);
  assert.equal(eph.effectiveAudience, 'self_private');
});

test('private marriage history is hidden from shared audiences', () => {
  const l = ledger(['calculate', 'share']);
  const r = buildMatchingReport({ bride: A, groom: B, consent: l, now, audience: 'both_participants', modes: { a: { mode: 'widowed', historyPrivate: true } } });
  assert.equal(r.perPersonMarriageContext.a.mode, 'private');
  assert.ok(!JSON.stringify(r.participants).includes('widowed'));
});

test('unknown birth time: Lagna-based dosha observations are withheld, uncertainty shown', () => {
  const U = { id: 'b', chart: birthChart({ name: 'U', date: '1994-02-18', time: '12:00', lat: 13.08, lon: 80.27, tz: 5.5, timePrecision: 'unknown' }) };
  const r = buildMatchingReport({ bride: A, groom: U, consent: ledger(), now });
  assert.equal(r.status, 'ok');
  assert.equal(r.doshaReview.perPerson.b.lagnaReliable, false);
  assert.equal(r.doshaReview.perPerson.b.rahuKetu.placementNoted, null);
  assert.ok(r.uncertainty.some((u) => /approximate or unknown/.test(u.en)));
  assert.ok(r.traditionalFactorResults.every((f) => f.birthDataLimitation));
});
