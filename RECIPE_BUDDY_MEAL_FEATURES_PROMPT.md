# Development assignment: cooking results and connected meal planning

Implement both features fully in the existing Recipe Buddy product:

1. Cooking occasions with photos, personal ratings/comments, explicit eating records, and optional friends activity posts.
2. An intelligent agenda supporting quick meal ideas and weekly planning, connected to rich household health profiles, pantry inventory, leftovers, and shopping.

Deliver functioning, durable, integrated software with beautiful design and easy everyday use. Implement and verify the actual workflows. The complete product requirements are in `MEAL_PLANNING_SCOPE.md`, including automatic ingredient deduction added after the initial brainstorm. Treat `HEALTH_PLANNING_RESEARCH.md` as evidence and research starting points, not clinical certification. Read both documents completely before implementation. These requirements apply together; a polished screen cannot substitute for working persistence, permissions, integrations, or verification.

Prioritize France and the United States for the initial release, especially Pro grocery basket preparation and confirmed checkout. Provide explicit verified retailer/store/service-location coverage in each primary market. Expand elsewhere in Europe afterward according to real integration feasibility; document a ranked expansion backlog without making other European countries a prerequisite for the France/US milestone. Preserve country-specific health validation, localization, currency/units, permissions, and checkout integrity in every expansion.

## 1. Establish the current product and implementation checklist

Work in the existing Recipe Buddy repository. Read applicable AGENTS.md instructions, then inspect Git status and preserve all existing work. When interacting with Cloudflare, use the cf CLI unless the project has a Wrangler configuration file.

Read `DESIGN.md`, `CONTEXT.md`, `package.json`, the Prisma schema, the relevant existing recipe/cooking/shopping/social APIs, and `mobile/README.md`, `mobile/DESIGN_REVIEW.md`, `mobile/WEB_PARITY.md`, and native sync documentation. Source code is authoritative where older snapshots differ. Inspect additional files as their dependencies become relevant rather than ingesting the entire repository.

Implement the features on the existing website and native Android client, using their shared backend and accounts. Preserve the Kotlin/Jetpack Compose Android architecture, current web stack, native sessions, offline synchronization, themes, languages, and security protections. iOS is a separately authorized milestone in the existing project; retain that boundary unless later instructions explicitly change it.

Create one implementation checklist mapping every requirement to its data/API, web, Android, and verification work. Identify genuine external dependencies separately. Resolve routine product and implementation choices autonomously using the agreed scope and existing conventions. Begin implementation after this bounded inspection, without waiting for layout or plan approval.

Use an isolated development/test database and separate test identities. Inspect build and migration helper guards before running them. Keep existing users, recipes, friendships, apron reviews, chef progression, and native features working through backwards-compatible migrations. Existing cooked-day records do not prove that a dish was eaten: migrate them without inventing eating events, servings, or inventory consumption. Preserve legacy activity/score semantics while supporting multiple new cooking occasions per day.

Completion criterion: the checklist covers the whole scope, the current architectures and data boundaries are understood, and there is a safe development environment for persistent end-to-end verification.

## 2. Preserve and extend the product's design

Use the design skills already documented in this project:

- Web: apply the installed Impeccable skill and the established guidance in `DESIGN.md`, including relevant Taste and UI/UX Pro Max principles where available.
- Android: apply ui-craft and make-interfaces-feel-better. The existing native review also used expo-native-ui and vercel-react-native-skills as design/performance guidance; adapt relevant principles to Compose, preserving the actual native implementation.
- Read the installed skill instructions before applying them. Missing optional skills should lead to using the documented design principles, not blocking the work or installing a new framework. Platform accessibility and interaction requirements take precedence over framework-specific examples.

Preserve Kitchen Index: warm cream, forest/sage green, Bricolage headings, existing semantic tokens, original illustrations, chef badges, and recognizable native controls. Extend shared theme/components rather than building unrelated visual systems. Preserve product terminology while clearly distinguishing a personal meal rating from an apron recipe review.

Design day/week agenda views, a quick-suggestion flow, pantry management, shopping, household/profile setup, cooking follow-up, and friends activity as one coherent experience. Keep common actions short, reachable, and understandable. Use progressive disclosure for advanced health, inventory, and household details. A careful planner must retain detailed control without imposing lengthy forms on a casual cook.

Adapt navigation to make Agenda and Pantry clearly discoverable without hiding existing tasks or overcrowding phone navigation. Build complete loading, empty, partial-data, error, retry, unavailable-service, offline, sync-conflict, success, undo, permission-denied, and account-expired states. Preserve drafts through recoverable failures.

Fully localize English/French UI, quantities, pluralization, dates, accessibility labels, errors, and permission explanations. Guidance country, language, units, and timezone are separate choices. Verify light/dark/system themes, large text, keyboard/TalkBack navigation, reduced motion, mobile safe areas, keyboard visibility, and desktop/tablet layouts.

Completion criterion: every new workflow has complete interaction states and uses the existing visual identity on web and native Android, verified in rendered screens.

## 3. Implement cooking results and friends activity

Replace the single cooked-day action with an occasion-aware action that confirms servings prepared, prefilled from the current recipe scale or planned meal. Save cooking and its automatic pantry effects as one consistent operation. Offer a concise success state with Undo, followed by an optional sheet for:

- Camera/gallery photo, preview, replacement, and removal.
- Personal enjoyment rating for this occasion, distinct from scored apron reviews.
- Private comment and optional actual ingredient/yield corrections.
- Explicit 'I also ate this' entry, with editable date, meal slot, person, and optional amount.
- Explicit share-to-friends selection with a preview of the fields being published.

Allow repeat cooking occasions, later eating records, backdating, and leftovers. Cooking for someone else must not populate the cook's food diary. Photo/rating/comment completion must not gate a successful cooking save or stock deduction.

Store photos durably with appropriate size/type limits, orientation handling, metadata removal, compression, private access, and deletion/cleanup. Enforce authorization on media access as well as database reads. Implement actual camera/picker failure and permission recovery, including manual use without photos.

Add friends activity within the existing social area, with real pagination, cooking-result posts, simple reactions, attribution, and recipe links only where separately authorized. A photo post must not automatically grant private recipe access. Personal ratings do not affect chef levels. Preserve existing blocking/reporting behavior and correctly revoke friends-only access after friendship removal. Distinguish deleting a public post, deleting its photo, editing a private occasion, and undoing cooking.

Completion criterion: a real authenticated cook can save two distinct occasions, upload a photo, record eating, explicitly share a result, and another authorized friend can view/react; unauthorized and removed friends cannot access the post/media or private meal/health data.

## 4. Implement rich pantry and automatic consumption

Implement persistent individual/household pantry records, presence-only and precise-quantity modes, packages/batches, product/brand identity, storage locations, relevant package/opening/freezing dates, and label/allergen evidence. Provide quick manual add/edit/use/discard, correction, and undo. Connect existing ingredient recognition to user-confirmed pantry entry where appropriate. Implement usable barcode/receipt assistance where verified providers permit it; record actual external dependencies and retain fully working manual paths.

Automatic cooking deduction is required:

`ingredient amount consumed = recipe ingredient amount × servings prepared / recipe reference servings`

A recipe for four servings with 300 g rice and 600 g chicken must consume 150 g rice and 300 g chicken when two servings are marked cooked. Record actual substitutions, omitted optional ingredients, and quantity overrides. Preserve the recipe and consumption snapshot so later recipe edits cannot rewrite history.

Normalize quantities, fractions, ingredient names, and compatible units with meaningful distinctions preserved. Use documented conversions only. Handle presence-only amounts, 'to taste', ambiguous products/units, unknown package sizes, and insufficient stock explicitly. Apply exact known deductions automatically, retaining unresolved usage as a visible reconciliation task. Avoid fabricated quantities, unlogged purchases, negative stock, and arbitrary substitutions.

Use transactional, idempotent, reversible inventory operations linked to the cooking occasion. Repeated taps, retries, and offline replays apply each operation once. Editing servings/ingredients reconciles the old and new effects. Undo restores the recorded consumption without overwriting unrelated purchases or another household member's usage.

Allocate stock virtually when planning; deduct it physically when cooking. Prevent double allocation. Separate raw ingredients from cooked leftover batches. Eating leftovers must not deduct original recipe ingredients again. Recalculate future availability and shopping needs after every relevant change.

Completion criterion: stock totals and history remain correct across scaling, substitutions, insufficient stock, multiple batches, edits, undo, simultaneous household actions, and offline replay, with understandable unresolved states.

## 5. Implement the agenda and connected shopping

Build local-date day/week views distinguishing planned, cooked, and eaten. Support recipes, food-chip/free-text external meals, eating out, recurring practical schedules, household diners, batch cooking, and leftovers. Free-text interpretation needs user confirmation; an unlogged meal is unknown.

Provide both entry points:

- 'What should I cook?' gives a few suitable saved/shared recipe candidates for the requested meal and current circumstances.
- 'Plan my week' fills selected meal slots while retaining locked meals, selected diners, preferences, practical constraints, leftovers, and the user's edits.

Implement accessible add, edit, swap, move, remove, lock, and repeat actions. When actual eating differs from the plan, offer an adjustment rather than silently replacing locked choices. Recommendations use actual eating history separately from planned meals and cooking history.

Integrate the shopping list with portion-scaled requirements, selected planning horizon, virtual pantry allocation, and leftover meals. Combine compatible deficits, link each generated item to contributing meals and first needed date, and show 'Ready to cook', 'Missing ingredients', and 'Check quantities'. Distinguish ingredient readiness from health assessment.

Preserve manual shopping items and completed purchases when plans change. Support partial purchases, actual product/quantity changes, package sizes, purchase-to-pantry addition once, household editing, and offline synchronization. Product substitutions re-enter the health checks. Price estimates require an actual source/date; retain honest unavailable states without fake prices.

### Pro prepared grocery basket with final confirmation

Implement the full 'Pro grocery basket preparation and confirmed checkout' section of `MEAL_PLANNING_SCOPE.md`. Add a separate Buy online item selection, retain existing purchased-checkmark semantics, and enforce the existing server-verified Pro entitlement for new basket preparation. Match selected requirements to actual permitted retailer products/packages using known quantities, preferences, and supported health checks. Show quantity surplus, product evidence/unknowns, missing items, actual prices/estimates, fees, fulfilment/location, slot, substitution settings, and current retailer authorization terms.

Integrate official supported discovery/catalogue/cart/checkout flows for the initial France and US markets and expose provider/store/location capabilities accurately. Evaluate access, catalogue/product evidence, checkout/status/substitution support, cost, and operational requirements before selecting each connector. A shoppable-list handoff can be supported, but cannot be labelled a completed order or an exact prefilled product basket where the API does not provide it. Refresh material changes before the user's final confirmation. Use provider-supported sign-in/payment authentication and keep payment/retailer credentials out of ordinary storage/logs. Protect checkout against duplicate requests and reconcile uncertain outcomes using authoritative provider evidence or an honest manual reconciliation path.

Model ordered goods as incoming until actual receipt. Reconcile real delivered products and quantities once, including partial/weighted delivery, substitutions, damaged/missing items, and returns/refunds. Recheck changed products, then update pantry and future shopping/readiness. Retain order history, receipt reconciliation, and actual retailer support after Pro expires. Plan edits alone cannot cancel orders, spend again, or reverse charges. Verify the complete selected-item-to-confirmation-to-receipt workflow, unknown checkout status, stale basket changes, retries, permissions, provider outages, and receipt replay. Use sandbox/test orders; this assignment does not authorize live spending. Document real provider approval/credentials or unavailable capabilities individually while completing independent software work.

### Kitchen check-in and preparation agenda

Implement the full 'Kitchen check-in, preparation agenda, and Pro week rescue' section of `MEAL_PLANNING_SCOPE.md`. Kitchen check-in and ordinary preparation planning are available to everyone. Provide an optional short flow focused on unresolved meal consumption, uncertain pantry quantities, leftovers, snacks/drinks, and practical schedule/diner changes. Prefill actual known data, save incrementally, preserve interrupted work, respect household/private-profile permissions, and retain skipped answers as unknown. Use existing underlying operations so repeated confirmation cannot duplicate events or inventory changes. Reminders are optional and user-controlled.

Implement linked preparation tasks with actual supported/user-entered timing, dependencies, household assignment, agenda/checklist views, and optional reminders. Preserve completed tasks and overrides through meal changes. Missing food-safety/timing information needs explicit uncertainty rather than invented instructions. Any actual ingredient use during preparation participates in the same consumption accounting so the final cooked action does not deduct it twice. A preparation task is not proof of eating or safe storage. Verify timezone, reminder, permission, interruption, edit/move, and partial-consumption behavior on web and Android.

### Rescue my week Pro

Implement Pro adaptive replanning as an enhanced version of ordinary week editing, enforced with the existing server-verified entitlement. Basic meal edits, check-ins, preparation tasks, pantry corrections, shopping recalculation, and common health checks remain available to everyone; accepted plans/tasks remain accessible after Pro expires.

Generate up to three feasible rescue proposals prioritizing purchased food/leftovers, lower active cooking effort, or fewer extra groceries. Account for actual stock and evidence quality, recent actual eating, selected diners, supported health restrictions and preferences, date/storage information, locked meals, cooking availability/equipment, and existing preparation tasks. Show grounded tradeoffs, missing information, and the actual feasible result count. External discovery is a separate explicit Pro action; rescue cannot silently import web recipes or run unbounded paid searches.

Preview the meal, ingredient-allocation, generated-shopping, and preparation-task changes. Support selective acceptance, cancellation, and undo. Revalidate modified proposals and stale profile/pantry/plan/rule versions; apply acceptance consistently and idempotently. Preserve completed purchases/events, manual shopping items, locked choices, and permissions. Replanning alone changes no physical stock or eaten history. Undo must preserve subsequent unrelated purchases/cooking and surface genuine conflicts. Verify household concurrency, partial acceptance, retries, stale-state handling, provider outages, revoked Pro, and unchanged health constraints in every alternative.

### Use what I have and Pro discovery from the internet

Implement the full 'Use what I have and Pro internet discovery' section of `MEAL_PLANNING_SCOPE.md`. The ordinary mode searches saved/currently authorized shared recipes using selected pantry ingredients. The Pro action obtains actual internet candidates and targets three distinct eligible, importable recipes, using pantry quantities, preferences, actual eating history, selected diners, supported health restrictions, country guidance, daily context, time, and equipment.

Choose and verify a real discovery integration and its content/import/image rights; record the setup and cost requirements before paid activation. Retrieve and parse complete source recipes before assessment/display. Structured Recipe data is preferred; validated extraction must preserve original instructions/quantities and uncertainty. Treat external content as untrusted and reuse the project's safe URL-fetch/redirect protections. Fewer valid matches must yield fewer results with an explanation, not invented filler or relaxed restrictions. Use the same health engine for saved and external recipes.

Each candidate shows attribution, actual supported metadata, pantry coverage/missing ingredients, and grounded recommendation reasons. Selecting 'Import this recipe' privately persists that assessed recipe and opens it without a second routine save flow. Preserve source/provenance, deduplicate repeated import operations, and revalidate stale candidates/profile/rule changes. Incomplete recipes have an explicit review-needed path. Import itself does not consume pantry or log eating. Saved imports remain usable after Pro lapse where content rights permit.

Enforce the existing server-verified Pro entitlement across web and Android discovery/import endpoints. Retain purchase/restore behavior and distinguish billing setup/outage from inactive membership. Minimize search-provider disclosures, bound search/extraction calls, cache appropriately, and add explicit quotas/timeouts/cost controls. Verify real sources and one-tap import, fewer/no matches, changed sources/profiles, extraction failure, private attribution, retries, expired entitlements, and continued access to saved imports. If credentials or licensed content access are unavailable, complete the configurable implementation and manual paths, and report the real integration blocker without substituting mock live discovery.

Completion criterion: a real plan generates correct groceries, purchases can update pantry, cooking consumes stock, eating informs subsequent suggestions, and edits reconcile the whole chain without duplicate or lost data. Kitchen check-in and preparation tasks update only their intended records, with partial consumption counted once. A verified Pro rescue previews, selectively applies, and safely reverses consistent future-plan changes while preserving health restrictions and existing records. Use-what-I-have matches real authorized recipes, and a configured Pro discovery request produces actual assessed internet recipes with a verified one-tap import path.

## 6. Implement substantial health support with traceable evidence

Read and operationalize the entire health section of `MEAL_PLANNING_SCOPE.md`; consult the research note and verify current primary sources. Prioritize France and the US for individuals and households including children, with the rest of Europe as subsequent country-by-country expansion. Implement a country/age/condition coverage manifest with required evidence, combinations, rule versions, sources, reviewer status, and explicit unresolved/unsupported situations. Preserve the broad intended market; clearly identify which country-specific modules are actually validated instead of silently substituting one national rule set for all Europe.

Build progressive profile setup and settings for allergies, intolerances, coeliac disease, pregnancy/breastfeeding, separate diabetes categories, other declared health circumstances, preferences, goals, practical routine, and relevant clinician-provided constraints. Collect only data used by a supported function. Daily work/gym/rest/flexible-day context is separate and expires appropriately. Permission to use health data is explained at the appropriate moment and separated from social sharing.

Provide caregiver-managed child profiles and age-specific handling. Plan for the actual diners at each meal with granular adult-health/household permissions. Combined restrictions must be evaluated together. Adult targets cannot automatically apply to children; infants and therapeutic diets need explicitly reviewed modules.

Implement stable restriction checks before preference ranking and after any model-generated interpretation, substitution, or editing. Rank eligible candidates using recent actual eating, weekly variety, profile preferences, time, available ingredients, leftovers, equipment, budget evidence, and goals. Keep cooking-attempt feedback separate from enduring dislikes. AI explanations or preferences cannot override health checks, and free text/images/model outputs are untrusted.

Use real food-composition/product data with source/version, ingredient match, preparation state, quantities, yield, completeness, and uncertainty. Missing nutrient values are unknown, not zero. Broad external food entries support broad variety reasoning, not invented precise intake, deficiencies, or medical suitability. Resolve compound ingredients, aliases, derivatives, brands, and cross-contact uncertainty conservatively. Explain known conflict, missing evidence, and the limited meaning of no identified conflict.

Recheck affected plans after profile/product/recipe/rule changes. If no candidate satisfies the applicable restrictions, explain why and offer reviewed alternatives or a clarification path without relaxing restrictions. Flexible days and gym context never disable restrictions.

Implement all software, source-backed rules, review tooling, and uncertainty states possible within the assignment. Real clinical, food-safety, privacy, and intended-purpose review cannot be fabricated by an AI agent: identify the specific external review needed and prevent unreviewed medical-suitability claims from appearing as validated. A disclaimer does not replace correct behavior. Continue independent implementation while such dependencies are outstanding, and distinguish software completion from health release readiness.

Completion criterion: the software applies documented checks and supported constraints consistently, handles unknowns and combined needs explicitly, protects profiles, and exposes truthful capability/review status. Clinical/regulatory release gates remain open until actual required review is obtained.

## 7. Security, persistence, performance, and release preparation

Extend the current authenticated server architecture and native sync model. Enforce ownership, household role, friendship, recipe, media, and profile permissions server-side. Use validation, request limits, safe file processing, operation idempotency, pagination, concurrency/version checks, scoped caches, and backwards-compatible migration/backfill procedures.

Health information must remain private from friends feeds, notification previews, generic analytics, support logs, and unauthorized household members. Implement applicable consent/withdrawal, export, deletion, retention, and access controls; update actual privacy/terms/help text to match implemented behavior. Minimize external AI disclosures and keep provider credentials server-side.

Keep the app usable during provider failures: saved recipes, plans, pantry, and manual logging remain accessible. Show sync conflicts and stale checks honestly. Use lazy/paginated rendering, bounded model calls, appropriate caching, and stable loading states. Preserve existing native camera, authentication, widget, voice, subscription, account, and web flows affected by the changes.

Complete configuration and staging setup with existing authorized services. Prepare an installable Android build and a runnable production-mode web build. Keep credentials and signing material out of reports. This development assignment does not itself authorize paid purchases, a production-data migration, a deployment-triggering push, or a store submission; prepare the concrete result before any release authorization is needed.

Completion criterion: durable, permission-tested, migration-tested builds exist, and actual deployment/operator dependencies are documented without claiming unavailable integrations are working.

## 8. Verify the complete experience and deliver evidence

Run project-appropriate tests, lint, type checks, builds, database migration checks, and Android checks using the current repository's commands and tooling. Write meaningful unit, database integration, authorization, concurrency/idempotency, and end-to-end tests for these consequential features. Use real development persistence and real configured integrations in at least one verified path; clearly labelled fixtures supplement this rather than substitute for it.

Verify every scenario in `MEAL_PLANNING_SCOPE.md`, including automatic two-serving deductions, four eggs allocated across two three-egg meals, ambiguous allergens/units, multiple household restrictions, child profiles, plan changes, manual groceries, partial purchases, batch leftovers, undo after other stock changes, recipe/profile changes, blocked/removed friends, and offline replay. Include access-control/media revocation, external-meal logging, incomplete diaries, timezones, and provider outage recovery.

Run and inspect the website and Android app. Verify the actual camera/gallery, cooked action, agenda, pantry, shopping, social feed, profile setup, and permissions at phone widths, desktop widths, EN/FR, both themes, large text, and accessibility settings. Capture representative screenshots and correct the issues they reveal. Browser tests do not establish native behavior; emulator tests do not establish physical-device or store-installed verification.

Deliver:

- Completed implementation and safe migrations.
- A runnable web build and installable Android artifact with exact locations.
- One updated checklist and concise implementation/verification report linking requirements to evidence.
- API/data/migration/configuration documentation and accurate user-facing help/privacy updates.
- Representative rendered screenshots and test/build results.
- An explicit account of remaining external setup, physical-device verification, and qualified health/privacy/regulatory review, with actionable steps.

Continue until all achievable software requirements are implemented and verified. Report blocked requirements individually and continue independent work; do not quietly label omitted requirements as future enhancements. Claim completion only to the extent supported by the evidence. Finish by describing what works, how it was verified, and any actual unresolved release gates.
