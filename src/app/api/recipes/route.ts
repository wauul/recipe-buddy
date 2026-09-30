import { db } from '@/lib/db';
import { api, body, HttpError, userId } from '@/lib/http';
import { recipeSchema } from '@/lib/validation';
import { roastRecipe } from '@/lib/ai';
import { prepareRecipeLanguages } from '@/lib/translate';
import { rateLimit } from '@/lib/rate-limit';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;
export async function GET() {
  return api(async () =>
    db.recipe.findMany({ where: { userId: await userId() }, orderBy: { createdAt: 'desc' } }),
  );
}
export async function POST(request: Request) {
  return api(async () => {
    const id = await userId(),
      input = recipeSchema.parse(await body(request));
    if (!(await rateLimit(`save:${id}`, 20)))
      throw new HttpError(429, 'Too many saves. Try again in a minute.');
    const user = await db.user.findUniqueOrThrow({ where: { id } });
    const roastLine = await roastRecipe(input, user.roastEnabled);
    // Persist the original first: provider outages or a disconnected browser cannot lose it.
    const recipe = await db.recipe.create({ data: { ...input, userId: id, roastLine } });
    const translations = await prepareRecipeLanguages(id, { ...input, roastLine });
    await db.recipe.updateMany({
      where: { id: recipe.id, updatedAt: recipe.updatedAt },
      data: { translations, updatedAt: recipe.updatedAt },
    });
    return { ...recipe, translations };
  }, 201);
}
