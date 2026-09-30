# Kitchen Index

## Product and audience

Recipe Buddy is a private recipe collection with imports, cooking activity, shopping lists and explicit friend sharing. Assumed audience: everyday home cooks revisiting recipes on a phone at the grocery store or beside the stove. Tasks and product facts are confirmed by source; audience/use scene are inferred from those tasks. Preserve all route names, API payloads, authorization rules, persisted preferences, original chef-hat asset and optional roast behavior.

## Audit and art directions

The incumbent uses cream/sage, Georgia/Arial, small uppercase labels, emoji food illustrations, multiple decorative arrows, repeated bordered panels and forced food jokes. Existing strengths: direct recipe navigation, native forms/dialogs, privacy checks, system/persistent theme selection, print layout, reduced-motion support. These remain. The user explicitly asked to retain the original color palette; cream/sage and the existing dark forest colors are preserved throughout. Secondary text and control borders use darker shades of the same palette for accessible contrast.

Three distinct directions were evaluated:

1. **Kitchen Index (chosen):** a useful digital recipe file. Bold Bricolage Grotesque headings, readable Source Sans 3 interface, the original cream `#faf9f5`, forest `#293c30`, and green `#396449` palette. Tabbed collection items, measured ingredient rows, numbered steps. Precise but friendly, useful in a working kitchen. Expressive cooking illustrations and responsive motion, denser task surfaces, generous section separation.
2. **Supper Club:** people and conversation lead. Circular portraits, shared-recipe stream, wide communal-table compositions, rounded sans typography, cobalt `#254fbd`, apricot `#f3b58b`, porcelain `#fffdf9`. More social than this product's private collection focus.
3. **Prep Bench:** cooking workflow leads. Compact split-pane lists, measurement typography, steel `#dce2e4`, graphite `#20272b`, citrus `#c9db56`; precise line icons and step transitions. Effective but too utilitarian for casual recipe discovery.

Kitchen Index makes the recipe itself the recognizable object. The tab on collection tiles and navigation, ruled ingredient rows with right-aligned quantities, and step numerals recur only where their function warrants it. There are no decorative eyebrows, fake metrics or invented capabilities. Authentication is text-first, with a numbered kitchen index. Simple inline kitchen drawings introduce the product and chef progress; stored recipes never receive an invented dish photo.

## Tokens and rules

| Role              | Light     | Dark      |
| ----------------- | --------- | --------- |
| Canvas            | `#faf9f5` | `#131c18` |
| Surface           | `#fffefb` | `#1d2922` |
| Secondary surface | `#ecefe3` | `#26362b` |
| Text              | `#293c30` | `#ecf0e5` |
| Secondary text    | `#626b5c` | `#b1bdad` |
| Control border    | `#858d7b` | `#7d9176` |
| Divider           | `#e6e7df` | `#354437` |
| Accent            | `#396449` | `#85b67b` |
| On accent         | `#ffffff` | `#122114` |
| Accent wash       | `#e4ebdf` | `#293d2b` |
| Success           | `#396449` | `#cbe2bc` |
| Error             | `#a83f37` | `#ffd4c4` |
| Focus             | `#a56824` | `#d99b4e` |

- Self-hosted variable fonts; Bricolage headings (600–700), Source Sans 3 body/controls (400–600). Body 16px/1.55, helper text at least 13px. Fixed rem hierarchy on operational screens, responsive editorial scale only on auth.
- Spacing scale 4/8/12/16/24/32/48/64px. Main content maximum 1320px, editor 900px. 24–48px desktop gutters, 20px phone gutters.
- Controls 44px minimum hit area, 6px radius. Recipe tiles 12px, panels 12px when containment is needed; routine content uses open sections/dividers. Pills only for small category indicators and the actual switch.
- One Lucide icon family, 1.75 stroke. Preserve existing chef-hat logo/favicon. Avoid decorative arrows/emojis; back/disclosure indicators remain.
- Hover/active/focus/disabled/selected/loading/error/success states use semantic tokens. Native selects retain platform behavior, with branded options and progressive `::picker(select)` styling where supported. File picker retains native keyboard/mobile access.
- Dialogs are native modal dialogs, focus Cancel initially, Escape/cancel restore focus, destructive copy explains scope. Success is a visible status region; errors say what happened and how to recover.
- Motion: 160–250ms control/menu feedback, 300ms page entrances, 360ms staggered collection entrances, gentle illustrated steam, fork/herb movement, checkmark pops and progress easing. Landing sections reveal as they enter the viewport; content remains visible without JavaScript and with reduced motion. Original pot/toaster/cloche/wok illustrations distinguish recipe categories. Reduced motion disables every animation, zoom, hover displacement and celebratory effect. Theme bootstrap before paint; persistent light/dark/system selection.
- Mobile: compact header, five-destination bottom navigation for signed-in surfaces, menu for account actions, horizontal category scrolling, two-column ingredient entry, single-column recipe content and sticky-free forms. Content reserves bottom-nav space and safe areas.
- Voice: helpful, specific, lightly conversational. Use “recipe”, “friend”, “share”, “twist”, “comment”, “chef”, “chef name” consistently. Short headings/buttons have no decorative punctuation. Preserve factual instructions and optional roast content.

## Source guidance and component references

- [Taste](https://github.com/Leonxlnx/taste-skill): applied redesign audit, typography/shape consistency and auth composition. Its generic marketing hero defaults do not govern operational screens.
- [Impeccable](https://github.com/pbakaus/impeccable): applied Operate/Read guidance, craft floor, complete control states and bounded browser verification. Runtime launcher unavailable; source instructions read directly. The user's instruction to infer context and choose without approval supersedes the source's decision-board/approval workflow.
- [UI/UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill): ran the recipe-organizer design-system search, read accessibility/touch/responsive guidance. The returned claymorphism/hero recommendation is not a fit for this task-oriented app and was declined; accessibility mechanics were retained.
- [21st breadcrumb reference](https://21st.dev/community/components/base-ui/breadcrumb-1/breadcrumb-with-background) and upload patterns informed semantic navigation and status layout. No third-party component code copied and no registry dependency added; existing native controls were adapted. The timeline upload reference currently returns Component Not Found.
- [UI tools directory](https://github.com/maxbogo/awesome-ai-tools-for-ui): reviewed selectively; used the above available guidance and browser tools rather than installing unrelated services.

## Whole-product coverage checklist

- [x] `/` public landing, product workflow, seven chef badges, signup/login links, metadata, theme/header/cookie notice
- [x] `/login`, `/signup`, password visibility, validation and errors
- [x] `/privacy`, actual account/Google/recipe/AI/browser data practices, linked from homepage and authentication
- [x] Signed-in layout/navigation: desktop, tablet, mobile
- [x] `/recipes`: dense collection, filtering, empty/no-match, weekly activity, shuffle
- [x] `/recipes/new`, `/recipes/[id]/edit`: all form/input/select/upload/import states
- [x] `/recipes/[id]`: photo/fallback, ingredients/method, cooked/delete states, sharing and discussion
- [x] `/shared/[id]`: permission context, current attribution, twists/comments
- [x] `/shopping-list`: recipe selection, generation, checkmarks, progress, empty/error/success
- [x] `/friends`: incoming/outgoing/accepted, invitations, removal dialog, shared collection
- [x] `/settings`: chef name, success/error, roast switch; theme override, Google connection and chef levels
- [x] `/search`: form, owned/shared/help results, empty/no-match
- [x] `/help`: FAQ disclosure, contact, clipboard example
- [x] Loading skeleton, error recovery, 404, disabled controls, print
- [x] Both themes, responsive widths, keyboard/focus, contrast, text resizing, reduced motion, overflow, console

Checks above mean implementation and browser coverage, including local fixtures for authenticated UI. They do not certify live database or AI operations. See `DESIGN_VERIFICATION.md` for exact evidence and limitations.

## Chef community extension

The user extended the redesign with Google signup, chef terminology and one combined seven-level progression system. Existing recipe, friendship and discussion contracts remain; new OAuth account and review models/API routes support the requested features. Google activation needs server credentials and the prepared migration.

Progress uses current saved recipes × 10 + received apron total × 2. Levels: Toast Rookie (0), Whisk Whisperer (30), Pan Wrangler (80), Sauce Sorcerer (180), Flavor Alchemist (350), Feast Maestro (650), Apron Legend (1,100). A chef receives one editable 1–5 apron review from each other chef on a recipe explicitly shared with them. Owners cannot self-review. Recipe deletion and review changes recalculate the score; ended shares retain past reviews.

Signature artwork extends the same kitchen vocabulary: simple plate/pot line drawings, seven stitched SVG badges (toast, whisk/bowl, frying pan, saucepan, mortar/herbs, cloche, apron), and a five-apron native radio control. The generated photograph and painted kitchen scene were removed. The seven-level gallery uses a native expandable disclosure so mobile account controls stay within reach. Current badges gently float, rating selection pops, progress eases, and content enters on navigation. All motion and hover displacement are disabled with reduced motion. Google uses its recognizable G mark and a plain outlined button, with clear busy, unavailable and failure states.

Additional coverage: Google login/signup and existing-account recovery copy; Google connection; collection/profile levels 1–7; maximum and empty progression; long chef names; apron review creation, edit, withdrawal, denied save and owner permissions. Live Google/database integration remains an explicit follow-up after configuration.

## Language and account-linking follow-up

The header has a compact EN/FR native selector, repeated with full language names in Settings. The original palette and motion preferences apply in both languages. Server rendering reads the saved language cookie and the document language is updated when switching. French content preserves the friendly kitchen tone, including the seven chef ranks. Stored recipe originals stay unchanged, while displayed recipes and kitchen contributions follow the selected language through Groq translations. The original/translation toggle offers a quick comparison. The login now uses a calm split layout inspired by Hooka Relay, with simple line icons, soft motion and a compact form; phone screens focus on sign-in. Verified Google emails now automatically connect to the matching password chef, as explicitly requested, keeping the stable chef ID and collection.
