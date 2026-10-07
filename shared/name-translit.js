// Personal-name transliteration, English (Latin) ⇄ Tamil script — offline, no dependencies (pure: tests import it).
//
// Used by the family form (public/account.js) so a name typed in one script fills the other one live, and by
// displayName() (public/core.js) so every screen can show a person's name in the script they chose.
//
//   toTamil('Suresh Babu')  → 'சுரேஷ் பாபு'     toTamil('R. Suresh') → 'ஆர். சுரேஷ்'
//   toLatin('முருகன்')       → 'Murugan'
//
// How it works: a curated dictionary of common Tamil / Indian given names and surnames is checked first (and
// a word made of two or three dictionary names, e.g. "Sureshkumar"); only then phonetic rules tuned for South
// Indian names. The Tamil output never contains Latin letters. Lakshmi-type names use the common ட்ச spelling
// (லட்சுமி), consistently. A name is a person's own: the form always lets them correct the spelling.

// ---------------------------------------------------------------- dictionary
// "English|alias|alias=தமிழ்" — the first English spelling is the one used for Tamil → English.
const DICT_SRC = `
Suresh=சுரேஷ்
Babu=பாபு
Ramesh=ரமேஷ்
Rajesh=ராஜேஷ்
Mahesh=மகேஷ்
Dinesh=தினேஷ்
Ganesh=கணேஷ்
Naresh=நரேஷ்
Umesh=உமேஷ்
Rakesh=ராகேஷ்
Mukesh=முகேஷ்
Venkatesh=வெங்கடேஷ்
Kamalesh=கமலேஷ்
Lokesh=லோகேஷ்
Yogesh=யோகேஷ்
Vignesh|Vigneshwar=விக்னேஷ்
Kavin=கவின்
Karthik|Karthick|Karthic|Karthi=கார்த்திக்
Karthikeyan=கார்த்திகேயன்
Senthil=செந்தில்
Senthilkumar=செந்தில்குமார்
Murugan=முருகன்
Velmurugan=வேல்முருகன்
Anand|Anandh=ஆனந்த்
Arun=அருண்
Varun=வருண்
Tharun|Tarun=தருண்
Krishnan=கிருஷ்ணன்
Krishna=கிருஷ்ணா
Krishnamoorthy|Krishnamurthy=கிருஷ்ணமூர்த்தி
Krishnasamy|Krishnaswamy=கிருஷ்ணசாமி
Raman=ராமன்
Ram=ராம்
Rama=ராமா
Saravanan=சரவணன்
Stalin=ஸ்டாலின்
Nancy=நான்சி
Akshay=அக்‌ஷய்
Charles=சார்லஸ்
Gunavathi=குணவதி
Kumudha=குமுதா
Kalaivani=கலைவாணி
Vani=வாணி
Mani=மணி
Ganesh=கணேஷ்
Ganesan=கணேசன்
Veni=வேணி
Krishnaveni=கிருஷ்ணவேணி
Praveen=பிரவீன்
Praveena=பிரவீணா
Saravana=சரவணா
Jayakumar|Jeyakumar=ஜெயக்குமார்
Kumar=குமார்
Mohammed|Mohamed|Muhammad|Mohammad|Mohamad=முகமது
John=ஜான்
Joseph=ஜோசப்
Mohan=மோகன்
Mohanraj=மோகன்ராஜ்
Gopal=கோபால்
Gopi=கோபி
Ravi=ரவி
Raja=ராஜா
Rajan=ராஜன்
Raju=ராஜு
Raj=ராஜ்
Rajkumar=ராஜ்குமார்
Rajendran=ராஜேந்திரன்
Rajagopal=ராஜகோபால்
Rajasekar|Rajasekhar=ராஜசேகர்
Selvam=செல்வம்
Selvan=செல்வன்
Muthu=முத்து
Muthukumar=முத்துக்குமார்
Kannan=கண்ணன்
Kumaran=குமரன்
Kumaresan=குமரேசன்
Velu=வேலு
Vel=வேல்
Vadivel=வடிவேல்
Pandian|Pandiyan=பாண்டியன்
Pandi=பாண்டி
Balu=பாலு
Bala=பாலா
Balaji=பாலாஜி
Balasubramanian=பாலசுப்பிரமணியன்
Subramanian|Subramaniam=சுப்பிரமணியன்
Subbu=சுப்பு
Subbiah|Subbaiah=சுப்பையா
Siva|Shiva=சிவா
Sivakumar|Shivakumar=சிவக்குமார்
Sivaraman=சிவராமன்
Shankar|Sankar=சங்கர்
Sankaran|Shankaran=சங்கரன்
Sekar|Shekar|Sekhar=சேகர்
Sekaran=சேகரன்
Chandran=சந்திரன்
Chandra=சந்திரா
Chandrasekar|Chandrasekhar|Chandrasekaran=சந்திரசேகர்
Prakash=பிரகாஷ்
Prabhu|Prabu=பிரபு
Prasad=பிரசாத்
Pradeep=பிரதீப்
Praveen=பிரவீன்
Prem=பிரேம்
Pranav=பிரணவ்
Vijay=விஜய்
Ajay=அஜய்
Sanjay=சஞ்சய்
Sanjeev=சஞ்சீவ்
Vinoth|Vinod=வினோத்
Manoj=மனோஜ்
Santhosh|Santosh=சந்தோஷ்
Sathish|Satish|Sathiesh=சதீஷ்
Hari=ஹரி
Harish=ஹரீஷ்
Hariharan=ஹரிஹரன்
Radhika=ராதிகா
Jothika=ஜோதிகா
Gowtham|Gautham|Gautam|Goutham=கௌதம்
Ashok=அசோக்
Ashwin=அஷ்வின்
Aravind|Arvind|Aravindh=அரவிந்த்
Govind=கோவிந்த்
Govindan=கோவிந்தன்
Gokul=கோகுல்
Ganesan=கணேசன்
Ganapathy|Ganapathi=கணபதி
Ilango|Elango=இளங்கோ
Ilangovan|Elangovan=இளங்கோவன்
Ilayaraja|Ilaiyaraja=இளையராஜா
Kathir|Kadhir=கதிர்
Kathiravan|Kadhiravan=கதிரவன்
Kathiresan=கதிரேசன்
Arjun=அர்ஜுன்
Bharath|Bharat=பரத்
Bhaskar|Baskar|Bhaskaran=பாஸ்கர்
Dhanush=தனுஷ்
Deepak=தீபக்
Dev=தேவ்
Elumalai|Ezhumalai=ஏழுமலை
Gunasekaran=குணசேகரன்
Jagan=ஜெகன்
Jeeva|Jiva=ஜீவா
Kamal=கமல்
Kamaraj=காமராஜ்
Kishore=கிஷோர்
Lakshmanan=லட்சுமணன்
Madhavan=மாதவன்
Manikandan=மணிகண்டன்
Mani=மணி
Mariappan=மாரியப்பன்
Nagaraj=நாகராஜ்
Nandha|Nanda=நந்தா
Nandhakumar|Nandakumar=நந்தகுமார்
Natarajan|Nataraj=நடராஜன்
Narayanan=நாராயணன்
Narayan=நாராயண்
Palani=பழனி
Palanisamy|Palaniswamy|Palanisami=பழனிசாமி
Parthiban=பார்த்திபன்
Perumal=பெருமாள்
Ponnusamy|Ponnuswamy=பொன்னுசாமி
Raghu|Ragu=ரகு
Raghavan|Ragavan=ராகவன்
Rahul=ராகுல்
Ramachandran=ராமச்சந்திரன்
Ramasamy|Ramaswamy=ராமசாமி
Ramalingam=ராமலிங்கம்
Ramanathan=ராமநாதன்
Ranjith|Ranjit=ரஞ்சித்
Sakthi|Shakthi|Shakti=சக்தி
Sampath=சம்பத்
Sathya|Satya=சத்யா
Sathyamoorthy|Sathyamurthy=சத்தியமூர்த்தி
Murthy|Moorthy=மூர்த்தி
Srinivasan=சீனிவாசன்
Sridhar=ஸ்ரீதர்
Sriram=ஸ்ரீராம்
Srikanth=ஸ்ரீகாந்த்
Sundar=சுந்தர்
Sundaram=சுந்தரம்
Surya|Suriya=சூர்யா
Thangaraj=தங்கராஜ்
Thangavel=தங்கவேல்
Thiru=திரு
Thirumalai=திருமலை
Thiyagarajan|Thyagarajan=தியாகராஜன்
Udhayakumar|Udayakumar=உதயகுமார்
Vasanth|Vasant=வசந்த்
Venkat=வெங்கட்
Vimal=விமல்
Vishnu=விஷ்ணு
Yuvaraj=யுவராஜ்
Ajith|Ajit=அஜித்
Arul=அருள்
Anbu=அன்பு
Anbarasan=அன்பரசன்
Nithin|Nitin=நிதின்
Nithish|Nitish=நிதிஷ்
Rohit|Rohith=ரோஹித்
Sachin=சச்சின்
Sudhakar=சுதாகர்
Sunil=சுனில்
Tamil|Thamizh|Tamizh=தமிழ்
Tamilselvan|Thamizhselvan=தமிழ்செல்வன்
Vetri=வெற்றி
Vetrivel=வெற்றிவேல்
Aadhi|Adhi=ஆதி
Aadhavan|Adhavan=ஆதவன்
Aakash|Akash=ஆகாஷ்
Abhishek=அபிஷேக்
Aditya|Adithya=ஆதித்யா
Kabilan=கபிலன்
Magizhan=மகிழன்
Mugilan=முகிலன்
Inban=இன்பன்
Iniyan=இனியன்
Kandasamy|Kandaswamy=கந்தசாமி
Chinnasamy|Chinnaswamy=சின்னசாமி
Annamalai=அண்ணாமலை
Arumugam=ஆறுமுகம்
Ayyappan=ஐயப்பன்
Duraisamy|Duraiswamy=துரைசாமி
Durai=துரை
Karuppasamy|Karuppusamy|Karuppaswamy=கருப்பசாமி
Mahalingam=மகாலிங்கம்
Manickam|Manikam=மாணிக்கம்
Marimuthu=மாரிமுத்து
Paramasivam=பரமசிவம்
Periyasamy|Periyaswamy=பெரியசாமி
Rangasamy|Rengasamy|Rangaswamy=ரங்கசாமி
Shanmugam|Shanmugham|Sanmugam=சண்முகம்
Swaminathan=சுவாமிநாதன்
Veerappan=வீரப்பன்
Velayutham=வேலாயுதம்
Abdul=அப்துல்
Abdullah=அப்துல்லா
Ahamed|Ahmed|Ahmad=அகமது
Ali=அலி
Ibrahim=இப்ராஹிம்
Ismail=இஸ்மாயில்
Rahim=ரஹீம்
Rahman=ரஹ்மான்
Salim|Saleem=சலீம்
Yusuf|Yousuf=யூசுப்
Peter=பீட்டர்
Paul=பால்
David=டேவிட்
Daniel=டேனியல்
Thomas=தாமஸ்
James=ஜேம்ஸ்
Michael=மைக்கேல்
Stephen=ஸ்டீபன்
Samuel=சாமுவேல்
Anthony=அந்தோணி
Francis=பிரான்சிஸ்
George=ஜார்ஜ்
Xavier=சேவியர்
Robert=ராபர்ட்
Wilson=வில்சன்
Benjamin=பெஞ்சமின்
Meena=மீனா
Priya=பிரியா
Valli=வள்ளி
Divya|Dhivya=திவ்யா
Shanthi|Shanti|Santhi=சாந்தி
Thenmozhi=தேன்மொழி
Ezhil=எழில்
Ezhilarasi=எழிலரசி
Selvi=செல்வி
Gowri|Gauri=கௌரி
Mary=மேரி
Fatima|Fathima=பாத்திமா
Lakshmi|Laxmi|Lakshmy=லட்சுமி
Mahalakshmi=மகாலட்சுமி
Vijayalakshmi=விஜயலட்சுமி
Rajalakshmi=ராஜலட்சுமி
Dhanalakshmi=தனலட்சுமி
Jayalakshmi=ஜெயலட்சுமி
Muthulakshmi=முத்துலட்சுமி
Subbulakshmi=சுப்புலட்சுமி
Saraswathi|Saraswati|Saraswathy=சரஸ்வதி
Parvathi|Parvati|Parvathy=பார்வதி
Kamala=கமலா
Kamatchi|Kamakshi=காமாட்சி
Meenakshi|Meenatchi=மீனாட்சி
Geetha|Gita|Geeta|Githa=கீதா
Seetha|Sita|Sitha=சீதா
Radha=ராதா
Revathi|Revathy=ரேவதி
Sudha=சுதா
Uma=உமா
Usha=உஷா
Asha=ஆஷா
Rani=ராணி
Devi=தேவி
Sridevi=ஸ்ரீதேவி
Deepa=தீபா
Deepika=தீபிகா
Kavitha|Kavita=கவிதா
Kavya=காவ்யா
Kalpana=கல்பனா
Anitha|Anita=அனிதா
Sunitha|Sunita=சுனிதா
Lalitha|Lalita=லலிதா
Latha|Lata=லதா
Hema=ஹேமா
Hemalatha=ஹேமலதா
Malathi|Malathy=மாலதி
Malar=மலர்
Malini=மாலினி
Nandhini|Nandini=நந்தினி
Nithya|Nitya=நித்யா
Padma=பத்மா
Pavithra|Pavitra=பவித்ரா
Pooja=பூஜா
Poornima|Purnima=பூர்ணிமா
Pushpa=புஷ்பா
Rekha=ரேகா
Renuka=ரேணுகா
Rukmani|Rukmini=ருக்மணி
Sangeetha|Sangeeta=சங்கீதா
Saranya=சரண்யா
Sasikala=சசிகலா
Sharmila=ஷர்மிளா
Shobana|Sobana=ஷோபனா
Sneha=சினேகா
Sowmya|Soumya=சௌமியா
Subha|Shubha=சுபா
Swathi|Swati=சுவாதி
Tamilselvi|Thamizhselvi=தமிழ்செல்வி
Tamilarasi|Thamizharasi=தமிழரசி
Thamarai=தாமரை
Vani=வாணி
Vasanthi=வசந்தி
Vidya=வித்யா
Yamuna=யமுனா
Akila|Akhila=அகிலா
Amudha|Amutha=அமுதா
Anjali=அஞ்சலி
Bhuvana|Buvana=புவனா
Bhuvaneshwari|Bhuvaneswari=புவனேஸ்வரி
Chitra|Chithra=சித்ரா
Dharani=தரணி
Gayathri|Gayatri=காயத்ரி
Ilakkiya|Ilakiya|Elakkiya=இலக்கியா
Indira=இந்திரா
Indhu|Indu=இந்து
Janaki=ஜானகி
Jaya=ஜெயா
Jayanthi=ஜெயந்தி
Kala=கலா
Kalaivani=கலைவாணி
Kalaiselvi=கலைச்செல்வி
Kanimozhi=கனிமொழி
Kayal=கயல்
Keerthana=கீர்த்தனா
Keerthi|Kirthi=கீர்த்தி
Krithika|Kiruthika|Kirthika|Karthika=கிருத்திகா
Lavanya=லாவண்யா
Madhu=மது
Madhumitha=மதுமிதா
Mallika|Malliga=மல்லிகா
Manjula=மஞ்சுளா
Mythili|Maithili=மைதிலி
Nalini=நளினி
Nirmala=நிர்மலா
Ponni=பொன்னி
Preethi|Preeti|Priti=பிரீத்தி
Ramya=ரம்யா
Ranjani=ரஞ்சனி
Roja=ரோஜா
Saroja=சரோஜா
Shalini|Salini=ஷாலினி
Sindhu=சிந்து
Sumathi=சுமதி
Suganya=சுகன்யா
Sujatha=சுஜாதா
Thilagavathi=திலகவதி
Vaishnavi=வைஷ்ணவி
Vanitha=வனிதா
Varsha=வர்ஷா
Yazhini=யாழினி
Abinaya|Abhinaya=அபிநயா
Aishwarya|Iswarya|Aiswarya=ஐஸ்வர்யா
Aarthi|Arthi|Aarti=ஆர்த்தி
Bharathi=பாரதி
Jothi|Jyothi|Jyoti=ஜோதி
Kasthuri=கஸ்தூரி
Mumtaz=மும்தாஜ்
Ayesha|Aisha=ஆயிஷா
Zainab=ஜைனப்
Nasreen=நஸ்ரீன்
Khadija=கதீஜா
Shabana=ஷபானா
Salma=சல்மா
Rose=ரோஸ்
Grace=கிரேஸ்
Esther=எஸ்தர்
Sarah|Sara=சாரா
Elizabeth=எலிசபெத்
Angel=ஏஞ்சல்
Jennifer=ஜெனிபர்
Jessy|Jessie=ஜெஸ்ஸி
Priyanka=பிரியங்கா
Priyadharshini|Priyadarshini=பிரியதர்ஷினி
Dharshini|Darshini=தர்ஷினி
Harini=ஹரிணி
Kokila=கோகிலா
Mangalam=மங்களம்
Parimala=பரிமளா
Rathi=ரதி
Suguna=சுகுணா
Valarmathi=வளர்மதி
Vennila=வெண்ணிலா
Nila=நிலா
Kaveri|Cauvery=காவேரி
Ganga=கங்கா
Durga=துர்கா
Annapoorani=அன்னபூரணி
Ammal=அம்மாள்
Pillai=பிள்ளை
Iyer=ஐயர்
Iyengar=ஐயங்கார்
Nadar=நாடார்
Mudaliar|Mudaliyar=முதலியார்
Chettiar|Chettiyar=செட்டியார்
Gounder|Goundar=கவுண்டர்
Thevar=தேவர்
Naidu=நாயுடு
Reddy=ரெட்டி
Sharma=சர்மா
Rao=ராவ்
Nair=நாயர்
Menon=மேனன்
Singh=சிங்
Khan=கான்
Swamy|Samy|Sami|Swami=சாமி
Kumari=குமாரி
`;

const DICT = new Map(); // lower-case Latin → Tamil
const REV = new Map(); // Tamil → canonical English
for (const line of DICT_SRC.split('\n')) {
  const eq = line.indexOf('=');
  if (eq < 0) continue;
  const tamil = line.slice(eq + 1).trim().normalize('NFC');
  const ens = line.slice(0, eq).split('|').map((x) => x.trim()).filter(Boolean);
  for (const en of ens) if (!DICT.has(en.toLowerCase())) DICT.set(en.toLowerCase(), tamil);
  if (!REV.has(tamil)) REV.set(tamil, ens[0]);
}
/** Number of distinct names in the curated dictionary (tests). */
export const NAME_DICT_SIZE = REV.size;

// ---------------------------------------------------------------- script detection
const TA_RE = /[஀-௿]/;
const LATIN_RE = /[A-Za-z]/;
/** 'ta' | 'en' | 'mixed' | '' (no letters) for a name as typed. */
export function detectScript(s) {
  const t = String(s ?? '');
  const hasTa = TA_RE.test(t), hasEn = LATIN_RE.test(t);
  if (hasTa && hasEn) return 'mixed';
  return hasTa ? 'ta' : hasEn ? 'en' : '';
}

// Letter names used for initials ("R. Suresh" → "ஆர். சுரேஷ்").
const LETTER_TA = { a: 'ஏ', b: 'பி', c: 'சி', d: 'டி', e: 'ஈ', f: 'எஃப்', g: 'ஜி', h: 'ஹெச்', i: 'ஐ', j: 'ஜே', k: 'கே', l: 'எல்', m: 'எம்', n: 'என்', o: 'ஓ', p: 'பி', q: 'க்யூ', r: 'ஆர்', s: 'எஸ்', t: 'டி', u: 'யு', v: 'வி', w: 'டபிள்யூ', x: 'எக்ஸ்', y: 'ஒய்', z: 'இசட்' };
// Reverse: பி and டி are read as P and T (the commoner Tamil initials).
const TA_LETTER = new Map(Object.entries(LETTER_TA).filter(([k]) => k !== 'b' && k !== 'd').map(([k, v]) => [v, k.toUpperCase()]));

/** Split a typed name into tokens, keeping initials' dots: "R.Suresh  Babu" → ["R.", "Suresh", "Babu"]. */
function tokens(s) {
  return String(s ?? '').normalize('NFC').replace(/\./g, '. ').split(/\s+/).filter(Boolean);
}

// ---------------------------------------------------------------- English → Tamil
const SIGN = { a: '', A: 'ா', i: 'ி', I: 'ீ', u: 'ு', U: 'ூ', e: 'ெ', E: 'ே', o: 'ொ', O: 'ோ', AI: 'ை', AU: 'ௌ' };
const INDEP = { a: 'அ', A: 'ஆ', i: 'இ', I: 'ஈ', u: 'உ', U: 'ஊ', e: 'எ', E: 'ஏ', o: 'ஒ', O: 'ஓ', AI: 'ஐ', AU: 'ஔ' };
const PULLI = '்';
const isV = (ch) => 'aeiou'.includes(ch);
const SINGLE = { k: 'க', g: 'க', j: 'ஜ', t: 'த', d: 'த', p: 'ப', b: 'ப', m: 'ம', r: 'ர', l: 'ல', v: 'வ', w: 'வ', f: 'ப', q: 'க', y: 'ய' };
const DOUBLE = { l: 'ள', r: 'ற', n: 'ன', t: 'ட', d: 'ட', s: 'ஸ' };

/** Latin word (lower case, a–z only) → units: { c: 'க' } consonant or { v: 'a' } vowel. */
function scan(w) {
  const u = [];
  const C = (c) => u.push({ c });
  const V = (v) => u.push({ v });
  let i = 0;
  const n = w.length;
  const at = (k) => w.slice(i, i + k);
  while (i < n) {
    const ch = w[i];
    // vowels
    if (isV(ch)) {
      if (ch === 'o' && w[i + 1] === 'w' && (i + 2 >= n || !isV(w[i + 2]))) { V('AU'); i += 2; continue; }
      const two = at(2);
      const map2 = { aa: 'A', ee: 'I', ii: 'I', oo: 'U', uu: 'U', ai: 'AI', au: 'AU', ei: 'E', ae: 'E' };
      if (two === 'ie' && i + 2 >= n) { V('i'); i += 2; continue; } // Annie, Jessie
      if (map2[two]) { V(map2[two]); i += 2; continue; }
      V(ch); i += 1; continue;
    }
    if (ch === 'y') {
      const prevC = u.length && u[u.length - 1].c;
      if (prevC && (i + 1 >= n || !isV(w[i + 1]))) { V('i'); i += 1; continue; } // Murthy, Reddy
      C('ய'); i += 1; continue;
    }
    if (at(3) === 'ksh') { C('ட'); C('ச'); i += 3; continue; }
    if (at(3) === 'tch') { C('ச'); C('ச'); i += 3; continue; }
    const two = at(2);
    if (two === 'sh') { C(i === 0 ? 'ச' : 'ஷ'); i += 2; continue; }
    if (two === 'zh') { C('ழ'); i += 2; continue; }
    if (two === 'th' || two === 'dh') {
      const prev = u[u.length - 1];
      if (prev?.c === 'ர') C('த'); // Karthik, Parthiban: த doubles after ர்
      C('த'); i += 2; continue;
    }
    if (two === 'ch') { C('ச'); i += 2; continue; }
    if (two === 'kh' || two === 'gh') { C('க'); i += 2; continue; }
    if (two === 'bh' || two === 'ph') { C('ப'); i += 2; continue; }
    if (two === 'jh') { C('ஜ'); i += 2; continue; }
    if (two === 'wh') { C('வ'); i += 2; continue; }
    if (two === 'ck') { C('க'); i += 2; continue; }
    if (two === 'qu') { C('க'); C('வ'); i += 2; continue; }
    if (two === 'ng' && i + 2 >= n) { C('ங'); i += 2; continue; }
    if (ch === 'x') { C('க'); C('ஸ'); i += 1; continue; }
    if (w[i + 1] === ch && ch !== 'h' && ch !== 'y') {
      if (i + 2 >= n && ch !== 'l') { C(ch === 's' ? 'ஸ' : ch === 'n' ? 'ன' : DOUBLE[ch] || SINGLE[ch] || 'க'); i += 2; continue; } // Dass → தாஸ், Ann → அன்
      const t = DOUBLE[ch] || SINGLE[ch] || (ch === 'c' || ch === 'k' || ch === 'g' ? 'க' : ch === 'z' ? 'ஜ' : null);
      if (t) { C(t); C(t); i += 2; continue; }
    }
    if (ch === 'c') { C(w[i + 1] && 'eiy'.includes(w[i + 1]) ? (i === 0 ? 'ச' : 'ஸ') : 'க'); i += 1; continue; }
    if (ch === 'z') { C(i + 1 >= n ? 'ஸ' : 'ஜ'); i += 1; continue; }
    if (ch === 'n' || ch === 's' || ch === 'h') { u.push({ c: ch, raw: true, i }); i += 1; continue; }
    if (ch === 't') { const p = u[u.length - 1]; C(p && p.c && p.c !== 'n' && !p.raw ? 'ட' : p && p.raw && p.c === 's' ? 'ட' : 'த'); i += 1; continue; } // Victor, Robert, Stalin: ட after a consonant
    if (SINGLE[ch]) { C(SINGLE[ch]); i += 1; continue; }
    i += 1; // anything else is dropped
  }
  return u;
}

function resolve(u) {
  // Contextual consonants: n, s, h.
  for (let k = 0; k < u.length; k++) {
    const x = u[k];
    if (!x.raw) continue;
    const prev = u[k - 1], next = u[k + 1];
    const nextC = next && next.c, prevC = prev && prev.c;
    if (x.c === 'n') {
      if (k === 0) x.c = 'ந';
      else if (nextC === 'த') x.c = 'ந';
      else if (nextC === 'க') x.c = 'ங';
      else if (nextC === 'ச' || nextC === 'ஜ') { x.c = 'ஞ'; next.c = 'ச'; }
      else if (nextC === 'ட') x.c = 'ண';
      else if (prevC === 'ஷ' || prevC === 'ர') x.c = 'ண'; // Krishnan, Karnan, Poornima
      else if (!next && prev?.v === 'u' && u[k - 2]?.c === 'ர') x.c = 'ண'; // Arun, Varun, Tharun
      else x.c = 'ன';
    } else if (x.c === 's') {
      x.c = next && next.v ? 'ச' : 'ஸ'; // before a vowel ச; before a consonant / at the end ஸ
    } else if (x.c === 'h') {
      if (k === 0) x.c = 'ஹ';
      else if (prev?.v && next?.v) x.c = 'க'; // Mahesh, Mohan, Rahul
      else if (prev?.v && nextC) x.c = 'ஹ'; // Rahman
      else x.c = null; // final h, or after a consonant: silent
    }
    delete x.raw;
  }
  return u.filter((x) => x.v || x.c);
}

function latinRules(w) {
  let u = resolve(scan(w));
  if (!u.length) return '';
  // Silent final e (Rose, Grace): V C e → V C, with a → ே.
  const L = u.length;
  if (w.length >= 4 && u[L - 1].v === 'e' && u[L - 2]?.c && u[L - 3]?.v && ['a', 'o', 'i', 'u'].includes(u[L - 3].v)) {
    if (u[L - 3].v === 'a') u[L - 3].v = 'E';
    u = u.slice(0, -1);
  }
  // ந்திர: Chandran, Rajendran, Indira.
  for (let k = 0; k + 2 < u.length; k++) if (u[k].c === 'ந' && u[k + 1].c === 'த' && u[k + 2].c === 'ர') u.splice(k + 2, 0, { v: 'i' });
  // Word-initial clusters: Pr → பிர, Kr(i) → கிரு; s-clusters keep ஸ் (Stephen, Smitha).
  if (u[0]?.c && u[1]?.c && u[0].c !== 'ஸ' && u[0].c !== u[1].c) {
    if (u[0].c === 'க' && u[1].c === 'ர' && u[2]?.v === 'i') u[2].v = 'u';
    u.splice(1, 0, { v: 'i' });
  }
  // Vowel lengths: final a is long (Meena, Priya); e / o are long unless two consonants (or ழ) follow.
  for (let k = 0; k < u.length; k++) {
    const x = u[k];
    if (!x.v) continue;
    if (x.v === 'a' && k === u.length - 1 && k > 0) x.v = 'A';
    if (x.v === 'e' || x.v === 'o') {
      let cons = 0, zh = false;
      for (let j = k + 1; j < u.length && u[j].c; j++) { cons += 1; if (u[j].c === 'ழ') zh = true; }
      if (cons < 2 && !zh) x.v = x.v.toUpperCase();
    }
  }
  // Two vowels side by side: a glide between (Mariappan → மரியப்பன், Samuel → சாமுவேல்).
  for (let k = 1; k < u.length; k++) {
    if (u[k].v && u[k - 1].v) u.splice(k, 0, { c: ['i', 'I', 'e', 'E', 'AI'].includes(u[k - 1].v) ? 'ய' : 'வ' });
  }
  let out = '';
  for (let k = 0; k < u.length; k++) {
    const x = u[k];
    if (x.c) { const nx = u[k + 1]; out += x.c + (nx && nx.v ? SIGN[nx.v] : PULLI); if (nx && nx.v) k += 1; } else out += INDEP[x.v];
  }
  return out;
}

/** Up to three dictionary names joined without a space ("Sureshkumar"), else null. */
function splitCompound(w, parts = 0) {
  if (DICT.has(w) && parts > 0) return DICT.get(w);
  if (parts >= 2) return null;
  for (let k = w.length - 3; k >= 3; k--) {
    const head = w.slice(0, k);
    if (!DICT.has(head)) continue;
    const rest = splitCompound(w.slice(k), parts + 1);
    if (rest) return DICT.get(head) + rest;
  }
  return null;
}

function latinWordToTamil(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return '';
  if (DICT.has(w)) return DICT.get(w);
  const sri = /^(shree|sree|shri|sri)(?=[a-z]{2,})/.exec(w);
  if (sri) { const rest = w.slice(sri[1].length); return `ஸ்ரீ${DICT.get(rest) || splitCompound(rest) || latinRules(rest)}`; }
  if (/^(shree|sree|shri|sri)$/.test(w)) return 'ஸ்ரீ';
  return splitCompound(w) || latinRules(w);
}

const isInitialLatin = (tok, raw) => /^[A-Za-z]\.$/.test(tok) || (/^[A-Za-z]$/.test(tok) && raw.length > 1);

/** English (Latin) → Tamil script. Tamil words pass through; the result never contains Latin letters. */
export function toTamil(s) {
  const toks = tokens(s);
  const out = [];
  for (const tok of toks) {
    if (TA_RE.test(tok) || !LATIN_RE.test(tok)) { out.push(tok.replace(/[A-Za-z]/g, '')); continue; }
    if (isInitialLatin(tok, toks)) { out.push(`${LETTER_TA[tok[0].toLowerCase()]}.`); continue; }
    // "RK" / "SR" in capitals (no vowels): a run of initials.
    if (/^[A-Z]{2,3}$/.test(tok) && !/[AEIOU]/.test(tok)) { out.push([...tok].map((c) => `${LETTER_TA[c.toLowerCase()]}.`).join('')); continue; }
    out.push(tok.split('-').map(latinWordToTamil).join('-'));
  }
  return out.filter((x) => x && x !== '.').join(' ').replace(/[A-Za-z]/g, '').replace(/\s+/g, ' ').trim();
}

// ---------------------------------------------------------------- Tamil → English
const TA_CONS = 'கஙசஞடணதநபமயரலவழளறனஜஷஸஹ';
const TA_SIGNS = { 'ா': 'A', 'ி': 'i', 'ீ': 'I', 'ு': 'u', 'ூ': 'U', 'ெ': 'e', 'ே': 'E', 'ை': 'AI', 'ொ': 'o', 'ோ': 'O', 'ௌ': 'AU' };
const TA_INDEP = { 'அ': 'a', 'ஆ': 'A', 'இ': 'i', 'ஈ': 'I', 'உ': 'u', 'ஊ': 'U', 'எ': 'e', 'ஏ': 'E', 'ஐ': 'AI', 'ஒ': 'o', 'ஓ': 'O', 'ஔ': 'AU' };
const ROM_V = { a: 'a', A: 'a', i: 'i', I: 'ee', u: 'u', U: 'oo', e: 'e', E: 'e', AI: 'ai', o: 'o', O: 'o', AU: 'ow' };

function taUnits(w) {
  const u = [];
  const ch = [...w];
  for (let k = 0; k < ch.length; k++) {
    const c = ch[k];
    if (TA_CONS.includes(c)) {
      const nx = ch[k + 1];
      if (nx === PULLI) { u.push({ c, v: null }); k += 1; } else if (TA_SIGNS[nx]) { u.push({ c, v: TA_SIGNS[nx] }); k += 1; } else u.push({ c, v: 'a' });
    } else if (TA_INDEP[c]) u.push({ c: null, v: TA_INDEP[c] });
    else if (c === 'ஃ') u.push({ c: 'ஃ', v: null });
  }
  return u;
}

function romCons(u, k) {
  const x = u[k];
  const prev = u[k - 1], next = u[k + 1];
  const prevPulli = prev && prev.c && prev.v === null ? prev.c : null;
  const afterVowel = prev && prev.v; // prev unit ends in a vowel
  const nextSame = x.v === null && next && next.c === x.c;
  switch (x.c) {
    case 'க':
      if (!prev) return 'k';
      if (prevPulli === 'ங') return 'g';
      if (prevPulli) return ['க', 'ட', 'ற', 'த', 'ப', 'ச'].includes(prevPulli) ? 'k' : 'g';
      if (x.v === 'A' && k === u.length - 1 && prev.v === 'i') return 'k'; // Radhika, Jothika
      return x.v === null ? 'k' : afterVowel ? 'g' : 'k';
    case 'ச':
      if (nextSame) return '';
      if (prevPulli === 'ச') return 'ch';
      if (prevPulli === 'ஞ') return 'j';
      if (prevPulli === 'ட') return 'sh';
      return 's';
    case 'ட':
      if (['ட', 'ஸ', 'க', 'ப'].includes(prevPulli)) return 't'; // பட்டு, ஸ்டாலின், விக்டர்
      if (x.v === null && next && next.c === 'ச') return 'k'; // ட்ச → ksh
      if (x.v === null && !next) return 't';
      return 'd';
    case 'த':
      if (nextSame) return '';
      if (prevPulli === 'ந' && next && next.c === 'ர' && x.v === 'i') { x.v = ''; return 'd'; } // ந்திர → ndr
      return 'th';
    case 'ப': return prevPulli === 'ம' ? 'b' : !prevPulli && afterVowel && x.v !== null ? 'b' : 'p'; // Sabari, Kabilan, Prabu
    case 'ற': return nextSame ? '' : prevPulli === 'ற' ? 'tr' : 'r';
    case 'ஞ': return prev ? 'n' : 'gn';
    case 'ங': case 'ண': case 'ந': case 'ன': return 'n';
    case 'ம': return 'm';
    case 'ய': return 'y';
    case 'ர': return 'r';
    case 'ல': case 'ள': return 'l';
    case 'வ': return ['ஸ', 'ஷ', 'த', 'க'].includes(prevPulli) ? 'w' : 'v'; // Swathi, Ashwin
    case 'ழ': return 'zh';
    case 'ஜ': return 'j';
    case 'ஷ': return 'sh';
    case 'ஸ': return 's';
    case 'ஹ': return 'h';
    case 'ஃ': return next && next.c === 'ப' ? '' : '';
    default: return '';
  }
}

function tamilRules(w) {
  if (w.startsWith('ஸ்ரீ')) { const rest = w.slice('ஸ்ரீ'.length); return `Sri${rest ? (REV.get(rest)?.toLowerCase() || tamilRules(rest).toLowerCase()) : ''}`; }
  const u = taUnits(w);
  if (!u.length) return '';
  // Word-initial cluster: பிரகாஷ் → Prakash, பிரியா → Priya, கிருஷ்ணன் → Krishnan.
  let dropFirstI = false;
  if (u[0].c && u[0].v === 'i' && u[1]?.c === 'ர' && 'பகதட'.includes(u[0].c)) {
    if (['a', 'A', 'E', 'O', 'o', 'I'].includes(u[1].v) || (u[1].v === 'i' && u[2]?.c === 'ய')) dropFirstI = true;
    if (u[0].c === 'க' && u[1].v === 'u' && u[2]?.c === 'ஷ') { dropFirstI = true; u[1].v = 'i'; }
  }
  let out = '';
  for (let k = 0; k < u.length; k++) {
    const x = u[k];
    if (x.c === 'ஃ') { if (u[k + 1]?.c === 'ப') { out += 'f'; k += 1; out += u[k].v ? ROM_V[u[k].v] : ''; } continue; }
    if (x.c) out += romCons(u, k);
    if (x.v && !(k === 0 && dropFirstI)) {
      // a final ீ reads better as "i" only in ஸ்ரீ (handled above); keep "ee" elsewhere
      out += ROM_V[x.v] ?? '';
    }
  }
  return out;
}

function splitTamilCompound(w, parts = 0) {
  if (REV.has(w) && parts > 0) return REV.get(w).toLowerCase();
  if (parts >= 2) return null;
  const ch = [...w];
  for (let k = ch.length - 2; k >= 2; k--) {
    const head = ch.slice(0, k).join('');
    if (!REV.has(head)) continue;
    const rest = splitTamilCompound(ch.slice(k).join(''), parts + 1);
    if (rest) return REV.get(head) + rest;
  }
  return null;
}

const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

function tamilWordToLatin(word) {
  const w = word.normalize('NFC').replace(/[^஀-௿]/g, '');
  if (!w) return '';
  if (REV.has(w)) return REV.get(w);
  return cap(splitTamilCompound(w) || tamilRules(w));
}

/** Tamil script → English (Latin) with conventional name spellings. Latin words pass through. */
export function toLatin(s) {
  const toks = tokens(s);
  const out = [];
  for (const tok of toks) {
    if (!TA_RE.test(tok)) { if (tok !== '.') out.push(tok); continue; }
    const bare = tok.replace(/\.$/, '');
    if (tok.endsWith('.') && TA_LETTER.has(bare)) { out.push(`${TA_LETTER.get(bare)}.`); continue; }
    if (tok.endsWith('.') && [...bare].length <= 2) { out.push(`${(tamilWordToLatin(bare)[0] || '').toUpperCase()}.`); continue; }
    out.push(tok.split('-').map(tamilWordToLatin).join('-'));
  }
  return out.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

// ---------------------------------------------------------------- profiles
const NAME_DISPLAY = ['ta', 'en', 'auto'];
export const isNameDisplay = (v) => NAME_DISPLAY.includes(v);

/**
 * Fill a family profile's other-script name (pure; returns the same object when nothing changes).
 *   name         — English / Latin spelling (always kept, used for data and search)
 *   nameTa       — Tamil spelling
 *   nameScript   — 'en' | 'ta': which one the person typed in the main Name box
 *   nameTaEdited / nameEnEdited — the person corrected the generated spelling: never overwrite it
 *   nameAutoFrom — the typed name the generated spelling was made from (regenerate when it changes)
 * Older profiles: a Tamil name typed into `name` moves to `nameTa`; a hand-typed `nameTa` is kept as edited.
 */
export function withNameForms(m) {
  if (!m || typeof m !== 'object') return m;
  const name = String(m.name ?? '').trim();
  const script = detectScript(name);
  if (!name && !m.nameTa) return m;
  if (script === 'ta' || (script === 'mixed' && (name.match(/[஀-௿]/g) || []).length > (name.match(/[A-Za-z]/g) || []).length)) {
    // Tamil typed into the main name (older versions, the written-chart form).
    return { ...m, nameTa: name, name: toLatin(name) || name, nameScript: 'ta', nameAutoFrom: name, nameTaEdited: false, nameEnEdited: false };
  }
  if (!name) return { ...m, name: toLatin(m.nameTa), nameScript: 'ta', nameAutoFrom: m.nameTa };
  if (m.nameScript === 'ta') {
    if (m.nameTa && !m.nameEnEdited && m.nameAutoFrom !== m.nameTa) return { ...m, name: toLatin(m.nameTa) || name, nameAutoFrom: m.nameTa };
    return m;
  }
  if (!m.nameTa) return { ...m, nameTa: toTamil(name), nameScript: 'en', nameAutoFrom: name, nameTaEdited: false };
  if (m.nameAutoFrom === undefined) {
    const edited = typeof m.nameTaEdited === 'boolean' ? m.nameTaEdited : m.nameTa !== toTamil(name);
    return { ...m, nameScript: 'en', nameAutoFrom: name, nameTaEdited: edited };
  }
  if (!m.nameTaEdited && m.nameAutoFrom !== name) return { ...m, nameTa: toTamil(name), nameScript: 'en', nameAutoFrom: name };
  return m;
}

const cacheTa = new Map(), cacheEn = new Map();
const memo = (cache, fn, s) => { if (!cache.has(s)) { if (cache.size > 500) cache.clear(); cache.set(s, fn(s)); } return cache.get(s); };

/**
 * A person's name in one script: want 'ta' | 'en'. Falls back to transliterating whichever spelling exists,
 * so a profile without `nameTa` (or a Tamil-only one) still shows in the chosen script.
 */
export function nameInScript(m, want) {
  if (!m) return '';
  const name = String(m.name ?? '').trim();
  const nameTa = String(m.nameTa ?? '').trim();
  if (want === 'ta') {
    if (nameTa) return nameTa;
    if (!name) return '';
    return detectScript(name) === 'ta' ? name : memo(cacheTa, toTamil, name) || name;
  }
  if (name && detectScript(name) !== 'ta') return name;
  const src = name || nameTa;
  return src ? memo(cacheEn, toLatin, src) || src : '';
}

/** Which script to show: the person's choice ('ta' | 'en'), else the app language ('auto'). */
export const nameScriptFor = (m, appLang) => (m && (m.nameDisplay === 'ta' || m.nameDisplay === 'en') ? m.nameDisplay : appLang === 'ta' ? 'ta' : 'en');
