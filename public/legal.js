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
      ['Family sharing', 'குடும்பப் பகிர்வு', 'You choose which profiles to share with adults you invite. Only birth details are shared (name, date, time, place); chats, health notes and goals are never shared. Revoking a share or leaving the group deletes the server copy.', 'நீங்கள் அழைக்கும் பெரியவர்களுடன் எந்தச் சுயவிவரங்களைப் பகிர்வது என்பதை நீங்களே தேர்ந்தெடுக்கிறீர்கள். பிறப்பு விவரங்கள் (பெயர், தேதி, நேரம், இடம்) மட்டுமே பகிரப்படும்; உரையாடல்கள், உடல்நலக் குறிப்புகள், இலக்குகள் ஒருபோதும் பகிரப்படாது. பகிர்வைத் திரும்பப் பெற்றாலோ குழுவிலிருந்து விலகினாலோ சேவையக நகல் நீக்கப்படும்.'],
      ['Your choices', 'உங்கள் உரிமைகள்', 'In Settings → Privacy & data you can switch analytics and detailed answers on or off, export all your data, delete a profile, or delete your account and everything on the phone. Children’s profiles are never shared or used for analytics.', 'அமைப்புகள் → தனியுரிமை & தரவு பகுதியில் பகுப்பாய்வு, விரிவான பதில்களை இயக்க / நிறுத்தலாம்; அனைத்துத் தரவையும் ஏற்றுமதி செய்யலாம்; ஒரு சுயவிவரத்தை அல்லது கணக்கையும் கைப்பேசியிலுள்ள அனைத்தையும் நீக்கலாம். குழந்தைகளின் சுயவிவரங்கள் பகிரப்படாது, பகுப்பாய்வுக்குப் பயன்படாது.'],
    ],
  },
  {
    id: 'terms', icon: '📜', en: 'Terms of use', ta: 'பயன்பாட்டு விதிமுறைகள்',
    body: [
      ['The service', 'சேவை', 'Thunai provides Vedic astrology calculations, panchangam, predictions, a pooja store, priest and pilgrimage bookings, and subscriptions.', 'துணை வேத ஜோதிடக் கணிப்புகள், பஞ்சாங்கம், பலன்கள், பூஜைப் பொருள் கடை, புரோகிதர் மற்றும் யாத்திரை முன்பதிவு, சந்தா சேவைகளை வழங்குகிறது.'],
      ['Accounts', 'கணக்கு', 'Keep your sign-in secure. One family plan covers up to 8 family profiles under one account.', 'உங்கள் உள்நுழைவைப் பாதுகாப்பாக வைத்திருங்கள். ஒரு குடும்பத் திட்டம் ஒரு கணக்கில் 8 குடும்ப உறுப்பினர்கள் வரை.'],
      ['Subscriptions & trials', 'சந்தா & சோதனை', 'Paid plans are one-time payments for the period purchased and do not renew automatically. The Personal and Family plans include a stated monthly number of detailed answers (shown on the Plans screen); everyday guidance is not limited. Without a paid plan, basic use stays free — calendar, charts, guidance, basic porutham, baby-name browsing, meanings and star letters, weekly planning, one saved goal, one saved journey and up to 10 shortlisted names; calculations, safety explanations and privacy controls are the same on every plan. Features marked “coming soon” are not part of what you pay for. Prices shown are initial test prices and may change; you always pay the price shown at checkout.', 'கட்டணத் திட்டங்கள் வாங்கிய காலத்திற்கான ஒருமுறைக் கட்டணம்; தானாகப் புதுப்பிக்கப்படாது. தனிநபர், குடும்பத் திட்டங்களில் குறிப்பிட்ட மாதாந்திர விரிவான பதில் வரம்பு உண்டு (திட்டங்கள் திரையில்); அன்றாட வழிகாட்டலுக்கு வரம்பில்லை. கட்டணத் திட்டம் இல்லாமலும் அடிப்படைப் பயன்பாடு இலவசம் — நாட்காட்டி, ஜாதகம், வழிகாட்டல், அடிப்படைப் பொருத்தம், குழந்தைப் பெயர் தேடல், பொருள், நட்சத்திர எழுத்துகள், வாராந்திரத் திட்டமிடல், ஒரு சேமித்த இலக்கு, ஒரு சேமித்த பயணம், 10 பெயர்கள் வரை பட்டியல்; கணிப்பு, பாதுகாப்பு விளக்கம், தனியுரிமைக் கட்டுப்பாடுகள் எல்லாத் திட்டங்களிலும் ஒன்றே. “விரைவில்” எனக் குறித்த வசதிகள் நீங்கள் செலுத்தும் கட்டணத்தில் சேராது. காட்டப்படும் விலைகள் தொடக்கச் சோதனை விலைகள்; வாங்கும்போது காட்டும் விலையே செலுத்துவீர்கள்.'],
      ['Bookings & partners', 'முன்பதிவு & கூட்டாளர்கள்', 'Bookings are offered only where a partner can actually fulfil them; until then the app shows them as unavailable. Any commission or fee we receive, and any commercial relationship with a temple, priest or travel partner, is shown before you pay. Payment never affects which temples we recommend. Practitioners are labelled “verified” only after identity and experience checks exist. Official temple e-services remain with HR&CE.', 'நிறைவேற்றக்கூடிய கூட்டாளர் உள்ள இடங்களில் மட்டுமே முன்பதிவு வழங்கப்படும்; அதுவரை “இல்லை” எனக் காட்டப்படும். நாங்கள் பெறும் கமிஷன், கட்டணம், கோவில் / புரோகிதர் / பயணக் கூட்டாளருடனான வணிக உறவு — கட்டணத்திற்கு முன் காட்டப்படும். கட்டணம் எந்தக் கோவிலைப் பரிந்துரைப்போம் என்பதைப் பாதிக்காது. அடையாளம், அனுபவச் சரிபார்ப்பு இருந்த பிறகே “சரிபார்க்கப்பட்டவர்” எனக் குறிக்கப்படும். அதிகாரப்பூர்வ கோவில் இ-சேவைகள் HR&CE வசம்.'],
      ['Fair use', 'நியாயமான பயன்பாடு', 'Do not misuse the service, other people\'s data, or the community. We may suspend accounts that do.', 'சேவையையோ, பிறரின் தரவையோ தவறாகப் பயன்படுத்த வேண்டாம். அப்படிச் செய்யும் கணக்குகளை நிறுத்தி வைக்கலாம்.'],
      ['Copyright', 'பதிப்புரிமை', 'The Thunai name, logo, design and content are protected. © 2026 Thunai (துணை). All rights reserved. Concept & Developed by AG TECHNOLOGY SOLUTIONS.', 'துணை பெயர், சின்னம், வடிவமைப்பு, உள்ளடக்கம் பாதுகாக்கப்பட்டவை. © 2026 Thunai (துணை). அனைத்து உரிமைகளும் பாதுகாக்கப்பட்டவை. கருத்தாக்கம் & உருவாக்கம்: AG TECHNOLOGY SOLUTIONS.'],
      ['Data sources & credits', 'தரவு மூலங்கள் & நன்றி', 'Place names and coordinates: GeoNames (geonames.org, CC BY 4.0), trimmed for offline use; online place search: OpenStreetMap Nominatim (© OpenStreetMap contributors, ODbL). Time zones: the IANA time zone database and timezone-boundary-builder (ODbL). Country calling codes: Google libphonenumber metadata (Apache 2.0); Tamil country names: Unicode CLDR. Planet positions: astronomy-engine (MIT). Weather: Open-Meteo (CC BY 4.0).', 'ஊர்ப் பெயர்கள், அமைவிடங்கள்: GeoNames (geonames.org, CC BY 4.0) — இணையமின்றிப் பயன்படச் சுருக்கப்பட்டது; இணைய இடத் தேடல்: OpenStreetMap Nominatim (© OpenStreetMap பங்களிப்பாளர்கள், ODbL). நேர மண்டலங்கள்: IANA நேர மண்டலத் தரவுத்தளம், timezone-boundary-builder (ODbL). நாட்டு அழைப்புக் குறியீடுகள்: Google libphonenumber (Apache 2.0); தமிழ் நாட்டுப் பெயர்கள்: Unicode CLDR. கிரக நிலைகள்: astronomy-engine (MIT). வானிலை: Open-Meteo (CC BY 4.0).'],
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
    id: 'grievance', icon: '📮', en: 'Grievance Officer', ta: 'குறைதீர் அலுவலர்',
    body: [
      ['Grievance Officer', 'குறைதீர் அலுவலர்', 'Under the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021 and the Digital Personal Data Protection Act, 2023, you may raise any complaint about the app, your data or content with our Grievance Officer. Complaints are acknowledged within 24 hours and resolved within 15 days.', 'தகவல் தொழில்நுட்ப (இடைநிலை வழிகாட்டுதல்கள் மற்றும் டிஜிட்டல் ஊடக நெறிமுறை) விதிகள் 2021, டிஜிட்டல் தனிநபர் தரவுப் பாதுகாப்புச் சட்டம் 2023-இன்படி, செயலி, உங்கள் தரவு அல்லது உள்ளடக்கம் குறித்த எந்தப் புகாரையும் எங்கள் குறைதீர் அலுவலரிடம் தெரிவிக்கலாம். புகார் 24 மணி நேரத்தில் ஒப்புக்கொள்ளப்பட்டு 15 நாட்களில் தீர்க்கப்படும்.'],
      ['Contact details', 'தொடர்பு விவரம்', 'Name, e-mail, phone and postal address of the Grievance Officer: to be filled in by AG Technology Solutions before public release.', 'குறைதீர் அலுவலரின் பெயர், மின்னஞ்சல், தொலைபேசி, அஞ்சல் முகவரி: பொது வெளியீட்டிற்கு முன் AG Technology Solutions நிரப்பும்.'],
    ],
  },
  {
    id: 'refunds', icon: '💳', en: 'Refunds & cancellations', ta: 'பணத்திருப்பம் & ரத்து',
    body: [
      ['Subscriptions', 'சந்தா', `Full refund on request within 7 days of purchase; after that, a pro-rata refund for unused whole months of a yearly plan. Write to ${CONTACT}. Plans do not auto-renew, so there is nothing to cancel — access ends on the expiry date. Failed or duplicate payments are refunded automatically to the original method within 5–7 working days.`, `வாங்கிய 7 நாட்களுக்குள் கோரினால் முழுப் பணத்திருப்பம்; அதன் பின் ஆண்டுத் திட்டத்தில் பயன்படுத்தாத முழு மாதங்களுக்கு விகிதாசாரப் பணத்திருப்பம். ${CONTACT}-க்கு எழுதுங்கள். திட்டங்கள் தானாகப் புதுப்பிக்கப்படாது; ரத்து செய்ய வேண்டியதில்லை — காலாவதி நாளில் அணுகல் முடியும். தோல்வியுற்ற / இரட்டைக் கட்டணங்கள் 5–7 வேலை நாட்களில் அசல் முறைக்குத் திருப்பப்படும்.`],
      ['One-time packages', 'ஒருமுறைத் தொகுப்புகள்', 'The Marriage package (one couple, 90 days) and the Journey package (one saved journey, 60 days) are one-time payments at initial test prices. They are not subscriptions and never renew; access ends on the date shown. Each covers only the couple or journey chosen at purchase, and its stated number of detailed answers. Full refund on request within 7 days of purchase, the same as plans. Features marked “coming soon” are not part of what you pay for.', 'திருமணத் தொகுப்பு (ஒரு ஜோடி, 90 நாள்), யாத்திரைத் தொகுப்பு (ஒரு சேமித்த பயணம், 60 நாள்) — தொடக்கச் சோதனை விலையில் ஒருமுறைக் கட்டணம். இவை சந்தா அல்ல, புதுப்பிக்கப்படாது; காட்டிய நாளில் அணுகல் முடியும். வாங்கும்போது தேர்ந்தெடுத்த ஜோடி / பயணத்திற்கும், குறிப்பிட்ட விரிவான பதில்களுக்கும் மட்டும். திட்டங்களைப் போலவே, வாங்கிய 7 நாட்களுக்குள் கோரினால் முழுப் பணத்திருப்பம். “விரைவில்” எனக் குறித்தவை கட்டணத்தில் சேராது.'],
      ['Store orders', 'கடை ஆர்டர்கள்', 'The store is not open yet (sample catalogue). When it opens: unopened items can be returned within 7 days of delivery; damaged items are replaced free.', 'திறக்காத பொருட்களை விநியோகத்திலிருந்து 7 நாட்களுக்குள் திருப்பலாம். சேதமான பொருட்கள் இலவசமாக மாற்றித் தரப்படும்.'],
      ['Poojas, priests & packages', 'பூஜை, புரோகிதர், பேக்கேஜ்', 'Cancel up to 48 hours before for a full refund; later cancellations may carry the partner\'s charges.', '48 மணி நேரத்திற்கு முன் ரத்து செய்தால் முழுத் தொகை; அதன் பிறகு கூட்டாளர் கட்டணம் பிடிக்கப்படலாம்.'],
    ],
  },
];

function renderLegal(sec, params = {}) {
  sec.innerHTML = `${subHeader(L('Privacy, terms & refunds', 'தனியுரிமை, விதிமுறைகள், பணத்திருப்பம்'), L('Last updated: October 2026', 'கடைசியாகப் புதுப்பித்தது: அக்டோபர் 2026'), 'more')}
    ${SECTIONS.map((s, i) => `<details class="card glass legal" id="legal-${s.id}"${(params.open ? params.open === s.id : i === 0) ? ' open' : ''}><summary>${s.icon} <b>${L(s.en, s.ta)}</b></summary>
      ${s.body.map(([hEn, hTa, en, tx]) => `<h4>${L(hEn, hTa)}</h4><p>${L(en, tx)}</p>`).join('')}</details>`).join('')}
    <p class="muted small center">${L('Contact', 'தொடர்புக்கு')}: ${CONTACT}</p>${copyright()}`;
  if (params.open) requestAnimationFrame(() => document.getElementById(`legal-${params.open}`)?.scrollIntoView({ block: 'start' }));
}
registerScreen('legal', { render: renderLegal, parent: 'more' });

// One legal footer on every screen: screens that end with their own copyright() keep it; for every other screen a
// shared footer (© 2026 Thunai … Concept & Developed by AG TECHNOLOGY SOLUTIONS · Privacy · Terms · Grievance) sits
// below the page content. styles.css hides it while the open screen has its own footer, so it never shows twice.
if (typeof document !== 'undefined') {
  const paint = () => requestAnimationFrame(() => {
    const views = document.getElementById('views');
    if (!views) return;
    let f = document.getElementById('appFooter');
    if (!f) { f = document.createElement('div'); f.id = 'appFooter'; views.after(f); }
    f.innerHTML = copyright();
  });
  document.addEventListener('kj:screen', paint);
  document.addEventListener('kj:lang', paint);
}
