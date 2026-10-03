import { db } from '@/lib/db';
import { api, body, HttpError, userId } from '@/lib/http';
import { syncContext } from '@/lib/native-sync-context';
export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return api(async () => {
    const id = await userId(); await body(request);
    const recipe = await db.recipe.findFirst({ where: { id: params.id, userId: id } });
    if (!recipe) throw new HttpError(404, 'Recipe not found.');
    const date = new Date((syncContext.getStore()?.occurredAt ?? new Date().toISOString()).slice(0, 10));
    await db.cookedLog.upsert({ where: { userId_recipeId_date: { userId: id, recipeId: recipe.id, date } },
      create: { userId: id, recipeId: recipe.id, date }, update: {} });
    return { ok: true, date: date.toISOString() };
  });
}
