// Detail-audit fixes (F2): shared panchangam card, support / grievance contacts, family-form place picking and
// in-app validation, Facebook button only when configured, web back button, admin token never stored.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { panchangamSpec, panchangamFilename, mergeSlots, layoutCard, approxMeasure, assertShareable } from '../shared/share-card-layout.js';
import { SUPPORT_EMAIL, GRIEVANCE, supportContact, grievanceContact, APP_URL } from '../shared/brand.js';
import { resolveTypedPlace, placeText } from '../shared/places.js';
import { initialOf } from '../shared/relations.js';
import { installWebHistory } from '../public/web-history.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

// ---------------------------------------------------------------- #2 panchangam share card
const T = (h, m) => new Date(Date.UTC(2026, 9, 7, h - 4, m)); // Dubai wall clock (UTC+4)
const DAY = {
  date: '2026-10-07', tz: 4, place: 'துபாய்', weekday: 3,
  tamil: { day: 21, monthTa: 'புரட்டாசி', monthEn: 'Purattasi', year: { ta: 'விசுவாவசு', en: 'Visvavasu' } },
  festivals: [],
  star: { ta: 'சதயம்', en: 'Sathayam', endsAt: T(10, 38) },
  tithi: { ta: 'வளர்பிறை திரயோதசி', en: 'Shukla Trayodasi', endsAt: T(14, 5) },
  yoga: { ta: 'கண்டம்', en: 'Ganda' },
  sunrise: T(6, 13), sunset: T(18, 2),
  rahu: { start: T(12, 6), end: T(13, 34) }, yama: { start: T(7, 41), end: T(9, 9) }, guli: { start: T(10, 38), end: T(12, 6) },
  good: [{ start: T(6, 13), end: T(7, 41) }, { start: T(7, 41), end: T(9, 9) }, { start: T(9, 9), end: T(10, 38) }, { start: T(15, 2), end: T(16, 30) }],
  chandrashtamam: { ta: 'கடகம்', en: 'Kadagam' },
};

test('panchangam card: back-to-back good-time slots merge into one range', () => {
  const m = mergeSlots(DAY.good);
  assert.equal(m.length, 2);
  assert.equal(+m[0].start, +T(6, 13));
  assert.equal(+m[0].end, +T(10, 38));
});

test('panchangam card: Tamil mode is all Tamil, Thunai brand, merged good time, "… வரை" after the time', () => {
  const s = panchangamSpec(DAY, 'ta');
  assert.equal(s.kind, 'panchangam');
  assert.equal(s.lang, 'ta');
  assert.equal(s.tagline, 'தினசரி பஞ்சாங்கம்');
  assert.match(s.brand, /துணை/);
  const all = [s.kicker, s.title, s.subtitle, s.tagline, ...s.lines].join('\n');
  assert.doesNotMatch(all, /kaippesi|Daily Panchangam|AM|PM/i);
  assert.ok(s.lines.includes('நல்ல நேரம்: காலை 6:13 – 10:38, மதியம் 3:02 – மாலை 4:30'), s.lines.join(' | '));
  assert.ok(s.lines.some((l) => l === 'நட்சத்திரம்: சதயம் — காலை 10:38 வரை'));
  assert.equal(s.title, 'புரட்டாசி 21, புதன்கிழமை');
  assert.match(s.kicker, /^7 அக்டோபர் 2026 · துபாய்$/);
  assert.doesNotThrow(() => assertShareable(s));
  assert.equal(panchangamFilename(DAY.date), 'thunai-2026-10-07.png');
});

test('panchangam card: English mode in English; footer never overlaps the rows (both sizes)', () => {
  const s = panchangamSpec({ ...DAY, festivals: [{ ta: 'பிரதோஷம்', en: 'Pradosham' }] }, 'en');
  assert.equal(s.tagline, 'Daily Panchangam');
  assert.ok(s.lines.includes('Good time: 6:13 – 10:38 AM, 3:02 – 4:30 PM'), s.lines.join(' | '));
  assert.ok(s.lines.some((l) => l === 'Star: Sathayam — till 10:38 AM'));
  for (const size of ['portrait', 'square']) {
    const lay = layoutCard({ ...s, invite: 'Made with the Thunai app' }, { size, measure: approxMeasure });
    assert.equal(lay.overflow, false, size);
    const footer = lay.items.find((i) => i.t === 'rule').y;
    const body = lay.items.filter((i) => i.t === 'text' && (i.role === 'body' || i.role === 'title'));
    assert.ok(body.length >= s.lines.length);
    for (const t of body) assert.ok(t.y < footer, `${size}: "${t.text}" runs into the footer`);
    assert.ok(lay.items.some((i) => i.role === 'footer' && i.text === 'Thunai · துணை'));
  }
});

test('the shared panchangam image uses the share-card design, the Thunai name and thunai-YYYY-MM-DD.png', () => {
  const src = read('public/screens-tools.js');
  assert.doesNotMatch(src, /kaippesi/i);
  assert.match(src, /panchangamSpec\(/);
  assert.match(src, /openShareCard\(spec, \{ filename: panchangamFilename\(td\.date\) \}\)/);
});

// ---------------------------------------------------------------- #3 support & grievance contacts
test('support e-mail: one constant, empty until launch, honest fallback text, no placeholder domains', () => {
  assert.equal(SUPPORT_EMAIL, '');
  assert.equal(APP_URL, '');
  assert.deepEqual({ ...GRIEVANCE }, { name: '', email: '', phone: '' });
  assert.equal(supportContact('en'), 'Support contact will be published at launch');
  assert.match(supportContact('ta'), /வெளியீட்டின்போது அறிவிக்கப்படும்/);
  assert.match(grievanceContact('en'), /published at launch/);
  for (const f of ['shared/brand.js', 'public/legal.js', 'public/growth.js', 'public/screens-trust.js', 'public/share-card.js']) {
    assert.doesNotMatch(read(f), /example\.com|kaippesi\.app|support@/, f);
  }
  assert.match(read('public/legal.js'), /supportContact\('en'\)/);
  assert.match(read('public/legal.js'), /grievanceContact\('ta'\)/);
});

// ---------------------------------------------------------------- #9 family form
test('a typed but unpicked birth place resolves to the one clear match, else asks', () => {
  assert.equal(placeText(resolveTypedPlace('Chennai', { preferCc: 'IN' })), 'Chennai');
  assert.equal(placeText(resolveTypedPlace('சென்னை')), 'Chennai');
  assert.equal(placeText(resolveTypedPlace('jaffna')), 'Jaffna, Sri Lanka');
  assert.equal(resolveTypedPlace('London'), null, 'several Londons: the person must pick');
  assert.equal(resolveTypedPlace('qqqzzz'), null);
});

test('family form: no browser validation bubbles — novalidate, hidden coordinates not required, own messages', () => {
  const src = read('public/account.js');
  assert.match(src, /<form id="memberForm" autocomplete="off" novalidate>/);
  assert.doesNotMatch(src, /name="(lat|lon|tz)" type="number"[^>]*required/);
  assert.match(src, /export function checkMemberForm\(f, usePlace\)/);
  assert.match(src, /resolveTypedPlace\(typed/);
  assert.match(src, /showFormErr\(f, bad\.field, bad\.msg\)/);
  for (const f of ['public/account.js', 'public/growth.js', 'public/screens-tools.js', 'public/screens-journal.js', 'public/screens-week.js', 'public/screens-kattam.js', 'public/screens-journey.js']) {
    for (const m of read(f).matchAll(/<form\b[^>]*>/g)) assert.match(m[0], /novalidate/, `${f}: ${m[0]}`);
  }
});

// ---------------------------------------------------------------- #10 Facebook
test('login: the Facebook button and its developer note appear only when Facebook is configured', () => {
  const src = read('public/account.js');
  assert.doesNotMatch(src, /Facebook App ID|aria-disabled="true"/);
  assert.match(src, /\$\{fbOk \? `<button class="login-btn fb" id="fbBtn">/);
});

// ---------------------------------------------------------------- avatar initials
test('avatar initial is the first whole Tamil letter', () => {
  assert.equal(initialOf('ராஜா'), 'ரா');
  assert.equal(initialOf('ஸ்ரீதர்'), 'ஸ்ரீ');
  assert.equal(initialOf('suresh'), 'S');
  assert.equal(initialOf(''), '');
});

// ---------------------------------------------------------------- web / PWA back button
function fakeBrowser() {
  const entries = [{ state: null }];
  let i = 0;
  const listeners = { win: {}, doc: {} };
  const on = (bag) => (t, f, cap) => { (bag[t] ||= []).push({ f, cap }); };
  const off = (bag) => (t, f) => { bag[t] = (bag[t] || []).filter((x) => x.f !== f); };
  const win = {
    scrollY: 0,
    history: {
      get state() { return entries[i].state; },
      pushState(s) { entries.splice(i + 1); entries.push({ state: s }); i += 1; },
      replaceState(s) { entries[i] = { state: s }; },
      back() { if (i > 0) { i -= 1; fire('popstate', { state: entries[i].state }); } },
      forward() { if (i < entries.length - 1) { i += 1; fire('popstate', { state: entries[i].state }); } },
    },
    addEventListener: on(listeners.win), removeEventListener: off(listeners.win),
    scrollTo({ top }) { win.scrollY = top; },
    setTimeout: (f) => f(), requestAnimationFrame: (f) => f(),
  };
  const fire = (t, e) => (listeners.win[t] || []).forEach((x) => x.f(e));
  win.fire = fire;
  const doc = {
    modal: null,
    querySelector: (s) => (s === '.modal' ? doc.modal : null),
    addEventListener: on(listeners.doc), removeEventListener: off(listeners.doc),
    dispatch(t, e) { for (const x of [...(listeners.doc[t] || [])].sort((a, b) => Number(!!b.cap) - Number(!!a.cap))) { if (e.stopped) break; x.f(e); } },
  };
  return { win, doc, entries: () => entries, index: () => i };
}
function fakeApp(b) {
  const app = { view: null, params: {}, stack: [] };
  app.go = (view, params = {}, opts = {}) => {
    if (!opts.back && app.view && app.view !== view) app.stack.push({ view: app.view, params: app.params });
    app.view = view; app.params = params;
    b.doc.dispatch('kj:screen', { detail: view });
  };
  app.goBack = (fallback = 'home') => { const last = app.stack.pop(); app.go(last ? last.view : fallback, last ? last.params : {}, { back: true }); return true; };
  return app;
}

test('web back button: browser back walks the app screens, restores scroll, and the ‹ button uses the same history', () => {
  const b = fakeBrowser();
  const app = fakeApp(b);
  const h = installWebHistory({ win: b.win, doc: b.doc, go: app.go, goBack: app.goBack, current: () => ({ view: app.view, params: app.params }) });
  assert.ok(h);
  app.go('home');
  assert.equal(b.entries().length, 1, 'the first screen replaces the start entry');
  app.go('festivals');
  b.win.scrollY = 640; // scrolled down the festival list
  b.win.fire('scroll', {});
  app.go('calendar', { month: 3 });
  assert.equal(h.depth(), 2);
  b.win.history.back();
  assert.equal(app.view, 'festivals');
  assert.equal(b.win.scrollY, 640, 'scroll position restored');
  b.win.history.forward();
  assert.equal(app.view, 'calendar');
  assert.deepEqual(app.params, { month: 3 });
  // The in-app ‹ button goes through browser history (so browser back afterwards does not jump forward again).
  const e = { target: { closest: (s) => (s === '[data-back]' ? {} : null) }, stopPropagation() { e.stopped = true; }, preventDefault() {} };
  b.doc.dispatch('click', e);
  assert.ok(e.stopped);
  assert.equal(app.view, 'festivals');
  b.win.history.back();
  assert.equal(app.view, 'home');
  assert.equal(h.depth(), 0);
  // At Today the browser back leaves the app: no entry is left before it.
  assert.equal(b.index(), 0);
  // Re-drawing the same screen (language change, live tick) never adds entries.
  app.go('home'); app.go('home');
  assert.equal(h.depth(), 0);
  h.uninstall();
});

test('web back button: an open dialog closes first; the installed app keeps its own back key', () => {
  const b = fakeBrowser();
  const app = fakeApp(b);
  installWebHistory({ win: b.win, doc: b.doc, go: app.go, goBack: app.goBack, current: () => ({ view: app.view, params: app.params }) });
  app.go('home'); app.go('calendar');
  let removed = false;
  b.doc.modal = { remove() { removed = true; b.doc.modal = null; } };
  b.win.history.back();
  assert.ok(removed);
  assert.equal(app.view, 'calendar');
  b.win.history.back();
  assert.equal(app.view, 'home');
  const native = fakeBrowser();
  native.win.Capacitor = { isNativePlatform: () => true };
  assert.equal(installWebHistory({ win: native.win, doc: native.doc, go() {}, goBack() {}, current: () => ({}) }), null);
  assert.match(read('public/app.js'), /installWebHistory\(\{ win: window, doc: document, go, goBack/);
});

// ---------------------------------------------------------------- admin token
test('the admin token is held in memory only — never stored, never read back from storage', () => {
  const g = read('public/growth.js');
  assert.match(g, /let adminToken = '';/);
  assert.match(g, /localStorage\.removeItem\('kj_admin'\)/);
  assert.doesNotMatch(g, /store\.(get|set)\('kj_admin'/);
  assert.match(g, /'x-admin-token': adminToken/);
  assert.match(g, /id="admTok" value=""/);
  assert.match(g, /adminToken = \$\('#admTok'\)\.value\.trim\(\); \$\('#admTok'\)\.value = '';/);
  assert.doesNotMatch(read('public/account.js'), /kj_admin'/);
});
