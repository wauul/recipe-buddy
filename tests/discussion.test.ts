import { test } from 'node:test';
import assert from 'node:assert/strict';
import { takeSchema, takeTypes, commentSchema } from '../src/lib/discussion-validation';

test('takes support every category without requiring an ingredient or reason', () => {
  for (const type of Object.keys(takeTypes)) {
    const take = takeSchema.parse({ type, title: ' My spin ', change: ' Bake for 20 minutes instead. ' });
    assert.equal(take.title, 'My spin'); assert.equal(take.ingredient, ''); assert.equal(take.reason, '');
    assert.equal(take.change, 'Bake for 20 minutes instead.'); assert.equal(take.type, type);
  }
});
test('empty, oversized, and unknown take fields are rejected or stripped', () => {
  const valid = { title: 'Less oil', change: 'Use half as much.' };
  for (const invalid of [{ title: ' ' }, { change: ' ' }, { change: 'x'.repeat(2001) }, { type: 'unknown' }, { ingredient: 'x'.repeat(121) }]) {
    assert.equal(takeSchema.safeParse({ ...valid, ...invalid }).success, false);
  }
  assert.equal('authorId' in takeSchema.parse({ ...valid, authorId: 'spoofed' }), false);
});
test('comments distinguish recipe discussion from a take reply and enforce limits', () => {
  assert.equal(commentSchema.parse({ text: '  Delicious! ' }).takeId, null);
  assert.equal(commentSchema.parse({ text: ' Why? ', takeId: 'cmu12345678901234567890123' }).text, 'Why?');
  for (const invalid of [{ text: '' }, { text: ' ' }, { text: 'x'.repeat(2001) }, { text: 'Hi', takeId: 'bad' }]) {
    assert.equal(commentSchema.safeParse(invalid).success, false);
  }
});
