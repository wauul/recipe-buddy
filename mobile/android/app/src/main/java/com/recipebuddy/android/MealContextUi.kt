package com.recipebuddy.android
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import kotlinx.serialization.json.*
@Composable fun MealContextControls(vm:BuddyViewModel,date:String){
 var open by rememberSaveable{mutableStateOf(false)};var time by rememberSaveable{mutableStateOf("")};var equipment by rememberSaveable{mutableStateOf("")};var day by rememberSaveable{mutableStateOf("work")}
 Column {KitchenTextButton(onClick={open=!open}){Text(mealText("Daily practical context","Contexte pratique du jour"))};if(open){
  Text(mealText("Context expires after its local day. Gym and flexible days preserve restrictions.","Le contexte expire après sa journée locale. Sport et souplesse conservent les restrictions."))
  OutlinedTextField(time,{time=it},label={Text(mealText("Minutes available","Minutes disponibles"))});OutlinedTextField(equipment,{equipment=it},label={Text(mealText("Equipment · comma separated","Équipement · séparé par virgules"))})
  listOf("work","rest","gym","flexible").forEach{d->Row{RadioButton(day==d,{day=d});Text(when(d){"work"->mealText("Work","Travail");"rest"->mealText("Rest","Repos");"gym"->mealText("Gym","Sport");else->mealText("Flexible","Souple")})}}
  KitchenOutlinedButton(onClick={vm.mealChange("context",buildJsonObject{put("date",date);put("timeMinutes",time.toIntOrNull()?.let(::JsonPrimitive)?:JsonNull);put("equipment",JsonArray(equipment.split(',').map{it.trim()}.filter{it.isNotBlank()}.map(::JsonPrimitive)));put("dayType",day);put("appetite","unknown");put("mealSize","unknown")})},enabled=time.isBlank()||time.toIntOrNull()?.let{it in 5..1440}==true){Text(mealText("Save daily context","Enregistrer le contexte"))}
 }}
}
