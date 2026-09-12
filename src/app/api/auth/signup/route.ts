import { hash } from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { api, body, HttpError } from '@/lib/http';
import { credentialsSchema } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';
export async function POST(request: Request) {
  return api(async () => {
    const input = credentialsSchema.parse(await body(request));
    if (!(await rateLimit('signup:global', 30, 3600))) throw new HttpError(429, 'The kitchen is busy. Please try signing up later.');
    try { await db.user.create({ data: { email: input.email, hashedPassword: await hash(input.password, 12) } }); }
    catch (e) { if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new HttpError(409, 'Unable to create that account. Try logging in.'); throw e; }
    return { ok: true };
  }, 201);
}
