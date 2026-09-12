import { notFound } from 'next/navigation';
import { currentUser, recipeView } from '@/lib/data';
import { db } from '@/lib/db';
import { RecipeDetail } from '@/components/recipe-detail';
export default async function RecipePage({ params }: { params: { id: string } }) {
  const user = await currentUser();
  const recipe = await db.recipe.findFirst({ where: { id: params.id, userId: user.id } });
  if (!recipe) notFound();
  const log = await db.cookedLog.findUnique({ where: { userId_recipeId_date: { userId: user.id, recipeId: recipe.id, date: new Date(new Date().toISOString().slice(0, 10)) } } });
  return <RecipeDetail recipe={recipeView(recipe)} roastEnabled={user.roastEnabled} cookedToday={!!log} />;
}
