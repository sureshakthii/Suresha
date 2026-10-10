// Time-limited review build (public/review-lock.js): the pure lock decision — hours from first launch, the absolute
// `until` date baked into the build, and a phone clock moved backwards — plus the stored state across launches.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = fs.readFileSync(path.join(root, 'public/review-lock.js'), 'utf8');
const H = 3600000;

/** Run review-lock.js in a sandbox (optionally as a review build) and return its window. */
function load({ review = null, now = Date.UTC(2026, 9, 7, 6), storage = new Map() } = {}) {
  const listeners = [];
  const ctx = {
    window: { KJ_REVIEW: review },
    localStorage: { getItem: (k) => (storage.has(k) ? storage.get(k) : null), setItem: (k, v) => storage.set(k, String(v)), removeItem: (k) => storage.delete(k) },
    document: { readyState: 'complete', addEventListener: (t, f) => listeners.push([t, f]), documentElement: {}, body: null, getElementById: () => null },
    Date: class extends Date { static now() { return now; } },
    setInterval: () => 0,
  };
  vm.runInNewContext(SRC, ctx);
  return { win: ctx.window, storage, doc: ctx.document };
}
const reviewState = load().win.kjReviewState;

test('not a review build: the file does nothing (no lock, nothing stored)', () => {
  const { win, storage } = load();
  assert.equal(win.KJ_REVIEW_LOCKED, undefined);
  assert.equal(storage.size, 0);
  assert.equal(typeof win.kjReviewState, 'function');
});

test('first-launch hours: open for `hours` from the first launch on this phone, then locked', () => {
  const t0 = Date.UTC(2026, 9, 7, 6);
  const first = reviewState({ now: t0, hours: 48 });
  assert.equal(first.first, t0);
  assert.equal(first.locked, false);
  assert.equal(first.left, 48 * H);
  const later = reviewState({ now: t0 + 47 * H, hours: 48, first: t0, seen: t0 });
  assert.equal(later.locked, false);
  assert.equal(later.left, H);
  assert.equal(reviewState({ now: t0 + 48 * H, hours: 48, first: t0, seen: t0 + 47 * H }).locked, true);
});

test('absolute until: reinstalling (no stored first launch) can never extend past the build date', () => {
  const until = Date.UTC(2026, 9, 10);
  const fresh = reviewState({ now: until - 2 * H, hours: 72, until }); // "first launch" again after clearing data
  assert.equal(fresh.end, until);
  assert.equal(fresh.left, 2 * H);
  assert.equal(reviewState({ now: until, hours: 72, until }).locked, true);
  assert.equal(reviewState({ now: until + H, hours: 72, until }).locked, true);
});

test('clock rollback: moving the phone clock back more than 10 minutes locks; small drift does not', () => {
  const t0 = Date.UTC(2026, 9, 7, 6);
  const seen = t0 + 5 * H;
  assert.equal(reviewState({ now: seen - 5 * 60000, hours: 48, first: t0, seen }).locked, false, '5-minute drift is tolerated');
  const back = reviewState({ now: seen - 2 * H, hours: 48, first: t0, seen });
  assert.equal(back.rolledBack, true);
  assert.equal(back.locked, true);
  assert.equal(back.seen, seen, 'the last-seen time is never moved backwards');
  assert.equal(reviewState({ now: t0 + 6 * H, hours: 48, first: t0, seen, lockedFlag: true }).locked, true, 'once locked, stays locked');
});

test('in the browser: stored state across launches and the lock flag', () => {
  const storage = new Map();
  const t0 = Date.UTC(2026, 9, 7, 6);
  const review = { hours: 24, until: Date.UTC(2026, 11, 31) };
  let r = load({ review, now: t0, storage });
  assert.equal(r.win.KJ_REVIEW_LOCKED, undefined);
  assert.equal(storage.get('kj_review_first'), String(t0));
  r = load({ review, now: t0 + 3 * H, storage });
  assert.equal(r.win.KJ_REVIEW_LOCKED, undefined);
  assert.equal(storage.get('kj_review_seen'), String(t0 + 3 * H));
  r = load({ review, now: t0 + H, storage }); // clock moved back 2 hours
  assert.equal(r.win.KJ_REVIEW_LOCKED, true);
  assert.equal(storage.get('kj_review_locked'), '1');
  r = load({ review, now: t0 + 4 * H, storage }); // clock fixed again — still locked
  assert.equal(r.win.KJ_REVIEW_LOCKED, true);
});
