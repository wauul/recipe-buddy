# Recipe Buddy project overview

Reviewed September 30, 2026 at `3070f95f49b444aba110ee410fdd28248177688a` on `main`.
Repository: https://github.com/wauul/recipe-buddy

## Product and architecture

Recipe Buddy is a personal recipe box with an optional playful AI sous-chef, shopping lists, cooking activity, and explicit sharing with friends. This checkout is the working project for this chat.

It is one Next.js 14 App Router application using React 18, TypeScript, Prisma 6, PostgreSQL, NextAuth credentials, bcrypt, Zod, and Groq. UI styling is primarily custom global CSS, with Tailwind configured and Lucide icons. Vercel Analytics and Speed Insights are mounted in the root layout. There is no separate backend service.

Server pages query Prisma directly and pass serializable data into interactive client components. Client mutations go through `src/lib/client.ts` to App Router API handlers and refresh server-rendered data with `router.refresh()`. `src/lib/db.ts` lazily creates a shared Prisma client, allowing builds to collect routes without connecting to a database.

## Main flows and code locations

| Flow                      | Main locations                                                                                                                                      | Behavior                                                                                                                                                                                 |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Signup/login              | `src/lib/auth.ts`, `src/components/auth-form.tsx`, `src/app/api/auth/`                                                                              | Normalized email login, bcrypt hashes, seven-day JWT sessions, database rate limits.                                                                                                     |
| Private recipe collection | `src/app/(kitchen)/recipes/`, `src/components/recipe-dashboard.tsx`, `src/components/recipe-detail.tsx`, `src/app/api/recipes/`                     | Create, edit, delete, title search, vibe filtering, random selection, UTC edit dates.                                                                                                    |
| Recipe editor/import      | `src/components/recipe-form.tsx`, `src/lib/ai.ts`, `src/lib/recipe-url.ts`, `src/lib/recipe-page.ts`                                                | Manual editing or text/public HTTPS import; AI output must pass the recipe schema. Parsing does not save automatically.                                                                  |
| Photos                    | `src/components/recipe-photo-input.tsx`, `src/components/recipe-art.tsx`                                                                            | Browser resize to 1000px maximum dimension, WebP compression, data URL stored in PostgreSQL, or external HTTPS image. Failed images show illustrated fallback.                           |
| Cooking activity          | `src/lib/streak.ts`, `src/app/api/recipes/[id]/cook/route.ts`                                                                                       | Idempotent per-user/per-recipe/per-UTC-day log. Dashboard counts distinct days this Monday-Sunday week, not consecutive days.                                                            |
| Shopping                  | `src/lib/shopping.ts`, `src/components/shopping-list.tsx`, `src/app/api/shopping-list/route.ts`                                                     | Combines owned recipes, normalizes names and unit aliases, sums numeric quantities/fractions, preserves ambiguous quantities. Browser local storage holds selection/checkmarks per user. |
| Friends/sharing           | `src/lib/social.ts`, `src/lib/social-policy.ts`, `src/components/friends-dashboard.tsx`, `src/components/recipe-sharing.tsx`                        | Exact email invitation; recipient accepts; owner explicitly shares individual recipes. Shared pages show the live recipe.                                                                |
| Twists/discussions        | `src/lib/discussion.ts`, `src/lib/discussion-validation.ts`, `src/components/recipe-discussion.tsx`, `src/app/api/recipes/[id]/discussion/route.ts` | Typed variations plus recipe comments and replies to variations. Owners moderate; authors can remove their contributions while they retain access.                                       |
| Settings                  | `src/lib/username.ts`, `src/components/settings-form.tsx`, `src/app/api/settings/route.ts`                                                          | Editable display name and optional roast mode. User ID remains identity; login/invites still use email.                                                                                  |
| Search/help/navigation    | `src/app/(kitchen)/search/page.tsx`, `src/lib/help.ts`, `src/components/nav.tsx`, `src/components/site-tools.tsx`                                   | Global search covers owned/shared recipes, ingredients, steps, FAQs and app pages. Light/dark theme, mobile navigation, scroll tools, cookie notice, contact mailto.                     |

## Data model and permission rules

`prisma/schema.prisma` defines eight models:

- `User`: credentials, display username, roast preference.
- `Recipe`: one owner, JSON ingredients/steps, photo, vibe, subtitle, roast, timestamps.
- `CookedLog`: unique `(userId, recipeId, date)`.
- `RateLimit`: hashed identity key, counter, expiry; atomic SQL upsert works across serverless instances.
- `Friendship`: canonical sorted user pair, requester, optional acceptance timestamp; unique pair prevents crossed duplicate requests.
- `RecipeShare`: recipe, recipient, friendship; unique recipe/recipient pair.
- `RecipeTake`: variation on the original recipe, with author, type, optional ingredient/reason.
- `RecipeComment`: recipe comment or reply to a take, with author.

Authenticated kitchen pages use `currentUser()`; APIs use `userId()`. Recipe CRUD, cooking and shopping verify ownership. Shared reads and discussion access recheck the current share and accepted friendship. Recipients can discuss recipes but cannot edit, delete, reshare, mark them cooked, or select them in the shopping list.

Deleting a friendship cascades its shares and revokes access in both directions. Unsharing keeps past contributions attached to the owner's recipe. Deleting a take cascades its replies; deleting a recipe cascades its shares, cooking logs, takes, and comments. Display names are resolved on reads so renames affect old contributions; usernames are not unique login handles.

## Import and request boundaries

`src/lib/http.ts` centralizes session checks, JSON body parsing (450KB limit), browser origin checks against `NEXTAUTH_URL`, friendly errors and successful response cache control. Zod validates recipes, credentials, settings and discussion payloads.

The URL importer accepts public HTTPS only, checks all resolved addresses, pins the connection to the checked address, rechecks redirects, limits redirects/body size/request duration, and extracts Recipe JSON-LD before falling back to article/main/body text. Images come from website metadata. Groq parses up to 16,000 source characters into validated recipe fields. Its code requests `llama-3.1-8b-instant` and retries `openai/gpt-oss-20b` only on a model-not-found response, within a shared 12-second deadline. These are configured code choices; current provider availability was not checked.

Roast generation is optional and separate; failures use a local joke so manual saving works without an AI key. Parsing and saving can each request a roast. Photo URLs load directly in the browser rather than a server-side proxy.

## Local setup and verification

Use the checked-in `pnpm-lock.yaml` with `pnpm install --frozen-lockfile`. Required local configuration is `DATABASE_URL`, `NEXTAUTH_SECRET`, and `NEXTAUTH_URL`; `GROQ_API_KEY` is optional for manual use. `.env.example` provides the template; this fresh checkout has no `.env.local`.

Commands: `pnpm dev`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`. Tests compile with a separate TypeScript configuration and use Node's built-in test runner. They cover shopping, UTC activity, validation, URL address safety, page extraction/photos, friend pair normalization, outbound tracking, discussion inputs and usernames. They do not exercise full database-backed permissions or browser flows.

Database migration commands explicitly load `.env.local`. Six committed migrations cover initial schema, social sharing, photos, edit timestamps, discussions and usernames. Builds generate Prisma Client without applying migrations. `scripts/migrate-usernames.cjs` is a production-only helper for one reviewed migration, not a normal setup command.

`README.md` documents a Vercel deployment and Neon database; these are historical records, not verified live configuration. `VERIFICATION.md` records prior checks and has not been overwritten by this review.

Current checkout verification on September 30, 2026 (Node 24.21.0 x64, pnpm 12.6.0):

- Frozen-lockfile dependency installation and Prisma Client generation passed.
- `pnpm typecheck` passed.
- `pnpm lint` passed with no warnings or errors.
- `pnpm test` passed all 20 tests.
- `pnpm build` passed compilation, type/lint validation, page generation and build tracing.
- Database-backed login, persistence, sharing permissions and live Groq calls were not exercised: local credentials are absent. Build success does not confirm these integrations.

## Maintenance observations

- README's project map predates social/discussion models; its discussion attribution paragraph also predates editable usernames. Source code is authoritative for current behavior. Repository visibility is currently public even though historical docs call it private.
- Recipe and search pages load full collections; global recipe search filters JSON content in application memory. Pagination/database search would become relevant with larger collections. Embedded photos increase database and response sizes.
- No calendar meal planner, password reset, email verification, account deletion, or cloud-synced shopping checklist is implemented.
- The documentation requests Node 22; this machine currently provides Node 24.21.0. The README documents a Windows ARM/x64 Prisma constraint from earlier setup; this review has not tested database execution.
- No application behavior, production data, deployment settings, or migrations were changed during this onboarding review.

## Redesign follow-up

The onboarding snapshot above describes the original repository. Subsequent local work on `codex/recipe-buddy-redesign` replaces the interface while preserving data contracts and authorization logic. See `DESIGN.md`, `DESIGN_VERIFICATION.md`, and `ASSETS.md` for the chosen direction, tests and asset provenance. New shared presentation modules are `RecipeCard`, `RecipeBody`, `SharedRecipeDetail`, `CookingIllustration`, `Brand`, and `ThemeSettings`; theme helpers live in `src/lib/theme.ts`. No migrations, production changes or pushes were performed.

## Chef accounts and progression follow-up

A later user request adds Google OAuth and chef levels/reviews. The new `@next-auth/prisma-adapter` dependency maps Google provider identities to the same `User` IDs used by password login and recipe ownership; JWT sessions remain. Verified Google profiles are required. Existing password accounts are connected only from an authenticated session, rather than merged by matching email. Google-only users have a null password hash.

Four additive models (`Account`, `Session`, `VerificationToken`, `RecipeReview`) bring the schema to twelve models. `Session` and `VerificationToken` are standard adapter models; runtime sessions still use JWTs. The migration was initially prepared locally; its release mechanism is described below.

`src/lib/chef-levels.ts` owns the seven thresholds and combined recipe/apron formula. `src/lib/chefs.ts` counts current owned recipes and sums received review ratings with per-render caching. `src/lib/reviews.ts` reuses discussion access checks. The reviews endpoint validates input, forbids self-review, locks the shared row through an upsert and enforces one review per chef/recipe through a database constraint. Withdrawal deletes only the current chef’s review and remains available without recipe access.

`ChefProgressPanel`, `ChefBadge`, `ApronIcon`, `RecipeReviewsPanel` and `GoogleSignIn` provide the presentation. Current chef names are resolved on reads. The five new feature tests cover score boundaries, review validation/identity stripping, verified Google profile checks and account-collision recovery messages. See `GOOGLE_AUTH_SETUP.md` for configuration and live smoke tests.

## Public landing and Git release follow-up

The user requested a public landing page, simpler artwork, more animation and a push to GitHub `main`. The generated image assets were removed. `KitchenPlate` and the existing SVG kitchen/badge family now provide the visuals, and authentication is text-first. Landing scroll reveals and remounting kitchen page entrances complement the existing control, steam and progress animations, with a complete reduced-motion fallback.

Vercel project `recipe-buddy` is linked to this repository's `main`; its verified Node runtime is 24.x. The build invokes `scripts/migrate-chefs.cjs` only for Vercel production. This transactional helper applies only the checksum-pinned additive chef migration after verifying the six original migrations, records completion, and skips repeat execution. Local/preview builds do not access a database. Four isolated helper tests extend the unit suite to 29. This release mechanism supports the user's requested Git-only deployment without obtaining production database credentials locally.
