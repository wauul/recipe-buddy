import { cache } from 'react';
import { db } from './db';
import { chefProgress } from './chef-levels';

// Deduplicated within a server render, including the layout and recipe dashboard.
export const currentChefProgress = cache(async (chefId: string) => {
  const [recipeCount, reviews] = await Promise.all([
    db.recipe.count({ where: { userId: chefId } }),
    db.recipeReview.aggregate({
      where: { recipe: { userId: chefId } },
      _sum: { rating: true },
      _count: { _all: true },
    }),
  ]);
  return chefProgress(recipeCount, reviews._sum.rating ?? 0, reviews._count._all);
});
