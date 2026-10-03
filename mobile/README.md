# Recipe Buddy Android

The latest offline, input, Voice Chef, invitation and Pro changes are recorded in [PRODUCT_FIXES.md](PRODUCT_FIXES.md). Signed **0.1.1 (2)** is available to internal testers on Google Play; see [RELEASE_0_1_1.md](RELEASE_0_1_1.md). Pro has active Google Play plans at €9.99/month and €99.99/year, with backend purchase verification. `dist/recipe-buddy-product-fixes-debug.apk` is the Samsung test build. Local screenshots and packaged binaries are intentionally excluded from Git; source, build tooling, tests and documentation are versioned.

The 3 October native redesign is documented in [DESIGN_REVIEW.md](DESIGN_REVIEW.md), with a screenshot gallery in [DESIGN_GALLERY.html](DESIGN_GALLERY.html). It preserves the original brand while simplifying every destination, pinning key actions, and restoring unfinished new recipes. The downloadable debug build is `dist/recipe-buddy-redesign-debug.apk`; it uses the existing HTTPS backend. Review verification used a separate `.design` emulator install and disposable local fixture accounts.

The native web-feature inventory is in [WEB_PARITY.md](WEB_PARITY.md): chef score and all seven original badges, apron reviews, friend kitchens, twists, threaded comments, search, sharing controls, account creation and bilingual help. Mobile printing is removed at the user's request; the web app retains its print layout.

Native Kotlin/Compose app; package `com.recipebuddy.android`, minimum Android 8/API 26, compile/target installed stable API 36. No WebView shell. iOS has not been started; wait for Android phone feedback and explicit continuation.

## Build

Verified tooling: Gradle wrapper 8.13, Android Gradle plugin 8.13.0, Kotlin/Compose compiler 2.2.20, Compose BOM 2025.09.01, JBR 21.0.11, SDK/build tools 36.0.0. AGP compatibility was checked in [Android's release notes](https://developer.android.com/build/releases/agp-8-13-0-release-notes). Dependencies are pinned in `android/app/build.gradle.kts`. Original Bricolage Grotesque converted from the bundled website font; license in `android/BRICOLAGE-OFL.txt`.

PowerShell from `mobile/android`:
```powershell
$env:JAVA_HOME='C:\Users\Waul\.jdks\jbr-21.0.11'
# Set your installed SDK in ignored local.properties: sdk.dir=C:/.../Android/Sdk
.\gradlew.bat :app:assembleDebug :app:testDebugUnitTest
```
APK: `mobile/android/app/build/outputs/apk/debug/app-debug.apk`. Supply staging configuration:
```powershell
.\gradlew.bat :app:assembleDebug -PbackendUrl=https://YOUR_STAGING_HOST -PappLinkHost=YOUR_STAGING_HOST
adb install -r app/build/outputs/apk/debug/app-debug.apk
```
The installed debug APK now uses `https://recipe-buddy-wauul.vercel.app`, the website's existing production backend and database. Mobile routes and both additive migrations are deployed; existing web accounts can sign in. USB reverse was removed and a live login/recipe read passed on the Samsung. [LIVE_BACKEND.md](LIVE_BACKEND.md) records the deployment, rollback point and checks. Debug builds offer a HTTPS staging base URL in the sign-in screen; release UI hides this developer setting.

## Backend setup

Use an isolated DB. Required server names: `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `NATIVE_SESSION_SECRET`; optional existing `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GROQ_API_KEY`; recognition names `VISION_ENABLED`, `VISION_MODEL`, `VISION_DAILY_QUOTA`; App Links `ANDROID_CERT_SHA256`. Never put server secrets into Gradle/resources/APKs.

Apply checked-in migrations on that environment before serving the native routes. The ordinary build includes production-only migration/repair helpers; their guards skip local/preview. Do not build with `VERCEL_ENV=production` against an unintended DB. [API.md](API.md) describes routes and security boundaries.

This session's local test setup uses Docker container `recipe-buddy-native-test`, PostgreSQL 16, loopback port 55432 and database `recipe_buddy_test`; generated credentials live only in ignored `.env.native-test`. No production connection is used. With Docker running, from the repository root:
```powershell
pnpm exec dotenv -e .env.native-test -- prisma migrate deploy
node --env-file=.env.native-test node_modules/next/dist/bin/next dev -p 3002 --hostname 0.0.0.0
# In another shell:
pnpm exec dotenv -e .env.native-test -- tsx scripts/test-native-integration.ts
adb reverse tcp:3002 tcp:3002
```
Build local-device APK with `-PbackendUrl=http://127.0.0.1:3002`. Only debug allows HTTP on loopback/emulator addresses; release requires HTTPS. USB reverse maps the phone's port to this computer. Emulator can use `http://10.0.2.2:3002`. For a phone over Wi-Fi, provide reachable HTTPS staging; its localhost is never the computer. No broad cleartext LAN exception exists.

Disposable test account: `native-a@example.test` / `NativeTestOnly-2026` (B/C variants are separate fixture chefs). The fixture runner explicitly refuses any DB except this loopback test database and refuses a configured Groq key. It resets test recipe/friend rows and rate-limit state **only in this isolated DB**. Do not point it at real accounts. `VISION_ENABLED=false`: tests make zero paid/provider requests.

## Links and signing

`https://HOST/invite/TOKEN` is the QR/share URL. Android scans validate scheme, exact configured host/path and token shape before any request. System browser account creation callback is the allowlisted `recipebuddy://auth`, protected by state/S256 PKCE/single-use code. The Google button uses Android Credential Manager directly; see [GOOGLE_SIGN_IN.md](GOOGLE_SIGN_IN.md) for its verified Android registration and server token checks. It retains the website's verified-email account-linking policy.

Obtain debug/release SHA-256 cert fingerprints with `gradlew :app:signingReport`. Set comma-separated uppercase colon-separated fingerprints in server `ANDROID_CERT_SHA256`. `/.well-known/assetlinks.json` serves only valid configured fingerprints for `com.recipebuddy.android`; empty config returns an empty association, not a fake verification. Use your own release keystore; never commit it. Build `-PappLinkHost` for the same host. After deploy, check `adb shell pm get-app-links com.recipebuddy.android` and test actual HTTPS links. Association is not verified against the undeployed production domain.

## Phone checks

1. Sign in to the local test or configured staging account; collection → add manual recipe → save → edit → relaunch. Production account testing remains a staging/release step.
2. Invite a second chef with QR/link; preview before Accept. Share one recipe through its menu; other recipes remain private. Remove share/friend and check access again.
3. Ingredients: take/pick photo, preview; Analyze only after consent. With recognition disabled/quota exhausted, manual entry → confirmation → saved matches → missing items to Shopping still works. Select pantry staples explicitly; check quantities.
4. Open the app online once, then test recipes, shared recipes, pantry, cooking progress and shopping offline. Edits persist locally and synchronize on reconnect; conflicts offer explicit recovery. Force-stop and reopen to test durable edits. Shared content is removed when a subsequent connection reveals access was revoked.
5. Android Share menu → Recipe Buddy for HTTPS recipe URL/text. Review/manual editor resumes through login; Parse is optional and may be unavailable without AI. Saving always requires confirmation.
6. Owned recipe menu → Add to home screen, or launcher Widgets → Recipe Buddy. Select/replace recipe in widget configuration. The media/header opens detail; labelled Open app opens cooking. Previous/Next updates steps directly on the launcher. Explicit configuration stores an offline instruction snapshot; the widget never marks cooked or starts timers. Verify logout/deletion clears snapshot.

Timer deadlines and steps persist in Room. Precise alerts need Android's exact-alarm special access; notification denial disables background notification display. Without precise access Android may delay inexact alarms. No WorkManager countdown clock, continuous widget polling or automatic model calls. Force-stop can suppress Android alarms until the app is opened; OS controls widget refresh.

## Verification / limitations

See [IMPLEMENTATION.md](IMPLEMENTATION.md), [UI_REVIEW.md](UI_REVIEW.md) and `screenshots/` for recorded results. Shared recipes, Google sign-in, imports/recognition and invitation domain association require their matching configured backend/services; fixture/manual paths are identified separately. Private caches/credentials are excluded from backup and purged on sign-out/account change. Server revocation cannot erase information already copied into a shopping snapshot.

Deferred website features: advanced discussion/twist/review editing and account-provider management. No meal calendar, chat, feeds or new achievements. Pro subscriptions are implemented. iOS handoff: reuse `API.md`, tokens, authorization/matching rules and Android phone feedback; create SwiftUI/Keychain/WidgetKit/Share Extension only after explicit continuation. A macOS/Xcode build environment is required for an honestly validated iPhone binary.

## Cooking and account update

Friends uses separate Your chefs / Shared with you tabs; chef actions offer explicit recipe sharing, report and block. Invitation automatically displays a large QR, with a friendly localized sharing message, bounded public-name suggestions as you type, and an embedded QR-only scanner. Codes expire in seven days and are single-use; replacing a code revokes the old invitation.

The cooking widget now contains recipe photography or the original kitchen illustration, visual step progress, readable scrollable instructions, and Previous/Next controls that stay on the launcher. Open app is a separate labelled action over the media. Pinning/configuring stores an owned recipe instruction snapshot locally; logout/account deletion clears it. Use the larger widget size so the media and instructions have room.

Voice Chef reads only the current step after an explicit tap, using an installed offline voice. Advanced AI explanations and voice commands require Pro. Commands use the phone's speech recognition service (which may process audio remotely), then send the recognized text to the backend's advanced AI classifier after explicit consent. Recipe Buddy does not retain microphone audio or command transcripts. Playback stops on step changes, backgrounding and leaving cooking. Previously requested explanations are cached for offline reuse.

Settings includes privacy, terms, support, blocked chefs and authenticated account deletion. Legal documents are also available before login and on the website. PUBLICATION.md records the concrete security, deployment, signing, store and operator requirements; the fixture APK is not a production release.
