import { db } from '@/lib/db';
import { api, body, HttpError, userId } from '@/lib/http';
import { discussionAccess, recipeDiscussion } from '@/lib/discussion';
import { takeSchema, commentSchema, deleteContributionSchema } from '@/lib/discussion-validation';
import { rateLimit } from '@/lib/rate-limit';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
type Context = { params: { id: string } };
const contributionSchema = z.discriminatedUnion('kind', [
  takeSchema.extend({ kind: z.literal('take') }),
  commentSchema.extend({ kind: z.literal('comment') })
]);

export async function GET(_request: Request, { params }: Context) {
  return api(async () => recipeDiscussion(params.id, await userId()));
}

export async function POST(request: Request, { params }: Context) {
  return api(async () => {
    const authorId = await userId();
    const data = contributionSchema.parse(await body(request));
    const recipe = await discussionAccess(params.id, authorId);
    if (!await rateLimit(`discussion:${authorId}`, 30)) throw new HttpError(429, 'Give the kitchen a moment. Try again in a minute.');
    if (data.kind === 'take') {
      if (data.ingredient && (!Array.isArray(recipe.ingredients) || !recipe.ingredients.some(item => item && typeof item === 'object' && !Array.isArray(item) && item.name === data.ingredient))) {
        throw new HttpError(400, 'That ingredient changed. Refresh the recipe or choose “Whole recipe”.');
      }
      await db.recipeTake.create({ data: { recipeId: params.id, authorId, type: data.type, title: data.title, change: data.change, ingredient: data.ingredient, reason: data.reason } });
    } else {
      // A reply must belong to a take on THIS recipe, not another accessible recipe.
      if (data.takeId && !await db.recipeTake.findFirst({ where: { id: data.takeId, recipeId: params.id }, select: { id: true } })) throw new HttpError(404, 'This twist is no longer available.');
      await db.recipeComment.create({ data: { recipeId: params.id, authorId, takeId: data.takeId, text: data.text } });
    }
    return { ok: true };
  }, 201);
}

export async function DELETE(request: Request, { params }: Context) {
  return api(async () => {
    const viewer = await userId();
    const { kind, id } = deleteContributionSchema.parse(await body(request));
    const recipe = await discussionAccess(params.id, viewer);
    // Authors control their contributions; recipe owners can moderate their kitchen.
    const where = { id, recipeId: params.id, ...(recipe.userId === viewer ? {} : { authorId: viewer }) };
    const result = kind === 'take' ? await db.recipeTake.deleteMany({ where }) : await db.recipeComment.deleteMany({ where });
    if (!result.count) throw new HttpError(404, 'Contribution not found or you cannot remove it.');
    return { ok: true };
  });
}
