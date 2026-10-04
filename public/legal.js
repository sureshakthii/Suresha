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
      ['Detailed answers', 'விரிவான பதில்கள்', 'Everyday answers are worked out on your phone from your chart. When the online service is switched on, detailed answers are written with the help of an outside writing service (Anthropic): your question, today’s panchangam and verified chart facts are sent for that answer only and are not used for advertising. Private profiles and sensitive topics are never sent. You can switch this off in Privacy & data.', 'அன்றாட பதில்கள் உங்கள் ஜாதகத்திலிருந்து கைப்பேசியிலேயே கணிக்கப்படும். இணைய சேவை இயக்கத்தில் இருந்தால், விரிவான பதில்கள் வெளி எழுத்துச் சேவை (Anthropic) உதவியுடன் எழுதப்படும்: உங்கள் கேள்வி, இன்றைய பஞ்சாங்கம், சரிபார்த்த ஜாதகத் தகவல் அந்தப் பதிலுக்கு மட்டும் அனுப்பப்படும்; விளம்பரத்திற்குப் பயன்படாது. தனிப்பட்ட சுயவிவரங்களும் உணர்திறன் தலைப்புகளும் அனுப்பப்படாது. தனியுரிமை & தரவு பகுதியில் நிறுத்தலாம்.'],
      ['Your choices', 'உங்கள் உரிமைகள்', 'In Settings → Privacy & data you can switch analytics and detailed answers on or off, export all your data, delete a profile, or delete your account and everything on the phone. Children’s profiles are never shared or used for analytics.', 'அமைப்புகள் → தனியுரிமை & தரவு பகுதியில் பகுப்பாய்வு, விரிவான பதில்களை இயக்க / நிறுத்தலாம்; அனைத்துத் தரவையும் ஏற்றுமதி செய்யலாம்; ஒரு சுயவிவரத்தை அல்லது கணக்கையும் கைப்பேசியிலுள்ள அனைத்தையும் நீக்கலாம். குழந்தைகளின் சுயவிவரங்கள் பகிரப்படாது, பகுப்பாய்வுக்குப் பயன்படாது.'],
    ],
  },
  {
    id: 'terms', icon: '📜', en: 'Terms of use', ta: 'பயன்பாட்டு விதிமுறைகள்',
    body: [
      ['The service', 'சேவை', 'Thunai provides Vedic astrology calculations, panchangam, predictions, a pooja store, priest and pilgrimage bookings, and subscriptions.', 'துணை வேத ஜோதிடக் கணிப்புகள், பஞ்சாங்கம், பலன்கள், பூஜைப் பொருள் கடை, புரோகிதர் மற்றும் யாத்திரை முன்பதிவு, சந்தா சேவைகளை வழங்குகிறது.'],
      ['Accounts', 'கணக்கு', 'Keep your sign-in secure. One family plan covers up to 8 family profiles under one account.', 'உங்கள் உள்நுழைவைப் பாதுகாப்பாக வைத்திருங்கள். ஒரு குடும்பத் திட்டம் ஒரு கணக்கில் 8 குடும்ப உறுப்பினர்கள் வரை.'],
      ['Subscriptions & trials', 'சந்தா & சோதனை', 'Paid plans are one-time payments for the period purchased and do not renew automatically. Premium includes a stated monthly number of detailed answers (shown on the Plans screen); everyday guidance is not limited. Prices shown are initial test prices and may change; you always pay the price shown at checkout.', 'கட்டணத் திட்டங்கள் வாங்கிய காலத்திற்கான ஒருமுறைக் கட்டணம்; தானாகப் புதுப்பிக்கப்படாது. பிரீமியத்தில் குறிப்பிட்ட மாதாந்திர விரிவான பதில் வரம்பு உண்டு (திட்டங்கள் திரையில்); அன்றாட வழிகாட்டலுக்கு வரம்பில்லை. காட்டப்படும் விலைகள் தொடக்கச் சோதனை விலைகள்; வாங்கும்போது காட்டும் விலையே செலுத்துவீர்கள்.'],
      ['Bookings & partners', 'முன்பதிவு & கூட்டாளர்கள்', 'Bookings are offered only where a partner can actually fulfil them; until then the app shows them as unavailable. Any commission or fee we receive, and any commercial relationship with a temple, priest or travel partner, is shown before you pay. Payment never affects which temples we recommend. Practitioners are labelled “verified” only after identity and experience checks exist. Official temple e-services remain with HR&CE.', 'நிறைவேற்றக்கூடிய கூட்டாளர் உள்ள இடங்களில் மட்டுமே முன்பதிவு வழங்கப்படும்; அதுவரை “இல்லை” எனக் காட்டப்படும். நாங்கள் பெறும் கமிஷன், கட்டணம், கோவில் / புரோகிதர் / பயணக் கூட்டாளருடனான வணிக உறவு — கட்டணத்திற்கு முன் காட்டப்படும். கட்டணம் எந்தக் கோவிலைப் பரிந்துரைப்போம் என்பதைப் பாதிக்காது. அடையாளம், அனுபவச் சரிபார்ப்பு இருந்த பிறகே “சரிபார்க்கப்பட்டவர்” எனக் குறிக்கப்படும். அதிகாரப்பூர்வ கோவில் இ-சேவைகள் HR&CE வசம்.'],
      ['Fair use', 'நியாயமான பயன்பாடு', 'Do not misuse the service, other people\'s data, or the community. We may suspend accounts that do.', 'சேவையையோ, பிறரின் தரவையோ தவறாகப் பயன்படுத்த வேண்டாம். அப்படிச் செய்யும் கணக்குகளை நிறுத்தி வைக்கலாம்.'],
      ['Copyright', 'பதிப்புரிமை', 'The Thunai name, logo, design and content are protected. © 2026 Thunai. All rights reserved.', 'துணை பெயர், சின்னம், வடிவமைப்பு, உள்ளடக்கம் பாதுகாக்கப்பட்டவை. © 2026 துணை. அனைத்து உரிமைகளும் பாதுகாக்கப்பட்டவை.'],
    ],
  },
  {
    id: 'disclaimer', icon: '🧭', en: 'Astrology disclaimer', ta: 'ஜோதிட அறிவிப்பு',
    body: [
      ['Guidance, not certainty', 'வழிகாட்டுதல், உறுதியல்ல', 'Astrology shows tendencies and favourable timing according to tradition. Results depend on effort, circumstances and divine grace; no prediction is guaranteed.', 'ஜோதிடம் பாரம்பரியப்படி போக்குகளையும் சாதகமான நேரத்தையும் காட்டும். பலன் முயற்சி, சூழ்நிலை, இறையருளைப் பொறுத்தது; எந்தக் கணிப்பும் உத்தரவாதமல்ல.'],
      ['Professional advice first', 'நிபுணர் ஆலோசனை முதன்மை', 'For health, legal, financial, immigration and relationship decisions, always follow qualified doctors, lawyers, advisors and counsellors.', 'ஆரோக்கியம், சட்டம், நிதி, குடிவரவு, உறவு தொடர்பான முடிவுகளுக்கு எப்போதும் தகுதியான மருத்துவர், வழக்கறிஞர், ஆலோசகர்களைப் பின்பற்றவும்.'],
      ['Traditional interpretation', 'பாரம்பரிய விளக்கம்', 'Planet positions are calculated astronomically, but interpretations are traditional beliefs, not scientific measurements. Scores are traditional points, not probabilities. Astronomical accuracy does not prove life predictions. We never predict death or lifespan, diagnose illness, or guarantee marriage, pregnancy, visas, court outcomes or finances.', 'கிரக நிலைகள் வானியல் முறையில் கணிக்கப்படுகின்றன; ஆனால் விளக்கங்கள் பாரம்பரிய நம்பிக்கைகள், அறிவியல் அளவீடுகள் அல்ல. மதிப்பெண்கள் பாரம்பரியப் புள்ளிகள், நிகழ்தகவுகள் அல்ல. மரணம் / ஆயுள் கணிப்பு, நோய் கண்டறிதல், திருமணம், கர்ப்பம், விசா, வழக்கு, நிதி உத்தரவாதம் — எதுவும் இல்லை.'],
      ['No fear, no pressure', 'பயமில்லை, அழுத்தமில்லை', 'We never ask you to buy costly remedies. Free parigarams — prayer, lamp, charity — are always offered first.', 'விலையுயர்ந்த பரிகாரம் வாங்கச் சொல்வதில்லை. வழிபாடு, தீபம், தானம் போன்ற இலவசப் பரிகாரங்களே முதலில்.'],
    ],
  },
  {
    id: 'refunds', icon: '💳', en: 'Refunds & cancellations', ta: 'பணத்திருப்பம் & ரத்து',
    body: [
      ['Subscriptions', 'சந்தா', `Full refund on request within 7 days of purchase; after that, a pro-rata refund for unused whole months of a yearly plan. Write to ${CONTACT}. Plans do not auto-renew, so there is nothing to cancel — access ends on the expiry date. Failed or duplicate payments are refunded automatically to the original method within 5–7 working days.`, `வாங்கிய 7 நாட்களுக்குள் கோரினால் முழுப் பணத்திருப்பம்; அதன் பின் ஆண்டுத் திட்டத்தில் பயன்படுத்தாத முழு மாதங்களுக்கு விகிதாசாரப் பணத்திருப்பம். ${CONTACT}-க்கு எழுதுங்கள். திட்டங்கள் தானாகப் புதுப்பிக்கப்படாது; ரத்து செய்ய வேண்டியதில்லை — காலாவதி நாளில் அணுகல் முடியும். தோல்வியுற்ற / இரட்டைக் கட்டணங்கள் 5–7 வேலை நாட்களில் அசல் முறைக்குத் திருப்பப்படும்.`],
      ['Store orders', 'கடை ஆர்டர்கள்', 'The store is not open yet (sample catalogue). When it opens: unopened items can be returned within 7 days of delivery; damaged items are replaced free.', 'திறக்காத பொருட்களை விநியோகத்திலிருந்து 7 நாட்களுக்குள் திருப்பலாம். சேதமான பொருட்கள் இலவசமாக மாற்றித் தரப்படும்.'],
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
