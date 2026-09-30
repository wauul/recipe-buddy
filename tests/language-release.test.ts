import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';

type History = { migration_name: string; checksum: string; finished_at: Date | null }[];
const prerequisiteNames = [
  '20260911000000_init',
  '20260914000000_social',
  '20260914010000_recipe_photos',
  '20260915000000_recipe_updated_at',
  '20260916000000_recipe_discussion',
  '20260916010000_usernames',
  '20260930000000_google_chefs_reviews',
];
const completed: History = prerequisiteNames.map((migration_name) => ({
  migration_name,
  checksum: 'prior',
  finished_at: new Date(),
}));
const source = readFileSync('scripts/migrate-languages.cjs', 'utf8');
function harness(environment: string | undefined, history: History, tamper = false) {
  let clients = 0,
    transactions = 0,
    disconnects = 0;
  const ddl: string[] = [],
    writes: string[] = [];
  const tx = {
    $queryRaw: async () => history,
    $executeRaw: async (sql: TemplateStringsArray) => {
      writes.push(sql.join('?'));
    },
    $executeRawUnsafe: async (sql: string) => {
      ddl.push(sql);
    },
  };
  const mockedRequire = (name: string) => {
    if (name === '@prisma/client')
      return {
        PrismaClient: class {
          constructor() {
            clients++;
          }
          async $transaction(action: (transaction: typeof tx) => Promise<void>) {
            transactions++;
            await action(tx);
          }
          async $disconnect() {
            disconnects++;
          }
        },
      };
    if (name === 'node:fs' && tamper) return { readFileSync: () => 'DROP TABLE "User";' };
    return require(name);
  };
  const context = createContext({
    require: mockedRequire,
    module: { exports: {} },
    process: { env: { VERCEL_ENV: environment } },
    console: { log() {}, error() {} },
  });
  runInContext(source, context);
  return {
    run: () => context.module.exports.runMigration() as Promise<void>,
    ddl,
    writes,
    stats: () => ({ clients, transactions, disconnects }),
  };
}

test('release migration never connects on local or preview builds', async () => {
  for (const environment of [undefined, 'development', 'preview']) {
    const h = harness(environment, []);
    await h.run();
    assert.equal(h.stats().clients, 0);
    assert.equal(h.ddl.length, 0);
  }
});
test('an already-applied language migration is checked and not replayed', async () => {
  const h = harness('production', [
    ...completed,
    {
      migration_name: '20260930010000_saved_languages',
      checksum: '9bca67af96743a77b5702cc7f71436d1d588d7a4ae8ac16aa5bd3e718c8a7cf0',
      finished_at: new Date(),
    },
  ]);
  await h.run();
  assert.equal(h.ddl.length, 0);
  assert.equal(h.writes.length, 1);
  assert.equal(h.stats().disconnects, 1);
});
test('production release refuses tampered SQL and unexpected or incomplete history', async () => {
  const tampered = harness('production', completed, true);
  await assert.rejects(tampered.run(), /checksum mismatch/);
  assert.equal(tampered.stats().clients, 0);
  for (const history of [
    completed.slice(1),
    [...completed, { migration_name: 'unknown', checksum: '', finished_at: new Date() }],
    completed.map((row, i) => (i ? row : { ...row, finished_at: null })),
  ]) {
    const h = harness('production', history);
    await assert.rejects(h.run(), /seven completed migrations/);
    assert.equal(h.ddl.length, 0);
    assert.equal(h.stats().disconnects, 1);
  }
});
test('the production release applies only reviewed additive SQL in one transaction', async () => {
  const h = harness('production', completed);
  await h.run();
  assert.equal(h.stats().transactions, 1);
  assert.equal(h.stats().disconnects, 1);
  assert(h.ddl.some((sql) => sql.includes('CREATE TABLE "ContentTranslation"')));
  assert(h.ddl.some((sql) => sql.includes('ADD COLUMN "translations"')));
  assert(h.ddl.every((sql) => !/DROP TABLE|DROP COLUMN|TRUNCATE/i.test(sql)));
  assert.match(h.writes[0], /pg_advisory_xact_lock/);
  assert.match(h.writes.at(-1)!, /INSERT INTO "_prisma_migrations"/);
});
