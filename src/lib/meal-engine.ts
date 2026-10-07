import { z } from "zod";
import type { GroceryBasket } from "./meal-commerce";
import type { RecordedNutrition } from "./meal-daily-nutrition";

const id = z.string().min(1).max(80);
export const localDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) =>
      !Number.isNaN(Date.parse(v)) &&
      new Date(v).toISOString().slice(0, 10) === v,
  );
export const ingredient = z.object({
  name: z.string().trim().min(1).max(120),
  quantity: z.string().max(40),
  unit: z.string().max(40),
  omitted: z.boolean().optional(),
});
export const batchSchema = z.object({
  id,
  name: z.string().trim().min(1).max(120),
  quantity: z.number().finite().nonnegative().max(1e7).nullable(),
  quantityEstimated: z.boolean().optional(),
  unit: z.string().max(40),
  brand: z.string().max(120).default(""),
  storage: z.enum(["pantry", "fridge", "freezer"]).default("pantry"),
  packageSize: z.number().positive().nullable().default(null),
  opened: localDate.nullable().default(null),
  frozen: localDate.nullable().default(null),
  date: localDate.nullable().default(null),
  dateType: z.enum(["use-by", "best-before", "unknown"]).default("unknown"),
  label: z.string().max(2000).default(""),
  crossContact: z.enum(["unknown", "declared", "confirmed"]).default("unknown"),
  evidence: z
    .object({
      barcode: z.string().regex(/^\d{8,14}$/),
      name: z.string().max(500),
      brand: z.string().max(500),
      label: z.string().max(2000),
      package: z.string().max(200).nullable(),
      nutrition: z.object({
        basis: z.literal("100 g as sold"),
        energyKcal: z.number().nonnegative().nullable(),
        carbohydrateG: z.number().nonnegative().nullable(),
        proteinG: z.number().nonnegative().nullable(),
        fatG: z.number().nonnegative().nullable(),
        sodiumG: z.number().nonnegative().nullable(),
        saltG: z.number().nonnegative().nullable(),
      }),
      source: z.object({
        provider: z.literal("Open Food Facts"),
        url: z
          .string()
          .regex(/^https:\/\/world\.openfoodfacts\.org\/product\/\d{8,14}$/),
        license: z.literal("ODbL / Database Contents License"),
        retrievedAt: z.string().datetime(),
        modifiedAt: z.number().nullable(),
      }),
      confidence: z.literal("user-confirmation-required"),
      crossContact: z.literal("unknown"),
    })
    .nullable()
    .default(null),
});
export const planSchema = z.object({
  id,
  date: localDate,
  slot: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  recipeId: id.optional(),
  title: z.string().min(1).max(160),
  servings: z.number().positive().max(100),
  diners: z.array(id).max(20).default([]),
  locked: z.boolean().default(false),
  ingredients: z.array(ingredient).max(100).default([]),
  referenceServings: z.number().positive().max(100).default(1),
  recipeVersion: z.string().max(80).default(""),
  leftoverId: id.optional(),
  cookedId: id.optional(),
});
export const profileSchema = z
  .object({
    id,
    name: z.string().min(1).max(80),
    ageBand: z.enum(["infant", "under5", "child", "adult"]),
    country: z.string().min(2).max(3),
    consent: z.literal(true),
    caregiverAuthorized: z.boolean().default(false),
    allergies: z.array(z.string().min(1).max(120)).max(40),
    intolerances: z.array(z.string().min(1).max(120)).max(40).default([]),
    coeliac: z.boolean().default(false),
    pregnancy: z.boolean().default(false),
    breastfeeding: z.boolean().default(false),
    diabetes: z
      .enum(["none", "type1", "type2", "gestational", "preexisting-pregnancy"])
      .default("none"),
    otherConditions: z.string().max(1000).default(""),
    clinicianInstructions: z.string().max(2000).default(""),
    dislikes: z.array(z.string().max(120)).max(40).default([]),
    goal: z.enum(["none", "variety", "weight-loss"]).default("none"),
    equipment: z.string().max(500).default(""),
    routine: z.string().max(500).default(""),
  })
  .refine(
    (p) => p.ageBand === "adult" || p.goal !== "weight-loss",
    "Child weight-loss goals are not supported.",
  )
  .refine(
    (p) => p.ageBand === "adult" || p.caregiverAuthorized,
    "Confirm authorized caregiver management for a child profile.",
  );
export type Batch = z.infer<typeof batchSchema>;
export type Plan = z.infer<typeof planSchema>;
export type Profile = z.infer<typeof profileSchema>;
export type Ingredient = z.infer<typeof ingredient>;
export type Effect = { batchId: string; quantity: number };
export type Usage = {
  name: string;
  required: number | null;
  unit: string;
  missing: number | null;
  reason: string;
};
export type Occasion = {
  prepTaskIds?: string[];
  nutritionProducts?: Batch[];
  legacyBaseline?: boolean;
  id: string;
  actorId: string;
  recipeId: string;
  title: string;
  date: string;
  timezone: string;
  servings: number;
  referenceServings: number;
  ingredients: Ingredient[];
  recipeVersion: string;
  effects: Effect[];
  unresolved: Usage[];
  undone: boolean;
  rating: number | null;
  comment: string;
  photo: string;
  planId?: string;
};
export type Eaten = {
  recipeId?: string;
  nutritionEvidence?: RecordedNutrition;
  planId?: string;
  id: string;
  personId: string;
  date: string;
  slot: string;
  title: string;
  amount: number | null;
  occasionId?: string;
  leftoverId?: string;
  approximate: boolean;
};
export type Leftover = {
  id: string;
  occasionId: string;
  title: string;
  remaining: number;
  storage: string;
  date: string | null;
};
export type Purchase = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  date: string;
  batchId: string;
};
export type Kitchen = {
  dailyCoverage?: {personId:string;date:string;confirmed:boolean;signature:string}[];
  baskets?: GroceryBasket[];
  rescues?: {id:string;actorId:string;changes:{before:Plan;after:Plan}[];undone:boolean}[];
  preparation?: Preparation[];
  contexts?: {
    actorId: string;
    date: string;
    timeMinutes: number | null;
    equipment: string[];
    dayType: string;
    appetite: string;
    mealSize: string;
  }[];
  pantry: Batch[];
  plans: Plan[];
  occasions: Occasion[];
  eaten: Eaten[];
  leftovers: Leftover[];
  manualShopping: {
    id: string;
    name: string;
    quantity: string;
    checked: boolean;
  }[];
  purchases: Purchase[];
  history: {
    id: string;
    actorId: string;
    action: string;
    effects: Effect[];
    precision?: { batchId: string; before: boolean; after: boolean };
    reversed: boolean;
    date: string;
  }[];
  timezone: string;
  units: string;
};
export type Preparation = {
  id: string; actorId: string; planId?: string; description: string;
  date: string; time: string | null; timezone: string;
  activeMinutes: number | null; passiveMinutes: number | null;
  dependencies: string[]; assignee: string; reminder: boolean;
  status: "planned" | "completed" | "dismissed";
  override: boolean; reviewNeeded: boolean;
  ingredients: Ingredient[]; effects: Effect[]; unresolved: Usage[];
  cookedId?: string;
  nutritionProducts?: Batch[];
};
export function emptyKitchen(): Kitchen {
  return {
    contexts: [],
    pantry: [],
    plans: [],
    occasions: [],
    eaten: [],
    leftovers: [],
    manualShopping: [],
    purchases: [],
    history: [],
    timezone: "Europe/Paris",
    units: "metric",
  };
}
const aliases: Record<string, string> = {
  rice: "rice",
  riz: "rice",
  chicken: "chicken",
  poulet: "chicken",
  egg: "egg",
  eggs: "egg",
  oeuf: "egg",
  oeufs: "egg",
  œuf: "egg",
  œufs: "egg",
  milk: "milk",
  lait: "milk",
  wheat: "wheat",
  ble: "wheat",
  blé: "wheat",
};
export function canonical(value: string): string {
  const key = value.toLowerCase().normalize("NFKC").trim().replace(/\s+/g, " ");
  return aliases[key] ?? key;
}
const units: Record<string, [string, number]> = {
  g: ["g", 1],
  gram: ["g", 1],
  grams: ["g", 1],
  kg: ["g", 1000],
  mg: ["g", 0.001],
  ml: ["ml", 1],
  l: ["ml", 1000],
  litre: ["ml", 1000],
  oz: ["g", 28.349523125],
  lb: ["g", 453.59237],
  "": ["count", 1],
  count: ["count", 1],
  piece: ["count", 1],
  pieces: ["count", 1],
  pcs: ["count", 1],
  unit: ["count", 1],
  unité: ["count", 1],
};
export function measure(
  quantity: string | number,
  unit: string,
): { amount: number; unit: string } | null {
  let raw = String(quantity).trim().replace(",", ".");
  const fractions: Record<string, string> = {
    "½": "1/2",
    "¼": "1/4",
    "¾": "3/4",
    "⅓": "1/3",
    "⅔": "2/3",
  };
  raw = raw.replace(/[½¼¾⅓⅔]/g, (x) => " " + fractions[x]);
  const mixed = /^(?:(\d+)\s+)?(\d+)\/(\d+)$/.exec(raw.trim());
  const amount = mixed
    ? Number(mixed[1] ?? 0) + Number(mixed[2]) / Number(mixed[3])
    : /^\d+(?:\.\d+)?$/.test(raw)
      ? Number(raw)
      : NaN;
  const conversion = units[unit.toLowerCase().trim()];
  return conversion && Number.isFinite(amount) && amount > 0
    ? { amount: amount * conversion[1], unit: conversion[0] }
    : null;
}
export function consume(
  pantry: Batch[],
  ingredients: Ingredient[],
  scale: number,
): { effects: Effect[]; unresolved: Usage[] } {
  const effects: Effect[] = [],
    unresolved: Usage[] = [];
  for (const item of ingredients.filter((i) => !i.omitted)) {
    const needed = measure(item.quantity, item.unit);
    if (!needed) {
      unresolved.push({
        name: item.name,
        required: null,
        missing: null,
        unit: item.unit,
        reason: "unknown-quantity-or-unit",
      });
      continue;
    }
    let remaining = needed.amount * scale;
    const candidates = pantry
      .filter((b) => canonical(b.name) === canonical(item.name))
      .sort(
        (a, b) =>
          (a.date ?? "9999").localeCompare(b.date ?? "9999") ||
          a.id.localeCompare(b.id),
      );
    const precise = candidates.filter(
      (b) =>
        b.quantity !== null &&
        !b.quantityEstimated &&
        measure(b.quantity, b.unit)?.unit === needed.unit,
    );
    // Distinct brands/labels are materially different. Do not arbitrarily choose a product.
    if (
      new Set(
        precise.map((b) => JSON.stringify([b.brand, b.label, b.crossContact])),
      ).size > 1
    ) {
      unresolved.push({
        name: item.name,
        required: remaining,
        missing: remaining,
        unit: needed.unit,
        reason: "ambiguous-product",
      });
      continue;
    }
    for (const batch of precise) {
      if (remaining <= 1e-9) break;
      const factor = units[batch.unit.toLowerCase().trim()][1],
        available = (batch.quantity ?? 0) * factor;
      const used = Math.min(remaining, available);
      if (used > 0) {
        batch.quantity = Math.max(0, (available - used) / factor);
        effects.push({ batchId: batch.id, quantity: used / factor });
        remaining -= used;
      }
    }
    if (remaining > 1e-9)
      unresolved.push({
        name: item.name,
        required: needed.amount * scale,
        missing: remaining,
        unit: needed.unit,
        reason: candidates.some((b) => b.quantityEstimated) ? "estimated-quantity-review" : candidates.some((b) => b.quantity === null)
          ? "presence-only"
          : "insufficient-stock",
      });
  }
  return { effects, unresolved };
}
export function restore(kitchen: Kitchen, effects: Effect[]) {
  for (const e of effects) {
    const batch = kitchen.pantry.find((b) => b.id === e.batchId);
    if (!batch || batch.quantity === null)
      throw new Error("Consumed batch must be retained for undo.");
    batch.quantity += e.quantity;
  }
}
export function shopping(kitchen: Kitchen, from: string, to: string) {
  const virtual = structuredClone(kitchen.pantry),
    needs = new Map<
      string,
      {
        name: string;
        quantity: number | null;
        unit: string;
        meals: string[];
        firstDate: string;
        reason: string;
      }
    >();
  const readiness: Record<string, string> = {},
    allocations: Record<string, Effect[]> = {};
  const leftovers = new Map(kitchen.leftovers.map((l) => [l.id, l.remaining]));
  for (const meal of kitchen.plans
    .filter((m) => m.date >= from && m.date <= to && !m.cookedId)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))) {
    if (meal.leftoverId) {
      const available = leftovers.get(meal.leftoverId) ?? 0;
      readiness[meal.id] =
        available >= meal.servings ? "Ready to cook" : "Check quantities";
      leftovers.set(meal.leftoverId, Math.max(0, available - meal.servings));
      allocations[meal.id] = [
        {
          batchId: meal.leftoverId,
          quantity: Math.min(available, meal.servings),
        },
      ];
      continue;
    }
    let requirements: Ingredient[];
    let preparationConflict = false;
    try { requirements = remainingAfterPreparation(meal.ingredients, meal.servings / meal.referenceServings, (kitchen.preparation ?? []).filter(t => t.planId === meal.id && t.status === "completed" && !t.cookedId)); }
    catch { requirements = meal.ingredients; preparationConflict = true; }
    const result = consume(
      virtual,
      requirements,
      preparationConflict ? meal.servings / meal.referenceServings : 1,
    );
    allocations[meal.id] = result.effects;
    readiness[meal.id] = preparationConflict || result.unresolved.some(
      (u) => u.missing === null || u.reason !== "insufficient-stock",
    )
      ? "Check quantities"
      : result.unresolved.length
        ? "Missing ingredients"
        : meal.ingredients.length
          ? "Ready to cook"
          : "Check quantities";
    for (const u of result.unresolved) {
      const key = canonical(u.name) + "|" + u.unit,
        prior = needs.get(key);
      needs.set(key, {
        name: u.name,
        quantity:
          prior?.quantity === null || u.missing === null
            ? null
            : (prior?.quantity ?? 0) + u.missing,
        unit: u.unit,
        meals: [...(prior?.meals ?? []), meal.id],
        firstDate: prior?.firstDate ?? meal.date,
        reason: u.reason,
      });
    }
  }
  return {
    needs: [...needs.values()],
    readiness,
    allocations,
    prices: "unavailable",
  };
}

/** All quantities in completed preparation are actual use, never inferred from a checklist tick. */
export function remainingAfterPreparation(ingredients: Ingredient[], scale: number, tasks: Preparation[]): Ingredient[] {
  const used = new Map<string, number>();
  for (const task of tasks) for (const i of task.ingredients) {
    const m = measure(i.quantity, i.unit);
    if (!m) throw new Error("Review ambiguous preparation quantities before cooking.");
    const key = canonical(i.name) + "|" + m.unit;
    used.set(key, (used.get(key) ?? 0) + m.amount);
  }
  const result = ingredients.filter(i => !i.omitted).map(i => {
    const m = measure(i.quantity, i.unit);
    if (!m) return i;
    const key = canonical(i.name) + "|" + m.unit;
    const total = m.amount * scale, credit = Math.min(total, used.get(key) ?? 0);
    used.set(key, (used.get(key) ?? 0) - credit);
    return { ...i, quantity: String(total - credit), unit: m.unit };
  }).filter(i => i.quantity !== "0");
  if ([...used.values()].some(n => n > 1e-7)) throw new Error("Preparation use exceeds the cooking ingredients. Review the actual recipe/yield.");
  // Unknown quantities were not scaled by the measurement routine; consume leaves them unresolved.
  return result;
}

