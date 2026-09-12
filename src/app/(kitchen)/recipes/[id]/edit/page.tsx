import { notFound } from 'next/navigation';
import { currentUser, recipeView } from '@/lib/data';
import { db } from '@/lib/db';
import { RecipeForm } from '@/components/recipe-form';
export default async function EditRecipe({ params }: { params: { id: string } }) {
  const user = await currentUser(); const recipe = await db.recipe.findFirst({ where: { id: params.id, userId: user.id } });
  if (!recipe) notFound(); return <RecipeForm initial={recipeView(recipe)} />;
}
