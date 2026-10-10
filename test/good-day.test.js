// Good Day share: right special days, the same 12-rasi palan as the Panchangam, kind wording, a QR code to the
// download link, and a card that fits and passes the share-card safety checks.
import test from 'node:test';
import assert from 'node:assert/strict';
import { tamilDay } from '../shared/tamilcal.js';
import { goodDay, goodDayText, specialDay, rasiDay, thoughtFor, THOUGHTS, RASI_DAY_PALAN, DOWNLOAD_URL, qrMatrix } from '../shared/good-day.js';
import { layoutCard, assertShareable, approxMeasure } from '../shared/share-card-layout.js';
import { scanCertainty } from '../shared/certainty-guard.js';
import { findProhibited } from '../shared/themes.js';

const td = (iso) => tamilDay(new Date(`${iso}T06:30:00Z`), 13.08, 80.27, 5.5);

test('special days fall on the right dates, including the moving ones', () => {
  assert.equal(specialDay('2026-05-10').id, 'mother');      // 2nd Sunday of May 2026
  assert.equal(specialDay('2027-05-09').id, 'mother');
  assert.equal(specialDay('2026-06-21').id, 'father');      // 3rd Sunday of June 2026
  assert.equal(specialDay('2026-08-02').id, 'friendship');  // 1st Sunday of August 2026
  assert.equal(specialDay('2026-09-05').id, 'teachers');
  assert.equal(specialDay('2026-12-22').id, 'maths');
  assert.equal(specialDay('2026-11-03'), null);
});

test('the 12 rasi lines are the Panchangam daily palan (Moon counted from each rasi)', () => {
  const r = rasiDay(4);
  assert.equal(r.length, 12);
  assert.equal(r[4].pos, 1); assert.equal(r[4].line.ta, RASI_DAY_PALAN[1][3]);
  assert.equal(r[(4 - 7 + 12) % 12].pos, 8); // chandrashtamam for the rasi 8th from... counted the same way
  for (const x of r) assert.ok(x.short.ta && x.stars >= 1 && x.stars <= 5);
});

test('a year of messages: kind, safe wording, the download link and a QR code every day', () => {
  let iso = '2026-01-01';
  for (let i = 0; i < 366; i += 7) {
    const d = new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10);
    const g = goodDay({ iso: d, td: td(d), sender: 'Suresh', goodTime: '7:43 – 9:10 AM', rahu: '9:10 – 10:37 AM' });
    for (const lang of ['ta', 'en']) {
      const text = goodDayText(g, lang);
      assert.deepEqual(scanCertainty(text), [], `${d} ${lang}`);
      assert.ok(text.includes(DOWNLOAD_URL));
      assert.ok(text.split('\n').filter((l) => /★/.test(l)).length === 12);
    }
    assert.deepEqual(findProhibited(g), [], d);
    assert.ok(g.qr.length >= 21 && g.qr.every((row) => row.length === g.qr.length));
    iso = d;
  }
  assert.ok(iso);
  assert.ok(THOUGHTS.includes(thoughtFor('2026-11-03')));
});

test('the Good Day card fits the tall size and passes the share-card checks', () => {
  const g = goodDay({ iso: '2026-10-10', td: td('2026-10-10'), sender: 'சுரேஷ்' });
  const t = (x) => x.ta;
  const spec = { kind: 'goodday', lang: 'ta', kicker: `${t(g.greeting)} · ${t(g.weekday)}`, title: t(g.headline), quote: t(g.message), lines: [t(g.act)],
    grid: g.rasi.map((r) => ({ label: t(r.name), value: t(r.short), stars: '★'.repeat(r.stars) })), closing: 'அன்புடன், சுரேஷ்', qr: g.qr, invite: 'QR ஸ்கேன் செய்து துணை செயலியைப் பெறுங்கள்.' };
  assertShareable(spec);
  const lay = layoutCard(spec, { size: 'tall', measure: approxMeasure });
  assert.equal(lay.overflow, false);
  assert.ok(lay.items.some((it) => it.t === 'qr'));
  assert.equal(lay.items.filter((it) => it.role === 'body' && g.rasi.some((r) => r.name.ta === it.text)).length, 12);
  assert.equal(qrMatrix(DOWNLOAD_URL).length, g.qr.length);
});
