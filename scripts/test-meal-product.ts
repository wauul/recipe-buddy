import {lookupMealProduct} from "../src/lib/meal-products";
import {mkdir,writeFile} from "node:fs/promises";
async function main(){
 // Transient provider verification only. No product catalogue or user data is persisted.
 process.env.MEAL_PRODUCT_LOOKUP_ENABLED="true";
 let result:unknown;
 try{const p=await lookupMealProduct("3017620422003");result={result:"pass",barcode:p.barcode,name:p.name,source:p.source,nutritionBasis:p.nutrition.basis,missingNutrients:Object.entries(p.nutrition).filter(([,v])=>v===null).map(([k])=>k),crossContact:p.crossContact,storedUserData:false};}
 catch(e){result={result:"unavailable",error:e instanceof Error?e.message:"Provider failed",storedUserData:false};}
 await mkdir("test-results/meals",{recursive:true});await writeFile("test-results/meals/product-provider.json",JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}void main();
