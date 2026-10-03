import { requireTerms } from '@/lib/account-controls';
import { db } from '@/lib/db';
import { api, body, HttpError, userId } from '@/lib/http';
import { recipeSchema } from '@/lib/validation';
import { enrichRecipeLater } from '@/lib/recipe-enrichment';
import { rateLimit } from '@/lib/rate-limit';
import { syncContext } from '@/lib/native-sync-context';
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
    await requireTerms(id);
    const user = await db.user.findUniqueOrThrow({ where: { id } });
    // Persist the original first: provider outages or a disconnected browser cannot lose it.
    const recipe = await db.recipe.create({ data: { ...input, id: syncContext.getStore()?.entityId, userId: id, roastLine: '', translations: { en: {}, fr: {}, pending: true } } });
    enrichRecipeLater(recipe, user.roastEnabled);
    return recipe;
  }, 201);
}
