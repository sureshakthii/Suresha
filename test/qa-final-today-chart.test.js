// Final release QA (onboarding, Today, Panchangam, chart & guide): regressions found by the scripted user journey —
// a 6-year-old with an unknown birth time could not be saved, My Guide crashed without a Lagna, English screens
// showed mantras only in Tamil script, Calculation methods was English-only in Tamil mode, and the calendar marked
// "Subha Muhurtha day" in Purattasi although Prasnam treats Aadi / Purattasi / Margazhi as no-wedding months.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { birthChart, panchang } from '../shared/astro.js';
import { tamilDay, tamilDate, NO_MUHURTHAM_MONTHS } from '../shared/tamilcal.js';
import { personalPlaylist, personalGuide, ishtaTheivam } from '../shared/personal.js';
import { CONVENTIONS, CONVENTIONS_TA } from '../shared/version.js';
import { UNKNOWN_TIME_PLACEHOLDER } from '../shared/birthtime.js';

const read = (f) => fs.readFileSync(new URL(`../public/${f}`, import.meta.url), 'utf8');
const TAMIL = /[஀-௿]/;

test('easy date/time pickers follow the hidden input: Unknown birth time never blocks Save', () => {
  const src = read('easy-date.js');
  assert.match(src, /attributeFilter: \['disabled', 'required'\]/, 'pickers must observe disabled/required on the source input');
  assert.match(src, /el\.disabled = off/);
  assert.match(src, /el\.required = wantRequired && !off/);
  // the family form still switches the time input off for "Unknown"
  assert.match(read('account.js'), /f\.elements\.time\.disabled = v === 'unknown'/);
});

test('My Guide works for a child with an unknown birth time (no Lagna)', () => {
  const c = birthChart({ date: '2020-06-10', time: UNKNOWN_TIME_PLACEHOLDER, lat: 25.2048, lon: 55.2708, tz: 4, timePrecision: 'unknown' });
  const g = personalGuide(c, { date: '2020-06-10' });
  assert.ok(g.today && g.numbers && g.ishta);
  const src = read('screens-guide.js');
  assert.doesNotMatch(src, /c\.lagna\.rasi \?\? c\.planets\.Lagna\.rasi/, 'unguarded Lagna access crashed the screen');
  assert.match(src, /Lagna needs the birth time/);
});

test('mantras have a Latin-letter form for English screens; the Tamil script stays for the Tamil voice', () => {
  for (const [date, time] of [['1984-03-15', '06:45:00'], ['1956-01-20', '05:30:00'], ['1990-10-28', '01:30:00']]) {
    const c = birthChart({ date, time, lat: 13.0827, lon: 80.2707, tz: 5.5 });
    const list = personalPlaylist(c, new Date('2026-10-07T06:00:00Z'));
    assert.ok(list.length >= 4);
    for (const p of list) {
      assert.ok(TAMIL.test(p.text), `${p.key}: spoken text is Tamil script`);
      assert.ok(p.textEn && !TAMIL.test(p.textEn) && /^[A-Z]/.test(p.textEn), `${p.key}: English form "${p.textEn}"`);
    }
    const it = ishtaTheivam(c);
    assert.ok(it.mantraEn && !TAMIL.test(it.mantraEn));
  }
  const src = read('screens-guide.js');
  assert.match(src, /chant \$\{g\.ishta\.mantraEn \|\| g\.ishta\.mantra\}/);
  assert.match(src, /mantraHtml\(p\.text, p\.textEn\)/);
});

test('Calculation methods has a Tamil text for every convention', () => {
  assert.deepEqual(Object.keys(CONVENTIONS_TA).sort(), Object.keys(CONVENTIONS).sort());
  for (const [k, v] of Object.entries(CONVENTIONS_TA)) assert.ok(TAMIL.test(v), k);
  assert.match(read('screens-trust.js'), /CONVENTIONS_TA\[k\]/);
});

test('no Subha Muhurtha day is marked in Aadi, Purattasi or Margazhi; other months still have them', () => {
  assert.deepEqual([...NO_MUHURTHAM_MONTHS].sort(), [3, 5, 8]);
  const byMonth = new Map();
  for (let d = 0; d < 366; d++) {
    const t = tamilDay(new Date(Date.UTC(2026, 0, 1 + d, 6, 30)), 13.0827, 80.2707, 5.5);
    if (t.muhurthaDay) byMonth.set(t.tamil.month, (byMonth.get(t.tamil.month) || 0) + 1);
  }
  for (const mo of NO_MUHURTHAM_MONTHS) assert.ok(!byMonth.has(mo), `month ${mo} has muhurtham days`);
  assert.ok([...byMonth.values()].reduce((a, b) => a + b, 0) >= 24, 'muhurtham days remain in the other months');
});

test('7 Oct 2026 spot check — Chennai and Dubai (Rahu Kalam from each place\'s own sunrise)', () => {
  const at = (h, tz) => new Date(Date.UTC(2026, 9, 7, 12 - tz, 0));
  const fmt = (d, tz) => { const x = new Date(d.getTime() + tz * 3600000); return x.getUTCHours() * 60 + x.getUTCMinutes(); };
  const ch = panchang(at(12, 5.5), 13.0827, 80.2707, 5.5);
  assert.equal(ch.weekday.en, 'Wednesday');
  assert.equal(ch.tithi.name, 'Dwadasi'); assert.equal(ch.tithi.paksha, 'Krishna');
  assert.equal(ch.nakshatra.name, 'Magam');
  assert.ok(Math.abs(fmt(ch.sunrise, 5.5) - 6 * 60) <= 5, 'Chennai sunrise ~6:00');
  assert.ok(Math.abs(fmt(ch.rahuKalam.start, 5.5) - 12 * 60) <= 6 && Math.abs(fmt(ch.rahuKalam.end, 5.5) - 13.5 * 60) <= 6, 'Chennai Rahu ~12:00–13:30');
  const td = tamilDate(at(12, 5.5), 13.0827, 80.2707, 5.5);
  assert.equal(td.monthEn, 'Purattasi'); assert.equal(td.day, 21);
  const du = panchang(at(12, 4), 25.2048, 55.2708, 4);
  assert.ok(Math.abs(fmt(du.sunrise, 4) - (6 * 60 + 13)) <= 3, 'Dubai sunrise ~6:13 Dubai time');
  assert.ok(Math.abs(fmt(du.rahuKalam.start, 4) - (12 * 60 + 6)) <= 3, 'Dubai Rahu starts ~12:06 Dubai time');
  const day = tamilDay(at(12, 5.5), 13.0827, 80.2707, 5.5);
  assert.equal(day.muhurthaDay, false, 'Purattasi: no wedding muhurtham');
});

test('Live sky centres the current horai in its strip without scrolling the page', () => {
  const src = read('screens-main.js');
  assert.doesNotMatch(src, /hora-item\.now'\)\?\.scrollIntoView/);
  assert.match(src, /list\.scrollTo\(\{ left:/);
});

test('Today is faith- and age-aware: no temple question for another faith, no marriage/career goal hint for a child', () => {
  const main = read('screens-main.js');
  assert.match(main, /GUIDE_SUGGESTIONS_OTHER_FAITH/);
  assert.match(main, /Plan a family trip or pilgrimage/);
  assert.match(read('screens-goals.js'), /Set a goal — studies, journey, health/);
});

test('calendar and Panchangam use the clock offset in force on each day (daylight saving in London)', async () => {
  const { tamilMonth, offsetOnDay } = await import('../shared/tamilcal.js');
  assert.equal(offsetOnDay(2026, 9, 24, 1, 'Europe/London'), 1);
  assert.equal(offsetOnDay(2026, 9, 26, 1, 'Europe/London'), 0);
  assert.equal(offsetOnDay(2026, 9, 26, 5.5, null), 5.5);
  const days = tamilMonth(2026, 9, 51.5085, -0.1257, 1, { zone: 'Europe/London' });
  const local = (d, x) => { const t = new Date(new Date(x).getTime() + d.tz * 3600000); return t.getUTCHours() + t.getUTCMinutes() / 60; };
  assert.equal(days[23].tz, 1); assert.equal(days[25].tz, 0);
  // sunrise stays near 7:40 BST before and ~6:45 GMT after the change — not 7:45 "BST" in November
  assert.ok(Math.abs(local(days[23], days[23].sunrise) - 7.65) < 0.2);
  assert.ok(Math.abs(local(days[25], days[25].sunrise) - 6.72) < 0.2);
  assert.match(read('screens-tools.js'), /tamilMonth\(y, mo, loc\.lat, loc\.lon, loc\.tz, \{ zone: loc\.zone \}\)/);
  assert.match(read('screens-guide.js'), /offsetOnDay\(y, m - 1, d, loc\.tz, loc\.zone\)/);
});

test('English ordinals: 1st, 2nd, 3rd, 11th — never "3th" or "1th"', async () => {
  const { transitStatus } = await import('../shared/analysis.js');
  const c = birthChart({ date: '2020-06-10', time: '12:00:00', lat: 25.2048, lon: 55.2708, tz: 4 });
  for (const months of [0, 6, 14, 30, 50]) {
    const at = new Date(Date.UTC(2026, 9 + months, 7));
    for (const st of transitStatus(c, at, { age: 6 }).status) {
      assert.doesNotMatch(st.en, /\b(1|2|3)th\b|\b(21|22|23)th\b/, st.en);
      if (st.kind === 'good') assert.doesNotMatch(st.adviceEn, /passes gently/, 'a favourable transit is not something to "pass"');
    }
  }
  for (const f of ['analysis.js', 'health.js', 'daily.js', 'personal.js', 'remedies.js', 'prasna.js', 'relations.js']) {
    assert.doesNotMatch(fs.readFileSync(new URL(`../shared/${f}`, import.meta.url), 'utf8'), /\$\{[A-Za-z_.]+\}th\b/, f);
  }
});

test('Life questions: a married person (spouse profile, or self with a spouse) is not asked "when will marriage happen"', () => {
  const src = read('screens-life.js');
  assert.match(src, /export function marriedOf\(m, family = \[\]\)/);
  assert.match(src, /married === true && \(q\.id === 'marriage' \|\| q\.id === 'partner'\)/);
  assert.match(src, /if \(m\.relation === 'spouse'\) return true;/);
});

test('Prasnam "What to do now" is plain text in both languages (no [object Object])', async () => {
  const { prasnaSummary, CATEGORIES } = await import('../shared/prasna.js');
  for (const verdict of ['DO', 'CAUTION', 'AVOID']) {
    for (const cat of CATEGORIES.slice(0, 12)) {
      const s = prasnaSummary({ verdict, factors: [{ label: 'x', labelTa: 'ய', points: 3 }] }, cat);
      assert.doesNotMatch(s.doNow.en, /object Object|undefined/, `${cat.id} ${verdict}: ${s.doNow.en}`);
      assert.doesNotMatch(s.doNow.ta, /object Object|undefined/);
    }
  }
});

test('after sign-in the person returns to the screen (and params) that asked for it, not Today', () => {
  const src = read('account.js');
  const fn = src.slice(src.indexOf('function afterLogin('), src.indexOf("registerScreen('login'"));
  assert.match(fn, /loginReturnTarget\(\)/);
  assert.match(fn, /go\(from\.view, from\.params \|\| \{\}\)/);
  assert.match(fn, /go\('family', \{ add: true, first: true, name \}\)/, 'a first-time user still starts by adding a profile');
  assert.match(src, /document\.addEventListener\('kj:screen'[\s\S]{0,300}rememberLoginOrigin\(e\.detail, state\.params\)/);
  assert.match(src, /sessionStorage\.setItem\(LOGIN_FROM_KEY/, 'survives a sign-in redirect');
  // every screen that sends a signed-out person to login is a screen they can come back to
  for (const f of ['screens-world.js', 'screens-plans.js', 'growth.js']) assert.match(read(f), /go\('login'\)/);
});
