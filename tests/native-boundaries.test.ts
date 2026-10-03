import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeIngredient, rankRecipes } from '../src/lib/ingredient-match';
import { opaqueToken, tokenHash, validPkce } from '../src/lib/native-crypto';
import { nativeContext } from '../src/lib/native-context';

const ingredient = (name: string, quantity = '', unit = '') => ({ name, quantity, unit });
test('EN/FR accents, plurals, synonyms retain meaningful distinctions', () => {
  assert.equal(normalizeIngredient(' Œufs '), 'egg');
  assert.equal(normalizeIngredient('Tomates'), 'tomato');
  assert.equal(normalizeIngredient('riz'), 'rice');
  assert.equal(normalizeIngredient('lait d’amande'), 'almond milk');
  assert.notEqual(normalizeIngredient('lait d’amande'), normalizeIngredient('lait'));
  assert.notEqual(normalizeIngredient('farine d’amandes'), normalizeIngredient('farine'));
  assert.equal(normalizeIngredient('green onions'), 'scallion');
  assert.notEqual(normalizeIngredient('spring mix'), 'onion');
});
test('matching ranks missing ingredients first with stable ties and quantity caveats', () => {
  const base = [ingredient('tomato', '1'), ingredient('egg', '2'), ingredient('rice', '100', 'g')];
  const recipes = [{ id: 'b', ingredients: [...base, ingredient('oil')] }, { id: 'a', ingredients: base }];
  const matches = rankRecipes(recipes, [ingredient('tomate'), ingredient('oeufs'), ingredient('riz')]);
  assert.equal(matches[0].recipe.id, 'a'); assert.equal(matches[0].quantityCaveat, 'unknown');
  assert.equal(matches[0].allFound, true); assert.deepEqual(matches[1].missing.map(i => i.name), ['oil']);
  const insufficient = rankRecipes([recipes[1]], [ingredient('tomato', '1'), ingredient('egg', '1'), ingredient('rice', '100', 'g')]);
  assert.equal(insufficient[0].quantityCaveat, 'insufficient');
  assert.equal(rankRecipes([{ id: 'c', ingredients: [ingredient('oil (optional)')] }], [ingredient('rice')])[0].required, 0);
});
test('duplicate requirements and incompatible amounts do not overclaim', () => {
  const duplicates = [{ id: 'x', ingredients: [ingredient('rice', '100', 'g'), ingredient('riz', '100', 'g')] }];
  assert.equal(rankRecipes(duplicates, [ingredient('rice', '150', 'g')])[0].quantityCaveat, 'insufficient');
  assert.equal(rankRecipes(duplicates, [ingredient('rice', '1', 'cup')])[0].quantityCaveat, 'unknown');
});
test('random opaque tokens and S256 PKCE reject wrong verifier', () => {
  const token = opaqueToken(); assert.equal(token.length, 43); assert.notEqual(token, opaqueToken());
  assert.notEqual(tokenHash(token), token);
  assert.ok(validPkce(token, tokenHash(token))); assert.ok(!validPkce(opaqueToken(), tokenHash(token)));
  assert.ok(!validPkce('short', tokenHash(token))); assert.ok(!validPkce(token, 'bad'));
});
test('native request scope is exact, isolated and does not survive its adapter', async () => {
  const one = new Request('https://example.test/api/native/v1/recipes'), other = new Request('https://example.test/api/recipes');
  await nativeContext.run({ userId: 'chef-a', request: one }, async () => {
    assert.equal(nativeContext.getStore()?.userId, 'chef-a');
    assert.notEqual(nativeContext.getStore()?.request, other);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(nativeContext.getStore()?.request, one);
  });
  assert.equal(nativeContext.getStore(), undefined);
});
