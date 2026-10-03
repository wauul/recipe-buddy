import { createRemoteJWKSet, jwtVerify } from 'jose';
import { db } from './db';
import { HttpError } from './http';
import { opaqueToken } from './native-crypto';
import { nativeGoogleIdentity } from './native-google-claims';
import { defaultChefName } from './google-auth';
import { rateLimit } from './rate-limit';
import { issueSession } from './native-auth';

const keys = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'), { timeoutDuration: 5000 });
function audience() {
  const id = (process.env.NATIVE_GOOGLE_WEB_CLIENT_ID || process.env.GOOGLE_CLIENT_ID)?.trim();
  if (!id || !/^[\w-]+\.apps\.googleusercontent\.com$/.test(id))
    throw new HttpError(503, 'Native Google sign-in needs OAuth configuration.');
  return id;
}
export async function beginNativeGoogle() {
  const clientId = audience();
  if (!(await rateLimit('native-google-begin:global', 60, 60))) throw new HttpError(429, 'Try again shortly.');
  const nonce = opaqueToken();
  const attempt = await db.nativeAuthAttempt.create({ data: { state: nonce, challenge: nonce, redirect: 'google-native', expiresAt: new Date(Date.now() + 5 * 60_000) } });
  return { attempt: attempt.id, nonce, clientId };
}
export async function finishNativeGoogle(attemptId: string, idToken: string) {
  const clientId = audience();
  if (!(await rateLimit('native-google-token:global', 60, 60))) throw new HttpError(429, 'Try again shortly.');
  const attempt = await db.nativeAuthAttempt.findUnique({ where: { id: attemptId } });
  if (!attempt || attempt.redirect !== 'google-native' || attempt.consumedAt || attempt.expiresAt <= new Date())
    throw new HttpError(401, 'Google sign-in expired. Try again.');
  let identity;
  try {
    const { payload } = await jwtVerify(idToken, keys, { algorithms: ['RS256'], audience: clientId, issuer: ['https://accounts.google.com', 'accounts.google.com'], maxTokenAge: '10m' });
    identity = nativeGoogleIdentity(payload, attempt.state);
  } catch { throw new HttpError(401, 'Google identity was not verified.'); }
  const subject = identity;
  const userId = await db.$transaction(async tx => {
    const consumed = await tx.nativeAuthAttempt.updateMany({ where: { id: attempt.id, consumedAt: null, expiresAt: { gt: new Date() } }, data: { consumedAt: new Date() } });
    if (!consumed.count) throw new HttpError(401, 'Google sign-in already used.');
    const account = await tx.account.findUnique({ where: { provider_providerAccountId: { provider: 'google', providerAccountId: subject.subject } } });
    if (account) return account.userId;
    // Match the website's verified-email account-linking policy. Keep password,
    // recipes and chef preferences intact when adding Google to an existing chef.
    const existing = await tx.user.findUnique({ where: { email: subject.email } });
    if (!existing && !(await rateLimit('signup:global', 30, 3600))) throw new HttpError(429, 'Registration temporarily unavailable.');
    const user = existing || await tx.user.create({ data: { email: subject.email, name: subject.name, image: subject.image, emailVerified: new Date(), username: defaultChefName(subject.name, subject.email) } });
    await tx.account.create({ data: { userId: user.id, type: 'oauth', provider: 'google', providerAccountId: subject.subject } });
    return user.id;
  });
  return issueSession(userId);
}
