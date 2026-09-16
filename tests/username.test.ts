import { test } from 'node:test';
import assert from 'node:assert/strict';
import { displayUsername, usernameSchema, settingsSchema } from '../src/lib/username';

test('default usernames use the full email local part; custom names take precedence', () => {
  assert.equal(displayUsername({ email: 'jane.chef+home@example.com' }), 'jane.chef+home');
  assert.equal(displayUsername({ email: 'jane@example.com', username: '' }), 'jane');
  assert.equal(displayUsername({ email: 'jane@example.com', username: 'Chef Jane' }), 'Chef Jane');
});
test('username validation accepts international names and rejects empty or misleading controls', () => {
  assert.equal(usernameSchema.parse('  Chloé 🍋  '), 'Chloé 🍋');
  for (const value of ['', '  ', 'a'.repeat(65), 'jane@example.com', 'jane\nadmin', 'jane\u202e']) {
    assert.equal(usernameSchema.safeParse(value).success, false);
  }
});
test('partial settings updates preserve the other preference and ignore account fields', () => {
  assert.deepEqual(settingsSchema.parse({ username: 'Jane', email: 'other@example.com', id: 'other' }), { username: 'Jane' });
  assert.deepEqual(settingsSchema.parse({ roastEnabled: false }), { roastEnabled: false });
  assert.equal(settingsSchema.safeParse({}).success, false);
  assert.equal(settingsSchema.safeParse({ username: null }).success, false);
});
