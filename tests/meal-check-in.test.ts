import test from "node:test";
import assert from "node:assert/strict";
import { emptyKitchen, batchSchema, planSchema } from "../src/lib/meal-engine";
import {
  checkInSnapshot,
  checkInVersion,
  validateCheckInSource,
} from "../src/lib/meal-check-in";
import { reminderDue } from "../src/lib/check-in-reminder";
const now = new Date("2026-10-07T10:00:00Z");
test("candidates prioritize recent managed meals; private adult diaries never become questions", () => {
  const s = emptyKitchen();
  s.plans = [
    planSchema.parse({
      id: "p",
      date: "2026-10-06",
      slot: "dinner",
      title: "Rice",
      servings: 2,
      diners: ["mine", "private"],
    }),
  ];
  s.pantry = [
    batchSchema.parse({ id: "b", name: "Rice", unit: "g", quantity: null }),
  ];
  const snap = checkInSnapshot(
    s,
    "a",
    "owner",
    [{ id: "mine", name: "Me" }],
    now,
  );
  assert.equal(snap.maxPerVisit, 5);
  assert.deepEqual(
    snap.questions.map((q) => q.kind),
    ["meal", "pantry"],
  );
  assert.equal(snap.questions[0].personId, "mine");
  assert(!JSON.stringify(snap).includes("private"));
  assert.equal(
    checkInSnapshot(s, "other", "member", [], now).questions.length,
    0,
  );
});
test("a source guard rejects stale stock even after kitchen-level rebase and preserves unrelated changes", () => {
  const s = emptyKitchen();
  s.pantry = [
    batchSchema.parse({
      id: "b",
      name: "Rice",
      unit: "g",
      quantity: 100,
      quantityEstimated: true,
    }),
  ];
  const q = checkInSnapshot(s, "a", "owner", [], now).questions[0];
  s.plans.push(
    planSchema.parse({
      id: "unrelated",
      date: "2026-10-08",
      slot: "dinner",
      title: "Elsewhere",
      servings: 1,
    }),
  );
  assert.doesNotThrow(() =>
    validateCheckInSource(s, "a", q, "stock", { id: "b" }),
  );
  s.pantry[0].quantity = 150;
  assert.throws(
    () => validateCheckInSource(s, "a", q, "stock", { id: "b" }),
    /Changed since opening/,
  );
  s.pantry[0].quantity = 100;
  s.history.push({
    id: "purchase",
    actorId: "b",
    action: "stock",
    effects: [{ batchId: "b", quantity: -50 }],
    reversed: true,
    date: now.toISOString(),
  });
  assert.throws(
    () => validateCheckInSource(s, "a", q, "stock", { id: "b" }),
    /Changed since opening/,
  );
});
test("another screen resolves a meal; skipped questions do not alter state or coverage", () => {
  const s = emptyKitchen();
  s.plans = [
    planSchema.parse({
      id: "p",
      date: "2026-10-06",
      slot: "dinner",
      title: "Rice",
      servings: 1,
      diners: ["mine"],
    }),
  ];
  const q = checkInSnapshot(s, "a", "owner", [{ id: "mine", name: "Me" }], now)
    .questions[0];
  const before = JSON.stringify(s);
  checkInSnapshot(s, "a", "owner", [{ id: "mine", name: "Me" }], now);
  assert.equal(JSON.stringify(s), before);
  s.eaten.push({
    id: "e",
    personId: "mine",
    date: "2026-10-06",
    slot: "dinner",
    title: "Outside",
    amount: null,
    approximate: true,
    planId: "p",
  });
  assert.throws(
    () =>
      validateCheckInSource(s, "a", q, "eat", {
        planId: "p",
        personId: "mine",
      }),
    /Already resolved/,
  );
  assert.equal(
    checkInSnapshot(s, "a", "owner", [{ id: "mine", name: "Me" }], now)
      .questions.length,
    0,
  );
  assert.equal(s.dailyCoverage, undefined);
});
test("confirmed approximate stock stays approximate but no longer asks the same question", () => {
  const s = emptyKitchen();
  s.pantry = [
    batchSchema.parse({
      id: "b",
      name: "Rice",
      unit: "g",
      quantity: 100,
      quantityEstimated: true,
    }),
  ];
  const q = checkInSnapshot(s, "a", "owner", [], now).questions[0];
  s.checkInConfirmations = [
    {
      actorId: "a",
      id: q.id,
      sourceVersion: q.sourceVersion,
      at: now.toISOString(),
      operationId: "op",
      action: "stock",
      recordId: "b",
      title: "Rice",
    },
  ];
  assert.equal(checkInSnapshot(s, "a", "owner", [], now).questions.length, 0);
  assert.equal(s.pantry[0].quantityEstimated, true);
  assert.equal(
    checkInSnapshot(s, "other", "owner", [], now).questions.length,
    1,
  );
  const reordered = JSON.parse(
    JSON.stringify(s, (key, value) =>
      value && typeof value === "object" && !Array.isArray(value)
        ? Object.fromEntries(Object.entries(value).reverse())
        : value,
    ),
  );
  assert.equal(
    checkInSnapshot(reordered, "a", "owner", [], now).questions.length,
    0,
  );
});
test("local dates respect midnight, travel and DST; quiet hours span midnight", () => {
  const s = emptyKitchen();
  s.timezone = "America/Los_Angeles";
  assert.equal(
    checkInSnapshot(s, "a", "owner", [], new Date("2026-10-07T00:30:00Z"))
      .today,
    "2026-10-06",
  );
  assert.equal(
    reminderDue(
      "18:00",
      "21:00",
      "08:00",
      "Europe/Paris",
      new Date("2026-10-25T20:30:00Z"),
    ),
    false,
  );
  assert.equal(
    reminderDue(
      "18:00",
      "21:00",
      "08:00",
      "Europe/Paris",
      new Date("2026-10-25T17:30:00Z"),
    ),
    true,
  );
  const ref = { kind: "context" as const, sourceId: "2026-10-07" };
  const version = checkInVersion(s, "a", ref);
  s.timezone = "Europe/Paris";
  assert.notEqual(checkInVersion(s, "a", ref), version);
});
