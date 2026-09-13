import type { Prisma } from '@prisma/client';

export function friendPair(first: string, second: string) {
  if (first === second) throw new Error('You are already your own sous-chef. Add someone else.');
  const [userAId, userBId] = [first, second].sort();
  return { userAId, userBId };
}

export function sharedRecipeWhere(recipientId: string, recipeId?: string): Prisma.RecipeShareWhereInput {
  // Check the recipient and active friendship on every read, including direct URLs.
  return { recipientId, ...(recipeId ? { recipeId } : {}), friendship: { acceptedAt: { not: null }, OR: [{ userAId: recipientId }, { userBId: recipientId }] } };
}
