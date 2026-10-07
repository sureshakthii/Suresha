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
  const love = MATCH_SCREENS.love();
  assert.match(love, /if \(f\.save && !f\.consent\) throw/);
  assert.doesNotMatch(love, /state\.family\.push/);
  const share = between(love, "$('#lvShare')?.addEventListener", '});\n}');
  assert.ok(share.indexOf("!$('#lvPerm')?.checked") >= 0 && share.indexOf("!$('#lvPerm')?.checked") < share.indexOf('navigator.share'));
});

test('health screens: no eat / avoid, body-part warnings or injury lines; wellbeing + optional reflection', () => {
  const card = between(src('public/screens-main.js'), 'function healthTodayCard(', '\n}\n');
  const screen = src('public/screens-health.js');
  const ask = between(src('public/ask-thunai.js'), '  health: {', '  education: {');
  for (const [id, s] of [['today', card], ['screen', screen], ['ask', ask]]) {
    assert.doesNotMatch(s, /\.diet\b|bodyAreas|Eat|Avoid|சாப்பிடலாம்|தவிர்க்கவும்|Care for|injur|காயம்|eat and avoid/, id);
  }
  for (const s of [card, screen]) {
    assert.match(s, /wellbeing|reviewLabel/);
    assert.match(s, /reflection|r\.label/);
  }
  assert.match(screen, /reviewLabel/);
  assert.match(screen, /not health advice|r\.note/);
  assert.doesNotMatch(src('shared/health.js'), /PLANET_DIET|DOSHA_DIET|buildDiet/);
  assert.doesNotMatch(between(src('shared/guidance.js'), "case 'health': {", "case 'emotional': {"), /\.diet|bodyAreas|hg\.months|Eat more|Fasting day/);
});

test('Mangalyam label removed from the marriage house checks', () => {
  assert.doesNotMatch(src('shared/lifecheck.js'), /Mangalyam|மாங்கல்யம் \(/);
  assert.doesNotMatch(src('shared/couple.js'), /Santhana|சந்தான பாக்கியம்|pairCapDate|lifespan-cap/);
});
