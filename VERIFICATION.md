# Verification

## Passed locally

- Next.js production build: compiled, linted, type-checked and generated all routes successfully.
- TypeScript: no errors after the final URL-fetch and mobile-navigation changes.
- ESLint: no warnings or errors.
- Seven unit tests: ingredient normalization and fractions, ambiguous amounts, distinct cooking days, week/year boundaries, AI schema validation, password byte limits, and private URL address rejection.
- Browser: login page visibly rendered, signup link opened the signup form, and `/recipes` redirected an unauthenticated visitor to `/login`.
- HTTP: all nine protected recipe/shopping/settings method combinations returned 401 without a session.

## Production verification (September 13, 2026)

Published at https://recipe-buddy-wauul.vercel.app from the private wauul/recipe-buddy GitHub repository. Vercel Hobby and Neon Free are in use. Initial schema applied successfully with user approval and recorded in Prisma migration history.

Live API tests passed: account signup, credentials login, recipe create/read/update/delete, cooked log, shopping aggregation, and persistent settings. The temporary test recipe was removed. A synthetic smoke-test account remains with no recipes.

Groq returned model_not_found for the originally requested llama-3.1-8b-instant. The new fallback to openai/gpt-oss-20b was tested successfully against the real API: recipe JSON passed Zod validation and a roast was generated. Public-URL import and cross-user isolation with two accounts have not been exercised in production.

The local runtime is Windows ARM64, while Prisma 6's native Windows query engine targets x64. Use x64 Node.js 22 locally as documented. The app builds without initializing the database; Vercel generates its Linux client at install/build time.

GitHub publication used the authenticated connector because the local Git credential manager could not complete authentication. The Vercel project is linked to main for automatic deployments.

The Windows sandbox prevented the original tsx runner from reading operating-system user information. Tests now compile with TypeScript and run with Node's built-in test runner, and all pass without that dependency on user-info lookup.

## Social, photos and icon update (September 13, 2026)

- 12 unit tests pass, including website metadata selection, malformed metadata fallback, structured recipe extraction, photo validation and canonical friend pairs.
- Production build, lint and TypeScript checks passed for the social/photo release.
- Three synthetic accounts verified: crossed requests are rejected; senders/outsiders cannot accept requests; recipes stay private until shared; friends can read shares but cannot edit, delete or reshare the owner's recipe; outsiders cannot read them. Revocation and unfriend cascade cleanup passed.
- Photo API create/update/remove passed, including shared photo updates. Browser upload re-encoded a PNG to WebP and successfully rendered its preview without saving a user recipe.
- Live URL-to-Groq import of the regional Good Food Easy Pancakes page returned a validated recipe and its image URL. The generic BBC URL redirected to a regional homepage; that non-recipe source returned a recoverable error as expected.
- Friends page and photo editor rendered successfully in the live browser. Temporary test recipes and connections were removed; synthetic test accounts remain.
- Social and photo migrations were applied once in a transaction and recorded with matching Prisma checksums. No automatic migration build hook was added.
- SVG chef-hat favicon is available as src/app/icon.svg, with a reusable copy at public/recipe-buddy-icon.svg.
