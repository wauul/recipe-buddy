import { api, body, userId, HttpError } from "@/lib/http";
import { db } from "@/lib/db";
import { canReadMealPost } from "@/lib/meal-social";
import { z } from "zod";
export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  return api(async () => {
    const user = await userId(),
      { id } = await props.params,
      { react } = z.object({ react: z.boolean() }).parse(await body(request));
    const post = await db.mealPost.findUnique({ where: { id } });
    if (!post || !(await canReadMealPost(user, post.authorId)))
      throw new HttpError(404, "Post unavailable.");
    if (react)
      await db.mealReaction.upsert({
        where: { postId_userId: { postId: id, userId: user } },
        create: { postId: id, userId: user },
        update: {},
      });
    else
      await db.mealReaction.deleteMany({ where: { postId: id, userId: user } });
    return { ok: true };
  });
}
export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  return api(async () => {
    await body(request);
    const user = await userId(),
      { id } = await props.params;
    await db.mealPost.deleteMany({ where: { id, authorId: user } });
    return { ok: true };
  });
}
