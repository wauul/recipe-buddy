import { SavedRecipeLanguages } from '@/components/content-translation';
import { recipeView } from '@/lib/data';
import { currentUser } from '@/lib/data';
import { db } from '@/lib/db';
import { ShoppingList } from '@/components/shopping-list';
import {MealShoppingLink} from '@/components/meal-shopping-link';
export default async function ShoppingPage() {
  const user = await currentUser();
  const recipes = await db.recipe.findMany({
    where: { userId: user.id },
    orderBy: { title: 'asc' },
  });
  return (
    <>
      <MealShoppingLink/>
      <SavedRecipeLanguages recipes={recipes.map(recipeView)} />
      <ShoppingList recipes={recipes} userId={user.id} />
    </>
  );
}
