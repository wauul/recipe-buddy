import { createRemoteJWKSet, jwtVerify } from 'jose';
import { z } from 'zod';
import { api, body, HttpError } from '@/lib/http';
import { billingReady, refreshPlayNotification } from '@/lib/native-pro';
import { PLAY_PACKAGE } from '@/lib/play-purchase';
export const dynamic = 'force-dynamic';
const googleKeys = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
export async function POST(request: Request) {
  return api(async () => {
    if (!billingReady() || !process.env.PLAY_PUBSUB_SERVICE_ACCOUNT || !process.env.PLAY_PUBSUB_AUDIENCE) throw new HttpError(503, 'Billing notifications are not configured.');
    try {
      const authorization = request.headers.get('authorization');
      if (!authorization?.startsWith('Bearer ')) throw new Error('Missing bearer token');
      const { payload } = await jwtVerify(authorization.slice(7), googleKeys, { audience: process.env.PLAY_PUBSUB_AUDIENCE, issuer: ['https://accounts.google.com', 'accounts.google.com'], algorithms: ['RS256'], requiredClaims: ['exp'] });
      if (payload.email !== process.env.PLAY_PUBSUB_SERVICE_ACCOUNT || payload.email_verified !== true) throw new Error('Identity');
    } catch { throw new HttpError(401, 'Unauthorized notification.'); }
    const envelope = z.object({ message: z.object({ data: z.string().max(12000), messageId: z.string().max(200) }) }).parse(await body(request));
    let decoded: unknown;
    try { decoded = JSON.parse(Buffer.from(envelope.message.data, 'base64').toString('utf8')); } catch { throw new HttpError(400, 'Invalid notification.'); }
    const notification = z.object({ packageName: z.literal(PLAY_PACKAGE), subscriptionNotification: z.object({ purchaseToken: z.string().min(16).max(4096) }).optional(), testNotification: z.object({}).optional() }).parse(decoded);
    if (notification.subscriptionNotification) await refreshPlayNotification(notification.subscriptionNotification.purchaseToken);
    return { received: true };
  });
}
