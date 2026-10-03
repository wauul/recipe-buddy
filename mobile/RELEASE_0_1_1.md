# Android 0.1.1 (2) — 3 October 2026

Published to Recipe Buddy's existing **internal testing** track at **22:00 Europe/Paris**. Play Console confirms **Accessible aux testeurs internes**. This is an internal test release, not a production rollout or a completed financial/hardware acceptance test.

- Package: `com.recipebuddy.android`
- Version: `0.1.1`, versionCode `2`
- Release name: `0.1.1 (2) – Offline and kitchen UX`
- Backend: `https://recipe-buddy-wauul.vercel.app`
- Signing: existing protected upload key, with Play App Signing retained
- Bundle: local ignored `dist/recipe-buddy-0.1.1-2.aab`, 10,198,302 bytes
- SHA-256: `9D5853FE3598574D1769AE2CF5501FE315669D8F5A7D9D51D87CEFC12EA4FCAA`
- Implementation pushed to GitHub `main`: [8582a52487752a9de15ea3c5930941549e64d5cb](https://github.com/wauul/recipe-buddy/commit/8582a52487752a9de15ea3c5930941549e64d5cb)
- [Tester opt-in](https://play.google.com/apps/internaltest/4701127957731069301) uses the existing tester list.
- [Play release](https://play.google.com/console/u/1/developers/8530344199625899858/app/4972039956147003477/tracks/4701127957731069301/releases/2/details)

Release notes in **en-US** and **fr-FR** describe automatic offline account data and sync, saved bilingual recipes, cleaner recipe actions, prominent roast, automatic community updates, typed inputs, improved Voice Chef, invitations/name suggestions, and monthly/yearly Pro plans. See [PRODUCT_FIXES.md](PRODUCT_FIXES.md) for behavior and limitations.

Verification before delivery: backend typecheck and all **80** tests passed; browser-extension reader's **6** tests passed; Android signed `bundleRelease`, `lintRelease`, and all **9** release unit tests passed. Earlier verification of the same product changes passed **11** native instrumentation checks, offline process-death stage/recovery checks, and the isolated native backend integration groups. Credential-pattern scan and staged diff whitespace checks passed; no signing key, environment files, local properties, packaged APK/AAB or local review screenshots were pushed.

Play accepted the bundle and attached its R8 mapping. Its single nonblocking warning concerned missing native debug symbols from bundled native dependencies. Compatible device counts were unchanged. Live Digital Asset Links includes the configured signing fingerprints and the canonical package.

The browser upload and rollout completed through Codex's built-in browser. Brave's extension file-access setting was not changed. Local verification screenshot: `screenshots/product-fixes/12-play-internal-release-0.1.1.png` (intentionally ignored).

No real subscription purchase/restore/cancellation or Play-installed physical-device regression was executed as part of this release. The previously installed Samsung debug APK was preserved; a Play install uses the Play signing identity.
