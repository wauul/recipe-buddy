import { db } from '@/lib/db';
import { api, body, HttpError, userId } from '@/lib/http';
import { recipeSchema } from '@/lib/validation';
import { roastRecipe } from '@/lib/ai';
import { rateLimit } from '@/lib/rate-limit';
type Context = { params: { id: string } };
export const dynamic = 'force-dynamic';
export const maxDuration = 30;
export async function GET(_request: Request, { params }: Context) {
  return api(async () => {
    const recipe = await db.recipe.findFirst({ where: { id: params.id, userId: await userId() } });
    if (!recipe) throw new HttpError(404, 'Recipe not found.'); return recipe;
  });
}
export async function PUT(request: Request, { params }: Context) {
  return api(async () => {
    const owner = await userId(), input = recipeSchema.parse(await body(request));
    const existing = await db.recipe.findFirst({ where: { id: params.id, userId: owner } });
    if (!existing) throw new HttpError(404, 'Recipe not found.');
    if (!(await rateLimit(`save:${owner}`, 20))) throw new HttpError(429, 'Try again in a minute.');
    const user = await db.user.findUniqueOrThrow({ where: { id: owner } });
    const roastLine = await roastRecipe(input, user.roastEnabled);
    const result = await db.recipe.updateMany({ where: { id: params.id, userId: owner }, data: { ...input, roastLine } });
    if (!result.count) throw new HttpError(404, 'Recipe not found.'); return { ok: true };
  });
}
export async function DELETE(request: Request, { params }: Context) {
  return api(async () => {
    const owner = await userId(); await body(request);
    const result = await db.recipe.deleteMany({ where: { id: params.id, userId: owner } });
    if (!result.count) throw new HttpError(404, 'Recipe not found.'); return { ok: true };
  });
}
