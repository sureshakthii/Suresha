// Imported horoscope (OCR / PDF text) → candidate birth details, with confidence and flags (owner requirement §3d).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  parseHoroscopeText, importToDraft, mayCalculate, readClockTime, readNazhigai, nazhigaiToClock, readTamilDate,
  tamilDateCandidates, readBalance, cleanText, findName,
} from '../shared/horoscope-parse.js';

const now = new Date('2026-10-01T00:00:00Z');
const parse = (t) => parseHoroscopeText(t, { now });
const codes = (r, field) => r.flags.filter((f) => !field || f.field === field).map((f) => f.code);
const STAR = { Rohini: 3, Poosam: 7, Swathi: 14, Anusham: 16, Moolam: 18, Thiruvonam: 21, Revathi: 26, Hastham: 12, Avittam: 22, Kettai: 17 };

test('1. Tamil printed jathagam: every field read with high confidence; DD/MM ambiguity flagged', () => {
  const r = parse(`ஜாதகம்
பெயர்: செல்வன் அருண் குமார்
பிறந்த தேதி: 12-03-1985
பிறந்த நேரம்: காலை 10.35 மணி
பிறந்த ஊர்: மதுரை
நட்சத்திரம்: பூசம் 2ம் பாதம்
ராசி: கடகம்
லக்னம்: மேஷம்
சனி தசை இருப்பு 12 வருடம் 4 மாதம் 10 நாள்`);
  const f = r.fields;
  assert.equal(f.name.value, 'அருண் குமார்');
  assert.deepEqual(f.date.candidates.map((c) => c.iso), ['1985-03-12', '1985-12-03']);
  assert.ok(codes(r, 'date').includes('day-month'));
  assert.equal(f.time.value, '10:35');
  assert.equal(f.time.confidence, 'high');
  assert.equal(f.place.status, 'matched');
  assert.equal(f.place.options[0].name, 'Madurai');
  assert.deepEqual([f.star.index, f.star.pada], [STAR.Poosam, 2]);
  assert.equal(f.rasi.index, 3);
  assert.equal(f.lagna.index, 0);
  assert.deepEqual([f.balance.planet, f.balance.years, f.balance.months, f.balance.days], ['Saturn', 12, 4, 10]);
  assert.equal(f.balance.confidence, 'high'); // Poosam → Saturn dasa: agrees
  assert.deepEqual(r.low, ['date']);
});

test('2. English computer horoscope: no AM/PM and a place in two countries are both flagged', () => {
  const r = parse(`HOROSCOPE
Name : Priya Raman
Date of Birth : 05/06/1972
Time of Birth : 10:35
Place of Birth : Salem
Star : Rohini   Rasi : Rishabam   Lagnam : Kanni
Balance of Dasa : Moon 6 Y 2 M 12 D`);
  const f = r.fields;
  assert.equal(f.name.value, 'Priya Raman');
  assert.deepEqual(f.time.candidates, ['10:35', '22:35']);
  assert.equal(f.time.confidence, 'low');
  assert.ok(codes(r, 'time').includes('ampm'));
  assert.equal(f.place.status, 'choose');
  assert.ok(f.place.options.some((p) => p.cc === 'IN') && f.place.options.some((p) => p.cc === 'US'));
  assert.ok(codes(r, 'place').includes('place-choose'));
  assert.equal(f.star.index, STAR.Rohini);
  assert.equal(f.star.pada, null);
  assert.ok(codes(r, 'star').includes('pada'));
  assert.equal(f.rasi.index, 1);
  assert.equal(f.lagna.index, 5);
  assert.deepEqual([f.balance.planet, f.balance.years, f.balance.months], ['Moon', 6, 2]);
  for (const k of ['date', 'time', 'place', 'star']) assert.ok(r.low.includes(k), k);
});

test('3. Tamil year + month only ("குரோதி வருடம் ஆடி 12"): Gregorian candidates, weekday picks the cycle, needs confirmation', () => {
  const r = parse(`ஸ்ரீ குரோதி வருடம் ஆடி மாதம் 12ம் தேதி சனிக்கிழமை
இரவு 11.20 மணிக்கு பிறந்த பெண் குழந்தை
ஜாதகர் பெயர் : மீனாட்சி
ஜனன ஊர் : கும்பகோணம்
ஜென்ம நட்சத்திரம் : திருவோணம்
ஜென்ம ராசி : மகரம்`);
  const f = r.fields;
  assert.deepEqual([f.tamilDate.yearIndex, f.tamilDate.month, f.tamilDate.day], [37, 3, 12]);
  assert.deepEqual(f.date.candidates.map((c) => c.iso), ['2024-07-27']);
  assert.equal(f.date.fromTamil, true);
  assert.equal(f.date.iso, null); // never taken as certain
  assert.ok(codes(r, 'date').includes('tamil-cycle'));
  assert.equal(f.time.value, '23:20');
  assert.equal(f.gender.value, 'female');
  assert.equal(f.name.value, 'மீனாட்சி');
  assert.equal(f.place.options[0].name, 'Kumbakonam');
  assert.equal(f.star.index, STAR.Thiruvonam);
  assert.equal(f.rasi.index, 9);
});

test('4. Tamil year without a weekday: every 60-year cycle in range is a candidate', () => {
  const r = parse('குரோதி வருடம் ஆடி 12\nநட்சத்திரம்: ரேவதி');
  assert.deepEqual(r.fields.date.candidates.map((c) => c.iso), ['2024-07-27', '1964-07-27']);
  assert.equal(r.fields.date.confidence, 'low');
  assert.equal(r.fields.star.index, STAR.Revathi);
});

test('5. Nazhigai from sunrise: read, converted with a given sunrise, always "needs confirmation"', () => {
  const r = parse(`ஜனன தேதி: 1990-08-15
உதயாதி நாழிகை 12-30
பிறந்த இடம்: திருநெல்வேலி
நட்சத்திரம்: அனுஷம்
லக்னம்: துலாம்`);
  const f = r.fields;
  assert.equal(f.date.iso, '1990-08-15');
  assert.equal(f.time, null);
  assert.deepEqual([f.nazhigai.nazhigai, f.nazhigai.vinadi, f.nazhigai.minutesAfterSunrise], [12, 30, 300]);
  assert.equal(f.nazhigai.confidence, 'low');
  assert.ok(codes(r, 'time').includes('nazhigai'));
  assert.equal(f.place.options[0].name, 'Tirunelveli');
  assert.equal(f.star.index, STAR.Anusham);
  // Sunrise 06:05 IST → 12 nazhigai 30 vinadi (5 h) later = 11:05.
  const sunrise = new Date('1990-08-15T00:35:00Z');
  assert.equal(nazhigaiToClock(300, sunrise, 5.5).time, '11:05');
  const late = nazhigaiToClock(55 * 24, sunrise, 5.5);
  assert.equal(late.time, '04:05');
  assert.equal(late.nextDay, true);
});

test('6. Noisy English OCR (rn→m, O→0, l→1): labels and digits recovered but marked unclear', () => {
  const r = parse(`Narne : K. Senthil
Date of Birth : l5/O8/l968 Thursday
Tirne of Birth : 6.45 P.M
Place : Trichy
Nakshatra : Swati Pada 3
Rasi : Thula`);
  const f = r.fields;
  assert.equal(f.name.value, 'K. Senthil');
  assert.deepEqual(f.date.candidates.map((c) => c.iso), ['1968-08-15']);
  assert.notEqual(f.date.confidence, 'high');
  assert.ok(codes(r, 'date').includes('noisy'));
  assert.equal(f.time.value, '18:45');
  assert.equal(f.place.options[0].name, 'Tiruchirappalli');
  assert.deepEqual([f.star.index, f.star.pada], [STAR.Swathi, 3]);
  assert.equal(f.rasi.index, 6);
});

test('7. Mixed Tamil / English labels and a month name', () => {
  const r = parse(`ஜாதகர் பெயர் / Name: Lakshmi
பிறந்த தேதி / Date of Birth: 23 Nov 1994
பிறந்த நேரம் / Time: 04:10 AM
பிறந்த ஊர் / Place: Jaffna, Sri Lanka
நட்சத்திரம் / Star: Moolam
ராசி / Rasi: Dhanusu`);
  const f = r.fields;
  assert.equal(f.name.value, 'Lakshmi');
  assert.equal(f.date.iso, '1994-11-23');
  assert.equal(f.time.value, '04:10');
  assert.equal(f.place.options[0].name, 'Jaffna');
  assert.equal(f.place.status, 'matched');
  assert.equal(f.star.index, STAR.Moolam);
  assert.equal(f.rasi.index, 8);
  assert.equal(f.star.padaGuess, 1); // Moolam is wholly in Dhanusu
});

test('8. Weekday next to an ambiguous date picks one reading', () => {
  // 03/04/2001: 3 April 2001 was a Tuesday, 4 March 2001 a Sunday.
  const r = parse('Date of Birth: 03/04/2001 (Tuesday)\nStar: Hastham');
  assert.deepEqual(r.fields.date.candidates.map((c) => c.iso), ['2001-04-03']);
  assert.ok(!codes(r, 'date').includes('day-month'));
  const bad = parse('Date of Birth: 15/08/1968 Monday');
  assert.ok(codes(bad, 'date').includes('weekday'));
  assert.equal(bad.fields.date.confidence, 'low');
});

test('9. Two-digit year and a place that is not in the gazetteer are flagged', () => {
  const r = parse('பிறந்த தேதி: 05.06.72\nபிறந்த ஊர்: Zzyzxville\nநட்சத்திரம்: அவிட்டம்');
  assert.ok(codes(r, 'date').includes('two-digit-year'));
  assert.deepEqual(r.fields.date.candidates.map((c) => c.iso).sort(), ['1972-05-06', '1972-06-05']);
  assert.equal(r.fields.place.status, 'not-found');
  assert.ok(codes(r, 'place').includes('place-missing'));
  assert.equal(r.fields.star.index, STAR.Avittam);
});

test('10. Tamil OCR slips: misspelt label and star name are matched fuzzily, flagged as unclear', () => {
  const r = parse('நட்சத்திறம்: கேட்டட\nலக்கினம்: விருச்சிகம்');
  assert.equal(r.fields.star.index, STAR.Kettai);
  assert.equal(r.fields.star.confidence, 'medium');
  assert.ok(codes(r, 'star').includes('fuzzy'));
  assert.equal(r.fields.lagna.index, 7);
});

test('11. Star and Rasi that cannot both be right; dasa balance planet that is not the star lord', () => {
  const r = parse('Star: Rohini, Pada 2\nRasi: Simham\nDasa Balance: Venus 3 years 2 months');
  assert.ok(codes(r, 'star').includes('star-rasi'));
  assert.equal(r.fields.star.confidence, 'low');
  assert.equal(r.fields.rasi.confidence, 'low');
  assert.ok(codes(r, 'balance').includes('balance-lord')); // Rohini → Moon dasa, not Venus
});

test('12. Night birth after midnight: time read as 02:15 and the date flagged for checking', () => {
  const r = parse('பிறந்த தேதி: 10/10/2010\nபிறந்த நேரம்: இரவு 2.15 மணி');
  assert.equal(r.fields.time.value, '02:15');
  assert.ok(codes(r, 'time').includes('night-date'));
});

test('13. Tamil digits, Tamil Gregorian month name, label on its own line', () => {
  const r = parse('பிறந்த தேதி\n௧௨ மார்ச் ௧௯௮௫\nபிறந்த நேரம்\nமாலை ௬:௦௫');
  assert.equal(r.fields.date.iso, '1985-03-12');
  assert.equal(r.fields.time.value, '18:05');
});

test('14. Unreadable text (garbled legacy-font PDF): nothing invented, date missing is flagged', () => {
  const r = parse('gpwe;j jpjp: 12 ~~ ##\nn$hjp$k; @@@');
  assert.equal(r.found, 0);
  assert.ok(codes(r, 'date').includes('no-date'));
  assert.equal(r.fields.star, null);
});

test('15. Field readers', () => {
  assert.deepEqual(readClockTime('10 மணி 35 நிமிடம் பகல்').value, '10:35');
  assert.deepEqual(readClockTime('பகல் 1.20').value, '13:20');
  assert.deepEqual(readClockTime('12:10 AM').value, '00:10');
  assert.deepEqual(readClockTime('21:40 hrs').candidates, ['21:40']);
  assert.equal(readClockTime('no time here'), null);
  assert.deepEqual(readNazhigai('25 நாழிகை 40 விநாடி'), { ...readNazhigai('25 நாழிகை 40 விநாடி'), nazhigai: 25, vinadi: 40, minutesAfterSunrise: 616 });
  assert.equal(readNazhigai('Ghati 7 Vighati 12').minutesAfterSunrise, 7 * 24 + 12 * 0.4);
  assert.deepEqual(readTamilDate('Krodhi varudam Aadi 12'), { ...readTamilDate('Krodhi varudam Aadi 12'), yearIndex: 37, month: 3, day: 12 });
  assert.deepEqual(tamilDateCandidates({ yearIndex: 37, month: 3, day: 12 }, { now }), ['2024-07-27', '1964-07-27']);
  assert.deepEqual(readBalance('Guru dasa balance 3-2-15'), { planet: 'Jupiter', years: 3, months: 2, days: 15 });
  assert.equal(cleanText('Date: l2/O3/1985 | Tamil-12'), 'Date: 12/03/1985 Tamil-12');
  assert.equal(findName('புனர்பூசம்', [{ key: 'a', names: ['பூசம்'] }, { key: 'b', names: ['புனர்பூசம்'] }]).key, 'b');
});

// ---------------------------------------------------------------------------------------------------------------
// The kattam flow never calculates before confirmation.

test('16. Import only prefills the draft; nothing can be calculated until Confirm is pressed', () => {
  const parsed = parse(`Name : Priya Raman\nDate of Birth : 05/06/1972\nTime of Birth : 10:35\nPlace of Birth : Salem\nStar : Rohini  Rasi : Rishabam  Lagnam : Kanni`);
  const before = { name: '', kattam: { star: null, pada: 1, lagna: null, planets: {}, balance: null }, confirming: true, confirmed: true };
  const d = importToDraft(before, parsed, { source: 'image' });
  assert.equal(before.name, '', 'input draft untouched');
  assert.equal(d.confirming, false);
  assert.equal(d.confirmed, false);
  assert.equal(mayCalculate(d), false);
  assert.equal(d.name, 'Priya Raman');
  assert.equal(d.writtenDate, '05/06/1972');
  assert.equal(d.date, ''); // ambiguous: left for the confirmation panel
  assert.deepEqual(d.timeOptions, ['10:35', '22:35']);
  assert.equal(d.place, 'Salem');
  assert.equal(d.lat, null);
  assert.deepEqual([d.kattam.star, d.kattam.lagna, d.kattam.planets.Moon], [STAR.Rohini, 5, 1]);
  assert.ok(d.autoRead.filled.includes('star') && d.autoRead.low.includes('time') && d.autoRead.low.includes('pada'));
  // Submitting the form opens the panel — still no calculation.
  assert.equal(mayCalculate({ ...d, confirming: true }), false);
  // Only the panel's Confirm button sets `confirmed`.
  assert.equal(mayCalculate({ ...d, confirming: true, confirmed: true }), true);
  assert.equal(mayCalculate({ ...d, confirming: false, confirmed: true }), false);
});

test('17. The screen guards save() with mayCalculate and sets `confirmed` only in the Confirm handler', () => {
  const src = fs.readFileSync(new URL('../public/screens-kattam.js', import.meta.url), 'utf8');
  assert.match(src, /function save\(\) \{\n {2}if \(!mayCalculate\(draft\)\) return;/);
  const sets = [...src.matchAll(/confirmed = true/g)];
  assert.equal(sets.length, 1);
  const confirmHandler = src.slice(src.indexOf("$('#ktConfirmBtn').addEventListener"), src.indexOf('/** Step 2'));
  assert.ok(confirmHandler.includes('draft.confirmed = true'));
  // The import handler only prefills (importToDraft) and re-renders the form.
  const runImport = src.slice(src.indexOf('async function runImport'), src.indexOf('function wire('));
  assert.ok(runImport.includes('importToDraft('));
  assert.ok(!/save\(|go\('chart'|confirmed = true|confirming = true/.test(runImport));
});

test('18. OCR files are bundled locally, loaded lazily and never precached', () => {
  const ocr = fs.readFileSync(new URL('../public/ocr-import.js', import.meta.url), 'utf8');
  assert.ok(!/https?:\/\//.test(ocr.replace(/\/\/.*$/gm, '')), 'no absolute URLs in ocr-import.js');
  assert.match(ocr, /new URL\('\.\/vendor\/ocr\/', import\.meta\.url\)/);
  for (const k of ['workerPath', 'corePath', 'langPath']) assert.ok(ocr.includes(k), k);
  for (const f of ['tesseract.esm.min.js', 'worker.min.js', 'tesseract-core-simd-lstm.wasm.js', 'tesseract-core-lstm.wasm.js', 'lang/tam.traineddata.gz', 'lang/eng.traineddata.gz', 'pdf.min.js', 'pdf.worker.min.js']) {
    const st = fs.statSync(new URL(`../public/vendor/ocr/${f}`, import.meta.url));
    assert.ok(st.size > 10000 && st.size < 15 * 1048576, f);
  }
  const kattam = fs.readFileSync(new URL('../public/screens-kattam.js', import.meta.url), 'utf8');
  assert.ok(!/^import .*ocr-import/m.test(kattam), 'ocr-import.js is imported dynamically');
  assert.ok(kattam.includes("import('./ocr-import.js')"));
  const sw = fs.readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
  const shell = sw.slice(sw.indexOf('const SHELL'), sw.indexOf('];'));
  assert.ok(!shell.includes('/vendor/ocr'), 'the OCR files are not precached');
});

test('19. A Tamil calendar date written beside an ambiguous DD/MM date settles it; honorific gives the gender', () => {
  const r = parse(`ஜாதகர் பெயர் : செல்வி மீனாட்சி
பிறந்த தேதி : 12-03-1985 (செவ்வாய்க்கிழமை)
ரக்தாட்சி வருடம் மாசி மாதம் 29ம் தேதி`);
  assert.deepEqual(r.fields.date.candidates.map((c) => c.iso), ['1985-03-12']); // 3 Dec 1985 is also a Tuesday
  assert.equal(r.fields.date.byTamil, true);
  assert.ok(!codes(r, 'date').includes('day-month'));
  assert.equal(r.fields.tamilDate.yearIndex, 57);
  assert.equal(r.fields.gender.value, 'female');
  assert.equal(r.fields.name.value, 'மீனாட்சி');
  const d = importToDraft({}, r);
  assert.equal(d.dateChoice, '1985-03-12');
  assert.equal(d.tamilYear, 57);
  assert.equal(mayCalculate(d), false);
});

test('a period word whose last vowel sign OCR dropped still gives morning / evening', () => {
  assert.equal(readClockTime('கால 10.35 மணி').value, '10:35');
  assert.equal(readClockTime('மால 6.20').value, '18:20');
  assert.equal(readClockTime('காலம் 10.35').candidates.length, 2, 'காலம் is not காலை');
});
