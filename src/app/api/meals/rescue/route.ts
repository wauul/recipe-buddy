import { api,body,userId,HttpError } from "@/lib/http";
import { requirePro } from "@/lib/native-pro";
import { db } from "@/lib/db";
import { readMeals } from "@/lib/meal-service";
import { sharedRecipeWhere } from "@/lib/social-policy";
import { localDate,type Ingredient,type Profile } from "@/lib/meal-engine";
import { rescueProposals,rescueRuleVersion,rescueOverride,editedRescueProposal,type RescueReview } from "@/lib/meal-rescue";
import { signMealReview,readMealReview } from "@/lib/meal-review-token";
import { z } from "zod";
export async function POST(request:Request){return api(async()=>{
 const actor=await userId();await requirePro(actor);
 const input=z.object({kitchenId:z.string().max(80).optional(),from:localDate,to:localDate,token:z.string().max(200000).optional(),selected:z.array(z.string().max(80)).max(100).default([]),overrides:z.array(rescueOverride).max(100).default([])}).parse(await body(request));
 const meals=await readMeals(actor,input.kitchenId);
 if(!["owner","planner"].includes(meals.members.find(m=>m.userId===actor)?.role??""))throw new HttpError(403,"Planner permission required.");
 const today=new Intl.DateTimeFormat("en-CA",{timeZone:meals.state.timezone}).format(new Date());
 if(input.from<today||input.to<input.from||Date.parse(input.to)-Date.parse(input.from)>31*86400000)throw new HttpError(400,"Choose a future planning window of up to 31 days.");
 const profiles=await db.mealProfile.findMany({where:{kitchenId:meals.kitchenId}});
 const recipes=await db.recipe.findMany({where:{OR:[{userId:actor},{shares:{some:sharedRecipeWhere(actor)}}]},take:200});
 const sourceRecipes=recipes.map(r=>({...r,ingredients:r.ingredients as unknown as Ingredient[],updatedAt:r.updatedAt.toISOString()}));
 let proposals;
 if(input.token){const review=readMealReview<RescueReview>(input.token,"rescue");if(review.actorId!==actor||review.kitchenId!==meals.kitchenId||review.version!==meals.version||review.ruleVersion!==rescueRuleVersion||review.expiresAt<Date.now())throw new HttpError(409,"Rescue preview changed or expired.");try{proposals=[editedRescueProposal(meals.state,review.proposal,input.selected,input.overrides,sourceRecipes,profiles.map(p=>p.data as unknown as Profile),input.from,input.to)];}catch(e){throw new HttpError(409,(e as Error).message);}}
 else proposals=rescueProposals(meals.state,sourceRecipes,profiles.map(p=>p.data as unknown as Profile),input.from,input.to);
 return {proposals:proposals.map(proposal=>({...proposal,token:signMealReview({actorId:actor,kitchenId:meals.kitchenId,version:meals.version,expiresAt:Date.now()+15*60000,ruleVersion:rescueRuleVersion,proposal},"rescue")})),limitations:["Known quantities and source timings only; no optimality or medical suitability claim.","Purchased items count only after recorded receipt. Dates do not certify storage safety.","No new internet recipes are imported. Fewer valid alternatives may be available."]};
})}
