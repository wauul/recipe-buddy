import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeIngredients, quantityNumber } from '../src/lib/shopping';
import { weekProgress } from '../src/lib/streak';
import { recipeSchema, credentialsSchema } from '../src/lib/validation';
import { isPublicAddress, recipeUrlText } from '../src/lib/recipe-url';

test('shopping merges case, whitespace, unit aliases and fractions', () => {
  assert.deepEqual(mergeIngredients([
    { name: ' Flour ', quantity: '1 1/2', unit: 'cups' },
    { name: 'flour', quantity: '½', unit: 'cup' },
    { name: 'FLOUR', quantity: '200', unit: 'g' },
    { name: 'salt', quantity: 'to taste', unit: '' },
    { name: 'salt', quantity: 'to taste', unit: '' }
  ]), [{ name: 'flour', amounts: ['2 cup', '200 g'] }, { name: 'salt', amounts: ['to taste'] }]);
});
test('ambiguous quantities are preserved, not silently summed', () => {
  for (const text of ['1-2', 'to taste', '1/0', '']) assert.equal(quantityNumber(text), null);
  assert.equal(quantityNumber('1½'), 1.5);
  assert.equal(quantityNumber('0.25'), 0.25);
  assert.deepEqual(mergeIngredients([{ name: 'egg', quantity: '1-2', unit: '' }]), [{ name: 'egg', amounts: ['1-2'] }]);
});
test('cooking progress counts distinct UTC days within current week', () => {
  const now = new Date('2026-09-11T20:00:00Z');
  const progress = weekProgress(['2026-09-06', '2026-09-07', '2026-09-07', '2026-09-09', '2026-09-11', '2026-09-12'].map(d => new Date(d)), now);
  assert.equal(progress.count, 3); assert.equal(progress.mascot, '😃');
  assert.deepEqual(progress.days, [true, false, true, false, true, false, false]);
  assert.equal(weekProgress([], now).mascot, '😴');
  assert.equal(weekProgress([new Date('2026-09-11')], now).mascot, '🙂');
  assert.equal(weekProgress([7, 8, 9, 10, 11].map(d => new Date(`2026-09-${String(d).padStart(2, '0')}`)), now).mascot, '🔥');
});
test('Monday rollover and year boundary reset weekly count', () => {
  assert.equal(weekProgress([new Date('2026-09-13')], new Date('2026-09-14')).count, 0);
  assert.equal(weekProgress([new Date('2025-12-29')], new Date('2026-01-01')).count, 1);
});
test('recipe validation rejects malformed AI output', () => {
  for (const input of [{}, { error: 'No recipe found' }, { title: 'Soup', servings: -1, ingredients: [], steps: [] }]) assert.equal(recipeSchema.safeParse(input).success, false);
  assert.equal(recipeSchema.safeParse({ title: 'Soup', servings: 2, ingredients: [{ name: 'water', quantity: '1', unit: 'l' }], steps: ['Boil.'], vibe: 'dangerous' }).success, false);
});
test('credentials normalize emails and enforce bcrypt byte limit', () => {
  assert.equal(credentialsSchema.parse({ email: ' CHEF@example.com ', password: 'password123' }).email, 'chef@example.com');
  assert.equal(credentialsSchema.safeParse({ email: 'chef@example.com', password: '🔥'.repeat(30) }).success, false);
});
test('URL importer blocks private, mapped, loopback and reserved addresses', async () => {
  for (const address of ['127.0.0.1', '10.0.0.1', '169.254.169.254', '192.168.1.1', '172.16.0.1', '::1', '::ffff:127.0.0.1', 'fc00::1', '0.0.0.0']) assert.equal(isPublicAddress(address), false, address);
  assert.equal(isPublicAddress('8.8.8.8'), true);
  await assert.rejects(recipeUrlText('http://example.com'), /HTTPS/);
  await assert.rejects(recipeUrlText('https://user:pass@example.com'), /HTTPS/);
});
