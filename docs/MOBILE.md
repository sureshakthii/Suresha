# Mobile apps: Google Play, App Store and Huawei AppGallery

This guide is for the app owner, so it explains each step in plain terms. Follow the steps in order.

## How the store apps work

There is only **one** app: the web app (PWA) that runs on your server. The Android and iOS apps are
thin native "wrappers" built with [Capacitor](https://capacitorjs.com). When someone opens one:

1. The **splash screen** shows the logo on the dark purple background (`#0b0620`).
2. The app opens your deployed website, for example `https://kaippesi.example.com`.
3. If the phone is offline, a Tamil screen appears instead: **"இணைய இணைப்பு இல்லை"** (no internet)
   with a **"மீண்டும் முயற்சி · Retry"** button. It also retries by itself when the network comes back.

Because the apps load the live website, **every server deploy updates the apps straight away**. You only
need a new store release when native things change: the icon, the name, permissions, plugins, or the
Capacitor version.

| File / folder | What it is |
|---|---|
| `capacitor.config.json` | App id `app.kaippesi.jothidar`, the name, the website URL, splash and status-bar settings |
| `mobile/prepare.mjs` | Writes `mobile/www` (the offline launcher page) and puts `KJ_APP_URL` into `capacitor.config.json` |
| `mobile/make-native-icons.mjs` | Makes the Android and iOS icons and splash images from the logo (`npm run mobile:icons`) |
| `android/` | Android Studio project. The same build is used for Google Play and Huawei AppGallery. |
| `ios/` | Xcode project for the App Store. Plugins come through Swift Package Manager, so no CocoaPods is needed. |
| `.github/workflows/mobile.yml` | Builds the APK/AAB and an unsigned iOS archive on GitHub |

---

## Step 1: Deploy the server first

The apps are only as good as the website they open. Follow [DEPLOY.md](DEPLOY.md) until
`https://<your-domain>/api/health` shows `{"ok":true,...}` in a browser. The site must use **HTTPS**,
because both stores require it.

## Step 2: Set `KJ_APP_URL`

`KJ_APP_URL` is the public address of the server, such as `https://kaippesi.example.com`, with no
trailing slash.

- **GitHub (recommended):** go to repository → **Settings → Secrets and variables → Actions →
  Variables** → **New repository variable**. Set the name to `KJ_APP_URL` and the value to your URL.
- **On your own computer:**
  ```bash
  export KJ_APP_URL=https://kaippesi.example.com   # Windows PowerShell: $env:KJ_APP_URL="https://..."
  npm run mobile:android                            # or: npm run mobile:ios
  ```

`npm run mobile:prepare` writes the URL into `capacitor.config.json` (`server.url`). It also lets the app
open your domain and the payment pages (`checkout.razorpay.com`, `api.razorpay.com`,
`checkout.stripe.com`) inside the app. The app opens any other link in the phone's browser.

## Step 3: Build the Android app

### Option A: GitHub Actions (no Android Studio needed)

1. **Create an upload key once** and keep it safe forever. If you lose it, you cannot update the app.
   On any computer with Java installed, run:
   ```bash
   keytool -genkeypair -v -keystore kaippesi-upload.jks -alias kaippesi -keyalg RSA -keysize 2048 -validity 10000
   base64 -w0 kaippesi-upload.jks > keystore.b64      # macOS: base64 -i kaippesi-upload.jks > keystore.b64
   ```
2. Under repository → **Settings → Secrets and variables → Actions → Secrets**, add these secrets:
   - `ANDROID_KEYSTORE_BASE64`: the contents of `keystore.b64`
   - `ANDROID_KEYSTORE_PASSWORD`: the keystore password
   - `ANDROID_KEY_ALIAS`: `kaippesi`, or the alias you chose
   - `ANDROID_KEY_PASSWORD`: the key password. If it is the same as the keystore password, you can leave this out.
3. Go to **Actions → Mobile apps → Run workflow**, or push a tag such as `v1.0.0`.
4. When the run finishes, download the artifacts:
   - `android-aab` → `app-release.aab`. **Upload this file to Google Play.**
   - `android-apk` → `app-release.apk` (for Huawei, or for sharing with testers) and `app-debug.apk`
     (for quick testing on your own phone).

If the secrets are missing, the build still runs, but the release files are **unsigned** and the stores
reject them.

### Option B: Android Studio

1. Install [Android Studio](https://developer.android.com/studio). It includes Java 21 and the Android SDK.
2. In the project folder, run `npm ci`, then `KJ_APP_URL=https://... npm run mobile:android`, then
   `npm run mobile:open:android`.
3. To test, plug in a phone and press ▶ Run. To publish, use **Build → Generate Signed App Bundle / APK**.

### Version numbers

Every store upload needs a higher `versionCode`. Change it in `android/app/build.gradle`:
`versionCode 1` → `2`, and `versionName "1.0.0"` → `"1.0.1"`. For iOS, change the version in Xcode under
**App target → General → Version / Build**.

## Step 4: Publish on Google Play

1. Create a [Google Play Console](https://play.google.com/console) developer account. There is a
   **one-time registration fee** (US$25 at the time of writing). New personal accounts must also run a
   closed test with testers before they can publish to everyone. Check the current rules in the Console.
2. **Create app** → name **கைப்பேசி ஜோதிடர்**, default language Tamil, type App, Free.
3. Fill in **App content**:
   - **Privacy policy URL** (required). Host a page on your site, for example `https://<domain>/privacy.html`.
     Say what you collect: phone/email for login, birth details, location when the user taps "Use my
     location", and payment records.
   - **Content rating** questionnaire. Astrology usually falls in the general/utility category.
   - **Data safety** form. Declare: phone number/email (account), name and birth date/time/place (app
     functionality), approximate/precise location (optional), purchase history (if you take payments),
     and that data is encrypted in transit (HTTPS). Say whether users can request deletion.
   - Target audience, ads (none), and government/financial declarations (none).
4. Add the **store listing**: short and full description (Tamil and English), the 512 px icon
   (`public/icon-512.png`), a 1024×500 feature graphic, and at least 2 phone screenshots.
5. **Testing → Internal testing** → create a release → upload `app-release.aab` → add testers. When it
   works, promote it to **Production**.
6. Let **Play App Signing** manage the final signing key (the default). Your `.jks` file is then only the
   *upload* key.

## Step 5: Publish on Huawei AppGallery

Huawei phones sold since 2019 have **no Google services**. The app still works on them, because it is a
web wrapper that does not need Google Play Services. **Use the same build**; you do not need a separate one.

1. Register at [AppGallery Connect](https://developer.huawei.com/consumer/en/service/josp/agc/index.html).
   Registration is free, and identity verification takes a few days.
2. **My apps → New app** → Android, package name `app.kaippesi.jothidar`.
3. Upload the **signed `app-release.apk`**, or the `.aab`. AppGallery accepts both; with an AAB you must
   turn on AppGallery's app signing.
4. Fill in the same privacy policy, content rating, screenshots and description, then submit for review.

**Push notifications on Huawei:** Google push (Firebase Cloud Messaging) does **not** work on Huawei
devices without Google services. To add native push on Huawei later, use **HMS Push Kit**. Until then, the
morning alarm and trip reminders work for Huawei users who install the web app from **Huawei Browser** or
Chrome (see [Install without any store](#install-without-any-store)). If you ever need a Huawei-only native
build (for example, with HMS Push Kit), add a Gradle `productFlavors { google {} huawei {} }` block to
`android/app/build.gradle`. You do not need it today.

## Step 6: Publish on the Apple App Store (needs a Mac)

You cannot do this step on Windows or Linux. You need:

- A **Mac with Xcode** (free from the Mac App Store; use the latest version).
- The **Apple Developer Program**, an **annual membership** (US$99/year at the time of writing):
  <https://developer.apple.com/programs/>.

Steps:

1. On the Mac, run `npm ci`, then `KJ_APP_URL=https://... npm run mobile:ios`, then `npm run mobile:open:ios`.
   Xcode downloads the Capacitor Swift packages on first open.
2. In Xcode, select the **App** target → **Signing & Capabilities**. Choose your Team and keep the bundle
   id `app.kaippesi.jothidar`. To use native push later, also add the **Push Notifications** capability.
3. Choose **Any iOS Device**, then **Product → Archive**, then **Distribute App → App Store Connect → Upload**.
4. In [App Store Connect](https://appstoreconnect.apple.com), create the app, add screenshots
   (6.7" and 5.5" iPhone), the privacy policy URL and the **App Privacy** answers (the same data as in
   Play's Data safety form), then submit for review.

The GitHub workflow's `ios` job builds an **unsigned** archive. It only proves that the project compiles.
App Store upload needs Apple signing, which happens in Xcode (or later in CI with an App Store Connect API
key and certificates).

### App Store guideline 4.2 (minimum functionality)

Apple rejects apps that are "just a website in a wrapper". This app adds:

- A native splash screen, status bar and icons, plus an offline launcher screen with retry.
- Native push notifications through `@capacitor/push-notifications` (APNs on iOS, FCM on Android) for the
  morning alarm and trip reminders.
- Location, used for sunrise, Rahu Kalam and the Panchangam.

**Important:** today the morning alarm uses **Web Push**, and Web Push does **not** run inside the
Android or iOS app WebView. Native push needs two more pieces of work before you submit to Apple:

- **Web app:** when it runs inside the native app (`window.Capacitor?.isNativePlatform()`), it should call
  `Capacitor.Plugins.PushNotifications.requestPermissions()` and `register()`, and send the device token
  to the server.
- **Server:** it must send through FCM (Android) and APNs (iOS). Android also needs a Firebase project
  with `android/app/google-services.json`; the build picks it up automatically when present.

Without this work, Apple may reject the app under 4.2. Keep the review notes clear about the native
features.

### ⚠ In-app purchases: a business/legal decision for you

The app sells **digital subscriptions** (Premium / Family plans: extra AI answers) through Razorpay and
Stripe. Inside the store apps:

- **Apple App Store** (guideline 3.1.1) generally requires **Apple In-App Purchase** for digital content
  and subscriptions. Using Razorpay/Stripe for them inside the iOS app can lead to rejection.
- **Google Play** generally requires **Google Play Billing** for digital goods and subscriptions, with
  some regional alternative-billing programmes (including India) under their own conditions.
- **Physical goods and real-world services** may use Razorpay/Stripe in both stores. That covers the pooja
  store, priest bookings and annadhanam.

The options are to add Apple/Google billing, to hide subscription purchase inside the store apps (sell it
only on the website, where the rules allow it), or to apply for an alternative-billing programme. **Decide
this with legal advice before you submit.** The rules and fees change often.

### Other things to know

- **Facebook login** does not work inside app WebViews, because Facebook blocks embedded logins. In the
  store apps, users should sign in with **mobile or email OTP**.
- **Voice input** (Tamil speech) depends on the WebView. It may be unavailable in the Android app even
  though it works in Chrome.
- The app needs the internet. Charts that were cached by the website's service worker may still open
  offline, but the first launch always needs a connection.

---

## Install without any store

Users can install the web app directly. It works like an app, with an icon, full screen and notifications:

| Phone | How |
|---|---|
| **Android (Chrome)** | Open your site → menu ⋮ → **Install app** (or **Add to Home screen**) |
| **iPhone / iPad (Safari)** | Open your site → **Share** button → **Add to Home Screen**. Push notifications need iOS 16.4+ and only work after this step. |
| **Huawei (Huawei Browser)** | Open your site → menu ☰ → **Add to home screen** (or use Chrome if it is installed) |

## Updating the icons

When the logo (`public/icon.svg` / `public/icon-512.png`) changes, run:

```bash
npm run mobile:icons      # rewrites android/…/mipmap-*, splash images and ios/…/AppIcon
```

Then commit the changed images and make a new store release.

## Developer reference

```bash
npm run mobile:prepare        # write mobile/www + server.url from KJ_APP_URL
npm run mobile:android        # prepare + npx cap sync android
npm run mobile:ios            # prepare + npx cap sync ios
npm run mobile:open:android   # open Android Studio
npm run mobile:open:ios       # open Xcode (macOS)
```

- Capacitor 8: Android needs **JDK 21**, compileSdk/targetSdk 36 and minSdk 24. iOS needs a recent Xcode
  and iOS 15+.
- Release signing reads `ANDROID_KEYSTORE_FILE`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` and
  `ANDROID_KEY_PASSWORD` from the environment (see `android/app/build.gradle`).
- For LAN testing, `KJ_APP_URL=http://192.168.1.10:3000` works, because the app then allows cleartext.
  Never ship an `http://` URL.
