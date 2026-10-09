// Deep jathagam reading (ஜாதக விரிவான விளக்கம்) — generated ON THE DEVICE from the chart alone: no AI call, works
// offline, the same chart always gives the same words. It answers "who is this person?" the way an experienced
// jothidar explains a chart to a family:
//   1. Gunam — Lagna nature, Rasi (mind), the element and quality of both
//   2. Natchathira gunam — deity, symbol, gana, nature, strengths, growth points, suited fields, prayer
//   3. The 12 kattams — about ten sentences each: what the house governs, the sign on it, where its lord sits and
//      how strong it is, the planets in it, the aspects on it, the overall tone, practical guidance, a free practice
//   4. The nine planets — sign, house, strength and what each brings
// Every line is a traditional interpretation, never a certainty, a verdict, a fear statement, a diagnosis or a
// money instruction (Deterministic-Prediction Safety Standard; checked by test/deep-reading.test.js with the
// shared banned-phrase library). A minor (or unknown age) gets child-safe themes for houses 2, 5, 7, 8, 10 and 11.
// Unknown birth time: houses are counted from the Moon sign (Chandra lagna) and the reading says so.
// Pure module — shared by the browser and Node tests.
import { RASIS, NAKSHATRAS, PLANETS } from './astro.js';
import { grahaStrength, NAVAGRAHA } from './remedies.js';
import { bhavaAnalysis } from './analysis.js';
import { STAR_DEITY } from './personal.js';

const T = (en, ta) => ({ en, ta });
export const DEEP_VERSION = 'deep-reading-1.0.0';
const ORD = (n) => `${n}${n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th'}`;
const pTa = (k) => PLANETS[k]?.ta || k;
const adjTa = (s) => (s.endsWith('ம்') ? s.slice(0, -2) : s);
const houseOf = (ref, rasi) => ((rasi - ref + 12) % 12) + 1;

// ------------------------------------------------------------------ signs: element and quality
const ELEMENT = [
  T('Fire', 'நெருப்பு'), T('Earth', 'நிலம்'), T('Air', 'காற்று'), T('Water', 'நீர்'),
];
const ELEMENT_NATURE = [
  T('Fire signs give warmth, courage and the urge to lead and to start things.', 'நெருப்பு ராசிகள் உற்சாகம், தைரியம், முன்னின்று தொடங்கும் ஆர்வத்தைத் தருகின்றன.'),
  T('Earth signs give patience, practical sense and a wish to build something lasting.', 'நில ராசிகள் பொறுமை, நடைமுறை அறிவு, நிலையான ஒன்றை உருவாக்கும் விருப்பத்தைத் தருகின்றன.'),
  T('Air signs give quick thinking, good communication and an easy way with people.', 'காற்று ராசிகள் விரைவான சிந்தனை, நல்ல பேச்சுத் திறன், மக்களுடன் இணக்கத்தைத் தருகின்றன.'),
  T('Water signs give deep feeling, intuition and a caring, protective heart.', 'நீர் ராசிகள் ஆழ்ந்த உணர்வு, உள்ளுணர்வு, அக்கறையும் பாதுகாப்பும் கொண்ட மனத்தைத் தருகின்றன.'),
];
const MODE = [T('movable (chara)', 'சர'), T('fixed (sthira)', 'ஸ்திர'), T('dual (ubhaya)', 'உபய')];
const MODE_NATURE = [
  T('As a movable sign it favours action, change and new beginnings.', 'சர ராசி என்பதால் செயல், மாற்றம், புதிய தொடக்கங்களுக்கு ஏற்றது.'),
  T('As a fixed sign it favours steadiness, loyalty and finishing what is begun.', 'ஸ்திர ராசி என்பதால் நிலைத்தன்மை, விசுவாசம், தொடங்கியதை முடிக்கும் குணத்திற்கு ஏற்றது.'),
  T('As a dual sign it favours flexibility, learning and seeing both sides.', 'உபய ராசி என்பதால் நெகிழ்வு, கற்றல், இரு பக்கமும் பார்க்கும் பக்குவத்திற்கு ஏற்றது.'),
];
// How the sign on a house colours that house's matters (element × short wording).
const STYLE = [
  T('boldly and directly', 'துணிச்சலாகவும் நேரடியாகவும்'), T('steadily and practically', 'நிதானமாகவும் நடைமுறையாகவும்'),
  T('thoughtfully and through people', 'சிந்தனையுடனும் மக்கள் தொடர்பின் வழியாகவும்'), T('with feeling and care', 'உணர்வுடனும் அக்கறையுடனும்'),
];

// Lagna: how the person meets the world (two sentences each).
const LAGNA_NATURE = [
  T('Mesha Lagna people meet life head-on: energetic, frank and quick to take the first step. They do best with a clear goal and room to act, and learn over time that patience multiplies their courage.', 'மேஷ லக்னக்காரர்கள் வாழ்க்கையை நேருக்கு நேர் சந்திப்பவர்கள்: உற்சாகமும் வெளிப்படையான பேச்சும் முதல் அடியை எடுக்கும் துணிவும் கொண்டவர்கள். தெளிவான இலக்கும் செயல்படும் சுதந்திரமும் இருக்கும்போது சிறப்பாகச் செயல்படுவார்கள்; பொறுமை அவர்களின் தைரியத்தைப் பன்மடங்காக்கும்.'),
  T('Rishaba Lagna people are calm, reliable and fond of comfort, beauty and good food. They build slowly but surely, value security and loyalty, and are slow to anger but firm once decided.', 'ரிஷப லக்னக்காரர்கள் அமைதியும் நம்பகத்தன்மையும் கொண்டவர்கள்; வசதி, அழகு, நல்ல உணவை விரும்புபவர்கள். மெதுவாக ஆனால் உறுதியாகக் கட்டியெழுப்புவார்கள்; பாதுகாப்பையும் விசுவாசத்தையும் மதிப்பார்கள்; எளிதில் கோபப்பட மாட்டார்கள், முடிவெடுத்தால் உறுதியாக நிற்பார்கள்.'),
  T('Mithuna Lagna people are curious, witty and good with words, numbers and ideas. They enjoy variety and conversation, learn quickly, and grow most when they focus their many interests on a few goals.', 'மிதுன லக்னக்காரர்கள் ஆர்வமும் நகைச்சுவையும் கொண்டவர்கள்; சொல், எண், யோசனைகளில் திறமைசாலிகள். பல்வகைமையையும் உரையாடலையும் விரும்புவார்கள், விரைவாகக் கற்பார்கள்; பல ஆர்வங்களைச் சில இலக்குகளில் குவிக்கும்போது மிகவும் வளர்வார்கள்.'),
  T('Kadaga Lagna people are sensitive, caring and deeply attached to home and family. They remember kindness, protect those they love, and do well when they also look after their own feelings.', 'கடக லக்னக்காரர்கள் மென்மையும் அக்கறையும் கொண்டவர்கள்; வீடு, குடும்பத்தின் மீது ஆழ்ந்த பற்றுடையவர்கள். பிறர் செய்த நன்மையை மறக்க மாட்டார்கள், அன்பானவர்களைப் பாதுகாப்பார்கள்; தம் உணர்வுகளையும் கவனித்துக்கொள்ளும்போது சிறப்பாக இருப்பார்கள்.'),
  T('Simha Lagna people carry natural dignity and a generous heart. They like to lead, protect and be respected, and shine brightest when their pride is matched with humility and service.', 'சிம்ம லக்னக்காரர்கள் இயல்பான கம்பீரமும் தாராள மனமும் கொண்டவர்கள். தலைமை தாங்கவும் பாதுகாக்கவும் மதிக்கப்படவும் விரும்புவார்கள்; சுயமரியாதையுடன் பணிவும் சேவையும் சேரும்போது மிகவும் ஒளிர்வார்கள்.'),
  T('Kanni Lagna people are careful, analytical and helpful, with an eye for detail and order. They are skilled at improving things, and find peace when they are as kind to themselves as they are exacting.', 'கன்னி லக்னக்காரர்கள் கவனமும் பகுப்பாய்வுத் திறனும் உதவும் குணமும் கொண்டவர்கள்; நுணுக்கத்தையும் ஒழுங்கையும் கவனிப்பவர்கள். எதையும் மேம்படுத்துவதில் வல்லவர்கள்; தம்மிடமும் கனிவாக இருக்கும்போது மன அமைதி பெறுவார்கள்.'),
  T('Thula Lagna people seek balance, fairness and harmony, and are pleasant company. They are good mediators with a sense of beauty, and grow when they make firm decisions without waiting for everyone to agree.', 'துலா லக்னக்காரர்கள் சமநிலை, நியாயம், இணக்கத்தைத் தேடுபவர்கள்; இனிமையாகப் பழகுபவர்கள். அழகுணர்வுடன் சமரசம் செய்வதில் வல்லவர்கள்; அனைவரும் ஒப்புக்கொள்ளக் காத்திராமல் உறுதியான முடிவெடுக்கும்போது வளர்வார்கள்.'),
  T('Vrischika Lagna people are intense, determined and private, with strong intuition. Once committed they are deeply loyal, and they have a rare ability to rebuild themselves after any setback.', 'விருச்சிக லக்னக்காரர்கள் தீவிரமும் உறுதியும் கொண்டவர்கள்; தம் விஷயங்களை ரகசியமாக வைப்பவர்கள், கூர்மையான உள்ளுணர்வு உடையவர்கள். ஒருமுறை பற்றுக்கொண்டால் ஆழ்ந்த விசுவாசம் காட்டுவார்கள்; எந்தச் சரிவுக்குப் பின்னும் மீண்டு எழும் அரிய ஆற்றல் உண்டு.'),
  T('Dhanusu Lagna people are honest, optimistic and guided by principles and faith. They love learning, travel and teaching, and do best when their big vision is supported by steady follow-through.', 'தனுசு லக்னக்காரர்கள் நேர்மையும் நம்பிக்கையும் கொண்டவர்கள்; கொள்கையாலும் இறை நம்பிக்கையாலும் வழிநடத்தப்படுபவர்கள். கற்றல், பயணம், கற்பித்தலை விரும்புவார்கள்; பெரிய கனவுக்குத் தொடர்ந்த உழைப்பும் சேரும்போது சிறப்பாக இருப்பார்கள்.'),
  T('Magara Lagna people are disciplined, responsible and ambitious in a quiet way. They earn respect through hard work, grow stronger with age, and benefit from making time for rest and family.', 'மகர லக்னக்காரர்கள் ஒழுக்கமும் பொறுப்பும் அமைதியான லட்சியமும் கொண்டவர்கள். கடின உழைப்பால் மரியாதை பெறுவார்கள், வயதாக ஆக வலுப்பெறுவார்கள்; ஓய்வுக்கும் குடும்பத்துக்கும் நேரம் ஒதுக்குவது நல்லது.'),
  T('Kumba Lagna people are independent thinkers with a humanitarian streak. They are friendly, original and loyal to ideals, and grow when they balance their concern for many with care for those close to them.', 'கும்ப லக்னக்காரர்கள் சுதந்திரமாகச் சிந்திப்பவர்கள்; சமூக நலனில் அக்கறை கொண்டவர்கள். நட்பும் புதுமையும் லட்சியப் பற்றும் உடையவர்கள்; பலருக்கான அக்கறையுடன் அருகிலுள்ளவர்களையும் கவனிக்கும்போது வளர்வார்கள்.'),
  T('Meena Lagna people are kind, intuitive and spiritually inclined, with a rich imagination. They feel others\' pain easily and help freely, and are at their best with gentle routines and clear boundaries.', 'மீன லக்னக்காரர்கள் இரக்கமும் உள்ளுணர்வும் ஆன்மீக நாட்டமும் கொண்டவர்கள்; கற்பனை வளம் மிக்கவர்கள். பிறர் துன்பத்தை எளிதில் உணர்ந்து தாராளமாக உதவுவார்கள்; மென்மையான ஒழுங்கும் தெளிவான எல்லைகளும் இருக்கும்போது சிறப்பாக இருப்பார்கள்.'),
];
// Rasi (Moon sign): the mind and emotions.
const RASI_MIND = [
  T('The mind is quick, eager and direct; feelings rise fast and settle fast.', 'மனம் வேகமும் ஆர்வமும் நேர்மையும் கொண்டது; உணர்ச்சிகள் விரைவாக எழுந்து விரைவாக அடங்கும்.'),
  T('The mind is calm and steady and seeks security and simple pleasures.', 'மனம் அமைதியும் நிலைத்தன்மையும் கொண்டது; பாதுகாப்பையும் எளிய மகிழ்ச்சிகளையும் தேடும்.'),
  T('The mind is restless and curious and is refreshed by talk, reading and variety.', 'மனம் சுறுசுறுப்பும் ஆர்வமும் கொண்டது; பேச்சு, வாசிப்பு, பல்வகைமையால் புத்துணர்வு பெறும்.'),
  T('The mind is tender and protective and is shaped strongly by home and mother.', 'மனம் மென்மையும் பாதுகாப்புணர்வும் கொண்டது; வீடும் தாயும் மனதை ஆழமாக வடிவமைக்கும்.'),
  T('The mind is warm and proud and needs appreciation and a sense of purpose.', 'மனம் அன்பும் சுயமரியாதையும் கொண்டது; பாராட்டும் நோக்கமும் தேவைப்படும்.'),
  T('The mind is analytical and careful and feels best when things are in order.', 'மனம் பகுத்தாயும் கவனமும் கொண்டது; எல்லாம் ஒழுங்காக இருக்கும்போது நிம்மதி பெறும்.'),
  T('The mind seeks harmony and fairness and is unsettled by conflict.', 'மனம் இணக்கத்தையும் நியாயத்தையும் தேடும்; சண்டை சச்சரவு மனதைக் கலக்கும்.'),
  T('The mind feels deeply and holds on strongly; trust is given slowly but fully.', 'மனம் ஆழமாக உணரும், உறுதியாகப் பற்றிக்கொள்ளும்; நம்பிக்கை மெதுவாக, ஆனால் முழுமையாக வரும்.'),
  T('The mind is open, hopeful and drawn to faith, learning and wide horizons.', 'மனம் திறந்ததும் நம்பிக்கை நிறைந்ததும்; இறைநம்பிக்கை, கல்வி, பரந்த பார்வையை நாடும்.'),
  T('The mind is serious and practical and feels secure through work and duty.', 'மனம் பொறுப்பும் நடைமுறையும் கொண்டது; உழைப்பிலும் கடமையிலும் பாதுகாப்பு உணரும்.'),
  T('The mind is independent and idealistic and values friendship and freedom.', 'மனம் சுதந்திரமும் லட்சியமும் கொண்டது; நட்பையும் சுதந்திரத்தையும் மதிக்கும்.'),
  T('The mind is gentle, imaginative and compassionate, and needs quiet time to recharge.', 'மனம் மென்மையும் கற்பனையும் இரக்கமும் கொண்டது; புத்துணர்வு பெற அமைதியான நேரம் தேவை.'),
];

// ------------------------------------------------------------------ the 27 stars (natchathira gunam)
const GANA = { D: T('Deva gana', 'தேவ கணம்'), M: T('Manushya gana', 'மனித கணம்'), R: T('Rakshasa gana', 'ராட்சச கணம்') };
const GANA_NATURE = {
  D: T('Deva gana is traditionally linked with gentleness, generosity and a dharmic outlook.', 'தேவ கணம் மென்மை, தாராள குணம், தர்ம சிந்தனையுடன் பாரம்பரியமாக இணைக்கப்படுகிறது.'),
  M: T('Manushya gana is traditionally linked with a practical, balanced and worldly-wise nature.', 'மனித கணம் நடைமுறை அறிவு, சமநிலை, உலக அனுபவ ஞானத்துடன் பாரம்பரியமாக இணைக்கப்படுகிறது.'),
  R: T('Rakshasa gana is traditionally linked with a strong will, independence and the courage to stand alone — it is a nature, not a fault.', 'ராட்சச கணம் வலுவான மன உறுதி, சுதந்திரம், தனித்து நிற்கும் துணிவுடன் பாரம்பரியமாக இணைக்கப்படுகிறது — இது ஒரு இயல்பு, குறை அல்ல.'),
};
// [deity, symbol, gana, nature, strengths, growth, fields]
const S = (deity, symbol, gana, nature, strengths, growth, fields) => ({ deity, symbol, gana, nature, strengths, growth, fields });
export const STAR_GUNAM = [
  S(T('the Ashwini Kumaras, divine healers', 'அஸ்வினி தேவர்கள் (தேவ மருத்துவர்கள்)'), T('a horse\'s head', 'குதிரைத் தலை'), 'D',
    T('Ashwini natives are quick, energetic and helpful — first to arrive when someone needs aid.', 'அஸ்வினி நட்சத்திரக்காரர்கள் வேகமும் உற்சாகமும் உதவும் குணமும் கொண்டவர்கள் — யாருக்கு உதவி தேவையோ அங்கே முதலில் வருபவர்கள்.'),
    T('speed, initiative, a healing touch and a youthful spirit', 'வேகம், முன்முயற்சி, குணப்படுத்தும் கனிவு, இளமையான மனம்'),
    T('finishing what is started and pausing before acting', 'தொடங்கியதை முடித்தல், செயல்படுமுன் சற்று நிதானித்தல்'),
    T('medicine and care, sports, transport, emergency services, new ventures', 'மருத்துவம்–பராமரிப்பு, விளையாட்டு, போக்குவரத்து, அவசர சேவை, புதிய முயற்சிகள்')),
  S(T('Yama, the lord of dharma', 'தர்மராஜன் (யமன்)'), T('a cradle (yoni)', 'யோனி / தொட்டில்'), 'M',
    T('Bharani natives are strong-willed, responsible and able to carry heavy duties without complaint.', 'பரணி நட்சத்திரக்காரர்கள் மன உறுதியும் பொறுப்புணர்வும் கொண்டவர்கள்; பெரும் கடமைகளையும் முணுமுணுக்காமல் சுமப்பவர்கள்.'),
    T('determination, a sense of justice, creativity and endurance', 'விடாமுயற்சி, நியாய உணர்வு, படைப்பாற்றல், தாங்கும் சக்தி'),
    T('moderation and letting go of what cannot be controlled', 'அளவோடு இருத்தல், கட்டுப்படுத்த முடியாததை விட்டுவிடுதல்'),
    T('law and administration, arts and media, hospitality, finance roles', 'சட்டம்–நிர்வாகம், கலை–ஊடகம், விருந்தோம்பல், நிதிப் பணிகள்')),
  S(T('Agni, the sacred fire', 'அக்னி தேவன்'), T('a flame or a sharp blade', 'தீச்சுடர் / கூர்மையான கத்தி'), 'R',
    T('Karthigai natives are bright, sharp and principled — they cut through confusion and speak the truth.', 'கார்த்திகை நட்சத்திரக்காரர்கள் ஒளியும் கூர்மையும் கொள்கைப் பிடிப்பும் கொண்டவர்கள் — குழப்பத்தைத் தெளிவாக்கி உண்மையைப் பேசுபவர்கள்.'),
    T('courage, clarity, leadership and a protective nature', 'தைரியம், தெளிவு, தலைமைப் பண்பு, பாதுகாக்கும் குணம்'),
    T('softening sharp words and allowing others their pace', 'கூர்மையான சொற்களை மென்மையாக்குதல், பிறரின் வேகத்தை ஏற்றல்'),
    T('administration, defence and police, engineering, cooking and food, teaching', 'நிர்வாகம், பாதுகாப்புத் துறை, பொறியியல், சமையல்–உணவு, கற்பித்தல்')),
  S(T('Brahma, the creator', 'பிரம்மா (படைப்புக் கடவுள்)'), T('a chariot or ox-cart', 'தேர் / மாட்டுவண்டி'), 'M',
    T('Rohini natives are charming, creative and fond of beauty, comfort and growth — tradition counts it among the most fertile stars for ideas.', 'ரோகிணி நட்சத்திரக்காரர்கள் கவர்ச்சியும் படைப்பாற்றலும் கொண்டவர்கள்; அழகு, வசதி, வளர்ச்சியை விரும்புபவர்கள் — யோசனைகளுக்கு மிகவும் வளமான நட்சத்திரமாகப் பாரம்பரியம் கருதுகிறது.'),
    T('artistic taste, warmth, persuasion and the ability to make things grow', 'கலை ரசனை, அன்பு, மனதை ஈர்க்கும் பேச்சு, எதையும் வளர்க்கும் திறன்'),
    T('contentment and not holding on too tightly to possessions', 'மனநிறைவு, உடைமைகளை அதிகம் பற்றிக்கொள்ளாமை'),
    T('arts and design, agriculture and food, fashion, hospitality, trade', 'கலை–வடிவமைப்பு, விவசாயம்–உணவு, ஆடை அலங்காரம், விருந்தோம்பல், வணிகம்')),
  S(T('Soma (the Moon)', 'சோமன் (சந்திரன்)'), T('a deer\'s head', 'மான் தலை'), 'D',
    T('Mirugasirisham natives are gentle seekers — curious, soft-spoken and always searching for something better.', 'மிருகசீரிஷ நட்சத்திரக்காரர்கள் மென்மையான தேடல் கொண்டவர்கள் — ஆர்வமும் இனிய பேச்சும் கொண்டு எப்போதும் சிறந்ததைத் தேடுபவர்கள்.'),
    T('curiosity, research, a pleasant manner and adaptability', 'ஆர்வம், ஆராய்ச்சி, இனிய பழக்கம், சூழலுக்கு ஏற்ப மாறும் தன்மை'),
    T('settling on a path and trusting what has already been found', 'ஒரு பாதையில் நிலைத்தல், கண்டடைந்ததை நம்புதல்'),
    T('research, writing, travel, sales, textiles, music', 'ஆராய்ச்சி, எழுத்து, பயணம், விற்பனை, ஜவுளி, இசை')),
  S(T('Rudra, the storm form of Shiva', 'ருத்ரன் (சிவனின் புயல் வடிவம்)'), T('a teardrop or a diamond', 'கண்ணீர்த்துளி / வைரம்'), 'M',
    T('Thiruvathirai natives are intense thinkers who learn through change — after every storm they see more clearly.', 'திருவாதிரை நட்சத்திரக்காரர்கள் ஆழ்ந்து சிந்திப்பவர்கள்; மாற்றங்களின் வழியே கற்பவர்கள் — ஒவ்வொரு புயலுக்குப் பின்னும் இன்னும் தெளிவாகப் பார்ப்பவர்கள்.'),
    T('sharp intellect, problem-solving, honesty and emotional depth', 'கூர்மையான அறிவு, சிக்கல் தீர்க்கும் திறன், நேர்மை, உணர்வு ஆழம்'),
    T('calming restlessness and choosing gentle words in difficult moments', 'அமைதியின்மையைத் தணித்தல், கடினமான நேரத்தில் மென்மையான சொற்கள்'),
    T('technology and software, science, research, medicine, communication', 'தொழில்நுட்பம்–மென்பொருள், அறிவியல், ஆராய்ச்சி, மருத்துவம், தகவல் தொடர்பு')),
  S(T('Aditi, the mother of the gods', 'அதிதி (தேவர்களின் தாய்)'), T('a bow and quiver', 'வில்லும் அம்பறாத்தூணியும்'), 'D',
    T('Punarpoosam natives are hopeful and good-natured — however far they wander, they return home stronger.', 'புனர்பூச நட்சத்திரக்காரர்கள் நம்பிக்கையும் நல்ல குணமும் கொண்டவர்கள் — எவ்வளவு தூரம் சென்றாலும் மேலும் வலுவுடன் வீடு திரும்புபவர்கள்.'),
    T('optimism, forgiveness, simplicity and the gift of a fresh start', 'நம்பிக்கை, மன்னிக்கும் குணம், எளிமை, மீண்டும் தொடங்கும் வரம்'),
    T('planning ahead and staying with one effort long enough', 'முன்கூட்டியே திட்டமிடல், ஒரு முயற்சியில் போதுமான காலம் நிலைத்தல்'),
    T('teaching, counselling, travel and tourism, writing, spiritual work', 'கற்பித்தல், ஆலோசனை, பயணம்–சுற்றுலா, எழுத்து, ஆன்மீகப் பணி')),
  S(T('Brihaspati (Guru), teacher of the gods', 'பிருகஸ்பதி (குரு)'), T('a flower or a cow\'s udder (nourishment)', 'மலர் / பசுவின் மடி (ஊட்டம்)'), 'D',
    T('Poosam natives are nourishing, devoted and dependable — tradition holds it among the most auspicious stars.', 'பூச நட்சத்திரக்காரர்கள் பிறரைப் பேணுபவர்கள், பக்தியும் நம்பகத்தன்மையும் கொண்டவர்கள் — மிக மங்களகரமான நட்சத்திரங்களில் ஒன்றாகப் பாரம்பரியம் கருதுகிறது.'),
    T('care for others, discipline, faith and steady service', 'பிறர் மீது அக்கறை, ஒழுக்கம், இறைநம்பிக்கை, தொடர்ந்த சேவை'),
    T('caring for themselves too and accepting help gracefully', 'தம்மையும் கவனித்தல், உதவியை மனதார ஏற்றல்'),
    T('teaching, social service, food and dairy, administration, temple and religious work', 'கற்பித்தல், சமூக சேவை, உணவு–பால் தொழில், நிர்வாகம், கோவில்–சமயப் பணி')),
  S(T('the Nagas, serpent deities', 'நாக தேவதைகள்'), T('a coiled serpent', 'சுருண்ட நாகம்'), 'R',
    T('Ayilyam natives are perceptive and clever, with a sharp sense of what others feel and want.', 'ஆயில்ய நட்சத்திரக்காரர்கள் கூர்ந்த நோக்கும் புத்திசாலித்தனமும் கொண்டவர்கள்; பிறர் உணர்வையும் விருப்பத்தையும் கூர்மையாக அறிபவர்கள்.'),
    T('insight, strategy, persuasion and protective loyalty', 'உள்நோக்கு, திட்டமிடும் திறன், மனதை மாற்றும் பேச்சு, பாதுகாக்கும் விசுவாசம்'),
    T('trusting openly and sharing feelings rather than guarding them', 'வெளிப்படையாக நம்புதல், உணர்வுகளை மறைக்காமல் பகிர்தல்'),
    T('medicine and pharmacy, psychology, research, politics and diplomacy, writing', 'மருத்துவம்–மருந்தியல், உளவியல், ஆராய்ச்சி, அரசியல்–ராஜதந்திரம், எழுத்து')),
  S(T('the Pitrus, the ancestors', 'பித்ருக்கள் (முன்னோர்)'), T('a royal throne', 'அரியணை'), 'R',
    T('Magam natives carry dignity and respect for tradition — they honour their roots and like to lead with authority.', 'மக நட்சத்திரக்காரர்கள் கம்பீரமும் பாரம்பரியப் பற்றும் கொண்டவர்கள் — வேர்களை மதித்து அதிகாரத்துடன் வழிநடத்த விரும்புபவர்கள்.'),
    T('leadership, generosity, loyalty to family and a sense of honour', 'தலைமைப் பண்பு, தாராளம், குடும்பப் பற்று, மான உணர்வு'),
    T('humility and listening to younger voices', 'பணிவு, இளையோரின் கருத்தையும் கேட்டல்'),
    T('administration and government, history and heritage, management, politics', 'நிர்வாகம்–அரசுப் பணி, வரலாறு–பாரம்பரியம், மேலாண்மை, அரசியல்')),
  S(T('Bhaga, the giver of happiness', 'பகன் (இன்பம் அருளும் தேவன்)'), T('the front legs of a bed or a hammock', 'கட்டிலின் முன் கால்கள் / ஊஞ்சல்'), 'M',
    T('Pooram natives are warm, charming and creative — they bring joy and celebration wherever they go.', 'பூர நட்சத்திரக்காரர்கள் அன்பும் கவர்ச்சியும் படைப்பாற்றலும் கொண்டவர்கள் — செல்லும் இடமெல்லாம் மகிழ்ச்சியைக் கொண்டு வருபவர்கள்.'),
    T('artistic talent, friendliness, generosity and enjoyment of life', 'கலைத் திறன், நட்புணர்வு, தாராளம், வாழ்க்கையை ரசிக்கும் மனம்'),
    T('balancing pleasure with discipline and saving', 'இன்பத்தையும் ஒழுக்கத்தையும் சேமிப்பையும் சமநிலைப்படுத்துதல்'),
    T('arts, music and entertainment, beauty and fashion, hospitality, event work', 'கலை, இசை–பொழுதுபோக்கு, அழகு–அலங்காரம், விருந்தோம்பல், நிகழ்ச்சி ஏற்பாடு')),
  S(T('Aryaman, the lord of friendship and contracts', 'அர்யமன் (நட்பு, உடன்படிக்கைகளின் தேவன்)'), T('the back legs of a bed', 'கட்டிலின் பின் கால்கள்'), 'M',
    T('Uthiram natives are reliable, generous helpers who keep their word and stand by friends.', 'உத்திர நட்சத்திரக்காரர்கள் நம்பகமான, தாராளமாக உதவுபவர்கள்; சொன்ன சொல்லைக் காப்பவர்கள், நண்பர்களுக்குத் துணை நிற்பவர்கள்.'),
    T('dependability, kindness, organising ability and a sense of duty', 'நம்பகத்தன்மை, கனிவு, ஒருங்கிணைக்கும் திறன், கடமை உணர்வு'),
    T('saying no when needed and resting before exhaustion', 'தேவையானபோது மறுத்தல், சோர்வுக்கு முன் ஓய்வெடுத்தல்'),
    T('management, public service, counselling, partnerships, finance', 'மேலாண்மை, பொதுச் சேவை, ஆலோசனை, கூட்டுத் தொழில், நிதி')),
  S(T('Savitr, the Sun as inspirer', 'சவிதா (சூரிய தேவன்)'), T('an open hand', 'திறந்த கை'), 'D',
    T('Hastham natives are skilful with their hands and mind, practical, witty and resourceful.', 'அஸ்த நட்சத்திரக்காரர்கள் கைத்திறனும் மனத்திறனும் கொண்டவர்கள்; நடைமுறை அறிவும் நகைச்சுவையும் வளமான யோசனைகளும் உடையவர்கள்.'),
    T('craftsmanship, quick learning, humour and helpfulness', 'கைவினைத் திறன், விரைவான கற்றல், நகைச்சுவை, உதவும் குணம்'),
    T('patience with slower people and trusting the long process', 'மெதுவானவர்களிடம் பொறுமை, நீண்ட செயல்முறையை நம்புதல்'),
    T('crafts and design, healing work, trade, writing, technical skills', 'கைவினை–வடிவமைப்பு, சிகிச்சைப் பணி, வணிகம், எழுத்து, தொழில்நுட்பத் திறன்கள்')),
  S(T('Vishwakarma, the divine architect', 'விஸ்வகர்மா (தேவ சிற்பி)'), T('a bright jewel or pearl', 'ஒளிரும் ரத்தினம் / முத்து'), 'R',
    T('Chithirai natives are creative builders with a strong sense of beauty, design and form.', 'சித்திரை நட்சத்திரக்காரர்கள் அழகு, வடிவமைப்பு, வடிவ உணர்வு மிக்க படைப்பாளிகள்.'),
    T('design sense, confidence, skill and the drive to create something remarkable', 'வடிவமைப்பு உணர்வு, தன்னம்பிக்கை, திறமை, சிறப்பான ஒன்றை உருவாக்கும் ஆர்வம்'),
    T('patience in partnerships and valuing substance over appearance', 'கூட்டுறவில் பொறுமை, தோற்றத்தை விட உள்ளடக்கத்தை மதித்தல்'),
    T('architecture and engineering, design, jewellery, fashion, media', 'கட்டடக்கலை–பொறியியல், வடிவமைப்பு, நகை, ஆடை அலங்காரம், ஊடகம்')),
  S(T('Vayu, the wind', 'வாயு தேவன்'), T('a young shoot swaying in the wind', 'காற்றில் அசையும் இளந்தளிர்'), 'D',
    T('Swathi natives are independent, flexible and diplomatic — like the wind, they find their own way.', 'சுவாதி நட்சத்திரக்காரர்கள் சுதந்திரமும் நெகிழ்வும் ராஜதந்திரமும் கொண்டவர்கள் — காற்றைப் போல் தம் வழியைத் தாமே கண்டடைபவர்கள்.'),
    T('adaptability, business sense, fairness and a gentle manner', 'சூழலுக்கேற்ப மாறும் தன்மை, வணிக அறிவு, நியாயம், மென்மையான பழக்கம்'),
    T('staying rooted and deciding firmly', 'நிலைத்து நிற்றல், உறுதியாக முடிவெடுத்தல்'),
    T('business and trade, law, travel, diplomacy, consulting', 'வணிகம், சட்டம், பயணம், ராஜதந்திரம், ஆலோசனை')),
  S(T('Indra and Agni together', 'இந்திரன்–அக்னி'), T('a decorated archway or a potter\'s wheel', 'தோரண வாயில் / குயவர் சக்கரம்'), 'R',
    T('Visakam natives are goal-driven and persistent — once they choose a target, they work steadily until they reach it.', 'விசாக நட்சத்திரக்காரர்கள் இலக்கை நோக்கி உழைப்பவர்கள்; ஒருமுறை இலக்கைத் தேர்ந்தெடுத்தால் அடையும் வரை சீராக முயல்பவர்கள்.'),
    T('ambition, focus, courage and the ability to inspire others', 'லட்சியம், கவனக் குவிப்பு, தைரியம், பிறரை ஊக்குவிக்கும் திறன்'),
    T('contentment with progress and patience with others\' slower pace', 'முன்னேற்றத்தில் மனநிறைவு, பிறரின் வேகத்தில் பொறுமை'),
    T('leadership roles, research, teaching, sales and marketing, politics', 'தலைமைப் பணிகள், ஆராய்ச்சி, கற்பித்தல், விற்பனை–சந்தைப்படுத்தல், அரசியல்')),
  S(T('Mitra, the lord of friendship', 'மித்ரன் (நட்பின் தேவன்)'), T('a lotus', 'தாமரை'), 'D',
    T('Anusham natives are devoted, friendly and able to build bonds that last, even far from home.', 'அனுஷ நட்சத்திரக்காரர்கள் பக்தியும் நட்புணர்வும் கொண்டவர்கள்; வீட்டை விட்டுத் தொலைவிலும் நீடித்த உறவுகளை உருவாக்குபவர்கள்.'),
    T('loyalty, teamwork, discipline and steady devotion', 'விசுவாசம், குழு உழைப்பு, ஒழுக்கம், நிலையான பக்தி'),
    T('expressing feelings openly and not carrying burdens alone', 'உணர்வுகளை வெளிப்படுத்துதல், சுமைகளைத் தனியே சுமக்காமை'),
    T('organisations and teams, overseas work, research, counselling, spiritual service', 'நிறுவன–குழுப் பணி, வெளிநாட்டுப் பணி, ஆராய்ச்சி, ஆலோசனை, ஆன்மீக சேவை')),
  S(T('Indra, king of the gods', 'இந்திரன் (தேவர்களின் அரசன்)'), T('an earring or umbrella (protection)', 'குண்டலம் / குடை (பாதுகாப்பு)'), 'R',
    T('Kettai natives are protective elders by nature — capable, responsible and quick to take charge.', 'கேட்டை நட்சத்திரக்காரர்கள் இயல்பாகவே பாதுகாக்கும் மூத்தவர் குணம் கொண்டவர்கள் — திறமையும் பொறுப்பும் கொண்டு விரைவாகப் பொறுப்பேற்பவர்கள்.'),
    T('courage, resourcefulness, protectiveness and practical wisdom', 'தைரியம், வளமான யோசனை, பாதுகாக்கும் குணம், நடைமுறை ஞானம்'),
    T('sharing control and trusting others with responsibility', 'அதிகாரத்தைப் பகிர்தல், பிறரிடமும் பொறுப்பை நம்பிக் கொடுத்தல்'),
    T('management, defence and security, administration, engineering, medicine', 'மேலாண்மை, பாதுகாப்புத் துறை, நிர்வாகம், பொறியியல், மருத்துவம்')),
  S(T('Nirriti, the goddess who clears away', 'நிருதி (வேரோடு களையும் தேவதை)'), T('a bunch of roots', 'வேர்க் கொத்து'), 'R',
    T('Moolam natives go to the root of things — they question, investigate and seek the deepest truth.', 'மூல நட்சத்திரக்காரர்கள் எதன் வேருக்கும் செல்பவர்கள் — கேள்வி கேட்டு, ஆராய்ந்து, ஆழமான உண்மையைத் தேடுபவர்கள்.'),
    T('research, honesty, courage and a philosophical mind', 'ஆராய்ச்சி, நேர்மை, தைரியம், தத்துவச் சிந்தனை'),
    T('building on what exists instead of uprooting it', 'இருப்பதை வேரோடு மாற்றாமல் அதன் மீது கட்டியெழுப்புதல்'),
    T('research and science, medicine and herbal knowledge, law, philosophy, investigation', 'ஆராய்ச்சி–அறிவியல், மருத்துவம்–மூலிகை அறிவு, சட்டம், தத்துவம், புலனாய்வு')),
  S(T('Apas, the waters', 'ஆபஸ் (நீர் தேவதை)'), T('an elephant tusk or a winnowing fan', 'யானைத் தந்தம் / முறம்'), 'M',
    T('Pooradam natives are confident and persuasive, with an invincible spirit that rarely accepts defeat.', 'பூராட நட்சத்திரக்காரர்கள் தன்னம்பிக்கையும் மனதை ஈர்க்கும் பேச்சும் கொண்டவர்கள்; தோல்வியை எளிதில் ஏற்காத மன வலிமை உடையவர்கள்.'),
    T('enthusiasm, persuasion, loyalty and the ability to renew themselves', 'உற்சாகம், பேச்சுத் திறன், விசுவாசம், தம்மைப் புதுப்பித்துக்கொள்ளும் திறன்'),
    T('listening to other views and choosing battles wisely', 'பிற கருத்துகளைக் கேட்டல், எதில் போராடுவது என்பதை அறிவுடன் தேர்தல்'),
    T('law, teaching, media and public speaking, travel, water-related work', 'சட்டம், கற்பித்தல், ஊடகம்–மேடைப்பேச்சு, பயணம், நீர் சார்ந்த பணிகள்')),
  S(T('the Vishvedevas, the universal gods', 'விஸ்வேதேவர்கள்'), T('an elephant tusk or the planks of a bed', 'யானைத் தந்தம் / கட்டில் பலகை'), 'M',
    T('Uthiradam natives are principled and patient, earning lasting respect through integrity.', 'உத்திராட நட்சத்திரக்காரர்கள் கொள்கைப் பிடிப்பும் பொறுமையும் கொண்டவர்கள்; நேர்மையால் நீடித்த மரியாதை பெறுபவர்கள்.'),
    T('integrity, responsibility, leadership and steady success', 'நேர்மை, பொறுப்புணர்வு, தலைமைப் பண்பு, சீரான வெற்றி'),
    T('flexibility and enjoying the journey, not only the goal', 'நெகிழ்வு, இலக்கை மட்டுமல்ல பயணத்தையும் ரசித்தல்'),
    T('government and administration, law, management, teaching, social causes', 'அரசு–நிர்வாகம், சட்டம், மேலாண்மை, கற்பித்தல், சமூகப் பணிகள்')),
  S(T('Lord Vishnu', 'திருமால் (விஷ்ணு)'), T('an ear, or three footprints', 'செவி / மூன்று காலடிகள்'), 'D',
    T('Thiruvonam natives are good listeners and lifelong learners — they gather knowledge and share it wisely.', 'திருவோண நட்சத்திரக்காரர்கள் நன்றாகக் கேட்பவர்கள், வாழ்நாள் முழுதும் கற்பவர்கள் — அறிவைச் சேர்த்து அறிவுடன் பகிர்பவர்கள்.'),
    T('listening, learning, devotion and a calm, organised manner', 'கேட்டல், கற்றல், பக்தி, அமைதியான ஒழுங்கான பழக்கம்'),
    T('speaking up for their own needs and avoiding over-sensitivity to criticism', 'தம் தேவைகளையும் பேசுதல், விமர்சனத்தால் அதிகம் பாதிக்கப்படாமை'),
    T('teaching, counselling, media and languages, travel, religious and cultural work', 'கற்பித்தல், ஆலோசனை, ஊடகம்–மொழிகள், பயணம், சமய–கலாச்சாரப் பணி')),
  S(T('the eight Vasus', 'அஷ்ட வசுக்கள்'), T('a drum (mridangam)', 'மிருதங்கம் / முரசு'), 'R',
    T('Avittam natives are energetic, rhythmic and ambitious, with a gift for music, timing and group work.', 'அவிட்ட நட்சத்திரக்காரர்கள் உற்சாகமும் தாள உணர்வும் லட்சியமும் கொண்டவர்கள்; இசை, சரியான நேரம், குழு உழைப்பில் திறமைசாலிகள்.'),
    T('drive, generosity, rhythm and the ability to gather resources', 'உந்துசக்தி, தாராளம், தாள உணர்வு, வளங்களைச் சேர்க்கும் திறன்'),
    T('patience at home and listening as much as leading', 'வீட்டில் பொறுமை, வழிநடத்துவது போலவே கேட்பதும்'),
    T('music and performing arts, sports, real estate, engineering, finance', 'இசை–நிகழ்கலை, விளையாட்டு, நில வணிகம், பொறியியல், நிதி')),
  S(T('Varuna, lord of the cosmic waters', 'வருணன் (நீர்க் கடவுள்)'), T('an empty circle — a hundred healers', 'வெற்று வட்டம் — நூறு மருத்துவர்கள்'), 'R',
    T('Sathayam natives are independent, analytical and secretive, with a talent for healing and solving hidden problems.', 'சதய நட்சத்திரக்காரர்கள் சுதந்திரமும் பகுப்பாய்வுத் திறனும் கொண்டவர்கள்; ரகசியம் காப்பவர்கள்; குணப்படுத்துதலிலும் மறைந்த சிக்கல்களைத் தீர்ப்பதிலும் திறமைசாலிகள்.'),
    T('analysis, healing ability, originality and honesty', 'பகுப்பாய்வு, குணப்படுத்தும் திறன், புதுமை, நேர்மை'),
    T('opening up to friends and avoiding isolation', 'நண்பர்களிடம் மனம் திறத்தல், தனிமையைத் தவிர்த்தல்'),
    T('medicine and healing, science and technology, research, astronomy, aviation', 'மருத்துவம்–சிகிச்சை, அறிவியல்–தொழில்நுட்பம், ஆராய்ச்சி, வானியல், விமானத் துறை')),
  S(T('Aja Ekapada, a fiery form of Shiva', 'அஜ ஏகபாதர் (சிவனின் ஒரு வடிவம்)'), T('a sword, or the front legs of a cot', 'வாள் / கட்டிலின் முன் கால்கள்'), 'M',
    T('Poorattathi natives are idealistic and intense, with deep convictions and a strong spiritual side.', 'பூரட்டாதி நட்சத்திரக்காரர்கள் லட்சியமும் தீவிரமும் கொண்டவர்கள்; ஆழ்ந்த நம்பிக்கைகளும் வலுவான ஆன்மீகப் பக்கமும் உடையவர்கள்.'),
    T('conviction, generosity, eloquence and spiritual depth', 'மன உறுதி, தாராளம், சொல்வன்மை, ஆன்மீக ஆழம்'),
    T('balance between ideals and daily practicalities', 'லட்சியத்திற்கும் அன்றாட நடைமுறைக்கும் இடையே சமநிலை'),
    T('philosophy and spirituality, research, writing, social reform, finance', 'தத்துவம்–ஆன்மீகம், ஆராய்ச்சி, எழுத்து, சமூக சீர்திருத்தம், நிதி')),
  S(T('Ahirbudhnya, the serpent of the depths', 'அஹிர்புத்னியன் (ஆழத்தின் நாகம்)'), T('the back legs of a cot, or twins', 'கட்டிலின் பின் கால்கள் / இரட்டையர்'), 'M',
    T('Uthirattathi natives are calm, wise and self-controlled — still waters that run deep.', 'உத்திரட்டாதி நட்சத்திரக்காரர்கள் அமைதியும் ஞானமும் சுயகட்டுப்பாடும் கொண்டவர்கள் — ஆழமான அமைதியான நீர் போன்றவர்கள்.'),
    T('patience, wisdom, kindness and the ability to stay steady in a crisis', 'பொறுமை, ஞானம், கனிவு, நெருக்கடியிலும் நிலைகுலையாமை'),
    T('acting in time rather than waiting too long', 'அதிகம் காத்திராமல் உரிய நேரத்தில் செயல்படுதல்'),
    T('counselling, research, charity and social service, teaching, administration', 'ஆலோசனை, ஆராய்ச்சி, தர்மம்–சமூக சேவை, கற்பித்தல், நிர்வாகம்')),
  S(T('Pushan, the protector of travellers', 'பூஷன் (பயணிகளைக் காக்கும் தேவன்)'), T('a fish, or a drum', 'மீன் / முரசு'), 'D',
    T('Revathi natives are gentle, generous and protective, guiding others safely on their way.', 'ரேவதி நட்சத்திரக்காரர்கள் மென்மையும் தாராளமும் பாதுகாக்கும் குணமும் கொண்டவர்கள்; பிறரைப் பாதுகாப்பாக வழிநடத்துபவர்கள்.'),
    T('compassion, creativity, faith and a nurturing nature', 'இரக்கம், படைப்பாற்றல், இறைநம்பிக்கை, பேணும் குணம்'),
    T('protecting their own energy and setting gentle limits', 'தம் ஆற்றலைக் காத்தல், மென்மையான எல்லைகளை வகுத்தல்'),
    T('teaching and guidance, arts, travel and transport, charity, care work', 'கற்பித்தல்–வழிகாட்டல், கலை, பயணம்–போக்குவரத்து, தர்மப் பணி, பராமரிப்புப் பணி')),
];

// ------------------------------------------------------------------ the 12 houses (kattams)
// theme: what the house governs (adult) · kid: the same house for a minor · guide: practical guidance · short: a label
const H = (short, theme, guide, kid = null, kidGuide = null) => ({ short, theme, guide, kid, kidGuide });
const HOUSES = [null,
  H(T('self', 'சுயம்'), T('The 1st house (Lagnam) shows the self — body, temperament, confidence and the way you meet the world.', '1-ம் வீடு (லக்னம்) உங்களையே காட்டுகிறது — உடல், இயல்பு, தன்னம்பிக்கை, உலகைச் சந்திக்கும் விதம்.'),
    T('Regular exercise, sleep and a calm morning routine keep this house bright.', 'தவறாத உடற்பயிற்சி, உறக்கம், அமைதியான காலை ஒழுங்கு இந்த வீட்டை ஒளிரச் செய்யும்.')),
  H(T('family and speech', 'குடும்பம், வாக்கு'), T('The 2nd house shows family, speech, food habits, savings and the values you hold.', '2-ம் வீடு குடும்பம், பேச்சு, உணவுப் பழக்கம், சேமிப்பு, நீங்கள் மதிக்கும் விழுமியங்களைக் காட்டுகிறது.'),
    T('Kind words at home and a simple monthly saving habit strengthen this house.', 'வீட்டில் இனிய சொற்களும் மாதந்தோறும் ஒரு சிறு சேமிப்புப் பழக்கமும் இந்த வீட்டை வலுப்படுத்தும்.'),
    T('The 2nd house shows family, speech, food habits and the values learned at home.', '2-ம் வீடு குடும்பம், பேச்சு, உணவுப் பழக்கம், வீட்டில் கற்கும் விழுமியங்களைக் காட்டுகிறது.'),
    T('Kind, truthful words and good food habits strengthen this house.', 'இனிய உண்மையான சொற்களும் நல்ல உணவுப் பழக்கமும் இந்த வீட்டை வலுப்படுத்தும்.')),
  H(T('courage and siblings', 'தைரியம், உடன்பிறப்பு'), T('The 3rd house shows courage, effort, siblings, short journeys, writing and communication skills.', '3-ம் வீடு தைரியம், முயற்சி, உடன்பிறப்புகள், குறுகிய பயணம், எழுத்து, தொடர்புத் திறனைக் காட்டுகிறது.'),
    T('Taking one brave step at a time and staying in touch with siblings strengthens this house.', 'ஒவ்வொரு துணிச்சலான அடியாக எடுத்து வைப்பதும் உடன்பிறப்புகளுடன் தொடர்பில் இருப்பதும் இந்த வீட்டை வலுப்படுத்தும்.')),
  H(T('home and mother', 'வீடு, தாய்'), T('The 4th house shows mother, home, vehicles, land, basic education and peace of mind.', '4-ம் வீடு தாய், வீடு, வாகனம், நிலம், அடிப்படைக் கல்வி, மன அமைதியைக் காட்டுகிறது.'),
    T('Time with mother, a tidy home and a quiet corner for prayer strengthen this house.', 'தாயுடன் நேரம் செலவிடுதல், ஒழுங்கான வீடு, வழிபாட்டுக்கு அமைதியான இடம் இந்த வீட்டை வலுப்படுத்தும்.')),
  H(T('intelligence and children', 'அறிவு, குழந்தைகள்'), T('The 5th house shows intelligence, creativity, children, devotion and the merit of past good deeds (poorva punyam).', '5-ம் வீடு அறிவு, படைப்பாற்றல், குழந்தைகள், பக்தி, பூர்வ புண்ணியத்தைக் காட்டுகிறது.'),
    T('Learning something new, creative hobbies and daily devotion strengthen this house.', 'புதியதைக் கற்றல், படைப்புப் பொழுதுபோக்குகள், தினசரி பக்தி இந்த வீட்டை வலுப்படுத்தும்.'),
    T('The 5th house shows intelligence, creativity, studies, devotion and the merit of past good deeds.', '5-ம் வீடு அறிவு, படைப்பாற்றல், கல்வி, பக்தி, பூர்வ புண்ணியத்தைக் காட்டுகிறது.'),
    T('Regular study, creative play and a short daily prayer strengthen this house.', 'தவறாத படிப்பு, படைப்பு விளையாட்டு, சிறு தினசரி பிரார்த்தனை இந்த வீட்டை வலுப்படுத்தும்.')),
  H(T('effort and service', 'முயற்சி, சேவை'), T('The 6th house shows daily work, service, competition, the ability to overcome obstacles, and routines that support wellbeing.', '6-ம் வீடு தினசரி உழைப்பு, சேவை, போட்டி, தடைகளை வெல்லும் திறன், நலம் காக்கும் ஒழுங்குமுறைகளைக் காட்டுகிறது.'),
    T('A steady routine, careful handling of loans and regular health check-ups support this house; see a doctor for any health concern.', 'சீரான ஒழுங்கு, கடன்களைக் கவனமாகக் கையாளுதல், தவறாத உடல் பரிசோதனை இந்த வீட்டுக்கு உதவும்; உடல்நலக் கவலைக்கு மருத்துவரை அணுகவும்.'),
    T('The 6th house shows daily effort, healthy habits, facing challenges and helping others.', '6-ம் வீடு தினசரி முயற்சி, ஆரோக்கியப் பழக்கங்கள், சவால்களை எதிர்கொள்ளுதல், பிறருக்கு உதவுதலைக் காட்டுகிறது.'),
    T('Good sleep, play and healthy food support this house; parents should see a doctor for any health concern.', 'நல்ல உறக்கம், விளையாட்டு, ஆரோக்கிய உணவு இந்த வீட்டுக்கு உதவும்; உடல்நலக் கவலைக்குப் பெற்றோர் மருத்துவரை அணுகவும்.')),
  H(T('partnership', 'கூட்டுறவு'), T('The 7th house shows marriage and life partnership, business partners, agreements and how you deal with the public.', '7-ம் வீடு திருமணம், வாழ்க்கைத் துணை, தொழில் கூட்டாளிகள், ஒப்பந்தங்கள், பொதுமக்களுடன் பழகும் விதத்தைக் காட்டுகிறது.'),
    T('Listening, respect and clear agreements strengthen this house — porutham is only one traditional input for any decision.', 'கேட்கும் பொறுமை, மரியாதை, தெளிவான உடன்படிக்கைகள் இந்த வீட்டை வலுப்படுத்தும் — எந்த முடிவுக்கும் பொருத்தம் ஒரு பாரம்பரியக் கருத்து மட்டுமே.'),
    T('The 7th house shows friendships, teamwork and how you get along with others.', '7-ம் வீடு நட்பு, குழு உழைப்பு, பிறருடன் இணைந்து பழகும் விதத்தைக் காட்டுகிறது.'),
    T('Sharing, taking turns and kind words with friends strengthen this house.', 'பகிர்தல், முறையாக விட்டுக்கொடுத்தல், நண்பர்களிடம் இனிய சொற்கள் இந்த வீட்டை வலுப்படுத்தும்.')),
  H(T('change and depth', 'மாற்றம், ஆழம்'), T('The 8th house shows change and transformation, research, hidden knowledge, inheritance and resilience.', '8-ம் வீடு மாற்றம், உருமாற்றம், ஆராய்ச்சி, மறைந்த அறிவு, பரம்பரைச் சொத்து, மீண்டு எழும் திறனைக் காட்டுகிறது.'),
    T('Insurance, careful documents and quiet spiritual practice support this house; it is a house of depth, not of fear.', 'காப்பீடு, கவனமான ஆவணங்கள், அமைதியான ஆன்மீகப் பயிற்சி இந்த வீட்டுக்கு உதவும்; இது ஆழத்தின் வீடு, அச்சத்தின் வீடு அல்ல.'),
    T('The 8th house shows curiosity about hidden things, research and inner strength.', '8-ம் வீடு மறைந்தவற்றின் மீதான ஆர்வம், ஆராய்ச்சி, உள்ளார்ந்த வலிமையைக் காட்டுகிறது.'),
    T('Puzzles, science projects and calm prayer support this house.', 'புதிர்கள், அறிவியல் செயல்திட்டங்கள், அமைதியான பிரார்த்தனை இந்த வீட்டுக்கு உதவும்.')),
  H(T('fortune and dharma', 'பாக்கியம், தர்மம்'), T('The 9th house shows fortune (bhagyam), father, teachers, higher learning, long journeys, pilgrimage and dharma.', '9-ம் வீடு பாக்கியம், தந்தை, ஆசிரியர்கள், உயர்கல்வி, நீண்ட பயணம், தீர்த்த யாத்திரை, தர்மத்தைக் காட்டுகிறது.'),
    T('Respecting father and teachers, giving in charity and visiting temples strengthen this house.', 'தந்தையையும் ஆசிரியர்களையும் மதித்தல், தானம் செய்தல், கோவில் தரிசனம் இந்த வீட்டை வலுப்படுத்தும்.')),
  H(T('work and status', 'தொழில், அந்தஸ்து'), T('The 10th house shows career, work, status, reputation and the actions (karma) you are known for.', '10-ம் வீடு தொழில், பணி, அந்தஸ்து, புகழ், நீங்கள் அறியப்படும் செயல்களை (கர்மம்) காட்டுகிறது.'),
    T('Skill-building, honesty at work and keeping commitments strengthen this house; career choices should also weigh skills, income and the market.', 'திறன் வளர்ப்பு, பணியில் நேர்மை, வாக்குறுதி காத்தல் இந்த வீட்டை வலுப்படுத்தும்; தொழில் முடிவுகளில் திறமை, வருமானம், சந்தை நிலையையும் எடைபோடவும்.'),
    T('The 10th house shows discipline, duties, achievements and the good name earned by effort.', '10-ம் வீடு ஒழுக்கம், கடமைகள், சாதனைகள், உழைப்பால் பெறும் நற்பெயரைக் காட்டுகிறது.'),
    T('Finishing homework and helping at home strengthen this house.', 'வீட்டுப்பாடத்தை முடித்தலும் வீட்டு வேலைகளில் உதவுதலும் இந்த வீட்டை வலுப்படுத்தும்.')),
  H(T('gains and friends', 'லாபம், நண்பர்கள்'), T('The 11th house shows gains and income, friends, networks, elder siblings and the fulfilment of wishes.', '11-ம் வீடு லாபம், வருமானம், நண்பர்கள், தொடர்புகள், மூத்த உடன்பிறப்புகள், ஆசைகள் நிறைவேறுதலைக் காட்டுகிறது.'),
    T('Good company, networking and planning finances with a qualified professional support this house — never invest based on a horoscope.', 'நல்ல சேர்க்கை, தொடர்புகளை வளர்த்தல், தகுதியான நிபுணருடன் நிதித் திட்டமிடல் இந்த வீட்டுக்கு உதவும் — ஜாதகத்தை வைத்து முதலீடு செய்ய வேண்டாம்.'),
    T('The 11th house shows friends, good company, elder siblings and hopes coming true.', '11-ம் வீடு நண்பர்கள், நல்ல சேர்க்கை, மூத்த உடன்பிறப்புகள், நம்பிக்கைகள் நிறைவேறுதலைக் காட்டுகிறது.'),
    T('Choosing kind friends and joining group activities strengthen this house.', 'நல்ல நண்பர்களைத் தேர்ந்தெடுத்தலும் குழுச் செயல்பாடுகளில் சேர்தலும் இந்த வீட்டை வலுப்படுத்தும்.')),
  H(T('expenses and moksha', 'விரயம், மோட்சம்'), T('The 12th house shows expenses, sleep, distant lands and foreign travel, charity, retreat and spiritual liberation (moksha).', '12-ம் வீடு செலவுகள், உறக்கம், தொலைதூர இடங்கள், வெளிநாட்டுப் பயணம், தானம், தனிமை, மோட்சத்தைக் காட்டுகிறது.'),
    T('A budget for spending, enough sleep, charity and meditation turn this house towards peace.', 'செலவுக்குத் திட்டம், போதுமான உறக்கம், தானம், தியானம் இந்த வீட்டை அமைதியின் பக்கம் திருப்பும்.')),
];
// Where the house lord sits: what that link traditionally means (by the house it occupies).
const LORD_AT = (k) => (
  [1, 4, 7, 10].includes(k) ? T('a kendra (angle) — tradition reads this as a visible, active placement where these matters show up in daily life', 'கேந்திரம் — இவை அன்றாட வாழ்வில் வெளிப்படும் செயல்மிக்க இடமாகப் பாரம்பரியம் கருதுகிறது')
    : [5, 9].includes(k) ? T('a trikona (trine) — counted by tradition as one of the most supportive placements', 'திரிகோணம் — மிகவும் ஆதரவான இடங்களில் ஒன்றாகப் பாரம்பரியம் கருதுகிறது')
      : [3, 11].includes(k) ? T('an upachaya house — results here tend to grow steadily with effort and time', 'உபசய ஸ்தானம் — இங்கு பலன்கள் முயற்சியாலும் காலத்தாலும் படிப்படியாக வளரும்')
        : k === 2 ? T('the house of family and resources — these matters link with family and savings', 'குடும்ப–தன ஸ்தானம் — இவை குடும்பத்துடனும் சேமிப்புடனும் இணைகின்றன')
          : T('a dusthana (6, 8 or 12) — tradition asks for patience here; results tend to come through effort, service or inner work rather than ease', 'துஸ்தானம் (6, 8, 12) — இங்கு பொறுமை தேவை எனப் பாரம்பரியம் சொல்கிறது; பலன்கள் எளிதாக அல்லாமல் முயற்சி, சேவை, உள்முகப் பணியின் வழியே வரும்')
);
// A planet in a house: what it brings to that house's matters.
const PLANET_IN = {
  Sun: T('Sun here brings authority, self-respect and visibility to these matters; keep pride gentle', 'இங்குள்ள சூரியன் இவ்விஷயங்களுக்கு அதிகாரம், சுயமரியாதை, வெளிச்சம் தருகிறார்; பெருமிதத்தை மென்மையாக வைக்கவும்'),
  Moon: T('Moon here brings feeling, care and public contact, with some natural ups and downs of mood', 'இங்குள்ள சந்திரன் உணர்வு, அக்கறை, மக்கள் தொடர்பைத் தருகிறார்; மனநிலையில் இயல்பான ஏற்ற இறக்கங்களும் இருக்கலாம்'),
  Mars: T('Mars here brings energy, courage and drive; patience keeps this energy from turning into quarrels', 'இங்குள்ள செவ்வாய் ஆற்றல், தைரியம், உந்துசக்தி தருகிறார்; பொறுமை இந்த ஆற்றல் சண்டையாக மாறாமல் காக்கும்'),
  Mercury: T('Mercury here brings intelligence, communication, humour and skill with numbers and trade', 'இங்குள்ள புதன் அறிவு, பேச்சுத் திறன், நகைச்சுவை, எண்–வணிகத் திறமையைத் தருகிறார்'),
  Jupiter: T('Jupiter here brings wisdom, protection and growth — tradition counts it as a blessing for this house', 'இங்குள்ள குரு ஞானம், பாதுகாப்பு, வளர்ச்சி தருகிறார் — இந்த வீட்டுக்கு இது ஒரு ஆசீர்வாதமாகப் பாரம்பரியம் கருதுகிறது'),
  Venus: T('Venus here brings comfort, beauty, art and pleasant relationships', 'இங்குள்ள சுக்கிரன் வசதி, அழகு, கலை, இனிய உறவுகளைத் தருகிறார்'),
  Saturn: T('Saturn here brings discipline and responsibility; results come slowly but tend to last', 'இங்குள்ள சனி ஒழுக்கமும் பொறுப்பும் தருகிறார்; பலன்கள் மெதுவாக வந்தாலும் நிலைத்து நிற்கும்'),
  Rahu: T('Rahu here brings ambition, unusual paths and links with distant places or new technology; staying grounded helps', 'இங்குள்ள ராகு லட்சியம், வழக்கத்துக்கு மாறான பாதைகள், தொலைதூர இடங்கள் அல்லது புதிய தொழில்நுட்பத் தொடர்பைத் தருகிறார்; நிதானம் உதவும்'),
  Ketu: T('Ketu here brings detachment, sharp insight and spiritual interest in these matters', 'இங்குள்ள கேது இவ்விஷயங்களில் பற்றின்மை, கூர்மையான உள்ளுணர்வு, ஆன்மீக ஆர்வத்தைத் தருகிறார்'),
};
// What each planet stands for (planet summary).
const KARAKA = {
  Sun: T('soul, confidence, father and authority', 'ஆத்மா, தன்னம்பிக்கை, தந்தை, அதிகாரம்'),
  Moon: T('mind, emotions, mother and public life', 'மனம், உணர்வுகள், தாய், பொது வாழ்க்கை'),
  Mars: T('energy, courage, land and siblings', 'ஆற்றல், தைரியம், நிலம், உடன்பிறப்பு'),
  Mercury: T('intellect, speech, learning and trade', 'அறிவு, பேச்சு, கல்வி, வணிகம்'),
  Jupiter: T('wisdom, teachers, children and dharma', 'ஞானம், குரு, குழந்தைகள், தர்மம்'),
  Venus: T('love, beauty, comforts and the arts', 'அன்பு, அழகு, வசதிகள், கலைகள்'),
  Saturn: T('discipline, work, patience and longevity of effort', 'ஒழுக்கம், உழைப்பு, பொறுமை, நீடித்த முயற்சி'),
  Rahu: T('ambition, the unusual and the foreign', 'லட்சியம், புதுமை, அயல்நாட்டுத் தொடர்பு'),
  Ketu: T('detachment, insight and spirituality', 'பற்றின்மை, உள்ளுணர்வு, ஆன்மீகம்'),
};
const KID_HOUSES = new Set([2, 5, 6, 7, 8, 10, 11]);

const strengthWord = (s) => (s >= 70 ? T('strong', 'வலுவானது') : s >= 50 ? T('steady', 'சீரானது') : T('in need of support', 'கூடுதல் ஆதரவு தேவை'));
// The natural significator (karaka) of each house.
const HOUSE_KARAKA = [null, 'Sun', 'Jupiter', 'Mars', 'Moon', 'Jupiter', 'Mars', 'Venus', 'Saturn', 'Jupiter', 'Sun', 'Jupiter', 'Saturn'];
const reasonLine = (g) => {
  const r = (g?.reasons || []).find((x) => /Exalted|Debilitated|own sign|Combust/i.test(x.en));
  if (!r) return null;
  if (/Exalted/.test(r.en)) return T('it is exalted (uchcham), which tradition reads as a source of strength', 'உச்சம் பெற்றுள்ளது — இதைப் பாரம்பரியம் வலிமையின் ஆதாரமாகக் கருதுகிறது');
  if (/own sign/i.test(r.en)) return T('it is in its own sign (aatchi), comfortable and effective', 'ஆட்சி பெற்றுள்ளது — இயல்பாகவும் செயல்திறனுடனும் இருக்கிறது');
  if (/Debilitated/.test(r.en)) return T('it is debilitated (neecham); tradition asks for steady effort and its parigaram here, and neecham can be cancelled by other factors', 'நீசம் பெற்றுள்ளது; இங்கு சீரான முயற்சியும் அதன் பரிகாரமும் உதவும் எனப் பாரம்பரியம் சொல்கிறது — பிற காரணிகளால் நீச பங்கமும் ஏற்படலாம்');
  return T('it is close to the Sun (combust), so its results tend to come with extra effort', 'சூரியனுக்கு அருகில் உள்ளது (அஸ்தங்கம்) — பலன்கள் கூடுதல் முயற்சியுடன் வரும்');
};

/**
 * The deep reading for one chart.
 * @param chart birthChart(...)
 * @param opts { profile: ageProfile(...) }
 * @returns { version, title, moonOnly, sections:[{ id, title, lines:[{en,ta}] , items?:[{ id, title, lines }] }], note }
 */
export function deepReading(chart, { profile = null } = {}) {
  const prof = profile || { adult: true, minor: false };
  const child = !(prof.adult || prof.organization);
  const P = chart.planets;
  const hasLagna = !!P.Lagna;
  const ref = hasLagna ? P.Lagna.rasi : P.Moon.rasi;
  const moonR = P.Moon.rasi;
  const star = chart.janmaNakshatra;
  const nak = NAKSHATRAS[star.index];
  const sg = STAR_GUNAM[star.index];
  const strength = Object.fromEntries(grahaStrength(P).map((g) => [g.planet, g]));
  const sections = [];

  // ---- 1. Gunam: Lagna and Rasi
  const guna = [];
  if (hasLagna) {
    const lg = P.Lagna.rasi;
    guna.push(T(`Your Lagna is ${RASIS[lg].en}, a ${ELEMENT[lg % 4].en.toLowerCase()} sign that is ${MODE[lg % 3].en}, ruled by ${RASIS[lg].lord}.`,
      `உங்கள் லக்னம் ${RASIS[lg].ta} — ${ELEMENT[lg % 4].ta} தத்துவம், ${MODE[lg % 3].ta} ராசி; அதிபதி ${pTa(RASIS[lg].lord)}.`));
    guna.push(LAGNA_NATURE[lg]);
    guna.push(ELEMENT_NATURE[lg % 4], MODE_NATURE[lg % 3]);
  } else {
    guna.push(T('Your birth time is not certain, so this reading of your nature is taken from the Moon sign and the birth star; the Lagna-based parts need the exact time.',
      'பிறந்த நேரம் உறுதியாக இல்லாததால், உங்கள் இயல்பு சந்திர ராசியிலிருந்தும் நட்சத்திரத்திலிருந்தும் படிக்கப்படுகிறது; லக்னம் சார்ந்த பகுதிகளுக்குச் சரியான நேரம் தேவை.'));
  }
  guna.push(T(`Your Moon sign (Rasi) is ${RASIS[moonR].en}, a ${ELEMENT[moonR % 4].en.toLowerCase()} sign. ${RASI_MIND[moonR].en}`,
    `உங்கள் ராசி ${RASIS[moonR].ta} — ${ELEMENT[moonR % 4].ta} தத்துவ ராசி. ${RASI_MIND[moonR].ta}`));
  if (hasLagna && P.Lagna.rasi !== moonR) {
    guna.push(T('Your Lagna shows how you act; your Rasi shows how you feel — together they describe the outer and the inner you.',
      'லக்னம் நீங்கள் செயல்படும் விதத்தையும் ராசி நீங்கள் உணரும் விதத்தையும் காட்டுகின்றன — இரண்டும் சேர்ந்து உங்கள் வெளி, உள் இயல்பை விளக்குகின்றன.'));
  } else if (hasLagna) {
    guna.push(T('Your Lagna and Rasi are the same sign, so your inner feelings and outer actions tend to match closely.',
      'லக்னமும் ராசியும் ஒரே ராசி என்பதால் உங்கள் உள் உணர்வும் வெளிச் செயலும் பெரும்பாலும் ஒன்றாக இருக்கும்.'));
  }
  const ll = RASIS[ref].lord, llg = strength[ll];
  guna.push(T(`${hasLagna ? 'Your Lagna lord' : 'Your Rasi lord'} ${ll} sits in the ${ORD(houseOf(ref, P[ll].rasi))} house and is ${strengthWord(llg?.score ?? 55).en} in the chart.`,
    `${hasLagna ? 'லக்னாதிபதி' : 'ராசியாதிபதி'} ${pTa(ll)} ${houseOf(ref, P[ll].rasi)}-ம் வீட்டில் இருக்கிறார்; ஜாதகத்தில் இவரது பலம்: ${strengthWord(llg?.score ?? 55).ta}.`));
  sections.push({ id: 'guna', title: T('Your nature (Gunam)', 'உங்கள் குணம்'), lines: guna });

  // ---- 2. Natchathira gunam
  const g = GANA[sg.gana];
  const starLines = [
    T(`You were born in ${nak.en} nakshatra, pada ${star.pada}. Its ruling planet is ${nak.lord}, and its presiding deity is ${sg.deity.en}.`,
      `நீங்கள் ${adjTa(nak.ta)} நட்சத்திரம், ${star.pada}-ம் பாதத்தில் பிறந்தவர். இதன் அதிபதி ${pTa(nak.lord)}; அதிதேவதை ${sg.deity.ta}.`),
    T(`Its symbol is ${sg.symbol.en}, and it belongs to ${g.en}.`, `இதன் சின்னம் ${sg.symbol.ta}; கணம்: ${g.ta}.`),
    GANA_NATURE[sg.gana],
    sg.nature,
    T(`Strengths tradition sees in this star: ${sg.strengths.en}.`, `இந்த நட்சத்திரத்தில் பாரம்பரியம் காணும் பலங்கள்: ${sg.strengths.ta}.`),
    T(`Areas to grow in: ${sg.growth.en}.`, `வளர்த்துக்கொள்ள வேண்டியவை: ${sg.growth.ta}.`),
    T(`Fields that tradition often links with this star: ${sg.fields.en} — your own skills and interests decide in the end.`,
      `இந்த நட்சத்திரத்துடன் பாரம்பரியம் இணைக்கும் துறைகள்: ${sg.fields.ta} — இறுதியில் உங்கள் திறமையும் ஆர்வமுமே முடிவு செய்யும்.`),
    T(`The star lord ${nak.lord} adds ${KARAKA[nak.lord].en} to your nature.`, `நட்சத்திர அதிபதி ${pTa(nak.lord)} உங்கள் இயல்பில் ${KARAKA[nak.lord].ta} சேர்க்கிறார்.`),
    T(`Pada ${star.pada} gives this star the colour of the ${RASIS[(star.index * 4 + star.pada - 1) % 12].en} navamsa.`,
      `${star.pada}-ம் பாதம் இந்த நட்சத்திரத்துக்கு ${RASIS[(star.index * 4 + star.pada - 1) % 12].ta} நவாம்சத்தின் சாயலைத் தருகிறது.`),
    T(`Worship of ${STAR_DEITY[star.index].en} is traditionally recommended for this star — a voluntary practice, best done with a calm mind.`,
      `இந்த நட்சத்திரத்துக்கு ${STAR_DEITY[star.index].ta} வழிபாடு பாரம்பரியமாகப் பரிந்துரைக்கப்படுகிறது — விருப்பமான பயிற்சி, அமைதியான மனத்துடன் செய்வது சிறப்பு.`),
  ];
  sections.push({ id: 'star', title: T('Your birth star (Natchathira gunam)', 'நட்சத்திரப் பலன் (நட்சத்திர குணம்)'), lines: starLines });

  // ---- 3. The 12 kattams
  const chartForHouses = hasLagna ? chart : { ...chart, planets: { ...P, Lagna: { ...P.Moon } } };
  const bhavas = bhavaAnalysis(chartForHouses);
  const items = bhavas.map((b) => {
    const h = b.house;
    const def = HOUSES[h];
    const kid = child && KID_HOUSES.has(h);
    const lines = [];
    lines.push(kid && def.kid ? def.kid : def.theme);
    lines.push(T(`This house falls in ${RASIS[b.rasi].en}, so you tend to handle these matters ${STYLE[b.rasi % 4].en}.`,
      `இந்த வீடு ${adjTa(RASIS[b.rasi].ta)} ராசியில் அமைந்துள்ளதால் இவ்விஷயங்களை நீங்கள் ${STYLE[b.rasi % 4].ta} கையாள்வீர்கள்.`));
    const lat = LORD_AT(b.lordHouse);
    lines.push(T(`Its lord ${b.lord} sits in the ${ORD(b.lordHouse)} house (${HOUSES[b.lordHouse].short.en}) — ${lat.en}.`,
      `இதன் அதிபதி ${pTa(b.lord)} ${b.lordHouse}-ம் வீட்டில் (${HOUSES[b.lordHouse].short.ta}) இருக்கிறார் — ${lat.ta}.`));
    const sl = strength[b.lord];
    const rl = reasonLine(sl);
    lines.push(rl ? T(`The lord is ${strengthWord(sl.score).en} here: ${rl.en}.`, `அதிபதியின் பலம்: ${strengthWord(sl.score).ta} — ${rl.ta}.`)
      : T(`The lord's strength in your chart is ${strengthWord(sl?.score ?? 55).en}.`, `உங்கள் ஜாதகத்தில் அதிபதியின் பலம்: ${strengthWord(sl?.score ?? 55).ta}.`));
    const kk = HOUSE_KARAKA[h], ks = strength[kk];
    lines.push(T(`The natural significator (karaka) of this house is ${kk} (${KARAKA[kk].en}), which is ${strengthWord(ks?.score ?? 55).en} in your chart.`,
      `இந்த வீட்டின் இயற்கைக் காரகர் ${pTa(kk)} (${KARAKA[kk].ta}); உங்கள் ஜாதகத்தில் இவரது பலம்: ${strengthWord(ks?.score ?? 55).ta}.`));
    if (b.occupants.length) for (const o of b.occupants.slice(0, 3)) lines.push(T(`${PLANET_IN[o].en}.`, `${PLANET_IN[o].ta}.`));
    else lines.push(T(`No planet sits in this house, so it is read mainly through its lord ${b.lord} and the aspects on it.`, `இந்த வீட்டில் கிரகம் இல்லை; எனவே அதிபதி ${pTa(b.lord)} மற்றும் பார்வைகளின் வழியே படிக்கப்படுகிறது.`));
    const asp = b.aspects.filter((a) => !b.occupants.includes(a));
    if (asp.includes('Jupiter')) lines.push(T('Jupiter\'s aspect (Guru parvai) falls here — tradition counts it as a protective blessing.', 'குருவின் பார்வை இங்கு விழுகிறது — இதைப் பாதுகாக்கும் ஆசீர்வாதமாகப் பாரம்பரியம் கருதுகிறது.'));
    if (asp.includes('Saturn')) lines.push(T('Saturn\'s aspect asks for patience and steady effort in these matters.', 'சனியின் பார்வை இவ்விஷயங்களில் பொறுமையையும் சீரான முயற்சியையும் கேட்கிறது.'));
    if (asp.includes('Mars')) lines.push(T('Mars\'s aspect adds energy and urgency — calm planning balances it.', 'செவ்வாயின் பார்வை ஆற்றலையும் வேகத்தையும் சேர்க்கிறது — நிதானமான திட்டமிடல் அதைச் சமன் செய்யும்.'));
    const others = asp.filter((a) => !['Jupiter', 'Saturn', 'Mars'].includes(a));
    if (others.length) lines.push(T(`Also aspected by ${others.join(', ')}.`, `${others.map(pTa).join(', ')} பார்வையும் உண்டு.`));
    lines.push(b.score >= 66 ? T('Overall, tradition reads this kattam as one of the stronger parts of your chart.', 'மொத்தத்தில், இந்தக் கட்டம் உங்கள் ஜாதகத்தின் வலுவான பகுதிகளில் ஒன்றாகப் பாரம்பரியம் படிக்கிறது.')
      : b.score >= 48 ? T('Overall, this kattam is steady — effort brings results here.', 'மொத்தத்தில், இந்தக் கட்டம் சீரானது — முயற்சிக்கு இங்கு பலன் உண்டு.')
        : T('Overall, tradition asks for extra care and patience in this kattam; it shows where effort matters most, not a fixed outcome.', 'மொத்தத்தில், இந்தக் கட்டத்தில் கூடுதல் கவனமும் பொறுமையும் தேவை எனப் பாரம்பரியம் சொல்கிறது; இது முயற்சி அதிகம் தேவைப்படும் இடத்தைக் காட்டுகிறது, நிலையான முடிவை அல்ல.'));
    lines.push(kid && def.kidGuide ? def.kidGuide : def.guide);
    lines.push(T(`A free, voluntary practice for its lord ${b.lord}: ${NAVAGRAHA[b.lord].free.en}`, `அதிபதி ${pTa(b.lord)}க்கான இலவச, விருப்பப் பயிற்சி: ${NAVAGRAHA[b.lord].free.ta}`));
    const title = T(`${h}. ${HOUSES[h].short.en[0].toUpperCase()}${HOUSES[h].short.en.slice(1)} · ${RASIS[b.rasi].en}`, `${h}-ம் கட்டம் · ${HOUSES[h].short.ta} · ${RASIS[b.rasi].ta}`);
    return { id: `h${h}`, house: h, score: b.score, title, lines };
  });
  sections.push({
    id: 'houses',
    title: T(hasLagna ? 'The 12 kattams (houses)' : 'The 12 kattams, counted from your Moon sign', hasLagna ? '12 கட்டங்கள் (பாவங்கள்)' : '12 கட்டங்கள் — சந்திர ராசியிலிருந்து'),
    lines: [hasLagna ? T('Each kattam is read from the sign on it, its lord, the planets in it and the aspects on it.', 'ஒவ்வொரு கட்டமும் அதன் ராசி, அதிபதி, அதிலுள்ள கிரகங்கள், அதன் மீதான பார்வைகளிலிருந்து படிக்கப்படுகிறது.')
      : T('Without an exact birth time, the houses are counted from the Moon sign (Chandra lagna), the traditional fallback.', 'சரியான பிறந்த நேரம் இல்லாததால், பாரம்பரிய முறைப்படி வீடுகள் சந்திர ராசியிலிருந்து (சந்திர லக்னம்) கணக்கிடப்படுகின்றன.')],
    items,
  });

  // ---- 4. The nine planets
  const planets = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'].map((k) => {
    const p = P[k], hs = houseOf(ref, p.rasi), st = strength[k], rl = reasonLine(st);
    return T(`${k} (${KARAKA[k].en}) is in ${RASIS[p.rasi].en}, ${ORD(hs)} house${p.retrograde && !['Rahu', 'Ketu'].includes(k) ? ', retrograde (vakram)' : ''} — ${strengthWord(st?.score ?? 55).en}${rl ? `; ${rl.en}` : ''}.`,
      `${pTa(k)} (${KARAKA[k].ta}) ${adjTa(RASIS[p.rasi].ta)} ராசியில், ${hs}-ம் வீட்டில்${p.retrograde && !['Rahu', 'Ketu'].includes(k) ? ', வக்கிரம்' : ''} — ${strengthWord(st?.score ?? 55).ta}${rl ? `; ${rl.ta}` : ''}.`);
  });
  sections.push({ id: 'planets', title: T('The nine planets (Navagraha)', 'நவகிரக நிலை'), lines: planets });

  return {
    version: DEEP_VERSION,
    title: T('Detailed Jathagam reading', 'ஜாதக விரிவான விளக்கம்'),
    moonOnly: !hasLagna,
    sections,
    note: T('This is a traditional interpretation for reflection, not a fixed prediction. Birth-time accuracy and real-life circumstances can change any reading; for health, money or legal decisions, consult a qualified professional.',
      'இது சிந்தனைக்கான பாரம்பரிய விளக்கம், உறுதியான கணிப்பு அல்ல. பிறந்த நேரத் துல்லியமும் வாழ்க்கைச் சூழலும் எந்த விளக்கத்தையும் மாற்றலாம்; உடல்நலம், பணம், சட்டம் தொடர்பான முடிவுகளுக்குத் தகுதியான நிபுணரை அணுகவும்.'),
  };
}

/** Plain text of a reading in one language (read aloud / share). */
export function deepReadingText(r, lang = 'en') {
  const k = lang === 'ta' ? 'ta' : 'en';
  const out = [r.title[k]];
  for (const s of r.sections) {
    out.push('', s.title[k], ...s.lines.map((l) => l[k]));
    for (const it of s.items || []) out.push('', it.title[k], ...it.lines.map((l) => l[k]));
  }
  out.push('', r.note[k]);
  return out.join('\n');
}
