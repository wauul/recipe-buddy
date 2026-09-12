# Verification

## Passed locally

- Next.js production build: compiled, linted, type-checked and generated all routes successfully.
- TypeScript: no errors after the final URL-fetch and mobile-navigation changes.
- ESLint: no warnings or errors.
- Seven unit tests: ingredient normalization and fractions, ambiguous amounts, distinct cooking days, week/year boundaries, AI schema validation, password byte limits, and private URL address rejection.
- Browser: login page visibly rendered, signup link opened the signup form, and `/recipes` redirected an unauthenticated visitor to `/login`.
- HTTP: all nine protected recipe/shopping/settings method combinations returned 401 without a session.

## Not exercised against live services

No Neon connection string or Groq key was supplied. Account creation/login persistence, recipe CRUD persistence, cross-user ownership checks with real accounts, migration application, URL-to-Groq parsing, and account-backed dashboard/shopping interactions remain live smoke-test steps in README.md.

The local runtime is Windows ARM64, while Prisma 6's native Windows query engine targets x64. Use x64 Node.js 22 locally as documented. The app builds without initializing the database; Vercel generates its Linux client at install/build time.

No GitHub push or Vercel deployment was performed. README.md contains the requested step-by-step instructions.

The Windows sandbox prevented the original tsx runner from reading operating-system user information. Tests now compile with TypeScript and run with Node's built-in test runner, and all pass without that dependency on user-info lookup.
