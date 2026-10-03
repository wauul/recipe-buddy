# Native Android UI review — 2026-10-03, revised

Full review of native Kotlin/Compose Android, using the existing Material system. References: Recipe Buddy's web category illustrations and recipe media, Kitchen Stories collection/detail, Halide photo controls, WhatsApp list hierarchy and Apple Invites. Requested design/native skills informed hierarchy, native controls, spacing and restrained motion; iOS/App Store Connect remains deferred. Identity retained: chef hat, cream/forest palette, Bricolage headings and original kitchen scenes.

## Coverage

| Category | Inspected | Result |
| --- | --- | --- |
| Typography | EN screens, FR settings; original font, recipe wrapping, chef names | Shared type roles; full friend names replace truncated avatar labels |
| Surfaces | Photo source sheet, ingredient editor, collection/detail, Friends, QR, legal and deletion | 16 dp gutters; 12 dp row spacing, 24 dp section separation; native sheets and labelled primary actions |
| Animations | Navigation, sheet dismissal, focus/IME behavior on the physical phone | Restrained root/drill-down transitions and Material feedback; 10% motion replay not performed |
| Icons | Ingredients leaf, Material nav/action states, QR patterns, launcher identity | Consistent outlined/filled family and labelled actions; adaptive hat retained |
| Performance | Lazy collections, bounded photos, Room observations, local voice, widget | Virtualized lists; no widget polling or microphone retry loop; frame profiling not performed |

## Resolved findings

| Severity | Location | Before → after | Reason |
| --- | --- | --- | --- |
| Medium | Theme.kt | Inconsistent font axes/roles → bundled licensed Bricolage at 700/28, shared Material roles | Preserve the web identity with readable type |
| Medium | Screens.kt login | Text-heavy entry → editorial ingredient image, concise controls, native Google picker | Familiar sign-in with clear provider/cancel states |
| Medium | Screens.kt collection | Small fallback art and busy text → square media, complete original web kitchen scenes, two-line titles, compact metadata | Make recipes visually scannable; actual recipe photos take priority |
| Medium | Screens.kt detail | Missing visual identity/scrolling primary action → photo/category hero and pinned Start cooking | Clear recipe context and reachable action |
| Medium | MainActivity.kt | Repeated headings and heavy chrome → one root title, outline/filled navigation, Ingredients leaf, readable system bars | Lower visual density and recognizable destinations |
| Medium | PhotoUi.kt | Several competing photo buttons → one image overlay and Camera/Gallery source sheet | Use familiar photo acquisition with cancellation/error handling |
| Medium | IngredientsUi.kt | Repeated inline forms → compact rows, scrollable edit/add sheet, image hero and results auto-scroll | Improve spacing while preserving confirmation and quantity caveats |
| Medium | TaskScreens.kt editor | Import and photo controls dominated manual editing → collapsed import, shared photo tile, 16 dp gutters | Keep manual editing direct |
| Medium | Screens.kt shopping/settings | Forms/repeated headings crowded common tasks → checklist-first, sheets, compact preferences and account/legal actions | Put frequent tasks and required account controls where expected |
| Medium | FriendsUi.kt | Mixed avatar rail/feed and clipped names → Your chefs / Shared with you tabs, full-name rows, distinct request section and chef action sheet | Separate contacts from shared recipes and keep names readable |
| Medium | FriendsUi.kt invitations | Oversized bare QR and many methods together → smaller forest-green rounded QR, white quiet zone, My code / Scan tabs, one Share action and secondary connection sheet | A branded code with a clear invitation hierarchy |
| Medium | CookingWidget.kt | Launcher shortcut → offline selected instruction, scrolling body, Previous/Next controls and explicit Open app | Follow the recipe on the launcher; stale taps cannot skip multiple steps |
| Medium | VoiceChef.kt / AccountUi.kt | No coaching/moderation/account lifecycle → technique explanations, repeat/preview/ingredients commands, optional fictional roasts, report/block and legal/deletion controls | Support cooking and account responsibilities with native permission/confirmation states |

## Rejected candidates

- Stock food photos for saved recipes without an image: would misrepresent the user's recipe. Use the original category scenes instead.
- A logo obscuring QR modules or a low-contrast QR gradient: would harm scanning. The rounded dark-green modules retain all encoded data and a four-module white border.
- A framework rewrite to Expo/React Native: the brief requires native Android first; platform principles apply without replacing Kotlin.
- Persistent background microphone or silent cloud recognition fallback: the current disclosed voice experience uses short on-device commands while cooking is visible.

## Verification and verdict

Physical Samsung SM-S918B / Android 16: the revised native journey passed through collection/detail/cooking, downloads, shopping, invitation QR, manual ingredients, saved matches and activity recreation. NativeProductTest passed Friends/chef actions, report cancellation, QR decode at 1024 and 240 pixels, scan tab, native privacy/deletion UI, installed offline voice explanation controls, microphone disclosure/cancellation and real launcher Next/Previous with foreground remaining the launcher. Fresh screenshots contain no Messenger chat head.

The French/dark-mode sweep passed independently, including selecting the installed offline French voice and fr-FR command locale, then switching back to English/en-US. The combined run timed out waiting for the fixture account before that French test; its standalone retry passed. Debug and unsigned shrunk release bundle builds, unit tests and debug/release lint passed. Earlier native design/photo tests passed Google picker cancellation and photo acquisition/cancellation/manual editing; no personal Google identity was selected and no provider recognition was called. The additional web feature parity review is in WEB_PARITY.md.

Verdict: **local UI review passed for the inspected standard-size screens**. Production publication is still conditional on the concrete deployment/signing/provider/store/operational checks in PUBLICATION.md. Acoustic microphone recognition, real-provider recognition, Play installation, TalkBack/large fonts, 10% motion review and frame profiling have not been established by these screenshots or fixture tests. Voice Chef currently uses local technique coaching, not an open-ended AI conversation.
