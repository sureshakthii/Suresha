// Account backup privacy: family profiles reach /api/me/data only with the "backup" consent on, and a profile
// marked private never leaves the phone (shared/sync-policy.js, used by saveFamily() in public/core.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { backupPayload, mergeAccountFamily, isPrivateProfile } from '../shared/sync-policy.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FAMILY = [
  { id: 'me', name: 'Suresh', relation: 'self' },
  { id: 'kid', name: 'Kavya', relation: 'daughter', private: true },
  { id: 'amma', name: 'Amma', relation: 'mother' },
];

test('backupPayload: nothing without backup consent', () => {
  assert.equal(backupPayload({ family: FAMILY, activeId: 'me' }, { backup: false }), null);
  assert.equal(backupPayload({ family: FAMILY, activeId: 'me' }, {}), null);
  assert.equal(backupPayload({ family: FAMILY, activeId: 'me' }, null), null);
});

test('backupPayload: private profiles are filtered out; activeId never points at one', () => {
  const p = backupPayload({ family: FAMILY, activeId: 'kid', ancestors: [{ name: 'Thatha' }] }, { backup: true });
  assert.deepEqual(p.family.map((m) => m.id), ['me', 'amma']);
  assert.ok(!JSON.stringify(p).includes('Kavya'));
  assert.equal(p.activeId, 'me', 'a private active profile is replaced by the first shared one');
  assert.deepEqual(p.ancestors, [{ name: 'Thatha' }]);
  assert.equal(backupPayload({ family: [FAMILY[1]], activeId: 'kid' }, { backup: true }).activeId, null);
  assert.ok(isPrivateProfile(FAMILY[1]) && !isPrivateProfile(FAMILY[0]) && !isPrivateProfile(null));
});

test('mergeAccountFamily: an older server copy never overwrites a profile that is private on this phone', () => {
  const remote = [{ id: 'kid', name: 'Kavya (old shared copy)' }, { id: 'amma', name: 'Amma (account)' }];
  const merged = mergeAccountFamily(remote, FAMILY);
  assert.deepEqual(merged.map((m) => m.id).sort(), ['amma', 'kid', 'me']);
  assert.equal(merged.find((m) => m.id === 'kid').private, true);
  assert.equal(merged.find((m) => m.id === 'amma').name, 'Amma (account)', 'account copy wins for shared profiles');
  assert.deepEqual(mergeAccountFamily(null, null), []);
});

// ---- saveFamily() in public/core.js with a stub browser (no DOM): what is actually PUT to /api/me/data ----

function stubBrowser() {
  const ls = new Map();
  const el = () => ({ dataset: {}, classList: { toggle() {}, add() {}, remove() {} }, setAttribute() {}, addEventListener() {}, style: {} });
  globalThis.localStorage = { getItem: (k) => (ls.has(k) ? ls.get(k) : null), setItem: (k, v) => ls.set(k, String(v)), removeItem: (k) => ls.delete(k), key: (i) => [...ls.keys()][i], get length() { return ls.size; } };
  globalThis.window = { location: { search: '' }, matchMedia: () => ({ matches: false, addEventListener() {} }), addEventListener() {}, KJ_STATIC: false };
  globalThis.MutationObserver = class { observe() {} };
  globalThis.requestAnimationFrame = (f) => setTimeout(f, 0);
  globalThis.document = { documentElement: el(), body: el(), querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, dispatchEvent() {}, createElement: el };
  const puts = [];
  globalThis.fetch = async (url, opts = {}) => { if (opts.method === 'PUT') puts.push({ url, body: JSON.parse(opts.body) }); return { ok: true, status: 200, json: async () => ({}), headers: { get: () => 'application/json' } }; };
  return { ls, puts };
}

test('saveFamily(): uploads only with backup consent, and never private profiles', async () => {
  const { ls, puts } = stubBrowser();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'thunai-sync-'));
  fs.copyFileSync(path.join(root, 'public/core.js'), path.join(dir, 'core.js'));
  fs.symlinkSync(path.join(root, 'shared'), path.join(dir, 'shared'), 'dir');
  fs.writeFileSync(path.join(dir, 'package.json'), '{"type":"module"}');
  const core = await import(pathToFileURL(path.join(dir, 'core.js')).href);
  const wait = () => new Promise((r) => setTimeout(r, 700));
  core.state.user = { id: 'u1' };
  core.state.family = FAMILY;
  core.state.activeId = 'me';

  ls.set('kj_consent', JSON.stringify({ backup: false }));
  core.saveFamily();
  await wait();
  assert.equal(puts.length, 0, 'backup consent off → nothing uploaded');
  assert.equal(JSON.parse(ls.get('kj_family')).length, 3, 'still saved on the phone');

  ls.set('kj_consent', JSON.stringify({ backup: true }));
  core.saveFamily();
  await wait();
  assert.equal(puts.length, 1);
  assert.equal(puts[0].url, '/api/me/data');
  assert.deepEqual(puts[0].body.data.family.map((m) => m.id), ['me', 'amma']);
  assert.ok(!JSON.stringify(puts[0].body).includes('Kavya'), 'private profile never uploaded');

  ls.delete('kj_consent'); // default: backup on (shown checked in Privacy & data)
  core.saveFamily();
  await wait();
  assert.equal(puts.length, 2);
});
