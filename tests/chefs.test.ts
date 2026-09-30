import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chefLevels, chefProgress } from '../src/lib/chef-levels';
import { apronReviewSchema, canReviewRecipe } from '../src/lib/review-validation';
import { defaultChefName, isVerifiedGoogleProfile, authErrorMessage } from '../src/lib/google-auth';

test('all seven chef thresholds use the combined recipe and received-apron score', () => {
  assert.equal(chefLevels.length, 7);
  for (const level of chefLevels) {
    const atThreshold = chefProgress(level.points / 10, 0);
    assert.equal(atThreshold.current.level, level.level);
    assert.equal(atThreshold.points, level.points);
    if (level.points) {
      const before = chefProgress(level.points / 10 - 1, 4, 1);
      assert.equal(before.points, level.points - 2);
      assert.equal(before.current.level, level.level - 1);
      const combined = chefProgress(level.points / 10 - 1, 5, 1);
      assert.equal(combined.current.level, level.level);
    }
  }
});

test('progress handles a new chef, review edits/removal, and the highest level', () => {
  assert.deepEqual([chefProgress(0, 0).progress, chefProgress(0, 0).pointsToNext], [0, 30]);
  const five = chefProgress(2, 5, 1);
  assert.equal(five.current.name, 'Whisk Whisperer');
  assert.equal(five.averageAprons, 5);
  assert.equal(chefProgress(2, 4, 1).current.name, 'Toast Rookie');
  assert.equal(chefProgress(2, 0).averageAprons, null);
  const top = chefProgress(100, 100, 20);
  assert.equal(top.current.name, 'Apron Legend');
  assert.equal(top.next, null);
  assert.equal(top.progress, 100);
  assert.equal(top.pointsToNext, 0);
  for (const value of [-1, 0.5, NaN, Infinity]) assert.throws(() => chefProgress(value, 0));
});

test('apron reviews accept whole ratings only and strip identity spoofing', () => {
  for (let rating = 1; rating <= 5; rating++)
    assert.equal(apronReviewSchema.parse({ rating }).rating, rating);
  for (const rating of [0, 6, 1.5, '5', null])
    assert.equal(apronReviewSchema.safeParse({ rating }).success, false);
  const review = apronReviewSchema.parse({
    rating: 4,
    text: '  Lovely sauce.  ',
    authorId: 'spoofed',
    recipeId: 'spoofed',
  });
  assert.deepEqual(review, { rating: 4, text: 'Lovely sauce.' });
  assert.equal(apronReviewSchema.safeParse({ rating: 5, text: 'x'.repeat(1001) }).success, false);
  assert.equal(canReviewRecipe('chef-a', 'chef-a'), false);
  assert.equal(canReviewRecipe('chef-a', 'chef-b'), true);
});

test('Google signup requires a verified provider identity and valid email', () => {
  const profile = {
    sub: 'google-identity',
    email: 'chef@example.com',
    email_verified: true,
  };
  assert.equal(isVerifiedGoogleProfile(profile), true);
  for (const invalid of [
    undefined,
    {},
    { ...profile, sub: '' },
    { ...profile, email: 'bad' },
    { ...profile, email_verified: false },
    { ...profile, email_verified: 'true' },
  ]) {
    assert.equal(isVerifiedGoogleProfile(invalid), false);
  }
});

test('chef naming and OAuth errors preserve an existing account’s recovery path', () => {
  assert.equal(defaultChefName('  Sam Cook  ', 'sam@example.com'), 'Sam Cook');
  assert.equal(defaultChefName(undefined, 'sam@example.com'), 'sam');
  assert.equal(defaultChefName(' ', 'sam@example.com'), 'sam');
  assert.equal(defaultChefName('x'.repeat(80), 'sam@example.com').length, 64);
  assert.match(authErrorMessage('OAuthAccountNotLinked'), /already connected to another chef/);
  assert.match(authErrorMessage('AccessDenied'), /verified Google/);
  assert.equal(authErrorMessage(), '');
  assert.match(authErrorMessage('<unsafe>'), /Sign-in did not complete/);
});
