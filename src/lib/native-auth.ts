import { SignJWT, jwtVerify } from 'jose';
import { db } from './db';
import { HttpError } from './http';
import { opaqueToken, tokenHash, tokenPattern, validPkce } from './native-crypto';

const issuer = 'recipe-buddy-native';
const secret = () => {
  const value = process.env.NATIVE_SESSION_SECRET;
  if (!value || value.length < 32) throw new HttpError(503, 'Native authentication is not configured.');
  return new TextEncoder().encode(value);
};
async function credentials(session: { id: string; userId: string }, refreshToken: string) {
  const accessToken = await new SignJWT({ sid: session.id }).setProtectedHeader({ alg: 'HS256' })
    .setSubject(session.userId).setIssuer(issuer).setAudience('recipe-buddy-app')
    .setIssuedAt().setExpirationTime('10m').sign(secret());
  return { accessToken, refreshToken, expiresIn: 600, userId: session.userId };
}
export async function issueSession(userId: string) {
  secret();
  const refreshToken = opaqueToken();
  const session = await db.nativeSession.create({ data: { userId,
    expiresAt: new Date(Date.now() + 30 * 86400_000), tokens: { create: { hash: tokenHash(refreshToken) } } } });
  return credentials(session, refreshToken);
}
export async function authenticateNative(request: Request) {
  const bearer = request.headers.get('authorization');
  if (!bearer?.startsWith('Bearer ') || bearer.length > 2048) throw new HttpError(401, 'Session expired. Please sign in.');
  let payload;
  try { payload = (await jwtVerify(bearer.slice(7), secret(), { algorithms: ['HS256'], issuer, audience: 'recipe-buddy-app' })).payload; }
  catch { throw new HttpError(401, 'Session expired. Please sign in.'); }
  if (typeof payload.sid !== 'string' || !payload.sub) throw new HttpError(401, 'Invalid session.');
  const session = await db.nativeSession.findFirst({ where: { id: payload.sid, userId: payload.sub,
    revokedAt: null, expiresAt: { gt: new Date() } } });
  if (!session) throw new HttpError(401, 'Session revoked. Please sign in.');
  return session;
}
export async function rotateSession(token: string) {
  secret();
  if (!tokenPattern.test(token)) throw new HttpError(401, 'Invalid refresh session.');
  const hash = tokenHash(token), next = opaqueToken(), now = new Date();
  // A conditional write locks the token. A replay revokes the family, and is committed
  // before returning an error (throwing inside the transaction would undo revocation).
  const session = await db.$transaction(async tx => {
    const row = await tx.nativeRefreshToken.findUnique({ where: { hash }, include: { session: true } });
    if (!row || row.session.revokedAt || row.session.expiresAt <= now) return null;
    const claimed = await tx.nativeRefreshToken.updateMany({ where: { hash, usedAt: null }, data: { usedAt: now } });
    if (!claimed.count) {
      await tx.nativeSession.update({ where: { id: row.sessionId }, data: { revokedAt: now } });
      return null;
    }
    await tx.nativeRefreshToken.create({ data: { hash: tokenHash(next), sessionId: row.sessionId } });
    return row.session;
  });
  if (!session) throw new HttpError(401, 'Refresh expired or reused. Please sign in.');
  return credentials(session, next);
}
export async function exchangeCode(code: string, verifier: string, state: string) {
  secret();
  if (!tokenPattern.test(code)) throw new HttpError(401, 'Invalid exchange.');
  const attempt = await db.$transaction(async tx => {
    const row = await tx.nativeAuthAttempt.findUnique({ where: { codeHash: tokenHash(code) } });
    if (!row || !row.userId || row.state !== state || row.consumedAt || row.expiresAt <= new Date() || !validPkce(verifier, row.challenge)) return null;
    const consumed = await tx.nativeAuthAttempt.updateMany({ where: { id: row.id, consumedAt: null }, data: { consumedAt: new Date() } });
    return consumed.count ? row : null;
  });
  if (!attempt?.userId) throw new HttpError(401, 'Invalid or expired exchange.');
  return issueSession(attempt.userId);
}
