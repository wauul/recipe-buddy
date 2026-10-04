import { z } from 'zod';
import { recipeSchema, type RecipeInput } from './validation';
import { ingredientFromLine } from './cooking-units';

export const browserImportKey = 'rb-browser-import-v1';
export const browserImportMaxLength = 240000;
const sourceUrl = z.string().max(2048).refine((value) => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch { return false; }
});
export const browserImportSchema = z.object({
  version: z.literal(1),
  sourceUrl,
  recipe: z.object({
    title: z.string().trim().min(1).max(160),
    imageUrl: z.string().max(2048).refine((value) => !value || sourceUrl.safeParse(value).success).default(''),
    servings: z.number().int().min(1).max(100),
    ingredients: z.array(z.string().trim().min(1).max(120)).min(1).max(100),
    steps: z.array(z.string().trim().min(1).max(2000)).min(1).max(80),
  }).optional(),
});
export type BrowserImport = z.infer<typeof browserImportSchema>;
export function readBrowserImport(text: string): BrowserImport {
  if (text.length > browserImportMaxLength) throw new Error('This recipe is too large to import. Try its URL instead.');
  return browserImportSchema.parse(JSON.parse(text));
}
export function browserImportRecipe(payload: BrowserImport): RecipeInput | undefined {
  if (!payload.recipe) return undefined;
  // Split known measurements without converting values; preserve ambiguous lines.
  return recipeSchema.parse({
    ...payload.recipe,
    ingredients: payload.recipe.ingredients.map(ingredientFromLine),
  });
}
