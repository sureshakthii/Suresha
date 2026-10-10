// Text normalisation and multilingual (Tamil script, Tanglish, English) lexicon helpers for the policy layer.
// Deterministic and dependency-free. The ORIGINAL wording is always kept by the caller; these helpers only
// produce a normalised copy used for matching (Brief §19).

// The normaliser, number-word converter and age extractor live in shared/age-guard.js — the SAME code runs on
// the phone (offline Ask Thunai) and here, so the two can never disagree about who is a minor.
export { TB, TE, normalizeText, wordsToDigits, extractAges, roleGroup } from '../../shared/age-guard.js';

/** Test a list of patterns (RegExp or string) against text; returns the first matching pattern's source or null. */
export function firstMatch(text, patterns) {
  for (const p of patterns) {
    const re = p instanceof RegExp ? p : new RegExp(p, 'u');
    if (re.test(text)) return re.source;
  }
  return null;
}

/** Try to decode base64-looking tokens so encoded text cannot bypass the classifier. */
export function decodeEmbedded(text) {
  const out = [];
  for (const tok of String(text).match(/[A-Za-z0-9+/]{16,}={0,2}/g) || []) {
    try {
      const dec = Buffer.from(tok, 'base64').toString('utf8');
      if (/^[\p{L}\p{M}\p{N}\p{P}\p{Zs}]+$/u.test(dec) && /[\p{L}]{3,}/u.test(dec)) out.push(dec);
    } catch { /* not base64 */ }
  }
  return out;
}
