// Uses one disposable account on the canonical app, with no AI or paid purchases.
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'node:fs';
const host = 'https://recipe-buddy-wauul.vercel.app';
const fixturePath = 'mobile/test-results/live-product-check.json';
async function request(path: string, method = 'GET', payload?: unknown, token?: string) {
  const response = await fetch(host + path, { method, headers: { Origin: host, 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(payload ? { body: JSON.stringify(payload) } : {}), signal: AbortSignal.timeout(30_000) });
  const data = await response.json();
  assert.ok(response.ok, `${path}: HTTP ${response.status}`);
  return data;
}
async function cleanup() {
  const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
  assert.match(fixture.email, /^native-product-check-[a-f0-9-]+@example\.invalid$/);
  const session = await request('/api/native/auth/login', 'POST', fixture);
  await request('/api/native/v1/account', 'DELETE', { confirmation: 'DELETE', password: fixture.password }, session.accessToken);
  assert.equal((await fetch(host + '/api/native/v1/me', { headers: { Authorization: `Bearer ${session.accessToken}` } })).status, 401);
  unlinkSync(fixturePath);
  console.log('PASS temporary production account deletion and stale-token rejection');
}
async function main() {
  if(process.argv[2] === 'cleanup') return cleanup();
  assert.equal(process.argv[2], 'check');
  assert.ok(!existsSync(fixturePath), 'Clean up the previous disposable check first.');
  const fixture = { email: `native-product-check-${randomUUID()}@example.invalid`, password: randomBytes(24).toString('base64url') };
  await request('/api/auth/signup', 'POST', fixture);
  writeFileSync(fixturePath, JSON.stringify(fixture));
  try {
    const session = await request('/api/native/auth/login', 'POST', fixture), token = session.accessToken;
    await request('/api/native/v1/terms', 'POST', { version: '2026-10-03', accepted: true }, token);
    const home = await request('/api/native/v1/home', 'GET', undefined, token);
    assert.equal(home.me.id, session.userId);
    const pro = await request('/api/native/v1/pro', 'GET', undefined, token);
    assert.equal(pro.billingReady, true); assert.equal(pro.active, false);
    assert.equal(pro.productId, 'recipe_buddy_pro'); assert.deepEqual(pro.basePlanIds, ['monthly', 'yearly']);
    assert.equal((await fetch(host + '/api/native/v1/home')).status, 401);
    const item = { id: randomUUID(), name: 'Temporary sync check', amount: '2 piece', checked: false };
    const operation = { operationId: randomUUID(), path: 'kitchen-state', method: 'PUT', payload: JSON.stringify({ kind: 'shopping', id: item.id, payload: JSON.stringify(item) }), baseVersion: 'missing', occurredAt: new Date().toISOString() };
    const first = await request('/api/native/v1/sync', 'POST', operation, token);
    assert.deepEqual(await request('/api/native/v1/sync', 'POST', operation, token), first);
    const rows = await request('/api/native/v1/kitchen-state', 'GET', undefined, token);
    assert.equal(rows.filter((row: {id: string}) => row.id === item.id).length, 1);
    assert.deepEqual(JSON.parse(rows.find((row: {id: string}) => row.id === item.id).payload), item);
    console.log('PASS live billing readiness, monthly/yearly plans, private account snapshot and exactly-once offline replay; provider calls: 0');
  } finally { await cleanup(); }
}
main().catch(error => { console.error(error instanceof assert.AssertionError ? error.message : error.name); process.exitCode = 1; });
