// Privacy policy, terms of use, astrology disclaimer and refund policy (required by app stores and payment gateways).
// The owner must fill in the legal entity name and support contact before publishing to the stores.
import { L, registerScreen, subHeader, copyright } from './core.js';

const CONTACT = 'support@kaippesi.app';

const SECTIONS = [
  {
    id: 'privacy', icon: '🔒', en: 'Privacy policy', ta: 'தனியுரிமைக் கொள்கை',
    body: [
      ['What we collect', 'நாங்கள் சேகரிப்பவை', 'Your mobile number or email (to sign in), the birth details you enter for yourself and your family, and orders or bookings you make. We also count anonymous app usage (screens opened, device type) to improve the app.', 'உள்நுழைய உங்கள் மொபைல் எண் அல்லது மின்னஞ்சல், நீங்களும் குடும்பத்தினரும் உள்ளிடும் பிறப்பு விவரங்கள், நீங்கள் செய்யும் ஆர்டர், முன்பதிவுகள். செயலியை மேம்படுத்த பெயரில்லாப் பயன்பாட்டுத் தகவல்களையும் (திறந்த திரைகள், சாதன வகை) கணக்கிடுகிறோம்.'],
      ['How we use it', 'எப்படிப் பயன்படுத்துகிறோம்', 'Only to calculate charts and predictions, deliver orders and bookings, send the reminders you switch on, and support you. We never sell your data.', 'ஜாதகம், கணிப்பு, ஆர்டர், முன்பதிவு, நீங்கள் இயக்கும் நினைவூட்டல்கள், உதவிக்கு மட்டுமே. உங்கள் தரவை ஒருபோதும் விற்பதில்லை.'],
      ['Sharing', 'பகிர்வு', 'With payment gateways (Razorpay / Stripe) to process payments, SMS/email providers to send OTPs, and the priest or partner you book — only what they need.', 'கட்டணத்திற்கு Razorpay / Stripe, OTP அனுப்ப SMS/மின்னஞ்சல் சேவை, நீங்கள் முன்பதிவு செய்யும் புரோகிதர் அல்லது கூட்டாளர் — அவர்களுக்குத் தேவையானது மட்டும்.'],
      ['AI answers', 'விரிவான பதில்கள்', 'Detailed answers are written by an AI model from your chart data. The data is sent securely for that answer only.', 'விரிவான பதில்கள் உங்கள் ஜாதகத் தரவிலிருந்து செயற்கை நுண்ணறிவு மாதிரியால் எழுதப்படுகின்றன. அந்தப் பதிலுக்காக மட்டும் தரவு பாதுகாப்பாக அனுப்பப்படும்.'],
      ['Your choices', 'உங்கள் உரிமைகள்', `You can edit or delete family details anytime, and ask us to delete your account by writing to ${CONTACT}.`, `குடும்ப விவரங்களை எப்போதும் திருத்தலாம், நீக்கலாம்; ${CONTACT} க்கு எழுதி உங்கள் கணக்கை நீக்கக் கோரலாம்.`],
    ],
  },
  {
    id: 'terms', icon: '📜', en: 'Terms of use', ta: 'பயன்பாட்டு விதிமுறைகள்',
    body: [
      ['The service', 'சேவை', 'Kaippesi Jothidar provides Vedic astrology calculations, panchangam, predictions, a pooja store, priest and pilgrimage bookings, and subscriptions.', 'கைப்பேசி ஜோதிடர் வேத ஜோதிடக் கணிப்புகள், பஞ்சாங்கம், பலன்கள், பூஜைப் பொருள் கடை, புரோகிதர் மற்றும் யாத்திரை முன்பதிவு, சந்தா சேவைகளை வழங்குகிறது.'],
      ['Accounts', 'கணக்கு', 'Keep your sign-in secure. One family plan covers up to 8 family profiles under one account.', 'உங்கள் உள்நுழைவைப் பாதுகாப்பாக வைத்திருங்கள். ஒரு குடும்பத் திட்டம் ஒரு கணக்கில் 8 குடும்ப உறுப்பினர்கள் வரை.'],
      ['Subscriptions & trials', 'சந்தா & சோதனை', 'Paid plans run for the period purchased. Free trials and gift codes end automatically at the stated time; premium features then lock until you subscribe.', 'கட்டணத் திட்டங்கள் வாங்கிய காலம் வரை இயங்கும். இலவசச் சோதனையும் பரிசுக் குறியீடும் குறிப்பிட்ட நேரத்தில் தானாக முடியும்; பின் சந்தா செய்யும் வரை பிரீமியம் வசதிகள் பூட்டப்படும்.'],
      ['Bookings & partners', 'முன்பதிவு & கூட்டாளர்கள்', 'Priests, temples, hotels and travel are provided by independent partners; we coordinate and support you. Official temple e-services remain with HR&CE.', 'புரோகிதர், கோவில், தங்குமிடம், பயணம் சுயாதீனக் கூட்டாளர்களால் வழங்கப்படுகின்றன; நாங்கள் ஒருங்கிணைத்து உதவுகிறோம். அதிகாரப்பூர்வ கோவில் இ-சேவைகள் இந்து சமய அறநிலையத் துறையிடமே.'],
      ['Fair use', 'நியாயமான பயன்பாடு', 'Do not misuse the service, other people\'s data, or the community. We may suspend accounts that do.', 'சேவையையோ, பிறரின் தரவையோ தவறாகப் பயன்படுத்த வேண்டாம். அப்படிச் செய்யும் கணக்குகளை நிறுத்தி வைக்கலாம்.'],
      ['Copyright', 'பதிப்புரிமை', 'The Kaippesi Jothidar name, logo, design and content are protected. © 2026 Kaippesi Jothidar. All rights reserved.', 'கைப்பேசி ஜோதிடர் பெயர், சின்னம், வடிவமைப்பு, உள்ளடக்கம் பாதுகாக்கப்பட்டவை. © 2026 கைப்பேசி ஜோதிடர். அனைத்து உரிமைகளும் பாதுகாக்கப்பட்டவை.'],
    ],
  },
  {
    id: 'disclaimer', icon: '🧭', en: 'Astrology disclaimer', ta: 'ஜோதிட அறிவிப்பு',
    body: [
      ['Guidance, not certainty', 'வழிகாட்டுதல், உறுதியல்ல', 'Astrology shows tendencies and favourable timing according to tradition. Results depend on effort, circumstances and divine grace; no prediction is guaranteed.', 'ஜோதிடம் பாரம்பரியப்படி போக்குகளையும் சாதகமான நேரத்தையும் காட்டும். பலன் முயற்சி, சூழ்நிலை, இறையருளைப் பொறுத்தது; எந்தக் கணிப்பும் உத்தரவாதமல்ல.'],
      ['Professional advice first', 'நிபுணர் ஆலோசனை முதன்மை', 'For health, legal, financial, immigration and relationship decisions, always follow qualified doctors, lawyers, advisors and counsellors.', 'ஆரோக்கியம், சட்டம், நிதி, குடிவரவு, உறவு தொடர்பான முடிவுகளுக்கு எப்போதும் தகுதியான மருத்துவர், வழக்கறிஞர், ஆலோசகர்களைப் பின்பற்றவும்.'],
      ['No fear, no pressure', 'பயமில்லை, அழுத்தமில்லை', 'We never ask you to buy costly remedies. Free parigarams — prayer, lamp, charity — are always offered first.', 'விலையுயர்ந்த பரிகாரம் வாங்கச் சொல்வதில்லை. வழிபாடு, தீபம், தானம் போன்ற இலவசப் பரிகாரங்களே முதலில்.'],
    ],
  },
  {
    id: 'refunds', icon: '💳', en: 'Refunds & cancellations', ta: 'பணத்திருப்பம் & ரத்து',
    body: [
      ['Subscriptions', 'சந்தா', `If you are not satisfied, write to ${CONTACT} within 7 days of your first payment for a full refund. Renewals can be cancelled anytime and stay active until the period ends.`, `திருப்தியில்லையெனில் முதல் கட்டணத்திலிருந்து 7 நாட்களுக்குள் ${CONTACT} க்கு எழுதினால் முழுத் தொகையும் திருப்பித் தரப்படும். புதுப்பிப்பை எப்போதும் ரத்து செய்யலாம்; காலம் முடியும் வரை செயலில் இருக்கும்.`],
      ['Store orders', 'கடை ஆர்டர்கள்', 'Unopened items can be returned within 7 days of delivery. Damaged items are replaced free.', 'திறக்காத பொருட்களை விநியோகத்திலிருந்து 7 நாட்களுக்குள் திருப்பலாம். சேதமான பொருட்கள் இலவசமாக மாற்றித் தரப்படும்.'],
      ['Poojas, priests & packages', 'பூஜை, புரோகிதர், பேக்கேஜ்', 'Cancel up to 48 hours before for a full refund; later cancellations may carry the partner\'s charges.', '48 மணி நேரத்திற்கு முன் ரத்து செய்தால் முழுத் தொகை; அதன் பிறகு கூட்டாளர் கட்டணம் பிடிக்கப்படலாம்.'],
    ],
  },
];

function renderLegal(sec) {
  sec.innerHTML = `${subHeader(L('Privacy, terms & refunds', 'தனியுரிமை, விதிமுறைகள், பணத்திருப்பம்'), L('Last updated: October 2026', 'கடைசியாகப் புதுப்பித்தது: அக்டோபர் 2026'), 'more')}
    ${SECTIONS.map((s, i) => `<details class="card glass legal" id="legal-${s.id}"${i === 0 ? ' open' : ''}><summary>${s.icon} <b>${L(s.en, s.ta)}</b></summary>
      ${s.body.map(([hEn, hTa, en, tx]) => `<h4>${L(hEn, hTa)}</h4><p>${L(en, tx)}</p>`).join('')}</details>`).join('')}
    <p class="muted small center">${L('Contact', 'தொடர்புக்கு')}: ${CONTACT}</p>${copyright()}`;
}
registerScreen('legal', { render: renderLegal, parent: 'more' });
