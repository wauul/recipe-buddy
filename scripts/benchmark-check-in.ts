import { emptyKitchen, batchSchema, planSchema } from '../src/lib/meal-engine';
import { checkInSnapshot } from '../src/lib/meal-check-in';
import { writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const state=emptyKitchen();
state.pantry=Array.from({length:1000},(_,i)=>batchSchema.parse({id:`batch-${i}`,name:`Ingredient ${i}`,quantity:500,unit:'g',quantityEstimated:true}));
state.plans=Array.from({length:200},(_,i)=>planSchema.parse({id:`plan-${i}`,title:`Meal ${i}`,date:'2026-10-06',slot:'dinner',servings:4,diners:['mine']}));
state.eaten=Array.from({length:4000},(_,i)=>({id:`entry-${i}`,personId:'mine',date:'2026-09-01',slot:'snack' as const,title:'Food',amount:null,approximate:true}));
state.history=Array.from({length:2000},(_,i)=>({id:`history-${i}`,actorId:'a',date:'2026-10-01',action:'stock',reversed:false,effects:[{batchId:`batch-${i%1000}`,quantity:1}]}));
const times:number[]=[];let bytes=0;
for(let i=0;i<31;i++){const start=performance.now();const result=checkInSnapshot(state,'a','owner',[{id:'mine',name:'Me'}],new Date('2026-10-07T10:00:00Z'));times.push(performance.now()-start);assert.equal(result.questions.length,100);assert.equal(result.nextOffset,100);bytes=Buffer.byteLength(JSON.stringify(result));}
const warm=times.slice(1).sort((a,b)=>a-b);
const result={environment:'local Node; pure candidate generation, no network or provider calls',pantry:1000,plans:200,eaten:4000,history:2000,coldMs:times[0],warmMedianMs:warm[15],warmP95Ms:warm[28],responseBytes:bytes,returnedQuestions:100,maxPerVisit:5,acceptance:'under 250 ms p95 on this host',passed:warm[28]<250};
assert(result.passed);writeFileSync('test-results/check-in/benchmark.json',JSON.stringify(result,null,2));console.log(result);
