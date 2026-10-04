import { test } from "node:test";
import assert from "node:assert/strict";
import {
  batchSchema,
  planSchema,
  profileSchema,
  consume,
  restore,
  shopping,
  emptyKitchen,
  measure,
} from "../src/lib/meal-engine";
import { checkMeal, coverageManifest } from "../src/lib/meal-health";
const ingredient = (name: string, quantity: string, unit = "g") => ({
  name,
  quantity,
  unit,
});
test("two prepared servings consume half the four-serving recipe and undo preserves unrelated additions", () => {
  const state = emptyKitchen();
  state.pantry = [
    batchSchema.parse({ id: "rice", name: "rice", quantity: 1000, unit: "g" }),
    batchSchema.parse({
      id: "chicken",
      name: "chicken",
      quantity: 1000,
      unit: "g",
    }),
  ];
  const result = consume(
    state.pantry,
    [ingredient("rice", "300"), ingredient("chicken", "600")],
    2 / 4,
  );
  assert.deepEqual(result.effects, [
    { batchId: "rice", quantity: 150 },
    { batchId: "chicken", quantity: 300 },
  ]);
  assert.equal(result.unresolved.length, 0);
  state.pantry[0].quantity! += 50;
  restore(state, result.effects);
  assert.equal(state.pantry[0].quantity, 1050);
});
test("virtual allocation of four eggs across two three-egg meals leaves deficit two without physical deduction", () => {
  const state = emptyKitchen();
  state.pantry = [
    batchSchema.parse({ id: "eggs", name: "eggs", quantity: 4, unit: "count" }),
  ];
  state.plans = ["a", "b"].map((id) =>
    planSchema.parse({
      id,
      date: "2026-10-04",
      slot: "dinner",
      title: id,
      servings: 1,
      ingredients: [ingredient("œufs", "3", "count")],
    }),
  );
  const result = shopping(state, "2026-10-04", "2026-10-05");
  assert.equal(result.needs[0].quantity, 2);
  assert.equal(state.pantry[0].quantity, 4);
  assert.equal(result.allocations.a[0].quantity, 3);
  assert.equal(result.allocations.b[0].quantity, 1);
});
test("ambiguous units, presence-only, brands and insufficient stock never invent quantities", () => {
  const pantry = [
    batchSchema.parse({ id: "a", name: "rice", quantity: 20, unit: "g" }),
    batchSchema.parse({ id: "b", name: "salt", quantity: null, unit: "g" }),
  ];
  const result = consume(
    pantry,
    [
      ingredient("rice", "30"),
      ingredient("salt", "1"),
      ingredient("oil", "1", "cup"),
    ],
    1,
  );
  assert.equal(pantry[0].quantity, 0);
  assert.deepEqual(
    result.unresolved.map((u) => u.reason),
    ["insufficient-stock", "presence-only", "unknown-quantity-or-unit"],
  );
  const brands = ["A", "B"].map((brand, n) =>
    batchSchema.parse({
      id: String(n),
      name: "milk",
      quantity: 100,
      unit: "ml",
      brand,
    }),
  );
  assert.equal(
    consume(brands, [ingredient("lait", "50", "ml")], 1).effects.length,
    0,
  );
});
test("fraction and compatible units preserve mass versus volume distinctions", () => {
  assert.deepEqual(measure("1 ½", "kg"), { amount: 1500, unit: "g" });
  assert.equal(measure("to taste", "g"), null);
  assert.equal(measure("1", "packet"), null);
  assert.notEqual(measure("1", "g")?.unit, measure("1", "ml")?.unit);
});
test("combined household restrictions match derivatives and translations without medical clearance", () => {
  const profiles = [
    profileSchema.parse({
      id: "p",
      name: "Adult",
      ageBand: "adult",
      country: "US",
      consent: true,
      allergies: ["milk"],
    }),
    profileSchema.parse({
      id: "c",
      name: "Child",
      ageBand: "child", caregiverAuthorized:true,
      country: "FR",
      consent: true,
      allergies: ["egg"],
      coeliac: true,
    }),
  ];
  assert.equal(
    checkMeal([ingredient("whey", "10")], profiles).status,
    "conflict",
  );
  assert.equal(
    checkMeal([ingredient("œufs", "2", "count")], profiles).status,
    "conflict",
  );
  assert.equal(
    checkMeal([ingredient("pesto", "20")], profiles).status,
    "unresolved",
  );
  assert.equal(checkMeal([ingredient("rice", "20")], []).nutrition, null);
  assert.equal(coverageManifest.validatedCountries.length, 0);
});
test("child weight loss is rejected; incomplete diaries are unknown", () => {
  assert.equal(
    profileSchema.safeParse({
      id: "c",
      name: "Child",
      ageBand: "child", caregiverAuthorized:true,
      country: "US",
      consent: true,
      allergies: [],
      goal: "weight-loss",
    }).success,
    false,
  );
  assert.equal(checkMeal([], []).diaryCoverage, "unknown");
});
