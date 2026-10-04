package com.recipebuddy.android
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import kotlinx.serialization.json.*
@Composable fun MealRepeatControls(meal:JsonObject,state:BuddyState,vm:BuddyViewModel){
 var open by rememberSaveable{mutableStateOf(false)};var count by rememberSaveable{mutableStateOf("4")};var weekly by rememberSaveable{mutableStateOf(true)};var other by rememberSaveable{mutableStateOf("")}
 Column{KitchenTextButton(onClick={open=!open}){Text(mealText("Repeat schedule / swap","Répéter le programme / échanger"))};if(open){
  Row{Checkbox(weekly,{weekly=it});Text(mealText("Weekly · uncheck for daily","Hebdomadaire · décocher pour quotidien"))};OutlinedTextField(count,{count=it},label={Text(mealText("Occurrences · up to 12","Répétitions · jusqu’à 12"))})
  KitchenOutlinedButton(onClick={vm.mealChange("repeat-plan",buildJsonObject{put("id",meal["id"]!!);put("intervalDays",if(weekly)7 else 1);put("count",count.toInt())})},enabled=count.toIntOrNull()?.let{it in 1..12}==true&&!state.busy){Text(mealText("Repeat schedule","Répéter le programme"))}
  state.meals?.get("state")?.jsonObject?.get("plans")?.jsonArray?.filter{it.jsonObject["id"]!=meal["id"]&&it.jsonObject["cookedId"]==null}?.forEach{raw->val p=raw.jsonObject;Row{RadioButton(other==p["id"]!!.jsonPrimitive.content,{other=p["id"]!!.jsonPrimitive.content});Text(p["date"]!!.jsonPrimitive.content+" · "+p["title"]!!.jsonPrimitive.content)}}
  KitchenOutlinedButton(onClick={vm.mealChange("swap-plan",buildJsonObject{put("id",meal["id"]!!);put("otherId",other)})},enabled=other.isNotBlank()&&!state.busy&&meal["cookedId"]==null){Text(mealText("Swap meals","Échanger les repas"))}
 }}
}
