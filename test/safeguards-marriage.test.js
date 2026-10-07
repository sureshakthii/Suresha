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

// ------------------------------------------------------------------ UI render helpers (public/couple-cards.js)
const cardsUi = await import('../public/couple-cards.js');
const eph = { ephemeral: true, requesterId: 'self' };
const VERDICT_WORDS = /verdict|not recommended|recommended match|reject|perfect match|excellent match|bad match|good match|unsuitable|compatib\w* score|success rate|பொருத்தம் இல்லை|திருமணம் செய்ய வேண்டாம்|உத்தமப் பொருத்தம்/i;
const allHtml = (r, lang) => cardsUi.summaryHtml(r, { lang }) + cardsUi.resultCardsHtml(r, { lang }) + cardsUi.ashtakootaLinkHtml(lang);
const textOnly = (html) => html.replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<[^>]+>/g, ' ');

test('UI: five icon-and-text cards in order, each with a visible text title (never icon / colour only)', () => {
  const r = buildMatchingReport({ bride: A, groom: B, consent: eph, now });
  assert.equal(r.status, 'ok');
  for (const lang of ['en', 'ta']) {
    const html = cardsUi.resultCardsHtml(r, { lang });
    const cards = [...html.matchAll(/<details class="card glass mc-card" data-card="([a-z_]+)"[\s\S]*?<\/details>/g)];
    assert.deepEqual(cards.map((m) => m[1]), ['traditional', 'expectations', 'money', 'family', 'next_steps']);
    for (const [block, id] of cards) {
      const c = r.cards.find((x) => x.cardId === id);
      assert.match(block, /<svg class="ic"[^>]*>.*<(path|circle|rect|line)/, `${id} has an icon`);
      assert.ok(textOnly(block).includes(lang === 'ta' ? c.title.ta : c.title.en.replace('&', '&amp;')), `${id} has its text title`);
      assert.match(block, /<b class="mc-title">\d\. /, `${id} is numbered`);
    }
    // Card 1 shows all ten poruthams with a text result label, Rajju / Vedhai as key factors first.
    const trad = cards[0][0];
    assert.equal([...trad.matchAll(/data-factor="/g)].length, 10);
    assert.match(trad, /key-factors[\s\S]*data-factor="rajju"[\s\S]*data-factor="vedhai"[\s\S]*mini-label/);
    for (const f of r.traditionalFactorResults) assert.ok(trad.includes(cardsUi.factorRowHtml(f, lang)), f.factorId);
    // Cards 2–4 are optional prompts only.
    for (const [block, id] of cards.slice(1, 4)) { assert.match(block, /class="pill"/, id); assert.match(block, /<ul class="mc-prompts">/, id); }
  }
  assert.deepEqual(r.cards.map((c) => c.iconName), ['scroll-text', 'message-circle', 'coins', 'house-heart', 'calendar-check']);
});

test('UI: switching either person\'s marriage context never changes a factor, dosha or card 1', () => {
  const base = buildMatchingReport({ bride: A, groom: B, consent: eph, now });
  const baseHtml = cardsUi.resultCardsHtml(base, { lang: 'en' });
  const modes = Object.keys(MARRIAGE_MODES);
  for (const ma of modes) for (const mb of modes) for (const priv of [false, true]) {
    const r = buildMatchingReport({ bride: A, groom: B, consent: eph, now, modes: { a: { mode: ma, historyPrivate: priv }, b: { mode: mb } } });
    assert.deepEqual(r.traditionalFactorResults, base.traditionalFactorResults, `${ma}/${mb}`);
    assert.deepEqual(r.doshaReview, base.doshaReview, `${ma}/${mb}`);
    assert.equal(cardsUi.summaryHtml(r, { lang: 'en' }), cardsUi.summaryHtml(base, { lang: 'en' }));
    const html = cardsUi.resultCardsHtml(r, { lang: 'en' });
    const remarriage = [ma, mb].some((m) => m === 'widowed' || m === 'remarriage_after_divorce');
    assert.equal(html.includes('data-card="remarriage"'), remarriage, `${ma}/${mb}`);
    // Removing the optional remarriage card leaves the five standard cards byte-for-byte the same.
    assert.equal(html.replace(/<details class="card glass mc-card" data-card="remarriage"[\s\S]*?<\/details>/, ''), baseHtml);
  }
});

test('UI: remarriage card is neutral prompts only — no tradition-specific rule (expert approval pending)', () => {
  const r = buildMatchingReport({ bride: A, groom: B, consent: eph, now, modes: { a: { mode: 'widowed' }, b: { mode: 'remarriage_after_divorce' } } });
  const card = r.cards.find((c) => c.cardId === 'remarriage');
  assert.equal(card.traditionRule, null);
  assert.equal(card.traditionRuleStatus, 'expert-approval-pending');
  assert.equal(card.iconName, 'sprout');
  // The tradition-specific remarriage question is held back (expert approval pending) and filtered out of the screen.
  assert.ok(r.expertReviewQuestions.filter((q) => /remarriage/i.test(q.en)).every((q) => q.expertApprovalPending === true));
  const html = cardsUi.resultCardsHtml(r, { lang: 'en' });
  const block = /data-card="remarriage"[\s\S]*?<\/details>/.exec(html)[0];
  assert.match(block, /children from an earlier marriage/);
  assert.match(block, /blended-family/);
  assert.match(block, /timing feel comfortable/);
  assert.doesNotMatch(block, /house|bhava|7th|8th|dosha|samyam|Mangal|widow|death|die|infertil/i);
  assert.deepEqual(findProhibited(textOnly(html)), []);
});

test('UI: no verdict words, no percentage and Ashtakoota kept as its own separate link', () => {
  for (const [ma, mb] of [['first', 'first'], ['remarriage_after_divorce', 'first'], ['widowed', 'remarriage_after_divorce']]) {
    const r = buildMatchingReport({ bride: A, groom: B, consent: eph, now, modes: { a: { mode: ma }, b: { mode: mb } } });
    for (const lang of ['en', 'ta']) {
      const text = textOnly(allHtml(r, lang));
      assert.doesNotMatch(text, VERDICT_WORDS, `${ma}/${mb}/${lang}`);
      assert.doesNotMatch(text, /%|\/ ?36|\/ ?100|சதவீத/, `${ma}/${mb}/${lang}`);
      assert.deepEqual(findProhibited(text), []);
    }
  }
  const r = buildMatchingReport({ bride: A, groom: B, consent: eph, now });
  const cards = cardsUi.resultCardsHtml(r, { lang: 'en' });
  assert.doesNotMatch(cards, /Ashtakoota|gunamilan|guna/i, 'Ashtakoota is never inside the porutham cards');
  const ashta = cardsUi.ashtakootaLinkHtml('en');
  assert.match(ashta, /data-go="gunamilan"/);
  assert.match(ashta, /36-point Ashtakoota/);
  assert.match(ashta, /never added to the 10 poruthams/);
  assert.doesNotMatch(cardsUi.summaryHtml(r, { lang: 'en' }), new RegExp(String(r.ashtakoota.total)));
});

test('UI: unknown birth time shows the uncertainty notes inside card 1', () => {
  const U = { id: 'b', chart: birthChart({ name: 'U', date: '1994-02-18', time: '12:00', lat: 13.08, lon: 80.27, tz: 5.5, timePrecision: 'unknown' }) };
  const r = buildMatchingReport({ bride: A, groom: U, consent: eph, now });
  const html = cardsUi.traditionalBodyHtml(r, 'en', '<div id="dosha-slot"></div>');
  assert.match(html, /mc-unc[\s\S]*confirm both birth stars first/);
  assert.match(html, /mc-unc[\s\S]*approximate or unknown/);
  assert.ok(html.includes('<div id="dosha-slot"></div>'));
  assert.equal([...html.matchAll(/confirm both birth stars first/g)].length, 1, 'the birth-time limit is shown once, not on every row');
});

test('consent: an on-phone private look ("self") can be read but never saved, shared or exported', () => {
  const r = buildMatchingReport({ bride: A, groom: B, consent: eph, now, audience: 'both_participants' });
  assert.equal(r.status, 'ok');
  assert.deepEqual([r.exportPermissions.save, r.exportPermissions.share, r.exportPermissions.export], [false, false, false]);
  assert.equal(r.effectiveAudience, 'self_private');
  assert.equal(buildMatchingReport({ bride: A, groom: B, consent: { ephemeral: true, requesterId: 'someone-else' }, now }).status, 'refused');
  // Share needs BOTH people's own grant; one revoke stops it again.
  let l = createConsentLedger('pair');
  l = recordConsent(l, { participantId: 'bride', scopes: ['share', 'export'] });
  assert.equal(hasConsent(l, ['bride', 'groom'], 'share'), false);
  l = recordConsent(l, { participantId: 'groom', scopes: ['share', 'export'] });
  assert.equal(hasConsent(l, ['bride', 'groom'], 'share'), true);
  l = revokeConsent(l, { participantId: 'groom', scopes: ['share', 'export'] });
  assert.equal(hasConsent(l, ['bride', 'groom'], 'export'), false);
});

test('marriage context choices: four modes with the approved bilingual labels', () => {
  assert.deepEqual(MARRIAGE_MODES.first, { en: 'First marriage', ta: 'முதல் திருமணம்' });
  assert.deepEqual(MARRIAGE_MODES.remarriage_after_divorce, { en: 'Remarriage after divorce', ta: 'விவாகரத்துக்குப் பின் மறுமணம்' });
  assert.deepEqual(MARRIAGE_MODES.widowed, { en: 'Widowed, considering remarriage', ta: 'கணவர்/மனைவியை இழந்தவர், மறுமணம்' });
  assert.deepEqual(MARRIAGE_MODES.undisclosed, { en: 'Prefer not to say', ta: 'சொல்ல விரும்பவில்லை' });
  assert.equal(marriageContext({}).mode, 'undisclosed', 'unselected is treated as not disclosed');
  assert.equal(marriageContext({ mode: 'bogus' }).mode, 'undisclosed');
});
