package com.recipebuddy.android
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import kotlinx.serialization.json.*
import java.time.LocalDate
@Composable fun MealRescueControls(state:BuddyState,vm:BuddyViewModel,from:String){
 var open by rememberSaveable{mutableStateOf(false)};val response=state.mealRescue;var selected by rememberSaveable{mutableStateOf(listOf<String>())}
 LaunchedEffect(response?.mealRows("proposals")?.map{it.mealValue("token")}){selected=response?.mealRows("proposals")?.flatMap{p->p.mealRows("changes").map{it["after"]!!.jsonObject.mealValue("id")}}?:emptyList()}
 Column{KitchenTextButton(onClick={open=!open}){Text(mealText("Rescue my week · Pro","Réorganiser ma semaine · Pro"))};if(open){
 Text(mealText("Preview future meals using known stock and saved recipes. Locked and completed meals are protected. Missing time, prices and health evidence remain unknown.","Aperçu des repas futurs selon le stock connu et les recettes enregistrées. Repas verrouillés et terminés protégés. Durées, prix et preuves de santé manquants restent inconnus."))
 KitchenOutlinedButton(enabled=!state.busy,onClick={vm.previewMealRescue(from,runCatching{LocalDate.parse(from).plusDays(6).toString()}.getOrDefault(from))}){Text(mealText("Preview rescue options","Voir les propositions"))}
 if(response!=null){val proposals=response.mealRows("proposals");if(proposals.isEmpty())Text(mealText("No feasible changes with current evidence. Manual editing remains available.","Aucun changement possible avec les informations actuelles. Vous pouvez modifier les repas manuellement."));proposals.forEach{p->
 Text(when(p.mealValue("objective")){"Use on-hand food"->mealText("Use on-hand food","Utiliser le stock");"Reduce additional groceries"->mealText("Reduce additional groceries","Réduire les courses");else->mealText("Reduce known cooking time","Réduire la durée connue")},style=MaterialTheme.typography.titleMedium)
 p.mealRows("changes").forEach{c->val before=c["before"]!!.jsonObject;val after=c["after"]!!.jsonObject;Row{Checkbox(selected.contains(after.mealValue("id")),{selected=if(it)selected+after.mealValue("id") else selected-after.mealValue("id")});Text(before.mealValue("date")+" · "+before.mealValue("title")+" → "+after.mealValue("title")+" · "+after.mealValue("servings"))};MealField(mealText("Local date","Date locale"),after.mealValue("date"),{vm.editMealRescue(p.mealValue("objective"),after.mealValue("id"),"date",JsonPrimitive(it))});MealField(mealText("Servings","Portions"),after.mealValue("servings"),{vm.editMealRescue(p.mealValue("objective"),after.mealValue("id"),"servings",it.toDoubleOrNull()?.let{JsonPrimitive(it)}?:JsonPrimitive(it))});MealChoice(mealText("Meal slot","Repas"),listOf("breakfast" to mealText("Breakfast","Petit-déjeuner"),"lunch" to mealText("Lunch","Déjeuner"),"dinner" to mealText("Dinner","Dîner"),"snack" to mealText("Snack","Collation")),after.mealValue("slot"),{vm.editMealRescue(p.mealValue("objective"),after.mealValue("id"),"slot",JsonPrimitive(it))})}
 p.mealRows("changes").forEach{change->change["reasons"]?.jsonArray?.forEach{Text(mealReasonText(it.jsonPrimitive.content))}}
 Text(mealText("Shopping preview","Aperçu des courses")+": "+p["previousShopping"]!!.jsonObject.mealRows("needs").size+" → "+p["shopping"]!!.jsonObject.mealRows("needs").size)
 p["shopping"]!!.jsonObject.mealRows("needs").forEach{n->Text(n.mealValue("name")+": "+n.mealValue("quantity",mealText("Unknown","Inconnue"))+" "+n.mealValue("unit"))}
 Text(mealText("Preparation tasks to review","Tâches à vérifier")+": "+p["preparationReview"]!!.jsonArray.size)
 val needsReview=response["edited"]?.jsonPrimitive?.booleanOrNull==true||p.mealRows("changes").any{!selected.contains(it["after"]!!.jsonObject.mealValue("id"))}
 if(needsReview){Text(mealText("The preview changed. Recalculate shopping and checks before acceptance.","L’aperçu a changé. Recalculez les courses et les vérifications avant d’accepter."));KitchenOutlinedButton(enabled=!state.busy&&p.mealRows("changes").any{selected.contains(it["after"]!!.jsonObject.mealValue("id"))},onClick={vm.reviewEditedRescue(p,selected,from,runCatching{LocalDate.parse(from).plusDays(6).toString()}.getOrDefault(from))}){Text(mealText("Recalculate edited preview","Recalculer l’aperçu modifié"))}}
 KitchenButton(enabled=!state.busy&&!needsReview&&p.mealRows("changes").any{selected.contains(it["after"]!!.jsonObject.mealValue("id"))},onClick={vm.mealChange("accept-rescue",buildJsonObject{put("token",p["token"]!!);put("selected",JsonArray(p.mealRows("changes").map{it["after"]!!.jsonObject.mealValue("id")}.filter{selected.contains(it)}.map(::JsonPrimitive)))})}){Text(mealText("Accept selected changes","Accepter les changements choisis"))}
 };KitchenTextButton(onClick={vm.dismissMealRescue()}){Text(mealText("Cancel preview","Annuler l’aperçu"))}}
 state.meals?.get("state")?.jsonObject?.mealRows("rescues")?.filter{it["undone"]?.jsonPrimitive?.booleanOrNull!=true}?.forEach{r->KitchenTextButton(enabled=!state.busy,onClick={vm.mealChange("undo-rescue",buildJsonObject{put("id",r.mealValue("id"))})}){Text(mealText("Undo accepted rescue","Annuler la réorganisation acceptée"))}}
 }}
}
