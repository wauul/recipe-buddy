// One-release helper: applies only the reviewed username migration, atomically.
// Not part of the normal build command and never runs in preview deployments.
const { PrismaClient } = require('@prisma/client');
const { readFileSync } = require('node:fs');
const { createHash, randomUUID } = require('node:crypto');

async function main() {
  if (process.env.VERCEL_ENV !== 'production') throw new Error('This release migration requires the production environment.');
  const name = '20260916010000_usernames';
  const checksum = 'e67d6531b5ea83be1ebe501504f654135313fe5bde250a70a9a65cd90134e764';
  const sql = readFileSync(`prisma/migrations/${name}/migration.sql`, 'utf8');
  if (createHash('sha256').update(sql).digest('hex') !== checksum) throw new Error('Reviewed migration checksum mismatch.');
  const db = new PrismaClient();
  try {
    await db.$transaction(async tx => {
      await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(2026091601)');
      const rows = await tx.$queryRaw`SELECT checksum, finished_at FROM "_prisma_migrations" WHERE migration_name = ${name} AND rolled_back_at IS NULL`;
      if (rows.length) {
        if (rows.length !== 1 || rows[0].checksum !== checksum || !rows[0].finished_at) throw new Error('Unexpected migration history.');
        console.log('Username migration already applied.'); return;
      }
      // No pending migrations, arbitrary SQL, drops, or resets are executed here.
      await tx.$executeRawUnsafe('ALTER TABLE "User" ADD COLUMN "username" TEXT NOT NULL DEFAULT \'\'');
      await tx.$executeRawUnsafe('UPDATE "User" SET "username" = split_part("email", \'@\', 1)');
      await tx.$executeRaw`INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, applied_steps_count) VALUES (${randomUUID()}, ${checksum}, now(), ${name}, 1)`;
      console.log('Username column added and existing users initialized.');
    }, { timeout: 30000 });
  } finally { await db.$disconnect(); }
}
main().catch(error => { console.error('Username migration failed:', error.code || error.name); process.exitCode = 1; });
