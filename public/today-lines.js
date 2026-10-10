// Catchy, positive one-liners for Today, personalised by the birth star (janma nakshatra) and today's
// Gochara of the Moon from the birth rasi (Chandra balam). Short, warm, never fearful.
const T = (en, ta) => ({ en, ta });

export const STAR_LINES = [
  T('Speed and a healing touch are your gifts — take the first step today.', 'வேகமும் குணப்படுத்தும் கரமும் உங்கள் வரம் — இன்று முதல் அடியை நீங்களே எடுங்கள்.'),
  T('You carry responsibility with strength — finish one important task today.', 'பொறுப்பைச் சுமக்கும் வலிமை உங்களுடையது — இன்று ஒரு முக்கிய வேலையை முடித்துவிடுங்கள்.'),
  T('Fire-like clarity is in your words — speak honestly and the way opens.', 'நெருப்பின் தெளிவு உங்கள் சொல்லில் — நேர்மையாகப் பேசுங்கள், வழி திறக்கும்.'),
  T('Beauty and plenty seek you out — win hearts with kind words today.', 'அழகும் வளமும் தேடி வரும் நட்சத்திரம் — இன்று அன்பான சொல்லால் மனங்களை வெல்லுங்கள்.'),
  T('Seeking is your strength — learn one new thing today.', 'தேடலே உங்கள் சக்தி — இன்று புதிதாக ஒன்றைக் கற்றுக்கொள்ளுங்கள்.'),
  T('After the storm comes the new — make room for a fresh idea today.', 'புயலுக்குப் பின் புதுமை — இன்று புதிய சிந்தனைக்கு இடம் கொடுங்கள்.'),
  T('Rising again with hope is your nature — restart what you paused.', 'மீண்டும் எழும் நம்பிக்கை உங்கள் இயல்பு — நிறுத்திய வேலையை மறுபடி தொடங்குங்கள்.'),
  T('Yours is the nurturing hand — helping someone today helps you too.', 'வளர்க்கும் கரம் உங்களுடையது — இன்று ஒருவருக்கு உதவுவது உங்களுக்கே நன்மை.'),
  T('A sharp mind is your tool — think calmly, then decide.', 'கூர்மையான அறிவு உங்கள் ஆயுதம் — நிதானமாக யோசித்து முடிவெடுங்கள்.'),
  T('“Born in Magam, rules the world” — lead with kindness today.', '“மகத்தில் பிறந்தவர் ஜகத்தை ஆள்வார்” — இன்று தலைமையை அன்புடன் காட்டுங்கள்.'),
  T('You spread joy — spend sweet time with family today.', 'மகிழ்ச்சியைப் பரப்பும் நட்சத்திரம் — இன்று குடும்பத்துடன் இனிமையாகப் பொழுதைச் செலவிடுங்கள்.'),
  T('A helping heart and a firm word — keep your promise today.', 'உதவும் உள்ளம், உறுதியான சொல் — இன்று கொடுத்த வாக்கைக் காப்பாற்றுங்கள்.'),
  T('Skilful hands bring results — your craft shines today.', 'கைத்திறன் கொண்ட நட்சத்திரம் — இன்று உங்கள் கைவண்ணம் பலன் தரும்.'),
  T('You create beautifully — finish your work with finesse today.', 'அழகாகப் படைக்கும் கலைஞர் நீங்கள் — இன்று வேலையை நேர்த்தியாக முடியுங்கள்.'),
  T('Free as the breeze — make balanced decisions today.', 'சுதந்திரக் காற்றே உங்கள் பலம் — இன்று சமநிலையுடன் முடிவெடுங்கள்.'),
  T('Focused on the goal — take one step towards it today.', 'இலக்கை நோக்கிய உறுதி — இன்று குறிக்கோளை நோக்கி ஓர் அடி எடுங்கள்.'),
  T('Friendship is your wealth — call an old friend today.', 'நட்பே உங்கள் செல்வம் — இன்று பழைய நண்பருடன் பேசுங்கள்.'),
  T('You protect and provide — a caring decision for family today.', 'பொறுப்பும் பாதுகாப்பும் உங்கள் குணம் — இன்று குடும்பத்தைக் காக்கும் முடிவை எடுங்கள்.'),
  T('You reach the root of things — solve a problem at its source today.', 'வேர் வரை சென்று உண்மை காணும் நட்சத்திரம் — இன்று பிரச்சினையை அதன் மூலத்தில் தீருங்கள்.'),
  T('Unbeatable zeal is yours — move ahead without hesitation.', 'வெல்ல முடியாத ஊக்கம் உங்களுடையது — இன்று தயங்காமல் முன்னேறுங்கள்.'),
  T('Lasting success is your path — patient work pays off today.', 'நிலையான வெற்றியே உங்கள் பாதை — இன்று பொறுமையான உழைப்புக்குப் பலன் நிச்சயம்.'),
  T('Wisdom through listening — hear others carefully today.', 'கேட்டு அறியும் ஞானம் — இன்று பிறர் சொல்வதைக் கவனமாகக் கேளுங்கள்.'),
  T('“Born in Avittam, even a bran pot turns to gold” — effort becomes wealth.', '“அவிட்டத்தில் பிறந்தால் தவிட்டுப் பானையும் தங்கம்” — இன்று உழைப்பு செல்வமாகும்.'),
  T('The star of a hundred healers — nourish body and mind today.', 'நூறு மருந்தின் நட்சத்திரம் — இன்று உடலுக்கும் மனதுக்கும் நலம் சேருங்கள்.'),
  T('Deep thought and generosity are your strength — support a good cause.', 'ஆழ்ந்த சிந்தனையும் தியாகமும் உங்கள் பலம் — இன்று ஒரு நல்ல காரியத்திற்கு உதவுங்கள்.'),
  T('Quiet depth is your power — calmness brings success today.', 'அமைதியான ஆழமே உங்கள் சக்தி — இன்று நிதானம் வெற்றி தரும்.'),
  T('The star that guards every journey — love and kindness guide you.', 'பயணத்தைக் காக்கும் நட்சத்திரம் — இன்று அன்பும் கருணையும் வழிகாட்டும்.'),
];

/** Moon's house from the birth rasi today (1–12) → a short Gochara line. */
const MOON_FROM_RASI = {
  1: T('The Moon is in your own rasi — trust your feelings, rest well.', 'சந்திரன் உங்கள் ராசியிலேயே — உள்ளுணர்வை நம்புங்கள், நன்கு ஓய்வெடுங்கள்.'),
  2: T('Moon in the 2nd — sweet words bring money and goodwill.', 'சந்திரன் 2-ல் — இனிய சொல் பணமும் நல்லெண்ணமும் தரும்.'),
  3: T('Moon in the 3rd — courage is high; finish pending calls and errands.', 'சந்திரன் 3-ல் — தைரியம் உயர்வு; நிலுவை வேலைகளை முடியுங்கள்.'),
  4: T('Moon in the 4th — home and mother bring comfort today.', 'சந்திரன் 4-ல் — வீடும் தாயும் இன்று ஆறுதல் தருவர்.'),
  5: T('Moon in the 5th — good for learning, children and prayer.', 'சந்திரன் 5-ல் — கல்வி, குழந்தைகள், வழிபாட்டுக்கு நல்லது.'),
  6: T('Moon in the 6th — you overcome obstacles; health routines shine.', 'சந்திரன் 6-ல் — தடைகளை வெல்வீர்கள்; உடல்நல வழக்கம் பலன் தரும்.'),
  7: T('Moon in the 7th — partnerships and meetings go well.', 'சந்திரன் 7-ல் — கூட்டு முயற்சி, சந்திப்புகள் சிறக்கும்.'),
  8: T('Moon in the 8th (Chandrashtamam) — go slow, keep calm; it passes soon.', 'சந்திரன் 8-ல் (சந்திராஷ்டமம்) — நிதானம், அமைதி; விரைவில் கடந்துவிடும்.'),
  9: T('Moon in the 9th — blessings of elders and fortune are with you.', 'சந்திரன் 9-ல் — பெரியோர் ஆசியும் பாக்கியமும் உங்களுடன்.'),
  10: T('Moon in the 10th — work gets noticed; give your best.', 'சந்திரன் 10-ல் — உழைப்பு கவனிக்கப்படும்; முழு முயற்சி தாருங்கள்.'),
  11: T('Moon in the 11th — gains and good news are likely.', 'சந்திரன் 11-ல் — லாபமும் நல்ல செய்தியும் வரலாம்.'),
  12: T('Moon in the 12th — a quiet day for prayer, rest and giving.', 'சந்திரன் 12-ல் — வழிபாடு, ஓய்வு, தானத்திற்கான அமைதியான நாள்.'),
};

export function todayLines(chart, snap) {
  const star = chart.janmaNakshatra.index;
  const pos = ((snap.moonRasi.index - chart.janmaRasi.index + 12) % 12) + 1;
  return { star: STAR_LINES[star], moon: MOON_FROM_RASI[pos], pos };
}
