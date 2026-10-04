import test from "node:test";
import assert from "node:assert/strict";
import { parsedDiscoveryRecipe } from "../src/lib/meal-discovery-parser";
import { recipePage } from "../src/lib/recipe-page";
import { checkMeal } from "../src/lib/meal-health";
import {
  batchSchema,
  profileSchema,
  localDate,
  emptyKitchen,
  shopping,
} from "../src/lib/meal-engine";
const source = {
  "@type": "Recipe",
  name: "Rice & chicken",
  recipeYield: "4 servings",
  recipeIngredient: ["300 g rice", "600 g chicken"],
  recipeInstructions: [
    { "@type": "HowToStep", text: "Cook the rice." },
    { "@type": "HowToStep", text: "Cook the chicken thoroughly." },
  ],
};
test("structured discovery preserves source recipe, strips markup and rejects missing or ambiguous critical data", () => {
  const p = recipePage(
    `<script type="application/ld+json">${JSON.stringify(source)}</script>`,
    "https://example.test/recipe",
  );
  assert.equal(parsedDiscoveryRecipe(p.structuredRecipe)?.servings, 4);
  assert.deepEqual(parsedDiscoveryRecipe(source)?.ingredients, [
    { name: "rice", quantity: "300", unit: "g" },
    { name: "chicken", quantity: "600", unit: "g" },
  ]);
  assert.equal(
    parsedDiscoveryRecipe({ ...source, recipeYield: undefined }),
    null,
  );
  assert.equal(
    parsedDiscoveryRecipe({ ...source, recipeIngredient: ["some sauce"] }),
    null,
  );
  assert.equal(
    parsedDiscoveryRecipe({ ...source, recipeIngredient: ["2 cups flour"] }),
    null,
  );
  assert.equal(
    parsedDiscoveryRecipe({ ...source, recipeInstructions: [] }),
    null,
  );
});
test("product label conflicts participate in restrictions while child management requires attestation", () => {
  const p = profileSchema.parse({
    id: "p",
    name: "Diner",
    ageBand: "adult",
    country: "FR",
    consent: true,
    allergies: ["milk"],
  });
  const batch = batchSchema.parse({
    id: "b",
    name: "rice",
    quantity: 200,
    unit: "g",
    label: "rice, whey powder",
  });
  assert.equal(
    checkMeal([{ name: "rice", quantity: "100", unit: "g" }], [p], false, [
      batch,
    ]).status,
    "conflict",
  );
  assert.equal(
    profileSchema.safeParse({
      ...p,
      ageBand: "child",
      caregiverAuthorized: false,
    }).success,
    false,
  );
  assert.equal(
    profileSchema.safeParse({
      ...p,
      ageBand: "child",
      caregiverAuthorized: true,
    }).success,
    true,
  );
});
test("local dates survive DST without treating invalid dates as meals; leftovers allocate virtually once", () => {
  assert.equal(localDate.parse("2026-03-29"), "2026-03-29");
  assert.equal(localDate.parse("2026-10-25"), "2026-10-25");
  assert.equal(localDate.safeParse("2026-02-30").success, false);
  const k = emptyKitchen();
  k.leftovers = [
    {
      id: "left",
      occasionId: "cook",
      title: "Rice",
      remaining: 2,
      storage: "fridge",
      date: null,
    },
  ];
  k.plans = ["one", "two"].map((id) => ({
    id,
    date: "2026-10-04",
    slot: "lunch",
    title: "Rice",
    servings: 2,
    diners: [],
    locked: false,
    ingredients: [],
    referenceServings: 1,
    recipeVersion: "",
    leftoverId: "left",
  }));
  const result = shopping(k, "2026-10-04", "2026-10-04");
  assert.equal(k.leftovers[0].remaining, 2);
  assert.equal(result.readiness.one, "Ready to cook");
  assert.equal(result.readiness.two, "Check quantities");
});
