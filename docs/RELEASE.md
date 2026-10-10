# Thunai — release and rollback

How a change becomes a release, how to undo it, and what to switch off when something goes wrong.
Finishing code is not release approval: the gates in [HANDOVER.md §4](HANDOVER.md) still apply.

## 1. Versions

| What | Where | Rule |
|---|---|---|
| Calculation conventions | `CALC_VERSION` in `shared/version.js` (= `ENGINE_VERSION` in `shared/engine-contract.js`) | Bump for any change that can move a computed position, time, date or varga. Re-run the benchmark and update [ACCURACY-REPORT.md](ACCURACY-REPORT.md) in the same change |
| Interpretation rules | `RULES_VERSION` in `shared/version.js` | Bump for any rule, score or reading text change. Record the rule change in [RULE-REGISTRY.md](RULE-REGISTRY.md) |
| Web app build | `CACHE` name in `public/sw.js` (e.g. `kj-v19`) | Bump on every web release, or installed PWAs keep serving the old files |
| Android build | `versionCode` / `versionName` from `GITHUB_RUN_NUMBER` (`android/app/build.gradle`) | Automatic per CI run; a store upload must use a higher number than the live one |
| Server | Git commit deployed by Render | Tag releases `vX.Y.Z` (a tag also triggers the mobile build) |

Write the versions and the commit into the release note (template in §8).

## 2. Continuous integration

- `.github/workflows/ci.yml` runs `npm ci && npm test` on every push and pull request. A red run blocks the release.
- The Swiss Ephemeris benchmark is **not** in CI (native module + data files). Run it by hand whenever
  `CALC_VERSION` changes: `cd scripts/benchmark && npm install && npm run setup && npm run bench`.
- `test/accuracy-report.test.js` keeps the accuracy report's version table, the code constants and
  `scripts/benchmark/results.json` in step.

## 3. Builds

| Build | How | Who uses it |
|---|---|---|
| Test APK (debug) | Actions → **Mobile apps** → Run workflow → artifact `thunai-android-debug-apk`, also published to the `test-latest` release | Team phones |
| Review APK (time-limited) | Same workflow; inputs `review_hours` (default 24) and `review_days` (hard stop, default 3). Published as `Thunai-Review-<h>h.apk` | Outside reviewers (see [REVIEW-PLAN.md](REVIEW-PLAN.md)); stops working by itself |
| Signed release APK / AAB | Same workflow with the signing secrets set (`ANDROID_KEYSTORE_BASE64` …) | Play Store / AppGallery ([MOBILE.md](MOBILE.md)) |
| Standalone vs server-backed | `KJ_APP_URL` unset → offline standalone app; set → app opens the deployed site | Decide per build |
| Static web artifact | `npm run build:artifact` → `dist/artifact/` (no server; astronomy-engine from CDN). `KJ_OUT` picks another folder | Demo / review page |
| iOS | Needs a Mac; see [MOBILE.md](MOBILE.md) | — |

## 4. Server deploy (Render)

1. Merge to `main` → Render redeploys automatically (`autoDeploy: true` in `render.yaml`). `/data` is kept.
2. Watch the deploy log, then check `GET /api/health` → `{"ok":true}`.
3. Smoke test: open the site, Today screen, a chart, the journey planner, Ask Thunai (or its template answer when
   AI is off), sign-in with a test account.
4. Server-backed mobile apps load the live site, so they change at the same moment.

Other hosts: see [DEPLOY.md](DEPLOY.md) (Docker).

## 5. Database backup and restore

- Scheduled: set `BACKUP_DIR` (e.g. `/data/backups`); `BACKUP_EVERY_HOURS` (default 24) and `BACKUP_KEEP`
  (default 14). Each backup is verified after it is written (`server/backup.js`). Copy the folder off the machine.
- Manual (`scripts/db-backup.mjs`):
  ```bash
  node scripts/db-backup.mjs backup  --db /data/kaippesi.db --out /data/backups   # consistent online copy (VACUUM INTO)
  node scripts/db-backup.mjs verify  /data/backups/thunai-<stamp>.db              # integrity check + row counts
  node scripts/db-backup.mjs restore /data/backups/thunai-<stamp>.db --db /data/kaippesi.db   # verify, keep old DB as .pre-restore, swap in
  ```
- Take a manual backup **before every server release** that changes a table.
- Render also keeps daily disk snapshots (Disks → Snapshots).
- Restore drill: once before the pilot and then monthly — restore the latest backup into a scratch DB and compare the
  row counts with `verify`.
- Keep `AUTH_SECRET` and the VAPID keys in a password manager; a restored DB is useless without them.

## 6. Rollback

| Layer | Steps |
|---|---|
| Server | Render dashboard → the service → **Events / Deploys** → pick the last good deploy → **Rollback**. Or `git revert` the bad commit and push. If the bad release changed data: stop the service, `restore` the pre-release backup, start it |
| Web / PWA | Roll back the server (it serves the web app). If the service worker cached broken files, ship the previous code with a **new** `CACHE` name so phones refetch |
| Standalone APK | Re-publish the last good APK in the `test-latest` release; for stores, upload the last good build with a higher `versionCode` (stores do not allow a lower one). Review APKs expire by themselves |
| Calculation change | Revert the commit; `CALC_VERSION` goes back with it. Saved charts record their version, so affected reports can be found |
| Rules change | Revert; or switch the rule's status back to `proposed` / disabled in `shared/rules/` |

## 7. Kill switches and feature flags (server environment)

Change them in Render → Environment; the service restarts.

| Variable | Effect | Use when |
|---|---|---|
| unset `ANTHROPIC_API_KEY` | Ask Thunai stops calling the model and answers only from reviewed templates, and says so | Any AI safety incident, cost spike or provider outage |
| `AI_MODEL` | Pins the model id | Pin before a pilot; change only with a re-run of the policy corpus |
| `AI_REQUIRE_LOGIN=1`, `AI_RATE_LIMIT` | Only signed-in users can ask; per-user rate | Abuse |
| `POLICY_MODEL_CLASSIFIER=on` | Uses the model classifier for intent routing (off = rules only) | Leave off unless reviewed |
| `SERVICES_OPEN=0` (or unset) | Seva / priest / package requests are refused | Nobody can fulfil requests (default) |
| `BILLING_ENFORCE=0` (or unset) | Free AI quota not enforced; nobody is blocked by a paywall | Payment problem, review period |
| unset `RAZORPAY_*` / `STRIPE_*` | Checkout returns `payment_setup_pending` | Payment incident |
| `TRIAL_HOURS` | One-time trial for new users (unset = off) | Campaigns only |
| `STORE_ALLOW_SAMPLE` | Sells the sample catalogue — **dev/tests only, never in production** | — |
| `AUTH_DEV_MODE` | Development login shortcuts — **never in production** | — |
| `BACKUP_DIR` | Turns on scheduled backups | Always in production |

Client-side switches with no server: the standalone APK has no AI, payments or bookings by design.

## 8. Release checklist and note

- [ ] `npm test` green in CI on the release commit
- [ ] If `CALC_VERSION` changed: benchmark re-run, ACCURACY-REPORT.md updated
- [ ] If `RULES_VERSION` changed: RULE-REGISTRY.md updated, reviewer named
- [ ] `public/sw.js` `CACHE` bumped
- [ ] Pre-release DB backup taken and verified
- [ ] Flags reviewed (§7) — `SERVICES_OPEN`, `BILLING_ENFORCE`, `AI_MODEL`
- [ ] Smoke test after deploy (§4)

Release note: date · git commit/tag · CALC_VERSION · RULES_VERSION · app build (`CACHE`, APK run number) · what
changed · flags changed · rollback target (previous deploy id and backup file).

## 9. Incidents and defects

| Severity | Examples | First response | Target |
|---|---|---|---|
| S1 | Harmful or frightening AI answer, child-safety issue, data exposure, wrong payment | Kill switch (§7) within 1 hour; rollback if code-related; inform the owner | Fix or keep disabled before re-enabling |
| S2 | Wrong calculation (date, star, dasa), broken core screen, failed backups | Roll back or hotfix; note affected `CALC_VERSION` | 2 working days |
| S3 | Wording, layout, minor bug | Normal fix in the next release | Next release |

- Intake: in-app "Report a problem" (`POST /api/feedback` with type `defect`), the review channel
  ([REVIEW-PLAN.md](REVIEW-PLAN.md)), and the admin feedback list (`/api/admin/feedback`).
- Every defect gets: reporter, screen, steps, app build, `CALC_VERSION`/`RULES_VERSION`, severity, owner, status.
- After an S1 or S2: a short written review (what happened, why, what changed, test added).
- A calculation defect always gets a regression test, and the benchmark is re-run if it touched the engine.
