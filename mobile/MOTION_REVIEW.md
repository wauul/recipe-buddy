# Android sign-in and motion pass

The sign-in and signup screens now use the existing chef logo at 80 dp and the centered 32 sp Recipe Buddy name. The hero illustration is removed. Controls use 24 dp side gutters and 16 dp gaps, with a 440 dp maximum form width. The keyboard/short-screen layout reduces the logo to 64 dp; French legal links wrap when text is enlarged.

Cold launches show the brand splash while preferences initialize, with a short 650 ms brand entrance. Activity restoration retains the launch state. Android 12+ uses the same icon and matching light/dark launch background.

Async ViewModel actions show an animated logo status pill without blocking touch or keyboard input. Existing photo processing, chef search, invite loading, purchase verification and Voice Chef loaders use the same logo. Status indicators stay visible for at least 400 ms to avoid flashing; operations never wait for that interval. Cooking progress and chef score bars remain determinate progress bars.

Shared buttons and clickable rows/cards ease to 96% on press. Root tabs crossfade; editor and search tasks rise, detail screens slide, and expanding panels resize smoothly. The system animator setting controls custom motion, including live changes; reduced motion leaves a static logo with the same accessible loading status.

## Verification

- Android debug build and 9 JVM unit tests passed.
- `NativeMotionTest` render/interaction check passed on the isolated `.motion` emulator install: English, French, light, dark, 150% body text, signup, splash and action loader.
- A separate motion check passed: moving logo pixels, button press/release feedback, preserved click behavior, and a static reduced-motion logo.
- Eight preview screenshots and one real cold-launch screenshot are in `test-results/motion-review/`; reviewed contact sheets are in its `sheets/` folder.
- Production sign-in/provider calls, all signed-in routes, and physical-device behavior were not retested in this pass. No Play release was submitted.

The `.motion` package is a render-only test install and uses no production account. The ordinary debug artifact is `mobile/dist/recipe-buddy-motion-debug.apk`.
