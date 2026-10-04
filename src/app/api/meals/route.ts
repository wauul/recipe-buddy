import { api, body, userId, HttpError } from "@/lib/http";
import { applyMeal, mealOperation, readMeals } from "@/lib/meal-service";
import { rateLimit } from "@/lib/rate-limit";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return api(async () => {
    const url = new URL(request.url);
    return readMeals(
      await userId(),
      url.searchParams.get("kitchenId") ?? undefined,
      url.searchParams.get("from") ?? undefined,
      url.searchParams.get("to") ?? undefined,
    );
  });
}
export async function POST(request: Request) {
  return api(async () => {
    const user = await userId();
    if (!(await rateLimit(`meals:${user}`, 120)))
      throw new HttpError(429, "Try again shortly.");
    return applyMeal(user, mealOperation.parse(await body(request)));
  });
}
