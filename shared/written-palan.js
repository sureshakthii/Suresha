// Written palan (எழுத்துப் பலன்): a plain-language reading of one chart — who you are, what runs now, what
// comes next, and each life area with years — generated on the device from the chart data alone (no AI call,
// works offline, same chart → same words). Written the way a careful jothidar writes a palan: confident and warm,
// but every line is a traditional tendency, never a certainty, a verdict or a fear statement. No diet, disease,
// treatment or lifespan statements are made from dasa or houses; wellbeing is only a general routine line.
//
// Age first: a minor (or an unknown age) gets only nature, study, habits and spiritual lines (the same
// topicAllowed / adultText filters the analysis screen uses). Unknown birth time: a Moon-based reading only
// (houses counted from the Moon sign) and one line saying the Lagna-based parts need the birth time.
// Pure module — shared by the browser and Node tests.
import { RASIS, NAKSHATRAS, PLANETS } from './astro.js';
import { grahaStrength } from './remedies.js';
import { transitStatus, dasaTone } from './analysis.js';
import { runningDasa } from './daily.js';
import { REPORT_YEARS, horizonEnd, horizonLabel, HORIZON_LINES } from './report-horizon.js';
import { topicAllowed, adultText } from './age-guard.js';

const T = (en, ta) => ({ en, ta });
const MONTHS_TA = ['ஜனவரி', 'பிப்ரவரி', 'மார்ச்', 'ஏப்ரல்', 'மே', 'ஜூன்', 'ஜூலை', 'ஆகஸ்ட்', 'செப்டம்பர்', 'அக்டோபர்', 'நவம்பர்', 'டிசம்பர்'];
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DUSTHANA = [6, 8, 12];
const ord = (n) => `${n}${n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th'}`;
const houseOf = (ref, rasi) => ((rasi - ref + 12) % 12) + 1;
const lordOf = (ref, h) => RASIS[(ref + h - 1) % 12].lord;
const pEn = (k) => k;
const pTa = (k) => PLANETS[k]?.ta || k;
/** Planet name before தசை / புக்தி: சூரிய தசை, சந்திர தசை, சுக்கிர புக்தி (others unchanged). */
const pAdj = (k) => ({ Sun: 'சூரிய', Moon: 'சந்திர', Venus: 'சுக்கிர' }[k] || pTa(k));
/** "மேஷம்" → "மேஷ" (adjective form before லக்னம் / ராசி). */
const adjTa = (s) => (s.endsWith('ம்') ? s.slice(0, -2) : s);
const listEn = (a) => (a.length <= 1 ? a.join('') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`);
const listTa = (a) => a.join(', ');
/** Join two Tamil words with the doubled hard consonant (வல்லினம் மிகுதல்) after -க்கு / -ஐ / -ஆக: "வளர்ச்சிக்குச் சீரான". */
const sandhi = (a, b) => {
  const m = /^([கசதப])(?!்)/.exec(b);
  return m && /(க்கு|ை|ாக)$/.test(a) ? `${a}${m[1]}் ${b}` : `${a} ${b}`;
};

// ------------------------------------------------------------------ text tables
const SIGN = [
  { act: T('bold and quick to act — a natural starter', 'துணிச்சலும் வேகமும் கொண்டவர்; எதையும் முன்னின்று தொடங்குபவர்'), mind: T('energetic and direct', 'உற்சாகமும் நேர்மையும் நிறைந்தது') },
  { act: T('steady and patient, with a liking for comfort and beauty', 'நிதானமும் பொறுமையும் கொண்டவர்; அழகையும் வசதியையும் விரும்புபவர்'), mind: T('calm and loyal', 'அமைதியும் விசுவாசமும் கொண்டது') },
  { act: T('curious and quick with words and ideas', 'ஆர்வமும் பேச்சுத் திறமையும் கொண்டவர்; புதிய யோசனைகளில் வல்லவர்'), mind: T('lively and adaptable', 'சுறுசுறுப்பானது; எதற்கும் ஏற்ப மாறக்கூடியது') },
  { act: T('caring and family-minded, quick to sense what others feel', 'அக்கறையும் குடும்பப் பற்றும் கொண்டவர்; பிறர் உணர்வைப் புரிந்துகொள்பவர்'), mind: T('tender and protective', 'மென்மையும் பாதுகாக்கும் குணமும் கொண்டது') },
  { act: T('dignified and generous — a natural leader', 'கம்பீரமும் தாராள குணமும் கொண்டவர்; இயல்பான தலைமைப் பண்பு உள்ளவர்'), mind: T('proud and warm-hearted', 'சுயமரியாதையும் அன்பும் நிறைந்தது') },
  { act: T('careful and practical, with an eye for detail', 'கவனமும் நடைமுறை அறிவும் கொண்டவர்; நுணுக்கமாக வேலை செய்பவர்'), mind: T('thoughtful and helpful', 'சிந்தனையும் உதவும் குணமும் கொண்டது') },
  { act: T('balanced and fair, and good with people', 'சமநிலையும் நியாய உணர்வும் கொண்டவர்; மக்களுடன் இணக்கமாகப் பழகுபவர்'), mind: T('graceful and diplomatic', 'நளினமும் சமரசப் பண்பும் கொண்டது') },
  { act: T('determined and deep, finishing what you start', 'உறுதியும் ஆழ்ந்த சிந்தனையும் கொண்டவர்; எடுத்ததை முடிக்கும் மன வலிமை உள்ளவர்'), mind: T('intense and loyal', 'ஆழமான உணர்வும் விசுவாசமும் கொண்டது') },
  { act: T('honest and optimistic, guided by dharma', 'நேர்மையும் நம்பிக்கையும் கொண்டவர்; தர்மத்தை மதிப்பவர்'), mind: T('open and generous', 'திறந்ததும் தாராளமானதும்') },
  { act: T('disciplined, hard-working and responsible', 'ஒழுக்கமும் கடின உழைப்பும் பொறுப்புணர்வும் கொண்டவர்'), mind: T('practical and patient', 'நடைமுறையும் பொறுமையும் கொண்டது') },
  { act: T('an independent thinker with a wish to serve', 'சுதந்திரச் சிந்தனையும் சேவை மனப்பான்மையும் கொண்டவர்'), mind: T('friendly and idealistic', 'நட்பும் உயர்ந்த லட்சியமும் கொண்டது') },
  { act: T('kind, intuitive and devoted', 'இரக்கமும் உள்ளுணர்வும் இறை பக்தியும் கொண்டவர்'), mind: T('gentle and imaginative', 'மென்மையும் கற்பனை வளமும் கொண்டது') },
];
const GIFT = {
  Sun: T('self-respect and leadership', 'சுயமரியாதையும் தலைமைப் பண்பும்'), Moon: T('kindness and imagination', 'கனிவும் கற்பனை வளமும்'),
  Mars: T('energy and courage', 'உற்சாகமும் தைரியமும்'), Mercury: T('a sharp mind and good speech', 'அறிவுக் கூர்மையும் பேச்சுத் திறனும்'),
  Jupiter: T('wisdom and good values', 'ஞானமும் நல்லொழுக்கமும்'), Venus: T('grace and artistic taste', 'நளினமும் கலை ரசனையும்'),
  Saturn: T('patience and perseverance', 'பொறுமையும் விடாமுயற்சியும்'), Rahu: T('drive and fresh thinking', 'வேகமும் புதுமைச் சிந்தனையும்'),
  Ketu: T('insight and a spiritual bent', 'உள்ளுணர்வும் ஆன்மீக நாட்டமும்'),
};
// Lagna lord placed in house n (kid: wording for a minor where the adult line talks about money / work / partners).
const LAGNA_LORD_IN = [null,
  { a: T('you shape your life through your own effort', 'உங்கள் வாழ்க்கையை உங்கள் சொந்த முயற்சியால் வடிவமைப்பவர் நீங்கள்') },
  { a: T('family, savings and a good word matter much to you', 'குடும்பம், சேமிப்பு, நல்ல வாக்கு — இவை உங்களுக்கு மிக முக்கியம்'), kid: T('family and kind words matter much to you', 'குடும்பமும் இனிய சொல்லும் உங்களுக்கு மிக முக்கியம்') },
  { a: T('courage and your own initiative take you forward', 'தைரியமும் சுய முயற்சியும் உங்களை முன்னேற்றும்') },
  { a: T('home, mother and peace of mind are your anchor', 'வீடு, தாய், மன அமைதி — இவையே உங்கள் பலம்') },
  { a: T('intelligence and creativity are your strength', 'அறிவும் படைப்பாற்றலும் உங்கள் பலம்') },
  { a: T('you grow by facing competition and serving others', 'போட்டியைச் சந்தித்தும் பிறருக்குச் சேவை செய்தும் வளர்பவர் நீங்கள்'), kid: T('you grow by facing challenges and helping others', 'சவால்களைச் சந்தித்தும் பிறருக்கு உதவியும் வளர்பவர் நீங்கள்') },
  { a: T('partnerships and dealing with people shape your path', 'கூட்டு முயற்சியும் மக்கள் தொடர்பும் உங்கள் பாதையை வடிவமைக்கின்றன'), kid: T('you learn and grow best with friends and teamwork', 'நண்பர்களுடனும் குழுவாகவும் சேர்ந்து நன்றாகக் கற்பவர் நீங்கள்') },
  { a: T('you have depth, a research mind and the strength to bounce back', 'ஆழ்ந்த சிந்தனையும் ஆராய்ச்சி மனமும், சரிவிலிருந்து மீண்டு எழும் வலிமையும் உங்களுக்கு உண்டு') },
  { a: T('fortune, dharma and the blessings of elders guide you', 'பாக்கியமும் தர்மமும் பெரியோர் ஆசியும் உங்களை வழிநடத்துகின்றன') },
  { a: T('work and duty are central — you are known by what you do', 'தொழிலும் கடமையும் உங்கள் வாழ்வின் மையம்; உழைப்பால் பெயர் பெறுபவர் நீங்கள்'), kid: T('duty and discipline come naturally to you', 'கடமையும் ஒழுக்கமும் உங்களுக்கு இயல்பாக வரும்') },
  { a: T('friends, networks and steady gains support you', 'நண்பர்கள், தொடர்புகள், தொடர் லாபம் உங்களுக்குத் துணை'), kid: T('friends and good company help you grow', 'நண்பர்களும் நல்ல சேர்க்கையும் உங்கள் வளர்ச்சிக்குத் துணை') },
  { a: T('travel, distant places and a giving, spiritual nature mark you', 'பயணம், தொலைதூரத் தொடர்பு, கொடுக்கும் குணம், ஆன்மீக நாட்டம் — இவை உங்கள் அடையாளம்') },
];
// What a planet's period traditionally brings forward (adult / child wording).
const PERIOD = {
  Sun: { a: T('authority, recognition, father and links with government', 'அதிகாரம், அங்கீகாரம், தந்தை, அரசுத் தொடர்பு'), kid: T('confidence and respect for elders', 'தன்னம்பிக்கை, பெரியோரை மதித்தல்') },
  Moon: { a: T('the mind, mother, travel and public contact', 'மனம், தாய், பயணம், மக்கள் தொடர்பு'), kid: T('feelings, a mother\'s care and imagination', 'உணர்வுகள், தாயின் அரவணைப்பு, கற்பனை') },
  Mars: { a: T('energy, land and home, siblings and bold action', 'ஆற்றல், நிலம்-வீடு, உடன்பிறப்பு, துணிச்சலான செயல்'), kid: T('energy, sports and courage', 'ஆற்றல், விளையாட்டு, தைரியம்') },
  Mercury: { a: T('learning, communication, trade and skills', 'கல்வி, தொடர்புத் திறன், வணிகம், திறமை'), kid: T('reading, maths, language and speech', 'வாசிப்பு, கணக்கு, மொழி, பேச்சுத் திறன்') },
  Jupiter: { a: T('wisdom, children, wealth and dharma', 'ஞானம், பிள்ளைகள், செல்வம், தர்மம்'), kid: T('good values and lessons from teachers', 'நல்லொழுக்கம், ஆசிரியர்களிடம் கற்றல்') },
  Venus: { a: T('comforts, family life, the arts and vehicles', 'வசதி, குடும்ப வாழ்க்கை, கலை, வாகனம்'), kid: T('music, art and friendships', 'இசை, கலை, நட்பு') },
  Saturn: { a: T('hard work, discipline, service and long-term results', 'கடின உழைப்பு, ஒழுக்கம், சேவை, நீண்டகாலப் பலன்'), kid: T('routine, patience and discipline', 'ஒழுங்கு, பொறுமை, கட்டுப்பாடு') },
  Rahu: { a: T('ambition, new ventures and foreign links', 'லட்சியம், புதிய முயற்சி, வெளிநாட்டுத் தொடர்பு'), kid: T('curiosity and new interests', 'ஆர்வம், புதிய விருப்பங்கள்') },
  Ketu: { a: T('inner growth, spiritual pursuits and research', 'உள் வளர்ச்சி, ஆன்மீகம், ஆராய்ச்சி'), kid: T('concentration, prayer and quiet focus', 'மன ஒருமைப்பாடு, வழிபாடு, அமைதியான கவனம்') },
};
const HOUSE = [null,
  T('self & wellbeing', 'சுயம் & உடல்நலம்'), T('family & savings', 'குடும்பம் & சேமிப்பு'), T('courage & efforts', 'தைரியம் & முயற்சி'),
  T('home, mother & vehicles', 'வீடு, தாய் & வாகனம்'), T('children & intelligence', 'பிள்ளைகள் & அறிவு'), T('competition & service', 'போட்டி & சேவை'),
  T('spouse & partnerships', 'வாழ்க்கைத் துணை & கூட்டு'), T('sudden changes & research', 'திடீர் மாற்றம் & ஆராய்ச்சி'), T('fortune & father', 'பாக்கியம் & தந்தை'),
  T('career & status', 'தொழில் & அந்தஸ்து'), T('gains & friends', 'லாபம் & நண்பர்கள்'), T('expenses, travel & spiritual life', 'செலவு, பயணம் & ஆன்மீகம்'),
];
// Bhava one-liners: what the house gives (subject) and what it works through (via).
const SUBJ = [null, T('self-confidence', 'தன்னம்பிக்கை'), T('savings', 'சேமிப்பு'), T('your efforts', 'முயற்சி'), T('comfort at home', 'வீட்டு சுகம்'),
  T('intelligence', 'அறிவுத் திறன்'), null, T('partnerships', 'கூட்டு உறவுகள்'), null, T('fortune', 'பாக்கியம்'), T('career standing', 'தொழில் நிலை'), T('income', 'வருமானம்'), null];
const VIA = [null, T('your own effort', 'சொந்த முயற்சி'), T('family and speech', 'குடும்பம், வாக்கு'), T('courage and contacts', 'தைரியம், தொடர்புகள்'),
  T('home and mother', 'வீடு, தாய்'), T('intelligence and creativity', 'அறிவு, படைப்பாற்றல்'), T('service and competition', 'சேவை, போட்டி'),
  T('partners and public dealings', 'கூட்டு, பொதுத் தொடர்பு'), T('research and change', 'ஆராய்ச்சி, மாற்றம்'), T('fortune and elders', 'பாக்கியம், பெரியோர்'),
  T('work and status', 'தொழில், பணி'), T('income and friends', 'வருமானம், நண்பர்கள்'), T('travel and distant places', 'பயணம், தொலைதூரத் தொடர்பு')];

const SATURN = [null,
  T('Saturn is crossing your Moon sign (Janma Sani, the middle phase of Ezharai Sani): a time of hard work that builds maturity — keep your routine steady and avoid shortcuts.', 'சனி உங்கள் ராசியிலேயே சஞ்சரிக்கிறார் (ஜென்மச் சனி — ஏழரைச் சனியின் நடுப்பகுதி): உழைப்பால் முதிர்ச்சி தரும் காலம்; அன்றாட ஒழுங்கைச் சீராக வைத்து, குறுக்கு வழிகளைத் தவிர்க்கவும்.'),
  T('Saturn is 2nd from your Moon (Paadha Sani, the last phase of Ezharai Sani): mind your words and spending — relief grows step by step.', 'சனி உங்கள் ராசிக்கு 2-ல் (பாதச் சனி — ஏழரைச் சனியின் கடைசிப் பகுதி): பேச்சிலும் செலவிலும் கவனம்; நிம்மதி படிப்படியாகக் கூடும்.'),
  T('Saturn is 3rd from your Moon: a rewarding stretch in which steady effort pays.', 'சனி உங்கள் ராசிக்கு 3-ல்: முயற்சிகளுக்குப் பலன் தரும் நல்ல காலம்.'),
  T('Saturn is 4th from your Moon (Ardhashtama Sani): give time to home matters and keep peace at home.', 'சனி உங்கள் ராசிக்கு 4-ல் (அர்த்தாஷ்டமச் சனி): வீட்டு விஷயங்களுக்கு நேரம் ஒதுக்கி, குடும்ப அமைதியைப் பேணுங்கள்.'),
  T('Saturn is 5th from your Moon: think twice before big decisions and move with patience.', 'சனி உங்கள் ராசிக்கு 5-ல்: பெரிய முடிவுகளுக்கு முன் இருமுறை யோசித்து, நிதானமாகச் செயல்படுங்கள்.'),
  T('Saturn is 6th from your Moon: a good time to overcome competition — hard work is rewarded.', 'சனி உங்கள் ராசிக்கு 6-ல்: போட்டிகளைச் சமாளிக்கும், உழைப்புக்குப் பலன் தரும் காலம்.'),
  T('Saturn is 7th from your Moon: partnerships need patience and clear talk.', 'சனி உங்கள் ராசிக்கு 7-ல்: கூட்டு, உறவுகளில் பொறுமையும் தெளிவான பேச்சும் தேவை.'),
  T('Saturn is 8th from your Moon (Ashtama Sani): go slow on big risks and lending — patience and service see you through.', 'சனி உங்கள் ராசிக்கு 8-ல் (அஷ்டமச் சனி): பெரிய அபாயங்களிலும் கடன் கொடுப்பதிலும் நிதானம்; பொறுமையும் சேவையும் துணை நிற்கும்.'),
  T('Saturn is 9th from your Moon: the guidance of elders and the path of dharma help you.', 'சனி உங்கள் ராசிக்கு 9-ல்: பெரியோர் ஆலோசனையும் தர்ம வழியும் உங்களுக்குத் துணை.'),
  T('Saturn is 10th from your Moon: responsibilities grow at work; steady effort earns recognition.', 'சனி உங்கள் ராசிக்கு 10-ல்: பணியில் பொறுப்புகள் கூடும்; தொடர் உழைப்பு அங்கீகாரம் தரும்.'),
  T('Saturn is 11th from your Moon: a good stretch for gains and steady progress.', 'சனி உங்கள் ராசிக்கு 11-ல்: லாபமும் நிலையான முன்னேற்றமும் தரும் நல்ல காலம்.'),
  T('Saturn is 12th from your Moon (Viraya Sani, the first phase of Ezharai Sani): plan your expenses and take enough rest.', 'சனி உங்கள் ராசிக்கு 12-ல் (விரயச் சனி — ஏழரைச் சனியின் முதல் பகுதி): செலவுகளைத் திட்டமிட்டு, போதுமான ஓய்வு எடுங்கள்.'),
];
const JUPITER = [null,
  T('Jupiter is on your Moon sign: a time for study and inner growth — move steadily.', 'குரு உங்கள் ராசியில்: கற்றலுக்கும் உள் வளர்ச்சிக்கும் உரிய காலம்; நிதானமாக முன்னேறுங்கள்.'),
  T('Jupiter is 2nd from your Moon (Guru Balam): it supports family happiness, savings and a good word.', 'குரு உங்கள் ராசிக்கு 2-ல் (குரு பலம்): குடும்ப மகிழ்ச்சி, சேமிப்பு, இனிய வாக்குக்கு ஆதரவு.'),
  T('Jupiter is 3rd from your Moon: efforts need patience; good company helps.', 'குரு உங்கள் ராசிக்கு 3-ல்: முயற்சிகளில் பொறுமை தேவை; நல்லோர் சேர்க்கை துணை.'),
  T('Jupiter is 4th from your Moon: give attention to home and mother; prayer brings peace of mind.', 'குரு உங்கள் ராசிக்கு 4-ல்: வீடு, தாய் நலனில் கவனம்; வழிபாடு மன அமைதி தரும்.'),
  T('Jupiter is 5th from your Moon (Guru Balam): it supports children\'s matters, intelligence and sound decisions.', 'குரு உங்கள் ராசிக்கு 5-ல் (குரு பலம்): பிள்ளைகள் நலன், அறிவு, நல்ல முடிவுகளுக்கு ஆதரவு.'),
  T('Jupiter is 6th from your Moon: steady work clears obstacles; avoid taking new loans.', 'குரு உங்கள் ராசிக்கு 6-ல்: தொடர் உழைப்பால் தடைகள் விலகும்; புதிய கடன்களைத் தவிர்க்கவும்.'),
  T('Jupiter is 7th from your Moon (Guru Balam): it supports marriage, partnerships and goodwill.', 'குரு உங்கள் ராசிக்கு 7-ல் (குரு பலம்): திருமணம், கூட்டு முயற்சி, நல்லுறவுக்கு ஆதரவு.'),
  T('Jupiter is 8th from your Moon: avoid hasty decisions; prayer and patience help.', 'குரு உங்கள் ராசிக்கு 8-ல்: அவசர முடிவுகளைத் தவிர்க்கவும்; வழிபாடும் பொறுமையும் துணை.'),
  T('Jupiter is 9th from your Moon (Guru Balam): it supports fortune, the blessings of elders and pilgrimage.', 'குரு உங்கள் ராசிக்கு 9-ல் (குரு பலம்): பாக்கியம், பெரியோர் ஆசி, தீர்த்த யாத்திரைக்கு ஆதரவு.'),
  T('Jupiter is 10th from your Moon: responsibilities at work may shift — act with care.', 'குரு உங்கள் ராசிக்கு 10-ல்: பணியில் பொறுப்புகள் மாறலாம்; கவனமாகச் செயல்படுங்கள்.'),
  T('Jupiter is 11th from your Moon (Guru Balam): it supports gains, wishes and help from friends.', 'குரு உங்கள் ராசிக்கு 11-ல் (குரு பலம்): லாபம், விருப்பங்கள் நிறைவேற, நண்பர்கள் உதவிக்கு ஆதரவு.'),
  T('Jupiter is 12th from your Moon: spending on good causes and a pull towards the spiritual.', 'குரு உங்கள் ராசிக்கு 12-ல்: நற்காரியச் செலவுகள், ஆன்மீக நாட்டம்.'),
];

// Life areas: houses that support / negate, karakas (same traditional reading as shared/predict.js), and wording.
export const PALAN_AREAS = [
  { id: 'career', houses: [10, 6, 11, 2], negate: [5, 8, 12], karakas: ['Sun', 'Saturn'], name: T('Career', 'தொழில் / வேலை'),
    for: T('career growth', 'தொழில் வளர்ச்சிக்கு'), tip: T('Build skills and visibility, and take on responsibility when it is offered.', 'திறமையையும் அறிமுகத்தையும் வளர்த்து, வரும் பொறுப்புகளை ஏற்றுக்கொள்ளுங்கள்.') },
  { id: 'wealth', houses: [2, 11, 9], negate: [6, 8, 12], karakas: ['Jupiter', 'Venus'], name: T('Money & savings', 'பணம் & சேமிப்பு'),
    for: T('income and savings', 'பண வரவுக்கும் சேமிப்புக்கும்'), tip: T('Save a fixed share every month and keep away from speculative risks.', 'மாதந்தோறும் ஒரு பங்கைச் சேமித்து, ஊக வணிக அபாயங்களைத் தவிர்க்கவும்.') },
  { id: 'marriage', houses: [7, 2, 11], negate: [1, 6, 10], karakas: ['Venus', 'Jupiter'], name: T('Marriage & family life', 'திருமணம் & குடும்ப வாழ்க்கை'),
    for: T('marriage and family life', 'திருமண முயற்சிகளுக்கும் குடும்ப ஒற்றுமைக்கும்'), forMarried: T('harmony and good family events', 'குடும்ப ஒற்றுமைக்கும் நல்ல குடும்ப நிகழ்வுகளுக்கும்'),
    tip: T('Talk openly with family; patience and respect keep the bond strong.', 'குடும்பத்தினருடன் மனம் விட்டுப் பேசுங்கள்; பொறுமையும் மரியாதையும் உறவை உறுதிப்படுத்தும்.') },
  { id: 'education', houses: [4, 5, 9], negate: [3, 8, 12], karakas: ['Mercury', 'Jupiter'], name: T('Education & studies', 'கல்வி & கற்றல்'),
    for: T('studies and new skills', 'கல்விக்கும் புதிய திறன்களுக்கும்'), tip: T('A steady study routine and a good teacher bring the best results.', 'சீரான படிப்பு ஒழுங்கும் நல்ல ஆசிரியரும் சிறந்த பலன் தருவர்.'),
    kidTip: T('A fixed study time, enough sleep and a little reading every day help the most.', 'தினமும் ஒரே நேரத்தில் படிப்பு, போதுமான உறக்கம், கொஞ்சம் வாசிப்பு — இவையே பெரிய உதவி.') },
  { id: 'children', houses: [5, 2, 11], negate: [1, 4, 10], karakas: ['Jupiter'], name: T('Children', 'பிள்ளைகள்'),
    for: T('children\'s matters and their progress', 'பிள்ளைகள் தொடர்பான நல்ல காரியங்களுக்கும் அவர்களின் முன்னேற்றத்திற்கும்'), tip: T('Time together and encouragement matter more than anything.', 'சேர்ந்து செலவிடும் நேரமும் ஊக்கமும் எல்லாவற்றையும் விட முக்கியம்.') },
  { id: 'property', houses: [4, 11, 2], negate: [3, 12], karakas: ['Mars', 'Venus'], name: T('Home, land & vehicles', 'வீடு, நிலம், வாகனம்'),
    for: T('buying a home, land or a vehicle', 'வீடு, நிலம், வாகனம் வாங்குவதற்கு'), tip: T('Check documents carefully and decide within your means.', 'ஆவணங்களைக் கவனமாகச் சரிபார்த்து, உங்கள் சக்திக்கு ஏற்ப முடிவெடுங்கள்.') },
  { id: 'spiritual', houses: [9, 12, 5], negate: [], karakas: ['Jupiter', 'Ketu'], name: T('Spiritual life', 'ஆன்மீக வாழ்க்கை'),
    for: T('spiritual growth and pilgrimage', 'ஆன்மீக முன்னேற்றத்திற்கும் தீர்த்த யாத்திரைக்கும்'), tip: T('A simple daily prayer and an occasional temple visit keep the mind clear.', 'தினசரி ஓர் எளிய வழிபாடும் அவ்வப்போது கோவில் தரிசனமும் மனதைத் தெளிவாக்கும்.') },
];

// 60 and over: the same houses and windows, worded for the stage of life — family (not marriage efforts), work as
// purpose and service (not job hunting). A separated / widowed person who chose to ask about remarriage
// (opts.remarriage) keeps the marriage wording.
const SENIOR = {
  career: { name: T('Work & purpose', 'பணி & பயனுள்ள செயல்பாடு'), for: T('meaningful work, service and sharing your experience', 'பயனுள்ள பணி, சேவை, அனுபவத்தைப் பகிர்வதற்கு'),
    tip: T('Share your experience, guide younger people and keep a gentle, regular routine.', 'உங்கள் அனுபவத்தைப் பகிர்ந்து இளையோருக்கு வழிகாட்டுங்கள்; மென்மையான, சீரான அன்றாட ஒழுங்கைப் பேணுங்கள்.') },
  marriage: { name: T('Family life', 'குடும்ப வாழ்க்கை'), for: T('family harmony and good family events', 'குடும்ப ஒற்றுமைக்கும் நல்ல குடும்ப நிகழ்வுகளுக்கும்') },
  education: { name: T('Learning', 'கற்றல்'), for: T('learning and new interests', 'கற்றலுக்கும் புதிய ஆர்வங்களுக்கும்') },
};

// ------------------------------------------------------------------ helpers
const toDate = (x) => (x instanceof Date ? x : new Date(x));
/** "Jul 2026" / "ஜூலை 2026" in the chart's time zone (dates are UTC instants). */
export function monthYear(x, tz = 5.5) {
  const d = new Date(toDate(x).getTime() + tz * 3600000);
  return T(`${MONTHS_EN[d.getUTCMonth()]} ${d.getUTCFullYear()}`, `${MONTHS_TA[d.getUTCMonth()]} ${d.getUTCFullYear()}`);
}
const yearOf = (x, tz = 5.5) => new Date(toDate(x).getTime() + tz * 3600000).getUTCFullYear();
// Dasa / Bhukti boundaries, one convention everywhere (shared/fmt.js): a period runs till the day BEFORE the next starts.
const last = (end) => new Date(toDate(end).getTime() - 86400000);
const span = (a, b, tz) => { const s = monthYear(a, tz), e = monthYear(last(b), tz); return T(`${s.en} – ${e.en}`, `${s.ta} – ${e.ta}`); };
const yspan = (a, b, tz) => { const ya = yearOf(a, tz), yb = yearOf(last(b), tz); return ya === yb ? `${ya}` : `${ya}–${yb}`; };

/** House significations counted from a reference sign (Lagna, or the Moon sign when the time is unknown). */
function significationsFrom(chart, ref) {
  const P = chart.planets;
  const own = {}, occ = {};
  for (const k of Object.keys(PLANETS)) { if (k === 'Lagna' || !P[k]) continue; own[k] = []; occ[k] = [houseOf(ref, P[k].rasi)]; }
  for (let h = 1; h <= 12; h++) own[lordOf(ref, h)].push(h);
  for (const n of ['Rahu', 'Ketu']) own[n] = [...own[RASIS[P[n].rasi].lord]]; // nodes act for their sign lord
  const sig = {};
  for (const k of Object.keys(own)) {
    const starLord = NAKSHATRAS[P[k].nakshatra]?.lord;
    sig[k] = { own: own[k], occ: occ[k], star: [...(own[starLord] || []), ...(occ[starLord] || [])] };
  }
  return sig;
}
function areaScore(sig, k, area) {
  const s = sig[k];
  if (!s) return 0;
  let score = 0;
  const hit = (arr, w, neg) => { for (const h of arr) { if (area.houses.includes(h)) score += w; if (area.negate.includes(h)) score -= neg; } };
  hit(s.star, 2, 1.2); hit(s.occ, 2.5, 1.2); hit(s.own, 1.5, 0.8);
  if (area.karakas.includes(k)) score += 1.5;
  return score;
}
const periodScore = (sig, md, ad, area) => Math.round((areaScore(sig, md, area) * 0.4 + areaScore(sig, ad, area) * 0.6) * 10) / 10;

/** Best supportive dasa–bhukti windows for one area inside [now, now + years): up to two, adjacent ones merged. */
export function areaWindows(chart, area, { now = new Date(), years = REPORT_YEARS.analysis, ref = null } = {}) {
  const r = ref ?? (chart.planets.Lagna ? chart.planets.Lagna.rasi : chart.planets.Moon.rasi);
  const sig = significationsFrom(chart, r);
  const end = horizonEnd(now, years).getTime(), t0 = now.getTime();
  const list = [];
  for (const md of chart.dasa?.periods || []) {
    if (toDate(md.end).getTime() <= t0 || toDate(md.start).getTime() >= end) continue;
    for (const ad of md.bhuktis || []) {
      const s = toDate(ad.start).getTime(), e = toDate(ad.end).getTime();
      if (e <= t0 || s >= end) continue;
      list.push({ md: md.lord, ad: ad.lord, start: new Date(Math.max(s, t0)), end: new Date(Math.min(e, end)), running: s <= t0, score: periodScore(sig, md.lord, ad.lord, area) });
    }
  }
  const best = Math.max(0, ...list.map((w) => w.score));
  const coming = list.filter((w) => !w.running && w.score >= 3 && w.score >= best * 0.7).sort((a, b) => b.score - a.score).slice(0, 2).sort((a, b) => a.start - b.start);
  const merged = [];
  for (const w of coming) {
    const last = merged[merged.length - 1];
    if (last && last.md === w.md && Math.abs(last.end - w.start) < 86400000) { last.end = w.end; last.ads.push(w.ad); } else merged.push({ ...w, ads: [w.ad] });
  }
  return { current: list.find((w) => w.running) || null, windows: merged, all: list };
}

const strengthMap = (chart) => Object.fromEntries(grahaStrength(chart.planets).map((g) => [g.planet, g.score]));

// ------------------------------------------------------------------ bhava one-liner
/**
 * One plain line for a bhava row, visible without expanding: e.g. "2-ம் அதிபதி 11-ல் — சேமிப்பு வளர வாய்ப்பு".
 * b: an entry of bhavaAnalysis(chart). { minor } gives a neutral line with no money / work / partner words.
 */
export function bhavaMeaning(b, { minor = false } = {}) {
  const h = b.house, x = b.lordHouse;
  const head = T(`${ord(h)} lord in the ${ord(x)}`, `${h}-ம் அதிபதி ${x}-ல்`);
  const own = x === h;
  const good = !DUSTHANA.includes(x);
  let tail;
  if (DUSTHANA.includes(h)) {
    if (own) tail = { 6: T('strength to overcome competition', 'போட்டிகளைச் சமாளிக்கும் வலு'), 8: T('depth and the strength to bounce back', 'ஆழ்ந்த சிந்தனை, மீண்டு எழும் வலு'), 12: T('expenses stay in check; a spiritual pull', 'செலவுகள் கட்டுக்குள்; ஆன்மீக நாட்டம்') }[h];
    else if (!good) tail = T('obstacles tend to clear by themselves (Viparita pattern)', 'தடைகள் தாமாக விலகும் அமைப்பு (விபரீத அமைப்பு)');
    else tail = {
      6: T(`extra effort needed in ${VIA[x].en}; it pays off`, `${VIA[x].ta} தொடர்பாகக் கூடுதல் உழைப்பு — அதற்குப் பலனும் உண்டு`),
      8: T(`changes around ${VIA[x].en}; prepare in advance`, `${VIA[x].ta} தொடர்பான மாற்றங்கள் — முன்னேற்பாடு நன்று`),
      12: T(`spending on ${VIA[x].en}; plan it well`, `${VIA[x].ta} தொடர்பான செலவுகள் — திட்டமிட்டுச் செலவிடுவது நன்று`),
    }[h];
  } else if (own) tail = T(`in its own house — steady strength for ${SUBJ[h].en}`, `தன் வீட்டிலேயே — ${SUBJ[h].ta} நிலையான பலம் பெறும்`);
  else if (good) tail = T(`${SUBJ[h].en} can grow, supported by ${VIA[x].en}`, `${SUBJ[h].ta} வளர வாய்ப்பு; ${VIA[x].ta} வழியாக ஆதரவு`);
  else tail = T(`${SUBJ[h].en} grows with patience and planning`, `${SUBJ[h].ta} — பொறுமையும் திட்டமிடலும் பலன் தரும்`);
  if (own) head.en = `${ord(h)} lord`, head.ta = `${h}-ம் அதிபதி`;
  // Occupants: benefics add support; malefics in the 3rd, 6th, 10th, 11th reward effort. Nothing frightening is said.
  const ben = b.occupants.filter((o) => ['Jupiter', 'Venus', 'Mercury', 'Moon'].includes(o));
  const upa = [3, 6, 10, 11].includes(h) ? b.occupants.filter((o) => ['Saturn', 'Mars', 'Sun', 'Rahu', 'Ketu'].includes(o)) : [];
  let occ = null;
  if (ben.length) occ = T(`${listEn(ben.map(pEn))} here add support`, `இங்குள்ள ${listTa(ben.map(pTa))} கூடுதல் ஆதரவு`);
  else if (upa.length) occ = T(`${listEn(upa.map(pEn))} here reward effort`, `இங்குள்ள ${listTa(upa.map(pTa))} உழைப்புக்குப் பலன் தருவார்`);
  let line = T(`${head.en} — ${tail.en}${occ ? `; ${occ.en}` : ''}.`, `${head.ta} — ${tail.ta}${occ ? `; ${occ.ta}` : ''}.`);
  if (minor && adultText(line)) {
    const lvl = b.score >= 66 ? T('a strong placement', 'பலமான அமைப்பு') : b.score >= 48 ? T('a steady placement', 'சீரான அமைப்பு') : T('a placement that grows with patience', 'பொறுமையால் வளரும் அமைப்பு');
    line = T(`${head.en} — ${lvl.en}.`, `${head.ta} — ${lvl.ta}.`);
  }
  return line;
}

/** Text tag for a 0–100 score — the same thresholds as the coloured bar (≥66 strong, ≥48 steady). */
export function scoreTag(score) {
  if (score >= 66) return { cls: 'good', ...T('Strong', 'பலம்') };
  if (score >= 48) return { cls: 'warn', ...T('Steady', 'நிலையானது') };
  return { cls: 'bad', ...T('Needs care', 'கவனம் தேவை') };
}

// ------------------------------------------------------------------ yoga periods
/**
 * When a yoga gives results, per planet that forms it (registry `periods.lords`): its Maha Dasa(s) inside the
 * horizon, and — so two yogas never look the same just because one Maha Dasa dominates — its Bhuktis inside the
 * running and next Maha Dasa. Returns [{ lord, maha: [{ start, end, now }], bhukti: [{ md, start, end, now }] }].
 */
export function yogaPeriodsByPlanet(yoga, chart, { now = new Date(), years = REPORT_YEARS.analysis } = {}) {
  const lords = [...new Set(yoga?.periods?.lords || [])].filter((k) => PLANETS[k] && k !== 'Lagna');
  const t0 = now.getTime(), end = horizonEnd(now, years).getTime();
  const all = chart.dasa?.periods || [];
  const inH = (p) => toDate(p.end).getTime() > t0 && toDate(p.start).getTime() < end;
  const runIdx = all.findIndex((p) => toDate(p.start).getTime() <= t0 && t0 < toDate(p.end).getTime());
  const near = runIdx >= 0 ? all.slice(runIdx, runIdx + 2) : [];
  return lords.map((k) => {
    const maha = all.filter((p) => p.lord === k && inH(p)).slice(0, 2).map((p) => ({ start: toDate(p.start), end: toDate(p.end), now: toDate(p.start).getTime() <= t0 }));
    const bhukti = [];
    for (const md of near) {
      if (md.lord === k) continue; // the whole Maha Dasa is already listed
      for (const b of md.bhuktis || []) if (b.lord === k && inH(b)) bhukti.push({ md: md.lord, start: toDate(b.start), end: toDate(b.end), now: toDate(b.start).getTime() <= t0 });
    }
    return { lord: k, maha, bhukti: bhukti.slice(0, 2) };
  });
}

// ------------------------------------------------------------------ the reading
const PROMISE = {
  strong: T('Your chart gives good support here.', 'உங்கள் ஜாதகத்தில் இதற்கு நல்ல ஆதரவு உண்டு.'),
  steady: T('Your chart shows a steady foundation here.', 'உங்கள் ஜாதகத்தில் இதற்கு நிலையான அடித்தளம் உண்டு.'),
  'needs care': T('Here results come through patience and planning.', 'இங்கு பொறுமையும் திட்டமிடலும் பலன் தரும்.'),
};

/**
 * The written palan for one chart.
 * @param chart birthChart(...)
 * @param opts { now, profile: ageProfile(...), years, analysis: fullAnalysis(chart) (optional; areas / transit reused),
 *               tz, maritalStatus: 'married' | other }
 * @returns { title, horizon, mode: 'adult'|'minor', moonOnly, sections: [{ id, title, lines: [{en,ta}], stability, items? }] }
 */
export function writtenPalan(chart, { now = new Date(), profile = null, years = REPORT_YEARS.analysis, analysis = null, tz = null, maritalStatus = null, remarriage = false } = {}) {
  const zone = tz ?? (Number.isFinite(Number(chart.tz)) ? Number(chart.tz) : 5.5);
  const prof = profile || { band: 'adult', adult: true, minor: false };
  const adult = !!(prof.adult || prof.organization);
  const senior = adult && Number(prof.age) >= 60 && !remarriage;
  const P = chart.planets;
  const hasLagna = !!P.Lagna;
  const ref = hasLagna ? P.Lagna.rasi : P.Moon.rasi;
  const sMap = strengthMap(chart);
  const sig = significationsFrom(chart, ref);
  const pd = (k) => (adult ? PERIOD[k].a : PERIOD[k].kid);
  const safe = (lines) => (adult ? lines : lines.filter((l) => !adultText(l)));
  const sections = [];

  // ---- Who you are
  const moonR = P.Moon.rasi;
  const star = chart.janmaNakshatra;
  const nak = NAKSHATRAS[star.index];
  const who = [];
  if (hasLagna) {
    const lg = P.Lagna.rasi;
    who.push(T(`You were born in ${RASIS[lg].en} Lagna, with the Moon in ${RASIS[moonR].en} Rasi and the birth star ${nak.en}, pada ${star.pada}.`,
      `நீங்கள் ${adjTa(RASIS[lg].ta)} லக்னம், ${adjTa(RASIS[moonR].ta)} ராசி, ${nak.ta} நட்சத்திரம் ${star.pada}-ம் பாதத்தில் பிறந்தவர்.`));
    who.push(T(`As a ${RASIS[lg].en} Lagna person you are ${SIGN[lg].act.en}.`, `${adjTa(RASIS[lg].ta)} லக்னக்காரரான நீங்கள் ${SIGN[lg].act.ta}.`));
  } else {
    who.push(T(`You were born with the Moon in ${RASIS[moonR].en} Rasi and the birth star ${nak.en}, pada ${star.pada}.`,
      `நீங்கள் ${adjTa(RASIS[moonR].ta)} ராசி, ${nak.ta} நட்சத்திரம் ${star.pada}-ம் பாதத்தில் பிறந்தவர்.`));
  }
  who.push(T(`With the Moon in ${RASIS[moonR].en}, your mind is ${SIGN[moonR].mind.en}.`, `சந்திரன் ${adjTa(RASIS[moonR].ta)} ராசியில் இருப்பதால் உங்கள் மனம் ${SIGN[moonR].mind.ta}.`));
  who.push(T(`Your star ${nak.en} is ruled by ${nak.lord}, which adds ${GIFT[nak.lord].en}.`, `உங்கள் ${nak.ta} நட்சத்திரத்தின் அதிபதி ${pTa(nak.lord)} — இது ${sandhi('உங்களுக்கு', GIFT[nak.lord].ta)} தருகிறது.`));
  if (hasLagna) {
    const ll = lordOf(P.Lagna.rasi, 1), at = houseOf(P.Lagna.rasi, P[ll].rasi);
    const t = adult ? LAGNA_LORD_IN[at].a : (LAGNA_LORD_IN[at].kid || LAGNA_LORD_IN[at].a);
    who.push(T(`Your Lagna lord ${ll} sits in the ${ord(at)} house: ${t.en}.`, `லக்னாதிபதி ${pTa(ll)} ${at}-ம் வீட்டில் இருக்கிறார் — ${t.ta}.`));
  } else {
    who.push(T('The Lagna-based parts of this reading (Lagna, houses and Lagna lord) need the birth time; this reading is counted from your Moon sign.', 'இந்தப் பலனில் லக்னம் சார்ந்த பகுதிகளுக்கு (லக்னம், பாவங்கள், லக்னாதிபதி) பிறந்த நேரம் தேவை; இங்கு உங்கள் ராசியிலிருந்து கணக்கிடப்பட்டுள்ளது.'));
  }
  sections.push({ id: 'who', title: T('Who you are', 'நீங்கள் யார்'), lines: safe(who), stability: hasLagna ? ['lagna', 'moonNakshatra', 'moonPada'] : ['moonNakshatra', 'moonPada'] });

  // ---- Now
  // The periods running at `now` — the same lookup as Today, the analysis card and the road map.
  const { md, ad } = runningDasa(chart, now);
  const nowLines = [];
  const transit = analysis?.transit || transitStatus(chart, now);
  const areas = PALAN_AREAS.filter((a) => topicAllowed(a.id, prof)).map((a) => {
    return senior && SENIOR[a.id] ? { ...a, ...SENIOR[a.id] } : a;
  });
  if (md) {
    nowLines.push(T(`You are now in ${md.lord} Maha Dasa (${yspan(md.start, md.end, zone)})${ad ? `, in its ${ad.lord} Bhukti (${span(ad.start, ad.end, zone).en})` : ''}.`,
      `இப்போது ${pAdj(md.lord)} மகா தசை (${yspan(md.start, md.end, zone)}) நடக்கிறது${ad ? `; அதில் ${pAdj(ad.lord)} புக்தி (${span(ad.start, ad.end, zone).ta})` : ''}.`));
    if (adult) {
      const k = md.lord, s = sig[k];
      const ruled = ['Rahu', 'Ketu'].includes(k) ? [] : s.own;
      const occH = s.occ[0];
      const focus = [...new Set([...ruled, occH])].filter((h) => h !== 1 || occH === 1);
      const pre = hasLagna ? T('In your chart ', 'உங்கள் ஜாதகத்தில் ') : T('Counted from your Moon sign, ', 'உங்கள் ராசியிலிருந்து கணக்கிட்டால், ');
      const roleEn = `${ruled.length ? `rules your ${listEn(ruled.map(ord))} ${ruled.length > 1 ? 'houses' : 'house'} and ` : ''}sits in the ${ord(occH)} house`;
      const roleTa = `${ruled.length ? `${ruled.join(', ')}-ம் ${ruled.length > 1 ? 'வீடுகளுக்கு' : 'வீட்டுக்கு'} அதிபதி; ` : ''}${occH}-ம் வீட்டில் இருக்கிறார்`;
      nowLines.push(T(`${pre.en}${k} ${roleEn}, so this period brings forward ${listEn(focus.map((h) => HOUSE[h].en))}.`,
        `${pre.ta}${pTa(k)} ${roleTa}. எனவே இந்தத் தசை ${listTa(focus.map((h) => HOUSE[h].ta))} ஆகியவற்றை முன்னிறுத்தும்.`));
      const good = dasaTone(chart, k, sMap).good; // the same rule as the analysis card and the road map
      nowLines.push(good
        ? T(`${k} is well placed for you — a supportive period to build on ${pd(k).en}.`, `${pTa(k)} உங்களுக்கு நல்ல நிலையில் உள்ளார் — ${pd(k).ta} ஆகியவற்றில் வளர்ச்சிக்குப் பயன்படுத்த வேண்டிய ஆதரவான காலம்.`)
        : T(`${k}'s period rewards patience and steady effort; ${pd(k).en} are the themes to work on.`, `${pAdj(k)} தசையில் பொறுமையும் தொடர் முயற்சியும் பலன் தரும்; ${pd(k).ta} — இவையே கவனிக்க வேண்டியவை.`));
      if (ad) nowLines.push(T(`The ${ad.lord} Bhukti adds ${pd(ad.lord).en}.`, `${pAdj(ad.lord)} புக்தி ${pd(ad.lord).ta} ஆகியவற்றைச் சேர்க்கிறது.`));
      // Which life areas this dasa–bhukti supports now.
      if (ad) {
        const sc = areas.map((a) => ({ a, s: periodScore(sig, md.lord, ad.lord, a) }));
        const up = sc.filter((x) => x.s >= 3).sort((x, y) => y.s - x.s).slice(0, 3).map((x) => x.a);
        const slow = sc.filter((x) => x.s < 1).slice(0, 2).map((x) => x.a);
        if (up.length) nowLines.push(T(`Right now the strongest support is for ${listEn(up.map((a) => a.name.en.toLowerCase()))}.`, `இப்போது அதிக ஆதரவு: ${listTa(up.map((a) => a.name.ta))}.`));
        if (slow.length) nowLines.push(T(`${listEn(slow.map((a) => a.name.en))} ${slow.length > 1 ? 'move' : 'moves'} slowly for now — lay the groundwork.`, `${listTa(slow.map((a) => a.name.ta))} — இப்போது மெதுவான முன்னேற்றம்; அடித்தளம் அமைக்கும் காலம்.`));
      }
    } else {
      nowLines.push(T(`${md.lord}'s period brings forward ${pd(md.lord).en} — a good time to build these with gentle encouragement.`, `${pAdj(md.lord)} தசை ${pd(md.lord).ta} ஆகியவற்றை முன்னிறுத்தும் — அன்பான ஊக்கத்துடன் இவற்றை வளர்க்க நல்ல காலம்.`));
      if (ad) nowLines.push(T(`The ${ad.lord} Bhukti adds ${pd(ad.lord).en}.`, `${pAdj(ad.lord)} புக்தி ${pd(ad.lord).ta} ஆகியவற்றைச் சேர்க்கிறது.`));
    }
  }
  const tStart = nowLines.length; // transit + wellbeing lines form the second paragraph
  const satUntil = transit.satSpan?.to ? monthYear(transit.satSpan.to, zone) : null;
  const jupUntil = transit.jupSpan?.to ? monthYear(transit.jupSpan.to, zone) : null;
  if (adult) {
    const s = SATURN[transit.saturnFromMoon], j = JUPITER[transit.jupiterFromMoon];
    // "Saturn is 3rd from your Moon (until Jun 2027): …" — the date goes before the first colon.
    const until = (line, u) => {
      if (!u) return line;
      const put = (x, d) => (x.includes('):') ? x.replace('):', `, ${d}):`) : x.replace(':', ` (${d}):`));
      return T(put(line.en, `until ${u.en}`), put(line.ta, `${u.ta} வரை`));
    };
    nowLines.push(until(s, satUntil), until(j, jupUntil));
  } else {
    const satGood = [3, 6, 11].includes(transit.saturnFromMoon), guru = [2, 5, 7, 9, 11].includes(transit.jupiterFromMoon);
    nowLines.push(satGood ? T('Saturn\'s transit is favourable — a regular study habit pays off well.', 'சனியின் கோசாரம் சாதகம் — தொடர்ந்து படிக்கும் பழக்கத்திற்கு நல்ல பலன்.')
      : T('Saturn\'s transit teaches patience — keep studies, sleep and prayer steady and this passes gently.', 'சனியின் கோசாரம் பொறுமையைக் கற்றுத்தரும் — படிப்பு, உறக்கம், வழிபாட்டைச் சீராக வைத்தால் இது மென்மையாகக் கடக்கும்.'));
    nowLines.push(guru ? T('Jupiter supports studies and good habits now (Guru Balam).', 'குரு பலம் உண்டு — கல்விக்கும் நல்ல பழக்கங்களுக்கும் சாதகமான காலம்.')
      : T('For Jupiter\'s grace, a lamp for Dakshinamurthy on Thursdays and a daily study routine help.', 'குருவின் அருளுக்கு வியாழன்தோறும் தட்சிணாமூர்த்திக்குத் தீபம்; படிப்பில் தினசரி ஒழுங்கு நன்று.'));
  }
  nowLines.push(adult ? T('For wellbeing in any period: enough sleep, a daily walk and a calm routine are your best support.', 'எந்தக் காலத்திலும் நலமாக இருக்க: போதுமான உறக்கம், தினசரி நடை, அமைதியான அன்றாட ஒழுங்கு — இவையே சிறந்த துணை.')
    : T('Outdoor play, a fixed bedtime and time with family keep a child happy in every period.', 'வெளியில் விளையாட்டு, நேரத்திற்கு உறக்கம், குடும்பத்துடன் நேரம் — எந்தக் காலத்திலும் குழந்தையை மகிழ்ச்சியாக வைக்கும்.'));
  sections.push({ id: 'now', title: T('Now', 'இப்போது'), lines: safe(nowLines), paras: [safe(nowLines.slice(0, tStart)), safe(nowLines.slice(tStart))], stability: ['moonNakshatra', 'moonPada'] });

  // ---- Next
  const hEnd = horizonEnd(now, years);
  const next = [];
  if (md?.bhuktis) {
    const upcoming = md.bhuktis.filter((b) => toDate(b.start) > now && toDate(b.start) < hEnd).slice(0, 2);
    for (const b of upcoming) next.push(T(`From ${monthYear(b.start, zone).en}: ${b.lord} Bhukti (till ${monthYear(last(b.end), zone).en}) brings forward ${pd(b.lord).en}.`,
      `${monthYear(b.start, zone).ta} முதல் ${pAdj(b.lord)} புக்தி (${monthYear(last(b.end), zone).ta} வரை) — ${pd(b.lord).ta} முன்னிறுத்தப்படும்.`));
  }
  const nStart = next.length; // the Maha Dasa change forms the second paragraph
  const nextMd = (chart.dasa?.periods || []).find((p) => md && toDate(p.start).getTime() >= toDate(md.end).getTime() - 1000);
  if (nextMd && toDate(nextMd.start) < hEnd) {
    const k = nextMd.lord;
    next.push(T(`In ${yearOf(nextMd.start, zone)} the ${k} Maha Dasa begins (${yspan(nextMd.start, nextMd.end, zone)}): the focus shifts${md ? ` from ${md.lord}'s themes` : ''} to ${pd(k).en}.`,
      `${yearOf(nextMd.start, zone)}-ல் ${pAdj(k)} மகா தசை தொடங்குகிறது (${yspan(nextMd.start, nextMd.end, zone)}): ${md ? `${pAdj(md.lord)} தசையின் விஷயங்களிலிருந்து ` : ''}${pd(k).ta} நோக்கிக் கவனம் மாறும்.`));
    if (adult) {
      const s = sig[k];
      const focus = [...new Set([...(['Rahu', 'Ketu'].includes(k) ? [] : s.own), s.occ[0]])].filter((h) => h !== 1 || s.occ[0] === 1);
      next.push(T(`In your chart ${k} connects with ${listEn(focus.map((h) => HOUSE[h].en))} — these come to the front then.`, `உங்கள் ஜாதகத்தில் ${pTa(k)} ${listTa(focus.map((h) => HOUSE[h].ta))} ஆகியவற்றுடன் தொடர்புடையவர் — அப்போது இவை முன்னிலை பெறும்.`));
    }
  } else if (md) {
    next.push(T(`${md.lord} Maha Dasa runs through the whole of the next ${years} years (till ${yearOf(last(md.end), zone)}); its Bhuktis set the pace.`, `அடுத்த ${years} ஆண்டுகள் முழுவதும் ${pAdj(md.lord)} மகா தசை (${yearOf(last(md.end), zone)} வரை) தொடர்கிறது; அதன் புக்திகளே வேகத்தைத் தீர்மானிக்கும்.`));
  }
  const areaInfo = areas.map((a) => ({ a, w: areaWindows(chart, a, { now, years, ref }) }));
  // Supportive windows, grouped when several areas share the same windows (one line per distinct set).
  const groups = new Map();
  for (const { a, w } of areaInfo) {
    if (!w.windows.length) continue;
    const ws = w.windows.slice(0, 2);
    const key = ws.map((x) => `${x.md}|${x.ads.join('/')}|${+x.start}`).join(';');
    if (!groups.has(key)) groups.set(key, { ws, areas: [] });
    groups.get(key).areas.push(a);
  }
  const named = [...groups.values()].map(({ ws, areas: as }) => T(`${as.map((a) => a.name.en).join(', ')}: ${ws.map((x) => `${x.md} Dasa – ${x.ads.join('/')} Bhukti (${yspan(x.start, x.end, zone)})`).join(', ')}`,
    `${as.map((a) => a.name.ta).join(', ')}: ${ws.map((x) => `${pAdj(x.md)} தசை – ${x.ads.map(pAdj).join('/')} புக்தி (${yspan(x.start, x.end, zone)})`).join(', ')}`));
  sections.push({ id: 'next', title: T('Next', 'அடுத்து வரும் காலம்'), lines: safe(next), paras: [safe(next.slice(0, nStart)), safe(next.slice(nStart))], windows: safe(named), windowsTitle: T(`Supportive Dasa–Bhukti periods (next ${years} years)`, `ஆதரவான தசா–புக்தி காலங்கள் (அடுத்த ${years} ஆண்டுகள்)`), stability: ['moonNakshatra', 'moonPada'] });

  // ---- Life areas
  const promiseOf = (id) => (hasLagna ? analysis?.areas?.find((x) => x.id === id)?.level : null);
  const items = areaInfo.map(({ a, w }) => {
    const lines = [];
    const lvl = promiseOf(a.id);
    if (lvl && PROMISE[lvl]) lines.push(PROMISE[lvl]);
    const forTxt = a.id === 'marriage' && maritalStatus === 'married' && !senior ? a.forMarried : a.for;
    const cur = w.current;
    if (cur) {
      const nm = T(`${cur.md} Dasa – ${cur.ad} Bhukti`, `${pAdj(cur.md)} தசை – ${pAdj(cur.ad)} புக்தி`);
      const until = monthYear(last(cur.end), zone);
      if (cur.score >= 3) lines.push(T(`The current ${nm.en} period (until ${until.en}) supports ${forTxt.en}.`, `இப்போதைய ${nm.ta} (${until.ta} வரை) ${forTxt.ta} ஆதரவான காலம்.`));
      else if (cur.score >= 1) lines.push(T(`The current ${nm.en} period (until ${until.en}) gives steady, gradual progress in ${forTxt.en}.`, `இப்போதைய ${nm.ta} (${until.ta} வரை) ${sandhi(forTxt.ta, 'சீரான')}, படிப்படியான முன்னேற்றம் தரும் காலம்.`));
      else lines.push(T(`For now (until ${until.en}) it is a time to prepare and lay the groundwork for ${forTxt.en}.`, `இப்போது (${until.ta} வரை) ${sandhi(forTxt.ta, 'தயாராகி')} அடித்தளம் அமைக்க வேண்டிய காலம்.`));
    }
    if (w.windows.length) {
      const ws = w.windows;
      lines.push(T(`Ahead, ${ws.map((x) => `${x.md} Dasa – ${x.ads.join('/')} Bhukti (${yspan(x.start, x.end, zone)})`).join(' and ')} ${ws.length > 1 ? 'are' : 'is'} the most supportive ${ws.length > 1 ? 'windows' : 'window'} for ${forTxt.en}.`,
        `அடுத்து ${ws.map((x) => `${pAdj(x.md)} தசை – ${x.ads.map(pAdj).join('/')} புக்தி (${yspan(x.start, x.end, zone)})`).join(', ')} ${forTxt.ta} மிகவும் சாதகமான ${ws.length > 1 ? 'காலங்கள்' : 'காலம்'}.`));
    } else if (!(a.id === 'marriage' && maritalStatus === 'married')) lines.push(HORIZON_LINES.windows(years)); // never "no window for marriage" to the married
    lines.push(!adult && a.kidTip ? a.kidTip : a.tip);
    return { id: a.id, title: a.name, lines: safe(lines), windows: w.windows.map((x) => ({ md: x.md, ads: x.ads, start: x.start, end: x.end })) };
  });
  if (!adult) {
    items.unshift({ id: 'nature', title: T('Nature & habits', 'இயல்பு & பழக்கங்கள்'), lines: safe([
      T(`${GIFT[nak.lord].en[0].toUpperCase()}${GIFT[nak.lord].en.slice(1)} come naturally — praise them often.`, `${GIFT[nak.lord].ta} இயல்பாக உண்டு — அடிக்கடி பாராட்டுங்கள்.`),
      T('Simple daily habits — a fixed wake-up time, helping at home, a short prayer — shape a calm, confident child.', 'எளிய தினசரி பழக்கங்கள் — நேரத்திற்கு எழுதல், வீட்டில் உதவுதல், சிறு பிரார்த்தனை — அமைதியான, தன்னம்பிக்கையான குழந்தையாக வளர்க்கும்.'),
    ]), windows: [] });
  }
  sections.push({ id: 'areas', title: T('Life areas', 'வாழ்க்கைத் துறைகள்'), lines: [], items, stability: hasLagna ? ['lagna'] : [] });

  return {
    title: T('Your chart reading — now and ahead', 'உங்கள் ஜாதகப் பலன் — இப்போதும் வரும் காலமும்'),
    horizon: horizonLabel(years), years, mode: adult ? 'adult' : 'minor', moonOnly: !hasLagna, senior,
    running: md ? { md: md.lord, ad: ad?.lord || null, mdStart: toDate(md.start), mdEnd: toDate(md.end), adStart: ad ? toDate(ad.start) : null, adEnd: ad ? toDate(ad.end) : null } : null,
    sections,
    note: T('Read on your phone from your chart\'s dasa, houses and transits. These are the tendencies tradition reads — not certainties; your effort and choices matter most.',
      'உங்கள் ஜாதகத்தின் தசை, பாவம், கோசாரம் ஆகியவற்றிலிருந்து உங்கள் கைப்பேசியிலேயே கணிக்கப்பட்டது. இவை மரபு காட்டும் போக்குகள் — முடிவான தீர்ப்புகள் அல்ல; உங்கள் முயற்சியும் தேர்வுகளுமே முதன்மை.'),
  };
}

/** Every { en, ta } line of a palan, flattened (for tests and the read-aloud button). */
export function palanLines(p) {
  const out = [p.title];
  for (const s of p.sections) {
    out.push(s.title, ...s.lines, ...(s.windowsTitle ? [s.windowsTitle] : []), ...(s.windows || []));
    for (const it of s.items || []) out.push(it.title, ...it.lines);
  }
  out.push(p.note);
  return out;
}

/** Follow-up questions for Ask Thunai (adult only; a minor gets none here — the chat offers age-safe chips). */
export function palanFollowups(p, { maritalStatus = null } = {}) {
  if (p.mode !== 'adult') return [];
  if (p.senior) {
    return [
      T('How is family harmony in this period?', 'இந்தக் காலத்தில் குடும்ப ஒற்றுமை எப்படி?'),
      T('What does this dasa bring for my peace of mind?', 'இந்தத் தசை மன அமைதிக்கு என்ன தரும்?'),
      T('Which days suit family functions this year?', 'இந்த ஆண்டு குடும்ப விழாக்களுக்கு ஏற்ற நாட்கள் எவை?'),
      T('Explain my current dasa-bhukti simply', 'என் நடப்பு தசா புக்தியை எளிமையாக விளக்குங்கள்'),
    ];
  }
  const q = [
    T('How is my career in this dasa?', 'இந்தத் தசையில் தொழில் எப்படி?'),
    maritalStatus === 'married' ? T('How is family harmony in this period?', 'இந்தக் காலத்தில் குடும்ப ஒற்றுமை எப்படி?') : T('When is a good time for marriage?', 'திருமண காலம் எப்போது?'),
    T('When do my savings grow?', 'பணம், சேமிப்பு எப்போது உயரும்?'),
    T('Explain my current dasa-bhukti simply', 'என் நடப்பு தசா புக்தியை எளிமையாக விளக்குங்கள்'),
  ];
  return q;
}
