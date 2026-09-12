import { db } from '@/lib/db';
import { api, body, HttpError, userId } from '@/lib/http';
import { recipeSchema } from '@/lib/validation';
import { roastRecipe } from '@/lib/ai';
import { rateLimit } from '@/lib/rate-limit';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;
export async function GET() {
  return api(async () => db.recipe.findMany({ where: { userId: await userId() }, orderBy: { createdAt: 'desc' } }));
}
export async function POST(request: Request) {
  return api(async () => {
    const id = await userId(), input = recipeSchema.parse(await body(request));
    if (!(await rateLimit(`save:${id}`, 20))) throw new HttpError(429, 'Too many saves. Try again in a minute.');
    const user = await db.user.findUniqueOrThrow({ where: { id } });
    const roastLine = await roastRecipe(input, user.roastEnabled);
    return db.recipe.create({ data: { ...input, userId: id, roastLine } });
  }, 201);
}
