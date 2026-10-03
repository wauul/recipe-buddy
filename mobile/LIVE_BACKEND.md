# Live Android backend — 2026-10-03

Android now uses the website's existing production backend and database at https://recipe-buddy-wauul.vercel.app. The installed debug APK does not require the local server or USB reverse. Sign in with an existing web account; disposable local fixture accounts are not production accounts.

## Deployment

- Vercel project `recipe-buddy` / `prj_d20mZe2owofC1MICIGEW5SkCr3F5`, deployment `dpl_22vsmbbTzZAJHa4Pvm9LbQ2p4cu4`, https://recipe-buddy-gqp056ckl-wauuls-projects.vercel.app. Built with production settings, probed before promotion, then promoted to the existing canonical domain.
- Neon project `gentle-bread-94796146`, production branch `br-restless-pond-aexb6kwm`. Existing eight migrations were completed; only `20261003000000_native` and `20261003010000_publication_controls` were applied with `prisma migrate deploy`.
- Pre-migration rollback branch `before-native-2026-10-03` / `br-rough-darkness-aeo9nfjm`, without compute, expires 2026-10-10 18:00 Europe/Paris. Existing production history and authored recipes were preserved; language repair changed zero rows.
- Existing database, NextAuth, Google web credentials and Groq settings were retained. Added independent native-session and cron secrets, the registered Google Web audience and actual debug certificate SHA-256. Vision remains disabled.
- Daily privacy maintenance is deployed at 03:00 UTC. Vercel metadata confirms the cron definition; an authenticated live check returns 200. The first local probe used a malformed local secret-file line and returned 401; normalizing that ignored file resolved it without changing server secrets.
- `.vercelignore` excludes environment files, local build/test output and native workspace from website uploads. Credentials remain in Vercel and ignored local release files; none are in the APK or source.

## Verified

- Remote Next 15.5.27 build, lint/type validation and promotion pass. Android production-URL debug build, seven unit tests and debug lint pass; APK installed on Samsung SM-S918B / Android 16.
- Canonical home, privacy, terms, external deletion and assetlinks routes return 200. Unauthenticated native me returns JSON 401; mobile Google setup issues a nonce/attempt with the registered audience.
- `scripts/verify-live-native.ts` used a unique temporary account: signup, native login/terms, account/collection/detail reads and NextAuth browser-cookie login pass. Web and native APIs return the exact same temporary recipe ID. The test recipe was directly seeded to avoid save-time model calls.
- `NativeLiveBackendTest` passes on the phone in 14.11 s: live password session, collection and recipe detail. USB reverse for port 3002 was removed before the run. Screenshot: `screenshots/native-verification/60-live-backend-detail.png` (temporary content only).
- The temporary account, recipe and sessions were removed through authenticated account deletion; a stale token is rejected. Original totals remain 17 accounts and 5 recipes. No paid model calls or real-user content modifications.
- Google's Digital Asset Links API recognizes the exact package/debug certificate from the live host. After resetting the earlier cached verifier error and requesting verification again, Samsung `pm get-app-links` reports the canonical domain **verified**. This establishes the current debug certificate association; Play signing must be registered separately.

## Remaining publication checks

Personal Google consent/token exchange, spoken microphone commands, optional real recognition, notification/accessibility checks and Play-installed signed builds remain separate checks. No Play submission or iOS release occurred. Upload/Play certificates must be registered independently; the current APK uses the existing debug certificate. PUBLICATION.md remains the store/operator checklist, with this document superseding its earlier undeployed-backend status.
