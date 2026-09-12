import { currentUser } from '@/lib/data';
import { db } from '@/lib/db';
import { ShoppingList } from '@/components/shopping-list';
export default async function ShoppingPage() {
  const user = await currentUser();
  const recipes = await db.recipe.findMany({ where: { userId: user.id }, select: { id: true, title: true, servings: true }, orderBy: { title: 'asc' } });
  return <ShoppingList recipes={recipes} userId={user.id} />;
}
