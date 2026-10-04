import { api, body, userId } from "@/lib/http";
import { db } from "@/lib/db";
import { sharedRecipeWhere } from "@/lib/social-policy";
import { checkMeal } from "@/lib/meal-health";
import { z } from "zod";
import { localDate } from "@/lib/meal-engine";
import { practicalRank } from "@/lib/meal-ranking";
import { readMeals } from "@/lib/meal-service";
import { consume, type Profile, type Ingredient } from "@/lib/meal-engine";
export async function POST(request: Request) {
  return api(async () => {
    const input = z
        .object({
          kitchenId: z.string().max(80).optional(),
          diners: z.array(z.string().max(80)).max(20),
          limit: z.number().int().min(1).max(7).default(3),
          ingredients: z.array(z.string().max(80)).max(20).default([]),
          servings: z.number().positive().max(100).default(2),
          date: localDate.optional(),
        })
        .parse(await body(request)),
      user = await userId();
    const kitchen = await readMeals(user, input.kitchenId),
      profiles = await db.mealProfile.findMany({
        where: { kitchenId: kitchen.kitchenId, id: { in: input.diners } },
      });
    const recipes = await db.recipe.findMany({
      where: {
        OR: [{ userId: user }, { shares: { some: sharedRecipeWhere(user) } }],
      },
      take: 200,
      orderBy: { updatedAt: "desc" },
    });
    const assessed = recipes.map((recipe) => {
      const check = checkMeal(
        recipe.ingredients as unknown as Ingredient[],
        profiles.map((p) => p.data as unknown as Profile),
        !input.diners.length || profiles.length !== input.diners.length,
        kitchen.state.pantry,
      );
      return {
        id: recipe.id,
        title: recipe.title,
        servings: recipe.servings,
        recipeVersion: recipe.updatedAt.toISOString(),
        check,
        missing: consume(
          structuredClone(kitchen.state.pantry),
          recipe.ingredients as unknown as Ingredient[],
          input.servings / recipe.servings,
        ).unresolved,
        ...practicalRank(
          {
            ...recipe,
            ingredients: recipe.ingredients as unknown as Ingredient[],
          },
          kitchen.state,
          profiles.map((p) => p.data as unknown as Profile),
          input.ingredients,
          input.date ??
            new Intl.DateTimeFormat("en-CA", {
              timeZone: kitchen.state.timezone,
            }).format(new Date()),
        ),
      };
    });
    // Restricted unresolved candidates are excluded; manual planning remains available.
    const candidates = assessed
      .filter(
        (r) =>
          (!input.ingredients.length || r.selectedCoverage > 0) &&
          (r.check.status === "not-assessed" ||
            (input.diners.length === 0 && r.check.status !== "conflict")),
      )
      .sort((a, b) => a.rank - b.rank)
      .slice(0, input.limit);
    return {
      candidates,
      excluded: assessed.length - candidates.length,
      reason: candidates.length
        ? "practical-candidates-not-medical-assessment"
        : "No candidate has sufficient reviewed restriction evidence. Manual planning remains available.",
      provider: "saved-recipes",
      nutrition: null,
    };
  });
}
