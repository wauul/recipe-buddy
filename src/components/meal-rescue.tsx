"use client";
import { useState } from "react";
import type { Kitchen } from "@/lib/meal-engine";
import {shopping} from "@/lib/meal-engine";
import type { RescueProposal } from "@/lib/meal-rescue";
import { useTranslation } from "./language-provider";
import {mealReasonLabel} from "@/lib/meal-reason-label";
export function MealRescue({kitchenId,state,from,to,mutate,busy}:{kitchenId:string;state:Kitchen;from:string;to:string;mutate:(a:string,d:unknown)=>Promise<boolean>;busy:boolean}){
 const {t,locale}=useTranslation();const [proposals,setProposals]=useState<(RescueProposal&{token:string})[]>([]),[selected,setSelected]=useState<string[]>([]),[error,setError]=useState(""),[loading,setLoading]=useState(false);
 function preview(p:RescueProposal){const draft=structuredClone(state);for(const c of p.changes.filter(c=>selected.includes(c.after.id)))draft.plans[draft.plans.findIndex(old=>old.id===c.after.id)]=c.after;return shopping(draft,from,to);}
 function edit(objective:string,id:string,field:"date"|"servings"|"slot",value:string){setProposals(proposals.map(p=>p.objective!==objective?p:{...p,changes:p.changes.map(c=>c.after.id!==id?c:{...c,after:{...c.after,[field]:field==="servings"?Number(value):value}})}));}
 return <details><summary>{t("Rescue my week · Pro")}</summary><p>{t("Preview future meal changes using saved recipes and known stock. Locked meals and completed events stay protected. Unknown time, prices and health evidence remain unknown.")}</p>
 <button className="button secondary" disabled={busy||loading} onClick={async()=>{setLoading(true);setError("");try{const r=await fetch("/api/meals/rescue",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({kitchenId,from,to})});const v=await r.json();if(!r.ok)throw Error(v.error??"Could not generate rescue proposals.");setProposals(v.proposals);setSelected(v.proposals.flatMap((p:RescueProposal)=>p.changes.map(c=>c.after.id)));if(!v.proposals.length)setError("No feasible changes with the current evidence. Ordinary meal editing remains available.")}catch(e){setError((e as Error).message)}finally{setLoading(false)}}}>{t(loading?"Loading…":"Preview rescue options")}</button>
 {error&&<p role="status">{t(error)}</p>}
 {proposals.map(p=><article key={p.objective} className="meal-card"><h3>{t(p.objective)}</h3>{p.changes.map(c=><label key={c.after.id}><input type="checkbox" checked={selected.includes(c.after.id)} onChange={e=>setSelected(e.target.checked?[...selected,c.after.id]:selected.filter(id=>id!==c.after.id))}/>{c.before.date} · {c.before.title} → {c.after.title} · {c.after.servings} {t("servings")}<small>{c.reasons.map(r=>mealReasonLabel(r,locale)).join(" · ")}</small></label>)}
 <p>{t("Locked meals retained")}: {p.retainedLocked.length}. {t("Preparation tasks to review")}: {p.preparationReview.length}.</p>
 {p.changes.map(c=><div className="meal-fields" key={c.after.id}><strong>{c.after.title}</strong><label>{t("Local date")}<input type="date" value={c.after.date} onChange={e=>edit(p.objective,c.after.id,"date",e.target.value)}/></label><label>{t("Servings")}<input type="number" min="0.1" max="100" step="any" value={c.after.servings} onChange={e=>edit(p.objective,c.after.id,"servings",e.target.value)}/></label><label>{t("Meal slot")}<select value={c.after.slot} onChange={e=>edit(p.objective,c.after.id,"slot",e.target.value)}>{["breakfast","lunch","dinner","snack"].map(s=><option key={s} value={s}>{t(s)}</option>)}</select></label></div>)}
 <p>{t("Shopping preview")}: {p.previousShopping.needs.length} → {preview(p).needs.length} {t("ingredient needs")}</p>{preview(p).needs.map((n,i)=><p key={i}>{n.name}: {n.quantity??t("Quantity unknown")} {n.unit} · {n.firstDate}</p>)}
 <button className="button secondary" disabled={busy||!p.changes.some(c=>selected.includes(c.after.id))} onClick={async()=>{const changes=p.changes.filter(c=>selected.includes(c.after.id));if(await mutate("accept-rescue",{token:p.token,selected:changes.map(c=>c.after.id),overrides:changes.map(c=>({id:c.after.id,date:c.after.date,slot:c.after.slot,servings:c.after.servings,diners:c.after.diners}))}))setProposals([])}}>{t("Accept selected changes")}</button></article>)}
 {!!proposals.length&&<button className="button secondary" onClick={()=>setProposals([])}>{t("Cancel preview")}</button>}
 {(state.rescues??[]).filter(r=>!r.undone).map(r=><button className="button secondary" key={r.id} disabled={busy} onClick={()=>mutate("undo-rescue",{id:r.id})}>{t("Undo accepted rescue")}</button>)}
 </details>;
}
