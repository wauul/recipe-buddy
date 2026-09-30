# Asset provenance

## Typography

Self-hosted variable Bricolage Grotesque and Source Sans 3, downloaded from the official Google Fonts repository:

- https://github.com/google/fonts/tree/main/ofl/bricolagegrotesque
- https://github.com/google/fonts/tree/main/ofl/sourcesans3

OFL licenses accompany both fonts in `public/fonts`. FontTools encoded the original TTFs as lossless WOFF2: 408,496 → 205,188 bytes and 646,340 → 169,944 bytes. No font dependency or remote font request is needed. The root layout declares variable weights 400–700 and uses `font-display: swap`.

## Simple kitchen illustrations

The landing plate, fork, knife and herbs in `src/components/kitchen-plate.tsx` are hand-authored inline SVG. The pot, toaster, cloche and wok in `src/components/cooking-illustration.tsx` use the same line work and original cream/sage/forest palette. CSS animates steam, utensils and herbs. These illustrations are decorative and hidden from assistive technology; they do not depict an actual saved recipe.

The generated photograph and painted chef journey image were removed at the user's request. Neither file ships. Authentication now uses typography and a numbered text list, without a photograph. Chef progress uses the simple pot illustration.

Uploaded recipe photos retain the existing direct browser loading, client-side compression and illustrated error fallback. Removing decorative artwork does not remove any chef's saved photos.

## Illustrations and icons

The pot, toaster, cloche and wok scenes in `src/components/cooking-illustration.tsx` are original inline SVG illustrations authored for this redesign. Category fills reuse the old palette. Steam and tools animate through CSS; illustrations are decorative and hidden from assistive technology. They identify recipe categories without depicting a fabricated dish.

Interface icons use the existing Lucide dependency. The original chef-hat identity and favicon remain. No 21st.dev component source was copied or installed.

## Chef badges

The seven chef badges in `src/components/chef-badge.tsx` and the apron rating icon in `src/components/apron-icon.tsx` are original inline SVGs authored for this extension. Each badge depicts a different cooking tool or object; the shared stitched outline provides continuity. Badges are decorative: adjacent text communicates the level and threshold. Google’s four-color G is confined to its sign-in button as provider identification, rather than used as an app palette.
