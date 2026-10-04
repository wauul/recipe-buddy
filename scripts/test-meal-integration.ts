import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { randomUUID } from "node:crypto";
import { writeFile, mkdir } from "node:fs/promises";
import sharp from "sharp";
const url = new URL(process.env.DATABASE_URL!);
assert.equal(url.hostname, "127.0.0.1");
assert.equal(url.port, "55433");
assert.equal(url.pathname, "/recipe_buddy_meal_test");
assert.equal(process.env.GROQ_API_KEY, "");
assert.equal(process.env.VERCEL_ENV, "preview");
const db = new PrismaClient(),
  base = "http://127.0.0.1:3003",
  results: string[] = [];
type Session = { accessToken: string; userId: string };
async function req(
  path: string,
  session?: Session,
  method = "GET",
  data?: unknown,
  status = 200,
) {
  const response = await fetch(base + "/api/native/v1/" + path, {
    method,
    headers: {
      ...(session ? { Authorization: "Bearer " + session.accessToken } : {}),
      "Content-Type": "application/json",
    },
    ...(method === "GET" ? {} : { body: JSON.stringify(data ?? {}) }),
  });
  const value = await response.json();
  assert.equal(response.status, status, `${path}: ${JSON.stringify(value)}`);
  return value;
}
async function group(name: string, action: () => Promise<void>) {
  await action();
  results.push(name);
  console.log("PASS " + name);
}
async function main() {
  const users = await Promise.all(
    ["a", "b", "c"].map(async (letter) =>
      db.user.upsert({
        where: { email: `meal-${letter}@example.test` },
        create: {
          email: `meal-${letter}@example.test`,
          username: `Meal Test ${letter.toUpperCase()}`,
          hashedPassword: await hash("MealTestOnly-2026", 12),
          roastEnabled: false,
          termsVersion: "2026-10-03",
          termsAcceptedAt: new Date(),
        },
        update: {},
      }),
    ),
  );
  await db.mealKitchen.deleteMany({
    where: { ownerId: { in: users.map((u) => u.id) } },
  });
  await db.recipe.deleteMany({
    where: { userId: { in: users.map((u) => u.id) } },
  });
  await db.friendship.deleteMany({
    where: { userAId: { in: users.map((u) => u.id) } },
  });
  await db.userBlock.deleteMany({
    where: {
      OR: [
        { blockerId: { in: users.map((u) => u.id) } },
        { blockedId: { in: users.map((u) => u.id) } },
      ],
    },
  });
  await db.rateLimit.deleteMany();
  const sessions = await Promise.all(
    users.map(async (u) => {
      const r = await fetch(base + "/api/native/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: u.email, password: "MealTestOnly-2026" }),
      });
      assert.equal(r.status, 200);
      return r.json() as Promise<Session>;
    }),
  );
  const [a, b, c] = sessions;
  const pair = [a.userId, b.userId].sort();
  await db.friendship.create({
    data: {
      userAId: pair[0],
      userBId: pair[1],
      requesterId: a.userId,
      acceptedAt: new Date(),
    },
  });
  const recipe = await db.recipe.create({
    data: {
      userId: a.userId,
      title: "Rice & chicken",
      servings: 4,
      ingredients: [
        { name: "rice", quantity: "300", unit: "g" },
        { name: "chicken", quantity: "600", unit: "g" },
      ],
      steps: ["Cook thoroughly."],
    },
  });
  const eggs = await db.recipe.create({
    data: {
      userId: a.userId,
      title: "Three eggs",
      servings: 1,
      ingredients: [{ name: "eggs", quantity: "3", unit: "count" }],
      steps: ["Cook eggs."],
    },
  });
  const op = <T>(action: string, data: T) => ({
    operationId: randomUUID(),
    action,
    data,
  });
  const change = (action: string, data: unknown, session = a) =>
    req("meals", session, "POST", op(action, data));
  let snap = await req("meals", a);
  const kitchenId = snap.kitchenId;
  const cookId = randomUUID(),
    cook = op("cook", {
      id: cookId,
      recipeId: recipe.id,
      servings: 2,
      date: "2026-10-04",
      timezone: "Europe/Paris",
    });
  await group("authentication, ownership and additive migration", async () => {
    await req("meals", undefined, "GET", undefined, 401);
    await req("meals?kitchenId=" + kitchenId, b, "GET", undefined, 404);
    assert.equal(await db.cookedLog.count({ where: { userId: a.userId } }), 0);
  });
  await change("pantry", {
    id: "rice",
    name: "rice",
    quantity: 1000,
    unit: "g",
  });
  await change("pantry", {
    id: "chicken",
    name: "chicken",
    quantity: 1000,
    unit: "g",
  });
  await change("pantry", {
    id: "eggs",
    name: "eggs",
    quantity: 4,
    unit: "count",
  });
  await group(
    "atomic scaled consumption, concurrent retry and digest protection",
    async () => {
      await Promise.all([
        req("meals", a, "POST", cook),
        req("meals", a, "POST", cook),
      ]);
      snap = await req("meals", a);
      assert.equal(
        snap.state.pantry.find((p: { id: string }) => p.id === "rice").quantity,
        850,
      );
      assert.equal(
        snap.state.pantry.find((p: { id: string }) => p.id === "chicken")
          .quantity,
        700,
      );
      assert.equal(snap.state.occasions.length, 1);
      assert.equal(snap.state.eaten.length, 0);
      await req(
        "meals",
        a,
        "POST",
        { ...cook, data: { ...cook.data, servings: 3 } },
        409,
      );
      await change("stock", { id: "rice", delta: 50, reason: "purchase" });
      await change("edit-cook", {
        id: cookId,
        recipeId: recipe.id,
        servings: 1,
        date: "2026-10-04",
        timezone: "Europe/Paris",
      });
      snap = await req("meals", a);
      assert.equal(
        snap.state.pantry.find((p: { id: string }) => p.id === "rice").quantity,
        975,
      );
      await change("undo-cook", { id: cookId });
      snap = await req("meals", a);
      assert.equal(
        snap.state.pantry.find((p: { id: string }) => p.id === "rice").quantity,
        1050,
      );
    },
  );
  await group(
    "virtual allocation, partial purchases, manual groceries and plan edits",
    async () => {
      for (const id of ["egg-plan-a", "egg-plan-b"])
        await change("plan", {
          id,
          date: "2026-10-04",
          slot: "dinner",
          recipeId: eggs.id,
          title: "Eggs",
          servings: 1,
        });
      snap = await req("meals?from=2026-10-04&to=2026-10-10", a);
      assert.equal(snap.shopping.needs[0].quantity, 2);
      await change("manual-shopping", {
        id: "manual",
        name: "Flowers",
        quantity: "1",
        checked: true,
      });
      const purchase = op("purchase", {
        id: randomUUID(),
        name: "eggs",
        quantity: 1,
        unit: "count",
        date: "2026-10-04",
      });
      await req("meals", a, "POST", purchase);
      await req("meals", a, "POST", purchase);
      snap = await req("meals?from=2026-10-04&to=2026-10-10", a);
      assert.equal(snap.shopping.needs[0].quantity, 1);
      assert.equal(snap.state.purchases.length, 1);
      await change("remove-plan", { id: "egg-plan-b" });
      snap = await req("meals", a);
      assert.equal(snap.state.manualShopping[0].checked, true);
      assert.equal(snap.state.purchases.length, 1);
    },
  );
  const profileId = randomUUID();
  await change("profile", {
    id: profileId,
    name: "Test adult",
    ageBand: "adult",
    country: "US",
    consent: true,
    allergies: ["milk"],
  });
  await group(
    "household privacy, caregiver limits and concurrency version conflicts",
    async () => {
      await change("member", { userId: b.userId, role: "planner" });
      const other = await req("meals?kitchenId=" + kitchenId, b);
      assert.equal(other.profiles.length, 0);
      assert.equal(other.diners.length, 1);
      assert.equal(other.state.occasions.length, 0);
      assert.equal(other.state.eaten.length, 0);
      await req(
        "meals",
        b,
        "POST",
        {
          ...op("profile", {
            id: profileId,
            name: "Steal",
            ageBand: "adult",
            country: "US",
            consent: true,
            allergies: [],
          }),
          kitchenId,
        },
        403,
      );
      await req(
        "meals",
        a,
        "POST",
        op("profile", {
          id: randomUUID(),
          name: "Child",
          ageBand: "child",
          caregiverAuthorized: true,
          country: "US",
          consent: true,
          allergies: [],
          goal: "weight-loss",
        }),
        400,
      );
      snap = await req("meals", a);
      const version = snap.version;
      await change("stock", { id: "rice", delta: 1, reason: "correction" });
      await req(
        "meals",
        a,
        "POST",
        {
          ...op("pantry", {
            id: "new",
            name: "salt",
            quantity: null,
            unit: "g",
          }),
          baseVersion: version,
        },
        409,
      );
    },
  );
  const second = randomUUID();
  await change("cook", {
    id: second,
    recipeId: recipe.id,
    servings: 4,
    date: "2026-10-04",
    timezone: "Europe/Paris",
  });
  await group(
    "separate repeated occasions, leftover eating and raw deduction once",
    async () => {
      const leftover = randomUUID();
      await change("leftover", {
        id: leftover,
        occasionId: second,
        title: "Rice leftovers",
        remaining: 2,
        storage: "fridge",
        date: null,
      });
      const before = await req("meals", a);
      await change("eat", {
        id: randomUUID(),
        personId: profileId,
        date: "2026-10-05",
        slot: "lunch",
        title: "Leftovers",
        amount: 1,
        leftoverId: leftover,
      });
      const after = await req("meals", a);
      assert.deepEqual(before.state.pantry, after.state.pantry);
      assert.equal(after.state.leftovers[0].remaining, 1);
      assert.equal(after.state.occasions.length, 2);
      assert.equal(after.state.eaten.length, 1);
    },
  );
  const photo =
    "data:image/png;base64," +
    (
      await sharp({
        create: { width: 80, height: 60, channels: 3, background: "#396449" },
      })
        .png()
        .toBuffer()
    ).toString("base64");
  const postId = randomUUID();
  await change("follow-up", {
    id: second,
    photo,
    rating: 4,
    comment: "Private clinical comment never in feed",
  });
  const privatePhoto = (await req("meals", a)).state.occasions.find(
    (o: { id: string }) => o.id === second,
  ).photo;
  assert.ok(privatePhoto.startsWith("/api/meals/occasions/"));
  for (const [session, status] of [
    [a, 200],
    [b, 404],
    [c, 404],
  ] as const) {
    const response = await fetch(
      base + "/api/native/v1/" + privatePhoto.slice("/api/".length),
      { headers: { Authorization: "Bearer " + session.accessToken } },
    );
    assert.equal(response.status, status);
    if (status === 200) {
      const metadata = await sharp(
        Buffer.from(await response.arrayBuffer()),
      ).metadata();
      assert.equal(metadata.format, "webp");
      assert.equal(metadata.exif, undefined);
    }
  }
  await req("meals/activity", a, "POST", {
    id: postId,
    kitchenId,
    occasionId: second,
    caption: "Dinner result",
    includePhoto: true,
    includeRating: true,
    includeRecipe: false,
  });
  await group(
    "private media processing, explicit post fields, reactions and friendship/block revocation",
    async () => {
      const feed = await req("meals/activity", b);
      assert.equal(feed.posts.length, 1);
      assert.equal(feed.posts[0].recipe, null);
      assert.ok(!JSON.stringify(feed).includes("clinical"));
      assert.ok(!JSON.stringify(feed).includes("allergies"));
      await req("meals/activity/" + postId, b, "POST", { react: true });
      await req("meals/activity/" + postId, b, "POST", { react: true });
      assert.equal(await db.mealReaction.count({ where: { postId } }), 1);
      const media = await fetch(
        base + "/api/native/v1/meals/activity/" + postId + "/media",
        { headers: { Authorization: "Bearer " + b.accessToken } },
      );
      assert.equal(media.status, 200);
      assert.equal(media.headers.get("cache-control"), "private, no-store");
      const metadata = await sharp(
        Buffer.from(await media.arrayBuffer()),
      ).metadata();
      assert.equal(metadata.format, "webp");
      assert.equal(metadata.exif, undefined);
      await fetch(base + "/api/native/v1/meals/activity/" + postId + "/media", {
        headers: { Authorization: "Bearer " + c.accessToken },
      }).then((r) => assert.equal(r.status, 404));
      await db.userBlock.create({
        data: { blockerId: b.userId, blockedId: a.userId },
      });
      assert.equal((await req("meals/activity", b)).posts.length, 0);
      await db.userBlock.deleteMany({ where: { blockerId: b.userId } });
      await db.friendship.deleteMany({
        where: { userAId: pair[0], userBId: pair[1] },
      });
      assert.equal((await req("meals/activity", b)).posts.length, 0);
      await fetch(base + "/api/native/v1/meals/activity/" + postId + "/media", {
        headers: { Authorization: "Bearer " + b.accessToken },
      }).then((r) => assert.equal(r.status, 404));
    },
  );
  await group(
    "native offline replay, profile withdrawal and membership revocation",
    async () => {
      const sync = {
        operationId: randomUUID(),
        path: "meals",
        method: "POST",
        payload: JSON.stringify(
          op("stock", { id: "rice", delta: 25, reason: "correction" }),
        ),
        occurredAt: "2026-10-04T12:00:00Z",
      };
      const before = await req("meals", a);
      await req("sync", a, "POST", sync);
      await req("sync", a, "POST", sync);
      const after = await req("meals", a);
      assert.equal(
        after.state.pantry.find((p: { id: string }) => p.id === "rice")
          .quantity,
        before.state.pantry.find((p: { id: string }) => p.id === "rice")
          .quantity + 25,
      );
      await change("delete-profile", { id: profileId });
      assert.equal((await req("meals", a)).state.eaten.length, 0);
      await change("remove-member", { userId: b.userId });
      await req("meals?kitchenId=" + kitchenId, b, "GET", undefined, 404);
    },
  );
  await group(
    "pantry-selected real saved matches, Pro entitlement and product setup gates",
    async () => {
      const matches = await req("meals/suggestions", a, "POST", {
        diners: [],
        ingredients: ["rice"],
        servings: 2,
      });
      assert.ok(matches.candidates.length > 0);
      assert.ok(
        matches.candidates.every(
          (c: { selectedCoverage: number }) => c.selectedCoverage > 0,
        ),
      );
      await req(
        "meals/discovery",
        a,
        "POST",
        { diners: [], ingredients: ["rice"] },
        402,
      );
      await req(
        "meals/discovery/import",
        a,
        "POST",
        { token: "untrusted" },
        402,
      );
      await req("meals/product", a, "POST", { barcode: "3017620422003" }, 503);
    },
  );
  await group(
    "backdated edits and undo preserve legacy activity; repeated plans do not inherit cooked markers",
    async () => {
      const id = randomUUID();
      await change("cook", {
        id,
        recipeId: eggs.id,
        servings: 1,
        date: "2026-03-29",
        timezone: "Europe/Paris",
      });
      assert.equal(
        await db.cookedLog.count({
          where: {
            userId: a.userId,
            recipeId: eggs.id,
            date: new Date("2026-03-29"),
          },
        }),
        1,
      );
      await change("edit-cook", {
        id,
        recipeId: eggs.id,
        servings: 1,
        date: "2026-10-25",
        timezone: "Europe/Paris",
      });
      assert.equal(
        await db.cookedLog.count({
          where: {
            userId: a.userId,
            recipeId: eggs.id,
            date: new Date("2026-03-29"),
          },
        }),
        0,
      );
      await change("undo-cook", { id });
      assert.equal(
        await db.cookedLog.count({
          where: {
            userId: a.userId,
            recipeId: eggs.id,
            date: new Date("2026-10-25"),
          },
        }),
        0,
      );
      await db.cookedLog.upsert({
        where: {
          userId_recipeId_date: {
            userId: a.userId,
            recipeId: eggs.id,
            date: new Date("2026-10-01"),
          },
        },
        create: {
          userId: a.userId,
          recipeId: eggs.id,
          date: new Date("2026-10-01"),
        },
        update: {},
      });
      const legacy = randomUUID();
      await change("cook", {
        id: legacy,
        recipeId: eggs.id,
        servings: 1,
        date: "2026-10-01",
        timezone: "Europe/Paris",
      });
      await change("undo-cook", { id: legacy });
      assert.equal(
        await db.cookedLog.count({
          where: {
            userId: a.userId,
            recipeId: eggs.id,
            date: new Date("2026-10-01"),
          },
        }),
        1,
      );
      const plan = randomUUID();
      await change("plan", {
        id: plan,
        title: "External meal",
        date: "2026-10-05",
        slot: "lunch",
        servings: 1,
        diners: [],
        cookedId: legacy,
      });
      assert.equal(
        (await req("meals", a)).state.plans.find(
          (p: { id: string }) => p.id === plan,
        ).cookedId,
        undefined,
      );
    },
  );
  await group("preparation dependency/move/partial use/cook/undo reconcile once",async()=>{
    const grain=await db.recipe.create({data:{userId:a.userId,title:"Prep grain",servings:4,ingredients:[{name:"Prep grain",quantity:"300",unit:"g"}],steps:["User-entered preparation."]}});
    const batchId=randomUUID(),planId=randomUUID(),taskId=randomUUID(),dependentId=randomUUID();
    await change("pantry",{id:batchId,name:"Prep grain",quantity:500,unit:"g"});
    await change("plan",{id:planId,recipeId:grain.id,title:grain.title,date:"2026-10-25",slot:"dinner",servings:2,diners:[]});
    const task={id:taskId,planId,description:"Prepare actual grain",date:"2026-10-25",time:"08:30",timezone:"Europe/Paris",assignee:a.userId};
    await change("preparation",task);await change("preparation",{...task,id:dependentId,description:"Second task",dependencies:[taskId]});
    await req("meals",a,"POST",op("complete-preparation",{id:dependentId,ingredients:[]}),409);
    await req("meals",a,"POST",op("preparation",{...task,dependencies:[dependentId]}),400);
    await change("plan",{id:planId,recipeId:grain.id,title:grain.title,date:"2026-10-26",slot:"dinner",servings:2,diners:[]});
    let snap=await req("meals",a);assert.equal(snap.state.preparation.find((t:any)=>t.id===taskId).date,"2026-10-26");
    const prepare=op("complete-preparation",{id:taskId,ingredients:[{name:"Prep grain",quantity:"100",unit:"g"}]});
    const first=await req("meals",a,"POST",prepare);assert.deepEqual(await req("meals",a,"POST",prepare),first);
    const occasion=randomUUID();await change("cook",{id:occasion,recipeId:grain.id,planId,servings:2,date:"2026-10-26",timezone:"Europe/Paris"});
    snap=await req("meals",a);assert.equal(snap.state.pantry.find((b:any)=>b.id===batchId).quantity,350);
    assert.equal(snap.state.occasions.find((o:any)=>o.id===occasion).effects[0].quantity,50);
    await req("meals",a,"POST",op("undo-preparation",{id:taskId}),409);
    await change("stock",{id:batchId,delta:20,reason:"correction"});await change("undo-cook",{id:occasion});await change("undo-preparation",{id:taskId});
    snap=await req("meals",a);assert.equal(snap.state.pantry.find((b:any)=>b.id===batchId).quantity,520);
    assert.equal(snap.state.preparation.find((t:any)=>t.id===taskId).status,"planned");
  });
  await group("check-in confirmations and snack/drink records stay private and do not deduct stock",async()=>{
    const person=randomUUID(),planId=randomUUID();await change("profile",{id:person,name:"Own check-in",ageBand:"adult",country:"FR",consent:true,allergies:[]});
    await change("plan",{id:planId,title:"Cafe lunch",date:"2026-10-04",slot:"lunch",servings:1,diners:[person]});
    const before=(await req("meals",a)).state.pantry;
    const confirmed=op("eat",{id:randomUUID(),planId,personId:person,title:"Cafe lunch",date:"2026-10-04",slot:"lunch"});
    await req("meals",a,"POST",confirmed);await req("meals",a,"POST",confirmed);
    await req("meals",a,"POST",op("eat",{...confirmed.data,id:randomUUID()}),409);
    await change("eat",{id:randomUUID(),personId:person,title:"Tea and apple snack",date:"2026-10-04",slot:"snack"});
    const after=await req("meals",a);assert.deepEqual(after.state.pantry,before);assert.equal(after.state.eaten.filter((e:any)=>e.planId===planId).length,1);
    await req("meals?kitchenId="+kitchenId,b,"GET",undefined,404);
  });
  await group("daily nutrition: private targets, explicit portions, coverage invalidation and clinical guards",async()=>{
    const person=randomUUID(),entry=randomUUID();await change("profile",{id:person,name:"Nutrition test",ageBand:"adult",country:"FR",consent:true,allergies:[]});
    await change("eat",{id:entry,personId:person,title:"Actual labelled meal",date:"2026-10-03",slot:"dinner"});
    const target={nutrient:"energyKcal",minimum:1800,maximum:2200,kind:"personal",source:"TEST ONLY personal goal",issued:"2026-10-01",reviewDate:"2026-10-10",clinicianConfirmed:false};
    await change("nutrition-target",{personId:person,targets:[target]});
    await req("meals",b,"POST",op("nutrition-target",{personId:person,targets:[target]}),404);
    await change("daily-coverage",{personId:person,date:"2026-10-03",confirmed:true});
    let day=(await req("meals",a)).dailyNutrition.find((d:any)=>d.personId===person);assert.equal(day.rows[0].status,"incomplete");
    const evidence={portion:"Entire recorded portion",source:"TEST ONLY labelled composition",confirmed:true,values:{energyKcal:2000,carbohydrateG:200,proteinG:90,fatG:80,sodiumG:null,saltG:null}};
    const operation=op("eaten-nutrition",{id:entry,evidence});const first=await req("meals",a,"POST",operation);assert.deepEqual(await req("meals",a,"POST",operation),first);
    day=(await req("meals",a)).dailyNutrition.find((d:any)=>d.personId===person);assert.equal(day.dayConfirmed,false);
    await change("daily-coverage",{personId:person,date:"2026-10-03",confirmed:true});
    day=(await req("meals",a)).dailyNutrition.find((d:any)=>d.personId===person);assert.equal(day.rows[0].status,"within-target");assert.equal(day.rows[0].value,2000);assert.equal(day.rows[4].value,null);
    await change("eat",{id:randomUUID(),personId:person,title:"Unmeasured snack",date:"2026-10-03",slot:"snack"});
    day=(await req("meals",a)).dailyNutrition.find((d:any)=>d.personId===person);assert.equal(day.dayConfirmed,false);assert.equal(day.rows[0].status,"incomplete");
    await change("profile",{id:person,name:"Nutrition test",ageBand:"adult",country:"FR",consent:true,allergies:[],diabetes:"type1"});
    await req("meals",a,"POST",op("nutrition-target",{personId:person,targets:[target]}),400);
    await change("nutrition-target",{personId:person,targets:[{...target,kind:"clinician-prescribed",clinicianConfirmed:true,source:"TEST ONLY prescription reference"}]});
    await req("meals",a,"POST",op("daily-coverage",{personId:person,date:"2099-01-01",confirmed:true}),400);
  });
  await group("Pro rescue and basket preparation deny free accounts without provider calls",async()=>{
    await req("meals/rescue",a,"POST",{from:"2026-10-04",to:"2026-10-11"},402);
    await req("meals",a,"POST",op("prepare-basket",{id:randomUUID(),country:"FR",location:"75001",fulfilment:"delivery",from:"2026-10-04",to:"2026-10-11",selected:["rice|g"]}),402);
    await req("meals/handoff",a,"POST",{operationId:randomUUID(),kitchenId,baseVersion:(await req("meals",a)).version,id:randomUUID()},402);
  });
  await group("manual order fixture: incoming is not stock, partial receipt/replay and refunds are distinct",async()=>{
    const row=await db.mealKitchen.findUniqueOrThrow({where:{id:kitchenId}});const state=row.state as any;
    const basketId=randomUUID();state.baskets=[{id:basketId,actorId:a.userId,country:"FR",location:"TEST ONLY",fulfilment:"delivery",from:"2026-10-04",to:"2026-10-11",diners:[],items:[{name:"Receipt rice",quantity:750,unit:"g",firstDate:"2026-10-05"}],status:"manually-confirmed-order",provider:"manual",providerOrderId:"TEST FIXTURE NOT A REAL ORDER",url:"",createdAt:new Date().toISOString(),receivedBatchIds:[],notes:"Explicit isolated fixture; no provider order",checkoutEvidence:"user-reconciliation"}];
    await db.mealKitchen.update({where:{id:kitchenId},data:{state,version:{increment:1}}});
    assert.equal((await req("meals",a)).state.pantry.some((b:any)=>b.name==="Receipt rice"),false);
    const item=randomUUID();const receipt=op("receive-order",{id:item,basketId,batch:{id:item,name:"Receipt rice",quantity:500,unit:"g",packageSize:500,label:"Rice",brand:"Received product"},complete:false});
    const first=await req("meals",a,"POST",receipt);assert.deepEqual(await req("meals",a,"POST",receipt),first);
    await req("meals",a,"POST",op("receive-order",receipt.data),409);
    let snap=await req("meals",a);assert.equal(snap.state.pantry.find((b:any)=>b.id===item).quantity,500);assert.equal(snap.state.baskets[0].status,"partially-received");
    await change("reconcile-order",{id:basketId,status:"cancelled",notes:"Refund for missing package; received goods physically retained"});
    snap=await req("meals",a);assert.equal(snap.state.pantry.find((b:any)=>b.id===item).quantity,500);
    await change("stock",{id:item,delta:-100,reason:"discard"});assert.equal((await req("meals",a)).state.pantry.find((b:any)=>b.id===item).quantity,400);
  });
  await mkdir("test-results/meals", { recursive: true });
  await writeFile(
    "test-results/meals/integration.json",
    JSON.stringify(
      {
        database: "isolated loopback PostgreSQL 16",
        passed: results,
        providerCalls: 0,
      },
      null,
      2,
    ),
  );
}
main()
  .finally(() => db.$disconnect())
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
