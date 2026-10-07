"use client";
import { useState } from "react";
import { CalendarDays, BookOpen } from "lucide-react";
import { useTranslation } from "./language-provider";
import { MealWorkbench } from "./meal-workbench";
import { ShoppingList } from "./shopping-list";
export function MealShoppingDestination({
  recipes,
  userId,
}: {
  recipes: {
    id: string;
    title: string;
    servings: number;
    imageUrl?: string | null;
  }[];
  userId: string;
}) {
  const [mode, setMode] = useState("week");
  const { locale } = useTranslation();
  return (
    <>
      <div className="meal-choice-chips">
        <button
          type="button"
          aria-pressed={mode === "week"}
          onClick={() => setMode("week")}
        >
          <CalendarDays size={18} />
          {locale === "fr" ? "Semaine" : "Week"}
        </button>
        <button
          type="button"
          aria-pressed={mode === "recipes"}
          onClick={() => setMode("recipes")}
        >
          <BookOpen size={18} />
          {locale === "fr" ? "Recettes" : "Recipes"}
        </button>
      </div>
      {mode === "week" ? (
        <MealWorkbench
          section="shopping"
          recipes={recipes.map((r) => ({
            ...r,
            imageUrl: r.imageUrl ?? undefined,
          }))}
        />
      ) : (
        <ShoppingList recipes={recipes} userId={userId} />
      )}
    </>
  );
}
