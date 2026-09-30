import { db } from '@/lib/db';
import { api, body, HttpError, userId } from '@/lib/http';
import { recipeSchema } from '@/lib/validation';
import { prepareRecipeLanguages } from '@/lib/translate';
import { rateLimit } from '@/lib/rate-limit';
export const maxDuration = 300;
export async function POST(request: Request, { params }: { params: { id: string } }) {
  return api(async () => {
    const owner = await userId();
    await body(request);
    const recipe = await db.recipe.findFirst({ where: { id: params.id, userId: owner } });
    if (!recipe) throw new HttpError(404, 'Recipe not found.');
    if (!(await rateLimit(`prepare:${owner}`, 6)))
      throw new HttpError(429, 'Try again in a minute.');
    const translations = await prepareRecipeLanguages(
      owner,
      { ...recipeSchema.parse(recipe), roastLine: recipe.roastLine },
      recipe.translations,
    );
    const saved = await db.recipe.updateMany({
      where: { id: recipe.id, userId: owner, updatedAt: recipe.updatedAt },
      data: { translations, updatedAt: recipe.updatedAt },
    });
    if (!saved.count) throw new HttpError(409, 'The recipe changed. Try again.');
    return { translations };
  });
}
