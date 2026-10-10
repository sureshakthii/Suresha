// Today's Good Day card on Home (shared/good-day.js): a good-morning message with today's special day or a good
// thought, the panchangam essentials and the 12 rasis — shared as an image (WhatsApp / Facebook / Instagram through
// the phone's share sheet), as WhatsApp text, or copied. Every card carries the Thunai download QR code.
import { state, L, esc, bi, toast, activeMember, displayName, nakName, fmtTimeRange } from './core.js';
import { goodDay, goodDayText, DOWNLOAD_URL } from './shared/good-day.js';
import { nallaNeramWindows } from './shared/tamilcal.js';
import { festivalInfo } from './shared/daily-brief.js';

const lg = () => (state.lang === 'en' ? 'en' : 'ta');

function todayGood(td, snap) {
  const m = activeMember();
  const fest = (td.festivals || []).find((f) => f.id !== 'month-start') || null;
  const fi = fest ? festivalInfo(fest) : null;
  const win = nallaNeramWindows(td, new Date())[0] || nallaNeramWindows(td)[0];
  return goodDay({
    iso: td.date, td,
    festival: fi ? { name: fi.name, line: fi.line } : null,
    star: { en: nakName(snap.nakshatra.index), ta: nakName(snap.nakshatra.index) },
    goodTime: win ? fmtTimeRange(win.start, win.end, state.loc.tz) : '',
    rahu: td.rahuKalam ? fmtTimeRange(td.rahuKalam.start, td.rahuKalam.end, state.loc.tz) : '',
    sender: m && m.relation === 'self' ? displayName(m) : '',
    link: DOWNLOAD_URL,
  });
}

/** The Home card. */
export function goodDayCardHtml(td, snap) {
  if (!td || !snap) return '';
  const g = todayGood(td, snap);
  return `<section class="card glass gd-card" aria-labelledby="gdTitle">
    <div class="card-title"><span id="gdTitle">🌅 ${L('Today’s good wishes — share', 'இன்றைய நல்வாழ்த்து — பகிருங்கள்')}</span></div>
    <p class="gd-head"><b>${esc(bi(g.headline))}</b></p>
    <p class="small">${esc(bi(g.message))}</p>
    <p class="small muted">${L('A good-morning message with the 12 rasi palan and the Thunai QR code — kind words for your family and friends.', '12 ராசி பலனும் துணை QR குறியீடும் உள்ள காலை வணக்கச் செய்தி — உங்கள் குடும்பம், நண்பர்களுக்கு நல்ல வார்த்தைகள்.')}</p>
    <div class="btn-row"><button type="button" class="btn-gold" data-gd="image">🖼️ ${L('Share card', 'அட்டையைப் பகிர்')}</button>
      <button type="button" class="chip-btn" data-gd="wa">💬 WhatsApp</button><button type="button" class="chip-btn" data-gd="copy">📋 ${L('Copy text', 'நகலெடு')}</button></div>
  </section>`;
}

/** Wire the card's buttons (call after Home renders). */
export function bindGoodDayCard(root, td, snap) {
  const card = root.querySelector('.gd-card');
  if (!card) return;
  card.addEventListener('click', async (e) => {
    const act = e.target.closest('[data-gd]')?.dataset.gd;
    if (!act) return;
    const g = todayGood(td, snap);
    const text = goodDayText(g, lg());
    if (act === 'wa') { window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener'); return; }
    if (act === 'copy') {
      try { await navigator.clipboard.writeText(text); toast(L('Copied — paste it in WhatsApp, Facebook or Instagram', 'நகலெடுக்கப்பட்டது — WhatsApp, Facebook, Instagram-இல் ஒட்டுங்கள்')); } catch { toast(L('Could not copy on this phone', 'இந்தக் கைப்பேசியில் நகலெடுக்க இயலவில்லை')); }
      return;
    }
    const t = (x) => (x ? (lg() === 'en' ? x.en : x.ta) : '');
    const spec = {
      kind: 'goodday', lang: lg(),
      kicker: `${t(g.greeting)}  ·  ${t(g.weekday)}, ${t(g.tamilDate)}`,
      title: t(g.headline),
      quote: t(g.message),
      lines: [t(g.act), [g.star ? `${L('Star', 'நட்சத்திரம்')}: ${t(g.star)}` : '', g.goodTime ? `${L('Good time', 'நல்ல நேரம்')}: ${g.goodTime}` : '', g.rahu ? `${L('Rahu Kalam', 'ராகு காலம்')}: ${g.rahu}` : ''].filter(Boolean).join('  ·  ')].filter(Boolean),
      grid: g.rasi.map((r) => ({ label: t(r.name), value: t(r.short), stars: '★'.repeat(r.stars) })),
      closing: g.sender ? L(`With love, ${g.sender}`, `அன்புடன், ${g.sender}`) : '',
      qr: g.qr,
    };
    const { openShareCard } = await import('./share-card.js');
    await openShareCard(spec, { filename: `thunai-good-day-${g.iso}.png`, size: 'tall', shareText: text,
      invite: L('Your own free daily palan, panchangam and Life Guide — scan the QR for the Thunai app.', 'உங்கள் இலவச தினசரி பலன், பஞ்சாங்கம், வாழ்க்கை வழிகாட்டி — QR ஸ்கேன் செய்து துணை செயலியைப் பெறுங்கள்.') });
  });
}
