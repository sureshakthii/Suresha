// Faith-aware wording (நம்பிக்கை). The person can choose their faith in the profile; when they leave it on
// "Auto", a common-name hint is used. The hint only changes greetings and prayer wording — it never changes
// any calculation, and the person can correct it at any time in the profile.
const T = (en, ta) => ({ en, ta });

const CHRISTIAN = /\b(john|johnson|mary|joseph|thomas|david|peter|paul|antony|anthony|xavier|christopher|christy|christina|christ|jesus|james|jacob|daniel|samuel|stephen|francis|george|sebastian|benjamin|abraham|isaac|moses|michael|gabriel|raphael|matthew|mark|luke|philip|andrew|simon|jude|lazar|lawrence|vincent|robert|richard|william|charles|edward|henry|albert|alfred|arul ?dass|arulraj|jebaraj|jeba|selvaraj ?jeba|immanuel|emmanuel|jesuraj|yesu|anbu ?raj|fernando|fernandez|d'?souza|dsouza|rodrigues|pereira|lobo|gomes|mendis|helen|elizabeth|rachel|rebecca|sarah|esther|ruth|grace|angel|jennifer|catherine|teresa|theresa|agnes|jessie|jasmine ?mary|beulah|shiny|sharon)\b/i;
const MUSLIM = /\b(mohammed|muhammad|mohamed|mohammad|mohd|ahmed|ahmad|abdul|abdullah|rahman|rahim|rasheed|rashid|ibrahim|ismail|yusuf|yousuf|younus|khan|syed|sayed|sheikh|shaikh|ali|hussain|hussein|hasan|hassan|imran|irfan|farhan|faisal|feroz|firoz|nawaz|nazeer|nizam|riyaz|riaz|salim|saleem|shahul|hameed|hamid|jaffer|jafar|kareem|karim|mustafa|zakir|zubair|aslam|asif|arif|anwar|akbar|aziz|basheer|bashir|fathima|fatima|ayesha|aisha|zainab|zainab|nasreen|nasrin|shabana|shahana|sameena|salma|rukhsar|parveen|farida|hajira|khadija|mariam|maryam|noor|nur|ameena|amina|haseena|rehana|reshma|sultana|tasneem|yasmin|yasmeen|zareena|zubeida)\b/i;

/** 'christian' | 'muslim' | null — a hint from common given names / surnames only. */
export function guessFaith(name = '') {
  const n = String(name);
  if (MUSLIM.test(n)) return 'muslim';
  if (CHRISTIAN.test(n)) return 'christian';
  return null;
}

/** The faith used for wording: the person's own choice, else the name hint, else Hindu tradition. */
export function faithOf(member) {
  const f = member?.faith;
  if (f && f !== 'auto') return f;
  return guessFaith(`${member?.name || ''} ${member?.nameTa || ''}`) || 'hindu';
}

export const FAITHS = [
  ['auto', 'Auto (from name)', 'தானியங்கி (பெயரிலிருந்து)'], ['hindu', 'Hindu', 'இந்து'], ['christian', 'Christian', 'கிறிஸ்தவர்'],
  ['muslim', 'Muslim', 'இஸ்லாமியர்'], ['other', 'Other / all faiths', 'பிற / அனைத்து நம்பிக்கைகள்'], ['none', 'Prefer not to say', 'சொல்ல விரும்பவில்லை'],
];

/** Respectful welcome shown on the Today screen for people of other faiths. */
export function faithWelcome(faith, name = '') {
  if (!faith || faith === 'hindu') return null;
  const who = name ? `, ${name}` : '';
  return T(
    `Warm welcome${who}! We are all children of one universe. Thank you for trusting the Indian astrological tradition — Thunai respects your faith and gives you honest guidance, never anything against your belief.`,
    `அன்புடன் வரவேற்கிறோம்${who}! நாம் அனைவரும் ஒரே பிரபஞ்சத்தின் குழந்தைகள். இந்திய ஜோதிட மரபின் மீது நீங்கள் வைத்த நம்பிக்கைக்கு நன்றி — துணை உங்கள் மத நம்பிக்கையை மதித்து, அதற்கு மாறாக எதுவும் சொல்லாமல், நேர்மையான வழிகாட்டலைத் தரும்.`,
  );
}

/** Closing blessing in the person's own faith (replaces the Hindu deity prayer). */
export function faithBlessing(faith) {
  return {
    christian: T('🙏 May God bless you and guide your path.', '🙏 கர்த்தர் உங்களை ஆசீர்வதித்து வழிநடத்துவாராக.'),
    muslim: T('🤲 May Allah grant you peace, health and success.', '🤲 இறைவன் (அல்லாஹ்) உங்களுக்கு அமைதி, ஆரோக்கியம், வெற்றி அருள்வானாக.'),
    other: T('🙏 May the Divine bless you with peace and strength.', '🙏 இறையருள் உங்களுக்கு அமைதியும் வலிமையும் தரட்டும்.'),
    none: T('🌿 Wishing you peace, health and success.', '🌿 அமைதி, ஆரோக்கியம், வெற்றி உங்களுக்குக் கிடைக்கட்டும்.'),
  }[faith] || null;
}

/** A practice that fits every faith, by the planet that needs support. */
export function universalPractice(planet) {
  const P = {
    Sun: T('Respect your father and elders; help someone in authority do good work; morning sunlight walk.', 'தந்தை, பெரியோரை மதியுங்கள்; காலை சூரிய ஒளியில் நடை.'),
    Moon: T('Spend calm time with your mother; give water or milk to the needy; quiet prayer before sleep.', 'தாயுடன் அமைதியான நேரம்; தேவைப்படுவோருக்கு நீர் / பால் தானம்; உறங்கும் முன் அமைதியான பிரார்த்தனை.'),
    Mars: T('Help siblings; donate blood if you can; control anger with a short pause.', 'உடன்பிறந்தோருக்கு உதவுங்கள்; முடிந்தால் ரத்த தானம்; கோபத்தில் சற்று நிதானம்.'),
    Mercury: T('Teach or help a student; give books or stationery; speak truthfully.', 'மாணவருக்கு உதவுங்கள்; புத்தகம் / எழுதுபொருள் தானம்; உண்மையே பேசுங்கள்.'),
    Jupiter: T('Honour your teachers; give food to the hungry; read your holy book a little each day.', 'ஆசிரியர்களை மதியுங்கள்; பசித்தோருக்கு உணவு; தினமும் உங்கள் புனித நூலைச் சிறிது வாசியுங்கள்.'),
    Venus: T('Keep your home clean and peaceful; support women in need; kind words at home.', 'வீட்டைச் சுத்தமாக, அமைதியாக வைத்திருங்கள்; தேவையுள்ள பெண்களுக்கு உதவுங்கள்; வீட்டில் இனிய சொல்.'),
    Saturn: T('Serve the elderly and workers; be punctual; charity on Saturday.', 'முதியோர், உழைப்பாளிகளுக்குச் சேவை; நேரந்தவறாமை; சனிக்கிழமை தானம்.'),
    Rahu: T('Avoid shortcuts and rumours; help the poor and the sick.', 'குறுக்கு வழி, வதந்தி தவிர்க்கவும்; ஏழை, நோயாளிகளுக்கு உதவுங்கள்.'),
    Ketu: T('Quiet reflection or meditation; feed animals; forgive old hurts.', 'அமைதியான சிந்தனை / தியானம்; விலங்குகளுக்கு உணவு; பழைய வருத்தங்களை மன்னியுங்கள்.'),
  };
  return P[planet] || T('Prayer in your own faith, charity and kind words.', 'உங்கள் நம்பிக்கைப்படி பிரார்த்தனை, தானம், இனிய சொல்.');
}
