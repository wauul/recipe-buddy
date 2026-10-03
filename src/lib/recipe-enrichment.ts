import { after } from 'next/server';
import { db, transactionScope } from './db';
import { roastRecipe } from './ai';
import { prepareRecipeLanguages } from './translate';
import { recipeSchema } from './validation';
import { recipeLanguageSeed } from './recipe-languages';
import { rateLimit } from './rate-limit';
import type { Recipe } from '@prisma/client';

export function enrichRecipeLater(recipe: Recipe, roastEnabled: boolean, previous?: unknown) {
  // Next keeps this work alive after the response on Vercel. Saves never wait on AI.
  // The version check prevents an old job overwriting a newer edit or deleted recipe.
  after(async () => transactionScope.exit(async () => {
    try {
      // A pending native recipe can retry automatically after an outage. The
      // distributed version lease prevents overlapping reads/saves from paying
      // for duplicate jobs; completed versions never call a provider again.
      if (!(await rateLimit(`recipe-enrichment:${recipe.id}:${recipe.updatedAt.toISOString()}`, 1, 300))) return;
      if (!(await rateLimit(`recipe-enrichment:${recipe.userId}`, 20))) return;
      const current = await db.recipe.findFirst({ where: { id: recipe.id, userId: recipe.userId, updatedAt: recipe.updatedAt } });
      if (!current) return;
      const input = recipeSchema.parse(current);
      if (!recipeLanguageSeed({ ...input, roastLine: current.roastLine, translations: current.translations }).pending) return;
      const roastLine = current.roastLine || await roastRecipe(input, roastEnabled);
      const translations = await prepareRecipeLanguages(recipe.userId, { ...input, roastLine }, previous ?? current.translations);
      await db.recipe.updateMany({ where: { id: recipe.id, userId: recipe.userId, updatedAt: recipe.updatedAt },
        data: { roastLine, translations, updatedAt: recipe.updatedAt } });
    } catch { console.warn('Recipe enrichment remains pending'); }
  }));
}
