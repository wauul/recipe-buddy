# Android sign-in and motion pass

The sign-in and signup screens now use the existing chef logo at 80 dp and the centered 32 sp Recipe Buddy name. The hero illustration is removed. Controls use 24 dp side gutters and 16 dp gaps, with a 440 dp maximum form width. The keyboard/short-screen layout reduces the logo to 64 dp; French legal links wrap when text is enlarged.

Cold launches show the brand splash while preferences initialize, with a short 650 ms brand entrance. Activity restoration retains the launch state. Android 12+ uses the same icon and matching light/dark launch background.

Actions that require the user to wait show an animated logo status pill without blocking touch or keyboard input. Background sync, local saves and queued changes stay quiet. The pill appears after 180 ms and remains visible for at least 400 ms to avoid flashing; operations never wait for those intervals. Its EN/FR copy is “Stirring the pot…” / “Ça mijote…”. Existing photo processing, chef search, invite loading, purchase verification and Voice Chef loaders use the same logo. Cooking progress and chef score bars remain determinate progress bars.

Shared buttons and clickable rows/cards ease to 96% on press. Root tabs crossfade; editor and search tasks rise, detail screens slide, and expanding panels resize smoothly. The system animator setting controls custom motion, including live changes; reduced motion leaves a static logo with the same accessible loading status.

## Verification

- Android debug build and 9 JVM unit tests passed.
- `NativeMotionTest` render/interaction check passed on the isolated `.motion` emulator install: English, French, light, dark, 150% body text, signup, splash and action loader.
- A separate motion check passed: moving logo pixels, button press/release feedback, preserved click behavior, and a static reduced-motion logo.
- Eight preview screenshots and one real cold-launch screenshot are in `test-results/motion-review/`; reviewed contact sheets are in its `sheets/` folder.
- Production sign-in/provider calls and all signed-in routes were not retested in the initial design pass. The subsequent 0.1.2 release passed both motion tests again, was published to Play internal testing and installed on the Samsung; see [RELEASE_0_1_2.md](RELEASE_0_1_2.md).

The `.motion` package is a render-only test install and uses no production account. The ordinary debug artifact is `mobile/dist/recipe-buddy-motion-debug.apk`.
