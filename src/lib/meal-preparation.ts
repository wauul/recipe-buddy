import { z } from "zod";
import { ingredient, localDate, measure, type Kitchen, type Preparation } from "./meal-engine";

export const preparationInput = z.object({
  id: z.string().uuid(), planId: z.string().min(1).max(80).optional(),
  description: z.string().trim().min(1).max(500), date: localDate,
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable().default(null),
  timezone: z.string().max(80), activeMinutes: z.number().int().min(1).max(1440).nullable().default(null),
  passiveMinutes: z.number().int().min(1).max(10080).nullable().default(null),
  dependencies: z.array(z.string().uuid()).max(30).default([]),
  assignee: z.string().min(1).max(80), reminder: z.boolean().default(false),
  override: z.boolean().default(false),
});
export const actualPreparation = z.array(ingredient).max(100).refine(
  values => values.every(i => !i.omitted && measure(i.quantity, i.unit)),
  "Actual preparation use needs a known quantity and compatible unit.",
);

export function validateDependencies(tasks: Preparation[], task: Preparation) {
  const all = tasks.filter(t => t.id !== task.id).concat(task);
  if (task.dependencies.some(id => !all.some(t => t.id === id))) throw new Error("Preparation dependency unavailable.");
  const visit = (id: string, path: Set<string>) => {
    if (path.has(id)) throw new Error("Preparation dependencies cannot form a cycle.");
    const next = new Set(path).add(id);
    for (const dependency of all.find(t => t.id === id)?.dependencies ?? []) visit(dependency, next);
  };
  visit(task.id, new Set());
}

export function movePreparation(state: Kitchen, planId: string, oldDate: string, newDate?: string) {
  for (const task of state.preparation ?? []) {
    if (task.planId !== planId || task.status === "completed") continue;
    if (!newDate) { delete task.planId; task.reviewNeeded = true; }
    else if (!task.override && task.date === oldDate) task.date = newDate;
    else task.reviewNeeded = true;
  }
}
