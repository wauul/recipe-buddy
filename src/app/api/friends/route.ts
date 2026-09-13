import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/lib/db';
import { api, body, HttpError, userId } from '@/lib/http';
import { rateLimit } from '@/lib/rate-limit';
import { friendPair } from '@/lib/social-policy';
import { friendList } from '@/lib/social';
export const dynamic = 'force-dynamic';

export async function GET() { return api(async () => friendList(await userId())); }

export async function POST(request: Request) {
  return api(async () => {
    const id = await userId();
    const { email } = z.object({ email: z.string().trim().email().max(254).transform(v => v.toLowerCase()) }).parse(await body(request));
    if (!(await rateLimit(`friend-request:${id}`, 10, 3600))) throw new HttpError(429, 'Too many invites. Give the kitchen an hour to catch up.');
    // Exact email lookup only; no public account directory or partial email search.
    const recipient = await db.user.findUnique({ where: { email }, select: { id: true } });
    if (!recipient) throw new HttpError(404, 'No chef with that email yet. Ask them to join Recipe Buddy first.');
    if (recipient.id === id) throw new HttpError(400, 'You are already your own sous-chef. Add someone else.');
    try {
      await db.friendship.create({ data: { ...friendPair(id, recipient.id), requesterId: id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new HttpError(409, 'You already have a connection or pending request. Check your friends page.');
      throw error;
    }
    return { ok: true };
  }, 201);
}
