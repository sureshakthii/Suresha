// HTTP hardening shared by the whole app (docs/SECURITY-REVIEW.md):
//   securityHeaders()  CSP (with hashes of the pages' own inline scripts), HSTS on HTTPS, Permissions-Policy,
//                      frame-ancestors, nosniff, Referrer-Policy, COOP; no-store on /api responses.
//   httpsRedirect()    FORCE_HTTPS=1 → plain-HTTP GET/HEAD is redirected to https (needs TRUST_PROXY behind a proxy).
//   sameOriginWrites() CSRF defence in depth for cookie sessions: state-changing /api requests from another site
//                      are refused (the session cookie is also SameSite=Lax; gateway webhooks are exempt).
//   productionConfig() start-up checks: production refuses to start with a missing/weak AUTH_SECRET, dev OTP mode,
//                      a short admin token or a non-HTTPS PUBLIC_URL.
//   cleanDisplayText() neutralises HTML-significant characters in short display strings that travel between accounts.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const env = (k) => (process.env[k] || '').trim();
export const isProd = () => process.env.NODE_ENV === 'production';

/** sha256 CSP sources for every inline <script> in the given HTML files (import maps, small page scripts). */
export function inlineScriptHashes(files) {
  const out = new Set();
  for (const f of files) {
    let html = '';
    try { html = fs.readFileSync(f, 'utf8'); } catch { continue; }
    for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
      if (/\bsrc\s*=/.test(m[1]) || !m[2]) continue;
      out.add(`'sha256-${crypto.createHash('sha256').update(m[2], 'utf8').digest('base64')}'`);
    }
  }
  return [...out];
}

/**
 * The Content-Security-Policy. Third parties are limited to what the app really uses: Razorpay Checkout (script,
 * iframe, telemetry), OpenStreetMap Nominatim (place search), Open-Meteo and NOAA aviationweather.gov (weather). 'wasm-unsafe-eval' lets the
 * on-device horoscope reader (Tesseract OCR, WebAssembly) run; it does NOT allow eval() of JavaScript. Inline styles
 * stay allowed (the screens use style attributes); inline scripts are allowed only by hash.
 */
export function buildCsp({ scriptHashes = [], extraConnect = [] } = {}) {
  const directives = {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'wasm-unsafe-eval'", 'https://checkout.razorpay.com', ...scriptHashes],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:', 'https://*.razorpay.com'],
    'font-src': ["'self'", 'data:'],
    'connect-src': ["'self'", 'https://nominatim.openstreetmap.org', 'https://api.open-meteo.com', 'https://aviationweather.gov', 'https://*.razorpay.com', 'data:', 'blob:', ...extraConnect],
    'worker-src': ["'self'", 'blob:'],
    'frame-src': ["'self'", 'https://api.razorpay.com', 'https://checkout.razorpay.com'],
    'media-src': ["'self'", 'blob:', 'data:'],
    'manifest-src': ["'self'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'self'"], // devices.html previews the app in same-origin iframes; nobody else may frame it
  };
  return Object.entries(directives).map(([k, v]) => `${k} ${v.join(' ')}`).join('; ');
}

/** Microphone stays allowed for this origin (voice questions); everything else the app does not use is off. */
export const PERMISSIONS_POLICY = 'microphone=(self), geolocation=(self), camera=(self), payment=(self "https://api.razorpay.com" "https://checkout.razorpay.com"), usb=(), serial=(), bluetooth=(), hid=(), midi=(), magnetometer=(), gyroscope=(), accelerometer=(), interest-cohort=(), browsing-topics=()';

export function securityHeaders({ publicDir } = {}) {
  const hashes = publicDir ? inlineScriptHashes(['index.html', 'devices.html'].map((f) => path.join(publicDir, f))) : [];
  const extra = env('CSP_CONNECT_EXTRA').split(/\s+/).filter((s) => /^https:\/\/[\w.*-]+(:\d+)?$/.test(s));
  const csp = buildCsp({ scriptHashes: hashes, extraConnect: extra });
  const mode = env('CSP_MODE'); // '' (enforce) | 'report-only' | 'off'
  const hstsAge = Number(env('HSTS_MAX_AGE')) || 15552000; // 180 days
  return (req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Permissions-Policy', PERMISSIONS_POLICY);
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups'); // Razorpay / Stripe may open a popup
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    if (mode !== 'off') res.setHeader(mode === 'report-only' ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy', csp);
    if (req.secure) res.setHeader('Strict-Transport-Security', `max-age=${hstsAge}; includeSubDomains`);
    // Signed-in data must never be kept by a shared proxy or the browser's HTTP cache.
    if (req.path.startsWith('/api/')) res.setHeader('Cache-Control', 'no-store');
    next();
  };
}

/** FORCE_HTTPS=1: redirect plain-HTTP page loads to https; refuse other plain-HTTP API calls. */
export function httpsRedirect() {
  return (req, res, next) => {
    if (env('FORCE_HTTPS') !== '1' || req.secure) return next();
    const host = req.get('host');
    if (!host || !/^[\w.-]+(:\d+)?$/.test(host)) return res.status(400).json({ error: 'HTTPS required' });
    if (req.method === 'GET' || req.method === 'HEAD') return res.redirect(308, `https://${host}${req.originalUrl}`);
    return res.status(403).json({ error: 'HTTPS required' });
  };
}

const UNSAFE = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const WEBHOOKS = ['/api/billing/stripe/webhook', '/api/billing/razorpay/webhook'];

function allowedOrigins(req) {
  const out = new Set();
  const host = req.get('host');
  if (host) { out.add(`http://${host}`); out.add(`https://${host}`); }
  for (const u of [env('PUBLIC_URL'), ...env('ALLOWED_ORIGINS').split(/[\s,]+/)]) {
    try { if (u) out.add(new URL(u).origin); } catch { /* ignore malformed */ }
  }
  return out;
}

/**
 * CSRF defence in depth for cookie sessions: a state-changing /api request that a browser marks as coming from
 * another site (Origin of another host, or Sec-Fetch-Site: cross-site) is refused. Non-browser clients (no Origin)
 * and the payment webhooks (signed, server-to-server) pass.
 */
export function sameOriginWrites() {
  return (req, res, next) => {
    if (!UNSAFE.has(req.method) || !req.path.startsWith('/api/') || WEBHOOKS.includes(req.path)) return next();
    const origin = req.get('origin');
    const site = req.get('sec-fetch-site');
    if (origin && origin !== 'null' && !allowedOrigins(req).has(origin)) return res.status(403).json({ error: 'Cross-site request refused' });
    if (origin === 'null' || (!origin && site === 'cross-site')) return res.status(403).json({ error: 'Cross-site request refused' });
    next();
  };
}

/** Production start-up checks. Returns { errors, warnings }; the server refuses to start on errors. */
export function productionConfig(e = process.env) {
  const errors = [], warnings = [];
  if (e.NODE_ENV !== 'production') return { errors, warnings };
  const v = (k) => String(e[k] || '').trim();
  if (!v('AUTH_SECRET')) errors.push('AUTH_SECRET must be set');
  else if (v('AUTH_SECRET').length < 32) errors.push('AUTH_SECRET must be at least 32 characters (use: openssl rand -hex 32)');
  if (v('AUTH_DEV_MODE') === '1') errors.push('AUTH_DEV_MODE=1 is not allowed in production (it would show sign-in codes on screen)');
  if (v('ADMIN_TOKEN') && v('ADMIN_TOKEN').length < 24) errors.push('ADMIN_TOKEN must be at least 24 characters');
  if (!v('PUBLIC_URL')) warnings.push('PUBLIC_URL is not set (invite links and cookies fall back to the request host)');
  else if (!v('PUBLIC_URL').startsWith('https://')) errors.push('PUBLIC_URL must be an https:// URL in production');
  if (!v('TRUST_PROXY')) warnings.push('TRUST_PROXY is not set — behind a load balancer every visitor shares one IP for rate limits and Secure-cookie detection');
  if (!v('VAPID_PUBLIC_KEY') || !v('VAPID_PRIVATE_KEY')) warnings.push('VAPID keys are not set — a key pair will be generated in data/vapid.json');
  if (v('CSP_MODE') === 'off') warnings.push('CSP_MODE=off — the Content-Security-Policy is disabled');
  if (v('RATE_LIMITS') === 'off') errors.push('RATE_LIMITS=off is not allowed in production');
  if (v('DB_PATH') === ':memory:') errors.push('DB_PATH=:memory: would lose all accounts on restart');
  if (v('BACKUP_ENCRYPTION_KEY') && !/^[0-9a-fA-F]{64}$/.test(v('BACKUP_ENCRYPTION_KEY'))) errors.push('BACKUP_ENCRYPTION_KEY must be 64 hex characters (openssl rand -hex 32)');
  if (v('BACKUP_DIR') && !v('BACKUP_ENCRYPTION_KEY')) warnings.push('BACKUP_DIR is set without BACKUP_ENCRYPTION_KEY — backups of personal data are written unencrypted');
  if (!v('ADMIN_TOKEN') && !v('ADMIN_TOKENS')) warnings.push('No admin token configured — admin routes answer 503 (disabled)');
  return { errors, warnings };
}

const LOOKALIKE = { '<': '‹', '>': '›', '"': '”', "'": '’', '`': 'ʼ' };
/**
 * Short display text (a name, a place, a relation) that crosses from one account to another: control characters
 * removed and HTML-significant characters replaced by look-alikes, so it can never become markup on another
 * person's phone even where a screen forgets to escape it (O'Neil shows as O’Neil).
 */
export function cleanDisplayText(s, max = 120) {
  return String(s ?? '').replace(/[\u0000-\u001f\u007f\u2028\u2029]/g, ' ').replace(/[<>"'`]/g, (c) => LOOKALIKE[c]).trim().slice(0, max);
}
