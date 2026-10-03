import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/lib/db';
import { api, body, HttpError, userId } from '@/lib/http';
import { rateLimit } from '@/lib/rate-limit';
import { friendPair } from '@/lib/social-policy';
import { friendList } from '@/lib/social';
import { assertNotBlocked } from '@/lib/moderation';
export const dynamic = 'force-dynamic';

export async function GET() {
  return api(async () => friendList(await userId()));
}

export async function POST(request: Request) {
  return api(async () => {
    const id = await userId();
    const input = z
      .object({
        email: z
          .string()
          .trim()
          .email()
          .max(254)
          .transform((v) => v.toLowerCase()).optional(),
        chefId: z.string().cuid().optional(),
      })
      .strict().refine(value => !!value.email !== !!value.chefId, 'Choose one recipient.')
      .parse(await body(request));
    if (!(await rateLimit(`friend-request:${id}`, 10, 3600)))
      throw new HttpError(429, 'Too many invitations. Try again in an hour.');
    // Exact email lookup only; no public account directory or partial email search.
    const recipient = await db.user.findUnique({
      where: input.chefId ? { id: input.chefId } : { email: input.email! },
      select: { id: true },
    });
    if (!recipient)
      throw new HttpError(
        404,
        'No account with that email. Ask your friend to join Recipe Buddy first.',
      );
    if (recipient.id === id) throw new HttpError(400, 'Choose another person to add as a friend.');
    await assertNotBlocked(id, recipient.id);
    try {
      await db.friendship.create({
        data: { ...friendPair(id, recipient.id), requesterId: id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
        throw new HttpError(
          409,
          'You already have a connection or pending request. Check your friends page.',
        );
      throw error;
    }
    return { ok: true };
  }, 201);
}
