import { db } from './db';
import { HttpError } from './http';
import { friendPair } from './social-policy';
import { tokenHash, tokenPattern, opaqueToken } from './native-crypto';
import { rateLimit } from './rate-limit';
import { displayUsername } from './username';
import { assertNotBlocked } from './moderation';
export async function createInvite(inviterId: string) {
  if (!(await rateLimit(`invite-create:${inviterId}`, 10, 3600))) throw new HttpError(429, 'Invitation limit reached.');
  const token = opaqueToken(), expiresAt = new Date(Date.now() + 7 * 86400_000);
  await db.$transaction(async tx => {
    await tx.friendInvite.updateMany({ where: { inviterId, redeemedAt: null, revokedAt: null }, data: { revokedAt: new Date() } });
    await tx.friendInvite.create({ data: { hash: tokenHash(token), inviterId, expiresAt } });
  });
  return { url: new URL(`/invite/${token}`, process.env.NEXTAUTH_URL).toString(), expiresAt: expiresAt.toISOString() };
}
export async function previewInvite(token: string) {
  if (!tokenPattern.test(token)) throw new HttpError(400, 'Invalid invitation.');
  const row = await db.friendInvite.findUnique({ where: { hash: tokenHash(token) }, include: { inviter: { select: { username: true, email: true } } } });
  if (!row) throw new HttpError(404, 'Invitation not found.');
  if (row.revokedAt) throw new HttpError(410, 'Invitation revoked.');
  if (row.expiresAt <= new Date()) throw new HttpError(410, 'Invitation expired.');
  if (row.redeemedAt) throw new HttpError(409, 'Invitation already used.');
  return { chefName: displayUsername(row.inviter), expiresAt: row.expiresAt.toISOString() };
}
export async function redeemInvite(token: string, actor: string) {
  if (!tokenPattern.test(token)) throw new HttpError(400, 'Invalid invitation.');
  if (!(await rateLimit(`invite-redeem:${actor}`, 20, 3600))) throw new HttpError(429, 'Try again later.');
  return db.$transaction(async tx => {
    const hash = tokenHash(token), now = new Date();
    const row = await tx.friendInvite.findUnique({ where: { hash } });
    if (!row) throw new HttpError(404, 'Invitation not found.');
    if (row.revokedAt || row.expiresAt <= now) throw new HttpError(410, 'Invitation expired or revoked.');
    if (row.inviterId === actor) throw new HttpError(400, 'You cannot accept your own invitation.');
    await assertNotBlocked(actor, row.inviterId);
    if (row.redeemedBy === actor) return { ok: true };
    if (row.redeemedAt) throw new HttpError(409, 'Invitation already used.');
    const claimed = await tx.friendInvite.updateMany({ where: { hash, redeemedAt: null, revokedAt: null, expiresAt: { gt: now } }, data: { redeemedAt: now, redeemedBy: actor } });
    if (!claimed.count) {
      const latest = await tx.friendInvite.findUnique({ where: { hash } });
      if (latest?.redeemedBy === actor) return { ok: true };
      throw new HttpError(409, 'Invitation already used.');
    }
    const pair = friendPair(actor, row.inviterId);
    await tx.friendship.upsert({ where: { userAId_userBId: pair },
      create: { ...pair, requesterId: row.inviterId, acceptedAt: now }, update: { acceptedAt: now } });
    return { ok: true };
  });
}
