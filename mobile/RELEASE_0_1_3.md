# Android 0.1.3 (4) — 4 October 2026

Published to existing Play internal testing at 18:53 Europe/Paris. Play Console confirms **Accessible aux testeurs internes**. [Release details](https://play.google.com/console/u/1/developers/8530344199625899858/app/4972039956147003477/tracks/4701127957731069301/releases/4/details).

Implementation commit `f5f8fcb` is pushed to GitHub `main`. The action loader now follows a dedicated user-wait state. Background refresh, local cached navigation and queued local changes stay quiet; a concurrent sync cannot clear feedback for an ongoing user request. Follow-up synchronization stops showing the action pill once the requested operation has completed. A 180 ms onset delay avoids flashes on quick actions. EN/FR loading copy is **Stirring the pot…** / **Ça mijote…**.

- Signed AAB: `mobile/dist/recipe-buddy-0.1.3-4.aab`; SHA-256 `ae7b7da00f7d1cdba5339f1784f1a6c61abd9e70a3308f6343cebdb78b78eca8`.
- Existing upload key and Play signing retained. ReTrace mapping attached, supported devices unchanged, existing nonblocking native-debug-symbol warning remains.
- Debug/release builds, release lint and 9 JVM release tests passed.
- Three NativeMotionTest checks passed on the physical Samsung using an isolated `.motion` package. Coverage includes silent background refresh, preserved foreground waiting during refresh, EN/FR layouts, the new loading copy, logo/press animation and reduced motion. The mock authentication request uses a local test server and no production account.
- Samsung SM-S918B updated in place to the ordinary direct debug build **0.1.3 (4)**. Installation and cold launch succeeded, existing app data retained, no current-process crash entries. Test packages were removed afterward.
- Screenshots saved locally in `test-results/release-0.1.3/`.

The phone update is direct-installed, not a Play-installed release verification. Paid billing and production provider authentication were not retested in this small follow-up.
