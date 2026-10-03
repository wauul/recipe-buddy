# First-version verification — 3 October 2026

- App unit suite: **65 passed** (`pnpm test`).
- Extension reader and worker suite: **6 passed** (`node --test extension/tests/*.test.cjs`).
- TypeScript and ESLint: passed with no warnings (`pnpm typecheck`, `pnpm lint`).
- JavaScript syntax and diff whitespace checks: passed.
- Optimized Next.js production compilation: passed in a separate test checkout against the local test environment, including the new `/import` route. This check used `next build` directly; it did not run production migration or recipe-repair scripts.
- Unpacked Manifest V3 extension: tested in extension-capable Chromium using Playwright. Seven browser scenarios passed: automatic metadata detection and badge; duplicate and multiple recipe handling; suggestions on/off; dismissal; email sign-in and draft handoff; real save plus database verification and reload; microdata, malformed metadata, URL fallback, dynamic metadata and invalid transfer recovery. No browser runtime errors occurred.
- Tests created one temporary chef per run in the isolated loopback `recipe_buddy_test` database, verified the saved original recipe, and removed that chef's data. No production account or production database was used.
- Popup, browser suggestion and editor renders were inspected, including the 390px editor and a check for horizontal overflow. Screenshots and the browser report are under `test-results/extension/` (ignored by Git).
- Complete metadata imports and saving the original were verified with the Groq key disabled. Automatic app translations remain pending without that key, as in the existing app.

Not yet verified: Chrome Web Store installation, real Google OAuth through the draft handoff (disabled in the local fixture), and recipe coverage across arbitrary publishers. Ingredient lines remain verbatim in the ingredient-name field; ambiguous yields need user review. See README for installation, permissions and limitations.

The ZIP at `test-results/recipe-buddy-extension.zip` contains the manifest, bundled local scripts/styles, popup and icons. Extract it and choose the extracted folder with **Load unpacked**, or load the repository's `extension/` folder directly. The store submission package is `extension/store/recipe-buddy-0.1.0.zip`, containing only runtime extension files.

## Store release preparation and live verification

- Isolated release checkout: 58 app tests and 6 extension tests passed; TypeScript, ESLint and Vercel production build passed. The release excludes unrelated native-app changes.
- Deployment `dpl_9S9umBUdZewHtPFcTtf3UXfT3qjM` was promoted to production on October 3, 2026. Public home, import, privacy, login callback and auth-session routes returned 200. The public privacy page includes the extension data-use section.
- A browser transfer on the canonical live app opened the signed-in editor with the supplied title, servings, ingredient and method. No recipe was saved to production. Screenshot: `test-results/extension/live-import-editor.png`.
- Store screenshots are opaque RGB at 1280x800, the small promo is 440x280, and the 128px store icon has a 96px mark with transparent padding.
- Chrome Web Store version 0.1.0 uploaded and submitted under Wauul, extension ID `elmaplfpfkofcjainecbadgaldhpjooh`, on October 3, 2026. Google confirmed receipt; status Pending review. Automatic publication after approval enabled. Screenshot: `test-results/chrome-store-submitted.png`. Store installation remains unverified until approval.
