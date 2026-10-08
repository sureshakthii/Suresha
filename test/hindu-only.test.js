// Thunai is a complete Hindu-based astrology app — fully Hindu for everyone (owner decision, Oct 2026).
// There is no per-person faith any more: the family form has no faith field, a faith saved by an older version is
// dropped on load and ignored everywhere, and a profile once stored as Christian gets the same Hindu parigaram, dosham
// sthalams, God of the day and closing prayer as everyone else. The age rules are unchanged.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { birthChart, panchang } from '../shared/astro.js';
import { birthArgs, timeReliability } from '../shared/birthtime.js';
import { chartFacts } from '../shared/guidance.js';
import { ageProfile } from '../shared/age-guard.js';
import { dailyParigaram } from '../shared/remedies.js';
import { diagnoseDoshams, primarySthalam, nivarthiPlan } from '../shared/dosham.js';
import { dailyReview } from '../shared/daily.js';
import { findProhibited } from '../shared/themes.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const NOW = new Date('2026-10-07T06:00:00Z');
const CHENNAI = { lat: 13.0827, lon: 80.2707, tz: 5.5 };
// Rahu in the Lagna (Meena): the Rahu–Ketu dosham, whose sthalam is Sri Kalahasti. Stored by an old version as Christian.
const MARY = { id: 'mary', relation: 'self', name: 'Mary', gender: 'female', date: '1986-09-15', time: '19:00:00', timeCertainty: 'exact', ...CHENNAI, faith: 'christian' };

test('the family add / edit form has no faith field, and nothing in the app reads a stored faith', () => {
  const account = read('public/account.js');
  assert.doesNotMatch(account, /name="faith"|FAITHS|elements\.faith|faith:/, 'no faith picker or saved faith in the family form');
  assert.equal(fs.existsSync(path.join(root, 'shared/faith.js')), false, 'no faith resolver module');
  for (const dir of ['public', 'shared', 'server']) {
    for (const f of fs.readdirSync(path.join(root, dir), { recursive: true })) {
      if (!String(f).endsWith('.js')) continue;
      const src = read(path.join(dir, String(f)));
      assert.doesNotMatch(src, /\b(faithOf|faithFor|isHinduFaith|universalPractice|faithBlessing|faithWelcome|TRADITIONAL_OPTIONAL|guessFaith)\b|shared\/faith\.js/, `${dir}/${f}`);
    }
  }
});

test('a faith saved by an older version is dropped when profiles load and when they are saved', () => {
  const core = read('public/core.js');
  assert.match(core, /export const dropFaith = /);
  assert.match(core, /\.map\(\(m\) => withNameForms\(attachZone\(dropFaith\(m\)\)\)\)/, 'stripped on load');
  assert.match(core, /withNameForms\(dropFaith\(m\)\)/, 'stripped on save');
  // The helper itself (copied out of core.js, which needs a browser to import).
  const src = core.match(/export const dropFaith = (.*);\n/)[1];
  const dropFaith = new Function(`return ${src}`)();
  assert.deepEqual(dropFaith({ id: 'a', name: 'Mary', faith: 'christian' }), { id: 'a', name: 'Mary' });
  const plain = { id: 'b', name: 'Ravi' };
  assert.equal(dropFaith(plain), plain);
});

test('a profile stored with faith "christian" gets the Hindu parigaram and the dosham parigara sthalam', () => {
  const chart = birthChart(birthArgs(MARY));
  const prof = ageProfile(MARY, { now: NOW });
  const snap = panchang(NOW, CHENNAI.lat, CHENNAI.lon, CHENNAI.tz);
  const items = dailyParigaram({ weekday: snap.weekday.index, chart, snapshot: snap, faith: MARY.faith, profile: prof, now: NOW });
  assert.ok(items.length >= 1);
  for (const i of items) assert.ok(i.deity?.en && i.temple?.en && i.mantra?.en, `Navagraha deity / temple / mantra for ${i.planet}`);
  const diag = diagnoseDoshams(chart, { now: NOW, minor: prof.minor, age: prof.age });
  const ps = primarySthalam(diag, { faith: MARY.faith });
  assert.ok(ps?.sthalam?.name?.en, 'a parigara sthalam');
  const rk = diag.items.find((x) => x.kind === 'rahuketu');
  assert.ok(nivarthiPlan(rk).sthalams.some((s) => s.id === 'kalahasti'), 'Sri Kalahasti for Rahu–Ketu');
  // Today: God of the day and the closing prayer.
  const r = dailyReview(chart, snap, NOW);
  assert.ok(r.deity?.god?.en && r.prayer?.lines?.length);
});

test('Ask Thunai: the same profile gets the Hindu parigara sthalam and yatra plan — the old stored faith changes nothing', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'thunai-hindu-only-'));
  fs.copyFileSync(path.join(root, 'public/ask-thunai.js'), path.join(dir, 'ask-thunai.js'));
  fs.symlinkSync(path.join(root, 'shared'), path.join(dir, 'shared'), 'dir');
  fs.writeFileSync(path.join(dir, 'package.json'), '{"type":"module"}');
  const A = await import(pathToFileURL(path.join(dir, 'ask-thunai.js')).href);
  const chart = birthChart(birthArgs(MARY));
  const rel = timeReliability(MARY);
  const askAs = (faith, text, lang = 'ta') => A.askThunai({ text, chart, rel, facts: chartFacts(chart, rel, NOW), lang, name: MARY.name, now: NOW,
    life: { memberId: MARY.id, gender: MARY.gender, faith }, profile: ageProfile(MARY, { now: NOW }) });
  const a = askAs('christian', 'rahu dosham parigaram kovil');
  const body = a.sections.flatMap((s) => s.lines).join('\n');
  assert.match(body, /ஸ்ரீ காளஹஸ்தீஸ்வரர்/);
  assert.ok(a.actions.some((x) => x.go === 'journey' && x.param.temples.includes('kalahasti')));
  assert.deepEqual(a, askAs(undefined, 'rahu dosham parigaram kovil'));
  assert.doesNotMatch(body, /கர்த்தர்|உங்கள் சொந்த நம்பிக்கை|நம்பிக்கைப்படி/);
  assert.equal(findProhibited(a).length, 0);
  // "Which god should I pray to? I am Christian." — the chart's deities, not an every-faith swap.
  const g = askAs('christian', 'Which god should I pray to? I am Christian.', 'en');
  assert.match(g.text, /deities your chart points to/);
  assert.doesNotMatch(g.text, /own faith|God bless/i);
});
