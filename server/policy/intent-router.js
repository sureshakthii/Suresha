// Intent router (Brief §19, §22 step 2): understands Tamil script, Tanglish, English, code-switching,
// numbers in words, voice-typing variants and simple obfuscation, then classifies purpose, participants,
// requested action, urgency and risk flags.
//
// Deterministic rules run first and always. An optional model classifier can be plugged in with
// setModelClassifier(); it is OFF by default and may only ADD risk flags (never remove them). If it fails or
// times out we mark the classification uncertain so the policy uses reviewed safe handling.
// Internal flag names are never shown to users.
import { normalizeText, wordsToDigits, extractAges, decodeEmbedded, TB } from './lexicon.js';
import { INTENT_PATTERNS } from '../../shared/age-guard.js';

export const ROUTER_VERSION = 'router-1.0.0';

// Each rule: list of RegExps (tested on normalised text, numbers already converted to digits).
const T = (src) => new RegExp(src, 'u'); // Tamil-script patterns (no \b for Tamil)
const R = {
  selfHarm: [
    /\b(kill(ing)? my ?self|(want|wish|need) (someone )?to kill me|suicid\w*|end(ing)? (my life|it all|my ?self)|(don'?t|do not|dont) (want|wish) to (live|be alive|exist|wake up)|(want|wanna|wish) to die|wanna die|i'?m going to (die|end it)|wish i (was|were) dead|better off dead|no (reason|point) (to|in) liv\w*|take my (own )?life|hurt(ing)? my ?self|self[- ]?harm|cut(ting)? (my ?self|my wrists?)|not worth living|life is (not worth|meaningless)|can'?t go on|give up on life)\b/,
    T('தற்கொலை|சாக வேண்டும்|சாகணும்|சாகப் போகிறேன்|சாக போறேன்|உயிரை மாய்த்|வாழ விருப்பம் இல்லை|வாழ விரும்பவில்லை|வாழப் ?பிடிக்க(வில்லை|ல)|இறந்து போக வேண்டும்|செத்துப் ?போக|சாவதே மேல்|உயிர் வாழ (விருப்பம்|பிடிக்க)'),
    /\b(saaga?num|saganum|saaga poren|sethu poga(num|ren|poren)|sethudalam|sethuduven|th?ar?kolai|thatkolai|vaa?zha (pidikala|pidikkala|virupam illa|venam)|uyir vaa?zha|saavu (than|dhaan) nall?adhu)\b/,
  ],
  distress: [
    /\b(hopeless|depress(ed|ion)|can'?t cope|cannot cope|so alone|nobody cares|no one cares|crying every day|worthless|my chart is (bad|cursed|terrible))\b/,
    T('மன ?அழுத்தம்|நம்பிக்கை இல்லை|தனிமை|மிகவும் கஷ்டம்|அழுகிறேன்|யாரும் இல்லை'),
    /\b(romba kashtam|mana azhutham|yaarum illa|thaniya iruken|azhuguren)\b/,
  ],
  danger: [
    /\b((is|are|was) (going to|gonna) kill me|(will|wants to) kill me|threaten(ed|ing|s)? to kill|(hitting|beating|attacking|choking) me( right)? now|has a (knife|gun|weapon)|i('?m| am) (in danger|not safe)|not safe (at home|right now|here)|locked me (in|up)|help me (now|please)|someone is following me)\b/,
    T('கொன்று விடுவேன்|கொல்லப் போகிற|கொல்ல வருகிற|ஆபத்தில் இருக்கிறேன்|காப்பாற்றுங்கள்|என்னை அடைத்து'),
    /\b(kolla poraa?n|kolla varaa?n|kolluven nu|kaapaathunga|kaapathunga|aabathula iruken)\b/,
  ],
  abuse: [
    /\b(touch(es|ed|ing)? me (inappropriately|wrongly|there|in private|in a bad way|without)|touch(es|ed)? my (private|body)|molest\w*|rape[ds]?|raping|sexual(ly)? (abus|assault|harass)\w*|abus(e|ed|es|ing) me|harass(es|ed|ing)? me|bad touch|forced me to|forces me to|makes me (touch|undress|watch)|send(s)? me (nudes?|naked)|ask(s|ed|ing)? (me )?for (my )?(nudes?|naked|private) (photos?|pics?|videos?)?|blackmail\w*|threaten(s|ed|ing)? to (share|leak|post) my|beat(s|ing)? me|hit(s|ting)? me|my (father|mother|uncle|step ?father|teacher|coach|brother|husband|boss) (hurts|beats|hits|touches) me)\b/,
    T('தவறாகத் ?தொடு|தகாத முறையில்|பாலியல் (தொல்லை|வன்கொடுமை|துன்புறுத்தல்)|துன்புறுத்து|என்னை அடிக்கிற|மிரட்டு|நிர்வாணப் ?படம்|அந்தரங்க (படம்|புகைப்படம்)'),
    /\b(thappa thod(ura|raa?n|uraa?n)|thappana edathula thod|bad touch|mirattu?(raa?n|raa?|raanga)|photo anupa sol(ra|raa?n)|thollai pann(ura|raa?n)|adikk?(raa?n|uraa?n|raanga|ranga))\b/,
  ],
  coercion: [
    /\b(forc(e|es|ing|ed) (me )?(to|into) (marry|marriage|sex|meet)|forced marriage|forcing me|pressur(e|es|ing|ed) (me )?(to|into)|won'?t let me (leave|go|study|talk)|make me marry|marry me off|against my will|they will disown me if)\b/,
    T('கட்டாயத் ?திருமணம்|கட்டாயப்படுத்து|என் விருப்பம் இல்லாமல்|வற்புறுத்து'),
    /\b(kattaya ?(kalyanam|kalyaanam)|kattaya?paduth|force pann?(raanga|ranga|uraanga)|vat?purutth?)\b/,
  ],
  secrecy: [
    /\b(keep (it|this) (a )?secret|secretly|don'?t tell (anyone|your parents|my parents|her parents|his parents)|without (her|his|their|my) parents knowing|behind (her|his) parents)\b/,
    T('ரகசியமாக|யாரிடமும் சொல்லாத|பெற்றோருக்குத் தெரியாமல்'),
    /\b(ragasiyama|rahasiyama|yaar ?kittayum sollatha|yaarukkum theriyama|veetla theriyama|secret ah)\b/,
  ],
  medicalUrgent: [
    /\b(chest pain|can'?t breathe|cannot breathe|difficulty breathing|breathless(ness)?|unconscious|not responding|fainted|heavy bleeding|bleeding (heavily|a lot|won'?t stop)|heart attack|stroke|seizure|having fits|overdose|poison(ed|ing)?|swallowed (pills|poison)|severe pain|labou?r pain|water broke|snake ?bite|high fever (in|for) (my )?(baby|infant))\b/,
    T('நெஞ்சு ?வலி|மூச்சு விட முடிய|மயக்கம்|ரத்தப் ?போக்கு|விஷம் குடி|பாம்பு கடி|பிரசவ வலி|வலிப்பு'),
    /\b(nenju ?vali|moochu vida mudiyala|mayakkam|ratham nikkala|visham kudi|paambu kadi|prasava vali)\b/,
  ],
  medicalTopic: [
    /\b(surgery|operation|hospital|doctor|treatment|admit(ted)?|chemo\w*|dialysis|c-?section|caesarean|medicine|medication|tablets?|ambulance|scan|biopsy|icu)\b/,
    T('அறுவை|மருத்துவமனை|மருத்துவர்|டாக்டர்|சிகிச்சை|மருந்து|மாத்திரை|ஆம்புலன்ஸ்'),
    /\b(aaspathiri|aspathri|hospital|maruthuvar|marunthu|mathirai|operation)\b/,
  ],
  legalTopic: [
    /\b(court|hearing|summons|bail|fir|lawyer|advocate|vakil|vakeel|legal notice|appeal|deadline|tribunal)\b/,
    T('நீதிமன்ற|வழக்கு|விசாரணை|வழக்கறிஞர்|சம்மன்|ஜாமீன்|கெடு'),
    /\b(court|kesu|vazhakku|vakeel)\b/,
  ],
  financialTopic: [
    /\b(emi|loan|due date|rent|fees?|payment|tax|cheque|bounce|penalty|premium|contract|agreement|sign(ing)? (the |a |an )?(contract|agreement|papers|documents|deal)|salary|invest\w*|savings|insurance)\b/,
    T('தவணை|கட்டணம்|வாடகை|அபராதம்|ஒப்பந்த|கடன்|காசோலை|முதலீடு'),
    /\b(thavanai|kattanam|vaadagai|oppandham|kadan)\b/,
  ],
  delayWords: [
    /\b(wait|postpone|delay|defer|later|reschedule|skip|avoid|after rahu|until|till|good time|auspicious|muhur?th?am|nalla neram|rahu ?kalam|should i go (now|today))\b/,
    T('தள்ளி ?வை|ஒத்தி ?வை|காத்திரு|நல்ல நேரம்|ராகு ?கால|முகூர்த்த'),
    /\b(thalli vaikk?|othi vaikk?|kaathiru|appuram)\b/,
  ],
  privacyIntrusion: [
    /\b(read|see|check|access|show me|open|spy( on)?|monitor|track|hack|look at|go through)\b[^.?!]{0,40}\b(her|his|their|my (daughter|son|wife|husband|girlfriend|boyfriend|partner|ex|neighbou?r|colleague|sister|brother)'?s?)\b[^.?!]{0,20}\b(chats?|messages?|whatsapp|phone|location|instagram|insta|facebook|inbox|dms?|e-?mails?|call (log|history)|browsing|history|diary|conversations?)\b/,
    /\b(whom|who) (is )?(she|he|my daughter|my son|my wife|my husband) (loves?|is (talking|chatting) (to|with)|is seeing|likes)\b/,
    /\b(tell me (her|his) secrets?|what (she|he) (talks|chats) about|(another|other) user'?s (chart|profile|data|details)|someone else'?s (chart|profile|horoscope|birth details))\b/,
    T('(அவளுடைய|அவனுடைய|மகளின்|மகனின்|மனைவியின்|கணவரின்)\\s*(சாட்|மெசேஜ்|செய்தி|போன்|கைப்பேசி)|யாரைக் ?காதலிக்கிற|யாருடன் பேசுகிற|ரகசியமாகப் ?பார்'),
    /\b((aval|avan|ponnu|paiyan|magal|magan)(oda|udaya)? (chat|message|phone|whatsapp)|yaara love pann?(ra|raa?|ura)|yaar kooda pes(ura|ra)|phone check pann)\b/,
  ],
  accusation: [
    /\b(confirm|prove|find out|tell me|check|is it true)\b[^.?!]{0,30}\b(cheat\w*|affair|unfaithful|betray\w*|two[- ]timing|lying to me)\b/,
    /\b(is|will|would|does) (my )?(wife|husband|partner|spouse|girlfriend|boyfriend|gf|bf|fiancee?|she|he|lover)\b[^.?!]{0,20}\b(cheat\w*|betray\w*|having an affair|unfaithful|deceive|leave me for)\b/,
    /\b(my )?(wife|husband|partner|spouse|girlfriend|boyfriend|gf|bf|fiancee?|lover)\b (will|would|is going to|might)\b[^.?!]{0,20}\b(cheat\w*|betray\w*|have an affair|deceive|leave me for)\b/,
    /\b(which|what kind of|whose) (woman|women|man|men|person|people|relative|friend|girl|boy|lady)\b[^.?!]{0,25}\b(will|would|going to)\b[^.?!]{0,20}\b(take|steal|cheat|betray|deceive|ruin|harm|trap|loot|grab)\b/,
    /\b(who (stole|took|did (black magic|seivinai|sorcery))|black magic (by|from|done by)|who cursed)\b/,
    /\b(widow|widower|divorcee|divorced woman)\b[^.?!]{0,40}\b(kill|death|die|bad luck|unlucky|curse|ominous|destroy)\b/,
    /\b(is (she|he) a (gold ?digger|fraud|cheat|thief|liar)|will (she|he) (cheat|betray|trap) me)\b/,
    T('ஏமாற்றுவா(ளா|னா|ரா)|ஏமாற்றுகிறா(ளா|னா|ரா)|துரோகம் செய்வா|கள்ளக் ?காதல்|தொடர்பு வைத்திருக்கிறா|செய்வினை (யார்|வைத்தது யார்)|யார் செய்வினை|யார் திருடின|பணத்தை எடுத்து(விடுவா|க்கொள்வா)|எந்தப் பெண் .*(பணம்|ஏமாற்)|விதவை.*(கொல்|கணவன|ராசி)|ராசியில்லாத'),
    /\b(y?emath?uv?aa?(la|na|ra)|y?emath?uraa?(la|na)|cheat pann?(uvaa?(la|na|ra|ru)|raa?(la|na|ra|ru))|thurogam|kalla ?kadhal|seivinai (yaaru|yaar)|yaar seivinai|panatha eduthu(duvaa?la|ruvaa?la)|vidhavai)\b/,
  ],
  deathPrediction: [
    /\b(when (will|would|do) (i|he|she|they|my \w+) die|when (i|he|she|my \w+) will die|when (am|is) (i|he|she|my \w+) going to die|how long (will|would) (i|he|she|they|my \w+) live|life ?span|longevity|age (of|at) death|date of (my |his |her )?death|death (date|time|year)|year of death|will (i|he|she|my \w+) die|die (soon|early|young)|how many (more )?years (will|do) (i|he|she|my \w+) (have|live)|ayul|aayul|ayush ?bhava|maraka)\b/,
    T('ஆயுள்|மரணம்|இறப்பு|எப்போது (இறப்ப|சாவ)|எவ்வளவு காலம் வாழ்|மாரக'),
    /\b(maranam|eppo saav|eppo sethu|evlo (naal|varusham) vaazh|aayusu)\b/,
  ],
  diseasePrediction: [
    /\b(will|would|am|is|could|chance|risk|which|what|predict)\b[^.?!]{0,35}\b(cancer|diabetes|disease|illness|heart (attack|disease|problem)|kidney (failure|disease)|infertil\w*|tumou?r|paralysis|dementia|sugar (problem|disease)|mental illness)\b/,
    /\b(can|will) (i|she|he|we|my \w+) (have|get|conceive) (children|kids|a baby|babies|pregnant)\b/,
    T('நோய் வருமா|புற்றுநோய்|சர்க்கரை நோய் வருமா|குழந்தை பாக்கியம்|மலட்டு|குழந்தை பிறக்குமா'),
    /\b(noi varuma|cancer varuma|sugar varuma|kuzhand?hai (bhagyam|baakiyam|porakkuma|pirakkuma))\b/,
  ],
  accidentPrediction: [
    /\b(accident|crash|mishap)\b[^.?!]{0,40}\b(date|when|which day|will (it )?happen|predict|chance|kandam|time)\b/,
    /\b(when|will) (will )?(i|he|she|my \w+) (have|meet with|get into) an? (accident|crash)\b/,
    T('விபத்து (எப்போது|நடக்குமா|கண்டம்|தேதி|நாள்)|கண்டம்'),
    /\b(accident eppo|vibath?u|kandam)\b/,
  ],
  unsafeActivity: [
    /\b(drunk|drink(ing)? and driv\w*|driv\w* (after|while) drink\w*|without (a )?(helmet|seat ?belt|licen[cs]e)|skip (my |the )?(medicine|medication|tablets|dialysis|treatment|insulin|surgery)|stop(ping)? (taking )?(my |the )?(medicine|medication|tablets|insulin|treatment)|no need (for|of|to wear) (a )?(helmet|seat ?belt|doctor)|over ?speed\w*|street race|all my savings|gambl\w*|betting|bet everything)\b/,
    T('குடித்துவிட்டு (ஓட்ட|வண்டி)|ஹெல்மெட் இல்லாமல்|மருந்தை? நிறுத்த|மாத்திரையை? நிறுத்த|சூதாட்ட'),
    /\b(kudichittu (otta|vandi)|helmet illama|marunth?(u|a) nirutha|tablet nirutha|mathirai nirutha)\b/,
  ],
  permissionLanguage: [
    /\b(can i|could i|so i can|means i can|safe to|okay to|ok to|fine to|is it fine|allowed to|will i be (safe|protected)|protect(s|ed)? me|nothing will happen|won'?t get caught|favou?rable|good dasa|lucky|guarantee)\b/,
    T('லாமா|பாதுகாப்பா|ஒன்றும் ஆகாது'),
    /(laama|lama|lamaa)\b|\b(onnum aagadhu|safe ah)\b/,
  ],
  probabilityRequest: [/\b(percent(age)?|probability|chances?|odds|how likely|what are the chances)\b|%/, T('சதவீத|வாய்ப்பு எவ்வளவு')],
  probabilitySensitive: [/\b(cheat\w*|betray\w*|affair|accident|die|death|divorce|fraud|disease|cancer|kill)\b/, T('ஏமாற்|விபத்து|மரண|விவாகரத்து|நோய்')],
  paidRemedy: [
    /\b(must|have to|need to|should|compulsory|necessary)\b[^.?!]{0,25}\b(buy|wear|do|pay|perform|book)\b[^.?!]{0,30}\b(gem\w*|stone|ring|sapphire|ruby|emerald|pearl|coral|diamond|neelam|rathnam|pooja|puja|homam|homa|yantra|remedy|parihar\w*|ritual)\b/,
    T('(ரத்தினம்|கல்|பூஜை|ஹோமம்|யந்திரம்|பரிகாரம்).*(கட்டாயம்|வாங்க வேண்டுமா|செய்ய வேண்டுமா)'),
  ],
  romance: [
    /\b(fall(ing)? in love|in love|for love|find (my )?(true )?love|love life|love (life|marriage|affair|proposal|success|failure|match|her|him|someone|a girl|a boy|this girl|this boy)|(my|her|his|true|first) love|crush|romance|romantic|relationship|dating|date (her|him|someone|a girl|a boy|an? \d{1,2})|girlfriend|boyfriend|gf|bf|propose|kiss\w*|soul ?mate|lover|companion(ship)?|impress (her|him)|attract\w*|flirt\w*|pursue|woo|win (her|him) over|get (her|him) to like)\b/,
    T('காதல்|காதலி|காதலன்|ப்ரபோஸ்|முத்தம்|ஈர்க்க'),
    /\b(kaa?dhal|kaa?thal|love pann\w*|propose pann\w*|lover|correct pann\w*|impress pann\w*)\b/,
  ],
  marriage: [
    /\b(marry|married|marriage|wedding|bride|groom|matrimon\w*|alliance|proposal|thali|engagement)\b/,
    T('திருமண|கல்யாண|மணமகள்|மணமகன்|தாலி|நிச்சயதார்த்த|பொருத்தம்'),
    /\b(kalyaa?nam|thirumanam|ponnu paa?rk|maappillai|mapillai|nichayadhartham|porutham)\b/,
  ],
  sexual: [
    /\b(sex|sexual|sexy|intercourse|have sex|sleep(ing)? with|make love|hook ?up|physical relation\w*|get physical|intimate|intimacy|virgin\w*|nudes?|naked|porn\w*|horny|fuck\w*|f\*ck|bang (her|him)|first night|shanti muhur?th?am)\b/,
    T('உடலுறவு|பாலுறவு|உறவு கொள்ள|தாம்பத்திய|நிர்வாண|முதலிரவு|சாந்தி முகூர்த்த'),
    /\b(udaluravu|sex pann\w*|first night|mudhal ?iravu|santhi muhur?th?am)\b/,
  ],
  sexualHealth: [
    /\b(condoms?|contracepti\w*|birth control|pregnan\w*|my periods?|missed (my )?periods?|periods? (pain|cramps|late)|menstrua\w*|stis?|stds?|hiv|safe sex|puberty|wet dreams?|masturbat\w*|emergency pill|abortion|consent)\b/,
    T('கர்ப்ப|மாதவிடாய்|கருத்தடை|பருவமடை|ஒப்புதல்'),
    /\b(garbam|karbam|periods|pregnant aa?g)\b/,
  ],
  firstPersonRomance: [
    /\b(i|i'm|im|me|my|myself)\b[^.?!]{0,60}\b(marry|date|dating|love|pursue|sex|meet|propose|kiss|impress|attract|win|be with|sleep with|relationship|get her|get him|with her|with him)\b/,
    /\b(help me|can i|could i|should i|will i|for me to)\b[^.?!]{0,60}\b(her|him|girl|boy|she|he)\b/,
    T('(நான்|எனக்கு|என்னை|என்னுடன்)[^.?!]{0,50}(திருமண|கல்யாண|காதல்|உறவு|சந்திக்க)'),
    /\b(naan|nan|enakku|ennai|ennoda|enaku)\b[^.?!]{0,50}(kalyaa?nam|kaa?dhal|love|sex|marry|kooda|meet)/,
    T('(திருமணம் செய்யலாமா|கல்யாணம் (செய்யலாமா|பண்ணலாமா)|காதலிக்கலாமா|சந்திக்கலாமா)'),
    /\b((kalyaa?nam|love|marry|sex|meet) pann?alaa?ma|kaa?dhalikkalaa?ma)\b/,
  ],
  // Liking / wanting / winning over a specific person ("I like a 15 year old girl", "get her to love me") —
  // shared with the phone's offline check (shared/age-guard.js).
  attraction: INTENT_PATTERNS.attraction,
  // 6–12 feelings / bullying / friendship fights → supportive child template ("tell a trusted adult").
  childFeelings: INTENT_PATTERNS.childFeelings,
  privateMeeting: [/\b(alone|in private|secretly|without (her|his) parents)\b/, T('தனியாக|ரகசியமாக'), /\b(thaniya|ragasiyama|rahasiyama)\b/],
  meeting: [/\b(meet(ing)?|see (her|him)|visit (her|him)|alone with|in private|hotel|room|take (her|him) out|run away with|elope)\b/, T('சந்திக்க|தனியாக|ஓடிப்போ'), /\b(meet pann\w*|thaniya|odi pog)\b/],
  ambiguousFunk: [/\bfunk\b/],
  musicContext: [/\b(music|song|band|dance|album|genre|guitar|disco|groove|bass|playlist|singer)\b/, T('இசை|பாடல்|நடனம்')],
  bypass: [
    /\b(ignore|forget|disregard|override|bypass)\b[^.?!]{0,30}\b(previous|prior|above|earlier|all|your|the|safety|system)\b[^.?!]{0,20}\b(rules|instructions|prompts?|polic(y|ies)|guidelines|filters?)\b/,
    /\b(jailbreak|dan mode|developer mode|no (rules|restrictions|filters)|you are now (an? )?(unfiltered|uncensored|free)|act as (an? )?(unfiltered|uncensored)|pretend (that )?(you have|there are) no (rules|limits))\b/,
    T('விதிகளை (மறந்து|புறக்கணி|விட்டு)'),
    /\b(rules? ah? (ignore|vidu|marandhu)|ignore pann)\b/,
  ],
  fictional: [/\b(story|fiction(al)?|novel|role ?-?play|pretend|imagine|hypothetical(ly)?|in a movie|screenplay|script|character|game|just kidding|for a friend)\b/, T('கதை|கற்பனை|நாடகம்'), /\b(kadhai|kathai|summa)\b/],
  translation: [/\b(translate|translation|in tamil|in english|mozhi ?peyar)\b/, T('மொழிபெயர்')],
  guardianClaim: [/\b((her|his|my|their) parents? (said|allowed|agreed|approve\w*|permit\w*)|with (her|his) parents'? (permission|consent)|family (approved|agreed)|guardian'?s? (permission|consent))\b/, T('பெற்றோர் (சம்மதம்|அனுமதி)'), /\b(veetla (ok|sammadham)|parents ok)\b/],
  destinyClaim: [/\b(destiny|destined|fated|written in (the|my) stars|meant to be|vidhi)\b/, T('விதி|தலையெழுத்து')],
  timing: [/\b(when|what time|which (day|date|month|year)|good time|right time|auspicious|muhur?th?am|nalla neram|best time|is (now|this) (a )?(good|right))\b/, T('எப்போது|எப்பொழுது|நல்ல நேரம்|சரியான நேரம்|முகூர்த்த|எந்த (நாள்|தேதி)'), /\b(eppo|eppadi|nalla neram|endha naal)\b/],
  soon: [/\b(today|tonight|tomorrow|right now|now|urgent|asap|immediately|this (morning|evening))\b/, T('இன்று|இன்றிரவு|நாளை|இப்போதே|அவசர'), /\b(inniki|innaikku|naalaikku|naalai|ippove|avasaram)\b/],
};

const PURPOSES = [
  ['sexual_health', ['sexualHealth']],
  ['sexual', ['sexual']],
  ['marriage', ['marriage']],
  ['romance', ['romance']],
  ['health', ['medicalTopic', 'medicalUrgent', 'diseasePrediction']],
  ['legal', ['legalTopic']],
  ['career', [/\b(job|career|work|promotion|interview|office|business|velai|udhyogam|boss)\b/, T('வேலை|உத்தியோக|தொழில்|பதவி')]],
  ['education', [/\b(exam|study|studies|school|college|marks|padipp?u|class|university|admission)\b/, T('படிப்பு|தேர்வு|பள்ளி|கல்லூரி')]],
  ['money', ['financialTopic', /\b(money|wealth|rich|debt|panam|lakh|crore)\b/, T('பணம்|செல்வ')]],
  ['travel', [/\b(travel|journey|trip|flight|visa|abroad|payanam|drive|driving|vehicle|bike|car)\b/, T('பயணம்|வெளிநாடு|வாகன')]],
  ['spiritual', [/\b(temple|pooja|puja|prayer|god|kovil|mantra|slokam|deity|vratham|fasting)\b/, T('கோயில்|கோவில்|வழிபாடு|மந்திர|பூஜை|விரத')]],
  ['calendar', [/\b(today|rahu ?kalam|nalla neram|panchang\w*|tithi|nakshatra|star today|horai|yamagandam)\b/, T('இன்று|ராகு ?காலம்|நல்ல நேரம்|பஞ்சாங்க|திதி|நட்சத்திர|ஓரை')]],
];

const test = (list, s) => list.some((re) => re.test(s));

/** Classify one piece of text. Returns { flags, purpose, requestedAction, urgency, ages }. */
export function classifyText(original) {
  const norm = normalizeText(original);
  const decoded = decodeEmbedded(original).map(normalizeText);
  const s = [wordsToDigits(norm), ...decoded.map(wordsToDigits)].join(' \n ');
  const flags = {};
  for (const [k, list] of Object.entries(R)) if (test(list, s)) flags[k] = true;
  if (decoded.length) flags.encodedText = true;
  // Derived flags
  flags.ambiguous = Boolean(flags.ambiguousFunk && !flags.musicContext && !flags.sexual);
  flags.medicalTiming = Boolean(flags.medicalTopic && flags.delayWords);
  flags.legalTiming = Boolean(flags.legalTopic && (flags.delayWords || flags.soon));
  flags.financialTiming = Boolean(flags.financialTopic && (flags.delayWords || flags.soon));
  flags.unsafePermission = Boolean(flags.unsafeActivity && (flags.permissionLanguage || /dasa|dasha|bhukti|horoscope|chart|jathagam|jaathagam|தசை|ஜாதக|yoga|rasi|star|planet|guru|sani/.test(s)));
  flags.sensitiveProbability = Boolean(flags.probabilityRequest && flags.probabilitySensitive);
  flags.romanticOrSexual = Boolean(flags.romance || flags.sexual || flags.marriage);
  const ages = extractAges(norm);
  for (const d of decoded) ages.push(...extractAges(d));

  let purpose = 'general';
  for (const [p, rules] of PURPOSES) {
    if (rules.some((r) => (typeof r === 'string' ? flags[r] : r.test(s)))) { purpose = p; break; }
  }
  let requestedAction = 'explain';
  if (flags.privacyIntrusion) requestedAction = 'access_private';
  else if (flags.accusation) requestedAction = 'confirm_accusation';
  else if (flags.permissionLanguage) requestedAction = 'permission';
  else if (flags.timing) requestedAction = 'timing';
  else if (/\b(will|future|predict|going to)\b|மா\?|நடக்குமா|கிடைக்குமா/u.test(s)) requestedAction = 'prediction';
  if (flags.selfHarm || flags.danger || flags.abuse || flags.distress) requestedAction = 'support';

  const urgency = (flags.selfHarm || flags.danger || flags.medicalUrgent) ? 'immediate' : flags.soon ? 'soon' : 'none';
  return { normalized: norm, flags, purpose, requestedAction, urgency, ages };
}

const STICKY = ['selfHarm', 'abuse', 'danger', 'coercion', 'romanticOrSexual', 'romance', 'sexual', 'marriage', 'attraction', 'meeting', 'secrecy', 'bypass', 'fictional', 'privacyIntrusion'];

let modelClassifier = null;
/** Plug in an optional model-based classifier: async (text, deterministic) => ({ flags: {...} }). Off by default. */
export function setModelClassifier(fn) { modelClassifier = typeof fn === 'function' ? fn : null; }
const modelEnabled = () => modelClassifier && process.env.POLICY_MODEL_CLASSIFIER === 'on';

/**
 * Classify a conversation. `turns` are the person's own messages in order (last = current question).
 * Bounded context: only the last 12 turns are considered. Returns the merged intent object.
 */
export function classifyConversation(turns) {
  const list = (Array.isArray(turns) ? turns : [turns]).filter((t) => typeof t === 'string' && t.trim()).slice(-12);
  const current = classifyText(list[list.length - 1] || '');
  const earlier = list.slice(0, -1).map(classifyText);
  const sticky = {};
  for (const e of earlier) for (const k of STICKY) if (e.flags[k]) sticky[k] = true;
  const ages = [...earlier.flatMap((e, i) => e.ages.map((a) => ({ ...a, turn: i }))), ...current.ages.map((a) => ({ ...a, turn: earlier.length }))];
  const uncertain = !current.normalized || (current.purpose === 'general' && current.normalized.split(' ').length <= 2 && !Object.values(current.flags).some(Boolean));
  return {
    version: ROUTER_VERSION,
    normalized: current.normalized,
    flags: current.flags,
    sticky,
    purpose: current.purpose,
    requestedAction: current.requestedAction,
    urgency: current.urgency,
    ages,
    currentTurn: earlier.length,
    uncertainty: uncertain ? 'medium' : 'low',
    classifier: { deterministic: true, model: 'off' },
  };
}

/** Optional async path: deterministic classification, then the model classifier (if enabled) can add flags. */
export async function classifyWithModel(turns, { timeoutMs = Number(process.env.POLICY_CLASSIFIER_TIMEOUT_MS) || 4000 } = {}) {
  const intent = classifyConversation(turns);
  if (!modelEnabled()) return intent;
  try {
    const res = await Promise.race([
      modelClassifier(intent.normalized, intent),
      new Promise((_r, rej) => setTimeout(() => rej(new Error('classifier timeout')), timeoutMs)),
    ]);
    const add = res && typeof res === 'object' && res.flags && typeof res.flags === 'object' ? res.flags : null;
    if (!add) throw new Error('invalid classifier output');
    for (const [k, v] of Object.entries(add)) if (v === true && k in R) intent.flags[k] = true; // add-only
    intent.classifier.model = 'ok';
  } catch {
    intent.classifier.model = 'failed';
    intent.uncertainty = 'high';
  }
  return intent;
}

export { TB };
