package com.recipebuddy.android
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import kotlinx.serialization.json.*
@Composable fun MealWeekPreviewControls(state:BuddyState,vm:BuddyViewModel){
 val plans=state.mealWeekPreview?:return
 val saved=state.meals?.get("state")?.jsonObject?.mealRows("plans")?:emptyList()
 LaunchedEffect(saved){plans.forEach{p->val id=p.jsonObject.mealValue("id");if(saved.any{it.mealValue("id")==id})vm.removeWeekPreview(id)}}
 Column{Text(mealText("Review suggested week","Vérifier la semaine proposée"),style=MaterialTheme.typography.titleLarge);Text(mealText("These meals are not saved yet. Edit dates, slots and portions, then accept the meals you want. Existing meals are retained.","Ces repas ne sont pas encore enregistrés. Modifiez dates, repas et portions, puis acceptez vos choix. Les repas existants sont conservés."))
 plans.forEach{raw->val p=raw.jsonObject;val id=p.mealValue("id");Text(p.mealValue("title"),style=MaterialTheme.typography.titleMedium);MealField(mealText("Local date","Date locale"),p.mealValue("date"),{vm.editWeekPreview(id,"date",JsonPrimitive(it))});MealField(mealText("Servings prepared","Portions préparées"),p.mealValue("servings"),{vm.editWeekPreview(id,"servings",it.toDoubleOrNull()?.let(::JsonPrimitive)?:JsonPrimitive(it))});MealChoice(mealText("Meal slot","Repas"),listOf("breakfast" to mealText("Breakfast","Petit-déjeuner"),"lunch" to mealText("Lunch","Déjeuner"),"dinner" to mealText("Dinner","Dîner"),"snack" to mealText("Snack","Collation")),p.mealValue("slot"),{vm.editWeekPreview(id,"slot",JsonPrimitive(it))});KitchenButton(enabled=!state.busy&&p["servings"]?.jsonPrimitive?.doubleOrNull?.let{it>0}==true,onClick={vm.mealChange("plan",p)}){Text(mealText("Accept this meal","Accepter ce repas"))};KitchenTextButton(onClick={vm.removeWeekPreview(id)}){Text(mealText("Skip this suggestion","Ignorer cette proposition"))};HorizontalDivider()}
 KitchenTextButton(onClick=vm::clearWeekPreview){Text(mealText("Cancel preview","Annuler l’aperçu"))}
 }
}
