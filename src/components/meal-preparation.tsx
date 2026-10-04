"use client";
import { useState } from "react";
import type { Kitchen, Preparation } from "@/lib/meal-engine";
import { useTranslation } from "./language-provider";
export function MealPreparation({ recipes, state, actorId, members, mutate, busy }: {
  recipes: {id:string;steps?:unknown}[]; state: Kitchen; actorId: string; members: {userId: string; user: {username: string}}[];
  mutate: (a: string, d: unknown, v?: boolean) => Promise<boolean>; busy: boolean;
}) {
  const {t} = useTranslation();
  const [editing, setEditing] = useState<Preparation | null>(null), [description, setDescription] = useState(""),
    [planId, setPlanId] = useState(""), [date, setDate] = useState(new Date().toLocaleDateString("en-CA")),
    [time, setTime] = useState(""), [active, setActive] = useState(""), [passive, setPassive] = useState(""),
    [assignee, setAssignee] = useState(actorId), [dependencies, setDependencies] = useState<string[]>([]),
    [override, setOverride] = useState(false);
  const tasks = state.preparation ?? [];
  return <details><summary>{t("Preparation agenda")}{tasks.filter(x=>x.status==="planned").length ? ` · ${tasks.filter(x=>x.status==="planned").length}` : ""}</summary>
    <p>{t("Tasks use your instructions. Missing timing and food-safety details remain unknown. Completion is separate from cooking and eating.")}</p>
    <div className="meal-fields">
      <label>{t("Task description")}<input value={description} onChange={e=>setDescription(e.target.value)}/></label>
      <label>{t("Linked meal")}<select value={planId} onChange={e=>{setPlanId(e.target.value);const p=state.plans.find(p=>p.id===e.target.value);if(p)setDate(p.date)}}><option value="">{t("Independent preparation")}</option>{state.plans.filter(p=>!p.cookedId).map(p=><option key={p.id} value={p.id}>{p.date} · {p.title}</option>)}</select></label>
      {planId && <label>{t("Use an actual recipe instruction")}<select value="" onChange={e=>setDescription(e.target.value)}><option value="">{t("Choose instruction · timing remains unknown")}</option>{(recipes.find(r=>r.id===state.plans.find(p=>p.id===planId)?.recipeId)?.steps as string[]|undefined)?.map((step,i)=><option value={step} key={i}>{step}</option>)}</select></label>}
      <label>{t("Local date")}<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>
      <label>{t("Planned time")}<input type="time" value={time} onChange={e=>setTime(e.target.value)}/></label>
      <label>{t("Active minutes · optional")}<input type="number" min="1" max="1440" value={active} onChange={e=>setActive(e.target.value)}/></label>
      <label>{t("Waiting minutes · optional")}<input type="number" min="1" max="10080" value={passive} onChange={e=>setPassive(e.target.value)}/></label>
      <label>{t("Assigned to")}<select value={assignee} onChange={e=>setAssignee(e.target.value)}>{members.map(m=><option key={m.userId} value={m.userId}>{m.user.username}</option>)}</select></label>
    </div>
    <fieldset><legend>{t("Dependencies")}</legend>{tasks.filter(x=>x.id!==editing?.id&&x.status!=="dismissed").map(x=><label key={x.id}><input type="checkbox" checked={dependencies.includes(x.id)} onChange={e=>setDependencies(e.target.checked?[...dependencies,x.id]:dependencies.filter(id=>id!==x.id))}/>{x.description}</label>)}</fieldset>
    <label><input type="checkbox" checked={override} onChange={e=>setOverride(e.target.checked)}/>{t("Keep this task date when its meal moves")}</label>
    <button className="button secondary" disabled={busy||!description.trim()} onClick={async()=>{if(await mutate("preparation",{id:editing?.id??crypto.randomUUID(),description,planId:planId||undefined,date,time:time||null,timezone:state.timezone,activeMinutes:active?Number(active):null,passiveMinutes:passive?Number(passive):null,assignee,dependencies,override,reminder:false})){setDescription("");setEditing(null)}}}>{t("Save preparation task")}</button>
    {tasks.slice().sort((a,b)=>(a.date+(a.time??"")).localeCompare(b.date+(b.time??""))).map(task=><article className="meal-card" key={task.id}>
      <strong>{task.description}</strong><p>{task.date} {task.time} · {t(task.status)} · {task.timezone}</p>
      {task.reviewNeeded&&<p role="status">{t("Meal changed. Review this preparation task.")}</p>}
      {task.status!=="completed"&&<button className="button secondary" disabled={busy} onClick={()=>{setEditing(task);setDescription(task.description);setPlanId(task.planId??"");setDate(task.date);setTime(task.time??"");setActive(String(task.activeMinutes??""));setPassive(String(task.passiveMinutes??""));setAssignee(task.assignee);setDependencies(task.dependencies);setOverride(task.override)}}>{t("Edit / move")}</button>}
      {task.status==="planned"&&<PreparationComplete task={task} mutate={mutate} busy={busy}/>}
      {task.status!=="planned"&&<button className="button secondary" disabled={busy||!!task.cookedId} onClick={()=>mutate("undo-preparation",{id:task.id})}>{t("Undo preparation")}</button>}
      {task.status==="planned"&&<button className="button secondary" disabled={busy} onClick={()=>mutate("dismiss-preparation",{id:task.id})}>{t("Dismiss")}</button>}
      {task.time&&task.status==="planned"&&<button className="button secondary" onClick={()=>{
        const contents=`BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Recipe Buddy//Preparation//EN\r\nBEGIN:VEVENT\r\nUID:${task.id}@recipebuddy\r\nDTSTAMP:${new Date().toISOString().replace(/[-:]/g,"").replace(/\.\d+Z/,"Z")}\r\nDTSTART;TZID=${task.timezone}:${task.date.replace(/-/g,"")}T${task.time!.replace(":","")}00\r\nSUMMARY:Recipe Buddy preparation\r\nBEGIN:VALARM\r\nTRIGGER:-PT10M\r\nACTION:DISPLAY\r\nDESCRIPTION:Recipe Buddy preparation\r\nEND:VALARM\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n`;
        const url=URL.createObjectURL(new Blob([contents],{type:"text/calendar"}));const a=document.createElement("a");a.href=url;a.download="recipe-buddy-preparation.ics";a.click();URL.revokeObjectURL(url);
      }}>{t("Add optional calendar reminder")}</button>}
    </article>)}
    <p>{t("Calendar reminders are managed by your calendar app; review its timezone and notification settings. This page does not send background notifications.")}</p>
  </details>;
}
function PreparationComplete({task,mutate,busy}:{task:Preparation;mutate:(a:string,d:unknown)=>Promise<boolean>;busy:boolean}){
 const {t,locale}=useTranslation();const [ingredients,setIngredients]=useState([{name:"",quantity:"",unit:"g"}]);
 return <details><summary>{t("Complete preparation")}</summary><p>{t("Record only ingredients actually used. Leave this blank for a task that used no stock.")}</p>{ingredients.map((row,i)=><div className="meal-fields" key={i}>{(["name","quantity","unit"] as const).map(key=><label key={key}>{t(key==="name"?"Ingredient":key==="quantity"?"Actual quantity":"Unit")}<input value={row[key]} onChange={e=>setIngredients(ingredients.map((old,j)=>i===j?{...old,[key]:e.target.value}:old))}/></label>)}<button className="button secondary" onClick={()=>setIngredients(ingredients.filter((_,j)=>j!==i))}>{t("Remove")}</button></div>)}<button className="button secondary" onClick={()=>setIngredients([...ingredients,{name:"",quantity:"",unit:"g"}])}>{locale==="fr"?"Ajouter un ingrédient utilisé":"Add an ingredient used"}</button><button className="button secondary" disabled={busy||ingredients.some(i=>!!i.name.trim()&&!i.quantity.trim())} onClick={()=>mutate("complete-preparation",{id:task.id,ingredients:ingredients.filter(i=>!!i.name.trim())})}>{t("Confirm completed task")}</button></details>;
}
