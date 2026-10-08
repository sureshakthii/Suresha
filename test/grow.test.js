// Daily companion: morning brief (age rules, Hindu content for everyone, honest wording), Thunai diary storage and backup policy,
// share-card layout, prompt frequency caps and the one settings page that switches everything off.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { birthChart } from '../shared/astro.js';
import { morningBrief, weekAhead, monthAhead, sandhyaReminder, briefNotification, briefSettings, allOff, BRIEF_DEFAULTS, goodWindow, instantAt, addDaysIso, festivalInfo } from '../shared/daily-brief.js';
import * as J from '../shared/journal.js';
import { backupPayload, shareableJournal } from '../shared/sync-policy.js';
import { layoutCard, approxMeasure, assertShareable, SIZES, wrap } from '../shared/share-card-layout.js';
import { findProhibited } from '../shared/themes.js';
import { tamilDay } from '../shared/tamilcal.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOC = { lat: 13.0827, lon: 80.2707, tz: 5.5, name: 'Chennai' };
const person = (p) => ({ ...p, chart: birthChart({ ...p, lat: 13.08, lon: 80.27, tz: 5.5, place: 'Chennai' }) });
const ADULT = person({ name: 'Suresh', date: '1982-05-14', time: '06:20:00', relation: 'self', faith: 'hindu' });
const TEEN = person({ name: 'Kavya', date: '2013-09-02', time: '10:05:00', relation: 'daughter', faith: 'hindu' });
const BABY = person({ name: 'Baby', date: '2024-06-01', time: '04:00:00', relation: 'son', faith: 'hindu' });
const MARY = person({ name: 'Mary', date: '1975-01-20', time: '17:40:00', relation: 'mother', faith: 'christian' });
const ELDER = person({ name: 'Thatha', date: '1950-03-03', time: '05:30:00', relation: 'father', faith: 'hindu' });
const brief = (p, iso, hm = '06:30') => morningBrief({ chart: p.chart, member: p, name: p.name, loc: LOC, now: instantAt(iso, hm, 5.5), faith: p.faith });
const text = (b) => b.lines.map((l) => `${l.text.en} ${l.text.ta}`).join(' ');
const DAYS = Array.from({ length: 45 }, (_, i) => addDaysIso('2026-10-01', i));

test('morning brief: three lines — quality, one thing to do, one spiritual touch — in Tamil and English', () => {
  const b = brief(ADULT, '2026-10-08');
  assert.deepEqual(b.lines.map((l) => l.key), ['quality', 'do', 'spirit']);
  for (const l of b.lines) { assert.match(l.text.ta, /[஀-௿]/, 'Tamil line'); assert.ok(l.text.en.length > 10); }
  assert.match(b.greeting.ta, /காலை வணக்கம், Suresh/);
  const n = briefNotification(b, 'ta');
  assert.ok(n.title.includes('காலை வணக்கம்') && n.body.split('\n').length === 3);
});

test('morning brief: the time window is never inside Rahu Kalam or Yamagandam, and starts after the brief time', () => {
  for (const iso of DAYS) {
    const at = instantAt(iso, '06:30', 5.5);
    const td = tamilDay(instantAt(iso, '12:00', 5.5), LOC.lat, LOC.lon, 5.5);
    const w = goodWindow(td, at);
    if (!w) continue;
    assert.ok(w.start >= at, `${iso}: window starts before the brief`);
    for (const k of [td.rahuKalam, td.yamagandam]) {
      const overlap = w.start < new Date(k.end) && new Date(k.start) < w.end;
      assert.ok(!overlap, `${iso}: window overlaps a kalam`);
    }
    assert.ok(w.end - w.start >= 20 * 60000);
  }
});

test('morning brief: honest wording on every day for every person (findProhibited is empty)', () => {
  for (const p of [ADULT, TEEN, BABY, MARY, ELDER]) {
    for (const iso of DAYS) {
      const b = brief(p, iso);
      assert.deepEqual(findProhibited(b), [], `${p.name} ${iso}`);
      assert.doesNotMatch(text(b), /\b(guarantee|will surely|definitely|bad luck|danger|death|accident)\b|நிச்சயம்|ஆபத்து|மரணம்|விபத்து நடக்/i, `${p.name} ${iso}: fear / promise wording`);
    }
  }
});

test('morning brief: minors get no adult topics and no fasting advice; a baby’s brief is for the caregiver', () => {
  const ADULT_TOPIC = /\b(money|marriage|business|loan|invest|property|signature|purchase|romance|partner)\b|(?<![\u0B80-\u0BFF])(பணம்|திருமண|வியாபார|கடன்|முதலீடு|சொத்து|கையெழுத்து|காதல்)|தர்ப்பணம்/i;
  for (const iso of DAYS) {
    const t = brief(TEEN, iso);
    assert.equal(t.minor, true);
    assert.doesNotMatch(text(t), ADULT_TOPIC, `teen ${iso}`);
    // Fasting is never asked of a child: a festival line that speaks of fasting is replaced by a short prayer line.
    if (/விரதம்|fast/i.test(t.lines[2].text.en + t.lines[2].text.ta)) assert.match(t.lines[2].text.en, /need not fast/, `teen ${iso}: ${t.lines[2].text.en}`);
    const b = brief(BABY, iso);
    assert.match(b.lines[1].text.en, /little one/, 'caregiver-directed do-line');
    assert.doesNotMatch(text(b), ADULT_TOPIC);
  }
  const t = brief(TEEN, '2026-10-08');
  assert.match(t.lines[1].text.ta, /பாடம்/, 'study window for a student');
});

test('morning brief: Hindu-only — a profile once stored as Christian gets the same Hindu spiritual line as everyone', () => {
  for (const iso of DAYS) {
    const b = brief(MARY, iso);
    const s = b.lines[2];
    assert.equal(s.key, 'spirit');
    assert.equal(s.icon, '🪔');
    const plainMary = morningBrief({ chart: MARY.chart, member: { ...MARY, faith: undefined }, name: MARY.name, loc: LOC, now: instantAt(iso, '06:30', 5.5) });
    assert.deepEqual(b, plainMary, `stored faith is ignored ${iso}`);
    assert.ok(!('blessing' in b) && !('faith' in b), 'no other-faith blessing');
    assert.doesNotMatch(`${s.text.en} ${s.text.ta}`, /own faith|God bless|கர்த்தர்|நம்பிக்கைப்படி/);
  }
  // On an ordinary day everyone gets the day's deity and mantra.
  const plain = DAYS.map((iso) => brief(ADULT, iso)).find((b) => !b.festival);
  assert.match(plain.lines[2].text.ta, /இன்றைய தெய்வம்/);
  const maryPlain = DAYS.map((iso) => brief(MARY, iso)).find((b) => !b.festival);
  assert.match(maryPlain.lines[2].text.ta, /இன்றைய தெய்வம்/);
  // Elders: fasting only if health allows.
  const ek = DAYS.map((iso) => brief(ELDER, iso)).find((b) => b.festival && /Ekadasi/.test(b.festival.name.en));
  if (ek) assert.match(ek.lines[2].text.en, /simple prayer is enough/);
});

test('morning brief without birth details: a general line that invites adding them (no invented personal claims)', () => {
  const b = morningBrief({ chart: null, loc: LOC, now: instantAt('2026-10-08', '06:30', 5.5) });
  assert.equal(b.personal, false);
  assert.match(b.lines[0].text.ta, /பிறப்பு விவரம் சேர்த்தால்/);
});

test('evening lamp time is the sunset of the day — the same sandhya deepam line for everyone', () => {
  const r = sandhyaReminder({ loc: LOC, date: '2026-10-08' });
  const td = tamilDay(instantAt('2026-10-08', '12:00', 5.5), LOC.lat, LOC.lon, 5.5);
  assert.equal(r.at.getTime(), new Date(td.sunset).getTime());
  assert.match(r.text.ta, /விளக்கேற்றும்/);
  assert.match(sandhyaReminder({ loc: LOC, date: '2026-10-08', faith: 'muslim' }).text.en, /sandhya deepam/, 'an old faith option is ignored');
});

test('week ahead and month summaries: own good / care days, festivals for everyone, honest wording', () => {
  const w = weekAhead({ chart: ADULT.chart, loc: LOC, start: '2026-10-04', faith: 'hindu', member: ADULT, now: instantAt('2026-10-04', '06:30', 5.5) });
  assert.equal(w.start, '2026-10-04'); assert.equal(w.end, '2026-10-10');
  for (const d of w.care) assert.ok(d >= w.start && d <= w.end);
  assert.ok(w.lines.length >= 2);
  const m = monthAhead({ chart: ADULT.chart, loc: LOC, month: '2026-11', faith: 'hindu', member: ADULT, now: instantAt('2026-11-01', '06:30', 5.5) });
  assert.equal(m.start, '2026-11-01'); assert.equal(m.end, '2026-11-30');
  assert.ok(m.lines.some((l) => /தசை/.test(l.text.ta)), 'running dasa line for adults');
  assert.ok(m.festivals.some((f) => /Deepavali/.test(f.name.en)));
  const mm = monthAhead({ chart: MARY.chart, loc: LOC, month: '2026-11', faith: 'christian', member: MARY });
  assert.ok(mm.festivals.some((f) => /Deepavali/.test(f.name.en)), 'festival list for everyone (old stored faith ignored)');
  assert.deepEqual(mm.lines, monthAhead({ chart: MARY.chart, loc: LOC, month: '2026-11', member: MARY }).lines);
  const tm = monthAhead({ chart: TEEN.chart, loc: LOC, month: '2026-11', faith: 'hindu', member: TEEN });
  assert.ok(!tm.lines.some((l) => /Dasa|தசை/.test(l.text.en + l.text.ta)), 'minor: no dasa line');
  for (const x of [w, m, mm, tm]) assert.deepEqual(findProhibited(x), []);
});

test('festival greeting info carries the festival meaning (Deepavali)', () => {
  const fi = festivalInfo({ id: 'deepavali', en: 'Deepavali', ta: 'தீபாவளி', kind: 'festival' });
  assert.equal(fi.name.ta, 'தீபாவளி');
  assert.match(fi.line.ta, /ஒளி/);
});

// ---------------------------------------------------------------- diary
test('diary: add / edit / delete, normalised and capped; nothing malformed is kept', () => {
  let j = J.emptyJournal();
  const r = J.addEntry(j, { kind: 'helped', source: 'brief', title: 'Today', note: '  A calm, good day  ', personId: 'me' }, { now: new Date('2026-10-08T03:00:00Z'), date: '2026-10-08' });
  j = r.journal;
  assert.equal(j.entries.length, 1);
  assert.equal(r.entry.note, 'A calm, good day');
  assert.equal(r.entry.date, '2026-10-08');
  j = J.editEntry(j, r.entry.id, { note: 'Exam went well', kind: 'happened' });
  assert.equal(j.entries[0].kind, 'happened');
  assert.equal(J.addEntry(j, { kind: 'helped', title: '', note: '' }).entry, null, 'an empty mark is refused');
  j = J.deleteEntry(j, r.entry.id);
  assert.equal(j.entries.length, 0);
  assert.deepEqual(j.deleted, [r.entry.id]);
  const big = J.normaliseJournal({ entries: Array.from({ length: 1200 }, (_, i) => ({ id: `x${i}`, at: new Date(Date.UTC(2026, 0, 1) + i * 60000).toISOString(), title: 't', note: 'n'.repeat(900) })), days: ['bad', '2026-10-08'] });
  assert.equal(big.entries.length, 1000);
  assert.equal(big.entries[0].note.length, 600);
  assert.deepEqual(big.days, ['2026-10-08']);
  assert.deepEqual(J.normaliseJournal('junk'), J.emptyJournal());
});

test('diary: gentle streaks, monthly reflection of the person’s own marks, remedies with what THEY noted after', () => {
  let j = J.emptyJournal();
  for (const d of ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08']) j = J.recordOpen(j, d);
  const st = J.streak(j.days, '2026-10-08');
  assert.deepEqual(st, { current: 4, best: 4, monthDays: 7, totalDays: 7 });
  assert.equal(J.streak(j.days, '2026-10-09').current, 4, 'today not opened yet — yesterday’s run still counts');
  const add = (e, at) => { j = J.addEntry(j, e, { now: new Date(at) }).journal; };
  add({ kind: 'remedy', source: 'parigaram', title: 'Lamp for Durga at Rahu Kalam', personId: 'me' }, '2026-10-02T05:00:00Z');
  add({ kind: 'happened', source: 'diary', title: '', note: 'Interview call came', personId: 'me' }, '2026-10-06T05:00:00Z');
  add({ kind: 'helped', source: 'ask', title: 'Question: job', personId: 'amma' }, '2026-10-07T05:00:00Z');
  add({ kind: 'good', source: 'diary', title: '', note: 'Old friend visited', personId: 'me' }, '2026-09-20T05:00:00Z');
  const ref = J.monthReflection(j, '2026-10', { personId: 'me' });
  assert.equal(ref.total, 2);
  assert.deepEqual(ref.counts, { helped: 0, happened: 1, remedy: 1, good: 0 });
  assert.equal(ref.highlights[0].note, 'Interview call came', 'own words first');
  assert.equal(J.monthReflection(j, '2026-10').total, 3);
  const rem = J.remediesWithFollowUps(j, { personId: 'me' });
  assert.equal(rem.length, 1);
  assert.deepEqual(rem[0].after.map((e) => e.note), ['Interview call came']);
  assert.deepEqual(J.byDate(J.entriesFor(j)).map((g) => g.date), ['2026-10-07', '2026-10-06', '2026-10-02', '2026-09-20']);
});

test('diary backup policy: only with backup consent AND the diary switch; never private entries or private profiles', () => {
  const family = [{ id: 'me', name: 'S' }, { id: 'kid', name: 'K', private: true }];
  const journal = { entries: [
    { id: 'a', at: '2026-10-01T00:00:00Z', date: '2026-10-01', kind: 'helped', title: 'x', personId: 'me' },
    { id: 'b', at: '2026-10-02T00:00:00Z', date: '2026-10-02', kind: 'helped', title: 'secret', personId: 'kid' },
    { id: 'c', at: '2026-10-03T00:00:00Z', date: '2026-10-03', kind: 'good', note: 'mine only', private: true },
  ], deleted: [], days: ['2026-10-01'] };
  assert.equal(backupPayload({ family, journal }, { backup: false, journal: true }), null);
  assert.equal(backupPayload({ family, journal }, { backup: true }).journal, undefined, 'diary switch off → no diary');
  const p = backupPayload({ family, journal }, { backup: true, journal: true });
  assert.deepEqual(p.journal.entries.map((e) => e.id), ['a']);
  assert.ok(!JSON.stringify(p).includes('secret') && !JSON.stringify(p).includes('mine only'));
  assert.deepEqual(shareableJournal(null).entries, []);
  // Default setting: the diary stays on the phone.
  assert.equal(BRIEF_DEFAULTS.journalBackup, false);
  // core.js passes the diary and its own switch to the policy.
  const core = fs.readFileSync(path.join(root, 'public/core.js'), 'utf8');
  assert.match(core, /journal: store\.get\('kj_journal', null\)/);
  assert.match(core, /journal: store\.get\('kj_daily', \{\}\)\.journalBackup === true/);
});

test('diary merge after sign-in: union by id, a delete on either side wins', () => {
  const e = (id, at) => ({ id, at, date: at.slice(0, 10), kind: 'good', note: id });
  const remote = { entries: [e('r1', '2026-10-01T00:00:00Z'), e('both', '2026-10-02T00:00:00Z')], deleted: ['gone'], days: ['2026-10-01'] };
  const local = { entries: [e('l1', '2026-10-03T00:00:00Z'), e('both', '2026-10-02T00:00:00Z'), e('gone', '2026-10-04T00:00:00Z')], deleted: [], days: ['2026-10-03'] };
  const m = J.mergeJournal(remote, local);
  assert.deepEqual(m.entries.map((x) => x.id), ['r1', 'both', 'l1']);
  assert.deepEqual(m.days, ['2026-10-01', '2026-10-03']);
});

// ---------------------------------------------------------------- caps and switches
test('"share Thunai?" prompt: only after a helpful mark, at most once in 30 days, never after "don’t ask again", off switch', () => {
  const now = new Date('2026-10-08T06:00:00Z');
  let j = J.emptyJournal();
  assert.equal(J.sharePromptDue(j, { now }), false, 'no helpful mark yet');
  j = J.addEntry(j, { kind: 'remedy', title: 'lamp' }, { now: new Date('2026-10-07T06:00:00Z') }).journal;
  assert.equal(J.sharePromptDue(j, { now }), false, 'a remedy alone is not a helpful mark');
  j = J.addEntry(j, { kind: 'helped', title: 'brief' }, { now: new Date('2026-10-07T07:00:00Z') }).journal;
  assert.equal(J.sharePromptDue(j, { now }), true);
  assert.equal(J.sharePromptDue(j, { now, enabled: false }), false, 'setting off');
  assert.equal(J.sharePromptDue(j, { now: new Date('2026-10-12T06:00:00Z') }), false, 'mark older than 3 days');
  const shown = J.promptShown(j, now);
  assert.equal(J.sharePromptDue(shown, { now: new Date('2026-10-20T06:00:00Z') }), false, 'within 30 days');
  const later = J.addEntry(shown, { kind: 'happened', title: 'x' }, { now: new Date('2026-11-08T05:00:00Z') }).journal;
  assert.equal(J.sharePromptDue(later, { now: new Date('2026-11-08T06:00:00Z') }), true, 'after 30 days, with a fresh mark');
  assert.equal(J.sharePromptDue(J.promptNever(later), { now: new Date('2026-11-08T06:00:00Z') }), false, 'never again');
  assert.equal(J.SHARE_PROMPT_GAP_DAYS, 30);
});

test('first-week welcome cards: one per day for 7 days, dismissible; milestones celebrated once', () => {
  let j = J.recordOpen(J.emptyJournal(), '2026-10-01');
  assert.equal(J.welcomeCard(j, '2026-10-01').day, 1);
  assert.equal(J.welcomeCard(j, '2026-10-02').go, 'chat');
  assert.equal(J.welcomeCard(j, '2026-10-08'), null, 'over after day 7');
  j = J.dismiss(j, 'welcome:2', '2026-10-02');
  assert.equal(J.welcomeCard(j, '2026-10-02'), null);
  for (let i = 1; i <= 7; i++) j = J.recordOpen(j, `2026-10-0${i}`);
  assert.equal(J.pendingMilestone(j, '2026-10-07').id, 'streak-7');
  j = J.markSeen(j, 'streak-7', '2026-10-07');
  assert.equal(J.pendingMilestone(j, '2026-10-07'), null);
  j = J.addEntry(j, { kind: 'good', note: 'first' }).journal;
  assert.equal(J.pendingMilestone(j, '2026-10-07').id, 'first-entry');
  assert.deepEqual(findProhibited([J.WELCOME, J.KINDS]), []);
});

test('settings: normalised, one switch turns every reminder, notification and prompt off', () => {
  assert.deepEqual(briefSettings({ notify: 'yes', morningTime: '25:00', junk: 1 }), { ...BRIEF_DEFAULTS });
  assert.equal(briefSettings({}).morningTime, '06:30');
  assert.equal(BRIEF_DEFAULTS.notify, false, 'notifications are opt-in');
  const off = allOff({ ...BRIEF_DEFAULTS, notify: true, sandhya: true });
  for (const k of ['notify', 'sandhya', 'weekly', 'monthly', 'welcome', 'milestones', 'sharePrompt', 'markButtons']) assert.equal(off[k], false, k);
  // Every setting has a switch on the one settings page, which is linked from Settings and from the brief.
  const src = fs.readFileSync(path.join(root, 'public/screens-journal.js'), 'utf8');
  for (const k of Object.keys(BRIEF_DEFAULTS).filter((x) => x !== 'morningTime')) assert.match(src, new RegExp(`row\\('${k}'`), `switch for ${k}`);
  assert.match(src, /id="dsTime"/);
  assert.match(src, /id="dsAllOff"/);
  assert.match(fs.readFileSync(path.join(root, 'public/account.js'), 'utf8'), /data-go="dailyset"/);
  // Notifications are planned only from the settings (brief-notify.js returns 'off' when both are off).
  assert.match(fs.readFileSync(path.join(root, 'public/brief-notify.js'), 'utf8'), /const wanted = s\.notify \|\| s\.sandhya;/);
});

// ---------------------------------------------------------------- share cards
const SPEC = {
  kind: 'today', lang: 'ta', brand: 'துணை · Thunai', tagline: 'தனிப்பட்ட ஜோதிடம் & ஆன்மீக வழிகாட்டல்', kicker: 'இன்றைய பலன் · 8 அக்டோபர் 2026', title: 'இன்று — சுரேஷ்',
  lines: brief(ADULT, '2026-10-08').lines.map((l) => l.text.ta), closing: 'இந்நாள் இனிதாகட்டும்.', invite: 'துணையில் இணையுங்கள் — அழைப்புக் குறியீடு ABC123 · https://example.com/thunai/?ref=ABC123',
};

test('share-card layout: 1080×1350 and 1080×1080, everything inside the card, footer and invite line present', () => {
  for (const size of ['portrait', 'square']) {
    const lay = layoutCard(SPEC, { size, measure: approxMeasure });
    assert.equal(lay.w, 1080); assert.equal(lay.h, SIZES[size].h);
    assert.equal(lay.overflow, false);
    const texts = lay.items.filter((i) => i.t === 'text');
    for (const t of texts) {
      if (t.maxW) continue; // single-line labels are ellipsised at paint time
      const w = approxMeasure(t.text, t.font);
      const x0 = t.align === 'right' ? t.x - w : t.x;
      assert.ok(x0 >= 0 && x0 + w <= lay.w - 40, `${size}: "${t.text}" runs off the card`);
      assert.ok(t.y > 0 && t.y < lay.h, `${size}: "${t.text}" outside the card`);
    }
    const footerTop = lay.items.find((i) => i.t === 'rule').y;
    for (const t of texts.filter((x) => x.role === 'body' || x.role === 'title')) assert.ok(t.y < footerTop, `${size}: body text under the footer`);
    assert.ok(texts.some((t) => t.role === 'footer' && /Thunai · துணை/.test(t.text)));
    assert.ok(texts.filter((t) => t.role === 'invite').map((t) => t.text).join(' ').includes('ABC123'));
    assert.ok(lay.items.some((i) => i.t === 'logo'));
  }
});

test('share-card layout: long text shrinks to fit; wrapping never breaks the card', () => {
  const long = { ...SPEC, lines: Array.from({ length: 6 }, () => SPEC.lines.join(' ')) };
  const lay = layoutCard(long, { size: 'square', measure: approxMeasure });
  assert.ok(lay.bodyPx < 40, 'font shrank');
  const lines = wrap('ஒரு மிக நீண்ட சொல்லில்லாதவரிகூடஉடைக்கப்படவேண்டியதுதான்ஏனெனில்அட்டைக்குள்இருக்கவேண்டும்', 300, '500 40px x', approxMeasure);
  assert.ok(lines.length > 1 && lines.every((l) => approxMeasure(l, '500 40px x') <= 300));
});

test('share cards never carry birth data or health content', () => {
  assert.throws(() => assertShareable({ ...SPEC, lines: ['Born on 1982-05-14 at Chennai'] }), /birth data/);
  assert.throws(() => assertShareable({ ...SPEC, lines: ['பிறந்த நேரம் 6:20'] }), /birth data/);
  assert.throws(() => assertShareable({ ...SPEC, lines: ['Check blood pressure and diabetes'] }), /health/);
  assert.doesNotThrow(() => assertShareable(SPEC));
  // Card builders in the app: the star-birthday card names the person and date only; the match card needs both
  // people's share consent in screens-couple.js before it is built.
  const src = fs.readFileSync(path.join(root, 'public/screens-journal.js'), 'utf8');
  assert.match(src, /starbdaySpec = \(name, iso\)/);
  const couple = fs.readFileSync(path.join(root, 'public/screens-couple.js'), 'utf8');
  assert.match(couple, /\$\('#mcCard'\)\.addEventListener\('click', \(\) => \{\n\s+if \(!consented\('share'\)\) return;/);
});

test('invite: reward is mentioned only when the server runs referrals; otherwise a plain link', () => {
  const src = fs.readFileSync(path.join(root, 'public/share-card.js'), 'utf8');
  assert.match(src, /if \(!info\?\.referral\) return '';/);
  assert.match(src, /api\('\/api\/referral'\)/);
  const growth = fs.readFileSync(path.join(root, 'server/growth.js'), 'utf8');
  assert.match(growth, /referrer_days/, 'server referrals exist (reward wording matches server/growth.js)');
});
