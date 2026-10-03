# Recipe Buddy Chrome extension

This Manifest V3 extension detects complete Recipe JSON-LD or Recipe microdata on HTTPS pages. It shows a dismissible **Add to Recipe Buddy** suggestion and a toolbar badge. The popup supports multiple recipes, a suggestions switch, and a URL-import fallback when metadata is absent.

## Install locally

1. Open `chrome://extensions` in desktop Chrome and enable **Developer mode**.
2. Click **Load unpacked** and choose this `extension` folder (the folder containing `manifest.json`).
3. Pin Recipe Buddy in Chrome's extensions menu. Reload any recipe tabs that were already open.
4. Open a recipe website and click **Add to Recipe Buddy**. Sign in to the app if needed, review the populated recipe, and click **Save recipe**.

The default live app address supports extension imports as of October 3, 2026. For local development, use **App connection** in the popup to set its address, for example `http://localhost:3000` (or the port printed by Next.js). This setting only changes the destination app; automatic detection still runs on HTTPS recipe websites.

## Behavior and limitations

- Complete structured recipes populate the existing editor without AI. Ingredients retain their original publisher lines in the ingredient-name field; quantities and units can be separated manually before saving. Ambiguous yields default to 2 servings, which the user can edit.
- No metadata: the popup can pass the page URL to the existing importer, which requires the app's AI configuration and may be blocked by the website.
- The extension uses the app's normal sign-in and save flow. A tab-local draft survives email or Google sign-in, then is consumed when the editor opens. It never reads cookies, passwords, or account tokens. Nothing is saved until the user clicks Save in the app.
- The recipe travels in a URL fragment (not a query string), which the import screen removes immediately. The extension does not keep browsing history or recipe drafts. Drafts briefly remain in app session storage during sign-in.
- Suggestions can be dismissed for the current page or turned off in the popup. The toolbar reader still works. Chrome's site-access controls can also restrict automatic detection to selected websites or on-click access.
- Detection runs locally; no AI calls or server page requests occur during browsing. Opening the popup may load the publisher's recipe image with no referrer. App analytics and recipe processing follow the app's existing behavior after import.
- Supports top-level HTTPS pages, dynamic metadata and client-side navigation, up to 20 recipes per page. Chrome internal pages, the Web Store, HTTP pages and embedded frames are unavailable. Malformed/incomplete/oversized metadata falls back to URL import rather than guessing missing ingredients or steps. Metadata linked exclusively through `@id` references is not resolved in this version.
- Desktop Chrome only. Version 0.1.0 has been submitted to the Chrome Web Store and is awaiting review.

## Permissions

`storage` saves only the suggestions preference and app address. `activeTab` and `scripting` let the popup inspect a page when clicked, including pages opened before installation. The HTTPS content-script match lets automatic detection run while browsing; Chrome can display a site-access warning for this. No `cookies`, `history`, `tabs`, notification, or cross-origin API permissions are requested.

## Checks

From the project root:

```sh
node --test extension/tests/*.test.cjs
pnpm test
pnpm typecheck
pnpm lint
```

Use a recipe page to verify detection, dismissal, popup selection, suggestions on/off, metadata inserted after load, sign-in handoff, editor review, and saving. Test fixtures and a browser smoke-test script live in `extension/tests/`. The browser smoke test refuses any database except the isolated local `recipe_buddy_test` database on port 55432, creates a temporary chef, saves through the real API, verifies persistence and reload, then removes its own data. It never uses the production database. It requires a running local app against that test database and Playwright (or `PLAYWRIGHT_MODULE` pointing to a bundled runtime). `EXTENSION_TEST_BROWSER` can specify an extension-capable Chromium executable.

Official references: [content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts), [activeTab](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab), [Recipe metadata](https://schema.org/Recipe).

## Chrome Web Store release

The upload package is `extension/store/recipe-buddy-0.1.0.zip`. Listing text, permission disclosures and reviewer instructions are in `extension/store/listing.md`; store images are in `extension/store/assets/`. Version 0.1.0 was submitted under publisher Wauul on October 3, 2026 (extension ID `elmaplfpfkofcjainecbadgaldhpjooh`). Google review is pending; automatic publication after approval is enabled.
