// Temple search autocomplete (shared/temples.js searchTemples): Tamil / English / Tanglish prefixes, alternate names,
// accent / space-insensitive matching, prefix-first then nearest ranking, temples abroad, offline data only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TEMPLES, searchTemples, foldText, templeMatchTier, templesNear } from '../shared/temples.js';

const CHENNAI = { lat: 13.08, lon: 80.27 };
const top = (q, opts = CHENNAI) => searchTemples(q, opts)[0]?.id;
const has = (q, id, opts = CHENNAI) => searchTemples(q, { ...opts, limit: 8 }).some((t) => t.id === id);

test('fold: Tanglish spellings, accents, spaces and common Tamil letter swaps fold together', () => {
  assert.equal(foldText('Thiruchendur'), foldText('tiruchendur'));
  assert.equal(foldText('Thiru Chendur'), foldText('TIRUCHENDUR'));
  assert.equal(foldText('Pazhani'), foldText('palani'));
  assert.equal(foldText('Śrīraṅgam'), foldText('srirangam'));
  assert.equal(foldText('பழநி'), foldText('பழனி'));
  assert.equal(foldText(''), '');
});

test('Tiruchendur: English, Tanglish and Tamil prefixes', () => {
  for (const q of ['thiruchendur', 'tiruchendur', 'Tiruchen', 'thiruchen', 'திருச்செந்', 'திருச்செந்தூர்', 'senthil', 'செந்தில்']) assert.ok(has(q, 'tiruchendur'), q);
  assert.equal(top('thiruchendur'), 'tiruchendur');
  assert.equal(top('திருச்செந்'), 'tiruchendur');
});

test('Palani, Srirangam, Madurai Meenakshi, Batu Caves, Nallur', () => {
  for (const q of ['palani', 'pazhani', 'Pala', 'பழனி', 'பழநி', 'பழ']) assert.ok(has(q, 'palani'), q);
  assert.equal(top('palani'), 'palani');
  for (const q of ['srirangam', 'sreerangam', 'Sriran', 'ஸ்ரீரங்', 'திருவரங்கம்', 'ranganatha']) assert.ok(has(q, 'srirangam'), q);
  for (const q of ['madurai meenakshi', 'meenakshi', 'meenatchi', 'மீனாட்சி', 'மதுரை மீனா']) assert.ok(has(q, 'madurai_meenakshi'), q);
  assert.equal(top('madurai meenakshi'), 'madurai_meenakshi');
  for (const q of ['batu', 'Batu Caves', 'bat', 'பத்துமலை', 'பத்து']) assert.ok(has(q, 'batu_caves'), q);
  assert.equal(top('batu'), 'batu_caves');
  for (const q of ['nallur', 'Nall', 'நல்லூர்', 'நல்லூ']) assert.ok(has(q, 'nallur'), q);
  assert.equal(top('nallur'), 'nallur');
});

test('one or two letters already give suggestions (Tamil and English)', () => {
  for (const q of ['p', 'pa', 'ப', 'தி', 'ti', 'ம']) assert.ok(searchTemples(q, CHENNAI).length > 0, q);
  assert.deepEqual(searchTemples('   ', CHENNAI), []);
  assert.deepEqual(searchTemples('zzzqqq', CHENNAI), []);
});

test('ranking: name prefix before inner matches, then nearest first', () => {
  const r = searchTemples('palani', { ...CHENNAI, limit: 10 });
  assert.equal(r[0].id, 'palani');
  const vp = r.findIndex((t) => t.id === 'vadapalani');
  assert.ok(vp > 0, 'Vadapalani (inner match) comes after Palani (prefix)');
  assert.ok(r[0].tier < r[vp].tier);
  // within the same tier: nearest first — from Chennai vs from Madurai
  const fromChennai = searchTemples('thiru', { ...CHENNAI, limit: 20 });
  for (let i = 1; i < fromChennai.length; i++) {
    if (fromChennai[i].tier === fromChennai[i - 1].tier) assert.ok(fromChennai[i].km >= fromChennai[i - 1].km);
  }
  const madurai = { lat: 9.92, lon: 78.12 };
  assert.notEqual(searchTemples('thiru', madurai)[0].id, fromChennai[0].id);
  // results carry a distance when a location is given, and null without one
  assert.ok(Number.isFinite(searchTemples('batu', CHENNAI)[0].km));
  assert.equal(searchTemples('batu')[0].km, null);
});

test('deity and town also match; temples abroad are found offline', () => {
  assert.ok(has('murugan', 'tiruchendur', { ...CHENNAI, limit: 30 }) || searchTemples('murugan', { ...CHENNAI, limit: 40 }).some((t) => t.id === 'tiruchendur'));
  assert.ok(has('jaffna', 'nallur'));
  assert.ok(has('யாழ்ப்பாணம்', 'nallur'));
  assert.ok(has('singapore', 'sg_mariamman'));
  assert.ok(has('kathirkamam', 'kataragama'));
  assert.ok(has('tirupati', 'tirumala'));
  assert.ok(has('திருப்பதி', 'tirumala'));
});

test('every temple is findable by the start of its English and Tamil names', () => {
  for (const t of TEMPLES) {
    assert.equal(templeMatchTier(t, t.name.en.slice(0, 6)), 0, t.id);
    assert.equal(templeMatchTier(t, [...t.name.ta].slice(0, 4).join('')), 0, t.id);
  }
});

test('the Temples list filter uses the same forgiving matcher', () => {
  const ids = templesNear(CHENNAI.lat, CHENNAI.lon, { query: 'thiruchendur' }).map((t) => t.id);
  assert.ok(ids.includes('tiruchendur'));
  assert.equal(templesNear(CHENNAI.lat, CHENNAI.lon, { query: '' }).length, TEMPLES.length);
});

test('search forgives common typing slips: a missed doubled letter, y for i, and the category name', () => {
  assert.ok(has('திருசெந்தூர்', 'tiruchendur'));
  assert.ok(has('palany', 'palani'));
  assert.ok(has('Pazani', 'palani'));
  assert.ok(searchTemples('navagraha', { limit: 20 }).length >= 8);
  assert.equal(searchTemples('zzzz').filter((t) => t.tier < 3 && !/z/i.test(JSON.stringify(t))).length, 0, 'gibberish does not fall back to every "l" temple');
});
