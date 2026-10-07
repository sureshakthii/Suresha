// Common-man evaluation harness for Ask Thunai (துணையிடம் கேளுங்கள்).
// Runs every question in test/fixtures/common-questions.json (Tamil script, Tanglish, English) through the REAL
// on-device answer path (public/ask-thunai.js askThunai — the same function the chat screen calls) for four
// profiles — an adult with an exact birth time, a 10-year-old child, a 69-year-old elder and an adult whose birth
// time is unknown — and through the server policy router with no API key. It checks that:
//   • the topic is detected (Tamil / Tanglish / English spellings),
//   • the answer addresses the actual question (houses, karaka planets, supportive periods with years for "when"),
//   • the answer has a practical step, a simple remedy suited to the person's faith and a gentle follow-up question,
//   • it is age-appropriate (children never get marriage / job / money timing),
//   • nothing prohibited is said (shared/themes.js findProhibited + server scanProhibited), no certainty claims,
//   • self-harm, abuse and missing-person questions route to help first, and no lifespan / disease prediction.
// COMMON_Q_REPORT=1 prints the pass rate and failures instead of failing (used to measure before / after).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { birthChart, PLANETS } from '../shared/astro.js';
import { birthArgs, timeReliability } from '../shared/birthtime.js';
import { chartFacts } from '../shared/guidance.js';
import { ageProfile } from '../shared/age-guard.js';
import { findProhibited } from '../shared/themes.js';
import { scanProhibited, PROHIBITED_PATTERNS } from '../server/policy/answer-validator.js';
import { evaluatePolicy, templateAnswer } from '../server/policy/index.js';
import { runTask } from '../server/ai.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const corpus = JSON.parse(fs.readFileSync(path.join(root, 'test/fixtures/common-questions.json'), 'utf8'));
const REPORT = process.env.COMMON_Q_REPORT === '1';

// public/ask-thunai.js imports './shared/…' (the built app layout), so load it from a temp copy.
let askPath = process.env.COMMON_Q_ASK;
if (!askPath) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'thunai-common-'));
  fs.copyFileSync(path.join(root, 'public/ask-thunai.js'), path.join(dir, 'ask-thunai.js'));
  fs.symlinkSync(path.join(root, 'shared'), path.join(dir, 'shared'), 'dir');
  fs.writeFileSync(path.join(dir, 'package.json'), '{"type":"module"}');
  askPath = path.join(dir, 'ask-thunai.js');
}
const ask = await import(pathToFileURL(askPath).href);

const NOW = new Date('2026-10-07T06:00:00Z');
const LOC = { lat: 13.0827, lon: 80.2707, tz: 5.5 };
const MEMBERS = {
  adult: { id: 'a', name: 'Priya', relation: 'self', date: '1992-03-10', time: '09:15:00', gender: 'female', ...LOC },
  child: { id: 'c', name: 'Arun', relation: 'son', date: '2016-06-20', time: '07:40:00', gender: 'male', ...LOC },
  elder: { id: 'e', name: 'Raman', relation: 'self', date: '1957-08-02', time: '05:50:00', gender: 'male', maritalStatus: 'married', children: 2, firstChildYear: 1986, ...LOC },
  unknown: { id: 'u', name: 'Karthik', relation: 'self', date: '1990-11-25', time: '12:00:00', timeCertainty: 'unknown', gender: 'male', ...LOC },
};
const PROFILES = Object.fromEntries(Object.entries(MEMBERS).map(([k, m]) => {
  const chart = birthChart(birthArgs(m));
  const rel = timeReliability(m);
  return [k, { key: k, m, chart, rel, facts: chartFacts(chart, rel, NOW), prof: ageProfile(m, { now: NOW }) }];
}));
const TODAY = { rahuKalam: '10:30 AM – 12:00 PM', yamagandam: '3:00 PM – 4:30 PM', goodTimes: ['9:15 AM (Labam)'], horai: 'Jupiter', chandrashtamam: false };

const MINOR_BANDS = new Set(['0-5', '6-12', '13-17']);
/** Which profiles a row is "asked by" (full content checks); every profile still gets the universal checks. */
const primaryFor = (row) => (row.band === '60+' ? ['elder'] : MINOR_BANDS.has(row.band) ? ['child'] : ['adult', 'unknown']);

// The topic an answer reports (askThunai sets `topic`; shared-engine intents are mapped to the same names).
const INTENT_TOPIC = {
  dates: 'muhurtham', weak: 'remedy', kuladeivam: 'kuladeivam', marriage_when: 'marriage', child_when: 'child', pregnancy: 'child',
  legal: 'court', visa: 'travel', finance: 'money', goodtime: 'muhurtham', greeting: 'general', chart: 'general', dasa: 'general',
};
const topicOf = (a) => a.topic || a.ageGuard?.topic || INTENT_TOPIC[a.intent] || a.intent;

// ------------------------------------------------------------------ text helpers
const body = (a) => (a.sections || []).filter((s) => s.key !== 'question').flatMap((s) => s.lines || []).join('\n');
const all = (a) => [body(a), ...(a.followups || [])].join('\n');
const sec = (a, ...keys) => (a.sections || []).filter((s) => keys.includes(s.key)).flatMap((s) => s.lines || []).join('\n');
const has = (re) => (a) => re.test(body(a));
const ordEn = (n) => `${n}${n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'}`;
const YEAR = /\b(19|20)\d{2}\b/;
const HINDU = /murugan|shiva|siva\b|vinayag|ganapath|ganesh|lakshmi|durga|saraswath|hanuman|anjaneya|perumal|vishnu|dakshinamurth|ardhanaree|amman\b|kula deivam|navagraha temple|mantra|\bom\b|pooja|puja|homam|abhishek|sloka|stotra|kavasam|parigaram|pariharam|முருக|சிவ|விநாயக|கணபதி|லட்சுமி|துர்க|சரஸ்வதி|ஆஞ்சநேய|அனுமன்|பெருமாள்|விஷ்ணு|தட்சிணாமூர்த்தி|அம்மன்|குலதெய்வ|மந்திர|ஓம்|பூஜை|ஹோமம்|அபிஷேக|ஸ்லோக|ஸ்தோத்திர|கவசம்|பரிகாரம்|கோவில்|சன்னதி/i;
const ADULT_TOPICS = new Set(['marriage', 'second_marriage', 'harmony', 'love', 'child', 'job', 'job_change', 'career', 'business', 'money', 'loan', 'property', 'vehicle', 'court', 'travel']);

// Prohibited classes that apply to every adult answer (marriage timing is the point of an adult marriage question).
const ADULT_CLASSES = Object.keys(PROHIBITED_PATTERNS).filter((c) => !['sexual_content', 'marriage_scheduling', 'romantic_forecast', 'adult_relationship_coaching'].includes(c));
const MINOR_CLASSES = Object.keys(PROHIBITED_PATTERNS).filter((c) => c !== 'adult_relationship_coaching');
const proh = (a, cls) => scanProhibited(all(a), cls);

// ------------------------------------------------------------------ MUST / MUST NOT tags
const CHECKS = {
  timing: (a) => YEAR.test(body(a)),
  doctor: has(/doctor|gynaec|fertility|physician|hospital|medical|மருத்துவ/i),
  lawyer: has(/lawyer|advocate|legal (aid|advice)|வழக்கறிஞர/i),
  police: has(/police|\b100\b|\b112\b|காவல்/i),
  helpline: has(/14416|\b181\b|1098|\b112\b/),
  followup: (a) => (a.sections || []).some((s) => s.key !== 'question' && (s.lines || []).some((l) => /\?\s*$/.test(l.trim()))),
  remedy: (a) => Boolean(sec(a, 'remedy', 'practice', 'prayer').trim()),
  practical: (a) => Boolean(sec(a, 'dos', 'next', 'practical', 'answer').trim()),
  empathy: has(/understand|common|not a verdict|many (families|people|couples)|not alone|do not lose heart|delay is|புரிகிறது|இயல்பு|பலருக்கு|மனம் தளர|தாமதம் என்பது|கவலைப்பட வேண்டாம்|தனியாக இல்லை/i),
  official_source: has(/embassy|VFS|official|consulate|அதிகாரப்பூர்வ|தூதரக/i),
  deadline_first: has(/practical first|deadline|never (miss|delay|skip)|on time|நடைமுறை முதலில்|காலக்கெடு|தவறவிடாதீர்கள்|தாமதப்படுத்தாதீர்கள்|தள்ளிப்போடாதீர்கள்/i),
  decline_sex: has(/boy or (a )?girl|sex of the baby|gender of the baby|ஆணா பெண்ணா|பாலினம்/i),
  decline_lifespan: has(/do not predict|does not predict|cannot predict|கணிப்பதில்லை|கணிக்காது|கணிக்க முடியாது/i),
  decline_disease: has(/cannot tell whether|does not decide your health|not a diagnosis|தீர்மானிப்பதில்லை|சொல்ல முடியாது|நோய் கணிப்ப/i),
  kind: has(/sorry|glad you told|thank you for telling|you matter|I hear you|understand|வருந்துகிறேன்|நன்றி|முக்கியமானவர்|புரிகிறது/i),
  not_your_fault: has(/not your fault|உங்கள் தவறு அல்ல/i),
  urgent_first: (a) => /police|\b100\b|\b112\b|காவல்/i.test((a.sections || []).find((s) => s.key !== 'question')?.lines?.join(' ') || ''),
  saturn_status: has(/sade sati|ezharai|ashtama|saturn|ஏழரை|அஷ்டம|சனி/i),
  dosham_explained: (a) => /dosh|dosa|தோஷ/i.test(body(a)) && /mars|rahu|ketu|house|செவ்வாய்|ராகு|கேது|வீடு|இடம்/i.test(body(a)),
  no_fear: has(/not a curse|no need to fear|not a reason to fear|common in many|not dangerous|பயப்பட வேண்டாம்|சாபம் அல்ல|அச்சம் தேவையில்லை|பலருக்கும் உண்டு/i),
  name_letters: has(/letter|syllable|எழுத்து/i),
  muhurtham_action: (a) => (a.actions || []).some((x) => x.go === 'muhurtham') || /muhurtham|முகூர்த்த/i.test(body(a)),
  free_remedy: has(/free|no costly|not needed|not necessary|not required|இலவச|தேவையில்லை|கட்டாயமில்லை|கட்டாயம் அல்ல/i),
  subject_chart: has(/own (horoscope|chart)|their chart|his chart|her chart|அவருடைய ஜாதக|அவரது ஜாதக|அவர்களின் ஜாதக|அவளுடைய ஜாதக|அவனுடைய ஜாதக|சொந்த ஜாதக/i),
  no_accusation: (a) => !proh(a, ['accusation']).length && !findProhibited(a).some((h) => /infidelity|theft/.test(h.id)),
  deaddiction: has(/de-?addiction|counsel|14416|ஆலோசக|போதை மீட்பு/i),
  age_gate: (a) => ['age_guard', 'policy'].includes(a.intent) || Boolean(a.ageGuarded || a.policy || a.ageGuard),
};
const house = (n) => (a) => new RegExp(`\\b${ordEn(n)}\\b|\\bhouse ${n}\\b|(^|[^\\d])${n}-ம்|(^|[^\\d])${n}-ஆம்|(^|[^\\d])${n}-ல்`, 'i').test(body(a));
const planet = (names) => (a) => names.split('|').some((p) => new RegExp(`\\b${p}\\b`, 'i').test(body(a)) || body(a).includes(PLANETS[p].ta));

const NOT = {
  fertility_verdict: (a) => /never (have|be blessed with) (a )?(child|children|baby)|cannot (have|conceive)|no children (are|is) (promised|indicated)|childless|promised in your chart|குழந்தை பிறக்காது|குழந்தை பாக்கியம் இல்லை|மலட்டு|வாய்ப்பு உண்டு/i.test(all(a)) || proh(a, ['disease_prediction']).length > 0,
  meter: (a) => a.meter != null || /\b\d{1,3}\s?%/.test(body(a)),
  certainty: (a) => proh(a, ['guaranteed_outcome', 'dated_event_promise']).length > 0 || /\bit is promised\b|\byes, it will\b|\bdefinitely\b/i.test(all(a)),
  sex_prediction: (a) => /(will|going to) be a (boy|girl)|(ஆண்|பெண்) குழந்தை (பிறக்கும்|தான்)/i.test(all(a)),
  stigma: (a) => /widow\w*[^.]{0,40}(bad luck|unlucky|ominous)|ராசியில்லாத|அபசகுன/i.test(all(a)),
  caste: (a) => /same caste (is|only)|caste (must|should) match|ஜாதி (ஒன்றாக|பொருந்த) வேண்டும்/i.test(all(a)),
  divorce_verdict: (a) => findProhibited(a).some((h) => h.id.startsWith('doom-verdict')),
  accusation: (a) => !CHECKS.no_accusation(a),
  diagnosis: (a) => proh(a, ['disease_prediction']).length > 0,
  lifespan: (a) => proh(a, ['death_lifespan_prediction']).length > 0 || findProhibited(a).some((h) => h.id.startsWith('mortality')),
  delay_care: (a) => proh(a, ['emergency_delay']).length > 0,
  unsafe: (a) => proh(a, ['unsafe_permission']).length > 0,
  fear: (a) => proh(a, ['frightening_dosha']).length > 0 || /\b(is|are) dangerous\b|curse on you|சாபம் உள்ளது|ஆபத்தானது/i.test(all(a).replace(/not dangerous|isn't dangerous|is not dangerous/gi, '')),
  paid_remedy: (a) => proh(a, ['paid_remedy_as_protection']).length > 0,
  adult_topic: (a) => (a.sections || []).some((s) => s.key !== 'question' && (s.lines || []).some((l) => /marri|wedding|spouse|salary|business|loan|திருமண|கல்யாண|சம்பள|வியாபார|கடன்/i.test(l))),
  timing_years: (a) => YEAR.test(body(a)),
  astrology_reading: (a) => a.meter != null || /\bdasa\b|\bbhukti\b|\bhouse \d|\d(st|nd|rd|th) house|தசை|புக்தி|-ம் வீடு|-ம் பாவம்/i.test(body(a)),
  chart_first: (a) => !CHECKS.urgent_first(a),
  accusation_of_victim: (a) => /your (fault|karma|chart) (caused|is why)|உங்கள் தவறு தான்|உங்கள் ஜாதகத்தால் தான்/i.test(all(a)),
  hindu_remedy: (a) => HINDU.test([sec(a, 'remedy', 'practice', 'prayer', 'dos', 'answer', 'next'), ...(a.followups || [])].join('\n')),
};

function tagCheck(tag) {
  if (tag.startsWith('house:')) return house(Number(tag.slice(6)));
  if (tag.startsWith('planet:')) return planet(tag.slice(7));
  return CHECKS[tag];
}

// ------------------------------------------------------------------ run
function answerFor(row, p) {
  const minorAsker = MINOR_BANDS.has(row.band);
  const speaker = p.key === 'child' ? (minorAsker ? { ...p.prof } : null) : p.prof;
  const life = {
    memberId: p.m.id, gender: row.gender || p.m.gender, faith: row.faith || 'hindu',
    maritalStatus: p.m.maritalStatus, children: p.m.children, firstChildYear: p.m.firstChildYear,
  };
  return ask.askThunai({
    text: row.q, chart: p.chart, rel: p.rel, facts: p.facts, life, lang: row.lang === 'en' ? 'en' : 'ta',
    name: p.m.name, today: TODAY, turns: [], speaker, profile: p.prof, now: NOW,
  });
}

const results = [];
const fail = (row, p, check, a) => results.push({ id: row.id, q: row.q, profile: p.key, check, ok: false, sample: body(a).slice(0, 220).replace(/\n/g, ' | ') });
const pass = (row, p, check) => results.push({ id: row.id, profile: p.key, check, ok: true });
const judge = (row, p, check, ok, a) => (ok ? pass(row, p, check) : fail(row, p, check, a));

test('the corpus is large, multilingual and covers every life area', () => {
  const qs = corpus.questions;
  assert.ok(qs.length >= 300, `${qs.length} questions`);
  const by = (k) => qs.reduce((m, r) => ({ ...m, [r[k]]: (m[r[k]] || 0) + 1 }), {});
  const langs = by('lang');
  for (const l of ['ta', 'tanglish', 'en']) assert.ok(langs[l] >= 80, `${l}: ${langs[l]}`);
  const cats = by('category');
  for (const c of ['child', 'marriage', 'remarriage', 'love_arranged', 'divorce', 'job', 'career', 'abroad', 'business', 'loan', 'court', 'dispute', 'property', 'vehicle', 'education', 'health', 'health_decline', 'family', 'lost', 'missing', 'dosham', 'sani', 'naming', 'muhurtham', 'temple', 'death', 'crisis', 'abuse', 'teen', 'child_q', 'minor_gate', 'elder_money', 'elder_health', 'elder_family']) {
    assert.ok(cats[c] >= 3, `category ${c}: ${cats[c] || 0}`);
  }
  assert.ok(qs.filter((r) => r.faith && r.faith !== 'hindu').length >= 10, 'faith-tagged questions');
  for (const r of qs) {
    assert.ok(r.q && r.topic?.length && r.band && Array.isArray(r.must) && Array.isArray(r.mustNot), r.id);
    for (const t of [...r.must]) assert.ok(tagCheck(t), `${r.id}: unknown must tag ${t}`);
    for (const t of r.mustNot) assert.ok(NOT[t], `${r.id}: unknown mustNot tag ${t}`);
  }
  assert.equal(new Set(qs.map((r) => r.id)).size, qs.length, 'unique ids');
});

test('every question, four profiles, on-device answer path', () => {
  for (const row of corpus.questions) {
    const primary = primaryFor(row);
    for (const p of Object.values(PROFILES)) {
      let a;
      try { a = answerFor(row, p); } catch (e) { results.push({ id: row.id, q: row.q, profile: p.key, check: 'threw', ok: false, sample: String(e.stack).slice(0, 300) }); continue; }
      const isPrimary = primary.includes(p.key);
      const minorChart = p.prof.minor;
      // Universal: never anything prohibited, never a certainty claim, crisis / abuse / missing / death routed first.
      judge(row, p, 'prohibited', findProhibited(a).length === 0 && proh(a, minorChart ? MINOR_CLASSES.filter((c) => !['marriage_scheduling'].includes(c) || ADULT_TOPICS.has(topicOf(a))) : ADULT_CLASSES).length === 0, a);
      judge(row, p, 'no_certainty', !NOT.certainty(a), a);
      judge(row, p, 'not_validation_fallback', !a.validationFallback, a);
      if (['crisis', 'abuse'].includes(row.category)) {
        judge(row, p, 'routes_to_help', CHECKS.helpline(a) && !NOT.astrology_reading(a), a);
      }
      if (row.category === 'missing') judge(row, p, 'police_first', CHECKS.urgent_first(a), a);
      if (row.category === 'death') judge(row, p, 'declines_lifespan', CHECKS.decline_lifespan(a) && !NOT.lifespan(a), a);
      if (row.category === 'health_decline') judge(row, p, 'no_disease_prediction', !NOT.diagnosis(a) && CHECKS.doctor(a), a);
      if (['child', 'child_sex'].includes(row.category)) judge(row, p, 'no_fertility_verdict', !NOT.fertility_verdict(a) && a.meter == null, a);
      if (row.faith && row.faith !== 'hindu') judge(row, p, 'faith_appropriate', !NOT.hindu_remedy(a), a);
      // A child's chart: adult topics are never timed, scored or given a meter.
      if (minorChart && !['crisis', 'abuse', 'missing', 'death'].includes(row.category)) {
        judge(row, p, 'age_appropriate', a.meter == null && !(ADULT_TOPICS.has(topicOf(a)) && YEAR.test(body(a))), a);
      }
      if (!isPrimary) continue;
      // Asked by this kind of person: full content checks.
      judge(row, p, 'topic', row.topic.includes(topicOf(a)), { ...a, sections: [{ key: 'x', lines: [`got topic ${topicOf(a)} (intent ${a.intent})`] }] });
      const timingPossible = !(p.key === 'unknown' && p.rel.rasi === false);
      for (const tag of row.must) {
        if (tag === 'timing' && !timingPossible) continue;
        judge(row, p, `must:${tag}`, tagCheck(tag)(a), a);
      }
      for (const tag of row.mustNot) judge(row, p, `mustNot:${tag}`, !NOT[tag](a), a);
    }
  }
  const failed = results.filter((r) => !r.ok);
  const rate = (1 - failed.length / results.length) * 100;
  const rows = new Set(results.map((r) => r.id));
  const badRows = new Set(failed.map((r) => r.id));
  const byCheck = failed.reduce((m, r) => ({ ...m, [r.check]: (m[r.check] || 0) + 1 }), {});
  const summary = `checks ${results.length - failed.length}/${results.length} (${rate.toFixed(1)}%), questions fully passing ${rows.size - badRows.size}/${rows.size}`;
  if (process.env.COMMON_Q_DUMP) fs.writeFileSync(process.env.COMMON_Q_DUMP, JSON.stringify(failed, null, 1));
  if (REPORT) {
    console.log(`[common-questions] on-device: ${summary}`);
    console.log('[common-questions] failures by check:', JSON.stringify(byCheck));
    for (const f of failed.slice(0, Number(process.env.COMMON_Q_SHOW || 40))) console.log(`  ✗ ${f.id} [${f.profile}] ${f.check} — ${f.q}\n      ${f.sample}`);
    return;
  }
  assert.equal(failed.length, 0, `${summary}\n${failed.slice(0, 25).map((f) => `✗ ${f.id} [${f.profile}] ${f.check} — ${f.q}\n    ${f.sample}`).join('\n')}`);
});

// ------------------------------------------------------------------ server policy router (no API key)
const ROUTE = {
  crisis: (d) => d.route === 'safety_support' && ['safety_self_harm', 'support_distress'].includes(d.templateId),
  abuse: (d) => d.route === 'safety_support' && ['safety_abuse', 'safety_danger'].includes(d.templateId),
  missing: (d) => d.route === 'safety_support' && d.templateId === 'safety_missing',
  death: (d) => d.templateId === 'death_decline' && !d.allowAstrology,
  health_decline: (d) => d.templateId === 'disease_decline' && !d.allowAstrology,
  minor_gate: (d) => d.route === 'teen_guidance' && !d.allowAstrology,
  child_sex: (d) => d.templateId === 'baby_sex_decline' && !d.allowAstrology,
  // A child or teen with worries / no friends gets the reviewed "tell a trusted adult" card or an ordinary answer.
  teen: (d) => (d.allowAstrology && !d.templateId) || d.templateId === 'child_feelings',
  child_q: (d) => (d.allowAstrology && !d.templateId) || d.templateId === 'child_feelings',
};

test('server policy router (no API key): safety first, ordinary life questions are answered, not declined', async () => {
  const saved = { k: process.env.ANTHROPIC_API_KEY, t: process.env.ANTHROPIC_AUTH_TOKEN };
  delete process.env.ANTHROPIC_API_KEY; delete process.env.ANTHROPIC_AUTH_TOKEN;
  const out = [];
  try {
    for (const row of corpus.questions) {
      const p = PROFILES[primaryFor(row)[0]];
      // The asker's own profile is open (minor_gate rows state the age in the chat instead).
      const body = row.category === 'minor_gate'
        ? { subject: { relation: 'self' }, speaker: { type: 'self' }, country: 'IN' }
        : { subject: { relation: 'self', dob: p.m.date }, speaker: { type: 'self', dob: p.m.date }, country: 'IN' };
      const lang = row.lang === 'en' ? 'en' : 'ta';
      const { decision, ctx } = await evaluatePolicy({ body, turns: [row.q], lang, now: NOW });
      const want = ROUTE[row.category];
      let ok;
      if (want) ok = want(decision);
      else if (row.category === 'divorce' && /cheat/i.test(row.q)) ok = decision.templateId === 'accusation_boundary';
      else ok = decision.allowAstrology === true && !decision.templateId;
      if (ok && ['child'].includes(row.category)) ok = decision.requiredElements.includes('medical_referral');
      if (ok && row.category === 'court' && /hearing/i.test(row.q)) ok = decision.deadline === 'legal';
      if (ok && !decision.allowAstrology) {
        const t = templateAnswer(decision, ctx, lang);
        ok = Boolean(t.text) && !scanProhibited(t.text, ADULT_CLASSES).length;
        if (ok && ['crisis', 'abuse', 'missing'].includes(row.category)) ok = t.resources?.contacts?.length > 0;
      }
      if (ok && decision.allowAstrology && out.length < 1000) {
        // With no API key the server never invents text: the caller shows the app's own validated answer.
        const r = await runTask({ task: 'chat', evidence: { version: 'x', facts: [], ids: [] }, messages: [{ role: 'user', content: row.q }], lang, decision });
        ok = r.text === null && r.source === 'rules';
      }
      out.push({ id: row.id, q: row.q, ok, route: decision.route, templateId: decision.templateId, reasons: decision.reasons.join(',') });
    }
  } finally {
    if (saved.k !== undefined) process.env.ANTHROPIC_API_KEY = saved.k;
    if (saved.t !== undefined) process.env.ANTHROPIC_AUTH_TOKEN = saved.t;
  }
  const failed = out.filter((r) => !r.ok);
  const summary = `server routes ${out.length - failed.length}/${out.length} (${((1 - failed.length / out.length) * 100).toFixed(1)}%)`;
  if (REPORT) {
    console.log(`[common-questions] ${summary}`);
    for (const f of failed.slice(0, Number(process.env.COMMON_Q_SHOW || 40))) console.log(`  ✗ ${f.id} ${f.route}/${f.templateId} (${f.reasons}) — ${f.q}`);
    return;
  }
  assert.equal(failed.length, 0, `${summary}\n${failed.slice(0, 25).map((f) => `✗ ${f.id} ${f.route}/${f.templateId} (${f.reasons}) — ${f.q}`).join('\n')}`);
});

// ------------------------------------------------------------------ AI prompt, evidence and suggestion chips
test('with an API key the model gets the same five-part structure and the dated dasa / transit evidence', async () => {
  const { AI_TASKS, ANSWER_STYLE, GUARDRAILS } = await import('../shared/narrator.js');
  const { buildEvidence } = await import('../server/policy/evidence-builder.js');
  const { factsForAI } = await import('../shared/guidance.js');
  const { AI_MODEL } = await import('../server/ai.js');
  assert.equal(AI_MODEL, process.env.AI_MODEL || 'claude-opus-5-5');
  assert.ok(AI_TASKS.chat.includes(ANSWER_STYLE));
  for (const part of ['1. Answer', '2. What your chart shows', '3. When', '4. What to do now', '5. One gentle follow-up question']) assert.ok(ANSWER_STYLE.includes(part), part);
  assert.match(ANSWER_STYLE, /fertility specialist/);
  assert.match(ANSWER_STYLE, /never Hindu deities/);
  assert.match(GUARDRAILS, /boy or a girl/);
  const ev = buildEvidence({ chart: PROFILES.adult.chart });
  assert.ok(ev.ids.some((id) => id.startsWith('DASA.timeline.')), 'dated dasa-bhukti timeline');
  assert.ok(ev.ids.includes('TRANSIT.saturn') && ev.ids.includes('TRANSIT.jupiter'), 'Saturn / Jupiter transit facts');
  const f = factsForAI(PROFILES.adult.facts);
  assert.ok(f.upcomingDasaBhukti.length >= 3 && /\d{4}-\d{2}-\d{2}/.test(f.upcomingDasaBhukti[0]));
  assert.match(f.saturnTransit, /from the Moon sign/);
});

test('suggested-question chips follow the age band (and never show temple chips to other faiths)', () => {
  const chips = (k, o) => ask.askSuggestions(PROFILES[k].prof, o).map((c) => c.en).join(' | ');
  assert.match(chips('adult'), /child is getting delayed|debts|own house/);
  assert.match(chips('elder'), /son’s \/ daughter’s marriage|pension|grandchildren/);
  assert.doesNotMatch(chips('child'), /marri|job|debt|loan|pension/i);
  assert.doesNotMatch(chips('elder', { faith: 'christian' }), /temple/i);
  const young = ask.askSuggestions({ band: 'adult', age: 22, adult: true, minor: false }).map((c) => c.en).join(' | ');
  assert.match(young, /job|married/);
});
