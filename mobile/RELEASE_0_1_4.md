# Android 0.1.4 (5) — connected meals

Published on 4 October 2026 at 22:08 Europe/Paris to the existing Google Play **internal testing** track. On 7 October, Play Console confirmed **Accessible aux testeurs internes**. [Release details](https://play.google.com/console/u/1/developers/8530344199625899858/app/4972039956147003477/tracks/4701127957731069301/releases/5/details). No production Play rollout was made.

## Delivered

Cooking occasions, private photos and personal ratings, optional friends activity, explicit eating records, agenda, pantry batches, leftovers, connected groceries, preparation tasks and daily comparisons of six recorded nutrients against personal or clinician-prescribed bounds. Existing Kotlin/Compose architecture, native accounts, offline sync and the latest quiet-background-sync/motion changes are retained. Further clinical automation and paid/provider work were deferred by the user; [the delivery report](../MEAL_FEATURES_DELIVERY.md) describes those limits.

- Source pushed to GitHub `main`: meal implementation `2d12630`, integration with recent releases `a780e98`, deployment exclusions `595af78976f821b0da937fa6a7540c27323f7762`.
- Signed bundle: ignored `mobile/dist/recipe-buddy-0.1.4-5.aab`, 10,541,949 bytes, SHA-256 `7BDDB41BAC47AB4176656C5169E882FDF86C2C01321CF3751053C3B63F8E352D`.
- Phone APK: ignored `mobile/dist/recipe-buddy-0.1.4-5-debug.apk`, 28,088,732 bytes, SHA-256 `B4242736986935B8E4302F90634ECB53201B7B3B742B10DBBBC67D03AB811466`.
- Canonical package `com.recipebuddy.android`; existing upload key/Play signing retained. ReTrace mapping attached. Compatible device counts unchanged. Play's one nonblocking warning concerns missing native debug symbols from bundled native dependencies.
- Release notes supplied in English and French. No subscription purchase or retailer checkout occurred.

## Backend and database

The matching production backend was built and promoted to https://recipe-buddy-wauul.vercel.app: deployment `dpl_Gm59JZokTRg1pXhHpWAZCNgasRs3`, https://recipe-buddy-8682nz4v8-wauuls-projects.vercel.app.

Before migration, Neon rollback branch `before-connected-meals-2026-10-04` / `br-spring-base-aevx6i9y` was created from production with data and schema, expiring 11 October 2026 at 22:00 Europe/Paris. The three checked-in 20261004 migrations were applied through the production SQL editor in one transaction, with an advisory lock and checks of all twelve prerequisite migration checksums and completion records. Their exact checksums and completion records were inserted into Prisma history.

Preservation checks before and after migration: 21 accounts, 7 recipes and 4 legacy cooked-day records; zero invented meal kitchens. A subsequent authenticated read by the existing protected review account initialized its empty kitchen through the normal API. No real-user recipe, intake or health data was altered by verification.

The live protected review-account check passed native login, account read and connected-meals/private-diary read, then logged out. No credentials are recorded in evidence. On 7 October, canonical home/privacy returned 200 and unauthenticated meal/native-account routes returned the expected JSON 401.

## Verification and phone installation

- Merged web typecheck and all 108 tests passed; credential-pattern and whitespace checks passed.
- Signed Android debug/release APK and AAB builds, release lint and all 13 release JVM tests passed.
- Earlier isolated verification passed 14 database integration groups, 3 instrumented meal/photo/replay tests and the meal/nutrition workflow at 130% text size; see the delivery report for their exact scope.
- Samsung SM-S918B was updated in place from 0.1.3 (4) to the production-backend debug APK 0.1.4 (5). `adb install -r` succeeded, app data was retained, package metadata confirmed version 5/0.1.4 and a cold launch returned `Status: ok`. Its process had no matching fatal-exception entries in the crash-buffer check.
- The phone was locked, so visible native screens could not be verified during that installation. On 7 October no ADB device was connected. This direct installation does not establish Play-installed authentication/billing, camera or complete physical-device regression.

Local evidence is intentionally ignored: `test-results/meals/release-play-internal-0.1.4.jpg`, `release-live-api.json`, `release-production-counts.json`, `release-android-build.log`, `release-tests.log`, `release-typecheck.log`, `release-vercel-deploy.log`, `release-vercel-promote.log`, `release-phone-version.log` and `release-phone-launch.log`. Server secrets, signing keys and binaries were not pushed to source control.
