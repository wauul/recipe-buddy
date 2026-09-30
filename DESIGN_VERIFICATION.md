# Redesign verification

## Scope and environment

Reviewed the original implementation and running app before edits. Revised the entire interface around Kitchen Index, retaining the original cream/sage palette and dark forest theme. Existing routes, recipe payloads and ownership rules remain. The user subsequently requested Google chef accounts and combined recipe/review levels; this extension adds the standard NextAuth Prisma adapter, OAuth identity tables, a reviews table and reviews endpoints. Existing password hashes remain intact. The additive migration is prepared but has not been applied.

Browser: installed Microsoft Edge via Playwright and agent-browser. Local app: `http://localhost:54873`. Authenticated UI was exercised using a temporary development-only route with illustrative recipe/friend data and mocked API responses. Help/search fixtures reproduce their server-rendered markup; protected server queries were reviewed in source. The fixture route is removed from the application before the production build.

## Browser batch

- 15 screen/state variants × 3 viewport sizes × 2 themes = **90 accessibility/layout checks**. Screens: login, signup, collection, new recipe, edit recipe, owned detail, shared detail, shopping, friends, settings, help, search, 404, loading and error.
- Viewports: 1440×1000, 768×1024, 390×844. Additional empty collection/detail/shopping/friends/search states in every viewport/theme: **30 checks**.
- Final batch: **zero axe WCAG 2 A/AA and WCAG 2.1 AA violations**, zero page-level JavaScript errors, no document horizontal overflow. This automated result complements manual screenshots and keyboard checks; it is not a blanket accessibility certification.
- **98 interaction assertions** across desktop/tablet/phone and both themes: password visibility/rejected credentials, vibe/search/reset, error-summary focus, ingredient/step additions/removals, photo validation/compression/removal, import/save failure preservation, cooked feedback, deletion dialog Escape/focus return, sharing revocation, twists/comments, shopping generation/completion/storage/reset, invitation failure/success/accept/removal cancellation, username/roast updates, persisted and live-system theme switching, FAQ, mobile account/search keyboard behavior, cookie notice sizing/dismissal and browser errors.
- **36 additional targeted assertions** at phone/desktop in both themes: signup failure, shopping failure, username/roast failure, cook/share/comment recovery, import success, saving disabled state, original create/edit API payloads, friend removal confirmation, clipboard success, and accessibility of the final collection layout.
- **20 enlarged-text checks**: five core screens at 320, 390, 768 and 1440px with root text enlarged to 200%. No final document overflow. Corrected the 320px dinner-action layout found during this pass.
- Normal motion creates cooking steam and feedback animations. Reduced-motion mode reports **zero running animations**. Print hides navigation and renders black body text on white.

Screenshots, JSON results and local verification scripts are retained in the ignored `test-results/design-review-2026-09-30` directory. Full-page screenshots place fixed mobile navigation at the initial viewport's lower edge; subsequent content is reached by normal scrolling. The recipe photograph in these screenshots is illustrative fixture data.

## Corrections from verification

Fixed cookie text being obscured by the sidebar, a weekly status label on a generic span, a keyboard-inaccessible scrollable code sample, missed pre-hydration broken-image fallback, a signup label that included helper text, and enlarged-text overflow in the dinner action. Form errors link to individual fields; dialog dismissal restores the trigger's focus. Settings errors are separated from success notices.

## Repository checks

- All 25 domain/security/validation tests pass: the original 20 plus five covering chef thresholds, combined scoring/recalculation, apron validation and identity stripping, verified Google profiles, chef names and account-collision recovery copy.
- TypeScript, ESLint and production build are checked after removing review fixtures. TypeScript and ESLint passed without errors/warnings; `pnpm build` compiled, generated its pages and completed tracing successfully. The route table contains no review fixture route.
- Built production login/signup screens: 8 viewport/theme accessibility and layout checks passed, root redirect to `/recipes` verified, and the removed fixture returns 404. Protected production execution was not certified without authentication/database configuration. The final local preview runs in development mode.
- The only new runtime dependency is `@next-auth/prisma-adapter@1.0.7`, with its lockfile entry. Fonts are self-hosted WOFF2 with accompanying licenses. No registry UI package was added.

## Limits

No local Postgres credentials, Google OAuth client credentials or Groq key were provided. Browser interactions verify real components, request contracts and simulated responses; they do not verify live Google consent/account creation/linking, database CRUD/reviews/score queries, invitation delivery, permission revocation in Postgres, or AI extraction. Existing tests exercise the relevant policy/validation helpers. Real authenticated server routes and integrations require the environment values documented in `.env.example`.

The initial verification above preceded publishing. The user subsequently authorized release by pushing to GitHub `main`, using the existing Vercel Git deployment.

## Chef feature verification

After adding chef accounts, levels, artwork and apron reviews, repeated the 90-screen accessibility batch and 30 empty/layout checks: zero axe violations, page errors or horizontal overflow. The original 98 interaction assertions and 36 targeted assertions passed with updated chef terminology.

An additional **131 checks** exercise the extension:

- 60 accessibility/layout checks (10 screen/state variants × 3 viewport sizes × both themes): collection/empty, levels 1 and 7, 64-character chef names, shared/owned reviews, and Google login/signup. All pass with zero axe WCAG 2 A/AA and 2.1 AA violations, zero page errors and no horizontal overflow. Settings checks expand the full seven-badge gallery.
- 12 checks with text enlarged to 200% across 320/390/768/1440px: top-level gallery with a long name, shared reviews with a long name, and Google signup. No final overflow.
- 52 interaction assertions at 390/1440px in both themes: missing-rating focus, native keyboard radio selection and visible focus, denied-save preservation, busy/save payload/display, update without duplicate reviews, withdrawal failure/recovery, no self-review form, Google pending/failure recovery, collection and Settings callback requests, keyboard gallery disclosure, and no page errors.
- 6 checks of real login error-query handling for existing-password-account collision recovery.
- 1 motion check: normal mode has active animations; reduced-motion mode has none.

Fixed the long-name review grid overflow observed on tablet/phone and at 200% text, wrapped contribution names at the shared source, and made the seven-level gallery expandable so account preferences stay within reach on phones. Rating validation moves focus to the first native radio and associates the error with the group’s controls. Google pending disables the email form until navigation or failure recovery.

Mocked NextAuth provider/CSRF/sign-in responses verify client button behavior, requested callbacks and error recovery. They do not perform a real Google authorization or prove persistent account linkage. Mocked review responses verify request contracts and UI state; they do not certify Postgres transaction behavior. Protected server queries, the adapter linkage implementation, the bound share-row lock and the additive SQL constraints were reviewed in source. `prisma validate` and client generation pass without connecting to a database.

New evidence is retained as `chef-check.cjs`, `chef-results.json` and `chef-*.png` under the ignored review directory. Reusable fixture sources are archived as `.template` files; the application fixture route is removed before the final build. Setup and real-integration smoke tests are in `GOOGLE_AUTH_SETUP.md`.

## Landing and motion follow-up

The generated authentication photograph and chef journey painting were removed from the UI and public assets. The new public `/` page uses a simple inline plate illustration, an open three-step workflow, seven chef badges, and real signup/login links. Authentication uses a numbered text index. Chef progress uses a line illustration. Added landing scroll reveals, page entrances, press feedback, fork/herb movement and badge animation; all honor reduced motion.

The new `landing-check.cjs` batch passed 24 public screens at 320/390/768/1440px in light/dark themes, with zero axe violations, page errors or overflow. All 24 also fit at 200% root text size. Sixteen assertions checked normal animation, anchor/scroll reveals, signup/home navigation, live and initial reduced-motion behavior, and keyboard skip links. Manual screenshots were inspected on phone and desktop. The existing 131 chef checks passed again after replacing the artwork and adding the kitchen page template.

Four release-helper tests bring the unit suite to 29. They verify local/preview builds never access a database, already completed migrations are skipped, unexpected history/SQL changes fail before DDL, and the exact additive SQL runs in one transaction with migration-history registration. These use isolated Prisma mocks; actual migration execution is established by Vercel production build logs after pushing.

Final checks passed: TypeScript, ESLint with no warnings, all 29 tests, and the optimized production build. Sixteen built public viewport/theme checks passed for landing/login/signup/privacy, with no accessibility violations, page errors or overflow; the removed review fixture returns 404. A public `/privacy` page and links from the homepage/auth forms complete Google's production consent configuration. The dedicated OAuth client is in production mode, and both Vercel production secret variables were created with explicit user authorization. Actual Google consent and authenticated persistence are checked after the live deployment.
