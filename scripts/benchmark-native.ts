// Synthetic account only. Never log credentials or recipe content.
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const fixture = JSON.parse(readFileSync('mobile/test-results/live-backend-check.json', 'utf8'));
assert.match(fixture.email, /^native-live-check-[a-f0-9-]+@example\.invalid$/);
const host = 'https://recipe-buddy-wauul.vercel.app';
let token = '';
let lastMs = 0;
async function request(path: string, payload?: unknown) {
  const start = performance.now();
  const response = await fetch(host + path, { method: payload ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(payload ? { body: JSON.stringify(payload) } : {}), signal: AbortSignal.timeout(30_000) });
  assert.ok(response.ok, `${path}: HTTP ${response.status}`);
  const data = await response.json();
  lastMs = Math.round(performance.now() - start);
  console.log(JSON.stringify({ path, ms: lastMs }));
  return data;
}
async function main() {
  const start = performance.now();
  const session = await request('/api/native/auth/login', { email: fixture.email, password: fixture.password });
  token = session.accessToken;
  if (process.argv.includes('--roast')) {
    try {
      const pro = await request('/api/native/v1/pro'); assert.equal(pro.active, false); assert.equal(pro.billingReady, false);
      for (const language of ['en', 'fr']) {
        const recipe = await request('/api/native/v1/recipes', { title: 'Synthetic roast verification ' + language, servings: 1, ingredients: [{ name: language === 'fr' ? 'tomate' : 'tomato', quantity: '1', unit: '' }], steps: [language === 'fr' ? 'Coupez la tomate.' : 'Slice the tomato.'], altTitle: '', vibe: 'cozy', imageUrl: '' });
        try {
          const input = { step: 0, language, servings: 1, roast: true, variation: 0 };
          const result = await request(`/api/native/v1/recipes/${recipe.id}/chef-roast`, input);
          assert.equal(result.language, language); assert.match(result.roast, /\b(you|your|tu|toi|ton|ta|tes|vous|votre)\b/i);
          console.log(JSON.stringify({ syntheticRoast: result }));
          assert.deepEqual(await request(`/api/native/v1/recipes/${recipe.id}/chef-roast`, input), result);
          const refresh = await fetch(host + `/api/native/v1/recipes/${recipe.id}/chef-roast`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ ...input, variation: 1 }) }); assert.equal(refresh.status, 402);
        } finally {
          const response = await fetch(host + '/api/native/v1/recipes/' + recipe.id, { method: 'DELETE', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: '{}' }); assert.equal(response.status, 200);
        }
      }
      console.log('PASS English/French cook-directed roasts, persistent allowance and Pro refresh gate');
    } finally { await request('/api/native/auth/logout', { refreshToken: session.refreshToken }); }
    return;
  }
  if (process.argv.includes('--save')) {
    const recipe = await request('/api/native/v1/recipes', { title: 'Fast save verification', servings: 1, ingredients: [{ name: 'tomato', quantity: '1', unit: '' }], steps: ['Slice the tomato.'], altTitle: '', vibe: 'cozy', imageUrl: '' });
    try {
      assert.ok(lastMs < 1500, 'Save should return within 1.5 seconds');
      assert.equal(recipe.translations.pending, true, 'Save returns before optional translation work');
      assert.equal((await request('/api/native/v1/recipes/' + recipe.id)).title, 'Fast save verification');
    } finally {
      const response = await fetch(host + '/api/native/v1/recipes/' + recipe.id, { method: 'DELETE', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: '{}' });
      assert.equal(response.status, 200);
      await request('/api/native/auth/logout', { refreshToken: session.refreshToken });
    }
    console.log('PASS fast save, immediate original read, background language preparation and synthetic recipe cleanup');
    return;
  }
  if (process.argv.includes('--coach')) {
    let previousRoast = '';
    const cases = process.argv.includes('--coach-en-only') ? [['en', true, 2] as const] : [['en', false, 0], ['fr', true, 0], ['fr', true, 1], ['en', true, 1]] as const;
    for (const [language, roast, variation] of cases) {
      const answer = await request(`/api/native/v1/recipes/${fixture.recipeId}/coach`, { step: 0, language, roast, variation, servings: 1, previousRoast });
      assert.equal(answer.source, 'ai'); assert.equal(answer.language, language);
      assert.notEqual(answer.guidance, 'Slice the tomato.');
      if (roast) { assert.ok(answer.roast); assert.notEqual(answer.roast, previousRoast); }
      previousRoast = answer.roast;
      console.log(JSON.stringify({ syntheticCoaching: answer }));
    }
    await request('/api/native/auth/logout', { refreshToken: session.refreshToken });
    return;
  }
  const times: number[] = [];
  for (let i = 0; i < 3; i++) {
    const begin = performance.now();
    if (process.argv.includes('--bootstrap')) {
      const home = await request('/api/native/v1/home');
      assert.equal(home.me.id, fixture.userId);
      assert.ok(home.recipes.items.some((r: { id: string }) => r.id === fixture.recipeId));
    } else {
      for (const path of ['me', 'recipes', 'friends', 'blocks', 'shared-recipes']) await request('/api/native/v1/' + path);
    }
    times.push(Math.round(performance.now() - begin));
  }
  await request('/api/native/auth/logout', { refreshToken: session.refreshToken });
  console.log(JSON.stringify({ homeMs: times, totalMs: Math.round(performance.now() - start) }));
  if (process.argv.includes('--assert-fast')) assert.ok(Math.max(...times) < 600, 'RED: home loading exceeds 600-ms warm-load budget');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
