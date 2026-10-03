import { db } from './db';
import { recipeView } from './data';
import { displayUsername } from './username';
import { currentChefProgress } from './chefs';
import { chefLevels } from './chef-levels';
import { weekProgress } from './streak';
import { friendList, sharedRecipes } from './social';
import { blockedChefs } from './moderation';
import { proStatus } from './native-pro';

export async function nativeMe(userId: string) {
  const today = new Date(new Date().toISOString().slice(0, 10));
  const [row, logs, chef, pro] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: userId }, select: { id: true, username: true, email: true, roastEnabled: true, termsVersion: true } }),
    db.cookedLog.findMany({ where: { userId, date: { gte: new Date(today.getTime() - 7 * 86400_000) } }, select: { date: true, recipeId: true } }),
    currentChefProgress(userId),
    proStatus(userId),
  ]);
  return { ...row, pro, username: displayUsername(row), chef, levels: chefLevels,
    week: weekProgress(logs.map(log => log.date)),
    cookedToday: logs.filter(log => log.date.getTime() === today.getTime()).map(log => log.recipeId) };
}

// One authenticated request, independent reads in parallel. Private data stays no-store;
// every refresh still checks session revocation and current sharing/block permissions.
export async function nativeHome(userId: string) {
  const [me, rows, friends, blocked, shared] = await Promise.all([
    nativeMe(userId),
    db.recipe.findMany({ where: { userId }, orderBy: { id: 'asc' }, take: 51 }),
    friendList(userId), blockedChefs(userId), sharedRecipes(userId),
  ]);
  return { me, recipes: { items: rows.slice(0, 50).map(recipeView), nextCursor: rows.length > 50 ? rows[49].id : null }, friends, blocked, shared };
}
