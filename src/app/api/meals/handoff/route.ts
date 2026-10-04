import { api,body,userId,HttpError } from "@/lib/http";
import { applyMeal } from "@/lib/meal-service";
import { createRetailerHandoff } from "@/lib/meal-handoff";
import { requirePro } from "@/lib/native-pro";
import { z } from "zod";
export async function POST(request:Request){return api(async()=>{
 const actor=await userId();await requirePro(actor);
 const v=z.object({operationId:z.string().uuid(),kitchenId:z.string().min(1).max(80),baseVersion:z.number().int().nonnegative(),id:z.string().uuid()}).parse(await body(request));
 if(!process.env.INSTACART_DEVELOPMENT_API_KEY)throw new HttpError(503,"Instacart development access is not configured. Manual shopping remains available.");
 await applyMeal(actor,{operationId:v.operationId,kitchenId:v.kitchenId,baseVersion:v.baseVersion,action:"begin-basket-handoff",data:{id:v.id}});
 return createRetailerHandoff(actor,v.kitchenId,v.id);
})}
