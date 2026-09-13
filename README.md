# Recipe Buddy 🍝

A private recipe box with a playful sous-chef. Built with **Next.js 14 App Router, React 18, Tailwind CSS, Prisma + Postgres, NextAuth Credentials, bcrypt, Zod, and Groq**. No paid API keys are required. Manual recipe creation works without a Groq key.

## What's inside

- Email/password signup and login; bcrypt hashes and signed, HTTP-only JWT sessions.
- Private recipe CRUD with dynamic ingredient and instruction fields.
- Paste recipe text or a public HTTPS URL to extract a recipe using Groq's `llama-3.1-8b-instant`.
- Silly alternate titles, cozy/lazy/fancy/chaotic badges, and optional chef roasts.
- Cooking mascot based on **distinct cooked days this calendar week**, Monday–Sunday **in UTC**. This is weekly activity, not a consecutive-day streak. Multiple recipes on one day count once. Repeated clicks are idempotent.
- Random recipe shuffle, recipe search, and vibe filters.
- Shopping lists grouped by ingredient; matching unit quantities add together. Checkboxes persist in this browser, separately for each user. Completing a nonempty list triggers confetti, respecting reduced-motion preferences.
- Responsive cream-and-sage UI with illustrated recipe cards, useful empty states, loading and error screens.

The requested meal-planning flow is recipe selection → combined shopping list; a separate calendar scheduler is not included.

## Prerequisites

- Node.js **22 LTS**, npm, Git, and a free GitHub account.
- A free Neon Postgres project.
- Optional free Groq account for AI features.
- A Vercel Hobby account for a personal/non-commercial deployment.

This project deliberately uses the requested Next.js 14 line (`14.2.35` resolved in the lockfile). Next.js 14 is outside current LTS support; assess an upgrade before a public production launch. See the [Next.js support policy](https://nextjs.org/support-policy) and [security advisories](https://github.com/vercel/next.js/security/advisories). No middleware-based authorization is used: each server page/API verifies the session and recipe ownership.

## 1. Get the code and install

If you already have this folder, open a terminal here. After pushing to GitHub, a fresh checkout is:

```sh
git clone https://github.com/YOUR_USERNAME/recipe-buddy.git
cd recipe-buddy
npm install
```

`postinstall` generates Prisma Client. A `pnpm-lock.yaml` is also included because the build environment uses pnpm. For that exact dependency resolution, run `pnpm install --frozen-lockfile`. If standardizing on npm, generate and commit `package-lock.json` and remove `pnpm-lock.yaml` so deployment uses one package manager consistently.

## 2. Create a free Neon database

1. Sign up at [Neon](https://neon.com) and select the **Free** plan.
2. Create a project called `recipe-buddy`, choosing a region close to your Vercel function region.
3. Open **Connect**, choose your database and role, and copy its Postgres connection string. Keep `sslmode=require`.
4. Use a pooled connection string for the app if offered. For migrations, a direct connection string is the safest choice; see the migration note below.
5. Do not commit or share the connection string. It contains your database password.

See [Neon plans](https://neon.com/pricing) for current free storage and compute limits. Paid upgrades are unnecessary for a small personal app.

## 3. Configure environment variables

Copy `.env.example` to `.env.local`:

```sh
# macOS / Linux
cp .env.example .env.local
```

```powershell
# Windows PowerShell
Copy-Item .env.example .env.local
```

Fill in:

```dotenv
DATABASE_URL="postgresql://USER:PASSWORD@YOUR_NEON_HOST/neondb?sslmode=require"
NEXTAUTH_SECRET="YOUR_RANDOM_SECRET"
NEXTAUTH_URL="http://localhost:3000"
GROQ_API_KEY="YOUR_FREE_GROQ_KEY"
```

Generate a session secret:

```sh
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

No variable uses `NEXT_PUBLIC_`: secrets stay on the server. `GROQ_API_KEY` can be blank; parsing then reports a recoverable error, and manual saves still work with a local roast fallback.

## 4. Get a free Groq API key

1. Sign up at [Groq Console](https://console.groq.com).
2. Open [API Keys](https://console.groq.com/keys) and create a key for this project.
3. Put it in `GROQ_API_KEY` locally and in Vercel's environment settings.
4. Stay on the Free plan; do not enable paid billing. Check your account's model access and limits.

The app first requests `llama-3.1-8b-instant`. This account returned `model_not_found` during deployment, so that specific error triggers a fallback to `openai/gpt-oss-20b`, available on Groq's free plan. Both calls share one timeout. Other provider errors still preserve the manual editor. See [Groq models](https://console.groq.com/docs/models) and [free-plan rate limits](https://console.groq.com/docs/rate-limits).

Recipe source text is sent to Groq when you click **Parse recipe**. When roast mode is on, the dish title is sent again for a one-liner after parsing or saving. Turn roast mode off in Settings to stop that call. Review AI-generated ingredients and instructions before saving or cooking.

## 5. Apply the migration and run

```sh
npm run db:migrate
npm run dev
```

Visit [Recipe Buddy locally](http://localhost:3000), create an account, and add your first recipe.

The `db:*` scripts explicitly load `.env.local` using `dotenv-cli`, because Prisma CLI does not automatically load Next.js's `.env.local`. The initial SQL migration is checked in under `prisma/migrations`.

For future schema changes:

```sh
npm run db:dev -- --name describe_your_change
```

For a direct migration connection, temporarily set `DATABASE_URL` in `.env.local` to Neon's direct connection string, run `npm run db:migrate`, then restore the pooled URL. No additional required environment variable is needed.

## Project map

```text
prisma/
  schema.prisma                     User, Recipe, CookedLog, RateLimit
  migrations/20260911000000_init/    Initial Postgres migration
src/
  app/
    (kitchen)/                      Authenticated layout + recipe/shopping/settings pages
    api/auth/[...nextauth]/          NextAuth GET + POST
    api/auth/signup/                Account creation
    api/recipes/                    Private recipe collection
    api/recipes/[id]/               Recipe read/update/delete
    api/recipes/[id]/cook/          Idempotent cooked-day log
    api/recipes/parse/              URL/text → validated AI recipe
    api/shopping-list/              Merge selected recipes
    api/settings/                   Persist roast preference
    login/ and signup/              Public auth forms
    globals.css                     Responsive design
  components/                       Forms, dashboard, recipe art, detail, navigation
  lib/                              Auth, validation, AI, safe URL fetch, aggregation
  types/next-auth.d.ts              Session user ID
tests/core.test.ts                  Validation, URL safety, aggregation, week boundaries
```

`User.roastEnabled` extends the requested schema for a persistent preference. `RateLimit` adds shared throttling across serverless instances without Redis or a paid service.

## API contract

All recipe, shopping and settings routes require an authenticated session. Mutations accept `Content-Type: application/json`; browser origins must match `NEXTAUTH_URL`. Errors return `{ "error": "friendly message" }` with an appropriate HTTP status.

| Method | Route | Request / result |
| --- | --- | --- |
| GET, POST | `/api/auth/[...nextauth]` | NextAuth session, CSRF and credentials handlers |
| POST | `/api/auth/signup` | `{email,password}` → `{ok:true}` |
| GET | `/api/recipes` | User's recipes, newest first |
| POST | `/api/recipes` | Recipe input → saved recipe (201) |
| GET | `/api/recipes/:id` | Owned recipe or 404 |
| PUT | `/api/recipes/:id` | Complete recipe input → `{ok:true}` |
| DELETE | `/api/recipes/:id` | `{}` → `{ok:true}` |
| POST | `/api/recipes/parse` | `{text}` → recipe fields + roastLine |
| POST | `/api/recipes/:id/cook` | `{}` → `{ok:true,date}` |
| POST | `/api/shopping-list` | `{recipeIds:[...]}` → `[{name,amounts:[...]}]` |
| PUT | `/api/settings` | `{roastEnabled:boolean}` → saved preference |

Recipe input:

```json
{
  "title": "Tomato pasta",
  "servings": 2,
  "ingredients": [{ "name": "pasta", "quantity": "200", "unit": "g" }],
  "steps": ["Cook the pasta according to its packet instructions."],
  "altTitle": "Tuesday Night Carb Club",
  "vibe": "cozy"
}
```

## AI and fallback behavior

1. Input is limited to 16,000 characters. Public HTTPS pages are fetched server-side, with Cheerio removing scripts and navigation.
2. URL fetching rejects private/reserved IPs, credentials, non-HTTPS protocols and nonstandard ports. Each redirect is checked; DNS is pinned to the validated IP. Response size and request duration are limited. Some sites block automated readers: paste the text instead.
3. A system prompt requests the required recipe schema plus `altTitle` and `vibe` in one JSON response.
4. JSON parsing **and Zod validation** run before the editor receives anything. Invalid output, timeouts, missing keys and rate limits become friendly errors; the current form is preserved.
5. Roast generation is separate and optional. Its failure uses a local one-liner instead of failing a save.

Shopping aggregation normalizes case, whitespace and common unit aliases, sums numbers and fractions, and preserves ambiguous quantities such as `to taste`. Different units remain separate. Ingredient synonyms (such as scallion/green onion) and weight/volume conversions are intentionally not guessed.

Login is limited per normalized email, signup has a small global hourly cap, and AI/save routes are limited per user using Postgres. Rate-limit keys are hashes; the table can periodically be cleaned with `DELETE FROM "RateLimit" WHERE "expiresAt" < NOW();`. Password reset/email verification are not part of this credentials-only implementation.

## 6. Initialize Git, commit, and push to GitHub

This delivered workspace already has an empty Git repository. `git init` is safe to run again, or omit it here.

```sh
git init
git add .
git status
git commit -m "Build Recipe Buddy recipe and meal planner"
git branch -M main
```

Before committing, confirm `.env.local`, `node_modules`, and `.next` are absent from staged files; `.gitignore` excludes them.

1. Sign in to [GitHub](https://github.com).
2. Click **New repository**, name it `recipe-buddy`, and choose private or public.
3. Leave README, license and `.gitignore` initialization unchecked, since this project already has files.
4. Create the repository and copy its HTTPS remote URL.
5. Run:

```sh
git remote add origin https://github.com/YOUR_USERNAME/recipe-buddy.git
git push -u origin main
```

If `origin` already exists, inspect `git remote -v` and use `git remote set-url origin ...` only if it should point to the new repository. GitHub HTTPS authentication uses its credential manager or a personal access token, not your account password. Keep tokens out of remote URLs and source files.

## 7. Deploy to Vercel for free

1. Sign in to [Vercel](https://vercel.com) with GitHub and use the **Hobby** plan. [Hobby is for personal/non-commercial use](https://vercel.com/docs/plans/hobby); this guide assumes a personal app within free limits.
2. Choose **Add New → Project**, import `recipe-buddy`, and keep the Next.js preset and repository root.
3. Choose **Node.js 22.x**. Use the default install command and `npm run build` (or `pnpm build` if retaining the pnpm lockfile).
4. Add `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, and `GROQ_API_KEY` to the **Production** environment. Use a new production session secret.
5. Set `NEXTAUTH_URL` to your expected canonical HTTPS domain, for example `https://recipe-buddy-yourname.vercel.app`.
6. Apply the migration against the intended production Neon database **before using the deployment**, using `npm run db:migrate` with that database's direct connection string. Restore local environment values afterward. Builds generate the client but do not mutate the database.
7. Click **Deploy**. If the assigned domain differs, correct `NEXTAUTH_URL` to the actual canonical URL and redeploy. Do not include a trailing path.
8. Open the deployed app, sign up, save a manual recipe, parse a recipe, mark it cooked, generate a shopping list, and check all items.
9. Future pushes to `main` deploy automatically. Apply any new committed migrations before releasing code that needs them.

For preview deployments, use a separate Neon branch/database and a matching preview `NEXTAUTH_URL`; do not point test deployments at production data. The canonical origin setting means alternate domains must redirect to the chosen domain.

## Checks

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

The unit suite exercises ingredient sums/fractions, ambiguous quantities, weekly deduplication and boundaries, malformed AI payloads, password byte limits, and private-address URL rejection.

For a full live smoke test with your database and key:

1. Create two accounts; save a recipe in account A.
2. Verify account B gets 404 when opening/editing/deleting/cooking A's recipe or including its ID in a shopping request.
3. Create, reload, edit and delete a manual recipe; verify persistence.
4. Parse raw text and a supported public URL. Test non-recipe input and an unavailable Groq key; manual fields must remain usable.
5. Disable roast mode, save again, and confirm no new roast appears; reload to verify the preference persists.
6. Mark multiple recipes cooked on one day and confirm the mascot count rises only once.
7. Merge recipes sharing `1 1/2 cups` and `1/2 cup` of the same ingredient; expect `2 cup`. Check every item and confirm completion feedback.
8. Check phone-width navigation, form labels, keyboard focus and reduced-motion settings.

## Troubleshooting

- **Database connection failure:** verify the Neon endpoint, password, SSL setting and completed migration. Free compute may need a moment to wake up.
- **Prisma engine fails on Windows ARM:** use an x64 Node.js 22 installation, reinstall dependencies, and run `npx prisma generate`. The included Prisma 6 native Windows engine targets x64. Vercel's Linux runtime generates its own client during install/build.
- **Invalid credentials:** use the normalized email and correct password; the login throttle clears after 15 minutes.
- **403 on a mutation:** make `NEXTAUTH_URL` match the exact browser origin and restart/redeploy.
- **AI error:** confirm the key/model is enabled and within free limits; paste plain text if a website refuses fetching.
- **Changes to secrets:** restart the local server or redeploy Vercel. Changing `NEXTAUTH_SECRET` signs existing sessions out.

## Current deployment

- Live app: [Recipe Buddy](https://recipe-buddy-wauul.vercel.app)
- Private GitHub repository: [wauul/recipe-buddy](https://github.com/wauul/recipe-buddy)
- Vercel project: `recipe-buddy` on the Hobby plan, linked to GitHub `main` for automatic deployments.
- Neon project: `recipe-buddy` (`gentle-bread-94796146`), Free plan, AWS Ohio.
- Initial SQL migration applied once with user approval, including the matching Prisma migration-history record. Future database migrations remain an explicit release step.
- All four production environment variables are stored as sensitive values in Vercel, with no secrets committed to GitHub.

## Friends, sharing and photos

Visit **Friends** to send a request using another member's exact email. The recipient accepts or declines in their Friends page. Both people can cancel/remove the connection. Nothing is shared automatically: open a recipe and choose a friend under **Pass the recipe, chef**. Shared recipes appear on the friend's Friends page, including photos and the latest edits. Only the owner can edit or delete. Stop sharing or remove a friend to revoke future access (this cannot erase anything they already copied).

Add or edit a recipe to upload a JPG, PNG or WebP (up to 10 MB), or paste an HTTPS image URL. Uploads are resized in the browser to at most 1000 pixels and compressed to a maximum of 300 KB of encoded data, stored in the existing Postgres database. This uses database capacity, with no additional storage service. Website imports prefer Recipe JSON-LD images, then Open Graph/Twitter metadata. Missing or blocked images use the illustrated fallback. External image links are loaded by the viewer's browser without a referrer; only use images you are allowed to share.

New API routes: `GET/POST /api/friends`, `PATCH/DELETE /api/friends/[id]`, `GET/POST/DELETE /api/recipes/[id]/shares`, `GET /api/shared-recipes`, and `GET /api/shared-recipes/[id]`. All require login. Friend request acceptance is restricted to its recipient, and recipe sharing to its owner and accepted friends.

For existing installations, apply the additive `20260914000000_social` and `20260914010000_recipe_photos` migrations **before** deploying this version (`npm run db:migrate`). Existing recipes remain private and keep their illustrations until a photo is added. Migrations are run explicitly, not on every Vercel build.
