// Certainty guard — the banned-phrase library of the Deterministic-Prediction Safety Standard
// (docs/DETERMINISTIC-PREDICTION-STANDARD.md). Pure and dependency-free: the SAME list runs on the phone, on the
// server's answer validator (server/policy/answer-validator.js) and in the copy-scan test that checks every
// marketing line, plan feature, notification, share card and in-app string (test/certainty-guard.test.js).
//
// English, Tamil script and Tanglish. A match inside a refusal / caution ("Thunai does not guarantee …",
// "… உறுதியல்ல") is not a hit. Add new phrases here (never in a screen) and add a corpus line to the test.
// A list is not a guarantee: false negatives are reviewed monthly from complaints and the audit log.

export const GUARD_VERSION = 'certainty-guard-1.0.0';

const S = '[^.!?\\n।]'; // same sentence
const r = (src) => new RegExp(src.replaceAll('§', S), 'iu');

/** Categories → patterns. Category ids are stable (they appear in audit counters and the dashboard). */
export const BANNED = Object.freeze({
  certainty: [
    r('\\b100\\s?%\\s?(sure|certain|guarantee\\w*|accurate|correct)'),
    r('\\bguaranteed?\\b§{0,30}\\b(result|success|marriage|job|wealth|money|outcome|cure|protection|to (happen|work|succeed))'),
    r('\\b(this|it|that|marriage|success|wealth|the job)\\b§{0,15}\\b(will|is going to)\\b§{0,6}\\b(definitely|surely|certainly|100%)\\b'),
    r('\\b(definitely|surely|certainly) (will|going to) (happen|come|get|marry|succeed)'),
    r('\\b(must|is bound to|is sure to) happen\\b'),
    r('\\bno doubt\\b§{0,25}\\b(will|happen|marry|get|become)'),
    r('\\bfixed (future|fate|destiny)\\b§{0,20}\\b(is|says|shows)\\b'),
    r('(நிச்சயமாக|கண்டிப்பாக|உறுதியாக|100\\s?%)\\s?§{0,20}(நடக்கும்|கிடைக்கும்|வரும்|ஆகும்)'),
    r('சந்தேகமே இல்லை§{0,25}(நடக்கும்|கிடைக்கும்|வரும்)'),
    r('\\b(kandippa|kandipa|nichayam|nichayama|uruthiya)\\b§{0,15}\\b(nadakkum|kidaikkum|varum|aagum)\\b'),
  ],
  fear: [
    r('\\botherwise\\b§{0,25}\\b(bad things|misfortune|disaster|danger|harm)\\b§{0,15}\\b(will|happen)'),
    r('\\b(your|his|her) life will be (destroyed|ruined)'),
    r('\\bbefore it is too late\\b'),
    r('\\bonly remedy\\b'),
    r('\\b(your|this) (problem|dosh\\w*) is (very )?(serious|dangerous)\\b§{0,40}\\b(pay|buy|book|unlock)'),
    r('\\bpay now to know\\b'),
    r('\\bunlock (your|the) (future|cure|fate|destiny)\\b'),
    r('\\b(protection|protect you) from (negative|bad|evil) (planetary|planet|graha)'),
    r('\\b(rahu|sani|shani|saturn) (period|dasa|kalam) is (bad|dangerous|evil)\\b§{0,30}\\b(book|pay|buy|urgent)'),
    r('(வாழ்க்கை|குடும்பம்)§{0,10}(நாசமாகும்|அழிந்து ?விடும்|சீரழியும்)'),
    r('இல்லையென்றால்§{0,25}(கெட்டது|ஆபத்து|துன்பம்)§{0,10}(நடக்கும்|வரும்)'),
    r('\\b(vaazhkai|vazhkai) (naasam|nasam|azhinjidum)\\b'),
  ],
  never_outcome: [
    r('\\byou will never (marry|get married|have children|have a child|get a job|be happy|succeed)'),
    r('\\byou (cannot|can\'?t) have (children|a child|kids)\\b'),
    r('(திருமணமே|கல்யாணமே) (நடக்காது|ஆகாது)'),
    r('குழந்தை (பிறக்காது|பாக்கியமே இல்லை)'),
    r('\\b(kalyanam|kalyaanam) (nadakkadhu|nadakkathu|aagaadhu)\\b'),
  ],
  death_disaster: [
    r('\\byou will (die|pass away|face (an )?(accident|death|disaster))'),
    r('(நீங்கள்|உங்களுக்கு)§{0,15}(இறந்து ?விடுவீர்கள்|மரணம் (நிகழும்|வரும்)|விபத்து (நடக்கும்|ஏற்படும்))'),
  ],
  financial_instruction: [
    r('\\b(buy|sell) (this|these|that) (stock|share|shares|crypto|coin)s?\\b'),
    r('\\b(buy|sell) (stocks?|shares|crypto\\w*|gold) (now|today|this (week|month))\\b'),
    r('\\bquit your (job|work)\\b'),
    r('\\b(do not|don\'?t) invest (this|in) (month|week|year)\\b'),
    r('\\btake (a|the) loan (now|today|this month)\\b'),
    r('(பங்கு|ஷேர்)§{0,10}(வாங்குங்கள்|விற்றுவிடுங்கள்)'),
    r('வேலையை (விட்டு ?விடுங்கள்|விடுங்கள்)'),
    r('\\b(share|stock) (vaangunga|vangunga)\\b|\\bvela(i)?ya vittudunga\\b'),
  ],
  medical_instruction: [
    r('\\b(do not|don\'?t|no need to) (see|go to|visit|consult) (a |the |your )?(doctor|hospital)'),
    r('\\bstop (taking )?(your |the )?(medicine|medication|tablets?|treatment)'),
    r('(மருத்துவரிடம்|டாக்டரிடம்|மருத்துவமனைக்கு) (போக|செல்ல) (வேண்டாம்|தேவையில்லை)'),
    r('மருந்தை நிறுத்(து|தி)'),
    r('\\b(doctor kitta|hospital ku) (poga|pona) (vendam|vendaam)\\b'),
  ],
  guaranteed_remedy: [
    r('\\b(dosh\\w*|problem) will be (removed|cured|gone)\\b'),
    r('\\b(remove|removes|removal of) (your )?dosh\\w*\\b'),
    r('\\bbecome (rich|wealthy)\\b§{0,20}\\bafter\\b§{0,20}\\b(this|the) (parigaram|pariharam|remedy|puja|pooja|gem)'),
    r('\\b(this|the) (remedy|parigaram|pariharam|puja|pooja|gem\\w*|yantra)\\b§{0,20}\\b(guarantees|will cure|will remove|will bring)\\b'),
    r('தோஷம்§{0,10}(நிச்சயம்|உறுதியாக)§{0,10}நீங்கும்'),
    r('(பரிகாரம்|பூஜை)§{0,20}(உறுதியான|நிச்சயமான) பலன்'),
  ],
  false_urgency: [
    r('\\bonly \\d+ (hours?|minutes?|days?) left\\b'),
    r('\\b(hurry( up)?[!,]|act now|last chance|offer ends (today|tonight|soon))'),
    r('\\bbook (an astrologer |a puja |now )?urgently\\b'),
    r('\\b(இன்னும்|மட்டுமே) \\d+ (மணி|நிமிடம்)§{0,15}(மட்டுமே|உள்ளது)'),
  ],
  fetal_sex: [
    r('\\byou will have a (baby )?(boy|girl|son|daughter)\\b'),
    r('(ஆண்|பெண்) குழந்தை(யே)? (பிறக்கும்|உறுதி)'),
    r('\\b(aan|ponnu|payyan) (kuzhandhai|kulanthai|kozhandha) (porakkum|pirakkum)\\b'),
  ],
});

// A refusal / caution before the match in the same sentence (or a Tamil negation right after) makes it safe.
const NEG_BEFORE = /\b(not|never|no|cannot|can'?t|don'?t|doesn'?t|does not|do not|won'?t|without|nor|neither|avoid|instead of|rather than|refuse[sd]?|prohibit\w*|ban(s|ned)?|block(s|ed)?|forbid\w*|never say|must not|should not)\b[^.!?\n]*$/i;
const NEG_AFTER = /^[^.!?\n]{0,40}(அல்ல|இல்லை|கூடாது|மாட்டோம்|மாட்டாது|வேண்டாம்|is not|isn't|are not|aren't)/iu;

/**
 * Scan text for banned phrases. Returns [{ category, sample }] (one hit per category at most).
 * @param {string} text
 * @param {{ categories?: string[] }} [opts]
 */
export function scanCertainty(text, { categories = Object.keys(BANNED) } = {}) {
  const s = String(text || '').normalize('NFC');
  const hits = [];
  for (const cat of categories) {
    for (const p of BANNED[cat] || []) {
      const g = new RegExp(p.source, `${p.flags}g`);
      let m, found = null;
      while ((m = g.exec(s))) {
        if (!m[0]) { g.lastIndex++; continue; }
        const before = s.slice(Math.max(0, m.index - 120), m.index);
        const after = s.slice(m.index + m[0].length, m.index + m[0].length + 60);
        // Don't let a negation inside the matched phrase itself (e.g. "do not see a doctor") count as a refusal.
        if (NEG_BEFORE.test(before) || NEG_AFTER.test(after)) continue;
        found = m[0];
        break;
      }
      if (found) { hits.push({ category: cat, sample: found.slice(0, 60) }); break; }
    }
  }
  return hits;
}

/** True when the text has no banned phrase. */
export const isSafeCopy = (text) => scanCertainty(text).length === 0;
