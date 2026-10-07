# Connected meals local delivery

**Release update, verified 7 October 2026:** the user authorized shipping the completed work and deferred the remaining scope. The matching backend is deployed, source is pushed to GitHub `main`, Android **0.1.4 (5)** is available on the existing Play internal-testing track, and its production-backend debug APK was installed in place on the Samsung. See [the release record](mobile/RELEASE_0_1_4.md) for actual deployment/migration/build evidence and phone verification limits. The local-review status below records the original handoff and is superseded by that release record; the clinical, provider and software limitations remain applicable.

4 October 2026. Core cooking/meal-planning workflows and the added daily nutrition/target workflow are implemented across the existing website and native Kotlin/Compose app. This is a local review delivery. The assignment is not fully release-complete: paid/provider paths, clinical capabilities and the remaining verification/software limits below are individually identified.

## Builds and review

- Website: production build in `.next`, running at http://localhost:3003 against the isolated loopback PostgreSQL test database. Exact guarded setup/build/run commands are in [the implementation guide](MEAL_FEATURES_IMPLEMENTATION.md).
- Android: [installable review APK](test-results/meals/artifacts/Recipe-Buddy-connected-meals-review-2026-10-04.apk). Debug signed; application id `com.recipebuddy.android.meals`; backend `http://127.0.0.1:3003`. It coexists with the normal app and requires the local backend plus `adb -s emulator-5554 reverse tcp:3003 tcp:3003` on the selected emulator. It is not a store release or a production-backend APK.
- [Artifact manifest](test-results/meals/artifacts/manifest.json) records SHA-256, size, backend and web build id. Generated environment secrets and signing material are excluded.

Review identities are labelled fixtures, not real health histories or retailer orders. The production database, deployment, Git push and store submission were not changed. Existing unrelated working-tree changes were preserved.

## What works

Repeated cooking occasions atomically save scaled ingredient snapshots and reversible pantry effects. Personal photo/rating/comment are optional and private; eating is separately recorded. Explicit friends posts select their published fields and recheck current friendship/block/media access. Plans allocate stock virtually, track diners, external meals, leftovers, readiness and generated groceries. Partial actual purchases and receipts add pantry stock once. Check-ins and linked preparation tasks use existing idempotent operations, including partial ingredient use credited against final cooking.

Daily assessment compares recorded energy, carbohydrate, protein, fat, sodium and salt against configured personal or clinician-prescribed bounds. Actual-portion composition retains its source. A complete-day attestation is required and recorded-intake changes invalidate it. Unknown nutrients remain unknown, including when another nutrient is complete. Targets retain exact bounds, source, issue/review dates and explicit prescription confirmation. Child/clinical profiles require prescribed targets. Native date selection supports past-day assessment; EN/FR numeric entry does not silently discard malformed bounds.

This is a comparison of supported recorded nutrients. Full vitamin/mineral adequacy, automatic individualized reference-target generation and therapeutic prescribing are not delivered. Entered prescription references are user declarations, not independently verified prescriptions. No clinical module has been approved by a qualified reviewer.

Saved-recipe pantry matching works against currently authorized recipes. Configurable Pro discovery, rescue and grocery handoff/reconciliation are implemented with entitlement, rights, stale-state and capability gates. Native edited/partial rescue previews require server recalculation before acceptance. No real Pro entitlement, licensed live discovery/import or retailer sandbox order was available for positive end-to-end verification.

## Evidence

| Check | Result and evidence |
|---|---|
| Web unit/regression tests | 108 passed — [log](test-results/meals/unit-tests.log) |
| Real database integration against production-mode server | 14 groups passed, no paid provider calls — [results](test-results/meals/integration.json), [log](test-results/meals/integration.log) |
| Upgrade and migration replay | Old recipe/CookedLog retained; zero invented meals — [report](test-results/meals/migration.json) |
| Actual public product provider | Open Food Facts barcode fetch passed; activation/license review remains pending — [report](test-results/meals/product-provider.json) |
| Web build/type/lint/diff checks | Passed — [build](test-results/meals/web-build.log), [types](test-results/meals/typecheck.log), [lint](test-results/meals/web-lint.log), [diff](test-results/meals/diff-check.log) |
| Native build, unit tests and lint | Passed; 13 JVM tests — [build](test-results/meals/android-final-build.log), `mobile/android/app/build/reports/tests/testDebugUnitTest/index.html`, `mobile/android/app/build/reports/lint-results-debug.html` |
| Native instrumented flows | Three tests: lost-response identical sync replay, persisted agenda/pantry/cooking/preparation/prescribed targets/actual composition/confirmed day, and actual camera-denial recovery/system gallery upload — [log](test-results/meals/android-final-instrumentation.log) |
| Native large text | Full meal/nutrition UI workflow at 130% font scale — [log](test-results/meals/android-large-text-instrumentation.log), [screens](test-results/meals/screenshots/android-large-text/meals) |
| Qualified health review | Not approved — [review packet](test-results/meals/health-review-packet.json), [nutrition review](DAILY_NUTRITION_REVIEW.md) |

The database tests cover authentication/ownership, simultaneous and replayed consumption, four eggs allocated across two three-egg meals, unknown/estimated stock, caregiver/profile privacy, repeated occasions, leftovers without a second raw deduction, sanitized private media/friend revocation, native HTTP replay, backdated legacy activity, preparation dependencies/partial use/undo, check-in deduplication, daily coverage/targets/clinical guards, Pro denial and manual incoming/partial-receipt/refund reconciliation. Unit fixtures supplement these real database/UI paths; they do not establish live paid integrations or clinical validity.

The intermittent native HTTP failure was traced to a lost connection during a sync write. Only the receipt-protected sync endpoint now permits connection retry. The disconnect test verifies an identical operation body on replay; database tests verify duplicate effects are prevented. Exploratory UI test failures from offscreen lazy items/restored drafts were corrected without weakening persistence assertions.

The final 130% text-size rerun initially stopped at sign-in: eleven repeated fixture logins exceeded the ten-attempt limit. Only that fixture's limiter in the guarded isolated test database was cleared; authentication policy was unchanged. The subsequent current-build meal/nutrition workflow passed in 35.952 seconds. The emulator font scale was restored to 100% afterward.

## Rendered screenshots

- [Web agenda, EN/light/390 px](test-results/meals/screenshots/web-agenda-en-light-phone.jpg)
- [Web daily assessment, FR/dark/desktop](test-results/meals/screenshots/web-daily-fr-dark-desktop.jpg)
- [Web daily assessment, FR/dark/phone](test-results/meals/screenshots/web-daily-fr-dark-phone.jpg)
- [Web pantry, FR/dark/desktop](test-results/meals/screenshots/web-pantry-fr-dark-desktop.jpg)
- [Native agenda, EN/light](test-results/meals/screenshots/final-android/meals/01-agenda-en-light.png)
- [Native cooking confirmation, FR/dark](test-results/meals/screenshots/final-android/meals/05-cooking-confirm-fr-dark.png)
- [Native preparation persistence](test-results/meals/screenshots/final-android/meals/07-preparation-persisted-fr-dark.png)
- [Native prescribed target persistence](test-results/meals/screenshots/final-android/meals/08-daily-target-persisted-fr-dark.png)
- [Native camera-denial recovery](test-results/meals/screenshots/final-android/meals/09-camera-denied-recovery.png)
- [Native gallery photo saved](test-results/meals/screenshots/final-android/meals/10-gallery-photo-saved.png)
- [Native confirmed daily assessment](test-results/meals/screenshots/final-android/meals/11-native-daily-confirmed-fr-dark.png)

## External dependencies and remaining work

1. **Pro verification:** configure existing server-verified Play billing authorization/token encryption and obtain a genuine test entitlement. Then run positive rescue, discovery/import and new basket preparation scenarios, including lapse/revocation. No entitlement was fabricated or purchase made.
2. **Discovery:** supply Brave credentials and permitted source licences with actual rights URLs, named reviewer and expiry. Verify complete real sources and one-tap private import. Safe parsing/configuration/manual-review paths are present; live licensed import is unverified.
3. **US retailer:** obtain approved Instacart development access/key and sandbox evidence. Current support is a shopping-list handoff, not an exact product basket or completed order. Catalogue/cart/prices/fees/slots/status/cancellation/substitution enforcement are unavailable capabilities. No store/service location is verified.
4. **France retailer:** obtain an actual partner and permitted catalogue/checkout/status/receipt integration; implement and verify the partner-specific capabilities. There is no France checkout connector or verified retailer/location. Manual shopping and explicit actual-order receipt reconciliation work independently.
5. **Composition/health:** complete Open Food Facts downstream licence/attribution review before activation. Obtain qualified France/US country/age/condition/combination, dietitian/clinical and food-safety review. Full micronutrient adequacy and automated therapeutic targets require additional real composition data, reviewed methods, implementation and validation; these are not merely hidden switches.
6. **Privacy/regulatory:** obtain intended-purpose classification, DPIA/children's-data/consent and actual backup/log retention/operator-access review. Review fields are null; no approval or certification is claimed.
7. **Devices/accessibility/release:** physical camera capture/gallery, TalkBack navigation, complete system-theme/reduced-motion/accessibility matrix, calendar/reminder delivery and store-installed auth/billing remain unverified. A phone became connected during an untargeted exploratory Gradle run; that run was stopped and no physical pass is claimed. Final instrumentation explicitly targets the emulator.
8. **Software limits:** general sub-form drafts and weekly previews are not all process-restart durable; complete dynamic error localization is not verified. Reminders use optional calendar handoff rather than an app background scheduler. Kitchen JSON has documented history/size caps and no archive UI. Rescue currently reduces known total cooking time rather than separately measured active effort. These limits remain visible in the checklist.

The [requirement checklist](MEAL_FEATURES_CHECKLIST.md), [API/data/configuration guide](MEAL_FEATURES_IMPLEMENTATION.md), actual EN/FR help/privacy text and review packet accompany the delivery. Production migration/deployment, paid activation, real purchases and store submission need separate authorization and operator setup.
