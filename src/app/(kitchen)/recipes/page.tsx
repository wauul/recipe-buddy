import { currentUser, recipeView } from '@/lib/data';
import { db } from '@/lib/db';
import { weekProgress } from '@/lib/streak';
import { RecipeDashboard } from '@/components/recipe-dashboard';
export default async function Recipes() {
  const user = await currentUser();
  const [recipes, logs] = await Promise.all([
    db.recipe.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } }),
    db.cookedLog.findMany({ where: { userId: user.id, date: { gte: new Date(Date.now() - 7 * 86400000) } }, select: { date: true } })
  ]);
  return <RecipeDashboard recipes={recipes.map(recipeView)} progress={weekProgress(logs.map(l => l.date))} />;
}
