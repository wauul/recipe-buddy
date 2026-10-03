import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { transpileModule, ModuleKind, ScriptTarget } from 'typescript';

function harness(allow = true) {
  const queries: any[] = [], limits: any[] = [];
  class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }
  const dependencies: Record<string, unknown> = {
    zod: require('zod'),
    './http': { HttpError },
    './rate-limit': { rateLimit: async (...args: unknown[]) => { limits.push(args); return allow; } },
    './db': { db: {
      userBlock: { findMany: async () => [{ blockerId: 'actor', blockedId: 'blocked-out' }, { blockerId: 'blocked-in', blockedId: 'actor' }] },
      user: { findMany: async (query: unknown) => { queries.push(query); return []; } },
    } },
  };
  const exports: any = {};
  runInContext(transpileModule(readFileSync('src/lib/native-chef-search.ts', 'utf8'), {
    compilerOptions: { module: ModuleKind.CommonJS, target: ScriptTarget.ES2022 },
  }).outputText, createContext({ exports, require: (name: string) => dependencies[name] }));
  return { ...exports, queries, limits };
}

test('chef suggestions expose only names and IDs, exclude both block directions, and have no directory pagination', async () => {
  const h = harness(); await h.findChefs('actor', '  Che  ');
  const query = JSON.parse(JSON.stringify(h.queries[0]));
  assert.deepEqual(query.select, { id: true, username: true });
  assert.equal(query.take, 5); assert.equal(query.cursor, undefined); assert.equal(query.skip, undefined);
  assert.ok(['actor', 'blocked-in', 'blocked-out'].every(id => query.where.id.notIn.includes(id)));
  assert.deepEqual(query.where.username, { startsWith: 'Che', mode: 'insensitive' });
  assert.deepEqual(JSON.parse(JSON.stringify(h.limits)), [['chef-search:minute:actor', 30], ['chef-search:hour:actor', 240, 3600]]);
});

test('chef search treats SQL wildcard characters as literal name characters', async () => {
  const h = harness(); await h.findChefs('actor', 'che%_\\');
  assert.equal(h.queries[0].where.username.startsWith, 'che\\%\\_\\\\');
});

test('chef search rejects short, email, hidden-control and oversized queries before querying users', async () => {
  const h = harness();
  for (const name of ['ab', 'chef@example.com', 'abc\u200b', 'ab\nc', 'a'.repeat(65)]) await assert.rejects(h.findChefs('actor', name));
  assert.equal(h.queries.length, 0);
});

test('chef search rate limits cannot be bypassed by varying the query', async () => {
  const h = harness(false);
  await assert.rejects(h.findChefs('actor', 'Chef'), (error: any) => error.status === 429);
  await assert.rejects(h.findChefs('actor', 'Other chef'), (error: any) => error.status === 429);
  assert.equal(h.queries.length, 0);
  assert.equal(h.limits[0][0], h.limits[1][0]);
});
