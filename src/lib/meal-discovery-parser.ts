import { load } from "cheerio";
import { recipeSchema } from "./validation";
import { measure } from "./meal-engine";
// A bounded deterministic parser. Missing/ambiguous critical data is review-needed,
// never repaired by inventing yield, quantity or instructions.
export function parsedDiscoveryRecipe(value: Record<string, unknown> | null) {
  if (!value) return null;
  const clean = (v: unknown) =>
    typeof v === "string"
      ? load(`<body>${v}</body>`)("body").text().trim()
      : "";
  const yieldText = Array.isArray(value.recipeYield)
    ? value.recipeYield[0]
    : value.recipeYield;
  const match = String(yieldText ?? "").match(
    /^\s*(\d+)\s*(?:servings?|portions?|people|personnes?)?\s*$/i,
  );
  if (!match || !Array.isArray(value.recipeIngredient)) return null;
  const ingredients = value.recipeIngredient.map((raw) => {
    const original = clean(raw);
    const m = original.match(
      /^([\d.,/\s¼½¾⅓⅔⅛]+)\s*(kg|mg|g|ml|l|oz|lb|cups?|tbsp|tsp)?\s+(.+)$/i,
    );
    return m
      ? {
          name: m[3],
          quantity: m[1].trim(),
          unit: m[2]?.toLowerCase() ?? "count",
        }
      : null;
  });
  if (ingredients.some((i) => !i || !measure(i.quantity, i.unit))) return null;
  function steps(v: unknown): string[] {
    if (Array.isArray(v)) return v.flatMap(steps);
    if (typeof v === "string") return [clean(v)];
    if (v && typeof v === "object") {
      const o = v as Record<string, unknown>;
      return o.itemListElement ? steps(o.itemListElement) : [clean(o.text)];
    }
    return [];
  }
  const parsed = recipeSchema.safeParse({
    title: clean(value.name),
    servings: Number(match[1]),
    ingredients,
    steps: steps(value.recipeInstructions).filter(Boolean),
    imageUrl: "",
  });
  return parsed.success ? parsed.data : null;
}
