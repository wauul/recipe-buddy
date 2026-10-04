package com.recipebuddy.android
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import kotlinx.serialization.json.*
import java.util.UUID
@Composable fun MealQuickCandidates(state:BuddyState,vm:BuddyViewModel,date:String,slot:String,diners:List<String>,servings:Double){
 state.pantryMatches?.get("candidates")?.jsonArray?.forEach{raw->val c=raw.jsonObject;Column{
  Text(c["title"]!!.jsonPrimitive.content,style=MaterialTheme.typography.titleLarge)
  Text(mealText("Health suitability is not established. Missing ingredients: ","L’adéquation médicale n’est pas établie. Ingrédients manquants : ")+(c["missing"]?.jsonArray?.joinToString{it.jsonObject["name"]!!.jsonPrimitive.content}?:""))
  c["reasons"]?.jsonArray?.forEach{Text(mealReasonText(it.jsonPrimitive.content))}
  KitchenTextButton(onClick={vm.pendingDestination(state.account!!,c["id"]!!.jsonPrimitive.content,false)}){Text(mealText("View recipe","Voir la recette"))}
  KitchenOutlinedButton(onClick={vm.mealChange("plan",buildJsonObject{put("id",UUID.randomUUID().toString());put("recipeId",c["id"]!!);put("recipeVersion",c["recipeVersion"]?:JsonPrimitive(""));put("suggested",true);put("title",c["title"]!!);put("date",date);put("slot",slot);put("servings",servings);put("diners",JsonArray(diners.map(::JsonPrimitive)))})},enabled=!state.busy){Text(mealText("Add to plan","Ajouter au planning"))}
 }}
}
