// Deterministic-Prediction Safety Standard: banned-phrase library, the copy scan of every shipped string,
// the validator hook, related questions (no upsell on high-risk topics or minors), honest pricing and the funnel.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanCertainty, isSafeCopy, BANNED } from '../shared/certainty-guard.js';
import { relatedQuestions, ALL_RELATED, riskLevel, priceFrame, funnelTable, FUNNEL, preparedFacts } from '../shared/pro-questions.js';
import { CHARTER, DISCLAIMER, PRINCIPLE, PRACTITIONER_CODE, PUBLIC_STATEMENT, UPGRADE_LINE, UNCERTAINTY_LABEL } from '../shared/responsible.js';
import { validateAnswer } from '../server/policy/answer-validator.js';
import { EVENT_TYPES } from '../server/growth.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// "Do not say" — every line must be caught (English, Tamil, Tanglish).
const BAD = [
  ['You will get married in June 2027, 100% sure.', 'certainty'],
  ['Guaranteed success in your new job.', 'certainty'],
  ['Marriage will definitely happen this year.', 'certainty'],
  ['It must happen before Diwali.', 'certainty'],
  ['இந்த ஆண்டு திருமணம் நிச்சயமாக நடக்கும்.', 'certainty'],
  ['kandippa kalyanam nadakkum', 'certainty'],
  ['Do this puja, otherwise bad things will happen to your family.', 'fear'],
  ['Your life will be destroyed in Sani dasa.', 'fear'],
  ['Book now, before it is too late.', 'fear'],
  ['This is the only remedy.', 'fear'],
  ['Unlock your future with Pro.', 'fear'],
  ['Premium users get protection from negative planetary effects.', 'fear'],
  ['உங்கள் வாழ்க்கை நாசமாகும்.', 'fear'],
  ['You will never marry.', 'never_outcome'],
  ['You cannot have children.', 'never_outcome'],
  ['உங்களுக்குத் திருமணமே நடக்காது.', 'never_outcome'],
  ['You will die early.', 'death_disaster'],
  ['Buy this stock on Monday.', 'financial_instruction'],
  ['Quit your job next month.', 'financial_instruction'],
  ['Do not invest this month.', 'financial_instruction'],
  ['வேலையை விட்டு விடுங்கள்.', 'financial_instruction'],
  ['Do not see a doctor, the dasa will settle it.', 'medical_instruction'],
  ['Stop your medicine during this period.', 'medical_instruction'],
  ['மருத்துவரிடம் போக வேண்டாம்.', 'medical_instruction'],
  ['Your dosham will be removed after this remedy.', 'guaranteed_remedy'],
  ['You will become rich after this parigaram.', 'guaranteed_remedy'],
  ['Only 3 hours left to remove dosham.', 'false_urgency'],
  ['Your Rahu period is bad—book an astrologer urgently.', 'false_urgency'],
  ['You will have a boy child.', 'fetal_sex'],
  ['ஆண் குழந்தை பிறக்கும்.', 'fetal_sex'],
];
// "Say instead" — none of these may be caught.
const GOOD = [
  'Traditional interpretation may indicate a comparatively supportive period for marriage planning in 2027–28. The outcome depends on personal choice, compatibility and circumstances.',
  'This period may be suitable for disciplined financial planning. Do not make investment decisions based on astrology; consult a qualified financial professional.',
  'The chart-based interpretation may suggest a period for exploring career opportunities. Evaluate the role, income, skills and market conditions independently.',
  'This remedy is offered as a voluntary traditional practice. It does not guarantee a specific outcome or replace practical action.',
  'Porutham is one traditional input. Consider consent, values, communication, wellbeing, family expectations and independent counselling before deciding.',
  'Traditional astrology may associate this period with attention to wellbeing. It cannot diagnose illness. If you have symptoms or concerns, see a qualified doctor.',
  'Thunai does not provide or infer fetal-sex or sex-selection information.',
  'Thunai does not predict death, lifespan, accidents, catastrophe, or irreversible harm.',
  'Thunai does not guarantee wealth or predict a fixed financial outcome. Do not buy, sell, invest, borrow or stop work based on horoscope guidance.',
  'Thunai never says "you will never marry".',
  'இது பாரம்பரிய விளக்கம், உறுதியான கணிப்பு அல்ல.',
];

test('every "do not say" line is caught in the right category', () => {
  for (const [line, cat] of BAD) {
    const hits = scanCertainty(line).map((h) => h.category);
    assert.ok(hits.includes(cat), `${line} → expected ${cat}, got ${hits.join(',') || 'nothing'}`);
  }
});

test('every "say instead" line passes', () => {
  for (const line of GOOD) assert.deepEqual(scanCertainty(line), [], line);
});

test('every banned category has English and Tamil coverage', () => {
  for (const [cat, list] of Object.entries(BANNED)) {
    assert.ok(list.some((p) => /[a-z]/i.test(p.source)), `${cat}: English`);
    assert.ok(list.some((p) => /[஀-௿]/.test(p.source)), `${cat}: Tamil`);
  }
});

// Every string literal the app ships (screens, engine texts, server copy, plans, notifications) is free of banned phrases.
const SKIP = new Set(['shared/certainty-guard.js', 'server/policy/answer-validator.js', 'server/policy/intent-router.js']);
function shippedFiles() {
  const out = [];
  for (const dir of ['public', 'shared', 'server']) {
    for (const f of fs.readdirSync(path.join(root, dir), { recursive: true }).map(String)) {
      const rel = `${dir}/${f}`.replaceAll('\\', '/');
      if (rel.includes('/vendor/') || SKIP.has(rel) || !/\.(js|json)$/.test(rel)) continue;
      out.push(rel);
    }
  }
  return out;
}
test('copy scan: no shipped string carries a banned certainty / fear / guarantee phrase', () => {
  const offenders = [];
  const files = shippedFiles();
  assert.ok(files.length > 100, `found only ${files.length} files`);
  for (const rel of files) {
    const src = fs.readFileSync(path.join(root, rel), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    for (const m of src.matchAll(/'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\]|\\.)*)`|"((?:[^"\\\n]|\\.)*)"/g)) {
      const t = m[1] ?? m[2] ?? m[3];
      if (!t || t.length < 8) continue;
      for (const h of scanCertainty(t)) offenders.push(`${rel}: [${h.category}] ${t.slice(0, 100)}`);
    }
  }
  assert.deepEqual(offenders, []);
});

test('the charter, disclaimer, practitioner code and upgrade line are clean, bilingual copy', () => {
  for (const t of [PRINCIPLE, DISCLAIMER, PUBLIC_STATEMENT, UPGRADE_LINE, UNCERTAINTY_LABEL, ...CHARTER, ...PRACTITIONER_CODE]) {
    assert.ok(t.en && /[஀-௿]/.test(t.ta), t.en);
    assert.ok(isSafeCopy(t.en) && isSafeCopy(t.ta), t.en);
  }
  assert.ok(CHARTER.length >= 10 && PRACTITIONER_CODE.length >= 10);
});

test('validator rejects a model answer with deterministic wording', () => {
  const r = validateAnswer({ text: 'Marriage will definitely happen in June 2027 — 100% sure.', claims: [], uncertainty: '', nextSteps: [], optionalPractice: '', humanReview: false }, { decision: { allowAstrology: true, prohibitedOutputs: [] }, evidence: { ids: [], facts: [] } });
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.startsWith('certainty:')), r.errors.join(','));
});

test('related questions: adults with a chart on medium / low topics only', () => {
  const marriage = relatedQuestions({ topic: 'marriage', intent: 'marriage', adult: true, hasChart: true });
  assert.equal(marriage.length, 3);
  assert.ok(marriage.every((x) => x.pro && x.q.en && /[஀-௿]/.test(x.q.ta) && x.covers.length >= 3));
  for (const topic of ['health', 'money', 'loan', 'court', 'lost', 'crisis', 'death', 'baby_sex']) {
    assert.deepEqual(relatedQuestions({ topic, intent: topic, adult: true, hasChart: true }), [], topic);
    assert.equal(riskLevel(topic), 'high', topic);
  }
  assert.deepEqual(relatedQuestions({ topic: 'marriage', adult: false, hasChart: true }), [], 'minor');
  assert.deepEqual(relatedQuestions({ topic: 'marriage', adult: true, hasChart: false }), [], 'no chart');
  assert.deepEqual(relatedQuestions({ topic: 'festival', adult: true, hasChart: true, general: true }), [], 'general');
  assert.deepEqual(relatedQuestions({ topic: 'career', intent: 'honest', adult: true, hasChart: true }), [], 'honest');
  // Already-asked questions are not offered again.
  const asked = [marriage[0].q.en];
  assert.ok(!relatedQuestions({ topic: 'marriage', adult: true, hasChart: true, asked }).some((x) => x.id === marriage[0].id));
});

test('every related question and outline is clean copy (no certainty, fear or guarantee)', () => {
  for (const x of ALL_RELATED) for (const t of [x.q, ...x.covers]) assert.ok(isSafeCopy(t.en) && isSafeCopy(t.ta), t.en);
});

test('honest price framing and prepared facts', () => {
  assert.deepEqual(priceFrame(199, 1999), { perDay: 5.5, saving: 389, savingPct: 16 });
  assert.equal(priceFrame(0, 100), null);
  const f = preparedFacts({ star: 'Rohini', rasi: 'Rishabam', dasa: 'Jupiter', dasaEnd: '2031' });
  assert.deepEqual(f, ['Birth star: Rohini', 'Moon sign (Rasi): Rishabam', 'Running dasa: Jupiter (until 2031)']);
  assert.deepEqual(preparedFacts({}), []);
});

test('funnel: steps are accepted analytics events and the table computes conversion', () => {
  for (const f of FUNNEL) assert.ok(EVENT_TYPES.includes(f.step), f.step);
  const t = funnelTable({ help_search: 1000, related_view: 600, related_click: 150, pro_view: 150, pro_cta: 45, purchase: 9 });
  assert.equal(t[0].fromPrev, null);
  assert.equal(t[2].fromPrev, 25);
  assert.equal(t[4].fromPrev, 30);
  assert.equal(t[5].fromStart, 0.9);
  assert.equal(funnelTable({})[3].fromPrev, 0);
});

test('Responsible Guidance Dashboard counts blocks and refusals (no message text)', async () => {
  const { recordPolicyEvent, safetyDashboard, resetAudit } = await import('../server/policy/audit-events.js');
  resetAudit();
  recordPolicyEvent({ route: 'decline_facilitation', reasons: ['baby_sex_request'], templateId: 'baby_sex_decline' });
  recordPolicyEvent({ route: 'adult_guidance', validation: 'invalid', validationErrors: ['certainty:certainty'] });
  recordPolicyEvent({ route: 'safety_support', reasons: ['death_lifespan_request'] });
  const d = safetyDashboard();
  assert.equal(d.answers, 3); assert.equal(d.fetalSexRefused, 1); assert.equal(d.deterministicBlocked, 1);
  assert.equal(d.safetyRedirects, 1); assert.equal(d.deathRefused, 1); assert.equal(d.targets.fetalSexRefusedPct, 100);
  resetAudit();
});
