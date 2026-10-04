import { api, body, userId } from "@/lib/http";
import { mealFeed, publishMeal } from "@/lib/meal-social";
import { HttpError } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
export async function GET(request: Request) {
  return api(async () =>
    mealFeed(
      await userId(),
      new URL(request.url).searchParams.get("cursor") ?? undefined,
    ),
  );
}
export async function POST(request: Request) {
  return api(async () => {
    const user = await userId();
    if (!(await rateLimit(`meal-publication:${user}`, 30)))
      throw new HttpError(429, "Too many publications. Try again later.");
    return publishMeal(user, await body(request));
  });
}
