// Ask Thunai — on-device answers that follow the ACTUAL question.
// Topic router (Tamil script, Tanglish and English spellings) → the houses, lords, Dasa–Bhukti and Gochara
// that tradition reads for that topic → a clear headline, favourable periods, do's & don'ts and a free parigaram.
// Works fully offline (no server). Safety topics (self-harm, death / lifespan, pain) are answered by the
// shared safety engine and never by this module. No death, lifespan, accident, disease or affair predictions.
import { planetPositions, PLANETS, RASIS } from './shared/astro.js';
import { bhavaAnalysis, transitStatus } from './shared/analysis.js';
import { grahaStrength, NAVAGRAHA } from './shared/remedies.js';
import { significations, planetScore } from './shared/predict.js';
import { REPORT_YEARS, horizonLabel } from './shared/report-horizon.js';
import { healthGuide } from './shared/health.js';
import { ageProfile, topicAllowed, ageGuardAnswer, guardAnswer, suggestionsFor, facilitationCheck, policyAnswer, LIMITED_LABEL, LIMITS_LINE } from './shared/age-guard.js';
import { validateOffline } from './shared/guidance.js';

const DAY = 86400000;
const T = (en, ta) => ({ en, ta });
const MONTHS_TA = ['ஜனவரி', 'பிப்ரவரி', 'மார்ச்', 'ஏப்ரல்', 'மே', 'ஜூன்', 'ஜூலை', 'ஆகஸ்ட்', 'செப்டம்பர்', 'அக்டோபர்', 'நவம்பர்', 'டிசம்பர்'];
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ASPECTS = { Jupiter: [1, 5, 7, 9], Saturn: [1, 3, 7, 10] };

// ------------------------------------------------------------------ topic detection
// Order matters: the most specific topic first ("second marriage" before "marriage", "loan" before "money").
const MARRY = 'thiru?mana?m|thiruman|tiruman|kall?y?aa?n[ae]?m|kalyanam|marri|marry|mar+[iae]+g|wedd|shaad|திருமண|கல்யாண|மணம்';
export const TOPICS = [
  { id: 'second_marriage', re: new RegExp(`(second|2nd|another|again|re-?marr|remarriage|rend?aa?va?(th|d)h?u|rendavadhu|randavathu|irand?aa?va?(th|d)h?u|irandam|innoru|marumana?m|maru ?(thiru|kalyan)|இரண்டாவது|இரண்டாம்|இன்னொரு|மறு ?மண|மறுமண|மறு திருமண)[\\s\\S]{0,30}(${MARRY})|(${MARRY})[\\s\\S]{0,20}(again|second|rend?aa?va?thu|marupadi|மறுபடி)|marumana?m|மறுமண`, 'i') },
  { id: 'harmony', re: /husband.?wife|wife.?husband|misunderstand|quarrel|fight with (my )?(wife|husband)|separat|divorce|sandai|chandai|purithal|kanavan.?manaivi|purushan|pondatti|சண்டை|கணவன்.?மனைவி|பிரிவு|விவாகரத்து|ஒற்றுமை|புரிதல்/i },
  { id: 'marriage', re: new RegExp(`${MARRY}|spouse|alliance|ponnu|maap+ill?ai|mappillai|varan|jodi|bride|groom|life ?partner|வரன்|மாப்பிள்ளை|பெண் பார்|மணமகன்|மணமகள்|வாழ்க்கைத் துணை`, 'i') },
  { id: 'child', re: /\bkids?\b|child|children|\bbaby\b|pregnan|conceiv|santh?h?aa?nam|kuzh?andh?ai|kulandh?ai|kuzhanth?ai|kulanth?ai|kozhanthai|\bpillai|kuzhandhai|குழந்தை|பிள்ளை|சந்தான|கர்ப்ப|மகப்பேறு/i },
  { id: 'business', re: /business|busine?ss|start.?up|own (shop|company|firm)|partnership|vyaa?baa?ram|viyabaram|viyaabaaram|yabaram|kadai (vaikk|podu|open)|sontha? ?(tholil|thozhil)|தொழில் தொடங்க|வியாபார|வணிக|கடை (வை|திற)|சொந்த தொழில்|கூட்டுத் தொழில்/i },
  { id: 'job_change', re: /job ?change|change (my )?job|switch(ing)? (job|company)|new company|resign|vela ?maa?th|velai ?maa?th|company maa?th|வேலை மாற்ற|வேலை மாறு|ராஜினாமா|நிறுவனம் மாற/i },
  { id: 'job', re: /get (a )?job|no job|jobless|unemploy|government job|govt job|interview|vela ?(kida|kedai|illa|varu|eppo)|velai ?(kida|kedai|illa|varu|eppo)|vela kidaikum|velai kidaik|udyogam|uththiyogam|அரசு வேலை|வேலை கிடை|வேலை இல்லை|நேர்காணல்|உத்தியோக/i },
  { id: 'career', re: /career|promotion|salary hike|appraisal|\bboss\b|office|\bwork\b|\bjob\b|profession|\bvela\b|\bvelai\b|\bvelaila\b|thozhil|tholil|padhavi|pathavi|தொழில|வேலை|அலுவலக|பதவி|சம்பள உயர்வு/i },
  { id: 'loan', re: /loan|debt|\bemi\b|kadan|kadana|கடன்|கடனை|கடன|அடைக்க|வட்டி/i },
  { id: 'money', re: /money|finance|financial|saving|invest|wealth|stock|share market|income|rich|\bpanam\b|\bpanum\b|\bkasu\b|kaasu|semippu|varumanam|selvam|dhanam|பணம்|பணத்|சேமிப்பு|முதலீடு|செல்வ|வருமான|பொருளாதார|தனம்/i },
  { id: 'health', re: /health|\bill(ness)?\b|\bsick|disease|fever|\bsugar\b|diabet|\bbp\b|blood pressure|surgery|operation|hospital|doctor|medicine|weight|diet|\bfood\b|udambu|udal ?nal|udal ?nala|\bnoi\b|kaichal|arokiyam|aarokkiyam|aarogyam|ஆரோக்கிய|நோய்|உடல்நல|உடல் நல|காய்ச்சல்|சர்க்கரை|மருத்துவ|அறுவை|மருந்து|உணவு/i },
  { id: 'education', re: /exam|study|studies|subjects?\b|education|college|school|degree|neet|jee|upsc|tnpsc|result|padipp?u|padikk|parikshai|kalvi|மேல் படிப்பு|கல்வி|தேர்வு|படிப்பு|கல்லூரி|பள்ளி|பரீட்சை/i },
  { id: 'travel', re: /visa|abroad|foreign|onsite|overseas|immigra|\bpr\b|green card|velinaa?du|velinattu|videsh|videsa|videsam|videsham|vegu dhooram|travel|payanam|பயணம்|வெளிநாடு|வெளிநாட்ட|விசா|அயல்நாடு|விதேச/i },
  { id: 'property', re: /\bhouse\b|\bhome\b|\bland\b|property|\bflat\b|\bplot\b|apartment|construct|\bveedu\b|\bveetu\b|sontha? ?veedu|\bnilam\b|\bmanai\b|sothu|soththu|வீடு|நிலம்|சொத்து|மனை|பிளாட்|வீடு கட்ட/i },
  { id: 'vehicle', re: /\bcar\b|bike|vehicle|scooter|\bvandi\b|vaaganam|vaganam|கார்|வாகன|பைக்|ஸ்கூட்டர்|வண்டி/i },
  { id: 'court', re: /court|\bcase\b|legal|lawyer|police|litigation|vazhakk?u|valakku|vakeel|வழக்கு|கோர்ட்|நீதிமன்ற|வக்கீல்|தகராறு/i },
  { id: 'family', re: /family|parents|father|mother|brother|sister|in-?laws?|kudumbam|kudumba|amma|appa|anna|akka|thambi|thangai|maamiyar|குடும்ப|அப்பா|அம்மா|அண்ணன்|அக்கா|தம்பி|தங்கை|பெற்றோர்|மாமியார்/i },
];

/** Returns the topic id for a question (or null when it does not match any life topic). */
export function detectTopic(text) {
  const q = String(text || '').toLowerCase();
  for (const t of TOPICS) if (t.re.test(q)) return t.id;
  return null;
}
/** Every topic a question touches, most specific first. */
export function detectTopics(text) {
  const q = String(text || '').toLowerCase();
  return TOPICS.filter((t) => t.re.test(q)).map((t) => t.id);
}

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
    name: T('Child blessing', 'குழந்தை பாக்கியம்'), houseWhy: T('5th (children), 2nd (family grows) and 11th (fulfilment); Jupiter is the karaka', '5-ம் வீடு (புத்திர ஸ்தானம்), 2-ம் வீடு (குடும்ப வளர்ச்சி), 11-ம் வீடு; காரகர் குரு'),
    dos: [T('Follow your doctor’s guidance first — prayer supports it', 'மருத்துவர் ஆலோசனையே முதன்மை — வழிபாடு துணை நிற்கும்'), T('Keep both partners’ health routines regular and stress low', 'இருவரும் உடல்நல வழக்கத்தைச் சீராக வைத்து மன அழுத்தம் குறையுங்கள்'), T('Pray on Thursdays to Guru / Dakshinamurthy', 'வியாழன்தோறும் குரு / தட்சிணாமூர்த்தி வழிபாடு')],
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
    name: T('Career & promotion', 'தொழில் வளர்ச்சி & பதவி உயர்வு'), houseWhy: T('10th (career), 11th (gains, recognition) and 2nd (income)', '10-ம் வீடு (தொழில்), 11-ம் வீடு (லாபம், அங்கீகாரம்), 2-ம் வீடு (வருமானம்)'),
    dos: [T('Take on visible responsibility; keep your word at work', 'கண்ணுக்குத் தெரியும் பொறுப்பை ஏற்றுக்கொள்ளுங்கள்; சொன்ன சொல் தவறாதீர்கள்'), T('Ask for the promotion / review in the favourable window', 'சாதகமான காலத்தில் பதவி உயர்வு / மதிப்பாய்வு கேளுங்கள்'), T('Start important meetings in the Sun or Jupiter Horai', 'முக்கிய கூட்டங்களைச் சூரிய / குரு ஓரையில் தொடங்குங்கள்')],
    donts: [T('Avoid office politics and sharp words with seniors', 'அலுவலக அரசியல், மேலதிகாரிகளிடம் கடுஞ்சொல் தவிர்க்கவும்'), T('Do not resign in a hurry in a care period', 'கவனக் காலத்தில் அவசரமாக ராஜினாமா செய்ய வேண்டாம்')],
    remedy: T('Recite Aditya Hrudayam on Sundays; light a sesame-oil lamp for Lord Shani on Saturdays.', 'ஞாயிறு ஆதித்ய ஹிருதயம்; சனிக்கிழமை சனி பகவானுக்கு நல்லெண்ணெய் தீபம்.'),
    follow: [T('Is a job change good for me now?', 'இப்போது வேலை மாற்றம் நல்லதா?'), T('Can I start my own business?', 'சொந்தத் தொழில் தொடங்கலாமா?'), T('When will my salary increase?', 'சம்பளம் எப்போது உயரும்?')] },
  job_change: { houses: [3, 5, 9, 10], negate: [6, 11], key: 10, karakas: ['Rahu', 'Saturn'],
    name: T('Job change', 'வேலை மாற்றம்'), houseWhy: T('10th (career), 3rd and 9th (movement, new paths), 5th (new role)', '10-ம் வீடு (தொழில்), 3, 9-ம் வீடுகள் (மாற்றம், புதிய வழி), 5-ம் வீடு'),
    dos: [T('Accept the new offer in writing before resigning', 'புதிய வேலை உறுதிக் கடிதம் கையில் வந்த பின்பே ராஜினாமா'), T('Sign the offer in a good Horai', 'நல்ல ஓரையில் ஒப்பந்தம் கையெழுத்திடுங்கள்'), T('Leave on good terms — references matter', 'நல்லுறவுடன் விடைபெறுங்கள் — பரிந்துரைகள் முக்கியம்')],
    donts: [T('Do not quit only out of anger', 'கோபத்தில் மட்டும் வேலையை விட வேண்டாம்'), T('Avoid joining on a Chandrashtamam day', 'சந்திராஷ்டம நாளில் புதிய வேலையில் சேர வேண்டாம்')],
    remedy: T('Pray to Vinayagar before applying; offer arugampul (bermuda grass) on Wednesdays.', 'விண்ணப்பிக்கும் முன் விநாயகர் வழிபாடு; புதன்தோறும் அருகம்புல் சாற்றுங்கள்.'),
    follow: [T('Career growth & promotion', 'தொழில் வளர்ச்சி & பதவி உயர்வு'), T('Can I go abroad for work?', 'வேலைக்கு வெளிநாடு செல்லலாமா?'), T('Can I start my own business?', 'சொந்தத் தொழில் தொடங்கலாமா?')] },
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
    remedy: T('Durga worship in Rahu Kalam on Tuesdays or Fridays; chant "Sri Rama Jaya Rama" on the way.', 'செவ்வாய் / வெள்ளி ராகு காலத்தில் துர்கை வழிபாடு; வழியில் "ஸ்ரீ ராம ஜெய ராம".'),
    follow: [T('When will I get PR / permanent visa?', 'நிரந்தர விசா (PR) எப்போது?'), T('Job abroad — is it good for me?', 'வெளிநாட்டு வேலை எனக்கு நல்லதா?'), T('Good date to travel', 'பயணத்திற்கு நல்ல நாள்')] },
  property: { houses: [4, 11, 2], negate: [3, 12], key: 4, karakas: ['Mars', 'Venus'],
    name: T('House & property', 'வீடு & சொத்து'), houseWhy: T('4th (home, land), 11th (gains), 2nd (savings); Mars is the karaka for land', '4-ம் வீடு (வீடு, நிலம்), 11-ம் வீடு (லாபம்), 2-ம் வீடு (சேமிப்பு); நிலத்திற்குக் காரகர் செவ்வாய்'),
    dos: [T('Check documents and approvals fully before paying an advance', 'முன்பணம் தரும் முன் ஆவணங்கள், அனுமதிகளை முழுமையாகச் சரிபாருங்கள்'), T('Register on a Muhurtham day in the favourable period', 'சாதகமான காலத்தில் முகூர்த்த நாளில் பதிவு செய்யுங்கள்'), T('Do Bhoomi Pooja before construction', 'கட்டுமானத்திற்கு முன் பூமி பூஜை')],
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
    remedy: T('Light a lamp at home every evening and chant "Om Namah Shivaya" together for five minutes.', 'தினமும் மாலை வீட்டில் தீபம் ஏற்றி ஐந்து நிமிடம் சேர்ந்து "ஓம் நம சிவாய".'),
    follow: [T('Family relations today', 'இன்று குடும்ப உறவு'), T('Kula Deivam worship — how?', 'குலதெய்வ வழிபாடு — எப்படி?'), T('Husband–wife harmony', 'கணவன்–மனைவி ஒற்றுமை')],
    action: { go: 'relations', label: T('Family relations today', 'இன்று குடும்ப உறவு') } },
};

// ------------------------------------------------------------------ chart reading helpers
const houseOf = (from, rasi) => ((rasi - from + 12) % 12) + 1;
const lordOf = (from, h) => RASIS[(from + h - 1) % 12].lord;
function fromMoonChart(chart) {
  return { ...chart, planets: { ...chart.planets, Lagna: { ...chart.planets.Lagna, rasi: chart.planets.Moon.rasi } } };
}

function transitSupport(chart, keyHouse, date) {
  const { planets } = planetPositions(date);
  const res = {};
  for (const g of ['Jupiter', 'Saturn']) {
    const targets = [(chart.planets.Lagna || chart.planets.Moon).rasi, chart.planets.Moon.rasi].map((ref) => (ref + keyHouse - 1) % 12);
    res[g] = ASPECTS[g].some((a) => targets.includes((planets[g].rasi + a - 1) % 12));
  }
  return res;
}

/** Dasa–Bhukti windows in the next `years` years that activate the topic, with Jupiter/Saturn transit months. */
function windowsFor(chart, q, { from = new Date(), years = REPORT_YEARS.ask } = {}) {
  const sig = significations(chart);
  // Report horizon: the next `years` years (named in the section title). No age cutoff.
  const end = new Date(from.getTime() + years * 365.25 * DAY);
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
      for (let t = s.getTime(); t < e.getTime(); t += 45 * DAY) {
        const tr = transitSupport(chart, q.key, new Date(t));
        if (tr.Jupiter) { jup++; first ||= t; last = t; }
        if (tr.Jupiter && tr.Saturn) both++;
      }
      out.push({ ...entry, score: dasaScore * 0.75 + (both ? 2 : jup ? 1 : 0) * 1.6, doubleTransit: both > 0, jupiter: jup > 0,
        peakFrom: first ? new Date(first) : s, peakTo: last ? new Date(Math.min(last + 45 * DAY, e.getTime())) : e });
    }
  }
  const best = [...out].sort((a, b) => b.score - a.score).slice(0, 3).sort((a, b) => a.start - b.start);
  return { best, current, currentScore: current ? current.dasaScore : 0 };
}

const monthYear = (d, lang) => `${(lang === 'ta' ? MONTHS_TA : MONTHS_EN)[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
const pn = (k, lang) => (lang === 'ta' ? PLANETS[k].ta : k);
const ordEn = (n) => `${n}${n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th'}`;
const fixOrd = (t) => String(t).replace(/\b(\d+)th\b/g, (_, n) => ordEn(Number(n)));
const pick = (o, lang) => (o ? (lang === 'ta' ? o.ta : o.en) : '');

/**
 * Build the answer for a life topic. Returns the same shape the chat bubble renders:
 * { intent, text, sections: [{ key, title, lines }], meter, actions, followups }.
 */
export function topicAnswer({ topic, question, chart, rel = {}, lang = 'ta', name = '', life = {}, today = null, now = new Date(), turns = [], speaker = null }) {
  const def = TOPIC[topic];
  const L = (en, ta) => (lang === 'ta' ? ta : en);
  if (!def || !chart) return null;
  const certainty = rel?.certainty || 'exact';
  // POLICY FIRST: romance / marriage / attraction toward a minor is declined, and a speaker who says they are under
  // 18 gets the child / teen answer — before any house, dasa or meter is computed (shared/age-guard.js).
  const gate = policyAnswer(facilitationCheck(question, { turns, speaker }), { lang, question, topic, name });
  if (gate) return validateOffline(gate, { lang, inputCertainty: certainty });
  // AGE FIRST: the chart owner's age decides whether this topic is read at all. A child's chart is never
  // scored, timed or given a meter for marriage, job, money, court …: it gets a warm, age-appropriate reply.
  const profile = ageProfile(life.birthDate || chart, { now, tz: chart.tz });
  if (!topicAllowed(topic, profile)) return validateOffline(ageGuardAnswer({ topic, profile, lang, name, question }), { lang, inputCertainty: certainty });
  const useLagna = rel.lagna !== false;
  const c = useLagna ? chart : fromMoonChart(chart);
  const q = { houses: def.houses, negate: def.negate, key: def.key, karakas: def.karakas };
  const bh = bhavaAnalysis(c);
  const strength = Object.fromEntries(grahaStrength(c.planets).map((g) => [g.planet, g]));
  const promise = Math.round(def.houses.reduce((s, h) => s + bh[h - 1].score, 0) / def.houses.length * 0.6
    + def.karakas.reduce((s, k) => s + (strength[k]?.score ?? 50), 0) / def.karakas.length * 0.4);
  const { best, current, currentScore } = rel.nakshatra === false ? { best: [], current: null, currentScore: 0 } : windowsFor(c, q, { from: now });
  let tr = null;
  try { tr = transitStatus(chart, now); } catch { /* ephemeris unavailable */ }
  const guru = tr?.status?.some((s) => s.id === 'guru_balam');
  const activeNow = currentScore > 1;
  const nextWin = best.find((w) => w.end > now) || null;
  const nowWin = best.find((w) => w.start <= now && w.end > now) || (activeNow ? current : null);
  const pct = Math.max(45, Math.min(92, Math.round(promise * 0.7 + (activeNow ? 14 : 4) + (guru ? 6 : 0) + (best.length ? 4 : 0))));
  const level = pct >= 72 ? 'high' : pct >= 58 ? 'mid' : 'low';
  const who = name ? L(`${name}, `, `${name}, `) : '';

  // Headline — always a clear, encouraging answer to the question that was asked.
  let head;
  const winText = (w) => `${monthYear(w.peakFrom || w.start, lang)} – ${monthYear(w.peakTo || w.end, lang)}`;
  if (def.health) {
    // Health is never read from the chart: general wellbeing first (needs medical review), then an optional practice.
    head = L(`${who}your horoscope does not decide your health, and it is the same in every period: regular sleep, water, a daily walk and age-suited check-ups — and see a doctor for any symptom.`, `${who}உங்கள் ஆரோக்கியத்தை ஜாதகம் தீர்மானிப்பதில்லை; எல்லாக் காலத்திலும் ஒன்றே: சீரான உறக்கம், தண்ணீர், தினசரி நடை, வயதுக்கேற்ற பரிசோதனைகள் — எந்த அறிகுறிக்கும் மருத்துவரைப் பாருங்கள்.`);
  } else if (nowWin) {
    head = L(`${who}yes — the current period supports ${pick(def.name, 'en').toLowerCase()}. ${nowWin.end ? `Best window: ${winText(nowWin)}.` : ''}`,
      `${who}ஆம் — நடப்பு காலம் ${pick(def.name, 'ta')} விஷயத்திற்குச் சாதகம். ${nowWin.end ? `சிறந்த காலம்: ${winText(nowWin)}.` : ''}`);
  } else if (nextWin) {
    head = L(`${who}yes, it is promised in your chart — the strongest window is ${winText(nextWin)} (${nextWin.md} Dasa, ${nextWin.ad} Bhukti). Prepare from now.`,
      `${who}ஆம், உங்கள் ஜாதகத்தில் இதற்கு வாய்ப்பு உண்டு — மிகச் சாதகமான காலம் ${winText(nextWin)} (${pn(nextWin.md, 'ta')} தசை, ${pn(nextWin.ad, 'ta')} புக்தி). இப்போதிருந்தே தயாராகுங்கள்.`);
  } else {
    head = L(`${who}steady effort brings this — your chart supports it step by step, and the parigaram below strengthens it.`, `${who}தொடர் முயற்சியால் இது கைகூடும் — உங்கள் ஜாதகம் படிப்படியாக ஆதரிக்கிறது; கீழே உள்ள பரிகாரம் பலம் சேர்க்கும்.`);
  }
  if (topic === 'second_marriage' && life.maritalStatus === 'married') {
    head += L(' If you are still married, first complete the legal separation with dignity; then the new beginning will be peaceful.', ' தற்போது திருமண பந்தத்தில் இருந்தால், முதலில் சட்டப்படியான பிரிவைக் கண்ணியமாக முடியுங்கள்; அதன் பின் புதிய தொடக்கம் அமைதியாக அமையும்.');
  }

  // Your chart for this question — houses, lords, Dasa–Bhukti and Gochara.
  const chartLines = [L(`Houses read: ${def.houseWhy.en}${useLagna ? '' : ' — counted from your Moon sign (Chandra Lagna)'}.`, `பார்க்கும் பாவங்கள்: ${def.houseWhy.ta}${useLagna ? '' : ' — சந்திர லக்னப்படி'}.`)];
  for (const h of def.houses.slice(0, 3)) {
    const b = bh[h - 1];
    const lv = b.score >= 62 ? L('strong', 'பலம்') : b.score >= 48 ? L('steady', 'நிலையானது') : L('grows with effort', 'முயற்சியால் வளரும்');
    chartLines.push(L(`${ordEn(h)} house: lord ${b.lord} in house ${b.lordHouse}${b.occupants.length ? `, with ${b.occupants.join(', ')}` : ''} — ${lv}.`,
      `${h}-ம் வீடு: அதிபதி ${pn(b.lord, 'ta')} ${b.lordHouse}-ம் வீட்டில்${b.occupants.length ? `, உடன் ${b.occupants.map((o) => pn(o, 'ta')).join(', ')}` : ''} — ${lv}.`));
  }
  const k0 = def.karakas[0];
  if (strength[k0]) chartLines.push(L(`Karaka ${k0}: ${strength[k0].level === 'strong' ? 'strong' : strength[k0].level === 'weak' ? 'needs support (see parigaram)' : 'average'}.`, `காரகர் ${pn(k0, 'ta')}: ${strength[k0].level === 'strong' ? 'பலம்' : strength[k0].level === 'weak' ? 'ஆதரவு தேவை (பரிகாரம் பார்க்க)' : 'மத்திமம்'}.`));
  if (current) chartLines.push(L(`Running: ${current.md} Dasa, ${current.ad} Bhukti (till ${monthYear(current.end, 'en')}) — ${activeNow ? 'connected to this topic' : 'preparing the ground for it'}.`,
    `நடப்பு: ${pn(current.md, 'ta')} தசை, ${pn(current.ad, 'ta')} புக்தி (${monthYear(current.end, 'ta')} வரை) — ${activeNow ? 'இந்த விஷயத்துடன் தொடர்புடையது' : 'இதற்கான அடித்தளம் அமைக்கும் காலம்'}.`));
  if (tr) {
    for (const s of tr.status.slice(0, 2)) chartLines.push(L(`Gochara: ${fixOrd(s.en)}.`, `கோசாரம்: ${s.ta}.`));
  }

  // Favourable periods
  const periodLines = best.length
    ? best.map((w) => L(`${monthYear(w.peakFrom, 'en')} – ${monthYear(w.peakTo, 'en')}: ${w.md} Dasa / ${w.ad} Bhukti${w.doubleTransit ? ' · Jupiter & Saturn both support (double transit)' : w.jupiter ? ' · Jupiter’s transit supports' : ''}`,
      `${monthYear(w.peakFrom, 'ta')} – ${monthYear(w.peakTo, 'ta')}: ${pn(w.md, 'ta')} தசை / ${pn(w.ad, 'ta')} புக்தி${w.doubleTransit ? ' · குரு, சனி இருவரும் ஆதரவு (இரட்டைக் கோசாரம்)' : w.jupiter ? ' · குரு கோசாரம் ஆதரவு' : ''}`))
    : [L('Every Thursday and Friday morning in the Jupiter / Venus Horai is good for steps on this.', 'ஒவ்வொரு வியாழன், வெள்ளி காலை குரு / சுக்கிர ஓரையில் இதற்கான முயற்சிகள் நல்லது.')];

  if (nowWin && !best.includes(nowWin)) periodLines.unshift(L(`Now – ${monthYear(nowWin.end, 'en')}: ${nowWin.md} Dasa / ${nowWin.ad} Bhukti (running)`, `இப்போது – ${monthYear(nowWin.end, 'ta')}: ${pn(nowWin.md, 'ta')} தசை / ${pn(nowWin.ad, 'ta')} புக்தி (நடப்பு)`));
  // Free parigaram first: the topic's remedy, then the karaka / Dasa lord that needs support.
  const rem = [pick(def.remedy, lang)];
  const weakK = def.karakas.find((k) => strength[k]?.level === 'weak');
  if (weakK) rem.push(L(`For ${weakK}: ${NAVAGRAHA[weakK].free.en}`, `${pn(weakK, 'ta')}: ${NAVAGRAHA[weakK].free.ta}`));
  else if (current && NAVAGRAHA[current.md]) rem.push(L(`For your ${current.md} Dasa: ${NAVAGRAHA[current.md].free.en}`, `${pn(current.md, 'ta')} தசைக்கு: ${NAVAGRAHA[current.md].free.ta}`));

  const dos = def.dos.map((x) => pick(x, lang));
  const donts = def.donts.map((x) => pick(x, lang));
  let hg = null;
  if (def.health) { try { hg = healthGuide(chart, { gender: life.gender }); } catch { /* optional */ } }
  if (today?.rahuKalam && !def.health) donts.push(L(`Today’s Rahu Kalam: ${today.rahuKalam}`, `இன்றைய ராகு காலம்: ${today.rahuKalam}`));
  if (def.health) {
    // Two separated parts: general wellbeing (not astrology) and an optional traditional reflection (not health advice).
    const review = L('needs medical review', 'மருத்துவ மதிப்பாய்வு தேவை');
    const well = hg ? hg.wellbeing.habits.map((x) => `${pick(x, lang)} (${review})`) : dos;
    const pr = hg?.reflection.practices[0];
    const reflect = [pr ? `${pick(pr.why, lang)}: ${pick(pr.lamp, lang)}` : pick(def.remedy, lang), L('Spiritual practice only — not health advice.', 'ஆன்மீகப் பழக்கம் மட்டுமே — உடல்நல ஆலோசனை அல்ல.')];
    const sectionsH = [
      { key: 'answer', title: L('Answer', 'பதில்'), lines: [head] },
      { key: 'dos', title: L('General wellbeing', 'பொது நலம்'), lines: well },
      { key: 'donts', title: L('Please', 'கவனிக்க'), lines: donts },
      { key: 'remedy', title: L('Traditional reflection (optional)', 'மரபுச் சிந்தனை (விருப்பம்)'), lines: reflect },
      { key: 'uncertainty', title: L('Limits', 'வரம்பு'), lines: [pick(LIMITS_LINE, lang)] },
    ];
    const actionsH = [{ go: def.action.go, label: pick(def.action.label, lang) }];
    const textH = sectionsH.map((s) => `${s.title}:\n${s.lines.map((l) => `• ${l}`).join('\n')}`).join('\n\n');
    const outH = { intent: topic, topic, question, text: textH, sections: sectionsH, meter: null, actions: actionsH, followups: def.follow.map((f) => pick(f, lang)), deadlineFirst: false };
    return validateOffline(guardAnswer(outH, profile, lang), { lang, inputCertainty: certainty });
  }

  const sections = [
    { key: 'answer', title: L('Answer', 'பதில்'), lines: def.practicalFirst ? [pick(def.practicalFirst, lang), head] : [head] },
    { key: 'periods', title: `${L('Favourable periods', 'சாதகமான காலங்கள்')} · ${pick(horizonLabel(REPORT_YEARS.ask), lang)}`, lines: periodLines },
    { key: 'dos', title: L('Do', 'செய்யலாம்'), lines: dos },
    { key: 'donts', title: L('Avoid', 'தவிர்க்கவும்'), lines: donts },
    { key: 'remedy', title: L('Free parigaram', 'இலவச பரிகாரம்'), lines: rem },
    { key: 'chart', title: L('Your chart for this question', 'இந்தக் கேள்விக்கான உங்கள் ஜாதகம்'), lines: chartLines },
    { key: 'uncertainty', title: L('Limits', 'வரம்பு'), lines: [pick(LIMITS_LINE, lang)] },
  ];
  const meter = { topic: pick(def.name, lang), pct, level, label: level === 'high' ? L('Very favourable', 'மிகச் சாதகம்') : level === 'mid' ? L('Favourable with effort', 'முயற்சியுடன் சாதகம்') : L('Builds step by step', 'படிப்படியாக வளரும்') };
  const actions = def.action ? [{ go: def.action.go, label: pick(def.action.label, lang) }] : [];
  if (['second_marriage', 'marriage', 'business', 'property', 'vehicle', 'court'].includes(topic) && !actions.some((a) => a.go === 'muhurtham')) actions.push({ go: 'muhurtham', label: L('Good dates', 'நல்ல நாள்') });
  actions.push({ go: 'parigaram', label: L('Parigaram & temple', 'பரிகாரம் & கோவில்') });
  const text = sections.map((s) => `${s.title}:\n${s.lines.map((l) => `• ${l}`).join('\n')}`).join('\n\n');
  const out = { intent: topic, topic, question, text, sections, meter, actions, followups: def.follow.map((f) => pick(f, lang)), deadlineFirst: Boolean(def.practicalFirst) };
  return validateOffline(guardAnswer(out, profile, lang), { lang, inputCertainty: certainty });
}

/** Follow-up suggestions when a question is unclear: the three most-asked life topics (adults only). */
export const GENERAL_FOLLOWUPS = [
  T('When will I get married?', 'எனக்கு எப்போது திருமணம் நடக்கும்?'),
  T('How is my career this year?', 'இந்த ஆண்டு என் தொழில் எப்படி?'),
  T('When will my money situation improve?', 'என் பண நிலை எப்போது மேம்படும்?'),
];
/** Follow-ups for an unclear question, chosen by the chart owner's age band (children never see marriage / job / money). */
export const generalFollowups = (profile) => suggestionsFor(profile, GENERAL_FOLLOWUPS).slice(0, 3);
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
  const lang = ans.lang === 'en' || (!ans.lang && !/[\u0B80-\u0BFF]/.test(ans.text || '')) ? 'en' : 'ta';
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
