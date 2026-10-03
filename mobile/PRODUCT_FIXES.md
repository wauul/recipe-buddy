# Android product fixes — 2026-10-03

These changes retain Recipe Buddy's cream, forest-green and Bricolage identity and normal Android font scaling.

## Offline account

An online session hydrates all owned recipe pages, shared recipes, account/chef data, friends, blocked chefs, pantry, shopping, progress and timers into account-scoped Room storage. Recipe photographs and discussion/sharing/connected-chef details are prefetched with bounded refreshes. Cooking and ingredient matching work from the local collection. Manual download actions, download badges and the Downloaded tab have been removed; the collection uses the automatic account cache.

Each edit and its durable outbox entry commit in one local transaction. Stable operation/item IDs and transactional server receipts make lost-response retries idempotent. WorkManager, reconnect events and foreground refresh drain the queue. Multi-device recipe and kitchen conflicts retain local changes and offer recovery instead of silently discarding them. Pending edits are protected from incoming snapshots; incomplete pagination cannot prune recipes. Account changes, logout, revoked shares and blocked chefs clear the applicable private caches. Expired sessions retain local data for reauthentication with the same account.

New AI work, new invitation generation, username discovery and initial sign-in need a connection. Previously requested explanations can be reused offline. Revocation on another device is discovered on reconnect; information already copied elsewhere cannot be remotely erased.

## Inputs and cooking

The chef roast appears first in a distinct green card. Recipe actions use a spacious, scrollable bottom sheet with app-language resources, grouped actions and a separated delete action. Native create/edit uses the same automatic bilingual server flow as web; no manual language-preparation action remains. Titles, subtitles, ingredients, quantity/unit phrases, instructions and roasts use saved English/French copies. Pending translations refresh quietly while the recipe is visible and online, without overwriting an unsent local edit; completed copies remain available offline. Unfinished owned versions retry after provider outages with a distributed five-minute version lease and an account limit. Retries retain the roast, recheck the saved version and skip completed/deleted/changed recipes.

Aprons, twists and comments load on entry, tab changes, resume and reconnect, then update every 30 seconds while visible. The Refresh button is removed. Cache observation makes newly fetched data appear automatically while retaining optimistic offline contributions.

Quantity and timer fields request a number/decimal keyboard and reject pasted letters, with limits appropriate to servings, steps and durations. Decimal commas are supported. Ingredient and shopping units offer familiar presets and a custom option; existing nonnumeric recipe quantities remain readable. URL/email fields request appropriate keyboards and long text has clear limits.

The free Voice Chef reads only the current step after an explicit tap. Scrolling, recomposition and opening cooking never start speech. Playback stops when changing steps, leaving cooking or backgrounding. Pro adds advanced AI explanations and explicit one-command speech input. The recognition service may process audio remotely; recognized text is sent to the advanced model only after consent. The classifier returns a bounded action list and uncertain commands do nothing. The app retains no command audio/transcripts.

## Friends and Pro

Invitations automatically show a large QR and a shareable acceptance link with a friendly localized message. Username suggestions appear after three characters and a 450 ms typing pause, with obsolete requests cancelled and results cleared on leaving. The server checks authenticated sessions, limits each account to 30 searches/minute and 240/hour, escapes wildcard characters and returns at most five public names/IDs with no pagination or private fields. Self and blocked identities in both directions are excluded. Results scroll into view above the keyboard. Recipients can accept or decline. The embedded scanner accepts QR codes only. Replacing a single-use code revokes the old one.

Profile prominently exposes Pro, and gated features open its plan sheet. Google Play product `recipe_buddy_pro` has active auto-renewing base plans `monthly` (P1M, €9.99) and `yearly` (P1Y, €99.99) in euro-priced regions. Prices in other currencies come from Google Play regional pricing; the Samsung test account returned USD prices. The app displays actual Play prices, recurrence and the full annual charge.

The approved billing service account is scoped to Recipe Buddy's app information/financial reads and order/subscription management. It has no publishing permissions or Cloud project roles. Private credentials and the AES-256 purchase-token encryption key are sensitive production Vercel variables and never enter the APK. The backend verifies product, allowed base plan, account binding, state and expiry, acknowledges purchases and encrypts stored purchase tokens. Restore and foreground recovery retry completed purchases interrupted by dismissal or process death. Pending purchases never grant Pro.

## Delivery and verification

- Backend deployed and promoted to `https://recipe-buddy-wauul.vercel.app`, deployment `dpl_6cLFmoU7jR7u7Ri9Lj3DnmaGHykM`. Guarded sync migrations confirmed applied; production build passed.
- Live disposable-account check passed: billing ready, monthly/yearly support, private account snapshot, exactly-once shopping replay, account deletion and stale-token rejection. No AI calls or paid purchases were made.
- Typecheck and 80 backend unit tests passed. Fourteen isolated integration groups cover sync idempotence, conflicts, typed kitchen state, blocked access, invite races, bounded public-name suggestions, authentication and free/Pro boundaries.
- Nine Android unit tests and debug/release lint passed. Eleven native instrumentation checks cover offline edits/recreation/reconnect, recipe conflict recovery, invitations/Pro/free voice, selected-language dialogs, automatic community updates, typed name suggestions, offline French content, arriving translations and protection of unsynced edits. Session rotation survives cancellation and safe reads recover from a dropped pooled connection. A separate stage/force-stop/recover sequence verified actual process-death persistence.
- The normal production-backend debug APK is `dist/recipe-buddy-product-fixes-debug.apk`. Samsung installation uses `adb install -r` and preserves app data. Phone launch and real Google Play product-price retrieval were checked.

Signed **0.1.1 (2)** was subsequently published to internal testing with English/French release notes; Play Console confirms it is available to internal testers. See [RELEASE_0_1_1.md](RELEASE_0_1_1.md). No real subscription purchase was made. A Play-installed signed build still needs purchase/restore/cancellation testing, spoken commands through the actual device service, and real-camera QR scanning. Device tests against local fixtures do not establish those final store/hardware results.

Screenshots are in `screenshots/product-fixes/`; `05-play-pro-plans.jpg` records both active base plans in Play Console. The isolated emulator's checkout is disabled because its backend intentionally has no billing credentials.
