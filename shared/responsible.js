// Responsible guidance texts — the ONE place the product principle, the short disclaimer, the Responsible
// Astrology Charter and the Verified Practitioner Code of Conduct live (docs/DETERMINISTIC-PREDICTION-STANDARD.md).
// Shown in the app (onboarding / first reading / Pro page / before payment / Charter screen) and reused by the docs.
// Wording needs the legal, clinical, Tamil-scholar and senior-astrologer sign-off listed in docs/LAUNCH-CHECKLIST.md.

const T = (en, ta) => Object.freeze({ en, ta });
export const RESPONSIBLE_VERSION = 'responsible-1.0.0';

/** The written product principle. */
export const PRINCIPLE = T(
  'Thunai does not predict a fixed future. It explains traditional astrological interpretations, communicates uncertainty, and encourages you to make informed decisions using practical information and qualified professional advice.',
  'துணை நிலையான எதிர்காலத்தைக் கணிப்பதில்லை. பாரம்பரிய ஜோதிட விளக்கங்களைத் தருகிறது, உறுதியின்மையைத் தெளிவாகச் சொல்கிறது, நடைமுறைத் தகவலும் தகுதியான நிபுணர் ஆலோசனையும் கொண்டு நீங்களே முடிவெடுக்க உதவுகிறது.',
);

/** The short disclaimer — visible, readable, never buried (onboarding, first reading, high-risk answers, payment, shares). */
export const DISCLAIMER = T(
  'Thunai provides traditional astrology-based interpretations for reflection and cultural use. It does not guarantee outcomes and is not medical, financial, legal, mental-health or emergency advice. For important decisions, consult a qualified professional.',
  'துணை வழங்கும் ஜாதக விளக்கங்கள் பாரம்பரிய நம்பிக்கைகளை அடிப்படையாகக் கொண்டவை. இவை உறுதியான எதிர்கால கணிப்புகள் அல்ல. உடல்நலம், பணம், சட்டம் அல்லது அவசர நிலை தொடர்பான முடிவுகளுக்கு தகுதியான நிபுணர்களின் ஆலோசனையைப் பெறுங்கள்.',
);

/** The one-line uncertainty label carried by every personal interpretation. */
export const UNCERTAINTY_LABEL = T(
  'Traditional interpretation, not a fixed prediction. Birth-time accuracy and real-life circumstances can change any reading.',
  'இது பாரம்பரிய விளக்கம், உறுதியான கணிப்பு அல்ல. பிறந்த நேரத் துல்லியமும் வாழ்க்கைச் சூழலும் எந்த விளக்கத்தையும் மாற்றலாம்.',
);

/** The government / public statement. */
export const PUBLIC_STATEMENT = T(
  'Thunai will not sell certainty. We treat astrology as a traditional and cultural framework for reflection, not as a guarantee of future events. The app prohibits fear-based predictions, medical diagnosis, financial advice, fetal-sex questions and lifespan predictions. For major life decisions, it guides citizens toward qualified doctors, legal professionals and SEBI-registered financial advisers. We measure safety through automated controls, human review, practitioner standards, user reporting and independent expert oversight.',
  'துணை உறுதியை விற்காது. ஜோதிடத்தை எதிர்கால நிகழ்வுகளுக்கான உத்தரவாதமாக அல்ல, சிந்தனைக்கான பாரம்பரிய, பண்பாட்டுக் கட்டமைப்பாகவே கருதுகிறோம். பயமுறுத்தும் கணிப்பு, நோய் கண்டறிதல், நிதி ஆலோசனை, கருவின் பாலினக் கேள்விகள், ஆயுள் கணிப்பு — இவை செயலியில் தடை. பெரிய வாழ்க்கை முடிவுகளுக்குத் தகுதியான மருத்துவர்கள், வழக்கறிஞர்கள், SEBI-பதிவு பெற்ற நிதி ஆலோசகர்களிடம் வழிகாட்டுகிறது. தானியங்கிக் கட்டுப்பாடு, மனித மதிப்பாய்வு, நிபுணர் தரநிலை, பயனர் புகார், சுயாதீன நிபுணர் மேற்பார்வை மூலம் பாதுகாப்பை அளவிடுகிறோம்.',
);

/** The Responsible Astrology Charter (one page, Tamil and English). */
export const CHARTER = Object.freeze([
  T('No fixed future. Every reading is a traditional interpretation with its uncertainty stated.', 'நிலையான எதிர்காலம் இல்லை. ஒவ்வொரு விளக்கமும் பாரம்பரிய விளக்கம்; அதன் உறுதியின்மை சொல்லப்படும்.'),
  T('No fear. We never use frightening words, deadlines or threats to sell anything.', 'பயம் இல்லை. எதையும் விற்கப் பயமுறுத்தும் சொல், காலக்கெடு, மிரட்டல் பயன்படுத்த மாட்டோம்.'),
  T('No guarantees. No reading, remedy, puja, gemstone or plan promises marriage, wealth, success, cure or protection.', 'உத்தரவாதம் இல்லை. எந்த விளக்கமும், பரிகாரமும், பூஜையும், ரத்தினமும், திட்டமும் திருமணம், செல்வம், வெற்றி, குணம், பாதுகாப்பு என வாக்களிக்காது.'),
  T('Free remedies first. Prayer, temple visits, hymns and gratitude come before anything paid — and all are voluntary.', 'இலவசப் பரிகாரம் முதலில். வழிபாடு, கோவில், தோத்திரம், நன்றி — கட்டணத்திற்கு முன், எல்லாம் விருப்பம்.'),
  T('Health goes to doctors. Thunai never diagnoses, never predicts disease and never asks you to change treatment.', 'உடல்நலம் மருத்துவரிடம். துணை நோயைக் கண்டறியாது, கணிக்காது, சிகிச்சையை மாற்றச் சொல்லாது.'),
  T('Money goes to SEBI-registered advisers. No stock, trading, loan, gambling or crypto advice from a chart.', 'பணம் SEBI-பதிவு ஆலோசகரிடம். ஜாதகத்திலிருந்து பங்கு, வர்த்தகம், கடன், சூதாட்டம், கிரிப்டோ ஆலோசனை இல்லை.'),
  T('Legal matters go to lawyers, and emergencies to emergency services — never "wait for a good time".', 'சட்டம் வழக்கறிஞரிடம், அவசரம் அவசர சேவையிடம் — "நல்ல நேரம் வரை காத்திருங்கள்" என்று ஒருபோதும் இல்லை.'),
  T('No death, lifespan, accident or catastrophe predictions — ever.', 'மரணம், ஆயுள், விபத்து, பேரழிவு கணிப்பு — ஒருபோதும் இல்லை.'),
  T('No fetal-sex or sex-selection answers (PCPNDT Act), in any language or spelling.', 'கருவின் பாலினம் / பாலினத் தேர்வு பதில்கள் இல்லை (PCPNDT சட்டம்) — எந்த மொழியிலும், எழுத்துக்கூட்டலிலும்.'),
  T('Children are protected: no marriage, money or career-pressure readings for anyone under 18.', 'குழந்தைகள் பாதுகாப்பு: 18 வயதுக்குக் கீழ் திருமணம், பணம், தொழில் அழுத்த விளக்கம் இல்லை.'),
  T('Dignity for everyone: no advice that discriminates by caste, gender, religion, disability, marital status or orientation.', 'அனைவருக்கும் மரியாதை: சாதி, பாலினம், மதம், மாற்றுத்திறன், திருமண நிலை, பாலீர்ப்பு அடிப்படையில் பாகுபாடு இல்லை.'),
  T('Your data stays yours: on your phone by default, shared only with consent, deletable any time (DPDP Act 2023).', 'உங்கள் தரவு உங்களுடையது: இயல்பாகக் கைப்பேசியில், அனுமதியுடன் மட்டுமே பகிர்வு, எப்போதும் அழிக்கலாம் (DPDP சட்டம் 2023).'),
  T('Paid features add usefulness — deeper explanation, planning, family tools — never relief from fear.', 'கட்டண வசதிகள் பயனைக் கூட்டும் — ஆழமான விளக்கம், திட்டமிடல், குடும்பக் கருவிகள் — பயத்திலிருந்து விடுதலை அல்ல.'),
  T('Report any advice. Every answer can be reported; complaints are acknowledged within 24–48 hours.', 'எந்த ஆலோசனையையும் புகார் செய்யலாம். புகார்கள் 24–48 மணி நேரத்தில் ஏற்கப்படும்.'),
]);

/** Verified Practitioner Code of Conduct — binding on every astrologer or priest before any consultation opens. */
export const PRACTITIONER_CODE = Object.freeze([
  T('No guaranteed outcomes.', 'உறுதியான பலன் வாக்குறுதி இல்லை.'),
  T('No predictions of death, serious illness, accident or disaster.', 'மரணம், கடும் நோய், விபத்து, பேரழிவு கணிப்பு இல்லை.'),
  T('No instruction to stop or change medical treatment.', 'மருத்துவ சிகிச்சையை நிறுத்தவோ மாற்றவோ சொல்லக் கூடாது.'),
  T('No investment, trading, lending or borrowing advice.', 'முதலீடு, வர்த்தகம், கடன் கொடுக்கல்–வாங்கல் ஆலோசனை இல்லை.'),
  T('No fetal-sex prediction or sex-selection discussion.', 'கருவின் பாலினக் கணிப்பு, பாலினத் தேர்வு பேச்சு இல்லை.'),
  T('No fear-based upselling and no pressure to buy a remedy, puja, gemstone or journey.', 'பயமுறுத்தி விற்பனை இல்லை; பரிகாரம், பூஜை, ரத்தினம், பயணம் வாங்க அழுத்தம் இல்லை.'),
  T('No discriminatory advice based on caste, gender, religion, disability, marital status or sexual orientation.', 'சாதி, பாலினம், மதம், மாற்றுத்திறன், திருமண நிலை, பாலீர்ப்பு அடிப்படையில் பாகுபாடு இல்லை.'),
  T('No sexual, exploitative or coercive conduct.', 'பாலியல், சுரண்டல், வற்புறுத்தல் நடத்தை இல்லை.'),
  T('No direct private payment outside the platform.', 'தளத்திற்கு வெளியே நேரடிக் கட்டணம் இல்லை.'),
  T('No request for unnecessary identity documents, photos or private data.', 'தேவையற்ற அடையாள ஆவணம், புகைப்படம், தனிப்பட்ட தரவு கேட்கக் கூடாது.'),
]);

/** How the Code is enforced. */
export const PRACTITIONER_ENFORCEMENT = Object.freeze([
  T('Identity and credential verification before onboarding', 'இணைப்பதற்கு முன் அடையாள, தகுதிச் சரிபார்ப்பு'),
  T('Mandatory safety and product training', 'கட்டாயப் பாதுகாப்பு, தயாரிப்புப் பயிற்சி'),
  T('Auditable consultations, with notice to and consent from the user', 'பயனருக்கு அறிவிப்பும் அனுமதியும் கொண்டு தணிக்கை செய்யக்கூடிய ஆலோசனைகள்'),
  T('Automated flagging of prohibited words (shared/certainty-guard.js)', 'தடைச் சொற்களுக்குத் தானியங்கி எச்சரிக்கை'),
  T('Random quality audits, a complaint-and-refund process', 'சீரற்ற தரத் தணிக்கை, புகார்–பணத்திருப்ப வழிமுறை'),
  T('Warning → suspension → permanent removal', 'எச்சரிக்கை → இடைநீக்கம் → நிரந்தர நீக்கம்'),
  T('A visible "Report this advice" button after every session', 'ஒவ்வொரு அமர்வுக்குப் பின்னும் "இந்த ஆலோசனையைப் புகார் செய்" பொத்தான்'),
]);

/** Ethical upgrade message (the only form an upgrade prompt may take). */
export const UPGRADE_LINE = T('Unlock a more detailed traditional report and practical planning checklist.', 'விரிவான பாரம்பரிய அறிக்கையும் நடைமுறைத் திட்டப் பட்டியலும் திறக்கவும்.');
