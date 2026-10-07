import { compare } from 'bcryptjs';
import { z } from 'zod';
import { db } from './db';
import { HttpError } from './http';
import { rateLimit } from './rate-limit';
import type { Kitchen } from './meal-engine';
import { Prisma } from '@prisma/client';
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
    const kitchens=await tx.mealKitchen.findMany({where:{members:{some:{userId}}}});
    for(const kitchen of kitchens) {
      if(kitchen.ownerId===userId) continue;
      await tx.$queryRaw`SELECT "id" FROM "MealKitchen" WHERE "id"=${kitchen.id} FOR UPDATE`;
      const current=await tx.mealKitchen.findUniqueOrThrow({where:{id:kitchen.id}}),state=current.state as unknown as Kitchen;
      const profiles=await tx.mealProfile.findMany({where:{kitchenId:kitchen.id,managerId:userId}}),ids=profiles.map(p=>p.id);
        const occasions=state.occasions.filter(o=>o.actorId===userId).map(o=>o.id),leftovers=state.leftovers.filter(l=>occasions.includes(l.occasionId)).map(l=>l.id);
        state.contexts=(state.contexts??[]).filter(c=>c.actorId!==userId);
        state.checkInConfirmations=(state.checkInConfirmations??[]).filter(c=>c.actorId!==userId);
        state.checkInReminders=(state.checkInReminders??[]).filter(c=>c.actorId!==userId);
        state.rescues=(state.rescues??[]).filter(r=>r.actorId!==userId);
        for(const b of state.baskets??[])if(b.actorId===userId){b.actorId="";b.location="";b.providerOrderId="";b.notes="";}
        for(const t of state.preparation??[])if(t.actorId===userId){t.actorId="";t.description="Preparation";t.assignee=current.ownerId;}
        state.leftovers=state.leftovers.filter(l=>!leftovers.includes(l.id));
        state.dailyCoverage=(state.dailyCoverage??[]).filter(c=>!ids.includes(c.personId));state.occasions=state.occasions.filter(o=>o.actorId!==userId);state.eaten=state.eaten.filter(e=>!ids.includes(e.personId));state.eaten.forEach(e=>{if(e.occasionId&&occasions.includes(e.occasionId))delete e.occasionId;if(e.leftoverId&&leftovers.includes(e.leftoverId))delete e.leftoverId;});state.history.forEach(h=>{if(h.actorId===userId)h.actorId='';});state.plans.forEach(p=>{p.diners=p.diners.filter(id=>!ids.includes(id));if(p.leftoverId&&leftovers.includes(p.leftoverId))delete p.leftoverId;if(p.cookedId&&occasions.includes(p.cookedId))delete p.cookedId;});
      await tx.mealKitchen.update({where:{id:kitchen.id},data:{state:JSON.parse(JSON.stringify(state)) as Prisma.InputJsonValue,version:{increment:1}}});
    }
    await tx.mealReceipt.deleteMany({where:{actorId:userId}});
    await tx.nativeAuthAttempt.deleteMany({ where: { userId } });
    await tx.friendInvite.deleteMany({ where: { OR: [{ inviterId: userId }, { redeemedBy: userId }] } });
    await tx.verificationToken.deleteMany({ where: { identifier: user.email } });
    await tx.contentReport.deleteMany({ where: { OR: [{ reportedUserId: userId }, { recipeId: { in: (await tx.recipe.findMany({ where: { userId }, select: { id: true } })).map(r => r.id) } }] } });
    await tx.user.delete({ where: { id: userId } });
  });
  return { ok: true, confirmation };
}
