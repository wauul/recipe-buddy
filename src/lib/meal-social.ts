import { db } from "./db";
import { HttpError } from "./http";
import type { Kitchen } from "./meal-engine";
import { z } from "zod";
import { sharedRecipeWhere } from "./social-policy";
export async function canReadMealPost(user: string, author: string) {
  if (user === author) return true;
  const [a, b] = [user, author].sort();
  const blocked = await db.userBlock.findFirst({
    where: {
      OR: [
        { blockerId: user, blockedId: author },
        { blockerId: author, blockedId: user },
      ],
    },
  });
  return (
    !blocked &&
    !!(await db.friendship.findFirst({
      where: { userAId: a, userBId: b, acceptedAt: { not: null } },
    }))
  );
}
export async function mealFeed(user: string, cursor?: string) {
  const connections = await db.friendship.findMany({
    where: {
      acceptedAt: { not: null },
      OR: [{ userAId: user }, { userBId: user }],
    },
  });
  const authors = [
    user,
    ...connections.map((f) => (f.userAId === user ? f.userBId : f.userAId)),
  ];
  const blocked = await db.userBlock.findMany({
    where: { OR: [{ blockerId: user }, { blockedId: user }] },
  });
  const denied = blocked.map((b) =>
    b.blockerId === user ? b.blockedId : b.blockerId,
  );
  const rows = await db.mealPost.findMany({
    where: { authorId: { in: authors.filter((a) => !denied.includes(a)) } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 21,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      authorId: true,
      caption: true,
      rating: true,
      recipeId: true,
      createdAt: true,
      author: { select: { username: true } },
      reactions: { select: { userId: true } },
    },
  });
  const page = rows.slice(0, 20);
  return {
    posts: await Promise.all(
      page.map(async (p) => {
        const row = await db.mealPost.findUnique({
          where: { id: p.id },
          select: { photo: true },
        });
        const recipe = p.recipeId
          ? await db.recipe.findFirst({
              where: {
                id: p.recipeId,
                OR: [
                  { userId: user },
                  { shares: { some: sharedRecipeWhere(user) } },
                ],
              },
              select: { id: true, userId: true },
            })
          : null;
        return {
          id: p.id,
          author: p.author.username,
          authorId: p.authorId,
          owned: p.authorId === user,
          caption: p.caption,
          rating: p.rating,
          date: p.createdAt,
          photo: row?.photo ? `/api/meals/activity/${p.id}/media` : null,
          recipe: recipe
            ? { id: recipe.id, owned: recipe.userId === user }
            : null,
          reactions: p.reactions.length,
          reacted: p.reactions.some((r) => r.userId === user),
        };
      }),
    ),
    nextCursor: rows.length > 20 ? page.at(-1)?.id : null,
  };
}
export async function publishMeal(user: string, raw: unknown) {
  const input = z
    .object({
      id: z.string().uuid(),
      kitchenId: z.string().max(80),
      occasionId: z.string().max(80),
      caption: z.string().max(1000),
      includePhoto: z.boolean(),
      includeRating: z.boolean(),
      includeRecipe: z.boolean(),
    })
    .parse(raw);
  const kitchen = await db.mealKitchen.findFirst({
      where: { id: input.kitchenId, members: { some: { userId: user } } },
    }),
    occasion = (kitchen?.state as unknown as Kitchen)?.occasions.find(
      (o) => o.id === input.occasionId && o.actorId === user && !o.undone,
    );
  if (!occasion) throw new HttpError(404, "Cooking occasion unavailable.");
  const prior = await db.mealPost.findUnique({
    where: { id: input.id },
    select: { authorId: true },
  });
  if (prior && prior.authorId !== user)
    throw new HttpError(409, "Publication ID already used.");
  const privateMedia = input.includePhoto
    ? await db.mealMedia.findFirst({
        where: {
          kitchenId: input.kitchenId,
          occasionId: occasion.id,
          actorId: user,
        },
        select: { photo: true },
      })
    : null;
  await db.mealPost.upsert({
    where: { id: input.id },
    create: {
      id: input.id,
      kitchenId: input.kitchenId,
      authorId: user,
      occasionId: occasion.id,
      caption: input.caption,
      rating: input.includeRating ? occasion.rating : null,
      photo:
        privateMedia?.photo ??
        (input.includePhoto && occasion.photo.startsWith("data:")
          ? Buffer.from(occasion.photo.split(",")[1], "base64")
          : null),
      recipeId: input.includeRecipe ? occasion.recipeId : null,
    },
    update: {},
  });
  return { ok: true };
}
