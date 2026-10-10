// Showing rupee estimates in the user's own currency (e.g. Sri Lanka → LKR, UK → GBP).
// All planning estimates stay in INR (₹); this only adds an approximate
// conversion for people abroad. Rates are rough guidance values, NOT live exchange rates, and are always
// labelled "≈". Billing uses only the "payment currencies" part at the end (INR / AED / USD, no conversion).
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

/** Currencies a person can pick for a trip budget (rupees first, then those with a guidance rate). */
export const BUDGET_CURRENCIES = ['INR', ...Object.keys(INR_PER)];

/** Budget currency for a residence country (UAE → AED, USA → USD, India → INR); INR when unsupported. */
export const currencyForCountry = (cc) => userCurrency(cc || 'IN');

/** Range as text, e.g. "≈ AED 1,030–2,260 (₹24,000–53,000)"; rupees only for INR. */
export function moneyRange(lowInr, highInr, cur = userCurrency()) {
  const r = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`;
  const rupees = `${r(lowInr)}–${r(highInr).slice(1)}`;
  if (cur === 'INR' || !INR_PER[cur]) return `≈ ${rupees}`;
  const lo = fmt(nice(lowInr / INR_PER[cur]), cur);
  const hi = fmt(nice(highInr / INR_PER[cur]), cur).replace(/^[^\d]*/, '');
  return `≈ ${lo}–${hi} (${rupees})`;
}

// ---------------------------------------------------------------- payment currencies (billing)
// Payments use exactly three currencies, chosen from the person's RESIDENCE country (never a travelling place):
// India → INR (₹, Razorpay) · United Arab Emirates → AED (Stripe) · every other country → USD ($, Stripe).
// Prices come from server/billing.js (PRICE_{INR|AED|USD}_*); nothing here converts money for a payment.

/** The only currencies a payment can be made in. */
export const PAY_CURRENCIES = Object.freeze(['INR', 'AED', 'USD']);

/** Payment currency for an ISO country code: IN → INR, AE → AED, anything else (or unknown) → USD. */
export function payCurrencyFor(cc) {
  const c = String(cc || '').toUpperCase();
  return c === 'IN' ? 'INR' : c === 'AE' ? 'AED' : 'USD';
}

/** The gateway that takes a payment currency: Razorpay for INR only; Stripe for AED and USD. */
export const payGateway = (cur) => (cur === 'INR' ? 'razorpay' : 'stripe');

/**
 * The country payments are priced for: the saved residence country, else the account phone's country code,
 * else the device's locale / time zone. Returns { cc, source: 'residence' | 'phone' | 'device' }.
 * @param {{residenceCc?: string|null, phoneCc?: string|null, deviceCc?: string|null}} hints
 */
export function payCountry({ residenceCc, phoneCc, deviceCc } = {}) {
  const ok = (c) => (c && countryByCode(c) ? String(c).toUpperCase() : null);
  if (ok(residenceCc)) return { cc: ok(residenceCc), source: 'residence' };
  if (ok(phoneCc)) return { cc: ok(phoneCc), source: 'phone' };
  return { cc: ok(deviceCc) || guessCountry()?.cc || 'IN', source: 'device' };
}

/**
 * A price as shown everywhere a payment is offered: "₹1,999" · "AED 75" · "$19.99" (whole amounts without
 * decimals, others with two). Same text in Tamil and English.
 */
export function formatPrice(amount, cur) {
  const n = Number(amount) || 0;
  const whole = Number.isInteger(n);
  const num = n.toLocaleString(cur === 'INR' ? 'en-IN' : 'en-US', { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 });
  return cur === 'INR' ? `₹${num}` : cur === 'AED' ? `AED ${num}` : `$${num}`;
}

/** Amount in minor units for a gateway (paise / fils / cents — all three currencies use 100). */
export const toMinor = (amount) => Math.round(Number(amount) * 100);
