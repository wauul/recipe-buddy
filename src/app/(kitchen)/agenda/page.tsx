import { currentUser } from "@/lib/data";
import { db } from "@/lib/db";
import { sharedRecipeWhere } from "@/lib/social-policy";
import { MealWorkbench } from "@/components/meal-workbench";
export default async function Agenda() {
  const user = await currentUser();
  const recipes = await db.recipe.findMany({
    where: {
      OR: [
        { userId: user.id },
        { shares: { some: sharedRecipeWhere(user.id) } },
      ],
    },
    select: { id: true, title: true, servings: true, steps: true },
    take: 200,
    orderBy: { title: "asc" },
  });
  return <MealWorkbench recipes={recipes} />;
}
