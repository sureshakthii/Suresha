// docs/ACCURACY-REPORT.md must state the versions the code actually has, and the benchmark output it quotes must
// carry the same stamps. CALC_VERSION (shared/version.js) and ENGINE_VERSION (shared/engine-contract.js) are the
// same number by rule; shared/version.js's ENGINE_VERSION is a display label built from CALC + RULES.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CALC_VERSION, RULES_VERSION, ENGINE_VERSION as ENGINE_LABEL } from '../shared/version.js';
import { ENGINE_VERSION, ENGINE_SETTINGS } from '../shared/engine-contract.js';

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const report = read('docs/ACCURACY-REPORT.md');
const aeVersion = JSON.parse(read('node_modules/astronomy-engine/package.json')).version;
/** Value in the report's version table: | NAME | `value` | … */
const stamp = (name) => new RegExp(`^\\| ${name} \\| \`([^\`]+)\``, 'm').exec(report)?.[1];

test('report version table equals the code constants', () => {
  assert.equal(stamp('CALC_VERSION'), CALC_VERSION);
  assert.equal(stamp('RULES_VERSION'), RULES_VERSION);
  assert.equal(stamp('ENGINE_VERSION'), ENGINE_VERSION);
  assert.equal(stamp('astronomy-engine'), aeVersion);
  assert.match(stamp('Git commit at generation') || '', /^[0-9a-f]{7,40}$/);
  assert.ok(report.includes(`Engine: calc ${CALC_VERSION} (\`shared/astro.js\`, astronomy-engine ${aeVersion})`), 'header line');
});

test('CALC_VERSION === contract ENGINE_VERSION; the version.js label is built from CALC and RULES', () => {
  assert.equal(CALC_VERSION, ENGINE_VERSION);
  assert.equal(ENGINE_SETTINGS.engineVersion, ENGINE_VERSION);
  assert.equal(ENGINE_LABEL, `calc ${CALC_VERSION} · rules ${RULES_VERSION}`);
  assert.equal(ENGINE_SETTINGS.ephemeris.version, aeVersion);
});

test('benchmark results carry the same version stamps', () => {
  const r = JSON.parse(read('scripts/benchmark/results.json'));
  const v = r.meta.versions;
  assert.ok(v, 'results.json meta.versions (re-run npm run bench in scripts/benchmark)');
  assert.equal(v.calcVersion, CALC_VERSION);
  assert.equal(v.rulesVersion, RULES_VERSION);
  assert.equal(v.engineVersion, ENGINE_VERSION);
  assert.equal(v.astronomyEngine, aeVersion);
  assert.equal(v.gitCommit, stamp('Git commit at generation'));
  const md = read('scripts/benchmark/results.md');
  assert.match(md, new RegExp(`CALC_VERSION ${CALC_VERSION} · RULES_VERSION ${RULES_VERSION} · ENGINE_VERSION ${ENGINE_VERSION} · astronomy-engine ${aeVersion}`));
});

test('the report quotes the benchmark numbers for divisional charts and sub-periods', () => {
  const r = JSON.parse(read('scripts/benchmark/results.json'));
  for (const [k, pct] of Object.entries(r.varga.placementAgreementPercent)) {
    assert.ok(report.includes(`| ${k} `), `${k} row`);
    assert.ok(report.includes(`${pct} %`), `${k} ${pct} % quoted`);
  }
  for (const pct of Object.values(r.varga.mappingAgreementPercent)) assert.equal(pct, 100, 'mapping must agree everywhere');
  const pr = r.subDasa.pratyantara, sk = r.subDasa.sookshma;
  assert.ok(report.includes(`${Math.round(pr.lordPathAgreementPercent * r.subDasa.births / 100)} of ${r.subDasa.births}`));
  assert.ok(report.includes(`${Math.round(sk.lordPathAgreementPercent * r.subDasa.births / 100)} of ${r.subDasa.births}`));
  assert.ok(report.includes(`${r.dasa.firstLordAgreementPercent === 100 ? '100 % of 300 births' : 'NO'}`), 'first dasa lord sample stated');
});

test('honesty: sample sizes, agreement ≠ prediction accuracy, limits and no unverified stability claim', () => {
  assert.match(report, /Astronomical agreement is not prediction accuracy/);
  assert.match(report, /## 9\. Unsupported or limited cases/);
  for (const k of ['Polar latitudes', '1940–2060', 'Vakya', 'Mean node only', 'daylight saving']) assert.ok(report.includes(k), k);
  assert.match(report, /## 10\. Test coverage/);
  assert.doesNotMatch(report, /The app already\s+marks unstable items/, 'stability is not shown on screen yet');
});
