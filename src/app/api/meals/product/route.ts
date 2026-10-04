import { api, body, userId, HttpError } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import { lookupMealProduct } from "@/lib/meal-products";
export async function POST(request: Request) {
  return api(async () => {
    const user = await userId();
    if (!(await rateLimit(`meal-product:${user}`, 12)))
      throw new HttpError(429, "Too many product lookups. Try later.");
    return lookupMealProduct(
      z.object({ barcode: z.string() }).parse(await body(request)).barcode,
    );
  });
}
