// Owner's final checklist (§5 health, §6 matching): source-level guards for the screens, plus engine checks.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const src = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const between = (s, a, b) => { const i = s.indexOf(a); assert.ok(i >= 0, a); const j = s.indexOf(b, i + a.length); return s.slice(i, j < 0 ? undefined : j); };

const MATCH_SCREENS = {
  porutham: () => between(src('public/screens-tools.js'), 'function computePorutham()', "registerScreen('porutham'"),
  couple: () => src('public/screens-couple.js'),
  love: () => src('public/screens-love.js'),
  gunamilan: () => between(src('public/screens-extra.js'), 'function showGuna(', "registerScreen('gunamilan'"),
};

test('matching screens: no marry / reject verdicts, no combined /100 or % scores', () => {
  for (const [id, get] of Object.entries(MATCH_SCREENS)) {
    const s = get();
    assert.doesNotMatch(s, /Not recommended|பொருத்தம் இல்லை|Soulmate|உயிர்த் துணை|blessed|ஆசீர்வதிக்கப்பட்ட/, id);
    assert.doesNotMatch(s, /VERDICTS|verdict-big|r\.verdict|r\.overall|r\.vibe|Love vibe|காதல் அதிர்வு/, id);
    if (id !== 'gunamilan') assert.doesNotMatch(s, /r\.total\b/, id); // Ashtakoota's own /36 is the only total shown
    assert.doesNotMatch(s, /<small>\/100<\/small>|\$\{[^}]*\}%(?!")/, id); // a %-width bar is fine, a % shown as text is not
  }
  // Ashtakoota keeps its own /36, shown only on its own screen and never with the poruthams.
  assert.match(MATCH_SCREENS.gunamilan(), /r\.total\}<small> \/ \$\{r\.max\}/);
  for (const id of ['porutham', 'couple', 'love']) assert.doesNotMatch(MATCH_SCREENS[id](), /gunaMilan|\/ ?36/, id);
});

test('matching screens: factor count, key factors, detailed view, exceptions, birth-time notes and talking points', () => {
  const couple = MATCH_SCREENS.couple();
  for (const needle of ['traditional factors agree', 'KEY_FACTORS_TITLE', 'DETAILED_VIEW_TITLE', 'c.exceptions', 'e.reason', 'needs birth time', 'DISCUSSION_TOPICS', 'reportHorizon.label']) {
    assert.ok(couple.includes(needle), needle);
  }
  // Complete marriage porutham (§6 / §1h): summary + five icon-and-text cards + separate Ashtakoota link + expert view.
  const show = between(couple, 'function showCouple(', '\n}\n');
  for (const needle of ['summaryHtml(mr', 'resultCardsHtml(mr', 'ashtakootaLinkHtml(lang)', 'Expert view', 'doshaBlockHtml(', 'momentsHtml(r.moments)', 'data-go="muhurtham"', 'expertReviewQuestions']) {
    assert.ok(show.includes(needle), needle);
  }
  assert.match(show, /expertReviewQuestions\.filter\(\(q\) => !q\.expertApprovalPending\)/);
  assert.ok(show.indexOf('resultCardsHtml(') < show.indexOf('ashtakootaLinkHtml(') && show.indexOf('ashtakootaLinkHtml(') < show.indexOf('Expert view'));
  // The older stacked blocks are gone from the result (no second porutham view, no separate talking-points list).
  assert.doesNotMatch(show, /poruthamView\(|discussionHtml\(\)|Key moments/);
  // Marriage context: asked separately for both people, unselected = not disclosed, never fed to a calculation or the AI reading.
  assert.match(couple, /personBlock\('bride', [^\n]*context: true/);
  assert.match(couple, /personBlock\('groom', [^\n]*context: true/);
  assert.match(couple, /ctxMode \|\| 'undisclosed'/);
  assert.doesNotMatch(between(show, "$('#coupleRead')", 'aiTask('), /ctxMode|modesFor|marriageContext|MARRIAGE_MODES/);
  assert.doesNotMatch(between(couple, 'export function coupleMatchingReport', '\n}\n'), /marriageReport\(/);
  // Quick porutham stays simple and links to the full five-card report, prefilled with both family members.
  const quick = MATCH_SCREENS.porutham();
  assert.match(quick, /data-go="couple"[^\n]*bride: g\.memberId, groom: b\.memberId[^\n]*See full five-card report/);
  assert.doesNotMatch(couple, /e\.status|proposed/, 'exception status is not shown — only the condition and reason');
  const por = MATCH_SCREENS.porutham();
  assert.match(por, /poruthamView\(/);
  assert.match(por, /discussionHtml\(\)/);
  assert.match(src('public/screens-tools.js'), /doshams\(c\.planets, \{ stability: c\.stability \}\), lagnaUnknown: !hasLagna\(c\)/);
  assert.match(couple, /doshamReference\(d\)/);
  assert.match(couple, /stabilityChip\(chart, 'lagna', 'house:Mars'\)/);
});

test('permission: saving another adult or sharing a pair result needs "I have this person’s permission"', () => {
  const couple = MATCH_SCREENS.couple();
  assert.match(couple, /இவரின் அனுமதி பெற்றுள்ளேன்/);
  assert.match(couple, /I have this person’s permission/);
  // resolve(): save without consent throws before anything is stored; the saved profile carries consentAt.
  const resolve = between(couple, 'function resolve(', '\n}\n');
  assert.ok(resolve.indexOf('f.save && !f.consent') >= 0 && resolve.indexOf('f.save && !f.consent') < resolve.indexOf('saveWithConsent('));
  assert.match(between(couple, 'export function saveWithConsent', '\n}\n'), /consentAt: new Date\(\)\.toISOString\(\)/);
  assert.doesNotMatch(couple.replace(between(couple, 'export function saveWithConsent', '\n}\n'), ''), /state\.family\.push/);
  // The permission is a consent-ledger record on the saved profile, and can be withdrawn from that profile.
  assert.match(between(couple, 'export function saveWithConsent', '\n}\n'), /consentLedger = recordConsent\(createConsentLedger/);
  const revoke = between(couple, 'export function revokeProfileConsent', '\n}\n');
  assert.ok(revoke.indexOf('revokeConsent(') >= 0 && revoke.indexOf('revokeConsent(') < revoke.indexOf('state.family = state.family.filter'));
  assert.match(couple, /data-revoke=/);
  // Pair report: share needs hasConsent(…, 'share') and print/PDF needs 'export' for BOTH people, checked before acting.
  const show = between(couple, 'function showCouple(', '\n}\n');
  const pairShare = between(show, "$('#mcShare')", '\n  });');
  assert.ok(pairShare.indexOf("consented('share')") >= 0 && pairShare.indexOf("consented('share')") < pairShare.indexOf('navigator.share'));
  const print = between(show, "$('#mcPrint')", '\n  });');
  assert.ok(print.indexOf("consented('export')") >= 0 && print.indexOf("consented('export')") < print.indexOf('printPage('), 'permission before printing (printPage: also the Android app)');
  assert.match(between(show, 'const consented', '};'), /hasConsent\(coupleUi\.ledger, coupleUi\.ids, scope\)/);
  assert.match(show, /recordConsent\(coupleUi\.ledger, \{ participantId: slot, scopes: \['share', 'export'\] \}\)/);
  assert.match(show, /revokeConsent\(coupleUi\.ledger/);
  // The on-phone report is a private ephemeral look — never saved or shared by itself.
  assert.match(couple, /consent: \{ ephemeral: true, requesterId: 'self' \}/);
  const love = MATCH_SCREENS.love();
  assert.match(love, /if \(f\.save && !f\.consent\) throw/);
  assert.doesNotMatch(love, /state\.family\.push/);
  const share = between(love, "$('#lvShare')?.addEventListener", '});\n}');
  assert.ok(share.indexOf("!$('#lvPerm')?.checked") >= 0 && share.indexOf("!$('#lvPerm')?.checked") < share.indexOf('navigator.share'));
});

// The full Jathagam health guide screen (public/screens-health.js) carries traditional body areas and food tips for
// adults again (owner request, Oct 2026; test/health-guide.test.js). The Today card and Ask Thunai keep the rule:
// no eat / avoid lists, body-part warnings or injury lines of their own — Today shows only the one-line
// healthNowHtml() summary, which links to the full guide.
test('health screens: no eat / avoid, body-part warnings or injury lines on Today / Ask; the guide carries the doctor line', () => {
  const card = between(src('public/screens-main.js'), 'function healthTodayCard(', '\n}\n');
  const screen = src('public/screens-health.js');
  const ask = between(src('public/ask-thunai.js'), '  health: {', '  education: {');
  for (const [id, s] of [['today', card], ['ask', ask]]) {
    assert.doesNotMatch(s, /\.diet\b|bodyAreas|Eat|Avoid|சாப்பிடலாம்|தவிர்க்கவும்|Care for|injur|காயம்|eat and avoid/, id);
  }
  assert.match(card, /wellbeing|reviewLabel/);
  assert.match(card, /reflection|r\.label/);
  assert.match(card, /healthNowHtml\(m[,)]/);
  // The internal "Needs medical review" flag is never shown to people (detail audit #4).
  assert.doesNotMatch(card + screen, /reviewLabel/);
  assert.match(screen, /h\.disclaimer/);
  assert.match(screen, /trad\(/);
  assert.doesNotMatch(screen, /injur|காயம்/);
  assert.doesNotMatch(between(src('shared/guidance.js'), "case 'health': {", "case 'emotional': {"), /\.diet|bodyAreas|hg\.months|Eat more|Fasting day/);
});

test('Mangalyam label removed from the marriage house checks', () => {
  assert.doesNotMatch(src('shared/lifecheck.js'), /Mangalyam|மாங்கல்யம் \(/);
  assert.doesNotMatch(src('shared/couple.js'), /Santhana|சந்தான பாக்கியம்|pairCapDate|lifespan-cap/);
});
