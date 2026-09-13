import test from 'node:test';
import assert from 'node:assert/strict';
import { recipePage } from '../src/lib/recipe-page';
import { imageSchema } from '../src/lib/validation';
import { friendPair } from '../src/lib/social-policy';

test('website photos prefer Recipe JSON-LD over generic social images', () => {
  const page = recipePage('<meta property="og:image" content="/logo.jpg"><script type="application/ld+json">{"@graph":[{"@type":["Recipe"],"image":[{"url":"../food.jpg"}]}]}</script><article>Mix tomatoes.</article>', 'https://example.com/recipes/pasta');
  assert.equal(page.imageUrl, 'https://example.com/food.jpg');
  assert.equal(page.text, 'Mix tomatoes.');
});
test('malformed metadata and unsafe image URLs preserve text import', () => {
  const page = recipePage('<script type="application/ld+json">broken</script><meta property="og:image" content="javascript:alert(1)"><meta name="twitter:image" content="//cdn.example.com/soup.jpg"><main>Boil soup.</main>', 'https://example.com/');
  assert.equal(page.imageUrl, 'https://cdn.example.com/soup.jpg');
  assert.equal(page.text, 'Boil soup.');
  assert.equal(recipePage('<p>Cook rice.</p>', 'https://example.com').imageUrl, '');
});
test('structured recipe content takes priority over unrelated page text', () => {
  const page = recipePage('<script type="application/ld+json">{"@type":"Recipe","name":"Soup","recipeYield":2,"recipeIngredient":["1 cup water"],"recipeInstructions":[{"text":"Boil water"}]}</script><article>Unrelated recommendations</article>', 'https://example.com/soup');
  assert.equal(JSON.parse(page.text).title, 'Soup');
  assert.ok(!page.text.includes('Unrelated'));
});
test('photo validation allows raster uploads and HTTPS, rejects executable schemes and oversized data', () => {
  for (const value of ['', 'https://example.com/food.jpg', 'data:image/webp;base64,AAAA']) assert.equal(imageSchema.safeParse(value).success, true);
  for (const value of ['javascript:alert(1)', 'http://example.com/photo', 'data:image/svg+xml;base64,AAAA', 'https://user:password@example.com/a', 'a'.repeat(300001)]) assert.equal(imageSchema.safeParse(value).success, false);
});
test('crossed friend requests have one canonical pair and self requests are rejected', () => {
  assert.deepEqual(friendPair('b', 'a'), friendPair('a', 'b'));
  assert.throws(() => friendPair('a', 'a'));
});
