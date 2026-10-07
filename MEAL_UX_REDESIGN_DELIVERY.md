# Meal UX redesign - 7 October 2026

The Next.js website and native Kotlin/Compose Android app now use a week strip and selected day. All nine meal tools received a simplification and spacing pass, using the existing Kitchen Index cream/forest identity and existing artwork. This is Android 0.1.5 (6), a local candidate. The previously published 0.1.4 release remains the Play internal release. This candidate has not been published to Play or the production website.

## Interaction and spacing

The installed ui-craft, make-interfaces-feel-better and Impeccable guidance and DESIGN.md informed this work. Native Android remains Compose; no replacement framework or internet photographs were introduced.

- Agenda, Journal and Household are visible. Pantry and Shopping remain in the existing navigation; Shopping exposes Week and Recipes.
- All day tools are directly visible, with icons and short captions. There is no nested tools menu. A journal count sits beside the selected day rather than occupying another text row.
- Sheet gutters are 20px/dp on phones. Decision groups use 24-28px/dp separation; wrapped choices use 10-12px spacing. Cards, steppers and rows retain generous touch targets. Day/equipment choices use a consistent two-column visual layout. Larger text can scroll without compressing controls.
- My day has no text fields. It preserves the selected day's settings and reuses the cook's most recent earlier equipment selection for a new day. Time/appetite/health facts are not fabricated.
- Prepare has one Task text field, visual presets, day/time pickers and duration steppers. Active and Waiting default to **0 min**, decrease to zero and cannot go negative. Zero durations now pass server validation and persist. Tasks and dependency choices focus on the selected day; existing selected dependencies remain visible when editing.
- Eaten on the web starts with My recipes / Friends and saved recipe rows. The typed Food field is removed. Person, meal and portion controls appear after selection; planned recipes remain quick choices. Unknown portions stay unknown, retries keep a stable ID, and Another meal creates a new ID. Native Android retains the earlier composer in the candidate below.
- Nutrition shows six cards for the selected person with unknown totals, known subtotals and exact target bounds preserved. The normal view has no inputs. Target/composition editors retain the necessary source, quantity and clinical confirmation fields.
- Leftovers uses batch selection, Plan/Eaten choices and bounded portions without typed fields. Reservations, stock reconciliation and the safety uncertainty remain intact.
- Ideas starts with visible stock chips and saved recipe matches, with one optional search field on the web. Suggestions load automatically; external exploration remains explicit and Pro-gated. Android no longer repeats the same candidate list.
- Week exposes Add and Skip beside each proposal, with inline editing. Replan automatically prepares a read-only preview and exposes objectives, selected changes, Apply and Undo directly. Paid preview/apply was not live verified with the free fixture account.
- Stock prioritizes uncertain batches and uses one quantity field plus Exact/Estimate choices. Corrections preserve consumed batch identity, use version guards, replay idempotently, and undo quantity/confidence without overwriting a later explicit measurement.
- Meal draft persistence, focus restoration, Escape, failed-save Refresh/Retry, account isolation, offline replay and deterministic restrictions remain supported. The scroll progress indicator is clamped during modal scroll locking to prevent horizontal overflow.

## Verification

| Area | Evidence |
| --- | --- |
| Web build | Optimized Next.js production build, lint and TypeScript passed after final product changes. |
| Web unit tests | 112 passed, including zero-minute preparation and rejection of negative durations. |
| API integration | 16 groups passed against isolated loopback PostgreSQL 16. Covers ownership, privacy, concurrent/version conflicts, consumed stock corrections, confidence/undo/replay, cooking, preparation, check-ins, nutrition/targets, manual receipts and free/Pro denial. The additional recipe-backed eating group checks canonical recipe titles, own/shared access, sharing revocation, idempotency and unchanged stock/cooking records. No external provider calls. |
| Android build | Signed release APK/AAB, canonical debug APK, release lint and 17 JVM tests passed. APK v2 signature verified. Package com.recipebuddy.android, versionCode 6, versionName 0.1.5, target SDK 36. |
| Native workflows | Six unique instrumented workflows passed across recorded runs: agenda save/edit/persistence; simplified tools and actual saves; pantry/cooking/French dark/exact targets; large-text agenda/composer; gallery/permission recovery; disconnected replay. Four agenda/connected workflows were exercised at 130% text scale. Final zero-minute tool rerun checks display and persisted active/passive values. |
| Web rendered workflows | Earlier overhaul: all nine tools reviewed at phone width. My day, Prepare, Eaten and Stock saves, draft/reload persistence, failed-save recovery and focus/Escape checked. Duration increment/decrement returns to zero. Nutrition unknown totals and targets remain distinct. |

Earlier instrumented runs exposed test setup/selector issues, including selecting a null nutrient row; corrected affected runs passed. The zero-duration save check exposed a real server minimum-one validation bug, now fixed. A stock correction initially attempted batch replacement after consumption; it now uses an auditable stock adjustment. Evidence reports successful final checks, not that every intermediate run passed.

All verification identities, health references, records and purchases were synthetic and isolated from production. No retailer transaction, paid purchase or external provider activation occurred.

## Builds

Binaries are local and intentionally ignored by Git. The canonical debug APK uses the fixed production backend. The .meals QA variant uses the isolated local backend and is not a phone delivery artifact. Deploy this commit's backend before using zero-duration saves or the new explicit stock-confidence correction in production.

| Artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| mobile/dist/recipe-buddy-0.1.5-6-release.apk | 6825616 | 40A8B47B1E1ABAE16916122E481AA3EE1B33C3B463E7F73703574419C1471E3D |
| mobile/dist/recipe-buddy-0.1.5-6.aab | 10869329 | 5ADA2AA472AEC9DF63A02480FD678913D2E4422C25119C8B3F0AB83D5A7697B3 |
| mobile/dist/recipe-buddy-0.1.5-6-debug.apk | 28187036 | 4D63577F259E76E777AFA213FBF654CBB524AC114E8DE0F0251BA731BCBF883D |

The release APK uses the existing upload certificate; Play-installed apps use Google's app-signing certificate and update through Play. AAB jarsigner verification reports jar verified, with self-signed certificate, missing timestamp and ZIP/manifest-order warnings. This is not evidence of Play acceptance.

## Screenshots and test files

Evidence is ignored under test-results/meals-redesign:

- screenshots/native-large/meal-redesign/20-simple-my-day.png and 21-simple-prepare.png: final visual choices, spacing and zero-minute defaults at 130% text scale.
- Native 22-29 screenshots cover Eaten, Nutrition, Week, Replan, Leftovers, Ideas and Stock. Earlier normal-scale evidence remains under screenshots/native-simple.
- screenshots/web/21-spacious-my-day.jpg and 22-29-spacious-*.jpg: all web tools at 390px. 30-prepare-zero-minutes-360.jpg shows zero defaults at 360px. Historical screenshots preserve draft/reload, French dark, shopping and desktop checks.
- native-spacing-rerun-final.txt plus native-spacing-day-rerun-final.txt: three successful latest spacing workflows and the corrected affected day workflow. native-zero-persistence-final.txt: final zero-duration workflow.
- test-results/meals/integration.json: 16 API groups. mobile/android/app/build/test-results/testReleaseUnitTest: 17 JVM tests. mobile/android/app/build/reports/lint-results-release.html: release lint.

## Delivery boundaries

Only emulator-5554 is connected. The Samsung phone is disconnected; the candidate has not been installed or visibly verified on a physical phone. Native OAuth/billing, physical camera behavior and full phone performance are not established by emulator checks.

Six recorded nutrients, daily adequacy review and exact user-entered personal/clinician-prescribed bounds remain supported. The app does not generate clinical prescriptions or invent missing composition. Clinical validation, broader nutrient coverage, licensed discovery/import providers, downstream food-data licensing activation, live retailers and real Pro purchases remain external/deferred work detailed in MEAL_FEATURES_DELIVERY.md and DAILY_NUTRITION_REVIEW.md.

This redesign adds backward-compatible optional stock-confidence history metadata and permits zero prep durations. No database DDL migration, authentication change or offline transport change is required. GitHub branch delivery is separate from production deployment, Play availability and physical-device verification.
## Latest web follow-up: Prepare, daily nutrition and Eaten

Prepare now exposes Edit, Stock used, Done and Dismiss directly. Editing focuses the task form; Cancel restores its previous unsaved draft. Stock used opens an inline pantry picker with one quantity per selected ingredient and the existing unit; unknown units remain editable. Done without stock completes without guessing consumption. Stock amounts require valid positive measurements. Done and Dismiss retain Undo and existing cooking guards.

Daily nutrition now uses six spaced numeric tiles with compact units and exact bounds, one missing-data legend, and short Low/High/Review indicators. Known subtotals remain explicitly recorded rather than presented as complete totals. Coverage is a visible check control. Targets and source/uncertainty information remain directly accessible; necessary composition and clinical confirmation fields remain available.

Eaten uses only owned or currently shared friend recipes in its picker. The server checks access again on save and resolves the canonical title. Recipe linkage is backward compatible and does not imply cooking, pantry deduction, known eaten portions or verified nutrition composition. No database DDL migration is needed.

Verification of this follow-up: optimized Next.js build, lint, TypeScript and 112 unit tests passed. All 16 API integration groups passed against the isolated fixture backend with zero external provider calls. Browser visual and interaction verification of these latest screens is pending: the existing preview tab became a connection-error data URL, and browser automation rejected that URL under its navigation policy. Earlier screenshots document the earlier overhaul, not these latest screens. No fresh screenshots are claimed. The loopback preview server is running on port 3003.

These latest changes apply to the website, including mobile web. The Kotlin candidate and its APK/AAB evidence above are unchanged. This follow-up has not been published to the production website or Play.
