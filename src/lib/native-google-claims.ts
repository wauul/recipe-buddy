import type { JWTPayload } from 'jose';
import { isVerifiedGoogleProfile } from './google-auth';

// Signature, issuer, audience and expiry are checked by jose before this function.
export function nativeGoogleIdentity(payload: JWTPayload, nonce: string) {
  if (!payload.exp || !payload.iat || payload.nonce !== nonce || !isVerifiedGoogleProfile(payload))
    throw new Error('Invalid Google identity.');
  return {
    subject: payload.sub!, email: (payload.email as string).trim().toLowerCase(),
    name: typeof payload.name === 'string' ? payload.name.slice(0, 64) : null,
    image: typeof payload.picture === 'string' && payload.picture.startsWith('https://') ? payload.picture.slice(0, 2048) : null,
  };
}
