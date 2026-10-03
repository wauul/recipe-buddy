# Android visual assets

## Ingredient editorial photograph

Final workspace path: `android/app/src/main/res/drawable-nodpi/ingredients_hero.png`.

Created with the built-in `image_gen` tool on 2026-10-03. Copied unchanged into the project from its generated-image output; no separate API key, paid vision-provider call, or remote runtime image dependency. Used as decorative photography on the Ingredients entry point and sign-in screen. It is never inserted as the photo of an existing saved recipe. Selecting a photo replaces it with the user's actual re-encoded image.

Final generation prompt:

> Create one production asset for Recipe Buddy's native Android Ingredients screen. A photorealistic editorial overhead still-life of fresh ingredients for a simple home meal: red vine tomatoes, leafy basil, a few eggs, a ceramic bowl of uncooked rice, and a small wooden chopping board on a warm cream linen and light stone surface. Soft natural daylight, appetizing tactile real food, quiet cream and forest-green palette with tomato red accents. Landscape composition approximately 3:2, ingredients arranged naturally and generously occupying the image, no people, no labels, no text, no typography, no logo, no UI, no collage or borders. This is decorative ingredient photography, not a picture of any saved user recipe. Make it feel like premium contemporary cooking app editorial photography. Output the image asset.

## Existing web identity

`kitchen_cozy.xml`, `kitchen_lazy.xml`, `kitchen_fancy.xml` and `kitchen_chaotic.xml` reuse the original paths from `src/components/cooking-illustration.tsx`: saucepan, toaster, serving cloche and wok. These are category illustrations for recipes without photos. They use semantic illustration line/fill resources and cream/sage/warm category backdrops. Actual recipe photos always render when present. The chef-hat logo, adaptive launcher icon, licensed Bricolage font and Google mark are retained.

Ingredients navigation now uses Material's outlined/filled `Eco` leaf icon, preserving the app's shared icon family and selected-state convention.

`scripts/sync-native-content.tsx` renders the original web `ChefBadge` and `ApronIcon` components into Android vector drawables (`chef_badge_1` through `chef_badge_7`, `apron`, `apron_filled`). Nested SVG transforms are retained. The same script copies canonical bilingual FAQs, excluding mobile printing, and the original seven level names/descriptions. These assets reuse the web identity; they are not AI-generated replacements.
