import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { api, body, HttpError } from '@/lib/http';
import { db } from '@/lib/db';
import { opaqueToken, tokenHash } from '@/lib/native-crypto';
export async function POST(request: Request) {
  return api(async () => {
    const origin = request.headers.get('origin');
    if (!origin || origin !== new URL(process.env.NEXTAUTH_URL!).origin) throw new HttpError(403, 'Invalid approval origin.');
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new HttpError(401, 'Please sign in.');
    const { attempt: id } = z.object({ attempt: z.string().cuid() }).parse(await body(request));
    const code = opaqueToken();
    const attempt = await db.nativeAuthAttempt.findUnique({ where: { id } });
    if (!attempt) throw new HttpError(410, 'Exchange expired.');
    const result = await db.nativeAuthAttempt.updateMany({ where: { id, codeHash: null, consumedAt: null, expiresAt: { gt: new Date() } },
      data: { codeHash: tokenHash(code), userId: session.user.id, expiresAt: new Date(Date.now() + 60_000) } });
    if (!result.count) throw new HttpError(410, 'Exchange expired or already approved.');
    const redirect = new URL(attempt.redirect);
    redirect.searchParams.set('code', code); redirect.searchParams.set('state', attempt.state);
    return { redirect: redirect.toString() };
  });
}
