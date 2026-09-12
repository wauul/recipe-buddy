import { db } from '@/lib/db';
import { api, body, HttpError, userId } from '@/lib/http';
export async function POST(request: Request, { params }: { params: { id: string } }) {
  return api(async () => {
    const id = await userId(); await body(request);
    const recipe = await db.recipe.findFirst({ where: { id: params.id, userId: id } });
    if (!recipe) throw new HttpError(404, 'Recipe not found.');
    const date = new Date(new Date().toISOString().slice(0, 10));
    await db.cookedLog.upsert({ where: { userId_recipeId_date: { userId: id, recipeId: recipe.id, date } },
      create: { userId: id, recipeId: recipe.id, date }, update: {} });
    return { ok: true, date: date.toISOString() };
  });
}
