import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
export const opaqueToken = () => randomBytes(32).toString('base64url');
export const tokenHash = (value: string) => createHash('sha256').update(value).digest('base64url');
export const tokenPattern = /^[A-Za-z0-9_-]{43}$/;
export function validPkce(verifier: string, challenge: string) {
  if (!/^[A-Za-z0-9._~-]{43,128}$/.test(verifier) || !tokenPattern.test(challenge)) return false;
  const actual = Buffer.from(tokenHash(verifier));
  const expected = Buffer.from(challenge);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
