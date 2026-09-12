import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from './auth';
import { db } from './db';
import { recipeSchema, type RecipeView } from './validation';
import type { Recipe } from '@prisma/client';
export async function currentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login');
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { id: true, email: true, roastEnabled: true } });
  if (!user) redirect('/login');
  return user;
}
export function recipeView(recipe: Recipe): RecipeView {
  return { ...recipeSchema.parse(recipe), id: recipe.id, roastLine: recipe.roastLine, createdAt: recipe.createdAt.toISOString() };
}
