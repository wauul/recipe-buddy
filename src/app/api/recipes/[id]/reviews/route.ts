import { db } from '@/lib/db';
import { api, body, HttpError, userId } from '@/lib/http';
import { sharedRecipeWhere } from '@/lib/social-policy';
import { apronReviewSchema, canReviewRecipe } from '@/lib/review-validation';
import { recipeReviews } from '@/lib/reviews';
import { rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
type Context = { params: { id: string } };
export async function GET(_request: Request, { params }: Context) {
  return api(async () => recipeReviews(params.id, await userId()));
}
export async function PUT(request: Request, { params }: Context) {
  return api(async () => {
    const authorId = await userId();
    const input = apronReviewSchema.parse(await body(request));
    if (!(await rateLimit(`review:${authorId}`, 20)))
      throw new HttpError(429, 'Too many review updates. Try again in a minute.');
    await db.$transaction(async (tx) => {
      // A shared row is locked through the write, so revocation cannot slip between access and saving.
      const share = await tx.recipeShare.findFirst({
        where: sharedRecipeWhere(authorId, params.id),
        select: { id: true, recipe: { select: { userId: true } } },
      });
      if (!share || !canReviewRecipe(share.recipe.userId, authorId))
        throw new HttpError(403, 'You can only review recipes shared with you by another chef.');
      await tx.$queryRaw`SELECT "id" FROM "RecipeShare" WHERE "id" = ${share.id} FOR SHARE`;
      // The shared row may have been removed before the lock was acquired.
      if (
        !(await tx.recipeShare.findFirst({
          where: sharedRecipeWhere(authorId, params.id),
          select: { id: true },
        }))
      )
        throw new HttpError(403, 'This recipe is no longer shared with you.');
      await tx.recipeReview.upsert({
        where: { recipeId_authorId: { recipeId: params.id, authorId } },
        create: { recipeId: params.id, authorId, ...input },
        update: input,
      });
    });
    return recipeReviews(params.id, authorId);
  });
}
export async function DELETE(request: Request, { params }: Context) {
  return api(async () => {
    const authorId = await userId();
    await body(request);
    // Withdrawal remains possible after sharing ends, without exposing the recipe.
    await db.recipeReview.deleteMany({
      where: { recipeId: params.id, authorId },
    });
    return { ok: true };
  });
}
