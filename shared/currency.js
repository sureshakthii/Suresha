// Showing rupee estimates in the user's own currency (e.g. Sri Lanka → LKR, UK → GBP).
// All planning estimates and every payment in the app stay in INR (₹); this only adds an approximate
// conversion for people abroad. Rates are rough guidance values, NOT live exchange rates, and are always
// labelled "≈". Billing never uses this file.
import { guessCountry, countryByCode } from './countries.js';

/** Approximate rupees per one unit of the currency (rounded; reviewed 2026). */
export const INR_PER = {
  USD: 86, EUR: 97, GBP: 114, CHF: 104, NOK: 8.3, SEK: 8.9, DKK: 13, CAD: 62, AUD: 56, NZD: 51,
  LKR: 0.29, MYR: 19.5, SGD: 66, AED: 23.4, QAR: 23.6, SAR: 22.9, OMR: 223, KWD: 281, BHD: 228,
  ZAR: 4.7, MUR: 1.9, FJD: 38, MMK: 0.041, THB: 2.5, JPY: 0.57, HKD: 11, NPR: 0.625, BDT: 0.71, MVR: 5.6, SCR: 6,
};
export const RATES_NOTE = { en: 'Approximate exchange rate, for guidance only', ta: 'தோராயமான நாணய மாற்று விகிதம் — வழிகாட்டலுக்கு மட்டும்' };

/** The user's currency code from the device locale / time zone; 'INR' when unknown or unsupported. */
export function userCurrency(cc) {
  const c = cc ? countryByCode(cc) : guessCountry();
  const cur = c?.cur || 'INR';
  return cur === 'INR' || INR_PER[cur] ? cur : 'INR';
}

const fmt = (n, cur) => {
  try { return new Intl.NumberFormat(cur === 'INR' ? 'en-IN' : 'en', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(n); } catch { return `${cur} ${Math.round(n)}`; }
};
/** Rounded "nice" value so conversions don't look precise. */
const nice = (n) => { const a = Math.abs(n); const step = a >= 100000 ? 1000 : a >= 10000 ? 100 : a >= 1000 ? 10 : 1; return Math.round(n / step) * step; };

/** ₹ amount as text: "₹1,200" in India; "≈ LKR 4,140 (₹1,200)" for a user in Sri Lanka. */
export function money(inr, cur = userCurrency()) {
  const rupees = `₹${Math.round(inr).toLocaleString('en-IN')}`;
  if (cur === 'INR' || !INR_PER[cur]) return rupees;
  return `≈ ${fmt(nice(inr / INR_PER[cur]), cur)} (${rupees})`;
}

/** Convert an amount the user typed in their currency into rupees (for budget comparisons). */
export function toInr(amount, cur = userCurrency()) {
  return cur === 'INR' || !INR_PER[cur] ? amount : amount * INR_PER[cur];
}
