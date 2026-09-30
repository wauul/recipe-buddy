// This release's additive migration. Production-only, atomic and safe to repeat.
// Never applies arbitrary pending migrations, resets data or runs on previews.
const { PrismaClient } = require('@prisma/client');
const { readFileSync } = require('node:fs');
const { createHash, randomUUID } = require('node:crypto');

const migration = '20260930010000_saved_languages';
const checksum = '9bca67af96743a77b5702cc7f71436d1d588d7a4ae8ac16aa5bd3e718c8a7cf0';
const prerequisites = [
  '20260911000000_init',
  '20260914000000_social',
  '20260914010000_recipe_photos',
  '20260915000000_recipe_updated_at',
  '20260916000000_recipe_discussion',
  '20260916010000_usernames',
  '20260930000000_google_chefs_reviews',
];
class ReleaseError extends Error {}

async function main() {
  if (process.env.VERCEL_ENV !== 'production') {
    console.log('Language release migration skipped outside Vercel production.');
    return;
  }
  const sql = readFileSync(`prisma/migrations/${migration}/migration.sql`, 'utf8').replace(
    /\r\n/g,
    '\n',
  );
  if (createHash('sha256').update(sql).digest('hex') !== checksum)
    throw new ReleaseError('Language migration checksum mismatch.');
  const db = new PrismaClient();
  try {
    await db.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(${2026093001})`;
        const history =
          await tx.$queryRaw`SELECT migration_name, checksum, finished_at FROM "_prisma_migrations" WHERE rolled_back_at IS NULL`;
        const current = history.filter((row) => row.migration_name === migration);
        if (current.length) {
          if (current.length !== 1 || current[0].checksum !== checksum || !current[0].finished_at)
            throw new ReleaseError('Language migration has unexpected history.');
          console.log('Language release migration already applied.');
          return;
        }
        const finished = new Set(
          history.filter((row) => row.finished_at).map((row) => row.migration_name),
        );
        if (
          prerequisites.some((name) => !finished.has(name)) ||
          history.some((row) => !row.finished_at || !prerequisites.includes(row.migration_name))
        ) {
          throw new ReleaseError(
            'Language migration requires the existing seven completed migrations. No changes were applied.',
          );
        }
        // Only the exact reviewed SQL above is executed, all inside this transaction.
        for (const statement of sql
          .split(';')
          .map((part) => part.trim())
          .filter(Boolean)) {
          await tx.$executeRawUnsafe(statement);
        }
        await tx.$executeRaw`INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, applied_steps_count) VALUES (${randomUUID()}, ${checksum}, now(), ${migration}, 1)`;
        console.log('Language translation storage added; existing accounts and recipes preserved.');
      },
      { timeout: 30000 },
    );
  } finally {
    await db.$disconnect();
  }
}
module.exports = { runMigration: main };
if (require.main === module) {
  main().catch((error) => {
    console.error(
      'Language release migration failed:',
      error instanceof ReleaseError ? error.message : error.code || error.name,
    );
    process.exitCode = 1;
  });
}
