import test from 'node:test';
import assert from 'node:assert/strict';
import { nativeGoogleIdentity } from '../src/lib/native-google-claims';
const payload = { sub: 'google-subject', email: ' Chef@Example.com ', email_verified: true, nonce: 'bound-nonce', iat: 123, exp: 456, name: 'A chef' };
test('native Google accepts only the nonce-bound verified identity and normalizes email', () => {
  assert.deepEqual(nativeGoogleIdentity(payload, 'bound-nonce'), { subject: 'google-subject', email: 'chef@example.com', name: 'A chef', image: null });
});
test('native Google rejects mismatched nonce, unverified email and incomplete token claims', () => {
  assert.throws(() => nativeGoogleIdentity(payload, 'other-nonce'));
  assert.throws(() => nativeGoogleIdentity({ ...payload, email_verified: false }, 'bound-nonce'));
  assert.throws(() => nativeGoogleIdentity({ ...payload, sub: undefined }, 'bound-nonce'));
  assert.throws(() => nativeGoogleIdentity({ ...payload, exp: undefined }, 'bound-nonce'));
  assert.throws(() => nativeGoogleIdentity({ ...payload, iat: undefined }, 'bound-nonce'));
});
