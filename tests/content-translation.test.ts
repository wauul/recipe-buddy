import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  protectCookingValues,
  restoreCookingValues,
  translationRequestSchema,
  translationBatch,
  validateTranslations,
} from '../src/lib/content-translation';

test('display translation preserves quantities, temperatures and source text', () => {
  const source = ['400 g flour', 'Bake at 200°C for 20 minutes.', '1/2 cup milk', '1.5 l water'];
  const translated = [
    '400 g de farine',
    'Cuire à 200°C pendant 20 minutes.',
    '1/2 tasse de lait',
    '1.5 l d’eau',
  ];
  assert.deepEqual(validateTranslations(source, { translations: translated }), translated);
  assert.deepEqual(source, [
    '400 g flour',
    'Bake at 200°C for 20 minutes.',
    '1/2 cup milk',
    '1.5 l water',
  ]);
  for (const incorrect of [
    'Bake at 200°F for 20 minutes.',
    'Bake at 180°C for 20 minutes.',
    'Bake at 200°C.',
  ])
    assert.throws(() => validateTranslations([source[1]], { translations: [incorrect] }));
  assert.throws(() =>
    validateTranslations(['400 g flour'], { translations: ['400 kg de farine'] }),
  );
  assert.throws(() => validateTranslations(['1.5 l water'], { translations: ['1,5 l d’eau'] }));
  assert.throws(() =>
    validateTranslations(['Store at -18°C'], { translations: ['Conserver à 18°C'] }),
  );
  assert.throws(() => validateTranslations(['¼ cup milk'], { translations: ['½ tasse de lait'] }));
});

test('incomplete or malformed translations never replace the originals', () => {
  for (const response of [
    { translations: [] },
    { translations: ['a', 'b'] },
    { translations: [''] },
    { translations: [42] },
    { error: 'no translation' },
  ])
    assert.throws(() => validateTranslations(['flour'], response));
});

test('roast sentences and measurement words cannot silently remain in the wrong language', () => {
  const roast = 'Oh great, another soup that cannot decide if it is a snack or a tragedy.';
  for (const source of [
    roast,
    '1 tablespoon',
    '2 slices',
    '1/4 cup water',
    'Silly Soup Sizzlers',
    'chicken backs and necks',
  ])
    assert.throws(() => validateTranslations([source], { translations: [source] }, 'fr'));
  assert.deepEqual(
    validateTranslations(
      [roast],
      { translations: ['Oh génial, encore une soupe qui hésite entre le goûter et la tragédie.'] },
      'fr',
    ),
    ['Oh génial, encore une soupe qui hésite entre le goûter et la tragédie.'],
  );
  assert.deepEqual(
    validateTranslations(
      ['500 g', 'Les tomates avec le basilic'],
      { translations: ['500 g', 'Les tomates avec le basilic'] },
      'fr',
    ),
    ['500 g', 'Les tomates avec le basilic'],
  );
  assert.throws(() =>
    validateTranslations(
      ['Faire cuire dans une casserole'],
      { translations: ['Faire cuire dans une casserole'] },
      'en',
    ),
  );
});

test('bounded batches retain every source string in order across large recipes', () => {
  const pending = new Set(Array.from({ length: 90 }, (_, i) => `${i}: ` + 'x'.repeat(1990)));
  const all = [...pending];
  const output: string[] = [];
  while (pending.size) {
    const texts = translationBatch(pending);
    assert.ok(texts.length > 0);
    assert.ok(translationRequestSchema.safeParse({ locale: 'fr', texts }).success);
    output.push(...texts);
    texts.forEach((text) => pending.delete(text));
  }
  assert.deepEqual(output, all);
  assert.equal(
    translationRequestSchema.safeParse({ locale: 'de', texts: ['flour'] }).success,
    false,
  );
  assert.equal(
    translationRequestSchema.safeParse({ locale: 'fr', texts: ['x'.repeat(4001)] }).success,
    false,
  );
  assert.equal(
    translationRequestSchema.safeParse({ locale: 'fr', texts: Array(4).fill('x'.repeat(4000)) })
      .success,
    false,
  );
});

test('cooking values are protected before the model sees them and restored without changes', () => {
  const source = [
    'Bake at 400°F (200°C) for 25 minutes.',
    '1/4 cup milk and 25 g flour',
    'Store at -18°C',
    '¼ cup oil',
  ];
  const protectedInput = protectCookingValues(source);
  assert.deepEqual(protectedInput.texts, [
    'Bake at ⟦V0⟧ (⟦V1⟧) for ⟦V2⟧ minutes.',
    '⟦V0⟧ cup milk and ⟦V1⟧ flour',
    'Store at ⟦V0⟧',
    '⟦V0⟧ cup oil',
  ]);
  const restored = restoreCookingValues(protectedInput, {
    translations: [
      'Cuire à ⟦V0⟧ (⟦V1⟧) pendant ⟦V2⟧ minutes.',
      '⟦V0⟧ tasse de lait et ⟦V1⟧ de farine',
      'Conserver à ⟦V0⟧',
      '⟦V0⟧ tasse d’huile',
    ],
  });
  assert.deepEqual(restored, [
    'Cuire à 400°F (200°C) pendant 25 minutes.',
    '1/4 tasse de lait et 25 g de farine',
    'Conserver à -18°C',
    '¼ tasse d’huile',
  ]);
  assert.deepEqual(validateTranslations(source, { translations: restored }, 'fr'), restored);
});

test('missing, duplicated or reordered value tokens cannot corrupt the cooking instructions', () => {
  const source = protectCookingValues(['Bake at 200°C for 25 minutes.']);
  for (const output of [
    'Cuire à 200°C pendant ⟦V1⟧ minutes.',
    'Cuire à ⟦V0⟧ pendant ⟦V0⟧ minutes.',
    'Cuire à ⟦V1⟧ pendant ⟦V0⟧ minutes.',
  ])
    assert.throws(() => restoreCookingValues(source, { translations: [output] }));
});
