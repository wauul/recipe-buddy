import { z } from "zod";
import { batchSchema, localDate, type Batch } from "./meal-engine";
export const commerceCapabilities = {
 primaryMarkets:["FR","US"], verifiedServiceLocations:[] as string[],
 providers:[
  {id:"instacart",country:"US",status:"credentials-and-development-verification-required",handoff:true,exactProductCart:false,orderStatus:false,checkout:"retailer-confirmation",substitutionEnforcement:false,cataloguePrices:false,cancellation:false,locations:"Chosen and checked at Instacart; no Recipe Buddy location verified",supportUrl:"https://www.instacart.com/help",documentation:"https://docs.instacart.com/developer_platform_api/api/products/create_shopping_list_page/"},
  {id:"fr-partner",country:"FR",status:"approved-retailer-partner-access-required",handoff:false,exactProductCart:false,orderStatus:false,checkout:"unavailable",substitutionEnforcement:false,cataloguePrices:false,cancellation:false,locations:"No retailer/store/postcode integration verified",supportUrl:null,documentation:null},
 ],
};
export type GroceryBasket={id:string;actorId:string;country:"FR"|"US";location:string;fulfilment:"delivery"|"pickup";from:string;to:string;diners:string[];items:{name:string;quantity:number|null;unit:string;firstDate:string}[];status:"prepared"|"handoff-pending"|"retailer-handoff"|"manually-confirmed-order"|"partially-received"|"received"|"cancelled";provider:"instacart"|"manual";providerOrderId:string;url:string;createdAt:string;receivedBatchIds:string[];notes:string;checkoutEvidence:"none"|"user-reconciliation";};
export const prepareBasketInput=z.object({id:z.string().uuid(),country:z.enum(["FR","US"]),location:z.string().trim().min(1).max(100),fulfilment:z.enum(["delivery","pickup"]),from:localDate,to:localDate,selected:z.array(z.string().max(180)).min(1).max(100),diners:z.array(z.string().max(80)).max(20).default([]),acknowledgeIncoming:z.boolean().default(false)});
export function incomingItems(baskets:GroceryBasket[]){return baskets.filter(b=>["handoff-pending","retailer-handoff","manually-confirmed-order","partially-received"].includes(b.status)).flatMap(b=>b.items.map(i=>({...i,basketId:b.id,status:b.status,orderEvidence:b.checkoutEvidence})));}
export const receiptInput=z.object({id:z.string().uuid(),basketId:z.string().uuid(),batch:batchSchema,complete:z.boolean().default(false),notes:z.string().max(1000).default("")});
export function basketKey(item:{name:string;unit:string}){return item.name.toLowerCase().trim()+"|"+item.unit}
export function packagesRequired(required:number,packageAmount:number){if(!Number.isFinite(required)||required<=0||!Number.isFinite(packageAmount)||packageAmount<=0)throw Error("Known positive compatible quantities required.");const count=Math.ceil(required/packageAmount);return {count,total:count*packageAmount,surplus:count*packageAmount-required}}
export function receivedBatch(id:string,batch:Batch){if(batch.quantity===null||batch.quantity<=0)throw Error("Confirm the actual received quantity.");return {...batch,id}}
export const orderReconciliation=z.object({id:z.string().uuid(),status:z.enum(["manually-confirmed-order","cancelled","received"]),providerOrderId:z.string().max(120).default(""),notes:z.string().min(1).max(1000)});
