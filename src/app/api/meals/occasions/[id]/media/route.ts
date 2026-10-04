import { userId, HttpError } from "@/lib/http";
import { db } from "@/lib/db";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  try {
    const actor = await userId(),
      { id } = await context.params,
      kitchenId = new URL(request.url).searchParams.get("kitchenId") ?? actor;
    const row = await db.mealMedia.findFirst({
      where: {
        occasionId: id,
        kitchenId,
        actorId: actor,
        kitchen: { members: { some: { userId: actor } } },
      },
      select: { photo: true },
    });
    if (!row) throw new HttpError(404, "Private photo unavailable.");
    return new Response(new Uint8Array(row.photo), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    return new Response(null, {
      status: e instanceof HttpError ? e.status : 500,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
