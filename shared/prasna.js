// Thunai — Prasna (horary) + Muhurtha scoring for "Do or Don't" questions.
// Rules follow common Tamil panchangam practice: Horai, Rahu Kalam / Yamagandam / Guligai,
// Tara Bala, Chandra Bala / Chandrashtamam, Nakshatra nature, Tithi, Yoga, weekday and Prasna Lagna.
import { panchang, RASIS, NAKSHATRAS } from './astro.js';

export const CATEGORIES = [
  {
    id: 'surgery', icon: '🏥', en: 'Hospital / Surgery', ta: 'மருத்துவமனை / அறுவை சிகிச்சை',
    goodHora: ['Sun', 'Jupiter', 'Mars'], badHora: ['Saturn'],
    goodNak: ['kshipra', 'tikshna', 'mridu'], badNak: ['ugra'],
    goodDays: [0, 2, 4], badDays: [6],
  },
  {
    id: 'cheque', icon: '✍️', en: 'Cheque Signing / Payment', ta: 'காசோலை கையெழுத்து / பணப்பரிமாற்றம்',
    goodHora: ['Jupiter', 'Venus', 'Mercury', 'Moon'], badHora: ['Saturn', 'Mars'],
    goodNak: ['chara', 'kshipra', 'mridu', 'dhruva'], badNak: ['ugra', 'tikshna'],
    goodDays: [1, 3, 4, 5], badDays: [2, 6],
  },
  {
    id: 'meeting', icon: '🤝', en: 'Meeting', ta: 'சந்திப்பு / கூட்டம்',
    goodHora: ['Mercury', 'Jupiter', 'Venus', 'Moon', 'Sun'], badHora: ['Saturn'],
    goodNak: ['kshipra', 'mridu', 'chara', 'dhruva'], badNak: ['ugra'],
    goodDays: [1, 3, 4, 5], badDays: [],
  },
  {
    id: 'client', icon: '💼', en: 'Client Visit / Business Deal', ta: 'வாடிக்கையாளர் சந்திப்பு',
    goodHora: ['Mercury', 'Jupiter', 'Venus'], badHora: ['Saturn', 'Mars'],
    goodNak: ['kshipra', 'chara', 'mridu'], badNak: ['ugra', 'tikshna'],
    goodDays: [3, 4, 5], badDays: [2],
  },
  {
    id: 'bride_groom', icon: '💍', en: 'Bride / Groom Seeing', ta: 'மணமகள் / மணமகன் பார்த்தல்',
    goodHora: ['Venus', 'Jupiter', 'Moon', 'Mercury'], badHora: ['Saturn', 'Mars', 'Sun'],
    goodNak: ['mridu', 'dhruva', 'kshipra'], badNak: ['ugra', 'tikshna'],
    goodDays: [1, 3, 4, 5], badDays: [2, 6], auspicious: true,
  },
  {
    id: 'court', icon: '⚖️', en: 'Court / Legal Case', ta: 'நீதிமன்றம் / வழக்கு',
    goodHora: ['Sun', 'Jupiter', 'Mars'], badHora: ['Saturn', 'Moon'],
    goodNak: ['tikshna', 'ugra', 'kshipra'], badNak: [],
    goodDays: [0, 2, 4], badDays: [6],
  },
  {
    id: 'office', icon: '🏢', en: 'Office / Job / Interview', ta: 'அலுவலகம் / வேலை / நேர்காணல்',
    goodHora: ['Sun', 'Jupiter', 'Mercury', 'Moon'], badHora: ['Saturn'],
    goodNak: ['dhruva', 'kshipra', 'mridu', 'chara'], badNak: ['ugra'],
    goodDays: [0, 1, 3, 4], badDays: [6],
  },
  {
    id: 'contract', icon: '📜', en: 'Contract / Agreement Signing', ta: 'ஒப்பந்தம் கையெழுத்து',
    goodHora: ['Mercury', 'Jupiter', 'Venus'], badHora: ['Saturn', 'Mars'],
    goodNak: ['dhruva', 'mridu', 'kshipra'], badNak: ['ugra', 'tikshna'],
    goodDays: [3, 4, 5], badDays: [2, 6], auspicious: true,
  },
  {
    id: 'travel', icon: '✈️', en: 'Travel / Journey', ta: 'பயணம்',
    goodHora: ['Moon', 'Mercury', 'Venus', 'Jupiter'], badHora: ['Saturn', 'Mars'],
    goodNak: ['chara', 'kshipra', 'mridu'], badNak: ['ugra', 'dhruva'],
    goodDays: [1, 3, 4, 5], badDays: [2],
  },
  {
    id: 'property', icon: '🏡', en: 'Land / House Purchase', ta: 'நிலம் / வீடு வாங்குதல்',
    goodHora: ['Jupiter', 'Venus', 'Mars', 'Mercury'], badHora: ['Saturn'],
    goodNak: ['dhruva', 'mridu'], badNak: ['ugra', 'tikshna'],
    goodDays: [1, 3, 4, 5], badDays: [6], auspicious: true,
  },
  {
    id: 'business', icon: '🚀', en: 'Start New Business', ta: 'புதிய தொழில் தொடக்கம்',
    goodHora: ['Mercury', 'Jupiter', 'Venus', 'Sun'], badHora: ['Saturn', 'Mars'],
    goodNak: ['dhruva', 'kshipra', 'mridu'], badNak: ['ugra', 'tikshna'],
    goodDays: [1, 3, 4, 5], badDays: [2, 6], auspicious: true,
  },
  {
    id: 'gold_vehicle', icon: '🚗', en: 'Gold / Vehicle Purchase', ta: 'தங்கம் / வாகனம் வாங்குதல்',
    goodHora: ['Venus', 'Jupiter', 'Moon', 'Mercury'], badHora: ['Saturn', 'Mars'],
    goodNak: ['kshipra', 'chara', 'mridu', 'dhruva'], badNak: ['ugra'],
    goodDays: [1, 3, 4, 5], badDays: [2, 6], auspicious: true,
  },
  {
    id: 'loan', icon: '💰', en: 'Loan / Investment', ta: 'கடன் / முதலீடு',
    goodHora: ['Jupiter', 'Venus', 'Mercury'], badHora: ['Saturn', 'Mars'],
    goodNak: ['chara', 'kshipra', 'dhruva'], badNak: ['ugra', 'tikshna'],
    goodDays: [3, 4, 5], badDays: [2],
  },
  {
    id: 'education', icon: '🎓', en: 'Exam / Education', ta: 'தேர்வு / கல்வி',
    goodHora: ['Mercury', 'Jupiter', 'Sun'], badHora: ['Saturn'],
    goodNak: ['kshipra', 'mridu', 'chara'], badNak: ['ugra'],
    goodDays: [0, 3, 4], badDays: [],
  },
  {
    id: 'launch', icon: '🚀', en: 'Launch (product / rocket / website / shop)', ta: 'வெளியீடு (தயாரிப்பு / ராக்கெட் / கடை திறப்பு)',
    goodHora: ['Sun', 'Jupiter', 'Mercury', 'Venus'], badHora: ['Saturn'],
    goodNak: ['kshipra', 'chara', 'dhruva'], badNak: ['ugra'],
    goodDays: [0, 3, 4, 5], badDays: [6], goodLagna: [0, 2, 3, 6, 9],
  },
  {
    id: 'tech_partner', icon: '🤖', en: 'New Technology / Third-party Contract', ta: 'புதிய தொழில்நுட்ப / மூன்றாம் தரப்பு ஒப்பந்தம்',
    goodHora: ['Mercury', 'Jupiter', 'Venus', 'Moon'], badHora: ['Saturn', 'Mars'],
    goodNak: ['dhruva', 'mridu', 'kshipra'], badNak: ['ugra', 'tikshna'],
    goodDays: [3, 4, 5], badDays: [2, 6],
  },
  {
    id: 'job_change', icon: '🧭', en: 'Job Change / Resignation', ta: 'வேலை மாற்றம் / ராஜினாமா',
    goodHora: ['Sun', 'Jupiter', 'Mercury'], badHora: ['Saturn', 'Mars'],
    goodNak: ['chara', 'kshipra', 'mridu'], badNak: ['ugra'],
    goodDays: [0, 3, 4], badDays: [2, 6],
  },
  {
    id: 'visa', icon: '🛂', en: 'Visa / Foreign Travel / Abroad Study', ta: 'விசா / வெளிநாட்டுப் பயணம் / படிப்பு',
    goodHora: ['Moon', 'Jupiter', 'Mercury', 'Venus'], badHora: ['Saturn'],
    goodNak: ['chara', 'kshipra', 'mridu'], badNak: ['ugra'],
    goodDays: [1, 3, 4, 5], badDays: [2],
  },
  {
    id: 'bhoomi_pooja', icon: '🏗️', en: 'Construction Start (Bhoomi Pooja)', ta: 'கட்டுமானத் தொடக்கம் (பூமி பூஜை)',
    goodHora: ['Jupiter', 'Venus', 'Mars', 'Mercury'], badHora: ['Saturn'],
    goodNak: ['dhruva', 'mridu'], badNak: ['ugra', 'tikshna'],
    goodDays: [1, 3, 4, 5], badDays: [6, 0], goodLagna: [1, 4, 7, 10],
  },
  {
    id: 'lend_money', icon: '🤝', en: 'Lending / Borrowing Money', ta: 'கடன் கொடுத்தல் / வாங்குதல்',
    goodHora: ['Jupiter', 'Venus', 'Mercury'], badHora: ['Saturn', 'Mars'],
    goodNak: ['chara', 'kshipra'], badNak: ['ugra', 'tikshna', 'dhruva'],
    goodDays: [3, 4], badDays: [2, 6],
  },
  {
    id: 'competition', icon: '🏆', en: 'Competition / Election / Sports', ta: 'போட்டி / தேர்தல் / விளையாட்டு',
    goodHora: ['Sun', 'Mars', 'Jupiter'], badHora: ['Saturn'],
    goodNak: ['tikshna', 'kshipra', 'ugra'], badNak: [],
    goodDays: [0, 2, 4], badDays: [6],
  },
  // ---- More everyday Prasnam questions (build 21). Horai lords follow their karakatvam: Venus — jewellery, clothes,
  // comforts; Jupiter — wealth, gold, elders, auspicious family events; Mercury — documents, trade, phones, learning;
  // Moon — travel, water, food, the public; Sun — government, authority, health; Mars — land, police, fire, digging.
  // Star natures: dhruva (fixed) for lasting things, chara (movable) for moving / sending, kshipra (swift) for
  // trade and medicine, mridu (soft) for ornaments, clothes and celebrations, tikshna / ugra for firm action.
  {
    id: 'jewellery', icon: '💎', en: 'Buying Jewellery / Gold', ta: 'நகை / தங்கம் வாங்குதல்',
    goodHora: ['Venus', 'Jupiter', 'Moon', 'Mercury'], badHora: ['Saturn', 'Mars'],
    goodNak: ['mridu', 'kshipra', 'chara', 'dhruva'], badNak: ['ugra', 'tikshna'],
    goodDays: [1, 3, 4, 5], badDays: [2, 6], auspicious: true,
  },
  {
    id: 'clothes', icon: '👗', en: 'Buying Clothes / Silk for a Function', ta: 'புத்தாடை / பட்டு வாங்குதல்',
    goodHora: ['Venus', 'Moon', 'Mercury', 'Jupiter'], badHora: ['Saturn', 'Mars'],
    goodNak: ['mridu', 'kshipra', 'chara'], badNak: ['ugra', 'tikshna'],
    goodDays: [1, 3, 4, 5], badDays: [2, 6],
  },
  {
    id: 'electronics', icon: '📱', en: 'New Mobile / Electronics', ta: 'புதிய கைப்பேசி / மின்னணுப் பொருள்',
    goodHora: ['Mercury', 'Venus', 'Jupiter', 'Moon'], badHora: ['Saturn'],
    goodNak: ['kshipra', 'chara', 'mridu'], badNak: ['ugra'],
    goodDays: [1, 3, 4, 5], badDays: [6],
  },
  {
    id: 'pet_cattle', icon: '🐄', en: 'Buying a Pet / Cattle', ta: 'செல்லப்பிராணி / கால்நடை வாங்குதல்',
    goodHora: ['Moon', 'Jupiter', 'Venus', 'Mercury'], badHora: ['Saturn', 'Mars'],
    goodNak: ['chara', 'kshipra', 'mridu', 'dhruva'], badNak: ['ugra', 'tikshna'],
    goodDays: [1, 3, 4, 5], badDays: [2, 6],
  },
  {
    id: 'rent_agreement', icon: '🔑', en: 'House Rent / Lease Agreement', ta: 'வாடகை / குத்தகை ஒப்பந்தம்',
    goodHora: ['Mercury', 'Jupiter', 'Venus', 'Moon'], badHora: ['Saturn', 'Mars'],
    goodNak: ['dhruva', 'mridu', 'kshipra'], badNak: ['ugra', 'tikshna'],
    goodDays: [1, 3, 4, 5], badDays: [2, 6],
  },
  {
    id: 'house_move', icon: '📦', en: 'Moving House (Veedu Maattram)', ta: 'வீடு மாற்றம் / குடிபுகுதல்',
    goodHora: ['Jupiter', 'Venus', 'Moon', 'Mercury'], badHora: ['Saturn', 'Mars'],
    goodNak: ['dhruva', 'mridu', 'chara'], badNak: ['ugra', 'tikshna'],
    goodDays: [1, 3, 4, 5], badDays: [2, 6], auspicious: true,
  },
  {
    id: 'land_buy', icon: '🌾', en: 'Buying Land / Plot', ta: 'நிலம் / மனை வாங்குதல்',
    goodHora: ['Mars', 'Jupiter', 'Venus', 'Mercury'], badHora: ['Saturn'],
    goodNak: ['dhruva', 'mridu'], badNak: ['ugra', 'tikshna'],
    goodDays: [1, 3, 4, 5], badDays: [6], auspicious: true,
  },
  {
    id: 'property_sell', icon: '🏷️', en: 'Selling Property', ta: 'சொத்து விற்பனை',
    goodHora: ['Mercury', 'Jupiter', 'Venus', 'Moon'], badHora: ['Saturn'],
    goodNak: ['chara', 'kshipra', 'mridu'], badNak: ['ugra'],
    goodDays: [1, 3, 4, 5], badDays: [2, 6],
  },
  {
    id: 'kitchen_start', icon: '🔥', en: 'Kitchen / New Stove Start (Aduppu)', ta: 'சமையலறை / புதிய அடுப்பு தொடக்கம்',
    goodHora: ['Jupiter', 'Venus', 'Moon', 'Mercury'], badHora: ['Saturn', 'Mars'],
    goodNak: ['dhruva', 'mridu', 'kshipra'], badNak: ['ugra', 'tikshna'],
    goodDays: [1, 3, 4, 5], badDays: [2, 6], auspicious: true,
  },
  {
    id: 'borewell', icon: '💧', en: 'Digging a Well / Borewell', ta: 'கிணறு / ஆழ்துளைக் கிணறு தோண்டுதல்',
    goodHora: ['Moon', 'Jupiter', 'Venus', 'Mars'], badHora: ['Saturn', 'Sun'],
    goodNak: ['dhruva', 'mridu', 'kshipra'], badNak: ['ugra', 'tikshna'],
    goodDays: [1, 3, 4, 5], badDays: [0, 6],
  },
  {
    id: 'interview', icon: '🎤', en: 'Job Interview', ta: 'வேலை நேர்காணல்',
    goodHora: ['Sun', 'Jupiter', 'Mercury', 'Moon'], badHora: ['Saturn'],
    goodNak: ['kshipra', 'chara', 'mridu', 'dhruva'], badNak: ['ugra'],
    goodDays: [0, 1, 3, 4], badDays: [6],
  },
  {
    id: 'job_join', icon: '🧑‍💼', en: 'Joining a New Job', ta: 'புதிய வேலையில் சேருதல்',
    goodHora: ['Sun', 'Jupiter', 'Mercury', 'Moon'], badHora: ['Saturn', 'Mars'],
    goodNak: ['dhruva', 'kshipra', 'mridu'], badNak: ['ugra', 'tikshna'],
    goodDays: [0, 1, 3, 4], badDays: [2, 6],
  },
  {
    id: 'salary_talk', icon: '📈', en: 'Salary / Promotion Talk', ta: 'சம்பளம் / பதவி உயர்வு பேச்சு',
    goodHora: ['Jupiter', 'Sun', 'Mercury', 'Venus'], badHora: ['Saturn', 'Mars'],
    goodNak: ['kshipra', 'mridu', 'chara'], badNak: ['ugra'],
    goodDays: [0, 3, 4, 5], badDays: [2, 6],
  },
  {
    id: 'partnership', icon: '👥', en: 'Partnership Talk', ta: 'கூட்டுத் தொழில் பேச்சு',
    goodHora: ['Mercury', 'Jupiter', 'Venus'], badHora: ['Saturn', 'Mars'],
    goodNak: ['mridu', 'kshipra', 'dhruva'], badNak: ['ugra', 'tikshna'],
    goodDays: [3, 4, 5], badDays: [2, 6],
  },
  {
    id: 'course_start', icon: '✏️', en: 'Starting a Course / Class', ta: 'புதிய படிப்பு / வகுப்பு தொடக்கம்',
    goodHora: ['Mercury', 'Jupiter', 'Venus', 'Moon'], badHora: ['Saturn', 'Mars'],
    goodNak: ['kshipra', 'mridu', 'chara'], badNak: ['ugra', 'tikshna'],
    goodDays: [0, 3, 4, 5], badDays: [2, 6],
  },
  {
    id: 'money_transfer', icon: '💸', en: 'Sending Money Abroad / Large Payment', ta: 'வெளிநாட்டுக்குப் பணம் அனுப்புதல் / பெரிய தொகை செலுத்துதல்',
    goodHora: ['Jupiter', 'Mercury', 'Venus', 'Moon'], badHora: ['Saturn', 'Mars'],
    goodNak: ['chara', 'kshipra', 'mridu'], badNak: ['ugra', 'tikshna'],
    goodDays: [1, 3, 4, 5], badDays: [2, 6],
  },
  {
    id: 'investment', icon: '📊', en: 'Investment / Shares / Gold Savings', ta: 'முதலீடு / பங்குகள் / தங்கச் சேமிப்பு',
    goodHora: ['Jupiter', 'Venus', 'Mercury'], badHora: ['Saturn', 'Mars'],
    goodNak: ['dhruva', 'kshipra', 'mridu'], badNak: ['ugra', 'tikshna'],
    goodDays: [3, 4, 5], badDays: [2, 6],
  },
  {
    id: 'bank_account', icon: '🏦', en: 'Opening a Bank Account', ta: 'வங்கிக் கணக்குத் தொடங்குதல்',
    goodHora: ['Jupiter', 'Mercury', 'Venus', 'Moon'], badHora: ['Saturn', 'Mars'],
    goodNak: ['dhruva', 'kshipra', 'chara', 'mridu'], badNak: ['ugra'],
    goodDays: [1, 3, 4, 5], badDays: [2, 6],
  },
  {
    id: 'loan_sign', icon: '🧾', en: 'Signing a Loan', ta: 'கடன் ஒப்பந்தம் கையெழுத்து',
    goodHora: ['Jupiter', 'Mercury', 'Venus'], badHora: ['Saturn', 'Mars'],
    goodNak: ['chara', 'kshipra', 'dhruva'], badNak: ['ugra', 'tikshna'],
    goodDays: [3, 4, 5], badDays: [2, 6],
  },
  {
    id: 'marriage_talk', icon: '💌', en: 'Marriage Proposal Talk (Varan Pechu)', ta: 'திருமணப் பேச்சு / வரன் பேசுதல்',
    goodHora: ['Venus', 'Jupiter', 'Moon', 'Mercury'], badHora: ['Saturn', 'Mars', 'Sun'],
    goodNak: ['mridu', 'dhruva', 'kshipra', 'chara'], badNak: ['ugra', 'tikshna'],
    goodDays: [1, 3, 4, 5], badDays: [2, 6], auspicious: true,
  },
  {
    id: 'engagement', icon: '💞', en: 'Engagement (Nichayam)', ta: 'நிச்சயம் செய்தல்',
    goodHora: ['Jupiter', 'Venus', 'Moon', 'Mercury'], badHora: ['Saturn', 'Mars', 'Sun'],
    goodNak: ['dhruva', 'mridu', 'kshipra'], badNak: ['ugra', 'tikshna', 'mishra'],
    goodDays: [1, 3, 4, 5], badDays: [2, 6], auspicious: true,
  },
  {
    id: 'seemantham', icon: '🤰', en: 'Seemantham / Valaikappu', ta: 'சீமந்தம் / வளைகாப்பு',
    goodHora: ['Jupiter', 'Venus', 'Moon', 'Mercury'], badHora: ['Saturn', 'Mars'],
    goodNak: ['mridu', 'dhruva', 'kshipra'], badNak: ['ugra', 'tikshna'],
    goodDays: [1, 3, 4, 5], badDays: [2, 6], auspicious: true,
  },
  {
    id: 'mudi_kaanikkai', icon: '✂️', en: "Child's First Haircut (Mudi Kaanikkai)", ta: 'முடி காணிக்கை / முதல் முடி இறக்குதல்',
    goodHora: ['Jupiter', 'Venus', 'Moon', 'Mercury'], badHora: ['Saturn', 'Mars'],
    goodNak: ['chara', 'kshipra', 'mridu'], badNak: ['ugra', 'tikshna'],
    goodDays: [1, 3, 4, 5], badDays: [2, 6], auspicious: true,
  },
  {
    id: 'passport_apply', icon: '🌐', en: 'Applying for a Passport', ta: 'கடவுச்சீட்டு (பாஸ்போர்ட்) விண்ணப்பம்',
    goodHora: ['Sun', 'Jupiter', 'Mercury', 'Moon'], badHora: ['Saturn'],
    goodNak: ['chara', 'kshipra', 'dhruva'], badNak: ['ugra'],
    goodDays: [0, 1, 3, 4], badDays: [6],
  },
  {
    id: 'police_complaint', icon: '🚓', en: 'Filing a Police Complaint', ta: 'காவல் நிலையப் புகார்',
    goodHora: ['Sun', 'Mars', 'Jupiter'], badHora: ['Saturn'],
    goodNak: ['tikshna', 'ugra', 'kshipra'], badNak: [],
    goodDays: [0, 2, 4], badDays: [6],
  },
  {
    id: 'medicine_start', icon: '💊', en: 'Hospital Discharge / Starting Medicine', ta: 'மருத்துவமனை டிஸ்சார்ஜ் / மருந்து தொடக்கம்',
    goodHora: ['Sun', 'Jupiter', 'Moon', 'Mercury'], badHora: ['Saturn'],
    goodNak: ['kshipra', 'mridu', 'chara'], badNak: ['ugra'],
    goodDays: [0, 1, 3, 4], badDays: [6],
  },
  {
    id: 'temple_visit', icon: '🛕', en: 'Temple Visit / Pilgrimage Start', ta: 'கோவில் செல்லுதல் / யாத்திரை தொடக்கம்',
    goodHora: ['Jupiter', 'Moon', 'Sun', 'Venus', 'Mercury'], badHora: ['Saturn'],
    goodNak: ['chara', 'kshipra', 'mridu', 'dhruva'], badNak: ['ugra'],
    goodDays: [0, 1, 3, 4, 5], badDays: [],
  },
  {
    id: 'vratham', icon: '🪔', en: 'Starting a Fast / Vratham', ta: 'விரதம் தொடங்குதல்',
    goodHora: ['Jupiter', 'Moon', 'Sun', 'Venus'], badHora: ['Saturn'],
    goodNak: ['dhruva', 'mridu', 'kshipra'], badNak: ['ugra'],
    goodDays: [1, 4, 5], badDays: [],
  },
  {
    id: 'general', icon: '🔮', en: 'Any Other Work (General)', ta: 'பொதுவான காரியம்',
    goodHora: ['Jupiter', 'Mercury', 'Venus', 'Moon'], badHora: ['Saturn'],
    goodNak: ['kshipra', 'mridu', 'dhruva', 'chara'], badNak: ['ugra'],
    goodDays: [1, 3, 4, 5], badDays: [],
  },
  // Life events (Subha Muhurtham) — used by the Muhurtham finder rather than instant Prasnam.
  {
    id: 'marriage', icon: '💐', en: 'Marriage (Thirumanam)', ta: 'திருமணம்', event: true, auspicious: true,
    goodHora: ['Jupiter', 'Venus', 'Moon', 'Mercury'], badHora: ['Saturn', 'Mars', 'Sun'],
    goodNak: ['dhruva', 'mridu', 'kshipra'], badNak: ['ugra', 'tikshna', 'mishra'],
    goodDays: [1, 3, 4, 5], badDays: [2, 6], goodLagna: [1, 2, 5, 6, 8, 11], avoidMonths: [3, 5, 8],
  },
  {
    id: 'graha_pravesam', icon: '🏠', en: 'House Warming (Graha Pravesam)', ta: 'கிரகப் பிரவேசம்', event: true, auspicious: true,
    goodHora: ['Jupiter', 'Venus', 'Moon', 'Mercury'], badHora: ['Saturn', 'Mars'],
    goodNak: ['dhruva', 'mridu'], badNak: ['ugra', 'tikshna'],
    goodDays: [1, 3, 4, 5], badDays: [2, 6, 0], goodLagna: [1, 4, 7, 10], avoidMonths: [3, 5, 8],
  },
  {
    id: 'naming', icon: '👶', en: 'Baby Naming (Peyar Sootuthal)', ta: 'பெயர் சூட்டுதல்', event: true, auspicious: true,
    goodHora: ['Jupiter', 'Venus', 'Moon', 'Mercury'], badHora: ['Saturn', 'Mars'],
    goodNak: ['dhruva', 'mridu', 'kshipra', 'chara'], badNak: ['ugra', 'tikshna'],
    goodDays: [1, 3, 4, 5], badDays: [2, 6],
  },
  {
    id: 'ear_piercing', icon: '✨', en: 'Ear Piercing (Kaadhu Kuthu)', ta: 'காது குத்துதல்', event: true, prasna: true, auspicious: true,
    goodHora: ['Jupiter', 'Venus', 'Moon', 'Mercury'], badHora: ['Saturn', 'Mars'],
    goodNak: ['kshipra', 'mridu', 'chara', 'dhruva'], badNak: ['ugra', 'tikshna'],
    goodDays: [1, 3, 4, 5], badDays: [2, 6],
  },
  {
    id: 'annaprasanam', icon: '🍚', en: 'First Rice Feeding (Annaprasanam)', ta: 'அன்னப்பிராசனம்', event: true, auspicious: true,
    goodHora: ['Jupiter', 'Venus', 'Moon', 'Mercury'], badHora: ['Saturn', 'Mars'],
    goodNak: ['kshipra', 'mridu', 'chara', 'dhruva'], badNak: ['ugra', 'tikshna'],
    goodDays: [1, 3, 4, 5], badDays: [2, 6],
  },
  {
    id: 'vidyarambam', icon: '📿', en: 'Start of Learning (Vidyarambam)', ta: 'வித்யாரம்பம் / அட்சராப்பியாசம்', event: true, auspicious: true,
    goodHora: ['Mercury', 'Jupiter', 'Venus'], badHora: ['Saturn', 'Mars'],
    goodNak: ['kshipra', 'mridu', 'chara'], badNak: ['ugra', 'tikshna'],
    goodDays: [0, 3, 4, 5], badDays: [2, 6],
  },
  {
    id: 'ruthu_bath', icon: '🌸', en: 'Ruthu — First Bath (Thanneer Oothuthal)', ta: 'ருது — தண்ணீர் ஊற்றுதல்', event: true, auspicious: true, lenient: true,
    goodHora: ['Venus', 'Moon', 'Jupiter', 'Mercury'], badHora: ['Saturn', 'Mars'],
    goodNak: ['mridu', 'dhruva', 'kshipra', 'chara'], badNak: ['ugra', 'tikshna'],
    goodDays: [1, 3, 4, 5], badDays: [2, 6],
  },
  {
    id: 'delivery', icon: '🤱', en: 'Planned Delivery (C-section) Muhurtham', ta: 'பிரசவ முகூர்த்தம் (திட்டமிட்ட அறுவை)', event: true, auspicious: true, lenient: true,
    goodHora: ['Jupiter', 'Venus', 'Moon', 'Mercury', 'Sun'], badHora: ['Saturn'],
    goodNak: ['dhruva', 'mridu', 'kshipra', 'chara'], badNak: ['ugra', 'tikshna'],
    goodDays: [0, 1, 3, 4, 5], badDays: [], goodLagna: [1, 3, 4, 8, 11],
  },
  {
    // Vahanam vanga (two-wheeler, auto, car, lorry): classical Tamil muhurtha rules — only the listed stars,
    // Mon/Wed/Thu/Fri (Sunday acceptable), no Rikta/Ashtami/Navami/Amavasai or Theipirai Prathamai, no Kuligai,
    // and a Venus (vahana karaka), Mercury, Moon or Jupiter Horai for the first drive.
    id: 'vehicle', icon: '🚗', en: 'Vehicle Purchase & First Drive (Vahanam)', ta: 'வாகனம் வாங்க', event: true, auspicious: true,
    goodHora: ['Venus', 'Mercury', 'Moon', 'Jupiter'], badHora: ['Saturn', 'Mars'],
    goodNak: [], badNak: [],
    goodStars: [0, 3, 4, 6, 7, 11, 12, 13, 14, 16, 20, 21, 22, 23, 25, 26],
    goodDays: [1, 3, 4, 5], badDays: [2, 6],
    avoidGuligai: true, avoidKrishnaPrathamai: true, avoidBadYoga: true, strictTara: true,
  },
  {
    id: 'manjal_neerattu', icon: '🌼', en: 'Manjal Neerattu Vizha', ta: 'மஞ்சள் நீராட்டு விழா', event: true, auspicious: true,
    goodHora: ['Venus', 'Moon', 'Jupiter', 'Mercury'], badHora: ['Saturn', 'Mars'],
    goodNak: ['mridu', 'dhruva', 'kshipra'], badNak: ['ugra', 'tikshna'],
    goodDays: [1, 3, 4, 5], badDays: [2, 6], goodLagna: [1, 2, 5, 6, 8, 11],
  },
];

// Practical-first categories (brief §10): hospital care, planned delivery, payments, court dates, contracts,
// urgent travel, visas and exams usually have real deadlines. For these the engine never returns AVOID:
// the verdict is capped at CAUTION ("proceed with your real deadline; an optional prayer"), and the
// result carries practicalFirst: true with a deadline-first note. Any other category gets the same
// treatment when the caller reports a real deadline (opts.deadline / opts.urgent).
export const URGENT_CATEGORIES = new Set(['surgery', 'delivery', 'cheque', 'court', 'contract', 'travel', 'visa', 'education',
  'medicine_start', 'police_complaint', 'money_transfer', 'loan_sign', 'interview']);
for (const c of CATEGORIES) if (URGENT_CATEGORIES.has(c.id)) { c.urgent = true; c.practicalFirst = true; }

export const DEADLINE_FIRST_NOTE = {
  surgery: { en: 'Follow your doctor\'s timing. Never delay hospital care for a Prasnam, Rahu Kalam or a muhurtham — a short prayer can go with you.', ta: 'மருத்துவர் சொல்லும் நேரத்தையே பின்பற்றுங்கள். பிரசன்னம், ராகு காலம், முகூர்த்தத்திற்காக மருத்துவச் சிகிச்சையைத் தள்ளிப்போட வேண்டாம் — ஒரு சிறு பிரார்த்தனை உடன் வரலாம்.' },
  delivery: { en: 'Your doctor\'s medical advice decides the date and time. Do not change it for astrology.', ta: 'தேதியையும் நேரத்தையும் மருத்துவரின் ஆலோசனையே தீர்மானிக்கும். ஜோதிடத்திற்காக மாற்ற வேண்டாம்.' },
  medicine_start: { en: 'Take medicines and leave hospital exactly as the doctor says. Do not wait for a good time — a short prayer can go with you.', ta: 'மருந்தையும் மருத்துவமனையிலிருந்து வீடு திரும்புவதையும் மருத்துவர் சொன்னபடியே செய்யுங்கள். நல்ல நேரத்திற்காகக் காத்திருக்க வேண்டாம் — ஒரு சிறு பிரார்த்தனை உடன் வரலாம்.' },
  police_complaint: { en: 'If you are in danger or a crime has happened, go to the police now — never wait for a good time. Call 112 in an emergency.', ta: 'ஆபத்து அல்லது குற்றம் நடந்திருந்தால் உடனே காவல் நிலையம் செல்லுங்கள் — நல்ல நேரத்திற்குக் காத்திருக்க வேண்டாம். அவசரத்திற்கு 112 அழையுங்கள்.' },
  court: { en: 'Keep every court date and filing deadline your lawyer gives you; an optional prayer can be added.', ta: 'வழக்கறிஞர் சொல்லும் ஒவ்வொரு நீதிமன்றத் தேதியையும் காலக்கெடுவையும் தவறாமல் பின்பற்றுங்கள்; விருப்பமெனில் பிரார்த்தனை சேர்க்கலாம்.' },
  default: { en: 'Your real deadline comes first. If this must be done now, go ahead — an optional prayer can go with you.', ta: 'உங்கள் உண்மையான காலக்கெடுவே முதன்மை. இப்போதே செய்ய வேண்டியதென்றால் செய்யுங்கள் — விருப்பமெனில் ஒரு பிரார்த்தனை உடன் வரலாம்.' },
};
export const PRACTICAL_FIRST_TEXT = { en: 'Proceed with your real deadline — an optional prayer before you go', ta: 'உங்கள் உண்மையான காலக்கெடுப்படி செய்யுங்கள் — விருப்பமெனில் முன்பு ஒரு பிரார்த்தனை' };
export const PRACTICAL_QUESTIONS = [
  { en: 'Is there a real deadline (doctor, court, bank, employer, embassy)?', ta: 'உண்மையான காலக்கெடு உள்ளதா (மருத்துவர், நீதிமன்றம், வங்கி, நிறுவனம், தூதரகம்)?' },
  { en: 'What would happen if this were delayed?', ta: 'இது தாமதமானால் என்ன ஆகும்?' },
];

export const BAD_YOGAS = new Set([0, 5, 8, 9, 12, 14, 16, 18, 26]);
const TARA = [
  { en: 'Janma', ta: 'ஜன்ம', score: -4 },
  { en: 'Sampat', ta: 'சம்பத்', score: 10 },
  { en: 'Vipat', ta: 'விபத்', score: -12 },
  { en: 'Kshema', ta: 'க்ஷேம', score: 10 },
  { en: 'Pratyak', ta: 'பிரத்யக்', score: -12 },
  { en: 'Sadhana', ta: 'சாதக', score: 10 },
  { en: 'Naidhana', ta: 'நைதன', score: -15 },
  { en: 'Mitra', ta: 'மித்ர', score: 8 },
  { en: 'Parama Mitra', ta: 'பரம மித்ர', score: 10 },
];
const BENEFICS = ['Jupiter', 'Venus', 'Mercury'];
const MALEFICS = ['Saturn', 'Mars', 'Rahu', 'Ketu', 'Sun'];

export const getCategory = (id) => CATEGORIES.find((c) => c.id === id);

/** Pure scoring of a Panchang snapshot for a category and optional birth chart. */
export function scoreSnapshot(snap, category, birth, opts = {}) {
  const factors = [];
  const add = (key, label, labelTa, points, detail) => factors.push({ key, label, labelTa, points, detail });
  const cat = typeof category === 'string' ? getCategory(category) : category;
  if (!cat) throw new Error('Unknown category');

  // 1. Horai
  const hl = snap.currentHora.lord;
  if (cat.goodHora.includes(hl)) add('hora', `${hl} Horai is favourable`, `${snap.currentHora.lordTa} ஓரை — சாதகம்`, 15, hl);
  else if (cat.badHora.includes(hl)) add('hora', `${hl} Horai is unfavourable`, `${snap.currentHora.lordTa} ஓரை — பாதகம்`, -15, hl);
  else add('hora', `${hl} Horai is neutral`, `${snap.currentHora.lordTa} ஓரை — சமம்`, 0, hl);

  // 2. Inauspicious periods
  if (snap.inRahuKalam) add('rahu', 'Rahu Kalam is running', 'ராகு காலம் நடக்கிறது', -25);
  if (snap.inYamagandam) add('yama', 'Yamagandam is running', 'எமகண்டம் நடக்கிறது', -20);
  if (snap.inGuligai) add('guligai', 'Guligai Kalam is running', 'குளிகை காலம் நடக்கிறது', -8);

  // 3. Nakshatra nature
  const nature = NAKSHATRAS[snap.nakshatra.index].nature;
  if (cat.goodStars) {
    if (cat.goodStars.includes(snap.nakshatra.index)) add('nak', `${snap.nakshatra.name} star suits this work`, `${snap.nakshatra.ta} நட்சத்திரம் ஏற்றது`, 8, nature);
    else add('nak', `${snap.nakshatra.name} star does not suit this work`, `${snap.nakshatra.ta} நட்சத்திரம் ஏற்றதல்ல`, -8, nature);
  } else if (cat.goodNak.includes(nature)) add('nak', `${snap.nakshatra.name} star suits this work`, `${snap.nakshatra.ta} நட்சத்திரம் ஏற்றது`, 8, nature);
  else if (cat.badNak.includes(nature)) add('nak', `${snap.nakshatra.name} star does not suit this work`, `${snap.nakshatra.ta} நட்சத்திரம் ஏற்றதல்ல`, -8, nature);

  // 4. Tithi
  const tn = snap.tithi.index % 15;
  if (snap.tithi.index === 29) add('tithi', 'Amavasai (new moon)', 'அமாவாசை', cat.auspicious ? -12 : -6);
  else if (tn === 3 || tn === 8 || tn === 13) add('tithi', `${snap.tithi.name} is a Rikta tithi`, `${snap.tithi.ta} — ரிக்த திதி`, -6);
  else if (tn === 7) add('tithi', 'Ashtami — avoid new starts', 'அஷ்டமி — புதிய தொடக்கம் தவிர்க்கவும்', -6);
  else if (snap.tithi.index === 14) add('tithi', 'Pournami (full moon) — strong Moon', 'பௌர்ணமி — சந்திர பலம்', 4);
  else add('tithi', `${snap.tithi.name} tithi is supportive`, `${snap.tithi.ta} திதி — நன்று`, 3);

  // 5. Waxing / waning moon
  if (snap.tithi.index < 15) add('paksha', 'Waxing Moon (Valarpirai)', 'வளர்பிறை', 4);
  else add('paksha', 'Waning Moon (Theipirai)', 'தேய்பிறை', -3);

  // 6. Yoga
  if (BAD_YOGAS.has(snap.yoga.index)) add('yoga', `${snap.yoga.name} yoga is unfavourable`, `${snap.yoga.ta} யோகம் — பாதகம்`, -5);

  // 7. Weekday
  const wd = snap.weekday.index;
  if (cat.goodDays.includes(wd)) add('day', `${snap.weekday.en} suits this work`, `${snap.weekday.ta} — ஏற்ற கிழமை`, 5);
  else if (cat.badDays.includes(wd)) add('day', `${snap.weekday.en} is not ideal`, `${snap.weekday.ta} — ஏற்ற கிழமை அல்ல`, -6);

  // 8. Prasna Lagna (ascendant at the moment of asking)
  const lagna = snap.planets.Lagna;
  if (lagna) {
    const inLagna = Object.entries(snap.planets).filter(([k, p]) => k !== 'Lagna' && p.rasi === lagna.rasi).map(([k]) => k);
    const ben = inLagna.filter((k) => BENEFICS.includes(k) || (k === 'Moon' && snap.tithi.index < 15));
    const mal = inLagna.filter((k) => MALEFICS.includes(k));
    if (ben.length) add('lagna_benefic', `Benefic ${ben.join(', ')} in Prasna Lagna`, 'பிரசன்ன லக்னத்தில் சுபர்', 6 * ben.length);
    if (mal.length) add('lagna_malefic', `Malefic ${mal.join(', ')} in Prasna Lagna`, 'பிரசன்ன லக்னத்தில் பாபர்', -5 * mal.length);
    const lord = RASIS[lagna.rasi].lord;
    const house = ((snap.planets[lord].rasi - lagna.rasi + 12) % 12) + 1;
    if ([6, 8, 12].includes(house)) add('lagna_lord', `Lagna lord ${lord} in ${house}th house (dusthana)`, `லக்னாதிபதி ${house}-ல் — பலவீனம்`, -6);
    else if ([1, 4, 5, 7, 9, 10].includes(house)) add('lagna_lord', `Lagna lord ${lord} strong in ${house}th house`, `லக்னாதிபதி ${house}-ல் — பலம்`, 5);
  }

  if (lagna && cat.goodLagna) {
    if (cat.goodLagna.includes(lagna.rasi)) add('lagna_sign', `${lagna.rasiName} lagna suits this event`, `${lagna.rasiTa} லக்னம் ஏற்றது`, 6);
    else add('lagna_sign', `${lagna.rasiName} lagna is not preferred`, `${lagna.rasiTa} லக்னம் உகந்ததல்ல`, -4);
  }

  // 9. Personal factors from the birth chart
  if (birth && birth.janmaNakshatra != null) {
    const count = ((snap.nakshatra.index - birth.janmaNakshatra + 27) % 27) % 9;
    const tara = TARA[count];
    add('tara', `${tara.en} Tara for your birth star`, `${tara.ta} தாரை`, tara.score);
  }
  if (birth && birth.janmaRasi != null) {
    const pos = ((snap.moonRasi.index - birth.janmaRasi + 12) % 12) + 1;
    if (pos === 8) add('chandrashtama', 'Chandrashtamam — Moon in 8th from your rasi', 'சந்திராஷ்டமம்', -22);
    else if ([1, 3, 6, 7, 10, 11].includes(pos)) add('chandra', `Chandra Bala good (Moon ${pos} from your rasi)`, 'சந்திர பலம் உண்டு', 8);
    else add('chandra', `Chandra Bala weak (Moon ${pos} from your rasi)`, 'சந்திர பலம் குறைவு', -4);
  }

  const raw = 50 + factors.reduce((s, f) => s + f.points, 0);
  const score = Math.max(0, Math.min(100, Math.round(raw)));
  const rawVerdict = score >= 62 ? 'DO' : score >= 45 ? 'CAUTION' : 'AVOID';
  const practicalFirst = !!(cat.practicalFirst || opts.deadline || opts.urgent);
  if (!practicalFirst) return { score, verdict: rawVerdict, factors, practicalFirst: false };
  // Engine rule: never defer necessary action — cap at CAUTION.
  const verdict = rawVerdict === 'AVOID' ? 'CAUTION' : rawVerdict;
  return {
    score, verdict, rawVerdict, factors, practicalFirst: true, capped: rawVerdict !== verdict,
    deadlineNote: DEADLINE_FIRST_NOTE[cat.id] || DEADLINE_FIRST_NOTE.default,
    practicalQuestions: PRACTICAL_QUESTIONS,
  };
}

/** Verdict text for a scoring result (practical-first results get the deadline-first wording when cautious). */
export function verdictTextFor(result) {
  if (result.practicalFirst && result.verdict === 'CAUTION') return PRACTICAL_FIRST_TEXT;
  return VERDICT_TEXT[result.verdict];
}

export const VERDICT_TEXT = {
  DO: { en: 'Go ahead — favourable', ta: 'செய்யலாம் — நல்ல நேரம்' },
  CAUTION: { en: 'Proceed with caution', ta: 'கவனத்துடன் செய்யவும்' },
  AVOID: { en: 'A better time is coming — wait a little', ta: 'சிறந்த நேரம் வருகிறது — சற்று காத்திருங்கள்' },
};

/** Scan ahead to find the best windows for this category in the next `hours`. */
export function findBestTimes(from, hours, category, loc, birth, stepMin = 15, opts = {}) {
  const results = [];
  for (let m = stepMin; m <= hours * 60; m += stepMin) {
    const t = new Date(from.getTime() + m * 60000);
    const snap = panchang(t, loc.lat, loc.lon, loc.tz, { withEnds: false });
    const r = scoreSnapshot(snap, category, birth, opts);
    results.push({ at: t, score: r.score, verdict: r.verdict, hora: snap.currentHora.lord });
  }
  // Merge consecutive steps into windows and rank by peak score.
  const windows = [];
  let cur = null;
  for (const r of results) {
    if (r.verdict === 'DO') {
      if (cur && r.at - cur.end <= stepMin * 60000) { cur.end = r.at; cur.best = Math.max(cur.best, r.score); }
      else { cur = { start: r.at, end: r.at, best: r.score, hora: r.hora }; windows.push(cur); }
    } else cur = null;
  }
  for (const w of windows) w.end = new Date(w.end.getTime() + stepMin * 60000);
  windows.sort((a, b) => b.best - a.best || a.start - b.start);
  return windows.slice(0, 3);
}

/** Full Prasna evaluation used by the API and the Live screen. */
export function evaluatePrasna({ at = new Date(), category, loc, birth, deadline = false, urgent = false }) {
  const snap = panchang(at, loc.lat, loc.lon, loc.tz);
  const opts = { deadline, urgent };
  const result = scoreSnapshot(snap, category, birth, opts);
  const bestTimes = findBestTimes(at, 24, category, loc, birth, 15, opts);
  return {
    snapshot: snap, ...result, verdictText: verdictTextFor(result), bestTimes,
    // Better times are optional suggestions; for practical-first questions they never replace the real deadline.
    bestTimesOptional: true,
  };
}

// ================================================================ Prasnam screen helpers (pure, tested)
/** Category groups shown as headed sections on the Prasnam screen, in display order. */
export const PRASNA_GROUPS = [
  { id: 'health', icon: '🏥', en: 'Health', ta: 'உடல்நலம்', ids: ['surgery', 'medicine_start'] },
  { id: 'work', icon: '💼', en: 'Work & Business', ta: 'வேலை & தொழில்', ids: ['interview', 'job_join', 'office', 'salary_talk', 'job_change', 'meeting', 'client', 'business', 'launch', 'partnership', 'tech_partner'] },
  { id: 'money', icon: '💰', en: 'Money & Banking', ta: 'பணம் & வங்கி', ids: ['cheque', 'money_transfer', 'loan_sign', 'loan', 'lend_money', 'investment', 'bank_account'] },
  { id: 'home', icon: '🏠', en: 'House & Land', ta: 'வீடு & நிலம்', ids: ['property', 'land_buy', 'property_sell', 'rent_agreement', 'house_move', 'kitchen_start', 'bhoomi_pooja', 'borewell'] },
  { id: 'buy', icon: '🛍️', en: 'Buying', ta: 'பொருள் வாங்குதல்', ids: ['jewellery', 'clothes', 'gold_vehicle', 'electronics', 'pet_cattle'] },
  { id: 'family', icon: '💍', en: 'Family & Celebrations', ta: 'குடும்பம் & சுபகாரியம்', ids: ['marriage_talk', 'bride_groom', 'engagement', 'seemantham', 'mudi_kaanikkai', 'ear_piercing'] },
  { id: 'travel', icon: '✈️', en: 'Travel & Abroad', ta: 'பயணம் & வெளிநாடு', ids: ['travel', 'visa', 'passport_apply'] },
  { id: 'study', icon: '📚', en: 'Studies & Competition', ta: 'கல்வி & போட்டி', ids: ['education', 'course_start', 'competition'] },
  { id: 'legal', icon: '⚖️', en: 'Legal', ta: 'சட்டம்', ids: ['court', 'contract', 'police_complaint'] },
  { id: 'spiritual', icon: '🙏', en: 'Spiritual', ta: 'ஆன்மீகம்', ids: ['temple_visit', 'vratham'] },
  { id: 'other', icon: '🔮', en: 'Anything else', ta: 'மற்றவை', ids: ['general'] },
];
for (const g of PRASNA_GROUPS) for (const id of g.ids) { const c = getCategory(id); if (c) c.group = g.id; }
/** Every category offered on the instant Prasnam screen (life-event muhurthams stay in the Muhurtham finder). */
export const PRASNA_CATEGORIES = CATEGORIES.filter((c) => !c.event || c.prasna);

// ---- free-text intent: Tamil script, Tanglish and English → a Prasnam category id. First match wins, so the
// more specific phrases come first (gold savings before gold, loan signing before loan, interview before travel).
// W: Latin words matched from a word start (Tanglish stems take suffixes — kovil-ukku, vandi-yil); words of 1–3
// letters must also end there (pay ≠ payanam, car ≠ career, fir ≠ first). TA: Tamil word start (no \b for Tamil script).
const W = (s) => `(?:^|[^a-z])(?:${s.split('|').map((w) => (/^[a-z]{1,3}$/.test(w) ? `${w}(?![a-z])` : w)).join('|')})`;
const TA = '(?<![\u0B80-\u0BFF])';
const INTENTS = [
  ['medicine_start', `discharge|${W('medicine|marunth|maruntu|tablet|dialysis|vaccin|treatment start')}|மருந்து|டிஸ்சார்ஜ்|வீடு திரும்`],
  ['surgery', `${W('operation|surgery|aruvai|admit|hospital|aaspathiri|maruthuvamanai|scan|blood test|medical test|check-?up|health check')}|அறுவை|ஆபரேஷன்|மருத்துவமனை|அட்மிட்`],
  ['police_complaint', `${W('police|fir|complaint|pugar|pukar')}|போலீஸ்|காவல்|புகார`],
  ['court', `${W('court|case|vazhakku|vazakku|lawyer|vakeel|hearing')}|வழக்கு|நீதிமன்ற|கோர்ட்|கோர்ட`],
  ['investment', `${W('invest|share|stock|mutual|sip|mudhaleedu|mudaleedu|chit|seettu|gold sav|gold scheme|gold bond|thanga semipp|thanga sempp|fd')}|முதலீ|பங்கு|சீட்டு|தங்கச் சேமிப்பு|தங்க சேமிப்பு`],
  ['loan_sign', `${W('loan sign|sign(?:ing)? (?:the |a )?loan|home loan|bank loan|loan apply|apply loan|loan agreement|loan document|emi')}|லோன்|கடன் ஒப்பந்த|கடன் கையெழுத்து`],
  ['lend_money', `${W('kadan (?:kodu|kudu|koduk|kuduk|vaang|vang)|lend|borrow|kai ?maathu|kaimathu')}|கடன் கொடு|கடன் வாங்|கடனைக் கொடு|கடனாகக் கொடு|கடனாக கொடு|கடன் தர|கைமாத்து|கைமாற்று`],
  ['loan', `${W('loan|kadan|debt')}|${TA}கடன`],
  ['cheque', `${W('cheque|check sign|checku')}|காசோலை|${TA}செக்(?!கு)`],
  ['money_transfer', `${W('send(?:ing)? money|money (?:abroad|transfer)|bank transfer|fund transfer|transfer (?:the )?money|remit|panam anupp|panam anup|payment|pay|neft|rtgs|wire|advance kudu|advance kodu')}|பணம் அனுப்|பணம் செலுத்|பணம் கட்ட|பரிமாற்ற`],
  ['bank_account', `${W('bank account|account open|open(?:ing)? (?:an? )?account|kanakku thodang|account thodang')}|வங்கிக் கணக்கு|வங்கி கணக்கு|அக்கவுண்ட்`],
  ['property_sell', `${W('sell|vikka|vikkal|virka|vitka|sale(?![a-z])|vitru')}|விற்`],
  ['rent_agreement', `${W('rent|lease|vaadagai|vadagai|vaadakai|vadakai|kuthagai|tenant')}|வாடகை|குத்தகை`],
  ['contract', `${W('(?:sale|flat|house|land|property|builder) agreement|agreement sign|sign (?:the |an? )?agreement')}|ஒப்பந்தம் கையெழுத்து|ஒப்பந்தத்தில் கையெழுத்து`],
  ['house_move', `${W('veedu maar|veedu mar|veedu maat|vidu maar|veedu shift|house shift|shifting|shift(?:ing)? house|move house|moving house|relocat|kudi ?pog|kudi ?pug|paal kaai|pal kaachu|graha ?pravesam|grahapravesam|gruhapravesam')}|வீடு மாற|வீடு மாற்ற|குடிபோ|குடி போ|குடிபுக|பால் காய்ச்ச|கிரகப் பிரவேச|கிரகப்பிரவேச`],
  ['bhoomi_pooja', `${W('bhoomi|boomi|foundation|construction|kattadam|kattumanam|veedu katt|house construct|build(?:ing)? (?:a )?house')}|வீடு கட்ட|கட்டுமான|பூமி பூஜை|அஸ்திவார`],
  ['borewell', `${W('borewell|bore ?well|bore poda|kinaru|kinar|well dig|dig(?:ging)? (?:a )?well')}|கிணறு|கிணற்|ஆழ்துளை|போர்வெல்`],
  ['kitchen_start', `${W('kitchen|stove|aduppu|adupu|gas connection|samaiyal ?arai')}|அடுப்பு|சமையலறை`],
  ['land_buy', `${W('land|plot|nilam|manai|acre|site vaang|site vang|ground vaang')}|நிலம்|${TA}மனை(?!வி)|ஏக்கர்`],
  ['property', `${W('property|sothu|house|flat|apartment|villa|veedu vaang|veedu vang|sontha veedu|own house')}|வீடு வாங்|சொந்த வீடு|சொத்து|அடுக்குமாடி|ஃப்ளாட்`],
  ['interview', `${W('interview|nerkaanal|nerkanal|nerkaanal')}|நேர்காணல|நேர்முக|இன்டர்வியூ`],
  ['job_join', `${W('join(?:ing)? (?:the |a |my )?(?:new )?(?:job|company|office|duty)|joining|join duty|offer letter|vela ?(?:i)?(?:k|kk)?u join|velaikku join|job join|job la join|office join|vela(?:i)?(?:la|yil)? sera|vela(?:i)?(?:la|yil)? sera|velai(?:yil)? ser')}|வேலையில் சேர|பணியில் சேர|வேலைக்குச் சேர`],
  ['salary_talk', `${W('salary|hike|promotion|appraisal|sambalam|increment|pay rise')}|சம்பள|பதவி உயர்வு|ஊதிய`],
  ['job_change', `${W('resign|job change|career change|change (?:my )?(?:job|career)|job transfer|velai maa?r|vela maa?r|velai vidu|quit')}|ராஜினாமா|வேலை மாற|வேலையை விட`],
  ['passport_apply', `${W('passport')}|பாஸ்போர்ட்|கடவுச்சீட்டு`],
  ['visa', `${W('visa|abroad|foreign|velinadu|veli ?naadu|onsite|immigration|green card|pr')}|வெளிநாடு|விசா|வெளிநாட்டு`],
  ['course_start', `${W('course|class|coaching|tuition|tution|admission|college ser|school ser|training|enroll')}|வகுப்பு|பயிற்சி|சேர்க்கை|கோர்ஸ்|பள்ளியில் சேர|கல்லூரியில் சேர|school admission|${W('school ser|school la ser|college la ser')}`],
  ['education', `${W('exam|pareetchai|paritchai|parichai|test|study|studies|padippu|padikka|result|revision')}|தேர்வு|பரீட்சை|படிப்பு|படிக்க|பரிட்சை`],
  ['competition', `${W('competition|match|election|sports|contest|potti|tournament|race')}|போட்டி|தேர்தல்`],
  ['engagement', `${W('engage|nichayam|nichayathartham|nichaya ?thaartham|nichayadhartham')}|நிச்சய`],
  ['seemantham', `${W('seemant|simant|valai ?kaapu|valai ?kappu|baby shower')}|சீமந்த|வளைகாப்பு`],
  ['bride_groom', `${W('pen ?paar|ponnu ?paar|ponnu ?paak|ponnu ?pak|pen ?pak|maapillai ?paar|mapillai ?paar|maappillai ?paar|bride see|see (?:the )?bride|groom see|see (?:the )?groom|girl see')}|பெண் பார்|பொண்ணு பார்|மாப்பிள்ளை பார்`],
  ['marriage_talk', `${W('varan|marriage talk|marriage proposal|kalyana proposal|kalyana ?pech|kalyanam pesa|kalyanam pech|alliance|jathagam kodu|jadhagam kodu|horoscope exchange')}|திருமணப் பேச்|திருமண பேச்|வரன்|கல்யாணப் பேச்|ஜாதகம் கொடு`],
  ['mudi_kaanikkai', `${W('mudi ?kaan|mudi ?kan|mottai|haircut|hair cut|tonsure|mudi irakk|mudi edu')}|முடி காணிக்கை|மொட்டை|முடி இறக்|முடி எடு`],
  ['ear_piercing', `${W('kaadhu ?kuth|kathu ?kuth|kaathu ?kuth|kadhu ?kuth|ear ?pierc')}|காது குத்`],
  ['jewellery', `${W('nagai|nakai|naghai|nagal|jewel|thangam|thanga nagai|thanga kaas|thangath|gold|chain|kammal|valayal|mothiram|ring|bangle|necklace|aaram|silver|diamond|vairam')}|நகை(?!ச்சுவை)|தங்கம்|தங்கத்|தங்கக்|மோதிர|கம்மல்|வளையல்|சங்கிலி|வெள்ளி நகை|வெள்ளிப் பொருள்|வைர`],
  ['clothes', `${W('dress|clothes|cloth|saree|sari|silk|pattu|pudavai|veshti|vesti|shirt|textile|thuni|jacket')}|துணி|புடவை|${TA}பட்டுப்|${TA}பட்டு(?![\u0B80-\u0BFF])|புத்தாடை|${TA}ஆடை|வேட்டி|சேலை`],
  ['gold_vehicle', `${W('vandi|vaahan|vahan|vaagan|vehicle|car|bike|scooter|scooty|auto|lorry|truck|tractor|two ?wheeler')}|வண்டி|வாகன|${TA}கார்(?![\u0B80-\u0BFF])|பைக்|ஸ்கூட்டர்|லாரி`],
  ['electronics', `${W('mobile|phone|laptop|tv|television|fridge|computer|electronic|gadget|iphone|washing machine|ac|cell ?phone')}|கைப்பேசி|மொபைல்|${TA}போன்(?![\u0B80-\u0BFF])|டிவி|லேப்டாப்|கணினி|ஃபிரிட்ஜ்`],
  ['pet_cattle', `${W('pets?|dogs?|puppy|cats?|cows?|cattle|maadu|naai|naay|goat|aadu|kozhi|hen|calf|kannukutti')}|பசு|${TA}மாடு|நாய்|${TA}ஆடு(?![\u0B80-\u0BFF])|கால்நடை|கோழி|கன்று`],
  ['temple_visit', `${W('temple|kovil|koil|kovilukku|pilgrim|yaathirai|yathirai|yatra|tirupati|tirupathi|sabarimala|palani|darshan|dharisanam|kumbabishekam')}|கோவில்|கோயில்|யாத்திரை|தரிசன|திருப்பதி|சபரிமலை|பழனி`],
  ['vratham', `${W('vrat|viradham|viratham|vratham|fast|fasting|upavas|maalai pod|malai pod|mala pod')}|விரத|உபவாச|மாலை போட`],
  ['launch', `${W('launch|website|release|opening|thirappu|inauguration|app launch')}|திறப்பு|வெளியீடு|திறப்பு விழா`],
  ['partnership', `${W('partner|partnership|koottu|kootu')}|கூட்டு`],
  ['client', `${W('client|customer|deal|order')}|வாடிக்கையாளர்`],
  ['meeting', `${W('meeting|meet|santhip|sandhip')}|சந்திப்|கூட்டம்|மீட்டிங்`],
  ['business', `${W('business|shop|kadai(?!si)|tholil|thozhil|vyabaaram|viyabaram|startup|start-up')}|தொழில்|${TA}கடை(?!சி)|வியாபார|வணிக`],
  ['contract', `${W('contract|agreement|oppantham|oppandham|sign|deed|registration|pathiram|document')}|ஒப்பந்த|பத்திர|கையெழுத்து|பதிவு`],
  ['office', `${W('office|velai|vela|job|work')}|வேலை|அலுவலக|${TA}பணி(?!வு)|${W('career')}`],
  ['travel', `${W('travel|trip|journey|payanam|tour|flight|train|bus|ooruku|oorukku|kilamb|vacation|holiday|pogalam|poga ?laama|pogalaama|go to|going to')}|பயண|ஊருக்கு|கிளம்ப|சுற்றுலா|போகலாமா|செல்லலாமா`],
].map(([id, re]) => [id, new RegExp(re, 'i')]);

/**
 * The Prasnam category a free-text question is about, or null when nothing specific is recognised.
 * Works on Tamil script, Tanglish ("Nagai vangalama", "veedu maaralama") and English.
 */
export function detectPrasnaCategory(text) {
  const q = ` ${String(text || '').normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim()} `;
  if (!q.trim()) return null;
  for (const [id, re] of INTENTS) if (re.test(q)) return id;
  return null;
}

// ---- the person the Prasnam is asked for
/** Default "Asking for": the user themself (relation 'self'), else the first adult, else the first person. */
export function defaultAsker(family = [], profileOf = () => ({ adult: true })) {
  const people = (family || []).filter(Boolean);
  return people.find((m) => m.relation === 'self') || people.find((m) => m.relation !== 'organization' && profileOf(m)?.adult) || people[0] || null;
}

/**
 * One-line banner for a minor (or unknown age) — "மகன் (6 வயது) — இந்த வயதுக்கு ஏற்றவை மட்டும் காட்டப்படுகின்றன · மாற்ற தட்டவும்".
 * who: the relation label (or name) as { en, ta }; adults get null.
 */
export function askerBanner(profile, who, lang = 'ta') {
  if (!profile || profile.adult || profile.organization) return null;
  const w = who || { en: 'This person', ta: 'இவர்' };
  if (profile.unknown || profile.age == null) {
    return lang === 'ta' ? `${w.ta} (பிறந்த தேதி இல்லை) — பொதுவானவை மட்டும் காட்டப்படுகின்றன · மாற்ற தட்டவும்`
      : `${w.en} (no birth date) — only general topics are shown · tap to change`;
  }
  return lang === 'ta' ? `${w.ta} (${profile.age} வயது) — இந்த வயதுக்கு ஏற்றவை மட்டும் காட்டப்படுகின்றன · மாற்ற தட்டவும்`
    : `${w.en} (age ${profile.age}) — only topics that suit this age are shown · tap to change`;
}

// ---- the richer answer: top reasons, what to do now, a free parigaram
const T2 = (en, ta) => ({ en, ta });
const STEP = {
  surgery: T2('Carry your reports, ID and insurance papers; follow the doctor\'s instructions on food and medicines.', 'அறிக்கைகள், அடையாள அட்டை, காப்பீட்டு ஆவணங்களை எடுத்துச் செல்லுங்கள்; உணவு, மருந்து பற்றி மருத்துவர் சொன்னதைப் பின்பற்றுங்கள்.'),
  medicine_start: T2('Note the dose times on paper or phone, keep the discharge summary safe and book the review visit.', 'மருந்து நேரங்களைக் குறித்து வையுங்கள், டிஸ்சார்ஜ் சுருக்கத்தைப் பத்திரமாக வையுங்கள், அடுத்த பரிசோதனை நாளைப் பதிவு செய்யுங்கள்.'),
  jewellery: T2('Check today\'s gold rate, insist on the hallmark (HUID) and a proper bill; compare making charges in two shops.', 'இன்றைய தங்க விலையைப் பாருங்கள், ஹால்மார்க் (HUID) முத்திரையும் முறையான ரசீதும் கேளுங்கள்; இரண்டு கடைகளில் செய்கூலியை ஒப்பிடுங்கள்.'),
  clothes: T2('Fix the budget first, check the silk mark / fabric label and keep the bill for exchange.', 'முதலில் செலவுத் தொகையை முடிவு செய்யுங்கள், பட்டு முத்திரை / துணி விவரத்தைப் பாருங்கள், மாற்றுவதற்கு ரசீதை வையுங்கள்.'),
  electronics: T2('Compare prices, check the warranty card and bill, and back up your old phone before switching.', 'விலைகளை ஒப்பிடுங்கள், உத்தரவாத அட்டையும் ரசீதும் சரிபாருங்கள்; பழைய கைப்பேசியின் தரவைச் சேமித்துக்கொள்ளுங்கள்.'),
  gold_vehicle: T2('Check the papers (RC, insurance) and take a test drive; pay through a traceable method.', 'ஆவணங்களை (RC, காப்பீடு) சரிபாருங்கள், ஓட்டிப் பாருங்கள்; பணத்தைக் கணக்கில் தெரியும் முறையில் செலுத்துங்கள்.'),
  pet_cattle: T2('See the animal\'s health and vaccination record and arrange food and shelter first.', 'விலங்கின் உடல்நலம், தடுப்பூசி விவரங்களைப் பாருங்கள்; உணவு, இருப்பிடத்தை முதலில் ஏற்பாடு செய்யுங்கள்.'),
  rent_agreement: T2('Read every clause, note the advance, rent increase and notice period, and keep a signed copy.', 'ஒவ்வொரு விதியையும் படியுங்கள்; முன்பணம், வாடகை உயர்வு, காலி செய்யும் அறிவிப்புக் காலத்தைக் குறித்து, கையெழுத்திட்ட நகலை வையுங்கள்.'),
  house_move: T2('Carry a lamp, turmeric and milk into the new house first; move the pooja items and kitchen items first.', 'புதிய வீட்டுக்குள் முதலில் தீபம், மஞ்சள், பால் கொண்டு செல்லுங்கள்; பூஜைப் பொருட்களையும் சமையல் பொருட்களையும் முதலில் மாற்றுங்கள்.'),
  property: T2('Verify the title, encumbrance certificate and approvals with a lawyer before paying an advance.', 'முன்பணம் தரும் முன் பட்டா, வில்லங்கச் சான்று, அனுமதிகளை வழக்கறிஞரிடம் சரிபாருங்கள்.'),
  land_buy: T2('Check patta, chitta, the encumbrance certificate and the boundary on site before paying.', 'பணம் தரும் முன் பட்டா, சிட்டா, வில்லங்கச் சான்று, நிலத்தின் எல்லையை நேரில் சரிபாருங்கள்.'),
  property_sell: T2('Get the market value from two sources and receive payment only through the bank.', 'இரண்டு இடங்களில் சந்தை மதிப்பைக் கேளுங்கள்; பணத்தை வங்கி வழியாக மட்டுமே பெறுங்கள்.'),
  interview: T2('Reach 15 minutes early, carry printed copies of your CV and certificates, and prepare three examples of your work.', '15 நிமிடம் முன்பே செல்லுங்கள்; சுயவிவரம், சான்றிதழ் நகல்களை எடுத்துச் செல்லுங்கள்; உங்கள் வேலைக்கு மூன்று உதாரணங்களைத் தயார் செய்யுங்கள்.'),
  job_join: T2('Keep the offer letter, ID and certificates ready; greet your new team and note your first-week goals.', 'நியமனக் கடிதம், அடையாள அட்டை, சான்றிதழ்களைத் தயாராக வையுங்கள்; புதிய குழுவினரை வணங்கி, முதல் வார இலக்குகளைக் குறித்துக்கொள்ளுங்கள்.'),
  salary_talk: T2('Write down your achievements and the market salary for your role before you talk.', 'பேசும் முன் உங்கள் சாதனைகளையும் உங்கள் பதவிக்கான சந்தைச் சம்பளத்தையும் எழுதி வையுங்கள்.'),
  money_transfer: T2('Double-check the account number and name, use only official channels and keep the receipt.', 'கணக்கு எண்ணையும் பெயரையும் இருமுறை சரிபாருங்கள்; அதிகாரப்பூர்வ வழியில் மட்டும் அனுப்பி, ரசீதை வையுங்கள்.'),
  cheque: T2('Check the amount in words and figures, the date and the payee name before you sign.', 'கையெழுத்திடும் முன் தொகை (எழுத்திலும் எண்ணிலும்), தேதி, பெறுநர் பெயரைச் சரிபாருங்கள்.'),
  loan_sign: T2('Read the interest rate, EMI, prepayment and penalty terms; never sign blank pages.', 'வட்டி விகிதம், EMI, முன்கூட்டிச் செலுத்தல், அபராத விதிகளைப் படியுங்கள்; வெற்றுத் தாளில் கையெழுத்திட வேண்டாம்.'),
  loan: T2('Compare two lenders and make sure the EMI is within a third of your income.', 'இரண்டு நிறுவனங்களை ஒப்பிடுங்கள்; EMI உங்கள் வருமானத்தின் மூன்றில் ஒரு பங்குக்குள் இருக்கட்டும்.'),
  lend_money: T2('Lend only what you can afford to wait for, and write down the amount, date and return date.', 'திரும்ப வர காத்திருக்க முடிந்த அளவு மட்டுமே கொடுங்கள்; தொகை, தேதி, திருப்பித் தரும் நாளை எழுதி வையுங்கள்.'),
  investment: T2('Invest in steps, not all at once; check the fund or scheme is registered and keep an emergency reserve.', 'ஒரே முறையாக இல்லாமல் படிப்படியாக முதலீடு செய்யுங்கள்; திட்டம் பதிவு பெற்றதா என்று பாருங்கள்; அவசரத் தொகையைத் தனியே வையுங்கள்.'),
  bank_account: T2('Carry ID, address proof and a photo; set up a nominee on the day you open it.', 'அடையாள அட்டை, முகவரிச் சான்று, புகைப்படம் எடுத்துச் செல்லுங்கள்; திறக்கும் அன்றே வாரிசுதாரரைப் பதிவு செய்யுங்கள்.'),
  marriage_talk: T2('Talk openly about education, work, family expectations and health; let both sides take time.', 'கல்வி, வேலை, குடும்ப எதிர்பார்ப்பு, உடல்நலம் பற்றி வெளிப்படையாகப் பேசுங்கள்; இரு பக்கத்தினருக்கும் யோசிக்க நேரம் கொடுங்கள்.'),
  bride_groom: T2('Keep the visit simple and respectful; let the two people talk to each other freely.', 'சந்திப்பை எளிமையாகவும் மரியாதையாகவும் வையுங்கள்; இருவரும் சுதந்திரமாகப் பேச வாய்ப்பளியுங்கள்.'),
  engagement: T2('Confirm the hall, guest list and return gifts a week ahead; keep the elders\' blessing first.', 'மண்டபம், விருந்தினர் பட்டியல், தாம்பூலத்தை ஒரு வாரம் முன்பே உறுதி செய்யுங்கள்; பெரியோர் ஆசீர்வாதத்தை முதன்மையாக்குங்கள்.'),
  seemantham: T2('The mother\'s comfort and the doctor\'s advice come first — keep the function short and restful.', 'தாயின் வசதியும் மருத்துவர் ஆலோசனையும் முதன்மை — விழாவைச் சுருக்கமாகவும் ஓய்வாகவும் வையுங்கள்.'),
  mudi_kaanikkai: T2('Keep the child fed and rested, use a clean new blade, and apply sandal paste after.', 'குழந்தை சாப்பிட்டு ஓய்வாக இருக்கட்டும்; புதிய சுத்தமான கத்தி; பிறகு சந்தனம் தடவுங்கள்.'),
  ear_piercing: T2('Choose a clean, experienced piercer and keep the ears clean for a week.', 'சுத்தமான, அனுபவமுள்ளவரிடம் குத்துங்கள்; ஒரு வாரம் காதைச் சுத்தமாக வையுங்கள்.'),
  travel: T2('Check tickets, ID and weather; tell family your route and carry water and medicines.', 'பயணச்சீட்டு, அடையாள அட்டை, வானிலையைச் சரிபாருங்கள்; வழியைக் குடும்பத்தினரிடம் சொல்லுங்கள்; தண்ணீர், மருந்து எடுத்துச் செல்லுங்கள்.'),
  visa: T2('Keep every document in the embassy\'s order with copies; reach the appointment early.', 'எல்லா ஆவணங்களையும் தூதரகம் கேட்கும் வரிசையில் நகல்களுடன் வையுங்கள்; நேரத்திற்கு முன்பே செல்லுங்கள்.'),
  passport_apply: T2('Fill the form online, book the appointment and carry original proofs with copies.', 'விண்ணப்பத்தை இணையத்தில் நிரப்பி, நேரத்தைப் பதிவு செய்து, அசல் சான்றுகளையும் நகல்களையும் எடுத்துச் செல்லுங்கள்.'),
  education: T2('Revise the hardest topic first, sleep well and carry your hall ticket and pens.', 'கடினமான பாடத்தை முதலில் மீண்டும் படியுங்கள், நன்றாகத் தூங்குங்கள், நுழைவுச் சீட்டு, பேனாக்களை எடுத்துச் செல்லுங்கள்.'),
  course_start: T2('Set a fixed daily study time and finish the first lesson on day one.', 'தினமும் ஒரு நிலையான படிப்பு நேரம் வையுங்கள்; முதல் நாளே முதல் பாடத்தை முடியுங்கள்.'),
  competition: T2('Warm up, eat light and focus on your own best — not on the others.', 'உடலைத் தயார் செய்யுங்கள், லேசாகச் சாப்பிடுங்கள், மற்றவர்களை அல்ல — உங்கள் சிறப்பில் கவனம் செலுத்துங்கள்.'),
  court: T2('Meet your lawyer with every paper in order and reach the court early.', 'எல்லா ஆவணங்களுடனும் வழக்கறிஞரைச் சந்தித்து, நீதிமன்றத்திற்கு முன்பே செல்லுங்கள்.'),
  contract: T2('Read every page, initial each one and keep a signed copy; ask for time if a clause is unclear.', 'ஒவ்வொரு பக்கத்தையும் படித்துச் சுருக்கக் கையெழுத்திடுங்கள், கையெழுத்திட்ட நகலை வையுங்கள்; புரியாத விதிக்கு நேரம் கேளுங்கள்.'),
  police_complaint: T2('Write the facts with dates, attach proof, and ask for the CSR / FIR receipt.', 'நடந்ததைத் தேதியுடன் எழுதி, ஆதாரங்களை இணைத்து, புகார் ரசீதை (CSR / FIR) கேட்டுப் பெறுங்கள்.'),
  temple_visit: T2('A temple visit is never wrong — leave outside Rahu Kalam if you can and carry a small offering.', 'கோவிலுக்குச் செல்வது எப்போதும் நல்லதே — முடிந்தால் ராகு காலம் தவிர்த்துக் கிளம்புங்கள்; ஒரு சிறு காணிக்கை எடுத்துச் செல்லுங்கள்.'),
  vratham: T2('Fast only as health allows — elders, pregnant women and people on medicines can keep a light fast.', 'உடல்நலம் அனுமதிக்கும் அளவுக்கு மட்டுமே விரதம் — முதியோர், கர்ப்பிணிகள், மருந்து எடுப்பவர்கள் எளிய விரதம் போதும்.'),
  kitchen_start: T2('Boil milk first (paal kaaichu) and offer the first sweet to the family deity.', 'முதலில் பால் காய்ச்சுங்கள்; முதல் இனிப்பைக் குலதெய்வத்திற்குப் படையுங்கள்.'),
  borewell: T2('Get a ground-water survey and the local permission first; agree the depth and rate in writing.', 'முதலில் நிலத்தடி நீர் ஆய்வும் உள்ளூர் அனுமதியும் பெறுங்கள்; ஆழத்தையும் கட்டணத்தையும் எழுத்தில் ஒப்புக்கொள்ளுங்கள்.'),
  bhoomi_pooja: T2('Check the approved plan and the builder agreement; do the pooja in the north-east corner.', 'அனுமதி பெற்ற வரைபடம், கட்டுநர் ஒப்பந்தத்தைச் சரிபாருங்கள்; பூஜையை வடகிழக்கு மூலையில் செய்யுங்கள்.'),
};
const GROUP_STEP = {
  work: T2('Prepare your points on paper and go with a calm, clear plan.', 'சொல்ல வேண்டியவற்றைத் தாளில் எழுதி, அமைதியான தெளிவான திட்டத்துடன் செல்லுங்கள்.'),
  money: T2('Check every number twice and keep a written record.', 'ஒவ்வொரு எண்ணையும் இருமுறை சரிபார்த்து, எழுத்து மூலம் பதிவு வையுங்கள்.'),
  default: T2('Keep everything ready, start calmly and finish what you begin.', 'எல்லாவற்றையும் தயாராக வைத்து, அமைதியாகத் தொடங்கி, தொடங்கியதை முடியுங்கள்.'),
};
const PARIGARAM = {
  health: T2('Light a ghee lamp and say "Om Namo Bhagavate Dhanvantaraye" 11 times for a smooth recovery.', 'நெய் தீபம் ஏற்றி "ஓம் நமோ பகவதே தன்வந்தரயே" 11 முறை சொல்லுங்கள் — நலம் விரைவில் கூட.'),
  work: T2('Before you leave, pray to Vinayagar and say "Om Gam Ganapataye Namaha" 9 times.', 'கிளம்பும் முன் விநாயகரை வணங்கி "ஓம் கம் கணபதயே நமஹ" 9 முறை சொல்லுங்கள்.'),
  money: T2('Light a lamp before Mahalakshmi and say "Om Shreem Mahalakshmyai Namaha" 9 times.', 'மகாலட்சுமி முன் தீபம் ஏற்றி "ஓம் ஸ்ரீம் மகாலக்ஷ்ம்யை நமஹ" 9 முறை சொல்லுங்கள்.'),
  home: T2('Light a lamp in the north-east corner of the house and pray to the Kula Deivam.', 'வீட்டின் வடகிழக்கு மூலையில் தீபம் ஏற்றி, குலதெய்வத்தை வணங்குங்கள்.'),
  buy: T2('Light a lamp before Mahalakshmi and touch the new item to the pooja place before using it.', 'மகாலட்சுமி முன் தீபம் ஏற்றி, புதிய பொருளைப் பூஜை அறையில் வைத்து வணங்கிப் பிறகு பயன்படுத்துங்கள்.'),
  family: T2('Light a ghee lamp, seek the elders\' blessing and pray to the Kula Deivam together.', 'நெய் தீபம் ஏற்றி, பெரியோரின் ஆசி பெற்று, குடும்பமாகக் குலதெய்வத்தை வணங்குங்கள்.'),
  travel: T2('Before leaving, pray to Vinayagar and say "Om Sharavanabhava" — Murugan guards the journey.', 'கிளம்பும் முன் விநாயகரை வணங்கி "ஓம் சரவணபவ" சொல்லுங்கள் — முருகன் பயணத்தைக் காப்பார்.'),
  study: T2('Light a lamp for Saraswathi and say "Saraswathi Namasthubhyam" before you begin.', 'சரஸ்வதிக்குத் தீபம் ஏற்றி, தொடங்கும் முன் "சரஸ்வதி நமஸ்துப்யம்" சொல்லுங்கள்.'),
  legal: T2('Pray to Lord Narasimha or Murugan and light a lamp; say "Om Namo Narayanaya" 11 times.', 'நரசிம்மர் அல்லது முருகனை வணங்கி தீபம் ஏற்றுங்கள்; "ஓம் நமோ நாராயணாய" 11 முறை சொல்லுங்கள்.'),
  spiritual: T2('Light a lamp at home and begin with a short prayer to your Ishta Deivam.', 'வீட்டில் தீபம் ஏற்றி, இஷ்ட தெய்வத்திற்கு ஒரு சிறு பிரார்த்தனையுடன் தொடங்குங்கள்.'),
  default: T2('Pray to Vinayagar, light a ghee lamp and begin — "Om Gam Ganapataye Namaha".', 'விநாயகரை வணங்கி நெய் தீபம் ஏற்றித் தொடங்குங்கள் — "ஓம் கம் கணபதயே நமஹ".'),
};

/**
 * The crisp summary shown with a Prasnam verdict: the top 3 reasons (strongest first; supportive reasons lead a
 * "go" verdict, the cautions lead the others), the practical step for right now, and a free parigaram (prayer /
 * lamp — never a paid ritual) when the verdict is not a clear "go".
 */
export function prasnaSummary(result, category) {
  const cat = typeof category === 'string' ? getCategory(category) : category;
  const go = result.verdict === 'DO';
  const fs = (result.factors || []).filter((f) => f.points !== 0);
  const ranked = [...fs].sort((a, b) => (go ? (b.points > 0) - (a.points > 0) : (a.points > 0) - (b.points > 0)) || Math.abs(b.points) - Math.abs(a.points));
  const reasons = ranked.slice(0, 3).map((f) => ({ en: f.label, ta: f.labelTa, points: f.points }));
  const step = STEP[cat?.id] || GROUP_STEP[cat?.group] || GROUP_STEP.default;
  const practical = !!(result.practicalFirst || cat?.practicalFirst);
  const lead = go ? T2('Go ahead now.', 'இப்போதே செய்யலாம்.')
    : practical ? T2('Keep to your real deadline.', 'உங்கள் உண்மையான காலக்கெடுப்படி செய்யுங்கள்.')
      : result.verdict === 'CAUTION' ? T2('You can go ahead with care.', 'கவனத்துடன் செய்யலாம்.')
        : T2('Prepare now and begin at the better time.', 'இப்போது தயார் செய்து, நல்ல நேரத்தில் தொடங்குங்கள்.');
  const doNow = T2(`${lead} ${step.en}`, `${lead.ta} ${step.ta}`);
  const parigaram = go ? null : (PARIGARAM[cat?.group] || PARIGARAM.default);
  return { reasons, doNow, parigaram };
}
