# Android 0.1.2 (3) — 4 October 2026

Published to the existing **internal testing** track at 18:39 Europe/Paris. Play Console confirms **Accessible aux testeurs internes**. No production-track rollout was requested.

- [Release details](https://play.google.com/console/u/1/developers/8530344199625899858/app/4972039956147003477/tracks/4701127957731069301/releases/3/details)
- [Tester opt-in](https://play.google.com/apps/internaltest/4701127957731069301)
- Implementation commit: `9a3d6b8b772e8b317448fd38626e1ea71a4b362b`, pushed to GitHub `main`.
- Shared backend deployment: `7Qjq6Nk4AEYcQKe38JDv94DkCzPJ`, Ready / Production / Current at `https://recipe-buddy-wauul.vercel.app`.

This update prepares imported recipes in English and French while preserving original EN/FR fields, normalizes multilingual cooking measurements, removes configurable backend inputs from Android and the extension, and adds the centered sign-in branding, splash, animated logo loaders and shared motion. Unfinished connected-meals work was excluded using an isolated release checkout.

## Build and verification

- Signed AAB: `mobile/dist/recipe-buddy-0.1.2-3.aab` (ignored build artifact).
- SHA-256: `421745bd17f3e7c98000a2d52623b1959ef0cd6730c59169ab9e7293cc14f0a1`.
- Existing protected upload key and Play App Signing retained. ReTrace mapping attached automatically. Play reports unchanged supported-device counts and one nonblocking native-debug-symbol warning.
- 85 backend tests and 6 extension tests passed; type checking, lint and Git whitespace checks passed.
- Android debug/release builds, release lint, and 9 JVM tests in each build variant passed.
- Both NativeMotionTest checks passed on the isolated `.motion` emulator package, including EN/FR, light/dark, large text, moving logo, press feedback and reduced motion.
- Production `/login` responds 200. An unauthenticated native `/api/native/v1/me` request correctly responds 401.

## Samsung installation

The connected Samsung SM-S918B was updated in place from the direct-installed 0.1.0 debug build to **0.1.2 (3)** with the matching existing debug certificate. `adb install -r` succeeded; the cold activity launch returned `Status: ok`. Account and shopping data remained available and the current process had no crash-buffer entries.

This phone install is the direct debug build using the same production backend. It is not a Play-installed signed-build verification. Production Google sign-in, paid billing and every recipe workflow were not retested in this release pass.

Play publication and phone screenshots are saved locally under `test-results/release-0.1.2/`.
