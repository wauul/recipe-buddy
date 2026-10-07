import { createHash } from "node:crypto";
import { CheckInError, checkInGuard, checkInSnapshot, checkInVersion, validateCheckInSource } from "./meal-check-in";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import sharp from "sharp";
import { db } from "./db";
import { HttpError } from "./http";
import { sharedRecipeWhere } from "./social-policy";
import {
  batchSchema,
  planSchema,
  profileSchema,
  ingredient,
  localDate,
  emptyKitchen,
  consume,
  restore,
  remainingAfterPreparation,
  shopping,
  type Kitchen,
  type Occasion,
  type Profile,
} from "./meal-engine";
import { checkMeal, coverageManifest } from "./meal-health";
import { friendList } from "./social";
import { actualPreparation, preparationInput, validateDependencies, movePreparation } from "./meal-preparation";
import { requirePro } from "./native-pro";
import { readMealReview } from "./meal-review-token";
import { rescueRuleVersion, undoAcceptedRescue, type RescueReview } from "./meal-rescue";
import { basketKey, incomingItems, prepareBasketInput, receiptInput, receivedBatch, orderReconciliation, commerceCapabilities, type GroceryBasket } from "./meal-commerce";
import { sourceNutrition } from "./meal-nutrition";
import { nutritionTargetSchema, validateTargetForProfile, assessDaily, intakeSignature, recordedNutritionSchema, recordedEstimate, type NutritionTarget } from "./meal-daily-nutrition";

function nutritionEntries(state:Kitchen) {
 return state.eaten.map(e=>{
  const occasion=state.occasions.find(o=>o.id===e.occasionId || o.id===state.leftovers.find(l=>l.id===e.leftoverId)?.occasionId);
  return {...e,estimate:e.nutritionEvidence?recordedEstimate(e.nutritionEvidence):occasion?.nutritionProducts&&e.amount!==null?sourceNutrition(occasion.ingredients,e.amount/occasion.referenceServings,occasion.nutritionProducts):null};
 });
}

const boundedId = z.string().min(1).max(80);
export const mealOperation = z.object({
  operationId: z.string().uuid(),
  kitchenId: boundedId.optional(),
  baseVersion: z.number().int().nonnegative().optional(),
  action: z.enum([
    "pantry",
    "stock",
    "undo-stock",
    "plan",
    "remove-plan",
    "swap-plan",
    "repeat-plan",
    "cook",
    "edit-cook",
    "undo-cook",
    "follow-up",
    "eat",
    "edit-eaten",
    "check-in-reminder",
    "remove-eaten",
    "leftover",
    "remove-leftover",
    "purchase",
    "manual-shopping",
    "remove-shopping",
    "profile",
    "delete-profile",
    "settings",
    "context",
    "member",
    "remove-member",
    "preparation", "complete-preparation", "undo-preparation", "dismiss-preparation",
    "accept-rescue", "undo-rescue",
    "prepare-basket", "begin-basket-handoff", "reconcile-order", "receive-order",
    "nutrition-target", "daily-coverage", "eaten-nutrition",
  ]),
  data: z.record(z.unknown()),
});
type Operation = z.infer<typeof mealOperation>;
const json = (value: unknown) =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
async function kitchenFor(user: string, kitchenId?: string) {
  const id = kitchenId ?? user;
  if (id === user)
    await db.mealKitchen.upsert({
      where: { id },
      create: {
        id,
        ownerId: user,
        state: json(emptyKitchen()),
        members: { create: { userId: user, role: "owner" } },
      },
      update: {},
    });
  const row = await db.mealKitchen.findFirst({
    where: { id, members: { some: { userId: user } } },
    include: { members: true },
  });
  if (!row) throw new HttpError(404, "Kitchen is unavailable.");
  return row;
}
async function profilesFor(kitchenId: string) {
  return db.mealProfile.findMany({ where: { kitchenId } });
}
export async function readCheckIn(user:string,kitchenId?:string,offset=0) {
  const row=await kitchenFor(user,kitchenId);
  return db.$transaction(async tx=>{
    const current=await tx.mealKitchen.findFirst({where:{id:row.id,members:{some:{userId:user}}},include:{members:true}});
    if(!current)throw new HttpError(403,"No longer authorized. Refresh your kitchen.");
    const profiles=await tx.mealProfile.findMany({where:{kitchenId:row.id,managerId:user},select:{id:true,data:true}});
    return {kitchenId:row.id,version:current.version,checkIn:process.env.KITCHEN_CHECK_IN_ENABLED==="false"?null:checkInSnapshot(current.state as unknown as Kitchen,user,current.members.find(m=>m.userId===user)!.role,profiles.map(p=>({id:p.id,name:(p.data as unknown as Profile).name})),new Date(),offset)};
  },{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead});
}
export async function readMeals(
  user: string,
  kitchenId?: string,
  from = "0000-00-00",
  to = "9999-99-99",
) {
  const row = await kitchenFor(user, kitchenId),
    state = row.state as unknown as Kitchen;
  const profiles = await profilesFor(row.id),
    own = profiles.filter((p) => p.managerId === user);
  const recipeVersions = await db.recipe.findMany({
    where: {
      id: { in: state.plans.flatMap((p) => (p.recipeId ? [p.recipeId] : [])) },
    },
    select: { id: true, updatedAt: true },
  });
  const checks = Object.fromEntries(
    state.plans.map((plan) => {
      const check = checkMeal(
        plan.ingredients,
        profiles
          .filter((p) => plan.diners.includes(p.id))
          .map((p) => p.data as unknown as Profile),
        plan.diners.length === 0 ||
          plan.diners.some((d) => !profiles.some((p) => p.id === d)),
        state.pantry,
      );
      if (
        plan.recipeId &&
        recipeVersions
          .find((r) => r.id === plan.recipeId)
          ?.updatedAt.toISOString() !== plan.recipeVersion
      ) {
        check.status = "unresolved";
        check.reasons.push("recipe-changed-review-snapshot");
      }
      return [plan.id, check];
    }),
  );
  // Private occasion comments/photos and food diary stay with the actor/profile manager.
  const safe = {
    ...state,
    checkInReminders:(state.checkInReminders??[]).filter(r=>r.actorId===user),
    checkInConfirmations: (state.checkInConfirmations ?? []).filter(c=>c.actorId===user),
    dailyCoverage: (state.dailyCoverage??[]).filter(c=>own.some(p=>p.id===c.personId)),
    occasions: state.occasions.filter((o) => o.actorId === user),
    eaten: state.eaten.filter((e) => own.some((p) => p.id === e.personId)),
    rescues: (state.rescues ?? []).filter(r => r.actorId === user),
    contexts: (state.contexts ?? []).filter(
      (c) =>
        c.actorId === user &&
        c.date >=
          new Intl.DateTimeFormat("en-CA", { timeZone: state.timezone }).format(
            new Date(),
          ),
    ),
  };
  return {
    actorId: user,
    kitchens: await db.mealKitchen.findMany({
      where: { members: { some: { userId: user } } },
      select: { id: true, owner: { select: { username: true } } },
      take: 20,
    }),
    friends: (await friendList(user))
      .filter((f) => f.status === "accepted")
      .map((f) => ({ id: f.friend.id, username: f.friend.username })),
    kitchenId: row.id,
    version: row.version,
    checkIn: process.env.KITCHEN_CHECK_IN_ENABLED === "false" ? null : checkInSnapshot(state,user,row.members.find(m=>m.userId===user)!.role,own.map(p=>({id:p.id,name:(p.data as unknown as Profile).name}))),
    state: safe,
    profiles: own,
    diners: profiles.map((p) => ({
      id: p.id,
      name: (p.data as unknown as Profile).name,
      version: p.version,
    })),
    members: await db.mealMember.findMany({
      where: { kitchenId: row.id },
      select: {
        userId: true,
        role: true,
        user: { select: { username: true } },
      },
    }),
    checks,
    shopping: shopping(state, from, to),
    coverage: coverageManifest,
    commerce: commerceCapabilities,
    receiptChecks:Object.fromEntries((state.baskets??[]).map(b=>[b.id,b.receivedBatchIds.map(id=>{
      const batch=state.pantry.find(p=>p.id===id);const diners=profiles.filter(p=>b.diners.includes(p.id));
      return {id,name:batch?.name??"Product unavailable",check:checkMeal(batch?[{name:batch.name,quantity:String(batch.quantity??""),unit:batch.unit}]:[],diners.map(p=>p.data as unknown as Profile),!b.diners.length||diners.length!==b.diners.length,batch?[batch]:[])};
    })])),
    dailyNutrition: own.flatMap(p=>{
      const entries=nutritionEntries(state).filter(e=>e.personId===p.id&&e.date>=from&&e.date<=to);
      const targets=((p.data as unknown as {nutritionTargets?:NutritionTarget[]}).nutritionTargets??[]);
      const dates=[...new Set([...entries.map(e=>e.date),...(safe.dailyCoverage??[]).filter(c=>c.personId===p.id&&c.date>=from&&c.date<=to).map(c=>c.date)])].sort();
      return dates.map(date=>({personId:p.id,name:(p.data as unknown as Profile).name,...assessDaily(entries.filter(e=>e.date===date),targets,safe.dailyCoverage?.find(c=>c.personId===p.id&&c.date===date),date)}));
    }),
    nutrition: nutritionEntries(state).filter(e=>own.some(p=>p.id===e.personId)&&e.date>=from&&e.date<=to),
  };
}
async function authorizedRecipe(user: string, id: string) {
  const row = await db.recipe.findFirst({
    where: {
      id,
      OR: [{ userId: user }, { shares: { some: sharedRecipeWhere(user) } }],
    },
  });
  if (!row) throw new HttpError(404, "Recipe is unavailable.");
  return row;
}
const cookingInput = z.object({
  id: z.string().uuid(),
  recipeId: boundedId,
  servings: z.number().positive().max(100),
  date: localDate,
  timezone: z.string().max(80),
  planId: boundedId.optional(),
  ingredients: z.array(ingredient).max(100).optional(),
});
export async function applyMeal(user: string, input: Operation) {
  const row = await kitchenFor(user, input.kitchenId),
    digest = createHash("sha256").update(JSON.stringify(input)).digest("hex");
  return db.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "MealKitchen" WHERE "id" = ${row.id} FOR UPDATE`;
      const current = await tx.mealKitchen.findUniqueOrThrow({
        where: { id: row.id },
        include: { members: true },
      });
      const membership = current.members.find((m) => m.userId === user);
      if (!membership) throw new HttpError(403, "Kitchen access ended.");
      const receipt = await tx.mealReceipt.findUnique({
        where: {
          kitchenId_operationId: {
            kitchenId: row.id,
            operationId: input.operationId,
          },
        },
      });
      if (receipt) {
        if (receipt.actorId !== user || receipt.digest !== digest)
          throw new HttpError(409, "Operation ID already used.");
        return receipt.response;
      }
      if (
        input.baseVersion !== undefined &&
        input.baseVersion !== current.version
      )
        throw new HttpError(
          409,
          "Kitchen changed. Reload and review your saved draft.",
        );
      const state = structuredClone(current.state) as unknown as Kitchen,
        data = input.data;
      const role = membership.role;
      if (
        role === "member" &&
        ![
          "profile",
          "delete-profile",
          "eat",
          "edit-eaten",
          "check-in-reminder",
          "remove-eaten",
          "follow-up",
          "context",
          "nutrition-target", "daily-coverage", "eaten-nutrition",
        ].includes(input.action)
      )
        throw new HttpError(403, "Planner or shopper permission required.");
      if (
        role === "shopper" &&
        ![
          "pantry",
          "stock",
          "undo-stock",
          "purchase",
          "manual-shopping",
          "remove-shopping",
          "profile",
          "delete-profile",
          "eat",
          "edit-eaten",
          "check-in-reminder",
          "remove-eaten",
          "follow-up",
          "context",
          "nutrition-target", "daily-coverage", "eaten-nutrition",
          "prepare-basket", "begin-basket-handoff", "reconcile-order", "receive-order",
        ].includes(input.action)
      )
        throw new HttpError(403, "Planner permission required.");
      let result: unknown = { ok: true };
      if(input.action==="check-in-reminder") {
        const time=z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
        const value=z.object({enabled:z.boolean(),time,quietStart:time,quietEnd:time,timezone:z.string().max(80)}).parse(data);
        try{new Intl.DateTimeFormat("en",{timeZone:value.timezone});}catch{throw new HttpError(400,"Invalid timezone.");}
        state.checkInReminders=[...(state.checkInReminders??[]).filter(r=>r.actorId!==user),{actorId:user,...value}];
      }
      const checkIn = data._checkIn === undefined ? null : checkInGuard.parse(data._checkIn);
      const priorCheckInAmount=checkIn?.kind==="pantry"?state.pantry.find(b=>b.id===checkIn.sourceId)?.quantity:checkIn?.kind==="leftover"?state.leftovers.find(b=>b.id===checkIn.sourceId)?.remaining:undefined;
      if (checkIn) {
        if(process.env.KITCHEN_CHECK_IN_ENABLED === "false") throw new HttpError(503,"Kitchen check-in is temporarily unavailable. Your answers are retained.");
        if(checkIn.personId && !(await tx.mealProfile.findFirst({where:{id:checkIn.personId,kitchenId:row.id,managerId:user}}))) throw new HttpError(403,"No longer authorized. Refresh your kitchen.");
        if(checkIn.kind==="eaten") {
          const entry=state.eaten.find(e=>e.id===checkIn.sourceId);
          if(!entry || !(await tx.mealProfile.findFirst({where:{id:entry.personId,kitchenId:row.id,managerId:user}}))) throw new HttpError(403,"No longer authorized. Refresh your kitchen.");
        }
        try{validateCheckInSource(state,user,checkIn,input.action,data);}catch(e){if(e instanceof CheckInError)throw new HttpError(e.status,e.message);throw e;}
      }
      if(input.action==="eaten-nutrition") {
        const entry=state.eaten.find(e=>e.id===boundedId.parse(data.id));
        if(!entry || !(await tx.mealProfile.findFirst({where:{id:entry.personId,kitchenId:row.id,managerId:user}})))throw new HttpError(404,"Private food record unavailable.");
        if(data.evidence===null)delete entry.nutritionEvidence;
        else entry.nutritionEvidence=recordedNutritionSchema.parse(data.evidence);
      }
      if(input.action==="nutrition-target" || input.action==="daily-coverage") {
        const profile=await tx.mealProfile.findFirst({where:{id:boundedId.parse(data.personId),kitchenId:row.id,managerId:user}});
        if(!profile)throw new HttpError(404,"Private profile unavailable.");
        if(input.action==="nutrition-target") {
          const targets=z.array(nutritionTargetSchema).max(6).parse(data.targets);
          if(new Set(targets.map(t=>t.nutrient)).size!==targets.length)throw new HttpError(400,"One target per nutrient is allowed.");
          try{targets.forEach(t=>validateTargetForProfile(profile.data as unknown as Profile,t));}catch(e){throw new HttpError(400,(e as Error).message);}
          await tx.mealProfile.update({where:{id:profile.id},data:{data:json({...profile.data as object,nutritionTargets:targets}),version:{increment:1}}});
        }else{
          const date=localDate.parse(data.date), confirmed=z.boolean().parse(data.confirmed);
          const today=new Intl.DateTimeFormat("en-CA",{timeZone:state.timezone}).format(new Date());
          if(date>today)throw new HttpError(400,"A future day's intake cannot be confirmed.");
          const entries=nutritionEntries(state).filter(e=>e.personId===profile.id&&e.date===date);
          if(confirmed&&!entries.length)throw new HttpError(400,"Record actual food before confirming the day.");
          state.dailyCoverage=(state.dailyCoverage??[]).filter(c=>!(c.personId===profile.id&&c.date===date));
          if(confirmed)state.dailyCoverage.push({personId:profile.id,date,confirmed,signature:intakeSignature(entries)});
        }
      }
      const history = (effects: { batchId: string; quantity: number }[]) =>
        state.history.push({
          id: input.operationId,
          actorId: user,
          action: input.action,
          effects,
          reversed: false,
          date: new Date().toISOString(),
        });
      state.preparation ??= [];
      state.rescues ??= [];
      state.baskets ??= [];
      if(input.action==="prepare-basket"){
        await requirePro(user);
        const value=prepareBasketInput.parse(data);
        if(!value.acknowledgeIncoming&&incomingItems(state.baskets).some(i=>value.selected.includes(basketKey(i))))throw new HttpError(409,"Selected needs overlap incoming or uncertain retailer lists. Review those orders and explicitly confirm another list is intended.");
        if(value.to<value.from||Date.parse(value.to)-Date.parse(value.from)>31*86400000)throw new HttpError(400,"Choose a shopping window of up to 31 days.");
        if(state.baskets.some(b=>b.id===value.id))throw new HttpError(409,"Basket already exists.");
        const generated=shopping(state,value.from,value.to);
        const items=generated.needs.filter(n=>value.selected.includes(basketKey(n))).map(({name,quantity,unit,firstDate})=>({name,quantity,unit,firstDate}));
        if(items.length!==new Set(value.selected).size)throw new HttpError(409,"Shopping needs changed. Review selected items.");
        if(!value.diners.length)value.diners=[...new Set(state.plans.filter(p=>generated.needs.some(n=>value.selected.includes(basketKey(n))&&n.meals.includes(p.id))).flatMap(p=>p.diners))];
        const profiles=await tx.mealProfile.findMany({where:{kitchenId:row.id,id:{in:value.diners}}});
        if(profiles.length!==value.diners.length)throw new HttpError(400,"Choose household diners.");
        const basket:GroceryBasket={...value,actorId:user,items,status:"prepared",provider:value.country==="US"?"instacart":"manual",providerOrderId:"",url:"",createdAt:new Date().toISOString(),receivedBatchIds:[],notes:"",checkoutEvidence:"none"};
        state.baskets.push(basket);result={basket};
      }
      if(input.action==="begin-basket-handoff"){
        await requirePro(user);const basket=state.baskets.find(b=>b.id===data.id);
        if(!basket||basket.provider!=="instacart")throw new HttpError(409,"No supported retailer handoff for this basket.");
        if(basket.status!=="prepared")throw new HttpError(409,"Handoff already started. Reconcile its status before creating another list.");
        const needs=shopping(state,basket.from,basket.to).needs;
        if(!basket.items.every(i=>needs.some(n=>basketKey(n)===basketKey(i)&&n.quantity===i.quantity)))throw new HttpError(409,"Requirements changed. Prepare and review a fresh basket.");
        basket.status="handoff-pending";result={basket};
      }
      if(input.action==="reconcile-order"){
        const value=orderReconciliation.parse(data);const basket=state.baskets.find(b=>b.id===value.id);
        if(!basket)throw new HttpError(404,"Basket unavailable.");
        if(value.status==="manually-confirmed-order"&&!value.providerOrderId.trim())throw new HttpError(400,"Provide the retailer order reference from your confirmed order.");
        if(value.status==="received"&&basket.receivedBatchIds.length===0)throw new HttpError(409,"Record actual receipt before completing this order.");
        if(basket.status==="received"&&value.status==="manually-confirmed-order")throw new HttpError(409,"Received order cannot return to incoming.");
        basket.status=value.status;basket.providerOrderId=value.providerOrderId||basket.providerOrderId;basket.notes=value.notes;basket.checkoutEvidence="user-reconciliation";
      }
      if(input.action==="receive-order"){
        const value=receiptInput.parse(data);const basket=state.baskets.find(b=>b.id===value.basketId);
        if(!basket)throw new HttpError(404,"Basket unavailable.");
        if(state.purchases.some(p=>p.id===value.id)||state.pantry.some(p=>p.id===value.id))throw new HttpError(409,"Receipt item already recorded.");
        let batch;try{batch=receivedBatch(value.id,value.batch)}catch(e){throw new HttpError(400,(e as Error).message)}
        state.pantry.push(batch);state.purchases.push({id:value.id,batchId:batch.id,name:batch.name,quantity:batch.quantity!,unit:batch.unit,date:new Intl.DateTimeFormat("en-CA",{timeZone:state.timezone}).format(new Date())});history([{batchId:batch.id,quantity:-batch.quantity!}]);
        basket.receivedBatchIds.push(batch.id);basket.status=value.complete?"received":"partially-received";basket.notes=value.notes;
        const profiles=await tx.mealProfile.findMany({where:{kitchenId:row.id,id:{in:basket.diners}}});
        result={batchId:batch.id,check:checkMeal([{name:batch.name,quantity:String(batch.quantity),unit:batch.unit}],profiles.map(p=>p.data as unknown as Profile),!basket.diners.length||profiles.length!==basket.diners.length,[batch])};
      }
      if (input.action === "accept-rescue") {
        await requirePro(user);
        const value=z.object({token:z.string().max(200000),selected:z.array(boundedId).min(1).max(100),overrides:z.array(z.object({id:boundedId,date:localDate,slot:z.enum(["breakfast","lunch","dinner","snack"]),servings:z.number().positive().max(100),diners:z.array(boundedId).max(20)})).max(100).default([])}).parse(data);
        const review=readMealReview<RescueReview>(value.token,"rescue");
        if(review.actorId!==user||review.kitchenId!==row.id||review.expiresAt<Date.now()||review.version!==current.version||review.ruleVersion!==rescueRuleVersion)throw new HttpError(409,"Rescue preview changed or expired. Generate a fresh proposal.");
        const changes=review.proposal.changes.filter(c=>value.selected.includes(c.after.id));
        if(changes.length!==new Set(value.selected).size)throw new HttpError(400,"Choose proposed meal changes.");
        if(new Set(value.overrides.map(o=>o.id)).size!==value.overrides.length||value.overrides.some(o=>!changes.some(c=>c.after.id===o.id)))throw new HttpError(400,"Choose overrides only for selected proposed meals.");
        const today=new Intl.DateTimeFormat("en-CA",{timeZone:state.timezone}).format(new Date());
        for(const override of value.overrides){if(override.date<today||Date.parse(override.date)-Date.parse(today)>31*86400000)throw new HttpError(400,"Choose a future date within 31 days.");const change=changes.find(c=>c.after.id===override.id)!;change.after={...change.after,...override};}
        for(const change of changes){
          const currentPlan=state.plans.find(p=>p.id===change.before.id);
          if(!currentPlan||currentPlan.cookedId||currentPlan.locked)throw new HttpError(409,"A protected meal changed. Refresh the rescue preview.");
          let products=state.pantry;
          if(change.after.leftoverId){
            const leftover=state.leftovers.find(l=>l.id===change.after.leftoverId),source=state.occasions.find(o=>o.id===leftover?.occasionId&&!o.undone&&o.actorId===user);
            const reserved=state.plans.filter(p=>p.id!==currentPlan.id&&p.leftoverId===leftover?.id&&!p.cookedId).reduce((n,p)=>n+p.servings,0);
            if(!leftover||!source||leftover.remaining-reserved<change.after.servings)throw new HttpError(409,"Leftover quantity changed. Refresh the preview.");
            products=source.nutritionProducts??[];
          }else{
            if(!change.after.recipeId)throw new HttpError(400,"Recipe unavailable.");
            const recipe=await authorizedRecipe(user,change.after.recipeId);
            if(recipe.updatedAt.toISOString()!==change.after.recipeVersion)throw new HttpError(409,"Recipe changed. Refresh the rescue preview.");
          }
          const profiles=await tx.mealProfile.findMany({where:{kitchenId:row.id,id:{in:change.after.diners}}});
          const check=checkMeal(change.after.ingredients,profiles.map(p=>p.data as unknown as Profile),!change.after.diners.length||profiles.length!==change.after.diners.length,products);
          if(check.status!=="not-assessed"&&(change.after.diners.length>0||check.status==="conflict"))throw new HttpError(409,"Restriction evidence changed. Review this proposed meal.");
          state.plans[state.plans.findIndex(p=>p.id===currentPlan.id)]=structuredClone(change.after);
          for(const task of state.preparation.filter(t=>t.planId===currentPlan.id&&t.status!=="completed"))task.reviewNeeded=true;
        }
        state.rescues.push({id:input.operationId,actorId:user,changes:changes.map(c=>({before:c.before,after:c.after})),undone:false});
        result={rescueId:input.operationId};
      }
      if(input.action==="undo-rescue"){
        try { result=undoAcceptedRescue(state,String(data.id),user); }
        catch(e){throw new HttpError(409,(e as Error).message);}
      }
      const needOccasion = (id: unknown) => {
        const occasion = state.occasions.find(
          (o) => o.id === id && o.actorId === user,
        );
        if (!occasion)
          throw new HttpError(404, "Cooking occasion unavailable.");
        return occasion;
      };
      if (input.action === "preparation") {
        const value = preparationInput.parse(data);
        try { new Intl.DateTimeFormat("en", {timeZone: value.timezone}); } catch { throw new HttpError(400, "Choose a valid timezone."); }
        if (!current.members.some(m => m.userId === value.assignee)) throw new HttpError(403, "Choose a current household member.");
        if (value.planId && !state.plans.some(p => p.id === value.planId)) throw new HttpError(404, "Planned meal unavailable.");
        const prior = state.preparation.find(t => t.id === value.id);
        if (prior?.status === "completed") throw new HttpError(409, "Undo completed preparation before editing its actual use.");
        const task = { ...value, actorId: prior?.actorId ?? user, status: "planned" as const, reviewNeeded: false, ingredients: [], effects: [], unresolved: [] };
        try { validateDependencies(state.preparation, task); } catch(e) { throw new HttpError(400, (e as Error).message); }
        state.preparation = state.preparation.filter(t => t.id !== task.id).concat(task);
      }
      if (["complete-preparation", "undo-preparation", "dismiss-preparation"].includes(input.action)) {
        const task = state.preparation.find(t => t.id === data.id);
        if (!task) throw new HttpError(404, "Preparation task unavailable.");
        if (task.cookedId) throw new HttpError(409, "Undo linked cooking before changing preparation use.");
        if (input.action === "complete-preparation") {
          if (task.status !== "planned") throw new HttpError(409, "Preparation already completed or dismissed.");
          if (task.dependencies.some(id => state.preparation!.find(t => t.id === id)?.status !== "completed")) throw new HttpError(409, "Complete preparation dependencies first.");
          task.ingredients = actualPreparation.parse(data.ingredients ?? []);
          const productsBefore=structuredClone(state.pantry);
          const consumed = consume(state.pantry, task.ingredients, 1);
          task.nutritionProducts=productsBefore.filter(b=>consumed.effects.some(e=>e.batchId===b.id));
          task.effects = consumed.effects; task.unresolved = consumed.unresolved; task.status = "completed";
          history(consumed.effects);
        } else if (input.action === "undo-preparation") {
          if (state.preparation.some(t => t.status === "completed" && t.dependencies.includes(task.id))) throw new HttpError(409, "Undo completed dependent tasks first.");
          restore(state, task.effects); task.effects = []; task.ingredients = []; task.unresolved = []; task.status = "planned";
        } else {
          if (task.status === "completed") throw new HttpError(409, "Undo preparation before dismissing it.");
          task.status = "dismissed";
        }
      }
      if (input.action === "pantry") {
        const item = batchSchema.parse(data),
          prior = state.pantry.find((b) => b.id === item.id);
        if (
          prior &&
          (state.occasions.some(
            (o) => !o.undone && o.effects.some((e) => e.batchId === item.id),
          ) || state.preparation.some(t => t.status === "completed" && t.effects.some(e => e.batchId === item.id))) &&
          (prior.name !== item.name ||
            prior.unit !== item.unit ||
            prior.quantity !== item.quantity)
        )
          throw new HttpError(
            409,
            "Use a stock correction for a consumed batch. Identity and units must be retained for undo.",
          );
        state.pantry = state.pantry
          .filter((b) => b.id !== item.id)
          .concat(item);
      }
      if (input.action === "stock") {
        const value = z
          .object({
            id: boundedId,
            delta: z.number().finite().min(-1e7).max(1e7),
            reason: z.enum(["use", "discard", "correction", "purchase"]),
            quantityEstimated: z.boolean().optional(),
          })
          .parse(data);
        const batch = state.pantry.find((b) => b.id === value.id);
        if (!batch || batch.quantity === null)
          throw new HttpError(409, "Confirm a precise batch quantity first.");
        if (batch.quantity + value.delta < 0)
          throw new HttpError(409, "Insufficient stock.");
        const previousPrecision = batch.quantityEstimated === true;
        batch.quantity += value.delta;
        if (value.quantityEstimated !== undefined) batch.quantityEstimated = value.quantityEstimated;
        history([{ batchId: batch.id, quantity: -value.delta }]);
        if (value.quantityEstimated !== undefined) {
          state.history[state.history.length - 1].precision = {
            batchId: batch.id, before: previousPrecision, after: value.quantityEstimated,
          };
        }
      }
      if (input.action === "undo-stock") {
        const entry = state.history.find(
          (h) => h.id === data.id && h.actorId === user,
        );
        if (!entry || entry.reversed)
          throw new HttpError(409, "Stock operation unavailable.");
        for (const e of entry.effects) {
          const batch = state.pantry.find((b) => b.id === e.batchId);
          if (
            !batch ||
            batch.quantity === null ||
            batch.quantity + e.quantity < 0
          )
            throw new HttpError(
              409,
              "Later usage prevents reversing this addition. Correct stock manually.",
            );
        }
        restore(state, entry.effects);
        if (entry.precision) {
          const precision = entry.precision;
          const laterMeasurement = state.history.slice(state.history.indexOf(entry) + 1)
            .some((h) => !h.reversed && h.precision?.batchId === precision.batchId);
          const batch = state.pantry.find((b) => b.id === precision.batchId);
          if (batch && !laterMeasurement && (batch.quantityEstimated === true) === precision.after)
            batch.quantityEstimated = precision.before;
        }
        entry.reversed = true;
      }
      if (input.action === "plan") {
        let plan = planSchema.parse(data);
        const priorPlan = state.plans.find((p) => p.id === plan.id);
        if (priorPlan?.cookedId) plan.cookedId = priorPlan.cookedId;
        else delete plan.cookedId;
        if (plan.recipeId) {
          const recipe = await authorizedRecipe(user, plan.recipeId);
          if(data.suggested===true && data.recipeVersion!==recipe.updatedAt.toISOString())throw new HttpError(409,"Suggested recipe changed. Refresh and review the candidate.");
          plan = {
            ...plan,
            title: recipe.title,
            ingredients: recipe.ingredients as unknown as z.infer<
              typeof ingredient
            >[],
            referenceServings: recipe.servings,
            recipeVersion: recipe.updatedAt.toISOString(),
          };
        }
        if (plan.leftoverId) {
          const leftover = state.leftovers.find(
              (l) => l.id === plan.leftoverId,
            ),
            source = state.occasions.find(
              (o) => o.id === leftover?.occasionId && !o.undone,
            );
          if (!leftover || !source)
            throw new HttpError(404, "Leftovers unavailable.");
          plan = {
            ...plan,
            title: leftover.title,
            ingredients: source.ingredients,
            referenceServings: source.referenceServings,
            recipeVersion: source.recipeVersion,
          };
          delete plan.recipeId;
        }
        const diners = await tx.mealProfile.findMany({
          where: { kitchenId: row.id, id: { in: plan.diners } },
        });
        if (diners.length !== plan.diners.length)
          throw new HttpError(400, "Choose household diners.");
        if(data.suggested===true){const check=checkMeal(plan.ingredients,diners.map(p=>p.data as unknown as Profile),!plan.diners.length,state.pantry);if(check.status!=="not-assessed"&&(plan.diners.length>0||check.status==="conflict"))throw new HttpError(409,"Suggestion evidence changed. Review current restrictions.");}
        state.plans = state.plans.filter((p) => p.id !== plan.id).concat(plan);
        if (priorPlan) movePreparation(state, plan.id, priorPlan.date, plan.date);
      }
      if (input.action === "remove-plan") {
        const prior = state.plans.find(p => p.id === data.id);
        if (prior) movePreparation(state, prior.id, prior.date);
        state.plans = state.plans.filter((p) => p.id !== data.id);
      }
      if (input.action === "swap-plan") {
        const value = z
            .object({ id: boundedId, otherId: boundedId })
            .parse(data),
          first = state.plans.find((p) => p.id === value.id),
          second = state.plans.find((p) => p.id === value.otherId);
        if (!first || !second || first.id === second.id)
          throw new HttpError(400, "Choose two planned meals.");
        if (first.cookedId || second.cookedId)
          throw new HttpError(409, "Cooked meals cannot be swapped.");
        const date = first.date,
          slot = first.slot;
        first.date = second.date;
        first.slot = second.slot;
        second.date = date;
        second.slot = slot;
        movePreparation(state, first.id, date, first.date);
        movePreparation(state, second.id, first.date, second.date);
      }
      if (input.action === "repeat-plan") {
        const value = z
            .object({
              id: boundedId,
              intervalDays: z.union([z.literal(1), z.literal(7)]),
              count: z.number().int().min(1).max(12),
            })
            .parse(data),
          source = state.plans.find((p) => p.id === value.id);
        if (!source) throw new HttpError(404, "Planned meal unavailable.");
        for (let n = 1; n <= value.count; n++) {
          const d = new Date(source.date + "T12:00:00Z");
          d.setUTCDate(d.getUTCDate() + n * value.intervalDays);
          const next = {
            ...source,
            id: input.operationId + "-" + n,
            date: d.toISOString().slice(0, 10),
          };
          delete next.cookedId;
          state.plans.push(next);
        }
      }
      if (input.action === "cook" || input.action === "edit-cook") {
        const value = cookingInput.parse(data);
        try {
          new Intl.DateTimeFormat("en", { timeZone: value.timezone });
        } catch {
          throw new HttpError(400, "Choose a valid timezone.");
        }
        const prior =
          input.action === "edit-cook" ? needOccasion(value.id) : null;
        if (!prior && state.occasions.some((o) => o.id === value.id))
          throw new HttpError(409, "Occasion already exists.");
        if (prior?.undone) throw new HttpError(409, "Cooking was undone.");
        if(prior?.prepTaskIds?.length && value.planId && value.planId!==prior.planId)throw new HttpError(409,"Retain the prepared meal link while correcting cooking.");
        if (
          prior &&
          state.leftovers.some((l) => l.occasionId === prior.id) &&
          value.servings !== prior.servings
        )
          throw new HttpError(
            409,
            "Reconcile linked leftover yield before changing servings.",
          );
        if (prior) restore(state, prior.effects);
        const recipe = prior
          ? null
          : await authorizedRecipe(user, value.recipeId);
        const snapshot =
          value.ingredients ??
          prior?.ingredients ??
          (recipe!.ingredients as unknown as z.infer<typeof ingredient>[]);
        const referenceServings = prior?.referenceServings ?? recipe!.servings;
        const prepTasks = state.preparation.filter(t => t.status === "completed" && !!t.planId && t.planId === (value.planId ?? prior?.planId) && (!t.cookedId || t.cookedId === value.id));
        let remaining = snapshot;
        try { if (prepTasks.length) remaining = remainingAfterPreparation(snapshot, value.servings / referenceServings, prepTasks); }
        catch(e) { throw new HttpError(409, (e as Error).message); }
        const productsBefore=structuredClone(state.pantry);
        const effects = consume(state.pantry, remaining, prepTasks.length ? 1 : value.servings / referenceServings);
        effects.unresolved.push(...prepTasks.flatMap(t => t.unresolved));
        for (const t of prepTasks) t.cookedId = value.id;
        const legacyRecipeId = prior?.recipeId ?? value.recipeId;
        const baseline =
          (prior?.date === value.date ? prior.legacyBaseline : undefined) ??
          state.occasions.find(
            (o) =>
              o.id !== value.id &&
              o.actorId === user &&
              o.recipeId === legacyRecipeId &&
              o.date === value.date,
          )?.legacyBaseline ??
          !!(await tx.cookedLog.findUnique({
            where: {
              userId_recipeId_date: {
                userId: user,
                recipeId: legacyRecipeId,
                date: new Date(value.date),
              },
            },
          }));
        if (
          prior &&
          prior.date !== value.date &&
          prior.legacyBaseline === false &&
          !state.occasions.some(
            (o) =>
              o.id !== prior.id &&
              !o.undone &&
              o.actorId === user &&
              o.recipeId === prior.recipeId &&
              o.date === prior.date,
          )
        )
          await tx.cookedLog.deleteMany({
            where: {
              userId: user,
              recipeId: prior.recipeId,
              date: new Date(prior.date),
            },
          });
        const occasion: Occasion = {
          id: value.id,
          actorId: user,
          recipeId: prior?.recipeId ?? recipe!.id,
          title: prior?.title ?? recipe!.title,
          date: value.date,
          timezone: value.timezone,
          servings: value.servings,
          referenceServings,
          ingredients: snapshot,
          recipeVersion:
            prior?.recipeVersion ?? recipe!.updatedAt.toISOString(),
          ...effects,
          undone: false,
          rating: prior?.rating ?? null,
          comment: prior?.comment ?? "",
          photo: prior?.photo ?? "",
          planId: value.planId ?? prior?.planId,
          legacyBaseline: baseline,
          prepTaskIds: prepTasks.map(t => t.id),
          nutritionProducts: prior?.nutritionProducts ?? [...productsBefore.filter(b=>effects.effects.some(e=>e.batchId===b.id)),...prepTasks.flatMap(t=>t.nutritionProducts??[])],
        };
        state.occasions = state.occasions
          .filter((o) => o.id !== value.id)
          .concat(occasion);
        const plan = state.plans.find((p) => p.id === occasion.planId);
        if (plan) plan.cookedId = occasion.id;
        if (
          recipe ||
          (await tx.recipe.findUnique({
            where: { id: legacyRecipeId },
            select: { id: true },
          }))
        ) {
          const date = new Date(value.date);
          await tx.cookedLog.upsert({
            where: {
              userId_recipeId_date: {
                userId: user,
                recipeId: legacyRecipeId,
                date,
              },
            },
            create: { userId: user, recipeId: legacyRecipeId, date },
            update: {},
          });
        }
        history(effects.effects);
        result = { occasionId: occasion.id, unresolved: occasion.unresolved };
      }
      if (input.action === "undo-cook") {
        const occasion = needOccasion(data.id);
        if (occasion.undone)
          throw new HttpError(409, "Cooking already undone.");
        if (state.leftovers.some((l) => l.occasionId === occasion.id))
          throw new HttpError(
            409,
            "Remove remaining leftovers and linked eating records before undo.",
          );
        restore(state, occasion.effects);
        occasion.undone = true;
        for (const task of state.preparation) if (task.cookedId === occasion.id) delete task.cookedId;
        if (
          occasion.legacyBaseline === false &&
          !state.occasions.some(
            (o) =>
              !o.undone &&
              o.actorId === user &&
              o.recipeId === occasion.recipeId &&
              o.date === occasion.date,
          )
        )
          await tx.cookedLog.deleteMany({
            where: {
              userId: user,
              recipeId: occasion.recipeId,
              date: new Date(occasion.date),
            },
          });
        state.plans.forEach((p) => {
          if (p.cookedId === occasion.id) delete p.cookedId;
        });
        await tx.mealPost.deleteMany({
          where: { kitchenId: row.id, occasionId: occasion.id, authorId: user },
        });
      }
      if (input.action === "follow-up") {
        const value = z
            .object({
              id: boundedId,
              rating: z.number().int().min(1).max(5).nullable().optional(),
              comment: z.string().max(2000).optional(),
              photo: z.string().max(300000).optional(),
            })
            .parse(data),
          occasion = needOccasion(value.id);
        if (value.rating !== undefined) occasion.rating = value.rating;
        if (value.comment !== undefined) occasion.comment = value.comment;
        if (value.photo !== undefined) {
          if (!value.photo) {
            occasion.photo = "";
            await tx.mealMedia.deleteMany({
              where: {
                kitchenId: row.id,
                occasionId: occasion.id,
                actorId: user,
              },
            });
          } else if (value.photo !== occasion.photo) {
            if (
              !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(
                value.photo,
              )
            )
              throw new HttpError(400, "Choose a JPEG, PNG or WebP photo.");
            const bytes = Buffer.from(value.photo.split(",")[1], "base64");
            const cleaned = await sharp(bytes, { limitInputPixels: 20_000_000 })
              .rotate()
              .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
              .webp({ quality: 78 })
              .toBuffer();
            if (cleaned.length > 200000)
              throw new HttpError(413, "Choose a smaller photo.");
            await tx.mealMedia.upsert({
              where: {
                kitchenId_occasionId: {
                  kitchenId: row.id,
                  occasionId: occasion.id,
                },
              },
              create: {
                kitchenId: row.id,
                occasionId: occasion.id,
                actorId: user,
                photo: cleaned,
              },
              update: { photo: cleaned },
            });
            occasion.photo = `/api/meals/occasions/${occasion.id}/media?kitchenId=${encodeURIComponent(row.id)}`;
          }
        }
      }
      if (input.action === "eat" || input.action === "edit-eaten") {
        const value = z
          .object({
            id: z.string().uuid(),
            personId: boundedId,
            date: localDate,
            slot: z.enum(["breakfast", "lunch", "dinner", "snack"]),
            title: z.string().min(1).max(160),
            amount: z.number().positive().max(100).nullable().default(null),
            occasionId: boundedId.optional(),
            leftoverId: boundedId.optional(),
            planId: boundedId.optional(),
            recipeId: boundedId.optional(),
            approximate: z.boolean().default(true),
            timezone: z.string().max(80).optional(),
          })
          .parse(data);
        value.timezone ??= state.timezone;
        try{new Intl.DateTimeFormat("en",{timeZone:value.timezone});}catch{throw new HttpError(400,"Invalid timezone.");}
        if (value.recipeId) {
          const recipe = await authorizedRecipe(user, value.recipeId);
          value.title = recipe.title;
        }
        if (
          !(await tx.mealProfile.findFirst({
            where: { id: value.personId, kitchenId: row.id, managerId: user },
          }))
        )
          throw new HttpError(403, "Profile manager permission required.");
        const previous = state.eaten.find(e=>e.id===value.id);
        if (input.action === "edit-eaten") {
          if(!previous || previous.personId!==value.personId) throw new HttpError(403,"Eating record unavailable.");
          if(!checkIn && input.baseVersion===undefined) throw new HttpError(409,"Reload before correcting this eating record.");
          const oldLeftover=state.leftovers.find(l=>l.id===previous.leftoverId);
          if(oldLeftover && previous.amount) oldLeftover.remaining+=previous.amount;
          state.eaten=state.eaten.filter(e=>e.id!==value.id);
        } else if (previous)
          throw new HttpError(409, "Eating record already exists.");
        if (value.planId) {
          if (!state.plans.some(p => p.id === value.planId)) throw new HttpError(404, "Planned meal unavailable.");
          if (state.eaten.some(e => e.planId === value.planId && e.personId === value.personId)) throw new HttpError(409, "This person's planned meal was already confirmed. Edit or remove the existing eating record first.");
        }
        if (value.occasionId) needOccasion(value.occasionId);
        if (value.leftoverId) {
          const batch = state.leftovers.find((l) => l.id === value.leftoverId);
          if (!batch || value.amount === null || batch.remaining < value.amount)
            throw new HttpError(409, "Confirm an available leftover amount.");
          batch.remaining -= value.amount;
        }
        state.eaten.push(value);
      }
      if (input.action === "remove-eaten") {
        const entry = state.eaten.find((e) => e.id === data.id);
        if (
          !entry ||
          !(await tx.mealProfile.findFirst({
            where: { id: entry.personId, managerId: user, kitchenId: row.id },
          }))
        )
          throw new HttpError(403, "Eating record unavailable.");
        const leftover = state.leftovers.find((l) => l.id === entry.leftoverId);
        if (leftover && entry.amount) leftover.remaining += entry.amount;
        state.eaten = state.eaten.filter((e) => e.id !== entry.id);
      }
      if (input.action === "leftover") {
        const value = z
          .object({
            id: z.string().uuid(),
            occasionId: boundedId,
            title: z.string().max(160),
            remaining: z.number().nonnegative().max(100),
            storage: z.enum(["fridge", "freezer"]),
            date: localDate.nullable(),
          })
          .parse(data);
        const occasion = needOccasion(value.occasionId);
        if (
          value.remaining > occasion.servings ||
          state.leftovers.some(
            (l) => l.occasionId === occasion.id && l.id !== value.id,
          )
        )
          throw new HttpError(400, "Confirm yield within servings prepared.");
        state.leftovers = state.leftovers
          .filter((l) => l.id !== value.id)
          .concat(value);
      }
      if (input.action === "remove-leftover") {
        const batch = state.leftovers.find((l) => l.id === data.id);
        if (!batch) throw new HttpError(404, "Leftover batch unavailable.");
        needOccasion(batch.occasionId);
        if (
          state.eaten.some((e) => e.leftoverId === batch.id) ||
          state.plans.some((p) => p.leftoverId === batch.id)
        )
          throw new HttpError(
            409,
            "Remove linked plans and eating records before removing leftovers.",
          );
        state.leftovers = state.leftovers.filter((l) => l.id !== batch.id);
      }
      if (input.action === "purchase") {
        const value = z
          .object({
            id: z.string().uuid(),
            name: z.string().min(1).max(120),
            quantity: z.number().positive().max(1e7),
            unit: z.string().max(40),
            date: localDate,
            brand: z.string().max(120).default(""),
            label: z.string().max(2000).default(""),
          })
          .parse(data);
        if (state.purchases.some((p) => p.id === value.id))
          throw new HttpError(409, "Purchase already recorded.");
        const batch = batchSchema.parse({ ...value, id: value.id });
        state.pantry.push(batch);
        state.purchases.push({ ...value, batchId: batch.id });
        history([{ batchId: batch.id, quantity: -batch.quantity! }]);
      }
      if (input.action === "manual-shopping") {
        const value = z
          .object({
            id: boundedId,
            name: z.string().min(1).max(120),
            quantity: z.string().max(80),
            checked: z.boolean(),
          })
          .parse(data);
        state.manualShopping = state.manualShopping
          .filter((i) => i.id !== value.id)
          .concat(value);
      }
      if (input.action === "remove-shopping")
        state.manualShopping = state.manualShopping.filter(
          (i) => i.id !== data.id,
        );
      if (input.action === "profile") {
        const value = profileSchema.parse(data),
          existing = await tx.mealProfile.findUnique({
            where: { id: value.id },
          });
        if (
          existing &&
          (existing.managerId !== user || existing.kitchenId !== row.id)
        )
          throw new HttpError(403, "Private profile permission required.");
        await tx.mealProfile.upsert({
          where: { id: value.id },
          create: {
            id: value.id,
            kitchenId: row.id,
            managerId: user,
            data: json(value),
          },
          update: { data: json({...value,nutritionTargets:((existing?.data as unknown as {nutritionTargets?:NutritionTarget[]})?.nutritionTargets??[]).filter(t=>{try{validateTargetForProfile(value,t);return true;}catch{return false;}})}), version: { increment: 1 } },
        });
      }
      if (input.action === "delete-profile") {
        const profile = await tx.mealProfile.findFirst({
          where: {
            id: boundedId.parse(data.id),
            kitchenId: row.id,
            managerId: user,
          },
        });
        if (!profile) throw new HttpError(404, "Profile unavailable.");
        await tx.mealProfile.delete({ where: { id: profile.id } });
        const deletedEating=new Set(state.eaten.filter(e=>e.personId===profile.id).map(e=>e.id));
        state.checkInConfirmations=(state.checkInConfirmations??[]).filter(c=>!c.id.endsWith(`:${profile.id}`)&&!deletedEating.has(c.recordId));
        state.eaten = state.eaten.filter((e) => e.personId !== profile.id);
        state.dailyCoverage=(state.dailyCoverage??[]).filter(c=>c.personId!==profile.id);
        state.plans.forEach(
          (p) => (p.diners = p.diners.filter((d) => d !== profile.id)),
        );
      }
      if (input.action === "settings") {
        const value = z
          .object({
            timezone: z.string().max(80),
            units: z.enum(["metric", "us"]),
          })
          .parse(data);
        try {
          new Intl.DateTimeFormat("en", { timeZone: value.timezone });
        } catch {
          throw new HttpError(400, "Invalid timezone.");
        }
        state.timezone = value.timezone;
        state.units = value.units;
      }
      if (input.action === "context") {
        const value = z
          .object({
            date: localDate,
            timeMinutes: z.number().int().min(5).max(1440).nullable(),
            equipment: z.array(z.string().max(40)).max(12),
            dayType: z.enum(["work", "rest", "gym", "flexible"]),
            appetite: z.enum(["unknown", "small", "usual", "large"]),
            mealSize: z.enum(["unknown", "light", "usual", "substantial"]),
            diners: z.array(boundedId).max(20).optional(),
            eatingOut: z.boolean().optional(),
          })
          .parse(data);
        const today = new Intl.DateTimeFormat("en-CA", {
          timeZone: state.timezone,
        }).format(new Date());
        if (value.date < today)
          throw new HttpError(
            400,
            "Daily context has expired. Choose today or a future day.",
          );
        if(value.diners && (await tx.mealProfile.count({where:{kitchenId:row.id,id:{in:value.diners}}}))!==new Set(value.diners).size) throw new HttpError(400,"Choose current household diners.");
        const priorContext = state.contexts?.find(c=>c.actorId===user&&c.date===value.date);
        state.contexts = (state.contexts ?? [])
          .filter(
            (c) =>
              c.date >= today && !(c.actorId === user && c.date === value.date),
          )
          .concat({ ...priorContext, actorId: user, ...value, timezone:state.timezone });
      }
      if (input.action === "member" || input.action === "remove-member") {
        if (role !== "owner")
          throw new HttpError(403, "Kitchen owner permission required.");
        const value = z
          .object({
            userId: boundedId,
            role: z.enum(["planner", "shopper", "member"]).optional(),
          })
          .parse(data);
        if (value.userId === current.ownerId)
          throw new HttpError(400, "Owner membership cannot change.");
        if (input.action === "member") {
          if (
            await tx.userBlock.findFirst({
              where: {
                OR: [
                  { blockerId: user, blockedId: value.userId },
                  { blockerId: value.userId, blockedId: user },
                ],
              },
            })
          )
            throw new HttpError(403, "Choose an accepted unblocked friend.");
          const pair = [user, value.userId].sort();
          if (
            !(await tx.friendship.findFirst({
              where: {
                userAId: pair[0],
                userBId: pair[1],
                acceptedAt: { not: null },
              },
            }))
          )
            throw new HttpError(403, "Choose an accepted friend.");
          await tx.mealMember.upsert({
            where: {
              kitchenId_userId: { kitchenId: row.id, userId: value.userId },
            },
            create: {
              kitchenId: row.id,
              userId: value.userId,
              role: value.role ?? "member",
            },
            update: { role: value.role ?? "member" },
          });
        } else {
          const profiles = await tx.mealProfile.findMany({
            where: { kitchenId: row.id, managerId: value.userId },
          });
          const ids = profiles.map((p) => p.id);
          state.checkInConfirmations=(state.checkInConfirmations??[]).filter(c=>c.actorId!==value.userId);
          state.checkInReminders=(state.checkInReminders??[]).filter(c=>c.actorId!==value.userId);
          state.eaten = state.eaten.filter((e) => !ids.includes(e.personId));
          state.dailyCoverage=(state.dailyCoverage??[]).filter(c=>!ids.includes(c.personId));
          state.plans.forEach(
            (p) => (p.diners = p.diners.filter((d) => !ids.includes(d))),
          );
          await tx.mealProfile.deleteMany({
            where: { kitchenId: row.id, managerId: value.userId },
          });
          await tx.mealMember.deleteMany({
            where: { kitchenId: row.id, userId: value.userId },
          });
        }
      }
      if(checkIn) {
        const id=`${checkIn.kind}:${checkIn.sourceId}:${checkIn.personId??""}`;
        const title=String(data.title??state.pantry.find(b=>b.id===data.id)?.name??checkIn.sourceId).slice(0,160);
        state.checkInConfirmations=[...(state.checkInConfirmations??[]).filter(c=>!(c.actorId===user&&c.id===id)),{actorId:user,id,sourceVersion:checkInVersion(state,user,checkIn),at:new Date().toISOString(),operationId:input.operationId,action:input.action,recordId:String(data.id??data.date),title,...(checkIn.kind==="pantry"?{before:priorCheckInAmount,after:state.pantry.find(b=>b.id===checkIn.sourceId)?.quantity,unit:state.pantry.find(b=>b.id===checkIn.sourceId)?.unit}:checkIn.kind==="leftover"?{before:priorCheckInAmount,after:state.leftovers.find(b=>b.id===checkIn.sourceId)?.remaining,unit:"servings"}:{})}].slice(-500);
      }
      if (
        state.pantry.length > 2000 ||
        state.plans.length > 2000 ||
        state.occasions.length > 2000 ||
        state.eaten.length > 4000 ||
        JSON.stringify(state).length > 8_000_000
      )
        throw new HttpError(
          413,
          "Kitchen storage limit reached. Export your records and contact support before adding more.",
        );
      await tx.mealKitchen.update({
        where: { id: row.id },
        data: { state: json(state), version: { increment: 1 } },
      });
      const response = json({ version: current.version + 1, result });
      await tx.mealReceipt.create({
        data: {
          kitchenId: row.id,
          operationId: input.operationId,
          actorId: user,
          digest,
          response,
        },
      });
      return response;
    },
    { timeout: 15000, maxWait: 15000 },
  );
}
