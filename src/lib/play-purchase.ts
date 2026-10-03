import { createHash } from 'node:crypto';
import { z } from 'zod';
export const PRO_PRODUCT = 'recipe_buddy_pro';
export const PRO_BASE_PLAN = 'monthly';
export const PRO_BASE_PLANS = ['monthly', 'yearly'] as const;
export const PLAY_PACKAGE = 'com.recipebuddy.android';
export const playAccountId = (user: string) => createHash('sha256').update('recipe-buddy:' + user).digest('hex');
export const subscriptionPurchase = z.object({
  subscriptionState: z.string(), acknowledgementState: z.string(),
  externalAccountIdentifiers: z.object({ obfuscatedExternalAccountId: z.string() }).optional(),
  outOfAppPurchaseContext: z.object({ expiredExternalAccountIdentifiers: z.object({ obfuscatedExternalAccountId: z.string() }).optional() }).optional(),
  lineItems: z.array(z.object({ productId: z.string(), expiryTime: z.string().datetime(), offerDetails: z.object({ basePlanId: z.string() }), autoRenewingPlan: z.object({ autoRenewEnabled: z.boolean().optional() }).optional() })).max(10),
});
export function activeSubscription(state: string, expiry: Date, now = Date.now()) {
  return ['SUBSCRIPTION_STATE_ACTIVE', 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD', 'SUBSCRIPTION_STATE_CANCELED'].includes(state) && expiry.getTime() > now;
}
export function validatePurchase(value: unknown, user: string) {
  const row = subscriptionPurchase.parse(value);
  const account = row.externalAccountIdentifiers?.obfuscatedExternalAccountId ?? row.outOfAppPurchaseContext?.expiredExternalAccountIdentifiers?.obfuscatedExternalAccountId;
  if (account !== playAccountId(user)) throw new Error('Purchase belongs to another account');
  const item = row.lineItems.filter(i => i.productId === PRO_PRODUCT && PRO_BASE_PLANS.some(plan => plan === i.offerDetails.basePlanId) && i.autoRenewingPlan)
    .sort((a, b) => Date.parse(b.expiryTime) - Date.parse(a.expiryTime))[0];
  if (!item) throw new Error('Unexpected subscription product');
  return { state: row.subscriptionState, expiresAt: new Date(item.expiryTime), acknowledge: row.acknowledgementState === 'ACKNOWLEDGEMENT_STATE_PENDING' && activeSubscription(row.subscriptionState, new Date(item.expiryTime)) };
}
