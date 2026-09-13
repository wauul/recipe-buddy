import { db } from './db';
import { recipeView } from './data';
import { sharedRecipeWhere } from './social-policy';

const friendSelection = { id: true, email: true } as const;
export async function friendList(id: string) {
  const rows = await db.friendship.findMany({ where: { OR: [{ userAId: id }, { userBId: id }] }, include: { userA: { select: friendSelection }, userB: { select: friendSelection } }, orderBy: { createdAt: 'desc' } });
  return rows.map(row => ({ id: row.id, friend: row.userAId === id ? row.userB : row.userA,
    status: row.acceptedAt ? 'accepted' as const : row.requesterId === id ? 'outgoing' as const : 'incoming' as const }));
}

export async function sharedRecipes(id: string) {
  const rows = await db.recipeShare.findMany({ where: sharedRecipeWhere(id), include: { recipe: { include: { user: { select: { email: true } } } } }, orderBy: { createdAt: 'desc' } });
  return rows.map(row => ({ ...recipeView(row.recipe), sharedBy: row.recipe.user.email }));
}

export type FriendView = Awaited<ReturnType<typeof friendList>>[number];
export type SharedRecipeView = Awaited<ReturnType<typeof sharedRecipes>>[number];
