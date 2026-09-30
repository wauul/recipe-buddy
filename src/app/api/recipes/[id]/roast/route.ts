import { db } from '@/lib/db';
import { api, body, HttpError, userId } from '@/lib/http';
import { freshRoast } from '@/lib/ai';
import { savedLanguages } from '@/lib/recipe-languages';
import { rateLimit } from '@/lib/rate-limit';
export const maxDuration = 30;
export async function POST(request: Request, { params }: { params: { id: string } }) {
  return api(async () => {
    const owner = await userId();
    await body(request);
    const recipe = await db.recipe.findFirst({ where: { id: params.id, userId: owner } });
    if (!recipe) throw new HttpError(404, 'Recipe not found.');
    const chef = await db.user.findUniqueOrThrow({
      where: { id: owner },
      select: { roastEnabled: true },
    });
    if (!chef.roastEnabled) throw new HttpError(400, 'Turn on roast mode in Settings first.');
    if (!(await rateLimit(`roast:${owner}`, 5)))
      throw new HttpError(429, 'Too many roasts. Try again in a minute.');
    let roast;
    try {
      roast = await freshRoast(recipe.title, recipe.roastLine);
    } catch {
      throw new HttpError(503, 'Could not generate a new roast. Your previous joke is still here.');
    }
    const translations = savedLanguages(recipe.translations);
    delete translations.en[recipe.roastLine];
    delete translations.fr[recipe.roastLine];
    translations.en[roast.en] = roast.en;
    translations.fr[roast.en] = roast.fr;
    const saved = await db.recipe.updateMany({
      where: { id: recipe.id, userId: owner, updatedAt: recipe.updatedAt },
      data: { roastLine: roast.en, translations },
    });
    if (!saved.count) throw new HttpError(409, 'The recipe changed. Try again.');
    return { roastLine: roast.en, translations };
  });
}
