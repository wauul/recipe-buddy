import { z } from "zod";
import { HttpError } from "./http";
export async function lookupMealProduct(barcode: string) {
  z.string()
    .regex(/^\d{8,14}$/)
    .parse(barcode);
  if (process.env.MEAL_PRODUCT_LOOKUP_ENABLED !== "true")
    throw new HttpError(
      503,
      "Barcode lookup is unavailable pending product-data licence review. Manual entry works.",
    );
  const fields =
    "code,product_name,brands,ingredients_text,allergens,traces,quantity,nutriments,last_modified_t";
  let r: Response;
  try {
    r = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=${fields}`,
      {
        headers: {
          "User-Agent":
            "RecipeBuddy/1.0 (product label confirmation; recipebuddy.app)",
        },
        signal: AbortSignal.timeout(6000),
        cache: "no-store",
      },
    );
  } catch {
    throw new HttpError(
      503,
      "Product lookup is temporarily unavailable. Enter the label manually.",
    );
  }
  if (!r.ok)
    throw new HttpError(
      503,
      "Product lookup is temporarily unavailable. Enter the label manually.",
    );
  const data = z
    .object({
      status: z.number(),
      product: z
        .object({
          product_name: z.string().max(500).optional(),
          brands: z.string().max(500).optional(),
          ingredients_text: z.string().max(10000).optional(),
          allergens: z.string().max(2000).optional(),
          traces: z.string().max(2000).optional(),
          quantity: z.string().max(200).optional(),
          nutriments: z.record(z.unknown()).optional(),
          last_modified_t: z.number().optional(),
        })
        .optional(),
    })
    .parse(await r.json());
  if (!data.product || data.status !== 1)
    throw new HttpError(
      404,
      "Product not found. Enter the package details manually.",
    );
  const p = data.product;
  const nutrient = (key: string) =>
    typeof p.nutriments?.[key] === "number" &&
    Number.isFinite(p.nutriments[key])
      ? p.nutriments[key]
      : null;
  return {
    barcode,
    name: p.product_name ?? "",
    brand: p.brands ?? "",
    label: [p.ingredients_text, p.allergens, p.traces]
      .filter(Boolean)
      .join(" · ")
      .slice(0, 2000),
    package: p.quantity ?? null,
    nutrition: {
      basis: "100 g as sold",
      energyKcal: nutrient("energy-kcal_100g"),
      carbohydrateG: nutrient("carbohydrates_100g"),
      proteinG: nutrient("proteins_100g"),
      fatG: nutrient("fat_100g"),
      sodiumG: nutrient("sodium_100g"),
      saltG: nutrient("salt_100g"),
    },
    source: {
      provider: "Open Food Facts",
      url: `https://world.openfoodfacts.org/product/${barcode}`,
      license: "ODbL / Database Contents License",
      retrievedAt: new Date().toISOString(),
      modifiedAt: p.last_modified_t ?? null,
    },
    confidence: "user-confirmation-required",
    crossContact: "unknown",
  };
}
