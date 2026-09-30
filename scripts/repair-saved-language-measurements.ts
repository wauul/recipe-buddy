import { Prisma, PrismaClient } from '@prisma/client';
import { recipeSchema } from '../src/lib/validation';
import {
  savedLanguages,
  recipeTranslationVersion,
  repairRecipeLanguageMeasurements,
} from '../src/lib/recipe-languages';
const fingerprint = (value: ReturnType<typeof savedLanguages>) =>
  JSON.stringify([
    value.pending,
    value.version,
    ...(['en', 'fr'] as const).map((locale) =>
      Object.entries(value[locale]).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
    ),
  ]);
async function main() {
  if (process.env.VERCEL_ENV !== 'production') {
    console.log('Saved cooking-measurement repair skipped outside production.');
    return;
  }
  const db = new PrismaClient();
  let cursor: string | undefined,
    count = 0;
  try {
    for (;;) {
      const recipes = await db.recipe.findMany({
        orderBy: { id: 'asc' },
        take: 25,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      if (!recipes.length) break;
      for (const recipe of recipes) {
        const saved = savedLanguages(recipe.translations);
        if (saved.version !== recipeTranslationVersion) continue;
        const translations = repairRecipeLanguageMeasurements(
          { ...recipeSchema.parse(recipe), roastLine: recipe.roastLine },
          saved,
        );
        if (fingerprint(translations) === fingerprint(saved)) continue;
        const result = await db.recipe.updateMany({
          where: {
            id: recipe.id,
            updatedAt: recipe.updatedAt,
            translations: {
              equals: recipe.translations === null ? Prisma.JsonNull : recipe.translations,
            },
          },
          data: { translations, updatedAt: recipe.updatedAt },
        });
        count += result.count;
      }
      cursor = recipes[recipes.length - 1].id;
    }
    console.log(
      `Saved cooking measurements repaired in ${count} language copies; authored recipes preserved.`,
    );
  } finally {
    await db.$disconnect();
  }
}
main().catch((error) => {
  console.error(
    'Saved measurement repair failed:',
    error instanceof Error ? error.name : 'unknown',
  );
  process.exitCode = 1;
});
