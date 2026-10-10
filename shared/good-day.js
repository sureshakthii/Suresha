// Good Day (இன்றைய நல்வாழ்த்து): every morning a card and a message the person can share with family and friends on
// WhatsApp, Facebook or Instagram — a good-morning greeting, today's special day (Mother's Day, Teachers' Day, a Tamil
// festival …) or a good thought, today's panchangam essentials, one line for each of the 12 rasis, and the Thunai
// download link + QR code. Every share is kind words for the reader and an invitation to the app.
//
// Rules: kind, true and useful — no fear, no certainty, no birth data or health content on the card
// (shared/share-card-layout.js assertShareable checks), and the 12 rasi lines are the same daily palan the
// Panchangam shows (the Moon's position counted from each rasi).
import { RASIS } from './astro.js';
import qrcode from './vendor/qrcode.js'; // qrcode-generator 2.0.4 (MIT, Kazuhiko Arase), ES module build

const T = (en, ta) => ({ en, ta });
export const GOOD_DAY_VERSION = 'good-day-1.0.0';

/** The test download link (public GitHub release, always the latest test APK). Replace with the Play Store link. */
export const DOWNLOAD_URL = 'https://github.com/sureshakthii/Suresha/releases/download/test-latest/Thunai.apk';

// ---------------------------------------------------------------- the 12 rasis today (= the Panchangam's daily palan)
/** Daily rasi palan by the Moon's position counted from the janma rasi (1 = Moon in the sign itself). */
export const RASI_DAY_PALAN = Object.freeze({
  1: ['warn', 3, 'Moon in your sign — keep calm, avoid hasty words.', 'ஜென்ம சந்திரன் — மனதில் சிறு சஞ்சலம், நிதானமாகப் பேசுங்கள்.'],
  2: ['warn', 3, 'Mixed money matters; speak gently with family.', 'பண வரவு கலவை; குடும்பத்தில் இனிமையாகப் பேசுங்கள்.'],
  3: ['good', 5, 'Courage and success — efforts bear fruit.', 'தைரியம், வெற்றி — முயற்சிகள் பலிக்கும்.'],
  4: ['warn', 3, 'Take care of home and mother; drive carefully.', 'வீடு, தாய் நலனில் கவனம்; வாகனத்தில் கவனம்.'],
  5: ['warn', 3, 'Think twice before decisions; children bring news.', 'முடிவுகளை யோசித்து எடுங்கள்; பிள்ளைகளால் செய்தி.'],
  6: ['good', 4, 'Obstacles clear, health improves, debts reduce.', 'தடைகள் விலகும், ஆரோக்கியம் சீராகும், கடன் குறையும்.'],
  7: ['good', 4, 'Good for partnerships, meetings and travel.', 'கூட்டு முயற்சி, சந்திப்பு, பயணம் நன்று.'],
  8: ['bad', 1, 'Chandrashtamam — avoid new starts and arguments; pray and rest.', 'சந்திராஷ்டமம் — புதிய முயற்சி, வாக்குவாதம் தவிர்க்கவும்; வழிபட்டு ஓய்வெடுங்கள்.'],
  9: ['warn', 4, 'Blessings of elders; a good day for prayer.', 'பெரியோர் ஆசி; வழிபாட்டிற்கு நல்ல நாள்.'],
  10: ['good', 5, 'Progress and praise at work.', 'தொழிலில் முன்னேற்றம், பாராட்டு.'],
  11: ['good', 5, 'Gains and good news.', 'லாபம், நல்ல செய்தி.'],
  12: ['warn', 2, 'Expenses — spend wisely and rest well.', 'செலவுகள் — கவனமாகச் செலவிட்டு நன்கு ஓய்வெடுங்கள்.'],
});
// Short form of the same palan, for the 12-rasi grid on the card.
const SHORT = {
  1: T('Stay calm', 'நிதானம் தேவை'), 2: T('Gentle words help', 'இனிய பேச்சு நன்மை'), 3: T('Efforts succeed', 'முயற்சி வெற்றி'),
  4: T('Care for home', 'வீட்டில் கவனம்'), 5: T('Decide with thought', 'யோசித்து முடிவு'), 6: T('Obstacles clear', 'தடைகள் விலகும்'),
  7: T('Good meetings', 'சந்திப்பு நன்று'), 8: T('Rest and pray', 'அமைதி, வழிபாடு'), 9: T('Elders’ blessings', 'பெரியோர் ஆசி'),
  10: T('Praise at work', 'தொழிலில் பாராட்டு'), 11: T('Gains, good news', 'லாபம், நல்ல செய்தி'), 12: T('Spend wisely', 'கவனமாகச் செலவு'),
};
/** Today's line for each of the 12 rasis from the Moon's rasi (0–11). */
export function rasiDay(moonRasi) {
  return RASIS.map((r, i) => {
    const pos = ((moonRasi - i + 12) % 12) + 1;
    const [level, stars, en, ta] = RASI_DAY_PALAN[pos];
    return { rasi: i, name: T(r.en, r.ta), pos, level, stars, line: T(en, ta), short: SHORT[pos] };
  });
}

// ---------------------------------------------------------------- special days
const nthWeekday = (y, m0, weekday, n) => { const d = new Date(Date.UTC(y, m0, 1)); const first = (weekday - d.getUTCDay() + 7) % 7 + 1; return first + (n - 1) * 7; };
const S = (id, en, ta, msgEn, msgTa, doEn, doTa) => ({ id, name: T(en, ta), message: T(msgEn, msgTa), act: T(doEn, doTa) });
// Fixed-date days (month-day). Kind, family and society days — the kind of thing good to remember every year.
const FIXED = {
  '01-01': S('new-year', 'New Year’s Day', 'ஆங்கிலப் புத்தாண்டு', 'A fresh year — may it bring good health, peace and progress to your family.', 'புதிய ஆண்டு — உங்கள் குடும்பத்திற்கு ஆரோக்கியம், அமைதி, முன்னேற்றம் தரட்டும்.', 'Write one good habit you will keep this year.', 'இந்த ஆண்டு கடைப்பிடிக்கும் ஒரு நல்ல பழக்கத்தை எழுதுங்கள்.'),
  '01-12': S('youth', 'National Youth Day', 'தேசிய இளைஞர் தினம்', '“Arise, awake, and stop not till the goal is reached.” — Swami Vivekananda', '“எழுமின், விழிமின், இலக்கை அடையும் வரை நில்லாது செல்மின்” — சுவாமி விவேகானந்தர்', 'Encourage one young person today.', 'இன்று ஓர் இளைஞரை ஊக்கப்படுத்துங்கள்.'),
  '01-26': S('republic', 'Republic Day', 'குடியரசு தினம்', 'Proud of our nation and its Constitution — Jai Hind!', 'நம் நாட்டின் அரசியலமைப்பைப் போற்றுவோம் — ஜெய் ஹிந்த்!', 'Thank someone who serves the public.', 'பொதுச் சேவை செய்யும் ஒருவருக்கு நன்றி சொல்லுங்கள்.'),
  '02-14': S('love', 'Lovers’ Day', 'அன்பர் தினம்', 'Love is respect, patience and care every day — say it to the people you love.', 'அன்பு என்பது தினமும் மரியாதை, பொறுமை, அக்கறை — நீங்கள் நேசிப்பவர்களிடம் சொல்லுங்கள்.', 'Tell your family how much they mean to you.', 'உங்கள் குடும்பம் உங்களுக்கு எவ்வளவு முக்கியம் என்று சொல்லுங்கள்.'),
  '02-21': S('mother-tongue', 'International Mother Language Day', 'உலகத் தாய்மொழி தினம்', 'Our Tamil is our mother — speak it, read it, pass it on.', 'தமிழ் நம் தாய் — பேசுவோம், படிப்போம், அடுத்த தலைமுறைக்குக் கொடுப்போம்.', 'Teach a child one Thirukkural today.', 'இன்று ஒரு குழந்தைக்கு ஒரு திருக்குறள் கற்றுக்கொடுங்கள்.'),
  '03-08': S('women', 'International Women’s Day', 'சர்வதேச மகளிர் தினம்', 'Salute to every mother, sister, daughter and friend who holds the world together.', 'உலகைத் தாங்கும் ஒவ்வொரு தாய், சகோதரி, மகள், தோழிக்கும் வணக்கம்.', 'Thank a woman who shaped your life.', 'உங்கள் வாழ்வை உருவாக்கிய ஒரு பெண்ணுக்கு நன்றி சொல்லுங்கள்.'),
  '03-20': S('happiness', 'International Day of Happiness', 'சர்வதேச மகிழ்ச்சி தினம்', 'Happiness grows when it is shared.', 'பகிர்ந்தால் மகிழ்ச்சி பெருகும்.', 'Make someone smile today.', 'இன்று ஒருவரைப் புன்னகைக்க வையுங்கள்.'),
  '03-22': S('water', 'World Water Day', 'உலகத் தண்ணீர் தினம்', 'Every drop is precious — save water for the next generation.', 'ஒவ்வொரு துளியும் விலைமதிப்பற்றது — அடுத்த தலைமுறைக்காகத் தண்ணீரைச் சேமிப்போம்.', 'Fix a leaking tap or keep water for birds.', 'கசியும் குழாயைச் சரிசெய்யுங்கள் அல்லது பறவைகளுக்குத் தண்ணீர் வையுங்கள்.'),
  '04-07': S('health', 'World Health Day', 'உலக சுகாதார தினம்', 'Health is the real wealth — walk, eat simple and sleep well.', 'நோயற்ற வாழ்வே குறைவற்ற செல்வம் — நடங்கள், எளிதாக உண்ணுங்கள், நன்றாக உறங்குங்கள்.', 'Take a 20-minute walk with family.', 'குடும்பத்துடன் 20 நிமிடம் நடங்கள்.'),
  '04-22': S('earth', 'Earth Day', 'பூமி தினம்', 'Bhoomi Devi gives us everything — let us care for her.', 'பூமித்தாய் நமக்கு எல்லாம் தருகிறாள் — அவளைப் பேணுவோம்.', 'Plant a sapling or water a tree.', 'ஒரு செடி நடுங்கள் அல்லது ஒரு மரத்திற்குத் தண்ணீர் ஊற்றுங்கள்.'),
  '05-01': S('labour', 'May Day — Workers’ Day', 'மே தினம் — உழைப்பாளர் தினம்', 'Honour every hand that works — farmers, workers and helpers.', 'உழைக்கும் ஒவ்வொரு கரத்திற்கும் வணக்கம் — விவசாயி, தொழிலாளர், உதவியாளர்.', 'Thank a worker who helps your family.', 'உங்கள் குடும்பத்திற்கு உதவும் ஒரு தொழிலாளருக்கு நன்றி சொல்லுங்கள்.'),
  '05-15': S('families', 'International Day of Families', 'சர்வதேசக் குடும்ப தினம்', 'Family is our first temple.', 'குடும்பமே நம் முதல் கோவில்.', 'Eat one meal together without phones.', 'கைபேசி இல்லாமல் ஒரு வேளை சேர்ந்து உண்ணுங்கள்.'),
  '06-05': S('environment', 'World Environment Day', 'உலகச் சுற்றுச்சூழல் தினம்', 'A green earth is a gift to our children.', 'பசுமையான பூமியே நம் குழந்தைகளுக்கான பரிசு.', 'Carry a cloth bag today.', 'இன்று துணிப்பை எடுத்துச் செல்லுங்கள்.'),
  '06-21': S('yoga', 'International Yoga Day', 'சர்வதேச யோகா தினம்', 'A calm breath, a strong body, a peaceful mind.', 'அமைதியான மூச்சு, வலிமையான உடல், அமைதியான மனம்.', 'Do 10 minutes of yoga or pranayama.', '10 நிமிடம் யோகா அல்லது பிராணாயாமம் செய்யுங்கள்.'),
  '07-01': S('doctors', 'National Doctors’ Day', 'தேசிய மருத்துவர் தினம்', 'Gratitude to every doctor who heals with care.', 'அக்கறையுடன் குணப்படுத்தும் ஒவ்வொரு மருத்துவருக்கும் நன்றி.', 'Thank your family doctor.', 'உங்கள் குடும்ப மருத்துவருக்கு நன்றி சொல்லுங்கள்.'),
  '08-15': S('independence', 'Independence Day', 'சுதந்திர தினம்', 'Freedom came with sacrifice — let us live with honesty and unity. Jai Hind!', 'தியாகத்தால் வந்த சுதந்திரம் — நேர்மையுடனும் ஒற்றுமையுடனும் வாழ்வோம். ஜெய் ஹிந்த்!', 'Tell a child one freedom-fighter story.', 'ஒரு குழந்தைக்கு ஒரு சுதந்திரப் போராட்டக் கதை சொல்லுங்கள்.'),
  '09-05': S('teachers', 'Teachers’ Day', 'ஆசிரியர் தினம்', '“Mata, Pita, Guru, Deivam” — gratitude to every teacher who lit our path.', '“மாதா, பிதா, குரு, தெய்வம்” — நம் பாதையில் ஒளியேற்றிய ஒவ்வொரு ஆசிரியருக்கும் நன்றி.', 'Message one teacher who helped you.', 'உங்களுக்கு உதவிய ஓர் ஆசிரியருக்குச் செய்தி அனுப்புங்கள்.'),
  '09-08': S('literacy', 'International Literacy Day', 'சர்வதேச எழுத்தறிவு தினம்', '“Learn well what is worth learning.” Education lights every home.', '“கற்க கசடறக் கற்பவை” — கல்வியே ஒவ்வொரு வீட்டின் விளக்கு.', 'Help someone learn to read or use a phone.', 'ஒருவருக்கு வாசிக்க அல்லது கைபேசி பயன்படுத்தக் கற்றுக்கொடுங்கள்.'),
  '10-01': S('elders', 'International Day of Older Persons', 'சர்வதேச முதியோர் தினம்', 'Our elders are our roots — their blessings are our strength.', 'பெரியோர் நம் வேர்கள் — அவர்களின் ஆசியே நம் பலம்.', 'Spend time with an elder today.', 'இன்று ஒரு பெரியவருடன் நேரம் செலவிடுங்கள்.'),
  '10-02': S('gandhi', 'Gandhi Jayanti', 'காந்தி ஜெயந்தி', '“Be the change you wish to see in the world.”', '“உலகில் நீங்கள் காண விரும்பும் மாற்றமாக நீங்களே இருங்கள்.”', 'Do one act of service today.', 'இன்று ஒரு சேவைச் செயல் செய்யுங்கள்.'),
  '10-10': S('mental-health', 'World Mental Health Day', 'உலக மனநல தினம்', 'A kind word can lift a heavy heart. It is strong to talk and to listen.', 'ஒரு அன்பான வார்த்தை கனமான மனதைத் தூக்கும். பேசுவதும் கேட்பதும் பலம்.', 'Call a friend and really listen.', 'ஒரு நண்பரை அழைத்து மனம் விட்டுக் கேளுங்கள்.'),
  '10-16': S('food', 'World Food Day', 'உலக உணவு தினம்', 'Respect food — share it, never waste it.', 'உணவைப் போற்றுவோம் — பகிர்வோம், வீணாக்காதிருப்போம்.', 'Share a meal with someone in need.', 'தேவையுள்ள ஒருவருடன் உணவைப் பகிருங்கள்.'),
  '11-13': S('kindness', 'World Kindness Day', 'உலகக் கருணை தினம்', 'Kindness costs nothing and means everything.', 'கருணைக்கு விலை இல்லை; அதன் மதிப்பு அளவற்றது.', 'Do one quiet kind act today.', 'இன்று ஒரு சிறிய கருணைச் செயல் செய்யுங்கள்.'),
  '11-14': S('children', 'Children’s Day', 'குழந்தைகள் தினம்', 'Children are the flowers of the home — let them bloom with love.', 'குழந்தைகள் வீட்டின் மலர்கள் — அன்புடன் மலரவிடுவோம்.', 'Play with a child for 20 minutes.', 'ஒரு குழந்தையுடன் 20 நிமிடம் விளையாடுங்கள்.'),
  '12-03': S('ability', 'International Day of Persons with Disabilities', 'மாற்றுத்திறனாளிகள் தினம்', 'Every person has a gift — see the ability, not the limit.', 'ஒவ்வொருவரிடமும் ஒரு திறமை உண்டு — குறையை அல்ல, திறனைப் பாருங்கள்.', 'Offer help with respect to someone today.', 'இன்று மரியாதையுடன் ஒருவருக்கு உதவுங்கள்.'),
  '12-22': S('maths', 'National Mathematics Day — Srinivasa Ramanujan', 'தேசியக் கணித தினம் — சீனிவாச ராமானுஜன்', 'A Tamil genius from Erode who amazed the world — dream big, our children!', 'ஈரோட்டில் பிறந்து உலகை வியக்க வைத்த தமிழ் மேதை — பெரிதாகக் கனவு காணுங்கள், குழந்தைகளே!', 'Solve one puzzle with a child.', 'ஒரு குழந்தையுடன் ஒரு புதிர் தீருங்கள்.'),
};
// Days that move each year: Mother's Day (2nd Sunday of May), Father's Day (3rd Sunday of June), Friendship Day
// (1st Sunday of August, as observed in India), Daughters' Day (4th Sunday of September).
function movingDay(y, m0, d) {
  if (m0 === 4 && d === nthWeekday(y, 4, 0, 2)) return S('mother', 'Mother’s Day', 'அன்னையர் தினம்', '“Annaiyum pithavum munnari deivam” — mother is the first god we know.', '“அன்னையும் பிதாவும் முன்னறி தெய்வம்” — அம்மாவே நாம் அறிந்த முதல் தெய்வம்.', 'Call your mother or touch her feet today.', 'இன்று அம்மாவை அழையுங்கள் அல்லது அவர் பாதம் தொட்டு வணங்குங்கள்.');
  if (m0 === 5 && d === nthWeekday(y, 5, 0, 3)) return S('father', 'Father’s Day', 'தந்தையர் தினம்', 'A father’s quiet sacrifice builds the whole family.', 'தந்தையின் அமைதியான தியாகமே குடும்பத்தைக் கட்டுகிறது.', 'Thank your father for one thing he did for you.', 'உங்களுக்காக அப்பா செய்த ஒன்றுக்காக அவருக்கு நன்றி சொல்லுங்கள்.');
  if (m0 === 7 && d === nthWeekday(y, 7, 0, 1)) return S('friendship', 'Friendship Day', 'நண்பர்கள் தினம்', 'A true friend is a gift from God — cherish yours.', 'உண்மையான நண்பர் இறைவனின் பரிசு — உங்கள் நண்பர்களைப் போற்றுங்கள்.', 'Call an old friend today.', 'இன்று ஒரு பழைய நண்பரை அழையுங்கள்.');
  if (m0 === 8 && d === nthWeekday(y, 8, 0, 4)) return S('daughters', 'Daughters’ Day', 'மகள்கள் தினம்', 'Daughters are the light of the home.', 'மகள்கள் வீட்டின் விளக்கு.', 'Tell your daughter you are proud of her.', 'உங்கள் மகளைப் பற்றிப் பெருமைப்படுவதாகச் சொல்லுங்கள்.');
  return null;
}
/** The special day on a date ("YYYY-MM-DD"), or null. */
export function specialDay(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return movingDay(y, m - 1, d) || FIXED[`${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`] || null;
}

// ---------------------------------------------------------------- a good thought for ordinary days
// Thirukkural couplets (with their meaning) and simple good-life thoughts, one per day in turn.
export const THOUGHTS = Object.freeze([
  T('“Learn thoroughly what is worth learning, then live by it.” — Thirukkural 391', '“கற்க கசடறக் கற்பவை கற்றபின் நிற்க அதற்குத் தக” — திருக்குறள் 391'),
  T('A kind word costs nothing and can change someone’s whole day.', 'ஒரு அன்பான வார்த்தைக்கு விலை இல்லை; அது ஒருவரின் நாளையே மாற்றும்.'),
  T('“Speaking harsh words when sweet ones are there is like choosing raw fruit over ripe.” — Thirukkural 100', '“இனிய உளவாக இன்னாத கூறல் கனியிருப்பக் காய்கவர்ந் தற்று” — திருக்குறள் 100'),
  T('Gratitude turns what we have into enough.', 'நன்றியுணர்வு, இருப்பதையே நிறைவாக்கும்.'),
  T('“Answer those who hurt you with kindness, and let them feel ashamed.” — Thirukkural 314', '“இன்னாசெய் தாரை ஒறுத்தல் அவர்நாண நன்னயம் செய்து விடல்” — திருக்குறள் 314'),
  T('Start small, start today — the steps add up.', 'சிறியதாக, இன்றே தொடங்குங்கள் — அடிகள் சேர்ந்து பயணமாகும்.'),
  T('“Those with love give even their bones to others.” — Thirukkural 72', '“அன்பிலார் எல்லாம் தமக்குரியர் அன்புடையார் என்பும் உரியர் பிறர்க்கு” — திருக்குறள் 72'),
  T('Respect your elders; their blessings travel with you.', 'பெரியோரை மதியுங்கள்; அவர்களின் ஆசி உங்களுடன் பயணிக்கும்.'),
  T('“There is escape for every wrong, but none for forgetting a kindness.” — Thirukkural 110', '“எந்நன்றி கொன்றார்க்கும் உய்வுண்டாம் உய்வில்லை செய்ந்நன்றி கொன்ற மகற்கு” — திருக்குறள் 110'),
  T('A calm mind makes better decisions than a hurried one.', 'அவசரமான மனதை விட அமைதியான மனமே நல்ல முடிவெடுக்கும்.'),
  T('“Theethum nandrum pirar thara vaaraa” — good and bad come from our own actions.', '“தீதும் நன்றும் பிறர்தர வாரா” — நன்மையும் தீமையும் நம் செயலாலேயே வருகின்றன.'),
  T('Help one person today without expecting anything back.', 'இன்று எதையும் எதிர்பாராமல் ஒருவருக்கு உதவுங்கள்.'),
  T('Your health is your first wealth — walk, rest and eat simple.', 'ஆரோக்கியமே முதல் செல்வம் — நடங்கள், ஓய்வெடுங்கள், எளிதாக உண்ணுங்கள்.'),
  T('Listen more than you speak; people feel valued.', 'பேசுவதை விட அதிகம் கேளுங்கள்; மக்கள் மதிக்கப்பட்டதாக உணர்வார்கள்.'),
  T('Every sunrise is a new chance to begin again.', 'ஒவ்வொரு சூரிய உதயமும் மீண்டும் தொடங்க ஒரு புதிய வாய்ப்பு.'),
]);
const dayIndex = (iso) => Math.floor(Date.UTC(...iso.split('-').map((v, i) => (i === 1 ? Number(v) - 1 : Number(v)))) / 86400000);
export const thoughtFor = (iso) => THOUGHTS[((dayIndex(iso) % THOUGHTS.length) + THOUGHTS.length) % THOUGHTS.length];

// ---------------------------------------------------------------- the day's message
/**
 * Everything for today's Good Day card and message.
 * @param {{ iso: string, td: object (tamilDay), festival?: {name:{en,ta}, line:{en,ta}} | null, goodTime?: string, rahu?: string, star?: {en,ta}, sender?: string, link?: string }} o
 */
export function goodDay({ iso, td, festival = null, goodTime = '', rahu = '', star = null, sender = '', link = DOWNLOAD_URL }) {
  const special = specialDay(iso);
  const rasi = rasiDay(td.moonRasi.index);
  return {
    version: GOOD_DAY_VERSION, iso,
    greeting: T('Good morning!', 'இனிய காலை வணக்கம்!'),
    weekday: td.weekday, tamilDate: T(`${td.tamil.monthEn} ${td.tamil.day}`, `${td.tamil.monthTa} ${td.tamil.day}`),
    festival, special,
    // Festival first (a sacred day), then the special day, else a good thought.
    headline: festival ? festival.name : special ? special.name : T('A good day to you', 'நல்ல நாள் வாழ்த்துகள்'),
    message: festival ? festival.line : special ? special.message : thoughtFor(iso),
    // On a festival that is also a special day, the special day is named with its good deed.
    act: special && festival ? T(`${special.name.en}: ${special.act.en}`, `${special.name.ta}: ${special.act.ta}`) : special?.act || T('Do one kind thing for someone today.', 'இன்று ஒருவருக்கு ஒரு நல்ல செயல் செய்யுங்கள்.'),
    thought: (festival || special) ? thoughtFor(iso) : null,
    star, goodTime, rahu,
    rasi,
    sender, link,
    qr: link ? qrMatrix(link) : null,
  };
}

/** The message text for WhatsApp / Facebook / Instagram captions, in one language. */
export function goodDayText(g, lang = 'ta') {
  const t = (x) => (x ? (lang === 'en' ? x.en : x.ta) : '');
  const L = (en, ta) => (lang === 'en' ? en : ta);
  const lines = [
    `🌅 ${t(g.greeting)}`,
    `${t(g.weekday)} · ${t(g.tamilDate)}`,
    '',
    `✨ ${t(g.headline)}`,
    t(g.message),
    `👉 ${t(g.act)}`,
  ];
  if (g.thought) lines.push('', `💭 ${t(g.thought)}`);
  const day = [g.star ? `${L('Star', 'நட்சத்திரம்')}: ${t(g.star)}` : '', g.goodTime ? `${L('Good time', 'நல்ல நேரம்')}: ${g.goodTime}` : '', g.rahu ? `${L('Rahu Kalam', 'ராகு காலம்')}: ${g.rahu}` : ''].filter(Boolean);
  if (day.length) lines.push('', `📅 ${day.join(' · ')}`);
  lines.push('', `🔮 ${L('Today for the 12 rasis', 'இன்றைய 12 ராசி பலன்')}:`);
  for (const r of g.rasi) lines.push(`${'★'.repeat(r.stars)}${'☆'.repeat(5 - r.stars)} ${t(r.name)} — ${t(r.short)}`);
  lines.push('', g.sender ? L(`With love, ${g.sender} 🙏`, `அன்புடன், ${g.sender} 🙏`) : '🙏');
  if (g.link) lines.push(L(`Get your own daily palan free — Thunai app: ${g.link}`, `உங்கள் தினசரி பலனை இலவசமாகப் பெற — துணை செயலி: ${g.link}`));
  return lines.join('\n');
}

/** QR code modules for a link (true = dark), with error correction M. */
export function qrMatrix(text) {
  const q = qrcode(0, 'M');
  q.addData(text);
  q.make();
  const n = q.getModuleCount();
  return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => q.isDark(r, c)));
}
