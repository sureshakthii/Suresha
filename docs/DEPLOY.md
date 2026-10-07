# Deploying the server

The server (`server/index.js`) serves the API and the web app from a single place. It runs anywhere that
can run a Docker container. This guide uses **Render** because it needs no server administration. The
same `Dockerfile` also works on Railway, Fly.io, DigitalOcean, AWS, Google Cloud Run (but see the data
note below) or your own VPS.

What the container does:

- Runs Node 22 as a **non-root** user and listens on port **3000**.
- Stores everything that must survive a restart in **`/data`**: the SQLite database
  (`DB_PATH=/data/kaippesi.db`) and, if you do not set VAPID keys, the generated `vapid.json`.
  **`/data` must be a persistent disk or volume.** Without one, every deploy erases all accounts.
- Exposes `GET /api/health` for health checks.

## Option 1: Render (recommended)

1. Push this repository to GitHub.
2. Sign in at [render.com](https://render.com) → **New → Blueprint** → choose the repository. Render
   reads `render.yaml`, which sets up:
   - a **Web Service** built from the `Dockerfile` (Starter plan, Singapore region, closest to India);
   - a **1 GB persistent disk** mounted at `/data`;
   - fixed settings `NODE_ENV=production`, `TRUST_PROXY=1`, `PORT=3000` and `DB_PATH=/data/kaippesi.db`;
   - prompts for each secret (see the table below). Leave the optional ones empty for now.
3. Click **Apply**. The first build takes a few minutes. Then open
   `https://<service>.onrender.com/api/health`. It should show `{"ok":true,...}`.
4. Set `PUBLIC_URL` to the address users will use, for example `https://thunai.example`, and redeploy.

> Persistent disks need a paid instance (Starter or above). On the free plan, data is lost on every deploy.

### Your own domain and HTTPS

1. In Render: open the service → **Settings → Custom Domains** → add `thunai.example`
   (and `www.` if you want it).
2. At your domain registrar (GoDaddy, Namecheap, BigRock, Cloudflare…), add the DNS record that Render
   shows:
   - for a subdomain such as `app.example.com` or `www`: a **CNAME** pointing to `<service>.onrender.com`;
   - for the bare domain `example.com`: an **A** record pointing to Render's IP, or ALIAS/ANAME/CNAME
     flattening if your DNS provider supports it.
3. Render issues a free **HTTPS certificate** automatically, usually within minutes. If you use Cloudflare,
   set the record to "DNS only" (grey cloud) until the certificate is issued.
4. Update `PUBLIC_URL`, the Facebook redirect URI, the Stripe webhook URL and `KJ_APP_URL` (mobile apps)
   to the new domain.

## Option 2: Any Docker host (VPS)

```bash
docker build -t kaippesi .
docker volume create kaippesi-data
docker run -d --name kaippesi --restart unless-stopped \
  -p 3000:3000 -v kaippesi-data:/data --env-file .env \
  -e TRUST_PROXY=1 kaippesi
```

Put a reverse proxy with HTTPS in front of it. [Caddy](https://caddyserver.com) is the simplest, because
it gets certificates automatically:

```
thunai.example {
  reverse_proxy localhost:3000
}
```

Copy `.env.example` to `.env` and fill it in. Never commit `.env`.

**Serverless platforms** (Cloud Run, Lambda) do not keep a local disk. Use them only with a mounted
volume, because SQLite needs `/data`.

**If `/data` is not writable:** the container runs as the `node` user (uid 1000). A Docker named volume
inherits the right owner automatically. A host folder (`-v /srv/kaippesi:/data`) needs
`sudo chown -R 1000:1000 /srv/kaippesi` first.

## Environment variables

| Variable | Needed? | What it is |
|---|---|---|
| `NODE_ENV` | **yes** | `production` (already set in the image and `render.yaml`) |
| `AUTH_SECRET` | **yes** | Long random string for OTP hashing. The server will not start in production without it. Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `PUBLIC_URL` | **yes** | `https://thunai.example`. Used for Secure cookies and Facebook/Stripe callbacks. |
| `TRUST_PROXY` | **yes** behind Render/Caddy/nginx | `1`, so rate limits see the real client IP |
| `DB_PATH` | set | `/data/kaippesi.db` (already set in the image) |
| `PORT` | optional | Default `3000` |
| `ANTHROPIC_API_KEY` | recommended | Claude API key for the AI Jothidar. Without it, rule-based replies are used. |
| `AI_MODEL`, `AI_EFFORT`, `AI_FALLBACKS` | optional | AI tuning (see `.env.example`) |
| `AI_REQUIRE_LOGIN`, `AI_RATE_LIMIT`, `AI_FREE_DAILY`, `BILLING_ENFORCE` | optional | Protect your AI budget / enforce the free quota |
| `AI_DAILY_LIMIT_GLOBAL` | **yes** with an AI key | Whole-site AI answers per day (0/unset = no ceiling). Set it from your monthly Anthropic budget |
| `AI_DAILY_LIMIT_USER`, `AI_DAILY_LIMIT_ANON`, `AI_DAILY_LIMIT_IP` | optional | Daily AI caps per account (default 200), per signed-out visitor (100) and per IP (500). Stored in SQLite, so restarts do not reset them |
| `AI_MAX_TOKENS`, `AI_TIMEOUT_MS` | optional | Longest answer (default 16000 tokens, 1024–32000) and model time limit (default 45000 ms) |
| `FORCE_HTTPS` | **yes** in production | `1`: plain-HTTP page loads are redirected to https, other plain-HTTP requests refused. Needs `TRUST_PROXY` |
| `HSTS_MAX_AGE` | optional | Strict-Transport-Security max-age in seconds (default 15552000 = 180 days) |
| `CSP_MODE` | optional | Unset = Content-Security-Policy enforced; `report-only` for a staged roll-out; `off` = emergency only (never leave it off) |
| `CSP_CONNECT_EXTRA` | optional | Extra `https://` origins the page may call, space separated |
| `ALLOWED_ORIGINS` | optional | Extra origins allowed to make state-changing `/api` calls (e.g. a `www.` alias); `PUBLIC_URL` is always allowed |
| `RATE_READ_PER_MIN`, `RATE_WRITE_PER_10MIN`, `RATE_ANON_WRITE_PER_10MIN` | optional | Per-IP limits: reads (120/min), paid writes (30 per 10 min), anonymous writes such as feedback and push sign-up (60 per 10 min). `RATE_LIMITS=off` is refused in production |
| `BACKUP_DIR`, `BACKUP_EVERY_HOURS`, `BACKUP_KEEP` | recommended | Scheduled, verified SQLite backups (default every 24 h, keep 14) |
| `BACKUP_ENCRYPTION_KEY` | **yes** with `BACKUP_DIR` | 64 hex characters (`openssl rand -hex 32`): backups are AES-256-GCM encrypted. Keep it in the secret store, not beside the backups; without it a backup cannot be restored |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` | one SMS provider | SMS OTP through Twilio |
| `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID` | one SMS provider | SMS OTP through MSG91 (India, DLT template) |
| `SMTP_URL`, `MAIL_FROM` | for email OTP | e.g. `smtps://user:pass@smtp.gmail.com:465` |
| `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` | optional | Facebook login. Redirect URI: `${PUBLIC_URL}/api/auth/facebook/callback` |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | for INR payments | Razorpay keys (store orders, INR subscriptions). Razorpay is used **only for INR** (residence India) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | for AED and USD payments | Stripe Checkout for residents of the UAE (AED) and every other country (USD). Webhook: `${PUBLIC_URL}/api/billing/stripe/webhook`, events `checkout.session.completed` and `charge.refunded`. See "Payment currencies" below |
| `PRICE_{INR,AED,USD}_{PERSONAL_MONTH,PERSONAL_YEAR,FAMILY_MONTH,FAMILY_YEAR,MARRIAGE_PACKAGE,JOURNEY_PACKAGE}` | optional | Price overrides in rupees / dirhams / dollars (not minor units). Defaults: INR 199 · 1999 · 399 · 3999 · 499 · 299; AED 18 · 179 · 36 · 359 · 33 · 22; USD 4.99 · 49 · 9.99 · 99 · 9 · 6 (`docs/COSTING.md`) |
| `ADMIN_TOKENS` (or legacy `ADMIN_TOKEN`) | recommended | Admin console access: `name:role:token,…`, tokens of at least 24 characters (`x-admin-token` header). Unset = admin routes disabled |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | recommended | Web Push keys. Generate once with `npx web-push generate-vapid-keys`. **Changing them breaks every existing push subscription.** |
| `ANNADHANAM_RATE`, `TRIAL_HOURS`, `REFERRAL_DAYS` | optional | Business settings (see `.env.example`) |

On Render, set these under the service's **Environment** tab. A change triggers a redeploy.

### Payment currencies (INR · AED · USD only)

The currency follows the country of residence set in the app (Settings → Location; fallback: the account phone's
country code, then the phone's locale): **India → INR via Razorpay, United Arab Emirates → AED via Stripe, every
other country → USD via Stripe.** The server re-derives the currency from that country at checkout, refuses a
currency that does not match it, and takes the price only from `server/billing.js` / `PRICE_*`.

Stripe AED enablement checklist:

1. AED is a standard Stripe presentment currency (2 decimals — amounts are sent in fils, AED 179 = `17900`);
   no product or price objects are needed because Checkout uses inline `price_data`. Confirm in the Stripe
   dashboard (Settings → Payments → Currencies / the account's supported presentment currencies) that AED is
   available for your account's country, and check the settlement / conversion fee for AED into your payout
   currency.
2. Webhook endpoint `${PUBLIC_URL}/api/billing/stripe/webhook` with events **`checkout.session.completed`** (activates
   the plan only when the session's currency and `amount_total` match what was priced) and **`charge.refunded`**
   (a full refund in the original currency revokes the plan). Put its signing secret in `STRIPE_WEBHOOK_SECRET`.
3. Refunds: the finance-role endpoint `POST /api/admin/billing/refund` refunds Stripe payments (AED or USD,
   in fils / cents) through `https://api.stripe.com/v1/refunds`, and Razorpay payments as before.
4. Test with a Stripe test key: set your residence to Dubai, buy Personal yearly and confirm Checkout shows
   **AED 179.00**; repeat with London (→ **$49.00**) and Chennai (→ Razorpay **₹1,999**).
5. Tax: the Plans screen says "Prices include applicable taxes" for AED / USD (and "once GST registration is
   complete" for INR). No tax is calculated in code — confirm UAE VAT obligations with the accountant before
   launch.

### Compression and caching (built in)

The server compresses pages, scripts, CSS, JSON and SVG itself (brotli, or gzip for older clients; `server/compress.js`),
so no proxy setting is needed. `index.html`, `sw.js` and the manifest are sent with `Cache-Control: no-cache`, so a
deploy reaches everyone on their next visit; other app files revalidate by ETag; `/vendor/*` and `/fonts/*` are cached
for a year (`immutable`) — when upgrading a vendored library, give the file a new name. If a CDN sits in front,
let it honour the origin's `Cache-Control` and `Vary: Accept-Encoding` headers. Check with
`curl -sI -H 'Accept-Encoding: br' https://your-domain/styles.css` (expect `content-encoding: br`).

## Backups of `/data`

Everything important is in one SQLite file: `/data/kaippesi.db` (plus `-wal`/`-shm` files while the server
is running).

- **Render:** disks get automatic daily snapshots that you can restore from the dashboard (**Disks →
  Snapshots**). For an off-site copy, open the **Shell** tab and run:
  ```bash
  node -e "const {DatabaseSync}=require('node:sqlite');new DatabaseSync('/data/kaippesi.db').exec(\"VACUUM INTO '/data/backup.db'\")"
  ```
  Then download `backup.db` (for example with `render ssh`/`scp`, or by uploading it to your cloud storage).
- **Docker host:** make a consistent copy while the server runs, then copy it off the machine:
  ```bash
  docker exec kaippesi node -e "const {DatabaseSync}=require('node:sqlite');new DatabaseSync('/data/kaippesi.db').exec(\"VACUUM INTO '/data/backup-$(date +%F).db'\")"
  docker cp kaippesi:/data/backup-$(date +%F).db ./backups/
  ```
  Run it daily from cron and keep several days of copies somewhere else (S3, Google Drive, another server).
- **Restore:** stop the service, replace `/data/kaippesi.db` with the backup (delete any `-wal`/`-shm`
  files), and start it again.
- Also store your environment variables (especially `AUTH_SECRET` and the VAPID keys) in a password
  manager.

## Updating

- **Render:** every push to the main branch redeploys automatically (`autoDeploy: true`). The data on
  `/data` is kept.
- **Docker host:** `git pull && docker build -t kaippesi . && docker rm -f kaippesi`, then run the same
  `docker run …` command again.

The mobile apps load the live site, so they update at the same moment. See [MOBILE.md](MOBILE.md).
