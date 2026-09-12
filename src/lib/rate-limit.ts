import { createHash } from 'node:crypto';
import { db } from './db';
export async function rateLimit(identity: string, limit: number, seconds = 60) {
  const key = createHash('sha256').update(identity).digest('hex');
  const result = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimit" ("key", "count", "expiresAt")
    VALUES (${key}, 1, NOW() + ${seconds} * INTERVAL '1 second')
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."expiresAt" <= NOW() THEN 1 ELSE "RateLimit"."count" + 1 END,
      "expiresAt" = CASE WHEN "RateLimit"."expiresAt" <= NOW() THEN NOW() + ${seconds} * INTERVAL '1 second' ELSE "RateLimit"."expiresAt" END
    RETURNING "count"`;
  return result[0].count <= limit;
}
