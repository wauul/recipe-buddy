import { z } from 'zod';
export const ingredientSchema = z.object({
  name: z.string().trim().min(1).max(120),
  quantity: z.string().trim().max(40),
  unit: z.string().trim().max(40)
});
export const recipeSchema = z.object({
  title: z.string().trim().min(1, 'Give this masterpiece a title.').max(160),
  servings: z.number().int().min(1).max(100),
  ingredients: z.array(ingredientSchema).min(1).max(100),
  steps: z.array(z.string().trim().min(1).max(2000)).min(1).max(80),
  altTitle: z.string().trim().max(180).default(''),
  vibe: z.enum(['cozy', 'lazy', 'fancy', 'chaotic']).default('cozy')
});
export const credentialsSchema = z.object({
  email: z.string().trim().email().max(254).transform(v => v.toLowerCase()),
  password: z.string().min(8, 'Use at least 8 characters.').max(72)
    .refine(v => new TextEncoder().encode(v).length <= 72, 'Password must be at most 72 bytes.')
});
export type RecipeInput = z.infer<typeof recipeSchema>;
export type Ingredient = z.infer<typeof ingredientSchema>;
export type RecipeView = RecipeInput & { id: string; roastLine: string; createdAt: string };
