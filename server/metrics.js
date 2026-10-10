// Business metrics for the owner dashboard (THUNAI brief §14).
// Definitions are written next to each number and in docs/ANALYTICS.md. Analytics events contain no birth
// details, names or chat text; AI cost rows hold only token counts and an optional user id.
import { getDb } from './db.js';

const DAY = 86400000;
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS ai_cost (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    at INTEGER NOT NULL,
    user_id TEXT,
    task TEXT,
    model TEXT,
    input_tokens INTEGER,
    output_tokens INTEGER
  );
  CREATE INDEX IF NOT EXISTS ai_cost_at ON ai_cost(at);
`;
const ready = new WeakSet();
function db() {
  const d = getDb();
  if (!ready.has(d)) { d.exec(SCHEMA); ready.add(d); }
  return d;
}

/** Record token usage of one AI answer (called from the AI route). */
export function recordAiCost({ userId = null, task = null, model = null, usage = {} }) {
  db().prepare('INSERT INTO ai_cost (at, user_id, task, model, input_tokens, output_tokens) VALUES (?, ?, ?, ?, ?, ?)')
    .run(Date.now(), userId, task, model, Number(usage.input_tokens) || 0, Number(usage.output_tokens) || 0);
}

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : null; };
const pct = (a, b) => (b ? Math.round((1000 * a) / b) / 10 : null);
const safe = (fn, dflt) => { try { return fn(); } catch { return dflt; } };

/**
 * Compute metrics for the last `days` days.
 * Prices for AI cost come from AI_COST_INR_PER_MTOK_IN / _OUT (₹ per million tokens) — set them from your
 * provider's current price list; without them, cost is reported as null and only tokens are shown.
 */
export function businessMetrics({ days = 30, now = Date.now() } = {}) {
  const d = db();
  const from = now - days * DAY;
  const one = (sql, ...a) => safe(() => d.prepare(sql).get(...a), {}) || {};
  const all = (sql, ...a) => safe(() => d.prepare(sql).all(...a), []);

  // Activation: new devices that used a personal feature (chart, ask, journey, family) within 24 h of first open.
  const firsts = all("SELECT device_id, MIN(created_at) AS t FROM events WHERE type = 'first_open' GROUP BY device_id HAVING t >= ?", from);
  const activated = firsts.filter((f) => one(`SELECT 1 AS ok FROM events WHERE device_id = ? AND created_at BETWEEN ? AND ?
    AND ((type = 'screen_view' AND screen IN ('chart', 'chat', 'journey', 'familyhub', 'family')) OR type IN ('feature', 'signup'))`, f.device_id, f.t, f.t + DAY).ok).length;

  // Retention: share of eligible new devices that opened the app again in days 7–13 (D7) / 30–36 (D30).
  const retention = (k) => {
    const cohort = all("SELECT device_id, MIN(created_at) AS t FROM events WHERE type = 'first_open' GROUP BY device_id HAVING t BETWEEN ? AND ?", now - (days + k) * DAY, now - k * DAY);
    const back = cohort.filter((c) => one("SELECT 1 AS ok FROM events WHERE device_id = ? AND type = 'app_open' AND created_at BETWEEN ? AND ?", c.device_id, c.t + k * DAY, c.t + (k + 7) * DAY).ok).length;
    return { cohort: cohort.length, returned: back, rate: pct(back, cohort.length) };
  };

  // Money (minor units → rupees). Only real gateway payments count as revenue; gifts/trials/admin grants do not.
  const paidWhere = "gateway IN ('razorpay', 'stripe') AND status IN ('active', 'expired', 'refunded')";
  const rev = one(`SELECT COUNT(*) AS n, COALESCE(SUM(amount_minor), 0) AS m FROM subscriptions WHERE ${paidWhere} AND currency = 'INR' AND starts_at >= ?`, from);
  const ref = one("SELECT COUNT(*) AS n, COALESCE(SUM(amount_minor), 0) AS m FROM subscriptions WHERE status = 'refunded' AND currency = 'INR' AND expires_at >= ?", from);
  const newUsers = one('SELECT COUNT(*) AS n FROM users WHERE created_at >= ?', from).n || 0;
  const newPayers = one(`SELECT COUNT(DISTINCT s.user_id) AS n FROM subscriptions s JOIN users u ON u.id = s.user_id WHERE ${paidWhere.replace(/gateway/g, 's.gateway').replace(/status/g, 's.status')} AND u.created_at >= ?`, from).n || 0;
  const activePayers = one(`SELECT COUNT(DISTINCT user_id) AS n FROM subscriptions WHERE gateway IN ('razorpay', 'stripe') AND status = 'active' AND expires_at > ?`, now).n || 0;

  // Churn: paid periods that ended in the window and were not followed by another paid period within 7 days.
  // One-time packages end by design, so they are not churn.
  const notPackage = "plan NOT IN ('marriage_package', 'journey_package')";
  const ended = all(`SELECT user_id, expires_at FROM subscriptions WHERE gateway IN ('razorpay', 'stripe') AND status = 'expired' AND ${notPackage} AND expires_at BETWEEN ? AND ?`, from, now - 7 * DAY);
  const churned = ended.filter((e) => !one(`SELECT 1 AS ok FROM subscriptions WHERE user_id = ? AND gateway IN ('razorpay', 'stripe') AND status IN ('active', 'expired') AND ${notPackage} AND starts_at BETWEEN ? AND ?`, e.user_id, e.expires_at - DAY, e.expires_at + 7 * DAY).ok).length;

  // AI cost.
  const ai = one('SELECT COUNT(*) AS calls, COALESCE(SUM(input_tokens), 0) AS tin, COALESCE(SUM(output_tokens), 0) AS tout FROM ai_cost WHERE at >= ?', from);
  const pin = num(process.env.AI_COST_INR_PER_MTOK_IN), pout = num(process.env.AI_COST_INR_PER_MTOK_OUT);
  const aiCost = pin != null && pout != null ? Math.round(((ai.tin || 0) * pin + (ai.tout || 0) * pout) / 1e6) : null;

  // Bookings: fulfilled vs open; store booking value is GROSS and is not revenue.
  const fulfilled = one("SELECT COUNT(*) AS n FROM service_requests WHERE status = 'completed' AND updated_at >= ?", from).n || 0;
  const bookingsOpen = one("SELECT COUNT(*) AS n FROM service_requests WHERE status IN ('requested', 'awaiting_confirmation', 'confirmed', 'assigned')").n || 0;
  const bookingsCancelled = one("SELECT COUNT(*) AS n FROM service_requests WHERE status = 'cancelled' AND updated_at >= ?", from).n || 0;
  const storeValue = one("SELECT COALESCE(SUM(total), 0) AS v FROM store_orders WHERE status IN ('paid', 'shipped', 'delivered') AND created_at >= ?", from).v || 0;

  const spend = num(process.env.MARKETING_SPEND_INR_30D);
  const feePct = num(process.env.GATEWAY_FEE_PCT) ?? 2;
  const revenue = Math.round((rev.m || 0) / 100);
  const refunds = Math.round((ref.m || 0) / 100);
  const fees = Math.round(revenue * feePct / 100);
  return {
    windowDays: days,
    activation: { newDevices: firsts.length, activated, rate: pct(activated, firsts.length) },
    retention: { d7: retention(7), d30: retention(30) },
    conversion: { newUsers, newPayers, rate: pct(newPayers, newUsers) },
    churn: { periodsEnded: ended.length, churned, rate: pct(churned, ended.length) },
    ai: { calls: ai.calls || 0, inputTokens: ai.tin || 0, outputTokens: ai.tout || 0, costInr: aiCost, costPerPayerInr: aiCost != null && activePayers ? Math.round(aiCost / activePayers) : null, priced: aiCost != null },
    acquisition: { marketingSpendInr: spend, costPerNewUserInr: spend != null && newUsers ? Math.round(spend / newUsers) : null, costPerNewPayerInr: spend != null && newPayers ? Math.round(spend / newPayers) : null },
    money: {
      revenueInr: revenue, refundsInr: refunds, refundCount: ref.n || 0, gatewayFeesInr: fees,
      contributionMarginInr: revenue - refunds - fees - (aiCost || 0),
      activePayers,
      bookingValueGrossInr: storeValue,
    },
    bookings: { fulfilled, open: bookingsOpen, cancelled: bookingsCancelled },
    notes: [
      'Revenue = real gateway payments in the window (gifts, trials and admin grants excluded). Booking value is gross order value, not revenue.',
      'Contribution margin = revenue − refunds − gateway fees − AI cost. It is not profit (fixed costs and taxes are excluded) and not valuation.',
      '₹800 crore over two years is a stretch business ambition, not a forecast and never a consumer-facing claim.',
    ],
  };
}
