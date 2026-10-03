# Android implementation and verification — 2026-10-03

Existing website identities, password validation, private recipes, explicit friendship grants, imports, saved EN/FR translations, quantity aggregation, UTC cooked days and chef scoring are reused. Browser origin protections remain intact. Android is native Kotlin/Compose; iOS remains deferred until user device feedback and explicit continuation.

- [x] 1. Compose/Material 3 project, semantic brand tokens, localized resources, four destinations; scoped native sessions and real collection/detail.
- [x] 2. CRUD/photos/imports/settings, accepted friends and recipe grants; opaque link/QR invites and web landing; native Google Credential Manager button.
- [x] 3. Camera/picker/manual confirmation, authorized deterministic matching, optional bounded vision adapter.
- [x] 4. Cooking/progress/timers, account-local shopping and owned downloads, share-target draft handoff.
- [x] 5. Account-scoped owned-recipe launcher widget with explicit launcher routing and logout/deletion cleanup.
- [x] 6. Local boundary tests, physical-device checks/screenshots, debug APK and documented iOS handoff boundary.

Checked means implemented and locally verified as described below, **not production release completion**.

## Recorded results

| Check | Result |
| --- | --- |
| Backend unit/security tests | 62 passing (`pnpm test`) |
| Backend typecheck / lint | Passing |
| Next.js local production build | Passing with isolated test DB; no production migration helpers invoked |
| PostgreSQL integration | Eight passing groups: identity/CRUD/origin, invite concurrency/replay/expiry, authorization/matching/revocation, cooked-day/shopping, refresh replay/logout, PKCE, disabled vision/bounds, fixture vision idempotency/quota. Zero model-provider calls |
| Android build / unit | Debug APK and instrumentation APK built; three unit tests passing |
| Samsung SM-S918B, Android 16 | NativeJourneyTest and NativeBoundaryTest passed together: collection/detail/cooking/download/shopping/invites/manual matching; offline/cache/timer restoration; native widget pin/tap/replace/delete; locale/theme; logout purge; unauthenticated share draft through sign-in; manual CRUD/recreation |
| Native Google / design | NativeDesignTest passed: Google Play services account picker appeared; cancellation left no session/error; no personal identity selected or recorded. EN light and FR light/dark screens and preference recreation checked |
| Google Cloud registration | Existing project `recipe-buddy-510215`: Android debug OAuth client registered for actual package/SHA-1; existing Web client retained as token audience. See GOOGLE_SIGN_IN.md and screenshot proof |

## Local environment

Docker PostgreSQL 16 container `recipe-buddy-native-test`, loopback port 55432, disposable `recipe_buddy_test` database. Generated credentials are only in ignored `.env.native-test`. All checked-in migrations applied only there. Local server port 3002 is mapped by USB `adb reverse`; the installed debug APK needs that server/USB connection. JBR 21.0.11 and installed Android SDK 36 were used. APK path and staging build instructions are in README.md.

No production DB writes, deployment, release signing, store publication or paid recognition calls occurred. Google OAuth registration was separately authorized by the user. Website production has not yet received these native routes or the additive migration.

## Remaining release/device boundaries

Personal-account Google consent and signed-token happy path need user testing against the matching backend. Play/release certificates need their own Android OAuth registration. HTTPS staging/production release and App Links association remain unverified. Actual photo permission/capture/vision model output, end-to-end timer notification delivery, TalkBack/large-font coverage and performance profiling remain device/release checks. Vision stays explicitly disabled until quota/model authorization; fixture recognition is labelled, never presented as real provider output.

UI changes and inspected screens are recorded in UI_REVIEW.md. iOS handoff uses API.md, DECISIONS.md and Android feedback; no SwiftUI project or iPhone binary has been created.

## 2026-10-03 second UI/cooking/publication revision

Supersedes the first UI pass's small fallback art and widget shortcut. Image-first collection/detail/ingredients, unified camera/gallery sheet, full web category scenes, Ingredients leaf and spacing revisions are implemented. Friends now separates full-name chef rows from shared recipe cards. QR is compact forest green with rounded modules/finder frames, four-module white quiet zone and a secondary connection-method sheet; physical decode checks pass at 1024 and 240 pixels.

Voice Chef provides local technique coaching, installed offline TTS, optional short on-device commands, repeat/explain/ingredients/preview and original fictional roasts. It uses the selected app language. No microphone data or transcripts are stored/uploaded. Widget instructions and progress work locally from the launcher; Next/Previous checks pass without opening the app. Account/terms/deletion/report/block and canonical native/web EN/FR legal documents are implemented; operator supplied owner Wae Fezari, France and waelfezari@gmail.com.

Backend: Next 15.5.27 production build passed, including new legal/deletion/maintenance routes and async request APIs. Backend tests: 65 passing; typecheck and lint pass. Ten isolated PostgreSQL integration groups pass, including deletion, stable reauthentication, revoked sessions, blocks and reporting authorization. Production dependency audit reports zero known vulnerabilities. No production DB writes or vision-provider calls occurred.

Android debug/unit/lint and an unsigned, shrunk release bundle build passed during this revision. Final UI/language/widget verification and exact final build results are recorded below after completion. Upload signing still requires the owner's external key. PUBLICATION.md distinguishes implemented controls from the deployment, store and operator tasks still required.

## Final Android web parity and mobile printing removal

WEB_PARITY.md records the complete web feature inventory and native entry points. Native apron reviews/scoring, all seven original badges and bilingual descriptions, weekly cooking progress, friend kitchens, twists, comments/replies, sharing status, full search, password signup, bilingual FAQ and roast/translation actions are implemented. Mobile printing, its source/menu/strings and FAQ entry are removed at the user's explicit request; web printing remains.

Final source: backend production build, 65 unit tests, typecheck/lint and 11 isolated PostgreSQL integration groups pass, including translated-title filtering and ordered translation output. No model-provider requests. Android debug/instrumentation APK, seven unit tests, debug/release lint and R8 release AAB build pass. Jarsigner confirms the AAB is unsigned. Both debug APKs installed successfully on the Samsung.

NativeParityTest passes in 30.991 s on SM-S918B/Android 16: chef roadmap, only authorized friend's shared recipes, review create/update/remove, twist/reply/comment and moderation cascade, EN/FR tabs, search and no mobile print entry. Earlier search attempts timed out/disabled because the test used Back without a visible keyboard; the final test asserts typed text and submits directly. NativeProductTest's Friends/legal/Voice Chef/QR/launcher control method passes in 20.138 s on the same build; real widget Previous/Next remains on the launcher. Rendered parity screenshots are in screenshots/review/web-parity-01.jpg.

No deployment, store publication, production model call or release signing occurred. The installed debug APK still uses USB-reversed local server 3002. This is Android verification; iOS remains unstarted.

Final French/dark Friends and QR check passes independently in 3.156 s, including installed offline French speech/fr-FR command locale and switching back to English/en-US. Retries first encountered a destroyed reused activity and then an English-screen assumption while French was retained; resetting the test task and making the locale check independent of initial language resolved those harness failures. No app-source changes were needed.

NativeJourneyTest passes on the final build in 12.704 s: collection/detail/cooking and back navigation, downloaded recipe, shopping, invite creation, manual ingredients/matching and recreation. Its first retry tried to locate an offscreen lazy-list item before scrolling; scrolling the detail list to Add to shopping resolves that test issue. Final diff whitespace check passes; native main source contains no print references and RecipePrint.kt is absent.

## Authorized live backend connection — 2026-10-03

The backend and two additive migrations are now deployed to the existing website/database, with a pre-migration Neon rollback branch. The production-URL debug APK is installed; USB reverse for the local server was removed. Live web-cookie/native authentication returns the same temporary recipe ID. Physical NativeLiveBackendTest passes in 14.11 s over public HTTPS. Temporary test account, recipe and sessions were deleted; original totals remain 17 accounts and 5 recipes. Legal/deletion URLs, authenticated privacy maintenance and Samsung App Links verification pass. No model calls or Play submission. LIVE_BACKEND.md supersedes earlier undeployed/local-only status and records exact release IDs and remaining store checks.
