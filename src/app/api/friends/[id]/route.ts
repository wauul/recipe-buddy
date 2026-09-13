import { db } from '@/lib/db';
import { api, body, HttpError, userId } from '@/lib/http';

type Context = { params: { id: string } };
export async function PATCH(request: Request, { params }: Context) {
  return api(async () => {
    const actor = await userId(); await body(request);
    // Only the addressee can accept; a sender cannot approve their own request.
    const result = await db.friendship.updateMany({ where: { id: params.id, requesterId: { not: actor }, acceptedAt: null, OR: [{ userAId: actor }, { userBId: actor }] }, data: { acceptedAt: new Date() } });
    if (!result.count) throw new HttpError(404, 'That incoming request is no longer available.');
    return { ok: true };
  });
}
export async function DELETE(request: Request, { params }: Context) {
  return api(async () => {
    const actor = await userId(); await body(request);
    // Delete is also cancel/decline. The FK cascade revokes both users' shares.
    const result = await db.friendship.deleteMany({ where: { id: params.id, OR: [{ userAId: actor }, { userBId: actor }] } });
    if (!result.count) throw new HttpError(404, 'Connection not found.');
    return { ok: true };
  });
}
