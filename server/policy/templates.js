// Reviewed-response templates (Brief §20, §21, §26). These are the ONLY texts shown when astrology is not
// allowed, when the AI is unavailable, or when a model draft fails validation.
//
// STATUS: drafted by engineering — every template needs sign-off from child-safety, clinical, legal and
// native-Tamil reviewers before launch (reviewStatus: 'draft'). Do not add phone numbers here; contacts come
// from resource-directory.js. Never shame, frighten or ask for explicit details.

// Child / teen wording shared with the on-device age guard (shared/age-guard.js) — one reviewed source.
import { REVIEWED_TEXT } from '../../shared/age-guard.js';

export const TEMPLATE_VERSION = 'templates-0.1.0-draft';

const T = (id, route, en, ta, extra = {}) => ({ id, route, en, ta, reviewStatus: 'draft', ...extra });

export const TEMPLATES = Object.fromEntries([
  // ------------------------------------------------------------ children (Brief §18 0–5, 6–12; §21 seven-year-old)
  T('child_crush', 'child_guidance',
    REVIEWED_TEXT.child_crush.en,
    REVIEWED_TEXT.child_crush.ta),
  T('child_caregiver', 'child_guidance',
    REVIEWED_TEXT.child_caregiver.en,
    REVIEWED_TEXT.child_caregiver.ta),
  T('child_sensitive', 'child_guidance',
    'That is a big question. The grown-ups who care about you can help with it — talk to a parent, a teacher or another trusted grown-up. If anything feels scary or unsafe, tell them right away. I can share a fun fact about today\'s star or festival if you like.',
    'இது ஒரு பெரிய கேள்வி. உங்கள் மீது அக்கறை உள்ள பெரியவர்கள் இதற்கு உதவுவார்கள் — அம்மா, அப்பா, ஆசிரியர் அல்லது நம்பிக்கையான ஒரு பெரியவரிடம் பேசுங்கள். ஏதாவது பயமாகவோ பாதுகாப்பில்லாததாகவோ தோன்றினால், உடனே அவர்களிடம் சொல்லுங்கள். விரும்பினால், இன்றைய நட்சத்திரம் அல்லது பண்டிகை பற்றி ஒரு சுவாரசியமான தகவல் சொல்கிறேன்.'),

  // ------------------------------------------------------------ teens (Brief §18 13–17; §21 fifteen-year-old)
  T('teen_sexual_health', 'teen_guidance',
    'A dasa cannot tell you whether sexual activity is safe or appropriate. Feelings can be strong at your age. You deserve clear information about boundaries and health, and freedom from pressure. A trusted adult or qualified health professional can help. If someone is pressuring you, I can help you think about staying safe.',
    'ஒரு தசை, பாலியல் உறவு பாதுகாப்பானதா அல்லது பொருத்தமானதா என்று சொல்ல முடியாது. உங்கள் வயதில் உணர்வுகள் வலுவாக இருப்பது இயல்பு. உடல் எல்லைகள், உடல்நலம் பற்றிய தெளிவான தகவலும், யாருடைய அழுத்தமும் இல்லாத சுதந்திரமும் உங்கள் உரிமை. நம்பிக்கையான ஒரு பெரியவர் அல்லது தகுதியான மருத்துவர்/சுகாதாரப் பணியாளர் உதவ முடியும். யாராவது உங்களுக்கு அழுத்தம் கொடுத்தால், பாதுகாப்பாக இருப்பது பற்றி யோசிக்க நான் உதவுகிறேன்.'),
  T('teen_romance', 'teen_guidance',
    REVIEWED_TEXT.teen_romance.en,
    REVIEWED_TEXT.teen_romance.ta),
  T('minor_marriage', 'teen_guidance',
    REVIEWED_TEXT.minor_marriage.en,
    REVIEWED_TEXT.minor_marriage.ta,
    { resources: ['child'] }),
  T('teen_adult_partner', 'safety_support',
    'Thank you for sharing this. When an adult seeks a romantic or sexual relationship with someone under 18, that is not okay — even if it feels special. Keeping that boundary is the adult\'s responsibility, not yours. You deserve to feel safe and never pressured. Please talk to a trusted adult who is not involved, or contact the help listed below.',
    'இதைப் பகிர்ந்ததற்கு நன்றி. 18 வயதுக்குக் குறைவான ஒருவருடன் ஒரு பெரியவர் காதல் அல்லது பாலியல் உறவை நாடுவது சரியல்ல — அது சிறப்பாகத் தோன்றினாலும் கூட. அந்த எல்லையைக் காப்பது அந்தப் பெரியவரின் பொறுப்பு, உங்களுடையது அல்ல. நீங்கள் பாதுகாப்பாகவும் எந்த அழுத்தமும் இல்லாமலும் இருக்க உரிமை உண்டு. இதில் சம்பந்தப்படாத நம்பிக்கையான ஒரு பெரியவரிடம் பேசுங்கள், அல்லது கீழே உள்ள உதவியைத் தொடர்புகொள்ளுங்கள்.',
    { resources: ['child', 'emergency'] }),

  // ------------------------------------------------------------ guardians asking about a child
  T('guardian_minor_romance', 'teen_guidance',
    REVIEWED_TEXT.guardian_minor_romance.en,
    REVIEWED_TEXT.guardian_minor_romance.ta),
  T('guardian_child_at_risk', 'safety_support',
    'What you describe — an adult seeking a romantic or sexual relationship with someone under 18 — is a child-safety concern, and astrology does not change that. Please focus on keeping the child safe. Avoid confronting the adult alone if that could be dangerous, and contact the child helpline or police listed below. A counsellor or school counsellor can also help the child.',
    'நீங்கள் சொல்வது — 18 வயதுக்குக் குறைவான ஒருவருடன் ஒரு பெரியவர் காதல் அல்லது பாலியல் உறவை நாடுவது — குழந்தைப் பாதுகாப்புப் பிரச்சினை; ஜோதிடம் அதை மாற்றாது. குழந்தையைப் பாதுகாப்பாக வைப்பதில் கவனம் செலுத்துங்கள். ஆபத்து இருக்கக்கூடும் என்றால் அந்தப் பெரியவரைத் தனியாக எதிர்கொள்ள வேண்டாம்; கீழே உள்ள குழந்தைகள் உதவி எண் அல்லது காவல் துறையைத் தொடர்புகொள்ளுங்கள். ஒரு ஆலோசகர் அல்லது பள்ளி ஆலோசகரும் குழந்தைக்கு உதவ முடியும்.',
    { resources: ['child', 'emergency'] }),

  // ------------------------------------------------------------ adult–minor facilitation (Brief §20, §21 eighty-year-old)
  T('decline_minor_facilitation', 'decline_facilitation',
    'I cannot help an adult pursue a romantic or sexual relationship with a child. Astrology does not change that boundary. I can help you seek appropriate companionship with consenting adults. If these feelings worry you, a qualified counsellor can help confidentially.',
    'ஒரு பெரியவர் ஒரு குழந்தையுடன் காதல் அல்லது பாலியல் உறவைத் தேட நான் உதவ முடியாது. ஜோதிடம் இந்த எல்லையை மாற்றாது. ஒப்புதல் தரும் பெரியவர்களுடன் பொருத்தமான துணையைத் தேட நான் உதவ முடியும். இந்த உணர்வுகள் உங்களைக் கவலைப்படுத்தினால், தகுதியான ஆலோசகர் ரகசியமாக உதவ முடியும்.',
    { resources: ['mental_health'] }),

  // ------------------------------------------------------------ adults and unknown age (Brief §21)
  T('adult_love_any_age', 'adult_guidance',
    'Yes, adults can seek love and companionship at any age. What matters is mutual interest, consent, respect and clear expectations. If you want a traditional chart interpretation, I can explain it as guidance, without promising an outcome.',
    'ஆம், எந்த வயதிலும் பெரியவர்கள் அன்பையும் துணையையும் தேடலாம். இருவருக்குமான விருப்பம், ஒப்புதல், மரியாதை, தெளிவான எதிர்பார்ப்புகள் — இவையே முக்கியம். பாரம்பரிய ஜாதக விளக்கம் வேண்டுமென்றால், எந்த முடிவையும் உறுதியளிக்காமல், வழிகாட்டுதலாக விளக்குகிறேன்.'),
  T('unknown_age_love', 'adult_guidance',
    'Love and companionship grow from mutual interest, respect and consent — nobody should feel pressured. Take time to get to know someone, be honest, and keep healthy boundaries, including around money and personal photos. If you would like guidance that fits you better, you can tell me your age group (under 18, or 18 and over).',
    'அன்பும் துணையும் இருவரின் விருப்பம், மரியாதை, ஒப்புதல் ஆகியவற்றிலிருந்து வளர்கின்றன — யாருக்கும் அழுத்தம் இருக்கக் கூடாது. ஒருவரைப் புரிந்துகொள்ள நேரம் எடுத்துக்கொள்ளுங்கள், நேர்மையாக இருங்கள், பணம் மற்றும் தனிப்பட்ட புகைப்படங்கள் உட்பட ஆரோக்கியமான எல்லைகளை வைத்துக்கொள்ளுங்கள். உங்களுக்கு ஏற்ற வழிகாட்டுதல் வேண்டுமென்றால், உங்கள் வயதுப் பிரிவைச் சொல்லலாம் (18க்குக் குறைவு, அல்லது 18 மற்றும் அதற்கு மேல்).'),
  T('unknown_age_sexual', 'adult_guidance',
    'A chart cannot say whether sexual activity is right or safe for anyone. Clear information about consent, boundaries and health matters more, and a qualified health professional can answer health questions privately. Nobody should ever be pressured. If you tell me your age group (under 18, or 18 and over), I can point you to suitable information.',
    'பாலியல் உறவு யாருக்காவது சரியானதா, பாதுகாப்பானதா என்று ஜாதகம் சொல்ல முடியாது. ஒப்புதல், எல்லைகள், உடல்நலம் பற்றிய தெளிவான தகவலே முக்கியம்; தகுதியான மருத்துவர்/சுகாதாரப் பணியாளர் உடல்நலக் கேள்விகளுக்கு ரகசியமாகப் பதில் தர முடியும். யாருக்கும் ஒருபோதும் அழுத்தம் இருக்கக் கூடாது. உங்கள் வயதுப் பிரிவைச் சொன்னால் (18க்குக் குறைவு, அல்லது 18 மற்றும் அதற்கு மேல்), பொருத்தமான தகவலைக் காட்டுகிறேன்.'),

  // ------------------------------------------------------------ clarification (Brief §19, §21 "funk")
  T('clarify_funk', 'clarify',
    'Do you mean funk music, or something else? Tell me a little more and I will help.',
    'நீங்கள் ஃபங்க் (funk) இசையைப் பற்றிக் கேட்கிறீர்களா, அல்லது வேறு ஏதாவதா? இன்னும் கொஞ்சம் சொன்னால் உதவுகிறேன்.'),
  T('clarify_generic', 'clarify',
    'Could you tell me a little more about what you would like to know? For example: career, studies, family, health, travel, or today\'s good times.',
    'நீங்கள் எதைப் பற்றித் தெரிந்துகொள்ள விரும்புகிறீர்கள் என்று இன்னும் கொஞ்சம் சொல்ல முடியுமா? உதாரணமாக: வேலை, படிப்பு, குடும்பம், உடல்நலம், பயணம், அல்லது இன்றைய நல்ல நேரம்.'),

  // ------------------------------------------------------------ immediate safety (Brief §20, §21 distressed user)
  T('safety_self_harm', 'safety_support',
    'I am really sorry you are feeling this way. You matter, and no chart can decide your worth or your future. Are you safe right now? If you might act on these thoughts, please call emergency services or go to the nearest hospital now. You can also talk to a trained counsellor for free — see below. If you can, reach out to someone you trust and ask them to stay with you. I am here to keep talking.',
    'நீங்கள் இப்படி உணர்வதைக் கேட்க மிகவும் வருந்துகிறேன். நீங்கள் முக்கியமானவர்; உங்கள் மதிப்பையோ எதிர்காலத்தையோ எந்த ஜாதகமும் தீர்மானிக்க முடியாது. இப்போது நீங்கள் பாதுகாப்பாக இருக்கிறீர்களா? இந்த எண்ணங்களின்படி ஏதாவது செய்துவிடுவீர்களோ என்று தோன்றினால், உடனே அவசர உதவி எண்ணை அழையுங்கள் அல்லது அருகிலுள்ள மருத்துவமனைக்குச் செல்லுங்கள். பயிற்சி பெற்ற ஆலோசகரிடம் இலவசமாகப் பேசவும் முடியும் — கீழே பார்க்கவும். முடிந்தால், நம்பிக்கையான ஒருவரைத் தொடர்புகொண்டு உங்களுடன் இருக்கச் சொல்லுங்கள். நான் தொடர்ந்து பேச இங்கே இருக்கிறேன்.',
    { resources: ['mental_health', 'emergency'] }),
  T('support_distress', 'safety_support',
    'I am sorry things feel so heavy right now. A chart is not a verdict on your life, and difficult periods do pass. It can help to talk with someone you trust today, and free, confidential counselling is available — see below. If you ever feel unsafe or think about harming yourself, please contact emergency services straight away. Would you like to tell me a little about what is weighing on you?',
    'இப்போது எல்லாம் மிகவும் கனமாகத் தோன்றுவதற்கு வருந்துகிறேன். ஜாதகம் உங்கள் வாழ்க்கைக்கான தீர்ப்பு அல்ல; கடினமான காலங்கள் கடந்து போகும். இன்று நம்பிக்கையான ஒருவரிடம் பேசுவது உதவலாம்; இலவச, ரகசியமான ஆலோசனையும் கிடைக்கிறது — கீழே பார்க்கவும். எப்போதாவது பாதுகாப்பில்லாமல் உணர்ந்தாலோ, உங்களைக் காயப்படுத்திக்கொள்ளும் எண்ணம் வந்தாலோ, உடனே அவசர உதவியைத் தொடர்புகொள்ளுங்கள். உங்களை எது வருத்துகிறது என்று கொஞ்சம் சொல்ல விரும்புகிறீர்களா?',
    { resources: ['mental_health'] }),
  T('safety_danger', 'safety_support',
    'Your safety comes first. If you are in danger right now, call emergency services or move to a safe, public place if you can. Contact someone you trust who is not involved. You do not need to share details with me to get help.',
    'உங்கள் பாதுகாப்புதான் முதன்மை. இப்போது ஆபத்தில் இருந்தால், அவசர உதவி எண்ணை அழையுங்கள், அல்லது முடிந்தால் பாதுகாப்பான, பொது இடத்துக்குச் செல்லுங்கள். இதில் சம்பந்தப்படாத நம்பிக்கையான ஒருவரைத் தொடர்புகொள்ளுங்கள். உதவி பெற எந்த விவரத்தையும் என்னிடம் சொல்ல வேண்டியதில்லை.',
    { resources: ['emergency', 'child'] }),
  T('safety_abuse', 'safety_support',
    'Thank you for telling me. What is happening is not your fault, and you do not need to give me any details. Are you safe right now? Please tell a trusted person who is not involved — a relative, teacher, counsellor or friend — and you can contact the help listed below. If you are in immediate danger, call emergency services now. This app cannot contact anyone for you, so please reach out using these contacts.',
    'என்னிடம் சொன்னதற்கு நன்றி. நடப்பது உங்கள் தவறு அல்ல; எந்த விவரமும் என்னிடம் சொல்ல வேண்டியதில்லை. இப்போது நீங்கள் பாதுகாப்பாக இருக்கிறீர்களா? இதில் சம்பந்தப்படாத நம்பிக்கையான ஒருவரிடம் — உறவினர், ஆசிரியர், ஆலோசகர் அல்லது நண்பர் — சொல்லுங்கள்; கீழே உள்ள உதவி எண்களையும் தொடர்புகொள்ளலாம். உடனடி ஆபத்து இருந்தால், இப்போதே அவசர உதவி எண்ணை அழையுங்கள். இந்தச் செயலியால் உங்களுக்காக யாரையும் தொடர்புகொள்ள முடியாது; எனவே இந்த எண்களைப் பயன்படுத்தித் தொடர்புகொள்ளுங்கள்.',
    { resources: ['child', 'emergency'] }),
  T('safety_coercion', 'safety_support',
    'No one should be forced into marriage, a relationship or anything you do not agree to — and you do not need a horoscope to say no. Are you safe right now? It may help to talk to a trusted person who is not part of the pressure. If you are under 18 or in danger, the help listed below can support you.',
    'திருமணம், உறவு அல்லது நீங்கள் ஒப்புக்கொள்ளாத எதற்கும் யாரும் கட்டாயப்படுத்தப்படக் கூடாது — "வேண்டாம்" என்று சொல்ல ஜாதகம் தேவையில்லை. இப்போது நீங்கள் பாதுகாப்பாக இருக்கிறீர்களா? இந்த அழுத்தத்தில் சம்பந்தப்படாத நம்பிக்கையான ஒருவரிடம் பேசுவது உதவலாம். நீங்கள் 18 வயதுக்குக் குறைவானவராக இருந்தாலோ ஆபத்தில் இருந்தாலோ, கீழே உள்ள உதவி எண்கள் துணை நிற்கும்.',
    { resources: ['child', 'emergency'] }),
  T('safety_medical', 'safety_support',
    'This sounds like it may need urgent medical help. Please call an ambulance or emergency number, or go to the nearest hospital now — do not wait for a good time or for Rahu Kalam to pass. Medical care always comes first.',
    'இது அவசர மருத்துவ உதவி தேவைப்படும் நிலையாகத் தோன்றுகிறது. உடனே ஆம்புலன்ஸ் அல்லது அவசர உதவி எண்ணை அழையுங்கள், அல்லது அருகிலுள்ள மருத்துவமனைக்குச் செல்லுங்கள் — நல்ல நேரத்துக்காகவோ ராகு காலம் முடியவோ காத்திருக்க வேண்டாம். மருத்துவ சிகிச்சையே எப்போதும் முதன்மை.',
    { resources: ['emergency'] }),

  // ------------------------------------------------------------ privacy (Brief §21 intrusive parent)
  T('privacy_boundary', 'adult_guidance',
    'I cannot read or reveal anyone\'s private chats, messages or location, and a horoscope cannot tell you whom someone loves. Adding a family member\'s chart does not give access to their private conversations. If you are worried about your child, a calm, respectful conversation usually helps most: choose a relaxed moment, listen without judging, share your concern about their safety, and agree on simple online-safety rules together. If you believe a child is in danger, contact the help listed below.',
    'யாருடைய தனிப்பட்ட சாட், மெசேஜ் அல்லது இருப்பிடத்தையும் என்னால் படிக்கவோ வெளிப்படுத்தவோ முடியாது; ஒருவர் யாரை விரும்புகிறார் என்று ஜாதகம் சொல்லாது. குடும்ப உறுப்பினரின் ஜாதகத்தைச் சேர்த்தால், அவர்களின் தனிப்பட்ட உரையாடல்களைப் பார்க்கும் உரிமை கிடைக்காது. உங்கள் பிள்ளையைப் பற்றிக் கவலைப்பட்டால், அமைதியான, மரியாதையான உரையாடலே அதிகம் உதவும்: நிதானமான நேரத்தைத் தேர்ந்தெடுங்கள், தீர்ப்பு சொல்லாமல் கேளுங்கள், அவர்களின் பாதுகாப்பு பற்றிய உங்கள் கவலையைப் பகிருங்கள், எளிய இணையப் பாதுகாப்பு விதிகளை இருவரும் சேர்ந்து முடிவு செய்யுங்கள். ஒரு குழந்தை ஆபத்தில் இருப்பதாக நினைத்தால், கீழே உள்ள உதவியைத் தொடர்புகொள்ளுங்கள்.',
    { resources: ['child'] }),

  // ------------------------------------------------------------ practical safeguard cards (Brief §25, §26)
  T('accusation_boundary', 'adult_guidance',
    'A horoscope cannot show whether a particular person is cheating, lying or will harm you, and I will not label anyone that way. If you are worried about a relationship, look at real behaviour: honest conversations, respect for boundaries, and clear agreements about money. Relationships do best with mutual consent, honesty and pacing; secretly monitoring a partner usually makes things worse. A counsellor or a trusted elder can help you talk things through. If you feel unsafe, use the help listed below.',
    'ஒருவர் ஏமாற்றுகிறாரா, பொய் சொல்கிறாரா, உங்களுக்குத் தீங்கு செய்வாரா என்று ஜாதகம் காட்டாது; யாரையும் நான் அப்படி முத்திரை குத்த மாட்டேன். புதிய அறிமுகங்களில் பணம், ரகசியம் அல்லது விரைவான முடிவுக்கான அழுத்தம் இருந்தால், நிதானமாகச் சரிபார்த்து முடிவு செய்யுங்கள். உறவுகளில் இருவரின் ஒப்புதல், நேர்மை, நிதானம், பணம் பற்றிய தெளிவான எல்லைகள் முக்கியம்; துணையை ரகசியமாகக் கண்காணிப்பது பெரும்பாலும் நிலைமையை மோசமாக்கும். ஒரு ஆலோசகர் அல்லது நம்பிக்கையான பெரியவர் பேசித் தீர்க்க உதவ முடியும். பாதுகாப்பில்லாமல் உணர்ந்தால், கீழே உள்ள உதவியைப் பயன்படுத்துங்கள்.',
    { resources: ['emergency'] }),
  T('money_safeguard', 'adult_guidance',
    'A chart cannot tell you which person will take your money, and nobody should be judged a fraudster from a horoscope. These steps protect you in any period: go slowly with new relationships and let trust grow; verify identities and details before sending money; pause any transfer you feel pressured or rushed into; never share an OTP, password or bank details with anyone; and if your bank details were exposed, contact your bank immediately.',
    'யார் உங்கள் பணத்தை எடுத்துக்கொள்வார் என்று ஜாதகம் சொல்ல முடியாது; ஜாதகத்தை வைத்து யாரையும் மோசடிக்காரர் என்று தீர்மானிக்கக் கூடாது. புதிய உறவுகளில் அவசரப்படாமல், நம்பிக்கையை மெதுவாக வளர்த்துக்கொள்ளுங்கள். பணம் அனுப்பும் முன் தகவல்களைச் சரிபார்க்கவும். அழுத்தத்தாலோ அவசரத்தாலோ செய்யச் சொல்லப்படும் பணப்பரிமாற்றத்தை நிறுத்தி யோசியுங்கள். யாரிடமும் OTP அல்லது வங்கி ரகசிய விவரங்களைப் பகிர வேண்டாம். வங்கி விவரங்கள் வெளியாகியிருந்தால், உடனே உங்கள் வங்கியைத் தொடர்புகொள்ளுங்கள்.'),
  T('travel_safeguard', 'adult_guidance',
    'A horoscope cannot say for certain that an accident will happen, and I do not give accident dates. What protects you on every trip: keep to the speed limit, wear a seat belt or helmet, never drive after drinking, keep the phone away while driving, and rest when you are tired. Check weather and road conditions before long journeys.',
    'ஜாதகத்திலிருந்து விபத்து நடக்கும் என்று உறுதியாகக் கூற முடியாது; விபத்து தேதிகளை நான் சொல்வதில்லை. பயணத்தில் வேகக் கட்டுப்பாடு, சீட் பெல்ட் அல்லது ஹெல்மெட், போதிய ஓய்வு ஆகியவற்றைக் கவனியுங்கள். மது அருந்திவிட்டு ஒருபோதும் வாகனம் ஓட்ட வேண்டாம்; ஓட்டும்போது கைப்பேசியைத் தவிர்க்கவும். நீண்ட பயணத்துக்கு முன் வானிலையையும் சாலை நிலையையும் சரிபார்க்கவும்.'),
  T('unsafe_permission', 'adult_guidance',
    'No dasa, star or good time makes an unsafe action safe. Please do not drive after drinking, skip a helmet or seat belt, or stop medicines without your doctor\'s advice. A favourable period is never a reason to take risks — the practical precautions apply every day.',
    'எந்தத் தசையும், நட்சத்திரமும், நல்ல நேரமும் ஆபத்தான செயலைப் பாதுகாப்பானதாக மாற்றாது. மது அருந்திவிட்டு வாகனம் ஓட்டாதீர்கள்; ஹெல்மெட், சீட் பெல்ட்டைத் தவிர்க்காதீர்கள்; மருத்துவர் ஆலோசனை இல்லாமல் மருந்துகளை நிறுத்தாதீர்கள். சாதகமான காலம் என்பது ஆபத்தை எடுக்கக் காரணம் அல்ல — நடைமுறைப் பாதுகாப்பு ஒவ்வொரு நாளும் பொருந்தும்.'),
  T('death_decline', 'adult_guidance',
    'I do not predict death, lifespan (ஆயுள்) or when anyone will pass away — no chart can do that reliably, and such predictions cause real fear and harm. If you are worried about your own or a loved one\'s health, a doctor is the right person to talk to. If you like, I can suggest a calm, free daily prayer or practice for peace of mind.',
    'மரணம், ஆயுள், ஒருவர் எப்போது இறப்பார் என்பதை நான் கணிப்பதில்லை — எந்த ஜாதகமும் அதை நம்பகமாகச் சொல்ல முடியாது; அப்படிப்பட்ட கணிப்புகள் உண்மையான பயத்தையும் தீங்கையும் தருகின்றன. உங்கள் அல்லது அன்புக்குரியவரின் உடல்நலம் பற்றிக் கவலை இருந்தால், மருத்துவரிடம் பேசுவதே சரி. விரும்பினால், மன அமைதிக்கான எளிய, இலவச தினசரி பிரார்த்தனையைச் சொல்கிறேன்.'),
  T('disease_decline', 'adult_guidance',
    'A horoscope cannot tell whether someone will get an illness, or whether they can have children. For health or fertility questions, please talk to a qualified doctor, who can check properly. Traditional practices like prayer can support peace of mind, but they never replace medical care.',
    'ஒருவருக்கு நோய் வருமா, குழந்தை பிறக்குமா என்பதை ஜாதகம் சொல்ல முடியாது. உடல்நலம் அல்லது குழந்தைப்பேறு பற்றிய கேள்விகளுக்கு, முறையாகப் பரிசோதிக்கக்கூடிய தகுதியான மருத்துவரிடம் பேசுங்கள். பிரார்த்தனை போன்ற பாரம்பரிய வழிமுறைகள் மன அமைதிக்கு உதவலாம்; ஆனால் அவை மருத்துவ சிகிச்சைக்கு மாற்று அல்ல.'),
  T('probability_decline', 'adult_guidance',
    'I do not give percentages or odds for things like betrayal, accidents, divorce or illness — a chart cannot measure those, and a number would be misleading. I can explain your chart\'s traditional themes as reflection, together with practical steps that help either way.',
    'துரோகம், விபத்து, விவாகரத்து, நோய் போன்றவற்றுக்கு நான் சதவீதமோ வாய்ப்பு அளவோ சொல்வதில்லை — ஜாதகம் அவற்றை அளக்க முடியாது; ஒரு எண் தவறாக வழிநடத்தும். உங்கள் ஜாதகத்தின் பாரம்பரியக் கருத்துகளைச் சிந்தனைக்காக விளக்கி, எப்படியிருந்தாலும் உதவும் நடைமுறை வழிகளைச் சொல்ல முடியும்.'),

  // ------------------------------------------------------------ system texts
  T('no_ai_notice', 'any',
    'Quick-answer mode: the detailed AI explanation is not available right now, so this answer comes only from the app\'s calculations and reviewed templates. It may not cover every part of your question.',
    'சுருக்கப் பதில் முறை: விரிவான AI விளக்கம் இப்போது கிடைக்கவில்லை; எனவே இந்தப் பதில் செயலியின் கணக்கீடுகள் மற்றும் சரிபார்க்கப்பட்ட வார்ப்புருக்களிலிருந்து மட்டுமே வருகிறது. உங்கள் கேள்வியின் எல்லாப் பகுதிகளுக்கும் இது பதில் தராமல் இருக்கலாம்.'),
  T('validation_fallback', 'any',
    'I could not prepare a fully checked answer this time, so I am not showing an unverified one. In general: a chart shows tendencies, not fixed fate. Steady effort, practical planning and good advice from people you trust matter most. A simple free practice — lighting a lamp or a short prayer — can bring calm. Please try again later.',
    'இந்த முறை முழுமையாகச் சரிபார்க்கப்பட்ட பதிலைத் தயாரிக்க முடியவில்லை; எனவே சரிபார்க்காத பதிலைக் காட்டவில்லை. பொதுவாக: ஜாதகம் போக்குகளைக் காட்டுகிறது, மாற்ற முடியாத விதியை அல்ல. தொடர்ந்த முயற்சி, நடைமுறைத் திட்டமிடல், நம்பிக்கையானவர்களின் நல்ல ஆலோசனை — இவையே முக்கியம். விளக்கேற்றுதல் அல்லது சிறு பிரார்த்தனை போன்ற எளிய இலவச வழிபாடு மன அமைதி தரும். சிறிது நேரம் கழித்து மீண்டும் முயலுங்கள்.'),
].map((t) => [t.id, t]));

// Deadline-first practical notes for Prasnam / timing answers (Brief §10). Shown BEFORE any timing guidance.
export const DEADLINE_NOTES = {
  medical: {
    en: '🩺 Practical first: if a doctor has advised a date, or care is needed now, follow medical advice. Never delay hospital care, surgery or medicines for Prasnam, Rahu Kalam or a timing score. What is your real deadline?',
    ta: '🩺 நடைமுறை முதலில்: மருத்துவர் ஒரு தேதியைப் பரிந்துரைத்திருந்தாலோ, இப்போதே சிகிச்சை தேவைப்பட்டாலோ, மருத்துவ ஆலோசனையைப் பின்பற்றுங்கள். பிரசன்னம், ராகு காலம் அல்லது நேர மதிப்பெண்ணுக்காக மருத்துவமனைச் சிகிச்சை, அறுவை சிகிச்சை, மருந்துகளை ஒருபோதும் தள்ளிப்போடாதீர்கள். உங்கள் உண்மையான கெடு என்ன?',
  },
  legal: {
    en: '⚖️ Practical first: court dates, filing deadlines and your lawyer\'s advice come first. Never miss a hearing or a legal deadline because of Prasnam or Rahu Kalam. What is your real deadline?',
    ta: '⚖️ நடைமுறை முதலில்: நீதிமன்றத் தேதிகள், தாக்கல் கெடுக்கள், உங்கள் வழக்கறிஞரின் ஆலோசனை — இவையே முதன்மை. பிரசன்னம் அல்லது ராகு காலத்துக்காக விசாரணையையோ சட்டக் கெடுவையோ ஒருபோதும் தவறவிடாதீர்கள். உங்கள் உண்மையான கெடு என்ன?',
  },
  contract: {
    en: '📜 Practical first: if a contract or agreement has a real deadline, meet it. Read it carefully and take professional advice; any timing below is optional. What is your real deadline?',
    ta: '📜 நடைமுறை முதலில்: ஒப்பந்தத்துக்கு உண்மையான கெடு இருந்தால், அதைத் தவறவிடாதீர்கள். கவனமாகப் படித்து, நிபுணர் ஆலோசனை பெறுங்கள்; கீழே உள்ள நேரம் விருப்பத்துக்குரியது மட்டுமே. உங்கள் உண்மையான கெடு என்ன?',
  },
  payment: {
    en: '💳 Practical first: necessary payments, EMIs and dues should be paid on time. Never delay a required payment because of Rahu Kalam or a timing score. What is your real deadline?',
    ta: '💳 நடைமுறை முதலில்: தேவையான கட்டணங்கள், EMI, நிலுவைகளை உரிய நேரத்தில் செலுத்துங்கள். ராகு காலம் அல்லது நேர மதிப்பெண்ணுக்காகக் கட்டாயக் கட்டணத்தை ஒருபோதும் தாமதப்படுத்தாதீர்கள். உங்கள் உண்மையான கெடு என்ன?',
  },
};

/** Text of a template in a language. */
export function templateText(id, lang = 'en') {
  const t = TEMPLATES[id];
  if (!t) throw new Error(`Unknown template ${id}`);
  return lang === 'ta' ? t.ta : t.en;
}
