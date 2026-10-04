import { api, userId } from "@/lib/http";
import { db } from "@/lib/db";
import { readMeals } from "@/lib/meal-service";
export async function GET() {
  return api(async () => {
    const user = await userId(),
      memberships = await db.mealMember.findMany({
        where: { userId: user },
        select: { kitchenId: true },
      });
    return {
      exportedAt: new Date().toISOString(),
      kitchens: await Promise.all(
        memberships.map((m) => readMeals(user, m.kitchenId)),
      ),
    };
  });
}
