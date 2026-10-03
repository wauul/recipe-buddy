import { z } from 'zod';
import { api, body, HttpError } from '@/lib/http';
import { passwordUser } from '@/lib/password-auth';
import { issueSession, rotateSession, exchangeCode } from '@/lib/native-auth';
import { db } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';
import { tokenPattern } from '@/lib/native-crypto';
import { beginNativeGoogle, finishNativeGoogle } from '@/lib/native-google';
export const dynamic = 'force-dynamic';
const token = z.string().regex(tokenPattern);
export async function POST(request: Request, props: { params: Promise<{ action: string }> }) {
  const params = await props.params;
  return api(async () => {
    const input = await body(request);
    if (params.action === 'google-begin') return beginNativeGoogle();
    if (params.action === 'google') {
      const value = z.object({ attempt: z.string().min(1).max(128), idToken: z.string().min(100).max(12000) }).parse(input);
      return finishNativeGoogle(value.attempt, value.idToken);
    }
    if (params.action === 'login') {
      const user = await passwordUser(input);
      if (!user) throw new HttpError(401, 'Invalid email or password.');
      return issueSession(user.id);
    }
    if (params.action === 'refresh') return rotateSession(z.object({ refreshToken: token }).parse(input).refreshToken);
    if (params.action === 'logout') {
      const refresh = z.object({ refreshToken: token }).parse(input).refreshToken;
      const record = await db.nativeRefreshToken.findUnique({ where: { hash: (await import('@/lib/native-crypto')).tokenHash(refresh) }, include: { session: true } });
      if (!record) throw new HttpError(401, 'Invalid refresh session.');
      const session = record.session;
      await db.nativeSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
      return { ok: true };
    }
    if (params.action === 'exchange') {
      const value = z.object({ code: token, verifier: z.string().min(43).max(128), state: token }).parse(input);
      return exchangeCode(value.code, value.verifier, value.state);
    }
    if (params.action === 'begin') {
      const value = z.object({ state: token, challenge: token,
        redirect: z.literal('recipebuddy://auth') }).parse(input);
      if (!(await rateLimit('native-auth-begin:global', 100, 60))) throw new HttpError(429, 'Try again shortly.');
      const attempt = await db.nativeAuthAttempt.create({ data: { ...value, expiresAt: new Date(Date.now() + 10 * 60_000) } });
      const url = new URL(`/mobile/connect?attempt=${attempt.id}`, process.env.NEXTAUTH_URL);
      return { url: url.toString() };
    }
    throw new HttpError(404, 'Unknown authentication operation.');
  });
}
