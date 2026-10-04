import { api, body, userId } from "@/lib/http";
import { importDiscoveredMeal } from "@/lib/meal-discovery";
export async function POST(request: Request) {
  return api(async () =>
    importDiscoveredMeal(await userId(), await body(request)),
  );
}
