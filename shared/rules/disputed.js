// Disputed / anxiety-provoking labels. OFF by default: evaluated only when the selected profile
// sets `showDisputed: true` (a separately reviewed tradition setting). Never paired with any remedy
// (remedyPolicy 'none'), never a warning. Grahana here means only a Sun/Moon–node sign sharing:
// it is not an astronomical event and is never described as one.
import { T, fact, taName, SEVEN, lon } from './core.js';
import { defineRule, REL } from './define.js';

const V = (present, ...facts) => ({ present: !!present, facts });
const CALM = (en, ta) => T(`${en} This is a contested label: many traditions do not use it, it does not predict any event, and no paid remedy is needed.`,
  `${ta} இது விவாதத்திற்குரிய பெயர்: பல மரபுகள் இதைப் பயன்படுத்துவதில்லை; இது எந்த நிகழ்வையும் முன்னறிவிப்பதில்லை; கட்டண பரிகாரம் தேவையில்லை.`);

const common = {
  kind: 'dosha', status: 'disputed', disputed: true, profileFlag: 'showDisputed', remedyPolicy: 'none', tone: 'mild',
  fixtures: 'test/rules-doshas.test.js', reference: 'lagna',
};

const kalaSarpa = defineRule({
  ...common,
  id: 'dosha.kalasarpa', legacyId: 'kalasarpa',
  name: T('Kala Sarpa (disputed label)', 'கால சர்ப்பம் (விவாதத்திற்குரியது)'),
  planets: [...SEVEN, 'Rahu', 'Ketu'], relation: { type: 'longitude-arc', definition: 'All seven planets lie within the 180° arc on one side of the Rahu–Ketu axis (by sidereal longitude).' },
  predicateText: 'All of Sun..Saturn have longitudes inside one half of the zodiac bounded by Rahu and Ketu. Flags: `rahuToKetu`, `ketuToRahu`.',
  predicate(ctx) {
    const r = lon(ctx.P.Rahu);
    const d = SEVEN.map((k) => (lon(ctx.P[k]) - r + 360) % 360);
    const a = d.every((x) => x > 0 && x < 180), b = d.every((x) => x > 180 && x < 360);
    return { variants: { rahuToKetu: V(a, fact('All planets between Rahu and Ketu (Rahu side)', 'அனைத்து கிரகங்களும் ராகு→கேது இடையே')), ketuToRahu: V(b, fact('All planets between Ketu and Rahu (Ketu side)', 'அனைத்து கிரகங்களும் கேது→ராகு இடையே')) }, facts: [], involved: ['Rahu', 'Ketu'] };
  },
  explanation: CALM('All planets sit on one side of the Rahu–Ketu axis.', 'அனைத்து கிரகங்களும் ராகு–கேது அச்சின் ஒரு பக்கம் உள்ளன.'),
});

const pitru = defineRule({
  ...common,
  id: 'dosha.pitru', legacyId: 'pitru',
  name: T('Pitru (disputed label)', 'பித்ரு (விவாதத்திற்குரியது)'),
  planets: ['Sun', 'Rahu', 'Ketu'], relation: REL.conjunction, defaultVariants: ['sunWithNode'],
  predicateText: 'Flag `sunWithNode` (default): Sun in the same sign as Rahu or Ketu. Flag `rahuNinth` (off): Rahu in the 9th from Lagna.',
  predicate(ctx) {
    const sn = ['Rahu', 'Ketu'].filter((n) => ctx.conj('Sun', n));
    const r9 = ctx.hasLagna && ctx.houseOf('Rahu', 'lagna') === 9;
    return { variants: { sunWithNode: V(sn.length, ...sn.map((n) => fact(`Sun shares a sign with ${n}`, `சூரியன் ${taName(n)} உடன் ஒரே ராசியில்`))), rahuNinth: V(r9, fact('Rahu in the 9th from Lagna', 'லக்னத்திற்கு 9-ல் ராகு')) }, facts: [], involved: ['Sun', ...sn] };
  },
  explanation: CALM('The Sun shares a sign with a lunar node.', 'சூரியன் ஒரு நிழல் கிரகத்துடன் ஒரே ராசியில் உள்ளது.'),
});

const shrapit = defineRule({
  ...common,
  id: 'dosha.shrapit', legacyId: 'shrapit',
  name: T('Shrapit (disputed label)', 'ஷ்ராபித் (விவாதத்திற்குரியது)'),
  planets: ['Saturn', 'Rahu'], relation: REL.conjunction,
  predicateText: 'Saturn and Rahu in the same sign.',
  predicate(ctx) { return { present: ctx.conj('Saturn', 'Rahu'), facts: [fact(`Saturn and Rahu ${ctx.conj('Saturn', 'Rahu') ? 'share' : 'do not share'} a sign`, `சனி-ராகு ${ctx.conj('Saturn', 'Rahu') ? 'ஒரே ராசியில்' : 'வெவ்வேறு ராசியில்'}`)], involved: ['Saturn', 'Rahu'] }; },
  explanation: CALM('Saturn shares a sign with Rahu.', 'சனி ராகுவுடன் ஒரே ராசியில் உள்ளது.'),
});

const punarphoo = defineRule({
  ...common,
  id: 'dosha.punarphoo', legacyId: 'punarphoo',
  name: T('Punarphoo (disputed label)', 'புனர்பூ (விவாதத்திற்குரியது)'),
  planets: ['Saturn', 'Moon'], relation: REL.conjunction, defaultVariants: ['conjunction'],
  predicateText: 'Flag `conjunction` (default): Saturn and Moon in the same sign. Flag `mutualAspect` (off): Saturn and Moon in mutual aspect.',
  predicate(ctx) {
    return { variants: { conjunction: V(ctx.conj('Saturn', 'Moon'), fact('Saturn and Moon share a sign', 'சனி-சந்திரன் ஒரே ராசியில்')), mutualAspect: V(ctx.mutualAspect('Saturn', 'Moon'), fact('Saturn and Moon in mutual aspect', 'சனி-சந்திரன் பரஸ்பரப் பார்வை')) }, facts: [], involved: ['Saturn', 'Moon'] };
  },
  explanation: CALM('Saturn and the Moon are linked.', 'சனியும் சந்திரனும் தொடர்பில் உள்ளன.'),
});

const grahana = defineRule({
  ...common,
  id: 'dosha.grahana', legacyId: 'grahana',
  name: T('Grahana label (Sun/Moon with a node; disputed)', 'கிரகண யோகப் பெயர் (சூரியன்/சந்திரன் – ராகு/கேது சேர்க்கை; விவாதத்திற்குரியது)'),
  planets: ['Sun', 'Moon', 'Rahu', 'Ketu'], relation: REL.conjunction,
  predicateText: 'Flag `sun`: Sun in the same sign as Rahu or Ketu. Flag `moon`: Moon in the same sign as Rahu or Ketu. Sign-sharing only — no eclipse geometry is computed and none is implied.',
  predicate(ctx) {
    const with_ = (k) => ['Rahu', 'Ketu'].filter((n) => ctx.conj(k, n));
    const s = with_('Sun'), m = with_('Moon');
    return { variants: { sun: V(s.length, ...s.map((n) => fact(`Sun shares a sign with ${n}`, `சூரியன் ${taName(n)} உடன்`))), moon: V(m.length, ...m.map((n) => fact(`Moon shares a sign with ${n}`, `சந்திரன் ${taName(n)} உடன்`))) }, facts: [], involved: ['Sun', 'Moon'] };
  },
  explanation: CALM('A luminary shares a sign with Rahu or Ketu. This is a sign placement only, not a sky event.', 'சூரியன் அல்லது சந்திரன் ராகு/கேதுவுடன் ஒரே ராசியில் — இது ராசி அமைப்பு மட்டுமே, வானில் நடக்கும் நிகழ்வு அல்ல.'),
});

export const DISPUTED_RULES = [kalaSarpa, pitru, shrapit, punarphoo, grahana];
