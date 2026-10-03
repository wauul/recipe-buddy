# Android publication preparation — 2026-10-03

**Current product status:** Recipe Buddy already exists in Play Console on its internal testing track. Monthly and yearly Pro base plans are active at €9.99 and €99.99 respectively in euro-priced regions. The restricted billing service account has Recipe Buddy app permissions to read app/financial data and manage orders/subscriptions; it has no publishing permissions or Cloud project roles. Its private key and token encryption key are sensitive production Vercel variables. See [PRODUCT_FIXES.md](PRODUCT_FIXES.md) for the newer offline and voice behavior. This session installed a debug update on Samsung; it did not upload a new Play release or complete a real paid purchase.

Owner: **Wae Fezari, France**. Support, privacy, moderation and child-safety contact: **waelfezari@gmail.com**. Android is the active platform; iOS has not been built or submitted.

**Live backend update:** On 2026-10-03 the user authorized production connection. Both additive migrations, native API/authentication, legal/deletion routes and privacy cron are deployed to the existing web project/database. The Samsung runs the canonical HTTPS URL without USB reverse; live web/native identity and recipe reads pass. [LIVE_BACKEND.md](LIVE_BACKEND.md) supersedes the earlier deployment status below. Store signing/submission and operator checks remain outstanding.

## Implemented

- EN/FR privacy and terms, accessible in native Settings and before login. Public website routes `/privacy`, `/terms`, `/delete-account`; account deletion can be requested without installing the app. Versioned terms acceptance is required before creating/sharing user content.
- Authenticated deletion with the current password or a fresh five-minute sign-in. Refreshing an access token does not reset that sign-in age. A transaction removes active account data, contributions, photos, connections, shares, linked identities, sessions and attributable scans/reports. Native local data, credentials, downloads, timers and widgets are cleared. Deleted web sessions are rejected on their next request. Other offline devices cannot be remotely wiped until they reconnect.
- In-app recipe/chef reports, chef blocking and unblock list. Blocking revokes the friendship and its shares. Reads check blocks in both directions, including matching and shopping access. Reports remain private to the operator.
- Strict cookie origin checks, bounded request bodies, existing ownership checks and database rate limits. Native tokens are accepted only by the native adapter; tokens rotate and replay revokes the session. Google uses Credential Manager plus server nonce/audience verification.
- Android Keystore credentials, disabled backup, private account storage, loopback-only debug HTTP exceptions, HTTPS release checks, nonexported widget step receiver and permission-scoped camera use. Playback uses installed offline voices. Explicit Pro commands use the phone's recognition service and send recognized text to advanced AI after consent; the app does not retain audio/transcripts.
- Next.js 15.5.27 and updated production transitive dependencies. Production audit reports zero known vulnerabilities at this check; that is not a penetration-test claim. Security headers include nosniff, frame denial, referrer policy, permissions policy and HTTPS HSTS.
- Release builds shrink code/resources; both EN/FR resources remain bundled for in-app language switches. Upload signing is configured exclusively through external environment values, never committed credentials.

## Deployment order

1. Provision a verified staging environment and backup the intended database. Apply **both** additive migrations with `prisma migrate deploy`: `20261003000000_native` and `20261003010000_publication_controls`. The deployed production database has the native, publication, Pro and offline-sync migrations; the guarded release helper confirms their recorded checksums.
2. Configure `NEXTAUTH_URL`, separate strong `NEXTAUTH_SECRET`/`NATIVE_SESSION_SECRET`, Google Web audience/client secret, release certificate `ANDROID_CERT_SHA256`, and HTTPS hosting. Keep vision disabled until its model, quota and provider use are approved. Never copy server secrets into the APK.
3. Configure a random `CRON_SECRET` of at least 32 characters. The checked-in Vercel cron schedule runs daily at 03:00 UTC and calls `GET /api/maintenance/privacy` with `Authorization: Bearer <secret>`. Do not place the secret in a URL. The handler purges expired counters/scans/auth attempts/sessions and reviewed reports older than 30 days; open reports require operator review. The schedule and production CRON_SECRET are deployed; verify execution through Vercel monitoring.
4. Confirm actual Vercel/Neon log and backup retention, processor agreements, transfer safeguards and the operator's required public legal identity details. Replace the policy's retention wording with those confirmed periods before public release. The current owner/country/email were supplied by the user; no postal address or backup duration was invented.
5. Deploy the matching website/backend. Confirm the three public legal/deletion URLs, authenticated deletion, terms acceptance and moderation against staging, then production. The matching backend is deployed; a disposable production account verified billing readiness, account reads, offline replay and deletion.
6. Register the final upload/Play app-signing SHA-1 with Google's Android OAuth client. Serve the matching SHA-256 in `/.well-known/assetlinks.json`, build for the same host and verify actual App Links. Debug OAuth registration is not release registration.

## Upload signing and store checklist

From `mobile/android`, use `:app:bundleRelease -PbackendUrl=https://VERIFIED_HOST -PappLinkHost=VERIFIED_HOST`. Supply these environment values from a secure local/CI secret store:

- `RECIPEBUDDY_UPLOAD_KEYSTORE`: absolute path outside the repository
- `RECIPEBUDDY_UPLOAD_STORE_PASSWORD`
- `RECIPEBUDDY_UPLOAD_KEY_ALIAS`
- `RECIPEBUDDY_UPLOAD_KEY_PASSWORD`

Without these values the release bundle is unsigned and cannot be uploaded. Back up the upload key securely and enable Play App Signing. Package: `com.recipebuddy.android`; current versionCode 1/versionName 0.1.0. Increase versionCode for subsequent uploads. Play Console already contains the internal-testing app; this session did not submit a new bundle.

Complete Play app access/test credentials, privacy URL, external deletion URL, Data safety, content rating/target audience, permission declarations where applicable, store listing/icon/screenshots and the account's required testing track. The current terms specify age 16+. A declaration is not evidence of a passed Play review. Follow the requirements shown for this developer account rather than assuming eligibility.

Data inventory for the declarations:

| Data / permission | Current behavior |
| --- | --- |
| Email, chef name, optional Google identity | Account/authentication; shared chef name visible to connected chefs |
| Recipes/photos/contributions/shares/activity | Server account content; explicit recipe sharing; deletion supported |
| Ingredient recognition / recipe AI | Optional provider processing only on explicit actions; manually entered recipes work without it |
| Microphone | Optional Pro commands through the device speech service, which may process audio remotely; recognized text sent to advanced AI after consent; no app audio/transcript retention; tap controls remain available |
| Camera / system photo picker | User initiated; photos re-encoded before upload; cancellation cleans temporary capture files |
| Local shopping/downloads/widget/progress | Account-scoped on-device data; selected widget instructions visible on an unlocked launcher |
| Security counters and abuse reports | Server-side security/moderation, private operator access and documented maintenance |
| Advertising / analytics | No Android advertising or analytics SDK. Website Vercel analytics/performance processing is covered separately |

Configure a monitored moderation queue for `ContentReport(status='open')`, restricted operator access, response/escalation procedures and the published support mailbox. The app has reporting/blocking and public prohibited-content standards; it does not yet have a deployed moderator dashboard or automatic report notification. Follow [Play's UGC policy](https://support.google.com/googleplay/android-developer/answer/9876937) and [account deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111).

## Evidence and remaining checks

Local backend unit/integration checks include deletion, stale/other sessions, terms, blocked access, invite races and reporting authorization. Physical Samsung checks cover native Friends/QR, legal/deletion confirmation UI, voice explanation controls and launcher step changes. Styled QR decode checks pass at 1024 and 240 pixels.

Before live publishing: run a Play-installed signed build against deployed HTTPS; complete personal Google token exchange, real camera/optional recognition, spoken microphone commands in EN/FR, notification delivery, accessibility/large text and actual moderator/deletion support response checks. Debug fixture tests do not establish those results. See `IMPLEMENTATION.md` and `UI_REVIEW.md` for exact completed checks.

Policy references: [CNIL mobile recommendations](https://www.cnil.fr/fr/recommandations-applications-mobiles), [Android release preparation](https://developer.android.com/studio/publish/preparing), [Android on-device speech recognition](https://developer.android.com/reference/android/speech/SpeechRecognizer).
