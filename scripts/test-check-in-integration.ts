import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
const url = new URL(process.env.DATABASE_URL!);
assert.equal(url.hostname, "127.0.0.1");
assert.equal(url.port, "55433");
assert.equal(url.pathname, "/recipe_buddy_meal_test");
assert.equal(process.env.VERCEL_ENV, "preview");
assert.equal(process.env.GROQ_API_KEY, "");
const db = new PrismaClient(),
  base = "http://127.0.0.1:3003";
const results: string[] = [],
  timings: { path: string; ms: number }[] = [];
async function req(
  token: string,
  path: string,
  method = "GET",
  data?: unknown,
  status = 200,
) {
  const start = performance.now();
  const r = await fetch(base + "/api/native/v1/" + path, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    ...(data ? { body: JSON.stringify(data) } : {}),
  });
  const value = await r.json();
  timings.push({ path, ms: performance.now() - start });
  assert.equal(r.status, status, JSON.stringify(value));
  return value;
}
async function main() {
  const people = await Promise.all(
    ["a", "b", "c"].map(async (l) =>
      db.user.upsert({
        where: { email: `checkin-${l}@example.test` },
        create: {
          email: `checkin-${l}@example.test`,
          username: `Check-in ${l}`,
          hashedPassword: await hash("CheckInTestOnly-2026", 12),
          termsVersion: "2026-10-03",
          termsAcceptedAt: new Date(),
          roastEnabled: false,
        },
        update: {},
      }),
    ),
  );
  await db.mealKitchen.deleteMany({
    where: { ownerId: { in: people.map((p) => p.id) } },
  });
  await db.recipe.deleteMany({
    where: { userId: { in: people.map((p) => p.id) } },
  });
  const sessions = await Promise.all(
    people.map(async (p) => {
      const r = await fetch(base + "/api/native/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: p.email,
          password: "CheckInTestOnly-2026",
        }),
      });
      assert.equal(r.status, 200);
      return r.json();
    }),
  );
  const a = sessions[0].accessToken,
    b = sessions[1].accessToken,
    c = sessions[2].accessToken,
    kitchenId = people[0].id;
  const op = (action: string, data: unknown, extra: object = {}) => ({
    operationId: randomUUID(),
    kitchenId,
    action,
    data,
    ...extra,
  });
  const change = (action: string, data: unknown, status = 200, token = a) =>
    req(token, "meals", "POST", op(action, data), status);
  const read = () => req(a, `meals?kitchenId=${kitchenId}`);
  const candidate = async (kind: string) =>
    (await read()).checkIn.questions.find((q: any) => q.kind === kind);
  await read();
  await db.mealMember.create({
    data: { kitchenId, userId: people[1].id, role: "member" },
  });
  const person = randomUUID(),
    privatePerson = randomUUID();
  await change("profile", {
    id: person,
    name: "Camille",
    ageBand: "adult",
    country: "FR",
    consent: true,
    allergies: [],
  });
  await change(
    "profile",
    {
      id: privatePerson,
      name: "Private diner",
      ageBand: "adult",
      country: "US",
      consent: true,
      allergies: ["secret-allergen"],
    },
    200,
    b,
  );
  const today = (await read()).checkIn.today;
  const previous = new Date(today + "T12:00:00Z");
  previous.setUTCDate(previous.getUTCDate() - 1);
  const yesterday = previous.toISOString().slice(0, 10);
  const plan = randomUUID();
  await change("plan", {
    id: plan,
    title: "Yesterday’s rice",
    date: yesterday,
    slot: "dinner",
    servings: 2,
    diners: [person, privatePerson],
    ingredients: [],
  });
  let q = await candidate("meal");
  assert(q);
  assert.equal(q.personId, person);
  const privateView = await req(b, `meals/check-in?kitchenId=${kitchenId}`);
  assert(
    privateView.checkIn.questions.every(
      (x: any) => x.personId === privatePerson,
    ),
  );
  assert(!JSON.stringify((await read()).checkIn).includes("secret-allergen"));
  await req(c, `meals/check-in?kitchenId=${kitchenId}`, "GET", undefined, 404);
  results.push("manager-only questions and denied household IDs");
  const eating = op("eat", {
    _checkIn: q,
    id: randomUUID(),
    personId: person,
    date: yesterday,
    slot: "dinner",
    title: q.title,
    amount: null,
    approximate: true,
    planId: plan,
  });
  const repeated = await Promise.all([
    req(a, "meals", "POST", eating),
    req(a, "meals", "POST", eating),
  ]);
  assert.deepEqual(repeated[0], repeated[1]);
  assert.equal((await read()).state.eaten.length, 1);
  await change("eat", { ...(eating.data as object), id: randomUUID() }, 409);
  assert.equal((await read()).state.dailyCoverage?.length ?? 0, 0);
  results.push(
    "simultaneous repeated taps and replay create exactly one eating record; resolved question conflict; no daily coverage",
  );
  let snap = await read();
  const saved = snap.state.eaten[0],
    correction = snap.checkIn.corrections.find((x: any) => x.kind === "eaten");
  await change("edit-eaten", {
    ...saved,
    _checkIn: correction,
    title: "Restaurant soup",
    amount: 1,
    approximate: true,
  });
  snap = await read();
  assert.equal(snap.state.eaten.length, 1);
  assert.equal(snap.state.eaten[0].title, "Restaurant soup");
  assert.equal(snap.state.eaten[0].timezone, "Europe/Paris");
  await change(
    "edit-eaten",
    { ...saved, _checkIn: correction, title: "stale" },
    409,
  );
  await change("eat", {
    id: randomUUID(),
    personId: person,
    date: yesterday,
    slot: "snack",
    title: "Tea and fruit",
    amount: null,
    approximate: true,
  });
  assert.equal((await read()).state.eaten[1].nutritionEvidence, undefined);
  results.push(
    "atomic relevant-event replacement, backdated snack/drink, timezone retained, approximate detail stays unknown",
  );
  const batch = randomUUID();
  await change("pantry", {
    id: batch,
    name: "Rice",
    unit: "g",
    quantity: 100,
    quantityEstimated: true,
  });
  q = await candidate("pantry");
  await change("stock", { id: batch, delta: 50, reason: "purchase" });
  await change(
    "stock",
    { id: batch, delta: -20, reason: "correction", _checkIn: q },
    409,
  );
  assert.equal((await read()).state.pantry[0].quantity, 150);
  q = await candidate("pantry");
  await change("context", {
    date: today,
    timeMinutes: 30,
    equipment: [],
    dayType: "work",
    appetite: "unknown",
    mealSize: "unknown",
  });
  const stockOp = op("stock", {
    id: batch,
    delta: -20,
    reason: "correction",
    quantityEstimated: true,
    _checkIn: q,
  });
  await req(a, "meals", "POST", stockOp);
  await req(a, "meals", "POST", stockOp);
  snap = await read();
  assert.equal(snap.state.pantry[0].quantity, 130);
  assert.equal(snap.state.pantry[0].quantityEstimated, true);
  assert(!snap.checkIn.questions.some((x: any) => x.sourceId === batch));
  assert.equal(snap.state.history.length, 2);
  results.push(
    "old offline stock cannot overwrite purchase; unrelated context does not invalidate answer; approximate confirmation and replay",
  );
  const unknown = randomUUID();
  await change("pantry", {
    id: unknown,
    name: "Milk",
    unit: "ml",
    quantity: null,
  });
  q = await candidate("pantry");
  await change(
    "pantry",
    {
      ...snap.state.pantry[0],
      id: unknown,
      name: "Milk",
      unit: "ml",
      quantity: -1,
      _checkIn: q,
    },
    400,
  );
  await change("pantry", {
    id: unknown,
    name: "Milk",
    unit: "ml",
    quantity: 250,
    quantityEstimated: false,
    _checkIn: q,
  });
  assert.equal(
    (await read()).state.pantry.find((x: any) => x.id === unknown).quantity,
    250,
  );
  results.push("unknown quantity correction and negative input rejection");
  const recipe = await db.recipe.create({
    data: {
      userId: kitchenId,
      title: "Check-in batch",
      vibe: "cozy",
      servings: 2,
      ingredients: [{ name: "Rice", quantity: "20", unit: "g" }],
      steps: ["Cook rice."],
    },
  });
  const occasion = randomUUID();
  await change("cook", {
    id: occasion,
    recipeId: recipe.id,
    date: today,
    timezone: "Europe/Paris",
    servings: 2,
  });
  const leftover = randomUUID();
  await change("leftover", {
    id: leftover,
    occasionId: occasion,
    title: "Rice leftovers",
    remaining: 2,
    storage: "fridge",
    date: null,
  });
  q = await candidate("leftover");
  const beforeStock = (await read()).state.pantry.find(
    (x: any) => x.id === batch,
  ).quantity;
  await change("eat", {
    id: randomUUID(),
    personId: person,
    date: today,
    slot: "lunch",
    title: "Rice leftovers",
    amount: 1,
    approximate: false,
    leftoverId: leftover,
    _checkIn: q,
  });
  snap = await read();
  assert.equal(snap.state.leftovers[0].remaining, 1);
  assert.equal(
    snap.state.pantry.find((x: any) => x.id === batch).quantity,
    beforeStock,
  );
  q = snap.checkIn.corrections.find((x: any) => x.kind === "leftover");
  await change("leftover", {
    ...snap.state.leftovers[0],
    remaining: 0,
    _checkIn: q,
  });
  assert.equal(
    (await read()).state.pantry.find((x: any) => x.id === batch).quantity,
    beforeStock,
  );
  results.push(
    "leftover eating and discard preserve raw stock and cooking history",
  );
  snap = await read();
  await change("context", {
    date: today,
    timeMinutes: 45,
    equipment: ["oven"],
    dayType: "gym",
    appetite: "unknown",
    mealSize: "usual",
    diners: [person],
    eatingOut: true,
    _checkIn: snap.checkIn.context,
  });
  await change("context", {
    date: today,
    timeMinutes: 30,
    equipment: [],
    dayType: "rest",
    appetite: "unknown",
    mealSize: "unknown",
  });
  snap = await read();
  assert.deepEqual(snap.state.contexts[0].diners, [person]);
  assert.equal(snap.state.contexts[0].eatingOut, true);
  await change(
    "context",
    {
      date: yesterday,
      timeMinutes: 30,
      equipment: [],
      dayType: "work",
      appetite: "unknown",
      mealSize: "unknown",
    },
    400,
  );
  await change("check-in-reminder", {
    enabled: true,
    time: "18:00",
    quietStart: "21:00",
    quietEnd: "08:00",
    timezone: "Europe/Paris",
  });
  await change("check-in-reminder", {
    enabled: false,
    time: "18:00",
    quietStart: "21:00",
    quietEnd: "08:00",
    timezone: "Europe/Paris",
  });
  assert.equal((await read()).checkIn.reminder.enabled, false);
  results.push(
    "context expiry, older-client field preservation and reminder opt-out",
  );
  await change("stock", { id: batch, delta: 1, reason: "correction" }, 403, b);
  await change(
    "eat",
    {
      id: randomUUID(),
      personId: privatePerson,
      date: today,
      slot: "snack",
      title: "Denied",
      amount: null,
    },
    403,
  );
  await db.mealMember.delete({
    where: { kitchenId_userId: { kitchenId, userId: people[1].id } },
  });
  await req(
    b,
    "meals",
    "POST",
    op("eat", {
      id: randomUUID(),
      personId: privatePerson,
      date: today,
      slot: "snack",
      title: "Revoked",
      amount: null,
    }),
    404,
  );
  results.push("role, caregiver-manager and revoked-membership enforcement");
  // Leave meaningful disposable fixtures for the rendered acceptance journey.
  await change("pantry", {
    id: randomUUID(),
    name: "Farine de blé semi-complète biologique",
    unit: "g",
    quantity: null,
  });
  await change("pantry", {
    id: randomUUID(),
    name: "Tomatoes",
    unit: "g",
    quantity: 450,
    quantityEstimated: true,
  });
  await change("plan", {
    id: randomUUID(),
    title: "Dinner to confirm",
    date: yesterday,
    slot: "dinner",
    servings: 1,
    diners: [person],
    ingredients: [],
  });
  await mkdir("test-results/check-in", { recursive: true });
  await writeFile(
    "test-results/check-in/integration.json",
    JSON.stringify(
      {
        passed: results,
        timings,
        providerCalls: 0,
        database: "isolated loopback recipe_buddy_meal_test",
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({ passed: results, requests: timings.length }, null, 2),
  );
}
main()
  .finally(() => db.$disconnect())
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
