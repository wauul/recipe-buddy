import { db } from './db';
import { recipeView } from './data';
import { sharedRecipeWhere } from './social-policy';
import { displayUsername } from './username';

const friendSelection = { id: true, email: true, username: true } as const;
export async function friendList(id: string) {
  const [blocks, rows] = await Promise.all([
    db.userBlock.findMany({ where: { OR: [{ blockerId: id }, { blockedId: id }] }, select: { blockerId: true, blockedId: true } }),
    db.friendship.findMany({ where: { OR: [{ userAId: id }, { userBId: id }] }, include: { userA: { select: friendSelection }, userB: { select: friendSelection } }, orderBy: { createdAt: 'desc' } }),
  ]);
  const excluded = new Set(blocks.flatMap(b => [b.blockerId, b.blockedId]).filter(v => v !== id));
  return rows.filter(row => !excluded.has(row.userAId === id ? row.userBId : row.userAId)).map(row => ({ id: row.id, friend: { ...(row.userAId === id ? row.userB : row.userA), username: displayUsername(row.userAId === id ? row.userB : row.userA) },
    status: row.acceptedAt ? 'accepted' as const : row.requesterId === id ? 'outgoing' as const : 'incoming' as const }));
}

export async function sharedRecipes(id: string) {
  const rows = await db.recipeShare.findMany({ where: sharedRecipeWhere(id), include: { recipe: { include: { user: { select: { email: true, username: true } } } } }, orderBy: { createdAt: 'desc' } });
  return rows.map(row => ({ ...recipeView(row.recipe), sharedBy: displayUsername(row.recipe.user), sharedChefId: row.recipe.userId }));
}

export type FriendView = Awaited<ReturnType<typeof friendList>>[number];
export type SharedRecipeView = Awaited<ReturnType<typeof sharedRecipes>>[number];
