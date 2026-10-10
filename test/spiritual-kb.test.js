// Spiritual knowledge base: festival dates for 2026–2028 (Chennai), multilingual question routing, null for
// questions it does not cover, no chart/dasa wording, Tamil present, and the prohibited-wording scan.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  answerGeneral, matchQuestion, occurrencesBetween, festivalCalendar, daySnap, KB, CHARACTERS, getEntry, ekadasiNameFor, entrySections,
} from '../shared/spiritual-kb.js';
import { tamilDay } from '../shared/tamilcal.js';
import { findProhibited } from '../shared/themes.js';
import { MANTRAS } from '../shared/mantras.js';
import { TEMPLES } from '../shared/temples.js';

const CHENNAI = { lat: 13.0827, lon: 80.2707, name: 'Chennai' };
const NOW = new Date('2026-10-07T04:30:00Z'); // 7 Oct 2026, 10 AM IST
const OCC = occurrencesBetween('2026-01-01', 760, CHENNAI, 5.5);
const datesOf = (id) => OCC.filter((o) => o.id === id).map((o) => o.date);
const dayDiff = (a, b) => Math.round((Date.parse(a) - Date.parse(b)) / 86400000);

// Published Tamil/Indian calendar dates (2026–2028). Where Tamil almanacs differ among themselves, `alt` lists the
// other date and the test accepts ±1 day — the app follows the sunrise (udaya) rule described in spiritual-kb.js.
const FIXTURES = [
  ['thai-pongal', '2026-01-14'], ['arudra-darisanam', '2026-01-03'], ['thai-poosam', '2026-02-01'],
  ['maha-sivaratri', '2026-02-15'], ['ugadi', '2026-03-19'], ['tamil-new-year', '2026-04-14'],
  ['aadi-perukku', '2026-08-03'], ['avani-avittam', '2026-08-28'], ['varalakshmi', '2026-08-28'],
  ['krishna-jayanthi', '2026-09-04'], ['vinayagar-chathurthi', '2026-09-14'], ['mahalaya-amavasai', '2026-10-10'],
  ['saraswathi-pooja', '2026-10-20', 1], ['ayudha-pooja', '2026-10-20', 1], ['vijayadasami', '2026-10-21', 1],
  ['deepavali', '2026-11-08'], ['soorasamharam', '2026-11-15'], ['karthigai-deepam', '2026-11-24'],
  ['vaikunta-ekadasi', '2026-12-20'], ['arudra-darisanam', '2026-12-24'], ['thai-pongal', '2027-01-15'], ['bhogi', '2027-01-14'],
  ['maha-sivaratri', '2027-03-06'], ['tamil-new-year', '2027-04-14'], ['vinayagar-chathurthi', '2027-09-04'],
  ['vaikunta-ekadasi', '2028-01-08'],
];

test('festival dates match the 2026–2028 Tamil calendar (Chennai, sunrise rule)', () => {
  for (const [id, date, tol = 0] of FIXTURES) {
    const got = datesOf(id);
    const near = got.find((d) => Math.abs(dayDiff(d, date)) <= tol);
    assert.ok(near, `${id}: expected ${date} (±${tol}), engine gives ${got.join(', ')}`);
  }
  // Exact days the engine keeps where almanacs differ (documented convention): Navami at sunrise on 20 Oct 2026.
  assert.ok(datesOf('saraswathi-pooja').includes('2026-10-20'));
  const nv = OCC.find((o) => o.id === 'navaratri' && o.date.startsWith('2026'));
  assert.deepEqual([nv.date, nv.end], ['2026-10-11', '2026-10-20']);
});

test('Navaratri, Kanda Sashti and Mahalaya Paksham are spans; Navaratri days follow day 1', () => {
  const sk = OCC.find((o) => o.id === 'skanda-sashti' && o.date.startsWith('2026'));
  assert.equal(sk.end, '2026-11-15');
  assert.equal(dayDiff(sk.end, sk.date), 5);
  assert.ok(datesOf('navaratri-day-1').includes('2026-10-11'));
  assert.ok(datesOf('navaratri-day-9').includes('2026-10-19'));
  const mp = OCC.find((o) => o.id === 'mahalaya-paksham' && o.date.startsWith('2026'));
  assert.equal(mp.end, '2026-10-10');
});

test('monthly observances recur about twice / once a month, never on two days running', () => {
  const year = OCC.filter((o) => o.date >= '2027-01-01' && o.date <= '2027-12-31');
  const count = (id) => year.filter((o) => o.id === id).length;
  assert.ok(count('ekadasi') >= 23 && count('ekadasi') <= 26, `ekadasi ${count('ekadasi')}`);
  assert.ok(count('pradosham') >= 23 && count('pradosham') <= 26, `pradosham ${count('pradosham')}`);
  for (const id of ['amavasai', 'pournami', 'sashti', 'sankatahara', 'masa-sivaratri']) assert.ok(count(id) >= 11 && count(id) <= 14, `${id} ${count(id)}`);
  for (const id of ['ekadasi', 'pradosham', 'sankatahara', 'karthigai', 'thiruvonam']) {
    const d = year.filter((o) => o.id === id).map((o) => o.date);
    for (let i = 1; i < d.length; i++) assert.ok(dayDiff(d[i], d[i - 1]) > 1, `${id} on consecutive days ${d[i - 1]} ${d[i]}`);
  }
});

test('day snapshots agree with tamilcal.tamilDay (sunrise tithi, star, Tamil date)', () => {
  for (let i = 0; i < 40; i++) {
    const iso = new Date(Date.parse('2026-10-01') + i * 9 * 86400000).toISOString().slice(0, 10);
    const s = daySnap(iso, CHENNAI, 5.5);
    const d = tamilDay(new Date(Date.parse(`${iso}T12:00:00Z`) - 5.5 * 3600000), CHENNAI.lat, CHENNAI.lon, 5.5);
    assert.equal(s.t.sunrise, d.tithi.index, `${iso} tithi`);
    assert.equal(s.star, d.nakshatra.index, `${iso} star`);
    assert.deepEqual([s.solar.month, s.solar.day], [d.tamil.month, d.tamil.day], `${iso} Tamil date`);
  }
});

test('Ekadasi names follow the lunar month (Vaikunta Ekadasi 2026 is Mokshada)', () => {
  assert.equal(ekadasiNameFor('2026-12-20', CHENNAI, 5.5)?.id, 'ekadasi-mokshada');
  assert.equal(EKADASI_IDS.size, 26);
});
const EKADASI_IDS = new Set(KB.filter((e) => e.kind === 'ekadasi').map((e) => e.id));

test('knowledge base: ≥120 entries, bilingual, valid mantra / temple links, ≥60 Ithihasa characters', () => {
  assert.ok(KB.length >= 120, `KB has ${KB.length}`);
  assert.ok(CHARACTERS.length >= 60, `characters ${CHARACTERS.length}`);
  const ids = new Set();
  for (const e of [...KB, ...CHARACTERS]) {
    assert.ok(!ids.has(e.id), `duplicate ${e.id}`); ids.add(e.id);
    assert.ok(e.names?.en && /[஀-௿]/.test(e.names.ta), `${e.id} names`);
    if (e.mantra) assert.ok(MANTRAS.some((m) => m.id === e.mantra), `${e.id} mantra ${e.mantra}`);
    for (const t of e.temples || []) assert.ok(TEMPLES.some((x) => x.id === t), `${e.id} temple ${t}`);
    if (e.kind !== 'character') {
      assert.ok(e.line?.en && /[஀-௿]/.test(e.line.ta), `${e.id} line`);
      if (e.rule) assert.ok(e.ruleText?.en && e.ruleText?.ta, `${e.id} ruleText`);
      if (e.how) assert.equal(e.how.en.length, e.how.ta.length, `${e.id} how en/ta lines`);
    }
  }
  for (const e of KB) for (const id of e.see || []) assert.ok(getEntry(id), `${e.id} see ${id}`);
  const required = ['bhogi', 'thai-pongal', 'mattu-pongal', 'kaanum-pongal', 'thai-poosam', 'thai-amavasai', 'ratha-saptami', 'maha-sivaratri', 'masi-magam',
    'panguni-uthiram', 'ugadi', 'tamil-new-year', 'rama-navami', 'chithra-pournami', 'akshaya-tritiya', 'vaikasi-visakam', 'aani-thirumanjanam', 'aadi-perukku',
    'aadi-amavasai', 'aadi-pooram', 'aadi-velli', 'aadi-sevvai', 'varalakshmi', 'avani-avittam', 'krishna-jayanthi', 'vinayagar-chathurthi', 'mahalaya-amavasai',
    'mahalaya-paksham', 'navaratri', 'saraswathi-pooja', 'ayudha-pooja', 'vijayadasami', 'deepavali', 'kedara-gowri', 'skanda-sashti', 'karthigai-deepam',
    'karthigai-somavaram', 'vaikunta-ekadasi', 'arudra-darisanam', 'hanuman-jayanthi', 'margazhi', 'guru-peyarchi', 'sani-peyarchi', 'grahanam', 'star-birthday',
    'shashtiabdapoorthi', 'ekadasi', 'pradosham', 'sashti', 'sankatahara', 'karthigai', 'amavasai', 'pournami', 'masa-sivaratri', 'thiruvonam', 'chathurthi'];
  for (const id of required) assert.ok(getEntry(id), `missing ${id}`);
});

// 40 questions in Tamil script, Tanglish and English → expected topic.
const ROUTES = [
  ['saraswathi pooja eppo', 'saraswathi-pooja'], ['ஏகாதசி விரதம் ஏன்', 'ekadasi'], ['why shasti viratham', 'sashti'], ['next pradosham eppo', 'pradosham'],
  ['இன்று என்ன திதி', 'today'], ['amavasai date', 'amavasai'], ['karthigai deepam 2026', 'karthigai-deepam'], ['thai poosam special', 'thai-poosam'],
  ['vaikunta ekadasi la enna seyyanum', 'vaikunta-ekadasi'], ['deepavali eppo', 'deepavali'], ['navaratri golu', 'navaratri'], ['aadi perukku', 'aadi-perukku'],
  ['ramayanam la sabari yaar', 'ithihasa'], ['who is Vibhishana', 'ithihasa'], ['கர்ணன் கதை', 'ithihasa'], ['when is diwali', 'deepavali'],
  ['சரஸ்வதி பூஜை எப்போது', 'saraswathi-pooja'], ['ayudha pooja eppadi kondadanum', 'ayudha-pooja'], ['kanda sashti viratham eppadi', 'skanda-sashti'],
  ['sankatahara chathurthi eppo', 'sankatahara'], ['maha shivaratri 2027', 'maha-sivaratri'], ['பிரதோஷம் என்றால் என்ன', 'pradosham'], ['pongal 2027 date', 'thai-pongal'],
  ['vinayagar chathurthi la enna saapidalam', 'vinayagar-chathurthi'], ['mohini ekadasi eppo', 'ekadasi-mohini'], ['guru peyarchi eppo', 'guru-peyarchi'],
  ['grahanam eppo', 'grahanam'], ['nalai enna natchathiram', 'today'], ['தைப்பூசம் ஏன் கொண்டாடுகிறோம்', 'thai-poosam'], ['ஆடிப் பெருக்கு எப்படி கொண்டாடுவது', 'aadi-perukku'],
  ['krishna jayanthi eppo', 'krishna-jayanthi'], ['varalakshmi viratham 2027', 'varalakshmi'], ['hanuman jayanthi eppo', 'hanuman-jayanthi'], ['who is karna', 'ithihasa'],
  ['ஆருத்ரா தரிசனம் எப்போது', 'arudra-darisanam'], ['margazhi masam sirappu', 'margazhi'], ['mahalaya amavasai tharpanam eppadi', 'mahalaya-amavasai'],
  ['upcoming festivals', 'upcoming'], ['what is shashtiabdapoorthi', 'shashtiabdapoorthi'], ['kedara gowri vratham eppadi', 'kedara-gowri'],
];

test('40 multilingual questions route to the right topic', () => {
  assert.equal(ROUTES.length, 40);
  for (const [q, topic] of ROUTES) {
    const a = answerGeneral(q, { now: NOW, loc: CHENNAI, lang: /[஀-௿]|eppo|enna|yaar|seyy|la /.test(q) ? 'ta' : 'en' });
    assert.ok(a, `${q}: null`);
    assert.equal(a.topic, topic, `${q} → ${a.topic}`);
    assert.ok(a.sections.length && a.text && Array.isArray(a.followups) && a.sources.length, `${q}: shape`);
  }
});

test('WHEN answers give date, weekday and tithi with start/end time; WHY/HOW answers give story / steps', () => {
  const a = answerGeneral('saraswathi pooja eppo', { now: NOW, loc: CHENNAI, lang: 'ta' });
  const when = a.sections.find((s) => s.key === 'when');
  assert.match(when.lines[0], /20 அக்டோபர் 2026, செவ்வாய்/);
  assert.match(when.lines[0], /நவமி/);
  assert.match(when.lines[1], /முதல் .* வரை/);
  assert.deepEqual(a.dates, [{ date: '2026-10-20', end: null }]);
  const y = answerGeneral('karthigai deepam 2026', { now: NOW, loc: CHENNAI, lang: 'en' });
  assert.match(y.sections.find((s) => s.key === 'when').lines[0], /24 Nov 2026/);
  const why = answerGeneral('why shasti viratham', { now: NOW, loc: CHENNAI, lang: 'en' });
  assert.ok(why.sections.some((s) => s.key === 'story'));
  const how = answerGeneral('vaikunta ekadasi la enna seyyanum', { now: NOW, loc: CHENNAI, lang: 'ta' });
  assert.ok(how.sections.some((s) => s.key === 'how') && how.sections.some((s) => s.key === 'fast'), 'how + fasting care');
  assert.match(how.text, /கர்ப்பிணி/, 'who should not fast');
  const today = answerGeneral('இன்று என்ன திதி', { now: NOW, loc: CHENNAI, lang: 'ta' });
  assert.match(today.text, /துவாதசி/);
  assert.match(today.text, /மகம்/);
  const ch = answerGeneral('ramayanam la sabari yaar', { now: NOW, lang: 'ta' });
  assert.ok(ch.followups.some((f) => f.go === 'ithihasa' && /இதிகாசத் தொடர் படிக்க/.test(f.label)));
});

test('returns null for questions it does not cover (never guesses)', () => {
  for (const q of ['my marriage when', 'en rasi palan', 'job kidaikkuma', 'guru peyarchi palan for my rasi', 'weather today', 'rahu kalam today',
    'porutham paarunga', 'viratham irukkalama', 'hello', 'bitcoin price', 'என் ஜாதகம் எப்படி', 'en dasa eppo mudiyum', 'kalyanam eppo nadakkum', '', 'enakku velai eppo']) {
    assert.equal(answerGeneral(q, { now: NOW, loc: CHENNAI }), null, q);
  }
});

const CHART = /\b(dasa|dasai|bhukti|lagna|lagnam|your chart|birth chart|horoscope)\b|தசை\s|தசா\s|தசா\b|புக்தி|லக்ன|ஜாதக/i;
test('no chart / dasa lines, Tamil present, nothing prohibited — every route, every entry', () => {
  for (const [q] of ROUTES) {
    for (const lang of ['ta', 'en']) {
      const a = answerGeneral(q, { now: NOW, loc: CHENNAI, lang });
      assert.ok(!CHART.test(a.text), `${q} (${lang}) has chart wording`);
      if (lang === 'ta') assert.match(a.text, /[஀-௿]{3,}/, `${q} Tamil`);
      assert.deepEqual(findProhibited(a), [], `${q} (${lang}) prohibited`);
    }
  }
  assert.deepEqual(findProhibited(KB), []);
  assert.deepEqual(findProhibited(CHARACTERS), []);
  for (const e of KB) for (const lang of ['ta', 'en']) assert.ok(!CHART.test(entrySections(e, lang).map((s) => s.lines.join(' ')).join(' ')), `${e.id} chart wording`);
  // No fear or certainty wording about results.
  const all = JSON.stringify([KB, CHARACTERS]);
  assert.ok(!/\b(guaranteed|definitely will|will surely|must do this or)\b/i.test(all));
  assert.ok(!/நிச்சயம் கிடைக்கும்|கண்டிப்பாக நடக்கும்|செய்யாவிட்டால் ஆபத்து/.test(all));
});

test('Hindu-only: every viewer gets the full "how to observe" with the mantra — an old faith option changes nothing', () => {
  const a = answerGeneral('deepavali eppo', { now: NOW, loc: CHENNAI, lang: 'en', faith: 'christian' });
  assert.deepEqual(a, answerGeneral('deepavali eppo', { now: NOW, loc: CHENNAI, lang: 'en' }));
  assert.ok(!a.sections.some((s) => s.key === 'note' && /own faith/.test(s.lines.join(' '))));
  const h = answerGeneral('how to observe deepavali', { now: NOW, loc: CHENNAI, lang: 'en', faith: 'muslim' });
  assert.ok(h.sections.some((s) => s.key === 'how' && /How to observe/.test(s.title)));
  assert.ok(!h.sections.some((s) => /Hindu families/.test(s.title)));
  const withMantra = entrySections(getEntry('vinayagar-chathurthi'), 'en', { faith: 'christian' });
  assert.ok(withMantra.some((s) => s.key === 'mantra'), 'the mantra is shown to everyone');
  assert.deepEqual(withMantra, entrySections(getEntry('vinayagar-chathurthi'), 'en'));
});

test('festival calendar: 365 days of rows with Tamil and English names, sorted', () => {
  const rows = festivalCalendar({ from: NOW, days: 365, loc: CHENNAI, tz: 5.5 });
  assert.ok(rows.length > 200, `${rows.length} rows`);
  assert.equal(rows[0].date >= '2026-10-07', true);
  assert.ok(rows.at(-1).date <= '2027-10-06');
  for (let i = 1; i < rows.length; i++) assert.ok(rows[i].date >= rows[i - 1].date);
  assert.ok(rows.some((r) => r.id === 'saraswathi-pooja' && r.date === '2026-10-20'));
  assert.ok(rows.some((r) => r.id === 'ekadasi' && r.sub?.id === 'ekadasi-mokshada' && r.date === '2026-12-20'));
  for (const r of rows) assert.ok(r.names.en && r.names.ta && r.line.ta, r.id);
});

test('question matching tolerates spelling variants', () => {
  for (const q of ['saraswati puja', 'sarasvathi pujai', 'saraswathy pooja eppo', 'சரஸ்வதி பூசை']) assert.equal(matchQuestion(q).entry?.id, 'saraswathi-pooja', q);
  for (const q of ['ekadashi', 'egadasi', 'ekadasiyil', 'ஏகாதசியில்']) assert.equal(matchQuestion(q).entry?.id, 'ekadasi', q);
  for (const q of ['thaipusam', 'thai pusam', 'தைப் பூசம்']) assert.equal(matchQuestion(q).entry?.id, 'thai-poosam', q);
});
