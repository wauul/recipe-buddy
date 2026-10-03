import { notFound } from 'next/navigation';
import { currentUser, recipeView } from '@/lib/data';
import { db } from '@/lib/db';
import { RecipeDetail } from '@/components/recipe-detail';
import { RecipeSharing } from '@/components/recipe-sharing';
import { friendList } from '@/lib/social';
import { recipeDiscussion } from '@/lib/discussion';
import { RecipeDiscussion } from '@/components/recipe-discussion';
import { RecipeReviewsPanel } from '@/components/recipe-reviews';
import { recipeReviews } from '@/lib/reviews';
export default async function RecipePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await currentUser();
  const recipe = await db.recipe.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!recipe) notFound();
  const log = await db.cookedLog.findUnique({
    where: {
      userId_recipeId_date: {
        userId: user.id,
        recipeId: recipe.id,
        date: new Date(new Date().toISOString().slice(0, 10)),
      },
    },
  });
  const [connections, shares, discussion, reviews] = await Promise.all([
    friendList(user.id),
    db.recipeShare.findMany({
      where: { recipeId: recipe.id },
      select: { recipientId: true },
    }),
    recipeDiscussion(recipe.id, user.id),
    recipeReviews(recipe.id, user.id),
  ]);
  return (
    <>
      <RecipeDetail
        recipe={recipeView(recipe)}
        roastEnabled={user.roastEnabled}
        cookedToday={!!log}
      />
      <RecipeReviewsPanel
        key={recipe.id}
        recipeId={recipe.id}
        viewerId={user.id}
        initial={reviews}
      />
      <RecipeDiscussion
        recipeId={recipe.id}
        viewerId={user.id}
        ingredients={recipeView(recipe).ingredients.map((item) => item.name)}
        discussion={discussion}
      />
      <RecipeSharing
        recipeId={recipe.id}
        friends={connections.filter((f) => f.status === 'accepted').map((f) => f.friend)}
        recipientIds={shares.map((s) => s.recipientId)}
      />
    </>
  );
}
