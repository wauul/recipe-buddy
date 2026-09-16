import { db } from './db';
import { HttpError } from './http';
import { sharedRecipeWhere } from './social-policy';
import type { Discussion } from './discussion-validation';
import { takeTypeSchema } from './discussion-validation';
import { displayUsername } from './username';

export async function discussionAccess(recipeId: string, viewerId: string) {
  // Recheck active sharing on every request; knowing a recipe or take ID grants no access.
  const recipe = await db.recipe.findFirst({
    where: { id: recipeId, OR: [{ userId: viewerId }, { shares: { some: sharedRecipeWhere(viewerId) } }] },
    select: { userId: true, ingredients: true }
  });
  if (!recipe) throw new HttpError(404, 'Recipe not found or no longer shared with you.');
  return recipe;
}

export async function recipeDiscussion(recipeId: string, viewerId: string): Promise<Discussion> {
  const recipe = await discussionAccess(recipeId, viewerId);
  const [takes, comments] = await Promise.all([
    db.recipeTake.findMany({ where: { recipeId }, include: { author: { select: { email: true, username: true } } }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] }),
    db.recipeComment.findMany({ where: { recipeId }, include: { author: { select: { email: true, username: true } } }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] })
  ]);
  // Resolve current names on every read so a rename also updates past contributions.
  const attribution = (row: { authorId: string; author: { email: string; username: string }; createdAt: Date }) => ({
    authorId: row.authorId, authorName: displayUsername(row.author), createdAt: row.createdAt.toISOString()
  });
  return { ownerId: recipe.userId,
    takes: takes.map(row => ({ id: row.id, type: takeTypeSchema.catch('other').parse(row.type), title: row.title, change: row.change, ingredient: row.ingredient, reason: row.reason, ...attribution(row) })),
    comments: comments.map(row => ({ id: row.id, takeId: row.takeId, text: row.text, ...attribution(row) }))
  };
}
