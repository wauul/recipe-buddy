import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  recipeLanguageSeed,
  recipeTexts,
  cookingMeasurement,
  repairRecipeLanguageMeasurements,
} from '../src/lib/recipe-languages';
import { translationIsUnnecessary, translationBatch } from '../src/lib/content-translation';
const original = {
  title: 'Bread',
  altTitle: 'Dough drama',
  roastLine: 'The bread is auditioning for a doorstop.',
  ingredients: [{ name: 'flour', quantity: '500', unit: 'g' }],
  steps: ['Bake at 200°C for 20 minutes.'],
};
test('saved bilingual recipe covers title, nickname, roast, ingredient names and quantity fragments, and every method', () => {
  const fields = recipeTexts(original);
  assert.deepEqual(fields, [
    'Bread',
    'Dough drama',
    original.roastLine,
    'flour',
    '500',
    'g',
    '500 g',
    original.steps[0],
  ]);
  const translations = {
    en: Object.fromEntries(fields.map((s) => [s, s])),
    fr: {
      Bread: 'Pain',
      'Dough drama': 'Drame de pâte',
      [original.roastLine]: 'Le pain passe une audition pour devenir un cale-porte.',
      flour: 'farine',
      '500': '500',
      g: 'g',
      '500 g': '500 g',
      [original.steps[0]]: 'Cuire à 200°C pendant 20 minutes.',
    },
    pending: false,
    version: 2,
  };
  const seed = recipeLanguageSeed({ ...original, translations });
  assert.equal(
    Object.getPrototypeOf(seed.en),
    Object.prototype,
    'server payload is a serializable plain object',
  );
  assert.equal(Object.getPrototypeOf(seed.fr), Object.prototype);
  assert.equal(seed.fr.flour, 'farine');
  assert.equal(seed.fr[original.roastLine], translations.fr[original.roastLine]);
  assert.equal(seed.fr[original.steps[0]], 'Cuire à 200°C pendant 20 minutes.');
  assert.equal(seed.pending, false);
  assert.equal(original.steps[0], 'Bake at 200°C for 20 minutes.');
});
test('missing or corrupted stored versions leave the original intact and never change cooking values', () => {
  const seed = recipeLanguageSeed({
    ...original,
    translations: {
      en: {},
      fr: { [original.steps[0]]: 'Cuire à 999°C pendant 20 minutes.' },
      pending: false,
      version: 2,
    },
  });
  assert.equal(seed.fr[original.steps[0]], original.steps[0]);
  assert.equal(seed.pending, true);
  assert.equal(recipeLanguageSeed(original).fr[original.roastLine], original.roastLine);
});
test('literal ingredient names that resemble object properties remain data', () => {
  const recipe = {
    ...original,
    ingredients: [{ name: '__proto__', quantity: '', unit: '' }],
    translations: JSON.parse(
      '{"en":{"__proto__":"__proto__"},"fr":{"__proto__":"nom"},"pending":false,"version":2}',
    ),
  };
  const seed = recipeLanguageSeed(recipe);
  assert.equal(seed.fr['__proto__'], 'nom');
  assert.equal({}.hasOwnProperty('polluted'), false);
});
test('already-target prose and numeric measurements bypass the provider, mixed language does not', () => {
  for (const text of ['500 g', '1/4', '200°C', '¼', '1.5 ml'])
    assert.equal(translationIsUnnecessary(text, 'fr'), true);
  assert.equal(translationIsUnnecessary('Preheat the oven and bake the bread.', 'en'), true);
  assert.equal(translationIsUnnecessary('Faire cuire les tomates dans une casserole.', 'fr'), true);
  assert.equal(translationIsUnnecessary('Preheat the oven and bake the bread.', 'fr'), false);
  assert.equal(
    translationIsUnnecessary('Faire cuire les tomates dans une casserole.', 'en'),
    false,
  );
  assert.equal(translationIsUnnecessary('Add the flour et cuire dans une casserole.', 'en'), false);
  assert.equal(translationIsUnnecessary('1 tablespoon', 'fr'), false);
});
test('provider-sized batches progress without losing a large step', () => {
  const sources = ['a'.repeat(3000), 'b'.repeat(3000), 'c'.repeat(4000)];
  assert.deepEqual(translationBatch(sources, 4500), [sources[0]]);
  assert.deepEqual(translationBatch([sources[2]], 1000), [sources[2]]);
});

test('legacy language versions await explicit regeneration and expose the original meanwhile', () => {
  const seed = recipeLanguageSeed({
    ...original,
    translations: { en: {}, fr: { Bread: 'Ancien pain' }, pending: false },
  });
  assert.equal(seed.pending, true);
  assert.equal(seed.fr.Bread, 'Bread');
});

test('saved cooking containers and pan-frying retain their culinary meaning', () => {
  assert.equal(cookingMeasurement('1 (15‑ounce) can', 'fr'), '1 boîte de 15 onces');
  assert.equal(cookingMeasurement('1/4 cup', 'fr'), '1/4 tasse');
  assert.equal(cookingMeasurement('2 cuillères à soupe', 'en'), '2 tablespoons');
  assert.equal(cookingMeasurement('You can bake it.', 'fr'), undefined);
  const recipe = {
    ...original,
    title: 'Pan‑Fried Tempeh Balls',
    ingredients: [{ name: 'white beans', quantity: '1 (15‑ounce) can', unit: '' }],
  };
  const saved = {
    en: {},
    fr: { [recipe.title]: 'Boulettes de tempeh panées', '1 (15‑ounce) can': '1 (15-once) peut' },
    pending: false,
    version: 2,
  };
  const repaired = repairRecipeLanguageMeasurements(recipe, saved);
  assert.equal(repaired.fr[recipe.title], 'Boulettes de tempeh poêlées');
  assert.equal(repaired.fr['1 (15‑ounce) can'], '1 boîte de 15 onces');
  assert.equal(recipe.ingredients[0].quantity, '1 (15‑ounce) can');
});
