# Kotlin meal UX follow-up — 7 October 2026

Native Android 0.1.6 (7) brings the latest web simplifications into the existing Kotlin/Compose app. KitchenTheme, navigation, account-scoped offline transport and server mutation contracts remain in place. No internet photographs, replacement framework or additional menus were introduced.

## Changes

- **Eaten:** My recipes / Friends are directly visible. The picker uses owned recipes and explicitly shared recipes already available through the account-scoped kitchen cache. Food-name typing is removed; optional search appears for larger collections. Person, meal and portion controls appear after selection. Planned recipes remain quick choices. Save sends a recipe ID with the stable eating-operation ID; the matching server checks access again and resolves the canonical title. Unknown portions stay unknown. Logging does not imply cooking or stock consumption.
- **Prepare:** Stock used opens pantry chips and a single quantity per selected ingredient, reusing its unit. Units can be edited inline and Other ingredient remains directly accessible. Cancel closes the stock composer. Edit focuses the task field; Cancel restores the previous unsaved draft. Successful saves clear the editor. Done without stock sends no ingredients; Done with stock sends only the reviewed entries. Dismiss and Undo remain directly visible, with existing cooking/dependency guards. Active and Waiting still default to 0 min.
- **Daily nutrition:** six evenly aligned, spaced tiles show numbers, units and exact bounds. A single missing-data legend replaces repeated unknown/status paragraphs. Recorded subtotals remain separate from complete totals. Low/High/Review indicators only appear when relevant; coverage uses a checkbox. Targets, Info and composition editing remain accessible without a nested menu. Source and clinical confirmation requirements remain intact.
- Empty sync-warning items no longer create surplus space at the top of tool sheets. All changed controls use the existing Material components and semantic theme colors; layouts wrap and scroll at larger text sizes.

The earlier agenda, My day, Leftovers, Ideas, Week, Replan and Stock simplifications were already native. The all-tools workflow below exercised these alongside the new Eaten flow.

## Verified evidence

- Final canonical debug APK, minified release APK/AAB, release lint and **17 JVM tests** passed. Debug APK v2 signature verified. Package `com.recipebuddy.android`, versionCode 7, versionName 0.1.6, target SDK 36.
- Emulator API 36.1, normal text: recipe-backed friend eating saved the canonical recipe ID/title, retained an unknown portion, and left pantry and cooking records unchanged. Coverage saved. Preparation Cancel restored its unsaved draft; pantry completion, Undo, Dismiss, Undo and completion without stock reconciled correctly.
- The same workflow passed at **130% text scale**. A separate larger-text workflow verified exact 1800–2200 bounds, the 2000 recorded subtotal, and French dark-theme nutrition and recipe selection. Font scale was restored to 1.0 afterward.
- The existing all-tools workflow passed with the revised own-recipe picker: My day, zero-minute Prepare, Eaten, Nutrition, Week, Replan, Leftovers, Ideas and Stock. Paid replan activation remains outside the free fixture's coverage.
- Mechanical design detector returned no findings. Emulator screenshots were reviewed individually and as contact sheets. No physical-device performance, OAuth, billing or camera claims follow from this verification.

Earlier attempts exposed ambiguous test selectors against background agenda content and a test Back press that closed the sheet when no keyboard was open. Selectors and keyboard dismissal were corrected; the final recorded runs passed. These were test-harness corrections, not successful intermediate runs.

Ignored evidence:

- `test-results/meals-redesign/native-followup-actions.txt`: normal workflow, OK (1 test).
- `test-results/meals-redesign/native-followup-large.txt`: larger-text workflows, OK (2 tests).
- `test-results/meals-redesign/native-followup-tools.txt`: all-tools workflow, OK (1 test).
- `test-results/meals-redesign/native-followup-build.txt`: final build/lint/JVM run.
- `test-results/meals-redesign/screenshots/native-followup-large/33–41-*.png` and `sheets/`: latest larger-text render evidence.
- `mobile/android/app/build/test-results/testReleaseUnitTest/`: 17 tests, no failures/errors.

All accounts, recipes, health references, quantities and records used for these tests were synthetic on the isolated localhost backend. No external provider or retailer transaction occurred.

## Local builds and release boundaries

| Artifact in mobile/dist | Bytes | SHA-256 |
| --- | ---: | --- |
| recipe-buddy-0.1.6-7-debug.apk | 28236188 | D5D56D258A697A118421F64203C5A777C0F947DF0F0FAF9F3414FB95F3FCC02F |
| recipe-buddy-0.1.6-7-unsigned.apk | 6887372 | A7570BBE52E2F931268FB2FE5A58867AB02FBA92842AEBC0928287999DA2657F |
| recipe-buddy-0.1.6-7-unsigned.aab | 10926794 | 7E8E045BB42FCCD86CCD4F241533BF09B47F6E13FC6992BC1956AF40DE5A6318 |

The installable canonical APK is debug-signed and uses the fixed production backend. It cannot update a Play-signed installation in place. The `.meals` debug review variant was installed and tested on the emulator against the isolated backend; it is not the phone delivery artifact.

Upload-signing environment values were not configured in this build session, so the release APK/AAB are explicitly **unsigned** and cannot be submitted to Play as built. Use the existing protected upload key before store delivery. This candidate has not been published to Play or installed on a physical phone; only emulator-5554 is connected.

Deploy the matching backend branch before claiming production support for recipe-linked eating access checks, zero-minute preparation and the explicit stock-confidence adjustments. Production deployment was not performed in this follow-up. GitHub delivery, local builds, store publication and physical-phone verification are separate outcomes.
