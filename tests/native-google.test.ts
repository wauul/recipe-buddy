import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { ModuleKind, ScriptTarget, transpileModule } from 'typescript';
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

test('native Google rejects an email match until Chef settings has linked the Google subject', async () => {
  let linked = false;
  let consumed = 0;
  const tx = {
    nativeAuthAttempt: { updateMany: async () => { consumed++; return { count: 1 }; } },
    account: { findUnique: async () => linked ? { userId: 'existing-chef' } : null },
    user: { findUnique: async () => ({ id: 'existing-chef' }) },
  };
  const dependencies: Record<string, unknown> = {
    jose: { createRemoteJWKSet: () => null, jwtVerify: async () => ({ payload }) },
    './db': {
      db: {
        nativeAuthAttempt: {
          findUnique: async () => ({ id: 'attempt', state: payload.nonce, redirect: 'google-native', expiresAt: new Date(Date.now() + 60_000) }),
        },
        $transaction: async (operation: (client: typeof tx) => unknown) => operation(tx),
      },
    },
    './http': { HttpError: class extends Error { constructor(public status: number, message: string) { super(message); } } },
    './native-crypto': require('../src/lib/native-crypto'),
    './native-google-claims': { nativeGoogleIdentity },
    './google-auth': require('../src/lib/google-auth'),
    './rate-limit': { rateLimit: async () => true },
    './native-auth': { issueSession: async (userId: string) => ({ userId }) },
  };
  const exports = {} as typeof import('../src/lib/native-google');
  const source = transpileModule(readFileSync('src/lib/native-google.ts', 'utf8'), {
    compilerOptions: { module: ModuleKind.CommonJS, target: ScriptTarget.ES2022 },
  }).outputText;
  runInNewContext(source, {
    exports, URL, require: (name: string) => dependencies[name],
    process: { env: { NATIVE_GOOGLE_WEB_CLIENT_ID: 'test.apps.googleusercontent.com' } },
  });
  await assert.rejects(exports.finishNativeGoogle('attempt', 'unused'), { status: 409 });
  assert.equal(consumed, 1);
  linked = true;
  assert.deepEqual(await exports.finishNativeGoogle('new-attempt', 'unused'), { userId: 'existing-chef' });
});
