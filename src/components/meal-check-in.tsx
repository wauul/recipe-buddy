"use client";
import { useEffect, useState } from "react";
import type { Kitchen, Profile } from "@/lib/meal-engine";
import { useTranslation } from "./language-provider";

export function MealCheckIn({state,profiles,actorId,kitchenId,mutate,busy}:{state:Kitchen;profiles:Profile[];actorId:string;kitchenId:string;mutate:(a:string,d:unknown,v?:boolean)=>Promise<boolean>;busy:boolean}){
 const {t}=useTranslation();const key=`rb-meal-draft:${actorId}:${kitchenId}:check-in`;
 const [draft,setDraft]=useState({personId:"",planId:"",title:"",date:new Intl.DateTimeFormat("en-CA",{timeZone:state.timezone}).format(new Date()),slot:"snack",quantity:"",unit:"g"});const [hydratedKey,setHydratedKey]=useState<string|null>(null);
 useEffect(()=>{try{const saved=sessionStorage.getItem(key);if(saved)setDraft(JSON.parse(saved));}catch{}setHydratedKey(key)},[key]);
 useEffect(()=>{if(hydratedKey===key)try{sessionStorage.setItem(key,JSON.stringify(draft))}catch{}},[key,draft,hydratedKey]);
 const today=new Intl.DateTimeFormat("en-CA",{timeZone:state.timezone}).format(new Date());
 const pending=state.plans.filter(p=>p.date<=today&&p.date>=new Date(Date.parse(today)-7*86400000).toISOString().slice(0,10)).flatMap(p=>profiles.filter(d=>p.diners.includes(d.id)&&!state.eaten.some(e=>e.planId===p.id&&e.personId===d.id)).map(d=>({p,d}))).slice(0,3);
 const uncertain=state.pantry.filter(b=>b.quantity===null||b.quantityEstimated).slice(0,2);
 return <details><summary>{t("Kitchen check-in")}</summary><p>{t("Optional. Confirm only what you know; skipped questions remain unknown. Each answer saves separately.")}</p>
 {pending.map(({p,d})=><div className="meal-card" key={p.id+d.id}><strong>{p.date} · {p.title} · {d.name}</strong><button className="button secondary" disabled={busy} onClick={()=>mutate("eat",{id:crypto.randomUUID(),planId:p.id,personId:d.id,title:p.title,date:p.date,slot:p.slot,amount:null,approximate:true})}>{t("Confirm this meal was eaten")}</button><button className="button secondary" onClick={()=>setDraft({...draft,date:p.date,slot:p.slot,personId:d.id,planId:p.id,title:""})}>{t("Record something else instead")}</button></div>)}
 <details><summary>{t("Add an actual meal, snack or drink")}</summary><div className="meal-fields"><label>{t("Person")}<select value={draft.personId} onChange={e=>setDraft({...draft,personId:e.target.value})}><option value="">{t("Choose a person")}</option>{profiles.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label>{t("Food or drink")}<input value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})}/></label><label>{t("Local date")}<input type="date" value={draft.date} onChange={e=>setDraft({...draft,date:e.target.value})}/></label><label>{t("Meal slot")}<select value={draft.slot} onChange={e=>setDraft({...draft,slot:e.target.value})}>{["breakfast","lunch","dinner","snack"].map(s=><option key={s} value={s}>{t(s)}</option>)}</select></label></div><button className="button secondary" disabled={busy||!draft.personId||!draft.title.trim()} onClick={async()=>{if(await mutate("eat",{id:crypto.randomUUID(),personId:draft.personId,planId:draft.planId||undefined,title:draft.title,date:draft.date,slot:draft.slot,amount:null,approximate:true}))setDraft({...draft,title:"",planId:""})}}>{t("Save actual food entry")}</button></details>
 {uncertain.map(b=><CheckInQuantity key={b.id} batch={b} mutate={mutate} busy={busy}/>)}
 <p>{t("Use the pantry to add, correct or discard other stock; use leftovers to confirm remaining servings. Daily context updates upcoming time and equipment. Health changes belong in Profiles.")}</p>
 {!pending.length&&!uncertain.length&&<p>{t("Nothing needs confirmation. Your check-in is optional.")}</p>}
 </details>;
}
function CheckInQuantity({batch,mutate,busy}:{batch:Kitchen["pantry"][number];mutate:(a:string,d:unknown)=>Promise<boolean>;busy:boolean}){
 const {t,locale}=useTranslation();const [quantity,setQuantity]=useState(batch.quantity?.toString()??"");return <div className="meal-fields"><label>{batch.name} · {t("Quantity unknown")}<input type="number" min="0" value={quantity} onChange={e=>setQuantity(e.target.value)}/></label><button className="button secondary" disabled={busy||quantity===""||Number(quantity)<0} onClick={()=>mutate("pantry",{...batch,quantity:Number(quantity),quantityEstimated:false})}>{t("Confirm exact quantity")}</button><button className="button secondary" disabled={busy||quantity===""||Number(quantity)<0} onClick={()=>mutate("pantry",{...batch,quantity:Number(quantity),quantityEstimated:true})}>{locale==="fr"?"Enregistrer une estimation · à vérifier":"Save estimate · review required"}</button></div>;
}
