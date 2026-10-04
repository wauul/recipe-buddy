import { api, body, userId } from "@/lib/http";
import { discoverMeals } from "@/lib/meal-discovery";
export const maxDuration = 90;
export async function POST(request: Request) {
  return api(async () => discoverMeals(await userId(), await body(request)));
}
