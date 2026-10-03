# Native Google sign-in

Registered on 2026-10-03 in the existing Google Cloud project `recipe-buddy-510215`.

| Configuration | Verified value |
| --- | --- |
| Android client name | Recipe Buddy Android Debug |
| Package | `com.recipebuddy.android` |
| Debug signing SHA-1 | `37:4B:05:74:A5:AA:4D:80:DC:00:CA:BF:5B:15:39:81:AA:98:CF:F2` |
| Android OAuth client ID | `937046985935-c83897or05oplincuj40041pgt3cqrtj.apps.googleusercontent.com` |
| Existing Web client ID (token audience) | `937046985935-rr9mg53ap3qbdc4ncqm8jf7ns1vmu0si.apps.googleusercontent.com` |

These are public identifiers, not secrets. The Web client secret was neither retrieved nor changed. No new Google scopes, billing, store publication or production deployment was enabled. See `screenshots/google-registration.jpg` for the saved client list.

Android's Google button uses Credential Manager's `GetSignInWithGoogleOption` and a server-generated single-use nonce. It never opens the website's Google sign-in page. The server checks Google's signature/JWKS, RS256, issuer, configured Web client audience, expiry, recent issue time, nonce and verified email. It binds an existing Google subject first; new subject linking follows the website's verified-email policy, preserving the existing chef ID, password, recipes and preferences. The Google ID token is never logged or persisted. The resulting Recipe Buddy session uses the existing native Keystore storage and refresh rotation. Sign-out clears Credential Manager state as well as app data.

Server configuration: `NATIVE_GOOGLE_WEB_CLIENT_ID=<Web client ID above>`; `GOOGLE_CLIENT_ID` is accepted as a fallback. The Android client ID is **not** the token audience. The ignored local `.env.native-test` has this public Web client ID. No secret is required for native ID-token verification. Password account creation is now a native form using the same signup API; the optional browser connection path retains the separate NextAuth web setup.

Google Cloud may take minutes to propagate a newly registered client. Native routes and migrations are deployed with user authorization to the existing website; Google nonce/audience setup passes live checks. A release/Play APK has a different signing certificate: register an additional Android client using the actual Play app-signing SHA-1 before distributing that build; do not substitute the debug fingerprint. Inspect with `gradlew :app:signingReport`. See LIVE_BACKEND.md for deployment proof.

References: [Credential Manager Google sign-in](https://developer.android.com/identity/sign-in/credential-manager-siwg-implementation), [Google backend token validation](https://developers.google.com/identity/sign-in/android/backend-auth), [registered clients](https://console.cloud.google.com/auth/clients?project=recipe-buddy-510215).

Physical-device check: on the Samsung SM-S918B / Android 16, the Google button opened the Google Play services native account picker. Cancelling returned to Recipe Buddy without an error or app session. No personal Google identity was selected, and the account list was not recorded. A real signed-token sign-in/consent remains a user check; the automated suite validates the nonce/verified-email claim boundary separately.
