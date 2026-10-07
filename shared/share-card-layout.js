// Share-card layout (pure — no DOM): turns a card spec into positioned drawing items for public/share-card.js,
// which paints them on a canvas. Kept separate so the layout (sizes, wrapping, footer, invite line, what text is
// allowed on a card) is tested in Node without a canvas.
//
// Sizes: 'portrait' 1080×1350 (WhatsApp status / Instagram) and 'square' 1080×1080.
// Every card: light brand theme, the logo, the card text, a small "Thunai · துணை" footer and an invite line.
// Privacy: a card carries only the text the caller passes — callers never pass birth dates / times / places of
// anyone; cardText() refuses a spec that contains a birth-data pattern, and health-guide content is never used.
import { fmtDay, fmtClock, fmtClockRange, until, WEEKDAYS_TA, WEEKDAYS_EN } from './fmt.js';
export const SIZES = Object.freeze({ portrait: { w: 1080, h: 1350 }, square: { w: 1080, h: 1080 } });

export const COLORS = Object.freeze({
  page: '#fbf7ef', page2: '#f3e7d3', card: '#ffffff', maroon: '#7a1f3d', maroon2: '#c2305a', gold: '#b07014', goldSoft: '#f5c26b',
  text: '#1d1530', muted: '#5a5170', line: 'rgba(122, 31, 61, 0.16)',
});
export const FONT = Object.freeze({
  sans: '"Inter", "Noto Sans Tamil", sans-serif',
  serif: '"Noto Serif Tamil", "Inter", "Noto Sans Tamil", serif',
});
const font = (weight, px, fam = FONT.sans) => `${weight} ${px}px ${fam}`;

/** Card kinds the app makes. */
export const CARD_KINDS = ['today', 'panchangam', 'festival', 'match', 'starbday', 'diary', 'invite', 'week', 'month', 'milestone', 'reflection'];

// A date of birth, a birth time or "born on/at" wording must never be printed on a card.
const BIRTH_DATA = /\b(19|20)\d{2}-\d{2}-\d{2}\b|\b\d{1,2}:\d{2}(:\d{2})?\s*(am|pm)?\s*(birth|born)|\bborn (on|at|in)\b|\bbirth (time|date|place)\b|பிறந்த\s*(நேரம்|தேதி|இடம்)/i;
// Health-guide content is never put on a shareable card.
const HEALTH = /\b(disease|diagnos|medicine|medical|blood pressure|diabetes|surgery)\b|நோய்|மருந்து|அறுவை|சர்க்கரை நோய்/i;

/** All text strings of a spec (for the privacy and wording checks). */
export function cardText(spec) {
  const out = [spec.kicker, spec.title, spec.subtitle, spec.quote, spec.closing, spec.invite, spec.brand, spec.tagline, ...(spec.lines || [])];
  return out.filter((x) => typeof x === 'string' && x);
}
/** Throws when a spec would print birth data or health content. Returns the spec. */
export function assertShareable(spec) {
  for (const t of cardText(spec)) {
    if (BIRTH_DATA.test(t)) throw new Error(`share card must not contain birth data: "${t.slice(0, 60)}"`);
    if (HEALTH.test(t)) throw new Error(`share card must not contain health content: "${t.slice(0, 60)}"`);
  }
  return spec;
}

/** Greedy word wrap with a measure(text, fontString) → px function. Very long words are split by characters. */
export function wrap(text, maxW, f, measure) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = '';
  const push = (w) => {
    if (measure(w, f) <= maxW) return [w];
    const parts = []; let p = '';
    for (const ch of [...w]) { if (measure(p + ch, f) > maxW && p) { parts.push(p); p = ch; } else p += ch; }
    if (p) parts.push(p);
    return parts;
  };
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (measure(test, f) <= maxW) { cur = test; continue; }
    if (cur) lines.push(cur);
    const pieces = push(w);
    cur = pieces.pop();
    lines.push(...pieces);
  }
  if (cur) lines.push(cur);
  return lines;
}

/**
 * Lay out a card.
 * @param {object} spec { kind, lang, kicker, title, subtitle, lines:[string], quote, closing, brand, tagline, invite }
 * @param {{ size?: 'portrait'|'square', measure: (text, font) => number }} opts
 * @returns {{ w, h, size, items: object[], overflow: boolean, bodyPx: number }}
 */
export function layoutCard(spec, { size = 'portrait', measure } = {}) {
  if (typeof measure !== 'function') throw new Error('layoutCard needs measure()');
  assertShareable(spec);
  const { w, h } = SIZES[size] || SIZES.portrait;
  const M = 84; // side margin
  const maxW = w - 2 * M;
  const square = size === 'square';
  const headH = square ? 170 : 200;
  const footH = spec.invite ? (square ? 150 : 170) : (square ? 110 : 120);
  const items = [];
  // Page, header band, logo and brand.
  items.push({ t: 'bg', x: 0, y: 0, w, h, from: COLORS.page, to: COLORS.page2 });
  items.push({ t: 'band', x: 0, y: 0, w, h: headH, from: COLORS.maroon2, to: COLORS.maroon });
  const logo = square ? 104 : 120;
  items.push({ t: 'logo', x: M, y: (headH - logo) / 2, size: logo });
  const bx = M + logo + 30;
  items.push({ t: 'text', text: spec.brand || 'துணை · Thunai', x: bx, y: headH / 2 - 8, font: font(700, square ? 52 : 58, FONT.serif), color: '#ffe7b8', base: 'alphabetic' });
  if (spec.tagline) items.push({ t: 'text', text: spec.tagline, x: bx, y: headH / 2 + 40, font: font(500, 28), color: '#ffd9a0', base: 'alphabetic', maxW: w - bx - M });

  // Content block: shrink the body until everything fits between header and footer.
  const top = headH + (square ? 56 : 76);
  const bottom = h - footH - 30;
  let bodyPx = square ? 40 : 44;
  let titlePx = square ? 62 : 70;
  let block, overflow = false;
  for (;;) {
    block = content(spec, { M, maxW, top, titlePx, bodyPx, measure });
    if (block.bottom <= bottom) break;
    if (bodyPx <= 26) { overflow = true; break; }
    bodyPx -= 2; titlePx = Math.max(46, titlePx - 2);
  }
  items.push(...block.items);

  // Footer: brand line + invite line.
  const fy = h - footH;
  items.push({ t: 'rule', x: M, y: fy, w: maxW, color: COLORS.line });
  items.push({ t: 'text', text: 'Thunai · துணை', x: M, y: fy + 58, font: font(700, 34, FONT.serif), color: COLORS.maroon, base: 'alphabetic', role: 'footer' });
  items.push({ t: 'text', text: spec.footerNote || (spec.lang === 'en' ? 'Your companion on life’s path' : 'உங்கள் வாழ்வின் வழித்துணை'), x: w - M, y: fy + 58, font: font(500, 26), color: COLORS.muted, align: 'right', base: 'alphabetic', maxW: maxW - 330 });
  if (spec.invite) {
    const f = font(600, 28);
    const lines = wrap(spec.invite, maxW, f, measure).slice(0, 2);
    lines.forEach((ln, i) => items.push({ t: 'text', text: ln, x: M, y: fy + 104 + i * 36, font: f, color: COLORS.gold, base: 'alphabetic', role: 'invite' }));
  }
  return { w, h, size, items, overflow, bodyPx };
}

function content(spec, { M, maxW, top, titlePx, bodyPx, measure }) {
  const items = [];
  let y = top;
  if (spec.kicker) {
    const f = font(700, 30);
    items.push({ t: 'text', text: spec.kicker, x: M, y: y + 30, font: f, color: COLORS.gold, base: 'alphabetic' });
    y += 30 + 26;
  }
  if (spec.title) {
    const f = font(700, titlePx, FONT.serif);
    for (const ln of wrap(spec.title, maxW, f, measure)) { y += titlePx * 1.32; items.push({ t: 'text', text: ln, x: M, y, font: f, color: COLORS.maroon, base: 'alphabetic', role: 'title' }); }
    y += 10;
  }
  if (spec.subtitle) {
    const f = font(500, Math.round(bodyPx * 0.78));
    for (const ln of wrap(spec.subtitle, maxW, f, measure)) { y += bodyPx * 1.12; items.push({ t: 'text', text: ln, x: M, y, font: f, color: COLORS.muted, base: 'alphabetic' }); }
  }
  y += 28;
  items.push({ t: 'ornament', x: M, y, w: maxW, color: COLORS.goldSoft });
  y += 34;
  if (spec.quote) {
    const qf = font(600, Math.round(bodyPx * 1.12), FONT.serif);
    items.push({ t: 'quote', x: M, y: y + 10, size: bodyPx * 2.2, color: COLORS.goldSoft });
    y += bodyPx * 0.35;
    for (const ln of wrap(spec.quote, maxW - 40, qf, measure)) { y += bodyPx * 1.12 * 1.5; items.push({ t: 'text', text: ln, x: M + 40, y, font: qf, color: COLORS.text, base: 'alphabetic', role: 'body' }); }
    y += bodyPx * 0.75;
  }
  const bf = font(500, bodyPx);
  // dense: a list of short facts (the day's panchangam) — tighter rows so ten of them fit a square card.
  const lh = spec.dense ? 1.34 : 1.5, gap = spec.dense ? 0.14 : 0.45;
  for (const line of spec.lines || []) {
    const ls = wrap(line, maxW - 46, bf, measure);
    ls.forEach((ln, i) => {
      y += bodyPx * lh;
      if (i === 0) items.push({ t: 'dot', x: M + 12, y: y - bodyPx * 0.36, r: 9, color: COLORS.gold });
      items.push({ t: 'text', text: ln, x: M + 46, y, font: bf, color: COLORS.text, base: 'alphabetic', role: 'body' });
    });
    y += bodyPx * gap;
  }
  if (spec.closing) {
    const cf = font(600, Math.round(bodyPx * 0.9));
    y += 10;
    for (const ln of wrap(spec.closing, maxW, cf, measure)) { y += bodyPx * 1.35; items.push({ t: 'text', text: ln, x: M, y, font: cf, color: COLORS.maroon, base: 'alphabetic' }); }
  }
  return { items, bottom: y + 10 };
}

/** Rough measure for tests and before fonts load: wide enough for Tamil (never under-estimates by much). */
export const approxMeasure = (text, f) => {
  const px = Number(/(\d+)px/.exec(f)?.[1] || 40);
  let wsum = 0;
  for (const ch of String(text)) wsum += /[஀-௿]/.test(ch) ? (/[ா-்ௗ]/.test(ch) ? 0.45 : 0.78) : /[A-Z0-9]/.test(ch) ? 0.66 : ch === ' ' ? 0.28 : 0.55;
  return wsum * px;
};

// ---------------------------------------------------------------- the day's panchangam card
/**
 * Merge back-to-back time slots (one slot's end is the next one's start) into ranges:
 * Gowri "6:13–7:41, 7:41–9:09, 9:09–10:38" → one range 6:13–10:38. Slots are { start, end } Dates (or ms).
 */
export function mergeSlots(slots) {
  const out = [];
  for (const s of [...(slots || [])].sort((a, b) => +a.start - +b.start)) {
    const last = out[out.length - 1];
    if (last && Math.abs(+s.start - +last.end) < 60000) last.end = s.end;
    else out.push({ start: s.start, end: s.end });
  }
  return out;
}

/**
 * Card spec for one day's panchangam, entirely in one language (Tamil in Tamil mode).
 * d: { date 'YYYY-MM-DD', tz (hours), place, weekday (0–6), tamil: { day, monthTa, monthEn, year: { ta, en } },
 *      festivals: [{ ta, en }], star: { ta, en, endsAt }, tithi: { ta, en, endsAt }, yoga: { ta, en },
 *      sunrise, sunset, rahu: { start, end }, yama, guli, good: [{ start, end }], chandrashtamam: { ta, en } }
 */
export function panchangamSpec(d, lang = 'ta') {
  const isTa = lang !== 'en';
  const T = (en, ta) => (isTa ? ta : en);
  const clock = (x) => fmtClock(x, lang, d.tz);
  const range = (r) => fmtClockRange(r.start, r.end, lang, d.tz);
  const nm = (x) => (x ? (isTa ? x.ta : x.en) : '');
  const good = mergeSlots(d.good).slice(0, 3).map(range).join(', ');
  const lines = [
    d.festivals?.length ? `${T('Festival', 'பண்டிகை')}: ${d.festivals.map(nm).join(', ')}` : '',
    `${T('Star', 'நட்சத்திரம்')}: ${nm(d.star)}${d.star?.endsAt ? ` — ${until(clock(d.star.endsAt), lang)}` : ''}`,
    `${T('Tithi', 'திதி')}: ${nm(d.tithi)}${d.tithi?.endsAt ? ` — ${until(clock(d.tithi.endsAt), lang)}` : ''}`,
    d.yoga ? `${T('Yogam', 'யோகம்')}: ${nm(d.yoga)}` : '',
    `${T('Sunrise', 'சூரிய உதயம்')} ${clock(d.sunrise)} · ${T('Sunset', 'அஸ்தமனம்')} ${clock(d.sunset)}`,
    `${T('Rahu Kalam', 'ராகு காலம்')}: ${range(d.rahu)}`,
    `${T('Yamagandam', 'எமகண்டம்')}: ${range(d.yama)}`,
    `${T('Guligai', 'குளிகை')}: ${range(d.guli)}`,
    good ? `${T('Good time', 'நல்ல நேரம்')}: ${good}` : '',
    d.chandrashtamam ? `${T('Chandrashtamam', 'சந்திராஷ்டமம்')}: ${nm(d.chandrashtamam)} ${T('rasi', 'ராசி')}` : '',
  ].filter(Boolean);
  const wd = isTa ? WEEKDAYS_TA[d.weekday] : WEEKDAYS_EN[d.weekday];
  return {
    kind: 'panchangam',
    dense: true,
    lang: isTa ? 'ta' : 'en',
    brand: isTa ? 'துணை · Thunai' : 'Thunai · துணை',
    tagline: T('Daily Panchangam', 'தினசரி பஞ்சாங்கம்'),
    kicker: [fmtDay(d.date, lang), d.place].filter(Boolean).join(' · '),
    title: `${isTa ? d.tamil.monthTa : d.tamil.monthEn} ${d.tamil.day}, ${wd}`,
    subtitle: d.tamil.year ? T(`${d.tamil.year.en} year`, `${d.tamil.year.ta} வருடம்`) : '',
    lines,
  };
}

/** File name for a day's panchangam image: thunai-YYYY-MM-DD.png. */
export const panchangamFilename = (iso) => `thunai-${String(iso).slice(0, 10)}.png`;
