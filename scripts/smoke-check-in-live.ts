import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const base='https://recipe-buddy-wauul.vercel.app';
assert.equal(process.env.CHECK_IN_LIVE_SMOKE,'authorized-disposable-account');
const file='.tmp/check-in-live.json';
const phase=process.argv[2]??'seed';
async function main(){
 const credentials=existsSync(file)?JSON.parse(readFileSync(file,'utf8')):{email:`checkin-release-${Date.now()}@example.test`,password:randomBytes(24).toString('base64url')};
 assert.match(credentials.email,/^checkin-release-\d+@example\.test$/);
 async function raw(path:string,method='GET',data?:unknown,token?:string){const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',Origin:base,...(token?{Authorization:`Bearer ${token}`}:{})},...(data?{body:JSON.stringify(data)}:{})});const value=await r.json();assert(r.ok,`${method} ${path}: ${r.status} ${JSON.stringify(value)}`);return value;}
 if(!existsSync(file)){await raw('/api/auth/signup','POST',credentials);writeFileSync(file,JSON.stringify(credentials));}
 const session=await raw('/api/native/auth/login','POST',credentials);
 const request=(path:string,method='GET',data?:unknown)=>raw('/api/native/v1/'+path,method,data,session.accessToken);
 if(phase==='cleanup'){await request('account','DELETE',{confirmation:'DELETE',password:credentials.password});writeFileSync('test-results/check-in/live-cleanup.json',JSON.stringify({deleted:true,at:new Date().toISOString()}));return;}
 await request('terms','POST',{version:'2026-10-03',accepted:true});
 let root=await request('meals');const kitchenId=root.kitchenId;
 const change=(action:string,data:unknown,operationId=randomUUID())=>request('meals','POST',{kitchenId,operationId,action,data});
 if(phase==='seed'){
  assert.equal(root.checkIn.total,0);
  const person=randomUUID();await change('profile',{id:person,name:'Release test',ageBand:'adult',country:'FR',consent:true,allergies:[]});
  const batch=randomUUID();await change('pantry',{id:batch,name:'Rice',unit:'g',quantity:500,quantityEstimated:true});
  root=await request('meals');const q=root.checkIn.questions.find((q:any)=>q.sourceId===batch);assert(q);
  const op=randomUUID(),data={id:batch,delta:-100,reason:'correction',quantityEstimated:true,_checkIn:q};
  await change('stock',data,op);await change('stock',data,op);
  root=await request('meals');assert.equal(root.state.pantry.find((b:any)=>b.id===batch).quantity,400);assert.equal(root.state.history.filter((h:any)=>h.id===op).length,1);
  await change('eat',{id:randomUUID(),personId:person,date:root.checkIn.today,slot:'snack',title:'Release test tea',amount:null,approximate:true});
  await change('context',{date:root.checkIn.today,timeMinutes:30,equipment:[],dayType:'rest',appetite:'unknown',mealSize:'unknown',diners:[person],eatingOut:false,_checkIn:root.checkIn.context});
  credentials.kitchenId=kitchenId;credentials.person=person;credentials.batch=batch;writeFileSync(file,JSON.stringify(credentials));
 }
 root=await request('meals');
 assert(root.state.eaten.some((e:any)=>e.title==='Release test tea'&&e.amount===null));
 assert.equal(root.state.pantry.find((b:any)=>b.id===credentials.batch).quantity,400);
 assert.equal((await request('meals/check-in')).checkIn.policy,'kitchen-check-in-v1');
 await request('meals/suggestions','POST',{diners:[credentials.person],date:root.checkIn.today,servings:1,limit:3});
 await request('recipes');await request('home');await request('kitchen-state');
 writeFileSync(`test-results/check-in/live-${phase}.json`,JSON.stringify({at:new Date().toISOString(),host:base,passed:['native authentication','empty check-in','persistent guarded stock and replay','unknown snack and dated context','compact candidates','suggestions','recipes','home','shopping state'],privateFixture:true},null,2));
 console.log('Live check-in smoke passed; credentials retained only in ignored local file.');
}
main().catch(e=>{console.error(e);process.exitCode=1});
