import { userId, HttpError, api, body } from "@/lib/http";
import { db } from "@/lib/db";
import { canReadMealPost } from "@/lib/meal-social";
export async function GET(
  _request: Request,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const user = await userId(),
      { id } = await props.params,
      post = await db.mealPost.findUnique({ where: { id } });
    if (!post?.photo || !(await canReadMealPost(user, post.authorId)))
      throw new HttpError(404, "Photo unavailable.");
    return new Response(new Uint8Array(post.photo), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return api(async () => {
      throw error;
    });
  }
}
export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  return api(async () => {
    await body(request);
    const user = await userId(),
      { id } = await props.params;
    if(!await db.mealPost.findFirst({where:{id,authorId:user},select:{id:true}}))throw new HttpError(404,"Publication unavailable.");
    await db.mealPost.updateMany({
      where: { id, authorId: user },
      data: { photo: null },
    });
    return { ok: true };
  });
}
