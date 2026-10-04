import {canonical,measure,type Batch,type Ingredient} from "./meal-engine";
const nutrients=["energyKcal","carbohydrateG","proteinG","fatG","sodiumG","saltG"] as const;
export type Nutrient=typeof nutrients[number];
export function sourceNutrition(ingredients:Ingredient[],scale:number,products:Batch[]){
 const totals=Object.fromEntries(nutrients.map(n=>[n,0])) as Record<Nutrient,number>;
 const knownNutrients=Object.fromEntries(nutrients.map(n=>[n,0])) as Record<Nutrient,number>;
 const missing: string[]=[];const incomplete=new Set<Nutrient>();const sources:{ingredient:string;url:string;retrievedAt:string;grams:number}[]=[];
 if(!ingredients.some(i=>!i.omitted))nutrients.forEach(n=>incomplete.add(n));
 for(const ingredient of ingredients.filter(i=>!i.omitted)){
  const quantity=measure(ingredient.quantity,ingredient.unit);
  const candidates=products.filter(p=>canonical(p.name)===canonical(ingredient.name)&&p.quantity!==0);
  const facts=candidates.map(p=>p.evidence).filter(e=>!!e);
  const unique=new Map(facts.map(e=>[e!.barcode,e!]));
  if(!quantity||quantity.unit!=="g"||unique.size!==1||candidates.some(p=>!p.evidence)){
   missing.push(ingredient.name);nutrients.forEach(n=>incomplete.add(n));continue;
  }
  const evidence=[...unique.values()][0];const grams=quantity.amount*scale;
  sources.push({ingredient:ingredient.name,url:evidence.source.url,retrievedAt:evidence.source.retrievedAt,grams});
  for(const nutrient of nutrients){const value=evidence.nutrition[nutrient];if(value===null)incomplete.add(nutrient);else{totals[nutrient]+=value*grams/100;knownNutrients[nutrient]++;}}
 }
 return {values:Object.fromEntries(nutrients.map(n=>[n,incomplete.has(n)?null:Math.round(totals[n]*100)/100])) as Record<Nutrient,number|null>,
  knownSubtotal:Object.fromEntries(nutrients.map(n=>[n,Math.round(totals[n]*100)/100])) as Record<Nutrient,number>,
  knownNutrients,missingIngredients:missing,sources,complete:ingredients.length>0&&!incomplete.size,
  basis:"Ingredient estimate from 100 g as-sold product data; cooking losses, absorption and final yield are not measured.",
  suitability:"not-assessed",dailyAdequacy:"unknown",targets:null};
}
