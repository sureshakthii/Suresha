// Thunai Life Guide (வாழ்க்கை வழிகாட்டி) — "who am I" from the janana jathagam, and a short tap check that turns one
// life concern into WHY · WHEN · WHAT · WHERE: the traditional chart reason, the dated supportive periods from the
// engine (shared/predict.js), practical life (வாழ்வியல்) and mind steps, and a parigaram (shared/remedies.js).
//
// Thunai's own rules, written for Thunai — no text or tables taken from other astrology software.
// Principles (docs/DETERMINISTIC-PREDICTION-STANDARD.md, AI-SAFETY-POLICY.md):
//   • The chart shows tendencies and timing; a person's own actions shape the result — "தீதும் நன்றும் பிறர்தர வாரா"
//     (Purananuru 192). No fear, no certainty, no fate verdicts.
//   • Practical steps come first for money and health; those topics get no timing reading.
//   • "Losing hope" in the check always shows free help lines first, and never a chart reason.
//   • A child or teen only gets study, confidence and family concerns, in child-safe words.
// Pure — no DOM. The app and the tests share it.
import { RASIS, PLANETS } from './astro.js';
import { grahaStrength, remedyFor } from './remedies.js';
import { predictEvent } from './predict.js';
import { runningDasa } from './daily.js';
import { WEEKDAYS_EN, WEEKDAYS_TA } from './fmt.js';

const T = (en, ta) => ({ en, ta });
export const LIFE_GUIDE_VERSION = 'life-guide-1.0.0';

// ---------------------------------------------------------------- the 12 signs (as Lagna: how you come across; as Moon: your mind)
const SIGN = [
  { el: 'fire', traits: T('bold, quick and a natural starter', 'துணிச்சல், வேகம், எதையும் முதலில் தொடங்கும் இயல்பு'), gift: T('the courage to begin', 'தொடங்கும் தைரியம்'), watch: T('impatience and sudden anger', 'பொறுமையின்மை, திடீர்க் கோபம்') },
  { el: 'earth', traits: T('steady, loyal, and fond of comfort and beauty', 'நிதானம், விசுவாசம், அழகும் வசதியும் விரும்பும் இயல்பு'), gift: T('patience and reliability', 'பொறுமை, நம்பகத்தன்மை'), watch: T('stubbornness and resisting change', 'பிடிவாதம், மாற்றத்தை எதிர்த்தல்') },
  { el: 'air', traits: T('curious, a good talker and a quick learner', 'ஆர்வம், பேச்சுத்திறன், விரைவாகக் கற்கும் இயல்பு'), gift: T('communication and fresh ideas', 'தொடர்புத் திறன், புதிய யோசனைகள்'), watch: T('scattered focus and overthinking', 'கவனச் சிதறல், அதிகம் யோசித்தல்') },
  { el: 'water', traits: T('caring, emotional and family-first', 'அன்பு, உணர்ச்சி, குடும்பமே முதன்மை என்ற இயல்பு'), gift: T('nurturing others and a strong memory', 'பிறரைப் பராமரித்தல், நினைவாற்றல்'), watch: T('mood swings and taking things personally', 'மனநிலை மாற்றம், எல்லாவற்றையும் தனிப்பட்டதாக எடுத்தல்') },
  { el: 'fire', traits: T('proud, generous and a born leader', 'பெருமிதம், தாராள மனம், தலைமைப் பண்பு'), gift: T('confidence and warmth', 'தன்னம்பிக்கை, அரவணைப்பு'), watch: T('ego and waiting for praise', 'அகந்தை, பாராட்டை எதிர்பார்த்தல்') },
  { el: 'earth', traits: T('careful, analytical and helpful', 'கவனம், ஆய்வுத்திறன், உதவும் மனம்'), gift: T('precision and service', 'நுணுக்கம், சேவை மனப்பான்மை'), watch: T('worry, perfectionism and finding fault', 'கவலை, எல்லாம் சரியாக இருக்க வேண்டும் என்ற பிடிப்பு, குறை காணல்') },
  { el: 'air', traits: T('fair, diplomatic and pleasant to be with', 'நியாயம், இனிமையான பேச்சு, சமநிலை'), gift: T('balance and partnership', 'சமரசம், கூட்டுறவு'), watch: T('indecision and trying to please everyone', 'முடிவெடுக்கத் தயக்கம், எல்லோரையும் திருப்திப்படுத்த முயலுதல்') },
  { el: 'water', traits: T('deep, intense and determined', 'ஆழமான சிந்தனை, தீவிரம், மன உறுதி'), gift: T('focus and the power to bounce back', 'ஒருமுகக் கவனம், மீண்டெழும் சக்தி'), watch: T('suspicion and holding on to hurt', 'சந்தேகம், மனக்காயத்தை மனதில் வைத்துக்கொள்ளுதல்') },
  { el: 'fire', traits: T('optimistic, principled and freedom-loving', 'நம்பிக்கை, நேர்மை, சுதந்திர விருப்பம்'), gift: T('faith and the gift of teaching', 'தர்ம சிந்தனை, கற்பிக்கும் திறன்'), watch: T('blunt words and promising too much', 'வெளிப்படையான கடும் பேச்சு, அதிக வாக்குறுதி') },
  { el: 'earth', traits: T('disciplined, practical and ambitious', 'ஒழுக்கம், நடைமுறை அறிவு, லட்சியம்'), gift: T('hard work and responsibility', 'கடின உழைப்பு, பொறுப்புணர்வு'), watch: T('pessimism and work without rest', 'அவநம்பிக்கை, ஓய்வில்லாத உழைப்பு') },
  { el: 'air', traits: T('independent, humane and original', 'சுதந்திர சிந்தனை, மனிதநேயம், புதுமை'), gift: T('new ideas and service to society', 'புதிய யோசனைகள், சமூக சேவை'), watch: T('distance from feelings and rigid opinions', 'உணர்வுகளில் விலகல், பிடிவாதக் கருத்து') },
  { el: 'water', traits: T('compassionate, spiritual and imaginative', 'கருணை, ஆன்மீக நாட்டம், கற்பனை வளம்'), gift: T('kindness and intuition', 'இரக்கம், உள்ளுணர்வு'), watch: T('avoiding problems and finding it hard to say no', 'பிரச்சினையைத் தவிர்த்தல், "இல்லை" சொல்லத் தயக்கம்') },
];

// How to present yourself to society, by the element of the Lagna (or the Moon sign when the birth time is not exact).
const PRESENT = {
  fire: T('Lead with your energy, but pause one breath before you react. Make small promises and keep every one — let results speak for you.', 'உற்சாகத்துடன் முன்னிருங்கள்; ஆனால் பதில் சொல்லும் முன் ஒரு மூச்சு நிதானியுங்கள். சிறிய வாக்குறுதி கொடுத்து ஒவ்வொன்றையும் காப்பாற்றுங்கள் — உங்கள் செயலே உங்களுக்காகப் பேசட்டும்.'),
  earth: T('People trust your reliability. Show your work, speak a little more about your ideas, and stay open to new ways of doing things.', 'உங்கள் நம்பகத்தன்மையை மக்கள் மதிக்கிறார்கள். உங்கள் உழைப்பை வெளிப்படுத்துங்கள், உங்கள் யோசனைகளைச் சற்று அதிகமாகப் பேசுங்கள், புதிய வழிகளுக்கும் மனதைத் திறந்து வையுங்கள்.'),
  air: T('Your words are your strength. Finish what you start, listen as much as you speak, and write your plans down so others can rely on them.', 'உங்கள் பேச்சே உங்கள் பலம். தொடங்கியதை முடியுங்கள், பேசுவதைப் போலவே கேளுங்கள், திட்டங்களை எழுதி வையுங்கள் — பிறர் உங்களை நம்பி இருக்கலாம்.'),
  water: T('Your warmth draws people to you. Keep gentle boundaries, do not take every word personally, and share your feelings calmly.', 'உங்கள் அன்பு மக்களை ஈர்க்கிறது. மென்மையான எல்லைகள் வையுங்கள், ஒவ்வொரு வார்த்தையையும் தனிப்பட்டதாக எடுக்காதீர்கள், உணர்வுகளை அமைதியாகப் பகிருங்கள்.'),
};

// How stress shows and what calms the mind, by the element of the Moon sign.
const STRESS = {
  fire: { shows: T('Stress shows as anger and restlessness.', 'மன அழுத்தம் கோபமாகவும் பரபரப்பாகவும் வெளிப்படும்.'), calm: T('A brisk walk or exercise, and sunrise prayer, settle you fastest.', 'வேகமான நடை அல்லது உடற்பயிற்சி, சூரிய உதய வழிபாடு உங்களை விரைவில் அமைதிப்படுத்தும்.') },
  earth: { shows: T('Stress shows as worry about security and money.', 'மன அழுத்தம் பாதுகாப்பு, பணம் பற்றிய கவலையாக வெளிப்படும்.'), calm: T('A fixed routine, simple food, good sleep and finishing one small task calm you.', 'நிலையான தினசரி ஒழுங்கு, எளிய உணவு, நல்ல உறக்கம், ஒரு சிறிய வேலையை முடித்தல் உங்களை அமைதிப்படுத்தும்.') },
  air: { shows: T('Stress shows as overthinking and poor sleep.', 'மன அழுத்தம் அதிகம் யோசித்தலாகவும் உறக்கக் குறைவாகவும் வெளிப்படும்.'), calm: T('Writing your thoughts down, slow breathing and talking to one trusted person calm you.', 'எண்ணங்களை எழுதுதல், மெதுவான மூச்சுப் பயிற்சி, நம்பிக்கையான ஒருவரிடம் பேசுதல் உங்களை அமைதிப்படுத்தும்.') },
  water: { shows: T('Stress shows as hurt feelings and pulling away from people.', 'மன அழுத்தம் மனக்காயமாகவும் மற்றவர்களிடமிருந்து ஒதுங்குதலாகவும் வெளிப்படும்.'), calm: T('Music, prayer, time with family and a walk near water calm you.', 'இசை, வழிபாடு, குடும்பத்துடன் நேரம், நீர்நிலை அருகே நடை உங்களை அமைதிப்படுத்தும்.') },
};

// Each planet: what it gives when strong, the pattern when weak, and one practical life step.
const PLANET_MIND = {
  Sun: { strong: T('confidence, leadership and respect from seniors', 'தன்னம்பிக்கை, தலைமைப் பண்பு, மேலதிகாரிகளின் மதிப்பு'), weak: T('self-doubt and hesitation in front of seniors or authority', 'தன்னம்பிக்கைக் குறைவு, மேலதிகாரிகள் முன் தயக்கம்'), step: T('Each night, write one thing you did well today; speak first in one meeting every week.', 'ஒவ்வொரு இரவும் இன்று நன்றாகச் செய்த ஒன்றை எழுதுங்கள்; வாரம் ஒரு கூட்டத்தில் முதலில் பேசுங்கள்.') },
  Moon: { strong: T('emotional balance, care for others and goodwill from people', 'உணர்ச்சிச் சமநிலை, பிறர் மீது அக்கறை, மக்களின் நல்லெண்ணம்'), weak: T('mood swings and overthinking at night', 'மனநிலை மாற்றம், இரவில் அதிகம் யோசித்தல்'), step: T('Keep a fixed sleep time, put the phone away 15 minutes before bed, and talk to your mother or an elder every week.', 'உறங்கும் நேரத்தை நிலையாக வையுங்கள்; படுக்கும் 15 நிமிடம் முன் கைபேசியை ஒதுக்குங்கள்; வாரம் ஒருமுறை தாய் அல்லது பெரியவரிடம் மனம் விட்டுப் பேசுங்கள்.') },
  Mars: { strong: T('courage, energy and the drive to act', 'தைரியம், சக்தி, செயல்படும் உந்துதல்'), weak: T('hesitation to act, or anger that comes suddenly', 'செயல்படத் தயக்கம், அல்லது திடீரென வரும் கோபம்'), step: T('Exercise 30 minutes a day; when angry, wait ten breaths before you reply.', 'தினமும் 30 நிமிடம் உடற்பயிற்சி; கோபம் வரும்போது பதில் சொல்லும் முன் பத்து மூச்சு காத்திருங்கள்.') },
  Mercury: { strong: T('sharp thinking, good speech and business sense', 'கூர்மையான சிந்தனை, நல்ல பேச்சு, வணிக அறிவு'), weak: T('confusion and difficulty putting thoughts into words', 'குழப்பம், எண்ணங்களை வார்த்தைகளாக்கச் சிரமம்'), step: T('Read ten pages a day; before an important talk, write your three main points.', 'தினமும் பத்துப் பக்கம் வாசியுங்கள்; முக்கியமான பேச்சுக்கு முன் மூன்று முக்கியக் கருத்துகளை எழுதுங்கள்.') },
  Jupiter: { strong: T('wisdom, good judgement and faith', 'ஞானம், நல்ல முடிவெடுக்கும் திறன், நம்பிக்கை'), weak: T('feeling without direction or good guidance', 'சரியான திசையும் வழிகாட்டலும் இல்லாத உணர்வு'), step: T('Find one mentor or elder to consult; learn one new skill this month.', 'ஆலோசிக்க ஒரு வழிகாட்டி அல்லது பெரியவரைத் தேர்ந்தெடுங்கள்; இந்த மாதம் ஒரு புதிய திறனைக் கற்றுக்கொள்ளுங்கள்.') },
  Venus: { strong: T('harmony in relationships, a sense of beauty and comforts', 'உறவுகளில் இணக்கம், கலை உணர்வு, வசதிகள்'), weak: T('strain in close relationships, or spending too much on comforts', 'நெருங்கிய உறவுகளில் இறுக்கம், அல்லது வசதிக்காக அதிகச் செலவு'), step: T('Say one word of appreciation to someone close every day; keep a small monthly budget for pleasures.', 'நெருக்கமான ஒருவரைத் தினமும் ஒரு வார்த்தையில் பாராட்டுங்கள்; மகிழ்ச்சிச் செலவுக்கு மாத வரம்பு வையுங்கள்.') },
  Saturn: { strong: T('discipline, patience and success that lasts', 'ஒழுக்கம், பொறுமை, நிலைத்து நிற்கும் வெற்றி'), weak: T('delays that feel heavy, low motivation and fear of the future', 'கனமாகத் தோன்றும் தாமதங்கள், உற்சாகக் குறைவு, எதிர்கால அச்சம்'), step: T('Keep one small daily routine at the same time; help an elder or a worker each week — results build step by step.', 'தினமும் ஒரே நேரத்தில் ஒரு சிறிய ஒழுங்கைக் கடைப்பிடியுங்கள்; வாரம் ஒருமுறை ஒரு பெரியவருக்கு அல்லது தொழிலாளருக்கு உதவுங்கள் — பலன் படிப்படியாக வளரும்.') },
  Rahu: { strong: T('ambition and success with new things, technology or abroad', 'லட்சியம், புதிய துறை, தொழில்நுட்பம் அல்லது வெளிநாட்டில் முன்னேற்றம்'), weak: T('confusion, sudden choices and habits that are hard to stop', 'குழப்பம், திடீர் முடிவுகள், விட முடியாத பழக்கங்கள்'), step: T('Avoid shortcuts; check facts before any big decision; keep a daily limit on screen time.', 'குறுக்குவழிகளைத் தவிருங்கள்; பெரிய முடிவுக்கு முன் உண்மைகளைச் சரிபாருங்கள்; திரை நேரத்திற்குத் தினசரி வரம்பு வையுங்கள்.') },
  Ketu: { strong: T('spiritual insight, research and inner calm', 'ஆன்மீக உள்ளுணர்வு, ஆய்வு மனம், உள் அமைதி'), weak: T('feeling lost or losing interest in things', 'வழி தெரியாத உணர்வு, எதிலும் ஆர்வம் குறைதல்'), step: T('Sit quietly for ten minutes a day; keep one meaningful goal at a time.', 'தினமும் பத்து நிமிடம் அமைதியாக அமருங்கள்; ஒரு நேரத்தில் ஒரு அர்த்தமுள்ள இலக்கை மட்டும் வையுங்கள்.') },
};

// The running Mahadasa as a chapter of life.
const DASA_THEME = {
  Sun: T('a chapter of self-respect, recognition and responsibility — build your reputation', 'சுயமரியாதை, அங்கீகாரம், பொறுப்பின் பருவம் — உங்கள் நற்பெயரைக் கட்டியெழுப்புங்கள்'),
  Moon: T('a chapter of the mind, home and mother — care for your emotions and your people', 'மனம், வீடு, தாயின் பருவம் — உங்கள் உணர்வுகளையும் உங்கள் மக்களையும் பேணுங்கள்'),
  Mars: T('a chapter of energy, courage, land and siblings — act, but with discipline', 'சக்தி, தைரியம், நிலம், உடன்பிறப்பின் பருவம் — செயல்படுங்கள், ஒழுக்கத்துடன்'),
  Mercury: T('a chapter of learning, trade and communication — grow your skills', 'கல்வி, வணிகம், தொடர்பின் பருவம் — உங்கள் திறன்களை வளர்த்துக்கொள்ளுங்கள்'),
  Jupiter: T('a chapter of growth, wisdom and guidance — expand, and stay ethical', 'வளர்ச்சி, ஞானம், வழிகாட்டலின் பருவம் — விரிவடையுங்கள், நேர்மையுடன்'),
  Venus: T('a chapter of relationships, comforts and the arts — balance enjoyment with saving', 'உறவுகள், வசதிகள், கலையின் பருவம் — மகிழ்ச்சியையும் சேமிப்பையும் சமநிலைப்படுத்துங்கள்'),
  Saturn: T('a chapter of hard work, patience and responsibility — build slowly and steadily', 'உழைப்பு, பொறுமை, பொறுப்பின் பருவம் — மெதுவாக, நிலையாகக் கட்டியெழுப்புங்கள்'),
  Rahu: T('a chapter of ambition and big changes — new fields, technology or abroad; check facts before big moves', 'லட்சியமும் பெரிய மாற்றங்களும் கொண்ட பருவம் — புதிய துறை, தொழில்நுட்பம், வெளிநாடு; பெரிய முடிவுக்கு முன் உண்மைகளைச் சரிபாருங்கள்'),
  Ketu: T('a chapter of the inner life and letting go — simplify, and look within', 'உள்ளுணர்வும் விட்டுக்கொடுத்தலும் கொண்ட பருவம் — எளிமைப்படுத்துங்கள், உள்நோக்கிப் பாருங்கள்'),
};

/** The traditional line the guide closes with, and what it means for the person. */
export const KARMA = Object.freeze({
  line: T('“Theethum nandrum pirar thara vaaraa” — good and bad do not come from others. (Purananuru 192, Kaniyan Poongundranar)', '“தீதும் நன்றும் பிறர்தர வாரா” — (புறநானூறு 192, கணியன் பூங்குன்றனார்)'),
  meaning: T('The chart shows tendencies and timing; your own actions shape what comes. Not everything can be avoided, but with awareness, effort and prayer you can handle it well.', 'நன்மையும் தீமையும் பிறரால் வருவதில்லை. ஜாதகம் போக்கையும் காலத்தையும் காட்டுகிறது; வருவதை உங்கள் செயலே வடிவமைக்கிறது. எல்லாவற்றையும் தவிர்க்க முடியாது — ஆனால் விழிப்புணர்வு, முயற்சி, வழிபாட்டால் நன்றாகக் கையாள முடியும்.'),
});

// ---------------------------------------------------------------- the tap check
/** The questions of the tap check, in order. `adultOnly` options are hidden for a child or teen. */
export const CHECK = Object.freeze([
  { id: 'concern', q: T('What is on your mind most right now?', 'இப்போது உங்கள் மனதில் அதிகம் இருப்பது எது?'), options: [
    { id: 'job_change', label: T('Job / career change', 'வேலை / தொழில் மாற்றம்'), adultOnly: true },
    { id: 'business', label: T('Business', 'வியாபாரம்'), adultOnly: true },
    { id: 'money', label: T('Money and debts', 'பணம், கடன்'), adultOnly: true },
    { id: 'marriage', label: T('Marriage', 'திருமணம்'), adultOnly: true },
    { id: 'family', label: T('Peace at home', 'வீட்டில் அமைதி') },
    { id: 'studies', label: T('Studies / exams', 'படிப்பு / தேர்வு') },
    { id: 'abroad', label: T('Going abroad', 'வெளிநாடு செல்லுதல்'), adultOnly: true },
    { id: 'health', label: T('Health worry', 'உடல்நலக் கவலை') },
    { id: 'confidence', label: T('Confidence / fear', 'தன்னம்பிக்கை / பயம்') },
    { id: 'decision', label: T('A big decision', 'ஒரு பெரிய முடிவு') },
  ] },
  { id: 'since', q: T('Since when?', 'எவ்வளவு காலமாக?'), options: [
    { id: 'new', label: T('Just started', 'இப்போதுதான்') }, { id: 'months', label: T('A few months', 'சில மாதங்களாக') }, { id: 'long', label: T('More than a year', 'ஓராண்டுக்கு மேல்') },
  ] },
  { id: 'feel', q: T('How do you feel on most days?', 'பெரும்பாலான நாட்களில் எப்படி உணர்கிறீர்கள்?'), options: [
    { id: 'unsure', label: T('Calm, but unsure', 'அமைதி, ஆனால் தெளிவில்லை') }, { id: 'worried', label: T('Worried, thinking too much', 'கவலை, அதிகம் யோசிக்கிறேன்') },
    { id: 'restless', label: T('Restless or angry', 'பரபரப்பு அல்லது கோபம்') }, { id: 'low', label: T('Tired and low', 'சோர்வு, மனத்தளர்ச்சி') },
  ] },
  { id: 'sleep', q: T('How are your sleep and peace of mind?', 'உங்கள் உறக்கமும் மன அமைதியும் எப்படி?'), options: [
    { id: 'fine', label: T('Mostly fine', 'பெரும்பாலும் நன்று') }, { id: 'some', label: T('Disturbed sometimes', 'சில நேரம் பாதிப்பு') },
    { id: 'hopeless', label: T('Very disturbed, losing hope', 'மிகவும் பாதிப்பு, நம்பிக்கை இழக்கிறேன்') },
  ] },
  { id: 'want', q: T('What would help you most?', 'உங்களுக்கு எது அதிகம் உதவும்?'), options: [
    { id: 'timing', label: T('Knowing the right time', 'சரியான காலம் தெரிவது') }, { id: 'courage', label: T('Courage to act', 'செயல்படும் தைரியம்') },
    { id: 'peace', label: T('Peace of mind', 'மன அமைதி') }, { id: 'plan', label: T('A step-by-step plan', 'படிப்படியான திட்டம்') },
  ] },
]);

/** Check options for this person: a child or teen never sees adult concerns; a married person is not offered "Marriage". */
export function checkFor(profile = null, { married = false } = {}) {
  const minor = Boolean(profile?.minor);
  return CHECK.map((q) => ({ ...q, options: q.options.filter((o) => !(minor && o.adultOnly) && !(married && o.id === 'marriage')) }));
}

// Each concern: the engine question (dated periods), its karaka, the house it is read from, and practical steps.
const CONCERN = {
  job_change: { predict: 'job_change', karakas: ['Saturn', 'Sun'], house: 10, area: T('work and career', 'வேலை, தொழில்'), steps: [
    T('Do not resign before you have a written offer in hand.', 'எழுத்துப்பூர்வ வேலை வாய்ப்பு கையில் வரும் முன் ராஜினாமா செய்யாதீர்கள்.'),
    T('Update your CV with five achievements, each with a number (sales, savings, projects).', 'ஐந்து சாதனைகளை எண்களுடன் (விற்பனை, சேமிப்பு, திட்டங்கள்) உங்கள் விவரக் குறிப்பில் சேருங்கள்.'),
    T('This week, talk to three people already working in the field you want.', 'இந்த வாரம், நீங்கள் விரும்பும் துறையில் ஏற்கனவே வேலை செய்யும் மூவரிடம் பேசுங்கள்.'),
    T('Keep three to six months of expenses saved before the move.', 'மாற்றத்திற்கு முன் மூன்று முதல் ஆறு மாதச் செலவுக்கான சேமிப்பு வையுங்கள்.'),
  ], where: T('Your network, a skill course in the new field, and job portals you can verify.', 'உங்கள் தொடர்பு வட்டம், புதிய துறைக்கான திறன் பயிற்சி, சரிபார்க்கக்கூடிய வேலைத் தளங்கள்.') },
  business: { predict: 'business', karakas: ['Mercury', 'Jupiter'], house: 10, area: T('business', 'வியாபாரம்'), steps: [
    T('Test the idea small before you invest big.', 'பெரிய முதலீட்டுக்கு முன் சிறிய அளவில் சோதித்துப் பாருங்கள்.'),
    T('Put every partnership and deal in writing.', 'ஒவ்வொரு கூட்டும் ஒப்பந்தமும் எழுத்தில் இருக்கட்டும்.'),
    T('Keep business money and home money in separate accounts; check cash every week.', 'வியாபாரப் பணமும் வீட்டுப் பணமும் தனிக் கணக்கில் இருக்கட்டும்; வாரந்தோறும் பணநிலையைச் சரிபாருங்கள்.'),
  ], where: T('A small trial with real customers, a chartered accountant, and people already in that trade.', 'உண்மையான வாடிக்கையாளர்களுடன் சிறு சோதனை, பட்டயக் கணக்காளர், அதே தொழிலில் உள்ளவர்கள்.') },
  money: { predict: null, karakas: ['Jupiter'], house: 2, area: T('money', 'பணம்'), practicalOnly: true, steps: [
    T('Write down every income and expense for 30 days.', '30 நாட்களுக்கு ஒவ்வொரு வரவு, செலவையும் எழுதுங்கள்.'),
    T('Pay the loan with the highest interest first; take no new loan for wants.', 'அதிக வட்டிக் கடனை முதலில் அடையுங்கள்; விருப்பச் செலவுக்குப் புதிய கடன் வேண்டாம்.'),
    T('For investments or loans, consult your bank or a SEBI-registered adviser — not a horoscope.', 'முதலீடு, கடனுக்கு உங்கள் வங்கி அல்லது SEBI-பதிவு பெற்ற ஆலோசகரை அணுகுங்கள் — ஜாதகத்தை அல்ல.'),
  ], where: T('Your bank, a registered financial adviser, and a simple budget notebook.', 'உங்கள் வங்கி, பதிவு பெற்ற நிதி ஆலோசகர், ஒரு எளிய வரவு–செலவுக் குறிப்பேடு.') },
  marriage: { predict: 'marriage', karakas: ['Venus', 'Jupiter'], house: 7, area: T('marriage', 'திருமணம்'), steps: [
    T('Write down the three things that matter most to you in a life partner.', 'வாழ்க்கைத் துணையிடம் உங்களுக்கு மிக முக்கியமான மூன்றை எழுதுங்கள்.'),
    T('Talk openly with your family about what you want.', 'உங்கள் விருப்பத்தைக் குடும்பத்தினரிடம் வெளிப்படையாகப் பேசுங்கள்.'),
    T('Meet and talk properly before deciding; mutual respect matters as much as porutham.', 'முடிவெடுக்கும் முன் சந்தித்து முறையாகப் பேசுங்கள்; பொருத்தம் போலவே பரஸ்பர மரியாதையும் முக்கியம்.'),
  ], where: T('Family elders, trusted matrimony services, and the porutham check in Thunai.', 'குடும்பப் பெரியோர், நம்பகமான திருமணத் தகவல் சேவை, துணையில் பொருத்தம் பார்த்தல்.') },
  family: { predict: 'harmony', marriedOnly: true, karakas: ['Moon'], house: 4, area: T('home and family', 'வீடு, குடும்பம்'), steps: [
    T('Talk to one person at a time, calmly, without bringing up old quarrels.', 'ஒரு நேரத்தில் ஒருவரிடம், அமைதியாக, பழைய சண்டைகளை எழுப்பாமல் பேசுங்கள்.'),
    T('Keep ten minutes of family time every day without phones.', 'தினமும் பத்து நிமிடம் கைபேசி இல்லாத குடும்ப நேரம் வையுங்கள்.'),
    T('Thank one family member for one thing every day.', 'தினமும் ஒரு குடும்பத்தினருக்கு ஒரு விஷயத்திற்காக நன்றி சொல்லுங்கள்.'),
    T('If it does not ease, a family counsellor helps — it is a sign of strength.', 'சரியாகவில்லை என்றால் குடும்ப ஆலோசகர் உதவுவார் — அது பலத்தின் அடையாளம்.'),
  ], where: T('Home, a shared prayer time, and a family counsellor when needed.', 'வீடு, சேர்ந்து வழிபடும் நேரம், தேவைப்பட்டால் குடும்ப ஆலோசகர்.') },
  studies: { predict: 'education', karakas: ['Mercury', 'Jupiter'], house: 4, area: T('studies', 'படிப்பு'), steps: [
    T('Fix your study hours and keep them every day.', 'படிக்கும் நேரத்தை நிர்ணயித்து, தினமும் கடைப்பிடியுங்கள்.'),
    T('Study in 25-minute blocks with a 5-minute break.', '25 நிமிடம் படிப்பு, 5 நிமிடம் இடைவேளை என்று படியுங்கள்.'),
    T('Revise every Sunday and ask your teacher your doubts the next day.', 'ஒவ்வொரு ஞாயிறும் திருப்பிப் பாருங்கள்; சந்தேகங்களை மறுநாள் ஆசிரியரிடம் கேளுங்கள்.'),
  ], where: T('A quiet study corner, your teachers, and your school or college library.', 'அமைதியான படிக்கும் இடம், உங்கள் ஆசிரியர்கள், பள்ளி / கல்லூரி நூலகம்.') },
  abroad: { predict: 'visa', karakas: ['Rahu', 'Jupiter'], house: 9, area: T('going abroad', 'வெளிநாட்டுப் பயணம்'), steps: [
    T('Keep every document complete and verified before applying.', 'விண்ணப்பிக்கும் முன் எல்லா ஆவணங்களையும் முழுமையாகச் சரிபாருங்கள்.'),
    T('Use only government-registered agents; never pay cash without a receipt.', 'அரசுப் பதிவு பெற்ற முகவர்களை மட்டும் நாடுங்கள்; ரசீது இல்லாமல் பணம் கொடுக்காதீர்கள்.'),
    T('Save enough for the first three months abroad.', 'வெளிநாட்டில் முதல் மூன்று மாதங்களுக்குத் தேவையான சேமிப்பு வையுங்கள்.'),
  ], where: T('Official embassy websites, registered agents, and people already living there.', 'அதிகாரப்பூர்வ தூதரக இணையதளங்கள், பதிவு பெற்ற முகவர்கள், ஏற்கனவே அங்கு வாழ்பவர்கள்.') },
  health: { predict: null, karakas: ['Sun'], house: 1, area: T('health', 'உடல்நலம்'), practicalOnly: true, steps: [
    T('See a doctor first and follow the treatment fully.', 'முதலில் மருத்துவரைப் பாருங்கள்; சிகிச்சையை முழுமையாகப் பின்பற்றுங்கள்.'),
    T('Sleep on time, walk 30 minutes a day and eat simple home food.', 'நேரத்திற்கு உறங்குங்கள், தினமும் 30 நிமிடம் நடங்கள், எளிய வீட்டு உணவு உண்ணுங்கள்.'),
    T('Keep your regular health check-ups.', 'வழக்கமான உடல் பரிசோதனைகளைத் தவறாமல் செய்யுங்கள்.'),
  ], where: T('Your doctor, a nearby government hospital, and a daily walk.', 'உங்கள் மருத்துவர், அருகிலுள்ள அரசு மருத்துவமனை, தினசரி நடை.') },
  confidence: { predict: null, karakas: ['Sun', 'Mars'], house: 1, area: T('confidence', 'தன்னம்பிக்கை'), steps: [
    T('Read your strengths below every morning — they are real.', 'கீழே உள்ள உங்கள் பலங்களைத் தினமும் காலையில் வாசியுங்கள் — அவை உண்மையானவை.'),
    T('Do one small brave thing every day: ask, speak up, or try.', 'தினமும் ஒரு சிறிய துணிச்சலான செயல்: கேளுங்கள், பேசுங்கள், முயலுங்கள்.'),
    T('Stop comparing your beginning with someone else’s middle.', 'உங்கள் தொடக்கத்தை வேறொருவரின் நடுப்பகுதியுடன் ஒப்பிடாதீர்கள்.'),
  ], where: T('A small group where you can practise speaking, and a mentor you trust.', 'பேசிப் பழக ஒரு சிறிய குழு, நம்பிக்கையான ஒரு வழிகாட்டி.') },
  decision: { predict: null, karakas: ['Jupiter'], house: 9, area: T('decisions', 'முடிவுகள்'), steps: [
    T('Write the choices and their good and bad points on one page.', 'தேர்வுகளையும் அவற்றின் நல்லது–கெட்டதையும் ஒரு பக்கத்தில் எழுதுங்கள்.'),
    T('Wait three days before you decide; ask two elders you trust.', 'முடிவெடுக்கும் முன் மூன்று நாள் காத்திருங்கள்; நம்பிக்கையான இரு பெரியோரிடம் கேளுங்கள்.'),
    T('Once decided, begin in a good time (muhurtham / horai) and do not look back every day.', 'முடிவெடுத்த பின் நல்ல நேரத்தில் (முகூர்த்தம் / ஓரை) தொடங்குங்கள்; தினமும் திரும்பிப் பார்க்காதீர்கள்.'),
  ], where: T('Elders you trust, and the Muhurtham and Prasnam tools in Thunai.', 'நம்பிக்கையான பெரியோர், துணையில் முகூர்த்தம், பிரசன்னம்.') },
};
export const CONCERN_IDS = Object.freeze(Object.keys(CONCERN));

const FEEL = {
  unsure: T('You are steady — what you need is clarity. Write your goal in one line and keep it where you see it.', 'நீங்கள் நிதானமாக இருக்கிறீர்கள் — தேவை தெளிவு மட்டுமே. உங்கள் இலக்கை ஒரு வரியில் எழுதி, கண்ணில் படும் இடத்தில் வையுங்கள்.'),
  worried: T('Worry grows at night. Before sleep, write the worry on paper and one small action for tomorrow — then let it rest.', 'கவலை இரவில் பெரிதாகும். உறங்கும் முன் கவலையையும் நாளைக்கான ஒரு சிறிய செயலையும் காகிதத்தில் எழுதுங்கள் — பிறகு அதை ஓய்வெடுக்க விடுங்கள்.'),
  restless: T('Restless energy needs an outlet. Exercise first and decide later — never take a big decision in anger.', 'பரபரப்பான சக்திக்கு வழி தேவை. முதலில் உடற்பயிற்சி, பிறகு முடிவு — கோபத்தில் பெரிய முடிவு எடுக்காதீர்கள்.'),
  low: T('When tired and low, start very small: sleep, morning sunlight and one walk. If the low mood lasts more than two weeks, talk to a doctor or counsellor.', 'சோர்வும் மனத்தளர்ச்சியும் இருக்கும்போது மிகச் சிறியதாகத் தொடங்குங்கள்: உறக்கம், காலைச் சூரிய ஒளி, ஒரு நடை. இது இரண்டு வாரங்களுக்கு மேல் நீடித்தால் மருத்துவர் அல்லது ஆலோசகரிடம் பேசுங்கள்.'),
};
const SINCE = {
  new: T('It has just started — small, early steps change the most.', 'இது இப்போதுதான் தொடங்கியுள்ளது — ஆரம்பத்தில் எடுக்கும் சிறிய அடிகளே அதிகம் மாற்றும்.'),
  months: T('It has been a few months — a clear plan for the next 30 days will break the pattern.', 'சில மாதங்களாக உள்ளது — அடுத்த 30 நாட்களுக்கான தெளிவான திட்டம் இந்தச் சுழற்சியை உடைக்கும்.'),
  long: T('It has been more than a year — be gentle with yourself; long patterns change step by step, with support.', 'ஓராண்டுக்கு மேலாக உள்ளது — உங்களிடம் மென்மையாக இருங்கள்; நீண்ட காலச் சுழற்சிகள் ஆதரவுடன் படிப்படியாக மாறும்.'),
};
export const HELP = Object.freeze(T('Please talk to someone today. In India: Tele-MANAS 14416 (free, 24×7, Tamil and English). In an emergency, call 112, or your local emergency number abroad.', 'தயவுசெய்து இன்றே யாரிடமாவது பேசுங்கள். இந்தியாவில்: டெலி-மனஸ் 14416 (இலவசம், 24×7, தமிழ், ஆங்கிலம்). அவசரத்திற்கு 112, வெளிநாட்டில் அந்நாட்டு அவசர எண்.'));

const signOf = (i) => SIGN[((i % 12) + 12) % 12];
const strengthMap = (chart) => Object.fromEntries(grahaStrength(chart.planets).map((g) => [g.planet, g]));

/**
 * "Who am I" — the person from their own chart: how they come across (Lagna; Moon sign when the birth time is not
 * exact), their mind (Moon sign), strengths (strongest planets), growth areas with a practical step (weakest
 * planets), how to present themselves, how stress shows and what calms them, and the chapter of life now (Mahadasa).
 * @param {object} chart birthChart()
 * @param {{ lagnaReliable?: boolean, now?: Date, profile?: object }} o
 */
export function whoAmI(chart, { lagnaReliable = true, now = new Date(), profile = null } = {}) {
  if (!chart) return null;
  const P = chart.planets;
  const lagnaSign = lagnaReliable ? P.Lagna.rasi : null;
  const moonSign = P.Moon.rasi;
  const outerSign = lagnaSign ?? moonSign;
  const outer = signOf(outerSign), mind = signOf(moonSign);
  const st = Object.values(strengthMap(chart)).filter((g) => !['Rahu', 'Ketu'].includes(g.planet));
  const byScore = [...st].sort((a, b) => b.score - a.score);
  const strong = byScore.slice(0, 2).map((g) => ({ planet: g.planet, text: PLANET_MIND[g.planet].strong }));
  const weak = byScore.slice(-2).reverse().map((g) => ({ planet: g.planet, pattern: PLANET_MIND[g.planet].weak, step: PLANET_MIND[g.planet].step, remedy: remedyFor(g.planet, { profile }) }));
  let dasa = null;
  try { const run = runningDasa(chart, now); if (run?.md) dasa = { lord: run.md.lord, end: run.md.end, bhukti: run.ad?.lord || null, theme: DASA_THEME[run.md.lord] }; } catch { dasa = null; }
  const signName = (i) => T(RASIS[i].en, RASIS[i].ta);
  return {
    version: LIFE_GUIDE_VERSION,
    lagnaReliable,
    outer: { sign: signName(outerSign), from: lagnaSign != null ? 'lagna' : 'moon', ...outer },
    mind: { sign: signName(moonSign), ...mind },
    strengths: strong,
    growth: weak,
    present: PRESENT[outer.el],
    stress: STRESS[mind.el],
    dasa,
    karma: KARMA,
  };
}

/**
 * The tap check answered: WHY · WHEN · WHAT · WHERE for one concern.
 * @param {object} chart birthChart()
 * @param {{ concern, since, feel, sleep, want }} answers ids from CHECK
 * @param {{ now?: Date, profile?: object, married?: boolean, lagnaReliable?: boolean }} o
 */
export function lifeGuide(chart, answers = {}, { now = new Date(), profile = null, married = false, lagnaReliable = true } = {}) {
  const minor = Boolean(profile?.minor);
  let cid = CONCERN[answers.concern] ? answers.concern : 'decision';
  if (minor && CHECK[0].options.find((o) => o.id === cid)?.adultOnly) cid = 'studies';
  const c = CONCERN[cid];
  const hopeless = answers.sleep === 'hopeless';
  const me = whoAmI(chart, { lagnaReliable, now, profile });
  const S = strengthMap(chart);

  // WHY — the traditional chart reason, the chapter of life, the mind pattern, and the karma line.
  const why = [];
  if (!hopeless) {
    for (const k of c.karakas) {
      const g = S[k];
      if (!g) continue;
      const lvl = g.level === 'strong' ? T('strong', 'பலமாக') : g.level === 'weak' ? T('weak', 'பலவீனமாக') : T('average', 'சராசரியாக');
      const reason = g.reasons[0];
      why.push(T(`By tradition, ${k} (karaka of ${c.area.en}) is ${lvl.en} in your chart${reason ? ` — ${reason.en}` : ''}.`,
        `மரபுப்படி, ${PLANETS[k].ta} (${c.area.ta} காரகர்) உங்கள் ஜாதகத்தில் ${lvl.ta} உள்ளார்${reason ? ` — ${reason.ta}` : ''}.`));
    }
    if (me.dasa) why.push(T(`You are in ${me.dasa.lord} Mahadasa: ${me.dasa.theme.en}.`, `நீங்கள் ${PLANETS[me.dasa.lord].ta} மகா தசையில் உள்ளீர்கள்: ${me.dasa.theme.ta}.`));
    const weakK = me.growth.find((w) => c.karakas.includes(w.planet)) || me.growth[0];
    if (weakK) why.push(T(`Your mind pattern here: ${weakK.pattern.en} (${weakK.planet}).`, `இதில் உங்கள் மனப்போக்கு: ${weakK.pattern.ta} (${PLANETS[weakK.planet].ta}).`));
  }
  if (answers.since && SINCE[answers.since]) why.push(SINCE[answers.since]);
  why.push(KARMA.meaning);

  // WHEN — dated supportive periods from the engine (none for money / health, a child's adult topics or "losing hope").
  let when = { periods: [], note: null, current: null };
  const usePredict = c.predict && !c.practicalOnly && !hopeless && !(c.marriedOnly && !married) && !(minor && cid !== 'studies');
  if (usePredict) {
    try {
      const pr = predictEvent(chart, c.predict, { from: now, years: 6 });
      when = {
        periods: (pr.windows || []).slice(0, 3).map((w) => ({ start: w.peakFrom || w.start, end: w.peakTo || w.end, md: w.md, ad: w.ad, reason: w.reasons?.[0] || null })),
        current: pr.current ? { md: pr.current.md, ad: pr.current.ad, end: pr.current.end } : null,
        note: pr.needsBirthTime ? T('These periods need an exact birth time — add it for dated windows.', 'இந்தக் காலங்களுக்குத் துல்லியமான பிறந்த நேரம் தேவை — தேதியுடன் பார்க்க அதைச் சேருங்கள்.') : null,
      };
    } catch { when = { periods: [], note: null, current: null }; }
  }
  if (!when.periods.length && !when.note) {
    when.note = c.practicalOnly ? T('For this, Thunai does not read timing — act now with the practical steps below.', 'இதற்குத் துணை காலம் கணிப்பதில்லை — கீழே உள்ள நடைமுறை அடிகளுடன் இப்போதே தொடங்குங்கள்.')
      : T('The best time to begin is a calm, good day — start with the first step this week.', 'தொடங்க சிறந்த நேரம் அமைதியான நல்ல நாள் — இந்த வாரமே முதல் அடியுடன் தொடங்குங்கள்.');
  }

  // WHAT — the mind step for how they feel, the concern's practical steps, the planet's life step, and the wish.
  const what = [];
  if (answers.feel && FEEL[answers.feel]) what.push(FEEL[answers.feel]);
  what.push(...c.steps);
  const focus = me.growth.find((w) => c.karakas.includes(w.planet)) || me.growth[0];
  if (focus && !hopeless) what.push(focus.step);
  if (answers.want === 'courage') what.unshift(T('This week, take one small brave step on this — even a phone call counts.', 'இந்த வாரம், இதில் ஒரு சிறிய துணிச்சலான அடி எடுங்கள் — ஒரு தொலைபேசி அழைப்பும் கணக்குதான்.'));
  if (answers.want === 'peace') what.unshift(T('Give yourself ten quiet minutes morning and evening — prayer or slow breathing — before anything else.', 'காலையும் மாலையும் பத்து நிமிடம் அமைதி — வழிபாடு அல்லது மெதுவான மூச்சு — எல்லாவற்றுக்கும் முன்.'));

  // The parigaram: the concern's weaker karaka, else the person's weakest planet, else the running dasa lord.
  const karakaWeak = c.karakas.map((k) => S[k]).filter((g) => g && g.score < 55).sort((a, b) => a.score - b.score)[0];
  const pPlanet = karakaWeak?.planet || me.growth[0]?.planet || me.dasa?.lord || c.karakas[0];
  const r = remedyFor(pPlanet, { profile });
  const parigaram = r ? { planet: pPlanet, deity: r.deity, day: r.day, mantra: r.mantra, hymn: r.hymn || null, free: r.free, charity: minor ? null : r.charity, temple: r.temple, optional: true } : null;

  // WHERE — where to put effort, and the temple for the parigaram.
  const where = [c.where];
  if (parigaram?.temple) where.push(T(`Temple (optional): ${parigaram.temple.en}`, `கோவில் (விருப்பம்): ${parigaram.temple.ta}`));

  // A seven-day start, one different step a day: how you feel, the concern's steps, your planet's life step,
  // the parigaram on its day, and a review on day 7.
  const seen = new Set();
  const uniq = (xs) => xs.filter((x) => x && !seen.has(x.en) && seen.add(x.en));
  const first = uniq([answers.feel && FEEL[answers.feel] ? FEEL[answers.feel] : T('Write your goal in one line and keep it where you see it every day.', 'உங்கள் இலக்கை ஒரு வரியில் எழுதி, தினமும் கண்ணில் படும் இடத்தில் வையுங்கள்.')]);
  const middle = uniq([...c.steps, focus && !hopeless ? focus.step : null]).slice(0, 4);
  const prayer = parigaram ? T(`On ${WEEKDAYS_EN[parigaram.day]}, pray to ${parigaram.deity.en}: ${parigaram.free.en}`, `${WEEKDAYS_TA[parigaram.day]} அன்று ${parigaram.deity.ta} வழிபாடு: ${parigaram.free.ta}`) : null;
  const review = T('Look back at the week: what changed? Thank one person who helped, and plan next week’s three steps.', 'வாரத்தைத் திரும்பிப் பாருங்கள்: என்ன மாறியது? உதவிய ஒருவருக்கு நன்றி சொல்லுங்கள்; அடுத்த வாரத்தின் மூன்று அடிகளைத் திட்டமிடுங்கள்.');
  const fill = [T('Sleep and wake at the same time today, and take a 20-minute walk.', 'இன்று ஒரே நேரத்தில் உறங்கி எழுங்கள்; 20 நிமிடம் நடங்கள்.'), T('Talk to one person you trust about your plan.', 'உங்கள் திட்டத்தை நம்பிக்கையான ஒருவரிடம் பேசுங்கள்.')];
  const week = [...first, ...middle, ...uniq(fill)].slice(0, 5);
  week.push(...uniq([prayer, fill[1]]).slice(0, 1));
  week.push(review);

  return {
    version: LIFE_GUIDE_VERSION,
    concern: cid, area: c.area, hopeless,
    help: hopeless ? HELP : null,
    who: me,
    why, when, what, parigaram, where, week,
    karma: KARMA,
    note: T('Traditional guidance for reflection and planning — not a guarantee. For health, money or legal matters, please consult a qualified professional.', 'சிந்தனைக்கும் திட்டமிடலுக்குமான பாரம்பரிய வழிகாட்டல் — உத்தரவாதம் அல்ல. உடல்நலம், பணம், சட்ட விஷயங்களுக்குத் தகுதியான நிபுணரை அணுகுங்கள்.'),
  };
}
