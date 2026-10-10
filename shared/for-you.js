// Thunai For You (துணை உங்களுக்காக) — Thunai goes out into the world for the person: from their own jathagam it
// works out what suits them and when, then opens real searches on trusted websites for jobs, matrimony and
// hospitals — together with the parigaram and the practical steps.
//
// Rules (docs/DETERMINISTIC-PREDICTION-STANDARD.md):
//   • The chart decides the FIELDS, the STARS and the PERIODS; the person's own details (education, city,
//     community) decide the search. Community / sub-caste is never guessed from a chart — only what the family types,
//     used in their own search and kept on the phone.
//   • Links open the sites' own public search pages; Thunai does not copy listings or profiles from other software.
//   • Health: no timing and no chart verdict — the right specialist near them, emergency numbers, doctor first.
// Pure — no DOM.
import { NAKSHATRAS, RASIS } from './astro.js';
import { careerReading, FIELDS } from './ask-which.js';
import { predictEvent } from './predict.js';
import { matchPorutham, doshams } from './porutham.js';
import { remedyFor } from './remedies.js';
import { nallaNeramWindows } from './tamilcal.js';

const T = (en, ta) => ({ en, ta });
export const FOR_YOU_VERSION = 'for-you-1.0.0';

// ---------------------------------------------------------------- links
const enc = encodeURIComponent;
const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const cityOf = (place) => String(place || '').split(',')[0].trim();
const GULF = new Set(['AE', 'SA', 'QA', 'OM', 'KW', 'BH']);

/** Job search links for a keyword and city. India gets Naukri / Indeed India; the Gulf gets Naukrigulf. */
export function jobLinks(keyword, place, cc = 'IN') {
  const city = cityOf(place);
  const out = [
    { site: 'Google Jobs', url: `https://www.google.com/search?q=${enc(`${keyword} jobs in ${city}`)}&ibp=htl;jobs` },
    { site: 'LinkedIn', url: `https://www.linkedin.com/jobs/search/?keywords=${enc(keyword)}&location=${enc(city)}` },
  ];
  if (cc === 'IN') {
    out.splice(1, 0, { site: 'Naukri', url: `https://www.naukri.com/${slug(keyword)}-jobs-in-${slug(city)}` }, { site: 'Indeed', url: `https://in.indeed.com/jobs?q=${enc(keyword)}&l=${enc(city)}` });
  } else if (GULF.has(cc)) {
    out.splice(1, 0, { site: 'Naukrigulf', url: `https://www.naukrigulf.com/${slug(keyword)}-jobs-in-${slug(city)}` });
  }
  return out;
}

/** Government job and skill portals (India; Tamil Nadu portals first for Tamil families). */
export const GOVT_PORTALS = Object.freeze([
  { site: T('TN Velai Vaaippu (Employment Exchange)', 'தமிழ்நாடு வேலைவாய்ப்பு (வேலைவாய்ப்பு அலுவலகம்)'), url: 'https://tnvelaivaaippu.gov.in' },
  { site: T('TNPSC — Tamil Nadu government exams', 'TNPSC — தமிழ்நாடு அரசுத் தேர்வுகள்'), url: 'https://www.tnpsc.gov.in' },
  { site: T('Naan Mudhalvan — free skill courses', 'நான் முதல்வன் — இலவசத் திறன் பயிற்சி'), url: 'https://www.naanmudhalvan.tn.gov.in' },
  { site: T('National Career Service (Govt of India)', 'தேசிய வேலைவாய்ப்பு சேவை (இந்திய அரசு)'), url: 'https://www.ncs.gov.in' },
  { site: T('Apprenticeship India — paid training', 'அப்ரண்டிஸ்ஷிப் இந்தியா — ஊதியப் பயிற்சி'), url: 'https://www.apprenticeshipindia.gov.in' },
]);

/** Matrimony search links (the person's own search: bride / groom, community they typed, compatible stars, city). */
export function matrimonyLinks({ seeking = 'bride', community = '', stars = [], place = '', second = false } = {}) {
  const who = seeking === 'groom' ? 'groom' : 'bride';
  const q = [second ? 'second marriage' : '', 'tamil matrimony', community, who, stars.slice(0, 3).join(' '), cityOf(place)].filter(Boolean).join(' ');
  return [
    { site: 'TamilMatrimony', url: 'https://www.tamilmatrimony.com' },
    { site: 'BharatMatrimony', url: 'https://www.bharatmatrimony.com' },
    { site: 'Shaadi', url: 'https://www.shaadi.com' },
    { site: 'Google', url: `https://www.google.com/search?q=${enc(q)}` },
  ];
}

/** Hospitals of a speciality near a place (Google Maps search). */
export const hospitalLink = (specialty, place) => ({ site: 'Google Maps', url: `https://www.google.com/maps/search/?api=1&query=${enc(`${specialty} hospital near ${cityOf(place) || 'me'}`)}` });

// ---------------------------------------------------------------- job
// Search words for each career field (job sites search in English).
const FIELD_KW = {
  govt: 'government', medicine: 'doctor', leadership: 'manager', hospitality: 'hotel', nursing: 'staff nurse', travel: 'travel consultant',
  public: 'customer service', engineering: 'site engineer', police: 'security officer', realestate: 'real estate sales', surgery: 'surgeon',
  sports: 'fitness trainer', accounts: 'accountant', it: 'software developer', writing: 'content writer', trade: 'business development',
  teaching: 'teacher', law: 'legal associate', finance: 'bank', advisory: 'consultant', priesthood: 'temple', arts: 'graphic designer',
  fashion: 'fashion designer', vehicles: 'automobile service', manufacturing: 'production', mining: 'mining engineer', service: 'operations executive',
  foreign: 'MNC', tech: 'electronics technician', aviation: 'logistics', chemicals: 'pharma', research: 'research analyst', spiritual: 'counsellor',
  coding: 'data analyst', altmed: 'siddha ayurveda doctor',
};
// Education → what fits first, and a word for the search.
export const EDUCATION = Object.freeze([
  { id: '10th', label: T('10th', '10-ம் வகுப்பு'), kw: '10th pass', fields: ['service', 'manufacturing', 'vehicles', 'public'] },
  { id: '12th', label: T('12th', '12-ம் வகுப்பு'), kw: '12th pass', fields: ['public', 'service', 'hospitality', 'accounts'] },
  { id: 'iti', label: T('ITI / Diploma', 'ITI / டிப்ளமோ'), kw: 'diploma', fields: ['engineering', 'manufacturing', 'vehicles', 'tech'] },
  { id: 'arts', label: T('Degree — Arts / Science', 'பட்டம் — கலை / அறிவியல்'), kw: 'graduate', fields: ['teaching', 'writing', 'research', 'public'] },
  { id: 'commerce', label: T('Degree — Commerce', 'பட்டம் — வணிகவியல்'), kw: 'B.Com', fields: ['accounts', 'finance', 'trade'] },
  { id: 'engineering', label: T('Engineering', 'பொறியியல்'), kw: 'engineer', fields: ['it', 'engineering', 'coding', 'tech'] },
  { id: 'health', label: T('Medical / Nursing / Pharmacy', 'மருத்துவம் / செவிலியர் / மருந்தியல்'), kw: 'healthcare', fields: ['medicine', 'nursing', 'chemicals'] },
  { id: 'law', label: T('Law', 'சட்டம்'), kw: 'law graduate', fields: ['law', 'advisory', 'govt'] },
  { id: 'mba', label: T('MBA / PG', 'MBA / முதுகலை'), kw: 'MBA', fields: ['leadership', 'finance', 'advisory', 'trade'] },
]);

/**
 * Job plan: the fields the chart supports (shared/ask-which.js careerReading), ordered for their education, each with
 * real search links; the supportive periods (job for a fresher, job change otherwise), the parigaram, today's good
 * times to apply, and the real-world steps.
 * @param {{ chart, rel?, education?, experience?: 'fresher'|'some'|'many', place?, cc?, td?, now? }} o
 */
export function jobPlan({ chart, rel = null, education = 'arts', experience = 'fresher', place = '', cc = 'IN', td = null, now = new Date() }) {
  const edu = EDUCATION.find((e) => e.id === education) || EDUCATION[3];
  let chartFields = [];
  try { chartFields = (careerReading(chart, { rel, now })?.groups || []).flatMap((g) => g.fields.map((f) => ({ id: f, planet: g.planet, reason: g.reasons?.[0] || null }))); } catch { chartFields = []; }
  const seen = new Set();
  const both = chartFields.filter((f) => edu.fields.includes(f.id));
  const ordered = [...both, ...chartFields, ...edu.fields.map((id) => ({ id, planet: null, reason: null }))].filter((f) => FIELDS[f.id] && !seen.has(f.id) && seen.add(f.id)).slice(0, 4);
  const fields = ordered.map((f) => {
    const kw = `${FIELD_KW[f.id] || f.id}${experience === 'fresher' ? ' fresher' : ''}`;
    return { id: f.id, name: FIELDS[f.id], fromChart: Boolean(f.planet), alsoEducation: edu.fields.includes(f.id), planet: f.planet, reason: f.reason, keyword: kw, links: jobLinks(kw, place, cc) };
  });
  const pr = safePredict(chart, experience === 'fresher' ? 'job' : 'job_change', now);
  const steps = experience === 'fresher' ? [
    T('Apply to 5 openings a day for 30 days — keep a list of where you applied.', '30 நாட்களுக்குத் தினமும் 5 வேலைகளுக்கு விண்ணப்பியுங்கள் — எங்கே விண்ணப்பித்தீர்கள் என்று பட்டியல் வையுங்கள்.'),
    T('Take one free skill course (Naan Mudhalvan, NCS) and add the certificate to your CV.', 'ஒரு இலவசத் திறன் பயிற்சி (நான் முதல்வன், NCS) முடித்து, சான்றிதழை விவரக் குறிப்பில் சேருங்கள்.'),
    T('An apprenticeship or internship counts as experience — accept a good one.', 'அப்ரண்டிஸ்ஷிப் / இன்டர்ன்ஷிப்பும் அனுபவமே — நல்ல வாய்ப்பை ஏற்றுக்கொள்ளுங்கள்.'),
    T('Register at the Employment Exchange and on two job sites with a photo and complete profile.', 'வேலைவாய்ப்பு அலுவலகத்திலும் இரண்டு வேலைத் தளங்களிலும் புகைப்படத்துடன் முழு விவரத்தைப் பதிவு செய்யுங்கள்.'),
  ] : [
    T('Do not resign before you have a written offer.', 'எழுத்துப்பூர்வ வாய்ப்பு வரும் முன் ராஜினாமா செய்யாதீர்கள்.'),
    T('Update your CV with five achievements, each with a number.', 'ஐந்து சாதனைகளை எண்களுடன் விவரக் குறிப்பில் சேருங்கள்.'),
    T('Tell three people in your field that you are looking.', 'உங்கள் துறையில் மூவரிடம் வேலை தேடுவதைச் சொல்லுங்கள்.'),
  ];
  return {
    version: FOR_YOU_VERSION, kind: 'job', education: edu, fields,
    when: pr, applyTimes: td ? nallaNeramWindows(td, now).slice(0, 3) : [],
    parigaram: pr?.remedy || null, karakaRemedies: pr?.karakaRemedies || [],
    steps, govt: cc === 'IN' ? GOVT_PORTALS : [],
    safety: T('Never pay money to get a job. Check the company and the offer letter; real employers do not ask for a deposit.', 'வேலை பெற ஒருபோதும் பணம் செலுத்தாதீர்கள். நிறுவனத்தையும் வேலை ஆணையையும் சரிபாருங்கள்; உண்மையான நிறுவனங்கள் வைப்புத்தொகை கேட்பதில்லை.'),
  };
}

// ---------------------------------------------------------------- marriage
const rasisOfStar = (s) => [...new Set([0, 1, 2, 3].map((p) => Math.floor((s * 4 + p) / 9)))];

/**
 * Stars (with the rasi of their padas) that agree with this person's star in porutham: Rajju and Vedhai agree and at
 * least 7 of 10 factors agree. Sorted best first. `gender` is the person's own gender.
 */
export function compatibleStars(star, rasi, gender = 'male', { min = 7 } = {}) {
  const out = [];
  for (let s = 0; s < 27; s++) {
    for (const r of rasisOfStar(s)) {
      const me = { star, rasi }, other = { star: s, rasi: r };
      const m = gender === 'female' ? matchPorutham(me, other) : matchPorutham(other, me);
      if (!m.keyFactorsDisagree && m.agree >= min) out.push({ star: s, rasi: r, agree: m.agree, name: T(NAKSHATRAS[s].en, NAKSHATRAS[s].ta), rasiName: T(RASIS[r].en, RASIS[r].ta) });
    }
  }
  return out.sort((a, b) => b.agree - a.agree || a.star - b.star);
}

/**
 * Marriage plan (first marriage, or a second marriage / remarriage after divorce or the loss of a spouse):
 * compatible stars from porutham, Chevvai / Rahu-Ketu dosham status, the supportive periods, the parigaram, the
 * person's own search links and safe steps. `community` is only what the family typed.
 * @param {{ chart, rel?, gender, second?, community?, place?, now? }} o
 */
export function marriagePlan({ chart, rel = null, gender = 'male', second = false, community = '', place = '', now = new Date() }) {
  const starOk = rel?.nakshatra !== false;
  const star = chart.janmaNakshatra.index, rasi = chart.janmaRasi.index;
  const stars = starOk ? compatibleStars(star, rasi, gender) : [];
  let d = null;
  try { d = doshams(chart.planets); } catch { d = null; }
  const pr = safePredict(chart, 'marriage', now);
  const seeking = gender === 'female' ? 'groom' : 'bride';
  const topNames = stars.slice(0, 3).map((s) => s.name.en);
  return {
    version: FOR_YOU_VERSION, kind: second ? 'second' : 'marriage', seeking, second,
    myStar: T(NAKSHATRAS[star].en, NAKSHATRAS[star].ta), myRasi: T(RASIS[rasi].en, RASIS[rasi].ta), starOk,
    stars,
    dosham: d ? { chevvai: Boolean(d.chevvai?.present), rahuKetu: Boolean(d.rahuKetu?.present) } : null,
    doshamNote: T('If a dosham is present, a partner with a similar dosham balances it (dosha samyam). It is common and not a reason for fear.', 'தோஷம் இருந்தால், இதே தோஷம் உள்ள வரன் சமன் செய்வார் (தோஷ சாம்யம்). இது பொதுவானது; பயப்பட வேண்டியதில்லை.'),
    when: pr, parigaram: pr?.remedy || null,
    links: matrimonyLinks({ seeking, community, stars: topNames, place, second }),
    communityNote: T('Community / sub-caste is used only in your own search, exactly as you type it — Thunai never guesses it from a chart.', 'சமூகம் / உட்பிரிவு — நீங்கள் தட்டச்சு செய்தபடியே உங்கள் தேடலில் மட்டும் பயன்படும்; துணை அதை ஜாதகத்திலிருந்து ஒருபோதும் ஊகிப்பதில்லை.'),
    steps: second ? [
      T('Take your time — a new beginning is a fresh, respectful choice.', 'நேரம் எடுத்துக்கொள்ளுங்கள் — புதிய தொடக்கம் மரியாதைக்குரிய புதிய தேர்வு.'),
      T('Be open about your past marriage and any children from the first talk.', 'முதல் பேச்சிலேயே முந்தைய திருமணம், குழந்தைகள் பற்றி வெளிப்படையாகப் பேசுங்கள்.'),
      T('Keep the divorce decree or death certificate ready; marriage registration needs it.', 'விவாகரத்து ஆணை அல்லது இறப்புச் சான்றிதழைத் தயாராக வையுங்கள்; திருமணப் பதிவுக்குத் தேவை.'),
      T('Involve elders you trust, and meet in a family setting first.', 'நம்பிக்கையான பெரியோரை ஈடுபடுத்துங்கள்; முதலில் குடும்பச் சூழலில் சந்தியுங்கள்.'),
    ] : [
      T('Write down the three things that matter most in a life partner.', 'வாழ்க்கைத் துணையிடம் மிக முக்கியமான மூன்றை எழுதுங்கள்.'),
      T('Shortlist profiles with the stars above, then check full porutham in Thunai.', 'மேலே உள்ள நட்சத்திரங்களுடன் வரன்களைத் தேர்ந்தெடுத்து, துணையில் முழுப் பொருத்தம் பாருங்கள்.'),
      T('Meet with families and talk properly before deciding.', 'முடிவெடுக்கும் முன் குடும்பங்களுடன் சந்தித்து முறையாகப் பேசுங்கள்.'),
    ],
    safety: T('Verify every profile in person with the family. Never send money or share OTPs, and meet first in a public or family place.', 'ஒவ்வொரு வரனையும் குடும்பத்துடன் நேரில் சரிபாருங்கள். பணம் அனுப்பவோ OTP பகிரவோ வேண்டாம்; முதல் சந்திப்பு பொது இடத்தில் அல்லது குடும்பச் சூழலில்.'),
  };
}

// ---------------------------------------------------------------- health
export const SPECIALTIES = Object.freeze([
  { id: 'general', label: T('General check-up', 'பொதுப் பரிசோதனை'), q: 'multispeciality' },
  { id: 'heart', label: T('Heart', 'இதயம்'), q: 'cardiology' },
  { id: 'diabetes', label: T('Diabetes / sugar', 'சர்க்கரை நோய்'), q: 'diabetology' },
  { id: 'women', label: T('Women’s health / pregnancy', 'பெண்கள் நலம் / கர்ப்பம்'), q: 'gynaecology' },
  { id: 'children', label: T('Children', 'குழந்தைகள்'), q: 'paediatric' },
  { id: 'bones', label: T('Bones and joints', 'எலும்பு, மூட்டு'), q: 'orthopaedic' },
  { id: 'eyes', label: T('Eyes', 'கண்'), q: 'eye' },
  { id: 'mind', label: T('Mind, stress and sleep', 'மனம், மன அழுத்தம், உறக்கம்'), q: 'psychiatry counselling' },
  { id: 'dental', label: T('Teeth', 'பல்'), q: 'dental' },
  { id: 'siddha', label: T('Siddha / Ayurveda', 'சித்தா / ஆயுர்வேதம்'), q: 'siddha ayurveda' },
]);
const EMERGENCY = { IN: T('Ambulance 108 · Emergency 112 · Tele-MANAS 14416', 'ஆம்புலன்ஸ் 108 · அவசரம் 112 · டெலி-மனஸ் 14416'), AE: T('Ambulance 998 · Police 999', 'ஆம்புலன்ஸ் 998 · காவல் 999') };

/** Health plan: hospitals of the speciality near them, emergency numbers, an optional prayer — never timing. */
export function healthPlan({ specialty = 'general', place = '', cc = 'IN', profile = null }) {
  const sp = SPECIALTIES.find((s) => s.id === specialty) || SPECIALTIES[0];
  const r = remedyFor('Sun', { profile });
  return {
    version: FOR_YOU_VERSION, kind: 'health', specialty: sp,
    links: [hospitalLink(sp.q, place), hospitalLink(`government ${sp.q}`, place)],
    emergency: EMERGENCY[cc] || T('Call your local emergency number.', 'உங்கள் நாட்டின் அவசர எண்ணை அழையுங்கள்.'),
    first: T('See a qualified doctor first and follow the treatment fully. Thunai does not read health timing from a chart.', 'முதலில் தகுதியான மருத்துவரைப் பாருங்கள்; சிகிச்சையை முழுமையாகப் பின்பற்றுங்கள். உடல்நலக் காலத்தைத் துணை ஜாதகத்திலிருந்து கணிப்பதில்லை.'),
    prayer: r ? { deity: T('Lord Dhanvantari and Surya', 'தன்வந்திரி பகவான், சூரியன்'), free: r.free, optional: true } : null,
  };
}

function safePredict(chart, id, now) {
  try {
    const p = predictEvent(chart, id, { from: now, years: 6 });
    return { windows: (p.windows || []).slice(0, 3).map((w) => ({ start: w.peakFrom || w.start, end: w.peakTo || w.end, md: w.md, ad: w.ad, reason: w.reasons?.[0] || null })), needsBirthTime: Boolean(p.needsBirthTime), remedy: p.remedy, karakaRemedies: p.karakaRemedies || [], current: p.current || null };
  } catch { return null; }
}
