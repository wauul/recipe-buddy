# Connected meals implementation checklist

4 October 2026. Status describes local implementation/evidence, not release approval. Exact configuration, data/API/migration details and limits: MEAL_FEATURES_IMPLEMENTATION.md. Primary nutrition sources/review: DAILY_NUTRITION_REVIEW.md. Evidence directory: test-results/meals.

| Requirement | Data/API and UI | Evidence / remaining verification |
|---|---|---|
| Distinct repeated cooking, eating and legacy days | Implemented on web/Compose | Real database repeated occasions; legacy backdating/edit/undo |
| Scaled snapshots, substitutions, unknown/insufficient stock | Implemented | Two-serving deductions, fractions/units, ambiguous labels, unknown quantities; numeric estimates do not deduct as exact stock |
| Atomic idempotent consumption, edits and undo | Implemented | Row-lock concurrency, digest/replay tests; unrelated stock preserved |
| Private durable sanitized media; explicit friends publication | Implemented | Real sharp image decode/re-encode; authorization, friendship/block revocation and reactions; actual emulator permission-denial recovery and system photo picker/upload pass; physical media still unverified |
| Personal comment/rating distinct from aprons | Implemented | Stored separately; existing activity/score regressions retained |
| Rich batches/presence/date/label/use/discard/correction | Implemented | Known/unknown stock and precise versus estimated tests; rendered pantry |
| Household roles/private adult and caregiver profiles | Implemented | Real permission matrix, caregiver/child goal guard, membership revocation |
| Day/week plans/diners/lock/move/repeat/swap/external meals | Implemented | Calendar dates, move/repeat/swap allocation tests; DST/calendar reminder delivery not certified |
| Suggestions and editable weekly previews | Implemented | Authorized actual saved matches, stable-version/restriction revalidation; manual acceptance; full preview UI interaction matrix still partial |
| Virtual allocation and connected groceries | Implemented | Four eggs/two three-egg meals => two-egg deficit; horizon/portions; no physical deduction from planning |
| Independent manual groceries and actual partial purchase | Implemented | Purchase-to-pantry replay; independent checked/manual items preserved |
| Batch leftovers and actual eating | Implemented | Source-linked leftover eating and no second raw deduction; snack/drink privacy |
| Optional kitchen check-in | Implemented, partial interruption coverage | Incremental native Room food draft/web scoped draft; plan/person dedup; exact/estimated stock; some sub-form interruption/reminder cases remain unverified |
| Preparation agenda | Implemented web/Compose | Dependencies/cycles, moves, partial actual multi-ingredient use, final cook credit, undo; native persistence UI check passes; optional calendar handoff rather than background service |
| Pro rescue with leftovers/edit/select/undo | Implemented; positive paid API verification blocked | Pure real-state proposals, edited-preview recalculation, selected acceptance, safe partial undo, protected events; actual verified Pro entitlement still needed |
| Incoming/order/manual receipt reconciliation | Implemented | Isolated manual-order fixture: no stock before arrival, partial receipt, duplicate/replay, refund != removal, current substitute restriction check; not a live provider order |
| Pro France/US retailer checkout | Capability manifest/configurable handoff; external access blocked | US development shopping-list handoff only; France partner absent; catalogue/cart/price/slot/status/cancellation/substitution/sandbox not granted |
| Saved/current shared pantry matcher | Implemented | Real authorized saved matches and missing needs; no fake results |
| Pro internet discovery/private attributed import | Implemented; live licensed path blocked | Safe bounded fetch/extraction/rights gates/HMAC private import; malformed/incomplete source tests/manual-review path; approved sources/Brave/verified Pro absent |
| Country/age/condition/combination manifest | Implemented conservative unreviewed states | Health scenario cases and review packet; no module is clinically validated |
| Nutrition provenance/completeness/allergen compounds | Implemented for supported six nutrients and conservative restrictions | Source scaling, no density invention, cross-contact uncertainty; actual public Open Food Facts fetch; catalogue feature activation awaits licence review |
| Daily assessment and prescribed targets | Implemented web/Compose | Explicit actual portion/source, per-nutrient coverage, day invalidation, ranges/expiry/ownership/clinical guards; complete vitamin/mineral adequacy and automatic prescriptions not delivered |
| Stale recipe/profile/product/rule checks | Implemented | Version checks, current restriction computation; locked choices retained for review |
| Consent/withdrawal/export/deletion/private records | Implemented; operator/legal review required | Real profile/member deletion and replay access checks; private coverage/targets included; backup retention/operator practice unverified; owner deletion cascades owned kitchen |
| Native offline outbox/replay/conflicts | Implemented | Real native sync replay and revoked access; form/preview process-restart coverage incomplete |
| EN/FR, light/dark, phone/desktop | Implemented; verification matrix partial | Representative actual render evidence; Android 130% font-scale workflow passes; TalkBack, physical camera and calendar delivery remain unverified |
| Additive upgrade and production web/native builds | Local builds pass | Upgrade/replay preserves old recipe/CookedLog; production web build, Compose APK/13 unit tests/lint; production release not performed |
| Full medical adequacy/automated therapeutic prescribing | Not delivered; qualified method/review/data dependency | Complete composition and reviewed country/age/clinical methods required. User-confirmed prescribed bounds are supported; no diagnosis/dosing claim |
| Privacy and intended-purpose validation | External review outstanding | Named France/US reviews, actual DPIA/retention/access/regulatory evaluation required |
| Physical/store verification and release | Separate evidence/authorization required | A phone became connected during verification; incidental untargeted test aborted. Do not infer a physical/store pass from that run |

Web unit suite: 108 passed. Production-mode database integration: 14 groups passed, providerCalls=0. See current build/instrumentation/screenshot files and final delivery report for exact native/browser results. Native HTTP disconnect replay, full meal/nutrition UI, and camera-denial/gallery persistence instrumentation pass. These counts are evidence, not clinical approval or retailer availability.

Production migration, deployment-triggering push, store submission, paid activation and actual purchases are not authorized by this assignment and have not occurred.
