export const chefLevels = [
  {
    level: 1,
    name: 'Toast Rookie',
    points: 0,
    description: 'Every great kitchen starts with a little toast.',
  },
  {
    level: 2,
    name: 'Whisk Whisperer',
    points: 30,
    description: 'Getting into the rhythm of your kitchen.',
  },
  {
    level: 3,
    name: 'Pan Wrangler',
    points: 80,
    description: 'A growing collection, and a pan under control.',
  },
  {
    level: 4,
    name: 'Sauce Sorcerer',
    points: 180,
    description: 'Turning good ingredients into repeat requests.',
  },
  {
    level: 5,
    name: 'Flavor Alchemist',
    points: 350,
    description: 'Making a little kitchen magic of your own.',
  },
  {
    level: 6,
    name: 'Feast Maestro',
    points: 650,
    description: 'A kitchen other chefs come back to.',
  },
  {
    level: 7,
    name: 'Apron Legend',
    points: 1100,
    description: 'A recipe collection with stories worth sharing.',
  },
] as const;

export function chefProgress(recipeCount: number, receivedAprons: number, reviewCount = 0) {
  if (
    ![recipeCount, receivedAprons, reviewCount].every(
      (value) => Number.isSafeInteger(value) && value >= 0,
    )
  ) {
    throw new Error('Chef totals must be non-negative whole numbers.');
  }
  const points = recipeCount * 10 + receivedAprons * 2;
  const current = [...chefLevels].reverse().find((level) => points >= level.points)!;
  const next = chefLevels.find((level) => level.level === current.level + 1) ?? null;
  return {
    current,
    next,
    points,
    recipeCount,
    receivedAprons,
    reviewCount,
    averageAprons: reviewCount ? receivedAprons / reviewCount : null,
    progress: next
      ? Math.min(
          100,
          Math.floor(((points - current.points) / (next.points - current.points)) * 100),
        )
      : 100,
    pointsToNext: next ? Math.max(0, next.points - points) : 0,
  };
}
export type ChefProgress = ReturnType<typeof chefProgress>;
