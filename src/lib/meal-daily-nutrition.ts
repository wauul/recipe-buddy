import { z } from "zod";
import { localDate, type Profile } from "./meal-engine";
import type { Nutrient, sourceNutrition } from "./meal-nutrition";

export const targetNutrients = ["energyKcal", "carbohydrateG", "proteinG", "fatG", "sodiumG", "saltG"] as const;
export const nutritionTargetSchema = z.object({
  nutrient: z.enum(targetNutrients),
  minimum: z.number().finite().nonnegative().max(100000).nullable(),
  maximum: z.number().finite().nonnegative().max(100000).nullable(),
  kind: z.enum(["personal", "clinician-prescribed"]),
  source: z.string().trim().min(3).max(500),
  issued: localDate,
  reviewDate: localDate,
  clinicianConfirmed: z.boolean(),
}).refine(t => t.minimum !== null || t.maximum !== null, "Provide a target bound.")
  .refine(t => t.minimum === null || t.maximum === null || t.minimum <= t.maximum, "Minimum exceeds maximum.")
  .refine(t => t.reviewDate >= t.issued, "Review date precedes issue date.")
  .refine(t => t.kind !== "clinician-prescribed" || t.clinicianConfirmed, "Confirm this target was prescribed by your clinician.");
export type NutritionTarget = z.infer<typeof nutritionTargetSchema>;
export const recordedNutritionSchema=z.object({
 portion:z.string().trim().min(1).max(200),source:z.string().trim().min(3).max(500),confirmed:z.literal(true),
 values:z.object({energyKcal:z.number().finite().nonnegative().max(100000).nullable(),carbohydrateG:z.number().finite().nonnegative().max(100000).nullable(),proteinG:z.number().finite().nonnegative().max(100000).nullable(),fatG:z.number().finite().nonnegative().max(100000).nullable(),sodiumG:z.number().finite().nonnegative().max(100000).nullable(),saltG:z.number().finite().nonnegative().max(100000).nullable()})
});
export type RecordedNutrition=z.infer<typeof recordedNutritionSchema>;
export function recordedEstimate(record:RecordedNutrition):ReturnType<typeof sourceNutrition>{
 return {values:record.values,knownSubtotal:Object.fromEntries(targetNutrients.map(n=>[n,record.values[n]??0])) as Record<Nutrient,number>,knownNutrients:Object.fromEntries(targetNutrients.map(n=>[n,record.values[n]===null?0:1])) as Record<Nutrient,number>,missingIngredients:[],sources:[],complete:targetNutrients.every(n=>record.values[n]!==null),basis:`User-entered composition for actual consumed portion: ${record.portion}; source: ${record.source}`,suitability:"not-assessed",dailyAdequacy:"unknown",targets:null};
}
export function validateTargetForProfile(profile: Profile, target: NutritionTarget) {
  const clinical = profile.ageBand !== "adult" || profile.pregnancy || profile.breastfeeding || profile.diabetes !== "none" || profile.coeliac || profile.allergies.length > 0 || profile.intolerances.length > 0 || !!profile.otherConditions.trim() || !!profile.clinicianInstructions.trim();
  if (clinical && target.kind !== "clinician-prescribed") throw new Error("This profile requires clinician-prescribed nutrition targets.");
  return target;
}
export type DailyEntry = {id:string;personId:string;date:string;amount:number|null;approximate:boolean;nutritionEvidence?:RecordedNutrition;estimate:ReturnType<typeof sourceNutrition>|null};
// The attestation becomes stale whenever recorded portions or source estimates change.
export function intakeSignature(entries: DailyEntry[]) {
  return JSON.stringify([...entries].sort((a,b)=>a.id.localeCompare(b.id)).map(e=>[e.id,e.amount,e.approximate,e.nutritionEvidence??null,e.estimate?.values??null,e.estimate?.sources??null]));
}
export function assessDaily(entries:DailyEntry[], targets:NutritionTarget[], coverage:{signature:string;confirmed:boolean}|undefined, date:string) {
  const recordedComplete = entries.length > 0 && entries.every(e=>(!!e.nutritionEvidence || (e.amount!==null && !e.approximate)) && e.estimate!==null);
  const dayConfirmed = coverage?.confirmed===true && coverage.signature===intakeSignature(entries);
  return {date, dayConfirmed, recordedComplete, rows:targetNutrients.map(nutrient=>{
    const hasKnown=entries.some(e=>e.estimate&&(e.estimate.values[nutrient]!==null||e.estimate.knownNutrients[nutrient]>0));
    const knownSubtotal = hasKnown ? Math.round(entries.reduce((sum,e)=>sum+(e.estimate?.knownSubtotal[nutrient]??0),0)*100)/100 : null;
    const complete = dayConfirmed && recordedComplete && entries.every(e=>e.estimate?.values[nutrient]!==null);
    const value = complete ? knownSubtotal : null;
    const target = targets.find(t=>t.nutrient===nutrient)??null;
    const active = !!target && date>=target.issued && date<=target.reviewDate;
    const status = !active ? (target ? "review-required" : "no-target") : !complete ? "incomplete" :
      target.minimum!==null && value!<target.minimum ? "below-target" : target.maximum!==null && value!>target.maximum ? "above-target" : "within-target";
    return {nutrient:nutrient as Nutrient,value,knownSubtotal,target,status};
  }), interpretation:"Comparison of one recorded day with configured targets; not a diagnosis of deficiency or proof of long-term dietary adequacy.",
  micronutrients:"Not assessed: complete vitamin and mineral composition is unavailable.", reviewerStatus:"Clinical validation pending"};
}
