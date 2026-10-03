import { z } from 'zod';
import { db } from './db';
import { HttpError } from './http';
import { rateLimit } from './rate-limit';
import { friendPair, sharedRecipeWhere } from './social-policy';
export async function blocked(first: string, second: string) {
  return !!await db.userBlock.findFirst({ where: { OR: [{ blockerId: first, blockedId: second }, { blockerId: second, blockedId: first }] }, select: { blockerId: true } });
}
export async function assertNotBlocked(first: string, second: string) {
  if (await blocked(first, second)) throw new HttpError(403, 'This chef connection is unavailable.');
}
export async function blockChef(actor: string, input: unknown, remove = false) {
  const { chefId } = z.object({ chefId: z.string().cuid() }).strict().parse(input);
  if (actor === chefId) throw new HttpError(400, 'Choose another chef.');
  if (!(await rateLimit(`block:${actor}`, 30))) throw new HttpError(429, 'Try again later.');
  if (remove) { await db.userBlock.deleteMany({ where: { blockerId: actor, blockedId: chefId } }); return { ok: true }; }
  await db.$transaction(async tx => {
    if (!await tx.user.findUnique({ where: { id: chefId }, select: { id: true } })) throw new HttpError(404, 'Chef unavailable.');
    await tx.userBlock.upsert({ where: { blockerId_blockedId: { blockerId: actor, blockedId: chefId } }, create: { blockerId: actor, blockedId: chefId }, update: {} });
    await tx.friendship.deleteMany({ where: friendPair(actor, chefId) });
  });
  return { ok: true };
}
export async function blockedChefs(actor: string) {
  return db.userBlock.findMany({ where: { blockerId: actor }, select: { blocked: { select: { id: true, username: true } } }, orderBy: { createdAt: 'desc' } }).then(rows => rows.map(r => r.blocked));
}
export async function reportContent(actor: string, input: unknown) {
  const value = z.object({ recipeId: z.string().cuid().optional(), chefId: z.string().cuid().optional(), reason: z.string().trim().min(5).max(1000) }).strict().refine(v => !!v.recipeId || !!v.chefId, 'Choose content or a chef to report.').parse(input);
  if (!(await rateLimit(`report:${actor}`, 10, 3600))) throw new HttpError(429, 'Try again later.');
  if (value.recipeId && !await db.recipe.findFirst({ where: { id: value.recipeId, OR: [{ userId: actor }, { shares: { some: sharedRecipeWhere(actor) } }] }, select: { id: true } })) throw new HttpError(404, 'Recipe unavailable.');
  if (value.chefId && !await db.friendship.findFirst({ where: friendPair(actor, value.chefId), select: { id: true } })) throw new HttpError(404, 'Chef unavailable.');
  await db.contentReport.create({ data: { reporterId: actor, recipeId: value.recipeId, reportedUserId: value.chefId, reason: value.reason } });
  return { ok: true };
}
