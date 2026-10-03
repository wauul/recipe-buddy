// Explicit production deployment check. Uses only a temporary account, never real chef data.
import { PrismaClient } from '@prisma/client';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import assert from 'node:assert/strict';
const host = 'https://recipe-buddy-wauul.vercel.app';
const inputFile = 'mobile/test-results/live-backend-check.json';
const dbUrl = new URL(process.env.DATABASE_URL!);
assert.equal(dbUrl.hostname, 'ep-small-field-ae2jajhf.c-2.us-east-2.aws.neon.tech');
assert.equal(dbUrl.pathname, '/neondb');
const db = new PrismaClient();
async function json(path: string, method = 'GET', payload?: unknown, token?: string) {
  const response = await fetch(host + path, { method, headers: { Origin: host, 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(payload ? { body: JSON.stringify(payload) } : {}), signal: AbortSignal.timeout(30_000) });
  const result = await response.json();
  assert.ok(response.ok, `${path}: HTTP ${response.status}`);
  return result;
}
async function main() {
  if (process.argv[2] === 'cleanup') {
    const fixture = JSON.parse(readFileSync(inputFile, 'utf8'));
    assert.match(fixture.email, /^native-live-check-[a-f0-9-]+@example\.invalid$/);
    const session = await json('/api/native/auth/login', 'POST', { email: fixture.email, password: fixture.password });
    await json('/api/native/v1/account', 'DELETE', { confirmation: 'DELETE', password: fixture.password }, session.accessToken);
    assert.equal(await db.user.count({ where: { id: fixture.userId } }), 0);
    assert.equal(await db.recipe.count({ where: { id: fixture.recipeId } }), 0);
    assert.equal(await db.nativeSession.count({ where: { userId: fixture.userId } }), 0);
    assert.equal((await fetch(host + '/api/native/v1/me', { headers: { Authorization: `Bearer ${session.accessToken}` } })).status, 401);
    unlinkSync(inputFile);
    console.log('PASS temporary live account/recipe/session deletion and stale-token rejection');
    console.log(JSON.stringify({ users: await db.user.count(), recipes: await db.recipe.count() }));
    return;
  }
  assert.equal(process.argv[2], 'prepare');
  const baseline = { users: await db.user.count(), recipes: await db.recipe.count() };
  const email = `native-live-check-${randomUUID()}@example.invalid`, password = randomBytes(24).toString('base64url');
  await json('/api/auth/signup', 'POST', { email, password });
  const user = await db.user.findUniqueOrThrow({ where: { email } });
  // Directly seed this temporary recipe to avoid invoking save-time model providers.
  await db.user.update({ where: { id: user.id }, data: { username: 'Backend connection check', roastEnabled: false } });
  const recipe = await db.recipe.create({ data: { userId: user.id, title: 'Live backend connection check', servings: 1, vibe: 'cozy', ingredients: [{ name: 'tomato', quantity: '1', unit: '' }], steps: ['Slice the tomato.', 'Serve.'] } });
  writeFileSync(inputFile, JSON.stringify({ email, password, userId: user.id, recipeId: recipe.id, title: recipe.title, baseline }));
  const native = await json('/api/native/auth/login', 'POST', { email, password });
  assert.equal(native.userId, user.id);
  await json('/api/native/v1/terms', 'POST', { version: '2026-10-03', accepted: true }, native.accessToken);
  const me = await json('/api/native/v1/me', 'GET', undefined, native.accessToken);
  assert.equal(me.id, user.id);
  const collection = await json('/api/native/v1/recipes', 'GET', undefined, native.accessToken);
  assert.equal(collection.items.length, 1); assert.equal(collection.items[0].id, recipe.id);
  assert.equal((await json('/api/native/v1/recipes/' + recipe.id, 'GET', undefined, native.accessToken)).title, recipe.title);
  const cookies = new Map<string, string>();
  function keepCookies(response: Response) { for (const value of response.headers.getSetCookie()) { const cookie = value.split(';')[0], split = cookie.indexOf('='); cookies.set(cookie.slice(0, split), cookie.slice(split + 1)); } }
  const csrfResponse = await fetch(host + '/api/auth/csrf'); keepCookies(csrfResponse); const csrf = await csrfResponse.json();
  const credentialsResponse = await fetch(host + '/api/auth/callback/credentials', { method: 'POST', redirect: 'manual', headers: { Origin: host, 'Content-Type': 'application/x-www-form-urlencoded', Cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join('; ') }, body: new URLSearchParams({ csrfToken: csrf.csrfToken, email, password, callbackUrl: host + '/recipes', json: 'true' }) });
  keepCookies(credentialsResponse);
  const webResponse = await fetch(host + '/api/recipes', { headers: { Cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join('; ') } });
  assert.equal(webResponse.status, 200); const web = await webResponse.json(); assert.equal(web.length, 1); assert.equal(web[0].id, recipe.id);
  const google = await json('/api/native/auth/google-begin', 'POST', {}); assert.equal(google.clientId, '937046985935-rr9mg53ap3qbdc4ncqm8jf7ns1vmu0si.apps.googleusercontent.com');
  await json('/api/native/auth/logout', 'POST', { refreshToken: native.refreshToken });
  console.log('PASS live signup, terms, mobile password session, recipe reads, web cookie session and identical web/mobile recipe IDs; Google nonce/audience ready');
  console.log('Temporary phone check input saved privately; credentials omitted; model-provider calls: 0');
}
main().catch(error => { console.error(error instanceof assert.AssertionError ? error.message : (error.code || error.name)); process.exitCode = 1; }).finally(() => db.$disconnect());
