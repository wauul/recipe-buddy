# Chrome Web Store listing

Name: Recipe Buddy — Save recipes

Summary: Find recipes while browsing and add them to your Recipe Buddy collection.

Language: English

Category: Lifestyle > Home (Maison in the French dashboard).

Distribution: Public, free, all supported regions. Desktop Chrome only.

Homepage: https://recipe-buddy-wauul.vercel.app/

Support: https://recipe-buddy-wauul.vercel.app/help#contact

Privacy policy: https://recipe-buddy-wauul.vercel.app/privacy#browser-extension

## Detailed description

Save a recipe when you find it, with Recipe Buddy.

Browse recipe websites as usual. When Recipe Buddy finds a complete recipe, a small, dismissible prompt offers to add it to your collection. Click Add to Recipe Buddy, review the recipe in the app, and save it to your account.

• Detects recipe titles, ingredients, instructions, servings and available photos.
• Offers a choice when a page contains more than one recipe.
• Keeps the original ingredient wording for review; separate quantities and units in the editor when needed.
• Lets you dismiss a suggestion or turn automatic suggestions off.
• Offers the app’s URL importer for pages without readable recipe metadata.
• Uses your normal Recipe Buddy sign-in, including a draft handoff through sign-in.

Recipe detection takes place in your browser. A recipe and its source page URL are sent to Recipe Buddy only after you click Add. The extension does not record browsing history, read your passwords or session cookies, or automatically save recipes. Opening the popup may load the publisher’s recipe image. The Recipe Buddy app has its own account, hosting and recipe-processing practices, explained in our privacy policy.

A Recipe Buddy account is required to save recipes. Create an account in the app at https://recipe-buddy-wauul.vercel.app/.

Some publishers do not provide complete recipe metadata. Their pages may need the app’s URL importer or manual entry, and automated URL imports may be blocked by the publisher. Review servings and ingredient quantities before saving. Chrome internal pages, embedded frames and HTTP pages are not supported.

## Single purpose

Identify recipes on the user’s current recipe webpage and let the user import a selected recipe into their Recipe Buddy collection.

## Permission justifications

- storage: Stores only the automatic-suggestions preference and the Recipe Buddy app origin chosen by the user. No history or account credentials are stored by the extension.
- activeTab: Lets the popup inspect the currently active webpage when the user invokes the extension, including tabs opened before installation or sites where automatic site access is restricted.
- scripting: Injects the bundled local recipe reader after the user invokes the popup if that page does not already have the content script.
- HTTPS content-script match (`https://*/*`): Enables automatic recipe detection on arbitrary HTTPS recipe publishers, rather than a fixed list of websites. Reading and detection happen locally. The selected recipe and source URL are transmitted to the app only after an explicit Add action.
- Remote code: No. All executable extension code is included in the uploaded package; no remotely hosted scripts or executable code are loaded.

## Data-use disclosures

Declare website content and the source webpage URL / web-history category conservatively. The extension handles the current page’s recipe text, title, image URL, source URL and recipe servings solely for the requested import. It does not collect a browsing-history log, timestamps, unrelated page contents or interaction telemetry. Keep the exact dashboard disclosures consistent with these practices and the public privacy policy.

No extension collection of personally identifying information, health information, financial information, authentication information, personal communications, location, or user activity telemetry. The separate app handles sign-in and account data as described in its privacy policy.

Certifications: Data is not sold, not transferred for unrelated purposes, and not used to determine creditworthiness or for lending purposes.

## Reviewer instructions

1. Install the submitted extension and allow site access for a public HTTPS recipe page.
2. Visit a publisher page with complete Recipe JSON-LD or Recipe microdata. A toolbar count and dismissible Add prompt appear. Incomplete or missing metadata produces no automatic prompt; open the popup to try URL import instead.
3. Open the popup and select a recipe if there is more than one. Toggle automatic suggestions off and on. Dismiss a prompt and confirm it stays dismissed on that page.
4. Click Add to Recipe Buddy. If needed, create a free email/password account in the app, or use Google sign-in. The draft survives sign-in in the same tab.
5. Review the editor. Ingredient lines retain publisher wording; quantities and units may need separating. Ambiguous yields default to 2 servings. Change the title to identify the review test if desired.
6. Click Save recipe, then reload the saved recipe. Delete that test recipe afterward through the app.

Complete structured imports do not require an AI extraction request. URL fallback depends on the app’s AI configuration and publisher access. Saving may prepare the app’s English/French recipe versions. No private test credentials are needed; ordinary free signup is available.

## Submission status

Submitted to the Chrome Web Store on October 3, 2026 at approximately 13:55 Europe/Paris under publisher Wauul. Version 0.1.0, extension ID `elmaplfpfkofcjainecbadgaldhpjooh`. Google confirmed receipt and the dashboard shows Pending review (En attente d'examen). Automatic publication after approval is enabled; distribution is free, public, and all supported regions. It is not publicly installable until Google approves it. Broad HTTPS access for automatic detection may require additional review time.

Dashboard: https://chrome.google.com/u/1/webstore/devconsole/5684b4d1-782e-472d-93a2-7a35af14aa87/elmaplfpfkofcjainecbadgaldhpjooh/edit/status

Upload ZIP SHA256: `00572C990E476C2B1F58285665E2B77C97BE84571BE8E7940B7F4DCB32AF964B`.

The app import route and privacy disclosures are live at https://recipe-buddy-wauul.vercel.app (deployment `dpl_9S9umBUdZewHtPFcTtf3UXfT3qjM`). Store listing, two screenshots, store icon, small promotional tile, permissions, data disclosures, and reviewer instructions were saved before submission. Reviewer access uses ordinary free signup; no private account credentials were supplied. Local proof: `test-results/chrome-store-submitted.png`.

Official requirements: https://developer.chrome.com/docs/webstore/publish/ and https://developer.chrome.com/docs/webstore/images
