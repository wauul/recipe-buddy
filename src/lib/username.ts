import { z } from 'zod';

// User IDs remain the identity; names are editable display names, not login handles.
export const usernameSchema = z.string().trim().min(1, 'Choose a username.').max(64, 'Use at most 64 characters.')
  .refine(value => !/[@\p{Cc}\p{Cf}]/u.test(value), 'Use a name without @ or hidden control characters.');
export function displayUsername(user: { username?: string | null; email: string }) {
  return user.username || user.email.split('@')[0];
}
export const settingsSchema = z.object({ username: usernameSchema.optional(), roastEnabled: z.boolean().optional() })
  .refine(value => value.username !== undefined || value.roastEnabled !== undefined, 'Choose a setting to update.');
