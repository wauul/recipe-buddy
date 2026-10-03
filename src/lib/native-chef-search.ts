import { z } from 'zod';
import { db } from './db';
import { rateLimit } from './rate-limit';
import { HttpError } from './http';
export const chefSearchInput = z.string().trim().min(3).max(64).refine(value => !/[@\p{Cc}\p{Cf}]/u.test(value));
export async function findChefs(actor: string, query: string) {
  const name = chefSearchInput.parse(query);
  if (!(await rateLimit(`chef-search:minute:${actor}`, 30)) || !(await rateLimit(`chef-search:hour:${actor}`, 240, 3600)))
    throw new HttpError(429, 'Try again later.');
  const blocks = await db.userBlock.findMany({ where: { OR: [{ blockerId: actor }, { blockedId: actor }] }, select: { blockerId: true, blockedId: true } });
  const excluded = [actor, ...blocks.flatMap(row => [row.blockerId, row.blockedId])];
  // Bounded public-name suggestions only, with no cursor or private fields.
  // Escape LIKE metacharacters so wildcards cannot turn a prefix into a directory.
  const prefix = name.replace(/[\\%_]/g, character => `\\${character}`);
  return db.user.findMany({ where: { id: { notIn: excluded }, username: { startsWith: prefix, mode: 'insensitive' } },
    select: { id: true, username: true }, orderBy: [{ username: 'asc' }, { id: 'asc' }], take: 5 });
}
