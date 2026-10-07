import { SavedRecipeLanguages } from '@/components/content-translation';
import { recipeView } from '@/lib/data';
import { currentUser } from '@/lib/data';
import { db } from '@/lib/db';
import { MealShoppingDestination } from '@/components/meal-shopping-destination';
export default async function ShoppingPage() {
  const user = await currentUser();
  const recipes = await db.recipe.findMany({
    where: { userId: user.id },
    orderBy: { title: 'asc' },
  });
  return (
    <>
      <SavedRecipeLanguages recipes={recipes.map(recipeView)} />
      <MealShoppingDestination recipes={recipes.map(r=>({id:r.id,title:r.title,servings:r.servings,imageUrl:r.imageUrl}))} userId={user.id} />
    </>
  );
}
