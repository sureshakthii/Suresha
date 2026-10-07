// Hymns & Stotras: every hymn the app names resolves to a HYMNS entry; complete texts carry their public-domain
// source and are clean Tamil script; pending ones carry no text and show a "full text coming" note; the screens
// that name hymns render the names as links to the reader; the long texts stay out of the offline precache.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { HYMNS, hymnById, hymnReady, loadHymn, HYMN_NAMES, findHymnNames, hymnIdsIn, withHymnLinks, speakable, RETRIEVED } from '../shared/hymns.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

// How the review found the app naming hymns (any spelling or Tamil case ending the texts use).
const NAMED = {
  'kanda-sashti-kavasam': [/Kanda Sashti Kavasam/g, /கந்த சஷ்டி கவச/g],
  'vishnu-sahasranamam': [/Vishnu Sahasranamam/g, /விஷ்ணு சகஸ்ரநாம/g],
  'hanuman-chalisa': [/Hanuman Chalisa/g, /(?:அனுமன்|ஹனுமான்) சால/g],
  'aditya-hrudayam': [/Aditya H\w*dayam/g, /ஆதித்ய ஹ\S*ருதய/g],
  'vinayagar-agaval': [/Vinayagar Agaval/g, /விநாயகர் அகவல்/g],
  'rina-vimochana-angaraka-stotram': [/Angaraka Stotram/gi, /அங்காரக ஸ்தோத்திரம்/g],
  'durga-saptashloki': [/Durga stotram/gi, /துர்க்கை துதி/g],
  'katyayani-mantra': [/Katyayani mantra/gi, /காத்யாயனி மந்திர/g],
  'santhana-gopala-mantra': [/Santhana Gopala/gi, /சந்தான கோபால/g],
  'abhirami-anthadhi': [/Abhirami Anth/g, /அபிராமி அந்தாதி/g],
};
// App text that names hymns: remedies, daily / today plan, KB (festivals, monthly, concepts …), predictions,
// peyarchi, Ask Thunai and the screens. Story text (Ithihasa episodes) and baby-name meanings are not remedies.
function appFiles() {
  const out = [];
  const walk = (dir) => {
    for (const f of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      const rel = `${dir}/${f.name}`;
      if (f.isDirectory()) { if (!['shared/ithihasa', 'shared/hymns'].includes(rel)) walk(rel); continue; }
      if (!f.name.endsWith('.js') || /baby-names|hymns\.js$|screens-hymns|hymn-links|tool-registry|sw\.js/.test(f.name)) continue;
      out.push(rel);
    }
  };
  walk('shared'); walk('public');
  return out;
}

test('every hymn the app names resolves to a HYMNS entry (and every listed hymn is named somewhere)', () => {
  const seen = new Set();
  const unresolved = [];
  for (const f of appFiles()) {
    const s = read(f);
    const links = findHymnNames(s);
    for (const [id, pats] of Object.entries(NAMED)) {
      for (const re of pats) {
        for (const m of s.matchAll(re)) {
          seen.add(id);
          const hit = links.find((l) => l.start <= m.index && m.index < l.end);
          if (!hit || hit.id !== id) unresolved.push(`${f}: "${s.slice(m.index, m.index + 40)}" → ${hit?.id || 'no link'}`);
        }
      }
    }
  }
  assert.deepEqual(unresolved, [], 'hymn names that would not link to the reader');
  for (const id of Object.keys(NAMED)) {
    assert.ok(hymnById(id), `${id} missing from HYMNS`);
    assert.ok(seen.has(id), `${id}: not named anywhere in the app (drop it or check the search)`);
    assert.ok(HYMN_NAMES[id], `${id}: no name mapping`);
  }
  for (const id of Object.keys(HYMN_NAMES)) assert.ok(hymnById(id), `HYMN_NAMES ${id} has no HYMNS entry`);
  // Data that carries a hymn id (remedies, day deity, today's plan) points at real entries.
  for (const f of ['shared/remedies.js', 'shared/daily.js', 'shared/today-plan.js']) {
    const ids = [...read(f).matchAll(/hymn: '([a-z-]+)'/g)].map((m) => m[1]);
    assert.ok(ids.length, `${f}: expected hymn ids`);
    for (const id of ids) assert.ok(hymnById(id), `${f}: unknown hymn id ${id}`);
  }
});

test('the name finder: English and Tamil forms, case endings, and nothing that is not a hymn', () => {
  assert.deepEqual(hymnIdsIn('Recite Kanda Sashti Kavasam on Tuesday; chant Aditya Hridayam or Aditya Hrudayam.'), ['kanda-sashti-kavasam', 'aditya-hrudayam']);
  assert.deepEqual(hymnIdsIn('ஞாயிறு ஆதித்ய ஹிருதயத்தை பாராயணம்; விஷ்ணு சகஸ்ரநாமத்துடன் அனுமன் சாலீசா'), ['aditya-hrudayam', 'vishnu-sahasranamam', 'hanuman-chalisa']);
  assert.deepEqual(hymnIdsIn('Read Lalitha Sahasranamam or Abhirami Anthathi.'), ['abhirami-anthadhi']);
  assert.deepEqual(hymnIdsIn('தலைக்கவசம் அணியுங்கள்; Durga Saptashati or Durga mantra'), [], 'helmet / the 700-verse Saptashati are not linked');
  assert.deepEqual(hymnIdsIn('chant Durga stotram · துர்க்கை துதி பாடி'), ['durga-saptashloki']);
  const html = withHymnLinks('A <b> & Vinayagar Agaval', (x) => x.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'), (id, t) => `[${id}:${t}]`);
  assert.equal(html, 'A &lt;b&gt; &amp; [vinayagar-agaval:Vinayagar Agaval]');
});

test('complete hymns: public-domain source with URL, sections and clean Tamil-script lines', async () => {
  const complete = HYMNS.filter(hymnReady);
  assert.ok(complete.length >= 6, 'expected the fetched texts to be complete');
  for (const meta of HYMNS) {
    for (const k of ['title', 'author', 'deity', 'intro', 'when']) assert.ok(meta[k]?.en && meta[k]?.ta && /[஀-௿]/.test(meta[k].ta), `${meta.id}: ${k} needs English and Tamil`);
    assert.ok(['tamil', 'sanskrit', 'awadhi'].includes(meta.language) && meta.script === 'tamil', `${meta.id}: language/script`);
    assert.ok(meta.minutes > 0, `${meta.id}: minutes`);
    assert.ok(/^https:\/\//.test(meta.source?.url || ''), `${meta.id}: source URL`);
  }
  for (const meta of complete) {
    const h = await loadHymn(meta.id);
    assert.equal(h.source.retrieved, RETRIEVED, `${meta.id}: retrieval date`);
    assert.ok(h.source.name.length > 10, `${meta.id}: source edition name`);
    assert.ok(h.sections.length >= 1, `${meta.id}: sections`);
    let n = 0;
    for (const s of h.sections) {
      assert.ok(s.title?.en && /[஀-௿]/.test(s.title?.ta || ''), `${meta.id}: section title`);
      assert.ok(s.lines.length, `${meta.id}: empty section ${s.title.en}`);
      for (const l of s.lines) {
        n++;
        assert.match(l, /[஀-௿]/, `${meta.id}: no Tamil script in "${l}"`);
        assert.doesNotMatch(l, /[A-Za-z]/, `${meta.id}: Latin letters in "${l}"`);
        assert.doesNotMatch(l, /[ऀ-ॣ०-ॿ]/, `${meta.id}: Devanagari left in "${l}"`);
        assert.doesNotMatch(l, /[​-‍﻿]/, `${meta.id}: zero-width character in "${l}"`);
        assert.equal(l, l.normalize('NFC'), `${meta.id}: not NFC`);
        assert.equal(l, l.trim(), `${meta.id}: untrimmed line`);
      }
    }
    assert.equal(n, meta.lineCount, `${meta.id}: line count`);
    if (meta.transliterated) assert.notEqual(meta.language, 'tamil');
  }
});

test('long hymns are split for reading, verse numbers kept as in the source', async () => {
  const vs = await loadHymn('vishnu-sahasranamam');
  const titles = vs.sections.map((s) => s.title.en).join(' | ');
  for (const t of ['Dhyanam', 'Purva', 'thousand names', 'Phalashruti']) assert.ok(titles.includes(t), `Vishnu Sahasranamam: ${t} section`);
  const all = vs.sections.flatMap((s) => s.lines).join('\n');
  for (const v of [1, 13, 14, 120, 121, 142]) assert.ok(all.includes(`॥ ${v}॥`) || all.includes(`॥${v}॥`), `verse ${v}`);
  assert.ok(vs.sections.find((s) => /thousand/.test(s.title.en)).lines[0].startsWith('ஓம் விஶ்வம் விஷ்ணுர்வஷட்காரோ'));
  const ah = await loadHymn('aditya-hrudayam');
  assert.ok(ah.sections.flatMap((s) => s.lines).at(-1).endsWith('॥ 31॥'));
  assert.ok(ah.sections[0].lines[0].startsWith('ததோ யுத்³த⁴பரிஶ்ராந்தம்'));
  const hc = await loadHymn('hanuman-chalisa');
  assert.deepEqual(hc.sections.map((s) => s.lines.length), [8, 80, 4], 'two dohas around the forty chaupais');
  const ds = await loadHymn('durga-saptashloki');
  assert.ok(ds.sections.at(-1).lines.some((l) => l.endsWith('॥ 7॥')));
  // Read-aloud text: no superscripts or verse numbers.
  assert.equal(speakable('ப⁴க³வான் நம: ॥ 12॥'), 'பகவான் நமஹ .');
});

test('pending hymns carry no text, say why, and the reader shows the "full text coming" note', async () => {
  const pending = HYMNS.filter((h) => !hymnReady(h));
  for (const h of pending) {
    assert.equal(h.status, 'pending');
    assert.equal(h.text, null, `${h.id}: pending text must be null`);
    assert.equal(h.lineCount, 0);
    assert.ok(h.pendingWhy?.en && h.pendingWhy?.ta, `${h.id}: why pending`);
    assert.ok(!fs.existsSync(path.join(root, 'shared/hymns', `${h.id}.js`)), `${h.id}: has a text file but is pending`);
    assert.deepEqual((await loadHymn(h.id)).sections, []);
  }
  for (const h of HYMNS.filter(hymnReady)) assert.ok(fs.existsSync(path.join(root, 'shared/hymns', `${h.id}.js`)), `${h.id}: text file`);
  const scr = read('public/screens-hymns.js');
  const branch = scr.slice(scr.indexOf('if (!ready)'), scr.indexOf('const lines = h.sections'));
  assert.match(branch, /Full text coming/);
  assert.match(branch, /முழுப் பாடல் விரைவில்/);
  assert.match(branch, /pendingWhy/);
  assert.match(branch, /Planned source/);
});

test('screens that name hymns render the names as links to the reader', () => {
  const screens = ['screens-tools.js', 'screens-main.js', 'screens-world.js', 'screens-life.js', 'screens-peyarchi.js', 'screens-roadmap.js', 'screens-festivals.js', 'screens-journey.js'];
  for (const f of screens) {
    const s = read(`public/${f}`);
    assert.match(s, /from '\.\/hymn-links\.js'/, `${f}: imports hymn-links`);
    assert.match(s, /hymnText\(/, `${f}: renders hymn names as links`);
  }
  const tools = read('public/screens-tools.js');
  const parigaram = tools.slice(tools.indexOf('function renderParigaram'), tools.indexOf('function sthalamPicks'));
  assert.match(parigaram, /hymnText\(bi\(n\.free\)\)/, 'parigaram card free remedy');
  assert.match(parigaram, /hymnText\(bi\(n\.mantra\)\)/, 'parigaram card mantra line');
  const answers = tools.slice(tools.indexOf('function renderAnswerHtml'), tools.indexOf('function renderChat'));
  assert.match(answers, /hymnText\(l\)/, 'Ask Thunai answers');
  assert.match(read('public/screens-main.js'), /hymnText\(bi\(r\.deity\.act\)\)/, 'God of the day');
  assert.match(read('public/screens-festivals.js'), /<li>\$\{hymnText\(l\)\}<\/li>/, 'festival how-to lists');
  const links = read('public/hymn-links.js');
  assert.match(links, /data-go="hymn" data-param="\$\{param\(id\)\}"/);
  assert.match(links, /withHymnLinks\(text, esc, hymnLink\)/, 'text is escaped around the links');
});

test('hymns are in the tool registry, routed, iconed and precached (texts are not)', async () => {
  const { TOOLS, ROUTES } = await import(pathToFileURL(path.join(root, 'public/tool-registry.js')).href);
  const t = TOOLS.find((x) => x.id === 'hymns');
  assert.equal(t?.group, 'worship');
  assert.match(t.ta, /தோத்திரங்கள் & பாடல்கள்/);
  assert.equal(ROUTES.hymn, 'hymns');
  const scr = read('public/screens-hymns.js');
  assert.match(scr, /registerScreen\('hymns'/);
  assert.match(scr, /registerScreen\('hymn'/);
  assert.match(read('public/app.js'), /import '\.\/screens-hymns\.js'/);
  assert.match(read('public/icons.js'), /hymns: "scroll-text"/);
  const sw = read('public/sw.js');
  for (const f of ['/screens-hymns.js', '/shared/hymns.js', '/read-aloud.js', '/hymn-links.js']) assert.ok(sw.includes(`'${f}'`), `precache ${f}`);
  assert.ok(!/'\/shared\/hymns\/[^']+'/.test(sw), 'hymn texts must not be precached');
  // One read-aloud player, shared with Daily Ithihasa.
  assert.match(read('public/screens-ithihasa.js'), /createPlayer\(/);
  assert.match(scr, /createPlayer\(/);
});
