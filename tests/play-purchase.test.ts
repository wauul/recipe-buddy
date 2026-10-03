import test from 'node:test';
import assert from 'node:assert/strict';
import { activeSubscription, playAccountId, validatePurchase } from '../src/lib/play-purchase';
const purchase = { subscriptionState: 'SUBSCRIPTION_STATE_ACTIVE', acknowledgementState: 'ACKNOWLEDGEMENT_STATE_PENDING', externalAccountIdentifiers: { obfuscatedExternalAccountId: playAccountId('alice') }, lineItems: [{ productId: 'recipe_buddy_pro', offerDetails: { basePlanId: 'monthly' }, expiryTime: '2030-01-01T00:00:00Z', autoRenewingPlan: { autoRenewEnabled: true } }] };
test('Play purchase must bind the exact account, product and authorized base plan', () => {
  assert.equal(validatePurchase(purchase, 'alice').acknowledge, true);
  assert.throws(() => validatePurchase(purchase, 'bob'));
  assert.throws(() => validatePurchase({ ...purchase, externalAccountIdentifiers: undefined }, 'alice'));
  assert.throws(() => validatePurchase({ ...purchase, lineItems: [{ ...purchase.lineItems[0], productId: 'another_product' }] }, 'alice'));
  assert.equal(validatePurchase({ ...purchase, lineItems: [{ ...purchase.lineItems[0], offerDetails: { basePlanId: 'yearly' } }] }, 'alice').acknowledge, true);
  assert.throws(() => validatePurchase({ ...purchase, lineItems: [{ ...purchase.lineItems[0], offerDetails: { basePlanId: 'unapproved_plan' } }] }, 'alice'));
});
test('pending, paused, on-hold, expired and revoked purchases never unlock Pro', () => {
  for (const state of ['PENDING', 'PAUSED', 'ON_HOLD', 'EXPIRED', 'REVOKED', 'UNKNOWN']) assert.equal(activeSubscription('SUBSCRIPTION_STATE_' + state, new Date('2030-01-01')), false);
  for (const state of ['ACTIVE', 'CANCELED', 'IN_GRACE_PERIOD']) assert.equal(activeSubscription('SUBSCRIPTION_STATE_' + state, new Date('2030-01-01')), true);
  assert.equal(activeSubscription('SUBSCRIPTION_STATE_ACTIVE', new Date(0)), false);
  assert.equal(validatePurchase({ ...purchase, subscriptionState: 'SUBSCRIPTION_STATE_PENDING' }, 'alice').acknowledge, false);
});
