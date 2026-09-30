import { db } from './db';
import { discussionAccess } from './discussion';
import { displayUsername } from './username';
import type { RecipeReviews } from './review-validation';

export async function recipeReviews(recipeId: string, viewerId: string): Promise<RecipeReviews> {
  const recipe = await discussionAccess(recipeId, viewerId);
  const rows = await db.recipeReview.findMany({
    where: { recipeId },
    include: { author: { select: { email: true, username: true } } },
    orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
  });
  return {
    ownerId: recipe.userId,
    reviews: rows.map((row) => ({
      id: row.id,
      authorId: row.authorId,
      chefName: displayUsername(row.author),
      rating: row.rating,
      text: row.text,
      updatedAt: row.updatedAt.toISOString(),
    })),
  };
}
