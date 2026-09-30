import { currentUser, recipeView } from '@/lib/data';
import { db } from '@/lib/db';
import { weekProgress } from '@/lib/streak';
import { RecipeDashboard } from '@/components/recipe-dashboard';
import { currentChefProgress } from '@/lib/chefs';
export default async function Recipes() {
  const user = await currentUser();
  const [recipes, logs, chef] = await Promise.all([
    db.recipe.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    }),
    db.cookedLog.findMany({
      where: {
        userId: user.id,
        date: { gte: new Date(Date.now() - 7 * 86400000) },
      },
      select: { date: true },
    }),
    currentChefProgress(user.id),
  ]);
  return (
    <RecipeDashboard
      recipes={recipes.map(recipeView)}
      progress={weekProgress(logs.map((l) => l.date))}
      chef={{
        name: user.username,
        progress: chef,
      }}
    />
  );
}
