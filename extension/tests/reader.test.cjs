const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const reader = require('../recipe-reader');
const recipe = { '@type': 'Recipe', name: 'Tomato soup', recipeIngredient: ['2 tomatoes', '1 cup water'], recipeInstructions: [{ '@type': 'HowToStep', text: 'Chop tomatoes.' }], recipeYield: '4 servings', image: [{ contentUrl: '/soup.jpg' }] };
test('nested graphs, schema type arrays, images and HowToSections are extracted', () => {
  const [result] = reader.fromJson([{ '@graph': [{ ...recipe, '@type': ['Thing', 'https://schema.org/Recipe'], recipeInstructions: [{ '@type': 'HowToSection', name: 'Prep', itemListElement: recipe.recipeInstructions }] }] }], 'https://example.com/recipe');
  assert.equal(result.title, 'Tomato soup');
  assert.equal(result.servings, 4);
  assert.deepEqual(result.steps, ['Chop tomatoes.']);
  assert.equal(result.imageUrl, 'https://example.com/soup.jpg');
});
test('non-recipes, incomplete metadata and oversized fields never produce suggestions', () => {
  for (const candidate of [{ '@type': 'Article', name: 'A recipe' }, { ...recipe, recipeIngredient: [] }, { ...recipe, recipeInstructions: [] }, { ...recipe, recipeIngredient: ['x'.repeat(121)] }]) {
    assert.deepEqual(reader.fromJson([candidate], 'https://example.com'), []);
  }
});
test('duplicate recipes are deduplicated and unknown yields remain editable', () => {
  assert.equal(reader.fromJson([recipe, recipe], 'https://example.com').length, 1);
  assert.equal(reader.normalize({ ...recipe, recipeYield: '24 cookies' }, 'https://example.com').servings, 2);
  assert.equal(reader.normalize({ ...recipe, recipeYield: '4 personnes' }, 'https://example.com').servings, 4);
});
test('unsafe images and sources are not accepted', () => {
  assert.equal(reader.normalize({ ...recipe, image: undefined }, 'https://example.com').imageUrl, '');
  assert.equal(reader.httpsUrl('', 'https://example.com'), '');
  assert.equal(reader.normalize({ ...recipe, image: 'javascript:alert(1)' }, 'https://example.com').imageUrl, '');
  assert.equal(reader.httpsUrl('https://user:password@example.com/'), '');
  assert.equal(reader.httpsUrl('http://example.com/'), '');
});
function worker(settings = {}) {
  let handler;
  const opened = [], badges = [];
  const chrome = {
    runtime: { onMessage: { addListener: (fn) => { handler = fn; } } },
    storage: { local: { get: async () => settings } },
    tabs: { create: async (value) => opened.push(value) },
    action: { setBadgeText: (value) => badges.push(value), setBadgeBackgroundColor: () => {} },
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../background.js'), 'utf8'), { chrome, URL });
  return { opened, badges, send: (message, sender = {}) => new Promise((resolve) => handler(message, sender, resolve)) };
}
test('worker opens only a review URL with recipe in fragment, without cookies or API access', async () => {
  const w = worker({ appUrl: 'http://localhost:3000' });
  const payload = reader.payload('https://example.com/soup', reader.normalize(recipe, 'https://example.com'));
  assert.equal((await w.send({ type: 'OPEN_IMPORT', payload })).ok, true);
  const url = new URL(w.opened[0].url);
  assert.equal(url.origin, 'https://recipe-buddy-wauul.vercel.app', 'old saved localhost override is ignored');
  assert.equal(url.pathname, '/import'); assert.equal(url.search, '');
  assert.deepEqual(JSON.parse(decodeURIComponent(url.hash.slice(8))), payload);
});
test('worker ignores all saved destination overrides and rejects oversized or forged transfers', async () => {
  const payload = reader.payload('https://example.com/soup');
  for (const appUrl of ['javascript:alert(1)', 'http://evil.example', 'https://user:password@example.com', 'https://example.com/unexpected']) {
    const w = worker({ appUrl });
    assert.equal((await w.send({ type: 'OPEN_IMPORT', payload })).ok, true);
    assert.equal(new URL(w.opened[0].url).origin, 'https://recipe-buddy-wauul.vercel.app');
  }
  const w = worker();
  assert.ok((await w.send({ type: 'OPEN_IMPORT', payload }, { tab: { id: 1 }, frameId: 1, url: 'https://example.com' })).error);
  assert.ok((await w.send({ type: 'OPEN_IMPORT', payload }, { tab: { id: 1 }, frameId: 0, url: 'https://other.example' })).error);
  assert.ok((await w.send({ type: 'OPEN_IMPORT', payload: { ...payload, recipe: 'x'.repeat(240001) } })).error);
  assert.equal(w.opened.length, 0);
});
