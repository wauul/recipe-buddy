import { z } from 'zod';
import { db } from '@/lib/db';
import { api, body, HttpError, userId } from '@/lib/http';
import { ingredientSchema } from '@/lib/validation';
import { mergeIngredients } from '@/lib/shopping';
export async function POST(request: Request) {
  return api(async () => {
    const id = await userId();
    const { recipeIds } = z.object({ recipeIds: z.array(z.string().cuid()).min(1).max(100) }).parse(await body(request));
    const ids = [...new Set(recipeIds)];
    const recipes = await db.recipe.findMany({ where: { userId: id, id: { in: ids } } });
    if (recipes.length !== ids.length) throw new HttpError(404, 'One or more recipes are unavailable.');
    return mergeIngredients(recipes.flatMap(recipe => z.array(ingredientSchema).parse(recipe.ingredients)));
  });
}
