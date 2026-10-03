# Recipe Buddy: connected meal planning, health support, and pantry

Status: product scope draft for review, not an implemented or clinically validated capability.
Updated: 2026-10-03.

## Confirmed direction

Support quick cooking suggestions and meticulous weekly planning through the same system. Connect planned meals, pantry inventory, shopping, cooking occasions, food actually eaten, and optional friends posts. Health support and pantry accuracy are core release requirements.

The intended audience includes individuals and households with adults and children. The intended markets are Europe and the United States. Europe must become an explicit supported-country list: an EU rule, a national dietary guideline, and guidance applicable in the UK are not interchangeable. Language, selected guidance country, product market, units, and calendar timezone are separate settings.

Comprehensive means every supported situation has specified behavior, reviewed rules, sufficient data, uncertainty handling, and verification. Zero-error performance and universal medical suitability cannot be promised. Supported-country, age, and health-condition coverage must be published and maintained.

## Core records and meanings

- Recipe: instructions and ingredients for a stated yield, with a version and ingredient/nutrition provenance.
- Planned meal: date, meal slot, intended diners, portions, selected recipe version or external meal, and locked/unlocked state. A plan is not evidence of consumption.
- Cooking occasion: what was prepared, when, confirmed servings prepared, actual ingredients/substitutions, recipe/quantity snapshot, yield, optional photo, personal rating, and comment. Cooking does not imply eating. Confirming a cooking occasion automatically records the applicable pantry consumption once.
- Eaten meal: date, meal slot, person, recipe/cooking occasion/leftover link or external-food description, optional amount, and whether detail is approximate.
- Leftover batch: yield remaining, source cooking occasion, storage state and user-entered relevant dates. Deduct raw ingredients when cooked, not each time leftovers are eaten.
- Pantry item: canonical ingredient plus optional brand/product, amount, unit, package size, storage location, opened/frozen dates, package date type/value, label allergens, and cross-contact information.
- Shopping need: combined ingredient deficit over a chosen planning window, contributing meals, first needed date, coverage confidence, and manual overrides.
- Friends post: an explicit publication of selected cooking-photo/caption/rating fields. It is separate from a private cooking record, meal history, and recipe permissions.

Keep historical meal and cooking snapshots meaningful when recipes are edited, deleted, or no longer shared. Define retention separately from ongoing access to someone else's recipe. Personal occasion ratings do not replace apron recipe reviews or affect chef levels.

## Health profiles and household membership

Each diner has an independent profile. A household may share pantry and meal plans; sharing a household must not automatically expose every adult's health details. Show the planner that a meal conflicts with a member's restrictions without unnecessarily disclosing the diagnosis. Specify owner, planner, shopper, adult-member, and caregiver permissions.

Collect only information used by a supported feature:

- Age/age band as required for age-specific handling; child profiles managed by authorized caregivers.
- Allergies with individual foods, derived ingredients, and relevant user/clinician instructions; custom allergens beyond legally declared lists.
- Intolerances and coeliac disease as distinct categories with their own reviewed handling; do not reduce all three to dislike tags.
- Pregnancy and breastfeeding as separate, changeable circumstances where supported; relevant stage information only where a reviewed rule uses it.
- Separate type 1, type 2, and gestational diabetes capabilities. Capture applicable clinician-set meal constraints rather than inventing treatment targets from a condition label.
- Other declared conditions and clinician instructions must be recorded as supported, partly supported, or unsupported. Recording a condition does not establish recommendation capability.
- Eating preferences, religious/ethical exclusions, disliked ingredients, cuisines, goals, typical schedule, cooking equipment, skill, budget, and household portions.

Daily context is separate: time available, activity/workout context, work/rest day, eating out, appetite, preferred meal size, and flexibility. Temporary circumstances expire. Users can inspect and correct all inferred preferences; never infer a medical diagnosis.

Ask light preference questions during skippable onboarding. Explain health-data use and collect applicable permission when enabling health personalization. Declined questions stay unknown. A user can browse and manually plan without receiving unsupported health-suitability claims.

## Health recommendation requirements

Maintain an explicit capability matrix by country, age range, condition, and combination. Each capability identifies authoritative sources, rule owner, qualified reviewer, required input, version, review date, next review trigger, and unsupported cases. An overdue or withdrawn capability cannot retain a verified status silently.

### Allergies, intolerances, and coeliac disease

Resolve ingredient aliases, translations, derivatives, compound ingredients, sauces, spice mixes, and relevant brands. Preserve the original label/source. Missing ingredient detail and unknown cross-contact are unknown, never absence of risk. Distinguish a known conflict, unresolved information, and no identified conflict within the information checked; the last status is not an allergy-free guarantee.

Check substitutions, imported recipes, shared recipes, pantry products, and purchased alternatives. Preserve product-specific warnings. A legal allergen declaration list is not an exhaustive list of possible allergies. Household cooking checks every selected diner and preparation requirements relevant to the supported capability.

### Pregnancy, breastfeeding, and diabetes

Use reviewed country-specific rules for applicable ingredient, preparation, product, and frequency checks. Pregnancy-aware handling needs actual preparation information where the rule depends on it; an ingredient category alone cannot settle suitability.

For diabetes, distinguish general food planning from support for a clinician-prescribed meal plan. Do not provide medication changes, insulin dosing, emergency management, or an invented universal carbohydrate goal. Define which nutritional calculations and temporal meal constraints the reviewed module can handle and what input quality they require.

### Children and other life stages

Use age-specific reviewed planning modules. Adult goals and portion assumptions must not be automatically applied to children. Specify handling of age-dependent preparation/choking considerations and caregiver permissions. Infant feeding, complementary feeding, formula/breastmilk tracking, and therapeutic paediatric diets require their own defined and validated modules before support is advertised; ordinary household meal planning does not silently cover them.

Do not generate child weight-loss plans or unsupervised therapeutic targets. Identify situations requiring professional input, including declared restrictive-diet or eating-disorder concerns, without diagnosing from logs or body measurements.

### Combined needs and conflicts

Evaluate combinations, not only independent tags: pregnancy plus gestational diabetes, coeliac disease plus another allergy, different household restrictions, and a clinician instruction conflicting with a personal preference. A reviewed rule has defined precedence. An unresolved clinical conflict or empty candidate set is explained; the app does not relax health constraints to manufacture a result.

### Food and nutrition evidence

Use appropriate authoritative composition data and product-label data, with provenance and licensing checked. Store the match, quantity basis, raw/cooked state, units, yield, preparation assumptions, completeness, and confidence. Missing values are not zero. Do not equate sodium with salt, wheat allergy with coeliac disease, or gram weight with volume without an appropriate conversion.

Show estimated values as estimates. Do not display precise daily adequacy, deficiency diagnoses, or medically suitable meal claims from broad food chips, photographs, incomplete recipe amounts, or incomplete eating history. Food photos can support user-confirmed identification; they do not establish ingredients, portions, or safety by themselves.

### Recommendation operation

1. Determine the diners, requested horizon, current profile versions, country guidance, and supported capabilities.
2. Establish eligibility and unresolved information using reviewed restrictions and recipe/product metadata.
3. Consider practical feasibility, available stock, budget information, time, equipment, and leftovers.
4. Rank eligible candidates for variety, recent actual eating, planned week, preferences, and applicable goals.
5. Explain concrete reasons and important uncertainties; ask focused questions where they can resolve an unknown.
6. Validate the final recipe, substitutions, diners, and serving assumptions again after any generation or edit.

Use stable, reviewable checks for restrictions. An AI model may interpret text or explain/rank choices, but cannot override those checks. Free text extraction is confirmed before it becomes a restriction, inventory fact, or eaten-meal fact. Meal history records incomplete coverage explicitly; unlogged meals are not fasting. Flexible days, reactions, budgets, and preference learning never disable supported health restrictions.

Recheck affected recommendations when a profile, recipe, diner list, product label, substitution, or relevant rule changes. Present previously generated plans as needing review when applicable. Do not silently rewrite locked meals.

## Pantry requirements

Support simple presence tracking and detailed amount tracking in one inventory. Do not require weighing every ingredient. Explain the difference between known available quantity, estimated quantity, and presence-only stock.

- Normalize ingredient aliases while keeping meaningful distinctions such as raw/cooked, salted/unsalted, gluten-containing/gluten-free, and different product formulations.
- Sum compatible quantities and use explicit conversions only. Unknown densities and ambiguous units such as an unspecified cup/spoon or one unspecified packet require checking.
- Track multiple packages/batches and storage locations where useful, including partly used packages.
- Record package dates with their type; distinguish food-quality dates from safety-relevant dates using reviewed local guidance. Do not certify food safe based only on a date or photo.
- Allow quick add, edit, use, discard, move, and stock confirmation. Offer stale-stock reminders with user control.
- Recommend stock rotation and relevant leftovers using known information, without assuming unknown storage history is acceptable.
- Include manual entry and reuse of purchased-list items. Barcode/receipt/photo assistance can be scoped as richer input methods; require confirmation, preserve label evidence, handle missing products and recognition errors.

Planning allocates available stock virtually within the selected horizon; it does not physically deduct inventory. Avoid allocating the same eggs twice. Show allocations to users and recompute them after plan changes. A shopper's manual reservation or purchase adjustment has defined precedence.

### Automatic consumption when marking cooked

Automatic pantry deduction is the default behavior of marking a meal cooked, not a separate optional inventory task. The cooked action includes a servings-prepared control, initialized from the current recipe scale or planned meal. Confirm the number prepared even if some servings are for other people or leftovers; servings eaten are recorded separately.

For each quantified ingredient, calculate `amount used = recipe amount × servings prepared / recipe reference servings`. Use the recipe/ingredient snapshot associated with that cooking occasion, including any recorded actual amounts or substitutions. For example, a four-serving recipe containing 300 g rice and 600 g chicken deducts 150 g rice and 300 g chicken when two servings are prepared. This is inventory accounting from the selected recipe yield, not an age-specific nutrition or portion prescription.

The ordinary path is: choose servings, mark cooked, show a concise pantry-update result with Undo, then offer the optional photo/rating/comment/also-ate follow-up. Do not require a separate confirmation for each ingredient or a second stock-deduction approval. Provide an accessible way to change actual amounts, omit unused optional ingredients, or record substitutions before the cooked action or by editing the resulting occasion.

Apply exact known deductions automatically where ingredient-to-product/batch matching and units are unambiguous. If several equivalent eligible batches exist, use a documented stock-rotation rule, preserve the chosen batches, and allow correction. Do not select a materially different product formulation, preparation state, or unresolved health-relevant alternative simply to make the inventory calculation work.

Amounts such as 'to taste', presence-only inventory, ambiguous units, unknown package sizes, or unresolved product matches cannot receive a fabricated precise deduction. Record the expected consumption and show which ingredients need quantity/match confirmation. Where exact tracked stock is insufficient, consume the known available quantity, show the remaining usage as an inventory discrepancy, and ask for a stock correction; do not invent an unlogged purchase or create negative stock. The cooking record may still save with an explicit pantry-reconciliation status.

Create the cooking record and its inventory effects as one consistent operation. Store changes as reversible operations linked to the occasion so retries, repeated taps, and offline replays do not apply them twice. Editing servings or ingredients reconciles the previous effects against the new amounts; undo restores the recorded deductions rather than resetting inventory to an old total and overwriting unrelated changes. Removing a photo, eating-log entry, or friends post does not restore ingredients. Offer an explicit undo-cooking/correct-consumption action distinct from those deletions.

After consumption, release the completed meal's planning allocation, recalculate remaining meal readiness and shopping deficits, and show meaningful changes. A later leftover meal updates the cooked-food batch and eating history without deducting the raw recipe ingredients again. Reheating that uses additional ingredients may record those additions separately.

## Shopping requirements

Combine deficits across selected planned meals after portion scaling, pantry allocation, and leftovers. Clearly separate required recipe amount from suggested purchasable package quantity. Cost estimates need a named source/date/currency and must not pretend to be current retail quotes without current data.

- Each generated need links to its meals and first needed date.
- Manual items remain independent of plan-generated items.
- Changing portions, diners, recipes, days, or horizon recalculates the generated needs and shows meaningful changes.
- Removing a meal removes only its remaining contribution, not a manual item or completed purchase.
- A purchased item records the actual product and amount; offer pantry addition once. Checking off an item is not proof of purchasing a particular brand/quantity.
- Alternatives recheck all applicable restrictions. A cheaper substitution must not silently invalidate suitability.
- Show ready, missing, and check-quantity statuses with drill-down; these reflect ingredient readiness, not medical suitability.
- Define behaviour for partially purchased items, purchased excess, substitutions, returns, shared household editing, and offline updates.

## Agenda and cooking follow-up

Quick suggestions and weekly planning use the same eligibility and ranking. Users select the slots to fill, desired planning/shopping window, diners, recurring availability, and locked meals. Handle workday meals, eating out, repeated favourites, batch cooking, and leftover meals. Suggested plans are editable before acceptance.

Marking cooked requires the servings prepared and saves the cooking occasion together with automatic pantry consumption independently of completing the optional follow-up. The servings value is prefilled from the currently scaled recipe or planned meal. The follow-up can attach a photo, personal rating, private comment, actual ingredient changes/yield, and an explicit 'also ate this' record with editable date/meal. Subsequent amount edits reconcile the original pantry effects. Eating leftovers links back to the source batch. Distinguish an external meal description from a newly saved recipe.

Use local calendar dates with explicit timezone behaviour for travel, backdated entries, and daylight-saving boundaries. Support multiple cooking/eating occasions on one day. Repeated taps and replayed offline operations must not duplicate cooking, consumption, stock deductions, or purchases.

## Privacy and trustworthy operation

Separate health records, household collaboration, and friends publications. Define permissions for each record and revoke access when household/friend membership changes. Child profiles are caregiver-managed unless a separately reviewed child-account capability is introduced. The appropriate European and US privacy obligations require assessment for the actual service; geography or an age checkbox does not establish compliance.

Explain collection and AI processing at the point of use. Minimize information sent to external services; where possible, use locally applied derived constraints rather than raw diagnoses. Provide applicable consent/withdrawal, export, deletion, retention rules, access auditing, encryption, and redacted logging. Clinical details must not appear in social content, notifications, analytics, or support logs by default.

Handle model/API outages with saved plans, pantry access, and explicit recommendation availability. Cache results against recipe/profile/rule versions. Offline work shows sync and verification status; stale health checks cannot quietly retain a current verified label. Define conflict resolution for simultaneous household stock changes and recipe edits.

## Release gates and scenario verification

These are requirements, not evidence they have already passed:

1. Publish supported countries, age bands, conditions, combinations, and explicit exclusions; obtain appropriate qualified review for every health capability.
2. Maintain a versioned reference scenario set covering valid, conflicting, ambiguous, incomplete, adversarial, and outdated inputs for each capability. Revalidate after rule/model/data changes.
3. A known prohibited ingredient cannot enter a recommendation through a synonym, translation, shared recipe, substitution, photo extraction, or cheaper product.
4. An ambiguous sauce does not receive a resolved allergen result; a missing nutrition value is not zero; an incomplete diary does not produce a complete-intake claim.
5. Multiple household restrictions are respected; unsupported combinations produce an explicit limitation and preserve manual planning.
6. Four pantry eggs against two three-egg meals produce a deficit of two eggs. Increasing portions and changing the shopping window updates it consistently.
7. Two shoppers, a partial purchase, an offline replay, and repeated taps do not duplicate stock or generated needs.
8. A four-serving recipe with 300 g rice and 600 g chicken deducts 150 g rice and 300 g chicken when two servings are marked cooked. Preparing a four-portion batch and later eating leftovers deducts its raw ingredients once. Editing servings, substitutions, or actual amounts and undoing cooking reconcile inventory correctly without overwriting unrelated purchases/usage. Presence-only stock, ambiguous matches/units, and insufficient quantities remain explicitly unresolved rather than receiving invented deductions. Skipping the optional photo/comment follow-up does not skip stock consumption.
9. Swapping/removing a planned meal preserves manually added shopping items and completed purchases.
10. Recipe/profile/product/rule changes invalidate affected checks while preserving locked plan choices for review.
11. Child profiles cannot inherit an adult weight-loss goal, and caregiver/adult-health permissions prevent inappropriate access.
12. Friend/household removal and health-data deletion revoke access and remove retained data according to the defined policy.
13. Mobile and desktop flows remain usable with accessible controls, low-detail logging, household changes, outages, and recovery.

Add monitored recommendation failures, correction rates, pantry discrepancies, logging effort, and recommendation acceptance to operational quality measures. Establish incident handling and the ability to disable a faulty health capability without disabling the private recipe box.

## Decisions still requiring a concrete specification

- Exact European countries and order of validation, alongside the US; travel/product-market rules.
- Country-by-age-by-condition capability matrix, especially young children, infant feeding, combined conditions, and clinician-prescribed plans.
- Qualified reviewer roles, budget, source licensing, review schedule, and regulatory intended purpose. Disease-related intended use needs actual assessment before claims or release.
- Whether precise nutrition/therapeutic target support is included and which data quality threshold makes it usable.
- Household roles, who can manage each person's profile, and whether child accounts are ever permitted.
- Pantry input methods at launch, package-date handling, quantity conversion coverage, and offline conflict policy.
- Nutrition/label/product data providers and fallbacks, plus the actual supported ingredient catalogue.

Related research: [Health planning research](HEALTH_PLANNING_RESEARCH.md). Treat these recommendations as a scope draft, not medical instructions or a compliance certification.
