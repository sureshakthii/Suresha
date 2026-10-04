import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ingresses, currentPeyarchi, peyarchiPalan, rasiPalanPeriod, vrathamDays, VRATHAM_TYPES, PEYARCHI_PLANETS,
} from '../shared/peyarchi.js';

const D = (s) => new Date(`${s}T00:00:00Z`);
const MITHUNA = 2; const KUMBHA = 10; const MEENA = 11; const RISHABA = 1; const SIMHA = 4;
const LATIN = /[A-Za-z]/;

test('Saturn ingress Kumbha -> Meena in spring 2025 (Lahiri ~29 Mar 2025)', () => {
  const list = ingresses('Saturn', D('2025-01-01'), D('2025-12-31'));
  const ev = list.find((x) => x.fromRasi === KUMBHA && x.toRasi === MEENA);
  assert.ok(ev, JSON.stringify(list));
  assert.ok(ev.date >= D('2025-03-01') && ev.date <= D('2025-05-15'), ev.date.toISOString());
  assert.equal(ev.retro, false);
});

test('Jupiter ingress Rishaba -> Mithuna around 14 May 2025, with retrograde re-entry later', () => {
  const list = ingresses('Jupiter', D('2025-01-01'), D('2026-12-31'));
  const ev = list.find((x) => x.fromRasi === RISHABA && x.toRasi === MITHUNA);
  assert.ok(ev);
  assert.ok(ev.date >= D('2025-04-20') && ev.date <= D('2025-06-10'), ev.date.toISOString());
  // Jupiter enters Kataka (Oct 2025), goes back into Mithuna (Dec 2025) and re-enters Kataka (2026).
  assert.ok(list.some((x) => x.retro && x.toRasi === MITHUNA));
  assert.ok(list.filter((x) => x.toRasi === 3).length >= 2);
});

test('Rahu (mean node) enters Kumbha around 18 May 2025; Ketu enters Simha at the same moment', () => {
  // Mean-node computation gives 2025-05-18 — well inside the window.
  const rahu = ingresses('Rahu', D('2025-01-01'), D('2025-12-31'));
  const ev = rahu.find((x) => x.toRasi === KUMBHA);
  assert.ok(ev);
  assert.equal(ev.fromRasi, MEENA);
  assert.equal(ev.retro, true);
  assert.ok(ev.date >= D('2025-04-01') && ev.date <= D('2025-07-01'), ev.date.toISOString());
  const ketu = ingresses('Ketu', D('2025-01-01'), D('2025-12-31')).find((x) => x.toRasi === SIMHA);
  assert.ok(ketu);
  assert.equal(ketu.date.getTime(), ev.date.getTime());
});

test('currentPeyarchi gives rasi, since and next change for all four grahas', () => {
  const now = D('2026-01-15');
  const cur = currentPeyarchi(now);
  for (const p of PEYARCHI_PLANETS) {
    const c = cur[p];
    assert.ok(c.rasi >= 0 && c.rasi < 12);
    assert.ok(c.since && c.since <= now, p);
    assert.ok(c.next && c.next > now, p);
    assert.ok(c.nextRasi >= 0 && c.nextRasi < 12);
  }
  assert.equal(cur.Saturn.rasi, MEENA);
  assert.equal(cur.Rahu.rasi, KUMBHA);
  assert.equal(cur.Ketu.rasi, SIMHA);
  assert.equal(cur.Jupiter.rasi, MITHUNA); // retrograde back in Mithuna in Jan 2026
});

test('peyarchiPalan follows classical gochara rules with bilingual text', () => {
  // Moon in Mesha (0): Guru in Simha = 5th -> good, Guru in Vrischika = 8th -> care.
  assert.equal(peyarchiPalan('Jupiter', 4, 0).house, 5);
  assert.equal(peyarchiPalan('Jupiter', 4, 0).level, 'good');
  assert.equal(peyarchiPalan('Jupiter', 7, 0).level, 'care');
  assert.equal(peyarchiPalan('Jupiter', 10, 0).level, 'good'); // 11th
  // Sani: 3rd/6th/11th good, Ezharai (12,1,2), Ashtama (8), Ardhashtama (4) need care, Kandaka mixed.
  assert.equal(peyarchiPalan('Saturn', 2, 0).level, 'good');
  for (const h of [12, 1, 2, 4, 8]) assert.equal(peyarchiPalan('Saturn', (h - 1) % 12, 0).level, 'care', `Sani house ${h}`);
  assert.equal(peyarchiPalan('Saturn', 6, 0).level, 'mixed');
  assert.equal(peyarchiPalan('Saturn', 9, 0).level, 'mixed');
  assert.ok(peyarchiPalan('Saturn', 7, 0).special.ta.includes('அஷ்டம'));
  assert.equal(peyarchiPalan('Rahu', 5, 0).level, 'good');
  assert.equal(peyarchiPalan('Ketu', 10, 0).level, 'good');
  for (const p of PEYARCHI_PLANETS) {
    for (let r = 0; r < 12; r++) {
      const x = peyarchiPalan(p, r, 3);
      assert.ok(x.score >= 0 && x.score <= 100);
      assert.ok(x.text.en.length > 20 && x.text.ta.length > 20);
      assert.ok(!LATIN.test(x.text.ta), `${p} ${r}: ${x.text.ta}`);
      assert.ok(!LATIN.test(x.remedy.ta), `${p} remedy`);
    }
  }
});

test('rasiPalanPeriod returns bounded scores, areas and Chandrashtamam dates', () => {
  const t0 = Date.now();
  for (const kind of ['month', 'year']) {
    const r = rasiPalanPeriod(3, D('2026-10-01'), kind);
    assert.ok(r.score >= 0 && r.score <= 100);
    assert.ok(['good', 'mixed', 'care'].includes(r.level));
    for (const a of ['career', 'money', 'family', 'health']) {
      assert.ok(r.areas[a].score >= 0 && r.areas[a].score <= 100);
      assert.ok(r.areas[a].note.en && r.areas[a].note.ta);
      assert.ok(!LATIN.test(r.areas[a].note.ta));
    }
    assert.ok(!LATIN.test(r.summary.ta), r.summary.ta);
    const expected = kind === 'month' ? [2, 5] : [36, 60];
    assert.ok(r.chandrashtamamDays >= expected[0] && r.chandrashtamamDays <= expected[1], `${kind} ${r.chandrashtamamDays}`);
    assert.deepEqual([...r.chandrashtamamDates].sort(), r.chandrashtamamDates);
    if (kind === 'year') assert.ok(r.months.length >= 12);
  }
  assert.ok(Date.now() - t0 < 1500, `took ${Date.now() - t0} ms`);
});

test('vrathamDays lists the year\'s vratham days in order', () => {
  const v = vrathamDays(2026, 13.08, 80.27, 5.5);
  assert.ok(v.filter((x) => x.en === 'Amavasai').length >= 12);
  assert.ok(v.filter((x) => x.en.includes('Ekadasi')).length >= 24);
  for (let i = 1; i < v.length; i++) assert.ok(v[i - 1].date <= v[i].date);
  assert.ok(v.every((x) => /^2026-\d\d-\d\d$/.test(x.date) && x.ta && ['festival', 'vratham'].includes(x.kind)));
  const ids = new Set(VRATHAM_TYPES.map((t) => t.id));
  assert.ok(v.every((x) => ids.has(x.type)));
  for (const t of VRATHAM_TYPES) assert.ok(v.some((x) => x.type === t.id), t.id);
});
