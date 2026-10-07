// Ask Thunai — what KIND of question was asked (on top of the topic), in Tamil script, Tanglish and English.
// The answer's first line and the order of its sections follow this type (public/ask-thunai.js):
//   which  — "எந்தத் தொழில்", "entha business", "which field", "what kind of"   → the actual choices first, with reasons
//   when   — "எப்போது", "eppo", "when", "which year"                         → dates first
//   will   — "கிடைக்குமா", "nadakkuma", "will I", "is there"                   → a calibrated statement (never a promise)
//   why    — "ஏன்", "yen", "why", "காரணம்"                                    → the chart's reasons first
//   how    — "எப்படி", "eppadi", "how can I", "what should I do", "என்ன செய்ய"  → practical steps first
//   choice — "A or B", "should I", "pannalama", "-லாமா"                        → a comparison / decision frame
//   status — "how is my …", "எப்படி இருக்கும்", "jathagam enna solludhu"        → the running period's label first
// Pure functions: no chart, no DOM. Also: the sub-topic (promotion vs salary vs transfer …), the "which" kind
// (career field, business, direction, partner nature, study stream, day / colour / number, god, gem), questions
// about another person, factual non-astrology questions, and a deterministic per-question seed for phrasing.

export const norm = (text) => String(text || '').normalize('NFC').toLowerCase().replace(/([a-z])\1{2,}/g, '$1$1').replace(/\s+/g, ' ').trim();

// ------------------------------------------------------------------ question type
// "which year / month / age / period / time" is a WHEN question, not a WHICH question.
const WHEN_WHICH = /\b(which|what|endha|entha|enda|edhu|ethu)\s+(year|month|age|period|time|date|dasa|bhukti|varush\w*|varud\w*|maasa\w*|maadha\w*|vayas\w*|kaala\w*|neram|naal|thethi)\b|\b(time|period|date|year|month|naal|neram|kaalam|muhurtham)\s+(edhu|ethu|which)\b|(எந்த|எது)\s*(ஆண்டு|வருட|மாத|வயது|காலம்|காலத்|நேரம்|தசை|புக்தி|நாள்|தேதி)|(நேரம்|காலம்|நாள்|தேதி|முகூர்த்தம்)\s*எது|(நல்ல|உகந்த|ஏற்ற|சுப|சிறந்த) (நாள்|நேரம்|காலம்|தேதி)/;
const WHICH = /\b(which|what kind|what type|what sort|what field|what career|what business|what job|what profession|what course|what subject|what stream|what colou?r|what number|what gem|what stone|what line|kind of|type of|endha|entha|enda|yendha|yentha|edhu|ethu|yedhu)\b|எந்த|எது|எவை|எந்தெந்த|எப்படிப்பட்ட|என்ன மாதிரி|enna maathiri|enna madhiri/;
// "enna" + a category noun is a WHICH question ("enna tholil", "என்ன தொழில்"); "enna pannanum" is HOW.
const ENNA_WHICH = /\bwhat will\b.{0,40}\b(be like|nature|character)\b|\b(enna|yenna)\s+(tholil|thozhil|business|velai|vela|field|course|padippu|group|niram|colou?r|kal|stone|number|en|line|work|job|career|deivam|kadavul|samy|saami)\b|என்ன\s*(தொழில்|வேலை|படிப்பு|துறை|நிறம்|கல்|ரத்தின|எண்|தெய்வ|பிரிவு)/;
const WHEN = /\bwhen\b|\beppo\w*|\beppa\b|\bepo\b|\beppodhu\b|\beppothu\b|எப்போ|எப்பொழுது|\bwhat age\b|\b(good|best|right|nalla|favou?rable|auspicious|lucky) (time|period|kaalam|neram|naal|date|day|year|month|muhurtham)\b|\bmuhurtham\b|நல்ல நாள்|நல்ல (நேரம்|காலம்)|உகந்த (நேரம்|காலம்)|சாதகமான காலம்|ஏற்ற காலம்/;
const WHY = /\bwhy\b|\byen\b|\byaen\b|\byean\b|ஏன்|\bkaa?ranam\b|காரணம்|enna thadai|thadai enna|என்ன தடை|தடை என்ன|\breason\b|what is (blocking|stopping|delaying)/;
const HOW = /\bhow (can|do|should|to|could)\b|what (should|can|do) (i|we) do|\bwhat\b[\w ]{0,25}\b(can|should) (i|we) do\b|what to do|\bwhat remedy\b|\benna (pann\w*|seiy\w*|seyy\w*|seiv\w*|seyv\w*)|\b(eppadi|epdi|eppidi) (pann\w*|sari|kandupid\w*|maath\w*|theer\w*|seiy\w*|kudu\w*|padik\w*)|என்ன (செய்ய|செய்வது|செய்யலாம்|பண்ண|செய்யவேண்டும்)|எப்படி (சரி|தீர்|கண்டுபிடி|மாற்ற|செய்|படிக்க|பெறுவது)|kandupidikk?ir?adhu|கண்டுபிடிப்பது/;
const STATUS = /\bhow (is|are|was) (my|our|the)\b|\bhow will\b[^?]{0,40}\b(be|go|affect)\b|\bhow('s| is) (it|life|things)\b|எப்படி இருக்க?ும்|எப்படி இருக்கு|எப்படி உள்ளது|எப்படி\??$|\b(eppadi|epdi) (irukk\w*|iruk\w*|irukum|irukkum|irupp\w*|irup\w*)\b|\b(eppadi|epdi)\s*\??$|what does my (horoscope|chart|jathagam) say|(jathagam|jaathagam|jadhagam) enna solludh\w*|ஜாதகம் என்ன சொல்|palan (eppadi|epdi)|பலன் எப்படி|எனக்கு எப்படி|enakku (eppadi|epdi)/;
const SHOULD = /\bshould (i|we)\b|\bshall (i|we)\b|\bcan (i|we) (start|go|buy|take|change|marry|do|move|invest|plan|join|quit|leave)\b|\bis it (good|ok|okay|right|wise|safe|better) (to|for|if)\b|\bis (an? )?[\w-]+( [\w-]+)? (good|right|better) for (me|us)\b|\bgood for (me|us)\??$|\b\w+lama\b|\b\w+laama\b|\b\w+laamaa\b|லாமா|நல்லதா|nallatha|nalladha|nallathaa|\bpoganuma\b|\birukkanuma\b|போகணுமா|இருக்கணுமா|வேண்டுமா/;
const WILL = /\bwill (i|my|we|he|she|it|they|the|our|this)\b|\bam i\b|\bdo i (have|need)\b|\bis there\b|\bare there\b|\bcan i get\b|\bwould i\b|^(is|are|does|do|can|could|has|have|am|was|will)\b|\bindicated\b|\b\w*(uma|umaa|kuma|kkuma|guma|vena|pena|vana|vaana|vaala|vala|aguma|aaguma|aavena|aaguvena|varuma|theeruma|mudiyuma|irukka|iruka|irukkaa|undaa|undha|angala|aangala|udha|kudha|ducha|duchaa)\b|கிடைக்குமா|நடக்குமா|ஆகுமா|வருமா|தீருமா|முடியுமா|ஜெயிக்குமா|உண்டா|இருக்கிறதா|இருக்குமா|இருக்கா|ஆவேனா|வேனா|சரியாகுமா|கைகூடுமா|மாறுமா|அமையுமா|பெறுவேனா|திரும்புமா|வருவாளா|வருவாரா|ஒத்துக்கொள்வார்களா|ா\s*\?|ா\s*$/;

// Options people put side by side ("A or B", "A-ah B-ah", "A illa B", "A அல்லது B"): known pairs only, so that the
// comparison is grounded in the chart. Each entry: [id, regex for side A, regex for side B, labels].
const OR = /\bor\b|\billa(ya|na)?\b|\billai(ya)?\b|அல்லது|இல்லை(யா)?|\bah\b.*\bah\b|\baa\b.*\baa\b|ஆ(\s|,).*ஆ(\s|,|\?|$)|ா(\s|,).*ா(\s|,|\?|$)|\bvs\.?\b|\//;
const PAIRS = [
  { id: 'abroad_home', a: /abroad|foreign|velinaa?d|velinaat|videsh|videsa|overseas|gulf|dubai|singapore|canada|usa|\bus\b|uk\b|australia|வெளிநாடு|வெளிநாட்ட|அயல்நாடு|son'?s place abroad/, b: /\b(here|home|india|native|inga|ingeye|ingayae|ooru|ooril|sontha ?ooru|stay)\b|இங்கே|இங்கேயே|இந்தியா|சொந்த ஊர்|ஊரில்/ },
  { id: 'job_business', a: /\bjob\b|velai|\bvela\b|salary|employ|naukri|வேலை|சம்பள/, b: /business|vyaa?baa?ram|viyabaram|sontha ?(tholil|thozhil)|own (shop|company|firm)|வியாபார|சொந்தத் தொழில்|சொந்த தொழில்/ },
  { id: 'govt_private', a: /govt|government|arasu|அரசு/, b: /private|thaniyar|தனியார்|company/ },
  { id: 'now_wait', a: /\bnow\b|\bippo\w*|இப்போ|இப்பொழுது|this year|indha varusham|இந்த வருட/, b: /\bwait\b|later|kaathiru\w*|apram|appuram|அப்புறம்|காத்திரு|பிறகு|next year|aduththa varusham/ },
  { id: 'love_arranged', a: /\blove\b|kaa?dh?al|காதல்/, b: /arrang|parents|veetla|பெற்றோர்|வீட்டில் பார்/ },
  { id: 'partner_alone', a: /partner|partnership|kootu|கூட்டு/, b: /\balone\b|thaniya|தனியா|own\b|sontham/ },
  { id: 'buy_wait', a: /\bbuy\b|vaang\w*|வாங்க/, b: /\bwait\b|rent|vaadagai|வாடகை|காத்திரு/ },
];
// Study / career fields people name side by side ("IT or teaching", "engineering ah medical ah", "bio or computer").
export const FIELD_WORDS = [
  ['it', /\bit (field|job|company|sector|industry|line|or)\b|\bor it\b|\bi\.t\.?\b|software|computer|\bcs\b|coding|\btech\b/], ['teaching', /teach\w*|teacher|ஆசிரிய|கற்பித்த|vaathi/], ['medicine', /medic\w*|mbbs|doctor|neet|\bbio\b|biology|nursing|டாக்டர்|மருத்துவ/],
  ['engineering', /engineer\w*|\bb\.e\.?\b|b\.?tech|பொறியியல்/], ['accounts', /commerce|b\.?com|\bca\b|account\w*|கணக்கு|வணிகவியல்/], ['law', /\blaw\b|lawyer|llb|சட்ட/],
  ['arts', /\barts?\b|music|film|cinema|dance|கலை|இசை/], ['govt', /govt|government|upsc|tnpsc|civil service|அரசு/], ['finance', /bank\w*|finance|வங்கி|நிதி/],
  ['police', /police|army|defence|military|காவல்|ராணுவ/], ['sports', /cricket\w*|sports?|football|விளையாட்டு/], ['research', /research|phd|science|ஆராய்ச்சி|அறிவியல்/],
  ['trade', /business|vyabaram|வியாபார/], ['management', /\bmba\b|management|bba/],
];

/**
 * Question type: { type, types:Set, options: { pair } | { fields: [a,b] } | null, timebox: bool }.
 * Primary order: which → choice-with-options → why → when → how → should-I → status → will → general.
 */
export function questionType(text) {
  const q = norm(text);
  const t = new Set();
  const whenWhich = WHEN_WHICH.test(q);
  if ((WHICH.test(q) && !whenWhich) || ENNA_WHICH.test(q)) t.add('which');
  if (WHEN.test(q) || whenWhich) t.add('when');
  if (WHY.test(q)) t.add('why');
  if (HOW.test(q)) t.add('how');
  if (STATUS.test(q)) t.add('status');
  if (SHOULD.test(q)) t.add('should');
  if (WILL.test(q) || /மா\?|மா\s*$/.test(q)) t.add('will');
  // Options side by side.
  let options = null;
  const fields = FIELD_WORDS.filter(([, re]) => re.test(q)).map(([id]) => id);
  if (OR.test(q)) {
    const pair = PAIRS.find((p) => p.a.test(q) && p.b.test(q));
    if (pair) options = { pair: pair.id };
    else if (fields.length >= 2) options = { fields: fields.slice(0, 2) };
  }
  if (!options && /\bvs\b|\bversus\b/.test(q) && fields.length >= 2) options = { fields: fields.slice(0, 2) };
  let type = 'general';
  if (t.has('which') && !(options?.pair && !options.fields)) type = 'which';
  else if (options) type = 'choice';
  else if (t.has('why')) type = 'why';
  else if (t.has('when')) type = 'when';
  else if (t.has('how')) type = 'how';
  else if (t.has('should')) type = 'choice';
  else if (t.has('status')) type = 'status';
  else if (t.has('will')) type = 'will';
  // "Which suits me — A or B?" is a comparison of two named fields.
  if (type === 'which' && options?.fields) type = 'choice';
  return { type, types: t, options, timebox: /this (year|month)|indha (varusham|maasam)|இந்த (வருட|ஆண்டு|மாத)/.test(q) };
}

/** Short Tamil / English label of a question type (for the AI context and tests). */
export const QTYPE_LABEL = {
  which: 'WHICH — name the concrete options first, each with its reason',
  when: 'WHEN — give the supportive periods with dates first',
  will: 'WILL / YES-NO — a calibrated statement of support (never a promise), then when it strengthens',
  why: 'WHY — the chart reasons first, then what helps and when it eases',
  how: 'HOW / WHAT TO DO — practical steps first, then one simple practice',
  choice: 'SHOULD-I / CHOICE — compare the options (or weigh the decision) from the chart, then practical checks',
  status: 'STATUS — how the running period is for this, then what the chart shows and what comes next',
  general: 'GENERAL — answer directly',
};

// ------------------------------------------------------------------ sub-topic (career / job)
// Two career questions must not get the same reading: promotion, salary, office relations, transfer, government
// job and suitability each read different houses and give different practical steps.
export function subTopic(topic, text) {
  const q = norm(text);
  if (['career', 'job', 'job_change'].includes(topic)) {
    if (/promot|பதவி உயர்வு|padhavi|pathavi|uyarvu/.test(q)) return 'promotion';
    if (/salary|hike|increment|appraisal|சம்பள|sambalam|sambhalam/.test(q)) return 'salary';
    if (/\bboss\b|manager|colleague|office (la )?(prachanai|problem|politics|sandai)|மேலதிகாரி|அலுவலக(த்தில்)? (பிரச்சினை|சண்டை)|office la/.test(q)) return 'boss';
    if (/transfer|relocat|இடமாற்ற|maaruthal|idamaatr/.test(q)) return 'transfer';
    if (/government|govt|arasu|அரசு|tnpsc|upsc|railway|police job|bank job|ssc\b/.test(q)) return 'govt';
    if (/interview|நேர்காணல்/.test(q)) return 'interview';
    if (/lost|poiduchu|pochu|poyi|போய்விட்|இழந்|velai illama|jobless|no job|unemploy/.test(q)) return 'lost';
  }
  if (topic === 'education' && /tnpsc|upsc|group ?[124]\b|neet|jee|exam|தேர்வு|pass aag|pass pann|parikshai|பரீட்சை|arrear/.test(q)) return 'exam';
  return null;
}

// ------------------------------------------------------------------ which kind
const CAREER_NOUN = /tholil|thozhil|தொழில்|career|profession|field|line\b|துறை|velai|\bvela\b|வேலை|\bjob\b|\bwork\b|occupation|udhyogam|உத்தியோக/;
const BUSINESS_NOUN = /business|busine?ss|vyaa?baa?ram|viyabaram|yabaram|வியாபார|kadai|கடை|வணிக/;
const STUDY_NOUN = /course|study|studies|stream|group|subject|degree|padipp?u|padikk\w*|படிப்பு|படிக்க|பாடப்பிரிவு|பிரிவு|college|கல்லூரி|after 12th|11th|12th|major/;
const PARTNER_NOUN = /(future |would-be |to-be )?(wife|husband|spouse|life ?partner|bride|groom|mapp?illai|maappillai|ponnu|manaivi|purushan)\b|மணமகன்|மணமகள்|மாப்பிள்ளை|வாழ்க்கைத் துணை|வருங்கால (கணவர்|மனைவி)|துணை எப்படி|varungala/;
const PARTNER_NATURE = /how will (my )?(future )?(wife|husband|spouse|partner|bride|groom) be|what (kind|type|sort) of (wife|husband|spouse|partner|person|nature|character)|(nature|character|gunam|guna|குணம்|இயல்பு)|எப்படி இருப்ப|எப்படிப்பட்ட|eppadi irupp|epdi irupp|enna maathiri|எப்படி இருப்பார்|எப்படி இருப்பாள்/;
export function whichKind(topic, text, qt = questionType(text)) {
  const q = norm(text);
  if (PARTNER_NOUN.test(q) && PARTNER_NATURE.test(q)) return 'partner';
  if (qt.type !== 'which' && !(qt.type === 'choice' && qt.options)) {
    // A few WHICH questions are phrased without a which-word.
    if (/lucky (number|colou?r|day)|athirsht\w* (en|niram|naal)|அதிர்ஷ்ட (எண்|நிறம்|நாள்)/.test(q)) return /colou?r|niram|நிறம்/.test(q) ? 'colour' : /day|naal|நாள்/.test(q) ? 'day' : 'number';
    if (/ishta|இஷ்ட/.test(q)) return 'god';
    if (/suit(s|able)? (me|my chart)|set aag\w*|ஏற்ற(து|தா)|பொருத்தமான/.test(q) && CAREER_NOUN.test(q) && !/eppo|when|எப்போ/.test(q)) return BUSINESS_NOUN.test(q) ? 'business' : 'career';
    return null;
  }
  if (qt.options?.pair === 'abroad_home') return 'direction';
  if (qt.options?.pair === 'job_business') return 'career';
  if (qt.options?.pair === 'govt_private') return 'career';
  if (qt.options?.pair === 'love_arranged') return 'love_arranged';
  if (qt.options?.fields) return topic === 'education' || STUDY_NOUN.test(q) ? 'study' : 'career';
  if (qt.options) return null;
  if (/sloka|slokam|mantra|prayer|\bdua\b|stotra|ஸ்லோக|மந்திர|பிரார்த்தனை|துஆ/.test(q)) return 'prayer';
  if (/gem|stone|rathin|ratn|ரத்தின|kal\b|ராசிக்கல்/.test(q)) return 'gem';
  if (/colou?r|niram|நிறம்/.test(q)) return 'colour';
  if (/\bnumbers?\b|(?<![\u0B80-\u0BFF])எண்(?!ண)/.test(q)) return 'number';
  if (/lucky day|day of the week|which (week)?day|\bkizhamai\b|கிழமை|அதிர்ஷ்ட நாள்/.test(q)) return 'day';
  if (/\bgod\b|deity|deiv\w*|kadavul|samy|saami|தெய்வ|கடவுள்|சாமி|இஷ்ட/.test(q)) return 'god';
  if (/direction|disai|dhisai|திசை|which (place|city|country|side)|எந்த (ஊர்|நாடு|இடம்|திசை)|entha (ooru|naadu|edam|disai)/.test(q) || topic === 'travel') return 'direction';
  if (topic === 'education' || /\bstud(y|ies)\b|padi|படி|course|stream|group|degree|after 12th/.test(q) || (STUDY_NOUN.test(q) && !CAREER_NOUN.test(q))) return 'study';
  if (topic === 'business' || BUSINESS_NOUN.test(q)) return 'business';
  if (CAREER_NOUN.test(q) || ['career', 'job', 'job_change'].includes(topic)) return 'career';
  if (topic === 'marriage' && PARTNER_NOUN.test(q)) return 'partner';
  return null;
}

// ------------------------------------------------------------------ someone else's life, factual questions
// A friend's / sibling's / spouse's own life event needs THEIR chart; the asker's chart cannot answer it.
const OTHER_PERSON = /\b(my|en|enga|ennoda|our)\s+(friend|friends|brother|sister|cousin|uncle|aunt|neighbou?r|colleague|boss|lover|girlfriend|boyfriend|nanban|nanbi|thozhi|anna|akka|thambi|thangachi|thangai|mama|chithi|periyappa|chithappa)('s)?\b|\b(friend|brother|sister|cousin|neighbou?r|colleague|boss)'s\b|\b(nanban|nanbi|thozhi|anna|akka|thambi|thangachi|thangai)(ukku|ku|kku|oda|in)\b|நண்பனுக்கு|நண்பருக்கு|நண்பனின்|நண்பரின்|தோழிக்கு|தோழியின்|அண்ணனுக்கு|அண்ணனின்|அக்காவுக்கு|அக்காவின்|தம்பிக்கு|தம்பியின்|தங்கைக்கு|தங்கையின்|சகோதரனுக்கு|சகோதரிக்கு|மாமாவுக்கு|சித்திக்கு|பக்கத்து வீட்டு/;
// Their own life event (not the asker's relationship with them, which the asker's chart can speak to).
const OTHER_EVENT = /marri|marry|wedd|kalyan|thiruman|திருமண|கல்யாண|\bjob\b|velai|\bvela\b|வேலை|career|business|வியாபார|exam|study|padipp|படிப்|visa|abroad|velinaa?d|வெளிநாடு|baby|child|kuzhandh|kozhandh|குழந்தை|promot|பதவி|health|udambu|உடல்நல|future|எதிர்காலம்|ethirkaalam|life|வாழ்க்கை/;
export function otherPerson(text) {
  const q = norm(text);
  if (!OTHER_PERSON.test(q) || !OTHER_EVENT.test(q)) return null;
  // "fight with my brother", "anna kooda pesuradhe illa", property share with siblings: the asker's own relations.
  if (/fight|sandai|சண்டை|quarrel|kooda|கூட|with my|pesura|பேச|property|sothu|சொத்து|share|pangu|பங்கு|care of|caring/.test(q)) return null;
  const m = OTHER_PERSON.exec(q)[0];
  const who = /brother|anna|thambi|அண்ண|தம்பி|சகோதரன்/.test(m) ? { en: 'your brother', ta: 'உங்கள் சகோதரர்' }
    : /sister|akka|thangai|thangachi|அக்கா|தங்கை|சகோதரி/.test(m) ? { en: 'your sister', ta: 'உங்கள் சகோதரி' }
      : /friend|nanb|thozhi|நண்ப|தோழி/.test(m) ? { en: 'your friend', ta: 'உங்கள் நண்பர்' }
        : /colleague|boss/.test(m) ? { en: 'your colleague', ta: 'உங்கள் சக ஊழியர்' }
          : /neighbou?r|பக்கத்து/.test(m) ? { en: 'your neighbour', ta: 'உங்கள் அண்டை வீட்டார்' }
            : /lover|girlfriend|boyfriend/.test(m) ? { en: 'that person', ta: 'அவர்' } : { en: 'your relative', ta: 'உங்கள் உறவினர்' };
  return { who, match: m };
}
// Questions no horoscope can answer (facts, prices, results of public events, other people's private choices).
const FACTUAL = /capital of|gold (rate|price)|petrol|diesel|weather|temperature|\bscore\b|recipe|translate|meaning of|who is the (pm|cm|president|prime minister|chief minister)|prime minister|chief minister|election (result|winner)|who will win (the )?(election|match|world cup|ipl)|\bipl\b|world cup|cricket (score|match)|lottery|jackpot|lucky draw|winning number|bitcoin|crypto|stock (tip|price)|share price|which (stock|share|crypto|coin) (to|should)|sensex|nifty|exchange rate|dollar rate|train (time|timing)|bus (time|timing)|pnr|tatkal|தங்க விலை|பெட்ரோல்|வானிலை|லாட்டரி|தேர்தல் முடிவு|பங்கு விலை|ரயில் நேரம்/;
export const factualQuestion = (text) => FACTUAL.test(norm(text));

// ------------------------------------------------------------------ deterministic per-question phrasing
/** FNV-1a 32-bit hash of the normalised question and the member: the same question by the same person reads the same. */
export function seedFor(question, member = '') {
  let h = 0x811c9dc5;
  const s = `${norm(question).replace(/[?!.,]+/g, '')}|${member}`;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}
/** An independent pick for each slot (mixes the slot number into the seed). */
export function slotPick(seed, slot, n) {
  if (n <= 1) return 0;
  let h = (seed ^ Math.imul(slot + 1, 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) % n;
}
const rotate = (arr, k) => (arr.length < 2 ? arr : [...arr.slice(k % arr.length), ...arr.slice(0, k % arr.length)]);

// Same meaning, different words — for the lines that appear on many answers.
export const LIMITS_VARIANTS = [
  { en: 'This is traditional guidance about tendencies, not a certainty — real-world advice and deadlines come first.', ta: 'இது போக்குகள் பற்றிய பாரம்பரிய வழிகாட்டல் மட்டுமே, உறுதியல்ல — நடைமுறை ஆலோசனையும் உண்மையான காலக்கெடுகளும் முதன்மை.' },
  { en: 'A chart shows tendencies, not a fixed result — practical advice and real deadlines always come first.', ta: 'ஜாதகம் போக்கைக் காட்டும், முடிவைத் தீர்மானிக்காது — நடைமுறை ஆலோசனையும் உண்மையான காலக்கெடுவுமே எப்போதும் முதலில்.' },
  { en: 'Read this as traditional guidance, not a promise; professional advice and real dates come first.', ta: 'இதை மரபு வழிகாட்டலாக மட்டும் கொள்ளுங்கள், உறுதிமொழியாக அல்ல; நிபுணர் ஆலோசனையும் உண்மையான தேதிகளுமே முதன்மை.' },
  { en: 'Tradition points to tendencies only; your own effort, expert advice and real deadlines matter most.', ta: 'மரபு போக்குகளை மட்டுமே சுட்டும்; உங்கள் முயற்சி, நிபுணர் ஆலோசனை, உண்மையான காலக்கெடு — இவையே மிக முக்கியம்.' },
  { en: 'This shows the traditional tendency, not a fixed outcome — act on facts and good advice first.', ta: 'இது மரபுப் போக்கை மட்டுமே காட்டுகிறது, மாறாத முடிவை அல்ல — உண்மைகளும் நல்ல ஆலோசனையுமே முதலில்.' },
  { en: 'Treat this as gentle traditional guidance; real-world advice and deadlines always come first.', ta: 'இதை மென்மையான மரபு வழிகாட்டலாகக் கொள்ளுங்கள்; நடைமுறை ஆலோசனையும் காலக்கெடுவுமே எப்போதும் முதன்மை.' },
];
const LIMIT_SET = new Set(LIMITS_VARIANTS.flatMap((v) => [v.en, v.ta]));
const ASK_LEADS = [{ en: '', ta: '' }, { en: 'If you like, tell me: ', ta: 'விரும்பினால் சொல்லுங்கள் — ' }, { en: 'One thing would help: ', ta: 'ஒன்று தெரிந்தால் இன்னும் தெளிவாகச் சொல்லலாம் — ' }, { en: 'To guide you better: ', ta: 'இன்னும் சரியாக வழிகாட்ட — ' }, { en: 'When you are ready: ', ta: 'உங்களுக்கு வசதியானபோது சொல்லுங்கள் — ' }];
// Keys whose line order carries no meaning (a list of steps, practices or chart notes).
const ROTATE_KEYS = ['dos', 'donts', 'remedy', 'practice', 'interpretation', 'factors', 'why', 'helps'];

/**
 * Deterministic phrasing variation for answers whose content is genuinely the same (two people — or two wordings —
 * asking the same thing): list sections are rotated, the limits line and the follow-up lead-in vary. The direct
 * answer line, the dated periods and every safety line keep their place. Seeded by the question and the member.
 */
export function varyAnswer(a, seed, lang = 'ta') {
  if (!a?.sections) return a;
  const L = (o) => (lang === 'ta' ? o.ta : o.en);
  let slot = 0;
  const sections = a.sections.map((s) => {
    slot++;
    const lines = s.lines || [];
    if (s.key === 'uncertainty' && lines.length === 1 && LIMIT_SET.has(lines[0])) return { ...s, lines: [L(LIMITS_VARIANTS[slotPick(seed, 50, LIMITS_VARIANTS.length)])] };
    if (s.key === 'ask' && lines.length === 1 && !/ — /.test(lines[0]) && !/^(If you like|One thing|To guide|When you are ready|விரும்பினால்|ஒன்று தெரிந்தால்|இன்னும் சரியாக|உங்களுக்கு வசதியானபோது)/.test(lines[0])) {
      const lead = L(ASK_LEADS[slotPick(seed, 51, ASK_LEADS.length)]);
      return { ...s, lines: [lead ? `${lead}${lang === 'ta' ? lines[0] : lines[0].charAt(0).toLowerCase() + lines[0].slice(1)}` : lines[0]] };
    }
    if (ROTATE_KEYS.includes(s.key) && lines.length > 1) return { ...s, lines: rotate(lines, slotPick(seed, slot, lines.length)) };
    // "What your chart shows": the first line names the houses read; the notes after it can come in any order.
    if (s.key === 'chart' && lines.length > 2) {
      // Only the house-by-house lines trade places; the houses-read line, karaka, dasa and Gochara keep theirs.
      const idx = lines.map((l, i) => (i > 0 && /^\d+-ம் வீடு|^\d+(st|nd|rd|th) house/.test(l) ? i : -1)).filter((i) => i >= 0);
      if (idx.length < 2) return s;
      const moved = rotate(idx.map((i) => lines[i]), slotPick(seed, slot, idx.length));
      const out = [...lines];
      idx.forEach((i, k) => { out[i] = moved[k]; });
      return { ...s, lines: out };
    }
    return s;
  });
  return { ...a, sections };
}

/** Pick one of several phrasings for a slot. */
export const variant = (seed, slot, list) => list[slotPick(seed, slot, list.length)];

// ------------------------------------------------------------------ general (non-chart) questions
// Festivals and their dates / meaning, vratham days, scriptures and temple history, deity stories and panchangam
// facts ("today's tithi", "next pournami") are GENERAL questions: they are never answered with a chart reading.
const FESTIVAL = /pooja\b|puja\b|poojai|பூஜை|deepavali|diwali|தீபாவளி|pongal|பொங்கல்|navarath?ri|நவராத்திரி|saraswath?i|சரஸ்வதி|ayudha|ஆயுத|vijaya ?dasami|விஜயதசமி|chath?urth?i|chaturthi|சதுர்த்தி|karthigai deepam|கார்த்திகை தீபம்|thai ?poosam|தைப்பூச|shivarath?ri|sivarath?ri|சிவராத்திரி|krishna jayanth?i|janmashtami|gokulashtami|கிருஷ்ண ஜெயந்தி|rama? navami|ராம நவமி|aadi (perukku|amavasai|pooram|kiruthigai)|ஆடிப்பெருக்கு|puthandu|tamil new year|தமிழ்ப் புத்தாண்டு|vaikunta ekadasi|வைகுண்ட ஏகாதசி|panguni uthiram|பங்குனி உத்திர|masi magam|மாசி மக|chitra pournami|சித்ரா பௌர்ணமி|onam|ugadi|holi\b|mahalaya|மகாளய|varalakshmi|வரலட்சுமி|kanda sashti|skanda sashti|கந்த சஷ்டி|arudra|ஆருத்ரா|festival|pandigai|பண்டிகை|thiruvizha|திருவிழா|vijayadasami/;
const VRATHAM = /vrath?am|virath?am|விரத|fasting|upavasam|உபவாச|ekadas(h)?i|ஏகாதசி|pradosh\w*|பிரதோஷ|sh?as?h?ti\b|sashti|shasti|சஷ்டி|amavas\w*|அமாவாசை|pournami|பௌர்ணமி|full moon|new moon|sankatahara|சங்கடஹர|kiruth?igai|கிருத்திகை|thiruvonam|திருவோண/;
const SCRIPTURE = /ramayan\w*|ராமாயண|mahabharat\w*|மகாபாரத|bhagavad|\bgita\b|கீதை|puran\w*|புராண|thevaram|தேவாரம்|thiruvasagam|திருவாசக|prabandham|பிரபந்த|thirukkural|திருக்குறள்|sthala|ஸ்தல|temple history|கோவில் வரலாறு|\b(sabari|hanuman|sita|seetha|ravana|ravanan|arjuna|arjunan|karna|karnan|draupadi|bheeshma|bhishma|valli|deivanai|nayanmar|alwar|azhwar|avvaiyar|kannappa|markandeya|prahlada|dhruva|nandi)\b|சபரி|சீதை|ராவண|அர்ஜுன|கர்ண|திரௌபதி|பீஷ்ம|தெய்வானை|நாயன்மார்|ஆழ்வார்|ஔவையார்|கண்ணப்ப|மார்க்கண்டேய|பிரகலாத|நந்தி/;
const PANCHANGAM_FACT = /(today'?s?|inn?ikk?u|inniki|இன்று|இன்றைய|இன்னைக்கு|naalaikku|நாளை|tomorrow'?s?)\s*(enna\s*|என்ன\s*)?(tithi|thithi|திதி|nakshatra\w*|natchath?iram|நட்சத்திர|yogam|yoga\b|karanam|panchang\w*|பஞ்சாங்க)|(enna|என்ன)\s*(tithi|thithi|திதி)|\b(next|upcoming)\s+(pournami|amavasai|ekadasi|pradosham|full moon|new moon|sashti|shasti|chathurthi|kiruthigai|festival)|(aduth?th?a|அடுத்த)\s*(pournami|amavasai|ekadasi|pradosham|sashti|பௌர்ணமி|அமாவாசை|ஏகாதசி|பிரதோஷ|சஷ்டி|பண்டிகை)/;
// The person's own life or chart ("my marriage", "en jathagam", "எனக்கு") — never answered in general mode.
const PERSONAL = /\b(my|me|i|i'm|im|am i|mine|en|enakku|enaku|ennoda|enoda|naan|nan|engal|enga|ennai|yenakku)\b|எனக்கு|என்\s|என்னுடைய|என்னை|நான்|எங்கள்|எங்களுக்கு|\b(jath?agam|jaath?agam|jadhagam|horoscope|my chart|lagna|dasa|bhukti)\b|ஜாதக|லக்ன|தசை|புக்தி/;
export const generalQuestion = (text) => { const q = norm(text); return FESTIVAL.test(q) || VRATHAM.test(q) || SCRIPTURE.test(q) || PANCHANGAM_FACT.test(q); };
export const personalQuestion = (text) => PERSONAL.test(norm(text));
