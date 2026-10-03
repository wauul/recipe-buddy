import { compare } from 'bcryptjs';
import { z } from 'zod';
import { db } from './db';
import { HttpError } from './http';
import { rateLimit } from './rate-limit';
export const TERMS_VERSION = '2026-10-03';
export async function requireTerms(userId: string) {
  if ((await db.user.findUnique({ where: { id: userId }, select: { termsVersion: true } }))?.termsVersion !== TERMS_VERSION)
    throw new HttpError(428, 'Please accept the Terms of use before creating or sharing content.');
}
export async function acceptTerms(userId: string, input: unknown) {
  z.object({ version: z.literal(TERMS_VERSION), accepted: z.literal(true) }).strict().parse(input);
  await db.user.update({ where: { id: userId }, data: { termsVersion: TERMS_VERSION, termsAcceptedAt: new Date() } });
  return { ok: true, version: TERMS_VERSION };
}
export async function deleteAccount(userId: string, input: unknown, authenticatedAt?: number) {
  const { confirmation, password } = z.object({ confirmation: z.literal('DELETE'), password: z.string().max(128).optional() }).strict().parse(input);
  if (!(await rateLimit(`account-delete:${userId}`, 5, 900))) throw new HttpError(429, 'Try again in 15 minutes.');
  const user = await db.user.findUnique({ where: { id: userId }, select: { email: true, hashedPassword: true } });
  if (!user) throw new HttpError(401, 'Account is unavailable.');
  const validPassword = password && user.hashedPassword ? await compare(password, user.hashedPassword) : false;
  const recent = authenticatedAt != null && authenticatedAt <= Date.now() && Date.now() - authenticatedAt < 5 * 60_000;
  if (!validPassword && !recent) throw new HttpError(403, 'Enter your current password or sign in again before deleting your account.');
  if (password && user.hashedPassword && !validPassword) throw new HttpError(403, 'Current password is incorrect.');
  // Cascade removes owned recipes, contributions, friendships/shares, OAuth accounts,
  // sessions, refresh tokens, translations and attributable recognition results.
  await db.$transaction(async tx => {
    await tx.nativeAuthAttempt.deleteMany({ where: { userId } });
    await tx.friendInvite.deleteMany({ where: { OR: [{ inviterId: userId }, { redeemedBy: userId }] } });
    await tx.verificationToken.deleteMany({ where: { identifier: user.email } });
    await tx.contentReport.deleteMany({ where: { OR: [{ reportedUserId: userId }, { recipeId: { in: (await tx.recipe.findMany({ where: { userId }, select: { id: true } })).map(r => r.id) } }] } });
    await tx.user.delete({ where: { id: userId } });
  });
  return { ok: true, confirmation };
}
