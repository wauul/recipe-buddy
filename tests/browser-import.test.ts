import test from 'node:test';
import assert from 'node:assert/strict';
import { browserImportRecipe, readBrowserImport } from '../src/lib/browser-import';

const payload = {
  version: 1, sourceUrl: 'https://example.com/soup', recipe: {
    title: 'Soupe à l’oignon', imageUrl: 'https://example.com/soup.jpg', servings: 4,
    ingredients: ['2 onions', '1½ cups stock'], steps: ['Slice the onions.', 'Simmer for 20 minutes.'],
  },
};
test('browser imports preserve Unicode and split recognized publisher measurements without AI', () => {
  const imported = browserImportRecipe(readBrowserImport(JSON.stringify(payload)))!;
  assert.equal(imported.title, payload.recipe.title);
  assert.deepEqual(imported.ingredients, [{ name: '2 onions', quantity: '', unit: '' }, { name: 'stock', quantity: '1½', unit: 'cup' }]);
  assert.deepEqual(imported.steps, payload.recipe.steps);
  assert.equal(imported.servings, 4);
  assert.equal(imported.vibe, 'cozy');
});
test('URL-only imports use the existing editor URL import path', () => {
  const imported = readBrowserImport(JSON.stringify({ version: 1, sourceUrl: payload.sourceUrl }));
  assert.equal(browserImportRecipe(imported), undefined);
});
test('browser imports reject unsafe sources/images, incomplete data and oversized input', () => {
  for (const sourceUrl of ['javascript:alert(1)', 'http://example.com', 'https://user:pass@example.com']) {
    assert.throws(() => readBrowserImport(JSON.stringify({ ...payload, sourceUrl })));
  }
  for (const recipe of [
    { ...payload.recipe, imageUrl: 'data:text/html,hi' },
    { ...payload.recipe, ingredients: [] },
    { ...payload.recipe, steps: [''] },
    { ...payload.recipe, servings: 0 },
    { ...payload.recipe, ingredients: ['x'.repeat(121)] },
  ]) assert.throws(() => readBrowserImport(JSON.stringify({ ...payload, recipe })));
  assert.throws(() => readBrowserImport(' '.repeat(240001)));
  assert.throws(() => readBrowserImport('broken json'));
  assert.throws(() => readBrowserImport(JSON.stringify({ ...payload, version: 2 })));
});
