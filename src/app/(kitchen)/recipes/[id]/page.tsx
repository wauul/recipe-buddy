import { notFound } from 'next/navigation';
import { currentUser, recipeView } from '@/lib/data';
import { db } from '@/lib/db';
import { RecipeDetail } from '@/components/recipe-detail';
import { RecipeSharing } from '@/components/recipe-sharing';
import { friendList } from '@/lib/social';
import { recipeDiscussion } from '@/lib/discussion';
import { RecipeDiscussion } from '@/components/recipe-discussion';
export default async function RecipePage({ params }: { params: { id: string } }) {
  const user = await currentUser();
  const recipe = await db.recipe.findFirst({ where: { id: params.id, userId: user.id } });
  if (!recipe) notFound();
  const log = await db.cookedLog.findUnique({ where: { userId_recipeId_date: { userId: user.id, recipeId: recipe.id, date: new Date(new Date().toISOString().slice(0, 10)) } } });
  const [connections, shares, discussion] = await Promise.all([
    friendList(user.id),
    db.recipeShare.findMany({ where: { recipeId: recipe.id }, select: { recipientId: true } }),
    recipeDiscussion(recipe.id, user.id)
  ]);
  return <><RecipeDetail recipe={recipeView(recipe)} roastEnabled={user.roastEnabled} cookedToday={!!log} /><RecipeDiscussion recipeId={recipe.id} viewerId={user.id} ingredients={recipeView(recipe).ingredients.map(item => item.name)} discussion={discussion}/><RecipeSharing recipeId={recipe.id} friends={connections.filter(f => f.status === 'accepted').map(f => f.friend)} recipientIds={shares.map(s => s.recipientId)} /></>;
}
