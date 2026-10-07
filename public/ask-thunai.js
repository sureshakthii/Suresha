// Ask Thunai — on-device answers that follow the ACTUAL question, the way a caring family jothidar would answer:
//   1) a direct answer to the question, 2) what the chart shows (named houses / planets, plain words),
//   3) WHEN — supportive windows with dates from the person's Dasa–Bhukti and Jupiter / Saturn transits,
//   4) what to do now (practical steps + ONE simple remedy suited to the person's faith), 5) a gentle follow-up question.
// Topic router (Tamil script, Tanglish and English spellings, colloquial forms). Works fully offline (no server).
// Safety first: self-harm, abuse, a missing person and death / lifespan questions are answered by the shared safety
// engine (shared/guidance.js) and never read from a chart. No death, lifespan, accident, disease, fertility-verdict,
// baby-sex or affair predictions. Children never get marriage / job / money timing (shared/age-guard.js).
import { planetPositions, PLANETS, RASIS } from './shared/astro.js';
import { bhavaAnalysis, transitStatus } from './shared/analysis.js';
import { grahaStrength, remedyFor as planetRemedy } from './shared/remedies.js';
import { significations, planetScore } from './shared/predict.js';
import { REPORT_YEARS, horizonLabel } from './shared/report-horizon.js';
import * as HEALTH from './shared/health.js';
import { ingresses } from './shared/peyarchi.js';
import { doshams } from './shared/porutham.js';
import { nameLetters } from './shared/special.js';
import { isHinduFaith, universalPractice, faithBlessing } from './shared/faith.js';
import { ageProfile, topicAllowed, ageGuardAnswer, guardAnswer, suggestionsFor, facilitationCheck, policyAnswer, childGeneralAnswer, LIMITED_LABEL, LIMITS_LINE } from './shared/age-guard.js';
import { validateOffline, composeAnswer, classify, SAFETY_INTENTS } from './shared/guidance.js';
import { questionType, subTopic, whichKind, otherPerson, factualQuestion, generalQuestion, personalQuestion, seedFor, varyAnswer } from './shared/ask-sense.js';
import { tamilDay } from './shared/tamilcal.js';
import { careerReading, careerLines, businessLines, directionReading, directionLines, partnerLines, studyLines, luckLines, godLines, gemLines, PLANET_FIELDS, FIELDS } from './shared/ask-which.js';

const DAY = 86400000;
const YEAR = 365.25 * DAY;
const T = (en, ta) => ({ en, ta });
const MONTHS_TA = ['ஜனவரி', 'பிப்ரவரி', 'மார்ச்', 'ஏப்ரல்', 'மே', 'ஜூன்', 'ஜூலை', 'ஆகஸ்ட்', 'செப்டம்பர்', 'அக்டோபர்', 'நவம்பர்', 'டிசம்பர்'];
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ASPECTS = { Jupiter: [1, 5, 7, 9], Saturn: [1, 3, 7, 10] };

// ------------------------------------------------------------------ topic detection
// Order matters: the most specific topic first ("baby name" before "baby", "second marriage" before "marriage",
// "abroad job" before "job", "loan" before "money"). Spellings cover Tamil script, Tanglish (many spellings people
// actually type: kulanthai / kozhandha / kuzhandhai …) and English. Safety intents are checked before any of these.
const MARRY = 'thiru?mana?m|thiruman|tiruman|kall?y?aa?n[ae]?m|kalyanam|kalyana|marri|marry|mar+[iae]+g|wedd|shaad|nikah|nikkah|திருமண|கல்யாண|மணம்|நிக்காஹ்';
const KID = 'kulanth?h?ai|kulandh?ai|kuzh?andh?ai|kuzhanth?ai|kozhanth?ai|kozhandh?a|kolanth?ai|kuzhandai|\\bkids?\\b|child|children|\\bbaby\\b|\\bbabies\\b|pregnan|conceiv|santh?h?aa?n|santhana|garbam|karpam|karbam|\\bivf\\b|\\biui\\b|miscarri|putra|puthira|\\bpillai|குழந்தை|பிள்ளை|சந்தான|கர்ப்ப|மகப்பேறு|புத்திர|கரு ';
const SURGERY = /operation|surgery|\bicu\b|ஆபரேஷன்|அறுவை|ஐசியு/i;
export const TOPICS = [
  { id: 'naming', re: /(baby|child|kid|son|daughter|kozhand|kuzhand|kulanth|kulandh|பாப்பா|குழந்தை|மகன்|மகள்)[^.?!]{0,30}(\bname|\bperu\b|peyar|பெயர்)|(\bname|\bperu\b|peyar|பெயர்)[^.?!]{0,30}(baby|ezhuthu|letter|ceremony|vaikk|வைக்க|சூட்ட|எழுத்து)|suggest (a |some )?names?|starting letter|first letter|namakaran|naming|பெயர் சூட்|peyar soott/i },
  { id: 'muhurtham', re: /muhur|mugurt|muhoort|முகூர்த்த|gr[iau]h?a ?pravesam|gruhapravesam|grahapravesam|house ?warming|கிரகப்பிரவேச|புதுமனை|kaa?(th|d)hu ?kuthu|காது குத்து|ear piercing|valaikaa?pp?u|வளைகாப்பு|seemantham|சீமந்த|thirappu ?vizh|திறப்பு விழா|(good|auspicious|nalla|lucky|subha?) (date|day|naal)\b|nalla naal|நல்ல நாள்|உகந்த நாள்|ஏற்ற நாள்|சுப நாள்|(engagement|nichayath?artham|wedding) (date|day)|start(ing)? (the )?construction|bhoomi pooja|பூமி பூஜை/i },
  { id: 'child', re: new RegExp(KID, 'i') },
  { id: 'dosham', re: /dosh|dosa\b|தோஷ|manglik|mangal dosh|kaa?la ?sarpa|kalasarpa|காலசர்ப்ப|naga dosh|pithru|pitru|பித்ரு/i },
  { id: 'sani', re: /sade ?sati|sadesati|ezh?aa?r[ai]i? ?sani|ezhara|elarai|7\.5 ?sani|ஏழரை|ashtama ?(sani|shani)|அஷ்டம(ச்)? ?சனி|jenma ?sani|janma ?sani|ஜென்ம(ச்)? ?சனி|sani ?peyarchi|சனிப் ?பெயர்ச்சி|saturn('s)? transit|\bshani\b|\bsani\b|சனி(?!க்கிழமை|யன்று)/i },
  { id: 'lost', re: /(lost|missing|kaa?nama|kaa?nom|kaa?nala|thola[iy]|thott?(a|u) ?pon?a|தொலை|காணா|காணவில்லை)[^.?!]{0,40}(phone|mobile|wallet|purse|chain|nagai|gold|jewel|ring|keys?|bag|document|certificate|vandi|சங்கிலி|நகை|தங்க|போன்|பர்ஸ்|சாவி|ஆவண)|(phone|mobile|wallet|purse|chain|nagai|gold|jewel|ring|keys?|bag|document|certificate|vandi|சங்கிலி|நகை|தங்க|போன்|பர்ஸ்|சாவி|ஆவண)[^.?!]{0,40}(lost|missing|kaa?nama|kaa?nom|kaa?nala|thola[iy]|thott?(a|u) ?pon?a|kidaik|find|தொலை|காணா|காணவில்லை|கிடைக்கும)/i },
  { id: 'second_marriage', re: new RegExp(`(second|2nd|another|again\\b|re-?marr|remarriage|rend?aa?va?(th|d)h?u|rendavadhu|randavathu|irand?aa?va?(th|d)h?u|irandam|innoru|marupadi(yum)?|marumana?m|maru ?(thiru|kalyan)|இரண்டாவது|இரண்டாம்|இன்னொரு|மறுபடி(யும்)?|மறு ?மண|மறுமண|மறு திருமண)[\\s\\S]{0,30}(${MARRY})|(${MARRY})[\\s\\S]{0,20}(again|second|rend?aa?va?thu|marupadi|மறுபடி)|marumana?m|மறுமண|re-?marriage|re-?marry`, 'i') },
  { id: 'education', re: /exam|study|studies|subjects?\b|education|college|school|degree|\bneet\b|\bjee\b|upsc|tnpsc|group ?[124]\b|board exam|marks?\b|\bmba\b|\bmbbs\b|engineering|medical seat|admission|universit|course|\b1[12]th\b|which group|arrears? clear|clear (my )?arrears?|result|padipp?u|padikk|padippena|padichu|parikshai|kalvi|மேல் ?படிப்பு|மேல்படிப்பு|கல்வி|தேர்வு|(?<![\u0B80-\u0BFF])படிப்|(?<![\u0B80-\u0BFF])படிக்க|பாடப்பிரிவு|கல்லூரி|பள்ளி|பரீட்சை|மதிப்பெண்|டாக்டருக்குப் படி/i },
  { id: 'health', re: /health|\bill(ness)?\b|\bsick|disease|fever|\bsugar\b|diabet|\bbp\b|blood pressure|cancer|heart (problem|attack|disease)|surgery|operation|hospital|\bicu\b|medicine|weight|diet|\bfood\b|memory|dementia|\bknee|sleep|thookam|recover|udambu|udal ?nal|udal ?nala|\bnoi\b|kaichal|arokiyam|aarokkiyam|aarogyam|ஆரோக்கிய|நோய்|உடல்நல|உடல் நல|உடல்நிலை|காய்ச்சல்|சர்க்கரை|மருத்துவமனை|அறுவை|ஆபரேஷன்|மருந்து|உணவு|குணமா/i },
  { id: 'court', re: /court|\bcase\b|hearing|legal|dispute|lawyer|litigation|vazhakk?u|valakku|vakeel|kesu|வழக்கு|கோர்ட்|நீதிமன்ற|வக்கீல்|விசாரணை|தகராறு/i },
  { id: 'harmony', re: /husband.?wife|wife.?husband|misunderstand|quarrel|\bfight(?![^.?!]*friend)|separat|divorce|reunite|cheat|sandai|chandai|purithal|kanavan.?manaivi|(?<!(future|would-be|to-be) )\b(husband|wife|purushan|purusan|pondatti|manaivi|kanavar)\b|சண்டை|கணவன்.?மனைவி|(?<!வருங்கால )(கணவர்|கணவன்|மனைவி)|(?<![\u0B80-\u0BFF])பிரிவு|பிரிந்து|விவாகரத்து|ஒற்றுமை|புரிதல்/i },
  { id: 'marriage', re: new RegExp(`${MARRY}|spouse|alliance|ponnu (kidai|paar|amay)|maa?pp?ill?ai|mapilai|varan\\b|jodi|bride|groom|life ?partner|future (wife|husband)|வரன்|மாப்பிள்ளை|பெண் பார்|மணமகன்|மணமகள்|வாழ்க்கைத் துணை|வருங்கால (கணவர்|மனைவி)`, 'i') },
  { id: 'travel', re: /visa|abroad|foreign|onsite|overseas|immigra|\bpr\b|green card|\bh-?1b\b|dubai|gulf|singapore|canada|australia|\busa\b|\bus visa|\buk\b|velinaa?du|velinaatt?u|velinattu|videsh|videsa|videsam|videsham|vegu dhooram|travel|payanam|பயணம்|வெளிநாடு|வெளிநாட்ட|விசா|அயல்நாடு|விதேச|துபாய்|குடியேற/i },
  { id: 'business', re: /business|busine?ss|start.?up|own (shop|company|firm)|partnership|vyaa?baa?ram|viyabaram|viyaabaaram|yabaram|kadai (vaikk|podu|open)|sontha? ?(tholil|thozhil)|தொழில் தொடங்க|வியாபார|வணிக|கடை (வை|திற)|சொந்த(த்)? தொழில்|கூட்டுத் தொழில்/i },
  { id: 'job_change', re: /job ?change|change (my )?job|switch(ing)? (job|company)|new company|resign|vela ?maa?(th|r)|velai ?maa?(th|r)|company maa?(th|r)|வேலை மாற்ற|வேலை மாறு|ராஜினாமா|நிறுவனம் மாற/i },
  { id: 'job', re: /get (a |any )?(good |new |better |govt |government )?job|no job|jobless|unemploy|government job|govt job|interview|(lost|lose) (my )?job|job (poi|pochu|poyi|lost|kidai|eppo)|(police|bank|it|private|railway) job|vela ?(kida|kedai|illa|varu|eppo|pochu|poi)|velai ?(kida|kedai|illa|varu|eppo|pochu|poi)|vela kidaikum|velai kidaik|udyogam|uththiyogam|அரசு வேலை|வேலை[^.?!]{0,15}கிடை|வேலை இல்லை|வேலை போய்|நேர்காணல்|உத்தியோக/i },
  { id: 'career', re: /career|promot|transfer|இடமாற்ற|salary|appraisal|\bboss\b|office|\bwork\b|\bjob\b|profession|field|teaching|become a|aavena|ஆவேனா|\bvela\b|\bvelai\b|\bvelaila\b|thozhil|tholil|padhavi|pathavi|தொழில|வேலை|அலுவலக|பதவி|சம்பள/i },
  { id: 'loan', re: /loan|debt|\bemi\b|kadan|kadana|கடன்|கடனை|கடன|அடைக்க|வட்டி/i },
  { id: 'money', re: /money|finance|financial|saving|invest|wealth|stock|share market|income|rich|pension|arrears|\bpanam\b|\bpanum\b|\bkasu\b|kaasu|semippu|varumanam|selvam|dhanam|பணம்|பணத்|பணக்|பண நிலை|பண வரவு|சேமிப்பு|முதலீடு|செல்வ|வருமான|பொருளாதார|தனம்|பென்ஷன்|ஓய்வூதிய/i },
  { id: 'property', re: /\bhouse\b|\b(own|new|buy|buying|a) home\b|\bland\b|property|\bflat\b|\bplot\b|apartment|construct|\bwill and\b|\bveedu\b|\bveetu\b|sontha? ?veedu|\bnilam\b|\bmanai\b|sothu|soththu|வீடு|நிலம்|சொத்|மனை|பிளாட்|வீடு கட்ட/i },
  { id: 'vehicle', re: /\bcar\b|bike|vehicle|scooter|\bvandi\b|vaaganam|vaganam|கார்|வாகன|பைக்|ஸ்கூட்டர்|வண்டி/i },
  { id: 'family', re: /family|parents|father|mother|brother|sister|in-?laws?|\bson\b|daughter|grand(son|daughter|children)|kudumbam|kudumba|\b(amma|appa|anna|akka|thambi|thangai|thangachi)\b|maa?miyar|naa?thanaa?r|marumagal|makkal|nimmadhi|peace at home|குடும்ப|அப்பா|அம்மா|அண்ணன்|அக்கா|தம்பி|தங்கை|பெற்றோர்|மாமியார்|நாத்தனார்|மருமகள்|மக்கள்|நிம்மதி|பேரன்|பேத்தி|பேரக்/i },
  { id: 'kuladeivam', re: /kula ?dh?e(i|y)vam|kula ?deiv|family deity|குலதெய்வ|குல தெய்வ/i },
  { id: 'temple', re: /temple|kovil|koil|கோவில|கோயில|yaa?th?irai|யாத்திரை|pilgrim|navagraha|darshan|church|mosque|masjid/i },
  { id: 'remedy', re: /parigar|pariharam|parihar|parikaram|remed|பரிகார|\bgem|gemstone|\bstone\b|rathin|ரத்தின|which planet is weak/i },
];

const normQ = (text) => String(text || '').normalize('NFC').toLowerCase().replace(/([a-z])\1{2,}/g, '$1$1').replace(/\s+/g, ' ');
/** Returns the topic id for a question (or null when it does not match any life topic). */
export function detectTopic(text) {
  const all = detectTopics(text);
  if (!all.length) return null;
  const q = normQ(text);
  // A surgery / hospital date is a health question first (deadline-first), never a muhurtham hunt.
  if (all.includes('health') && SURGERY.test(q)) return 'health';
  // "Grandchildren's studies", "kids' education" are about studies, not childbirth.
  if (all[0] === 'child' && all.includes('education') && !/pregnan|conceiv|garbam|karpam|கர்ப்ப|pirakk|பிறக்க|eppo|எப்போது|when/i.test(q)) return 'education';
  // "When will my grandchildren be born?" is a children question (read for the family, never as a fertility verdict).
  if (/pirapp|pirakk|பிறப்ப|பிறக்க|born|birth/i.test(q) && subjectOf(text)?.kind === 'grandchild') return 'child';
  return all[0];
}
/** Every topic a question touches, most specific first. */
export function detectTopics(text) {
  const q = normQ(text);
  return TOPICS.filter((t) => t.re.test(q)).map((t) => t.id);
}

/**
 * Whose life the question is about, when it is not the chart owner: { kind: 'child'|'grandchild'|'childInLaw'|'spouse'|'parent', en, ta }
 * ("en ponnukku kalyanam", "my son's marriage", "மகளுக்கு", "பேரன்"). Null for the person's own question.
 */
export function subjectOf(text) {
  const q = normQ(text);
  if (/grand ?(son|daughter|child)|\bperan\b|\bpethi\b|peththi|பேரன்|பேத்தி|பேரக்குழந்தை|பேரப்பிள்ளை/i.test(q)) return { kind: 'grandchild', en: 'your grandchild', ta: 'பேரக்குழந்தை', taOf: 'பேரக்குழந்தையின் விஷயம்' };
  if (/marumagal|maru ?magal|daughter-in-law|மருமகள்|மருமகன்|son-in-law/i.test(q)) return { kind: 'childInLaw', en: 'your son / daughter-in-law', ta: 'மருமகள் / மருமகன்', taOf: 'மருமகள் / மருமகன் விஷயம்' };
  if (/\b(my|our|en|enga|engal|ennoda)\s+(son|daughter|kids?|children|boy|girl|magan|magal|paiyan|ponnu|pullai|pasanga)\b|(son|daughter)'s\b|\bmy (son|daughter)\b|மகனுக்கு|மகளுக்கு|என் மகன்|என் மகள்|எங்கள் மகன்|எங்கள் மகள்|மகனின்|மகளின்|\b(magan|magal)(ukku|uku|oda|in)\b|\b(en|enga|engal|ennoda)\s+(paiyan|magan|magal|pullai|pasanga)\w*|\bponnu ?k?ku\b[^.?!]{0,30}(varan|mapp?illai|kalyanam|aachu|vayasu)|\bpaiyan(ukku|uku)\b[^.?!]{0,30}(ponnu|kalyanam)/i.test(q)) {
    const daughter = /daughter|magal|ponnu|girl|மகள/i.test(q);
    return { kind: 'child', daughter, en: daughter ? 'your daughter' : 'your son', ta: daughter ? 'உங்கள் மகள்' : 'உங்கள் மகன்', taTo: daughter ? 'உங்கள் மகளுக்கு' : 'உங்கள் மகனுக்கு', taOf: daughter ? 'உங்கள் மகளின் விஷயம்' : 'உங்கள் மகனின் விஷயம்' };
  }
  return null;
}

/** The faith used for wording: a faith named in the question itself ("Insha Allah", "கர்த்தர்") wins, else the profile's. */
export function faithFor(profileFaith, text = '') {
  const q = normQ(text);
  if (/\b(jesus|christ|christian|church|lord jesus|amen)\b|கர்த்தர்|இயேசு|கிறிஸ்து|தேவாலய/i.test(q)) return 'christian';
  if (/\b(allah|insha ?allah|inshallah|alhamdulillah|nikah|nikkah|dua|mosque|masjid|muslim)\b|அல்லாஹ்|இறைவன் நாடினால்|நிக்காஹ்/i.test(q)) return 'muslim';
  return profileFaith || 'hindu';
}

// Hindu traditional wording (deities, temples, mantras, poojas). A person of another faith (or none) is never pushed
// these: such lines are swapped for practice that fits every faith (shared/faith.js).
// Natural Tamil "for <topic>" (dative) used in the direct answer: "குழந்தை பாக்கியத்திற்கு அடுத்த சாதகமான காலம் …".
const TA_FOR = {
  second_marriage: 'மறுமணத்திற்கு', marriage: 'திருமணத்திற்கு', harmony: 'கணவன்–மனைவி ஒற்றுமைக்கு', child: 'குழந்தை பாக்கியத்திற்கு',
  job: 'வேலை கிடைக்க', career: 'தொழில் முன்னேற்றத்துக்கு', job_change: 'வேலை மாற்றத்திற்கு', business: 'தொழில் / வியாபாரத்திற்கு',
  money: 'பண வரவுக்கும் சேமிப்புக்கும்', loan: 'கடன் தீர', education: 'படிப்புக்கும் தேர்வுக்கும்', travel: 'வெளிநாட்டுப் பயணம் / விசாவுக்கு',
  property: 'வீடு, நிலம் வாங்க', vehicle: 'வாகனம் வாங்க', court: 'வழக்கு முடிவுக்கு', family: 'குடும்ப அமைதிக்கு',
  aff_marriage: 'பிள்ளையின் திருமணத்திற்கு', aff_work: 'பிள்ளையின் வேலைக்கு', aff_education: 'பிள்ளையின் படிப்புக்கு', aff_travel: 'பிள்ளை வெளியூர் / வெளிநாட்டில் அமைய', aff_grandchildren: 'பேரக்குழந்தைகளுக்கு',
};
const HINDU_RE = /murugan|shiva|siva\b|vinayag|ganapath|ganesh|lakshmi|durga|saraswath|hanuman|anjaneya|perumal|vishnu|dakshinamurth|ardhanaree|amman\b|kula deivam|navagraha|mantra|\bom\b|pooja|puja|homam|abhishek|sloka|stotra|kavasam|parigaram|pariharam|kalyanasundar|thirumanancheri|garbharaksh|sarabes|rama\b|surya|aditya|bhoomi devi|murugan|முருக|சிவ|விநாயக|கணபதி|லட்சுமி|துர்க|சரஸ்வதி|ஆஞ்சநேய|அனுமன்|பெருமாள்|விஷ்ணு|தட்சிணாமூர்த்தி|அர்த்தநாரீ|அம்மன்|குலதெய்வ|மந்திர|ஓம்|பூஜை|ஹோமம்|அபிஷேக|ஸ்லோக|ஸ்தோத்திர|கவசம்|பரிகாரம்|கோவில்|சன்னதி|ஸ்ரீ ராம|சூர்ய|ஆதித்ய|பூமாதேவி|கர்ப்பரக்ஷா|திருமணஞ்சேரி|சரபேஸ்வர/i;
export const hinduText = (s) => HINDU_RE.test(String(s || ''));
const NEUTRAL_PRAYER = T('Pray quietly in your own faith each morning, and give a little to someone in need every week', 'தினமும் காலையில் உங்கள் நம்பிக்கைப்படி அமைதியாகப் பிரார்த்தியுங்கள்; வாரம் ஒருமுறை தேவையுள்ளவருக்குச் சிறு உதவி செய்யுங்கள்');

// ------------------------------------------------------------------ topic definitions
// houses / negate / key / karakas follow the same traditional reading as shared/predict.js.
const TOPIC = {
  second_marriage: { houses: [2, 7, 11, 9], negate: [1, 6, 10], key: 7, karakas: ['Venus', 'Jupiter'],
    name: T('Second marriage', 'மறுமணம் (இரண்டாவது திருமணம்)'),
    houseWhy: T('7th (spouse), 2nd (family life), 11th and 9th (a second union, as tradition reads it)', '7-ம் வீடு (வாழ்க்கைத் துணை), 2-ம் வீடு (குடும்பம்), 11, 9-ம் வீடுகள் (இரண்டாம் இணைவு — மரபுப்படி)'),
    dos: [T('Talk openly with both families and take their blessings', 'இரு குடும்பத்தினருடனும் மனம் திறந்து பேசி ஆசி பெறுங்கள்'), T('Complete every legal formality from the earlier marriage first', 'முந்தைய திருமணத்தின் சட்ட நடைமுறைகளை முதலில் முழுமையாக முடியுங்கள்'), T('Match horoscopes with full birth details of both', 'இருவரின் முழு பிறப்பு விவரத்துடன் ஜாதகப் பொருத்தம் பாருங்கள்'), T('Fix the wedding on a Muhurtham day in the favourable period', 'சாதகமான காலத்தில் முகூர்த்த நாளில் திருமணம் நிச்சயியுங்கள்')],
    donts: [T('Do not rush because of pressure from others', 'பிறர் அழுத்தத்தால் அவசரப்பட வேண்டாம்'), T('Avoid hiding facts about the past — honesty builds the new home', 'கடந்தகாலத்தை மறைக்க வேண்டாம் — நேர்மையே புதிய வாழ்வின் அடித்தளம்'), T('Avoid Chandrashtamam and Rahu Kalam for the engagement', 'நிச்சயதார்த்தத்திற்கு சந்திராஷ்டமம், ராகு காலம் தவிர்க்கவும்')],
    remedy: T('Visit Thirumanancheri (Kalyanasundareswarar) and offer two garlands; light a ghee lamp for Mahalakshmi on Fridays.', 'திருமணஞ்சேரி கல்யாணசுந்தரேஸ்வரரைத் தரிசித்து இரண்டு மாலை சாற்றுங்கள்; வெள்ளிதோறும் மகாலட்சுமிக்கு நெய் தீபம்.'),
    follow: [T('Which month is best for the engagement?', 'நிச்சயதார்த்தத்திற்கு எந்த மாதம் சிறந்தது?'), T('Check porutham with the bride / groom', 'மணமகன் / மணமகள் பொருத்தம் பாருங்கள்'), T('How will married life be after marriage?', 'திருமணத்திற்குப் பின் வாழ்க்கை எப்படி இருக்கும்?')],
    action: { go: 'couple', label: T('Bride & groom porutham', 'மணமகன் – மணமகள் பொருத்தம்') } },
  marriage: { houses: [2, 7, 11], negate: [1, 6, 10], key: 7, karakas: ['Venus', 'Jupiter'],
    name: T('Marriage', 'திருமணம்'), houseWhy: T('7th (spouse), 2nd (family) and 11th (fulfilment)', '7-ம் வீடு (வாழ்க்கைத் துணை), 2-ம் வீடு (குடும்பம்), 11-ம் வீடு (நிறைவேற்றம்)'),
    dos: [T('Share your horoscope widely in the favourable period', 'சாதகமான காலத்தில் ஜாதகத்தைப் பரவலாகப் பகிருங்கள்'), T('Check porutham with full birth details of both', 'இருவரின் முழு பிறப்பு விவரத்துடன் பொருத்தம் பாருங்கள்'), T('Meet families on a Thursday or Friday morning', 'வியாழன் / வெள்ளி காலையில் குடும்பச் சந்திப்பு வையுங்கள்')],
    donts: [T('Do not reject a good alliance only for one porutham', 'ஒரு பொருத்தத்திற்காக மட்டும் நல்ல வரனைத் தவிர்க்க வேண்டாம்'), T('Avoid Chandrashtamam days for bride / groom seeing', 'மணமகள் / மணமகன் பார்க்க சந்திராஷ்டம நாள் தவிர்க்கவும்')],
    remedy: T('Pray to Lord Murugan with Valli–Deivanai on Tuesdays; light a lamp for Mahalakshmi on Fridays.', 'செவ்வாய்தோறும் வள்ளி–தெய்வானை சமேத முருகனை வழிபடுங்கள்; வெள்ளிதோறும் மகாலட்சுமிக்குத் தீபம்.'),
    follow: [T('Which month is best for the wedding?', 'திருமணத்திற்கு எந்த மாதம் சிறந்தது?'), T('Check porutham with the bride / groom', 'மணமகன் / மணமகள் பொருத்தம் பாருங்கள்'), T('How will married life be?', 'திருமண வாழ்க்கை எப்படி இருக்கும்?')],
    action: { go: 'couple', label: T('Bride & groom porutham', 'மணமகன் – மணமகள் பொருத்தம்') } },
  harmony: { houses: [2, 7, 11, 4], negate: [1, 6, 10], key: 7, karakas: ['Venus', 'Jupiter', 'Moon'],
    name: T('Husband–wife harmony', 'கணவன்–மனைவி ஒற்றுமை'), houseWhy: T('7th (spouse), 2nd (family), 4th (peace at home)', '7-ம் வீடு (துணை), 2-ம் வீடு (குடும்பம்), 4-ம் வீடு (வீட்டு அமைதி)'),
    dos: [T('Ten minutes of calm talk every day, without blame', 'தினமும் பத்து நிமிடம் குற்றம் சாட்டாமல் அமைதியாகப் பேசுங்கள்'), T('Visit a Shiva–Parvathi temple together on a Monday', 'திங்களன்று சேர்ந்து சிவ–பார்வதி கோவிலுக்குச் செல்லுங்கள்'), T('Plan one small happy outing this month', 'இந்த மாதம் ஒரு சிறு மகிழ்ச்சிப் பயணம் திட்டமிடுங்கள்')],
    donts: [T('Do not discuss serious issues late at night or in anger', 'இரவு நேரத்திலோ கோபத்திலோ முக்கிய விஷயம் பேச வேண்டாம்'), T('Keep others out of private quarrels', 'தனிப்பட்ட கருத்து வேறுபாடுகளில் பிறரை இழுக்க வேண்டாம்')],
    remedy: T('Light a lamp together for Ardhanareeswarar on Mondays and chant "Om Uma Maheswaraya Namaha" 11 times.', 'திங்கள்தோறும் சேர்ந்து அர்த்தநாரீஸ்வரருக்குத் தீபம் ஏற்றி "ஓம் உமா மகேஸ்வராய நமஹ" 11 முறை சொல்லுங்கள்.'),
    follow: [T('Which period brings more peace at home?', 'வீட்டில் அமைதி அதிகரிக்கும் காலம் எது?'), T('Our porutham — how strong is it?', 'எங்கள் பொருத்தம் எவ்வளவு பலம்?'), T('A simple parigaram for both of us', 'இருவருக்கும் எளிய பரிகாரம்')] },
  child: { houses: [2, 5, 11], negate: [1, 4, 10], key: 5, karakas: ['Jupiter'],
    name: T('Child blessing', 'குழந்தை பாக்கியம்'), houseWhy: T('5th (children), 2nd (family grows) and 11th (fulfilment); Jupiter is the putra karaka', '5-ம் வீடு (புத்திர ஸ்தானம்), 2-ம் வீடு (குடும்ப வளர்ச்சி), 11-ம் வீடு; புத்திர காரகர் குரு'),
    dos: [T('Keep both partners’ health routines regular and stress low', 'இருவரும் உடல்நல வழக்கத்தைச் சீராக வைத்து மன அழுத்தம் குறையுங்கள்'), T('Pray on Thursdays to Guru / Dakshinamurthy', 'வியாழன்தோறும் குரு / தட்சிணாமூர்த்தி வழிபாடு')],
    donts: [T('Do not blame each other — it is a shared journey', 'ஒருவரை ஒருவர் குற்றம் சாட்ட வேண்டாம் — இது இருவரின் பயணம்'), T('Avoid costly remedies sold with fear', 'பயமுறுத்தி விற்கப்படும் விலையுயர்ந்த பரிகாரம் தவிர்க்கவும்')],
    remedy: T('Chant the Santhana Gopala mantra; visit Garbharakshambigai at Thirukkarukavur when convenient.', 'சந்தான கோபால மந்திரம் ஜபியுங்கள்; வசதிப்படும் போது திருக்கருகாவூர் கர்ப்பரக்ஷாம்பிகை தரிசனம்.'),
    follow: [T('Which months are best?', 'எந்த மாதங்கள் சிறந்தவை?'), T('Baby names for the star', 'நட்சத்திரப்படி குழந்தைப் பெயர்கள்'), T('Parigaram for Guru (Jupiter)', 'குருவுக்கான பரிகாரம்')],
    action: { go: 'names', label: T('Baby names', 'குழந்தைப் பெயர்கள்') } },
  job: { houses: [2, 6, 10, 11], negate: [5, 8, 12], key: 10, karakas: ['Saturn', 'Sun'],
    name: T('Getting a job', 'வேலை கிடைப்பது'), houseWhy: T('10th (work), 6th (service, competition), 2nd and 11th (income)', '10-ம் வீடு (தொழில்), 6-ம் வீடு (சேவை, போட்டி), 2, 11-ம் வீடுகள் (வருமானம்)'),
    dos: [T('Apply widely in the favourable months; update your résumé this week', 'சாதகமான மாதங்களில் பரவலாக விண்ணப்பியுங்கள்; இந்த வாரம் சுயவிவரத்தைப் புதுப்பியுங்கள்'), T('Attend interviews in the Sun or Jupiter Horai', 'சூரிய / குரு ஓரையில் நேர்காணலுக்குச் செல்லுங்கள்'), T('Learn one new skill each month', 'மாதம் ஒரு புதிய திறன் கற்றுக்கொள்ளுங்கள்')],
    donts: [T('Do not pay money to anyone promising a job', 'வேலை வாங்கித் தருவதாகச் சொல்பவருக்குப் பணம் கொடுக்க வேண்டாம்'), T('Avoid starting applications in Rahu Kalam', 'ராகு காலத்தில் விண்ணப்பம் தொடங்க வேண்டாம்')],
    remedy: T('Offer water to the rising Sun daily and light a sesame-oil lamp on Saturdays; help an elder or worker each week.', 'தினமும் உதய சூரியனுக்கு அர்க்யம்; சனிக்கிழமை நல்லெண்ணெய் தீபம்; வாரம் ஒருமுறை முதியோர் / உழைப்பாளருக்கு உதவி.'),
    follow: [T('Government job or private — which suits me?', 'அரசு வேலையா தனியார் வேலையா — எது எனக்கு ஏற்றது?'), T('Good time today for an interview', 'இன்று நேர்காணலுக்கு நல்ல நேரம்'), T('Can I go abroad for work?', 'வேலைக்கு வெளிநாடு செல்லலாமா?')] },
  career: { houses: [2, 10, 11], negate: [5, 8, 12], key: 10, karakas: ['Sun', 'Saturn', 'Jupiter'],
    name: T('Career', 'தொழில் நிலை'), houseWhy: T('10th (career), 11th (gains, recognition) and 2nd (income)', '10-ம் வீடு (தொழில்), 11-ம் வீடு (லாபம், அங்கீகாரம்), 2-ம் வீடு (வருமானம்)'),
    dos: [T('Take on visible responsibility; keep your word at work', 'கண்ணுக்குத் தெரியும் பொறுப்பை ஏற்றுக்கொள்ளுங்கள்; சொன்ன சொல் தவறாதீர்கள்'), T('Ask for the promotion / review in the favourable window', 'சாதகமான காலத்தில் பதவி உயர்வு / மதிப்பாய்வு கேளுங்கள்'), T('Start important meetings in the Sun or Jupiter Horai', 'முக்கிய கூட்டங்களைச் சூரிய / குரு ஓரையில் தொடங்குங்கள்')],
    donts: [T('Avoid office politics and sharp words with seniors', 'அலுவலக அரசியல், மேலதிகாரிகளிடம் கடுஞ்சொல் தவிர்க்கவும்'), T('Do not resign in a hurry in a care period', 'கவனக் காலத்தில் அவசரமாக ராஜினாமா செய்ய வேண்டாம்')],
    remedy: T('Recite Aditya Hrudayam on Sundays; light a sesame-oil lamp for Lord Shani on Saturdays.', 'ஞாயிறு ஆதித்ய ஹிருதயம்; சனிக்கிழமை சனி பகவானுக்கு நல்லெண்ணெய் தீபம்.'),
    follow: [T('Which profession suits my chart?', 'என் ஜாதகத்திற்கு எந்தத் தொழில் ஏற்றது?'), T('Is a job change good for me now?', 'இப்போது வேலை மாற்றம் நல்லதா?'), T('When will my salary increase?', 'சம்பளம் எப்போது உயரும்?')] },
  job_change: { houses: [3, 5, 9, 10], negate: [6, 11], key: 10, karakas: ['Rahu', 'Saturn'],
    name: T('Job change', 'வேலை மாற்றம்'), houseWhy: T('10th (career), 3rd and 9th (movement, new paths), 5th (new role)', '10-ம் வீடு (தொழில்), 3, 9-ம் வீடுகள் (மாற்றம், புதிய வழி), 5-ம் வீடு'),
    dos: [T('Accept the new offer in writing before resigning', 'புதிய வேலை உறுதிக் கடிதம் கையில் வந்த பின்பே ராஜினாமா'), T('Sign the offer in a good Horai', 'நல்ல ஓரையில் ஒப்பந்தம் கையெழுத்திடுங்கள்'), T('Leave on good terms — references matter', 'நல்லுறவுடன் விடைபெறுங்கள் — பரிந்துரைகள் முக்கியம்')],
    donts: [T('Do not quit only out of anger', 'கோபத்தில் மட்டும் வேலையை விட வேண்டாம்'), T('Avoid joining on a Chandrashtamam day', 'சந்திராஷ்டம நாளில் புதிய வேலையில் சேர வேண்டாம்')],
    remedy: T('Pray to Vinayagar before applying; offer arugampul (bermuda grass) on Wednesdays.', 'விண்ணப்பிக்கும் முன் விநாயகர் வழிபாடு; புதன்தோறும் அருகம்புல் சாற்றுங்கள்.'),
    follow: [T('Which profession suits my chart?', 'என் ஜாதகத்திற்கு எந்தத் தொழில் ஏற்றது?'), T('Can I go abroad for work?', 'வேலைக்கு வெளிநாடு செல்லலாமா?'), T('Can I start my own business?', 'சொந்தத் தொழில் தொடங்கலாமா?')] },
  business: { houses: [7, 10, 11, 2], negate: [6, 8, 12], key: 10, karakas: ['Mercury', 'Jupiter'],
    name: T('Business', 'வியாபாரம் / சொந்தத் தொழில்'), houseWhy: T('10th (enterprise), 7th (trade, partners), 11th (profit), 2nd (cash)', '10-ம் வீடு (தொழில்), 7-ம் வீடு (வணிகம், கூட்டாளி), 11-ம் வீடு (லாபம்), 2-ம் வீடு (பணப்புழக்கம்)'),
    dos: [T('Start or expand on a Muhurtham day in the favourable period', 'சாதகமான காலத்தில் முகூர்த்த நாளில் தொடங்குங்கள் / விரிவாக்குங்கள்'), T('Write every partnership down clearly', 'எந்தக் கூட்டுறவையும் தெளிவாக எழுத்தில் வையுங்கள்'), T('Begin small, grow step by step; keep six months of expenses aside', 'சிறிதாகத் தொடங்கி படிப்படியாக வளருங்கள்; ஆறு மாதச் செலவுக்கான சேமிப்பு வையுங்கள்')],
    donts: [T('Avoid big loans or guarantees in a care period', 'கவனக் காலத்தில் பெரிய கடன், ஜாமீன் தவிர்க்கவும்'), T('Do not sign contracts in Rahu Kalam or on Chandrashtamam', 'ராகு காலம், சந்திராஷ்டமத்தில் ஒப்பந்தம் கையெழுத்திட வேண்டாம்')],
    remedy: T('Light a lamp for Mahalakshmi on Fridays; give a little to charity from every profit.', 'வெள்ளிதோறும் மகாலட்சுமி தீபம்; ஒவ்வொரு லாபத்திலும் சிறு தானம்.'),
    follow: [T('Which business suits my chart?', 'என் ஜாதகத்திற்கு எந்தத் தொழில் ஏற்றது?'), T('Good date to start the business', 'தொழில் தொடங்க நல்ல நாள்'), T('Is a partnership good for me?', 'கூட்டுத் தொழில் எனக்கு நல்லதா?')],
    action: { go: 'muhurtham', label: T('Find a good start date', 'நல்ல தொடக்க நாள்') } },
  money: { houses: [2, 11, 9], negate: [6, 8, 12], key: 11, karakas: ['Jupiter', 'Venus'],
    name: T('Money & savings', 'பணம் & சேமிப்பு'), houseWhy: T('2nd (savings), 11th (income, gains), 9th (fortune)', '2-ம் வீடு (சேமிப்பு), 11-ம் வீடு (வருமானம், லாபம்), 9-ம் வீடு (பாக்கியம்)'),
    dos: [T('Save a fixed share of every income first', 'ஒவ்வொரு வருமானத்திலும் ஒரு பகுதியை முதலில் சேமியுங்கள்'), T('Invest in the favourable period after careful study', 'கவனமாக ஆராய்ந்து சாதகமான காலத்தில் முதலீடு செய்யுங்கள்'), T('Keep a simple monthly budget', 'எளிய மாதாந்திர வரவு-செலவுக் கணக்கு வையுங்கள்')],
    donts: [T('Avoid quick-money schemes and lending without paper', 'விரைவுப் பணத் திட்டங்கள், எழுத்தில்லாக் கடன் கொடுத்தல் தவிர்க்கவும்'), T('Do not sign financial papers in Rahu Kalam', 'ராகு காலத்தில் நிதி ஆவணம் கையெழுத்திட வேண்டாம்')],
    remedy: T('Light a ghee lamp for Mahalakshmi on Fridays and keep the cash box clean; feed a cow on Fridays when you can.', 'வெள்ளிதோறும் மகாலட்சுமிக்கு நெய் தீபம்; பணப்பெட்டியைச் சுத்தமாக வையுங்கள்; முடிந்தால் வெள்ளியன்று பசுவுக்கு உணவு.'),
    follow: [T('When will my debts clear?', 'கடன் எப்போது தீரும்?'), T('Can I buy my own house?', 'சொந்த வீடு எப்போது வாங்கலாம்?'), T('Can I start my own business?', 'சொந்தத் தொழில் தொடங்கலாமா?')] },
  loan: { houses: [6, 11, 2], negate: [12, 8], key: 6, karakas: ['Jupiter', 'Mars'],
    name: T('Clearing loans', 'கடன் தீர்வு'), houseWhy: T('6th (debts and how we overcome them), 11th (income), 2nd (savings)', '6-ம் வீடு (கடன், அதை வெல்லுதல்), 11-ம் வீடு (வருமானம்), 2-ம் வீடு (சேமிப்பு)'),
    dos: [T('Repay the highest-interest loan first', 'அதிக வட்டிக் கடனை முதலில் அடையுங்கள்'), T('Make the first big repayment on a Tuesday in the favourable months', 'சாதகமான மாதங்களில் செவ்வாயன்று பெரிய தவணையைச் செலுத்துங்கள்'), T('Talk to the lender early for a fair restructure', 'கடன் கொடுத்தவரிடம் முன்கூட்டியே பேசி நியாயமான மாற்றுவழி பெறுங்கள்')],
    donts: [T('Do not take a new loan to pay an old one', 'பழைய கடனை அடைக்க புதிய கடன் வாங்க வேண்டாம்'), T('Avoid standing guarantee for others now', 'இப்போது பிறருக்கு ஜாமீன் நிற்க வேண்டாம்')],
    remedy: T('Recite "Rina Vimochana Angaraka Stotram" on Tuesdays and offer red flowers to Lord Murugan.', 'செவ்வாய்தோறும் "ருண விமோசன அங்காரக ஸ்தோத்திரம்" சொல்லி முருகனுக்குச் சிவப்பு மலர் சாற்றுங்கள்.'),
    follow: [T('When will my income grow?', 'வருமானம் எப்போது உயரும்?'), T('Is this a good time to invest?', 'முதலீடு செய்ய இது நல்ல நேரமா?'), T('Which planet supports my money?', 'பணத்திற்கு எந்தக் கிரகம் ஆதரவு?')] },
  health: { houses: [1, 6, 11], negate: [8, 12], key: 1, karakas: ['Sun', 'Moon'], health: true,
    name: T('Health (Arokiyam)', 'ஆரோக்கியம்'), houseWhy: T('1st (body and vitality), 6th (recovery), 11th (relief); Sun and Moon give energy and calm', '1-ம் வீடு (உடல், உற்சாகம்), 6-ம் வீடு (மீட்சி), 11-ம் வீடு; சூரியன், சந்திரன் — சக்தியும் மன அமைதியும்'),
    dos: [T('Walk 30 minutes daily, sleep on time', 'தினமும் 30 நிமிட நடை, நேரத்திற்கு உறக்கம்'), T('A yearly health check-up — and see a doctor for any symptom', 'ஆண்டுதோறும் உடல் பரிசோதனை — எந்த அறிகுறிக்கும் மருத்துவரைப் பாருங்கள்'), T('Pranayama for ten minutes in the morning', 'காலையில் பத்து நிமிடம் பிராணாயாமம்')],
    donts: [T('Do not stop prescribed medicines for any remedy', 'எந்தப் பரிகாரத்திற்காகவும் மருந்தை நிறுத்த வேண்டாம்'), T('Do not wait for a “good period” to see a doctor', 'மருத்துவரைப் பார்க்க “நல்ல காலத்திற்காக”க் காத்திருக்க வேண்டாம்')],
    remedy: T('Offer water to the rising Sun and chant "Om Suryaya Namaha" 12 times; on Mondays offer milk at a Shiva temple.', 'உதய சூரியனுக்கு அர்க்யம் கொடுத்து "ஓம் சூர்யாய நமஹ" 12 முறை; திங்களன்று சிவாலயத்தில் பால் அபிஷேகம்.'),
    follow: [T('Which check-ups suit my age?', 'என் வயதுக்கு எந்தப் பரிசோதனைகள்?'), T('A simple calm daily routine', 'எளிய அமைதியான தினசரி வழக்கம்'), T('Parigaram for peace of mind', 'மன அமைதிக்கான பரிகாரம்')],
    action: { go: 'health', label: T('Health — general wellbeing', 'ஆரோக்கியம் — பொது நலம்') } },
  education: { houses: [4, 5, 9, 11], negate: [3, 8], key: 5, karakas: ['Mercury', 'Jupiter'],
    name: T('Education & exams', 'கல்வி & தேர்வு'), houseWhy: T('4th (schooling), 5th (intelligence, exams), 9th (higher studies)', '4-ம் வீடு (கல்வி), 5-ம் வீடு (அறிவு, தேர்வு), 9-ம் வீடு (உயர்கல்வி)'),
    dos: [T('Study the hardest subject in the Mercury Horai', 'கடினமான பாடத்தைப் புதன் ஓரையில் படியுங்கள்'), T('Revise early in the morning (Brahma muhurtham)', 'அதிகாலை (பிரம்ம முகூர்த்தம்) மீள்பார்வை செய்யுங்கள்'), T('Apply for courses / admissions in the favourable months', 'சாதகமான மாதங்களில் சேர்க்கைக்கு விண்ணப்பியுங்கள்')],
    donts: [T('Avoid phone late at night before exams', 'தேர்வுக்கு முன் இரவு நேரக் கைப்பேசி தவிர்க்கவும்'), T('Do not compare yourself with others', 'பிறருடன் ஒப்பிட்டு மனம் தளர வேண்டாம்')],
    remedy: T('Pray to Saraswathi and Hayagreevar; on Thursdays light a lamp for Dakshinamurthy.', 'சரஸ்வதி, ஹயக்ரீவர் வழிபாடு; வியாழன்தோறும் தட்சிணாமூர்த்திக்குத் தீபம்.'),
    follow: [T('Higher studies abroad — is it good?', 'வெளிநாட்டில் உயர்கல்வி நல்லதா?'), T('Which field suits me?', 'எந்தத் துறை எனக்கு ஏற்றது?'), T('Good time today to study', 'இன்று படிக்க நல்ல நேரம்')] },
  travel: { houses: [3, 9, 12], negate: [4, 8], key: 12, karakas: ['Rahu', 'Moon', 'Saturn'],
    name: T('Foreign travel / visa', 'வெளிநாட்டுப் பயணம் / விசா'), houseWhy: T('12th (foreign lands), 9th (long journeys), 3rd (short trips, paperwork)', '12-ம் வீடு (வெளிநாடு), 9-ம் வீடு (நெடும் பயணம்), 3-ம் வீடு (ஆவணம், முயற்சி)'),
    dos: [T('Keep every document complete; file in a good Horai', 'அனைத்து ஆவணங்களையும் முழுமையாக்கி நல்ல ஓரையில் விண்ணப்பியுங்கள்'), T('Apply in the favourable months', 'சாதகமான மாதங்களில் விண்ணப்பியுங்கள்'), T('Pray to Anjaneyar before the interview / journey', 'நேர்காணல் / பயணத்திற்கு முன் ஆஞ்சநேயர் வழிபாடு')],
    donts: [T('Do not pay unofficial agents promising a visa', 'விசா வாங்கித் தருவதாகச் சொல்லும் அதிகாரப்பூர்வமற்ற முகவர்களுக்குப் பணம் தர வேண்டாம்'), T('Avoid starting the journey in Rahu Kalam', 'ராகு காலத்தில் பயணம் தொடங்க வேண்டாம்')],
    remedy: T('Durga worship in Rahu Kalam on Tuesdays or Fridays; chant "Sri Rama Jaya Rama Jaya Jaya Rama" on the way.', 'செவ்வாய் / வெள்ளி ராகு காலத்தில் துர்கை வழிபாடு; வழியில் "ஸ்ரீ ராம ஜெய ராம ஜெய ஜெய ராம".'),
    follow: [T('When will I get PR / permanent visa?', 'நிரந்தர விசா (PR) எப்போது?'), T('Job abroad — is it good for me?', 'வெளிநாட்டு வேலை எனக்கு நல்லதா?'), T('Good date to travel', 'பயணத்திற்கு நல்ல நாள்')] },
  property: { houses: [4, 11, 2], negate: [3, 12], key: 4, karakas: ['Mars', 'Venus'],
    name: T('House & property', 'வீடு & சொத்து'), houseWhy: T('4th (home, land), 11th (gains), 2nd (savings); Mars is the karaka for land', '4-ம் வீடு (வீடு, நிலம்), 11-ம் வீடு (லாபம்), 2-ம் வீடு (சேமிப்பு); நிலத்திற்குக் காரகர் செவ்வாய்'),
    dos: [T('Before paying any advance, get the title documents and approvals checked by a lawyer and the budget by your bank', 'முன்பணம் தரும் முன் உரிமை ஆவணங்கள், அனுமதிகளை வழக்கறிஞரிடமும், பட்ஜெட்டை வங்கியிடமும் முழுமையாகச் சரிபாருங்கள்'), T('Register on a Muhurtham day in the favourable period', 'சாதகமான காலத்தில் முகூர்த்த நாளில் பதிவு செய்யுங்கள்'), T('Do Bhoomi Pooja before construction', 'கட்டுமானத்திற்கு முன் பூமி பூஜை')],
    donts: [T('Avoid property deals on Chandrashtamam or in Rahu Kalam', 'சந்திராஷ்டமம், ராகு காலத்தில் சொத்து ஒப்பந்தம் தவிர்க்கவும்'), T('Do not stretch the loan beyond a comfortable EMI', 'சௌகரியமான மாதத் தவணையைத் தாண்டிக் கடன் வாங்க வேண்டாம்')],
    remedy: T('Pray to Lord Murugan on Tuesdays with red flowers; worship Bhoomi Devi before buying land.', 'செவ்வாய்தோறும் முருகனுக்குச் சிவப்பு மலர்; நிலம் வாங்கும் முன் பூமாதேவி வழிபாடு.'),
    follow: [T('Good date for house-warming', 'கிரகப்பிரவேசத்திற்கு நல்ல நாள்'), T('When can I buy a vehicle?', 'வாகனம் எப்போது வாங்கலாம்?'), T('When will my debts clear?', 'கடன் எப்போது தீரும்?')],
    action: { go: 'muhurtham', label: T('Find a good date', 'நல்ல நாள் தேர்வு') } },
  vehicle: { houses: [4, 11, 2], negate: [3, 8, 12], key: 4, karakas: ['Venus', 'Mars'],
    name: T('Vehicle', 'வாகனம்'), houseWhy: T('4th (vehicles, comforts), 11th (gains), 2nd (savings); Venus is the karaka', '4-ம் வீடு (வாகனம், சுகம்), 11-ம் வீடு, 2-ம் வீடு; காரகர் சுக்கிரன்'),
    dos: [T('Buy in the favourable months on a good day', 'சாதகமான மாதத்தில் நல்ல நாளில் வாங்குங்கள்'), T('First drive to a Vinayagar temple', 'முதல் பயணம் விநாயகர் கோவிலுக்கு'), T('Always wear a helmet / seat belt', 'எப்போதும் தலைக்கவசம் / இருக்கைப் பட்டை')],
    donts: [T('Avoid taking delivery in Rahu Kalam', 'ராகு காலத்தில் வாகனம் பெற வேண்டாம்'), T('Do not over-stretch the EMI', 'தவணையை அதிகமாக்க வேண்டாம்')],
    remedy: T('Light a lamp for Mahalakshmi on Fridays; break a coconut at Vinayagar’s temple on the first drive.', 'வெள்ளிதோறும் மகாலட்சுமிக்குத் தீபம்; முதல் பயணத்தில் விநாயகருக்குத் தேங்காய் உடையுங்கள்.'),
    follow: [T('Which colour suits my vehicle?', 'என் வாகனத்திற்கு எந்த நிறம் ஏற்றது?'), T('Good date to buy the vehicle', 'வாகனம் வாங்க நல்ல நாள்'), T('Can I buy my own house?', 'சொந்த வீடு எப்போது வாங்கலாம்?')],
    action: { go: 'muhurtham', label: T('Find a good date', 'நல்ல நாள் தேர்வு') } },
  court: { houses: [6, 11, 1], negate: [5, 12, 8], key: 6, karakas: ['Mars', 'Sun'],
    name: T('Court case', 'வழக்கு'), houseWhy: T('6th (disputes and victory over them), 11th (success), 1st (your strength)', '6-ம் வீடு (வழக்கு, எதிர்ப்பை வெல்லுதல்), 11-ம் வீடு (வெற்றி), 1-ம் வீடு (உங்கள் பலம்)'),
    dos: [T('Attend every hearing on the date the court fixes and meet every filing deadline — follow your lawyer’s plan', 'நீதிமன்றம் நிர்ணயிக்கும் தேதியில் ஒவ்வொரு விசாரணைக்கும் செல்லுங்கள், ஒவ்வொரு தாக்கல் காலக்கெடுவையும் தவறாதீர்கள் — வழக்கறிஞர் திட்டப்படி செயல்படுங்கள்'), T('Keep every document organised; a short Murugan prayer before the hearing can bring calm', 'அனைத்து ஆவணங்களையும் ஒழுங்காக வையுங்கள்; விசாரணைக்கு முன் சிறு முருகன் வழிபாடு மன அமைதி தரும்'), T('Consider a fair settlement if your lawyer advises it', 'வழக்கறிஞர் பரிந்துரைத்தால் நியாயமான சமரசத்தையும் பரிசீலியுங்கள்')],
    donts: [T('Never miss or postpone a hearing or a legal deadline for Rahu Kalam, a good time or a favourable period', 'ராகு காலம், நல்ல நேரம் அல்லது சாதகமான காலத்துக்காக விசாரணையையோ சட்டக் காலக்கெடுவையோ ஒருபோதும் தவறவிடாதீர்கள், தள்ளிப்போடாதீர்கள்'), T('Avoid angry words with the other side', 'எதிர்தரப்பிடம் கோபமான சொற்கள் தவிர்க்கவும்')],
    practicalFirst: T('⚖️ Practical first: court dates, filing deadlines and your lawyer’s advice come first. Never miss a hearing or a legal deadline because of Prasnam, Rahu Kalam or a favourable period below. What is your real deadline?', '⚖️ நடைமுறை முதலில்: நீதிமன்றத் தேதிகள், தாக்கல் காலக்கெடுகள், உங்கள் வழக்கறிஞரின் ஆலோசனை — இவையே முதன்மை. பிரசன்னம், ராகு காலம் அல்லது கீழே உள்ள சாதகமான காலத்துக்காக விசாரணையையோ சட்டக் காலக்கெடுவையோ ஒருபோதும் தவறவிடாதீர்கள். உங்கள் உண்மையான காலக்கெடு என்ன?'),
    remedy: T('Recite Kanda Sashti Kavasam on Tuesdays; light a lamp for Sarabeswarar on Sundays in Rahu Kalam.', 'செவ்வாய்தோறும் கந்த சஷ்டி கவசம்; ஞாயிறு ராகு காலத்தில் சரபேஸ்வரருக்குத் தீபம்.'),
    follow: [T('How do I stay calm before the hearing?', 'விசாரணைக்கு முன் மன அமைதியாக இருப்பது எப்படி?'), T('Is a settlement better now?', 'இப்போது சமரசம் நல்லதா?'), T('Parigaram for Mars', 'செவ்வாய்க்கான பரிகாரம்')] },
  family: { houses: [2, 4, 9, 11], negate: [6, 8, 12], key: 4, karakas: ['Moon', 'Jupiter'],
    name: T('Family peace', 'குடும்ப அமைதி'), houseWhy: T('2nd (family), 4th (home, mother), 9th (father, blessings), 11th (siblings, support)', '2-ம் வீடு (குடும்பம்), 4-ம் வீடு (வீடு, தாய்), 9-ம் வீடு (தந்தை, ஆசி), 11-ம் வீடு (உடன்பிறப்பு)'),
    dos: [T('Eat together at least once a day', 'தினம் ஒருமுறையாவது சேர்ந்து உணவு'), T('Visit your Kula Deivam temple together', 'குலதெய்வக் கோவிலுக்குக் குடும்பமாகச் செல்லுங்கள்'), T('Give elders time and respect — their blessing is strength', 'பெரியோருக்கு நேரமும் மரியாதையும் — அவர்கள் ஆசியே பலம்')],
    donts: [T('Do not discuss property in anger', 'கோபத்தில் சொத்து விஷயம் பேச வேண்டாம்'), T('Avoid comparing family members', 'குடும்பத்தினரை ஒப்பிட வேண்டாம்')],
    remedy: T('Light a lamp at home every evening and chant "Om Namah Shivaya" together for five minutes.', 'தினமும் மாலை வீட்டில் தீபம் ஏற்றி ஐந்து நிமிடம் சேர்ந்து "ஓம் நமசிவாய".'),
    follow: [T('Family relations today', 'இன்று குடும்ப உறவு'), T('Kula Deivam worship — how?', 'குலதெய்வ வழிபாடு — எப்படி?'), T('Husband–wife harmony', 'கணவன்–மனைவி ஒற்றுமை')],
    action: { go: 'relations', label: T('Family relations today', 'இன்று குடும்ப உறவு') } },
};

// Career / job sub-topics: two career questions must not get the same reading. Each reads its own houses and
// karakas, and has its own practical steps and follow-up question (merged over TOPIC.career / TOPIC.job).
const SUB = {
  promotion: { houses: [10, 11, 2], negate: [5, 8, 12], key: 10, karakas: ['Sun', 'Jupiter'],
    name: T('Promotion', 'பதவி உயர்வு'), taFor: 'பதவி உயர்வுக்கு', houseWhy: T('10th (position), 11th (recognition, rewards) and 2nd (income); Sun rules authority', '10-ம் வீடு (பதவி), 11-ம் வீடு (அங்கீகாரம்), 2-ம் வீடு (வருமானம்); அதிகாரத்துக்குக் காரகர் சூரியன்'),
    dos: [T('Keep a short record of your results this year and share it before the review', 'இந்த ஆண்டு நீங்கள் செய்த சாதனைகளைச் சுருக்கமாகக் குறித்து, மதிப்பாய்வுக்கு முன் மேலதிகாரியிடம் பகிருங்கள்'), T('Take one visible responsibility your seniors care about', 'மேலதிகாரிகள் கவனிக்கும் ஒரு பொறுப்பை ஏற்று முடித்துக் காட்டுங்கள்'), T('Ask for the promotion talk in the favourable window, calmly and with facts', 'சாதகமான காலத்தில் அமைதியாக, உண்மைகளுடன் பதவி உயர்வு பற்றிப் பேசுங்கள்')],
    donts: [T('Avoid complaining about colleagues to get ahead', 'முன்னேற சக ஊழியர்களைக் குறை சொல்ல வேண்டாம்')],
    ask: T('Is the promotion review this year, and who decides it — your manager or a panel?', 'பதவி உயர்வு மதிப்பாய்வு இந்த ஆண்டா, யார் முடிவு செய்வார் — மேலதிகாரியா, குழுவா?') },
  salary: { houses: [2, 11, 10], negate: [6, 8, 12], key: 11, karakas: ['Jupiter', 'Venus'],
    name: T('Salary increase', 'சம்பள உயர்வு'), taFor: 'சம்பள உயர்வுக்கு', houseWhy: T('2nd (earnings), 11th (gains, increments) and 10th (work); Jupiter and Venus for wealth', '2-ம் வீடு (சம்பாத்தியம்), 11-ம் வீடு (லாபம், உயர்வு), 10-ம் வீடு (பணி); செல்வத்துக்குக் குரு, சுக்கிரன்'),
    dos: [T('Find out the market salary for your role before the appraisal talk', 'மதிப்பாய்வுக்கு முன் உங்கள் பணிக்கான சந்தை சம்பளத்தைத் தெரிந்துகொள்ளுங்கள்'), T('Add one certified skill this year — it is the strongest case for a raise', 'இந்த ஆண்டு ஒரு சான்றிதழ் திறனைச் சேர்த்துக்கொள்ளுங்கள் — சம்பள உயர்வுக்கு அதுவே வலுவான காரணம்'), T('Save the first month of any increase', 'உயர்வின் முதல் மாதத் தொகையைச் சேமியுங்கள்')],
    donts: [T('Do not borrow against an increase that is not yet in writing', 'எழுத்தில் வராத சம்பள உயர்வை நம்பிக் கடன் வாங்க வேண்டாம்')],
    ask: T('Is your appraisal this year, or are you thinking of a better-paying company?', 'இந்த ஆண்டு மதிப்பாய்வா, அல்லது அதிகச் சம்பளம் தரும் நிறுவனத்துக்கு மாற யோசிக்கிறீர்களா?') },
  boss: { houses: [10, 6, 11], negate: [8, 12], key: 10, karakas: ['Sun', 'Saturn'],
    name: T('Office relations', 'அலுவலக உறவு / மேலதிகாரி'), taFor: 'அலுவலக உறவு சீராக', houseWhy: T('10th (workplace and seniors), 6th (opposition, competition) and 11th (support from colleagues); Sun for authority figures', '10-ம் வீடு (பணியிடம், மேலதிகாரி), 6-ம் வீடு (எதிர்ப்பு, போட்டி), 11-ம் வீடு (சக ஊழியர் ஆதரவு); அதிகாரிகளுக்குக் காரகர் சூரியன்'),
    dos: [T('Put important instructions and your replies in writing (email)', 'முக்கிய உத்தரவுகளையும் உங்கள் பதில்களையும் எழுத்தில் (மின்னஞ்சல்) வையுங்கள்'), T('Ask for one calm one-to-one talk with your manager about expectations', 'எதிர்பார்ப்புகள் பற்றி மேலதிகாரியிடம் ஒருமுறை அமைதியாகத் தனியாகப் பேசுங்கள்'), T('If it is harassment, use HR or the internal complaints committee', 'தொல்லை / துன்புறுத்தல் என்றால் மனிதவளத் துறை அல்லது உள் புகார்க் குழுவை அணுகுங்கள்')],
    donts: [T('Avoid replying in anger or in front of others', 'கோபத்திலோ பிறர் முன்னிலையிலோ பதில் சொல்ல வேண்டாம்')],
    ask: T('Is it one person causing the trouble, or the whole team?', 'பிரச்சினை ஒருவரால் மட்டுமா, அல்லது முழுக் குழுவிலுமா?') },
  transfer: { houses: [3, 12, 10, 4], negate: [6, 11], key: 10, karakas: ['Moon', 'Saturn'],
    name: T('Transfer', 'இடமாற்றம்'), taFor: 'இடமாற்றத்துக்கு', houseWhy: T('3rd and 12th (moves, distant places), 10th (work) and 4th (home)', '3, 12-ம் வீடுகள் (இடம் மாறுதல், தொலைதூரம்), 10-ம் வீடு (பணி), 4-ம் வீடு (வீடு)'),
    dos: [T('Put your transfer request in writing with your family reasons', 'குடும்பக் காரணங்களுடன் இடமாற்றக் கோரிக்கையை எழுத்தில் கொடுங்கள்'), T('Check the transfer rules / counselling dates of your department', 'உங்கள் துறையின் இடமாற்ற விதிகள் / கலந்தாய்வுத் தேதிகளைப் பாருங்கள்')],
    donts: [T('Do not pay anyone who promises a transfer', 'இடமாற்றம் வாங்கித் தருவதாகச் சொல்பவருக்குப் பணம் தர வேண்டாம்')],
    ask: T('Is it a transfer you want, or one you are trying to avoid?', 'நீங்கள் விரும்பும் இடமாற்றமா, அல்லது தவிர்க்க விரும்புவதா?') },
  govt: { houses: [10, 6, 11], negate: [5, 8, 12], key: 10, karakas: ['Sun', 'Saturn'],
    name: T('Government job', 'அரசு வேலை'), taFor: 'அரசு வேலைக்கு', houseWhy: T('10th (career), 6th (service, competitive exams) and 11th (success); Sun is the karaka for government', '10-ம் வீடு (தொழில்), 6-ம் வீடு (சேவை, போட்டித் தேர்வு), 11-ம் வீடு (வெற்றி); அரசுக்குக் காரகர் சூரியன்'),
    dos: [T('Follow the official TNPSC / UPSC / SSC / bank notifications and apply before every last date', 'அதிகாரப்பூர்வ TNPSC / UPSC / SSC / வங்கி அறிவிப்புகளைப் பார்த்து, ஒவ்வொரு கடைசி தேதிக்கும் முன் விண்ணப்பியுங்கள்'), T('Solve previous years’ papers every week', 'ஒவ்வொரு வாரமும் முந்தைய ஆண்டு வினாத்தாள்களைப் பயிற்சி செய்யுங்கள்'), T('Keep certificates and community / income documents ready', 'சான்றிதழ்கள், சாதி / வருமானச் சான்றுகளைத் தயாராக வையுங்கள்')],
    donts: [T('Never pay anyone who promises a government job', 'அரசு வேலை வாங்கித் தருவதாகச் சொல்பவருக்கு ஒருபோதும் பணம் தர வேண்டாம்')],
    ask: T('Which exam are you preparing for — TNPSC, UPSC, bank, railway or police?', 'எந்தத் தேர்வுக்குத் தயாராகிறீர்கள் — TNPSC, UPSC, வங்கி, ரயில்வே, காவல்?') },
  interview: { houses: [10, 6, 3], negate: [8, 12], key: 10, karakas: ['Mercury', 'Sun'],
    name: T('Interviews', 'நேர்காணல்'), taFor: 'நேர்காணலுக்கு', houseWhy: T('10th (work), 6th (competition) and 3rd (effort, speaking); Mercury for speech', '10-ம் வீடு (பணி), 6-ம் வீடு (போட்டி), 3-ம் வீடு (முயற்சி, பேச்சு); பேச்சுக்குக் காரகர் புதன்'),
    dos: [T('Practise answers aloud with a friend the day before', 'முந்தைய நாள் நண்பருடன் சத்தமாகப் பதில் சொல்லிப் பயிற்சி செய்யுங்கள்'), T('Read about the company and keep two questions to ask them', 'நிறுவனத்தைப் பற்றிப் படித்து, அவர்களிடம் கேட்க இரண்டு கேள்விகள் வையுங்கள்')],
    donts: [T('Never skip or postpone an interview slot for Rahu Kalam — go at the time given', 'ராகு காலத்துக்காக நேர்காணலைத் தவறவிட வேண்டாம் — கொடுத்த நேரத்தில் செல்லுங்கள்')],
    ask: T('When is the interview, and for which kind of role?', 'நேர்காணல் எப்போது, எந்த வகைப் பணிக்கு?') },
  lost: { houses: [10, 6, 11, 2], negate: [8, 12], key: 10, karakas: ['Saturn', 'Sun'],
    name: T('A new job after a loss', 'வேலை இழந்த பின் புதிய வேலை'), taFor: 'புதிய வேலை அமைய',
    dos: [T('Tell your network you are looking — most jobs come through people', 'வேலை தேடுவதை உங்கள் தொடர்பில் உள்ளவர்களிடம் சொல்லுங்கள் — பெரும்பாலான வேலைகள் மனிதர்கள் வழியே வருகின்றன'), T('Keep a simple daily routine and apply to a few roles every day', 'எளிய தினசரி ஒழுங்கை வைத்து, தினமும் சில வேலைகளுக்கு விண்ணப்பியுங்கள்'), T('Check your PF / gratuity and plan three months of expenses', 'PF / கிராஜுவிட்டி பார்த்து, மூன்று மாதச் செலவுக்குத் திட்டமிடுங்கள்')],
    ask: T('What kind of work were you doing — same field again, or something new?', 'என்ன வேலை செய்து வந்தீர்கள் — அதே துறையா, புதியதா?') },
};
SUB.exam = { houses: [5, 6, 11, 4], negate: [8, 12], key: 5, karakas: ['Mercury', 'Jupiter'],
  name: T('Exam success', 'தேர்வு வெற்றி'), taFor: 'தேர்வு வெற்றிக்கு', houseWhy: T('5th (intellect, exams), 6th (competition), 11th (success) and 4th (study habits); Mercury and Jupiter for learning', '5-ம் வீடு (அறிவு, தேர்வு), 6-ம் வீடு (போட்டி), 11-ம் வீடு (வெற்றி), 4-ம் வீடு (படிப்புப் பழக்கம்); கல்விக்குப் புதன், குரு'),
  dos: [T('Solve the last five years’ question papers under exam timing', 'கடந்த ஐந்து ஆண்டு வினாத்தாள்களைத் தேர்வு நேரக் கட்டுப்பாட்டுடன் எழுதிப் பாருங்கள்'), T('Keep a weekly revision day and a mock test every Sunday', 'வாரம் ஒருநாள் மீள்பார்வை, ஒவ்வொரு ஞாயிறும் மாதிரித் தேர்வு'), T('Check the official exam notification for every date and rule', 'ஒவ்வொரு தேதி, விதிக்கும் அதிகாரப்பூர்வ தேர்வு அறிவிப்பைப் பாருங்கள்')],
  donts: [T('Do not skip sleep the week before the exam', 'தேர்வுக்கு முந்தைய வாரம் உறக்கத்தைக் குறைக்க வேண்டாம்')],
  ask: T('Which exam is it, and when is it?', 'எந்தத் தேர்வு, எப்போது?') };
const SUB_OF = { career: ['promotion', 'salary', 'boss', 'transfer', 'govt'], job: ['govt', 'interview', 'lost'], job_change: [], education: ['exam'] };

// One gentle follow-up question per topic (the fifth part of every answer).
const ASK = {
  second_marriage: T('Would you like me to look at good months for the engagement, or check porutham once you have a proposal?', 'நிச்சயதார்த்தத்திற்கு நல்ல மாதங்களைப் பார்க்கட்டுமா, அல்லது வரன் வந்ததும் பொருத்தம் பார்க்கலாமா?'),
  marriage: T('Shall I check porutham when a proposal comes, or list good months within this window?', 'வரன் வந்ததும் பொருத்தம் பார்க்கட்டுமா, அல்லது இந்தக் காலத்துக்குள் நல்ல மாதங்களைச் சொல்லட்டுமா?'),
  harmony: T('Would it help if I suggested a calm time this week for the two of you to talk?', 'இந்த வாரம் இருவரும் அமைதியாகப் பேச ஒரு நல்ல நேரத்தைச் சொல்லட்டுமா?'),
  child: T('Would you like me to note good days in this window for your doctor visits?', 'இந்தக் காலத்தில் மருத்துவர் சந்திப்புக்கு நல்ல நாட்களைக் குறித்துத் தரட்டுமா?'),
  job: T('I can point to the best months for each — which kind of job are you applying for, government or private?', 'ஒவ்வொன்றுக்கும் சிறந்த மாதங்களைச் சொல்கிறேன் — எந்த வகை வேலைக்கு முயல்கிறீர்கள், அரசு வேலையா தனியார் வேலையா?'),
  career: T('Is it a promotion in the same company or a move to a new one that you have in mind?', 'அதே நிறுவனத்தில் பதவி உயர்வா, அல்லது புதிய நிறுவனத்துக்கு மாற்றமா — எதைப் பற்றி யோசிக்கிறீர்கள்?'),
  job_change: T('Do you already have an offer in hand, or are you still looking?', 'புதிய வேலை உறுதிக் கடிதம் கையில் உள்ளதா, அல்லது இன்னும் தேடுகிறீர்களா?'),
  business: T('What kind of business are you planning, and will it be alone or with a partner?', 'எந்த வகைத் தொழில் திட்டமிடுகிறீர்கள் — தனியாகவா, கூட்டாளியுடனா?'),
  money: T('Shall I show the months that suit saving or a big purchase this year?', 'இந்த ஆண்டு சேமிப்புக்கும் பெரிய வாங்குதலுக்கும் ஏற்ற மாதங்களைக் காட்டட்டுமா?'),
  loan: T('Would you like a simple month-by-month plan to clear the highest-interest loan first?', 'அதிக வட்டிக் கடனை முதலில் அடைக்க ஒரு எளிய மாதத் திட்டம் வேண்டுமா?'),
  health: T('Would you like a calm daily routine and the check-ups suited to this age?', 'அமைதியான தினசரி வழக்கமும் இந்த வயதுக்கேற்ற பரிசோதனைகளும் வேண்டுமா?'),
  education: T('I can suggest good study times and months for applications — which subject or course is on your mind?', 'படிக்க நல்ல நேரமும் விண்ணப்பிக்க நல்ல மாதங்களும் சொல்கிறேன் — எந்தப் பாடம் / படிப்பைப் பற்றி யோசிக்கிறீர்கள்?'),
  travel: T('Which country and which kind of visa are you applying for?', 'எந்த நாட்டுக்கு, எந்த வகை விசாவுக்கு விண்ணப்பிக்கிறீர்கள்?'),
  property: T('I can find a good registration date in the window — are you looking at a ready house, a flat or land?', 'இந்தக் காலத்தில் பதிவுக்கு நல்ல நாளைத் தேடித் தருகிறேன் — தயாரான வீடா, பிளாட்டா, நிலமா?'),
  vehicle: T('Shall I find a good delivery date for the vehicle?', 'வாகனம் வாங்க (டெலிவரி) நல்ல நாளைத் தேடித் தரட்டுமா?'),
  court: T('I will keep every suggestion around your court dates, never instead of them — when is your next hearing?', 'நீதிமன்றத் தேதிகளைச் சுற்றியே ஆலோசனை தருவேன், அவற்றுக்குப் பதிலாக அல்ல — உங்கள் அடுத்த விசாரணை எப்போது?'),
  family: T('I can suggest a calm day to talk — who would you most like peace with first?', 'பேச ஒரு அமைதியான நாளைச் சொல்கிறேன் — முதலில் யாருடன் சமாதானம் வேண்டும்?'),
};
// Opening line when the person is waiting, worried or has had a loss: understanding first, never a verdict.
const EMPATHY = {
  child: T('I understand how hard this wait is. A delay in children is common today and is not a verdict on you — many couples are blessed after a wait.', 'புரிகிறது — இந்தக் காத்திருப்பு எவ்வளவு கஷ்டம் என்று. குழந்தை தாமதம் இன்று பலருக்கும் இயல்பானது; இது உங்கள் மீதான தீர்ப்பு அல்ல — காத்திருந்த பின் பாக்கியம் பெற்ற தம்பதியர் பலர்.'),
  marriage: T('I understand — a delay in marriage is common and is not a verdict on you; the right alliance often comes in its own time.', 'புரிகிறது — திருமணத் தாமதம் பலருக்கும் இயல்பானது; இது உங்கள் மீதான தீர்ப்பு அல்ல. சரியான வரன் அதன் நேரத்தில் அமையும்.'),
  job: T('I understand — losing or waiting for a job is hard, and it happens to many good people; it is not a verdict on you.', 'புரிகிறது — வேலை போவதும் காத்திருப்பதும் கஷ்டம்தான்; பல நல்லவர்களுக்கும் இது நடக்கிறது. இது உங்கள் மீதான தீர்ப்பு அல்ல.'),
  default: T('I understand this worry — many families go through it, and it does pass.', 'புரிகிறது — இந்தக் கவலை பல குடும்பங்களுக்கும் உண்டு; இதுவும் கடந்து போகும்.'),
};
const WORRY_RE = /late|delay|thalli|தள்ளி|தாமத|still|innum|இன்னும்|\byet\b|lost|poiduchu|pochu|போய்விட்|\bloss\b|nasht|நஷ்ட|kasht|கஷ்ட|thollai|தொல்லை|worr|bayam|பயம்|kavalai|கவலை|cancel|\bwhy\b|ஏன்|karanam|காரணம்|இனிமேல்|mudiyala|முடியல|thaangala|வயதாகிறது|aachu|illama|இல்லாம|kandukala|not (accept|returning)|lonely|alone|trying/i;
// Extra practical lines (added to the topic's own "do" list).
const EXTRA_DOS = {
  child: [T('Keep a simple record of cycles and test reports to show the doctor; go for check-ups together', 'மருத்துவரிடம் காட்ட மாதவிடாய் நாட்களையும் பரிசோதனை அறிக்கைகளையும் எளிதாகக் குறித்து வையுங்கள்; பரிசோதனைக்கு இருவரும் சேர்ந்து செல்லுங்கள்')],
  travel: [T('Check visa rules only on the official embassy / VFS website, and never pay an agent who promises a visa', 'விசா விதிகளை அதிகாரப்பூர்வ தூதரக / VFS இணையதளத்தில் மட்டும் பாருங்கள்; விசா உறுதி தருவதாகச் சொல்லும் முகவருக்குப் பணம் தர வேண்டாம்')],
  loan: [T('Pay every EMI and due on time — never delay a payment for a good time or Rahu Kalam', 'ஒவ்வொரு EMI-யையும் நிலுவையையும் உரிய நேரத்தில் செலுத்துங்கள் — நல்ல நேரம், ராகு காலத்துக்காகக் கட்டணத்தை ஒருபோதும் தாமதப்படுத்தாதீர்கள்')],
  money: [T('Pay every EMI and due on time, and keep three months of expenses aside', 'ஒவ்வொரு EMI-யையும் உரிய நேரத்தில் செலுத்துங்கள்; மூன்று மாதச் செலவுக்கான பணத்தைத் தனியாக வையுங்கள்')],
  harmony: [T('If talking alone does not help, meet a family counsellor together (Tele-MANAS 14416 is free)', 'தனியாகப் பேசி தீரவில்லை என்றால், இருவரும் சேர்ந்து குடும்ப ஆலோசகரைச் சந்தியுங்கள் (டெலி-மனஸ் 14416 இலவசம்)')],
  family: [T('Speak to one person at a time, calmly, without bringing up old quarrels', 'ஒரு நேரத்தில் ஒருவரிடம், பழைய சண்டைகளை எடுக்காமல், அமைதியாகப் பேசுங்கள்')],
  court: [T('Ask your lawyer about mediation or Lok Adalat if a fair settlement is possible', 'நியாயமான சமரசம் சாத்தியமா என்று மத்தியஸ்தம் / லோக் அதாலத் பற்றி வழக்கறிஞரிடம் கேளுங்கள்')],
  job: [T('Register on the official government job portals (TNPSC, employment exchange) and never pay anyone for a job', 'அதிகாரப்பூர்வ அரசு வேலை இணையதளங்களில் (TNPSC, வேலைவாய்ப்பு அலுவலகம்) பதிவு செய்யுங்கள்; வேலைக்காக யாருக்கும் பணம் தர வேண்டாம்')],
};
// Readings about a son / daughter / grandchild from the parent's own chart (5th house = children, and the houses
// counted from it). Their own horoscope gives the clearest reading — the answer always says so.
const AFFAIR_OF = { marriage: 'marriage', second_marriage: 'marriage', job: 'work', career: 'work', job_change: 'work', business: 'work', education: 'education', travel: 'travel', child: 'grandchildren' };
const CHILD_AFFAIRS = {
  marriage: { houses: [11, 5, 7], negate: [6, 8, 12], key: 11, karakas: ['Jupiter', 'Venus'], name: T('your child’s marriage', 'பிள்ளையின் திருமணம்'),
    houseWhy: T('5th (children) and 11th — the 7th counted from the 5th, which tradition reads for a child’s marriage', '5-ம் வீடு (பிள்ளைகள்), 11-ம் வீடு — 5-ம் வீட்டிலிருந்து 7-வது; பிள்ளையின் திருமணத்திற்கு மரபுப்படி பார்க்கப்படுவது') },
  work: { houses: [2, 5, 10], negate: [8, 12], key: 2, karakas: ['Jupiter', 'Saturn'], name: T('your child’s work', 'பிள்ளையின் வேலை'),
    houseWhy: T('5th (children) and 2nd — the 10th counted from the 5th, read for a child’s career', '5-ம் வீடு (பிள்ளைகள்), 2-ம் வீடு — 5-லிருந்து 10-வது; பிள்ளையின் தொழிலுக்கு') },
  education: { houses: [9, 5, 4], negate: [8, 12], key: 9, karakas: ['Jupiter', 'Mercury'], name: T('your child’s studies', 'பிள்ளையின் படிப்பு'),
    houseWhy: T('5th (children) and 9th — the 5th counted from the 5th, read for a child’s learning', '5-ம் வீடு (பிள்ளைகள்), 9-ம் வீடு — 5-லிருந்து 5-வது; பிள்ளையின் கல்விக்கு') },
  travel: { houses: [4, 5, 12], negate: [8], key: 4, karakas: ['Jupiter', 'Rahu'], name: T('your child’s life abroad', 'பிள்ளையின் வெளிநாட்டு வாழ்க்கை'),
    houseWhy: T('5th (children) and 4th — the 12th counted from the 5th, read for a child settling far away', '5-ம் வீடு (பிள்ளைகள்), 4-ம் வீடு — 5-லிருந்து 12-வது; பிள்ளை வெளியூர் / வெளிநாட்டில் அமைவதற்கு') },
  grandchildren: { houses: [9, 5, 11], negate: [8, 12], key: 9, karakas: ['Jupiter'], name: T('grandchildren in the family', 'குடும்பத்தில் பேரக்குழந்தைகள்'),
    houseWhy: T('5th (children) and 9th — the 5th from the 5th, read for grandchildren; Jupiter is the putra karaka', '5-ம் வீடு (பிள்ளைகள்), 9-ம் வீடு — 5-லிருந்து 5-வது, பேரக்குழந்தைகளுக்கு; புத்திர காரகர் குரு') },
};

// ------------------------------------------------------------------ chart reading helpers (memoised: the same chart
// is asked many questions, and Ask Thunai must answer instantly on a phone)
const houseOf = (from, rasi) => ((rasi - from + 12) % 12) + 1;
const memo = new WeakMap();
const cached = (chart, key, fn) => {
  let m = memo.get(chart);
  if (!m) { m = new Map(); memo.set(chart, m); }
  if (!m.has(key)) { m.set(key, fn()); if (m.size > 400) m.delete(m.keys().next().value); }
  return m.get(key);
};
function fromMoonChart(chart) {
  return cached(chart, 'moonChart', () => ({ ...chart, planets: { ...chart.planets, Lagna: { ...chart.planets.Lagna, rasi: chart.planets.Moon.rasi } } }));
}
const posCache = new Map();
function positionsOn(t) {
  const k = Math.floor(t / DAY);
  if (!posCache.has(k)) { posCache.set(k, planetPositions(new Date(k * DAY + DAY / 2)).planets); if (posCache.size > 4000) posCache.delete(posCache.keys().next().value); }
  return posCache.get(k);
}
function transitSupport(chart, keyHouse, t) {
  const planets = positionsOn(t);
  const res = {};
  const targets = [(chart.planets.Lagna || chart.planets.Moon).rasi, chart.planets.Moon.rasi].map((ref) => (ref + keyHouse - 1) % 12);
  for (const g of ['Jupiter', 'Saturn']) res[g] = ASPECTS[g].some((a) => targets.includes((planets[g].rasi + a - 1) % 12));
  return res;
}

/** Dasa–Bhukti windows in the next `years` years that activate the topic, with Jupiter/Saturn transit months. */
function windowsFor(chart, q, { from = new Date(), years = REPORT_YEARS.ask } = {}) {
  const key = `w|${q.houses.join(',')}|${(q.negate || []).join(',')}|${q.key}|${q.karakas.join(',')}|${Math.floor(from.getTime() / DAY)}|${years}`;
  return cached(chart, key, () => {
    const sig = cached(chart, 'sig', () => significations(chart));
    const end = new Date(from.getTime() + years * YEAR);
    const out = [];
    let current = null;
    for (const md of chart.dasa.periods) {
      if (md.end < from || md.start > end) continue;
      const mdS = planetScore(sig, md.lord, q);
      for (const ad of md.bhuktis) {
        if (ad.end < from || ad.start > end) continue;
        const adS = planetScore(sig, ad.lord, q);
        const dasaScore = mdS * 0.4 + adS * 0.6;
        const s = new Date(Math.max(ad.start, from)), e = new Date(Math.min(ad.end, end));
        const entry = { md: md.lord, ad: ad.lord, start: s, end: e, dasaScore };
        if (from >= ad.start && from < ad.end) current = entry;
        if (dasaScore <= 0.5) continue;
        let both = 0, jup = 0, first = null, last = null;
        // Sample on a fixed 45-day grid so that the transit look-ups are shared between questions.
        const t0 = Math.ceil(s.getTime() / (45 * DAY)) * 45 * DAY;
        for (let t = t0; t < e.getTime(); t += 45 * DAY) {
          const tr = transitSupport(chart, q.key, t);
          if (tr.Jupiter) { jup++; first ||= t; last = t; }
          if (tr.Jupiter && tr.Saturn) both++;
        }
        out.push({ ...entry, score: dasaScore * 0.75 + (both ? 2 : jup ? 1 : 0) * 1.6, doubleTransit: both > 0, jupiter: jup > 0,
          peakFrom: first ? new Date(Math.max(first, s.getTime())) : s, peakTo: last ? new Date(Math.min(last + 45 * DAY, e.getTime())) : e });
      }
    }
    const best = [...out].sort((a, b) => b.score - a.score).slice(0, 3).sort((a, b) => a.start - b.start);
    return { best, current, currentScore: current ? current.dasaScore : 0 };
  });
}

// Slow-planet sign spans (Guru / Sani peyarchi), shared by every question asked in the same week.
const spanCache = new Map();
function signSpans(planet, from, to) {
  const key = `${planet}|${Math.floor(from.getTime() / (7 * DAY))}|${Math.floor(to.getTime() / (7 * DAY))}`;
  if (!spanCache.has(key)) {
    let rasi = positionsOn(from.getTime())[planet].rasi;
    let start = from;
    const spans = [];
    for (const ev of ingresses(planet, from, to)) { spans.push({ start, end: ev.date, rasi }); start = ev.date; rasi = ev.toRasi; }
    spans.push({ start, end: to, rasi });
    spanCache.set(key, spans);
    if (spanCache.size > 50) spanCache.delete(spanCache.keys().next().value);
  }
  return spanCache.get(key);
}
/**
 * Birth star / time unknown: Jupiter's transit (Guru peyarchi) counted from the Moon sign is the traditional
 * fallback for timing. Returns windows when Jupiter occupies or aspects the topic's key house from the Moon.
 */
function transitWindows(moonRasi, keyHouse, from, years = REPORT_YEARS.ask) {
  const target = (moonRasi + keyHouse - 1) % 12;
  const spans = signSpans('Jupiter', from, new Date(from.getTime() + years * YEAR))
    .filter((s) => s.end - s.start > 45 * DAY && ASPECTS.Jupiter.some((a) => (s.rasi + a - 1) % 12 === target));
  const merged = [];
  for (const s of spans) {
    const last = merged[merged.length - 1];
    if (last && s.start - last.end < 60 * DAY) last.end = s.end; else merged.push({ ...s });
  }
  return merged.slice(0, 3).map((s) => ({ start: s.start, end: s.end, peakFrom: s.start, peakTo: s.end, transitOnly: true, jupiter: true }));
}

const monthYear = (d, lang) => `${(lang === 'ta' ? MONTHS_TA : MONTHS_EN)[new Date(d).getUTCMonth()]} ${new Date(d).getUTCFullYear()}`;
const pn = (k, lang) => (lang === 'ta' ? PLANETS[k].ta : k);
const ordEn = (n) => `${n}${n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th'}`;
const fixOrd = (t) => String(t).replace(/\b(\d+)th\b/g, (_, n) => ordEn(Number(n)));
const pick = (o, lang) => (o ? (lang === 'ta' ? o.ta : o.en) : '');
const textOf = (sections) => sections.map((s) => `${s.title}:\n${s.lines.map((l) => `• ${l}`).join('\n')}`).join('\n\n');
const ASK_TITLE = T('A question for you', 'உங்களிடம் ஒரு கேள்வி');
const LIMITS_TITLE = T('Limits', 'வரம்பு');

/** Faith-aware practice lines: Hindu tradition for Hindus; prayer in one's own faith, charity and discipline for others. */
function faithLines(lines, faith, lang, planet) {
  if (isHinduFaith(faith)) return lines;
  const out = lines.filter((l) => !hinduText(l));
  if (out.length < lines.length && !out.includes(pick(NEUTRAL_PRAYER, lang))) out.push(pick(NEUTRAL_PRAYER, lang));
  return out.length ? out : [pick(universalPractice(planet), lang)];
}
function remedyFor(def, faith, lang, planet) {
  if (isHinduFaith(faith)) return [pick(def.remedy, lang)];
  const bl = faithBlessing(faith === 'auto' ? 'other' : faith) || faithBlessing('other');
  return [pick(universalPractice(planet), lang), pick(bl, lang)];
}

/**
 * Build the answer for a life topic. Returns the same shape the chat bubble renders:
 * { intent, topic, text, sections: [{ key, title, lines }], meter, actions, followups }.
 * Sections: answer (direct answer) · chart (what the chart shows) · periods (when, with dates) · dos / donts ·
 * remedy (one simple practice suited to the person's faith) · ask (a gentle follow-up question) · limits.
 */
export function topicAnswer({ topic, question, chart, rel = {}, lang = 'ta', name = '', life = {}, today = null, now = new Date(), turns = [], speaker = null, subject = undefined, qt = null }) {
  if (SPECIAL[topic]) return SPECIAL[topic]({ topic, question, chart, rel, lang, name, life, today, now, turns, speaker });
  const base = TOPIC[topic];
  const L = (en, ta) => (lang === 'ta' ? ta : en);
  if (!base || !chart) return null;
  rel = rel || {};
  const certainty = rel?.certainty || 'exact';
  // POLICY FIRST: romance / marriage / attraction toward a minor is declined, and a speaker who says they are under
  // 18 gets the child / teen answer — before any house, dasa or meter is computed (shared/age-guard.js).
  const gate = policyAnswer(facilitationCheck(question, { turns, speaker }), { lang, question, topic, name });
  if (gate) return validateOffline({ ...gate, topic: gate.topic || topic }, { lang, inputCertainty: certainty });
  // AGE FIRST: the chart owner's age decides whether this topic is read at all. A child's chart is never
  // scored, timed or given a meter for marriage, job, money, court …: it gets a warm, age-appropriate reply.
  const profile = ageProfile(life.birthDate || chart, { now, tz: chart.tz });
  const faith = faithFor(life.faith, question);
  if (!topicAllowed(topic, profile)) return validateOffline({ ...ageGuardAnswer({ topic, profile, lang, name, question, faith }), topic }, { lang, inputCertainty: certainty });
  const subj = subject === undefined ? subjectOf(question) : subject;
  // A son's / daughter's / grandchild's matter is read from the parent's 5th house and the houses counted from it.
  // An older person asking about children (with no other subject named) is asking about grandchildren.
  const affairKey = AFFAIR_OF[topic];
  const elderKids = topic === 'child' && !subj && profile.age != null && profile.age >= 50;
  const aboutChild = subj && ['child', 'grandchild', 'childInLaw'].includes(subj.kind) && affairKey ? subj : elderKids ? { kind: 'grandchild', implied: true } : null;
  const aff = aboutChild ? CHILD_AFFAIRS[topic === 'child' ? 'grandchildren' : affairKey] : null;
  // The KIND of question (which / when / will / why / how / choice / status) decides the answer's shape, and the
  // career / job sub-topic (promotion, salary, office relations, transfer, government job …) decides what is read.
  qt = qt || questionType(question);
  const subId = aff ? null : subTopic(topic, question);
  const subDef = subId && SUB_OF[topic]?.includes(subId) ? SUB[subId] : null;
  let def = aff ? { ...base, ...aff } : subDef ? { ...base, ...subDef, donts: subDef.donts || base.donts } : base;
  // Tradition: for a woman's chart the husband is read from Jupiter, for a man's chart the wife from Venus.
  if (!aff && ['marriage', 'second_marriage'].includes(topic) && life.gender === 'female') def = { ...def, karakas: ['Jupiter', 'Venus'] };
  const useLagna = rel.lagna !== false;
  const c = useLagna ? chart : fromMoonChart(chart);
  const q = { houses: def.houses, negate: def.negate, key: def.key, karakas: def.karakas };
  const bh = cached(c, 'bhava', () => bhavaAnalysis(c));
  const strength = cached(c, 'strength', () => Object.fromEntries(grahaStrength(c.planets).map((g) => [g.planet, g])));
  const promise = Math.round(def.houses.reduce((s, h) => s + bh[h - 1].score, 0) / def.houses.length * 0.6
    + def.karakas.reduce((s, k) => s + (strength[k]?.score ?? 50), 0) / def.karakas.length * 0.4);
  const dasaOk = rel.nakshatra !== false;
  let { best, current, currentScore } = dasaOk ? windowsFor(c, q, { from: now }) : { best: [], current: null, currentScore: 0 };
  // No usable dasa (birth star uncertain) or no supportive dasa window: Jupiter's transit from the Moon sign.
  let transitOnly = false;
  if (!best.length && rel.rasi !== false && !def.health) {
    try { best = transitWindows(chart.planets.Moon.rasi, def.key, now); transitOnly = best.length > 0; } catch { best = []; }
  }
  let tr = null;
  try { tr = cached(chart, `tr|${Math.floor(now.getTime() / DAY)}`, () => transitStatus(chart, now, { faith: life.faith, age: ageProfile(life.birthDate || chart, { now, tz: chart.tz }).age })); } catch { /* ephemeris unavailable */ }
  const guru = tr?.status?.some((s) => s.id === 'guru_balam');
  const activeNow = currentScore > 1;
  const nextWin = best.find((w) => w.end > now) || null;
  const nowWin = best.find((w) => w.start <= now && w.end > now) || (activeNow ? current : null);
  const pct = Math.max(45, Math.min(92, Math.round(promise * 0.7 + (activeNow ? 14 : 4) + (guru ? 6 : 0) + (best.length ? 4 : 0))));
  const level = pct >= 72 ? 'high' : pct >= 58 ? 'mid' : 'low';
  const who = name ? `${name}, ` : '';
  const tname = pick(def.name, lang);
  const winText = (w) => `${monthYear(w.peakFrom || w.start, lang)} – ${monthYear(w.peakTo || w.end, lang)}`;
  const lordsText = (w) => (w.transitOnly ? L('Jupiter transit', 'குரு கோசாரம்') : L(`${w.md} Dasa, ${w.ad} Bhukti`, `${pn(w.md, 'ta')} தசை, ${pn(w.ad, 'ta')} புக்தி`));
  const later = best.filter((w) => w !== nowWin && w !== nextWin && w.start > now);

  // 1) Direct answer — understanding first when the person is waiting or worried, then the answer to the question.
  const answer = [];
  const worried = topic === 'child' || WORRY_RE.test(question);
  if (worried && !def.health) answer.push(pick(aboutChild ? EMPATHY.default : EMPATHY[topic === 'second_marriage' ? 'marriage' : topic === 'job_change' || topic === 'career' ? 'job' : topic] || EMPATHY.default, lang));
  if (def.practicalFirst) answer.push(pick(def.practicalFirst, lang));
  if (aboutChild && !aboutChild.implied) {
    answer.push(L(`The clearest reading for ${subj.en} comes from their own horoscope — add them in Family and ask again. From your chart, tradition reads the 5th house (children) and the house counted from it.`,
      `${subj.taOf} பற்றி மிகத் தெளிவான பலன் அவருடைய சொந்த ஜாதகத்திலிருந்தே — குடும்பம் பகுதியில் அவரைச் சேர்த்து மீண்டும் கேளுங்கள். உங்கள் ஜாதகத்தில் மரபுப்படி 5-ம் வீடும் (பிள்ளைகள்) அதிலிருந்து எண்ணப்படும் வீடும் பார்க்கப்படுகின்றன.`));
  } else if (aboutChild?.implied) {
    answer.push(L(`At ${profile.age}, tradition reads the 5th house for the children and grandchildren in your family — not for new childbirth timing.`, `${profile.age} வயதில், 5-ம் வீடு உங்கள் குடும்பத்தின் பிள்ளைகள், பேரக்குழந்தைகளுக்காகவே பார்க்கப்படுகிறது — புதிய குழந்தைப் பிறப்பு நேரத்திற்காக அல்ல.`));
  }
  const lead = answer.splice(0);
  const second = later[0] ? L(`; another supportive window is ${winText(later[0])}`, `; அதன் பின் ${winText(later[0])}`) : '';
  const taFor = subDef?.taFor || TA_FOR[aff ? `aff_${topic === 'child' ? 'grandchildren' : affairKey}` : topic] || `${pick(def.name, 'ta')} விஷயத்திற்கு`;
  if (def.health) {
    // Health is never read from the chart: general wellbeing first (needs medical review), then an optional practice.
    answer.push(L(`${who}your horoscope does not decide your health, and it is the same in every period: regular sleep, water, a daily walk and age-suited check-ups — and see a doctor for any symptom.`, `${who}உங்கள் ஆரோக்கியத்தை ஜாதகம் தீர்மானிப்பதில்லை; எல்லாக் காலத்திலும் ஒன்றே: சீரான உறக்கம், தண்ணீர், தினசரி நடை, வயதுக்கேற்ற பரிசோதனைகள் — எந்த அறிகுறிக்கும் மருத்துவரைப் பாருங்கள்.`));
  } else if (nowWin) {
    answer.push(L(`${who}the period running now supports ${tname.toLowerCase()} — the best window is ${winText(nowWin)} (${lordsText(nowWin)})${second}. Make your efforts in this time.`,
      `${who}இப்போது நடக்கும் காலமே ${taFor} சாதகமாக உள்ளது — சிறந்த காலம் ${winText(nowWin)} (${lordsText(nowWin)})${second}. இந்தக் காலத்தில் முயற்சிகளைச் செய்யுங்கள்.`));
  } else if (nextWin) {
    answer.push(L(`${who}the next supportive period for ${tname.toLowerCase()} in your chart is ${winText(nextWin)} (${lordsText(nextWin)})${second}. Prepare from now so you are ready by then.`,
      `${who}உங்கள் ஜாதகப்படி ${taFor} அடுத்த சாதகமான காலம் ${winText(nextWin)} (${lordsText(nextWin)})${second}. இப்போதிருந்தே தயாராகுங்கள்.`));
    if (transitOnly) answer.push(L('These dates follow Jupiter’s transit from your Moon sign, because the birth time (and so the dasa) is not known exactly.', 'பிறந்த நேரம் (அதனால் தசை) உறுதியாகத் தெரியாததால், இந்தத் தேதிகள் உங்கள் சந்திர ராசியிலிருந்து குருவின் கோசாரப்படி.'));
  } else {
    answer.push(L(`${who}no strongly marked window shows in the next ${REPORT_YEARS.ask} years by this method — steady effort and the practical steps below matter most, in every period.`, `${who}இந்த முறைப்படி அடுத்த ${REPORT_YEARS.ask} ஆண்டுகளில் வலுவாகக் குறிக்கப்பட்ட காலம் இல்லை — தொடர் முயற்சியும் கீழே உள்ள நடைமுறை வழிகளுமே எல்லாக் காலத்திலும் முக்கியம்.`));
  }
  const timing = answer.splice(0);
  if (topic === 'child') answer.push(L('Alongside prayer, please meet a fertility specialist together as a couple — that is where real help is. A horoscope only shows supportive timing; it never decides whether you will have a child.', 'வழிபாட்டுடன், தம்பதியராகச் சேர்ந்து கருவுறுதல் / மகப்பேறு மருத்துவரை அணுகுங்கள் — உண்மையான உதவி அங்கேதான். ஜாதகம் சாதகமான காலத்தை மட்டுமே காட்டும்; குழந்தை பாக்கியத்தைத் தீர்மானிப்பதில்லை.'));
  if (topic === 'second_marriage' && life.maritalStatus === 'married') {
    answer.push(L('If you are still married, first complete the legal separation with dignity; then the new beginning will be peaceful.', 'தற்போது திருமண பந்தத்தில் இருந்தால், முதலில் சட்டப்படியான பிரிவைக் கண்ணியமாக முடியுங்கள்; அதன் பின் புதிய தொடக்கம் அமைதியாக அமையும்.'));
  }
  if (topic === 'property' && /dispute|share|pangu|பங்கு|prachanai|பிரச்சினை|தகராறு|paati|ancestral|பூர்வீக|\bwill\b|divide|பாகப்பிரிவினை/i.test(question)) {
    answer.push(L('For a family property share or dispute, a lawyer’s advice and a calm family settlement (or mediation) come first — the chart only helps choose a peaceful time to talk.', 'குடும்பச் சொத்துப் பங்கு / தகராறுக்கு வழக்கறிஞர் ஆலோசனையும், அமைதியான குடும்பச் சமரசமும் (மத்தியஸ்தம்) முதன்மை — பேச அமைதியான நேரத்தைத் தேர்வு செய்ய மட்டுமே ஜாதகம் உதவும்.'));
  }
  if (topic === 'harmony' && /cheat|affair|vera ponnu|vera paiyan|another (woman|man)|ஏமாற்|கள்ள/i.test(question)) {
    answer.push(L('A horoscope cannot show a person’s faithfulness, and I will not label your partner. An honest, calm conversation — or a counsellor — helps far more than any chart.', 'ஒருவர் துரோகம் செய்கிறாரா என்பதை ஜாதகம் காட்டாது; உங்கள் துணையை நான் முத்திரை குத்த மாட்டேன். அமைதியான, நேர்மையான உரையாடலோ ஆலோசகரோ எந்த ஜாதகத்தையும் விட அதிகம் உதவும்.'));
  }
  if (topic === 'harmony' && /kudi|drink|alcohol|குடி|போதை/i.test(question)) {
    answer.push(L('Drinking at home is a health problem that can be treated: a de-addiction centre or counsellor can help (Tele-MANAS 14416, free). If there is any violence, your safety comes first — call 181 or 112.', 'வீட்டில் குடிப்பழக்கம் சிகிச்சை பெறக்கூடிய உடல்நலப் பிரச்சினை: போதை மீட்பு மையமோ ஆலோசகரோ உதவுவார்கள் (டெலி-மனஸ் 14416, இலவசம்). ஏதாவது வன்முறை இருந்தால் உங்கள் பாதுகாப்பே முதன்மை — 181 அல்லது 112 அழையுங்கள்.'));
  }
  if (topic === 'marriage' && /love|kaa?dh?al|காதல்|arrang|parents|veetla|வீட்டில்|caste|ஜாதி|jaathi/i.test(question)) {
    const v = bh[4], s = bh[6];
    answer.push(L(`Love or arranged: tradition reads the 5th house for love and the 7th for marriage. In your chart the 5th lord ${v.lord} sits in the ${ordEn(v.lordHouse)} and the 7th lord ${s.lord} in the ${ordEn(s.lordHouse)}${[5, 7].includes(v.lordHouse) || [5, 7].includes(s.lordHouse) ? ' — the two houses are linked, which tradition sees as support for a marriage of your own choice' : ' — either way works; what matters is respect between the two families'}. Caste or community is a family matter, not something the chart decides.`,
      `காதலா, பெற்றோர் பார்த்ததா: மரபுப்படி 5-ம் வீடு காதல், 7-ம் வீடு திருமணம். உங்கள் ஜாதகத்தில் 5-ம் அதிபதி ${pn(v.lord, 'ta')} ${v.lordHouse}-ம் வீட்டில், 7-ம் அதிபதி ${pn(s.lord, 'ta')} ${s.lordHouse}-ம் வீட்டில்${[5, 7].includes(v.lordHouse) || [5, 7].includes(s.lordHouse) ? ' — இரு வீடுகளும் தொடர்புடையவை; நீங்கள் விரும்பும் திருமணத்திற்கு மரபுப்படி ஆதரவு' : ' — எந்த வழியும் சரியே; இரு குடும்பங்களின் மரியாதையே முக்கியம்'}. ஜாதி, சமூகம் குடும்ப விஷயம் — ஜாதகம் தீர்மானிப்பதில்லை.`));
  }

  // House / land: what is being done decides the practical checks (build vs buy land vs buy a flat).
  if (topic === 'property') {
    const qp = normQ(question);
    if (/katt|construct|build|கட்ட|bhoomi|பூமி/.test(qp)) answer.push(L('Building: get the plan approved first, keep about one-fifth extra over the builder’s estimate, and start with Bhoomi Pooja on a good day if you wish.', 'வீடு கட்ட: முதலில் வரைபட அனுமதி பெறுங்கள்; கட்டுநர் மதிப்பீட்டை விட ஐந்தில் ஒரு பங்கு கூடுதல் பணம் கையில் வையுங்கள்; விரும்பினால் நல்ல நாளில் பூமி பூஜையுடன் தொடங்குங்கள்.'));
    else if (/plot|\bland\b|nilam|manai|நிலம்|மனை/.test(qp)) answer.push(L('Land / plot: check the patta, a 30-year encumbrance certificate and DTCP / CMDA approval with a lawyer before any advance.', 'நிலம் / மனை: முன்பணம் தரும் முன் பட்டா, 30 ஆண்டு வில்லங்கச் சான்று (EC), DTCP / CMDA அனுமதியை வழக்கறிஞர் மூலம் சரிபாருங்கள்.'));
    else if (/\bflat\b|apartment|பிளாட்|அடுக்கு/.test(qp)) answer.push(L('Flat: check the RERA registration, the builder’s completed projects and the approved plan before booking.', 'பிளாட்: முன்பதிவுக்கு முன் RERA பதிவு, கட்டுநரின் முடிந்த திட்டங்கள், அனுமதி பெற்ற வரைபடம் — இவற்றைச் சரிபாருங்கள்.'));
  }
  // A partnership asked about: the 7th house (partners) is read and named.
  if (['business', 'career'].includes(topic) && /partner|kootu|கூட்டு/i.test(question)) {
    const s7 = bh[6];
    const ok7 = [1, 4, 5, 7, 9, 10, 11].includes(s7.lordHouse) && strength[s7.lord]?.level !== 'weak';
    answer.push(ok7 ? L(`Partnership: the 7th lord ${s7.lord} is in the ${ordEn(s7.lordHouse)} — a partner can add strength; keep every term in writing.`, `கூட்டு: 7-ம் அதிபதி ${pn(s7.lord, 'ta')} ${s7.lordHouse}-ம் வீட்டில் — கூட்டாளி பலம் சேர்ப்பார்; ஒவ்வொரு நிபந்தனையையும் எழுத்தில் வையுங்கள்.`)
      : L(`Partnership: the 7th lord ${s7.lord} is in the ${ordEn(s7.lordHouse)} — going alone (or with family) suits you better; if you take a partner, a clear written agreement is a must.`, `கூட்டு: 7-ம் அதிபதி ${pn(s7.lord, 'ta')} ${s7.lordHouse}-ம் வீட்டில் — தனியாகவோ குடும்பத்துடனோ செய்வது அதிகம் பொருந்தும்; கூட்டாளி என்றால் தெளிவான எழுத்து ஒப்பந்தம் அவசியம்.`));
  }
  const musts = answer.splice(0);
  answer.push(...lead, ...timing, ...musts);

  // 2) What the chart shows — houses, lords, karaka, Dasa–Bhukti and Gochara, in plain words.
  const chartLines = [L(`Houses read: ${def.houseWhy.en}${useLagna ? '' : ' — counted from your Moon sign (Chandra Lagna)'}.`, `பார்க்கும் பாவங்கள்: ${def.houseWhy.ta}${useLagna ? '' : ' — சந்திர லக்னப்படி'}.`)];
  for (const h of def.houses.slice(0, 3)) {
    const b = bh[h - 1];
    const lv = b.score >= 62 ? L('strong', 'பலம்') : b.score >= 48 ? L('steady', 'நிலையானது') : L('grows with effort', 'முயற்சியால் வளரும்');
    chartLines.push(L(`${ordEn(h)} house: its lord ${b.lord} sits in the ${ordEn(b.lordHouse)}${b.occupants.length ? `, with ${b.occupants.join(', ')} in it` : ''} — ${lv}.`,
      `${h}-ம் வீடு: அதிபதி ${pn(b.lord, 'ta')} ${b.lordHouse}-ம் வீட்டில்${b.occupants.length ? `; இந்த வீட்டில் ${b.occupants.map((o) => pn(o, 'ta')).join(', ')}` : ''} — ${lv}.`));
  }
  const k0 = def.karakas[0];
  const karakaRole = topic === 'child' || aff === CHILD_AFFAIRS.grandchildren ? T(' (putra karaka — giver of children)', ' (புத்திர காரகர்)') : T('', '');
  if (strength[k0]) chartLines.push(L(`Karaka ${k0}${karakaRole.en}: ${strength[k0].level === 'strong' ? 'strong' : strength[k0].level === 'weak' ? 'needs support (see the remedy)' : 'average'}.`, `காரகர் ${pn(k0, 'ta')}${karakaRole.ta}: ${strength[k0].level === 'strong' ? 'பலம்' : strength[k0].level === 'weak' ? 'ஆதரவு தேவை (பரிகாரம் பார்க்க)' : 'மத்திமம்'}.`));
  if (current) chartLines.push(L(`Running now: ${current.md} Dasa, ${current.ad} Bhukti (till ${monthYear(current.end, 'en')}) — ${activeNow ? 'connected to this question' : 'preparing the ground for it'}.`,
    `நடப்பு: ${pn(current.md, 'ta')} தசை, ${pn(current.ad, 'ta')} புக்தி (${monthYear(current.end, 'ta')} வரை) — ${activeNow ? 'இந்தக் கேள்வியுடன் தொடர்புடையது' : 'இதற்கான அடித்தளம் அமைக்கும் காலம்'}.`));
  else if (!dasaOk) chartLines.push(L('Dasa periods are not used because the birth star is uncertain; timing follows Jupiter’s transit from your Moon sign.', 'பிறந்த நட்சத்திரம் உறுதியில்லாததால் தசை பயன்படுத்தப்படவில்லை; காலம் சந்திர ராசியிலிருந்து குரு கோசாரப்படி.'));
  if (tr) for (const s of tr.status.slice(0, 2)) chartLines.push(L(`Gochara: ${fixOrd(s.en)}.`, `கோசாரம்: ${s.ta}.`));

  // 3) When — supportive periods with dates
  const periodLines = best.length
    ? best.map((w) => (w.transitOnly
      ? L(`${winText(w)}: Jupiter’s transit supports the ${ordEn(def.key)} house from your Moon sign`, `${winText(w)}: சந்திர ராசியிலிருந்து ${def.key}-ம் வீட்டுக்குக் குரு கோசார ஆதரவு`)
      : L(`${winText(w)}: ${w.md} Dasa / ${w.ad} Bhukti${w.doubleTransit ? ' · Jupiter & Saturn both support (double transit)' : w.jupiter ? ' · Jupiter’s transit supports' : ''}`,
        `${winText(w)}: ${pn(w.md, 'ta')} தசை / ${pn(w.ad, 'ta')} புக்தி${w.doubleTransit ? ' · குரு, சனி இருவரும் ஆதரவு (இரட்டைக் கோசாரம்)' : w.jupiter ? ' · குரு கோசாரம் ஆதரவு' : ''}`)))
    : [L('Every Thursday and Friday morning in the Jupiter / Venus Horai is good for steps on this.', 'ஒவ்வொரு வியாழன், வெள்ளி காலை குரு / சுக்கிர ஓரையில் இதற்கான முயற்சிகள் நல்லது.')];
  if (nowWin && !best.includes(nowWin)) periodLines.unshift(L(`Now – ${monthYear(nowWin.end, 'en')}: ${nowWin.md} Dasa / ${nowWin.ad} Bhukti (running)`, `இப்போது – ${monthYear(nowWin.end, 'ta')}: ${pn(nowWin.md, 'ta')} தசை / ${pn(nowWin.ad, 'ta')} புக்தி (நடப்பு)`));

  // 4) What to do now — practical first, then ONE simple remedy suited to the person's faith.
  const weakK = def.karakas.find((k) => strength[k]?.level === 'weak');
  const remPlanet = weakK || def.karakas[0];
  const dos = faithLines([...(EXTRA_DOS[topic] || []), ...def.dos].map((x) => pick(x, lang)), faith, lang, remPlanet);
  const donts = def.donts.map((x) => pick(x, lang));
  // Today's Rahu Kalam only when the question is about acting today / now (never padding on a WHICH or WHY answer).
  if (today?.rahuKalam && !def.health && /today|inn?ik|இன்று|இன்னைக்கு|interview|நேர்காணல்|\bnow\b|ippo|இப்போ/i.test(question) && ['when', 'choice', 'how', 'general'].includes(qt.type)) donts.push(L(`Today’s Rahu Kalam: ${today.rahuKalam}`, `இன்றைய ராகு காலம்: ${today.rahuKalam}`));
  const rem = remedyFor(def, faith, lang, remPlanet);
  if (weakK) { const rf = planetRemedy(weakK, { faith, profile }); if (rf && isHinduFaith(faith)) rem.push(L(`For ${weakK}: ${rf.free.en}`, `${pn(weakK, 'ta')}: ${rf.free.ta}`)); }
  const followups = faithLines(def.follow.map((f) => pick(f, lang)), faith, lang, remPlanet).slice(0, 3);
  while (followups.length < 3 && def.follow.length >= 3) followups.push(pick(GENERAL_FOLLOWUPS[followups.length], lang));
  const askQ = pick(subDef?.ask || ASK[topic] || ASK.family, lang);

  if (def.health) {
    // Two separated parts: general wellbeing (not astrology) and an optional traditional reflection (not health advice).
    let hg = null;
    try { hg = HEALTH.healthGuide(chart, { gender: life.gender, now, faith }); } catch { /* optional */ }
    const review = L('needs medical review', 'மருத்துவ மதிப்பாய்வு தேவை');
    const well = hg ? hg.wellbeing.habits.map((x) => `${pick(x, lang)} (${review})`) : dos;
    const pr = hg?.reflection?.practices?.[0];
    const reflect = [pr ? `${pick(pr.why, lang)}: ${pick(pr.lamp, lang)}` : rem[0], L('Spiritual practice only — not health advice.', 'ஆன்மீகப் பழக்கம் மட்டுமே — உடல்நல ஆலோசனை அல்ல.')];
    const urgent = SURGERY.test(normQ(question)) || /recover|குணமா|sari aag|serious|heart/i.test(question);
    const first = urgent ? [L('🩺 Practical first: follow your doctor’s advice and any date the doctors have set — never delay hospital care, surgery or medicines for a good time or Rahu Kalam.', '🩺 நடைமுறை முதலில்: மருத்துவரின் ஆலோசனையையும் மருத்துவர்கள் குறித்த தேதியையும் பின்பற்றுங்கள் — நல்ல நேரம், ராகு காலத்துக்காக மருத்துவச் சிகிச்சை, அறுவை சிகிச்சை, மருந்துகளை ஒருபோதும் தள்ளிப்போடாதீர்கள்.')] : [];
    // Someone else's health (mother, father, spouse): their doctors guide the recovery; this chart is the asker's.
    const rel0 = /\b(amma|appa|mother|father|mom|dad|wife|husband|manaivi|purushan|spouse|son|daughter|magan|magal)\b|அம்மா|அப்பா|மனைவி|கணவர்|மகன்|மகள்/i.exec(question);
    if (rel0) {
      answer.splice(0, answer.length, L('I understand your worry for them. Their recovery is guided by the doctors treating them — keep the reports together, follow the treatment fully and ask the doctor what recovery time to expect. Your chart (or theirs, if added) offers only a prayer and a calm routine, never a medical answer.', 'அவர்களைப் பற்றிய உங்கள் கவலை புரிகிறது. அவர்கள் குணமாவதை வழிநடத்துவது சிகிச்சை அளிக்கும் மருத்துவர்களே — அறிக்கைகளை ஒன்றாக வைத்து, சிகிச்சையை முழுமையாகப் பின்பற்றி, எவ்வளவு காலத்தில் குணமாகும் என்று மருத்துவரிடம் கேளுங்கள். ஜாதகம் (உங்களுடையதோ, சேர்த்தால் அவர்களுடையதோ) பிரார்த்தனையும் அமைதியான வழக்கமும் மட்டுமே தரும் — மருத்துவப் பதில் அல்ல.'));
    }
    const care = rel0 ? [] : periodCareLines(hg, chart, now, lang, profile);
    const sectionsH = [
      { key: 'answer', title: L('Answer', 'பதில்'), lines: [...first, ...answer] },
      ...(care.length ? [{ key: 'chart', title: L('Traditional reading for this period (not a diagnosis)', 'இந்தக் காலத்திற்கான மரபு வாசிப்பு (நோய் கண்டறிதல் அல்ல)'), lines: care }] : []),
      { key: 'dos', title: L('General wellbeing', 'பொது நலம்'), lines: well },
      { key: 'donts', title: L('Please', 'கவனிக்க'), lines: donts },
      { key: 'remedy', title: L('Traditional reflection (optional)', 'மரபுச் சிந்தனை (விருப்பம்)'), lines: faithLines(reflect, faith, lang, 'Sun') },
      { key: 'ask', title: pick(ASK_TITLE, lang), lines: [askQ] },
      { key: 'uncertainty', title: pick(LIMITS_TITLE, lang), lines: [pick(LIMITS_LINE, lang)] },
    ];
    const outH = { intent: topic, topic, question, text: textOf(sectionsH), sections: sectionsH, meter: null, actions: [{ go: def.action.go, label: pick(def.action.label, lang) }], followups, deadlineFirst: urgent };
    return validateOffline(guardAnswer(outH, profile, lang), { lang, inputCertainty: certainty });
  }

  // ---- The answer's shape follows the KIND of question (shared/ask-sense.js). No percentage meter anywhere: the
  // product rules forbid scores / verdicts in Ask answers; a WHEN / STATUS question gets a short text label instead.
  const nHouse = Math.min(3, def.houses.length);
  const houseLines = chartLines.slice(1, 1 + nHouse);
  const restLines = chartLines.slice(1 + nHouse);
  const kbh = bh[def.key - 1];
  const keyHouseLine = houseLines[def.houses.slice(0, 3).indexOf(def.key)] || L(`${ordEn(def.key)} house: its lord ${kbh.lord} sits in the ${ordEn(kbh.lordHouse)}${kbh.occupants.length ? `, with ${kbh.occupants.join(', ')} in it` : ''}.`, `${def.key}-ம் வீடு: அதிபதி ${pn(kbh.lord, 'ta')} ${kbh.lordHouse}-ம் வீட்டில்${kbh.occupants.length ? `; இந்த வீட்டில் ${kbh.occupants.map((o) => pn(o, 'ta')).join(', ')}` : ''}.`);
  const karakaLine = restLines.find((l) => /^Karaka|^காரகர்/.test(l));
  const currentLine = restLines.find((l) => /^Running now|^நடப்பு:|Dasa periods are not used|தசை பயன்படுத்தப்படவில்லை/.test(l));
  const gocharaLines = restLines.filter((l) => /^Gochara|^கோசாரம்/.test(l));
  const remTitle = isHinduFaith(faith) ? L('One simple remedy (free)', 'ஒரு எளிய பரிகாரம் (இலவசம்)') : L('A simple practice for every faith', 'எல்லா நம்பிக்கைக்கும் ஏற்ற எளிய வழி');
  const periodsTitle = `${L('When — supportive periods', 'எப்போது — சாதகமான காலங்கள்')} · ${pick(horizonLabel(REPORT_YEARS.ask), lang)}`;
  const askSec = { key: 'ask', title: pick(ASK_TITLE, lang), lines: [askQ] };
  const limits = { key: 'uncertainty', title: pick(LIMITS_TITLE, lang), lines: [pick(LIMITS_LINE, lang)] };
  const sec = (key, title, lines) => (lines && lines.filter(Boolean).length ? { key, title, lines: lines.filter(Boolean) } : null);
  const statusLabel = nowWin ? T('Favourable period', 'சாதகமான காலம்') : nextWin && nextWin.start - now < YEAR ? T('Preparing period — a favourable window is near', 'தயாராகும் காலம் — சாதகமான காலம் நெருங்குகிறது') : T('Steady-effort period', 'தொடர் முயற்சிக் காலம்');
  const labelLine = L(`Now: ${statusLabel.en}.`, `இப்போதைய நிலை: ${statusLabel.ta}.`);
  const supportLvl = promise >= 62 ? 'good' : promise >= 50 ? 'some' : 'slow';
  const winNote = nowWin ? L(` — and the period running now is one of the supportive ones (${winText(nowWin)}).`, ` — இப்போது நடக்கும் காலமே சாதகமான காலங்களில் ஒன்று (${winText(nowWin)}).`)
    : nextWin ? L(` — the most supportive period ahead is ${winText(nextWin)} (${lordsText(nextWin)}).`, ` — அதிக ஆதரவுள்ள அடுத்த காலம்: ${winText(nextWin)} (${lordsText(nextWin)}).`) : '.';
  // A calibrated statement for a yes / no question: support and timing, never a promise (children: timing only).
  const calibrated = topic === 'child' || aboutChild
    ? L(`${who}a horoscope shows supportive timing only, never a yes or no${winNote}`, `${who}ஜாதகம் சாதகமான காலத்தை மட்டுமே காட்டும்; ஆம் / இல்லை என்று தீர்மானிப்பதில்லை${winNote}`)
    : L(`${who}${{ good: `your chart shows good support for ${tname.toLowerCase()}`, some: `your chart shows support for ${tname.toLowerCase()}, which grows with steady effort`, slow: `in your chart ${tname.toLowerCase()} comes step by step, through effort rather than quickly` }[supportLvl]}${winNote}`,
      `${who}${{ good: `உங்கள் ஜாதகத்தில் ${taFor} நல்ல ஆதரவு உண்டு`, some: `உங்கள் ஜாதகத்தில் ${taFor} ஆதரவு உண்டு; தொடர் முயற்சியுடன் அது வலுப்பெறும்`, slow: `உங்கள் ஜாதகத்தில் ${taFor} பலன் படிப்படியாக, முயற்சியின் வழியே அமையும்` }[supportLvl]}${winNote}`);
  const notPromise = L('This is not a promise either way — your effort and the practical steps below are what make it happen.', 'இது எந்தப் பக்கமும் உறுதிமொழி அல்ல — உங்கள் முயற்சியும் கீழே உள்ள நடைமுறை வழிகளுமே அதைச் சாத்தியமாக்கும்.');
  const actions = def.action ? [{ go: def.action.go, label: pick(def.action.label, lang) }] : [];
  if (['second_marriage', 'marriage', 'business', 'property', 'vehicle', 'court'].includes(topic) && !actions.some((a) => a.go === 'muhurtham')) actions.push({ go: 'muhurtham', label: L('Good dates', 'நல்ல நாள்') });
  if (topic === 'child' && !aboutChild) actions.length = 0;
  const parigaramAction = { go: 'parigaram', label: isHinduFaith(faith) ? L('Parigaram & temple', 'பரிகாரம் & கோவில்') : L('Simple practices', 'எளிய வழிமுறைகள்') };
  const extraDos = faithLines((EXTRA_DOS[topic] || []).map((x) => pick(x, lang)), faith, lang, remPlanet);
  const baseDos = dos.filter((x) => !extraDos.includes(x));
  const wantsWhen = qt.types.has('when');
  let sections;
  let wk = null;
  const kind = qt.type === 'choice' && qt.options?.pair === 'now_wait' ? 'now_wait' : qt.type === 'choice' && qt.options?.pair === 'love_arranged' ? 'love' : qt.type;

  // WHICH (and "A or B" between fields / job-business / govt-private / abroad-home): the actual options first.
  wk = whichKind(topic, question, qt);
  if (wk === 'love_arranged') wk = null;
  if (wk && ['career', 'business', 'study', 'partner', 'direction'].includes(wk) && !aboutChild) {
    const minor = !profile.adult && !profile.organization;
    if (minor && ['career', 'business'].includes(wk)) wk = 'study'; // a child's "which field" is a study-stream question
    let W;
    if (wk === 'partner') W = partnerLines(chart, lang, { rel, gender: life.gender, name });
    else if (wk === 'direction') W = directionLines(directionReading(chart, { rel, now }), lang, { name });
    else {
      const r = cached(chart, `career|${useLagna}|${minor}|${Math.floor(now.getTime() / DAY)}`, () => careerReading(chart, { rel, now, minor }));
      W = wk === 'business' ? businessLines(r, chart, lang, { rel, name }) : wk === 'study' ? studyLines(r, chart, lang, { rel, name, minor }) : careerLines(r, lang, { name, minor });
      if (qt.options?.fields) W.answer.unshift(compareFields(r, qt.options.fields, lang, name));
      if (qt.options?.pair === 'govt_private') W.answer.unshift(govtOrPrivate(r, lang, name));
      if (qt.options?.pair === 'job_business') {
        const i = W.answer.findIndex((l) => /^Job or business|^வேலையா தொழிலா/.test(l));
        if (i > 0) W.answer.unshift(...W.answer.splice(i, 1));
      }
    }
    const wd = WHICH_DOS[wk] || WHICH_DOS.career;
    sections = [
      sec('answer', L('Answer', 'பதில்'), [...lead.filter((l) => !Object.values(EMPATHY).some((e) => e.en === l || e.ta === l)), ...W.answer, ...(wantsWhen ? timing : []), ...musts]),
      sec('chart', L('Why — what your chart shows', 'ஏன் — உங்கள் ஜாதகம் காட்டுவது'), W.chart),
      wantsWhen ? sec('periods', periodsTitle, periodLines) : null,
      wk === 'partner' ? sec('remedy', remTitle, rem.slice(0, 1)) : null,
      sec('dos', L('How to decide', 'முடிவு செய்ய உதவும் வழிகள்'), wd.dos.map((x) => pick(x, lang))),
      { key: 'ask', title: pick(ASK_TITLE, lang), lines: [pick(wd.ask, lang)] },
      limits,
    ].filter(Boolean);
    const out = { intent: topic, topic, subject: null, question, text: textOf(sections), sections, meter: null, qtype: qt.type, whichKind: wk, subtopic: subId, shape: 'which',
      actions: wk === 'partner' ? [{ go: 'couple', label: L('Bride & groom porutham', 'மணமகன் – மணமகள் பொருத்தம்') }] : [], followups: (wd.follow || []).map((f) => pick(f, lang)), deadlineFirst: false };
    return validateOffline(guardAnswer(out, profile, lang), { lang, inputCertainty: certainty });
  }
  wk = null;

  if (kind === 'why' && !def.practicalFirst) {
    const reasons = whyReasons({ def, bh, strength, current, activeNow, tr, lang });
    const empathy = lead.filter((l) => Object.values(EMPATHY).some((e) => e.en === l || e.ta === l));
    sections = [
      sec('answer', L('Answer', 'பதில்'), [...empathy, L(`${who}the main reasons your chart shows for this:`, `${who}உங்கள் ஜாதகம் காட்டும் முக்கியக் காரணங்கள்:`), ...reasons.slice(0, 2), ...lead.filter((l) => !empathy.includes(l)), ...musts]),
      sec('why', L('More of what the chart shows', 'ஜாதகத்தில் மேலும்'), [...reasons.slice(2), ...gocharaLines.filter((g) => !reasons.includes(g)).slice(0, 1)]),
      sec('dos', L('What helps', 'எது உதவும்'), [...extraDos, ...baseDos.slice(0, 2)]),
      sec('periods', L('When it eases', 'எப்போது இலகுவாகும்'), [nowWin ? L(`The period running now is supportive (${winText(nowWin)}, ${lordsText(nowWin)})${later[0] ? `; the next one is ${winText(later[0])}` : ''}.`, `இப்போது நடக்கும் காலமே ஆதரவானது (${winText(nowWin)}, ${lordsText(nowWin)})${later[0] ? `; அடுத்தது ${winText(later[0])}` : ''}.`) : nextWin ? L(`${winText(nextWin)} (${lordsText(nextWin)}) is the next supportive period${later[0] ? `; then ${winText(later[0])}` : ''}.`, `அடுத்த சாதகமான காலம் ${winText(nextWin)} (${lordsText(nextWin)})${later[0] ? `; அதன் பின் ${winText(later[0])}` : ''}.`) : L('No strongly marked window shows soon — steady effort matters most.', 'விரைவில் வலுவாகக் குறிக்கப்பட்ட காலம் இல்லை — தொடர் முயற்சியே முக்கியம்.')]),
      sec('remedy', remTitle, rem),
      askSec, limits,
    ];
  } else if (kind === 'how' && !def.practicalFirst) {
    const steps = [...extraDos, ...baseDos];
    sections = [
      sec('answer', L('Answer', 'பதில்'), [...lead, L(`${who}the first thing to do: ${steps[0].charAt(0).toLowerCase()}${steps[0].slice(1)}.`, `${who}முதலில் செய்ய வேண்டியது: ${steps[0]}.`), ...musts]),
      sec('dos', L('Next steps', 'அடுத்த படிகள்'), steps.slice(1)),
      sec('donts', L('Avoid', 'தவிர்க்கவும்'), donts),
      sec('remedy', remTitle, rem),
      sec('periods', L('Best time to act', 'முயற்சிக்கச் சிறந்த காலம்'), [nowWin ? L(`Now — the running period supports this (${winText(nowWin)}).`, `இப்போதே — நடக்கும் காலம் இதற்கு ஆதரவு (${winText(nowWin)}).`) : nextWin ? L(`${winText(nextWin)} (${lordsText(nextWin)}); start preparing now.`, `${winText(nextWin)} (${lordsText(nextWin)}); இப்போதே தயாராகத் தொடங்குங்கள்.`) : L('Any steady time — effort matters more than the date.', 'எந்தக் காலத்திலும் — தேதியை விட முயற்சியே முக்கியம்.')]),
      sec('chart', L('What your chart shows', 'உங்கள் ஜாதகம் காட்டுவது'), [chartLines[0], keyHouseLine, karakaLine]),
      askSec, limits,
    ];
  } else if (['choice', 'now_wait', 'love'].includes(kind) && !def.practicalFirst) {
    const decide = kind === 'now_wait'
      ? (nowWin ? L(`${who}now rather than later: the period running now supports ${tname.toLowerCase()} (${winText(nowWin)}, ${lordsText(nowWin)}).`, `${who}பின்னர் அல்ல, இப்போதே: நடக்கும் காலம் ${taFor} ஆதரவு (${winText(nowWin)}, ${lordsText(nowWin)}).`)
        : nextWin ? L(`${who}better a little later: the next supportive period is ${winText(nextWin)} (${lordsText(nextWin)}) — prepare well till then.`, `${who}சற்றுப் பொறுத்து: அடுத்த சாதகமான காலம் ${winText(nextWin)} (${lordsText(nextWin)}) — அதுவரை நன்கு தயாராகுங்கள்.`)
          : L(`${who}the chart shows no strongly marked window either way — decide on the practical facts.`, `${who}இரண்டு பக்கமும் ஜாதகத்தில் வலுவான காலக் குறிப்பு இல்லை — நடைமுறை உண்மைகளை வைத்து முடிவு செய்யுங்கள்.`))
      : nowWin ? L(`${who}if you are ready, this is a supportive time for ${tname.toLowerCase()} — ${winText(nowWin)} (${lordsText(nowWin)}). The decision itself is yours.`, `${who}நீங்கள் தயார் என்றால், ${taFor} இது சாதகமான காலம் — ${winText(nowWin)} (${lordsText(nowWin)}). முடிவு உங்களுடையதே.`)
        : nextWin ? L(`${who}your chart's stronger window for this is ${winText(nextWin)} (${lordsText(nextWin)}); use the time till then to prepare — the decision itself is yours.`, `${who}இதற்கு உங்கள் ஜாதகத்தின் வலுவான காலம் ${winText(nextWin)} (${lordsText(nextWin)}); அதுவரை நன்கு தயாராகுங்கள் — முடிவு உங்களுடையதே.`)
          : L(`${who}no strongly marked window shows by this method — decide on the practical facts; steady effort matters most.`, `${who}இந்த முறைப்படி வலுவாகக் குறிக்கப்பட்ட காலம் இல்லை — நடைமுறை உண்மைகளை வைத்து முடிவு செய்யுங்கள்; தொடர் முயற்சியே முக்கியம்.`);
    const loveFirst = kind === 'love' ? musts.filter((l) => /^Love or arranged|^காதலா/.test(l)) : [];
    if (kind === 'love' && loveFirst.length) {
      // "Love or arranged?": the 5th / 7th reading first, then how to bring the two families together.
      const h5 = bh[4];
      sections = [
        sec('answer', L('Answer', 'பதில்'), [...lead, ...loveFirst, ...musts.filter((l) => !loveFirst.includes(l)), ...timing]),
        sec('chart', L('What your chart shows', 'உங்கள் ஜாதகம் காட்டுவது'), [L(`5th house (love): its lord ${h5.lord} sits in the ${ordEn(h5.lordHouse)}${h5.occupants.length ? `, with ${h5.occupants.join(', ')} in it` : ''}.`, `5-ம் வீடு (காதல்): அதிபதி ${pn(h5.lord, 'ta')} ${h5.lordHouse}-ம் வீட்டில்${h5.occupants.length ? `; இந்த வீட்டில் ${h5.occupants.map((o) => pn(o, 'ta')).join(', ')}` : ''}.`), keyHouseLine]),
        sec('dos', L('Bringing both families together', 'இரு குடும்பங்களையும் இணைக்க'), [L('Let an elder both families respect open the first conversation', 'இரு குடும்பமும் மதிக்கும் ஒரு பெரியவர் முதல் பேச்சைத் தொடங்கட்டும்'), L('Show the families the person’s character and stability, not only the horoscope', 'ஜாதகம் மட்டுமல்ல — அவரின் குணம், நிலைத்தன்மையைக் குடும்பத்தினருக்குக் காட்டுங்கள்'), L('Match horoscopes with full birth details of both — as one input, not a verdict', 'இருவரின் முழு பிறப்பு விவரத்துடன் பொருத்தம் பாருங்கள் — ஒரு அளவுகோலாக மட்டும், தீர்ப்பாக அல்ல')]),
        sec('remedy', remTitle, rem.slice(0, 1)),
        askSec, limits,
      ];
    } else if (kind === 'now_wait') {
      sections = [
        sec('answer', L('Answer', 'பதில்'), [...lead, decide, ...musts]),
        sec('periods', periodsTitle, periodLines),
        sec('chart', L('What your chart shows', 'உங்கள் ஜாதகம் காட்டுவது'), [currentLine, keyHouseLine]),
        sec('dos', L('Before you move', 'நகரும் முன்'), [...extraDos, L('Write down what you gain and what you give up — salary, growth, family time', 'கிடைப்பதையும் இழப்பதையும் எழுதிப் பாருங்கள் — சம்பளம், வளர்ச்சி, குடும்ப நேரம்'), baseDos[0]]),
        sec('donts', L('Avoid', 'தவிர்க்கவும்'), donts.slice(0, 1)),
        askSec, limits,
      ];
    } else {
      sections = [
        sec('answer', L('Answer', 'பதில்'), [...lead, decide, ...musts]),
        sec('chart', L('What your chart shows', 'உங்கள் ஜாதகம் காட்டுவது'), [chartLines[0], keyHouseLine, karakaLine]),
        sec('periods', periodsTitle, periodLines.slice(0, 1)),
        sec('dos', L('Check before you decide', 'முடிவுக்கு முன் சரிபாருங்கள்'), [...extraDos, baseDos[baseDos.length - 1]]),
        sec('donts', L('Avoid', 'தவிர்க்கவும்'), donts.slice(0, 1)),
        sec('remedy', remTitle, rem.slice(0, 1)),
        askSec, limits,
      ];
    }
  } else if (kind === 'will' && !def.practicalFirst) {
    sections = [
      sec('answer', L('Answer', 'பதில்'), [...lead, calibrated, notPromise, ...musts]),
      sec('chart', L('What your chart shows', 'உங்கள் ஜாதகம் காட்டுவது'), [chartLines[0], ...houseLines, karakaLine]),
      sec('dos', L('What improves it', 'வாய்ப்பை வலுப்படுத்துபவை'), [...extraDos, ...baseDos.slice(1, 3)]),
      sec('remedy', remTitle, rem.slice(0, weakK ? 2 : 1)),
      askSec, limits,
    ];
  } else if (kind === 'status' && !def.practicalFirst) {
    // STATUS: how the running period is for this — the present first, then only what comes next.
    const nowSense = current ? (activeNow ? L(`${who}the running ${current.md} Dasa / ${current.ad} Bhukti (till ${monthYear(current.end, 'en')}) is connected to ${tname.toLowerCase()} — an active time for it.`, `${who}நடப்பு ${pn(current.md, 'ta')} தசை / ${pn(current.ad, 'ta')} புக்தி (${monthYear(current.end, 'ta')} வரை) ${taFor} தொடர்புடையது — இதற்குச் செயல்படும் காலம்.`)
      : L(`${who}the running ${current.md} Dasa / ${current.ad} Bhukti (till ${monthYear(current.end, 'en')}) is not directly linked to ${tname.toLowerCase()} — a steady, preparing time for it.`, `${who}நடப்பு ${pn(current.md, 'ta')} தசை / ${pn(current.ad, 'ta')} புக்தி (${monthYear(current.end, 'ta')} வரை) ${taFor} நேரடித் தொடர்பு இல்லை — நிதானமாகத் தயாராகும் காலம்.`)) : null;
    sections = [
      sec('answer', L('Answer', 'பதில்'), [...lead, labelLine, nowSense, ...gocharaLines.slice(0, 1), ...musts]),
      sec('chart', L('What your chart shows', 'உங்கள் ஜாதகம் காட்டுவது'), [keyHouseLine, karakaLine, ...gocharaLines.slice(1)]),
      sec('periods', L('What comes next', 'அடுத்து வருவது'), [nextWin && nextWin !== nowWin ? L(`Next supportive period: ${winText(nextWin)} (${lordsText(nextWin)}).`, `அடுத்த சாதகமான காலம்: ${winText(nextWin)} (${lordsText(nextWin)}).`) : later[0] ? L(`After this, ${winText(later[0])}.`, `இதன் பின் ${winText(later[0])}.`) : L('No other strongly marked window soon — keep steady.', 'விரைவில் வேறு வலுவான காலக் குறிப்பு இல்லை — நிதானமாகத் தொடருங்கள்.')]),
      sec('dos', L('What to do now', 'இப்போது செய்ய வேண்டியவை'), [...extraDos, ...baseDos.slice(-1)]),
      sec('remedy', remTitle, rem.slice(0, 1)),
      askSec, limits,
    ];
  } else {
    // WHEN (and plain questions): the dates first, then the reasons, then the steps.
    sections = [
      sec('answer', L('Answer', 'பதில்'), [...lead, ...(kind === 'when' ? [labelLine] : []), ...timing, ...musts]),
      sec('periods', periodsTitle, periodLines),
      sec('chart', L('What your chart shows', 'உங்கள் ஜாதகம் காட்டுவது'), chartLines),
      sec('dos', L('What to do now', 'இப்போது செய்ய வேண்டியவை'), dos),
      sec('donts', L('Avoid', 'தவிர்க்கவும்'), donts),
      sec('remedy', remTitle, rem),
      askSec, limits,
    ];
  }
  sections = sections.filter(Boolean);
  actions.push(parigaramAction);
  const out = { intent: topic, topic, subject: aboutChild?.kind || null, question, text: textOf(sections), sections, meter: null, actions, followups, deadlineFirst: Boolean(def.practicalFirst),
    qtype: qt.type, whichKind: null, subtopic: subId, shape: def.practicalFirst ? 'deadline' : kind === 'love' && !musts.some((l) => /^Love or arranged|^காதலா/.test(l)) ? 'choice' : ['why', 'how', 'choice', 'now_wait', 'love', 'will', 'status', 'when'].includes(kind) ? kind : 'when', label: ['when', 'status'].includes(kind) ? pick(statusLabel, lang) : null };
  return validateOffline(guardAnswer(out, profile, lang), { lang, inputCertainty: certainty });
}

// Practical steps and the follow-up question for a WHICH answer (never generic do / don't lists or Rahu Kalam).
const WHICH_DOS = {
  career: { dos: [T('Try the top option first through a short course, an internship or a part-time project before a big switch', 'பெரிய மாற்றத்துக்கு முன், முதல் துறையை ஒரு சிறு பயிற்சி, இன்டர்ன்ஷிப் அல்லது பகுதிநேர வேலை மூலம் முயன்று பாருங்கள்'), T('Talk to two people already working in that field about the real day-to-day work', 'அந்தத் துறையில் ஏற்கனவே பணியாற்றும் இருவரிடம் அன்றாட வேலை பற்றிப் பேசுங்கள்'), T('Match it with what you enjoy and are good at — the chart shows tendencies, your skill decides', 'உங்கள் விருப்பமும் திறமையும் ஒத்துப்போகிறதா பாருங்கள் — ஜாதகம் போக்கைக் காட்டும், திறமையே முடிவு செய்யும்')],
    ask: T('Of these three, which one do you already enjoy or know a little about?', 'இந்த மூன்றில் எது உங்களுக்கு ஏற்கனவே பிடித்த / கொஞ்சம் தெரிந்த துறை?'),
    follow: [T('When will I get a job in this field?', 'இந்தத் துறையில் வேலை எப்போது அமையும்?'), T('Can I start my own business?', 'சொந்தத் தொழில் தொடங்கலாமா?'), T('Government job or private — which suits me?', 'அரசு வேலையா தனியார் வேலையா — எது எனக்கு ஏற்றது?')] },
  business: { dos: [T('Test the idea small for three months with limited money before investing more', 'அதிகம் முதலீடு செய்யும் முன், மூன்று மாதம் குறைந்த பணத்தில் சிறிதாகச் சோதித்துப் பாருங்கள்'), T('Keep six months of family expenses aside before you start', 'தொடங்கும் முன் ஆறு மாதக் குடும்பச் செலவுக்கான பணத்தைத் தனியாக வையுங்கள்'), T('Learn from someone already running this kind of business', 'இதே வகைத் தொழில் நடத்துபவரிடம் அனுபவம் கேட்டுக் கற்றுக்கொள்ளுங்கள்')],
    ask: T('How much would you like to invest, and alone or with a partner?', 'எவ்வளவு முதலீட்டில், தனியாகவா கூட்டாளியுடனா தொடங்க நினைக்கிறீர்கள்?'),
    follow: [T('Good date to start the business', 'தொழில் தொடங்க நல்ல நாள்'), T('Is a partnership good for me?', 'கூட்டுத் தொழில் எனக்கு நல்லதா?'), T('When will my business pick up?', 'என் வியாபாரம் எப்போது வளரும்?')] },
  study: { dos: [T('Take a free aptitude test and look at the last two years’ marks subject by subject', 'இலவசத் திறனறி தேர்வு எழுதி, கடந்த இரண்டு ஆண்டு மதிப்பெண்களைப் பாடம் வாரியாகப் பாருங்கள்'), T('Talk to the teachers who know the student best', 'மாணவரை நன்கு அறிந்த ஆசிரியர்களிடம் பேசுங்கள்'), T('Visit a college / class of the top option once before deciding', 'முடிவுக்கு முன் முதல் விருப்பப் படிப்பின் கல்லூரி / வகுப்பை ஒருமுறை நேரில் பாருங்கள்')],
    ask: T('Which subjects bring the most interest and the best marks right now?', 'இப்போது எந்தப் பாடங்களில் ஆர்வமும் மதிப்பெண்ணும் அதிகம்?'),
    follow: [T('Good time today to study', 'இன்று படிக்க நல்ல நேரம்'), T('Higher studies abroad — is it good?', 'வெளிநாட்டில் உயர்கல்வி நல்லதா?'), T('A simple prayer before exams', 'தேர்வுக்கு முன் ஒரு எளிய பிரார்த்தனை')] },
  partner: { dos: [T('Meet and talk a few times before deciding — nature shows in conversation', 'முடிவுக்கு முன் சில முறை சந்தித்துப் பேசுங்கள் — இயல்பு பேச்சில் தெரியும்'), T('Match horoscopes with full birth details of both', 'இருவரின் முழு பிறப்பு விவரத்துடன் பொருத்தம் பாருங்கள்')],
    ask: T('Have you started looking at proposals, or shall I find the supportive months first?', 'வரன் பார்க்கத் தொடங்கிவிட்டீர்களா, அல்லது முதலில் சாதகமான மாதங்களைச் சொல்லட்டுமா?'),
    follow: [T('When will I get married?', 'எனக்கு எப்போது திருமணம் நடக்கும்?'), T('Check porutham with the bride / groom', 'மணமகன் / மணமகள் பொருத்தம் பாருங்கள்'), T('Love marriage or arranged?', 'காதல் திருமணமா, பெற்றோர் பார்க்கும் திருமணமா?')] },
  direction: { dos: [T('Compare the real offer: salary after costs, family needs and how long you plan to stay', 'உண்மையான வாய்ப்பை ஒப்பிடுங்கள்: செலவு போக மீதி சம்பளம், குடும்பத் தேவை, எத்தனை ஆண்டுகள் இருக்கத் திட்டம்'), T('Check visa rules only on the official embassy / VFS website', 'விசா விதிகளை அதிகாரப்பூர்வ தூதரக / VFS இணையதளத்தில் மட்டும் பாருங்கள்')],
    ask: T('Which country or city is in your mind — and is it for work or for study?', 'எந்த நாடு / நகரம் மனதில் உள்ளது — வேலைக்கா படிப்புக்கா?'),
    follow: [T('When will I get my visa?', 'விசா எப்போது கிடைக்கும்?'), T('Job abroad — is it good for me?', 'வெளிநாட்டு வேலை எனக்கு நல்லதா?'), T('Good date to travel', 'பயணத்திற்கு நல்ல நாள்')] },
};
// "IT or teaching", "engineering ah medical ah": which of the two named fields this chart supports more.
const FIELD_ID = { management: 'leadership' };
function fieldScore(r, id) {
  let sc = 0;
  r.groups.forEach((g, i) => { if (g.fields.includes(id)) sc += 3 - i; else if (PLANET_FIELDS[g.planet].includes(id)) sc += (3 - i) / 2; });
  return sc;
}
function compareFields(r, pair, lang, name = '') {
  const L = (en, ta) => (lang === 'ta' ? ta : en);
  const [a, b] = pair.map((x) => FIELD_ID[x] || x);
  const sa = fieldScore(r, a), sb = fieldScore(r, b);
  const lab = (id) => pick(FIELDS[id] || T(id, id), lang);
  const why = (id) => { const g = r.groups.find((x) => x.fields.includes(id) || PLANET_FIELDS[x.planet].includes(id)); return g ? g.reasons[0] : null; };
  const who = name ? `${name}, ` : '';
  if (Math.abs(sa - sb) < 0.5) return L(`${who}${lab(a)} and ${lab(b)} get about equal support in your chart — let your interest and skill decide between them.`, `${who}${lab(a)}, ${lab(b)} — இரண்டுக்கும் உங்கள் ஜாதகத்தில் ஏறக்குறைய சம ஆதரவு; உங்கள் ஆர்வமும் திறமையும் முடிவு செய்யட்டும்.`);
  const [w, l] = sa > sb ? [a, b] : [b, a];
  const r0 = why(w);
  return L(`${who}between the two, ${lab(w)} has more support in your chart${r0 ? ` (${r0.en})` : ''}; ${lab(l)} is possible too, with more effort.`, `${who}இரண்டில், ${lab(w)} துறைக்கு உங்கள் ஜாதகத்தில் அதிக ஆதரவு${r0 ? ` (${r0.ta})` : ''}; ${lab(l)} துறையும் முடியும் — கூடுதல் முயற்சியுடன்.`);
}
function govtOrPrivate(r, lang, name = '') {
  const L = (en, ta) => (lang === 'ta' ? ta : en);
  let g = 0, p = 0;
  r.groups.forEach((x, i) => { const w = 3 - i; if (['Sun', 'Saturn', 'Jupiter'].includes(x.planet) || x.fields.includes('govt')) g += w; if (['Mercury', 'Venus', 'Rahu', 'Mars', 'Moon', 'Ketu'].includes(x.planet)) p += w; });
  const top = r.groups[0];
  const who = name ? `${name}, ` : '';
  if (g > p) return L(`${who}a government / public-sector job suits your chart more — ${top.planet === 'Sun' || top.planet === 'Saturn' || top.planet === 'Jupiter' ? `${top.planet} leads your career reading` : 'Sun / Saturn / Jupiter support your 10th house'}.`, `${who}அரசு / பொதுத்துறை வேலையே உங்கள் ஜாதகத்துக்கு அதிகம் பொருந்தும் — ${['Sun', 'Saturn', 'Jupiter'].includes(top.planet) ? `${PLANETS[top.planet].ta} தொழில் பலனில் முன்னிலை` : 'சூரியன் / சனி / குரு 10-ம் வீட்டுக்கு ஆதரவு'}.`);
  if (p > g) return L(`${who}private companies suit your chart more — ${top.planet} leads your career reading (${top.fields.slice(0, 2).map((f) => FIELDS[f].en).join(', ')}).`, `${who}தனியார் நிறுவன வேலையே உங்கள் ஜாதகத்துக்கு அதிகம் பொருந்தும் — ${PLANETS[top.planet].ta} தொழில் பலனில் முன்னிலை (${top.fields.slice(0, 2).map((f) => FIELDS[f].ta).join(', ')}).`);
  return L(`${who}both government and private work are supported equally — apply to both, and let the first good offer lead.`, `${who}அரசு, தனியார் — இரண்டுக்கும் சம ஆதரவு; இரண்டுக்கும் விண்ணப்பியுங்கள், முதலில் வரும் நல்ல வாய்ப்பை ஏற்றுக்கொள்ளுங்கள்.`);
}
// WHY: the chart's own reasons, in plain words (slower results are never called a denial).
function whyReasons({ def, bh, strength, current, activeNow, tr, lang }) {
  const L = (en, ta) => (lang === 'ta' ? ta : en);
  const out = [];
  const kb = bh[def.key - 1];
  const lvl = kb.score >= 62 ? L('strong', 'பலமாக உள்ளது') : kb.score >= 48 ? L('steady', 'நிலையாக உள்ளது') : L('in need of effort', 'முயற்சியால் வலுப்பெற வேண்டியது');
  out.push(L(`The key ${ordEn(def.key)} house: its lord ${kb.lord} sits in the ${ordEn(kb.lordHouse)}${kb.occupants.length ? `, with ${kb.occupants.join(', ')} in it` : ''} — ${lvl}.`, `முக்கிய ${def.key}-ம் வீடு: அதிபதி ${pn(kb.lord, 'ta')} ${kb.lordHouse}-ம் வீட்டில்${kb.occupants.length ? `; இந்த வீட்டில் ${kb.occupants.map((o) => pn(o, 'ta')).join(', ')}` : ''} — ${lvl}.`));
  for (const h of def.houses.slice(0, 3)) {
    const b = bh[h - 1];
    if ([6, 8, 12].includes(b.lordHouse) && ![6, 8, 12].includes(h)) out.push(L(`The ${ordEn(h)} lord ${b.lord} sits in the ${ordEn(b.lordHouse)} (a hidden house) — results come after some delay and effort, not denied.`, `${h}-ம் அதிபதி ${pn(b.lord, 'ta')} ${b.lordHouse}-ம் வீட்டில் (மறைவு ஸ்தானம்) — பலன் சற்றுத் தாமதித்து, முயற்சியுடன் வரும்; மறுப்பு அல்ல.`));
    const slow = b.occupants.filter((o) => ['Saturn', 'Rahu', 'Ketu', 'Mars'].includes(o));
    if (slow.length && ![3, 6, 10, 11].includes(h)) out.push(L(`${slow.join(', ')} in the ${ordEn(h)} — tradition reads this as slower, later results (not a denial).`, `${h}-ம் வீட்டில் ${slow.map((o) => pn(o, 'ta')).join(', ')} — மரபுப்படி இது மெதுவான, தாமதமான பலனைக் குறிக்கும் (மறுப்பு அல்ல).`));
  }
  const k = def.karakas.find((x) => strength[x]?.level === 'weak');
  if (k) out.push(L(`The karaka ${k} is weak in your chart (${strength[k].reasons.find((r) => r.pts < 0)?.en || 'low strength'}) — the remedy below supports it.`, `காரகர் ${pn(k, 'ta')} உங்கள் ஜாதகத்தில் பலம் குறைவு (${strength[k].reasons.find((r) => r.pts < 0)?.ta || 'பலம் குறைவு'}) — கீழே உள்ள பரிகாரம் அவருக்கு ஆதரவு.`));
  if (current && activeNow) out.push(L(`The running ${current.md} Dasa / ${current.ad} Bhukti does support this (till ${monthYear(current.end, 'en')}) — the delay is in the effort and the meeting of the right people, so act in this time.`, `நடப்பு ${pn(current.md, 'ta')} தசை / ${pn(current.ad, 'ta')} புக்தி இதற்கு ஆதரவே (${monthYear(current.end, 'ta')} வரை) — தாமதம் முயற்சியிலும் சரியானவர்களைச் சந்திப்பதிலும்; இந்தக் காலத்தில் முயலுங்கள்.`));
  if (current && !activeNow) out.push(L(`The running ${current.md} Dasa / ${current.ad} Bhukti does not activate this matter directly (till ${monthYear(current.end, 'en')}).`, `நடப்பு ${pn(current.md, 'ta')} தசை / ${pn(current.ad, 'ta')} புக்தி இந்த விஷயத்தை நேரடியாக இயக்கவில்லை (${monthYear(current.end, 'ta')} வரை).`));
  for (const st of tr?.status || []) if (['ezharai', 'ashtama', 'guru_weak'].includes(st.id)) out.push(L(`Gochara: ${fixOrd(st.en)}.`, `கோசாரம்: ${st.ta}.`));
  if (out.length < 2) out.push(L('No strong block shows in your chart — the supportive period simply has not begun yet.', 'உங்கள் ஜாதகத்தில் வலுவான தடை எதுவும் இல்லை — சாதகமான காலம் இன்னும் தொடங்கவில்லை, அவ்வளவே.'));
  return out;
}

/**
 * Traditional reading of the running period for health (owner decision, Oct 2026): the body area tradition links with
 * the running Dasa / Bhukti / Gochara and general routine tips — adults only, never a diagnosis, never a disease name,
 * never medicine. Uses shared/health.js when it exposes a period-care helper; otherwise a generic line.
 */
function periodCareLines(hg, chart, now, lang, profile) {
  if (!profile?.adult) return [];
  const fn = HEALTH.periodCare || HEALTH.periodBodyAreas || HEALTH.traditionalCare;
  let lines = [];
  try {
    const r = typeof fn === 'function' ? fn(chart, { now }) : null;
    const list = Array.isArray(r) ? r : r?.lines || r?.areas || [];
    lines = list.map((x) => pick(x.text || x.area || x, lang)).filter((x) => typeof x === 'string' && x);
  } catch { lines = []; }
  if (!lines.length && typeof HEALTH.healthNow === 'function') {
    try {
      const h = HEALTH.healthNow(chart, null, now, { tz: chart.tz });
      if (h && !h.minor && h[lang]) lines.push(h[lang]);
    } catch { /* fall back to the generic line */ }
  }
  const md = hg?.period?.md?.lord;
  if (!lines.length && md) lines.push(lang === 'ta' ? `நடப்பு ${PLANETS[md].ta} தசை: மரபுப்படி இந்தக் காலத்தில் உறக்கம், உணவு நேரம், ஓய்வு ஆகியவற்றில் கூடுதல் கவனம்.` : `Running ${md} Dasa: tradition advises extra care with sleep, regular meal times and rest in this period.`);
  if (lines.length) lines.push(lang === 'ta' ? 'இது நோய் கண்டறிதல் அல்ல — எந்த அறிகுறிக்கும் மருத்துவரைப் பாருங்கள்.' : 'This is not a diagnosis — see a doctor for any symptom.');
  return lines;
}

// ------------------------------------------------------------------ special topics (no house-timing meter)
const done = (a, lang, rel) => validateOffline(a, { lang, inputCertainty: rel?.certainty || 'exact' });
const say = (lang) => (en, ta) => (lang === 'ta' ? ta : en);
const shell = (topic, question, sections, extra = {}) => ({ intent: topic, topic, question, sections, text: textOf(sections), meter: null, actions: [], followups: [], ...extra });

/** Ezharai Sani (Sade Sati), Ashtama Sani and Saturn's transit — with dates — from the Moon sign. */
function saniAnswer({ question, chart, rel, lang, name, life, now }) {
  const L = say(lang);
  if (!chart) return null;
  const profile = ageProfile(life.birthDate || chart, { now, tz: chart.tz });
  if (rel?.rasi === false) {
    const f0 = faithFor(life.faith, question);
    return done(shell('sani', question, [
      { key: 'answer', title: L('Answer', 'பதில்'), lines: [L('Saturn’s transit is read from your Moon sign (Rasi), but the Moon changes sign on your birth day, so the Rasi is not certain. If you know your Rasi from an old horoscope, add the birth time or Rasi and ask again.', 'சனிப் பெயர்ச்சி சந்திர ராசியிலிருந்து பார்க்கப்படும்; உங்கள் பிறந்த நாளில் சந்திரன் ராசி மாறுவதால் ராசி உறுதியில்லை. பழைய ஜாதகத்தில் ராசி தெரிந்தால், பிறந்த நேரத்தையோ ராசியையோ சேர்த்து மீண்டும் கேளுங்கள்.'), L('Saturn is not a curse: whatever the transit, steady work, patience and serving elders are what tradition asks.', 'சனி சாபம் அல்ல: எந்தக் கோசாரமானாலும் தொடர் உழைப்பு, பொறுமை, முதியோருக்குச் சேவை — இதுவே மரபு சொல்வது.')] },
      { key: 'remedy', title: L('A simple practice', 'ஒரு எளிய வழி'), lines: [isHinduFaith(f0) ? L('On Saturdays light a sesame-oil lamp for Lord Shani and serve elders or workers.', 'சனிக்கிழமை சனி பகவானுக்கு நல்லெண்ணெய் தீபம்; முதியோர் / உழைப்பாளருக்குச் சேவை.') : pick(universalPractice('Saturn'), lang)] },
      { key: 'ask', title: pick(ASK_TITLE, lang), lines: [L('Do you know your Rasi or birth star from a family horoscope?', 'குடும்ப ஜாதகத்தில் உங்கள் ராசி அல்லது நட்சத்திரம் தெரியுமா?')] },
    ]), lang, rel);
  }
  const faith = faithFor(life.faith, question);
  const M = chart.planets.Moon.rasi;
  const from = new Date(now.getTime() - 8 * YEAR), to = new Date(now.getTime() + 15 * YEAR);
  const spans = signSpans('Saturn', from, to).map((s) => ({ ...s, h: houseOf(M, s.rasi) }));
  // Group consecutive spans whose house is in `set` (retrograde back-and-forth stays one window).
  const windows = (set) => {
    const out = [];
    for (const s of spans) {
      const last = out[out.length - 1];
      if (set.includes(s.h)) { if (last && !last.closed) last.end = s.end; else out.push({ start: s.start, end: s.end }); } else if (last) last.closed = true;
    }
    return out;
  };
  const sade = windows([12, 1, 2]);
  const ashtama = windows([8]);
  const nowSade = sade.find((w) => w.start <= now && w.end > now);
  const nextSade = sade.find((w) => w.start > now);
  const nowAsh = ashtama.find((w) => w.start <= now && w.end > now);
  const nextAsh = ashtama.find((w) => w.start > now);
  const cur = spans.find((s) => s.start <= now && s.end > now);
  const satH = cur?.h;
  const my = (d) => monthYear(d, lang);
  const phase = { 12: L('first phase (Viraya Sani)', 'முதல் கட்டம் (விரய சனி)'), 1: L('second phase (Janma Sani)', 'இரண்டாம் கட்டம் (ஜென்ம சனி)'), 2: L('last phase (Patha Sani)', 'கடைசிக் கட்டம் (பாத சனி)') }[satH];
  const answer = [];
  if (WORRY_RE.test(question)) answer.push(pick(EMPATHY.default, lang));
  if (nowSade) answer.push(L(`${name ? `${name}, y` : 'Y'}es — Ezharai Sani (Sade Sati) is running for your Rasi: ${my(nowSade.start)} to about ${my(nowSade.end)}. You are in its ${phase}${cur ? `, until ${my(cur.end)}` : ''}.`,
    `${name ? `${name}, ` : ''}ஆம் — உங்கள் ராசிக்கு ஏழரைச் சனி நடக்கிறது: ${my(nowSade.start)} முதல் சுமார் ${my(nowSade.end)} வரை. இப்போது ${phase}${cur ? `, ${my(cur.end)} வரை` : ''}.`));
  else if (nowAsh) answer.push(L(`Ashtama Sani (Saturn 8th from your Moon sign) is running now, until about ${my(nowAsh.end)}.`, `இப்போது அஷ்டமச் சனி (சந்திர ராசிக்கு 8-ல் சனி) நடக்கிறது — சுமார் ${my(nowAsh.end)} வரை.`));
  else answer.push(L(`No Ezharai Sani or Ashtama Sani is running now. Saturn is ${satH ? `${ordEn(satH)} from your Moon sign` : 'in transit'}${cur ? ` until ${my(cur.end)}` : ''}${[3, 6, 11].includes(satH) ? ' — a rewarding position for steady effort' : ''}.`,
    `இப்போது ஏழரைச் சனியோ அஷ்டமச் சனியோ இல்லை. சனி உங்கள் சந்திர ராசிக்கு ${satH || ''}-ம் இடத்தில்${cur ? ` (${my(cur.end)} வரை)` : ''}${[3, 6, 11].includes(satH) ? ' — உழைப்புக்குப் பலன் தரும் இடம்' : ''}.`));
  if (!nowSade && nextSade) answer.push(L(`Your next Ezharai Sani runs from about ${my(nextSade.start)} to ${my(nextSade.end)} — about seven and a half years, in three phases.`, `அடுத்த ஏழரைச் சனி சுமார் ${my(nextSade.start)} முதல் ${my(nextSade.end)} வரை — ஏழரை ஆண்டுகள், மூன்று கட்டங்களாக.`));
  if (!nowAsh && nextAsh && (!nextSade || nextAsh.start < nextSade.start)) answer.push(L(`The next Ashtama Sani period is around ${my(nextAsh.start)} – ${my(nextAsh.end)}.`, `அடுத்த அஷ்டமச் சனி சுமார் ${my(nextAsh.start)} – ${my(nextAsh.end)}.`));
  const qs = normQ(question);
  const askAsh = /ashtama|அஷ்டம/.test(qs), askEnd = /mudi|end|over|finish|முடி/.test(qs), askTransit = /peyarchi|பெயர்ச்சி|transit|palan|பலன்/.test(qs);
  if (askAsh && !nowAsh) answer.splice(WORRY_RE.test(question) ? 1 : 0, 0, L(`Ashtama Sani (Saturn 8th from your Moon sign), which you asked about, is not running now${nextAsh ? ` — the next one is around ${my(nextAsh.start)} – ${my(nextAsh.end)}` : ''}.`, `நீங்கள் கேட்ட அஷ்டமச் சனி (சந்திர ராசிக்கு 8-ல் சனி) இப்போது நடக்கவில்லை${nextAsh ? ` — அடுத்தது சுமார் ${my(nextAsh.start)} – ${my(nextAsh.end)}` : ''}.`));
  if (askEnd && !askAsh) answer.splice(WORRY_RE.test(question) ? 1 : 0, 0, nowSade ? L(`Your Ezharai Sani ends around ${my(nowSade.end)}.`, `உங்கள் ஏழரைச் சனி சுமார் ${my(nowSade.end)}-ல் முடியும்.`) : L(`Ezharai Sani is not running for you now${sade.filter((w) => w.end <= now).slice(-1)[0] ? ` — the last one ended around ${my(sade.filter((w) => w.end <= now).slice(-1)[0].end)}` : ''}.`, `உங்களுக்கு இப்போது ஏழரைச் சனி இல்லை${sade.filter((w) => w.end <= now).slice(-1)[0] ? ` — கடைசியாக வந்தது சுமார் ${my(sade.filter((w) => w.end <= now).slice(-1)[0].end)}-ல் முடிந்தது` : ''}.`));
  if (askTransit && cur) answer.unshift(L(`Saturn’s transit for you: ${satH ? `${ordEn(satH)} from your Moon sign` : 'moving'} until ${my(cur.end)}${[3, 6, 11].includes(satH) ? ' — a rewarding position for steady effort' : [12, 1, 2, 8].includes(satH) ? ' — a slower, more careful period' : ' — a mixed, ordinary position'}.`, `உங்களுக்குச் சனிப் பெயர்ச்சி: சந்திர ராசிக்கு ${satH || ''}-ம் இடம், ${my(cur.end)} வரை${[3, 6, 11].includes(satH) ? ' — உழைப்புக்குப் பலன் தரும் இடம்' : [12, 1, 2, 8].includes(satH) ? ' — மெதுவாக, கவனமாகச் செல்ல வேண்டிய காலம்' : ' — சாதாரணமான, கலவையான இடம்'}.`));
  const chartLines = [
    L(`Your Moon sign (Rasi): ${RASIS[M].en}. Saturn is counted from it — the 12th, 1st and 2nd make Ezharai Sani; the 8th is Ashtama Sani.`, `உங்கள் ராசி: ${RASIS[M].ta}. சனி அதிலிருந்து எண்ணப்படுகிறது — 12, 1, 2-ம் இடங்கள் ஏழரைச் சனி; 8-ம் இடம் அஷ்டமச் சனி.`),
  ];
  if (chart.dasa?.current && rel?.nakshatra !== false) chartLines.push(L(`Running Dasa: ${chart.dasa.current.lord}${chart.dasa.current.lord === 'Saturn' ? ' — Saturn’s own period, which tradition reads as steady effort bringing lasting results' : ''}.`, `நடப்பு தசை: ${pn(chart.dasa.current.lord, 'ta')}${chart.dasa.current.lord === 'Saturn' ? ' — சனியின் சொந்தக் காலம்; தொடர் உழைப்பு நிலையான பலன் தரும் என்பது மரபு' : ''}.`));
  const meaning = [L('Saturn is not a curse and there is no need to fear it: tradition reads it as a teacher — slower results, more responsibility, and lasting rewards for honest, patient work.', 'சனி சாபம் அல்ல; பயப்பட வேண்டாம்: மரபுப்படி அவர் ஒரு ஆசிரியர் — பலன் மெதுவாக வரும், பொறுப்பு கூடும், நேர்மையான பொறுமையான உழைப்புக்கு நிலையான பலன்.'),
    L('Keep health routines regular, avoid shortcuts and big risky loans, and be patient in arguments during this time.', 'இந்தக் காலத்தில் உடல்நலப் பழக்கங்களைச் சீராக வையுங்கள்; குறுக்கு வழி, பெரிய அபாயக் கடன் தவிர்க்கவும்; வாக்குவாதங்களில் பொறுமை.')];
  const rem = isHinduFaith(faith)
    ? [L('On Saturdays light a sesame-oil lamp for Lord Shani or pray to Hanuman, and serve elders or workers — free and simple.', 'சனிக்கிழமைதோறும் சனி பகவானுக்கு நல்லெண்ணெய் தீபம் அல்லது அனுமன் வழிபாடு; முதியோர் / உழைப்பாளருக்குச் சேவை — இலவசம், எளிது.')]
    : [pick(universalPractice('Saturn'), lang), pick(faithBlessing(faith) || faithBlessing('other'), lang)];
  const howAsked = /enna (seiy|pann)|என்ன செய்|remed|parigar|pariharam|பரிகார|what (should|can) i do/.test(qs);
  const sections = [
    { key: 'answer', title: L('Answer', 'பதில்'), lines: answer },
    ...(howAsked ? [{ key: 'dos', title: L('What to do now', 'இப்போது செய்ய வேண்டியவை'), lines: meaning }, { key: 'chart', title: L('What your chart shows', 'உங்கள் ஜாதகம் காட்டுவது'), lines: chartLines }]
      : [{ key: 'chart', title: L('What your chart shows', 'உங்கள் ஜாதகம் காட்டுவது'), lines: chartLines }, { key: 'dos', title: L('What to do now', 'இப்போது செய்ய வேண்டியவை'), lines: meaning }]),
    { key: 'remedy', title: isHinduFaith(faith) ? L('One simple remedy (free)', 'ஒரு எளிய பரிகாரம் (இலவசம்)') : L('A simple practice for every faith', 'எல்லா நம்பிக்கைக்கும் ஏற்ற எளிய வழி'), lines: rem },
    { key: 'ask', title: pick(ASK_TITLE, lang), lines: [L('I can look at one area for this period — is it work, money or family that feels heavy right now?', 'இந்தக் காலத்திற்கு ஒரு பகுதியைப் பார்க்கிறேன் — இப்போது வேலையா, பணமா, குடும்பமா எது கனமாக உள்ளது?')] },
    { key: 'uncertainty', title: pick(LIMITS_TITLE, lang), lines: [pick(LIMITS_LINE, lang)] },
  ];
  const out = shell('sani', question, sections, { actions: [{ go: 'parigaram', label: L('Simple practices', 'எளிய வழிமுறைகள்') }], followups: [L('How will this year be for my career?', 'இந்த ஆண்டு என் தொழில் எப்படி?'), L('When will my debts clear?', 'கடன் எப்போது தீரும்?'), L('Explain my current dasa-bhukti simply', 'என் நடப்பு தசா புக்தியை எளிமையாக விளக்குங்கள்')] });
  return done(guardAnswer(out, profile, lang), lang, rel);
}

/** Chevvai (Mars) and Rahu–Ketu dosham from the chart, explained calmly; disputed labels are named as disputed. */
function doshamAnswer({ question, chart, rel, lang, name, life, now }) {
  const L = say(lang);
  if (!chart) return null;
  const profile = ageProfile(life.birthDate || chart, { now, tz: chart.tz });
  // Dosham is read only for marriage matching after 18 — a child hears nothing frightening.
  const faith = faithFor(life.faith, question);
  if (!profile.adult && !profile.organization) return done({ ...ageGuardAnswer({ topic: 'porutham', profile, lang, name, question, faith }), topic: 'dosham' }, lang, rel);
  const subj = subjectOf(question);
  const planets = rel?.lagna === false ? Object.fromEntries(Object.entries(chart.planets).filter(([k]) => k !== 'Lagna')) : chart.planets;
  let d = null;
  try { d = doshams(planets); } catch { d = null; }
  const answer = [];
  if (subj && ['child', 'grandchild'].includes(subj.kind)) answer.push(L(`For ${subj.en}, dosham is read from their own horoscope — add them in Family and ask again. Here is how it is read, using your chart as the example.`, `${subj.ta} பற்றி தோஷம் அவர்களின் சொந்த ஜாதகத்திலிருந்தே பார்க்கப்படும் — குடும்பம் பகுதியில் சேர்த்து மீண்டும் கேளுங்கள். எப்படிப் பார்க்கப்படுகிறது என்பதற்கு உங்கள் ஜாதகம் உதாரணமாக:`));
  const qd = normQ(question);
  const askedLabel = /kaa?la ?sarpa|kalasarpa|காலசர்ப்ப/.test(qd) ? T('Kala Sarpa', 'காலசர்ப்ப') : /naga|நாக/.test(qd) ? T('Naga', 'நாக') : /pithru|pitru|பித்ரு/.test(qd) ? T('Pithru', 'பித்ரு') : /puthira|புத்திர/.test(qd) ? T('Puthira', 'புத்திர') : null;
  const askedRK = /rahu|ketu|ராகு|கேது/.test(qd);
  const remedyAsked = /parigar|pariharam|parihar|parikaram|remed|பரிகார|enna (seiy|pann)|என்ன செய்/.test(qd);
  const lead0 = answer.length;
  const cv = d?.chevvai;
  if (cv) {
    const refs = [cv.fromLagna && L(`${ordEn(cv.fromLagna)} from Lagna`, `லக்னத்திலிருந்து ${cv.fromLagna}-ம் இடம்`), cv.fromMoon && L(`${ordEn(cv.fromMoon)} from the Moon`, `சந்திரனிலிருந்து ${cv.fromMoon}-ம் இடம்`)].filter(Boolean).join(L(' and ', ', '));
    answer.push(cv.present
      ? L(`Chevvai (Mars) dosham: yes, by the common rule — Mars is ${refs}, and the rule counts the 2nd, 4th, 7th, 8th and 12th.${cv.exceptions?.length ? ` ${cv.exceptions.length} traditional exception(s) also apply in your chart.` : ''}`, `செவ்வாய் தோஷம்: பொதுவிதிப்படி உண்டு — செவ்வாய் ${refs}; இந்த விதி 2, 4, 7, 8, 12-ம் இடங்களை எண்ணும்.${cv.exceptions?.length ? ` உங்கள் ஜாதகத்தில் ${cv.exceptions.length} மரபு விலக்கும் உள்ளது.` : ''}`)
      : L(`Chevvai (Mars) dosham: no — Mars is ${refs}, which the common rule (2nd, 4th, 7th, 8th, 12th) does not count.`, `செவ்வாய் தோஷம்: இல்லை — செவ்வாய் ${refs}; பொதுவிதி (2, 4, 7, 8, 12) இதை எண்ணுவதில்லை.`));
  }
  const rk = d?.rahuKetu;
  if (rk && rk.present !== null) {
    const rh = rk.rahuHouse ?? rk.references?.moon?.rahuHouse;
    answer.push(rk.present
      ? L(`Rahu–Ketu dosham: present by the common rule (Rahu ${ordEn(rh)}).`, `ராகு–கேது தோஷம்: பொதுவிதிப்படி உண்டு (ராகு ${rh}-ம் இடத்தில்).`)
      : L(`Rahu–Ketu dosham: not present by the common rule (Rahu ${ordEn(rh)}).`, `ராகு–கேது தோஷம்: பொதுவிதிப்படி இல்லை (ராகு ${rh}-ம் இடத்தில்).`));
  }
  if (askedRK && answer.length - lead0 === 2) answer.splice(lead0, 2, answer[lead0 + 1], answer[lead0]); // the dosham asked about comes first
  if (askedLabel) {
    answer.splice(lead0, 0, L(`${askedLabel.en} dosham, which you asked about, is a label on which traditions disagree (as are Kala Sarpa, Naga, Pithru and Puthira dosham), so Thunai does not mark it from a chart. Many people are told they have it — they live full family lives. What your chart does show by the common rules:`, `நீங்கள் கேட்ட ${askedLabel.ta} தோஷம் — காலசர்ப்ப, நாக, பித்ரு, புத்திர தோஷம் போல — மரபுகள் ஒத்துப்போகாத பெயர்; எனவே துணை ஜாதகத்திலிருந்து அதைக் குறிப்பதில்லை. இது இருப்பதாகச் சொல்லப்பட்ட பலர் நிறைவான குடும்ப வாழ்க்கை வாழ்கின்றனர். பொதுவிதிப்படி உங்கள் ஜாதகம் காட்டுவது:`));
  }
  const calm = [L('A dosham is not a curse and there is no need to fear it — Chevvai dosham is common in many charts. In marriage matching it is compared like with like (dosha samyam), so a good match is always possible.', 'தோஷம் சாபம் அல்ல; பயப்பட வேண்டாம் — செவ்வாய் தோஷம் பலருக்கும் உண்டு. திருமணப் பொருத்தத்தில் இது ஒரே வகையுடன் ஒப்பிடப்படுகிறது (தோஷ சாம்யம்); எனவே நல்ல பொருத்தம் எப்போதும் சாத்தியம்.'),
    L('You do not need any costly pooja, homam or gemstone; a simple free practice is enough if you wish.', 'விலையுயர்ந்த பூஜை, ஹோமம், ரத்தினம் எதுவும் தேவையில்லை; விரும்பினால் இலவச எளிய வழிபாடே போதும்.')];
  const rem = isHinduFaith(faith)
    ? [L('If you wish: on Tuesdays light a lamp for Lord Murugan and recite Kanda Sashti Kavasam — free and simple.', 'விரும்பினால்: செவ்வாய்தோறும் முருகனுக்குத் தீபம் ஏற்றி கந்த சஷ்டி கவசம் சொல்லுங்கள் — இலவசம், எளிது.')]
    : [pick(universalPractice('Mars'), lang), pick(faithBlessing(faith) || faithBlessing('other'), lang)];
  const sections = [
    { key: 'answer', title: L('Answer', 'பதில்'), lines: answer.length ? answer : [L('Dosham needs the birth details — add them in Family.', 'தோஷம் பார்க்கப் பிறப்பு விவரம் தேவை — குடும்பம் பகுதியில் சேர்க்கவும்.')] },
    ...(() => {
      const meanSec = { key: 'dos', title: L('What this means', 'இதன் பொருள்'), lines: isHinduFaith(faith) ? calm : calm.filter((l) => !hinduText(l)).concat([L('You do not need any costly ritual or gemstone.', 'விலையுயர்ந்த சடங்கோ ரத்தினமோ தேவையில்லை.')]) };
      const remSec = { key: 'remedy', title: remedyAsked ? L('The remedy you asked for (free, optional)', 'நீங்கள் கேட்ட பரிகாரம் (இலவசம், விருப்பம்)') : isHinduFaith(faith) ? L('One simple remedy (free)', 'ஒரு எளிய பரிகாரம் (இலவசம்)') : L('A simple practice for every faith', 'எல்லா நம்பிக்கைக்கும் ஏற்ற எளிய வழி'), lines: rem };
      return remedyAsked ? [remSec, meanSec] : [meanSec, remSec];
    })(),
    { key: 'ask', title: pick(ASK_TITLE, lang), lines: [L('Shall I check porutham with a proposal’s chart, so both doshams are compared fairly?', 'வரனின் ஜாதகத்துடன் பொருத்தம் பார்க்கட்டுமா — இருவரின் தோஷமும் நியாயமாக ஒப்பிடப்படும்?')] },
    { key: 'uncertainty', title: pick(LIMITS_TITLE, lang), lines: [rel?.lagna === false ? L('Birth time is not exact, so only the Moon reference is used.', 'பிறந்த நேரம் துல்லியமில்லை; எனவே சந்திர அடிப்படை மட்டும்.') : pick(LIMITS_LINE, lang)] },
  ];
  return done(shell('dosham', question, sections, { actions: [{ go: 'couple', label: L('Bride & groom porutham', 'மணமகன் – மணமகள் பொருத்தம்') }], followups: [L('When will I get married?', 'எனக்கு எப்போது திருமணம் நடக்கும்?'), L('Check porutham with the bride / groom', 'மணமகன் / மணமகள் பொருத்தம் பாருங்கள்'), L('Which planet is weak for me?', 'எந்தக் கிரகம் எனக்குப் பலவீனம்?')] }), lang, rel);
}

/** Baby name letters (namakshara) from the birth star and pada. */
function namingAnswer({ question, chart, rel, lang, life, now }) {
  const L = say(lang);
  const profile = chart ? ageProfile(life.birthDate || chart, { now, tz: chart.tz }) : null;
  const lines = [];
  if (chart && profile && ['0-5'].includes(profile.band) && rel?.nakshatra !== false) {
    const nl = nameLetters(chart.janmaNakshatra.index, chart.janmaNakshatra.pada);
    lines.push(L(`For this baby’s star ${chart.janmaNakshatra.name}, pada ${chart.janmaNakshatra.pada}, the traditional first letter (namakshara) is “${nl.primary.en}”; the star’s letters are ${nl.all.map((x) => x.en).join(', ')}.`,
      `குழந்தையின் நட்சத்திரம் ${chart.janmaNakshatra.name}, ${chart.janmaNakshatra.pada}-ம் பாதம் — மரபுப்படி பெயரின் முதல் எழுத்து “${nl.primary.ta}”; இந்த நட்சத்திரத்தின் எழுத்துகள்: ${nl.all.map((x) => x.ta).join(', ')}.`));
  } else {
    lines.push(L('The first letter of a baby’s name (namakshara) follows the baby’s own birth star and pada. Add the baby’s birth date, time and place in Family — Thunai will list the letters and names for that star.', 'குழந்தையின் பெயரின் முதல் எழுத்து (நாமாக்ஷரம்) குழந்தையின் சொந்த நட்சத்திரம், பாதத்தைப் பொறுத்தது. குடும்பம் பகுதியில் குழந்தையின் பிறந்த தேதி, நேரம், இடத்தைச் சேர்த்தால், அந்த நட்சத்திரத்திற்கான எழுத்துகளும் பெயர்களும் கிடைக்கும்.'));
  }
  const qn = normQ(question);
  const wantsNames = /\bnames?\b|peru|peyar|பெயர்/.test(qn) && !/letter|ezhuthu|எழுத்து|starting/.test(qn);
  const girl = /girl|daughter|magal|ponnu|பெண் குழந்தை|மகள்/.test(qn), boy = /\bboy\b|\bson\b|magan|paiyan|ஆண் குழந்தை|மகன்/.test(qn);
  if (wantsNames) lines.unshift(L(`For names, open “Baby names” below — it lists ${girl ? 'girls’' : boy ? 'boys’' : ''} names that start with the baby’s star letters, with meanings.`, `பெயர்களுக்கு கீழே உள்ள “குழந்தைப் பெயர்கள்” பகுதியைத் திறங்கள் — நட்சத்திர எழுத்துகளில் தொடங்கும் ${girl ? 'பெண் ' : boy ? 'ஆண் ' : ''}குழந்தைப் பெயர்கள் பொருளுடன் உள்ளன.`));
  lines.push(L('Choose a name that is easy to say, has a good meaning and that the family loves — the letter is a tradition, not a rule.', 'சொல்ல எளிதான, நல்ல பொருள் உள்ள, குடும்பம் விரும்பும் பெயரைத் தேர்ந்தெடுங்கள் — எழுத்து ஒரு மரபு மட்டுமே, கட்டாய விதி அல்ல.'));
  const ceremony = /ceremony|vizha|விழா|சூட்ட|function|date|naal|நாள்/i.test(question);
  const sections = [
    { key: 'answer', title: L('Answer', 'பதில்'), lines },
    ...(ceremony ? [{ key: 'dos', title: L('Naming ceremony', 'பெயர் சூட்டு விழா'), lines: [L('Tradition holds it on the 11th, 12th or 16th day, or on a good day in the first months — the Muhurtham finder lists dates that suit the family.', 'மரபுப்படி 11, 12 அல்லது 16-ம் நாள், அல்லது முதல் மாதங்களில் நல்ல நாளில் — குடும்பத்துக்கு ஏற்ற நாட்களை முகூர்த்தம் பகுதி காட்டும்.')] }] : []),
    { key: 'ask', title: pick(ASK_TITLE, lang), lines: [girl || boy ? L(`Would you like modern or traditional names for the ${girl ? 'girl' : 'boy'}?`, `${girl ? 'பெண்' : 'ஆண்'} குழந்தைக்கு நவீனப் பெயரா, மரபுப் பெயரா?`) : L('Would you like modern or traditional names — and for a boy or a girl?', 'நவீனப் பெயரா, மரபுப் பெயரா — ஆண் குழந்தைக்கா, பெண் குழந்தைக்கா?')] },
    { key: 'uncertainty', title: pick(LIMITS_TITLE, lang), lines: [pick(LIMITS_LINE, lang)] },
  ];
  return done(shell('naming', question, sections, { actions: [{ go: 'names', label: L('Baby names', 'குழந்தைப் பெயர்கள்') }, ...(ceremony ? [{ go: 'muhurtham', label: L('Good dates', 'நல்ல நாள்') }] : [])], followups: [L('Baby names for the star', 'நட்சத்திரப்படி குழந்தைப் பெயர்கள்'), L('Good date for the naming ceremony', 'பெயர் சூட்டு விழாவுக்கு நல்ல நாள்'), L('Star birthday this year', 'இந்த ஆண்டு நட்சத்திரப் பிறந்தநாள்')] }), lang, rel);
}

/** Muhurtham: what tradition checks, today's chart-based cautions, and the family date finder. */
function muhurthamAnswer({ question, chart, rel, lang, life, now, today }) {
  const L = say(lang);
  const q = normQ(question);
  const faith = faithFor(life.faith, question);
  const cat = /gr[iau]h?a ?pravesam|house ?warming|கிரகப்பிரவேச|புதுமனை/i.test(q) ? 'graha_pravesam'
    : /marri|wedding|kalyan|thirumana|திருமண|கல்யாண|engagement|nichay/i.test(q) ? 'marriage'
      : /car|bike|vehicle|vandi|வண்டி|வாகன|கார்/i.test(q) ? 'vehicle'
        : /construct|bhoomi|பூமி|land|plot/i.test(q) ? 'property' : null;
  const sub = /kaa?(th|d)hu ?kuthu|காது குத்து|ear piercing/.test(q) ? T('the ear-piercing ceremony (Kaathu Kuthu)', 'காது குத்து விழா')
    : /thirappu|திறப்பு|shop open|kadai/.test(q) ? T('the shop / business opening', 'கடை / தொழில் திறப்பு விழா')
      : /valaikaa?pp?u|வளைகாப்பு|seemantham|சீமந்த/.test(q) ? T('the Valaikappu / Seemantham', 'வளைகாப்பு / சீமந்தம்')
        : /engagement|nichay|நிச்சய/.test(q) ? T('the engagement', 'நிச்சயதார்த்தம்') : null;
  const event = sub || { graha_pravesam: T('the house-warming', 'கிரகப்பிரவேசம்'), marriage: T('the wedding', 'திருமணம்'), vehicle: T('the vehicle delivery', 'வாகனம் வாங்குதல்'), property: T('starting construction', 'கட்டுமானத் தொடக்கம்') }[cat] || T('your function', 'உங்கள் நிகழ்ச்சி');
  let tr = null;
  try { tr = chart ? cached(chart, `tr|${Math.floor(now.getTime() / DAY)}`, () => transitStatus(chart, now, { faith: life.faith, age: ageProfile(life.birthDate || chart, { now, tz: chart.tz }).age })) : null; } catch { tr = null; }
  const guru = tr?.status?.find((s) => ['guru_balam', 'guru_weak'].includes(s.id));
  const lines = [
    L(`For ${pick(event, 'en')}, tap “Find dates for the family” below — Thunai checks every family member’s star and lists Muhurtham dates and times that suit everyone.`, `${pick(event, 'ta')} — கீழே “குடும்பத்திற்கு நாள் தேடு” அழுத்துங்கள்; ஒவ்வொருவரின் நட்சத்திரத்தையும் பார்த்து, அனைவருக்கும் ஏற்ற முகூர்த்த நாட்களையும் நேரங்களையும் துணை பட்டியலிடும்.`),
    L('Tradition checks the panchangam (tithi, star, weekday), avoids Rahu Kalam, Yamagandam, Ashtami, Navami and Amavasai, and each person’s Chandrashtamam and Tara Balam.', 'பஞ்சாங்கம் (திதி, நட்சத்திரம், கிழமை) பார்த்து, ராகு காலம், எமகண்டம், அஷ்டமி, நவமி, அமாவாசை, ஒவ்வொருவரின் சந்திராஷ்டமம், தாரா பலம் தவிர்ப்பது மரபு.'),
  ];
  const chartLines = [];
  if (guru) chartLines.push(L(`Gochara: ${fixOrd(guru.en)}${cat === 'marriage' ? ' — tradition looks for Guru Balam for a wedding' : ''}.`, `கோசாரம்: ${guru.ta}${cat === 'marriage' ? ' — திருமணத்திற்கு குரு பலம் பார்ப்பது மரபு' : ''}.`));
  if (today?.rahuKalam) chartLines.push(L(`Today’s Rahu Kalam: ${today.rahuKalam}.`, `இன்றைய ராகு காலம்: ${today.rahuKalam}.`));
  const sections = [
    { key: 'answer', title: L('Answer', 'பதில்'), lines },
    ...(chartLines.length ? [{ key: 'chart', title: L('What your chart shows', 'உங்கள் ஜாதகம் காட்டுவது'), lines: chartLines }] : []),
    { key: 'dos', title: L('What to do now', 'இப்போது செய்ய வேண்டியவை'), lines: [L('Fix the venue and the people’s availability first, then pick the best date the finder shows.', 'முதலில் இடம், உறவினர்கள் வசதியை உறுதி செய்து, பிறகு காட்டப்படும் சிறந்த நாளைத் தேர்வு செய்யுங்கள்.'), L('Confirm the final date with your family priest or elders.', 'இறுதி நாளைக் குடும்பப் பெரியோர் / புரோகிதரிடம் உறுதி செய்யுங்கள்.')] },
    { key: 'remedy', title: isHinduFaith(faith) ? L('One simple practice', 'ஒரு எளிய வழிபாடு') : L('A simple practice for every faith', 'எல்லா நம்பிக்கைக்கும் ஏற்ற எளிய வழி'), lines: [isHinduFaith(faith) ? L('Begin with a short prayer to Vinayagar and a lamp.', 'விநாயகர் வழிபாடு, தீபத்துடன் தொடங்குங்கள்.') : L('Begin with a short prayer in your own faith and a word of thanks to the elders.', 'உங்கள் நம்பிக்கைப்படி ஒரு சிறு பிரார்த்தனையுடனும் பெரியோருக்கு நன்றியுடனும் தொடங்குங்கள்.')] },
    { key: 'ask', title: pick(ASK_TITLE, lang), lines: [L('I will match everyone’s stars — which month are you planning for, and who must be present?', 'அனைவரின் நட்சத்திரத்தையும் பொருத்திப் பார்க்கிறேன் — எந்த மாதத்தில் திட்டமிடுகிறீர்கள், யார் யார் இருக்க வேண்டும்?')] },
    { key: 'uncertainty', title: pick(LIMITS_TITLE, lang), lines: [pick(LIMITS_LINE, lang)] },
  ];
  return done(shell('muhurtham', question, sections, { actions: [{ go: 'muhurtham', param: { ...(cat ? { category: cat } : {}), allFamily: true }, label: L('Find dates for the family', 'குடும்பத்திற்கு நாள் தேடு') }], followups: [L('Good time today for important work', 'இன்று முக்கிய வேலைக்கு நல்ல நேரம்'), L('Which festival is coming next?', 'அடுத்து வரும் பண்டிகை எது?'), L('Help our family choose a good date', 'எங்கள் குடும்பத்திற்கு ஏற்ற நாளைத் தேர்வு செய்ய உதவுங்கள்')] }), lang, rel);
}

/** A lost item: practical steps first (police complaint, phone blocking), no accusation, optional prayer. */
function lostAnswer({ question, rel, lang, life }) {
  const L = say(lang);
  const faith = faithFor(life.faith, question);
  const phone = /phone|mobile|போன்|கைப்பேசி/i.test(question);
  const lines = [
    L('First the practical steps: retrace where you last had it, ask at those places, and check bags, the vehicle and home corners calmly.', 'முதலில் நடைமுறை: கடைசியாக எங்கே வைத்திருந்தீர்கள் என்று நினைவுபடுத்தி, அந்த இடங்களில் கேளுங்கள்; பை, வாகனம், வீட்டு மூலைகளை அமைதியாகத் தேடுங்கள்.'),
    phone ? L('For a phone: block the SIM with your operator and the handset on the official Sanchar Saathi (CEIR) portal, and give a police complaint — it often helps recovery.', 'கைப்பேசி என்றால்: சிம்மை நிறுவனத்திடம் முடக்குங்கள், அதிகாரப்பூர்வ சஞ்சார் சாத்தி (CEIR) தளத்தில் கைப்பேசியை முடக்குங்கள், காவல்துறையில் புகார் கொடுங்கள் — மீட்க அது உதவும்.')
      : L('For gold, money or documents: give a police complaint with the bill or a photo, and apply for duplicates of documents.', 'தங்கம், பணம், ஆவணம் என்றால்: பில் / புகைப்படத்துடன் காவல்துறையில் புகார் கொடுங்கள்; ஆவணங்களுக்கு நகல் விண்ணப்பியுங்கள்.'),
    L('Please do not suspect anyone because of a horoscope — no chart can show who took something.', 'ஜாதகத்தை வைத்து யாரையும் சந்தேகிக்க வேண்டாம் — எடுத்தவர் யார் என்று எந்த ஜாதகமும் காட்டாது.'),
  ];
  const sections = [
    { key: 'answer', title: L('Answer', 'பதில்'), lines },
    { key: 'remedy', title: L('If you wish', 'விரும்பினால்'), lines: [isHinduFaith(faith) ? L('Tradition in Tamil Nadu prays to Karthaveeryarjuna for lost things; for a traditional yes / no, use “Is now a good time?” (Prasnam).', 'காணாமல் போனவற்றுக்கு கார்த்தவீர்யார்ஜுனர் வழிபாடு தமிழ் மரபு; மரபு ஆம் / இல்லை அறிய “இப்போது செய்யலாமா?” (பிரசன்னம்) பயன்படுத்துங்கள்.') : L('A short prayer in your own faith can calm the mind while you search.', 'தேடும்போது உங்கள் நம்பிக்கைப்படி ஒரு சிறு பிரார்த்தனை மனதை அமைதிப்படுத்தும்.')] },
    { key: 'ask', title: pick(ASK_TITLE, lang), lines: [L('Where and when did you last have it?', 'கடைசியாக எங்கே, எப்போது வைத்திருந்தீர்கள்?')] },
    { key: 'uncertainty', title: pick(LIMITS_TITLE, lang), lines: [pick(LIMITS_LINE, lang)] },
  ];
  return done(shell('lost', question, sections, { actions: [{ go: 'ask', label: L('Is now a good time? (Prasnam)', 'இப்போது செய்யலாமா? (பிரசன்னம்)') }] }), lang, rel);
}

const SPECIAL = { sani: saniAnswer, dosham: doshamAnswer, naming: namingAnswer, muhurtham: muhurthamAnswer, lost: lostAnswer };

/** Follow-up suggestions when a question is unclear: the three most-asked life topics (adults only). */
export const GENERAL_FOLLOWUPS = [
  T('When will I get married?', 'எனக்கு எப்போது திருமணம் நடக்கும்?'),
  T('How is my career this year?', 'இந்த ஆண்டு என் தொழில் எப்படி?'),
  T('When will my money situation improve?', 'என் பண நிலை எப்போது மேம்படும்?'),
];
/** Follow-ups for an unclear question, chosen by the chart owner's age band (children never see marriage / job / money). */
export const generalFollowups = (profile) => suggestionsFor(profile, GENERAL_FOLLOWUPS).slice(0, 3);

// ------------------------------------------------------------------ suggested-question chips (the most common real questions)
const ADULT_CHIPS = {
  young: [
    T('When will I get a job?', 'எனக்கு எப்போது வேலை கிடைக்கும்?'),
    T('When will I get married?', 'எனக்கு எப்போது திருமணம் நடக்கும்?'),
    T('Government job — when?', 'அரசு வேலை எப்போது கிடைக்கும்?'),
    T('Can I go abroad for studies or work?', 'படிப்பு / வேலைக்கு வெளிநாடு போகலாமா?'),
    T('Which course or field suits me?', 'எனக்கு எந்தப் படிப்பு / துறை ஏற்றது?'),
    T('Love marriage or arranged?', 'காதல் திருமணமா, பெற்றோர் பார்க்கும் திருமணமா?'),
  ],
  middle: [
    T('Our child is getting delayed — when?', 'குழந்தை பாக்கியம் தாமதமாகிறது — எப்போது?'),
    T('When will my debts clear?', 'கடன் எப்போது தீரும்?'),
    T('When can I buy my own house?', 'சொந்த வீடு எப்போது வாங்கலாம்?'),
    T('Promotion or job change — when?', 'பதவி உயர்வு / வேலை மாற்றம் எப்போது?'),
    T('When does my Ezharai Sani end?', 'ஏழரைச் சனி எப்போது முடியும்?'),
    T('Peace at home — what can we do?', 'வீட்டில் நிம்மதிக்கு என்ன செய்யலாம்?'),
    T('Help our family choose a good date', 'எங்கள் குடும்பத்திற்கு ஏற்ற நாளைத் தேர்வு செய்ய உதவுங்கள்'),
  ],
  elder: [
    T('When will my son’s / daughter’s marriage happen?', 'என் மகன் / மகள் திருமணம் எப்போது?'),
    T('My spouse’s health — what can we do?', 'என் துணையின் உடல்நலத்துக்கு என்ன செய்யலாம்?'),
    T('Will my pension and savings stay steady this year?', 'இந்த ஆண்டு பென்ஷன், சேமிப்பு நிலையாக இருக்குமா?'),
    T('How will my grandchildren’s studies be?', 'பேரக்குழந்தைகளின் படிப்பு எப்படி இருக்கும்?'),
    T('A temple journey this year — which one?', 'இந்த ஆண்டு கோவில் யாத்திரை — எங்கே?'),
    T('A calm daily prayer for peace of mind', 'மன அமைதிக்கு ஒரு எளிய தினசரி பிரார்த்தனை'),
  ],
};
/**
 * Suggested-question chips for the Ask Thunai screen, by the chart owner's age band: 18–25 (job, marriage, studies
 * abroad), 26–59 (child delay, debts, house, promotion, Sani), 60+ (children's marriage, spouse's health, pension).
 * Minors and an unknown age get the reviewed band chips (shared/age-guard.js). Other faiths never see temple chips.
 */
export function askSuggestions(profile, { faith = 'hindu', count = 6 } = {}) {
  const band = profile?.band || 'unknown';
  if (band !== 'adult') return suggestionsFor(profile, [], { count });
  const age = profile.age;
  let list = age == null ? ADULT_CHIPS.middle : age <= 25 ? ADULT_CHIPS.young : age >= 60 ? ADULT_CHIPS.elder : ADULT_CHIPS.middle;
  if (!isHinduFaith(faith)) list = list.map((x) => (hinduText(x.en) || /temple|கோவில்/i.test(x.en) ? T('A calm daily prayer in my own faith', 'என் நம்பிக்கைப்படி அமைதிக்கு ஒரு தினசரி பிரார்த்தனை') : x));
  return list.slice(0, count);
}

// ------------------------------------------------------------------ the one entry point the chat screen calls
const GUARD_TOPIC = { marriage: 'marriage', second_marriage: 'marriage', harmony: 'harmony', child: 'child', job: 'job', career: 'career', job_change: 'job_change', business: 'business', loan: 'loan', money: 'money', property: 'property', vehicle: 'vehicle', court: 'court', travel: 'travel' };
const SHARED_TOPIC = { temple: 'temple', remedy: 'weak', kuladeivam: 'kuladeivam' };
const CHILD_FEELINGS = /\b(sad|scared|afraid|lonely|alone|no friends?|bull(y|ied|ies|ying)|teas(e|ed|ing)|fight(ing)? with (my )?friends?|feel bad|parents fight)\b|friends illa|bayam|kavalai|பயம்|தனிமை|கேலி|நண்பர்கள் இல்லை/i;

/**
 * On-device answer to the actual question (pure: the chat screen passes the selected profile in).
 *   p: { text, chart, rel, facts (chartFacts), life, lang, name, today, turns, speaker, profile, deity, childAnswer (screen-supplied
 *        child answer with today's live deity), now }
 * Order: safety (self-harm, abuse, missing person, lifespan) → policy gate (minor facilitation / speaker age) →
 * the life topic (Tamil / Tanglish / English) → special topics (Sani, dosham, naming, muhurtham, lost item) →
 * shared engine (temple, remedy, Kula Deivam, feelings, dasa) → nearest reading with three follow-ups.
 */
export function askThunai({ text, chart = null, rel = null, facts = null, life = {}, lang = 'ta', name = '', today = null, turns = [], speaker = null, profile = null, deity = null, childAnswer = null, now = new Date(), mode = 'chart', loc = null }) {
  const prof = profile || ageProfile(chart ? (life.birthDate || chart) : null, { now, tz: chart?.tz });
  const certainty = rel?.certainty || (chart ? 'exact' : 'none');
  const faith = faithFor(life.faith, text);
  const life2 = { ...life, faith };
  const qt = questionType(text);
  const seed = seedFor(text, life.memberId || name);
  // Every answer: faith filter (not for general knowledge the person asked for), NO meter (Ask never scores),
  // deterministic phrasing variation for answers whose content is genuinely the same, then the offline validator.
  const finish = (a, topic, keepSame = false) => {
    let x = { ...a, topic: a.topic || topic };
    if (!x.general) x = faithFilter(x, faith, lang);
    x = { ...x, meter: null, qtype: x.qtype || qt.type };
    if (!keepSame && !x.policy && !['crisis', 'abuse', 'missing', 'death', 'age_guard', 'policy'].includes(x.intent)) x = varyAnswer(x, seed, lang);
    if (x.sections) x = { ...x, text: textOf(x.sections) };
    return validateOffline(x, { lang, inputCertainty: certainty });
  };
  const shared = (q, intent = null) => composeAnswer({ question: q, lang, facts, name, today, life: life2, turns, speaker, intent });
  // 1. Safety first — no chart, no age gate, no mode in front of it.
  const cls = classify(text);
  if (SAFETY_INTENTS.has(cls.intent) || cls.intent === 'death') {
    const a = shared(text);
    const topic = cls.intent === 'missing' ? 'lost' : cls.intent;
    if (a.policy) return finish(a, topic, true);
    return finish(SAFETY_INTENTS.has(cls.intent) ? safetyClean(a) : withAsk(cleanSharedAnswer(a), lang), topic, true);
  }
  let topic = detectTopic(text);
  // Asking the baby's sex is never answered (sex determination is illegal in India and a chart cannot tell it).
  if (BABY_SEX.test(normQ(text))) return finish(babySexAnswer(text, lang), 'child', true);
  // 2. Policy gate: adult–minor facilitation is declined; a speaker who says they are under 18 gets the child / teen route.
  const gateTopic = /\blove\b|kaa?dh?al|காதல்|crush|girlfriend|boyfriend/i.test(text) ? 'love' : GUARD_TOPIC[topic] || null;
  const gate = policyAnswer(facilitationCheck(text, { turns, speaker }), { lang, question: text, topic: gateTopic, name });
  if (gate) return finish(gate, gate.topic || topic || 'policy', true);
  // 3. General (festival, vratham, scripture, panchangam) or chart question. General questions never get a chart
  // reading — in General mode always, and in chart mode when the question is clearly general (with a switch back).
  const general = generalQuestion(text);
  const personal = personalQuestion(text) || Boolean(topic && LIFE_TOPICS.has(topic) && !general);
  if (mode === 'general') {
    if (personal && !general) return finish(modeSwitchAnswer(text, lang), 'mode_switch', true);
    return finish(generalAnswer(text, { lang, now, loc: loc || chart, faith, prof, auto: false }), 'general_kb');
  }
  if (general && !personal) return finish(generalAnswer(text, { lang, now, loc: loc || chart, faith, prof, auto: true }), 'general_kb');
  // 4. Honesty gate: a question no chart can answer is never given a generic reading.
  if (factualQuestion(text) && (!topic || !personal)) return finish(honestAnswer({ reason: 'factual', text, lang, topic, prof }), 'honest');
  const other = otherPerson(text);
  if (other && topic && LIFE_TOPICS.has(topic) && !subjectOf(text)) return finish(honestAnswer({ reason: 'other', who: pick(other.who, lang), text, lang, topic, prof }), 'honest');
  // A 6–12 child's feelings, bullying or friendship trouble → "tell a trusted adult" (reviewed wording).
  if (prof.band === '6-12' && CHILD_FEELINGS.test(normQ(text))) return finish(shared(text, 'emotional'), 'child_feelings');
  // For a child's chart, "child / kids" means the child — read the other topic the question names (studies, health …).
  if (prof.minor && topic === 'child') topic = detectTopics(text).find((t) => t !== 'child') || null;
  // A teen asking "will I become a doctor / which group" is a studies (aptitude) question.
  if (prof.minor && ['career', 'job'].includes(topic) && !/salary|promotion|சம்பள/i.test(text)) topic = 'education';
  // Work or settling abroad on a child's chart is an adult topic (study trips and family travel stay open).
  if (prof.minor && topic === 'travel' && !/stud|padipp|படிப்|school|trip|temple|kovil|கோவில்|yaath|யாத்திரை/i.test(text)) {
    return finish(ageGuardAnswer({ topic: 'pr', profile: prof, lang, name, question: text, faith }), 'travel');
  }
  // "Is there a dosham delaying my marriage — when?" is a marriage-timing question (the dosham note is added).
  const doshamToo = topic === 'dosham' && /\b(when|eppo|nadakkuma|nadakuma|happen|delay\w*|kidaikkuma|kidaikuma)\b|எப்போது|நடக்குமா|தடையா|கிடைக்குமா/i.test(text) && detectTopics(text).includes('marriage');
  if (doshamToo) topic = 'marriage';
  const subj = subjectOf(text);
  if (topic === 'marriage' && life.maritalStatus === 'married' && !subj) topic = 'harmony';
  const wk = whichKind(topic, text, qt);
  // "Commerce or science — which stream?" names no topic word: the WHICH kind gives it.
  if (!topic && wk) topic = { career: 'career', business: 'business', study: 'education', partner: 'marriage', direction: 'travel' }[wk] || null;
  // WHICH about a son / daughter (field, course, business, partner): their own chart is needed — say so honestly.
  if (subj && ['child', 'grandchild', 'childInLaw'].includes(subj.kind) && ['career', 'business', 'study', 'partner'].includes(wk)) {
    return finish(honestAnswer({ reason: 'child_chart', who: pick(T(subj.en, subj.ta), lang), whoTo: subj.taTo || `${subj.ta}க்கு`, text, lang, topic, prof, kind: wk }), 'honest');
  }
  if (topic && SHARED_TOPIC[topic] && !(['day', 'colour', 'number', 'god', 'gem'].includes(wk) && chart && topic === 'remedy')) {
    const a = cleanSharedAnswer(shared(text, SHARED_TOPIC[topic]));
    return finish(withAsk(prof.minor ? guardAnswer(a, prof, lang) : a, lang, topic), topic);
  }
  // Day / colour / number / god / gem: read straight from this chart (no timing, no generic lists).
  if (chart && ['day', 'colour', 'number', 'god', 'gem'].includes(wk) && !['muhurtham', 'naming', 'sani', 'dosham'].includes(topic)) {
    try { return finish(luckAnswer({ kind: wk, text, chart, rel, lang, name, faith, prof, topic }), wk === 'gem' || wk === 'god' ? 'remedy' : topic || 'luck'); } catch (e) { console.warn('ask which', e); }
  }
  if (topic && chart) {
    try {
      // A WHICH question with no chart-based way to choose ("which bank gives a loan") is answered honestly.
      if (qt.type === 'which' && (!wk || wk === 'prayer') && TOPIC[topic] && !TOPIC[topic].health && wk !== 'prayer') return finish(honestAnswer({ reason: 'which_unknown', text, lang, topic, prof }), 'honest');
      const qtx = wk === 'prayer' ? { ...qt, type: 'how' } : qt;
      let a = topicAnswer({ topic, question: text, chart, rel: rel || {}, lang, name, life: life2, today, turns, speaker, now, subject: subj, qt: qtx });
      if (a && doshamToo && a.sections?.[0]?.key === 'answer') a = withDoshamNote(a, doshamAnswer({ question: text, chart, rel, lang, name, life: life2, now }));
      if (a) return finish(a, topic);
    } catch (e) { console.warn('ask', e); }
  }
  if (topic && !chart) {
    const a = ageGuardAnswer({ topic: GUARD_TOPIC[topic] || topic, profile: ageProfile(null), lang, name, question: text, faith });
    return finish(a, topic);
  }
  const base = shared(text);
  if (base.policy) return finish(base, 'policy', true);
  if (['pain', 'emotional'].includes(base.intent)) return finish(withAsk(cleanSharedAnswer(base), lang, base.intent), base.intent);
  if (prof.minor) {
    // Children: no dasa reading for open questions — a warm, simple answer with today's prayer and good habits.
    const sh = ['general', 'greeting', 'chart', 'dasa', 'weak', 'goodtime', 'dates'].includes(base.intent) ? null : guardAnswer(cleanSharedAnswer(base), prof, lang);
    return finish(sh?.sections?.some((sx) => sx.key === 'answer') ? sh : (childAnswer?.() || childGeneralAnswer({ profile: prof, lang, name, deity, question: text, faith })), 'general');
  }
  // A greeting: the running Dasa–Bhukti in plain words and three follow-ups.
  if (base.intent === 'greeting') {
    const near = cleanSharedAnswer(shared(lang === 'ta' ? 'என் நடப்பு தசா புக்தியை எளிமையாக விளக்குங்கள்' : 'Explain my current dasa-bhukti simply'));
    near.followups = generalFollowups(prof).map((f) => pick(f, lang));
    return finish(withAsk(near, lang, 'general'), 'general');
  }
  // Unclear question: no generic reading passed off as an answer — say so, and offer specific ways forward.
  if (base.intent === 'general') return finish(honestAnswer({ reason: 'unknown', text, lang, topic: null, prof }), 'honest');
  return finish(withAsk(guardAnswer(cleanSharedAnswer(base), prof, lang), lang, base.intent), base.intent);
}

const LIFE_TOPICS = new Set(['second_marriage', 'marriage', 'harmony', 'child', 'job', 'career', 'job_change', 'business', 'money', 'loan', 'education', 'travel', 'property', 'vehicle', 'court', 'family', 'health', 'sani', 'dosham', 'naming']);

// ------------------------------------------------------------------ honest "I cannot answer this from your chart"
const HONEST_REASON = {
  factual: T('This is not something a horoscope can tell (prices, results, news or facts) — please check an official, trusted source.', 'இது ஜாதகம் சொல்லக்கூடிய விஷயம் அல்ல (விலை, முடிவுகள், செய்தி, தகவல்) — அதிகாரப்பூர்வமான, நம்பகமான இடத்தில் பாருங்கள்.'),
  other: T('This is about another person’s own life — reading it from your chart would not be honest; their own horoscope is needed.', 'இது இன்னொருவரின் சொந்த வாழ்க்கை விஷயம் — உங்கள் ஜாதகத்தை வைத்து அவருக்குப் பலன் சொல்வது நேர்மையாகாது; அவருடைய சொந்த ஜாதகம் தேவை.'),
  child_chart: T('Which field, course or partner suits your child shows in their own chart, not in yours.', 'உங்கள் பிள்ளைக்கு எந்தத் துறை / படிப்பு / துணை பொருந்தும் என்பது அவருடைய சொந்த ஜாதகத்தில்தான் தெரியும் — உங்களுடையதில் அல்ல.'),
  which_unknown: T('A chart has no traditional measure to pick between these specific options.', 'இந்தக் குறிப்பிட்ட விருப்பங்களுக்கு இடையே தேர்வு செய்ய ஜாதகத்தில் மரபு அளவுகோல் இல்லை.'),
  unknown: T('I could not tell which part of life this question is about.', 'இந்தக் கேள்வி வாழ்க்கையின் எந்தப் பகுதியைப் பற்றியது என்று எனக்குப் புரியவில்லை.'),
  general_unknown: T('This general question is not in Thunai’s reviewed festival / scripture notes yet.', 'இந்தப் பொதுக் கேள்வி துணையின் சரிபார்க்கப்பட்ட பண்டிகை / புராணக் குறிப்புகளில் இன்னும் இல்லை.'),
};
const HONEST_CHIPS = {
  career: [T('Which profession suits my chart?', 'என் ஜாதகத்திற்கு எந்தத் தொழில் ஏற்றது?'), T('How is my career this year?', 'இந்த ஆண்டு என் தொழில் எப்படி?'), T('When will I get a promotion?', 'பதவி உயர்வு எப்போது கிடைக்கும்?')],
  general: [T('Which profession suits my chart?', 'என் ஜாதகத்திற்கு எந்தத் தொழில் ஏற்றது?'), T('When will my money situation improve?', 'என் பண நிலை எப்போது மேம்படும்?'), T('How is my family life this year?', 'இந்த ஆண்டு என் குடும்ப வாழ்க்கை எப்படி?')],
  festival: [T('When is the next Pradosham?', 'அடுத்த பிரதோஷம் எப்போது?'), T('Upcoming festivals this month', 'இந்த மாதம் வரும் பண்டிகைகள்'), T('What is today’s tithi?', 'இன்று என்ன திதி?')],
};
// The reason names what was actually asked (an election, a price, a friend's marriage …) — never one stock line.
function honestWhy(reason, text, lang, topic, who, whoTo = '') {
  const L = (en, ta) => (lang === 'ta' ? ta : en);
  const q = normQ(text);
  if (reason === 'factual') {
    if (/election|match|world cup|ipl|cricket|தேர்தல்/.test(q)) return L('Who wins an election or a match is decided by people and play — no horoscope can tell it.', 'தேர்தல் அல்லது போட்டியில் யார் வெல்வார் என்பதை மக்களும் ஆட்டமும் தீர்மானிக்கின்றனர் — எந்த ஜாதகமும் அதைச் சொல்லாது.');
    if (/lottery|jackpot|lucky draw|winning number|லாட்டரி/.test(q)) return L('No chart can tell lottery numbers — and please do not stake money on a “lucky number”.', 'லாட்டரி எண்களை எந்த ஜாதகமும் சொல்லாது — “அதிர்ஷ்ட எண்” நம்பிப் பணம் கட்ட வேண்டாம்.');
    if (/gold|petrol|diesel|stock|share|bitcoin|crypto|sensex|nifty|rate|price|விலை/.test(q)) return L('Prices and markets move with the economy, not with a horoscope — check the official rate or a registered adviser.', 'விலைகளும் சந்தையும் பொருளாதாரத்தால் மாறுகின்றன, ஜாதகத்தால் அல்ல — அதிகாரப்பூர்வ விலையையோ பதிவு பெற்ற ஆலோசகரையோ பாருங்கள்.');
    if (/weather|temperature|வானிலை/.test(q)) return L('For weather, use the official forecast — a horoscope does not tell it.', 'வானிலைக்கு அதிகாரப்பூர்வ முன்னறிவிப்பைப் பாருங்கள் — ஜாதகம் அதைச் சொல்லாது.');
    return pick(HONEST_REASON.factual, lang);
  }
  if (reason === 'other' && topic && TOPIC[topic]) return L(`${TOPIC[topic].name.en} of ${who || 'another person'} is their own life — reading it from your chart would not be honest; their own horoscope is needed.`, `${who || 'இன்னொருவர்'} — அவருடைய ${TOPIC[topic].name.ta} அவருடைய சொந்த வாழ்க்கை விஷயம்; உங்கள் ஜாதகத்தை வைத்து அதற்குப் பலன் சொல்வது நேர்மையாகாது — அவருடைய சொந்த ஜாதகம் தேவை.`);
  if (reason === 'child_chart') {
    const opts = questionType(text).options?.fields;
    const what = opts ? opts.map((f) => pick(FIELDS[f] || T(f, f), lang)).join(L(' or ', ' அல்லது ')) : /course|padipp|படிப்|stud|stream|group/.test(q) ? L('which course', 'எந்தப் படிப்பு') : /mapp?illai|ponnu|bride|groom|varan|வரன்|மாப்பிள்ளை/.test(q) ? L('which partner', 'எத்தகைய வரன்') : /business|வியாபார/.test(q) ? L('which business', 'எந்த வியாபாரம்') : L('which field', 'எந்தத் துறை');
    return L(`${what} suits ${who || 'your child'} shows in their own chart, not in yours.`, `${whoTo || 'உங்கள் பிள்ளைக்கு'} ${what} பொருந்தும் என்பது அவருடைய சொந்த ஜாதகத்தில்தான் தெரியும் — உங்களுடையதில் அல்ல.`);
  }
  return pick(HONEST_REASON[reason] || HONEST_REASON.unknown, lang);
}
function honestAnswer({ reason, text, lang, topic = null, prof = null, who = '', whoTo = '', kind = null, ai = true }) {
  const L = (en, ta) => (lang === 'ta' ? ta : en);
  const next = [];
  if (reason === 'other' || reason === 'child_chart') next.push(L(`${who ? `${who.charAt(0).toUpperCase()}${who.slice(1)}: a` : 'A'}dd their birth date, time and place in Family, open their profile and ask again — the answer will come from their own chart.`, `${who ? `${who}: ` : ''}அவருடைய பிறந்த தேதி, நேரம், இடத்தைக் குடும்பம் பகுதியில் சேர்த்து, அவருடைய சுயவிவரத்தைத் திறந்து மீண்டும் கேளுங்கள் — பதில் அவருடைய சொந்த ஜாதகத்திலிருந்து வரும்.`));
  if (reason === 'child_chart' && kind === 'study') next.push(L('Meanwhile: their interest, last two years’ marks and a free aptitude test say more than any chart.', 'அதுவரை: அவருடைய ஆர்வம், கடந்த இரண்டு ஆண்டு மதிப்பெண்கள், ஒரு இலவசத் திறனறி தேர்வு — இவை எந்த ஜாதகத்தையும் விட அதிகம் சொல்லும்.'));
  if (reason === 'factual') next.push(L('For prices, results and news, use the official website or app of that service.', 'விலை, முடிவுகள், செய்திகளுக்கு அந்தச் சேவையின் அதிகாரப்பூர்வ இணையதளம் / செயலியைப் பாருங்கள்.'));
  if (reason === 'general_unknown') next.push(L('Open the Tamil calendar for festival and vratham dates, or ask about a specific festival by name.', 'பண்டிகை, விரத நாட்களுக்குத் தமிழ் நாட்காட்டியைத் திறக்கலாம், அல்லது ஒரு குறிப்பிட்ட பண்டிகையின் பெயரைச் சொல்லிக் கேளுங்கள்.'));
  next.push(L('Or tap one of the questions below — I will answer it from your chart, clearly.', 'அல்லது கீழே உள்ள கேள்விகளில் ஒன்றைத் தொடுங்கள் — உங்கள் ஜாதகப்படி தெளிவான பதில் தருகிறேன்.'));
  const ask = reason === 'other' || reason === 'child_chart'
    ? L('Shall I answer the part of this that concerns you — your own family life or plans?', 'இதில் உங்களைப் பற்றிய பகுதிக்கு — உங்கள் குடும்ப வாழ்க்கை அல்லது திட்டங்களுக்கு — பதில் சொல்லட்டுமா?')
    : reason === 'general_unknown' ? L('Which festival or vratham would you like to know about?', 'எந்தப் பண்டிகை / விரதம் பற்றி அறிய விரும்புகிறீர்கள்?')
      : L('What would you like to know — work, marriage, money, family or health?', 'எதைத் தெரிந்துகொள்ள விரும்புகிறீர்கள் — வேலை, திருமணம், பணம், குடும்பம், உடல்நலம்?');
  const sections = [
    { key: 'answer', title: L('Answer', 'பதில்'), lines: [L('I cannot give a firm answer to this question from your horoscope — and I will not show a general reading in its place.', 'இந்தக் கேள்விக்கு உங்கள் ஜாதகத்திலிருந்து உறுதியான பதில் தர இயலவில்லை — அதற்குப் பதிலாகப் பொதுவான பலனைக் காட்ட மாட்டேன்.'), honestWhy(reason, text, lang, topic, who, whoTo)] },
    { key: 'next', title: L('What you can do', 'நீங்கள் செய்யக்கூடியவை'), lines: next },
    { key: 'ask', title: pick(ASK_TITLE, lang), lines: [ask] },
  ];
  const chipSet = reason === 'general_unknown' ? HONEST_CHIPS.festival : TOPIC[topic]?.follow || (['career', 'job', 'job_change', 'business'].includes(topic) ? HONEST_CHIPS.career : null);
  const followups = prof?.minor ? suggestionsFor(prof).slice(0, 3).map((o) => pick(o, lang)) : (chipSet || HONEST_CHIPS.general).map((f) => pick(f, lang));
  const actions = [];
  if (reason === 'other' || reason === 'child_chart') actions.push({ go: 'family', param: { add: true }, label: L('Add their chart', 'அவருடைய ஜாதகத்தைச் சேர்க்க') });
  if (ai) actions.push({ ai: true, label: L('Detailed answer', 'விரிவான பதில்') });
  return { intent: 'honest', honest: true, honestReason: reason, topic: topic || 'general', question: text, sections, text: textOf(sections), meter: null, actions, followups, general: reason === 'general_unknown' };
}

// ------------------------------------------------------------------ general knowledge (festivals, vratham, scripture)
// The reviewed general engine (shared/spiritual-kb.js) is loaded lazily and optionally: until it is present (or for
// a question it does not cover) the app's own calendar answers "when is <festival>" and anything else is answered
// honestly, with "Detailed answer" (server AI, general-knowledge prompt) offered. A chart reading is never shown.
const KB_URL = './shared/spiritual-kb.js';
let KB = null;
let kbPromise = null;
export function loadGeneralKB() {
  kbPromise ||= import(/* @vite-ignore */ KB_URL).then((m) => { KB = m; return m; }).catch(() => null);
  return kbPromise;
}
loadGeneralKB();
// Festival names in the question → the app calendar's festival name (shared/tamilcal.js tamilDay().festivals).
const FEST_ALIAS = [
  [/saraswath?i|சரஸ்வதி|ayudha|ஆயுத/, /Saraswathi Pooja/], [/vijaya ?dasami|விஜயதசமி/, /Vijayadasami/], [/deepavali|diwali|தீபாவளி/, /Deepavali/],
  [/mattu pongal|மாட்டுப் பொங்கல்/, /Mattu Pongal/], [/pongal|பொங்கல்/, /Thai Pongal/], [/karthigai deepam|கார்த்திகை தீப/, /Karthigai Deepam/],
  [/vaikunta|வைகுண்ட/, /Vaikunta Ekadasi/], [/ekadas(h)?i|ஏகாதசி/, /^Ekadasi/], [/pradosh\w*|பிரதோஷ/, /Pradosham/], [/pournami|full moon|பௌர்ணமி/, /Pournami/],
  [/mahalaya|மகாளய/, /Mahalaya/], [/amavas\w*|new moon|அமாவாசை/, /^Amavasai/], [/kanda sashti|skanda|சூரசம்ஹார|soorasam/, /Kanda Sashti/], [/sh?as?h?ti|sashti|சஷ்டி/, /Sashti Viratham/],
  [/sankatahara|சங்கடஹர|chath?urth?i|சதுர்த்தி/, /Chathurthi/], [/sivarath?ri|shivarath?ri|சிவராத்திரி/, /Sivarathri/], [/navarath?ri|நவராத்திரி/, /Navarathri/],
  [/thai ?poosam|தைப்பூச/, /Thai Poosam/], [/arudra|ஆருத்ரா/, /Arudra/], [/kiruth?igai|கிருத்திகை|karthigai viratham/, /Karthigai Viratham/], [/thiruvonam|திருவோண/, /Thiruvonam/],
];
const calCache = new Map();
function calendarDateAnswer(text, { lang, now, loc }) {
  const q = normQ(text);
  if (!/when|eppo|எப்போ|next|adutha|அடுத்த|date|thethi|தேதி|naal|நாள்|which day|endha naal/.test(q)) return null;
  const hit = FEST_ALIAS.find(([re]) => re.test(q));
  if (!hit) return null;
  const lat = loc?.lat ?? 13.0827, lon = loc?.lon ?? 80.2707, tz = loc?.tz ?? 5.5;
  const day0 = Math.floor((now.getTime() + tz * 3600000) / DAY);
  const key = `${hit[1]}|${day0}|${lat.toFixed(1)}|${lon.toFixed(1)}`;
  if (!calCache.has(key)) {
    let found = null;
    for (let d = 0; d < 400 && !found; d++) {
      const noon = new Date((day0 + d) * DAY + (12 - tz) * 3600000);
      try { found = (tamilDay(noon, lat, lon, tz).festivals || []).find((f) => hit[1].test(f.en)) ? { date: noon, fe: (tamilDay(noon, lat, lon, tz).festivals || []).find((f) => hit[1].test(f.en)) } : null; } catch { /* skip day */ }
    }
    calCache.set(key, found);
    if (calCache.size > 60) calCache.delete(calCache.keys().next().value);
  }
  const f = calCache.get(key);
  if (!f) return null;
  const d = new Date(f.date.getTime() + tz * 3600000);
  const dateTa = `${d.getUTCDate()} ${MONTHS_TA[d.getUTCMonth()]} ${d.getUTCFullYear()}`, dateEn = `${d.getUTCDate()} ${MONTHS_EN[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  const wd = T(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getUTCDay()], ['ஞாயிறு', 'திங்கள்', 'செவ்வாய்', 'புதன்', 'வியாழன்', 'வெள்ளி', 'சனி'][d.getUTCDay()]);
  const L = (en, ta) => (lang === 'ta' ? ta : en);
  const sections = [
    { key: 'answer', title: L('Answer', 'பதில்'), lines: [L(`${f.fe.en}: ${dateEn} (${wd.en}), by the app’s Tamil calendar for your place.`, `${f.fe.ta || f.fe.en}: ${dateTa} (${wd.ta}) — உங்கள் ஊருக்கான துணை தமிழ் நாட்காட்டிப்படி.`)] },
    { key: 'next', title: L('Good to know', 'தெரிந்துகொள்ள'), lines: [L('Festival days can differ by a day between panchangams and temples — your family temple’s or priest’s announcement comes first.', 'பஞ்சாங்கம் / கோவிலுக்கு ஏற்ப விழா நாள் ஒரு நாள் மாறலாம் — உங்கள் கோவில் / புரோகிதர் அறிவிப்பே முதன்மை.'), L('The Tamil calendar shows the timings and lets you set a reminder.', 'நேரங்களுடன் தமிழ் நாட்காட்டியில் பார்க்கலாம்; நினைவூட்டலும் அமைக்கலாம்.')] },
  ];
  return { intent: 'general_kb', topic: 'festival', general: true, question: text, sections, text: textOf(sections), meter: null, actions: [{ go: 'calendar', label: L('Tamil calendar', 'தமிழ் நாட்காட்டி') }], followups: HONEST_CHIPS.festival.map((x) => pick(x, lang)) };
}
const CHART_LINE = /\bdasa\b|\bbhukti\b|\bhouse \d|\d(st|nd|rd|th) house|தசை|புக்தி|-ம் வீடு|-ம் பாவம்|lagna|லக்ன/i;
function generalAnswer(text, { lang, now, loc, faith, prof, auto }) {
  const L = (en, ta) => (lang === 'ta' ? ta : en);
  let a = null;
  try {
    const g = KB?.answerGeneral?.(text, { lang, now, loc, tz: loc?.tz, faith });
    if (g?.sections?.length) {
      // Never a chart line in a general answer, whatever the source.
      const sections = g.sections.map((s) => ({ ...s, lines: (s.lines || []).filter((l) => !CHART_LINE.test(l)) })).filter((s) => s.lines.length);
      if (sections.length) a = { intent: 'general_kb', topic: g.topic || 'general_kb', general: true, question: text, sections, text: textOf(sections), meter: null, actions: g.actions || [], followups: g.followups || [], sources: g.sources || [] };
    }
  } catch (e) { console.warn('general kb', e); }
  a ||= calendarDateAnswer(text, { lang, now, loc }) || honestAnswer({ reason: 'general_unknown', text, lang, prof });
  a = { ...a, general: true, mode: 'general' };
  if (auto) {
    a.modeNote = L('Answered as a general question (not from your chart).', 'பொது விஷயமாகப் பதில் (உங்கள் ஜாதகப்படி அல்ல).');
    a.actions = [...(a.actions || []), { mode: 'chart', label: L('Ask about my chart instead', 'ஜாதகப்படி கேட்க') }];
  }
  return a;
}
function modeSwitchAnswer(text, lang) {
  const L = (en, ta) => (lang === 'ta' ? ta : en);
  const sections = [
    { key: 'answer', title: L('Answer', 'பதில்'), lines: [L('This is a question about you — switch to “About my chart” and I will answer it from your own horoscope.', 'இது உங்களைப் பற்றிய கேள்வி — “ஜாதகம் பற்றி” முறைக்கு மாற்றினால் உங்கள் ஜாதகப்படி பதில் தருகிறேன்.')] },
    { key: 'ask', title: pick(ASK_TITLE, lang), lines: [L('Shall I switch and answer from your chart?', 'மாற்றி உங்கள் ஜாதகப்படி பதில் சொல்லட்டுமா?')] },
  ];
  return { intent: 'mode_switch', topic: 'mode_switch', general: true, question: text, sections, text: textOf(sections), meter: null, actions: [{ mode: 'chart', label: L('Switch to: About my chart', 'ஜாதகம் பற்றி — மாற்று') }], followups: [], switchMode: 'chart' };
}

// Day / colour / number / god / gem, read straight from the chart (shared/ask-which.js).
function luckAnswer({ kind, text, chart, rel, lang, name, faith, prof, topic }) {
  const L = (en, ta) => (lang === 'ta' ? ta : en);
  const W = kind === 'god' ? godLines(chart, lang, { rel, faith, name }) : kind === 'gem' ? gemLines(chart, lang, { rel, faith, name, profile: prof }) : luckLines(kind, chart, lang, { rel, name, vehicle: topic === 'vehicle', question: text });
  const ask = { number: T('Is this for a phone or vehicle number, or a date to start something?', 'இது கைப்பேசி / வாகன எண்ணுக்கா, அல்லது ஒன்றைத் தொடங்கும் தேதிக்கா?'), colour: T('Is it for clothes, a vehicle or the house?', 'உடைக்கா, வாகனத்துக்கா, வீட்டுக்கா?'), day: T('What are you planning to start on that day?', 'அந்த நாளில் எதைத் தொடங்கத் திட்டமிடுகிறீர்கள்?'), god: T('Would you like a simple daily prayer for this deity?', 'இந்தத் தெய்வத்துக்கு ஒரு எளிய தினசரி வழிபாடு வேண்டுமா?'), gem: T('Shall I give you the free practice for this planet to keep for 48 days?', '48 நாள் தொடர இந்தக் கிரகத்துக்கான இலவச வழிபாட்டைத் தரட்டுமா?') }[kind];
  const sections = [
    { key: 'answer', title: L('Answer', 'பதில்'), lines: W.answer },
    { key: 'chart', title: L('Why — what your chart shows', 'ஏன் — உங்கள் ஜாதகம் காட்டுவது'), lines: W.chart },
    { key: 'ask', title: pick(ASK_TITLE, lang), lines: [pick(kind === 'god' && !isHinduFaith(faith) ? T('Would you like a short daily practice that fits your faith?', 'உங்கள் நம்பிக்கைக்கு ஏற்ற ஒரு சிறு தினசரி வழி வேண்டுமா?') : ask, lang)] },
    { key: 'uncertainty', title: pick(LIMITS_TITLE, lang), lines: [pick(LIMITS_LINE, lang)] },
  ];
  const out = { intent: kind === 'gem' || kind === 'god' ? 'remedy' : 'luck', topic: kind === 'gem' || kind === 'god' ? 'remedy' : topic || 'luck', question: text, sections, text: textOf(sections), meter: null, qtype: 'which', whichKind: kind, shape: 'which', actions: kind === 'gem' || kind === 'god' ? [{ go: 'parigaram', label: isHinduFaith(faith) ? L('Parigaram & temple', 'பரிகாரம் & கோவில்') : L('Simple practices', 'எளிய வழிமுறைகள்') }] : [], followups: [] };
  return prof?.minor ? guardAnswer(out, prof, lang) : out;
}

// "Boy or girl?" — never predicted.
const BABY_SEX = /boy or (a )?girl|girl or (a )?boy|aa?n (kuzh|kozh|kul)\w* ?(ah|a)? ?pen|paiyan (pirapp|porapp)\w*|ponnu (pirapp|porapp)\w*|sex of (the|my) baby|gender of (the|my) baby|ஆண் குழந்தை[^?]{0,30}பெண் குழந்தை|ஆணா பெண்ணா/i;
function babySexAnswer(question, lang) {
  const L = say(lang);
  const sections = [
    { key: 'answer', title: L('Answer', 'பதில்'), lines: [
      L('A horoscope cannot tell whether a baby is a boy or a girl, and Thunai never predicts it — in India, finding this out before birth is also against the law (PCPNDT Act).', 'குழந்தை ஆணா பெண்ணா என்பதை ஜாதகம் சொல்ல முடியாது; துணை அதைக் கணிப்பதில்லை — இந்தியாவில் பிறப்புக்கு முன் குழந்தையின் பாலினத்தைக் கண்டறிவது சட்டப்படி குற்றமும் கூட (PCPNDT சட்டம்).'),
      L('Every child is a blessing. What matters now is the mother’s health — regular check-ups with your doctor, good food and rest.', 'ஒவ்வொரு குழந்தையும் ஒரு வரம். இப்போது முக்கியம் தாயின் ஆரோக்கியம் — மருத்துவரிடம் சீரான பரிசோதனை, சத்தான உணவு, ஓய்வு.'),
    ] },
    { key: 'ask', title: pick(ASK_TITLE, lang), lines: [L('Would you like the name letters for the baby’s star, or a calm prayer for a safe delivery?', 'குழந்தையின் நட்சத்திரப் பெயர் எழுத்துகள் வேண்டுமா, அல்லது சுகப்பிரசவத்திற்கு ஒரு அமைதியான பிரார்த்தனை வேண்டுமா?')] },
  ];
  return shell('child', question, sections, { actions: [{ go: 'names', label: L('Baby names', 'குழந்தைப் பெயர்கள்') }] });
}
/** Another faith (or none): any Hindu deity / temple / mantra line is swapped for practice that fits every faith. */
function faithFilter(a, faith, lang) {
  if (isHinduFaith(faith) || !a?.sections) return a;
  const keys = new Set(['answer', 'dos', 'remedy', 'practice', 'prayer', 'next', 'note', 'support', 'ask']);
  const sections = a.sections.map((s) => {
    if (!keys.has(s.key)) return s;
    const kept = (s.lines || []).filter((l) => !hinduText(l));
    if (kept.length === (s.lines || []).length) return s;
    return { ...s, lines: [...kept, pick(NEUTRAL_PRAYER, lang)] };
  });
  return { ...a, sections, text: textOf(sections), followups: (a.followups || []).filter((f) => !hinduText(f)) };
}

const SHARED_ASK = {
  temple: T('Would you like me to plan the visit — dates, route and cost?', 'பயணத்தைத் திட்டமிடட்டுமா — தேதி, வழி, செலவு?'),
  weak: T('Shall I pick one simple practice for you to keep for 48 days?', '48 நாள் தொடர ஒரு எளிய வழிபாட்டைத் தேர்ந்து தரட்டுமா?'),
  remedy: T('Shall I pick one simple practice for you to keep for 48 days?', '48 நாள் தொடர ஒரு எளிய வழிபாட்டைத் தேர்ந்து தரட்டுமா?'),
  kuladeivam: T('Do you know your family’s native village? Elders there usually remember the Kula Deivam.', 'உங்கள் குடும்பத்தின் பூர்வீக ஊர் தெரியுமா? அங்குள்ள பெரியோர் பொதுவாகக் குலதெய்வத்தை நினைவில் வைத்திருப்பார்கள்.'),
  default: T('Is there one part of this you would like me to look at more closely?', 'இதில் எந்தப் பகுதியை இன்னும் விரிவாகப் பார்க்கட்டும்?'),
};
/** "Is a dosham delaying my marriage?": the marriage answer, with the chart's dosham reading added to the direct answer. */
function withDoshamNote(a, d) {
  const lines = (d?.sections || []).find((s) => s.key === 'answer')?.lines || [];
  const calm = (d?.sections || []).find((s) => s.key === 'dos')?.lines?.[0];
  if (!lines.length) return a;
  const sections = a.sections.map((s, i) => (i === 0 ? { ...s, lines: [...s.lines, ...lines, ...(calm ? [calm] : [])] } : s));
  return { ...a, sections, text: textOf(sections) };
}
/** Add the gentle follow-up question (the fifth part) when an answer has none. */
function withAsk(a, lang, topic = 'default') {
  if (!a?.sections || a.sections.some((s) => s.key === 'ask') || a.intent === 'age_guard' || a.policy) return a;
  const sections = [...a.sections];
  const at = sections.findIndex((s) => s.key === 'uncertainty');
  const ask = { key: 'ask', title: pick(ASK_TITLE, lang), lines: [pick(SHARED_ASK[topic] || SHARED_ASK[SHARED_TOPIC[topic]] || SHARED_ASK.default, lang)] };
  if (at >= 0) sections.splice(at, 0, ask); else sections.push(ask);
  return { ...a, sections, text: textOf(sections) };
}
/** Safety answers (crisis, abuse, missing person) keep only the help: no question echo, no chart, no limits line. */
function safetyClean(a) {
  const sections = (a.sections || []).filter((s) => !['question', 'uncertainty', 'factors', 'interpretation', 'prayer'].includes(s.key));
  return { ...a, sections, meter: null, text: textOf(sections) };
}

export { ageProfile, guardAnswer, ageGuardAnswer, topicAllowed };
export { childGeneralAnswer, suggestionsFor, facilitationCheck, policyAnswer, LIMITED_LABEL, LIMITS_LINE } from './shared/age-guard.js';
export { validateOffline };

/** Lines that must never reach the user (referrals away from the app, review labels, evidence ids). */
const HIDE = /astrologer|jothidar|ஜோதிடர|expert review|awaiting|proposed rule|not a prediction|முன்னறிவிப்பு அல்ல|rule id|ruleId|engine|இயந்திர|evidence|ஆதாரம்|source:|reviewer|மதிப்பாய்வு/i;
/**
 * Clean an answer from the shared engine for display: drop the question echo and referral lines. The limits /
 * uncertainty section is KEPT as one short line (the engine's own first uncertainty line when it is clean, else the
 * standard limits line) so every rule-based answer says what it cannot know.
 */
export function cleanSharedAnswer(ans) {
  if (!ans?.sections) return ans;
  const lang = ans.lang === 'en' || (!ans.lang && !/[஀-௿]/.test(ans.text || '')) ? 'en' : 'ta';
  const policy = ans.intent === 'policy' || ans.intent === 'age_guard';
  const sections = ans.sections
    .filter((s) => s.key !== 'question')
    .map((s) => {
      if (s.key !== 'uncertainty') return { ...s, lines: (s.lines || []).filter((l) => !HIDE.test(l)) };
      const keep = (s.lines || []).find((l) => !HIDE.test(l) && l.length <= 200);
      return { ...s, lines: [keep || pick(LIMITS_LINE, lang)] };
    })
    .filter((s) => s.lines.length);
  if (!policy && !sections.some((s) => s.key === 'uncertainty')) sections.push({ key: 'uncertainty', title: lang === 'ta' ? 'வரம்பு' : 'Limits', lines: [pick(LIMITS_LINE, lang)] });
  return { ...ans, sections, text: sections.map((s) => `${s.title}:\n${s.lines.map((l) => `• ${l}`).join('\n')}`).join('\n\n') };
}
export const hiddenText = (s) => HIDE.test(String(s || ''));
