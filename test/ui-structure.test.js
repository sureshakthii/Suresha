// UI structure: one tool registry reaches every screen; the launcher search understands Tamil, English and
// Tanglish; Settings shows no version line or owner dashboard to ordinary users; there is no Simple / Detailed
// view mode; Today keeps its attention order; every in-app link and back button points at a real screen.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pub = path.join(root, 'public');
const { GROUPS, TOOLS, TABS, ROUTES, QUICK, searchTools, normalize } = await import(pathToFileURL(path.join(pub, 'tool-registry.js')).href);

const jsFiles = fs.readdirSync(pub).filter((f) => f.endsWith('.js') && f !== 'sw.js');
const src = Object.fromEntries(jsFiles.map((f) => [f, fs.readFileSync(path.join(pub, f), 'utf8')]));
const registered = new Map(); // screen id -> { file, parent }
for (const [f, s] of Object.entries(src)) {
  for (const m of s.matchAll(/registerScreen\('([\w-]+)',\s*\{([^\n]*)/g)) {
    const parent = /parent:\s*'([\w-]+)'/.exec(m[2])?.[1] || null;
    registered.set(m[1], { file: f, parent });
  }
}

test('the registry is well formed: unique ids, known groups, intent order', () => {
  assert.deepEqual(GROUPS.map((g) => g.id), ['today', 'ask', 'mychart', 'family', 'subha', 'worship', 'services', 'more']);
  const ids = TOOLS.map((t) => t.id);
  assert.equal(new Set(ids).size, ids.length, 'duplicate tool ids');
  for (const t of TOOLS) {
    assert.ok(GROUPS.some((g) => g.id === t.group), `${t.id}: unknown group ${t.group}`);
    assert.ok(t.en && t.ta, `${t.id}: needs English and Tamil names`);
    assert.match(t.ta, /[஀-௿]/, `${t.id}: Tamil name must be in Tamil script`);
  }
  for (const g of GROUPS) assert.ok(TOOLS.some((t) => t.group === g.id), `group ${g.id} is empty`);
  // The owner's grouping
  const where = (id) => TOOLS.find((t) => t.id === id)?.group;
  assert.equal(where('panchangam'), 'today');
  assert.equal(where('chat'), 'ask'); assert.equal(where('ask'), 'ask');
  for (const id of ['chart', 'analysis', 'roadmap', 'health']) assert.equal(where(id), 'mychart', id);
  for (const id of ['family', 'porutham', 'couple', 'lovematch', 'names', 'starbday']) assert.equal(where(id), 'family', id);
  for (const id of ['muhurtham', 'calendar', 'vratham']) assert.equal(where(id), 'subha', id);
  for (const id of ['parigaram', 'temples', 'journey', 'mantras']) assert.equal(where(id), 'worship', id);
  for (const id of ['priests', 'store', 'seva', 'bookings']) assert.equal(where(id), 'services', id);
  for (const id of ['numerology', 'vargas', 'gunamilan', 'peyarchi', 'more']) assert.equal(where(id), 'more', id);
});

test('every registered screen is reachable from the tool registry, a tab or a fixed route', () => {
  assert.ok(registered.size >= 50, `found only ${registered.size} screens`);
  const reach = new Set([...TOOLS.map((t) => t.id), ...TABS, ...Object.keys(ROUTES)]);
  const orphans = [...registered.keys()].filter((id) => !reach.has(id));
  assert.deepEqual(orphans, [], `screens not reachable from the registry: ${orphans.join(', ')}`);
  for (const [id, via] of Object.entries(ROUTES)) assert.ok(via === 'tab' || registered.has(via), `${id} is reached via unknown screen ${via}`);
});

test('every registry entry, tab and quick action opens a real screen (no dead links)', () => {
  for (const t of TOOLS) assert.ok(registered.has(t.id), `tool ${t.id} has no registered screen`);
  for (const id of TABS) assert.ok(registered.has(id), `tab ${id}`);
  for (const id of QUICK) assert.ok(TOOLS.some((t) => t.id === id), `quick action ${id}`);
  assert.deepEqual(QUICK, ['chat', 'ask', 'porutham', 'temples', 'names', 'muhurtham']);
});

test('every data-go link and every back-button parent points at a registered screen', () => {
  const html = fs.readFileSync(path.join(pub, 'index.html'), 'utf8');
  const targets = new Set();
  for (const s of [...Object.values(src), html]) for (const m of s.matchAll(/data-go="([\w-]+)"/g)) targets.add(m[1]);
  const dead = [...targets].filter((id) => !registered.has(id));
  assert.deepEqual(dead, [], `links to unknown screens: ${dead.join(', ')}`);
  for (const [id, { parent }] of registered) if (parent) assert.ok(registered.has(parent), `${id}: back goes to unknown ${parent}`);
  const hubOf = /export const HUB_OF = \{([\s\S]*?)\n\};/.exec(src['core.js'])?.[1] || '';
  for (const m of hubOf.matchAll(/(\w+):\s*'(\w+)'/g)) assert.ok(registered.has(m[2]), `HUB_OF ${m[1]} -> unknown ${m[2]}`);
});

test('the tab bar has the five destinations and the header opens the tools search', () => {
  const html = fs.readFileSync(path.join(pub, 'index.html'), 'utf8');
  const tabs = [...html.matchAll(/data-tab="(\w+)"/g)].map((m) => m[1]);
  assert.deepEqual(tabs, TABS);
  assert.match(html, /class="topbar"[\s\S]*data-go="tools"[\s\S]*<\/header>/, 'header search button');
});

test('search finds tools by Tamil, English and Tanglish names', () => {
  const first = (q) => searchTools(q)[0]?.id;
  const has = (q, id) => searchTools(q).slice(0, 3).some((t) => t.id === id);
  // Tanglish (and its spelling variants)
  assert.equal(first('porutham'), 'porutham');
  assert.equal(first('poruththam'), 'porutham');
  assert.equal(first('rahu kalam'), 'panchangam');
  assert.equal(first('rahukaalam'), 'panchangam');
  assert.equal(first('nalla neram'), 'panchangam');
  assert.equal(first('baby names'), 'names');
  assert.equal(first('kulanthai peyar'), 'names');
  assert.ok(has('kalyanam', 'porutham'));
  assert.equal(first('muhurtham'), 'muhurtham');
  assert.equal(first('prasnam'), 'ask');
  assert.equal(first('koil'), 'temples');
  // English
  assert.equal(first('temple'), 'temples');
  assert.equal(first('star birthday'), 'starbday');
  assert.equal(first('settings'), 'more');
  assert.equal(first('dasa'), 'roadmap');
  // Tamil
  assert.equal(first('கோவில்'), 'temples');
  assert.equal(first('பொருத்தம்'), 'porutham');
  assert.equal(first('ராகு காலம்'), 'panchangam');
  assert.equal(first('முகூர்த்தம்'), 'muhurtham');
  assert.equal(first('குழந்தை'), 'names');
  // No match, empty query
  assert.deepEqual(searchTools('zzqx'), []);
  assert.deepEqual(searchTools('   '), []);
  assert.equal(normalize('Poruththam!'), normalize('porutham'));
});

/** Source text of one top-level function. */
function fnSource(file, name) {
  const s = src[file];
  const i = s.indexOf(`function ${name}(`);
  assert.ok(i >= 0, `${file}: ${name}() not found`);
  const j = s.indexOf('\nregisterScreen(', i);
  return s.slice(i, j > 0 ? j : undefined);
}

test('Settings shows no version line, and the owner dashboard only to admins', () => {
  const more = fnSource('account.js', 'renderMore');
  assert.doesNotMatch(more, /KJ_BUILD|'Version'|பதிப்பு/, 'version line must not be on Settings');
  const admin = more.indexOf('data-go="admin"');
  assert.ok(admin > 0, 'admins still reach the dashboard');
  assert.match(more.slice(Math.max(0, admin - 200), admin), /isAdmin\(\)\s*\?/, 'dashboard link must be behind isAdmin()');
  assert.match(src['account.js'], /export const isAdmin = \(\) =>/);
  // The build number lives only in About (small, for support).
  assert.match(fnSource('account.js', 'renderAbout'), /KJ_BUILD/);
});

test('there is no Simple / Detailed view toggle and no "specialist tools hidden" note', () => {
  for (const [f, s] of Object.entries(src)) {
    assert.doesNotMatch(s, /data-viewmode|viewToggle/, `${f}: view toggle`);
    assert.doesNotMatch(s, /Detailed view|விரிவான காட்சி|Simple or detailed|சிறப்புக் கருவிகள் \(/, `${f}: view-mode text`);
    if (f !== 'core.js') assert.doesNotMatch(s, /\bdetailed\(\)/, `${f}: content gated on the old view mode`);
  }
});

test('Today keeps the attention order and every older card stays reachable under "More"', () => {
  const home = fnSource('screens-main.js', 'renderHome');
  const order = ['whoChips(', 'searchPill()', 'todayPlanCard(', 'timeStrip(', 'dailyCard(', 'healthTodayCard(', 'compatCardHtml(', 'quickRow(', 'id="homeMore"'];
  const at = order.map((k) => home.indexOf(k));
  at.forEach((p, i) => assert.ok(p > 0, `${order[i]} missing from Today`));
  for (let i = 1; i < at.length; i++) assert.ok(at[i] > at[i - 1], `${order[i]} must come after ${order[i - 1]}`);
  const more = home.slice(home.indexOf('id="homeMore"'));
  for (const k of ['guideForm', 'class="hero"', 'gowri', 'love-cta', 'trialBanner()', 'reminderCard()', 'familyCard(', 'weatherCardHtml()', 'todayColorCard()', 'relationsCard()', 'parigaramCard(', 'data-go="tools"', 'shareToday']) {
    assert.ok(more.includes(k), `Today › More must keep ${k}`);
  }
});
