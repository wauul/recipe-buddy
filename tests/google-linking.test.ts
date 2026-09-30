import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';

// Exercise the installed NextAuth account flow with an isolated adapter, without production data.
const callbackHandler = require(
  join(dirname(require.resolve('next-auth')), 'core/lib/callback-handler.js'),
).default;

test('Google email linking preserves the password chef and repeat sign-in uses the same identity', async () => {
  const chef = {
    id: 'existing-chef',
    email: 'chef@gmail.com',
    hashedPassword: 'existing-hash',
    username: 'Original chef',
  };
  const before = { ...chef };
  let linked: { userId: string; providerAccountId: string } | undefined;
  let links = 0;
  const options = {
    adapter: {
      getUserByAccount: async () => (linked ? chef : null),
      getUserByEmail: async (email: string) => (email === chef.email ? chef : null),
      createUser: async () => {
        throw new Error('Matching email must not create a duplicate chef');
      },
      linkAccount: async (account: typeof linked) => {
        linked = account;
        links++;
        return account;
      },
    },
    provider: { allowDangerousEmailAccountLinking: true },
    session: { strategy: 'jwt' },
    jwt: {},
    events: {},
  };
  const params = {
    profile: { id: 'google-subject', email: chef.email, name: 'Google display name' },
    account: { type: 'oauth', provider: 'google', providerAccountId: 'google-subject' },
    options,
  };
  const first = await callbackHandler(params);
  assert.equal(first.user.id, chef.id);
  assert.equal(linked?.userId, chef.id);
  assert.equal(linked?.providerAccountId, 'google-subject');
  assert.deepEqual(chef, before);
  const again = await callbackHandler(params);
  assert.equal(again.user.id, chef.id);
  assert.equal(links, 1);
});

test('a Google identity linked to another chef cannot be reassigned from a signed-in session', async () => {
  const options = {
    adapter: {
      getUser: async () => ({ id: 'chef-a' }),
      getUserByAccount: async () => ({ id: 'chef-b' }),
      linkAccount: async () => {
        throw new Error('Must not reassign an existing identity');
      },
    },
    provider: { allowDangerousEmailAccountLinking: true },
    session: { strategy: 'jwt' },
    jwt: { decode: async () => ({ sub: 'chef-a' }) },
    events: {},
  };
  await assert.rejects(
    callbackHandler({
      sessionToken: 'test-session',
      profile: { email: 'chef@gmail.com' },
      account: { type: 'oauth', provider: 'google', providerAccountId: 'google-subject' },
      options,
    }),
    /already associated with another user/,
  );
});
