# Development assignment: cooking results and connected meal planning

Implement both features fully in the existing Recipe Buddy product:

1. Cooking occasions with photos, personal ratings/comments, explicit eating records, and optional friends activity posts.
2. An intelligent agenda supporting quick meal ideas and weekly planning, connected to rich household health profiles, pantry inventory, leftovers, and shopping.

Deliver functioning, durable, integrated software with beautiful design and easy everyday use. Implement and verify the actual workflows. The complete product requirements are in `MEAL_PLANNING_SCOPE.md`, including automatic ingredient deduction added after the initial brainstorm. Treat `HEALTH_PLANNING_RESEARCH.md` as evidence and research starting points, not clinical certification. Read both documents completely before implementation. These requirements apply together; a polished screen cannot substitute for working persistence, permissions, integrations, or verification.

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

Completion criterion: a real plan generates correct groceries, purchases can update pantry, cooking consumes stock, eating informs subsequent suggestions, and edits reconcile the whole chain without duplicate or lost data.

## 6. Implement substantial health support with traceable evidence

Read and operationalize the entire health section of `MEAL_PLANNING_SCOPE.md`; consult the research note and verify current primary sources. The target markets are Europe and the US, for individuals and households including children. Implement a country/age/condition coverage manifest with required evidence, combinations, rule versions, sources, reviewer status, and explicit unresolved/unsupported situations. Preserve the broad intended market; clearly identify which country-specific modules are actually validated instead of silently substituting one national rule set for all Europe.

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
