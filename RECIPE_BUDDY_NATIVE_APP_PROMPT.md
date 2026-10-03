# Recipe Buddy — native Android first, native iOS second

Copy this document into the coding agent working in the Recipe Buddy repository. The initial assignment is the complete Android milestone below. The iOS section defines the next milestone; start it after I have tested Android and explicitly ask to continue.

## Assignment and boundaries

Build native mobile clients for the existing Recipe Buddy product: Kotlin with Jetpack Compose for Android, followed by Swift with SwiftUI for iOS. Deliver a useful, polished Android app that I can install on my phone first. Implement the work, not just a plan or mockup.

Keep the existing website working and reuse its accounts, recipes, friendships, permissions, translations, and backend. No WebView app shell, React Native, Flutter, separate mobile account database, or backend migration to a different service. System browser authentication is allowed and expected where appropriate.

The priorities, in order, are reliable existing-account access; a beautiful everyday recipe experience; photo-to-ingredient matching; simple link/QR invitations; the three mobile features specified below; and the lightweight home-screen cooking widget. Avoid unrelated expansion.

Make routine implementation decisions autonomously. Ask only about missing credentials, an unavailable required service, a genuinely unresolved product decision, or a necessary irreversible action. Do not repeatedly ask me to approve layouts or routine coding steps. Prepare code and configuration before asking for any external setup. Do not enable paid billing, buy services, publish store listings, push a deployment-triggering branch, or modify production data without authorization.

## Start with a bounded repository inspection

Read applicable AGENTS.md instructions, then inspect the current implementation. Begin with README.md, DESIGN.md, package.json, prisma/schema.prisma, src/lib/http.ts, src/lib/auth.ts, src/lib/social-policy.ts, src/lib/shopping.ts, and the relevant API routes. Read additional files only as needed. Source code takes precedence over this snapshot.

Repository facts observed when this prompt was prepared:

- Next.js 14, React 18, Prisma/Postgres, NextAuth v4 credentials plus optional Google OAuth, and server-side Groq calls.
- Private recipe CRUD, URL/text import, photos, search/vibes, shopping aggregation, explicit per-recipe sharing, friends, comments/twists, apron reviews, chef progression, optional roasts, English/French, and light/dark/system themes already exist.
- Friend invitations currently require an exact existing-account email. An accepted friendship does not expose every recipe: RecipeShare grants access to particular recipes. Removing the friendship revokes those grants.
- The existing API authenticates through NextAuth server sessions. It is not already a native bearer-token API. Browser mutation checks and JSON body limits live in src/lib/http.ts.
- Shopping checkmarks are currently browser-local. Recipe quantities can be numeric strings, fractions, or ambiguous text. Never assume all amounts can be added or converted.
- Cooked activity counts distinct days in the Monday–Sunday UTC week, not a consecutive-day streak. Preserve the existing rule and chef score calculation.
- The backend build script invokes migration/repair helpers. Inspect their environment guards before running it; use an isolated development database, never accidentally execute them against production.

Check the installed JDK, Android SDK, Gradle tooling, and available emulator/device once. Use stable compatible tool versions and a checked-in Gradle wrapper; record exact versions. Default to Android API 26 minimum unless device information or dependencies justify changing it. Choose target/compile SDK from current stable guidance and installed tooling; do not use previews for appearance alone. If my phone version is unknown, proceed with this default and document it.

Write one concise implementation checklist in mobile/IMPLEMENTATION.md, including what exists, what needs a small backend extension, and actual setup blockers. Then begin implementation without waiting for a plan approval.

## Design guidance: use only the relevant skills

Use the installed ui-craft skill at C:/Users/Waul/.agents/skills/ui-craft/SKILL.md when available. Else locate it through the skill catalog or its [source repository](https://github.com/Achref23illi/ui-craft). Read only two or three relevant recipe-library/detail, camera, or shopping reference sheets for the current work; do not ingest the whole reference collection.

For Android, supplement with [mobile-android-design](https://github.com/wshobson/agents/tree/main/plugins/ui-design/skills/mobile-android-design). For iOS, use [SwiftUI Expert](https://github.com/AvdLee/SwiftUI-Agent-Skill). These are focused recommendations, not instructions to install a whole marketplace. Read relevant source instructions when a skill is unavailable; do not block implementation on installing it. Optional individual install commands are:

```sh
npx skills add https://github.com/wshobson/agents --skill mobile-android-design
npx skills add https://github.com/avdlee/swiftui-agent-skill --skill swiftui-expert-skill
```

Platform accessibility and native interaction requirements override conflicting generic skill rules. In particular, ui-craft is based heavily on iOS references: do not apply its smaller visual button sizes as Android touch targets. Follow [Android Compose accessibility](https://developer.android.com/develop/ui/compose/accessibility/api-defaults) and [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/). UI Skills' [mobile-native](https://www.ui-skills.com/skills/emilkowalski/mobile-native) targets web/CSS/PWA behavior; it is not the implementation guide for these Kotlin/Swift apps.

### Visual direction

Translate the existing Kitchen Index identity into native mobile components. Preserve the chef-hat logo, cream/sage/forest palette, useful kitchen illustrations, and friendly voice. Avoid turning the app into a generic dashboard or a marketing landing page.

Use DESIGN.md as the brand source. Starting colors: light canvas #FAF9F5, surface #FFFEFB, text #293C30, accent #396449; dark canvas #131C18, surface #1D2922, text #ECF0E5, accent #85B67B. Define semantic tokens and verify contrast in actual components. Native system controls should remain recognizable.

- Use Material 3 on Android and SwiftUI system components on iOS. Do not force identical layouts or copy Android controls into iOS.
- Start with 20 dp/pt screen gutters and a 4/8/12/16/24/32 spacing scale. Use restraint with borders, elevation, and rounded containers; no nested cards everywhere.
- Use licensed bundled Bricolage Grotesque selectively for brand headings if available; use readable platform typography for controls and body. Body starts around 16 sp/17 pt, cooking instructions around 20–22 sp/pt. All text scales with accessibility settings; no fixed-height containers that clip larger text.
- Minimum interaction areas: 48 × 48 dp Android, 44 × 44 pt iOS. Respect keyboard, gesture navigation, status bar, safe-area, and display cutout insets.
- Real recipe photos lead when available. Use the existing illustration fallback when absent. Never invent a photograph and imply it depicts a user's saved dish.
- One visually dominant action per task. Put frequent actions within thumb reach. Use sheets for short choices, full screens for substantial forms, and native share sheets for sharing.
- Use restrained transitions, platform back gestures, subtle optional haptics, screen-reader labels, logical focus, reduced-motion support, and contrast of at least 4.5:1 for ordinary text. Never communicate status using color alone.
- Every network-driven screen needs loading, empty, error/retry, offline, and permission-denied behavior where relevant. Preserve drafts after recoverable failures.
- EN/FR strings belong in platform localization resources, including plurals, accessibility labels, errors, and permission explanations. Use existing stored translations; never call AI on every screen render or language switch.

### Information architecture

Use four labeled root destinations: Recipes, Ingredients, Shopping, Friends. Put profile/settings behind the avatar in the main app bar. Preserve destination state and scroll position. Use native navigation components; adapt to large windows sensibly without a separate tablet redesign project.

Recipes opens directly to the personal collection, search, a compact filter control, and an Add recipe action. Keep chef progress secondary. Recipe detail prioritizes photo/title, author when shared, servings, ingredients, instructions, and Start cooking. Put infrequent share/edit/delete actions in an appropriate menu; only owners can edit/delete.

Ingredients offers Take a photo, Choose a photo, and manual ingredient entry, followed by confirmed ingredients and recipe matches. Friends shows accepted friends, incoming requests, shared recipes, and a prominent Invite friend action. Shopping is a fast checklist, not a wall of recipe cards.

## Android implementation and shared backend

Use a modest Android project under mobile/android: Kotlin, Compose/Material 3, lifecycle-aware ViewModels, StateFlow/coroutines, typed navigation, a repository/data layer, Room for appropriate local persistence, and DataStore for simple preferences. Choose one conventional HTTP/serialization stack and one image loader. Avoid unnecessary modules, dependency-injection frameworks, or duplicated abstractions; add a library only when it solves an actual requirement.

Native clients communicate with the server over HTTPS; they never access Postgres directly. Keep DB credentials, signing secrets, and AI/provider secrets server-side. Store native credentials using platform secure storage backed by Android Keystore; exclude credentials and private caches from inappropriate backup/logging paths.

Resolve authentication early as a working vertical slice. Reuse current identities and password validation/account-linking rules. Prefer a mature supported integration; if the existing stack needs a small native session bridge, implement and test it explicitly. Requirements: server-issued short-lived access credentials, securely stored revocable refresh sessions with rotation/reuse handling, expiry/logout handling, and preserved user IDs. For Google, use a supported native/system-browser flow; validate issuer/audience/signature/nonce as applicable. A browser-to-app exchange must use state, PKCE and a short-lived single-use code with allowlisted redirects. Never put long-lived credentials in deep links or collect Google credentials inside a WebView.

Keep browser cookie authentication and its protections intact. Add a clearly scoped native API/session adapter; do not disable origin/CSRF checks globally or fake a browser Origin to make native calls work. Reuse server business logic and authorization checks. Prevent refresh storms with a single in-flight refresh and bounded retries.

Reuse existing APIs where suitable. Add only the missing native auth, invite, image-analysis/matching, and mobile data endpoints. Record new routes, request/response examples, error codes, pagination, and idempotency rules in mobile/API.md. Do not blindly expose internal Prisma models. Add backwards-compatible migrations only when necessary.

## Required feature 1: photograph ingredients and find existing recipes

Flow: Ingredients → camera/system photo picker → preview/retake → explicit Analyze action → editable ingredient suggestions → Find recipes → ranked existing recipe results → recipe detail/cooking.

1. Request camera access only when taking a photo. Use the OS photo picker without broad library permissions. Manual entry remains fully functional if permission is refused or no AI provider is configured.
2. Before uploading, explain briefly that this image is sent for ingredient recognition. Remove location/EXIF metadata, correct orientation, resize, and compress. Use one image per analysis in the first version. Choose and enforce documented byte/dimension limits on client and server; account for existing API body limits rather than silently raising them globally.
3. Call a server-side vision-capable model only after Analyze is tapped. Verify current provider/model image support and account limits; existing Groq text models are not proof of vision support. Keep provider selection configurable behind one small interface.
4. Return validated structured suggestions such as canonical ingredient, localized display label, optional visible quantity, and uncertainty. Do not infer concealed items, expiry dates, safety, allergens, or quantities that cannot be read. Treat text inside photos and all model output as untrusted data.
5. Let the user rename, remove, add, and confirm ingredients. Uncertain suggestions must be visibly reviewable; do not invent calibrated confidence percentages. Never declare the fridge inventory complete.
6. Match deterministically against only owned recipes and currently authorized RecipeShare recipes from accepted friends. Recheck authorization on the server. Do not send the entire recipe library to a model or create new recipes in this feature.
7. Normalize case, accents, singular/plural forms, and a small tested EN/FR synonym map. Preserve meaningful distinctions such as almond milk versus milk and flour versus almond flour. Users explicitly select pantry staples they have; salt/oil/water are not silently assumed.
8. Rank by missing required ingredient count ascending, then matched fraction descending, then a stable tie-breaker. Treat ingredients as required unless their optional status is explicit. Presence is not proof of sufficient quantity: display “All ingredients found — check quantities” when amounts are unknown. Never claim a recipe can definitely be made when known amounts are insufficient or incomparable.
9. Results display recipe title/photo, owner attribution, matched/required count, missing items, and any quantity caveat. Offer “All ingredients found” and “Missing up to 2” filters, plus Add missing to shopping. Do not invent prep times absent from recipe data. No matches gets a useful recovery action, not a generated recipe presented as a saved one.
10. Apply per-user rate limits, a configurable daily quota, maximum output length, and a timeout. Default to one provider call per explicit scan; no automatic model fallback cascade or repeated calls after navigation. Use request idempotency and short-lived account-scoped result caching to avoid duplicate billing. Retain confirmed ingredient data; discard raw photos after processing unless explicitly saved by the user.

Acceptance fixture: with confirmed tomato, egg, and rice, an authorized tomato/egg/rice recipe appears above one requiring an additional ingredient. An otherwise identical unshared friend's recipe never appears. Unknown rice quantity produces a quantity caveat. Removing a share removes it from subsequent matches.

## Required feature 2: link and QR invitations

Replace exact-email entry as the primary mobile path with Friends → Invite friend → My QR / Share link, plus Scan QR. Retain the existing email path as a secondary fallback.

- Generate a cryptographically random, opaque, scoped invite token server-side. Store its hash, inviter, expiry, and revocation/redemption state. Default to single-use with a seven-day lifetime; regenerate intentionally. Rate-limit creation and redemption. Never encode an email, password, session, or permanent user credential in the QR.
- QR and Share link carry the same HTTPS URL. Validate the domain/path and token schema when scanning; arbitrary QR contents must not trigger requests or navigation to untrusted destinations.
- The receiver sees the inviter's chef name and an explicit Accept invitation action. Generating/sharing the invite is the sender's consent; accepting is the receiver's consent. Scanning alone does not create a friendship. Redemption is transactional and idempotent; handle expired, revoked, used, self-invite, already-friends, and crossed-request cases.
- Preserve the pending invitation through login/signup. Support Android App Links and later iOS Universal Links with the required domain-association files. Include debug/release signing setup instructions rather than claiming verified links work before fingerprints/domain configuration exist.
- With no app installed, show a useful web landing page with sign-in/acceptance and instructions to reopen the link after installation. Do not promise automatic deferred deep linking through an app store without implementing a supporting service. Allow pasting an invite link if camera scanning is unavailable.
- Adding a friend does not auto-share recipes. Sharing still requires an explicit per-recipe grant. Removing a friend revokes future server access according to existing semantics.

## Three additional mobile features

### A. Guided cooking with timers

Open a focused cooking screen from recipe detail. Show the current numbered step, progress, relevant ingredient access, and large Previous/Next controls; swipe is optional, never the only control. Keep the screen awake only while this mode is active. Preserve progress through rotation, backgrounding, and process recreation. Offer serving scaling using existing quantity semantics, retaining “to taste” and unsupported fractions/units accurately.

Support multiple named timers attached to steps. Use deterministic parsing of explicit durations and a manual timer control; ambiguity requires user confirmation. Persist deadlines and compute remaining time rather than trusting a continuously running UI loop. Use appropriate OS scheduling/notification facilities, handle denied permissions, and describe any background-delivery limitation honestly. Do not use WorkManager as a precise countdown clock. Mark cooked using existing idempotent server behavior; do not create duplicate logs.

### B. Offline shopping and downloaded owned recipes

Generate a shopping list from chosen authorized recipes, add missing scan ingredients, and support manual items, edits, check/uncheck, delete/undo, and sharing plain text through the OS. Reuse current quantity aggregation rules; never guess mass/volume conversion or merge ambiguous amounts.

Persist shopping items and checkmarks locally per account so they work in airplane mode and after relaunch. Use stable item IDs; undo and list updates must not reset unrelated checked items. First milestone is explicitly device-local persistence; do not invent a shared household service or promise cross-device sync. A small deterministic aisle grouping is optional, not an AI call.

Allow explicit downloads of owned recipes for offline viewing/cooking, with clear downloaded state and last refresh. Purge private account data on logout/account change. Keep shared recipes online-only in the first milestone so the app does not promise immediate revocation of offline copies. Shopping snapshots already created from a shared recipe remain user data; explain that revocation cannot erase information already copied.

### C. Import from the phone's Share menu

Register Android share targets for public HTTPS recipe URLs and recipe text. Open a preview/editor using the existing server import pipeline, with editable title, ingredients, steps, servings, and photo. Save only after explicit confirmation. Preserve the shared payload through login and handle duplicate deliveries, unsupported sources, timeouts, and missing AI configuration. Existing URL-fetch protections remain enforced server-side. Manual paste/edit is always available.

For iOS later, provide an equivalent Share Extension with a minimal handoff into the app/editor, avoiding an entire second application inside the extension.

## Compatible add-on: home-screen cooking widget

Add an optional native home-screen widget that displays one recipe the user plans to cook, with a direct route into the existing cooking mode. This complements the app's existing recipe tags; reuse those tags and do not add a competing favorites/collections system. Implement the widget after the core Android flows, before final handoff.

- From an owned recipe's action menu, offer Add to home screen. Use the platform-supported widget configuration/pinning flow where available; otherwise explain how to add it through the launcher. The user explicitly chooses the recipe. Widget configuration also allows replacing that selection later.
- Show the selected recipe's title and existing photo or illustration fallback. A compact layout opens recipe detail; a larger supported layout includes a labeled Start cooking action. Keep text readable and controls accessible across supported widget sizes and themes. Do not invent cooking times or add new recipe metadata just to fill space.
- Reuse recipe IDs, existing local data, and the app's detail/cooking routes. Widget actions launch the app and pass through its normal session and access checks. Preserve the intended destination through login, but never carry it into a different account without revalidation. Pressing Start cooking does not automatically mark the recipe cooked or start a timer.
- Limit this first version to owned recipes, keeping shared content subject to the existing online-only policy. Downloaded owned recipes can open offline; uncached recipes show a useful connection/retry state. Selecting a recipe for the widget does not silently download it.
- Keep widget configuration account-scoped and device-local, with only a minimal display snapshot and no credentials. Clear private snapshots and request widget refresh on logout/account switch. If the recipe is deleted or access is no longer valid, clear it when the app detects that change and show Choose a recipe. Never promise instantaneous background updates: the OS controls widget refresh timing.
- Refresh when the app changes the selected recipe or detects fresh server data, using platform scheduling for any background refresh. No continuous polling, second-by-second countdowns, live AI suggestions, new backend tables, or paid services. Use the native widget framework and verify its current supported APIs during implementation.
- Android ships first. In the iOS milestone, provide the equivalent WidgetKit extension with minimal App Group data sharing and routes into the main app; keep authentication secrets in the app's secure storage. The website and its APIs require no widget-specific behavior.

Acceptance: select an owned recipe, add the widget, and open its detail/cooking screen from the launcher. Change the selected recipe and verify the next refresh. Test downloaded versus uncached recipes in airplane mode. Log out or switch accounts and confirm the widget snapshot is cleared and stale links cannot expose the previous account's data. Delete the selected recipe and verify the empty state after reconciliation. Record actual launcher/device verification and any OS refresh limitations.

## Scope discipline and delivery order

Complete these Android steps sequentially, keeping the app buildable:

1. Native project, brand tokens, EN/FR resources, navigation, existing-account authentication, and real recipe list/detail. Prove this connection before building many screens.
2. Recipe create/edit/delete, photo attachment, search/filter, existing URL/text import, authorized shared-recipe access, friends, per-recipe sharing, and link/QR invitations.
3. Ingredient camera/picker/manual input, confirmed ingredient editing, deterministic matching, then real vision integration. Build and test recognition with fixtures before spending provider requests.
4. Guided cooking/timers, persisted shopping/owned downloads, and Android Share menu import.
5. The home-screen cooking widget as the compatible add-on specified above.
6. Focused accessibility/device verification, bug fixes, APK delivery, and a concise iOS handoff.

Include native settings for theme, language, chef name, existing roast preference, and sign-out. Reuse existing chef progress data without redesigning its rules. Advanced comments/twists/review editing and account-provider management may follow after the first Android test; list deferred web features explicitly. No dead buttons, fake live data, or mock results in the real app. Demo fixtures must use a clearly separate test/preview configuration.

Do not add meal-calendar scheduling, subscriptions, public feeds, chat, delivery integrations, barcode databases, voice assistants, push campaigns, or elaborate new achievements in this milestone.

## Credit and runtime-cost controls

- Use one primary coding agent by default. Do not launch parallel agents or repeated full code reviews unless I request them.
- Inspect narrowly with rg and targeted reads. Avoid repeatedly loading unchanged docs, entire source trees, reference libraries, or long build logs.
- Reuse existing assets, translations, schema, and business logic. Do not generate decorative AI images or compare many architecture alternatives.
- Keep one checklist and one short decision record. Do not create overlapping design documents or repeat the entire plan in progress messages.
- Research only unfamiliar/version-sensitive integration points, using official documentation. Read platform-specific skills only when that platform is active.
- Run focused tests during each step and one integration/build pass at the delivery boundary. Repeat checks only after relevant changes or failures. Limit visual review to one initial pass and one correction pass unless a concrete defect remains.
- No paid provider request without an approved budget. Prefer an already configured suitable free quota; otherwise complete and test the pipeline with clearly labeled fixtures/manual input, identify the exact missing provider configuration, and report vision as unverified/blocked. Do not disguise a mock as successful live integration.
- Never silently reduce required behavior to save credits. If a hard spending/tool limit blocks completion, deliver the working increment and an exact remaining-work list. Do not claim exact coding-credit expenditure unless the environment exposes trustworthy accounting.
- Android comes first. After the verified APK and handoff, stop and let me test. Do not spend credits implementing iOS before I ask to continue.

## Verification and Android handoff

Test meaningful boundaries: native auth expiry/refresh/logout and invalid exchanges; ownership/shared-recipe access; invite expiry/replay/concurrency; EN/FR ingredient normalization and no false substitutions; matching/quantity uncertainty; shopping fractions/units; and timer/progress restoration. Exercise real integrations where configured and label fixtures separately.

Cover these end-to-end journeys with an emulator/device when available:

1. Existing account signs in, loads its own recipes, creates/edits one, relaunches, and sees the persisted result.
2. A second account accepts an invite, receives one explicitly shared recipe, and cannot open any unshared recipe or edit the owner's recipe.
3. A photo is analyzed, suggestions are corrected, authorized matches appear, and missing items reach Shopping. Refusing the camera or exhausting the quota retains the manual path.
4. A timer and cooking step survive background/recreation; downloaded owned recipes and shopping work offline.
5. Sharing a URL into Recipe Buddy leads to a reviewable draft and a confirmed save; unauthenticated entry resumes after sign-in.
6. Removing a friendship or recipe grant denies subsequent access; logging out clears private caches.

Check light/dark, EN/FR, narrow phone width, large font scale, TalkBack, keyboard overlap, back navigation, denied permissions, and slow/offline networking. Capture real native screenshots of collection, detail, ingredient confirmation/results, invite QR, shopping, and cooking. A web screenshot is not native verification. If hardware/emulation is unavailable, clearly separate compilation/unit checks from unperformed device tests.

Deliver:

- A built debug APK when Android tooling is available, with its exact path and package ID. No store publishing required.
- Short phone instructions: installing the APK or adb install -r, configuring the backend, and the test sequence. A phone's localhost is not the computer's backend; document the reachable HTTPS development/staging URL and any debug-only local-network setup.
- mobile/README.md with reproducible build/run commands, required configuration names without secret values, link/signing setup, and current integration limitations.
- mobile/API.md and mobile/IMPLEMENTATION.md updated with completed, blocked, and deferred items, plus migration/deployment steps that have not been performed.
- Test/build results and the real screenshots. Do not describe an APK as connected to new server features until the matching backend is actually running in the configured environment.
- A short summary of the Android changes and any manual action I must take. If something is blocked, state precisely what still works.

## iOS milestone — execute only when I say to continue

Reuse the agreed API contracts, permissions, matching algorithm, feature scope, and brand tokens. Do not restart product discovery or reimplement the backend. Read the Android handoff and my phone feedback first; port the proven product behavior while following native iOS conventions.

Create mobile/ios as a real Swift/SwiftUI Xcode project with a shared build scheme. Use NavigationStack/TabView, structured concurrency, URLSession, Keychain for credentials, an appropriate small persistence layer, PhotosPicker/camera APIs, native QR scanning, ShareLink/system sharing, local notifications, and a lightweight Share Extension. Select a practical documented deployment target based on stable APIs and actual testing access. Gate newer APIs and provide fallbacks. Use SF Symbols and platform typography where appropriate; keep brand headings/palette consistent. Do not add custom glass effects solely to appear fashionable.

Implement feature parity with the delivered Android milestone: existing accounts, recipes and shares, camera/manual matching, link/QR invites, cooking/timers, offline shopping/owned downloads, share import, and the home-screen cooking widget. Preserve Dynamic Type, VoiceOver, Reduce Motion, keyboard dismissal, native back/swipe behavior, safe areas, and permission recovery. Configure Universal Links and extension entitlements correctly; preserve invite/import handoffs through authentication. Review current Apple sign-in requirements before a future App Store release if third-party login is offered, without blocking the Android milestone on store work.

Build/test with macOS and Xcode when available, then deliver simulator screenshots, test results, and physical-device signing/run instructions. This repository may be on Windows: Windows alone cannot verify an iOS app build or produce an honestly validated iPhone binary. Check access once; if unavailable, preserve the source and exact handoff commands, clearly report the unverified build, and do not install irrelevant Windows tools or claim an IPA/TestFlight release exists.

Start now with the bounded inspection and the first Android vertical slice. Continue through the Android milestone unless a real external blocker prevents it.
