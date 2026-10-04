import {test} from "node:test";
import assert from "node:assert/strict";
import {batchSchema,consume,emptyKitchen,planSchema,remainingAfterPreparation,restore,shopping,type Preparation} from "../src/lib/meal-engine";
import {movePreparation,validateDependencies} from "../src/lib/meal-preparation";
import {packagesRequired} from "../src/lib/meal-commerce";
import {rescueProposals,undoAcceptedRescue,editedRescueProposal} from "../src/lib/meal-rescue";
const task=(id:string):Preparation=>({id,actorId:"a",description:"Prepare rice",date:"2026-10-25",time:"08:30",timezone:"Europe/Paris",activeMinutes:null,passiveMinutes:null,dependencies:[],assignee:"a",reminder:false,status:"planned",override:false,reviewNeeded:false,ingredients:[],effects:[],unresolved:[]});
test("partial preparation consumes once, final cooking credits actual use, undo preserves unrelated stock",()=>{
 const s=emptyKitchen();s.pantry=[batchSchema.parse({id:"rice",name:"rice",quantity:1000,unit:"g"})];const t=task("t");t.planId="p";t.status="completed";t.ingredients=[{name:"riz",quantity:"0.1",unit:"kg"}];Object.assign(t,consume(s.pantry,t.ingredients,1));s.preparation=[t];
 const ingredients=[{name:"rice",quantity:"300",unit:"g"}];const remaining=remainingAfterPreparation(ingredients,0.5,[t]);assert.deepEqual(remaining,[{name:"rice",quantity:"50",unit:"g"}]);
 const final=consume(s.pantry,remaining,1);assert.equal(s.pantry[0].quantity,850);s.pantry[0].quantity!+=50;restore(s,final.effects);assert.equal(s.pantry[0].quantity,950);restore(s,t.effects);assert.equal(s.pantry[0].quantity,1050);
});
test("preparation quantity beyond actual cooking blocks reconciliation",()=>{
 const t=task("t");t.ingredients=[{name:"rice",quantity:"200",unit:"g"}];assert.throws(()=>remainingAfterPreparation([{name:"rice",quantity:"100",unit:"g"}],1,[t]),/exceeds/);
});
test("virtual allocations credit completed prep and leave physical stock untouched",()=>{
 const s=emptyKitchen();s.pantry=[batchSchema.parse({id:"rice",name:"rice",quantity:50,unit:"g"})];s.plans=[planSchema.parse({id:"p",title:"Rice",date:"2026-10-25",slot:"lunch",servings:1,referenceServings:1,ingredients:[{name:"rice",quantity:"150",unit:"g"}]})];const t=task("t");t.planId="p";t.status="completed";t.ingredients=[{name:"rice",quantity:"100",unit:"g"}];s.preparation=[t];assert.equal(shopping(s,"2026-10-25","2026-10-25").needs.length,0);assert.equal(s.pantry[0].quantity,50);
 t.ingredients[0].quantity="200";assert.equal(shopping(s,"2026-10-25","2026-10-25").readiness.p,"Check quantities");
});
test("task moves preserve completed/override dates and removal flags review",()=>{
 const s=emptyKitchen();s.preparation=[task("a"),{...task("b"),override:true},{...task("c"),status:"completed"}];s.preparation.forEach(t=>t.planId="p");movePreparation(s,"p","2026-10-25","2026-10-26");assert.equal(s.preparation[0].date,"2026-10-26");assert.equal(s.preparation[1].date,"2026-10-25");assert.equal(s.preparation[1].reviewNeeded,true);assert.equal(s.preparation[2].date,"2026-10-25");movePreparation(s,"p","2026-10-26");assert.equal(s.preparation[0].planId,undefined);assert.equal(s.preparation[2].planId,"p");
});
test("task dependencies reject missing tasks and cycles",()=>{
 const a=task("a"),b=task("b");a.dependencies=["b"];b.dependencies=["a"];assert.throws(()=>validateDependencies([a],b),/cycle/);assert.throws(()=>validateDependencies([],{...a,dependencies:["missing"]}),/unavailable/);
});
test("known product packages round upward without invented package size",()=>{assert.deepEqual(packagesRequired(750,500),{count:2,total:1000,surplus:250});assert.throws(()=>packagesRequired(750,0))});
test("rescue protects locked and actually prepared meals; previews have no physical effects",()=>{
 const s=emptyKitchen();s.pantry=[batchSchema.parse({id:"rice",name:"rice",quantity:1000,unit:"g"})];s.plans=["open","locked","prepared"].map(id=>planSchema.parse({id,title:"Original",date:"2026-10-25",slot:"lunch",servings:1,locked:id==="locked"}));const t=task("t");t.planId="prepared";t.status="completed";s.preparation=[t];s.manualShopping=[{id:"manual",name:"Soap",quantity:"1",checked:true}];const before=structuredClone(s);
 const recipes=[{id:"r",title:"Rice",servings:1,ingredients:[{name:"rice",quantity:"100",unit:"g"}],steps:["Cook rice"],sourceProvenance:{totalTimeMinutes:10},updatedAt:"2026-10-04T12:00:00.000Z"}];const options=rescueProposals(s,recipes,[],"2026-10-25","2026-10-30");assert.equal(options.length,1);assert.deepEqual(options[0].changes.map(c=>c.before.id),["open"]);assert.deepEqual(s,before);assert.deepEqual(options[0].retainedLocked,["locked"]);
});
test("selective rescue undo preserves unrelated stock/purchases and later completed meals",()=>{
 const s=emptyKitchen();const original=(id:string)=>planSchema.parse({id,title:"Original",date:"2026-10-25",slot:"lunch",servings:1});
 const beforeA=original("a"),beforeB=original("b");const afterA={...beforeA,title:"New A",recipeId:"ra"},afterB={...beforeB,title:"New B",recipeId:"rb"};s.plans=[structuredClone(afterA),{...afterB,cookedId:"later"}];s.pantry=[batchSchema.parse({id:"rice",name:"rice",quantity:525,unit:"g"})];s.purchases=[{id:"purchase",name:"rice",quantity:25,unit:"g",date:"2026-10-26",batchId:"rice"}];s.rescues=[{id:"rescue",actorId:"owner",undone:false,changes:[{before:beforeA,after:afterA},{before:beforeB,after:afterB}]}];
 assert.deepEqual(undoAcceptedRescue(s,"rescue","owner"),{conflicts:["b"],remaining:1});assert.deepEqual(s.plans[0],beforeA);assert.equal(s.plans[0].recipeId,undefined);assert.equal(s.plans[1].cookedId,"later");assert.equal(s.pantry[0].quantity,525);assert.equal(s.purchases.length,1);assert.throws(()=>undoAcceptedRescue(s,"rescue","owner"),/Subsequent/);
});
test("estimated stock is visible but never deducted as a precise quantity",()=>{
 const pantry=[batchSchema.parse({id:"estimate",name:"rice",quantity:500,unit:"g",quantityEstimated:true})];const usage=consume(pantry,[{name:"rice",quantity:"100",unit:"g"}],1);assert.equal(usage.effects.length,0);assert.equal(usage.unresolved[0].reason,"estimated-quantity-review");assert.equal(pantry[0].quantity,500);
});
test("rescue uses available cooked leftovers once and reviews edited portions",()=>{
 const s=emptyKitchen();s.plans=["a","b"].map(id=>planSchema.parse({id,title:"External",date:"2026-10-25",slot:"dinner",servings:2}));
 s.occasions=[{id:"cook",actorId:"owner",recipeId:"r",title:"Cooked rice",date:"2026-10-24",timezone:"Europe/Paris",servings:4,referenceServings:4,ingredients:[{name:"rice",quantity:"300",unit:"g"}],recipeVersion:"v",effects:[],unresolved:[],undone:false,rating:null,comment:"",photo:""}];s.leftovers=[{id:"batch",occasionId:"cook",title:"Cooked rice",remaining:2,storage:"fridge",date:"2026-10-26"}];
 const before=structuredClone(s),proposals=rescueProposals(s,[],[],"2026-10-25","2026-10-30");assert.equal(proposals.length,1);assert.equal(proposals[0].changes.length,1);assert.equal(proposals[0].changes[0].after.leftoverId,"batch");assert.equal(proposals[0].changes[0].after.recipeId,undefined);assert.deepEqual(s,before);assert.equal(proposals[0].shopping.needs.length,0);
 const override={id:"a",date:"2026-10-26",slot:"lunch" as const,servings:1,diners:[]};const reviewed=editedRescueProposal(s,proposals[0],["a"],[override],[],[],"2026-10-25","2026-10-30");assert.equal(reviewed.changes[0].after.servings,1);assert.equal(reviewed.changes[0].after.date,"2026-10-26");assert.deepEqual(s,before);
 assert.throws(()=>editedRescueProposal(s,proposals[0],["a"],[{...override,servings:3}],[],[],"2026-10-25","2026-10-30"),/Leftover/);
 assert.throws(()=>editedRescueProposal(s,proposals[0],["a"],[{...override,date:"2026-11-01"}],[],[],"2026-10-25","2026-10-30"),/window/);
});
