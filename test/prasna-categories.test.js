// Prasnam ("இப்போது செய்யலாமா?") — the full category set, grouped tiles, free-text intent detection,
// the default "Asking for" person, the minor banner and the richer answer summary.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CATEGORIES, PRASNA_CATEGORIES, PRASNA_GROUPS, URGENT_CATEGORIES, getCategory, scoreSnapshot, evaluatePrasna,
  detectPrasnaCategory, defaultAsker, askerBanner, prasnaSummary,
} from '../shared/prasna.js';
import { ageProfile, categoryAllowed, topicMinBand, ageGuardAnswer } from '../shared/age-guard.js';
import { panchang } from '../shared/astro.js';

const TODAY = '2026-10-06';
const loc = { lat: 13.0827, lon: 80.2707, tz: 5.5, name: 'Chennai' };
const NATURES = ['dhruva', 'chara', 'ugra', 'mishra', 'kshipra', 'mridu', 'tikshna'];
const LORDS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
const NEW_IDS = ['jewellery', 'clothes', 'electronics', 'pet_cattle', 'rent_agreement', 'house_move', 'land_buy', 'property_sell',
  'kitchen_start', 'borewell', 'interview', 'job_join', 'salary_talk', 'partnership', 'course_start', 'money_transfer', 'investment',
  'bank_account', 'loan_sign', 'marriage_talk', 'engagement', 'seemantham', 'mudi_kaanikkai', 'passport_apply', 'police_complaint',
  'medicine_start', 'temple_visit', 'vratham', 'general'];
const OLD_IDS = ['surgery', 'cheque', 'meeting', 'client', 'bride_groom', 'court', 'office', 'contract', 'travel', 'property', 'business',
  'gold_vehicle', 'loan', 'education', 'launch', 'tech_partner', 'job_change', 'visa', 'bhoomi_pooja', 'lend_money', 'competition'];

test('every Prasnam category is valid: rules, Tamil / English names, icon, group and an age-band entry', () => {
  const ids = PRASNA_CATEGORIES.map((c) => c.id);
  for (const id of [...NEW_IDS, ...OLD_IDS, 'ear_piercing']) assert.ok(ids.includes(id), `missing ${id}`);
  assert.ok(PRASNA_CATEGORIES.length >= 50);
  assert.equal(new Set(CATEGORIES.map((c) => c.id)).size, CATEGORIES.length, 'ids are unique');
  for (const c of PRASNA_CATEGORIES) {
    assert.ok(c.icon && c.en && c.ta && /[஀-௿]/.test(c.ta), c.id);
    for (const k of ['goodHora', 'badHora']) for (const l of c[k]) assert.ok(LORDS.includes(l), `${c.id}.${k}: ${l}`);
    for (const k of ['goodNak', 'badNak']) for (const n of c[k]) assert.ok(NATURES.includes(n), `${c.id}.${k}: ${n}`);
    for (const k of ['goodDays', 'badDays']) for (const d of c[k]) assert.ok(d >= 0 && d <= 6, `${c.id}.${k}`);
    assert.ok(c.goodHora.length >= 2 && (c.goodNak.length || c.goodStars), c.id);
    assert.ok(!c.goodHora.some((l) => c.badHora.includes(l)) && !c.goodDays.some((d) => c.badDays.includes(d)), `${c.id}: good / bad overlap`);
    assert.ok(PRASNA_GROUPS.some((g) => g.id === c.group && g.ids.includes(c.id)), `${c.id}: group`);
    assert.ok(topicMinBand(c.id), `${c.id}: age-guard table`);
  }
  for (const g of PRASNA_GROUPS) assert.ok(g.icon && g.en && g.ta && g.ids.length, g.id);
  // Scoring works for every category at a fixed moment.
  const snap = panchang(new Date('2026-10-06T05:00:00Z'), loc.lat, loc.lon, loc.tz);
  for (const c of PRASNA_CATEGORIES) {
    const r = scoreSnapshot(snap, c.id, { janmaNakshatra: 3, janmaRasi: 1 });
    assert.ok(r.score >= 0 && r.score <= 100 && ['DO', 'CAUTION', 'AVOID'].includes(r.verdict), c.id);
  }
});

test('urgent medical, legal and payment categories stay deadline-first', () => {
  for (const id of ['surgery', 'medicine_start', 'court', 'police_complaint', 'cheque', 'money_transfer', 'loan_sign', 'contract', 'interview']) {
    assert.ok(URGENT_CATEGORIES.has(id) && getCategory(id).practicalFirst, id);
  }
  const snap = panchang(new Date('2026-09-28T06:00:00Z'), loc.lat, loc.lon, loc.tz);
  const worst = { ...snap, inRahuKalam: true, inYamagandam: true, inGuligai: true };
  const birth = { janmaNakshatra: (snap.nakshatra.index + 27 - 6) % 27, janmaRasi: (snap.moonRasi.index - 7 + 12) % 12 };
  for (const id of ['medicine_start', 'police_complaint', 'money_transfer']) {
    const r = scoreSnapshot(worst, id, birth);
    assert.notEqual(r.verdict, 'AVOID', id);
    assert.ok(r.deadlineNote.en && r.deadlineNote.ta, id);
  }
  assert.match(scoreSnapshot(worst, 'police_complaint', birth).deadlineNote.en, /112/);
});

test('free-text intent: Tamil, Tanglish and English questions pick the right tile', () => {
  const cases = {
    'Nagai vangalama': 'jewellery', 'nagai': 'jewellery', 'gold vaanga': 'jewellery', 'தங்கம் வாங்கலாமா': 'jewellery',
    'நகை வாங்கலாமா இன்று?': 'jewellery', 'Can I buy a gold chain today?': 'jewellery',
    'vandi vangalama': 'gold_vehicle', 'new bike vaanga nalla neram?': 'gold_vehicle', 'கார் வாங்கலாமா': 'gold_vehicle',
    'veedu maaralama': 'house_move', 'வீடு மாறலாமா': 'house_move', 'Is it good to shift house today?': 'house_move',
    'interview pogalama': 'interview', 'நேர்காணலுக்குப் போகலாமா': 'interview',
    'kadan kudukalama': 'lend_money', 'கடன் கொடுக்கலாமா': 'lend_money',
    'operation pannalama': 'surgery', 'அறுவை சிகிச்சை செய்யலாமா': 'surgery',
    'discharge aagalama': 'medicine_start', 'pattu pudavai vaangalama': 'clothes', 'புடவை வாங்கலாமா': 'clothes',
    'new mobile vangalama': 'electronics', 'rent agreement sign pannalama': 'rent_agreement', 'வாடகை ஒப்பந்தம்': 'rent_agreement',
    'Can I join the new job today?': 'job_join', 'salary hike pathi pesalama': 'salary_talk', 'course join pannalama': 'course_start',
    'send money abroad today?': 'money_transfer', 'share market la invest pannalama': 'investment', 'gold savings scheme join pannalama': 'investment',
    'nilam vangalama': 'land_buy', 'veedu vikkalama': 'property_sell', 'partnership pesalama': 'partnership',
    'ponnu paarka pogalama': 'bride_groom', 'பெண் பார்க்கப் போகலாமா': 'bride_groom', 'varan pesalama': 'marriage_talk',
    'nichayathartham vaikkalama': 'engagement', 'valaikappu vaikkalama': 'seemantham', 'mottai podalama': 'mudi_kaanikkai',
    'kaadhu kuthalama': 'ear_piercing', 'kovil pogalama': 'temple_visit', 'திருப்பதி யாத்திரை தொடங்கலாமா': 'temple_visit',
    'viratham irukkalama': 'vratham', 'police complaint kudukalama': 'police_complaint', 'kinaru thondalama': 'borewell',
    'aduppu vaikkalama': 'kitchen_start', 'bank account open pannalama': 'bank_account', 'home loan sign pannalama': 'loan_sign',
    'passport apply pannalama': 'passport_apply', 'maadu vangalama': 'pet_cattle', 'court case file pannalama': 'court',
    'exam ezhuthalama': 'education', 'Chennai payanam pogalama': 'travel',
  };
  assert.ok(Object.keys(cases).length >= 30);
  for (const [q, want] of Object.entries(cases)) assert.equal(detectPrasnaCategory(q), want, q);
  // Look-alike words do not trigger the wrong tile.
  assert.notEqual(detectPrasnaCategory('payanam pogalama'), 'money_transfer');
  assert.notEqual(detectPrasnaCategory('மனைவியுடன் கோவில் செல்லலாமா'), 'land_buy');
  assert.notEqual(detectPrasnaCategory('first day at school'), 'police_complaint');
  assert.equal(detectPrasnaCategory(''), null);
  assert.equal(detectPrasnaCategory('hmm sari ah?'), 'clothes'); // "sari" is a saree in Tanglish too
  assert.equal(detectPrasnaCategory('xyz qwerty'), null); // → the screen uses 'general' and says so
  assert.ok(getCategory('general'));
});

test('default "Asking for" is the user themself, else the first adult', () => {
  const prof = (m) => ageProfile(m, { today: TODAY });
  const son = { id: 's', name: 'Kavin', relation: 'son', date: '2020-03-12' };
  const me = { id: 'me', name: 'Suresh', relation: 'self', date: '1986-04-10' };
  const wife = { id: 'w', name: 'Priya', relation: 'spouse', date: '1989-01-20' };
  assert.equal(defaultAsker([son, wife, me], prof).id, 'me');
  assert.equal(defaultAsker([son, wife], prof).id, 'w');
  assert.equal(defaultAsker([son], prof).id, 's');
  assert.equal(defaultAsker([], prof), null);
});

test('a minor selected for Prasnam gets a clear banner and only age-appropriate tiles', () => {
  const six = ageProfile('2020-03-12', { today: TODAY });
  const adult = ageProfile('1986-04-10', { today: TODAY });
  assert.equal(askerBanner(six, { en: 'Son', ta: 'மகன்' }, 'ta'), 'மகன் (6 வயது) — இந்த வயதுக்கு ஏற்றவை மட்டும் காட்டப்படுகின்றன · மாற்ற தட்டவும்');
  assert.match(askerBanner(six, { en: 'Son', ta: 'மகன்' }, 'en'), /^Son \(age 6\) — .*tap to change$/);
  assert.equal(askerBanner(adult, { en: 'Self', ta: 'நான்' }), null);
  assert.match(askerBanner(ageProfile(null), { en: 'Son', ta: 'மகன்' }, 'ta'), /பிறந்த தேதி இல்லை/);
  const kidCats = PRASNA_CATEGORIES.filter((c) => categoryAllowed(c.id, six)).map((c) => c.id);
  for (const ok of ['education', 'course_start', 'competition', 'surgery', 'medicine_start', 'travel', 'temple_visit', 'mudi_kaanikkai', 'ear_piercing', 'general']) assert.ok(kidCats.includes(ok), ok);
  for (const bad of ['jewellery', 'interview', 'job_join', 'investment', 'loan_sign', 'marriage_talk', 'engagement', 'seemantham', 'police_complaint', 'house_move', 'land_buy', 'vratham', 'passport_apply']) assert.ok(!kidCats.includes(bad), bad);
  // Adults see every category.
  assert.equal(PRASNA_CATEGORIES.filter((c) => categoryAllowed(c.id, adult)).length, PRASNA_CATEGORIES.length);
  // A typed adult question for a child gets the warm age-guard reply, named after the tile.
  const a = ageGuardAnswer({ topic: 'jewellery', profile: six, lang: 'ta', name: 'Kavin', label: getCategory('jewellery') });
  assert.equal(a.intent, 'age_guard');
  assert.equal(a.meter, null);
});

test('the answer summary: top 3 reasons, a practical step and a free parigaram when not a clear go', () => {
  const r = evaluatePrasna({ at: new Date('2026-10-06T05:00:00Z'), category: 'jewellery', loc, birth: { janmaNakshatra: 3, janmaRasi: 1 } });
  const s = prasnaSummary(r, 'jewellery');
  assert.ok(s.reasons.length >= 1 && s.reasons.length <= 3);
  for (const x of s.reasons) assert.ok(x.en && x.ta);
  assert.match(s.doNow.en, /hallmark/i);
  assert.ok(s.doNow.ta);
  const caution = prasnaSummary({ verdict: 'CAUTION', factors: r.factors }, 'jewellery');
  assert.ok(caution.parigaram && /lamp/i.test(caution.parigaram.en) && caution.parigaram.ta);
  assert.doesNotMatch(caution.parigaram.en, /pay|₹|fee|buy/i);
  assert.equal(prasnaSummary({ verdict: 'DO', factors: r.factors }, 'jewellery').parigaram, null);
  // Cautions lead a "take care" verdict; supportive reasons lead a "go".
  const fs = [{ label: 'a', labelTa: 'அ', points: 15 }, { label: 'b', labelTa: 'ஆ', points: -25 }, { label: 'c', labelTa: 'இ', points: 4 }];
  assert.equal(prasnaSummary({ verdict: 'AVOID', factors: fs }, 'general').reasons[0].points, -25);
  assert.equal(prasnaSummary({ verdict: 'DO', factors: fs }, 'general').reasons[0].points, 15);
  for (const c of PRASNA_CATEGORIES) {
    const x = prasnaSummary({ verdict: 'CAUTION', factors: fs }, c.id);
    assert.ok(x.doNow.en && x.doNow.ta && x.parigaram.en && x.parigaram.ta, c.id);
  }
});
