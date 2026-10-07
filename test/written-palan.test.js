// Written palan (shared/written-palan.js): the on-device chart reading on the Full Jathaga Analysis screen, the
// 12-bhava text tags / one-line meanings, and yoga periods per forming planet.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { birthChart, RASIS } from '../shared/astro.js';
import { fullAnalysis, bhavaAnalysis } from '../shared/analysis.js';
import { ageProfile, adultText, MINOR_PROHIBITED } from '../shared/age-guard.js';
import { findProhibited } from '../shared/themes.js';
import { horizonEnd } from '../shared/report-horizon.js';
import { writtenPalan, palanLines, palanFollowups, bhavaMeaning, scoreTag, yogaPeriodsByPlanet, areaWindows, PALAN_AREAS } from '../shared/written-palan.js';
import { scanProhibited } from '../server/policy/answer-validator.js';
import { ALWAYS_PROHIBITED } from '../server/policy/safety-policy.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NOW = new Date('2026-10-07T06:00:00Z');
const TODAY = '2026-10-07';
const chartOf = (date, time = '06:30:00', extra = {}) => birthChart({ date, time, lat: 13.0827, lon: 80.2707, tz: 5.5, place: 'Chennai', ...extra });
const palanOf = (c, date, opts = {}) => writtenPalan(c, { now: NOW, profile: ageProfile(date, { today: TODAY }), analysis: fullAnalysis(c, NOW), ...opts });
const TA = /[஀-௿]/;
const YEAR = /\b20\d\d\b/;

const ADULT = '1982-05-14';
const adult = chartOf(ADULT);
const adultPalan = palanOf(adult, ADULT);

test('adult chart: who / now / next / areas, every line in Tamil and English, with years', () => {
  assert.equal(adultPalan.mode, 'adult');
  assert.deepEqual(adultPalan.sections.map((s) => s.id), ['who', 'now', 'next', 'areas']);
  assert.match(adultPalan.title.ta, /உங்கள் ஜாதகப் பலன்/);
  for (const l of palanLines(adultPalan)) {
    assert.ok(l.en && l.ta, JSON.stringify(l));
    assert.match(l.ta, TA, `Tamil text: ${l.ta}`);
    assert.doesNotMatch(l.en, TA, `English text: ${l.en}`);
  }
  const sec = Object.fromEntries(adultPalan.sections.map((s) => [s.id, s]));
  assert.ok(sec.who.lines.length >= 4);
  assert.match(sec.who.lines[0].ta, /லக்னம்/);
  assert.match(sec.who.lines.at(-1).en, /Lagna lord/);
  assert.match(sec.now.lines[0].en, /Maha Dasa \(\d{4}–\d{4}\).*Bhukti \(\w{3} \d{4} – \w{3} \d{4}\)/);
  assert.ok(sec.now.lines.some((l) => /rules your/.test(l.en)), 'what the dasa lord rules');
  assert.ok(sec.now.lines.some((l) => /^Saturn /.test(l.en)) && sec.now.lines.some((l) => /^Jupiter /.test(l.en)), 'Saturn and Jupiter transits');
  assert.ok(sec.next.lines.some((l) => /Maha Dasa begins/.test(l.en) && YEAR.test(l.en)), 'next Maha Dasa with years');
  assert.ok(sec.next.windows.length >= 1 && sec.next.windows.every((l) => YEAR.test(l.en)));
  const ids = sec.areas.items.map((i) => i.id);
  assert.deepEqual(ids, ['career', 'wealth', 'marriage', 'education', 'children', 'property', 'spiritual']);
  for (const it of sec.areas.items) {
    assert.ok(it.lines.length >= 2 && it.lines.length <= 4, it.id);
    assert.ok(it.lines.some((l) => YEAR.test(l.en) || /next \d+ years/.test(l.en)), `${it.id} has a year range`);
  }
  assert.equal(palanFollowups(adultPalan).length, 4);
});

test('windows stay inside the analysis horizon and never stop at an age (no age-80 cutoff)', () => {
  const OLD = '1950-03-03';
  const c = chartOf(OLD, '09:00:00');
  const p = palanOf(c, OLD);
  const end = horizonEnd(NOW, p.years).getTime();
  for (const a of PALAN_AREAS) for (const w of areaWindows(c, a, { now: NOW, years: p.years }).windows) {
    assert.ok(w.start >= NOW && w.end.getTime() <= end + 1000, a.id);
  }
  assert.ok(p.sections.find((s) => s.id === 'next').lines.length >= 1);
  // A 76-year-old still gets dated windows that run past age 80.
  const lastYear = Math.max(...palanLines(p).flatMap((l) => (l.en.match(/\b20\d\d\b/g) || []).map(Number)));
  assert.ok(lastYear > 1950 + 80, `last year ${lastYear}`);
});

test('a 6-year-old gets only nature / study / habits / spiritual lines — no adult topics', () => {
  const KID = '2020-03-12';
  const p = palanOf(chartOf(KID, '10:00:00'), KID);
  assert.equal(p.mode, 'minor');
  const items = p.sections.find((s) => s.id === 'areas').items.map((i) => i.id);
  assert.deepEqual(items, ['nature', 'education', 'spiritual']);
  for (const l of palanLines(p)) {
    assert.equal(adultText(l), false, `adult wording for a child: ${l.en} | ${l.ta}`);
    for (const lang of ['en', 'ta']) assert.deepEqual(scanProhibited(l[lang], [...ALWAYS_PROHIBITED, ...MINOR_PROHIBITED]), [], l[lang]);
  }
  // Nothing was silently dropped: the child reading is complete.
  assert.ok(p.sections.find((s) => s.id === 'who').lines.length >= 4);
  assert.ok(p.sections.find((s) => s.id === 'now').lines.length >= 4);
  assert.equal(p.sections.find((s) => s.id === 'areas').items.find((i) => i.id === 'education').lines.length, 4);
  assert.deepEqual(palanFollowups(p), [], 'no adult follow-up chips for a minor');
});

test('unknown birth time: Moon-based reading, no Lagna statements, one line saying the Lagna parts need the time', () => {
  const DATE = '1990-08-02';
  const c = chartOf(DATE, '', { timePrecision: 'unknown' });
  assert.equal(c.planets.Lagna, undefined);
  const p = palanOf(c, DATE);
  assert.equal(p.moonOnly, true);
  const lagnaLines = palanLines(p).filter((l) => /lagna/i.test(l.en) || /லக்ன/.test(l.ta));
  assert.equal(lagnaLines.length, 1, JSON.stringify(lagnaLines));
  assert.match(lagnaLines[0].en, /need the birth time/);
  assert.match(lagnaLines[0].ta, /பிறந்த நேரம் தேவை/);
  assert.ok(p.sections.find((s) => s.id === 'now').lines.some((l) => /Counted from your Moon sign/.test(l.en)));
  // No house-strength verdicts without the Lagna.
  assert.ok(!palanLines(p).some((l) => /Your chart gives good support here|steady foundation here/.test(l.en)));
});

test('approximate birth time: sections carry the stability keys the screen turns into chips', () => {
  const c = chartOf(ADULT, '06:30:00', { timePrecision: 'approximate', windowMinutes: 30 });
  const p = palanOf(c, ADULT);
  assert.deepEqual(p.sections.find((s) => s.id === 'who').stability, ['lagna', 'moonNakshatra', 'moonPada']);
  assert.deepEqual(p.sections.find((s) => s.id === 'areas').stability, ['lagna']);
});

test('no prohibited wording, certainty, fear, diet, disease or lifespan statements across many charts', () => {
  const BAD_EN = /\b(will (get|happen|marry|surely|definitely)|guarantee|certain(ly)?\b|100 ?%|destined|diet|food|disease|illness|surgery|medicine|lifespan|death|die\b|danger|accident|doom|curse)/i;
  const BAD_TA = /(நிச்சயம்|உத்தரவாதம்|உணவு|நோய்|ஆயுள்|மரண|விபத்து|கண்டம்|ஆபத்து|சாபம்|அறுவை)/;
  for (let y = 1950; y <= 2004; y += 3) {
    for (const t of ['04:10:00', '13:40:00', '21:20:00']) {
      const date = `${y}-${String((y % 12) + 1).padStart(2, '0')}-1${y % 9}`;
      const c = chartOf(date, t);
      const p = palanOf(c, date, { maritalStatus: y % 2 ? 'married' : null });
      const lines = palanLines(p);
      assert.deepEqual(findProhibited(lines), [], date);
      for (const l of lines) {
        assert.doesNotMatch(l.en, BAD_EN, `${date} ${t}: ${l.en}`);
        assert.doesNotMatch(l.ta, BAD_TA, `${date} ${t}: ${l.ta}`);
        for (const lang of ['en', 'ta']) assert.deepEqual(scanProhibited(l[lang], ALWAYS_PROHIBITED), [], `${date} ${t}: ${l[lang]}`);
      }
      for (const b of bhavaAnalysis(c)) {
        const m = bhavaMeaning(b);
        assert.deepEqual(findProhibited(m), []);
        assert.doesNotMatch(m.ta, BAD_TA);
      }
    }
  }
});

test('deterministic: the same chart and date give the same words', () => {
  assert.deepEqual(palanOf(chartOf(ADULT), ADULT), adultPalan);
});

test('12 bhavas: text tag uses the same thresholds as the bar, and a one-line meaning built from lord placement', () => {
  assert.deepEqual([scoreTag(66).cls, scoreTag(65).cls, scoreTag(48).cls, scoreTag(47).cls], ['good', 'warn', 'warn', 'bad']);
  assert.deepEqual([scoreTag(70).ta, scoreTag(50).ta, scoreTag(30).ta], ['பலம்', 'நிலையானது', 'கவனம் தேவை']);
  const bh = bhavaAnalysis(adult);
  assert.equal(bh.length, 12);
  for (const b of bh) {
    const m = bhavaMeaning(b);
    assert.match(m.ta, new RegExp(`^${b.house}-ம் அதிபதி`), m.ta);
    if (b.lordHouse !== b.house) assert.match(m.ta, new RegExp(`${b.lordHouse}-ல் — `));
    assert.match(m.en, new RegExp(`lord`));
    const kid = bhavaMeaning(b, { minor: true });
    assert.equal(adultText(kid), false, kid.ta);
  }
  // The owner's example: 2nd lord in the 11th → savings can grow.
  const two = { house: 2, lordHouse: 11, occupants: [], score: 60 };
  assert.match(bhavaMeaning(two).ta, /^2-ம் அதிபதி 11-ல் — சேமிப்பு வளர வாய்ப்பு/);
});

test('yoga periods come from the planets that form each yoga (Budha-Aditya: Sun + Mercury; Vimala: the 12th lord)', () => {
  // 1971-04-20 06:00 Chennai has both yogas.
  const c = chartOf('1971-04-20', '06:00:00');
  const a = fullAnalysis(c, NOW);
  const ba = a.yogas.find((y) => y.id === 'budhaditya');
  const vi = a.yogas.find((y) => y.id === 'vimala');
  assert.ok(ba && vi, 'both yogas present');
  assert.deepEqual(ba.periods.lords, ['Sun', 'Mercury']);
  const lord12 = RASIS[(c.planets.Lagna.rasi + 11) % 12].lord;
  assert.deepEqual(vi.periods.lords, [lord12]);
  const pb = yogaPeriodsByPlanet(ba, c, { now: NOW });
  const pv = yogaPeriodsByPlanet(vi, c, { now: NOW });
  assert.deepEqual(pb.map((p) => p.lord), ['Sun', 'Mercury']);
  assert.deepEqual(pv.map((p) => p.lord), [lord12]);
  for (const p of [...pb, ...pv]) {
    for (const d of p.maha) assert.ok(c.dasa.periods.some((x) => x.lord === p.lord && +new Date(x.start) === +d.start));
    for (const b of p.bhukti) assert.ok(c.dasa.periods.some((x) => x.lord === b.md && x.bhuktis.some((y) => y.lord === p.lord && +new Date(y.start) === +b.start)));
  }
  assert.notDeepEqual(pb, pv, 'two different yogas do not show the same period');
  assert.equal(vi.name.ta, 'விமல யோகம் (விபரீத ராஜ யோகம்)');
  assert.equal(vi.name.en, 'Vimala Yoga (Viparita Raja Yoga)');
});

test('offline: precached by the service worker, copied by the artifact build, wired into the analysis screen', () => {
  const sw = fs.readFileSync(path.join(root, 'public/sw.js'), 'utf8');
  assert.match(sw, /'\/shared\/written-palan\.js'/);
  const build = fs.readFileSync(path.join(root, 'scripts/build-artifact.mjs'), 'utf8');
  assert.match(build, /readdirSync\('shared', \{ recursive: true \}\)/, 'shared/ copied recursively');
  const ui = fs.readFileSync(path.join(root, 'public/screens-world.js'), 'utf8');
  assert.match(ui, /from '\.\/shared\/written-palan\.js'/);
  assert.match(ui, /go\('chat', \{ q: b\.dataset\.palanAsk \}\)/, 'follow-up chips open Ask Thunai prefilled');
  assert.match(ui, /bhavaMeaning\(b/);
  assert.match(ui, /scoreTag\(b\.score\)/);
});

test('follow-up chips route to the matching Ask Thunai topics', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'thunai-palan-'));
  fs.copyFileSync(path.join(root, 'public/ask-thunai.js'), path.join(dir, 'ask-thunai.js'));
  fs.symlinkSync(path.join(root, 'shared'), path.join(dir, 'shared'), 'dir');
  fs.writeFileSync(path.join(dir, 'package.json'), '{"type":"module"}');
  const { detectTopic } = await import(pathToFileURL(path.join(dir, 'ask-thunai.js')).href);
  const [career, marriage, money] = palanFollowups(adultPalan);
  for (const lang of ['en', 'ta']) {
    assert.equal(detectTopic(career[lang]), 'career', career[lang]);
    assert.equal(detectTopic(marriage[lang]), 'marriage', marriage[lang]);
    assert.equal(detectTopic(money[lang]), 'money', money[lang]);
  }
});
