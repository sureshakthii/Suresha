// The 24 named Ekadasis (+2 in an adhika month). Named on the amanta lunar month used by spiritual-kb.js:
// a Shukla Ekadasi takes the name of its own month; a Krishna Ekadasi in amanta month m carries the
// purnimanta name of month m + 1 (so the same day has the same name in North and South Indian calendars).
import { B, SRC } from './common.js';

// [id, English, Tamil, amanta month, paksha ('S'|'K'), meaning EN, meaning TA, aliases]
const LIST = [
  ['kamada', 'Kamada', 'காமதா', 0, 'S', 'Fulfils sincere wishes; frees from past wrongs.', 'உண்மையான வேண்டுதல்களை நிறைவேற்றும்; பழைய தவறுகளிலிருந்து விடுவிக்கும்.'],
  ['varuthini', 'Varuthini', 'வருதினி', 0, 'K', 'Protective Ekadasi; charity on this day is praised.', 'காக்கும் ஏகாதசி; இன்றைய தானம் போற்றப்படுகிறது.'],
  ['mohini', 'Mohini', 'மோகினி', 1, 'S', 'Remembers Vishnu as Mohini, who shared the nectar with the devas.', 'தேவர்களுக்கு அமுதம் பகிர்ந்த மோகினி அவதாரம்.'],
  ['apara', 'Apara (Achala)', 'அபரா', 1, 'K', 'Said to grant boundless merit and a good name.', 'அளவற்ற புண்ணியமும் நற்பெயரும் தரும் என்பது நம்பிக்கை.'],
  ['nirjala', 'Nirjala (Bhima)', 'நிர்ஜலா', 2, 'S', 'Kept without water by Bhima for the merit of all Ekadasis — only for healthy adults; others drink water.', 'எல்லா ஏகாதசிப் பலனுக்காக பீமன் நீரின்றி இருந்த ஏகாதசி — ஆரோக்கியமான பெரியவர்களுக்கு மட்டும்; மற்றவர்கள் நீர் அருந்தலாம்.', ['bhima ekadasi', 'பீம ஏகாதசி']],
  ['yogini', 'Yogini', 'யோகினி', 2, 'K', 'Associated with healing and peace of body.', 'உடல் நலமும் அமைதியும் தொடர்புடையது.'],
  ['shayani', 'Devshayani (Shayani)', 'சயனி (தேவசயனி)', 3, 'S', 'Vishnu begins His yoga-sleep; Chaturmasya starts.', 'திருமால் யோக நித்திரை தொடங்கும் நாள்; சாதுர்மாஸ்யத் தொடக்கம்.', ['devshayani', 'ashadhi ekadasi', 'ஆஷாடி ஏகாதசி']],
  ['kamika', 'Kamika', 'காமிகா', 3, 'K', 'Tulasi worship on this day is especially praised.', 'இன்று துளசி வழிபாடு சிறப்பு.'],
  ['shravana-putrada', 'Putrada (Shravana)', 'புத்ரதா (ச்ராவண)', 4, 'S', 'Prayers for children and their welfare.', 'குழந்தைப் பேறு, குழந்தைகள் நலனுக்கான வேண்டுதல்.', ['pavitra ekadasi', 'பவித்ர ஏகாதசி']],
  ['aja', 'Aja (Annada)', 'அஜா', 4, 'K', 'King Harischandra’s trials ended after this Ekadasi, tradition says.', 'அரிச்சந்திரனின் சோதனைகள் இந்த ஏகாதசிக்குப் பின் முடிந்தன என்பது மரபு.'],
  ['parivartini', 'Parivartini (Parsva)', 'பரிவர்த்தினி', 5, 'S', 'Vishnu turns on His side in yoga-sleep; Vamana is remembered.', 'யோக நித்திரையில் திருமால் பக்கம் திரும்பும் நாள்; வாமனர் நினைவு.', ['parsva ekadasi', 'vamana ekadasi']],
  ['indira', 'Indira', 'இந்திரா', 5, 'K', 'Falls in Mahalaya Paksham; observed for ancestors’ peace.', 'மகாளய பட்சத்தில் வருவது; முன்னோர் அமைதிக்காக.'],
  ['papankusha', 'Papankusha', 'பாபாங்குசா', 6, 'S', 'The “goad” that restrains wrongdoing; follows Vijayadasami.', 'தீமையைக் கட்டுப்படுத்தும் அங்குசம்; விஜயதசமிக்குப் பின்.'],
  ['rama', 'Rama', 'ரமா', 6, 'K', 'Named after Lakshmi (Rama); just before Deepavali.', 'லட்சுமியின் (ரமா) பெயர்; தீபாவளிக்கு முன்.'],
  ['prabodhini', 'Prabodhini (Utthana)', 'பிரபோதினி (உத்தான)', 7, 'S', 'Vishnu wakes from yoga-sleep; Tulasi Kalyanam follows.', 'திருமால் யோக நித்திரையிலிருந்து எழும் நாள்; துளசி கல்யாணம் தொடரும்.', ['utthana ekadasi', 'devuthani ekadasi', 'kaisika ekadasi', 'கைசிக ஏகாதசி']],
  ['utpanna', 'Utpanna', 'உத்பன்னா', 7, 'K', 'The day the Ekadasi goddess first appeared and defeated Mura.', 'ஏகாதசி தேவி முதன்முதலில் தோன்றி முரனை வென்ற நாள்.'],
  ['mokshada', 'Mokshada', 'மோக்ஷதா', 8, 'S', 'Gita Jayanthi; usually Vaikunta Ekadasi in Tamil Nadu.', 'கீதா ஜெயந்தி; தமிழ்நாட்டில் பெரும்பாலும் வைகுண்ட ஏகாதசி.'],
  ['saphala', 'Saphala', 'சபலா', 8, 'K', 'Makes efforts fruitful, tradition says.', 'முயற்சிகளுக்குப் பலன் தரும் என்பது மரபு.'],
  ['pausha-putrada', 'Putrada (Pausha)', 'புத்ரதா (பௌஷ)', 9, 'S', 'Prayers for children; can be Vaikunta Ekadasi in some years.', 'குழந்தைகளுக்கான வேண்டுதல்; சில ஆண்டுகள் வைகுண்ட ஏகாதசியாகவும் வரும்.'],
  ['shattila', 'Shattila', 'ஷட்திலா', 9, 'K', 'Sesame (til) is used in six ways — bath, food, charity.', 'எள் ஆறு விதமாகப் பயன்படும் — நீராடல், உணவு, தானம்.'],
  ['jaya', 'Jaya (Bhishma Ekadasi)', 'ஜயா (பீஷ்ம ஏகாதசி)', 10, 'S', 'Linked with Bhishma and the Vishnu Sahasranamam.', 'பீஷ்மர், விஷ்ணு சகஸ்ரநாமத்துடன் தொடர்புடையது.', ['bhishma ekadasi', 'பீஷ்ம ஏகாதசி']],
  ['vijaya', 'Vijaya', 'விஜயா', 10, 'K', 'Rama is said to have kept it before crossing to Lanka — for success in good efforts.', 'இலங்கை செல்லும் முன் ராமர் கடைப்பிடித்ததாகக் கூறப்படுவது — நல்ல முயற்சிகளில் வெற்றிக்கு.'],
  ['amalaki', 'Amalaki', 'ஆமலகி', 11, 'S', 'The amla (nellikkai) tree is worshipped.', 'நெல்லி மரம் வழிபடப்படும்.'],
  ['papamochani', 'Papamochani', 'பாபமோசனி', 11, 'K', 'Releases from wrongdoing; the last Ekadasi of the lunar year.', 'தவறுகளிலிருந்து விடுவிக்கும்; சந்திர ஆண்டின் கடைசி ஏகாதசி.'],
];

const ALL_MONTHS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

const make = ([id, en, ta, month, paksha, mEn, mTa, extra = []], adhika = false) => ({
  id: `ekadasi-${id}`, kind: 'ekadasi', fast: true, mantra: 'narayana', listed: false,
  names: B(`${en} Ekadasi`, `${ta} ஏகாதசி`),
  aliases: [`${en.split(' (')[0].toLowerCase()} ekadasi`, `${en.split(' (')[0].toLowerCase()} ekadashi`, `${ta.split(' (')[0]} ஏகாதசி`, ...extra],
  deity: B('Lord Vishnu', 'திருமால்'),
  rule: { tithi: paksha === 'S' ? 10 : 25, at: 'sunrise', lunar: adhika ? ALL_MONTHS : [month], adhika },
  ruleText: B(`${paksha === 'S' ? 'Shukla (waxing)' : 'Krishna (waning)'} Ekadasi of the ${adhika ? 'adhika (extra) lunar month' : `lunar month ${['Chaitra', 'Vaisakha', 'Jyeshtha', 'Ashadha', 'Shravana', 'Bhadrapada', 'Ashvayuja', 'Kartika', 'Margashirsha', 'Pausha', 'Magha', 'Phalguna'][month]} (amanta)`}.`,
    `${adhika ? 'அதிக (கூடுதல்) சந்திர மாதத்தின்' : `${['சைத்ர', 'வைகாச', 'ஜ்யேஷ்ட', 'ஆஷாட', 'ச்ராவண', 'பாத்ரபத', 'ஆச்வயுஜ', 'கார்த்திக', 'மார்கசீர்ஷ', 'பௌஷ', 'மாக', 'பால்குன'][month]} (அமாந்த) மாதத்தின்`} ${paksha === 'S' ? 'வளர்பிறை' : 'தேய்பிறை'} ஏகாதசி.`),
  line: B(mEn, mTa),
  why: B(`${en} Ekadasi: ${mEn} Like every Ekadasi, it is a day of prayer to Vishnu and of light or no food as health allows.`, `${ta} ஏகாதசி: ${mTa} எல்லா ஏகாதசி போலவே திருமால் வழிபாடும், உடல்நிலைக்கு ஏற்ப லேசான உணவு அல்லது விரதமும் உரிய நாள்.`),
  how: B(['Observe as any Ekadasi: avoid rice, pray to Perumal with tulasi, break the fast on Dwadasi morning.'], ['எல்லா ஏகாதசி போலவே: அரிசி தவிர்த்து, துளசியுடன் பெருமாள் வழிபாடு, துவாதசி காலை விரதம் முடித்தல்.']),
  see: ['ekadasi'], sources: SRC,
});

export const EKADASIS = [
  ...LIST.map((x) => make(x)),
  make(['padmini', 'Padmini (Kamala)', 'பத்மினி', 0, 'S', 'Shukla Ekadasi of an adhika (extra) month — comes about once in three years.', 'அதிக மாத வளர்பிறை ஏகாதசி — மூன்று ஆண்டுக்கு ஒருமுறை.', ['kamala ekadasi', 'adhika ekadasi']], true),
  make(['parama', 'Parama', 'பரமா', 0, 'K', 'Krishna Ekadasi of an adhika month.', 'அதிக மாதத் தேய்பிறை ஏகாதசி.'], true),
];
