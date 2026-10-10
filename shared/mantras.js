// Traditional mantras (public domain) in Tamil script with transliteration and meaning.
// `for` lists the situations each is commonly chanted for; `planet` links to Navagraha parigaram.
const M = (id, titleEn, titleTa, text, translit, meaningEn, meaningTa, forTags, planet = null) => ({
  id, title: { en: titleEn, ta: titleTa }, text, translit, meaning: { en: meaningEn, ta: meaningTa }, for: forTags, planet,
});

export const MANTRAS = [
  M('ganesha', 'Ganesha Mantra', 'விநாயகர் மந்திரம்', 'ஓம் கம் கணபதயே நமஹ', 'Om Gam Ganapataye Namaha',
    'Salutations to Lord Ganesha, remover of obstacles — chant before starting any journey or work.', 'தடைகளை நீக்கும் விநாயகருக்கு வணக்கம் — பயணம், வேலை தொடங்கும் முன்.', ['travel', 'start'], 'Ketu'),
  M('shiva', 'Panchakshara', 'பஞ்சாக்ஷர மந்திரம்', 'ஓம் நமசிவாய', 'Om Namah Shivaya',
    'The five-syllable mantra of Lord Shiva, for peace of mind and protection.', 'சிவபெருமானின் ஐந்தெழுத்து மந்திரம் — மன அமைதி, பாதுகாப்பு.', ['peace', 'travel'], 'Sun'),
  M('murugan', 'Saravanabhava', 'சரவணபவ மந்திரம்', 'ஓம் சரவணபவ', 'Om Saravanabhava',
    'Lord Murugan\'s six-syllable mantra, for courage and victory over difficulties.', 'முருகனின் ஆறெழுத்து மந்திரம் — தைரியம், வெற்றி.', ['courage', 'travel'], 'Mars'),
  M('narayana', 'Ashtakshara', 'அஷ்டாக்ஷர மந்திரம்', 'ஓம் நமோ நாராயணாய', 'Om Namo Narayanaya',
    'The eight-syllable mantra of Lord Vishnu, for protection and prosperity.', 'விஷ்ணுவின் எட்டெழுத்து மந்திரம் — பாதுகாப்பு, செல்வம்.', ['prosperity', 'travel'], 'Mercury'),
  M('rama', 'Rama Nama (Travel protection)', 'ராம நாமம் (பயணப் பாதுகாப்பு)', 'ஸ்ரீ ராம ஜெய ராம ஜெய ஜெய ராம', 'Sri Rama Jaya Rama Jaya Jaya Rama',
    'The Taraka mantra; chanted for safe travel with Lord Anjaneya\'s blessing.', 'தாரக மந்திரம்; ஆஞ்சநேயர் அருளுடன் பாதுகாப்பான பயணம்.', ['travel', 'courage'], 'Saturn'),
  M('lakshmi', 'Mahalakshmi Mantra', 'மகாலட்சுமி மந்திரம்', 'ஓம் ஸ்ரீ மகாலட்சுமியை நமஹ', 'Om Shri Mahalakshmiyai Namaha',
    'For wealth, harmony at home and abundance.', 'செல்வம், வீட்டில் இணக்கம், வளம்.', ['prosperity'], 'Venus'),
  M('durga', 'Durga Mantra', 'துர்க்கை மந்திரம்', 'ஓம் துர்காயை நமஹ', 'Om Durgayai Namaha',
    'For protection from fear and negativity; recommended for Rahu.', 'பயம், எதிர்மறையிலிருந்து பாதுகாப்பு; ராகு பரிகாரம்.', ['courage', 'peace'], 'Rahu'),
  M('ambal', 'Ambal Mantra', 'அம்பாள் மந்திரம்', 'ஓம் சக்தி பராசக்தி', 'Om Shakti Parashakti',
    'Invocation of the Divine Mother for strength and a calm mind.', 'அன்னை பராசக்தியின் அருள் — பலம், மன அமைதி.', ['peace'], 'Moon'),
  M('guru', 'Dakshinamurthy Mantra', 'தட்சிணாமூர்த்தி மந்திரம்', 'ஓம் குருவே நமஹ', 'Om Guruve Namaha',
    'For wisdom, learning and Guru\'s grace.', 'ஞானம், கல்வி, குரு அருள்.', ['learning'], 'Jupiter'),
  M('gayatri', 'Gayatri Mantra', 'காயத்ரி மந்திரம்', 'ஓம் பூர் புவஸ் ஸுவஹ தத் ஸவிதுர் வரேண்யம் பர்கோ தேவஸ்ய தீமஹி தியோ யோ நஃ ப்ரசோதயாத்',
    'Om Bhur Bhuvas Suvaha Tat Savitur Varenyam Bhargo Devasya Dheemahi Dhiyo Yo Nah Prachodayat',
    'We meditate on the divine light of the Sun; may it inspire our minds.', 'சூரியனின் தெய்வீக ஒளியைத் தியானிக்கிறோம்; அது எங்கள் அறிவைத் தூண்டட்டும்.', ['learning', 'peace'], 'Sun'),
  M('mrityunjaya', 'Maha Mrityunjaya Mantra', 'மகா மிருத்யுஞ்ஜய மந்திரம்', 'ஓம் த்ர்யம்பகம் யஜாமஹே ஸுகந்திம் புஷ்டி வர்தனம் உர்வாருகமிவ பந்தனான் ம்ருத்யோர் முக்ஷீய மாம்ருதாத்',
    'Om Tryambakam Yajamahe Sugandhim Pushti Vardhanam Urvarukamiva Bandhanan Mrityor Mukshiya Maamritat',
    'A prayer to Lord Shiva for peace, strength and well-being. It is a prayer, not a treatment.', 'அமைதி, மன வலிமை, நலனுக்கான சிவ பிரார்த்தனை. இது பிரார்த்தனை மட்டுமே, சிகிச்சை அல்ல.', ['health'], 'Moon'),
  M('navagraha', 'Navagraha Mantra', 'நவகிரக மந்திரம்', 'ஆதித்யாய ச சோமாய மங்களாய புதாய ச குரு சுக்ர சனிப்யஶ்ச ராஹவே கேதவே நமஹ',
    'Adityaya cha Somaya Mangalaya Budhaya cha Guru Shukra Shanibhyashcha Rahave Ketave Namaha',
    'Salutations to all nine planets — for balance of every graha.', 'ஒன்பது கிரகங்களுக்கும் வணக்கம் — அனைத்து கிரகங்களின் சமநிலைக்கு.', ['peace', 'travel'], null),
];

export const MANTRA_TAGS = [
  { id: 'travel', en: 'Travel', ta: 'பயணம்' },
  { id: 'health', en: 'Health', ta: 'ஆரோக்கியம்' },
  { id: 'prosperity', en: 'Prosperity', ta: 'செல்வம்' },
  { id: 'peace', en: 'Peace', ta: 'அமைதி' },
  { id: 'courage', en: 'Courage', ta: 'தைரியம்' },
  { id: 'learning', en: 'Learning', ta: 'கல்வி' },
];
