import { consume, shopping, type Ingredient, type Kitchen, type Plan, type Profile } from "./meal-engine";
import { checkMeal, healthRuleVersion } from "./meal-health";
import { practicalRank } from "./meal-ranking";
import {z} from "zod";
import {localDate} from "./meal-engine";
export const rescueOverride=z.object({id:z.string().min(1).max(80),date:localDate,slot:z.enum(["breakfast","lunch","dinner","snack"]),servings:z.number().positive().max(100),diners:z.array(z.string().min(1).max(80)).max(20)});
export function editedRescueProposal(state:Kitchen,proposal:RescueProposal,selected:string[],overrides:z.infer<typeof rescueOverride>[],recipes:RescueRecipe[],profiles:Profile[],from:string,to:string){
 const changes=structuredClone(proposal.changes.filter(c=>selected.includes(c.after.id))),draft=structuredClone(state);
 if(changes.length!==new Set(selected).size||new Set(overrides.map(o=>o.id)).size!==overrides.length||overrides.some(o=>!selected.includes(o.id)))throw Error("Choose only proposed changes.");
 for(const c of changes){
  const override=overrides.find(o=>o.id===c.after.id);if(override)c.after={...c.after,...override};
  if(c.after.date<from||c.after.date>to)throw Error("Choose a date inside the reviewed window.");
  const current=draft.plans.find(p=>p.id===c.before.id);if(!current||current.locked||current.cookedId||(draft.preparation??[]).some(t=>t.planId===current.id&&t.status==="completed"))throw Error("Protected meal changed.");
  let products=draft.pantry;
  if(c.after.leftoverId){const leftover=draft.leftovers.find(l=>l.id===c.after.leftoverId),source=draft.occasions.find(o=>o.id===leftover?.occasionId&&!o.undone);const reserved=draft.plans.filter(p=>p.id!==c.after.id&&p.leftoverId===leftover?.id&&!p.cookedId).reduce((n,p)=>n+p.servings,0);if(!leftover||!source||leftover.remaining-reserved<c.after.servings)throw Error("Leftover quantity changed.");products=source.nutritionProducts??[];
  }else if(!recipes.some(r=>r.id===c.after.recipeId&&r.updatedAt===c.after.recipeVersion))throw Error("Recipe changed or is unavailable.");
  const diners=profiles.filter(p=>c.after.diners.includes(p.id)),check=checkMeal(c.after.ingredients,diners,!c.after.diners.length||diners.length!==c.after.diners.length,products);
  if(check.status!=="not-assessed"&&(c.after.diners.length>0||check.status==="conflict"))throw Error("Restriction evidence unresolved or conflicting.");
  draft.plans[draft.plans.findIndex(p=>p.id===c.after.id)]=c.after;
 }
 return {...proposal,changes,shopping:shopping(draft,from,to),previousShopping:shopping(state,from,to),preparationReview:(state.preparation??[]).filter(t=>changes.some(c=>c.after.id===t.planId)&&t.status!=="completed").map(t=>t.id)};
}
export type RescueRecipe={id:string;title:string;servings:number;ingredients:Ingredient[];steps:unknown;sourceProvenance:unknown;updatedAt:string};
export type RescueProposal={objective:string;changes:{before:Plan;after:Plan;reasons:string[]}[];retainedLocked:string[];shopping:ReturnType<typeof shopping>;previousShopping:ReturnType<typeof shopping>;preparationReview:string[]};
export type RescueReview={actorId:string;kitchenId:string;version:number;expiresAt:number;ruleVersion:string;proposal:RescueProposal};
export function rescueProposals(state:Kitchen,recipes:RescueRecipe[],profiles:Profile[],from:string,to:string):RescueProposal[]{
 const proposals:RescueProposal[]=[];const seen=new Set<string>();
 for(const objective of ["Use on-hand food", "Reduce additional groceries", "Reduce known cooking time"]){
  const draft=structuredClone(state);const changes:RescueProposal["changes"]=[];
  for(const plan of draft.plans.filter(p=>p.date>=from&&p.date<=to&&!p.locked&&!p.cookedId&&!p.leftoverId)){
   // Completed actual prep binds its ingredients; do not swap away what was already used.
   if((draft.preparation??[]).some(t=>t.planId===plan.id&&t.status==="completed"))continue;
   const diners=profiles.filter(p=>plan.diners.includes(p.id));
   if(objective==="Use on-hand food") {
    const leftover=draft.leftovers.filter(l=>l.remaining-draft.plans.filter(p=>p.leftoverId===l.id&&!p.cookedId&&p.id!==plan.id).reduce((n,p)=>n+p.servings,0)>=plan.servings&&(!l.date||l.date>=plan.date)).sort((a,b)=>(a.date??"9999").localeCompare(b.date??"9999")).find(l=>{
      const source=draft.occasions.find(o=>o.id===l.occasionId&&!o.undone);if(!source)return false;
      const check=checkMeal(source.ingredients,diners,!plan.diners.length||diners.length!==plan.diners.length,source.nutritionProducts??[]);
      return check.status==="not-assessed"||(!plan.diners.length&&check.status!=="conflict");
    });
    if(leftover){const before=structuredClone(plan),source=draft.occasions.find(o=>o.id===leftover.occasionId)!;const after:Plan={...plan,title:leftover.title,leftoverId:leftover.id,ingredients:source.ingredients,referenceServings:source.referenceServings,recipeVersion:source.recipeVersion};delete after.recipeId;delete after.cookedId;draft.plans[draft.plans.findIndex(p=>p.id===plan.id)]=after;changes.push({before,after,reasons:["Use recorded batch leftovers; raw ingredients are not deducted again","Storage dates do not certify food safety; confirm the actual batch before eating"]});continue;}
   }
   const choices=recipes.map(r=>{
    const check=checkMeal(r.ingredients,diners,!plan.diners.length||diners.length!==plan.diners.length,draft.pantry);
    const missing=consume(structuredClone(draft.pantry),r.ingredients,plan.servings/r.servings).unresolved;
    const knownTime=(r.sourceProvenance as {totalTimeMinutes?:number}|null)?.totalTimeMinutes??null;
    const rank=practicalRank(r,draft,diners,draft.pantry.filter(p=>p.quantity!==0).map(p=>p.name),plan.date);
    return {r,check,missing,knownTime,rank};
   }).filter(c=>(c.check.status==="not-assessed"||(!plan.diners.length&&c.check.status!=="conflict"))&&!c.rank.reasons.includes("instructions-mention-unlisted-oven")&&!c.rank.reasons.includes("source-time-exceeds-daily-context")&&(objective!=="Reduce known cooking time"||c.knownTime!==null));
   choices.sort((a,b)=>{
    const score=(c:typeof a)=>objective==="Reduce known cooking time"?c.knownTime!:objective==="Reduce additional groceries"?c.missing.length*20+c.rank.rank:c.rank.rank+c.missing.length*10;
    return score(a)-score(b)||a.r.id.localeCompare(b.r.id);
   });
   const chosen=choices[0];if(!chosen||chosen.r.id===plan.recipeId)continue;
   const before=structuredClone(plan);const after={...plan,recipeId:chosen.r.id,title:chosen.r.title,ingredients:chosen.r.ingredients,referenceServings:chosen.r.servings,recipeVersion:chosen.r.updatedAt};
   Object.assign(plan,after);changes.push({before,after,reasons:[...chosen.rank.reasons,...(chosen.knownTime?[`Source cooking time: ${chosen.knownTime} minutes`]:[]),`${chosen.missing.length} ingredient quantities need review or shopping`]});
  }
  const signature=JSON.stringify(changes.map(c=>[c.after.id,c.after.recipeId,c.after.leftoverId]));
  if(!changes.length||seen.has(signature))continue;seen.add(signature);
  proposals.push({objective,changes,retainedLocked:state.plans.filter(p=>p.locked&&p.date>=from&&p.date<=to).map(p=>p.id),shopping:shopping(draft,from,to),previousShopping:shopping(state,from,to),preparationReview:(state.preparation??[]).filter(t=>changes.some(c=>c.after.id===t.planId)&&t.status!=="completed").map(t=>t.id)});
 }
 return proposals;
}
export const rescueRuleVersion=healthRuleVersion;
function ordered(value:unknown):unknown{
 if(Array.isArray(value))return value.map(ordered);
 if(value&&typeof value==="object")return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,ordered(v)]));
 return value;
}
export function undoAcceptedRescue(state:Kitchen,id:string,actorId:string){
 const rescue=state.rescues?.find(r=>r.id===id&&r.actorId===actorId&&!r.undone);
 if(!rescue)throw Error("Accepted rescue unavailable.");
 const conflicts:string[]=[];
 for(const change of rescue.changes){
  const plan=state.plans.find(p=>p.id===change.after.id);
  const prepared=(state.preparation??[]).some(t=>t.planId===plan?.id&&t.status==="completed");
  if(!plan||plan.cookedId||prepared||JSON.stringify(ordered(plan))!==JSON.stringify(ordered(change.after))){conflicts.push(change.after.id);continue;}
  state.plans[state.plans.findIndex(p=>p.id===change.before.id)]=structuredClone(change.before);
  for(const task of state.preparation??[])if(task.planId===plan.id&&task.status!=="completed")task.reviewNeeded=true;
 }
 if(conflicts.length===rescue.changes.length)throw Error("Subsequent meal changes prevent undo. Review these meals manually.");
 rescue.changes=rescue.changes.filter(c=>conflicts.includes(c.after.id));rescue.undone=!rescue.changes.length;
 return {conflicts,remaining:rescue.changes.length};
}
