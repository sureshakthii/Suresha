// Hymn names in remedy, festival and answer text become links to the hymn reader (screen 'hymn').
// The sentences themselves are not edited: names are found with HYMN_NAMES (shared/hymns.js) at render time.
// Links use the app-wide data-go handler in core.js, so they work in any screen without extra wiring.
import { esc, L } from './core.js';
import { withHymnLinks, hymnById } from './shared/hymns.js';

const param = (id) => esc(JSON.stringify({ id }));

/** One hymn name as an inline link (the visible text stays exactly as written in the sentence). */
export function hymnLink(id, text) {
  const h = hymnById(id);
  if (!h) return esc(text);
  return `<button type="button" class="hymn-link" data-go="hymn" data-param="${param(id)}" aria-label="${esc(L(`${text} — open the full text`, `${text} — முழுப் பாடலைத் திற`))}">${esc(text)}</button>`;
}

/** Escape a text for HTML and turn every hymn name in it into a link to the reader. */
export const hymnText = (text) => withHymnLinks(text, esc, hymnLink);

