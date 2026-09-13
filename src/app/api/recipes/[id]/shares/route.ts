import { z } from 'zod';
import { db } from '@/lib/db';
import { api, body, HttpError, userId } from '@/lib/http';
import { friendPair } from '@/lib/social-policy';
import { rateLimit } from '@/lib/rate-limit';

type Context = { params: { id: string } };
const recipientSchema = z.object({ recipientId: z.string().cuid() });
export const dynamic = 'force-dynamic';
async function owned(recipeId: string, ownerId: string) {
  if (!await db.recipe.findFirst({ where: { id: recipeId, userId: ownerId }, select: { id: true } })) throw new HttpError(404, 'Recipe not found.');
}
export async function GET(_request: Request, { params }: Context) {
  return api(async () => {
    const owner = await userId(); await owned(params.id, owner);
    return db.recipeShare.findMany({ where: { recipeId: params.id }, select: { recipientId: true, recipient: { select: { email: true } } } });
  });
}
export async function POST(request: Request, { params }: Context) {
  return api(async () => {
    const owner = await userId(); const { recipientId } = recipientSchema.parse(await body(request));
    await owned(params.id, owner);
    if (owner === recipientId) throw new HttpError(400, 'This recipe is already in your kitchen.');
    if (!(await rateLimit(`share:${owner}`, 30))) throw new HttpError(429, 'Too many shares. Try again in a minute.');
    const friendship = await db.friendship.findFirst({ where: { ...friendPair(owner, recipientId), acceptedAt: { not: null } }, select: { id: true } });
    if (!friendship) throw new HttpError(403, 'You can share recipes only with accepted friends.');
    // The friendship FK prevents a concurrent unfriend from leaving an orphaned share.
    await db.recipeShare.upsert({ where: { recipeId_recipientId: { recipeId: params.id, recipientId } }, update: {}, create: { recipeId: params.id, recipientId, friendshipId: friendship.id } });
    return { ok: true };
  });
}
export async function DELETE(request: Request, { params }: Context) {
  return api(async () => {
    const owner = await userId(); const { recipientId } = recipientSchema.parse(await body(request));
    await owned(params.id, owner);
    await db.recipeShare.deleteMany({ where: { recipeId: params.id, recipientId } });
    return { ok: true };
  });
}
