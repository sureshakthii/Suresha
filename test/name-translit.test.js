// Personal-name transliteration English ⇄ Tamil (shared/name-translit.js), used by the family form and displayName().
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toTamil, toLatin, detectScript, withNameForms, nameInScript, nameScriptFor, NAME_DICT_SIZE } from '../shared/name-translit.js';
import { shareableProfile, backupPayload } from '../shared/sync-policy.js';

const EXPECT = {
  Suresh: 'சுரேஷ்', Babu: 'பாபு', 'Suresh Babu': 'சுரேஷ் பாபு', Meena: 'மீனா', Kavin: 'கவின்', Lakshmi: 'லட்சுமி',
  Karthik: 'கார்த்திக்', Priya: 'பிரியா', Ramesh: 'ரமேஷ்', Senthil: 'செந்தில்', Murugan: 'முருகன்', Valli: 'வள்ளி',
  Anand: 'ஆனந்த்', Arun: 'அருண்', Divya: 'திவ்யா', Shanthi: 'சாந்தி', Krishnan: 'கிருஷ்ணன்', Raman: 'ராமன்',
  Saravanan: 'சரவணன்', Thenmozhi: 'தேன்மொழி', Ezhil: 'எழில்', Selvi: 'செல்வி', Gowri: 'கௌரி', Venkatesh: 'வெங்கடேஷ்',
  Jayakumar: 'ஜெயக்குமார்', Mohammed: 'முகமது', John: 'ஜான்', Mary: 'மேரி', Joseph: 'ஜோசப்', Fatima: 'பாத்திமா',
};

test('common names come out in their natural Tamil spelling', () => {
  for (const [en, tamil] of Object.entries(EXPECT)) assert.equal(toTamil(en), tamil, en);
  assert.equal(toTamil('suresh BABU'), 'சுரேஷ் பாபு', 'case does not matter');
  assert.equal(toTamil('Laxmi'), toTamil('Lakshmi'), 'one spelling for Lakshmi');
  assert.equal(toTamil('Mahalakshmi'), 'மகாலட்சுமி');
  assert.ok(NAME_DICT_SIZE >= 300, `curated names: ${NAME_DICT_SIZE}`);
});

test('rules handle names outside the dictionary (zh, th, ll, pulli, clusters, compounds)', () => {
  assert.equal(toTamil('Kavinesh'), 'கவினேஷ்');
  assert.equal(toTamil('Nilavan'), 'நிலவன்');
  assert.equal(toTamil('Mithran'), 'மித்ரன்');
  assert.equal(toTamil('Thamizhini'), 'தமிழினி');
  assert.equal(toTamil('Sureshkumar'), 'சுரேஷ்குமார்', 'two dictionary names joined');
  assert.equal(toTamil('Arunkumar'), 'அருண்குமார்');
  assert.equal(toTamil('Pradeepa'), 'பிரதீபா', 'Pr → பிர');
  assert.equal(toTamil('Krishnaveni'), 'கிருஷ்ணவேணி', 'Kr → கிரு');
  assert.equal(toTamil('Sneha'), 'சினேகா');
  assert.equal(toTamil('Sridevi'), 'ஸ்ரீதேவி');
  assert.equal(toTamil('Pallavan'), 'பள்ளவன்', 'll → ள்ள');
  assert.equal(toTamil('Kalaiyarasan'), 'கலையரசன்', 'ai → ை');
  assert.equal(toTamil('Vel'), 'வேல்');
});

test('initials use the letter names: R. Suresh → ஆர். சுரேஷ்', () => {
  assert.equal(toTamil('R. Suresh'), 'ஆர். சுரேஷ்');
  assert.equal(toTamil('R.Suresh'), 'ஆர். சுரேஷ்');
  assert.equal(toTamil('R Suresh'), 'ஆர். சுரேஷ்');
  assert.equal(toTamil('S.R. Kumar'), 'எஸ். ஆர். குமார்');
  assert.equal(toTamil('Suresh K'), 'சுரேஷ் கே.');
  assert.equal(toLatin('ஆர். சுரேஷ்'), 'R. Suresh');
  assert.equal(toLatin('எஸ். ஆர். குமார்'), 'S. R. Kumar');
  assert.equal(toLatin('ர. சுரேஷ்'), 'R. Suresh', 'a Tamil single-letter initial');
});

test('mixed spacing, empty input and other characters', () => {
  assert.equal(toTamil('  Meena    Kumari  '), 'மீனா குமாரி');
  assert.equal(toTamil(''), '');
  assert.equal(toTamil(null), '');
  assert.equal(toTamil(undefined), '');
  assert.equal(toTamil('   '), '');
  assert.equal(toLatin(''), '');
  assert.equal(toTamil('முருகன்'), 'முருகன்', 'Tamil passes through');
  assert.equal(toLatin('Murugan'), 'Murugan', 'English passes through');
  assert.equal(toTamil('Suresh முருகன்'), 'சுரேஷ் முருகன்');
});

test('Tamil output never contains Latin letters', () => {
  const samples = [...Object.keys(EXPECT), 'Xavier Q', 'Wxyz', 'Zubair', 'Chris Hemsworth', 'J. K. Rowling', 'Ng', 'A', 'Bob-Marley', 'qqq', 'O\'Brien', 'Mc Donald', 'Ünal', 'Ravi2'];
  for (const s of samples) assert.doesNotMatch(toTamil(s), /[A-Za-z]/, s);
});

test('Tamil names show in conventional English spellings (round trips)', () => {
  const ROUND = ['Suresh', 'Murugan', 'Meena', 'Priya', 'Karthik', 'Senthil', 'Lakshmi', 'Krishnan', 'Saravanan', 'Thenmozhi',
    'Ezhil', 'Selvi', 'Gowri', 'Venkatesh', 'Divya', 'Shanthi', 'Anand', 'Arun', 'Kavin', 'Valli', 'Raman', 'Jayakumar'];
  for (const n of ROUND) assert.equal(toLatin(toTamil(n)), n, n);
  assert.equal(toLatin('சுரேஷ்'), 'Suresh');
  assert.equal(toLatin('முருகன்'), 'Murugan');
  assert.equal(toLatin('சுரேஷ் பாபு'), 'Suresh Babu');
  // rules (outside the dictionary)
  assert.equal(toLatin('கவினேஷ்'), 'Kavinesh');
  assert.equal(toLatin('நிலவன்'), 'Nilavan');
  assert.equal(toLatin('பிரகாஷ்ராஜ்'), 'Prakashraj');
  assert.equal(toLatin('தமிழினி'), 'Thamizhini');
  assert.equal(toLatin('சபரி'), 'Sabari');
  assert.equal(toLatin('கௌரி'.normalize('NFD')), 'Gowri', 'decomposed vowel signs');
});

test('script detection', () => {
  assert.equal(detectScript('Suresh'), 'en');
  assert.equal(detectScript('சுரேஷ்'), 'ta');
  assert.equal(detectScript('Suresh சுரேஷ்'), 'mixed');
  assert.equal(detectScript(''), '');
  assert.equal(detectScript('123 .'), '');
});

test('profiles: both spellings are kept; a corrected Tamil spelling is never overwritten', () => {
  const a = withNameForms({ id: 'a', name: 'Suresh Babu' });
  assert.equal(a.nameTa, 'சுரேஷ் பாபு');
  assert.equal(a.nameScript, 'en');
  // English name edited → the generated Tamil follows
  const b = withNameForms({ ...a, name: 'Suresh Kumar' });
  assert.equal(b.nameTa, 'சுரேஷ் குமார்');
  // a corrected Tamil spelling stays when the English name changes
  const c = withNameForms({ ...a, nameTa: 'சுரேசு பாபு', nameTaEdited: true });
  assert.equal(withNameForms({ ...c, name: 'Suresh B' }).nameTa, 'சுரேசு பாபு');
  // a Tamil name typed into the main field: English generated, Tamil kept
  const d = withNameForms({ id: 'd', name: 'முருகன்' });
  assert.equal(d.name, 'Murugan');
  assert.equal(d.nameTa, 'முருகன்');
  assert.equal(d.nameScript, 'ta');
  // older profile with a hand-typed Tamil name: kept and marked as the person's own spelling
  const e = withNameForms({ id: 'e', name: 'Suresh', nameTa: 'சுரேசு' });
  assert.equal(e.nameTa, 'சுரேசு');
  assert.equal(e.nameTaEdited, true);
  assert.equal(withNameForms({ ...e, name: 'Suresh B' }).nameTa, 'சுரேசு');
  // unchanged profiles come back as the same object
  assert.equal(withNameForms(a), a);
  assert.equal(withNameForms(null), null);
});

test('display choice: Tamil / English / follow the app language', () => {
  const m = withNameForms({ name: 'Suresh Babu' });
  assert.equal(nameInScript(m, nameScriptFor({ ...m, nameDisplay: 'ta' }, 'en')), 'சுரேஷ் பாபு');
  assert.equal(nameInScript(m, nameScriptFor({ ...m, nameDisplay: 'en' }, 'ta')), 'Suresh Babu');
  assert.equal(nameInScript(m, nameScriptFor({ ...m, nameDisplay: 'auto' }, 'ta')), 'சுரேஷ் பாபு');
  assert.equal(nameInScript(m, nameScriptFor(m, 'en')), 'Suresh Babu');
  // fallbacks for profiles saved before both spellings existed
  assert.equal(nameInScript({ name: 'Meena' }, 'ta'), 'மீனா');
  assert.equal(nameInScript({ name: 'முருகன்' }, 'en'), 'Murugan');
  assert.equal(nameInScript({ name: 'முருகன்' }, 'ta'), 'முருகன்');
  assert.equal(nameInScript(null, 'ta'), '');
});

test('family sharing and account backup carry both spellings and the display choice', () => {
  const m = { ...withNameForms({ id: 'm1', name: 'Meena', date: '1990-01-01', time: '06:00:00', lat: 13, lon: 80, tz: 5.5 }), nameDisplay: 'ta' };
  const s = shareableProfile(m);
  assert.equal(s.nameTa, 'மீனா');
  assert.equal(s.nameDisplay, 'ta');
  assert.equal(shareableProfile({ ...m, nameDisplay: 'xx' }).nameDisplay, undefined, 'only ta / en / auto');
  const b = backupPayload({ family: [m] }, { backup: true });
  assert.equal(b.family[0].nameTa, 'மீனா');
  assert.equal(b.family[0].nameDisplay, 'ta');
});
