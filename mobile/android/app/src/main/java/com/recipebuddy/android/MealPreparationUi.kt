package com.recipebuddy.android
import android.content.Intent
import android.provider.CalendarContract
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.platform.LocalContext
import kotlinx.serialization.json.*
import java.time.*
import java.util.UUID

@Composable fun MealPreparationControls(state:BuddyState,vm:BuddyViewModel,date:String){
 val root=state.meals?:return;val kitchen=root["state"]!!.jsonObject;val tasks=kitchen.mealRows("preparation");val plans=kitchen.mealRows("plans");val context=LocalContext.current
 val reminderTitle=mealText("Recipe Buddy preparation","Préparation Recipe Buddy")
 var open by rememberSaveable{mutableStateOf(false)};var description by rememberSaveable{mutableStateOf("")};var taskDate by rememberSaveable{mutableStateOf(date)};var time by rememberSaveable{mutableStateOf("")};var active by rememberSaveable{mutableStateOf("")};var passive by rememberSaveable{mutableStateOf("")};var planId by rememberSaveable{mutableStateOf("")};var editing by rememberSaveable{mutableStateOf(UUID.randomUUID().toString())};var dependencies by rememberSaveable{mutableStateOf(listOf<String>())};var assignee by rememberSaveable{mutableStateOf(root.mealValue("actorId"))};var override by rememberSaveable{mutableStateOf(false)}
 Column{KitchenTextButton(onClick={open=!open}){Text(mealText("Preparation agenda","Agenda de préparation"))};if(open){
 Text(mealText("Use actual instructions. Missing timing and safety details remain unknown. Preparation is separate from eating.","Utilisez des instructions réelles. Durées et consignes manquantes restent inconnues. Préparer ne signifie pas manger."))
 MealField(mealText("Task description","Description de la tâche"),description,{description=it});MealChoice(mealText("Linked meal","Repas lié"),listOf("" to mealText("Independent preparation","Préparation indépendante"))+plans.filter{it.mealValue("cookedId").isBlank()}.map{it.mealValue("id") to (it.mealValue("date")+" · "+it.mealValue("title"))},planId,{planId=it;plans.firstOrNull{p->p.mealValue("id")==it}?.let{p->taskDate=p.mealValue("date")}})
 val linked=plans.firstOrNull{it.mealValue("id")==planId};val recipe=state.allRecipes.firstOrNull{it.id==linked?.mealValue("recipeId")}
 if(recipe!=null)MealChoice(mealText("Use actual recipe instruction","Utiliser une instruction réelle"),listOf("" to mealText("Choose instruction · timing unknown","Choisir une instruction · durée inconnue"))+recipe.steps.map{it to it},"",{description=it})
 KitchenTextButton(onClick={editing=UUID.randomUUID().toString();description="";dependencies=emptyList()}){Text(mealText("New task","Nouvelle tâche"))}
 MealField(mealText("Local date","Date locale"),taskDate,{taskDate=it});MealField(mealText("Planned time · HH:mm","Heure prévue · HH:mm"),time,{time=it});MealField(mealText("Active minutes · optional","Minutes actives · facultatif"),active,{active=it});MealField(mealText("Waiting minutes · optional","Minutes d’attente · facultatif"),passive,{passive=it})
 MealChoice(mealText("Assigned to","Attribué à"),root.mealRows("members").map{it.mealValue("userId") to it["user"]!!.jsonObject.mealValue("username")},assignee,{assignee=it})
 Text(mealText("Dependencies","Dépendances"));tasks.filter{it.mealValue("id")!=editing && it.mealValue("status")!="dismissed"}.forEach{task->Row{Checkbox(dependencies.contains(task.mealValue("id")),{dependencies=if(it)dependencies+task.mealValue("id") else dependencies-task.mealValue("id")});Text(task.mealValue("description"))}}
 Row{Checkbox(override,{override=it});Text(mealText("Keep task date when meal moves","Conserver la date si le repas change"))}
 KitchenButton(enabled=!state.busy&&description.isNotBlank()&&runCatching{LocalDate.parse(taskDate)}.isSuccess&&(time.isBlank()||runCatching{LocalTime.parse(time)}.isSuccess),onClick={vm.mealChange("preparation",buildJsonObject{put("id",editing.ifBlank{UUID.randomUUID().toString()});put("description",description);if(planId.isNotBlank())put("planId",planId);put("date",taskDate);put("time",time.takeIf{it.isNotBlank()}?.let(::JsonPrimitive)?:JsonNull);put("timezone",kitchen.mealValue("timezone"));put("activeMinutes",active.toIntOrNull()?.let(::JsonPrimitive)?:JsonNull);put("passiveMinutes",passive.toIntOrNull()?.let(::JsonPrimitive)?:JsonNull);put("assignee",assignee);put("dependencies",JsonArray(dependencies.map(::JsonPrimitive)));put("override",override);put("reminder",false)})}){Text(mealText("Save preparation task","Enregistrer la tâche"))}
 tasks.sortedBy{it.mealValue("date")+it.mealValue("time")}.forEach{task->
  Text(task.mealValue("description"),style=MaterialTheme.typography.titleMedium);Text(task.mealValue("date")+" "+task.mealValue("time")+" · "+when(task.mealValue("status")){"completed"->mealText("Completed","Terminée");"dismissed"->mealText("Dismissed","Écartée");else->mealText("Planned","Prévue")})
  if(task["reviewNeeded"]?.jsonPrimitive?.booleanOrNull==true)Text(mealText("Meal changed. Review this task.","Repas modifié. Vérifiez cette tâche."))
  if(task.mealValue("status")!="completed")KitchenTextButton(onClick={editing=task.mealValue("id");description=task.mealValue("description");taskDate=task.mealValue("date");time=task.mealValue("time");active=task.mealValue("activeMinutes");passive=task.mealValue("passiveMinutes");planId=task.mealValue("planId");assignee=task.mealValue("assignee");dependencies=task["dependencies"]!!.jsonArray.map{it.jsonPrimitive.content};override=task["override"]!!.jsonPrimitive.boolean}){Text(mealText("Edit / move","Modifier / déplacer"))}
  if(task.mealValue("status")=="planned"){
   MealPreparationComplete(task,state,vm)
   KitchenTextButton(enabled=!state.busy,onClick={vm.mealChange("dismiss-preparation",buildJsonObject{put("id",task.mealValue("id"))})}){Text(mealText("Dismiss","Écarter"))}
   if(task.mealValue("time").isNotBlank())KitchenTextButton(onClick={runCatching{val start=LocalDateTime.parse(task.mealValue("date")+"T"+task.mealValue("time")).atZone(ZoneId.of(task.mealValue("timezone"))).toInstant().toEpochMilli();context.startActivity(Intent(Intent.ACTION_INSERT).setData(CalendarContract.Events.CONTENT_URI).putExtra(CalendarContract.Events.TITLE,reminderTitle).putExtra(CalendarContract.EXTRA_EVENT_BEGIN_TIME,start).putExtra(CalendarContract.EXTRA_EVENT_END_TIME,start+15*60000).putExtra(CalendarContract.Events.EVENT_TIMEZONE,task.mealValue("timezone")))}}){Text(mealText("Add optional calendar reminder","Ajouter un rappel calendrier"))}
  }else KitchenTextButton(enabled=!state.busy&&task.mealValue("cookedId").isBlank(),onClick={vm.mealChange("undo-preparation",buildJsonObject{put("id",task.mealValue("id"))})}){Text(mealText("Undo preparation","Annuler la préparation"))}
  HorizontalDivider()
 }
 Text(mealText("Calendar reminders are managed by your calendar app. Review timezone and notification settings.","Votre application calendrier gère les rappels. Vérifiez le fuseau horaire et les notifications."))
 }}
}
@Composable private fun MealPreparationComplete(task:JsonObject,state:BuddyState,vm:BuddyViewModel){
 var open by rememberSaveable(task.mealValue("id")){mutableStateOf(false)};var rows by rememberSaveable(task.mealValue("id")){mutableStateOf(listOf("{\"name\":\"\",\"quantity\":\"\",\"unit\":\"g\"}"))}
 KitchenTextButton(onClick={open=!open}){Text(mealText("Complete preparation","Terminer la préparation"))};if(open){Text(mealText("Only actual ingredient use changes stock. Leave blank for no stock use.","Seuls les ingrédients réellement utilisés modifient le stock. Laissez vide si aucun stock utilisé."));rows.forEachIndexed{i,raw->val row=buddyJson.parseToJsonElement(raw).jsonObject;fun update(field:String,value:String){rows=rows.mapIndexed{j,old->if(j==i)JsonObject(row+mapOf(field to JsonPrimitive(value))).toString() else old}}
 MealField(mealText("Ingredient","Ingrédient"),row.mealValue("name"),{update("name",it)});MealField(mealText("Actual quantity","Quantité réelle"),row.mealValue("quantity"),{update("quantity",it)});MealField(mealText("Unit","Unité"),row.mealValue("unit"),{update("unit",it)});TextButton(onClick={rows=rows.filterIndexed{j,_->j!=i}}){Text(mealText("Remove","Retirer"))}}
 TextButton(onClick={rows=rows+"{\"name\":\"\",\"quantity\":\"\",\"unit\":\"g\"}"}){Text(mealText("Add an ingredient used","Ajouter un ingrédient utilisé"))}
 val ingredients=rows.map{buddyJson.parseToJsonElement(it).jsonObject}.filter{it.mealValue("name").isNotBlank()};KitchenButton(enabled=!state.busy&&ingredients.all{it.mealValue("quantity").isNotBlank()},onClick={vm.mealChange("complete-preparation",buildJsonObject{put("id",task.mealValue("id"));put("ingredients",JsonArray(ingredients))})}){Text(mealText("Confirm completed task","Confirmer la tâche terminée"))}}
}
