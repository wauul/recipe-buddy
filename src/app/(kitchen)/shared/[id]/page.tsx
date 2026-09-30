import { notFound } from 'next/navigation';
import { currentUser, recipeView } from '@/lib/data';
import { db } from '@/lib/db';
import { sharedRecipeWhere } from '@/lib/social-policy';
import { RecipeDiscussion } from '@/components/recipe-discussion';
import { SharedRecipeDetail } from '@/components/shared-recipe-detail';
import { displayUsername } from '@/lib/username';
import { recipeDiscussion } from '@/lib/discussion';
import { RecipeReviewsPanel } from '@/components/recipe-reviews';
import { recipeReviews } from '@/lib/reviews';
import { currentChefProgress } from '@/lib/chefs';
export default async function SharedRecipePage({ params }: { params: { id: string } }) {
  const user = await currentUser();
  const share = await db.recipeShare.findFirst({
    where: sharedRecipeWhere(user.id, params.id),
    include: {
      recipe: {
        include: { user: { select: { email: true, username: true } } },
      },
    },
  });
  if (!share) notFound();
  const recipe = recipeView(share.recipe);
  const [discussion, reviews, chef] = await Promise.all([
    recipeDiscussion(recipe.id, user.id),
    recipeReviews(recipe.id, user.id),
    currentChefProgress(share.recipe.userId),
  ]);
  return (
    <>
      <SharedRecipeDetail
        recipe={recipe}
        sharedBy={displayUsername(share.recipe.user)}
        roastEnabled={user.roastEnabled}
        chefLevel={chef.current}
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
        ingredients={recipe.ingredients.map((item) => item.name)}
        discussion={discussion}
      />
    </>
  );
}
