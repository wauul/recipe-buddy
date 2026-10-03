# Recipe Buddy Android design review

Reviewed 3 October 2026. Mode: **full**. Implementation: Kotlin, Jetpack Compose Material 3, Android RemoteViews for the cooking widget. Styling uses the shared `KitchenTheme` and `KitchenUi` components.

The redesign preserves Recipe Buddy's forest green, warm cream, Bricolage headings, original kitchen illustrations, chef badges, apron ratings, and playful personality. Everyday screens now favor a short heading, clear content, and an obvious action. Legal documents, photo consent, sharing visibility, and deletion consequences remain available in full.

The requested Expo skill has been renamed upstream: the installed equivalent is `expo-native-ui`. It, `vercel-react-native-skills`, and `make-interfaces-feel-better` informed the native implementation; the app does not require an Expo or React Native migration.

## Scope and coverage

All native destination source was inspected: sign-in/sign-up and terms gate; collection, filters and progress; owned/shared detail; manual/import editor; cooking, servings, timers and Voice Chef; ingredient photo/manual entry and matching; shopping; friends, chef kitchens and QR/email/link invitations; sharing; aprons, twists and comments; search and help; settings, legal reader, support, reports, blocked chefs and deletion; widget configuration and launcher layout.

| Category | Evidence inspected | Result |
| --- | --- | --- |
| Typography | `Theme.kt`, both string catalogs, all destination layouts; English light, French dark and larger-text screenshots | Unified roles, fewer competing headings, shorter everyday copy, multiline layouts |
| Surfaces | `KitchenUi.kt`, collection/detail/cooking/forms/sheets/settings, photo preview, widget XML | Shared warm surfaces, quieter dividers, rounded media and panels, consistent spacing |
| Animations | Navigation transitions in `MainActivity.kt`, ingredient result scrolling, native Material control feedback | Existing short transitions retained; result scrolling made immediate; no new decorative motion |
| Icons | Navigation, action rows, errors, forms, timer/photo/community controls and widget buttons | Native Material icons, meaningful labels, selected-state cues; FAB accessible name repaired |
| Performance | Adaptive lazy grid/lists, keyed rows, image requests, photo preparation, timer display, lint and release shrink/build | Lazy layouts retained; no extra provider calls or remote stock-image loading; stable timer digits |

Source coverage is broader than runtime verification. External service and physical-device boundaries are listed below.

## Resolved findings

Paths below are relative to `android/app/src/main/java/com/recipebuddy/android/` unless indicated. These consolidate repeated changes across all affected surfaces.

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| MEDIUM | `Theme.kt:15`; `KitchenUi.kt:24`; `Screens.kt:97,163,266,327`; `IngredientsUi.kt:52`; `FriendsUi.kt:40`; `WebFeaturesUi.kt:71,97,111`; `CommunityUi.kt:39`; `AccountUi.kt:53` | Inconsistent screen rhythm, default surfaces and mixed card treatment | Shared 20dp page gutter, 24dp major spacing, warm cream background, quiet white/tonal panels and structural dividers | Consistent hierarchy helps people scan without reading each screen |
| MEDIUM | `Theme.kt:29`; `Screens.kt:53,97,163,327`; `TaskScreens.kt:106`; `android/app/src/main/res/values/strings.xml`; `values-fr/strings.xml` | Competing headings, long routine instructions and metadata | Defined heading/body/label roles, concise bilingual labels, 24sp cooking instruction with 36sp line height, secondary information disclosed on demand | Typography should communicate priority and keep everyday tasks concise |
| MEDIUM | `Screens.kt:86,97`; `PhotoUi.kt:31`; `WebFeaturesUi.kt:86`; `CookingWidget.kt:195`; widget drawables/layout | Media and cards used differing corners and proportions; configuration had plain recipe choices | 24dp media/panel corners, subtle photo outline, square collection art, compact illustrated result rows, native rounded widget media | Coherent surfaces preserve identity and improve recognition |
| MEDIUM | `WebFeaturesUi.kt:26`; `Screens.kt:97,327` | Full progress explanations competed with recipes and settings | Compact badge, level, points and progress rail; complete seven-level roadmap and activity remain in the sheet | Secondary information should not dominate frequent tasks |
| HIGH | `TaskScreens.kt:40,106`; `Screens.kt:163,266`; `IngredientsUi.kt:52`; `KitchenUi.kt:60` | Primary actions were part of long scrolling content | Pinned Save, Start cooking, Previous/Next, Add item and Find saved recipes; valid/disabled states retained; editor save remains above the keyboard | Action reachability is essential for long recipes, one-handed use and large text |
| MEDIUM | `Screens.kt:36`; `TaskScreens.kt:40`; `IngredientsUi.kt:20`; `FriendsUi.kt:169`; `CommunityUi.kt:128`; `AccountUi.kt:72,92` | Large forms and explanations competed for space; optional editor fields always visible | Keyboard-aware scrolling, numbered step panels, optional subtitle, collapsed import, quantity groups, succinct photo tile and removable rows | Progressive disclosure and predictable fields reduce form effort |
| HIGH | `MainActivity.kt:114`; `TaskScreens.kt:40` | Creating a recipe again reset a partially completed new draft | Resume draft opens persisted unfinished work; explicit discard confirms intent; failed saves keep the form intact | Frequent actions must not silently destroy user work |
| HIGH | `MainActivity.kt:130` | Saved cross-section navigation could restore Shopping when Recipes was selected | Shared root navigation opens the selected section and removes unrelated task routes | Navigation state must match its visible destination |
| HIGH | `MainActivity.kt:160`; `KitchenUi.kt:26`; `Screens.kt:41` | Extended FAB label was absent from the merged accessibility tree; errors used heavier presentation | Explicit localized Add recipe/Resume draft accessible name, heading semantics, compact live-region error with dismiss/retry and authentication-specific wording | Icon/control names and actionable feedback must remain accessible |
| MEDIUM | `KitchenUi.kt:39`; `Screens.kt:97,327`; `MainActivity.kt:148`; `FriendsUi.kt:40,120`; `CommunityUi.kt:39`; `VoiceChef.kt:117` | Fixed-width groups and dense tabs competed with long French labels; the floating collection action covered names at larger text | Wrapping native filter chips, compact single-column recipe rows and a reserved Add recipe bar above 130% text, flexible action groups, title ellipsis where appropriate | Layout must adapt to language and font settings without obscuring content |
| MEDIUM | `Screens.kt:266`; `AccountUi.kt:53`; `FriendsUi.kt:84`; `CommunityUi.kt:39` | Shopping/account/social actions had similar visual priority | Unchecked shopping first, separate checked section, quantity/edit/delete/undo rows; grouped account actions; compact chef rows and contribution panels | Task grouping and destructive-action distinction reduce mistakes |
| MEDIUM | `KitchenUi.kt:80`; `Screens.kt:97`; `WebFeaturesUi.kt:111`; `MainActivity.kt:194`; `IngredientsUi.kt:52` | Search and result states were verbose or difficult to scan; stale ingredient matches could appear early | Native Search IME, clear/tune actions, concise empty states, destination retry/loading state, and completed-match gating | Direct input and accurate state feedback make results predictable |
| LOW | `TaskScreens.kt:170`; `IngredientsUi.kt:60`; `CookingWidget.kt:195`; `android/app/src/main/res/layout/cooking_widget.xml` | Proportional timer digits; repeated animated result scrolling; widget configuration did not follow the selected app appearance | Monospace countdown, immediate result scroll, localized/theme-aware widget configuration, safe drawing padding and 48dp widget controls | Stable numbers, restrained motion and shared appearance improve native polish |

## Considered but rejected

| Location | Candidate | Rejected because |
| --- | --- | --- |
| Entire Android app | Rebuild in Expo/React Native to match skill examples | Existing Compose code already integrates native storage, credentials, widgets, alarms and photo permissions; visual principles transfer without replacing functioning infrastructure |
| `Screens.kt:86` | Replace illustration fallbacks with stock food photography | It would misrepresent users' recipes and dilute the app's recognizable artwork; actual saved recipe photos still take priority |
| `WebFeaturesUi.kt:26` | Show the complete badges/week/scoring explanation on every visit | It conflicts with the requested minimal text; a compact entry point opens the full information |
| `FriendsUi.kt:185` | Put a chef logo over the invitation QR | Covering modules reduces scanning reliability; the branded modules retain their white quiet zone |
| Buttons and lists | Add bounce, pressed scaling and staggered entrances everywhere | Native Material feedback already communicates activation; repeated custom motion would distract from cooking tasks |

## Verification

Checks run against a **separate `.design` emulator install**, an isolated loopback PostgreSQL fixture database and a local backend. The installed original app and physical Samsung were preserved. Paid AI/vision providers were disabled.

- `pnpm exec dotenv -e .env.native-test -- prisma migrate deploy`: no pending migrations.
- `pnpm exec dotenv -e .env.native-test -- tsx scripts/test-native-integration.ts`: **13 integration groups passed**, zero provider calls.
- `pnpm exec dotenv -e .env.native-test -- tsx scripts/seed-native-design.ts`: restored disposable friend/share fixtures for the UI walkthrough.
- `pnpm typecheck`: passed.
- `gradlew :app:assembleDebug :app:assembleDebugAndroidTest -PdesignReview=true -PdebugBackendUrl=http://127.0.0.1:3002`: passed.
- `gradlew :app:lintDebug :app:lintRelease :app:testDebugUnitTest :app:assembleRelease :app:assembleDebug`: passed with the final larger-text refinement. All **7 unit tests passed**. Existing deprecated Material icon warnings remain.

`NativeRedesignTest` exercises five journeys. The final verification ran each journey in a separate instrumentation process to isolate singleton API/session state; **all five passed**:

| Method | Final result | Duration |
| --- | --- | --- |
| `allDestinationsAndTaskControls` | Passed | 51.234s |
| `photosSharingAndSecondarySheets` | Passed | 23.860s |
| `frenchDarkModeAndLargeType` | Passed at normal text size | 14.388s |
| `editorPersistenceAndFailedSave` | Passed | 15.834s |
| `authenticationKeepsFailedInput` | Passed | 9.564s |

Each used `adb -s emulator-5554 shell am instrument -w -r -e class com.recipebuddy.android.NativeRedesignTest#METHOD com.recipebuddy.android.design.test/androidx.test.runner.AndroidJUnitRunner`. A combined run in one instrumentation process was unstable because of shared state/timing and is not counted as passing.

The French dark journey was also run with `adb shell settings put system font_scale 1.5`: **passed**, including collection rows and the reserved Add recipe bar, detail, cooking, editor with keyboard, settings/preferences, ingredients, friends and invitations. This was an accessibility stress check. The app respects system font size; the main preview and emulator use normal **100%** text, verified with `settings get system font_scale` returning `1.0`. Screenshots were visually inspected for overlapping text and action reachability; this caught and resolved the larger-text floating-button overlap.

Screenshots: [Gallery](DESIGN_GALLERY.html), [collection](screenshots/redesign/redesign/03-collection.png), [editor above keyboard](screenshots/redesign/redesign/39-editor-keyboard.png), [French collection at 150% text](screenshots/redesign-large-type/40-french-dark-collection.png). Fixture accounts and recipe names are test data; some recipe bodies intentionally remain English.

Delivery: `dist/recipe-buddy-redesign-debug.apk`, package `com.recipebuddy.android`, minimum API 26, target API 36, backend `https://recipe-buddy-wauul.vercel.app`. This is a locally debug-signed APK. The original emulator install used a different signature, so it was preserved and verification used the optional `.design` suffix. No existing app was uninstalled. The release shrink/build also produces an unsigned release APK; Play signing/publishing was not requested or performed.

The packaged debug APK's v2 signature was verified. SHA256: `D205C6B09A8BB03935E698B1CB31B041269C4479E12DA19AA02D2A4C4900F131`.

**Not verified:** TalkBack listening/focus order on a physical device; animation replay at 10% speed; frame-time/memory profiling; physical camera capture and lens behavior; paid vision/import/translation output; Android Google sign-in under the release certificate; physical offline TTS/command recognition and alarms; launcher-specific widget sizing on Samsung; Play installation and store release. Source and emulator checks do not establish these outcomes.

Native touch-target guidance: [Android Compose accessibility defaults](https://developer.android.com/develop/ui/compose/accessibility/api-defaults). The instrumentation dependency uses Espresso 3.7 for Android 36 compatibility: [AndroidX Test release notes](https://developer.android.com/jetpack/androidx/releases/test).

## Verdict

**Approve for the inspected interface scope.** All findings above have been implemented and the five isolated native journeys, seven unit tests, thirteen integration groups, typecheck, lint and debug/release builds passed. No unresolved interface finding remains in the inspected scope. Physical-device TalkBack/camera/voice/alarms, release Google sign-in, paid provider output, Samsung widget sizing, Play installation, 10%-speed motion replay and frame/memory profiling remain unverified.
