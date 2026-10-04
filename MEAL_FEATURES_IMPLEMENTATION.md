# Recipe Buddy connected meals — implementation and review guide

Local review delivery, 4 October 2026. This is not production deployment, clinical validation or retailer approval. Read alongside `MEAL_FEATURES_CHECKLIST.md` and `DAILY_NUTRITION_REVIEW.md`.

## Architecture and data

The website remains Next.js/React/Prisma/PostgreSQL. Android remains Kotlin/Jetpack Compose with its Room cache, account-scoped drafts, Keystore sessions and idempotent outbox. These features are native Compose screens. Sync transport retries only the operation-ID/receipt-protected sync endpoint after a lost connection; ordinary purchase/provider mutations retain their existing transport controls. Cream/forest/sage colours and existing controls/type remain the visual foundation.

Three additive migrations create connected kitchens/profiles/operation receipts/posts/reactions, recipe provenance, and private binary occasion media. Legacy CookedLog remains intact. No inferred stock consumption, food intake or preparation is backfilled. New JSON fields are optional for old kitchen state. Production migration has not been run.

MealKitchen JSON stores batches, plans, actual occasions, explicit eating, leftovers, purchases, independent manual items, reversible stock history, context, preparation, rescues, baskets and day attestations. Private targets live in manager-owned MealProfile JSON. Responses filter private eating/occasion/context/rescue/coverage records. Household diner names/versions remain available without medical fields. Profile withdrawal and member revocation remove private eating/coverage. Account deletion cascades an owner's kitchen: members should export before its owner deletes the account. Removal from another owner's kitchen retains shared stock totals without personal attribution.

Mutations lock the kitchen row, check current membership/role and optional baseVersion, validate inputs, then persist state and an operation receipt in one transaction. UUID/payload digests prevent duplicate or reused mutations. Undo restores recorded effects without resetting unrelated changes. Storage protection is bounded: 2,000 batches/plans/occasions, 4,000 eating records, 8 MB kitchen JSON. Larger history requires operator-assisted export/retention work; an archive UI is not implemented.

## API and behaviour

Browser base: `/api/meals`. Native base: `/api/native/v1/meals`, using the same handlers. Native permitted offline writes also use `/api/native/v1/sync`. GET accepts kitchenId/from/to. POST accepts operationId, kitchenId, baseVersion, action and data. Clients surface conflicts rather than silently replacing another household edit.

Actions cover pantry/stock/undo; plan/edit/move/repeat/swap; cook/edit/undo; private follow-up; explicit eating/removal; leftovers; purchases; manual items; profiles/withdrawal; roles; context; preparation/complete/dismiss/undo; rescue acceptance/undo; basket/order/receipt reconciliation. Nutrition actions are `nutrition-target`, `eaten-nutrition`, `daily-coverage`. All require the profile manager's current membership. Exact schemas live in meal-service/meal-engine and associated modules.

Other meal routes provide suggestions, pantry-matches, products, discovery/import, rescue (including edited-preview recomputation), handoff, activity/media/reactions and private occasion media. Private JPEG/PNG/WebP uploads are oriented, bounded, re-encoded and stripped of metadata. Publication independently selects caption/photo/rating. Current friendship/block checks guard reads. Posts do not grant recipe access. Deleting photos, comments, eating or posts does not undo stock consumption.

## Daily nutrition and targets

Daily assessment compares recorded energy/carbohydrate/protein/fat/sodium/salt with configured bounds. It supports known-mass as-sold composition snapshots and user-entered composition for an explicitly described actual portion. Source/portion remain attached. Unknown density, portions, ingredients or nutrients remain unknown. Confirmation is explicit and recorded-intake changes invalidate it. Coverage is per nutrient: complete energy does not establish sodium coverage.

Targets retain source, issue/review dates, units and personal/clinician-prescribed origin. Children and clinical profiles, including declared allergies, intolerances, coeliac disease and clinician instructions, require explicitly confirmed prescribed targets. Native numeric entry accepts French/English decimal separators and blocks malformed or inverted bounds rather than omitting them. The native daily date selector loads past-day composition through the same scoped API. Recipe Buddy does not independently verify a prescription, diagnose deficiency, generate therapeutic prescriptions or medication/insulin doses, or claim full vitamin/mineral adequacy. Country/age/condition capabilities remain unreviewed. See the nutrition review document for primary sources and release gates.

## Running the local review build

The ignored `.env.meal-test` uses only PostgreSQL container `recipe-buddy-meal-test`, loopback port 55433, database `recipe_buddy_meal_test`. Groq is disabled; VERCEL_ENV=preview prevents production repair scripts. Do not print/distribute its generated secrets. `scripts/setup-meal-test.ps1` refuses to overwrite an existing configuration. Migration/integration scripts assert the isolated database before changing labelled fixtures.

Build:
```powershell
node --env-file=.env.meal-test -e "const r=require('node:child_process').spawnSync('pnpm.cmd',['build'],{shell:true,stdio:'inherit',env:process.env});process.exit(r.status??1)"
```

Run:
```powershell
node --env-file=.env.meal-test node_modules/next/dist/bin/next start -p 3003 --hostname 0.0.0.0
```

Review accounts are meal-a/b/c@example.test with password `MealTestOnly-2026`. They contain only labelled fixtures. Integration recreates their meal fixtures, not a general database reset.

Android review: `-PmealReview=true -PbackendUrl=http://127.0.0.1:3003`; application id `com.recipebuddy.android.meals`; debug signing. Use ADB reverse tcp:3003 tcp:3003 on the selected device. The review artifact requires the local backend. Production endpoint/signing/store submission are separate release work. Avoid untargeted connectedAndroidTest with multiple devices; use explicit adb `-s` for test selection.

## Configuration and unresolved dependencies

- **Pro:** existing server-verified Google Play membership. Configure PLAY_BILLING_ENABLED, service account authorization and the stable token-encryption key. No fake Pro grants, paid activation or live purchase occurred. Positive paid API paths require an actual verified test entitlement; free-account 402 paths pass.
- **Discovery:** BRAVE_SEARCH_API_KEY and MEAL_DISCOVERY_SOURCES with actual private-import licence, rightsUrl, named reviewedBy, expiry and allowPrivateImport=true. Search discloses selected ingredient names/country only. Account/deployment quotas, bounded source fetches/timeouts and signed account-scoped 15-minute import tokens protect calls. Incomplete sources have a manual-review path. Live discovery/import remains unverified without credentials and permitted sources.
- **Products:** MEAL_PRODUCT_LOOKUP_ENABLED defaults false pending Open Food Facts attribution/ODbL downstream review. The public barcode fetch was exercised against the actual provider. It establishes neither label accuracy nor cross-contact safety.
- **US commerce:** INSTACART_DEVELOPER_API_KEY, approved development access and sandbox verification. Only development shopping-list handoff is implemented. Exact catalogue/cart/pricing/slot/status/cancellation/substitution enforcement is not granted. No retailer/store/service location is verified. Durable pending status prevents automatic duplicate retries after an uncertain handoff.
- **France commerce:** actual retailer partnership and permitted catalogue/checkout/status access are required. There is no simulated France checkout. Manual lists, actual order-reference reconciliation and partial receipt work locally. Redirects are not purchase evidence. Incoming/uncertain lists warn about overlapping needs. Received products alone create usable stock; refunds alone remove none.
- **Health:** obtain named France/US dietitian/clinical and food-safety review for each country/age/condition/combination and calculation method. Evaluate the health-review packet; null reviewer fields are intentionally unapproved. Full micronutrient adequacy, automatic individualized reference-target generation and therapeutic prescribing are not delivered medical capabilities.
- **Privacy/regulatory:** confirm backup/log retention, privileged operator access, DPIA/consent/children's-data practices and intended-purpose classification before health launch. Software claims no certification.
- **Release/devices:** physical camera/gallery, TalkBack, notification/calendar delivery and Play-installed checks need separate recorded evidence. Production migration/deployment/store upload/real purchases have not occurred.

European commerce expansion is conditional: after France/US partner verification, Belgium is a provisional first candidate for French-language reuse, followed by Germany and Spain as distinct localization/partner efforts. Re-rank after permitted catalogue evidence, checkout/status capabilities, country-specific health/privacy review, sandbox access, fees and service coverage are known. No European retailer approval is recorded.

## Evidence and remaining software limits

`test-results/meals` contains production web build/lint logs, unit results, real isolated database integration JSON/log, migration upgrade report, actual public product-provider report, health-review packet, Android build/lint/unit output and instrumentation evidence. Screenshots/artifact checksums are linked in the delivery report. Unit fixtures supplement real database/native/browser work. The manual-order fixture is not a retailer sandbox order.

Material limits: calendar handoffs provide reminders rather than an app background delivery service; general form drafts/weekly previews are not all process-restart durable; known ranking/rescue reasons have EN/FR labels; complete dynamic error localization and TalkBack remain unverified. The full Android workflow passes at 130% font scale, and camera-denial recovery plus the actual system gallery picker/upload pass on the emulator. Physical camera/gallery remain unverified. Suggestions require editable confirmation and revalidate authorized recipe versions/restrictions. Rescue preserves locked/cooked/prepared plans and returns fewer alternatives when evidence is insufficient. Rescue/receipt checks do not imply medical clearance.
