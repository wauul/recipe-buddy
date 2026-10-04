import { z } from 'zod';
import type { RecipeInput } from './validation';
import { validateTranslations } from './content-translation';
import { normalizeCookingUnit, splitCookingAmount } from './cooking-units';
export const recipeTranslationVersion = 3;
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
  const saved = repairRecipeLanguageMeasurements(recipe, savedLanguages(recipe.translations));
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

const measurePairs = [
  ['tablespoon', 'cuillère à soupe'],
  ['tablespoons', 'cuillères à soupe'],
  ['teaspoon', 'cuillère à café'],
  ['teaspoons', 'cuillères à café'],
  ['cup', 'tasse'],
  ['cups', 'tasses'],
  ['slice', 'tranche'],
  ['slices', 'tranches'],
  ['piece', 'morceau'],
  ['pieces', 'morceaux'],
  ['clove', 'gousse'],
  ['cloves', 'gousses'],
  ['ounce', 'once'],
  ['ounces', 'onces'],
  ['pound', 'livre'],
  ['pounds', 'livres'],
  ['lbs', 'livres'],
  ['can', 'boîte'],
  ['cans', 'boîtes'],
];
export function cookingMeasurement(text: string, locale: 'en' | 'fr'): string | undefined {
  // A can is a container here, never the verb “can”. Keep values without conversion.
  const container = text.match(/^([\d/., ¼½¾]+)\s*\(([\d/.,]+)[-‑–]ounces?\)\s+cans?$/i);
  if (container && locale === 'fr') return `${container[1].trim()} boîte de ${container[2]} onces`;
  for (const [en, fr] of measurePairs) {
    for (const source of [en, fr]) {
      if (text.toLowerCase() === source) return locale === 'fr' ? fr : en;
      if (text.toLowerCase().endsWith(' ' + source)) {
        const quantity = text.slice(0, -(source.length + 1));
        if (/^[\d/., +−¼½¾-]+$/.test(quantity)) return quantity + ' ' + (locale === 'fr' ? fr : en);
      }
    }
  }
  const labels: Record<string, [string, string]> = {
    tsp: ['tsp', 'c. à café'], tbsp: ['tbsp', 'c. à soupe'],
    g: ['g', 'g'], kg: ['kg', 'kg'], mg: ['mg', 'mg'], ml: ['ml', 'ml'],
    cl: ['cl', 'cl'], dl: ['dl', 'dl'], l: ['l', 'l'],
    oz: ['oz', 'oz'], lb: ['lb', 'lb'], 'fl oz': ['fl oz', 'fl oz'],
    cup: ['cup', 'tasse'], pint: ['pint', 'pinte'], quart: ['quart', 'quart'],
    gallon: ['gallon', 'gallon'], pinch: ['pinch', 'pincée'], dash: ['dash', 'trait'],
    clove: ['clove', 'gousse'], slice: ['slice', 'tranche'], piece: ['piece', 'morceau'],
    can: ['can', 'boîte'], packet: ['packet', 'sachet'], bunch: ['bunch', 'botte'],
  };
  const amount = splitCookingAmount(text);
  const label = labels[amount?.unit ?? normalizeCookingUnit(text)];
  if (label) return [amount?.quantity, label[locale === 'fr' ? 1 : 0]].filter(Boolean).join(' ');
}
export function repairRecipeLanguageMeasurements(
  recipe: Parameters<typeof recipeTexts>[0],
  saved: SavedLanguages,
): SavedLanguages {
  const result = { ...saved, en: { ...saved.en }, fr: { ...saved.fr } };
  for (const locale of ['en', 'fr'] as const) {
    const dictionary = result[locale];
    for (const ingredient of recipe.ingredients) {
      for (const source of [ingredient.quantity, ingredient.unit]) {
        const translated = cookingMeasurement(source, locale);
        if (translated !== undefined) dictionary[source] = translated;
      }
      const combined = [ingredient.quantity, ingredient.unit].filter(Boolean).join(' ');
      const parts = [ingredient.quantity, ingredient.unit].filter(Boolean);
      if (combined && parts.every((source) => Object.hasOwn(dictionary, source))) {
        const joined = parts.map((source) => dictionary[source]).join(' ');
        validateTranslations([combined], { translations: [joined] });
        dictionary[combined] = joined;
      }
    }
    if (
      locale === 'fr' &&
      /pan[-‑– ]fried/i.test(recipe.title) &&
      !/breaded/i.test(recipe.title) &&
      Object.hasOwn(dictionary, recipe.title)
    ) {
      dictionary[recipe.title] = dictionary[recipe.title].replace(/panées/gi, 'poêlées');
    }
  }
  return result;
}
