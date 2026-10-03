import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { importPKCS8, SignJWT } from 'jose';
import { db } from './db';
import { HttpError } from './http';
import { activeSubscription, playAccountId, PLAY_PACKAGE, PRO_PRODUCT, PRO_BASE_PLANS, validatePurchase } from './play-purchase';
import { tokenHash } from './native-crypto';

export const billingReady = () => process.env.PLAY_BILLING_ENABLED === 'true' && !!process.env.PLAY_SERVICE_ACCOUNT_EMAIL && !!process.env.PLAY_SERVICE_ACCOUNT_PRIVATE_KEY && !!process.env.PLAY_TOKEN_ENCRYPTION_KEY;
function cipherKey() {
  const key = Buffer.from(process.env.PLAY_TOKEN_ENCRYPTION_KEY ?? '', 'base64');
  if (key.length !== 32) throw new HttpError(503, 'Billing is not configured.');
  return key;
}
function encrypt(token: string) {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', cipherKey(), iv);
  return Buffer.concat([iv, cipher.update(token, 'utf8'), cipher.final(), cipher.getAuthTag()]).toString('base64');
}
function decrypt(value: string) {
  const bytes = Buffer.from(value, 'base64'), decipher = createDecipheriv('aes-256-gcm', cipherKey(), bytes.subarray(0, 12));
  decipher.setAuthTag(bytes.subarray(-16));
  return Buffer.concat([decipher.update(bytes.subarray(12, -16)), decipher.final()]).toString('utf8');
}
let credential: { token: string; expires: number } | undefined;
async function accessToken() {
  if (credential && credential.expires > Date.now()) return credential.token;
  if (!billingReady()) throw new HttpError(503, 'Pro checkout is coming soon.');
  const email = process.env.PLAY_SERVICE_ACCOUNT_EMAIL!;
  const key = await importPKCS8(process.env.PLAY_SERVICE_ACCOUNT_PRIVATE_KEY!.replace(/\\n/g, '\n'), 'RS256');
  const assertion = await new SignJWT({ scope: 'https://www.googleapis.com/auth/androidpublisher' }).setProtectedHeader({ alg: 'RS256' }).setIssuer(email).setAudience('https://oauth2.googleapis.com/token').setIssuedAt().setExpirationTime('1h').sign(key);
  const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }), signal: AbortSignal.timeout(8000), cache: 'no-store' });
  if (!response.ok) throw new HttpError(503, 'Subscription verification is unavailable.');
  const result = await response.json() as { access_token: string };
  if (!result.access_token) throw new HttpError(503, 'Subscription verification is unavailable.');
  credential = { token: result.access_token, expires: Date.now() + 50 * 60_000 }; return credential.token;
}
async function playRequest(path: string, method = 'GET') {
  const response = await fetch(`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PLAY_PACKAGE}/${path}`, { method, headers: { Authorization: `Bearer ${await accessToken()}`, ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}) }, ...(method === 'POST' ? { body: '{}' } : {}), signal: AbortSignal.timeout(8000), cache: 'no-store' });
  if (response.status === 404 || response.status === 410) throw new HttpError(400, 'Subscription is unavailable.');
  if (!response.ok) throw new HttpError(503, 'Subscription verification is unavailable.');
  return method === 'GET' ? response.json() : null;
}
export async function verifySubscription(userId: string, token: string) {
  if (!billingReady()) throw new HttpError(503, 'Pro checkout is coming soon.');
  if (token.length < 16 || token.length > 4096) throw new HttpError(400, 'Invalid purchase token.');
  const hash = tokenHash(token), existing = await db.nativeSubscription.findUnique({ where: { tokenHash: hash } });
  if (existing && existing.userId !== userId) throw new HttpError(409, 'Purchase belongs to another account.');
  let purchase: ReturnType<typeof validatePurchase>;
  try { purchase = validatePurchase(await playRequest(`purchases/subscriptionsv2/tokens/${encodeURIComponent(token)}`), userId); }
  catch (error) { if (error instanceof HttpError) throw error; throw new HttpError(400, 'Purchase does not match this account or plan.'); }
  // Acknowledgement is retried through restore/foreground refresh. Never grant pending purchases.
  if (purchase.acknowledge) await playRequest(`purchases/subscriptions/${PRO_PRODUCT}/tokens/${encodeURIComponent(token)}:acknowledge`, 'POST');
  try { await db.nativeSubscription.upsert({ where: { userId }, create: { userId, tokenHash: hash, tokenCipher: encrypt(token), state: purchase.state, expiresAt: purchase.expiresAt }, update: { tokenHash: hash, tokenCipher: encrypt(token), state: purchase.state, expiresAt: purchase.expiresAt, verifiedAt: new Date() } }); }
  catch (error) { if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') throw new HttpError(409, 'Purchase belongs to another account.'); throw error; }
  return proStatus(userId);
}
export async function proStatus(userId: string) {
  const row = await db.nativeSubscription.findUnique({ where: { userId } });
  return { active: !!row && activeSubscription(row.state, row.expiresAt), expiresAt: row?.expiresAt.toISOString() ?? null, state: row?.state ?? 'FREE', billingReady: billingReady(), accountId: playAccountId(userId), productId: PRO_PRODUCT, basePlanId: 'monthly', basePlanIds: PRO_BASE_PLANS };
}
export async function requirePro(userId: string) {
  let row = await db.nativeSubscription.findUnique({ where: { userId } });
  if (!row || !billingReady()) throw new HttpError(402, 'Recipe Buddy Pro is required.');
  if (Date.now() - row.verifiedAt.getTime() > 5 * 60_000) {
    try { await verifySubscription(userId, decrypt(row.tokenCipher)); }
    catch (error) {
      if (error instanceof HttpError && error.status === 400) await db.nativeSubscription.update({ where: { userId }, data: { state: 'SUBSCRIPTION_STATE_EXPIRED', expiresAt: new Date(0), verifiedAt: new Date() } });
      throw error;
    }
    row = await db.nativeSubscription.findUnique({ where: { userId } });
  }
  if (!row || !activeSubscription(row.state, row.expiresAt)) throw new HttpError(402, 'Recipe Buddy Pro is required.');
}
export async function refreshPlayNotification(token: string) {
  const row = await db.nativeSubscription.findUnique({ where: { tokenHash: tokenHash(token) } });
  if (!row) return; // Unknown purchases must be claimed by their authenticated account.
  try { await verifySubscription(row.userId, token); }
  catch (error) {
    if (error instanceof HttpError && error.status === 400) {
      await db.nativeSubscription.updateMany({ where: { tokenHash: row.tokenHash }, data: { state: 'SUBSCRIPTION_STATE_EXPIRED', expiresAt: new Date(0), verifiedAt: new Date() } });
      return;
    }
    throw error; // Pub/Sub retries a temporary verification failure.
  }
}
