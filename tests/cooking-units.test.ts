import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCookingUnit, ingredientFromLine } from '../src/lib/cooking-units';
import { ingredientSchema } from '../src/lib/validation';
import { mergeIngredients } from '../src/lib/shopping';
import { cookingMeasurement } from '../src/lib/recipe-languages';

test('spoon spelling, punctuation, plurals and foreign aliases normalize without conversions', () => {
  for (const unit of ['teaspoon', 'teaspoons', 'TSP.', 'c. à c.', 'cuillères à café', 'cucharaditas', 'cucchiaini', 'Teelöffel', 'colheres de chá', 't'])
    assert.equal(normalizeCookingUnit(unit), 'tsp', unit);
  for (const unit of ['tablespoon', 'table spoons', 'tbsp.', 'c. à s.', 'cuillères à soupe', 'cucharadas', 'cucchiai', 'Esslöffel', 'colheres de sopa', 'T'])
    assert.equal(normalizeCookingUnit(unit), 'tbsp', unit);
  for (const [source, expected] of [['grammes', 'g'], ['kilograms', 'kg'], ['millilitres', 'ml'], ['litros', 'l'], ['lbs.', 'lb'], ['fluid ounces', 'fl oz'], ['boîtes', 'can'], ['pinches', 'pinch']])
    assert.equal(normalizeCookingUnit(source), expected);
  assert.equal(normalizeCookingUnit('heaped dessertspoon'), 'heaped dessertspoon');
  assert.equal(normalizeCookingUnit('cc'), 'ml', 'cubic centimetres must not become teaspoons');
  assert.equal(cookingMeasurement('2 tsp', 'fr'), '2 c. à café');
});
test('imports split mixed fractions, attached metric units and known multiword units', () => {
  for (const [source, quantity, unit, name] of [
    ['1½ teaspoons salt', '1½', 'tsp', 'salt'], ['1 1/2 c. à s. de sucre', '1 1/2', 'tbsp', 'sucre'],
    ['250g farine', '250', 'g', 'farine'], ['0,5 litros de agua', '0,5', 'l', 'agua'],
    ['2–3 tablespoons oil', '2–3', 'tbsp', 'oil'], ['4 fluid ounces milk', '4', 'fl oz', 'milk'],
  ]) assert.deepEqual(ingredientFromLine(source), { quantity, unit, name });
  for (const line of ['salt to taste', '1 (15-ounce) can beans', '2 heaped dessertspoons sugar'])
    assert.deepEqual(ingredientFromLine(line), { name: line, quantity: '', unit: '' });
  assert.deepEqual(ingredientSchema.parse({ name: 'salt', quantity: '1 teaspoon', unit: '' }), { name: 'salt', quantity: '1', unit: 'tsp' });
});
test('shopping sums multilingual aliases while keeping teaspoons and tablespoons separate', () => {
  assert.deepEqual(mergeIngredients([
    { name: 'salt', quantity: '1', unit: 'teaspoon' }, { name: 'salt', quantity: '2', unit: 'cuillères à café' },
    { name: 'salt', quantity: '1', unit: 'tablespoon' },
  ]), [{ name: 'salt', amounts: ['3 tsp', '1 tbsp'] }]);
});
