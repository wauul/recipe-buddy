import { api, userId, HttpError } from "@/lib/http";
import { readCheckIn } from "@/lib/meal-service";
import { rateLimit } from "@/lib/rate-limit";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return api(async () => {
    const user = await userId();
    if (!(await rateLimit(`check-in:${user}`, 60)))
      throw new HttpError(429, "Try again shortly.");
    const id = new URL(request.url).searchParams.get("kitchenId");
    if (id && id.length > 80) throw new HttpError(400, "Invalid kitchen.");
    const offset = Number(new URL(request.url).searchParams.get("offset") ?? 0);
    if (!Number.isInteger(offset) || offset < 0 || offset > 40000)
      throw new HttpError(400, "Invalid page.");
    return readCheckIn(user, id ?? undefined, offset);
  });
}
