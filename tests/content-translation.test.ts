import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
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
