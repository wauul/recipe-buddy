import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { recipeTexts } from '../src/lib/recipe-languages';
import { recipeSchema } from '../src/lib/validation';

// Run after test-native-integration. Its block/revoke checks intentionally remove
// friendships, so restore fixture-only content for the subsequent native UI walk.
const url = new URL(process.env.DATABASE_URL!);
assert.equal(url.hostname, '127.0.0.1');
assert.equal(url.port, '55432');
assert.equal(url.pathname, '/recipe_buddy_test');
assert.equal(process.env.GROQ_API_KEY, '');
assert.equal(process.env.NEXTAUTH_URL, 'http://localhost:3002');
const db = new PrismaClient();
async function main() {
  // Repeated UI runs must not trip fixture login limits or fill the collection
  // with saved draft cases. These rows exist only in the guarded local test DB.
  await db.rateLimit.deleteMany();
  const a = await db.user.findUniqueOrThrow({ where: { email: 'native-a@example.test' } });
  await db.user.update({ where: { id: a.id }, data: { roastEnabled: true } });
  await db.recipe.deleteMany({ where: { userId: a.id, title: { startsWith: 'Draft with a very long recipe name' } } });
  const b = await db.user.findUniqueOrThrow({ where: { email: 'native-b@example.test' } });
  const [userAId, userBId] = [a.id, b.id].sort();
  const friendship = await db.friendship.upsert({ where: { userAId_userBId: { userAId, userBId } },
    create: { userAId, userBId, requesterId: a.id, acceptedAt: new Date() }, update: { acceptedAt: new Date() } });
  const own = await db.recipe.findFirstOrThrow({ where: { userId: a.id, title: { in: ['Edited without resetting the allowance', 'Tomato, egg & rice'] } } });
  const roast = 'Three ingredients, one pan. Even your dishwasher is impressed.';
  const original = Object.fromEntries(recipeTexts({ ...recipeSchema.parse({ ...own, title: 'Tomato, egg & rice' }), roastLine: roast }).map(text => [text, text]));
  await db.recipe.update({ where: { id: own.id }, data: { title: 'Tomato, egg & rice', roastLine: roast, translations: { en: original, fr: {
    ...original,
    'Tomato, egg & rice': 'Riz, tomates et œufs', [roast]: 'Trois ingrédients, une poêle. Même votre lave-vaisselle est impressionné.',
    tomato: 'tomate', egg: 'œuf', rice: 'riz',
    'Prepare the tomatoes and beat the eggs.': 'Préparez les tomates et battez les œufs.',
    'Cook rice for 10 minutes. Check texture, then stir in tomatoes and egg.': 'Faites cuire le riz pendant 10 minutes. Vérifiez la texture, puis ajoutez les tomates et les œufs.',
  }, pending: false, version: 2 } } });
  await db.recipe.updateMany({ where: { userId: a.id, title: 'Test recipe · Rice with onion' }, data: { vibe: 'lazy' } });
  await db.recipe.updateMany({ where: { userId: a.id, title: 'Test recipe · Fractions' }, data: { vibe: 'chaotic' } });
  const shared = await db.recipe.upsert({ where: { id: 'cnativedesignsharedrecipe' }, update: {}, create: {
    id: 'cnativedesignsharedrecipe', userId: b.id, title: 'Herby tomato rice', servings: 2, vibe: 'fancy',
    ingredients: [{ name: 'tomato', quantity: '2', unit: '' }, { name: 'rice', quantity: '200', unit: 'g' }, { name: 'basil', quantity: '1', unit: 'handful' }],
    steps: ['Cook rice for 10 minutes. Check its texture.', 'Fold in tomatoes and basil, then serve.'],
    translations: { en: {}, fr: { 'Herby tomato rice': 'Riz aux tomates et aux herbes' }, pending: false },
  } });
  await db.recipeShare.upsert({ where: { recipeId_recipientId: { recipeId: shared.id, recipientId: a.id } },
    create: { recipeId: shared.id, recipientId: a.id, friendshipId: friendship.id }, update: {} });
  console.log('Native design fixtures ready on the isolated local database.');
}
main().finally(() => db.$disconnect());
