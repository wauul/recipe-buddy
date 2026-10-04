import type { Ingredient, Kitchen, Profile } from "./meal-engine";
import { canonical } from "./meal-engine";
export function practicalRank(
  recipe: {
    title: string;
    ingredients: Ingredient[];
    steps: unknown;
    sourceProvenance: unknown;
  },
  kitchen: Kitchen,
  profiles: Profile[],
  selected: string[],
  date: string,
) {
  const context = (kitchen.contexts ?? []).find((c) => c.date === date);
  const provenance = recipe.sourceProvenance as {
    totalTimeMinutes?: number | null;
  } | null;
  const recent = kitchen.eaten.filter(
    (e) =>
      e.title === recipe.title &&
      e.date < date &&
      e.date >=
        new Date(Date.parse(date + "T12:00:00Z") - 14 * 86400000)
          .toISOString()
          .slice(0, 10),
  ).length;
  const upcoming = kitchen.plans.filter(
    (p) => p.title === recipe.title && p.date >= date,
  ).length;
  const dislikes = profiles
    .flatMap((p) => p.dislikes)
    .filter((d) =>
      recipe.ingredients.some((i) => canonical(i.name).includes(canonical(d))),
    ).length;
  const selectedCoverage = selected.filter((n) =>
    recipe.ingredients.some((i) => canonical(i.name) === canonical(n)),
  ).length;
  const instructions = Array.isArray(recipe.steps)
    ? recipe.steps.join(" ").toLowerCase()
    : "";
  const ovenMention = /\boven\b|\bfour\b/.test(instructions),
    equipment = context?.equipment ?? [];
  const equipmentMismatch =
    equipment.length > 0 &&
    ovenMention &&
    !equipment.some((e) => /oven|four/i.test(e));
  const timeMismatch =
    context?.timeMinutes &&
    provenance?.totalTimeMinutes &&
    provenance.totalTimeMinutes > context.timeMinutes;
  return {
    rank:
      recent * 3 +
      upcoming * 2 +
      dislikes * 5 -
      selectedCoverage * 4 +
      (equipmentMismatch ? 10 : 0) +
      (timeMismatch ? 10 : 0),
    selectedCoverage,
    reasons: [
      ...(recent ? ["recent-actual-meal"] : []),
      ...(upcoming ? ["already-planned"] : []),
      ...(selectedCoverage ? ["selected-pantry-ingredient"] : []),
      ...(equipmentMismatch ? ["instructions-mention-unlisted-oven"] : []),
      ...(timeMismatch ? ["source-time-exceeds-daily-context"] : []),
      ...(!provenance?.totalTimeMinutes ? ["cooking-time-unknown"] : []),
      "prices-unavailable",
      "health-check-precedes-preferences",
    ],
  };
}
