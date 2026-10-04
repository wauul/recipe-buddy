package com.recipebuddy.android
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import kotlinx.serialization.json.*
@Composable fun MealCookingSuccess(state:BuddyState,vm:BuddyViewModel,id:String) {
 val occasion=state.meals?.get("state")?.jsonObject?.get("occasions")?.jsonArray?.firstOrNull{it.jsonObject["id"]?.jsonPrimitive?.content==id}?.jsonObject
 AlertDialog(onDismissRequest=vm::dismissMealSuccess,title={Text(mealText("Cooking saved","Cuisson enregistrée"))},text={Text(mealText("Known pantry use is recorded once. Photo, rating and eating details are optional.","La consommation connue du stock est enregistrée une fois. Photo, appréciation et repas mangé sont facultatifs."))},confirmButton={KitchenTextButton(onClick={vm.dismissMealSuccess();occasion?.let{vm.followMeal(it)}}){Text(mealText("Optional details","Détails facultatifs"))}},dismissButton={KitchenTextButton(onClick={vm.dismissMealSuccess();vm.mealChange("undo-cook",buildJsonObject{put("id",id)},false)}){Text(mealText("Undo cooking","Annuler la cuisson"))}})
}
