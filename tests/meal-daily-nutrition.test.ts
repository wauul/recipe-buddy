import {test} from "node:test";
import assert from "node:assert/strict";
import {assessDaily,intakeSignature,nutritionTargetSchema,validateTargetForProfile,type DailyEntry} from "../src/lib/meal-daily-nutrition";
import {profileSchema} from "../src/lib/meal-engine";
import {sourceNutrition} from "../src/lib/meal-nutrition";
const target=nutritionTargetSchema.parse({nutrient:"energyKcal",minimum:1800,maximum:2200,kind:"personal",source:"Personal goal",issued:"2026-10-01",reviewDate:"2026-10-10",clinicianConfirmed:false});
const estimate={...sourceNutrition([],1,[]),values:{energyKcal:2000,carbohydrateG:200,proteinG:90,fatG:80,sodiumG:null,saltG:null},knownSubtotal:{energyKcal:2000,carbohydrateG:200,proteinG:90,fatG:80,sodiumG:0,saltG:0}};
const entries:DailyEntry[]=[{id:"food",personId:"adult",date:"2026-10-04",amount:1,approximate:false,estimate}];
test("daily comparison requires current confirmation and nutrient coverage",()=>{
 assert.equal(assessDaily(entries,[target],undefined,"2026-10-04").rows[0].status,"incomplete");
 const coverage={confirmed:true,signature:intakeSignature(entries)};
 const complete=assessDaily(entries,[target],coverage,"2026-10-04");assert.equal(complete.rows[0].status,"within-target");assert.equal(complete.rows[0].value,2000);assert.equal(complete.rows[4].value,null);
 assert.equal(assessDaily(entries,[{...target,minimum:2100}],coverage,"2026-10-04").rows[0].status,"below-target");
 assert.equal(assessDaily(entries,[{...target,maximum:1900,minimum:null}],coverage,"2026-10-04").rows[0].status,"above-target");
 assert.equal(assessDaily(entries,[target],coverage,"2026-10-11").rows[0].status,"review-required");
 assert.equal(assessDaily([...entries,{...entries[0],id:"snack",estimate:null}], [target],coverage,"2026-10-04").dayConfirmed,false);
 assert.equal(assessDaily([{...entries[0],approximate:true}],[target],{confirmed:true,signature:intakeSignature([{...entries[0],approximate:true}])},"2026-10-04").rows[0].value,null);
});
test("targets validate ranges, dates and clinical applicability",()=>{
 assert.equal(nutritionTargetSchema.safeParse({...target,minimum:3000}).success,false);
 assert.equal(nutritionTargetSchema.safeParse({...target,kind:"clinician-prescribed"}).success,false);
 const profile=profileSchema.parse({id:"adult",name:"Adult",ageBand:"adult",country:"FR",consent:true,allergies:[]});
 assert.equal(validateTargetForProfile(profile,target),target);
 for(const risk of [{pregnancy:true},{breastfeeding:true},{diabetes:"type1" as const},{coeliac:true},{allergies:["milk"]},{intolerances:["lactose"]},{clinicianInstructions:"Prescribed nutritional management"},{otherConditions:"kidney disease"},{ageBand:"child" as const,caregiverAuthorized:true}]){
  assert.throws(()=>validateTargetForProfile({...profile,...risk},target));
  assert.doesNotThrow(()=>validateTargetForProfile({...profile,...risk},{...target,kind:"clinician-prescribed",clinicianConfirmed:true}));
 }
 assert.equal(assessDaily([],[],{signature:"[]",confirmed:true},"2026-10-04").rows[0].value,null);
 assert.equal(sourceNutrition([],1,[]).values.energyKcal,null);
});
