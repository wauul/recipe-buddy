import { Prisma } from "@prisma/client";
import { db } from "./db";
import { HttpError } from "./http";
import { rateLimit } from "./rate-limit";
import type { Kitchen } from "./meal-engine";
import type { GroceryBasket } from "./meal-commerce";
type HandoffBasket=GroceryBasket&{handoffRequested?:boolean};
export async function createRetailerHandoff(actor:string,kitchenId:string,id:string){
 if(!process.env.INSTACART_DEVELOPMENT_API_KEY)throw new HttpError(503,"Instacart development access is not configured. Manual shopping remains available.");
 if(!await rateLimit("meal-retailer-handoff:"+actor,6,3600))throw new HttpError(429,"Retailer handoff limit reached. Reuse an existing basket.");
 const basket=await db.$transaction(async tx=>{
  await tx.$queryRaw`SELECT "id" FROM "MealKitchen" WHERE "id"=${kitchenId} FOR UPDATE`;
  const row=await tx.mealKitchen.findFirst({where:{id:kitchenId,members:{some:{userId:actor,role:{in:["owner","planner","shopper"]}}}}});
  if(!row)throw new HttpError(403,"Shopper permission required.");
  const state=row.state as unknown as Kitchen;const basket=state.baskets?.find(b=>b.id===id) as HandoffBasket|undefined;
  if(!basket)throw new HttpError(404,"Basket unavailable.");
  if(basket.url)return basket;
  if(basket.status!=="handoff-pending"||basket.handoffRequested)throw new HttpError(409,"The retailer response is pending or unknown. This is not proof of an order; reconcile manually.");
  basket.handoffRequested=true;
  await tx.mealKitchen.update({where:{id:kitchenId},data:{state:state as unknown as Prisma.InputJsonValue,version:{increment:1}}});return basket;
 });
 if(basket.url)return {url:basket.url,status:"retailer-handoff"};
 const lines=basket.items.map(i=>({name:i.name,display_text:i.name+(i.quantity===null?" · quantity needs review":""),...(i.quantity!==null&&["g","ml","count"].includes(i.unit)?{line_item_measurements:[{quantity:i.quantity,unit:i.unit==="count"?"each":i.unit}]}:{})}));
 let response:Response;
 try{response=await fetch("https://connect.dev.instacart.tools/idp/v1/products/products_link",{method:"POST",headers:{Authorization:`Bearer ${process.env.INSTACART_DEVELOPMENT_API_KEY}`,"content-type":"application/json",Accept:"application/json"},body:JSON.stringify({title:"Recipe Buddy groceries",link_type:"shopping_list",expires_in:7,line_items:lines}),signal:AbortSignal.timeout(8000),cache:"no-store",redirect:"error"})}
 catch{throw new HttpError(503,"Retailer handoff response is unknown. No purchase was placed by Recipe Buddy. Reconcile manually.")}
 if(!response.ok)throw new HttpError(503,"Retailer handoff unavailable. No order is confirmed.");
 const result=await response.json() as {products_link_url?:string};let url:URL;
 try{url=new URL(result.products_link_url!);if(url.protocol!=="https:"||url.username||url.password||!(url.hostname==="instacart.com"||url.hostname.endsWith(".instacart.com")||url.hostname==="instacart.tools"||url.hostname.endsWith(".instacart.tools")))throw Error()}catch{throw new HttpError(503,"Retailer returned an unexpected handoff link.")}
 await db.$transaction(async tx=>{
  await tx.$queryRaw`SELECT "id" FROM "MealKitchen" WHERE "id"=${kitchenId} FOR UPDATE`;
  const row=await tx.mealKitchen.findFirst({where:{id:kitchenId,members:{some:{userId:actor,role:{in:["owner","planner","shopper"]}}}}});if(!row)throw new HttpError(403,"Kitchen access ended.");
  const state=row.state as unknown as Kitchen;const current=state.baskets?.find(b=>b.id===id);if(!current||current.status!=="handoff-pending")throw new HttpError(409,"Basket changed while preparing the handoff.");
  current.url=url.href;current.status="retailer-handoff";
  await tx.mealKitchen.update({where:{id:kitchenId},data:{state:state as unknown as Prisma.InputJsonValue,version:{increment:1}}});
 });return {url:url.href,status:"retailer-handoff",orderConfirmed:false};
}
