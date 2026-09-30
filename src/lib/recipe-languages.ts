import { z } from 'zod';
import type { RecipeInput } from './validation';
import { validateTranslations } from './content-translation';
export const recipeTranslationVersion = 2;
export const savedLanguagesSchema = z.object({
  en: z.record(z.string()),
  fr: z.record(z.string()),
  pending: z.boolean(),
  version: z.number().int().default(1),
});
export type SavedLanguages = z.infer<typeof savedLanguagesSchema>;
export function recipeTexts(
  recipe: Pick<RecipeInput, 'title' | 'altTitle' | 'ingredients' | 'steps'> & { roastLine: string },
) {
  return [
    ...new Set(
      [
        recipe.title,
        recipe.altTitle,
        recipe.roastLine,
        ...recipe.ingredients.flatMap((item) => [
          item.name,
          item.quantity,
          item.unit,
          [item.quantity, item.unit].filter(Boolean).join(' '),
        ]),
        ...recipe.steps,
      ].filter((text) => text.trim()),
    ),
  ];
}
export function savedLanguages(value: unknown): SavedLanguages {
  const result = savedLanguagesSchema.safeParse(value);
  if (!result.success)
    return {
      en: Object.create(null),
      fr: Object.create(null),
      pending: true,
      version: recipeTranslationVersion,
    };
  // Reconstruct own string entries: schema parsers deliberately omit __proto__.
  const raw = value as SavedLanguages;
  const dictionary = (entries: Record<string, string>) =>
    Object.fromEntries(Object.entries(entries).filter(([, text]) => typeof text === 'string'));
  return {
    en: dictionary(raw.en),
    fr: dictionary(raw.fr),
    pending: result.data.pending || result.data.version < recipeTranslationVersion,
    version: result.data.version,
  };
}
// Seed every original field, even while a failed save-time translation awaits retry.
// Opening a saved recipe therefore never starts another model translation.
export function recipeLanguageSeed(
  recipe: Parameters<typeof recipeTexts>[0] & { translations?: unknown },
) {
  const saved = savedLanguages(recipe.translations);
  const texts = recipeTexts(recipe);
  const seed: SavedLanguages = {
    en: {},
    fr: {},
    pending: saved.pending,
    version: saved.version,
  };
  for (const locale of ['en', 'fr'] as const) {
    for (const text of texts) {
      const translated =
        saved.version === recipeTranslationVersion && Object.hasOwn(saved[locale], text)
          ? saved[locale][text]
          : undefined;
      try {
        const display = translated
          ? validateTranslations([text], { translations: [translated] })[0]
          : text;
        Object.defineProperty(seed[locale], text, {
          value: display,
          enumerable: true,
          writable: true,
          configurable: true,
        });
        if (!translated) seed.pending = true;
      } catch {
        Object.defineProperty(seed[locale], text, {
          value: text,
          enumerable: true,
          writable: true,
          configurable: true,
        });
        seed.pending = true;
      }
    }
  }
  return seed;
}
