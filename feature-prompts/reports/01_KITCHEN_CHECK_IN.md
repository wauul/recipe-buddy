# Kitchen check-in delivery

Started 7 October 2026. Baseline `e0414e7218803248fbdf99ebd175f717eaf1d20f`.
Existing untracked `.tmp/` and `feature-prompts/` preserved. This report is the single delivery checklist; unchecked items are not claims of completion.

## Audit and acceptance map

| Component | Existing behavior | Required implementation and evidence |
|---|---|---|
| Entry/status | Agenda/Android Pantry stock shortcut; no candidate API | Optional five-question visit, recent meal/uncertain stock/leftover priority, current state; web/native screenshots |
| Meal | Shared `eat`, private manager permission, plan deduplication | Contextual confirm/external replacement/snacks/drinks, atomic correction, source guard; persisted API tests |
| Pantry | Stock delta and full batch operations | Prior amount/precision/unit, bounded numeric input, stale source guard including purchase/cooking history; concurrency tests |
| Leftover | Existing batch and `eat` decrement, no raw deduction | Confirm/correct/discard versus eating; API/history tests and screenshots |
| Practical context | Per-actor/date context | Prefill, explicit date/timezone expiry, diners/eating out; API tests |
| Finish/resume | Web session drafts, native local account drafts/outbox | Durable account/kitchen drafts, pending/saved/retry and correction, no implicit daily coverage; restart/offline tests |
| Privacy | Manager-only diary/profile, role-checked kitchen operations | Recheck access inside transaction; no private adult candidates; revocation/logout/deletion tests |
| Reminders | Calendar handoff and native cooking timer | Opt-in supported mechanism with timing/quiet time/off and no resolved repeats; background/restart evidence |

## Checklist

- [x] Read assignment, delivery contract, design/context, scope, health research and mobile release/API documents; audit current source.
- [x] Implement guarded candidate/answer API using shared operations, additive mixed-client state.
- [x] Implement localized web and Compose experiences with durable drafts.
- [x] Implement and verify opt-in reminders and cleanup.
- [x] Unit/API/database/concurrency/security/regression checks and benchmarks.
- [ ] Rendered web/native acceptance screenshots, large text, themes/languages/offline.
- [ ] Production build, verified web deployment and live persistent smoke.
- [ ] Signed Android build, internal track upload/tester status and device verification.

## Architecture decisions

Keep `MealKitchen` and its serialized transaction/receipt model. Add source hashes to check-in answers rather than creating a second inventory or diary. Hashes are checked inside the existing locked transaction and survive retry/rebase unchanged. Recent unconfirmed meals (previous seven local dates) precede uncertain stock, then owned leftover batches. Show five at a time, with remaining questions reachable. Today/future context and additional food are optional. Never infer skipped food or complete daily nutrition from Done. No AI/provider requests for candidate generation. Feature disable preserves all recorded operations.

## Evidence

### Passed verification before release

- Web production build, lint/typecheck, all 117 unit tests; isolated PostgreSQL check-in API suite (8 groups / 57 requests) and all 16 existing connected-meals integration groups.
- Android 18 JVM tests; compile, debug APK/instrumentation APK, signed release APK/AAB; lint: 0 errors, 125 incumbent warnings and 1 hint. API 36 emulator rendered journey: snack save, approximate half portion, recreation draft restoration, EN/light and FR/dark context.
- Android `CheckInRestartTest#stage` and `#recover`: schedule persisted through adb force-stop; actual WorkManager delivery after restart, server revalidation, notification present, off switch cancels it. Periodic jobs are inexact, network-constrained and can be delayed by Android battery policies. Force-stopped apps need reopening before Android resumes work. Notification permission is contextual; denial leaves check-in usable.
- Web production-mode rendered journey: immediate reload restored the typed draft; network loss showed a pending answer and disabled duplicate save; reconnection and Retry saved it once and removed the resolved meal. Found and fixed development Strict Mode restoration overwriting the initial draft. Found and fixed context heading retaining its former language after switching locale.
- Hashes use canonical object order because PostgreSQL JSONB reorders object keys. Integration first exposed this and now covers the regression. Pantry hashes include stock history, preventing a stale delta after stock changes and changes that return to the same amount.
- Security: manager-only candidates, private adult exclusion, unauthorized IDs, revoked membership, member stock denial, row-lock concurrency/replay, invalid quantities and expired context. Account deletion removes actor confirmations/reminder settings from shared kitchens; logout purges device drafts and scheduled/displayed check-in notifications.
- Dependency audit found and patched existing `sharp` and `source-map-js` advisories. Final production audit: 0 known vulnerabilities. Sources: [sharp advisory](https://github.com/lovell/sharp/security/advisories/GHSA-wq5f-xc86-pv6w), [source-map advisory](https://github.com/advisories/GHSA-68fv-2mgg-jv7q). This is dependency scanning plus scoped security tests, not a penetration test.

### Performance

Reproducible `scripts/benchmark-check-in.ts`: 1,000 pantry batches, 4,000 eating events, 200 plans, 2,000 history entries; local Node cold 29.3 ms, warm median 12.1 ms, p95 18.3 ms (30 warm runs). Acceptance bound 250 ms p95 passed. Compact response 33,321 bytes/100 questions. No AI/provider calls. Initial implementation before indexing was not separately benchmarked; no before/after improvement claim. Production-mode loopback API suite: 57 requests, average 18.5 ms, maximum 41.9 ms; these are local results, not internet production latency.

Candidate policy: previous seven local dates, newest planned meals first and only managed people; uncertain pantry next; own active leftover batches last. Five answered/skipped questions ends a visit; returning to questions explicitly starts another optional set. API pages cap at 100 with `nextOffset`; total candidates remain bounded by existing kitchen limits. Today/future availability and food additions are optional. Timezone is kitchen-local and preserved with eating/context records. Each context expires at the next local midnight. Empty account has zero required questions.

### API and persistence contract

`GET /api/meals/check-in?kitchenId=...&offset=...` and `/api/native/v1/meals/check-in`: authenticated kitchen member, rate 60/minute; kitchen ID at most 80 characters, offset integer 0–40000. Repeatable-read snapshot returns kitchenId/version and checkIn policy, local date/timezone, compact guarded questions, page cursor, actor confirmations, managed corrections, seven context dates and own reminder settings. No other adult diary/profile/diagnoses returned.

Existing `POST /api/meals` / native adapter accepts optional `data._checkIn={kind,sourceId,personId?,sourceVersion}`. Source version is a canonical SHA-256 snapshot, validated inside the existing kitchen row lock. Operation UUID/receipt provides replay identity; an altered replay body is rejected. Existing ownership/role checks still apply. Meals/eating require profile manager; stock requires owner/planner/shopper; leftovers use existing occasion rights; context/reminders are actor-scoped for kitchen members. No Pro gate.

Answers reuse `eat`, `stock`, `pantry`, `leftover`, `context`, and `remove-eaten`. New `edit-eaten` atomically restores a previous leftover deduction, replaces exactly that record, and applies the corrected amount. Changing the food title to an external meal clears its recipe/leftover link; an amount-only correction preserves it. `check-in-reminder` validates enabled, HH:MM time/quietStart/quietEnd and IANA timezone. Amounts stay nullable/approximate; no inferred nutrients. Pantry quantity is 0–10,000,000 in its existing compatible unit; eating is >0–100 servings or unknown; leftovers 0–100 within prepared servings. Titles max160; context time 5–1440 integer or unknown. Generic body cap450KB and existing kitchen bounds remain.

401/403/404 require sign-in/access refresh; 409 distinguishes already resolved/changed/unavailable on the server and requires review, never an automatic stock overwrite; 400 invalid answer; 429 bounded rate retry; 503 feature disabled. The client preserves failed input and stable operation identity. Android's existing Room outbox retains source guards through generic sync rebase. Web draft writes debounce250ms and flush on navigation/pagehide; explicit saves persist immediately. Keys include account and kitchen. Mixed old clients retain new optional context fields. No schema migration or backfill; additive JSON fields only.

### Screenshots and traceability

Local evidence is intentionally ignored by Git under `test-results/check-in/`:

| Acceptance | Web screenshot | Android screenshot | Persistent evidence |
|---|---|---|---|
| Entry/status | web-entry-en-light.jpg | android/01-entry-en-light.png | candidate unit/privacy API groups |
| Meal identity/date/slot | web-meal-phone.jpg | android/02-food-draft.png | repeat/replay/replacement/snack API groups |
| Pantry prior amount/precision/unit | web-pantry-correction.jpg | native shared controls, API asserted | stale stock/purchase and unknown-quantity groups |
| Leftover correction/eating | correction controls and API evidence | shared source/guard operations | actual cook + leftover consumption/discard group |
| Practical context | web-context.jpg; web-context-fr-dark-phone.jpg | android/04-context.png; android/05-context-fr-dark.png | local expiry/old-client preservation group |
| Resume/pending/saved | web-offline-pending.jpg; web-reconnected-saved.jpg | android/03-saved.png | recreation, restart, replay and conflict tests |

Minimal journey: Agenda or Pantry → Kitchen check-in → relevant question → confirm/edit → Save; optional Skip or Done. Availability and food additions stay separate. Corrections are below the saved-change summary. No health profile edit shortcuts bypass consent.

### Release and operational boundaries

Vercel project `wauuls-projects/recipe-buddy`, linked repository `wauul/recipe-buddy`, production branch `main`, canonical host `recipe-buddy-wauul.vercel.app` verified live. Starting production deployment: `recipe-buddy-m17rx6noq-wauuls-projects.vercel.app`. Existing four committed design changes ahead of main are dependencies of this feature and are included without changing their architecture. Production rollout and live smoke results will be appended after verification.

Rollback: retain the previous Vercel deployment and promote/rollback through the existing project. Set `KITCHEN_CHECK_IN_ENABLED=false` and redeploy to hide candidates/reject guarded answers while retaining confirmed eating/stock/context records. Database state is additive; no destructive migration or backup restore is required for this release. Existing guarded migration/repair helpers remain unchanged; backup retention is an operator setting not independently certified here.

Web reminders use browser Notifications while Agenda/Pantry is open; they are explicitly labelled as such. No background web-push service/subscription is configured. Web drafts survive an offline interruption, but a cold page load still requires the website; Android retains the existing local-first cached kitchen. No physical phone is connected: emulator and signed artifact verification do not establish Play-installed physical-device, OEM battery-policy, or manual TalkBack behavior.

