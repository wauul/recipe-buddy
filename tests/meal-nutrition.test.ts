import {test} from "node:test";
import assert from "node:assert/strict";
import {batchSchema} from "../src/lib/meal-engine";
import {sourceNutrition} from "../src/lib/meal-nutrition";
const batch=batchSchema.parse({id:"rice",name:"rice",quantity:1000,unit:"g",evidence:{barcode:"1234567890123",name:"Rice",brand:"Label",label:"rice",package:"500 g",nutrition:{basis:"100 g as sold",energyKcal:360,carbohydrateG:80,proteinG:7,fatG:1,sodiumG:0,saltG:0},source:{provider:"Open Food Facts",url:"https://world.openfoodfacts.org/product/1234567890123",license:"ODbL / Database Contents License",retrievedAt:"2026-10-04T12:00:00Z",modifiedAt:null},confidence:"user-confirmation-required",crossContact:"unknown"}});
test("source composition scales weight once and retains source/basis without therapeutic targets",()=>{
 const r=sourceNutrition([{name:"rice",quantity:"0.3",unit:"kg"}],0.5,[batch]);assert.equal(r.values.energyKcal,540);assert.equal(r.values.carbohydrateG,120);assert.equal(r.complete,true);assert.equal(r.sources[0].grams,150);assert.equal(r.targets,null);assert.equal(r.dailyAdequacy,"unknown");
});
test("missing ingredient/label/density leaves totals unknown instead of zero",()=>{
 const r=sourceNutrition([{name:"rice",quantity:"100",unit:"g"},{name:"milk",quantity:"200",unit:"ml"}],1,[batch]);assert.equal(r.values.energyKcal,null);assert.equal(r.knownSubtotal.energyKcal,360);assert.deepEqual(r.missingIngredients,["milk"]);assert.equal(r.complete,false);
 const unlabeled={...batch,id:"other",evidence:null};assert.equal(sourceNutrition([{name:"rice",quantity:"100",unit:"g"}],1,[batch,unlabeled]).values.energyKcal,null);
});
