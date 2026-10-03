# Native API v1

Server extensions are additive. Existing `/api/recipes`, `/api/friends`, etc. continue to require NextAuth cookies and their existing browser-origin/JSON limits. Bearer tokens are accepted **only** at `/api/native/v1/*`. The adapter enters an async request scope after verifying issuer, audience, algorithm, expiry and the DB session; it invokes the existing ownership and sharing handlers. All responses are no-store.

## Sessions

`POST /api/native/auth/login` → `{email,password}` → `{accessToken,refreshToken,userId,expiresIn:600}`. Same normalized identities, bcrypt byte limits, dummy comparison and login throttle as the website. Requires `NATIVE_SESSION_SECRET` (at least 32 random characters), separate from NextAuth's secret. Refresh session lifetime: 30 days, absolute, not sliding.

`POST /api/native/auth/refresh` → `{refreshToken}` → rotated credentials. Refresh tokens are random 256-bit values, stored hashed. Conditional transactional claim prevents simultaneous rotation; a reused token commits revocation of the entire session family. Keep historical hashes until the session expires so reuse remains detectable. Access tokens are invalid after revocation even before their ten-minute expiry. Client uses a mutex and retries an authenticated request at most once after a 401; it does not retry network failures or provider calls automatically.

`POST /api/native/auth/logout` → `{refreshToken}` → `{ok:true}`. Can revoke with the refresh credential even when access expired. Offline sign-out always clears device data; server revocation requires network delivery, and unsent credentials otherwise expire server-side.

`POST /api/native/auth/begin` → `{state:<43-char base64url>,challenge:<S256>,redirect:"recipebuddy://auth"}` → `{url:<canonical HTTPS /mobile/connect?attempt=...>}`. The app opens the system browser, reusing NextAuth credentials/Google/signup. The allowlisted redirect is never accepted from arbitrary data. Attempts expire after ten minutes. Browser approval requires a signed-in cookie session, canonical Origin and explicit user action. It issues a single-use 60-second code and state in the callback; no refresh/access credential is in a URL.

`POST /api/native/auth/exchange` → `{code,state,verifier}` → credentials. Wrong state, wrong verifier, expired or replayed code returns 401 without issuing a session. The browser path remains available for account creation.

`POST /api/native/auth/google-begin` → `{}` → `{attempt,nonce,clientId}`. Requires `NATIVE_GOOGLE_WEB_CLIENT_ID` (fallback `GOOGLE_CLIENT_ID`); absent configuration returns 503. Five-minute attempt, global 60/minute throttle. Android passes this Web client ID and nonce to Credential Manager's native Google button flow.

`POST /api/native/auth/google` → `{attempt,idToken}` → native credentials. ID token ≤12,000 characters, verified against Google's fixed HTTPS JWKS endpoint with RS256, exact audience, allowed Google issuer, expiry and max age ten minutes. Verified-email and exact attempt nonce required; transaction claims the attempt once. A linked subject retains its chef ID; otherwise a verified email links to the existing chef as the website does, or creates a chef under the shared signup limit. No Google access/refresh/ID token is stored; only provider/subject linkage. Expired/replayed/mismatched attempt returns 401. Registration and signing details are in `GOOGLE_SIGN_IN.md`.

## Data

| Method | `/api/native/v1/` suffix | Contract |
| --- | --- | --- |
| GET | `me` | ID, chef name/email/roast preference, existing chef score and distinct UTC cooked days |
| GET | `recipes?q=&vibe=&cursor=` | `{items:[Recipe],nextCursor:string|null}`, 50 at a time, stable ID order; search/filter on owned recipes |
| POST | `recipes` | Existing complete RecipeInput; creates only after explicit Save, 201 |
| GET | `recipes/:id` | Recipe DTO + `owned` and `sharedBy`; owner or active explicit share, otherwise 404 |
| PUT/DELETE | `recipes/:id` | Existing owner-only mutation; PUT complete RecipeInput, DELETE `{}` |
| POST | `recipes/:id/cook` | `{}`; existing owner-only UTC-day upsert, repeated same-day clicks are idempotent |
| GET/POST/DELETE | `recipes/:id/shares` | Existing grants; POST/DELETE `{recipientId}`, owner + accepted friendship required |
| POST | `recipes/parse` | `{text}` (10–16,000 characters), existing guarded URL/text pipeline; preview only |
| GET/POST | `friends` | Existing friend rows; email fallback POST `{email}` |
| PATCH/DELETE | `friends/:id` | `{}`; only recipient accepts; delete also cancel/decline, cascading grants |
| GET | `shared-recipes` | Authorized shared recipe DTOs with chef attribution |
| PUT | `settings` | `{username?,roastEnabled?}`; existing settings validation |
| POST | `shopping-list` | `{recipeIds:[...]}`; owned + currently explicitly shared recipes, existing quantity aggregation |
| POST | `matches` | `{ingredients:[{name,quantity,unit}]}`; current authorization checked server-side; ranked results below |
| POST | `invites` | `{}`; creates fresh single-use seven-day invite, revoking previous unredeemed ones |
| GET/POST | `invites/:token` | GET preview `{chefName,expiresAt}`; POST `{}` explicit transactional acceptance |
| POST | `analyze` | Recognition contract below |

Recipe DTOs retain stored `translations.en/fr` dictionaries. Language changes and recipe reads never trigger an AI translation. Recipe ingredients remain the website's `{name,quantity,unit}`; explicit `(optional)` / `(facultatif)` in the name is honored by matching. No generalized unit conversion or pantry assumption is made. Rank: missing required count ascending, matched fraction descending, stable recipe ID. A missing amount or incomparable unit produces a caveat; known insufficient same-unit amounts produce `insufficient`.

Example match:
```json
{"recipe":{"id":"...","title":"Tomato rice","owned":true,"sharedBy":"","ingredients":[],"steps":[]},"matched":3,"required":3,"missing":[],"quantityCaveat":"unknown","allFound":true}
```

Invite URLs are `https://CANONICAL_HOST/invite/<43-char random base64url>`. Only hashes, inviter, expiry and redemption/revocation are stored. Creation: 10/hour/account; redemption: 20/hour/account. GET/scanning alone changes nothing. Same recipient redemption is idempotent; other replay 409, expired/revoked 410, self-invite 400. A canonical friendship pair upsert handles crossed requests/already-friends without auto-sharing anything. Web fallback supports login/signup/accept and explicitly asks users to reopen a link after installation.

## Web feature parity additions

`GET me` includes complete server chef progression (`current`, `next`, points, recipe count, received apron sum/count/average, percentage/points to next), all seven canonical `levels`, seven UTC weekly `days`, and owned recipe IDs `cookedToday`. Existing fields remain compatible.

`GET chefs/:id` is available only for a currently accepted, unblocked friend. It returns their display name/progression and **only recipes actively shared with the caller**. `GET search?q=` searches owned/authorized shared originals and persisted language variants, never another chef's private recipes. Collection `recipes?q=` matches original/saved translated titles and retains 50-item cursor pagination.

`GET recipes/:id/community` returns `{recipeId, discussion, reviews}`. Individual `GET/POST/DELETE recipes/:id/discussion` and `GET/PUT/DELETE recipes/:id/reviews` delegate to the same web handlers, validation, terms checks, rates, active-sharing rules, author/owner contribution deletion and transaction-protected review writes. Twists use `{kind:'take', type, title, change, ingredient?, reason?}`; comments `{kind:'comment', text, takeId?:string|null}`; removal `{kind:'take'|'comment', id}`. Reviews accept `{rating:1..5, text?:string}`; one row per author/recipe; owners cannot review themselves. Withdrawal remains possible after share revocation without exposing the recipe.

`POST recipes/:id/roast`, `POST recipes/:id/translations`, and `POST translate` reuse existing web handlers. Translation returns an **ordered translations array**, matching input strings. Batches: at most 32 strings, 4,000 characters each and 12,000 total; Android uses at most 30 per batch. Owned recipe bilingual preparation follows the existing deadline; native runtime/client permit 300 seconds for save/preparation. Reading saved recipes does not silently call a model.

Native password signup uses the existing bounded anonymous `/api/auth/signup`, then native login; content writes still require current terms. Mobile printing is excluded at the user's request.

## Recognition

Default off. Set `VISION_ENABLED=true`, `VISION_MODEL` to a currently supported vision model, `GROQ_API_KEY`, and `VISION_DAILY_QUOTA` (default 10, allowed 0–100) **only after checking account/model access and a suitable free quota**. Groq's [vision docs](https://console.groq.com/docs/vision) listed `qwen/qwen3.8-27b` on 2026-10-03; this was documentation verification, not an account-entitlement or live-call test. Provider selection is behind `VisionProvider`. No fallback cascade.

Request `{requestId:<UUID>,locale:"en"|"fr",image:"data:image/jpeg;base64,..."}`. One JPEG only; max raw bytes 200,000; max edge 1024 pixels. Android reorients/resizes to max 960, re-encodes without EXIF and compresses ≤200,000 bytes. Server validates decoded dimensions and re-encodes to remove metadata again. Existing global 450,000-byte JSON body limit is unchanged. Provider timeout 25s; output bounded to 40KB envelope/14K text/40 validated suggestions/1800 output tokens. Suggested quantity is only readable text; uncertain identification is explicitly marked, with no confidence percentage or safety/allergen inference.

Response `{suggestions:[{canonical,label,quantity,unit,uncertain}]}`. Editable suggestions become confirmed ingredients; photos are transient and discarded after successful analysis/removal/logout. DB scan key is account + request UUID hash; digest binds image and locale. A reservation prevents duplicate paid calls across instances. Result cache 15 minutes. Duplicate finished requests return cached validated results; pending/failed reservation 409 prevents implicit retries. Changed payload 409; expired reservation 410. Minute quota 3/account, configurable UTC-day quota. No real recognition calls were used in verification.

## Errors, idempotency, cleanup

Errors retain the website `{error:string,retryAfter?:number}` envelope; Android presents resource-localized explanations by status: 400 invalid input/link, 401 expired/revoked auth, 403 denied, 404 unavailable/private, 409 used/in-flight/conflict, 410 expired, 413 too large, 415 JSON required, 422 import/provider input failure, 429 throttle/quota, 502 provider failure, 503 missing configuration. Server does not log passwords/tokens/images. Clients preserve drafts after recoverable failures.

Cooked logs, grants, invite acceptance and scan UUIDs have explicit idempotency. POST recipe creation/email requests/invite regeneration are not retry-safe; Android does not auto-retry them after transport errors. A 401 is raised before business work, allowing one refresh/retry. PUT is a full replacement; DELETE after deletion returns 404. Match/search/shopping are read calculations and do not modify production inventory.

Apply `20261003000000_native` only to the intended isolated/staging database before releasing this server. It adds session/refresh/exchange/invite/scan tables, with no existing-data rewrite. Production migration/deployment were not performed. Periodically remove expired native sessions (tokens cascade), auth attempts, scans and expired invites; never remove used refresh hashes for a still-live session. Raw photos are never stored. Widget uses local data only and adds no backend table.

## Publication/account controls (2026-10-03)

`GET me` also returns `termsVersion`. `POST terms` requires `{version:"2026-10-03",accepted:true}`. Terms acceptance gates recipe creation/editing, shares and web discussions/reviews (428 if missing); deleting your content/account remains available.

`DELETE account` requires `{confirmation:"DELETE",password?:string}`. The current password or a native session whose stable authenticatedAt is within five minutes is required; refreshed tokens do not count as a fresh sign-in. Five attempts per 15 minutes; wrong passwords fail even with a fresh session. Success returns `{ok:true}` after transactional active-data removal and revokes all associated sessions. The client then clears its account-local caches/widgets/timers.

`GET blocks` returns your blocked chef IDs/names. `POST/DELETE blocks` accept `{chefId}`; only the caller's block is changed. Blocking removes the friendship and its grants; unblocking does not recreate them. Blocked chefs are excluded from requests, invites, sharing, shared reads, matches and shopping authorization in both directions.

`POST reports` requires an accessible `{recipeId?}` and/or `{chefId?}`, plus a trimmed reason of 5–1000 characters; 10/hour/account. Only owned/actively shared recipes or your connected chefs can be reported. Reports are private operator data, not a public list.

Equivalent cookie-authenticated web deletion/terms endpoints are `/api/account` and `/api/account/terms`, with strict same-origin checks. Public privacy, terms and external deletion entry points are `/privacy`, `/terms`, `/delete-account`. Maintenance is a separate secret-authenticated server endpoint; see PUBLICATION.md.

The publication-controls migration is additive and has only been applied to the isolated local database. Deploy it before these routes; existing native sessions receive an old authenticatedAt and must reauthenticate for passwordless deletion.
