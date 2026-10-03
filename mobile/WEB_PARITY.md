# Web feature parity — Android

Inventory taken from every kitchen page, recipe/social/account component, FAQ and web API in this checkout on 2026-10-03. This matrix describes the implemented native entry points. Device and backend proof is recorded separately below; implementation does not imply production deployment or iOS support.

| Web feature | Native location / behavior |
| --- | --- |
| Password login, Google login and account creation | Native email/password form toggles between sign-in and account creation; mobile Google Credential Manager. Existing account/token audience retained. |
| Private recipe collection | My recipes, image/category cards, search, vibe filters, cursor pagination, refresh and downloaded filter. |
| Choose for me | Shuffle action beside collection filters; chooses from the full owned collection, independent of current filters or loaded page. |
| Chef score and aprons received | Dashboard and Settings progress tile; server's 10 points per saved recipe + 2 per apron received, review totals and average. |
| Seven levels, illustrated badges and thresholds | Tap the progress tile for all seven original web badges, thresholds, earned/locked state and next-level progress. French level names match the web app. |
| Weekly cooking activity | Seven-day strip, distinct UTC Monday–Sunday cooking days, cooked-today state and idempotent Mark as cooked. |
| Manual recipe create/edit/delete | Editor with title, alternate title, photo/HTTPS image, servings, vibe, ordered ingredients and steps; delete confirmation. |
| URL/text import and browser import | Editor import section and Android's text/URL share target, followed by editable confirmation. The Chrome desktop extension continues to use the web editor; it cannot run inside Android Chrome. Native Share to Recipe Buddy is the mobile equivalent. |
| Photos and category illustrations | Native camera/gallery picker, compression, preview/remove, HTTPS URL; original web artwork when a recipe has no photo. |
| Recipe details, update date, ingredients and method | Native detail screen with original/saved translated content and Start cooking. Shared recipes remain read-only. |
| Per-recipe roast and fresh roast | Settings preference, displayed saved roast, New roast in owned recipe menu. Same server provider, validation, quotas and failure preservation. |
| Saved English/French versions and preparation retries | Selected app language reads saved translations; Prepare English & French in owned recipe menu. Original text remains available if preparation is pending or unavailable. |
| Friend request by email, accept/decline/cancel/remove | Friends list and request section; alternative connection methods in invitation screen. Removal confirmation and bilateral share revocation. |
| Share/revoke a recipe per friend | Owned recipe Share sheet shows current recipients and permission state. Stopping sharing requires confirmation. |
| Read friends' recipes | Friends → Shared with you; friend action sheet → View chef's kitchen → only that friend's explicitly shared recipes, plus chef progression. Friendship alone grants no private-recipe access. |
| Apron reviews | Recipe → Aprons: average/count, 1–5 apron picker, optional note, one editable review per other chef, update and removal. Cannot rate your own recipe. Server recalculates the owner's score. |
| Kitchen twists | Recipe → Twists: all eight web categories, title/change, optional ingredient link/reason. Original recipe remains intact. |
| Recipe comments and twist replies | Recipe → Comments for recipe discussion; expand a twist's Comments to read/reply. Current chef names and attribution/date retained. |
| Contribution moderation | Authors delete their own twists/comments; original owner can remove any contribution. Deleting a twist cascades replies after confirmation. Access is rechecked server-side. |
| Conversation translation | Translate conversation uses the same bounded, account-scoped translation API; original contributions stay intact and numbers/measurements retain server integrity checks. |
| Full search | Magnifying glass in root header: original/saved translated names, subtitle, ingredients, steps, own/shared recipes, help answers and app destinations. |
| Shopping list generation and combining | Shopping → From recipes, owned and authorized shared recipes, same server ingredient/unit merge rules. Native checklist supports local edit/delete/undo/share. |
| Print layout | Deliberately web-only: user explicitly requested removing printing from mobile. Native menus, help and implementation contain no print action. |
| Chef name, roast preference, language/theme, logout | Native Settings; EN/FR, system/light/dark, current chef progress and local-data purge on logout. |
| Help & FAQ, contact | Settings → Help & FAQ, ten canonical bilingual web FAQs (printing omitted), copyable recipe text example and support email draft. |
| Privacy, terms and account deletion | Native offline legal readers, account/terms gate and authenticated deletion, same canonical legal content as public website pages. |
| QR invitations, moderation/block/report | Additional native functionality retained, alongside all existing web social paths. |
| Downloads, cooking steps, timers, ingredient matching, visual widget and Voice Chef | Additional Android functionality retained. Voice and command locale follow the selected app language. |

## Publication boundary

The native API and migrations are deployed to the website's existing production backend; the installed APK uses its HTTPS URL. [LIVE_BACKEND.md](LIVE_BACKEND.md) records physical live login, identical web/mobile recipe-ID checks, temporary-account cleanup and rollback point. Upload signing, Play certificates and store/operator checks remain in PUBLICATION.md. Local fixture verification itself makes no paid provider calls or production writes.

## Verification

- Backend unit tests: 65 pass. Typecheck and ESLint pass; Next 15 production build passes.
- Eleven guarded isolated-PostgreSQL integration groups pass, including native apron create/update/remove and score changes, twists/replies and owner moderation, search authorization, friend-kitchen share filtering, and access after revocation. Zero model-provider calls.
- Final Android debug APK, instrumentation APK, seven unit tests, debug/release lint and R8 release bundle build pass. Upload AAB is unsigned.
- Samsung SM-S918B, Android 16: NativeParityTest passes (30.991 s): seven badge entries, friend kitchen, apron create/update/remove, twist creation and cascade deletion, threaded reply, recipe comment, French community labels, full search and absent mobile print action. Initial search checks failed because the test's Back press navigated away when no keyboard was visible; entering text, asserting it and clicking Search directly passes.
- The same final build passes Friends/legal/Voice Chef/QR/widget regression (20.138 s), including QR decoding at 1024/240 px and Previous/Next while the launcher remains foreground.
- French/dark Friends/QR and offline TTS/command locale selection pass independently (3.156 s). Earlier attempts assumed an English initial screen while the app retained French; the test now begins from account state regardless of selected language.
- NativeJourneyTest passes on the final build (12.704 s): collection/detail/cooking/back navigation, download, shopping, invitations, ingredients/matching and recreation. The test now scrolls the lazy detail list to compose Add to shopping before clicking it.
- Screenshots: [web-parity-01.jpg](screenshots/review/web-parity-01.jpg). Fixture recipes use original category artwork; actual saved photos retain their normal image path.

## Interface review

Full requested scope; Kotlin/Jetpack Compose, existing Material 3 colors/type/spacing.

| Category | Review |
| --- | --- |
| Typography | Bounded card headings, full author names, compact one-line community tabs. |
| Surfaces | 16 dp gutters, focused sheets, photo thumbnails and 44–48 dp touch actions. |
| Icons | Existing outlined Material set plus original web badges and apron glyph. |
| Animation | Existing navigation; no new custom motion. Inspection at 10% speed remains unverified. |
| Performance | Lazy lists, 50-item collection pages and bounded translation batches. Frame profiling remains unverified. |

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| High | Dashboard / Settings | No chef progression | Tappable score tile and seven-level roadmap | Makes web achievements discoverable. |
| High | Recipe community | Missing contributions | Aprons, Twists and Comments tabs with focused forms | Supports every web contribution type. |
| Medium | Friends | No chef kitchen | Permission-scoped shared recipe collection | Makes friends' recipes reachable. |
| Medium | Sharing | Ambiguous recipients | Current permission state and revoke confirmation | Explains who can read a recipe. |
| Medium | Navigation | Missing search/help/signup/personality actions | Reachable native entry points | Completes web feature access. |
| Medium | Detail / cooking | Last active recipe could differ from route | Recipe-ID-bound destinations | Back navigation restores the right recipe. |
| Medium | Community header | Long labels and toolbar | Short tabs, thumbnail and compact action row | Keeps the screen balanced on a phone. |
| Low | Mobile printing | Print action and FAQ | Removed | Matches the user's explicit request. |

Rejected: expose an accepted friend's whole private collection (violates the existing sharing policy); mix reviews/twists/comments into one long detail feed (too much text on the primary cooking screen); replace original web badges with generic trophies (loses app identity).

Verdict: inspected EN social/score/chef screens and FR community layout are consistent with the app's cream/forest identity and readable on the Samsung. The recorded device checks establish these flows, not every accessibility or motion scenario. Large-font/TalkBack, frame profiling and slow-motion animation review remain unverified publication checks.
